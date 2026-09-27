/* Every title on X, Threads and Bluesky is cleared, once, on launch.
   The text is not touched. That second sentence is what this file is
   really for. */
import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:8778/';
const results = [];
const ok = (n, c, d = '') => results.push([c, n, d]);

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});

async function boot({ cleared = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript((done) => {
    if (localStorage.getItem('seeded')) return;
    localStorage.setItem('seeded', '1');
    const rec = (v) => JSON.stringify({ v, at: Date.now(), seq: 1 });

    /* the half-cleared state he is actually in: some titled, some not */
    const thread = [
      { id: 'a', title: 'Diary 1', body: '1\nWhere do I even start...\n#3',
        status: 'draft', when: 'T-30', tags: 'bts', notes: 'a note', media: [] },
      { id: 'b', title: '', body: '2\nIf she didn’t live 500 miles away\n#1',
        status: 'ready', when: 'T-29', tags: '', notes: '', media: [] },
      { id: 'c', title: 'Diary 3', body: '3\nIt has been over a week\n#17',
        status: 'draft', when: 'T-28', tags: 'lyric', notes: 'keep', media: [] },
    ];
    /* a second content type on the same platform, also titled */
    const tweets = [
      { id: 't1', title: 'Announcement', body: 'out now', status: 'draft',
        when: 'T', tags: '', notes: '', media: [] },
    ];
    localStorage.setItem('sid.v2.local.slice.p_x',
      rec({ content: { thread, tweet: tweets }, setupDone: {}, notes: '', stats: [], handle: '', profileUrl: '' }));
    for (const [p, k] of [['threads', 'journal'], ['bluesky', 'diary']]) {
      localStorage.setItem('sid.v2.local.slice.p_' + p,
        rec({ content: { [k]: JSON.parse(JSON.stringify(thread)) },
              setupDone: {}, notes: '', stats: [], handle: '', profileUrl: '' }));
    }
    /* somewhere that is NOT a text platform */
    localStorage.setItem('sid.v2.local.slice.p_instagram',
      rec({ content: { caption: [{ id: 'i1', title: 'Cover reveal', body: 'look at this',
            status: 'draft', when: 'T-5', tags: '', notes: '', media: [] }] },
            setupDone: {}, notes: '', stats: [], handle: '', profileUrl: '' }));
    localStorage.setItem('sid.v2.local.slice.settings',
      rec({ artist: 'Si', song: "She Won't", releaseDate: '2026-12-01', mode: 'execution',
            themeMode: 'dark', accent: 'ember', seedsRemoved: true, diaryFilled: true,
            textTitlesCleared: done }));
  }, cleared);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 25000 });
  await page.waitForTimeout(1400);
  return { ctx, page, errors };
}

const dump = (page) => page.evaluate(() => {
  const out = {};
  for (const k of ['x', 'threads', 'bluesky', 'instagram']) {
    const c = window.Sid.S.get('p_' + k).content || {};
    out[k] = {};
    for (const [t, arr] of Object.entries(c)) {
      out[k][t] = (arr || []).map(i => ({
        id: i.id, title: i.title, body: i.body, when: i.when,
        status: i.status, tags: i.tags, notes: i.notes, media: (i.media || []).length,
      }));
    }
  }
  return out;
});

/* ---- 1. all titles gone on the three text platforms ------------- */
{
  const { ctx, page, errors } = await boot();
  const d = await dump(page);

  const textTitles = ['x', 'threads', 'bluesky']
    .flatMap(k => Object.values(d[k]).flat().map(i => i.title));
  ok('1 not one title is left on X, Threads or Bluesky',
    textTitles.every(t => t === ''), JSON.stringify(textTitles));
  ok('1b including the ones on a second content type',
    d.x.tweet[0].title === '', JSON.stringify(d.x.tweet[0]));
  ok('1c and Instagram keeps its title',
    d.instagram.caption[0].title === 'Cover reveal', d.instagram.caption[0].title);
  ok('1d no errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await ctx.close();
}

/* ---- 2. THE TEXT. Nothing but the title was touched -------------- */
{
  const { ctx, page } = await boot();
  const d = await dump(page);
  const x = d.x.thread;

  ok('2 the text is character for character what it was',
    x[0].body === '1\nWhere do I even start...\n#3'
    && x[1].body === '2\nIf she didn’t live 500 miles away\n#1'
    && x[2].body === '3\nIt has been over a week\n#17',
    JSON.stringify(x.map(i => i.body)));
  ok('2b the dates are untouched',
    JSON.stringify(x.map(i => i.when)) === JSON.stringify(['T-30', 'T-29', 'T-28']),
    JSON.stringify(x.map(i => i.when)));
  ok('2c so are the statuses',
    JSON.stringify(x.map(i => i.status)) === JSON.stringify(['draft', 'ready', 'draft']),
    JSON.stringify(x.map(i => i.status)));
  ok('2d so are the tags and notes',
    x[0].tags === 'bts' && x[0].notes === 'a note' && x[2].notes === 'keep',
    JSON.stringify(x.map(i => [i.tags, i.notes])));
  ok('2e nothing was added or removed', x.length === 3, 'n=' + x.length);
  await ctx.close();
}

/* ---- 3. a snapshot went down first ------------------------------ */
{
  const { ctx, page } = await boot();
  const snaps = await page.evaluate(async () => {
    const { rows } = await window.Sid.S.listSnapshots();
    return rows.filter(r => /pre-clear-text-titles/.test(r.label || '')).length;
  });
  ok('3 a snapshot was written before anything was cleared', snaps > 0, 'snaps=' + snaps);
  await ctx.close();
}

/* ---- 4. it survives a reload and does not run twice ------------- */
{
  const { ctx, page } = await boot();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 25000 });
  await page.waitForTimeout(1200);
  const d = await dump(page);
  ok('4 still cleared after a reload',
    d.x.thread.every(i => i.title === ''), JSON.stringify(d.x.thread.map(i => i.title)));
  ok('4b and the text is still there',
    /Where do I even start/.test(d.x.thread[0].body), d.x.thread[0].body);

  const snaps = await page.evaluate(async () => {
    const { rows } = await window.Sid.S.listSnapshots();
    return rows.filter(r => /pre-clear-text-titles/.test(r.label || '')).length;
  });
  ok('4c it did not run a second time', snaps === 1, 'snaps=' + snaps);
  await ctx.close();
}

/* ---- 5. the list is still readable ------------------------------ */
{
  const { ctx, page } = await boot();
  const rows = await page.evaluate(async () => {
    location.hash = '#/p/x/thread';
    await new Promise(r => setTimeout(r, 1300));
    return [...document.querySelectorAll('#view .item')].map(i => ({
      head: i.querySelector('.item-title')?.textContent,
      body: i.querySelector('.item-body')?.textContent || '',
    }));
  });
  ok('5 each row is named by its own first line',
    rows[0].head === '1' || /^\d+$/.test(rows[0].head), JSON.stringify(rows.map(r => r.head)));
  ok('5b and the preview is the rest of it, not the same words again',
    rows[0].body.startsWith('Where do I even start') && !rows[0].body.startsWith(rows[0].head),
    JSON.stringify(rows[0]));
  await ctx.close();
}

/* ---- 6. an untouched account is left alone ---------------------- */
{
  const { ctx, page } = await boot({ cleared: true });
  const d = await dump(page);
  ok('6 with the flag already set it does nothing',
    d.x.thread[0].title === 'Diary 1' && d.x.thread[2].title === 'Diary 3',
    JSON.stringify(d.x.thread.map(i => i.title)));
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
