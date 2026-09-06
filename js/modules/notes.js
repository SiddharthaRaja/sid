/* ============================================================
   notes.js — a plain notepad. Nothing clever, lots of room.
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, uid, btn, card, empty, field, modal, confirmDelete, todayISO, fmtDate, copy, toast,
} from '../ui.js';
import { mediaBlock } from './shared.js';
import { icon } from '../icons.js';

export function renderNotes() {
  const root = h('div');
  const st = S.get('notes');
  st.items = st.items || [];
  let q = '';

  const draw = () => {
    clear(root);

    root.append(h('div', { class: 'page-head' },
      h('div', {}, h('h1', { text: 'Notes' }),
        h('div', { class: 'sub', text: `${st.items.length} note${st.items.length === 1 ? '' : 's'}` })),
      h('div', { class: 'spacer' }),
      h('div', { class: 'page-actions' },
        h('input', { class: 'inp', style: { maxWidth: '200px' }, placeholder: 'Search…', value: q,
          onInput: e => { q = e.target.value; drawList(); } }),
        btn('New note', () => open(null), { cls: 'btn-primary btn-sm', icon: 'plus' }))));

    const listBox = h('div');
    root.append(listBox);

    function drawList() {
      clear(listBox);
      const needle = q.toLowerCase().trim();
      const shown = st.items
        .filter(n => !needle || (n.title + ' ' + n.body + ' ' + (n.tags || '')).toLowerCase().includes(needle))
        .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.updated || '').localeCompare(a.updated || ''));

      if (!shown.length) {
        listBox.append(empty(st.items.length ? 'Nothing matches' : 'No notes yet',
          st.items.length ? '' : 'Anything that does not belong to a platform, a shoot day or a filing goes here.'));
        return;
      }
      const grid = h('div', { class: 'grid g2' });
      shown.forEach(n => grid.append(h('div', { class: 'item', onClick: () => open(n) },
        h('div', { class: 'item-head' },
          n.pinned ? h('span', { text: '📌', style: { fontSize: '12px' } }) : null,
          h('span', { class: 'item-title', text: n.title || 'Untitled' })),
        n.body ? h('div', { class: 'item-body', text: n.body }) : null,
        h('div', { class: 'item-meta' },
          h('span', { text: fmtDate(n.updated || n.created) }),
          n.tags ? h('span', { text: n.tags }) : null,
          n.media?.length ? h('span', { text: `${n.media.length} attached` }) : null))));
      listBox.append(grid);
    }
    drawList();

    function open(existing) {
      const isNew = !existing;
      const n = existing || { id: uid(), title: '', body: '', tags: '', pinned: false, created: todayISO(), updated: todayISO(), media: [] };
      if (isNew) { st.items.unshift(n); S.touch('notes'); }

      modal({
        title: n.title || 'Note', wide: true,
        body: h('div',
          h('input', { class: 'inline-inp', style: { fontSize: '18px', marginBottom: '10px' }, placeholder: 'Title',
            value: n.title || '', onInput: e => { n.title = e.target.value; n.updated = todayISO(); S.touch('notes'); } }),
          field(null, n, 'body', { slice: 'notes', multiline: true, tall: true, autogrow: true,
            placeholder: 'Write. It saves as you type.', onInput: () => { n.updated = todayISO(); } }),
          h('div', { class: 'grid g2' },
            field('Tags', n, 'tags', { slice: 'notes', placeholder: 'lyrics, admin, ideas' }),
            h('label', { class: 'check', style: { marginTop: '22px' } },
              h('input', { type: 'checkbox', checked: !!n.pinned, onChange: e => { n.pinned = e.target.checked; S.touch('notes'); } }),
              h('span', { text: 'Pin to the top' }))),
          h('label', { class: 'field' }, h('span', { class: 'lab', text: 'Attachments' }), mediaBlock(n, 'notes', 'notes'))),
        actions: [
          { label: 'Copy', cls: 'btn-ghost', keepOpen: true, onClick: () => copy(n.body || '') },
          { label: 'Delete', cls: 'btn-danger btn-ghost', onClick: () => { st.items.splice(st.items.indexOf(n), 1); S.touch('notes'); drawList(); } },
          'spacer',
          { label: 'Done', cls: 'btn-primary', onClick: drawList },
        ],
        onClose: drawList,
      });
    }
  };

  draw();
  return root;
}
