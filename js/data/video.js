/* ============================================================
   video.js (data) — shoot-day capture list and reference
   ============================================================ */

export const CAPTURE_LIST = [
  'Vertical-safe framing on every performance shot — or shoot key takes twice, once wide 16:9 and once native vertical',
  'A full performance take, front-on, close, uninterrupted — this single asset generates 15+ pieces of content',
  'The hook performed 6+ times — different angles, distances, energy. The hook clip is what travels, not the verse',
  'Silent b-roll: hands, the room, the walk, the light, the object the song is about — 20+ clips of 3–8 seconds',
  'BTS footage shot by someone else, all day. Phone footage is fine. Set-up, mistakes, laughing, the crew, the food, the tenth take',
  'Five talking-to-camera clips, 20 seconds each: "we\'re shooting the video for X" · "here\'s the hardest shot" · "what this song is about" · "this is take 14"',
  'Stills — a photographer or a second phone capturing frames all day. Cover art alternates, promo photos, EPK images, ad creative, 30 story posts',
  'Three Spotify Canvas candidates: 3–8s, silent, seamless loop, no text or faces that look like an ad',
  'Signed releases from every person on camera',
  'Written location permission for every location',
  'Back up everything twice before anyone leaves',
];

export const VIDEO_INFO = [
{ title: 'What the shoot must yield', body: `
## The content bank
| Asset | Count | Source |
|---|---|---|
| Official video, 16:9 | 1 | Final edit |
| Vertical cut of the full video | 1 | Reframed edit |
| Hook clips, 9:16, 7–15s | **10–12** | Different angles of the hook |
| Verse / bridge clips, 9:16 | 6–8 | Other sections |
| Silent b-roll loops | 15+ | Shoot-day b-roll |
| Spotify Canvas candidates | 3 | B-roll |
| BTS clips, 9:16 | **15–20** | Phone footage |
| Talking-head clips | 5 | Shoot day |
| Lyric video / visualizer | 1 | Post-production |
| Still photos, edited | 25+ | Photographer |
| Story graphics 1080×1920 | 10 | Design from stills |
| Lyric cards | 8 | Design |

**Target: 60+ discrete pieces from one shoot day.**
` },
{ title: 'Editing workflow', body: `
1. Edit the **16:9 official video first. Lock it.**
2. Reframe to **9:16** second.
3. Then batch-cut: sit down for one session and export **all** the short clips at once.
4. Name them \`S01_hook_wide.mp4\`, \`S02_hook_close.mp4\`, \`B01_bts_setup.mp4\`. Put them in \`/03 Video/CLIPS/\`.
5. **Caption every vertical clip** — burned-in, not auto-captions.
6. Every clip must have **the hook audible within the first 2 seconds**. No build-ups. No "wait for it." The first frame is the whole game.

## Release sequencing
- **Official video at T** — scheduled premiere, be in the live chat
- **Lyric video at T+14** — second content spike, second algorithmic push
- **Live / acoustic at ~T+42** — third spike
` },
{ title: 'The risks worth planning for', body: `
**Data loss.** The only irreversible risk in the whole campaign. Two physical copies before anyone leaves, and start an upload before you go home.

**Releases and permissions.** Get them on the day. A person who was happy to be filmed is much harder to reach three weeks later, and a location that let you in once may not answer the phone again.

**Daylight.** Decide *now* which shots get cut first if you run out. Write it in the backup plan. Making that decision at 5pm with everyone tired is how the hook take gets rushed.

**The hook take.** If you get nothing else, get the full front-on performance take of the hook, cleanly, several times. Everything else can be re-shot on a phone. That cannot.
` }];
