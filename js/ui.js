/* ============================================================
   ui.js — DOM helpers, modal, toast, dates, tiny markdown
   ============================================================ */

import * as S from './store.js';
import { icon } from './icons.js';

/* ---------- dom ---------- */

const isAttrs = (v) =>
  v != null && typeof v === 'object' && !(v instanceof Node) && !Array.isArray(v);

export function h(tag, attrs, ...kids) {
  // Allow h('div', child, child) as well as h('div', {…}, child)
  if (attrs !== undefined && !isAttrs(attrs)) { kids.unshift(attrs); attrs = {}; }
  if (attrs == null) attrs = {};
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(9)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ---------- toast ---------- */

export function toast(msg, ms = 2200) {
  const root = $('#toast-root');
  const t = h('div', { class: 'toast', text: msg });
  root.append(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .2s'; }, ms - 200);
  setTimeout(() => t.remove(), ms);
}

/* ---------- modal ---------- */

export function modal({ title, body, actions = [], wide = false, onClose }) {
  const root = $('#modal-root');
  root.hidden = false;
  clear(root);

  const close = () => { root.hidden = true; clear(root); document.removeEventListener('keydown', onKey); onClose?.(); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);

  const foot = h('div', { class: 'modal-foot' });
  actions.forEach(a => {
    if (a === 'spacer') { foot.append(h('div', { class: 'spacer' })); return; }
    foot.append(h('button', {
      class: `btn ${a.cls || ''}`,
      onClick: () => { const r = a.onClick?.(close); if (r !== false && !a.keepOpen) close(); },
    }, a.label));
  });

  const box = h('div', { class: `modal ${wide ? 'wide' : ''}` },
    h('div', { class: 'modal-head' },
      h('h3', { text: title }),
      h('button', { class: 'icon-btn', onClick: close, 'aria-label': 'Close', html: '&times;', style: { fontSize: '20px' } })),
    h('div', { class: 'modal-body' }, body),
    actions.length ? foot : null,
  );
  root.append(box);
  root.onclick = (e) => { if (e.target === root) close(); };
  setTimeout(() => box.querySelector('input,textarea,select')?.focus(), 30);
  return { close, box };
}

export function confirmDelete(what, onYes) {
  modal({
    title: `Delete ${what}?`,
    body: h('p', { class: 'muted small', text: 'This cannot be undone — though a snapshot from earlier today can be restored in Settings.' }),
    actions: [
      { label: 'Cancel' },
      { label: 'Delete', cls: 'btn-danger', onClick: onYes },
    ],
  });
}

/* ---------- bound fields (autosave) ---------- */

/** Text input / textarea bound to obj[key]; saves as you type. */
export function field(label, obj, key, opts = {}) {
  const tag = opts.multiline ? 'textarea' : 'input';
  const el = h(tag, {
    class: `inp ${opts.tall ? 'tall' : ''} ${opts.cls || ''}`,
    type: opts.type || 'text',
    placeholder: opts.placeholder || '',
    value: obj[key] ?? '',
    rows: opts.rows,
    onInput: (e) => {
      obj[key] = opts.type === 'number' ? (e.target.value === '' ? '' : +e.target.value) : e.target.value;
      S.touch(opts.slice);
      opts.onInput?.(obj[key]);
      if (opts.autogrow) grow(el);
    },
  });
  if (opts.autogrow) setTimeout(() => grow(el), 0);
  if (!label) return el;
  return h('label', { class: 'field' }, h('span', { class: 'lab', text: label }), el);
}

function grow(el) { el.style.height = 'auto'; el.style.height = Math.max(el.scrollHeight, 90) + 'px'; }

export function selectField(label, obj, key, options, opts = {}) {
  const el = h('select', {
    class: 'inp',
    onChange: (e) => { obj[key] = e.target.value; S.touch(opts.slice); opts.onChange?.(e.target.value); },
  }, options.map(o => {
    const [v, t] = Array.isArray(o) ? o : [o, o];
    return h('option', { value: v, selected: String(obj[key] ?? '') === String(v) }, t);
  }));
  if (!label) return el;
  return h('label', { class: 'field' }, h('span', { class: 'lab', text: label }), el);
}

export function checkbox(label, obj, key, opts = {}) {
  const wrap = h('label', { class: `check ${obj[key] ? 'done' : ''}` },
    h('input', {
      type: 'checkbox', checked: !!obj[key],
      onChange: (e) => {
        obj[key] = e.target.checked;
        wrap.classList.toggle('done', e.target.checked);
        S.touch(opts.slice);
        opts.onChange?.(e.target.checked);
      },
    }),
    h('span', { html: opts.html ? label : esc(label) }),
  );
  return wrap;
}

/* ---------- structure helpers ---------- */

export const card = (...kids) => h('div', { class: 'card' }, kids);

export function cardHead(title, ...right) {
  return h('div', { class: 'card-head' },
    h('h3', { text: title }), h('div', { class: 'spacer' }), right);
}

export function pageHead(title, sub, actions = []) {
  return h('div', { class: 'page-head' },
    h('div', {}, h('h1', { text: title }), sub ? h('div', { class: 'sub', text: sub }) : null),
    h('div', { class: 'spacer' }),
    h('div', { class: 'page-actions' }, actions));
}

export const btn = (label, onClick, opts = {}) =>
  h('button', { class: `btn ${opts.cls || ''}`, onClick, title: opts.title },
    opts.icon ? h('span', { html: icon(opts.icon), style: { display: 'flex' } }) : null, label);

export const empty = (title, sub) =>
  h('div', { class: 'empty' }, h('strong', { text: title }), sub || '');

export function subtabs(items, active, onPick) {
  return h('div', { class: 'subtabs' },
    items.map(([k, label]) =>
      h('button', { class: `subtab ${k === active ? 'on' : ''}`, onClick: () => onPick(k) }, label)));
}

export function stat(k, v, d) {
  return h('div', { class: 'stat' },
    h('div', { class: 'k', text: k }),
    h('div', { class: 'v', text: v }),
    d ? h('div', { class: 'd', text: d }) : null);
}

export function progress(pct) {
  return h('div', { class: 'prog' }, h('i', { style: { width: `${Math.max(0, Math.min(100, pct))}%` } }));
}

/* ---------- dates ---------- */

export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const DOW = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export const todayISO = () => toISO(new Date());
export const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fromISO = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (iso, n) => { const d = fromISO(iso); d.setDate(d.getDate() + n); return toISO(d); };
export const daysBetween = (a, b) => Math.round((fromISO(b) - fromISO(a)) / 86400000);

export function fmtDate(iso, opts = {}) {
  if (!iso) return '';
  const d = fromISO(iso);
  if (isNaN(d)) return iso;
  return opts.long
    ? `${DOW[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
    : `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

/** "T-28" / "T+14" / "T" for a date, given the release date. */
export function tLabel(iso, releaseISO) {
  if (!iso || !releaseISO) return '';
  const n = daysBetween(releaseISO, iso);
  return n === 0 ? 'T' : n > 0 ? `T+${n}` : `T${n}`;
}

/** Accepts "2026-11-13", "T-28", "T+14", "T" → ISO date. */
export function resolveDate(input, releaseISO) {
  const s = String(input || '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^T\s*([+-]\s*\d+)?$/i);
  if (m && releaseISO) return addDays(releaseISO, m[1] ? parseInt(m[1].replace(/\s/g, ''), 10) : 0);
  return '';
}

export function relativeDay(iso) {
  if (!iso) return '';
  const n = daysBetween(todayISO(), iso);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}

export const fmtNum = (n) => {
  const v = Number(n);
  if (!isFinite(v)) return '—';
  if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (Math.abs(v) >= 1e4) return (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
  return v.toLocaleString();
};

/* ---------- tiny markdown (for reference sections) ---------- */

export function md(src) {
  const lines = String(src || '').split('\n');
  let out = '', inUl = false, inOl = false, inTable = false;
  const closeLists = () => {
    if (inUl) { out += '</ul>'; inUl = false; }
    if (inOl) { out += '</ol>'; inOl = false; }
  };
  const closeTable = () => { if (inTable) { out += '</tbody></table>'; inTable = false; } };

  const inline = (t) => esc(t)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();

    if (/^\s*$/.test(line)) { closeLists(); closeTable(); continue; }

    // table
    if (/^\|/.test(line)) {
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      if (!inTable) {
        if (/^\|[\s:|-]+\|$/.test(lines[i + 1] || '')) {
          closeLists();
          out += '<table><thead><tr>' + cells.map(c => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>';
          inTable = true; i++; continue;
        }
      } else {
        out += '<tr>' + cells.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>'; continue;
      }
    } else closeTable();

    let m;
    if ((m = line.match(/^###\s+(.*)/))) { closeLists(); out += `<h3>${inline(m[1])}</h3>`; continue; }
    if ((m = line.match(/^##\s+(.*)/)))  { closeLists(); out += `<h2>${inline(m[1])}</h2>`; continue; }
    if ((m = line.match(/^#\s+(.*)/)))   { closeLists(); out += `<h2>${inline(m[1])}</h2>`; continue; }
    if ((m = line.match(/^>\s?(.*)/)))   { closeLists(); out += `<blockquote>${inline(m[1])}</blockquote>`; continue; }
    if (/^(-{3,}|\*{3,})$/.test(line))   { closeLists(); out += '<hr class="hr">'; continue; }
    if ((m = line.match(/^\s*[-*•]\s+(.*)/))) {
      if (inOl) { out += '</ol>'; inOl = false; }
      if (!inUl) { out += '<ul>'; inUl = true; }
      out += `<li>${inline(m[1])}</li>`; continue;
    }
    if ((m = line.match(/^\s*\d+[.)]\s+(.*)/))) {
      if (inUl) { out += '</ul>'; inUl = false; }
      if (!inOl) { out += '<ol>'; inOl = true; }
      out += `<li>${inline(m[1])}</li>`; continue;
    }
    closeLists();
    out += `<p>${inline(line)}</p>`;
  }
  closeLists(); closeTable();
  return out;
}

export const prose = (src) => h('div', { class: 'prose', html: md(src) });

/* ---------- misc ---------- */

export function copy(text) {
  navigator.clipboard?.writeText(text).then(() => toast('Copied')).catch(() => toast('Copy failed'));
}

export function download(name, content, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = h('a', { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function move(arr, from, to) {
  if (to < 0 || to >= arr.length) return;
  arr.splice(to, 0, arr.splice(from, 1)[0]);
}
