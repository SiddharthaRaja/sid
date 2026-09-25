/* ============================================================
   shared.js — pieces reused by every module
   ============================================================ */

import * as S from '../store.js';
import * as B from '../backend.js';
import {
  h, $, $$, clear, uid, toast, modal, field, selectField, checkbox, btn, card, cardHead,
  empty, prose, fmtDate, tLabel, resolveDate, relativeDay, todayISO, confirmDelete, copy, move,
  addDays, daysBetween,
  removeFrom
} from '../ui.js';
import { icon } from '../icons.js';
import { TEMPLATES, fillTemplate, missingPlaceholders, splitHint } from '../data/templates.js';
import { writingAids } from './compose.js';
import { mediaFromUrl } from '../drive.js';
import { due as diaryDue, diaryNo, DIARY_TRACKS, written as diaryWritten } from '../diary.js';

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
        if (m.kind === 'link' || (m.external && m.kind === 'video')) {
          /* a pasted link we cannot preview — show it as a link, which
             is honest and still opens the thing */
          cell.append(h('a', { class: 'linkcell', href: m.open || m.url, target: '_blank', rel: 'noopener',
            onClick: (e) => e.stopPropagation() },
            h('span', { html: icon('epk') }),
            h('span', { class: 'lc-name', text: m.name || 'link' })));
        } else if (m.kind === 'video') {
          cell.append(h('video', { src: m.url, muted: true, playsinline: true, preload: 'metadata',
            onClick: (e) => { e.target.paused ? e.target.play() : e.target.pause(); } }));
        } else if (m.kind === 'audio') {
          cell.append(h('div', { style: { display: 'grid', placeItems: 'center', height: '100%' },
            html: icon('soundcloud') }));
        } else {
          cell.append(h('img', { src: m.url, alt: m.alt || m.name, loading: 'lazy',
            onClick: () => window.open(m.open || m.url, '_blank'),
            onError: (e) => {
              /* a Drive file that is not shared, or a dead link */
              e.target.replaceWith(h('a', { class: 'linkcell', href: m.open || m.url, target: '_blank', rel: 'noopener' },
                h('span', { html: icon('epk') }),
                h('span', { class: 'lc-name', text: 'open' })));
            } }));
        }
        cell.append(h('span', { class: 'kind', text: m.kind }));
        if (m.kind === 'image') {
          /* alt text is a search field on Instagram and the only way a
             blind listener knows what the picture is. Ten seconds. */
          cell.append(h('input', {
            class: 'alt', value: m.alt || '', placeholder: 'alt text…',
            onClick: (e) => e.stopPropagation(),
            onInput: (e) => { m.alt = e.target.value; S.touch(slice); },
          }));
        }
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

    /* Inline rather than a modal: this often runs *inside* the item
       editor, and the app has a single modal root — a second modal
       would replace the first and take the attachment grid with it. */
    const linkRow = h('div', { class: 'linkrow', hidden: true });
    const linkInp = h('input', { class: 'inp', placeholder: 'https://drive.google.com/file/d/…' });
    const nameInp = h('input', { class: 'inp', style: { maxWidth: '150px' }, placeholder: 'what it is' });
    const addLink = () => {
      const m = mediaFromUrl(linkInp.value, nameInp.value);
      if (!m) { linkInp.focus(); return; }
      obj.media.push(m);
      S.touch(slice);
      draw();
    };
    linkInp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } });
    linkRow.append(linkInp, nameInp,
      btn('Add', addLink, { cls: 'btn-sm btn-primary' }),
      btn('Cancel', () => { linkRow.hidden = true; }, { cls: 'btn-sm btn-ghost' }));

    const linkBtn = btn('Paste a link instead', () => {
      linkRow.hidden = false;
      linkInp.focus();
    }, { cls: 'btn-sm btn-ghost' });

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

    wrap.append(input, drop,
      h('div', { class: 'row', style: { marginTop: '7px' } }, linkBtn),
      linkRow,
      h('div', { class: 'small muted', style: { marginTop: '5px' },
        text: 'A Google Drive share link previews here like an upload, needs no permission, and never expires.' }));
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

  const planningMode = () => S.get('settings').mode === 'planning';
  let mode = isT(item[key]) ? 'rel' : isISO(item[key]) ? 'abs' : (opts.defaultMode || 'rel');
  if (planningMode() && mode === 'abs' && !isISO(item[key])) mode = 'rel';

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

    /* mode switch — planning mode offers offsets only, since there
       is no release date for a calendar date to sit beside */
    const planning = planningMode();
    box.append(h('div', { class: 'seg' },
      h('button', { class: mode === 'rel' ? 'on' : '', onClick: () => {
        // carry a calendar date across as its offset
        if (mode !== 'rel') {
          mode = 'rel';
          if (isISO(item[key]) && rel) return commit(asT(daysBetween(rel, item[key])));
          draw();
        }
      } }, planning ? 'Days from release' : 'Relative to release'),
      planning ? null : h('button', { class: mode === 'abs' ? 'on' : '', onClick: () => {
        if (mode !== 'abs') {
          mode = 'abs';
          if (isT(item[key]) && rel) return commit(addDays(rel, offsetOf(item[key])));
          draw();
        }
      } }, 'Calendar date'),
      opts.required ? null : h('button', { class: !item[key] ? 'on' : '', onClick: () => commit('') }, 'No date')));

    if (planning && isISO(item[key])) {
      box.append(h('div', { class: 'warnline' },
        'This one is written as a fixed calendar date. It stays put — set a release date to convert it to an offset.'));
      box.append(h('div', { class: 'row', style: { marginTop: '8px' } },
        h('input', {
          type: 'date', class: 'inp', style: { maxWidth: '175px' }, value: item[key],
          onChange: (e) => commit(e.target.value),
        }),
        h('button', { class: 'chip', onClick: () => commit('T-30') }, 'Make it T-30 instead')));
    }

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
        if (planningMode()) {
          const n = isT(item[key]) ? offsetOf(item[key]) : null;
          resolved.append(h('span', { class: 'big', text: isT(item[key]) ? String(item[key]) : String(item[key]) }));
          resolved.append(h('span', { class: 'muted small', text: n === null ? '' :
            n === 0 ? 'release day itself' :
            n < 0 ? `${-n} day${n === -1 ? '' : 's'} before release` : `${n} day${n === 1 ? '' : 's'} after release` }));
          warn.textContent = 'Planning mode — this becomes a real day the moment you set a release date.';
          return;
        }
        if (!relDate) warn.textContent = 'Set a release date on the Release tab and this resolves to a real day.';
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

/* The same diary entry gets written three times, once in each
   platform's voice — never pasted across, which is the whole point.
   What helps is seeing the other two while you write this one, so
   you are rewriting a thought rather than trying to recall it. Read
   only, folded shut, and no copy button anywhere near it. */
function siblingDiary(item, pkey, tkey) {
  const n = diaryNo(item.title);
  if (n == null) return null;
  if (!DIARY_TRACKS.some(([p, t]) => p === pkey && t === tkey)) return null;

  const others = DIARY_TRACKS
    .filter(([p]) => p !== pkey)
    .map(([p, t, label]) => {
      const arr = (S.get(`p_${p}`).content || {})[t] || [];
      const sib = arr.find(x => diaryNo(x.title) === n);
      return { label, text: diaryWritten(sib) ? preview(sib).trim() : '' };
    })
    .filter(o => o.text);

  if (!others.length) return null;

  const box = h('div', { class: 'sib' });
  const panes = h('div', { class: 'sib-panes', hidden: true },
    others.map(o => h('div', { class: 'sib-pane' },
      h('div', { class: 'lab', text: o.label }),
      h('div', { class: 'sib-text', text: o.text }))));

  box.append(
    h('button', {
      class: 'sib-toggle',
      type: 'button',
      onClick: () => {
        panes.hidden = !panes.hidden;
        box.querySelector('.sib-caret').textContent = panes.hidden ? '▸' : '▾';
      },
    },
      h('span', { class: 'sib-caret', text: '▸' }),
      h('span', { text: `Diary ${n} on ${others.map(o => o.label).join(' and ')}` })),
    panes);
  return box;
}

export function itemEditor({ item, slice, type, pathHint, platformKey, onSave, onDelete, onDuplicate }) {
  const body = h('div');
  const pkey = platformKey || String(pathHint || '').split('/')[0] || '';

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
    onInput: () => { paintCount(); aids.refresh(); },
  });
  paintCount();

  /* the linter, the fold preview, the phrase bank and the optional
     assistant — all reading and writing this one textarea */
  const aids = writingAids({
    getText: () => item.body || '',
    setText: (t) => {
      item.body = t;
      const ta = bodyInput.querySelector ? bodyInput.querySelector('textarea') : null;
      (ta || bodyInput).value = t;
      S.touch(slice); paintCount();
    },
    platform: pkey, type: type.key, exclude: item,
  });
  aids.setLimit(type.limit || 0);
  aids.refresh();

  /* ---- A/B: a second version, and which one actually went out ---- */
  const variantBox = h('div');
  const drawVariant = () => {
    clear(variantBox);
    if (!item.variantB && !item.showB) {
      variantBox.append(btn('Write a B version', () => { item.showB = true; S.touch(slice); drawVariant(); }, { cls: 'btn-sm btn-ghost' }));
      return;
    }
    variantBox.append(
      field('Version B', item, 'variantB', { slice, multiline: true,
        placeholder: 'A different angle on the same post. Post one, note which, and the weekly review tells you which shape works.' }),
      h('div', { class: 'row' },
        h('span', { class: 'small muted', text: 'Which went out:' }),
        ['', 'A', 'B'].map(v => h('button', {
          class: `chip ${(item.posted_variant || '') === v ? 'on' : ''}`,
          onClick: () => { item.posted_variant = v; S.touch(slice); drawVariant(); },
        }, v || 'not yet')),
        item.variantB ? btn('Copy B', () => copy(item.variantB), { cls: 'btn-sm btn-ghost' }) : null));
  };
  drawVariant();

  /* .append() is the native DOM one: handed a null it appends the
     STRING "null" and puts the word in the middle of the sheet. Every
     optional row below can legitimately be null, so they are filtered
     out rather than trusted. */
  body.append(...[
    field('Title / label', item, 'title', { slice, placeholder: 'Internal name — not posted' }),
    h('label', { class: 'field' },
      h('span', { class: 'lab', text: type.limit ? `Text (limit ${type.limit})` : 'Text' }),
      bodyInput, counter, gaps),
    /* The other two versions sit directly under the box you are
       typing in, not above the title — you glance down at them
       while writing rather than scrolling back up. */
    siblingDiary(item, pkey, type.key),
    aids.el,
    variantBox,
    type.hint ? h('p', { class: 'small muted', text: type.hint }) : null,
    h('div', { class: 'grid g2' },
      selectField('Status', item, 'status', STATUSES, { slice }),
      field('Tags', item, 'tags', { slice, placeholder: 'hook, bts, lyric' })),
    scheduleRow(item, slice),
    type.media !== false ? h('label', { class: 'field' },
      h('span', { class: 'lab', text: 'Attachments' }), mediaBlock(item, slice, pathHint)) : null,
    field('Notes', item, 'notes', { slice, multiline: true, placeholder: 'Anything you need to remember about this one' }),
  ].filter(Boolean));

  return modal({
    title: item.title || `New ${type.label.replace(/s$/, '').toLowerCase()}`,
    body, wide: true,
    actions: [
      { label: 'Copy text', cls: 'btn-ghost', keepOpen: true, onClick: () => copy(item.body || '') },
      /* a variant of something that worked is the cheapest post you
         will ever write — one tap, then change the hook */
      { label: 'Duplicate', cls: 'btn-ghost', onClick: () => {
        const store = S.get(slice);
        const arr = (store.content && store.content[type.key]) || null;
        if (!arr) return;
        arr.push({
          ...JSON.parse(JSON.stringify(item)),
          id: uid(), status: 'draft', postedAt: '', posted_variant: '',
          title: `${item.title || 'Untitled'} (copy)`,
        });
        S.touch(slice);
        toast('Duplicated as a draft');
        onDuplicate?.();
        onSave?.();
      } },
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

/* A list stops being a list somewhere around thirty rows and becomes
   a scroll. Past that, finding one thing needs a search box, and
   drawing all of them needs a reason. Both kick in on their own. */
const SEARCH_FROM = 8;
const PAGE = 30;

/**
 * Does this item match what was typed?
 *
 * A bare number means the numbered entry, and only that one — typing
 * 7 in a hundred-entry diary has to give you Diary 7, not Diary 7 and
 * 17 and 70 and every body that happens to contain a seven. Anything
 * else is an ordinary substring search across the whole item.
 */
function matches(item, q) {
  if (!q) return true;
  if (/^\d{1,3}$/.test(q)) {
    const m = String(item.title || '').match(/\b(\d{1,3})\b/);
    return !!m && m[1] === q;
  }
  const needle = q.toLowerCase();
  return [item.title, item.body, item.tags, item.notes, item.when]
    .some(v => String(v || '').toLowerCase().includes(needle));
}

/* The diary convention is that the first line of the body is the
   entry's number — which the title already says. Repeating it in the
   preview costs a line per row and tells you nothing, so the row
   shows the writing instead. The body itself is never touched. */
function preview(item) {
  const body = String(item.body || '');
  const n = diaryNo(item.title);
  if (n == null) return body;
  const nl = body.indexOf('\n');
  if (nl === -1) return body.trim() === String(n) ? '' : body;
  return body.slice(0, nl).trim() === String(n) ? body.slice(nl + 1) : body;
}

export function contentList({ slice, store, type, pathHint, platformKey, onChanged, openId }) {
  const wrap = h('div');
  store.content = store.content || {};
  store.content[type.key] = store.content[type.key] || [];
  const items = store.content[type.key];

  let filter = 'all';
  let query = '';
  let limit = PAGE;

  const open = (item) => itemEditor({
    item, slice, type, pathHint, platformKey,
    onSave: draw,
    onDelete: () => { removeFrom(items, item); S.touch(slice); draw(); },
  });

  const add = () => {
    const item = { id: uid(), title: '', body: '', status: 'draft', when: '', tags: '', notes: '', media: [] };
    items.unshift(item); S.touch(slice); open(item);
  };

  /* The diary run, if this tab holds one: which number is due today
     and where it sits in this list. */
  const dueHere = () => {
    const d = diaryDue();
    if (!d || d.n == null) return null;
    const t = d.tracks.find(x => x.pKey === platformKey && x.tKey === type.key);
    if (!t || !t.id) return null;
    return { n: d.n, id: t.id, written: t.today };
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
      /* On a long list, a row of statuses that all read zero is two
         lines of screen spent saying nothing. Only the ones you have
         something in are offered — plus whichever is selected, so the
         filter never vanishes from under you. */
      [['all', 'All'], ...STATUSES]
        .map(([k, l]) => [k, l, k === 'all' ? items.length : items.filter(i => i.status === k).length])
        .filter(([k, , n]) => items.length < SEARCH_FROM || n > 0 || filter === k)
        .map(([k, l, n]) =>
          h('button', { class: `chip ${filter === k ? 'on' : ''}`, onClick: () => { filter = k; draw(); } },
            `${l}${k === 'all' ? '' : ' ' + n}`))));

    /* Search, and a one-tap jump to today's diary entry. Neither is
       shown on a short list, where they would just be clutter. */
    if (items.length >= SEARCH_FROM) {
      const box = h('input', {
        class: 'inp', type: 'search', value: query, placeholder: `Search ${items.length} ${type.label.toLowerCase()}…`,
        onInput: (e) => {
          query = e.target.value;
          limit = PAGE;
          paintList();
          /* keep the caret where it was — only the list below redraws */
        },
      });
      const d = dueHere();
      wrap.append(h('div', { class: 'row list-tools', style: { marginBottom: '10px' } },
        h('div', { style: { flex: 1 } }, box),
        d ? h('button', {
          class: `chip ${d.written ? 'on' : 'due'}`,
          title: d.written ? `Diary ${d.n} — written` : `Diary ${d.n} is due today`,
          onClick: () => { const it = items.find(x => x.id === d.id); if (it) open(it); },
        }, d.written ? `✓ ${d.n}` : `Today · ${d.n}`) : null));
    }

    const listBox = h('div');
    wrap.append(listBox);

    function paintList() {
      clear(listBox);
      const shown = items.filter(i =>
        (filter === 'all' || i.status === filter) && matches(i, query.trim()));

      if (!shown.length) {
        listBox.append(empty(
          query.trim() ? 'Nothing matches that'
            : items.length ? 'Nothing with that status' : `No ${type.label.toLowerCase()} yet`,
          items.length ? '' : type.hint || 'Start banking them now so posting later takes no thought.'));
        return;
      }

      const page = shown.slice(0, limit);
      const list = h('div', { class: 'list' });
      page.forEach(item => {
        const iso = resolveDate(item.when, set.releaseDate);
        list.append(h('div', { class: 'item', onClick: () => open(item) },
          h('div', { class: 'item-head' },
            h('span', { class: 'item-title', text: item.title || (item.body || '').slice(0, 60) || 'Untitled' }),
            h('span', { class: `tag ${STATUS_TAG[item.status] || ''}`, text: (STATUSES.find(s => s[0] === item.status) || ['', 'Draft'])[1] })),
          preview(item) ? h('div', { class: 'item-body', text: preview(item) }) : null,
          h('div', { class: 'item-meta' },
            item.when ? h('span', { text: iso ? `${fmtDate(iso)} · ${tLabel(iso, set.releaseDate) || relativeDay(iso)}` : item.when }) : null,
            item.media?.length ? h('span', { text: `${item.media.length} attachment${item.media.length > 1 ? 's' : ''}` }) : null,
            item.tags ? h('span', { text: item.tags }) : null,
            type.limit ? h('span', { text: `${(item.body || '').length}/${type.limit}` }) : null)));
      });
      listBox.append(list);

      if (shown.length > page.length) {
        listBox.append(h('div', { class: 'row', style: { justifyContent: 'center', marginTop: '12px' } },
          btn(`Show ${Math.min(PAGE, shown.length - page.length)} more of ${shown.length - page.length}`,
            () => { limit += PAGE; paintList(); }, { cls: 'btn-sm btn-ghost' })));
      }
    }

    paintList();
  };

  draw();

  /* A deep link — #/p/x/thread/<id> — lands here. Open it once the
     list exists, so closing the editor leaves the list behind it. */
  if (openId) {
    const it = items.find(x => x.id === openId);
    if (it) setTimeout(() => open(it), 0);
  }
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
