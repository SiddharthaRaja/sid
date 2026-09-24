/* ============================================================
   diary.js — the hundred-entry diary, across the three text apps

   The diary is the one thing in this release that cannot be batched:
   one entry a day, written on the day. What CAN be prepared is the
   scaffolding — a numbered, dated slot waiting for each entry — so
   that writing one is opening it and typing, not deciding what number
   it is and what date it goes on first.

   X already holds the entries written so far. This file reads that
   run, works out the cadence from it rather than assuming one, and
   fills the remaining slots up to 100 on all three text platforms so
   the same entry can be written in each of their own voices.

   Two rules, because this touches real writing:
     • it only ever ADDS. An existing entry is never edited, never
       re-dated, never reordered, never removed.
     • it is idempotent. Running it twice adds nothing the second
       time, so a stray re-run cannot duplicate the diary.
   ============================================================ */

import * as S from './store.js';
import { uid, todayISO, daysBetween } from './ui.js';
import { offsetOf, asT, isISO } from './phases.js';

export const DIARY_TARGET = 100;

/* Where a diary lives on each text platform. X and Threads already had
   a home for it; Bluesky gets one in data/platforms.js. */
export const DIARY_TRACKS = [
  ['x', 'thread', 'X'],
  ['threads', 'journal', 'Threads'],
  ['bluesky', 'diary', 'Bluesky'],
];

/** "Diary 7" → 7. Tolerates "Diary  7", "diary 7 — something". */
export function diaryNo(title) {
  const m = String(title || '').trim().match(/^diary\s*(\d{1,3})\b/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n >= 1 && n <= 999 ? n : null;
}

const itemsOf = (pKey, tKey) => {
  const sl = S.get(`p_${pKey}`);
  sl.content = sl.content || {};
  if (!Array.isArray(sl.content[tKey])) sl.content[tKey] = [];
  return sl.content[tKey];
};

/** Which diary numbers already exist on a track, and what they are dated. */
export function existing(pKey, tKey) {
  const map = new Map();
  itemsOf(pKey, tKey).forEach(it => {
    const n = diaryNo(it.title);
    if (n != null && !map.has(n)) map.set(n, it);
  });
  return map;
}

/**
 * The date for every slot 1…100.
 *
 * Built from what is already written on X rather than from a rule I
 * invented: take the known entries, measure the days-per-entry between
 * the first and last of them, and carry that on. With one entry a day
 * — which is what the run so far is — entry 100 lands the same
 * distance past entry 31 as the calendar says it should.
 *
 * Anything already dated keeps its own date, always.
 */
export function schedule() {
  const known = [...existing('x', 'thread').entries()]
    .map(([n, it]) => [n, offsetOf(it.when)])
    .filter(([, off]) => off != null)
    .sort((a, b) => a[0] - b[0]);

  if (!known.length) return null;                 // nothing to extend

  const [firstN, firstOff] = known[0];
  const [lastN, lastOff] = known[known.length - 1];

  /* The MEDIAN gap between consecutive entries, not the average.

     The run so far is one entry a day, but it skips T0 — so the mean
     gap is 31/30 rather than 1, and multiplying that small artefact
     across sixty-nine more entries pushes the last one two days out.
     The median ignores a single odd gap, which is exactly what a
     skipped day is. */
  const gaps = [];
  for (let i = 1; i < known.length; i++) {
    const dN = known[i][0] - known[i - 1][0];
    const dOff = known[i][1] - known[i - 1][1];
    if (dN > 0) gaps.push(dOff / dN);
  }
  gaps.sort((a, b) => a - b);
  const step = gaps.length
    ? (gaps.length % 2 ? gaps[(gaps.length - 1) / 2]
       : (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2)
    : 1;

  const byN = new Map(known);
  const out = new Map();
  for (let n = 1; n <= DIARY_TARGET; n++) {
    if (byN.has(n)) { out.set(n, byN.get(n)); continue; }
    out.set(n, Math.round(lastOff + (n - lastN) * (step || 1)));
  }
  return { map: out, firstN, lastN, lastOff, step: step || 1 };
}

/** What filling would do, without doing it. */
export function preview() {
  const sch = schedule();
  if (!sch) return { ok: false, reason: 'No numbered diary entries found on X to extend, so there is nothing to work the dates out from.' };

  const rows = DIARY_TRACKS.map(([pKey, tKey, label]) => {
    const have = existing(pKey, tKey);
    const missing = [];
    let wrote = 0;
    for (let n = 1; n <= DIARY_TARGET; n++) {
      if (!have.has(n)) missing.push(n);
      else if (written(have.get(n))) wrote++;
    }
    /* "100 of 100" counted slots, which is a number about this app
       rather than about the diary. How many are actually written is
       the one worth showing. */
    return { pKey, tKey, label, has: have.size, wrote,
             missing: missing.length, from: missing[0], to: missing[missing.length - 1] };
  });

  return {
    ok: true,
    rows,
    total: rows.reduce((a, r) => a + r.missing, 0),
    lastN: sch.lastN,
    lastWhen: asT(sch.lastOff),
    endWhen: asT(sch.map.get(DIARY_TARGET)),
  };
}

function blank(n, when) {
  return {
    id: uid(),
    title: `Diary ${n}`,
    /* First line is the number, the rest is yours — the shape the
       entries written so far already use. */
    body: `${n}\n`,
    status: 'draft',
    when,
    tags: '',
    notes: '',
    media: [],
    gen: true,                 // created by the filler, never written in
  };
}

/**
 * Create every missing slot up to 100 on all three tracks.
 * Returns what it did. Never touches an entry that already exists.
 */
export function fill() {
  const sch = schedule();
  if (!sch) return { ok: false, added: 0 };

  const done = [];
  DIARY_TRACKS.forEach(([pKey, tKey, label]) => {
    const have = existing(pKey, tKey);
    const list = itemsOf(pKey, tKey);
    let added = 0;

    for (let n = 1; n <= DIARY_TARGET; n++) {
      if (have.has(n)) continue;
      list.push(blank(n, asT(sch.map.get(n))));
      added++;
    }
    if (!added) { done.push({ label, added: 0 }); return; }

    /* Keep the run in order. Entries that are not part of the diary,
       or that have a fixed calendar date, are left where they are. */
    list.sort((a, b) => {
      const na = diaryNo(a.title), nb = diaryNo(b.title);
      if (na == null || nb == null) return 0;
      return na - nb;
    });

    S.touch(`p_${pKey}`);
    done.push({ label, added });
  });

  return { ok: true, added: done.reduce((a, d) => a + d.added, 0), done };
}

/* ============================================================
   Which one is due, and how far along each track is.

   The diary is the one thing in the release with a real, chosen
   cadence behind it — one a day, and the dates come from the run
   already written rather than from anything this app decided. That
   makes it the only thing the app has any business telling you is
   due today.
   ============================================================ */

/** Has this slot actually been written in, or is it still the bare number? */
export function written(it) {
  if (!it) return false;
  const n = diaryNo(it.title);
  const body = String(it.body || '').trim();
  /* A blank slot's body is just its own number. Anything more — even
     one word — counts as started. */
  return body !== '' && body !== String(n);
}

/**
 * The entry that should be written by now.
 *
 * Today's T-offset is however many days today is from release. The
 * due entry is the last one scheduled on or before that. Before the
 * run starts there is nothing due; after entry 100 the run is over.
 */
export function due(todayIso) {
  const set = S.get('settings');
  const rel = set.releaseDate;
  const sch = schedule();
  if (!rel || !isISO(rel) || !sch) return null;

  const todayOff = daysBetween(rel, todayIso || todayISO());

  let n = null;
  for (let i = 1; i <= DIARY_TARGET; i++) {
    if (sch.map.get(i) <= todayOff) n = i; else break;
  }
  if (n == null) {
    /* the run has not started yet — say when it does */
    return { n: null, startsIn: sch.map.get(1) - todayOff, startsAt: asT(sch.map.get(1)) };
  }

  const tracks = DIARY_TRACKS.map(([pKey, tKey, label]) => {
    const have = existing(pKey, tKey);
    const it = have.get(n) || null;
    let behind = 0;
    for (let i = 1; i <= n; i++) if (!written(have.get(i))) behind++;
    let done = 0;
    for (let i = 1; i <= DIARY_TARGET; i++) if (written(have.get(i))) done++;
    return {
      pKey, tKey, label,
      id: it ? it.id : null,
      done,                                  // written, out of 100
      today: written(it),                    // today's one is written
      behind,                                // unwritten at or before today
    };
  });

  return {
    n,
    when: asT(sch.map.get(n)),
    offset: sch.map.get(n),
    last: n >= DIARY_TARGET,
    tracks,
    allDone: tracks.every(t => t.today),
  };
}

/**
 * Remove slots this filler created that were never written in.
 *
 * "Never written in" means the body is still just the number and
 * nothing else — so anything typed into, even a word, stays.
 */
export function undo() {
  let removed = 0;
  DIARY_TRACKS.forEach(([pKey, tKey]) => {
    const list = itemsOf(pKey, tKey);
    const keep = list.filter(it => {
      if (!it.gen) return true;
      const n = diaryNo(it.title);
      const untouched = String(it.body || '').trim() === String(n)
        && !(it.notes || '').trim() && !(it.media || []).length
        && it.status === 'draft';
      if (untouched) { removed++; return false; }
      return true;
    });
    if (keep.length !== list.length) {
      S.get(`p_${pKey}`).content[tKey] = keep;
      S.touch(`p_${pKey}`);
    }
  });
  return removed;
}
