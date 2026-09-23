/* ============================================================
   compose.js — the writing aids, reusable wherever text is typed

   The linter, the fold preview, the phrase bank picker, the
   weak-word fixer and the optional AI menu. The item editor and
   the batch writer both build from these, so a rule only ever
   exists in one place.
   ============================================================ */

import * as S from '../store.js';
import { h, clear, btn, card, cardHead, modal, toast, copy, uid, esc } from '../ui.js';
import { lint, fold, hashtagsIn, firstLine } from '../lint.js';
import { foldOf, PLATFORM_SEO } from '../data/seo.js';
import { HOOKS, HOOK_KINDS, CTAS, OPENERS, TRANSITIONS, WEAK, SYNONYMS, STRUCTURES } from '../data/phrasebank.js';
import { fillTemplate } from '../data/templates.js';
import { PLATFORMS } from '../data/platforms.js';
import * as A from '../assist.js';
import { icon, PCOLORS } from '../icons.js';

/* ---------------------------------------------------------- */
/*  recent posts, for the repetition check                     */
/* ---------------------------------------------------------- */

export function recentBodies(platformKey, exclude) {
  const sl = S.get(`p_${platformKey}`);
  const all = Object.values(sl.content || {}).flat().filter(Boolean);
  return all
    .filter(i => i !== exclude && i.body)
    .sort((a, b) => String(b.postedAt || b.when || '').localeCompare(String(a.postedAt || a.when || '')))
    .slice(0, 10)
    .map(i => i.body);
}

/* ---------------------------------------------------------- */
/*  linter panel                                               */
/* ---------------------------------------------------------- */

export function lintPanel(getText, opts = {}) {
  const el = h('div', { class: 'lint' });

  const refresh = () => {
    clear(el);
    const items = lint(getText(), opts);
    if (!items.length) {
      el.append(h('div', { class: 'lint-row ok' }, h('span', { class: 'lint-dot' }), 'Nothing to flag.'));
      return;
    }
    items.forEach(i => el.append(h('div', { class: `lint-row ${i.level}` },
      h('span', { class: 'lint-dot' }),
      h('div', {}, h('span', { text: i.msg }),
        i.fix ? h('div', { class: 'lint-fix', text: i.fix }) : null))));
  };
  refresh();
  return { el, refresh };
}

/* ---------------------------------------------------------- */
/*  fold preview                                               */
/* ---------------------------------------------------------- */

/** What the post looks like in the feed, including where it cuts. */
export function previewBox(getText, platformKey, typeKey) {
  const p = PLATFORMS.find(x => x.key === platformKey);
  const set = S.get('settings');
  const el = h('div', { class: 'pv' });

  const refresh = () => {
    clear(el);
    const n = foldOf(platformKey, typeKey);
    const { shown, hidden, folds } = fold(getText(), n);

    el.append(h('div', { class: 'pv-head' },
      h('span', { class: 'pv-av', text: (set.artist || 'A').slice(0, 1).toUpperCase() }),
      h('div', {},
        h('div', { class: 'pv-name', text: set.handle || set.artist || 'your handle' }),
        h('div', { class: 'pv-meta', text: p ? p.name : '' }))));

    const body = h('div', { class: 'pv-body' });
    if (!getText().trim()) body.append(h('span', { class: 'muted', text: 'Nothing written yet.' }));
    else {
      body.append(h('span', { text: shown }));
      if (folds) {
        body.append(h('span', { class: 'pv-more', text: '… more' }));
        body.append(h('span', { class: 'pv-hidden', text: hidden }));
      }
    }
    el.append(body);
    el.append(h('div', { class: 'pv-foot small muted', text: folds
      ? `Cuts after ${n} characters — everything greyed out needs a tap.`
      : n ? `Under the ${n}-character fold, so all of it shows.` : 'No fold on this one.' }));
  };
  refresh();
  return { el, refresh };
}

/* ---------------------------------------------------------- */
/*  phrase bank picker                                         */
/* ---------------------------------------------------------- */

export function phraseModal({ onInsert, about = '', platform = '' }) {
  const set = S.get('settings');
  let kind = 'all';
  const body = h('div');
  const list = h('div', { class: 'list' });

  const custom = S.get('write').phrases || [];

  const row = (text, tag) => h('div', { class: 'item', style: { cursor: 'pointer' },
    onClick: () => { onInsert(fillTemplate(text, set)); close(); } },
    h('div', { class: 'item-head' },
      h('span', { class: 'item-title', text: fillTemplate(text, set) }),
      tag ? h('span', { class: 'tag', text: tag }) : null));

  const draw = () => {
    clear(list);
    if (kind === 'cta') CTAS.forEach(c => list.append(row(c.text, c.kind)));
    else if (kind === 'opener') { OPENERS.forEach(o => list.append(row(o, 'opener'))); TRANSITIONS.forEach(o => list.append(row(o, 'transition'))); }
    else if (kind === 'mine') {
      if (!custom.length) list.append(h('div', { class: 'small muted', text: 'Nothing saved yet — the Writing desk has a Save a phrase button.' }));
      custom.forEach(c => list.append(row(c.text, c.tag || 'saved')));
    } else {
      HOOKS.filter(hk => kind === 'all' || hk.kind === kind)
        .forEach(hk => list.append(row(hk.text, (HOOK_KINDS.find(k => k[0] === hk.kind) || [])[1])));
    }
  };

  const chips = h('div', { class: 'row', style: { marginBottom: '10px', flexWrap: 'wrap' } },
    [['all', 'All hooks'], ...HOOK_KINDS, ['cta', 'Endings'], ['opener', 'Openers'], ['mine', 'Saved']]
      .map(([k, label]) => h('button', { class: `chip ${kind === k ? 'on' : ''}`,
        onClick: (e) => { kind = k; [...e.target.parentNode.children].forEach(c => c.classList.remove('on')); e.target.classList.add('on'); draw(); } }, label)));

  body.append(h('p', { class: 'small muted' },
    'Tap one to drop it in. Anything in [brackets] fills from the Release tab where it can, and stays visible where it cannot.'),
    chips, list);

  draw();

  const aiRow = A.hasKey() ? h('div', { style: { marginTop: '12px' } },
    btn('Write 8 more for this post', async (e) => {
      const b = e.target.closest('button'); b.disabled = true; b.textContent = 'thinking…';
      try {
        const text = await A.hooks(about || `a ${platform} post for "${set.song || 'the single'}"`, set);
        clear(list);
        text.split('\n').map(s => s.replace(/^[-*\d.)\s]+/, '').trim()).filter(Boolean)
          .forEach(t => list.append(row(t, 'new')));
      } catch (err) { toast(err.message, 4000); }
      b.disabled = false; b.textContent = 'Write 8 more for this post';
    }, { cls: 'btn-sm' })) : null;
  if (aiRow) body.append(aiRow);

  const { close } = modal({ title: 'Phrase bank', body, wide: true });
}

/* ---------------------------------------------------------- */
/*  weak-word fixer                                            */
/* ---------------------------------------------------------- */

export function fixModal({ getText, setText }) {
  const text = getText();
  const lower = text.toLowerCase();
  const found = Object.keys(WEAK).filter(w => {
    const re = new RegExp(`(^|[^\\p{L}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\p{L}]|$)`, 'iu');
    return re.test(lower);
  });

  const body = h('div');
  if (!found.length) {
    body.append(h('p', { class: 'small muted', text: 'No filler words found. Look up a word instead:' }));
  } else {
    body.append(h('p', { class: 'small muted', text: 'Tap a replacement and it swaps the first occurrence.' }));
    found.forEach(w => {
      body.append(h('div', { class: 'item' },
        h('div', { class: 'item-head' }, h('span', { class: 'item-title mono', text: w })),
        h('div', { class: 'row', style: { marginTop: '6px', flexWrap: 'wrap' } },
          WEAK[w].map(alt => h('button', { class: 'chip', onClick: () => {
            const re = new RegExp(`(^|[^\\p{L}])(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})([^\\p{L}]|$)`, 'iu');
            const repl = alt.startsWith('—') ? '' : alt;
            setText(getText().replace(re, (m, a, b, c) => `${a}${repl}${c}`).replace(/ {2,}/g, ' '));
            close();
          } }, alt)))));
    });
  }

  /* dictionary lookup, for anything else */
  const out = h('div', { class: 'row', style: { flexWrap: 'wrap', marginTop: '8px' } });
  const look = h('input', { class: 'inp', placeholder: 'song, quiet, release…',
    onInput: (e) => {
      clear(out);
      const q = e.target.value.toLowerCase().trim();
      const hit = SYNONYMS[q] || (q && Object.keys(SYNONYMS).find(k => k.startsWith(q)) ? SYNONYMS[Object.keys(SYNONYMS).find(k => k.startsWith(q))] : null);
      if (!hit) { out.append(h('span', { class: 'small muted', text: q ? 'Not in the bank.' : '' })); return; }
      hit.forEach(s => out.append(h('button', { class: 'chip', onClick: () => { copy(s); } }, s)));
    } });
  body.append(h('div', { class: 'hr' }),
    h('label', { class: 'field' }, h('span', { class: 'lab', text: 'Look up a word' }), look, out),
    h('div', { class: 'small muted', text: 'Tap a synonym to copy it.' }));

  const { close } = modal({ title: 'Word help', body, wide: true });
}

/* ---------------------------------------------------------- */
/*  optional AI menu                                           */
/* ---------------------------------------------------------- */

export function assistButton({ getText, setText, platform, type, onDone }) {
  return btn('Assist', () => {
    const set = S.get('settings');
    if (!A.hasKey()) {
      modal({
        title: 'Writing assistant',
        body: h('div',
          h('p', { class: 'small muted' },
            'Sid has no server, so generated text needs your own API key. It is stored in this browser only — not in Firestore, not in a backup, not on your phone unless you paste it there too.'),
          h('p', { class: 'small muted' },
            'At the length of a caption this costs a fraction of a paisa per call. Everything else in the app works without it.')),
        actions: [{ label: 'Not now' }, { label: 'Set it up', cls: 'btn-primary', onClick: () => location.hash = '#/settings/appearance' }],
      });
      return;
    }

    const out = h('div');
    const run = async (label, fn) => {
      clear(out);
      out.append(h('div', { class: 'small muted', text: 'thinking…' }));
      try {
        const text = await fn();
        clear(out);
        const parts = text.split(/^---$/m).map(s => s.trim()).filter(Boolean);
        parts.forEach(pt => out.append(h('div', { class: 'item' },
          h('div', { class: 'item-body', style: { WebkitLineClamp: 12 }, text: pt }),
          h('div', { class: 'row', style: { marginTop: '8px' } },
            /* This replaces your whole draft. One tap, no undo — and
               people open Assist out of curiosity with a finished
               caption already written. Ask, unless there is nothing
               to lose. */
            btn('Use this', (ev) => {
              const had = String(getText?.() || '').trim();
              if (!had) { setText(pt); onDone?.(); close(); return; }
              const b = ev?.target;
              if (b && !b.dataset.armed) {
                b.dataset.armed = '1';
                b.textContent = 'Replace what you wrote?';
                setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = 'Use this'; } }, 4000);
                return;
              }
              setText(pt); onDone?.(); close();
            }, { cls: 'btn-sm btn-primary' }),
            btn('Copy', () => copy(pt), { cls: 'btn-sm btn-ghost' })))));
      } catch (e) { clear(out); out.append(h('div', { class: 'small', style: { color: 'var(--bad)' }, text: e.message })); }
    };

    const body = h('div',
      h('div', { class: 'row', style: { flexWrap: 'wrap', marginBottom: '12px' } },
        btn('5 variations', () => run('v', () => A.variations(getText(), 5, platform, set)), { cls: 'btn-sm' }),
        btn('Tighten it', () => run('t', () => A.tighten(getText(), set)), { cls: 'btn-sm' }),
        btn('Hashtag ideas', () => run('h', () => A.tagIdeas(getText(), platform, set)), { cls: 'btn-sm' }),
        type === 'video' ? btn('YouTube description', () => run('d', () => A.ytDescription(getText() || set.song, set)), { cls: 'btn-sm' }) : null),
      h('p', { class: 'small muted' }, 'It never invents facts about the song — anything it does not know comes back as a [bracket].'),
      out);

    const { close } = modal({ title: 'Assist', body, wide: true });
  }, { cls: 'btn-sm' });
}

/* ---------------------------------------------------------- */
/*  the whole toolbar, as used by the editor and batch writer  */
/* ---------------------------------------------------------- */

export function writingAids({ getText, setText, platform, type, exclude, structures = true }) {
  const opts = { platform, type, limit: 0, recent: recentBodies(platform, exclude) };
  const panel = lintPanel(getText, opts);
  const preview = previewBox(getText, platform, type);

  const refresh = () => { panel.refresh(); preview.refresh(); };

  const bar = h('div', { class: 'row', style: { flexWrap: 'wrap', gap: '6px', marginTop: '8px' } },
    btn('Phrase bank', () => phraseModal({
      platform,
      onInsert: (t) => { setText(getText() ? `${getText().trim()}\n${t}` : t); refresh(); },
    }), { cls: 'btn-sm' }),
    btn('Word help', () => fixModal({ getText, setText: (t) => { setText(t); refresh(); } }), { cls: 'btn-sm' }),
    structures ? btn('Structure', () => structureModal({ getText, setText: (t) => { setText(t); refresh(); } }), { cls: 'btn-sm' }) : null,
    assistButton({ getText, setText: (t) => { setText(t); refresh(); }, platform, type, onDone: refresh }));

  const el = h('div',
    bar,
    h('div', { class: 'aids' }, panel.el, preview.el));

  return { el, refresh, setLimit: (n) => { opts.limit = n; } };
}

function structureModal({ getText, setText }) {
  const body = h('div', h('p', { class: 'small muted', text: 'Drops a skeleton in. Fill the lines, delete the labels.' }));
  const skeletons = {
    hbc:   'HOOK — the first line, no wind-up\n\nBODY — two or three sentences that earn the hook\n\nASK — one thing, not three',
    story: 'A specific moment. Where you were, what time it was.\n\nWhat changed.\n\nThe line that came out of it.',
    list:  '3 things about [SUBJECT]\n\n1. \n2. \n3. \n\nASK',
    q:     'QUESTION — answerable in four words\n\nYour own answer, briefly.\n\nNow yours — comments.',
    plain: '',
  };
  STRUCTURES.forEach(st => body.append(h('div', { class: 'item', style: { cursor: 'pointer' },
    onClick: () => { const s = skeletons[st.key]; setText(getText() ? `${getText()}\n\n${s}` : s); close(); } },
    h('div', { class: 'item-head' }, h('span', { class: 'item-title', text: st.label })),
    h('div', { class: 'item-meta' }, h('span', { text: st.note })))));
  const { close } = modal({ title: 'Post structure', body });
}
