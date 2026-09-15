/* ============================================================
   notepad/data.js — the two dictionaries, loaded only if asked

   rhymes.js is 3 MB and synonyms.js is 7 MB. Neither is in the
   service-worker shell, because making every cold start pay 10 MB
   for a feature most sessions never open would be a bad trade.
   They load on the first search instead, and the normal runtime
   cache keeps them for offline use afterwards.

   Both files are plain scripts that assign a global, so they are
   injected as <script> rather than imported.
   ============================================================ */

const SRC = {
  rhymes:   { url: './vendor/notepad/rhymes.js',   global: 'RHYME_DATA',   mb: 3 },
  synonyms: { url: './vendor/notepad/synonyms.js', global: 'SYNONYM_DATA', mb: 7 },
};

const state = {};                       // key -> 'loading' | 'ready' | 'failed'
const waiting = {};                     // key -> [resolve, ...]

export const status = (key) => state[key] || 'idle';
export const sizeMB = (key) => SRC[key].mb;
export const dataFor = (key) => window[SRC[key].global] || null;

/**
 * Resolves with the data object, or null if it could not be fetched.
 * Never throws — a missing dictionary is a degraded pane, not a
 * broken app.
 */
export function load(key) {
  const src = SRC[key];
  if (!src) return Promise.resolve(null);
  if (window[src.global]) { state[key] = 'ready'; return Promise.resolve(window[src.global]); }

  return new Promise((resolve) => {
    (waiting[key] = waiting[key] || []).push(resolve);
    if (state[key] === 'loading') return;

    state[key] = 'loading';
    const el = document.createElement('script');
    el.src = src.url;
    el.async = true;
    const done = (ok) => {
      state[key] = ok && window[src.global] ? 'ready' : 'failed';
      const list = waiting[key] || []; waiting[key] = [];
      list.forEach(fn => fn(window[src.global] || null));
    };
    el.onload = () => done(true);
    el.onerror = () => done(false);
    document.head.append(el);
  });
}

/** Lets a failed load be tried again. */
export function reset(key) {
  state[key] = 'idle';
  document.querySelectorAll(`script[src="${SRC[key].url}"]`).forEach(s => s.remove());
}

/* ---------------------------------------------------------- */
/*  rhymes                                                     */
/* ---------------------------------------------------------- */

const LIMIT = 100;
const vowelOf = (rime) => rime.split(' ')[0];

/** How many phonemes two rimes share, counting back from the end. */
function trailMatch(a, b) {
  const pa = a.split(' '), pb = b.split(' ');
  let i = pa.length - 1, j = pb.length - 1, n = 0;
  while (i >= 0 && j >= 0 && pa[i] === pb[j]) { n++; i--; j--; }
  return n;
}

export function findRhymes(query) {
  const data = dataFor('rhymes');
  if (!data) return null;
  const { W, R } = data;
  const q = String(query || '').trim().toLowerCase();
  if (!q) return null;

  const idx = W.indexOf(q);
  if (idx === -1) return { notFound: true };

  const qRime = R[idx], qVowel = vowelOf(qRime);
  const perfect = [], near = [], slant = [];

  for (let i = 0; i < W.length; i++) {
    if (i === idx) continue;
    const w = W[i];
    if (w.length < 3) continue;
    const r = R[i];
    if (r === qRime) { perfect.push(w); continue; }
    const tm = trailMatch(qRime, r);
    if (vowelOf(r) === qVowel) { near.push([w, tm]); continue; }
    if (tm >= 1) slant.push([w, tm]);
  }

  const plain = (a) => [...new Set(a)].sort((x, y) => x.length - y.length || x.localeCompare(y));
  const scored = (a) => {
    const best = new Map();
    a.forEach(([w, n]) => { if (!best.has(w) || best.get(w) < n) best.set(w, n); });
    return [...best.entries()]
      .sort((x, y) => y[1] - x[1] || x[0].length - y[0].length || x[0].localeCompare(y[0]))
      .map(x => x[0]);
  };

  return {
    perfect: plain(perfect).slice(0, LIMIT),
    near: scored(near).slice(0, LIMIT),
    slant: scored(slant).slice(0, LIMIT),
  };
}

export function familyWords(rimeKey) {
  const data = dataFor('rhymes');
  if (!data) return [];
  const { W, R } = data;
  const out = [];
  for (let i = 0; i < W.length; i++) if (R[i] === rimeKey && W[i].length >= 3) out.push(W[i]);
  return [...new Set(out)].sort((a, b) => a.length - b.length || a.localeCompare(b)).slice(0, LIMIT);
}

export const families = () => (dataFor('rhymes')?.F) || [];

/* ---------------------------------------------------------- */
/*  synonyms                                                   */
/* ---------------------------------------------------------- */

export const POS = { n: 'Noun', v: 'Verb', a: 'Adjective', r: 'Adverb' };

export function findSynonyms(query) {
  const data = dataFor('synonyms');
  if (!data) return null;
  const q = String(query || '').trim().toLowerCase();
  if (!q) return null;
  return data[q] || { notFound: true };
}

/* ---------------------------------------------------------- */
/*  syllables                                                  */
/* ---------------------------------------------------------- */

let sylMap = null;

/** Falls back to vowel-group counting for anything not in the list. */
function guess(w) {
  const groups = w.match(/[aeiouy]+/g);
  let n = groups ? groups.length : 1;
  if (w.endsWith('e') && !w.endsWith('le') && n > 1) n--;
  return Math.max(1, n);
}

export function wordSyllables(word) {
  const data = dataFor('rhymes');
  if (data && data.S && !sylMap) {
    sylMap = new Map();
    const { W, S } = data;
    for (let i = 0; i < W.length; i++) if (!sylMap.has(W[i])) sylMap.set(W[i], S[i]);
  }
  const w = String(word).toLowerCase().replace(/[^a-z']/g, '');
  if (!w) return 0;
  if (sylMap && sylMap.has(w)) return sylMap.get(w);
  return guess(w);
}

export function lineSyllables(line) {
  const tokens = String(line).match(/[a-zA-Z']+/g);
  return tokens ? tokens.reduce((n, t) => n + wordSyllables(t), 0) : 0;
}
