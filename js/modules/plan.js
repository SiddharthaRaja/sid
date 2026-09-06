/* ============================================================
   plan.js — the master plan, with milestone checkboxes
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, uid, btn, card, cardHead, empty, field, modal, subtabs, checkbox,
  fmtDate, tLabel, resolveDate, relativeDay, todayISO, confirmDelete, selectField, toast,
} from '../ui.js';
import { SEED_MILESTONES, CATEGORIES, ATTACK_ORDER } from '../data/masterplan.js';
import { progressBar, scheduleRow } from './shared.js';
import { icon } from '../icons.js';

export function renderPlan(sub) {
  const root = h('div');
  const plan = S.get('plan');
  const set = S.get('settings');

  if (!plan.milestones) {
    plan.milestones = SEED_MILESTONES.map(m => ({ ...m }));
    S.touch('plan');
  }

  let tab = ['timeline', 'category', 'twelve'].includes(sub) ? sub : 'timeline';
  let showDone = true;

  const all = () => [...plan.milestones, ...(plan.custom || [])];

  const draw = () => {
    clear(root);
    const items = all();
    const done = items.filter(m => m.done).length;

    root.append(h('div', { class: 'page-head' },
      h('div', {},
        h('h1', { text: 'Master plan' }),
        h('div', { class: 'sub', text: set.releaseDate
          ? `Release ${fmtDate(set.releaseDate, { long: true })} · ${relativeDay(set.releaseDate)}`
          : 'Set a release date in Settings and every milestone below gets a real date.' })),
      h('div', { class: 'spacer' }),
      h('div', { class: 'page-actions' },
        btn('Add milestone', () => openMilestone(null, draw), { cls: 'btn-primary btn-sm', icon: 'plus' }),
        btn(showDone ? 'Hide done' : 'Show done', () => { showDone = !showDone; draw(); }, { cls: 'btn-sm' }))));

    root.append(card(
      h('div', { class: 'row' },
        h('div', { style: { flex: 1 } }, progressBar(items.length ? done / items.length * 100 : 0)),
        h('span', { class: 'mono small muted', text: `${done} / ${items.length}` })),
      h('div', { class: 'grid g4', style: { marginTop: '14px' } },
        CATEGORIES.map(([c, name]) => {
          const inCat = items.filter(m => m.cat === c);
          if (!inCat.length) return null;
          const d = inCat.filter(m => m.done).length;
          return h('div', {},
            h('div', { class: 'small muted', style: { marginBottom: '4px' } }, `${name} · ${d}/${inCat.length}`),
            progressBar(d / inCat.length * 100));
        }))));

    root.append(subtabs(
      [['timeline', 'Timeline'], ['category', 'By category'], ['twelve', 'If you only do twelve things']],
      tab, (k) => { tab = k; draw(); }));

    if (tab === 'twelve') { root.append(twelve()); return; }
    if (tab === 'category') { root.append(byCategory(items, draw, showDone)); return; }
    root.append(byTimeline(items, draw, showDone));
  };

  /* ---------- views ---------- */

  const phaseOf = (when) => {
    const m = String(when).match(/^T\s*([+-]\s*\d+)?$/i);
    const n = m ? (m[1] ? parseInt(m[1].replace(/\s/g, ''), 10) : 0) : null;
    if (n === null) return 'Dated';
    if (n <= -61) return 'T-90 → T-61 · Build in the dark';
    if (n <= -31) return 'T-60 → T-31 · Foundations & first signal';
    if (n <= -15) return 'T-30 → T-15 · The announcement';
    if (n <= -1)  return 'T-14 → T-1 · The countdown';
    if (n <= 6)   return 'T → T+6 · Release week';
    if (n <= 28)  return 'T+7 → T+28 · India phase';
    if (n <= 56)  return 'T+29 → T+56 · Diaspora phase';
    if (n <= 84)  return 'T+57 → T+84 · Western crossover';
    return 'T+85 onward · Sustain & pivot';
  };

  function byTimeline(items, redraw, showDone) {
    const box = h('div');
    const sorted = items.slice().sort((a, b) => sortKey(a) - sortKey(b));
    let phase = null;
    sorted.forEach(m => {
      if (!showDone && m.done) return;
      const p = phaseOf(m.when);
      if (p !== phase) { phase = p; box.append(h('div', { class: 'nav-sect', style: { padding: '20px 0 6px' }, text: p })); }
      box.append(milestoneRow(m, redraw));
    });
    if (!box.children.length) box.append(empty('Nothing left', 'Everything in the plan is ticked off.'));
    return box;
  }

  function byCategory(items, redraw, showDone) {
    const box = h('div');
    CATEGORIES.forEach(([c, name]) => {
      const inCat = items.filter(m => m.cat === c && (showDone || !m.done))
        .sort((a, b) => sortKey(a) - sortKey(b));
      if (!inCat.length) return;
      box.append(card(cardHead(`${c} — ${name}`,
        h('span', { class: 'small muted mono', text: `${items.filter(m => m.cat === c && m.done).length}/${items.filter(m => m.cat === c).length}` })),
        h('div', {}, inCat.map(m => milestoneRow(m, redraw, true)))));
    });
    return box;
  }

  function twelve() {
    return card(
      cardHead('The version that still works if you are overwhelmed'),
      h('ol', { class: 'prose', style: { paddingLeft: '20px' } },
        ATTACK_ORDER.map(t => h('li', { text: t, style: { marginBottom: '7px' } }))));
  }

  function sortKey(m) {
    const s = String(m.when || '');
    const t = s.match(/^T\s*([+-]\s*\d+)?$/i);
    if (t) return t[1] ? parseInt(t[1].replace(/\s/g, ''), 10) : 0;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s) && set.releaseDate) {
      return Math.round((new Date(s) - new Date(set.releaseDate)) / 86400000);
    }
    return 9999;
  }

  function milestoneRow(m, redraw, compact) {
    const iso = resolveDate(m.when, set.releaseDate);
    const row = h('div', { class: 'check' + (m.done ? ' done' : ''), style: { alignItems: 'flex-start' } });
    row.append(h('input', {
      type: 'checkbox', checked: !!m.done,
      onChange: (e) => {
        m.done = e.target.checked;
        // stamp when it was finished, so the weekly review can count it
        if (m.done) m.doneAt = todayISO(); else delete m.doneAt;
        S.touch('plan'); redraw();
      },
    }));
    row.append(h('div', { style: { flex: 1, minWidth: 0 } },
      h('div', { class: 'row', style: { gap: '8px' } },
        h('span', { text: m.title, style: { fontWeight: /HARD DEADLINE|^[A-Z ]{6,}$/.test(m.note + m.title) ? 600 : 400 } }),
        h('span', { class: 'tag mono', text: m.when }),
        iso ? h('span', { class: 'small muted', text: fmtDate(iso) }) : null,
        h('button', { class: 'icon-btn', style: { marginLeft: 'auto', width: '24px', height: '24px' },
          title: 'Edit', html: '⋯', onClick: () => openMilestone(m, redraw) })),
      m.note ? h('div', { class: 'small muted', style: { marginTop: '3px' } }, m.note) : null));
    return h('div', { style: compact ? {} : { borderBottom: '1px solid var(--line-soft)', padding: '2px 0' } }, row);
  }

  /* ---------- editor ---------- */

  function openMilestone(existing, redraw) {
    const isNew = !existing;
    const m = existing || { id: uid(), cat: 'I', title: '', when: 'T-30', note: '', done: false };
    if (isNew) { plan.custom = plan.custom || []; plan.custom.push(m); S.touch('plan'); }

    modal({
      title: isNew ? 'New milestone' : 'Edit milestone',
      body: h('div',
        field('Title', m, 'title', { slice: 'plan' }),
        selectField('Category', m, 'cat', CATEGORIES.map(([c, n]) => [c, `${c} — ${n}`]), { slice: 'plan' }),
        scheduleRow(m, 'plan'),
        field('Note', m, 'note', { slice: 'plan', multiline: true })),
      actions: [
        { label: 'Delete', cls: 'btn-danger btn-ghost', onClick: () => {
          const inCustom = (plan.custom || []).indexOf(m);
          if (inCustom > -1) plan.custom.splice(inCustom, 1);
          else plan.milestones.splice(plan.milestones.indexOf(m), 1);
          S.touch('plan'); redraw();
        } },
        'spacer',
        { label: 'Done', cls: 'btn-primary', onClick: redraw },
      ],
      onClose: redraw,
    });
  }

  draw();
  return root;
}
