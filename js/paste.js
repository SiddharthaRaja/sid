/* ============================================================
   paste.js — paste anything, anywhere

   You copy a link, then navigate to the tab, then find the right
   button, then paste. This skips the middle two: paste onto any
   page and Sid works out what it is and offers what you would
   have done with it.
   ============================================================ */

import * as S from './store.js';
import { h, btn, modal, toast, uid, todayISO } from './ui.js';
import { PLATFORMS } from './data/platforms.js';
import { captureSheet } from './capture.js';

const go = (hash) => { location.hash = hash; };

/* ---------------------------------------------------------- */
/*  what is this?                                              */
/* ---------------------------------------------------------- */

export function classify(text) {
  const t = String(text || '').trim();
  if (!t) return null;

  const url = (t.match(/https?:\/\/\S+/) || [])[0] || '';
  const onlyUrl = url && t.length - url.length < 4;

  if (/open\.spotify\.com\/playlist\//.test(t)) return { kind: 'spotify-playlist', url, text: t };
  if (/open\.spotify\.com\/(track|album)\//.test(t)) return { kind: 'spotify-track', url, text: t };
  if (/open\.spotify\.com\/artist\//.test(t)) return { kind: 'spotify-artist', url, text: t };
  if (/(instagram|tiktok|youtube|youtu\.be|threads|x\.com|twitter|bsky)\./.test(t) && onlyUrl) {
    return { kind: 'social-url', url, text: t };
  }
  if (onlyUrl) return { kind: 'url', url, text: t };

  /* a bare number, pasted from a dashboard */
  if (/^[\d,.\s]+$/.test(t) && t.replace(/\D/g, '').length <= 9 && t.replace(/\D/g, '')) {
    return { kind: 'number', n: Number(t.replace(/[^\d.]/g, '')), text: t };
  }

  /* several lines of "label,value" or tab-separated — a CSV export */
  const lines = t.split('\n').filter(Boolean);
  if (lines.length >= 3 && lines.filter(l => /[,\t]/.test(l)).length >= lines.length - 1) {
    return { kind: 'table', text: t, rows: lines.length };
  }

  if (t.length > 25) return { kind: 'text', text: t };
  return { kind: 'short', text: t };
}

/* ---------------------------------------------------------- */
/*  what you probably want to do with it                       */
/* ---------------------------------------------------------- */

function optionsFor(c) {
  const set = S.get('settings');
  const opts = [];

  const toInbox = {
    label: 'Keep it in the Inbox',
    note: 'File it properly later.',
    fn: () => captureSheet({ text: c.text }),
  };

  if (c.kind === 'spotify-playlist') {
    opts.push({
      label: 'Add as a playlist placement',
      note: 'Goes into Playlists as "found" — fill in the curator and follower count there.',
      fn: () => {
        const P = S.get('playlists');
        P.items = P.items || [];
        P.items.push({
          id: uid(), name: '', curator: '', kind: 'user', platform: 'Spotify',
          url: c.url, followers: '', position: '', status: 'found',
          pitchedAt: '', addedAt: '', removedAt: '', checks: [], notes: '',
        });
        S.touch('playlists');
        toast('Added — open it and give it a name');
        go('#/playlists');
      },
    });
  }

  if (c.kind === 'spotify-track' || c.kind === 'spotify-artist') {
    opts.push({
      label: 'Use as the Artist Pick link',
      note: 'Sets the pin on your Spotify profile tab.',
      fn: () => { const sp = S.get('sprofile'); sp.pickUrl = c.url; S.touch('sprofile'); toast('Saved'); go('#/p/spotify/profile'); },
    });
    opts.push({
      label: 'Set as the smart link',
      note: 'Used by every template and every caption placeholder.',
      fn: () => { set.link = c.url; S.touch('settings'); toast('Smart link set'); },
    });
  }

  if (c.kind === 'url' || c.kind === 'social-url' || c.kind === 'spotify-track') {
    opts.push({
      label: 'Make a tagged link',
      note: 'Opens the UTM builder with this URL in it.',
      /* Merge into the draft — replacing it wholesale wiped the
         half-built tagged link (campaign, creative, label) and put
         the URL in a key the builder does not even read. */
      fn: () => {
        const L = S.get('links');
        L.draft = { ...(L.draft || {}), base: c.url };
        S.touch('links');
        go('#/ads/links');
      },
    });
  }

  if (c.kind === 'text' || c.kind === 'short') {
    const plat = PLATFORMS[0];
    opts.push({
      label: 'Save as a draft caption',
      note: `Drops into ${plat.name} → ${plat.types[0].label} as a draft.`,
      fn: () => {
        const slice = `p_${plat.key}`;
        const st = S.get(slice);
        st.content = st.content || {};
        st.content[plat.types[0].key] = st.content[plat.types[0].key] || [];
        st.content[plat.types[0].key].push({
          id: uid(), title: c.text.split('\n')[0].slice(0, 40), body: c.text,
          status: 'draft', when: '', media: [],
        });
        S.touch(slice);
        toast('Saved as a draft');
        go(`#/p/${plat.key}/${plat.types[0].key}`);
      },
    });
    opts.push({
      label: 'Save to the swipe file',
      note: 'Someone else\'s caption, kept for the shape of it.',
      fn: () => {
        const w = S.get('write');
        w.swipe = w.swipe || [];
        w.swipe.unshift({ id: uid(), text: c.text, who: '', why: '', platform: '', added: todayISO() });
        S.touch('write');
        toast('In the swipe file');
        go('#/write/swipe');
      },
    });
  }

  if (c.kind === 'number') {
    opts.push({
      label: `Log ${c.n.toLocaleString()} as the subscriber count`,
      note: 'Mailing list, dated today.',
      fn: () => {
        const L = S.get('maillist');
        L.counts = L.counts || [];
        const t = todayISO();
        const ex = L.counts.find(x => x.date === t);
        if (ex) ex.n = c.n; else L.counts.push({ id: uid(), date: t, n: c.n });
        S.touch('maillist');
        toast('Logged');
        go('#/list');
      },
    });
  }

  if (c.kind === 'table') {
    opts.push({
      label: `Import ${c.rows} rows as stats`,
      note: 'Opens the CSV importer on the Statistics tab.',
      fn: () => { toast('Paste it into the importer on the Statistics tab'); go('#/stats'); },
    });
  }

  opts.push(toInbox);
  return opts;
}

/* ---------------------------------------------------------- */
/*  the handler                                                */
/* ---------------------------------------------------------- */

export function initPaste() {
  /* nothing may be captured before the store knows whose data it is */
  document.addEventListener('paste', (e) => {
    /* Nothing may be captured before the store knows whose data it is.
       This listener is live on the sign-in screen too, and anything it
       wrote there went into an unowned bucket and was dropped. */
    if (!S.isReady()) return;
    /* if you are typing in a field, a paste is just a paste */
    const a = document.activeElement;
    if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;
    if (a && a.isContentEditable) return;
    if (!document.getElementById('modal-root')?.hidden) return;   // a modal is open

    const text = (e.clipboardData || window.clipboardData)?.getData('text') || '';
    const c = classify(text);
    if (!c) return;
    e.preventDefault();

    const opts = optionsFor(c);
    const body = h('div',
      h('div', { class: 'item', style: { cursor: 'default' } },
        h('div', { class: 'item-body', style: { WebkitLineClamp: 4 }, text: c.text })),
      h('p', { class: 'small muted', style: { margin: '12px 0 8px' }, text: 'What should this become?' }),
      h('div', { class: 'list' }, opts.map(o => h('div', {
        class: 'item', onClick: () => { close(); setTimeout(o.fn, 60); },
      },
        h('div', { class: 'item-head' }, h('span', { class: 'item-title', text: o.label })),
        o.note ? h('div', { class: 'item-meta' }, h('span', { text: o.note })) : null))));

    const { close } = modal({ title: 'Pasted', body, actions: [{ label: 'Cancel' }] });
  });
}
