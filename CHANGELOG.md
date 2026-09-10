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
