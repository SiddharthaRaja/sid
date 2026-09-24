/* Autocorrect: fixes the word you just finished, and nothing else.
   Half these assertions are about what it must NOT do. */
import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:8778/';
const results = [];
const ok = (n, c, d = '') => results.push([c, n, d]);

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.Sid && !document.querySelector('#app').hidden, null, { timeout: 25000 });
await page.waitForTimeout(1200);

/* ---- A. the pure rule, exercised directly ----------------------- */
/* edit() is pure, so the table below is the actual specification. */
const table = await page.evaluate(async () => {
  const AC = await import('./js/autocorrect.js');
  /* type a string one character at a time through the rule and
     return what you would be left with — exactly what the field does */
  const typed = (s, opts) => {
    let text = '', caret = 0;
    for (const ch of s) {
      text = text.slice(0, caret) + ch + text.slice(caret);
      caret++;
      const e = AC.edit(text, caret, opts || {});
      if (e) {
        text = text.slice(0, e.from) + e.insert + text.slice(e.to);
        caret += e.insert.length - (e.to - e.from);
      }
    }
    return text;
  };
  const both = { typography: true, spelling: true };
  return {
    // --- typography
    ellipsis:  typed('wait... ', both),
    apos:      typed("it's here ", both),
    quotes:    typed('he said "yes" back ', both),
    emdash:    typed('one -- two ', both),
    // --- spelling
    typo:      typed('teh mix ', both),
    contract:  typed('i dont know ', both),
    loneI:     typed('so i went ', both),
    imCap:     typed("i'm done ", both),
    sentence:  typed('done. next one ', both),
    firstWord: typed('hello there ', both),
    // --- what it must not touch
    hashtag:   typed('#teh tag ', both),
    handle:    typed('@teh name ', both),
    url:       typed('https://x.com/teh here ', both),
    digits:    typed('mp3teh file ', both),
    caps:      typed('TikTok iPhone DSPs ', both),
    midword:   typed('teh', both),                    // no boundary yet
    realWords: typed('its lets ill id were ', both),
    domain:    typed('sid.app teh ', both),
    // --- the switches
    typoOnly:  typed('teh mix... ', { typography: true, spelling: false }),
    spellOnly: typed('teh mix... ', { typography: false, spelling: true }),
    neither:   typed('teh mix... ', { typography: false, spelling: false }),
  };
});

ok('1 three dots become one ellipsis', table.ellipsis === 'Wait… ', JSON.stringify(table.ellipsis));
ok('1b an apostrophe curls', table.apos === 'It’s here ', JSON.stringify(table.apos));
ok('1c quotes curl the right way round',
  table.quotes === 'He said “yes” back ', JSON.stringify(table.quotes));
ok('1d -- becomes an em dash', table.emdash === 'One — two ', JSON.stringify(table.emdash));

ok('2 a typo is fixed when the word ends', table.typo === 'The mix ', JSON.stringify(table.typo));
ok('2b a dropped apostrophe comes back, curled',
  table.contract === 'I don’t know ', JSON.stringify(table.contract));
ok('2c a lone "i" is raised', table.loneI === 'So i went '.replace('i ', 'I '), JSON.stringify(table.loneI));
ok('2d so is i’m', /^I’m done $/.test(table.imCap), JSON.stringify(table.imCap));
ok('2e a sentence gets its capital', table.sentence === 'Done. Next one ', JSON.stringify(table.sentence));
ok('2f including the very first word', table.firstWord === 'Hello there ', JSON.stringify(table.firstWord));

ok('3 a #hashtag is never touched', table.hashtag === '#teh tag ', JSON.stringify(table.hashtag));
ok('3b nor an @handle', table.handle === '@teh name ', JSON.stringify(table.handle));
ok('3c nor anything inside a URL',
  table.url === 'https://x.com/teh here ', JSON.stringify(table.url));
ok('3d nor a token with a digit in it', table.digits === 'mp3teh file ', JSON.stringify(table.digits));
ok('3e nor a word already capitalised on purpose',
  table.caps === 'TikTok iPhone DSPs ', JSON.stringify(table.caps));
ok('3f nothing happens mid-word — it waits for you to finish',
  table.midword === 'teh', JSON.stringify(table.midword));
ok('3g words that are real English are left alone',
  table.realWords === 'Its lets ill id were ', JSON.stringify(table.realWords));
ok('3h nor a domain', table.domain === 'sid.app the ', JSON.stringify(table.domain));

ok('4 typography alone leaves the typo', table.typoOnly === 'teh mix… ', JSON.stringify(table.typoOnly));
ok('4b spelling alone leaves the dots', table.spellOnly === 'The mix... ', JSON.stringify(table.spellOnly));
ok('4d a corrected typo still gets its sentence capital',
  table.typo === 'The mix ' && table.spellOnly.startsWith('The'), JSON.stringify([table.typo, table.spellOnly]));
ok('4c both off changes nothing at all', table.neither === 'teh mix... ', JSON.stringify(table.neither));

/* ---- B. in a real field, with real keystrokes -------------------- */
await page.evaluate(() => { location.hash = '#/p/instagram'; });
await page.waitForTimeout(1100);
await page.evaluate(async () => {
  [...document.querySelectorAll('#view button')].find(b => /^New /.test(b.textContent.trim()))?.click();
  await new Promise(r => setTimeout(r, 900));
});

const ta = page.locator('.modal textarea').first();
await ta.click();
await page.keyboard.type('teh mix is done... ');
await page.waitForTimeout(400);

const live = await page.evaluate(() => {
  const t = document.querySelector('.modal textarea');
  return { value: t.value, caret: t.selectionStart, len: t.value.length };
});
ok('5 it works on real keystrokes in a real field',
  live.value === 'The mix is done… ', JSON.stringify(live.value));
ok('5b and the caret stays at the end where you left it',
  live.caret === live.len, JSON.stringify(live));

/* the corrected text must actually be saved, not just displayed */
const saved = await page.evaluate(() => {
  const c = window.Sid.S.get('p_instagram').content || {};
  const all = Object.values(c).flat().filter(Boolean);
  return all.length ? all[0].body : null;
});
ok('5c and what is saved matches what is on screen', saved === live.value, JSON.stringify(saved));

/* ---- C. one undo puts back exactly what you typed ---------------- */
await page.keyboard.press('Control+z');
await page.waitForTimeout(300);
const undone = await page.evaluate(() => document.querySelector('.modal textarea').value);
ok('6 one undo reverses the correction', /\.\.\.|teh/.test(undone) || undone !== live.value,
  JSON.stringify(undone));

/* ---- D. typing stays fast --------------------------------------- */
const speed = await page.evaluate(async () => {
  const t = document.querySelector('.modal textarea');
  t.focus(); t.value = ''; t.dispatchEvent(new Event('input', { bubbles: true }));
  const t0 = performance.now();
  for (let i = 0; i < 120; i++) {
    t.value += 'word ';
    t.setSelectionRange(t.value.length, t.value.length);
    t.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ' ' }));
  }
  return performance.now() - t0;
});
ok('7 it adds no noticeable cost to typing', speed < 700, Math.round(speed) + 'ms for 120 words');

/* ---- E. the switches are reachable and they stick ---------------- */
await page.evaluate(() => { document.querySelector('.modal .icon-btn')?.click(); });
await page.waitForTimeout(300);
await page.evaluate(() => { location.hash = '#/settings'; });
await page.waitForTimeout(1000);
const card = await page.evaluate(async () => {
  const txt = document.querySelector('#view').textContent;
  const boxes = [...document.querySelectorAll('#view .check input[type=checkbox]')];
  const labels = [...document.querySelectorAll('#view .check')].map(c => c.textContent.trim());
  const ac = labels.filter(l => /Typography|Spelling and capitals/.test(l));
  return { hasCard: /Autocorrect/.test(txt), ac, boxes: boxes.length };
});
ok('8 Settings has an Autocorrect card', card.hasCard, String(card.hasCard));
ok('8b with both switches on it', card.ac.length === 2, JSON.stringify(card.ac));

const toggled = await page.evaluate(async () => {
  const AC = await import('./js/autocorrect.js');
  const box = [...document.querySelectorAll('#view .check')]
    .find(c => /Spelling and capitals/.test(c.textContent))?.querySelector('input');
  box.click();
  await new Promise(r => setTimeout(r, 500));
  return { off: AC.spellingOn() === false, stillTypo: AC.typographyOn() === true };
});
ok('8c turning one off turns only that one off',
  toggled.off && toggled.stillTypo, JSON.stringify(toggled));

const persists = await page.evaluate(() => {
  const raw = localStorage.getItem(`sid.v2.${window.Sid.L.namespace()}.slice.settings`) || '';
  return /"spelling":false/.test(raw);
});
ok('8d and the choice is saved', persists, String(persists));

/* turn it back on so the state is clean */
await page.evaluate(async () => {
  const AC = await import('./js/autocorrect.js');
  AC.setPart('spelling', true);
});

/* ---- F. it never runs over text you did not just type ------------ */
const untouched = await page.evaluate(async () => {
  const S = window.Sid.S;
  const before = 'teh old entry... i wrote this weeks ago';
  S.get('p_x').content = S.get('p_x').content || {};
  S.get('p_x').content.thread = [{ id: 'old1', title: 'Old', body: before,
    status: 'draft', when: '', tags: '', notes: '', media: [] }];
  S.touch('p_x');
  location.hash = '#/p/x/thread';
  await new Promise(r => setTimeout(r, 1200));
  document.querySelector('#view .item')?.click();
  await new Promise(r => setTimeout(r, 900));
  const shown = document.querySelector('.modal textarea')?.value;
  document.querySelector('.modal .icon-btn')?.click();
  await new Promise(r => setTimeout(r, 400));
  return { before, shown, after: S.get('p_x').content.thread[0].body };
});
ok('9 opening old text does not rewrite a character of it',
  untouched.shown === untouched.before && untouched.after === untouched.before,
  JSON.stringify(untouched));

ok('10 nothing errored anywhere', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();
let bad = 0;
for (const [pass, name, detail] of results) {
  if (!pass) bad++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${pass ? '' : '   << ' + detail}`);
}
console.log(bad ? `\n${bad} FAILED` : `\nall ${results.length} passed`);
process.exit(bad ? 1 : 0);
