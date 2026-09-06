/* ============================================================
   meta.js — the metadata master sheet

   One canonical record of everything a form will ask for, with a
   copy button on every field, a split table that refuses to lie
   about its arithmetic, and a readiness check that tells you what
   is missing before a distributor tells you.
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, uid, btn, card, cardHead, empty, field, subtabs, selectField, stat,
  copy, toast, download, confirmDelete, fmtDate, todayISO, daysBetween, progress,
} from '../ui.js';
import { META_GROUPS, META_INFO } from '../data/meta.js';
import { infoPanel, notesPanel } from './shared.js';
import { icon } from '../icons.js';

const ALL_FIELDS = META_GROUPS.flatMap(g => g.fields.map(f => ({ ...f, group: g.key })));

export function renderMeta(sub) {
  const root = h('div');
  const st = S.get('meta');
  const set = S.get('settings');
  st.v = st.v || {};
  st.splits = st.splits || [];
  st.masters = st.masters || [];

  const tabs = [
    ...META_GROUPS.map(g => [g.key, g.label]),
    ['splits', 'Splits'],
    ['check', 'Ready?'],
    ['info', 'Info'],
    ['notes', 'Notes'],
  ];
  let tab = tabs.some(t => t[0] === sub) ? sub : META_GROUPS[0].key;

  /* Settings already holds a few of these. Rather than keep two
     copies that drift, mirror them: the master sheet is the
     source of truth and writes back to settings. */
  const MIRROR = { title: 'song', artistName: 'artist', isrc: 'isrc', upc: 'upc',
    releaseDateISO: 'releaseDate', distributor: 'distributor', pro: 'pro',
    publisher: 'publisher', primaryGenre: 'genre', preSaveUrl: 'link' };

  const seedFromSettings = () => {
    let dirty = false;
    for (const [mk, sk] of Object.entries(MIRROR)) {
      if (!st.v[mk] && set[sk]) { st.v[mk] = set[sk]; dirty = true; }
    }
    if (dirty) S.touch('meta');
  };
  seedFromSettings();

  const write = (k, val) => {
    st.v[k] = val;
    S.touch('meta');
    if (MIRROR[k]) { set[MIRROR[k]] = val; S.touch('settings'); }
  };

  const draw = () => {
    clear(root);
    const { filled, total, missingRequired } = completeness();

    root.append(h('div', { class: 'page-head' },
      h('div', {},
        h('h1', { text: 'Metadata' }),
        h('div', { class: 'sub', text:
          `${filled} of ${total} fields · ${missingRequired.length ? `${missingRequired.length} required still blank` : 'all required fields filled'}` })),
      h('div', { class: 'spacer' }),
      h('div', { class: 'page-actions' },
        btn('Copy all', copyAll, { cls: 'btn-sm btn-ghost' }),
        btn('Export', exportSheet, { cls: 'btn-sm btn-ghost' }))));

    root.append(subtabs(tabs, tab, k => { tab = k; history.replaceState(null, '', `#/meta/${k}`); draw(); }));

    if (tab === 'info')   { root.append(infoPanel(META_INFO)); return; }
    if (tab === 'notes')  { root.append(notesPanel(st, 'meta', 'Metadata notes')); return; }
    if (tab === 'splits') { root.append(splitsPane()); return; }
    if (tab === 'check')  { root.append(checkPane()); return; }
    root.append(groupPane(META_GROUPS.find(g => g.key === tab)));
  };

  /* ---------------------------------------------------------- */
  /*  a field with a copy button                                 */
  /* ---------------------------------------------------------- */

  function metaField(f) {
    const val = st.v[f.key] ?? '';

    let input;
    if (f.kind === 'select') {
      input = h('select', { class: 'inp',
        onChange: e => { write(f.key, e.target.value); } },
        h('option', { value: '' }, '—'),
        f.options.map(o => h('option', { value: o, selected: val === o }, o)));
    } else if (f.multiline) {
      input = h('textarea', { class: 'inp tall', rows: 3, value: val,
        placeholder: f.placeholder || '',
        onInput: e => write(f.key, e.target.value) });
    } else {
      input = h('input', {
        class: `inp ${f.mono ? 'mono' : ''}`,
        type: f.kind === 'date' ? 'date' : 'text',
        value: val, placeholder: f.placeholder || '',
        onInput: e => write(f.key, e.target.value),
      });
    }

    const copyBtn = h('button', {
      class: 'icon-btn', title: `Copy ${f.label}`, 'aria-label': `Copy ${f.label}`,
      onClick: () => {
        const v = st.v[f.key];
        if (!v) { toast('Nothing to copy yet'); return; }
        copy(String(v));
      },
    }, h('span', { html: icon('copy'), style: { display: 'flex' } }));

    return h('div', { class: 'field' },
      h('div', { class: 'row', style: { gap: '6px', marginBottom: '2px' } },
        h('span', { class: 'lab', style: { margin: 0 }, text: f.label }),
        f.required ? h('span', { class: 'tag bad', text: 'required' }) : null,
        h('div', { style: { flex: 1 } }),
        copyBtn),
      input,
      f.hint ? h('div', { class: 'small muted', style: { marginTop: '4px' }, text: f.hint }) : null);
  }

  function groupPane(g) {
    const box = h('div');
    if (g.blurb) {
      box.append(h('p', { class: 'small muted', style: { marginTop: 0, maxWidth: '70ch' }, text: g.blurb }));
    }
    box.append(card(
      cardHead(g.label,
        btn('Copy this section', () => copySection(g), { cls: 'btn-sm btn-ghost' })),
      h('div', { class: 'grid g2' }, g.fields.map(metaField))));
    return box;
  }

  /* ---------------------------------------------------------- */
  /*  splits                                                     */
  /* ---------------------------------------------------------- */

  function splitTable(rows, key, label) {
    const total = rows.reduce((a, r) => a + (+r.pct || 0), 0);
    const ok = Math.abs(total - 100) < 0.005;

    const addRow = () => {
      rows.push({ id: uid(), name: '', role: key === 'splits' ? 'Composer' : 'Master owner',
        pro: '', ipi: '', pct: '', confirmed: false });
      S.touch('meta'); draw();
    };

    return card(
      cardHead(label,
        h('span', { class: `tag ${ok ? 'ok' : 'bad'}`, text: `${total.toFixed(2).replace(/\.00$/, '')}%` }),
        btn('Add writer', addRow, { cls: 'btn-sm', icon: 'plus' })),

      rows.length
        ? h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
            h('thead', {}, h('tr', {},
              ['Legal name', 'Role', 'PRO', 'IPI / CAE', '%', 'Confirmed', ''].map(t => h('th', { text: t })))),
            h('tbody', {}, rows.map((r, i) => h('tr', {},
              h('td', {}, h('input', { class: 'inline-inp', value: r.name || '', placeholder: 'Full legal name',
                onInput: e => { r.name = e.target.value; S.touch('meta'); } })),
              h('td', {}, h('input', { class: 'inline-inp', style: { width: '110px' }, value: r.role || '',
                onInput: e => { r.role = e.target.value; S.touch('meta'); } })),
              h('td', {}, h('input', { class: 'inline-inp', style: { width: '80px' }, value: r.pro || '',
                onInput: e => { r.pro = e.target.value; S.touch('meta'); } })),
              h('td', {}, h('input', { class: 'inline-inp mono', style: { width: '110px' }, value: r.ipi || '',
                onInput: e => { r.ipi = e.target.value; S.touch('meta'); } })),
              h('td', {}, h('input', { class: 'inline-inp tabular', type: 'number', style: { width: '70px' },
                value: r.pct ?? '', step: '0.01',
                onInput: e => { r.pct = e.target.value === '' ? '' : +e.target.value; S.touch('meta'); redrawTotals(); } })),
              h('td', {}, h('input', { type: 'checkbox', checked: !!r.confirmed,
                style: { accentColor: 'var(--accent)' },
                title: 'They have agreed to this in writing',
                onChange: e => { r.confirmed = e.target.checked; S.touch('meta'); } })),
              h('td', {}, h('button', { class: 'icon-btn', html: '&times;',
                onClick: () => confirmDelete('this row', () => { rows.splice(i, 1); S.touch('meta'); draw(); }) })))))))
        : h('p', { class: 'small muted', style: { margin: 0 },
            text: 'Even a solo release needs a row: you, 100%, with your PRO and IPI. That is the record a registration is checked against.' }),

      rows.length
        ? h('p', { class: `small`, style: { marginTop: '10px', marginBottom: 0, color: ok ? 'var(--ok)' : 'var(--bad)' },
            text: ok
              ? 'Totals 100% — this will pass registration.'
              : total > 100
                ? `Over by ${(total - 100).toFixed(2)}%. Registrations reject anything that is not exactly 100.`
                : `Short by ${(100 - total).toFixed(2)}%. Registrations reject anything that is not exactly 100.` })
        : null);

    function redrawTotals() { /* cheap: re-render the pane on the next tick */
      clearTimeout(redrawTotals._t);
      redrawTotals._t = setTimeout(draw, 600);
    }
  }

  function splitsPane() {
    const box = h('div');
    box.append(h('p', { class: 'small muted', style: { marginTop: 0, maxWidth: '70ch' } },
      'Two different things, two different revenue streams. The composition is the song as written and pays through your PRO and the MLC. The master is this specific recording and pays through your distributor. You can own all of one and half of the other.'));

    box.append(splitTable(st.splits, 'splits', 'Composition — who wrote the song'));
    box.append(splitTable(st.masters, 'masters', 'Master — who owns this recording'));

    const unconfirmed = [...st.splits, ...st.masters].filter(r => r.name && !r.confirmed);
    if (unconfirmed.length) {
      box.append(card(
        cardHead('Not yet confirmed'),
        h('p', { class: 'small', style: { margin: 0 } },
          `${unconfirmed.length} ${unconfirmed.length === 1 ? 'person has' : 'people have'} not confirmed their share in writing. ` +
          'An email where each writer replies "agreed" to the stated split is enough, and it is the difference between a conversation and a dispute.'),
        h('div', { class: 'row', style: { marginTop: '12px' } },
          btn('Copy an agreement email', copySplitEmail, { cls: 'btn-sm' }))));
    }

    box.append(h('div', { class: 'row', style: { marginTop: '14px' } },
      btn('Export split sheet', exportSplits, { cls: 'btn-sm btn-ghost' }),
      btn('Copy as text', () => copy(splitSheetText()), { cls: 'btn-sm btn-ghost' })));

    return box;
  }

  function splitSheetText() {
    const v = st.v;
    const line = (r) => `${r.name || '—'}\t${r.role || ''}\t${r.pro || ''}\t${r.ipi || ''}\t${r.pct || 0}%`;
    return [
      `SPLIT SHEET`,
      ``,
      `Work: ${v.title || '—'}${v.titleVersion ? ' (' + v.titleVersion + ')' : ''}`,
      `Artist: ${v.artistName || '—'}`,
      `ISRC: ${v.isrc || 'not yet issued'}   ISWC: ${v.iswc || 'not yet issued'}`,
      `Date: ${todayISO()}`,
      ``,
      `COMPOSITION`,
      `Name\tRole\tPRO\tIPI\tShare`,
      ...st.splits.map(line),
      `Total: ${st.splits.reduce((a, r) => a + (+r.pct || 0), 0)}%`,
      ``,
      `MASTER`,
      `Name\tRole\tPRO\tIPI\tShare`,
      ...st.masters.map(line),
      `Total: ${st.masters.reduce((a, r) => a + (+r.pct || 0), 0)}%`,
      ``,
      `Each party confirms the shares above by signing or by replying in writing.`,
      ``,
      ...st.splits.map(r => `${r.name || '________________'}   signature: ____________________   date: __________`),
    ].join('\n');
  }

  function exportSplits() {
    download(`split-sheet-${(st.v.title || 'track').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`,
      splitSheetText(), 'text/plain');
  }

  function copySplitEmail() {
    const v = st.v;
    const body = [
      `Hi — putting the paperwork for "${v.title || 'the track'}" in order before it goes out.`,
      ``,
      `Proposed splits:`,
      ``,
      `Composition:`,
      ...st.splits.map(r => `  ${r.name || '—'} — ${r.pct || 0}%`),
      ``,
      `Master:`,
      ...st.masters.map(r => `  ${r.name || '—'} — ${r.pct || 0}%`),
      ``,
      `If that looks right, just reply "agreed" to this email and I will register it. If you think it should be different, say so now rather than later — much easier to sort out today.`,
      ``,
      `Thanks,`,
      v.artistName || set.artist || '',
    ].join('\n');
    copy(body);
  }

  /* ---------------------------------------------------------- */
  /*  readiness                                                  */
  /* ---------------------------------------------------------- */

  function completeness() {
    const total = ALL_FIELDS.length;
    const filled = ALL_FIELDS.filter(f => String(st.v[f.key] ?? '').trim()).length;
    const missingRequired = ALL_FIELDS.filter(f => f.required && !String(st.v[f.key] ?? '').trim());
    return { filled, total, missingRequired };
  }

  /* Checks that catch the mechanical rejections. Each returns
     null when fine, or a string saying what is wrong. */
  function validations() {
    const v = st.v;
    const out = [];
    const add = (ok, label, bad, good) => out.push({ ok, label, msg: ok ? good : bad });

    if (v.isrc) {
      add(/^[A-Z]{2}-?[A-Z0-9]{3}-?\d{2}-?\d{5}$/i.test(v.isrc.replace(/\s/g, '')),
        'ISRC format', 'Does not look like an ISRC. Expected two letters, three characters, two digits, five digits.',
        'Well formed.');
    }
    if (v.upc) {
      add(/^\d{12,14}$/.test(v.upc.replace(/[\s-]/g, '')),
        'UPC format', 'A UPC is 12-14 digits with nothing else in it.', 'Well formed.');
    }
    if (v.iswc) {
      add(/^T-?\d{9}-?\d$/i.test(v.iswc.replace(/[\s.]/g, '')),
        'ISWC format', 'Expected T followed by nine digits and a check digit.', 'Well formed.');
    }
    if (v.title) {
      add(!/\((official|original mix|audio|lyric video)\)/i.test(v.title),
        'Title is clean', 'Take "(Official)", "(Audio)" and similar out of the title — DSPs strip or reject them.',
        'No stray parenthetical.');
      add(v.title === v.title.trim() && !/\s{2,}/.test(v.title),
        'No stray whitespace', 'Leading, trailing or doubled spaces. These survive into the DSP and look sloppy forever.',
        'Clean.');
    }
    if (v.artistName && v.featuring) {
      add(!/feat|ft\./i.test(v.artistName),
        'Featured artists separated', 'The primary artist field contains "feat." — that creates a junk artist page. Put featured artists in their own field.',
        'Correct.');
    }
    if (v.pLine) add(/\(?P\)?\s*\d{4}/i.test(v.pLine), 'P-line format',
      'Expected the form (P) 2026 Owner Name.', 'Well formed.');
    if (v.cLine) add(/\(?C\)?\s*\d{4}/i.test(v.cLine), 'C-line format',
      'Expected the form (C) 2026 Owner Name.', 'Well formed.');

    const sTot = st.splits.reduce((a, r) => a + (+r.pct || 0), 0);
    const mTot = st.masters.reduce((a, r) => a + (+r.pct || 0), 0);
    if (st.splits.length) add(Math.abs(sTot - 100) < 0.005, 'Composition splits total 100',
      `They total ${sTot}%. Registration will reject this.`, 'Exactly 100.');
    if (st.masters.length) add(Math.abs(mTot - 100) < 0.005, 'Master splits total 100',
      `They total ${mTot}%.`, 'Exactly 100.');

    if (v.releaseDateISO) {
      const days = daysBetween(todayISO(), v.releaseDateISO);
      add(days >= 0, 'Release date is ahead', 'The release date is in the past.', `${days} days out.`);
      const d = new Date(v.releaseDateISO + 'T12:00:00');
      add(d.getDay() === 5, 'Falls on a Friday',
        'Global release day is Friday. Releasing on another day is allowed but forfeits the New Music Friday consideration window.',
        'Friday, as it should be.');
    }
    return out;
  }

  function checkPane() {
    const box = h('div');
    const { filled, total, missingRequired } = completeness();
    const checks = validations();
    const failing = checks.filter(c => !c.ok);

    box.append(h('div', { class: 'grid g3' },
      stat('Fields filled', `${filled}/${total}`, `${Math.round(filled / total * 100)}%`),
      stat('Required blank', String(missingRequired.length),
        missingRequired.length ? 'fill these before delivery' : 'nothing outstanding'),
      stat('Checks failing', String(failing.length),
        failing.length ? 'each one is a real rejection risk' : 'nothing mechanical wrong')));

    box.append(card(cardHead('Overall'), progress(filled / total * 100)));

    if (missingRequired.length) {
      box.append(card(
        cardHead('Required fields still blank'),
        h('div', { class: 'list' }, missingRequired.map(f =>
          h('div', { class: 'item', onClick: () => { tab = f.group; draw(); } },
            h('div', { class: 'item-head' },
              h('span', { class: 'item-title', text: f.label }),
              h('span', { class: 'tag bad', text: 'required' })),
            h('div', { class: 'item-body', text: f.hint || '' }))))));
    }

    box.append(card(
      cardHead('Format checks', h('span', { class: 'small muted', text: 'only run on fields you have filled' })),
      checks.length
        ? h('div', { class: 'list' }, checks.map(c =>
            h('div', { class: 'item', style: { borderColor: c.ok ? '' : 'var(--bad)' } },
              h('div', { class: 'item-head' },
                h('span', { class: 'item-title', text: c.label }),
                h('span', { class: `tag ${c.ok ? 'ok' : 'bad'}`, text: c.ok ? 'ok' : 'check this' })),
              h('div', { class: 'item-body', text: c.msg }))))
        : h('p', { class: 'small muted', style: { margin: 0 },
            text: 'Fill in the codes and titles and the checks appear here.' })));

    box.append(card(
      cardHead('Before you hit deliver'),
      h('ol', { class: 'prose' },
        ['Read the title out loud against the field, capitalisation included.',
         'Read the artist name out loud — this string becomes your artist page forever.',
         'Featured artists are in the featured field, not glued onto the primary artist.',
         'Explicit flag is right.',
         'Composer and lyricist names match your PRO registration exactly, legal names.',
         'Artwork is 3000x3000, square, RGB, and contains no URLs or social handles.',
         'Master has clean silence at head and tail and does not clip.',
        ].map(t => h('li', { text: t }))),
      h('p', { class: 'small muted' },
        'Most distributors freeze these fields on delivery. A typo caught here costs a minute; the same typo caught after delivery costs a takedown, a redelivery and a new release date.')));

    return box;
  }

  /* ---------------------------------------------------------- */
  /*  export                                                     */
  /* ---------------------------------------------------------- */

  const sectionText = (g) => [
    `## ${g.label}`,
    ...g.fields.filter(f => String(st.v[f.key] ?? '').trim())
      .map(f => `${f.label}: ${st.v[f.key]}`),
  ].join('\n');

  function copySection(g) { copy(sectionText(g)); }

  function allText() {
    return [
      `METADATA — ${st.v.title || 'untitled'}`,
      `Generated ${new Date().toLocaleString()}`,
      '',
      ...META_GROUPS.map(sectionText),
      '',
      splitSheetText(),
    ].join('\n\n');
  }

  function copyAll() { copy(allText()); }

  function exportSheet() {
    const slug = (st.v.title || 'metadata').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    download(`metadata-${slug}.txt`, allText(), 'text/plain');
    toast('Exported');
  }

  draw();
  return root;
}
