/* ============================================================
   stats.js — per-platform panel + the global Statistics module
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, uid, btn, card, cardHead, empty, field, modal, stat, fmtNum,
  todayISO, fmtDate, confirmDelete, subtabs, selectField, toast, download,
} from '../ui.js';
import { PLATFORMS, PLATFORM_MAP } from '../data/platforms.js';
import { PCOLORS, icon } from '../icons.js';
import { barRows, lineChart, sparkline, withTable, tableView, seriesColor, legend } from '../charts.js';
import { notesPanel } from './shared.js';

/* ---------------------------------------------------------- */
/*  shared shapes                                              */
/* ---------------------------------------------------------- */

const AGES = ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
const GENDERS = ['Women', 'Men', 'Other / undisclosed'];
const SOURCES = ['Home / feed', 'Search', 'Playlists', 'Artist profile', 'External / links', 'Radio & algorithmic', 'Library'];

const newEntry = () => ({
  id: uid(), date: todayISO(), m: {},
  age: {}, gender: {}, countries: [], cities: [], sources: {},
  note: '',
});

/* ---------------------------------------------------------- */
/*  per-platform panel (used inside a platform tab)            */
/* ---------------------------------------------------------- */

export function statsPanel(p, store, slice) {
  const root = h('div');
  store.stats = store.stats || [];

  const draw = () => {
    clear(root);
    const entries = store.stats.slice().sort((a, b) => a.date.localeCompare(b.date));
    const latest = entries[entries.length - 1];
    const prev = entries[entries.length - 2];

    root.append(h('div', { class: 'row', style: { marginBottom: '14px' } },
      btn('Log a snapshot', () => openEntry(p, store, slice, null, draw), { cls: 'btn-primary btn-sm', icon: 'plus' }),
      btn('Import CSV', () => importCsv(p, store, slice, draw), { cls: 'btn-sm', icon: 'upload' }),
      entries.length ? btn('Export CSV', () => exportCsv(p, entries), { cls: 'btn-sm btn-ghost' }) : null,
      h('div', { style: { flex: 1 } }),
      h('span', { class: 'small muted', text: entries.length ? `${entries.length} snapshot${entries.length > 1 ? 's' : ''} · latest ${fmtDate(latest.date, { long: true })}` : '' })));

    if (!entries.length) {
      root.append(empty('No numbers logged yet',
        `Log a snapshot every Monday, or paste a CSV export straight from ${p.name}. Two entries is all it takes before the trends become useful.`));
      return;
    }

    /* nudge if it has been a while */
    const stale = Math.round((new Date(todayISO()) - new Date(latest.date)) / 86400000);
    if (stale >= 7) {
      root.append(card(h('div', { class: 'row' },
        h('span', { html: icon('clock'), style: { color: 'var(--warn)' } }),
        h('div', { style: { flex: 1 } },
          h('div', { style: { fontWeight: 500 }, text: `Last logged ${stale} days ago` }),
          h('div', { class: 'small muted', text: 'Weekly is the cadence that makes these charts worth reading.' })),
        btn('Log now', () => openEntry(p, store, slice, null, draw), { cls: 'btn-sm btn-primary' }))));
    }

    /* headline tiles */
    const tiles = h('div', { class: 'grid g4' });
    p.metrics.forEach(mname => {
      const v = latest.m[mname];
      if (v == null || v === '') return;
      const pv = prev?.m?.[mname];
      const delta = (pv != null && pv !== '' && +pv !== 0) ? ((+v - +pv) / +pv * 100) : null;
      tiles.append(h('div', { class: 'stat' },
        h('div', { class: 'k', text: mname }),
        h('div', { class: 'v tabular', text: fmtNum(v) }),
        h('div', { class: 'd', style: delta != null ? { color: delta >= 0 ? 'var(--st-good)' : 'var(--st-crit)' } : {},
          text: delta != null ? `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}% since last` : 'first entry' })));
    });
    if (tiles.children.length) root.append(tiles);

    /* derived rates */
    const rates = derivedRates(p, latest, prev);
    if (rates.length) {
      root.append(card(cardHead('Rates', h('span', { class: 'small muted', text: 'the numbers that tell you whether it is working' })),
        h('div', { class: 'grid g3' }, rates.map(r =>
          h('div', { class: 'stat' },
            h('div', { class: 'k', text: r.k }),
            h('div', { class: 'v tabular', text: r.v }),
            h('div', { class: 'd', text: r.d }))))));
    }

    /* trend — with a metric picker */
    const available = p.metrics.filter(m => entries.some(e => e.m[m] != null && e.m[m] !== ''));
    if (available.length) {
      store.chartMetrics = (store.chartMetrics || []).filter(m => available.includes(m));
      if (!store.chartMetrics.length) store.chartMetrics = available.slice(0, 3);
      const chosen = store.chartMetrics;

      const picker = h('div', { class: 'row', style: { marginBottom: '12px' } },
        available.map((m, i) => h('button', {
          class: `chip ${chosen.includes(m) ? 'on' : ''}`,
          onClick: () => {
            const at = chosen.indexOf(m);
            if (at > -1) { if (chosen.length > 1) chosen.splice(at, 1); }
            else if (chosen.length < 8) chosen.push(m);
            S.touch(slice); draw();
          },
        }, h('span', { class: 'dot', style: { background: seriesColor(chosen.indexOf(m)) } }), m)));

      const series = chosen.map(mname => ({
        name: mname,
        points: entries.filter(e => e.m[mname] != null && e.m[mname] !== '').map(e => ({ x: e.date, y: +e.m[mname] })),
      }));

      root.append(card(
        cardHead('Growth over time', h('span', { class: 'small muted', text: 'one y-axis — pick metrics of a similar scale, or use Compare' })),
        picker,
        withTable(
          lineChart(series, { height: 230 }),
          ['Date', ...chosen],
          entries.map(e => [e.date, ...chosen.map(m => e.m[m] ?? '—')]))));
    }

    /* demographics */
    root.append(demographics(latest));

    /* history */
    root.append(card(
      cardHead('All snapshots'),
      h('div', { class: 'list' }, entries.slice().reverse().map(e =>
        h('div', { class: 'item', onClick: () => openEntry(p, store, slice, e, draw) },
          h('div', { class: 'item-head' },
            h('span', { class: 'item-title', text: fmtDate(e.date, { long: true }) }),
            h('span', { class: 'small muted tabular', text: p.metrics.map(m => e.m[m] != null && e.m[m] !== '' ? `${m} ${fmtNum(e.m[m])}` : null).filter(Boolean).slice(0, 3).join(' · ') })),
          e.note ? h('div', { class: 'item-meta' }, h('span', { text: e.note })) : null)))));
  };

  draw();
  return root;
}

/* ---------------------------------------------------------- */
/*  derived rates                                              */
/* ---------------------------------------------------------- */

/* Ratios that mean something, computed only where both inputs exist.
   A rate is worth more than a raw count: 1,000 streams with a 12%
   save rate behaves very differently from 1,000 with 1%. */
const RATE_DEFS = [
  { k: 'Save rate',        num: 'Saves',          den: 'Streams',        d: 'saves per stream · 8%+ is strong' },
  { k: 'Save rate',        num: 'Saves',          den: 'Reach',          d: 'saves per person reached' },
  { k: 'Listener → follow',num: 'Followers',      den: 'Monthly listeners', d: 'how many stay' },
  { k: 'Streams / listener',num: 'Streams',       den: 'Listeners',      d: 'repeat listening · above 2 is real' },
  { k: 'Profile → link',   num: 'Link clicks',    den: 'Profile visits', d: 'how well the bio converts' },
  { k: 'Reach → profile',  num: 'Profile visits', den: 'Reach',          d: 'how well the content converts' },
  { k: 'Engagement',       num: 'Likes',          den: 'Views',          d: 'likes per view' },
  { k: 'Share rate',       num: 'Shares',         den: 'Reach',          d: 'the number that drives reach' },
  { k: 'Sound adoption',   num: 'Sound uses',     den: 'Views',          d: 'the win condition on TikTok' },
];

function derivedRates(p, latest, prev) {
  const out = [];
  const val = (e, k) => { const v = e?.m?.[k]; return (v == null || v === '') ? null : +v; };

  RATE_DEFS.forEach(def => {
    if (!p.metrics.includes(def.num) || !p.metrics.includes(def.den)) return;
    const n = val(latest, def.num), d = val(latest, def.den);
    if (n == null || d == null || !d) return;
    const now = n / d;
    const pn = val(prev, def.num), pd = val(prev, def.den);
    const before = (pn != null && pd) ? pn / pd : null;
    const asPct = now <= 1.5;
    const shown = asPct ? `${(now * 100).toFixed(1)}%` : now.toFixed(2);
    let delta = def.d;
    if (before != null && before !== 0) {
      const ch = (now - before) / before * 100;
      delta = `${ch >= 0 ? '+' : ''}${ch.toFixed(0)}% vs last · ${def.d}`;
    }
    out.push({ k: def.k, v: shown, d: delta });
  });
  return out;
}

/* ---------------------------------------------------------- */
/*  CSV import                                                 */
/* ---------------------------------------------------------- */

function parseDelimited(text) {
  const raw = text.trim();
  if (!raw) return [];
  const delim = (raw.split('\n')[0].match(/\t/g) || []).length >= 1 ? '\t' : ',';
  return raw.split(/\r?\n/).map(line => {
    // handle simple quoted fields
    const cells = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
      else if (ch === delim && !q) { cells.push(cur); cur = ''; }
      else cur += ch;
    }
    cells.push(cur);
    return cells.map(c => c.trim());
  });
}

const DATE_RX = /^(\d{4}-\d{2}-\d{2})/;

function importCsv(p, store, slice, redraw) {
  const ta = h('textarea', { class: 'inp', style: { minHeight: '160px', fontFamily: 'var(--mono)', fontSize: '12px' },
    placeholder: 'Paste the CSV or TSV. Copy straight out of the file, or out of a spreadsheet.\n\ndate,streams,listeners,saves\n2026-11-13,412,318,29' });
  const out = h('div', { style: { marginTop: '14px' } });

  const analyse = () => {
    clear(out);
    const rows = parseDelimited(ta.value);
    if (rows.length < 2) { out.append(h('p', { class: 'small muted', text: 'Paste at least a header row and one data row.' })); return; }

    const header = rows[0];
    const body = rows.slice(1).filter(r => r.some(c => c !== ''));
    const looksNumeric = (i) => body.filter(r => r[i] !== '' && isFinite(+String(r[i]).replace(/[,%]/g, ''))).length > body.length / 2;
    const dateCol = header.findIndex((hh, i) => DATE_RX.test(body[0]?.[i] || '') || /date|day|week/i.test(hh));

    /* two shapes: a time series (has a date column) or a breakdown (label,value) */
    const isSeries = dateCol > -1;

    out.append(h('div', { class: 'row', style: { marginBottom: '10px' } },
      h('span', { class: 'tag ok', text: `${body.length} rows` }),
      h('span', { class: 'tag', text: isSeries ? 'time series' : 'breakdown (label + value)' })));

    if (isSeries) {
      /* map each numeric column onto one of this platform's metrics */
      const maps = header.map((hh, i) => {
        if (i === dateCol || !looksNumeric(i)) return null;
        const guess = p.metrics.find(m => m.toLowerCase().replace(/[^a-z]/g, '')
          === hh.toLowerCase().replace(/[^a-z]/g, ''))
          || p.metrics.find(m => hh.toLowerCase().includes(m.toLowerCase().split(' ')[0]));
        const sel = h('select', { class: 'inp' },
          h('option', { value: '' }, '— skip —'),
          p.metrics.map(m => h('option', { value: m, selected: m === guess }, m)));
        return { i, header: hh, sel };
      }).filter(Boolean);

      if (!maps.length) { out.append(h('p', { class: 'small', style: { color: 'var(--bad)' }, text: 'No numeric columns found.' })); return; }

      out.append(h('div', { class: 'lab', style: { marginBottom: '6px' } }, 'Map the columns'));
      out.append(h('div', { class: 'grid g2' }, maps.map(m =>
        h('label', { class: 'field', style: { margin: 0 } },
          h('span', { class: 'lab', text: `"${m.header}" →` }), m.sel))));

      out.append(h('div', { style: { marginTop: '14px' } },
        btn('Import as snapshots', () => {
          let n = 0, merged = 0;
          body.forEach(r => {
            const d = (String(r[dateCol]).match(DATE_RX) || [])[1] || toISOish(r[dateCol]);
            if (!d) return;
            let entry = store.stats.find(e => e.date === d);
            if (!entry) { entry = newEntry(); entry.date = d; store.stats.push(entry); n++; }
            else merged++;
            maps.forEach(m => {
              const target = m.sel.value;
              if (!target) return;
              const v = +String(r[m.i]).replace(/[,%\s]/g, '');
              if (isFinite(v)) entry.m[target] = v;
            });
          });
          S.touch(slice);
          toast(`${n} new, ${merged} updated`);
          redraw();
          document.querySelector('#modal-root').hidden = true;
          clear(document.querySelector('#modal-root'));
        }, { cls: 'btn-primary' })));

    } else {
      /* breakdown: pick which dimension, and which two columns */
      const labelCol = header.findIndex((hh, i) => !looksNumeric(i));
      const valueCol = header.findIndex((hh, i) => looksNumeric(i));
      if (labelCol < 0 || valueCol < 0) {
        out.append(h('p', { class: 'small', style: { color: 'var(--bad)' }, text: 'Need one text column and one numeric column.' }));
        return;
      }
      const dimSel = h('select', { class: 'inp' },
        [['countries', 'Top countries'], ['cities', 'Top cities'], ['age', 'Age bands'], ['gender', 'Gender'], ['sources', 'Traffic sources']]
          .map(([v, l]) => h('option', { value: v }, l)));
      /* Attach it to the most recent snapshot, so demographics land on
         the entry the page is actually showing. */
      const latestDate = store.stats.length
        ? store.stats.slice().sort((a, b) => a.date.localeCompare(b.date)).slice(-1)[0].date
        : todayISO();
      const dateInp = h('input', { class: 'inp', type: 'date', value: latestDate });

      out.append(h('div', { class: 'grid g2' },
        h('label', { class: 'field' }, h('span', { class: 'lab', text: 'These rows are' }), dimSel),
        h('label', { class: 'field' }, h('span', { class: 'lab', text: 'Add to the snapshot dated' }), dateInp)));
      out.append(h('p', { class: 'small muted',
        text: `Reading "${header[labelCol]}" as the label and "${header[valueCol]}" as the value.` }));

      out.append(btn('Import breakdown', () => {
        const d = dateInp.value || todayISO();
        let entry = store.stats.find(e => e.date === d);
        if (!entry) { entry = newEntry(); entry.date = d; store.stats.push(entry); }
        const dim = dimSel.value;
        const pairs = body.map(r => ({ n: r[labelCol], v: +String(r[valueCol]).replace(/[,%\s]/g, '') }))
          .filter(x => x.n && isFinite(x.v));
        if (dim === 'countries' || dim === 'cities') entry[dim] = pairs;
        else { entry[dim] = entry[dim] || {}; pairs.forEach(x => { entry[dim][x.n] = x.v; }); }
        S.touch(slice);
        toast(`${pairs.length} rows imported`);
        redraw();
        document.querySelector('#modal-root').hidden = true;
        clear(document.querySelector('#modal-root'));
      }, { cls: 'btn-primary' }));
    }
  };

  ta.addEventListener('input', () => { clearTimeout(ta._t); ta._t = setTimeout(analyse, 250); });

  modal({
    title: `Import ${p.name} data`, wide: true,
    body: h('div',
      h('p', { class: 'small muted' },
        'Two shapes work. A time series with a date column becomes one snapshot per date. A two-column breakdown (country and streams, age and share) is added to a single snapshot. Existing snapshots on the same date are updated, not duplicated.'),
      ta, out),
  });
}

/* Best-effort date parsing for exports that don't use ISO. */
function toISOish(s) {
  const t = String(s || '').trim();
  const d = new Date(t);
  if (!isNaN(d) && t.length > 5) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return '';
}

/* ---------------------------------------------------------- */
/*  demographics block                                         */
/* ---------------------------------------------------------- */

export function demographics(e) {
  const box = h('div', { class: 'grid g2' });

  const ageData = AGES.map(a => ({ label: a, value: +e.age?.[a] || 0 }));
  const genderData = GENDERS.map((g, i) => ({ label: g, value: +e.gender?.[g] || 0, color: seriesColor(i) }));
  const srcData = SOURCES.map(s => ({ label: s, value: +e.sources?.[s] || 0 }));
  const countries = (e.countries || []).filter(c => c.n).map(c => ({ label: c.n, value: +c.v || 0 }))
    .sort((a, b) => b.value - a.value).slice(0, 12);
  const cities = (e.cities || []).filter(c => c.n).map(c => ({ label: c.n, value: +c.v || 0 }))
    .sort((a, b) => b.value - a.value).slice(0, 12);

  const any = (d) => d.some(x => x.value > 0);

  if (any(ageData)) box.append(card(cardHead('Age'),
    withTable(barRows(ageData, { percent: true }), ['Band', 'Share'],
      ageData.map(d => [d.label, d.value]))));

  if (any(genderData)) box.append(card(cardHead('Gender'),
    withTable(barRows(genderData, { percent: true }), ['Group', 'Share'],
      genderData.map(d => [d.label, d.value])), legend(genderData.map(d => [d.label, d.color]))));

  if (any(countries)) box.append(card(cardHead('Top countries'),
    withTable(barRows(countries, { color: 'var(--s1)' }), ['Country', 'Value'],
      countries.map(d => [d.label, d.value]))));

  if (any(cities)) box.append(card(cardHead('Top cities'),
    withTable(barRows(cities, { color: 'var(--s3)' }), ['City', 'Value'],
      cities.map(d => [d.label, d.value]))));

  if (any(srcData)) box.append(card(cardHead('Where plays come from'),
    withTable(barRows(srcData, { percent: true, color: 'var(--s2)' }), ['Source', 'Share'],
      srcData.map(d => [d.label, d.value]))));

  if (!box.children.length) {
    return card(cardHead('Demographics'),
      h('div', { class: 'small muted', text: 'Open the latest snapshot and fill in the demographics section — age, gender, countries, cities and traffic sources all render here.' }));
  }
  return box;
}

/* ---------------------------------------------------------- */
/*  entry editor                                               */
/* ---------------------------------------------------------- */

function openEntry(p, store, slice, existing, redraw) {
  const isNew = !existing;
  const e = existing || newEntry();
  if (isNew) { store.stats.push(e); S.touch(slice); }
  e.age = e.age || {}; e.gender = e.gender || {}; e.sources = e.sources || {};
  e.countries = e.countries || []; e.cities = e.cities || []; e.m = e.m || {};

  const numGrid = (obj, keys, unit) => h('div', { class: 'grid g3' }, keys.map(k =>
    h('label', { class: 'field', style: { margin: 0 } },
      h('span', { class: 'lab', text: k }),
      h('input', {
        class: 'inp', type: 'number', inputmode: 'decimal', placeholder: unit || '',
        value: obj[k] ?? '',
        onInput: (ev) => { obj[k] = ev.target.value === '' ? '' : +ev.target.value; S.touch(slice); },
      }))));

  const pairList = (arr, label, placeholder) => {
    const wrap = h('div');
    const draw = () => {
      clear(wrap);
      arr.forEach((row, i) => wrap.append(h('div', { class: 'row', style: { marginBottom: '6px' } },
        h('input', { class: 'inp', style: { flex: '2' }, placeholder, value: row.n || '',
          onInput: (ev) => { row.n = ev.target.value; S.touch(slice); } }),
        h('input', { class: 'inp', style: { flex: '1' }, type: 'number', placeholder: 'value', value: row.v ?? '',
          onInput: (ev) => { row.v = ev.target.value === '' ? '' : +ev.target.value; S.touch(slice); } }),
        h('button', { class: 'icon-btn', html: '&times;', onClick: () => { arr.splice(i, 1); S.touch(slice); draw(); } }))));
      wrap.append(btn('Add row', () => { arr.push({ n: '', v: '' }); S.touch(slice); draw(); }, { cls: 'btn-sm btn-ghost', icon: 'plus' }));
    };
    draw();
    return h('label', { class: 'field' }, h('span', { class: 'lab', text: label }), wrap);
  };

  const body = h('div',
    field('Date', e, 'date', { slice, type: 'date' }),
    h('div', { class: 'hr' }),
    h('div', { class: 'lab', style: { marginBottom: '8px' } }, 'Headline metrics'),
    numGrid(e.m, p.metrics),
    h('div', { class: 'hr' }),
    h('div', { class: 'lab', style: { marginBottom: '8px' } }, 'Age (percentages or raw)'),
    numGrid(e.age, AGES, '%'),
    h('div', { class: 'hr' }),
    h('div', { class: 'lab', style: { marginBottom: '8px' } }, 'Gender'),
    numGrid(e.gender, GENDERS, '%'),
    h('div', { class: 'hr' }),
    h('div', { class: 'lab', style: { marginBottom: '8px' } }, 'Where plays come from'),
    numGrid(e.sources, SOURCES, '%'),
    h('div', { class: 'hr' }),
    pairList(e.countries, 'Top countries', 'Country'),
    pairList(e.cities, 'Top cities', 'City'),
    field('Note', e, 'note', { slice, placeholder: 'What changed this week, and why you think so' }),
  );

  modal({
    title: isNew ? `New ${p.name} snapshot` : `${p.name} — ${fmtDate(e.date, { long: true })}`,
    body, wide: true,
    actions: [
      { label: 'Delete', cls: 'btn-danger btn-ghost', onClick: () => {
        store.stats.splice(store.stats.indexOf(e), 1); S.touch(slice); redraw(); } },
      'spacer',
      { label: 'Done', cls: 'btn-primary', onClick: redraw },
    ],
    onClose: redraw,
  });
}

function exportCsv(p, entries) {
  const cols = ['date', ...p.metrics, ...AGES.map(a => `age ${a}`), ...GENDERS.map(g => `gender ${g}`)];
  const rows = entries.map(e => [e.date, ...p.metrics.map(m => e.m[m] ?? ''),
    ...AGES.map(a => e.age?.[a] ?? ''), ...GENDERS.map(g => e.gender?.[g] ?? '')]);
  const csv = [cols, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  download(`sid-${p.key}-stats.csv`, csv, 'text/csv');
}

/* ---------------------------------------------------------- */
/*  global Statistics module                                   */
/* ---------------------------------------------------------- */

export function renderStats(sub) {
  const root = h('div');
  const gl = S.get('stats');
  let tab = ['overview', 'compare', 'notes'].includes(sub) ? sub : 'overview';

  const draw = () => {
    clear(root);
    root.append(h('div', { class: 'page-head' },
      h('div', {}, h('h1', { text: 'Statistics' }),
        h('div', { class: 'sub', text: 'Everything you have logged, across every platform.' }))));

    root.append(subtabs([['overview', 'Overview'], ['compare', 'Compare'], ['notes', 'Notes']], tab, (k) => { tab = k; draw(); }));

    if (tab === 'notes') { root.append(notesPanel(gl, 'stats', 'Analysis notes')); return; }
    if (tab === 'compare') { root.append(comparePanel()); return; }

    /* overview */
    const rows = [];
    PLATFORMS.forEach(p => {
      const st = (S.get(`p_${p.key}`).stats || []).slice().sort((a, b) => a.date.localeCompare(b.date));
      if (!st.length) return;
      const last = st[st.length - 1];
      const primary = p.metrics[0];
      const hist = st.map(e => +e.m[primary]).filter(v => isFinite(v));
      rows.push({ p, last, primary, value: last.m[primary], hist, n: st.length });
    });

    if (!rows.length) {
      root.append(empty('Nothing logged yet',
        'Open any platform tab → Stats → "Log a snapshot". Once two platforms have numbers, this page starts earning its keep.'));
      return;
    }

    const tiles = h('div', { class: 'grid g3' });
    rows.forEach(r => tiles.append(h('div', { class: 'stat' },
      h('div', { class: 'row', style: { gap: '7px' } },
        h('span', { html: icon(r.p.icon), style: { color: PCOLORS[r.p.key] } }),
        h('div', { class: 'k', text: r.p.name })),
      h('div', { class: 'row', style: { alignItems: 'flex-end', gap: '10px' } },
        h('div', { class: 'v tabular', text: fmtNum(r.value) }),
        h('div', { style: { marginLeft: 'auto' } }, sparkline(r.hist, { color: PCOLORS[r.p.key] }))),
      h('div', { class: 'd', text: `${r.primary} · ${r.n} snapshot${r.n > 1 ? 's' : ''}` }))));
    root.append(tiles);

    /* combined audience geography */
    const geo = {};
    rows.forEach(r => (r.last.countries || []).forEach(c => {
      if (!c.n) return; geo[c.n] = (geo[c.n] || 0) + (+c.v || 0);
    }));
    const geoData = Object.entries(geo).map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value).slice(0, 15);
    if (geoData.length) {
      root.append(card(cardHead('Audience by country — all platforms combined'),
        withTable(barRows(geoData), ['Country', 'Total'], geoData.map(d => [d.label, d.value]))));
    }

    /* latest demographics of the biggest platform */
    const biggest = rows.slice().sort((a, b) => (+b.value || 0) - (+a.value || 0))[0];
    root.append(h('div', { class: 'card-head', style: { marginTop: '18px' } },
      h('h3', { text: `Demographics — ${biggest.p.name} (latest)` })));
    root.append(demographics(biggest.last));
  };

  draw();
  return root;
}

function comparePanel() {
  const box = h('div');
  const withData = PLATFORMS.map(p => ({ p, st: (S.get(`p_${p.key}`).stats || []).slice().sort((a, b) => a.date.localeCompare(b.date)) }))
    .filter(x => x.st.length);

  if (withData.length < 2) return empty('Not enough data to compare', 'Log snapshots on at least two platforms.');

  // one y-axis rule: compare the same *kind* of number — each platform's primary metric,
  // indexed to its own first reading so the scales are commensurable.
  const series = withData.slice(0, 8).map(({ p, st }) => {
    const m = p.metrics[0];
    const pts = st.filter(e => e.m[m] != null && e.m[m] !== '').map(e => ({ x: e.date, y: +e.m[m] }));
    const base = pts[0]?.y || 1;
    return { name: p.name, points: pts.map(pt => ({ x: pt.x, y: +(pt.y / base * 100).toFixed(1) })) };
  }).filter(s => s.points.length);

  box.append(card(
    cardHead('Relative growth', h('span', { class: 'small muted', text: 'each platform indexed to 100 at its first snapshot' })),
    lineChart(series, { height: 240 })));

  const headers = ['Platform', 'Metric', 'First', 'Latest', 'Change'];
  const rows = withData.map(({ p, st }) => {
    const m = p.metrics[0];
    const vals = st.filter(e => e.m[m] != null && e.m[m] !== '').map(e => +e.m[m]);
    const a = vals[0], b = vals[vals.length - 1];
    return [p.name, m, fmtNum(a), fmtNum(b), a ? `${(((b - a) / a) * 100).toFixed(1)}%` : '—'];
  });
  box.append(card(cardHead('Side by side'), tableView(headers, rows)));
  return box;
}
