# Siyagah — project memory

Read this first, every session. It is the standing brief, and it is meant to
stay short enough to read in full before starting work.

**Current version: v04.06.** Live at `siyagah.github.io`, served from `main`.

**The round-by-round build log lives in `CHANGELOG.md`.** Open it only when you
need the background of one specific feature. The five most recent rounds are
below, because recent context is usually what a round actually needs. History
must never accumulate here instead of there.

### The five most recent rounds

- **v04.06** (4 Sep 2026) — this brief, `CHANGELOG.md`, and `tools/`: the first
  thing in this repo that measures rather than guesses. No app behaviour
  changed. 33/33 app checks and 11/11 ship checks pass against v04.05.
- **v04.05** (4 Sep 2026) — the web app manifest and real icons, which had been
  missing entirely.
- **v04.04** (4 Sep 2026) — note templates, starting with Jumu'a Khutbah.
- **v04.03** (3 Sep 2026) — folder text styling in the pop-out browser; its
  scope button matched to the Title-pane button.
- **v04.02** (2 Sep 2026) — automatic dated backups of the whole app *and* the
  notes, written to a folder chosen once via the File System Access API.

---

## What this is

Siyagah ("My Knowledge Notebook") is a personal notes app that ships as **one
self-contained HTML file**. No build step, no package manager, no framework.
`index.html` is the whole application — markup, CSS, and about 17,600 lines of
plain JavaScript in a single inline `<script>`.

```
index.html          the entire app
manifest.json       web app manifest (PWA install metadata)
icons/              app icons + manifest screenshots
sw.js               service worker (network-first, cache name = app version)
tools/              the verification harness — see tools/README.md
legacy/v03.99/      a sealed, frozen build — never edited
CHANGELOG.md        the full history
```

It saves in four places: `localStorage`, a linked local file (File System
Access API), a manual `📦 Save File` export that bakes the notes into a copy of
the app itself, and Firebase Firestore for cross-device sync behind a Google
sign-in.

**One user, one Google account.** The notebook is keyed by Google UID; there is
no sharing, no second person's data, no multi-tenant anything.

## The owner is a non-coder

They cannot read code and cannot verify code. They can only check things by
clicking, when told exactly what to click — and long click-throughs will not
happen. **Anything that ends with "please test this" may never actually get
checked**, so verify mechanically wherever a check is possible, and keep the
manual list to one or two things.

Write in plain language. One-line gloss on any jargon. Say what was done, what
is pending, and — always — **what was not done and why**.

## How to work

- **Finish the job by landing it on `main`.** Commit to the session's branch,
  push, open a pull request, merge it. No permission needed for any of that,
  nor for ordinary building, fixing, file edits or running the tools. Use a
  merge commit, matching the existing history. Do not stop at "pushed to a
  branch" and ask what to do next.
- **Ask only about real design decisions** — an ambiguous request, a genuine
  "which approach", something that changes what the app *is*. Not permission.
- **Every round bumps the version and writes a `CHANGELOG.md` entry.**
- **Confirm before anything genuinely destructive** — rewriting history,
  deleting data, force-pushing over someone else's work.
- **Diagnose before changing.** State the blast radius. If a plan proves wrong
  mid-build, stop and say so rather than shipping something known to be poor.
- **Measure, don't guess.** Run `tools/ship-check.mjs` and `tools/app-check.mjs`
  before every push. A screenshot is not a measurement; neither is reading the
  source and reasoning about it.
- **Must work on phone, tablet and desktop.** The app has three genuinely
  different layouts (<640px, 640–1199px, 1200px+).

## The rules that must never be broken

| # | Rule |
|---|---|
| **I1** | **No note, folder or section is ever lost or silently changed** — through a sync merge, a migration, an export, or opening an older saved copy. The one exception is a deletion the owner makes deliberately, which still goes via Trash. |
| **I2** | **Cross-device sync keeps working.** A change on the phone reaches the laptop unprompted. `mergeDB()` unions both sides and the newest edit wins — it never picks a winning device. |
| **I3** | **It works offline and as an installed PWA**, and a new version actually reaches the device instead of a stale cached one. |
| **I4** | **A downloaded copy still opens years from now** — from disk, offline, with no `/icons/` and no network — and still shows the notes baked into it. |
| **I5** | **The version bumps every round, in all three places** (see below). |
| **I6** | **`legacy/**` is sealed.** No feature, no fix, no refactor, no version bump, ever. |
| **I7** | **`<script id="nd">` is preserved through every edit.** It is where Save File writes the owner's notes. |
| **I8** | **Migrations are additive and run once.** Back up what they replace (`DB._tabsV1` is the pattern); never discard the old shape. |

### The version rule (I5) in full

Format `XX.YY` — bump `XX` for a major feature or upgrade (resetting `YY` to
`00`), `YY` for enhancements and fixes. Most added features have been `YY`.
The new number must land in **all three** places or the update never reaches a
device:

1. `<meta name="app-version" content="XX.YY">` in `index.html` — the source of
   truth everything else reads.
2. The ` vXX.YY` placeholder on the `.sb-logo` line (search `app-version-tag`).
   Boot overwrites this from the meta tag, so it is only the pre-boot paint —
   but a stale value shows the old number for a frame.
3. `VERSION` in `sw.js`, as `'vXX.YY.01'`. That string is the cache name. If it
   does not change, the service worker keeps serving the previous build's files
   and the update never arrives.

`node tools/ship-check.mjs` checks all three, and that the number moved past
`origin/main`.

## Verifying a change

```bash
git fetch origin main          # origin/main goes stale in a fresh session
node tools/ship-check.mjs      # ~1s, no browser
node tools/app-check.mjs       # ~30s, drives the real app in Chromium
node tools/probe.mjs --views   # not a test — dumps what a pane really renders
node tools/shot.mjs            # screenshots at phone / tablet / desktop
```

Both check files exit non-zero on failure. `tools/README.md` says what each one
proves and carries the harness's own traps — **read it before touching the
harness.** Playwright and Chromium are already present; nothing to install.

A failing check is a wrong assertion surprisingly often — investigate before
"fixing" the app. A check that describes what a round deliberately changed gets
**updated in place with the reason recorded**, never deleted or worked around.

## How the app is put together

- **Data** lives in a global `DB` (`folders`, `articles`, `sections`, `trash`,
  plus `DB.theme` for settings); UI state in `ST`. `persist()` saves.
  `DB.theme` is a free-form bag — new settings ride the existing localStorage /
  file-export / Firestore plumbing with nothing new to add.
- **Panes** — `renderTree()` (sidebar), `renderP2H()` / `renderP2C()` (article
  list), `renderP3H()` / `renderP3C()` (note header and body). `render()` calls
  them all. Most changes end with some subset of these.
- **The editor** is a `contenteditable` div: `#ed` in Pane 3, `.fw-ed` in each
  float window. `_edActive()` resolves which one is focused, `_edHost(node)`
  answers which editor a node is in, `insertAtCaret(html)` inserts into it.
  Script-driven changes fire no `input` event — call `_edTouched(el)` to nudge
  autosave.
- **Note content is raw HTML with no sanitiser.** Interactive widgets can live
  in a note's content; the pattern is `contenteditable="false"` chrome plus a
  delegated listener, and a repair pass that rebuilds what a copy/paste stripped.
- **Headings drive the outline.** `_edColHeads()` collects `h1`–`h4` for fold
  arrows and drag grips in the editor; `_initCollapsible()` does the same for
  the read-only view. Widgets containing heading-like lines need styled divs or
  an entry in those functions' exclusion lists, or they sprout arrows, grips,
  TOC entries and status badges inside themselves.
- **Anything on the edit toolbar belongs in two places** — Pane 3's
  `_p3EditIconsHTML()` and each float window's toolbar in `_fwRenderBody()`.
- **`sw.js`'s `CORE` is all-or-nothing.** `addAll()` rejects if one entry 404s,
  and the `.catch(() => {})` around it then silently skips the whole precache.
- **Declared `sizes` in the manifest must match the real pixels**, or Chrome
  drops the icon without saying so.

## Terminology

| Correct | Never |
|---|---|
| **Siyagah** — the app | not "the notebook app" |
| **Note** — one written item (`DB.articles`) | "article" is the code's word, not the owner's |
| **Folder** — a container for notes; nests | not "category" |
| **Section** — a top-level group of folders (`DB.sections`) | not "notebook" |
| **Smart View** — a virtual, read-only, filtered list (`SF`) | not "smart folder", not a real folder |
| **Note Type / NTI** — a note's single-select character (`art.kind`) | not "tag" — tags are separate and multiple |
| **Frozen build** — a sealed copy under `legacy/` | not "old version", not "backup" |
| **Save File** — the export that bakes notes into a copy of the app | not "download" |

## Decisions confirmed by the owner

| # | Decision |
|---|---|
| **D1** | **One user, one Google account.** No sharing, no second person's notes, no multi-tenant model. Confirmed 4 Sep 2026. |
| **D2** | **All four invariants I1–I4 are disasters, not annoyances**, and rank equally. Confirmed 4 Sep 2026. |
| **D3** | **"Never lost" excludes the owner's own deliberate deletion.** Deleting must keep working, through Trash. Confirmed 4 Sep 2026, correcting an over-broad reading of I1. |
| **D4** | **Every round is measured at all three screen sizes** (390×844, 820×1180, 1440×900) and against all four risk areas. The owner left the choice to Claude; both were cheap, so neither was narrowed. 4 Sep 2026. |

## Standing lessons — earned the hard way, do not relearn them

*(Empty by design. This is for rules about the app that cost a shipped defect
or a wasted round at least once. Add one the moment it is paid for, with what
it cost. Harness traps belong in `tools/README.md`, not here.)*
