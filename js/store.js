/* ============================================================
   store.js — state + the continuous-backup engine

   Guarantees you asked for:
     • every edit is persisted ~500ms after you stop typing
     • an unsaved edit is also flushed when the tab is hidden,
       closed, or loses focus  (nothing is lost mid-session)
     • a full point-in-time snapshot every 10 minutes of activity
       and one on every sign-in, kept as version history
     • offline edits queue and replay when you reconnect
   ============================================================ */

import * as B from './backend.js';

const SAVE_DEBOUNCE = 500;
const SNAPSHOT_EVERY = 10 * 60 * 1000;

const slices = new Map();       // id -> value
const defaults = new Map();     // id -> factory
const timers = new Map();
const subs = new Map();         // id -> Set<fn>
const dirty = new Set();

let lastSnapshot = 0;
let statusCb = () => {};
let pending = 0;

export const onStatus = (fn) => { statusCb = fn; };
const status = (s) => statusCb(s);

/* ---------- registration ---------- */

export function register(id, factory) { defaults.set(id, factory); }

export async function loadAll(ids) {
  await Promise.all(ids.map(async (id) => {
    const fallback = (defaults.get(id) || (() => ({})))();
    const v = await B.loadSlice(id, fallback);
    slices.set(id, migrate(v, fallback));
    B.watchSlice(id, (remote) => {
      if (dirty.has(id)) return;               // local edit wins until flushed
      slices.set(id, migrate(remote, fallback));
      emit(id);
    });
  }));
  lastSnapshot = Date.now();
  status('saved');
}

/* Adds any keys introduced by a later version of the app. */
function migrate(value, fallback) {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return value;
  const out = { ...fallback, ...value };
  for (const k of Object.keys(fallback)) {
    if (out[k] == null) out[k] = fallback[k];
  }
  return out;
}

/* ---------- read / write ---------- */

export function get(id) {
  if (!slices.has(id)) slices.set(id, (defaults.get(id) || (() => ({})))());
  return slices.get(id);
}

/** Mutate a slice and persist it. `fn` receives the live object. */
export function update(id, fn) {
  const v = get(id);
  const r = fn(v);
  if (r !== undefined) slices.set(id, r);
  mark(id);
  emit(id);
  return slices.get(id);
}

/** Persist without re-notifying subscribers (for in-place field edits). */
export function touch(id) { mark(id); }

function mark(id) {
  dirty.add(id);
  status('saving');
  clearTimeout(timers.get(id));
  timers.set(id, setTimeout(() => flush(id), SAVE_DEBOUNCE));
}

async function flush(id) {
  if (!dirty.has(id)) return;
  clearTimeout(timers.get(id));
  pending++;
  try {
    await B.saveSlice(id, slices.get(id));
    dirty.delete(id);
  } catch (e) {
    console.warn('save failed', id, e);
    status('error');
    setTimeout(() => flush(id), 4000);   // retry
    pending--;
    return;
  }
  pending--;
  if (!dirty.size && pending === 0) status(navigator.onLine ? 'saved' : 'offline');
  maybeSnapshot();
}

export async function flushAll() {
  await Promise.all([...dirty].map(flush));
}

/* ---------- subscriptions ---------- */

export function subscribe(id, fn) {
  if (!subs.has(id)) subs.set(id, new Set());
  subs.get(id).add(fn);
  return () => subs.get(id).delete(fn);
}
function emit(id) { (subs.get(id) || []).forEach(fn => { try { fn(get(id)); } catch (e) { console.error(e); } }); }

/* ---------- snapshots ---------- */

export function everything() {
  const out = {};
  for (const [k, v] of slices) out[k] = v;
  return out;
}

async function maybeSnapshot() {
  if (Date.now() - lastSnapshot < SNAPSHOT_EVERY) return;
  lastSnapshot = Date.now();
  try { await B.writeSnapshot(everything(), 'auto'); } catch (e) { console.warn('snapshot failed', e); }
}

export async function snapshotNow(label = 'manual') {
  await flushAll();
  lastSnapshot = Date.now();
  return B.writeSnapshot(everything(), label);
}

export async function restoreSnapshot(at) {
  const data = await B.readSnapshot(at);
  if (!data) throw new Error('Snapshot not found');
  await B.writeSnapshot(everything(), 'pre-restore');
  for (const [k, v] of Object.entries(data)) {
    slices.set(k, v);
    dirty.add(k);
  }
  await flushAll();
  location.reload();
}

export function importAll(data) {
  for (const [k, v] of Object.entries(data)) { slices.set(k, v); dirty.add(k); }
  return flushAll();
}

/* ---------- lifecycle guards ---------- */

function installGuards() {
  const flushNow = () => { if (dirty.size) flushAll(); };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushNow();
  });
  window.addEventListener('pagehide', flushNow);
  window.addEventListener('blur', flushNow);
  window.addEventListener('beforeunload', (e) => {
    if (!dirty.size) return;
    flushNow();
    e.preventDefault();
    e.returnValue = '';
  });
  window.addEventListener('online',  () => { status(dirty.size ? 'saving' : 'saved'); flushNow(); });
  window.addEventListener('offline', () => status('offline'));

  // belt and braces: sweep every 5s in case a debounce was lost
  setInterval(() => { if (dirty.size) flushAll(); }, 5000);
}
installGuards();
