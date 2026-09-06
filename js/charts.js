/* ============================================================
   charts.js — small SVG chart set
   Palette: validated categorical slots (see css :root --s1…--s8).
   Rules kept: one y-axis, fixed hue order (never cycled), legend
   for >=2 series, direct labels on bars, hover tooltip, recessive
   grid, table view alongside every chart that needs relief.
   ============================================================ */

import { h, fmtNum, esc } from './ui.js';

export const SERIES = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)',
                       'var(--s5)', 'var(--s6)', 'var(--s7)', 'var(--s8)'];
export const seriesColor = (i) => SERIES[i] ?? 'var(--fg-3)';

const NS = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs = {}, ...kids) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  kids.flat().forEach(k => k && el.append(k));
  return el;
};
const txt = (x, y, s, attrs = {}) => sv('text', { x, y, ...attrs }, document.createTextNode(String(s)));

/* ---------------------------------------------------------- */
/*  horizontal bar rows — ranking / magnitude                  */
/*  Direct value labels satisfy the light-mode relief rule.    */
/* ---------------------------------------------------------- */

export function barRows(data, opts = {}) {
  const rows = data.filter(d => Number(d.value) > 0);
  if (!rows.length) return h('div', { class: 'small muted', text: 'No data yet' });
  const max = Math.max(...rows.map(d => +d.value));
  const total = rows.reduce((a, d) => a + +d.value, 0);
  const color = opts.color || 'var(--s1)';

  return h('div', { class: 'chart-wrap' }, rows.map(d => {
    const pct = total ? (+d.value / total * 100) : 0;
    return h('div', { class: 'bar-row', title: `${d.label}: ${fmtNum(d.value)}` },
      h('span', { class: 'muted', style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, text: d.label }),
      h('div', { class: 'bar-track' },
        h('div', { class: 'bar-fill', style: { width: `${(+d.value / max) * 100}%`, background: d.color || color } })),
      h('span', { class: 'bar-val', text: opts.percent ? `${pct.toFixed(1)}%` : fmtNum(d.value) }));
  }));
}

/* ---------------------------------------------------------- */
/*  line chart — change over time, one y-axis                  */
/* ---------------------------------------------------------- */

export function lineChart(series, opts = {}) {
  // series: [{ name, points:[{x:'2026-01-01', y:12}] }]
  const live = series.filter(s => s.points && s.points.length);
  if (!live.length) return h('div', { class: 'small muted', text: 'No data yet — add a stats entry.' });

  const W = 680, H = opts.height || 210;
  const P = { t: 12, r: 14, b: 26, l: 46 };
  const xs = [...new Set(live.flatMap(s => s.points.map(p => p.x)))].sort();

  // A single reading is not a trend — say so rather than drawing a flat line.
  if (xs.length < 2) {
    return h('div', { class: 'small muted', style: { padding: '18px 0' } },
      opts.singleMsg || 'Only one reading so far — log another and the trend appears here.');
  }

  const ys = live.flatMap(s => s.points.map(p => +p.y)).filter(v => isFinite(v));
  let max = Math.max(...ys, 1), min = Math.min(...ys, 0);
  if (max === min) max = min + 1;
  const pad = (max - min) * 0.12; max += pad;

  const X = (x) => P.l + (xs.length < 2 ? (W - P.l - P.r) / 2 : (xs.indexOf(x) / (xs.length - 1)) * (W - P.l - P.r));
  const Y = (y) => P.t + (1 - (y - min) / (max - min)) * (H - P.t - P.b);

  const svg = sv('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none',
    style: 'width:100%;height:' + H + 'px' });

  // gridlines + y labels
  const span = max - min;
  const tick = (v) => span >= 20 ? fmtNum(Math.round(v))
             : span >= 2 ? v.toFixed(1)
             : v.toFixed(2);
  for (let i = 0; i <= 4; i++) {
    const v = min + span * (i / 4), y = Y(v);
    svg.append(sv('line', { class: 'gridline', x1: P.l, x2: W - P.r, y1: y, y2: y }));
    svg.append(txt(P.l - 7, y + 3.5, tick(v), { 'text-anchor': 'end' }));
  }
  svg.append(sv('line', { class: 'axis', x1: P.l, x2: W - P.r, y1: H - P.b, y2: H - P.b }));

  // x labels (first, middle, last)
  [0, Math.floor((xs.length - 1) / 2), xs.length - 1].filter((v, i, a) => a.indexOf(v) === i)
    .forEach(i => svg.append(txt(X(xs[i]), H - P.b + 15, (xs[i] || '').slice(5),
      { 'text-anchor': i === 0 ? 'start' : i === xs.length - 1 ? 'end' : 'middle' })));

  live.forEach((s, i) => {
    const col = seriesColor(i);
    const pts = s.points.slice().sort((a, b) => a.x.localeCompare(b.x));
    const d = pts.map((p, j) => `${j ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(+p.y).toFixed(1)}`).join(' ');
    svg.append(sv('path', { d, fill: 'none', stroke: col, 'stroke-width': 2,
      'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    pts.forEach(p => svg.append(sv('circle', {
      class: 'dot-mark', cx: X(p.x), cy: Y(+p.y), r: 4, fill: col })));
    // direct label on the last point
    const last = pts[pts.length - 1];
    if (live.length <= 4) svg.append(txt(X(last.x) - 6, Y(+last.y) - 9, fmtNum(last.y),
      { 'text-anchor': 'end', fill: 'var(--fg-2)', 'font-size': 10 }));
  });

  const wrap = h('div', { class: 'chart-wrap' }, svg);

  // hover crosshair + tooltip
  const tip = h('div', { class: 'chart-tip', style: { display: 'none' } });
  wrap.append(tip);
  const cross = sv('line', { class: 'crosshair', y1: P.t, y2: H - P.b, style: 'display:none' });
  svg.append(cross);

  svg.addEventListener('pointermove', (e) => {
    const r = svg.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * W;
    let best = xs[0], bd = Infinity;
    xs.forEach(x => { const d = Math.abs(X(x) - vx); if (d < bd) { bd = d; best = x; } });
    cross.setAttribute('x1', X(best)); cross.setAttribute('x2', X(best));
    cross.style.display = '';
    tip.style.display = '';
    tip.style.left = `${(X(best) / W) * 100}%`;
    tip.style.top = `${(P.t / H) * 100 + 12}%`;
    tip.innerHTML = `<div class="tk">${esc(best)}</div>` + live.map((s, i) => {
      const p = s.points.find(p => p.x === best);
      return p ? `<div class="tr"><i style="background:${seriesColor(i)}"></i><span>${esc(s.name)}</span><span class="tv">${fmtNum(p.y)}</span></div>` : '';
    }).join('');
  });
  svg.addEventListener('pointerleave', () => { cross.style.display = 'none'; tip.style.display = 'none'; });

  const out = h('div', {}, wrap);
  if (live.length >= 2) out.append(legend(live.map((s, i) => [s.name, seriesColor(i)])));
  return out;
}

/* ---------------------------------------------------------- */
/*  sparkline                                                  */
/* ---------------------------------------------------------- */

export function sparkline(values, opts = {}) {
  const v = values.map(Number).filter(isFinite);
  if (v.length < 2) return h('span', { class: 'small muted', text: '—' });
  const W = 90, H = 24, max = Math.max(...v), min = Math.min(...v);
  const rng = max - min || 1;
  const d = v.map((y, i) => `${i ? 'L' : 'M'}${(i / (v.length - 1)) * W},${H - ((y - min) / rng) * (H - 4) - 2}`).join(' ');
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, style: `width:${W}px;height:${H}px;overflow:visible` },
    sv('path', { d, fill: 'none', stroke: opts.color || 'var(--s1)', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  return svg;
}

/* ---------------------------------------------------------- */
/*  legend + table view                                        */
/* ---------------------------------------------------------- */

export function legend(pairs) {
  return h('div', { class: 'legend' }, pairs.map(([label, color]) =>
    h('span', {}, h('i', { style: { background: color } }), label)));
}

export function tableView(headers, rows) {
  return h('div', { class: 'table-wrap' },
    h('table', { class: 'tbl tabular' },
      h('thead', {}, h('tr', {}, headers.map(t => h('th', { text: t })))),
      h('tbody', {}, rows.map(r => h('tr', {}, r.map(c => h('td', { text: c })))))));
}

/* Chart + its numbers, collapsible. Satisfies the relief rule. */
export function withTable(chart, headers, rows) {
  const box = h('div');
  let shown = false;
  const tbl = h('div', { style: { marginTop: '12px' }, hidden: true }, tableView(headers, rows));
  const toggle = h('button', {
    class: 'btn btn-sm btn-ghost', style: { marginTop: '10px' },
    onClick: () => { shown = !shown; tbl.hidden = !shown; toggle.textContent = shown ? 'Hide numbers' : 'Show numbers'; },
  }, 'Show numbers');
  box.append(chart, toggle, tbl);
  return box;
}
