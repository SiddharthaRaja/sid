/* ============================================================
   playlists.js — the three kinds of playlist, and what each
   one is actually worth

   Playlist adds are the largest single driver of streams for a
   new release, and the only one you can influence directly.
   ============================================================ */

export const KINDS = [
  {
    key: 'editorial', name: 'Editorial', who: 'Spotify / Apple staff',
    worth: 'Enormous, and almost entirely out of your hands.',
    how: 'The pitch form, once, before release. There is no second route and no email address that works.',
    note: 'An editorial add is the only thing that changes an artist\'s trajectory overnight. It is also close to a lottery for a first single — pitch properly and then forget about it.',
  },
  {
    key: 'algorithmic', name: 'Algorithmic', who: 'Discover Weekly, Release Radar, Radio, autoplay',
    worth: 'The one that compounds. Slow, then sudden.',
    how: 'Not pitchable. Driven by saves, completion rate and how few people skip in the first 30 seconds.',
    note: 'Release Radar is automatic for your followers and for anyone who pre-saved. Discover Weekly needs the song to survive its first few hundred plays without being skipped — which is a mixing and sequencing problem, not a marketing one.',
  },
  {
    key: 'user', name: 'Independent curators', who: 'Real people with real playlists',
    worth: 'Modest each, meaningful in aggregate, and the only kind you can go and get.',
    how: 'Find them through "Discovered on" for your comparison artists, playlist directories, Reddit and Instagram. Message a human, not a form.',
    note: 'This is the tier where your effort actually moves the number. Fifty polite, specific messages is a real week of work and a real result.',
  },
  {
    key: 'friend', name: 'Friends & yours', who: 'People you know, and your own',
    worth: 'Small numerically, useful for the early signal.',
    how: 'Ask directly. Make your own and keep it updated — it is a profile surface.',
    note: 'Do not pad these to inflate a number. The ratio that matters is saves per listener, and padding wrecks it.',
  },
];

export const STATUSES = [
  ['found', 'Found'], ['pitched', 'Pitched'], ['added', 'Added'],
  ['dropped', 'Dropped'], ['declined', 'Declined'], ['ignored', 'No reply'],
];

export const STATUS_TAG = {
  found: '', pitched: 'warn', added: 'ok', dropped: '', declined: '', ignored: '',
};

/* Where to look, in the order that works. */
export const FIND_ROUTES = [
  'Spotify for Artists → Music → the track → "Discovered on". Every playlist that already brought you a listener, which is the warmest list you will ever have.',
  'Open a comparison artist\'s page → any song → "Discovered on". Those curators already like this sound.',
  'Playlist directories — SubmitHub, Groover, Playlist Push. Paid per submission; treat as a cost per listen, not a shortcut.',
  'Reddit: r/playlists, r/indieheads and the genre subreddits. Free, human, and unusually responsive.',
  'Instagram: curator accounts almost always list a submission email in the bio.',
  'The playlist itself: most independent curators put a contact in the playlist description.',
];

export const SCAM_SIGNS = [
  'Guaranteed placements, guaranteed stream counts, or a price per thousand streams. Real curators cannot guarantee anything.',
  'A follower count far out of proportion to the monthly listener count on the tracks inside it.',
  'Hundreds of tracks, all added the same week, by artists with nothing in common.',
  'Payment for placement. It breaches Spotify\'s terms, it is detectable in the listener-to-save ratio, and a takedown costs far more than the placement was worth.',
  'The tell that matters: look at the playlist\'s own listeners per track. Bot playlists have huge follower counts and almost no real engagement.',
];

export const HEALTH_NOTE =
  'The number that decides whether a placement helps you is not the follower count — it is what fraction of those listeners save the song. ' +
  'A 500-follower playlist of people who actually listen beats a 50,000-follower one that nobody opens, because Spotify reads saves and skips, not placements.';
