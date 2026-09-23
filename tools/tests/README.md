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
