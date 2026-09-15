# Sid

Release, content, rights and finance management. Web app + installable mobile app, one codebase, no build step.

---

## The 10-minute setup

### 1. Put it online (5 min, free, permanent)

1. Go to **github.com/new** → name it `sid` → **Public** → Create.
2. On the new repo page click **uploading an existing file** and drag in *everything* in this folder (`index.html`, `sw.js`, `manifest.webmanifest`, and the `css`, `js`, `icons` folders). Commit.
3. Repo → **Settings** → **Pages** → Source: *Deploy from a branch* → Branch: `main`, folder `/ (root)` → Save.
4. Wait ~60 seconds. Your app is live at `https://<your-username>.github.io/sid/`.

It works immediately at this point — everything saves to whichever browser you open it in. Step 2 makes it sync across your phone and laptop and back itself up.

### 2. Turn on Google login + cloud backup (5 min, free)

1. **console.firebase.google.com** → *Create a project* → call it `sid` → you can turn Google Analytics off.
2. **Build → Authentication → Get started → Sign-in method → Google → Enable.** Save.
3. Still in Authentication → **Settings → Authorized domains → Add domain** → `<your-username>.github.io`.
4. **Build → Firestore Database → Create database** → *Production mode* → pick a region near you (`asia-south1` for Mumbai).
5. **Build → Storage → Get started** → same region. (Storage needs the Blaze plan on newer projects — it has a free tier and costs nothing at this volume. If you'd rather not add a card, skip Storage: everything works except full-size image and video uploads.)
6. **Project settings** (gear icon) → scroll to *Your apps* → click the **web icon `</>`** → nickname `sid` → Register app. Copy the `firebaseConfig` object it shows you.
7. Open **`js/firebase-config.js`** in your repo (GitHub lets you edit files in the browser — click the pencil icon), paste your values in, uncomment them, commit.
8. **Rules.** In Firestore → *Rules* tab, paste the contents of `firestore.rules` and Publish. In Storage → *Rules* tab, paste `storage.rules` and Publish. This is what stops anyone else reading your data.

Reload the app — it now asks you to sign in with Google.

> Those API keys are safe in a public repo. Firebase web keys are public identifiers, not secrets; the rules files are what protect your data.
>
> If you want to be certain only you can ever sign in, put your email in `ALLOWED_EMAILS` in the same config file.

### 3. Install it on your phone

- **iPhone:** open the URL in Safari → Share → *Add to Home Screen*
- **Android:** open in Chrome → menu → *Install app*
- **Desktop:** the install icon in the address bar

It then opens full-screen with its own icon, works offline, and is the mobile app. There is no separate build.

---

## How the backup actually works

You asked for saving mid-session, not just at the end. What runs:

| When | What happens |
|---|---|
| ~0.5s after you stop typing | That section is written to Firestore |
| Tab hidden, closed, or loses focus | Anything unsaved is flushed immediately |
| Every 5 seconds | A sweep catches anything a debounce missed |
| Every time you open the app | A full point-in-time snapshot |
| Every 10 minutes of active work | Another snapshot |
| While offline | Edits queue on the device and replay when you reconnect |

The last **40 snapshots** are kept and any one can be restored from **Settings → Backup & history**, which also does a full JSON export/import. The little dot in the top bar tells you the current state: *saved* / *saving…* / *offline — queued*.

Data is stored as one document per section (`users/<your-uid>/data/<section>`), so no single document can grow large enough to hit a limit, and two devices editing different sections never collide.

---

## What's in it

**Weekly review** — pick a week and Sid assembles what actually happened: posts made by platform, stat movement between the snapshots either side, ad spend, outreach sent, milestones ticked, assets added. You write the three things only you can write. Saved reviews stack up and export as one markdown file — which is the T+90 post-mortem, already written.
**Assets** — the plan's 33-line inventory of the 60+ pieces one shoot day should yield: video cuts, hook clips, b-roll, BTS, stills, story graphics, audio deliverables and documents. Each line has a target count, a spec, a need-by date and a link to where it lives, with +/− steppers you can tap on your phone at the shoot.
**Queue** — the screen you open in the morning. Everything due today and this week across every platform, in one list: copy the text, mark it posted, or snooze it a day without leaving the page. Overdue first, banked-but-undated at the bottom.
**Dashboard** — countdown, overdue, today, the next fortnight, per-platform pulse.
**Calendar** — month / week / agenda, 22 overlay calendars you toggle independently, reminders, and dates that can be written either as `2026-11-13` or as `T-28` / `T+14`.
**Master plan** — 76 seeded milestones from your release plan, with checkboxes, grouped by phase or by category, plus the twelve-things version.
**Copy bank** — every bio (one-liner through long-form), the Spotify and Amazon pitches, the radio one-sheet, the curator / press / radio / thank-you emails, the WhatsApp message, the street-team brief, and the evergreen caption bank. Each one starts pre-filled with your artist name, song, city, date and link; editing keeps your version forever. Exports as one markdown file.
**Contacts & outreach** — curators, press, radio people, your 40-person personal network and the street team in one tracker, against the plan's targets. Curator vetting flags, bulk-add from a pasted list, follow-up dates that appear on the calendar, and a one-click email drafted from the copy bank and addressed to that contact.
**18 platform tabs** — each with its own content banks (captions, reels, stories, tweets, pitches…), image/video attachments, per-item scheduling, a setup checklist, deep stats, a written reference section, and notes. Every content type has a **Templates** button that drops the drafted version straight into your drafts, dated to its T-offset.
**Radio** — 43 seeded stations, networks and portals across three tiers with the route in for each, weighted toward your diaspora markets (UK, Canada, US, UAE, Australia), plus a submission tracker and a submission email generated from your one-sheet with a pre-send checklist.
**Rights & licensing** — 13 registrations with dates and costs, a works-and-codes register, copyright country by country, and the BMI-vs-IPRS explainer.
**Finance** — 9 forms and filings with how-to-fill notes, receiving accounts and payers, the ₹44,600 budget, and a royalty ledger with FIRA references.
**Ads & campaigns** — the plan's six-campaign schedule with audiences, daily budgets and windows; creative variants with a kill-the-losers verdict; and the numbers that matter — cost per conversion, and cost per new listener worked out against your logged stats. It also shows planned spend against the ad line in your Finance budget, so the gap between the two is visible rather than buried.
**Press kit** — a one-page EPK built from Settings, the Copy bank and your photos, exported as a single self-contained `epk.html` you drop next to `index.html` and send as a link. It refuses to export quietly if the bios still have unwritten `[bracket]` prompts in them.
**Music video** — create and delete shooting schedules as tabs; each has a storyboard and shot list, locations, cast and crew with release tracking, the shoot-day capture list, and backup plans.
**Statistics** — cross-platform overview, indexed growth comparison, demographics with charts, derived rates (save rate, streams per listener, profile-to-link conversion, sound adoption), a metric picker for the trend chart, CSV import for both time series and breakdowns, and a nudge when you have not logged for a week.
**Notes** — a plain notepad.

**Dates, your way.** Every dated field in the app takes either a **T-offset** (T-28, T, T+14) or a **calendar date** — you pick per field, and switching converts what you already had. Relative dates move when you change the release date; calendar dates stay put. Whichever you choose, the other reading is shown underneath, so you always know what T-28 actually lands on.

Everything is dark by default with a light mode. On a phone the bottom bar is Queue · Home · Calendar · Platforms · More, and More opens everything else.

---

## Changing things

- **A new platform tab** — add one object to `js/data/platforms.js`. Nav, calendar, content banks, stats and search pick it up automatically.
- **Its reference text** — add a matching key in `js/data/info.js`.
- **Milestones** — `js/data/masterplan.js` (or add them in the app). Seeds merge: anything new in the file is added on next load without touching what you have edited or ticked.
- **Copy templates** — `js/data/templates.js`. Placeholders in `[BRACKETS]` fill from Settings; a trailing line starting with `—` becomes guidance rather than part of the text.
- **Colours** — the accent is `--accent` at the top of `css/app.css`. The chart palette below it is colour-blind validated; if you change it, keep the light-mode direct labels.
- **Logos** — the tab marks in `js/icons.js` are original glyphs, not the platforms' trademarked logos. If you want the official assets, replace the `<path>` data for that key; nothing else needs to change.

- **Campaign schedule** — `js/data/ads.js`. `funded: false` marks a campaign the budget does not cover, which is what drives the warning on the Campaigns tab.

To update the app after any edit: commit to the repo. GitHub Pages redeploys in under a minute and the service worker picks up the new version on next load.


## History library

`js/data/history/` holds the reading library — 105 articles, about 311,000 words.
Files are `g*.js` (genres and industry) and `a*.js` (artists). Each exports
`ARTICLES`, an array of `{ id, section, group, title, subtitle, era, minutes, tags, body }`
where `body` is markdown inside a template literal.

**After adding or editing an article file you must run:**

    node tools/genindex.mjs

That regenerates `js/data/history/index.js`, which is what the app imports.
Then bump `VERSION` in `sw.js` and add the new file to `SHELL` so the
offline cache picks it up.

### Audiobook

`js/reader.js` drives the player. It uses the browser's built-in speech
synthesis, which is free and needs no server. Honest limitation: **iOS
suspends speech synthesis when Safari is backgrounded**, so locking an
iPhone stops playback. Android Chrome usually keeps going with the screen
off, and desktop always does. The in-app settings modal says so. Making it
survive an iOS lock would need pre-generated TTS audio files played through
an `<audio>` element, which means a paid TTS service and a build step.


## Calendar export (.ics)

`js/ics.js` builds a standards-compliant iCalendar file from the agenda —
every deadline, post, shoot and milestone — with `VALARM` reminders.
Import it into Google Calendar, Apple Calendar or Outlook and your phone
does the reminding.

This is a one-way export, not a live subscription: a live feed needs a
public URL that regenerates itself, which means a server. Events carry
stable UIDs so re-importing updates them in place in Apple Calendar and
Outlook; Google's importer is less consistent, so import into a dedicated
calendar you can clear and refill.

## Share target

The manifest declares Sid as a PWA share target (`POST` to `./share`,
`multipart/form-data`). `sw.js` catches the POST — a share is a form
submission, not a navigation, so it cannot be read from the page — stashes
files in the `sid-share` Cache Storage bucket and a JSON payload at
`./shared/pending.json`, then redirects to `#/inbox`. `js/modules/inbox.js`
drains that on boot.

Works on Android and on desktop Chrome/Edge once Sid is installed. **iOS
does not let web apps register as share targets**, so on iPhone the Paste
button in the Inbox is the way in. That is an Apple restriction.

## Metadata and splits

`js/modules/meta.js` is the canonical record every form asks for, with a
copy button per field, format validation (ISRC, UPC, ISWC, P/C lines) and a
split table that refuses to accept anything that does not total exactly 100.

## Paid ads

`js/modules/ads.js` — accounts, campaigns, a daily spend log, and results
derived from it. Totals come from the log where one exists and fall back to
typed figures where it does not, so the two never double-count.
`js/modules/links.js` is the UTM builder feeding it.

## Spotify pitch

`js/modules/pitch.js` — the editorial pitch form, a countdown to the
seven-day cut-off, and a dashboard warning that escalates as the date
approaches. Reachable at `#/p/spotify/epitch`.

## Adding a module — checklist

1. Write it in `js/modules/`.
2. Register its slice in `app.js` (`S.register`) and add the slice name to
   `ALL_SLICES`.
3. Add a `ROUTES` entry and a `navItem`.
4. Add the file to `SHELL` in `sw.js` and bump `VERSION`.
5. Parse-check with a real ES-module parser, not `node --check`:
   `node tools/parse.mjs js/**/*.js`. `node --check` has missed unbalanced
   parentheses in this codebase; acorn catches them.

## Planning mode and execution mode

Sid holds one song at a time, and it has two modes. The switch lives on the
**Release** tab.

**Planning** — no release date exists. Every task, post and milestone is
scheduled as a T-minus / T-plus number of days, and that is the only choice the
date control offers. There is no calendar, nothing is overdue, and nothing can
be late. The Calendar tab becomes a Timeline: everything grouped by phase along
the T-axis, with a bar chart of how the work is distributed. You can pencil in a
target date without applying it.

**Execution** — you set a real release date. Every T-offset resolves to a real
day, the calendar fills in, the queue gets Today / Overdue / Next 7 days, and
the date control also offers fixed calendar dates for the things that do not
move with the release. Before you commit to a date, the switch shows what the
first few items become on that date.

Switching back to planning puts the release date aside (it is remembered as the
pencilled-in date) rather than deleting anything. Items written as fixed
calendar dates keep their dates in both modes.

## Navigation

Five things live in the sidebar permanently — Today, Calendar, Release, Master
plan, Contacts — then the platform groups, then **More**, collapsed, holding
everything else. Today is the merged dashboard and post queue: countdown,
overdue, the posts due with copy / mark-posted on the row, then the next
fortnight.

## Themes

Settings → Appearance. Surface mode is Light, Dark or *Match my device* (which
follows the system setting live, including its evening switch), and the accent
is one of Ember, Ocean, Forest or Plum. The two are stored separately, so
changing one never resets the other. The moon button at the foot of the sidebar
cycles light → dark → system.

## Uploads

Attachments need Firebase Storage switched on for the project:
Firebase console → Build → Storage → Get started (asia-south1) → Rules tab →
paste `storage.rules` from this repo → Publish. Settings → Appearance →
**Image & video uploads → Test it** uploads a one-byte file, reads it back and
deletes it, and names the exact switch that is still off if it fails.

## Writing desk

`#/write`. Three tabs.

**Batch write** — pick a platform and type, write three, five or ten captions
on one screen, each with a live character count and a one-word lint verdict.
Saving drops them all into that platform's content bank as drafts, spaced three
days apart from whatever starting offset you give them.

**Hooks & phrases** — around forty opening lines grouped by kind (story,
question, number, contrast, confession, direct, lyric, behind-the-scenes),
endings, openers, and the five post shapes that work. Tap to copy. Your own
saved lines live at the top.

**Swipe file** — captions from other people that made you stop scrolling, with
one line about *why*. The why is the reusable part.

## Writing aids (in every editor)

Wherever you type a caption — the item editor, the batch writer — you get:

- **Linter**: hard limit, where the "…more" fold cuts, long or clichéd first
  lines, filler words, "link in bio" on platforms where real links work,
  hashtag count against that platform's sweet spot, emoji count, shouting,
  a missing ask, unfilled `[placeholders]`, and repetition against your own last
  ten posts (same opener, same tag block).
- **Preview**: the post as it appears in the feed, with everything past the fold
  greyed out.
- **Phrase bank**, **Word help** (filler words with replacements, plus a small
  synonym lookup) and **Structure** skeletons.
- **A B version** per post, and a note of which one actually went out.

## Discovery

`#/seo`. Hashtag sets by tier (niche / mid / big) with a used-count and rotation
so you never paste the same block twice; your twenty search phrases and where
each has to appear; a YouTube title/description/tags builder with the real
limits and a "Show more" preview; and a per-platform reference of what actually
gets a post found — including the platforms where the honest answer is "nothing
you write matters".

## Writing assistant (optional)

Settings → Appearance → Writing assistant. Paste an Anthropic API key and
**Assist** buttons appear: five variations, tighten, hashtag ideas, YouTube
description, keyword suggestions. The key is stored in that browser's
localStorage only — never in Firestore, never in a snapshot or a backup export,
so it does not travel to your phone unless you paste it there too. Nothing is
generated unless you press a button, and nothing is saved until you press
**Use this**. Everything else in the app works with no key at all.

## Recycle

A post marked posted gets a **Recycle** button in the queue: it copies itself
forward thirty days as a fresh draft, text and attachments included.

## Asset studio

`#/studio`. Everything runs on a canvas in the browser — no upload, no server,
nothing leaves the device.

**Specs & checker** — every asset the release needs, with the numbers the
platform actually enforces, and a file picker that measures your real file
against them: dimensions, aspect ratio, format, file size, and for video the
duration, orientation and whether it carries an audio track. An asset is only
ticked off once a real file has passed, so the "what's missing" list cannot lie
to you.

**One still → every size** — load one high-resolution image, click where the
important part is, and export Spotify avatar, Spotify header, Spotify gallery,
Instagram profile / feed / story, YouTube thumbnail and icon. The dotted overlay
shows the part that survives cropping on a phone.

**Style variants** — ten looks from one photo: negative, black & white, duotone,
posterise, threshold, halftone, grain, bloom, chromatic split. Duotone and
halftone take your two colours, so a set made this way looks like a set.

**Motion clips** — a silent 720×1280 loop from a still, 3–8 seconds, for Canvas
or a Reel. Five motions (slow zoom, drift, living grain, breath, projector), all
built so the last frame matches the first, because a Canvas repeats forever and
a hard cut shows on every loop. Chrome records MP4 directly, which is what
Spotify wants; other browsers record WebM and the app says so rather than
letting you find out at the upload.

**Spec sheet** — a markdown export of every asset, its numbers and whether you
have it, to hand a designer or a videographer.

### Spotify facts, current as of September 2026

- Avatar 750×750 minimum, header 2660×1140 minimum, JPEG/PNG/GIF, under 20MB.
- Canvas: 3–8 seconds, 9:16, 720–1080px tall, MP4 or JPG, **silent** — an audio
  track is rejected outright. Mobile app only.
- **Clips no longer exist.** Spotify stopped accepting new Clips uploads on
  17 June 2026; existing ones moved into the Video tab.
- Video uploads: longer than 30 seconds, under 20 minutes, landscape 16:9,
  minimum 1920×1080. Official videos, live and studio sessions and covers are
  eligible; visualisers and lyric videos are not. Still beta, with a waitlist.

## Spotify profile & unlocks

A tab on the Spotify page. The bio with its real 1,500-character limit and a
note about @tags, the Artist Pick, the image slots with live spec status, a
pre-save countdown — and the unlock ladder: Showcase needs 1,000 recent streams
in a market, Marquee needs that plus 5,000 monthly listeners in the same market,
and both start around $100 per sub-campaign. The ladder reads your last logged
Spotify stats and shows the distance to each one, per market, because
eligibility is counted per market and 5,000 listeners spread over six countries
unlocks nothing.

## Merch

`#/merch`. Four tabs. **Unit economics** computes what you actually keep per
shirt after the blank, printing, screen setup amortised over the run, labels,
packaging, shipping, gateway fees and spoilage — and shows a run-size table
whose last column is cash up front, which is the column that decides it. It
warns below 2.5× all-in and shouts if the margin is negative. **How to print it**
compares print-on-demand, screen printing, DTF and embroidery, with the
Hyderabad specifics (Begum Bazaar for blanks, Balanagar and Jeedimetla for
screen printing, ₹60–90 surface shipping). **Vendors** tracks quotes, MOQs and
whether their sample has been washed twice. **Pre-orders** is a gate: nothing
gets printed until enough people have paid.

Costs are seeded with Hyderabad-area estimates so the arithmetic has something
to chew on. Replace every one with a real quote before spending anything.

## Website

`#/site`. The scroll site as a list of scenes — halftone open, the HD frame,
sound, negative, the tile puzzle, the ask — each with the assets it needs and
the technical trap that comes with it, reorderable, tickable. Plus the easter
egg map: what triggers each hidden page, where it leads, what the reward is, and
*who will realistically find it*, which is the column that decides whether an
easter egg is worth building. "Build brief" exports the whole thing as markdown.

## Mailing list

`#/list`. The one audience nobody can take away — every platform in this app is
rented. Four tabs: a subscriber count you log weekly with a growth sparkline and
a goal; the seven places signups actually come from, each switchable and
countable, so you can find the one that works instead of half-doing six; a send
log with open and click rates (40–60% open is healthy for an artist list, under
25% means the subject line or the frequency is wrong) and the five emails worth
writing, pre-filled from the Release tab; and a provider comparison with the
current free-tier caps — Kit's 10,000 is the standout, Mailchimp's 500 is not.

Sid holds the counts and the sends, not the addresses. Those stay with your
provider, and you export them to CSV monthly, because the provider is rented too.

## Playlists

`#/playlists`. Every placement with its status, curator, follower count, your
position in it, and a check log. Four tabs:

- **Placements** — grouped by status, with combined follower reach.
- **Weekly check** — five minutes, once a week: confirm the song is still in
  each playlist and log the streams it brought. A placement is worth nothing if
  you don't notice the week it disappears, and the decay curve tells you which
  curators actually kept you. One tap marks a playlist as having dropped you.
- **Finding them** — the six routes that work, starting with "Discovered on" for
  your comparison artists, what a real message looks like, and five ways to spot
  a bot playlist before you pay for it.
- **How they work** — editorial, algorithmic, independent and friends, with what
  each is actually worth and which ones you can influence.

The number that matters is not the follower count but what fraction of those
listeners save the song — Spotify reads saves and skips, not placements.

## Release day

`#/runsheet`. Twenty-nine steps across three sections — the night before,
release day, the morning after — each with a time, a duration, what to do and
where. Times resolve against your release date, the section for today is
highlighted, a "now" line sits where you are in the day, and anything whose hour
has passed unticked is marked overdue. Add your own steps; export the whole
thing as markdown to print.

In the 72 hours around release, a card appears at the top of Today with the next
step on it.

Three things it insists on: the 00:05 checks exist so a real problem has eight
hours of daylight to be fixed in; the 08:00 hour of individual messages is
measurably the highest-value hour of the whole release; and screenshot every
number at 21:00, because day-one figures vanish from most dashboards within a
week and the post-mortem needs them.

## Where uploaded files go

Settings → Appearance → **Where uploaded files go**. Three choices:

**My Google Drive** (the default once set up). Uploads land in a "Sid uploads"
folder in your own Drive, using the `drive.file` permission — which lets the app
touch only files it created and gives it no view of anything else in there. Free,
no card, counts against your own 15GB. The Drive permission lasts about an hour,
so the first upload of a session flashes a Google window for a moment; after that
it is silent. On an installed app on iPhone that flash can fail — Android and any
normal browser tab are fine.

Setup, once:

1. Google Cloud console → APIs & Services → Credentials, on the `sidd` project.
2. Open the OAuth client "Web client (auto created by Google Service)".
3. Add `https://siddhartharaja.github.io` to Authorized JavaScript origins.
4. Paste the Client ID into `GOOGLE_CLIENT_ID` in `js/firebase-config.js`, push.
5. Settings → Connect Drive, and allow the one permission.

Uploaded images are set to "anyone with the link can view" so the app can render
them back. That is a genuinely public link — fine for artwork you are about to
post anyway, worth knowing for anything you would not.

**Firebase Storage.** Seamless, but projects created after late 2024 need the
Blaze pay-as-you-go plan, which needs a card even though the free allowance would
cover this easily. Left in as an option, not the default.

**This device only.** Files kept in the browser, under 1.6 MB each. Instant and
private; does not reach your phone.

### Pasting a link always works

Every attachment box has **Paste a link instead**, inline. A Google Drive share
link previews exactly like an upload — the file id is pulled out of any of the
URL shapes Drive produces. Anything else is kept as a link you can open. This
path needs no permission, never expires, and is the fallback if Drive is having a
day. If a Drive image fails to load — usually because it was never shared — the
tile quietly turns into an "open" link rather than a broken image.

## Notifications

Sid is a static site. Nothing is awake at 8am to decide what to tell you, so the
work is split in two:

- **The app writes a plan.** Whenever you open it, `js/push.js` builds a 45-day
  schedule — "on the 18th, say this" — and stores it in Firestore under
  `users/<uid>/data/push`. Every piece of release logic stays here, where it
  already lives.
- **A GitHub Action sends it.** `tools/notify.mjs` runs once a day, reads the
  plan, sends whatever is due today, and stops. It knows nothing about releases,
  T-offsets or platforms, so there is only ever one copy of the logic to be wrong.

What gets sent, each switchable in **Settings → Alerts**:

| Kind | When |
|---|---|
| `morning` | one digest, only on days that actually have something due |
| `pitch` | 21, 14, 10 and 8 days out, until the pitch is marked submitted |
| `release` | release eve, release day, and the day after (log the numbers) |
| `weekly` | Sundays — ten minutes of review |

At most one per kind per day. A morning digest and a release alert are different
things; three morning digests are a reason to turn notifications off.

### The honest failure mode

The plan only reaches 45 days ahead. If you do not open the app for six weeks it
runs dry and notifications stop — silently, because there is no server to notice.
Settings shows how far the plan reaches, and the health check warns when it is
inside a week of the end. GitHub also disables scheduled workflows after roughly
60 days of no repo activity; it emails you first.

### One-time setup

1. **Firebase service account.** Firebase console → Project settings → Service
   accounts → *Generate new private key*. Open the downloaded JSON, copy the
   whole thing, and paste it into a repo secret named `FIREBASE_SERVICE_ACCOUNT`
   (GitHub → Settings → Secrets and variables → Actions → New repository secret).
2. **VAPID keys.** The public half is already in `js/firebase-config.js`. Put the
   private half in a secret named `VAPID_PRIVATE_KEY`, and the public half in one
   named `VAPID_PUBLIC_KEY`. The private key never goes in the repo.
3. **Turn them on.** Open the app on your phone, Settings → Alerts → *Turn on
   notifications*, accept the browser prompt, then *Send a test one*.
4. **Check the Action.** GitHub → Actions → *Daily notifications* → *Run
   workflow*, with `dry_run` ticked. It should print what it would have sent.

The cron is `37 2 * * *` — 08:07 IST. Deliberately off the hour: GitHub's
scheduler is best-effort and the top of the hour is the most congested minute of
the day, so an off-hour time drifts less.

## Check for problems

**Settings → Backup**, at the top. `js/modules/health.js` reads your actual data
and lists what will embarrass you in public or cannot be undone:

- unfilled `[placeholders]` — these post verbatim, the most visible mistake here
- captions over the platform limit
- the Spotify pitch still unsubmitted inside 21 days
- a release date that is not a Friday
- execution mode with no release date set
- core assets that never passed a spec check
- follow-ups past due, placements not checked in a fortnight
- uploaded files that were never shared, so they will not preview
- a notification plan about to run dry, no weekly review written

Every row says what is wrong, why it matters, and links to the place to fix it.
Nothing in it is a style opinion and there is no score.

## Keyboard shortcuts

Press <kbd>?</kbd> anywhere for the list. <kbd>Esc</kbd> closes the nav drawer and
any open sheet.

## Duplicating an item

Every item editor has **Duplicate** — a deep copy, marked draft, named "(copy)".
Faster than retyping a caption you want three variants of.
