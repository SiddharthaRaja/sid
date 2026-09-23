/* The navigation restructure: categories on the bottom bar, no Today,
   and a calendar that only shows what the user put in it. */
import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:8778/';
const results = [];
const ok = (n, c, d = '') => results.push([c, n, d]);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });

async function boot(ctx, init) {
  const page = await ctx.newPage();
  page.on('pageerror', e => ok('pageerror: ' + e.message, false));
  if (init) await page.addInitScript(init);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 25000 });
  return page;
}

/* ---- 1. the app opens on Social, not Today -------------------- */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await boot(ctx);
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => ({
    hash: location.hash,
    title: document.querySelector('#top-title')?.textContent,
    tabs: [...document.querySelectorAll('#tabbar button')].map(b => b.textContent.replace(/\s+/g, ' ').trim()),
  }));
  ok('1 the phone opens on Social', /social/.test(r.hash) || r.title === 'Social', JSON.stringify(r).slice(0, 120));
  ok('1b the bottom bar is the six categories',
    JSON.stringify(r.tabs) === JSON.stringify(['Social', 'Text', 'DSPs', 'More', 'Apps', 'Calendar']),
    JSON.stringify(r.tabs));
  ok('1c Today is not on the bar', !r.tabs.includes('Today'), JSON.stringify(r.tabs));
  await ctx.close();
}

/* ---- 2. Today is gone entirely -------------------------------- */
{
  const ctx = await browser.newContext();
  const page = await boot(ctx);
  const r = await page.evaluate(async () => {
    location.hash = '#/today';
    await new Promise(r => setTimeout(r, 500));
    return { title: document.querySelector('#top-title')?.textContent, body: document.querySelector('#view').textContent.slice(0, 60) };
  });
  ok('2 the old Today route falls back to Social rather than erroring',
    r.title === 'Social', JSON.stringify(r));
  const gone = await page.evaluate(() => fetch('./js/modules/dashboard.js').then(r => r.status).catch(() => 'err'));
  ok('2b the dashboard module is deleted from the build', gone === 404 || gone === 'err', String(gone));
  await ctx.close();
}

/* ---- 3. a category screen is a grid of real destinations ------- */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await boot(ctx);
  const r = await page.evaluate(async () => {
    location.hash = '#/social';
    await new Promise(r => setTimeout(r, 500));
    const tiles = [...document.querySelectorAll('#view .tile')];
    return {
      n: tiles.length,
      labels: tiles.map(t => t.querySelector('.tile-label')?.textContent),
      hrefs: tiles.map(t => t.getAttribute('href')),
      notes: tiles.map(t => t.querySelector('.tile-note')?.textContent || ''),
    };
  });
  ok('3 Social shows one tile per social platform', r.n >= 4, JSON.stringify(r.labels));
  ok('3b every tile links to that platform\'s page',
    r.hrefs.every(hh => /^#\/p\//.test(hh)), JSON.stringify(r.hrefs).slice(0, 110));
  ok('3c and says what is inside, so you are not tapping to find out',
    r.notes.every(n => n.length > 0), JSON.stringify(r.notes).slice(0, 110));

  const t = await page.evaluate(async () => {
    location.hash = '#/text';
    await new Promise(r => setTimeout(r, 400));
    return [...document.querySelectorAll('#view .tile .tile-label')].map(x => x.textContent);
  });
  ok('3d Text holds the diary platforms', t.includes('X'), JSON.stringify(t));

  const d = await page.evaluate(async () => {
    location.hash = '#/dsps';
    await new Promise(r => setTimeout(r, 400));
    return [...document.querySelectorAll('#view .tile .tile-label')].map(x => x.textContent);
  });
  ok('3e DSPs holds the streaming services', d.includes('Spotify'), JSON.stringify(d).slice(0, 90));

  const m = await page.evaluate(async () => {
    location.hash = '#/more';
    await new Promise(r => setTimeout(r, 400));
    return [...document.querySelectorAll('#view .tile')].length;
  });
  ok('3f More is a grid of everything else', m >= 15, 'tiles=' + m);

  const a = await page.evaluate(async () => {
    location.hash = '#/apps';
    await new Promise(r => setTimeout(r, 400));
    return [...document.querySelectorAll('#view .tile .tile-label')].map(x => x.textContent);
  });
  ok('3g Apps holds Notepad and Svara',
    a.includes('Notepad') && a.includes('Svara'), JSON.stringify(a));
  await ctx.close();
}

/* ---- 4. the invented seeds are removed, once, safely ----------- */
{
  const ctx = await browser.newContext();
  const page = await boot(ctx);
  const r = await page.evaluate(async () => {
    const S = window.Sid.S;
    return {
      milestones: (S.get('plan').milestones || []).length,
      forms: (S.get('finance').forms || []).length,
      regs: (S.get('rights').registrations || []).length,
      stations: (S.get('radio').stations || []).length,
      flag: !!S.get('settings').seedsRemoved,
      // things that SHOULD still be seeded
      adAccounts: (S.get('ads').accounts || []).length,
      assets: (S.get('assets').items || []).length,
      budget: (S.get('finance').budget || []).length,
    };
  });
  ok('4 the invented master plan is gone', r.milestones === 0, 'milestones=' + r.milestones);
  ok('4b the invented deadlines and registrations are gone',
    r.forms === 0 && r.regs === 0 && r.stations === 0, JSON.stringify(r));
  ok('4c and the flag is set so they never come back', r.flag, String(r.flag));
  ok('4d reference material that never claimed a date is untouched',
    r.adAccounts > 0 && r.assets > 0 && r.budget > 0, JSON.stringify(r));

  const snap = await page.evaluate(async () => {
    const { rows } = await window.Sid.S.listSnapshots();
    return rows.filter(x => /pre-seed-removal/.test(x.label || '')).length;
  });
  ok('4e a snapshot was taken before deleting anything', snap > 0, 'snapshots=' + snap);

  /* and it must not run again on the next boot */
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 25000 });
  const again = await page.evaluate(() => (window.Sid.S.get('plan').milestones || []).length);
  ok('4f and they are not re-seeded on the next launch', again === 0, 'milestones=' + again);
  await ctx.close();
}

/* ---- 5. the calendar shows only what you put in it ------------- */
{
  const ctx = await browser.newContext();
  const page = await boot(ctx);
  const r = await page.evaluate(async () => {
    const S = window.Sid.S;
    S.update('settings', s => { s.releaseDate = '2026-12-01'; s.mode = 'execution'; });
    // one diary entry of my own, dated T-10
    S.update('p_x', s => {
      s.content = s.content || {};
      s.content.thread = [{ id: 'd1', title: 'Diary 1', body: 'mine', when: 'T-10', status: 'draft' }];
    });
    await new Promise(r => setTimeout(r, 400));
    const A = await import('./js/agenda.js');
    const ev = A.collectEvents();
    return {
      total: ev.length,
      titles: ev.map(e => e.title).slice(0, 12),
      kinds: [...new Set(ev.map(e => e.kind))],
      mine: ev.filter(e => e.title === 'Diary 1').length,
    };
  });
  ok('5 my own diary entry is on the calendar', r.mine === 1, JSON.stringify(r).slice(0, 140));
  ok('5b no invented milestones are left on it',
    !r.kinds.includes('milestone') && !r.kinds.includes('deadline'), JSON.stringify(r.kinds));
  ok('5c the calendar is now small enough to read', r.total <= 3, 'events=' + r.total + ' ' + JSON.stringify(r.titles));
  await ctx.close();
}

/* ---- 6. the calendar filter is four groups, not twenty-three --- */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await boot(ctx);
  const r = await page.evaluate(async () => {
    window.Sid.S.update('settings', s => { s.releaseDate = '2026-12-01'; s.mode = 'execution'; });
    location.hash = '#/calendar';
    await new Promise(r => setTimeout(r, 700));
    const chips = [...document.querySelectorAll('#view .chip')].map(c => c.textContent.trim());
    return { chips: chips.slice(0, 10), n: chips.length };
  });
  ok('6 the filter is a handful of group chips',
    r.chips.includes('Everything') && r.chips.includes('Social') && r.chips.includes('DSPs'),
    JSON.stringify(r.chips));

  const expand = await page.evaluate(async () => {
    const btn = [...document.querySelectorAll('#view .chip')].find(c => /Pick individually/.test(c.textContent));
    if (!btn) return { found: false };
    btn.click();
    await new Promise(r => setTimeout(r, 500));
    return { found: true, chips: [...document.querySelectorAll('#view .chip')].length };
  });
  ok('6b and the per-platform switches are still there when you want them',
    expand.found && expand.chips > 15, JSON.stringify(expand));
  await ctx.close();
}

/* ---- 7. swiping moves between the new categories --------------- */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true });
  const page = await boot(ctx);
  await page.evaluate(() => { location.hash = '#/social'; });
  await page.waitForTimeout(400);
  const flick = async (dir) => {
    await page.evaluate(({ x0, x1, y }) => {
      const v = document.getElementById('view');
      const mk = (type, x) => new TouchEvent(type, {
        bubbles: true, cancelable: true,
        touches: type === 'touchend' ? [] : [new Touch({ identifier: 1, target: v, clientX: x, clientY: y })],
        changedTouches: [new Touch({ identifier: 1, target: v, clientX: x, clientY: y })],
      });
      v.dispatchEvent(mk('touchstart', x0));
      v.dispatchEvent(mk('touchend', x1));
    }, { x0: dir < 0 ? 320 : 70, x1: dir < 0 ? 70 : 320, y: 420 });
    await page.waitForTimeout(400);
  };
  await flick(-1);
  const after = await page.evaluate(() => location.hash);
  ok('7 a left flick moves to the next category', after === '#/text', after);
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
