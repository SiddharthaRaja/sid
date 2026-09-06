/* ============================================================
   copy.js — the copy bank
   Bios, pitches, emails, messages and the evergreen bank.
   Each starts as the drafted version from the release plan with
   your details filled in; editing it keeps your version forever.
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, btn, card, cardHead, empty, field, subtabs, toast, copy, download,
  confirmDelete, uid,
} from '../ui.js';
import { COPY_BANK, fillTemplate, missingPlaceholders, splitHint } from '../data/templates.js';
import { icon } from '../icons.js';

export function renderCopy(sub) {
  const root = h('div');
  const st = S.get('copy');
  st.edits = st.edits || {};        // id -> your version
  st.done  = st.done  || {};        // id -> finalised

  const groups = COPY_BANK.map(g => g.group);
  const wanted = sub ? decodeURIComponent(sub) : '';
  let tab = groups.includes(wanted) ? wanted : groups[0];

  const draw = () => {
    clear(root);
    const set = S.get('settings');
    const total = COPY_BANK.reduce((a, g) => a + g.items.length, 0);
    const doneN = Object.values(st.done).filter(Boolean).length;

    root.append(h('div', { class: 'page-head' },
      h('div', {},
        h('h1', { text: 'Copy bank' }),
        h('div', { class: 'sub', text: `${doneN} of ${total} finalised · every bio, pitch, email and caption in one place` })),
      h('div', { class: 'spacer' }),
      h('div', { class: 'page-actions' },
        btn('Export all', exportAll, { cls: 'btn-sm' }))));

    const gaps = missingSettings(set);
    if (gaps.length) {
      root.append(card(
        h('div', { class: 'row' },
          h('span', { html: icon('info'), style: { color: 'var(--warn)' } }),
          h('div', { style: { flex: 1 } },
            h('div', { style: { fontWeight: 500 } }, 'Fill these in Settings and every piece below completes itself'),
            h('div', { class: 'small muted', text: gaps.map(g => g.label).join(' · ') })),
          h('a', { class: 'btn btn-sm', href: '#/settings' }, 'Open Settings'))));
    }

    root.append(subtabs(groups.map(g => [g, g]), tab, k => { tab = k; draw(); }));

    const group = COPY_BANK.find(g => g.group === tab);
    if (group.note) root.append(card(h('p', { class: 'small muted', style: { margin: 0 }, text: group.note })));

    group.items.forEach(item => root.append(piece(item, set)));
  };

  /* ---------- one piece of copy ---------- */

  function piece(item, set) {
    const split = splitHint(fillTemplate(item.body, set));
    const mine = st.edits[item.id];
    const value = mine !== undefined ? mine : split.body;

    const ta = h('textarea', {
      class: 'inp', style: { minHeight: '150px', lineHeight: '1.65' },
      value,
      onInput: (e) => {
        st.edits[item.id] = e.target.value;
        S.touch('copy');
        paint();
        grow();
      },
    });
    const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.max(ta.scrollHeight, 150) + 'px'; };
    setTimeout(grow, 0);

    const meta = h('div', { class: 'small muted', style: { marginTop: '6px' } });
    const warn = h('div', { class: 'small', style: { color: 'var(--warn)', marginTop: '4px' } });
    const paint = () => {
      const v = ta.value;
      meta.textContent = item.limit
        ? `${v.length} / ${item.limit} characters`
        : `${v.length} characters · ${v.trim().split(/\s+/).filter(Boolean).length} words`;
      meta.style.color = item.limit && v.length > item.limit ? 'var(--bad)' : '';
      const m = missingPlaceholders(v);
      warn.textContent = m.length ? `Still to write: ${m.map(k => '[' + k + ']').join(' ')}` : '';
    };
    paint();

    const isDone = !!st.done[item.id];
    const box = card(
      cardHead(item.label,
        item.limit ? h('span', { class: 'tag', text: `limit ${item.limit}` }) : null,
        h('label', { class: 'check', style: { margin: 0 } },
          h('input', {
            type: 'checkbox', checked: isDone,
            onChange: (e) => { st.done[item.id] = e.target.checked; S.touch('copy'); draw(); },
          }),
          h('span', { class: 'small', text: 'final' })),
        btn('Copy', () => copy(ta.value), { cls: 'btn-sm btn-ghost' }),
        mine !== undefined
          ? btn('Reset', () => { delete st.edits[item.id]; S.touch('copy'); draw(); }, { cls: 'btn-sm btn-ghost' })
          : null),
      ta, meta, warn,
      split.hint ? h('p', { class: 'small muted', style: { margin: '8px 0 0' }, text: split.hint }) : null);

    if (isDone) box.style.borderColor = 'var(--ok)';
    return box;
  }

  /* ---------- helpers ---------- */

  function missingSettings(set) {
    return [
      ['artist', 'Artist name'], ['song', 'Song title'], ['releaseDate', 'Release date'],
      ['link', 'Smart link'], ['city', 'City'], ['genre', 'Genre'],
      ['handle', 'Handle'], ['email', 'Artist email'], ['comps', 'For fans of'],
    ].filter(([k]) => !String(set[k] || '').trim()).map(([key, label]) => ({ key, label }));
  }

  function exportAll() {
    const set = S.get('settings');
    let out = `# ${set.artist || 'Artist'} — copy bank\n`;
    if (set.song) out += `## "${set.song}"\n`;
    out += `\n_Exported ${new Date().toLocaleDateString()}_\n`;
    COPY_BANK.forEach(g => {
      out += `\n\n---\n\n# ${g.group}\n`;
      g.items.forEach(it => {
        const v = st.edits[it.id] !== undefined ? st.edits[it.id] : splitHint(fillTemplate(it.body, set)).body;
        out += `\n\n## ${it.label}${st.done[it.id] ? ' ✓' : ''}\n\n${v}\n`;
      });
    });
    download(`${(set.artist || 'sid').toLowerCase().replace(/\W+/g, '-')}-copy-bank.md`, out, 'text/markdown');
  }

  draw();
  return root;
}
