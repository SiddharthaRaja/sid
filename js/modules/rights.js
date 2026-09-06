/* ============================================================
   rights.js — registrations tracker, works register,
   country copyright table, reference
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, uid, btn, card, cardHead, empty, field, modal, subtabs, selectField,
  fmtDate, resolveDate, tLabel, todayISO, confirmDelete, copy,
} from '../ui.js';
import { REGISTRATIONS_SEED, COUNTRY_COPYRIGHT, RIGHTS_INFO } from '../data/rights.js';
import { infoPanel, notesPanel, progressBar, scheduleRow } from './shared.js';

export function renderRights(sub) {
  const root = h('div');
  const st = S.get('rights');
  const set = S.get('settings');
  if (!st.registrations) { st.registrations = REGISTRATIONS_SEED.map(r => ({ ...r })); S.touch('rights'); }
  st.works = st.works || [];

  let tab = ['registrations', 'works', 'countries', 'info', 'notes'].includes(sub) ? sub : 'registrations';

  const draw = () => {
    clear(root);
    const done = st.registrations.filter(r => r.done).length;

    root.append(h('div', { class: 'page-head' },
      h('div', {}, h('h1', { text: 'Rights & licensing' }),
        h('div', { class: 'sub', text: `${done} of ${st.registrations.length} registrations complete` })),
      h('div', { class: 'spacer' })));

    root.append(subtabs([
      ['registrations', 'Registrations'], ['works', 'Works & codes'],
      ['countries', 'Copyright by country'], ['info', 'Info'], ['notes', 'Notes'],
    ], tab, k => { tab = k; draw(); }));

    if (tab === 'info')      { root.append(infoPanel(RIGHTS_INFO)); return; }
    if (tab === 'notes')     { root.append(notesPanel(st, 'rights', 'Rights notes')); return; }
    if (tab === 'countries') { root.append(countries()); return; }
    if (tab === 'works')     { root.append(works()); return; }

    /* registrations */
    root.append(card(h('div', { class: 'row' },
      h('div', { style: { flex: 1 } }, progressBar(done / st.registrations.length * 100)),
      h('span', { class: 'small mono muted', text: `${done}/${st.registrations.length}` }))));

    const list = h('div', { class: 'list' });
    st.registrations
      .slice()
      .sort((a, b) => order(a.when) - order(b.when))
      .forEach(r => {
        const iso = resolveDate(r.when, set.releaseDate);
        list.append(h('div', { class: 'item' },
          h('div', { class: 'row', style: { alignItems: 'flex-start', gap: '9px' } },
            h('input', {
              type: 'checkbox', checked: !!r.done, style: { marginTop: '4px', accentColor: 'var(--accent)', width: '16px', height: '16px' },
              onChange: (e) => { r.done = e.target.checked; S.touch('rights'); draw(); },
            }),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { class: 'row', style: { gap: '7px' } },
                h('span', { style: { fontWeight: 500, textDecoration: r.done ? 'line-through' : '', opacity: r.done ? .55 : 1 }, text: r.name }),
                h('span', { class: 'tag mono', text: r.when }),
                iso ? h('span', { class: 'small muted', text: fmtDate(iso) }) : null,
                h('span', { class: 'tag', text: r.cost })),
              h('div', { class: 'small muted', style: { marginTop: '4px' } }, r.note),
              h('div', { class: 'item-meta' },
                h('span', { text: r.body }),
                h('span', { text: `via ${r.who}` }),
                r.url ? h('a', { href: r.url, target: '_blank', rel: 'noopener', text: 'open' }) : null,
                h('button', { class: 'btn btn-sm btn-ghost', onClick: () => openReg(r, draw) }, 'edit'))))));
      });
    root.append(list);
    root.append(h('div', { style: { marginTop: '12px' } },
      btn('Add registration', () => openReg(null, draw), { cls: 'btn-sm', icon: 'plus' })));
  };

  const order = (w) => {
    const m = String(w).match(/^T\s*([+-]\s*\d+)?$/i);
    return m ? (m[1] ? parseInt(m[1].replace(/\s/g, ''), 10) : 0) : 9999;
  };

  /* ---------- works & codes ---------- */

  function works() {
    const box = h('div');

    box.append(card(
      cardHead('This release'),
      h('div', { class: 'grid g2' },
        field('Song title', set, 'song', { slice: 'settings' }),
        field('Artist name (exact capitalisation)', set, 'artist', { slice: 'settings' }),
        field('ISRC', set, 'isrc', { slice: 'settings', placeholder: 'IN-A01-26-00001', cls: 'mono' }),
        field('UPC / EAN', set, 'upc', { slice: 'settings', cls: 'mono' }),
        field('Label name', set, 'label', { slice: 'settings' }),
        field('PRO', set, 'pro', { slice: 'settings' }),
        field('Publisher / admin', set, 'publisher', { slice: 'settings' }),
        field('Distributor', set, 'distributor', { slice: 'settings' })),
      h('p', { class: 'small muted' },
        'One ISRC per recording, forever. The radio edit, instrumental and acoustic each get their own — re-using one splits your stream counts.')));

    box.append(card(
      cardHead('Every recording and its code',
        btn('Add version', () => { st.works.push({ id: uid(), title: '', version: '', isrc: '', duration: '', writers: '', splits: '', producer: '', notes: '' }); S.touch('rights'); draw(); }, { cls: 'btn-sm', icon: 'plus' })),
      st.works.length
        ? h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
            h('thead', {}, h('tr', {}, ['Title', 'Version', 'ISRC', 'Length', 'Writers', 'Splits', ''].map(t => h('th', { text: t })))),
            h('tbody', {}, st.works.map((w, i) => h('tr', {},
              ...['title', 'version', 'isrc', 'duration', 'writers', 'splits'].map(k =>
                h('td', {}, h('input', {
                  class: 'inp', style: { padding: '4px 6px', minWidth: k === 'isrc' ? '140px' : '90px' },
                  value: w[k] || '',
                  onInput: (e) => { w[k] = e.target.value; S.touch('rights'); },
                }))),
              h('td', {}, h('button', { class: 'icon-btn', html: '&times;', onClick: () => confirmDelete('this version', () => { st.works.splice(i, 1); S.touch('rights'); draw(); }) })))))))
        : empty('No versions logged', 'Add the master, the radio edit, the instrumental and the a cappella as separate rows — each needs its own ISRC.')));

    box.append(card(
      cardHead('Split sheet'),
      h('p', { class: 'small muted' }, 'Must total 100%. Signed and dated by every contributor, with legal names, PAN/SSN, PRO affiliation and role. This is the single most common cause of independent-artist litigation.'),
      field(null, st, 'splitSheet', { slice: 'rights', multiline: true, tall: true,
        placeholder: 'Name · legal name · PAN · PRO · role (music / lyrics / production) · % of composition' })));

    return box;
  }

  /* ---------- countries ---------- */

  function countries() {
    return h('div',
      card(h('p', { class: 'small muted', style: { margin: 0 } },
        'You already own the copyright — it exists the moment the work is fixed in tangible form, in 181 Berne Convention countries, with no registration required. What registration buys you is evidence and enforcement power, and in the US, the right to statutory damages.')),
      card(cardHead('Where registration is worth doing'),
        h('div', { class: 'table-wrap' },
          h('table', { class: 'tbl' },
            h('thead', {}, h('tr', {}, ['Country', 'Registry', 'Needed?', 'Cost', 'Why', ''].map(t => h('th', { text: t })))),
            h('tbody', {}, COUNTRY_COPYRIGHT.map(c => h('tr', {},
              h('td', { style: { fontWeight: 500 }, text: c.country }),
              h('td', { class: 'muted', text: c.registry }),
              h('td', { text: c.need }),
              h('td', { class: 'mono', text: c.cost }),
              h('td', { class: 'small', text: c.why }),
              h('td', {}, c.url ? h('a', { href: c.url, target: '_blank', rel: 'noopener', text: 'open' }) : ''))))))));
  }

  /* ---------- editor ---------- */

  function openReg(existing, redraw) {
    const isNew = !existing;
    const r = existing || { id: uid(), name: '', body: 'Composition', when: 'T-30', cost: 'Free', who: '', url: '', note: '', done: false };
    if (isNew) { st.registrations.push(r); S.touch('rights'); }
    modal({
      title: isNew ? 'New registration' : r.name,
      body: h('div',
        field('Name', r, 'name', { slice: 'rights' }),
        h('div', { class: 'grid g2' },
          selectField('Applies to', r, 'body', ['Composition', 'Lyrics', 'Master', 'Both', 'Performer rights', 'Composition (performance)', 'Composition (mechanical)', 'Master (digital performance)'], { slice: 'rights' }),
          field('Cost', r, 'cost', { slice: 'rights' })),
        scheduleRow(r, 'rights'),
        field('Organisation', r, 'who', { slice: 'rights' }),
        field('URL', r, 'url', { slice: 'rights' }),
        field('Note', r, 'note', { slice: 'rights', multiline: true })),
      actions: [
        { label: 'Delete', cls: 'btn-danger btn-ghost', onClick: () => { st.registrations.splice(st.registrations.indexOf(r), 1); S.touch('rights'); redraw(); } },
        'spacer', { label: 'Done', cls: 'btn-primary', onClick: redraw },
      ],
      onClose: redraw,
    });
  }

  draw();
  return root;
}
