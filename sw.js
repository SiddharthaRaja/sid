/* ============================================================
   sw.js — offline shell
   App files are cached and served network-first so you always
   get the newest build when online, and the app still opens
   when you are not. Firebase traffic is never cached — its own
   offline layer handles that.
   ============================================================ */

const VERSION = 'sid-v6';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './css/app.css',
  './js/app.js', './js/store.js', './js/backend.js', './js/ui.js', './js/icons.js',
  './js/charts.js', './js/agenda.js', './js/firebase-config.js',
  './js/data/platforms.js', './js/data/info.js', './js/data/masterplan.js',
  './js/data/radio.js', './js/data/rights.js', './js/data/finance.js', './js/data/video.js',
  './js/data/templates.js', './js/data/contacts.js', './js/data/ads.js', './js/data/assets.js',
  './js/modules/dashboard.js', './js/modules/calendar.js', './js/modules/plan.js',
  './js/modules/platform.js', './js/modules/shared.js', './js/modules/stats.js',
  './js/modules/radio.js', './js/modules/rights.js', './js/modules/finance.js',
  './js/modules/video.js', './js/modules/notes.js', './js/modules/settings.js',
  './js/modules/copy.js', './js/modules/contacts.js',
  './js/modules/queue.js', './js/modules/ads.js', './js/modules/epk.js',
  './js/modules/assets.js', './js/modules/review.js',
  './js/reader.js', './js/modules/history.js', './js/ics.js',
  './js/modules/calexport.js', './js/modules/meta.js', './js/modules/inbox.js',
  './js/modules/links.js', './js/modules/pitch.js', './js/data/meta.js', './js/data/pitch.js',
  './js/data/history/a1.js', './js/data/history/a2.js', './js/data/history/a3.js', './js/data/history/a4.js', './js/data/history/a5.js', './js/data/history/a6.js', './js/data/history/g1.js', './js/data/history/g2.js', './js/data/history/g3.js', './js/data/history/g4.js', './js/data/history/g5.js', './js/data/history/g6.js', './js/data/history/g7.js', './js/data/history/index.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== SHARE_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});


/* ------------------------------------------------------------
   share target

   A share is a POST of a form, not a navigation, so it has to be
   caught here — by the time the page loads, the body is gone.
   Files go into their own cache under stable keys and the text
   payload goes into one pending record; the app drains both on
   boot and then deletes them.
   ------------------------------------------------------------ */

const SHARE_CACHE = 'sid-share';

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'POST') return;
  if (!url.pathname.endsWith('/share')) return;

  e.respondWith((async () => {
    const payload = { title: '', text: '', url: '', files: [] };
    try {
      const fd = await e.request.formData();
      payload.title = fd.get('title') || '';
      payload.text  = fd.get('text')  || '';
      payload.url   = fd.get('url')   || '';

      const cache = await caches.open(SHARE_CACHE);
      const files = fd.getAll('media') || [];
      let i = 0;
      for (const f of files) {
        if (!f || typeof f === 'string' || !f.size) continue;
        const key = `./shared/${Date.now()}-${i++}-${(f.name || 'file').replace(/[^\w.-]/g, '_')}`;
        await cache.put(key, new Response(f, { headers: { 'content-type': f.type || 'application/octet-stream' } }));
        payload.files.push({ key, name: f.name || 'file', type: f.type || '', size: f.size });
      }
      await cache.put('./shared/pending.json',
        new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json' } }));
    } catch (err) {
      // a failed share should still land you in the app, empty-handed
    }
    return Response.redirect('./index.html#/inbox', 303);
  })());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // never touch Firebase / Google traffic
  if (/(googleapis|gstatic|firebaseio|firebaseapp|google\.com)/.test(url.hostname)) return;
  if (url.origin !== location.origin) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
