/* Fail loudly if any field/selectField/checkbox anywhere is missing
   its slice id — the bug that silently dropped edits. */
import { parse } from 'acorn';
import fs from 'node:fs';
import path from 'node:path';
const FNS = { field: 3, selectField: 4, checkbox: 3 };
const bad = [];
function walkDir(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/vendor|node_modules/.test(p)) walkDir(p); continue; }
    if (!e.name.endsWith('.js')) continue;
    const src = fs.readFileSync(p, 'utf8');
    let ast; try { ast = parse(src, { ecmaVersion: 'latest', sourceType: 'module' }); } catch { continue; }
    (function w(n) {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) return n.forEach(w);
      if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && n.callee.name in FNS) {
        const o = n.arguments[FNS[n.callee.name]];
        const okObj = o && o.type === 'ObjectExpression' &&
          o.properties.some(pr => pr.key && (pr.key.name === 'slice' || pr.key.value === 'slice'));
        const dynamic = o && o.type !== 'ObjectExpression';   // spread/variable opts: can't tell statically
        if (!okObj && !dynamic) {
          bad.push(`${p.replace('/home/claude/sid/','')}:${src.slice(0,n.start).split('\n').length} ${n.callee.name}()`);
        }
      }
      for (const k in n) if (!['type','start','end'].includes(k)) w(n[k]);
    })(ast);
  }
}
walkDir('/home/claude/sid/js');
if (bad.length) { console.log('MISSING slice:\n' + bad.join('\n')); process.exit(1); }
console.log('every field/selectField/checkbox declares its slice');
