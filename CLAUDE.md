# Siyagah — project memory

Read this first, every session. It is the standing brief, and it is meant to
stay short enough to read in full before starting work.

**Current version: v04.37.** Live at `siyagah.github.io`, served from `main`.

**The round-by-round build log lives in `CHANGELOG.md`.** Open it only when you
need the background of one specific feature. The five most recent rounds are
below, because recent context is usually what a round actually needs. History
must never accumulate here instead of there.

### The five most recent rounds

- **v04.37** (19 Sep 2026) — a CORRECTION round. An independent review of
  v04.36 returned **DO NOT MERGE OR DEPLOY** with four blockers, and was right
  about all four; two of them were **safety claims I had made and not
  proved**. **"Nothing was discarded" was true of one path out of four**:
  `_repairDB()` sets malformed bytes aside at `db._salvage`, but
  `mergeDB(local,remote)` starts `Object.assign({},local)` and merges a named
  list, so `remote._salvage` was never carried — measured, the bytes are on
  the input object and `null` in `DB` and localStorage one merge later, and
  the same for an imported file. `_mergeSalvage()` unions both sides now,
  keys are collision-safe (`where.collection@<iso>#<hash>`, because two
  devices wrote the same key), and bounding drops the **value** while keeping
  the **record** (size, hash, `prunedAt`) — because silently losing an entry
  is the fault the mechanism exists to prevent. **Cancel was wired to Replace
  All**: both importers asked `OK = Merge, Cancel = Replace All` in a native
  `confirm()`, so the instinctive way out of a dialog was the one action that
  cannot be undone. Three separate buttons now, Cancel focused, Escape and
  backdrop cancelling, Replace behind a second confirm — every exit measured
  on **storage bytes**. **The recovery copy was an action, not a file**:
  `exportFile()` clicks an anchor and revokes the URL in the same call, so
  "a safety copy was taken" proved nothing, and was said immediately before
  wiping the notebook. It is an IndexedDB snapshot **read back in a separate
  transaction** now, compared by length and hash, restorable from `🛟 Safety
  Copies`, with a hash-mismatched snapshot refused. **CI had been failing
  since it was added** — `npx playwright install` installs no importable
  package, so both runs measured **58 checks instead of 589** and reported 35
  import failures as app defects. Two worse things behind it: `audit-all`
  **wrote a plausible 90-row matrix from a run that measured nothing**, and
  `ship-check` **passed 11/11 while silently skipping** the version and I6
  comparisons. Both now say so. Plus the sanitiser inverted to an allow-list
  of what a note is MADE OF (12 vectors had got past the old one; 20 tested
  now, unknown elements **unwrapped not deleted**), and **rollback evidenced**
  by running the real v04.34 and v04.35 builds out of git against a v04.37
  notebook, both directions. **642 checks** across 15 suites, 311 matrix rows,
  0 FAIL. Report: `audit/CORRECTION-AUDIT-2026-09-19-v0437.md`.
- **v04.36** (19 Sep 2026) — not a feature round: Phases 0–10 of the owner's
  **Master Audit and Continuous Build Plan**. v04.35's report was re-measured
  rather than believed — a detached worktree at `ba6c70f` shows the note
  **emptied** on tablet and desktop and **8/8** residue kinds in both exports,
  against `note intact` and **0/8** on the candidate — and then seven more
  defects came out, every one in a state no check had ever put the app in.
  **A damaged notebook took the whole app down and overwrote what was still
  readable**: `seedDB()` is always well-formed, so all 286 checks had only
  measured a happy boot; `articles` arriving as a string threw in
  `_mergeById`, aborted boot, painted an empty screen and saved *that* over
  three intact folders (and aborts a sync pull the same way, I2). `_repairDB()`
  now runs on every side of every merge — stored, embedded, **remote** — and
  discards nothing: a non-list collection is kept verbatim under `DB._salvage`,
  and a record with no id keeps all its content and is *given* one.
  **A real folder name still reached the Deploy Export**: v04.35 generalised
  body's CHILDREN and left the inside on a seven-id list with no `#p2h-path`
  in it. Now every LEAF container's markup is snapshotted **during script
  parse** (the existing snapshot runs AFTER the first render — `tree` was
  already 8,215 bytes of real folder names) and only leaves, because blanking
  an ancestor destroys the descendants the restore writes into, **the live
  editor among them**. **A folder could be moved inside its own descendant** —
  the guard was written down four times in callers and never in either mover —
  making a RING from which three folders and their notes vanish, and
  `pathOf()` spins forever. Plus: `importBackup()`'s Replace All took **no**
  recovery copy; `importJSON()` gained **Merge** (owner Decision 4); paste and
  import are now a **sanitisation boundary** (stored content still renders
  raw, by design); and **30 of 55 controls could only be reached with a
  mouse** — two delegated rules fix that everywhere at once. **589 checks**
  (up from 327) across 13 suites, a 260-row Feature Coverage Matrix and a
  1,282-function Inventory, both **generated, never written**. Reports:
  `audit/RELEASE-AUDIT-2026-09-19.md`. **Still the owner's to decide:** the
  sealed `legacy/v03.99/` residue (I6), and the live Firestore Rules.
- **v04.35** (18 Sep 2026) — not a feature round: the owner asked for Siyagah
  to be prepared for an independent audit, so the app was read cold and
  measured against its OWN rules. `origin/main` was green — 266/266 and 11/11
  — and three defects came out of it, every one in a gap in what the harness
  ASKED rather than something it asked and got wrong. **A note open in a
  pop-up could be silently emptied (I1)**: since v04.00 every new note opens
  as a pop-out, so `✏ Edit` in Pane 3 behind it built a rival EMPTY `#ed` on
  the same note; typing went to the pop-up, and the next `selFolder()` had
  `saveArt()` commit the stale empty editor over the live note — measured with
  real clicks, emptied at tablet and desktop, the phone escaping only because
  its sheet COVERS the button. F3's "hand-over, never duplicate" is now
  enforced in BOTH directions (`_fwRaise()` shared by the two routes), with
  `saveArt()` flushing the owner as defence in depth. **The deployed file was
  carrying private note titles**: 13,805 bytes of serialised session residue
  had been committed — four Google sign-in iframes with the API key, a
  `#tab-picker` holding four REAL note titles and ids, the owner's notebook
  id, and an extension's widget — through a door the v03.80 allow-lists never
  closed (rule 1 removed `<script src>` but not `<iframe src>`; rule 4 matched
  a class on a node that had only an id). Replaced by the general question:
  `_snapshotShell()` records `<body>`'s children at `DOMContentLoaded` and the
  export drops every child that was not there, so it NAMES NOTHING and covers
  whatever is added next. **Importing a JSON backup replaced everything
  silently** — no count, no confirm, no way back, and it synced — now matching
  the `importBackup()` standard it sits beside, with a 📦 Save File recovery
  copy taken first. 286/286 app checks (up from 266) and 11/11 ship checks.
  **Left open for the owner, deliberately:** the SEALED `legacy/v03.99/` build
  carries the identical leak at a public URL, and I6 forbids editing it — the
  collision between "sealed forever" and "this is private data" is the owner's
  to resolve, not a call to make quietly (Finding 2b); plus two product
  decisions (does `✏ Edit` raise the pop-up or close it; should JSON import
  offer Merge). Full report in `audit/AUDIT-2026-09-18.md`.
- **v04.34** (12 Sep 2026) — "Now do same for the phone and tablet too.
  *Always do all platforms as adaptible. Don't wait for doing next.*" —
  which is now **D5**, and a standing lesson. The two pop-ups were gated by
  `window.innerWidth<900` in EIGHT places plus three
  `@media(max-width:899.98px){display:none}` rules; the reason was true once
  and never revisited, so a TABLET — where touch drag and resize were
  deliberately built in v03.NotePane.T4 — was excluded from a feature nobody
  had decided to exclude it from. One `_popTier()` decides the SHAPE now and
  never says no: **`window`** (≥640px) is the floating, draggable,
  resizable pop-up exactly as it was, and a tablet simply gets it; **`sheet`**
  (<640px) is the same editor as a card pinned edge to edge, 6px gutters, no
  drag, no resize, with a 44px ✕ — because the panel's backdrop at that size
  is a 6px frame and not a way out. Multi's "several at once" is honoured by
  a **switcher bar**: one chip per open note, the front one marked, `✕ All`
  at the end, and the sheets shortened so it covers nothing. The buttons stay
  OFF the phone's bars (v04.22 spent three rounds getting them to one row) and
  are named rows in the `⋯` card and a new **POP IT OUT** group in the `+`
  menu, from one builder. Three things the gate had been hiding: Contents and
  the Pinned Tabs sidepane took **184px of a 378px sheet**, and the edit bar's
  ◀ / 📁 called `showPane()` under a fixed z-5001 panel. A sheet never writes a
  remembered frame — 378×832 measured on a phone would otherwise be restored
  on the laptop. 266/266 app checks (up from 255, with five updated in place
  and two REVERSED with the reason recorded) and 11/11 ship checks.
- **v04.33** (12 Sep 2026) — one screenshot of the read bar, two asks.
  **"Let the Multi and single button be present in the edit mode as well"** —
  measured on `origin/main`, they already WERE, since v04.10. What differed
  was the treatment, and every rule that made the difference was scoped
  `#p3h:not(.editing)`: read mode gave them `--gold`/`--green`, opacity 1 and
  their word; edit mode gave them the bar's grey at .55 with no label, ever.
  Both modes now, with only the SIZES still differing. The words were `false`
  on the edit bar since v04.10 for "crowding" that was never measured — they
  cost 61px and 70px and the bar carries them whole from **1600px**; below
  that `_p3FitEditBar()` folds them by asking *does carrying them add a line?*,
  because `.p3h-unified-tb` WRAPS and `scrollWidth>clientWidth` is always
  false on it. Extending the fit to edit mode also stopped `p3h-nolbl`
  leaking in from the last READ-mode fold and silently deciding the edit
  bar's layout. **"Let the pop-up note opens in edit mode"** — the two modes
  had disagreed since v03.74: a Multi pop-up was always an editor, a Single
  one opened read-only every time (`selArt()` clears `ST.editing`) and threw
  you out of edit mode if you were in it. Both open on the editor now, and a
  new Multi window opens with the caret already in it. And the defect this
  would have made worse: F3's **"hand-over, never duplicate"** was enforced
  only for the panel, so popping out of Pane 3's editor left `#ed` and
  `.fw-ed` both live on one note, both on autosave — measured on
  `origin/main` at v04.32, fixed here. 255/255 app checks (up from 236) and
  11/11 ship checks.
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
audit/              audit reports, the four ledgers, and the repro scripts
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
- **Must work on phone, tablet and desktop — in the SAME round (D5).** The
  app has three genuinely different layouts (<640px, 640–1199px, 1200px+).
  "Adaptible", not identical: a phone gets the shape that suits a phone, and
  the round says what that shape is. **Never ship a feature on one platform
  and leave the others for later**, and never report a platform gap as
  deliberate unless the owner decided it — say which shape each layout gets,
  and build all three.

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
node tools/app-check.mjs       # ~2min, drives the real app in Chromium
node tools/audit-all.mjs       # ~12min, EVERY gate + writes the Feature Matrix
node tools/probe.mjs --views   # not a test — dumps what a pane really renders
node tools/shot.mjs            # screenshots at phone / tablet / desktop
node tools/inventory.mjs       # regenerates the Function Inventory from the app
```

`audit-all.mjs` is the whole gate in one command and it **assembles
`audit/FEATURE-MATRIX.md` from the checks that actually ran** — a matrix row
cannot be written by hand. The individual suites (`tools/audit-*.mjs`) are
still runnable on their own while iterating.

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
| **D5** | **Every feature ships on ALL THREE platforms in the round it is built — "always do all platforms as adaptible, don't wait for doing next".** Adapt the SHAPE to the layout (a phone gets a sheet where a laptop gets a floating window); never adapt by omitting the feature. A platform left out is not a scope decision Claude may take on its own. Confirmed 12 Sep 2026, after v04.33 shipped the pop-ups to the desktop only and reported the phone and tablet gap as deliberate. |

## Standing lessons — earned the hard way, do not relearn them

*(This is for rules about the app that cost a shipped defect or a wasted round
at least once. Add one the moment it is paid for, with what it cost. Harness
traps belong in `tools/README.md`, not here.)*

- **A safety claim is a measurement or it is nothing — and the path you
  happened to test is not the only path.** "Nothing was discarded" was
  written about `_repairDB()`'s salvage and was true of exactly one of the
  four routes it travels, because `mergeDB()` starts `Object.assign({},
  local)` and the other three arrive as the REMOTE side. The check that
  "proved" it asserted on the transient input object, which is the one place
  the value always exists. Assert on what is PERSISTED or EXPORTED, and list
  every route a value takes before writing a sentence about all of them.
  Cost: an independent reviewer found it in v04.37, one round after the claim
  shipped in a release report.
- **A destructive branch must never be the Cancel branch.** Both importers
  asked `OK = Merge, Cancel = Replace All` through a native `confirm()`,
  because a confirm can only carry two answers and the second action had to
  go somewhere. So the instinctive way out of a dialog nobody understands —
  Escape, Cancel, click-away — was wired to the only thing that cannot be
  undone. When a question has three answers it needs three buttons; and the
  safe one takes the focus, so Enter on an unread dialog does nothing. Cost:
  shipped in v04.36, caught by review before the owner ever pressed it.
- **"It did not throw" is not "it worked" when the work is in another
  process.** `exportFile()` builds a Blob, clicks an anchor and revokes the
  object URL in the same call; the browser may refuse the download or be
  interrupted and nothing raises. v04.36 called that a recovery copy and said
  so immediately before wiping the notebook. If a guarantee is needed before
  a destructive step, the artefact has to be WRITTEN AND READ BACK somewhere
  you control — and it has to be restorable, because a recovery copy nobody
  can restore from is not one. Cost: found in review, v04.37.
- **A check that cannot do its job must FAIL, never skip quietly.**
  `ship-check` reported **11/11** in a clone with no `origin/main`, having
  silently skipped both the version-bump and the `legacy/**` seal (I6) — the
  two comparisons it exists to make — because they were written as
  `r.pass(..., 'skipped')`. An independent reviewer was handed that green tick
  for a comparison that never happened. Its twin, the same day: `audit-all`
  assembled a normal-looking **90-row matrix** out of a CI run in which every
  browser suite had died at `import playwright` and nothing had been measured
  at all. A skip must be loud, opted into by name, and visible in the output;
  a run that measured nothing must say so in large letters. Cost: two false
  green signals in one round, both found by review rather than by us.
- **Run the CI you wrote.** The workflow added in v04.36 failed on its first
  run and its second, and nobody looked — `npx --yes playwright@latest
  install` downloads a browser and installs no importable package, which is
  invisible until something imports it. A workflow that has never gone green
  is a plan, not a gate. Add a step that proves the environment before the
  suite runs, so a missing dependency reads as one failure and not as 35 app
  defects.
- **An allow-list of dangerous things rots; an allow-list of what the thing
  IS does not.** The v04.36 sanitiser named `on*`, `<script>`, `javascript:`
  and foreign iframes — and `srcdoc`, `java&#115;cript:`, a tab inside the
  scheme, `<form action>`, `<base>`, `<meta refresh>`, `<object>`, `<embed>`,
  `<svg><use>`, `style="url()"`, `@import` and `data:text/html` all walked
  past it. Inverted, it keeps only the tags and attributes a note is made of
  — and **unwraps** anything it does not recognise instead of deleting it, so
  the words inside survive (I1) and a tag invented tomorrow is handled today.
  It is the same lesson as the export residue list, paid for twice.
- **A check that has only ever run on a well-formed fixture has never
  measured the state where the invariant is actually at risk.** `seedDB()` is
  always valid, so 286 passing checks had only ever measured a HAPPY boot.
  Ten shapes of damaged localStorage found three defects in one afternoon,
  the worst of which painted an **empty screen** and then wrote that empty
  notebook back over three folders that were still perfectly readable — I1,
  broken outright, under a fully green gate. Generate the bad states as
  deliberately as the good one (`corruptDBs()`, `synthDB({malformed:true})`),
  and remember that the same malformed shape arrives from a SYNC and an
  IMPORT too, not just from storage. Cost: found in v04.36; reachable for
  every round before it.
- **A rule written in the callers is a rule that is not in the code.** The
  "don't move a folder into its own descendant" guard existed **four times**
  — both drag handlers in the tree and both in the picker — and **not once**
  in `doMoveFolder()` or `pkMoveFolder()`, the two functions that actually
  perform the move. One direct call makes a RING, from which no folder has a
  root: three folders and every note in them vanish from the sidebar and
  `pathOf()`'s bare `while(id)` spins forever, with nothing thrown and
  nothing deleted. Same shape as v04.34's eight copies of
  `innerWidth<900`. When you find a guard, grep for the operation it
  guards, and put the rule where the operation is. Cost: caught in build in
  v04.36, but it had been reachable since the picker was written.
- **A general fix is only general up to the boundary you drew.** v04.35
  replaced the export's residue allow-list with the general question — but
  asked it of `<body>`'s CHILDREN only, and everything the app renders
  *inside* the shell stayed on a seven-id list. `#p2h-path` was not on it, so
  a real folder name kept riding out in a button's `title` into the file
  whose own comment promises visitors see no private data. When a round
  replaces a list with a principle, say out loud what the principle does NOT
  cover, and check that sentence. Two measurements paid for the second cut:
  the existing snapshot runs from `DOMContentLoaded`, which is **after** the
  first render (`tree` was already 8,215 bytes of real folder names), so it
  had to move into script parse; and it must record **leaves only**, because
  blanking an ancestor destroys the descendants the restore writes into —
  the live editor among them, during a Save File taken while the owner is
  typing. Cost: reported one round after Finding 2 was called fixed.
- **When a check fails, the first question is what the CHECK did.** Five of
  this round's first failures were the check, not the app: a pane below
  1200px is an off-canvas slide-over (`#sb.closed` is `width:0!important` at
  `left:-100%`, `display:flex` throughout), so "visible but 0px wide" was a
  pane doing its job; writing a damaged fixture with `setItem` and reloading
  measured **the app's own unload flush** rewriting storage from the DB it
  still held, which reads exactly like "the app wipes a damaged notebook";
  a 60-character slice of `#p3c` cut off before the note body began;
  `logContactAction(ev,aid)` takes two arguments and passing the id first
  returns at its own guard; and the starter database folders are identified
  by their SECTION, not an id prefix. Every one would have produced a "fix"
  to working code. The app is usually right; the new check usually is not.
- **A deliberate decision about the owner's own content is not a decision
  about content from a file.** "Note content is raw HTML with no sanitiser"
  is true and stays true — widgets depend on it. It was never a statement
  about HTML arriving through an IMPORT or a PASTE, and those two doors had
  nothing on them: an `<img onerror>` fires. Sanitise at the BOUNDARY, never
  at render (which would rewrite the owner's own notes and break the widget
  design), harden links where they are PAINTED (which stores nothing), and
  divert a paste only when the clipboard really carries code so ordinary
  pasting is untouched. Cost: found in v04.36; the doors had always been open.
- **Most of this app is wired as `onclick` on a `<div>`, and a `<div>` has no
  keyboard.** 30 of 55 visible controls on the landing view could only be
  operated with a mouse. The fix is not to touch the hundreds of places that
  build that markup — it is two delegated rules (a MutationObserver that adds
  `tabindex`/`role`, and one keydown handler that turns Enter and Space into a
  click), so nothing can forget. The same shape as every other lesson here:
  when the answer has to be repeated in N places, it belongs in one.
- **A green harness means "nothing it asks is broken", never "nothing is
  broken" — and the app's own comments are the best list of what it forgot to
  ask.** `origin/main` was 266/266 and 11/11 when an audit read the app cold
  and found three defects, one of which silently emptied a note. Each had
  been reachable for rounds; none was in code a check covered. Two of the
  three were found by taking a comment at its word and testing it:
  `_cleanExportRoot()` says the drag ghost must be cleared because "it holds
  a REAL note title, which leaked private content into Deploy Export files
  that are meant to be empty shells" — so the question "what ELSE holds a
  real note title?" was already written down, and the answer (`#tab-picker`)
  had been sitting in the deployed file. `popOutNote()` says "hand-over,
  never duplicate" — so the question "is that enforced in the other
  direction?" was written down too, and it was not. When a round adds a rule,
  the same round should ask the rule of every direction and every surface it
  covers; and when a comment states an invariant, that sentence is a check
  waiting to be written. Cost: three defects shipped under a green gate,
  found in v04.35 only because someone read the app instead of the backlog.
- **A defect found by reasoning is a hypothesis; only the reproduction says
  what it is.** The v04.35 note-wipe was first "explained" three times over —
  `saveArt()` is missing `_flushEd()`'s `dataset.aid` guard (it is, but the
  guard would not have fired: `#ed` carries the right note id, it is merely
  EMPTY); then "navigating away wipes any popped-out note" (it does not — the
  order matters, and with `✏ Edit` pressed after typing the note is fine).
  Each wrong reading would have produced a fix that passed a check and left
  the defect in. What settled it was a trap on the property itself
  (`Object.defineProperty` on `a.content`, printing a stack on every write),
  which named `selFolder → saveArt` in one run. Reach for the trap before the
  third theory. Cost: nothing, because the fix was not written until the
  reproduction was — which is the only reason it is a lesson and not an entry
  above.

- **The owner's suggested FIX is a description of the problem, not a spec —
  measure whether it actually gets them what they asked for.** "Database can
  be moved up by removing 'attached' from the Folder button" was a correct
  diagnosis and an insufficient fix: the word is worth 52px, and with the four
  Attach rows flowing free, three fit the first line from 410px of screen
  while the fourth needs 537px. Every common phone lands in that gap, so
  removing the word MOVES the boundary and strands the same row. Shipping the
  literal instruction would have come back as "I asked for this already",
  which is the three-round pattern below. Do the thing they asked for, then
  measure the OUTCOME they described — across the range, not at one width,
  because a single width cannot show a gap. Cost: caught in build in v04.32,
  only because the range was measured before the change was called done.
- **A surface that was fixed everywhere else is still broken where no round
  has looked.** v04.29 sized the `+` menu's actions to their words, v04.30 did
  the read view's card, v04.31 the `⋯` card — and the full `⋯` menu behind
  them was still 21 rows of 155px hanging in a 167px column, because it is the
  one the owner reaches LAST. When a round establishes a layout rule, list
  every surface that layout rule applies to and say which ones this round did
  not do; "the menus are packed now" was true of three menus out of four for
  three rounds. Cost: reported by the owner in v04.32, three rounds after the
  rule was set.
- **A menu is anchored to its button, and the button is not in the middle of
  the screen.** Both header dropdowns are `right:0` on a wrap that sits near
  the LEFT edge of the sidebar, so widening the Tools menu to 238px hung it
  88px off the left of a 200px sidebar with every label cut in half. Nothing
  threw; `app-check` had 144 checks and not one of them had ever OPENED a
  menu, so the whole surface was unmeasured. Anything absolutely positioned
  has to be measured against the viewport after it opens — and a surface no
  check has ever opened is a surface with no checks, whatever the total says.
  The same fault wears a second costume: a CONSTANT instead of a measurement.
  `_openFloatPop()` pinned every popover to `bottom:60px` under 1200px, so a
  button at the top of a phone dropped its menu at the foot of the screen, and
  the desktop branch floated it off its button on any short window. Open the
  surface invisible, read its real size, place it against the real button, and
  clamp — never write a number and hope. Cost: v04.21 caught in build by a
  screenshot; the bottom sheet shipped and the owner reported it in v04.22.
- **One glyph, one job — and a bare glyph is not a label.** `≡` was Open
  folders in the nav pair and Lists in the format pair, three buttons apart on
  the same phone row, with a third `≡` on `≡ Preview` inside the `⋯` menu.
  Nothing was broken; it was simply unreadable, and the owner asked whether it
  made sense. Two rules: a glyph does ONE thing per screen (the guard is a
  sweep — every glyph-only control mapped to the function it calls, so it
  catches the next collision too), and anything in a MENU carries a word,
  because a menu is read by someone who did not write it (`🔖` alone, `❝`
  alone, `📦` alone). A bar may be terse; a menu may not. Render both forms
  from one table so they cannot drift. Cost: raised by the owner in v04.26,
  after `⋯` had already cost a round for the same reason.
- **When the owner repeats themselves, the reading is wrong, not the words.**
  "Everything on ONE bar in MOBILE" was answered three times: hide the tab bar
  when it is empty (it never is — they have tabs), then take two buttons off
  it, then finally stop rendering it. Each fix answered the narrowest possible
  reading of the last sentence instead of the standing instruction, and each
  one shipped and came back. When a request arrives for the second time, do
  not re-scope it smaller — re-read the ORIGINAL brief and ask what the whole
  of it requires; and say plainly which part is being left undone rather than
  quietly satisfying a fragment. Cost: three rounds on one instruction.
  **Its twin: an answer applied to one MODE is not applied to the app.** v04.23
  took 🏠 off the phone's EDIT bar because it landed on the same pane as the
  folder button; the READ bar kept both, and the owner asked the identical
  question about it in v04.31, eight rounds later. When a round settles a
  question about a control, ask it of every mode that renders that control, in
  the same round — and where the answer differs by mode, say so.
- **A control that MOVES has to leave where it moved from — and a surface
  that only appears when it has content must be measured with content.** v04.22
  put 📅 Calendar and ＋ Add Tab under the `+` menu and left both of them on the
  tab bar as well. The duplication was invisible for two rounds because the
  same round hid that bar while editing — but only when it was EMPTY, which is
  the only state the check ever ran in. The owner opened one tab and the bar
  came back with both buttons on it. Two rules, both paid for: when you say a
  control has moved, delete it from its old home in the same edit; and when a
  surface exists only in a state (a bar with tabs, a menu when open, a picker
  with results), SEED that state before measuring, or the check is reporting on
  something that was not there. Cost: reported by the owner in v04.24, one
  round after being announced as done.
- **A platform is not a scope decision. "Not on a phone" is almost always
  "nobody has decided what the phone shape is" — and the refusal will be
  copied everywhere.** The two pop-ups were gated by `window.innerWidth<900`
  in EIGHT places plus three `@media(max-width:899.98px){display:none}`
  rules, and the reason had been true once (a 320px-minimum window with a
  22px drag bar is useless on a 390px screen) and was never revisited — so a
  tablet, where the touch drag and resize had been deliberately built in
  v03.NotePane.T4, was excluded from a feature nobody had decided to exclude
  it from, and v04.33 reported the gap to the owner as deliberate. It came
  straight back as "now do same for the phone and tablet too" (D5).
  Two rules, both paid for: put the tier in ONE function (`_popTier()`) so a
  gate cannot be copied eight times and rot in seven of them; and when a
  feature reaches a platform for the first time, **list every surface it
  drags in with it** — Contents and the Pinned Tabs sidepane had never been
  drawn under 900px and took 184px of a 378px sheet the moment they could,
  and the edit bar's ◀ / 📁 called `showPane()` on a layout sitting under a
  fixed z-5001 panel. Cost: reported by the owner in v04.34, the round after
  being told the gap was on purpose.
- **A control that differs only in TREATMENT between two modes reads as
  absent in the dimmer one — and a CSS rule scoped `:not(.editing)` is a rule
  that exists in one mode only.** Multi and Single had been on the edit bar
  since v04.10; the owner asked for them to "be present in edit mode as well"
  because read mode gave them gold and green at full opacity with their word
  beside them, and edit mode gave them the bar's grey at opacity .55 with no
  label — the same DOM, in two different registers. When a round settles how
  a control should look, grep the selector you wrote: every `:not(.editing)`
  (or any other mode scope) is a decision you made for one half of the app
  without saying so. Its twin: a fit/measure function that RETURNS EARLY for
  the other mode leaves its class behind, so the mode it skipped is laid out
  by a measurement taken of a different bar — `p3h-nolbl` had been deciding
  the edit bar's button widths for a whole version series. Cost: reported by
  the owner in v04.33, thirteen rounds after the buttons shipped.
- **"It is on the screen" is not "the owner can find it".** The section-tools
  `⋯` sat exactly where the owner had asked for it one round earlier — on the
  versioning bar, after the date — as a bare glyph with no border, beside a
  grey date pill. They opened the note and asked where it had gone. A check
  that asks "is it painted, is it the right size, does it open" says yes to
  all three of a control nobody recognises. Give anything tappable a frame or
  a word, and put an action where its SUBJECT lives (collapse-all-headings
  belongs under `H`, not beside a date) — even if that means the same function
  appearing in two menus. Cost: one round's fix reported as a regression.
- **A variable that is used is not a variable that exists — and CSS fails
  silently either way.** `--hover` (56 uses), `--paper2` (7) and `--accent`
  (85) were referenced across the stylesheet and **defined nowhere**: 148
  declarations invalid, 56 hover highlights painting nothing, and 14 rules
  reading `background:var(--accent);color:#fff` — white text on no background
  at all, which is how `Save` in the quick-add bar came to be invisible rather
  than merely wrong. Nothing throws, nothing logs, and a screenshot of a
  not-hovered row looks perfect. The check that catches it asks the general
  question — every `var()` written without a fallback, does it resolve — so it
  also catches the next one. Cost: a whole version series of dead hover states,
  reported by the owner, with two thirds of the fault still unreported.
- **`--on-accent` is the ink for `--green`. `--accent` is `--green2`, and it
  is a colour for TEXT, not a background.** Writing
  `background:var(--accent);color:var(--on-accent)` is the obvious-looking
  pairing and the wrong one: `applyPaneInk()` derives `--on-accent` against
  `--green`, so on Amber it scored 3.3:1 and on a pale custom accent 2.9:1 —
  dark ink on a dark pill. The primary-button pair that has always been right
  is `.bp`'s: `background:var(--green);color:var(--on-accent)`. Cost: two
  failing checks in v04.20, caught in build only because v04.19's sweep
  already existed.
- **A colour emoji ignores `color`; a themed icon has to be a TEXT glyph.**
  `➕` on the quick-add badge painted its own colours instead of taking
  `--on-accent`, and the contrast sweeps skip emoji-only elements by design,
  so nothing failed — it arrived as a muddy shape on a dark green circle and
  only a screenshot found it. Use `✚`, `⬆`, `▤`, the glyphs the app already
  themes. Cost: one round's badge, caught before shipping.
- **Deriving a colour from the paper means deriving it from the paper it is
  ACTUALLY on.** A surface tint darkens the paper, so it eats the contrast of
  every ink written on it, and `--t3` is the ink on dates and count badges —
  which is to say, on hovered rows. Targeting 4.8:1 against the plain paper
  left it at ~4.2:1 the instant a row lit up, and the same held for `--green2`
  as link text. The rule that works: **the worst ink must clear 4.5:1 on the
  worst surface it lands on**, not on the surface it was named after. Pointing
  that at the shipped presets found **Ocean's `--t3` already at 4.38:1 with no
  tint and no custom colour** — v04.16 fixed the default preset's `--t3` and
  never checked the other four. Sweep all five, not just the one that ships.
- **The default theme is not exempt from measurement.** Three rounds of
  colour work all started from "the owner picked an unusual colour" — and
  when the sweep was finally pointed at panes 2 and 3, 14 of 36 pieces of
  text failed 4.5:1 with NO custom colour set at all: `var(--t3)` (#9A9289)
  at 2.7–3.1:1 on every date, every secondary button, every list label. Sweep
  the shipped theme first; the exotic settings come second.
- **An ink flip is only safe on a plain surface.** It worked for the sidebar
  (v04.15) and measured WORSE in a note (v04.16): a note's headings carry
  pale bands baked into the stylesheet, so light text landed on a light band
  at 1.0:1. Where a surface has decoration of its own, the answer is to keep
  the surface in the range its decoration assumes — lighten the chosen colour
  until dark ink lives on it, derive the inks from the result, and tell the
  owner what happened — not to invert the text and hope. A real dark mode is
  a round, not a variable.
- **A colour meant for paper is not a colour for the sidebar, and a RAISED
  layer costs a white label its contrast.** Half of what was unreadable in
  v04.15's sidebar was `var(--t2)` / `var(--green2)` — Pane-2 and Pane-3
  colours — used on a dark surface, at 1.4:1. And `📝 New Note` measured
  exactly 4.5:1 on a raised panel (white over the sidebar colour) against
  8.7:1 on a recessed strip: lightening a mid-tone background and then
  writing on it in white is the trap, and it is the same one the v04.14 pill
  fell into. The rule: in the sidebar, icon buttons ride `--sb-panel`,
  anything carrying WORDS sits on `--sb-strip`, and text uses `--sb-ink*`,
  never a `--t*` or a hex. Cost: one shipped round that fixed the header and
  left the list beneath it at 1.2:1.
- **Name nothing; sweep everything.** The v04.15 check walks every element in
  `#sb` that carries a word, composites the alpha layers behind it and scores
  the real contrast, in three states on five sidebar colours. Written that
  way it found four faults the eye had missed (the per-section Smart View
  rows, `＋ Add group`, and both search-result labels) and it catches the
  next fixed colour anyone adds. A check that names elements only proves the
  elements you already thought of.
- **A fixed colour in the sidebar is a colour that works until the owner
  changes one setting.** `--forest` is owner-settable (Appearance ▸ Custom
  colours), so the version number's hard-coded `#6A7F6C` measured 4.3:1 on the
  Forest preset and about 1.2:1 on the teal the owner actually had — reported
  as "the version number looks invisible". Paint sidebar chrome in translucent
  black or white over whatever colour is behind it, and measure the blend, not
  the swatch: lightening a mid-tone sidebar *lowers* contrast with white text
  (17% white → 3.8:1) where darkening it raises it (28% black → 8.4:1). Cost:
  a version number nobody could read for a whole version series. Fixed in
  v04.14, with contrast measured on two sidebar colours by app-check.
- **A flex item with `min-width:0` does not overflow — it disappears.** The
  first cut of the v04.14 header let the logo shrink, so "Siyagah" was squeezed
  to 0px while still in the DOM and `scrollWidth === clientWidth` said the row
  fitted. A measure-then-fold function that asks "did this overflow" measures
  nothing if the parts are allowed to shrink first. Make the row rigid, let it
  overflow honestly, and fold on the overflow. Cost: caught in build, but it is
  the same defect as v04.08's zero-width note-type chips, twice now.
- **"It did not throw" and "the menu is populated" are both true of a menu that
  was closed in the same tick.** The note toolbar's `⋯` handed `showArtCtx()` a
  synthesised event — `{clientX, clientY, preventDefault(){}, stopPropagation(){}}`
  — so the no-op `stopPropagation()` let the real click reach
  `document.addEventListener('click', () => hideCtx())`, which shut the menu
  instantly. Never synthesise an event for a handler that calls
  `stopPropagation()` or `preventDefault()` on it; pass the real `event`. And
  a check on anything that opens must ask **"is it still painted after a real
  mouse click"**, never "did the handler survive". Cost: v04.11 reported this
  button fixed, with two passing checks, and shipped it still broken. Fixed in
  v04.12.
- **An inline handler can name a real function and still be stone dead.**
  `onclick="showArtCtx({...},curA.id)"` on the note toolbar's `⋯` button
  referenced `curA`, a `const` local to `renderP3H()` — so every left-click
  threw `ReferenceError` and the button opened nothing, for a whole version
  series, while `oncontextmenu` right beside it worked because it interpolated
  `${curA.id}` properly. `app-check`'s handler scan cannot see this: the
  function name is real, the ARGUMENT is not. Inside a render function,
  interpolate every id into the handler string; never reference a local. The
  check that catches it clicks every visible button on the row and watches for
  a page error. Cost: a shipped dead button nobody reported, found only because
  the owner asked what it was for. Fixed in v04.11.
- **An HTML comment inside the inline `<script>` stops the app booting.**
  `<!--` puts the HTML parser into its script-escaped state, so a `<!-- ... -->`
  note written inside a template literal took the whole app down. Comments in
  the script are `/* */`, always. Cost: one failed boot in v04.11, caught by
  the checks immediately.
- **A fold order is only as good as the width you measured, and last round's
  numbers are not this round's.** v04.10 placed its new fold stage using
  v04.09's published figure for the type group (288px). On the row as it
  actually stood the group is ~188px, and the plan's conclusion — "the words
  will fit on a 1440 laptop" — was wrong by 27px in the direction that matters.
  Re-measure every stage of `_p3FitToolbar()` against the real row before
  choosing where a new stage goes; the fix is the measurement, never shaving
  pixels off a control to force the fit. Cost: one wrong assertion that failed
  the first run, caught before the round shipped.
- **A toolbar that must fit needs a fold order, not just a fit.** Wrapping
  never loses a button but turns sixteen controls into three stacked rows on a
  phone; a breakpoint fits one row but deletes what it cannot show. The answer
  that works is measure-then-fold: `scrollWidth > clientWidth` on the pane,
  then collapse whole same-type groups into palettes, least-missed first,
  never hiding anything without a palette that still reaches it. Cost: v04.08
  shipped the wrapping version and the owner's phone showed three rows.
  Fixed in v04.09.
- **Pane 3 is a column, not the screen.** In the three-pane layout Pane 3 is
  about 485px wide on a 1215px window, so `window.innerWidth` says "desktop,
  plenty of room" about a pane that has none. Layout that must fit inside a
  pane belongs to `flex-wrap`, or to a measurement of the pane itself — never
  to a window-width breakpoint. Cost: the first cut of v04.08 squeezed the
  note's type chips to zero width and they vanished from the screen while
  still being present in the DOM. Caught by a screenshot, not by a check.
- **A heading's first children are chrome, not text.** `_edColInit()` injects a
  `.ed-col-grip` and a `.ed-col-arr` at the front of every `h1`–`h4` in an
  editor. Anything asking "is the caret at the start of this heading" must
  skip them — use `_edPrefixText()`. Cost: the v03.67.01 "Enter writes above
  the first heading" rule shipped and then silently stopped firing the moment
  the chrome arrived, and instead split headings into stray `⠿▼` orphans.
  Nobody noticed for a whole version series. Found in v04.07.
