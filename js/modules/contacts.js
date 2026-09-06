/* ============================================================
   contacts.js — outreach database: curators, press, radio,
   personal network, street team
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, uid, btn, card, cardHead, empty, field, modal, subtabs, selectField,
  fmtDate, todayISO, addDays, relativeDay, confirmDelete, toast, download, copy, fmtNum,
} from '../ui.js';
import { KINDS, STATUSES, STATUS_CLS, VET_GREEN, VET_RED, CONTACTS_INFO } from '../data/contacts.js';
import { COPY_BANK, fillTemplate, splitHint } from '../data/templates.js';
import { infoPanel, notesPanel, progressBar } from './shared.js';
import { barRows, withTable } from '../charts.js';
import { icon } from '../icons.js';

const EMAIL_FOR = { curator: 'curator-email', press: 'press-email', radio: 'radio-email' };

export function renderContacts(sub) {
  const root = h('div');
  const st = S.get('contacts');
  st.items = st.items || [];
  st.notes = st.notes || '';

  const tabs = [...KINDS.map(k => [k.key, k.label]), ['overview', 'Overview'], ['info', 'Info'], ['notes', 'Notes']];
  let tab = tabs.some(t => t[0] === sub) ? sub : 'overview';
  let statusFilter = 'all';

  const draw = () => {
    clear(root);
    const sent = st.items.filter(c => c.status && c.status !== 'todo').length;
    const placed = st.items.filter(c => c.status === 'placed').length;

    root.append(h('div', { class: 'page-head' },
      h('div', {},
        h('h1', { text: 'Contacts & outreach' }),
        h('div', { class: 'sub', text: `${st.items.length} contacts · ${sent} approached · ${placed} placed` })),
      h('div', { class: 'spacer' }),
      h('div', { class: 'page-actions' },
        btn('Add contact', () => open(null, tab), { cls: 'btn-primary btn-sm', icon: 'plus' }),
        btn('Bulk add', bulkAdd, { cls: 'btn-sm' }),
        st.items.length ? btn('Export CSV', exportCsv, { cls: 'btn-sm btn-ghost' }) : null)));

    root.append(subtabs(tabs, tab, k => { tab = k; statusFilter = 'all'; draw(); }));

    if (tab === 'info')     { root.append(infoPanel(CONTACTS_INFO)); return; }
    if (tab === 'notes')    { root.append(notesPanel(st, 'contacts', 'Outreach notes')); return; }
    if (tab === 'overview') { root.append(overview()); return; }
    root.append(kindPane(KINDS.find(k => k.key === tab)));
  };

  /* ---------- overview ---------- */

  function overview() {
    const box = h('div');
    const due = st.items.filter(c => c.followUp && c.followUp <= todayISO() && !['placed', 'declined'].includes(c.status));

    if (due.length) {
      box.append(card(
        cardHead('Follow-ups due', h('span', { class: 'tag warn', text: String(due.length) })),
        h('div', { class: 'list' }, due.map(c => row(c)))));
    }

    box.append(card(
      cardHead('Against the plan\'s targets'),
      h('div', {}, KINDS.filter(k => k.target).map(k => {
        const all = st.items.filter(c => c.kind === k.key);
        const done = all.filter(c => c.status && c.status !== 'todo').length;
        return h('div', { style: { marginBottom: '14px' } },
          h('div', { class: 'row', style: { marginBottom: '4px' } },
            h('span', { style: { fontWeight: 500 }, text: k.label }),
            h('span', { class: 'small muted mono', style: { marginLeft: 'auto' },
              text: `${all.length} listed · ${done} approached · target ${k.target}` })),
          progressBar(all.length / k.target * 100),
          h('div', { class: 'small muted', style: { marginTop: '4px' }, text: k.note }));
      }))));

    const byStatus = STATUSES.map(([k, l]) => ({ label: l, value: st.items.filter(c => (c.status || 'todo') === k).length }));
    if (st.items.length) {
      box.append(card(cardHead('Where everything stands'),
        withTable(barRows(byStatus), ['Status', 'Count'], byStatus.map(d => [d.label, d.value]))));
    }

    if (!st.items.length) {
      box.append(empty('No contacts yet',
        'Build the list at T-90, before you need it. "Bulk add" takes a pasted list, one per line.'));
    }
    return box;
  }

  /* ---------- one kind ---------- */

  function kindPane(kind) {
    const box = h('div');
    const all = st.items.filter(c => c.kind === kind.key);
    const approached = all.filter(c => c.status && c.status !== 'todo').length;

    box.append(card(
      h('p', { class: 'small muted', style: { marginTop: 0 }, text: kind.note }),
      kind.target
        ? h('div', { class: 'row' },
            h('div', { style: { flex: 1 } }, progressBar(all.length / kind.target * 100)),
            h('span', { class: 'small mono muted', text: `${all.length} / ${kind.target} listed · ${approached} approached` }))
        : null));

    box.append(h('div', { class: 'row', style: { margin: '12px 0' } },
      [['all', 'All'], ...STATUSES].map(([k, l]) =>
        h('button', { class: `chip ${statusFilter === k ? 'on' : ''}`, onClick: () => { statusFilter = k; draw(); } },
          `${l}${k === 'all' ? ` ${all.length}` : ' ' + all.filter(c => (c.status || 'todo') === k).length}`))));

    const shown = all.filter(c => statusFilter === 'all' || (c.status || 'todo') === statusFilter);
    if (!shown.length) {
      box.append(empty(all.length ? 'Nothing with that status' : `No ${kind.label.toLowerCase()} yet`,
        all.length ? '' : 'Add them one at a time, or paste a list with "Bulk add".'));
      return box;
    }

    box.append(h('div', { class: 'list' }, shown.map(c => row(c))));
    return box;
  }

  function row(c) {
    const overdue = c.followUp && c.followUp <= todayISO() && !['placed', 'declined'].includes(c.status);
    return h('div', { class: 'item', onClick: () => open(c) },
      h('div', { class: 'item-head' },
        h('span', { class: 'item-title', text: c.name || 'Unnamed' }),
        c.org ? h('span', { class: 'tag', text: c.org }) : null,
        c.followers ? h('span', { class: 'tag mono', text: fmtNum(c.followers) }) : null,
        c.redFlag ? h('span', { class: 'tag bad', text: 'red flag' }) : null,
        h('span', { class: `tag ${STATUS_CLS[c.status || 'todo']}`, text: (STATUSES.find(s => s[0] === (c.status || 'todo')) || ['', ''])[1] })),
      c.notes ? h('div', { class: 'item-body', text: c.notes }) : null,
      h('div', { class: 'item-meta' },
        c.playlist ? h('span', { text: c.playlist }) : null,
        c.email ? h('span', { class: 'mono', text: c.email }) : null,
        c.sentOn ? h('span', { text: `sent ${fmtDate(c.sentOn)}` }) : null,
        c.followUp ? h('span', { style: overdue ? { color: 'var(--warn)' } : {},
          text: `follow up ${fmtDate(c.followUp)}${overdue ? ' — due' : ''}` }) : null,
        c.url ? h('a', { href: c.url, target: '_blank', rel: 'noopener', text: 'open', onClick: e => e.stopPropagation() }) : null));
  }

  /* ---------- editor ---------- */

  function open(existing, defaultKind) {
    const isNew = !existing;
    const c = existing || {
      id: uid(), kind: (defaultKind && KINDS.some(k => k.key === defaultKind)) ? defaultKind : 'curator',
      name: '', org: '', playlist: '', url: '', email: '', handle: '', followers: '',
      status: 'todo', sentOn: '', followUp: '', notes: '', redFlag: false, vet: {},
    };
    if (isNew) { st.items.unshift(c); S.touch('contacts'); }

    const body = h('div',
      h('div', { class: 'grid g2' },
        field('Name', c, 'name', { slice: 'contacts', placeholder: 'The person, if you know it' }),
        selectField('Kind', c, 'kind', KINDS.map(k => [k.key, k.label]), { slice: 'contacts' })),
      h('div', { class: 'grid g2' },
        field('Organisation / outlet', c, 'org', { slice: 'contacts' }),
        field('Playlist / show name', c, 'playlist', { slice: 'contacts' })),
      h('div', { class: 'grid g2' },
        field('Email', c, 'email', { slice: 'contacts', type: 'email' }),
        field('Handle / DM', c, 'handle', { slice: 'contacts' })),
      h('div', { class: 'grid g2' },
        field('URL', c, 'url', { slice: 'contacts', placeholder: 'https://' }),
        field('Followers', c, 'followers', { slice: 'contacts', type: 'number' })),
      h('div', { class: 'grid g3' },
        selectField('Status', c, 'status', STATUSES, { slice: 'contacts', onChange: (v) => {
          if (v === 'sent' && !c.sentOn) {
            c.sentOn = todayISO();
            c.followUp = addDays(todayISO(), 12);
            S.touch('contacts');
            toast('Sent today; follow-up set for 12 days out');
          }
        } }),
        field('Sent on', c, 'sentOn', { slice: 'contacts', type: 'date' }),
        field('Follow up on', c, 'followUp', { slice: 'contacts', type: 'date' })),
      field('Notes — what you said, what they said', c, 'notes', { slice: 'contacts', multiline: true }),
    );

    /* vetting, for curators only */
    if (c.kind === 'curator') {
      c.vet = c.vet || {};
      const vetBox = h('div', { class: 'grid g2', style: { marginTop: '6px' } });
      const list = (title, lines, prefix, cls) => {
        const col = h('div', {}, h('div', { class: 'lab', style: { color: cls }, text: title }));
        lines.forEach((line, i) => col.append(h('label', { class: 'check' },
          h('input', {
            type: 'checkbox', checked: !!c.vet[prefix + i],
            onChange: (e) => {
              c.vet[prefix + i] = e.target.checked;
              c.redFlag = VET_RED.some((_, j) => c.vet['r' + j]);
              S.touch('contacts');
            },
          }),
          h('span', { class: 'small', text: line }))));
        return col;
      };
      vetBox.append(list('Green flags', VET_GREEN, 'g', 'var(--ok)'));
      vetBox.append(list('Red flags — do not submit', VET_RED, 'r', 'var(--bad)'));
      body.append(h('div', { class: 'hr' }), vetBox);
    }

    const tplId = EMAIL_FOR[c.kind];
    modal({
      title: c.name || c.org || 'New contact', wide: true, body,
      actions: [
        tplId ? { label: 'Draft the email', cls: 'btn-ghost', keepOpen: true, onClick: () => draftEmail(c, tplId) } : null,
        { label: 'Delete', cls: 'btn-danger btn-ghost', onClick: () => {
          st.items.splice(st.items.indexOf(c), 1); S.touch('contacts'); draw(); } },
        'spacer',
        { label: 'Done', cls: 'btn-primary', onClick: draw },
      ].filter(Boolean),
      onClose: draw,
    });
  }

  /* ---------- email draft ---------- */

  function draftEmail(c, tplId) {
    const set = S.get('settings');
    const cp = S.get('copy');
    const item = COPY_BANK.flatMap(g => g.items).find(i => i.id === tplId);
    const base = (cp.edits && cp.edits[tplId] !== undefined)
      ? cp.edits[tplId]
      : splitHint(fillTemplate(item.body, set)).body;

    /* A bulk-added row often puts the playlist or outlet in `name`,
       so fall back rather than leaving the placeholder in. */
    const place = c.playlist || c.org || c.name || '';
    const person = c.playlist ? (c.name || '') : '';

    const text = base
      .replace(/\[NAME\]/g, person || 'there')
      .replace(/\[PLAYLIST NAME\]/g, place || '[PLAYLIST NAME]')
      .replace(/\[SHOW \/ STATION\]/g, place || '[SHOW / STATION]')
      .replace(/\[PLAYLIST\/SHOW\]/g, place || '[PLAYLIST/SHOW]');

    const ta = h('textarea', { class: 'inp', style: { minHeight: '340px', lineHeight: '1.6' }, value: text });

    modal({
      title: `Email to ${c.name || c.org || 'contact'}`, wide: true,
      body: h('div',
        h('p', { class: 'small muted' },
          'Filled from the Copy bank plus this contact. Edit here, copy, send. Fill the remaining brackets — a generic email is worse than none.'),
        ta),
      actions: [
        { label: 'Copy', cls: 'btn-primary', keepOpen: true, onClick: () => copy(ta.value) },
        c.email ? { label: 'Open in mail app', keepOpen: true, onClick: () => {
          const lines = ta.value.split('\n');
          const subj = (lines[0].match(/^Subject:\s*(.*)/i) || [, ''])[1];
          const rest = subj ? lines.slice(1).join('\n').trim() : ta.value;
          window.open(`mailto:${c.email}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(rest)}`);
        } } : null,
        'spacer',
        { label: 'Mark as sent', onClick: () => {
          c.status = 'sent'; c.sentOn = todayISO(); c.followUp = addDays(todayISO(), 12);
          S.touch('contacts'); draw();
        } },
      ].filter(Boolean),
    });
  }

  /* ---------- bulk add ---------- */

  function bulkAdd() {
    const ta = h('textarea', { class: 'inp', style: { minHeight: '200px' },
      placeholder: 'One per line. Either just a name, or:\nName, outlet or playlist, email, url\n\nSpotify Indie India, editorial, , https://open.spotify.com/...' });
    const kindSel = h('select', { class: 'inp' },
      KINDS.map(k => h('option', { value: k.key, selected: k.key === tab }, k.label)));

    modal({
      title: 'Bulk add contacts',
      body: h('div',
        h('label', { class: 'field' }, h('span', { class: 'lab', text: 'Add all of these as' }), kindSel),
        h('label', { class: 'field' }, h('span', { class: 'lab', text: 'One per line' }), ta),
        h('p', { class: 'small muted' }, 'Comma-separated fields are read as name, outlet, email, url. A bare line becomes just a name.')),
      actions: [{ label: 'Cancel' }, {
        label: 'Add', cls: 'btn-primary', onClick: () => {
          const lines = ta.value.split('\n').map(l => l.trim()).filter(Boolean);
          if (!lines.length) return;
          lines.forEach(line => {
            const [name, org, email, url] = line.split(',').map(s => (s || '').trim());
            st.items.unshift({
              id: uid(), kind: kindSel.value, name: name || '', org: org || '', playlist: '',
              url: url || '', email: email || '', handle: '', followers: '',
              status: 'todo', sentOn: '', followUp: '', notes: '', redFlag: false, vet: {},
            });
          });
          S.touch('contacts');
          toast(`${lines.length} added`);
          draw();
        },
      }],
    });
  }

  function exportCsv() {
    const cols = ['kind', 'name', 'org', 'playlist', 'email', 'handle', 'followers', 'status', 'sentOn', 'followUp', 'notes'];
    const csv = [cols, ...st.items.map(c => cols.map(k => c[k] ?? ''))]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    download('sid-contacts.csv', csv, 'text/csv');
  }

  draw();
  return root;
}
