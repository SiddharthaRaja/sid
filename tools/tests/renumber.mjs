/* Renumbering the X diary from the hashtag at the foot of each entry.

   The bug this exists for: the reader wanted "#27" to be the very
   last characters of the body. A real entry signs off with a row of
   tags — "#27 #shewont #newmusic" — so every one of them read as
   unnumbered, the plan changed nothing, and tapping the button
   appeared to do nothing at all. */
import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:8778/';
const results = [];
const ok = (n, c, d = '') => results.push([c, n, d]);

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});

/* Shuffled titles, hashtags in every shape a person actually writes. */
function entries() {
  let off = -30;
  const mk = (id, title, body) => ({ id, title, body, status: 'draft',
    when: `T${off++}`, tags: '', notes: '', media: [] });
  return [
    /* the shape that broke it: number first in a row of tags */
    mk('a', 'Diary 1', 'first thing I wrote\n\n#27 #shewont #newmusic'),
    /* number alone on the last line */
    mk('b', 'Diary 2', 'second\n#3'),
    /* number last in a row of tags */
    mk('c', 'Diary 3', 'third\n#indie #12'),
    /* trailing blank lines */
    mk('d', 'Diary 4', 'fourth\n#5\n\n\n'),
    /* a hash mid-paragraph must NOT count, and there is no tag line */
    mk('e', 'Diary 5', 'I played it at #9 in the set and nobody blinked'),
    /* no tag at all */
    mk('f', 'Diary 6', 'sixth, never numbered'),
    /* duplicate of #3 */
    mk('g', 'Diary 7', 'seventh\n#3 #again'),
    /* two different entry numbers — ambiguous, must not guess */
    mk('h', 'Diary 8', 'eighth\n#4 #9'),
    /* a number and a year is not ambiguous: the year is not an entry */
    mk('j', 'Diary 10', 'tenth\n#44 #2026'),
    /* space after the hash */
    mk('i', 'Diary 9', 'ninth\n# 8'),
  ];
}

async function boot(items) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript((its) => {
    if (localStorage.getItem('seeded')) return;
    localStorage.setItem('seeded', '1');
    const rec = (v) => JSON.stringify({ v, at: Date.now(), seq: 1 });
    localStorage.setItem('sid.v2.local.slice.p_x',
      rec({ content: { thread: its }, setupDone: {}, notes: '', stats: [], handle: '', profileUrl: '' }));
    localStorage.setItem('sid.v2.local.slice.settings',
      rec({ artist: 'Si', song: "She Won't", releaseDate: '2026-12-01', mode: 'execution',
            themeMode: 'dark', accent: 'ember', seedsRemoved: true, diaryFilled: true }));
  }, items);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 25000 });
  await page.waitForTimeout(1200);
  return { ctx, page, errors };
}

/* ---- 1. the reader, on each shape ------------------------------- */
{
  const { ctx, page } = await boot(entries());
  const r = await page.evaluate(async () => {
    const D = await import('./js/diary.js');
    const t = (b) => D.readTag(b);
    return {
      rowOfTags:   t('x\n\n#27 #shewont #newmusic').n,
      alone:       t('x\n#3').n,
      numberLast:  t('x\n#indie #12').n,
      trailing:    t('x\n#5\n\n\n').n,
      midSentence: t('I played it at #9 in the set and nobody blinked').n,
      none:        t('nothing here').n,
      spaced:      t('x\n# 8').n,
      ambiguous:   t('x\n#4 #9'),
      numberAndYear: t('x\n#44 #2026').n,
      prose:       t('finally finished it today #27').n,
      outOfRange:  t('x\n#0').n,
      repeated:    t('x\n#7 #7').n,
    };
  });
  ok('1 a number first in a row of tags is found — the case that broke it',
    r.rowOfTags === 27, String(r.rowOfTags));
  ok('1b a number alone on the last line', r.alone === 3, String(r.alone));
  ok('1c a number last in a row of tags', r.numberLast === 12, String(r.numberLast));
  ok('1d trailing blank lines do not hide it', r.trailing === 5, String(r.trailing));
  ok('1e a hash mid-sentence is still ignored', r.midSentence === null, String(r.midSentence));
  ok('1f no tag reads as no number', r.none === null, String(r.none));
  ok('1g a space after the hash is fine', r.spaced === 8, String(r.spaced));
  ok('1h two different entry numbers is refused, not guessed',
    r.ambiguous.n === null && /more than one/.test(r.ambiguous.why), JSON.stringify(r.ambiguous));
  ok('1k a number beside a year is fine \u2014 a year is not an entry',
    r.numberAndYear === 44, String(r.numberAndYear));
  ok('1l a sentence that merely ends with a tag is not a tag line',
    r.prose === null, String(r.prose));
  ok('1i the same number twice on a line is not ambiguous', r.repeated === 7, String(r.repeated));
  ok('1j #0 is not a diary number', r.outOfRange === null, String(r.outOfRange));
  await ctx.close();
}

/* ---- 2. the plan over the whole set ----------------------------- */
{
  const { ctx, page } = await boot(entries());
  const p = await page.evaluate(async () => {
    const D = await import('./js/diary.js');
    const plan = D.renumberPlan('x', 'thread');
    return {
      ok: plan.ok, count: plan.count, byHash: plan.byHash, tail: plan.tail,
      rows: plan.rows.map(r => [r.was, r.to, r.via]),
      dupes: plan.dupes.map(d => d.n),
      tailFrom: plan.tailFrom, tailTo: plan.tailTo,
      samples: plan.samples.map(s => s.line),
    };
  });
  /* six carry a usable number: 27, 3, 12, 5, 8, 44 */
  ok('2 it finds every usable hashtag', p.byHash === 6, `byHash=${p.byHash}`);
  ok('2b and the rest go to the tail', p.tail === 4, `tail=${p.tail}`);
  ok('2c the tail starts after the highest number',
    p.tailFrom === 45 && p.tailTo === 48, JSON.stringify([p.tailFrom, p.tailTo]));
  ok('2d the duplicate is reported', JSON.stringify(p.dupes) === '[3]', JSON.stringify(p.dupes));

  const map = Object.fromEntries(p.rows.map(([was, to]) => [was, to]));
  ok('2e each entry lands on its own hashtag',
    map['Diary 1'] === 'Diary 27' && map['Diary 2'] === 'Diary 3'
    && map['Diary 3'] === 'Diary 12' && map['Diary 4'] === 'Diary 5'
    && map['Diary 9'] === 'Diary 8',
    JSON.stringify(map));
  ok('2f the ambiguous one is not guessed into a number it named',
    map['Diary 8'] !== 'Diary 4' && map['Diary 8'] !== 'Diary 9', map['Diary 8']);
  ok('2g the plan can show the line it read',
    p.samples.length > 0 && p.samples.some(l => /#/.test(l)), JSON.stringify(p.samples));
  await ctx.close();
}

/* ---- 3. applying it --------------------------------------------- */
{
  const { ctx, page, errors } = await boot(entries());
  const after = await page.evaluate(async () => {
    const D = await import('./js/diary.js');
    const S = window.Sid.S;
    const before = S.get('p_x').content.thread.map(i => i.body);
    const r = D.renumber('x', 'thread');
    await new Promise(z => setTimeout(z, 600));
    const list = S.get('p_x').content.thread;
    return {
      applied: r.applied,
      titles: list.map(i => i.title),
      order: list.map(i => D.diaryNo(i.title)),
      bodiesUntouched: JSON.stringify(list.map(i => i.body).sort()) === JSON.stringify(before.sort()),
    };
  });
  ok('3 it retitles', after.applied > 0, 'applied=' + after.applied);
  ok('3b every number is unique',
    new Set(after.order).size === after.order.length, JSON.stringify(after.order));
  ok('3c and the run is left in number order',
    JSON.stringify(after.order) === JSON.stringify([...after.order].sort((a, b) => a - b)),
    JSON.stringify(after.order));
  ok('3d not one character of the writing is edited', after.bodiesUntouched, String(after.bodiesUntouched));
  ok('3e no errors', errors.length === 0, errors.slice(0, 2).join(' | '));

  /* running it again must be a no-op */
  const twice = await page.evaluate(async () => {
    const D = await import('./js/diary.js');
    const before = window.Sid.S.get('p_x').content.thread.map(i => i.title).join('|');
    D.renumber('x', 'thread');
    await new Promise(z => setTimeout(z, 400));
    return before === window.Sid.S.get('p_x').content.thread.map(i => i.title).join('|');
  });
  ok('3f running it twice changes nothing the second time', twice, String(twice));
  await ctx.close();
}

/* ---- 4. it survives a reload ------------------------------------ */
{
  const { ctx, page } = await boot(entries());
  await page.evaluate(async () => {
    const D = await import('./js/diary.js');
    D.renumber('x', 'thread');
    await new Promise(z => setTimeout(z, 900));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 25000 });
  await page.waitForTimeout(1000);
  const titles = await page.evaluate(() =>
    window.Sid.S.get('p_x').content.thread.map(i => i.title));
  ok('4 the new titles survive a reload', titles.includes('Diary 27') && titles.includes('Diary 12'),
    JSON.stringify(titles));
  await ctx.close();
}

/* ---- 5. the screen tells you what it read ----------------------- */
{
  /* the old failure mode: nothing carries a findable tag */
  const none = entries().map(e => ({ ...e, body: e.body.replace(/#\s*\d+/g, '#tag') }));
  const { ctx, page } = await boot(none);
  const shown = await page.evaluate(async () => {
    location.hash = '#/settings';
    await new Promise(r => setTimeout(r, 1200));
    [...document.querySelectorAll('#view .subtab')].find(t => /backup/i.test(t.textContent))?.click();
    await new Promise(r => setTimeout(r, 800));
    [...document.querySelectorAll('#view button')].find(b => /Renumber/i.test(b.textContent))?.click();
    await new Promise(r => setTimeout(r, 800));
    const m = document.querySelector('.modal');
    return { open: !!m, text: m ? m.textContent : '' };
  });
  ok('5 the renumber screen opens', shown.open, String(shown.open));
  ok('5b it says plainly that it found none',
    /No numbered hashtag found/.test(shown.text), shown.text.slice(0, 160));
  ok('5c and shows the line it actually looked at',
    /#tag/.test(shown.text), 'sample line not shown');
  ok('5d and explains where it looks',
    /last line/.test(shown.text), 'no explanation of the rule');
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
