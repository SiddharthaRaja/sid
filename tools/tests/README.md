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
    node tools/tests/typing-latency.mjs
    node tools/tests/renumber.mjs
    node tools/tests/order-by-date.mjs
    node tools/tests/no-title-on-text.mjs
    node tools/tests/clear-text-titles.mjs
    node tools/tests/one-day-each.mjs

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

**typing-latency.mjs** — typing felt laggy on a desktop and fine on a
phone. It was not a slow function: the JavaScript behind a keystroke
measured 1.2ms, the DOM was 679 nodes, and autogrow's forced layout cost
0.05ms. It was one CSS property. `.modal-root` carried
`backdrop-filter: blur(3px)`, so every frame that changed anything above
it made the compositor re-blur the whole viewport — and while you are
typing in a sheet, that is every keystroke. On a 1680x1050 window it
cost 40ms a keypress: 56ms with the blur, 16.7ms without. 16.7ms is one
frame, and it is also exactly what a bare textarea on a blank page
costs. The cost scales with the area blurred, which is why a phone
never showed it.

The budget this file holds: a keystroke in the app's editor must cost no
more than the same keystroke in a bare textarea created beside it, on
the same page, with the same text. It also refuses a `backdrop-filter`
on any surface you type into, reading the rule rather than the element
so it is caught even when nothing of that kind is on screen.

It carries one unrelated guard, because a screenshot found what the
route sweep could not: `.append()` is the native DOM method, and handed
a `null` it appends the *string* "null" into the middle of the sheet. An
optional row that is sometimes absent is exactly where that happens, so
the file opens an editor on eight platforms and walks the text nodes
looking for a bare "null" or "undefined".

**renumber.mjs** — retitling the X diary from the hashtag at the foot of
each entry. The reader originally wanted "#27" to be the very last
characters of the body. Real entries do not end that way: they sign off
with a row of tags, "#27 #shewont #newmusic", so every entry read as
unnumbered, the plan changed nothing, and tapping the button appeared to
do nothing at all.

It now reads the last line with anything on it, and takes the one
#number on it wherever it sits. The guards, each with a case here: that
last line has to BE a row of tags, so "I played it at #9 in the set"
does not renumber the entry to 9; a year is not an entry number, so
"#44 #2026" is 44; two different entry numbers on one line is refused
rather than guessed; "# 8" is the same tag as "#8". Plus the plan itself
— every hashtag found, unnumbered entries appended after the highest,
duplicates reported and sent to the tail, no body text edited, unique
numbers, the run left in order, a second run doing nothing, and the
titles surviving a reload.

The last group is about the screen rather than the rule: when nothing is
found it has to say so and show the line it actually looked at. "0
carrying a hashtag" reports the result and hides the cause, which is how
this shipped looking like it was broken.

Renumbering also moves the dates (same file). Retitling on its own left
entry 27 sitting on the day entry 1 used to have, so the run read
backwards — and the scheduler works the cadence out from this very run,
so it would learn nonsense from it. No date is calculated or invented:
the days already on those entries are collected, sorted, and handed
back out earliest day to lowest number. The assertions: the same set of
days comes back with none added or dropped, sorted by number the dates
run forwards, the lowest number holds the earliest day, a fixed
calendar date is left out of the shuffle, and `redate: false` retitles
without touching a date. One more checks the thing a store-level test
cannot: after a reload, the X screen itself lists them in the new order.

Renumbering also rewrites the number on the FIRST line of the entry.
The entries are written number-first — line one is the number on its
own, then the writing, then the tags — so a renumber that changed the
title and left that line alone produced an entry titled "Diary 17"
whose text still opened with 3. From the inside that looks exactly like
nothing happened, which is how it was reported twice. The case in this
file is the real entry, verbatim: title "Diary 3", first line "3", tag
"#17", dated T-28. All three end up saying 17 and the date lands on
T-14, where the seventeenth entry belongs. The writing between them and
the hashtag at the foot are untouched, and a first line that is prose
rather than a bare number is never overwritten.

One fixture bug here found a real one: the fixture wrote "T14" instead
of "T+14" and those entries silently dropped out of the re-date,
because `offsetOf` required the sign. The app always writes it, but a
hand-typed value would not, so `offsetOf` now accepts either. That is
strictly more permissive — nothing that parsed before parses
differently.

**order-by-date.mjs** — the list is ordered by when the thing goes
out. Change an entry's T-value and it moves to where that date puts
it: no button, no save step, because the order is read from the dates
rather than stored alongside them. An undated item stays at the top
rather than vanishing to the bottom of a hundred rows, and a fixed
calendar date sorts on the day it lands on, interleaved with the
offsets instead of sitting in its own block. It applies to every
content list, not just the diary.

The assertion that matters most: the stored order is untouched. This
is how the list is READ, not a rewrite of your data, so there is
nothing to undo and nothing that can be lost if it is wrong.

**no-title-on-text.mjs** — on X, Threads and Bluesky a post has no
name, it is just the text, so the Title / label box is not shown
there. Everywhere else still has it.

The box is HIDDEN, never cleared, and most of this file is about that
one distinction. `item.title` is what carries "Diary 17": the
numbering reads it, the ordering reads it, the renumber reads and
writes it. So the tests open an entry on each of the three platforms,
edit the text, close the sheet, reload, and check every title is
character-for-character what it was — not blanked, not rewritten — and
that diaryNo() still reads 1, 2, 3 off them afterwards. A new post
saves with an empty title, as it always did, and the list row falls
back to showing its text.

**clear-text-titles.mjs** — every title on X, Threads and Bluesky is
cleared, once, on launch. Taking the box away left the titles already
on older entries stranded: still showing, no longer editable, and
half-cleared is worse than either state.

Only the title. Most of this file checks the rest: the text is
character for character what it was, and so are the dates, statuses,
tags, notes and attachments; nothing is added or removed; a snapshot
goes down first and it does not run twice; Instagram keeps its titles.

Two things followed from it. With no title, a row would have shown the
same words as its own heading and its preview, so an untitled row is
now headed by its first line and previews from the second. And the
diary number could no longer be read from a title, so `diaryNo()`
reads the first line of the entry instead — which is where it has
always also been written — and falls back to a title only when there
is no number there. The first line wins over a leftover title, because
a stale title would answer with a number that is no longer true. For
the same reason renumbering stops writing titles: putting one back
would recreate exactly what was cleared.

**one-day-each.mjs** — the diary is one entry a day, and hand-editing
dates had left duplicates: two entries on T+6, a gap at T+7.

Two parts. A one-off pass on launch walks each text platform's diary
in the order it already reads and hands the days back out from T-30,
one each. Only entries already carrying a T-offset take part: one
pinned to a real calendar date keeps it and an undated one stays
undated, because those are choices rather than accidents. A snapshot
goes down first and it does not run twice.

Then it stays that way. Re-date an entry to T+9 and whatever was on
T+9 becomes T+10, the old T+10 becomes T+11, and so on — the entry
you moved takes the day you gave it and nothing ends up sharing.
Moving into a free day pushes nothing, because there is no room to
make. One test drives that through the editor itself rather than the
function, since the push is worth nothing if it is not wired to the
box you actually type in.

As everywhere here, the assertions that matter are the ones about
what did NOT change: every body character for character, the
statuses, and the count.

A note on how a row reads, since it changed twice. With no title, the
row is headed by the first line of the entry that actually says
something — a line holding only the entry's number is not a heading,
so it moves to the meta line beside the date. The heading is never cut
to a character count: an 80-character slice landed mid-word with no
ellipsis, which is what made the list look broken. The full line goes
in and the CSS trims it, over two lines, so far more is readable. The
preview picks up from the line after the heading, so the same words
never appear twice in one row.
