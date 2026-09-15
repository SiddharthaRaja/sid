/* ============================================================
   dashboard.js — "Today": the one screen that tells you what to do

   Two shapes, because the app has two modes:
     • planning   — no release date, so no "today". You get the
                    shape of the plan on the T-axis instead.
     • execution  — a real date, so: overdue, due today, ahead.
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, btn, card, cardHead, empty, stat, fmtNum, fmtDate, tLabel, relativeDay,
  todayISO, addDays, daysBetween, resolveDate,
} from '../ui.js';
import { collectEvents, collectPlanned, calColor, calName } from '../agenda.js';
import { PLATFORMS } from '../data/platforms.js';
import { icon, PCOLORS } from '../icons.js';
import { progressBar } from './shared.js';
import { sparkline } from '../charts.js';
import { pitchWarning } from './pitch.js';
import { modeBanner, planningTimeline } from './timeline.js';
import { renderQueue } from './queue.js';
import { PHASES, phaseOfOffset } from '../phases.js';
import { lintSummary } from '../lint.js';
import { runsheetCard } from './runsheet.js';

export function renderDashboard(sub, opts = {}) {
  const root = h('div');
  const set = S.get('settings');
  const plan = S.get('plan');
  const today = todayISO();
  const planning = set.mode === 'planning';
  const merged = !!opts.merged;

  const events = collectEvents();

  const allMs = [...(plan.milestones || []), ...(plan.custom || [])];
  const msDone = allMs.filter(m => m.done).length;

  const banked = PLATFORMS.reduce((a, p) => {
    const sl = S.get(`p_${p.key}`);
    return a + Object.values(sl.content || {}).reduce((x, arr) => x + (arr || []).length, 0);
  }, 0);

  /* ---------- header ---------- */
  root.append(h('div', { class: 'page-head' },
    h('div', {},
      h('h1', { text: set.artist || 'Sid' }),
      h('div', { class: 'sub', text: (() => {
        const bits = [];
        if (set.song) bits.push(`"${set.song}"`);
        if (planning) bits.push('planning mode — no release date yet');
        else if (set.releaseDate) bits.push(`${fmtDate(set.releaseDate, { long: true })} · ${relativeDay(set.releaseDate)}`);
        else bits.push('no release date set');
        return bits.join(' — ');
      })() })),
    h('div', { class: 'spacer' })));

  const mb = modeBanner('today');
  if (mb) root.append(mb);

  /* in the 72 hours around release, the run sheet outranks everything */
  const rc = runsheetCard();
  if (rc) root.append(rc);

  if (merged) root.append(dailyThree());

  /* ---------- planning mode ---------- */
  if (planning) {
    const planned = collectPlanned();
    const dated = planned.filter(i => i.off !== null);
    root.append(h('div', { class: 'grid g3' },
      stat('Plan progress', `${msDone}/${allMs.length}`, `${allMs.length ? Math.round(msDone / allMs.length * 100) : 0}% ticked`),
      stat('Content banked', String(banked), `${planned.filter(i => i.kind === 'content' && i.off !== null).length} placed on the T-axis`),
      stat('Span', dated.length ? `${Math.min(...dated.map(d => d.off))} → +${Math.max(...dated.map(d => d.off))}` : '—', 'days around release')));

    root.append(h('div', { style: { margin: '14px 0 4px' } }, progressBar(allMs.length ? msDone / allMs.length * 100 : 0)));
    root.append(planningTimeline({ limit: 6, collapsedEmpty: true }));
    root.append(platformPulse());
    root.append(...jumpTo());
    return root;
  }

  /* ---------- execution mode ---------- */

  /* When this page is the merged "Today", the post queue below owns
     every content item, so the event lists here drop them rather
     than listing the same post twice. */
  const notContent = (e) => !merged || e.kind !== 'content';

  const overdue = events.filter(e => e.iso < today && !e.done && e.kind !== 'content' && e.kind !== 'release');
  const todayEv = events.filter(e => e.iso === today).filter(notContent);
  const soon = events.filter(e => e.iso > today && e.iso <= addDays(today, 14)).filter(notContent);
  const scheduled = events.filter(e => e.kind === 'content').length;

  const pw = pitchWarning();
  if (pw) root.append(pw);

  if (set.releaseDate) {
    const n = daysBetween(today, set.releaseDate);
    root.append(h('div', { class: 'grid g4' },
      stat(n > 0 ? 'Days to release' : n === 0 ? 'Release day' : 'Days since release',
        n === 0 ? 'TODAY' : String(Math.abs(n)), `T${n === 0 ? '' : n > 0 ? '-' + n : '+' + -n}`),
      stat('Plan progress', `${msDone}/${allMs.length}`, `${allMs.length ? Math.round(msDone / allMs.length * 100) : 0}% complete`),
      stat('Content banked', String(banked), `${scheduled} of them dated`),
      stat('This fortnight', String(soon.length + todayEv.length), 'things scheduled')));
  } else {
    root.append(card(cardHead('No release date'),
      h('p', { class: 'small muted' }, 'This copy is in execution mode but has no date, so nothing relative resolves. Set one, or switch back to planning.'),
      h('a', { class: 'btn btn-sm btn-primary', href: '#/release', text: 'Open the release tab' })));
  }

  root.append(h('div', { style: { margin: '14px 0 4px' } }, progressBar(allMs.length ? msDone / allMs.length * 100 : 0)));

  if (overdue.length) {
    root.append(card(
      cardHead('Overdue', h('span', { class: 'tag bad', text: String(overdue.length) })),
      h('div', { class: 'list' }, overdue.slice(-8).reverse().map(e => row(e)))));
  }

  /* the posts themselves, with copy / mark-posted on the row */
  if (merged) root.append(renderQueue(null, { embed: true }));

  root.append(card(
    cardHead(`${merged ? 'Also today' : 'Today'} — ${fmtDate(today, { long: true })}`),
    todayEv.length
      ? h('div', { class: 'list' }, todayEv.map(e => row(e)))
      : h('div', { class: 'small muted', text: merged ? 'No milestones or deadlines today.' : 'Nothing scheduled. A good day to bank three clips.' })));

  root.append(card(
    cardHead('Next 14 days', h('a', { href: '#/calendar', class: 'small', text: 'open calendar' })),
    soon.length
      ? h('div', { class: 'list' }, soon.slice(0, 14).map(e => row(e, true)))
      : h('div', { class: 'small muted', text: 'Nothing ahead. Open the master plan and date the next few milestones.' })));

  root.append(platformPulse());
  root.append(...jumpTo());

  /* ---------- pieces ---------- */

  /* Seventy-four overdue items is not a to-do list, it is a reason to
     close the app. Three is a to-do list. Ranked by what cannot be
     recovered if it slips, then by what unblocks the most. */
  function dailyThree() {
    const picks = [];

    /* Planning mode has no "today", so the useful three are simply
       the earliest things still untouched on the T-axis. */
    if (planning) {
      collectPlanned()
        .filter(i => i.off !== null && !i.done && i.kind !== 'release')
        .slice(0, 3)
        .forEach(i => picks.push({
          title: i.title,
          why: `${phaseOfOffset(i.off).label} · ${i.off === 0 ? 'T' : i.off > 0 ? `T+${i.off}` : `T${i.off}`}`,
          hash: i.hash,
        }));
      if (!picks.length) return h('div');
      return card(
        cardHead('Start here'),
        h('div', { class: 'list' }, picks.map((p, i) => h('a', {
          class: 'item', href: p.hash,
          style: { display: 'block', textDecoration: 'none', color: 'inherit' } },
          h('div', { class: 'item-head' },
            h('span', { class: 'three-n mono', text: String(i + 1) }),
            h('span', { class: 'item-title', text: p.title })),
          h('div', { class: 'item-meta' }, h('span', { text: p.why }))))));
    }

    if (set.releaseDate) {
      const n = daysBetween(today, set.releaseDate);
      const pitched = S.get('pitch').submittedAt;
      if (!pitched && n > 0 && n <= 21) {
        picks.push({ title: 'Submit the Spotify editorial pitch', why: n <= 7
          ? `Only ${n} day${n === 1 ? '' : 's'} left — after the cut-off it cannot be done at all.`
          : 'The one deadline in this whole plan that cannot be recovered.', hash: '#/p/spotify/epitch' });
      }
    }

    /* anything overdue that is a real deadline, oldest first */
    const hard = events.filter(e => e.iso < today && !e.done && ['deadline', 'milestone'].includes(e.kind));
    hard.slice(0, 2).forEach(e => picks.push({
      title: e.title, why: `${calName(e.cal)} · due ${relativeDay(e.iso)}`, hash: e.hash }));

    /* posts due today that are not ready to go */
    const notReady = [];
    PLATFORMS.forEach(p => {
      const sl = S.get(`p_${p.key}`);
      Object.entries(sl.content || {}).forEach(([tk, items]) => (items || []).forEach(it => {
        const iso = resolveDate(it.when, set.releaseDate);
        if (iso === today && !['posted', 'parked'].includes(it.status)) {
          const type = p.types.find(t => t.key === tk) || { key: tk, label: tk, limit: 0 };
          const sum = lintSummary(it.body, { platform: p.key, type: tk, limit: type.limit });
          notReady.push({ title: `${p.name}: ${it.title || type.label}`,
            why: sum.level === 'ok' ? 'due today, ready to go' : `due today — ${sum.text}`,
            hash: `#/p/${p.key}/${tk}` });
        }
      }));
    });
    notReady.slice(0, 2).forEach(x => picks.push(x));

    /* nothing pressing: the next unticked milestone */
    if (picks.length < 3) {
      const next = events.find(e => e.iso >= today && !e.done && e.kind === 'milestone');
      if (next) picks.push({ title: next.title, why: `next up · ${relativeDay(next.iso)}`, hash: next.hash });
    }
    if (!picks.length) return h('div');

    return card(
      cardHead('If you only do three things today'),
      h('div', { class: 'list' }, picks.slice(0, 3).map((p, i) => h('a', {
        class: 'item', href: p.hash,
        style: { display: 'block', textDecoration: 'none', color: 'inherit' } },
        h('div', { class: 'item-head' },
          h('span', { class: 'three-n mono', text: String(i + 1) }),
          h('span', { class: 'item-title', text: p.title })),
        h('div', { class: 'item-meta' }, h('span', { text: p.why }))))));
  }

  function platformPulse() {
    const box = h('div');
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
    if (!pulse.children.length) return box;
    box.append(h('div', { class: 'card-head', style: { marginTop: '20px' } }, h('h3', { text: 'Platforms' })));
    box.append(pulse);
    return box;
  }

  /* the phone has a tab bar and a More sheet — a grid of shortcuts
     is desktop-only convenience and phone-only clutter */
  function jumpTo() {
    return [
      h('div', { class: 'card-head only-desktop', style: { marginTop: '20px' } }, h('h3', { text: 'Jump to' })),
      h('div', { class: 'grid g4 only-desktop' },
        [['#/release', 'Release', 'settings'], ['#/calendar', 'Calendar', 'calendar'],
         ['#/plan', 'Master plan', 'masterplan'], ['#/copy', 'Copy bank', 'copy'],
         ['#/write', 'Writing desk', 'copy'], ['#/seo', 'Discovery', 'stats'],
         ['#/contacts', 'Contacts', 'contacts'], ['#/assets', 'Assets', 'assets']]
          .map(([hash, label, ico]) => h('a', { class: 'stat', href: hash, style: { textDecoration: 'none', color: 'inherit' } },
            h('div', { class: 'row', style: { gap: '8px' } },
              h('span', { html: icon(ico), style: { color: 'var(--fg-3)' } }),
              h('span', { style: { fontWeight: 500 }, text: label }))))),
    ];
  }

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
