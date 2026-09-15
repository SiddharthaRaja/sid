/* ============================================================
   notepad.js — the songwriting pad, as its own section

   This is the standalone Notepad app brought inside Sid. It keeps
   its own slice and shares nothing with the release side: no
   milestone touches it, the health check ignores it, notifications
   never mention it. The only things it borrows are the shell —
   h(), card(), the store, the theme.

   What it gained by moving in: the songs sync and back up with
   everything else instead of living in one browser's localStorage,
   and they land in the same snapshots.

   What it lost: its own Google sign-in, which is now Sid's, and its
   eleven themes, which are now Sid's four accents.
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, btn, card, cardHead, pageHead, subtabs, modal, confirmDelete,
  toast, uid, empty, copy, download, fmtDate, move,
} from '../ui.js';
import { icon } from '../icons.js';
import * as D from '../notepad/data.js';
import * as METRO from '../notepad/metronome.js';
import { grow } from '../mobile.js';

const NP = () => S.get('notepad');
const save = () => S.touch('notepad');

const STATUSES = [
  ['draft', 'Draft'],
  ['working', 'Working'],
  ['done', 'Done'],
];

const DEFAULT_SECTIONS = ['Verse 1', 'Chorus'];

/* Redraws this section in place. Deliberately not app.js's rerender():
   importing the router from a page module makes a cycle, and nothing
   here needs the router — the section owns the whole view. */
function rerender() {
  const host = document.querySelector('#view');
  if (!host) return;
  clear(host);
  host.append(renderNotepad());
}

/* pane inside the editor — deliberately not in the URL, so the phone's
   back gesture leaves the section rather than the tab */
let pane = 'sections';

/* ---------------------------------------------------------- */
/*  model                                                      */
/* ---------------------------------------------------------- */

const songs = () => NP().songs || (NP().songs = []);
const current = () => songs().find(s => s.id === NP().open) || null;
const sectionOf = (song) => (song.sections || []).find(x => x.id === song.openSection)
  || (song.sections || [])[0] || null;

function newSong(title) {
  const now = Date.now();
  return {
    id: uid(), title: title || 'Untitled', createdAt: now, updatedAt: now,
    openSection: null,
    sections: DEFAULT_SECTIONS.map(name => ({ id: uid(), name, content: '', status: 'draft' })),
  };
}

const touchSong = (song) => { song.updatedAt = Date.now(); save(); };

const wordCount = (song) => (song.sections || [])
  .reduce((n, s) => n + ((s.content || '').match(/\S+/g) || []).length, 0);

/* ---------------------------------------------------------- */
/*  entry                                                      */
/* ---------------------------------------------------------- */

export function renderNotepad() {
  const song = current();
  return song ? editor(song) : home();
}

/* ---------------------------------------------------------- */
/*  home                                                       */
/* ---------------------------------------------------------- */

function home() {
  const box = h('div');
  const list = songs().slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const title = h('input', { class: 'inp', placeholder: 'New song title…', maxLength: 120 });
  const create = () => {
    const t = title.value.trim();
    if (!t) { title.focus(); return; }
    const s = newSong(t);
    songs().push(s);
    NP().open = s.id;
    save();
    rerender();
  };
  title.addEventListener('keydown', (e) => { if (e.key === 'Enter') create(); });

  box.append(pageHead('Notepad', 'Lyrics, sections, rhymes and a metronome. Nothing here touches the release side of the app.'));

  box.append(card(
    h('div', { class: 'row' }, title, btn('Create', create, { cls: 'btn-primary' }))));

  if (!list.length) {
    box.append(empty('No songs yet', 'Type a title above. Every song starts with a verse and a chorus, which you can rename or delete.'));
    return box;
  }

  box.append(h('div', { class: 'grid g2' }, list.map(song => {
    const secs = song.sections || [];
    const done = secs.filter(s => s.status === 'done').length;
    return h('div', { class: 'card clickable', onClick: (e) => {
      if (e.target.closest('button')) return;
      NP().open = song.id; save(); pane = 'sections'; rerender();
    } },
      h('div', { class: 'item-head' },
        h('span', { html: icon('notepad'), style: { color: 'var(--fg-3)' } }),
        h('span', { class: 'item-title', text: song.title || 'Untitled' })),
      h('div', { class: 'small muted', style: { marginTop: '4px' },
        text: `${secs.length} section${secs.length === 1 ? '' : 's'} · ${wordCount(song)} words${done ? ` · ${done} done` : ''} · ${fmtDate(new Date(song.updatedAt || Date.now()).toISOString().slice(0, 10))}` }),
      h('div', { class: 'row', style: { marginTop: '10px' } },
        btn('Rename', () => renameSong(song), { cls: 'btn-sm btn-ghost' }),
        btn('Duplicate', () => {
          const c = JSON.parse(JSON.stringify(song));
          c.id = uid(); c.title = `${song.title} (copy)`; c.createdAt = c.updatedAt = Date.now();
          (c.sections || []).forEach(s => { s.id = uid(); });
          songs().push(c); save(); rerender();
        }, { cls: 'btn-sm btn-ghost' }),
        btn('Delete', () => confirmDelete(song.title || 'this song', () => {
          NP().songs = songs().filter(s => s.id !== song.id);
          save(); rerender();
        }), { cls: 'btn-sm btn-ghost btn-danger' })));
  })));

  return box;
}

function renameSong(song) {
  const input = h('input', { class: 'inp', value: song.title || '', maxLength: 120 });
  const { close } = modal({
    title: 'Rename',
    body: h('div', input),
    actions: [btn('Save', () => {
      song.title = input.value.trim() || 'Untitled';
      touchSong(song); close(); rerender();
    }, { cls: 'btn-primary' })],
  });
  setTimeout(() => input.focus(), 60);
}

/* ---------------------------------------------------------- */
/*  editor                                                     */
/* ---------------------------------------------------------- */

function editor(song) {
  const box = h('div');

  const title = h('input', {
    class: 'inp', value: song.title || '', maxLength: 120,
    style: { fontWeight: '600' },
    onInput: (e) => { song.title = e.target.value; touchSong(song); },
  });

  box.append(h('div', { class: 'row', style: { marginBottom: '10px' } },
    btn('←', () => { NP().open = null; save(); rerender(); }, { cls: 'btn-sm' }),
    title,
    metroButton(),
    btn('Export', () => exportSong(song), { cls: 'btn-sm btn-ghost' })));

  const body = h('div');
  const panes = [
    ['sections', 'Sections'],
    ['full', 'Full'],
    ['rhymes', 'Rhymes'],
    ['synonyms', 'Synonyms'],
  ];

  const paint = () => {
    clear(body);
    if (pane === 'full') body.append(fullPane(song));
    else if (pane === 'rhymes') body.append(wordPane(song, 'rhymes'));
    else if (pane === 'synonyms') body.append(wordPane(song, 'synonyms'));
    else body.append(sectionsPane(song));
  };

  box.append(subtabs(panes, pane, (k) => { pane = k; paint(); }));
  box.append(body);
  paint();
  return box;
}

/* ---------- sections ---------- */

function sectionsPane(song) {
  const box = h('div');
  song.sections = song.sections || [];
  if (!song.sections.length) song.sections.push({ id: uid(), name: 'Verse 1', content: '', status: 'draft' });
  if (!song.openSection || !song.sections.some(s => s.id === song.openSection)) {
    song.openSection = song.sections[0].id;
  }

  const tabs = h('div', { class: 'subtabs' });
  const paneBody = h('div');

  const drawTabs = () => {
    clear(tabs);
    song.sections.forEach(sec => {
      tabs.append(h('button', {
        class: `subtab ${sec.id === song.openSection ? 'on' : ''} ${sec.status === 'done' ? 'ok' : ''}`,
        onClick: () => { song.openSection = sec.id; save(); drawTabs(); drawBody(); },
      }, sec.name || 'Section'));
    });
    tabs.append(h('button', {
      class: 'subtab', title: 'Add a section',
      onClick: () => {
        const sec = { id: uid(), name: `Section ${song.sections.length + 1}`, content: '', status: 'draft' };
        song.sections.push(sec);
        song.openSection = sec.id;
        touchSong(song); drawTabs(); drawBody();
      },
    }, '+'));
  };

  const drawBody = () => {
    clear(paneBody);
    const sec = sectionOf(song);
    if (!sec) return;

    const name = h('input', {
      class: 'inp', value: sec.name || '', maxLength: 60,
      onInput: (e) => { sec.name = e.target.value; touchSong(song); drawTabs(); },
    });

    const status = h('div', { class: 'seg' }, STATUSES.map(([k, label]) => h('button', {
      class: sec.status === k ? 'on' : '',
      onClick: () => { sec.status = k; touchSong(song); drawTabs(); drawBody(); },
    }, label)));

    const gutter = h('div', { class: 'syl-gutter', 'aria-hidden': 'true' });
    const area = h('textarea', {
      class: 'inp np-area', rows: 10, value: sec.content || '',
      placeholder: 'Write. One line per line — the numbers on the left are syllables.',
      onInput: (e) => {
        sec.content = e.target.value;
        touchSong(song);
        grow(e.target);
        paintGutter();
        counts.textContent = countLine(sec);
      },
      onScroll: (e) => { gutter.scrollTop = e.target.scrollTop; },
    });

    const paintGutter = () => {
      const cs = getComputedStyle(area);
      const lh = parseFloat(cs.lineHeight) || 22;
      gutter.style.paddingTop = cs.paddingTop;
      clear(gutter);
      (area.value || '').split('\n').forEach(line => {
        const n = D.lineSyllables(line);
        gutter.append(h('div', {
          class: 'sg-line', style: { height: `${lh}px`, lineHeight: `${lh}px` },
          text: n > 0 ? String(n) : '',
        }));
      });
    };

    const counts = h('span', { class: 'small muted', text: countLine(sec) });

    paneBody.append(card(
      h('div', { class: 'row' }, name, status),
      h('div', { class: 'np-edit' }, gutter, area),
      h('div', { class: 'row', style: { marginTop: '8px', justifyContent: 'space-between' } },
        counts,
        h('div', { class: 'row' },
          btn('Copy', () => { copy(sec.content || ''); toast('Copied'); }, { cls: 'btn-sm btn-ghost' }),
          btn('↑', () => moveSection(song, sec, -1, drawTabs, drawBody), { cls: 'btn-sm btn-ghost' }),
          btn('↓', () => moveSection(song, sec, 1, drawTabs, drawBody), { cls: 'btn-sm btn-ghost' }),
          btn('Delete', () => confirmDelete(sec.name || 'this section', () => {
            song.sections = song.sections.filter(x => x.id !== sec.id);
            song.openSection = (song.sections[0] || {}).id || null;
            touchSong(song); drawTabs(); drawBody();
          }), { cls: 'btn-sm btn-ghost btn-danger' })))));

    requestAnimationFrame(() => { grow(area); paintGutter(); });
  };

  box.append(tabs, paneBody);
  drawTabs(); drawBody();
  return box;
}

function countLine(sec) {
  const words = ((sec.content || '').match(/\S+/g) || []).length;
  const lines = (sec.content || '').split('\n').filter(l => l.trim()).length;
  const syl = (sec.content || '').split('\n').map(D.lineSyllables).filter(Boolean);
  const avg = syl.length ? Math.round(syl.reduce((a, b) => a + b, 0) / syl.length) : 0;
  return `${words} word${words === 1 ? '' : 's'} · ${lines} line${lines === 1 ? '' : 's'}${avg ? ` · ~${avg} syllables a line` : ''}`;
}

function moveSection(song, sec, dir, drawTabs, drawBody) {
  const i = song.sections.indexOf(sec);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= song.sections.length) return;
  move(song.sections, i, j);
  touchSong(song); drawTabs(); drawBody();
}

/* ---------- full ---------- */

const assemble = (song) => (song.sections || [])
  .map(s => `[${s.name || 'Section'}]\n${(s.content || '').trim()}`)
  .join('\n\n')
  .trim();

function fullPane(song) {
  const text = assemble(song);
  const syl = text.split('\n').filter(l => l.trim() && !/^\[/.test(l));
  return h('div', card(
    cardHead('The whole thing',
      btn('Copy', () => { copy(text); toast('Copied'); }, { cls: 'btn-sm' })),
    h('div', { class: 'small muted' },
      `${(text.match(/\S+/g) || []).length} words · ${syl.length} lines of lyric. Read-only — edit in Sections.`),
    h('pre', { class: 'np-full', text: text || 'Nothing written yet.' })));
}

function exportSong(song) {
  download(`${(song.title || 'song').replace(/[^\w -]/g, '')}.txt`,
    `${song.title || 'Untitled'}\n\n${assemble(song)}\n`, 'text/plain');
}

/* ---------- rhymes and synonyms ---------- */

function wordPane(song, kind) {
  const box = h('div');
  const results = h('div');
  const input = h('input', {
    class: 'inp', autocomplete: 'off',
    placeholder: kind === 'rhymes' ? 'A word to rhyme with…' : 'A word to find synonyms for…',
  });

  let debounce = null;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => run(input.value), 220);
  });

  const target = () => {
    const sec = sectionOf(song);
    return sec ? (sec.name || 'the open section') : null;
  };

  const insert = (word) => {
    const sec = sectionOf(song);
    if (!sec) { toast('Open a section first'); return; }
    sec.content = sec.content ? `${sec.content.replace(/\s+$/, '')} ${word}` : word;
    touchSong(song);
    toast(`Added to ${sec.name || 'section'}`);
  };

  const chips = (label, words, note) => {
    if (!words.length && !note) return null;
    return h('div', { style: { marginTop: '14px' } },
      h('div', { class: 'small', style: { fontWeight: 600 } }, `${label} (${words.length})`),
      words.length
        ? h('div', { class: 'chips', style: { marginTop: '6px' } },
            words.map(w => h('button', { class: 'chip', onClick: () => insert(w), text: w })))
        : h('div', { class: 'small muted', style: { marginTop: '4px' }, text: note }));
  };

  const loading = (mb) => h('div', { class: 'small muted' },
    `Loading the ${kind === 'rhymes' ? 'rhyme dictionary' : 'thesaurus'} — about ${mb} MB, once. It is kept for offline use afterwards.`);

  const failed = (retry) => h('div',
    h('div', { class: 'small', style: { color: 'var(--warn)' } },
      'That dictionary would not load. It is a big file — a flaky connection is the usual reason.'),
    btn('Try again', retry, { cls: 'btn-sm', }));

  function run(q) {
    clear(results);
    const query = String(q || '').trim();
    if (!query) {
      results.append(h('div', { class: 'small muted', text: kind === 'rhymes'
        ? 'Type a word, or browse the rhyme families below.'
        : 'Type a word to see its synonyms, grouped by part of speech.' }));
      return;
    }

    if (D.status(kind) !== 'ready') {
      results.append(loading(D.sizeMB(kind)));
      D.load(kind).then(data => {
        if (input.value.trim() !== query) return;          // they kept typing
        clear(results);
        if (!data) { results.append(failed(() => { D.reset(kind); run(query); })); return; }
        run(query);
      });
      return;
    }

    if (kind === 'rhymes') {
      const res = D.findRhymes(query);
      if (!res) return;
      if (res.notFound) {
        results.append(h('div', { class: 'small muted',
          text: `"${query}" is not in the dictionary. Try the base form of the word — "running" is in there as "run".` }));
        return;
      }
      results.append(
        chips('Perfect', res.perfect, 'No perfect rhyme exists for this one in English. The near ones below are what songs actually use.'),
        chips('Near', res.near, ''),
        chips('Slant', res.slant, ''));
    } else {
      const res = D.findSynonyms(query);
      if (!res) return;
      if (res.notFound) {
        results.append(h('div', { class: 'small muted', text: `Nothing for "${query}". Try the base form of the word.` }));
        return;
      }
      Object.keys(D.POS).forEach(p => {
        if (res[p] && res[p].length) results.append(chips(D.POS[p], res[p], ''));
      });
    }
  }

  const tools = h('div', { class: 'row', style: { marginTop: '8px' } });
  if (kind === 'rhymes') {
    tools.append(btn('Browse families', () => {
      input.value = '';
      clear(results);
      if (D.status('rhymes') !== 'ready') {
        results.append(loading(D.sizeMB('rhymes')));
        D.load('rhymes').then(d => {
          clear(results);
          if (!d) { results.append(failed(() => { D.reset('rhymes'); })); return; }
          browse();
        });
        return;
      }
      browse();
    }, { cls: 'btn-sm' }));
  }

  function browse() {
    clear(results);
    results.append(h('div', { class: 'list' }, D.families().map(fam => {
      const label = fam.s && fam.s.length ? fam.s.join(', ') : fam.k;
      return h('button', {
        class: 'item', style: { textAlign: 'left', width: '100%' },
        onClick: () => {
          clear(results);
          results.append(btn('← All families', browse, { cls: 'btn-sm btn-ghost' }),
            chips(`Rhyming with "${label}"`, D.familyWords(fam.k), 'None found.'));
        },
      },
        h('div', { class: 'item-head' },
          h('span', { class: 'item-title', text: `${label}…` }),
          h('span', { class: 'tag', text: `${fam.n} words` })));
    })));
  }

  const t = target();
  box.append(card(
    input,
    tools,
    h('div', { class: 'small muted', style: { marginTop: '8px' },
      text: t ? `Tap any word to add it to "${t}".` : 'Open a section to add words straight into it.' }),
    results));

  run('');
  return box;
}

/* ---------------------------------------------------------- */
/*  metronome                                                  */
/* ---------------------------------------------------------- */

function metroButton() {
  const b = h('button', {
    class: 'btn btn-sm', title: 'Metronome',
    onClick: metronomeSheet,
  }, h('span', { html: icon('metronome') }));

  const paint = (st, beat) => {
    b.classList.toggle('on', st.playing);
    if (beat) {
      b.classList.add('metro-beat');
      setTimeout(() => b.classList.remove('metro-beat'), Math.min(140, (60000 / st.bpm) * 0.4));
    }
  };
  const off = METRO.subscribe(paint);
  paint(METRO.state(), false);
  /* the button dies with the page; drop the listener with it */
  new MutationObserver((m, obs) => {
    if (!b.isConnected) { off(); obs.disconnect(); }
  }).observe(document.body, { childList: true, subtree: true });

  return b;
}

export function metronomeSheet() {
  const st = METRO.state();
  const visual = h('div', { class: 'metro-visual' }, h('span', { html: icon('metronome') }));
  const bpmEl = h('div', { class: 'metro-bpm', text: String(st.bpm) });
  const slider = h('input', { type: 'range', min: 40, max: 240, value: st.bpm, class: 'metro-slider',
    onInput: (e) => METRO.setBpm(e.target.value) });
  const play = btn(st.playing ? 'Stop' : 'Start', () => METRO.toggle(), { cls: 'btn-primary' });
  const mute = btn(st.muted ? 'Sound off' : 'Sound on', () => METRO.setMuted(!METRO.state().muted), { cls: 'btn-sm' });
  const tapBtn = btn('Tap tempo', () => METRO.tap(), { cls: 'btn-sm' });

  const paint = (s, beat) => {
    bpmEl.textContent = String(s.bpm);
    slider.value = s.bpm;
    play.textContent = s.playing ? 'Stop' : 'Start';
    mute.textContent = s.muted ? 'Sound off' : 'Sound on';
    if (beat) {
      visual.classList.add('beat');
      setTimeout(() => visual.classList.remove('beat'), Math.min(140, (60000 / s.bpm) * 0.4));
    }
  };
  const off = METRO.subscribe(paint);

  const body = h('div', { style: { textAlign: 'center' } },
    visual,
    h('div', { class: 'row', style: { justifyContent: 'center', alignItems: 'center' } },
      btn('−', () => METRO.setBpm(METRO.state().bpm - 1), { cls: 'btn-sm' }),
      h('div', {}, bpmEl, h('div', { class: 'small muted', text: 'BPM' })),
      btn('+', () => METRO.setBpm(METRO.state().bpm + 1), { cls: 'btn-sm' })),
    slider,
    h('div', { class: 'row', style: { justifyContent: 'center', marginTop: '10px' } }, play, mute, tapBtn),
    h('p', { class: 'small muted', style: { marginTop: '12px' } },
      'It keeps running when you close this and when you move to another tab — the button up top stops it.'));

  modal({ title: 'Metronome', body, onClose: off });
}
