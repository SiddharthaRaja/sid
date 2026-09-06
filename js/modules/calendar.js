/* ============================================================
   calendar.js — month / week / agenda, overlay calendars,
   deadlines and reminders
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, uid, btn, card, cardHead, empty, modal, field, selectField, checkbox,
  toast, fmtDate, tLabel, resolveDate, todayISO, toISO, fromISO, addDays, daysBetween,
  MONTHS, DOW, confirmDelete, relativeDay,
} from '../ui.js';
import { CALENDARS, calColor, calName, collectEvents, eventsByDay } from '../agenda.js';
import { scheduleRow } from './shared.js';
import { calendarExportModal } from './calexport.js';
import { icon } from '../icons.js';

let cursor = null;      // first of the displayed month
let view = 'month';

export function renderCalendar() {
  const root = h('div');
  const cal = S.get('calendar');
  const set = S.get('settings');
  if (!cursor) cursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  // default: everything visible
  const cals = CALENDARS();
  cals.forEach(c => { if (cal.visible[c.key] === undefined) cal.visible[c.key] = true; });

  const draw = () => {
    clear(root);
    const events = collectEvents().filter(e => cal.visible[e.cal] !== false);
    const byDay = eventsByDay(events);

    root.append(bar(draw));
    root.append(calendarPicker(cal, draw));

    if (view === 'month')  root.append(monthGrid(byDay, draw));
    if (view === 'week')   root.append(weekStrip(byDay, draw));
    if (view === 'agenda') root.append(agenda(events, draw));

    root.append(upcomingReminders(events));
  };

  const bar = (redraw) => {
    const label = view === 'month'
      ? `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`
      : view === 'week'
        ? `Week of ${fmtDate(toISO(weekStart()), { long: true })}`
        : 'Everything ahead';

    const step = (n) => {
      if (view === 'month') cursor = new Date(cursor.getFullYear(), cursor.getMonth() + n, 1);
      else if (view === 'week') cursor = new Date(cursor.getTime() + n * 7 * 86400000);
      redraw();
    };

    return h('div', { class: 'cal-bar' },
      h('button', { class: 'icon-btn', onClick: () => step(-1), html: '‹', style: { fontSize: '20px' } }),
      h('button', { class: 'icon-btn', onClick: () => step(1), html: '›', style: { fontSize: '20px' } }),
      h('div', { class: 'cal-title', text: label }),
      btn('Today', () => { cursor = new Date(); cursor.setDate(1); redraw(); }, { cls: 'btn-sm' }),
      h('div', { style: { flex: 1 } }),
      h('div', { class: 'row', style: { gap: '2px' } },
        [['month', 'Month'], ['week', 'Week'], ['agenda', 'Agenda']].map(([k, l]) =>
          h('button', { class: `chip ${view === k ? 'on' : ''}`, onClick: () => { view = k; redraw(); } }, l))),
      btn('Export', calendarExportModal, { cls: 'btn-sm btn-ghost',
        title: 'Send these dates to Google Calendar, Apple Calendar or Outlook' }),
      btn('New', () => openEvent(null, redraw), { cls: 'btn-primary btn-sm', icon: 'plus' }));
  };

  draw();
  return root;
}

/* ---------- calendar toggles ---------- */

let pickerOpen = false;

function calendarPicker(cal, redraw) {
  const cals = CALENDARS();
  const on = cals.filter(c => cal.visible[c.key] !== false).length;
  const wrap = h('div', { style: { marginBottom: '14px' } });

  const toggle = h('button', { class: `chip ${pickerOpen ? 'on' : ''}`, onClick: () => { pickerOpen = !pickerOpen; redraw(); } },
    `Calendars — ${on} of ${cals.length} showing ${pickerOpen ? '▴' : '▾'}`);

  const summary = h('div', { class: 'row' }, toggle,
    !pickerOpen ? cals.filter(c => cal.visible[c.key] !== false).slice(0, 8).map(c =>
      h('span', { class: 'chip on', style: { pointerEvents: 'none' } },
        h('span', { class: 'dot', style: { background: c.color } }), c.name)) : null,
    !pickerOpen && on > 8 ? h('span', { class: 'small muted', text: `+${on - 8} more` }) : null);
  wrap.append(summary);

  if (pickerOpen) {
    const box = h('div', { class: 'row', style: { marginTop: '8px' } });
    box.append(
      h('button', { class: 'chip', onClick: () => { cals.forEach(c => cal.visible[c.key] = true); S.touch('calendar'); redraw(); } }, 'Show all'),
      h('button', { class: 'chip', onClick: () => { cals.forEach(c => cal.visible[c.key] = false); S.touch('calendar'); redraw(); } }, 'Hide all'),
    );
    cals.forEach(c => box.append(h('button', {
      class: `chip ${cal.visible[c.key] !== false ? 'on' : ''}`,
      onClick: () => { cal.visible[c.key] = cal.visible[c.key] === false; S.touch('calendar'); redraw(); },
    }, h('span', { class: 'dot', style: { background: c.color } }), c.name)));
    wrap.append(box);
  }
  return wrap;
}

/* ---------- month ---------- */

function monthGrid(byDay, redraw) {
  const set = S.get('settings');
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7;            // Monday-first
  const start = new Date(first); start.setDate(1 - startOffset);

  const grid = h('div', { class: 'cal-grid' });
  DOW.forEach(d => grid.append(h('div', { class: 'cal-dow', text: d })));

  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const iso = toISO(d);
    const out = d.getMonth() !== cursor.getMonth();
    const evs = byDay.get(iso) || [];

    const cell = h('div', {
      class: `cal-day ${out ? 'out' : ''} ${iso === todayISO() ? 'today' : ''} ${iso === set.releaseDate ? 'release' : ''}`,
      onClick: (e) => { if (e.target === cell || e.target.classList.contains('cal-num')) openEvent({ when: iso }, redraw); },
    });
    cell.append(h('div', { class: 'cal-num', text: d.getDate() }));
    if (set.releaseDate) cell.append(h('div', { class: 'cal-t', text: tLabel(iso, set.releaseDate) }));

    evs.slice(0, 4).forEach(e => cell.append(h('div', {
      class: `cal-ev ${e.done ? 'done' : ''}`,
      style: { borderLeftColor: calColor(e.cal) },
      title: `${calName(e.cal)} — ${e.title}`,
      onClick: (ev) => { ev.stopPropagation(); openFromEvent(e, redraw); },
      text: e.title,
    })));
    if (evs.length > 4) cell.append(h('div', { class: 'cal-more', text: `+${evs.length - 4} more` }));

    grid.append(cell);
  }
  return grid;
}

/* ---------- week ---------- */

const weekStart = () => { const d = new Date(cursor); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; };

function weekStrip(byDay, redraw) {
  const set = S.get('settings');
  const s = weekStart();
  const box = h('div', { class: 'grid g3' });
  for (let i = 0; i < 7; i++) {
    const d = new Date(s); d.setDate(s.getDate() + i);
    const iso = toISO(d);
    const evs = byDay.get(iso) || [];
    box.append(card(
      cardHead(`${DOW[i]} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`,
        set.releaseDate ? h('span', { class: 'small mono muted', text: tLabel(iso, set.releaseDate) }) : null),
      evs.length
        ? h('div', { class: 'list' }, evs.map(e => eventRow(e, redraw)))
        : h('div', { class: 'small muted', text: '—' }),
      h('div', { style: { marginTop: '8px' } },
        btn('Add', () => openEvent({ when: iso }, redraw), { cls: 'btn-sm btn-ghost', icon: 'plus' }))));
  }
  return box;
}

/* ---------- agenda ---------- */

function agenda(events, redraw) {
  const set = S.get('settings');
  const today = todayISO();
  const future = events.filter(e => e.iso >= today);
  if (!future.length) return empty('Nothing scheduled ahead', 'Add something, or set a release date in Settings and use T-offsets.');

  const box = h('div');
  const byDay = eventsByDay(future);
  [...byDay.keys()].forEach(iso => {
    const d = fromISO(iso);
    box.append(h('div', { class: 'agenda-day' },
      h('div', { class: 'agenda-date' },
        h('div', { class: 'dd', text: d.getDate() }),
        h('div', { class: 'mm', text: `${MONTHS[d.getMonth()].slice(0, 3)} · ${DOW[(d.getDay() + 6) % 7]}` }),
        set.releaseDate ? h('div', { class: 'tt', text: tLabel(iso, set.releaseDate) }) : null),
      h('div', { class: 'agenda-items' }, byDay.get(iso).map(e => eventRow(e, redraw)))));
  });
  return box;
}

function eventRow(e, redraw) {
  return h('div', {
    class: 'item', style: { padding: '9px 12px', borderLeft: `3px solid ${calColor(e.cal)}` },
    onClick: () => openFromEvent(e, redraw),
  },
    h('div', { class: 'item-head' },
      h('span', { class: 'item-title', text: e.title, style: e.done ? { textDecoration: 'line-through', opacity: .55 } : {} }),
      h('span', { class: 'tag', text: calName(e.cal) })),
    e.note ? h('div', { class: 'item-meta' }, h('span', { text: e.note })) : null);
}

/* ---------- open ---------- */

function openFromEvent(e, redraw) {
  if (e.kind === 'event') return openEvent(e.ref, redraw);
  location.hash = e.hash;
}

export function openEvent(seed, redraw) {
  const cal = S.get('calendar');
  const isNew = !seed || !seed.id;
  const item = isNew
    ? { id: uid(), title: '', when: seed?.when || todayISO(), cal: seed?.cal || 'general', notes: '', done: false, reminder: '' }
    : seed;
  if (isNew) { cal.events.push(item); S.touch('calendar'); }

  const body = h('div',
    field('Title', item, 'title', { slice: 'calendar', placeholder: 'What is happening' }),
    selectField('Calendar', item, 'cal', CALENDARS().map(c => [c.key, c.name]), { slice: 'calendar' }),
    scheduleRow(item, 'calendar'),
    selectField('Reminder', item, 'reminder',
      [['', 'None'], ['0', 'On the day'], ['1', '1 day before'], ['3', '3 days before'], ['7', '1 week before']],
      { slice: 'calendar' }),
    field('Notes', item, 'notes', { slice: 'calendar', multiline: true }),
    checkbox('Done', item, 'done', { slice: 'calendar' }));

  modal({
    title: isNew ? 'New entry' : 'Edit entry',
    body,
    actions: [
      { label: 'Delete', cls: 'btn-danger btn-ghost', onClick: () => {
        cal.events.splice(cal.events.indexOf(item), 1); S.touch('calendar'); redraw?.(); } },
      'spacer',
      { label: 'Done', cls: 'btn-primary', onClick: () => redraw?.() },
    ],
    onClose: () => redraw?.(),
  });
}

/* ---------- reminders ---------- */

function upcomingReminders(events) {
  const today = todayISO();
  const due = events.filter(e => {
    if (!e.reminder && e.reminder !== '0') return false;
    if (e.done) return false;
    const lead = parseInt(e.reminder, 10);
    const fire = addDays(e.iso, -lead);
    return fire <= today && e.iso >= today;
  });
  if (!due.length) return h('div');

  requestNotify(due);

  return card(
    cardHead('Reminders due', h('span', { class: 'tag warn', text: String(due.length) })),
    h('div', { class: 'list' }, due.map(e => h('div', { class: 'item' },
      h('div', { class: 'item-head' },
        h('span', { html: icon('bell'), style: { color: 'var(--warn)' } }),
        h('span', { class: 'item-title', text: e.title }),
        h('span', { class: 'tag', text: relativeDay(e.iso) }))))));
}

let notified = new Set();
function requestNotify(due) {
  if (!('Notification' in window)) return;
  const fire = () => due.forEach(e => {
    const k = e.iso + e.title;
    if (notified.has(k)) return;
    notified.add(k);
    try { new Notification('Sid', { body: `${e.title} — ${relativeDay(e.iso)}`, tag: k }); } catch {}
  });
  if (Notification.permission === 'granted') fire();
  else if (Notification.permission === 'default') Notification.requestPermission().then(p => { if (p === 'granted') fire(); });
}
