/* ============================================================
   radio.js — station directory, submission tracker, reference
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, uid, btn, card, cardHead, empty, field, modal, subtabs, selectField,
  todayISO, fmtDate, confirmDelete, toast, download, copy, addDays,
} from '../ui.js';
import { RADIO_SEED, RADIO_INFO } from '../data/radio.js';
import { COPY_BANK, fillTemplate, splitHint } from '../data/templates.js';
import { infoPanel, notesPanel, progressBar } from './shared.js';
import { icon } from '../icons.js';

const TIER_LABEL = { 1: 'Open door', 2: 'Needs evidence', 3: 'Needs money' };
const TIER_CLS = { 1: 'ok', 2: 'warn', 3: 'bad' };

export function renderRadio(sub) {
  const root = h('div');
  const st = S.get('radio');
  if (!st.stations) { st.stations = RADIO_SEED.map(s => ({ ...s, id: uid(), status: 'not sent' })); S.touch('radio'); }
  st.submissions = st.submissions || [];

  let tab = ['stations', 'tracker', 'info', 'notes'].includes(sub) ? sub : 'stations';
  let region = 'all', tier = 'all';

  const draw = () => {
    clear(root);
    root.append(h('div', { class: 'page-head' },
      h('div', {}, h('h1', { text: 'Radio' }),
        h('div', { class: 'sub', text: 'Stations, the route in, and what you have already sent.' })),
      h('div', { class: 'spacer' }),
      h('div', { class: 'page-actions' },
        btn('Add station', () => openStation(null, draw), { cls: 'btn-primary btn-sm', icon: 'plus' }))));

    root.append(subtabs(
      [['stations', 'Stations'], ['tracker', 'Submissions'], ['info', 'Info'], ['notes', 'Notes']],
      tab, k => { tab = k; draw(); }));

    if (tab === 'info')  { root.append(infoPanel(RADIO_INFO)); return; }
    if (tab === 'notes') { root.append(notesPanel(st, 'radio', 'Radio notes')); return; }
    if (tab === 'tracker') { root.append(tracker()); return; }

    /* stations */
    const regions = ['all', ...new Set(st.stations.map(s => s.region))];
    root.append(h('div', { class: 'row', style: { marginBottom: '14px' } },
      regions.map(r => h('button', { class: `chip ${region === r ? 'on' : ''}`, onClick: () => { region = r; draw(); } }, r === 'all' ? 'All regions' : r)),
      h('span', { style: { width: '10px' } }),
      ['all', 1, 2, 3].map(t => h('button', { class: `chip ${tier === t ? 'on' : ''}`, onClick: () => { tier = t; draw(); } },
        t === 'all' ? 'All tiers' : `Tier ${t} — ${TIER_LABEL[t]}`))));

    const shown = st.stations.filter(s =>
      (region === 'all' || s.region === region) && (tier === 'all' || s.tier === tier));

    if (!shown.length) { root.append(empty('Nothing matches that filter')); return; }

    const list = h('div', { class: 'list' });
    shown.forEach(s => list.append(h('div', { class: 'item', onClick: () => openStation(s, draw) },
      h('div', { class: 'item-head' },
        h('span', { class: 'item-title', text: s.name }),
        h('span', { class: 'tag', text: s.region }),
        h('span', { class: 'tag', text: s.type }),
        h('span', { class: `tag ${TIER_CLS[s.tier] || ''}`, text: TIER_LABEL[s.tier] || '' })),
      s.how ? h('div', { class: 'item-body', text: s.how }) : null,
      h('div', { class: 'item-meta' },
        s.url ? h('a', { href: s.url, target: '_blank', rel: 'noopener', text: 'open', onClick: e => e.stopPropagation() }) : null,
        h('span', { class: `tag ${s.status === 'played' ? 'ok' : s.status === 'sent' ? 'info' : ''}`, text: s.status || 'not sent' })))));
    root.append(list);
  };

  /* ---------- submission tracker ---------- */

  function tracker() {
    const box = h('div');
    const sent = st.stations.filter(s => s.status && s.status !== 'not sent');
    const played = st.stations.filter(s => s.status === 'played');

    box.append(card(
      h('div', { class: 'row' },
        h('div', { style: { flex: 1 } }, progressBar(st.stations.length ? sent.length / st.stations.length * 100 : 0)),
        h('span', { class: 'small mono muted', text: `${sent.length} sent · ${played.length} played` }))));

    if (!sent.length) {
      box.append(empty('Nothing sent yet', 'Open a station and set its status to "sent" once you have emailed it.'));
      return box;
    }

    box.append(h('div', { class: 'table-wrap' },
      h('table', { class: 'tbl' },
        h('thead', {}, h('tr', {}, ['Station', 'Region', 'Sent', 'Status', 'Follow up', 'Notes'].map(t => h('th', { text: t })))),
        h('tbody', {}, sent.map(s => h('tr', { style: { cursor: 'pointer' }, onClick: () => openStation(s, draw) },
          h('td', { text: s.name }),
          h('td', { class: 'muted', text: s.region }),
          h('td', { class: 'mono', text: s.sentOn || '—' }),
          h('td', {}, h('span', { class: `tag ${s.status === 'played' ? 'ok' : s.status === 'declined' ? 'bad' : 'info'}`, text: s.status })),
          h('td', { class: 'mono muted', text: s.followUp || '—' }),
          h('td', { class: 'small muted', text: (s.notes || '').slice(0, 60) })))))));
    return box;
  }

  /* ---------- editor ---------- */

  function openStation(existing, redraw) {
    const isNew = !existing;
    const s = existing || { id: uid(), name: '', region: '', type: 'Internet', tier: 1, url: '', how: '', status: 'not sent', sentOn: '', followUp: '', contact: '', notes: '' };
    if (isNew) { st.stations.unshift(s); S.touch('radio'); }

    modal({
      title: isNew ? 'New station' : s.name,
      body: h('div',
        field('Station / network', s, 'name', { slice: 'radio' }),
        h('div', { class: 'grid g2' },
          field('Region', s, 'region', { slice: 'radio', placeholder: 'India, UK, US…' }),
          selectField('Type', s, 'type', ['Portal', 'Directory', 'College', 'Community', 'Internet', 'Commercial FM', 'National', 'Paid'], { slice: 'radio' })),
        h('div', { class: 'grid g2' },
          selectField('Tier', s, 'tier', [[1, '1 — open door'], [2, '2 — needs evidence'], [3, '3 — needs money']], { slice: 'radio' }),
          selectField('Status', s, 'status', ['not sent', 'sent', 'followed up', 'played', 'declined'], { slice: 'radio' })),
        field('URL', s, 'url', { slice: 'radio', placeholder: 'https://' }),
        field('How to get in', s, 'how', { slice: 'radio', multiline: true }),
        field('Contact', s, 'contact', { slice: 'radio', placeholder: 'Music director name / email' }),
        h('div', { class: 'grid g2' },
          field('Sent on', s, 'sentOn', { slice: 'radio', type: 'date' }),
          field('Follow up on', s, 'followUp', { slice: 'radio', type: 'date' })),
        field('Notes', s, 'notes', { slice: 'radio', multiline: true })),
      wide: true,
      actions: [
        { label: 'Draft the submission', cls: 'btn-ghost', keepOpen: true, onClick: () => draftSubmission(s, redraw) },
        { label: 'Delete', cls: 'btn-danger btn-ghost', onClick: () => { st.stations.splice(st.stations.indexOf(s), 1); S.touch('radio'); redraw(); } },
        'spacer',
        { label: 'Done', cls: 'btn-primary', onClick: redraw },
      ],
      onClose: redraw,
    });
  }

  /* ---------- submission email, built from the one-sheet ---------- */

  function draftSubmission(s, redraw) {
    const set = S.get('settings');
    const cp = S.get('copy');
    const tpl = COPY_BANK.flatMap(g => g.items).find(i => i.id === 'radio-email');
    const sheet = COPY_BANK.flatMap(g => g.items).find(i => i.id === 'one-sheet');

    const pick = (id, item) => (cp.edits && cp.edits[id] !== undefined)
      ? cp.edits[id]
      : splitHint(fillTemplate(item.body, set)).body;

    const email = pick('radio-email', tpl)
      .replace(/\[NAME\]/g, s.contact || '[NAME]')
      .replace(/\[SHOW \/ STATION\]/g, s.name || '[STATION]');

    const oneSheet = pick('one-sheet', sheet);

    const ta = h('textarea', { class: 'inp', style: { minHeight: '300px', lineHeight: '1.6' }, value: email });
    const sheetTa = h('textarea', { class: 'inp', style: { minHeight: '240px', lineHeight: '1.55', fontSize: '12.5px' }, value: oneSheet });

    const ready = [
      ['Clean / radio edit exists, under 3:40', !!set.song],
      ['Direct WAV + MP3 download link in the email', /https?:\/\//.test(email)],
      ['ISRC recorded', !!String(set.isrc || '').trim()],
      ['PRO registration confirmed before airplay', !!String(set.pro || '').trim()],
    ];

    modal({
      title: `Submission to ${s.name}`, wide: true,
      body: h('div',
        h('p', { class: 'small muted' },
          'Built from your Copy bank. Edit here, then copy. Never make a programmer stream it — always include a direct download.'),
        h('div', { class: 'lab', style: { marginBottom: '5px' } }, 'The email'),
        ta,
        h('div', { class: 'hr' }),
        h('div', { class: 'lab', style: { marginBottom: '5px' } }, 'The one-sheet — paste below the signature or attach as a PDF'),
        sheetTa,
        h('div', { class: 'hr' }),
        h('div', { class: 'lab', style: { marginBottom: '5px' } }, 'Before you send'),
        h('div', {}, ready.map(([label, ok]) => h('div', { class: 'row', style: { gap: '7px', padding: '3px 0' } },
          h('span', { class: `tag ${ok ? 'ok' : 'warn'}`, text: ok ? 'ok' : 'check' }),
          h('span', { class: 'small', text: label }))))),
      actions: [
        { label: 'Copy email', cls: 'btn-primary', keepOpen: true, onClick: () => copy(ta.value) },
        { label: 'Copy one-sheet', keepOpen: true, onClick: () => copy(sheetTa.value) },
        'spacer',
        { label: 'Mark as sent', onClick: () => {
          s.status = 'sent'; s.sentOn = todayISO(); s.followUp = addDays(todayISO(), 14);
          S.touch('radio'); redraw();
        } },
      ],
    });
  }

  draw();
  return root;
}
