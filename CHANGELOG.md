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
