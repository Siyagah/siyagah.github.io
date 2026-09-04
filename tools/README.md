# How Siyagah is verified

There is no test suite in this repo and never has been. This folder is the
substitute: it drives the **real** app in a **real** browser and measures it.
It exists because the owner is a non-coder — anything a check can prove must
never be left to "please test this", because that step may never happen.

Playwright and Chromium are already installed in the Claude Code sandbox and
`harness.mjs` finds them on its own. Nothing to install, no server to start.

```bash
node tools/ship-check.mjs     # ~1s, no browser. Run before EVERY push.
node tools/app-check.mjs      # ~30s, real browser. Run before every push too.
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

**`app-check.mjs`** — 33 checks against a booted app, with Firebase blocked:

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
- **Firebase must be blocked, not just absent.** With no sync config in
  localStorage, `initAuth()` returns early and the login overlay stays hidden —
  which is why the app is fully drivable here with no sign-in.
