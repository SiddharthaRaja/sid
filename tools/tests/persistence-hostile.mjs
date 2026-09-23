/* Runs the real store.js against a hostile backend.js, swapped in at
   the network layer so nothing in the app is patched. These are the
   exact failure modes that lost the diary entries. */
import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:8778/';
const results = [];
const ok = (n, c, d = '') => results.push([c, n, d]);

/* A backend that answers reads fine and then swallows every write for
   ever — no resolve, no reject. The old flush() awaited this. */
const HANGING = `
export const HAS_FIREBASE = true;
export const MODE = 'firebase';
export const degraded = () => false;
export const degradedText = () => '';
let u = { uid: 'hostile', displayName: 'Hostile', email: 'h@x', photoURL: '' };
export async function initBackend() {}
export function onAuth(cb) { setTimeout(() => cb(u), 0); return () => {}; }
export const user = () => u;
export async function signIn() {}
export async function signOutNow() {}
export const lastRedirectError = () => '';
export async function loadSlice(id) { return { ok: true, exists: false, v: undefined, at: 0 }; }
export async function saveSlice() { window.__saveAttempts = (window.__saveAttempts||0)+1; return new Promise(() => {}); }
export function watchSlice() { return () => {}; }
export async function writeSnapshot() { return new Promise(() => {}); }
export async function listSnapshots() { return []; }
export async function readSnapshot() { return null; }
export const STORAGE_MODES = [['local','This device only']];
export const getStorageMode = () => 'local';
export function setStorageMode() {}
export const HAS_DRIVE = false;
export async function uploadMedia() { throw new Error('no'); }
export function storageErrorText(e) { return String(e); }
export async function deleteMedia() {}
export async function storageSelfTest() { return { ok: true, text: 'stub' }; }
`;

/* A backend whose reads FAIL. The app must show defaults but refuse to
   write them back — otherwise a blank screen overwrites real data. */
const UNREADABLE = HANGING
  .replace(
    "export async function loadSlice(id) { return { ok: true, exists: false, v: undefined, at: 0 }; }",
    "export async function loadSlice(id) { return { ok: false, exists: false, error: new Error('permission-denied') }; }")
  .replace(
    "export async function saveSlice() { window.__saveAttempts = (window.__saveAttempts||0)+1; return new Promise(() => {}); }",
    "export async function saveSlice() { window.__saveAttempts = (window.__saveAttempts||0)+1; }");

/* A backend that holds a NEWER copy than the device, and one that
   holds an older copy — to prove newest-wins in both directions. */
const withRemote = (at, body) => HANGING
  .replace(
    "export async function loadSlice(id) { return { ok: true, exists: false, v: undefined, at: 0 }; }",
    `export async function loadSlice(id) {
       if (id !== 'notes') return { ok: true, exists: false, v: undefined, at: 0 };
       return { ok: true, exists: true, v: ${body}, at: ${at} };
     }`)
  .replace(
    "export async function saveSlice() { window.__saveAttempts = (window.__saveAttempts||0)+1; return new Promise(() => {}); }",
    "export async function saveSlice() { window.__saveAttempts = (window.__saveAttempts||0)+1; }");

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });

async function ctxWith(src) {
  // block the service worker: it would serve the REAL backend.js from
  // cache and quietly undo the swap this whole file depends on
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  await ctx.route('**/js/backend.js', r =>
    r.fulfill({ status: 200, contentType: 'text/javascript', body: src }));
  return ctx;
}
async function boot(ctx, init) {
  const page = await ctx.newPage();
  page.on('pageerror', e => ok('pageerror: ' + e.message, false));
  if (init) await page.addInitScript(init);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 25000 });
  return page;
}

/* ---- A. the cloud swallows every write, for ever ---------------- */
{
  const ctx = await ctxWith(HANGING);
  const page = await boot(ctx);
  await page.evaluate(() => window.Sid.S.update('notes', s => { s.items = [{ id: '1', title: 'three-hours-of-work', body: '' }]; }));
  await page.waitForTimeout(600);

  const onDevice = await page.evaluate(() => localStorage.getItem('sid.v2.hostile.slice.notes'));
  ok('A1 written to the device even though the cloud never answers',
    !!onDevice && onDevice.includes('three-hours-of-work'), String(onDevice).slice(0, 80));

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 25000 });
  const after = await page.evaluate(() => JSON.stringify(window.Sid.S.get('notes').items));
  ok('A2 survives the refresh that used to destroy it', after.includes('three-hours-of-work'), after.slice(0, 120));

  /* The write must be abandoned and retried, not awaited for ever. */
  await page.waitForTimeout(18000);
  const h = await page.evaluate(() => window.Sid.S.health);
  ok('A3 a stalled cloud write times out and is reported',
    h.cloud === 'stalled' || h.cloud === 'failing', JSON.stringify(h));

  const banner = await page.evaluate(() => {
    const b = document.querySelector('#health');
    return b && !b.hidden ? document.querySelector('#health-text').textContent : '';
  });
  ok('A4 the failure is visible on screen, not just in the console', !!banner, banner.slice(0, 90));
  await ctx.close();
}

/* ---- B. the cloud cannot be read at all ------------------------- */
{
  const ctx = await ctxWith(UNREADABLE);
  const page = await boot(ctx);
  const d = await page.evaluate(() => window.Sid.S.diagnose());
  ok('B1 unreadable slices are marked blocked', d.blocked.length > 0, String(d.blocked.length));

  await page.evaluate(() => window.Sid.S.update('notes', s => { s.items = [{ id: 'z', title: 'typed-while-blind', body: '' }]; }));
  await page.waitForTimeout(800);
  const attempts = await page.evaluate(() => window.__saveAttempts || 0);
  ok('B2 NOTHING is written to the cloud while its state is unknown', attempts === 0, 'attempts=' + attempts);

  const onDevice = await page.evaluate(() => localStorage.getItem('sid.v2.hostile.slice.notes'));
  ok('B3 the edit is still saved on the device', !!onDevice && onDevice.includes('typed-while-blind'), String(onDevice).slice(0, 80));

  const banner = await page.evaluate(() => {
    const b = document.querySelector('#health');
    return b && !b.hidden ? document.querySelector('#health-text').textContent : '';
  });
  ok('B4 you are told the app is in read-only-to-cloud mode', /could not read/i.test(banner), banner.slice(0, 90));
  await ctx.close();
}

/* ---- C. newest copy wins, in both directions -------------------- */
{
  // device copy is NEWER than the cloud copy -> device must win
  const ctx = await ctxWith(withRemote(1000, `{ items: [{ id: 'c', title: 'OLD-CLOUD', body: '' }] }`));
  const page = await boot(ctx, () => {
    localStorage.setItem('sid.v2.hostile.slice.notes',
      JSON.stringify({ v: { items: [{ id: 'd', title: 'NEW-DEVICE', body: '' }] }, at: Date.now() }));
  });
  const got = await page.evaluate(() => JSON.stringify(window.Sid.S.get('notes').items));
  ok('C1 a newer device copy is not overwritten by an older cloud copy',
    got.includes('NEW-DEVICE'), got.slice(0, 120));
  await page.waitForTimeout(700);
  const pushed = await page.evaluate(() => window.__saveAttempts || 0);
  ok('C2 and it is pushed up to the cloud to reconcile', pushed > 0, 'attempts=' + pushed);
  await ctx.close();
}
{
  // cloud copy is NEWER -> cloud must win (a real edit from the phone)
  const ctx = await ctxWith(withRemote(Date.now() + 5000, `{ items: [{ id: 'c', title: 'NEW-CLOUD', body: '' }] }`));
  const page = await boot(ctx, () => {
    localStorage.setItem('sid.v2.hostile.slice.notes',
      JSON.stringify({ v: { items: [{ id: 'd', title: 'OLD-DEVICE', body: '' }] }, at: 1000 }));
  });
  const got = await page.evaluate(() => JSON.stringify(window.Sid.S.get('notes').items));
  ok('C3 a newer cloud copy wins over a stale device copy', got.includes('NEW-CLOUD'), got.slice(0, 120));
  await ctx.close();
}

/* ---- D. booting twice does not discard unsaved work ------------- */
{
  const ctx = await ctxWith(HANGING);
  const page = await boot(ctx);
  const r = await page.evaluate(async () => {
    window.Sid.S.update('notes', s => { s.items = [{ id: 'q', title: 'unsaved-in-memory', body: '' }]; });
    // what onAuthStateChanged does on every token refresh
    await window.Sid.S.loadAll(['notes']);
    return JSON.stringify(window.Sid.S.get('notes').items);
  });
  ok('D1 a second loadAll does not wipe in-memory edits', r.includes('unsaved-in-memory'), r.slice(0, 120));
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
