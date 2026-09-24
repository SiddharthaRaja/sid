import { chromium } from 'playwright';
const R=[]; const ok=(n,c,d='')=>R.push([c,n,d]);
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const ctx = await b.newContext({viewport:{width:390,height:844}});
const p = await ctx.newPage();
p.on('pageerror',e=>ok('pageerror: '+e.message,false));
await p.goto('http://127.0.0.1:8778/',{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>window.Sid&&!document.querySelector('#app').hidden,null,{timeout:25000});

const sizes = () => p.evaluate(()=>{
  const g=(s,pr)=>{const e=document.querySelector(s);return e?parseFloat(getComputedStyle(e)[pr]):null};
  return { fs: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fs')),
           body: parseFloat(getComputedStyle(document.body).fontSize),
           h1: g('#view .page-head h1','fontSize'), small: g('#view .small','fontSize') };
});

await p.evaluate(()=>{location.hash='#/settings'}); await p.waitForTimeout(700);
const def = await sizes();
ok('the default is compact, not the old 14px', def.fs === 13, 'fs='+def.fs);

// an input on mobile is no longer forced to 16
await p.evaluate(()=>{location.hash='#/p/x/tweet'}); await p.waitForTimeout(700);
await p.evaluate(()=>{const btn=[...document.querySelectorAll('#view button')].find(b=>/New tweet/i.test(b.textContent)); btn&&btn.click();});
await p.waitForTimeout(700);
const inp = await p.evaluate(()=>parseFloat(getComputedStyle(document.querySelector('#modal-root .inp')).fontSize));
ok('a field is no longer forced to 16px on a non-iOS phone', inp === 13, 'input='+inp);
const lab = await p.evaluate(()=>parseFloat(getComputedStyle(document.querySelector('#modal-root .field .lab')).fontSize));
ok('and its label scales with it', lab === 10.5, 'label='+lab);
await p.evaluate(()=>{document.querySelector('#modal-root').hidden=true});

// the setting moves everything
for (const [key, expect] of [['xs',11.5],['normal',14],['large',15.5],['compact',13]]) {
  await p.evaluate(async (k)=>{ const T=await import('./js/theme.js'); T.setTextSize(k); }, key);
  await p.evaluate(()=>{location.hash='#/settings'}); await p.waitForTimeout(500);
  const s = await sizes();
  ok(`"${key}" sets the scale to ${expect}px`, s.fs === expect, 'fs='+s.fs);
  if (key==='xs') ok('and headings/captions come down with it', s.h1 < 19 && s.small < 11, JSON.stringify(s));
  if (key==='large') ok('and go back up again', s.h1 > 20 && s.small > 13, JSON.stringify(s));
}

// it survives a reload
await p.reload({waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>window.Sid&&!document.querySelector('#app').hidden,null,{timeout:25000});
await p.waitForTimeout(600);
ok('the choice is remembered', (await sizes()).fs === 13, 'fs='+(await sizes()).fs);

// the iOS guard still exists for iOS
const hasGuard = await p.evaluate(async ()=>{
  const css = await fetch('./css/app.css').then(r=>r.text());
  return /-webkit-touch-callout: none\)\s*\{[\s\S]{0,160}max\(16px/.test(css);
});
ok('iOS still gets its 16px, so Safari will not zoom the page', hasGuard, String(hasGuard));

await b.close();
let bad=0; for(const [pass,n,d] of R){ if(!pass)bad++; console.log(`${pass?'PASS':'FAIL'}  ${n}${pass?'':'   << '+d}`);}
console.log(bad?`\n${bad} FAILED`:`\nall ${R.length} passed`);
process.exit(bad?1:0);
