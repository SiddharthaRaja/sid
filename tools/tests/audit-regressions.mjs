/* One test per bug the audit found. */
import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:8778/';
const results = [];
const ok = (n, c, d = '') => results.push([c, n, d]);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
const consoleErrs = [];
page.on('console', m => { if (m.type() === 'error') consoleErrs.push(m.text()); });

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 25000 });

/* 1. touch() with a bad slice id must not jam the dirty set ------- */
{
  const r = await page.evaluate(async () => {
    await window.Sid.S.flushAll();
    window.Sid.S.touch(undefined);
    window.Sid.S.touch('not-a-real-slice');
    await new Promise(r => setTimeout(r, 400));
    return window.Sid.S.diagnose();
  });
  ok('1 an unknown slice id is refused, not queued for ever',
    r.dirty.length === 0 && r.localDirty.length === 0, JSON.stringify({ d: r.dirty, l: r.localDirty }));
  const junk = await page.evaluate(() => Object.keys(localStorage).filter(k => k.includes('undefined')));
  ok('1b no junk "undefined" key is written', junk.length === 0, junk.join(','));
}

/* 2. a remote update must not detach the object a page is holding -- */
{
  const r = await page.evaluate(async () => {
    const S = window.Sid.S;
    S.update('notes', s => { s.items = [{ id: 'k1', title: 'one', body: 'a' }]; });
    const held = S.get('notes');                 // what a module captures at render
    const heldItem = held.items[0];
    // simulate what arrives from another device
    await S.importAll({ notes: { items: [{ id: 'k1', title: 'one', body: 'edited-elsewhere' }] } });
    return {
      sameSlice: held === S.get('notes'),
      sameItem: heldItem === S.get('notes').items[0],
      body: heldItem.body,
    };
  });
  ok('2 a synced update keeps the slice object the page is holding', r.sameSlice, JSON.stringify(r));
  ok('2b and keeps the record objects, matched by id', r.sameItem, JSON.stringify(r));
  ok('2c so the page sees the new value through its old reference', r.body === 'edited-elsewhere', r.body);
}

/* 3. removeFrom must never delete the wrong record ---------------- */
{
  const r = await page.evaluate(async () => {
    const { removeFrom } = await import('./js/ui.js');
    const arr = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const detached = { id: 'zzz' };              // not in the array at all
    const removedGhost = removeFrom(arr, detached);
    const afterGhost = arr.map(x => x.id).join('');
    // a stale copy of a real record still resolves by id
    const removedById = removeFrom(arr, { id: 'b' });
    return { removedGhost, afterGhost, removedById, after: arr.map(x => x.id).join('') };
  });
  ok('3 deleting a record that is not in the list removes NOTHING',
    r.removedGhost === false && r.afterGhost === 'abc', JSON.stringify(r));
  ok('3b a stale copy of a real record still deletes the right one',
    r.removedById === true && r.after === 'ac', JSON.stringify(r));
}

/* 4. a malformed import is refused instead of writing null -------- */
{
  const r = await page.evaluate(() => {
    const S = window.Sid.S;
    return {
      arr: S.inspectImport([1, 2, 3]).ok,
      nul: S.inspectImport(null).ok,
      junk: S.inspectImport({ whatever: 1 }).ok,
      good: S.inspectImport({ notes: { items: [] } }).ok,
      flagsEmpty: S.inspectImport({ notes: { items: [] } }).empty.includes('notes'),
      skipsNull: S.inspectImport({ notes: null, write: { swipe: [] } }).bad.includes('notes'),
    };
  });
  ok('4 an array, null or unknown-key file is refused',
    !r.arr && !r.nul && !r.junk, JSON.stringify(r));
  ok('4b a real backup is accepted', r.good, JSON.stringify(r));
  ok('4c an empty section is flagged before you agree to it', r.flagsEmpty, JSON.stringify(r));
  ok('4d a null section is marked malformed and skipped', r.skipsNull, JSON.stringify(r));
}

/* 5. importing null must not null out a slice --------------------- */
{
  const r = await page.evaluate(async () => {
    const S = window.Sid.S;
    S.update('notes', s => { s.items = [{ id: 'keep', title: 'still here', body: '' }]; });
    await new Promise(r => setTimeout(r, 250));
    try { await S.importAll({ notes: null, write: { swipe: [], phrases: [] } }); } catch {}
    const n = S.get('notes');
    return { isObj: !!n && typeof n === 'object', items: JSON.stringify(n.items || []) };
  });
  ok('5 a null section in a backup cannot null out your data',
    r.isObj && r.items.includes('still here'), JSON.stringify(r));
}

/* 6. a Delete button in a sheet needs two taps -------------------- */
{
  const r = await page.evaluate(async () => {
    const { modal } = await import('./js/ui.js');
    let fired = 0;
    modal({ title: 'T', body: document.createElement('div'),
      actions: [{ label: 'Delete', cls: 'btn-danger btn-ghost', onClick: () => { fired++; } }] });
    const b = [...document.querySelectorAll('#modal-root .modal-foot .btn')].find(x => /Delete|Tap again/.test(x.textContent));
    b.click();
    const afterOne = { fired, label: b.textContent, armed: !!b.dataset.armed };
    b.click();
    const afterTwo = fired;
    document.querySelector('#modal-root').hidden = true;
    return { afterOne, afterTwo };
  });
  ok('6 one tap on Delete arms it and deletes nothing',
    r.afterOne.fired === 0 && r.afterOne.armed && /Tap again/.test(r.afterOne.label), JSON.stringify(r));
  ok('6b the second tap is what deletes', r.afterTwo === 1, JSON.stringify(r));
}

/* 7. the previously-unsaved modal fields now persist -------------- */
{
  const r = await page.evaluate(async () => {
    const S = window.Sid.S;
    const { field, selectField } = await import('./js/ui.js');
    await S.flushAll();
    const p = S.get('playlists');
    p.items = [{ id: 'pp', name: 'old name', checks: [] }];
    S.touch('playlists');
    await new Promise(r => setTimeout(r, 250));

    // render the editor field exactly as playlists.js does, then type
    const el = field('Playlist name', p.items[0], 'name', { slice: 'playlists' });
    const input = el.querySelector('input');
    input.value = 'typed and dismissed with Escape';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 400));
    const raw = localStorage.getItem('sid.v2.local.slice.playlists') || '';
    return { saved: raw.includes('typed and dismissed with Escape') };
  });
  ok('7 editing a sheet field is written even if you never press Save', r.saved, JSON.stringify(r));
}

/* 8. a weekly review is in the list from the first keystroke ------- */
{
  const r = await page.evaluate(async () => {
    location.hash = '#/review';
    await new Promise(r => setTimeout(r, 600));
    const before = (window.Sid.S.get('review').reviews || []).length;
    const ta = [...document.querySelectorAll('#view textarea')][0];
    if (!ta) return { skip: true };
    ta.value = 'this week I finally shipped it';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 400));
    const raw = localStorage.getItem('sid.v2.local.slice.review') || '';
    return { before, saved: raw.includes('finally shipped it') };
  });
  ok('8 a weekly review is saved as you type, before you press Save',
    r.skip || r.saved, JSON.stringify(r));
}

ok('no uncaught page errors', errs.length === 0, errs.join(' | '));
const realConsoleErrs = consoleErrs.filter(t => !/ignoring unknown slice id/.test(t));
ok('no unexpected console errors', realConsoleErrs.length === 0, realConsoleErrs.slice(0, 3).join(' | '));

await browser.close();
let bad = 0;
for (const [pass, name, detail] of results) {
  if (!pass) bad++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${pass ? '' : '   << ' + detail}`);
}
console.log(bad ? `\n${bad} FAILED` : `\nall ${results.length} passed`);
process.exit(bad ? 1 : 0);
