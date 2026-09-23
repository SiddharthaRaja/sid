/* ============================================================
   local.js — the device-local durability layer

   Why this file exists
   --------------------
   Firestore used to be the ONLY place work was written. Its setDoc()
   resolves on server acknowledgement and has no timeout, so a stalled
   write queue produced a promise that never settled: the save hung,
   the retry never fired, and a refresh threw the session away. There
   was no floor underneath it.

   This is the floor. localStorage is synchronous and survives a
   process kill, which is the one property that matters. The cloud is
   sync, not storage.

   What it guards against, deliberately
   ------------------------------------
   • CROSS-TAB CLOBBER. Two tabs share one localStorage with no
     locking. A tab holding an hour-old copy could write it over a
     newer one. Every write is now compare-and-swap against what is
     actually on disk, a `storage` listener pulls other tabs forward,
     and a genuine conflict is kept as a snapshot rather than dropped.
   • CLOCK SKEW. Ordering used to be pure `Date.now()`. A device with a
     fast clock produced a future-stamped copy that won for ever. Each
     record now carries a per-device monotonic sequence as well, and a
     slice's stamp can never go backwards on this device.
   • QUOTA. A slice too large for localStorage spills to IndexedDB —
     and every reader, including the wrong-account recovery export,
     knows how to find it again.
   • ACCOUNTS. Everything is namespaced by uid, so signing into a
     different Google account can never read or overwrite the other
     account's work.

   Layout
   ------
   localStorage  sid.v2.<uid>.slice.<id>   { v, at, seq }  live mirror
   localStorage  sid.v2.seq                monotonic counter
   IndexedDB     sid-local / snaps         point-in-time copies
   IndexedDB     sid-local / big           slices too large for above
   ============================================================ */

let NS = 'anon';

export function setNamespace(uid) {
  const next = uid || 'anon';
  if (next === NS) return;
  NS = next;
  lastSeen.clear();
  migrateLegacy();
}
export const namespace = () => NS;

const skey = (id) => `sid.v2.${NS}.slice.${id}`;
const SPILL = '\u0000spill';
const SEQ_KEY = 'sid.v2.seq';
const LEGACY_DONE = 'sid.v2.legacyMigrated';

/* What this tab last saw on disk for each slice, so a write can tell
   "I am updating my own record" from "another tab got here first". */
const lastSeen = new Map();

/* ---------------------------------------------------------- */
/*  problems — nothing here fails silently                     */
/* ---------------------------------------------------------- */

export const problems = [];
export function problem(text) {
  if (!text) return;
  if (!problems.includes(text)) problems.push(text);
  try { window.dispatchEvent(new CustomEvent('sid-storage-problem', { detail: text })); } catch {}
}
export const clearProblems = () => { problems.length = 0; };

/* ---------------------------------------------------------- */
/*  monotonic sequence                                         */
/* ---------------------------------------------------------- */

/* A device clock can be wrong, can jump, and can go backwards. This
   never does, so it settles any ordering question that timestamps
   alone get wrong — including two writes inside the same millisecond,
   which used to make the second one invisible to the sync layer. */
let seq = 0;
try { seq = Number(localStorage.getItem(SEQ_KEY)) || 0; } catch {}
export function nextSeq() {
  seq += 1;
  try { localStorage.setItem(SEQ_KEY, String(seq)); } catch {}
  return seq;
}
export const currentSeq = () => seq;

/* ---------------------------------------------------------- */
/*  persistent storage permission                              */
/* ---------------------------------------------------------- */

/* Without this a browser under disk pressure may evict localStorage,
   IndexedDB and the caches for this origin with no warning. */
export async function requestPersistence() {
  try {
    if (!navigator.storage || !navigator.storage.persist) return null;
    if (await navigator.storage.persisted()) return true;
    const got = await navigator.storage.persist();
    if (!got) problem('The browser would not mark this site\'s storage as persistent, so it could be cleared if the device runs low on space. Keep downloading backups.');
    return got;
  } catch { return null; }
}

export async function estimate() {
  try { return await navigator.storage.estimate(); } catch { return null; }
}

/* ---------------------------------------------------------- */
/*  IndexedDB                                                  */
/* ---------------------------------------------------------- */

let dbp = null;
function idb() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    let req;
    try { req = indexedDB.open('sid-local', 1); }
    catch (e) { rej(e); return; }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('snaps')) db.createObjectStore('snaps', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('big')) db.createObjectStore('big');
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
    req.onblocked = () => rej(new Error('IndexedDB is blocked by another tab'));
  }).catch((e) => {
    problem('This browser is blocking IndexedDB, so snapshots on this device are off. Private-browsing windows do this. Download a backup instead.');
    dbp = null;                       // a later attempt may succeed
    throw e;
  });
  return dbp;
}

function tx(store, mode, fn) {
  return idb().then(db => new Promise((res, rej) => {
    let t;
    try { t = db.transaction(store, mode); }
    catch (e) { rej(e); return; }
    const s = t.objectStore(store);
    let out;
    try { out = fn(s); } catch (e) { rej(e); return; }
    t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
    t.onerror = () => rej(t.error || new Error('IndexedDB transaction failed'));
    /* Without this an aborted transaction — a quota abort, a version
       change, a browser-initiated abort — leaves the promise pending
       for ever, and every caller awaiting it hangs silently. */
    t.onabort = () => rej(t.error || new Error('IndexedDB transaction aborted (usually out of space)'));
  }));
}

/* ---------------------------------------------------------- */
/*  slice mirror                                               */
/* ---------------------------------------------------------- */

function parse(raw) {
  if (raw == null) return null;
  try {
    const rec = JSON.parse(raw);
    if (!rec || typeof rec !== 'object') return null;
    return {
      v: rec.v === SPILL ? undefined : rec.v,
      at: Number(rec.at) || 0,
      seq: Number(rec.seq) || 0,
      spilled: rec.v === SPILL,
    };
  } catch { return null; }
}

/** This device's copy of a slice, synchronously. Spilled values need
 *  readSliceFull instead — `spilled` says so. */
export function readSlice(id) {
  try { return parse(localStorage.getItem(skey(id))); } catch { return null; }
}

/** The same, resolving a spilled value out of IndexedDB. */
export async function readSliceFull(id) {
  const rec = readSlice(id);
  if (!rec || !rec.spilled) return rec;
  try {
    const v = await tx('big', 'readonly', s => s.get(skey(id)));
    if (v === undefined) {
      problem(`The stored copy of "${id}" could not be read back from this device. Download a backup and check that section.`);
      return null;
    }
    return { v, at: rec.at, seq: rec.seq };
  } catch (e) {
    problem(`Could not read "${id}" from this device: ${e.message}`);
    return null;
  }
}

/**
 * Write this device's copy.
 *
 * Synchronous on the localStorage path — it has already happened by
 * the time this returns. Returns an object describing what happened so
 * the caller can tell a durable write from a spilled one.
 */
export function writeSlice(id, v, at) {
  const key = skey(id);
  let cur = null;
  try { cur = parse(localStorage.getItem(key)); } catch {}

  /* A slice's stamp must never go backwards on this device, whatever
     the clock does. */
  const stamp = Math.max(Number(at) || 0, (cur ? cur.at : 0) + 1);
  const mySeq = nextSeq();

  /* Compare and swap. If what is on disk is not what this tab last
     saw, another tab wrote in the meantime — and the old code would
     have flattened it. Keep theirs before ours goes over the top. */
  const seen = lastSeen.get(id);
  if (cur && seen !== undefined && cur.seq !== seen && !cur.spilled) {
    keepConflict(id, cur).catch(() => {});
    problem('Sid is open in more than one tab and they disagreed about a section. The other tab\'s version was saved as a snapshot before this one was written — check Settings → Backup if something looks wrong.');
  }

  const wasSpilled = cur && cur.spilled;
  const rec = JSON.stringify({ v, at: stamp, seq: mySeq });
  try {
    localStorage.setItem(key, rec);
    lastSeen.set(id, mySeq);
    if (wasSpilled) dropSpill(key);
    return { ok: true, at: stamp, seq: mySeq, spilled: false };
  } catch {
    if (pruneLocalStorage()) {
      try {
        localStorage.setItem(key, rec);
        lastSeen.set(id, mySeq);
        if (wasSpilled) dropSpill(key);
        return { ok: true, at: stamp, seq: mySeq, spilled: false };
      } catch {}
    }
  }

  /* No room. Park the value in IndexedDB and leave a marker.
     If even the marker will not fit, say so loudly rather than
     leaving a stale record behind that looks current. */
  const marker = JSON.stringify({ v: SPILL, at: stamp, seq: mySeq });
  let markerOk = false;
  try { localStorage.setItem(key, marker); markerOk = true; lastSeen.set(id, mySeq); } catch {}

  const write = tx('big', 'readwrite', s => s.put(v, key))
    .then(() => {
      if (!markerOk) {
        try { localStorage.setItem(key, marker); lastSeen.set(id, mySeq); } catch {
          problem(`"${id}" is too large for this device's storage and could not be recorded. Download a backup now.`);
        }
      }
      return true;
    })
    .catch((e) => {
      problem(`This device is out of storage room for "${id}" (${e.message}). Download a backup now and free some space.`);
      return false;
    });

  if (!markerOk) {
    problem('This device is nearly out of storage. Download a backup now.');
  }
  return { ok: false, at: stamp, seq: mySeq, spilled: true, settled: write };
}

/* A slice that once had to spill and now fits again leaves a copy
   behind in IndexedDB. Nothing reads it, and it goes on occupying the
   same origin quota the recordings need. */
function dropSpill(key) {
  tx('big', 'readwrite', s => s.delete(key)).catch(() => {});
}

/* Keep the version another tab wrote, so a conflict costs nothing. */
async function keepConflict(id, rec) {
  const at = new Date().toISOString();
  return tx('snaps', 'readwrite', s => s.put({
    key: at + '-conflict-' + id, at, label: 'conflict:' + id, ns: NS, data: { [id]: rec.v },
  }));
}

/* Free room by dropping ONLY legacy copies already brought forward.
   Nothing here removes the sole copy of anything. */
function pruneLocalStorage() {
  let freed = false;
  try {
    for (const k of Object.keys(localStorage)) {
      if (!k.startsWith('sid.slice.')) continue;
      const id = k.slice('sid.slice.'.length);
      if (localStorage.getItem(skey(id)) == null) continue;
      localStorage.removeItem(k);
      freed = true;
    }
    if (!freed && legacySnapsMoved && localStorage.getItem('sid.snaps')) {
      localStorage.removeItem('sid.snaps'); freed = true;
    }
  } catch {}
  return freed;
}

/** Every slice this device holds for the current account, spills and
 *  all. Async because a spilled value lives in IndexedDB. */
export async function allSlices(ns = NS) {
  const out = {};
  const prefix = `sid.v2.${ns}.slice.`;
  let keys = [];
  try { keys = Object.keys(localStorage).filter(k => k.startsWith(prefix)); } catch { return out; }
  for (const k of keys) {
    const id = k.slice(prefix.length);
    const rec = parse(localStorage.getItem(k));
    if (!rec) continue;
    if (!rec.spilled) { out[id] = rec.v; continue; }
    try {
      const v = await tx('big', 'readonly', s => s.get(k));
      if (v !== undefined) out[id] = v;
      else problem(`"${id}" could not be read back for this export — it is missing from this device.`);
    } catch (e) {
      problem(`"${id}" could not be read back for this export: ${e.message}`);
    }
  }
  return out;
}

/** Namespaces (accounts) that have data on this device. */
export function knownNamespaces() {
  const seen = new Set();
  try {
    for (const k of Object.keys(localStorage)) {
      const m = /^sid\.v2\.([^.]+)\.slice\./.exec(k);
      if (m) seen.add(m[1]);
    }
  } catch {}
  return [...seen];
}

/**
 * What every account on this device holds.
 *
 * This exists because of a failure mode with no other symptom: sign in
 * with the wrong Google account and the app is simply empty — correct
 * behaviour, indistinguishable from having lost everything. The work
 * is on the disk the whole time. Now it is findable.
 */
export function namespaceSummary() {
  const acc = new Map();
  try {
    for (const k of Object.keys(localStorage)) {
      const m = /^sid\.v2\.([^.]+)\.slice\.(.+)$/.exec(k);
      if (!m) continue;
      const [, ns, id] = m;
      const raw = localStorage.getItem(k) || '';
      const rec = parse(raw);
      const row = acc.get(ns) || { ns, sections: 0, bytes: 0, newest: 0, spilled: 0, ids: [] };
      row.sections++;
      row.bytes += raw.length;
      row.ids.push(id);
      if (rec && rec.spilled) row.spilled++;
      if (rec && rec.at > row.newest) row.newest = rec.at;
      acc.set(ns, row);
    }
  } catch {}
  return [...acc.values()].sort((a, b) => b.newest - a.newest);
}

/** Everything one account holds on this device — spills included. */
export const readNamespace = (ns) => allSlices(ns);

/* ---------------------------------------------------------- */
/*  other tabs                                                 */
/* ---------------------------------------------------------- */

/* A `storage` event fires in every OTHER tab of this origin. Listening
   is what stops two tabs drifting apart until one flattens the other. */
export function onOtherTabWrite(cb) {
  const h = (e) => {
    if (!e.key || !e.key.startsWith(`sid.v2.${NS}.slice.`)) return;
    const id = e.key.slice(`sid.v2.${NS}.slice.`.length);
    const rec = parse(e.newValue);
    if (!rec) return;
    lastSeen.set(id, rec.seq);
    try { cb(id, rec); } catch (err) { console.error(err); }
  };
  window.addEventListener('storage', h);
  return () => window.removeEventListener('storage', h);
}

/** Tell this module what the caller has just loaded, so the first
 *  write does not look like someone else's. */
export function noteSeen(id, rec) {
  if (rec && rec.seq !== undefined) lastSeen.set(id, rec.seq);
}

/* ---------------------------------------------------------- */
/*  legacy migration                                           */
/* ---------------------------------------------------------- */

/* Versions before this file kept local-mode data at `sid.slice.<id>`
   with no timestamp and no account namespace.

   It is migrated ONCE, into the first account that signs in, and
   recorded as done. Migrating on every setNamespace copied one
   account's work into the next account's storage — and from there
   straight up into the wrong person's cloud. */
function migrateLegacy() {
  let done = [];
  try { done = JSON.parse(localStorage.getItem(LEGACY_DONE) || '[]'); } catch {}
  if (done.length) return;                     // already claimed by an account

  let keys = [];
  try { keys = Object.keys(localStorage).filter(k => k.startsWith('sid.slice.')); } catch { return; }
  if (!keys.length) return;

  for (const k of keys) {
    const id = k.slice('sid.slice.'.length);
    if (localStorage.getItem(skey(id)) != null) continue;
    try {
      const v = JSON.parse(localStorage.getItem(k));
      localStorage.setItem(skey(id), JSON.stringify({ v, at: 1, seq: nextSeq() }));
    } catch {}
  }
  try { localStorage.setItem(LEGACY_DONE, JSON.stringify([NS])); } catch {}
}

let legacySnapsMoved = false;
export async function migrateLegacySnapshots() {
  if (legacySnapsMoved) return;
  let raw;
  try { raw = localStorage.getItem('sid.snaps'); } catch { return; }
  if (!raw) { legacySnapsMoved = true; return; }
  try {
    const rows = JSON.parse(raw);
    if (Array.isArray(rows)) {
      for (const r of rows) {
        if (!r || !r.at || !r.data) continue;
        await tx('snaps', 'readwrite', s => s.put({ key: r.at, at: r.at, label: r.label || 'legacy', ns: NS, data: r.data }));
      }
    }
    legacySnapsMoved = true;
  } catch {}
}

/* ---------------------------------------------------------- */
/*  local snapshots                                            */
/* ---------------------------------------------------------- */

/* These are the safety net that actually catches you: they are on this
   device, so they exist even when the network, the cloud or the
   account is the thing that went wrong. */

export async function writeSnapshot(all, label = 'auto') {
  const at = new Date().toISOString();
  await tx('snaps', 'readwrite', s => s.put({ key: at, at, label, ns: NS, data: all }));
  thin().catch(e => console.warn('snapshot prune', e));
  return at;
}

/* Deliberately NOT filtered by account: if you signed into the wrong
   one, the account is the thing that went wrong, and hiding the other
   account's snapshots would hide the copy you need. Labelled instead. */
export async function listSnapshots() {
  const rows = await tx('snaps', 'readonly', s => s.getAll());
  return (rows || [])
    .map(r => ({ at: r.at, key: r.key, label: r.label, ns: r.ns || 'unknown', where: 'device' }))
    .sort((a, b) => (a.at < b.at ? 1 : -1));
}

export async function readSnapshot(key) {
  const r = await tx('snaps', 'readonly', s => s.get(key));
  return r ? r.data : null;
}

/* Test hook: write a snapshot record verbatim. Used by the pruning
   tests to build a history without waiting days for one. */
export async function putSnapshotRaw(rec) {
  return tx('snaps', 'readwrite', s => s.put(rec));
}

export async function deleteSnapshot(key) {
  return tx('snaps', 'readwrite', s => s.delete(key));
}

/**
 * Keep everything from the last two days, then one a day for a month,
 * then one a week — PER ACCOUNT.
 *
 * "Keep the newest 40" covered under seven hours at one snapshot every
 * ten minutes, so a long session shredded every older copy. And
 * bucketing without the account in the key meant using a second Google
 * account deleted the first account's history one day at a time.
 */
export async function thin() {
  const rows = await tx('snaps', 'readonly', s => s.getAll());
  if (!rows || rows.length < 40) return;
  const now = Date.now();
  const keep = new Set();
  const buckets = new Set();

  for (const r of rows.slice().sort((a, b) => (a.at < b.at ? 1 : -1))) {
    const t = Date.parse(r.at);
    if (!Number.isFinite(t)) { keep.add(r.key); continue; }
    if (/manual|session-open|pre-restore|pre-erase|pre-import|conflict/.test(r.label || '')) { keep.add(r.key); continue; }
    const age = now - t;
    if (age < 2 * 864e5) { keep.add(r.key); continue; }
    const span = age < 30 * 864e5 ? Math.floor(t / 864e5) : Math.floor(t / (7 * 864e5));
    const bucket = `${r.ns || 'unknown'}|${age < 30 * 864e5 ? 'd' : 'w'}${span}`;
    if (!buckets.has(bucket)) { buckets.add(bucket); keep.add(r.key); }
  }
  const drop = rows.filter(r => !keep.has(r.key)).map(r => r.key);
  if (!drop.length) return;
  await tx('snaps', 'readwrite', s => { drop.forEach(k => s.delete(k)); });
}

/* ---------------------------------------------------------- */
/*  which account last used this device                        */
/* ---------------------------------------------------------- */

/* Stored OUTSIDE the per-account namespace on purpose: the whole point
   is to notice when the account changes. Signing into the wrong Google
   account is silent by nature — the app is simply empty, which is
   correct behaviour and indistinguishable from having lost the lot. */
const ACC = 'sid.lastAccount';

export function lastAccount() {
  try { return JSON.parse(localStorage.getItem(ACC) || 'null'); } catch { return null; }
}
export function rememberAccount(uid, email) {
  if (!uid) return;
  try { localStorage.setItem(ACC, JSON.stringify({ uid, email: email || '', at: Date.now() })); } catch {}
}

/* ---------------------------------------------------------- */
/*  export tracking                                            */
/* ---------------------------------------------------------- */

const EXP = 'sid.lastExport';
export function markExported() { try { localStorage.setItem(EXP, new Date().toISOString()); } catch {} }
export function lastExport() { try { return localStorage.getItem(EXP) || ''; } catch { return ''; } }
export function daysSinceExport() {
  const t = Date.parse(lastExport());
  return Number.isFinite(t) ? (Date.now() - t) / 864e5 : Infinity;
}
