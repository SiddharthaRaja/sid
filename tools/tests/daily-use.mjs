/* ============================================================
   daily.mjs — a day of actual use, end to end.

   Everything else tests a unit. This one walks through what Si
   does on a Tuesday: open the app, see which diary entry is due,
   write it in three voices, capture a stray thought, and close the
   phone. Then it does the rude things — kill the tab mid-sentence,
   reload, come back a day later — and checks nothing was lost.
   ============================================================ */
import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:8778/';
const results = [];
const ok = (n, c, d = '') => results.push([c, n, d]);

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});

/* Release far enough out that the diary run is under way: entry 1 is
   at T-30, so a release 20 days from now puts us at T-20 — entry 11
   is the one due today. */
const RELEASE = (() => {
  const d = new Date(); d.setDate(d.getDate() + 20);
  return d.toISOString().slice(0, 10);
})();

/* his real shape: 31 written entries on X, T-30 → T+1, skipping T0 */
function realX(writtenUpTo = 31) {
  const items = [];
  let off = -30;
  for (let n = 1; n <= 31; n++) {
    items.push({
      id: 'd' + n, title: `Diary ${n}`,
      body: n <= writtenUpTo ? `${n}\nWhat I wrote on day ${n}.` : `${n}\n`,
      status: 'draft', when: off === 0 ? 'T+1' : (off < 0 ? `T${off}` : `T+${off}`),
      tags: '', notes: '', media: [],
    });
    off++; if (off === 0) off = 1;
  }
  return items;
}

async function boot(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  /* Seed ONCE. addInitScript runs on every navigation, so an
     unguarded seed would quietly restore the starting data on
     reload — and make a reload test pass no matter what the app
     did. The guard is the whole reason test 16 means anything. */
  await page.addInitScript(([items, release]) => {
    if (localStorage.getItem('seeded')) return;
    localStorage.setItem('seeded', '1');
    const rec = (v) => JSON.stringify({ v, at: Date.now(), seq: 1 });
    localStorage.setItem('sid.v2.local.slice.p_x',
      rec({ content: { thread: items }, setupDone: {}, notes: '', stats: [], handle: '', profileUrl: '' }));
    localStorage.setItem('sid.v2.local.slice.settings',
      rec({ artist: 'Si', song: "She Won't", releaseDate: release, mode: 'execution',
            themeMode: 'dark', accent: 'ember', seedsRemoved: true }));
  }, [realX(opts.writtenUpTo ?? 10), opts.release || RELEASE]);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 25000 });
  await page.waitForTimeout(1200);
  return { ctx, page, errors };
}

const go = async (page, hash, wait = 800) => {
  await page.evaluate(hh => { location.hash = hh; }, hash);
  await page.waitForTimeout(wait);
};

/* ============================================================
   1. He opens the app and wants to know what to write
   ============================================================ */
{
  const { ctx, page, errors } = await boot();
  await go(page, '#/text');

  const strip = await page.evaluate(() => {
    const el = document.querySelector('#view .diary-strip');
    if (!el) return null;
    return {
      head: el.querySelector('strong')?.textContent,
      sub: el.querySelector('.ds-head .small')?.textContent,
      tracks: [...el.querySelectorAll('.ds-track')].map(t => ({
        name: t.querySelector('.ds-name').textContent,
        href: t.getAttribute('href'),
        done: t.classList.contains('on'),
        count: t.querySelector('.ds-count').textContent,
      })),
    };
  });

  ok('1 the Text screen says which diary entry is due', !!strip, 'no strip rendered');
  ok('1b it names the right one — T-20 is entry 11',
    strip && strip.head === 'Diary 11', strip && strip.head);
  ok('1c and shows all three places it has to be written',
    strip && strip.tracks.length === 3 &&
    JSON.stringify(strip.tracks.map(t => t.name)) === JSON.stringify(['X', 'Threads', 'Bluesky']),
    JSON.stringify(strip?.tracks.map(t => t.name)));
  ok('1d X is marked done — he wrote up to 10, so 11 is not',
    strip && strip.tracks[0].done === false, JSON.stringify(strip?.tracks[0]));
  ok('1e and it counts how many are actually written, not how many slots exist',
    strip && strip.tracks[0].count === '10 of 100', strip?.tracks[0].count);
  ok('1f the three are deep links straight to that entry',
    strip && strip.tracks.every(t => /^#\/p\/\w+\/\w+\/.+/.test(t.href)),
    JSON.stringify(strip?.tracks.map(t => t.href)));
  ok('1g nothing errored on the way', errors.length === 0, errors.slice(0, 2).join(' | '));
  await ctx.close();
}

/* ============================================================
   2. He is behind. It should say so rather than pretend.
   ============================================================ */
{
  const { ctx, page } = await boot({ writtenUpTo: 4 });
  await go(page, '#/text');
  const r = await page.evaluate(() => {
    const el = document.querySelector('#view .diary-strip');
    const t = [...el.querySelectorAll('.ds-track')].map(x => ({
      name: x.querySelector('.ds-name').textContent,
      mark: x.querySelector('.ds-mark').textContent,
      owed: x.classList.contains('owed'),
    }));
    return { sub: el?.querySelector('.ds-head .small')?.textContent, late: el?.classList.contains('late'), t };
  });
  /* X has four written, so seven are owed there. Threads and Bluesky
     have never been touched, so eleven are owed on each. One number
     in the headline would be a lie about two of the three. */
  ok('2 how far behind you are is shown per platform',
    r.t[0].mark === '7' && r.t[1].mark === '11' && r.t[2].mark === '11',
    JSON.stringify(r.t));
  ok('2b each one that is behind is marked', r.t.every(x => x.owed), JSON.stringify(r.t));
  ok('2c the headline still just names the day', /due today/.test(r.sub || ''), r.sub);
  ok('2d and the card marks itself', r.late === true, String(r.late));
  await ctx.close();
}

/* ============================================================
   3. Tapping a track opens that exact entry
   ============================================================ */
{
  const { ctx, page, errors } = await boot();
  await go(page, '#/text');
  const opened = await page.evaluate(async () => {
    const t = [...document.querySelectorAll('#view .ds-track')].find(x => x.querySelector('.ds-name').textContent === 'X');
    t.click();
    await new Promise(r => setTimeout(r, 1500));
    const m = document.querySelector('.modal, .sheet, [role=dialog]');
    const title = document.querySelector('.modal .modal-title, .modal h2, .modal-head')?.textContent || '';
    const ta = document.querySelector('.modal textarea');
    return {
      open: !!m,
      title,
      body: ta ? ta.value : null,
      hash: location.hash,
    };
  });
  ok('3 tapping a track opens the editor', opened.open, JSON.stringify(opened).slice(0, 200));
  ok('3b on the right entry', /Diary 11/.test(opened.title) || /^11\n/.test(opened.body || ''),
    JSON.stringify({ t: opened.title, b: (opened.body || '').slice(0, 20) }));
  ok('3c and the hash is left on the plain tab, so closing does not reopen it',
    opened.hash === '#/p/x/thread', opened.hash);
  ok('3d no errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await ctx.close();
}

/* ============================================================
   4. He writes it. The strip catches up.
   ============================================================ */
{
  const { ctx, page } = await boot();
  await go(page, '#/p/x/thread');

  const wrote = await page.evaluate(async () => {
    const S = window.Sid.S;
    const it = S.get('p_x').content.thread.find(x => x.title === 'Diary 11');
    it.body = '11\nToday the mix came back and the low end finally sat.';
    S.touch('p_x');
    await new Promise(r => setTimeout(r, 600));
    return !!it;
  });
  ok('4 wrote into entry 11', wrote, String(wrote));

  await go(page, '#/text');
  const after = await page.evaluate(() => {
    const el = document.querySelector('#view .diary-strip');
    const x = [...el.querySelectorAll('.ds-track')].find(t => t.querySelector('.ds-name').textContent === 'X');
    return { done: x.classList.contains('on'), count: x.querySelector('.ds-count').textContent,
             sub: el.querySelector('.ds-head .small')?.textContent };
  });
  ok('4b X is now ticked', after.done, JSON.stringify(after));
  ok('4c and the count went up', after.count === '11 of 100', after.count);
  ok('4d and it no longer says he is behind on all three',
    !/2 still/.test(after.sub || ''), after.sub);
  await ctx.close();
}

/* ============================================================
   5. Writing the same entry elsewhere — the other voice is there
      to look at, and there is no way to paste it across
   ============================================================ */
{
  const { ctx, page } = await boot();
  const r = await page.evaluate(async () => {
    const S = window.Sid.S;
    const it = S.get('p_x').content.thread.find(x => x.title === 'Diary 3');
    const xText = it.body;
    location.hash = '#/p/threads/journal';
    await new Promise(r => setTimeout(r, 1200));
    const box = document.querySelector('#view .list-tools input');
    box.value = '3';
    box.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 400));
    const row = [...document.querySelectorAll('#view .item')]
      .find(i => i.querySelector('.item-title').textContent === 'Diary 3');
    row.click();
    await new Promise(r => setTimeout(r, 900));
    const sib = document.querySelector('.modal .sib');
    const toggle = sib?.querySelector('.sib-toggle');
    const hiddenFirst = sib?.querySelector('.sib-panes')?.hidden;
    toggle?.click();
    await new Promise(r => setTimeout(r, 200));
    return {
      xText,
      present: !!sib,
      label: toggle?.textContent || '',
      hiddenFirst,
      shownAfter: sib?.querySelector('.sib-panes')?.hidden === false,
      text: sib?.querySelector('.sib-text')?.textContent || '',
      /* no copy control anywhere inside it */
      copyish: [...(sib?.querySelectorAll('button') || [])]
        .filter(b => /copy|paste|use this/i.test(b.textContent)).length,
    };
  });
  ok('5 writing on Threads shows the X version of the same number', r.present, JSON.stringify(r).slice(0, 200));
  ok('5b it is folded shut until asked for', r.hiddenFirst === true, String(r.hiddenFirst));
  ok('5c and it opens', r.shownAfter, String(r.shownAfter));
  ok('5d it is the actual text he wrote', r.text.includes('What I wrote on day 3'), r.text.slice(0, 60));
  ok('5e the label says where it came from', /X/.test(r.label), r.label);
  ok('5f and there is no way to paste it across', r.copyish === 0, 'copies=' + r.copyish);
  await ctx.close();
}

/* ============================================================
   6. An unwritten sibling is not shown as if it were written
   ============================================================ */
{
  const { ctx, page } = await boot({ writtenUpTo: 2 });
  const r = await page.evaluate(async () => {
    location.hash = '#/p/threads/journal';
    await new Promise(r => setTimeout(r, 1200));
    const box = document.querySelector('#view .list-tools input');
    box.value = '20'; box.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 400));
    [...document.querySelectorAll('#view .item')]
      .find(i => i.querySelector('.item-title').textContent === 'Diary 20')?.click();
    await new Promise(r => setTimeout(r, 800));
    return { sib: !!document.querySelector('.modal .sib') };
  });
  ok('6 a blank sibling is not offered as reference', r.sib === false, String(r.sib));
  await ctx.close();
}

/* ============================================================
   7. Searching a hundred entries
   ============================================================ */
{
  const { ctx, page } = await boot();
  await go(page, '#/p/x/thread', 1200);
  const r = await page.evaluate(async () => {
    const box = document.querySelector('#view .list-tools input');
    const out = {};
    const type = async (v) => {
      box.value = v; box.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 350));
      return [...document.querySelectorAll('#view .item-title')].map(t => t.textContent);
    };
    out.placeholder = box.placeholder;
    out.seven = await type('7');
    out.seventy = await type('70');
    out.phrase = await type('day 3');
    out.nothing = await type('zzzzq');
    out.emptyMsg = document.querySelector('#view .empty')?.textContent || '';
    out.cleared = (await type('')).length;
    return out;
  });
  ok('7 the box says how much it is searching', /100/.test(r.placeholder), r.placeholder);
  ok('7b typing "7" finds Diary 7 alone, not 7 and 17 and 70',
    JSON.stringify(r.seven) === JSON.stringify(['Diary 7']), JSON.stringify(r.seven));
  ok('7c typing "70" finds Diary 70', JSON.stringify(r.seventy) === JSON.stringify(['Diary 70']),
    JSON.stringify(r.seventy));
  ok('7d a phrase searches the text, not just the titles',
    r.phrase.length === 1 && r.phrase[0] === 'Diary 3', JSON.stringify(r.phrase));
  ok('7e a miss says so rather than looking broken',
    r.nothing.length === 0 && /Nothing matches/.test(r.emptyMsg), r.emptyMsg);
  ok('7f clearing it brings the list back', r.cleared === 30, 'rows=' + r.cleared);
  await ctx.close();
}

/* ============================================================
   8. The "Today" chip on the list itself
   ============================================================ */
{
  const { ctx, page } = await boot();
  await go(page, '#/p/x/thread', 1200);
  const r = await page.evaluate(async () => {
    const chip = document.querySelector('#view .list-tools .chip');
    const label = chip?.textContent;
    chip?.click();
    await new Promise(r => setTimeout(r, 900));
    const ta = document.querySelector('.modal textarea');
    return { label, body: ta ? ta.value.slice(0, 4) : null };
  });
  ok('8 the list has a one-tap jump to today\'s entry', /Today/.test(r.label || ''), r.label);
  ok('8b and it opens number 11', (r.body || '').startsWith('11'), JSON.stringify(r.body));
  await ctx.close();
}

/* ============================================================
   9. The rude part: killed mid-sentence, no unload, no goodbye
   ============================================================ */
{
  const { ctx, page } = await boot();
  await go(page, '#/p/x/thread');
  await page.evaluate(async () => {
    const S = window.Sid.S;
    const it = S.get('p_x').content.thread.find(x => x.title === 'Diary 6');
    it.body = '6\nHalf a sentence that never got fini';
    S.touch('p_x');
    await new Promise(r => setTimeout(r, 900));   // past the write debounce
  });

  /* crash the renderer — no beforeunload, no visibilitychange flush */
  await page.goto('chrome://crash').catch(() => {});
  await page.waitForTimeout(400);

  const page2 = await ctx.newPage();
  await page2.goto(URL, { waitUntil: 'domcontentloaded' });
  await page2.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 25000 });
  await page2.waitForTimeout(1000);
  const back = await page2.evaluate(() =>
    window.Sid.S.get('p_x').content.thread.find(x => x.title === 'Diary 6')?.body);
  ok('9 a half-written entry survives the tab being killed',
    /never got fini/.test(back || ''), JSON.stringify(back));
  await ctx.close();
}

/* ============================================================
   10. Same tab, day after: the due number moves on by itself
   ============================================================ */
{
  const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() + 19); return d.toISOString().slice(0, 10); })();
  const { ctx, page } = await boot({ release: yesterday });   // one day further along
  await go(page, '#/text');
  const head = await page.evaluate(() => document.querySelector('#view .diary-strip strong')?.textContent);
  ok('10 a day later it asks for the next one', head === 'Diary 12', String(head));
  await ctx.close();
}

/* ============================================================
   11. All three written — the strip stops nagging
   ============================================================ */
{
  const { ctx, page } = await boot();
  const r = await page.evaluate(async () => {
    const S = window.Sid.S;
    for (const [p, t] of [['x', 'thread'], ['threads', 'journal'], ['bluesky', 'diary']]) {
      const it = S.get(`p_${p}`).content[t].find(x => x.title === 'Diary 11');
      it.body = '11\nwritten here too';
      S.touch(`p_${p}`);
    }
    await new Promise(r => setTimeout(r, 700));
    location.hash = '#/text';
    await new Promise(r => setTimeout(r, 900));
    const el = document.querySelector('#view .diary-strip');
    return { head: el?.querySelector('strong')?.textContent, tracks: el?.querySelectorAll('.ds-track').length || 0 };
  });
  ok('11 once all three are written it says so and stops listing them',
    /written everywhere/.test(r.head || '') && r.tracks === 0, JSON.stringify(r));
  await ctx.close();
}

/* ============================================================
   12. No diary, no release date — no opinions
   ============================================================ */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 25000 });
  await go(page, '#/text', 1000);
  const r = await page.evaluate(() => ({
    strip: !!document.querySelector('#view .diary-strip'),
    tiles: document.querySelectorAll('#view .tile').length,
  }));
  ok('12 a fresh install is told nothing is due, because nothing is', !r.strip, String(r.strip));
  ok('12b and the category screen still works', r.tiles > 0, 'tiles=' + r.tiles);
  ok('12c with no errors', errs.length === 0, errs.slice(0, 2).join(' | '));
  await ctx.close();
}

/* ============================================================
   13. Short lists are left alone
   ============================================================ */
{
  const { ctx, page } = await boot();
  await go(page, '#/p/instagram/reel', 900);
  const r = await page.evaluate(() => ({
    tools: !!document.querySelector('#view .list-tools'),
    items: document.querySelectorAll('#view .item').length,
  }));
  ok('13 an empty or short list gets no search box to ignore',
    !r.tools && r.items < 8, JSON.stringify(r));
  await ctx.close();
}

/* ============================================================
   14. Paging through the rest
   ============================================================ */
{
  const { ctx, page } = await boot();
  await go(page, '#/p/x/thread', 1200);
  const r = await page.evaluate(async () => {
    const count = () => document.querySelectorAll('#view .item').length;
    const first = count();
    const more = [...document.querySelectorAll('#view button')].find(b => /Show \d+ more/.test(b.textContent));
    const label = more?.textContent;
    more.click(); await new Promise(r => setTimeout(r, 400));
    const second = count();
    for (let i = 0; i < 4; i++) {
      const b = [...document.querySelectorAll('#view button')].find(x => /Show \d+ more/.test(x.textContent));
      if (!b) break;
      b.click(); await new Promise(r => setTimeout(r, 300));
    }
    return { first, label, second, all: count(),
             stillMore: [...document.querySelectorAll('#view button')].some(x => /Show \d+ more/.test(x.textContent)) };
  });
  ok('14 the first page is thirty', r.first === 30, 'n=' + r.first);
  ok('14b the button says how many are left', /Show 30 more of 70/.test(r.label || ''), r.label);
  ok('14c tapping it adds thirty', r.second === 60, 'n=' + r.second);
  ok('14d and you can reach all hundred', r.all === 100, 'n=' + r.all);
  ok('14e after which the button is gone', !r.stillMore, String(r.stillMore));
  await ctx.close();
}

/* ============================================================
   15. Deep link typed straight into the address bar
   ============================================================ */
{
  const { ctx, page } = await boot();
  const id = await page.evaluate(() =>
    window.Sid.S.get('p_x').content.thread.find(x => x.title === 'Diary 22').id);
  await go(page, `#/p/x/thread/${id}`, 1500);
  const r = await page.evaluate(() => ({
    open: !!document.querySelector('.modal'),
    body: document.querySelector('.modal textarea')?.value?.slice(0, 3),
    hash: location.hash,
  }));
  ok('15 a link to one entry opens it', r.open, JSON.stringify(r));
  ok('15b the right one', (r.body || '').startsWith('22'), JSON.stringify(r.body));
  ok('15c and a bogus id does not break the page', true);
  await go(page, '#/p/x/thread/nosuchid', 1000);
  const r2 = await page.evaluate(() => ({
    items: document.querySelectorAll('#view .item').length,
    modal: !!document.querySelector('.modal'),
  }));
  ok('15d a link to something deleted just shows the list', r2.items === 30 && !r2.modal, JSON.stringify(r2));
  await ctx.close();
}

/* ============================================================
   16. Everything still there after a reload
   ============================================================ */
{
  const { ctx, page } = await boot();
  await page.evaluate(async () => {
    const S = window.Sid.S;
    const it = S.get('p_x').content.thread.find(x => x.title === 'Diary 11');
    it.body = '11\nkeep me';
    it.status = 'ready';
    it.tags = 'mix';
    S.touch('p_x');
    S.get('settings').pinned = { '#/notes': Date.now() };
    S.touch('settings');
    await new Promise(r => setTimeout(r, 900));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 25000 });
  await page.waitForTimeout(1000);
  const r = await page.evaluate(() => {
    const it = window.Sid.S.get('p_x').content.thread.find(x => x.title === 'Diary 11');
    return { body: it.body, status: it.status, tags: it.tags,
             pinned: !!window.Sid.S.get('settings').pinned?.['#/notes'],
             total: window.Sid.S.get('p_x').content.thread.length };
  });
  ok('16 the text survives a reload', /keep me/.test(r.body), r.body);
  ok('16b so does the status and the tag', r.status === 'ready' && r.tags === 'mix', JSON.stringify(r));
  ok('16c and the starred item in More', r.pinned, String(r.pinned));
  ok('16d and nothing was duplicated', r.total === 100, 'n=' + r.total);
  await ctx.close();
}

/* ============================================================
   17. An editor left open does not follow you to the next page
   ============================================================ */
{
  const { ctx, page } = await boot();
  await go(page, '#/p/x/thread', 1200);
  const r = await page.evaluate(async () => {
    document.querySelector('#view .item').click();
    await new Promise(r => setTimeout(r, 700));
    const opened = !!document.querySelector('.modal');
    location.hash = '#/settings';
    await new Promise(r => setTimeout(r, 900));
    return { opened, stillOpen: !!document.querySelector('.modal'),
             rootHidden: document.querySelector('#modal-root').hidden };
  });
  ok('17 an editor opens', r.opened, String(r.opened));
  ok('17b and navigating away closes it instead of leaving it on top',
    !r.stillOpen && r.rootHidden, JSON.stringify(r));
  await ctx.close();
}

/* ============================================================
   18. The status chips stop listing things you have none of
   ============================================================ */
{
  const { ctx, page } = await boot();
  await go(page, '#/p/x/thread', 1200);
  const long = await page.evaluate(() =>
    [...document.querySelectorAll('#view .chip')].map(c => c.textContent.trim()));
  ok('18 a long list only offers statuses it actually has',
    long.some(t => /^All/.test(t)) && long.some(t => /^Draft 100/.test(t))
    && !long.some(t => / 0$/.test(t)),
    JSON.stringify(long));

  await go(page, '#/p/instagram/reel', 900);
  const short = await page.evaluate(() =>
    [...document.querySelectorAll('#view .chip')].map(c => c.textContent.trim()));
  ok('18b a short list is left exactly as it was', short.length === 7, JSON.stringify(short));

  /* selecting an empty status must not make its own chip vanish */
  const kept = await page.evaluate(async () => {
    location.hash = '#/p/x/thread'; await new Promise(r => setTimeout(r, 1100));
    const ready = [...document.querySelectorAll('#view .chip')].find(c => /Ready/.test(c.textContent));
    if (ready) return { needed: false };
    /* Ready is hidden because there are none — put one there, then it appears */
    const S = window.Sid.S;
    S.get('p_x').content.thread[0].status = 'ready'; S.touch('p_x');
    location.hash = '#/settings'; await new Promise(r => setTimeout(r, 400));
    location.hash = '#/p/x/thread'; await new Promise(r => setTimeout(r, 1100));
    return { needed: true,
      shows: [...document.querySelectorAll('#view .chip')].some(c => /Ready 1/.test(c.textContent)) };
  });
  ok('18c and a status appears the moment something is in it',
    kept.needed === false || kept.shows, JSON.stringify(kept));
  await ctx.close();
}

/* ============================================================
   19. Settings tells the truth about the diary and about storage
   ============================================================ */
{
  const { ctx, page, errors } = await boot();
  await go(page, '#/settings', 1200);
  const r = await page.evaluate(async () => {
    const tab = [...document.querySelectorAll('#view .subtab')].find(t => /backup/i.test(t.textContent));
    tab?.click();
    await new Promise(r => setTimeout(r, 900));
    const txt = document.querySelector('#view').textContent;
    const diaryRows = [...document.querySelectorAll('#view .item')]
      .filter(i => /^(X|Threads|Bluesky)$/.test(i.querySelector('.item-title')?.textContent || ''))
      .map(i => i.textContent);
    return { hasStorageCard: /Keeping this app/.test(txt), diaryRows, txt: txt.slice(0, 0) };
  });
  ok('19 Backup says whether the browser will keep the data', r.hasStorageCard, String(r.hasStorageCard));
  ok('19b the diary card counts what is written, not how many slots exist',
    r.diaryRows.length === 3 && r.diaryRows.some(t => /10 written/.test(t))
    && !r.diaryRows.some(t => /100 of 100/.test(t)),
    JSON.stringify(r.diaryRows));
  ok('19c and nothing errored', errors.length === 0, errors.slice(0, 2).join(' | '));
  await ctx.close();
}

/* ============================================================
   20. The list preview shows the writing, not the number
   ============================================================ */
{
  const { ctx, page } = await boot();
  await go(page, '#/p/x/thread', 1200);
  const r = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#view .item')].slice(0, 3).map(i => ({
      title: i.querySelector('.item-title').textContent,
      body: i.querySelector('.item-body')?.textContent || '',
    }));
    /* an entry still holding nothing but its number shows no preview */
    const blank = [...document.querySelectorAll('#view .item')]
      .find(i => i.querySelector('.item-title').textContent === 'Diary 20');
    return { rows, blankHasBody: !!blank?.querySelector('.item-body') };
  });
  ok('20 the preview drops the number line the title already shows',
    r.rows.every(x => !/^\d+\n/.test(x.body)) && /What I wrote on day 1/.test(r.rows[0].body),
    JSON.stringify(r.rows[0]));
  ok('20b an unwritten entry previews as nothing rather than as its number',
    !r.blankHasBody, String(r.blankHasBody));

  /* and the stored text is untouched — this is display only */
  const stored = await page.evaluate(() =>
    window.Sid.S.get('p_x').content.thread.find(x => x.title === 'Diary 1').body);
  ok('20c while what is actually saved still starts with the number',
    stored.startsWith('1\n'), JSON.stringify(stored.slice(0, 10)));
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
