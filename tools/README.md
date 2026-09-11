# How Siyagah is verified

There is no test suite in this repo and never has been. This folder is the
substitute: it drives the **real** app in a **real** browser and measures it.
It exists because the owner is a non-coder — anything a check can prove must
never be left to "please test this", because that step may never happen.

Playwright and Chromium are already installed in the Claude Code sandbox and
`harness.mjs` finds them on its own. Nothing to install, no server to start.

```bash
node tools/ship-check.mjs     # ~1s, no browser. Run before EVERY push.
node tools/app-check.mjs      # ~2min, real browser. Run before every push too.
node tools/probe.mjs --views  # not a test — dumps what the app really renders
node tools/shot.mjs           # screenshots at phone / tablet / desktop
```

Both check files exit non-zero when anything fails, so `node tools/ship-check.mjs
&& node tools/app-check.mjs` is the whole gate.

## What each one actually proves

**`ship-check.mjs`** — the things that make an update fail to *reach a device*,
or quietly lose the notebook, none of which need a browser:

- the version number is present and identical in all three places it has to
  live (meta tag, `.sb-logo` pre-boot paint, `sw.js`'s `VERSION` cache name);
- the version was bumped past `origin/main` if anything shippable changed;
- `<script id="nd">` is present and parses, with all four keys;
- every path in `sw.js`'s `CORE` exists — `addAll()` is all-or-nothing and a
  single 404 silently skips the entire precache;
- every manifest icon and screenshot exists and its declared `sizes` matches
  the **real** pixels read from the PNG header — Chrome drops a mismatched
  icon without saying so;
- `legacy/**` is byte-identical to `origin/main`.

**`app-check.mjs`** — 189 checks against a booted app, with Firebase blocked:

- boot is silent (no exception, no console error) and paints the version;
- **every inline `onclick`/`on*` handler in the file resolves to a real
  function** — 442 of them. This is the check that catches the app's most
  common silent defect: a button that looks fine and does nothing;
- all 11 Smart Views render, and every folder opens without throwing;
- a note opens, typing reaches it, `insertAtCaret()` lands, and `_edTouched()`
  commits both into `DB`;
- **Save File round-trips every folder and note id** through the exported
  `<script id="nd">`, the export is the whole app (not just data), and the
  live notebook is unchanged afterwards;
- **`mergeDB()` unions both devices** and keeps the newest edit whichever side
  it came from — this is the sync invariant, measured directly;
- a deleted note still leaves the list and still lands in Trash;
- **the caret can reach the top and the bottom of a note** — a click in the
  gutter above a leading heading and below the last block each open a real
  line to write on, a click beside a block opens nothing, and neither path
  dirties the note until something is actually typed (v04.07);
- **the read view's chrome stays folded into two rows** — no Home row, no type
  row, no section-tools row; Home, the type chips and the section tools all
  reachable from the Pane-3 toolbar and still doing their jobs; the version
  strip and the date line on one line; and the type chips still measurable at
  a **narrow Pane 3**, which is where a window-width test silently deleted
  them (v04.08);
- **the note toolbar is one row at five pane widths**, folds a group at a time
  as Pane 3 narrows, never overflows, clips nothing, keeps Edit out and every
  folded control reachable from a palette, and meets a 42px touch size on a
  phone — with the palettes measured doing the thing they name (v04.09);
- **the sidebar header reads on any sidebar colour, and fits its own pane** —
  real WCAG contrast for the version badge and the search box, each translucent
  layer blended over the colour behind it, on the Forest preset *and* on a
  custom one; nothing clipped at any width the sidebar can be dragged to
  (160–540px); one square and one icon size for every button; the `▾` measured
  on both of its dimensions; and a real mouse click on it that is looked at
  again 250ms later (v04.14);
- **every word in the sidebar reads on any sidebar colour** — not a list of
  elements but a sweep: every element in `#sb` carrying a word of its own,
  its translucent layers composited, scored against a 4.5:1 bar, in three
  states (all expanded, a folder selected, a live search) on five sidebars
  including a pale one and a mid grey, plus an empty notebook for the
  "nothing here yet" lines; and the ink is proved to flip on a pale sidebar
  (v04.15);
- **every word in panes 2 and 3 reads at every colour the pickers allow** —
  the same sweep pointed at `#p2`/`#p3`, in four states (landing, a folder
  open, a note read, the same note being edited), with the theme as it ships
  and with the pane-background and accent pickers at their least forgiving;
  plus the mechanism: a pane background too dark to write on is lightened and
  the inks re-derived from what it becomes, and white stops being the label
  colour on a pale accent (v04.16);
- **the folder pop-out reads and can be hit** — the same sweep pointed at
  `#mb`, in three states (tree closed, tree open, a live search) across four
  colour settings; plus its controls measured at a laptop and at a phone (it
  is full screen under 1200px and every control used to stay laptop-sized),
  the strip behind a group heading, and the section dropdown held to 142px as
  the window is dragged from 420px to 1000px (v04.17);
- **the Assign window reads and can be hit, and both pop-up windows count
  their notes** — its text under two colour settings, its tick box at a
  laptop and a phone, every folder row's badge compared against `cntOf()` in
  both windows, and the phone fold: the three row actions really folded into
  one ⋯, the whole folder name on screen, a real click opening all three and
  the menu still painted a tick later, and the laptop keeping its icons
  (v04.18);
- **a colour variable that is used is a colour that exists** — not a check for
  three names but a sweep: every `var()` written without a fallback anywhere in
  the stylesheet, asked whether it resolves to anything, on all five presets
  and two custom settings; plus every piece of text painted on `--hover`,
  `--paper2` or `--accent` scored at 4.5:1 (including rules that name their own
  ink, which need no element and so cover the modals and the calendar that no
  reachable state renders); plus a real mouse moved onto a real row, with the
  painted background read before and after (v04.19);
- **a Smart View carries the same second row a folder does, and it works** —
  all 11 views measured for the row, a **real mouse click** on a sibling chip
  landing on that view, the quick-add bar present in the six views a note can
  honestly go into and absent from the five it cannot, a title typed into
  Favourites coming back `favourite:true` in a real folder and **inside
  `getSmartArts('sf-favs')` and painted on screen**, a folder's own bar proved
  unchanged, Reminders opening `#rem-modal`, Expand/Collapse counted by the
  rows actually painted, a section's view saving inside that section, and the
  bar's touch size, placeholder fit and contrast on all five presets (v04.20);
- **the two header menus carry what they say, and fit the screen** — the five
  items that moved out of ⚙ Settings into 🧰 Tools identified by the FUNCTION
  they call rather than their label, the whole v04.20 action set still
  reachable with nothing lost, **every item closing the menu it is actually
  in** (a moved item still calling `closeSBMenu()` is the defect the move
  invites), no empty group heading, a real mouse click opening each menu
  wholly on screen at phone, tablet and a laptop with the sidebar at 160px
  and 540px, a scrolling menu carrying its cue, 44px rows on a phone, and all
  30 labels and headings at 4.5:1 on five presets (v04.21);
- **the phone's note editor is one bar, and a menu opens under its button** —
  the edit view measured for the rows it no longer has (no tab bar, no
  type/Attach/Save row, Save on the nav bar) and for the note starting in the
  top third of the screen; **nothing lost in the fold**, checked not against a
  written list but against the same app one pixel the other side of the 640px
  breakpoint; Save proved by reading the typed words back out of `DB` after a
  real click; one date on the versioning bar that a real click flips to
  Updated and back without rebuilding `#ed` or touching `updatedAt`; exactly
  one `#ed-col-wrap` at each size; and the geometry the round fixed — a real
  mouse click on every edit-bar group, looked at 250ms later, opening against
  its own button, wholly on screen, at all three sizes (v04.22);
- at phone, tablet and desktop: no sideways scroll, no visible pane collapsed
  to zero, no exception, and no failed request other than the ones we blocked;
- Chromium's own `Page.getAppManifest` and `Page.getInstallabilityErrors` both
  come back empty.

**`probe.mjs`** is not a test. It prints what a pane really contains. Use it
before writing a check, and to answer "does this screen actually say what I
think it says" without asking the owner to look.

**`shot.mjs`** writes `tools/shots/*.png` (gitignored). Screenshots catch what
assertions miss.

## Traps in this harness — learned the hard way, round 1

- **`DB`, `ST` and `SF` are NOT on `window`.** They are `let`/`const` at the top
  level of a classic script, so they live in the global *lexical* scope:
  `window.DB` is `undefined`, bare `DB` works. Functions declared with
  `function foo()` *are* on `window`. Every `page.evaluate` here depends on
  knowing which is which.
- **Never assert on an `id` or `class` you handed to `insertAtCaret()`.**
  Chromium's `execCommand('insertHTML')` sanitises what it inserts, and the
  editor's own chrome (fold arrows, drag grips) is stripped again on commit.
  Assert on **text**; it is the only thing that survives the whole path.
- **Measure each step where it happens.** `insertAtCaret()` restores the caret
  it captured *before* your keystrokes, so anything typed after that capture
  can be replaced by the insert. Asserting "did my typing land" *after* an
  insert measures the insert, and reads as a typing failure that isn't one.
- **The caret is real browser state.** `insertAtCaret()` calls `_restoreCaret()`
  first, and `_edRange` is only ever set by the app's own `selectionchange`
  handler — so a selection assembled inside `page.evaluate` is not what the
  editor is holding. Click and type with Playwright, like a person, then insert.
- **`execSync`'s default 1 MB buffer is smaller than `index.html`.**
  `git show origin/main:index.html` throws `ENOBUFS`, which looked exactly like
  "there is no origin/main" and silently skipped the version-bump check.
- **`origin/main` can be stale in a fresh session.** Run `git fetch origin main`
  before trusting any comparison against it.
- **Blocking Firebase produces `net::ERR_FAILED` console errors of our own
  making.** The harness matches them against the real failed-request URLs so
  they are not counted, while a genuine 404 (which reads "status of 404")
  still is.
- **A debounced autosave outlives the editor that armed it.** Typing arms a
  timer of up to `_ED_AUTOSAVE_MAX_MS` (2.5s); `renderP3C()` then builds a
  brand-new `#ed`, but the old timer still fires and commits whatever `#ed`
  holds *at that moment*. So a check that asserts "this action did NOT save"
  must first wait past that ceiling, or it measures the previous check's
  keystrokes and reads as a failure in code that is fine.
- **`window.innerWidth` is not the width of a pane.** Pane 3 is one column of a
  three-pane layout: on a 1215px screen it is about 485px wide. A check (or a
  layout rule) that reads the window width will call that "desktop, plenty of
  room". Measure the element you actually care about — `getBoundingClientRect()`
  on the pane — and set a viewport where the panes are squeezed, not only the
  three in `VIEWPORTS`, which are all single-pane or roomy.
- **A pane's width is not final when its markup is.** `renderP3H()` writes the
  toolbar while Pane 3 still measures 710px on a layout that settles to 485px,
  so anything that measures at render time measures a width the pane never
  has. Measure again after a `requestAnimationFrame` (and on resize) before
  trusting the number, or asserting on it.
- **Two full colour sweeps cost about a minute and a half.** `app-check` is
  no longer a 30-second run: sections 6i and 6j boot eleven browsers between
  them (six sidebar colours, five pane settings, four states each). It is
  still one command and still the whole gate — just do not expect it back
  instantly, and do not add a sweep colour without asking what it proves.
- **"Nothing was lost" is a comparison, not a list.** A fold that hides
  controls behind menus needs proof that every one of them is still reachable,
  and a hand-written list of the controls that existed goes stale the week
  after it is written. v04.22 asks the same app the same question one pixel
  either side of the breakpoint it folds at — every function reachable from
  the whole edit surface at 640px must still be reachable at 390px — so the
  check keeps working as controls come and go. Open every menu to collect
  them: a closed menu is `display:none` and contributes nothing.
- **A check that has never opened a surface is not a check on that surface.**
  `app-check` reached 144 checks without ever opening the 🧰 or ⚙ dropdown,
  so every measurement of them — size, position, contrast, touch target —
  was zero. The v04.15 sidebar sweep even walks `#sb`, which the menus are
  inside, but a closed menu is `display:none` and contributes nothing, so it
  reported a clean sweep over a surface it could not see. When a round
  touches something that opens, open it in the check; and when a sweep says
  "every element in X", ask which of them existed in the state it ran in.
- **A pop-out has states, and its parts do not all exist in the same one.**
  The v04.17 geometry probe measured while a search was live, where the
  pop-out has no chevrons and no per-row action icons — so "every icon is
  28px+" passed against ZERO icons, and the group-heading check failed
  because headings only exist in the other state. Measure each thing in the
  state that renders it, and print the count you measured, or an empty set
  reads as a pass.
- **A contrast check that names elements only proves the elements you thought
  of.** `COLLECT()` in section 6i takes every element in `#sb` with a word of
  its own instead, and composites the background stack outward until it hits
  an opaque colour — an alpha colour scored against nothing is not a
  measurement. Skip elements whose own text is emoji only: their `color` says
  nothing about what is painted. And exercise the STATES — expanded, selected,
  searching, empty — a colour that only reads in the default state is not fixed.
- **A class toggled on a resize is not applied in the same frame.** The
  sidebar header's fold runs from a `ResizeObserver` on `#sb`, so a check that
  sets `#sb.style.width` and measures after two `requestAnimationFrame`s reads
  a *transient* — a 200px sidebar measured 122px tall mid-fold and 84px once it
  settled. Set the width, wait ~250ms, then measure. The same applies to
  anything `_p3FitToolbar()` folds.
- **`Math.min(width, height)` is not "how big is this button".** A 26×34px
  archive button reads as "26px" and looks like a broken CSS rule that is
  working perfectly. Assert on the dimension you actually mean — and on both,
  if what you care about is a touch target.
- **`offsetParent === null` does not mean "not on screen".** It is null for
  any `position:fixed` element, painted or not — so "is the reminder dialog
  open" measured against `#rem-modal.offsetParent` reads FAILED on a dialog
  that is fully visible. For a fixed element ask `getComputedStyle(el).display`
  and `getBoundingClientRect().height`. (The same trap bites the opposite way
  in the contrast sweeps, where `offsetParent === null` IS the right test —
  everything they walk is in normal flow.)
- **A colour emoji ignores `color`, and no check will tell you.** `➕`, `📄`,
  `⭐` and friends are emoji-presentation glyphs: they paint their own colours,
  so `color:var(--on-accent)` does nothing and the contrast sweeps skip them
  by design ("its own text is emoji only"). A glyph used as a themed ICON has
  to be a TEXT glyph — `✚`, `⬆`, `▤` — or it will not follow the theme. Only
  a screenshot catches this.
- **A placeholder is the only instruction an input carries, so measure that it
  FITS.** A clipped one is perfect in the DOM and arrives on a 390px phone as
  `…press En`. Measure it in the field's own font on a canvas
  (`ctx.measureText`) against the field's content width; the eye and the DOM
  both say it is fine.
- **A shorthand holding a `var()` reports NOTHING through its longhands.**
  Chromium expands `background: var(--hover)` into nine longhands and returns
  `''` for every one of them — a "pending substitution" — so a sweep that walks
  `rule.style[i]` and reads `getPropertyValue` sees no variable at all. The
  v04.19 check was written that way and passed happily with `--hover` deleted,
  i.e. it was blind to the exact 56 rules it existed to protect; it caught only
  `--accent`, which is written as `color:`, a real longhand. Read
  `rule.style.cssText` — the declaration block as authored, nested rules
  excluded — or ask for the shorthand by name.
- **Every style rule has a truthy `.cssRules` now that Chromium does CSS
  nesting.** It is an empty list on an ordinary rule, so
  `if (rule.cssRules) { walk(...); continue; }` recurses into nothing and then
  skips the declarations: that read 6 rules out of 1286 and reported zero
  variables in use. Handle the declarations first, and recurse only on
  `rule.cssRules.length`.
- **A custom property comes back AS AUTHORED, not as `rgb()`.**
  `getPropertyValue('--hover')` returns the literal `#E8E5DF`, and `px()` here
  parses with `/[\d.]+/g` — which turns that hex into `rgb(2, 7, 0)`, near
  black. Every dark text then scores about 2:1 and reads as a failure that is
  not there. Paint the value on a throwaway element and read
  `getComputedStyle(...).backgroundColor` back, which is always `rgb()`.
- **A rule that lights a row usually restyles its ink in the same breath.**
  `.tab-it:hover{background:var(--hover);color:var(--t1)}` flips a white tab to
  dark text, so scoring the element's un-hovered `color` against the hover
  background measures a pairing that never appears on screen — 1.2:1 on a tab
  that is perfectly readable. Where the rule declares its own `color`, that is
  the colour to score.
- **Scoring ink against a translucent background measures nothing.** A
  rule-level pass over "every rule that sets a background and a colour" put
  `.sb-act` at 1.00:1 — its background is `var(--sb-panel)`, an alpha layer, and
  the real backdrop is whatever is behind it. Restrict a rule-level check to
  backgrounds that come back as opaque `rgb(`, or composite the stack as
  `COLLECT()` does.
- **Firebase must be blocked, not just absent.** With no sync config in
  localStorage, `initAuth()` returns early and the login overlay stays hidden —
  which is why the app is fully drivable here with no sign-in.
