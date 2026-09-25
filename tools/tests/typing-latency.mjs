/* Typing latency. The bug this guards against is not a slow function
   — it was a CSS property. A full-viewport backdrop blur behind an
   open sheet is re-composited on every frame, so every keystroke cost
   40ms more than it should, and the cost grew with the window: fine
   on a phone, bad on a desktop.

   The budget here is one frame. A keystroke should cost no more in
   the app's own editor than the same keystroke in a bare textarea
   sitting on the same page. */
import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:8778/';
const results = [];
const ok = (n, c, d = '') => results.push([c, n, d]);

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});

function bigX(n = 100) {
  const items = []; let off = -30;
  const para = 'The day the vocal finally sat where it should. Took eleven takes. '.repeat(3);
  for (let i = 1; i <= n; i++) {
    items.push({ id: 'd' + i, title: `Diary ${i}`, body: `${i}\n${para}`, status: 'draft',
      when: off < 0 ? `T${off}` : `T+${off}`, tags: 'diary, bts', notes: '', media: [] });
    off++; if (off === 0) off = 1;
  }
  return items;
}

/* a desktop window, because that is where the cost showed up */
const ctx = await browser.newContext({ viewport: { width: 1680, height: 1050 } });
const page = await ctx.newPage();
page.on('pageerror', e => ok('pageerror: ' + e.message, false));
await page.addInitScript((items) => {
  if (localStorage.getItem('seeded')) return;
  localStorage.setItem('seeded', '1');
  const rec = (v) => JSON.stringify({ v, at: Date.now(), seq: 1 });
  localStorage.setItem('sid.v2.local.slice.p_x',
    rec({ content: { thread: items }, setupDone: {}, notes: '', stats: [], handle: '', profileUrl: '' }));
  localStorage.setItem('sid.v2.local.slice.settings',
    rec({ artist: 'Si', song: "She Won't", releaseDate: '2026-12-01', mode: 'execution',
          themeMode: 'dark', accent: 'ember', seedsRemoved: true }));
}, bigX());
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 25000 });
await page.waitForTimeout(1500);

/* ---- 1. no typing surface sits behind a viewport-wide blur ------- */
{
  const blurred = await page.evaluate(() => {
    const out = [];
    for (const sel of ['.modal-root', '.pal']) {
      /* read the rule rather than the element, so it is caught even
         when nothing of that kind is on screen right now */
      for (const sheet of document.styleSheets) {
        let rules; try { rules = sheet.cssRules; } catch { continue; }
        for (const r of rules) {
          if (!r.selectorText || !r.style) continue;
          if (r.selectorText.split(',').some(s => s.trim().startsWith(sel))) {
            const v = r.style.getPropertyValue('backdrop-filter')
              || r.style.getPropertyValue('-webkit-backdrop-filter');
            if (v && v !== 'none') out.push(`${r.selectorText} { backdrop-filter: ${v} }`);
          }
        }
      }
    }
    return out;
  });
  ok('1 nothing you type into sits behind a full-viewport blur',
    blurred.length === 0, blurred.join(' | '));
}

/* ---- 2. a keystroke in the editor costs one frame ---------------- */
await page.evaluate(async () => {
  location.hash = '#/p/x/thread';
  await new Promise(r => setTimeout(r, 1400));
  document.querySelectorAll('#view .item')[3].click();
  await new Promise(r => setTimeout(r, 900));
});

const measured = await page.evaluate(async () => {
  const measure = async (el, n) => {
    el.focus(); el.setSelectionRange(el.value.length, el.value.length);
    const f = [], sync = [];
    for (let i = 0; i < n; i++) {
      await new Promise(r => requestAnimationFrame(r));
      const t0 = performance.now();
      el.value += (i % 40 === 39) ? '\n' : 'x';
      el.setSelectionRange(el.value.length, el.value.length);
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'x' }));
      sync.push(performance.now() - t0);
      await new Promise(r => requestAnimationFrame(r));
      f.push(performance.now() - t0);
    }
    const med = (a) => { a = a.slice().sort((x, y) => x - y); return +a[Math.floor(a.length / 2)].toFixed(1); };
    const p95 = (a) => { a = a.slice().sort((x, y) => x - y); return +a[Math.floor(a.length * 0.95)].toFixed(1); };
    return { median: med(f), p95: p95(f), syncMedian: med(sync) };
  };

  const app = document.querySelector('.modal textarea');

  /* the control: same text, same size, same page, no app behind it */
  const ctrl = document.createElement('textarea');
  ctrl.value = app.value;
  ctrl.style.cssText = 'position:fixed;left:-9999px;width:' + app.offsetWidth + 'px;height:' + app.offsetHeight + 'px';
  document.body.append(ctrl);

  const a = await measure(app, 100);
  const c = await measure(ctrl, 100);
  ctrl.remove();
  return { app: a, ctrl: c };
});

const over = +(measured.app.median - measured.ctrl.median).toFixed(1);
ok('2 a keystroke in the editor costs no more than a bare textarea',
  over <= 8, `app ${measured.app.median}ms vs control ${measured.ctrl.median}ms (+${over}ms)`);
ok('2b and it fits inside a frame and a half',
  measured.app.median <= 25, measured.app.median + 'ms');
ok('2c the JavaScript part of it is negligible',
  measured.app.syncMedian < 5, measured.app.syncMedian + 'ms');
ok('2d and it does not spike',
  measured.app.p95 <= 40, measured.app.p95 + 'ms p95');

/* ---- 3. the same on a page, with no sheet open ------------------- */
{
  await page.evaluate(async () => {
    document.querySelector('.modal .icon-btn')?.click();
    location.hash = '#/p/x/notes';
    await new Promise(r => setTimeout(r, 1200));
  });
  const r = await page.evaluate(async () => {
    const el = document.querySelector('#view textarea');
    el.focus();
    const f = [];
    for (let i = 0; i < 60; i++) {
      await new Promise(r => requestAnimationFrame(r));
      const t0 = performance.now();
      el.value += 'x';
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'x' }));
      await new Promise(r => requestAnimationFrame(r));
      f.push(performance.now() - t0);
    }
    f.sort((a, b) => a - b);
    return +f[Math.floor(f.length / 2)].toFixed(1);
  });
  ok('3 typing on a page is one frame too', r <= 25, r + 'ms');
}

/* ---- 4. the sheet still reads as a sheet ------------------------- */
{
  const look = await page.evaluate(async () => {
    location.hash = '#/p/x/thread';
    await new Promise(r => setTimeout(r, 1300));
    document.querySelector('#view .item').click();
    await new Promise(r => setTimeout(r, 800));
    const root = document.querySelector('#modal-root');
    const cs = getComputedStyle(root);
    const m = cs.backgroundColor.match(/[\d.]+/g);
    return { bg: cs.backgroundColor, alpha: m && m.length === 4 ? +m[3] : 1 };
  });
  ok('4 the backdrop is still dark enough to sit behind a dialog',
    look.alpha >= 0.55, JSON.stringify(look));
}

/* ---- 5. no sheet renders the word "null" --------------------------
   .append(null) puts the STRING "null" on the page, and an optional
   row that is sometimes absent is exactly where that happens. Sweep
   the editors rather than trusting the one that was looked at. */
{
  const strays = await page.evaluate(async () => {
    const found = [];
    const targets = [
      ['#/p/instagram', 'Instagram'], ['#/p/x', 'X'], ['#/p/ytshorts', 'YouTube Shorts'],
      ['#/p/spotify', 'Spotify'], ['#/p/threads', 'Threads'], ['#/p/bluesky', 'Bluesky'],
      ['#/p/tiktok', 'TikTok'], ['#/p/facebook', 'Facebook'],
    ];
    for (const [hash, name] of targets) {
      document.querySelector('#modal-root').hidden = true;
      location.hash = hash;
      await new Promise(r => setTimeout(r, 900));
      const add = [...document.querySelectorAll('#view button')]
        .find(b => /^New /.test(b.textContent.trim()));
      if (!add) continue;
      add.click();
      await new Promise(r => setTimeout(r, 700));
      const m = document.querySelector('.modal');
      if (!m) continue;
      /* a bare text node reading exactly "null" or "undefined" */
      const walk = document.createTreeWalker(m, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walk.nextNode())) {
        const t = n.textContent.trim();
        if (t === 'null' || t === 'undefined') { found.push(name + ': ' + t); break; }
      }
      document.querySelector('.modal .icon-btn')?.click();
      await new Promise(r => setTimeout(r, 250));
    }
    return found;
  });
  ok('5 no editor renders a stray "null" on the page',
    strays.length === 0, strays.join(' | '));
}

await browser.close();
console.log(`\neditor ${measured.app.median}ms · bare textarea ${measured.ctrl.median}ms · js ${measured.app.syncMedian}ms\n`);
let bad = 0;
for (const [pass, name, detail] of results) {
  if (!pass) bad++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${pass ? '' : '   << ' + detail}`);
}
console.log(bad ? `\n${bad} FAILED` : `\nall ${results.length} passed`);
process.exit(bad ? 1 : 0);
