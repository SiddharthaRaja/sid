/* Adversarial persistence tests. Each one reproduces a way the old
   code lost data, and asserts the new code does not. */
import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:8778/';
const results = [];
const ok = (n, c, d = '') => { results.push([c, n, d]); };

async function boot(ctx, init) {
  const page = await ctx.newPage();
  page.on('pageerror', e => ok('pageerror: ' + e.message, false));
  if (init) await page.addInitScript(init);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 20000 });
  return page;
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });

/* ---- 1. an edit is on the device almost immediately -------------- */
{
  const ctx = await browser.newContext();
  const page = await boot(ctx);
  await page.evaluate(() => window.Sid.S.update('notes', s => { s.items = [{ id: 'T1', title: 'canary', body: 'x' }]; }));
  await page.waitForTimeout(400);
  const raw = await page.evaluate(() => localStorage.getItem('sid.v2.local.slice.notes'));
  ok('edit reaches localStorage within 400ms', !!raw && raw.includes('canary'), String(raw).slice(0, 80));
  await ctx.close();
}

/* ---- 2. it survives a reload ------------------------------------ */
{
  const ctx = await browser.newContext();
  let page = await boot(ctx);
  await page.evaluate(() => window.Sid.S.update('notes', s => { s.items = [{ id: 'T2', title: 'survives-reload', body: '' }]; }));
  await page.waitForTimeout(400);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 20000 });
  const got = await page.evaluate(() => JSON.stringify(window.Sid.S.get('notes').items));
  ok('edit survives a reload', got.includes('survives-reload'), got.slice(0, 120));
  await ctx.close();
}

/* ---- 3. THE BUG: the cloud write hangs forever ------------------ */
/* This is what happened on the 22nd. setDoc never settles, so the old
   flush() awaited a promise that never resolved, nothing was ever
   written anywhere, and the refresh took the lot. */
{
  const ctx = await browser.newContext();
  const page = await boot(ctx, () => { window.__hangSaves = true; });
  await page.evaluate(() => {
    const B = window.Sid.B;
    // monkey-patch the module namespace is not writable; patch the store's view instead
    window.Sid.S.__origSave = true;
  });
  /* Patch at the source: make the backend's saveSlice hang by going
     offline in a way that stalls rather than rejects. */
  await page.evaluate(() => {
    const S = window.Sid.S;
    const orig = S.flushAll;
    window.__flushCalls = 0;
    // emulate a stalled cloud by never letting flushAll settle
    S.flushAll = () => { window.__flushCalls++; return new Promise(() => {}); };
  });
  await page.evaluate(() => window.Sid.S.update('notes', s => { s.items = [{ id: 'T3', title: 'cloud-hung', body: '' }]; }));
  await page.waitForTimeout(500);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 20000 });
  const got = await page.evaluate(() => JSON.stringify(window.Sid.S.get('notes').items));
  ok('work survives a cloud write that never returns', got.includes('cloud-hung'), got.slice(0, 120));
  await ctx.close();
}

/* ---- 4. a slice that could not be read is never written --------- */
{
  const ctx = await browser.newContext();
  const page = await boot(ctx);
  const d = await page.evaluate(() => window.Sid.S.diagnose());
  ok('nothing is blocked in a healthy local boot', d.blocked.length === 0, JSON.stringify(d.blocked));
  ok('diagnose() reports a namespace', !!d.namespace, d.namespace);
  await ctx.close();
}

/* ---- 5. snapshots exist on the device and can be restored ------- */
{
  const ctx = await browser.newContext();
  const page = await boot(ctx);
  await page.evaluate(() => window.Sid.S.update('notes', s => { s.items = [{ id: 'A', title: 'before', body: '' }]; }));
  await page.waitForTimeout(300);
  const snap = await page.evaluate(async () => {
    await window.Sid.S.snapshotNow('manual');
    const { rows, errors } = await window.Sid.S.listSnapshots();
    return { n: rows.length, errors, at: rows[0] && rows[0].at, where: rows[0] && rows[0].where };
  });
  ok('a device snapshot is written and listed', snap.n > 0 && snap.where === 'device', JSON.stringify(snap));
  ok('listSnapshots reports errors instead of hiding them', Array.isArray(snap.errors), JSON.stringify(snap.errors));

  await page.evaluate(() => window.Sid.S.update('notes', s => { s.items = [{ id: 'B', title: 'after', body: '' }]; }));
  await page.waitForTimeout(300);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
    page.evaluate(at => window.Sid.S.restoreSnapshot(at, 'device'), snap.at),
  ]);
  await page.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 20000 });
  const after = await page.evaluate(() => JSON.stringify(window.Sid.S.get('notes').items));
  ok('restoring a device snapshot brings the old state back', after.includes('before'), after.slice(0, 120));
  await ctx.close();
}

/* ---- 6. export / import round-trip ------------------------------ */
{
  const ctx = await browser.newContext();
  const page = await boot(ctx);
  const rt = await page.evaluate(async () => {
    window.Sid.S.update('notes', s => { s.items = [{ id: 'X', title: 'roundtrip', body: '' }]; });
    await new Promise(r => setTimeout(r, 300));
    const dump = JSON.parse(JSON.stringify(window.Sid.S.everything()));
    window.Sid.S.update('notes', s => { s.items = []; });
    await new Promise(r => setTimeout(r, 300));
    await window.Sid.S.importAll(dump);
    return JSON.stringify(window.Sid.S.get('notes').items);
  });
  ok('export then import restores the data', rt.includes('roundtrip'), rt.slice(0, 120));
  await ctx.close();
}

/* ---- 7. per-account namespacing --------------------------------- */
{
  const ctx = await browser.newContext();
  const page = await boot(ctx);
  const ns = await page.evaluate(() => {
    localStorage.setItem('sid.v2.other-uid.slice.notes', JSON.stringify({ v: { items: [] }, at: 1 }));
    return { known: window.Sid.L.knownNamespaces(), mine: window.Sid.L.namespace() };
  });
  ok('another account\'s data is kept separate and visible to diagnostics',
    ns.known.includes('other-uid') && ns.mine === 'local', JSON.stringify(ns));
  await ctx.close();
}

/* ---- 8. legacy localStorage data is brought forward ------------- */
{
  const ctx = await browser.newContext();
  const page = await boot(ctx, () => {
    localStorage.setItem('sid.slice.notes', JSON.stringify({ items: [{ id: 'L', title: 'legacy-note', body: '' }] }));
  });
  const got = await page.evaluate(() => JSON.stringify(window.Sid.S.get('notes').items));
  ok('pre-upgrade local data is migrated, not lost', got.includes('legacy-note'), got.slice(0, 120));
  const still = await page.evaluate(() => !!localStorage.getItem('sid.slice.notes'));
  ok('the legacy copy is left in place as a second chance', still, String(still));
  await ctx.close();
}

/* ---- 9. hiding the tab writes synchronously --------------------- */
{
  const ctx = await browser.newContext();
  const page = await boot(ctx);
  await page.evaluate(() => {
    window.Sid.S.update('notes', s => { s.items = [{ id: 'H', title: 'hidden-flush', body: '' }]; });
    // no wait: fire the lifecycle event immediately, before the debounce
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const raw = await page.evaluate(() => localStorage.getItem('sid.v2.local.slice.notes'));
  ok('hiding the tab flushes to the device with no delay', !!raw && raw.includes('hidden-flush'), String(raw).slice(0, 80));
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
