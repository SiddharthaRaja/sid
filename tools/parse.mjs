import { parse } from 'acorn';
import fs from 'fs';
for (const f of process.argv.slice(2)) {
  const src = fs.readFileSync(f, 'utf8');
  try { parse(src, { ecmaVersion: 2022, sourceType: 'module' }); console.log('OK  ', f); }
  catch (e) {
    const line = src.split('\n')[(e.loc?.line || 1) - 1];
    console.log('BAD ', f, e.message);
    console.log('     >', line);
  }
}
