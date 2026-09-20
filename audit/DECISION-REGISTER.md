# Siyagah — Decision Register

Master Plan §3, ledger 4: **only** choices that materially change
owner-visible behaviour, privacy, data, deployment or architecture.
Ordinary engineering choices are made and recorded in the changelog, not here.

## Open — owner's to make

| # | Decision | Recommendation | Blocks |
|---|---|---|---|
| **1** | `legacy/v03.99/` carries the same private residue (4 sign-in iframes with the Firebase API key, the notebook id, a real note title) at a public URL. Rule I6 seals that folder absolutely. Strip the residue only / unpublish / leave it. | **Strip only the private residue**, leave every line of application code untouched, and record a named privacy exception to I6 in `legacy/README.md` and `CLAUDE.md`. I6 exists to preserve *behaviour*; deleting a stray sign-in iframe takes nothing away from that. | Phase 3 privacy gate |
| **2** | The live Firestore Rules text. If it permits unconditional public read/write, every note in the notebook is world-readable. | Only the owner can read this — it is in their Firebase console, not in this repository. Rules must allow `notebooks/{uid}` **only** to a signed-in user whose `uid` matches. | Phase 6 rules gate |

## Settled by the Master Plan — no owner input needed

| # | Decision | Settled as |
|---|---|---|
| **3** | `Edit` on a note that is already in a pop-up: raise the pop-up, or close it and move editing to Pane 3? | **Raise the existing pop-up** (Master Plan §2.3), matching v04.35 as shipped. Verified in Phase 2. |
| **4** | JSON import: replace-only, or offer merge as the HTML importer does? | **Offer the same preview, merge/replace choice, double confirmation and recovery copy as `importBackup()`** (Master Plan §2.4). **Implemented in v04.36** — and the reverse gap closed with it: `importBackup()`'s Replace All had no recovery copy at all. |

## Decisions taken by this session, recorded rather than asked

| # | Decision | Why it is not an owner decision |
|---|---|---|
| **E1** | A damaged notebook is **repaired on open**, not rejected and not silently replaced. A collection that is not a list is replaced by an empty one **with the original kept verbatim under `DB._salvage`**; entries that are `null` are dropped; records with no id are given one and keep all their content. | It restores the app's own stated invariant (I1) in a case where the app was previously losing data outright. Doing nothing was not an option, and no variant of it changes what the app *is*. |
| **E2** | The repair **tells the owner** with a toast naming what was repaired, instead of fixing it silently. | CLAUDE.md: the owner cannot read code. A silent repair hides a real problem. |
| **E3** | The 25 unreferenced functions are **recorded, not deleted**. | Deleting them is a behaviour change with no owner-visible benefit and a non-zero chance of breaking a route the inventory cannot see (a handler name composed at render time). Recording them costs nothing and is reversible. |
| **E4** | Sanitisation is a **boundary** (imported files and hostile pastes), never a filter on rendering. | Filtering at render would rewrite the owner's own notes and break the `contenteditable="false"` widget design CLAUDE.md describes. The boundary closes the two doors foreign HTML actually comes through, and stored content is untouched. |
| **E5** | Two touch targets stay under 24×24, **named in the stylesheet with their reasons**. | The sidebar's drag grip's width IS the divider (WCAG 2.2 SC 2.5.8 exempts a size essential to the presentation); the ⭐/📌 markers sit on a full-width row that is itself the target. Naming them keeps the check sharp — anything else under 24px still fails. |
| **E7** | Bounding the salvage map drops the **value**, never the **record**: a pruned entry keeps its size, hash, timestamp and a `prunedAt`. | Unbounded growth is a real defect and bounding therefore has to happen; but silently losing an entry is the exact fault this mechanism exists to prevent, so the loss is made visible rather than made quiet. |
| **E8** | The recovery copy lives in **IndexedDB**, not localStorage. | localStorage already holds the notebook; a second copy there doubles usage against the same quota, so the safety copy would fail precisely when the notebook is large — which is when it matters most. |
| **E9** | The sanitiser is an allow-list of **what a note is made of**, and an unrecognised element is **unwrapped**, not deleted. | An allow-list of dangerous things rots exactly as the export-residue list did — twelve vectors got past the first cut. Unwrapping keeps I1 true: the words inside an element the sanitiser does not recognise still survive. |
| **E10** | The correction round continued on `claude/elegant-maxwell-8maykf` at `5aaaa26` rather than on a separate branch. | The review asked for a new branch so the corrections would have an independent baseline; that baseline is the commit, and it is where this work starts. A second branch would split PR #41 into two reviewable artifacts for no gain, and this session is mandated to push to one branch. Recorded rather than done silently. |
| **E6** | CI **reports; it does not block.** `.github/workflows/checks.yml` runs the fast gate on every push and the whole matrix on every pull request, with no branch protection. | The Master Plan says branch protection needs owner authority (Phase 1). The workflow carries the exact steps the owner takes to make it blocking. |
