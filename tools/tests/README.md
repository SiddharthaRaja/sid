# Data-safety tests

These exist because three hours of writing were lost on 22 Sep 2026.
Each test reproduces a specific way that happened. Run them before any
release that touches `js/store.js`, `js/local.js`, `js/backend.js` or
`js/ui.js`.

## Running

    # serve a copy with the Firebase keys blanked, so it runs in local mode
    cp -r . /tmp/sidlocal
    sed -i 's/apiKey: *"[^"]*"/apiKey: ""/; s/projectId: *"[^"]*"/projectId: ""/' /tmp/sidlocal/js/firebase-config.js
    (cd /tmp/sidlocal && python3 -m http.server 8778 &)

    node tools/tests/lint-slice-ids.mjs        # static, no browser
    node tools/tests/persistence.mjs
    node tools/tests/persistence-hostile.mjs
    node tools/tests/audit-regressions.mjs
    node tools/tests/audit-round2.mjs
    node tools/tests/audit-round3.mjs
    node tools/tests/audit-account-switch.mjs
    node tools/tests/journal-and-file-backup.mjs
    node tools/tests/restructure.mjs
    node tools/tests/ui-pass18.mjs
    node tools/tests/diary-fill.mjs
    node tools/tests/text-size.mjs
    node tools/tests/daily-use.mjs
    node tools/tests/enter-to-done.mjs
    node tools/tests/autocorrect.mjs

## What each one holds the line on

**lint-slice-ids.mjs** — every `field()`, `selectField()` and
`checkbox()` must declare which slice it edits. 58 of them did not. The
edit was never saved, and `S.touch(undefined)` jammed the dirty set so
the app showed a permanent false "saves are failing" banner.

**persistence.mjs** — an edit is on the device within 400ms and
survives a reload; snapshots are written locally and can be restored;
export/import round-trips; accounts are namespaced; pre-upgrade data is
migrated, not lost; hiding the tab flushes synchronously.

**persistence-hostile.mjs** — swaps in a deliberately broken
`backend.js` at the network layer and runs the real store against it:
a cloud write that never returns, a cloud that cannot be read at all,
a stale device copy, a stale cloud copy, and a second `loadAll`. The
first of these is what actually happened.

**audit-regressions.mjs** — one test per bug found in the September
audit: unknown slice ids, object identity across a sync, `removeFrom`
never deleting the wrong record, malformed imports, two-tap deletes,
sheet fields saving without a Save button, and weekly reviews saving
from the first keystroke.

**audit-round2.mjs** — the failure modes found by auditing the FIRST
rewrite. Nothing may be written before the store knows whose account it
is (a lyric typed on the sign-in screen went into an unowned bucket and
was dropped after saying "Saved"); a failed boot may not leave the app
able to seed blanks over real cloud data; a write that can never
succeed — over Firestore's 1 MB document cap, or malformed — is stopped
and named instead of retrying for ever behind a message blaming your
connection; only one cloud write per section is ever in flight; a cloud
copy dated in the future cannot overwrite the device copy; a stamp
cannot go backwards; a second tab's conflicting write is kept as a
snapshot; snapshots are still taken when part of the app is unreadable;
legacy data is claimed by one account and never copied into another;
pruning is per account; an oversized slice spills to IndexedDB and is
still included in every export; the recording store cannot hang.

**audit-round3.mjs** — the issues found by reviewing the SECOND
rewrite. An edit typed while a slow save is in flight is re-queued
rather than dropped or delayed to the sweep; a slice that stops
spilling releases its IndexedDB copy; a future timestamp is clamped
when there is no local copy to prefer; flushAll waits for a device
write that had to spill.

**audit-account-switch.mjs** — the signed-in email is shown rather than
the display name, and switching Google account is flagged on the next
open even when the new account has data of its own. Being signed out is
impossible to miss (you get the sign-in screen); being signed into the
WRONG account used to have no symptom at all.

**journal-and-file-backup.mjs** — the two extra layers. The append-only
journal survives the mirror being corrupted AND its database being
deleted, because it lives in its own; it is throttled so typing does
not log every keystroke; the last thing typed before closing is logged
regardless of the throttle; a version can be put back; an import logs
what it is about to replace; it is capped, and can be switched off. The
live backup file writes the whole state then closes (never a truncated
file over a good one), reports a failure instead of swallowing it, and
degrades honestly on a browser that cannot do it.

**restructure.mjs** — the navigation. The phone opens on Social, not
on a list of invented deadlines; the bottom bar is the six categories;
Today is gone and its old link falls back rather than erroring; each
category is a grid of tiles that link to real pages and say what is
inside; the invented seeds are removed exactly once, after a snapshot,
and never re-seeded; reference material that never claimed a date is
left alone; the calendar holds only what the user added; its filter is
four group chips with the per-platform switches folded away.

**ui-pass18.mjs** — a platform page opens straight onto its tabs with
no header block, and the handle/profile-URL fields live on Setup and
still save; all eight platforms checked behave the same; a playbook is
one continuous article with a jump list, no section tabs and no
prev/next pagers; More can be starred, starring does not open the
thing, the choice survives a reload and un-stars again; the capture
button clears the bottom bar on every screen; the page is pure black
with surfaces still distinguishable from it.

**diary-fill.mjs** — run against a faithful copy of the real data (31
entries on X, T-30 to T+1). Slots are laid out to 100 on all three
text platforms; the 31 written entries keep their text, dates and
order and are never tagged as generated; new slots carry the number on
their own first line; the dates continue the run by the MEDIAN gap, so
one skipped day cannot compound (the mean put entry 100 two days late);
all three platforms share X's dates; it never runs twice and creates no
duplicates; a snapshot is taken first; undo removes only slots still
holding nothing but their number; and with no diary on X to extend,
nothing is invented anywhere.

**text-size.mjs** — the interface scale. A field is no longer forced to
16px on every phone (that is an iOS zoom workaround and it made every
Android form oversized); iOS still gets it, so Safari will not zoom the
page. The Settings control moves the whole scale — labels, headings,
captions and inputs together, with nothing left behind at a hard-coded
size — and the choice survives a reload.

## The layers, in order of what they survive

1. **localStorage mirror** — a refresh, a crash, the cloud being down.
2. **IndexedDB snapshots** — a bad edit, a bad import, an hour ago.
3. **The append-only journal** — a bug in layers 1 and 2. Own database,
   never overwrites.
4. **The live backup file** — clearing site data, browser eviction,
   losing the browser profile. Outside the origin entirely.
5. **The downloaded JSON** — losing the computer.
6. **Firestore** — losing the device, and getting to the phone.

Each one exists because the one above it can fail. Do not remove a
layer because the one above it looks reliable; that was the original
mistake.

## The one thing to remember

Every test here exists because the behaviour it checks was once wrong.
If one starts failing, do not adjust the test.

**daily-use.mjs** — a day of actual use, end to end, rather than a unit.
Open the app and be told which diary entry is due; find out per platform
how many are owed, because X being current says nothing about Bluesky;
tap through to that exact entry; write it and watch the count follow.
While writing on one platform the other two versions of the same number
are there to read, folded shut, with no way to paste them across —
because the whole point is writing it three times in three voices.

It also does the rude things. A hundred entries are searched rather than
scrolled: typing `7` gives Diary 7 alone, not 7 and 17 and 70. Only
thirty rows are drawn at a time. An editor left open does not follow you
to the next page. A half-written entry survives the tab being killed
outright — no unload, no goodbye — and everything is still there after a
reload, which means something here only because the harness seeds once
instead of on every navigation. A fresh install with no diary and no
release date is told nothing is due, because nothing is.

**enter-to-done.mjs** — Enter finishes an editor sheet and Shift+Enter is
the new line, which is the shape every messaging app has trained into
your hands. It holds the line on where that must NOT happen: a textarea
on a page (the notes panel, a lyric section in Notepad) still takes a
plain Enter, because there is no "done" for it to mean; Ctrl, Alt and
Cmd+Enter are left alone; an Enter arriving mid-composition is not stolen
from an IME, which would make the app unusable in scripts that need one;
and Enter never presses a Delete button, only a primary one. It also
checks the obvious thing — that what you typed is actually saved, after
a reload, rather than merely appearing to be.

**autocorrect.mjs** — the correction rule is a pure function, so most of
this file is a table: type a string one character at a time and check
what you are left with. Half the assertions are about what it must NOT
do. It never touches a #hashtag, an @handle, a URL, a domain, a token
with a digit in it, or a word already capitalised on purpose; it does
nothing mid-word, waiting until you finish; and it leaves alone the
words that are real English somewhere ("its", "lets", "ill", "id",
"were"), because an autocorrect that is right most of the time is worse
than one that is right every time.

Two of those rules exist because this suite caught the opposite. A full
stop used to end a word, which made "sid.app" two words and capitalised
the first; a colon did the same to "https://x.com". Only whitespace ends
a word now, and trailing punctuation is trimmed instead. A fixed typo
also used to lose its sentence capital.

The rest: it runs on real keystrokes in a real field, the caret stays
where you left it, the corrected text is what gets saved, one undo
reverses it, both switches work independently and persist, 120 words
cost under 700ms, and — the one that matters most — opening a
three-week-old entry does not alter a character of it.
