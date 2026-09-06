/* ============================================================
   index.js — generated. Do not edit by hand.
   Run `node tools/genindex.mjs` after adding an article file.
   13 source file(s).
   ============================================================ */

import { ARTICLES as A0 } from './a1.js';
import { ARTICLES as A1 } from './a2.js';
import { ARTICLES as A2 } from './a3.js';
import { ARTICLES as A3 } from './a4.js';
import { ARTICLES as A4 } from './a5.js';
import { ARTICLES as A5 } from './a6.js';
import { ARTICLES as A6 } from './g1.js';
import { ARTICLES as A7 } from './g2.js';
import { ARTICLES as A8 } from './g3.js';
import { ARTICLES as A9 } from './g4.js';
import { ARTICLES as A10 } from './g5.js';
import { ARTICLES as A11 } from './g6.js';
import { ARTICLES as A12 } from './g7.js';

export const ARTICLES = [
  ...A0,
  ...A1,
  ...A2,
  ...A3,
  ...A4,
  ...A5,
  ...A6,
  ...A7,
  ...A8,
  ...A9,
  ...A10,
  ...A11,
  ...A12,
];

export const SECTIONS = [
  { key: 'genres',  label: 'Genres & movements' },
  { key: 'artists', label: 'Artists' },
];

export const GROUPS = (section) => [...new Set(
  ARTICLES.filter(a => a.section === section).map(a => a.group))];

export const byId = (id) => ARTICLES.find(a => a.id === id);
