/* ============================================================
   seo.js — what actually gets a post found, per platform

   Limits and folds are the ones the platforms enforce; the
   "what ranks" notes are the honest version, including the
   platforms where the answer is "nothing you write matters".
   ============================================================ */

/* Where the "…more" fold falls, per platform and content type.
   Everything after this is invisible until someone taps. */
export const FOLDS = {
  instagram: { caption: 125, reel: 55, carousel: 125 },
  facebook:  { post: 250 },
  youtube:   { video: 157 },        // the description shown above "Show more"
  tiktok:    { caption: 70 },
  threads:   { post: 200 },
  x:         { post: 280 },
  linkedin:  { post: 210 },
};

export const foldOf = (pkey, tkey) => (FOLDS[pkey] || {})[tkey] || 0;

/* ---------- per-platform discovery reference ---------- */

export const PLATFORM_SEO = {
  instagram: {
    ranks: 'Caption keywords, alt text, the Name field on your profile, and audio. Hashtags help categorise; they are not search.',
    do: [
      'Put the real subject words in the first sentence — Instagram indexes caption text now, so "acoustic indie pop from [CITY]" beats "🎶✨".',
      'Write alt text on every image. It is a search field and takes ten seconds.',
      'The profile Name field (not the handle) is searchable — put artist name + genre in it.',
      '3–5 relevant hashtags outperform 30 scattered ones. Relevance beats volume.',
      'Original audio gets its own page — name it properly, it becomes a discovery surface.',
    ],
    dont: ['Hashtags in a comment instead of the caption — no longer helps, and splits the text index.'],
  },
  youtube: {
    ranks: 'Title, then thumbnail click-through rate, then watch time. Description and tags are tie-breakers, not levers.',
    do: [
      'Title: the searchable phrase first, artist second — "[SONG] (Official Video) — [ARTIST]".',
      'First two lines of the description are what shows and what gets indexed. Smart link goes there.',
      'Full lyrics in the description: people search lyrics constantly.',
      '3–5 hashtags in the description — the first three show above the title.',
      'Chapters/timestamps for anything over three minutes.',
      'A thumbnail legible at phone size is worth more than everything else on this list combined.',
    ],
    dont: ['Tag stuffing. Tags are near-worthless since 2018 and a wall of them looks like spam to a human.'],
  },
  ytshorts: {
    ranks: 'On-screen text and the first second. Shorts are served, not searched.',
    do: ['Burn the hook into the first frame as text.', 'Keep it under 30 seconds for the first few.', '#Shorts in the title is no longer required but does no harm.'],
    dont: ['Uploading the Reel with the TikTok watermark — it is demoted.'],
  },
  tiktok: {
    ranks: 'On-screen text, spoken words (auto-transcribed), and the caption — in that order. TikTok is genuinely a search engine for under-25s.',
    do: [
      'Say the searchable phrase out loud in the video. It is transcribed and indexed.',
      'On-screen text in the first frame, and keep it away from the UI edges.',
      'Caption under 70 characters or it truncates.',
      'Use the sound page: your own track as the audio makes every use of it a link back.',
    ],
    dont: ['Reposting with a watermark.', 'Hashtag blocks of 20 — three specific ones do more.'],
  },
  facebook: {
    ranks: 'Almost nothing organically. Treat it as a paid surface and a Meta ads requirement.',
    do: ['Keep the page complete so ads can run.', 'Cross-post Reels — Facebook Reels reach is oddly good.'],
    dont: ['Spend writing time here that Instagram would repay better.'],
  },
  x: {
    ranks: 'Recency, replies and the first 40 characters. Links are fine — the "links suppress reach" thing is overstated now.',
    do: ['Post the link directly.', 'Reply to your own post with the context — the thread is the format.'],
    dont: ['"Link in bio" — that is an Instagram habit that costs you clicks here.'],
  },
  threads: {
    ranks: 'Replies and the topic tag. Text-first, so the writing has to carry it.',
    do: ['One topic tag, not five.', 'Ask something answerable in four words.'],
    dont: [],
  },
  bluesky: {
    ranks: 'Followers and feeds — there is no recommendation algorithm to game.',
    do: ['Get into the relevant custom feeds; that is the whole distribution.'],
    dont: [],
  },
  spotify: {
    ranks: 'Nothing you write. Playlists, saves and skip rate. The only text lever is the artist name and the pitch.',
    do: [
      'Pitch through Spotify for Artists at least 7 days before release — this is the single highest-leverage thing on any of these lists.',
      'Fill the artist bio and pick an Artist Pick — it does not rank, but it converts the visits you get.',
      'Canvas on the track: measurably lifts saves and shares.',
    ],
    dont: ['Buying playlist placement. It is detectable, and the stream-to-save ratio kills you afterwards.'],
  },
  applemusic: {
    ranks: 'Editorial and Shazam. Apple weights Shazam heavily — it owns it.',
    do: ['Get the song Shazammed early, including by you and your friends in the first week.'],
    dont: [],
  },
  soundcloud: {
    ranks: 'Tags and reposts. The one platform where tags still do real work.',
    do: ['Three genre tags and one mood tag.', 'Reposts from mid-size accounts outperform everything else here.'],
    dont: [],
  },
};

/* ---------- YouTube field limits ---------- */

export const YT_FIELDS = [
  { key: 'title',  label: 'Title',       limit: 100,  note: 'Searchable phrase first. Shows ~60 characters on mobile.' },
  { key: 'desc',   label: 'Description', limit: 5000, note: 'First 157 characters show above "Show more" — link and hook go there.' },
  { key: 'tags',   label: 'Tags',        limit: 500,  note: 'Total across all tags. Diminishing returns after about ten.' },
];

/* ---------- keywords ---------- */

export const KEYWORD_PROMPTS = [
  'The genre as a listener would say it, not as a distributor would ("sad indie pop", not "alternative/indie").',
  'Your city or scene — "[CITY] indie", "Indian indie pop", "desi alt".',
  'The mood or occasion someone searches at 1am: "songs for driving at night", "heartbreak playlist".',
  'Comparison artists — people search "artists like X" far more than they search new names.',
  'The lyric people will misremember and type into a search box.',
  'The language mix, if there is one: "Hindi English indie", "Tamil indie pop".',
];

export const KEYWORD_USES = [
  ['caption',  'First sentence of Instagram and Facebook captions'],
  ['yt',       'YouTube title and first description line'],
  ['tiktok',   'Said out loud in the video, and on screen'],
  ['profile',  'Instagram Name field and YouTube channel keywords'],
  ['dsp',      'Spotify / Apple artist bio'],
  ['pitch',    'The Spotify editorial pitch and every playlist submission'],
];
