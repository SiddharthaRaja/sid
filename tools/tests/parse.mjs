import { parse } from 'acorn'; import fs from 'fs'; import path from 'path';
const root='/home/claude/sid/js'; let bad=0;
(function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);
 if(e.isDirectory()) walk(p); else if(p.endsWith('.js')){
  try{ parse(fs.readFileSync(p,'utf8'),{ecmaVersion:'latest',sourceType:'module'}); }
  catch(err){ bad++; console.log('PARSE', p, err.message); } }}})(root);
console.log(bad?`${bad} files fail`:'parses clean');
