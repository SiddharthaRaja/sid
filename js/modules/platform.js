/* ============================================================
   platform.js — one module, every platform tab
   Sub-tabs: [content types…] · Setup · Stats · Info · Notes
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, btn, card, cardHead, empty, field, subtabs, stat, fmtNum, uid,
  toast, prose, confirmDelete, todayISO, fmtDate,
} from '../ui.js';
import { icon, PCOLORS } from '../icons.js';
import { contentList, checklist, notesPanel, infoPanel, linkList } from './shared.js';
import { INFO } from '../data/info.js';
import { SMALL_PLATFORMS } from '../data/platforms.js';
import { statsPanel } from './stats.js';
import { pitchPanel } from './pitch.js';

export function renderPlatform(p, sub) {
  const slice = `p_${p.key}`;
  const store = S.get(slice);
  const root = h('div');

  const tabs = [
    ...p.types.map(t => [t.key, t.label]),
    /* Spotify gets one extra tab. The editorial pitch is the only
       deadline in the release that cannot be recovered from once
       missed, so it lives on the platform page rather than buried
       in a checklist. */
    ...(p.key === 'spotify' ? [['epitch', 'Editorial pitch']] : []),
    ['setup', 'Setup'],
    ['stats', 'Stats'],
    ['info', 'Info'],
    ['notes', 'Notes'],
  ];
  let active = tabs.some(t => t[0] === sub) ? sub : tabs[0][0];

  let subEl = null;
  const refreshHeader = () => {
    if (!subEl) return;
    const n = p.types.map(t => (store.content?.[t.key] || []).length).reduce((a, b) => a + b, 0);
    const d = Object.values(store.setupDone || {}).filter(Boolean).length;
    subEl.textContent = `${n} item${n === 1 ? '' : 's'} banked · setup ${d}/${p.setup.length}`;
  };

  const draw = () => {
    clear(root);

    const head = header(p, store, slice);
    subEl = head.querySelector('.sub');
    root.append(head);
    root.append(subtabs(tabs, active, (k) => {
      active = k;
      history.replaceState(null, '', `#/p/${p.key}/${k}`);
      draw();
    }));

    const type = p.types.find(t => t.key === active);
    if (type) {
      root.append(contentList({ slice, store, type, pathHint: `${p.key}/${type.key}`, platformKey: p.key, onChanged: refreshHeader }));
    } else if (active === 'epitch') {
      root.append(pitchPanel());
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

/* ---------- header ---------- */

function header(p, store, slice) {
  const counts = p.types.map(t => (store.content?.[t.key] || []).length).reduce((a, b) => a + b, 0);
  const doneN = Object.values(store.setupDone || {}).filter(Boolean).length;

  return h('div', { class: 'page-head' },
    h('div', { class: 'row', style: { gap: '11px' } },
      h('span', { html: icon(p.icon), style: { color: PCOLORS[p.key], transform: 'scale(1.5)', display: 'flex' } }),
      h('div', {},
        h('h1', { text: p.name }),
        h('div', { class: 'sub', text: `${counts} item${counts === 1 ? '' : 's'} banked · setup ${doneN}/${p.setup.length}` }))),
    h('div', { class: 'spacer' }),
    h('div', { class: 'page-actions' },
      h('input', {
        class: 'inp', style: { maxWidth: '160px' }, placeholder: '@handle',
        value: store.handle || '',
        onInput: (e) => { store.handle = e.target.value; S.touch(slice); },
      }),
      store.profileUrl
        ? h('a', { class: 'btn btn-sm', href: store.profileUrl, target: '_blank', rel: 'noopener' }, 'Open')
        : null,
      h('input', {
        class: 'inp', style: { maxWidth: '190px' }, placeholder: 'profile URL',
        value: store.profileUrl || '',
        onInput: (e) => { store.profileUrl = e.target.value; S.touch(slice); },
      })));
}

/* ---------- setup checklist ---------- */

function setupPanel(p, store, slice, onChanged) {
  const box = h('div');
  store.setupDone = store.setupDone || {};

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
