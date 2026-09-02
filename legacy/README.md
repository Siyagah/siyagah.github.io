# Frozen builds — do not edit anything in this folder

Each folder here is a complete, sealed copy of Siyagah as it was on the day it
was frozen. They exist so that a version of the app can never be lost to a
later change, and so there is always a working fallback if a new version
misbehaves.

| Build | Sealed | Opens at | State |
|---|---|---|---|
| `v03.99/` | 2 Sep 2026, the day v04.00 began | `/legacy/v03.99/` | Read-only archive |

## The rule

**Nothing in this folder is ever updated.** No feature, no fix, no refactor,
no version bump, no dependency change — nothing from v04.00 or any later
version may be applied to a frozen build. If a bug exists in `v03.99/`, that
bug is part of the record and stays. Work on the live app in `/index.html`.

## How a frozen build is kept safe

A frozen build shares an origin with the live app, so it reads the same
browser storage — that is deliberate: opening it shows your real, current
notes in the old layout. What it must never do is write there, because old
code serialises the notebook in its own older shape and would strip whatever
newer versions added. Each frozen build therefore carries two small guards,
added only at sealing time and marked as such in the file:

1. **Before the app script** — `localStorage.setItem`, `removeItem` and
   `clear` are replaced with silent no-ops, and service-worker registration is
   disabled. This has to run before the app boots, because boot itself saves
   (schema migrations call `persist()`).
2. **After the app script** — `initSync` and the cloud-push helpers are
   replaced with no-ops, so no Firestore connection is ever opened and nothing
   is pushed or pulled. A banner marks the build as an archive, and offers a
   deliberate, warned "Unlock editing" switch that restores **local** saving
   only. Cloud sync stays off even when unlocked, so nothing typed in an
   archive can ever reach another device.

`sw.js` in the site root also skips every request under `/legacy/`, so no
cache from any future version can serve newer code at an archive's URL.
