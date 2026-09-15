/* ============================================================
   lint.js — read a caption the way the platform will

   Pure functions, no DOM, so the same checks run in the item
   editor, in batch write and in the queue. Every rule here is
   one you can act on; nothing scores you out of ten.
   ============================================================ */

import { WEAK } from './data/phrasebank.js';
import { foldOf } from './data/seo.js';
import { TAG_RULES } from './data/hashtags.js';
import { missingPlaceholders } from './data/templates.js';

const EMOJI = /\p{Extended_Pictographic}/gu;

export const hashtagsIn = (t) => (String(t || '').match(/#[\p{L}\p{N}_]+/gu) || []);
export const linksIn = (t) => (String(t || '').match(/https?:\/\/\S+/g) || []);
export const firstLine = (t) => String(t || '').split('\n')[0];

/** Slice without cutting an emoji in half — a plain slice() lands
    between the two halves of a surrogate pair and renders as a � */
export function cut(text, n) {
  const chars = Array.from(String(text || ''));
  return [chars.slice(0, n).join(''), chars.slice(n).join('')];
}

/** What shows before the "…more" fold, and what is hidden behind it. */
export function fold(text, n) {
  const s = String(text || '');
  if (!n || Array.from(s).length <= n) return { shown: s, hidden: '', folds: false };
  const [shown, hidden] = cut(s, n);
  return { shown, hidden, folds: true };
}

/**
 * opts: { platform, type, limit, recent: [strings] }
 * Returns [{ level, msg, fix }] — 'bad' blocks, 'warn' is a judgement
 * call, 'info' is a nudge.
 */
export function lint(text, opts = {}) {
  const t = String(text || '');
  const out = [];
  const add = (level, msg, fix) => out.push({ level, msg, fix });
  if (!t.trim()) return out;

  const { platform = '', type = '', limit = 0 } = opts;
  const lower = t.toLowerCase();

  /* --- hard limits --- */
  if (limit && t.length > limit) {
    add('bad', `${t.length} characters — ${t.length - limit} over the ${limit} limit.`,
      'It will be cut off mid-word, not rejected.');
  }

  /* --- the fold --- */
  const f = foldOf(platform, type);
  if (f && Array.from(t).length > f) {
    const [shown] = cut(t, f);
    add('info', `Only the first ${f} characters show before "…more".`,
      `Ends at: "…${shown.slice(-40).trim()}"`);
  }

  /* --- the first line --- */
  const fl = firstLine(t).trim();
  if (fl.length > 90) {
    add('warn', 'The first line is long.', 'A hook that needs 90 characters is usually two sentences pretending to be one.');
  }
  if (/^(hey guys|hi guys|hello everyone|so excited to announce|i am excited|i'm excited)/i.test(fl)) {
    add('warn', 'That opening is the most-scrolled-past sentence on the internet.', 'Start at the interesting bit.');
  }

  /* --- weak words --- */
  const found = [];
  for (const w of Object.keys(WEAK)) {
    const re = new RegExp(`(^|[^\\p{L}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\p{L}]|$)`, 'iu');
    if (re.test(lower)) found.push(w);
  }
  if (found.length) {
    add('info', `Filler: ${found.slice(0, 5).map(w => `"${w}"`).join(', ')}${found.length > 5 ? ` +${found.length - 5}` : ''}.`,
      'Tap a word in the phrase bank for something to put there instead.');
  }

  /* --- links --- */
  const links = linksIn(t);
  if (/link in bio/i.test(t) && ['x', 'facebook', 'threads', 'youtube', 'bluesky'].includes(platform)) {
    add('warn', '"Link in bio" on a platform where real links work.', 'Paste the actual smart link — you are throwing away the clicks.');
  }
  if (links.length && platform === 'instagram') {
    add('info', 'Instagram captions do not make links clickable.', 'It will be read as plain text.');
  }

  /* --- hashtags --- */
  const tags = hashtagsIn(t);
  const rule = TAG_RULES[platform];
  if (rule && tags.length) {
    if (rule.max && tags.length > rule.max) add('bad', `${tags.length} hashtags — ${platform} allows ${rule.max}.`);
    else if (tags.length > 8 && platform === 'instagram') add('warn', `${tags.length} hashtags.`, `${rule.sweet} relevant ones do more, and a wall of tags reads as spam.`);
    else if (rule.sweet) add('info', `${tags.length} hashtags (${rule.sweet} is the sweet spot here).`);
  }

  /* --- emoji --- */
  const em = (t.match(EMOJI) || []).length;
  if (em > 8) add('warn', `${em} emoji.`, 'Past about five they stop being punctuation and start being noise.');

  /* --- shouting --- */
  const letters = t.replace(/[^\p{L}]/gu, '');
  const caps = t.replace(/[^A-Z]/g, '');
  if (letters.length > 40 && caps.length / letters.length > 0.4) {
    add('warn', 'Mostly capitals.', 'Screen readers spell these out letter by letter.');
  }

  /* --- ending --- */
  const hasCta = /(link in bio|pre-?save|out now|listen|save it|share|comment|follow|tell me|which one|https?:\/\/)/i.test(t);
  if (!hasCta && t.length > 120) {
    add('info', 'No ask at the end.', 'One line — save it, send it to someone, tell me which. Not three asks.');
  }

  /* --- unfilled template placeholders --- */
  const gaps = missingPlaceholders(t);
  if (gaps.length) {
    add('bad', `Unfilled placeholders: ${gaps.map(g => '[' + g + ']').join(' ')}.`,
      'These post verbatim if you do not fill them.');
  }

  /* --- repetition against your own recent posts --- */
  const recent = (opts.recent || []).filter(Boolean);
  if (recent.length && fl.length > 12) {
    const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '').trim();
    const nfl = norm(fl);
    const dupe = recent.find(r => {
      const rl = norm(firstLine(r));
      return rl && (rl === nfl || (rl.length > 15 && nfl.startsWith(rl.slice(0, 15))));
    });
    if (dupe) add('warn', 'You have opened a recent post the same way.', 'Repeating an opener is the fastest way to look automated.');
  }
  if (recent.length && tags.length) {
    const prev = new Set(recent.flatMap(r => hashtagsIn(r).map(x => x.toLowerCase())));
    const same = tags.filter(x => prev.has(x.toLowerCase()));
    if (same.length >= 4) {
      add('warn', `${same.length} of these hashtags were on your last posts too.`,
        'Identical tag blocks post after post are the classic suppression trigger. Rotate a set.');
    }
  }

  return out;
}

/** One-line verdict for a list row. */
export function lintSummary(text, opts) {
  const l = lint(text, opts);
  const bad = l.filter(x => x.level === 'bad').length;
  const warn = l.filter(x => x.level === 'warn').length;
  if (bad) return { level: 'bad', text: `${bad} problem${bad > 1 ? 's' : ''}` };
  if (warn) return { level: 'warn', text: `${warn} to look at` };
  return { level: 'ok', text: 'clean' };
}
