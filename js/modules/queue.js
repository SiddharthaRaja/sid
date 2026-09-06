/* ============================================================
   queue.js — the daily post queue
   The screen you open in the morning: everything due, across
   every platform, with copy / mark-posted / snooze on the row.
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, btn, card, cardHead, empty, stat, toast, copy, confirmDelete,
  fmtDate, tLabel, resolveDate, relativeDay, todayISO, addDays, daysBetween, uid,
} from '../ui.js';
import { PLATFORMS, PLATFORM_MAP } from '../data/platforms.js';
import { icon, PCOLORS } from '../icons.js';
import { itemEditor, STATUSES, STATUS_TAG } from './shared.js';

/* Shift a date by n days, keeping whichever notation it was written in. */
export function shiftWhen(when, n) {
  const s = String(when || '').trim();
  const m = s.match(/^T\s*([+-]\s*\d+)?$/i);
  if (m) {
    const cur = m[1] ? parseInt(m[1].replace(/\s/g, ''), 10) : 0;
    const next = cur + n;
    return next === 0 ? 'T' : next > 0 ? `T+${next}` : `T${next}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return addDays(s, n);
  return s;
}

export function renderQueue(sub) {
  const root = h('div');
  const set = S.get('settings');
  const today = todayISO();

  let platformFilter = 'all';
  let readyOnly = false;
  let showLater = false;

  /* ---------- gather ---------- */

  const collect = () => {
    const rows = [];
    PLATFORMS.forEach(p => {
      const slice = `p_${p.key}`;
      const store = S.get(slice);
      Object.entries(store.content || {}).forEach(([typeKey, items]) => {
        const type = p.types.find(t => t.key === typeKey) || { key: typeKey, label: typeKey, limit: 0 };
        (items || []).forEach(item => rows.push({
          p, type, item, slice,
          iso: resolveDate(item.when, set.releaseDate),
        }));
      });
    });
    return rows;
  };

  const draw = () => {
    clear(root);
    const all = collect();

    const live = all.filter(r =>
      (platformFilter === 'all' || r.p.key === platformFilter) &&
      (!readyOnly || ['ready', 'scheduled'].includes(r.item.status)));

    const isOpen = (r) => r.item.status !== 'posted' && r.item.status !== 'parked';

    const overdue = live.filter(r => r.iso && r.iso < today && isOpen(r)).sort((a, b) => a.iso.localeCompare(b.iso));
    const todayRows = live.filter(r => r.iso === today).sort(byPlatform);
    const week = live.filter(r => r.iso && r.iso > today && r.iso <= addDays(today, 7) && isOpen(r))
      .sort((a, b) => a.iso.localeCompare(b.iso));
    const later = live.filter(r => r.iso && r.iso > addDays(today, 7) && isOpen(r))
      .sort((a, b) => a.iso.localeCompare(b.iso));
    const undated = live.filter(r => !r.iso && isOpen(r)).sort(byPlatform);

    const postedThisWeek = all.filter(r => {
      if (r.item.status !== 'posted') return false;
      const when = r.item.postedAt || r.iso;
      return when && when >= addDays(today, -7) && when <= today;
    }).length;

    /* header */
    root.append(h('div', { class: 'page-head' },
      h('div', {},
        h('h1', { text: 'Queue' }),
        h('div', { class: 'sub', text: set.releaseDate
          ? `${fmtDate(today, { long: true })} · ${tLabel(today, set.releaseDate)}`
          : fmtDate(today, { long: true }) })),
      h('div', { class: 'spacer' })));

    root.append(h('div', { class: 'grid g4' },
      stat('Due today', String(todayRows.filter(isOpen).length), todayRows.length !== todayRows.filter(isOpen).length
        ? `${todayRows.length - todayRows.filter(isOpen).length} already done` : ''),
      stat('Overdue', String(overdue.length), overdue.length ? 'oldest ' + relativeDay(overdue[0].iso) : 'nothing behind'),
      stat('Next 7 days', String(week.length), ''),
      stat('Posted this week', String(postedThisWeek), `${undated.length} banked with no date`)));

    /* filters */
    const withCounts = PLATFORMS.filter(p => all.some(r => r.p.key === p.key));
    root.append(h('div', { class: 'row', style: { margin: '16px 0 4px' } },
      h('button', { class: `chip ${platformFilter === 'all' ? 'on' : ''}`,
        onClick: () => { platformFilter = 'all'; draw(); } }, `All ${all.length}`),
      withCounts.map(p => h('button', {
        class: `chip ${platformFilter === p.key ? 'on' : ''}`,
        onClick: () => { platformFilter = p.key; draw(); },
      }, h('span', { class: 'dot', style: { background: PCOLORS[p.key] } }), p.name)),
      h('span', { style: { width: '8px' } }),
      h('button', { class: `chip ${readyOnly ? 'on' : ''}`, onClick: () => { readyOnly = !readyOnly; draw(); } },
        'Ready & scheduled only')));

    /* sections */
    if (overdue.length) root.append(section('Overdue', overdue, 'bad'));
    root.append(section(`Today — ${fmtDate(today, { long: true })}`, todayRows, null, todayRows.length
      ? null : 'Nothing due. A good day to bank three clips, or pull a template into a draft.'));
    if (week.length) root.append(section('Next 7 days', week));
    if (undated.length) root.append(section('Banked, no date yet', undated, null, null,
      'These are written but unscheduled. Give them a date and they appear above and on the calendar.'));

    if (later.length) {
      root.append(h('div', { style: { marginTop: '14px' } },
        btn(showLater ? `Hide the other ${later.length}` : `Show ${later.length} scheduled further out`,
          () => { showLater = !showLater; draw(); }, { cls: 'btn-sm btn-ghost' })));
      if (showLater) root.append(section('Later', later));
    }

    if (!all.length) {
      root.append(empty('Nothing in the bank yet',
        'Open a platform tab and use the Templates button — the drafted posts arrive already dated to their T-offset.'));
    }
  };

  const byPlatform = (a, b) =>
    PLATFORMS.indexOf(a.p) - PLATFORMS.indexOf(b.p) || (a.type.label || '').localeCompare(b.type.label || '');

  /* ---------- a section ---------- */

  function section(title, rows, tone, emptyMsg, note) {
    const box = card(
      cardHead(title, rows.length
        ? h('span', { class: `tag ${tone || ''}`, text: String(rows.length) })
        : null));
    if (note) box.append(h('p', { class: 'small muted', style: { marginTop: '-6px' }, text: note }));
    if (!rows.length) {
      box.append(h('div', { class: 'small muted', text: emptyMsg || '—' }));
      return box;
    }
    box.append(h('div', { class: 'list' }, rows.map(queueRow)));
    return box;
  }

  /* ---------- one row ---------- */

  function queueRow(r) {
    const { p, type, item, slice, iso } = r;
    const over = item.limit && (item.body || '').length > type.limit;
    const posted = item.status === 'posted';

    const open = () => itemEditor({
      item, slice, type, pathHint: `${p.key}/${type.key}`,
      onSave: draw,
      onDelete: () => {
        const arr = S.get(slice).content[type.key];
        arr.splice(arr.indexOf(item), 1);
        S.touch(slice); draw();
      },
    });

    const act = (label, fn, cls) => h('button', {
      class: `btn btn-sm ${cls || 'btn-ghost'}`,
      onClick: (e) => { e.stopPropagation(); fn(); },
    }, label);

    return h('div', {
      class: 'item',
      style: { borderLeft: `3px solid ${PCOLORS[p.key] || 'var(--fg-3)'}`, opacity: posted ? .6 : 1 },
      onClick: open,
    },
      h('div', { class: 'item-head' },
        h('span', { html: icon(p.icon), style: { color: PCOLORS[p.key], display: 'flex' } }),
        h('span', { class: 'item-title', text: item.title || (item.body || '').slice(0, 60) || 'Untitled',
          style: posted ? { textDecoration: 'line-through' } : {} }),
        h('span', { class: 'tag', text: type.label }),
        h('span', { class: `tag ${STATUS_TAG[item.status] || ''}`,
          text: (STATUSES.find(s => s[0] === item.status) || ['', 'Draft'])[1] })),

      item.body ? h('div', { class: 'item-body', text: item.body }) : null,

      h('div', { class: 'item-meta' },
        iso ? h('span', { text: `${fmtDate(iso)}${set.releaseDate ? ' · ' + tLabel(iso, set.releaseDate) : ''} · ${relativeDay(iso)}` })
            : h('span', { text: 'no date' }),
        item.media?.length ? h('span', { text: `${item.media.length} attachment${item.media.length > 1 ? 's' : ''}` }) : null,
        type.limit ? h('span', { style: over ? { color: 'var(--bad)' } : {},
          text: `${(item.body || '').length}/${type.limit}` }) : null,
        item.tags ? h('span', { text: item.tags }) : null),

      h('div', { class: 'row', style: { marginTop: '9px', gap: '6px' } },
        item.body ? act('Copy text', () => copy(item.body)) : null,
        posted
          ? act('Un-post', () => { item.status = 'ready'; delete item.postedAt; S.touch(slice); draw(); })
          : act('Mark posted', () => {
              item.status = 'posted';
              // the day you actually posted it, which is not always the day
              // it was scheduled for — the weekly review counts by this
              item.postedAt = today;
              if (!item.when) item.when = today;
              S.touch(slice); draw();
              toast('Marked posted');
            }, 'btn-primary'),
        !posted && item.when ? act('Snooze a day', () => {
          item.when = shiftWhen(item.when, 1); S.touch(slice); draw();
        }) : null,
        !posted && !item.when ? act('Schedule today', () => {
          item.when = today; item.status = item.status === 'draft' ? 'ready' : item.status;
          S.touch(slice); draw();
        }) : null,
        h('div', { style: { flex: 1 } }),
        h('a', { class: 'btn btn-sm btn-ghost', href: `#/p/${p.key}/${type.key}`,
          onClick: (e) => e.stopPropagation() }, p.name)));
  }

  draw();
  return root;
}
