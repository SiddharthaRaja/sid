/* ============================================================
   contacts.js — the outreach database (Category K)
   Targets, statuses, vetting rules and the reference.
   ============================================================ */

export const KINDS = [
  { key: 'curator',  label: 'Playlist curators', target: 100, note: 'Find them via "Discovered On" for your comparison artists, playlist directories, Reddit, Instagram curator accounts.' },
  { key: 'press',    label: 'Press & blogs',     target: 20,  note: 'Pitch at T-21. Blogs need 3–4 weeks. Small Substacks have the best response rate of anything and almost nobody pitches them.' },
  { key: 'radio',    label: 'Radio contacts',    target: 30,  note: 'Named people at stations — the music director, the show host. Station-level entries live in the Radio tab.' },
  { key: 'personal', label: 'Personal network',  target: 40,  note: 'The highest-conversion asset you own. Individual messages at T-7, never a broadcast.' },
  { key: 'street',   label: 'Street team',       target: 15,  note: 'The people who actually push. Brief them at T-7 with the asset folder.' },
  { key: 'industry', label: 'Industry & other',  target: 0,   note: 'Other artists, managers, sync contacts, venue bookers, photographers.' },
];

export const STATUSES = [
  ['todo', 'To contact'],
  ['sent', 'Sent'],
  ['followed', 'Followed up'],
  ['replied', 'Replied'],
  ['placed', 'Placed / played'],
  ['declined', 'Declined'],
  ['noreply', 'No reply'],
];

export const STATUS_CLS = {
  todo: '', sent: 'info', followed: 'info', replied: 'warn',
  placed: 'ok', declined: 'bad', noreply: '',
};

/* Curator vetting — from the plan. Any red flag = do not submit. */
export const VET_GREEN = [
  'The curator is a real person with a real social account',
  'The playlist has organic follower growth, not a sudden spike',
  'It appears in "Discovered On" for artists at your level',
  'The tracks on it are stylistically coherent',
];
export const VET_RED = [
  'Sudden follower spikes',
  'No social presence behind the playlist',
  'Generic name ("Top Hits 2026")',
  'Stock cover art',
  'Offers guaranteed placement for money',
];

export const CONTACTS_INFO = [
{ title: 'The discipline', body: `
## The numbers the plan asks for
100 playlist curators · 30 radio stations · 20 blogs · 40 personal-network names. Build the list at **T-90**, in the dark, before you have anything to promote. Then you are not scrambling at T-21.

## The rules that make it work
- **Personalise every email.** One recipient per email. Name the playlist. Name a track on it.
- **Never attach a file** unless asked. A private stream link or a direct download.
- **Follow up once**, after 10–14 days. **Never twice.**
- **Thank everyone who adds you**, and share their playlist to your story. Curators remember this, and it is why release #2 gets added faster.
- **Track everything.** Curator, playlist, followers, date sent, response, outcome, follow-up date.
` },
{ title: 'Vetting a curator', body: `
## Never pay for guaranteed placement
Paid guaranteed placement is **payola**. Spotify removes tracks for it and can penalise your artist profile. This is a real risk, not a theoretical one.

The legitimate paid routes — **SubmitHub** ($1–3) and **Groover** (~€2) — pay curators for their *time*, not for placement. That distinction is what makes them legitimate.

## Green flags
- A real person with a real social account behind it
- Organic follower growth, not a sudden spike
- It shows up in "Discovered On" for artists at your level
- The tracks on it are stylistically coherent

## Red flags — do not submit
- Sudden follower spikes
- No social presence
- Generic name ("Top Hits 2026")
- Stock cover art
- Anyone offering guaranteed placement for money
` },
{ title: 'Where to find them', body: `
| Route | Cost | Note |
|---|---|---|
| Spotify **"Discovered On"** for your comparison artists | Free | The single best source of real, relevant playlists |
| [Chartmetric](https://chartmetric.com/) | Free tier | Find curators and playlists by artist. Genuinely useful free tier |
| [Daily Playlists](https://dailyplaylists.com/) | Free | Curator directory |
| [Soundplate](https://soundplate.com/) | Free | Submission |
| [Indiemono](https://www.indiemono.com/) | Free | Submission |
| [SubmitHub](https://www.submithub.com/) | $1–3 each | Guaranteed feedback. Buy ~25–30 credits. Hit rate 5–15% |
| [Groover](https://groover.co/en/) | ~€2 each | Guaranteed response. Stronger in Europe, good for radio and blogs |
| [MusoSoup](https://musosoup.com/) | Pay per response | Blogs and playlists |
| Instagram curator accounts | Free | DM works more often than you would think |
| [Hype Machine](https://hypem.com/) | Free | Get blogged, then chart here |

**Skip at this tier:** Playlist Push ($300+ per campaign).
` },
{ title: 'The personal network', body: `
40 people, messaged **individually** at T-7. Not a broadcast. This has the highest conversion rate of anything in the entire plan.

The ask is three things, and it must be exactly three:
1. Play it once all the way through — don't skip, it counts differently
2. Save it on Spotify
3. Add it to any one of your own playlists

A broadcast list is for updates; a personal message is for the ask. **Never send both to the same person in the same week.**

The message itself is in the Copy bank under Messages.
` }];
