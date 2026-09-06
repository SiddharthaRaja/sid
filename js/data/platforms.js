/* ============================================================
   platforms.js — the registry that drives nav, calendars,
   content banks, stats and info sections.
   Add a platform here and it appears everywhere automatically.
   ============================================================ */

/* content type:
   key, label, limit (chars, 0 = none), hint, media (bool) */

const post = (key, label, limit, hint, media = true) => ({ key, label, limit, hint, media });

export const PLATFORMS = [
  /* ---------------- social / short-form ---------------- */
  {
    key: 'instagram', name: 'Instagram', group: 'Social', icon: 'instagram',
    handleField: true,
    types: [
      post('caption', 'Feed captions', 2200, 'First 125 characters show before "more" — front-load the hook.'),
      post('reel', 'Reels', 2200, 'Hook audible in the first 2 seconds. Burned-in captions, not auto-captions.'),
      post('story', 'Stories', 0, 'Frames in a sequence. Link sticker at least once a week.'),
      post('carousel', 'Carousels', 2200, 'Slide 1 is the whole game. 5–10 slides.'),
      post('broadcast', 'Broadcast channel', 0, 'Your owned audience — the algorithm can\'t take it away.'),
    ],
    metrics: ['Followers', 'Reach', 'Profile visits', 'Link clicks', 'Saves', 'Shares'],
    setup: [
      'Switch to Professional → Creator → Musician/Band',
      'Username = your universal handle; Name field = artist name + genre (the Name field is searchable)',
      'Profile photo 1000×1000, bio, link = smart link',
      'Contact button → artist email',
      'Highlights with designed covers: music · single · studio · live · me · press',
      'Broadcast Channel created and named',
      'Close Friends list built (~50 people) for early previews',
      'Connect Meta Business Suite for scheduling',
      'Story templates saved: countdown, out now, lyric card, poll, question box, link sticker',
      'Reels remix + downloads turned ON',
      'Add the track as profile music on release day',
      'Pin 3 posts after release',
    ],
  },
  {
    key: 'youtube', name: 'YouTube', group: 'Social', icon: 'youtube',
    types: [
      post('video', 'Videos', 5000, 'Full lyrics in the description, credits, smart link, 3–5 hashtags.'),
      post('thumb', 'Thumbnails', 0, '1280×720. Legible at phone size.'),
      post('community', 'Community posts', 0, ''),
      post('playlist', 'Playlists', 0, 'Official Videos · Lyric Videos · Live/Acoustic · Shorts'),
    ],
    metrics: ['Subscribers', 'Views', 'Watch time (hrs)', 'Impressions', 'CTR %', 'Avg view duration'],
    setup: [
      'Channel name = artist name, handle = universal handle',
      'Banner 2560×1440 (safe area 1546×423), icon 800×800',
      'About section, channel keywords, business email, social links',
      'Request Official Artist Channel (OAC) through your distributor',
      'Playlists created',
      'Watermark / subscribe branding on all videos',
      'End screens and cards on every upload',
      'Join the YouTube Partner Program when eligible',
    ],
  },
  {
    key: 'ytshorts', name: 'YouTube Shorts', group: 'Social', icon: 'ytshorts',
    types: [
      post('short', 'Shorts', 100, 'Same files as Reels. 4×/week.'),
    ],
    metrics: ['Views', 'Likes', 'Comments', 'Subs gained', 'Avg view %'],
    setup: [
      'Post the same vertical files as Reels and TikTok, same day',
      'Under 60s, 9:16, hook in the first 2 seconds',
      'Title carries the lyric or the hook line',
    ],
  },
  {
    key: 'tiktok', name: 'TikTok', group: 'Social', icon: 'tiktok',
    types: [
      post('video', 'Videos', 2200, 'Volume platform, not a quality platform. 3–5×/week minimum.'),
      post('sound', 'Sound / trend notes', 0, 'Track which sounds and formats are working.'),
    ],
    metrics: ['Followers', 'Views', 'Likes', 'Shares', 'Sound uses', 'Avg watch %'],
    setup: [
      'Creator account (NOT Business — Business has restricted commercial sound access)',
      'Bio + link (or link as text with a pinned comment if under 1,000 followers)',
      'Verify the sound exists — search artist + song at T+1',
      'Confirm the track is in the TikTok Commercial Music Library via distributor opt-in',
      'Duet + Stitch ON',
      'Pin 3 videos',
    ],
  },
  {
    key: 'facebook', name: 'Facebook', group: 'Social', icon: 'facebook',
    types: [
      post('post', 'Posts', 0, 'Mostly cross-posted from Instagram.'),
      post('event', 'Events', 0, ''),
    ],
    metrics: ['Page likes', 'Reach', 'Engagement', 'Link clicks'],
    setup: [
      'Page (not personal profile), category Musician/Band',
      'Profile photo, cover 820×312, About, CTA button = "Listen Now" → smart link',
      'Link Page to Instagram in Meta Business Suite (required for ads)',
      'Ad account created and linked',
    ],
  },

  /* ---------------- text platforms ---------------- */
  {
    key: 'x', name: 'X', group: 'Text', icon: 'x',
    types: [
      post('tweet', 'Tweets', 280, 'Drafted in exact final form. Character count is live.'),
      post('thread', 'Threads', 0, 'One numbered post per line block. Pin the release-day thread.'),
    ],
    metrics: ['Followers', 'Impressions', 'Engagements', 'Profile visits', 'Link clicks'],
    setup: [
      'Handle + name + bio, header 1500×500',
      'Pinned tweet = release-day thread',
      'Follow ~100 accounts in your lane: journalists, curators, indie labels, artists at your level',
      'Treat as networking, not streams',
    ],
  },
  {
    key: 'threads', name: 'Threads', group: 'Text', icon: 'threads',
    types: [
      post('post', 'Posts', 500, 'Cheapest reach on the internet for text. Use it as a diary.'),
      post('journal', 'Journal entries', 0, 'The serialised entries — mixed lengths, some lyric snippets.'),
    ],
    metrics: ['Followers', 'Views', 'Likes', 'Replies', 'Reposts'],
    setup: [
      'Auto-syncs from Instagram — set bio and link',
      'Post 3–5×/week',
    ],
  },
  {
    key: 'bluesky', name: 'Bluesky', group: 'Text', icon: 'bluesky',
    types: [
      post('post', 'Posts', 300, ''),
    ],
    metrics: ['Followers', 'Likes', 'Reposts'],
    setup: ['Claim the handle', 'Mirror the strongest X and Threads posts', 'Low priority, low effort'],
  },

  /* ---------------- DSPs ---------------- */
  {
    key: 'spotify', name: 'Spotify', group: 'DSPs', icon: 'spotify',
    dsp: true,
    types: [
      post('pitch', 'Pitch drafts', 500, 'Draft and compare versions here. The submission form itself, with the deadline countdown, is the Editorial pitch tab.'),
      post('canvas', 'Canvas', 0, '9:16, 3–8s, MP4, 720×1280 min, silent, seamless loop, no text or logos.'),
      post('artistpick', 'Artist Pick', 0, 'Change it every 4 weeks — a stale pick reads as an abandoned profile.'),
      post('bio', 'Bio', 1500, ''),
      post('playlistsub', 'Playlist submissions', 0, 'One playlist per pitch. Name a track already on it.'),
    ],
    metrics: ['Monthly listeners', 'Streams', 'Listeners', 'Saves', 'Playlist adds', 'Followers'],
    setup: [
      'Claim the profile at artists.spotify.com',
      'Profile photo 750×750 · header 2660×1140 (safe centre 1500×640) · gallery 2048×2048 ×5–8',
      'Artist bio up to 1,500 characters',
      'Social links, merch and concert links',
      'Artist Pick set on release day with a custom message',
      'Canvas uploaded at T-1',
      'Editorial pitch submitted at T-25 (guarantees Release Radar placement even if editorial passes)',
      'Artist\'s Pick playlist: your song + 15–20 influences',
      'Check Marquee/Discovery Mode eligibility at T+7 (needs 5,000+ monthly listeners in market)',
    ],
  },
  {
    key: 'applemusic', name: 'Apple Music', group: 'DSPs', icon: 'applemusic',
    dsp: true,
    types: [
      post('pitch', 'Promo info', 0, 'Submitted through your distributor, not to Apple directly.'),
      post('lyrics', 'Time-synced lyrics', 0, 'Delivered via DistroKid Musician Plus.'),
    ],
    metrics: ['Plays', 'Listeners', 'Shazams', 'Playlist adds', 'Avg completion %'],
    setup: [
      'Claim at artists.apple.com (verify via distributor or a social account)',
      'Artist image 3000×3000',
      'Long bio submitted through the distributor into the TiVo/Rovi database',
      'Time-synced lyrics delivered',
      'Pre-add set up on the smart link',
      'Editorial pitch submitted to the distributor at T-28',
    ],
  },
  {
    key: 'amazonmusic', name: 'Amazon Music', group: 'DSPs', icon: 'amazonmusic',
    dsp: true,
    types: [
      post('pitch', 'New Release Pitch', 0, 'Pre-release, or within 14 days post-release. 3 genres, 3 moods, 3 similar artists, audience location, marketing drivers.'),
    ],
    metrics: ['Streams', 'Listeners', 'Followers', 'Alexa requests'],
    setup: [
      'Claim the profile at artists.amazonmusic.com',
      'Artist image + banner uploaded',
      'New Release Pitch submitted (name the diaspora markets explicitly under audience location)',
      'Enable the "Follow" CTA in your content',
    ],
  },
  {
    key: 'ytmusic', name: 'YouTube Music', group: 'DSPs', icon: 'ytmusic',
    dsp: true,
    types: [post('note', 'Notes & assets', 0, '')],
    metrics: ['Streams', 'Listeners', 'Saves'],
    setup: [
      'Official Artist Channel requested through the distributor',
      'Content ID: OPT IN via distributor',
      'Verify the topic channel merged correctly after release',
    ],
  },
  {
    key: 'tidal', name: 'Tidal', group: 'DSPs', icon: 'tidal',
    dsp: true,
    types: [post('note', 'Notes & assets', 0, '')],
    metrics: ['Streams', 'Listeners', 'Favourites'],
    setup: ['Claim at artists.tidal.com', 'Artist image + bio', 'Master delivered at -14 LUFS / -1 dBTP FLAC'],
  },
  {
    key: 'qobuz', name: 'Qobuz', group: 'DSPs', icon: 'qobuz',
    dsp: true,
    types: [post('note', 'Notes & assets', 0, '')],
    metrics: ['Streams', 'Downloads'],
    setup: ['Hi-res audience — deliver 24-bit', 'Confirm your distributor delivers to Qobuz', 'Editorial is curated: worth a direct note'],
  },
  {
    key: 'pandora', name: 'Pandora', group: 'DSPs', icon: 'pandora',
    dsp: true,
    types: [post('note', 'Notes & assets', 0, '')],
    metrics: ['Spins', 'Listeners', 'Thumbs up', 'Station adds'],
    setup: [
      'Claim via Pandora AMP (US only)',
      'SoundExchange registration is what pays you for Pandora radio spins',
      'AMP Audio Messages once you have a following',
    ],
  },
  {
    key: 'soundcloud', name: 'SoundCloud', group: 'DSPs', icon: 'soundcloud',
    dsp: true,
    types: [
      post('track', 'Tracks', 0, ''),
      post('repost', 'Repost network', 0, ''),
    ],
    metrics: ['Plays', 'Followers', 'Likes', 'Reposts', 'Comments'],
    setup: ['Claim the handle', 'Upload the track or a snippet', 'Join Repost networks', 'Private links are the standard way to send unreleased music to curators'],
  },
  {
    key: 'tencent', name: 'Tencent Music', group: 'DSPs', icon: 'tencent',
    dsp: true,
    types: [post('note', 'Notes & assets', 0, 'QQ Music · Kugou · Kuwo. Delivery is via distributor only.')],
    metrics: ['Streams', 'Listeners', 'Favourites'],
    setup: [
      'Confirm your distributor delivers to Tencent (QQ Music, Kugou, Kuwo)',
      'Metadata in simplified Chinese materially improves discovery',
      'No artist dashboard for most independents — track via distributor reports',
    ],
  },
  {
    key: 'smallplatforms', name: 'Other platforms', group: 'DSPs', icon: 'smallplatforms',
    dsp: true, multi: true,
    types: [post('note', 'Per-platform notes', 0, 'JioSaavn · Gaana · Wynk · Hungama · Deezer · Josh · Audiomack · Boomplay · Anghami · NetEase · Napster · iHeart · Bandcamp')],
    metrics: ['Streams', 'Listeners'],
    setup: [
      'JioSaavn / Gaana / Wynk / Hungama — critical for the India phase, included with DistroKid',
      'Josh + Moj — Indian short-form; opt in via distributor',
      'Deezer — claim at creators.deezer.com',
      'Audiomack — strong in emerging markets',
      'Boomplay — Africa; relevant for diaspora crossover',
      'Bandcamp — highest revenue per fan of any platform; sell the WAV + instrumental',
    ],
  },
];

export const PLATFORM_MAP = Object.fromEntries(PLATFORMS.map(p => [p.key, p]));
export const PLATFORM_GROUPS = ['Social', 'Text', 'DSPs'];
export const platformsIn = (g) => PLATFORMS.filter(p => p.group === g);

/* Sub-platforms listed inside the "Other platforms" tab. */
export const SMALL_PLATFORMS = [
  { name: 'JioSaavn',  region: 'India',        url: 'https://www.jiosaavn.com/artists' },
  { name: 'Gaana',     region: 'India',        url: 'https://gaana.com/' },
  { name: 'Wynk Music',region: 'India',        url: 'https://wynk.in/music' },
  { name: 'Hungama',   region: 'India',        url: 'https://www.hungama.com/' },
  { name: 'Josh',      region: 'India (short)',url: 'https://share.myjosh.in/' },
  { name: 'Moj',       region: 'India (short)',url: 'https://mojapp.in/' },
  { name: 'Deezer',    region: 'Global / EU',  url: 'https://creators.deezer.com/' },
  { name: 'Audiomack', region: 'Emerging',     url: 'https://audiomack.com/creators' },
  { name: 'Boomplay',  region: 'Africa',       url: 'https://www.boomplay.com/' },
  { name: 'Anghami',   region: 'MENA / Gulf',  url: 'https://www.anghami.com/' },
  { name: 'NetEase Cloud', region: 'China',    url: 'https://music.163.com/' },
  { name: 'Bandcamp',  region: 'Global',       url: 'https://bandcamp.com/artist_signup' },
  { name: 'iHeartRadio', region: 'US',         url: 'https://www.iheart.com/' },
  { name: 'Napster',   region: 'Global',       url: 'https://www.napster.com/' },
  { name: 'Shazam',    region: 'Global',       url: 'https://www.shazam.com/' },
];
