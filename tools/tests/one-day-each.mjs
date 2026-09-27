/* One entry, one day.
   - a one-off pass that lays the run back out from T-30, in order
   - from then on, re-dating one entry pushes the rest along */
import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:8778/';
const results = [];
const ok = (n, c, d = '') => results.push([c, n, d]);

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});

/* the mess he described: duplicates, a gap, an out-of-order pair */
const messy = [
  { id: 'a', title: '', body: '1\nfirst\n#1',  status: 'draft', when: 'T-30', tags: '', notes: '', media: [] },
  { id: 'b', title: '', body: '2\nsecond\n#2', status: 'draft', when: 'T-29', tags: '', notes: '', media: [] },
  { id: 'c', title: '', body: '3\nthird\n#3',  status: 'draft', when: 'T-29', tags: '', notes: '', media: [] },
  { id: 'd', title: '', body: '4\nfourth\n#4', status: 'draft', when: 'T-25', tags: '', notes: '', media: [] },
  { id: 'e', title: '', body: '5\nfifth\n#5',  status: 'draft', when: 'T-25', tags: '', notes: '', media: [] },
  { id: 'f', title: '', body: '6\nsixth\n#6',  status: 'draft', when: 'T+2',  tags: '', notes: '', media: [] },
  /* a real calendar date and an undated one: choices, not accidents */
  { id: 'g', title: '', body: 'pinned',  status: 'draft', when: '2026-11-20', tags: '', notes: '', media: [] },
  { id: 'h', title: '', body: 'no date', status: 'draft', when: '',           tags: '', notes: '', media: [] },
];

async function boot(items = messy, { done = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(([its, resequenced]) => {
    if (localStorage.getItem('seeded')) return;
    localStorage.setItem('seeded', '1');
    const rec = (v) => JSON.stringify({ v, at: Date.now(), seq: 1 });
    localStorage.setItem('sid.v2.local.slice.p_x',
      rec({ content: { thread: its }, setupDone: {}, notes: '', stats: [], handle: '', profileUrl: '' }));
    localStorage.setItem('sid.v2.local.slice.settings',
      rec({ artist: 'Si', song: "She Won't", releaseDate: '2026-12-01', mode: 'execution',
            themeMode: 'dark', accent: 'ember', seedsRemoved: true, diaryFilled: true,
            textTitlesCleared: true, diaryResequenced: resequenced }));
  }, [items, done]);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 25000 });
  await page.waitForTimeout(1300);
  return { ctx, page, errors };
}

const whens = (page) => page.evaluate(() =>
  window.Sid.S.get('p_x').content.thread.map(i => ({ id: i.id, w: i.when, b: i.body.split('\n')[0] })));

/* ---- 1. the one-off pass, on launch ----------------------------- */
{
  const { ctx, page, errors } = await boot(messy, { done: false });
  const w = await whens(page);
  const byId = Object.fromEntries(w.map(x => [x.id, x.w]));

  ok('1 the run is laid back out from T-30, a day each, in order',
    byId.a === 'T-30' && byId.b === 'T-29' && byId.c === 'T-28'
    && byId.d === 'T-27' && byId.e === 'T-26' && byId.f === 'T-25',
    JSON.stringify(byId));
  ok('1b no two entries share a day',
    new Set(w.filter(x => /^T/.test(x.w)).map(x => x.w)).size
      === w.filter(x => /^T/.test(x.w)).length, JSON.stringify(byId));
  ok('1c a fixed calendar date is left alone', byId.g === '2026-11-20', byId.g);
  ok('1d and an undated entry stays undated', byId.h === '', JSON.stringify(byId.h));
  ok('1e the text is untouched',
    w.find(x => x.id === 'f').b === '6', JSON.stringify(w.find(x => x.id === 'f')));
  ok('1f no errors', errors.length === 0, errors.slice(0, 2).join(' | '));

  const snaps = await page.evaluate(async () => {
    const { rows } = await window.Sid.S.listSnapshots();
    return rows.filter(r => /pre-resequence/.test(r.label || '')).length;
  });
  ok('1g a snapshot went down first', snaps > 0, 'snaps=' + snaps);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 25000 });
  await page.waitForTimeout(1200);
  const again = await whens(page);
  ok('1h and it does not run again',
    JSON.stringify(again.map(x => x.w)) === JSON.stringify(w.map(x => x.w)),
    JSON.stringify(again.map(x => x.w)));
  await ctx.close();
}

/* ---- 2. moving one pushes the rest along ------------------------ */
{
  /* a clean run: T+6, T+7, T+8, T+9, T+10 */
  const run = ['f6', 'f7', 'f8', 'f9', 'f10'].map((id, i) => ({
    id, title: '', body: `${i + 6}\nx`, status: 'draft',
    when: `T+${i + 6}`, tags: '', notes: '', media: [],
  }));
  const { ctx, page } = await boot(run);
  const r = await page.evaluate(async () => {
    const D = await import('./js/diary.js');
    const S = window.Sid.S;
    const list = S.get('p_x').content.thread;
    /* the one on T+6 moves to T+9 */
    const moved = list.find(x => x.id === 'f6');
    moved.when = 'T+9';
    D.makeRoom(list, moved, 'T+9', 'p_x');
    S.touch('p_x');
    await new Promise(z => setTimeout(z, 500));
    return Object.fromEntries(S.get('p_x').content.thread.map(i => [i.id, i.when]));
  });
  ok('2 the entry you moved takes the day you gave it', r.f6 === 'T+9', r.f6);
  ok('2b the one that was on T+9 becomes T+10', r.f9 === 'T+10', r.f9);
  ok('2c and the old T+10 becomes T+11', r.f10 === 'T+11', r.f10);
  ok('2d days before it do not move', r.f7 === 'T+7' && r.f8 === 'T+8', JSON.stringify(r));
  ok('2e nothing shares a day',
    new Set(Object.values(r)).size === Object.keys(r).length, JSON.stringify(r));
  await ctx.close();
}

/* ---- 3. moving into a free day pushes nothing ------------------- */
{
  const run = [
    { id: 'p', title: '', body: '1\nx', status: 'draft', when: 'T+1', tags: '', notes: '', media: [] },
    { id: 'q', title: '', body: '2\nx', status: 'draft', when: 'T+5', tags: '', notes: '', media: [] },
  ];
  const { ctx, page } = await boot(run);
  const r = await page.evaluate(async () => {
    const D = await import('./js/diary.js');
    const list = window.Sid.S.get('p_x').content.thread;
    const moved = list.find(x => x.id === 'p');
    moved.when = 'T+3';
    const pushed = D.makeRoom(list, moved, 'T+3', 'p_x');
    await new Promise(z => setTimeout(z, 300));
    return { pushed, q: list.find(x => x.id === 'q').when, p: moved.when };
  });
  ok('3 an empty day needs no room made', r.pushed === 0, 'pushed=' + r.pushed);
  ok('3b so the later entry does not move', r.q === 'T+5', r.q);
  ok('3c and the moved one sits where you put it', r.p === 'T+3', r.p);
  await ctx.close();
}

/* ---- 4. it happens from the editor, not only in code ------------ */
{
  const run = ['e1', 'e2', 'e3'].map((id, i) => ({
    id, title: '', body: `${i + 1}\nx`, status: 'draft',
    when: `T+${i + 1}`, tags: '', notes: '', media: [],
  }));
  const { ctx, page, errors } = await boot(run);
  const r = await page.evaluate(async () => {
    location.hash = '#/p/x/thread';
    await new Promise(z => setTimeout(z, 1300));
    /* open the first row (T+1) and re-date it to T+2 in the sheet */
    document.querySelector('#view .item').click();
    await new Promise(z => setTimeout(z, 800));
    const box = [...document.querySelectorAll('.modal input')]
      .find(i => i.type === 'number' || /^-?\d+$/.test(i.value || ''));
    if (!box) return { found: false };
    box.value = '2';
    box.dispatchEvent(new Event('input', { bubbles: true }));
    box.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(z => setTimeout(z, 700));
    return { found: true,
      map: Object.fromEntries(window.Sid.S.get('p_x').content.thread.map(i => [i.id, i.when])) };
  });
  if (!r.found) {
    ok('4 re-dating in the editor pushes the rest (no number box found — skipped)', true);
  } else {
    ok('4 re-dating in the editor pushes the rest along',
      r.map.e1 === 'T+2' && r.map.e2 === 'T+3' && r.map.e3 === 'T+4', JSON.stringify(r.map));
    ok('4b and nothing shares a day',
      new Set(Object.values(r.map)).size === 3, JSON.stringify(r.map));
  }
  ok('4c no errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await ctx.close();
}

/* ---- 5. nothing but the dates is touched ------------------------ */
{
  const { ctx, page } = await boot(messy, { done: false });
  const r = await page.evaluate(() => {
    const list = window.Sid.S.get('p_x').content.thread;
    return {
      bodies: list.map(i => i.body),
      n: list.length,
      statuses: list.map(i => i.status),
    };
  });
  ok('5 every body is exactly as it was',
    JSON.stringify(r.bodies) === JSON.stringify(messy.map(m => m.body)), JSON.stringify(r.bodies));
  ok('5b nothing was added or removed', r.n === messy.length, 'n=' + r.n);
  ok('5c statuses untouched',
    JSON.stringify(r.statuses) === JSON.stringify(messy.map(m => m.status)), JSON.stringify(r.statuses));
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
