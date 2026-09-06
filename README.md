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
