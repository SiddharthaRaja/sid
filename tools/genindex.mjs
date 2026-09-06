/* Regenerates js/data/history/index.js from whatever article files exist.
   Run: node tools/genindex.mjs                                            */
import { readdirSync, writeFileSync } from 'fs';
const dir = 'js/data/history';
const files = readdirSync(dir).filter(f => /^[ga]\d+\.js$/.test(f)).sort();
const imports = files.map((f, i) => `import { ARTICLES as A${i} } from './${f}';`).join('\n');
const spread = files.map((_, i) => `  ...A${i},`).join('\n');
writeFileSync(`${dir}/index.js`, `/* ============================================================
   index.js — generated. Do not edit by hand.
   Run \`node tools/genindex.mjs\` after adding an article file.
   ${files.length} source file(s).
   ============================================================ */

${imports}

export const ARTICLES = [
${spread}
];

export const SECTIONS = [
  { key: 'genres',  label: 'Genres & movements' },
  { key: 'artists', label: 'Artists' },
];

export const GROUPS = (section) => [...new Set(
  ARTICLES.filter(a => a.section === section).map(a => a.group))];

export const byId = (id) => ARTICLES.find(a => a.id === id);
`);
console.log('index.js written:', files.length, 'files');
