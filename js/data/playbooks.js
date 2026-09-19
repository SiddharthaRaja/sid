/* ============================================================
   data/playbooks.js — the ten platform documents

   The documents themselves live as markdown in docs/social/ and
   are fetched on demand. They are 280 KB between them, which is
   far too much to put in the service-worker shell or to parse on
   every boot for a tab most sessions never open — so this file is
   only the index, and a document loads the first time you open it.
   After that the runtime cache has it and it works offline.

   Nothing here is editable in the app on purpose. These are
   reference: you shop from them, you do not maintain them.
   ============================================================ */

export const PLAYBOOKS = [
  {
    id: 'deck',
    file: '00-cross-platform-command-deck.md',
    title: 'The command deck',
    short: 'Start here',
    icon: 'masterplan',
    blurb: 'The binder. Redundancy matrix, routing rules, the posting clock, the master gap table, the whole T-45 → T+55 calendar, and the weekly rhythm.',
    holds: 'Read first, then keep it open',
  },
  {
    id: 'instagram',
    file: '01-instagram.md',
    title: 'Instagram',
    short: 'The big one',
    icon: 'instagram',
    blurb: '174 Reel ideas, 137 story prompts and 9 scripted sequences, 94 feed ideas, 126 written captions, 18 hashtag sets, highlights and cadence.',
    holds: 'Your reach engine',
  },
  {
    id: 'tiktok',
    file: '02-tiktok.md',
    title: 'TikTok',
    short: 'Diaspora only',
    icon: 'tiktok',
    blurb: 'The India ban and how to work around it, 132 video ideas across 9 named series, 60 hooks, 30 captions, TikTok SEO, 12 hashtag sets.',
    holds: 'Peaks after release, not during',
  },
  {
    id: 'youtube',
    file: '03-youtube.md',
    title: 'YouTube + Shorts',
    short: 'The permanent asset',
    icon: 'youtube',
    blurb: 'Eight long-form uploads from one shoot, the Shorts strategy, 30 Shorts titles, titles, thumbnails and the description template.',
    holds: 'Content ID is the actual money',
  },
  {
    id: 'x',
    file: '04-x-twitter.md',
    title: 'X',
    short: 'The diary lives here',
    icon: 'x',
    blurb: 'Track A: 60 promo posts and the networking protocol. Track B: the 100-entry diary — architecture, 100 slot prompts, 25 model entries.',
    holds: 'The one unbatchable thing',
  },
  {
    id: 'threads',
    file: '05-threads.md',
    title: 'Threads',
    short: 'Questions and off-cuts',
    icon: 'threads',
    blurb: 'Four approach variants, the register guide, 128 posts, and why it must never be an X mirror.',
    holds: 'Never the same words as X',
  },
  {
    id: 'facebook',
    file: '06-facebook.md',
    title: 'Facebook',
    short: 'Ads and groups',
    icon: 'facebook',
    blurb: 'The ads infrastructure, the groups strategy, 32 posts, and the Event.',
    holds: 'Where the ad money goes',
  },
  {
    id: 'bluesky',
    file: '07-bluesky.md',
    title: 'Bluesky',
    short: 'Tiny',
    icon: 'bluesky',
    blurb: 'Mirror rules, custom feeds, starter packs. Read once, spend ten minutes, move on.',
    holds: 'A mirror with two exceptions',
  },
  {
    id: 'spotify',
    file: '08-spotify.md',
    title: 'Spotify',
    short: 'Pitching',
    icon: 'spotify',
    blurb: '6 editorial pitch variants, 11 curator pitch variants, playlist sourcing, 32 curator archetypes, Fresh Finds, and the profile surfaces.',
    holds: 'The T-35 deadline lives here',
  },
  {
    id: 'other',
    file: '09-other-platforms.md',
    title: 'Everything else',
    short: 'Ranked by return',
    icon: 'more',
    blurb: 'The 10 highest-ROI activities, then WhatsApp, email, Reddit, Amazon, Apple, Genius, Bandcamp, LinkedIn, Pinterest — and the do-not-bother list.',
    holds: 'The do-not-bother list is the useful half',
  },
];

export const findBook = (id) => PLAYBOOKS.find(p => p.id === id) || null;

export const BOOK_PATH = './docs/social/';
