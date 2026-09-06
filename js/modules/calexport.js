/* ============================================================
   calexport.js — the export-to-your-calendar dialog

   Separate from ics.js so the generator stays testable without a
   DOM. This is only the picker around it.
   ============================================================ */

import * as S from '../store.js';
import { h, modal, btn, toast, copy } from '../ui.js';
import { CALENDARS, calName } from '../agenda.js';
import { buildICS, exportICS, countICS } from '../ics.js';

const KINDS = [
  ['release', 'Release day'],
  ['deadline', 'Deadlines — filings, registrations'],
  ['milestone', 'Master plan milestones'],
  ['content', 'Scheduled posts'],
  ['shoot', 'Shoot days'],
  ['followup', 'Outreach follow-ups'],
  ['event', 'Your own calendar events'],
];

export function calendarExportModal() {
  const set = S.get('settings');
  set.icsPrefs = set.icsPrefs || {};
  const P = set.icsPrefs;

  /* sensible first-time defaults: everything that is a commitment,
     nothing that is just a banked draft */
  if (!P.kinds) P.kinds = ['release', 'deadline', 'milestone', 'shoot', 'followup', 'event', 'content'];
  if (P.dayBefore === undefined) P.dayBefore = true;
  if (P.onDay === undefined) P.onDay = true;
  if (P.hour === undefined) P.hour = 9;
  if (P.past === undefined) P.past = false;
  if (P.done === undefined) P.done = false;
  if (!P.cals) P.cals = null;   // null = every calendar

  const opts = () => ({
    cals: P.cals,
    kinds: P.kinds,
    done: P.done,
    past: P.past,
    alarmHour: +P.hour || 9,
    alarmDays: [P.dayBefore ? 1 : null, P.onDay ? 0 : null].filter(x => x !== null),
  });

  const countEl = h('strong', { text: '—' });
  const refresh = () => {
    try { countEl.textContent = `${countICS(opts())} events`; }
    catch { countEl.textContent = '—'; }
    S.touch('settings');
  };

  const check = (label, get, set_) => h('label', { class: 'check' },
    h('input', {
      type: 'checkbox', checked: get(),
      onChange: (e) => { set_(e.target.checked); refresh(); },
    }),
    h('span', { class: 'small', text: label }));

  const kindBox = h('div', { class: 'grid g2' }, KINDS.map(([k, label]) =>
    check(label,
      () => P.kinds.includes(k),
      (on) => { P.kinds = on ? [...P.kinds, k] : P.kinds.filter(x => x !== k); })));

  /* calendar filter — collapsed by default because "all" is right
     almost always, and 23 checkboxes is a wall */
  const calWrap = h('div', { class: 'grid g3', hidden: true },
    CALENDARS().map(c => check(c.name,
      () => !P.cals || P.cals.includes(c.key),
      (on) => {
        const all = CALENDARS().map(x => x.key);
        const cur = P.cals || all;
        const next = on ? [...new Set([...cur, c.key])] : cur.filter(x => x !== c.key);
        P.cals = next.length === all.length ? null : next;
      })));

  const hourSel = h('select', { class: 'inp', style: { maxWidth: '130px' },
    onChange: (e) => { P.hour = +e.target.value; refresh(); } },
    Array.from({ length: 15 }, (_, i) => i + 6).map(hh =>
      h('option', { value: hh, selected: +P.hour === hh },
        `${String(hh).padStart(2, '0')}:00`)));

  const body = h('div',
    h('p', { class: 'small muted', style: { marginTop: 0 } },
      'Sid cannot push notifications to your phone on its own — that needs a server running around the clock. ' +
      'Exporting to your real calendar gets you the same thing for nothing: lock-screen reminders that work offline.'),

    h('div', { class: 'lab', style: { marginTop: '14px', marginBottom: '6px' } }, 'What to include'),
    kindBox,
    check('Things already done', () => P.done, v => { P.done = v; }),
    check('Dates that have already passed', () => P.past, v => { P.past = v; }),

    h('div', { class: 'lab', style: { marginTop: '16px', marginBottom: '6px' } }, 'Reminders'),
    check('The day before', () => P.dayBefore, v => { P.dayBefore = v; }),
    check('On the day', () => P.onDay, v => { P.onDay = v; }),
    h('label', { class: 'field', style: { maxWidth: '200px' } },
      h('span', { class: 'lab', text: 'Fires at' }), hourSel),

    h('div', { class: 'row', style: { marginTop: '10px' } },
      btn('Filter by calendar', (e) => {
        calWrap.hidden = !calWrap.hidden;
        e.target.textContent = calWrap.hidden ? 'Filter by calendar' : 'Hide calendar filter';
      }, { cls: 'btn-sm btn-ghost' })),
    calWrap,

    h('div', { class: 'hr' }),
    h('p', { class: 'small' }, 'This export contains ', countEl, '.'),

    h('details', { class: 'toc' },
      h('summary', { text: 'How to import it' }),
      h('div', { class: 'prose' },
        h('p', { text: 'Google Calendar — on a computer: Settings → Import & export → Import, pick the file, and choose a calendar. Make a calendar called "Release" first so you can clear and re-import it later in one action instead of hunting for duplicates.' }),
        h('p', { text: 'iPhone — mail the file to yourself or save it to Files, then tap it. iOS offers to add the events to a calendar you pick.' }),
        h('p', { text: 'Outlook — File → Open & Export → Import/Export → Import an iCalendar (.ics) file → Import.' }),
        h('p', { class: 'muted', text: 'This is a snapshot, not a live feed. When dates move, export again. Events keep the same identity across exports, so Apple Calendar and Outlook update them in place; Google is less reliable about that, which is why the separate-calendar trick is worth the two minutes.' }))),
  );

  refresh();

  modal({
    title: 'Send to your calendar', wide: true, body,
    actions: [
      { label: 'Copy as text', cls: 'btn-ghost', keepOpen: true,
        onClick: () => { copy(buildICS(opts())); } },
      'spacer',
      { label: 'Cancel' },
      { label: 'Download .ics', cls: 'btn-primary', onClick: () => {
        const n = countICS(opts());
        if (!n) { toast('Nothing matches those filters', 3000); return false; }
        exportICS(opts());
        toast(`${n} events exported`);
      } },
    ],
  });
}
