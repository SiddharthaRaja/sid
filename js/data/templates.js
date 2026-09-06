/* ============================================================
   templates.js — every piece of written copy from the master
   release plan, ready to drop into a draft.

   Placeholders are filled from Settings automatically:
     [ARTIST] [SONG] [LINK] [CITY] [GENRE] [HANDLE] [EMAIL]
     [DATE]   — the release date, written out
     [LABEL] [ISRC] [UPC] [COMPS]
   Anything still in brackets after filling is yours to write.
   ============================================================ */

/* ---------------------------------------------------------- */
/*  per-platform post templates                                */
/*  type = the content-type key it drops into                   */
/* ---------------------------------------------------------- */

export const TEMPLATES = {

instagram: [
  { label: 'Announcement post', type: 'caption', when: 'T-30', body:
`"[SONG]" — out [DATE].

I wrote this [when/where] and I've been sitting on it for [X] months trying to decide if it was finished. It isn't, really. Nothing is. But it's the truest thing I've made and I'd rather you hear it than keep it.

Wrote it, produced it, mixed it. Shot the video with three people who had no reason to say yes.

Pre-save is in my bio. It genuinely helps more than it should.

[DATE]. 🖤` },

  { label: 'Release day post', type: 'caption', when: 'T', body:
`"[SONG]" is out.

Everywhere. Right now. [LINK] in bio.

I wrote this in [place] in [month]. I produced it, mixed it, and second-guessed every single decision. Three friends helped me shoot a video for it and asked for nothing.

If it means anything to you: play it all the way through, save it, put it on a playlist. That's what actually moves this.

Thank you for being here. This is the first one. 🖤` },

  { label: 'One week post', type: 'caption', when: 'T-7', body:
`one week. "[SONG]" out [DATE].

I've done everything I know how to do. the rest is up to whoever presses play.` },

  { label: 'Week one wrap', type: 'caption', when: 'T+6', body:
`week one: [X] streams, [Y] saves, [Z] playlists.

every single one of those is a person. thank you.

week two starts monday and I'm not slowing down.` },

  { label: 'One month post', type: 'caption', when: 'T+28', body:
`one month since "[SONG]" came out.

[X] streams. [Y] saves. [Z] countries. [N] playlists I didn't ask to be on.

I'm not going to pretend those are big numbers. They're not. But every one of them is a person who chose to press play on something a stranger made, and a month ago that number was zero.

Next one's already being written. 🖤

[LINK]` },

  { label: 'Announcement story sequence (8 frames)', type: 'story', when: 'T-30', body:
`1. Black screen, text: "today's the day I tell you"
2. Cover art reveal
3. The date, big
4. 10-second hook clip
5. "this is the part where I ask for something" + link sticker
6. Question box: "ask me anything about it"
7. Repost of anyone who shared
8. "thank you. genuinely."

Post all eight within two hours.` },

  { label: 'T-1 story sequence (10 frames)', type: 'story', when: 'T-1', body:
`1. "24 hours"
2. Hook clip
3. "here's how to help tomorrow: 1. play it all the way through 2. save it 3. add it to a playlist"
4. Cover art
5. Link sticker
6. Question box: "what time are you listening?"
7. BTS frame
8. "see you tomorrow"
9. Countdown sticker
10. Black frame with the date` },

  { label: 'Release day story sequence (12+ frames)', type: 'story', when: 'T', body:
`1. "IT'S OUT"
2. Link sticker
3. The 3-step ask: play it through · save it · add to a playlist
4. Your own Spotify screen playing it
5–9. Repost EVERY single person who shares — highest-ROI activity of the day
10. "still going. thank you"
11. The video
12. "[X] streams already" (skip if the number isn't good)
13. Thank-you frame naming people
14. "see you tomorrow, there's more"` },

  { label: 'Hook clip — the chorus', type: 'reel', when: 'T-27', body: `the chorus. [DATE]. 🖤` },
  { label: 'BTS — setting up a shot', type: 'reel', when: 'T-25', body: `we spent 40 minutes on a shot that's in the video for 2 seconds` },
  { label: 'Lyric card — one line', type: 'reel', when: 'T-23', body: `this line took me three weeks` },
  { label: 'Talking head — what it\'s about', type: 'reel', when: 'T-21', body:
`people keep asking what "[SONG]" is about. it's about [honest answer]. that's it. that's the whole song.` },
  { label: 'Mixing screen recording', type: 'reel', when: 'T-19', body: `what 200 hours of mixing looks like` },
  { label: 'Blooper from shoot day', type: 'reel', when: 'T-17', body: `take 14. we did 22.` },
  { label: 'Influences — 3 songs', type: 'reel', when: 'T-9', body:
`if you like these three songs you'll probably like mine. that's the whole pitch.` },
  { label: 'Cover art alternates', type: 'reel', when: 'T-8', body: `these were the other options. tell me I picked right.` },
  { label: 'Reaction clip — someone hearing it', type: 'reel', when: 'T-6', body:
`showed it to [name] for the first time. this was the reaction.` },
  { label: 'Instrumental snippet', type: 'reel', when: 'T-5', body: `no vocals. just the bed the song sits on.` },
  { label: 'Vulnerable post — 3 days', type: 'reel', when: 'T-3', body:
`three days. I keep thinking about the version of me two years ago who couldn't finish anything. this one's for him.` },
  { label: 'Tomorrow post', type: 'reel', when: 'T-1', body: `tomorrow. [time] [timezone]. set an alarm, I'm not joking.` },
  { label: 'Production breakdown', type: 'reel', when: 'T+16', body:
`how I made [element of the song]. these over-perform massively — show the actual screen.` },
  { label: 'Cover of a comparison artist', type: 'reel', when: 'T+21', body:
`A cover of a song by one of [COMPS], in your style. Covers are the cheapest discovery mechanism that exists.` },
  { label: 'The retrospective', type: 'reel', when: 'T+90', body:
`4 months ago I released my first song. here's everything I learned.

Your most shareable post of the whole cycle — and it seeds the next release.` },
  { label: 'Broadcast channel — first message', type: 'broadcast', when: 'T-30', body:
`you're in the room where I say things first.

"[SONG]" is out [DATE]. you knew before the feed did.

I'll use this for: unreleased snippets, the real numbers, and asking you things. no spam, no reposting the grid.` },
],

youtube: [
  { label: 'Official video description', type: 'video', when: 'T', body:
`[ARTIST] — "[SONG]" (Official Video)

Stream / save: [LINK]

Written, produced and mixed by [ARTIST]
Directed by [name] · DoP [name] · Edit [name]
Shot in [CITY]

LYRICS
[paste full lyrics — this is what makes the video searchable]

Follow
Instagram: [HANDLE]
TikTok: [HANDLE]
Spotify: [LINK]
Contact: [EMAIL]

#[genre] #newmusic #[CITY]` },

  { label: 'Lyric video description', type: 'video', when: 'T+14', body:
`[ARTIST] — "[SONG]" (Official Lyric Video)

Stream: [LINK]

[full lyrics]

The official video is here: [url]` },

  { label: 'Channel About section', type: 'community', when: 'T-55', body:
`[ARTIST] is a [GENRE] artist and songwriter from [CITY], India.

Writing, producing and releasing independently, [ARTIST] makes [one-sentence description of the sound].

The debut single "[SONG]" is out now on all platforms.

New music, videos and behind-the-scenes every week.

Listen: [LINK]
Instagram: [HANDLE]
Contact: [EMAIL]` },
],

tiktok: [
  { label: 'Announcement', type: 'video', when: 'T-30', body:
`my first song ever. out [DATE]. i'm terrified 🙂 #newmusic #indieartist #originalsong #singersongwriter` },
  { label: 'Release day', type: 'video', when: 'T', body:
`it's out. my first song ever. "[SONG]" everywhere now 🖤 #newmusic #outnow #indieartist #originalmusic #singersongwriter` },
  { label: 'Sound-check reminder', type: 'sound', when: 'T+1', body:
`Search "[ARTIST] [SONG]" in the TikTok sound library. Confirm:
· the sound exists
· it is attributed to your artist profile, not "unknown artist"
· it appears in the Commercial Music Library

If any of these is wrong, chase your distributor today. A missing sound in week one costs you the whole release window.` },
],

ytshorts: [
  { label: 'Shorts title formula', type: 'short', when: '', body:
`[the lyric line from the hook] — [SONG], out [DATE]

Shorts titles are searchable in a way Reel captions are not. Put the actual lyric in.` },
],

facebook: [
  { label: 'Page announcement', type: 'post', when: 'T-30', body:
`My first single "[SONG]" is out [DATE].

Written, produced and mixed at home in [CITY]. The video was shot with three friends and no budget.

Pre-save: [LINK]` },
],

x: [
  { label: 'Announcement', type: 'tweet', when: 'T-30', body:
`my first single "[SONG]" is out [DATE].

wrote it, produced it, mixed it in my room. shot the video with three friends and no budget.

pre-save: [LINK]` },
  { label: 'Release day thread', type: 'thread', when: 'T', body:
`1/ my first single "[SONG]" is out now. everywhere. [LINK]

2/ I wrote it in [month] in [place]. produced it and mixed it myself, in my room, on headphones, mostly at night.

3/ the video was shot in [X] hours by [names] who had no reason to say yes and said yes anyway.

4/ if you listen to one thing today I'd like it to be this. and if you like it — a save and a playlist add does more than a like ever could.

5/ that's it. that's the tweet. thank you 🖤 [LINK]` },
  { label: 'Countdown, unhinged', type: 'tweet', when: 'T-14', body:
`counting down to my own song coming out is a genuinely unhinged experience. two weeks of refreshing a page that says "scheduled"` },
  { label: 'What independent means', type: 'tweet', when: 'T-20', body:
`if you've ever wondered what independent means: I am the artist, the producer, the mixing engineer, the label, the marketing department, and the intern. the intern is doing the most work.` },
  { label: 'The networking question', type: 'tweet', when: 'T-18', body:
`serious question for anyone who's released music: what's the one thing you wish you'd done before your first single

(This is a networking post disguised as a question. Reply to everyone who answers — this is how you meet other artists.)` },
  { label: 'Shot the video', type: 'tweet', when: 'T-44', body:
`shot a music video with a budget of ₹0 and three friends who owe me nothing. best day of the year.` },
  { label: 'Asking for help', type: 'tweet', when: 'T-42', body:
`turns out the hardest part of a music video isn't the shooting, it's asking people for help` },
  { label: 'Week two, honest', type: 'tweet', when: 'T+8', body:
`week two of being an independent artist: the streams don't go up on their own. who knew.` },
  { label: 'First city outside India', type: 'tweet', when: 'T+30', body:
`made an English song in India and the first city outside India to stream it was [city]. that's a strange and lovely thing.` },
  { label: 'Streaming economy', type: 'tweet', when: '', body:
`the streaming economy in one line: 1,000 streams is roughly one coffee. do it anyway.` },
  { label: 'Starter pack', type: 'tweet', when: '', body:
`independent artist starter pack: a laptop, one microphone, a spreadsheet with 400 rows, and an unreasonable amount of hope` },
  { label: 'Collecting songs', type: 'tweet', when: '', body:
`what's a song you love that has under 100k streams? genuinely collecting.` },
],

threads: [
  { label: 'Announcement', type: 'post', when: 'T-30', body:
`ok it's real. "[SONG]" out [DATE]. I've rewritten this caption nine times so I'm just going to post it.` },
  { label: 'Release day', type: 'post', when: 'T', body:
`it's out. [LINK]. that's all I have the words for today.` },
  { label: 'Writing a song', type: 'post', when: '', body:
`writing a song is 4 hours of nothing and then 20 minutes where you can't type fast enough` },
  { label: 'Second verse', type: 'post', when: '', body:
`the second verse is where songs go to die` },
  { label: 'Journal — the frame', type: 'journal', when: 'T-90', body:
`The frame for all ~50 entries:

· You are the sole narrator. Mixed lengths — two lines to two hundred words.
· All of it is about one person, throughout. No invented characters.
· Some entries are lyric snippets on their own.
· This is explicitly NOT behind-the-scenes, NOT process, NOT making-of. That lives on Instagram.
· Threads is the interior version. Write the thing you would not say out loud.

Number them here so the sequence holds.` },
  { label: 'Journal entry — blank', type: 'journal', when: '', body: `` },
  { label: 'Things nobody tells you', type: 'post', when: 'T+10', body:
`things nobody tells you about releasing your first song, a thread I will now write badly:` },
],

bluesky: [
  { label: 'Announcement', type: 'post', when: 'T-30', body:
`my first single "[SONG]" is out [DATE]. wrote and produced it myself in [CITY]. pre-save: [LINK]` },
],

spotify: [
  { label: 'The 500-character editorial pitch', type: 'pitch', when: 'T-25', body:
`"[SONG]" is a [tempo/mood] [GENRE] track built around [the specific hook — what makes it distinct in the first 15 seconds]. Written, produced and mixed independently in [CITY].

For fans of [COMPS]. Sits naturally in [name 2–3 REAL Spotify editorial playlists].

Campaign: self-directed music video launching day one, 12-week short-form content series, paid social across India/US/UK/Canada/UAE, 40+ independent playlist submissions, college radio push. Pre-save live from [DATE].

First release from a new independent artist with an active [X]-follower audience.

— Count it before submitting. Name real playlists, real numbers, real spend. Tick every true promotion checkbox.` },

  { label: 'Artist Pick message — release day', type: 'artistpick', when: 'T', body:
`This is the first song I've ever released. If you're here, thank you — a save means more than you'd think.` },

  { label: 'Spotify bio', type: 'bio', when: 'T-55', body:
`[ARTIST] is a [GENRE] artist, songwriter and producer based in [CITY], India. Working almost entirely alone — writing, recording, and producing at home — they make [GENRE] that pulls from [influence 1], [influence 2] and [influence 3], and lands somewhere between the three. The songs tend to be quiet on the surface and less quiet underneath: close-mic'd vocals, layered harmony, and lyrics that say the thing out loud instead of gesturing at it.

"[SONG]", released [DATE], is the first of these to leave the room it was made in. [One or two sentences on what the song is about and why it exists — the specific, true story. This is the part people remember.]

If you're here from "[SONG]" — thank you, genuinely. The next one is already being written.

Follow to get it first: everything lands in your Release Radar the day it's out.

[HANDLE] everywhere.` },

  { label: 'Canvas brief', type: 'canvas', when: 'T-1', body:
`Three candidates, cut from the music video b-roll.

Specs: 9:16 · 3–8 seconds · MP4 · 720×1280 minimum · SILENT · seamless loop
Rules: no text, no logos, no faces that look like an ad.

A/B them. Tracks with a Canvas see materially higher save and share rates.` },

  { label: 'Playlist curator pitch email', type: 'playlistsub', when: 'T-21', body:
`Subject: [SONG] — [GENRE] from India, for [PLAYLIST NAME]

Hi [NAME],

I found [PLAYLIST NAME] through [how — a specific, true answer: "it came up under a [artist] track I was listening to"], and I've been going through it — the [specific track] placement is what made me write.

I'm [ARTIST], an independent [GENRE] artist from [CITY], India. My single "[SONG]" comes out [DATE]. It's [one sentence: what it sounds like], and it sits close to the [a specific artist ON their playlist] end of what you're already playing.

Track: [private link]

No pressure either way — if it's not right for the list, I'd still take any honest reaction to it.

Thanks for reading,
[ARTIST]
[LINK] · [HANDLE]

— One playlist per email. Name the playlist. Name a track on it. Never attach a file unless asked. Never say "check out my song." Never pay for guaranteed placement.` },
],

applemusic: [
  { label: 'Promo info for the distributor', type: 'pitch', when: 'T-28', body:
`Artist: [ARTIST] · Track: "[SONG]" · Release: [DATE]
Genre: [GENRE] · Language: [language]
For fans of: [COMPS]

Story: [Two sentences. The interesting version is the true one — written, produced and mixed alone in [CITY] while finishing a degree; video shot for almost nothing with three friends.]

Marketing plan: self-directed music video day one · 12-week short-form series · paid social across India + diaspora (US/UK/CA/UAE) · 40+ playlist submissions · college and internet radio.

Time-synced lyrics: delivered.
Territories of focus: India, United States, United Kingdom, Canada, United Arab Emirates.` },
],

amazonmusic: [
  { label: 'New Release Pitch', type: 'pitch', when: 'T-24', body:
`Genres: [3]
Moods: [3]
Similar artists: [COMPS]
Audience: India, United States, United Kingdom, Canada, United Arab Emirates

Marketing drivers: Self-directed music video releasing day one across YouTube and short-form. Paid social campaign across Meta and YouTube targeting India and the Indian diaspora in US/UK/CA/UAE. 40+ independent playlist submissions. College and internet radio campaign. 12-week post-release content series built from music video footage.` },
],

soundcloud: [
  { label: 'Private link note to a curator', type: 'track', when: 'T-21', body:
`Hi [NAME] — [ARTIST] here, independent [GENRE] artist from [CITY].

"[SONG]" is out [DATE]. Private stream, no download needed: [link]

If it's not for you, no hard feelings — and I'd take any honest reaction.

[LINK] · [HANDLE]` },
],

};

/* ---------------------------------------------------------- */
/*  the copy bank — bios, pitches, emails, messages            */
/*  These live in their own module, not in a platform tab.     */
/* ---------------------------------------------------------- */

export const COPY_BANK = [
{ group: 'Bios', note: 'Prepare these once, then paste them everywhere. Cut every instance of "passionate about music", "unique sound", "eclectic influences", "a journey" and "genre-bending" — replace each with a specific, checkable fact.', items: [

  { id: 'oneliner', label: 'One-liner', limit: 0, body:
`[GENRE] from [CITY]. New single "[SONG]" out now.

Alternate, more voice:
Writing songs about the things I should have said. "[SONG]" — out now.` },

  { id: 'ig-bio', label: 'Instagram bio', limit: 150, body:
`[ARTIST]
[GENRE] · [CITY]
new single "[SONG]" ↓
[LINK]

— Also set: Category = Musician/Band · Contact button = [EMAIL] · Professional/Creator account ON.` },

  { id: 'ig-bio-pre', label: 'Instagram bio — pre-release', limit: 150, body:
`[ARTIST] · [GENRE] from [CITY]
"[SONG]" — [DATE]. pre-save ↓
[LINK]` },

  { id: 'tiktok-bio', label: 'TikTok bio', limit: 80, body:
`[GENRE] from [CITY] 🇮🇳
"[SONG]" out now ↓` },

  { id: 'x-bio', label: 'X bio', limit: 160, body:
`[ARTIST] · [GENRE] artist from [CITY]. new single "[SONG]" out now → [LINK]` },

  { id: 'yt-about', label: 'YouTube About', limit: 1000, body:
`[ARTIST] is a [GENRE] artist and songwriter from [CITY], India.

Writing, producing and releasing independently, [ARTIST] makes [one-sentence description of the sound — e.g. "warm, guitar-led pop songs built around close harmony and a lyric that doesn't flinch"].

The debut single "[SONG]" is out now on all platforms.

New music, videos and behind-the-scenes every week.

Listen: [LINK]
Instagram: [HANDLE]
Contact: [EMAIL]` },

  { id: 'short-bio', label: 'Short bio — under 100 words', limit: 0, body:
`[ARTIST] is a [GENRE] artist and songwriter from [CITY], India, making music that sits somewhere between [comparison artist 1] and [comparison artist 2]. Self-produced and independently released, their songs are built around [the defining element — e.g. "layered vocal harmony and unhurried, conversational lyrics"].

Debut single "[SONG]" arrives [DATE] — a [one-line description of the song: what it's about and what it sounds like].

— This is the version you will use most often. Get it perfect.` },

  { id: 'medium-bio', label: 'Medium bio — one paragraph', limit: 1500, body:
`[ARTIST] is a [GENRE] artist, songwriter and producer based in [CITY], India. Working almost entirely alone — writing, recording, and producing at home — they make [GENRE] that pulls from [influence 1], [influence 2] and [influence 3], and lands somewhere between the three. The songs tend to be quiet on the surface and less quiet underneath: close-mic'd vocals, layered harmony, and lyrics that say the thing out loud instead of gesturing at it.

"[SONG]", released [DATE], is the first of these to leave the room it was made in. [One or two sentences on what the song is about and why it exists — the specific, true story. This is the part people remember.]

More music follows through [year].` },

  { id: 'long-bio', label: 'Long bio — EPK / press / website', limit: 0, body:
`[ARTIST] didn't set out to make a record. [Open with the specific true origin — the moment, the room, the reason. Two to three sentences. Concrete detail beats adjectives: not "a lifelong passion for music" but "a borrowed guitar and a laptop mic in a hostel room in [CITY]."]

Raised in [CITY] and trained in [background — engineering, science, classical music, whatever is true], [ARTIST] came to songwriting sideways. [The pivot: what made you start writing. Keep it honest — the interesting version of your story is the true one, not the mythologised one.]

The result is [GENRE] that borrows the [quality] of [influence 1], the [quality] of [influence 2], and the [quality] of [influence 3] — [description of what the combination actually sounds like]. Every part is written, played, recorded and produced by [ARTIST] alone, in [where], on [what].

Debut single "[SONG]" is [what the song is about, in one honest sentence]. [What the arrangement does — "it opens on a single voice and doesn't add a drum until the second chorus."] It arrives [DATE] with a self-directed music video shot in [location].

[ARTIST] releases independently, with more music through [year].

—
Contact: [EMAIL]
Listen: [LINK]` },
]},

{ group: 'Pitches', note: 'Editors and programmers are choosing between hundreds of tracks. The ones with a visible campaign behind them get chosen because they are less risky.', items: [

  { id: 'spotify-pitch', label: 'Spotify editorial pitch', limit: 500, body:
`"[SONG]" is a [tempo/mood] [GENRE] track built around [the specific hook — what makes it distinct in the first 15 seconds]. Written, produced and mixed independently in [CITY].

For fans of [COMPS]. Sits naturally in [2–3 REAL editorial playlists].

Campaign: self-directed music video launching day one, 12-week short-form content series, paid social across India/US/UK/Canada/UAE, 40+ independent playlist submissions, college radio push. Pre-save live from [DATE].

First release from a new independent artist with an active [X]-follower audience.` },

  { id: 'amazon-pitch', label: 'Amazon New Release Pitch', limit: 0, body:
`Genres: [3]
Moods: [3]
Similar artists: [COMPS]
Audience: India, United States, United Kingdom, Canada, United Arab Emirates

Marketing drivers: Self-directed music video releasing day one across YouTube and short-form. Paid social across Meta and YouTube targeting India and the Indian diaspora in US/UK/CA/UAE. 40+ independent playlist submissions. College and internet radio campaign. 12-week post-release content series built from music video footage.` },

  { id: 'one-sheet', label: 'Radio one-sheet', limit: 0, body:
`[ARTIST] — "[SONG]"
Release date: [DATE] · Runtime: [X:XX] · Radio edit: [X:XX] · Clean: yes
Genre: [GENRE] · Key: [key] · BPM: [bpm]
ISRC: [ISRC] · UPC: [UPC]
Label: [LABEL] · Publisher: [publisher] · PRO: [pro]

FOR FANS OF: [COMPS]

[SHORT BIO — 70 words]

WHY THIS TRACK: [Two sentences. What makes it programmable — the hook lands at 0:14, it's under 3:30, the chorus is singable, it fits your [daypart/show].]

CAMPAIGN: Music video, paid social across India/US/UK/CA/UAE, playlist campaign, [X] monthly listeners.

Streaming: [LINK]
Download WAV/MP3: [direct Dropbox or Drive link — always include a direct download]
Press photos: [EPK link]
Contact: [ARTIST], [EMAIL], [phone]` },

  { id: 'epk', label: 'EPK — what goes in it', limit: 0, body:
`One page or one Notion/Carrd link. Everything a curator or journalist needs, in one place, with nothing to ask for.

· Artist name, one-liner, and the short bio (70 words)
· The long bio
· 3–5 press photos, high-res, downloadable
· Cover art 3000×3000
· The smart link
· Embedded player or private stream
· Direct WAV + MP3 download links
· Video embed
· Key facts: release date, ISRC, UPC, label, publisher, PRO
· Social links and follower counts
· Contact: name, email, phone

Update it at T+90 with the real numbers — that version is what pitches release #2.` },
]},

{ group: 'Emails', note: 'Personalise every one. One recipient per email. Never attach a file unless asked.', items: [

  { id: 'curator-email', label: 'Playlist curator pitch', limit: 0, body:
`Subject: [SONG] — [GENRE] from India, for [PLAYLIST NAME]

Hi [NAME],

I found [PLAYLIST NAME] through [how — specific and true], and I've been going through it — the [specific track] placement is what made me write.

I'm [ARTIST], an independent [GENRE] artist from [CITY], India. My single "[SONG]" comes out [DATE]. It's [one sentence: what it sounds like], and it sits close to the [a specific artist ON their playlist] end of what you're already playing.

Track: [private link]
[If pre-release: happy to send a WAV or a private stream, whichever you prefer.]

No pressure either way — if it's not right for the list, I'd still take any honest reaction to it.

Thanks for reading,
[ARTIST]
[LINK] · [HANDLE]` },

  { id: 'press-email', label: 'Blog / press pitch', limit: 0, body:
`Subject: [ARTIST] — "[SONG]" (independent, [CITY], out [DATE])

Hi [NAME],

[One sentence on why you're writing to THEM specifically — a piece they wrote, an artist they covered.]

I'm an independent artist from [CITY] releasing my first single, "[SONG]," on [DATE]. [Two sentences: the hook of the story. Not "I made a song" — "I wrote and produced the whole thing alone in a hostel room while finishing an engineering degree, and shot the video for ₹X with three friends."]

Everything is here: [EPK link] — stream, WAVs, photos, bio, video.

Happy to answer anything, and no hard feelings if it's not a fit.

[ARTIST]
[EMAIL] · [LINK]

— Pitch at T-21. Blogs need 3–4 weeks. A post-release pitch to a blog is a wasted email. The story is the pitch, not the song.` },

  { id: 'radio-email', label: 'Radio submission', limit: 0, body:
`Subject: [ARTIST] — "[SONG]" · [GENRE] · radio edit [X:XX] · clean

Hi [NAME],

I'm [ARTIST], an independent [GENRE] artist from [CITY], India. I've been listening to [SHOW / STATION] and [one specific, true observation — a track they played, a slot that fits].

"[SONG]" is out [DATE]. Radio edit is [X:XX], clean, hook at 0:14.

Direct download (WAV + MP3): [link]
Stream: [LINK]
One-sheet: [link]

ISRC: [ISRC] · PRO: [pro] · Publisher: [publisher]

Thanks for listening,
[ARTIST]
[EMAIL]

— Never make a programmer stream it. Always include a direct download.` },

  { id: 'thankyou-email', label: 'Thank-you after a placement', limit: 0, body:
`Subject: thank you for adding [SONG]

Hi [NAME],

You added "[SONG]" to [PLAYLIST / played it on [SHOW]] — thank you. It's the first thing I've released and that meant more than it probably should have.

I've shared [PLAYLIST/SHOW] to my story and I'll keep listening.

Next one lands in [8–12 weeks] — I'll send it over if that's welcome.

[ARTIST]

— Curators remember this. It is why release #2 gets added faster.` },
]},

{ group: 'Messages', note: 'The least scalable and highest-converting assets you own.', items: [

  { id: 'whatsapp', label: 'Personal network — WhatsApp (T-7)', limit: 0, body:
`hey — so I actually finished it. my song "[SONG]" is out [DATE].

if you've got 3 minutes on friday, the thing that genuinely helps most is:
1. play it once all the way through (don't skip — it counts differently)
2. hit save/like on spotify
3. add it to any one of your own playlists

that's it, and it makes a stupidly large difference to how the algorithm treats it.

[LINK]

thank you 🖤

— Send individually to your top ~40 people. Not as a broadcast. A broadcast list is for updates; a personal message is for the ask. Never send both to the same person in the same week.` },

  { id: 'street-team', label: 'Street team brief', limit: 0, body:
`[SONG] — out [DATE]

What I'm asking:
· Release day: post the track to your story with the link sticker → [LINK]
· Save it on Spotify + add to one of your own playlists
· If you make content: the sound is on IG/TikTok under "[ARTIST] — [SONG]" — any use at all helps

Assets (grab whatever's useful): [Drive folder link]
· 3 story graphics (1080×1920)
· 5 short clips from the video
· cover art
· 3 pre-written captions

Pre-written caption options:
1. "my friend made this and it's actually really good [LINK]"
2. "[SONG] — [ARTIST]. on repeat. 🔁"
3. "been waiting for this one. out now ↓"

Thank you — I'll be sending everyone who posts something back in a month.` },
]},

{ group: 'Evergreen', note: 'Post any of these in any week. Fill the gaps when you do not have a new clip.', items: [

  { id: 'evergreen-ig', label: 'Instagram / TikTok captions', limit: 0, body:
`still out. still yours if you want it. [LINK]

this part still gets me and I wrote it

POV: you made a song in your bedroom and now strangers in [country] are listening to it

three months later and I still can't listen to the second verse without wincing. that's how you know it's honest.

if you're new here: I make [GENRE]. this is the one that started it.

someone put "[SONG]" on a playlist called "[real playlist name]" and I have never felt more seen` },

  { id: 'evergreen-x', label: 'X / Threads', limit: 0, body:
`the streaming economy in one line: 1,000 streams is roughly one coffee. do it anyway.

independent artist starter pack: a laptop, one microphone, a spreadsheet with 400 rows, and an unreasonable amount of hope

what's a song you love that has under 100k streams? genuinely collecting.

made a thing. it's out. [LINK]. that's the whole tweet.` },

  { id: 'evergreen-story', label: 'Story prompts — rotate weekly', limit: 0, body:
`· Poll: verse or chorus?
· Question box: ask me anything about the song
· Quiz: which lyric is real?
· This or that: two cover art options
· Countdown sticker to any upcoming thing
· Link sticker to the smart link — at least once a week, forever` },
]},
];

/* ---------------------------------------------------------- */
/*  placeholder filling                                        */
/* ---------------------------------------------------------- */

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export function fillTemplate(text, set) {
  const dateOut = set.releaseDate
    ? (() => { const [y, m, d] = set.releaseDate.split('-').map(Number);
        return `${d} ${MONTHS[m - 1]}`; })()
    : '[DATE]';

  const map = {
    ARTIST: set.artist, SONG: set.song, LINK: set.link, CITY: set.city,
    GENRE: set.genre, HANDLE: set.handle, EMAIL: set.email, DATE: dateOut,
    LABEL: set.label, ISRC: set.isrc, UPC: set.upc, COMPS: set.comps,
    pro: set.pro, publisher: set.publisher,
  };
  const out = String(text).replace(/\[([A-Za-z]+)\]/g, (whole, key) => {
    const v = map[key];
    return (v && String(v).trim()) ? v : whole;   // leave the placeholder if empty
  });
  // "a indie pop artist" -> "an indie pop artist"
  return out.replace(/\b([Aa])(\s+)(?=[aeiouAEIOU])/g, (m, a, sp) => (a === 'A' ? 'An' : 'an') + sp);
}

/** Splits trailing "— …" guidance lines off the copy itself, so the
    character count and anything you paste is only the real text. */
export function splitHint(text) {
  const lines = String(text || '').split('\n');
  const hint = [];
  while (lines.length && (/^\s*—\s/.test(lines[lines.length - 1]) || !lines[lines.length - 1].trim())) {
    const line = lines.pop();
    if (/^\s*—\s/.test(line)) hint.unshift(line.replace(/^\s*—\s*/, ''));
  }
  return { body: lines.join('\n').trimEnd(), hint: hint.join(' ') };
}

/** Which placeholders are still unfilled in a string. */
export function missingPlaceholders(text) {
  const known = ['ARTIST','SONG','LINK','CITY','GENRE','HANDLE','EMAIL','DATE','LABEL','ISRC','UPC','COMPS'];
  return [...new Set((String(text).match(/\[([A-Za-z]+)\]/g) || [])
    .map(s => s.slice(1, -1))
    .filter(k => known.includes(k)))];
}
