/* ============================================================
   runsheet.js — release day, hour by hour

   Everything else in Sid plans. This one is used while it is
   happening: on a phone, one thumb, ticking things off.
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, uid, btn, card, cardHead, empty, field, modal, selectField, toast,
  todayISO, fmtDate, addDays, daysBetween, download, prose,
  removeFrom
} from '../ui.js';
import { RUN_SEED, RUN_NOTES } from '../data/runsheet.js';
import { progressBar } from './shared.js';

const DAY_LABEL = { '-1': 'The night before', '0': 'Release day', '1': 'The morning after' };

export function renderRunsheet() {
  const root = h('div');
  const R = S.get('runsheet');
  const set = S.get('settings');
  R.done = R.done || {};
  R.custom = R.custom || [];

  const all = () => [...RUN_SEED, ...R.custom].sort((a, b) =>
    (a.day - b.day) || String(a.at).localeCompare(String(b.at)));

  const dateFor = (day) => set.releaseDate ? addDays(set.releaseDate, day) : '';

  /* Minutes since midnight, for the "now" marker. */
  const nowMins = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  const toMins = (at) => { const [hh, mm] = String(at).split(':').map(Number); return hh * 60 + (mm || 0); };

  const draw = () => {
    clear(root);
    const items = all();
    const done = items.filter(i => R.done[i.id]).length;
    const today = todayISO();
    const rel = set.releaseDate;
    const offset = rel ? daysBetween(today, rel) : null;   // +ve = release is ahead
    const liveDay = offset === null ? null : (offset === 0 ? 0 : offset === 1 ? -1 : offset === -1 ? 1 : null);

    root.append(h('div', { class: 'page-head' },
      h('div', {},
        h('h1', { text: 'Release day' }),
        h('div', { class: 'sub', text: rel
          ? `${fmtDate(rel, { long: true })}${offset === 0 ? ' — today' : offset > 0 ? ` — in ${offset} days` : ` — ${-offset} days ago`}`
          : 'No release date set — the times below have no day to attach to yet.' })),
      h('div', { class: 'spacer' }),
      h('div', { class: 'page-actions' },
        btn('Add a step', () => openStep(null), { cls: 'btn-sm', icon: 'plus' }),
        btn('Print it', exportSheet, { cls: 'btn-sm' }))));

    if (!rel) {
      root.append(h('div', { class: 'mode-banner' },
        h('div', {}, h('strong', { text: 'Planning mode' }),
          h('div', { class: 'small', text: 'The run sheet works without a date — it just cannot tell you which hour you are in.' })),
        h('div', { class: 'spacer' }),
        h('a', { class: 'btn btn-sm btn-primary', href: '#/release', text: 'Set a release date' })));
    }

    root.append(card(
      h('div', { class: 'row' },
        h('div', { style: { flex: 1 } }, progressBar(items.length ? done / items.length * 100 : 0)),
        h('span', { class: 'mono small muted', text: `${done} / ${items.length}` })),
      h('div', { class: 'row', style: { marginTop: '12px' } },
        btn('Reset every tick', () => {
          modal({
            title: 'Start the day again?',
            body: h('p', { class: 'small muted', text: 'Unticks everything. The custom steps you added stay.' }),
            actions: [{ label: 'Cancel' }, { label: 'Reset', cls: 'btn-danger', onClick: () => { R.done = {}; S.touch('runsheet'); draw(); } }],
          });
        }, { cls: 'btn-sm btn-ghost' }),
        liveDay !== null
          ? h('span', { class: 'small', style: { color: 'var(--ok)' }, text: `Today is "${DAY_LABEL[liveDay]}" — that section is highlighted below.` })
          : null)));

    [-1, 0, 1].forEach(day => {
      const dayItems = items.filter(i => i.day === day);
      if (!dayItems.length) return;
      const isNow = liveDay === day;
      const d = dateFor(day);
      const c = card(
        cardHead(DAY_LABEL[day],
          d ? h('span', { class: 'tag mono', text: fmtDate(d, { long: true }) }) : null,
          isNow ? h('span', { class: 'tag ok', text: 'today' }) : null,
          h('span', { class: 'small muted', text: `${dayItems.filter(i => R.done[i.id]).length}/${dayItems.length}` })));
      if (isNow) c.style.borderColor = 'var(--accent-line)';

      let marked = false;
      dayItems.forEach(i => {
        /* the "you are here" line, drawn once, on the live day */
        if (isNow && !marked && toMins(i.at) > nowMins()) {
          marked = true;
          c.append(h('div', { class: 'now-line' }, h('span', { text: 'now' })));
        }
        c.append(stepRow(i, isNow));
      });
      root.append(c);
    });

    root.append(card(cardHead('Things that are true on the day'),
      h('ul', { class: 'prose' }, RUN_NOTES.map(n => h('li', { text: n })))));
  };

  function stepRow(i, isLiveDay) {
    const on = !!R.done[i.id];
    const past = isLiveDay && toMins(i.at) < nowMins() && !on;

    return h('div', {
      class: `run-step ${on ? 'done' : ''} ${past ? 'late' : ''}`,
      onClick: (e) => {
        if (e.target.closest('button')) return;
        R.done[i.id] = !on;
        S.touch('runsheet');
        draw();
      },
    },
      h('div', { class: 'run-time mono' },
        h('div', { text: i.at }),
        i.mins ? h('div', { class: 'run-mins', text: `${i.mins}m` }) : null),
      h('div', { class: 'run-body' },
        h('div', { class: 'row', style: { gap: '8px' } },
          h('input', { type: 'checkbox', checked: on, style: { accentColor: 'var(--accent)' },
            onChange: () => { R.done[i.id] = !on; S.touch('runsheet'); draw(); } }),
          h('span', { class: 'run-title', text: i.title }),
          i.critical ? h('span', { class: 'tag bad', text: 'do not skip' }) : null,
          past ? h('span', { class: 'tag warn', text: 'overdue' }) : null,
          i.custom ? h('button', { class: 'icon-btn', style: { marginLeft: 'auto' }, html: '⋯',
            onClick: () => openStep(i) }) : null),
        i.detail ? h('div', { class: 'small muted', style: { marginTop: '3px' }, text: i.detail }) : null,
        i.where ? h('div', { class: 'small', style: { marginTop: '3px', color: 'var(--fg-3)' }, text: i.where }) : null));
  }

  function openStep(existing) {
    const isNew = !existing;
    const s = existing || { id: uid(), day: 0, at: '12:00', mins: 10, title: '', detail: '', where: '', custom: true };
    modal({
      title: isNew ? 'Add a step' : s.title || 'Step',
      body: h('div',
        h('div', { class: 'grid g3' },
          selectField('When', s, 'day', [[-1, 'The night before'], [0, 'Release day'], [1, 'The morning after']], { slice: 'runsheet' }),
          field('Time', s, 'at', { slice: 'runsheet', type: 'time' }),
          field('Minutes', s, 'mins', { slice: 'runsheet', type: 'number' })),
        field('What', s, 'title', { slice: 'runsheet' }),
        field('Detail', s, 'detail', { slice: 'runsheet', multiline: true }),
        field('Where', s, 'where', { slice: 'runsheet', placeholder: 'Instagram, Spotify for Artists…' })),
      actions: [
        !isNew ? { label: 'Delete', cls: 'btn-danger btn-ghost', onClick: () => {
          removeFrom(R.custom, s); delete R.done[s.id]; S.touch('runsheet'); draw();
        } } : null,
        'spacer',
        { label: 'Save', cls: 'btn-primary', onClick: () => {
          s.day = Number(s.day);
          if (isNew && !s.title) { toast('Give the step a name first — nothing has been lost', 3000); return false; }
          if (isNew) R.custom.push(s);
          S.touch('runsheet'); draw();
        } },
      ].filter(Boolean),
    });
  }

  function exportSheet() {
    const lines = [`# Release day — ${set.artist || '[artist]'}, "${set.song || '[song]'}"`, ''];
    if (set.releaseDate) lines.push(`${fmtDate(set.releaseDate, { long: true })}`, '');
    [-1, 0, 1].forEach(day => {
      const items = all().filter(i => i.day === day);
      if (!items.length) return;
      const d = dateFor(day);
      lines.push(`## ${DAY_LABEL[day]}${d ? ` — ${fmtDate(d, { long: true })}` : ''}`, '');
      items.forEach(i => {
        lines.push(`- **${i.at}** ${i.title}${i.critical ? '  ⚠' : ''}${i.mins ? ` _(${i.mins}m)_` : ''}`);
        if (i.detail) lines.push(`  - ${i.detail}`);
        if (i.where) lines.push(`  - ${i.where}`);
      });
      lines.push('');
    });
    lines.push('---', '');
    RUN_NOTES.forEach(n => lines.push(`- ${n}`));
    download(`release-day-${set.releaseDate || todayISO()}.md`, lines.join('\n'), 'text/markdown');
    toast('Saved');
  }

  draw();
  return root;
}

/** A card for Today, in the window where the run sheet is the page you want. */
export function runsheetCard() {
  const set = S.get('settings');
  if (set.mode === 'planning' || !set.releaseDate) return null;
  const off = daysBetween(todayISO(), set.releaseDate);   // +ve: release ahead
  if (off > 1 || off < -1) return null;

  const R = S.get('runsheet');
  const day = off === 0 ? 0 : off === 1 ? -1 : 1;
  const items = [...RUN_SEED, ...(R.custom || [])].filter(i => i.day === day);
  const done = items.filter(i => (R.done || {})[i.id]).length;
  const next = items.filter(i => !(R.done || {})[i.id])[0];

  return h('div', { class: 'mode-banner' },
    h('div', {},
      h('strong', { text: off === 0 ? 'It is release day.' : off === 1 ? 'Release is tomorrow.' : 'The morning after.' }),
      h('div', { class: 'small', text: next
        ? `${done}/${items.length} done. Next: ${next.at} — ${next.title}`
        : `All ${items.length} steps ticked. Well done.` })),
    h('div', { class: 'spacer' }),
    h('a', { class: 'btn btn-sm btn-primary', href: '#/runsheet', text: 'Open the run sheet' }));
}
