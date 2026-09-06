/* ============================================================
   links.js — the UTM builder and link library

   The problem it solves: without tagging, every platform reports
   the same thing — "someone arrived" — and you cannot tell which
   post, which ad, or which DM did it. Five extra characters on a
   link turns "500 clicks from somewhere" into "380 of those came
   from the Reels ad and 12 from the entire radio campaign".

   Honest limits. This builds and stores the links; it cannot
   count the clicks, because counting needs a redirect service
   sitting between the click and the destination. Where the clicks
   get counted is in your smart-link dashboard and in the
   destination's own analytics, which is exactly where these tags
   show up. There is a field to log the number by hand, because a
   number you typed in once a week beats a dashboard you never open.
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, uid, btn, card, cardHead, empty, field, modal, selectField,
  copy, toast, download, confirmDelete, fmtDate, todayISO, fmtNum, esc,
} from '../ui.js';
import { PLATFORMS } from '../data/platforms.js';
import { barRows, withTable } from '../charts.js';
import { icon, PCOLORS } from '../icons.js';

/* utm_source is where the traffic came from, utm_medium is the
   kind of traffic it was, utm_campaign is the push it belonged to.
   Everyone gets medium wrong: "instagram" is a source, "social"
   or "cpc" is a medium. Keeping these consistent is the whole
   value — one typo and you have two rows where you wanted one. */

export const SOURCES = [
  'instagram', 'youtube', 'tiktok', 'facebook', 'threads', 'x', 'bluesky',
  'reddit', 'whatsapp', 'email', 'spotify', 'linktree', 'press', 'radio', 'qr', 'other',
];

export const MEDIUMS = [
  ['organic_social', 'Organic post'],
  ['cpc', 'Paid — cost per click'],
  ['paid_social', 'Paid — social'],
  ['bio', 'Link in bio'],
  ['story', 'Story link'],
  ['dm', 'Direct message'],
  ['email', 'Email'],
  ['referral', 'Someone else posted it'],
  ['print', 'Print or physical'],
  ['qr', 'QR code'],
];

/* Lower case, no spaces, no punctuation that a URL will mangle.
   Analytics tools treat Instagram and instagram as two different
   sources, which is how one channel ends up split across four rows. */
export const slug = (s) => String(s || '')
  .toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

export function buildUrl(base, p) {
  if (!base) return '';
  let u;
  try { u = new URL(base.includes('://') ? base : 'https://' + base); }
  catch { return ''; }
  const set = (k, v) => { const s = slug(v); if (s) u.searchParams.set(k, s); };
  set('utm_source', p.source);
  set('utm_medium', p.medium);
  set('utm_campaign', p.campaign);
  if (p.content) set('utm_content', p.content);
  if (p.term) set('utm_term', p.term);
  return u.toString();
}

/* ---------------------------------------------------------- */
/*  the pane — used as a subtab inside Ads                     */
/* ---------------------------------------------------------- */

export function linksPane(onChanged) {
  const st = S.get('links');
  st.items = st.items || [];
  const set = S.get('settings');
  const root = h('div');

  const draw = () => {
    clear(root);
    root.append(builderCard());
    root.append(savedCard());
    root.append(performanceCard());
    root.append(rulesCard());
  };

  /* ---------- builder ---------- */

  function builderCard() {
    const d = st.draft = st.draft || {
      base: set.link || '', source: 'instagram', medium: 'organic_social',
      campaign: '', content: '', term: '', label: '',
    };
    if (!d.campaign) d.campaign = slug(set.song || 'release');

    const out = h('div', {
      class: 'mono small',
      style: { wordBreak: 'break-all', padding: '10px 12px', background: 'var(--bg-2)',
        borderRadius: '8px', border: '1px solid var(--line)', minHeight: '20px' },
    });

    const refresh = () => {
      const url = buildUrl(d.base, d);
      out.textContent = url || 'Enter a destination URL above.';
      S.touch('links');
    };

    const inp = (key, ph) => h('input', {
      class: 'inp', value: d[key] || '', placeholder: ph,
      onInput: e => { d[key] = e.target.value; refresh(); },
    });

    const sourceSel = h('select', { class: 'inp',
      onChange: e => { d.source = e.target.value; refresh(); } },
      SOURCES.map(s => h('option', { value: s, selected: d.source === s }, s)));

    const mediumSel = h('select', { class: 'inp',
      onChange: e => { d.medium = e.target.value; refresh(); } },
      MEDIUMS.map(([v, l]) => h('option', { value: v, selected: d.medium === v }, `${l} — ${v}`)));

    const box = card(
      cardHead('Build a tagged link',
        set.link ? btn('Use my smart link', () => { d.base = set.link; draw(); }, { cls: 'btn-sm btn-ghost' }) : null),

      h('label', { class: 'field' },
        h('span', { class: 'lab', text: 'Destination' }),
        inp('base', 'https://your-smart-link.com/track'),
        h('span', { class: 'small muted', text: 'The page you want people to land on — usually your smart link, so the pre-save and the pixel both fire.' })),

      h('div', { class: 'grid g3' },
        h('label', { class: 'field' }, h('span', { class: 'lab', text: 'Source — where from' }), sourceSel),
        h('label', { class: 'field' }, h('span', { class: 'lab', text: 'Medium — what kind' }), mediumSel),
        h('label', { class: 'field' }, h('span', { class: 'lab', text: 'Campaign' }), inp('campaign', 'release_week'))),

      h('div', { class: 'grid g3' },
        h('label', { class: 'field' }, h('span', { class: 'lab', text: 'Content — which creative' }),
          inp('content', 'reel_variant_b'),
          h('span', { class: 'small muted', text: 'This is the one that tells you which of three ad creatives actually worked.' })),
        h('label', { class: 'field' }, h('span', { class: 'lab', text: 'Term — optional' }), inp('term', '')),
        h('label', { class: 'field' }, h('span', { class: 'lab', text: 'Your label for it' }), inp('label', 'IG story, day 1'))),

      h('div', { class: 'lab', style: { marginTop: '10px', marginBottom: '5px' } }, 'The link'),
      out,

      h('div', { class: 'row', style: { marginTop: '12px' } },
        btn('Copy', () => {
          const url = buildUrl(d.base, d);
          if (!url) { toast('Nothing to copy yet'); return; }
          copy(url);
        }, { cls: 'btn-primary btn-sm' }),
        btn('Save to library', () => {
          const url = buildUrl(d.base, d);
          if (!url) { toast('Fill in the destination first'); return; }
          if (st.items.some(x => x.url === url)) { toast('You already have that one'); return; }
          st.items.unshift({
            id: uid(), url, label: d.label || `${d.source} · ${d.medium}`,
            source: slug(d.source), medium: slug(d.medium), campaign: slug(d.campaign),
            content: slug(d.content), term: slug(d.term),
            created: todayISO(), clicks: '', notes: '',
          });
          S.touch('links'); toast('Saved'); onChanged?.(); draw();
        }, { cls: 'btn-sm' })));

    refresh();
    return box;
  }

  /* ---------- library ---------- */

  function savedCard() {
    if (!st.items.length) {
      return card(cardHead('Saved links'),
        empty('Nothing saved yet', 'Build one above and save it, so the tags stay identical next time you post the same thing.'));
    }

    return card(
      cardHead(`Saved links — ${st.items.length}`,
        btn('Export CSV', exportCsv, { cls: 'btn-sm btn-ghost' })),
      h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
        h('thead', {}, h('tr', {}, ['Label', 'Source', 'Medium', 'Campaign', 'Creative', 'Clicks', '', ''].map(t => h('th', { text: t })))),
        h('tbody', {}, st.items.map((it, i) => h('tr', {},
          h('td', {}, h('input', { class: 'inline-inp', value: it.label || '',
            onInput: e => { it.label = e.target.value; S.touch('links'); } })),
          h('td', { class: 'muted small', text: it.source }),
          h('td', { class: 'muted small', text: it.medium }),
          h('td', { class: 'muted small', text: it.campaign }),
          h('td', { class: 'muted small', text: it.content || '—' }),
          h('td', {}, h('input', { class: 'inline-inp tabular', type: 'number', style: { width: '80px' },
            value: it.clicks ?? '', placeholder: '—',
            title: 'Type in what your smart link or analytics reports',
            onInput: e => { it.clicks = e.target.value === '' ? '' : +e.target.value; S.touch('links'); } })),
          h('td', {}, h('button', { class: 'icon-btn', title: 'Copy link',
            onClick: () => copy(it.url) }, h('span', { html: icon('copy'), style: { display: 'flex' } }))),
          h('td', {}, h('button', { class: 'icon-btn', html: '&times;', title: 'Delete',
            onClick: () => confirmDelete('this link', () => { st.items.splice(i, 1); S.touch('links'); draw(); }) }))))))));
  }

  /* ---------- what the numbers say ---------- */

  function performanceCard() {
    const withClicks = st.items.filter(i => +i.clicks > 0);
    if (!withClicks.length) {
      return card(cardHead('What worked'),
        h('p', { class: 'small muted', style: { margin: 0 } },
          'Once a week, open your smart-link dashboard and type the click count into the table above. ' +
          'Two minutes, and it turns a list of links into an answer about where your audience actually comes from.'));
    }

    const group = (key) => {
      const m = new Map();
      withClicks.forEach(i => m.set(i[key] || '—', (m.get(i[key] || '—') || 0) + +i.clicks));
      return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
    };

    const bySource = group('source');
    const byContent = group('content');
    const total = withClicks.reduce((a, i) => a + +i.clicks, 0);

    const box = card(
      cardHead('What worked', h('span', { class: 'small muted', text: `${fmtNum(total)} clicks logged` })),
      withTable(barRows(bySource), ['Source', 'Clicks'], bySource.map(r => [r.label, fmtNum(r.value)])));

    if (byContent.length > 1) {
      box.append(h('div', { class: 'hr' }));
      box.append(h('div', { class: 'lab', style: { marginBottom: '8px' } }, 'By creative'));
      box.append(withTable(barRows(byContent, { color: 'var(--s3)' }),
        ['Creative', 'Clicks'], byContent.map(r => [r.label, fmtNum(r.value)])));
    }
    return box;
  }

  function rulesCard() {
    return card(
      cardHead('The three rules'),
      h('ol', { class: 'prose' },
        h('li', {}, h('strong', { text: 'Lower case, always. ' }),
          'Analytics treats Instagram and instagram as two different sources. Sid slugs everything for you, so as long as you build links here they stay consistent.'),
        h('li', {}, h('strong', { text: 'Source is where, medium is what kind. ' }),
          'instagram is a source. social, cpc, bio are mediums. Getting this backwards is the single most common mistake and it makes the report unreadable.'),
        h('li', {}, h('strong', { text: 'Use utm_content for the creative. ' }),
          'Three ad variants with the same campaign but different content values is how you find out which one earned the money. Without it you get one merged number and learn nothing.')),
      h('p', { class: 'small muted', style: { marginBottom: 0 } },
        'Do not tag links between your own pages, and do not put UTMs on a link you are giving to a playlist curator or a journalist — it looks like tracking and some will not click it. Use a clean link for people, tagged links for distribution.'));
  }

  function exportCsv() {
    const cols = ['label', 'source', 'medium', 'campaign', 'content', 'term', 'clicks', 'created', 'url'];
    const csv = [cols, ...st.items.map(i => cols.map(k => i[k] ?? ''))]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    download('sid-links.csv', csv, 'text/csv');
  }

  draw();
  return root;
}

/** Make a tagged link for a campaign without opening the builder. */
export function linkForCampaign(campaign, source, medium, content) {
  const set = S.get('settings');
  return buildUrl(set.link || '', {
    source, medium, campaign: slug(campaign), content: slug(content || ''),
  });
}
