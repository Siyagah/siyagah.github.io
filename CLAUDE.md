# Siyagah — project memory

Read this first, every session. It is the standing brief, and it is meant to
stay short enough to read in full before starting work.

**Current version: v04.15.** Live at `siyagah.github.io`, served from `main`.

**The round-by-round build log lives in `CHANGELOG.md`.** Open it only when you
need the background of one specific feature. The five most recent rounds are
below, because recent context is usually what a round actually needs. History
must never accumulate here instead of there.

### The five most recent rounds

- **v04.15** (11 Sep 2026) — the sidebar list reads on any colour too. The
  headings, the count badges, the two bottom buttons, the per-section Smart
  View rows, the search-result labels and the empty-state lines were all fixed
  colours — several of them paper colours (`var(--t2)`, `var(--green2)`) on a
  dark surface — measuring 1.1–2.4:1 on the owner's teal. `applySidebarInk()`
  derives the whole sidebar palette (`--sb-ink`, `--sb-panel`, `--sb-strip`,
  `--sb-line`…) from the luminance of `--forest` on every theme change, so a
  PALE sidebar now flips to dark ink and is usable for the first time. Section
  headings sit on a recessed strip; the two bottom buttons became real boxes.
  89/89 app checks (up from 80) and 11/11 ship checks — the new ones sweep
  every word in the sidebar in three states on five sidebar colours.
- **v04.14** (11 Sep 2026) — the sidebar header, rebuilt to read. The version
  number was a fixed grey (`#6A7F6C`): 4.3:1 on Forest, ~1.2:1 on the custom
  teal the owner had set, i.e. invisible. Everything in that header is now
  translucent black or white over whatever `--forest` is — recessed badge and
  search field, raised buttons. The five buttons (37×36, 14×19, 37×36, 42×40,
  37×45) became one square at one icon size, 34px desktop / 42px touch, and
  `🏠 ▾` became a split button with a 26×34 (30×42 phone) chevron. Also found
  while measuring: at a 200px sidebar the header ran 292px wide and pushed 🧰
  and ⚙ off the pane — `_sbFitHeader()` now folds it against its own pane
  width, watched by a `ResizeObserver` on `#sb`. 80/80 app checks (up from 70)
  and 11/11 ship checks.
- **v04.13** (11 Sep 2026) — the note-type chip is a badge, not a delete button.
  It called `toggleNoteKind()`, so one tap on what reads as a label stripped the
  note's type; it opens the type picker now. Also recorded: `general` is the
  FALLBACK type (`toggleNoteKind()` pushes it when the list empties), which is
  why the chip reads `General` on every note that has never been typed. 70/70
  app checks (up from 68) and 11/11 ship checks.
- **v04.12** (11 Sep 2026) — the `⋯` button opens on a left-click at last. v04.11
  stopped it throwing but it still did not open: it handed `showArtCtx()` a
  synthesised event whose `stopPropagation()` was a no-op, so the real click
  reached the global `document` closer and shut the menu in the same tick.
  `Multi` is three upright sheets now instead of two squares. 68/68 app checks
  (up from 67) and 11/11 ship checks.
- **v04.11** (10 Sep 2026) — `⧉ Copy`, `📦 Archive` and `🗑 Delete` left the note
  row for the `⋯` menu that already held them; `📎 Attach` is permanently on the
  row with `🏷 Note Type` as its first entry; every button is drawn in its own
  rounded box. The round also found the `⋯` button had been **dead** — its
  onclick passed a bare `curA.id`, a render-local, so it threw and opened
  nothing. 67/67 app checks (up from 62) and 11/11 ship checks.
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

*(This is for rules about the app that cost a shipped defect or a wasted round
at least once. Add one the moment it is paid for, with what it cost. Harness
traps belong in `tools/README.md`, not here.)*

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
