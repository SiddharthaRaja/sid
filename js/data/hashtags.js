/* ============================================================
   hashtags.js — seeded tag sets, tiers and the rules that matter

   Tiers are about post count, and the point of them is that a
   small account cannot win a tag with ten million posts. You get
   found in the niche tier and borrow reach from the mid tier.
   ============================================================ */

export const TIERS = [
  { key: 'niche', label: 'Niche',  range: 'under 50k posts',  note: 'Where you can actually rank. Most of your set lives here.' },
  { key: 'mid',   label: 'Mid',    range: '50k – 1M',          note: 'Reachable on a good post. One or two per set.' },
  { key: 'big',   label: 'Big',    range: 'over 1M',           note: 'Categorisation only. You will not rank. Never more than one.' },
];

export const tierOf = (t) => TIERS.find(x => x.key === t) || TIERS[0];

/* Seed sets. `tags` are written without the #; the app adds it.
   Sizes are estimates from 2026 and drift — the tier matters, the
   exact number does not. */
export const HASHTAG_SETS = [
  {
    id: 'ig-release', name: 'Instagram — release day', platform: 'instagram', use: 'caption',
    tags: [
      { t: 'indiepopindia', tier: 'niche' },
      { t: 'indianindieartist', tier: 'niche' },
      { t: 'newmusicindia', tier: 'niche' },
      { t: 'bedroompopindia', tier: 'niche' },
      { t: 'indieindia', tier: 'mid' },
      { t: 'newmusicfriday', tier: 'big' },
    ],
  },
  {
    id: 'ig-bts', name: 'Instagram — studio / behind the scenes', platform: 'instagram', use: 'reel',
    tags: [
      { t: 'songwritingprocess', tier: 'niche' },
      { t: 'bedroomproducer', tier: 'mid' },
      { t: 'homestudiosetup', tier: 'niche' },
      { t: 'demoversion', tier: 'niche' },
      { t: 'musicproduction', tier: 'big' },
    ],
  },
  {
    id: 'ig-lyric', name: 'Instagram — lyric / acoustic', platform: 'instagram', use: 'reel',
    tags: [
      { t: 'lyricvideo', tier: 'niche' },
      { t: 'acousticcover', tier: 'mid' },
      { t: 'sadindiesongs', tier: 'niche' },
      { t: 'originalsong', tier: 'mid' },
    ],
  },
  {
    id: 'tt-general', name: 'TikTok — general', platform: 'tiktok', use: 'caption',
    tags: [
      { t: 'newmusic', tier: 'big' },
      { t: 'indieartist', tier: 'mid' },
      { t: 'unsignedartist', tier: 'niche' },
    ],
  },
  {
    id: 'yt-desc', name: 'YouTube — description', platform: 'youtube', use: 'video',
    tags: [
      { t: 'indiepop', tier: 'big' },
      { t: 'originalsong', tier: 'mid' },
      { t: 'indianindie', tier: 'niche' },
    ],
  },
];

/* Per-platform caps and the count that actually works. */
export const TAG_RULES = {
  instagram: { max: 30, sweet: '3–5', note: 'Relevance beats volume. Five specific tags outperform thirty generic ones, and a wall of tags reads as spam to a human scrolling.' },
  tiktok:    { max: 0,  sweet: '3',   note: 'Counts against the 2 200-character caption. Three specific tags; the algorithm reads your on-screen text and speech far more than your tags.' },
  youtube:   { max: 15, sweet: '3–5', note: 'In the description. The first three appear above the video title.' },
  threads:   { max: 1,  sweet: '1',   note: 'Threads allows one topic tag per post. Choose it properly.' },
  x:         { max: 0,  sweet: '0–2', note: 'Hashtags on X do almost nothing now and cost you characters.' },
  facebook:  { max: 0,  sweet: '0–2', note: 'Effectively decorative.' },
  bluesky:   { max: 0,  sweet: '0',   note: 'No tag index. Feeds are the distribution.' },
  soundcloud:{ max: 0,  sweet: '4',   note: 'The one place tags still genuinely drive discovery — three genre, one mood.' },
};

export const BANNED_NOTE =
  'Instagram silently suppresses posts carrying tags that have been mass-abused. They are never announced. ' +
  'If reach on one post collapses for no reason, the tag block is the first suspect — rotate it out and see.';
