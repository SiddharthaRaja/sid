/* ============================================================
   agenda.js — one timeline assembled from every module
   ============================================================ */

import * as S from './store.js';
import { resolveDate } from './ui.js';
import { offsetOf, isISO } from './phases.js';
import { PLATFORMS, PLATFORM_MAP } from './data/platforms.js';
import { PCOLORS } from './icons.js';

export const CALENDARS = () => ([
  { key: 'general',  name: 'General',      color: '#e0603a' },
  { key: 'plan',     name: 'Master plan',  color: '#8d939c' },
  { key: 'video',    name: 'Music video',  color: '#d0a03e' },
  { key: 'business', name: 'Business',     color: '#3fb96b' },
  { key: 'outreach', name: 'Outreach',     color: '#4a86d8' },
  ...PLATFORMS.map(p => ({ key: p.key, name: p.name, color: PCOLORS[p.key] || '#8d939c' })),
]);

export const calColor = (key) => (CALENDARS().find(c => c.key === key) || {}).color || '#8d939c';
export const calName  = (key) => (CALENDARS().find(c => c.key === key) || {}).name || key;

/** Every dated thing in the app, as flat events — raw `when` kept,
    so the same list serves the calendar (real dates) and the
    planning timeline (T-offsets, no release date needed). */
export function collectRaw() {
  const set = S.get('settings');
  const rel = set.releaseDate;
  const out = [];
  const push = (e) => { if (e.when || e.iso) out.push(e); };

  // 1. hand-made calendar events
  S.get('calendar').events.forEach(e => push({
    when: e.when, iso: resolveDate(e.when, rel), title: e.title, cal: e.cal || 'general',
    done: !!e.done, kind: 'event', ref: e, hash: '#/calendar',
    note: e.notes, reminder: e.reminder,
  }));

  // 2. release day itself
  if (rel) push({ when: rel, iso: rel, title: `RELEASE — ${set.song || 'the single'}`, cal: 'general', kind: 'release', hash: '#/release' });

  // 3. platform content
  PLATFORMS.forEach(p => {
    const sl = S.get(`p_${p.key}`);
    Object.entries(sl.content || {}).forEach(([tk, items]) => {
      const type = (p.types.find(t => t.key === tk) || { label: tk });
      (items || []).forEach(it => push({
        when: it.when, iso: resolveDate(it.when, rel),
        title: it.title || (it.body || '').slice(0, 48) || type.label,
        cal: p.key, done: it.status === 'posted', kind: 'content',
        hash: `#/p/${p.key}/${tk}`, note: type.label, ref: it,
      }));
    });
  });

  // 4. master plan milestones
  const plan = S.get('plan');
  (plan.milestones || []).forEach(m => push({
    when: m.when, iso: resolveDate(m.when, rel), title: m.title, cal: 'plan',
    done: !!m.done, kind: 'milestone', hash: '#/plan', ref: m,
  }));
  (plan.custom || []).forEach(m => push({
    when: m.when, iso: resolveDate(m.when, rel), title: m.title, cal: 'plan',
    done: !!m.done, kind: 'milestone', hash: '#/plan', ref: m,
  }));

  // 5. shoot days
  S.get('video').schedules.forEach(sc => {
    push({ when: sc.date, iso: resolveDate(sc.date, rel), title: `Shoot — ${sc.name}`, cal: 'video', kind: 'shoot', hash: '#/video', ref: sc });
  });

  // 6. business deadlines (finance forms + rights registrations)
  (S.get('finance').forms || []).forEach(f => push({
    when: f.when, iso: resolveDate(f.when, rel), title: `${f.name} due`, cal: 'business',
    done: f.status === 'done', kind: 'deadline', hash: '#/finance', ref: f,
  }));
  (S.get('rights').registrations || []).forEach(r => push({
    when: r.when, iso: resolveDate(r.when, rel), title: r.name, cal: 'business',
    done: !!r.done, kind: 'deadline', hash: '#/rights', ref: r,
  }));

  // 7. outreach follow-ups
  (S.get('contacts').items || []).forEach(c => {
    if (!c.followUp) return;
    if (['placed', 'declined'].includes(c.status)) return;
    push({
      when: c.followUp, iso: c.followUp, title: `Follow up: ${c.name || c.org || 'contact'}`,
      cal: 'outreach', done: false, kind: 'followup', hash: '#/contacts',
      note: c.playlist || c.org || '', ref: c,
    });
  });

  return out;
}

/** Only the things that resolve to a real calendar day.
    In planning mode there is no release date, so T-offsets resolve
    to nothing and this is empty by design — the calendar says so
    rather than showing a blank grid. */
export function collectEvents() {
  return collectRaw().filter(e => e.iso).sort((a, b) => a.iso.localeCompare(b.iso));
}

/** Everything, positioned on the T-axis instead of the calendar.
    `off` is the day offset from release, or null for a fixed
    calendar date or nothing at all. */
export function collectPlanned() {
  return collectRaw().map(e => ({ ...e, off: offsetOf(e.when) }))
    .sort((a, b) => {
      const ka = a.off ?? (isISO(a.when) ? 8888 : 9999);
      const kb = b.off ?? (isISO(b.when) ? 8888 : 9999);
      return ka - kb || String(a.title).localeCompare(String(b.title));
    });
}

export function eventsByDay(events) {
  const map = new Map();
  events.forEach(e => {
    if (!map.has(e.iso)) map.set(e.iso, []);
    map.get(e.iso).push(e);
  });
  return map;
}
