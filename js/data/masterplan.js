/* ============================================================
   masterplan.js — seed milestones, from THE MASTER RELEASE PLAN
   Every one has a T-offset so the whole plan re-dates itself the
   moment you change the release date in Settings.
   ============================================================ */

const M = (cat, title, when, note = '') => ({ id: `${cat}-${when}-${title}`.replace(/\W+/g, '').slice(0, 40), cat, title, when, note, done: false });

export const CATEGORIES = [
  ['A', 'Identity & accounts'],
  ['B', 'Memberships & subscriptions'],
  ['C', 'Rights & registrations'],
  ['D', 'Money, banking & tax'],
  ['E', 'Licensing & copyright'],
  ['F', 'Distribution & DSPs'],
  ['G', 'Social profiles & copy'],
  ['H', 'Asset inventory'],
  ['I', 'The calendar'],
  ['J', 'Paid advertising'],
  ['K', 'Radio, playlists, press'],
];

export const SEED_MILESTONES = [
  /* A — now */
  M('A', 'Decide the artist name and lock exact capitalisation', 'T-90', 'It must be byte-identical on every platform and metadata field forever.'),
  M('A', 'Check the name on Spotify, IP India and USPTO', 'T-90'),
  M('A', 'Claim the handle on all 15 platforms (namechk.com)', 'T-90', 'Claim it even where you will not post. Prefer HANDLEmusic over theHANDLE.'),
  M('A', 'Create a dedicated artist email', 'T-90', 'Never your personal or student address — every DSP, PRO and distributor ties to it forever.'),
  M('A', 'Buy the domain', 'T-90', '~₹1,000/yr. .com first.'),
  M('A', 'Set up the Drive folder structure (01 Song → 07 Reports)', 'T-90'),
  M('A', 'Build the brand kit one-pager: 2 fonts, 3 hex colours, wordmark, cover art', 'T-88'),
  M('A', 'PAN in hand and linked to Aadhaar', 'T-88'),

  /* C — the blocking one */
  M('C', 'Sign the split sheet', 'T-90', 'Before anything else if there is any co-writer, producer or feature. Single most common cause of independent-artist litigation. No split sheet = no release.'),
  M('C', 'Join BMI as a writer (free)', 'T-75', 'Accepts non-US residents and accepts you pre-release. Do NOT also join IPRS — one PRO worldwide.'),
  M('C', 'Sign up to Songtrust ($100)', 'T-60', 'Publisher side, ~245 territories including IPRS by reciprocal agreement.'),
  M('C', 'Register with SoundExchange as BOTH featured artist AND rights owner', 'T-60', 'Two separate registrations. Upload W-8BEN immediately or lose 30%.'),
  M('C', 'Confirm MLC registration (or that Songtrust does it for you)', 'T-45', 'Do not double-register.'),
  M('C', 'Register the work with BMI once the ISRC exists', 'T-30'),
  M('C', 'Verify the work appears in BMI repertory + MLC public database', 'T+7'),

  /* B */
  M('B', 'Buy DistroKid Musician Plus ($44.99)', 'T-60', 'The base plan cannot set a custom release date — no scheduled date means no pre-save campaign.'),
  M('B', 'Buy the smart-link subscription (Linkfire or Feature.fm)', 'T-45'),
  M('B', 'Buy SubmitHub credits (~25–30)', 'T-21'),

  /* D */
  M('D', 'File W-8BEN with every payer', 'T-60', 'DistroKid, BMI, Songtrust, SoundExchange, YouTube/AdSense. Article 12(2), 15%, Royalties. Expires end of the 3rd calendar year.'),
  M('D', 'Apply for the Tax Residency Certificate (Form 10FA → 10FB)', 'T-60', '~1–2 weeks. Annual, per financial year.'),
  M('D', 'Open Wise and/or Skydo and complete KYC', 'T-55', 'Skydo is RBI PA-CB authorised with automatic FIRA. Get a FIRA for every single inward payment.'),
  M('D', 'Add payout accounts to DistroKid, BMI, Songtrust, SoundExchange', 'T-50'),
  M('D', 'Confirm the purpose code with your provider (P1303 royalties)', 'T-50'),

  /* E */
  M('E', 'Clear any samples, or replace them', 'T-60', 'You need clearance from both the master owner and the publisher. Uncleared samples get releases taken down.'),
  M('E', 'Collect producer/beat licence and session releases in writing', 'T-60'),
  M('E', 'File India copyright: musical work + literary work (Form XIV)', 'T-30', '₹500 each. ~4–8 months; does not block release.'),
  M('E', 'File India copyright: sound recording', 'T-20', '₹2,000, after the master is final.'),
  M('E', 'US copyright registration (optional, $45 single application)', 'T-15', 'Register within 3 months of publication to preserve statutory damages.'),

  /* F — the hard deadlines */
  M('F', 'Export and archive all masters', 'T-35', 'Master WAV 24-bit, MP3 320, instrumental, radio/clean edit, a cappella, stems.'),
  M('F', 'UPLOAD TO DISTROKID', 'T-28', 'HARD DEADLINE. Cover art 3000×3000, custom release date, label name, songwriter splits, Content ID opt-in, time-synced lyrics, TikTok/IG/Reels opt-in, JioSaavn/Gaana/Wynk opt-in.'),
  M('F', 'Record the ISRC and UPC in the metadata sheet', 'T-28'),
  M('F', 'SUBMIT THE SPOTIFY EDITORIAL PITCH', 'T-25', 'HARD DEADLINE. One pitch per release. Guarantees Release Radar placement even if editorial passes.'),
  M('F', 'Submit Apple promo info via the distributor', 'T-25'),
  M('F', 'Submit the Amazon New Release Pitch', 'T-24'),
  M('F', 'Build the smart link with pre-save, Meta pixel and UTMs', 'T-45'),
  M('F', 'Upload the Spotify Canvas', 'T-1'),
  M('F', 'Set the Artist Pick', 'T-1'),

  /* G */
  M('G', 'All social profiles set up and populated', 'T-60'),
  M('G', 'Write every bio: one-liner, IG, TikTok, X, YouTube, short, medium, long, Spotify', 'T-55'),
  M('G', 'Assemble the EPK', 'T-35'),
  M('G', 'Write the radio one-sheet', 'T-32'),

  /* H */
  M('H', 'MUSIC VIDEO SHOOT — with the capture list in hand', 'T-45', 'Vertical-safe framing, a full uninterrupted front-on performance take, the hook performed 6+ times, 20+ b-roll clips, BTS all day, 5 talking-head clips, stills, signed releases.'),
  M('H', 'Back up all footage twice before anyone leaves', 'T-45'),
  M('H', 'Batch-export all short clips in one session', 'T-40', 'Target 60+ discrete pieces of content from one shoot day.'),
  M('H', 'Lock the 16:9 edit, then reframe to 9:16', 'T-35'),
  M('H', 'Caption every vertical clip (burned-in)', 'T-33'),

  /* I / J / K */
  M('I', 'ANNOUNCEMENT POST', 'T-30', 'Carousel or Reel with the hook audible, plus the 8-frame story sequence within 2 hours.'),
  M('K', 'Playlist submissions begin — 40+ personalised emails', 'T-21', 'One playlist per email. Name the playlist. Name a track on it. Never pay for guaranteed placement.'),
  M('K', 'Radio one-sheet sent to college / community / internet stations', 'T-20'),
  M('K', 'Press pitches sent to blogs', 'T-18', 'They need 3–4 weeks lead time. A post-release pitch to a blog is a wasted email.'),
  M('J', 'Ad creative prepared — 3 variants, 15–20s vertical', 'T-16'),
  M('J', 'Meta campaign built (not live yet)', 'T-14'),
  M('J', 'Ads go live on the pre-save, India targeting, $10/day', 'T-10'),
  M('I', 'Personal WhatsApp messages to your top 40 people — individually', 'T-7', 'Highest conversion rate of anything in the plan.'),
  M('I', 'Street team briefed with the asset folder', 'T-7'),
  M('I', 'Release-day posts written and scheduled', 'T-5'),
  M('F', 'Video uploaded to YouTube as an unlisted scheduled premiere', 'T-3'),
  M('F', 'Verify the release appears in Spotify for Artists "Upcoming"', 'T-2'),

  M('I', 'RELEASE DAY — post 8+ times, repost everyone who shares', 'T'),
  M('J', 'Switch ads from pre-save to stream conversions, $15–20/day', 'T'),
  M('F', 'Verify the track on Shazam, TikTok, IG audio, YouTube Music', 'T+1'),
  M('F', 'Claim Apple Music for Artists and Amazon Music for Artists', 'T+1'),
  M('K', 'Follow up with every curator who did not reply pre-release', 'T+2'),
  M('I', 'Screenshot every metric — you need these for release #2', 'T+3'),
  M('I', 'Week one wrap post', 'T+6'),

  M('I', 'INDIA PHASE begins', 'T+7', 'Indian playlists, college radio, campus press, local venues, Indian blogs. Meta ads India $10/day.'),
  M('F', 'Lyric video released on YouTube', 'T+14', 'Second content spike, second algorithmic push.'),
  M('I', 'One month post with real numbers', 'T+28'),
  M('I', 'DIASPORA PHASE begins', 'T+29', 'US, UK, Canada, UAE, Australia, Singapore. Retarget ads to diaspora-dense cities.'),
  M('F', 'Live / acoustic video on YouTube', 'T+42', 'Third spike.'),
  M('I', 'Two-month wrap + tease the next song', 'T+56'),
  M('I', 'WESTERN CROSSOVER PHASE begins', 'T+57', 'Second playlist push using real stats as credibility. Target ads only at your top 5 non-Indian cities.'),
  M('F', 'Release the acoustic or alternate version (new ISRC)', 'T+84', 'A brand new release cycle — new Release Radar, new pitch, new content — for the cost of an afternoon.'),
  M('I', 'Full campaign post-mortem, written down', 'T+90', 'This document is what makes release #2 twice as effective.'),
  M('D', 'Royalty reconciliation — DistroKid, BMI, Songtrust, SoundExchange', 'T+95'),
  M('I', 'Announce release #2 with a date', 'T+105', 'Nothing compounds if you stop. Release again inside 8–12 weeks.'),
];

/* The twelve that still work if everything else slips. */
export const ATTACK_ORDER = [
  'Lock the artist name and claim every handle',
  'Sign a split sheet if anyone else touched the song',
  'Join BMI as a writer (free)',
  'Buy DistroKid Musician Plus + Songtrust ($145)',
  'Register SoundExchange + MLC, file W-8BEN everywhere',
  'Open Wise and/or Skydo, collect a FIRA for every payment',
  'Shoot the video with the capture list in hand',
  'Upload to DistroKid at T-28, pitch Spotify at T-25',
  'Build the smart link with a pre-save and a Meta pixel',
  'Message your 40 closest people individually at T-7',
  'Post 4 clips a week from T-30 to T+120',
  'Release again within 12 weeks',
];
