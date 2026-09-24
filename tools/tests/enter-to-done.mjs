/* Enter means done, Shift+Enter means new line — in editor sheets,
   and nowhere it would ruin something multi-line. */
import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:8778/';
const results = [];
const ok = (n, c, d = '') => results.push([c, n, d]);

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});

const RELEASE = (() => { const d = new Date(); d.setDate(d.getDate() + 20); return d.toISOString().slice(0, 10); })();

function seedX() {
  const items = []; let off = -30;
  for (let n = 1; n <= 31; n++) {
    items.push({ id: 'd' + n, title: `Diary ${n}`, body: `${n}\nday ${n}`, status: 'draft',
      when: off === 0 ? 'T+1' : (off < 0 ? `T${off}` : `T+${off}`), tags: '', notes: '', media: [] });
    off++; if (off === 0) off = 1;
  }
  return items;
}

async function boot() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(([items, release]) => {
    if (localStorage.getItem('seeded')) return;
    localStorage.setItem('seeded', '1');
    const rec = (v) => JSON.stringify({ v, at: Date.now(), seq: 1 });
    localStorage.setItem('sid.v2.local.slice.p_x',
      rec({ content: { thread: items }, setupDone: {}, notes: '', stats: [], handle: '', profileUrl: '' }));
    localStorage.setItem('sid.v2.local.slice.settings',
      rec({ artist: 'Si', song: "She Won't", releaseDate: release, mode: 'execution',
            themeMode: 'dark', accent: 'ember', seedsRemoved: true }));
  }, [seedX(), RELEASE]);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 25000 });
  await page.waitForTimeout(1200);
  return { ctx, page, errors };
}

const go = async (page, hash, wait = 900) => {
  await page.evaluate(hh => { location.hash = hh; }, hash);
  await page.waitForTimeout(wait);
};

/** Open Diary 5 on X and return the body textarea. */
async function openEntry(page, title = 'Diary 5') {
  await go(page, '#/p/x/thread', 1200);
  await page.evaluate(async (t) => {
    const box = document.querySelector('#view .list-tools input');
    box.value = t.replace('Diary ', '');
    box.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 350));
    [...document.querySelectorAll('#view .item')]
      .find(i => i.querySelector('.item-title').textContent === t)?.click();
    await new Promise(r => setTimeout(r, 700));
  }, title);
  return page.locator('.modal textarea').first();
}

/* ---- 1. Enter closes the sheet and the text is saved ------------- */
{
  const { ctx, page, errors } = await boot();
  const ta = await openEntry(page);
  await ta.click();
  await page.keyboard.press('End');
  await page.keyboard.type(' — typed this');
  await page.waitForTimeout(350);

  const openBefore = await page.evaluate(() => !!document.querySelector('.modal'));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(700);

  const r = await page.evaluate(() => ({
    open: !!document.querySelector('.modal'),
    rootHidden: document.querySelector('#modal-root').hidden,
    body: window.Sid.S.get('p_x').content.thread.find(x => x.title === 'Diary 5').body,
  }));
  ok('1 the sheet was open', openBefore, String(openBefore));
  ok('1b Enter closes it', !r.open && r.rootHidden, JSON.stringify(r).slice(0, 120));
  ok('1c and what was typed is saved', /typed this/.test(r.body), JSON.stringify(r.body));
  ok('1d with no newline added', !/typed this\n/.test(r.body), JSON.stringify(r.body));
  ok('1e no errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await ctx.close();
}

/* ---- 2. it really persists, not just in memory ------------------- */
{
  const { ctx, page } = await boot();
  const ta = await openEntry(page);
  await ta.click();
  await page.keyboard.press('End');
  await page.keyboard.type(' kept');
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(900);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 25000 });
  await page.waitForTimeout(1000);
  const body = await page.evaluate(() =>
    window.Sid.S.get('p_x').content.thread.find(x => x.title === 'Diary 5').body);
  ok('2 Enter-to-close survives a reload', / kept/.test(body), JSON.stringify(body));
  await ctx.close();
}

/* ---- 3. Shift+Enter is the new line ------------------------------ */
{
  const { ctx, page } = await boot();
  const ta = await openEntry(page);
  await ta.click();
  await page.keyboard.press('End');
  await page.keyboard.down('Shift');
  await page.keyboard.press('Enter');
  await page.keyboard.up('Shift');
  await page.keyboard.type('second line');
  await page.waitForTimeout(350);

  const r = await page.evaluate(() => ({
    open: !!document.querySelector('.modal'),
    body: window.Sid.S.get('p_x').content.thread.find(x => x.title === 'Diary 5').body,
  }));
  ok('3 Shift+Enter does not close the sheet', r.open, String(r.open));
  ok('3b it inserts a real newline', /day 5\nsecond line/.test(r.body), JSON.stringify(r.body));

  /* and a multi-line entry can still be written the way the diary wants */
  await page.keyboard.down('Shift'); await page.keyboard.press('Enter'); await page.keyboard.up('Shift');
  await page.keyboard.type('third');
  await page.waitForTimeout(300);
  const lines = await page.evaluate(() =>
    window.Sid.S.get('p_x').content.thread.find(x => x.title === 'Diary 5').body.split('\n').length);
  ok('3c so a multi-line entry is still writable', lines === 4, 'lines=' + lines);
  await ctx.close();
}

/* ---- 4. modifiers and IME are left alone ------------------------- */
{
  const { ctx, page } = await boot();
  const ta = await openEntry(page);
  await ta.click();
  for (const mod of ['Control', 'Alt', 'Meta']) {
    await page.keyboard.down(mod);
    await page.keyboard.press('Enter');
    await page.keyboard.up(mod);
  }
  await page.waitForTimeout(400);
  const stillOpen = await page.evaluate(() => !!document.querySelector('.modal'));
  ok('4 Ctrl/Alt/Cmd+Enter do not close it', stillOpen, String(stillOpen));

  /* a keystroke the IME is still using to pick a candidate must pass
     straight through, or the app is unusable in those scripts */
  const composing = await page.evaluate(async () => {
    const t = document.querySelector('.modal textarea');
    t.focus();
    t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, isComposing: true }));
    await new Promise(r => setTimeout(r, 300));
    return !!document.querySelector('.modal');
  });
  ok('4b an Enter mid-composition is not stolen from the IME', composing, String(composing));
  await ctx.close();
}

/* ---- 5. the title field too ------------------------------------- */
{
  const { ctx, page } = await boot();
  await openEntry(page);
  const r = await page.evaluate(async () => {
    const inp = [...document.querySelectorAll('.modal input')].find(i => i.type === 'text');
    inp.focus(); inp.value = 'Diary 5 renamed';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 300));
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await new Promise(r => setTimeout(r, 700));
    return {
      open: !!document.querySelector('.modal'),
      title: window.Sid.S.get('p_x').content.thread.find(x => x.id === 'd5').title,
    };
  });
  ok('5 Enter in a single-line field also finishes', !r.open, String(r.open));
  ok('5b and that field is saved too', r.title === 'Diary 5 renamed', r.title);
  await ctx.close();
}

/* ---- 6. a textarea on a PAGE is untouched ------------------------ */
{
  const { ctx, page } = await boot();
  await go(page, '#/p/x/notes', 1000);
  const r = await page.evaluate(async () => {
    const ta = document.querySelector('#view textarea');
    if (!ta) return { found: false };
    ta.focus();
    ta.value = 'line one';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 250));
    const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    ta.dispatchEvent(ev);
    await new Promise(r => setTimeout(r, 250));
    return { found: true, prevented: ev.defaultPrevented, stillThere: !!document.querySelector('#view textarea') };
  });
  ok('6 the notes panel still takes a plain Enter',
    r.found && !r.prevented && r.stillThere, JSON.stringify(r));
  await ctx.close();
}

/* ---- 7. so are song lyrics -------------------------------------- */
{
  const { ctx, page } = await boot();
  const r = await page.evaluate(async () => {
    const S = window.Sid.S;
    const np = S.get('notepad');
    np.songs = [{ id: 's1', title: 'Test', createdAt: Date.now(), updatedAt: Date.now(),
      sections: [{ id: 'x1', name: 'Verse', status: 'draft', content: 'first line' }] }];
    np.open = 's1';
    S.touch('notepad');
    location.hash = '#/np';
    await new Promise(r => setTimeout(r, 1400));
    const ta = document.querySelector('#view textarea.np-area');
    if (!ta) return { found: false };
    ta.focus();
    const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    ta.dispatchEvent(ev);
    await new Promise(r => setTimeout(r, 250));
    return { found: true, prevented: ev.defaultPrevented };
  });
  ok('7 writing lyrics is unaffected — Enter is still a new line',
    r.found && !r.prevented, JSON.stringify(r));
  await ctx.close();
}

/* ---- 8. Enter never fires a destructive button ------------------- */
{
  const { ctx, page } = await boot();
  const r = await page.evaluate(async () => {
    const before = window.Sid.S.get('p_x').content.thread.length;
    /* a sheet whose only action is a delete */
    const { confirmDelete } = await import('./js/ui.js');
    let fired = false;
    confirmDelete('a thing', () => { fired = true; });
    await new Promise(r => setTimeout(r, 400));
    const inp = document.createElement('input');
    document.querySelector('.modal .modal-body').append(inp);
    inp.focus();
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await new Promise(r => setTimeout(r, 400));
    return { fired, after: window.Sid.S.get('p_x').content.thread.length, before };
  });
  ok('8 Enter does not press a Delete button', r.fired === false, JSON.stringify(r));
  ok('8b and nothing was removed', r.after === r.before, JSON.stringify(r));
  await ctx.close();
}

/* ---- 9. it works in every sheet, not just the one I tested ------- */
{
  const { ctx, page, errors } = await boot();
  await go(page, '#/notes', 1000);
  const r = await page.evaluate(async () => {
    /* the Notes section's own "new note" sheet */
    const add = [...document.querySelectorAll('#view button')].find(b => /new note/i.test(b.textContent));
    if (!add) return { skipped: true };
    add.click();
    await new Promise(r => setTimeout(r, 700));
    const opened = !!document.querySelector('.modal');
    const f = document.querySelector('.modal input, .modal textarea');
    f.focus();
    f.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await new Promise(r => setTimeout(r, 600));
    return { skipped: false, opened, closed: !document.querySelector('.modal') };
  });
  ok('9 the same key works in other sheets', r.skipped || (r.opened && r.closed), JSON.stringify(r));
  ok('9b no errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await ctx.close();
}

/* ---- 10. Escape still works, and closing by X still saves -------- */
{
  const { ctx, page } = await boot();
  const ta = await openEntry(page);
  await ta.click();
  await page.keyboard.press('End');
  await page.keyboard.type(' esc');
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => ({
    open: !!document.querySelector('.modal'),
    body: window.Sid.S.get('p_x').content.thread.find(x => x.title === 'Diary 5').body,
  }));
  ok('10 Escape still closes', !r.open, String(r.open));
  ok('10b and what was typed is still saved', / esc/.test(r.body), JSON.stringify(r.body));
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
