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
export function diaryNo(titleOrItem) {
  /* Takes an entry, or just a title.
     The titles are gone from the text platforms — a post there has no
     name — so the number now comes off the first line of the entry
     instead, which is where it has always also been written. Passing
     a bare title still works, for the places that only have one. */
  if (titleOrItem && typeof titleOrItem === 'object') {
    /* The first line wins. It is the one you maintain and the one
       renumbering writes; a leftover title can disagree with it and
       would then be answering with a number that is no longer true. */
    const fromBody = bodyNo(titleOrItem.body);
    return fromBody != null ? fromBody : titleNo(titleOrItem.title);
  }
  return titleNo(titleOrItem);
}

function titleNo(title) {
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
    const n = diaryNo(it);
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
      const na = diaryNo(a), nb = diaryNo(b);
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
  const n = diaryNo(it);
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
      const n = diaryNo(it);
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

/* ============================================================
   Renumbering a track from the hashtag at the foot of each entry

   The titles were typed in the order the entries were written —
   Diary 1, Diary 2, Diary 3 — and the number they should actually
   carry is the "#27" sitting at the bottom of the entry itself. This
   reads that hashtag, retitles from it, and puts everything that has
   no hashtag after the highest number there is, in the order it is
   already in.

   Three rules, because this renames real writing:
     • it only ever retitles and reorders. No body is edited, no
       entry is removed, and the hashtag stays where it is.
     • entries that are still blank scaffolding are left alone — they
       are not part of the run. The only exception is a blank slot
       sitting on a number a written entry now takes: that one is
       removed, because two entries cannot share a title and an empty
       slot is scaffolding, not writing.
     • it is idempotent. Run it twice and the second run finds
       nothing to do.
   ============================================================ */

/** "#27" on the last line of a body → 27. Anything else → null. */
export function hashNo(body) {
  return readTag(body).n;
}

/**
 * Read the numbering hashtag off the foot of an entry.
 *
 * The first version of this wanted "#27" to be the very last thing in
 * the body. Real entries do not end that way — a post signs off with
 * a row of tags, "#27 #shewont #newmusic", and the number is first in
 * the row rather than last. Every one of those read as unnumbered, so
 * renumbering found nothing and appeared to do nothing at all.
 *
 * So: look at the last line with anything on it, and take the one
 * numeric hashtag on it, wherever it sits among the others. A "#3"
 * buried mid-paragraph is still ignored, which is the point of
 * looking at the last line and not the whole body.
 *
 * Returns the reason when there is no number, so the screen can say
 * what it read instead of silently doing nothing.
 */
/**
 * The number on the FIRST line of an entry.
 *
 * His entries are written number-first: line one is the entry's
 * number on its own, then the writing, then the tags. So renumbering
 * that changes the title and leaves that line alone produces an entry
 * titled "Diary 17" whose first line still reads 3 — which is what
 * "it still doesn't work" looks like from the inside.
 */
export function bodyNo(body) {
  const first = String(body || '').split('\n')[0].trim();
  return /^\d{1,3}$/.test(first) ? parseInt(first, 10) : null;
}

/** Rewrite that first line to n. Anything that is not a bare number
    on its own line is left exactly as it is. */
export function renumberBody(body, n) {
  const lines = String(body == null ? '' : body).split('\n');
  if (!/^\s*\d{1,3}\s*$/.test(lines[0] || '')) return body;
  lines[0] = String(n);
  return lines.join('\n');
}

export function readTag(body) {
  const text = String(body || '').replace(/\s+$/, '');
  if (!text) return { n: null, why: 'empty', line: '' };

  const lines = text.split('\n');
  let line = '';
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim()) { line = lines[i].trim(); break; }
  }
  if (!line) return { n: null, why: 'empty', line: '' };

  /* "# 8" is the same tag as "#8" to a person, so close the gap
     before anything else looks at the line. */
  const norm = line.replace(/#\s+(?=[\p{L}\p{N}])/gu, '#');

  /* The last line has to BE a row of tags, not a sentence that
     happens to end with one. Strip the hashtags and the separators
     between them; if there is prose left over, this is writing, and
     "I played it at #9 in the set" must not renumber the entry to 9. */
  const residue = norm
    .replace(/#[\p{L}\p{N}_]+/gu, '')
    .replace(/[\s,.·|/\\\-–—]+/gu, '');
  if (residue) return { n: null, why: 'the last line is writing, not a row of tags', line };

  const nums = [...norm.matchAll(/#(\d{1,3})\b/g)]
    .map(m => parseInt(m[1], 10))
    .filter(n => n >= 1 && n <= DIARY_TARGET * 10);   // #2026 is a year, not an entry

  if (!nums.length) return { n: null, why: 'no numbered hashtag on the last line', line };
  /* Two different entry numbers on one line is a guess, and guessing
     here retitles the wrong entry. Say so instead. */
  if (new Set(nums).size > 1) {
    return { n: null, why: `more than one number on the last line (${[...new Set(nums)].map(x => '#' + x).join(', ')})`, line };
  }
  const n = nums[0];
  return n >= 1 && n <= 999 ? { n, why: '', line } : { n: null, why: 'out of range', line };
}

/** Diary entries in number order, non-diary items left where they sit. */
function reorderDiaries(list) {
  const slots = [];
  const picked = [];
  list.forEach((it, i) => {
    if (diaryNo(it) != null) { slots.push(i); picked.push(it); }
  });
  picked.sort((a, b) => diaryNo(a) - diaryNo(b));
  slots.forEach((i, k) => { list[i] = picked[k]; });
}

/**
 * What renumbering would do, without doing it.
 *
 * First hashtag to claim a number keeps it — a second entry carrying
 * the same "#n" is not silently overwritten, it goes to the tail with
 * the unnumbered ones and is reported. Gaps in the hashtags are left
 * as gaps rather than closed up: the numbers are yours, this only
 * reads them.
 */
export function renumberPlan(pKey = 'x', tKey = 'thread') {
  const list = itemsOf(pKey, tKey);
  const diaries = list.filter(it => diaryNo(it) != null);
  if (!diaries.length) {
    return { ok: false, reason: 'No entries titled "Diary …" here, so there is nothing to renumber.' };
  }

  /* Blank scaffolding is not part of the run — it keeps its number
     and stays out of this entirely. */
  const live = diaries.filter(it => written(it));
  const blanks = diaries.length - live.length;
  if (!live.length) {
    return { ok: false, reason: 'Every entry here is still an empty slot, so there is nothing to renumber yet.' };
  }

  const taken = new Map();                        // number → entry
  const tail = [];                                // in the order they already sit
  const dupes = [];
  const lineOf = new Map();                       // id → the line it was read from

  live.forEach(it => {
    const tag = readTag(it.body);
    lineOf.set(it.id, tag.line);
    if (tag.n == null) { tail.push({ it, why: tag.why, line: tag.line }); return; }
    if (taken.has(tag.n)) {
      dupes.push({ n: tag.n, was: it.title });
      tail.push({ it, why: `#${tag.n} was already claimed`, line: tag.line });
      return;
    }
    taken.set(tag.n, it);
  });

  const hi = taken.size ? Math.max(...taken.keys()) : 0;
  let next = hi + 1;

  const assigned = new Map();
  taken.forEach((it, n) => assigned.set(it.id, { n, via: 'hashtag' }));
  tail.forEach(({ it, why, line }) => assigned.set(it.id, { n: next++, via: 'tail', why, line }));

  const rows = live.map(it => {
    const a = assigned.get(it.id);
    return { id: it.id, was: it.title, to: `Diary ${a.n}`, n: a.n, via: a.via, why: a.why,
             line: lineOf.get(it.id) || '',
             bodyFrom: bodyNo(it.body), bodyTo: bodyNo(it.body) == null ? null : a.n };
  }).sort((x, y) => x.n - y.n);

  /* The dates follow the numbers.

     Renumbering on its own leaves entry 27 sitting on the date entry
     1 used to have, so the run reads backwards and the scheduler —
     which works the cadence out from this very run — learns nonsense
     from it. The dates themselves are not recalculated or invented:
     the ones already on these entries are collected, put in order,
     and handed back out lowest date to lowest number. Same set of
     days, matched to the new running order.

     An entry with a fixed calendar date rather than a T-offset keeps
     it, and is left out of the shuffle entirely. */
  const byId = new Map(live.map(it => [it.id, it]));
  const ordered = rows.map(r => byId.get(r.id)).filter(Boolean);
  const pool = ordered
    .map(it => offsetOf(it.when))
    .filter(o => o != null)
    .sort((a, b) => a - b);

  let k = 0;
  const dates = ordered.map(it => {
    const cur = offsetOf(it.when);
    if (cur == null) return { id: it.id, from: it.when || '', to: it.when || '', fixed: true };
    return { id: it.id, from: it.when, to: asT(pool[k++]) };
  });
  const datesChanged = dates.filter(d => d.from !== d.to).length;
  const dateById = new Map(dates.map(d => [d.id, d]));
  rows.forEach(r => { const d = dateById.get(r.id); if (d) { r.from = d.from; r.to_when = d.to; } });

  const gaps = [];
  for (let n = 1; n <= hi; n++) if (!taken.has(n)) gaps.push(n);

  /* An empty slot sitting on a number a written entry is about to
     take would leave two entries with the same title. The slot is
     scaffolding this app made, so it goes rather than the writing. */
  const claimed = new Set(rows.map(r => r.n));
  const collides = diaries.filter(it =>
    !written(it) && it.gen && claimed.has(diaryNo(it))).length;

  return {
    ok: true,
    rows,
    collides,
    changed: rows.filter(r => r.was !== r.to).length,
    byHash: taken.size,
    tail: tail.length,
    tailFrom: tail.length ? hi + 1 : null,
    tailTo: tail.length ? next - 1 : null,
    dupes,
    gaps,
    blanks,
    dates,
    datesChanged,
    bodiesChanged: rows.filter(r => r.bodyFrom != null && r.bodyFrom !== r.bodyTo).length,
    count: live.length,
    /* What the last line of the first few unnumbered entries actually
       says. When nothing is found, showing this beats saying "0
       carrying a hashtag" and leaving you to guess why. */
    samples: tail.slice(0, 4).map(t => ({ title: t.it.title, line: t.line || '(nothing)', why: t.why })),
  };
}

/** Retitle from the hashtags and put the run back in order. */
export function renumber(pKey = 'x', tKey = 'thread', { redate = true } = {}) {
  const plan = renumberPlan(pKey, tKey);
  if (!plan.ok) return plan;

  const list = itemsOf(pKey, tKey);
  const to = new Map(plan.rows.map(r => [r.id, r.to]));
  const when = redate ? new Map(plan.dates.map(d => [d.id, d.to])) : new Map();
  const num = new Map(plan.rows.map(r => [r.id, r.n]));
  list.forEach(it => {
    const t = to.get(it.id);
    if (t) {
      /* The number lives on the first line now, not in a title. The
         text platforms have no title box, so putting one back here
         would recreate exactly what was just cleared. */
      it.body = renumberBody(it.body, num.get(it.id));
    }
    /* dates move with the numbers, never onto a fixed calendar date */
    const w = when.get(it.id);
    if (w !== undefined && !it.fixedDate) it.when = w;
  });

  const claimed = new Set(plan.rows.map(r => r.n));
  const keep = list.filter(it => !(
    !to.has(it.id) && it.gen && !written(it)
    && diaryNo(it) != null && claimed.has(diaryNo(it))));
  const cleared = list.length - keep.length;

  S.get(`p_${pKey}`).content[tKey] = keep;
  reorderDiaries(keep);
  S.touch(`p_${pKey}`);

  return { ...plan, applied: plan.changed, redated: redate ? plan.datesChanged : 0,
           bodies: plan.bodiesChanged, cleared };
}

/* ============================================================
   Dates: one entry, one day
   ============================================================ */

/**
 * Lay the run back out from T-30, one day each, in the order it
 * already sits.
 *
 * Editing dates by hand leaves duplicates — two entries on T+6, a
 * gap at T+7 — and the run stops meaning "a day each". This walks
 * the list in the order it currently reads and hands out T-30,
 * T-29, T-28 and so on.
 *
 * Only entries that already carry a T-offset take part. One pinned
 * to a real calendar date keeps it, and one with no date stays
 * undated: those are choices, not accidents.
 */
export function resequence(pKey, tKey, from = -30) {
  const list = itemsOf(pKey, tKey);
  const dated = list
    .map((it, at) => ({ it, at, off: offsetOf(it.when) }))
    .filter(x => x.off != null)
    .sort((a, b) => (a.off - b.off) || (a.at - b.at));

  let n = 0;
  dated.forEach((x, i) => {
    const want = asT(from + i);
    if (x.it.when !== want) { x.it.when = want; n++; }
  });
  if (n) S.touch(`p_${pKey}`);
  return { moved: n, total: dated.length };
}

/**
 * Make room at a day, by pushing everything from it onwards along.
 *
 * Move an entry to T+9 and the one already on T+9 becomes T+10, the
 * old T+10 becomes T+11, and so on — the entry you moved takes the
 * day you gave it and nothing ends up sharing. If the day was free,
 * nothing moves: there is nothing to make room for.
 *
 * `moved` is the entry you just re-dated; it is never pushed by its
 * own arrival.
 */
export function makeRoom(list, moved, when, sliceId) {
  const off = offsetOf(when);
  if (off == null || !Array.isArray(list)) return 0;

  const occupied = list.some(it => it !== moved && offsetOf(it.when) === off);
  if (!occupied) return 0;

  let n = 0;
  list.forEach(it => {
    if (it === moved) return;
    const o = offsetOf(it.when);
    if (o != null && o >= off) { it.when = asT(o + 1); n++; }
  });
  if (n && sliceId) S.touch(sliceId);
  return n;
}
