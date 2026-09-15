/* ============================================================
   settings.js — release identity, backup & version history,
   export / import, account
   ============================================================ */

import * as S from '../store.js';
import * as B from '../backend.js';
import { calendarExportModal } from './calexport.js';
import {
  h, clear, btn, card, cardHead, empty, field, modal, subtabs, selectField, toast,
  download, fmtDate, todayISO, confirmDelete, copy,
} from '../ui.js';
import { THEME_MODES, ACCENTS, themeMode, accent, setThemeMode, setAccent } from '../theme.js';
import * as A from '../assist.js';
import * as D from '../drive.js';
import * as PUSH from '../push.js';
import { healthCard } from './health.js';

export function renderSettings(sub) {
  const root = h('div');
  const set = S.get('settings');
  let tab = ['appearance', 'alerts', 'backup', 'account'].includes(sub) ? sub : 'appearance';

  const draw = () => {
    clear(root);
    root.append(h('div', { class: 'page-head' },
      h('div', {}, h('h1', { text: 'Settings' }),
        h('div', { class: 'sub', text: B.MODE === 'firebase'
          ? 'Signed in with Google. Everything syncs and backs up continuously.'
          : 'Local mode — data is saved to this browser only. Add your Firebase keys to turn on sync and cloud backup.' })),
      h('div', { class: 'spacer' })));

    root.append(subtabs([['appearance', 'Appearance'], ['alerts', 'Notifications'],
      ['backup', 'Backup & history'], ['account', 'Account']], tab, k => { tab = k; draw(); }));

    if (tab === 'alerts')  { root.append(alertsPane()); return; }
    if (tab === 'backup')  { root.append(backupPane()); return; }
    if (tab === 'account') { root.append(accountPane()); return; }
    root.append(appearancePane());
  };

  /* ---------- appearance ---------- */

  function appearancePane() {
    const swatch = (a) => h('button', {
      class: `swatch ${accent() === a[0] ? 'on' : ''}`,
      title: a[1],
      onClick: () => { setAccent(a[0]); draw(); },
    }, h('i', { style: { background: a[2] } }), h('span', { text: a[1] }));

    return h('div',
      card(
        cardHead('Theme'),
        h('p', { class: 'small muted' },
          '"Match my device" follows your phone or laptop, including its automatic evening switch.'),
        h('div', { class: 'seg', style: { marginTop: '4px' } },
          THEME_MODES.map(([k, label]) => h('button', {
            class: themeMode() === k ? 'on' : '',
            onClick: () => { setThemeMode(k); draw(); },
          }, label)))),

      card(
        cardHead('Accent'),
        h('p', { class: 'small muted' }, 'Used for buttons, links, the selected tab and every highlight in the app.'),
        h('div', { class: 'swatches' }, ACCENTS.map(swatch))),

      card(
        cardHead('The release'),
        h('p', { class: 'small muted' },
          'Song details, the release date and the planning / execution switch all live on their own tab now.'),
        h('a', { class: 'btn btn-sm btn-primary', href: '#/release', text: 'Open the Release tab' })),

      uploadsCard(),
      assistCard());
  }

  /* ---------- optional writing assistant ---------- */

  function assistCard() {
    const status = h('div', { class: 'small', style: { marginTop: '10px' } });
    const paint = () => {
      status.textContent = A.hasKey() ? `Key set (${A.keyHint()}) — Assist buttons are live.` : 'No key — everything else still works.';
      status.style.color = A.hasKey() ? 'var(--ok)' : 'var(--fg-3)';
    };

    const input = h('input', { class: 'inp mono', type: 'password', placeholder: 'sk-ant-…' });

    const c = card(
      cardHead('Writing assistant', h('span', { class: 'tag', text: 'optional' })),
      h('p', { class: 'small muted' },
        'Sid has no server, so generated text needs your own API key. Paste an Anthropic key and the Assist buttons appear in the item editor, the writing desk and the hashtag and keyword panels.'),
      h('p', { class: 'small muted' },
        'The key is stored in this browser only — never in Firestore, never in a snapshot, never in a backup export. Paste it again on your phone if you want it there. At caption length a call costs a fraction of a rupee.'),
      h('div', { class: 'row', style: { marginTop: '6px' } },
        input,
        btn('Save', () => { A.setKey(input.value); input.value = ''; paint(); toast('Saved on this device'); }, { cls: 'btn-sm btn-primary' }),
        A.hasKey() ? btn('Remove', () => { A.setKey(''); paint(); }, { cls: 'btn-sm btn-ghost btn-danger' }) : null,
        A.hasKey() ? btn('Test', async (e) => {
          const b = e.target.closest('button'); b.disabled = true; b.textContent = 'testing…';
          try { await A.ask('Reply with the single word: ready'); toast('The key works'); }
          catch (err) { toast(err.message, 4500); }
          b.disabled = false; b.textContent = 'Test';
        }, { cls: 'btn-sm' }) : null),
      status,
      h('p', { class: 'small muted', style: { marginTop: '10px' } },
        'Anything it writes is a draft on your screen — nothing is posted, nothing is saved anywhere until you press Use this.'));
    paint();
    return c;
  }

  /* ---------- where files go ---------- */

  function uploadsCard() {
    const out = h('div', { class: 'small', style: { marginTop: '10px' } });
    const mode = B.getStorageMode();

    const say = (text, ok) => { out.textContent = text; out.style.color = ok ? 'var(--ok)' : 'var(--warn)'; };

    const modeRow = h('div', { class: 'seg', style: { marginTop: '4px' } },
      B.STORAGE_MODES.map(([k, label]) => h('button', {
        class: mode === k ? 'on' : '',
        onClick: () => { B.setStorageMode(k); draw(); },
      }, label)));

    const blurb = {
      drive: 'Uploads go into a "Sid uploads" folder in your own Google Drive, using a permission that only lets the app see files it created — it cannot read anything else in there. Free, no card, counts against your 15GB. The permission lasts about an hour; after that the first upload of a session flashes a Google window for a moment.',
      firebase: 'Firebase Storage is seamless once on, but projects created after late 2024 need the Blaze pay-as-you-go plan, which needs a card even though the free allowance would cover you.',
      local: 'Files are kept in this browser as data, under 1.6 MB each. Instant and private, but they do not reach your phone and they go if you clear site data.',
    }[mode];

    const card_ = card(
      cardHead('Where uploaded files go',
        btn('Test it', async (e) => {
          const b = e.target.closest('button'); b.disabled = true; b.textContent = 'testing…';
          const r = await B.storageSelfTest();
          say(r.text, r.ok);
          b.disabled = false; b.textContent = 'Test it';
        }, { cls: 'btn-sm' })),
      modeRow,
      h('p', { class: 'small muted', style: { marginTop: '10px' }, text: blurb }));

    if (mode === 'drive') {
      const st = D.tokenState();
      card_.append(
        h('div', { class: 'row', style: { marginTop: '8px' } },
          h('span', { class: `tag ${D.HAS_DRIVE ? (st.ok ? 'ok' : '') : 'warn'}`,
            text: !D.HAS_DRIVE ? 'not set up' : st.ok ? `connected · ${st.minutes} min left` : 'not connected yet' }),
          D.HAS_DRIVE ? btn('Connect Drive', async () => {
            try { await D.getToken(); say('Connected.', true); setTimeout(draw, 600); }
            catch (err) { say(err.message, false); }
          }, { cls: 'btn-sm btn-primary' }) : null),
        !D.HAS_DRIVE ? h('ol', { class: 'prose small' },
          h('li', { text: 'Google Cloud console → APIs & Services → Credentials, on the same project as Firebase (sidd).' }),
          h('li', { text: 'Open the OAuth client called "Web client (auto created by Google Service)".' }),
          h('li', { text: 'Under Authorized JavaScript origins add https://siddhartharaja.github.io' }),
          h('li', { text: 'Copy the Client ID and paste it into GOOGLE_CLIENT_ID in js/firebase-config.js, then push.' }),
          h('li', { text: 'Come back, press Connect Drive, and allow the one permission it asks for.' })) : null,
        h('p', { class: 'small muted', style: { marginTop: '8px' } },
          'Uploaded images are set to "anyone with the link can view" so the app can show them back to you. That is a real public link — fine for artwork you are about to post anyway, worth knowing for anything you would not.'));
    }

    card_.append(
      h('div', { class: 'hr' }),
      h('p', { class: 'small muted' },
        'Whatever you pick, every attachment box also takes a pasted link. A Drive share link previews like an upload; anything else is kept as a link. That path needs no permission and never expires, so nothing can ever block you.'),
      out);
    return card_;
  }

  /* ---------- notifications ---------- */

  function alertsPane() {
    const P = S.get('push');
    const box = h('div');
    const out = h('div', { class: 'small', style: { marginTop: '10px' } });
    const say = (t, ok) => { out.textContent = t; out.style.color = ok ? 'var(--ok)' : 'var(--warn)'; };

    const perm = PUSH.permission();
    const on = !!P.sub;
    const hz = PUSH.horizonInfo();

    box.append(card(
      cardHead('Notifications',
        h('span', { class: `tag ${on ? 'ok' : ''}`, text: on ? 'on' : 'off' })),
      h('p', { class: 'small muted' },
        'Sid has no server, so nothing is awake at 8am to decide what to tell you. Instead the app writes a plan for the next six weeks whenever you open it, and a job in your own GitHub repo wakes once a day and sends whatever is due. Free, no card, nothing to keep running.'),
      !PUSH.supported()
        ? h('p', { class: 'small', style: { color: 'var(--warn)' }, text: 'This browser cannot do web notifications. On an iPhone they only work once Sid is added to the Home Screen.' })
        : h('div', { class: 'row', style: { marginTop: '6px' } },
            on
              ? btn('Turn them off', async () => { await PUSH.unsubscribe(); draw(); }, { cls: 'btn-sm btn-ghost btn-danger' })
              : btn('Turn on notifications', async () => {
                  try { await PUSH.subscribe(); say('Subscribed on this device.', true); setTimeout(draw, 700); }
                  catch (e) { say(e.message, false); }
                }, { cls: 'btn-sm btn-primary' }),
            btn('Send a test now', async () => {
              try { await PUSH.testLocal(); say('Sent — check your notification shade.', true); }
              catch (e) { say(e.message, false); }
            }, { cls: 'btn-sm' }),
            perm === 'denied'
              ? h('span', { class: 'small', style: { color: 'var(--warn)' },
                  text: 'Blocked in your browser settings — you have to allow it there first.' })
              : null),
      out));

    if (on) {
      P.kinds = P.kinds || { ...PUSH.DEFAULT_KINDS };
      box.append(card(
        cardHead('What to send', btn('Rebuild the plan', () => {
          const n = PUSH.rebuild();
          say(`${n} notification${n === 1 ? '' : 's'} planned.`, true);
          setTimeout(draw, 600);
        }, { cls: 'btn-sm' })),
        h('div', { class: 'list' }, [
          ['morning', 'Morning digest', 'One a day, only when something is actually due. Never an empty "nothing today".'],
          ['pitch', 'Spotify pitch deadline', 'At 21, 14, 10 and 8 days out, then it stops — because after the cut-off it cannot be done.'],
          ['release', 'Release day', 'The night before, the morning itself, and a reminder to log day-one numbers.'],
          ['weekly', 'Weekly review', 'Sunday.'],
        ].map(([k, label, note]) => h('div', { class: 'item' },
          h('div', { class: 'item-head' },
            h('input', { type: 'checkbox', checked: P.kinds[k] !== false, style: { accentColor: 'var(--accent)' },
              onChange: (e) => { P.kinds[k] = e.target.checked; S.touch('push'); PUSH.rebuild(); } }),
            h('span', { class: 'item-title', text: label })),
          h('div', { class: 'small muted', style: { marginTop: '3px' }, text: note })))),
        h('div', { class: 'small muted', style: { marginTop: '12px' },
          text: hz.days
            ? `The plan currently reaches ${hz.until} — ${hz.days} days out. It refreshes every time you open the app; if you do not open Sid for six weeks the notifications quietly stop, which is the honest failure mode rather than sending you stale ones.`
            : 'Nothing planned yet — press Rebuild.' }),
        (P.schedule || []).length
          ? h('div', { style: { marginTop: '12px' } },
              h('div', { class: 'small muted', text: 'Next few:' }),
              h('div', { class: 'list', style: { marginTop: '6px' } },
                P.schedule.slice(0, 5).map(x => h('div', { class: 'item' },
                  h('div', { class: 'item-head' },
                    h('span', { class: 'tag mono', text: fmtDate(x.date) }),
                    h('span', { class: 'item-title', text: x.title })),
                  h('div', { class: 'small muted', text: x.body })))))
          : null));
    }

    box.append(card(
      cardHead('The one-time setup', h('span', { class: 'tag', text: 'in your GitHub repo' })),
      h('p', { class: 'small muted' },
        'The workflow file is already committed at .github/workflows/notify.yml. It needs two secrets before it can do anything — Settings → Secrets and variables → Actions, in the SiddharthaRaja/sid repo.'),
      h('ol', { class: 'prose small' },
        h('li', { text: 'VAPID_PRIVATE_KEY and VAPID_PUBLIC_KEY — the pair generated for this app. The public half is already in js/firebase-config.js; the private half was given to you in chat and must never go in the repo.' }),
        h('li', { text: 'FIREBASE_SERVICE_ACCOUNT — Firebase console → Project settings → Service accounts → Generate new private key. Paste the whole JSON file as the secret value.' }),
        h('li', { text: 'Then Actions → Daily notifications → Run workflow, with "dry run" ticked, to see what it would send without sending it.' })),
      h('p', { class: 'small muted' },
        'It runs at 02:37 UTC, which is about 08:07 in the morning here. GitHub\'s scheduler is best-effort and often runs 5–30 minutes late, so treat it as "some time after eight" rather than an alarm. Scheduled workflows also switch themselves off after roughly 60 days without a commit to the repo — pushing anything wakes them up.')));

    return box;
  }

  /* ---------- backup ---------- */

  function backupPane() {
    const box = h('div');

    box.append(healthCard());

    box.append(card(
      cardHead('How your data is kept'),
      h('ul', { class: 'prose' },
        h('li', { text: 'Every edit is written about half a second after you stop typing — not when you leave the page.' }),
        h('li', { text: 'Anything unsaved is also flushed the moment the tab is hidden, closed, or loses focus.' }),
        h('li', { text: 'A sweep runs every 5 seconds as a backstop in case a save was missed.' }),
        h('li', { text: B.MODE === 'firebase'
          ? 'Offline edits queue on the device and replay automatically when you reconnect.'
          : 'Local mode: data lives in this browser only. Export regularly, or add Firebase keys.' }),
        h('li', { text: 'A full point-in-time snapshot is taken every time you open the app, and every 10 minutes of active work. The last 40 are kept and any one can be restored.' }))));

    box.append(card(
      cardHead('Snapshots',
        btn('Take one now', async () => {
          try { await S.snapshotNow('manual'); toast('Snapshot saved'); draw(); }
          catch (e) { toast('Snapshot failed: ' + e.message, 3500); }
        }, { cls: 'btn-sm btn-primary' })),
      h('div', { id: 'snap-list' }, h('div', { class: 'small muted', text: 'loading…' }))));

    B.listSnapshots().then(list => {
      const el = box.querySelector('#snap-list');
      if (!el) return;
      clear(el);
      if (!list.length) { el.append(h('div', { class: 'small muted', text: 'No snapshots yet.' })); return; }
      el.append(h('div', { class: 'list' }, list.map(s => h('div', { class: 'item' },
        h('div', { class: 'item-head' },
          h('span', { class: 'item-title mono', text: new Date(s.at).toLocaleString() }),
          h('span', { class: 'tag', text: s.label }),
          btn('Restore', () => confirmRestore(s.at), { cls: 'btn-sm btn-ghost' }))))));
    }).catch(() => {});

    box.append(card(
      cardHead('Export & import'),
      h('p', { class: 'small muted' }, 'A full JSON copy of everything — keep one in your Drive folder alongside the release plan.'),
      h('div', { class: 'row' },
        btn('Download everything', async () => {
          await S.flushAll();
          download(`sid-backup-${todayISO()}.json`, JSON.stringify(S.everything(), null, 2));
        }, { cls: 'btn-sm' }),
        btn('Import a backup', importBackup, { cls: 'btn-sm' }))));

    return box;
  }

  function confirmRestore(at) {
    modal({
      title: 'Restore this snapshot?',
      body: h('p', { class: 'small muted' },
        'Everything currently in the app will be replaced by the version from ' +
        new Date(at).toLocaleString() + '. A snapshot of the current state is taken first, so this is reversible.'),
      actions: [{ label: 'Cancel' }, {
        label: 'Restore', cls: 'btn-primary',
        onClick: async () => { try { await S.restoreSnapshot(at); } catch (e) { toast(e.message, 3500); } },
      }],
    });
  }

  function importBackup() {
    const input = h('input', { type: 'file', accept: 'application/json', hidden: true,
      onChange: async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        try {
          const data = JSON.parse(await f.text());
          modal({
            title: 'Import this backup?',
            body: h('p', { class: 'small muted' }, `${Object.keys(data).length} sections found. This replaces everything currently in the app.`),
            actions: [{ label: 'Cancel' }, { label: 'Import', cls: 'btn-primary', onClick: async () => {
              await S.importAll(data); toast('Imported'); location.reload();
            } }],
          });
        } catch { toast('That file is not a Sid backup', 3000); }
      } });
    document.body.append(input); input.click(); input.remove();
  }

  /* ---------- account ---------- */

  function accountPane() {
    const u = B.user();
    return h('div',
      card(cardHead('Signed in as'),
        h('div', { class: 'row' },
          u?.photoURL ? h('img', { src: u.photoURL, width: 40, height: 40, style: { borderRadius: '50%' } }) : null,
          h('div', {},
            h('div', { style: { fontWeight: 500 }, text: u?.displayName || 'Local user' }),
            h('div', { class: 'small muted', text: u?.email || 'no account — local mode' }))),
        h('div', { style: { marginTop: '14px' } },
          B.MODE === 'firebase'
            ? btn('Sign out', () => B.signOutNow(), { cls: 'btn-sm' })
            : h('p', { class: 'small muted', style: { margin: 0 } },
                'Add your Firebase config to js/firebase-config.js to turn on Google sign-in, cross-device sync and cloud backup.'))),

      card(cardHead('Reminders on your phone'),
        h('p', { class: 'small muted' },
          'Sid cannot send push notifications on its own — that needs a server running around the clock, which this app deliberately does not have. ' +
          'Exporting your dates to a real calendar gets you the same thing for nothing: lock-screen reminders that work offline and keep working whether or not you open Sid.'),
        btn('Send dates to my calendar', calendarExportModal, { cls: 'btn-sm btn-primary' })),

      card(cardHead('Install Sid'),
        h('ul', { class: 'prose' },
          h('li', { text: 'iPhone: open in Safari → Share → Add to Home Screen.' }),
          h('li', { text: 'Android: open in Chrome → menu → Install app / Add to Home screen.' }),
          h('li', { text: 'Desktop: the install icon in the address bar, or menu → Install Sid.' }),
          h('li', { text: 'Once installed it opens full-screen with its own icon and works offline.' }))),

      card(cardHead('Danger zone'),
        h('p', { class: 'small muted' }, 'Wipes everything in this account and starts fresh. Take a snapshot or export first.'),
        btn('Erase all data', () => confirmDelete('everything', async () => {
          await S.snapshotNow('pre-erase');
          await S.importAll(Object.fromEntries(Object.keys(S.everything()).map(k => [k, Array.isArray(S.get(k)) ? [] : {}])));
          location.reload();
        }), { cls: 'btn-sm btn-danger' })));
  }

  draw();
  return root;
}
