/* ============================================================
   unlocks.js — Spotify features you cannot use yet

   Everything here is gated on a number. Showing them as tasks
   would be a lie; hiding them means finding out too late. So
   they sit in a ladder with the distance to each one, read from
   whatever you last logged in Stats.
   Thresholds checked September 2026.
   ============================================================ */

export const UNLOCKS = [
  {
    id: 'presave',
    name: 'Pre-save campaign',
    need: 'Nothing — available from the moment the release is delivered to the distributor.',
    metric: null,
    what: 'A pre-save converts on release day into a library add and a first-day stream, which is the signal Spotify weighs most heavily in the first 24 hours.',
    how: 'Through your distributor or a free tool. Set it up at T-21 and point the smart link at it.',
  },
  {
    id: 'pitch',
    name: 'Editorial playlist pitch',
    need: 'Nothing, but only once, and only before release.',
    metric: null,
    what: 'The single highest-leverage action available to an unknown artist. A pitched track also enters Release Radar for everyone who follows you, whether or not an editor reads it.',
    how: 'Spotify for Artists → the unreleased track → Pitch. At least 7 days before release; 4 weeks is better.',
    deadline: true,
  },
  {
    id: 'canvas',
    name: 'Canvas',
    need: 'Nothing — any artist with a live track.',
    metric: null,
    what: 'A silent 3–8 second vertical loop behind the track. Measurably lifts saves and shares.',
    how: 'Spotify for Artists → Music → the track → Canvas. Build one in the Asset studio.',
  },
  {
    id: 'showcase',
    name: 'Showcase',
    need: '1,000 recent streams in the market you want to target.',
    metric: 'streams',
    threshold: 1000,
    what: 'A sponsored recommendation card in the mobile app, paid per click.',
    how: 'Self-serve budgets start around $100 per sub-campaign — more than the whole ad budget for this release, so this is a second-single decision.',
  },
  {
    id: 'marquee',
    name: 'Marquee',
    need: '1,000 recent streams AND 5,000 monthly listeners in that market.',
    metric: 'listeners',
    threshold: 5000,
    what: 'A full-screen takeover shown to people who have listened to you before. The strongest Spotify ad unit, and the one with the real eligibility wall.',
    how: 'Same self-serve budget floor as Showcase. Eligibility is per market, so India and the diaspora markets count separately.',
  },
  {
    id: 'video',
    name: 'Video uploads',
    need: 'Beta access — tens of thousands of artists so far, with a waitlist.',
    metric: null,
    what: 'Full-length video on the track page: official videos, live and studio sessions, covers. Over 30 seconds these earn royalties.',
    how: 'Spotify for Artists → Video & Visuals, on desktop. If the button is not there, join the waitlist or deliver through the distributor. Visualisers and lyric videos are not eligible.',
  },
  {
    id: 'discovery',
    name: 'Discovery Mode',
    need: 'An invitation, and a track already getting algorithmic plays.',
    metric: null,
    what: 'Trades a lower royalty rate for more algorithmic placement.',
    how: 'Read the arithmetic before opting in: you are paying with royalty percentage on every stream it touches, not with cash.',
    caution: true,
  },
];

/** Markets worth tracking separately, since eligibility is per market. */
export const MARKETS = ['India', 'United States', 'United Kingdom', 'UAE', 'Canada', 'Australia', 'Germany'];
