/* ============================================================
   backend.js — auth + persistence
   Two interchangeable backends behind one interface:
     • firebase : Google sign-in, Firestore, Storage, offline cache
     • local    : localStorage only (used until you paste keys)
   ============================================================ */

import { FIREBASE_CONFIG, ALLOWED_EMAILS, FIREBASE_VERSION as V } from './firebase-config.js';
import * as D from './drive.js';

const CDN = `https://www.gstatic.com/firebasejs/${V}`;

export const HAS_FIREBASE = !!(FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);
export const MODE = HAS_FIREBASE ? 'firebase' : 'local';

let fb = null;          // { app, auth, db, storage, fns… }
let currentUser = null;
let redirectError = '';
let degradedReason = '';

/** True when Firestore is running without its on-disk write queue. */
export const degraded = () => !!degradedReason;
export const degradedText = () => degradedReason;

/* ---------------------------------------------------------- */
/*  init                                                       */
/* ---------------------------------------------------------- */

export async function initBackend() {
  if (!HAS_FIREBASE) return;

  const [appM, authM, fsM, stM] = await Promise.all([
    import(`${CDN}/firebase-app.js`),
    import(`${CDN}/firebase-auth.js`),
    import(`${CDN}/firebase-firestore.js`),
    import(`${CDN}/firebase-storage.js`),
  ]);

  const app = appM.initializeApp(FIREBASE_CONFIG);
  const auth = authM.getAuth(app);

  /* Keep the session in localStorage rather than memory, so closing
     the tab or the installed app does not sign you out. */
  try { await authM.setPersistence(auth, authM.browserLocalPersistence); } catch {}

  /* If we came back from a redirect sign-in, collect the result.
     onAuthStateChanged usually fires on its own, but calling this
     surfaces the error when the redirect silently failed — which is
     what a login loop looks like from the outside. */
  try { await authM.getRedirectResult(auth); }
  catch (e) { redirectError = e.message || String(e); }

  /* Offline cache: edits made with no connection are queued and
     flushed automatically the moment the network returns.

     If this throws we fall back to a memory-only Firestore, where an
     unsent write dies with the tab. That fallback used to be silent,
     which is the worst possible combination — the app looked fine and
     the queue was gone. It is now recorded and shown. */
  let db;
  try {
    db = fsM.initializeFirestore(app, {
      localCache: fsM.persistentLocalCache({ tabManager: fsM.persistentMultipleTabManager() }),
    });
  } catch (e) {
    degradedReason = e?.message || String(e);
    db = fsM.getFirestore(app);
  }

  fb = {
    app, auth, db,
    storage: stM.getStorage(app),
    ...authM, ...fsM, ...stM,
  };
}

/* ---------------------------------------------------------- */
/*  auth                                                       */
/* ---------------------------------------------------------- */

export function onAuth(cb) {
  if (!HAS_FIREBASE) {
    currentUser = {
      uid: 'local',
      displayName: localStorage.getItem('sid.localName') || 'Local',
      email: '',
      photoURL: '',
      local: true,
    };
    setTimeout(() => cb(currentUser), 0);
    return () => {};
  }
  return fb.onAuthStateChanged(fb.auth, (u) => {
    if (u && ALLOWED_EMAILS.length && !ALLOWED_EMAILS.includes(u.email)) {
      fb.signOut(fb.auth);
      cb(null, 'This Google account is not allowed on this copy of Sid.');
      return;
    }
    currentUser = u;
    cb(u);
  });
}

/* Is the app running as an installed PWA rather than a browser tab? */
const standalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

export async function signIn() {
  if (!HAS_FIREBASE) return;
  const provider = new fb.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  /* Popup is the reliable path. Redirect sign-in breaks in current
     browsers whenever the Firebase auth domain is a different origin
     from the site — which it always is on GitHub Pages — because
     third-party storage is partitioned and the returning session is
     thrown away. That failure looks like a login loop: you sign in,
     you come back, and you are asked to sign in again.

     So: try the popup, and if it cannot open, say what to do rather
     than sending you into the loop. */
  try {
    await fb.signInWithPopup(fb.auth, provider);
    return;
  } catch (e) {
    const code = e.code || e.message || '';
    if (/cancelled|closed-by-user/i.test(code)) return;   // you changed your mind
    if (!/popup|blocked/i.test(code)) throw e;
  }

  throw new Error(standalone()
    ? 'Sign-in needs a popup, which an installed app cannot open. Open Sid in your normal browser, sign in there once, then reopen this app — the session carries over.'
    : 'Your browser blocked the sign-in popup. Allow popups for this site and try again.');
}

/** Set when a redirect sign-in came back empty-handed. */
export const lastRedirectError = () => redirectError;

export async function signOutNow() {
  if (HAS_FIREBASE) await fb.signOut(fb.auth);
  location.reload();
}

export const user = () => currentUser;

/* ---------------------------------------------------------- */
/*  slices  (one document per module)                          */
/* ---------------------------------------------------------- */

/*  The contract with store.js is deliberately explicit:
      loadSlice resolves to { ok, exists, v, at } and NEVER invents a
      value. "ok:false" means we do not know what the server holds —
      which the store treats as a reason to refuse to write, not as a
      reason to assume the server is empty. Returning a default here
      is how a blank app silently overwrites real data.              */

export async function loadSlice(id) {
  if (!HAS_FIREBASE) return { ok: true, exists: false, v: undefined, at: 0 };
  if (!currentUser) return { ok: false, error: new Error('not signed in') };
  try {
    const ref = fb.doc(fb.db, 'users', currentUser.uid, 'data', id);
    const snap = await fb.getDoc(ref);
    if (!snap.exists()) return { ok: true, exists: false, v: undefined, at: 0 };
    const d = snap.data() || {};
    if (d.v === undefined) return { ok: true, exists: false, v: undefined, at: 0 };
    return { ok: true, exists: true, v: d.v, at: Number(d.at) || 0 };
  } catch (e) {
    return { ok: false, exists: false, error: e };
  }
}

/* A Firestore document is capped at 1 MiB, and the cap counts field
   names as well as values. Finding out by watching setDoc reject on a
   loop is no good — the message is opaque and the retry never stops.
   Measure first and say the useful thing. */
const DOC_LIMIT = 1048576;
const SAFE_LIMIT = 900000;          // leave room for field-name overhead

/** Strip `undefined`, which Firestore rejects outright, and report it. */
function clean(v, path = '', found = []) {
  if (v === undefined) { found.push(path || '(root)'); return null; }
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map((x, i) => clean(x, `${path}[${i}]`, found));
  const out = {};
  for (const [k, x] of Object.entries(v)) out[k] = clean(x, path ? `${path}.${k}` : k, found);
  return out;
}

export function measure(value) {
  try { return new Blob([JSON.stringify(value)]).size; }
  catch { return 0; }
}

export async function saveSlice(id, value, at) {
  if (!HAS_FIREBASE) return;          // local.js is the store in local mode
  if (!currentUser) throw new Error('not signed in');

  const found = [];
  const v = clean(value, '', found);
  if (found.length) {
    console.warn('saveSlice: stripped undefined values in', id, found.slice(0, 5));
  }

  const size = measure(v);
  if (size > SAFE_LIMIT) {
    throw new Error(
      `"${id}" is ${(size / 1048576).toFixed(2)} MB, which exceeds the maximum ` +
      `${(DOC_LIMIT / 1048576).toFixed(0)} MB a single cloud record can hold. ` +
      `It is safe on this device. Remove some large attachments from that section, or export it.`);
  }

  const ref = fb.doc(fb.db, 'users', currentUser.uid, 'data', id);
  await fb.setDoc(ref, { v, at: Number(at) || Date.now() });
}

/* Live updates from other devices. The timestamp is passed through so
   the store can reject an out-of-order delivery instead of letting an
   older copy win just because it arrived later. */
export function watchSlice(id, cb) {
  if (!HAS_FIREBASE) return () => {};
  const ref = fb.doc(fb.db, 'users', currentUser.uid, 'data', id);
  return fb.onSnapshot(ref, { includeMetadataChanges: false }, (snap) => {
    if (!snap.exists()) return;
    if (snap.metadata.hasPendingWrites) return;   // our own echo
    if (snap.metadata.fromCache) return;          // not confirmed by the server
    const d = snap.data();
    if (d && d.v !== undefined) cb(d.v, Number(d.at) || 0);
  }, (e) => { console.warn('watch failed', id, e); });
}

/* ---------------------------------------------------------- */
/*  point-in-time snapshots  (the "backup" layer)              */
/* ---------------------------------------------------------- */

/* Local snapshots are local.js's job now. These are the cloud half. */

export async function writeSnapshot(all, label = 'auto') {
  if (!HAS_FIREBASE) return '';
  if (!currentUser) throw new Error('not signed in');
  const stamp = new Date().toISOString();

  /* A snapshot is the WHOLE app in one document, so it hits the 1 MiB
     cap long before any individual slice does. Left unchecked this
     failed silently every ten minutes — which is why there was nothing
     to restore from on the day it mattered. */
  const data = clean(all);
  const size = measure(data);
  if (size > SAFE_LIMIT) {
    throw new Error(
      `the whole-app snapshot is ${(size / 1048576).toFixed(2)} MB, over the ` +
      `${(DOC_LIMIT / 1048576).toFixed(0)} MB limit for one cloud record. ` +
      `Snapshots on this device are unaffected and still being taken; download a backup for anything longer-term.`);
  }

  await fb.setDoc(
    fb.doc(fb.db, 'users', currentUser.uid, 'snapshots', stamp),
    { at: stamp, label, data }
  );
  /* Pruning is best-effort and deliberately separate: a failure here
     must not make the caller think the snapshot itself failed. */
  thinCloud().catch(e => console.warn('snapshot prune failed', e));
  return stamp;
}

/* "Keep the 40 newest" covers under seven hours at one snapshot every
   ten minutes, so a long working session shredded every older copy —
   the backups you most want are the ones from before today. Keep
   recency AND depth: everything from the last two days, then one per
   day for a month, then one per week. Anything taken deliberately
   (manual, pre-restore, pre-erase) is never pruned. */
async function thinCloud() {
  const q = fb.query(
    fb.collection(fb.db, 'users', currentUser.uid, 'snapshots'),
    fb.orderBy('at', 'desc')
  );
  const snap = await fb.getDocs(q);
  const docs = snap.docs;
  if (docs.length < 30) return;

  const now = Date.now();
  const buckets = new Set();
  const drop = [];
  for (const d of docs) {
    const at = d.data().at;
    const label = d.data().label || '';
    const t = Date.parse(at);
    if (!Number.isFinite(t)) continue;
    if (/manual|session-open|pre-restore|pre-erase|pre-import/.test(label)) continue;
    const age = now - t;
    if (age < 2 * 864e5) continue;
    const key = age < 30 * 864e5 ? 'd' + Math.floor(t / 864e5) : 'w' + Math.floor(t / (7 * 864e5));
    if (buckets.has(key)) drop.push(d.ref); else buckets.add(key);
  }
  for (const ref of drop.slice(0, 50)) await fb.deleteDoc(ref);
}

export async function listSnapshots() {
  if (!HAS_FIREBASE) return [];
  if (!currentUser) throw new Error('not signed in');
  const q = fb.query(
    fb.collection(fb.db, 'users', currentUser.uid, 'snapshots'),
    fb.orderBy('at', 'desc')
  );
  const snap = await fb.getDocs(q);
  return snap.docs.map(d => ({ at: d.data().at, label: d.data().label }));
}

export async function readSnapshot(at) {
  if (!HAS_FIREBASE) return null;
  const snap = await fb.getDoc(fb.doc(fb.db, 'users', currentUser.uid, 'snapshots', at));
  return snap.exists() ? snap.data().data : null;
}

/* ---------------------------------------------------------- */
/*  media                                                      */
/* ---------------------------------------------------------- */

/* ---------- where uploaded files go ----------

   drive    — your own Google Drive, via the drive.file permission.
              Free, no card, counts against your 15GB.
   firebase — Firebase Storage. Seamless, but new projects need the
              Blaze plan, which needs a card on file.
   local    — this browser only. Instant, but does not reach your
              phone and dies with the site data.

   Kept in localStorage rather than a slice because uploads can
   happen before the slices have finished loading. */

export const STORAGE_MODES = [
  ['drive', 'My Google Drive'],
  ['firebase', 'Firebase Storage'],
  ['local', 'This device only'],
];

let storageMode = localStorage.getItem('sid.storage')
  || (D.HAS_DRIVE ? 'drive' : HAS_FIREBASE ? 'firebase' : 'local');

export const getStorageMode = () => storageMode;
export function setStorageMode(m) {
  storageMode = m;
  localStorage.setItem('sid.storage', m);
}
export const HAS_DRIVE = D.HAS_DRIVE;

/* A data URL is ~1.37x the file, and it is stored INSIDE a slice —
   which then has to fit in localStorage alongside everything else, and
   under the 1 MB cap on a single cloud record. 1.6 MB was enough for
   one photo to make a slice permanently unsyncable. */
const LOCAL_MEDIA_CAP = 500 * 1024;

export async function uploadMedia(file, pathHint = 'misc') {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const kind = file.type.startsWith('video') ? 'video'
             : file.type.startsWith('audio') ? 'audio' : 'image';

  if (storageMode === 'drive' && D.HAS_DRIVE) return D.uploadToDrive(file, pathHint);

  if (!HAS_FIREBASE || storageMode === 'local') {
    if (file.size > LOCAL_MEDIA_CAP) {
      throw new Error('Files kept on this device only must be under 500 KB — they are stored inside your data, so a large one stops that whole section syncing. Switch uploads to Google Drive or Firebase Storage in Settings for full-size files.');
    }
    const dataUrl = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    return { id, kind, name: file.name, size: file.size, url: dataUrl, local: true };
  }

  const path = `users/${currentUser.uid}/${pathHint}/${id}_${file.name.replace(/[^\w.\-]/g, '_')}`;
  const ref = fb.ref(fb.storage, path);
  try {
    await fb.uploadBytes(ref, file, { contentType: file.type });
    const url = await fb.getDownloadURL(ref);
    return { id, kind, name: file.name, size: file.size, url, path };
  } catch (e) {
    throw new Error(storageErrorText(e));
  }
}

/* Storage failures are all opaque one-liners from the SDK. Translate
   them into the thing you actually have to go and do. */
export function storageErrorText(e) {
  const code = String(e?.code || e?.message || e || '');
  if (/unauthorized|permission/i.test(code)) {
    return 'Storage refused the upload. In the Firebase console → Storage → Rules, publish the rules from storage.rules in this repo.';
  }
  if (/quota/i.test(code)) {
    return 'The Storage free quota for this project is used up for now.';
  }
  if (/unknown|retry-limit|object-not-found|bucket|404|cors/i.test(code)) {
    return 'Firebase Storage is not switched on for this project yet. Firebase console → Build → Storage → Get started (asia-south1), then publish the rules from storage.rules. Uploads work the moment that is done.';
  }
  if (/network|offline/i.test(code)) {
    return 'Upload failed — no connection. It will not queue; try again when you are back online.';
  }
  return e?.message || String(e);
}

/** The Firebase Storage version of the same check. */
async function firebaseSelfTest() {
  if (!HAS_FIREBASE) return { ok: false, text: 'Local mode — no Firebase keys, so uploads are stored in this browser only.' };
  try {
    const path = `users/${currentUser.uid}/_selftest/${Date.now()}.txt`;
    const ref = fb.ref(fb.storage, path);
    await fb.uploadBytes(ref, new Blob(['sid'], { type: 'text/plain' }), { contentType: 'text/plain' });
    const url = await fb.getDownloadURL(ref);
    try { await fb.deleteObject(ref); } catch {}
    return { ok: true, text: 'Storage is live — upload, download and delete all worked.', url };
  } catch (e) {
    return { ok: false, text: storageErrorText(e), code: String(e?.code || '') };
  }
}

export async function deleteMedia(media) {
  if (media?.store === 'link') return;              // just a pasted URL
  if (media?.driveId) return D.deleteFromDrive(media);
  if (!HAS_FIREBASE || !media?.path) return;
  try { await fb.deleteObject(fb.ref(fb.storage, media.path)); } catch {}
}

/** Prove the whole chosen path works, whatever it is. */
export async function storageSelfTest() {
  if (storageMode === 'drive') {
    if (!D.HAS_DRIVE) return { ok: false, text: 'No Google client ID set yet — the steps are below.' };
    try {
      const blob = new File([new Blob(['sid'])], 'sid-selftest.txt', { type: 'text/plain' });
      const m = await D.uploadToDrive(blob, 'selftest');
      await D.deleteFromDrive(m);
      return { ok: true, text: 'Drive is live — uploaded, shared and deleted a test file.' };
    } catch (e) { return { ok: false, text: e.message }; }
  }
  if (storageMode === 'local') {
    return { ok: true, text: 'Local mode — files are kept in this browser, under 500 KB each, and do not reach your phone.' };
  }
  return firebaseSelfTest();
}
