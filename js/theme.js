/* ============================================================
   theme.js — light / dark / system, plus an accent colour

   Two small controls, nine looks. The surface mode and the accent
   are stored separately so changing one never resets the other.
   ============================================================ */

import * as S from './store.js';
import { $$ } from './ui.js';

export const THEME_MODES = [
  ['system', 'Match my device'],
  ['light',  'Light'],
  ['dark',   'Dark'],
];

export const ACCENTS = [
  ['ember',  'Ember',  '#e0603a'],
  ['ocean',  'Ocean',  '#3b82c4'],
  ['forest', 'Forest', '#3f9c6b'],
  ['plum',   'Plum',   '#8a5cc4'],
];

const mq = () => window.matchMedia('(prefers-color-scheme: dark)');

/** What the settings say, normalised — old saves only had `theme`. */
export function themeMode() {
  const set = S.get('settings');
  if (set.themeMode) return set.themeMode;
  return set.theme === 'light' ? 'light' : 'dark';
}

export const accent = () => S.get('settings').accent || 'ember';

/* How big the interface text is. Every size in the stylesheet is
   derived from one variable, so this moves the whole scale rather
   than one label at a time. */
export const TEXT_SIZES = [
  ['xs',      'Tiny'],
  ['compact', 'Compact'],
  ['normal',  'Normal'],
  ['large',   'Large'],
];
export const textSize = () => S.get('settings').textSize || 'compact';
export function setTextSize(v) {
  S.get('settings').textSize = v;
  S.touch('settings');
  applyTheme();
}

/** system → whichever the device is on right now. */
export function resolvedTheme() {
  const m = themeMode();
  return m === 'system' ? (mq().matches ? 'dark' : 'light') : m;
}

export function applyTheme() {
  const t = resolvedTheme();
  const root = document.documentElement;
  root.dataset.theme = t;
  root.dataset.accent = accent();
  root.dataset.text = textSize();
  document.querySelector('meta[name=theme-color]')
    ?.setAttribute('content', t === 'dark' ? '#000000' : '#f7f6f4');
  // the nav button shows the glyph for what you would switch to
  $$('.ico-moon').forEach(e => e.style.display = t === 'dark' ? '' : 'none');
  $$('.ico-sun').forEach(e => e.style.display = t === 'dark' ? 'none' : '');
}

export function setThemeMode(m) {
  const set = S.get('settings');
  set.themeMode = m;
  set.theme = m === 'system' ? resolvedTheme() : m;   // keep the old field honest
  S.touch('settings');
  applyTheme();
}

export function setAccent(a) {
  const set = S.get('settings');
  set.accent = a;
  S.touch('settings');
  applyTheme();
}

/** Cycle for the one-tap button in the sidebar: light → dark → system. */
export function cycleTheme() {
  const order = ['light', 'dark', 'system'];
  const next = order[(order.indexOf(themeMode()) + 1) % order.length];
  setThemeMode(next);
  return next;
}

/** Follow the device while the mode is "system". */
export function watchSystemTheme() {
  const m = mq();
  const on = () => { if (themeMode() === 'system') applyTheme(); };
  m.addEventListener ? m.addEventListener('change', on) : m.addListener(on);
}
