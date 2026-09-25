# Siyagah — build log

Every round, oldest first. **This file is history, not the brief** —
`CLAUDE.md` is what every session reads. Come here only when you need the
background of one particular feature: why a decision was taken, what a round
measured, what it deliberately left undone.

The five most recent rounds are also kept in `CLAUDE.md`, so recent context
needs no trip here. **Never let history accumulate in `CLAUDE.md` instead of
here** — the brief has to stay short enough to read at the start of every
session.

---

## Before the log existed (v03.x → v04.05)

Reconstructed from git commit messages on 4 September 2026, when this file was
opened. These entries are one line each because that is genuinely all the
record there is — no round-by-round log was kept before this date, and nothing
below was written at the time. Treat them as a table of contents into
`git log`, not as an account of what any round measured or decided.

The repo starts 27 July 2026 as a series of "Add files via upload" commits —
whole-file drops of `index.html` from outside git. Real per-change commits
begin 14 August 2026.

**Sync hardening (14–27 Aug 2026).** Cross-platform latency and truncated note
uploads; remote edits being discarded by an open editor; sync depending solely
on the realtime listener (a reconcile poll was added under it); title-only
edits never syncing and no-op saves winning merges; sync silently reporting
success on real Firestore failures.

**Storage (28 Aug 2026).** Note History was storing a full copy of each note's
content — embedded base64 images and all — in every snapshot, so one photo
could be duplicated up to 40 times per note and then faithfully synced to every
device. That is the root cause of the "browser storage is full" reports.
Snapshots are now image-free, with a one-time migration to strip what was
already stored.

**The folder pop-out (28 Aug – 3 Sep 2026, v03.9x–v04.03).** The "Assign to
folders" popup grew into a real Folder Browser: resizable, draggable by its
title bar, note titles as editable/movable leaves under each folder, Pane-1
sections popping into the same window, a section navigator in its title bar,
prev/next, Smart Views / Tags / Note Types in the same nav, global search,
remembered scope and size, an "All Sections" view, and a full-screen variant
on tablet and phone.

**v04.00** (2 Sep) New Note opens in a screen-proportionate pop-out window.
**v04.01** (2 Sep) v03.99 sealed as a frozen Legacy App under `/legacy/`,
reachable from the 🏠 menu. **v04.02** (2 Sep) automatic dated backups of the
whole app + notes, via the File System Access API. **v04.03** (3 Sep) folder
text styling in the pop-out browser. **v04.04** (4 Sep) note templates,
starting with Jumu'a Khutbah. **v04.05** (4 Sep) the web app manifest and real
icons, which had been missing.

`CLAUDE.md` was first added 4 September 2026 (between v04.04 and v04.05),
carrying the version rule and the `legacy/**` freeze.

---

## v04.06 — 4 September 2026 · the brief, the log, and something that measures

**Round 1 of working this way.** No app behaviour changed. This round set the
repo up so that every later round has a short brief to read, a place to write
history that is not the brief, and a way to *measure* instead of guessing.

**What was built**

- **`CLAUDE.md` rewritten** as a standing brief: what Siyagah is, that the
  owner is a non-coder, how to work, the invariants, terminology, the
  decisions confirmed this round, an empty "Standing lessons" section, and the
  five most recent rounds. Small enough to read every session.
- **This file**, with the pre-existing history reconstructed from `git log` and
  labelled as reconstructed.
- **`tools/`** — the measuring tool this app did not have. `harness.mjs` boots
  the real app in Chromium with Firebase blocked; `ship-check.mjs` (no browser,
  ~1s) checks the version in all three places, the `nd` data tag, every
  `sw.js` `CORE` path, every manifest icon's real pixel size, and that
  `legacy/**` is untouched; `app-check.mjs` (33 checks) drives the booted app;
  `probe.mjs` dumps what a pane really renders; `shot.mjs` screenshots at
  phone, tablet and desktop. `tools/README.md` explains all of it and carries
  the harness's own traps.
- **`.gitignore`** for `tools/shots/` and `node_modules/`.

**What it measured, first run**

33/33 in `app-check`, 11/11 in `ship-check`, against v04.05 as it stands on
`main`. Nothing was found broken. Notable numbers, as a baseline for later
rounds: **442** inline event handlers, all resolving to real functions; **11**
Smart Views, all rendering; a Save File export of **1037 KB** that round-trips
every folder and note id; Chromium reporting the manifest clean and the app
installable; no sideways scroll and no collapsed pane at 390×844, 820×1180 or
1440×900.

**Confirmed by the owner this round**

Single user, one Google account. The four things that must never break:
notes are never lost or silently changed *except by the owner's own deliberate
deletion*; cross-device sync keeps working; it works offline and as an
installed app; a downloaded copy still opens years later. Screen sizes and
which past breakages to prioritise were left to Claude's judgement — all three
sizes and all four risk areas are covered, since each was cheap.

**What was NOT done, and why**

- **"Standing lessons" is empty**, as asked. Five real traps *were* learned
  building the harness this round, but they are harness traps, so they are
  written in `tools/README.md` where the next person touching the harness will
  actually be standing. The section is reserved for lessons about the *app*.
- **No check covers Firestore itself.** Sync is measured through `mergeDB()`,
  which is the part that decides what survives a merge; the network round-trip
  to a real Firebase project is not exercised and cannot be from a sandbox.
- **No check opens a saved `file://` copy.** "A downloaded copy still opens
  years later" is only measured as far as "the export contains the whole app
  and every note" — actually launching an exported file from disk is a gap,
  and a candidate for round 2.
- **No check covers the float-window editor (`.fw-ed`).** Only Pane 3's `#ed`
  is driven. Anything on the edit toolbar has to be added in both places, so
  this is a real coverage hole.
- **`legacy/**` was not touched**, by rule.

---

## v04.07 — a line to write on, above and below the note (10 September 2026)

Two places in every note had no caret you could reach. The owner reported both
with a marked-up screenshot: a red bar above the first heading, and another
below the last one.

**What was actually wrong**

Measured in a real browser before anything was changed, on a note shaped like
the one in the screenshot — heading, text, heading:

- **Above.** A note that opens with a heading has nothing in front of it to
  click into. A click in the space above it did not do nothing; it landed the
  caret at *offset 1 of the `<h2>`* — **between the fold grip `⠿` and the fold
  arrow `▼`** — so typing went in among the heading's own chrome.
- **Below.** A click anywhere in the empty space under the last block put the
  caret at the **end of that block**. On a note ending in a heading, typing
  there carried on the heading, in heading style, instead of starting a new
  line. On desktop that dead space was 515px tall.
- **The existing escape hatch was broken.** v03.67.01 had added a rule: press
  Enter at the very start of the note's first heading and get an empty
  paragraph above it. It tested the caret with `pre.toString()`, which counts
  the grip and the arrow as two characters — so once `_edColInit()` started
  injecting that chrome into every heading, the rule could never fire. What
  happened instead was worse than nothing: Enter split the heading, leaving a
  **stray chrome-only heading** `⠿▼` behind, which then sprouted its own fold
  arrow and TOC entry. Nobody had noticed because the feature simply appeared
  not to work.

**What now happens**

Clicking the empty band above the first block, or below the last one, opens a
real empty line there and puts the caret in it. Typing at a heading's left
edge writes at the front of the title instead of inside the chrome. The Enter
rule works again, on lists and headings alike.

Details that took the measuring to get right:

- That empty space is the editor's own padding and its leftover height, so a
  click there lands on the editor element itself — for the top, the bottom
  **and the sides** alike. Only the top and bottom bands act. Beside a block
  the browser is already right, and is left alone.
- A note that **starts with a plain paragraph** is left to the browser too: the
  caret already lands at the start of that paragraph, and inserting a line
  there would be an unasked-for edit.
- An empty paragraph already sitting at the edge **is** the line to write on,
  so the gutter can be clicked any number of times without stacking blank
  lines.
- If the note **ends inside a collapsed section**, that section is opened
  first. Otherwise the new line is a sibling of hidden content and the next
  `_edColApply()` would hide it again — the owner would have been typing into
  a line that vanished on the next render.
- Bound on `click`, not `mousedown`, so a drag that starts in the gutter to
  select text still selects text.
- Delegated from `document`, so Pane 3's `#ed` and every float window's
  `.fw-ed` get one implementation — the E5 rule. **The float window is covered
  by this round**, which closes part of the coverage hole v04.06 recorded.
- Nothing in this path calls `_edTouched()`. Opening a line and walking away
  without typing must not dirty the note on its own; the moment anything is
  typed, the editor's existing autosave commits the line with the text.

**Measured**

11/11 ship checks, and app checks up from 33 to **40** — seven new ones, all
driving real mouse clicks, since the caret is real browser state:

- clicking below the last block opens a new line, not the end of the heading;
- clicking beside a block adds nothing;
- clicking above a leading heading opens a line in front of it;
- a note starting with a paragraph is left to the browser;
- Enter at the start of the first heading writes above it, not into it, and
  leaves no chrome-only heading behind;
- typing at a heading's left edge writes at the front of the title, chrome
  intact;
- opening a line without typing leaves the note untouched in `DB`.

Verified separately at all three sizes (390×844, 820×1180, 1440×900) and in a
float window; the saved content carries no chrome.

**A harness trap this round paid for**

A debounced autosave **outlives the editor that armed it**. Typing arms a timer
of up to `_ED_AUTOSAVE_MAX_MS` (2.5s); `renderP3C()` then builds a brand-new
`#ed`, but the old timer still fires and commits whatever `#ed` holds at that
moment. The "a bare click does not save" check failed on exactly this — it was
measuring the *previous* check's keystrokes, in code that was fine. Written up
in `tools/README.md`.

**What was NOT done, and why**

- **No sanitiser, no content migration.** Existing notes are untouched; this
  round only changes where a click puts the caret.
- **The stray `⠿▼` headings already sitting in saved notes are not cleaned up.**
  If the broken Enter rule created any before today, they are still there. A
  migration that deletes headings is exactly the kind of thing invariant I1
  forbids doing on a guess, and an empty heading is harmless — it can be
  deleted by hand. Say the word and it can be done as its own round, with a
  backup of what it removes.
- **Lists were left with the browser's own behaviour above them.** The C8 Enter
  rule already covers writing above a leading list; a gutter click above one
  now opens a line too, but nothing else about lists was touched.
- **`legacy/**` was not touched**, by rule.

---

## v04.08 — the note view folded into two rows (10 September 2026)

The owner marked up a screenshot of the read view: circles round four groups
of buttons, every arrow pointing up. Read literally, it says *these rows are
not worth a row each*.

**What the read view was**

Counted in a real browser: **six rows of chrome** between the top of the pane
and the note's first line.

1. the Pane-3 toolbar (`‹ › 🔍 ✚ ✏️Edit ⊡ ⛶ 🗐 ⋯ 🗑`) — its whole left half an
   empty spacer;
2. a row containing only `🏠 Home`;
3. the NTI bar — `General` … `🏷 Types` `📎 Attach` `📦`;
4. the title;
5. the version strip — `🔀 Start Versioning`;
6. the section-tools row — `▶ Collapse All  ▼ Expand All  ≡ Preview`;
7. the date line — `Created … | Updated …`.

On a 1440×900 desktop the first heading did not start until 430px down.

**What settled the reading**

Edit mode had already been through exactly this. Its `p3h-unified-tb` puts
Home, the format icons, the NTI bar and the section tools on **one** row, and
its section tools are an overflow popover rather than a reserved row. The
markup is asking for the read view to catch up with the edit view, so this
round reuses that structure rather than inventing a second one.

**What now happens**

- **The Pane-3 toolbar carries Home, the type chips, `🏷 Types`, `📎 Attach`,
  the archive button and the section tools**, alongside the navigation and
  action buttons it already had. Rows 2 and 3 are gone.
- **Section tools became a `⇅` button** opening a popover with Collapse all /
  Expand all / Preview — the same `_colAll()` / `_colTogglePreview()`
  underneath, unchanged. Row 6 is gone. The glyph is `⇅`, not the `⋯` edit
  mode uses, because the read view already has a `⋯` "More options" button a
  few pixels to its right.
- **The version strip and the date line share one row**, versions left, dates
  pushed to the right end. Rows 5 and 7 became one.
- The `⇅` button appears only on a note that actually has headings.

Six rows became two. The first heading now starts 275px down instead of 430px
on desktop, and 117px instead of 189px on tablet.

**The bug this round found in its own first attempt**

The first version decided what to merge with `window.innerWidth < 1200`, the
same test edit mode uses. Screenshotting it showed the type chips **had
vanished entirely** at 1215px. The reason is that Pane 3 is one column of a
three-pane layout: on a 1215px screen the window is "desktop" but the pane is
about **485px**. The chips were told they had room, then squeezed to zero
width by the ten buttons beside them — present in the DOM, invisible on screen.

So the fitting is not a breakpoint at all now. The toolbar wraps: the type
group refuses to shrink, and the action buttons drop to a second line,
right-aligned there, when the pane is too narrow to hold everything. One code
path at every size, and correct at pane widths no breakpoint would have
predicted. A check pins it at a viewport where Pane 3 is 485px.

**Measured**

11/11 ship checks, and app checks up from 40 to **49**. The nine new ones:

- the read view no longer stacks a Home row, a type row and a section-tools row;
- Home, the type chips and the section tools are in the Pane-3 toolbar;
- the version strip and the date line share one row, dates to the right;
- the type chips survive a narrow Pane 3 instead of being squeezed to nothing;
- the section-tools button shows only on a note that has headings;
- Collapse all / Expand all still work from the popover;
- the Types picker and Archive still work from the toolbar;
- the landing page keeps its own Home row;
- edit mode's own toolbar is untouched.

Verified at 390×844, 820×1180, 1440×900 and at 1215×661 with all three panes
open, which is the case that caught the disappearing chips.

**What was NOT done, and why**

- **Edit mode was not touched.** The markup was on the read view, and edit
  mode already has its unified toolbar. The one thing it still stacks is the
  version strip above the date line — the same merge would suit it, but it was
  not asked for. Say the word and it is a small round.
- **No note content changed**, and no data shape changed. This is layout only.
- **The `⇅` glyph is a guess.** It is not one of the app's existing icons; if
  it reads badly next to `⋯`, it is one string to change.
- **Nothing was removed, only moved.** Every button in the old rows is still
  present and still works — each is measured by name in the checks above.
- **`legacy/**` was not touched**, by rule.

---

## v04.09 — one row of buttons, bunched by type (10 September 2026)

A phone screenshot: v04.08's toolbar, wrapped into **three rows of buttons**
before the note began. The ask was one row; if it will not fit, bunch the
same-type buttons onto a palette; and make the small buttons bigger.

**Why v04.08 wrapped**

v04.08 deliberately replaced a width breakpoint with `flex-wrap`, because a
breakpoint had squeezed the type chips out of existence. Wrapping never loses
a button — but on a 390px phone there are sixteen controls, and it turned them
into three stacked rows. Wrapping was the right fix for the wrong problem.

**What now happens**

The row does not wrap. It **measures itself** (`_p3FitToolbar`) and folds a
group at a time when the buttons do not fit, in the order that keeps the most
useful things out longest:

1. **full** — everything inline.
2. **tight** — `🏷 Types`, `📎 Attach`, `📦` fold behind one `🏷` palette. The
   note's own type chip stays visible, because the chip is *information*, not
   just a control.
3. **tighter** — `‹ › 🔍 ✚ ⊡ ⛶ ⧉ ⋯ 🗑` fold behind one `⋯` palette.
4. **tightest** — the type chip goes too. It is in the `🏷` palette anyway.

`✏️ Edit` and the navigation keys never fold; they are what the row is for.

Measured on the pane, not the window: the whole row wants **836px**, the type
group is **288px** of that and the action group **312px**. So a 710px desktop
Pane 3 folds only the type buttons, a 485px one also folds the actions, and a
390px phone folds everything into `🏠 ◀ ≡ 🏷▾ ⇅ ⋯▾ ✏️Edit` — seven buttons, one
row, 44px each.

**Bigger buttons**

The read toolbar's icon buttons were about 27px tall — below any comfortable
touch target. They are now 36px on desktop and **44px on a phone**, and the
palette rows are 44px with a real word beside each icon. The archive button
was 26px *wide*, so it got a minimum in both directions.

**A glyph that was drawing as an empty box**

The phone screenshot showed a `▯` between Edit and `⋯`. By elimination it was
`🗐` (U+1F5D0 STACKED PAGES) on the duplicate button — a pictograph Android's
emoji font does not carry. It is now `⧉`, and on a phone it lives in the
palette where it has the words "Make a copy" beside it regardless.

**Two things the measuring caught**

- **A pane's width is not final when its markup is.** The first fit ran inside
  `renderP3H()`, where Pane 3 still measures 710px on a layout that settles to
  485px — so the row folded against a width the pane never has, and sat 39px
  over. It re-fits after a `requestAnimationFrame`, on resize, and from
  `adjustP3Layout()`.
- **`Math.min(width, height)` is not "how big is this button".** A 26×34px
  archive button reported as "26px" and looked like a CSS rule that was in
  fact working. The rule was fine; the measurement was wrong.

**Measured**

11/11 ship checks, and app checks from 49 to **54**. The five new ones open a
real app at five pane widths (390, 820, 1215→485, 1440→710, 1920→1190) and
assert: one row and nothing clipped at any of them; progressive folding with
zero overflow; **nothing hidden without a way back** — Edit visible, actions
and Types reachable inline or by palette, at every width; a 42px minimum touch
size on a phone; and the palettes measured actually working — a copy really
made, Types really opened, and pop-out *not* offered below 900px where the app
would refuse to show it.

One earlier check was **updated in place, not deleted**: v04.08's "the type
chips survive a narrow Pane 3" asserted the Types button was inline at 485px,
which this round deliberately changed. It now asserts what must still hold —
the chip stays visible and Types stays reachable.

**What was NOT done, and why**

- **Edit mode's toolbar was not touched.** It has its own layout and its own
  wrapping, and the screenshot was of the read view. If the edit toolbar
  stacks on your phone too, that is the same treatment again — say so.
- **The fold order is a judgement, not a measurement.** I put Types/Attach
  ahead of the navigation keys on the grounds that classification is
  occasional and navigation is constant. If you would rather keep Types out
  and fold `‹ ›` first, it is two lines.
- **The `⧉` copy glyph is still a guess for Android.** I cannot test Android's
  fonts from here. It is far better supported than the box you saw, and on a
  phone it now carries a text label — but if it draws as a box too, tell me
  and I will use a plain emoji.
- **`legacy/**` was not touched**, by rule.

## v04.10 — the two pop-up buttons say which is which (10 September 2026)

A screenshot of two buttons in the note toolbar, and one question: *what do
these do, why are they separate, and can they be merged?*

They were `⊡` and `⛶`, sitting side by side, both faint grey, both a square —
next to a third square, `⧉ Make a copy`. Three neighbours, one silhouette.

**They are genuinely two things, and the names now say so**

| Was | Is | What it opens |
|---|---|---|
| `⊡` "Pop out as floating window" | **Multi Notes Pop-Up** | Its own window on top of the app. Several open at once, side by side; everything behind stays usable. |
| `⛶` "Open as resizable panel" | **Single Note Pop-Up** | Lifts this one note into the middle of the screen and dims everything else. One at a time; the dark area closes it. |

The owner chose the names and chose the layout — words on the buttons, from a
mock-up of three options — after asking whether the two could be merged. They
cannot, in behaviour: opening either one closes the other (`popOutNote()` and
`openNoteModal()` each shut the other down, the "one pop-up paradigm at a
time" rule from v03.NotePane.G4), so they are two settings of one thing, and
one of them would have to be hidden behind a menu to merge the controls.

**Drawn icons, not typed ones**

`⊡` and `⛶` are font characters. v04.09 already had to swap `🗐` off the
duplicate button because Android's emoji font does not carry it and drew an
empty box. Both are now inline `<svg>`, which cannot fail that way and can
show the difference: **two overlapping windows** for Multi, **one bright card
on a dimmed screen** for Single. Multi is tinted gold, Single green — glyph
only, no filled buttons. (`.bn` sets `color: var(--t3)!important`, so the tint
needs `!important` or it silently does nothing.)

The right-click menu also still carried `🗐 Make a copy` — the exact glyph
v04.09 replaced on the toolbar for being an empty box. It is `⧉` there now.

**"As long as space permits", measured**

The words cost the row **71px**. `_p3FitToolbar()` gets a new fold stage,
`p3h-nolbl`, placed **after** the type group and **before** anything else.
Measured on the real row:

| Pane 3 | State |
|---|---|
| **925px+** | everything inline, words on |
| **737–925px** | words on, type group behind its `🏷` palette |
| **710–737px** | words off, icons only |
| below | the existing v04.09 folds, unchanged |

So the words appear from **737px of Pane 3** upward — on the three-pane
desktop layout, a window of about **1470px or wider**. A 1440 window gives
Pane 3 710px and falls **27px short**, so a 1440 laptop shows the icons alone.
That was not shaved to fit: squeezing a control to force a fit is what cost
this app its type chips in v04.08, and 27px would have meant an 11.5px label
in a 13px row. Below 900px the buttons do not exist at all — pop-ups are
`display:none` there and `openNotePopup()` refuses to open one.

Nothing is ever unnamed or unreachable: the `⋯` palette and the right-click
menu carry both full names plus a line saying what each does, at every width.

**Where the two buttons are defined**

One place now — `_popBtnHTML()` / `_popIcoHTML()` / `POP_KINDS`. The read
toolbar, the edit toolbar, the `⋯` palette and the right-click menu all come
through it, because "anything on the edit toolbar belongs in two places" is
exactly how four copies of a button drift apart.

**Measured**

11/11 ship checks, and app checks from 54 to **62**. The eight new ones assert:
both buttons are `<svg>` and the two drawings differ; each names itself in its
tooltip; the words show and the two are tinted apart where the pane can carry
them; the words never break the one-row rule or overflow the pane at 390, 820,
1440 or 1920; they fold where the pane cannot carry them; above 900px a folded
button is still reachable from the `⋯` palette; a folded button is the same
36px+ target it was in v04.09; and the right-click menu carries both full names
with the `🗐` glyph gone.

Two earlier checks were **updated in place, not deleted**:

- The v04.09 fold-state reader knew `full / tight / tighter / tightest`. With
  `nolbl` inserted between two of them, a row folded to `nolbl` read as
  `full` — the progression check would have been measuring nothing.
- The phone palette's "does not offer pop-out below 900px" matched
  `/Pop out|as a panel/`. After the rename that pattern can never match again,
  so the check would have passed while blind. It matches `/Pop-Up/i` now.

**Two things the measuring caught**

- **The predicted fold widths were wrong by 27px.** The plan said the type
  group was 288px (v04.09's figure, for a different row) and that the words
  would therefore fit on a 1440 laptop. Measured on the actual row it is
  ~188px, and they do not. The fold order was set from the measurement, not
  the estimate — and it is the measurement that makes the words survive from
  737px instead of only from 925px.
- **A check asserting reachability below 900px was a wrong assertion**, not a
  defect: there is nothing to reach, because the feature is deliberately
  absent at that width. Investigated before "fixing" the app.

**What was NOT done, and why**

- **The edit toolbar shows the icons without the words.** It has its own
  crowding and its own fold behaviour, and this round did not widen it. The
  tooltip and both menus still carry the full name there.
- **Float windows have no pop-up buttons** and did not gain any — a window is
  already popped out.
- **The two were not merged into one button.** The owner asked whether they
  could be; they can (the app already remembers a per-note preference in
  `DB.theme.notePop`), but it would hide one mode behind a menu, and the ask
  was to tell them apart, not to reduce them.
- **No sync, storage or export path was touched.** I1–I4 are untouched by a
  round that changes four pieces of button markup and one CSS fold stage.

## v04.11 — one ⋯ for the destructive three, and boxes round every button (10 September 2026)

Four asks and one question, from a screenshot of the note toolbar.

**The question first: what is the `⋯` button for?**

It was for nothing. Its `onclick` passed a **bare `curA.id`** — and `curA` is a
`const` local to `renderP3H()`, so by the time anyone clicked, the inline
handler threw `ReferenceError: curA is not defined` and the button did not
open anything. Right-click on it worked, because `oncontextmenu` interpolated
the id properly; left-click, which is how anyone would use it, was dead. The
same bare reference sat on the contact-form header's `⋯`. Both interpolated
now.

That is a shipped defect nobody had reported, found only because the owner
asked what the button was for. What it is *for*: Rename title, both pop-ups,
Note History, Make a copy, NTI Types, Favourites, Pin, Archive, Finish, Add to
Tab, Add to Journal event, Reminder, Tags, Folders, My Favourites,
Murāja'ah, practice, and Delete.

**Copy, Archive and Delete under one button**

All three left the row. All three were already in the `⋯` menu, so `⋯` *is*
the one button — no new control was invented for it. Its tooltip says so now
("More — copy, archive, delete, rename, history, tags, folders, reminders,
favourites") instead of the anonymous "More options" it wore while those
buttons still sat beside it.

`📦 Archive` stays on **edit mode's** toolbar, which has no `⋯` to reach it
from. The `⋯` palette that the phone folds into mirrors the row, so Copy and
Delete left it too — one tap further in, through `⋯`. Listing Delete one tap
from a phone toolbar while claiming it had been tidied away would be the worst
of both.

**Attach on the bar, Note Type under it**

`📎 Attach` is permanently on the row. `🏷 Types` came off it and is the first
row of the Attach menu, above a separator: **Note Type (n)** / Folder (n) / My
Journal / MyDatabase — what the note *is*, then where it *lives*. The note's
own coloured type chip stays on the row, because the chip is information, not
a control.

One trap: `openNtiPicker()` positions itself against whatever element it is
handed, so it is called **before** `hideCtx()` — a hidden menu row measures
0×0 and the picker would open in the top-left corner.

**Every button in its own rounded box**

The read toolbar's buttons all carry `.bn`, which is
`background:none!important; border-color:transparent!important` — nine
floating glyphs with no edges. They now get a white ground, a visible border
and a 9px radius, scoped to `#p3h:not(.editing)` and nothing else: `.bn` is
used across the sidebar, the modals and every pane, and bordering it globally
would redraw half the app. The coloured type chips are left alone — their
colour is the information.

**What the trimming bought, measured**

Four buttons left the row (`⧉`, `🗑`, `🏷 Types`, `📦`). The full row now wants
**732px** of Pane 3 with the Multi/Single words on, down from 925px. A 1440
window gives Pane 3 710px, so the words are still **22px short** there and
fold to icons; from about a **1465px** window up they show. Not shaved to fit:
22px would have meant an 11.5px label in a 13px row, and squeezing a control
to force a fit is what cost this app its type chips in v04.08.

The fold order reverses v04.10's: the words fold **first** again. v04.10 put
them ahead of the type group because the group was the least-missed thing on
the row; it no longer is, because `📎 Attach` is what `tight` folds and Attach
staying on the bar is an explicit instruction.

**Measured**

11/11 ship checks, and app checks from 62 to **67**.

The new ones assert: Copy, Archive and Delete are off the row and all three are
in `⋯`; `⋯` names what it holds; Attach is on the row, Types is not, and the
chip still shows; every visible button on the row is drawn in a box; and —
the one that matters most — **every button on the row is clicked for real and
must not throw**. That last check was verified by putting the `curA` bug back:
it fails, naming the button and the error. Section 2's "every inline handler is
a real function" could never catch it, because the function name was real and
it was an *argument* that did not exist.

Two earlier checks were **updated in place, not deleted**:

- "the Types picker and Archive still work from the toolbar" clicked
  `#p3h .kind-arch-btn`, which this round deliberately removed from read mode,
  and threw. It now opens Attach, opens Note Type from inside it, checks the
  picker is anchored to the menu row rather than the corner, and archives from
  `⋯`.
- "the palettes list the folded buttons" clicked "Make a copy" in the `⋯`
  palette, which this round deliberately moved. It now goes through `⋯`,
  asserts copy/archive/delete are all in there, and still makes a real copy.

**Two things the measuring caught**

- **An inline handler can name a real function and still be dead.** The `⋯`
  button's argument, not its function, was missing. A check that reads the
  source for handler names cannot see it; only clicking can.
- **An HTML comment inside the inline `<script>` stops the app booting.**
  `<!--` puts the HTML parser into its script-escaped state. The note about
  the `curA` fix was first written as `<!-- ... -->` inside a template literal
  and the whole app failed to start. It is a `/* */` comment now.

**What was NOT done, and why**

- **The words still do not fit a 1440 laptop**, by 22px. Reported rather than
  forced.
- **`⇅` section tools stayed on the row.** It is a per-note view control and
  was not part of the ask.
- **Edit mode's toolbar keeps `🏷 Types` and `📦 Archive`** through
  `kindBarHTML()`'s edit branch. It has no `⋯`, so moving them there would
  have made both unreachable while editing.
- **No sync, storage or export path was touched.** I1–I4 are untouched by a
  round that moves buttons between a row and a menu.

## v04.12 — the ⋯ button finally opens, and Multi becomes a stack of three (11 September 2026)

**The ⋯ button was still broken after v04.11 said it was fixed.**

v04.11 found that its `onclick` passed a bare `curA.id` — a `const` local to
`renderP3H()` — so the handler threw `ReferenceError` and nothing happened.
Interpolating the id stopped the throw, and both checks written for it passed.
The button still did not open on a left-click.

The second fault was underneath the first. The `onclick` handed `showArtCtx()`
a **synthesised event**:

```js
showArtCtx({clientX:event.clientX, clientY:event.clientY,
            preventDefault:()=>{}, stopPropagation:()=>{}}, id)
```

`showArtCtx()` builds the menu, shows it, and calls `ev.stopPropagation()` to
keep the click off the document. On that object the call is a no-op, so the
**real** click carried on bubbling to

```js
document.addEventListener('click', () => { hideCtx(); ... })
```

which shut the menu in the same tick it was opened. Right-click was never
affected: that global closer listens for `click`, not `contextmenu` — which is
exactly why the button looked half-working for a whole version series.

The fix is to pass the real `event`, as `oncontextmenu` on the same button
always did. It carries `clientX`/`clientY` and a `stopPropagation()` that stops
something. There was never a reason to synthesise one.

**Why the v04.11 checks missed it**

Both of them asked the wrong question. One asserted no handler threw; one read
`#ctx.textContent` and found nineteen rows. Both are *true* of a menu that is
built, painted and hidden again a millisecond later — the menu really was
populated, it just was not on screen.

The check that exists now clicks the button with a real Playwright mouse event,
waits, and asks whether the menu is still painted: `display`, a box bigger than
40×40, on-screen coordinates, ten rows or more. Reintroducing the synthesised
event makes it fail with the exact fingerprint of the bug —
`display none · 0×0px · 19 rows`.

**Multi is three sheets now, standing upright**

The owner asked for a three-layer vertical shape instead of two squares. Three
portrait pages, painted back to front, each one opaque so the front sheet
occludes the ones behind — three overlapping outlines at 17px is mush. The two
behind fade by **stroke opacity only**: fading the whole element would make
their paper translucent and let the edges underneath show through the sheet in
front, which is the mush being avoided. Against Single's one card on a dimmed
screen the two now read apart at a glance, which was the point of v04.10.

**Measured**

11/11 ship checks, and app checks from 67 to **68**.

The new one is the menu-visibility check above. The v04.10 icon check was
**updated in place** to assert Multi has exactly three `<rect>`s and that every
one of them is taller than it is wide — a two-layer or landscape drawing now
fails rather than passing silently.

**What was NOT done, and why**

- **The "General" chip was left exactly as it is.** The owner asked whether it
  earns its place; that is a question, not an instruction, and removing the
  only at-a-glance view of a note's type is not a change to make on an
  inference. What the answer is: it is the note's Note Type, and for a note
  with ONE type it is the only place that type appears — the note list only
  shows a `🏷N` badge when a note has two or more. Tapping it **removes** the
  type (`toggleNoteKind`, tooltip "tap to remove"), which is a hazard now that
  Note Type has a proper home under 📎 Attach. Three options were put to the
  owner: leave it, make it read-only, or drop it.
- **No sync, storage or export path was touched.** I1–I4 are untouched by an
  event argument and an icon.

## v04.13 — the type chip stops deleting things (11 September 2026)

The owner asked whether the `General` chip on the note toolbar earned its
place. v04.12 answered the question and left the chip alone; this round acts
on the answer they picked: **keep it as the badge, make it read-only.**

**What it was doing**

```js
onclick="toggleNoteKind(...)"  title="General · tap to remove"
```

One tap on something that reads as a label stripped the note's type. That was
defensible while `🏷 Types` sat on the bar right beside it; once v04.11 moved
Note Type to its proper home under `📎 Attach`, the chip was a delete button
wearing a label's clothes and nothing else.

**What it does now**

Tapping it opens the Note Type picker — the place a type is added or removed
deliberately — anchored under the chip. The tooltip says
`Note Type: General — tap to change`. Nothing became unreachable: the picker,
`📎 Attach → Note Type`, and the right-click menu's NTI Types submenu all still
take a type off.

One trap avoided, because v04.11 already paid for it: the chip also appears
inside the `🏷` palette on a narrow pane, and that palette has to close behind
the tap — but the picker positions itself from the element it is handed, and an
element inside a closed palette measures 0×0 and would put the picker in the
top-left corner. `_ntiChipTap()` opens first and closes second.

**What "General" actually is**

Worth recording, because it is the real answer to the owner's instinct that the
chip was not doing anything. `toggleNoteKind()` ends with

```js
if(!kinds.length) kinds.push('general');
```

so a note **always** carries at least one type, and `general` is what it falls
back to. In the picker, `General` sits under a category called **Undecided**.
So on every note the owner has never typed, the chip reads `General` — which
is precisely why it looked like it was there for nothing. It was showing "no
type chosen yet", in a word that does not say so.

**Measured**

11/11 ship checks, and app checks from 68 to **70**.

The two new ones assert that tapping the chip leaves the note's types
*unchanged*, opens the picker, and anchors it away from the corner — and,
separately, that a type deliberately added can still be taken off. Putting the
old `toggleNoteKind` onclick back fails the first with
`picker opened false · tooltip "General · tap to remove"`.

**A wrong assertion, caught before it became a "fix"**

The removal check first asserted that removing a note's ONLY type reduced the
count. It failed — and the app was right. `general` is the fallback, so
stripping the last type substitutes it rather than leaving none. The check adds
a second type and removes that instead. The brief's rule earned its keep again:
a failing check is a wrong assertion surprisingly often.

**What was NOT done, and why**

- **The chip still shows `General` on untyped notes.** Hiding it when the type
  is only the `general` fallback would take the chip off most notes entirely —
  a bigger change than "make it read-only", and one the owner has not asked
  for. Offered as a follow-up.
- **No sync, storage or export path was touched.** I1–I4 are untouched by one
  onclick.

---

## v04.14 — the sidebar header, rebuilt to read (11 September 2026)

Three things in one screenshot, all of them in the top-left corner of the app:
the version number was invisible, the row of buttons was four different sizes,
and the `▾` beside `🏠` was a **14×19px** speck.

**Why the version number vanished**

It was painted in a fixed grey, `#6A7F6C`. On the Forest preset that measures
4.3:1 against the sidebar — dim but there. The owner had set a custom sidebar
colour (Appearance ▸ Custom colours), and on that teal the same grey measures
about **1.2:1**. Invisible, exactly as reported. `--forest` is owner-settable,
so *any* fixed colour in that header is a colour that works until the owner
changes one setting.

Everything in the header is now painted in translucent black or white over
whatever the sidebar colour happens to be, in two layers:

- **recessed** (a dark translucent layer) — the version badge, the search
  field, the "Back to search results" button;
- **raised** (a light translucent layer) — the buttons.

Lightening is what killed the contrast: white on a 17%-white pill over that
teal is 3.8:1, while white on a 28%-black pill is 8.4:1 — and 18.9:1 on
Forest. The first attempt at this round used a light pill, and **app-check
failed it at 3.8:1** before it could ship.

**The buttons**

They were `37×36`, `14×19`, `37×36`, `42×40` and `37×45`, in four font sizes,
with the `▾` tucked under a negative margin. Now every one of them is one
square in one icon size — 34×34 on desktop, **42×42** on phone and tablet (the
size the note toolbar has been held to since v04.09) — in its own rounded box
with one hover.

`🏠` and its `▾` became a **split button**: one pill, a hairline divider, Home
still one tap on the left, the archives menu on the right. The chevron is
26×34 on desktop and 30×42 on a phone — the narrow half of a split control,
which is why it is checked on **both** dimensions and not on the smaller one.

**The header also did not fit its own pane**

Found while measuring, not reported: at a 200px sidebar the header's contents
ran **292px** wide, so `🧰` and `⚙` were pushed off the edge of the pane with
nothing able to reach them. The sidebar drags from 160px to 540px, so a 1440px
laptop can be showing a 200px one — `window.innerWidth` has nothing to say
about it.

`_sbFitHeader()` measures the header against its own pane and folds one thing
at a time, the same shape as `_p3FitToolbar()`: first the word "Siyagah" goes
(`📚` and the version badge stay), then the buttons drop to their own row. A
`ResizeObserver` on `#sb` runs it, because the sidebar changes width without
the window changing at all — the drag handle, Auto-fit width and the collapse
toggle all do it.

Measured at every width the sidebar can be dragged to:

```
160:122px (wordmark folded)  200:84px  240:84px  280:57px
330:57px  390:57px  460:57px  540:57px     — nothing clipped, at any of them
```

**One trap this round paid for**

The first cut let the logo shrink (`flex:1 1 auto; min-width:0`). The word
"Siyagah" was then squeezed to **0px** — still in the DOM, still "fitting",
`scrollWidth === clientWidth` — so the fold never fired and the fit function
measured a header that was silently losing its own contents. This is the v04.08
note-type-chip failure in a new place. Nothing in that row shrinks now; it
overflows honestly, and the overflow is what gets measured.

**Measured**

11/11 ship checks, and app checks from 70 to **80**.

The ten new ones compute real WCAG contrast — blending each translucent layer
over the colour behind it — for the version badge, the search placeholder and
typed search text, on the Forest preset **and** on the owner's teal; walk the
sidebar from 160px to 540px asserting nothing is clipped and the badge survives
every width; assert one square and one icon size for every button; assert the
`▾` on both dimensions, at desktop and at phone; and click the `▾` with a real
mouse and look again 250ms later, because v04.11 shipped a menu that opened and
was shut in the same tick.

**What was NOT done, and why**

- **The word "Siyagah" folds away on a phone.** Keeping it alongside 42px
  touch targets needs 402px of row inside a 370px phone header; the wordmark
  is the only part of the row that is decoration, so it is what folds. It
  returns at a 330px sidebar and on every desktop and tablet layout.
- **The tree below the header was left alone.** `SMART VIEWS`, `TAGS` and the
  count badges are painted at 25% white and are faint on a light custom
  sidebar colour for the same reason the version number was. Same fix, a
  different part of the app, and not what was asked for — offered as a
  follow-up.
- **No sync, storage or export path was touched.** I1–I4 are untouched by a
  stylesheet and one measuring function.

---

## v04.15 — the sidebar list reads on any colour you give it (11 September 2026)

v04.14 fixed the version number and the header. The owner's answer to the
offer at the end of it was "yes, fix the sidebar list too" — so this round
does the same job for everything below the header, and does it by measuring
the whole sidebar at once rather than naming faults one at a time.

**What was wrong**

Everything in the list was painted in a fixed colour chosen for the dark
green preset — and several of them were colours meant for text on *paper*,
`var(--t2)` and `var(--green2)`, sitting on a dark sidebar. Measured against
the teal the owner had actually set:

| | was | on Forest | on the owner's teal |
|---|---|---|---|
| section headings (`SMART VIEWS`, `TAGS`) | `#4A6A4E` | 3.0:1 | **1.2:1** |
| the count badges | `#4A6A4D` | 2.4:1 | **1.3:1** |
| `📚 Folders`, `📝 New Note` | `var(--t2)`, `#6DC994` | 2.4:1 | **1.4:1** |
| `🗂 MyDatabase` | `#ff8000` | 7.1:1 | **2.1:1** |
| per-section Smart Views rows | `var(--t2)` | — | **1.4:1** |
| `5 results`, `📁 Folders` in search | `#4A5A4C` | — | **1.4:1** |
| `Empty — add a folder with ＋` | `#3A5A3E` | — | **1.1:1** |

**What it is now**

One measurement decides the whole palette: the relative luminance of
`--forest`, the colour the owner sets. `applySidebarInk()` runs on every
theme change and writes a set of CSS variables —

```
ink / ink-soft / ink-dim    text, in falling importance
panel / panel-hi            a RAISED layer   (icon buttons)
strip / strip-hi            a RECESSED layer (headings, fields, pills)
line / hair                 borders, strong and faint
```

— and every rule in the sidebar now uses them instead of a hex. A dark
sidebar takes white ink with strips that go darker; a **pale** one takes
near-black ink with strips that go lighter, which means a pale sidebar is
usable for the first time (it used to be white text on cream). The defaults
sit in `:root`, so a downloaded copy paints correctly before any script runs.

Two visible consequences, both deliberate:

- **A section heading sits on a recessed strip.** It separates the sections,
  and it is what lets a heading keep a colour of its own — the amber
  MyDatabase one — and still read on a mid-tone background.
- **The two buttons at the bottom are buttons.** They were bare labels; they
  are boxed, inked and 40px tall (46px on a phone).

**The rule this round paid for**

A raised panel *lightens* the sidebar colour, and that **costs** a white
label its contrast: `📝 New Note` measured exactly 4.5:1 on a raised panel
and 8.7:1 on a recessed strip. So: icon buttons ride a panel, anything
carrying words sits on a strip. Same mistake as v04.14's first light pill,
in a new place, caught by the same check.

**Measured**

11/11 ship checks, and app checks from 80 to **89**.

The nine new ones do not name elements. They walk **every** element in the
sidebar that carries a word of its own, composite the translucent layers
behind it, and score the real WCAG contrast — in three states (everything
expanded, a folder selected, a live search) on five sidebars: Forest, the
owner's teal, Ocean's navy, a pale cream and a mid grey. 82 pieces of text
each time. A sixth run does it on an empty notebook, where the "nothing here
yet" lines live. Plus: the ink flips on a pale sidebar (and the search-results
colour with it), a heading's strip is not the ground its rows sit on, and the
two toolbar buttons are boxes with a 40px hit height.

Worst score anywhere, across all six runs: **4.7:1**, against a 4.5:1 bar.
Putting one of the old greys back fails five of the nine.

The bar is 4.5:1 except where no ink can reach it — a mid grey caps out near
5:1 whichever way you go — so there the bar is what is actually achievable,
not a number that cannot be met.

**What was NOT done, and why**

- **Only the sidebar.** Pane 2 and Pane 3 are paper-coloured and have their
  own settings; nothing there was touched.
- **The green "＋ Add group" label became plain ink.** No green is light
  enough to reach 4.5:1 on a mid-tone sidebar — the ＋ carries the meaning.
- **Dead CSS was left alone** (`.sb-ft`, `.sb-ud`, `.tag-it` and friends
  render nowhere any more). Deleting them is not this round's job, and a
  dead rule cannot be measured.
- **No sync, storage or export path was touched.** I1–I4 are untouched by a
  stylesheet and one function that reads a colour.

---

## v04.16 — the middle and right panes, measured the same way (11 September 2026)

The third round of the same job. v04.14 did the sidebar header, v04.15 the
sidebar list; the owner then asked for the panes. The sweep was pointed at
`#p2` and `#p3` **before** anything was changed, and the first finding was
not about custom colours at all:

**14 of 36 pieces of text in the panes were below 4.5:1 on the theme as it
ships.** Every one of them `var(--t3)` at 2.7–3.1:1 — the dates under note
titles, `🏠 Home`, `▤ Preview`, `🌳 Full tree`, `ARTICLES (1)`, `＋ Add Tab`,
`🔀 Start Versioning`, `Set the Status`, `🏷 Tags` — plus the tag chips in a
teal that scored 3.1:1. Nobody had to pick a strange colour for any of that;
it was the default.

`--t3` is now `#6B665F` instead of `#9A9289` (3.1:1 → 5.7:1 on white), the
tag chips keep their teal tint and border but write the word itself in the
pane's ink, and the note's own body colour stopped being a hex — it is
`--body-ink`, a token, like everything else here.

**Why the panes did NOT get the sidebar's treatment**

The sidebar is a plain surface, so v04.15 could simply flip its ink for a
dark colour. A note is not a plain surface: its headings carry pale bands
baked into the stylesheet (`.av-body h1{background:#F0FDFA}` and friends),
and its chips and widgets are pale-with-dark-text throughout. The first cut
of this round flipped the pane ink the same way and **measured worse** — the
note's own `One` and `Sub` headings went to 1.0:1, light text on a light
band. A dark reading page is a real dark mode, and it is a round of its own.

So the content area stays a paper surface, and the round keeps it one:

- **A pane background too dark to write on is lightened until dark ink can
  live on it** (`PANE_MIN_LUM = 0.35`), and the owner is told in a toast
  which colour they actually got and why. `#16202A` becomes `#A1A6A9`.
- **The three ink levels are then derived from that background**, not
  inherited from a preset that knew nothing about it: `--t1` at 9:1, `--t2`
  at 6:1, `--t3` at 4.8:1, `--body-ink` at 8:1, each darkened from the
  paper's own hue until it clears its target.
- **`--on-accent`** is white or near-black depending on the accent's
  luminance, and every white-on-accent label now uses it — a pale accent used
  to erase `✚ Note`, `✏️ Edit`, `💾 Save`, `✓ Saved` and `Quick Note`.
- **`--green2` is derived too.** It is the accent *as text* (links, the
  folder chip under a note title); a flat 15% darken left a pale accent at
  2.0:1, so it is now darkened until it clears 4.6:1 on the tint it is
  written on.

**Measured**

11/11 ship checks, and app checks from 89 to **96**.

Five of the seven new ones sweep every word in both panes across four states
— the landing page, a folder open, a note being read, the same note being
edited — with: the theme as it ships, a pane background far too dark, a mid
grey one, a pale accent, and a pale accent on a dark background. 36 pieces of
text per run, worst score anywhere **4.8:1**. The other two prove the
mechanism: the dark colour is lightened and the inks re-derived from what it
becomes (body text 8.0:1, faintest ink 5.0:1), and white stops being the
label colour on an accent too pale to carry it.

Putting `#9A9289` back fails two of them.

**What was NOT done, and why**

- **A dark reading page is not supported** — it is lightened instead, with a
  toast that says so. Doing it properly means dark variants for the heading
  bands, the note widgets, the chips and every pale panel in pane 3. Offered
  as its own round.
- **Only what the panes render in those four states was measured.** The
  calendar, kanban, journal and folder-browser panels have their own colours
  and were not swept; the same net will catch them when it is pointed at them.
- **`var(--hover)` is undefined** — 56 rules use it, so 56 hover states do
  nothing at all. Found while reading; it is a cosmetic defect in a different
  class from this round's, and defining it changes 56 places that would then
  need measuring. Recorded here, not fixed.
- **No sync, storage or export path was touched.** I1–I4 are untouched by a
  stylesheet, two derivations and a toast.

---

## v04.17 — the folder pop-out, given what the sidebar folders got (11 September 2026)

Fourth round of the same job, this time on the Folder Browser — the window
`📚 Folders` opens. Measured before anything was touched, and it had both of
the defects the sidebar had.

**Text**

One failure, but a systemic one: the pop-out's two inputs had **no
`::placeholder` rule at all**, so `🔍 Search…` and `New folder name…` were
painted in the browser's own `#757575` — 4.2:1 on the default paper and
**1.9:1** on a derived one (v04.16 makes the paper follow the owner's chosen
colour; the browser's grey does not follow anything). They use `--t3` now,
which does.

Everything else in the window already passed, and passed because of v04.16:
the rows and paths are `--t1`/`--t2`/`--t3`, which are derived from the pane
background. Three rounds of tokens paying off in a fourth place.

**Controls**

The same picture the sidebar header had in v04.14, and worse for being
hidden behind a button most people press rarely:

| | was | now (laptop) | now (phone) |
|---|---|---|---|
| `◀` `▶` section steppers | **20×20** | 32×32 | 42×42 |
| `📚` all sections, `🎨` text style | 30×30 | 32×32 | 42×42 |
| `📍` `✏️` per-row actions | 22×19 | 28×28 | 38×38 |
| `🗑` delete a folder | **19×19** | 28×28 | 38×38 |
| the fold chevron | 28×22 | 28×28 | 38×38 |
| `Close` | 56×**26** | 56×34 | 56×44 |
| a folder row | 36px | 42px | 52px |
| the section dropdown | 146×22 | 142+×32 | 158×42 |

**Every one of those was the same size on a phone as on a laptop**, and under
1200px this window is full screen — so the 19×19 delete target was a 19×19
delete target on a 390px phone.

**Group headings sit on a strip**, the way the sidebar's section headings do
since v04.15 — `📁 FOLDERS`, `🏷 TAGS`, `📄 NOTES` in the search results, and
the section headings in the browse list. They were three copies of the same
inline style in `--t3`; they are one class now.

**One thing the round had to fix about itself:** bigger steppers squeezed the
section dropdown from 146px to 118px, which clipped `MY NOTEBOOKS` to
`MY NOTEBOC`. The title bar wraps now instead of squeezing — one row from
520px of window width up, two below it — and the check measures the dropdown
at four widths so the next control added there cannot quietly eat it again.

**Measured**

11/11 ship checks, and app checks from 96 to **105**.

Four of the nine sweep every word in the pop-out across three states (the
tree closed, the tree open, a live search) with the theme as it ships, a pane
background too dark to write on, a mid grey one and a pale accent. Three more
measure the controls at a laptop and at a phone, and the strip behind a group
heading. The last one drags the window from 420px to 1000px and asserts the
section dropdown never goes below 142px and nothing is pushed outside the
title bar.

**Two wrong assertions, corrected rather than worked around**

The first cut failed three of its own checks. Both causes were in the check,
not the app: the title bar's four squares are *icon* buttons and were being
held to the 34px minimum written for buttons carrying words; and the geometry
probe measured in the search state, where there are no chevrons and no
per-row actions at all — so it read "0 icons" and called it a pass, then
"no group heading rendered" and called it a fail. It measures both states now
and says which state each thing comes from.

**What was NOT done, and why**

- **Only the browse pop-out was swept.** The same modal shell is used by
  `Assign to folders` (the picker) and by the note-link panels; they share
  most of these classes and get most of this for free, but they were not
  measured and are not claimed.
- **The action icons still only appear on hover on a laptop.** That is how
  they were; making them permanent is a behaviour change nobody asked for.
- **No sync, storage or export path was touched.** I1–I4 are untouched by a
  stylesheet and a class name.

---

## v04.18 — the Assign window, and a note count on every folder (11 September 2026)

Two things the owner asked for together: the same treatment for
**Assign to folders**, and the note count the sidebar shows on its folders.

**Assign to folders**

Measured first, and most of it already passed — it shares its rows, its
chevrons and its action icons with the browse pop-out, so v04.17 had already
sized them and v04.16 had already made their text follow the pane colour.
Three rounds of tokens and one round of sizing, arriving somewhere nobody
pointed them at.

What was still wrong was the control the window exists for:

- **The tick box was 15×15** — on a phone as well as on a laptop, and this is
  the box you tap to file a note. It is 20×20 on a laptop and 24×24 on a
  phone now. (The whole row was, and still is, the real target; the box now
  looks like one too.)

**A folder name you can read, on a phone**

With three 38px action icons permanently on every row, a folder name got
about **65px of a 317px row**, so `(001) Seeded Folder` arrived as
`(001) See…`. That was true in v04.17's browse pop-out as well — the
measurement here found it in both.

Two changes, the second because the first was not enough:

1. **Names wrap** instead of being cut, clamped to two lines, exactly as they
   do in the sidebar. On its own this bought rows of 82px and *still* showed
   `(001) See…`, because 65px does not fit a name however you wrap it.
2. **The three row actions fold into one `⋯` under 1200px**, opening as a
   menu — the same answer the note toolbar reached in v04.09 and v04.11:
   fold a group, never hide it. The name now gets 122–181px and arrives
   whole; rows are back to 52px.

On a laptop nothing changed: the three icons are still on the row, and the
`⋯` stays out of the way.

**The note count**

Every folder row in **both** pop-up windows now carries the count the sidebar
badge carries, from the same `cntOf()` — the folder and everything under it.
Checked row by row against `cntOf()` in both windows rather than eyeballed.

**Measured**

11/11 ship checks, and app checks from 105 to **113**.

Two sweep the Assign window's text (two colour settings — it shares its
classes with the browse pop-out, so this is a regression net, not a
discovery); two measure the tick box at a laptop and a phone; one compares
every row's badge against `cntOf()` in both windows; two cover the fold —
that the actions really are folded and the whole name is on screen, and that
a **real** click on the `⋯` opens all three and the menu is still painted a
tick later; and one asserts the laptop kept its three icons.

**A wrong assertion, corrected**

The fold check first demanded 140px of folder name, a number lifted from the
browse pop-out. The Assign window also carries a tick box, so its name box is
122px — and shows the whole name anyway. The check asks the real question
now: is the element's text the folder's whole name, and does it fit without
overflowing its two lines.

**What was NOT done, and why**

- **Note titles in these windows also wrap to two lines** and are not folded
  behind anything; their rows carry two actions, not three, and they fit.
- **`＋ Add group` and the note-link panels** use the same modal shell and
  pick most of this up, but they were not measured and are not claimed.
- **The count is notes, not sub-folders** — the same number the sidebar has
  always shown, including everything in child folders. If the owner wants it
  to mean "notes directly in this folder", that is a different number and a
  different round.
- **No sync, storage or export path was touched.** I1–I4 are untouched by a
  stylesheet, a count and a menu.

---

## v04.19 — three colour variables that were used everywhere and defined nowhere (11 Sep 2026)

Reported: `--hover` is used in 56 places but never defined, so 56 hover
highlights do nothing. Confirmed exactly — 56 bare `var(--hover)`, zero
definitions. An undefined variable with no fallback makes the whole
declaration invalid, so those rules painted nothing at all.

**Two more of the same, found by sweeping instead of by name**

Written as a check for `--hover` this round would have fixed one third of it.
Written as "every `var()` with no fallback, does it resolve", the same sweep
found two more:

- **`--paper2`** — 7 bare uses. A static off-paper surface: the quick-add bar,
  a pop-out's top row, the cite block, the TOC hover.
- **`--accent`** — **85** bare uses, and the sharp end of the bug. 58 are
  `color:`, 27 are borders and outlines, and **14 are
  `background:var(--accent);color:#fff`** — white text on no background at
  all. That is not cosmetic; `Save` in the quick-add bar was simply not there.

148 dead references in total, against the 56 reported.

**What they became**

`--hover` and `--paper2` are a darken of `--paper`, derived like `--border`
already was, not a fixed grey — `--paper` is owner-settable, and a fixed grey
is the defect this project has now paid for four rounds running. 6% for
`--hover` and 3% for `--paper2`; 6% reads 1.14:1 against the paper, which is a
visible highlight without being a block of colour.

`--accent` is `--green2`, the accent already darkened until it reads **as
text** — because 58 of its 85 uses are a text colour, and the 14 background
uses pair it with `#fff`, which wants a dark colour too.

**The measurement that decided the magnitude**

A tint darkens the surface, so it eats the contrast of the ink on it, and
`--t3` is the ink on dates and count badges — which sit on hovered rows.
Sweeping the shipped presets first, as the standing lesson says:

| preset | `--t3` on paper | on a 6% tint |
|---|---|---|
| Forest | 5.18 | 4.53 |
| **Ocean** | **4.38** | 3.83 |
| Amber | 4.86 | 4.26 |
| Indigo | 6.48 | 5.66 |
| Rose | 7.19 | 6.32 |

**Ocean's `--t3` was already failing 4.5:1 with no tint and no custom colour
at all** — v04.16 fixed the default preset's `--t3` and never looked at the
other four. So the rule became: the worst ink must read on the worst surface
it lands on. `--t3` is now measured on `--hover`, not on the paper — statically
for Forest, Ocean and Amber, and in `applyPaneInk()` for a custom background.
Amber's `--green2` moved for the same reason (4.26:1 on its own hover tint).

`_accentInk()` now clears 4.6:1 on every surface it is written on rather than
only the pale tint, and `--green2` is re-derived whenever the **paper** is
custom, not only when the accent is — a preset green on a custom paper was
sitting at 3.0:1 on `Save`, which is what first turned three older checks red.

**Measured**

11/11 ship checks, and app checks from 113 to **128**.

Seven ask, on five presets and two custom settings, whether every `var()`
written without a fallback resolves to anything — 41 variables swept, named
nowhere in the check, so it catches the next undefined one anyone adds. Seven
score every piece of text painted on `--hover`, `--paper2` or `--accent` at
4.5:1, pooled over six states and including rules that name their own ink
(which need no element, and so reach the modals and the calendar that no
reachable state renders): 30 pieces per theme, worst 4.6:1. One moves a **real
mouse** onto a **real** row and reads the painted background before and after
— `rgb(255,255,255) → rgb(232,229,223)`, because a rule that resolves is not a
rule that shows.

**Three wrong assertions, corrected — one of which made the check useless**

- The variable sweep walked `rule.style[i]` and read each longhand. Chromium
  expands `background: var(--hover)` into nine longhands and returns `''` for
  all nine, so the sweep **saw no variable at all** and passed happily with
  `--hover` deleted. It caught `--accent` only because that is written as
  `color:`, a real longhand. It reads `rule.style.cssText` now. Proved by
  deleting `--hover` again and watching it fail.
- It also recursed on `rule.cssRules` and `continue`d. Every style rule has a
  truthy (empty) `.cssRules` now that Chromium does CSS nesting, so that read
  **6 rules out of 1286**.
- The contrast pass fed a hex to `px()`, whose `/[\d.]+/g` turned `#E2E7F0`
  into `rgb(2, 7, 0)` — near black — and reported 2.0:1 against text that is
  perfectly readable. And it scored an element's un-hovered `color` against the
  hover background, where `.tab-it:hover` restyles its ink in the same rule:
  1.2:1 on a tab that is fine.

**What was NOT done, and why**

- **Four genuine contrast failures found in passing, and left alone.** A
  rule-level pass over every opaque background-and-ink pairing put
  `.mrj-btn-good` (white on `#22C55E`) at **2.28:1**, `.mrj-btn-ok` (white on
  `#F59E0B`) at **2.15:1**, `.mrj-btn-bad` at 3.76:1 and the journal count
  `.jrn-cnt` at 3.66:1. These are white-on-mid-tone fixed pairings — the trap
  already in the standing lessons — not undefined variables, and fixing them
  is a different round. That pass is therefore **not shipped as an assertion**;
  shipping it would mean shipping a red gate.
- **The element-level contrast sweep reaches 7–9 of the 63 tint rules.** The
  rest live in modals, the calendar, citations and float windows that no
  reachable state renders. The rule-level pass covers those wherever the rule
  names its own ink; where it inherits, it is not measured and is not claimed.
- **A pale sidebar was not re-examined.** None of the 148 dead references are
  in `#sb`, which has its own `--sb-*` palette; the sidebar is untouched.
- **No real dark mode.** `--hover` darkens because `_paneSafePaper()`
  guarantees the paper is never dark. A dark reading page is still a round of
  its own.
- **No sync, storage or export path was touched.** I1–I4 are untouched by a
  stylesheet and two derivations.

---

## v04.20 — the Smart View gets the same second row, and a way to start a note (11 Sep 2026)

The owner sent two screenshots side by side. A folder's pane 2 carried three
rows — the title bar, a row of folder pills, `🏠 Home 🔍 Search` — plus an
`ARTICLES (0)` list you could type a new title straight into. A Smart View
carried the title bar and `🏠 Home 🔍 Search` and nothing else. *"Why are they
different? Why can't they be like Image 1?"*

**The row-1 answer is that they already were.** `📚`, `✚ Note` and `▤ Preview`
are built once in `renderP2H()` as `newBtn` / `previewBtn` / `fbBtn` and every
branch uses them. What was missing was the row underneath, and the quick-add
box.

**Why it was missing, and it was a real reason.** Every button on the folder
row is about a POSITION IN THE FOLDER TREE: up to the parent, down into a
child, a new subfolder inside this one, the whole tree, the subfolders as
cards. A Smart View has no position in that tree — it is a saved question
("which notes were edited recently?"), so it has no parent, no children, and
nothing to put a subfolder into. `renderP2H()` cleared `#p2h-path` at the top
and only the plain-folder branch ever filled it back in. Same for the box:
`qtSave(folderId)` writes the note into a folder, and a Smart View is not a
place — a note cannot be "put in" Recently Edited.

**So the row is not copied, it is translated.** Same classes, same pills, same
position, so the two screens read as one app:

| folder row | Smart View row |
|---|---|
| `🌳 Full tree` | `⬇ Expand all` / `⬆ Collapse all` (only where the view has groups) |
| `🗂 Card View` | — `▤ Preview` already sits in row 1 |
| `⬆ <parent folder>` | `⬆ <the folder a new note lands in>` |
| `📁 <child folder> <count>` | `<icon> <every other Smart View> <count>` |
| `➕ New folder` | — a Smart View cannot hold a folder |

The sibling chips are the point. From Favourites you step straight to Pinned
or Reminders without going back to the sidebar — exactly what the folder row
does for sibling folders. Each chip carries the same note count the sidebar
badge shows, and right-click still opens the Smart View's own menu.

**The quick-add box, where a note can honestly go.** A note typed into a Smart
View lands in `DB.theme.lastFolder` — the same fallback `newStarredNote()` has
used since v04.00 — and `SF_QUICK` then makes it TRUE of the view you typed it
in: Favourites stars it, Pinned pins it, Reminders opens the reminder dialog
next. Inside a **section** Smart View the destination is narrowed to that
section's own folders, or the note would be created outside the very view you
are standing in. The `⬆` chip names that folder, and clicking it opens it.

Five views deliberately get **no** box: a brand-new note that is already
archived is a contradiction, and MyWall, Murājaʿah, In Practice and Daily
Journals each render their own list and each mean something specific by
"belongs here". Offering a box that saves a note you then cannot find is worse
than offering none.

**The box itself.** It was a flat, borderless strip with a 15px `📄`, a
transparent `Save` and `background:var(--paper2,var(--paper))` — the eye slid
straight past it. It is now a raised pill: a `✚` badge, a rounded field on
`--paper`, a solid `Save`, and a lift to white with a green ring on
`:focus-within`. Every colour is a theme variable, so it follows the owner's
own accent.

**Measured**

11/11 ship checks, and app checks from 128 to **144**.

The sixteen new ones ask whether the parity is real and does its job, not
whether the markup exists: all 11 views carry the same `.p2h-path-row` a
folder does (9–12 chips each); a **real mouse click** on the Favourites chip
from Recently Edited really lands on `sf-favs`, looked at again 300ms later;
the box is in the six views it should be in and none of the five it should
not; a title typed into Favourites comes back `favourite:true`, in a real
folder, **inside `getSmartArts('sf-favs')` and painted on screen** — and the
same for Pinned; a folder's own box still saves to that folder and does NOT
quietly star or pin it; Reminders really opens `#rem-modal`; Expand/Collapse
are counted by the note rows actually painted, not by the state flag; a
section's Smart View saves into a folder that is genuinely in that section;
the bar is 42px tall on a phone and 28px on a laptop; and `Save` and the
placeholder both clear 4.5:1 on all five presets.

**Three faults in this round's own work, caught by the checks and a screenshot**

- **`--on-accent` is the ink for `--green`, not for `--accent`.** The first cut
  of the bar wrote `background:var(--accent);color:var(--on-accent)`, which
  looks like the obvious pairing and is the wrong one: `applyPaneInk()` derives
  `--on-accent` against `--green`, while `--accent` is `--green2`, a *darkened*
  copy meant for use as TEXT. v04.19's sweep scored it at **3.3:1 on Amber and
  2.9:1 on a pale custom accent** — dark ink on a dark pill. It uses `--green`
  now, the same pair `.bp` has always used for `✚ Note`.
- **`➕` is a colour emoji and ignores `color`.** Chosen as the badge glyph, it
  painted itself instead of taking `--on-accent`, and arrived as a muddy shape
  on a dark green circle. No check saw it; a screenshot did. It is `✚` now —
  a text glyph, which is what the `✚ Note` button has always used.
- **The placeholder did not fit the phone.** It read `New favourite ⭐ — saves
  into (001) Seeded Folder, press Enter…` and arrived as `…press En` in a
  232px field. The destination is already named by the `⬆` chip one row up, so
  the placeholder is short now and the tooltip carries the folder name — and
  the phone check measures the placeholder in the field's own font on a canvas,
  rather than trusting the eye.

**What was NOT done, and why**

- **The row scrolls sideways on a phone.** Ten sibling chips do not fit 390px,
  so the row scrolls exactly as the folder row already does. Trimming the list
  would mean guessing which Smart Views the owner uses; the order is the one
  they already set in the sidebar, so the most-used sit first.
- **`🗂 Card View` and `🌳 Full tree` have no Smart View equivalent** beyond
  Expand/Collapse. Cards show *subfolders*, and a Smart View has none.
- **The Note-Type, tag and MyDatabase headers still have no second row.** They
  were not in the report and each needs its own answer to "what is the
  analogue" — a Note Type's siblings are other Note Types, which is a
  different list. Left for a round that is asked for.
- **Four pre-existing `v04.20 —` comments in `index.html`** describe the edit
  bar's text-size stepper, which shipped under an earlier number and was never
  logged here. They are mislabels; they are not this round and were left alone
  rather than rewritten on a guess.
- **No sync, storage or export path was touched.** `mkArtTitleOnly()` gained an
  optional third argument and one `apply()` hook that runs before the single
  existing `persist()`. I1–I4 are untouched.

---

## v04.21 — the two header menus, split by what they actually do (11 Sep 2026)

The owner circled the two buttons at the right of the sidebar header — 🧰 and
⚙ — and named five items sitting in ⚙ Settings:

> 📅 Calendar Country · 📖 Insert Reference · ☪ Hijri Dates · 📚 Sync Knowledge
> Base · 🗂 Add Starter MyDatabase Folders
>
> The above button should be separated from settings, and move to other button.
> And then, organise both groups of buttons elegant way, the best way you can do.

**The line the split now follows.** Those five are not settings. Each one
writes something into the notebook or puts something into a note: a country
for the holidays the calendar draws, a Qurʿan or Hadith reference at the
caret, Hijri numbers on the calendar, the built-in guide notes, seven starter
folders. So the rule the two menus now obey is:

- **🧰 Tools — things you do TO the notebook.** Create, insert, view, save.
- **⚙ Settings — the app itself.** Account, sync, backups, export. Nothing in
  it writes a note or a folder.

**Every group now has a heading.** Both menus were a run of rows broken by
hairlines — no way to find a group without reading all of it. Each group now
carries its name on a `--hover` strip (`--hover` is derived from `--paper` and
`--t3` is measured against it since v04.19, so the pairing is safe by
construction, and it was measured anyway):

```
🧰 TOOLS                          ⚙ SETTINGS
  [↩ Undo]  [↪ Redo]               [☁ Live]
  CREATE                           ACCOUNT
    ➕ New Section                    ☁ Cloud Sync
    📁 New Folder                     🔒 Sign Out
    🗂 Add Starter MyDatabase…      APP
    📚 Sync Knowledge Base            🔄 Refresh App
  REFERENCE & DATES                  📱 Install App
    📖 Insert Reference            BACKUP
    📅 Calendar Country               🗄 Automatic Backups
    ☪ Hijri Dates                    📥 Import Backup
  VIEW                               ☁ Backup to Drive
    🎨 Appearance                  EXPORT
    ↔ Auto-fit width                  📦 Backup Export
    🔢 Auto-number all                📄 Export PDF
    📂 Accordion sections             🚀 Deploy Export
  SAVE
    🔗 Enable auto-save
    ● Unsaved to file
    [💾 Save File]
    ────
    🗑 Trash (n)
```

Nothing was renamed and nothing was dropped: the same 26 actions, 16 in Tools
and 11 in Settings (`openSyncModal` is on both — the ☁ Live dot and the Cloud
Sync row). Settings came down from 509px to 435px on a laptop.

**Two things the reorganisation forced, both measured**

- **The rows are 44px on a phone.** They were 31px — below the touch target
  the folder pop-out (v04.17) and the Assign window (v04.18) were already held
  to. That costs height a phone does not have, so the group headings give
  28px of it back at `max-width:1199.98px`.
- **A long menu scrolls instead of running off the bottom.** `_sbDDFit()` caps
  each menu to the space that is actually under its button — measured after
  opening, because the header folds at narrow widths and the button moves —
  and the CSS carries a fallback cap for the frame before that runs. A menu
  that has to scroll says so, with an *inset* bottom fade (an inset shadow
  stays on the edge instead of scrolling away with the content). On a 390×844
  phone Tools holds 825px of rows in 774px and scrolls the last two; every
  other menu at every other size fits whole.

**Measured**

11/11 ship checks, and app checks from 144 to **162**.

The eighteen new ones ask what a screenshot cannot: the five items are in
Tools **by the function they call**, not by their label, and gone from
Settings; the full set of 26 actions from v04.20 is still reachable, with
nothing lost and nothing unexpected added; **every item closes the menu it is
actually in** — the one defect this round could have shipped is a moved item
still calling `closeSBMenu()` and leaving the Tools menu hanging open; every
group has items under it; a **real mouse click** on each button opens a menu
that is wholly on screen — left edge, right edge and bottom — at phone,
tablet, and a laptop with the sidebar dragged to both 160px and 540px; a menu
that scrolls carries the cue; every painted row is 44px on a phone; and all 30
labels and headings clear 4.5:1 on all five presets (worst 4.6:1, on Ocean).

**The fault this round's own work shipped into the build, and what found it**

**A screenshot, not an assertion.** The menus are anchored `right:0` to their
button, and that button sits near the LEFT edge of the sidebar. At the
sidebar width the harness happens to boot with (200px), the widened 238px
Tools menu hung **88px off the left of the screen** with its labels cut in
half. Nothing threw and nothing failed — `app-check` had never opened a menu,
so no check was measuring. `_sbDDFit()` now slides a menu back on screen by
whatever it is short, and the geometry check opens both menus with a real
click at two sidebar widths.

**What was NOT done, and why**

- **No label was reworded.** `🗂 Add Starter MyDatabase Folders` is the widest
  row in either menu and shortening it would have made both narrower — but the
  owner named these five items by their labels, and renaming what they had
  just named is how a menu stops being findable.
- **Trash is still the last row of Tools, and on a phone it is one scroll
  down.** Moving it up into `CREATE` would put "deleted" under "create";
  giving it a heading of its own would be a heading repeating its only row.
- **`📱 Install App` is a one-row group** whenever Chrome is not offering the
  install, which is most of the time — it is `display:none` then. It sits with
  `🔄 Refresh App` under `APP` because both are about the app you are running,
  not about anything in the notebook.
- **No data, sync, storage or export path was touched.** This round is markup,
  CSS and one new 14-line function that only ever reads a rectangle and sets
  `max-height`, `right` and a class. I1–I4 are untouched.

---

## v04.22 — one bar on a phone, and a menu under its own button (11 Sep 2026)

The owner sent two screenshots of a note being edited on the phone and
measured the problem in one line:

> Look at it, the notepane edit view: Takes half of the screens for bars and
> buttons.

It did. Five rows of chrome stood between the top of the screen and the first
line of writing — the tab bar, the nav+edit bar, the tag bar, the
type/Attach/Save bar and the title — and then the version strip, a row holding
one `⋯` button, and a line of two dates. The note itself began about 450px
down an 844px screen.

The instruction was exact, and this round followed it rather than improvising:

> We will accomodate everything on ONE Bar (nav bar) in MOBILE.
> Place Calendar, Tab, template, Attach buttons, under the '+'.
> Place the redo buttons stuff and the search button under the 3-line button.
> That should make space for save button to be on the nav bar.
> (PC and Tab will organise later)

### 1. The phone's edit view is one bar

```
v04.21 (390px)                        v04.22 (390px)
📅 Cal              ＋ Add Tab         🏠 ◀ ≡   Aa H ≡ +   💾 Save
🏠 ◀ ≡  Aa H ≡ + ↺ 📋 🔍              🏷 Tags  [add tags…]            ✕
🏷 Tags [add tags…]             ✕      ◀ ≡  Note title
General   📎 Attach (1) ▾  💾 Save 📦   🔀 Start Versioning  Created …  ⋯
◀ ≡  Note title                       ┄┄┄┄┄ the note starts here, 222px ┄┄┄┄┄
🔀 Start Versioning
⋯
Created 7 Sept 26 · 8:41 PM | Updated 8 Sept 26 · 9:42 PM
┄┄┄┄┄ the note starts here, ~450px ┄┄┄┄┄
```

- **`+` gains Templates, Calendar, ＋ Add Tab, and the whole "this note" row** —
  the type chips, 📎 Attach, 📦 Archive and ✓ Finish / ↺ Re-open, under two
  headings so it does not read as one heap of buttons.
- **`≡` gains ↩ Undo, ↪ Redo, 🕐 Note History and 🔍 Find.** The `↺` History
  group and the two loose buttons leave the bar; nothing else moves.
- **💾 Save sits on the bar**, in the primary-button pair that has always been
  right (`background:var(--green)` with `var(--on-accent)` ink — *not*
  `--accent`, which is a colour for text and scored 2.9:1 as a background the
  last time it was used as one, in v04.20).
- **One size for everything on it.** The bar's buttons measured 24×28 to
  34×38, the nav trio smallest of all — survivable as one row of eight, not as
  the only row. They are 38×40 now. 44px, the size the menus are held to, does
  not fit eight controls across a 390px phone, and the first attempt at 40×40
  proved it: the row wanted 392px and silently scrolled 9px of `.nav-l` out of
  reach. Found by a check, not a screenshot — a scrolling strip looks perfect
  in one.
- **The `◀ ≡` pair appears once.** It was on this bar *and* on the title row
  immediately below — the same two functions (`openP2` / `backFromP3`), one
  under the other. The title row gives them up on the phone, which also hands
  the title input the full width.
- **The tab bar goes away while editing — only when it is empty.** A bar
  holding real tabs is content, not chrome, and is never hidden; it comes back
  the moment editing ends.

**This is the phone only, at 640px — not the `<1200px` the nav+edit row itself
uses.** The owner wrote "(PC and Tab will organise later)", so a tablet keeps
the bar and the rows it had in v04.21, byte for byte. One function,
`_p3OneBar()`, decides for all three places that fold together, so they cannot
drift apart later.

The note now starts at **222px of 844** (26%) instead of about 450 (53%).

### 2. A menu opens under the button that opened it

> Then, any click on the button drops its content at the bottom of the screen,
> it should be below the button. FIX it.

Under 1200px `_openFloatPop()` pinned every popover to
`bottom:60px;left:4px;right:4px` — a bottom sheet. Tap `≡` at the top of a
phone and its list appeared at the **foot** of the screen, half a page from
the finger, with nothing joining the two.

Desktop was only better by accident: `top:Math.min(r.bottom+4, innerHeight-320)`
floats the popover *up*, away from its button, on any window shorter than
about 320px of remaining room — the same disconnect, one short window away.

One placement now serves both sizes: under the button, clamped inside the
viewport horizontally, flipped *above* it only when there is genuinely more
room up there, and capped to the space it actually has so a long menu scrolls
inside itself. It is **measured, not guessed** — the popover is opened
invisible, its real width and height read, and only then positioned. The
width is `min(260px,92vw)` in CSS and the height depends on what is inside;
neither could be assumed. This fixes every caller, not just the edit bar:
the Collapse/Expand/Preview overflow menu and the Pane-3 palettes all used the
same function.

### 3. One date, tapped to see the other

> Move the note creation date to the 'versioning bar'. Enable showing only one
> date (creation). Then, enable clicking on that date to show/flip to show the
> updated date.

`Created … | Updated …` was two dates, two labels and a divider on a full row
of the phone's height, for something that is glanced at rather than read. It
is one date now, on the versioning bar, showing **Created**, and a tap flips
it to **Updated** and back.

Both strings ride the button as `data-` attributes and the tap swaps them in
place — **no re-render**, so flipping it mid-sentence cannot rebuild `#ed` and
cannot cost the caret. `ST.dlShowUpd` remembers the choice for the next render,
and the swap runs over every `.dl-flip` on screen, because a float window
shows the same line and two of them disagreeing would read as a bug.

### 4. The `⋯` joins the versioning bar

> The 3 horizontal dot button should be on the same bar-space on the 'start
> versioning' (after the creation date) as long as there are space before 'new
> versioning' takes space.

The section-tools `⋯` had a whole row of its own in edit mode, carrying one
button. It sits on the versioning bar now, after the date, and the row wraps
rather than overflowing once a note carries several version pills — which is
the "as long as there is space" the owner asked for.

Edit mode reuses `_p3MetaRowHTML()`, the row the read view has had since
v04.08, so version strip, date and `⋯` are one line in both. A laptop keeps
that button on its unified toolbar and does **not** get it here:
`#ed-col-wrap` is an id, and two of it in the document would leave
`_edColInit()` forever finding only the first — a check now counts them at all
three sizes.

### What this round did not do

- **PC and tablet are untouched**, as asked. The tablet still opens on four
  rows of chrome; only the version/date/`⋯` consolidation reaches it.
- **The tag bar stays a row of its own.** It holds a text input, not buttons,
  and folding an input into a popover would make adding a tag a two-tap job.
- **The title row stays.** It is the note's name, and it is where `◀ ≡` live.

### Measured

162 → 189 app checks, and 11/11 ship checks. The new section 6p covers:

- the phone's edit view is one bar, with Save on it, no tab bar and no
  type/Attach/Save row, and the note starting in the **top third** of the
  screen;
- every control on that bar one size, with **nothing scrolled out of reach** —
  `.nav-l`/`.nav-r` scroll, so a button that no longer fits is unreachable
  while the row still looks perfect in a screenshot. This check earned its
  keep on its first run: at 40px the row wanted 392px of a 390px phone and
  quietly hid 9px of `.nav-l`. The honest number is **38×40**, up from 24×28
  to 34×38, and 44px — the bar the menus are held to — is simply not
  available for eight controls across a 390px screen. Nothing was shaved to
  pretend otherwise;
- the `◀` and `≡` nav pair appearing **once**. They were on the edit bar *and*
  on the title row — the same two functions, one row under the other. The
  title row gives them up on the phone;
- **nothing lost in the fold** — not a hand-written list but the same app one
  pixel the other side of the breakpoint: every function a 640px screen can
  reach from the whole edit surface (bar, both panes, tab bar and each group
  menu opened in turn), a 390px screen must still reach. The check maintains
  itself as controls come and go;
- 💾 Save on the bar really saves — typed text read back out of `DB` after a
  real mouse click, not "the handler did not throw";
- one date, on the versioning bar, saying "Created"; a real click flips it to
  "Updated" and a second click flips it back; and the flip neither rebuilds
  `#ed` nor changes `updatedAt`;
- exactly **one** `#ed-col-wrap` at each of the three sizes, on the versioning
  bar after the date under 1200px and on the unified toolbar above it;
- and the geometry, which is what this round broke and fixed: a **real mouse
  click** on each of the four (or five) group buttons, looked at again 250ms
  later — the menu still painted, opened **against its own button** rather
  than adrift, wholly inside the viewport at phone, tablet and desktop, and
  every row inside it hittable on a phone;
- every new word — the Save label, the menu headings, the date — scored at
  4.5:1 on all five presets.

---

## v04.23 — three questions about the phone's edit bar (11 Sep 2026)

v04.22 folded the phone's note editor onto one bar. The owner used it and came
back with three things — two of them faults in that round's own work:

> Where did you take the collapse/expand buttons (3 horizontal dot) (for note
> headings)?
> Why Tag bar is still showing?
> Isn't the 3-line button beside the nav button does the same function as the
> home button?

### 1. The `⋯` was there, and that is the problem

It had not moved — it sits on the versioning bar after the date, which is
precisely where the owner asked for it in v04.22. But it was a **bare `⋯`
glyph beside a grey date pill**, and it reads as punctuation, not as a button.
The owner asked where it had gone while looking straight at it. That is a
design fault, not a misunderstanding.

Two changes:

- **It wears the versioning bar's own pill now** — a border, a background, a
  34px tap target — so it plainly belongs to that row and is plainly something
  to press.
- **The same three actions are under `H` as well.** `H` is the button that
  says *headings*, and "collapse every heading" is a heading thing; nobody
  looks for it beside a date. Same `_edColAll()` / `_edColPreview()`
  functions, no second implementation — and `_edColSyncPrevBtn()` now syncs
  *every* Preview button rather than the single id it used to fetch, so the
  two copies can never disagree about what is on.

### 2. The tag bar is behind `🏷` now

It was the second of five rows and it survived v04.22 untouched — a permanent
row standing there whether or not the note was being tagged.

`🏷` on the bar opens and closes it, and **carries the tag count** (`🏷 1`), so
a closed bar still says the note is tagged — the information stays on screen
even when the row does not. It is a toggle rather than a popover on purpose: a
tag suggestion list is absolutely positioned, and inside a scrolling popover
it would be clipped.

The `✕` that lived on the tag bar went with it, so it moved to the **title
row**. That is safe: `saveArt()` ends with `ST.editing=false`, so 💾 Save
leaves edit mode too, and every keystroke is already auto-saved — `✕` is "stop
editing", not "discard".

### 3. Yes — `≡` and `🏠` land on the same screen

The owner was right. On a phone:

- `≡` → `backFromP3()` → `showPane('sb')`
- `🏠` → `goHome()` → clears the search, the tag, the type and the folder, then
  `showPane('sb')`

Different journeys, same destination. `≡` keeps your place; `🏠` wipes the
filters first. On a bar with room for eight controls, the second is not worth
a slot — **`🏠` leaves the phone's edit bar**, and `≡` takes you to the sidebar
where the 📚 Siyagah logo *is* `goHome()`. The conditional `🔍↺ back to search
results` stays, because it only appears when there is a search waiting and
losing it would genuinely lose something.

The freed slot is what `🏷` now occupies.

### The phone's edit view, three rounds on

```
v04.21                      v04.22                     v04.23
📅 Cal        ＋ Add Tab     🏠 ◀ ≡ Aa H ≡ + 💾 Save    ◀ ≡ Aa H ≡ + 🏷1 💾 Save
🏠 ◀ ≡ Aa H ≡ + ↺ 📋 🔍      🏷 Tags […]           ✕    Note title            ✕
🏷 Tags […]             ✕    Note title                 🔀 Start Versioning  Created…  ⋯
General 📎 Attach 💾 📦      🔀 Start Ver.  Created… ⋯   ┄┄ the note, 165px ┄┄
◀ ≡ Note title              ┄┄ the note, 220px ┄┄
🔀 Start Versioning
⋯
Created … | Updated …
┄┄ the note, ~450px ┄┄
```

Writing starts at **165px of 844** — 20% of the screen, from 53% two rounds
ago. PC and tablet are still untouched, as asked.

### Measured

189 → 194 app checks, and 11/11 ship checks. Section 6p gained:

- the tag bar is **not** a row at rest; `🏷` is on the bar, shows the count,
  and a **real click** opens the bar with its chips and its input, and a
  second click shuts it;
- `✕` stop-editing on the title row, ≥38px, calling `cancelEdit()`;
- the `⋯` **framed** and ≥34px, and a real click opening all three section
  tools — "it is in the DOM" was true of it before, and it still could not be
  found;
- the `H` group carrying the same three, identified by the functions they
  call;
- `🏠` proved still reachable rather than assumed: the exemption in the
  nothing-lost comparison is paid for by asserting `.sb-logo` is visible after
  `≡` and that its handler really is `goHome()`.

And the nothing-lost comparison itself was wrong before it was right: it
collected the phone's controls with the tag bar **closed**, and duly reported
`rmTag` and the tag input as lost in the fold. It opens the tag bar to collect
them now, the same way it already opened each group menu — a surface you have
not opened is a surface you have not measured, and the check fell for that
itself.

---

## v04.24 — a control that moves has to leave where it moved from (11 Sep 2026)

> Still Calender and '+Add Tab' is still there on a bar. should not be there

They were. v04.22 said 📅 Calendar and ＋ Add Tab "now live under the `+`
group", and put them there — but **never took them off the tab bar**. It then
hid that bar while editing on a phone, which concealed the duplication
completely: with no tabs the bar was gone, so nobody saw the two buttons
sitting on it.

The moment the owner had a tab open, the bar came back — carrying both buttons
again, duplicated, eating the width the tab names need on a 390px screen.

**Fix.** While editing on a phone the tab bar carries **tabs and nothing
else**. 📅 Calendar and ＋ Add Tab are reached from `+`, which is where v04.22
put them. Read mode has no `+` group, so it keeps both buttons exactly as
before, and they come straight back the moment editing ends.

```
phone, editing, with 3 tabs open

v04.23   📅 Cal  ‹  ◆ Seeded note one 📌✕  Seeded note two 📌✕  …  ＋ Add Tab
v04.24   ◆ Seeded note one 📌✕  Seeded note two 📌✕  Archived seeded note 📌✕
```

### Why the checks missed it

The v04.22 check asked "is the tab bar a row while editing on a phone?" and
the answer was no — **because it ran on the default seed, which has no tabs**.
Every measurement of that bar was taken in the one state where it does not
exist. The v04.17 lesson about a pop-out having states, and its parts not all
existing in the same one, applies word for word to a bar whose whole point is
that it appears when it has something to hold.

The new check seeds three tabs before it looks, and asserts three things: the
bar carries the tab chips while editing, carries neither 📅 Cal nor ＋ Add Tab,
and has both of them back in read mode and after ✕.

### Measured

194 → 196 app checks, and 11/11 ship checks. Tablet and desktop untouched.

---

## v04.25 — the tab bar is a bar (11 Sep 2026)

> Check your work, the bar is still there

Third time asked, and the first two answers were both wrong — not wrong in
the code, wrong in what they understood the owner to be asking.

| round | what it did | why it was not the answer |
|---|---|---|
| v04.22 | hid the tab bar while editing on a phone **when it was empty**, and put 📅 Calendar / ＋ Add Tab under `+` | the owner has tabs, so the bar was never empty and never hidden — and the two buttons were never removed from it, so they were now in two places |
| v04.24 | took 📅 Cal and ＋ Add Tab **off** the bar while editing | answered "those two buttons should not be there" literally. The bar itself stayed |
| v04.25 | the bar **does not render at all** while editing on a phone | a tab bar *is* a bar, and the brief was one bar |

The brief has said the same thing throughout and it was read too narrowly
each time: *"We will accommodate everything on ONE Bar (nav bar) in MOBILE"*,
then *"should not be there"*, then *"the bar is still there"*.

**What happens now.** While a note is being edited on a phone, `#tab-bar` is
not rendered — tabs or no tabs. It is back the instant editing ends (💾 Save
and ✕ both leave edit mode), and read mode is untouched, with 📅 Cal, ＋ Add
Tab and every chip exactly as before. Tablet and desktop are untouched.

**Nothing became unreachable.** Every open tab is a row under `+`, headed
`OPEN TABS (n)`, with the note you are in marked `◆` and highlighted. Tapping
one calls `tabSelect()` — the same function the chip on the bar called, not a
second implementation.

```
phone, editing, 3 tabs open

v04.23   📅 Cal ‹ ◆ Note one 📌✕  Note two 📌✕  …  ＋ Add Tab
v04.24   ◆ Note one 📌✕  Note two 📌✕  Note three 📌✕
v04.25   (no bar)          →  + ▸ OPEN TABS (3) ▸ ◆ Note one / Note two / Note three
```

Writing still starts at **165px of 844**.

### Measured

196 → 197 app checks, and 11/11 ship checks. The v04.24 check is updated in
place rather than replaced — it already seeded three tabs, and it now asserts
the bar is **gone** (0px, not rendered) instead of "carries tabs and not the
two buttons". A new check proves the tabs are still reachable the only way
that counts: it opens `+`, finds three rows all calling `tabSelect()`, clicks
one with a real click, and reads back that `ST.article` really moved to that
note and the bar really came back.

---

## v04.26 — one glyph, one job; and three menus organised (12 Sep 2026)

> now organise the buttons under +, three horizontal button and the tag icon
> the most elegantly you skilled,
> Then, how about there is two 3 line horizontal button, does it make sense?

### The second question first: no, it did not make sense

`≡` was doing two different jobs, three buttons apart, on the same 390px row:

```
◀  ≡  |  Aa  H  ≡  +  🏷  💾 Save
   ↑           ↑
   open        bulleted
   folders     lists
```

And a third `≡` was inside the `⋯` menu, on `≡ Preview`.

- The folders button is **📁** now, titled *Folders* — it says where it goes,
  which a hamburger never did. Changed in all five places Pane 3 renders it,
  so read mode and edit mode agree.
- `▤ Preview` replaces `≡ Preview`, matching `▤` everywhere else in the app.
- `≡` is left with exactly one job: lists.

The check that guards this **names neither button**. It sweeps every visible
glyph-only control in the edit chrome, maps each glyph to the function it
calls, and fails if one glyph has two jobs — so it catches the next collision
as well as this one.

### The menus, organised

The `+` menu was a bare row of five emoji, then a heading lumping three
unrelated things together, then two more groups. It is three groups now, and
the line between them is **what the action does**:

```
+
 INSERT AT THE CURSOR
   🖼 Image      🔗 Link
   🔖 Bookmark   @ Mention
   💬 Phrase     📋 Template
 ABOUT THIS NOTE
   [General]   📎 Attach (1)
   📦 Archive
 GO TO
   📅 Calendar   ＋ Add Tab
 OPEN TABS · 3
   ◆ Seeded note one
   Seeded note two
   Archived seeded note
```

Same line v04.21 drew between 🧰 Tools and ⚙ Settings: put something *in* the
note / say what the note *is* / *leave* the note.

**Every button carries a word.** That is the v04.23 lesson applied before it
was paid for again: a bare 🔖 or ❝ means nothing to someone who did not write
it. So `≡` gained `Lists and blocks` with `❝ Quote` and `─ Divider` spelled
out, `↩ Undo / ↪ Redo / 🕐 History / 🔍 Find` are words now, and 📦 Archive
borrows its own `title` as its label through CSS — which keeps saying the
right thing when it flips to *Unarchive*.

**Written once, rendered twice.** The insert actions and the list blocks are
each a small table now (`_EB_INSERT`, `_EB_LISTS`), and `_ebInsertHTML(labelled)`
/ `_ebListsHTML(labelled)` render the bare-glyph form for a laptop's bar and
the labelled form for the phone's menu. A second copy of the markup would have
drifted; this cannot. `_ebSectionToolsHTML()` does the same for Collapse /
Expand / Preview, which appear both under `H` and on the versioning bar's `⋯`.

**🏷 is unchanged and deliberately so.** It is a toggle rather than a menu
because the tag suggestion list is absolutely positioned and would be clipped
inside a scrolling popover. It already carries the tag count.

Two faults in this round's own work, both caught by measurement rather than by
reading the code:

- a labelled 📦 Archive pushed the type row past the menu edge and was clipped
  — `.nti-chips` and `.kind-act` are siblings on one flex line, so the row
  could not wrap. The action group takes the whole width now;
- `_ebSectionToolsHTML()` with no note id emitted `_edColAll(true,)`. A
  trailing comma in a call is **legal JavaScript**, which is precisely why it
  would never have been noticed.

### Measured

197 → 200 app checks, and 11/11 ship checks. Tablet and desktop untouched.

The group check also failed on its first run, counting three groups where
there are four — because `seedDB()` has no tabs and `OPEN TABS` only exists
when there are. That is the v04.24 lesson, one round old, caught here by
running the check rather than trusting it.

---

## v04.27 — Attach spread open, and the tag button retired (12 Sep 2026)

Five things, from two screenshots of the phone's menus.

### 1. `≡` — the undo block goes first

> Move undo block above, (image1) The other one below.

`↩ Undo · ↪ Redo · 🕐 History · 🔍 Find` is what you reach for **mid-sentence**;
a list block is a choice you make once. So the undo group is first and
`Lists and blocks` second.

### 2. `+` — 📎 Attach is spread open

> Spread-open the 'Attach' buttons.

`📎 Attach (1) ▾` was a button whose only job was to open four more buttons —
a tap spent just to find out what is under it. There is room, so it costs
nothing now:

```
ATTACH TO THE NOTE
  🏷 Note Type      General
  📁 Folder         1 attached
  📓 My Journal
  🗄 MyDatabase
  #  [seed ×]  + tag…
```

Each row shows the **value it currently holds** under its name, which the
button never could. They run the full width: two-up clipped *MyDatabase* to
*MyDatab…*, and a row whose whole point is to show a value cannot afford an
ellipsis in its name.

### 3. The group is called what it does

> Name the block title (rename 'About this note' to Attach to the note',)

Done — `ABOUT THIS NOTE` → `ATTACH TO THE NOTE`.

### 4. 📦 Archive moved to `≡`

> Archive button should move to 3line.

It sits at the bottom of the `≡` menu under a `THIS NOTE` heading, with
`✓ Finish` / `↺ Re-open` beside it when the note's type calls for them — they
are the same kind of thing, the note's **state**, not something attached to
it. It is gone from `+`, because a control that moves has to leave where it
moved from (v04.24, paid for once already).

### 5. No, we did not need a separate tag button

> Do we need a seperate tag button when the + button contains it?

Not once Attach is spread open. **🏷 left the bar and the tag row went with
it** — the tag editor itself lives in the `+` menu now: chips, input,
suggestions, all of it. The bar is down to seven controls:

```
◀  📁  |  Aa  H  ≡  +  |  💾 Save
```

The reason it was a separate toggle in v04.23 was that a tag suggestion list
is absolutely positioned and a menu clips its own overflow (`.fl-pop` is
`overflow:auto`), so the list would be cut off at the menu's edge. That is
fixed properly rather than worked around: `position:fixed` is **not** clipped
by an overflow ancestor, so `_tagSuggestPlace()` lifts the list out of the box
and places it against the input's real rectangle. Off a menu, nothing changes.

`🏷` stays with **Note Type** and tags take **`#`** — one glyph, one job
(v04.26), and a Note Type is explicitly not a tag in this app's own
vocabulary.

### Measured

200 → 202 app checks, and 11/11 ship checks. Tablet and desktop untouched —
they keep their own bar, their own tag row and `📎 Attach` as it was.

The new checks: the tag editor really inside `+` with a typed tag read back out
of `ST.etags` (not out of the DOM); the four Attach rows identified by the
FUNCTION each calls, with the opener proved gone and Archive proved absent;
and the `≡` menu's heading ORDER, so "undo first" cannot quietly drift back.
Two functions are exempted from the nothing-lost sweep — `openAttachMenu`,
which now has nothing left to open, and `_ntiChipTap`, replaced by the
🏷 Note Type row — each exemption paid for by asserting what replaced it.

---

## v04.28 — the card takes the whole width (12 Sep 2026)

> How about make the card widen edge to edge as marked up in image.
> Then, place the 'add tag' above all the buttons?

### Edge to edge

`.fl-pop` was `width:min(260px,92vw)` — a 260px column on a 390px phone,
anchored under a button near the right, so the card sat in the right-hand two
thirds with a useless strip of note beside it and every label squeezed into
half of that width. Nothing competes for the screen while a menu is open, so
it takes all of it: **6px gutter each side, 378px of 390**.

This is the phone only (<640px). A tablet and a laptop keep the narrow
anchored card, because there a 260px popover under its button is exactly
right and a full-width one would be absurd.

One thing that had to be right, and is the sort of thing that goes wrong
silently: the **width is set before the height is read**. `_flPopPlace()`
opens the card invisible and measures `scrollHeight` to decide where it fits;
measuring that at 260px and then widening reports a card taller than the one
that actually paints, and the placement is then made from a number that was
never true.

Edge to edge left the `✕` stranded in the bottom-right corner beside a lot of
nothing, so it is the card's closing bar now — full width, and it says
**Close**. A menu is read by someone who did not write it.

### The tag box goes to the top

Above everything, ahead of the first heading:

```
+
   #  [seed ×]  + tag…
  INSERT AT THE CURSOR      🖼 Image   🔗 Link …
  ATTACH TO THE NOTE        🏷 Note Type · General …
  GO TO                     📅 Calendar   ＋ Add Tab
  OPEN TABS · 2             ◆ Seeded note one …
  ✕ Close
```

It is the one thing in that menu you reach for while **still writing**; the
rest are decisions. It keeps no heading of its own — it is a labelled input,
and a heading over a single box is noise.

### Measured

202 → 206 app checks, and 11/11 ship checks.

The edge-to-edge check is asserted **both ways**: edge to edge on the phone,
and *still narrow and anchored* on the tablet and the laptop. A rule that only
ever said "wider is fine" would pass a phone card that never widened at all —
and would not notice the day a laptop's menu stretched across the screen.

---

## v04.29 — sized to the words, not stretched to a column (12 Sep 2026)

> How easy you can place them closely but organisely instead of spreading all
> over the screen. Do you understand what i mean in the mark up?

Yes. The marks were drawn at the point where each button's content **ends** —
everything to the right of them was empty. Every action was
`flex:1 1 calc(50% - 3px)`, so a five-letter label sat at the left of a 186px
box with 120px of nothing beside it, `MyDatabase` had a whole 366px row to
itself, and `✕ Close` took a row of its own. The card ran 726px down an 844px
screen to hold about fifteen short words. The arrow from `Close` pointed at
the gap beside `＋ Add Tab` and said: put it there.

**Every action is sized to its own words now, and they pack and wrap** — a
tight cluster under each heading, which is what the headings were for.

```
before                                    after
 [🖼 Image        ][🔗 Link         ]      [🖼 Image][🔗 Link][🔖 Bookmark]
 [🔖 Bookmark     ][@ Mention       ]      [@ Mention][💬 Phrase][📋 Template]
 [💬 Phrase       ][📋 Template     ]
 [🏷 Note Type                      ]      [🏷 Note Type · General][📁 Folder · 1 attached]
 [   General                        ]      [📓 My Journal][🗄 MyDatabase]
 [📁 Folder                         ]      [📅 Calendar][＋ Add Tab]
 [   1 attached                     ]      [◆ Note one][Note two][✕ Close]
 …
 [            ✕ Close               ]
```

Three changes underneath:

- **`flex:0 1 auto`, not `0 0 auto`.** A long note title in the tab list has to
  be allowed to shrink and ellipsis; `0 0 auto` would push the card wider than
  the screen the first time someone titled a note properly.
- **The value moved onto the same line as the name** — `Note Type · General`
  instead of a second line underneath, which doubled the height of every row
  that had one.
- **`✕ Close` packs in beside the last action** rather than claiming a row,
  exactly where the arrow pointed. It keeps its word and its 44px.

Nothing lost, nothing moved between menus, every touch target still 44px. The
`+` menu is **545px instead of 726**, and the `≡` menu **314px instead of
459** — both now fit a phone screen whole, with no scrolling.

### Measured

206 → 208 app checks, and 11/11 ship checks.

The new check does **not** measure a width budget, which would rot the first
time a label changed. It asks the question the layout is actually about:
**does the width follow the words?** The button with the longest label must be
wider than the one with the shortest, and the actions must show at least four
distinct widths — both false by definition of a stretched grid, whatever width
that grid happens to use. Plus the outcome the packing is for: the whole `+`
menu fits the screen without scrolling.

---

## v04.30 — the read view gets the same card (12 Sep 2026)

> Now, do same in view mode too.
> Move n Place Cal n add tab to the attach button (bar is not required) n
> spread-open them on the pallet with the attach buttons as well spread-open.

The edit view has had five rounds of this. The read view had not moved: on a
phone its `🏷` palette was a card holding **two** controls, one of which
(`📎 Attach`) only opened **four more** — two taps to reach `📓 My Journal` —
and the tab bar still sat above everything with `📅 Cal` and `＋ Add Tab` on it.

### One card, built by the same functions

```
🏷  (read mode, phone)
 ATTACH TO THE NOTE
   [🏷 Note Type · General] [📁 Folder · 1 attached]
   [📓 My Journal] [🗄 MyDatabase]
 GO TO
   [📅 Calendar] [＋ Add Tab]
 OPEN TABS · 3
   [◆ Seeded note one] [Seeded note two] [Archived seeded note]
 [✕ Close]
```

It is `_ebAttachHTML()` and the new `_ebGoToHTML()` — **the same builders the
`+` menu uses while editing**, so read mode and edit mode cannot drift apart.
Two things they had to learn:

- **which pop is holding them.** The rows closed `eb-pop` by name; they take
  the id now, so the same row works in `p3h-pal`.
- **read mode.** `openPicker()` edits `ST.efolders`, which only exists while
  editing — so the `📁 Folder` row keeps the existing Attach menu's behaviour
  and says *"Open this note for editing to change its folders"*.

**Both ways in land on the same card.** The toolbar folds the type group
behind `🏷` only when it does not fit, so `📎 Attach` is sometimes the button
actually tapped — `openAttachMenu()` opens the card too on a phone, rather
than the old four-item list.

### The tab bar is gone from the phone entirely

v04.25 stopped rendering it while editing. It does not render on a phone in
**either** mode now — "bar is not required" — and everything it carried is in
the card: `📅 Calendar`, `＋ Add Tab` and every open tab, marked `◆` for the one
you are in. A tablet and a laptop keep the bar exactly as it was.

### And the `⋯` actions palette packs

The read view's other card was five full-width rows for five short phrases.
Same treatment as v04.29: sized to the words, packed, framed. **160px instead
of 250.**

### Measured

208 → 213 app checks, and 11/11 ship checks.

Two existing checks described what this round deliberately changed and were
**updated in place with the reason**, not worked around:

- "the tab bar comes back the moment editing ends" became "it does not render
  in read mode either" — with what it carried asserted reachable from the card
  instead;
- the v04.09 palette check asked whether the type palette contained **chip
  markup**. On a phone it now contains a `🏷 Note Type · General` row calling
  `openNtiPicker` directly. The question is asked as *can the type be changed
  from this palette* — by the function — rather than as one particular way of
  being true. A tablet still gets the chip card, and that is asserted too.

---

## v04.31 — three questions about the read bar (12 Sep 2026)

Three questions off one screenshot of the phone's read view, with three things
circled on it:

> 1. Home button n 'Folder' icon does the same function. Do we need the folder
>    icon yet?
> 2. What 'general' is doing there? Rename it with 'Type'.
> 3. What's the functions of the buttons at the bottom of the card?
>    Organise all the button in a most elegant way you're skilled with.

### 1. 🏠 and 📁 — and why the question came back

They do land in the same place. `goHome()` clears the search, the tag, the
type and the folder and then calls `showPane('sb')`; `backFromP3()` calls
`showPane('sb')` and nothing else. Two buttons, one destination, one button
apart.

**This was already answered — for the other half of the app.** v04.23 took 🏠
off the phone's EDIT bar for exactly this reason, and left the read bar alone.
So the owner was looking at a row that still had both, and asked again. The
read bar matches now.

**📁 is the one that stays**, not 🏠 — the owner's question leaned the other
way, so this is the round's one design call and it is a one-line flip if it is
wrong. The reasoning: 📁 keeps your place, where 🏠 throws the folder away and
you land on the pane with nothing selected; and the pane you land on carries
📚 **Siyagah**, which *is* `goHome()`. Home did not simply go: it is a named
row, **🏠 Home · the folder list, with the search and filters cleared**, in the
`⋯` card. A tablet and a laptop keep the button — their rows have the width.

### 2. "General" was a value with nothing saying what it was

The dark pill on the bar showed the note's type and nothing else, so it read
as a stray word. It carries the word now — **`TYPE  General`** — written once
in `kindBarHTML()`, so the read bar, the `🏷` card and the tablet's edit row
all say it. The label is not a button; tapping the chip still opens the type
picker. *No type* became *not set*, because after the label it reads as
"Type · not set".

It is not free on a phone: the label costs about 34px on a row that measures
itself and folds. 🏠 leaving freed 44, so the row has **10px more headroom
than before this round** — any phone that showed the chip still shows it, now
labelled. On a 390px phone the chip was already folded away before this round
and still is; there the `🏷` card spells out `🏷 Note Type · General`.

### 3. The card's bottom row was a tap spent finding out what was under it

```
  ‹ Previous note      › Next note
  🔍 Find in this note  ✚ New note
  ⋯ More — copy, archive, delete…          ← the row that was circled
```

That last row opened a twenty-item context menu, and named three of the items
before trailing off. Same fault v04.27 fixed in the `+` menu and v04.30 in the
`🏷` one. The four actions that menu is actually opened for are rows now, the
card is split by **what the action does**, and the last row **names what is
still behind it**:

```
 GO TO
   [‹ Previous note] [› Next note] [🏠 Home · the folder list, …]
 THIS NOTE
   [🔍 Find in this note] [✏ Rename title] [⧉ Make a copy]
   [🕐 History · restore an earlier version] [📦 Archive] [⭐ Favourite]
 MORE
   [✚ New note · in the Primary folder]
   [⋯ All actions · tags, folders, reminders, pin, delete]  [✕ Close]
```

**🗑 Delete stays one tap further in**, deliberately: v04.11 took it off the
bar, and a Delete one tap from a phone toolbar would undo that. The rows pack
and wrap to their own words (v04.29) and the card is **559px of an 844px
phone with no scrolling** — measured, not guessed.

### Measured

213 → 219 app checks, and 11/11 ship checks. No existing check needed
updating: the v04.09 palette check asks whether the `⋯` row still reaches
copy/archive/delete and makes a real copy, which is still true of the row that
now says *All actions*.

The five new ones ask the durable questions rather than naming buttons:

- nothing visible on the phone's read bar calls `goHome()`, and it is still
  reachable — from the card and from the sidebar logo — with 📁 still on the
  bar and the tablet's 🏠 asserted still there, so "this round is the phone's"
  cannot quietly stop being true;
- **no note-type value is painted anywhere without the word that says what it
  is** — a sweep over every visible chip in all three places a tablet paints
  them, not a check on one bar;
- the `⋯` card's rows carry words, no row trails off into an unnamed menu, its
  headings are named and non-empty, the four spread-open actions are
  identified by the FUNCTION each calls, and Delete is proved still behind the
  full menu;
- every row is 44px, the card shows four or more distinct widths (a stretched
  column cannot pass that) and does not scroll;
- and `⧉ Make a copy` really makes the copy — `DB.articles` counted before and
  after a real click.

---

## v04.32 — the Attach row packs, and the full ⋯ menu stops hanging
*12 September 2026*

Two screenshots of the phone's READ view, one ask each.

### 1. "Removing 'attached' with the Folder button. (Showing attached number is enough)"

`📁 Folder · 1 attached` was the longest value on the Attach row and said
nothing the name did not — *Folder · 2* is two folders. The word is gone; the
count stays. One edit serves both modes: `_ebAttachHTML()` is the read card
AND the `+` menu, which is the v04.31 lesson applied before it had to be paid
for again.

**But the word alone would not have done what the owner asked**, and the
measurement is what said so. Dropping it saves **52px**, measured. With the
four rows flowing free, three fit the first line from **410px** of screen and
the fourth needs **537px** — so every common phone (412, 414, 428, 430) lands
in that gap and strands `🗄 MyDatabase` alone on a line of its own, which is
exactly the shape in the screenshot. Removing the word moves the boundary; it
does not close the gap.

So the four wrap as **two pairs** under 640px:

```
 ATTACH TO THE NOTE
   [🏷 Note Type · General] [📁 Folder · 1]
   [📓 My Journal] [🗄 MyDatabase]
```

Each button is still sized to its own words (v04.29) — only the line *break*
is decided rather than left to the screen. Above 640px `.eb-pair` is
`display:contents` and nothing changes at all: the card there is 260px wide
and a forced pair would ellipsis both of its buttons.

### 2. "Organise the hanging buttons more elegant way"

The full `⋯` menu was the last surface the owner can reach on a phone that
never got the v04.29 treatment: **21 rows of 155px hanging in a 167px column
537px long**, a five-letter word like *Finish* at the left of a box with 100px
of nothing beside it, and **six grey separator lines doing the work six
headings should do**. They had already grouped these rows; they just never
said what the groups *were*.

On a phone it is the same card as the `+`, `≡` and `⋯` palettes now — same
`.fl-pop-hd` heading strips, actions packed and wrapped to their words, edge
to edge (v04.28), placed by measurement (v04.22). **21 rows on 9 lines
instead of 21**, 14 distinct widths, 44px each, 629px of an 844px phone with
no scrolling. The five groups are `THIS NOTE`, `MARK IT`, `PUT IT IN`,
`REMIND & REVISE`, `REMOVE`. A tablet and a laptop keep the anchored column:
there `#ctx` is a genuine right-click menu at a cursor, already as wide as its
longest word.

The markup is **one table rendered two ways** (`_artCtxGroups()`), so the
phone's card and the desktop's column cannot drift into being different menus.

Two glyph collisions fell out of writing it down, both the v04.26 rule *inside
one menu*: `🏷` was NTI Types **and** Tags three rows apart — v04.27 already
settled that one, `🏷` is Note Type and tags take `#` — and `↺` was Reopen
**and** Remove from practice, now `✂`, the glyph this menu's own sub-panels
already use for "take this off". `✅` likewise stopped meaning both *in
favourites* and *mark as done*; practice done is `🌳`. And the favourites row
now reads `⭐ Favourite` / `✅ In favourites`, the same words the `⋯` card one
tap above it uses for the same toggle.

### A dead button found on the way

`⋯ All actions` — the row v04.31 added to the `⋯` card — **never worked**.
It handed `showArtCtx()` a synthesised event
(`{clientX:0,clientY:60,preventDefault:()=>{},stopPropagation:()=>{}}`), so
the `ev.stopPropagation()` that keeps the click off the document was a no-op,
the real click carried on to `document.addEventListener('click',()=>hideCtx())`
and the menu was shut in the tick it opened. This is the v04.12 defect
verbatim, on the same button, and it is in `CLAUDE.md` as a standing lesson.

Measured on `origin/main` before touching anything: after a real mouse click
that row leaves `#ctx` populated with 17 rows and `display:none`. It was dead
for the whole of v04.31 — on the phones narrow enough to fold the inline `⋯`
away, which is the only reason the owner could screenshot the menu at all
(their screen keeps the inline `⋯`, which passes the real event). It takes
the real `event` now, and the new check opens the menu **by a real mouse
click and looks at it 250ms later**, which is the only question that catches
this.

### Not done

- The tablet's and the laptop's right-click menu is untouched, on purpose —
  it opens at a cursor and is already as wide as its longest word. Asserted
  both ways, so "wider is fine" cannot quietly stretch it later.
- The long-press handlers in the sidebar still synthesise their events. They
  are a different path (there is no real click to pass on a press-and-hold)
  and nothing was reported about them; left alone rather than rewritten
  blind.
- At 537–639px of screen the Attach four would now fit one line and are still
  paired. Predictable beats clever there, and no phone is that wide.

### Measured

219 → 236 app checks, 11/11 ship checks. No existing check needed updating.

- **the Attach rows at six phone widths** (360 → 600), asked as the owner's
  own question — *is any row alone on its line?* — plus each still sized to
  its words and nothing overflowing the card; and the laptop proved NOT
  paired;
- the `📁 Folder` row shows a count and does not say "attached";
- `⋯ All actions` opens the full menu **on a real mouse click, still painted
  250ms later**;
- named non-empty groups, and **no visible separator line left over**;
- the rows really pack — lines at most half the row count — with four or more
  distinct widths and 30px+ between the widest and narrowest;
- edge to edge, wholly on screen, 44px rows, no scrolling;
- **no glyph does two different jobs in that menu**, mapped glyph → the
  functions its rows call, so the next collision fails too;
- a sub-panel is re-placed rather than left hanging off the bottom;
- `hideCtx()` hands `#ctx` back clean — it is shared with four other menus;
- and a tablet and a laptop keep the anchored column.

---

## v04.33 — the two pop-up buttons in edit mode, and a pop-up that opens ready to write
*12 September 2026*

One screenshot of the note's READ bar, and two asks off it.

### 1. "Let the Multi and single button be present in the edit mode as well."

Measured on `origin/main` before touching anything: **they already were.**
`_p3EditIconsHTML()` has rendered both on the edit bar since v04.10. So the
question "is it rendered" — the one the obvious check asks — says yes about a
control the owner has been looking straight through, which is the standing
lesson *"It is on the screen" is not "the owner can find it"*, paid for a
second time.

What differed was the **treatment**, and every rule that made the difference
was scoped `#p3h:not(.editing)`:

| | read bar | edit bar (before) |
|---|---|---|
| colour | `--gold` / `--green` | `rgb(90,84,74)` — the bar's grey |
| opacity | 1 | .55 |
| the word | "Multi" / "Single" | none, ever (`label` was `false`) |

Two gold-and-green named buttons in one mode; two anonymous grey ghosts among
fifteen other icons in the other. Every one of those rules applies to both
modes now, and only the SIZES still differ, because the edit bar's buttons are
`.et` and the read bar's are `.btn`.

The words were `false` on the edit bar since v04.10 with the reason "that
toolbar has its own crowding" — which was never measured. On the row they
cost 61px and 70px, and the unified toolbar carries them whole from **1600px**
of screen. Below that `_p3FitEditBar()` folds them off, and it folds by
measuring rather than by a breakpoint.

The edit bar could not borrow the read bar's fold: `.p3h-unified-tb` is
`flex-wrap:wrap`, so `scrollWidth > clientWidth` is *always false* on it and
would have reported "fits" about a toolbar that had quietly become three rows.
The question that does answer it is the one the words actually cost — **does
carrying them add a line?** — read as the row's own height with them and again
without. Between 900px and 1199px the same buttons sit in `.nav-r`, which is
nowrap with `overflow-x:auto`; there a scroll *is* the overflow, and a button
scrolled off the right of a strip is exactly as unfindable as an unlabelled
one. Both tiers are asked; either one folds the words.

Extending `_p3FitToolbar()` to the edit bar fixed a second thing nobody had
reported. It used to return early on `editing`, which left `p3h-nolbl` on
`#p3h` **from the last read-mode fold** — so the edit bar's layout was being
decided by a measurement taken of a different bar. Measured on `origin/main`:
the edit pop buttons came out 29px wide at 1920px and 38px at 1440px for no
reason of their own. Both modes clear the class and re-measure now.

### 2. "Let the pop-up note opens in edit mode when click to pop-up."

The two modes disagreed with each other, and had since v03.74:

- a **Multi Notes Pop-Up** has always been an editor — `.fw-ed` is
  `contenteditable` from the moment `_fwCreate()` builds it;
- a **Single Note Pop-Up** opened **read-only every time**, because
  `openNoteAsModal()` goes through `selArt()`, which sets `ST.editing=false`
  unconditionally. Popping a note up *while you were editing it* threw you out
  of edit mode.

One paradigm, as G4 already decided for the z-order: both open on the editor.
`startEdit()` runs **before** `openNoteModal()`, because `openNoteModal()` ends
on `renderP3H()` and the TOC/pin injections — the other way round rebuilt the
header underneath them. Safe for **I1**: `selArt()` saves the outgoing note on
its way past and `closeNoteModal()` calls `_flushEd()` before the pane changes
shape, both asserted by reading typed words back out of `DB` after a close.

And the Multi window now opens with the **caret already in it**. Re-opening an
existing one always focused `.fw-ed` (see `popOutNote`); a brand-new one left
the focus on `<body>`, so the window opened on an editor you still had to
click into.

### 3. The defect this round would otherwise have made worse

`popOutNote()`'s F3 comment states the rule — *"hand-over, never duplicate"* —
and enforced it only for the **panel**. Pane 3's own editor was never asked to
let go. Measured on `origin/main` at v04.32, before this round began: from edit
mode, `popOutNote('a1')` left `#ed` **and** `.fw-ed` both live on the same
note, both `contenteditable`, both on the debounced autosave — the exact
defect F3 describes, *"whichever tick fired last silently overwrote the other,
losing typed text"*.

It was already reachable. This round adds two more ways in (a Single Note
Pop-Up now opens on the editor, and `_panelToFloat()` converts one when the
screen narrows), so it is fixed here rather than left to be found by losing a
paragraph. `_flushEd()` runs **first** — it returns early on `!ST.editing`, so
clearing the flag before committing would have thrown the text away.
`openNoteAsModal()` gained the mirror of it: `closeAllFloats()` before
`startEdit()`, so `#ed` cannot be built from content a float has not written
back yet.

### Not done

- **Under 900px there are still no pop-up buttons, in either mode.** That is
  not an oversight: `.modal-pop-btn` is `display:none` below 900px and
  `openNotePopup()` refuses there, because a "window" on a 390px phone is the
  whole screen. Both halves are now asserted together, so neither mode can
  drift into offering a button the app will not honour.
- **On a laptop at 1440px the words fold on the edit bar** — Pane 3 is 710px
  there and they would add a second row of chrome above the writing, which is
  what v04.22 fought. The read bar folds them at exactly the same width and
  always has; the gold and green now tell them apart in both. From 1600px of
  screen, both bars carry both words.
- The `⋯` action palette is still read-mode only. It exists because
  `_p3FitToolbar()` folds the read bar's actions away; the edit bar folds only
  the two words, so nothing is behind a palette there to reach.

### Measured

236 → 255 app checks, 11/11 ship checks. No existing check needed updating.

- **the edit bar at ten widths** (2200 → 900): both buttons present, and
  wearing their word exactly where it costs no line — a single width cannot
  tell a measured fold from one that never folds, or one that always does;
- **edit mode paints them as read mode does** — the two modes' computed
  colours compared against *each other*, not against a hex, so the day the
  palette changes the comparison still holds;
- a **real mouse click** on the edit bar's Single button leaves `ST.editing`
  true with `#ed` bound to that note, and the pane still shaped as a panel
  with its backdrop and all its grips;
- words typed into that pop-up are **in the note after it closes** (I1);
- the Multi pop-up opens editable with the caret in it;
- **one editor per note** on both routes into the hand-over, with the typed
  words proved to arrive in `DB` *and* in the pop-up;
- and at 820px and 390px neither mode offers a button and `openNotePopup()`
  refuses.

---

## v04.34 — the pop-ups reach the phone and the tablet, each in the shape that fits
*12 September 2026*

> "Now do same for the phone and tablet too.
> ***Always do all platforms as adaptible. Don't wait for doing next.***"

The second sentence is the bigger half. It is **D5** in `CLAUDE.md` now, and a
standing lesson, because v04.33 had just reported the phone and tablet gap to
the owner as deliberate and it came straight back — which is the
"when the owner repeats themselves, the reading is wrong" pattern.

### What was actually in the way

Not one gate but **eleven**: `window.innerWidth<900` in eight functions
(`openNotePopup`, `openNoteAsModal`, `openNoteModal`, `popOutNote`,
`_rememberNotePop`, `_fwSyncCloseAllChip`, `_openNewNoteWindow`, the
Ctrl+Shift+P handler), plus `_canModal` in the context menu, the `⋯` palette's
own `>=900`, and three
`@media(max-width:899.98px){…display:none}` rules.

The reason had been true **once** — a 320px-minimum window with a 22px drag
bar is a worse note pane than the one a 390px phone already has. It was never
revisited, and it swept up the TABLET, where touch drag and resize had been
deliberately built in v03.NotePane.T4, whose own comment says *"the panel is
allowed from 900px up, which includes iPad landscape and most Android
tablets"*. Nobody ever decided a tablet should not have this.

### One function decides the shape, and it never says no

```
_popTier()  →  'window'  (>=640px)   free-floating, draggable, resizable
               'sheet'   (<640px)    a card pinned edge to edge, no drag, no resize
```

- **Tablet** gets the real window, unchanged: measured at 820×1180 the Multi
  window is 640×1038 with all five drag/resize handles, and the Single panel
  787×820 with its backdrop. Both are asserted *the other way round* as well —
  if the sheet rules ever widen past 640px a tablet silently loses drag,
  resize, and the ability to see the app beside the note.
- **Phone** gets the sheet: 6px gutters, `378×832` of a 390×844 screen,
  nothing that pretends to drag, and the editor gets **376px of the 378**.

### The three things the gate had been hiding

None of these were defects while the pop-ups were `display:none` under 900px.
All three appeared the moment they were not:

1. **Contents and the Pinned Tabs sidepane took 184px of a 378px sheet** — the
   note wrote in a 180px column beside a panel. `_pinPanelInject`'s own header
   comment said *"Desktop/tablet only (the pop-out is gated to >=900
   already)"*: a rule that depended on the gate this round removed. Both are
   skipped on the sheet tier, and the phone's `☰ Contents` drawer is offered
   instead, so nothing is lost.
2. **The edit bar's ◀ and 📁 call `showPane()`** — on a layout sitting under a
   fixed, z-5001 panel. The tap changed something the owner could not see and
   the note did not move. Gone inside the panel, at every width.
3. **The window header was built for a mouse.** On a tablet ✕ Close measured
   **26×20** and each ‹ › **11×15**. They are 40px from 1199px down and 44px
   on a phone.

### Several at once, on a phone, means a way back

Sheets stack edge to edge, so only the top one is visible and *"Multi Notes
Pop-Up — several notes open at once"* would have been a claim the phone could
not honour. `#fw-closeall` becomes a **switcher bar** below 640px: one chip per
open note, the front one marked, `✕ All` at the end, 40px rows, and
`body.fw-sheets` lifts the sheets to `bottom:56px` so it covers nothing. A real
tap on a buried note's chip brings it forward, which is what the check
measures. A laptop and a tablet keep the plain `✕ Close all (n)` chip, and
whichever element the tier does not use is **removed**, not hidden — v04.24.

### Reaching them on a phone

The two buttons stay **off** the phone's read and edit bars. v04.22 spent three
rounds getting that bar to one row and putting them back would undo it; and
*"a bar may be terse; a menu may not"*. So they are named rows:

- **read** — the `⋯` card, which already carried them behind a `>=900` gate;
- **edit** — a new **POP IT OUT** group in the `+` menu, from `_ebPopHTML()`,
  one builder for both surfaces so they cannot drift (v04.30's rule).

Both carry the full name, the drawn icon, and the gold/green tint, at 44px.
Measured: the `+` menu is five groups now and still fits a 390×844 phone
whole, `6→384`, no scrolling.

A tablet's bars **do** have the width — measured at 640, 700, 768, 820, 899 and
1000: the edit bar carries both words at 64px and 73px with no overflow at any
of them, and the read bar folds them into the `⋯` card below 768 exactly as its
own measurement says it should.

### And what a sheet must never do

**Write down its frame.** `378×832` is the screen's size, not a choice anyone
made, and `_fwSavePos()` would have stored it as that note's remembered window
and handed it to the laptop the next time the same note was popped out.
Sheets remember nothing — asserted by opening both kinds on a phone, closing
them, and reading the geometry store back empty.

The v03.NotePane.F1 eviction is also gone: the panel used to CLOSE itself with
a toast when the viewport fell under 900px, because `#p3.modal-mode` had no
phone styling and the backdrop covered the screen with no way out. The sheet
is that styling. The panel re-shapes instead, and what the owner was reading
stays on screen.

### Not done

- **The float window's inner toolbar is still the dense laptop one** on a
  phone, beyond minimum 38px targets. It works and it is reachable; laying it
  out for a phone the way v04.22–v04.32 did for Pane 3 is a round of its own,
  not a line in this one.
- **A phone's Multi and Single differ less than a laptop's** — both are the
  same card. What still differs is real: Single is Pane 3 itself with
  everything behind it dimmed, one at a time; Multi is independent editors,
  several open, switchable. `_panelToFloat()` is skipped on a phone for that
  reason — converting one into the other there is churn the owner would see as
  the note blinking.
- The Pinned Tabs sidepane has **no phone form**. It is skipped rather than
  redesigned; it is a keep-it-beside-the-note panel and a phone has no beside.

### Measured

255 → 266 app checks, 11/11 ship checks. **Five existing checks were updated in
place with the reason recorded, two of them REVERSED** — they asserted
"neither mode offers a pop-up button, and the app refuses to open one", which
was a true description of the app and a wrong description of what the owner
wanted.

- both pop-ups **reachable and really opening on the editor**, at phone and
  tablet, in read mode and in edit mode — four combinations, each identified
  by the FUNCTION the control calls and told which surface reached it;
- the phone sheet **edge to edge, wholly on screen, zero drag/resize
  affordances, a 44px way out carrying a word**, for both kinds;
- a **real tap** on the Single sheet's ✕ Close handing the whole app back —
  no `modal-mode`, no backdrop, no header left behind, the pane back to 390px;
- two open giving a switcher whose chips are words at 40px, on screen, with
  the sheets clearing it — and a **real tap bringing the buried note forward**;
- a tablet proved to keep the real window, its handles, and a header a finger
  can hit;
- the sheet **all note**: no Contents panel, no sidepane, no pane-nav button
  that cannot work, editor ≥85% of the sheet;
- **no remembered frame written from a sheet**;
- and the `+` menu's fifth group, with its fit assertion changed from a
  `< 72% of the screen` ratio — which failed at 74% while the menu still fitted
  whole with 215px to spare — to the question its own label asks: is the whole
  menu on screen, and does it scroll.

---

## v04.35 — the Architect loop (20 Sep 2026)

**Asked:** "Set up an automation using GitHub so that I don't have to relay
(copy-paste) things between you both" — the Architect (Claude in the owner's
claude.ai project) and the builder (Claude Code).

**No change to the app.** The number moves only because every round bumps (I5),
and `ship-check` compares the whole repo, docs and workflows included.

### What changed

- **`.github/workflows/claude.yml`** — a GitHub Action. An issue or comment
  mentioning `@claude` starts Claude Code on a GitHub runner. The runner
  installs Playwright and Chromium first, because `tools/app-check.mjs` needs
  a real browser and a runner, unlike the Claude Code sandbox, has none.
  One round runs at a time (`concurrency`), so two builders never edit
  `index.html` at once. Only accounts with write access can trigger it, and
  bots cannot, so it cannot loop on its own comments.
- **`CLAUDE.md`** — the builder now **stops at the pull request**. The owner
  chose (20 Sep 2026) that the Architect reviews the diff, re-runs both checks
  and merges, because `main` is the live site. New section *The Architect
  loop* describes the four steps.

### Not done, and why

- The workflow needs the **`CLAUDE_CODE_OAUTH_TOKEN`** repository secret and
  the **Claude GitHub App** installed on the repo; both are owner-only steps
  on GitHub and cannot be done from a commit.
- `app-check` was not re-run: no app code changed. `ship-check` passes.

---

## v04.36 — close the trigger gate (20 Sep 2026)

**No change to the app.** The number moves only because every round bumps
(I5).

### What was confirmed

v04.35 listed the **`CLAUDE_CODE_OAUTH_TOKEN`** secret and the **Claude
GitHub App** installation as "Not done" — owner-only steps it could not do
from a commit. Both were confirmed in place on 20 Sep 2026: test issue #43
was opened and answered, by the v04.35 build. This supersedes that "Not
done" entry; nothing further is owed there.

### What was wrong

v04.35's header comment claimed bots could not trigger the builder. Nothing
enforced that: the job's `if:` checked only whether the triggering text
contained `@claude`, with no check of who — or what — had posted it. The
claim was false the same round it was written — the builder's own reply
started run `35560474931`, a bot triggering itself.

### The fix

`.github/workflows/claude.yml`'s `if:` now requires all three, for every
event type it listens to (`issues`, `issue_comment`,
`pull_request_review_comment`, `pull_request_review`):

1. **`github.event.sender.type != 'Bot'`** — blocks any GitHub App or bot
   account from starting a run, including the builder replying to its own
   issue or PR;
2. **`github.event.sender.login == 'AAAsapp'`** — the run must be started by
   the owner's own account;
3. **the trigger text** — `@claude` in the issue body/title, the comment
   body, or the review body, matching the event that fired (unchanged from
   v04.35).

**`author_association` was considered for guard 2 and dropped.** Testing it
for `OWNER`/`MEMBER`/`COLLABORATOR` is the obvious-looking gate and the wrong
one: GitHub reports members of a **private** org as `CONTRIBUTOR` or `NONE`,
so that test would have locked the owner out of their own builder. Matching
the sender's login directly cannot misreport.

The header comment above the `on:` block now states in plain language where
each of the three guards lives, instead of describing a gate that was never
actually coded.

### Applied by the owner, not the builder

The Action's builder could not push this file. The Claude GitHub App's
installation has no `workflows` scope, so GitHub rejects any push from its
token that touches `.github/workflows/**` — the builder reverted the file to
get the rest of the round pushed (`6405aea`) and put the intended change in
the PR body. It was applied from the owner's Claude Code web session, which
pushes with different credentials. Recorded in `CLAUDE.md` under *The
Architect loop*.

### Standing lesson

Recorded in `CLAUDE.md`: **a trigger guard is only a guard if it is in the
`if:`.** A claim in a comment, a brief, or a changelog constrains nothing by
itself.

### Measured

11/11 ship checks. No app code touched, so `app-check` was not re-run.

---

## v04.37 — the Architect's brief, written down (21 Sep 2026)

**No app change.** Version 04.36 → 04.37 in all three required places (I5).

### The gap

v04.35 built a loop with three roles in it, and wrote a file for two of them.
`CLAUDE.md` is the **builder's** standing brief — it says what the app is,
what may never break, and how a round is verified. The **owner's** part needs
no file; they give jobs and decide design questions. The **Architect** — the
Claude Code session with this repo attached, which turns a job into rounds,
opens the issues, watches the runs, reviews the PRs by measurement and merges
them — had no file at all. Its instructions lived in a chat message, which is
to say they lived nowhere: a new session started blind, and the only record of
how the loop is supposed to run was four bullet points inside the builder's
brief describing it from the builder's side.

### What was added

`ARCHITECT.md` at the repository root. It deliberately does **not** restate
`CLAUDE.md` — it opens by binding itself to it and then says only what differs
by role:

- **Who does what** — a three-row table. The owner gives jobs, decides design
  questions, checks the finished app, and is not involved between "here is a
  job" and "the job is done" except for a real decision. The Architect turns a
  job into rounds, runs the builder, reviews, merges, reports. The builder
  builds one round per issue, opens the PR and stops.
- **The loop, for every job** — six steps: plan (split into rounds that each
  satisfy D5), assign (one issue per round, one at a time, body starting
  `@claude`, posted as `AAAsapp` because the v04.36 gate requires it),
  monitor the Actions run, **review by measurement** (fetch the branch, read
  the whole diff, run both checks and `tools/shot.mjs` yourself — not read the
  builder's report), reassign or merge, and report to the owner **when the job
  is done, not after each round**.
- **When to stop and ask** — only a real decision: ambiguity, a genuine "which
  approach", something that changes what the app is, anything destructive
  (I1, D3), or a conflict with a rule in `CLAUDE.md`. Asked as one short
  question with a recommendation, while everything not depending on the answer
  keeps moving.
- **Keeping the builder busy** — an **Architect's backlog** of defects, check
  gaps and standing-lesson sweeps to work through between jobs, with one hard
  limit: never start a NEW feature from it, because features come from the
  owner. Anything a review finds that is out of scope for the round in hand
  gets added to it. Three stop conditions are named (backlog empty, usage
  limit reached, or three rounds failing review for the same reason — which
  means the spec or the approach is wrong, and says so).
- **Limits you must know** — the three that actually bite, each paid for: the
  Action's builder cannot push `.github/workflows/**` (v04.36), the trigger
  gate starts a run only for `AAAsapp` and never for a bot so any other
  identity is silently skipped as a `skipped` run with no error (v04.36), and
  one round at a time or two builders edit `index.html` against a stale base.

`CLAUDE.md` gained one line in its opening block — **"The Architect's brief is
`ARCHITECT.md`"** — so a session that reads the builder's brief first still
finds the other one. The pointer is in the top block, not in *The Architect
loop* section, because the point is to be seen before work starts.

### Why a docs-only round still bumps the version

I5 has no exception for "nothing in the app changed". `sw.js`'s `VERSION`
string is the cache name, and bumping it is the only thing that evicts the
previous build from a device — so a round that ships a file at all ships
through the same pipe. It costs one cache miss and removes a whole class of
"which build is this" question. The same reasoning applied in v04.35 and
v04.36, both of which also touched no app code.

### Done by the Architect, not the builder

This round was written directly, without opening an issue. It is documentation
of the Architect's own role, produced in the session that performs it; routing
it through a builder would have meant one agent writing another agent's
description of a third. The rule it does not break: `main` is still not pushed
to directly — the round went to a branch, through a pull request, and was
merged with a merge commit like any other.

### Not done

The **Architect's backlog** item carried in `ARCHITECT.md` — `ship-check`
reading green for a round that forgot to bump but touched nothing else — is
left open here on purpose. It is the next round's subject, and it is being run
through the builder as the first end-to-end proof of the loop.

### Measured

11/11 ship checks. No app code touched, so `app-check` was not re-run.

## v04.38 — ship-check's "nothing to bump" is blind to a new file (21 Sep 2026)

**No app change** beyond the version string itself. Version 04.37 → 04.38 in
all three required places (I5). A harness round: `tools/ship-check.mjs` only.

### The gap

`tools/ship-check.mjs`'s version-bump check asked "did anything change" with
`git diff --name-only origin/main` alone. `git diff` never lists untracked
files, so a round whose entire deliverable is a *new* file — `ARCHITECT.md`
in v04.37, any new `tools/*.mjs`, a new icon — read "nothing changed yet —
nothing to bump" and passed with the version unbumped. Measured on a clean
checkout of `main` at v04.37: adding one untracked file and running the check
still showed 11/11, exit 0. That is the one check standing between a round
and I5; a real round in that shape would have shipped no new `sw.js` cache
name, and every device would have kept serving the previous build.

This item was carried in `ARCHITECT.md`'s backlog since v04.35, and its two
halves are not the same defect: a genuinely clean tree reading green is
correct and was never in question; the blindness to untracked files is the
part that is a defect and is what this round fixes.

### What changed

`tools/ship-check.mjs`'s version-bump check now unions `git diff --name-only
origin/main` (tracked, staged and modified files) with `git ls-files
--others --exclude-standard` (untracked files not covered by `.gitignore`).
The second command already respects `.gitignore` on its own, the same way
`git diff` does, so `tools/shots/` and `node_modules/` stay invisible —
verified directly rather than assumed (see *Measured* below). The clean-tree
pass message changed from "nothing changed yet — nothing to bump" to "tree
is genuinely clean against origin/main — nothing to bump", so it says
plainly that the tree really is clean rather than reading like a shrug.

`tools/README.md` gained one paragraph in its traps section: `git diff` does
not list untracked files, so a check that asks "did anything change" with
`git diff` alone is blind to exactly the rounds that add a file — that is
where harness traps live, not `CLAUDE.md`'s standing lessons.

`ARCHITECT.md`'s backlog line is ticked, with the resolution recorded inline:
the clean-tree pass is correct and stays; the untracked blindness was a
defect and is fixed.

### Measured

Five scenarios, run by hand against the fixed check:

1. **new untracked file, no bump** → FAILS (`still v04.37 with changes in:
   ..., NEWFILE-TEST.md`), exit 1 — the defect this round fixes.
2. **new untracked file, with a bump** → passes (`v04.37 → v04.38`) even
   though the tree still carries untracked files.
3. **modified tracked file, no bump** → still fails (`still v04.37 with
   changes in: tools/ship-check.mjs`) — the case that already worked, not
   regressed.
4. **an ignored file only** (`tools/shots/phone.png`, gitignored) → does not
   appear in the changed-files list; only the round's real tracked edit did.
5. **genuinely clean tree** (verified by stashing this round's own diff) →
   passes with the corrected message, `tree is genuinely clean against
   origin/main — nothing to bump`.

11/11 ship checks (this round's own change is what makes the version-bump
check fail without the bump, and pass with it — proof and fix are the same
diff). 266/266 app checks — `index.html`'s two version strings changed, so it
was re-run in full, not skipped.

### D5

Not applicable. This round touches no markup, no CSS and no JavaScript the
app runs — only `tools/ship-check.mjs`, `tools/README.md` and
`ARCHITECT.md`. The three layouts are unaffected.

## v04.39 — an import can destroy the notebook with no consent and no way back (21 Sep 2026)

An app round (issue #49). I1 and D3.

### The three defects, measured on `main` at v04.38

1. **`importJSON()` replaced the whole notebook with zero confirmation.**
   `DB=d;persist();render();toast('Data imported ✓')` — no `confirm()`, no
   modal, no Trash. Reachable from a real button one row above `Close` in
   `⚙ Backup & Restore`. A mis-tap or the wrong file picked and every note,
   folder and section was gone from `localStorage`, with the next sync
   pushing the replacement everywhere else.
2. **`importBackup()`'s native `confirm()` wired Cancel to the destructive
   option.** `OK = Merge`, `Cancel = Replace All`. There genuinely was a
   second confirmation before the replace ran, so — as the issue asked to
   verify rather than assume — Escape-twice was **not** the one-key wipe a
   prior audit (#41) had claimed against this code, but not for the reason
   first written here. `confirm()` is synchronous and blocks the JavaScript
   event loop for as long as it is open, so the app's own `keydown` listener
   cannot run at all while it is up — the browser handles Escape itself and
   the call returns `false`, the same value Cancel returns. That `false` is
   what selected *Replace All* on the first dialog, and what hit the bare
   `return` on the second — Escape-twice landed on "do nothing" only because
   the second dialog's safe branch happened to be the one `false` selects.
   Escape then **Enter** (or a real click on the second dialog's OK) still
   wiped the notebook. What was real, and stands on its own regardless of
   that second gate: `confirm()`'s one dismiss value — Cancel, Escape, or the
   browser's own close gesture — was wired to *Replace All* on the first
   dialog, which is backwards for a control nobody reaches for on purpose.
3. **Neither replace path kept a recovery copy.** `_replaceWithBackup()`
   overwrote `DB.sections/folders/articles/trash` outright and `importJSON()`
   did `DB=d` — once `persist()` ran, nothing on the device could get back
   what was replaced.

### What changed

**One shared consent dialog**, `_showImportConsent(data, fileName)`, used by
both `importJSON()` and `importBackup()` (`index.html`, near `_mergeBackup`/
`_replaceWithBackup`) — they differ only in how they get a parsed object with
`.sections/.folders/.articles`, and that object is now handed to the same
dialog either way. It is built with `showModal()`, the pattern the rest of
the app already uses, not `confirm()`:

- names what will happen, and shows the count of notes/folders/sections
  **in the file** against what is **in the notebook now**;
- three explicit buttons — `Cancel` · `Merge` · `Replace everything` — no
  option reached by *not* choosing;
- **Cancel is the default and the only thing Escape or the backdrop can
  reach**, in both this dialog and the "permanently" one behind
  *Replace everything* — neither button is ever wired to `Escape` or `#ov`'s
  click handler, both of which already call plain `closeModal()` and nothing
  else. That is the fix for defect 2: not a new gate, but never connecting
  the destructive path to the universal escape route in the first place.
- `Replace everything` opens a second dialog where "permanently" appears
  exactly once, and that dialog's own text is decided by whether the recovery
  copy (below) actually succeeded.

**A verified recovery copy**, taken from the *still-untouched* `DB` the
moment `Replace everything` is clicked in dialog 1 — before the owner even
sees dialog 2, so dialog 2 can tell the truth about it:

- `_saveRecoveryCopy(db)` writes one JSON snapshot to its own
  `siyagah-recovery-v1-<timestamp>` key (never `my-notebook-v1`, the live
  key), then **reads it back in a separate step** and compares every
  section/folder/article id against what was actually there. Only a matching
  read-back is reported as success; a thrown `setItem` (quota) or a mismatched
  read-back both return `{ok:false, reason}` and the write is rolled back.
  One copy only, by design (not a history) — the previous copy's key is
  deleted once the new one is verified good.
- Dialog 2 reads that result: success says *"a copy of your current notebook
  has been saved on this device"*; failure says *"⚠ No copy could be kept
  (…)"* and still requires the same explicit second click — replacing with
  no safety net is something the owner can still choose, having been told so
  first, not something the app silently forbids or silently allows.
- `⚙ Backup & Restore` gained a conditional row, **↩ Restore last recovery
  copy** (only shown when `_readRecoveryCopy()` finds one), with its own
  "permanently replaces" confirmation — same dialog shape, same Cancel-is-safe
  rule.

**Not done, and why:** restoring the recovery copy does not itself take a
fresh recovery copy of whatever it is about to overwrite — the issue asked
for "one copy — the most recent — not a history", and chaining a copy onto
the restore path would start turning that one copy into a two-deep stack.
If the owner wants a way back from a restore too, that is a follow-up, not
this round. The other ~26 `confirm()` calls in the file are untouched, as
asked — this round is the two import paths only.

### D5

All three layouts get the **same shape**, deliberately: `.ma.imp-acts` stacks
the three buttons full-width (`flex-direction:column`) and gives every one of
them `min-height:44px`, in the stylesheet, not behind a breakpoint. A
destructive-data choice gets the same generous touch target on a 1440px
laptop as on a 390px phone rather than only where a phone forces it — so
there is nothing to say about phone vs. tablet vs. desktop here beyond "all
three get exactly the same dialog". Measured directly at 390×844, 820×1180
and 1440×900: three buttons, none under 44px tall, the dialog never
overflowing the viewport at any of the three (`tools/app-check.mjs` §13e).

### Measured

`tools/app-check.mjs` gained a new section (§13), driven by real clicks and
real keyboard/mouse events against the actual dialog, asserting on
`localStorage` rather than a JS variable throughout:

- `importJSON()` opened through a **real file** picked via Playwright's
  `filechooser` event: the notebook is unchanged the instant the dialog
  opens, still unchanged after the first "Replace everything" click, and
  only actually replaced after the **second** real click — with the ids in
  `localStorage['my-notebook-v1']` proving each step;
- a **real** `Escape` key and a **real** click on the backdrop, from *both*
  dialogs, each leave the notebook byte-identical;
- `Merge` adds the file's ids without removing any pre-existing one;
- the recovery copy's ids are read back **in a separate `page.evaluate()`**
  and compared against what the notebook held before the replace; restoring
  it through its own `⚙ Backup & Restore` row and confirmation returns every
  original id;
- the quota path — `Storage.prototype.setItem` stubbed to throw for
  `siyagah-recovery-v1-*` keys only, so the live notebook still persists
  normally — proves the dialog says "No copy could be kept", still demands
  its own second confirmation, and that no recovery key is ever recorded for
  a copy that did not actually succeed;
- the three-viewport button measurement described under D5.

11/11 ship checks. App checks: 266 → 284 (18 new: §13a seven, §13b three,
§13c one, §13d four, §13e three — `index.html`'s version bump means the
whole suite reran, not just the new section). All 284 passed on the first
run against the finished code.

### Standing lesson

**A dialog whose Cancel performs the destructive branch, and a "your data is
safe" message that was never read back, are the same defect wearing two
faces — a promise nobody checked.** `confirm()`'s two buttons are OK and
Cancel; nothing forces the *safe* meaning onto Cancel, so `Cancel = Replace
All` compiles, looks like a normal restore prompt, and is backwards for the
one key (Escape) and the one gesture (backdrop / "go away") a user reaches
for on reflex. And `DB.sections=…;DB.folders=…;persist()` immediately
followed by a toast claiming a copy was kept is the same shape of lie the
whole "safety copy" feature exists to fix: a `localStorage.setItem()` that
did not throw is not evidence of anything by itself — it is evidence the
call returned, and a size-limited store can accept a write and evict it, or
never had room for it in the first place on some browsers. Treat both the
same way: never let *what a button is labelled* decide what Escape or a
backdrop does — wire the safe path there explicitly, or wire nothing at all
and let it fall through to a no-op close; and never print a success message
for a write that was not read back and compared, because the sentence
"a copy was kept" is the one people act on later, when it is too late to
find out it was never true.

---

## v04.40 — mergeDB silently drops every top-level key it was not told about (21 Sep 2026)

An app round, in `mergeDB()`. Found by the owner's audit of PR #41 against
`main` — that PR's own finding (a lost `_salvage` key) doesn't exist on this
code, but the mechanism underneath is real and was measured in a booted
browser at v04.38.

### The defect

`mergeDB(local, remote)` opens with `const out=Object.assign({},local)`, then
resolves a named list of keys against `remote` — articles, folders, sections,
trash, tombstones, tags, tab groups, and a handful more. Everything on that
list gets a real merge. **Everything not on it keeps `local`'s value
unconditionally**, because `Object.assign` already put it there and nothing
ever looks at `remote`'s copy again.

Of a live `DB`'s 20 top-level keys, 19 were on the list. `theme` was not.
Confirmed by calling the real `mergeDB()` with a note and a settings change
both made on one device: the note merged correctly (I1 was never at risk),
but the other device's theme change was discarded in **both** call
directions — whichever side was passed as `local` kept its own settings,
always, regardless of which one had actually changed more recently. That is
an I2 gap, not an I1 one: a preference set on the phone never reaches the
laptop, or the reverse, and it stays wrong forever because nothing about it
looks like an error — no throw, no dropped note, just a setting that quietly
never travels.

`CLAUDE.md` also said the wrong thing about it: "`DB.theme` is a free-form
bag — new settings ride the existing localStorage / file-export / Firestore
plumbing with nothing new to add." True for the first two. False for
Firestore, for as long as `mergeDB` has had an allow-list — every setting
ever added to `theme` inherited this silently.

### The fix

**`mergeDB()`** now resolves `theme` the same way it already resolved
`tagColors` — a per-key merge against a companion stamp map, `DB.themeAt`,
via the existing `_mergeValMap()` / `_mergeStampMap()` helpers (no second
mechanism invented). Per-KEY of `theme`, not the whole object as one blob:
two devices changing two different settings — a preset on one, a font size
on the other — now both survive a merge, which a whole-object swap could
never do. An unstamped key (every notebook that predates this round; nothing
in `theme` has ever carried a timestamp) ties at 0 against anything, and
`_mergeValMap` keeps `local`'s value on a tie — so the very first merge after
upgrading cannot blank a device's existing settings just because neither
side has stamps yet. Nothing about `theme`'s existing shape changes, so
there is nothing to back up the way `DB._tabsV1` backs up the old tab shape
(I8) — `themeAt` is new, additive metadata sitting beside it, not a
replacement for anything.

**Where do the stamps come from?** `DB.theme` is written from roughly sixty
scattered call sites — a colour picker, a font-size slider, a dozen small
per-feature toggles — never through one setter a stamp could be bolted onto.
Routing all sixty through a new setter was the literal reading of "find
where it's assigned and make that the one place", but with that many sites
the real risk moves to the *next* one: a future call site that writes
`DB.theme.foo=val` directly and never learns it was supposed to call a
setter would silently reintroduce this exact bug for one key at a time,
and nothing would fail to say so. Instead, a new `_stampThemeTouches()`
diffs `DB.theme` against a snapshot taken the last time it ran, every time
`_save()` or `_doPush()` runs — the one place **every** write already
funnels through today (the sole `localStorage.setItem(SK,…)` in the app) and
the one place a brand new setting tomorrow will *also* have to funnel
through to be saved at all. Only keys whose value actually changed get
`DB.themeAt[key]=Date.now()`; nothing else does, so an untouched setting is
never falsely re-stamped into looking like a fresh edit that could beat a
genuinely newer one from another device.

Two edges of that got caught in build, both the same class of mistake
v03.92.02 already paid for once (there, flushing an idle editor *after* a
merge re-committed stale text over what the merge had just decided):

- The very first `_save()` after a fresh page load would otherwise diff
  against *nothing*, which reads as "every key just changed" and stamps the
  whole notebook's settings with the boot timestamp — an untouched setting
  would then wrongly outrank a real edit made on another device minutes
  earlier. The first call now only seeds the snapshot and stamps nothing;
  there is no prior state in this session to compare against.
- After `DB=mergeDB(DB, remoteDB)` (both `syncNow()` and the background
  reconcile path), the merge has *already* produced the correct per-key
  stamps. Without an explicit reseed, the next `_save()` would diff the
  merged theme against the **pre-merge** snapshot, see the keys mergeDB just
  resolved from the remote side as "changed", and re-stamp them with a fresh
  local `Date.now()` — silently overwriting an honest remote timestamp with
  a fabricated local one. Both merge call sites now call `_seedThemeSnap()`
  immediately after reassigning `DB`, before their own `_save()` can run.
- `_doPush()` builds its own `json = JSON.stringify(DB)` and reuses that
  exact string for both the local save and the cloud write, to avoid
  serialising twice. Stamping only inside `_save()` would have stamped `DB`
  *after* that string was already built — the value pushed to the cloud
  would be right, its timestamp would not, and a later merge would treat a
  just-made edit as older than it is. `_stampThemeTouches()` is called in
  `_doPush()` before `json` is built; the call inside `_save()` is then a
  harmless no-op for the same change.

**Any top-level key present on `remote` and absent from `out` entirely** —
data written by a build newer than whatever this device is running — is now
copied over at the end of `mergeDB()`, `if(!(k in out)) out[k]=remote[k]`.
Every key already named above, and every key already present on `local`,
is untouched by this line; it only rescues a key **neither** side's existing
rules ever look at. The standing lesson below is what this line is for.

**`CLAUDE.md`** now says Firestore sync is the exception to "nothing new to
add" — a new setting needs no special plumbing of its own, it only needs to
actually reach `_save()`/`persist()` like every other write already does.

### Not done

- Theme changes made through the theme modal (`applyPreset`, `setCustomColor`,
  `resetTheme`) still have **no explicit `persist()` call of their own** —
  that was already true before this round, is unrelated to the I2 gap this
  issue is about, and is unchanged by it. They reach `_save()`/the cloud
  push at the same points every other unsaved change already does (tab
  hidden, page hide, or any other action that calls `persist()`), just as
  before. What was broken — and is now fixed — is what happens once that
  save actually runs.
- `theme.custom` (the colour-picker's own sub-object: sidebar/accent/bg/
  search-result colour) is merged as **one** key, on one stamp, matching
  "per key inside theme" as the issue scoped it. Two devices changing two
  *different* custom colours in the same sync window will not both survive —
  one whole `custom` blob wins. Every other theme setting (preset, fonts,
  line spacing, ToC width, the calendar/journal prefs, quick-capture folder,
  templates, quick phrases, and the rest) is its own independent key and
  does not have this limitation. Deeper per-swatch merging inside `custom`
  would be a reasonable follow-up if two devices routinely recolour
  different swatches between syncs, but nothing in this issue asked for it
  and it was not built speculatively.

### D5

Data-only round — `mergeDB()` runs identically regardless of screen size,
and nothing about this fix has a visual surface. Nothing platform-specific
to build. `app-check` still ran in full, at all three viewports, because
this round's code executes on every one of them.

### Measured

Five new checks beside the existing `mergeDB()` ones, calling the real
function with realistic shapes (a plain object for `theme`, not a string —
the probe that reported `sfItems`/`tabs`/`tagColors`/`uiAt` as "dropped" in
the original audit was feeding them the wrong shape, not finding a second
bug):

- a settings change on the remote side reaches the merged result — **fails
  on unpatched `mergeDB()`, passes after**;
- the same call structure with local holding the newer edit — passes both
  before and after, confirming the fix does not just flip which side always
  wins;
- two different settings changed on two different devices both survive one
  merge (preset from one side, `fonts.global` from the other) — **fails on
  unpatched code**, which can only ever keep one side's `theme` in full;
- a `theme`/`themeAt` pair with no stamps at all (an upgrading notebook)
  keeps its own settings through a merge against an equally-unstamped
  remote — passed even before this round, by the same "local always wins"
  bug that broke the sync case; kept as a real regression guard, not
  claimed as newly fixed;
- an unknown top-level key present only on `remote` reaches the merged
  result — **fails on unpatched code** (nothing copied it at all).

Confirmed by literally reverting the `index.html`/`sw.js`/`CLAUDE.md` changes
(`git stash`) and re-running: 3 of the 5 new checks failed on today's `main`,
exactly the three called out above; all 5 pass on the finished code. The
existing "mergeDB never drops a side" and "newest edit wins" checks (§8–9)
were re-run unchanged and still pass — this round did not touch, and does
not weaken, the notes/folders/sections merge path.

11/11 ship checks. App checks: 284 → 289 (5 new — `index.html`'s version
string changed, so the whole suite reran, not just the new section). All 289
passed on the finished code.

### Standing lesson

**An allow-list merge is a list that is correct until the next key, and
nothing fails when it is wrong.** `mergeDB()` had named 19 of `DB`'s 20
top-level keys across a dozen rounds of "oh, and this one too" — sfItems in
v03.81, tagColors and folderGroups the same round, the five `uiAt` scalars
in v03.82, tab groups in v03.77 — each one added because somebody noticed
the specific key was missing, never because something CAUGHT a key being
missing. `theme` sat unmerged through every one of those rounds, silently,
because an allow-list only ever grows by someone remembering to extend it,
and a forgotten key doesn't throw, doesn't fail a test that isn't looking
for it, and doesn't even look wrong in a screenshot — it looks like the
device's own settings, because that is exactly what it is. The fix is not
"remember better next time" — it is the one line at the end of `mergeDB()`
that copies over anything `remote` has that `out` doesn't: a general answer
to "what did we forget to name", not a specific one to "we forgot `theme`".
The next key this happens to will not need a round of its own to be found.

---

## v04.41 — Handover, and how the owner is told (21 Sep 2026)

**No app change.** Version 04.40 → 04.41 in all three required places (I5).
Both gaps this round closes were costing the owner directly, and neither was
in the app.

### The chat was the Architect's memory

`ARCHITECT.md` (v04.37) described the loop, the review, the backlog and the
limits — and said nothing about where the *state of a job* lives. In practice
it lived in the chat session: which round was in flight, what a review had
caught, what the owner had decided, what had been learned but not yet written
into `CLAUDE.md`. A session that ended or was summarised took all of it. The
owner would then have to re-explain their own job to the next session, which
is exactly the position the brief exists to prevent.

The record now lives in a **pinned status issue**, `📋 Siyagah — what's
happening now`, written in plain words for a non-coder and updated after
**every step** — not at the end of a job. Its description carries **Job**,
**Now** (and whether the Builder or the Architect is acting), **Done so far**
(one line per finished piece, in terms of what changed for the owner in the
app), **Next**, and **Waiting on you** — "Nothing", or the owner's decision
put as a question. Alongside those: the in-flight issue and PR numbers, any
open decisions, and anything learned that has not yet reached `CLAUDE.md`.
The test it has to pass is stated in the brief: **enough on its own for a
fresh session to continue without reading a word of chat.**

Around it, two habits:

- At the end of every finished job the Architect checks its own state, and if
  the session has run long, has been summarised, or it has caught itself
  forgetting something, it ends the report by asking for a fresh session and
  giving the exact text to paste.
- A new session's **first** act is to read `ARCHITECT.md`, `CLAUDE.md` and the
  status issue, and post `Architect session changed, continuing from: …` on
  that issue before doing anything else.

Two traps are recorded with it, both real:

- **The status issue must never contain `@claude`** — the v04.36 gate fires on
  that string, and a status page that started the builder every time it was
  written would be worse than no status page.
- **Opening any issue briefly occupies the builder's queue**, even one not
  addressed to it. Creating this round's status page queued a run that then
  skipped, and in doing so displaced another queued run. *Editing* an issue
  does not fire the workflow at all — it triggers on `opened` and `assigned`
  only — so keeping the page current is free. Only creating one costs a slot.

### Reports to the owner carried words the owner cannot read

`CLAUDE.md` has said since the beginning that the owner is a non-coder and
that reports should be in plain language. Reports were nonetheless going out
with file names, PR numbers, `confirm()`, pixel counts and storage terms in
them — true, precise, and unreadable by the person they were addressed to.
Precision in the wrong vocabulary is not precision; it is a report that does
not arrive.

A report now carries **no technical words at all** and follows one shape:

- **What's fixed or new** — what the owner will actually notice.
- **What's next.**
- **Anything you need from them.**
- **What to check** — at most two things, saying exactly where to tap.

All of the detail keeps going into `CHANGELOG.md` and the status issue, which
is where it belongs and where it stays available.

### Also corrected

*The loop, for every job* step 6 carried its own four-bullet report format,
written in v04.37. Leaving it there would have meant `ARCHITECT.md`
contradicting itself on the same page from the day this round landed, so step
6 now points at the new *Reporting to the owner* section instead of competing
with it. This is the small version of the fault the round is about: a rule
written in two places drifts, and the one nobody re-reads is the one that
rots.

### Not done

- The status issue **could not be pinned by the Architect**. Pinning is a
  GraphQL mutation that none of the available tools expose, and the one
  credential-shaped route to it was correctly refused. The owner pins it in
  one click; until they do, the page works exactly the same, it simply does
  not sit at the top of the issue list. Recorded here rather than quietly
  dropped, because the brief calls it *the pinned status issue*.
- No app code was touched, so `app-check` was not re-run. `ship-check` covers
  everything this round can break.

### Measured

11/11 ship checks.

---

## v04.42 — a theme setting inside a sub-object still does not sync between devices (21 Sep 2026)

An app round, in `mergeDB()` and `_stampThemeTouches()`. v04.40 fixed
`DB.theme` being dropped wholesale and resolved it per top-level key against
`DB.themeAt`, but recorded one thing as not done: `theme.custom` merges as a
single key, so two devices recolouring two different swatches keep only one.
This round is that gap — and, on inspection, it was wider than `custom`.

### The defect

`DB.theme` holds scalars (`preset`, `lineSpacing`, `tocWidth`, …) alongside
several values that are themselves object maps, written one sub-key at a
time from a scattered call site each: `fonts` (`global`/`sidebar`/`list`/
`content`, `_fsBump()`), `custom` (per-swatch colours, the colour picker),
and by inspection also `dbColors`, `headingStyles`, `calLayers`, `templates`,
`calState`, `accordionSec`, `mwCatDefaultOpen`, `fwPos`, `modalPos` and
`pinPanelPos`. v04.40's `_stampThemeTouches()` stamped the whole top-level
key the instant *any* sub-key changed, and `mergeDB()`'s `_mergeValMap()`
resolved that whole key against the single stamp. So: enlarge the sidebar
font on the phone, enlarge the note font on the laptop, sync — the entire
`fonts` object from whichever device stamped last wins, and the other
device's change is gone. No throw, no lost note (I1 holds), a setting that
silently never travels — the exact shape of failure v04.40 was about, one
level down.

### The fix

Resolved at the **leaf**, generally, not by naming `custom` and `fonts` —
the v04.40 standing lesson is explicit that an allow-list is "correct until
the next key."

- **Stamping.** `_stampThemeTouches()` (`index.html`, `_isPlainObj()` /
  `_stampThemeTouches()`) now checks, per changed top-level key, whether the
  value is a plain object on **both** the current and the previous snapshot.
  If so it stamps only the sub-keys that actually changed, under a dotted
  path — `DB.themeAt['fonts.sidebar']=now` — and writes nothing for the
  parent key at all. A scalar, an array, or a key whose shape differs
  between the two snapshots still stamps the whole key exactly as v04.40
  did. Arrays are deliberately excluded from leaf treatment: `pinTabIds` is
  an ordered list, not a keyed map, and merging it per index would scramble
  order, not merge content — it stays a single stamped, single merged value.
- **Merging.** A new `_mergeThemeVals()` replaces the direct `_mergeValMap()`
  call for `DB.theme`. Where a key is a plain object on both `local` and
  `remote`, `_mergeThemeObjKey()` resolves it sub-key by sub-key: a sub-key
  on only one side is kept, both sides' sub-key wins by comparing
  `_themeLeafStamp()` (below), a tie keeps local. Everything else — scalars,
  arrays, and a key that is an object on one side only — falls back to
  today's whole-key comparison unchanged, so it cannot throw on a mismatched
  shape; it just never takes the leaf path.
- **Backwards compatibility (I8).** `_themeLeafStamp(stampMap, topKey,
  subKey)` reads the dotted stamp (`'fonts.sidebar'`) if one has ever been
  written, and falls back to the parent's top-level stamp (`'fonts'`)
  otherwise. Every notebook that predates this round has only the top-level
  stamp `_stampThemeTouches()` wrote under v04.40 — the sub-key resolution
  for it reads exactly that value, so an upgrading device merges precisely
  as it did before this round, never blanked by a remote that also has no
  dotted stamp yet. Nothing existing is deleted or rewritten; dotted stamps
  are purely additive alongside the top-level ones.
- `_mergeStampMap(local.themeAt, remote.themeAt)` needed no change at all —
  it already merges an arbitrary flat map of `key → timestamp` by taking the
  newer per key, and a dotted key like `'fonts.sidebar'` is just another
  string key to it.
- The v04.40 closing rule — any top-level key present on `remote` and wholly
  absent from `local` survives the merge — is untouched and still runs last.

### Not done

- Nesting deeper than one level inside a `theme` sub-object (there is none
  today) was not built for — `_mergeThemeObjKey()` resolves exactly one
  level of sub-keys. If a future setting nests a map inside a map, it would
  need this pattern applied again at that level, the same way this round
  applied it below the top level.
- No change to how `theme.custom` or `theme.fonts` are *written* — the ~60
  call sites still assign directly to `DB.theme.foo.bar=val` with no shared
  setter, exactly as `CLAUDE.md` already describes; this round only changed
  how the existing writes get stamped and merged.

### D5

Data-only round, like v04.40 — `mergeDB()` and `_stampThemeTouches()` run
identically regardless of screen size, and nothing about this fix has a
visual surface. `tools/shot.mjs` was still run at all three sizes to confirm
nothing moved; `app-check` ran in full because this round's code executes on
every viewport.

### Measured

Six new checks, calling the real `mergeDB()`/`_stampThemeTouches()` with
realistic shapes:

- two different sub-keys of `theme.fonts` changed on two simulated devices
  → both survive one merge;
- two different swatches of `theme.custom` changed on two devices → both
  survive;
- the same sub-key changed on both sides → the newer stamp wins,
  deterministically (checked both directions);
- an unstamped (pre-v04.40-shape) remote does not blank a stamped local,
  and a stamped remote is not blanked by an unstamped local;
- `theme.pinTabIds` (an array) changed on both sides still merges as one
  whole value, never per index;
- a plain-object key on one side and a scalar on the other does not throw
  and falls back to the whole-key comparison.

Verified against unpatched code with a single revert of `index.html`/`sw.js`
to their pre-round content, one `app-check` run, then restore (git-stash
would have needed the fix to still be uncommitted; it was already committed
by this point, so the same one-run discipline was applied by checking out
`origin/main`'s copy of the two files, running once, and checking them back
out from this branch's `HEAD`): **patched 295/295 (289 → 295, 6 new);
unpatched 291/295, with 4 of the 6 new checks failing** — the two sub-key
survival checks (`fonts`, `custom`), the same-sub-key-newer-wins check, and
the unstamped-side check. **The other two new checks pass on both patched
and unpatched code, and that is correct, not a weak test:** the array
(`pinTabIds`) and mismatched-shape (object vs scalar) cases were never
routed through the whole-object-swap bug in the first place — v04.40's
per-top-level-key `_mergeValMap()` already handled a key that isn't an
object on both sides exactly the way this round's fallback branch does, so
neither case could have failed before. Kept as real regression guards
against this round ever changing that fallback path, not claimed as newly
fixed.

### Follow-up — the stamping half had no check of its own

Caught in review: all six checks above hand-wrote their stamps straight into
`mergeDB()` (`{ 'fonts.sidebar': 1000 }`), so they proved the *merge* half
reads a dotted stamp correctly and nothing about whether
`_stampThemeTouches()` ever produces one. Reverting only the stamping change
back to `DB.themeAt[k]=now` — this round's own defect, restored — left all
six checks green, because no dotted stamp was ever written and every
sub-key fell through to the parent stamp. Four more checks now call
`_stampThemeTouches()` directly rather than a literal standing in for it: a
sub-key change writes a dotted stamp and writes nothing for the parent key;
a scalar change (`preset`) and an array change (`pinTabIds`) still stamp
whole, producing no dotted key; and an end-to-end check builds two devices
whose stamps are produced by `_stampThemeTouches()` itself, merges them, and
confirms both sub-key changes survive.

Patched: **299/299 (295 → 299, 4 new)**. Unpatched-code verification of the
four stamping checks recorded by the Architect on the PR.

11/11 ship checks.

---

## v04.43 — three lessons about running the builder, written down (21 Sep 2026)

No app change. `ARCHITECT.md` only, plus the version bump the rule requires
(I5 — `sw.js`'s cache name is the only thing that evicts a stale build, so a
docs-only round bumps too).

v04.42 cost three builder runs to ship a change that was correct on the
first attempt. None of the three failures were about what was being built.
All three were about how the round was run, and none of the three lessons
was written anywhere.

### The builder can report `success` and leave nothing behind

Three runs ended with `conclusion: success`, twelve to fifteen minutes spent,
`num_turns` nowhere near the 250 limit — and no commit, no branch, no PR.
The builder ended its own turn part-way down its checklist each time. The
Architect had been treating the green tick as evidence a round happened; it
is not. `ARCHITECT.md` step 3 now says to look at the branch, the commits and
the PR, and never at the conclusion.

### Push before measuring, and say so in the issue

The first run's work was lost because nothing in the spec told it to commit
before the slow part. The second attempt was given an explicit order of work
— implement → bump and changelog → **push** → checks → **push** → verify →
**push** → PR — and lost nothing. That order, and the sentence *"if you run
short of time or turns, push what you have and say where you stopped"*, now
belong in **every** issue the Architect writes, under a new section,
*Writing an issue the builder can finish*.

### When it stops at the same step twice, take the step off it

All three stops were at the same place: the unpatched-code verification, a
second full `app-check` run. Restating the instruction louder spent another
run. The third attempt was given four numbered steps with "push" as step 3
and *"do not run the verification — I will run it myself"*, and it finished.
This is not a lowered standard when the step is a **measurement**: the
Architect re-runs it in review anyway, and did — 293/299 with the six
expected failures, recorded on the PR before merging. Also recorded: the
builder's real tool list, since two of its calls were refused for using a
bare `Bash(cat …)` and each refusal costs a turn.

### And the one that started it

`Keeping the builder busy` now says that **a "not done" recorded in a round
is backlog work nobody has written down**. Every round says what it did not
do; saying it in a `CHANGELOG.md` entry files it nowhere. v04.40 recorded
`theme.custom` as not done, the Architect's backlog read *empty* through the
whole of v04.41, and when the entry was finally read the gap was far wider
than the one key named — every object-valued theme key. A backlog that says
"empty" while a known defect sits in a changelog entry is worse than no
backlog, because it ends the work. Three items are now filed there properly,
including one marked explicitly as a watch item and not work.

### Not done

- The harness still has no way to run one section of `app-check`, so proving
  a round's own new checks means paying for all 299 twice. Filed on the
  backlog with "measure first" attached, not built — the saving might not be
  worth the complexity, and that is a measurement nobody has taken.

### D5

Does not apply — no markup, CSS or app JavaScript touched. `index.html`
changed only in its two version strings.

### Measured

11/11 ship checks, 299/299 app checks. `index.html` changed — only its two
version strings, but v04.38's rule is that a changed `index.html` gets the
full run, so it got one rather than an argument for skipping it.

---

## v04.44 — the "can no longer save locally" dialog nagged on every launch (21 Sep 2026)

An app round (issue #58). I3, D5.

### Reproduced, not a false alarm

The owner has no storage problem in the everyday sense — their device has
plenty of free disk. `localStorage` has a fixed per-site budget of roughly
5 MB that has nothing to do with free disk, and the notebook had outgrown it.
Driving the real app: grew `DB` in memory to 453 notes / 6,370,323 bytes (the
owner's own Smart View counts — 425 New, 411 MyWall, 123 Timeline, 68
Journal), called `_save()`, and got exactly the owner's report — `_save()`
returned `false`, `localStorage.setItem` threw `QuotaExceededError`, and the
`⚠ This device can no longer save locally` dialog appeared via `_save()`'s
`setTimeout(...,400)`. Every launch = one dialog, because `_lsFail` is a
module-level `let` that resets on every page load, and the first failed save
of a session always tripped it. The serious part the old dialog never said:
if every write is failing, these devices hold **no local copy of the
notebook at all** — an I3 risk, not just an annoyance.

### What was wrong, beyond "it nags"

- **The advice was often false.** The dialog always said "empty the Trash",
  regardless of whether the Trash held anything. If the notebook itself was
  over budget and the Trash was nearly empty, the owner would follow the
  advice and see nothing change.
- **Nobody could tell what was actually using the space.** v04.39's recovery
  copy (`siyagah-recovery-v1-*`) writes one full duplicate of
  `sections`/`folders`/`articles`/`trash` on every "Replace everything" and
  never expires it — if the owner had ever used that button, a second whole
  notebook could be sitting in `localStorage` permanently, doubling the
  usage, and nothing said so.
- **`⚙ Backup & Restore` (`openModal('settings')`) had no way to reach it.**
  Grepped every `onclick` in the file: the modal is real, titled exactly
  that, and even referenced by name in `_confirmReplaceImport()`'s own copy
  ("restore it from ⚙ Backup & Restore if anything goes wrong") — but no
  button, menu item or keyboard shortcut anywhere in the app ever called
  `openModal('settings')`. `app-check` reached it only by calling
  `window.openModal('settings')` directly from Playwright, which is exactly
  the gap the "it is on the screen is not the owner can find it" standing
  lesson describes, just with "on the screen" replaced by "in the code": a
  feature nobody could ever tap. Everything this round adds to that modal
  would have been just as unreachable without fixing this too.

### What changed

**The automatic modal is gone.** `_save()`'s catch block no longer calls
`showModal()` on a deferred timer. In its place, a quiet indicator that
`updateSaveUI()` — the one function every save state already funnels
through — keeps lit for as long as `_lsFail` is true and clears the instant
a save succeeds again:

- a small ⚠ badge (`#save-warn-dot`) on the 🧰 Tools button itself, visible
  without opening any menu, positioned so it adds no width to the header row
  (the v04.14 `min-width:0` lesson);
- `#save-lbl` (inside the 🧰 dropdown, next to Undo/Redo and Save File)
  swaps to "⚠ Storage full — tap for details" / "⚠ Storage error — tap for
  details" and becomes tappable itself (`_saveLblTap()`);
- the one toast per session is unchanged;
- tapping either one opens `openStorageWarnDetails()` — the full
  explanation, now built from real numbers, and now the *only* way this
  information appears. Nothing shows it unprompted.

**Real numbers, not guesses**, in a new storage section shared by
`openStorageWarnDetails()` and `⚙ Backup & Restore`
(`_storageSectionHTML()`, so the two places can never show different
figures): notebook size measured from `JSON.stringify(DB).length` — the
*live* in-memory notebook, not whatever stale copy is actually sitting under
`localStorage['my-notebook-v1']`, because when saving is failing those two
numbers are exactly the ones that differ — recovery-copy size and the date
it was taken, everything else the app keeps in `localStorage`, and the
browser's own budget/usage from `navigator.storage.estimate()` where it
exists, filled in asynchronously after the section renders.

**One tap to reclaim space, with consent.** When a recovery copy exists, a
row now offers both `↩ Restore last recovery copy` (unchanged) and
`🗑 Remove recovery copy — reclaim <size>`. Remove opens its own
`showModal()` confirmation — Cancel is the only thing Escape or the backdrop
can reach, the exact v04.39 pattern reused rather than a second dialog
shape invented — says plainly that it is removing the pre-"Replace
everything" safety copy and not the notebook, and states the real byte
count it will free. After a confirmed removal, `_save()` is retried once;
if space was the whole problem, `_save()`'s own existing success path
clears `_lsFail`, toasts "✅ Browser storage is working again", and the ⚠
indicator disappears — no new code needed for that half, it was already
there.

**Truthful advice.** `_storageAdviceHTML()` compares the recovery copy's
real size against the Trash's real size (`JSON.stringify(DB.trash).length`)
and names whichever is actually bigger, with a direct action attached —
never "empty the Trash" when the Trash is nearly empty. When neither is
worth reclaiming, it says so honestly: 💾 Save File is the protection, and
shrinking the notebook itself is a further round, not a promise this one
doesn't keep.

**`⚙ Backup & Restore` is now reachable** — "💽 Storage & Backup" added to
the ⚙ menu's Backup section, opening the same `openModal('settings')` that
already existed and was already covered by `app-check` §13.

### Not done

- No automatic shrinking or compression of the notebook itself. If the
  recovery copy is empty and the Trash is empty and the notebook is still
  over budget, the honest message points at 💾 Save File and says a further
  round is needed — nothing here trims note content, images, or history.
- The advice compares exactly two reclaimable things (recovery copy, Trash).
  A deeper breakdown of "everything else" (Note History, backup-folder
  handles in IndexedDB, sync config) was not itemised — it is reported as
  one combined "everything else" figure, real and measured, just not split
  further. If that figure turns out to be the large one on a real device,
  splitting it is a follow-up.
- `navigator.storage.estimate()` is unsupported or return `{quota:0}` on
  some browsers (notably older Safari); the section says so honestly
  ("not reported") rather than showing a fabricated number.

### D5

All three layouts get the identical shape, following the v04.39 precedent:
the storage section's interactive rows (Restore / Remove, and the Remove
confirmation's own two buttons) reuse `.imp-acts` — full-width,
`min-height:44px`, unconditional in the stylesheet rather than gated to a
breakpoint — so a 1440px laptop gets the same generous target as a 390px
phone. The ⚠ indicator is a fixed absolute badge on the 🧰 button at every
width, sized up slightly under 1200px (18px vs 15px) to match the header's
own larger touch targets there. Nothing about this round's surfaces is
phone/tablet/desktop-specific beyond that one size bump — measured directly
at 390×844, 820×1180 and 1440×900.

### Measured

`tools/app-check.mjs` extended, driving the real app:

- an oversized `DB` in memory makes `_save()` return `false` **with no
  dialog appearing on its own** — the ⚠ indicator appears instead;
- tapping the indicator opens `openStorageWarnDetails()`;
- the storage section reports non-zero, real byte counts, and its notebook
  figure is within a few percent of `JSON.stringify(DB).length`;
- a seeded recovery copy shows with the right date and size; Remove asks
  first; Cancel, Escape and the backdrop all leave it in place;
  `localStorage` is read back after a confirmed Remove to prove the key is
  actually gone, and a retried save succeeds where it previously failed;
- all three layouts: the indicator and the storage rows are on screen and
  ≥44px tall where required.

A pre-existing regression check from v04.21 (`every action the two menus
had in v04.20 is still on one of them` — a frozen allow-list of every
`onclick` handler in 🧰 Tools and ⚙ Settings) failed the moment `#save-lbl`
gained its own `onclick`, the one genuinely new menu action this round
adds. Extended in place with the reason recorded, per the standing rule —
not deleted, not worked around.

11/11 ship checks. App checks: 299 → 322 (23 new). Unpatched-code
verification below.

---

## v04.45 — a check must fail, not explode (22 Sep 2026)

No app change beyond the version strings. `tools/app-check.mjs`,
`tools/README.md` and `CLAUDE.md`.

### The defect

`app-check` is sequential top-level code with no isolation between checks, so
**one uncaught exception ends the whole run with no report at all** — not a
failing line, not a total, not an exit summary.

v04.44's new checks read `getComputedStyle(document.getElementById(
'save-warn-dot'))` and clicked `#save-warn-dot`, `#stor-rows`, `#rmrec-cancel`
directly. Run against a build without those elements — which is *exactly* what
the "do these new checks actually fail on unpatched code" verification does —
`getComputedStyle(null)` threw at the first one and all 322 checks reported
nothing. **The verification v04.44 was supposed to produce could not be
produced**, and the round shipped with that step recorded as deferred.

### The fix, and the false start worth recording

The first attempt guarded the individual call sites that had crashed:
`save-warn-dot`, then `stor-notebook`, then `stor-rows`, then
`getBoundingClientRect` on a null. **Three rounds of whack-a-mole, each one
revealing the next site** — which is this project's own standing lesson about
allow-lists, being re-learned in the harness: a list of the sites that
happened to crash is correct until the next one.

The general fix, and what shipped: **each block in §14 is wrapped in its own
`try`/`catch`, and a throw is recorded as a failed check rather than killing
the run.** Whatever the next missing element turns out to be, the block that
touches it fails, names itself, and the other three hundred checks still run
and still report. The per-site guards were kept as well — `tapIfPresent()`,
`awaitIfPresent()`, `awaitFnOrFalse()` — because Playwright's `click()` and
`waitForSelector()` default to a **30 second** timeout, so an unguarded wait
on an absent element does not just throw, it hangs for half a minute first.

### The standing lesson this round records

`CLAUDE.md` gains the one v04.44 paid for and did not write down: **a check
that opens a surface by calling its function proves nothing about whether the
owner can reach it.** `⚙ Backup & Restore` — Export JSON, Import JSON, and
v04.39's `↩ Restore last recovery copy` — had **zero** call sites for
`openModal('settings')` anywhere in the app. v04.39 shipped its whole
recovery-restore feature unreachable and recorded it as delivered; five rounds
passed. `app-check` covered that modal the entire time, and passed, because it
opened it the one way nothing else could — by calling `openModal('settings')`
directly. It is the twin of "a surface no check has ever opened is a surface
with no checks": here the surface *had* a check, and the check had no path to
it. The harness trap itself is recorded in `tools/README.md`, where harness
traps live.

### Not done

- Only §14's blocks are isolated. The other three hundred checks still share
  one failure domain, so a throw anywhere else still ends the run. Making
  isolation the default for every section is the right end state and is a
  round of its own — doing it here would have meant touching every check in
  the file to fix a defect in one section.
- A block that throws stops at that point, so the checks after the throw
  inside the same block do not run and are not counted. That is why the
  unpatched total below is 319 and not 322. The alternative — isolating every
  individual check — is the round above.
- The browser opened by a block that throws is not closed (`s.close()` sits
  after the throwing line). Harmless for a run that is about to end, and not
  worth a `finally` per block until the point above is done properly.

### D5

Does not apply — no markup, CSS or app JavaScript touched. `index.html`
changed only in its two version strings.

### Measured

11/11 ship checks. Patched: **322/322**, unchanged by the guards — they
weaken nothing when the elements are present.

The verification that could not run before: `index.html`/`sw.js` swapped for
pre-v04.44 (`b361ed2`), v04.45's checks kept. **Before this round: a crash,
no report, zero checks counted. After: `307/319 passed, 12 FAILED`** — the
storage-section, ⚠-indicator, recovery-remove and retried-save checks all
failing as they should against code that has none of those things, three
blocks reporting "this block could not run against this build", and the
v04.20 menu-inventory check failing because v04.44 added `💽 Storage &
Backup` to it. Every one of the twelve is a check that *should* fail there.

## v04.46 — a throw in ANY block must cost that block, not the whole run (22 Sep 2026)

Harness only — `tools/harness.mjs`, `tools/app-check.mjs`, `tools/README.md`,
`ARCHITECT.md`. No `index.html` change, no app behaviour change; the round v04.45
recorded as not done in its own words: *"only §14 is isolated — the other
three hundred checks still share one failure domain."*

`report()` in `harness.mjs` grows one new method, `r.block(id, fn,
{ expectThrow })`. It runs `fn`, and if `fn` throws it records ONE failed row
naming the block, how many of that block's own checks had already run before
it died, and `String(e)`'s first line (never `e.message` — a bare string or a
Playwright rejection has no `.message` and still has to read) — then the
suite continues. `expectThrow: true` inverts the scoring, for one thing only:
the permanent self-check this round adds (below). `finish()` prints one line
naming every aborted block, immediately above the existing totals line, only
when at least one aborted; the totals line's shape (`N/N passed`) is
unchanged, since both `ship-check`'s own tooling and every past changelog
entry parse it. A duplicate block id is itself now a failed check, not a
silent collision.

**Every check in `app-check.mjs` now runs inside `r.block(...)`** — 85 call
sites (one runs three times, once per `VIEWPORTS` entry, with a name-suffixed
id each time), replacing what was sequential top-level code sharing one
failure domain. Granularity is the sub-block that already existed, not the
section: §6p (1490 lines, ~68 checks — a third of the file) is now 22 blocks
instead of one, matched to the bare `{ }` groups and comment-titled parts the
file already used to keep its own reused variable names (`s`, `m`, `rows`)
from colliding; §6h/6i/6j/6k/6l/6n/6o are similarly split into their existing
named parts. Sections with no internal grouping at all — §1–§6, §6b, §6c,
§7–§10, and the `_stampThemeTouches()` section — stay one block each, because
manufacturing a boundary inside genuinely flat code is exactly the kind of
"correct until the next edit" surgery the allow-list lesson warns against,
and they were never the size problem in the first place.

**No binding needed hoisting, anywhere.** Wrapping is pure insertion —
`await r.block(id, async () => {` before a range, `});` after it — so a
block nested inside a section's own pre-existing bare `{ }` (§6e onward
almost all have one) keeps reading that section's shared helpers
(`editAt`/`reach` in §6p; `COLLECT`/`PANE_COLLECT`/`POP_COLLECT`/`openPop`/
`geometry`/`openAssign`/`openBrowse`/`MENUS` in §6i/§6j/§6k/§6l/§6o) through
ordinary JS closure, exactly as it did before this round — the outer bare
brace was never touched, only wrapped around from outside. Verified by
scanning every top-level `const`/`let` for reads outside its own section, per
the Architect's own pre-round measurement; every apparent hit was confirmed a
false positive (a property name or an independent redeclaration) before any
line was moved, and in the end none needed moving.

**§14's five hand-copied catches are gone** — `{ try { … } catch (e) {
r.check(false, '§14 storage/indicator — …') } }`, identical five times,
replaced by `r.block('14a-…', …)` through `14e-…`. `tapIfPresent()` /
`awaitIfPresent()` / `awaitFnOrFalse()` are untouched: they solve Playwright's
30-second default timeout hanging before it throws, which `r.block()` does
not solve and was never meant to.

**Every block id is unique.** The file had three numbers used twice — `§11`,
`§12`, `§13` each appear once in the mergeDB/theme sequence and again later
(layout, manifest, import-consent) — because the file does not run in numeric
order. Renamed to `11-theme-perkey` / `11-layout-three-sizes`,
`12-theme-leaf-merge` / `12-manifest-installable`, `13-stampThemeTouches` /
`13-import-a` … `13-import-e`. The banner comments in the file (`── 11.
Layout at the three real screen sizes ──`) are untouched — a reader still
finds a section by its version, only the block **id** had to be unique, not
the prose. `harness.mjs` now fails the run if any id repeats, so this cannot
come back unnoticed.

**The mechanism proves itself, permanently.** One block
(`self-check-block-isolation`) deliberately throws, declared `expectThrow:
true` so the throw scores a PASS rather than leaving a fully working
`app-check` permanently one check red; one ordinary check straight after it
asserts `block()`'s own return value (`{ threw: true }`) and that the line
itself executed — proof the run continued past an aborted block, read back
from the harness, not asserted on faith. Costs two rows and a few
milliseconds; no future round needs to re-verify isolation by hand.

### The honest limit — written down, not glossed

`r.block()` isolates a **failure**, not the **state** a block leaves behind.
From roughly §6d on, almost every block opens its own `openApp()`, so an
abort there costs only that block, cleanly. But §1–§6c and the first
§7–§13 all still drive the ONE shared `app`/`page` opened once near the top
of `app-check.mjs` — exactly as before this round. A block that aborts
part-way through that shared session can leave it in a shape the later
blocks sharing it never expected, and their failures become suspects
pointing at the aborted block, not independent findings. Recorded in
`tools/README.md` beside the existing v04.45 trap, and filed as its own
backlog item in `ARCHITECT.md` rather than left only here.

### Not done

- `--only` (running one named section) is not built. This round makes it
  possible — every check now has a real, unique id to select on — but
  building it is explicitly the next round, filed in `ARCHITECT.md` with the
  existing backlog line's dependency ticked.
- The shared-session limit above. Splitting §1–§6c/§7–§13 so each block owns
  its own `openApp()` would remove it entirely; not attempted here because it
  is materially larger and riskier than a wrap, and this round was scoped as
  a wrap.
- Not one check's assertion was changed, deleted, reworded or added to —
  this round is isolation only.

### D5

Does not apply — no visual surface, no markup or CSS touched, said plainly
rather than left unsaid.

### Measured

11/11 ship checks. `app-check.mjs`: **324/324 passed, 0 aborted blocks** —
322 pre-existing checks plus the two the permanent self-check adds. Every
check that existed before this round still exists and still asserts exactly
what it asserted before; none were lost in the wrap.

---

## v04.47 — sidebar sections default collapsed, no stray search bar on boot, counts always show

Three small, independent sidebar fixes, all confirmed by reading the code
before the round started. `index.html` and `tools/app-check.mjs` only.

**1. Smart Views and MyDatabase now start collapsed, like every other section.**
`renderSection(sec)` has always tested `ST.secOpen[sec.id]===true` against a
default of `{}` — correctly closed on a fresh boot. `renderSmartSection()`
and `renderDatabaseSection()` instead tested `ST.sfOpen!==false` /
`ST.dbOpen!==false`, against a default of `true` / `undefined` — both read
as "open" on every single launch, unlike everything else in the sidebar.
Both now match the `secOpen` pattern: `ST.sfOpen===true` /
`ST.dbOpen===true`. `ST.sfOpen`'s own declared default had to change too —
the literal instruction to only touch the render-time condition would have
left it reading `sfOpen:true` forever, so Smart Views would still have
opened on boot with the new condition just as it did with the old one; it
is now `sfOpen:false`. **MyDatabase's own click handler needed the matching
fix, not just its render condition**: it read
`ST.dbOpen=ST.dbOpen===false`, which flips correctly only under the OLD
"open unless false" default (`undefined`/`true` = open, `false` = closed).
Under the NEW "closed unless true" default that expression can only ever
set `dbOpen` from `undefined` to `false` — never to `true` — so the section
could never actually be opened by clicking it, once its default changed.
Fixed to `ST.dbOpen=ST.dbOpen!==true`, the same flip `secOpen`'s own toggle
already uses. Neither fix changes how an *already-opened* section behaves,
and no individual folder's own expand/collapse state (`ST.exp`) is part of
this change beyond the item below.

Separately, `ST.exp` started as `{f2:true}` — a specific hard-coded folder
id left over from early development, force-expanded on every boot
regardless of what folder that id is in the owner's real notebook. Now
`exp:{}`.

**2. "Back to search results" no longer shows on a fresh launch.** `#bts-sb`
and its Pane 2 / Pane 3 mirrors are only meant to show when `ST.lastSearch`
is set and `ST.search` is not — exactly what `_updateSearchAccessUI()`
computes — but that function was only ever called from `doSearch()` and
`clearSearch()`, never during boot, and `#bts-sb`'s static markup has no
inline `display:none`. So on a fresh launch, before any search, the button
showed by whatever its CSS default was, with nothing to go back to.
`render()` now calls `_updateSearchAccessUI()` itself, alongside
`renderP2H()`/`renderP3H()`, which turned out to already call their own
`_renderP2SearchBar()`/`_renderP3SearchBar()` mirrors on every render —
so those two surfaces were never actually broken on boot, only `#bts-sb`
was; all three are checked regardless, per the issue's ask.

**3. Folder, section and Smart View note counts always show, including
"0".** Two of the five `.tr-cnt` badge sites (Note-Type kind rows, Tags)
already rendered unconditionally. `trNode()` (plain folders),
`renderDatabaseSection()` (MyDatabase's 4 virtual items) and
`renderSmartSection()` (Smart Views) all hid the badge entirely at 0 —
which is why folders (mostly near-empty right now) looked bare while Smart
Views (mostly real matches) looked normal, same code, different-looking
result. All three now always render the badge, matching the two that
already did.

**What to measure — new app-check coverage**

`tools/app-check.mjs` gets §15, four new blocks: fresh boot with Smart
Views/MyDatabase/a plain section all closed, nothing under them rendered,
and `ST.exp` carrying no truthy key — then each header is clicked and
confirmed it still opens exactly as before (`15a`); `#bts-sb` and both
mirrors read `getComputedStyle(...).display`, confirmed hidden on boot,
shown after a search is made and cleared, and a click on it genuinely
restoring the search (`15b`); a folder with no notes (added inline, since
`seedDB()`'s three folders already have at least one note between them and
their descendants, and other checks depend on that shape unmodified), a
Smart View with zero matches (found dynamically, not hard-coded) and
MyDatabase's My Contacts (already zero in the seeded notebook) all show an
explicit "0" (`15c`); and a regression guard that "New Articles" still
shows its real, nonzero count (`15d`).

**A pre-existing check broken by fixing the actual bug, found and updated
in place, not worked around**: `6i-4-section-strip` read `.tr-row` with
nothing opened, relying on Smart Views being open by default — the very
defect item 1 fixes — to have any row on screen to measure. With that
default corrected, the check threw (`getComputedStyle` on `null`) and
aborted before recording a single check of its own. Recorded here per the
project rule that a check describing what a round deliberately changed
gets updated in place with the reason recorded: it now clicks the first
section header (Smart Views) before measuring, the same "seed the state
before measuring" lesson v04.24 paid for.

**D4 / D5**

One shared render path used at all three breakpoints — there is no
separate mobile/tablet/desktop version of this code to diverge, so there is
no different *shape* to build three times. Measured with `tools/shot.mjs`
at 390×844, 820×1180 and 1440×900: the sidebar reads collapsed, the search
bar is not showing, and a zero-count folder shows "0" without crowding or
misalignment, at all three.

**What was NOT done, and why**

- **No general "collapse every folder" feature.** Only the two top-level
  sections (Smart Views, MyDatabase) changed default; individual folders'
  own remembered expand/collapse state (`ST.exp`, beyond removing the one
  stray hard-coded key) is untouched.
- **No unpatched-code comparison was run**, per the issue's own
  instruction — these are plain bug fixes proven by testing the actual new
  behaviour, not by reproducing the old bug.
- **No sync, storage or export path was touched.** I1–I4 are untouched by
  three render-condition fixes, one default value, one boot-time function
  call and three template strings.
- **`legacy/**` was not touched**, by rule.

**Measured**

11/11 ship checks. `app-check.mjs`: **336/336 passed, 0 aborted blocks** —
324 pre-existing checks, minus none, plus 12 new (`15a`–`15d`); one
pre-existing check (`6i-4-section-strip`) updated in place for the reason
above, everything else asserts exactly what it asserted before.

---

## v04.48 — the last shared app-check session gets its own openApp() per block

Harness only — `tools/app-check.mjs`, plus `tools/README.md` and
`ARCHITECT.md` to close out the backlog line this round resolves. No
`index.html` change, no app behaviour change.

v04.46 gave every check its own `r.block()`, so a throw in one block no
longer kills the whole run, and recorded honestly what that fixed and what
it did not: **isolating a block's FAILURE is not the same as isolating its
STATE**. Blocks from roughly `§6d` onward already opened their own
`openApp()` and were fully independent, but `§1`–`§6c` and the first
`§7`–`§13` — fifteen blocks (`1-boot` through `6c-read-chrome`,
`7-data-roundtrip` through `13-stampThemeTouches`) — all still drove the
ONE `app`/`page` opened once near the top of the file, with block
`13-stampThemeTouches` closing it at the end. A throw partway through one
of those fifteen could leave that shared page in a shape the next block
sharing it never expected, turning its own failure into a suspect rather
than an independent finding.

**Fourteen of the fifteen were a pure wrap**: each now opens its own
`const app = await openApp(); const { page } = app;` at the top of its
block and `await app.close();` at the bottom — the same pattern `§6d`
onward already used. No check's assertion changed; this only changes how
many browser sessions it takes to reach the state each one measures.

**`6-outline` was the one genuine dependency.** It calls
`window._edColHeads()` and reads `#ed` directly with no setup of its own —
it was riding on `#ed` being open on note `a1` in edit mode, left behind by
`5-open-and-edit`. Rather than give it a redundant three-line copy of that
same setup in a session of its own, its check was folded into
`5-open-and-edit`'s block, right after the autosave check it already
followed — same session, same state, no new `openApp()`. Its `r.check()`
call is unchanged.

The now-unused top-level `const app = await openApp(); const { page } =
app;` (just above `1-boot`) is gone, so nothing leaves a browser open for
the whole run; the `await app.close();` that used to dangle at the end of
`13-stampThemeTouches` now correctly closes that block's own local
session, since every block declares its own `app` in its own scope.

`tools/README.md`'s v04.46 trap entry is updated in place to say the gap
it named is closed, and states the general principle for any future block
that might want to share a session: safe only between sub-checks that are
read-only with respect to each other and never abort partway leaving state
a later one depends on — default to a block's own `openApp()`, and fold a
genuinely dependent check into its setup block's session, as `6-outline`
was here, rather than duplicate the setup. The matching `ARCHITECT.md`
backlog line is ticked, with what changed recorded in place rather than
just checked off.

**D5 does not apply** — no visual surface, no app behaviour changed.

**What was NOT done, and why**

- **`--only` (running one named section) was not built.** A separate,
  already-filed backlog item; this round only had to leave it alone, not
  advance it.
- **Nothing from `§6d` onward was touched** — those blocks already opened
  their own sessions and were out of scope.

**Measured**

11/11 ship checks. `app-check.mjs`: **336/336 passed, 0 aborted blocks** —
the same total as `main` before this round; no check was added, removed,
or had its assertion changed, only how many sessions it takes to reach the
state each one measures.

## v04.49 — app-check.mjs --only, now that every block is truly independent

Harness only — `tools/harness.mjs`, `tools/app-check.mjs`, `tools/README.md`,
`ARCHITECT.md`, plus a new `tools/only-check.mjs`. No `index.html` change, no
app behaviour change.

**Why now.** The backlog line for this said "measure first: if the saving is
small, say so and close this." Timed on `main` before this round:
`app-check.mjs` takes **4m32s** wall-clock, up from roughly 2:30–2:45 before
v04.48 made every block open its own session (the right tradeoff for
correctness — see v04.48 — but it raised the real cost of iterating on one
new check while building it). v04.46 already gave every check a unique
`r.block(id, fn)` id, and v04.48 made every block open and close its own
`openApp()`, with zero remaining cross-block state dependencies anywhere in
the file — confirmed directly for this round by grepping every `r.block(`
call site: all of them are top-level statements, none nested inside
another block's function body, so nothing currently depends on another
block having already registered. The hard part was already done; what was
left was collect-then-run (plus one gap that surfaced only once the flag
was actually run — see below).

**The mechanism.** `report()` in `harness.mjs` used to run `fn` the instant
`r.block(id, fn, opts)` was called. It now only **registers** `{id, fn,
opts}` and returns immediately — every one of `app-check.mjs`'s existing
`r.block()` call sites keeps the exact shape it always had, `await
r.block(id, fn, opts)`, because the returned promise resolves the moment
the block is recorded, not when it finishes (one call site is a `for`
loop over `VIEWPORTS` registering three `14e-screen-sizes-*` blocks off one
template-literal id; 92 blocks register in total, from 90 static call
sites). The actual execution moved to a new
`r.run(onlyPrefixes)`, called once at the very end of `app-check.mjs`: with
no filter it runs every registered block in file order — the same order,
same blocks, same output shape as before this round — and only then does
`r.finish()` get called.

**`--only`.** `node tools/app-check.mjs --only 15` (or `--only=15`, or
comma-separated `--only 6h,15b`) filters to registered blocks whose id
matches one of the given values via the new exported `blockIdMatches(id,
prefix)`: exact match, or `id` continues past `prefix` with anything other
than another digit. A digit continuing means the number itself keeps going
(`10-delete` / `11-theme-perkey` are not `1`); a letter or hyphen continuing
means the prefix's number is already complete and what follows is a named
sub-block of it (`15a-...`, `15b-...`, `15c-...`, `15d-...` are all `15` —
this is deliberately looser than "must be followed by a hyphen": the actual
sub-block ids in this file follow a number with a letter, not a hyphen,
before their first hyphen, and the naive hyphen-only rule was written first,
caught immediately by `only-check.mjs`'s own test for `15a-x` against
`--only 15`, and corrected). A filter matching nothing throws — a clear
message naming the value and how many blocks exist — rather than silently
running zero and reporting "0/0 passed"; `app-check.mjs` catches that and
exits 1. `r.finish()` takes the optional run info and prints one extra line
only when a filter was used: `N/M blocks run (--only=...) — this is NOT the
full suite`. An unfiltered run prints nothing extra and reports the same
`N/N passed` line shape it always has.

**A genuine gap in v04.46's "every check runs inside r.block()" turned up
while measuring this round, not assumed.** Two checks — "every button on the
note toolbar does something when clicked" and "the ⋯ menu is still on
screen after a real left-click" — sat in a bare top-level `{ ... }` between
`6f-consolidated-actions` and `6g-type-chip-badge`, never wrapped in
`r.block()` at all. It cost nothing before this round: `block()` used to run
`fn` inline, so wrapped or not, code ran at the exact file position it sat
in. Under collect-then-run it costs real correctness: unregistered code has
nothing to defer, so it runs immediately as the file loads — ahead of EVERY
registered block, including `1-boot` — for every invocation, filter or not.
The first `--only 15` run made this concrete: its own output showed those
two unrelated checks at the top, before any `15*` check, because they had
already run by the time `r.run(['15'])` was even called. Found by running
the flag, not by reading the file — a full-file scan afterward
(`await r.block(` occurrences vs. `r.check(`/`r.pass(`/`r.fail(` call sites,
tracked against which frame currently held an open block) confirmed this
was the ONLY such gap in the file; everywhere else a bare top-level `{ }` is
a scoping wrapper around several already-wrapped `r.block()` calls (used to
share a local `const` helper, e.g. `COLLECT()` across `6i-1`–`6i-4`), which
is harmless under the new model since block-scoping doesn't affect when
`r.block()`'s own registration happens. Fixed by wrapping the orphan pair
in a new `6f-2-toolbar-buttons-live` block; no assertion changed, and the
unfiltered total and order are unaffected (336/336, same as before — this
round only regrouped two pre-existing checks, it didn't add any).

**Known limitation, left as found, not fixed here**: three numeric prefixes
— `11`, `12`, `13` — are each reused by two unrelated original sections
(`11-theme-perkey` / `11-layout-three-sizes`, `12-theme-leaf-merge` /
`12-manifest-installable`, `13-stampThemeTouches` / the five `13-import-*`
blocks), because the file does not run in numeric order (recorded honestly
by v04.46 when it gave them distinguishing full ids rather than renumbering
the banner comments). `--only 11` therefore runs both unrelated groups that
happen to share the leading number. Renaming the file's 92 block ids to
remove the ambiguity was not part of this round's ask and was not done; `tools/README.md` says
this plainly and points at the fix (match the fuller id, e.g. `--only
11-theme-perkey`, to select just one).

**The block-isolation self-check needed restructuring, not just relocation.**
It used to read the throwing block's outcome straight off `await
r.block(...)`'s return value, because `block()` ran `fn` inline and resolved
with the real result. Under collect-then-run that value now resolves at
*registration* time, before anything has executed, so it can no longer carry
`{ threw: true }`. Fixed by exposing `results` (a `Map`, keyed by block id,
filled in by `run()` as each block actually executes) on the report object,
and splitting the one self-check into two registered blocks:
`self-check-block-isolation` (unchanged — still declares `expectThrow` and
throws) and a new `self-check-block-isolation-followup`, which reads
`r.results.get('self-check-block-isolation')` and asserts `.threw === true`.
Same proof as before — a throw does not stop the next block from running —
carried by the mechanism `--only` itself now depends on, rather than the one
this round replaced.

**`tools/only-check.mjs`** is a new, small, browser-free script that tests
the harness mechanism directly, not the app: `blockIdMatches()` against the
exact cases named above (including the `15a-x` / `10-delete` /
`11-theme-perkey` disambiguation), and a tiny fake suite of six registered
blocks run through the real `report()`/`block()`/`run()` — proving `--only
15` actually narrows *execution*, not just the report; that a comma-separated
filter mixing a whole prefix and one exact id unions both; that a
nothing-matches filter throws; and that no filter runs every registered
block, in order. It caught the hyphen-only version of `blockIdMatches()`
being wrong before it ever reached `app-check.mjs`.

**What NOT done, staying that way on purpose**: no `--skip`/exclude flag —
scope creep for this round, per the issue. The unpatched-code verification
this round's issue explicitly said not to run — this round changes how the
harness is invoked, not what any check asserts.

**D5 does not apply** — no visual surface, said plainly. `ARCHITECT.md`'s
matching backlog line is ticked with what was actually built and the 4m32s
measurement that decided it, not just checked off.

**Measured**

11/11 ship checks. `app-check.mjs` unfiltered: **336/336 checks passed, 0
aborted blocks**, across all 92 registered blocks — same totals as before
this round, same order, nothing added, removed or reworded (the two checks
moved into the new `6f-2-toolbar-buttons-live` block were already counted
in 336; this round only gave them a home). `only-check.mjs`: **11/11
passed**. A sample `node tools/app-check.mjs --only 15` run: **4 of 92
blocks** run (12 of 336 checks), reported partial in its own output.

## v04.50 — the notebook has outgrown localStorage: the local copy moves to IndexedDB, the storage panel stops reassuring while saving fails

**Why.** The owner sent the storage figures v04.44 had asked for (issue
#69): their real notebook is **~5.00 MB**, `localStorage`'s per-origin cap
is about 5 MB, and the notebook had crossed it. The panel v04.44 shipped
was reading `navigator.storage.estimate()` — the **origin-wide** budget
(IndexedDB, Cache Storage, everything, about 10 GB) — and printing "about
2.56 MB of about 10242.56 MB used" on the same screen as a warning that
saving had failed. A number that is honest about what it measured and
wrong about the question being asked is worse than no number: it read as
"you have ten gigabytes spare" while the device could not save. And the
Trash — 36.5 KB — was offered as the fix for a 5 MB shortfall it could
never have closed.

**The fix: IndexedDB becomes the system of record for the local copy of
`DB`.** The browser was already offering ~10 GB through the exact API
v04.44 was reading. `localStorage` stays as a best-effort fast path and as
the migration source — deliberately **not** deleted or cleaned up this
round (I8: additive, never discard the old shape; removing it is a later
round).

- **`loadDB()` now reads IndexedDB first.** If it already holds a migrated
  notebook, it is authoritative and `localStorage` is not consulted at all
  beyond the usual embedded-file merge — a stale or hand-edited
  `localStorage` entry on a second boot can never leak back in and undo
  what IndexedDB already has. A device that has never run this version
  (IndexedDB empty) falls straight through to the exact
  `localStorage`/embedded logic this file has always used.
- **Migration runs once, on boot**, only when IndexedDB wasn't already
  authoritative: the fully-settled `DB` (after every other boot-time
  migration has run) is written to IndexedDB and read straight back to
  confirm it actually landed — the same "never trust a write" discipline
  `_saveRecoveryCopy()` already uses (v04.39) — and only a verified match
  flips IndexedDB to authoritative for the rest of the session. A fresh
  install with nothing in either store also passes through here, correctly:
  it has nothing to migrate but still ends the boot on IndexedDB, same as
  every other device from this version on.
- **`_save()` keeps its synchronous boolean contract** — `persist()`,
  `_doPush()` and autosave all still call it expecting `true`/`false` back
  immediately, and IndexedDB's API is not synchronous. Once IndexedDB is
  authoritative, `_save()` still attempts the `localStorage` write as a
  best-effort fast path (a failure there is now only logged, not treated
  as a failure), fires the IndexedDB write, and returns `true` without
  waiting for it. **What this means honestly, stated plainly per the
  issue's ask: a write still in flight when the tab is torn down can be
  lost silently.** This is no different in kind from a debounced cloud push
  or a file write being interrupted the same way — Siyagah has always had
  save paths that can be cut off mid-flight — but it is worth saying once
  rather than leaving it implied: the round that gives `_save()` a
  genuinely awaited contract, if that is ever wanted, is a round of its
  own, not this one. A write that fails once it actually resolves —
  same as a `localStorage` failure always did — through the same
  `_lsFail`/`updateSaveUI()` path, refactored out of `_save()`'s old
  `catch` block into two small shared functions (`_markSaveFailure()`,
  `_clearSaveFailureIfNeeded()`) so a failure or recovery arriving
  *asynchronously* drives the exact same ⚠ badge and toast a synchronous
  `localStorage` failure always has.
- **Fallback stays intact**: with IndexedDB unavailable, or its one
  migration attempt failing, `_save()` behaves exactly as it always has —
  `localStorage` is the system of record and a failed write **is** the
  failure, with the same ⚠ indicator and toast as before this round.

**The panel now tells the truth.** `_storageSectionHTML()` names the store
actually in use next to the notebook figure ("— saved to IndexedDB" / "—
saved to browser storage (localStorage)"). `_refreshStorageQuota()` only
shows the origin-wide estimate while IndexedDB is genuinely where the
notebook lives — now the right comparison, which it was not before — and
on the `localStorage`-only fallback path shows the real ~5 MB cap
(`_LS_CAP_BYTES`) against real byte counts instead. `_storageAdviceHTML()`
computes a `shortfall` (only meaningful on the fallback path — while
IndexedDB is authoritative there is essentially never a shortfall) and,
when the biggest reclaimable thing on the device is smaller than the
shortfall, says so explicitly — "that will not be enough to close the
gap" — instead of offering it as the fix. The ⚠ badge behaviour from
v04.44 (lights quietly, no auto-popup, clears itself the moment a save
succeeds) is unchanged, and now genuinely does clear once IndexedDB is
what a save actually depends on.

**Harness change required to keep testing this at all.** `loadDB()` is now
`async` — boot no longer finishes in one synchronous tick. `openApp()` in
`tools/harness.mjs` used to wait on `typeof window.render === 'function'`,
which is true the instant the script is *parsed* (function declarations
hoist) and proves nothing about whether boot actually finished; it now
waits on a new `window.__appBooted` flag that `index.html` sets only after
`loadDB()` has resolved and `render()` has actually run. `openApp()` also
grows a `disableIndexedDB` option — the only way to genuinely exercise the
IndexedDB-unavailable fallback path in a real browser: it deletes
`window.indexedDB` via an init script before the app's own script runs, so
`_idbOpen()`'s own `if(!window.indexedDB)` check takes the branch a
browser that never shipped IndexedDB would.

**New app-check section, 16a–16g, 26 checks** (targeted run, `--only 16`:
26/26 passed) drives the real app for every behaviour the issue asked to
be measured: an oversized notebook saves via IndexedDB where the
`localStorage` write genuinely fails, where it returned `false` before
this round; a reload returns the same notebook, read from IndexedDB and
`localStorage` directly (never a JS variable) — proven by growing the
notebook while `localStorage`'s write is stubbed to keep failing, so if
the note reappears after reload it can only have come from IndexedDB;
the migration runs once — a decoy notebook written straight into
`localStorage` after the first boot never appears in `DB` or in IndexedDB
after a second boot, proving IndexedDB is read first and `localStorage` is
not re-consulted; with IndexedDB unavailable the app still boots from
`localStorage` and a failing write still lights the ⚠ indicator, exactly
as before this round; a genuine IndexedDB write failure (stubbing
`_idbPut` itself, not `localStorage.setItem`) lights the same ⚠ indicator
and clears it once a write actually succeeds again; the panel names the
real store in use on both paths, and the fallback path's budget line
mentions the real ~5 MB cap and never GB; a trivial reclaimable amount
(a couple of KB of Trash against a multi-hundred-KB shortfall) is reported
as not enough, never as the fix. One bug was caught and fixed in the
checks themselves while writing them, not in the app: `_idbReady` and
`_lsFail` are `let`-declared at the top level of the inline script, so —
unlike a function declaration — they never become properties of `window`;
the first draft read `window._idbReady`/`window._lsFail` from
`page.evaluate()` and always got `undefined` back. Fixed to the bare
identifier, which resolves through the realm's shared global lexical scope
the same way this file's pre-existing checks already read
`_lsFail`/`DB`/`ST`.

**Layouts (D5).** Data and one existing panel, all three sizes get the
same shape, said plainly per the issue: nothing new is gated behind a
breakpoint, `#stor-store`'s text and the rewritten budget line are just
new text inside the storage rows the pre-existing `14e-screen-sizes-*`
check (unchanged this round) already measures at 390×844 / 820×1180 /
1440×900, and `.imp-acts`' unconditional 44px targets are untouched.

**What this round deliberately did not do**, per the issue: `localStorage`
is not deleted or cleaned up — it stays as the fast path and the way back,
by design (I1); removing it is a later round. Nothing about `_save()`'s
synchronous contract was rewritten to genuinely await the IndexedDB write
— every caller still gets an immediate boolean, with the in-flight-write
caveat above stated rather than hidden.

**Completed by the Architect, in review (six builder runs had stopped at
the measuring step; `ARCHITECT.md`'s three-strikes rule applied).** Reviewing
the async boot found three defects that the builder's 26 new checks did not
cover. Each is now guarded by a check shown to fail on the builder's code:

- **I1: a switch-away during start-up wiped the saved notebook.** Until
  `loadDB()` resolves, `DB` is the empty placeholder, but the `pagehide`/
  `visibilitychange` listeners that call `_save()` are registered at parse
  time. New `16h` holds IndexedDB's open back 1.5 s and fires `pagehide`
  inside that window. On the builder's code, localStorage read back at that
  moment held **0 notes, 0 folders**. Fix: `_dbLoaded`, set the moment `DB`
  holds the real notebook; `_save()` and `persist()` refuse to run before it.
- **I3: the service worker never registered.** Its `load` listener was added
  after boot's `await`, by which point `load` had already fired. New `16i`
  found no registration on the builder's code. Fix: register directly when
  `document.readyState==='complete'`.
- **The sidebar was fitted to an empty tree.** `autoFit(true)` ran on
  `document.fonts.ready`, registered at parse time, which could now land
  before the tree was built. Pane 3 measured 680px on one run and 870px on
  the next at the same window size. It now runs inside `_boot()` after
  `render()`.

**The suite is deterministic again.** `window.__appBooted` is now set after
`document.fonts.ready`, the sidebar fit and two frames, not straight after
`render()`. The first full run on the builder's branch had 9 failures; a
second, with a longer settle, had 12 in a different set.

**One "flaky" check was a real defect it only sometimes saw.** `6j-1` failed
2 runs in 4 under load on this branch and never on `main`. The cause: the
words "Multi" and "Single" were painted in the swatches `--gold` (~3:1 on
the shipped paper) and `--green` (**1.04:1** on a pale accent over a dark
pane). `main` passed only because the toolbar had folded the words away
whenever the sweep looked. Fixes:

- The words now use text inks: `--green2`, and a new `--gold-ink` derived
  per paper in `applyPaneInk()` with `_accentInk()`.
- `_p3FitEditBar()` now clears the read bar's fold classes, which a late
  read fit could leave on the edit bar.
- `#p3h` re-fits when its own width changes.
- New `16j` forces the words into view and measures all 20 cases: worst
  1.04:1 before the fix, all ≥ 4.5:1 after.

**Five `§14` checks were updated in place**, as the review asked. They forced
only a `localStorage` failure and expected a warning, which is exactly what
this round changed. They now fail **both** stores (new `forceIDBWriteFail()`)
and read the failure from `_lsFail`, because `_save()` returns `true` while
the IndexedDB write is still in flight. Each carries the reason inline.

**Not done:**
- Removing the `localStorage` copy (deliberate; a later round).
- Awaiting the IndexedDB write in `_save()`.
- A frozen build opened on the same site after migration writes only
  `localStorage`, which this build no longer reads once IndexedDB holds
  the notebook. Cloud sync still carries those edits across. Recorded
  here, not fixed.

**Measured**

Measured by the Architect on the final head:
- `ship-check` **11/11**.
- `app-check` **366/366 twice in a row**, 102 blocks, 0 aborted. The
  builder's head had 327/336 on one run and 324/336 on the next.
- Under load, the three previously timing-dependent groups (`6e`, `6j-1`,
  `16`) ran four at once: **43/43 on 4 of 4**.
- **Unpatched verification:** `main`'s `index.html` with this round's checks,
  one run, the only change being `window.__appBooted=true` after `render()`,
  since the harness now waits on that flag: **340/353, 13 FAILED**. All 13
  are this round's own checks: `16a`–`16e` (IndexedDB), the four `16f`
  panel checks, `16g`, `16h`'s setup (`main` has no async window to fire
  into) and `16j`.
- Four new checks pass on `main` **by design**, because they guard
  behaviour `main` already had right: `16h`'s notebook-intact check and
  `16i` (service worker registers) are regression guards for the two
  defects the async boot introduced. The five updated `§14` checks describe
  failing-save behaviour both builds share.
- `shot.mjs` at 390×844, 820×1180 and 1440×900: all three render normally.

---

## v04.51 — how the owner gives work, written into the brief (23 Sep 2026)

No app change beyond the version strings. `ARCHITECT.md` only.

### Why

The owner asked, in as many words, whether it was acceptable to send jobs
"scattered, on-the-go, without an organised plan" and have the Architect do
the planning, assigning, reviewing and reporting. The answer was yes — that
is exactly the division of labour `ARCHITECT.md` already described. But the
agreement lived **only in a chat message**, which is the precise failure
v04.41 existed to stop: a session ends or is summarised, and the next one
starts from a blank slate and may quite reasonably answer the same question
differently, or worse, start asking the owner to organise their own requests.

The owner then confirmed it should be written down. This round writes it.

### What was added

A new section, *How the owner gives work — confirmed 23 Sep 2026*, stating
that scattered, unplanned, multi-topic messages are **the agreed working
method and not a problem to be corrected**, and listing what the Architect
owes in return:

- **Separate** — one message can hold several unrelated jobs. The 23 Sep
  message carried a storage failure and two unrelated search requests.
- **Diagnose before believing the description** — the owner's report is a
  symptom, and their explanation can be wrong while the report is right.
  Recorded with the case that proved it: they said "no space prob" about a
  device with gigabytes free, and were correct about the device and wrong
  about the cause, because the notebook had filled a ~5 MB browser locker
  they had no way to know existed. Taking the words literally would have
  meant silencing a true warning.
- **Order by risk, not by the order they were typed** — anything that can
  lose, expose or fail to save notes goes first.
- **One job at a time**, and **verify by measurement, then report in plain
  words**, both pointing at the existing sections rather than restating them.

Two things it says explicitly because they are the failure modes:

- **A rough sense of weight helps and is never required.** With no steer on
  urgency, the Architect decides and says what it decided — it does not ask
  the owner to rank their own list.
- **Do not send the work back to them for organising.** "Shall I split this
  into rounds, and in what order?" is exactly the involvement the owner has
  said they do not want.

The *Who does what* table's Owner row now reads "Gives jobs — **in whatever
form and however scattered**", pointing at the new section, so the rule is
visible from the first table a fresh session reads.

### Not done

- Nothing in `CLAUDE.md` changed. This is a rule about how the Architect
  receives work, and `CLAUDE.md` is the builder's brief — the builder's input
  is an issue written by the Architect, which is already organised by the
  time it arrives. Putting it in both files would be two copies to drift.

### D5

Does not apply — no markup, CSS or app JavaScript touched. `index.html`
changed only in its two version strings.

### Measured

Built on the v04.49 base: 11/11 ship checks, 336/336 app checks. Rebased by the
Architect onto v04.50 (the app file taken from `main` with only its three
version strings changed): **11/11 ship checks, 366/366 app checks**.

## v04.52 — a spreadsheet inside a note (round 1 of 3) (23 Sep 2026)

**Why.** The owner asked, marked urgent, for "a full MS Excel-type table in a
note with all standard Excel functions". A standalone demo was built and sent
first. The owner approved it ("build as you recommended"). This is round 1:
everything in the demo, living inside a real note.

**Built by the Architect directly.** Six builder runs in a row had stopped
before pushing their checks (v04.50). A working, tested engine already
existed in the demo. `ARCHITECT.md`'s rule is to take a step off the builder
when it stops at the same step twice; this round took the whole round.

**What the owner gets.** In any note being edited, **＋ Insert → ▦
Spreadsheet** puts a live grid at the cursor. It is in Pane 3's `+` group
(bar and phone menu, from the `_EB_INSERT` table) and in the Multi pop-up's
own `+` group. The grid offers:
- **113 functions**, browsable under **ƒx Functions** with a one-line
  explanation each. Name suggestions appear as you type, and the argument
  hint shows inside a call.
- Live recalculation.
- Click or drag cells to put references into a formula.
- `$` absolute references.
- Errors shown as values, with an explanation on hover.
- A missing `)` added automatically.
- Sort (it skips a bold header row and a "Total" row).
- Insert and delete rows and columns; references are rewritten, and deleted
  ones become `#REF!`.
- Fill down and fill right.
- Copy and cut, and paste from Excel or Google Sheets. Formulas move
  relatively when pasted within the sheet.
- Bold, italic and alignment; number formats (1,234.00, $, %, date); four
  fills; column resizing.
- Undo and redo per sheet.
- A Sum/Average/Count bar for a selection.
- A two-tap **Remove**.

The read view shows the sheet recomputed and read-only: you can select cells
and see the formulas and totals, but there is no toolbar.

**How it is stored (the part that protects I1–I4).**
- A sheet is `<div class="sgx" contenteditable="false" data-sg="{JSON}">`
  around a **snapshot** `<table class="sg-static">` of its values. It lives
  in the note's own HTML, so there is **no new `DB` key**. It saves, syncs
  (per note, newest wins), goes out in Save File and opens offline exactly
  like the note's text. Search, Pane 2 snippets and any older build see
  real values.
- **The snapshot is rebuilt only when the sheet is edited, never on load.** A
  sheet using `TODAY()` or `RAND()` would otherwise make an untouched note
  look newer every time it was opened. A newer `updatedAt` wins `mergeDB()`
  against a real edit made on another device (I2).
- Check `17d` proves that opening and editing around such a sheet leaves
  `a.content` and `updatedAt` byte-for-byte unchanged. Writing that check
  caught a real case: `_sgCanon()` re-added `contenteditable` at the end of
  the attribute list, which made the stored string differ. It now keeps
  attributes in place.
- `_edColClean()`, the one function every save path already runs, calls
  `_sgCanon()` to strip the live grid back to the stored shape.
- `_edColInit()` mounts sheets editable; `upgradeViewCards()` mounts them
  read-only.
- New sheets are built with DOM calls, not `insertAtCaret()`, because
  `execCommand('insertHTML')` sanitises what it inserts, and the data
  attribute carries the whole sheet.
- Key, clipboard, input and composition events stop at the sheet. Enter,
  Tab, Backspace and Ctrl+Z in a cell never reach the note editor or the
  document-level undo. Check `17c` proves the note text around the sheet is
  unchanged by them.
- **Class name `.sgx`, not `.sg`:** `.sg` is already the subfolder grid. The
  first cut used it, and the grid collapsed to one column (it inherited
  `display:grid`); the sheet's border rule would also have landed on every
  subfolder grid. Caught by a screenshot, then measured.

**Layouts (D5).** Same feature on all three; the shape differs only in how
you type:
- **Phone (<640px):** you edit in the formula bar above the grid, and a key
  row appears (= ( ) , : + − × ÷ " $ SUM ✓ Enter) so symbols are one tap
  away. The toolbar scrolls sideways inside the sheet, and the grid scrolls
  inside the note. The `+` menu closes itself after inserting (it had sat
  on top of the new sheet; caught in build).
- **Tablet and laptop:** you type straight into the cell, with the same
  formula bar above.
- **Both pop-ups:** Single is Pane 3, so it works there as is; Multi has its
  own `+` group.

**Checks: new section 17, 23 checks.**
- `17a` (×3 sizes): reachable by the real ＋ → ▦ buttons; the sheet spans
  the note, stays on screen, the menu closes, and there are no page errors.
- `17b`: typed formulas compute; the stored shape is clean and carries the
  value; after a reload the read view is recomputed and read-only, and
  editing brings it back editable.
- `17c`: keys stay in the sheet.
- `17d`: opening a sheet does not change the note.
- `17e`: inserting and saving from a Multi pop-up.
- `17f`: paste from another spreadsheet; the phone's formula bar and key row.
- `17g`: the engine gives Excel's answers on 16 known cases, and the library
  has 110+ functions.

**Not done (rounds 2 and 3, filed on the backlog):**
- drag-to-fill handle, frozen header row, merged cells, borders, colour
  rules, filters;
- several sheets per table, and CSV in/out;
- more functions (about 150);
- charts, and .xlsx import/export.

Also not done:
- A sheet copied from one note and pasted into another through the note
  editor (not the grid) goes through `execCommand`'s sanitiser. Whether the
  data attribute survives is **not measured**; at worst it pastes as the
  plain values table.
- Excel has about 500 functions; the obscure engineering and statistics ones
  are not planned unless asked for.
- No macros and no pivot tables.
- Limits: 500 rows × 52 columns per sheet.

**Measured**
- `ship-check`: **11/11**.
- `app-check`: **389/389 on two consecutive full runs**; 366 of those were
  already on `main`, and 23 are new.
- **Unpatched verification:** `main`'s v04.51 app with this round's checks,
  one run: **369/381, 12 FAILED**. All 12 are section 17. Every one of the
  366 pre-existing checks still passes. The three `17a` "no page errors"
  checks pass on `main` by design, because nothing is inserted there, so
  nothing can throw.
- Screenshots at 390×844, 820×1180 and 1440×900: the sheet spans the note at
  all three.

---

## v04.53 — pop-ups made alike, round (a): the note looks the same inside Multi as inside Single (23 Sep 2026)

Round (a) of four in "make the two pop-ups (Multi and Single) look and work
the same" (issue #73). This round covers the note's own content only — the
frame and the toolbar are rounds (b) and (c).

**The defect.** Single is Pane 3 lifted out, so its editor *is* `#ed`. Multi's
editor is a separate element, `.fw-ed`, and its content rules had drifted from
`#ed`'s: a fixed 13px `DM Sans` instead of `var(--fs-content)`/`var(--body)`,
headings in `em` off that 13px instead of `--fs-h1..4`, paragraphs with no
`--pp-gap`, lists at `padding-left:0` (which is why numbers and nested bullets
looked clipped or missing), a plain `ol` counter instead of
`decimal-leading-zero`, a blockquote with no gold rule, and the heading fold
arrow/grip rendering as unstyled inline glyphs instead of styled 16–18px boxes.

**The fix.** Every `#ed <selector>` rule that styles note content — headings,
`p`, `ul`/`ol` and their `list-style-type`, `blockquote`, `img.ed-img`,
`.bk-mv`, `.bk-card`, the `-webkit-touch-callout` line, `.ed-col-arr`,
`.ed-col-grip` (with `:hover`, `:active` and the phone media rule),
`.ed-col-hidden`, `.ed-blk-dragging`, `.ed-col-preview`, and the
`:empty::before` placeholder — now also selects `.fw-ed <selector>`, added to
the existing selector list rather than duplicated, so the two sets cannot
drift apart again. `.fw-ed`'s own root rule now carries the same
`font-family:var(--body)`, `font-size:var(--fs-content)`,
`line-height:var(--lh-content)`, `color:var(--body-ink)` as `#ed`; it keeps its
own layout (`flex`, `overflow-y`) and its own, deliberately compact, `14px`
padding — the same value `#ed` itself uses on a phone, because a pop-up window
is narrower than Pane 3. The old separate `.fw-ed h1`–`h4` rules (fixed `em`
sizes off 13px) are deleted; the shared rules replace them. No rule is scoped
`.editing`/`:not(.editing)` — Multi is always an editor. Owner font settings
(`--fs-content`, `--lh-content`, `--pp-gap`, set by `applyFontSizes()` /
`applyLineSpacing()`) already write to `document.documentElement`, so they
reach `.fw-ed` the same way they reach `#ed`, with nothing new to wire up.

**Layouts (D5).** One change, no breakpoint gates it. Desktop and tablet:
Multi is a floating window, content matches Pane 3/Single, compact padding.
Phone: Multi is the full-screen sheet (v04.34), same content, same 14px
padding `#ed` already uses at that width.

**Checks: new section 18, run with `--only 18`.**
- `18a` parity sweep (×3 sizes): seeds one note with h1–h4, a paragraph, a
  3-level nested `ul`, a 10-item `ol`, a blockquote, bold/link/code; opens it
  in Pane 3 (`selArt`+`startEdit`) and again via `popOutNote`; compares
  `font-family`, `font-size`, `line-height`, `color`, `margin-top`,
  `margin-bottom`, `padding-left`, `list-style-type`, `font-style` and
  `border-left-width` between `#ed` and `#fw-ed-<id>` for root, h1–h4, p, ul,
  ul ul, ul ul ul, ol, li, blockquote.
- `18b`: every `li` in the Multi editor, including the third nesting level,
  has its left edge at least 16px inside the editor's content-box — the
  marker-clipping defect, measured directly.
- `18c`: `.ed-col-grip`/`.ed-col-arr` computed `display`/`width`/`height`
  match between the two editors.
- `18d`: a non-default content size and line spacing set through
  `applyFontSizes()`/`applyLineSpacing()` reaches the Multi editor's root
  `font-size`/`line-height`.

**Measured**
- `ship-check`: **11/11**.
- `app-check --only 18`: **11/11**, and also checked to genuinely fail
  against the pre-fix CSS — 6 of the 11 FAIL there, reproducing every
  defect in the issue's table (font, heading sizes, paragraph gap, list
  padding, `ol` counter, blockquote, and the grip/arrow chrome) exactly.
- Full `app-check`, run by the Architect in review: **400/400, twice in a
  row**. Unpatched (v04.53's `tools/` against v04.52's `index.html`):
  **394/400**, all 6 failures in section 18 — the other 5 section-18 checks
  pass there because they are guards (no page errors ×3, both editors render
  the grip/arrow, the setting really moved `#ed`), not the parity assertion
  itself. Built by the builder unassisted.

## v04.54 — pop-ups made alike, round (b): one shared frame (title, ‹ ›, ✕, Multi⇄Single switch) (23 Sep 2026)

Issue #75, round 2 of 4 in "make the two pop-ups (Multi and Single) look and
work the same". Round (a) (v04.53) did the note's content; this round does the
bar across the top. The toolbar underneath is round (c).

**What was there.** Multi's `.fw-hd` had a drag grip, ‹ ›, a title, a
`✓ Saved` chip and ✕ — and no way to reach Single. Single had a phone-only
bar (`#p3-sheet-hd`, built by `_p3SheetHdSync()`) with an icon, a title and
`✕ Close`; on a tablet or a desktop it had **no frame at all** — it was
dragged by the tab bar, had no ‹ ›, and its only ✕ was `cancelEdit()`
"Cancel (Esc)", which stops editing rather than closing anything. Its switch
to Multi was the `Multi`/`Single` pair on the edit bar. And `#sb-toggle`
(`z-index:9999`) painted on top of both pop-ups at 1440×900, above
`.float-win` (6000+) and `#p3.modal-mode` (5001) alike.

**The fix.** One function, `_popFrameHTML(aid, mode)`, builds the whole bar
for both pop-ups — Multi's `.fw-hd` and Single's frame are its output, so
they cannot drift apart the way they just had. Left to right: a drag grip
(window tier only, hidden by the same CSS that already hid Multi's on a
phone), the pop-up's own icon, ‹ › to the neighbouring note, the title
(min-width 80px — a flex item with `overflow:hidden` defaults to a
shrink-to-zero minimum, the same fault v04.14's header paid for), the
`✓ Saved` chip, a switch to the *other* mode (its icon and short word,
calling `openNotePopup(aid, otherMode)` so the choice is remembered exactly
as the edit-bar buttons already remember it), and ✕ close — which gains the
word "Close" on the phone tier, for both pop-ups, matching what
`#p3-sheet-hd` used to say only for Single. Every control carries a `title`
and a stable `data-pf="grip|ico|prev|next|title|saved|switch|close"`.
`.fw-hd`'s own vertical padding drops from 7px to 4px — measured, not
guessed: at 1440 the desktop-tier controls are icon-sized (~20px), and 7px
top and bottom made the bar 35px against a check that (per the issue) wants
the frame's height within 1.5× its tallest control; 4px brings it to 29px.
Multi's bar gets this too, since both read the one rule.

**Single gets the frame at every tier**, not just the phone `_p3SheetHdSync()`
was limited to. `_popFrameSync()` builds it as the first child of `#p3`
while `modal-mode` is on, called from `openNoteModal()` on open and from
`renderP3H()` on every note change (tab switch, `‹ ›`, `openNotePopup`) —
`renderP3H()` is the one function every such path already calls (see the
per-note-tabs comment right above it), so nothing new had to be threaded
through the ~30 places that reassign `ST.article`. `closeNoteModal()` removes
it. On the window tier the frame is also a drag handle: `_wireModalFrameDrag()`
calls the modal's own `_modalDragStart()` on `pointerdown` — the existing
mover, not a second one — exactly the pattern `_fwWireDrag()` already used for
Multi. The tab bar's own drag is untouched. `_p3SheetHdSync()` and
`#p3-sheet-hd` are deleted, not left dead.

**Single's ‹ ›** (`_panelNavigate()`) is `_p3Navigate()` plus one line:
`selArt()` already saves the outgoing note if it was being edited (I1) and
moves `ST.article`; the added `startEdit()` re-enters edit mode for the note
just switched to, because Single never leaves edit mode any more (see the
next paragraph) the way Multi never has.

**`✓ Saved` in Single is the frame's own chip.** `flashSaved()` now also
calls `_popFrameFlash()` whenever `ST.noteModal`, which updates the frame's
title text in place (mirroring how Multi's autosave already touches
`.fw-title-disp` without a full rebuild) and flashes the chip; Pane 3's own
`#save-flash` is hidden inside `#p3.modal-mode` so only one is ever visible.

**Three removals, one CSS rule each.** `.modal-pop-btn` is hidden inside
`#p3.modal-mode` (it stays on normal Pane 3's own bars, where there is no
frame to replace it). Every `cancelEdit()` ✕ is hidden inside
`#p3.modal-mode`, matched by `[onclick="cancelEdit()"]` rather than by class,
so all three existing call sites (the contact-form header, the phone tag
bar, and the one-bar phone title row) are covered by one rule and a fourth
added later needs no new one — Multi has never had a stop-editing control
(it is always an editor) and closing already flushes (`closeNoteModal()` →
`_flushEd()`), so nothing typed is lost. `#p3-sheet-hd`/`_p3SheetHdSync()` are
gone, replaced by the frame.

**`#sb-toggle` never paints over a pop-up any more** — `z-index:9999` (above
everything) is now `z-index:400` (above ordinary pane chrome, below both
`#p3.modal-mode` at 5001 and every `.float-win` at 6000+). It still works
exactly as before whenever no pop-up covers it.

**Shape on each layout (D5).** Desktop and tablet: a draggable one-row frame
on both pop-ups; the switch gets the same ≥40px height the close/nav controls
already have under 1200px. Phone (and 360px): the sheet — no grip, `✕ Close`
with its word, the switch drops to icon-only (keeping its `title`) so the
title keeps its 80px. One function, one set of tier rules (`_popTier()`), so
none of this can be copied unevenly across platforms the way the pop-ups
themselves once were (v04.34's lesson).

**Also this round**, per the issue: filled in v04.53's `(measured in review)`
placeholders in `CLAUDE.md` and here, with the Architect's PR #74 numbers.

**Checks: new section 19 (`19a`–`19g`), `--only 19`.** Same frame at 390/820/
1440 (ordered visible `data-pf` list identical, one row, title ≥80px at 390
and 360); Single's `‹ ›` stays in Single, stays editing, saves the outgoing
note; the switch both ways with real clicks (note follows, no stray Multi
window, `DB.theme.notePop` stamped); a real click on ✕ closes each pop-up and
it stays closed; exactly one `✓ Saved` and one ✕ inside Single, with
`.modal-pop-btn` still visible on normal Pane 3 at 1440; `#sb-toggle`'s centre
resolves inside whichever pop-up covers it; a mouse drag on the frame's title
moves the panel at 1440 and does not at 390.

Three pre-existing checks in `tools/app-check.mjs` (block
`6p-17-popups-every-platform`) asserted `#p3-sheet-hd`/`.sh-x` directly —
updated in place to read the shared frame's `.fw-close`/`.fw-drag` instead,
with the reason recorded inline; none were deleted.

**Review fix, same round, no version bump.** The Architect's review of the PR
found Single's new ✕ unreachable at 820×1180 and 1000×1180: `#p3`'s measured
rect was 787px wide at an 820px-wide viewport (right edge 847, 27px past the
screen), so the frame's ✕ — and the right end of the tab bar and toolbar —
hung off-screen. **Cause**: `@media(min-width:640px) and (max-width:1199.98px)`
(the tablet off-canvas layout, pre-dating this round) sets
`#p3{width:100%!important}`. `openNoteModal()` sets the modal's width as a
plain inline style, and Single's `#p3.modal-mode` rule never declared its own
`width` — so that pre-existing `!important` beat the inline px width outright
(an `!important` stylesheet rule always wins over inline style, whatever the
specificity), regardless of what `openNoteModal()` had asked for. Not a `vw`
math error; the requested width (`min(700, 88vw)` = 700px at 820) was correct
throughout. **Fix**: split `width:100%!important` onto its own
`#p3:not(.modal-mode)` rule inside that media query, so it no longer applies
once `modal-mode` is on — every other property that rule sets is already
re-declared, `!important`, on `#p3.modal-mode` itself, so nothing else moved.
`.float-win` (Multi) was never affected — that off-canvas rule only ever
targeted the `#p3` id. Desktop (no such rule) and phone (already guarded by
its own higher-specificity `#p3.modal-mode{width:auto!important}` override)
are unchanged — measured, not assumed. As defence in depth, `openNoteModal()`
now also reads the panel's real laid-out rect one frame after applying
`modal-mode` and clamps it inside the viewport
(`requestAnimationFrame(...)`→`_modalClampToViewport()`), so a future
conflict this round didn't anticipate strands the panel for one frame instead
of leaving it there; `_modalClampToViewport()` now no-ops on the sheet tier,
which sizes `#p3` with its own `!important` edge-to-edge CSS and needs no JS
geometry at all.

**Also fixed, same push**: the frame's phone-only "✕ Close" wording and its
grip/switch-word visibility were baked into `_popFrameHTML()`'s output at
build time, and nothing re-ran it on a plain resize. Single re-syncs via
`renderP3H()` on every note change, but `_renderPreserveEdit()` skips
`renderP3H()` whenever the pop-up is open and editing — the only state v04.54
ever leaves it in — and Multi's open windows had no resync path at all, so a
rotation crossing 640px with no note change left both frames showing the
wrong tier's wording. `_onViewportResize()` now tracks `_popTier()` (the
640px sheet/window split) separately from the existing `_rzTier`
(`_uiTier()`'s 640/1200 split, which doesn't change the frame's markup at
1200px) via a new `_rzPopTier`, and on a crossing calls `_popFrameSync()` for
Single and a new `_fwFrameResyncAll()` for every open Multi window.
`_fwWireDrag()` split into `_fwWireDragHandle()` (the pointer-drag wiring,
now re-run on each rebuilt `.fw-hd`) and its own `ResizeObserver` set-up
(left at `_fwCreate()` time only, so a rebuild never stacks a second
observer on the same window).

**Checks (update in place, per the issue): section 19 grows to `19a`–`19i`.**
`19d` (✕ really closes) now runs at all three `VIEWPORTS` sizes plus
1000×1180, not just 1440 — this is the check that would have caught the
blocker, since it clicks the real screen coordinates rather than querying the
DOM. New `19h`: at 820×1180 and 1000×1180, for both pop-ups, the whole panel's
rect lies inside the viewport and `elementFromPoint` at the centre of every
visible `data-pf` control resolves back to that control (the `✓ Saved` chip
is `pointer-events:none` by design — a status toast, not a button — so it is
excluded from the hit test, not required to pass it). Confirmed failing
against the pre-fix `index.html` with this round's own `tools/app-check.mjs`:
Single failed at both tablet widths (2/4 passed), matching the Architect's
measured rects exactly (`right:847` at 820, `right:1110` at 1000); Multi
passed throughout, confirming it was never affected. New `19i`: opens each
pop-up at 820, resizes to 390 and checks the frame reads "✕ Close" with no
grip and an icon-only switch, resizes back to 820 and checks the grip and the
switch's word are back — for both Single and Multi.

**Measured**
- `ship-check`: **11/11**.
- `app-check --only 19`: **26/26** (was 14/14; `19d` widened, `19h`/`19i`
  added) — this is the number after the review fix above; the builder's own
  pre-fix run was 14/14.
- `app-check --only 6p`: **104/104** (regression spot-check — the surface the
  width fix touches).
- Full `app-check`, measured by the Architect in review on PR #76: **426/426,
  twice in a row**. Unpatched (v04.54's `tools/` against v04.53's
  `index.html`): **398/415, 17 failures** — all of them the three
  `6p-17-popups-every-platform` checks updated in place this round and the
  whole of new section 19, exactly as expected of code that predates the
  frame.

---

## v04.55 — pop-ups made alike, round (c1): the same controls, with the same words, in the same order

Issue #77, round 1 of 2 of round (c) of "make the two pop-ups (Multi and
Single) look and work the same" — (a) v04.53 was the note's content, (b)
v04.54 was one shared frame. This round decides *which* controls sit between
the frame and the note, what they are called, and their order; c2 (next
round) is the formatting button row's (Aa H ≡ + ↺ 📋 🔍 ⋯) own grouping and
fold — untouched here, deliberately.

**Measured on `main` at v04.54** (the issue's own table, same note `a1`):
Multi lacked the tag box (read-only tags, no add/remove), the `Type` label
and chip, `📎 Attach` with its word and count, `🔀 Start Versioning`, and
`📦` Archive. Single lacked the folder chip and `⋯` Section tools on
desktop. `🏷` meant two different things in Multi — the tags prefix on its
chips and the Note Types button on its toolbar (Pane 3 has meant only tags
by it since v04.11). Single carried `🏠`/`◀`/`📁`, three controls that
navigate panes sitting *under* the modal — the same fault v04.34 already
fixed on the edit row. And the two pop-ups disagreed on order: Single put
its toolbar above the title, Multi put the title first.

**One strip, one order, both pop-ups, every size**: title → Type/Attach/
Archive → Tags → Folders → Versions → Date (+ fields), then the formatting-
only row below it. Built once, by `_popMetaStripHTML(a,host)`
(`index.html`), and used by both:

- **`kindBarHTML(a,bare,noSave,forceEdit)`** gains one parameter rather than
  a second copy. It already tested `ST.editing&&ST.article===a.id` to decide
  whether to show Save/Archive/Finish — true for Single always, because
  `openNoteAsModal()` already calls `startEdit()` before the modal opens
  (and Single never leaves edit mode, per v04.54). It is never true for
  Multi, whose note is never `ST.article`, so `forceEdit` lets a pop-up ask
  for the editing treatment directly. `data-ps="type"`/`"attach"`/`"archive"`
  land on the existing label/button/archive-button themselves — no new
  wrapping element, so `.kind-bar`'s internal flex layout (and every
  existing check that measures it) is untouched.
- **Tags**: `renderTagEditor()`/`tagKey()`/`rmTag()`/`addTag()`/
  `tagInputChanged()`/`showTagSuggest()`/`_pickTagSuggestion()`/
  `hideTagSuggest()`/`_tagSuggestPlace()` all gain a `host` parameter — one
  implementation, not a second copy, per the issue. Falsy/omitted `host`
  reads and writes `ST.etags` exactly as before (Single/Pane 3's editing
  scratch, applied to `a.tags` on save); a Multi window passes its own note
  id, and every mutation writes straight to `a.tags` and calls `persist()`
  immediately — a float window has no editing scratch the way Pane 3 does
  (title and content already commit straight to the note), and a tag is a
  discrete action (an Enter, a `×`), not continuous typing, so there is no
  debounce worth having. Every handler now takes the actual clicked/typed
  element (`this`, `this.closest('.tag-editor')` — the pattern kindBarHTML's
  own chips already used) instead of a fixed id, because there can be MORE
  than one mount for the same host at once: a phone's `+` menu still carries
  its own tag row (kept working, v04.27) at the same time as this round's
  new strip. Every mutation repaints every mount for that host
  (`.tag-editor[data-tag-host="…"]`) and refocuses only the one that was
  actually typed in. The two pre-existing mounts (the tablet/desktop
  `.p3h-tag-bar` row and the phone `+` menu's row) keep their literal
  `id="tag-editor"`/`id="tag-inp"` — needed by `6p-01`/`6p-20`'s own
  selectors, and safe now that nothing in this file calls `getElementById`
  on either id any more. Tag chips gain the `🏷` prefix they never carried
  in the editable view (only the read-only one did) — the round's `20d`
  check needs `🏷` to mean exactly one thing, and it is now always "this is
  a tag".
- **Folders**: `_folderChipsHTML(a)` is the one implementation Pane 3's read
  view and `_fwMetaHTML()` used to each build separately; both now call it.
- **Versions**: `_versionStripHTML(a,host)` — falsy `host` is `selArt()`,
  exactly as before. A Multi host hands the WINDOW over to the sibling
  instead: `_fwHandTo(aid,tid)` is `_fwNavigate()`'s existing hand-over logic
  (bring an already-open window forward; otherwise flush-and-close this one,
  hand the target the same frame, reopen) pulled out into its own function
  so the version pills can reuse it for an arbitrary target, not just a
  folder-sibling. `startVersioning(aid,host)` and `addNewVersion(aid,host)`
  also gain the parameter: the first only needed its window's strip
  repainted afterward (`_fwRefreshMeta()`, new — replaces just
  `.pop-meta-strip` in place rather than rebuilding the whole window and
  losing focus); the second used to call `selArt(nv.id)` unconditionally,
  which would have opened the brand-new version in Pane 3 instead of the
  Multi window that created it — a bug this round would otherwise have
  introduced by giving Multi a working version strip for the first time.
- **Date + fields**: unchanged markup (`_dateLineHTML`/`_fieldsPanelHTML`),
  only the position in the strip changes.

**Removed, in the same edit** (a control that moves has to leave where it
moved from): Multi's toolbar `🏷` Note Types button and its bare `📎`
Attach button — both are reached through the strip's Type chip and
`📎 Attach` now, exactly as Pane 3's own formatting row has never carried
either since v04.11; keeping the bare `📎` too was not asked for explicitly,
but leaving it would have meant the same job reachable two ways on Multi and
one way on Single, the opposite of "the same controls" this round is named
for — recorded here as a judgment call, not a literal instruction. Multi's
old `.fw-meta` badge (the finalised/archived text badge and the plain
type-name pills) is gone with it — kindBarHTML's own status/Finish/Reopen
and Archive controls say the same thing now that Multi renders it too.
Single's `🏠` (desktop) and `◀`/`📁` (tablet, from the title row's
`_navBtnsHTML()`) are left out of the modal branch entirely — not hidden by
CSS, simply never built — while normal Pane 3 keeps all three exactly as
before.

**Where the strip sits in Single.** `#p3h` always renders above `#p3c`, so
title+strip move INTO `#p3h` (a brand-new `if(ST.noteModal)` branch inside
`renderP3H()`, returned early, never falling into the normal-Pane-3 code
below it) and `#p3c` is left with only the editor
(`renderP3C()`'s own `if(ST.noteModal)` branch). The formatting-only row
below the strip reuses the EXISTING `.p3h-nav-edit-row`/`.p3h-unified-tb`
markup and `_p3EditIconsHTML()`/`_edColToolbarHTML()` verbatim, so
`_p3FitToolbar()`/`_p3FitEditBar()` — both hard-wired to `#p3h` — keep
folding it exactly as they always have; nothing about HOW it folds changes
this round. Because Multi's toolbar has always carried an unconditional
`💾 Save` and Pane 3's own formatting row only does on the phone (kindBar's
own Save covered tablet/desktop, and kindBar's Save is suppressed in the
strip via `noSave`), the modal branch adds an explicit Save button to the
tablet/desktop formatting row rather than let Save quietly disappear there.
Normal (non-modal) Pane 3 is untouched: its own `.p3h-tag-bar` row is now
also skipped while `ST.noteModal` (defence in depth — the early return above
already means that whole branch never runs in modal mode) but otherwise
nothing in `renderP3H()`/`renderP3C()`'s non-modal path changed.

**CSS**: one new block, `.pop-meta-strip` — plain block stacking, not flex
(`kind-bar` is flex internally regardless of its parent; the tag box's own
`flex:1` is simply inert outside a flex parent, not harmful). `.float-win
.note-dateline`/`.note-dateline-hr`/`.fld-panel` gain `#p3.modal-mode` in
their existing selector list (the v04.54/v04.53 pattern — extend, never
duplicate), so Single's date line and fields panel are sized identically to
Multi's inside the strip rather than falling back to Pane 3's read-view
sizing.

**`⋯` Section tools** was already built for every tier in the desktop
unified-tb (`_edColToolbarHTML()`, toggled by `_edColInit()` on heading
count, same as Multi's own `#fw-col-wrap-<aid>`) — the modal branch keeps
calling it unconditionally in the formatting row at every width, so it is
now provably present on all three tiers rather than relying on whatever the
Architect's desktop measurement had caught.

**Also this round**: replaced v04.54's `(measured in review)` placeholder
and the pre-fix `14/14` with the Architect's PR #76 numbers, in both
`CLAUDE.md` and above.

**Checks: new app-check section `20` (`20a`–`20g`)**, on a note with a type,
two tags, one folder and headings:
- `20a` — at 390/820/1440, the ordered list of *visible* `data-ps` values
  (`title|type|attach|archive|tags|folders|versions|date`) is identical
  between Single and Multi, every one present, `Type` and `Attach` visible
  as text.
- `20b` — in Multi, typing a tag and pressing Enter, then clicking `×` on an
  existing chip, both reach `DB` for that note after the window's flush; the
  same two actions in Single still work.
- `20c` — given a version sibling, clicking the sibling's pill in Multi
  keeps it in the same window (or its successor); Pane 3 never opens, no
  second window is created.
- `20d` — in both pop-ups, no visible button's text is bare `🏷`, and every
  visible element starting with `🏷` is a tag chip.
- `20e` — at 820/1440, inside `#p3.modal-mode`, no visible control calls
  `goHome`/`openP2`/`backFromP3`/`showPane`/`openFolderPop`; normal Pane 3 at
  the same sizes still has `🏠`/`◀`/`📁`.
- `20f` — `⋯` is visible in both pop-ups at 390/820/1440 for a note with
  headings, and a real click opens it.
- `20g` — normal Pane 3's own ordered list of visible control labels at
  1440/820, editing, matches the list recorded from untouched `main` before
  this round's changes — the guard for "normal Pane 3 unchanged".

No pre-existing check was deleted; none needed updating in place — this
round's reordering is scoped to `ST.noteModal`, which no existing check
exercises for these particular rows.

**Measured**
- `ship-check`: **11/11**.
- `app-check --only 20`: **10/10**.
- `app-check --only 6`: **233/233** — the guard for "normal Pane 3
  unchanged".
- **Review fix, by the Architect** (PR #78's builder fix run ended without
  pushing, so this was made on the Architect's branch as PR #79):
  - `kindBarHTML(a,true,…)` returns its children with no `.kind-bar`
    wrapper, so in the strip `Type`, the chip, `📎 Attach` and `📦` were
    block elements on four lines. The strip measured ~310px from title to
    toolbar on a phone.
  - Each strip row is now a `.pop-row` flex row: Type · chip · Attach · 📦
    on one, the tag box on the next, folders and versions sharing one, the
    date last. `data-ps` order is unchanged, so `20a` is untouched.
  - One inset, 14px from the pop-up's edge, for every row and the title
    in both pop-ups:
    - Multi's `.fw-ti` trades its 10px text padding for a 14px margin;
    - Single's `#p3h` is pinned at 14px in modal mode (12px at phone
      width otherwise), and its title bar's own 10px goes;
    - the rows' inner paddings (`.fw-fols`, `.ver-strip`, the date line)
      are zeroed inside the strip.
  - Title to formatting row, measured: phone 183/144px, tablet 179/144px,
    desktop 142/126px (Single/Multi), all under the 190px bound.
  - New checks `20h` (Type · Attach · 📦 on one row, folders · versions on
    one row; by vertical centre ±6px, since the `Type` label is 9px text
    beside a 26px chip), `20i` (title → toolbar ≤190px) and `20j` (every
    row starts at the same inset within a pop-up, ±2px, and the same
    between Multi and Single). All three run at 390/820/1440 in both
    pop-ups: 21 checks. On the first cut's `index.html` 15 fail. The 6
    that pass are the per-pop-up inset checks: the first cut had no
    `.pop-row`s, so there was only the title to compare. The
    between-pop-ups inset check does catch it.
- Full `app-check`: **457/457 app checks, twice in a row**. Unpatched (this round's `tools/` against
  v04.54's `index.html`): **428/439, all 11 failures in section 20** (aborted blocks run fewer checks, hence the smaller total).

## v04.56 — tags and folders lost on backgrounding before a save (I1) (23 Sep 2026)

Issue #80, ahead of pop-ups round (c2) because it is a data-loss fix. Found by
the Architect in review of v04.55, reproduced unchanged on v04.54 too, so this
had been live since well before either round.

**The defect.** `ST.etags` and `ST.efolders` are staged copies of a note's
tags and folder assignment while it is being edited in Pane 3 (Single *is*
Pane 3) — the tag box and 📎 Attach → Folder both write to `ST`, not to the
note, exactly like `ST.etitle` does for the title. Only `saveArt()` ever
committed them (`a.tags=ST.etags; a.folderIds=ST.efolders`). Every OTHER exit
from editing — the autosave tick, `_flushEd()` itself,
`_flushEverythingOut()` (what `pagehide`/`visibilitychange` call when the app
is backgrounded or the OS kills it), and `cancelEdit()` (the phone's "✕ Stop
editing — everything you typed is already saved") — committed content and
title only. Putting the app away mid-edit, which is the ordinary way a phone
session ends, kept the typed text and silently dropped a tag or folder change
made in the same session. Multi was not affected: its tag box (v04.55) writes
straight to the note.

**The fix — a baseline, not a blind commit.** `_flushEd()` now commits
`ST.etags`/`ST.efolders` too, but only the ones actually touched in THIS
editing session, never blindly copying the field over: `_seedEditBaseline(aid)`
snapshots both fields the moment editing begins, and `_flushEd()` diffs the
live value against that snapshot. A field that still matches its baseline is
left alone — this is what keeps a merged remote change safe (I2): if another
device changes this note's tags while it is open here and the tag box was
never touched, the baseline still matches, so the flush does not write the
stale local snapshot back over the newer merged value. A field that differs
is committed, and the baseline moves to what was just written, so the next
flush is a true no-op again. `_seedEditBaseline()` is called everywhere
`ST.etags`/`ST.efolders` is seeded for an editing session — `startEdit()` and
every note-creation path that opens straight into edit
(`newJournalEntry`/`mkArtTitleOnly`/`quickJournalEntry`/`newFavEntry`/
`newContact`/`_calNewNote`/`_calNewJournal`/`mkArt`). If the baseline was
somehow never seeded for the article being flushed (a missed seed site would
be a bug elsewhere), `_flushEd()` treats that as "nothing touched" and just
establishes the baseline, rather than risk overwriting a value it has no
basis to compare.

`cancelEdit()` now calls `_flushEd()` before dropping `ST.editing` — it
previously did nothing at all, trusting autosave to have already saved
everything, which was true for content and false for tags/folders.
`_flushEverythingOut()` → `_flushAllEditors()` → `_flushEd()` and
`closeNoteModal()` → `_flushEd()` needed no changes beyond `_flushEd()`
itself, since both already called it.

**Two existing external writers needed the same baseline courtesy.**
`pkMoveNote()` (drag a note to a different folder) and `pkDelete()` (delete a
folder) each already write `a.folderIds` directly AND sync the live
`ST.efolders` draft so an open editor doesn't go stale — but under the new
baseline model, leaving the baseline behind would make the next flush think
the user had touched folders in the editor, re-committing the same value and
re-stamping `updatedAt` for nothing (a phantom stamp is exactly what
`mergeDB`'s newest-wins rule makes dangerous — see the v03.92.01/v03.95
lessons this round extends). Both now move `ST.efoldersBaseline` in step with
`ST.efolders`, since the underlying `a.folderIds` write already committed the
same value moments earlier.

**Other `ST.e*` fields checked.** `ST.etitle` was already handled by
`_flushEd()`. `ST.ebGroup` exists but is UI state (which edit-bar popover
group is open), not a staged note field. Nothing else under `ST.e*` stages
part of a note. Two adjacent, pre-existing gaps were found and left alone as
out of this round's scope, both narrower than the reported defect and neither
a regression from this fix: `quickJournalEntry`/`newFavEntry`/`newContact`/
`mkArt` seed `ST.efolders` but never reset `ST.etags` to the new note's own
tags, so the tag box can show a stale carry-over from whichever note was
edited previously until `startEdit()` runs again (a display issue — the
baseline design means a flush still can't write that stale value over the new
note's real tags, since editing never actually happens without the box
having been touched); and `imgAttachTag()` / the image context menu's
"🏷 Attach tag to this note" write straight to `a.tags` while the same note
may be open for editing, which — like `saveArt()`'s own unconditional
overwrite, unchanged this round — can still be overwritten by a later save
in the editor. Both pre-date this round.

**Review fix (same round, before merge): `saveArt()` had the identical
defect, one step later.** The instruction for the first cut was "`saveArt()`'s
own behaviour does not change" — wrong, and it left the baseline's I2
protection undone the moment a note was actually closed. `saveArt()` still
did `a.folderIds=ST.efolders; a.tags=ST.etags` unconditionally, and unlike
`_flushEd()` it runs on **every** exit from a note, since `selArt()` calls it.
Measured on the pre-fix branch: seed `a1`, start editing, let a merged remote
change land directly on `DB.articles.a1` (`tags:['seed','remote']`,
`folderIds:['f1','f2']`), run `_flushEd()` — the remote change survives, as
21e proves — then run `saveArt()`, which is what actually happens when the
note is closed — and the remote change is gone, back to `['seed']`/`['f1']`.
A tag added on the phone while the laptop has the same note open is deleted
the moment the laptop leaves the note. That is I2, and it is data loss (I1).

The fix pulls the baseline-diff logic in `_flushEd()` out into one shared
`_commitEditedFields(a)` — the single place, now, that decides whether
`ST.etags`/`ST.efolders` were touched this session and, if so, writes them
and moves the baseline. `_flushEd()` and `saveArt()` both call it instead of
each writing the unconditional overwrite; a field left untouched this session
is left exactly as it stood (including a value a merge wrote into it since
editing began), and only a field actually written by the helper counts toward
`saveArt()`'s existing `_changed`/`updatedAt` gate (v03.95) — a merge nobody
touched here no longer fools `saveArt()` into re-stamping `updatedAt` either.

**This is still whole-field, last-writer-wins per field — no per-tag merge.**
If the SAME field is touched here (say, the tag box gets a new tag added) while
a remote change to that same field also lands mid-session, the local session's
whole tag list wins on save, exactly as the tag box has always behaved; only a
field genuinely untouched in this session is protected from being overwritten.
Two devices editing the SAME field concurrently is not something this fix (or
`_flushEd()`'s) attempts to reconcile down to individual tags.

**Checks: new app-check section `21` (`21a`–`21h`)**, at 390 and 1440:
- `21a` — start editing `a1`, add a tag through the real input (via the `+`
  menu at 390) and type text; fire `visibilitychange`→hidden and `pagehide`,
  reload with the same IndexedDB context — the note has both the tag and the
  text. Repeated for removing a tag with its `×`.
- `21b` — the same, adding a folder through the real 📎 Attach → Folder menu.
- `21c` — at 390, add a tag, tap the real "✕ Stop editing" button, `DB` has
  the tag.
- `21d` — at 1440, in Single, add a tag, close with the frame's ✕, `DB` has
  the tag.
- `21e` — start editing `a1`, don't touch tags, set
  `DB.articles[a1].tags=['seed','remote']` directly (simulating a merged
  remote change), run `_flushEd()` then `_flushEverythingOut()` — `DB` still
  has `remote`, `updatedAt` was not re-stamped.
- `21f` — start editing, change nothing, run `_flushEd()` twice, `updatedAt`
  is unchanged.
- `21g` (review fix) — the reproduction above: a merged remote change to both
  fields, untouched here, survives `_flushEd()` **and then `saveArt()`**, with
  `updatedAt` unstamped by either.
- `21h` (review fix) — the positive case: a tag added through the real input
  this session still wins whole-field on `saveArt()`, even though the same
  note picked up an untouched remote change to both fields in the meantime;
  the untouched folder field is left alone.

**Standing lesson added to `CLAUDE.md`** (and the v04.51 five-rounds entry
dropped to make room): a field staged in `ST` is a field autosave does not
know about unless it is told.

**Measured**
- `ship-check`: **11/11**.
- `app-check --only 21`: **18/18** (12 first cut + 6 from the review fix).
- `app-check --only 16`: **30/30**.
- Full `app-check`, measured by the Architect in review: **475/475, twice in a
  row**. Unpatched (v04.56's `tools/` against v04.55's `index.html`):
  **462/475, 13 failures, all in section 21**.

---

## v04.57 — 23 September 2026 · pop-ups made alike, round (c2): one
formatting row, same buttons, same order, one line at every size

Round (c2) of "make the two pop-ups (Multi and Single) look and work the
same" — (a) v04.53 the note's content, (b) v04.54 the frame, (c1) v04.55 the
metadata strip, v04.56 an I1 fix. This round is the **formatting button row**
under the strip. Normal Pane 3 does not change — `20g` guards its exact
editing control list and passes unchanged.

**Measured on `main` at v04.56** (the issue's own table): Single's row was
built by `_p3EditIconsHTML()` wrapped in `.p3h-nav-edit-row` (phone/tablet,
right-aligned via `.nav-r`) or `.p3h-unified-tb` (desktop, left-aligned) —
already in the right ORDER (`Aa H ≡ + ↺ 📋 🔍 ⋯ 💾 Save`) at every size except
the phone, where 💾 Save landed before ⋯ instead of after it. Multi's own
`.fw-tb` had ⋯ Section tools BEFORE 📋 Template and 🔍 Find (wrong order,
every size), wrapped to two rows on a phone (nothing folded there the way
Pane 3's own phone bar does), and its own 8px inset never matched the strip's
14px (v04.55) above it.

**One builder, both pop-ups.** `_popFormatRowHTML(host,curA)` — host falsy is
Single (wraps `_p3EditIconsHTML(curA,true)`, the SAME function normal Pane 3
uses, with a new `noSave` param so the row can place its own 💾 Save once, at
the very end, rather than `_p3EditIconsHTML`'s own phone-only inline Save
landing before ⋯); a Multi window's aid renders the new `_fwEditIconsHTML(aid)`
instead — Multi's own group buttons, Template and Find, keyed to that
window's `_fwTogGroup`/`#fw-eb-pop` the way Single's are keyed to
`togEBGroup`/`#eb-pop`. Both branches then get `_edColToolbarHTML(host)` (⋯,
now parameterised the same way instead of a hand-copied literal inside
`_fwRenderBody`) and one 💾 Save, always last. `_p3EditIconsHTML`'s and
`_edColToolbarHTML`'s existing no-argument call sites — normal Pane 3's own —
are untouched, byte-identical output (the two new params default to falsy).
Multi's `_fwRenderBody()` and Single's modal branch in `renderP3H()` both
call `_popFormatRowHTML()` now instead of building the row inline.

**Phone folding, both pop-ups.** `_p3OneBar()` drops the History group from
the row (`Aa H ≡ +` only) and folds Undo/Redo/History/Find into `≡` and
Template into `+`, exactly as Pane 3's own phone bar already did — now via
one shared function, `_ebFoldedHistHTML(aid)`, called from both Pane 3's
`_buildEBSub('lists')` (aid falsy, byte-identical output to what was
hand-written there before) and Multi's new `_fwBuildEBSub('lists')` phone
branch (aid set, `_fwEc`/`openNoteHistory(aid)`/`_ntFindToggle(aid)`).
Multi's `insert` group is now `_ebInsertHTML(_p3OneBar())` — Pane 3's own
`_EB_INSERT` table — rather than a second hand-written array: every one of
Multi's six insert buttons already called the exact same host-generic
handler Pane 3's `+` menu does (`edImgPick`/`edLink`/`edBookmarkBtn`/
`edMentionBtn`/`openQuickPhrasesMenu`/`insertSheet` all resolve `_edActive()`
themselves), so the two lists could only ever drift, never actually differ.
Labelled, and carrying 📋 Template, only once the row itself has folded to
the phone shape — a laptop still reaches Template through its own toolbar
button.

**One line, same inset, every size.** `.pop-fmt-row` — a second class both
rows now carry alongside their existing one (`.fw-tb` for Multi, `.p3h-
unified-tb` for Single, now rendered unconditionally in modal mode instead of
switching to `.p3h-nav-edit-row` under 1200px) — sets `flex-wrap:nowrap` and
a 14px inset matching the strip above it (Multi's own padding; Single's
zeroed out, relying on `#p3h`'s existing 14px the way the strip already
does), with 💾 Save pushed to the row's right end via `margin-left:auto`.
Keeping the legacy class names means section 20's existing geometry checks
(`20h`–`20j`, which already query `.fw-tb` / `.p3h-unified-tb, .p3h-nav-edit-
row`) needed no changes. Every control is ≥38px tall under 1200px
(`.pop-fmt-row .et,.pop-fmt-row .eb-grp-btn{min-height:38px}`).

**Also this round**

- **Single's version pills stay in edit mode.** `_versionStripHTML(a,host)`'s
  pill click was `selArt('${v.id}')` for Single, which sets `ST.editing=false`
  — dropping the pop-up to the read view mid-edit, found in the v04.55
  review. Since v04.54 ("Single never leaves it any more") Single is always
  in edit mode once open, so the fix is unconditional there:
  `ST.noteModal?` `` `selArt('${v.id}');startEdit()` `` `:` `` `selArt('${v.id}')` ``
  — the same `selArt()` then `startEdit()` pair `_panelNavigate()` already
  uses for `‹ ›`. Normal Pane 3's own read-view version strip (`ST.noteModal`
  false there) is unaffected.
- **v04.56's review totals recorded** in `CHANGELOG.md` and `CLAUDE.md` (see
  above): full `app-check` 475/475 twice in a row; unpatched 462/475, 13
  failures, all in section 21.

**Checks: new app-check section `22` (`22a`–`22e`)**, at 360/390/820/1440
except where noted:
- `22a` — the ordered, visible `data-tb` list on the row is identical in
  Single and Multi at every size, and matches the order the issue specified
  for that size.
- `22b` — all visible row controls share one line (vertical centres within
  ±6px); the row's first control's left edge equals the strip's inset (±2px);
  💾 Save is the rightmost control; nothing is clipped
  (`scrollWidth<=clientWidth`); every control is ≥38px tall under 1200px.
- `22c` — at 390, in both pop-ups: a real click on `≡` shows named Undo/
  Redo/Find rows and a real click on Find opens that window's own find bar;
  a real click on `+` shows a named Template row; a real click on Undo after
  typing reverts the typing in that window's own editor.
- `22d` — every action reachable from the 1440 row is reachable from the 390
  row or its menus, in both pop-ups (same `onclick`/`onmousedown` target
  function).
- `22e` — give `a1` a version sibling, open Single, click the sibling's pill
  with a real click — `ST.noteModal` is still true, `ST.article` is the
  sibling, `ST.editing` is true, `#ed` holds the sibling's content.
- **Guard**: `20g` (normal Pane 3's editing control list) passes unchanged.

**Measured**
- `ship-check`: **11/11**.
- `app-check --only 22`: **18/18**.
- `app-check --only 20`: **31/31**.
- `app-check --only 6`: **233/233**.
- Full `app-check`, measured in review: **493/493, twice in a row**. Unpatched
  (v04.57's `tools/` against v04.56's `index.html`): **475/491, all 16
  failures in section 22**.

---

## v04.58 — note titles taken out of the public app file (23 Sep 2026)

Built by the Architect directly. No behaviour change.

**What was found.** The builder found this while working on v04.57 (PR #83)
and flagged it rather than touching it. `index.html`'s last line was not
source. It was debris from a **running page** whose DOM had been saved over
the file, and it had been there since PR #9 on 4 Sep. It contained:

- `#tab-picker` already filled with four real note titles and their folder
  names from the owner's notebook;
- two Firebase auth iframes;
- `#id-recall-widget-root`, a browser extension's widget;
- stale copies of `#nti-picker`, `#jrn-picker` and `#eb-pop`, carrying the
  same ids the app itself uses.

A third auth iframe sat at the start of line 24015, glued to the front of
the genuine `<style id="mywall-style">`. The site serves this file
publicly.

**Why removing it is safe.** Every element in it is one the app builds on
demand:

- `#tab-picker` in `openTabPicker()`;
- `#nti-picker` and `#jrn-picker` via `createElement` when absent;
- `#eb-pop` via `_openFloatPop()`;
- the iframes by Firebase itself.

Nothing in the source reads them before creating them. `<script id="nd">`
is untouched (I7).

**Changed.**

- The last line becomes `</body></html>`.
- The iframe before `mywall-style` is removed, and the style block stays.
- New `ship-check` check 6 (so ship-check is now 12 checks): *index.html
  carries no markup captured from a running page*. It flags:
  - an `ng-non-bindable` iframe;
  - a Firebase auth iframe URL;
  - the extension root;
  - a tab-picker row calling `addToTabPicker('<literal id>')`. The source
    only ever writes `${a.id}`.

  Run against v04.57's file, it fails and names all four.

**Not done, and why.**

- The same debris is in `legacy/v03.99/index.html`. That build is sealed
  (I6), and changing it is the owner's decision, which is already waiting
  on the status issue.
- Every earlier commit of `index.html` in git history still contains it.
  Removing it from history is a rewrite (destructive, owner's decision).
- The Firebase web API key in the iframe URLs is public by design. The
  notebook's real protection is the Firestore security rules, already the
  top item waiting on the owner.

**Measured**
- `ship-check`: **12/12**; the new check fails on v04.57's `index.html`.
- Full `app-check`: **493/493 app checks, twice in a row** (unchanged from v04.57 — no app behaviour changed).

---

## v04.59 — pop-ups made alike, round (d1): the Sidepane and Contents panels, same side and same place (23 Sep 2026)

Issue #85, round (d1) of "make the two pop-ups (Multi and Single) look and
work the same". Merged so far: (a) v04.53 content, (b) v04.54 frame, (c1)
v04.55 strip, (c2) v04.57 formatting row. This round is the two side
panels — 📌 Sidepane (`_pinPanelInject()`) and Contents (`_tocInject()`).
The tab bar inside Single was explicitly out of scope (round d2's own
question).

**Measured on `main` at v04.58, seed note `a1`.** Single's Sidepane sat on
the **left** (opposite `DB.theme.tocSide`, default right) whether or not
Contents was showing, and started **below the formatting row**, beside the
note body only. Multi's sat on the **right** whenever Contents was hidden
but flipped to the opposite side of Contents the instant a note gained its
third heading — because float mode's rule was "opposite Contents while
Contents is actually drawn, else plain right", not the modal's stable
"opposite the *configured* side, always". Multi's panel also started
**directly under the frame**, overlapping the title, metadata strip and
formatting row, because its top was measured from `.fw-hd` alone. And Multi
had **no way at all** to pin a note into its Sidepane: the empty-state text
said "drag a tab here (or tap 📌 on a tab)", and Multi has never had a tab
bar.

**One side rule, both pop-ups — `_popPanelSides()`.** Contents sits on
`DB.theme.tocSide`; the Sidepane sits on the opposite side, whether or not
Contents is currently showing — the stable rule Single already had. Float
mode's old "opposite Contents only while it's drawn, else right" special
case is gone, so a Multi window's Sidepane can no longer swing sides
mid-session just because a note crossed the 3-heading threshold that shows
Contents. `pinPanelPos==='below'` (Sidepane stacked under Contents, same
side) now applies in float mode too — it was modal-only before.

**One vertical placement, both pop-ups — `_popPanelTop(host,inModal)`.**
Modal already measured its own header stack (frame + `#p3h` + tab bar);
float mode now measures the analogous stack inside a window — `.fw-hd` +
`.fw-ti` + `.pop-meta-strip` + `.fw-tb.pop-fmt-row` — instead of `.fw-hd`
alone. Both `_tocInject()` and `_pinPanelInject()` call the one function,
so the two panels can never disagree about where "below the formatting
row" is again.

**The title/strip/formatting row keep the window's full width in Multi.**
`_fwSyncBodyPadding()` used to pad `.fw-body` — every child, including the
rows drawn above the editor — so a side panel squeezed the whole column
down to its own width. `_fwRenderBody()` now wraps the find bar and editor
in their own `.fw-editarea`, and only that gets padded, mirroring how
Single's padding has always landed on `#p3c` and never on `#p3h`.

**Pinning without tabs.** The Sidepane gets a visible `📌 Pin a note…`
button in both pop-ups, opening a searchable note picker. Rather than a
second search, the existing Tab-bar picker (`#tab-picker`/`#tp-list`) is
generalised: `_openNotePicker(btn,mode,title)` and `renderTabPickerList()`
now branch on a `mode` ('tab' or 'pin') for which notes are excluded and
what a click does (`addToTabPicker`/`addToPinPicker`, the latter calling
the existing `pinTabToPanel()`) — one markup, one search, two doors in.
The empty-state text is now true in both: Multi's never mentions tabs
(it has none); Single's still offers drag-a-tab and tap-📌-on-a-tab
alongside the new button.

**Phone reachability (D5).** Neither pop-up draws a side panel on a phone
(unchanged, v04.34), so `📌 Pin a note…` also rides the `⋯` Section tools
menu — already open at every tier in both pop-ups — as a new "Sidepane"
group. Guarded to popup contexts only (`aid` truthy for Multi, or
`ST.noteModal` for Single) so normal (non-modal) Pane 3's own `⋯` menu,
which has no Sidepane to reach, is untouched — `20g`'s control-list guard
does not scan `#edcol-pop` at all, so this needed no change there, but the
guard on the row itself keeps normal Pane 3's *behaviour* unchanged too.

**Normal Pane 3 unaffected.** It never hosts either side panel
(`_pinHostEl()`/`_tocHostEl()` return non-null only in modal mode or with a
focused float window), so its own Contents/Sidepane behaviour, if any, did
not change.

**Also this round, found while testing 23c.** The Sidepane's own ⬇/◫
toggle (`_pinPanelToggleSide()`) compared the stored `DB.theme.pinPanelPos`
against the literal string `'side'` — but the value starts `undefined`, so
the very first click ever made on a fresh notebook wrote `'side'` over
`'side'`, a silent no-op the button's own tooltip ("Move below Contents")
promised would move the panel. Every click after the first alternated
correctly; pre-existing on `main`, not introduced by this round, but it sat
directly under the toggle this round's issue asked to verify works in
both pop-ups, so it is fixed here rather than left for the check to paper
over: the comparison now goes through `_popPanelSides()`'s own default the
same way everything else that reads `pos` already does.

**New app-check section 23** (`23a`–`23f`): the Sidepane's side is
identical in Single and Multi and stable across a 2-heading vs 3-heading
note, and opposite Contents with no overlap when Contents shows; both
panels start at/below the formatting row's bottom edge, and in Multi the
row's width still equals the strip's; a real click on Contents' side
toggle and the Sidepane's own ⬇/◫ toggle move both panels in both
pop-ups; a real click on `📌 Pin a note…`, search, pick `a2` reaches
`DB.theme.pinTabIds` and shows its card, in both pop-ups; Multi's empty
Sidepane text never mentions tabs; at 390px neither pop-up draws a side
panel and `📌 Pin a note…` is still reachable via `⋯`. Guard: `20g`
passes unchanged.

**Not done, and why.** A pre-existing, unrelated finding: `index.html`'s
static `#tab-bar` markup still carries real, baked-in note titles and ids
(`data-tid`, `pinTabToPanel(...)`, `tabSelect(...)`) — the same class of
bug v04.58 removed, in a place its new ship-check guard does not look
(that guard only matches `addToTabPicker('<id>')` rows, not the tab bar's
own persisted DOM). This round's issue explicitly said not to touch the
tab bar inside Single, so it was flagged to the Architect/owner instead of
fixed here.

**Measured**
- `ship-check`: **12/12**.
- `app-check --only 23`: **11/11**.
- `app-check --only 20`: **31/31**.
- `app-check --only 6p`: **104/104**.
- Extra self-check, since `.fw-editarea` touches shared structure the find
  bar and the phone's folded `≡`/`+` menus depend on: `app-check --only
  22`: **18/18**.
- Full `app-check`, measured in review: **504/504, twice in a row**. Unpatched
  (v04.59's `tools/` against v04.58's `index.html`): **493/504, all 11
  failures in section 23**.

---

## v04.60 — the last note titles out of the public file; Contents without heading chrome (23 Sep 2026)

Built by the Architect directly.

**The part v04.58 missed.** v04.58 removed the live-page debris it had
been shown: the tab *picker* filled with note titles, the auth iframes
and the extension root. The v04.59 builder then found that the static
`#tab-bar` right beside it still held **two real note titles** ("Jumu'a
Khutbah - TEMPLATE", "Siyagah FINETUNING") as fully rendered chips, with
their ids in `data-tid`, `tabSelect()`, `pinTabToPanel()` and the other
chip handlers. `#ctx` also carried a real `data-aid`. It is the same
serialized session, in a place v04.58's named patterns did not look.

**Changed.**

- The static `#tab-bar` is now empty: no chips, no `has-tabs` class, no
  inline `display`, and its drag/drop handlers kept. `renderTabBar()`
  rebuilds it completely on the first render, because `bar._sig` starts
  undefined, so nothing depends on the static content.
- `#ctx` loses the `data-aid` attribute.
- The remaining static markup (everything outside `<script>` and
  `<style>`) was scanned in full for literal note ids and note text:
  nothing else was found, and the sidebar, list and note panes are empty.
- ship-check check 6 now also fails on any literal note id in a
  `data-tid`/`data-aid`, and on a tab-bar handler (`tabSelect`,
  `pinTabToPanel`, `closeTab`, `closeTabGroup`, `openTabClrPicker`,
  `pinTabDStart`) called with a literal id. The source only ever
  interpolates one. It fails on v04.59's file.
- **Contents entries read the heading's words.** `_tocScan()` took
  `el.textContent`. In an editor, `_edColInit()` puts a `⠿` grip and a `▼`
  arrow at the front of every h1–h4, so Single's Contents read `⠿▼One`.
  Multi's happened to be built before its chrome arrived. `_tocScan()` now
  reads a clone with `.ed-col-grip`, `.ed-col-arr` and `.ed-col-preview`
  removed. This was pre-existing, and found in the v04.59 review.
- New app-check `24a` in both pop-ups: Contents lists `One`, `Two`, `Three`
  exactly. On v04.59's `index.html`, Single fails and Multi passes.

**Not done, and why:** as in v04.58, the same markup in
`legacy/v03.99/index.html` (sealed, I6) and in git history is the owner's
decision.

**Measured**
- `ship-check`: **12/12**; check 6 fails on v04.59's `index.html`.
- Full `app-check`: **506/506 app checks, twice in a row**.

---

## v04.61 — spreadsheet round 2a: drag-to-fill handle, frozen top row, cell borders (24 Sep 2026)

Issue #88, round 2a of the spreadsheet backlog the owner approved on 23 Sep
2026 (round 1 shipped as v04.52; round 2b — merged cells, colour rules,
filters — and round 2c come later). Everything lives in `_sgMount()` and its
neighbours (`index.html`, from about line 23274).

**Drag-to-fill handle.** A small green square sits at the bottom-right
corner of the current selection, in edit mode only — hidden while a cell is
being typed in and while a whole row/column is selected from the headers.
Dragging it down or right (up/left do nothing this round) shows a dashed
preview along whichever axis moved further, and releasing fills that range,
one `snap()` for the whole drag so one Ctrl+Z undoes it all. What fills is
decided **per column when filling down, per row when filling right**, most
specific rule first: a formula shifts relatively (`SGE.shiftF`, exactly as
Fill down already does); a `fmt:'date'` line steps by the date's own gap (or
one day for a single cell), writing back in the source's own raw form
(`dd/mm/yyyy` or `yyyy-mm-dd`); text ending in a whole number
(`Item 1`, `Week 09`) counts up, keeping zero-padding; two or more plain
numbers extend a linear series; anything else (including a single plain
number or plain text cell) copies, which for a multi-cell source means the
whole block's pattern repeats (`a, b` → `a, b, a, b`). Formatting (`b`, `i`,
`al`, `fmt`, `bg`, `bd`) rides along with its source cell. It only fills
within the table's existing rows/columns — no auto-growing — and
auto-scrolls `.sg-gw` near its edges while dragging.

Input is pointer events (`pointerdown`/`pointermove`/`pointerup`) on a
dedicated handle element, not the existing `mousedown` selection path, with
`touch-action:none` and `setPointerCapture` so a drag that leaves the grid
still ends cleanly. The touch hit box (invisible padding around the visible
square) is sized per tier in JS — 32×32px on phone and tablet (both
touch-first breakpoints), 12×12px minimum on a mouse-first laptop, where the
visible square itself is smaller (~12px / ~7px) — and is anchored at the
selection's own corner point so it does not cover the active cell's body; a
tap on an already-selected cell still starts editing.

**A real bug found while building this, not shipping it**: the first cut of
the "text ending in a whole number" rule matched a *plain* number too — the
regex `/^(.*?)(\d+)$/` matches `"7"` with an empty prefix — so a single cell
holding `7` (which the spec says must be **copied**) was instead incrementing
by 1 every row. Excluding anything `SGE.literal()` already reads as a number
fixed it. Caught by a manual smoke test before any check was written; see
*Standing lessons* in `CLAUDE.md` — this is the same shape as the trap that
guidance describes elsewhere: two rules whose match sets weren't actually
disjoint.

**Freeze top row.** A new toolbar button, `❄ Freeze top row`, glyph plus
word (`CLAUDE.md`: a bare glyph is not a label; `❄` was not already used for
anything else). Stored as `frz: 1` on the sheet state (`0`/absent means not
frozen) — a **number**, not a boolean, so more rows can be frozen later with
no migration. While on, row 1 sticks just under the header row
(`position:sticky;top:27px`, the same `hh` constant `scrollIntoCell()`
already used) with a heavier rule under it, in both edit and read view (the
grid markup and CSS are shared between them, so no special-casing was
needed) — the static snapshot does not need to show it, and doesn't.
Stacking order: row 1's own row-number cell and the corner already sit at
z-index 4 and 2 respectively; row 1's cells get z-index 1 so they paint over
rows scrolling up underneath, and its row header keeps the corner's z-index
4. `scrollIntoCell()`'s hard-coded header-height guard (`hh=27`) now doubles
when frozen and the target row isn't row 1 itself, so arrowing up into row 2
no longer leaves it hidden under the frozen row. Toggling is undoable
(`snap()` before flipping); inserting or deleting rows never touches `frz`.

**Cell borders.** A new toolbar button, `Borders ▾`, opening the existing
`openMenu()` with seven worded items (All/Outside/Top/Bottom/Left/Right/No
borders). Stored per cell as `bd`, a string of the letters `t`/`b`/`l`/`r`
(`"tb"`, corners get two letters under *Outside borders*). Drawn with real
CSS border properties on specific sides (`.sg-bt`/`.sg-bb`/`.sg-bl`/`.sg-br`,
`var(--t1)`), **never `box-shadow`** — `.sg-act`'s ring and the `.sg-rf0`–`4`
formula-reference highlights are already inset box-shadows on the same
cells, and a border painted the same way would fight them for the layer.
Both keep showing correctly on a bordered cell, because they're different
CSS properties now. `_sgStaticHTML()` (the snapshot Save File, search, Pane
2 and an older build all read) writes `bd` as inline `border-*` styles.
Borders move with their cells through sort, copy/paste, cut, fill (both the
existing button and the new handle) and row/column insert/delete for free —
`bd` is just another key on the cell object, and every one of those paths
already clones or rekeys the whole object rather than naming properties.
Measured, not assumed: `rekey()`, `copyCell()`, `doCopy()`/`doPaste()` and
`sortBy()` all already clone the full cell object; nothing there named
`raw`/`b`/`i`/`al`/`fmt`/`bg` explicitly.

**Forward compatibility: `tidy()` stopped throwing keys away.** `tidy()`
used to delete a cell unless it had one of six named properties — the same
allow-list shape `CLAUDE.md` already has a standing lesson about
(`mergeDB()`'s `DB.theme` key). A cell holding only the new `bd` would have
been silently deleted on the next edit, and so would every property 2b/2c
add later. `tidy()` and `_sgStaticHTML()`'s used-range scan (`if(o&&(o.raw||
o.bg))`, which had the same fault — a bordered empty cell at the edge of the
sheet fell outside the snapshot) now both call one new function,
`_sgCellHasContent(o)`, that asks "does this cell have ANY truthy property",
naming none of them. Swept the rest of `_sgMount` for the same shape:
`refresh()`'s class list (`sg-bo`/`sg-it`) and `_sgStaticHTML()`'s inline
style list already had to name `b`/`i`/`al`/`fmt`/`bg` one at a time because
each maps to a *different* CSS treatment — that part can't be generalised
away, and `bd`'s four class/style lines were added alongside them, not
instead of a shared list. `setProp()`/`copyCell()`/`rekey()`/`doCopy()`/
`doPaste()`/`sortBy()` were already generic (they read/write a whole cell
object, not named fields) and needed no change.

**Layouts (D5).** The sheet's own toolbar (`.sg-tb`) scrolled sideways
(`overflow-x:auto`) at every size. That is right for the phone, and the phone
keeps it. It was wrong from 640px up: measured at 1440, it was 1221px of
controls in a 604px strip, so `❄ Freeze top row`, `Borders ▾`, `Fill down`,
`ƒx Functions` and `Remove` sat past a thin scrollbar that a Mac trackpad does
not even draw. **From 640px up the toolbar now wraps** (added in the
Architect's review, below). The fill handle's hit-box sizing (above) also
differs by size. The `Borders ▾` menu reuses `openMenu()`, which already
clamps itself inside the viewport. **Both pop-ups**: `_sgMount()` is the same
code regardless of host (`#ed` in Single, `.fw-ed-<id>` in Multi), so all
three features work in Multi with no integration work. That is proved in
app-check `25f`, not assumed.

**Not done, and why:**
- **Dragging the fill handle up or left does nothing** — the issue scoped
  this round to down/right only, matching Excel's own primary direction.
- A device still on v04.52–v04.60 that edits a sheet with a border-only cell
  will drop that cell's border on save, because its `tidy()` is still the
  six-name allow-list. The service worker update (I3) is what closes this
  for that device; nothing was built for it here, per the issue.
- Round 2b (merged cells, colour rules, filters) and 2c (several sheets,
  CSV, more functions) are out of scope for this round.

**Also:** added the "write the owner's actual words down" bullet to
`ARCHITECT.md`'s *How the owner gives work*, as asked.

**Checks: new section 25, `25a`–`25g`.** Every check drives the real
handle/button/menu with `page.mouse` or a real touch sequence through CDP
`Input.dispatchTouchEvent` in a `hasTouch` context (`tools/harness.mjs`
gained `openApp({hasTouch:true})` and a `touchDrag()` helper for this) —
never the fill/border functions directly and never a synthesized event, per
the `⚙ Backup & Restore` lesson in `CLAUDE.md`.

**Architect review, and what it changed.** The first build measured
**599/599**. Unpatched, v04.60's app with this round's `tools/` scored
**515/529, 14 FAILED**, all in section 25. The review found four faults.
The builder's fix run made all four fixes but ended without pushing, the
same stop `ARCHITECT.md` describes, so the Architect finished the round on
its own branch:
- **Wrong values from a mixed fill.** `fillLine()` shifted formulas only when
  the whole source line was formulas. So `x`, `=A2` repeated as `x, =A2, x,
  =A2` instead of `x, =A4, x, =A6`. Any source cell starting with `=` now
  shifts, whatever the line's mode. New check in `25a`, at both sizes.
- **`25e` could not fail.** It edited a *different* cell and saved, and passed
  on v04.60, because the old `tidy(k)` only ever touched the key being
  written. It was rewritten in place to drive the two losses the allow-list
  really caused:
  - a real **Delete** on a cell holding content and a border (or an unknown
    key) tidied the whole cell away;
  - a bordered empty cell beyond the last value fell outside the saved
    snapshot.

  All four of its new assertions fail on v04.60.
- **The toolbar hid the new buttons at tablet and laptop sizes**, as described
  under *Layouts* above. New `25h`: at 820, at 1440 and in a Multi window at
  1440, every control lies inside the toolbar and it does not scroll; at 390,
  the sideways scroll is kept.
- **The fill handle painted over the sticky header.** At `z-index:7` it
  drew over the column-letter row, the row numbers and the frozen row when the
  selection scrolled under them. It now hides while its centre is behind
  them, re-checked on every scroll of the grid. New `25i`, scrolled with a
  real mouse wheel, with and without a frozen row.

Every new or rewritten assertion was run against the code it guards:
- the `25a` mixed case (×2), `25h` at 820/1440/Multi and `25i` (×2), **7**
  in all, fail on the unfixed #89 build;
- the four new `25e` assertions fail on v04.60;
- `25h`'s phone check passes on both. It is a guard that the phone's
  sideways scroll survives, not a fix.

**Measured**
- `ship-check`: **12/12**.
- `app-check --only 25`: **106/106**.
- Full `app-check`: **612/612, twice in a row**.

---

## v04.62 — batch the cloud sync write, so it doesn't stop at ~7 MB (24 Sep 2026)

Issue #91. `_writeCloudDB()` (`index.html`, from about line 21222) uploads
the whole notebook as one base64 string, cut into 900,000-character chunk
documents (`_SYNC_CHUNK`). Every chunk plus the main doc used to go in ONE
`batch.commit()`. Firestore rejects any single request over 10 MiB, so once
`JSON.stringify(DB)` passed roughly 7.3 MB, every push failed on every
device and cross-device sync stopped outright (I2) — with no size guard
anywhere to say why. The owner's notebook was already ~5.0 MB in v04.50
(images stored inline), about 35% short of that ceiling.

**Scope, per the issue: the write path only.** The stored format does not
change — an older build on another device still reads exactly what this
build writes, the same `notebooks/{id}` main doc `{n, ver, …}` and the same
`chunks/{i}` docs `{p, ver}`. No compression, no per-note documents; both
are later, owner-approved jobs (see *Not done* below).

**The fix.** Chunk documents now go out in as many batches as needed, each
capped at `_SYNC_CHUNK_BATCH = 8` chunks (8 × 900,000 ≈ 7.2 MB of payload,
leaving headroom under the 10 MiB request ceiling for field names and
request overhead) — a named constant with a comment explaining the number,
as asked. The **main doc is written LAST, in its own final batch, only
after every chunk batch has committed**. If any chunk batch throws,
`_writeCloudDB()` never reaches the main-doc batch — the error propagates
exactly as before (the caller's toast/status handling is unchanged), and no
half-written version is ever marked complete. This is what makes the
non-atomic, multi-batch write safe: `_readCloudDB()` already treats a chunk
whose `ver` differs from the main doc's `ver` as torn and retries, so a
reader that catches a write mid-flight just sees the OLD main `ver`, fails
that check, and is fired again once the new main doc lands. The existing
stale-chunk cleanup still runs after the main doc, unchanged. Checked both
existing call sites (`syncNow()` around `:20843`, `_doPush()` around
`:21280`) and the whole file for any other write to the `chunks`
subcollection — both go through `_writeCloudDB()`, and nothing else writes
a chunk.

**A real edge case, found while writing check `26c`, not shipping something
broken because of it.** Firestore batches are atomic *within* a batch but
not *across* batches — that's inherent to splitting one write into several,
not something this round could avoid without changing the chunk-doc format
(out of scope, see below). So if an EARLIER chunk batch of a write already
committed before a LATER batch of the *same* write fails, the low-numbered
chunks it touched now carry the failed write's new `ver`, while the main
doc — never reached — still shows the old `ver`. A read attempted in that
window compares the old main `ver` against those chunks, finds a mismatch
at once, and correctly refuses to reassemble them: it fails safe to
**null**, not to wrong data, but it does not necessarily replay the
previous notebook instantly the way a read racing a write *that goes on to
succeed* does. It recovers the moment the next write — the existing
retry/debounce path already in `_doPush()` — completes. `app-check` `26c`
proves both halves directly: after a forced second-chunk-batch failure,
`_readCloudDB()` never returns anything but the untouched previous notebook
or `null`, and a following successful write fully restores it. Flagged for
the Architect/owner, not fixed here — fixing it for real means the chunk
docs can no longer be blindly overwritten in place (a staged/generation
doc-ID scheme), which changes the stored format and is exactly what this
round was scoped to avoid (see *Not done*).

**Layouts (D5).** No UI changes. Sync behaves the same at every screen
size — nothing in this round touches rendering, only what gets written to
Firestore and in how many requests.

**Checks: new section 26 (`26a`–`26e`)**, in `tools/app-check.mjs`.
Firestore is blocked in the harness (`BLOCKED` in `harness.mjs`), so these
build an in-memory fake with the same shape the app calls —
`collection().doc()`, `.collection('chunks').doc(i)`, `batch()` with
`set`/`delete`/`commit`, `get({source})` — that enforces the same two real
limits (`commit()` rejects over 10 MiB summed, `set()` rejects a single
document over 1 MiB) and records the commit order. `_syncFsDb` is pointed
at the fake and `_writeCloudDB`/`_readCloudDB` are called directly — a
data-path check, not a UI one, since nothing in the UI can produce a 12 MB
note through a click.
- `26a` — a ~12 MB notebook (large inline-image-sized article content)
  writes without error; `_readCloudDB()` of what was written is deep-equal
  to the original (note count, ids, content lengths).
- `26b` — the main doc is committed after every chunk, from the fake's
  commit log; no single commit exceeds 10 MiB.
- `26c` — the fake is made to fail the second chunk batch; see the edge
  case above for exactly what's asserted and why.
- `26d` — a small, single-batch notebook still writes and round-trips, main
  doc still last, exactly one chunk-batch commit plus one main-doc commit.
- `26e` — the stored main doc and chunk docs have exactly the keys the
  current (unchanged) `_readCloudDB()` reads; that same function reassembles
  a batched write with no changes of its own — the proof that the format
  didn't move.

`26a` and `26b` are expected to FAIL on v04.61 — the old code puts every
chunk plus the main doc in one `batch.commit()`, which the fake's 10 MiB
enforcement rejects outright for a 12 MB notebook.

**Not done, and why (owner-approved later rounds, per the issue):**
- No compression and no per-note sync documents — both change the stored
  format, and would also shrink every push (today's every-edit re-uploads
  the whole notebook either way).
- Firestore's 500-writes-per-batch limit is never reached at 8 chunks per
  batch, so no guard was needed for it.
- The `26c` edge case above (a staged/generation chunk-doc scheme so a
  partially-failed write can't touch a still-valid previous chunk) — would
  also change the stored format.

**Architect review, and what it changed.** The builder's run pushed the code
and section 26, then ended during the full `app-check` without opening the PR.
That is the third stop at the same step (v04.42, v04.61, v04.62), so the full
run is now the Architect's alone; see `ARCHITECT.md`. The review found one
design fault:
- **Every write had lost its atomicity, not just the large ones.** The first
  cut split every write into chunk batches plus a separate main-doc batch. So
  even a small notebook, the owner's today, could have a push fail after its
  chunks landed. The main doc then kept the old `ver` while chunk 0 carried
  the new one, and every reader got `null` instead of the previous notebook
  until the next successful push. v04.61 never had that window.
- **Fix:** a notebook that fits in one request (`n <= _SYNC_CHUNK_BATCH`) is
  written exactly as v04.61 wrote it, chunks and main doc in ONE commit. The
  multi-batch path, and its `null`-until-the-next-push window, is used only
  past the size where the single commit would be refused outright.
- **`26d` rewritten in place** (it asserted the main doc came in a batch of
  its own even for a small notebook, which was the fault). It now asserts one
  atomic commit.
- **New `26f`:** a failed push of a notebook that fits in one request leaves
  the previous notebook readable whole.
- Both fail on the builder's first cut and pass on v04.61, which is what they
  guard.
- `26a`, `26b` and `26c` fail on v04.61, which is what they fix. `26e` (format
  unchanged) passes on both, by design.

**Still not done:** two devices pushing a notebook LARGER than one request at
the same moment could interleave their chunk batches. Readers would then get
`null` until the next push. Below that size the single atomic commit makes
this impossible, as before. Per-note sync, the owner-approved first round of
the import job, removes it entirely.

**Measured** (by the Architect)
- `ship-check`: **12/12**.
- `app-check --only 26`: **16/16**.
- Full `app-check`: **628/628, twice in a row**.
- **Unpatched:**
  - v04.61's app with this round's `tools/`: `--only 26` **7/11, 4 FAILED**
    (`26a` ×2 and the `26b`/`26c` blocks, each refused at 10 MiB);
  - the builder's first cut with the same `tools/`: **14/16, 2 FAILED**
    (`26d` and `26f`).

---

## v04.63 — spreadsheet round 2b1: merged cells, and the fill handle upward and leftward (24 Sep 2026)

Issue #93, round 2b1 of the spreadsheet backlog the owner approved on 23 Sep
2026 (round 1 shipped as v04.52, round 2a as v04.61; round 2b2 — colour
rules and filters — and round 2c come later). Everything lives in
`_sgMount()` and its neighbours (`index.html`, from about line 23350).

**Merged cells.** A new toolbar button, worded (`CLAUDE.md`: a bare glyph is
not a label) — `Merge cells`, reading `Unmerge` when the active cell is
already inside one — and the same choice in the right-click menu on a
selection. Stored as a new top-level key, `mg`: an array of
`[r1,c1,r2,c2]` ranges, at least two cells each, value at the top-left
("the anchor"), covered cells holding nothing; the key is left off a sheet
with no merges.

- **Nothing lost silently (I1).** A selection holding values in more than
  the top-left cell arms the button (`Tap again to merge — keeps only the
  top-left value`, the `Remove` button's own two-tap pattern) rather than
  merging outright; a second click within 4 seconds merges. An empty
  selection or one already holding a single value merges on the first
  click. The merge clears the covered cells' `raw` and keeps their other
  properties; it is one undo step.
- **Drawing.** The live grid gives the anchor `td` a real `rowSpan`/
  `colSpan` and sets the covered `td`s `display:none` — they stay in the
  `TD[r][c]` lookup (so nothing that loops over every cell has to
  special-case a merge) but drop out of the table's own column layout,
  landing the anchor exactly where a hand-written merged `<table>` would.
  `boxTD(r,c)` resolves any covered position to its anchor's own box — the
  anchor's `rowSpan`/`colSpan` already make that box the whole merged
  area — and every call site that used to read `TD[r][c]`'s box directly
  (selection paint, `scrollIntoCell`, the fill handle, the fill preview)
  now goes through it. `_sgStaticHTML()` writes `colspan`/`rowspan` on the
  anchor and omits the covered `<td>`s, and its used-range scan now also
  covers a merge's full extent, so the snapshot, search, Save File and an
  older build all see a real merged table (I4).
- **Selecting.** `select()` resolves a plain click anywhere in a merge (the
  browser routes it to the spanning anchor `td` on its own) to the whole
  range, anchored at the top-left — Excel's rule. A drag or Shift-selection
  that TOUCHES a merge grows to cover it, via `normM()` — a merge-aware
  wrapper the visual/cell-iterating call sites (`paint`, `forSel`, `status`,
  `updateFillHandle`, `doCopy`, `applyBorders`) now use in place of the
  plain, still-unchanged `norm()`. Row/column HEADER selection deliberately
  keeps the plain `norm()` — growing that too would make "insert a row
  strictly inside a merge" inexpressible, since the header click is the only
  way to pick one row of a merge rather than the whole thing.
- **Keyboard.** `move()` steps a merge as one cell: leaving from whichever
  of its edges faces the direction of travel. Typing edits the anchor,
  because `A` is always kept at a real, content-bearing position by
  `select()`. A formula referring to a covered cell sees it as blank —
  Excel's behaviour, and it falls out for free because a covered cell
  carries no `raw`.
- **Insert/delete rows and columns.** `rekeyMerges()` — called from the
  existing `rekey()` alongside the cell/`colW` rekeying it already did —
  moves and resizes every `mg` range with the same shift math already
  proven on individual cell coordinates (`SGE.axisOp`'s own shape): an
  insertion strictly inside a merge's span grows it, at or before its top/
  left edge carries it along unshrunk; a deletion's edge collapses to the
  deletion point, and when both edges collapse to the same point the merge
  is dropped — one formula, no separate "fully deleted" branch. Deleting
  the anchor's row/column keeps the merge with a new, empty anchor (the
  surviving row's own cell, already empty, becomes it) — Excel does the
  same.
- **Refused, with a toast, nothing changed, no undo step:** sort, a fill
  (handle, Fill down, Ctrl+D/R) whose source or target touches a merge, a
  paste whose target touches a merge, a merge overlapping an existing one,
  and — both directions — freezing while a merge crosses the row-1/row-2
  boundary, or merging across it while frozen (a sticky `rowSpan` cell
  spanning the freeze line can't be drawn correctly). Every refusal path
  returns before its `snap()`, proved directly: `self.undoDepth()`, a new
  test-only accessor beside the existing `self.state()`, reads the sheet's
  own undo-stack length, because a refused action that (wrongly) pushed a
  no-op step would still leave `data-sg` byte-identical — the state
  comparison alone can't see a spurious entry that undoes to what it
  started from.
- **Unmerge** leaves the value in the top-left cell, empties the rest —
  they already held nothing — and is one undo step.
- **Borders on a merge apply to the anchor's edges only.** `forSel()`, the
  function every per-cell styling action (bold, italic, align, fill colour,
  borders, Clear contents) already funnels through, now skips a merge's
  covered cells — so a border (or any other per-cell property) lands on the
  anchor, and draws around the whole merged box because the anchor's own
  `td` IS that box.
- **Read view and Multi** draw merges from the same `_sgMount()`/
  `_sgStaticHTML()` every mode already shares — proved in app-check `27g`,
  not assumed.

**The fill handle, upward and leftward.** In v04.61 dragging up or left did
nothing; now it continues the series backward, one rule per line exactly
as before (formula > date > text-with-trailing-number > all-numbers >
cyclic pattern), just read from the other end:
- a number line extrapolates from the source's FIRST value, the end
  nearest the new cells, instead of its last;
- text ending in a number counts down the same way, and never prints a
  negative — past zero it mirrors and keeps counting by absolute value,
  matching Excel (`Item 3` dragged up 4 gives `Item 2, Item 1, Item 0,
  Item 1`);
- a date line steps backward by its own gap;
- a formula still shifts by a plain row/col delta either direction, so a
  reference walked off the sheet resolves to `#REF!` exactly as the
  forward case already did (`SGE.shiftF` needed no change);
- a pattern repeats backward (cycling from its last cell rather than its
  first).

The axis is still whichever way the pointer has moved furthest OUTSIDE the
selection — now checked in all four directions, not just down/right.
`fillTargetRange()` and the drag's own merge-touch refusal check (above)
both work either direction unchanged, since they already operated on a
combined source-plus-target box rather than assuming a sign. Still one
undo step per fill, still no auto-growing.

**Not done, per the issue's own scope:**
- merges are not carried by copy/paste this round — pasting copies values
  only, and a paste target touching a merge is refused;
- dragging the fill handle BACK INSIDE the current selection (shrinking
  it) does nothing; Excel clears there, and clearing is destructive enough
  to need its own round;
- round 2b2 (colour rules, filters) and 2c (several sheets, CSV, more
  functions).

**Layouts (D5).** `Merge cells` rides the sheet's own toolbar — sideways-
scrolling on the phone, wrapped and fully visible from 640px up, both
already true of every other sheet control since v04.61's Architect review,
so nothing new was needed to keep `25h` green. Selecting a merge is tap or
click at every tier, the same `select()` regardless of `lastPtr`. The fill
handle's up/left dragging reuses its existing per-tier hit box (32×32px
touch, 12×12px mouse) unchanged. The armed confirm label
(`Tap again to merge — keeps only the top-left value`) is long; the
button, like `Remove`'s own armed state, simply grows — `white-space:nowrap`
already held on every `.sg-b`, and the phone toolbar's own sideways scroll
(unchanged this round) keeps its box reachable.

**Checks: new section 27, `27a`–`27h`.** Real input only — `page.mouse` for
drags and clicks, `page.keyboard` for typing/undo, `touchDrag()` in a
`hasTouch` context for a real touch drag — never a merge/fill/unmerge
function called directly, and every check id names its size. `27a` (×3
sizes): the real two-tap merge, `mg`, the anchor's box, one Ctrl+Z, the
saved snapshot's `colspan`/`rowspan` with the covered `<td>` omitted, and
the read view after a reload. `27b` (1440): a click anywhere in the merge
selects it whole; arrow keys step over it; typing edits the anchor; a
formula referencing a covered cell reads blank. `27c` (1440): the real
`Rows & columns ▾` menu, via row/column HEADER selection so a genuinely
single row inside the merge can be targeted — insert grows it, delete
shrinks it, deleting the anchor keeps an empty new one, deleting down to
one cell drops it. `27d` (1440): all six refusals, each proved by
`data-sg` byte-identity, a toast, AND `self.undoDepth()` staying flat.
`27e` (820): `Unmerge`'s label and its one undo step. `27f`: fill up/left
by real mouse at 1440 and 820 and real touch at 390, checking both raws
and displayed values across all four rules including the `#REF!` case.
`27g` (1440): merge and unmerge in a real Multi window, then save. `27h`:
opening a note whose sheet already has `mg` (plus `frz` and `bd`) changes
nothing — `17d`/`25g`'s rule, extended to the new key. `25a`–`25i` and
`17*` stay green, confirmed by re-running them, not assumed from the
shared code path.

**Measured**
- `ship-check`: **12/12**.
- `app-check --only 27`: **83/83**.
- `app-check --only 25`: **106/106**.
- `app-check --only 17`: **23/23**.
- Full `app-check` (Architect, on `5034af0`): **711/711, twice in a row**.
- Unpatched (v04.62's app with this round's tools), `--only 27,25,17`: **136/153, 17 FAILED, all in section 27**:
  - 7 blocks aborted (`27a` ×3, `27b`, `27c`, `27d`, `27e`);
  - 9 `27f` fill-up/left assertions failed;
  - `27g` aborted after 1 check.

  `27h` passes on both versions, by design (a guard). Every `25*` and `17*` check passed on v04.62.

---

## v04.64 — spreadsheet round 2b2: colour rules (conditional formatting) (24 Sep 2026)

Issue #95, round 2b2 of the spreadsheet backlog the owner approved on 23 Sep
2026 (round 1: v04.52, round 2a: v04.61, round 2b1: v04.63; round 2b3 —
filters — and round 2c come later, out of scope here on purpose). Everything
lives in `_sgMount()` and its neighbours (`index.html`, from about line
23370).

**Record fix carried from v04.63's review.** The armed `Merge cells` label
(`Tap again to merge — keeps only the top-left value`) is 340px wide, past
the phone's own sideways-scrolling toolbar at 390px. The button's own label
is now `Tap again: keeps top-left only`; the toast it also shows keeps the
full sentence unchanged, since the toast isn't constrained by the toolbar's
width. New check: at 390 the armed button is no wider than 240px. Section
27's own `27a` asserted the old label text and now asserts the new one, with
the reason recorded in place.

**What the owner gets.** A new toolbar button, `Colour rules ▾` (words, not
a glyph), opening a small panel anchored to the button and clamped on
screen — the same shape `Borders ▾` and `ƒx Functions` already use, one
shared instance (`_sgCrEl()`) reused by every mounted sheet, exactly like
`_sgMenuEl`/`_sgFnEl`. The panel has two parts:
- **Add a rule for the selected cells**: a condition select (greater than,
  less than, equal to, between, text contains, is empty, is not empty), one
  or two value fields (the second only for "between"), four colour choices
  — green, gold and rose fill, or red text for negatives — and an `Add`
  button.
- **Rules on this selection**: every rule overlapping the current selection,
  in words (`B2:B20 · greater than 100 · green`), each with its own
  `✕ Remove`. A one-line note says "When rules overlap, the first one added
  wins."

**Stored as a new top-level key, `cr`.** An array of `{rng:[r1,c1,r2,c2],
op, v1, v2?, fill?, ink?}`, in the order the rules were added; the key is
left off a sheet with no rules.

**How rules apply.** `_sgCrFor(state,r,c,v)` (top-level, shared by the
snapshot and the live grid) walks `state.cr` in order and returns the FIRST
rule whose range covers `(r,c)` and whose condition matches the cell's
CURRENT COMPUTED value `v` — never its raw text, so a formula is coloured by
what it currently shows. A match's colour overrides how the cell is DRAWN
only: `refresh()` (the live grid, in both edit and read-mode mounts) and
`_sgStaticHTML()` (the snapshot) both compute `bg = rule.fill||o.bg` and an
extra `color:` when the rule carries `ink` — the cell's own stored `bg` is
never written by a match, proved directly (`28c`): a cell with its own gold
fill shows the rule's colour while it matches and its own gold the moment it
stops, and `bg` in `data-sg` never changes either way. Number comparisons
coerce the way `SGE.cmp` already does elsewhere in the sheet; `text
contains` lower-cases both sides.

**The snapshot.** `_sgStaticHTML()`'s used-range scan now also covers every
`cr` rule's full range, the same way v04.63 already covers a merge's range —
a rule that colours an otherwise-empty cell (`is empty`) isn't pushed out of
the saved snapshot at the sheet's edge. The snapshot is still rebuilt only on
edit, never on load (`17d`/`25g`/`27h`'s rule, extended to `cr` by `28g`), so
a rule sitting on a volatile formula (`TODAY()`) goes stale in the snapshot
between edits — the same trade-off v04.52 already made for values themselves.

**Moves with the grid.** `rekeyMerges()`'s shift math is now factored into
one shared helper, `rekeyRange(range,axis,at,n)`, that moves, grows, shrinks
or drops a single `[r1,c1,r2,c2]` range — an insertion strictly inside it
grows it, at/before its top-left edge carries it along, a deletion collapses
an edge to the deletion point, and when both edges collapse to the same
point the range is gone. A new `rekeyColorRules()` calls the same helper for
every `cr` rule, from the same `rekey()` that already calls `rekeyMerges()`
— proved not to have disturbed `27c`, the merge insert/delete suite, which
stayed green unchanged. The one difference between the two callers: a merge
that collapses to a single cell is also dropped (a merge needs two cells); a
colour rule that collapses to a single cell is a perfectly normal rule and
stays. Sorting never calls `rekey()` at all, so a rule's range is untouched
by a sort — it colours by POSITION, exactly what Excel does.

**Merges.** A rule over a merge applies to the anchor — no special-casing
needed: a merge's covered cells are already skipped in both `_sgStaticHTML`'s
render loop and hidden (`display:none`) in the live grid, so a match on a
covered position is simply never drawn.

**Undo.** Adding and removing a rule are each one `snap()`, so each is one
undo step, the same shape as every other sheet mutation.

**The read view and Multi** show the colours from the same `refresh()`/
`_sgStaticHTML()` every mode already shares — proved in `28f` (Multi) and
`28a` (a reload into the read view), not assumed.

**Layouts (D5).**
| | Phone (<640px) | Tablet | Laptop |
|---|---|---|---|
| `Colour rules ▾` | in the sideways-scrolling toolbar | wrapped, fully visible (`25h` stays green) | same |
| Panel | full width minus 16px each side (`_sgCrPosition()` sets `width:calc(100vw - 16px)` under 640px), fields wrap to two per line, every field/swatch/button at least 44×44px | anchored to the button, clamped inside the viewport | anchored, clamped |

Proved directly, not assumed: `28a` runs at all three sizes and checks the
panel's own bounding box lies fully inside the viewport at each, and at 390
that every interactive control measures 44px or more in both dimensions.

**Not done, per the issue's own scope:**
- colour scales, data bars and icon sets;
- rules written as formulas (`=A1>B1`);
- font styling from rules beyond the one red-text option;
- filters (round 2b3) and round 2c.

**Checks: new section 28, `28a`–`28h`.** Real input only — the real
`Colour rules ▾` button, the real panel's fields and swatches, real clicks —
never `crAdd`/`crRemove`/`_sgCrFor` called directly, and every check id
names its size where the round's layout differs by size. `28a` (×3 sizes):
values 50/150/250 in B2:B4, a real *greater than 100 · green* rule added
through the panel — B3/B4 turn green and B2 doesn't, typing 500 into B2
turns it green, a save carries the colour into `.sg-static`, a reload shows
it in the read view, and the panel's own box/tap-target sizing. `28b`
(1440): one match and one non-match for every condition, driven through the
panel — between, less than, equal to, text contains (case-insensitive), is
empty, is not empty, and red text. `28c` (1440): two overlapping rules —
the first added wins; a cell with its own gold fill shows the rule colour
while it matches and its gold once it stops; `bg` in `data-sg` never
changes. `28d` (1440): the real `Rows & columns ▾` menu — an insert inside a
rule's range grows it, deleting its column drops it, a sort leaves it alone.
`28e` (820): `✕ Remove` removes a rule; one Ctrl+Z restores it. `28f`
(1440): adding a rule in a real Multi window, then saving. `28g`: opening a
note whose sheet already has `cr` (plus `mg`, `frz` and `bd`) changes
nothing. `28h`: the record fix above, at 390. `17*`, `25*` and `27*` all
stay green, re-run in full, not assumed from the shared code path.

**Measured**
- `ship-check`: **12/12**.
- `app-check --only 28`: **51/51**.
- `app-check --only 27,25,17`: **212/212** (`27a`'s armed-label assertion
  updated in place for the record fix above; every other check unchanged).
- Full `app-check` (Architect, on `47a31ef`): **762/762, twice in a row**.
- Unpatched (v04.63's app with this round's tools), `--only 28,27,25,17`:
  **214/226, 12 FAILED**:
  - 7 `28*` blocks aborted;
  - `28f` aborted after 1 check;
  - `28h` failed;
  - the three `27a` arm-label checks failed, because they were updated in
    place for the shorter label.

  `28g` passes on both versions, by design. Every `25*` and `17*` check
  passed on v04.63.

## v04.65 — deleting a folder no longer deletes its notes on the next sync (24 Sep 2026)

**Built by the Architect directly, ahead of the filters round (#97),** because it
is data loss (I1) on the live app.

**How it was found.** The owner's sister app, MMSA, asked how Siyagah's folder
dialog works. The research for that answer read `trashFolder()` and noticed
it writes tombstones for the notes inside a deleted folder. Measured on
v04.64: delete folder `f1` (holding `a1`, and `a2` in its subfolder), then
merge with another device's copy. **Both notes are gone on both devices after
one sync,** although the app had said they were kept, only unfiled.

**The two routes to the loss:**
1. `trashFolder()` called `_addTombstones()` with the ids of every note in the
   folder (`savedArts`), even though the same function only UNFILES them. A
   tombstone is exactly what `mergeDB()` treats as "deleted on purpose".
2. `mergeDB()` also read every Trash entry's `subtree.articles` as deletions.
   For a folder entry those are the notes that were inside it, kept so that
   Restore can re-file them. They were never deleted.

Emptying Trash made it permanent: `_tombstoneTrashEntry()` tombstoned the
same notes again, and the Trash copy that Restore could have used was gone.
Until then, **restoring the deleted folder from Trash brought the notes back**
(`restoreItem()` pushes back any saved note that is missing), so a notebook
whose Trash was never emptied has lost nothing that cannot be recovered.

**The fix:**
- `trashFolder()` tombstones the folders only.
- `_tombstoneTrashEntry()` never tombstones a folder entry's notes.
- `mergeDB()` no longer takes deletions from `subtree.articles`. It also
  ignores any tombstone for a note that **the same copy still holds alive**.
  A genuine delete always removes the note from the copy that records it, so
  that pair only ever came from this bug. This is what protects a notebook
  from a device still running v04.64 or older, which keeps writing those
  marks until its service worker updates (I3).
- **A one-time repair on boot**, `_migrateRecoverFolderDeletedNotes()`, brings
  back notes this bug already removed. A note qualifies when all of these
  hold:
  - it is missing from `DB.articles`;
  - it sits in a folder Trash entry;
  - its tombstone is either absent or carries that entry's exact
    `deletedAt`, the bug's fingerprint;
  - it has no article Trash entry of its own.

  So a note the owner deleted on purpose afterwards stays deleted.

  Restored notes come back **unfiled**, because the deleted folder is not
  recreated. They get a fresh `updatedAt`, so every device keeps them, and
  their stale tombstones are cleared. The repair is additive and runs once
  (I8): `DB._folderNoteRecoveryV1` records `{at, restored:[ids]}`. A toast
  tells the owner how many notes came back and where to find them.

**What it cannot bring back:** a note whose folder was deleted **and** whose
Trash was then emptied. No copy of it exists anywhere in the notebook.

**Also:** `CLAUDE.md` line 6 read `Current version: v04.62` through two
rounds, and now reads v04.65. The ship-check guard that stops it going stale
again is part of the filters round (#97), which becomes **v04.66**.

**Layouts (D5):** no UI change; sync and boot behave the same at every size.

**Checks: new section 30.**
- `30a`: a real 🗑 click in the folder dialog at 1440, with the confirm
  accepted. The notes stay local and unfiled, only the folders are
  tombstoned, and every note survives a merge in both directions. The folder
  deletion itself still reaches the other device.
- `30b`: emptying Trash afterwards still keeps every note.
- `30c`: a copy written by an older build (notes alive but tombstoned, plus a
  folder Trash entry) no longer deletes those notes in either direction.
- `30d` (guard): deleting a **note** on purpose still removes it everywhere.
- `30e`: a damaged notebook gets its lost note back on boot, unfiled and
  freshly stamped. A note from the same folder deleted on purpose later stays
  deleted, the repair records itself, and a reload adds no copies.

**Measured (Architect):**
- `ship-check`: **12/12**.
- `app-check --only 30`: **17/17**.
- Unpatched (v04.64's app with these tools): `--only 30` **6/17, 11 FAILED**.
  The 6 that pass on both are the real-🗑 click itself, the unfiling, the
  folder deletion syncing, the `30d` guard, and two no-page-error checks. All
  six are right to pass on v04.64.
- Full `app-check`: **779/779, twice in a row**.

---

## v04.66 — spreadsheet round 2b3: filters (24 Sep 2026)

Issue #97, round 2b3 of the spreadsheet backlog the owner approved on 23 Sep
2026 (round 1: v04.52, round 2a: v04.61, round 2b1: v04.63, round 2b2:
v04.64; round 2c comes later, out of scope here on purpose).

**Record fixes carried from v04.64's review.** `CHANGELOG.md`'s and
`CLAUDE.md`'s v04.64 entries now carry the Architect's real review totals
(762/762, twice in a row; unpatched 214/226) instead of the placeholder
"run by the Architect in review" line. `CLAUDE.md` line 6 ("Current
version") had drifted to v04.62 across both v04.63 and v04.64, because
nothing checked it; it now reads v04.66, and `ship-check` has a 13th check
comparing that line against `<meta name="app-version">` so it can never go
stale silently again — shown failing on `origin/main`'s own `CLAUDE.md`
(line 6 still v04.62 against a v04.64 meta tag) before this round's fix.

**What the owner gets.** A new toolbar button, `Filter` (words, no glyph;
`Clear filter` once one is on), also in the right-click menu. Turning it on
uses the selection's TOP ROW as the header and its columns as the filter's
columns; a single cell selected uses its own row as the header and the
sheet's USED columns instead. Only one filter per sheet, as in Excel.

**Stored as a new top-level key, `flt`.** `{r,c1,c2,hide:{"<col>":
["value",…]}}` — `r` is the header row, `[c1,c2]` the filter's columns,
`hide` lists the DISPLAYED values unticked per column (`(Blanks)` stored as
`""`). The key is left off a sheet with no filter. The DATA ROWS are never
stored: `fltDataRange()` rescans from the header down to the LAST row that
holds a value in the filter's own columns, on every render, so a row typed
later is picked up automatically and a genuinely blank row in the middle of
the data still counts as its own row (its own `(Blanks)` group) rather than
ending the scan.

**The header's ▾.** Each header cell in the filter's columns gets a small
`▾` — live-grid chrome only, written by `refresh()` into the cell's
`innerHTML`, never into `a.content`. Tapping it opens a panel anchored and
clamped exactly like v04.64's Colour rules panel (`_sgFltPosition`/
`_sgFltEl`, one shared instance reused by every mounted sheet, always
acting on whichever sheet is `_sgCur` — the same shape `_sgCrEl` already
uses): a search box, `Select all`/`Clear`, a checklist of that column's
distinct DISPLAYED values from the data rows (sorted, `(Blanks)` last),
`Sort A→Z`/`Sort Z→A` (edit mode only — see Read view below), and
`OK`/`Cancel`. `OK` applies the choice as one undo step. A column with
anything hidden shows its own ▾ as "on", the same way the Freeze button
does.

**What hides.** A data row is hidden when ANY filtered column's displayed
value is in that column's `hide` list — `fltHiddenRowSet()` computes this
fresh on every `refresh()` and the live grid sets the hidden `tr`'s
`display:none`, in both edit and read view. Row numbers stay true (the
`<th>` still shows `r+1`), so they visibly skip.

**The snapshot shows ALL rows, unchanged** (I1/I4). `_sgStaticHTML()`
already renders every row from 0 up to the used range regardless of
individual row content, so no code change was needed there at all — an
older build, search, Pane 2 and Save File all see the same full table a
filter never touches. The snapshot is still rebuilt only on edit, the same
rule v04.61–v04.64 already established.

**While any row is hidden**, these are refused with a toast, checked BEFORE
any `snap()` so nothing changes and no undo step is added: a fill (the
handle, Fill down, Ctrl+D/R), a paste, inserting or deleting rows, and
merge/unmerge. Column insert/delete is always allowed.

**Visible-only, as in Excel.** `forSel()` — the function styling, borders
and Clear contents already funnel through — now skips a filter-hidden row,
so those three apply to visible cells only, for free, with no change at
their own call sites. `doCopy()` skips hidden rows too, so Copy produces
visible rows only; a `rowIdx` array remembers each kept row's REAL index so
a paste-back's formula shift is still correct even though the copied rows
are no longer contiguous. Arrow keys, Tab and Enter skip a hidden row in
`move()`, bounded so a run of hidden rows up to the sheet's edge still
falls through to the existing "walking off the edge grows the sheet" rule
unchanged. Formulas are unaffected — `SUM` still counts hidden rows, as in
Excel, since a formula reads `S.cells` directly and was never routed
through `forSel`.

**Moves with the grid.** Column insert/delete shifts `c1`/`c2` via
`rekeyRange()` — the same helper v04.64 already factored out of
`rekeyMerges` for merges and colour rules — and re-points the `hide` keys
with the same inline shift idiom `rekey()` already uses for cell
coordinates; a deleted filter column's own `hide` entry is simply dropped,
and deleting every filter column drops the filter entirely (the shared
range-collapse rule already used for merges). Row insert/delete is refused
outright while any row is hidden (above); with nothing hidden, it shifts
`r` the same way, and deleting the header row drops the filter.

**A filter over a merge is refused at turn-on**, with a toast, before
anything is touched.

**Read view and Multi** share the same drawing code, so the read view shows
the filtered rows and the ▾ for free. The panel there can still adjust an
existing filter's checklist — `fltApply`/`fltSort` branch on `editable` and
skip `snap()`/`changed()` when it's false, mutating `S` in memory and
calling `refresh()` only, so a reload (which re-parses `data-sg` fresh)
discards it entirely: filtering in the read view is view-only, never writes
`a.content`, and the panel hides its Sort buttons there since sorting is a
real data mutation. Nothing here needed a Multi-specific change — the
window uses the exact same `_sgMount`.

**Not done, per the issue's own scope:**
- more than one filter per sheet;
- filtering by condition (greater than, and so on) or by colour;
- showing the filter in the snapshot;
- round 2c.

**Checks: new section 29, `29a`–`29j`.** Real input only — the real
`Filter`/`Clear filter` button, real ▾ clicks/taps, real checkbox clicks —
never `turnOnFilter`/`fltApply` called directly, and every check id names
its size. `29a` (×3 sizes): a real filter turned on over a seeded
`Fruit|Qty` table, unticking `apple` through the panel hides exactly the
three apple rows, the status bar text, row numbers skipping, and the
panel's box/44px targets at 390. `29b` (1440): `(Blanks)` hiding the empty
row, and the search box narrowing the checklist. `29c` (1440): the
snapshot keeps all 7 rows, `data-sg` carries `flt`, a reload's read view
shows the same rows hidden, and filtering in the read view leaves
`a.content`/`updatedAt` byte-identical. `29d` (1440): all six refusals —
fill-handle drag, Fill down, paste, insert row, delete row, merge — each
leaving `data-sg` byte-identical and `undoDepth()` unchanged. `29e` (820):
bold/Clear contents/Copy/ArrowDown all visible-only. `29f` (1440): Sort
A→Z from the panel sorts the data rows, header stays put. `29g` (1440):
column insert/delete shifting/dropping the filter and its `hide` keys.
`29h` (1440): filter and save in a real Multi window. `29i`: opening a note
whose sheet already has `flt` (plus `cr`, `mg`, `frz`, `bd`) changes
nothing. `29j` (390): `Clear filter` shows every row, drops `flt`, one
undo step. `17*`, `25*`, `27*` and `28*` all stay green, re-run in full.

**Measured**
- `ship-check`: **13/13** (shown failing on `origin/main`'s `CLAUDE.md`
  before the fix — see Record fixes above).
- `app-check --only 29`: **73/73, twice in a row** (the first run found
  seven test-side bugs — not app bugs — all fixed: see the commit history).
- `app-check --only 28,27,25,17`: **263/263**.
- Full `app-check` (Architect, after merging v04.65 into this branch and
  renumbering it to v04.66): **852/852, twice in a row**.
- Unpatched (v04.65's app with this round's tools), `--only 29`: **4/15,
  11 FAILED**. Eleven `29*` blocks aborted (no Filter control on v04.65).
  `29i`, "opening changes nothing", passes on both versions: it is a guard.
- **Built as v04.65 and renumbered.** The Architect shipped an urgent I1
  fix as v04.65 while this round was in review. See that entry.

---

## v04.67 — pop-ups: no empty gap when the Sidepane sits below Contents (25 Sep 2026)

**Owner-reported,** with a screenshot, on 24 Sep: "Both single or multi pop-up
shows this, pls fix." The pop-up showed a wide empty strip between the
Contents panel and the note. **Built by the Architect directly** (a two-line
fix).

**Cause.** The Sidepane can sit beside the note on the side opposite Contents
(`pinPanelPos: 'side'`) or stacked under Contents in the same column
(`'below'`). The function that keeps the note clear of the panels added both
panels' widths on a side, even when they were stacked. Single uses
`_syncP3CPadding()` and Multi uses `_fwSyncBodyPadding()`. The result was a
second, empty column exactly as wide as the Sidepane. At 1590px wide with
Contents on the left, the padding measured **412px** where it should be
**212px**. Single has had this since `'below'` existed; Multi since v04.59
made `'below'` work there.

**Fix.** Panels on the same side take the wider width (`Math.max`), not the
sum. Opposite-side panels are unchanged.

**Layouts (D5).** Tablet and laptop both get the fix. The phone draws no side
panels in either pop-up (v04.34), which is unchanged and checked.

**Checks: new section 31.**
- `31a`, at 1440 and 820: every combination of Single/Multi, Contents
  left/right and Sidepane below/side. The note's inner edge must sit within
  2px of the nearest panel, with no overlap.
- `31b`, at 390: no side panel and no side padding.

**Measured (Architect):**
- `ship-check`: **13/13**.
- `--only 31`: **17/17**.
- Unpatched (v04.66's app): `--only 31` **9/17, 8 FAILED**. That is exactly
  the eight "Sidepane below" cases; the side-by-side cases and the phone
  check were never broken and pass on both.
- Full `app-check`: **869/869, twice in a row**.

---

## v04.68 — sync: every change reaches the other device, in both directions (25 Sep 2026)

**Why.** The owner asked on 25 Sep: "check the sync issue in all directions.
Anything find, fix it." It followed the MMSA research, which had spotted that
folder moves don't bump `updatedAt`.

**How it was checked.** A new tool, `tools/sync-audit.mjs`, boots the real app
and simulates two devices in one page. For each of **114 operations**:
- device A makes the change through the same function the UI calls;
- device B keeps its stale copy, or makes its own concurrent change;
- both merge directions are checked: `mergeDB(B, A)`, B receiving A, and
  `mergeDB(A, B)`, A receiving B's stale copy;
- the two results are merged again, and must agree and stay unchanged.

The operations cover notes, folders, sections, tags, Note Types, favourites
categories, the calendar, Smart Views, MyWall, tabs, Sidepane pins, theme
settings, Trash, undo, and concurrent edits. It was run at all three sizes
with identical results. The audit and the fixes were written by the
Architect's research agent; the Architect reviewed every diff before
integrating it.

**v04.67 as shipped: 51 FAIL** (plus the two undo rows, below).

**Root causes, and their fixes:**
1. **About 35 functions changed a record without moving its `updatedAt`.**
   `_mergeById` keeps the receiving device's copy on a tie, so the change
   never arrived, and the two devices disagreed for good. The affected
   changes:
   - notes: an inline title rename, Attach → Folder, dropping a note on a
     sidebar folder, Note Type, favourite, pin, finish and un-finish,
     favourites-category removal, tab colour;
   - folders: every folder move and reorder (sidebar and dialog), move to the
     top level, move to another section, `autoNumberAll`/`doRenumber`. Because
     `mkFolder` runs `autoNumberAll` whenever names are numbered, **even
     creating a folder** did not sync;
   - section reorder;
   - tags: rename and delete across notes;
   - Note Types and their groups: drag, reorder, rename, colour, bold;
   - favourites and calendar categories: edits.

   **Fix:** `_stampRecordTouches()`, called from `_save()` and before both
   merge paths. It uses the same compare-with-the-last-save approach v04.40
   uses for `DB.theme`, applied to the nine collections `_mergeById`
   resolves. A record whose content changed while its `updatedAt` did not
   move forward gets `updatedAt = now`, and nothing else is stamped. The
   baseline is reseeded after boot, after both merges, after a backup
   restore, and after undo and redo. It also covers any future field (`G01`,
   `G02`). Measured cost: about 10 ms per save on a 6.3 MB, 2000-note notebook.
2. **Deletions with no deletion record:** sections, Note Types, Note Type
   groups, favourites categories, and calendar events and categories. The
   union merge put them straight back. **Fix:** the sweep tombstones a
   record that disappears from one of these collections, and `mergeDB`
   filters them with the existing `_alive` rule. Notes and folders are
   unchanged; Trash already records their deletions (v04.65).
3. **Standalone tags were merged by union,** so a deleted tag returned.
   **Fix:** per-tag add and remove stamps in two **new additive keys,
   `DB.globalTagsAt` and `DB.globalTagsX`** (`{tag: ms}`). `mergeDB` drops a
   tag whose removal is newer than its last add. Also fixed: renaming a tag
   left the old name in the standalone list, so it showed twice.
4. **Delete forever and Empty Trash came back** when the other device still
   listed the entry. **Fix:** a purged entry is tombstoned by its own id (a
   uid, never a record id), and `mergeDB` keeps it out of Trash.
5. **`_mergeById` ignored a timestamp that only one side had.** A new
   calendar event is created without one, so its first edit never
   arrived. **Fix:** the remote copy wins when only it is stamped, as
   `_mergeMapById` already does.
6. **Notes left pointing at a deleted folder.** Another device that had filed
   a note into the folder meanwhile, or simply still had the old copy, kept
   the dead folder id. The note then appeared in no folder and in no "not in
   a folder" list. **Fix:** `mergeDB` unfiles a tombstoned, non-alive folder
   id the same way on every device, without stamping the note. As a result a
   concurrent edit to that note is never beaten by the folder deletion.
7. **Undo stays local, as before.** HISTORY holds whole-notebook snapshots,
   so an undo after a merge also rolls back the other device's edit. The
   sweep would otherwise stamp that rollback as new and push it everywhere.
   Undo and redo reseed the baseline instead. `U01` and `Z03` are recorded
   as **KNOWN**; making undo sync safely is its own design change.

**With the fixes:** 110 PASS, 0 FAIL, 2 BY-DESIGN, 2 KNOWN.
- **BY-DESIGN:** when both devices edit the same record before syncing, the
  newer edit wins the whole record (`X02`, `X06`). That is unchanged.
- **Trade-off, recorded:** because more operations now stamp, a bulk change
  also beats an older unsynced edit of the same record on another device.
  Examples: renaming a tag used by many notes, or auto-renumbering folders.
  Before this round, the bulk change never reached the other device at all.

**Checks.**
- New app-check block `32-sync-audit-all-directions` runs the whole audit at
  1440. It requires 0 FAIL, 0 ERROR and 0 NOTRUN, with exactly 2 KNOWN.
- `21e` was updated in place: it faked a merge by assigning a note's tags
  directly, which the sweep correctly reads as a local edit. It now reseeds
  the baseline the way a real merge does.

**Not done / not tested:**
- real Firestore, and two real browsers;
- the linked-file load merge, and journal events, versioning and the other
  rarely used fields. The generic sweep covers these, and `G01`/`G02` show it
  does, but they have no row of their own.
- **Observation, to verify:** `_doPush()` writes without merging first. After
  merging an incoming change, the app pushes back only if it now holds more
  records than the remote copy, so a local change can wait until the next
  edit to be sent.

**Measured (Architect):**
- `ship-check`: **13/13**.
- `node tools/sync-audit.mjs`: **110 PASS / 0 FAIL / 2 BY-DESIGN / 2 KNOWN**.
- On v04.67's app: **59 PASS / 51 FAIL**.
- Full `app-check`: **@@FULL@@**.

