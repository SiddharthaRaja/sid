/* ============================================================
   playbook.js — the ten platform documents, in the app

   These are reference documents, not notes: you shop from them
   rather than maintain them, so nothing here is editable and
   nothing syncs except which ones you have read and pinned.

   Three decisions worth knowing:

   • A document is fetched the first time you open it, not at
     boot. They are 280 KB together and most sessions never open
     one. The service worker's runtime cache keeps whatever you
     have actually read, so they work offline afterwards.

   • They render one section at a time. The Instagram document is
     1,586 lines; building that as one DOM tree on a phone is
     slow and, worse, unnavigable. Sections split on the `##`
     headings, which is exactly how the documents are written.

   • Every fenced block — the captions, the pitch templates, the
     hooks — gets a copy button. That is the whole point of having
     them in the app rather than in a folder: on the phone, at the
     moment you are writing a post, a caption is one tap away.
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, btn, card, cardHead, pageHead, empty, toast, copy, md, prose, fmtNum,
} from '../ui.js';
import { icon, PCOLORS } from '../icons.js';
import { PLAYBOOKS, findBook, BOOK_PATH } from '../data/playbooks.js';

const B = () => S.get('book');
const save = () => S.touch('book');

/* fetched documents, for this page load */
const cache = new Map();

function rerender() {
  const host = document.querySelector('#view');
  if (!host) return;
  clear(host);
  host.append(renderPlaybook());
}

/* ---------------------------------------------------------- */
/*  loading and splitting                                      */
/* ---------------------------------------------------------- */

async function load(book) {
  if (cache.has(book.id)) return cache.get(book.id);
  const res = await fetch(BOOK_PATH + book.file, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`${book.file} — ${res.status}`);
  const text = await res.text();
  const parsed = split(text);
  cache.set(book.id, parsed);
  return parsed;
}

/**
 * Splits a document on its `##` headings. Everything above the
 * first one becomes the opening section, which is where the
 * "how to use this document" material lives.
 */
function split(text) {
  const lines = text.split('\n');
  const out = [];
  let cur = { title: 'Opening', body: [] };

  lines.forEach(l => {
    const m = l.match(/^##\s+(?!#)(.*)/);
    if (m) {
      if (cur.body.join('\n').trim()) out.push({ ...cur, body: cur.body.join('\n') });
      cur = { title: m[1].trim(), body: [] };
    } else {
      cur.body.push(l);
    }
  });
  if (cur.body.join('\n').trim()) out.push({ ...cur, body: cur.body.join('\n') });

  const words = text.split(/\s+/).length;
  return { sections: out, words, minutes: Math.max(1, Math.round(words / 220)) };
}

/** A short label for a section chip — the numbers are noise on a phone. */
const chipLabel = (t) => t.replace(/^\d+\.\s*/, '').replace(/^[⭐⚠️]+\s*/, '').trim();

/* ---------------------------------------------------------- */
/*  rendering a section                                        */
/* ---------------------------------------------------------- */

/**
 * md() has no fenced-code support and adding it there would change
 * every other page in the app. Here the fences are pulled out
 * first, rendered as copyable blocks, and the prose between them
 * goes through md() as usual.
 */
function renderBody(body) {
  const box = h('div');
  const parts = String(body).split(/^```.*$/m);
  const fenced = [...String(body).matchAll(/^```.*$/gm)];

  parts.forEach((part, i) => {
    const isCode = i % 2 === 1;          // between an opening and closing fence
    if (!part.trim()) return;

    if (isCode) {
      const text = part.replace(/^\n/, '').replace(/\n$/, '');
      const pre = h('pre', { class: 'pb-code', text });
      const b = btn('Copy', () => {
        copy(text);
        b.textContent = 'Copied';
        setTimeout(() => { b.textContent = 'Copy'; }, 1400);
      }, { cls: 'btn-sm btn-ghost' });
      box.append(h('div', { class: 'pb-block' }, pre, h('div', { class: 'pb-copy' }, b)));
    } else {
      box.append(prose(part));
    }
  });

  if (!fenced.length && !box.childElementCount) box.append(prose(body));
  return box;
}

/* ---------------------------------------------------------- */
/*  entry                                                      */
/* ---------------------------------------------------------- */

export function renderPlaybook(sub) {
  const st = B();
  if (sub && findBook(sub)) st.open = sub;
  const book = findBook(st.open);
  return book ? reader(book) : library();
}

/* ---------------------------------------------------------- */
/*  library                                                    */
/* ---------------------------------------------------------- */

function library() {
  const st = B();
  const box = h('div');

  box.append(pageHead('Playbooks',
    'The ten platform documents. Reference, not notes — you shop from these.'));

  /* ---- search across all ten ---- */
  const results = h('div');
  const input = h('input', {
    class: 'inp', placeholder: 'Search all ten…', autocomplete: 'off',
  });
  const go = async () => {
    const q = input.value.trim().toLowerCase();
    clear(results);
    if (q.length < 3) {
      if (q) results.append(h('div', { class: 'small muted', text: 'Three letters or more.' }));
      return;
    }
    results.append(h('div', { class: 'small muted', text: 'Looking…' }));
    const hits = [];
    for (const bk of PLAYBOOKS) {
      let doc;
      try { doc = await load(bk); } catch { continue; }
      doc.sections.forEach((sec, si) => {
        sec.body.split('\n').forEach(line => {
          if (line.toLowerCase().includes(q) && line.trim().length > 3) {
            hits.push({ bk, si, title: sec.title, line: line.trim() });
          }
        });
      });
    }
    clear(results);
    if (!hits.length) {
      results.append(h('div', { class: 'small muted', text: `Nothing for "${q}".` }));
      return;
    }
    results.append(h('div', { class: 'small muted', style: { marginBottom: '6px' },
      text: `${hits.length} line${hits.length === 1 ? '' : 's'} across ${new Set(hits.map(x => x.bk.id)).size} documents` }));
    results.append(h('div', { class: 'list' }, hits.slice(0, 60).map(hit => h('button', {
      class: 'item', style: { width: '100%', textAlign: 'left' },
      onClick: () => {
        st.open = hit.bk.id;
        /* Which section to scroll to once the article is rendered —
           it is one long page now, not a set of tabs. */
        st.sec = { ...(st.sec || {}), [hit.bk.id]: hit.si };
        save(); rerender();
      },
    },
      h('div', { class: 'item-head' },
        h('span', { html: icon(hit.bk.icon), style: { color: PCOLORS[hit.bk.icon] || 'var(--fg-3)' } }),
        h('span', { class: 'item-title', text: hit.bk.title }),
        h('span', { class: 'tag', text: chipLabel(hit.title) })),
      h('div', { class: 'small muted', style: { marginTop: '3px' },
        text: hit.line.length > 160 ? hit.line.slice(0, 160) + '…' : hit.line })))));
    if (hits.length > 60) {
      results.append(h('div', { class: 'small muted', style: { marginTop: '8px' },
        text: 'Showing the first 60. Narrow the search.' }));
    }
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });

  box.append(card(
    h('div', { class: 'row' }, input, btn('Search', go, { cls: 'btn-sm btn-primary' })),
    h('p', { class: 'small muted', style: { marginTop: '8px' } },
      'Searches every line of all ten documents — a hashtag, a phrase, "T-35", a platform. The first search downloads them; after that it is instant and works offline.'),
    results));

  /* ---- pinned first, then the rest in order ---- */
  const pinned = PLAYBOOKS.filter(p => (st.pinned || {})[p.id]);
  const rest = PLAYBOOKS.filter(p => !(st.pinned || {})[p.id]);

  if (pinned.length) {
    box.append(h('div', { class: 'nav-sect', style: { paddingLeft: 0 } }, 'Pinned'));
    pinned.forEach(p => box.append(bookCard(p)));
    box.append(h('div', { class: 'nav-sect', style: { paddingLeft: 0 } }, 'The rest'));
  }
  rest.forEach(p => box.append(bookCard(p)));

  const readCount = PLAYBOOKS.filter(p => (st.read || {})[p.id]).length;
  box.append(card(
    h('p', { class: 'small muted' },
      `${readCount} of ${PLAYBOOKS.length} marked read. These were written against your master release plan and the density analysis — where they disagree with something in the app, the documents are the newer thinking.`)));

  return box;
}

function bookCard(p) {
  const st = B();
  const isPinned = !!(st.pinned || {})[p.id];
  const isRead = !!(st.read || {})[p.id];

  return h('div', {
    class: 'card clickable',
    onClick: (e) => {
      if (e.target.closest('button')) return;
      st.open = p.id; save(); rerender();
    },
  },
    h('div', { class: 'item-head' },
      h('span', { html: icon(p.icon), style: { color: PCOLORS[p.icon] || 'var(--fg-3)' } }),
      h('span', { class: 'item-title', text: p.title }),
      h('span', { class: 'tag', text: p.short }),
      isRead ? h('span', { class: 'tag ok', text: 'read' }) : null),
    h('div', { class: 'small muted', style: { marginTop: '5px' }, text: p.blurb }),
    h('div', { class: 'row', style: { marginTop: '10px' } },
      h('span', { class: 'small', style: { color: 'var(--fg-3)' }, text: p.holds }),
      h('div', { class: 'spacer' }),
      btn(isPinned ? 'Unpin' : 'Pin', () => {
        st.pinned = { ...(st.pinned || {}) };
        if (isPinned) delete st.pinned[p.id]; else st.pinned[p.id] = true;
        save(); rerender();
      }, { cls: 'btn-sm btn-ghost' })));
}

/* ---------------------------------------------------------- */
/*  reader                                                     */
/* ---------------------------------------------------------- */

function reader(book) {
  const st = B();
  const box = h('div');

  const head = h('div', { class: 'row', style: { marginBottom: '10px' } },
    btn('← All', () => { st.open = null; save(); rerender(); }, { cls: 'btn-sm' }),
    h('h1', { style: { fontSize: '19px', margin: 0 }, text: book.title }),
    h('div', { class: 'spacer' }),
    btn((st.read || {})[book.id] ? 'Read' : 'Mark read', () => {
      st.read = { ...(st.read || {}) };
      if (st.read[book.id]) delete st.read[book.id]; else st.read[book.id] = Date.now();
      save(); rerender();
    }, { cls: `btn-sm ${(st.read || {})[book.id] ? 'btn-ghost' : ''}` }));

  /* One continuous article.

     It used to be paged: a strip of section tabs, one section on
     screen, and prev/next buttons at the bottom. For a reference
     document you read straight through — and for the Instagram one,
     1,600 lines of it — that turns reading into clicking. The whole
     thing renders at once now; the strip becomes a jump list. */
  const jump = h('div', { class: 'row', style: { flexWrap: 'wrap', marginBottom: '14px' } });
  const body = h('div');

  box.append(head, jump, body);
  body.append(h('div', { class: 'small muted', text: 'Loading…' }));

  load(book).then(doc => {
    clear(body);
    clear(jump);

    body.append(h('div', { class: 'small muted', style: { marginBottom: '14px' },
      text: `${doc.sections.length} sections · ${fmtNum(doc.words)} words · about ${doc.minutes} min to read` }));

    doc.sections.forEach((sec, i) => {
      const id = `pb-${book.id}-${i}`;
      jump.append(h('button', {
        class: 'chip', onClick: () => {
          const el = document.getElementById(id);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        },
      }, chipLabel(sec.title)));

      body.append(h('h2', {
        id, class: 'pb-h',
        style: { margin: i ? '34px 0 4px' : '0 0 4px', fontSize: '17px', scrollMarginTop: '64px' },
        text: sec.title,
      }));
      body.append(renderBody(sec.body));
    });

    /* Back to the jump list without scrolling all the way up. */
    body.append(h('div', { class: 'row', style: { marginTop: '28px' } },
      btn('Back to the top', () => window.scrollTo({ top: 0, behavior: 'smooth' }), { cls: 'btn-sm' })));

    /* Arrived from a search hit: go to that section. */
    const want = (st.sec || {})[book.id];
    if (want) {
      setTimeout(() => {
        document.getElementById(`pb-${book.id}-${want}`)?.scrollIntoView({ block: 'start' });
      }, 60);
      st.sec = { ...(st.sec || {}) };
      delete st.sec[book.id];
      save();
    }
  }).catch(e => {
    clear(body);
    body.append(empty('That document would not load', String(e.message || e)),
      card(h('p', { class: 'small muted' },
        'The documents live in docs/social/ in the repo. If this is a fresh deploy, the file may not be pushed yet.')));
  });

  return box;
}
