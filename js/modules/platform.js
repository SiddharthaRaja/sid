/* ============================================================
   platform.js — one module, every platform tab
   Sub-tabs: [content types…] · Setup · Stats · Info · Notes
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, btn, card, cardHead, empty, field, subtabs, stat, fmtNum, uid,
  toast, prose, confirmDelete, todayISO, fmtDate,
} from '../ui.js';
// (the platform header that used these is gone — see renderPlatform)
import { contentList, checklist, notesPanel, infoPanel, linkList } from './shared.js';
import { INFO } from '../data/info.js';
import { SMALL_PLATFORMS } from '../data/platforms.js';
import { statsPanel } from './stats.js';
import { pitchPanel } from './pitch.js';
import { spotifyProfilePanel } from './sprofile.js';

export function renderPlatform(p, sub, openId) {
  const slice = `p_${p.key}`;
  const store = S.get(slice);
  const root = h('div');

  const tabs = [
    ...p.types.map(t => [t.key, t.label]),
    /* Spotify gets one extra tab. The editorial pitch is the only
       deadline in the release that cannot be recovered from once
       missed, so it lives on the platform page rather than buried
       in a checklist. */
    ...(p.key === 'spotify' ? [['epitch', 'Editorial pitch'], ['profile', 'Profile & unlocks']] : []),
    ['setup', 'Setup'],
    ['stats', 'Stats'],
    ['info', 'Info'],
    ['notes', 'Notes'],
  ];
  let active = tabs.some(t => t[0] === sub) ? sub : tabs[0][0];

  /* Nothing to refresh: the counts used to live in a header that is
     gone. Kept as a no-op so the panels that report changes do not
     all need rewiring. */
  const refreshHeader = () => {};

  const draw = () => {
    clear(root);

    /* No page header here on purpose. It was a giant platform name
       (already in the title bar above it), a count, and two fat input
       boxes for the handle and profile URL — together half a phone
       screen, every time, for two fields you set once. The tabs start
       at the top instead, and the account fields moved into Setup. */
    root.append(subtabs(tabs, active, (k) => {
      active = k;
      openId = null;                       // a tab change is not a deep link
      history.replaceState(null, '', `#/p/${p.key}/${k}`);
      draw();
    }));

    const type = p.types.find(t => t.key === active);
    if (type) {
      /* Consumed once: opening the item rewrites the hash back to the
         plain tab, so a reload or a back-tap does not reopen it. */
      const want = openId; openId = null;
      if (want) history.replaceState(null, '', `#/p/${p.key}/${active}`);
      root.append(contentList({ slice, store, type, pathHint: `${p.key}/${type.key}`, platformKey: p.key, onChanged: refreshHeader, openId: want }));
    } else if (active === 'epitch') {
      root.append(pitchPanel());
    } else if (active === 'profile') {
      root.append(spotifyProfilePanel());
    } else if (active === 'setup') {
      root.append(setupPanel(p, store, slice, refreshHeader));
    } else if (active === 'stats') {
      root.append(statsPanel(p, store, slice));
    } else if (active === 'info') {
      root.append(infoPanel(INFO[p.key] || [{ title: 'Overview', body: '_No reference written for this tab yet._' }]));
    } else {
      root.append(notesPanel(store, slice, `${p.name} notes`));
    }
  };

  draw();
  return root;
}

/* ---------- setup checklist ---------- */

function setupPanel(p, store, slice, onChanged) {
  const box = h('div');
  store.setupDone = store.setupDone || {};

  /* Your account on this platform. Two fields you fill in once, so
     they belong here rather than across the top of every screen. */
  box.append(card(
    cardHead(`Your ${p.name} account`,
      store.profileUrl
        ? h('a', { class: 'btn btn-sm', href: store.profileUrl, target: '_blank', rel: 'noopener' }, 'Open it')
        : null),
    h('div', { class: 'grid g2' },
      field('Handle', store, 'handle', { slice, placeholder: '@you' }),
      field('Profile URL', store, 'profileUrl', { slice, placeholder: 'https://…' }))));

  box.append(card(
    cardHead('Profile setup'),
    checklist(p.setup, store.setupDone, slice, { onChange: onChanged })));

  if (p.key === 'smallplatforms') {
    box.append(card(
      cardHead('Platforms in this tab'),
      h('div', { class: 'table-wrap' },
        h('table', { class: 'tbl' },
          h('thead', {}, h('tr', {}, ['Platform', 'Region', 'Live', 'Link'].map(t => h('th', { text: t })))),
          h('tbody', {}, SMALL_PLATFORMS.map((sp, i) => {
            const k = `sp_${i}`;
            return h('tr', {},
              h('td', { text: sp.name }),
              h('td', { class: 'muted', text: sp.region }),
              h('td', {}, h('input', {
                type: 'checkbox', checked: !!store.setupDone[k],
                onChange: (e) => { store.setupDone[k] = e.target.checked; S.touch(slice); },
                style: { accentColor: 'var(--accent)' },
              })),
              h('td', {}, h('a', { href: sp.url, target: '_blank', rel: 'noopener', text: 'open' })));
          }))))));
  }

  return box;
}
