/* ============================================================
   meta.js — the metadata master sheet

   Every distributor, PRO, sync library, radio submission and
   playlist pitch asks for the same twenty-odd facts in a slightly
   different order and with slightly different names for them.
   Getting one of them wrong is worse than it sounds: distributors
   freeze most fields once a release is delivered, so a typo in a
   title or a missing composer name is not a five-minute fix, it
   is a takedown and a redelivery with a new date.

   So: one canonical record, typed once, copied everywhere.
   ============================================================ */

/* field: key, label, hint, kind, group, required, placeholder */
const f = (key, label, hint, opts = {}) => ({ key, label, hint, ...opts });

export const META_GROUPS = [
  {
    key: 'core', label: 'The record itself',
    blurb: 'These are the fields a distributor freezes. Check the spelling twice before you deliver, because after delivery a change means a takedown and a new release date.',
    fields: [
      f('title', 'Track title', 'Exactly as it should appear, including capitalisation. Most DSPs style-guide to Title Case; write it the way you want it and do not put "(Official)" or "(Original Mix)" in it.', { required: true }),
      f('titleVersion', 'Version / subtitle', 'Only if there is one — "Acoustic", "Radio Edit", "feat. X". Goes in the version field, never inside the title.'),
      f('artistName', 'Primary artist', 'The exact string that becomes your artist page. Once a release is live under a spelling, everything else has to match it forever.', { required: true }),
      f('featuring', 'Featured artists', 'Separate people. Do not append "feat. X" to the primary artist name — that creates a second artist page with a nonsense name.'),
      f('releaseTitle', 'Release title', 'For a single this is usually the track title. For an EP or album it is the project name.'),
      f('releaseType', 'Release type', 'Single, EP, Album. A single is 1-3 tracks under 30 minutes on most DSPs.', { kind: 'select', options: ['Single', 'EP', 'Album', 'Compilation'] }),
      f('primaryGenre', 'Primary genre', 'Pick the one where your actual listeners are, not the one that flatters you. This drives algorithmic placement more than anything else you control.', { required: true }),
      f('secondaryGenre', 'Secondary genre', ''),
      f('language', 'Language of the lyrics', 'If instrumental, say Instrumental.'),
      f('explicit', 'Explicit content', 'Getting this wrong gets you pulled from editorial consideration. "Clean" means a version with the explicit content removed, not a track that never had any — that is "Not explicit".', { kind: 'select', options: ['Not explicit', 'Explicit', 'Clean (edited version)'] }),
      f('releaseDateISO', 'Release date', 'Friday is the global standard. DSPs need 7-28 days lead time; editorial pitching needs at least 7 clear days before this date.', { kind: 'date' }),
      f('originalReleaseDate', 'Original release date', 'Only if this is a re-release. Leave blank otherwise — filling it in can make a new track show as a back catalogue item.', { kind: 'date' }),
      f('previouslyReleased', 'Previously released?', '', { kind: 'select', options: ['No', 'Yes'] }),
    ],
  },
  {
    key: 'codes', label: 'Codes',
    blurb: 'The ISRC identifies the recording, the ISWC identifies the composition, and the UPC identifies the product you are selling. They are not interchangeable and every one of them is asked for somewhere.',
    fields: [
      f('isrc', 'ISRC', 'Twelve characters, format CC-XXX-YY-NNNNN. Your distributor issues one automatically. Never reuse an ISRC for a different recording, including a remaster — a new recording is a new ISRC.', { mono: true }),
      f('upc', 'UPC / EAN', 'Thirteen digits, issued by the distributor. Identifies the release, not the track. You need it for radio submissions and for claiming your release on some platforms.', { mono: true }),
      f('iswc', 'ISWC', 'Format T-NNNNNNNNN-C. Issued by your PRO once the work is registered, usually weeks after you file. Blank is normal early on.', { mono: true }),
      f('bowi', 'Recording location / studio', ''),
      f('catalogNo', 'Catalogue number', 'Your own reference, e.g. SID001. Optional, but useful once there is more than one release.', { mono: true }),
    ],
  },
  {
    key: 'credits', label: 'Credits and legal names',
    blurb: 'PROs and the MLC match on legal names, not stage names. If you register as "Si" but your PRO has "Sidhartha Tammana", the royalties sit unmatched in a black box. Write the legal name here and use it on every registration.',
    fields: [
      f('composers', 'Composer(s) — legal names', 'Whoever wrote the music. Full legal names, comma separated, exactly as registered with the PRO.', { required: true }),
      f('lyricists', 'Lyricist(s) — legal names', 'Whoever wrote the words. Often the same people; still list them.'),
      f('producers', 'Producer(s)', ''),
      f('mixEngineer', 'Mix engineer', ''),
      f('masterEngineer', 'Mastering engineer', ''),
      f('performers', 'Featured performers and instruments', 'Session musicians, who played what. DSPs increasingly surface these, and it is the only credit a session player gets.', { multiline: true }),
      f('publisher', 'Publisher / admin', 'Songtrust, a publisher, or self-published. If self-published you still need a publisher name for registration — usually your name plus "Publishing".'),
      f('pro', 'PRO', 'The society collecting performance royalties for you.'),
      f('proIpi', 'Your IPI / CAE number', 'The number your PRO uses to identify you. Every co-writer has their own; you need all of them for a split registration.', { mono: true }),
      f('pLine', 'P-line', 'The sound recording copyright. Format: (P) 2026 Owner Name. Owner is whoever paid for the master — usually you.', { placeholder: '(P) 2026 Your Name' }),
      f('cLine', 'C-line', 'The composition copyright. Format: (C) 2026 Owner Name. Often the same, but it does not have to be.', { placeholder: '(C) 2026 Your Name' }),
    ],
  },
  {
    key: 'assets', label: 'Artwork and audio',
    blurb: 'The rejections here are mechanical and completely avoidable. Every one of these rules has bounced somebody\'s release by a week.',
    fields: [
      f('artworkSpec', 'Artwork', '3000x3000 px minimum, RGB, JPG or PNG, under 10 MB, perfectly square. No URLs, no social handles, no "out now", no logos that are not yours. Text in the artwork must match the title and artist exactly.', { multiline: true }),
      f('audioSpec', 'Master file', 'WAV or FLAC, 16-bit/44.1 kHz minimum, 24-bit preferred. No dither issues, no clipping, at least 0.5 s of clean silence at the head and tail.', { multiline: true }),
      f('loudness', 'Loudness target', 'Around -14 LUFS integrated with true peak at -1 dBTP is the safe streaming target. Louder does not get you louder on Spotify, it just gets you turned down with less headroom.'),
      f('artworkCredit', 'Artwork credit', 'Who made it, and do you have it in writing? A cover you cannot prove you licensed is the most common takedown after unlicensed samples.'),
      f('mixNotes', 'Mix and master notes', '', { multiline: true }),
    ],
  },
  {
    key: 'distribution', label: 'Distribution and territories',
    fields: [
      f('distributor', 'Distributor', ''),
      f('territories', 'Territories', 'Worldwide unless you have a reason. A territory carve-out matters if you have signed a regional deal.', { placeholder: 'Worldwide' }),
      f('priceTier', 'Price tier', 'Usually Back / Mid / Front. Irrelevant for streaming, relevant for downloads.'),
      f('dspsExcluded', 'Platforms to exclude', 'Blank means everywhere. Excluding a platform is almost always a mistake at this stage.'),
      f('preSaveUrl', 'Pre-save / smart link', '', { mono: true }),
      f('spotifyUri', 'Spotify URI', 'Fill this in the moment the track is live.', { mono: true }),
      f('appleUrl', 'Apple Music URL', '', { mono: true }),
      f('youtubeUrl', 'YouTube / OAC URL', '', { mono: true }),
    ],
  },
  {
    key: 'pitch', label: 'The one-line facts',
    blurb: 'The things you retype into every pitch form and every DM. Write them once, well.',
    fields: [
      f('oneLiner', 'One line about the track', 'Under 20 words. What it is, not how it makes you feel.', { multiline: true }),
      f('moodTags', 'Mood and instrumentation', 'Three moods, three instruments. This is literally what Spotify\'s pitch form asks for.'),
      f('comparisons', 'Sounds like', 'Three artists a stranger would recognise. Not aspirational — actually similar.'),
      f('recordedAt', 'Recorded where and when', ''),
      f('story', 'The story behind it', 'Two or three sentences a journalist could quote without rewriting.', { multiline: true }),
    ],
  },
];

export const META_INFO = [
{ title: 'Why this tab exists', body: `
You will type these facts somewhere between fifteen and forty times: the distributor's delivery form, your PRO registration, the MLC, the publisher, the ISRC request, the Spotify for Artists pitch, every playlist submission, every radio station, the press kit, the YouTube description, the sync library, the copyright filing.

Typing them from memory each time is how you end up with three different spellings of your own name in three different databases, which is how royalties end up unmatched.

## The rule that costs the most to break

**Distributors freeze metadata on delivery.** Once a release is delivered to DSPs, most fields — title, artist name, ISRC, release date — cannot be edited. Fixing a typo means taking the release down and delivering it again with a new date, which resets every playlist add, every stream count on that URL, and your release-day momentum.

So the checklist before you hit deliver is short and worth doing slowly:

1. Read the title out loud against the field. Capitalisation included.
2. Read the artist name out loud. This is the string that becomes your artist page forever.
3. Confirm the featured artists are in the *featured* field and not glued onto the primary artist name.
4. Confirm explicit is set correctly.
5. Confirm the composer and lyricist names match your PRO registration **exactly**, legal names, not stage names.
` },
{ title: 'Splits, and why to settle them now', body: `
A split sheet says who owns what percentage of the **composition** — the song as written — and separately who owns the **master**, the specific recording.

These are two different things and two different revenue streams. You can own 100% of the master and 50% of the composition. Streaming pays both, through different pipes: the master share comes through your distributor, the composition share through your PRO and the MLC.

## Do it before the record does anything

Every argument about splits is easy while the song is worth nothing and hard once it is worth something. The conversation takes ten minutes now.

**Contribution is not the same as ownership.** An engineer who recorded it is usually not a writer. Someone who suggested a chord change usually is, if you use the change. The test that holds up is: did they contribute to the melody, the lyrics, or the harmonic structure? Arrangement and production alone are, legally, usually not composition — but they can be, and they are frequently negotiated as a share anyway.

**Write it down and have everyone confirm it.** An email chain where each writer replies "agreed" to a stated split is far better than nothing. Sid's split table exports as a plain document you can send.

## Registration goes in three places

1. **Your PRO** (BMI, ASCAP, PRS, IPRS) — collects performance royalties. Each writer registers their own share with their own society.
2. **The MLC** (US mechanical royalties) — this is where unmatched money piles up. Register even if you are not American; the US is the largest streaming market and unclaimed mechanicals sit there indefinitely.
3. **Your publisher or admin** (Songtrust or similar) — collects the international mechanical and performance shares your PRO does not reach.

Percentages must total exactly 100 in each column, or the registration is rejected.
` },
{ title: 'The codes, plainly', body: `
| Code | Identifies | Who issues it | Reused? |
|---|---|---|---|
| **ISRC** | One specific recording | Your distributor, or a national agency | Never. A remaster is a new recording and needs a new one |
| **ISWC** | One composition, however many times recorded | Your PRO, after registration | The same for every recording of that song |
| **UPC / EAN** | One product — the single, the EP | Your distributor | Never |
| **IPI / CAE** | One person or publisher | Your PRO | Yours for life, across every song |

The distinction that trips people up: if you record an acoustic version of your own song, it gets a **new ISRC** but keeps the **same ISWC**. If you release it as its own single, it gets a **new UPC** too.

Do not invent codes and do not copy someone else's. An invalid ISRC either bounces the delivery or, worse, attributes your streams to a different recording.
` },
{ title: 'What to fill in and when', body: `
| When | What you can fill in |
|---|---|
| As soon as the mix exists | Title, artist, genre, language, explicit, credits, splits, P and C lines |
| At distributor signup | Distributor, territories, catalogue number |
| On delivery | ISRC, UPC, release date |
| Days after PRO registration | ISWC, IPI |
| Release day | Spotify URI, Apple URL, YouTube URL |

Anything still blank in the first row a week before delivery is a problem. Anything blank in the last row a week after release means your links are not pointing anywhere.
` }];
