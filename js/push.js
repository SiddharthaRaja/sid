/* ============================================================
   push.js — real notifications, without a server

   Sid is a static site: nothing is awake at 8am to decide what to
   tell you. So the split is:

     • the app, whenever it is open, writes a plan — "on the 18th,
       say this" — for the next six weeks into Firestore
     • a GitHub Action wakes once a day, reads the plan, and sends
       whatever is due

   All the release logic stays here, where it already lives. The
   sender is fifteen lines and has nothing to get wrong.
   ============================================================ */

import * as S from './store.js';
import { VAPID_PUBLIC_KEY } from './firebase-config.js';
import { todayISO, addDays, daysBetween, fmtDate, resolveDate } from './ui.js';
import { collectEvents } from './agenda.js';
import { PLATFORMS } from './data/platforms.js';
import { RUN_SEED } from './data/runsheet.js';

export const HAS_PUSH = !!VAPID_PUBLIC_KEY;
export const supported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export const permission = () => (window.Notification ? Notification.permission : 'unsupported');

/** How far ahead the plan is written. Open the app once a month and
    you never notice; leave it three months and it runs dry, which is
    stated in Settings rather than failing silently. */
const HORIZON = 45;

/* ---------------------------------------------------------- */
/*  subscribe                                                  */
/* ---------------------------------------------------------- */

const urlB64ToUint8 = (base64) => {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
};

export async function subscribe() {
  if (!supported()) throw new Error('This browser cannot do notifications.');
  if (!HAS_PUSH) throw new Error('No VAPID key set — the steps are in Settings.');

  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Notification permission was refused.');

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8(VAPID_PUBLIC_KEY),
    });
  }

  const P = S.get('push');
  P.sub = sub.toJSON();
  P.device = navigator.userAgent.slice(0, 90);
  P.subscribedAt = new Date().toISOString();
  S.touch('push');
  rebuild();
  return P.sub;
}

export async function unsubscribe() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
  } catch {}
  const P = S.get('push');
  P.sub = null;
  S.touch('push');
}

export async function isSubscribed() {
  if (!supported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    return !!(await reg.pushManager.getSubscription());
  } catch { return false; }
}

/** A notification right now, from this device, to prove the wiring. */
export async function testLocal() {
  if (permission() !== 'granted') throw new Error('Notifications are not switched on yet.');
  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification('Sid', {
    body: 'Notifications are working. This one came from your own phone.',
    icon: './icons/icon-192.png', badge: './icons/icon-192.png',
    data: { url: './index.html#/today' }, tag: 'sid-test',
  });
}

/* ---------------------------------------------------------- */
/*  the plan                                                   */
/* ---------------------------------------------------------- */

export const DEFAULT_KINDS = { morning: true, pitch: true, release: true, weekly: true };

/**
 * Four times a day, each with its own job. They are deliberately
 * different from each other — four copies of the same list is how a
 * person learns to swipe notifications away without reading them.
 *
 *   10:00  the day's list
 *   15:00  the one thing that matters most, if there is one
 *   22:00  tomorrow, while there is still time to write it
 *   02:00  only if something is genuinely late
 *
 * Each one is skipped entirely when it has nothing to say.
 */
export const SLOTS = [
  { key: 'morning', hour: 10, label: '10am', note: 'Everything due today.' },
  { key: 'midday',  hour: 15, label: '3pm',  note: 'The single most important thing left today. Silent when there is nothing.' },
  { key: 'evening', hour: 22, label: '10pm', note: 'Tomorrow, while you can still write it tonight.' },
  { key: 'late',    hour: 2,  label: '2am',  note: 'Only when something is actually overdue or it is release eve.' },
];

export const DEFAULT_SLOTS = { morning: true, midday: true, evening: true, late: true };

/**
 * What to say, when to say it. Every item carries a date and a slot;
 * the sender picks the slot from the clock and sends that day's items
 * for it.
 */
export function buildSchedule() {
  const set = S.get('settings');
  const P = S.get('push');
  const kinds = { ...DEFAULT_KINDS, ...(P.kinds || {}) };
  const slots = { ...DEFAULT_SLOTS, ...(P.slots || {}) };
  const today = todayISO();
  const out = [];
  const events = collectEvents();
  const pitchDone = !!S.get('pitch').submittedAt;

  const push = (o) => { if (slots[o.slot] !== false) out.push(o); };

  /* how a given day looks, computed once and reused by every slot */
  const dayInfo = (d) => {
    const due = events.filter(e => e.iso === d && !e.done);
    return {
      posts: countPosts(d),
      tasks: due.filter(e => e.kind !== 'content' && e.kind !== 'release').length,
    };
  };
  const overdueNow = () => events.filter(e => e.iso < today && !e.done && e.kind !== 'content').length;

  /* ---- 10:00 — the day's list ---- */
  if (kinds.morning) {
    for (let i = 0; i < HORIZON; i++) {
      const d = addDays(today, i);
      const { posts, tasks } = dayInfo(d);
      const overdue = i === 0 ? overdueNow() : 0;

      const bits = [];
      if (posts) bits.push(`${posts} post${posts === 1 ? '' : 's'} to send`);
      if (tasks) bits.push(`${tasks} thing${tasks === 1 ? '' : 's'} due`);
      if (overdue) bits.push(`${overdue} overdue`);
      if (!bits.length) continue;

      push({
        date: d, slot: 'morning', kind: 'morning',
        title: set.song ? `“${set.song}” — today` : 'Today',
        body: bits.join(' · '),
        url: './index.html#/today',
      });
    }
  }

  /* ---- 15:00 — one thing, or nothing ---- */
  for (let i = 0; i < HORIZON; i++) {
    const d = addDays(today, i);
    const { posts } = dayInfo(d);
    const toRelease = set.releaseDate ? daysBetween(d, set.releaseDate) : null;

    let line = null;
    if (set.releaseDate && d === set.releaseDate) {
      line = 'Halfway through release day. The afternoon is for replying to everyone who posted about it.';
    } else if (kinds.pitch && !pitchDone && toRelease !== null && toRelease > 0 && toRelease <= 8) {
      line = `The Spotify pitch is still not submitted and the release is ${toRelease} day${toRelease === 1 ? '' : 's'} away.`;
    } else if (posts) {
      line = `${posts} post${posts === 1 ? '' : 's'} scheduled today. If any are still sitting unposted, now is better than tonight.`;
    }
    if (!line) continue;

    push({
      date: d, slot: 'midday', kind: 'midday',
      title: 'This afternoon', body: line,
      url: './index.html#/today',
    });
  }

  /* ---- 22:00 — tomorrow, plus Sunday's review ---- */
  for (let i = 0; i < HORIZON; i++) {
    const d = addDays(today, i);
    const t = addDays(d, 1);
    const { posts, tasks } = dayInfo(t);
    const isSunday = new Date(d + 'T00:00:00').getDay() === 0;

    if (kinds.weekly && isSunday) {
      push({
        date: d, slot: 'evening', kind: 'weekly',
        title: 'Weekly review',
        body: 'Ten minutes before bed: what worked, what did not, the one thing next week.',
        url: './index.html#/review',
      });
      continue;                      // one 10pm notification, not two
    }

    if (kinds.release && set.releaseDate && t === set.releaseDate) {
      push({
        date: d, slot: 'evening', kind: 'release',
        title: set.song ? `“${set.song}” is out tomorrow` : 'Release tomorrow',
        body: 'Check the distributor says delivered, and write tonight\'s messages now without sending them.',
        url: './index.html#/runsheet',
      });
      continue;
    }

    const bits = [];
    if (posts) bits.push(`${posts} post${posts === 1 ? '' : 's'}`);
    if (tasks) bits.push(`${tasks} thing${tasks === 1 ? '' : 's'} due`);
    if (!bits.length) continue;

    push({
      date: d, slot: 'evening', kind: 'evening',
      title: 'Tomorrow',
      body: `${bits.join(' · ')}. Writing them tonight is the difference between posting and not.`,
      url: './index.html#/queue',
    });
  }

  /* ---- 02:00 — only when something is late ---- */
  {
    const overdue = overdueNow();
    if (overdue) push({
      date: today, slot: 'late', kind: 'late',
      title: `${overdue} thing${overdue === 1 ? '' : 's'} overdue`,
      body: 'Still awake — this is the list that has been sliding.',
      url: './index.html#/today',
    });
    if (set.releaseDate && daysBetween(today, set.releaseDate) === 0) push({
      date: set.releaseDate, slot: 'late', kind: 'late',
      title: set.song ? `“${set.song}” is out today` : 'Release day',
      body: `${RUN_SEED.filter(r => r.day === 0).length} steps on the run sheet. Sleep first.`,
      url: './index.html#/runsheet',
    });
  }

  /* ---- the deadline that cannot be recovered, at 10am ---- */
  if (kinds.pitch && set.releaseDate && !pitchDone) {
    [21, 14, 10, 8].forEach(n => {
      const d = addDays(set.releaseDate, -n);
      if (d < today) return;
      push({
        date: d, slot: 'morning', kind: 'pitch',
        title: 'Spotify pitch',
        body: n <= 10
          ? `${n} days left. After the cut-off it cannot be done at all.`
          : `${n} days to release. Pitch now — it is the highest-leverage thing in the plan.`,
        url: './index.html#/p/spotify/epitch',
      });
    });
  }

  /* ---- release day itself, and the morning after ---- */
  if (kinds.release && set.releaseDate) {
    if (set.releaseDate >= today) push({
      date: set.releaseDate, slot: 'morning', kind: 'release',
      title: set.song ? `“${set.song}” is out` : 'Release day',
      body: `${RUN_SEED.filter(r => r.day === 0).length} steps on the run sheet. The first hour of personal messages is the one to protect.`,
      url: './index.html#/runsheet',
    });
    const after = addDays(set.releaseDate, 1);
    if (after >= today) push({
      date: after, slot: 'morning', kind: 'release',
      title: 'Log yesterday\'s numbers',
      body: 'Day-one figures disappear from most dashboards within a week.',
      url: './index.html#/stats',
    });
  }

  return out.sort((a, b) =>
    a.date.localeCompare(b.date) || slotRank(a.slot) - slotRank(b.slot));
}

const slotRank = (k) => {
  const s = SLOTS.find(x => x.key === k);
  return s ? s.hour : 99;                 // within a day, by the clock
};

function countPosts(iso) {
  const rel = S.get('settings').releaseDate;
  let n = 0;
  PLATFORMS.forEach(p => {
    const sl = S.get(`p_${p.key}`);
    Object.values(sl.content || {}).forEach(items => (items || []).forEach(it => {
      if (['posted', 'parked'].includes(it.status)) return;
      if (resolveDate(it.when, rel) === iso) n++;
    }));
  });
  return n;
}

/** Recompute and store. Cheap, and safe to call on every boot. */
export function rebuild() {
  const P = S.get('push');
  if (!P.sub) return 0;
  P.schedule = buildSchedule();
  P.builtAt = new Date().toISOString();
  P.hour = P.hour || 8;
  P.tzOffset = -new Date().getTimezoneOffset();      // minutes east of UTC
  S.touch('push');
  return P.schedule.length;
}

/** How far the plan reaches — the thing that quietly runs out. */
export function horizonInfo() {
  const P = S.get('push');
  const last = (P.schedule || []).at(-1);
  if (!last) return { days: 0, until: '' };
  return { days: Math.max(0, daysBetween(todayISO(), last.date)), until: fmtDate(last.date, { long: true }) };
}
