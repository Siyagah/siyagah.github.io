# Siyagah — Release Audit, v04.36

**Programme:** Master Audit and Continuous Build Plan, 19 September 2026, Phases 0–10
**Builder and first-line tester:** Claude-Siyagah
**Branch:** `claude/elegant-maxwell-8maykf`
**Version at start:** v04.35 (`b56e403`) · **Version now:** v04.36
**Baseline it was cut from:** v04.34 = `origin/main` = `ba6c70f`

---

## 1. The short version, for the owner

You asked for Siyagah to be audited properly — every feature, every function,
not just the parts that were easy to look at. That has now been done.

**The headline:**

> The v04.35 work you were handed was honest — I checked it against the
> unfixed code rather than taking its word for it, and every claim held up.
> On top of that, this programme found **seven more faults**, and all seven
> are fixed and proved fixed. Two of them could have lost notes. One was
> publishing a real folder name on your public website. The app now passes
> **589 automated checks**, up from 286.

**What was wrong, in plain language:**

| | What was wrong | How bad |
|---|---|---|
| 1 | If the notebook stored in your browser ever got **damaged** — a full disk, a tab killed mid-save, a bad sync — the app **opened to a completely blank screen and then saved that blank notebook over the folders that were still fine.** | **Serious.** Real data loss. |
| 2 | A **single empty entry** in the notebook, or a note that had somehow lost its id, also gave you a blank screen — on data that was otherwise perfectly intact. | Serious. |
| 3 | Your **Deploy Export** — the copy of the app meant to be an empty shell on your public website — was still carrying a **real folder name**, in a button's tooltip. | **Serious.** Privacy. |
| 4 | **"Restore from an HTML backup"** wiped your whole notebook with **no safety copy taken first**. (The JSON one already took a copy; this one did not, and it is the more destructive of the two.) | Serious. |
| 5 | A folder could be dragged **inside one of its own subfolders**, which turned the folder tree into a ring. Nothing was deleted, but the folders in that ring — and every note inside them — **disappeared from the sidebar**, and one part of the app would have spun forever. | Serious. |
| 6 | HTML **pasted from a web page, or brought in from a backup file, could run code** inside your notebook. | Moderate. Security. |
| 7 | The app was **almost unusable with a keyboard** — 30 of the 55 things you can click on the opening screen could only be reached with a mouse — and a dialog box never took the focus, so a keyboard user tabbed straight through the page behind it. | Moderate. |

**And one thing you asked for that is now built:** "Import data from JSON
backup" used to be replace-only. It now offers **Merge** — take the file's
notes *and keep your own* — with Replace behind a second, explicit
confirmation. A `📦 Save File` safety copy is written before **either** one.

**What still needs you, and only you — two things:**

1. **The sealed `legacy/v03.99/` build still has your private data in it**,
   at a public address. The project's own rule I6 forbids me from touching
   that folder, so I have not. *My recommendation: let me strip out only the
   private residue and leave every line of its code alone.*
2. **Your Firestore security rules.** They live in your Firebase console,
   not in this repository, so I cannot read them. If they allow anyone to
   read your notebook, everything else here is beside the point. *This is
   the single most important thing on this page.*

**My recommendation on shipping: APPROVE WITH ACCEPTED RISKS** — see §7.

---

## 2. What was actually done

### Phase 0 — the baseline was verified, not believed

The instruction was explicit: *"Do not assume the prior report is correct."*

| Gate | v04.35 claimed | Measured here | |
|---|---|---|---|
| `ship-check` | 11/11 | **11/11** | reproduced |
| `app-check` | 286/286 | **286/286** | reproduced |
| `journeys` | 24/24 | **24/24** | reproduced |
| `persistence-reload` | 6/6 | **6/6** | reproduced |

Then the important half: a **detached worktree at the v04.34 baseline** was
created and the repro scripts run against the *unfixed* code.

| Finding | v04.34 (`ba6c70f`) | v04.35 (`b56e403`) |
|---|---|---|
| 1 — note silently emptied | phone intact, **tablet EMPTIED**, **desktop EMPTIED** | intact at all three |
| 2 — private residue in exports | **8 of 8** kinds in both exports | **0 of 8** |

The v04.35 report is accurate. Evidence: `audit/phase0/BASELINE.md`.

### Phase 1 — the ledgers are generated, not written

`tools/inventory.mjs` extracts the Function Inventory mechanically from
`index.html`, so it can never drift: **1,282 application-defined functions**,
1,252 reachable, **25 referenced nowhere at all**, 41 classified destructive,
13 privacy-sensitive, 17 touching the network, **1,078 inline `on*` handlers**.

Writing that tool cost **four defects in the tool itself**, and they are worth
recording because each one is the same mistake in different clothes — a clever
answer that was confidently wrong, overruled by a simpler question:

- an arrow with no braces (`const inEd = n => !!(…)`) has no `{` to match, so
  reaching for the next one swallowed hundreds of lines and reported four live
  helpers as dead with their only caller inside the bogus body;
- a hand-kept template-literal depth desynced on a nested `` `${`}`} ``, after
  which **every block comment in the rest of the file scored as code** —
  `back()`, a function with no caller anywhere, came back "reachable" on the
  strength of eleven mentions in prose;
- applying the code rules *inside* a template literal, where `//` is part of a
  URL and `'` is part of `class='x'`, ate past closing backticks and found
  **254 functions instead of 1,282**;
- and leaving regex literals out entirely: `/['"]/` opens a string on its own
  quote, and the count collapsed to **15**.

The tool now ends by asking the raw file the simplest possible question — does
`name(` appear anywhere but the declaration — and that one grep has overruled
three successive versions of the clever answer.

**A standing risk it found:** a handler name can be *composed* rather than
written — `onclick="${f.pinHash?'removeFolderPin':'setFolderPin'}('${fid}')"`.
The name and its `(` never touch, so `app-check`'s handler scan — the check
that exists to catch dead buttons — **cannot see those controls at all**.
They are now clicked directly in `tools/audit-c-org.mjs`.

### Phases 2–8 — what the checks found

Each is in the defect register with its reproduction, fix and regression test.
Summarised, with what it cost and what now stops it coming back:

**D1 (High, I1) — a damaged notebook took the whole app down and then
overwrote what was readable.** `seedDB()` is always well-formed, so all 286
existing checks had only ever measured a happy boot. Booting against ten
shapes of damage found `articles` arriving as a string throwing
`localArr.forEach is not a function` inside `_mergeById`, **aborting boot**,
painting an empty screen, and writing that empty notebook back over **three
folders that were still perfectly readable**. The same throw aborts a **sync
pull** carrying a malformed remote document, leaving the device silently stuck
on a stale notebook (I2). **D2 (Medium)** — a `null` in `DB.articles` threw in
`loadDB`'s tab sweep; tree rendered **0 bytes**. **D3 (Medium)** — a note with
no `id` threw in `cntOf()`, which the folder tree calls once per folder, so
**one** damaged note blanked the whole sidebar.

`_repairDB()` now runs on every side of every merge — stored, embedded and
remote — and its rules are chosen so I1 is *literally* true: a collection that
is not a list is replaced by an empty one **with the original kept verbatim
under `DB._salvage`**; `null` entries go, because they carry no record; a
record with **no id keeps all its content** and is given one, because a record
the app cannot address is a record the owner cannot open. And the repair is
**not silent** — a toast names what was repaired.

**D5 (High, privacy) — a real folder name still reached the Deploy Export.**
Finding 2's fix asked the general question about body's *children* and stopped
there; everything rendered *inside* the shell was still a hand-written list of
seven ids, and `#p2h-path` — a sibling of `#p2h`, inside `#p2` — was not one of
them. It carries `title="New subfolder inside &quot;<the real name>&quot;"`.
Exactly the rot the audit predicted. The fix asks the general question of the
inside too, and getting it right cost two measurements: it is taken
**synchronously while the script is still parsing**, because the existing
snapshot runs *after* the first render (`tree` was already **8,215 bytes of
real folder names** by then); and only **leaf** containers are recorded,
because blanking an ancestor destroys the descendants the restore writes into
— **the live editor among them**, during a Save File taken while you are
typing.

**D6 (High, I1) — `importBackup()`'s Replace All took no recovery copy**,
although it wipes sections, folders, notes and trash together.

**D7 (Medium, I1) — `back()` left Pane 3 without flushing.** Measured dead, so
a trap for whoever wired it to a control next rather than a live defect —
fixed rather than deleted, for that reason.

**D8 (High, I1) — a folder could be moved inside its own descendant.** The
guard was written down **four times** — both drag handlers in the tree and both
in the picker — and **not once** in either function that performs the move.
`doMoveFolder('A','C','inside')` produced `A:C B:A C:B`: a ring, from which no
folder in it has a root, so all three and every note inside them vanish from
the sidebar. `pathOf()` — a bare `while(id)` — walks a ring forever. The guard
now lives in the two movers, and both tree walkers are bounded so a ring that
arrives from an older file cannot hang the app.

**D9 (Medium, security) — foreign HTML could run code.** CLAUDE.md's "raw HTML
with no sanitiser" is a deliberate decision about what the *owner* writes, and
it stands. It was never a decision about HTML arriving from a file or a
clipboard, and those two doors had nothing on them. The policy is now a
**boundary**: an imported file and a *hostile* paste are cleaned; ordinary
pastes are untouched; stored content renders exactly as before, so no widget
changes behaviour; and links are hardened **where they are painted**, which
rewrites no stored byte.

**D10 (Medium, accessibility) — the app was close to unusable by keyboard.**
30 of 55 visible controls on the landing view could only be reached with a
mouse, because the app wires most of its UI as `onclick` on a `<div>`. Two
delegated rules now fix that everywhere at once rather than in the hundreds of
places that build the markup. Dialogs take focus, announce themselves, and
give focus back. Eleven controls were raised to the 24×24 minimum; **two are
named exceptions with reasons recorded in the stylesheet**, so a new small
target still fails the check.

### Phase 9 — one command, and CI

`node tools/audit-all.mjs` runs every gate in order and **assembles the Feature
Coverage Matrix from what actually ran** — a row cannot be written by hand.
`.github/workflows/checks.yml` runs the fast gate on every push and the whole
matrix on every pull request. It is a **candidate**: it reports, it does not
block. Making a check required is a repository setting and it is yours to make.

---

## 3. The numbers

| | v04.35 | v04.36 |
|---|---:|---:|
| ship-check | 11/11 | **11/11** |
| app-check | 286/286 | **288/288** |
| principal journeys | 24/24 | **24/24** |
| reload persistence | 6/6 | **6/6** |
| audit A — shell, startup, corruption | — | **43/43** |
| audit B — editor ownership, lifecycle | — | **47/47** |
| audit C/D — organisation, search, 11 Smart Views | — | **49/49** |
| audit E/F — calendar, journal, contacts, database, reminders | — | **31/31** |
| audit G/H — export, import, privacy, merge | — | **44/44** |
| audit I — accessibility, security, scale, PWA | — | **46/46** |
| **Total** | **327** | **589** |

**Feature Coverage Matrix:** 260 rows — **254 PASS**, 4 `BLOCKED—ENVIRONMENT`,
2 `BLOCKED—OWNER`, 0 FAIL.

**Performance**, measured on synthetic notebooks (never the owner's data):

| Notebook | boot | render | search | persist | merge | export |
|---|---:|---:|---:|---:|---:|---:|
| 500 notes | 0.6s | — | — | — | — | — |
| 2,000 notes | 0.7s | — | — | — | — | — |
| **10,000 notes** | **2.2s** | **75ms** | **86ms** | **62ms** | **10ms** | **82ms** |

Comfortably inside every budget. Scale is not this app's problem.

---

## 4. What is NOT covered, stated plainly

The Master Plan is explicit that environment-blocked items stay marked, never
quietly passed. Four things could not be tested here, and are not claimed:

1. **Real Firebase.** Every `googleapis` / `gstatic` / `firebaseapp` host is
   denied by this sandbox, and the harness blocks them deliberately so the app
   is drivable at all. `mergeDB()` is tested directly against **eight
   adversarial conditions** — union, newest-wins from either side, a device a
   day fast, identical timestamps, a tombstone versus a stale device, an edit
   made *after* a delete, self-merge, and a damaged remote side — but a real
   two-device sync, real chunking and a real sign-in were not run.
2. **The deployed site.** `curl` to `siyagah.github.io` returns
   `CONNECT tunnel failed, response 403`. Everything here was measured against
   the repository working copy served to a real Chromium. **Nobody has
   confirmed that what is live matches this repository.**
3. **Firestore Rules.** Owner Decision 2. Not in this repository.
4. **A notification actually firing** for a due reminder. The stored reminder,
   its states and its ordering are measured; the delivery is not.

Two further honest limits: **the builder is still the tester** — this
programme was run by the same kind of agent that wrote the fixes, which is the
structural weakness the Master Plan named, and it is not solved by running
more checks; and **accessibility is improved, not finished** — keyboard
operation, focus, names and target sizes are measured and fixed, but no
screen-reader was actually driven, and no blind user has used this app.

---

## 5. Decisions taken, recorded rather than asked

Per §7 of the Master Plan, these are engineering choices, made and written
down rather than turned into questions:

| | Decision | Why it was not the owner's to make |
|---|---|---|
| E1 | A damaged notebook is **repaired on open** — not rejected, not silently replaced. Nothing discarded: a non-list collection is kept verbatim under `DB._salvage`. | It restores the app's own stated invariant where the app was previously losing data outright. |
| E2 | The repair **tells the owner** what it repaired. | They cannot read code; a silent repair hides a real problem. |
| E3 | The 25 unreferenced functions are **recorded, not deleted**. | Deleting them is a behaviour change with no owner-visible benefit and a non-zero chance of breaking a route the inventory cannot see. |
| E4 | Sanitisation is a **boundary** (import and paste), not a filter on rendering. | Filtering at render would break the widget design CLAUDE.md describes, and would rewrite the owner's own notes. |
| E5 | Two touch targets stay under 24px, **named**, with reasons in the stylesheet. | The sidebar drag grip's width *is* the divider (WCAG 2.2 exempts this); the ⭐/📌 markers sit on a full-width row that is itself the target. |
| E6 | CI **reports, it does not block**. | Branch protection is the owner's setting; the Master Plan says so explicitly. |

---

## 6. Two things only the owner can do

**1. The sealed legacy build.** `legacy/v03.99/index.html` is served at
`https://siyagah.github.io/legacy/v03.99/` and carries four Google sign-in
iframes with the Firebase API key, the notebook id, and a real note title. Rule
I6 seals that folder absolutely and `ship-check` enforces it byte for byte.
Nothing under `legacy/` was touched.

> **Recommendation: strip only the private residue**, leave every line of
> application code untouched, and record a named privacy exception to I6 in
> `legacy/README.md` and `CLAUDE.md`. I6 exists to preserve *behaviour* and to
> guarantee a working fallback; deleting a stray sign-in iframe takes nothing
> away from either. Say the word and it is a ten-minute change.
>
> The alternatives are: leave it as it is, or stop publishing that folder.

**2. The Firestore Rules.** They decide whether your notes are private at all,
and they are in your Firebase console. In the console: **Firestore Database ▸
Rules**. What they must say, in effect, is *"only a signed-in user whose own
id matches may read or write `notebooks/{that id}`"*. If they instead say
`allow read, write: if true;`, your notebook is **world-readable right now**
and that is a Critical finding — do not deploy until it is corrected.

> This is the one thing on this page I would do first.

---

## 7. Release decision

**APPROVE WITH ACCEPTED RISKS.**

v04.36 is safe to merge to `main` and deploy, **provided the Firestore Rules
are confirmed first**, with these risks accepted and written down:

- the legacy residue stays public until Decision 1 is made (it is unchanged
  from today, so deploying does not make it worse);
- real cloud sync, the deployed PWA update path and a real sign-in remain
  untested in this environment;
- the builder is also the tester.

Every fix in this round either removes a way to lose data or removes a way to
leak it. Nothing in it is a redesign, and 589 checks pass on the result.

### Rollback plan

Everything is one branch and two commits. There is nothing to undo by hand.

| To do this | Run this |
|---|---|
| Go back to v04.35 exactly | `git checkout b56e403` |
| Go back to what is live today (v04.34) | `git checkout ba6c70f` |
| Undo a merge already on `main` | `git revert -m 1 <merge commit>` |

A deployed copy is self-correcting: `sw.js`'s cache name carries the version,
so publishing an older build changes the cache name and devices pick it up on
the next load. **No notebook is touched by a rollback** — `_repairDB()` only
adds `DB._salvage` and `DB._repairedAt`, which older builds ignore, and every
other change is behaviour, not data shape.

### Post-deploy smoke test — two minutes, and only two things

1. Open `siyagah.github.io`, check the sidebar reads **v04.36**, and open one
   note. If the version is still v04.35, reload once.
2. Press `⬆ Import data from JSON backup` and **cancel it**. You should see a
   box offering *Merge* or *Replace All* — that is the new behaviour. Cancel;
   nothing will change.

That is all. Everything else in this round is verified mechanically.

---

## 8. Where the evidence lives

| | |
|---|---|
| This report | `audit/RELEASE-AUDIT-2026-09-19.md` (+ `.html`) |
| Feature Coverage Matrix — 260 rows | `audit/FEATURE-MATRIX.md` |
| Function Inventory — 1,282 functions | `audit/inventory/FUNCTION-INVENTORY.md` |
| Defect and Risk Register | `audit/DEFECT-REGISTER.md` |
| Decision Register | `audit/DECISION-REGISTER.md` |
| Phase 0 baseline verification | `audit/phase0/BASELINE.md` |
| The audit this one continues | `audit/AUDIT-2026-09-18.md` |
| Run everything yourself | `node tools/audit-all.mjs` |
