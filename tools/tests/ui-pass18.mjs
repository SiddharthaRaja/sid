/* Pass 18: the platform header is gone, playbooks are one article,
   More can be starred, and the capture button clears the bottom bar. */
import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:8778/';
const results = [];
const ok = (n, c, d = '') => results.push([c, n, d]);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const phone = { width: 390, height: 844 };

async function boot(vp = phone) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  page.on('pageerror', e => ok('pageerror: ' + e.message, false));
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 25000 });
  return { ctx, page };
}
const go = async (page, hash, wait = 700) => {
  await page.evaluate(hh => { location.hash = hh; }, hash);
  await page.waitForTimeout(wait);
};

/* ---- 1. the platform page starts with its tabs ----------------- */
{
  const { ctx, page } = await boot();
  await go(page, '#/p/ytshorts');
  const r = await page.evaluate(() => {
    const view = document.querySelector('#view');
    /* each module renders into its own wrapper div, so "first thing
       on the page" means the first child of that wrapper */
    const root = view.firstElementChild || view;
    const firstChild = root.firstElementChild;
    const tabs = view.querySelector('.subtabs');
    return {
      firstClass: firstChild?.className,
      hasPageHead: !!view.querySelector('.page-head'),
      tabsTop: tabs ? Math.round(tabs.getBoundingClientRect().top) : -1,
      tabLabels: [...view.querySelectorAll('.subtabs .subtab')].map(t => t.textContent.trim()),
      // no handle / profile URL boxes on the content screen
      inputs: [...view.querySelectorAll('input')].map(i => i.placeholder),
      title: document.querySelector('#top-title')?.textContent,
    };
  });
  ok('1 the tabs are the first thing on the page', /subtabs/.test(r.firstClass || ''), r.firstClass);
  ok('1b the fat header block is gone', !r.hasPageHead, String(r.hasPageHead));
  ok('1c the handle and profile URL boxes are not on the content screen',
    !r.inputs.some(p => /handle|profile/i.test(p || '')), JSON.stringify(r.inputs));
  ok('1d the platform name is still shown, in the title bar', r.title === 'YouTube Shorts', r.title);
  ok('1e the tabs are the ones expected',
    JSON.stringify(r.tabLabels) === JSON.stringify(['Shorts', 'Setup', 'Stats', 'Info', 'Notes']),
    JSON.stringify(r.tabLabels));

  /* the content starts high up the screen now */
  ok('1f and they sit near the top of the view', r.tabsTop < 260, 'top=' + r.tabsTop);
  await ctx.close();
}

/* ---- 2. handle + profile URL moved into Setup, and still save --- */
{
  const { ctx, page } = await boot();
  await go(page, '#/p/ytshorts/setup');
  const r = await page.evaluate(async () => {
    const view = document.querySelector('#view');
    const inputs = [...view.querySelectorAll('input')];
    const handle = inputs.find(i => /@you/.test(i.placeholder || ''));
    const url = inputs.find(i => /https/.test(i.placeholder || ''));
    if (!handle || !url) return { found: false };
    handle.value = '@sidsings';
    handle.dispatchEvent(new Event('input', { bubbles: true }));
    url.value = 'https://youtube.com/@sidsings';
    url.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 500));
    const raw = localStorage.getItem(`sid.v2.${window.Sid.L.namespace()}.slice.p_ytshorts`) || '';
    return { found: true, saved: /sidsings/.test(raw), mem: window.Sid.S.get('p_ytshorts').handle };
  });
  ok('2 the account fields are on the Setup tab', r.found, JSON.stringify(r));
  ok('2b and typing in them still saves', r.saved && r.mem === '@sidsings', JSON.stringify(r));
  await ctx.close();
}

/* ---- 3. every platform got the same treatment ------------------ */
{
  const { ctx, page } = await boot();
  const bad = [];
  for (const k of ['instagram', 'youtube', 'tiktok', 'x', 'threads', 'spotify', 'facebook', 'bluesky']) {
    await go(page, `#/p/${k}`, 800);
    const r = await page.evaluate(() => {
      const v = document.querySelector('#view');
      const root = v.firstElementChild || v;
      return {
        head: !!v.querySelector('.page-head'),
        first: root.firstElementChild?.className || '',
      };
    });
    if (r.head || !/subtabs/.test(r.first)) bad.push(k + ':' + JSON.stringify(r));
  }
  ok('3 all eight platforms checked open straight onto their tabs', bad.length === 0, bad.join(' | '));
  await ctx.close();
}

/* ---- 4. a playbook is one continuous article ------------------- */
{
  const { ctx, page } = await boot();
  await go(page, '#/book', 900);
  const r = await page.evaluate(async () => {
    const open = [...document.querySelectorAll('#view .card.clickable')]
      .find(c => /command deck/i.test(c.textContent));
    if (!open) return { opened: false };
    open.click();
    await new Promise(r => setTimeout(r, 2500));
    const v = document.querySelector('#view');
    return {
      opened: true,
      headings: v.querySelectorAll('h2.pb-h').length,
      subtabs: v.querySelectorAll('.subtab').length,
      jumpChips: v.querySelectorAll('.chip').length,
      /* The '← All' button back to the library is fine, and a jump
         chip can legitimately contain an arrow (one section is called
         "THE CALENDAR — T-45 → T+55"). What must be gone are the
         prev/next SECTION pagers, which were plain buttons. */
      nextButton: [...v.querySelectorAll('button:not(.chip):not(.btn)')]
        .some(b => /→|←/.test(b.textContent)),
      chars: v.textContent.length,
    };
  });
  ok('4 the document opened', r.opened, JSON.stringify(r));
  ok('4b every section is rendered at once, not one at a time', r.headings > 3, 'headings=' + r.headings);
  ok('4c the section tab strip is gone', r.subtabs === 0, 'subtabs=' + r.subtabs);
  ok('4d the prev/next paging buttons are gone', !r.nextButton, String(r.nextButton));
  ok('4e there is a jump list instead', r.jumpChips > 3, 'chips=' + r.jumpChips);
  ok('4f and the whole thing is on the page', r.chars > 8000, 'chars=' + r.chars);

  const jumped = await page.evaluate(async () => {
    const before = window.scrollY;
    const chips = [...document.querySelectorAll('#view .chip')];
    chips[Math.min(4, chips.length - 1)]?.click();
    await new Promise(r => setTimeout(r, 800));
    return { before, after: window.scrollY };
  });
  ok('4g tapping a jump chip scrolls down the article', jumped.after > jumped.before,
    JSON.stringify(jumped));
  await ctx.close();
}

/* ---- 5. starring in More --------------------------------------- */
{
  const { ctx, page } = await boot();
  await go(page, '#/more');
  const before = await page.evaluate(() =>
    [...document.querySelectorAll('#view .tile .tile-label')].map(x => x.textContent));
  ok('5 More lists everything', before.length > 20, 'tiles=' + before.length);
  ok('5b Notes is well down the list to begin with', before.indexOf('Notes') > 2, 'idx=' + before.indexOf('Notes'));

  const r = await page.evaluate(async () => {
    const tiles = [...document.querySelectorAll('#view .tile')];
    const notes = tiles.find(t => t.querySelector('.tile-label')?.textContent === 'Notes');
    const hash = notes.getAttribute('href');
    notes.querySelector('.tile-star').click();
    await new Promise(r => setTimeout(r, 600));
    return {
      hash,
      nowFirst: document.querySelector('#view .tile .tile-label')?.textContent,
      stillHere: location.hash,
      labels: [...document.querySelectorAll('#view .tile .tile-label')].map(x => x.textContent).slice(0, 3),
      saved: !!window.Sid.S.get('settings').pinned?.['#/notes'],
      hasDivider: /Everything else/.test(document.querySelector('#view').textContent),
    };
  });
  ok('5c starring moves it to the top', r.nowFirst === 'Notes', JSON.stringify(r.labels));
  ok('5d tapping the star does NOT open the thing', r.stillHere === '#/more', r.stillHere);
  ok('5e the choice is saved', r.saved, String(r.saved));
  ok('5f and the rest are separated off', r.hasDivider, String(r.hasDivider));

  /* survives a reload, and can be un-starred */
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 25000 });
  await go(page, '#/more');
  const after = await page.evaluate(async () => {
    const first = document.querySelector('#view .tile .tile-label')?.textContent;
    document.querySelector('#view .tile .tile-star').click();
    await new Promise(r => setTimeout(r, 600));
    return { first, unpinned: !window.Sid.S.get('settings').pinned?.['#/notes'] };
  });
  ok('5g it is still starred after a reload', after.first === 'Notes', after.first);
  ok('5h and tapping again un-stars it', after.unpinned, String(after.unpinned));
  await ctx.close();
}

/* ---- 6. quick capture clears the bottom bar -------------------- */
{
  const { ctx, page } = await boot();
  for (const hash of ['#/social', '#/more', '#/p/instagram', '#/calendar']) {
    await go(page, hash, 500);
    const r = await page.evaluate(() => {
      const f = document.querySelector('.fab'), t = document.querySelector('.tabbar');
      if (!f || !t) return { skip: true };
      const fr = f.getBoundingClientRect(), tr = t.getBoundingClientRect();
      return {
        clears: fr.bottom <= tr.top + 1,
        above: +getComputedStyle(f).zIndex > +getComputedStyle(t).zIndex,
        onScreen: fr.top > 0 && fr.bottom < window.innerHeight,
      };
    });
    if (r.skip) continue;
    ok(`6 capture button clears the bar on ${hash}`, r.clears && r.above && r.onScreen, JSON.stringify(r));
  }
  await ctx.close();
}

/* ---- 7. the page is truly black -------------------------------- */
{
  const { ctx, page } = await boot();
  const r = await page.evaluate(() => {
    const cs = (sel, prop) => { const e = document.querySelector(sel); return e ? getComputedStyle(e)[prop] : null; };
    return {
      body: cs('body', 'backgroundColor'),
      theme: document.querySelector('meta[name=theme-color]')?.content,
      tile: cs('.tile', 'backgroundColor'),
    };
  });
  ok('7 the page background is pure black', r.body === 'rgb(0, 0, 0)', r.body);
  ok('7b the browser chrome matches', r.theme === '#000000', String(r.theme));
  ok('7c but surfaces are still distinguishable from it',
    r.tile && r.tile !== 'rgb(0, 0, 0)' && r.tile !== 'rgba(0, 0, 0, 0)', String(r.tile));
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
