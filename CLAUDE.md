# Siyagah — project memory

Read this first, every session. It is the standing brief, and it is meant to
stay short enough to read in full before starting work.

**Current version: v04.28.** Live at `siyagah.github.io`, served from `main`.

**The round-by-round build log lives in `CHANGELOG.md`.** Open it only when you
need the background of one specific feature. The five most recent rounds are
below, because recent context is usually what a round actually needs. History
must never accumulate here instead of there.

### The five most recent rounds

- **v04.28** (12 Sep 2026) — "make the card widen edge to edge", and "place
  the 'add tag' above all the buttons". `.fl-pop` was `width:min(260px,92vw)`
  — a 260px column on a 390px phone, anchored under a button near the right,
  so it sat in the right-hand two thirds with a strip of note beside it and
  every label squeezed into half of that. On a phone it is **6px each side,
  378px of 390** now; a tablet and a laptop keep the narrow anchored card.
  The **width is set BEFORE the height is read** in `_flPopPlace()` — measuring
  `scrollHeight` at 260px and then widening reports a card taller than the one
  that paints, and the placement is made from a number that was never true.
  Edge to edge stranded the `✕` in a corner, so it is the card's **✕ Close**
  bar now, full width. And the tag box is the FIRST child of the `+` menu,
  above every heading: it is the one thing in there you reach for while still
  writing. 206/206 app checks (up from 202) and 11/11 ship checks.
- **v04.27** (12 Sep 2026) — five asks off two screenshots of the phone's
  menus. **`≡`**: the `↩ ↪ 🕐 🔍` block goes FIRST (it is what you reach for
  mid-sentence; a list block is a choice made once), `Lists and blocks`
  second, and **📦 Archive** joins the bottom under `THIS NOTE` with
  `✓ Finish` / `↺ Re-open` — the note's state, not something attached to it.
  **`+`**: `📎 Attach (1) ▾` was a button whose only job was to open four more,
  so it is **spread open** — `🏷 Note Type · General`, `📁 Folder · 1
  attached`, `📓 My Journal`, `🗄 MyDatabase`, each showing the VALUE it holds,
  full width because two-up clipped *MyDatabase*. The group is
  **`ATTACH TO THE NOTE`** now, not "About this note". And the owner's
  question — "do we need a separate tag button when the + button contains
  it?" — answered no: **🏷 left the bar and the tag ROW with it**; the tag
  editor lives in `+`, chips, input and suggestions. v04.23 had made it a
  toggle because `.fl-pop` is `overflow:auto` and would clip an absolutely
  positioned suggestion list; `_tagSuggestPlace()` fixes that properly —
  `position:fixed` is not clipped by an overflow ancestor. 🏷 stays with Note
  Type, tags take `#`. The bar is seven controls: `◀ 📁 | Aa H ≡ + | 💾 Save`.
  202/202 app checks (up from 200) and 11/11 ship checks.
- **v04.26** (12 Sep 2026) — "how about there is two 3 line horizontal button,
  does it make sense?" No. `≡` was **Open folders** in the nav pair AND
  **Lists** in the format pair, three buttons apart on the same 390px row, with
  a third `≡` on `≡ Preview` inside the `⋯`. The folders button is **📁**
  (titled *Folders*) in all five places Pane 3 renders it, Preview is **▤**,
  and `≡` is left with one job. The check names neither button — it sweeps
  every glyph-only control in the edit chrome and fails if one glyph calls two
  functions. And the three menus are organised: `+` is now **INSERT AT THE
  CURSOR / ABOUT THIS NOTE / GO TO / OPEN TABS**, split by *what the action
  does* (the same line v04.21 drew between 🧰 and ⚙), and **every button
  carries a word** — `❝ Quote`, `─ Divider`, `↩ Undo`, `🔖 Bookmark`, and 📦
  Archive borrowing its own `title` through CSS so it still reads right when
  it flips to Unarchive. Written once, rendered twice: `_EB_INSERT` /
  `_EB_LISTS` / `_ebSectionToolsHTML()` generate the bare-glyph form for a
  laptop's bar and the labelled form for the phone's menu, so the two cannot
  drift. 🏷 stays a toggle (a tag suggestion list is absolutely positioned and
  a scrolling popover would clip it). 200/200 app checks (up from 197) and
  11/11 ship checks.
- **v04.25** (11 Sep 2026) — "Check your work, the bar is still there." Third
  time asked, and the first two answers were both wrong in what they took the
  owner to MEAN. v04.22 hid the tab bar while editing on a phone **only when
  empty** (the owner has tabs, so never); v04.24 took 📅 Cal and ＋ Add Tab off
  it and left the bar. A tab bar **is** a bar, and the brief was one bar. So
  `#tab-bar` does not render at all while editing on a phone now, tabs or no
  tabs — back the instant editing ends, read mode and tablet/desktop
  untouched. Nothing unreachable: every open tab is a row under `+` headed
  `OPEN TABS (n)`, the current one marked `◆`, each calling the same
  `tabSelect()` the chip did. 197/197 app checks (up from 196) and 11/11 ship
  checks.
- **v04.24** (11 Sep 2026) — "Still Calender and '+Add Tab' is still there on
  a bar. should not be there." They were. v04.22 put 📅 Calendar and ＋ Add Tab
  under `+` and **never took them off the tab bar**, then hid that bar while
  editing on a phone — which concealed the duplication, because with no tabs
  there was no bar to see it on. The first tab the owner opened brought the bar
  back with both buttons on it. While editing on a phone the bar carries
  **tabs and nothing else** now; read mode keeps both buttons and they return
  the moment editing ends. The check missed it because it only ever ran on the
  default seed, which has **no tabs** — every measurement of that bar was taken
  in the one state where it does not exist. It seeds three tabs now.
  196/196 app checks (up from 194) and 11/11 ship checks.

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
node tools/app-check.mjs       # ~2min, drives the real app in Chromium
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
