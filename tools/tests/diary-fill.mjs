/* The hundred-slot diary fill. Run against a faithful copy of the
   real data: 31 entries on X, "Diary 1".."Diary 31", T-30 → T+1. */
import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:8778/';
const results = [];
const ok = (n, c, d = '') => results.push([c, n, d]);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });

/* his run: Diary 1 @ T-30 … Diary 31 @ T+1, one a day, skipping T0 */
function realX() {
  const items = [];
  let off = -30;
  for (let n = 1; n <= 31; n++) {
    items.push({ id: 'd' + n, title: `Diary ${n}`, body: `${n}\nsomething I wrote`, status: 'draft',
      when: off === 0 ? 'T+1' : (off < 0 ? `T${off}` : `T+${off}`), tags: '', notes: '', media: [] });
    off++;
    if (off === 0) off = 1;
  }
  return items;
}

async function boot(seed = true) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => ok('pageerror: ' + e.message, false));
  if (seed) {
    await page.addInitScript((items) => {
      const rec = (v) => JSON.stringify({ v, at: Date.now(), seq: 1 });
      localStorage.setItem('sid.v2.local.slice.p_x',
        rec({ content: { thread: items }, setupDone: {}, notes: '', stats: [], handle: '', profileUrl: '' }));
      localStorage.setItem('sid.v2.local.slice.settings',
        rec({ artist: 'Si', song: "She Won't", releaseDate: '2026-12-01', mode: 'execution',
              themeMode: 'dark', accent: 'ember', seedsRemoved: true }));
    }, realX());
  }
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 25000 });
  await page.waitForTimeout(900);
  return { ctx, page };
}

const read = (page) => page.evaluate(() => {
  const g = (p, t) => (window.Sid.S.get(`p_${p}`).content?.[t] || []);
  const no = (s) => { const m = String(s).match(/^Diary\s*(\d+)/i); return m ? +m[1] : null; };
  const pack = (arr) => arr.map(i => ({ n: no(i.title), title: i.title, when: i.when, body: i.body, gen: !!i.gen, status: i.status }));
  return { x: pack(g('x', 'thread')), threads: pack(g('threads', 'journal')), bluesky: pack(g('bluesky', 'diary')) };
});

/* ---- 1. the fill runs on its own, once ------------------------- */
{
  const { ctx, page } = await boot();
  const d = await read(page);

  ok('1 X now has 100 numbered entries', d.x.length === 100, 'n=' + d.x.length);
  ok('1b Threads has 100', d.threads.length === 100, 'n=' + d.threads.length);
  ok('1c Bluesky has 100', d.bluesky.length === 100, 'n=' + d.bluesky.length);

  ok('1d they are numbered 1 to 100 with no gaps and no duplicates',
    JSON.stringify(d.x.map(i => i.n).sort((a, b) => a - b)) ===
    JSON.stringify([...Array(100)].map((_, i) => i + 1)), 'x numbers wrong');

  /* the 31 he wrote must be untouched */
  const mine = d.x.filter(i => i.n <= 31);
  ok('1e the 31 entries he wrote are all still there', mine.length === 31, 'n=' + mine.length);
  ok('1f with their text intact',
    mine.every(i => /something I wrote/.test(i.body)), 'a body was changed');
  ok('1g and their dates untouched',
    d.x.find(i => i.n === 1).when === 'T-30' && d.x.find(i => i.n === 31).when === 'T+1',
    JSON.stringify([d.x.find(i => i.n === 1).when, d.x.find(i => i.n === 31).when]));
  ok('1h and not marked as generated', mine.every(i => !i.gen), 'one of his was tagged');
  await ctx.close();
}

/* ---- 2. the new slots look like his ---------------------------- */
{
  const { ctx, page } = await boot();
  const d = await read(page);
  const n32 = d.x.find(i => i.n === 32);
  const n100 = d.x.find(i => i.n === 100);

  ok('2 slot 32 is titled "Diary 32"', n32.title === 'Diary 32', n32.title);
  ok('2b its body starts with the number on its own line', n32.body === '32\n', JSON.stringify(n32.body));
  ok('2c it is a draft', n32.status === 'draft', n32.status);

  /* one a day from T+1 → 100 is 69 days later */
  ok('2d slot 32 continues the run at T+2', n32.when === 'T+2', n32.when);
  ok('2e slot 100 lands at T+70', n100.when === 'T+70', n100.when);
  /* he guessed "approximately T+71" from memory — check we land near
     it rather than checking a constant against a constant */
  const got = parseInt(String(n100.when).replace('T+', ''), 10);
  ok('2f which is within a couple of days of the T+71 he guessed',
    Math.abs(got - 71) <= 2, 'got T+' + got);
  await ctx.close();
}

/* ---- 3. the other two platforms match X's dates ---------------- */
{
  const { ctx, page } = await boot();
  const d = await read(page);
  const byN = (arr) => Object.fromEntries(arr.map(i => [i.n, i.when]));
  const x = byN(d.x), t = byN(d.threads), b = byN(d.bluesky);
  const mismatch = [];
  for (let n = 1; n <= 100; n++) {
    if (t[n] !== x[n]) mismatch.push(`threads ${n}: ${t[n]} vs ${x[n]}`);
    if (b[n] !== x[n]) mismatch.push(`bluesky ${n}: ${b[n]} vs ${x[n]}`);
  }
  ok('3 Threads and Bluesky are dated exactly like X', mismatch.length === 0, mismatch.slice(0, 3).join(' | '));
  ok('3b and start empty, for writing in each voice',
    d.threads.every(i => i.body === `${i.n}\n`), 'a Threads body was pre-filled');
  await ctx.close();
}

/* ---- 4. it never runs twice ------------------------------------ */
{
  const { ctx, page } = await boot();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 25000 });
  await page.waitForTimeout(900);
  const d = await read(page);
  ok('4 a second launch adds nothing', d.x.length === 100 && d.threads.length === 100,
    JSON.stringify({ x: d.x.length, t: d.threads.length }));
  const dupes = d.x.map(i => i.n).filter((v, i, a) => a.indexOf(v) !== i);
  ok('4b and creates no duplicates', dupes.length === 0, JSON.stringify(dupes.slice(0, 5)));
  await ctx.close();
}

/* ---- 5. a snapshot was taken first ----------------------------- */
{
  const { ctx, page } = await boot();
  const snaps = await page.evaluate(async () => {
    const { rows } = await window.Sid.S.listSnapshots();
    return rows.filter(r => /pre-diary-fill/.test(r.label || '')).length;
  });
  ok('5 a snapshot was written before anything was added', snaps > 0, 'snapshots=' + snaps);
  await ctx.close();
}

/* ---- 6. undo removes only what was never written in ------------ */
{
  const { ctx, page } = await boot();
  const r = await page.evaluate(async () => {
    const D = await import('./js/diary.js');
    const S = window.Sid.S;
    /* write into slot 40, leave the rest alone */
    const list = S.get('p_x').content.thread;
    const forty = list.find(i => /^Diary 40$/.test(i.title));
    forty.body = '40\nI wrote in this one.';
    S.touch('p_x');
    await new Promise(r => setTimeout(r, 300));

    const removed = D.undo();
    const after = S.get('p_x').content.thread;
    return {
      removed,
      left: after.length,
      keptMine: after.filter(i => (D.diaryNo(i.title) || 0) <= 31).length,
      kept40: after.some(i => /^Diary 40$/.test(i.title)),
      threadsLeft: S.get('p_threads').content.journal.length,
    };
  });
  ok('6 undo removes the untouched slots', r.removed > 180, 'removed=' + r.removed);
  ok('6b his 31 entries survive it', r.keptMine === 31, 'kept=' + r.keptMine);
  ok('6c the slot he typed into survives it', r.kept40, String(r.kept40));
  ok('6d X is back to 32 entries — his 31 plus the one he wrote',
    r.left === 32, 'left=' + r.left);
  ok('6e and Threads is emptied of unwritten slots', r.threadsLeft === 0, 'left=' + r.threadsLeft);
  await ctx.close();
}

/* ---- 7. nothing happens if there is no run to extend ----------- */
{
  const { ctx, page } = await boot(false);
  const d = await read(page);
  ok('7 with no diary on X, nothing is invented anywhere',
    d.x.length === 0 && d.threads.length === 0 && d.bluesky.length === 0,
    JSON.stringify({ x: d.x.length, t: d.threads.length, b: d.bluesky.length }));
  await ctx.close();
}

/* ---- 8. Bluesky has a Diary tab to put them in ----------------- */
{
  const { ctx, page } = await boot();
  const tabs = await page.evaluate(async () => {
    location.hash = '#/p/bluesky';
    await new Promise(r => setTimeout(r, 700));
    return [...document.querySelectorAll('#view .subtabs .subtab')].map(t => t.textContent.trim());
  });
  ok('8 Bluesky has a Diary tab', tabs.includes('Diary'), JSON.stringify(tabs));

  const shown = await page.evaluate(async () => {
    location.hash = '#/p/bluesky/diary';
    await new Promise(r => setTimeout(r, 800));
    return document.querySelector('#view').textContent.includes('Diary 100');
  });
  ok('8b and the entries show up in it', shown, String(shown));
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
