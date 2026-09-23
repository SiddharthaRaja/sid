/* ============================================================
   filebackup.js — a real file on your computer, kept current

   Every other layer lives inside the browser's storage for this site:
   the localStorage mirror, the IndexedDB snapshots, the append-only
   journal. They protect against different failures, but they share one
   fate — clearing the site's data, or the browser evicting the origin,
   takes all of them at once.

   This is the layer that survives that. With the File System Access
   API the page can hold a handle to an ordinary file you choose once,
   and rewrite it in the background from then on. No dialog each time,
   no download folder full of dated copies: one file, always current,
   sitting wherever you put it.

   It is opt-in and desktop-only, because that is where the API exists.
   On a phone the honest answer is the Download button, and the app
   says so rather than pretending.
   ============================================================ */

const DB = 'sid-journal';        // shares the journal's database, own store
const META = 'meta';
const KEY = 'backupFileHandle';

export const supported = () =>
  typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function';

let handle = null;
let lastWrite = 0;
let lastError = '';

export const status = () => ({
  supported: supported(),
  connected: !!handle,
  name: handle ? handle.name : '',
  lastWrite,
  error: lastError,
});

/* ---------------------------------------------------------- */
/*  the handle                                                 */
/* ---------------------------------------------------------- */

function store(mode, fn) {
  return new Promise((res, rej) => {
    let req;
    try { req = indexedDB.open(DB, 1); }
    catch (e) { rej(e); return; }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('entries')) {
        const s = db.createObjectStore('entries', { keyPath: 'key', autoIncrement: true });
        s.createIndex('at', 'at'); s.createIndex('id', 'id');
      }
      if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs');
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
    };
    req.onerror = () => rej(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const t = db.transaction(META, mode);
      let out;
      try { out = fn(t.objectStore(META)); } catch (e) { rej(e); return; }
      t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    };
  });
}

/** Reconnect to the file chosen in an earlier session, if allowed. */
export async function restore() {
  if (!supported()) return false;
  try {
    const h = await store('readonly', s => s.get(KEY));
    if (!h) return false;
    /* Permission may have lapsed since last time. Querying is silent;
       asking for it again needs a click, which the Settings card
       provides. */
    const perm = await h.queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') { handle = h; return true; }
    handle = null;
    lastError = perm === 'prompt'
      ? 'The backup file needs permission again — open Settings → Backup and press Reconnect.'
      : 'Permission to write the backup file was withdrawn.';
    return false;
  } catch (e) { lastError = e.message || String(e); return false; }
}

/** Choose the file. Must be called from a click. */
export async function choose(suggestedName) {
  if (!supported()) throw new Error('This browser cannot write a backup file directly. Use Download everything instead.');
  const h = await window.showSaveFilePicker({
    suggestedName: suggestedName || 'sid-backup.json',
    types: [{ description: 'Sid backup', accept: { 'application/json': ['.json'] } }],
  });
  const perm = await h.requestPermission({ mode: 'readwrite' });
  if (perm !== 'granted') throw new Error('Permission to write that file was refused.');
  handle = h;
  lastError = '';
  /* Remembering the handle for next time is a convenience, not the
     feature. If it cannot be stored, the backup still works for this
     session — say so rather than refusing the whole thing. */
  try { await store('readwrite', s => s.put(h, KEY)); }
  catch (e) {
    lastError = 'Connected for this session, but this browser would not remember the file — you will have to choose it again next time (' + (e.message || e) + ').';
  }
  return h.name;
}

/** Ask for permission again on an existing handle. Needs a click. */
export async function reconnect() {
  if (!supported()) return false;
  const h = await store('readonly', s => s.get(KEY));
  if (!h) return false;
  const perm = await h.requestPermission({ mode: 'readwrite' });
  if (perm !== 'granted') { lastError = 'Permission refused.'; return false; }
  handle = h; lastError = '';
  return true;
}

export async function forget() {
  handle = null;
  try { await store('readwrite', s => s.delete(KEY)); } catch {}
}

/* ---------------------------------------------------------- */
/*  writing                                                    */
/* ---------------------------------------------------------- */

/**
 * Overwrite the file with the current state.
 *
 * Writes to the file only after the whole payload has been serialised,
 * so a failure part-way through cannot leave a truncated file where a
 * good backup used to be.
 */
export async function write(all) {
  if (!handle) return false;
  let json;
  try { json = JSON.stringify({ savedAt: new Date().toISOString(), data: all }, null, 2); }
  catch (e) { lastError = 'Could not serialise the data: ' + (e.message || e); return false; }

  try {
    const w = await handle.createWritable();
    await w.write(json);
    await w.close();
    lastWrite = Date.now();
    lastError = '';
    return true;
  } catch (e) {
    lastError = e.message || String(e);
    return false;
  }
}
