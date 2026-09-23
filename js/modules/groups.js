/* ============================================================
   groups.js — the category screens

   The app used to open on Today: a list of things that were due,
   almost all of which were dates this app had invented rather than
   dates anyone had chosen. A screen that confidently tells you what
   is overdue, about work you never agreed to, is worse than no
   screen — it trains you to ignore it.

   So the phone now opens on a category instead, and every category
   is the same thing: a grid of large buttons, one per destination.
   No summary, no deadlines, no opinions. You came here to open
   something; this opens it in one tap.
   ============================================================ */

import * as S from '../store.js';
import { h, clear } from '../ui.js';
import { icon, PCOLORS } from '../icons.js';
import { PLATFORMS, platformsIn } from '../data/platforms.js';

/* A tile counts what is in the thing it opens, because "Instagram"
   and "Instagram · 34 drafts" are different amounts of information
   for the same tap. */
function platformCount(key) {
  const sl = S.get(`p_${key}`);
  let n = 0, posted = 0;
  Object.values(sl.content || {}).forEach(items => {
    (items || []).forEach(it => { n++; if (it.status === 'posted') posted++; });
  });
  return { n, posted };
}

export function tile(label, hash, ico, { color, note, badge } = {}) {
  return h('a', { class: 'tile', href: hash },
    h('span', { class: 'tile-ico', html: icon(ico), style: color ? { color } : {} }),
    h('span', { class: 'tile-label', text: label }),
    note ? h('span', { class: 'tile-note', text: note }) : null,
    badge ? h('span', { class: 'tile-badge', text: badge }) : null);
}

export function tileGrid(tiles) {
  return h('div', { class: 'tiles' }, tiles);
}

function head(title, sub) {
  return h('div', { class: 'page-head' },
    h('div', {}, h('h1', { text: title }), sub ? h('div', { class: 'sub', text: sub }) : null),
    h('div', { class: 'spacer' }));
}

/* ---------------------------------------------------------- */
/*  a platform group: Social, Text, DSPs                       */
/* ---------------------------------------------------------- */

const GROUP_BLURB = {
  Social: 'Where the reach comes from.',
  Text: 'Where the diary lives.',
  DSPs: 'Where the song sits once it is out.',
};

export function renderGroup(group) {
  const root = h('div');
  const list = platformsIn(group);

  root.append(head(group, GROUP_BLURB[group] || ''));
  root.append(tileGrid(list.map(p => {
    const { n, posted } = platformCount(p.key);
    return tile(p.name, `#/p/${p.key}`, p.icon, {
      color: PCOLORS[p.key],
      note: n ? `${n} item${n === 1 ? '' : 's'}${posted ? ` · ${posted} posted` : ''}` : 'nothing yet',
    });
  })));
  return root;
}

/* ---------------------------------------------------------- */
/*  More — everything that is not a platform                   */
/* ---------------------------------------------------------- */

export function renderMoreGrid(items) {
  const root = h('div');
  root.append(head('More', 'Everything else, one tap away.'));
  root.append(tileGrid(items.map(([label, hash, ico, color]) =>
    tile(label, hash, ico, { color }))));
  return root;
}

/* ---------------------------------------------------------- */
/*  Apps — the two guests                                      */
/* ---------------------------------------------------------- */

export function renderApps() {
  const root = h('div');
  const songs = (S.get('notepad').songs || []).length;
  root.append(head('Apps', 'Separate apps that happen to live in the same shell.'));
  root.append(tileGrid([
    tile('Notepad', '#/np', 'notepad', { note: songs ? `${songs} song${songs === 1 ? '' : 's'}` : 'nothing yet' }),
    tile('Svara', '#/sv', 'svara', { note: 'voice practice' }),
  ]));
  return root;
}
