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

/* ---- 6. the dates follow the numbers --------------------------- */
{
  const { ctx, page } = await boot(entries());
  const r = await page.evaluate(async () => {
    const D = await import('./js/diary.js');
    const S = window.Sid.S;
    const before = S.get('p_x').content.thread.map(i => ({ t: i.title, w: i.when }));
    D.renumber('x', 'thread');
    await new Promise(z => setTimeout(z, 700));
    const after = S.get('p_x').content.thread.map(i => ({ t: i.title, w: i.when, n: D.diaryNo(i.title) }));
    const off = (w) => { const m = String(w).match(/^T([+-]?\d+)?$/); return m ? (m[1] ? +m[1] : 0) : null; };
    return {
      beforeDates: before.map(x => x.w).sort((a, b) => off(a) - off(b)),
      afterDates: after.map(x => x.w).sort((a, b) => off(a) - off(b)),
      pairs: after.map(x => [x.n, off(x.w)]).sort((a, b) => a[0] - b[0]),
    };
  });
  ok('6 not one date is invented or dropped \u2014 the same days come back',
    JSON.stringify(r.beforeDates) === JSON.stringify(r.afterDates),
    JSON.stringify({ b: r.beforeDates, a: r.afterDates }));

  const nums = r.pairs.map(p => p[0]);
  const offs = r.pairs.map(p => p[1]);
  ok('6b sorted by number, the dates now run forwards',
    JSON.stringify(offs) === JSON.stringify([...offs].sort((a, b) => a - b)),
    JSON.stringify(r.pairs));
  ok('6c the lowest number holds the earliest day',
    offs[0] === Math.min(...offs), JSON.stringify(r.pairs.slice(0, 3)));
  ok('6d and every entry still has a date', offs.every(o => o !== null), JSON.stringify(offs));
  ok('6e numbers are still unique and ascending',
    JSON.stringify(nums) === JSON.stringify([...new Set(nums)].sort((a, b) => a - b)),
    JSON.stringify(nums));
  await ctx.close();
}

/* ---- 7. re-dating can be turned off ----------------------------- */
{
  const { ctx, page } = await boot(entries());
  const r = await page.evaluate(async () => {
    const D = await import('./js/diary.js');
    const S = window.Sid.S;
    const before = new Map(S.get('p_x').content.thread.map(i => [i.id, i.when]));
    D.renumber('x', 'thread', { redate: false });
    await new Promise(z => setTimeout(z, 600));
    const list = S.get('p_x').content.thread;
    return {
      same: list.every(i => before.get(i.id) === i.when),
      retitled: list.some(i => i.title === 'Diary 27'),
    };
  });
  ok('7 with re-dating off the titles still change', r.retitled, String(r.retitled));
  ok('7b and not one date moves', r.same, String(r.same));
  await ctx.close();
}

/* ---- 8. the reorder is what the X screen actually shows ---------- */
{
  const { ctx, page } = await boot(entries());
  await page.evaluate(async () => {
    const D = await import('./js/diary.js');
    D.renumber('x', 'thread');
    await new Promise(z => setTimeout(z, 900));
  });
  /* reload, then look at the rendered list rather than the store */
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 25000 });
  await page.waitForTimeout(1200);
  const shown = await page.evaluate(async () => {
    location.hash = '#/p/x/thread';
    await new Promise(r => setTimeout(r, 1400));
    return [...document.querySelectorAll('#view .item-title')].map(t => t.textContent);
  });
  const nums = shown.map(t => { const m = t.match(/Diary (\d+)/); return m ? +m[1] : null; }).filter(n => n != null);
  ok('8 the X screen lists them in the new number order',
    nums.length > 0 && JSON.stringify(nums) === JSON.stringify([...nums].sort((a, b) => a - b)),
    JSON.stringify(shown));
  ok('8b and the renumbered title is on screen',
    shown.includes('Diary 27'), JSON.stringify(shown));
  await ctx.close();
}

/* ---- 9. his actual entry, exactly as it appears on screen -------
   Title "Diary 3", first line "3", tag "#17" at the foot, dated T-28.
   All three of those have to end up saying 17, and the date has to
   land where the seventeenth entry belongs. */
{
  const run = [];
  let o = -30;
  for (let i = 1; i <= 45; i++) {
    run.push({
      id: 'e' + i, title: `Diary ${i}`,
      /* number on line one, writing, then the real number as a tag —
         shuffled so entry i actually belongs at 46 - i */
      body: `${i}\nsomething I wrote on day ${i}\n#${46 - i}`,
      /* written the way the app writes them: the sign is always there */
      status: 'draft', when: (o < 0 ? `T${o++}` : `T+${o++}`), tags: '', notes: '', media: [],
    });
  }
  /* the one from the screenshot, verbatim */
  run[2] = { id: 'shot', title: 'Diary 3',
    body: '3\nIt has been over a week since I last video called her\n#17',
    status: 'draft', when: 'T-28', tags: '', notes: '', media: [] };

  const { ctx, page } = await boot(run);
  const r = await page.evaluate(async () => {
    const D = await import('./js/diary.js');
    const S = window.Sid.S;
    D.renumber('x', 'thread');
    await new Promise(z => setTimeout(z, 800));
    const it = S.get('p_x').content.thread.find(x => x.id === 'shot');
    const all = S.get('p_x').content.thread;
    const off = (w) => { const m = String(w).match(/^T([+-]?\d+)?$/); return m ? (m[1] ? +m[1] : 0) : null; };
    return {
      title: it.title,
      firstLine: it.body.split('\n')[0],
      lastLine: it.body.split('\n').slice(-1)[0],
      middle: it.body.split('\n')[1],
      when: it.when,
      /* where T-28 sat before, and where the 17th entry sits now */
      seventeenth: off(all.find(x => D.diaryNo(x.title) === 17).when),
      everyFirstLineMatches: all.every(x => {
        const n = D.diaryNo(x.title);
        const b = x.body.split('\n')[0].trim();
        return !/^\d+$/.test(b) || +b === n;
      }),
    };
  });

  ok('9 the title becomes Diary 17', r.title === 'Diary 17', r.title);
  ok('9b the first line of the text becomes 17', r.firstLine === '17', JSON.stringify(r.firstLine));
  ok('9c the writing itself is untouched',
    r.middle === 'It has been over a week since I last video called her', JSON.stringify(r.middle));
  ok('9d the hashtag at the foot stays put', r.lastLine === '#17', JSON.stringify(r.lastLine));
  ok('9e it is no longer on T-28', r.when !== 'T-28', r.when);
  ok('9f it moves to where the seventeenth entry belongs \u2014 T-14',
    r.when === 'T-14', `${r.when} (17th slot is T${r.seventeenth})`);
  ok('9g and across all 45, every first line agrees with its title',
    r.everyFirstLineMatches, String(r.everyFirstLineMatches));
  await ctx.close();
}

/* ---- 10. a first line that is not a bare number is left alone ---- */
{
  const { ctx, page } = await boot([
    { id: 'p', title: 'Diary 1', body: 'Not a number up here\nbody\n#9',
      status: 'draft', when: 'T-30', tags: '', notes: '', media: [] },
    { id: 'q', title: 'Diary 2', body: '2\nbody\n#4',
      status: 'draft', when: 'T-29', tags: '', notes: '', media: [] },
  ]);
  const r = await page.evaluate(async () => {
    const D = await import('./js/diary.js');
    D.renumber('x', 'thread');
    await new Promise(z => setTimeout(z, 600));
    const list = window.Sid.S.get('p_x').content.thread;
    return {
      prose: list.find(x => x.id === 'p').body.split('\n')[0],
      numbered: list.find(x => x.id === 'q').body.split('\n')[0],
      proseTitle: list.find(x => x.id === 'p').title,
    };
  });
  ok('10 a prose first line is never overwritten', r.prose === 'Not a number up here', r.prose);
  ok('10b but its title still changes', r.proseTitle === 'Diary 9', r.proseTitle);
  ok('10c and a numbered first line does move', r.numbered === '4', r.numbered);
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
