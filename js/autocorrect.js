/* ============================================================
   autocorrect.js — fix the typing, never the writing

   Two jobs, both deliberately small:

     typography — the characters a phone keyboard will not give you.
       Straight quotes become curly ones, -- becomes an em dash,
       three dots become an ellipsis.

     spelling — a short list of typos that are never a real word
       (teh, adn, dont), a lone "i" raised to "I", and the first
       letter of a sentence capitalised.

   The rules it follows about ITSELF matter more than the rules it
   applies:

     • It only ever acts on the word you just finished — the one
       behind the caret when you type a space or a full stop. It
       never rewrites text you are not touching, never runs over a
       whole entry, and never changes anything on load. Opening a
       three-week-old diary entry cannot alter a character of it.

     • It never touches a #hashtag, an @handle, a URL, or any token
       carrying a digit. Those are the things an autocorrect gets
       wrong in a way that costs you a post.

     • It only corrects a word that is entirely lower case, so
       iPhone, TikTok and DSPs survive, and so does a word you have
       already deliberately capitalised.

     • Every change goes in as if you typed it, so one Ctrl+Z (or a
       long press on Android) takes it straight back. Nothing it does
       is a change you cannot immediately undo.

   And it is off in one tap, in Settings → Appearance.
   ============================================================ */

import * as S from './store.js';

/* ---- what it knows ---------------------------------------------- */

/* Only words that are never a real word in their own right. "its",
   "lets", "ill", "were" and "id" are all correct English somewhere,
   so none of them are here — an autocorrect that is right most of
   the time is worse than one that is right every time. */
export const TYPOS = {
  teh: 'the', hte: 'the', taht: 'that', thsi: 'this', thne: 'then',
  adn: 'and', nad: 'and', anf: 'and', jsut: 'just', konw: 'know',
  woudl: 'would', coudl: 'could', shoudl: 'should', abotu: 'about',
  thier: 'their', recieve: 'receive', recieved: 'received',
  seperate: 'separate', seperately: 'separately',
  definately: 'definitely', defintely: 'definitely',
  occured: 'occurred', occuring: 'occurring',
  untill: 'until', wich: 'which', becuase: 'because', becasue: 'because',
  freind: 'friend', beleive: 'believe', belive: 'believe',
  tommorow: 'tomorrow', tommorrow: 'tomorrow', tomorow: 'tomorrow',
  allready: 'already', alomst: 'almost', agian: 'again',
  writen: 'written', wirting: 'writing', gaurd: 'guard',
  successfull: 'successful', sucessful: 'successful',
  acheive: 'achieve', acheived: 'achieved',
  releaseing: 'releasing', realeased: 'released', realease: 'release',
  singel: 'single', sogn: 'song', muisc: 'music', albumn: 'album',
  /* contractions the keyboard drops the apostrophe from */
  dont: "don't", cant: "can't", wont: "won't", isnt: "isn't",
  wasnt: "wasn't", arent: "aren't", werent: "weren't",
  didnt: "didn't", doesnt: "doesn't", couldnt: "couldn't",
  wouldnt: "wouldn't", shouldnt: "shouldn't", havent: "haven't",
  hasnt: "hasn't", hadnt: "hadn't", youre: "you're", theyre: "they're",
  thats: "that's", whats: "what's", theres: "there's",
  im: "I'm", ive: "I've", ill: null, id: null,   // null = never touch
};

/* ---- the switches ------------------------------------------------ */

const conf = () => {
  const s = S.get('settings');
  s.autocorrect = s.autocorrect || {};
  return s.autocorrect;
};
/* On by default — both halves. A setting you have to find before the
   feature does anything is a setting nobody turns on. */
export const typographyOn = () => conf().typography !== false;
export const spellingOn = () => conf().spelling !== false;
export const anyOn = () => typographyOn() || spellingOn();

export function setPart(part, on) {
  const c = conf();
  c[part] = !!on;
  S.touch('settings');
}

/* ---- the pieces --------------------------------------------------- */

const APOS = '’';            // ’
const OPEN_D = '“', CLOSE_D = '”';   // “ ”
const ELLIPSIS = '…';        // …
const EMDASH = '—';          // —

/** A word this must not touch, whatever else is true of it. */
export function protectedWord(w) {
  return !w
    || /[#@]/.test(w)            // a hashtag or a handle
    || /\d/.test(w)              // anything with a number in it
    || /[:/\\]/.test(w)          // a URL, a path, a time
    || /[._]/.test(w)            // a domain or a snake_case token
    || w !== w.toLowerCase();    // already capitalised on purpose
}

/** Is the caret sitting inside a URL? */
function inURL(text, at) {
  const before = text.slice(0, at);
  const sp = Math.max(before.lastIndexOf(' '), before.lastIndexOf('\n')) + 1;
  return /^(https?:\/\/|www\.)/i.test(before.slice(sp));
}

/** Does a new sentence start at index i? */
function startsSentence(text, i) {
  const before = text.slice(0, i).replace(/[\s]+$/, '');
  if (!before) return true;
  return /[.!?]$/.test(before) || /\n\s*$/.test(text.slice(0, i));
}

/**
 * Work out the single edit to make, given the text and where the
 * caret is. Returns {from, to, insert} or null for "leave it alone".
 * Pure — the DOM work happens in attach().
 */
export function edit(text, caret, opts = {}) {
  const typo = opts.typography !== false;
  const spell = opts.spelling !== false;
  if (caret < 1) return null;

  const ch = text[caret - 1];

  /* ---- typed-character replacements, applied at once ------------- */
  if (typo && !inURL(text, caret)) {
    // three dots → one ellipsis
    if (ch === '.' && text.slice(caret - 3, caret) === '...') {
      return { from: caret - 3, to: caret, insert: ELLIPSIS };
    }
    // a straight apostrophe between letters, or after one → curly
    if (ch === "'" && /[\p{L}]/u.test(text[caret - 2] || '')) {
      return { from: caret - 1, to: caret, insert: APOS };
    }
    // a straight double quote → the right curly one for where it sits
    if (ch === '"') {
      const prev = text[caret - 2] || '';
      const opening = !prev || /[\s([{—-]/.test(prev);
      return { from: caret - 1, to: caret, insert: opening ? OPEN_D : CLOSE_D };
    }
    // "word -- word": the dash resolves when the next space arrives
    if (ch === ' ' && text.slice(caret - 3, caret - 1) === '--') {
      return { from: caret - 3, to: caret - 1, insert: EMDASH };
    }
  }

  /* ---- word fixes, only once the word is finished ---------------- */

  /* Only whitespace ends a word. A full stop or a colon must NOT, or
     "sid.app" is two words and "https://x.com" is five — and the
     first of them gets a capital. Trailing punctuation is trimmed
     below instead, which gets "teh." right without breaking either. */
  if (!/\s/.test(ch)) return null;

  const upto = caret - 1;
  let tokStart = upto;
  while (tokStart > 0 && !/\s/.test(text[tokStart - 1])) tokStart--;
  const raw = text.slice(tokStart, upto);
  if (!raw) return null;

  /* Trim the punctuation around the word, keeping the offsets honest.
     Leading # and @ are deliberately NOT trimmed — they are the
     signal that this token must be left alone. */
  const lead = (raw.match(/^[("'“‘—-]+/) || [''])[0].length;
  const trail = (raw.slice(lead).match(/[.,;:!?)\]}"'”’…—-]+$/) || [''])[0].length;
  const start = tokStart + lead;
  const end = upto - trail;
  if (end <= start) return null;
  const word = text.slice(start, end);

  if (inURL(text, start + 1)) return null;

  // a lone "i" is always meant to be "I"
  if (spell && word === 'i') return { from: start, to: end, insert: 'I' };
  if (spell && /^i['’](m|ve|ll|d)$/.test(word)) {
    return { from: start, to: end, insert: 'I' + word.slice(1) };
  }

  if (protectedWord(word)) return null;

  if (spell) {
    const fix = Object.prototype.hasOwnProperty.call(TYPOS, word) ? TYPOS[word] : undefined;
    if (fix) {
      let out = typo ? fix.replace("'", APOS) : fix;
      /* a typo that opens a sentence still gets its capital — fixing
         "teh" to "the" and leaving it lower case is half a job */
      if (startsSentence(text, start)) out = out[0].toUpperCase() + out.slice(1);
      return { from: start, to: end, insert: out };
    }
    // first word of a sentence gets its capital
    if (startsSentence(text, start) && /^[a-z]/.test(word)) {
      return { from: start, to: start + 1, insert: word[0].toUpperCase() };
    }
  }
  return null;
}

/* ---- wiring it to a field ---------------------------------------- */

const busy = new WeakSet();

/**
 * Attach to one input or textarea. Safe to call twice.
 * Opt a field out with data-nocorrect, the way the search boxes do.
 */
export function attach(el) {
  if (!el || el.dataset.acOn === '1') return el;
  if (el.dataset.nocorrect === '1') return el;
  const type = (el.type || 'text').toLowerCase();
  if (el.tagName !== 'TEXTAREA' && !['text', 'search', ''].includes(type)) return el;
  if (type === 'search') return el;                 // a query is not prose
  el.dataset.acOn = '1';

  /* Let the phone's own keyboard do its job too — this sits on top of
     Gboard and iOS, it does not replace them. */
  if (!el.hasAttribute('spellcheck')) el.spellcheck = true;
  if (!el.hasAttribute('autocapitalize')) el.setAttribute('autocapitalize', 'sentences');
  if (!el.hasAttribute('autocorrect')) el.setAttribute('autocorrect', 'on');

  el.addEventListener('input', (e) => {
    if (busy.has(el)) return;                       // our own edit coming back
    if (e.isComposing) return;                      // the IME is still deciding
    if (e.inputType && !/^insert/.test(e.inputType)) return;  // deleting, undoing
    if (!anyOn()) return;

    const caret = el.selectionStart;
    if (caret !== el.selectionEnd) return;          // something is selected

    const ed = edit(el.value, caret, {
      typography: typographyOn(), spelling: spellingOn(),
    });
    if (!ed) return;

    busy.add(el);
    try {
      el.setSelectionRange(ed.from, ed.to);
      /* insertText rather than assigning .value, so the browser keeps
         it on the undo stack and one Ctrl+Z puts back what you typed */
      const done = document.execCommand && document.execCommand('insertText', false, ed.insert);
      if (!done) {
        const v = el.value;
        el.value = v.slice(0, ed.from) + ed.insert + v.slice(ed.to);
      }
      const shift = ed.insert.length - (ed.to - ed.from);
      el.setSelectionRange(caret + shift, caret + shift);
    } catch { /* never let a correction break the typing */ }
    busy.delete(el);

    /* tell the field's own handler the value moved, so it saves */
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });

  return el;
}
