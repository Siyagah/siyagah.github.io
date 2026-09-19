# Siyagah — Correction Round, v04.37

**Answers:** *Siyagah v04.36 — Independent Review and Next Directive*, 19 September 2026
**Reviewed commit:** `5aaaa2625e022e4724707cf3c8667a5c29524c1f` (v04.36)
**This delivery:** branch `claude/elegant-maxwell-8maykf`, commit `01ee7094a176a03801b8f79949c142e7f8f8fb26`, **v04.37**
**Reviewer's verdict on v04.36:** DO NOT MERGE OR DEPLOY YET. CONTINUE CORRECTION.
**Supersedes:** `audit/RELEASE-AUDIT-2026-09-19.md` — that report's release recommendation should no longer be read; three of its claims were too strong and are corrected below.

---

## 1. For the owner, in plain language

An independent reviewer went through the v04.36 work and found **four things
that had to be fixed before it could be released**. They were right about all
four. Two of them were places where I had told you something was safe when I
had not actually proved it.

**What was wrong, and what it means for you:**

| | What the reviewer found | What it meant |
|---|---|---|
| 1 | When Siyagah repairs a damaged notebook it sets the damaged part aside so nothing is lost. I told you "nothing was discarded". **That was only true when the damage came from this device.** If it came from the cloud or from a file you imported, the set-aside copy was thrown away moments later. | I had **overstated a safety promise**. Now the set-aside copy survives — proved in memory, in browser storage, in an exported file, and across two devices. |
| 2 | The import question was a single box where **OK meant Merge and Cancel meant Replace Everything**. | Pressing **Cancel** — the natural thing to do when you are unsure — would have **wiped your notebook**. There are now three separate buttons: Merge, Replace All, and Cancel. Cancel is Cancel, it is what the Escape key does, and it is the button that starts highlighted. |
| 3 | Before an import replaces your notes, Siyagah said it had taken a safety copy. It had asked your browser to download one and **never checked whether that worked**. | A promise about a file that might not exist. Siyagah now saves a copy **inside the browser, reads it back and checks it** before touching anything — and you can restore it from **⚙ ▸ Backup ▸ 🛟 Safety Copies**. Before, there was nowhere to restore from at all. |
| 4 | The automatic checks I set up on GitHub **had been failing since I added them**, and I had not looked. | Worse: the broken run still produced a report that *looked* like a pass. Both are fixed, and the checks now run for real. |

**Two things I got wrong about my own work**, which the reviewer's fourth point
uncovered and which matter more than the fix itself:

- The report generator **wrote a normal-looking results table from a run in
  which nothing was measured at all**. It now says, in large letters, when a
  test suite never started.
- The quick check that guards your version number and the sealed old build
  **reported "11 out of 11 passed" in a situation where it had silently
  skipped two of them.** That is exactly the kind of false comfort this whole
  audit exists to remove. It now fails instead.

**Nothing about what still needs you has changed.** The two owner decisions —
the private data in the sealed `legacy/v03.99/` build, and your Firestore
security rules — are untouched and still waiting. The Firestore rules remain
the single most important item.

**My recommendation: still DO NOT DEPLOY yet**, and see §6.

---

## 2. Blocker 1 — "nothing was discarded" was true of one path out of four

**Reproduced on v04.36, before any change.** `_repairDB(db, where)` sets a
malformed collection aside at `db._salvage[where+'.'+k]`. `mergeDB(local,
remote)` begins `Object.assign({}, local)` and merges a named list of
collections — **`remote._salvage` is never carried.** Measured:

```
salvage on the input object : {"remote.articles":"CORRUPT-REMOTE-BYTES"}
salvage in DB after merge   : null
salvage in localStorage     : null
```

The same for an imported file merged into a notebook. The v04.36 toast said
"Nothing was deleted" on every path. It was true only of `stored`, which
happened to be the local side.

**Fixed.** `_mergeSalvage()` unions both sides and `mergeDB()` calls it. Three
properties, each one required by the review:

- **Collision-safe.** Keys became `where.collection@<iso>#<hash>`. Two devices
  repairing the same collection in the same second previously wrote the same
  key and one won silently; they now both survive (proved).
- **Bounded.** Salvage is raw malformed bytes, and a notebook that repairs
  itself weekly would grow without limit. Capped at 24 live entries / 256 KB
  total, with any single payload over 64 KB truncated and its **real length
  and hash recorded**.
- **Bounding never hides itself.** Pruning empties the **value** and keeps the
  **record** — size, hash, timestamp and a `prunedAt`. A decision to stop
  holding bytes is visible; it is never the silent absence of an entry.

The repair toast is now built from what the salvage map actually holds, so it
says "kept in full", "only in part (too large)" or "recorded but no longer
held" as appropriate, instead of one unconditional sentence.

**Regression cases required by the review, all present** (`tools/audit-j-recovery.mjs`):
malformed `articles` from **remote** and from an **imported file** against a
healthy local notebook; overlapping salvage keys from **two devices**;
**sixty** repairs over time; assertions in **`DB`, in `localStorage` and in the
exported file**; a **quota-denied** store; and the intact records on both sides
proved to survive alongside the salvage.

## 3. Blocker 2 — Cancel was wired to Replace All

v04.36 asked `OK = Merge, Cancel = Replace All` through a native `confirm()`,
in **both** importers. The review's judgement — unsafe for a non-programmer —
understates it: the instinctive way out of a dialog you do not understand was
the one action that cannot be undone.

**Fixed.** A real three-button dialog: **Cancel**, **✚ Merge**, **⚠ Replace
All**. Cancel holds the initial focus, so Enter on a dialog nobody read does
nothing. Escape cancels. A backdrop click cancels. Replace All requires a
second, explicit confirmation naming both counts.

**Every cancellation is measured on storage bytes**, not on the screen:

| Exit | Result |
|---|---|
| the Cancel button | `localStorage` byte-identical, 3 notes, 0 writes |
| the Escape key | byte-identical |
| Cancel on the **second** confirmation, after choosing Replace All | byte-identical |

And the two that do change things are measured too: Merge keeps the existing
notes and adds one; Replace All replaces; both take a verified snapshot first.

## 4. Blocker 3 — the recovery copy was an action, not a file

`_preImportRecoveryCopy()` called `exportFile()` and returned `true` when
nothing threw. `exportFile()` builds a Blob, clicks an anchor and revokes the
object URL in the same call. The browser may refuse the download, put it
somewhere unfindable, or be interrupted, and none of that raises. The claim was
made immediately before wiping the notebook.

**Fixed.** The copy is a snapshot written to **IndexedDB** and **read back in a
separate transaction**, compared by length and by hash, before anything
destructive is allowed to proceed. If it cannot be stored the app says so and
the owner must choose to continue without one. It is **restorable** — `🛟 Safety
Copies` in the ⚙ menu lists them and restores one, taking a fresh snapshot
first so the undo has an undo. A snapshot whose hash does not match is
**refused**, not restored. The downloaded file is still offered and is
described as what it is: unverifiable.

Tested: a successful save and read-back; listing; a real restore checked in
storage as well as memory; **a denied store** (reports failure, not success);
**a damaged snapshot** (refused, notebook untouched).

## 5. Blocker 4 — the CI workflow, and two worse things behind it

`npx --yes playwright@latest install --with-deps chromium` downloads a browser
and installs **no importable package**. The reviewer inferred this; the runs
confirm it:

| Run | Result |
|---|---|
| [35414435398](https://github.com/Siyagah/siyagah.github.io/actions/runs/35414435398) (push) | **failure** |
| [35414852252](https://github.com/Siyagah/siyagah.github.io/actions/runs/35414852252) (PR) | **failure** — `58 checks across 13 suites` instead of 589 |

Every browser suite died at `import playwright` and reported **"the check
itself threw" 35 times** — 35 rows that read like 35 app defects, over an app
nothing had measured.

**Fixed:** a pinned global install (`playwright@1.56.1`) where `harness.mjs`
actually looks, the browser installed from that same pinned package, and a
one-line step that **proves the harness can reach Playwright before anything
else runs**. `harness.playwright()` now throws an actionable message instead of
a bare module error.

**Two things that failure exposed are more important than the fix:**

- **`audit-all` wrote a plausible 90-row matrix from a run that measured
  nothing.** A broken environment produced a document that reads like coverage.
  Stale matrix fragments are now deleted before the run; a suite that never
  started is named **`NEVER RAN`**; and the matrix carries a banner saying it
  is not a measurement.
- **`ship-check` passed 11/11 in a clone with no `origin/main`**, silently
  skipping the version-bump and legacy-seal (I6) comparisons — which is
  precisely how the reviewer was handed a green tick for a comparison that
  never happened. It now **fails**, with instructions, unless
  `SHIP_CHECK_NO_MAIN=1` asks for the skip by name. Verified: 9/11, 2 FAILED in
  a single-branch clone.

## 6. The further verification the review asked for

**The sanitiser, adversarially.** The review was right that "we remove certain
tags and attributes" needed stronger evidence. It did: `srcdoc`, an
entity-encoded `java&#115;cript:`, a tab inside the scheme, `<form action>`,
`<base>`, `<meta http-equiv=refresh>`, `<object>`, `<embed>`, `<svg><use>`,
`style="url(…)"`, `@import` and a `data:text/html` anchor **all survived the
v04.36 version**. An allow-list of dangerous things rots exactly as the export
residue list did, so the rule is inverted: an element is kept only if its tag
is on a short list of what a note is *made of*, an attribute only if it is on a
short list too, and **an unrecognised element is unwrapped rather than
deleted** — a tag invented after this was written is handled the day it
appears, and the words inside it survive. **20 adversarial vectors, all
neutralised**, with the 12 things a note legitimately contains (headings, bold,
links, lists, tables, a data-URI image, a YouTube embed, widget chrome,
`data-` attributes, Arabic, Bangla) proved still present — and the whole
pipeline measured end to end: a hostile file, imported, then read back out of
**localStorage**.

**Rollback, evidenced.** v04.36 asserted that older builds "ignore `_salvage`".
`tools/audit-k-rollback.mjs` runs the **real v04.34 and v04.35 builds out of
git** against a notebook v04.37 has repaired and merged, then brings what those
builds wrote back to v04.37. **18 checks, both directions:** each old build
boots, reads every note including one written after the upgrade, reads the
folder that came from an imported file, and boots silently; and coming back,
the note the old build wrote is there, an **edit made on the old build
survives**, and the salvaged bytes are still present. Every build in the
rollback path also has a distinct service-worker cache name (I3).

The unconditional "self-correcting" sentence is withdrawn and replaced by that
procedure.

**The legacy residue and the Firestore Rules** are unchanged and remain owner
decisions. `ship-check` confirms `legacy/**` is still byte-identical to
`origin/main`. No private identifier or note content appears in any artifact
produced by this round.

---

## 7. Where v04.37 stands

| | v04.36 | v04.37 |
|---|---:|---:|
| ship-check | 11/11 | **11/11** (and now fails rather than skipping) |
| app-check | 288/288 | **290/290** |
| audit A — shell, startup, corruption | 43/43 | **43/43** |
| audit B — editor ownership, lifecycle | 47/47 | **47/47** |
| audit C/D — organisation, search, Smart Views | 49/49 | **49/49** |
| audit E/F — secondary modules | 31/31 | **31/31** |
| audit G/H — export, import, privacy, merge | 44/44 | **44/44** |
| audit I — accessibility, security, scale, PWA | 46/46 | **46/46** |
| **audit J — salvage, consent, verified recovery, sanitiser** | — | **33/33** |
| **audit K — rollback, both directions** | — | **18/18** |
| journeys · persistence | 24/24 · 6/6 | **24/24 · 6/6** |
| **Total** | **589** | **642** |

**Feature Coverage Matrix:** 311 rows — **305 PASS**, 4 `BLOCKED—ENVIRONMENT`,
2 `BLOCKED—OWNER`, **0 FAIL**. Re-run green from a clean clone.

## 8. Release decision

**DO NOT DEPLOY YET.** Unchanged from the reviewer's verdict, and for reasons
that are not about this code:

1. **The Firestore Rules are still unverified.** If they permit unconditional
   read or write, every note in the notebook is public and nothing in this
   repository can compensate. Owner Decision 2.
2. **The legacy residue is still published.** Owner Decision 1.
3. **Real Firebase, a real second device and the deployed site remain
   untestable here** and are marked `BLOCKED—ENVIRONMENT`, not passed.
4. **The builder is still the tester.** This round is the clearest evidence yet
   that the independent pass is doing real work: four blockers, two of them
   overstated safety claims that a green local gate had not caught.

**Recommended sequence:** confirm the Firestore Rules → decide the legacy
residue → then treat this branch as the merge candidate.

### Rollback plan (evidenced, not asserted)

| To do this | Run this |
|---|---|
| Back to v04.36 | `git checkout 5aaaa26` |
| Back to v04.35 | `git checkout b56e403` |
| Back to what is live today (v04.34) | `git checkout ba6c70f` |
| Undo a merge already on `main` | `git revert -m 1 <merge commit>` |

Verified by `tools/audit-k-rollback.mjs` for v04.34 and v04.35: each boots on a
v04.37 notebook, reads every note, and what it writes comes back to v04.37 with
nothing lost. Each build has a distinct service-worker cache name, so a device
picks up the change on the next load.

### Post-deploy smoke test — two minutes

1. Open the site, check the sidebar reads **v04.37**, open one note.
2. Press `⬆ Import data from JSON backup`, pick any file, and look at the
   dialog: it must show **three separate buttons** — Cancel, Merge, Replace
   All. Press **Cancel**. Nothing will change. That is the fix.

## 9. Session-change assessment

**A new session is advisable for the next round.** This one has now carried the
whole Master Plan programme plus this correction round, and the remaining work
is owner-gated rather than continuous. The continuation file is
`audit/CONTINUATION-2026-09-19.md`.

**If no owner decision arrives**, there is no code work outstanding that does
not depend on one: the four blockers are closed, the further verification the
review asked for is done, and CI is green. The honest next step is the two
decisions, not more checks.
