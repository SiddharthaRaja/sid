/* ============================================================
   maillist.js — the mailing list

   Subscriber count, where they came from, what you sent and
   whether anyone opened it. Deliberately manual: there is no
   server here to talk to a provider's API, and typing one number
   a week is cheaper than pretending otherwise.
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, uid, btn, card, cardHead, empty, field, modal, subtabs, selectField,
  toast, copy, confirmDelete, todayISO, fmtDate, fmtNum, prose, download, daysBetween,
} from '../ui.js';
import { PROVIDERS, SOURCE_SEED, SEND_TEMPLATES, LIST_RULES } from '../data/maillist.js';
import { fillTemplate } from '../data/templates.js';
import { sparkline } from '../charts.js';

export function renderMailList(sub) {
  const root = h('div');
  const L = S.get('maillist');
  let tab = ['overview', 'sources', 'sends', 'setup'].includes(sub) ? sub : 'overview';

  if (!L.sources) { L.sources = SOURCE_SEED.map(s => ({ ...s })); S.touch('maillist'); }

  const draw = () => {
    clear(root);
    const latest = counts().at(-1);
    root.append(h('div', { class: 'page-head' },
      h('div', {},
        h('h1', { text: 'Mailing list' }),
        h('div', { class: 'sub', text: latest
          ? `${fmtNum(latest.n)} subscribers · the one audience nobody can take away`
          : 'The one audience nobody can take away from you.' })),
      h('div', { class: 'spacer' })));

    root.append(subtabs([['overview', 'Overview'], ['sources', 'Where they come from'],
      ['sends', 'Sends'], ['setup', 'Setup']], tab, k => { tab = k; draw(); }));

    if (tab === 'sources') { root.append(sourcePane()); return; }
    if (tab === 'sends')   { root.append(sendPane()); return; }
    if (tab === 'setup')   { root.append(setupPane()); return; }
    root.append(overviewPane());
  };

  const counts = () => (L.counts || []).slice().sort((a, b) => a.date.localeCompare(b.date));

  /* ---------------------------------------------------------- */
  /*  overview                                                   */
  /* ---------------------------------------------------------- */

  function overviewPane() {
    const box = h('div');
    const c = counts();
    const latest = c.at(-1);
    const prev = c.length > 1 ? c.at(-2) : null;
    const goal = Number(L.goal) || 100;
    const growth = latest && prev ? latest.n - prev.n : 0;
    const days = latest && prev ? Math.max(1, daysBetween(prev.date, latest.date)) : 0;

    box.append(h('div', { class: 'grid g4' },
      h('div', { class: 'stat' },
        h('div', { class: 'k', text: 'Subscribers' }),
        h('div', { class: 'v', text: latest ? fmtNum(latest.n) : '—' }),
        h('div', { class: 'd', text: latest ? `as of ${fmtDate(latest.date)}` : 'log the first count below' })),
      h('div', { class: 'stat' },
        h('div', { class: 'k', text: 'Since last check' }),
        h('div', { class: 'v', style: { color: growth > 0 ? 'var(--ok)' : '' }, text: prev ? (growth >= 0 ? '+' : '') + growth : '—' }),
        h('div', { class: 'd', text: days ? `over ${days} day${days === 1 ? '' : 's'}` : '' })),
      h('div', { class: 'stat' },
        h('div', { class: 'k', text: 'Goal' }),
        h('div', { class: 'v', text: String(goal) }),
        h('div', { class: 'd', text: latest ? `${Math.max(0, goal - latest.n)} to go` : '' })),
      h('div', { class: 'stat' },
        h('div', { class: 'k', text: 'Emails sent' }),
        h('div', { class: 'v', text: String((L.sends || []).length) }),
        h('div', { class: 'd', text: openRate() !== null ? `${openRate()}% average open` : 'no opens logged yet' }))));

    if (c.length > 1) {
      box.append(card(cardHead('Growth'),
        h('div', { style: { padding: '6px 0', transform: 'scale(2.4)', transformOrigin: 'left center', height: '58px', display: 'flex', alignItems: 'center' } },
          sparkline(c.map(x => x.n), { color: 'var(--accent)' })),
        h('div', { class: 'small muted', text: `${fmtDate(c[0].date)} → ${fmtDate(c.at(-1).date)}` })));
    }

    box.append(card(
      cardHead('Log the count', btn('Add today', () => {
        const n = prompt('How many subscribers today?');
        if (n === null) return;
        L.counts = L.counts || [];
        const today = todayISO();
        const existing = L.counts.find(x => x.date === today);
        if (existing) existing.n = Number(n) || 0;
        else L.counts.push({ id: uid(), date: today, n: Number(n) || 0 });
        S.touch('maillist'); draw();
      }, { cls: 'btn-sm btn-primary' })),
      h('p', { class: 'small muted' },
        'Once a week is plenty. The number matters far less than the direction, and the direction only shows up if you write it down.'),
      c.length
        ? h('div', { class: 'list' }, c.slice().reverse().slice(0, 10).map(x => h('div', { class: 'item' },
            h('div', { class: 'item-head' },
              h('span', { class: 'item-title mono', text: String(x.n) }),
              h('span', { class: 'small muted', text: fmtDate(x.date, { long: true }) }),
              btn('Remove', () => { L.counts.splice(L.counts.indexOf(x), 1); S.touch('maillist'); draw(); }, { cls: 'btn-sm btn-ghost' })))))
        : h('div', { class: 'small muted', text: 'Nothing logged yet.' }),
      field('Goal', L, 'goal', { slice: 'maillist', type: 'number', placeholder: '100' })));

    box.append(card(cardHead('Why this tab exists'),
      prose(`Instagram can restrict your reach tomorrow. Spotify can change what a playlist add is worth. A label can drop you. None of them can touch this list.

It is also the only channel where you reach **everyone** who signed up, rather than the 4% an algorithm decides to show. A hundred email subscribers is worth more on release day than a thousand followers, and it is the number that compounds across every release you ever put out.`)));

    box.append(card(cardHead('Rules'),
      h('ul', { class: 'prose' }, LIST_RULES.map(r => h('li', { text: r })))));

    return box;
  }

  function openRate() {
    const withOpens = (L.sends || []).filter(s => Number(s.sent) > 0 && Number(s.opens) >= 0 && s.opens !== '');
    if (!withOpens.length) return null;
    const total = withOpens.reduce((a, s) => a + Number(s.sent), 0);
    const opens = withOpens.reduce((a, s) => a + Number(s.opens), 0);
    return total ? Math.round(opens / total * 100) : null;
  }

  /* ---------------------------------------------------------- */
  /*  sources                                                    */
  /* ---------------------------------------------------------- */

  function sourcePane() {
    const box = h('div');
    const total = L.sources.reduce((a, s) => a + (Number(s.count) || 0), 0);

    box.append(card(
      cardHead('Where signups come from', h('span', { class: 'small muted', text: `${total} attributed` })),
      h('p', { class: 'small muted' },
        'Turn on the ones that are actually live, and put the running count in as you learn it. The point is to find the one source that works and do more of it, rather than half-doing six.'),
      h('div', { class: 'list' }, L.sources.map(s => h('div', { class: 'item', style: { opacity: s.on ? 1 : .55 } },
        h('div', { class: 'item-head' },
          h('input', { type: 'checkbox', checked: !!s.on, style: { accentColor: 'var(--accent)' },
            onChange: (e) => { s.on = e.target.checked; S.touch('maillist'); draw(); } }),
          h('span', { class: 'item-title', text: s.name }),
          h('span', { class: `tag ${s.on ? 'ok' : ''}`, text: s.on ? 'live' : 'not set up' }),
          h('input', { class: 'inp mono', type: 'number', style: { maxWidth: '90px', marginLeft: 'auto' },
            value: s.count || 0,
            onInput: (e) => { s.count = Number(e.target.value); S.touch('maillist'); } })),
        h('div', { class: 'small muted', style: { marginTop: '4px' }, text: s.note }))))));

    box.append(card(
      cardHead('Add a source', btn('Add', () => {
        L.sources.push({ id: uid(), name: '', note: '', on: false, count: 0 });
        S.touch('maillist'); draw();
      }, { cls: 'btn-sm' })),
      h('p', { class: 'small muted' }, 'Anywhere someone could plausibly hand you an email address.')));

    box.append(card(cardHead('The offer'),
      h('p', { class: 'small muted' },
        '"Sign up for updates" converts at close to nothing. An actual trade converts. Write yours here and use the same words everywhere.'),
      field('What they get for the email', L, 'offer', { slice: 'maillist', multiline: true,
        placeholder: 'The demo version of [SONG], which is not going anywhere else.' }),
      field('Signup URL', L, 'signupUrl', { slice: 'maillist', placeholder: 'https://' })));

    return box;
  }

  /* ---------------------------------------------------------- */
  /*  sends                                                      */
  /* ---------------------------------------------------------- */

  function sendPane() {
    L.sends = L.sends || [];
    const box = h('div');
    const set = S.get('settings');

    const open = (existing) => {
      const isNew = !existing;
      const s = existing || { id: uid(), subject: '', body: '', date: todayISO(), sent: '', opens: '', clicks: '', notes: '' };
      const rate = () => (Number(s.sent) ? Math.round(Number(s.opens || 0) / Number(s.sent) * 100) : null);
      const stat = h('div', { class: 'small muted' });
      const paint = () => {
        const r = rate();
        const c = Number(s.sent) ? Math.round(Number(s.clicks || 0) / Number(s.sent) * 100) : null;
        stat.textContent = r === null ? '' :
          `${r}% opened${c !== null ? `, ${c}% clicked` : ''}. For an artist list, 40–60% open is normal and healthy; under 25% means the subject line or the frequency is wrong.`;
      };
      paint();

      modal({
        title: isNew ? 'Log a send' : s.subject || 'Send',
        wide: true,
        body: h('div',
          field('Subject', s, 'subject', { placeholder: 'Short. Lowercase is fine. No "Newsletter #4".' }),
          field('What you sent', s, 'body', { multiline: true, tall: true }),
          h('div', { class: 'grid g4' },
            field('Date', s, 'date', { type: 'date' }),
            field('Sent to', s, 'sent', { type: 'number', onInput: paint }),
            field('Opens', s, 'opens', { type: 'number', onInput: paint }),
            field('Clicks', s, 'clicks', { type: 'number', onInput: paint })),
          stat,
          field('Notes', s, 'notes', { multiline: true, placeholder: 'What you would do differently.' })),
        actions: [
          !isNew ? { label: 'Delete', cls: 'btn-danger btn-ghost', onClick: () => { L.sends.splice(L.sends.indexOf(s), 1); S.touch('maillist'); draw(); } } : null,
          'spacer',
          { label: 'Save', cls: 'btn-primary', onClick: () => { if (isNew && (s.subject || s.body)) L.sends.unshift(s); S.touch('maillist'); draw(); } },
        ].filter(Boolean),
      });
    };

    box.append(card(
      cardHead('Sent', btn('Log a send', () => open(null), { cls: 'btn-sm btn-primary', icon: 'plus' })),
      L.sends.length
        ? h('div', { class: 'list' }, L.sends.map(s => {
            const r = Number(s.sent) ? Math.round(Number(s.opens || 0) / Number(s.sent) * 100) : null;
            return h('div', { class: 'item', style: { cursor: 'pointer' }, onClick: () => open(s) },
              h('div', { class: 'item-head' },
                h('span', { class: 'item-title', text: s.subject || 'Untitled' }),
                h('span', { class: 'small muted', text: fmtDate(s.date) }),
                r !== null ? h('span', { class: `tag ${r >= 40 ? 'ok' : r >= 25 ? 'warn' : 'bad'}`, text: `${r}% open` }) : null),
              s.body ? h('div', { class: 'item-body', text: s.body }) : null);
          }))
        : h('div', { class: 'small muted', text: 'Nothing sent yet. The welcome email below is the one to write first — it goes out automatically and it is the only email everyone reads.' })));

    box.append(card(cardHead('The five that matter'),
      h('p', { class: 'small muted' },
        'Placeholders fill from the Release tab. Tap one to copy it, or start a send from it.')));

    SEND_TEMPLATES.forEach(t => {
      const filled = fillTemplate(t.body, set);
      box.append(card(
        cardHead(t.name, h('span', { class: 'tag mono', text: t.when })),
        h('div', { class: 'item-body', style: { WebkitLineClamp: 20, whiteSpace: 'pre-wrap' }, text: filled }),
        h('div', { class: 'row', style: { marginTop: '10px' } },
          btn('Copy', () => copy(filled), { cls: 'btn-sm' }),
          btn('Start a send from this', () => {
            const s = { id: uid(), subject: t.name, body: filled, date: todayISO(), sent: '', opens: '', clicks: '', notes: '' };
            L.sends.unshift(s); S.touch('maillist'); draw();
          }, { cls: 'btn-sm btn-ghost' }))));
    });

    return box;
  }

  /* ---------------------------------------------------------- */
  /*  setup                                                      */
  /* ---------------------------------------------------------- */

  function setupPane() {
    const box = h('div');

    box.append(card(
      cardHead('Your provider'),
      h('div', { class: 'grid g2' },
        selectField('Using', L, 'provider', [['', 'not chosen yet'], ...PROVIDERS.map(p => [p.key, p.name])], { slice: 'maillist' }),
        field('Dashboard URL', L, 'dashUrl', { slice: 'maillist', placeholder: 'https://' })),
      h('p', { class: 'small muted' },
        'Free-tier caps as of September 2026 — they change constantly, so check the pricing page before you sign up.'),
      h('div', { class: 'table-wrap' },
        h('table', { class: 'tbl' },
          h('thead', {}, h('tr', {}, ['Provider', 'Free tier', 'Best for'].map(t => h('th', { text: t })))),
          h('tbody', {}, PROVIDERS.map(p => h('tr', { style: L.provider === p.key ? { background: 'var(--accent-soft)' } : {} },
            h('td', { text: p.name }),
            h('td', { class: 'mono', text: p.free }),
            h('td', { class: 'muted', text: p.good }))))))));

    PROVIDERS.forEach(p => box.append(card(
      cardHead(p.name, h('span', { class: 'tag', text: p.free })),
      h('p', { class: 'small', style: { color: 'var(--fg-2)' }, text: p.note }))));

    box.append(card(
      cardHead('Export & backup', btn('Export what Sid holds', () => {
        const rows = [['date', 'subscribers'], ...counts().map(c => [c.date, c.n])];
        download(`mailing-list-${todayISO()}.csv`, rows.map(r => r.join(',')).join('\n'), 'text/csv');
      }, { cls: 'btn-sm' })),
      h('p', { class: 'small muted' },
        'Sid holds the counts and the sends, not the addresses — those live with your provider. Export the real list to CSV from there every month and keep it in Drive. The provider is rented too.')));

    return box;
  }

  draw();
  return root;
}
