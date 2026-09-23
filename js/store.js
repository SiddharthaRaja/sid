/* ============================================================
   store.js — state, and the persistence engine under it

   The rule:

     YOUR WORK IS WRITTEN TO THIS DEVICE BEFORE IT IS SENT ANYWHERE,
     AND NOTHING IS EVER ALLOWED TO OVERWRITE A NEWER COPY.

   How that is actually enforced:
     • nothing is written anywhere until loadAll has finished, so a
       half-booted app can never push blanks over real data
     • every edit lands on this device within 150ms, and again
       synchronously the instant the tab is hidden or closed
     • the cloud is sync, not storage; a write unacknowledged after
       15s is treated as failed rather than awaited for ever
     • a slice whose server state could not be READ is never WRITTEN
     • a write that can never succeed (too large, malformed) is
       detected, stopped, and named — instead of retrying for ever
       behind a message that blames your connection
     • ordering uses a monotonic sequence as well as the clock, so a
       device with a wrong clock cannot win an argument
     • snapshots go to this device as well as the cloud, and are still
       taken when part of the app failed to load — labelled as partial
   ============================================================ */

import * as B from './backend.js';
import * as L from './local.js';
import * as J from './journal.js';
import * as F from './filebackup.js';

const SAVE_DEBOUNCE = 500;         // cloud write, after you stop typing
const LOCAL_DEBOUNCE = 150;        // device write, near-immediate
const LOCAL_MAX_WAIT = 1000;       // ...and never later than this
const SNAPSHOT_EVERY = 5 * 60 * 1000;
const CLOUD_TIMEOUT = 15000;
const MAX_CLOUD_ATTEMPTS = 8;      // before we stop and say why

const slices = new Map();          // id -> value
const stamps = new Map();          // id -> ms epoch of the value we hold
const defaults = new Map();        // id -> factory
const timers = new Map();          // id -> cloud debounce
const localTimers = new Map();     // id -> device debounce
const localSince = new Map();      // id -> when it first went dirty
const subs = new Map();
const dirty = new Set();           // needs a cloud write
const localDirty = new Set();      // needs a device write
const blocked = new Set();         // server state unknown — do not write
const stuck = new Map();           // id -> permanent reason, retries stopped
const failures = new Map();        // id -> consecutive failures
const inFlight = new Set();        // ids with a cloud write in progress
const requeue = new Set();         // ids that changed while a write was out
const lastTouched = new Set();     // edited since the last forced journal entry
const spills = new Set();          // device writes that went to IndexedDB

let lastSnapshot = 0;
let statusCb = () => {};
let pending = 0;
let booted = false;
let ready = false;                 // loadAll finished — writes allowed

export const onStatus = (fn) => { statusCb = fn; };
const status = (s) => statusCb(s);
export const isReady = () => ready;

/* Things the user must be told, rather than a spinner that lies. */
export const health = {
  cloud: 'ok',        // ok | stalled | failing | stuck | blocked | local-only
  detail: '',
  blocked: [],
  stuck: [],
};
function setHealth(cloud, detail) {
  health.cloud = cloud;
  health.detail = detail || '';
  health.blocked = [...blocked];
  health.stuck = [...stuck.keys()];
  try { window.dispatchEvent(new CustomEvent('sid-health', { detail: health })); } catch {}
}

function recomputeHealth() {
  if (!B.HAS_FIREBASE) return setHealth('local-only', 'No Firebase keys — this device only.');
  if (stuck.size) {
    const [id, why] = [...stuck.entries()][0];
    return setHealth('stuck',
      `"${id}" cannot be saved to the cloud: ${why} This will NOT fix itself — your work is safe on this device, but download a backup now.`);
  }
  if (blocked.size) {
    return setHealth('blocked',
      `Could not read ${blocked.size} section${blocked.size > 1 ? 's' : ''} from the cloud. Editing is safe on this device, but nothing is being synced — so your cloud copy cannot be overwritten by mistake. Reload when the connection is back.`);
  }
  if (failures.size) {
    const worst = Math.max(...failures.values());
    return setHealth(worst >= 3 ? 'failing' : 'stalled',
      worst >= 3
        ? 'Saves to the cloud are not going through. Your work is safe on this device and will sync when the connection recovers — but download a backup if you are about to switch devices.'
        : 'A cloud save did not go through. Retrying.');
  }
  if (B.degraded()) {
    return setHealth('stalled', 'The offline cache could not start, so cloud saves have no queue behind them. Your work is still written to this device.');
  }
  setHealth('ok');
}

/* ---------- registration ---------- */

export function register(id, factory) { defaults.set(id, factory); }

const fallbackFor = (id) => (defaults.get(id) || (() => ({})))();

/* A timestamp from another device is only trustworthy if it is not in
   the future. A phone with a fast clock — a battery pull, a timezone
   fixed by changing the clock — writes a stamp that would otherwise
   beat every correct copy for ever, and beat it hard enough to
   overwrite the device mirror that exists to prevent exactly this. */
const SKEW_GRACE = 5 * 60 * 1000;
function plausible(at) { return at > 0 && at <= Date.now() + SKEW_GRACE; }

/**
 * Load every slice, merging device and cloud.
 *
 * Safe to call more than once — onAuthStateChanged fires again on
 * every token refresh, and the old version reloaded from the server
 * each time, discarding unsaved edits sitting in memory.
 */
export async function loadAll(ids) {
  if (booted) return;
  booted = true;

  try {
    L.setNamespace(B.user()?.uid);
    J.setNamespace(B.user()?.uid);
    F.restore().catch(() => {});
    L.requestPersistence().catch(() => {});
    L.migrateLegacySnapshots().catch(() => {});

    await Promise.all(ids.map(id => loadOne(id)));
    watchOtherTabs();
    lastSnapshot = Date.now();
  } catch (e) {
    /* The caller shows this and stops. Crucially `booted` goes back to
       false: leaving it true meant the NEXT auth callback skipped
       loadAll entirely and ran the app over empty slices — which then
       seeded defaults and wrote them to the cloud. That is the exact
       catastrophe this file exists to prevent. */
    booted = false;
    ready = false;
    throw e;
  }

  ready = true;
  recomputeHealth();
  status(dirty.size ? 'saving' : 'saved');
}

async function loadOne(id) {
  const fallback = fallbackFor(id);

  let local = null;
  try { local = await L.readSliceFull(id); } catch {}

  let remote = { ok: false };
  try { remote = await B.loadSlice(id); } catch (e) { remote = { ok: false, error: e }; }

  const localAt = local ? local.at : -1;
  const remoteAt = remote.ok && remote.at ? remote.at : -1;

  if (!remote.ok) {
    /* We do not know what the server holds. Show whatever this device
       has, but REFUSE to write.

       The subtle version of this was the dangerous one: when the read
       failed and the device happened to have a copy, the old code
       used the local copy and left the slice unblocked — so the very
       next keystroke pushed a possibly-stale local copy over server
       data it had never managed to read. */
    if (local && local.v != null) {
      slices.set(id, migrate(local.v, fallback));
      stamps.set(id, localAt > 0 ? localAt : Date.now());
    } else {
      slices.set(id, fallback);
      stamps.set(id, 0);
    }
    L.noteSeen(id, local);
    blocked.add(id);
    return;
  }

  if (remote.exists && remoteAt > localAt && plausible(remoteAt)) {
    slices.set(id, migrate(remote.v, fallback));
    stamps.set(id, remoteAt);
    L.noteSeen(id, L.writeSlice(id, slices.get(id), remoteAt));
  } else if (remote.exists && remoteAt > localAt && local && local.v != null) {
    /* The cloud claims to be newer, but its stamp is in the future, so
       the claim is not believable. Keep this device's copy and say so
       rather than silently discarding real work. */
    slices.set(id, migrate(local.v, fallback));
    stamps.set(id, localAt > 0 ? localAt : Date.now());
    L.noteSeen(id, local);
    L.problem(`The cloud copy of "${id}" is dated in the future, so this device's copy was kept. Check the clock on your other device — Settings → Backup has a snapshot of both.`);
    keepRemoteAside(id, remote.v);
  } else if (local && local.v != null) {
    /* Ties go to the DEVICE. The device copy is the one that was never
       confirmed as transmitted, so it is the one with something to
       lose. */
    slices.set(id, migrate(local.v, fallback));
    stamps.set(id, localAt > 0 ? localAt : Date.now());
    L.noteSeen(id, local);
    if (remoteAt < localAt) queueCloud(id);     // bring the cloud forward
  } else if (remote.exists) {
    slices.set(id, migrate(remote.v, fallback));
    /* Clamp an implausible stamp. With no local copy we have to take
       the cloud's word for the DATA, but adopting a stamp a day in the
       future would make every later edit on this device look older
       than it, for a day. */
    const at = plausible(remoteAt) ? remoteAt : Date.now();
    if (!plausible(remoteAt) && remoteAt > 0) {
      L.problem(`The cloud copy of "${id}" is dated in the future — check the clock on your other device.`);
    }
    stamps.set(id, at);
    L.noteSeen(id, L.writeSlice(id, slices.get(id), at));
  } else {
    slices.set(id, fallback);
    stamps.set(id, Date.now());
  }

  B.watchSlice(id, (remoteV, remoteStamp) => {
    if (dirty.has(id) || localDirty.has(id) || inFlight.has(id)) return;  // local edit wins
    const held = stamps.get(id) || 0;
    if (remoteStamp && remoteStamp <= held) return;                       // stale echo
    if (remoteStamp && !plausible(remoteStamp)) {                         // wrong clock
      L.problem(`An update to "${id}" arrived dated in the future and was ignored. Check the clock on your other device.`);
      return;
    }
    const merged = migrate(remoteV, fallbackFor(id));
    const cur = slices.get(id);
    slices.set(id, cur === undefined ? merged : reconcile(cur, merged));
    stamps.set(id, remoteStamp || Date.now());
    L.noteSeen(id, L.writeSlice(id, slices.get(id), stamps.get(id)));
    emit(id);
  });
}

/* Never throw away a copy we declined to use — park it as a snapshot
   so both versions survive the disagreement. */
function keepRemoteAside(id, v) {
  L.writeSnapshot({ [id]: v }, 'declined:' + id).catch(() => {});
}

/* Another tab of this app just wrote. Pull it in rather than drifting
   apart until one of us flattens the other. */
function watchOtherTabs() {
  L.onOtherTabWrite(async (id, rec) => {
    if (!slices.has(id)) return;
    if (dirty.has(id) || localDirty.has(id)) return;
    let v = rec.v;
    if (rec.spilled) { const full = await L.readSliceFull(id); if (!full) return; v = full.v; }
    if (v == null) return;
    const merged = migrate(v, fallbackFor(id));
    slices.set(id, reconcile(slices.get(id), merged));
    stamps.set(id, rec.at);
    emit(id);
  });
}

/**
 * Copy `next` into `cur` WITHOUT replacing objects that already exist.
 *
 * Every module does `const st = S.get('notes')` once at render and
 * writes through that reference. If a synced update replaced the slice
 * with a fresh object, the page would still be holding the old one:
 * you would keep typing into a detached object, the pill would say
 * "saved", and every word after that moment would be gone on reload.
 */
function reconcile(cur, next) {
  if (cur === next) return cur;
  if (!cur || !next || typeof cur !== 'object' || typeof next !== 'object') return next;
  if (Array.isArray(cur) !== Array.isArray(next)) return next;

  if (Array.isArray(cur)) {
    const byId = new Map();
    for (const it of cur) {
      const k = it && typeof it === 'object' ? (it.id ?? it.key ?? null) : null;
      if (k != null && !byId.has(k)) byId.set(k, it);
    }
    const out = next.map((it) => {
      const k = it && typeof it === 'object' ? (it.id ?? it.key ?? null) : null;
      if (k == null) return it;
      const old = byId.get(k);
      if (!old) return it;
      /* Consume it. Two records sharing an id would otherwise both
         resolve to the SAME object — editing one row would edit the
         other, and deleting one would leave a ghost. */
      byId.delete(k);
      return reconcile(old, it);
    });
    cur.length = 0;
    for (const it of out) cur.push(it);
    return cur;
  }

  for (const k of Object.keys(cur)) if (!(k in next)) delete cur[k];
  for (const k of Object.keys(next)) cur[k] = reconcile(cur[k], next[k]);
  return cur;
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
  if (!slices.has(id)) { slices.set(id, fallbackFor(id)); stamps.set(id, 0); }
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
  /* A caller that forgets its slice id used to do real damage: it put
     `undefined` in the dirty set, which never cleared, so the status
     never returned to "saved", the leave-page warning fired for ever,
     and the app showed a permanent red "saves are failing" banner —
     drowning out the warning that was supposed to mean something.
     Meanwhile the edit itself was never saved. Refuse it, loudly. */
  if (!id || !defaults.has(id)) {
    console.error('store.touch(): ignoring unknown slice id', id,
      '— an edit somewhere is not being saved. This is a bug, please report it.');
    return;
  }

  /* Nothing may be written before the app has finished loading. An
     edit made on the sign-in screen, or during a failed boot, would
     otherwise be written into the wrong account's storage and then
     overwritten the moment the real data arrives. */
  if (!ready) {
    console.warn('store: edit to', id, 'before load finished — held in memory only');
    return;
  }

  stamps.set(id, Date.now());

  /* The device write. This is the one that actually protects you, so
     it runs first and on a much shorter fuse than the cloud write. */
  localDirty.add(id);
  lastTouched.add(id);
  if (!localSince.has(id)) localSince.set(id, Date.now());
  clearTimeout(localTimers.get(id));
  /* Per-slice, and capped: a single shared debounce reset on every
     keystroke could be starved indefinitely while you type. */
  const waited = Date.now() - localSince.get(id);
  const delay = waited >= LOCAL_MAX_WAIT ? 0 : Math.min(LOCAL_DEBOUNCE, LOCAL_MAX_WAIT - waited);
  localTimers.set(id, setTimeout(() => flushLocal(id), delay));

  if (!blocked.has(id) && !stuck.has(id)) queueCloud(id);
}

function queueCloud(id) {
  dirty.add(id);
  status('saving');
  clearTimeout(timers.get(id));
  timers.set(id, setTimeout(() => flush(id), SAVE_DEBOUNCE));
}

/** Write pending slices to this device. Synchronous. */
export function flushLocal(only) {
  const ids = only ? (localDirty.has(only) ? [only] : []) : [...localDirty];
  for (const id of ids) {
    clearTimeout(localTimers.get(id));
    localTimers.delete(id);
    localSince.delete(id);
    localDirty.delete(id);
    const res = L.writeSlice(id, slices.get(id), stamps.get(id) || Date.now());

    /* The append-only copy. It never overwrites anything, so a bug in
       the line above cannot damage the history it has already
       written. Throttled inside the journal to one copy a minute per
       section while you are actively editing. */
    J.record(id, slices.get(id)).catch(() => {});
    /* A slice too large for localStorage goes to IndexedDB instead,
       which is asynchronous — so the "it has already happened by the
       time this returns" guarantee does NOT hold for that one. Track
       the promise so flushAll can wait for it. */
    if (res && res.settled) {
      spills.add(res.settled);
      res.settled.finally(() => spills.delete(res.settled));
    }
  }
}

/** Device writes still in flight because they had to spill. */
export const pendingSpills = () => spills.size;

/* Firestore's setDoc resolves on server acknowledgement and has no
   timeout of its own, so a stalled write queue produces a promise that
   never settles. Everything downstream waited on that promise. */
function withTimeout(p, ms, label) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error(label)), ms);
    p.then(v => { clearTimeout(t); res(v); }, e => { clearTimeout(t); rej(e); });
  });
}

/* Some failures will never succeed however many times you try. Saying
   "will sync when the connection recovers" about one of those is the
   same lie that cost three hours of writing. */
function permanentReason(e, id) {
  const msg = String(e?.code || e?.message || e || '');
  if (/longer than|exceeds the maximum|1048576|too large|invalid-argument/i.test(msg)) {
    return 'it is larger than the 1 MB a single cloud record can hold.';
  }
  if (/Unsupported field value: undefined|undefined/i.test(msg) && !/timeout/i.test(msg)) {
    return 'it contains a value the cloud cannot store.';
  }
  if (/permission-denied|insufficient permissions/i.test(msg)) {
    return 'the cloud refused permission for this account.';
  }
  if (/unauthenticated/i.test(msg)) {
    return 'you are signed out.';
  }
  return null;
}

async function flush(id) {
  if (!dirty.has(id) || blocked.has(id) || stuck.has(id)) return;
  /* Without this guard every 5-second sweep, blur, visibilitychange
     and retry timer started ANOTHER never-terminating retry chain for
     the same slice. Ten minutes offline meant a hundred-odd concurrent
     chains, which also defeated the exponential backoff. */
  if (inFlight.has(id)) { requeue.add(id); return; }

  inFlight.add(id);
  clearTimeout(timers.get(id));
  flushLocal(id);                    // device first, always
  pending++;

  const sentAt = stamps.get(id);
  const sentSeq = L.currentSeq();
  try {
    await withTimeout(B.saveSlice(id, slices.get(id), sentAt), CLOUD_TIMEOUT, 'timeout');
    /* Only clear the flag if nothing changed while we were away.
       Comparing the sequence as well as the timestamp catches an edit
       made inside the same millisecond, which the timestamp alone
       would miss — and that edit would then never reach the cloud. */
    if (stamps.get(id) === sentAt && L.currentSeq() === sentSeq) dirty.delete(id);
    failures.delete(id);
  } catch (e) {
    const why = permanentReason(e, id);
    if (why) {
      stuck.set(id, why);
      dirty.delete(id);              // stop the loop; local copy stands
      console.error('cloud save permanently failed', id, e);
    } else {
      const n = (failures.get(id) || 0) + 1;
      failures.set(id, n);
      console.warn('cloud save failed', id, n, e);
      status('error');
      if (n >= MAX_CLOUD_ATTEMPTS) {
        stuck.set(id, `${n} attempts failed (${e.message || e}).`);
        dirty.delete(id);
      } else {
        const wait = Math.min(60000, 3000 * Math.pow(2, Math.min(n - 1, 4)));
        setTimeout(() => flush(id), wait);
      }
    }
  } finally {
    inFlight.delete(id);
    pending--;
  }

  /* Edits that arrived while this write was out, or a write that came
     back stale, go round again immediately. Leaving them to the
     five-second sweep meant the newest text sat unsent for seconds
     longer than it needed to. */
  const again = requeue.delete(id) | 0;
  if ((again || dirty.has(id)) && !blocked.has(id) && !stuck.has(id)) {
    clearTimeout(timers.get(id));
    timers.set(id, setTimeout(() => flush(id), 250));
  }

  recomputeHealth();
  if (!dirty.size && pending === 0) status(navigator.onLine ? 'saved' : 'offline');
  maybeSnapshot();
}

/** Ask the cloud again for anything that stopped. */
export function retryStuck() {
  const ids = [...stuck.keys()];
  stuck.clear();
  failures.clear();
  ids.forEach(id => { if (slices.has(id)) queueCloud(id); });
  recomputeHealth();
  return ids.length;
}

export const pendingCount = () => dirty.size;

export async function flushAll() {
  flushLocal();
  await Promise.allSettled([...spills]);        // oversized device writes
  await Promise.allSettled([...dirty].map(flush));
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
  if (!ready || !slices.size) return;
  lastSnapshot = Date.now();
  const all = everything();
  const partial = blocked.size > 0;

  /* The device copy is taken even when part of the app failed to load.
     Refusing to snapshot at all for eight hours because one section
     was unreadable is strictly worse than keeping one that says so —
     and that is what the old code did, silently, all day. */
  try { await L.writeSnapshot(all, partial ? 'auto-partial' : 'auto'); }
  catch (e) { L.problem('A snapshot could not be saved on this device: ' + (e.message || e)); }

  /* The file on your own computer, if you connected one. Outside the
     browser's storage entirely, so clearing site data does not touch
     it. */
  if (!partial) F.write(all).catch(() => {});

  /* The cloud copy is not, because a partial state written there can
     be read back by another device as the truth. */
  if (!partial && B.HAS_FIREBASE && !stuck.size) {
    try { await withTimeout(B.writeSnapshot(all, 'auto'), CLOUD_TIMEOUT, 'timeout'); }
    catch (e) { console.warn('cloud snapshot failed', e); }
  }
}

export async function snapshotNow(label = 'manual') {
  flushLocal();
  if (!slices.size) throw new Error('Nothing loaded yet.');
  const all = everything();
  const partial = blocked.size > 0;
  lastSnapshot = Date.now();

  let localErr = null, cloudErr = null;
  try { await L.writeSnapshot(all, partial ? label + '-partial' : label); }
  catch (e) { localErr = e; }

  try { await flushAll(); } catch {}
  if (B.HAS_FIREBASE && !partial) {
    try { await withTimeout(B.writeSnapshot(all, label), CLOUD_TIMEOUT, 'timeout'); }
    catch (e) { cloudErr = e; }
  } else if (partial) {
    cloudErr = new Error('skipped — some sections could not be read from the cloud, so a cloud snapshot would record them as empty.');
  }

  if (localErr && cloudErr) throw localErr;
  return {
    localOk: !localErr,
    localErr: localErr ? (localErr.message || String(localErr)) : null,
    cloudErr: cloudErr ? (cloudErr.message || String(cloudErr)) : null,
    partial,
  };
}

/**
 * Every snapshot from both places, newest first.
 *
 * Errors are RETURNED, never swallowed. The old code caught them and
 * rendered an empty list, so "the read failed" and "you have no
 * backups" looked identical — which is the difference between knowing
 * you can recover and believing you cannot.
 */
export async function listSnapshots() {
  const rows = [];
  const errors = [];
  const [dev, cloud] = await Promise.allSettled([
    L.listSnapshots(),
    B.HAS_FIREBASE ? B.listSnapshots() : Promise.resolve([]),
  ]);
  if (dev.status === 'fulfilled') rows.push(...dev.value);
  else errors.push('This device: ' + (dev.reason?.message || dev.reason));
  if (cloud.status === 'fulfilled') rows.push(...cloud.value.map(s => ({ ...s, key: s.at, where: 'cloud' })));
  else errors.push('Cloud: ' + (cloud.reason?.message || cloud.reason));
  rows.sort((a, b) => (a.at < b.at ? 1 : -1));
  return { rows, errors };
}

export async function restoreSnapshot(key, where = 'device') {
  const data = where === 'cloud' ? await B.readSnapshot(key) : await L.readSnapshot(key);
  if (!data) throw new Error('That snapshot could not be read.');

  /* The safety copy goes on THIS DEVICE first. The old code wrote it
     to the cloud only — so a restore done because the cloud was
     misbehaving had no undo. */
  try { await J.recordAll(everything(), 'pre-restore'); } catch {}
  try { await L.writeSnapshot(everything(), 'pre-restore'); }
  catch (e) { throw new Error('Refusing to restore: the undo snapshot could not be saved on this device (' + (e.message || e) + ').'); }
  try { if (B.HAS_FIREBASE && !blocked.size) await withTimeout(B.writeSnapshot(everything(), 'pre-restore'), CLOUD_TIMEOUT, 'timeout'); } catch {}

  const now = Date.now();
  for (const [k, v] of Object.entries(data)) {
    if (!defaults.has(k) || v == null) continue;
    const cur = slices.get(k);
    slices.set(k, cur === undefined ? v : reconcile(cur, v));
    stamps.set(k, now);
    stuck.delete(k);
    localDirty.add(k);
    if (!blocked.has(k)) dirty.add(k);
  }
  flushLocal();                       // durable before the reload
  try { await flushAll(); } catch {}
  location.reload();
}

/* ---------- import ---------- */

/* How much is actually IN a value. `{ items: [] }` has one key and no
   content — counting keys would call that section full and let it
   overwrite a section that has your work in it without a word. */
function weigh(v, depth = 0) {
  if (v == null || v === '' || v === false) return 0;
  if (depth > 6) return 1;
  if (Array.isArray(v)) return v.reduce((n, x) => n + weigh(x, depth + 1), 0);
  if (typeof v === 'object') return Object.values(v).reduce((n, x) => n + weigh(x, depth + 1), 0);
  return 1;
}

/** What an import file would actually do, before you agree to it. */
export function inspectImport(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, reason: 'That file is not a Sid backup — the top level should be an object of sections.' };
  }
  const known = [], unknown = [], empty = [], bad = [], skippedBlocked = [];
  for (const [k, v] of Object.entries(data)) {
    if (!defaults.has(k)) { unknown.push(k); continue; }
    if (v == null) { bad.push(k); continue; }
    const shape = fallbackFor(k);
    if (typeof v !== 'object' || Array.isArray(shape) !== Array.isArray(v)) { bad.push(k); continue; }
    if (blocked.has(k)) { skippedBlocked.push(k); continue; }
    known.push(k);
    if (!weigh(v)) empty.push(k);
  }
  if (!known.length) {
    return { ok: false, reason: skippedBlocked.length
      ? 'Those sections cannot be read from the cloud right now, so importing over them is not safe. Reload when the connection is back.'
      : 'No recognisable sections in that file.' };
  }
  return { ok: true, known, unknown, empty, bad, skippedBlocked };
}

export async function importAll(data) {
  const check = inspectImport(data);
  if (!check.ok) throw new Error(check.reason);

  try { await J.recordAll(everything(), 'pre-import'); } catch {}
  try { await L.writeSnapshot(everything(), 'pre-import'); }
  catch (e) { throw new Error('Refusing to import: the undo snapshot could not be saved on this device (' + (e.message || e) + ').'); }

  const now = Date.now();
  for (const k of check.known) {
    const v = data[k];
    const cur = slices.get(k);
    slices.set(k, cur === undefined ? v : reconcile(cur, v));
    stamps.set(k, now);
    stuck.delete(k);
    localDirty.add(k);
    dirty.add(k);
  }
  flushLocal();
  recomputeHealth();
  return flushAll();
}

/* ---------- lifecycle guards ---------- */

function installGuards() {
  /* Synchronous device write on every path out of the page. These fire
     before the tab is discarded; an async cloud write at this point is
     killed mid-flight, which is why it can no longer be the only thing
     between you and losing the session. */
  const hardSave = () => {
    try { flushLocal(); } catch (e) { console.error(e); }
    /* One forced journal entry per section that was in flight, so the
       last thing you typed before closing is in the append-only log
       whatever else happens. */
    try { for (const id of lastTouched) J.record(id, slices.get(id), { force: true, label: 'leaving' }).catch(() => {}); lastTouched.clear(); }
    catch (e) { console.error(e); }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { hardSave(); if (dirty.size) flushAll(); }
  });
  window.addEventListener('pagehide', hardSave);
  window.addEventListener('freeze', hardSave);
  window.addEventListener('blur', () => { hardSave(); if (dirty.size) flushAll(); });
  window.addEventListener('beforeunload', (e) => {
    hardSave();
    /* Only warn about work that is genuinely still in flight. A slice
       that can never be written would otherwise produce an
       unavoidable "leave site?" prompt on every single navigation,
       for ever. */
    if (!dirty.size) return;
    e.preventDefault();
    e.returnValue = '';
  });
  window.addEventListener('online',  () => { status(dirty.size ? 'saving' : 'saved'); if (dirty.size) flushAll(); });
  window.addEventListener('offline', () => status('offline'));

  setInterval(() => { hardSave(); if (dirty.size) flushAll(); }, 5000);
  setInterval(() => { maybeSnapshot(); }, 60000);
}
installGuards();

/* ---------- diagnostics ---------- */

export function diagnose() {
  return {
    ready,
    slices: [...slices.keys()],
    dirty: [...dirty],
    localDirty: [...localDirty],
    blocked: [...blocked],
    stuck: Object.fromEntries(stuck),
    failures: Object.fromEntries(failures),
    inFlight: [...inFlight],
    seq: L.currentSeq(),
    namespace: L.namespace(),
    otherAccountsOnDevice: L.knownNamespaces().filter(n => n !== L.namespace()),
    health: { ...health },
    storageProblems: [...L.problems],
  };
}
