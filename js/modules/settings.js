/* ============================================================
   settings.js — release identity, backup & version history,
   export / import, account
   ============================================================ */

import * as S from '../store.js';
import * as B from '../backend.js';
import * as L from '../local.js';
import * as J from '../journal.js';
import * as F from '../filebackup.js';
import * as DIARY from '../diary.js';
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
      local: 'Files are kept in this browser as data, under 500 KB each — they are stored inside your data, so anything larger would stop that section syncing. Instant and private, but they do not reach your phone and they go if you clear site data.',
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
      P.slots = P.slots || { ...PUSH.DEFAULT_SLOTS };

      box.append(card(
        cardHead('When'),
        h('p', { class: 'small muted' },
          'Four a day, each with a different job — the same list four times is how you learn to swipe them away without reading. Any of them stays silent when it has nothing to say.'),
        h('div', { class: 'list' }, PUSH.SLOTS.map(s => h('div', { class: 'item' },
          h('div', { class: 'item-head' },
            h('input', { type: 'checkbox', checked: P.slots[s.key] !== false, style: { accentColor: 'var(--accent)' },
              onChange: (e) => { P.slots[s.key] = e.target.checked; S.touch('push'); PUSH.rebuild(); } }),
            h('span', { class: 'tag mono', text: s.label }),
            h('span', { class: 'item-title', text: s.note })))))));

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
                P.schedule.slice(0, 6).map(x => h('div', { class: 'item' },
                  h('div', { class: 'item-head' },
                    h('span', { class: 'tag mono',
                      text: `${fmtDate(x.date)} ${(PUSH.SLOTS.find(s => s.key === (x.slot || 'morning')) || {}).label || ''}` }),
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
        'The job wakes four times a day — a little before 10am, 3pm, 10pm and 2am — and each run works out from the clock which of the four it is. GitHub\'s scheduler is best-effort and often runs 5–30 minutes late, so treat each one as "some time after" rather than an alarm. Scheduled workflows also switch themselves off after roughly 60 days without a commit to the repo — pushing anything wakes them up.')));

    return box;
  }

  /* ---------- backup ---------- */

  function backupPane() {
    const box = h('div');

    box.append(healthCard());

    box.append(card(
      cardHead('How your data is kept'),
      h('ul', { class: 'prose' },
        h('li', { text: 'Every edit is written to this device within about a sixth of a second — synchronously, so it has already happened before anything else is attempted.' }),
        h('li', { text: 'It is written to this device again, synchronously, the instant the tab is hidden, closed or loses focus.' }),
        h('li', { text: 'Only then is it sent to the cloud. The cloud is sync, not storage: if it stalls, your work is already safe here and a banner tells you so.' }),
        h('li', { text: 'A cloud save that has not been acknowledged in 15 seconds is treated as failed and retried, instead of hanging forever.' }),
        h('li', { text: 'If a section could not be read from the cloud at startup, it is never written back — so a half-loaded app can never overwrite real data with blanks.' }),
        h('li', { text: B.MODE === 'firebase'
          ? 'Offline edits queue on the device and replay automatically when you reconnect.'
          : 'Local mode: data lives on this device only. Download a backup regularly, or add Firebase keys.' }),
        h('li', { text: 'Full snapshots are taken on this device AND in the cloud — every time you open the app, and every 5 minutes of active work. Everything from the last two days is kept, then one a day for a month, then one a week.' }))));

    box.append(card(
      cardHead('Snapshots',
        btn('Take one now', async () => {
          try {
            const r = await S.snapshotNow('manual');
            toast(
              r.localErr ? 'Could not save on this device: ' + r.localErr
              : r.cloudErr ? 'Saved on this device. Cloud copy: ' + r.cloudErr
              : 'Snapshot saved here and in the cloud', 4500);
            draw();
          }
          catch (e) { toast('Snapshot failed: ' + (e.message || e), 4000); }
        }, { cls: 'btn-sm btn-primary' })),
      h('p', { class: 'small muted' }, 'Snapshots on this device survive anything that goes wrong with the cloud or the account. Cloud snapshots survive anything that goes wrong with this device. Keep both.'),
      h('div', { id: 'snap-list' }, h('div', { class: 'small muted', text: 'loading…' }))));

    /* This used to be `.catch(() => {})`, which rendered an empty list
       when the read FAILED — so "your backups are unreachable" and
       "you have no backups" looked exactly the same. They are not the
       same, and the difference matters most on the worst day. */
    S.listSnapshots().then(({ rows, errors }) => {
      const el = box.querySelector('#snap-list');
      if (!el) return;
      clear(el);
      errors.forEach(msg => el.append(h('div', { class: 'small', style: { color: 'var(--danger)' },
        text: 'Could not read snapshots — ' + msg })));
      if (!rows.length) {
        el.append(h('div', { class: 'small muted',
          text: errors.length ? 'None could be listed. That is a read failure, not proof there are none.' : 'No snapshots yet.' }));
        return;
      }
      el.append(h('div', { class: 'list' }, rows.map(s => h('div', { class: 'item' },
        h('div', { class: 'item-head' },
          h('span', { class: 'item-title mono', text: new Date(s.at).toLocaleString() }),
          h('span', { class: 'tag', text: s.label }),
          h('span', { class: 'tag', text: s.where === 'cloud' ? 'cloud' : 'this device' }),
          s.ns && s.ns !== L.namespace() ? h('span', { class: 'tag', text: 'other sign-in' }) : null,
          btn('Restore', () => confirmRestore(s.key || s.at, s.where, s.at), { cls: 'btn-sm btn-ghost' }),
          btn('Download', () => downloadSnapshot(s), { cls: 'btn-sm btn-ghost' }))))));
    }).catch(e => {
      const el = box.querySelector('#snap-list');
      if (el) { clear(el); el.append(h('div', { class: 'small', style: { color: 'var(--danger)' }, text: String(e.message || e) })); }
    });

    const since = L.daysSinceExport();
    box.append(card(
      cardHead('Export & import'),
      h('p', { class: 'small muted' }, 'A JSON file on your own computer is the only copy that no outage, no account mix-up and no bug of mine can reach. Keep one.'),
      h('p', { class: 'small muted' }, 'It holds every section of the app. It does NOT hold your Svara recordings — audio is far too large for a JSON file, so those have their own button below.'),
      h('p', { class: 'small', style: { color: since > 7 ? 'var(--danger)' : 'inherit' },
        text: L.lastExport()
          ? `Last download: ${new Date(L.lastExport()).toLocaleString()} (${Math.floor(since)} day${Math.floor(since) === 1 ? '' : 's'} ago).`
          : 'You have never downloaded one.' }),
      h('div', { class: 'row' },
        btn('Download everything', async () => {
          try { await S.flushAll(); } catch {}
          download(`sid-backup-${todayISO()}.json`, JSON.stringify(S.everything(), null, 2));
          L.markExported();
          toast('Backup downloaded');
          draw();
        }, { cls: 'btn-sm btn-primary' }),
        btn('Import a backup', importBackup, { cls: 'btn-sm' }))));

    box.append(diaryCard());
    box.append(fileBackupCard());
    box.append(journalCard());
    box.append(takesCard());
    box.append(stuckCard());
    box.append(otherAccountsCard());
    box.append(diagnosticsCard());

    return box;
  }

  /* The app looking empty and your work being gone are two different
     things, and until now they looked identical. If another Google
     account on this device has data, say so — loudly — instead of
     letting an empty screen speak for itself. */
  function otherAccountsCard() {
    const mine = L.namespace();
    const others = L.namespaceSummary().filter(r => r.ns !== mine && r.sections > 0);
    if (!others.length) return h('span', { hidden: true });

    const kb = (n) => (n / 1024).toFixed(0) + ' KB';
    return card(
      cardHead('Data from another sign-in on this device'),
      h('p', { class: 'small' },
        'This device also holds data saved under ' + (others.length === 1 ? 'a different account' : others.length + ' other accounts') +
        '. If the app looks emptier than it should, you are probably signed into the wrong one — nothing has been lost, and none of it has been touched.'),
      h('p', { class: 'small muted' },
        'The safest move is to sign out and back in with the right Google account. Download it first if you want a copy either way.'),
      h('div', { class: 'list' }, others.map(r => h('div', { class: 'item' },
        h('div', { class: 'item-head' },
          h('span', { class: 'item-title mono', text: r.ns.slice(0, 12) + '…' }),
          h('span', { class: 'tag', text: `${r.sections} sections · ${kb(r.bytes)}` }),
          h('span', { class: 'tag', text: r.newest ? new Date(r.newest).toLocaleString() : 'no date' }),
          btn('Download it', async () => {
            try {
              const data = await L.readNamespace(r.ns);
              download(`sid-other-account-${r.ns.slice(0, 8)}-${todayISO()}.json`, JSON.stringify(data, null, 2));
              toast('Downloaded — import it after signing into the right account');
            } catch (e) { toast('Could not read it: ' + (e.message || e), 4000); }
          }, { cls: 'btn-sm btn-ghost' }))))));
  }

  /* Recordings live only on this device, in IndexedDB. Clearing site
     data takes them with it, and the JSON backup cannot hold them — so
     there has to be a way to get them all off in one go. */
  function takesCard() {
    const out = h('div', { class: 'small muted', style: { marginTop: '8px' }, text: 'checking…' });
    const c = card(
      cardHead('Svara recordings',
        btn('Download them all', async (e) => {
          const b = e.target.closest('button');
          b.disabled = true;
          try {
            const REC = await import('../svara/record.js');
            const takes = await REC.listTakes();
            if (!takes.length) { toast('No recordings on this device'); b.disabled = false; return; }
            let n = 0;
            for (const t of takes) {
              b.textContent = `saving ${++n} of ${takes.length}…`;
              const full = await REC.getTake(t.id);
              if (!full || !full.samples) continue;
              const wav = REC.encodeWav(full.samples, full.sampleRate);
              const name = `${String(full.name || 'take').replace(/[^\w.-]+/g, '-')}-${new Date(full.at).toISOString().slice(0, 19).replace(/[:T]/g, '-')}.wav`;
              const url = URL.createObjectURL(wav);
              const a = document.createElement('a');
              a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
              /* One at a time, and let the blob go: ten three-minute
                 takes held at once is enough to get the tab killed. */
              await new Promise(r => setTimeout(r, 400));
              URL.revokeObjectURL(url);
            }
            toast(`${takes.length} recording${takes.length > 1 ? 's' : ''} downloaded`, 4000);
          } catch (err) { toast('Could not export: ' + (err.message || err), 5000); }
          b.disabled = false; b.textContent = 'Download them all';
        }, { cls: 'btn-sm btn-primary' })),
      h('p', { class: 'small muted' },
        'Recordings are on this device only — they are not in Firestore, not in a snapshot, and not in the JSON backup. If you clear site data or lose the device, they go with it.'),
      out);

    (async () => {
      try {
        const REC = await import('../svara/record.js');
        const takes = await REC.listTakes();
        const u = await REC.usage();
        const mb = (n) => (n / 1048576).toFixed(0);
        out.textContent = takes.length
          ? `${takes.length} recording${takes.length > 1 ? 's' : ''} here · about ${mb(u.used)} MB used of ${mb(u.quota)} MB the browser allows.`
          : 'No recordings on this device yet.';
        if (u.quota && u.used / u.quota > 0.8) {
          out.style.color = 'var(--danger)';
          out.textContent += ' Storage is nearly full — download them and delete some.';
        }
      } catch (e) { out.textContent = 'Could not read the recording store: ' + (e.message || e); }
    })();

    return c;
  }

  /* When a save has permanently stopped, say so here with a way to
     retry, rather than leaving it to a banner the user may dismiss. */
  function stuckCard() {
    const st = S.health;
    if (st.cloud !== 'stuck' && !(st.stuck && st.stuck.length)) return h('span', { hidden: true });
    return card(
      cardHead('Some sections are not reaching the cloud',
        btn('Try again', () => { const n = S.retryStuck(); toast(n ? `Retrying ${n} section${n > 1 ? 's' : ''}` : 'Nothing to retry'); draw(); }, { cls: 'btn-sm btn-primary' })),
      h('p', { class: 'small', style: { color: 'var(--danger)' }, text: st.detail }),
      h('p', { class: 'small muted' }, 'Everything is still saved on this device, and nothing already in the cloud has been damaged. Download a backup before you use Sid on another device.'),
      h('div', { class: 'list' }, (st.stuck || []).map(id => h('div', { class: 'item' },
        h('div', { class: 'item-head' }, h('span', { class: 'item-title mono', text: id }))))));
  }

  /* The hundred diary slots: what exists, and a way back out. */
  function diaryCard() {
    const plan = DIARY.preview();
    const box = h('div');

    if (!plan.ok) {
      return card(cardHead('The diary'),
        h('p', { class: 'small muted', text: plan.reason }));
    }

    box.append(h('div', { class: 'list' }, plan.rows.map(r => h('div', { class: 'item' },
      h('div', { class: 'item-head' },
        h('span', { class: 'item-title', text: r.label }),
        h('span', { class: 'tag', text: `${r.has} of ${DIARY.DIARY_TARGET}` }),
        r.missing
          ? h('span', { class: 'small muted', text: `${r.missing} slots missing (${r.from}–${r.to})` })
          : h('span', { class: 'tag ok', text: 'complete' }))))));

    return card(
      cardHead('The diary',
        plan.total
          ? btn(`Lay out the missing ${plan.total}`, () => {
              const r = DIARY.fill();
              toast(r.added ? `${r.added} slots added` : 'Nothing to add', 4000);
              draw();
            }, { cls: 'btn-sm btn-primary' })
          : null),
      h('p', { class: 'small muted' },
        `Numbered slots waiting for each entry, on all three text platforms, dated from the run already written on X — entry ${DIARY.DIARY_TARGET} lands on ${plan.endWhen}. Writing one is opening it and typing.`),
      box,
      h('div', { class: 'row', style: { marginTop: '12px' } },
        btn('Undo the empty ones', () => confirmDelete('every diary slot that has not been written in', () => {
          const n = DIARY.undo();
          toast(n ? `${n} empty slots removed` : 'Nothing to remove — they have all been written in', 4000);
          draw();
        }), { cls: 'btn-sm btn-ghost btn-danger' })),
      h('p', { class: 'small muted', style: { marginTop: '8px' } },
        'Undo only removes slots still holding nothing but their number. Anything you have typed into stays, whatever else happens.'));
  }

  /* A real file on the computer, rewritten in the background. The only
     layer that survives clearing the site's data. */
  function fileBackupCard() {
    const st = F.status();
    const line = h('div', { class: 'small', style: { marginTop: '8px' } });

    const paint = () => {
      const now = F.status();
      line.textContent = now.error ? now.error
        : now.connected ? `Connected — writing to "${now.name}"${now.lastWrite ? `, last at ${new Date(now.lastWrite).toLocaleTimeString()}` : ' (first write on the next snapshot)'}.`
        : 'Not connected.';
      line.style.color = now.error ? 'var(--danger)' : now.connected ? 'var(--ok)' : 'var(--fg-3)';
    };

    if (!st.supported) {
      return card(
        cardHead('A live backup file', h('span', { class: 'tag', text: 'desktop only' })),
        h('p', { class: 'small muted' },
          'On a desktop browser Sid can keep one ordinary file on your computer up to date automatically — chosen once, rewritten in the background, outside the browser\'s storage entirely. This browser does not support it, so on this device the Download button above is the equivalent.'));
    }

    const c = card(
      cardHead('A live backup file',
        btn(st.connected ? 'Choose a different file' : 'Choose a file', async (e) => {
          const b = e.target.closest('button'); b.disabled = true;
          try {
            const name = await F.choose(`sid-backup-${todayISO()}.json`);
            await F.write(S.everything());
            toast(`Backing up to "${name}"`, 4000);
            draw();
          } catch (err) {
            if (!/abort/i.test(String(err.message || err))) toast(String(err.message || err), 5000);
          }
          b.disabled = false;
        }, { cls: 'btn-sm btn-primary' })),
      h('p', { class: 'small muted' },
        'Every other safety net lives inside this browser\'s storage for this site — the mirror, the snapshots, the journal below. Clearing site data takes all of them at once. This one does not: pick a file (your Drive folder is a good place) and Sid rewrites it every few minutes with everything in the app.'),
      h('p', { class: 'small muted' },
        'You choose the file once. There is no dialog after that, and no folder full of dated copies — it is one file, always current.'),
      line);

    if (st.supported && !st.connected && st.error) {
      c.append(h('div', { class: 'row', style: { marginTop: '8px' } },
        btn('Reconnect', async () => {
          if (await F.reconnect()) { await F.write(S.everything()); toast('Reconnected'); draw(); }
          else toast('Could not reconnect — choose the file again', 4000);
        }, { cls: 'btn-sm' })));
    }
    if (st.connected) {
      c.append(h('div', { class: 'row', style: { marginTop: '8px' } },
        btn('Write it now', async () => {
          const okNow = await F.write(S.everything());
          toast(okNow ? 'Backup file updated' : 'Could not write: ' + F.status().error, 4500);
          paint();
        }, { cls: 'btn-sm' }),
        btn('Stop using it', () => confirmDelete('the link to that backup file', async () => {
          await F.forget(); toast('Stopped — the file itself is untouched'); draw();
        }), { cls: 'btn-sm btn-ghost' })));
    }
    paint();
    return c;
  }

  /* The append-only log. Never overwrites, so a bug in the layer above
     cannot damage what it has already written. */
  function journalCard() {
    const out = h('div', { class: 'small muted', style: { marginTop: '8px' }, text: 'checking…' });
    const listBox = h('div');

    const c = card(
      cardHead('Edit history on this device',
        btn(J.enabled() ? 'Turn off' : 'Turn on', () => {
          J.setEnabled(!J.enabled());
          toast(J.enabled() ? 'Edit history on' : 'Edit history off — the other backups are unaffected');
          draw();
        }, { cls: 'btn-sm' })),
      h('p', { class: 'small muted' },
        'A running log of what each section looked like, kept in its own separate database. It only ever adds — nothing here is ever overwritten — so even if the saving code itself goes wrong, the history of what you typed is still readable. About one copy a minute per section while you are actively editing it.'),
      h('p', { class: 'small muted' },
        'This is belt and braces. If you stop wanting it, turn it off here — nothing else changes.'),
      out, listBox);

    const refresh = async () => {
      try {
        const st = await J.stats();
        out.textContent = !J.enabled()
          ? `Off. ${st.entries} entries are still stored from before.`
          : st.entries
            ? `${st.entries} entries across ${st.sections} sections, ${(st.bytes / 1048576).toFixed(1)} MB, from ${new Date(st.oldest).toLocaleString()} to ${new Date(st.newest).toLocaleString()}.`
            : 'Nothing logged yet — it starts with your next edit.';
        if (st.error) { out.textContent += ' Last error: ' + st.error; out.style.color = 'var(--danger)'; }
      } catch (e) { out.textContent = 'Could not read the history: ' + (e.message || e); }
    };

    c.append(h('div', { class: 'row', style: { marginTop: '10px' } },
      btn('Browse it', () => browseJournal(), { cls: 'btn-sm btn-primary' }),
      btn('Download all of it', async (e) => {
        const b = e.target.closest('button'); b.disabled = true; b.textContent = 'gathering…';
        try {
          const rows = await J.dump();
          download(`sid-edit-history-${todayISO()}.json`, JSON.stringify(rows, null, 2));
          toast(`${rows.length} entries downloaded`);
        } catch (err) { toast('Could not export: ' + (err.message || err), 5000); }
        b.disabled = false; b.textContent = 'Download all of it';
      }, { cls: 'btn-sm' }),
      btn('Clear it', () => confirmDelete('the whole edit history', async () => {
        await J.clearAll(); toast('Edit history cleared'); draw();
      }), { cls: 'btn-sm btn-ghost btn-danger' })));

    refresh();
    return c;
  }

  /* Browse the log and put one version of one section back. */
  function browseJournal() {
    const body = h('div', h('div', { class: 'small muted', text: 'loading…' }));
    const m = modal({ title: 'Edit history', wide: true, body, actions: [{ label: 'Close' }] });

    (async () => {
      let rows = [];
      try { rows = await J.list({ limit: 400 }); }
      catch (e) { clear(body); body.append(h('p', { class: 'small', text: 'Could not read it: ' + (e.message || e) })); return; }
      clear(body);
      if (!rows.length) {
        body.append(h('p', { class: 'small muted' }, 'Nothing logged yet. It fills up as you work.'));
        return;
      }
      const sections = [...new Set(rows.map(r => r.id))].sort();
      let filter = '';
      const list = h('div', { class: 'list' });

      const paint = () => {
        clear(list);
        rows.filter(r => !filter || r.id === filter).slice(0, 120).forEach(r => {
          list.append(h('div', { class: 'item' },
            h('div', { class: 'item-head' },
              h('span', { class: 'item-title mono', text: new Date(r.at).toLocaleString() }),
              h('span', { class: 'tag', text: r.id }),
              r.label ? h('span', { class: 'tag', text: r.label }) : null,
              h('span', { class: 'small muted', text: `${(r.bytes / 1024).toFixed(0)} KB` }),
              btn('Look at it', async () => {
                const v = await J.read(r.key);
                modal({ title: `${r.id} — ${new Date(r.at).toLocaleString()}`, wide: true,
                  body: h('pre', { class: 'mono small', style: { whiteSpace: 'pre-wrap', maxHeight: '60vh', overflow: 'auto' },
                    text: JSON.stringify(v, null, 2) }),
                  actions: [
                    { label: 'Close' },
                    { label: 'Download this one', onClick: () =>
                        download(`sid-${r.id}-${new Date(r.at).toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`,
                          JSON.stringify(v, null, 2)) },
                    { label: 'Put this version back', cls: 'btn-primary', onClick: async () => {
                        try {
                          await S.importAll({ [r.id]: v });
                          toast(`"${r.id}" restored to its ${new Date(r.at).toLocaleTimeString()} version`, 4500);
                          m.close();
                        } catch (err) { toast(String(err.message || err), 5000); }
                      } },
                  ] });
              }, { cls: 'btn-sm btn-ghost' }))));
        });
      };

      body.append(
        h('p', { class: 'small muted' },
          'Every entry is a copy of one section at one moment. Putting one back replaces only that section, and takes a snapshot first — so it is reversible.'),
        h('div', { class: 'row', style: { flexWrap: 'wrap', marginBottom: '10px' } },
          btn('All sections', () => { filter = ''; paint(); }, { cls: 'btn-sm' }),
          ...sections.map(id => btn(id, () => { filter = id; paint(); }, { cls: 'btn-sm btn-ghost' }))),
        list);
      paint();
    })();
  }

/* Ask the service worker what it is, and the server what it has. */
  async function runningBuild() {
    const out = { running: 'unknown', server: 'unknown', stale: false };
    try {
      const sw = navigator.serviceWorker?.controller;
      if (sw) {
        out.running = await new Promise((res) => {
          const ch = new MessageChannel();
          const t = setTimeout(() => res('no answer'), 1500);
          ch.port1.onmessage = (e) => { clearTimeout(t); res(e.data?.version || 'no answer'); };
          sw.postMessage({ type: 'version' }, [ch.port2]);
        });
      } else {
        out.running = 'no service worker';
      }
    } catch (e) { out.running = 'error: ' + (e.message || e); }

    try {
      const r = await fetch('./sw.js?cb=' + Date.now(), { cache: 'no-store' });
      const t = await r.text();
      out.server = (t.match(/VERSION\s*=\s*'([^']+)'/) || [])[1] || 'unreadable';
    } catch (e) { out.server = 'offline'; }

    out.stale = out.running !== out.server
      && /^sid-v/.test(out.running) && /^sid-v/.test(out.server);
    return out;
  }

  function downloadSnapshot(s) {
    (s.where === 'cloud' ? B.readSnapshot(s.at) : L.readSnapshot(s.key || s.at))
      .then(data => {
        if (!data) { toast('That snapshot could not be read', 3000); return; }
        download(`sid-snapshot-${s.at.replace(/[:.]/g, '-')}.json`, JSON.stringify(data, null, 2));
      })
      .catch(e => toast(String(e.message || e), 3500));
  }

  /* Everything I would ask you for if this went wrong again, on one
     screen, copyable in one tap. */
  function diagnosticsCard() {
    const pre = h('pre', { class: 'mono small', style: { whiteSpace: 'pre-wrap', margin: 0 } }, 'gathering…');
    const box = card(
      cardHead('Diagnostics',
        btn('Copy', () => { navigator.clipboard.writeText(pre.textContent).then(() => toast('Copied')); }, { cls: 'btn-sm btn-ghost' })),
      h('p', { class: 'small muted' }, 'If data goes missing, send me this before doing anything else.'),
      pre);

    (async () => {
      const d = S.diagnose();
      const est = await L.estimate();
      const u = B.user();

      /* Which build is actually serving this page, and which one is
         on the server. A mismatch is the whole explanation for
         "I pushed and nothing changed". */
      const build = await runningBuild();

      let snapCount = '?';
      try { snapCount = (await L.listSnapshots()).length; } catch (e) { snapCount = 'error: ' + e.message; }
      pre.textContent = JSON.stringify({
        buildRunning: build.running,
        buildOnServer: build.server,
        buildStale: build.stale,
        account: u?.email || '(none)',
        uid: u?.uid || '(none)',
        mode: B.MODE,
        firestoreDegraded: B.degraded() ? B.degradedText() : false,
        persistentStorage: await navigator.storage?.persisted?.().catch(() => null),
        deviceSnapshots: snapCount,
        quotaUsedMB: est ? +(est.usage / 1048576).toFixed(1) : null,
        quotaMB: est ? +(est.quota / 1048576).toFixed(0) : null,
        lastExport: L.lastExport() || '(never)',
        ...d,
      }, null, 2);
    })().catch(e => { pre.textContent = String(e.message || e); });

    return box;
  }

  function confirmRestore(key, where = 'device', at = key) {
    modal({
      title: 'Restore this snapshot?',
      body: h('div', {},
        h('p', { class: 'small muted' },
          'Everything currently in the app will be replaced by the version from ' +
          new Date(at).toLocaleString() + ` (${where === 'cloud' ? 'cloud copy' : 'this device'}).`),
        h('p', { class: 'small muted' },
          'A snapshot of the current state is taken first — on this device as well as in the cloud — so this is reversible either way.'),
        h('p', { class: 'small' }, 'Download the current state first if you are unsure.')),
      actions: [
        { label: 'Cancel' },
        { label: 'Download first', onClick: async () => {
            try { await S.flushAll(); } catch {}
            download(`sid-before-restore-${todayISO()}.json`, JSON.stringify(S.everything(), null, 2));
            L.markExported();
          } },
        { label: 'Restore', cls: 'btn-primary',
          onClick: async () => { try { await S.restoreSnapshot(key, where); } catch (e) { toast(e.message || String(e), 4000); } } },
      ],
    });
  }

  function importBackup() {
    const input = h('input', { type: 'file', accept: 'application/json', hidden: true,
      onChange: async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        let data;
        try { data = JSON.parse(await f.text()); }
        catch { toast('That file is not valid JSON', 3000); return; }

        const chk = S.inspectImport(data);
        if (!chk.ok) { toast(chk.reason, 4000); return; }

        modal({
          title: 'Import this backup?',
          body: h('div', {},
            h('p', { class: 'small' }, `${chk.known.length} recognised sections will replace what is in the app now.`),
            chk.empty.length ? h('p', { class: 'small', style: { color: 'var(--danger)' } },
              `${chk.empty.length} of them are EMPTY in this file (${chk.empty.join(', ')}) — importing will empty them here too.`) : null,
            chk.bad.length ? h('p', { class: 'small muted' }, `${chk.bad.length} malformed sections will be skipped.`) : null,
            chk.unknown.length ? h('p', { class: 'small muted' }, `${chk.unknown.length} unrecognised keys will be ignored.`) : null,
            h('p', { class: 'small muted' }, 'A snapshot of the current state is saved on this device first, so this is reversible.')),
          actions: [
            { label: 'Cancel' },
            { label: 'Download current first', onClick: async () => {
                try { await S.flushAll(); } catch {}
                download(`sid-before-import-${todayISO()}.json`, JSON.stringify(S.everything(), null, 2));
                L.markExported();
              } },
            { label: 'Import', cls: 'btn-primary', onClick: async () => {
                try { await S.importAll(data); toast('Imported'); location.reload(); }
                catch (err) { toast(String(err.message || err), 4000); }
              } },
          ],
        });
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

      card(cardHead('Your dates in a real calendar'),
        h('p', { class: 'small muted' },
          'Push notifications live under Notifications — this is the other half. An export puts every date into Google Calendar or whatever you use, ' +
          'where it sits alongside the rest of your week, works offline, and keeps working whether or not you open Sid.'),
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
