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
 * What to say, and when. One digest per day that has anything in it,
 * plus the handful of things that are worth their own notification.
 */
export function buildSchedule() {
  const set = S.get('settings');
  const P = S.get('push');
  const kinds = { ...DEFAULT_KINDS, ...(P.kinds || {}) };
  const today = todayISO();
  const out = [];
  const events = collectEvents();

  /* --- one morning digest per day, only when there is something --- */
  if (kinds.morning) {
    for (let i = 0; i < HORIZON; i++) {
      const d = addDays(today, i);
      const due = events.filter(e => e.iso === d && !e.done);
      const posts = countPosts(d);
      const overdue = i === 0 ? events.filter(e => e.iso < today && !e.done && e.kind !== 'content').length : 0;

      const bits = [];
      if (posts) bits.push(`${posts} post${posts === 1 ? '' : 's'} to send`);
      const nonContent = due.filter(e => e.kind !== 'content' && e.kind !== 'release').length;
      if (nonContent) bits.push(`${nonContent} thing${nonContent === 1 ? '' : 's'} due`);
      if (overdue) bits.push(`${overdue} overdue`);
      if (!bits.length) continue;

      out.push({
        date: d, kind: 'morning',
        title: set.song ? `“${set.song}” — today` : 'Today',
        body: bits.join(' · '),
        url: './index.html#/today',
      });
    }
  }

  /* --- the one deadline that cannot be recovered --- */
  if (kinds.pitch && set.releaseDate && !S.get('pitch').submittedAt) {
    [21, 14, 10, 8].forEach(n => {
      const d = addDays(set.releaseDate, -n);
      if (d < today) return;
      out.push({
        date: d, kind: 'pitch',
        title: 'Spotify pitch',
        body: n <= 10
          ? `${n} days left. After the cut-off it cannot be done at all.`
          : `${n} days to release. Pitch now — it is the highest-leverage thing in the plan.`,
        url: './index.html#/p/spotify/epitch',
      });
    });
  }

  /* --- release day, from the run sheet --- */
  if (kinds.release && set.releaseDate) {
    const eve = addDays(set.releaseDate, -1);
    if (eve >= today) out.push({
      date: eve, kind: 'release',
      title: 'Release tomorrow',
      body: 'Check the distributor says delivered, and write tonight\'s messages without sending them.',
      url: './index.html#/runsheet',
    });
    if (set.releaseDate >= today) out.push({
      date: set.releaseDate, kind: 'release',
      title: set.song ? `“${set.song}” is out` : 'Release day',
      body: `${RUN_SEED.filter(r => r.day === 0).length} steps on the run sheet. The 8am hour of personal messages is the one to protect.`,
      url: './index.html#/runsheet',
    });
    const after = addDays(set.releaseDate, 1);
    if (after >= today) out.push({
      date: after, kind: 'release',
      title: 'Log yesterday\'s numbers',
      body: 'Day-one figures disappear from most dashboards within a week.',
      url: './index.html#/stats',
    });
  }

  /* --- the weekly review, on a Sunday --- */
  if (kinds.weekly) {
    for (let i = 0; i < HORIZON; i++) {
      const d = addDays(today, i);
      if (new Date(d + 'T00:00:00').getDay() !== 0) continue;
      out.push({
        date: d, kind: 'weekly',
        title: 'Weekly review',
        body: 'Ten minutes: what worked, what did not, the one thing next week.',
        url: './index.html#/review',
      });
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date));
}

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
