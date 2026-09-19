# Siyagah — Defect and Risk Register

Master Plan (2026-09-19) §3, ledger 3. One row per finding, with severity,
reproduction, affected data, fix, regression test, version and status.

**Carried over from the v04.35 audit** (`audit/AUDIT-2026-09-18.md`),
independently re-measured in Phase 0 of this programme:

| # | Severity | Defect | Status | Version | Regression test |
|---|---|---|---|---|---|
| F1 | **Critical** | A note open in a pop-up was silently emptied when the owner clicked another folder; the empty note synced to every device (I1) | **FAIL—FIXED**, re-measured on both sides of the fix | v04.35 | `audit/repro/note-wipe-real-clicks.mjs`; `app-check` "one editor per note" |
| F2 | **High** | Deploy Export and Save File carried 8 kinds of private residue — sign-in iframes with the Firebase API key, real note titles, real folder names, the notebook id | **FAIL—FIXED** (8/8 → 0/8) | v04.35 | `audit/repro/export-residue.mjs`; `app-check` invented-popover check |
| F2b | **High** | The same residue is still live in the sealed `legacy/v03.99/` build at a public URL | **BLOCKED—OWNER** (Decision 1) | — | `ship-check` proves `legacy/**` unchanged |
| F3 | **High** | `⬆ Import data from JSON backup` replaced the whole notebook on one click — no count, no confirmation, no recovery copy (I1) | **FAIL—FIXED** | v04.35 | Phase 3, `tools/audit-g-data.mjs` |
| F4 | Medium | Accessibility beyond colour unaddressed | open | — | Phase 7 |
| F5 | Medium | No continuous integration | open | — | Phase 9 |
| F6 | Low/Info | Firestore may be in test mode | **BLOCKED—OWNER** (Decision 2) | — | Phase 6 |

## Found by this programme

| # | Severity | Defect | Found by | Status | Version | Regression test |
|---|---|---|---|---|---|---|
| **D1** | **High** (I1) | A stored notebook whose `articles`/`folders` is **not a list** (a string, a number) threw `localArr.forEach is not a function` inside `_mergeById`, **aborted the whole boot**, painted an empty screen, and then wrote that empty notebook back over the three folders that were still perfectly readable. The same throw aborts a **sync pull** carrying a malformed remote document, leaving the device silently stuck on a stale notebook (I2). | Phase 2, `tools/audit-a-shell.mjs` corrupt-notebook sweep | **FAIL—FIXED** | v04.36 | `audit-a-shell` `"wrongTypes"` ×3 |
| **D2** | Medium | A `null` entry in `DB.articles` threw `Cannot read properties of null (reading 'id')` in `loadDB`/`_sweepTabs`; the tree painted **0 bytes** — a dead screen on a notebook whose data was intact | same | **FAIL—FIXED** | v04.36 | `audit-a-shell` `"nullNote"` ×3 |
| **D3** | Medium | A note with **no `id`** threw `Cannot read properties of undefined (reading 'some')` in `cntOf()`, which the folder tree calls for every folder — one damaged note blanked the sidebar | same | **FAIL—FIXED** | v04.36 | `audit-a-shell` `"noteWithoutId"` ×3 |
| **D4** | Low | 12 application-defined functions are declared and **never referenced anywhere** — including `rmFolder`, `rmArt`, `setNoteKind`, `applyTag`, `newJournalEntry`. Dead code, not a fault in itself, but `rmFolder`/`rmArt` are destructive names with no caller, which is exactly the shape of a control that was moved and left behind | Phase 1, `tools/inventory.mjs` | recorded, not removed — removal is a behaviour change with no owner benefit and real risk | — | `tools/inventory.mjs` reports the list on every run |

### Risks carried, not defects

| Risk | Why it is a risk | Disposition |
|---|---|---|
| Handler names composed at render time — `onclick="${cond?'removeFolderPin':'setFolderPin'}('${fid}')"` | `app-check`'s handler scan resolves `name(`; a name and its `(` that never touch cannot be resolved, so these controls are outside the check that exists to catch dead buttons | `tools/inventory.mjs` flags them (`namedAsString`); covered by a direct click test in Phase 4 |
| `legacy/v03.99/` residue at a public URL | see F2b | **BLOCKED—OWNER** |
| Real Firebase / deployed PWA untested | this sandbox's egress policy denies `siyagah.github.io` and all Google hosts | **BLOCKED—ENVIRONMENT**, marked explicitly, never passed silently |
