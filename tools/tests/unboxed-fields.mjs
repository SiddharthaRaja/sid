/* Fields with no box still have to be findable and usable. */
import { chromium } from 'playwright';
const URL='http://127.0.0.1:8778/';
const results=[]; const ok=(n,c,d='')=>results.push([c,n,d]);
const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });

async function boot(theme='dark', w=390){
  const ctx = await browser.newContext({ viewport:{width:w,height:844} });
  const page = await ctx.newPage();
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript((t) => {
    if (localStorage.getItem('seeded')) return; localStorage.setItem('seeded','1');
    const rec=(v)=>JSON.stringify({v,at:Date.now(),seq:1});
    localStorage.setItem('sid.v2.local.slice.p_x', rec({content:{thread:[
      {id:'d1',title:'',body:'1\nsomething written\n#1',status:'draft',when:'T-30',tags:'bts',notes:'',media:[]}]},
      setupDone:{},notes:'',stats:[],handle:'',profileUrl:''}));
    localStorage.setItem('sid.v2.local.slice.settings', rec({artist:'Si',song:"She Won't",releaseDate:'2026-12-01',
      mode:'execution',themeMode:t,accent:'ember',seedsRemoved:true,diaryFilled:true,textTitlesCleared:true,diaryResequenced:true}));
  }, theme);
  await page.goto(URL,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.Sid&&!document.querySelector('#app').hidden,null,{timeout:25000});
  await page.waitForTimeout(1200);
  return {ctx,page,errors};
}
const openEd = (page) => page.evaluate(async()=>{ location.hash='#/p/x/thread'; await new Promise(r=>setTimeout(r,1300));
  document.querySelector('#view .item').click(); await new Promise(r=>setTimeout(r,800)); });

for (const theme of ['dark','light']) {
  const {ctx,page,errors} = await boot(theme);
  await openEd(page);
  const r = await page.evaluate(() => {
    const ta = document.querySelector('.modal textarea');
    const line = [...document.querySelectorAll('.modal input')].find(i=>/hook, bts/.test(i.placeholder||''));
    const sel = document.querySelector('.modal select');
    const cs = (e)=>getComputedStyle(e);
    const px = (v)=>parseFloat(v)||0;
    return {
      taBorder: px(cs(ta).borderTopWidth)+px(cs(ta).borderBottomWidth),
      taBg: cs(ta).backgroundColor,
      taW: Math.round(ta.getBoundingClientRect().width),
      bodyW: Math.round(document.querySelector('.modal-body').getBoundingClientRect().width),
      lineRule: px(cs(line).borderBottomWidth),
      lineRuleColor: cs(line).borderBottomColor,
      selBorder: px(cs(sel).borderTopWidth),
      placeholder: ta.placeholder || '',
    };
  });
  ok(`${theme}: the writing area has no box at all`, r.taBorder === 0, 'border='+r.taBorder);
  ok(`${theme}: and no fill behind it`, /rgba\(0, 0, 0, 0\)|transparent/.test(r.taBg), r.taBg);
  ok(`${theme}: it uses the full width of the sheet`, r.bodyW - r.taW <= 34, `${r.taW} of ${r.bodyW}`);
  ok(`${theme}: a single-line field is still marked by a rule`, r.lineRule > 0, 'rule='+r.lineRule);
  ok(`${theme}: that rule is visible against the page`,
    !/rgba\(0, 0, 0, 0\)/.test(r.lineRuleColor), r.lineRuleColor);
  ok(`${theme}: a select still reads as a control`, r.selBorder > 0, 'border='+r.selBorder);
  ok(`${theme}: no errors`, errors.length===0, errors.slice(0,2).join(' | '));
  await ctx.close();
}

/* focus has to be obvious when there is no box */
{
  const {ctx,page} = await boot('dark');
  await openEd(page);
  const r = await page.evaluate(async () => {
    const line = [...document.querySelectorAll('.modal input')].find(i=>/hook, bts/.test(i.placeholder||''));
    const before = getComputedStyle(line).borderBottomColor;
    line.focus();
    await new Promise(z=>setTimeout(z,250));
    return { before, after: getComputedStyle(line).borderBottomColor };
  });
  ok('focusing a field changes its rule so you can see where you are',
    r.before !== r.after, JSON.stringify(r));
  await ctx.close();
}

/* and typing still saves through all of it */
{
  const {ctx,page} = await boot('dark');
  await openEd(page);
  const r = await page.evaluate(async () => {
    const ta = document.querySelector('.modal textarea');
    ta.focus(); ta.value = ta.value + ' more'; ta.dispatchEvent(new Event('input',{bubbles:true}));
    const tags = [...document.querySelectorAll('.modal input')].find(i=>/hook, bts/.test(i.placeholder||''));
    tags.value = 'mix'; tags.dispatchEvent(new Event('input',{bubbles:true}));
    await new Promise(z=>setTimeout(z,500));
    const it = window.Sid.S.get('p_x').content.thread[0];
    return { body: it.body, tags: it.tags };
  });
  ok('typing into an unboxed field still saves', / more/.test(r.body), r.body.slice(-20));
  ok('and so does a single-line one', r.tags === 'mix', r.tags);
  await ctx.close();
}

await browser.close();
let bad=0;
for (const [pass,name,detail] of results){ if(!pass) bad++; console.log(`${pass?'PASS':'FAIL'}  ${name}${pass?'':'   << '+detail}`); }
console.log(bad?`\n${bad} FAILED`:`\nall ${results.length} passed`);
process.exit(bad?1:0);
