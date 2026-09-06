/* ============================================================
   shared.js — pieces reused by every module
   ============================================================ */

import * as S from '../store.js';
import * as B from '../backend.js';
import {
  h, $, $$, clear, uid, toast, modal, field, selectField, checkbox, btn, card, cardHead,
  empty, prose, fmtDate, tLabel, resolveDate, relativeDay, todayISO, confirmDelete, copy, move,
  addDays, daysBetween,
} from '../ui.js';
import { icon } from '../icons.js';
import { TEMPLATES, fillTemplate, missingPlaceholders, splitHint } from '../data/templates.js';

export const STATUSES = [
  ['idea', 'Idea'], ['draft', 'Draft'], ['ready', 'Ready'],
  ['scheduled', 'Scheduled'], ['posted', 'Posted'], ['parked', 'Parked'],
];
export const STATUS_TAG = { idea: '', draft: 'info', ready: 'ok', scheduled: 'warn', posted: 'ok', parked: '' };

/* ---------------------------------------------------------- */
/*  media                                                      */
/* ---------------------------------------------------------- */

export function mediaBlock(obj, slice, pathHint) {
  obj.media = obj.media || [];
  const wrap = h('div');

  const draw = () => {
    clear(wrap);
    if (obj.media.length) {
      const grid = h('div', { class: 'media-grid' });
      obj.media.forEach((m, i) => {
        const cell = h('div', { class: 'media-cell' });
        if (m.kind === 'video') {
          cell.append(h('video', { src: m.url, muted: true, playsinline: true, preload: 'metadata',
            onClick: (e) => { e.target.paused ? e.target.play() : e.target.pause(); } }));
        } else if (m.kind === 'audio') {
          cell.append(h('div', { style: { display: 'grid', placeItems: 'center', height: '100%' },
            html: icon('soundcloud') }));
        } else {
          cell.append(h('img', { src: m.url, alt: m.name, loading: 'lazy',
            onClick: () => window.open(m.url, '_blank') }));
        }
        cell.append(h('span', { class: 'kind', text: m.kind }));
        cell.append(h('button', {
          class: 'rm', html: '&times;', title: 'Remove',
          onClick: async (e) => {
            e.stopPropagation();
            const [gone] = obj.media.splice(i, 1);
            S.touch(slice); draw();
            B.deleteMedia(gone);
          },
        }));
        grid.append(cell);
      });
      wrap.append(grid);
    }

    const input = h('input', {
      type: 'file', multiple: true, hidden: true,
      accept: 'image/*,video/*,audio/*',
      onChange: (e) => addFiles([...e.target.files]),
    });
    const drop = h('div', { class: 'drop', onClick: () => input.click() },
      obj.media.length ? 'Add more — click or drop files' : 'Drop images or video here, or click to choose');

    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', (e) => {
      e.preventDefault(); drop.classList.remove('over');
      addFiles([...e.dataTransfer.files]);
    });

    async function addFiles(files) {
      if (!files.length) return;
      drop.textContent = `uploading 0/${files.length}…`;
      let n = 0;
      for (const f of files) {
        try {
          obj.media.push(await B.uploadMedia(f, pathHint));
          drop.textContent = `uploading ${++n}/${files.length}…`;
        } catch (err) { toast(err.message || 'Upload failed', 3500); }
      }
      S.touch(slice); draw();
    }

    wrap.append(input, drop);
  };
  draw();
  return wrap;
}

/* ---------------------------------------------------------- */
/*  scheduling  (absolute date OR T-x / T+x)                   */
/* ---------------------------------------------------------- */

/**
 * Every dated field in the app. Two ways to say when, your choice:
 *   • relative to the release  (T-28, T, T+14)
 *   • a calendar date          (2026-11-13)
 * Switching between them converts what you already had, and whichever
 * you pick, the other reading is shown underneath. Relative dates move
 * with the release date; calendar dates stay put.
 */
export function scheduleRow(item, slice, onChange, opts = {}) {
  const key = opts.key || 'when';
  const label = opts.label || 'When';
  const set = S.get('settings');
  const wrap = h('div', { class: 'field' });

  const isT = (v) => /^T\s*([+-]\s*\d+)?$/i.test(String(v || '').trim());
  const isISO = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '').trim());
  const offsetOf = (v) => {
    const m = String(v || '').match(/^T\s*([+-]\s*\d+)?$/i);
    return m ? (m[1] ? parseInt(m[1].replace(/\s/g, ''), 10) : 0) : 0;
  };
  const asT = (n) => (n === 0 ? 'T' : n > 0 ? `T+${n}` : `T${n}`);

  let mode = isT(item[key]) ? 'rel' : isISO(item[key]) ? 'abs' : (opts.defaultMode || 'rel');

  const commit = (v) => {
    item[key] = v;
    S.touch(slice);
    onChange?.(v);
    draw();
  };

  const draw = () => {
    clear(wrap);
    const rel = S.get('settings').releaseDate;
    const iso = resolveDate(item[key], rel);

    wrap.append(h('span', { class: 'lab', text: label }));

    const box = h('div', { class: 'dateas' });

    /* mode switch */
    box.append(h('div', { class: 'seg' },
      h('button', { class: mode === 'rel' ? 'on' : '', onClick: () => {
        // carry a calendar date across as its offset
        if (mode !== 'rel') {
          mode = 'rel';
          if (isISO(item[key]) && rel) return commit(asT(daysBetween(rel, item[key])));
          draw();
        }
      } }, 'Relative to release'),
      h('button', { class: mode === 'abs' ? 'on' : '', onClick: () => {
        if (mode !== 'abs') {
          mode = 'abs';
          if (isT(item[key]) && rel) return commit(addDays(rel, offsetOf(item[key])));
          draw();
        }
      } }, 'Calendar date'),
      opts.required ? null : h('button', { class: !item[key] ? 'on' : '', onClick: () => commit('') }, 'No date')));

    /* the input for the chosen mode */
    if (mode === 'rel') {
      const n = isT(item[key]) ? offsetOf(item[key]) : 0;
      const sign = h('div', { class: 'seg', style: { marginLeft: '0' } },
        h('button', { class: n < 0 ? 'on' : '', onClick: () => commit(asT(-Math.abs(n) || -1)) }, 'T−'),
        h('button', { class: n === 0 ? 'on' : '', onClick: () => commit('T') }, 'T'),
        h('button', { class: n > 0 ? 'on' : '', onClick: () => commit(asT(Math.abs(n) || 1)) }, 'T+'));

      const num = h('input', {
        class: 'inp tnum', type: 'number', min: 0, value: Math.abs(n) || '',
        placeholder: '0',
        onInput: (e) => {
          const v = Math.abs(parseInt(e.target.value, 10) || 0);
          item[key] = v === 0 ? 'T' : (n < 0 ? asT(-v) : asT(v));
          S.touch(slice); onChange?.(item[key]); paintResolved();
        },
      });

      box.append(h('div', { class: 'row', style: { marginTop: '10px' } },
        sign, num, h('span', { class: 'small muted', text: 'days from release day' })));

      box.append(h('div', { class: 'row', style: { marginTop: '9px' } },
        ['T-60', 'T-30', 'T-14', 'T-7', 'T-1', 'T', 'T+7', 'T+30'].map(t =>
          h('button', { class: `chip ${item[key] === t ? 'on' : ''}`, onClick: () => commit(t) }, t))));
    } else if (mode === 'abs') {
      box.append(h('div', { class: 'row', style: { marginTop: '10px' } },
        h('input', {
          type: 'date', class: 'inp', style: { maxWidth: '175px' },
          value: isISO(item[key]) ? item[key] : '',
          onChange: (e) => commit(e.target.value),
        }),
        h('button', { class: 'chip', onClick: () => commit(todayISO()) }, 'Today'),
        h('button', { class: 'chip', onClick: () => commit(addDays(todayISO(), 1)) }, 'Tomorrow'),
        h('button', { class: 'chip', onClick: () => commit(addDays(todayISO(), 7)) }, 'Next week')));
    }

    /* what it resolves to */
    const resolved = h('div', { class: 'resolved' });
    box.append(resolved);
    const warn = h('div', { class: 'warnline' });
    box.append(warn);

    function paintResolved() {
      clear(resolved); warn.textContent = '';
      const relDate = S.get('settings').releaseDate;
      const d = resolveDate(item[key], relDate);

      if (!item[key]) { resolved.append(h('span', { class: 'muted', text: 'No date set.' })); return; }

      if (!d) {
        if (!relDate) warn.textContent = 'Set a release date in Settings and this resolves to a real day.';
        else warn.textContent = 'That is not a date Sid can read.';
        return;
      }

      resolved.append(
        h('span', { class: 'big', text: fmtDate(d, { long: true }) }),
        h('span', { class: 'muted', text: relativeDay(d) }),
        relDate ? h('span', { class: 'tag mono', text: tLabel(d, relDate) }) : null);

      if (mode === 'rel' && relDate) {
        resolved.append(h('span', { class: 'muted small', text: '· moves if you change the release date' }));
      } else if (mode === 'abs') {
        resolved.append(h('span', { class: 'muted small', text: '· fixed, stays put' }));
      }
    }
    paintResolved();

    wrap.append(box);
  };

  draw();
  return wrap;
}

/* ---------------------------------------------------------- */
/*  generic content item editor                                */
/* ---------------------------------------------------------- */

export function itemEditor({ item, slice, type, pathHint, onSave, onDelete }) {
  const body = h('div');

  const counter = h('div', { class: 'small muted', style: { textAlign: 'right', marginTop: '-6px' } });
  const gaps = h('div', { class: 'small', style: { color: 'var(--warn)', marginTop: '4px' } });
  const paintCount = () => {
    const n = (item.body || '').length;
    counter.textContent = type.limit ? `${n} / ${type.limit}` : `${n} characters`;
    counter.style.color = type.limit && n > type.limit ? 'var(--bad)' : '';
    const m = missingPlaceholders(item.body || '');
    gaps.textContent = m.length
      ? `Still unfilled: ${m.map(k => '[' + k + ']').join(' ')} — fill these in Settings and re-insert, or write them here.`
      : '';
  };

  const bodyInput = field(null, item, 'body', {
    slice, multiline: true, tall: true,
    placeholder: type.hint || 'Write it exactly as it will be posted…',
    onInput: paintCount,
  });
  paintCount();

  body.append(
    field('Title / label', item, 'title', { slice, placeholder: 'Internal name — not posted' }),
    h('label', { class: 'field' },
      h('span', { class: 'lab', text: type.limit ? `Text (limit ${type.limit})` : 'Text' }),
      bodyInput, counter, gaps),
    type.hint ? h('p', { class: 'small muted', text: type.hint }) : null,
    h('div', { class: 'grid g2' },
      selectField('Status', item, 'status', STATUSES, { slice }),
      field('Tags', item, 'tags', { slice, placeholder: 'hook, bts, lyric' })),
    scheduleRow(item, slice),
    type.media !== false ? h('label', { class: 'field' },
      h('span', { class: 'lab', text: 'Attachments' }), mediaBlock(item, slice, pathHint)) : null,
    field('Notes', item, 'notes', { slice, multiline: true, placeholder: 'Anything you need to remember about this one' }),
  );

  return modal({
    title: item.title || `New ${type.label.replace(/s$/, '').toLowerCase()}`,
    body, wide: true,
    actions: [
      { label: 'Copy text', cls: 'btn-ghost', keepOpen: true, onClick: () => copy(item.body || '') },
      { label: 'Delete', cls: 'btn-danger btn-ghost', onClick: () => { onDelete?.(); } },
      'spacer',
      { label: 'Done', cls: 'btn-primary', onClick: () => onSave?.() },
    ],
    onClose: () => onSave?.(),
  });
}

/* ---------------------------------------------------------- */
/*  content list                                               */
/* ---------------------------------------------------------- */

/* ---------------------------------------------------------- */
/*  template picker                                            */
/* ---------------------------------------------------------- */

export function templatePicker({ platformKey, typeKey, onInsert }) {
  const set = S.get('settings');
  const all = (TEMPLATES[platformKey] || []).filter(t => t.type === typeKey);
  if (!all.length) return null;

  return btn(`Templates (${all.length})`, () => {
    const chosen = new Set();
    const body = h('div');

    body.append(h('p', { class: 'small muted' },
      'Drafted for you from the release plan. Placeholders fill in from Settings — anything still in brackets is yours to write.'));

    const list = h('div', { class: 'list' });
    all.forEach(t => {
      const split = splitHint(fillTemplate(t.body, set));
      const filled = split.body;
      const row = h('div', { class: 'item', style: { cursor: 'pointer' } });
      const box = h('input', { type: 'checkbox', style: { accentColor: 'var(--accent)', width: '16px', height: '16px', marginTop: '3px' } });
      const toggle = (on) => {
        box.checked = on;
        on ? chosen.add(t) : chosen.delete(t);
        row.style.borderColor = on ? 'var(--accent-line)' : '';
      };
      box.addEventListener('click', (e) => { e.stopPropagation(); toggle(box.checked); });
      row.addEventListener('click', () => toggle(!box.checked));

      row.append(h('div', { class: 'row', style: { alignItems: 'flex-start', gap: '9px' } },
        box,
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { class: 'row', style: { gap: '7px' } },
            h('span', { style: { fontWeight: 500 }, text: t.label }),
            t.when ? h('span', { class: 'tag mono', text: t.when }) : null),
          h('div', { class: 'item-body', style: { WebkitLineClamp: 4 }, text: filled }))));
      list.append(row);
    });
    body.append(list);

    modal({
      title: 'Insert from the copy bank', body, wide: true,
      actions: [
        { label: 'Select all', cls: 'btn-ghost', keepOpen: true, onClick: () => {
          all.forEach(t => chosen.add(t));
          $$('input[type=checkbox]', list).forEach(b => { b.checked = true; });
        } },
        'spacer',
        { label: 'Insert selected', cls: 'btn-primary', onClick: () => {
          if (!chosen.size) { toast('Nothing selected'); return; }
          onInsert([...chosen].map(t => {
            const sp = splitHint(fillTemplate(t.body, set));
            return { title: t.label, body: sp.body, notes: sp.hint, when: t.when || '' };
          }));
          toast(`${chosen.size} added as drafts`);
        } },
      ],
    });
  }, { cls: 'btn-sm', icon: 'copy' });
}

export function contentList({ slice, store, type, pathHint, platformKey, onChanged }) {
  const wrap = h('div');
  store.content = store.content || {};
  store.content[type.key] = store.content[type.key] || [];
  const items = store.content[type.key];

  let filter = 'all';

  const open = (item) => itemEditor({
    item, slice, type, pathHint,
    onSave: draw,
    onDelete: () => { items.splice(items.indexOf(item), 1); S.touch(slice); draw(); },
  });

  const add = () => {
    const item = { id: uid(), title: '', body: '', status: 'draft', when: '', tags: '', notes: '', media: [] };
    items.unshift(item); S.touch(slice); open(item);
  };

  const draw = () => {
    clear(wrap);
    onChanged?.();
    const set = S.get('settings');

    wrap.append(h('div', { class: 'row', style: { marginBottom: '12px' } },
      btn('New ' + type.label.replace(/s$/, '').toLowerCase(), add, { cls: 'btn-primary btn-sm', icon: 'plus' }),
      templatePicker({
        platformKey, typeKey: type.key,
        onInsert: (rows) => {
          rows.forEach(r => items.unshift({
            id: uid(), title: r.title, body: r.body, status: 'draft',
            when: r.when, tags: 'from copy bank', notes: r.notes || '', media: [],
          }));
          S.touch(slice); draw();
        },
      }),
      h('div', { style: { flex: 1 } }),
      [['all', 'All'], ...STATUSES].map(([k, l]) =>
        h('button', { class: `chip ${filter === k ? 'on' : ''}`, onClick: () => { filter = k; draw(); } },
          `${l}${k === 'all' ? '' : ' ' + items.filter(i => i.status === k).length}`))));

    const shown = items.filter(i => filter === 'all' || i.status === filter);
    if (!shown.length) {
      wrap.append(empty(items.length ? 'Nothing with that status' : `No ${type.label.toLowerCase()} yet`,
        items.length ? '' : type.hint || 'Start banking them now so posting later takes no thought.'));
      return;
    }

    const list = h('div', { class: 'list' });
    shown.forEach(item => {
      const iso = resolveDate(item.when, set.releaseDate);
      list.append(h('div', { class: 'item', onClick: () => open(item) },
        h('div', { class: 'item-head' },
          h('span', { class: 'item-title', text: item.title || (item.body || '').slice(0, 60) || 'Untitled' }),
          h('span', { class: `tag ${STATUS_TAG[item.status] || ''}`, text: (STATUSES.find(s => s[0] === item.status) || ['', 'Draft'])[1] })),
        item.body ? h('div', { class: 'item-body', text: item.body }) : null,
        h('div', { class: 'item-meta' },
          item.when ? h('span', { text: iso ? `${fmtDate(iso)} · ${tLabel(iso, set.releaseDate) || relativeDay(iso)}` : item.when }) : null,
          item.media?.length ? h('span', { text: `${item.media.length} attachment${item.media.length > 1 ? 's' : ''}` }) : null,
          item.tags ? h('span', { text: item.tags }) : null,
          type.limit ? h('span', { text: `${(item.body || '').length}/${type.limit}` }) : null)));
    });
    wrap.append(list);
  };

  draw();
  return wrap;
}

/* ---------------------------------------------------------- */
/*  checklist                                                  */
/* ---------------------------------------------------------- */

export function checklist(lines, doneMap, slice, opts = {}) {
  const wrap = h('div');
  const draw = () => {
    clear(wrap);
    const done = lines.filter((_, i) => doneMap[opts.prefix ? opts.prefix + i : i]).length;
    wrap.append(h('div', { class: 'row', style: { marginBottom: '10px' } },
      h('div', { style: { flex: 1 } }, progressBar(done / (lines.length || 1) * 100)),
      h('span', { class: 'small mono muted', text: `${done}/${lines.length}` })));
    lines.forEach((line, i) => {
      const k = opts.prefix ? opts.prefix + i : String(i);
      wrap.append(checkbox(line, doneMap, k, { slice, onChange: () => { opts.onChange?.(); draw(); } }));
    });
  };
  draw();
  return wrap;
}

export function progressBar(pct) {
  return h('div', { class: 'prog' }, h('i', { style: { width: `${Math.max(0, Math.min(100, pct))}%` } }));
}

/* ---------------------------------------------------------- */
/*  notes panel                                                */
/* ---------------------------------------------------------- */

export function notesPanel(store, slice, label = 'Notes') {
  return card(
    cardHead(label),
    field(null, store, 'notes', {
      slice, multiline: true, tall: true, autogrow: true,
      placeholder: 'Anything at all — half-thoughts, links, reminders. Saved as you type.',
    }));
}

/* ---------------------------------------------------------- */
/*  info panel                                                 */
/* ---------------------------------------------------------- */

export function infoPanel(sections) {
  const wrap = h('div');
  let open = 0;
  const draw = () => {
    clear(wrap);
    wrap.append(h('div', { class: 'row', style: { marginBottom: '14px' } },
      sections.map((s, i) =>
        h('button', { class: `chip ${i === open ? 'on' : ''}`, onClick: () => { open = i; draw(); } }, s.title))));
    wrap.append(card(prose(sections[open].body)));
  };
  draw();
  return wrap;
}

/* ---------------------------------------------------------- */
/*  link list                                                  */
/* ---------------------------------------------------------- */

export function linkList(links) {
  return h('div', { class: 'list' }, links.map(l =>
    h('a', { class: 'item', href: l.url, target: '_blank', rel: 'noopener', style: { display: 'block', color: 'inherit', textDecoration: 'none' } },
      h('div', { class: 'item-head' },
        h('span', { html: icon('link'), style: { color: 'var(--fg-3)' } }),
        h('span', { class: 'item-title', text: l.name }),
        l.tag ? h('span', { class: `tag ${l.tagCls || ''}`, text: l.tag }) : null),
      l.note ? h('div', { class: 'item-meta' }, h('span', { text: l.note })) : null)));
}

/* ---------------------------------------------------------- */
/*  sortable simple rows (for tables you edit in place)        */
/* ---------------------------------------------------------- */

export function rowActions(arr, i, slice, onChange) {
  return h('div', { class: 'row', style: { gap: '2px' } },
    h('button', { class: 'icon-btn', title: 'Move up', onClick: () => { move(arr, i, i - 1); S.touch(slice); onChange(); }, html: '↑' }),
    h('button', { class: 'icon-btn', title: 'Move down', onClick: () => { move(arr, i, i + 1); S.touch(slice); onChange(); }, html: '↓' }),
    h('button', { class: 'icon-btn', title: 'Delete', onClick: () => confirmDelete('this row', () => { arr.splice(i, 1); S.touch(slice); onChange(); }), html: icon('trash') }));
}
