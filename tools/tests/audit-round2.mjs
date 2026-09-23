/* Round two. One test per failure mode found in the second audit —
   the ones in the rewritten persistence layer itself. */
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
  window.__saves = (window.__saves || 0) + 1;
  window.__perSlice = window.__perSlice || {};
  window.__perSlice[id] = (window.__perSlice[id] || 0) + 1;
  window.__maxInflight = Math.max(window.__maxInflight || 0, window.__perSlice[id]);
  try { return await (self.__save || (async () => {}))(id, v, at); }
  finally { window.__perSlice[id]--; }
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
async function boot(ctx, init, { expectFail = false } = {}) {
  const page = await ctx.newPage();
  page.on('pageerror', e => ok('pageerror: ' + e.message, false));
  if (init) await page.addInitScript(init);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  if (!expectFail) {
    await page.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 25000 });
  } else {
    await page.waitForTimeout(3000);
  }
  return page;
}

/* ---- E. nothing is written before the store knows whose data it is */
{
  /* loadSlice never resolves -> the app stays on the boot screen */
  const ctx = await ctxWith();
  const page = await boot(ctx, () => { self.__load = () => new Promise(() => {}); }, { expectFail: true });
  const r = await page.evaluate(() => {
    const before = Object.keys(localStorage).filter(k => k.includes('.slice.'));
    try { window.Sid.S.touch('notes'); } catch {}
    window.Sid.S.update?.('notes', s => { s.items = [{ id: 'early', title: 'typed too early', body: '' }]; });
    return { ready: window.Sid.S.isReady(), before: before.length };
  });
  await page.waitForTimeout(600);
  const keys = await page.evaluate(() => Object.keys(localStorage).filter(k => k.includes('.slice.')));
  ok('E1 the store reports itself not ready during boot', r.ready === false, JSON.stringify(r));
  ok('E2 an edit before load finishes writes NOTHING to disk', keys.length === 0, keys.join(','));
  const anon = await page.evaluate(() => Object.keys(localStorage).filter(k => k.includes('.anon.')));
  ok('E3 and nothing lands in an unowned "anon" bucket', anon.length === 0, anon.join(','));
  ok('E4 quick capture is hidden until the app is ready',
    !(await page.evaluate(() => !!document.body.dataset.ready)), 'data-ready set too early');
  await ctx.close();
}

/* ---- F. a failed boot must not leave the app able to seed blanks -- */
{
  const ctx = await ctxWith();
  const page = await boot(ctx, () => {
    self.__load = () => Promise.reject(new Error('boom'));
  }, { expectFail: true });
  const r = await page.evaluate(async () => {
    const S = window.Sid.S;
    const first = S.isReady();
    /* loadSlice is caught inside loadOne, so this boot actually
       succeeds with everything blocked — which is the correct
       outcome. Assert the protective state, not a crash. */
    const d = S.diagnose();
    return { first, ready: S.isReady(), blocked: d.blocked.length, health: d.health.cloud };
  });
  ok('F1 a cloud that cannot be read leaves every section blocked',
    r.blocked > 0, JSON.stringify(r));
  ok('F2 and the health state says so rather than "ok"',
    r.health === 'blocked', JSON.stringify(r));
  const saves = await page.evaluate(async () => {
    window.__saves = 0;
    window.Sid.S.update('notes', s => { s.items = [{ id: 'x', title: 'typed while blind', body: '' }]; });
    await new Promise(r => setTimeout(r, 900));
    return window.__saves;
  });
  ok('F3 and seeding/editing writes NOTHING to the cloud', saves === 0, 'saves=' + saves);
  await ctx.close();
}

/* ---- G. a write that can never succeed stops, and says why -------- */
{
  const ctx = await ctxWith();
  const page = await boot(ctx, () => {
    self.__save = async () => { throw new Error('Document exceeds the maximum allowed size of 1048576 bytes'); };
  });
  const r = await page.evaluate(async () => {
    window.Sid.S.update('notes', s => { s.items = [{ id: 'big', title: 'too big', body: 'x' }]; });
    await new Promise(r => setTimeout(r, 1500));
    const d = window.Sid.S.diagnose();
    return { stuck: Object.keys(d.stuck), dirty: d.dirty, health: d.health.cloud, detail: d.health.detail };
  });
  ok('G1 an impossible write is marked stuck instead of retried for ever',
    r.stuck.includes('notes'), JSON.stringify(r));
  ok('G2 it is removed from the pending set, so the leave-page prompt stops',
    !r.dirty.includes('notes'), JSON.stringify(r.dirty));
  ok('G3 the message names the real cause, not the connection',
    /1 MB|larger than/i.test(r.detail) && !/connection recovers/i.test(r.detail), r.detail);

  const saved = await page.evaluate(() => localStorage.getItem('sid.v2.hostile.slice.notes') || '');
  ok('G4 the work is still on the device', saved.includes('too big'), saved.slice(0, 70));

  const retried = await page.evaluate(async () => {
    window.__saves = 0;
    await new Promise(r => setTimeout(r, 2500));
    return window.__saves;
  });
  ok('G5 and it really has stopped retrying', retried === 0, 'saves=' + retried);

  const back = await page.evaluate(async () => {
    self.__save = async () => {};
    const n = window.Sid.S.retryStuck();
    await new Promise(r => setTimeout(r, 1500));
    return { n, health: window.Sid.S.diagnose().health.cloud };
  });
  ok('G6 "Try again" clears it once the cause is fixed',
    back.n >= 1 && back.health === 'ok', JSON.stringify(back));
  await ctx.close();
}

/* ---- H. one write in flight per slice, not a hundred -------------- */
{
  const ctx = await ctxWith();
  const page = await boot(ctx, () => {
    self.__save = () => new Promise(res => setTimeout(() => res(), 4000));  // slow, succeeds
  });
  const r = await page.evaluate(async () => {
    await window.Sid.S.flushAll().catch(() => {});
    window.__maxInflight = 0; window.__perSlice = {};
    window.Sid.S.update('notes', s => { s.items = [{ id: 'q', title: 'slow', body: '' }]; });
    /* hammer every path that used to start its own retry chain */
    for (let i = 0; i < 12; i++) {
      window.dispatchEvent(new Event('blur'));
      document.dispatchEvent(new Event('visibilitychange'));
      window.Sid.S.flushAll();
      await new Promise(r => setTimeout(r, 120));
    }
    return window.__maxInflight;
  });
  ok('H1 a slow cloud write is never started twice at once for the same section',
    r <= 1, 'max concurrent writes for one slice = ' + r);
  await ctx.close();
}

/* ---- I. a future-dated cloud copy cannot eat the device copy ------ */
{
  const ctx = await ctxWith();
  const page = await boot(ctx, () => {
    const soon = Date.now() + 86400000;            // a day fast
    self.__load = (id) => id === 'notes'
      ? Promise.resolve({ ok: true, exists: true, at: soon, v: { items: [{ id: 'c', title: 'FROM-A-FAST-CLOCK', body: '' }] } })
      : Promise.resolve({ ok: true, exists: false });
    localStorage.setItem('sid.v2.hostile.slice.notes',
      JSON.stringify({ v: { items: [{ id: 'd', title: 'REAL-WORK-HERE', body: '' }] }, at: Date.now(), seq: 1 }));
  });
  const r = await page.evaluate(() => ({
    held: JSON.stringify(window.Sid.S.get('notes').items),
    disk: localStorage.getItem('sid.v2.hostile.slice.notes') || '',
    problems: window.Sid.S.diagnose().storageProblems,
  }));
  ok('I1 the device copy survives a cloud copy dated in the future',
    r.held.includes('REAL-WORK-HERE'), r.held.slice(0, 100));
  ok('I2 and the device mirror was not overwritten by it',
    r.disk.includes('REAL-WORK-HERE') && !r.disk.includes('FROM-A-FAST-CLOCK'), r.disk.slice(0, 100));
  ok('I3 and you are told, rather than it happening silently',
    r.problems.some(p => /future/i.test(p)), JSON.stringify(r.problems));
  const kept = await page.evaluate(async () => {
    const { rows } = await window.Sid.S.listSnapshots();
    return rows.some(x => /declined/.test(x.label || ''));
  });
  ok('I4 the rejected cloud copy is kept as a snapshot, not thrown away', kept, String(kept));
  await ctx.close();
}

/* ---- J. a stamp can never go backwards on this device ------------- */
{
  const ctx = await ctxWith();
  const page = await boot(ctx);
  const r = await page.evaluate(async () => {
    const L = window.Sid.L;
    L.writeSlice('notes', { items: [{ id: 'a' }] }, Date.now() + 10000);
    const high = L.readSlice('notes').at;
    L.writeSlice('notes', { items: [{ id: 'b' }] }, 1000);   // clock jumped back
    const after = L.readSlice('notes').at;
    return { high, after };
  });
  ok('J1 a backwards clock cannot lower a slice\'s stamp', r.after > r.high, JSON.stringify(r));
  await ctx.close();
}

/* ---- K. another tab's write is kept, not flattened ---------------- */
{
  const ctx = await ctxWith();
  const page = await boot(ctx);
  const r = await page.evaluate(async () => {
    const L = window.Sid.L;
    L.writeSlice('notes', { items: [{ id: 'mine' }] }, Date.now());
    /* simulate the other tab writing directly, which is exactly what
       localStorage lets it do */
    const k = `sid.v2.${L.namespace()}.slice.notes`;
    const cur = JSON.parse(localStorage.getItem(k));
    localStorage.setItem(k, JSON.stringify({ v: { items: [{ id: 'THEIRS' }] }, at: cur.at + 1, seq: cur.seq + 99 }));
    L.writeSlice('notes', { items: [{ id: 'mine2' }] }, Date.now());
    await new Promise(r => setTimeout(r, 400));
    const { rows } = await window.Sid.S.listSnapshots();
    const conflict = rows.find(x => /conflict/.test(x.label || ''));
    const data = conflict ? await L.readSnapshot(conflict.key) : null;
    return { warned: L.problems.some(p => /more than one tab/i.test(p)), kept: JSON.stringify(data) };
  });
  ok('K1 a conflicting write from another tab is noticed', r.warned, String(r.warned));
  ok('K2 and the other tab\'s version is kept as a snapshot', /THEIRS/.test(r.kept || ''), String(r.kept).slice(0, 90));
  await ctx.close();
}

/* ---- L. snapshots still happen when part of the app is unreadable - */
{
  const ctx = await ctxWith();
  const page = await boot(ctx, () => {
    self.__load = (id) => id === 'notes'
      ? Promise.resolve({ ok: false, error: new Error('nope') })
      : Promise.resolve({ ok: true, exists: false });
  });
  const r = await page.evaluate(async () => {
    let threw = null;
    let res = null;
    try { res = await window.Sid.S.snapshotNow('manual'); } catch (e) { threw = e.message; }
    const { rows } = await window.Sid.S.listSnapshots();
    return { threw, res, partial: rows.some(x => /partial/.test(x.label || '')), n: rows.length };
  });
  ok('L1 a snapshot is still taken on this device when a section is unreadable',
    !r.threw && r.n > 0, JSON.stringify(r));
  ok('L2 and it is labelled partial so it cannot be mistaken for a full one',
    r.partial, JSON.stringify(r));
  ok('L3 and the cloud copy is deliberately skipped, with a reason',
    r.res && /skipped/i.test(r.res.cloudErr || ''), JSON.stringify(r.res));
  await ctx.close();
}

/* ---- M. legacy data is claimed by ONE account, never copied on ---- */
{
  const ctx = await ctxWith();
  const page = await boot(ctx, () => {
    localStorage.setItem('sid.slice.notes', JSON.stringify({ items: [{ id: 'L', title: 'legacy', body: '' }] }));
  });
  const r = await page.evaluate(() => {
    const L = window.Sid.L;
    const mine = L.readSlice('notes');
    L.setNamespace('someone-else');          // a second Google account
    const theirs = L.readSlice('notes');
    L.setNamespace('hostile');
    return { mine: JSON.stringify(mine && mine.v), theirs: JSON.stringify(theirs && theirs.v) };
  });
  ok('M1 legacy data lands in the first account', /legacy/.test(r.mine), r.mine.slice(0, 80));
  ok('M2 and is NOT copied into a second account on the same device',
    !/legacy/.test(r.theirs || 'null'), r.theirs);
  await ctx.close();
}

/* ---- N. snapshot pruning is per account --------------------------- */
{
  const ctx = await ctxWith();
  const page = await boot(ctx);
  const r = await page.evaluate(async () => {
    const L = window.Sid.L;
    /* 60 old snapshots, alternating accounts, all on the same day */
    const day = new Date(Date.now() - 10 * 864e5);
    for (let i = 0; i < 60; i++) {
      const at = new Date(day.getTime() + i * 60000).toISOString();
      await window.Sid.__putSnap({ key: at, at, label: 'auto', ns: i % 2 ? 'A' : 'B', data: { notes: { items: [] } } });
    }
    await L.thin();
    const rows = await L.listSnapshots();
    const old = rows.filter(x => x.ns === 'A' || x.ns === 'B');
    return { A: old.filter(x => x.ns === 'A').length, B: old.filter(x => x.ns === 'B').length };
  });
  ok('N1 pruning keeps a day for each account, not one across all of them',
    r.A >= 1 && r.B >= 1, JSON.stringify(r));
  await ctx.close();
}

/* ---- O. a spilled (oversized) slice round-trips ------------------- */
{
  const ctx = await ctxWith();
  const page = await boot(ctx);
  const r = await page.evaluate(async () => {
    const L = window.Sid.L;
    /* force the spill path directly */
    const big = { items: [{ id: 'big', title: 'spilled-value', body: 'x'.repeat(200) }] };
    const orig = localStorage.setItem.bind(localStorage);
    let blocked = 0;
    localStorage.setItem = function (k, v) {
      if (k.includes('.slice.spilltest') && v.length > 200) { blocked++; throw new DOMException('quota', 'QuotaExceededError'); }
      return orig(k, v);
    };
    window.Sid.S.register?.('spilltest', () => ({ items: [] }));
    const res = L.writeSlice('spilltest', big, Date.now());
    if (res.settled) await res.settled;
    localStorage.setItem = orig;

    const back = await L.readSliceFull('spilltest');
    const all = await L.allSlices();
    const ns = await L.readNamespace(L.namespace());
    return {
      blocked,
      spilled: res.spilled,
      back: JSON.stringify(back && back.v),
      inAll: JSON.stringify(all.spilltest),
      inNs: JSON.stringify(ns.spilltest),
    };
  });
  ok('O1 an oversized slice spills instead of being lost', r.spilled && r.blocked > 0, JSON.stringify({ s: r.spilled, b: r.blocked }));
  ok('O2 and reads back correctly', /spilled-value/.test(r.back || ''), String(r.back).slice(0, 80));
  ok('O3 and is included in a full export', /spilled-value/.test(r.inAll || ''), String(r.inAll).slice(0, 80));
  ok('O4 and in the wrong-account recovery export', /spilled-value/.test(r.inNs || ''), String(r.inNs).slice(0, 80));
  await ctx.close();
}

/* ---- P. the recording store cannot hang for ever ------------------ */
{
  const ctx = await ctxWith();
  const page = await boot(ctx);
  const r = await page.evaluate(async () => {
    const REC = await import('./js/svara/record.js');
    /* a put that aborts: a record IndexedDB refuses to structured-clone */
    const bad = { id: 'x', at: Date.now(), name: 'n', boom: () => {} };
    const started = Date.now();
    let settled = 'never';
    await Promise.race([
      REC.putTake(bad).then(() => { settled = 'resolved'; }, () => { settled = 'rejected'; }),
      new Promise(r => setTimeout(r, 4000)),
    ]);
    return { settled, ms: Date.now() - started };
  });
  ok('P1 a failing take write settles instead of hanging for ever',
    r.settled === 'rejected', JSON.stringify(r));
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
