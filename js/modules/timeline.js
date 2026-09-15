/* ============================================================
   timeline.js — the planning-mode view of everything

   In planning mode there is no release date, so there is no
   calendar. What there is instead: every task, post and milestone
   sitting on the T-axis, grouped by phase. This is the screen you
   plan on. The moment you set a release date, the same items show
   up on the real calendar with real days.
   ============================================================ */

import * as S from '../store.js';
import { h, card, cardHead, empty, btn, fmtDate } from '../ui.js';
import { collectPlanned, calColor, calName } from '../agenda.js';
import { PHASES, FIXED, UNDATED, phaseOfOffset, phaseTitle, isISO } from '../phases.js';

/** A banner explaining which mode the app is in, with the way out. */
export function modeBanner(where) {
  const set = S.get('settings');
  if (set.mode !== 'planning') return null;
  return h('div', { class: 'mode-banner' },
    h('div', {},
      h('strong', { text: 'Planning mode' }),
      h('div', { class: 'small', text: where === 'calendar'
        ? 'No release date is set, so nothing has a real day yet. Everything lives on the T-axis below.'
        : 'Everything is scheduled as T-minus / T-plus days. Set a release date to turn those into real dates.' })),
    h('div', { class: 'spacer' }),
    h('a', { class: 'btn btn-sm btn-primary', href: '#/release', text: 'Set a release date' }));
}

/**
 * The T-axis itself.
 * opts.limit — show at most this many rows per phase
 * opts.collapsedEmpty — hide phases with nothing in them
 */
export function planningTimeline(opts = {}) {
  const items = collectPlanned();
  const box = h('div');

  const groups = [
    ...PHASES.map(p => ({ p, rows: items.filter(i => i.off !== null && phaseOfOffset(i.off).key === p.key) })),
    { p: FIXED,   rows: items.filter(i => i.off === null && isISO(i.when)) },
    { p: UNDATED, rows: items.filter(i => i.off === null && !isISO(i.when)) },
  ];

  const total = items.length;
  if (!total) {
    return empty('Nothing planned yet',
      'Open the master plan, or a platform tab, and give things a T-offset. They collect here.');
  }

  /* one glance at the shape of the plan before the detail */
  const max = Math.max(...groups.map(g => g.rows.length), 1);
  box.append(card(
    cardHead('Shape of the plan', h('span', { class: 'small muted mono', text: `${total} things` })),
    h('div', { class: 'phase-bars' }, groups.filter(g => g.rows.length).map(g =>
      h('div', { class: 'phase-bar' },
        h('div', { class: 'pb-track' }, h('i', { style: { height: `${Math.round(g.rows.length / max * 100)}%` } })),
        h('div', { class: 'pb-n mono', text: String(g.rows.length) }),
        h('div', { class: 'pb-lab', text: g.p.range || g.p.label }))))));

  groups.forEach(g => {
    if (!g.rows.length) { if (opts.collapsedEmpty) return; }
    const done = g.rows.filter(r => r.done).length;
    const c = card(cardHead(phaseTitle(g.p),
      g.rows.length ? h('span', { class: 'small muted mono', text: `${done}/${g.rows.length}` }) : null));

    if (!g.rows.length) {
      c.append(h('div', { class: 'small muted', text: 'Nothing here yet.' }));
    } else {
      const rows = opts.limit ? g.rows.slice(0, opts.limit) : g.rows;
      c.append(h('div', { class: 'list' }, rows.map(tRow)));
      if (opts.limit && g.rows.length > opts.limit) {
        c.append(h('div', { class: 'small muted', style: { marginTop: '8px' },
          text: `+ ${g.rows.length - opts.limit} more in this phase` }));
      }
    }
    box.append(c);
  });

  return box;
}

function tRow(e) {
  return h('a', {
    class: 'item', href: e.hash,
    style: { display: 'block', textDecoration: 'none', color: 'inherit', borderLeft: `3px solid ${calColor(e.cal)}` },
  },
    h('div', { class: 'item-head' },
      h('span', { class: 'tag mono', text: e.off === null ? (isISO(e.when) ? fmtDate(e.when) : '—') : (e.off === 0 ? 'T' : e.off > 0 ? `T+${e.off}` : `T${e.off}`) }),
      h('span', { class: 'item-title', text: e.title,
        style: e.done ? { opacity: .5, textDecoration: 'line-through' } : {} })),
    h('div', { class: 'item-meta' },
      h('span', { text: calName(e.cal) }),
      e.note ? h('span', { text: e.note }) : null));
}
