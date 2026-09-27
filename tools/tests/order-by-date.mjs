/* The list orders itself by the T value. Change an entry's date and
   it moves — no button, no save step. */
import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:8778/';
const results = [];
const ok = (n, c, d = '') => results.push([c, n, d]);

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});

/* deliberately stored out of order, the way a renumber leaves them */
const items = [
  { id: 'a', title: 'Diary 1', body: '1\nfirst', status: 'draft', when: 'T-10', tags: '', notes: '', media: [] },
  { id: 'b', title: 'Diary 2', body: '2\nsecond', status: 'draft', when: 'T-30', tags: '', notes: '', media: [] },
  { id: 'c', title: 'Diary 3', body: '3\nthird', status: 'draft', when: 'T+5', tags: '', notes: '', media: [] },
  { id: 'd', title: 'Diary 4', body: '4\nfourth', status: 'draft', when: 'T', tags: '', notes: '', media: [] },
  { id: 'e', title: 'Diary 5', body: '5\nfifth', status: 'draft', when: 'T-20', tags: '', notes: '', media: [] },
  { id: 'f', title: 'No date yet', body: 'just made this', status: 'draft', when: '', tags: '', notes: '', media: [] },
];

async function boot(its = items) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript((x) => {
    if (localStorage.getItem('seeded')) return;
    localStorage.setItem('seeded', '1');
    const rec = (v) => JSON.stringify({ v, at: Date.now(), seq: 1 });
    localStorage.setItem('sid.v2.local.slice.p_x',
      rec({ content: { thread: x }, setupDone: {}, notes: '', stats: [], handle: '', profileUrl: '' }));
    localStorage.setItem('sid.v2.local.slice.settings',
      rec({ artist: 'Si', song: "She Won't", releaseDate: '2026-12-01', mode: 'execution',
            themeMode: 'dark', accent: 'ember', seedsRemoved: true, textTitlesCleared: true, diaryResequenced: true, diaryFilled: true }));
  }, its);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 25000 });
  await page.waitForTimeout(1200);
  return { ctx, page, errors };
}

const titles = (page) => page.evaluate(() =>
  [...document.querySelectorAll('#view .item-title')].map(t => t.textContent));

/* ---- 1. it opens in date order ---------------------------------- */
{
  const { ctx, page, errors } = await boot();
  await page.evaluate(() => { location.hash = '#/p/x/thread'; });
  await page.waitForTimeout(1200);
  const t = await titles(page);
  ok('1 the list is in T order, not the order it is stored in',
    JSON.stringify(t) === JSON.stringify(
      ['No date yet', 'Diary 2', 'Diary 5', 'Diary 1', 'Diary 4', 'Diary 3']),
    JSON.stringify(t));
  ok('1b an undated one stays at the top where you can see it',
    t[0] === 'No date yet', t[0]);
  ok('1c no errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await ctx.close();
}

/* ---- 2. change a T value and it moves ---------------------------- */
{
  const { ctx, page } = await boot();
  await page.evaluate(() => { location.hash = '#/p/x/thread'; });
  await page.waitForTimeout(1200);

  const moved = await page.evaluate(async () => {
    const S = window.Sid.S;
    /* Diary 3 is last at T+5 — put it first */
    S.get('p_x').content.thread.find(x => x.id === 'c').when = 'T-45';
    S.touch('p_x');
    await new Promise(r => setTimeout(r, 400));
    /* re-enter the tab, which is what any edit does when the sheet closes */
    location.hash = '#/p/x/setup';
    await new Promise(r => setTimeout(r, 500));
    location.hash = '#/p/x/thread';
    await new Promise(r => setTimeout(r, 900));
    return [...document.querySelectorAll('#view .item-title')].map(t => t.textContent);
  });
  ok('2 moving an entry to T-45 puts it at the front',
    moved[1] === 'Diary 3', JSON.stringify(moved));
  ok('2b and the rest keep their order',
    JSON.stringify(moved.slice(2)) === JSON.stringify(['Diary 2', 'Diary 5', 'Diary 1', 'Diary 4']),
    JSON.stringify(moved));
  await ctx.close();
}

/* ---- 3. editing the date in the sheet reorders on close ---------- */
{
  const { ctx, page } = await boot();
  await page.evaluate(() => { location.hash = '#/p/x/thread'; });
  await page.waitForTimeout(1200);
  const after = await page.evaluate(async () => {
    /* open Diary 2 (currently first dated, T-30) and push it late */
    const row = [...document.querySelectorAll('#view .item')]
      .find(i => i.querySelector('.item-title').textContent === 'Diary 2');
    row.click();
    await new Promise(r => setTimeout(r, 700));
    const S = window.Sid.S;
    S.get('p_x').content.thread.find(x => x.id === 'b').when = 'T+60';
    S.touch('p_x');
    /* close the sheet the way Done does */
    [...document.querySelectorAll('.modal-foot .btn')].find(b => /Done/.test(b.textContent))?.click();
    await new Promise(r => setTimeout(r, 900));
    return [...document.querySelectorAll('#view .item-title')].map(t => t.textContent);
  });
  ok('3 changing the date in the editor moves it as soon as you close',
    after[after.length - 1] === 'Diary 2', JSON.stringify(after));
  await ctx.close();
}

/* ---- 4. a fixed calendar date sorts among the offsets ------------ */
{
  const withISO = items.concat([{
    id: 'g', title: 'Fixed day', body: 'x', status: 'draft',
    when: '2026-11-21', tags: '', notes: '', media: [],   // release is 2026-12-01 → T-10
  }]);
  const { ctx, page } = await boot(withISO);
  await page.evaluate(() => { location.hash = '#/p/x/thread'; });
  await page.waitForTimeout(1200);
  const t = await titles(page);
  const iFixed = t.indexOf('Fixed day');
  ok('4 a real date sorts on the day it lands on, among the offsets',
    iFixed > t.indexOf('Diary 5') && iFixed < t.indexOf('Diary 4'), JSON.stringify(t));
  await ctx.close();
}

/* ---- 5. it survives a reload, and nothing was rewritten ---------- */
{
  const { ctx, page } = await boot();
  await page.evaluate(() => { location.hash = '#/p/x/thread'; });
  await page.waitForTimeout(1200);
  const stored = await page.evaluate(() =>
    window.Sid.S.get('p_x').content.thread.map(x => x.id));
  ok('5 the stored order is untouched — this is how it is read, not a rewrite',
    JSON.stringify(stored) === JSON.stringify(['a', 'b', 'c', 'd', 'e', 'f']),
    JSON.stringify(stored));

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 25000 });
  await page.waitForTimeout(1000);
  await page.evaluate(() => { location.hash = '#/p/x/thread'; });
  await page.waitForTimeout(1200);
  const t = await titles(page);
  ok('5b and it is still in date order after a reload',
    t[1] === 'Diary 2' && t[t.length - 1] === 'Diary 3', JSON.stringify(t));
  await ctx.close();
}

/* ---- 6. it applies everywhere, not just the diary ---------------- */
{
  const { ctx, page } = await boot();
  const r = await page.evaluate(async () => {
    const S = window.Sid.S;
    const ig = S.get('p_instagram');
    ig.content = ig.content || {};
    ig.content.caption = [
      { id: 'c1', title: 'Late one', body: '', status: 'draft', when: 'T+3', tags: '', notes: '', media: [] },
      { id: 'c2', title: 'Early one', body: '', status: 'draft', when: 'T-7', tags: '', notes: '', media: [] },
    ];
    S.touch('p_instagram');
    location.hash = '#/p/instagram';
    await new Promise(r => setTimeout(r, 1300));
    return [...document.querySelectorAll('#view .item-title')].map(t => t.textContent);
  });
  ok('6 captions order by date too', JSON.stringify(r) === JSON.stringify(['Early one', 'Late one']),
    JSON.stringify(r));
  await ctx.close();
}

await browser.close();
let bad = 0;
for (const [pass, name, detail] of results) {
  if (!pass) bad++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${pass ? '' : '   << ' + detail}`);
}
console.log(bad ? `\n${bad} FAILED` : `\nall ${results.length} passed`);
process.exit(bad ? 1 : 0);
