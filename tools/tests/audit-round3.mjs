/* Round three: the five issues found by reviewing the round-two
   rewrite itself. */
import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:8778/';
const results = [];
const ok = (n, c, d = '') => results.push([c, n, d]);

const STUB = `
export const HAS_FIREBASE = true;
export const MODE = 'firebase';
export const degraded = () => false;
export const degradedText = () => '';
let u = { uid: 'hostile', displayName: 'H', email: 'h@x', photoURL: '' };
export async function initBackend() {}
export function onAuth(cb) { setTimeout(() => cb(u), 0); return () => {}; }
export const user = () => u;
export async function signIn() {}
export async function signOutNow() {}
export const lastRedirectError = () => '';
export const measure = (v) => { try { return new Blob([JSON.stringify(v)]).size; } catch { return 0; } };
export async function loadSlice(id) { return (self.__load || (() => ({ ok: true, exists: false, v: undefined, at: 0 })))(id); }
export async function saveSlice(id, v, at) {
  (window.__sent = window.__sent || []).push({ id, v: JSON.stringify(v), at });
  return (self.__save || (async () => {}))(id, v, at);
}
export function watchSlice() { return () => {}; }
export async function writeSnapshot() { return 'x'; }
export async function listSnapshots() { return []; }
export async function readSnapshot() { return null; }
export const STORAGE_MODES = [['local','x']];
export const getStorageMode = () => 'local';
export function setStorageMode() {}
export const HAS_DRIVE = false;
export async function uploadMedia() { throw new Error('no'); }
export function storageErrorText(e) { return String(e); }
export async function deleteMedia() {}
export async function storageSelfTest() { return { ok: true, text: 'stub' }; }
`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
async function ctxWith(src = STUB) {
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  await ctx.route('**/js/backend.js', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: src }));
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

/* ---- Q. an edit made DURING a slow write still reaches the cloud -- */
{
  const ctx = await ctxWith();
  const page = await boot(ctx, () => {
    self.__save = () => new Promise(res => setTimeout(res, 2500));
  });
  const r = await page.evaluate(async () => {
    await window.Sid.S.flushAll().catch(() => {});
    window.__sent = [];
    window.Sid.S.update('notes', s => { s.items = [{ id: 'a', title: 'FIRST', body: '' }]; });
    await new Promise(r => setTimeout(r, 900));            // first write is out
    window.Sid.S.update('notes', s => { s.items = [{ id: 'a', title: 'SECOND-typed-mid-write', body: '' }]; });
    /* The second write must go out on its own, soon — not wait for the
       five-second sweep and not be dropped because the first one had
       already cleared the flag. */
    /* long enough for the second write to be re-queued AND to finish:
       the stubbed cloud takes 2.5s per write. */
    await new Promise(r => setTimeout(r, 9000));
    const notes = window.__sent.filter(x => x.id === 'notes');
    return {
      n: notes.length,
      last: notes[notes.length - 1]?.v || '',
      dirty: window.Sid.S.diagnose().dirty,
    };
  });
  ok('Q1 an edit typed during a slow save is sent afterwards, not dropped',
    /SECOND-typed-mid-write/.test(r.last), JSON.stringify({ n: r.n, last: r.last.slice(0, 60) }));
  ok('Q2 and the pending set empties, so the leave-page prompt clears',
    !r.dirty.includes('notes'), JSON.stringify(r.dirty));
  await ctx.close();
}

/* ---- R. a slice that stops spilling releases its IndexedDB copy --- */
{
  const ctx = await ctxWith();
  const page = await boot(ctx);
  const r = await page.evaluate(async () => {
    const L = window.Sid.L;
    const key = `sid.v2.${L.namespace()}.slice.spilltest`;
    const orig = localStorage.setItem.bind(localStorage);

    // force a spill
    localStorage.setItem = function (k, v) {
      if (k === key && v.length > 300) throw new DOMException('quota', 'QuotaExceededError');
      return orig(k, v);
    };
    const big = L.writeSlice('spilltest', { items: [{ id: 'b', body: 'x'.repeat(500) }] }, Date.now());
    if (big.settled) await big.settled;
    localStorage.setItem = orig;

    const idbHas = async () => {
      const db = await new Promise((res, rej) => {
        const q = indexedDB.open('sid-local', 1);
        q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error);
      });
      return new Promise((res) => {
        const t = db.transaction('big', 'readonly');
        const g = t.objectStore('big').get(key);
        t.oncomplete = () => res(g.result !== undefined);
        t.onerror = () => res(false);
      });
    };
    const afterSpill = await idbHas();

    // now it fits again
    L.writeSlice('spilltest', { items: [{ id: 'b', body: 'small' }] }, Date.now());
    await new Promise(r => setTimeout(r, 500));
    const afterShrink = await idbHas();

    const back = await L.readSliceFull('spilltest');
    return { afterSpill, afterShrink, back: JSON.stringify(back && back.v) };
  });
  ok('R1 an oversized slice is parked in IndexedDB', r.afterSpill, String(r.afterSpill));
  ok('R2 and the parked copy is released once it fits again', r.afterShrink === false, String(r.afterShrink));
  ok('R3 and the current value still reads back correctly', /small/.test(r.back || ''), String(r.back).slice(0, 60));
  await ctx.close();
}

/* ---- S. a future stamp is not adopted when there is no local copy - */
{
  const ctx = await ctxWith();
  const page = await boot(ctx, () => {
    const soon = Date.now() + 86400000;
    self.__load = (id) => id === 'notes'
      ? Promise.resolve({ ok: true, exists: true, at: soon, v: { items: [{ id: 'c', title: 'ONLY-COPY', body: '' }] } })
      : Promise.resolve({ ok: true, exists: false });
  });
  const r = await page.evaluate(async () => {
    const held = JSON.stringify(window.Sid.S.get('notes').items);
    /* an edit now must produce a stamp that is NOT beaten by the
       bogus future one */
    window.Sid.S.update('notes', s => { s.items[0].title = 'EDITED-HERE'; });
    await new Promise(r => setTimeout(r, 500));
    const rec = window.Sid.L.readSlice('notes');
    return { held, at: rec.at, now: Date.now(), problems: window.Sid.S.diagnose().storageProblems };
  });
  ok('S1 with no local copy the cloud data is still used', /ONLY-COPY/.test(r.held), r.held.slice(0, 70));
  ok('S2 but its future timestamp is clamped, so later edits are not buried by it',
    r.at <= r.now + 60000, JSON.stringify({ at: r.at, now: r.now, diff: r.at - r.now }));
  ok('S3 and the wrong clock is reported', r.problems.some(p => /future/i.test(p)), JSON.stringify(r.problems));
  await ctx.close();
}

/* ---- T. flushAll waits for a device write that had to spill ------- */
{
  const ctx = await ctxWith();
  const page = await boot(ctx);
  const r = await page.evaluate(async () => {
    const S = window.Sid.S, L = window.Sid.L;
    const key = `sid.v2.${L.namespace()}.slice.notes`;
    const orig = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function (k, v) {
      if (k === key && v.length > 300) throw new DOMException('quota', 'QuotaExceededError');
      return orig(k, v);
    };
    S.update('notes', s => { s.items = [{ id: 'z', title: 'spilled-then-flushed', body: 'y'.repeat(600) }]; });
    S.flushLocal();
    const duringFlush = S.pendingSpills();
    await S.flushAll();
    const afterFlush = S.pendingSpills();
    localStorage.setItem = orig;
    const back = await L.readSliceFull('notes');
    return { duringFlush, afterFlush, back: JSON.stringify(back && back.v).slice(0, 60) };
  });
  ok('T1 a spilled device write is tracked while it is in flight', r.duringFlush > 0, JSON.stringify(r));
  ok('T2 and flushAll waits for it to land', r.afterFlush === 0, JSON.stringify(r));
  ok('T3 and it is readable afterwards', /spilled-then-flushed/.test(r.back), r.back);
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
