/* ============================================================
   history.js — the reading library
   Long-form articles on where music came from and who made it,
   with a reading view and read-aloud.
   ============================================================ */

import * as S from '../store.js';
import * as R from '../reader.js';
import {
  h, clear, btn, card, cardHead, empty, subtabs, stat, toast, copy, download,
  prose, md, esc, fmtNum,
} from '../ui.js';
import { ARTICLES, SECTIONS, GROUPS, byId } from '../data/history/index.js';
import { icon } from '../icons.js';

export function renderHistory(sub) {
  const st = S.get('history');
  st.read = st.read || {};        // id -> true when finished
  st.pos = st.pos || {};          // id -> last chunk index heard
  st.saved = st.saved || {};      // id -> bookmarked

  /* a sub of an article id opens the reader */
  const article = sub ? byId(decodeURIComponent(sub)) : null;
  return article ? readerView(article, st) : libraryView(st);
}

/* ---------------------------------------------------------- */
/*  library                                                    */
/* ---------------------------------------------------------- */

function libraryView(st) {
  const root = h('div');
  let section = SECTIONS.find(s => ARTICLES.some(a => a.section === s.key))?.key || 'genres';
  let group = 'all';
  let query = '';
  let onlyUnread = false;

  const draw = () => {
    clear(root);

    const inSection = ARTICLES.filter(a => a.section === section);
    const readN = ARTICLES.filter(a => st.read[a.id]).length;
    const words = ARTICLES.reduce((n, a) => n + (a.body || '').split(/\s+/).length, 0);

    root.append(h('div', { class: 'page-head' },
      h('div', {},
        h('h1', { text: 'History' }),
        h('div', { class: 'sub', text:
          `${ARTICLES.length} articles · ${fmtNum(words)} words · ${readN} read` })),
      h('div', { class: 'spacer' })));

    /* continue where you left off */
    const inProgress = ARTICLES.filter(a => st.pos[a.id] > 0 && !st.read[a.id])
      .sort((a, b) => (st.pos[b.id] || 0) - (st.pos[a.id] || 0)).slice(0, 3);
    if (inProgress.length) {
      root.append(card(cardHead('Carry on'),
        h('div', { class: 'list' }, inProgress.map(a => row(a, st)))));
    }

    root.append(subtabs(
      SECTIONS.filter(s => ARTICLES.some(a => a.section === s.key)).map(s => [s.key, s.label]),
      section, k => { section = k; group = 'all'; draw(); }));

    /* filters */
    const groups = GROUPS(section);
    root.append(h('div', { class: 'row', style: { marginBottom: '14px' } },
      h('input', {
        class: 'inp', style: { maxWidth: '230px' }, placeholder: 'Search these articles…',
        value: query,
        onInput: (e) => { query = e.target.value; drawList(); },
      }),
      h('button', { class: `chip ${group === 'all' ? 'on' : ''}`,
        onClick: () => { group = 'all'; draw(); } }, `All ${inSection.length}`),
      groups.map(g => h('button', {
        class: `chip ${group === g ? 'on' : ''}`,
        onClick: () => { group = g; draw(); },
      }, `${g} ${inSection.filter(a => a.group === g).length}`)),
      h('button', { class: `chip ${onlyUnread ? 'on' : ''}`,
        onClick: () => { onlyUnread = !onlyUnread; drawList(); } }, 'Unread only')));

    const listBox = h('div');
    root.append(listBox);

    function drawList() {
      clear(listBox);
      const q = query.toLowerCase().trim();
      const shown = inSection
        .filter(a => group === 'all' || a.group === group)
        .filter(a => !onlyUnread || !st.read[a.id])
        .filter(a => !q || (a.title + ' ' + (a.subtitle || '') + ' ' + (a.tags || []).join(' ') + ' ' + a.body)
          .toLowerCase().includes(q));

      if (!shown.length) {
        listBox.append(empty('Nothing matches',
          inSection.length ? 'Try a different filter.' : 'No articles in this section yet.'));
        return;
      }

      if (group === 'all' && !q) {
        GROUPS(section).forEach(g => {
          const items = shown.filter(a => a.group === g);
          if (!items.length) return;
          listBox.append(h('div', { class: 'nav-sect', style: { padding: '16px 0 8px' }, text: g }));
          listBox.append(h('div', { class: 'list' }, items.map(a => row(a, st))));
        });
      } else {
        listBox.append(h('div', { class: 'list' }, shown.map(a => row(a, st))));
      }
    }
    drawList();
  };

  draw();
  return root;
}

function row(a, st) {
  const done = st.read[a.id];
  const pos = st.pos[a.id] || 0;
  return h('a', {
    class: 'item', href: `#/history/${encodeURIComponent(a.id)}`,
    style: { display: 'block', textDecoration: 'none', color: 'inherit',
      borderColor: done ? 'var(--ok)' : '' },
  },
    h('div', { class: 'item-head' },
      h('span', { class: 'item-title', text: a.title }),
      a.era ? h('span', { class: 'tag mono', text: a.era }) : null,
      done ? h('span', { class: 'tag ok', text: 'read' })
           : pos ? h('span', { class: 'tag warn', text: 'in progress' }) : null),
    a.subtitle ? h('div', { class: 'item-body', text: a.subtitle }) : null,
    h('div', { class: 'item-meta' },
      h('span', { text: `${a.minutes || Math.round((a.body || '').split(/\s+/).length / 200)} min read` }),
      st.saved[a.id] ? h('span', { text: 'saved' }) : null,
      (a.tags || []).slice(0, 4).map(t => h('span', { text: t }))));
}

/* ---------------------------------------------------------- */
/*  reader                                                     */
/* ---------------------------------------------------------- */

function readerView(a, st) {
  const root = h('div', { class: 'reader' });
  const chunks = R.toChunks(a.body);

  root.append(h('div', { class: 'row', style: { marginBottom: '18px' } },
    h('a', { class: 'btn btn-sm', href: '#/history' },
      h('span', { html: icon('back'), style: { display: 'flex' } }), 'Library'),
    h('div', { style: { flex: 1 } }),
    btn(st.saved[a.id] ? 'Saved' : 'Save', () => {
      st.saved[a.id] = !st.saved[a.id]; S.touch('history');
      toast(st.saved[a.id] ? 'Saved' : 'Removed');
      window.__sid?.rerender();
    }, { cls: `btn-sm ${st.saved[a.id] ? '' : 'btn-ghost'}` }),
    btn(st.read[a.id] ? 'Read ✓' : 'Mark read', () => {
      st.read[a.id] = !st.read[a.id]; S.touch('history');
      window.__sid?.rerender();
    }, { cls: `btn-sm ${st.read[a.id] ? '' : 'btn-ghost'}` }),
    btn('Listen', () => {
      R.load({ id: a.id, title: a.title, subtitle: a.subtitle }, chunks, st.pos[a.id] || 0);
      R.play();
    }, { cls: 'btn-sm btn-primary', icon: 'bell' })));

  /* header */
  root.append(h('header', { class: 'art-head' },
    h('div', { class: 'art-kicker' },
      a.group, a.era ? ' · ' + a.era : ''),
    h('h1', { class: 'art-title', text: a.title }),
    a.subtitle ? h('p', { class: 'art-sub', text: a.subtitle }) : null,
    h('div', { class: 'art-meta' },
      h('span', { text: `${a.minutes || Math.round((a.body || '').split(/\s+/).length / 200)} min read` }),
      h('span', { text: `${chunks.length} passages` }),
      (a.tags || []).length ? h('span', { text: (a.tags || []).join(' · ') }) : null)));

  /* contents */
  const heads = (a.body.match(/^##\s+(.*)$/gm) || []).map(s => s.replace(/^##\s+/, ''));
  if (heads.length > 2) {
    root.append(h('details', { class: 'toc' },
      h('summary', { text: `Contents — ${heads.length} sections` }),
      h('ol', {}, heads.map((t, i) => h('li', {},
        h('a', {
          href: '#', text: t,
          onClick: (e) => {
            e.preventDefault();
            root.querySelectorAll('.prose h2')[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          },
        }))))));
  }

  root.append(prose(a.body));

  /* footer nav */
  const siblings = ARTICLES.filter(x => x.section === a.section);
  const i = siblings.indexOf(a);
  root.append(h('div', { class: 'row', style: { marginTop: '36px', gap: '8px' } },
    i > 0 ? h('a', { class: 'btn btn-sm', href: `#/history/${encodeURIComponent(siblings[i - 1].id)}` },
      '← ' + siblings[i - 1].title) : null,
    h('div', { style: { flex: 1 } }),
    i < siblings.length - 1 ? h('a', { class: 'btn btn-sm', href: `#/history/${encodeURIComponent(siblings[i + 1].id)}` },
      siblings[i + 1].title + ' →') : null));

  root.append(h('div', { class: 'row', style: { marginTop: '18px' } },
    btn('Copy as text', () => copy(a.body), { cls: 'btn-sm btn-ghost' }),
    btn('Download', () => download(`${a.id}.md`,
      `# ${a.title}\n\n_${a.subtitle || ''}_\n\n${a.body}\n`, 'text/markdown'), { cls: 'btn-sm btn-ghost' })));

  return root;
}
