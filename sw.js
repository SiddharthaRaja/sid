/* ============================================================
   sw.js — offline shell
   App files are cached and served network-first so you always
   get the newest build when online, and the app still opens
   when you are not. Firebase traffic is never cached — its own
   offline layer handles that.
   ============================================================ */

const VERSION = 'sid-v26';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './css/app.css',
  './js/app.js', './js/store.js', './js/backend.js', './js/local.js', './js/diary.js', './js/journal.js', './js/filebackup.js', './js/ui.js', './js/icons.js',
  './js/charts.js', './js/agenda.js', './js/firebase-config.js',
  './js/phases.js', './js/theme.js', './js/mobile.js', './js/marks.js', './js/capture.js', './js/paste.js', './js/drive.js', './js/push.js', './js/lint.js', './js/assist.js', './js/imagetools.js',
  './js/data/platforms.js', './js/data/info.js', './js/data/masterplan.js',
  './js/data/radio.js', './js/data/rights.js', './js/data/finance.js', './js/data/video.js',
  './js/data/templates.js', './js/data/contacts.js', './js/data/ads.js', './js/data/assets.js',
  './js/modules/calendar.js', './js/modules/plan.js',
  './js/modules/release.js', './js/modules/timeline.js',
  './js/modules/compose.js', './js/modules/write.js', './js/modules/seo.js', './js/modules/health.js',
  './js/data/phrasebank.js', './js/data/hashtags.js', './js/data/seo.js',
  './js/data/specs.js', './js/data/unlocks.js', './js/data/merch.js', './js/data/website.js',
  './js/data/maillist.js', './js/data/playlists.js', './js/data/runsheet.js',
  './js/modules/maillist.js', './js/modules/playlists.js', './js/modules/runsheet.js',
  './js/modules/studio.js', './js/modules/sprofile.js', './js/modules/merch.js', './js/modules/site.js',
  './js/modules/platform.js', './js/modules/shared.js', './js/modules/stats.js',
  './js/modules/radio.js', './js/modules/rights.js', './js/modules/finance.js',
  './js/modules/video.js', './js/modules/notes.js', './js/modules/settings.js',
  './js/modules/copy.js', './js/modules/contacts.js',
  /* the two guest apps. Their dictionaries (vendor/notepad/*.js, 10 MB
     between them) are deliberately NOT here — they load on first use
     and the runtime cache keeps them after that. */
  './js/modules/notepad.js', './js/notepad/data.js', './js/notepad/metronome.js',
  /* the playbook index only — the ten documents in docs/social/ are
     280 KB and load the first time you open one */
  './js/modules/playbook.js', './js/data/playbooks.js',
  './js/modules/svara.js', './js/svara/audio.js', './js/svara/timeline.js', './js/svara/record.js',
  './js/svara/pitch-worklet.js', './js/svara/voice-worklet.js',
  './js/data/svara.js', './js/data/svara-mechanical.js', './js/data/svara-tips.js', './js/data/svara-library.js',
  './js/modules/queue.js', './js/modules/ads.js', './js/modules/epk.js',
  './js/modules/assets.js', './js/modules/review.js',
  './js/reader.js', './js/modules/history.js', './js/ics.js',
  './js/modules/groups.js', './js/modules/calexport.js', './js/modules/meta.js', './js/modules/inbox.js',
  './js/modules/links.js', './js/modules/pitch.js', './js/data/meta.js', './js/data/pitch.js',
  './js/data/history/a1.js', './js/data/history/a2.js', './js/data/history/a3.js', './js/data/history/a4.js', './js/data/history/a5.js', './js/data/history/a6.js', './js/data/history/g1.js', './js/data/history/g2.js', './js/data/history/g3.js', './js/data/history/g4.js', './js/data/history/g5.js', './js/data/history/g6.js', './js/data/history/g7.js', './js/data/history/index.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-512-maskable.png', './icons/icon.svg',
];

/* Files worth carrying across a version bump instead of re-downloading.
   The rhyme and synonym dictionaries are 10 MB between them and change
   approximately never; deleting them on every deploy made the user pay
   for them again, on a phone, with no explanation. */
const CARRY_OVER = /\/vendor\/notepad\/|\/docs\/social\//;

self.addEventListener('install', (e) => {
  /* addAll is all-or-nothing, so one 404 or one request that lands
     mid-deploy used to throw the whole precache away — silently, and
     then activate anyway and delete the previous, complete cache.
     Cache each file on its own and remember whether it worked. */
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    const results = await Promise.allSettled(SHELL.map(async (u) => {
      const res = await fetch(u, { cache: 'reload' });
      if (!res.ok) throw new Error(u + ' -> ' + res.status);
      return c.put(u, res);
    }));
    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length) console.warn('[sw] precache incomplete:', failed.length, 'of', SHELL.length);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    const old = keys.filter(k => k !== VERSION && k !== SHARE_CACHE);

    /* Move the big, unchanging files forward before the old cache goes,
       and if the precache did not complete, keep the old cache as a
       fallback rather than leaving the app unopenable offline. */
    const fresh = await caches.open(VERSION);
    for (const k of old) {
      const c = await caches.open(k);
      for (const req of await c.keys()) {
        if (!CARRY_OVER.test(new URL(req.url).pathname)) continue;
        if (await fresh.match(req)) continue;
        const res = await c.match(req);
        if (res) await fresh.put(req, res);
      }
    }
    /* Ask the cache itself whether the precache completed, rather than
       trusting a variable: a service worker can be terminated between
       its install and activate events, and a module-scope flag comes
       back as its optimistic default — which would delete the last
       working copy of the app on exactly the deploy that went wrong. */
    let missing = 0;
    for (const u of SHELL) if (!(await fresh.match(u))) missing++;
    if (!missing) await Promise.all(old.map(k => caches.delete(k)));
    else console.warn('[sw] keeping the previous cache:', missing, 'shell files are missing from', VERSION);

    await self.clients.claim();
  })());
});


/* ------------------------------------------------------------
   push notifications

   The payload is written by the GitHub Action, which only ever
   forwards what the app itself planned. Everything is defensive:
   a malformed payload still shows something rather than nothing,
   because a push event that shows no notification is a permission
   strike against the site in Chrome.
   ------------------------------------------------------------ */

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text ? e.data.text() : '' }; }

  const title = d.title || 'Sid';
  const opts = {
    body: d.body || '',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: d.tag || d.kind || 'sid',
    renotify: false,
    data: { url: d.url || './index.html#/today' },
  };
  e.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './index.html#/today';
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      /* already open somewhere — go to the right page rather than
         opening a second copy of the app */
      if ('focus' in c) {
        try { await c.navigate(new URL(url, self.location.origin).href); } catch {}
        return c.focus();
      }
    }
    return self.clients.openWindow(url);
  })());
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

/* The page asks which build is actually serving it. Without this,
   "is my deploy live?" has no answer you can see from inside the
   app — which is how a stale worker goes unnoticed. */
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'version') {
    e.source?.postMessage({ type: 'version', version: VERSION });
  }
});

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

  /* Bypass the BROWSER's HTTP cache for the app's own files.

     GitHub Pages serves them with max-age=600, and a plain fetch()
     here is allowed to answer from that cache — so for ten minutes
     after a deploy the "network-first" strategy could still hand back
     the previous build, with nothing to show that it had. That is
     exactly what "I pushed but nothing changed" looks like.

     The big unchanging files (the 10 MB rhyme and synonym
     dictionaries, the playbook documents) are left on the normal
     cache rules, because re-validating those on every load is the
     cost this is meant to avoid. */
  const appFile = /\.(html|js|css|webmanifest)$/.test(url.pathname) && !CARRY_OVER.test(url.pathname);
  const req = appFile
    ? new Request(e.request, { cache: 'reload' })
    : e.request;

  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      /* Only fall back to the app shell for navigations. Returning
         index.html for a missed .js request fails MIME checking and
         produces a confusing syntax error instead of a clean miss. */
      .catch(() => caches.match(e.request).then(r => {
        if (r) return r;
        if (e.request.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 504, statusText: 'offline and not cached' });
      }))
  );
});
