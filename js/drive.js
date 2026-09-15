/* ============================================================
   drive.js — files live in your own Google Drive

   Firebase Storage now wants a card on file. Drive does not, and
   you already sign in to Sid with Google. So: the app asks for
   one narrow extra permission — drive.file, which lets it touch
   only the files it creates and nothing else in your Drive — and
   uploads land in a folder you own, counting against your own
   15GB rather than anyone's bill.

   The catch, stated plainly: the Drive permission lasts about an
   hour. Refreshing it is a flash of a Google window, not a login.
   ============================================================ */

import { GOOGLE_CLIENT_ID } from './firebase-config.js';

const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const GIS = 'https://accounts.google.com/gsi/client';

export const HAS_DRIVE = !!GOOGLE_CLIENT_ID;

let token = null;          // { value, expires }
let client = null;
let gisReady = null;

/* ---------------------------------------------------------- */
/*  the token                                                  */
/* ---------------------------------------------------------- */

function loadGis() {
  if (gisReady) return gisReady;
  gisReady = new Promise((res, rej) => {
    if (window.google?.accounts?.oauth2) return res();
    const s = document.createElement('script');
    s.src = GIS; s.async = true; s.defer = true;
    s.onload = () => res();
    s.onerror = () => rej(new Error('Could not load Google sign-in. Check your connection.'));
    document.head.append(s);
  });
  return gisReady;
}

const fresh = () => token && token.expires > Date.now() + 60_000;

/**
 * A live Drive access token.
 * `interactive: false` tries the quiet path (no prompt) and fails
 * rather than throwing a window at you unasked; the upload button
 * then retries interactively, which is a user gesture and so is
 * never blocked as a popup.
 */
export async function getToken({ interactive = true } = {}) {
  if (!HAS_DRIVE) throw new Error('No Google client ID set. Settings → Appearance → Where files go.');
  if (fresh()) return token.value;

  await loadGis();

  if (!client) {
    client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPE,
      callback: () => {},                 // replaced per request below
    });
  }

  return new Promise((resolve, reject) => {
    client.callback = (resp) => {
      if (resp.error) {
        return reject(new Error(
          resp.error === 'popup_closed_by_user' || resp.error === 'access_denied'
            ? 'Drive permission was not granted.'
            : `Google returned: ${resp.error}`));
      }
      token = { value: resp.access_token, expires: Date.now() + (resp.expires_in || 3600) * 1000 };
      resolve(token.value);
    };
    try {
      /* '' means "do not ask again if you already said yes" — after
         the first consent this usually completes without a visible
         window at all */
      client.requestAccessToken({ prompt: interactive ? '' : 'none' });
    } catch (e) { reject(e); }
  });
}

export const tokenState = () => (fresh()
  ? { ok: true, minutes: Math.round((token.expires - Date.now()) / 60000) }
  : { ok: false, minutes: 0 });

export function forgetToken() { token = null; }

/* ---------------------------------------------------------- */
/*  the folder                                                 */
/* ---------------------------------------------------------- */

let folderId = null;

async function api(path, opts = {}, t) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    ...opts,
    headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json', ...(opts.headers || {}) },
  });
  if (!res.ok) {
    let msg = '';
    try { msg = (await res.json())?.error?.message || ''; } catch {}
    if (res.status === 401) { forgetToken(); throw new Error('The Drive permission expired — press upload again.'); }
    if (res.status === 403 && /storage quota/i.test(msg)) throw new Error('Your Google Drive is full.');
    throw new Error(msg || `Drive returned ${res.status}`);
  }
  return res.json();
}

/** The folder Sid puts things in. Created once, then remembered. */
export async function ensureFolder(name = 'Sid uploads') {
  if (folderId) return folderId;
  const t = await getToken();

  /* drive.file scope only sees what this app made, so this search
     can only ever find our own folder — which is the point */
  const q = encodeURIComponent(`name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const found = await api(`files?q=${q}&fields=files(id,name)&pageSize=1`, {}, t);
  if (found.files?.length) { folderId = found.files[0].id; return folderId; }

  const made = await api('files?fields=id', {
    method: 'POST',
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder' }),
  }, t);
  folderId = made.id;
  return folderId;
}

/* ---------------------------------------------------------- */
/*  upload                                                     */
/* ---------------------------------------------------------- */

/** A URL that renders in an <img>, for a Drive file id. */
export const thumbUrl = (id, w = 1200) => `https://drive.google.com/thumbnail?id=${id}&sz=w${w}`;
export const viewUrl = (id) => `https://drive.google.com/file/d/${id}/view`;

export async function uploadToDrive(file, pathHint = 'misc') {
  const t = await getToken();
  const parent = await ensureFolder();

  const meta = {
    name: `${pathHint.replace(/\//g, '-')}-${Date.now()}-${file.name}`.slice(0, 180),
    parents: [parent],
  };

  /* multipart: the JSON metadata and the bytes in one request */
  const boundary = 'sid' + Math.random().toString(36).slice(2);
  const body = new Blob([
    `--${boundary}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n`,
    JSON.stringify(meta),
    `\r\n--${boundary}\r\ncontent-type: ${file.type || 'application/octet-stream'}\r\n\r\n`,
    file,
    `\r\n--${boundary}--`,
  ]);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,mimeType',
    { method: 'POST', headers: { authorization: `Bearer ${t}`, 'content-type': `multipart/related; boundary=${boundary}` }, body });

  if (!res.ok) {
    let msg = '';
    try { msg = (await res.json())?.error?.message || ''; } catch {}
    if (res.status === 401) { forgetToken(); throw new Error('The Drive permission expired — press upload again.'); }
    throw new Error(msg || `Upload failed (${res.status})`);
  }
  const f = await res.json();

  /* Make it viewable by link, or the app cannot render its own
     upload. This is a real public link — fine for artwork you are
     about to post anyway, and said plainly in Settings. */
  let shared = false;
  try {
    await api(`files/${f.id}/permissions`, {
      method: 'POST',
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    }, t);
    shared = true;
  } catch { /* upload still succeeded; it just will not preview */ }

  const kind = (file.type || '').startsWith('video') ? 'video'
             : (file.type || '').startsWith('audio') ? 'audio' : 'image';

  return {
    id: f.id, kind, name: file.name, size: file.size,
    url: kind === 'image' ? thumbUrl(f.id) : viewUrl(f.id),
    open: viewUrl(f.id),
    driveId: f.id, shared, store: 'drive',
  };
}

export async function deleteFromDrive(media) {
  if (!media?.driveId) return;
  try {
    const t = await getToken({ interactive: false });
    await api(`files/${media.driveId}`, { method: 'DELETE' }, t);
  } catch { /* leaving a file in your own Drive is not an error worth shouting about */ }
}

/* ---------------------------------------------------------- */
/*  pasted links                                               */
/* ---------------------------------------------------------- */

/** Pull the file id out of any of the shapes a Drive link comes in. */
export function driveIdFrom(url) {
  const s = String(url || '');
  const m = s.match(/\/file\/d\/([A-Za-z0-9_-]{20,})/)
         || s.match(/[?&]id=([A-Za-z0-9_-]{20,})/)
         || s.match(/\/d\/([A-Za-z0-9_-]{20,})/);
  return m ? m[1] : '';
}

/**
 * Turn any pasted URL into a media item. A Drive link becomes a
 * previewable image; anything else is kept as a plain link, which
 * is the version that works with no permissions at all, forever.
 */
export function mediaFromUrl(url, name = '') {
  const u = String(url || '').trim();
  if (!u) return null;
  const id = driveIdFrom(u);
  const looksImage = /\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(u);
  const looksVideo = /\.(mp4|mov|webm|m4v)(\?|$)/i.test(u);

  if (id) {
    return { id: 'l' + id, kind: 'image', name: name || 'Drive file',
      url: thumbUrl(id), open: viewUrl(id), driveId: id, store: 'link', external: true };
  }
  return {
    id: 'l' + Math.random().toString(36).slice(2, 9),
    kind: looksVideo ? 'video' : looksImage ? 'image' : 'link',
    name: name || u.replace(/^https?:\/\//, '').slice(0, 40),
    url: u, open: u, store: 'link', external: true,
  };
}
