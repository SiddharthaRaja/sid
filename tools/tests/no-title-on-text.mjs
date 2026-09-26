/* No title box on the text platforms — and, far more important, the
   title VALUE is never touched. It is what carries "Diary 17", and
   the numbering, the ordering and the renumber all read it. */
import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:8778/';
const results = [];
const ok = (n, c, d = '') => results.push([c, n, d]);

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});

const diary = (n, off) => ({
  id: 'd' + n, title: `Diary ${n}`, body: `${n}\nwhat I wrote on ${n}\n#${n}`,
  status: 'draft', when: `T${off}`, tags: 'bts', notes: 'a note', media: [],
});

async function boot() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    if (localStorage.getItem('seeded')) return;
    localStorage.setItem('seeded', '1');
    const rec = (v) => JSON.stringify({ v, at: Date.now(), seq: 1 });
    const mk = (n, off) => ({ id: 'd' + n, title: 'Diary ' + n,
      body: n + '\nwhat I wrote on ' + n + '\n#' + n,
      status: 'draft', when: 'T' + off, tags: 'bts', notes: 'a note', media: [] });
    const items = [mk(1, -30), mk(2, -29), mk(3, -28)];
    for (const p of ['x', 'threads', 'bluesky']) {
      const key = p === 'x' ? 'thread' : p === 'threads' ? 'journal' : 'diary';
      localStorage.setItem('sid.v2.local.slice.p_' + p,
        rec({ content: { [key]: JSON.parse(JSON.stringify(items)) },
              setupDone: {}, notes: '', stats: [], handle: '', profileUrl: '' }));
    }
    localStorage.setItem('sid.v2.local.slice.settings',
      rec({ artist: 'Si', song: "She Won't", releaseDate: '2026-12-01', mode: 'execution',
            themeMode: 'dark', accent: 'ember', seedsRemoved: true, diaryFilled: true }));
  });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 25000 });
  await page.waitForTimeout(1200);
  return { ctx, page, errors };
}

const openFirst = async (page, hash) => {
  await page.evaluate(async (h) => {
    location.hash = h;
    await new Promise(r => setTimeout(r, 1300));
    document.querySelector('#view .item')?.click();
    await new Promise(r => setTimeout(r, 800));
  }, hash);
};

/* ---- 1. the box is gone on all three text platforms -------------- */
{
  const { ctx, page, errors } = await boot();
  for (const [hash, name] of [['#/p/x/thread', 'X'], ['#/p/threads/journal', 'Threads'], ['#/p/bluesky/diary', 'Bluesky']]) {
    await openFirst(page, hash);
    const r = await page.evaluate(() => {
      const m = document.querySelector('.modal');
      const labs = [...m.querySelectorAll('.lab')].map(l => l.textContent.trim());
      return {
        labs,
        hasTitleBox: labs.some(l => /title/i.test(l)),
        hasTextBox: !!m.querySelector('textarea'),
        head: m.querySelector('.modal-head h3')?.textContent,
      };
    });
    ok(`1 no Title / label box on ${name}`, !r.hasTitleBox, JSON.stringify(r.labs));
    ok(`1b but the text box is still there on ${name}`, r.hasTextBox, String(r.hasTextBox));
    ok(`1c and the sheet is still headed with the entry on ${name}`,
      r.head === 'Diary 1', String(r.head));
    await page.evaluate(() => document.querySelector('.modal .icon-btn')?.click());
    await page.waitForTimeout(250);
  }
  ok('1d no errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await ctx.close();
}

/* ---- 2. THE DATA. Opening and editing must not touch the title --- */
{
  const { ctx, page } = await boot();
  const before = await page.evaluate(() =>
    window.Sid.S.get('p_x').content.thread.map(x => ({ id: x.id, t: x.title, b: x.body, w: x.when })));

  await openFirst(page, '#/p/x/thread');
  await page.evaluate(async () => {
    const ta = document.querySelector('.modal textarea');
    ta.focus();
    ta.value = ta.value + ' — and a bit more';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 400));
    [...document.querySelectorAll('.modal-foot .btn')].find(b => /Done/.test(b.textContent))?.click();
    await new Promise(r => setTimeout(r, 700));
  });

  const after = await page.evaluate(() =>
    window.Sid.S.get('p_x').content.thread.map(x => ({ id: x.id, t: x.title, b: x.body, w: x.when })));

  ok('2 every title is exactly as it was',
    JSON.stringify(before.map(x => x.t)) === JSON.stringify(after.map(x => x.t)),
    JSON.stringify({ before: before.map(x => x.t), after: after.map(x => x.t) }));
  ok('2b not one title was blanked', after.every(x => /^Diary \d+$/.test(x.t)),
    JSON.stringify(after.map(x => x.t)));
  ok('2c the edit to the text did land', /and a bit more/.test(after[0].b), after[0].b.slice(0, 60));
  ok('2d and the dates are untouched',
    JSON.stringify(before.map(x => x.w)) === JSON.stringify(after.map(x => x.w)),
    JSON.stringify(after.map(x => x.w)));
  await ctx.close();
}

/* ---- 3. it survives a reload, titles intact ---------------------- */
{
  const { ctx, page } = await boot();
  await openFirst(page, '#/p/x/thread');
  await page.evaluate(async () => {
    const ta = document.querySelector('.modal textarea');
    ta.value = 'edited'; ta.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 400));
    document.querySelector('.modal .icon-btn')?.click();
    await new Promise(r => setTimeout(r, 900));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 25000 });
  await page.waitForTimeout(1000);
  const t = await page.evaluate(() =>
    window.Sid.S.get('p_x').content.thread.map(x => x.title));
  ok('3 after a reload the titles are still Diary 1, 2, 3',
    JSON.stringify(t) === JSON.stringify(['Diary 1', 'Diary 2', 'Diary 3']), JSON.stringify(t));
  await ctx.close();
}

/* ---- 4. the numbering still works off those titles --------------- */
{
  const { ctx, page } = await boot();
  const r = await page.evaluate(async () => {
    const D = await import('./js/diary.js');
    const list = window.Sid.S.get('p_x').content.thread;
    return {
      nums: list.map(x => D.diaryNo(x.title)),
      planOk: D.renumberPlan('x', 'thread').ok,
      due: !!D.due(),
    };
  });
  ok('4 the diary numbering still reads the titles',
    JSON.stringify(r.nums) === JSON.stringify([1, 2, 3]), JSON.stringify(r.nums));
  ok('4b and renumbering still has something to work with', r.planOk, String(r.planOk));
  await ctx.close();
}

/* ---- 5. a NEW entry is fine without one -------------------------- */
{
  const { ctx, page, errors } = await boot();
  const r = await page.evaluate(async () => {
    location.hash = '#/p/x/thread';
    await new Promise(r => setTimeout(r, 1300));
    [...document.querySelectorAll('#view button')].find(b => /^New /.test(b.textContent.trim()))?.click();
    await new Promise(r => setTimeout(r, 800));
    const ta = document.querySelector('.modal textarea');
    ta.value = 'a brand new post with no name';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 400));
    [...document.querySelectorAll('.modal-foot .btn')].find(b => /Done/.test(b.textContent))?.click();
    await new Promise(r => setTimeout(r, 800));
    const list = window.Sid.S.get('p_x').content.thread;
    const made = list.find(x => /brand new post/.test(x.body));
    return {
      saved: !!made,
      title: made ? made.title : null,
      shown: [...document.querySelectorAll('#view .item-title')].map(t => t.textContent),
      total: list.length,
    };
  });
  ok('5 a new post saves with no title at all', r.saved && r.title === '', JSON.stringify(r.title));
  ok('5b and the list shows its text instead of an empty row',
    r.shown.some(t => /brand new post/.test(t)), JSON.stringify(r.shown));
  ok('5c the existing three are still there', r.total === 4, 'n=' + r.total);
  ok('5d no errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await ctx.close();
}

/* ---- 6. everywhere else still HAS the box ------------------------ */
{
  const { ctx, page } = await boot();
  const r = await page.evaluate(async () => {
    location.hash = '#/p/instagram';
    await new Promise(r => setTimeout(r, 1300));
    [...document.querySelectorAll('#view button')].find(b => /^New /.test(b.textContent.trim()))?.click();
    await new Promise(r => setTimeout(r, 800));
    const m = document.querySelector('.modal');
    return [...m.querySelectorAll('.lab')].map(l => l.textContent.trim());
  });
  ok('6 Instagram still has its Title / label box',
    r.some(l => /title/i.test(l)), JSON.stringify(r));
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
