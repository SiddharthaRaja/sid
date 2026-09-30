/* The Notepad is a place to write, so it should be mostly the thing
   you write in. This holds that line: one header row, no card around
   the text, and the text field running the full width. */
import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:8778/';
const results = [];
const ok = (n, c, d = '') => results.push([c, n, d]);

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});

async function boot(w = 1480, hgt = 1000) {
  const ctx = await browser.newContext({ viewport: { width: w, height: hgt } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    if (localStorage.getItem('seeded')) return;
    localStorage.setItem('seeded', '1');
    const rec = (v) => JSON.stringify({ v, at: Date.now(), seq: 1 });
    localStorage.setItem('sid.v2.local.slice.notepad', rec({
      songs: [{
        id: 's1', title: "She Won't", createdAt: Date.now(), updatedAt: Date.now(),
        sections: [
          { id: 'v1', name: 'Verse 1', status: 'draft',
            content: "I can't remember when it started\nSomething in the way you looked at me" },
          { id: 'c1', name: 'Chorus', status: 'draft', content: "She won't" },
        ],
      }],
      open: 's1',
    }));
    localStorage.setItem('sid.v2.local.slice.settings',
      rec({ artist: 'Si', song: "She Won't", releaseDate: '2026-12-01', mode: 'execution',
            themeMode: 'dark', accent: 'ember', seedsRemoved: true, diaryFilled: true,
            textTitlesCleared: true, diaryResequenced: true }));
  });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 25000 });
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    document.querySelector('#health-x')?.click();
    location.hash = '#/np';
    await new Promise(r => setTimeout(r, 1500));
  });
  return { ctx, page, errors };
}

/* ---- 1. the writing runs the full width, with no card ----------- */
{
  const { ctx, page, errors } = await boot();
  const r = await page.evaluate(() => {
    const view = document.querySelector('#view');
    const area = document.querySelector('textarea.np-area');
    const edit = document.querySelector('.np-edit');
    const vw = view.getBoundingClientRect();
    const ew = edit.getBoundingClientRect();
    return {
      found: !!area,
      /* nothing between the text and the page: no card ancestor */
      inCard: !!area.closest('.card'),
      /* the editor block reaches the page's own edges */
      leftGap: Math.round(ew.left - vw.left),
      rightGap: Math.round(vw.right - ew.right),
      areaH: Math.round(area.getBoundingClientRect().height),
      viewH: Math.round(window.innerHeight),
      /* the text box has no border of its own any more */
      border: getComputedStyle(area).borderTopWidth,
    };
  });
  ok('1 there is a text field', r.found, String(r.found));
  ok('1b it is not boxed inside a card', !r.inCard, String(r.inCard));
  ok('1c it reaches both edges of the page',
    Math.abs(r.leftGap) <= 1 && Math.abs(r.rightGap) <= 1,
    JSON.stringify({ left: r.leftGap, right: r.rightGap }));
  ok('1d and it is tall enough to write into',
    r.areaH > r.viewH * 0.4, `${r.areaH}px of ${r.viewH}`);
  ok('1e with no border of its own', r.border === '0px', r.border);
  ok('1f no errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await ctx.close();
}

/* ---- 2. the header is one row, not three ------------------------ */
{
  const { ctx, page } = await boot();
  const r = await page.evaluate(() => {
    const head = document.querySelector('.np-head');
    const kids = [...head.children];
    /* compare vertical CENTRES: the buttons are different heights, so
       their tops differ by a few px even when they share a row */
    const mids = kids.map(k => { const b = k.getBoundingClientRect(); return b.top + b.height / 2; });
    const sameRow = Math.max(...mids) - Math.min(...mids) < 6;
    const area = document.querySelector('textarea.np-area');
    return {
      sameRow,
      spread: +(Math.max(...mids) - Math.min(...mids)).toFixed(1),
      kids: kids.length,
      /* how far down the page the writing starts */
      writingStartsAt: Math.round(area.getBoundingClientRect().top
        - document.querySelector('#view').getBoundingClientRect().top),
    };
  });
  ok('2 back, title, metronome and export share one row',
    r.sameRow && r.kids === 4, JSON.stringify(r));
  ok('2b so the writing starts near the top of the page',
    r.writingStartsAt < 230, r.writingStartsAt + 'px down');
  await ctx.close();
}

/* ---- 3. the names read as headings, not form boxes -------------- */
{
  const { ctx, page } = await boot();
  const r = await page.evaluate(() => {
    const t = document.querySelector('.np-title');
    const n = document.querySelector('.np-secname');
    const cs = (el) => getComputedStyle(el);
    return {
      titleBg: cs(t).backgroundColor,
      titleBorder: cs(t).borderTopColor,
      titleWeight: cs(t).fontWeight,
      nameBg: cs(n).backgroundColor,
      editable: t.tagName === 'INPUT' && n.tagName === 'INPUT',
    };
  });
  ok('3 the song name has no box around it',
    /rgba\(0, 0, 0, 0\)|transparent/.test(r.titleBg), r.titleBg);
  ok('3b nor a visible border', /rgba\(0, 0, 0, 0\)|transparent/.test(r.titleBorder), r.titleBorder);
  ok('3c it still reads as a heading', +r.titleWeight >= 600, r.titleWeight);
  ok('3d the section name likewise', /rgba\(0, 0, 0, 0\)|transparent/.test(r.nameBg), r.nameBg);
  ok('3e and both are still editable', r.editable, String(r.editable));
  await ctx.close();
}

/* ---- 4. everything still works ---------------------------------- */
{
  const { ctx, page, errors } = await boot();
  const r = await page.evaluate(async () => {
    const S = window.Sid.S;
    const area = document.querySelector('textarea.np-area');
    area.focus();
    area.value = "I can't remember when it started\nand I don't want to";
    area.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(z => setTimeout(z, 500));

    const title = document.querySelector('.np-title');
    title.value = 'She Won’t (v2)';
    title.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(z => setTimeout(z, 500));

    const song = S.get('notepad').songs[0];
    /* the syllable gutter still counts */
    const gut = [...document.querySelectorAll('.syl-gutter .sg-line')].map(x => x.textContent);
    /* switching sections still works */
    [...document.querySelectorAll('#view .subtabs .subtab')].find(b => b.textContent === 'Chorus')?.click();
    await new Promise(z => setTimeout(z, 500));
    const after = document.querySelector('textarea.np-area').value;

    return { body: song.sections[0].content, title: song.title, gut, after,
             counts: document.querySelector('.np-foot .small')?.textContent || '' };
  });
  ok('4 typing saves', /don’t want to|don't want to/.test(r.body), JSON.stringify(r.body));
  ok('4b renaming the song saves', /v2/.test(r.title), r.title);
  ok('4c the syllable gutter still counts', r.gut.filter(Boolean).length >= 2, JSON.stringify(r.gut));
  ok('4d the counts line is still there', /words/.test(r.counts), r.counts);
  ok('4e switching section switches the text', r.after === "She won't", JSON.stringify(r.after));
  ok('4f no errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await ctx.close();
}

/* ---- 5. on a phone, nothing is stranded under the tab bar ------- */
{
  const { ctx, page } = await boot(390, 844);
  const r = await page.evaluate(() => {
    const foot = document.querySelector('.np-foot');
    const kids = [...foot.querySelectorAll('.btn')];
    const view = document.querySelector('#view');
    return {
      buttons: kids.length,
      /* the whole footer sits inside the scrollable page, not past it */
      footBottom: Math.round(foot.getBoundingClientRect().bottom),
      pageBottom: Math.round(view.getBoundingClientRect().bottom),
      /* name and status stack rather than squeezing */
      secRows: new Set([...document.querySelector('.np-secline').children]
        .map(k => Math.round(k.getBoundingClientRect().top / 8))).size,
      areaW: Math.round(document.querySelector('textarea.np-area').getBoundingClientRect().width),
    };
  });
  ok('5 the Copy / move / Delete row is all there', r.buttons === 4, 'n=' + r.buttons);
  ok('5b and it sits inside the page rather than past the end',
    r.footBottom <= r.pageBottom, JSON.stringify({ foot: r.footBottom, page: r.pageBottom }));
  ok('5c the name and the status chips stack instead of squeezing',
    r.secRows === 2, 'rows=' + r.secRows);
  ok('5d the text field still uses nearly the whole width',
    r.areaW > 300, r.areaW + 'px of 390');
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
