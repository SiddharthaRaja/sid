/* ============================================================
   marks.js — what you did, on the same axis as what happened

   A stats chart that goes up and does not say why is a picture,
   not information. These are the events worth drawing on it:
   posts that actually went out, ad campaigns starting, playlist
   adds, milestones finished, emails sent, and release day.
   ============================================================ */

import * as S from './store.js';
import { resolveDate } from './ui.js';
import { PLATFORMS } from './data/platforms.js';
import { PCOLORS } from './icons.js';

export const MARK_KINDS = [
  ['post',     'Posts'],
  ['ad',       'Ad campaigns'],
  ['playlist', 'Playlist adds'],
  ['email',    'Emails'],
  ['milestone','Milestones'],
  ['release',  'Release'],
];

/**
 * Everything worth annotating, as { x: ISO date, label, kind, color }.
 * opts.platform limits posts to one platform's own chart.
 * opts.kinds limits which kinds come back.
 */
export function collectMarks(opts = {}) {
  const set = S.get('settings');
  const rel = set.releaseDate;
  const want = (k) => !opts.kinds || opts.kinds.includes(k);
  const out = [];

  /* posts that actually went out — postedAt, not the date they were
     scheduled for, because a slipped post explains nothing */
  if (want('post')) {
    PLATFORMS.forEach(p => {
      if (opts.platform && p.key !== opts.platform) return;
      const sl = S.get(`p_${p.key}`);
      Object.entries(sl.content || {}).forEach(([tk, items]) => {
        (items || []).forEach(it => {
          if (it.status !== 'posted') return;
          const x = it.postedAt || resolveDate(it.when, rel);
          if (!x) return;
          out.push({
            x, kind: 'post', color: PCOLORS[p.key] || 'var(--fg-3)',
            label: `${p.name}: ${it.title || (it.body || '').slice(0, 40) || tk}`,
          });
        });
      });
    });
  }

  if (want('ad')) {
    (S.get('ads').campaigns || []).forEach(c => {
      const x = resolveDate(c.start || c.when, rel);
      if (!x) return;
      out.push({ x, kind: 'ad', color: 'var(--warn)', label: `Ad started: ${c.name || c.platform || 'campaign'}` });
    });
  }

  if (want('playlist')) {
    (S.get('playlists').items || []).forEach(pl => {
      if (pl.addedAt) out.push({ x: pl.addedAt, kind: 'playlist', color: 'var(--ok)', label: `Added to ${pl.name || 'a playlist'}` });
      if (pl.removedAt) out.push({ x: pl.removedAt, kind: 'playlist', color: 'var(--bad)', label: `Dropped from ${pl.name || 'a playlist'}` });
    });
  }

  if (want('email')) {
    (S.get('maillist').sends || []).forEach(s => {
      if (s.date) out.push({ x: s.date, kind: 'email', color: 'var(--info)', label: `Email: ${s.subject || 'sent'}` });
    });
  }

  if (want('milestone')) {
    const plan = S.get('plan');
    [...(plan.milestones || []), ...(plan.custom || [])].forEach(m => {
      if (m.doneAt) out.push({ x: m.doneAt, kind: 'milestone', color: 'var(--fg-3)', label: m.title });
    });
  }

  if (want('release') && rel) {
    out.push({ x: rel, kind: 'release', color: 'var(--accent)', label: `RELEASE — ${set.song || 'the single'}` });
  }

  return out.sort((a, b) => a.x.localeCompare(b.x));
}

/** Collapse marks that land on the same day into one line. */
export function groupMarks(marks) {
  const map = new Map();
  marks.forEach(m => {
    if (!map.has(m.x)) map.set(m.x, { x: m.x, items: [] });
    map.get(m.x).items.push(m);
  });
  return [...map.values()].map(g => ({
    x: g.x,
    items: g.items,
    /* release wins the colour, then ads, then whatever is first */
    color: (g.items.find(i => i.kind === 'release') || g.items.find(i => i.kind === 'ad') || g.items[0]).color,
    label: g.items.length === 1 ? g.items[0].label : `${g.items.length} things`,
  })).sort((a, b) => a.x.localeCompare(b.x));
}
