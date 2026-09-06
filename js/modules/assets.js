/* ============================================================
   assets.js — the asset inventory
   Counts against targets, specs, need-by dates, and where each
   one actually lives.
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, uid, btn, card, cardHead, empty, field, modal, subtabs, stat,
  fmtDate, resolveDate, tLabel, relativeDay, todayISO, confirmDelete, toast, download,
} from '../ui.js';
import { ASSETS_SEED, ASSET_CATEGORIES, ASSETS_INFO } from '../data/assets.js';
import { infoPanel, notesPanel, progressBar, scheduleRow, mediaBlock } from './shared.js';
import { barRows, withTable } from '../charts.js';
import { icon } from '../icons.js';

export function renderAssets(sub) {
  const root = h('div');
  const st = S.get('assets');
  const set = S.get('settings');
  st.items = st.items || [];

  const tabs = [['all', 'Everything'], ...ASSET_CATEGORIES.map(c => [c.key, c.label]),
    ['info', 'Info'], ['notes', 'Notes']];
  let tab = tabs.some(t => t[0] === sub) ? sub : 'all';

  const doneOf = (a) => Math.min(+a.done || 0, +a.target || 0);

  /* Keep the four tiles and the top bar honest without a full redraw,
     so the list does not jump while you are counting things off. */
  const refreshHeadline = () => {
    if (!headline) return;
    const t = totals();
    headline.madeTile.querySelector('.v').textContent = String(t.done);
    headline.pctTile.querySelector('.v').textContent = `${Math.round(t.pct)}%`;
    headline.linesTile.querySelector('.v').textContent =
      `${st.items.filter(isDone).length}/${st.items.length}`;
    clear(headline.topBar); headline.topBar.append(progressBar(t.pct));
  };
  const isDone = (a) => (+a.done || 0) >= (+a.target || 0) && (+a.target || 0) > 0;

  const totals = () => {
    const target = st.items.reduce((x, a) => x + (+a.target || 0), 0);
    const done = st.items.reduce((x, a) => x + doneOf(a), 0);
    return { target, done, pct: target ? done / target * 100 : 0 };
  };

  let headline = null;      // { made, pct, lines, bar } — updated in place by the steppers

  const draw = () => {
    clear(root);
    const t = totals();
    const overdue = st.items.filter(a => {
      const iso = resolveDate(a.needBy, set.releaseDate);
      return iso && iso < todayISO() && !isDone(a);
    });

    root.append(h('div', { class: 'page-head' },
      h('div', {},
        h('h1', { text: 'Assets' }),
        h('div', { class: 'sub', text: `${t.done} of ${t.target} pieces made` })),
      h('div', { class: 'spacer' }),
      h('div', { class: 'page-actions' },
        btn('Add asset', () => open(null), { cls: 'btn-primary btn-sm', icon: 'plus' }),
        st.items.length ? btn('Export CSV', exportCsv, { cls: 'btn-sm btn-ghost' }) : null)));

    const madeTile = stat('Made', String(t.done), `of ${t.target} the plan calls for`);
    const pctTile = stat('Complete', `${Math.round(t.pct)}%`, '');
    const linesTile = stat('Lines finished', `${st.items.filter(isDone).length}/${st.items.length}`, '');
    root.append(h('div', { class: 'grid g4' }, madeTile, pctTile, linesTile,
      stat('Past their date', String(overdue.length),
        overdue.length ? 'the shoot cannot be redone cheaply' : 'nothing behind')));

    const topBar = h('div', { style: { margin: '14px 0 4px' } }, progressBar(t.pct));
    root.append(topBar);
    headline = { madeTile, pctTile, linesTile, topBar };

    root.append(subtabs(tabs, tab, k => { tab = k; draw(); }));

    if (tab === 'info')  { root.append(infoPanel(ASSETS_INFO)); return; }
    if (tab === 'notes') { root.append(notesPanel(st, 'assets', 'Asset notes')); return; }

    if (overdue.length && tab === 'all') {
      root.append(card(
        cardHead('Past their need-by date', h('span', { class: 'tag warn', text: String(overdue.length) })),
        h('div', { class: 'list' }, overdue.map(row))));
    }

    const cats = tab === 'all' ? ASSET_CATEGORIES : ASSET_CATEGORIES.filter(c => c.key === tab);
    cats.forEach(c => {
      const items = st.items.filter(a => a.cat === c.key);
      if (!items.length) return;
      const ct = items.reduce((x, a) => x + (+a.target || 0), 0);
      const cd = items.reduce((x, a) => x + doneOf(a), 0);
      root.append(card(
        cardHead(c.label,
          h('span', { class: 'small mono muted', text: `${cd}/${ct}` })),
        h('p', { class: 'small muted', style: { marginTop: '-6px' }, text: c.note }),
        h('div', { style: { marginBottom: '12px' } }, progressBar(ct ? cd / ct * 100 : 0)),
        h('div', { class: 'list' }, items.map(row))));
    });

    if (tab === 'all' && st.items.length) {
      const data = ASSET_CATEGORIES.map(c => {
        const items = st.items.filter(a => a.cat === c.key);
        return { label: c.label, value: items.reduce((x, a) => x + doneOf(a), 0) };
      }).filter(d => d.value > 0);
      if (data.length) {
        root.append(card(cardHead('Where the work has gone'),
          withTable(barRows(data), ['Category', 'Pieces made'], data.map(d => [d.label, d.value]))));
      }
    }

    if (!st.items.length) {
      root.append(empty('Inventory is empty',
        'The plan\'s 30-line inventory seeds on first load — if you cleared it, add lines here.'));
    }
  };

  /* ---------- one line ---------- */

  function row(a) {
    const iso = resolveDate(a.needBy, set.releaseDate);
    const late = iso && iso < todayISO() && !isDone(a);
    const done = doneOf(a);
    const target = +a.target || 0;

    const count = h('span', { class: 'mono small', style: { minWidth: '44px', textAlign: 'center' } },
      `${done}/${target}`);
    const numInput = h('input', {
      value: done, inputmode: 'numeric',
      onClick: e => e.stopPropagation(),
      onInput: (e) => {
        a.done = Math.max(0, Math.min(target, parseInt(e.target.value, 10) || 0));
        S.touch('assets');
        count.textContent = `${doneOf(a)}/${target}`;
        clear(bar); bar.append(progressBar(target ? doneOf(a) / target * 100 : 0));
        wrap.style.borderColor = isDone(a) ? 'var(--ok)' : '';
        refreshHeadline();
      },
    });
    const bar = h('div', { style: { flex: 1, minWidth: '70px' } },
      progressBar(target ? done / target * 100 : 0));

    const bump = (n) => (e) => {
      e.stopPropagation();
      a.done = Math.max(0, Math.min(target, (+a.done || 0) + n));
      S.touch('assets');
      count.textContent = `${doneOf(a)}/${target}`;
      clear(bar); bar.append(progressBar(target ? doneOf(a) / target * 100 : 0));
      wrap.style.borderColor = isDone(a) ? 'var(--ok)' : '';
      numInput.value = doneOf(a);
      refreshHeadline();
    };

    const wrap = h('div', {
      class: 'item',
      style: { borderColor: isDone(a) ? 'var(--ok)' : '' },
      onClick: () => open(a),
    },
      h('div', { class: 'item-head' },
        h('span', { class: 'item-title', text: a.name }),
        a.needBy ? h('span', { class: 'tag mono', text: a.needBy }) : null,
        iso ? h('span', { class: `tag ${late ? 'bad' : ''}`, text: late ? `${fmtDate(iso)} — late` : fmtDate(iso) }) : null,
        isDone(a) ? h('span', { class: 'tag ok', text: 'done' }) : null),
      a.spec ? h('div', { class: 'item-body', text: a.spec }) : null,
      h('div', { class: 'row', style: { marginTop: '9px', gap: '9px' } },
        h('div', { class: 'step', onClick: e => e.stopPropagation() },
          h('button', { onClick: bump(-1), title: 'One fewer' }, '\u2212'),
          numInput,
          h('button', { onClick: bump(1), title: 'One more' }, '+')),
        count, bar,
        target > 1 ? h('button', {
          class: 'btn btn-sm btn-ghost',
          onClick: (e) => { e.stopPropagation(); a.done = target; S.touch('assets'); draw(); },
        }, 'All done') : null,
        a.where ? h('a', { class: 'btn btn-sm btn-ghost', href: a.where, target: '_blank', rel: 'noopener',
          onClick: e => e.stopPropagation() }, 'Open') : null));

    return wrap;
  }

  /* ---------- editor ---------- */

  function open(existing) {
    const isNew = !existing;
    const a = existing || { id: uid(), cat: tab === 'all' || tab === 'info' || tab === 'notes' ? 'short' : tab,
      name: '', target: 1, done: 0, spec: '', needBy: '', where: '', notes: '', media: [] };
    if (isNew) { st.items.push(a); S.touch('assets'); }

    modal({
      title: a.name || 'New asset', wide: true,
      body: h('div',
        field('Name', a, 'name', { slice: 'assets' }),
        h('div', { class: 'grid g3' },
          h('label', { class: 'field' }, h('span', { class: 'lab', text: 'Category' }),
            h('select', { class: 'inp', onChange: e => { a.cat = e.target.value; S.touch('assets'); } },
              ASSET_CATEGORIES.map(c => h('option', { value: c.key, selected: c.key === a.cat }, c.label)))),
          field('Target count', a, 'target', { slice: 'assets', type: 'number' }),
          field('Made so far', a, 'done', { slice: 'assets', type: 'number' })),
        scheduleRow(a, 'assets', () => {}, { key: 'needBy', label: 'Needed by' }),
        field('Spec', a, 'spec', { slice: 'assets', multiline: true,
          placeholder: 'Dimensions, length, format, the rule that matters' }),
        field('Where it lives', a, 'where', { slice: 'assets', placeholder: 'https:// — Drive folder, or a path' }),
        field('Notes', a, 'notes', { slice: 'assets', multiline: true }),
        h('label', { class: 'field' }, h('span', { class: 'lab', text: 'Reference / proof' }),
          mediaBlock(a, 'assets', 'assets'))),
      actions: [
        { label: 'Delete', cls: 'btn-danger btn-ghost', onClick: () => {
          st.items.splice(st.items.indexOf(a), 1); S.touch('assets'); draw(); } },
        'spacer',
        { label: 'Done', cls: 'btn-primary', onClick: draw },
      ],
      onClose: draw,
    });
  }

  function exportCsv() {
    const cols = ['cat', 'name', 'target', 'done', 'needBy', 'spec', 'where', 'notes'];
    const csv = [cols, ...st.items.map(a => cols.map(k => a[k] ?? ''))]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    download('sid-assets.csv', csv, 'text/csv');
  }

  draw();
  return root;
}
