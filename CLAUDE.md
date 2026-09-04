# Siyagah — notes for Claude

Siyagah ("My Knowledge Notebook") is a personal notes app that ships as **one
self-contained HTML file**. There is no build step, no package manager, and no
test suite. `index.html` is the whole application: markup, CSS and nearly
20,000 lines of plain JavaScript in a single inline `<script>`. It is served as
a GitHub Pages site from `main`.

```
index.html          the entire app
manifest.json       web app manifest (PWA install metadata)
icons/              app icons + manifest screenshots
sw.js               service worker (network-first, cache name = app version)
legacy/v03.99/      a sealed, frozen build — never edited (see legacy/README.md)
```

## Working agreement

**Finish the job by landing it on `main`.** When work is complete, commit to
the session's branch, push, open a pull request, and merge it — no permission
needed for any of those steps. Use a merge commit, matching the existing
history. Do not stop at "pushed to a branch" and ask what to do next.

Everything else still applies: confirm before anything genuinely destructive
(rewriting history, deleting data, force-pushing over someone else's work), and
say plainly when something is unverified or incomplete.

## The version rule

**Every change bumps the version — nothing ships on the number that came
before it.** The format is `XX.YY`: bump `XX` for a major feature or upgrade
(resetting `YY` to `00`), `YY` for enhancements and fixes. Recent history has
treated most added features as `YY` bumps.

The new number must land in **all three** places or the update will not reach
devices:

1. `<meta name="app-version" content="XX.YY">` in `index.html` — the source of
   truth everything else reads.
2. The ` vXX.YY` placeholder on the `.sb-logo` line in `index.html` (search
   `app-version-tag`). Boot overwrites this from the meta tag, so it is only
   the pre-boot paint — but a stale value shows the old number for a frame.
3. `VERSION` in `sw.js`, as `'vXX.YY.01'`. That string is the cache name. If it
   does not change, the service worker keeps serving the previous build's files
   and the update never arrives.

`APP_VERSION` is read from the meta tag at boot, so the deploy export ("Save
File" ▸ deploy copy) names itself `Siyagah v{APP_VERSION} - Deploy.html`
automatically once the tag is bumped. The user's own timestamped backups are
named by date and time instead.

## Two things never to touch

- **`legacy/**`** — every folder under it is a sealed archive of an earlier
  build, kept as a permanent record and a fallback. No feature, no fix, no
  refactor, no version bump. The version rule above covers `index.html` and
  `sw.js` only. See `legacy/README.md` for why the freeze matters (frozen
  builds share an origin with the live app and are guarded against writing to
  its storage).
- **`<script id="nd" type="application/json">`** in `index.html` — the embedded
  notebook data. The user's own notes are written here when they click Save
  File. Preserve the tag and its contents through any edit.

## How the app is put together

- **Data** lives in a global `DB` (`folders`, `articles`, `sections`, `trash`,
  plus `DB.theme` for settings), with UI state in `ST`. `persist()` saves.
  `DB.theme` is a free-form bag — new settings can be added to it and they ride
  the existing localStorage / file-export / Firestore sync with no new
  plumbing.
- **Panes** — `renderTree()` (sidebar), `renderP2C()` (article list),
  `renderP3H()` / `renderP3C()` (note header and body). Most changes end with a
  call to some subset of these.
- **The editor** is a `contenteditable` div: `#ed` in Pane 3, `.fw-ed` in each
  float window. `_edActive()` resolves which one is focused, `_edHost(node)`
  answers which editor a node is in, and `insertAtCaret(html)` inserts into it
  (with an iOS-Safari-safe fallback). Script-driven changes fire no `input`
  event, so call `_edTouched(el)` to nudge autosave.
- **Note content is raw HTML with no sanitiser.** Interactive widgets can be
  stored directly in a note's content; the established pattern is
  `contenteditable="false"` chrome plus a delegated listener, and a repair pass
  that rebuilds anything a copy/paste stripped.
- **Headings drive the outline.** `_edColHeads()` collects `h1`–`h4` for fold
  arrows and drag grips in the editor; `_initCollapsible()` does the same for
  the read-only view. Widgets that contain heading-like lines should either use
  styled divs or be added to those functions' exclusion lists, or they will
  sprout arrows, grips, TOC entries and status badges inside themselves.
- **Anything on the edit toolbar belongs in two places** — Pane 3's
  `_p3EditIconsHTML()` and each float window's toolbar in `_fwRenderBody()`.

## Verifying a change

There is no test suite, so drive the real app in a headless browser rather than
reasoning about it. Playwright and Chromium are available:

```
npx http-server -p 8789 -s          # http, not file://, for clipboard APIs
node script.mjs                     # import { chromium } from playwright
```

Block `googleapis.com`, `gstatic.com` and `firebaseapp.com` so Firebase cannot
stall the boot, then build a folder and a note directly in `DB`, call the
render functions, and assert against the live DOM. Watch `pageerror` — a silent
exception in this codebase usually means a half-rendered pane rather than a
visible crash. Screenshots catch layout problems that assertions miss.

## Icons and the manifest

The app mark is a white Arabic **س** on indigo `#6366F1`. `icons/icon.svg` is
the master; the PNGs beside it are rasterised from it, and the glyph is stored
as a **path**, not text, so it renders identically without depending on a font
being installed. Regenerating them means re-rasterising `icon.svg` at 32, 180,
192 and 512, plus the full-bleed maskable 512 (its glyph is smaller so it stays
inside the 80% safe zone once a launcher masks the corners).

`index.html` also keeps an unsized data-URI `apple-touch-icon` alongside the
real files. That is deliberate: it is the only icon that survives a downloaded
`file://` copy of the app, where `/icons/` does not resolve.

Two traps when touching this:

- **`sw.js`'s `CORE` is all-or-nothing.** `addAll()` rejects if a single entry
  404s, and the `.catch(() => {})` around it then silently skips the entire
  precache. Every path listed there must exist.
- **Declared `sizes` in the manifest must match the real pixels**, or Chrome
  drops the icon without saying so.

Verify with Chromium's own parser rather than by eye — `Page.getAppManifest`
and `Page.getInstallabilityErrors` over CDP both return empty arrays when the
manifest is correct and the app is installable.
