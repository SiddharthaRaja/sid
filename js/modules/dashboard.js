/* ============================================================
   dashboard.js — the one screen that tells you what to do today
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, btn, card, cardHead, empty, stat, fmtNum, fmtDate, tLabel, relativeDay,
  todayISO, addDays, daysBetween, resolveDate,
} from '../ui.js';
import { collectEvents, calColor, calName } from '../agenda.js';
import { PLATFORMS } from '../data/platforms.js';
import { icon, PCOLORS } from '../icons.js';
import { progressBar } from './shared.js';
import { sparkline } from '../charts.js';
import { pitchWarning } from './pitch.js';

export function renderDashboard() {
  const root = h('div');
  const set = S.get('settings');
  const plan = S.get('plan');
  const today = todayISO();
  const events = collectEvents();

  const overdue = events.filter(e => e.iso < today && !e.done && e.kind !== 'content' && e.kind !== 'release');
  const todayEv = events.filter(e => e.iso === today);
  const soon = events.filter(e => e.iso > today && e.iso <= addDays(today, 14));

  const allMs = [...(plan.milestones || []), ...(plan.custom || [])];
  const msDone = allMs.filter(m => m.done).length;

  const banked = PLATFORMS.reduce((a, p) => {
    const sl = S.get(`p_${p.key}`);
    return a + Object.values(sl.content || {}).reduce((x, arr) => x + (arr || []).length, 0);
  }, 0);
  const scheduled = events.filter(e => e.kind === 'content').length;

  /* ---------- header ---------- */
  root.append(h('div', { class: 'page-head' },
    h('div', {},
      h('h1', { text: set.artist ? `${set.artist}` : 'Sid' }),
      h('div', { class: 'sub', text: (() => {
        const bits = [];
        if (set.song) bits.push(`"${set.song}"`);
        if (set.releaseDate) bits.push(`${fmtDate(set.releaseDate, { long: true })} · ${relativeDay(set.releaseDate)}`);
        if (bits.length) return bits.join(' — ');
        return 'Set your song title and release date in Settings — every T-offset in the app hangs off that one date.';
      })() })),
    h('div', { class: 'spacer' })));

  /* ---------- the one deadline that cannot be recovered ---------- */
  const pw = pitchWarning();
  if (pw) root.append(pw);

  /* ---------- countdown ---------- */
  if (set.releaseDate) {
    const n = daysBetween(today, set.releaseDate);
    root.append(h('div', { class: 'grid g4' },
      stat(n > 0 ? 'Days to release' : n === 0 ? 'Release day' : 'Days since release',
        n === 0 ? 'TODAY' : String(Math.abs(n)), `T${n === 0 ? '' : n > 0 ? '-' + n : '+' + -n}`),
      stat('Plan progress', `${msDone}/${allMs.length}`, `${allMs.length ? Math.round(msDone / allMs.length * 100) : 0}% complete`),
      stat('Content banked', String(banked), `${scheduled} of them dated`),
      stat('This fortnight', String(soon.length + todayEv.length), 'things scheduled')));
  } else {
    root.append(h('div', { class: 'grid g3' },
      stat('Plan progress', `${msDone}/${allMs.length}`, 'milestones'),
      stat('Content banked', String(banked), `${scheduled} dated`),
      stat('Scheduled ahead', String(soon.length), 'next 14 days')));
  }

  root.append(h('div', { style: { margin: '14px 0 4px' } }, progressBar(allMs.length ? msDone / allMs.length * 100 : 0)));

  /* ---------- overdue ---------- */
  if (overdue.length) {
    root.append(card(
      cardHead('Overdue', h('span', { class: 'tag bad', text: String(overdue.length) })),
      h('div', { class: 'list' }, overdue.slice(-8).reverse().map(e => row(e)))));
  }

  /* ---------- today ---------- */
  root.append(card(
    cardHead(`Today — ${fmtDate(today, { long: true })}`),
    todayEv.length
      ? h('div', { class: 'list' }, todayEv.map(e => row(e)))
      : h('div', { class: 'small muted', text: 'Nothing scheduled. A good day to bank three clips.' })));

  /* ---------- next 14 days ---------- */
  root.append(card(
    cardHead('Next 14 days', h('a', { href: '#/calendar', class: 'small', text: 'open calendar' })),
    soon.length
      ? h('div', { class: 'list' }, soon.slice(0, 14).map(e => row(e, true)))
      : h('div', { class: 'small muted', text: 'Nothing ahead. Open the master plan and date the next few milestones.' })));

  /* ---------- platform pulse ---------- */
  const pulse = h('div', { class: 'grid g3' });
  PLATFORMS.forEach(p => {
    const sl = S.get(`p_${p.key}`);
    const n = Object.values(sl.content || {}).reduce((x, arr) => x + (arr || []).length, 0);
    const stats = (sl.stats || []).slice().sort((a, b) => a.date.localeCompare(b.date));
    const hist = stats.map(e => +e.m?.[p.metrics[0]]).filter(v => isFinite(v));
    if (!n && !hist.length && !Object.values(sl.setupDone || {}).some(Boolean)) return;
    const setupN = Object.values(sl.setupDone || {}).filter(Boolean).length;
    pulse.append(h('a', { class: 'stat', href: `#/p/${p.key}`, style: { textDecoration: 'none', color: 'inherit', display: 'block' } },
      h('div', { class: 'row', style: { gap: '7px' } },
        h('span', { html: icon(p.icon), style: { color: PCOLORS[p.key] } }),
        h('div', { class: 'k', text: p.name }),
        hist.length > 1 ? h('span', { style: { marginLeft: 'auto' } }, sparkline(hist, { color: PCOLORS[p.key] })) : null),
      h('div', { class: 'd', style: { marginTop: '7px' } },
        `${n} item${n === 1 ? '' : 's'} · setup ${setupN}/${p.setup.length}${hist.length ? ` · ${p.metrics[0]} ${fmtNum(hist[hist.length - 1])}` : ''}`)));
  });
  if (pulse.children.length) {
    root.append(h('div', { class: 'card-head', style: { marginTop: '20px' } }, h('h3', { text: 'Platforms' })));
    root.append(pulse);
  }

  /* ---------- quick links ---------- */
  root.append(h('div', { class: 'card-head', style: { marginTop: '20px' } }, h('h3', { text: 'Jump to' })));
  root.append(h('div', { class: 'grid g4' },
    [['#/calendar', 'Calendar', 'calendar'], ['#/plan', 'Master plan', 'masterplan'],
     ['#/video', 'Music video', 'video'], ['#/rights', 'Rights', 'rights'],
     ['#/finance', 'Finance', 'finance'], ['#/radio', 'Radio', 'radio'],
     ['#/stats', 'Statistics', 'stats'], ['#/notes', 'Notes', 'notes']]
      .map(([hash, label, ico]) => h('a', { class: 'stat', href: hash, style: { textDecoration: 'none', color: 'inherit' } },
        h('div', { class: 'row', style: { gap: '8px' } },
          h('span', { html: icon(ico), style: { color: 'var(--fg-3)' } }),
          h('span', { style: { fontWeight: 500 }, text: label }))))));

  function row(e, showDate) {
    return h('a', {
      class: 'item', href: e.hash,
      style: { display: 'block', textDecoration: 'none', color: 'inherit', borderLeft: `3px solid ${calColor(e.cal)}` },
    },
      h('div', { class: 'item-head' },
        h('span', { class: 'item-title', text: e.title, style: e.done ? { opacity: .5, textDecoration: 'line-through' } : {} }),
        showDate ? h('span', { class: 'tag mono', text: fmtDate(e.iso) }) : null,
        set.releaseDate ? h('span', { class: 'tag mono', text: tLabel(e.iso, set.releaseDate) }) : null),
      h('div', { class: 'item-meta' },
        h('span', { text: calName(e.cal) }),
        e.note ? h('span', { text: e.note }) : null,
        !showDate && e.iso < today ? h('span', { style: { color: 'var(--bad)' }, text: relativeDay(e.iso) }) : null));
  }

  return root;
}
