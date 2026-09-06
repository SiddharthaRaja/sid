/* ============================================================
   finance.js — forms, accounts, budget, royalty ledger, info
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, uid, btn, card, cardHead, empty, field, modal, subtabs, selectField,
  fmtDate, resolveDate, todayISO, confirmDelete, fmtNum, download, stat, toast,
} from '../ui.js';
import { FORMS_SEED, ACCOUNTS_SEED, BUDGET_SEED, FINANCE_INFO } from '../data/finance.js';
import { infoPanel, notesPanel, progressBar, scheduleRow } from './shared.js';
import { barRows, withTable, lineChart } from '../charts.js';

const ST_CLS = { todo: '', 'in progress': 'info', done: 'ok', blocked: 'bad' };

export function renderFinance(sub) {
  const root = h('div');
  const st = S.get('finance');
  const set = S.get('settings');
  if (!st.forms)    { st.forms = FORMS_SEED.map(f => ({ ...f })); S.touch('finance'); }
  if (!st.accounts?.length) { st.accounts = ACCOUNTS_SEED.map(a => ({ ...a })); S.touch('finance'); }
  if (!st.budget)   { st.budget = BUDGET_SEED.map(b => ({ ...b })); S.touch('finance'); }
  st.ledger = st.ledger || [];

  let tab = ['forms', 'accounts', 'budget', 'ledger', 'info', 'notes'].includes(sub) ? sub : 'forms';

  const draw = () => {
    clear(root);
    const doneForms = st.forms.filter(f => f.status === 'done').length;
    const spent = st.budget.filter(b => b.done).reduce((a, b) => a + (+b.inr || 0), 0);
    const planned = st.budget.reduce((a, b) => a + (+b.inr || 0), 0);

    root.append(h('div', { class: 'page-head' },
      h('div', {}, h('h1', { text: 'Finance' }),
        h('div', { class: 'sub', text: `${doneForms}/${st.forms.length} forms done · ₹${spent.toLocaleString('en-IN')} of ₹${planned.toLocaleString('en-IN')} committed` })),
      h('div', { class: 'spacer' })));

    root.append(subtabs([
      ['forms', 'Forms & filings'], ['accounts', 'Accounts'], ['budget', 'Budget'],
      ['ledger', 'Royalty ledger'], ['info', 'Info'], ['notes', 'Notes'],
    ], tab, k => { tab = k; draw(); }));

    if (tab === 'info')   { root.append(infoPanel(FINANCE_INFO)); return; }
    if (tab === 'notes')  { root.append(notesPanel(st, 'finance', 'Finance notes')); return; }
    if (tab === 'accounts') { root.append(accounts()); return; }
    if (tab === 'budget')   { root.append(budget()); return; }
    if (tab === 'ledger')   { root.append(ledger()); return; }
    root.append(forms());
  };

  /* ---------- forms ---------- */

  function forms() {
    const box = h('div');
    const done = st.forms.filter(f => f.status === 'done').length;
    box.append(card(h('div', { class: 'row' },
      h('div', { style: { flex: 1 } }, progressBar(done / st.forms.length * 100)),
      h('span', { class: 'small mono muted', text: `${done}/${st.forms.length}` }))));

    const list = h('div', { class: 'list' });
    st.forms.forEach(f => {
      const iso = resolveDate(f.when, set.releaseDate);
      list.append(h('div', { class: 'item', onClick: () => openForm(f) },
        h('div', { class: 'item-head' },
          h('span', { class: 'item-title', text: f.name }),
          f.when ? h('span', { class: 'tag mono', text: f.when }) : null,
          iso ? h('span', { class: 'small muted', text: fmtDate(iso) }) : null,
          h('span', { class: `tag ${ST_CLS[f.status] || ''}`, text: f.status })),
        h('div', { class: 'item-body', text: f.what }),
        h('div', { class: 'item-meta' },
          h('span', { text: f.who }),
          f.where ? h('span', { text: f.where }) : null,
          f.url ? h('a', { href: f.url, target: '_blank', rel: 'noopener', text: 'form', onClick: e => e.stopPropagation() }) : null)));
    });
    box.append(list);
    box.append(h('div', { style: { marginTop: '12px' } },
      btn('Add a filing', () => { const f = { id: uid(), name: '', who: '', when: '', status: 'todo', what: '', how: '', where: '', url: '' }; st.forms.push(f); S.touch('finance'); openForm(f); }, { cls: 'btn-sm', icon: 'plus' })));
    return box;
  }

  function openForm(f) {
    modal({
      title: f.name || 'New filing', wide: true,
      body: h('div',
        field('Name', f, 'name', { slice: 'finance' }),
        h('div', { class: 'grid g2' },
          field('Filed with', f, 'who', { slice: 'finance' }),
          selectField('Status', f, 'status', ['todo', 'in progress', 'done', 'blocked'], { slice: 'finance' })),
        scheduleRow(f, 'finance', null),
        field('What it does', f, 'what', { slice: 'finance', multiline: true }),
        field('How to fill it', f, 'how', { slice: 'finance', multiline: true, tall: true }),
        field('Where / how often', f, 'where', { slice: 'finance' }),
        field('URL', f, 'url', { slice: 'finance' }),
        field('Your notes', f, 'notes', { slice: 'finance', multiline: true, placeholder: 'Reference numbers, dates filed, who you spoke to' })),
      actions: [
        { label: 'Delete', cls: 'btn-danger btn-ghost', onClick: () => { st.forms.splice(st.forms.indexOf(f), 1); S.touch('finance'); draw(); } },
        'spacer', { label: 'Done', cls: 'btn-primary', onClick: draw },
      ],
      onClose: draw,
    });
  }

  /* Note: scheduleRow writes to item.when — map due → when for forms. */

  /* ---------- accounts ---------- */

  function accounts() {
    const box = h('div');
    ['Receiving account', 'Bank', 'Payer', 'Other'].forEach(kind => {
      const rows = st.accounts.filter(a => (a.kind || 'Other') === kind);
      if (!rows.length) return;
      box.append(card(cardHead(kind + (kind === 'Payer' ? 's — who owes you money' : 's')),
        h('div', { class: 'list' }, rows.map(a => h('div', { class: 'item', onClick: () => openAccount(a) },
          h('div', { class: 'item-head' },
            h('span', { class: 'item-title', text: a.name }),
            h('span', { class: `tag ${ST_CLS[a.status] || ''}`, text: a.status || 'todo' })),
          a.note ? h('div', { class: 'item-body', text: a.note }) : null,
          h('div', { class: 'item-meta' },
            a.ref ? h('span', { class: 'mono', text: a.ref }) : null,
            a.w8 ? h('span', { class: 'tag ok', text: 'W-8BEN filed' }) : h('span', { class: 'tag', text: 'W-8BEN not filed' }),
            a.url ? h('a', { href: a.url, target: '_blank', rel: 'noopener', text: 'open', onClick: e => e.stopPropagation() }) : null))))));
    });
    box.append(h('div', { style: { marginTop: '12px' } },
      btn('Add account', () => { const a = { id: uid(), name: '', kind: 'Other', url: '', status: 'todo', note: '', ref: '', w8: false }; st.accounts.push(a); S.touch('finance'); openAccount(a); }, { cls: 'btn-sm', icon: 'plus' })));
    return box;
  }

  function openAccount(a) {
    modal({
      title: a.name || 'New account',
      body: h('div',
        field('Name', a, 'name', { slice: 'finance' }),
        h('div', { class: 'grid g2' },
          selectField('Kind', a, 'kind', ['Receiving account', 'Bank', 'Payer', 'Other'], { slice: 'finance' }),
          selectField('Status', a, 'status', ['todo', 'in progress', 'done', 'blocked'], { slice: 'finance' })),
        field('URL', a, 'url', { slice: 'finance' }),
        field('Reference / last 4 digits', a, 'ref', { slice: 'finance', placeholder: 'Only what you need to identify it' }),
        h('label', { class: 'check' },
          h('input', { type: 'checkbox', checked: !!a.w8, onChange: e => { a.w8 = e.target.checked; S.touch('finance'); } }),
          h('span', { text: 'W-8BEN filed with this payer' })),
        field('Notes', a, 'note', { slice: 'finance', multiline: true })),
      actions: [
        { label: 'Delete', cls: 'btn-danger btn-ghost', onClick: () => { st.accounts.splice(st.accounts.indexOf(a), 1); S.touch('finance'); draw(); } },
        'spacer', { label: 'Done', cls: 'btn-primary', onClick: draw },
      ],
      onClose: draw,
    });
  }

  /* ---------- budget ---------- */

  function budget() {
    const box = h('div');
    const total = st.budget.reduce((a, b) => a + (+b.inr || 0), 0);
    const spent = st.budget.filter(b => b.done).reduce((a, b) => a + (+b.inr || 0), 0);

    box.append(h('div', { class: 'grid g3' },
      stat('Planned', `₹${total.toLocaleString('en-IN')}`, 'across the whole campaign'),
      stat('Committed', `₹${spent.toLocaleString('en-IN')}`, `${total ? Math.round(spent / total * 100) : 0}% of plan`),
      stat('Remaining', `₹${(total - spent).toLocaleString('en-IN')}`, '')));

    const data = st.budget.filter(b => +b.inr > 0).map(b => ({ label: b.item, value: +b.inr }))
      .sort((a, b) => b.value - a.value);
    box.append(card(cardHead('Where the money goes'),
      withTable(barRows(data), ['Item', '₹'], data.map(d => [d.label, d.value.toLocaleString('en-IN')]))));

    box.append(card(cardHead('Line items',
      btn('Add', () => { st.budget.push({ id: uid(), item: '', when: '', usd: 0, inr: 0, note: '', done: false }); S.touch('finance'); draw(); }, { cls: 'btn-sm', icon: 'plus' })),
      h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
        h('thead', {}, h('tr', {}, ['Paid', 'Item', 'When', 'USD', '₹', 'Note', ''].map(t => h('th', { text: t })))),
        h('tbody', {}, st.budget.map((b, i) => h('tr', {},
          h('td', {}, h('input', { type: 'checkbox', checked: !!b.done, style: { accentColor: 'var(--accent)' },
            onChange: e => { b.done = e.target.checked; S.touch('finance'); draw(); } })),
          ...[['item', '150px'], ['when', '60px'], ['usd', '60px'], ['inr', '80px'], ['note', '200px']].map(([k, w]) =>
            h('td', {}, h('input', {
              class: 'inp', style: { padding: '4px 6px', minWidth: w },
              type: k === 'usd' || k === 'inr' ? 'number' : 'text',
              value: b[k] ?? '',
              onInput: e => { b[k] = (k === 'usd' || k === 'inr') ? (e.target.value === '' ? '' : +e.target.value) : e.target.value; S.touch('finance'); },
            }))),
          h('td', {}, h('button', { class: 'icon-btn', html: '&times;', onClick: () => { st.budget.splice(i, 1); S.touch('finance'); draw(); } })))))))));

    return box;
  }

  /* ---------- ledger ---------- */

  function ledger() {
    const box = h('div');
    const rows = st.ledger.slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const grossT = rows.reduce((a, r) => a + (+r.gross || 0), 0);
    const netT = rows.reduce((a, r) => a + (+r.net || 0), 0);
    const inrT = rows.reduce((a, r) => a + (+r.inr || 0), 0);

    box.append(h('div', { class: 'grid g4' },
      stat('Gross USD', `$${grossT.toFixed(2)}`, `${rows.length} payment${rows.length === 1 ? '' : 's'}`),
      stat('Net USD', `$${netT.toFixed(2)}`, `withheld $${(grossT - netT).toFixed(2)}`),
      stat('Received', `₹${inrT.toLocaleString('en-IN')}`, 'at TT buying rate'),
      stat('FIRAs on file', `${rows.filter(r => r.fira).length}/${rows.length}`, 'retain 6–8 years')));

    if (rows.length > 1) {
      box.append(card(cardHead('Royalties over time'),
        lineChart([{ name: 'Net USD', points: rows.filter(r => r.date).map(r => ({ x: r.date, y: +r.net || 0 })) }], { height: 190 })));
    }

    box.append(card(cardHead('Every inward payment',
      h('div', { class: 'row' },
        btn('Add payment', () => { st.ledger.push({ id: uid(), date: todayISO(), source: '', gross: '', withheld: '', net: '', rate: '', inr: '', fira: '', code: 'P1303' }); S.touch('finance'); draw(); }, { cls: 'btn-sm btn-primary', icon: 'plus' }),
        rows.length ? btn('Export CSV', exportLedger, { cls: 'btn-sm btn-ghost' }) : null)),
      rows.length
        ? h('div', { class: 'table-wrap' }, h('table', { class: 'tbl tabular' },
            h('thead', {}, h('tr', {}, ['Date', 'Source', 'Gross $', 'Withheld $', 'Net $', 'TTBR', '₹ received', 'FIRA ref', 'Code', ''].map(t => h('th', { text: t })))),
            h('tbody', {}, st.ledger.map((r, i) => h('tr', {},
              ...[['date', '110px', 'date'], ['source', '120px'], ['gross', '80px', 'number'], ['withheld', '80px', 'number'],
                  ['net', '80px', 'number'], ['rate', '70px', 'number'], ['inr', '90px', 'number'], ['fira', '110px'], ['code', '70px']]
                .map(([k, w, type]) => h('td', {}, h('input', {
                  class: 'inp', style: { padding: '4px 6px', minWidth: w }, type: type || 'text',
                  value: r[k] ?? '',
                  onInput: e => { r[k] = type === 'number' ? (e.target.value === '' ? '' : +e.target.value) : e.target.value; S.touch('finance'); },
                }))),
              h('td', {}, h('button', { class: 'icon-btn', html: '&times;', onClick: () => { st.ledger.splice(i, 1); S.touch('finance'); draw(); } })))))))
        : empty('No payments logged yet', 'Log every inward payment with its FIRA reference. Purpose code P1303 for royalties and copyrights.')));

    return box;
  }

  function exportLedger() {
    const cols = ['date', 'source', 'gross', 'withheld', 'net', 'rate', 'inr', 'fira', 'code'];
    const csv = [cols, ...st.ledger.map(r => cols.map(c => r[c] ?? ''))]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    download('sid-royalty-ledger.csv', csv, 'text/csv');
  }

  draw();
  return root;
}
