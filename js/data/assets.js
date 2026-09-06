/* ============================================================
   assets.js — the asset inventory (Category H)
   One shoot day should yield 60+ discrete pieces. This is the
   count, the spec, and when each is needed by.
   ============================================================ */

export const ASSET_CATEGORIES = [
  { key: 'video',  label: 'Video',              note: 'The long-form cuts. Lock the 16:9 first, reframe second.' },
  { key: 'short',  label: 'Short-form clips',   note: 'The engine of the whole campaign. Hook audible in the first 2 seconds, burned-in captions, every clip goes to Reels + TikTok + Shorts the same day.' },
  { key: 'still',  label: 'Stills & graphics',  note: 'Shot on the day by a second phone or a photographer. You cannot go back for these.' },
  { key: 'audio',  label: 'Audio deliverables', note: 'Export every version once, archive them, and never be the reason a sync request dies.' },
  { key: 'doc',    label: 'Documents',          note: 'The paperwork a curator, programmer or distributor asks for.' },
];

/* target = how many the plan calls for */
export const ASSETS_SEED = [
  /* ---- video ---- */
  { id: 'a-video-main', cat: 'video', name: 'Official video, 16:9', target: 1, needBy: 'T-35',
    spec: 'Locked edit. This is the master everything else is cut from.' },
  { id: 'a-video-vert', cat: 'video', name: 'Vertical cut of the full video', target: 1, needBy: 'T-33',
    spec: '9:16 reframe of the locked edit.' },
  { id: 'a-video-lyric', cat: 'video', name: 'Lyric video', target: 1, needBy: 'T+12',
    spec: 'Releases at T+14 — the second content spike.' },
  { id: 'a-video-live', cat: 'video', name: 'Live / acoustic video', target: 1, needBy: 'T+40',
    spec: 'Releases around T+42 — the third spike.' },
  { id: 'a-video-vis', cat: 'video', name: 'Visualizer / audio-only', target: 1, needBy: 'T-7',
    spec: 'The backup if the video slips. Cheap insurance.' },

  /* ---- short-form ---- */
  { id: 'a-hook', cat: 'short', name: 'Hook clips, 9:16, 7–15s', target: 12, needBy: 'T-30',
    spec: 'Different angles and distances of the hook. This is what travels — not the verse.' },
  { id: 'a-verse', cat: 'short', name: 'Verse / bridge clips, 9:16', target: 7, needBy: 'T-25',
    spec: 'Other sections of the song.' },
  { id: 'a-broll', cat: 'short', name: 'Silent b-roll loops', target: 15, needBy: 'T-30',
    spec: '3–8 seconds each. Hands, the room, the walk, the light, the object the song is about.' },
  { id: 'a-canvas', cat: 'short', name: 'Spotify Canvas candidates', target: 3, needBy: 'T-3',
    spec: '9:16 · 3–8s · MP4 · 720×1280 min · silent · seamless loop · no text, no logos.' },
  { id: 'a-bts', cat: 'short', name: 'BTS clips, 9:16', target: 18, needBy: 'T-30',
    spec: 'Phone footage is fine. Set-up, mistakes, laughing, the crew, the food, the tenth take.' },
  { id: 'a-talk', cat: 'short', name: 'Talking-head clips', target: 5, needBy: 'T-30',
    spec: '20 seconds each: what we are shooting · the hardest shot · what the song is about · take 14 · why this one.' },
  { id: 'a-caption', cat: 'short', name: 'Clips captioned (burned-in)', target: 40, needBy: 'T-33',
    spec: 'Not auto-captions. ~80% of short-form is watched muted, and a muted music clip with no captions is a wasted post.' },

  /* ---- stills & graphics ---- */
  { id: 'a-stills', cat: 'still', name: 'Edited stills from the shoot', target: 25, needBy: 'T-30',
    spec: 'Cover alternates, promo photos, EPK images, ad creative, story posts.' },
  { id: 'a-cover', cat: 'still', name: 'Cover art, 3000×3000', target: 1, needBy: 'T-30',
    spec: 'RGB, JPG or PNG, no logos, no URLs, readable at 60px.' },
  { id: 'a-cover-alt', cat: 'still', name: 'Cover art alternates', target: 3, needBy: 'T-30',
    spec: 'The rejected options — they make a good post on their own.' },
  { id: 'a-press', cat: 'still', name: 'Press photos, high-res', target: 5, needBy: 'T-35',
    spec: 'For the EPK. Downloadable, free to use with credit.' },
  { id: 'a-story', cat: 'still', name: 'Story graphics, 1080×1920', target: 10, needBy: 'T-30',
    spec: 'Countdown, out now, quote card, poll, question box, link sticker frames.' },
  { id: 'a-lyric-card', cat: 'still', name: 'Lyric cards', target: 8, needBy: 'T-25',
    spec: 'One line each. Long half-life on Pinterest and Threads.' },
  { id: 'a-banner', cat: 'still', name: 'Platform banners & profile images', target: 6, needBy: 'T-55',
    spec: 'Spotify header 2660×1140 · YouTube 2560×1440 (safe 1546×423) · X 1500×500 · FB cover 820×312 · avatars 1000×1000.' },
  { id: 'a-highlight', cat: 'still', name: 'Instagram highlight covers', target: 6, needBy: 'T-50',
    spec: 'music · single · studio · live · me · press.' },

  /* ---- audio ---- */
  { id: 'a-master', cat: 'audio', name: 'Master WAV, 24-bit', target: 1, needBy: 'T-35',
    spec: '-14 LUFS integrated, -1 dBTP. One master for every platform — they all normalise down from there.' },
  { id: 'a-mp3', cat: 'audio', name: 'MP3 320', target: 1, needBy: 'T-35',
    spec: 'For emails and press downloads.' },
  { id: 'a-inst', cat: 'audio', name: 'Instrumental', target: 1, needBy: 'T-35',
    spec: 'Sync requests die when you cannot deliver this within 24 hours.' },
  { id: 'a-clean', cat: 'audio', name: 'Radio / clean edit', target: 1, needBy: 'T-32',
    spec: 'Under 3:40, no explicit content, tight intro. Radio hates a 25-second build.' },
  { id: 'a-acap', cat: 'audio', name: 'A cappella', target: 1, needBy: 'T-35', spec: 'For remixes and sync.' },
  { id: 'a-stems', cat: 'audio', name: 'Stems', target: 1, needBy: 'T-35',
    spec: 'Archived, not delivered. The thing you will wish you had in two years.' },

  /* ---- documents ---- */
  { id: 'a-split', cat: 'doc', name: 'Split sheet, signed', target: 1, needBy: 'T-90',
    spec: 'Every contributor, legal names, PAN/SSN, PRO, role, %. Must total 100%. Blocks everything.' },
  { id: 'a-onesheet', cat: 'doc', name: 'Radio one-sheet', target: 1, needBy: 'T-32',
    spec: 'One page. Lives in the Copy bank.' },
  { id: 'a-epk', cat: 'doc', name: 'EPK page, published', target: 1, needBy: 'T-35',
    spec: 'Built and exported from the Press kit tab.' },
  { id: 'a-meta', cat: 'doc', name: 'Metadata master sheet', target: 1, needBy: 'T-28',
    spec: 'Artist name, title, version tags, genre, ISRC, UPC, label, publisher — entered identically everywhere, forever.' },
  { id: 'a-releases', cat: 'doc', name: 'Signed releases from everyone on camera', target: 1, needBy: 'T-45',
    spec: 'On the day. Chasing them later is misery.' },
  { id: 'a-locperm', cat: 'doc', name: 'Location permissions, written', target: 1, needBy: 'T-45',
    spec: 'Per location, before you shoot there.' },
  { id: 'a-lyrics', cat: 'doc', name: 'Lyrics, typed and proofed', target: 1, needBy: 'T-28',
    spec: 'For Genius, YouTube descriptions and time-synced lyrics.' },
];

export const ASSETS_INFO = [
{ title: 'Why the count matters', body: `
## 60+ pieces from one shoot day
At 5 posts a week across platforms, 60 assets covers **T-30 → T+120** with room to improvise. That is the whole point of the plan's "zero energy, zero brain" posting: everything is made and banked *before* release, so the campaign runs on a bank rather than on your willpower.

If the shoot yields 20 pieces instead of 60, you will be making content while also trying to promote — which is the failure mode the whole plan exists to avoid.

## Count it on the day, not after
The one thing you cannot fix later is a shot you did not take. Tick these off **at the shoot**, on your phone, while the camera is still set up. A gap you find at T-30 is a re-shoot; a gap you find on the day is ten more minutes.
` },
{ title: 'The order of operations', body: `
1. **Lock the 16:9 official video.** Do not start cutting clips before this is final — every clip you cut from an unlocked edit is a clip you cut twice.
2. **Reframe to 9:16.**
3. **Batch-cut everything in one session.** Sit down once and export all the short clips together. Name them \`S01_hook_wide.mp4\`, \`B01_bts_setup.mp4\`.
4. **Caption every vertical clip.** Burned in.
5. **File them** in \`/03 Video/CLIPS/\` and link the folder in the Where column here.

## The rule for every clip
The hook must be **audible in the first 2 seconds**. No build-ups. No "wait for it". The first frame is the whole game.
` }];
