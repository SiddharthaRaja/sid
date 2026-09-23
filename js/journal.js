/* ============================================================
   journal.js — the append-only safety net

   Why this exists on top of everything else
   -----------------------------------------
   The layers under this one all have the same shape: a place where the
   CURRENT value of a section lives, which every save overwrites. That
   is what you want almost always, and it is also the one property that
   makes a bug catastrophic — an overwrite cannot be undone, and a
   corrupt write destroys the thing it replaces.

   This file never overwrites anything. It only ever appends. A bad
   write in the layer above adds a bad entry here; it cannot damage the
   good ones already written. So even if store.js and local.js are both
   wrong, the history of what you typed is still here, timestamped, and
   any point in it can be read back.

   It is also deliberately independent:
     • its own IndexedDB database (`sid-journal`), so a version bug, a
       corrupt object store or a failed migration in `sid-local` cannot
       take it with them
     • its own open/transaction code, not shared with local.js
     • its own failure reporting — if it cannot write, it says so
       rather than pretending

   What it does NOT protect against: clearing the site's data, or the
   browser evicting the origin. Both take every browser-side store at
   once. The file backup in filebackup.js is the layer for that, and
   the downloaded JSON is the layer under that.

   Cost: one copy of a section, at most once a minute while you are
   actively editing it. Capped, and prunable.
   ============================================================ */

const DB = 'sid-journal';
const ENTRIES = 'entries';        // key -> { at, id, ns, bytes }
const BLOBS = 'blobs';            // key -> the value itself
const META = 'meta';

const THROTTLE = 60 * 1000;       // per section, while actively editing
const MAX_ENTRIES = 600;
const MAX_BYTES = 40 * 1024 * 1024;

const lastWrite = new Map();      // id -> ms
let ns = 'anon';
let failed = '';

export const setNamespace = (uid) => { ns = uid || 'anon'; };
export const lastError = () => failed;

/* ---------------------------------------------------------- */
/*  on / off                                                   */
/* ---------------------------------------------------------- */

const OFF = 'sid.journal.off';
export function enabled() {
  try { return localStorage.getItem(OFF) !== '1'; } catch { return true; }
}
export function setEnabled(on) {
  try { on ? localStorage.removeItem(OFF) : localStorage.setItem(OFF, '1'); } catch {}
}

/* ---------------------------------------------------------- */
/*  storage                                                    */
/* ---------------------------------------------------------- */

let dbp = null;
function open() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    let req;
    try { req = indexedDB.open(DB, 1); }
    catch (e) { rej(e); return; }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ENTRIES)) {
        const s = db.createObjectStore(ENTRIES, { keyPath: 'key', autoIncrement: true });
        s.createIndex('at', 'at');
        s.createIndex('id', 'id');
      }
      if (!db.objectStoreNames.contains(BLOBS)) db.createObjectStore(BLOBS);
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error || new Error('journal unavailable'));
    req.onblocked = () => rej(new Error('journal blocked by another tab'));
  }).catch((e) => {
    dbp = null;
    failed = e.message || String(e);
    throw e;
  });
  return dbp;
}

function tx(stores, mode, fn) {
  return open().then(db => new Promise((res, rej) => {
    let t;
    try { t = db.transaction(stores, mode); }
    catch (e) { rej(e); return; }
    let out;
    try {
      out = Array.isArray(stores) ? fn(...stores.map(n => t.objectStore(n))) : fn(t.objectStore(stores));
    } catch (e) { rej(e); return; }
    t.oncomplete = () => res(out);
    t.onerror = () => rej(t.error || new Error('journal write failed'));
    t.onabort = () => rej(t.error || new Error('journal write aborted (usually out of space)'));
  }));
}

/* ---------------------------------------------------------- */
/*  appending                                                  */
/* ---------------------------------------------------------- */

/**
 * Append a copy of one section.
 *
 * Throttled per section so continuous typing does not write a copy
 * every keystroke; `force` bypasses that, and is used on the way out
 * of the page and before anything destructive.
 */
export async function record(id, value, { force = false, label = '' } = {}) {
  if (!enabled()) return false;
  const now = Date.now();
  if (!force && now - (lastWrite.get(id) || 0) < THROTTLE) return false;
  lastWrite.set(id, now);

  let json;
  try { json = JSON.stringify(value); } catch { return false; }
  if (json === undefined) return false;

  try {
    await tx([ENTRIES, BLOBS], 'readwrite', (entries, blobs) => {
      const req = entries.add({ at: now, id, ns, label, bytes: json.length });
      req.onsuccess = () => blobs.put(json, req.result);
    });
    failed = '';
    thin().catch(() => {});
    return true;
  } catch (e) {
    failed = e.message || String(e);
    return false;
  }
}

/** Append every section at once — before a restore, import or erase. */
export async function recordAll(all, label) {
  if (!enabled()) return 0;
  let n = 0;
  for (const [id, v] of Object.entries(all || {})) {
    if (await record(id, v, { force: true, label })) n++;
  }
  return n;
}

/* ---------------------------------------------------------- */
/*  reading back                                               */
/* ---------------------------------------------------------- */

/** Every entry's metadata, newest first. Values are not loaded. */
export async function list({ id = null, limit = 500 } = {}) {
  const rows = await tx(ENTRIES, 'readonly', (s) => {
    const out = [];
    const req = s.openCursor(null, 'prev');
    req.onsuccess = (e) => {
      const c = e.target.result;
      if (!c || out.length >= limit) return;
      if (!id || c.value.id === id) out.push(c.value);
      c.continue();
    };
    return out;
  });
  return rows || [];
}

/** One entry's value. */
export async function read(key) {
  const json = await tx(BLOBS, 'readonly', (s) => {
    const r = s.get(key);
    return r;
  }).then(r => (r && r.result !== undefined ? r.result : undefined));
  if (json === undefined) return undefined;
  try { return JSON.parse(json); } catch { return undefined; }
}

/** Everything, as one object, for downloading. */
export async function dump() {
  const rows = await list({ limit: MAX_ENTRIES });
  const out = [];
  for (const r of rows) {
    const v = await read(r.key);
    if (v !== undefined) out.push({ at: r.at, id: r.id, ns: r.ns, label: r.label, value: v });
  }
  return out;
}

/** How much history is here. */
export async function stats() {
  const rows = await list({ limit: MAX_ENTRIES });
  const bytes = rows.reduce((n, r) => n + (r.bytes || 0), 0);
  return {
    entries: rows.length,
    bytes,
    oldest: rows.length ? rows[rows.length - 1].at : 0,
    newest: rows.length ? rows[0].at : 0,
    sections: [...new Set(rows.map(r => r.id))].length,
    error: failed,
  };
}

/* ---------------------------------------------------------- */
/*  pruning                                                    */
/* ---------------------------------------------------------- */

/* Oldest-first, and only ever past the caps. Nothing here is thinned
   by "importance" — the point of an append-only log is that you do not
   have to have been clever in advance about which copy you would
   later wish you had kept. */
export async function thin() {
  const rows = await tx(ENTRIES, 'readonly', (s) => {
    const out = [];
    const req = s.openCursor();
    req.onsuccess = (e) => { const c = e.target.result; if (!c) return; out.push(c.value); c.continue(); };
    return out;
  });
  if (!rows || !rows.length) return;

  let total = rows.reduce((n, r) => n + (r.bytes || 0), 0);
  const drop = [];
  let i = 0;
  while ((rows.length - drop.length > MAX_ENTRIES || total > MAX_BYTES) && i < rows.length) {
    drop.push(rows[i].key);
    total -= rows[i].bytes || 0;
    i++;
  }
  if (!drop.length) return;
  await tx([ENTRIES, BLOBS], 'readwrite', (entries, blobs) => {
    for (const k of drop) { entries.delete(k); blobs.delete(k); }
  });
}

/** Wipe the journal. Only from an explicit choice in Settings. */
export async function clearAll() {
  await tx([ENTRIES, BLOBS], 'readwrite', (entries, blobs) => { entries.clear(); blobs.clear(); });
  lastWrite.clear();
}
