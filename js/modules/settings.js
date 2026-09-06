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

export function renderSettings(sub) {
  const root = h('div');
  const set = S.get('settings');
  let tab = ['release', 'backup', 'account'].includes(sub) ? sub : 'release';

  const draw = () => {
    clear(root);
    root.append(h('div', { class: 'page-head' },
      h('div', {}, h('h1', { text: 'Settings' }),
        h('div', { class: 'sub', text: B.MODE === 'firebase'
          ? 'Signed in with Google. Everything syncs and backs up continuously.'
          : 'Local mode — data is saved to this browser only. Add your Firebase keys to turn on sync and cloud backup.' })),
      h('div', { class: 'spacer' })));

    root.append(subtabs([['release', 'Release'], ['backup', 'Backup & history'], ['account', 'Account']], tab, k => { tab = k; draw(); }));

    if (tab === 'backup')  { root.append(backupPane()); return; }
    if (tab === 'account') { root.append(accountPane()); return; }
    root.append(releasePane());
  };

  /* ---------- release identity ---------- */

  function releasePane() {
    return h('div',
      card(
        cardHead('The release'),
        h('p', { class: 'small muted' }, 'The release date drives every T-offset in the app. Change it and the whole plan, every scheduled post and every deadline re-dates itself.'),
        h('div', { class: 'grid g2' },
          field('Artist name — exact capitalisation', set, 'artist', { slice: 'settings', placeholder: 'It must be byte-identical everywhere, forever' }),
          field('Song title', set, 'song', { slice: 'settings' }),
          field('Release date (a Friday)', set, 'releaseDate', { slice: 'settings', type: 'date', onInput: () => setTimeout(draw, 400) }),
          field('Universal handle', set, 'handle', { slice: 'settings', placeholder: '@…' }),
          field('Smart link', set, 'link', { slice: 'settings', placeholder: 'https://' }),
          field('Artist email', set, 'email', { slice: 'settings', placeholder: 'never your personal address' }),
          field('City', set, 'city', { slice: 'settings' }),
          field('Genre', set, 'genre', { slice: 'settings' }))),

      card(cardHead('For fans of'),
        field(null, set, 'comps', { slice: 'settings', multiline: true,
          placeholder: 'Three comparison artists. Every pitch, bio, ad audience and playlist submission derives from this one sentence.' })),

      card(cardHead('Codes & partners'),
        h('div', { class: 'grid g2' },
          field('ISRC', set, 'isrc', { slice: 'settings', cls: 'mono' }),
          field('UPC / EAN', set, 'upc', { slice: 'settings', cls: 'mono' }),
          field('Label name', set, 'label', { slice: 'settings' }),
          field('Distributor', set, 'distributor', { slice: 'settings' }),
          field('PRO', set, 'pro', { slice: 'settings' }),
          field('Publisher / admin', set, 'publisher', { slice: 'settings' }))),

      card(cardHead('Appearance'),
        selectField('Theme', set, 'theme', [['dark', 'Dark'], ['light', 'Light']], {
          slice: 'settings',
          onChange: (v) => { document.documentElement.dataset.theme = v; },
        })));
  }

  /* ---------- backup ---------- */

  function backupPane() {
    const box = h('div');

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
