/* The append-only journal and the live backup file. The point of both
   is that they hold when the layers above them do not. */
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

/* ---- 1. an edit is journalled ------------------------------------ */
{
  const ctx = await browser.newContext();
  const page = await boot(ctx);
  const r = await page.evaluate(async () => {
    const J = await import('./js/journal.js');
    await J.clearAll();
    window.Sid.S.update('notes', s => { s.items = [{ id: 'j1', title: 'journalled', body: '' }]; });
    await new Promise(r => setTimeout(r, 700));
    const rows = await J.list();
    const first = rows.find(x => x.id === 'notes');
    const v = first ? await J.read(first.key) : null;
    return { n: rows.length, has: JSON.stringify(v) };
  });
  ok('1 an edit is copied into the append-only log', r.n > 0 && /journalled/.test(r.has), JSON.stringify({ n: r.n }));
  await ctx.close();
}

/* ---- 2. it is throttled, not written per keystroke --------------- */
{
  const ctx = await browser.newContext();
  const page = await boot(ctx);
  const r = await page.evaluate(async () => {
    const J = await import('./js/journal.js');
    await J.clearAll();
    for (let i = 0; i < 40; i++) {
      window.Sid.S.update('notes', s => { s.items = [{ id: 'k', title: 'typing ' + i, body: '' }]; });
      await new Promise(r => setTimeout(r, 25));
    }
    await new Promise(r => setTimeout(r, 600));
    return (await J.list()).filter(x => x.id === 'notes').length;
  });
  ok('2 forty keystrokes do not make forty log entries', r <= 3, 'entries=' + r);
  await ctx.close();
}

/* ---- 3. THE POINT: it survives the layer above being broken ------ */
{
  const ctx = await browser.newContext();
  const page = await boot(ctx);
  const r = await page.evaluate(async () => {
    const J = await import('./js/journal.js');
    await J.clearAll();

    // write something real, and let it be journalled
    window.Sid.S.update('notes', s => { s.items = [{ id: 'g', title: 'the good version', body: 'three hours of this' }]; });
    await new Promise(r => setTimeout(r, 700));

    // now simulate the whole device layer going wrong: corrupt the
    // mirror and wipe the snapshot database
    const key = `sid.v2.${window.Sid.L.namespace()}.slice.notes`;
    localStorage.setItem(key, '{{{ corrupt');
    await new Promise((res) => { const d = indexedDB.deleteDatabase('sid-local'); d.onsuccess = d.onerror = d.onblocked = () => res(); });

    // the journal is a different database and is untouched
    const rows = (await J.list()).filter(x => x.id === 'notes');
    const v = rows.length ? await J.read(rows[0].key) : null;
    return { mirror: localStorage.getItem(key), entries: rows.length, recovered: JSON.stringify(v) };
  });
  ok('3 the mirror is corrupt and the snapshot database is gone', /corrupt/.test(r.mirror || ''), String(r.mirror).slice(0, 30));
  ok('3b the log still has the work, in its own database',
    r.entries > 0 && /three hours of this/.test(r.recovered || ''), JSON.stringify({ n: r.entries }));
  await ctx.close();
}

/* ---- 4. a version can be put back -------------------------------- */
{
  const ctx = await browser.newContext();
  const page = await boot(ctx);
  const r = await page.evaluate(async () => {
    const J = await import('./js/journal.js');
    await J.clearAll();
    window.Sid.S.update('notes', s => { s.items = [{ id: 'v', title: 'VERSION ONE', body: '' }]; });
    await new Promise(r => setTimeout(r, 700));
    const rows = (await J.list()).filter(x => x.id === 'notes');
    const old = await J.read(rows[0].key);

    // destroy it the way a bad edit would
    window.Sid.S.update('notes', s => { s.items = []; });
    await new Promise(r => setTimeout(r, 400));
    const wiped = JSON.stringify(window.Sid.S.get('notes').items);

    await window.Sid.S.importAll({ notes: old });
    return { wiped, back: JSON.stringify(window.Sid.S.get('notes').items) };
  });
  ok('4 a wiped section can be put back from the log',
    r.wiped === '[]' && /VERSION ONE/.test(r.back), JSON.stringify(r));
  await ctx.close();
}

/* ---- 5. leaving the page forces an entry ------------------------- */
{
  const ctx = await browser.newContext();
  const page = await boot(ctx);
  const r = await page.evaluate(async () => {
    const J = await import('./js/journal.js');
    await J.clearAll();
    // an edit, then immediately hide the tab — inside the throttle window
    window.Sid.S.update('notes', s => { s.items = [{ id: 'z', title: 'last thing typed', body: '' }]; });
    await new Promise(r => setTimeout(r, 900));
    window.Sid.S.update('notes', s => { s.items = [{ id: 'z', title: 'LAST THING BEFORE CLOSING', body: '' }]; });
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise(r => setTimeout(r, 700));
    const rows = (await J.list()).filter(x => x.id === 'notes');
    const vals = [];
    for (const row of rows) vals.push(JSON.stringify(await J.read(row.key)));
    return { n: rows.length, any: vals.some(v => /LAST THING BEFORE CLOSING/.test(v)) };
  });
  ok('5 the last thing typed before closing is logged, throttle or not', r.any, JSON.stringify(r));
  await ctx.close();
}

/* ---- 6. it can be turned off, and stays off ---------------------- */
{
  const ctx = await browser.newContext();
  const page = await boot(ctx);
  const r = await page.evaluate(async () => {
    const J = await import('./js/journal.js');
    await J.clearAll();
    J.setEnabled(false);
    window.Sid.S.update('notes', s => { s.items = [{ id: 'o', title: 'should not be logged', body: '' }]; });
    await new Promise(r => setTimeout(r, 700));
    const off = (await J.list()).length;
    J.setEnabled(true);
    window.Sid.S.update('notes', s => { s.items = [{ id: 'o', title: 'logged again', body: '' }]; });
    await new Promise(r => setTimeout(r, 700));
    const on = (await J.list()).length;
    return { off, on, enabled: J.enabled() };
  });
  ok('6 turning it off really stops it', r.off === 0, JSON.stringify(r));
  ok('6b and turning it back on resumes', r.on > 0 && r.enabled, JSON.stringify(r));
  await ctx.close();
}

/* ---- 7. the log is capped ---------------------------------------- */
{
  const ctx = await browser.newContext();
  const page = await boot(ctx);
  const r = await page.evaluate(async () => {
    const J = await import('./js/journal.js');
    await J.clearAll();
    for (let i = 0; i < 700; i++) await J.record('notes', { i }, { force: true });
    await J.thin();
    const rows = await J.list({ limit: 2000 });
    return { n: rows.length, newestFirst: rows.length > 1 ? rows[0].at >= rows[1].at : true };
  });
  ok('7 the log is capped rather than growing without limit', r.n <= 600 && r.n > 100, 'entries=' + r.n);
  ok('7b and is listed newest first', r.newestFirst, String(r.newestFirst));
  await ctx.close();
}

/* ---- 8. a restore journals the current state first --------------- */
{
  const ctx = await browser.newContext();
  const page = await boot(ctx);
  const r = await page.evaluate(async () => {
    const J = await import('./js/journal.js');
    await J.clearAll();
    window.Sid.S.update('notes', s => { s.items = [{ id: 'p', title: 'about to be replaced', body: '' }]; });
    await new Promise(r => setTimeout(r, 400));
    await window.Sid.S.importAll({ notes: { items: [{ id: 'q', title: 'the import', body: '' }] } });
    const rows = await J.list();
    const pre = rows.filter(x => x.label === 'pre-import');
    const vals = [];
    for (const row of pre) vals.push(JSON.stringify(await J.read(row.key)));
    return { pre: pre.length, kept: vals.some(v => /about to be replaced/.test(v)) };
  });
  ok('8 an import logs what it is about to replace', r.pre > 0 && r.kept, JSON.stringify(r));
  await ctx.close();
}

/* ---- 9. the file backup degrades honestly where unsupported ------ */
{
  const ctx = await browser.newContext();
  const page = await boot(ctx, () => { delete window.showSaveFilePicker; });
  const r = await page.evaluate(async () => {
    const F = await import('./js/filebackup.js');
    let threw = '';
    try { await F.choose('x.json'); } catch (e) { threw = e.message; }
    return { supported: F.supported(), threw, restored: await F.restore() };
  });
  ok('9 an unsupported browser reports it rather than failing silently',
    r.supported === false && /cannot write a backup file/i.test(r.threw), JSON.stringify(r));
  ok('9b and restoring a handle there is a clean no-op', r.restored === false, String(r.restored));
  await ctx.close();
}

/* ---- 10. the file write is all-or-nothing ------------------------ */
{
  const ctx = await browser.newContext();
  const page = await boot(ctx);
  const r = await page.evaluate(async () => {
    const F = await import('./js/filebackup.js');
    /* a fake handle that records the order of operations */
    const seen = [];
    let written = '';
    window.showSaveFilePicker = async () => ({
      name: 'fake.json',
      requestPermission: async () => 'granted',
      queryPermission: async () => 'granted',
      createWritable: async () => ({
        write: async (s) => { seen.push('write'); written = s; },
        close: async () => { seen.push('close'); },
      }),
    });
    const name = await F.choose('fake.json');
    const okWrite = await F.write({ notes: { items: [{ id: 'f', title: 'in the file', body: '' }] } });
    const st = F.status();
    return { name, okWrite, seen: seen.join(','), written: written.slice(0, 200), connected: st.connected, lastWrite: st.lastWrite };
  });
  ok('10 choosing a file connects it', r.name === 'fake.json' && r.connected, JSON.stringify({ n: r.name, c: r.connected }));
  ok('10b writing produces the whole state, then closes', r.okWrite && r.seen === 'write,close', r.seen);
  ok('10c the file contains the data and a timestamp',
    /in the file/.test(r.written) && /savedAt/.test(r.written), r.written.slice(0, 90));
  ok('10d and the last-write time is recorded', r.lastWrite > 0, String(r.lastWrite));
  await ctx.close();
}

/* ---- 11. a failing file write is reported, not swallowed --------- */
{
  const ctx = await browser.newContext();
  const page = await boot(ctx);
  const r = await page.evaluate(async () => {
    const F = await import('./js/filebackup.js');
    window.showSaveFilePicker = async () => ({
      name: 'bad.json',
      requestPermission: async () => 'granted',
      queryPermission: async () => 'granted',
      createWritable: async () => { throw new Error('disk is full'); },
    });
    await F.choose('bad.json');
    const okWrite = await F.write({ notes: {} });
    return { okWrite, error: F.status().error };
  });
  ok('11 a failed file write returns false and names the reason',
    r.okWrite === false && /disk is full/.test(r.error), JSON.stringify(r));
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
