/* ============================================================
   backend.js — auth + persistence
   Two interchangeable backends behind one interface:
     • firebase : Google sign-in, Firestore, Storage, offline cache
     • local    : localStorage only (used until you paste keys)
   ============================================================ */

import { FIREBASE_CONFIG, ALLOWED_EMAILS, FIREBASE_VERSION as V } from './firebase-config.js';

const CDN = `https://www.gstatic.com/firebasejs/${V}`;

export const HAS_FIREBASE = !!(FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);
export const MODE = HAS_FIREBASE ? 'firebase' : 'local';

let fb = null;          // { app, auth, db, storage, fns… }
let currentUser = null;
let redirectError = '';

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

  // Offline cache: edits made with no connection are queued and
  // flushed automatically the moment the network returns.
  let db;
  try {
    db = fsM.initializeFirestore(app, {
      localCache: fsM.persistentLocalCache({ tabManager: fsM.persistentMultipleTabManager() }),
    });
  } catch {
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

const lkey = (id) => `sid.slice.${id}`;

export async function loadSlice(id, fallback) {
  if (!HAS_FIREBASE) {
    try {
      const raw = localStorage.getItem(lkey(id));
      return raw ? JSON.parse(raw) : structuredClone(fallback);
    } catch { return structuredClone(fallback); }
  }
  const ref = fb.doc(fb.db, 'users', currentUser.uid, 'data', id);
  const snap = await fb.getDoc(ref);
  if (!snap.exists()) return structuredClone(fallback);
  const d = snap.data();
  return d && d.v !== undefined ? d.v : structuredClone(fallback);
}

export async function saveSlice(id, value) {
  if (!HAS_FIREBASE) {
    localStorage.setItem(lkey(id), JSON.stringify(value));
    return;
  }
  const ref = fb.doc(fb.db, 'users', currentUser.uid, 'data', id);
  await fb.setDoc(ref, { v: value, at: Date.now() });
}

/* Live updates from other devices. */
export function watchSlice(id, cb) {
  if (!HAS_FIREBASE) return () => {};
  const ref = fb.doc(fb.db, 'users', currentUser.uid, 'data', id);
  return fb.onSnapshot(ref, { includeMetadataChanges: false }, (snap) => {
    if (!snap.exists()) return;
    if (snap.metadata.hasPendingWrites) return;   // our own echo
    const d = snap.data();
    if (d && d.v !== undefined) cb(d.v);
  }, () => {});
}

/* ---------------------------------------------------------- */
/*  point-in-time snapshots  (the "backup" layer)              */
/* ---------------------------------------------------------- */

export async function writeSnapshot(all, label = 'auto') {
  const stamp = new Date().toISOString();
  if (!HAS_FIREBASE) {
    const keep = JSON.parse(localStorage.getItem('sid.snaps') || '[]');
    keep.unshift({ at: stamp, label, data: all });
    localStorage.setItem('sid.snaps', JSON.stringify(keep.slice(0, 12)));
    return stamp;
  }
  await fb.setDoc(
    fb.doc(fb.db, 'users', currentUser.uid, 'snapshots', stamp),
    { at: stamp, label, data: all }
  );
  // prune to the 40 most recent
  const q = fb.query(
    fb.collection(fb.db, 'users', currentUser.uid, 'snapshots'),
    fb.orderBy('at', 'desc')
  );
  const snap = await fb.getDocs(q);
  const docs = snap.docs;
  for (let i = 40; i < docs.length; i++) await fb.deleteDoc(docs[i].ref);
  return stamp;
}

export async function listSnapshots() {
  if (!HAS_FIREBASE) {
    return JSON.parse(localStorage.getItem('sid.snaps') || '[]')
      .map(s => ({ at: s.at, label: s.label }));
  }
  const q = fb.query(
    fb.collection(fb.db, 'users', currentUser.uid, 'snapshots'),
    fb.orderBy('at', 'desc')
  );
  const snap = await fb.getDocs(q);
  return snap.docs.map(d => ({ at: d.data().at, label: d.data().label }));
}

export async function readSnapshot(at) {
  if (!HAS_FIREBASE) {
    return (JSON.parse(localStorage.getItem('sid.snaps') || '[]')
      .find(s => s.at === at) || {}).data || null;
  }
  const snap = await fb.getDoc(fb.doc(fb.db, 'users', currentUser.uid, 'snapshots', at));
  return snap.exists() ? snap.data().data : null;
}

/* ---------------------------------------------------------- */
/*  media                                                      */
/* ---------------------------------------------------------- */

const LOCAL_MEDIA_CAP = 1.6 * 1024 * 1024;   // keep localStorage sane

export async function uploadMedia(file, pathHint = 'misc') {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const kind = file.type.startsWith('video') ? 'video'
             : file.type.startsWith('audio') ? 'audio' : 'image';

  if (!HAS_FIREBASE) {
    if (file.size > LOCAL_MEDIA_CAP) {
      throw new Error('In local mode files must be under 1.6 MB. Connect Firebase for full-size uploads.');
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
  await fb.uploadBytes(ref, file, { contentType: file.type });
  const url = await fb.getDownloadURL(ref);
  return { id, kind, name: file.name, size: file.size, url, path };
}

export async function deleteMedia(media) {
  if (!HAS_FIREBASE || !media?.path) return;
  try { await fb.deleteObject(fb.ref(fb.storage, media.path)); } catch {}
}
