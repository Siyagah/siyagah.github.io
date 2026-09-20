# Firestore security rules — approved design, final rules, for review

**Status: APPROVED in design, drafted, tested, NOT published.** Nothing is
deployed, no rule has been changed on the live project, and nothing is merged.

| | |
|---|---|
| Release candidate carried onto | **`f891b523429a5ae12a472df73f7dd11a069e91bb`** — v04.38, `claude/elegant-maxwell-8maykf`, PR [#41](https://github.com/Siyagah/siyagah.github.io/pull/41) |
| This delivery | `claude/awesome-newton-ira9zp`, a merge of that candidate plus `audit/firestore-rules/` |
| App files changed | **none** — `index.html`, `sw.js`, `manifest.json`, `icons/`, `tools/` and `legacy/**` are the candidate's, byte for byte |
| Final rules | [`firestore.rules`](firestore.rules) |
| Evidence | [`evidence/rules-test-output.txt`](evidence/rules-test-output.txt) |

## 0. The four decisions, as taken

| Decision | Ruling | Where it lands |
|---|---|---|
| Ownership pinned to the owner's UID, not the document id | **approved** | `ownerUid()` / `isOwner()` |
| `delete` of the notebook document denied, including to the owner | **approved** | `allow list, delete: if false` |
| Single-owner — no other account gets a notebook of its own (D1) | **approved** | `isOwner()` is the only grant |
| Additional sign-in-provider restriction | **not wanted** | no `sign_in_provider` clause; the optional variant was dropped, not merely left off |

The rules below are therefore final in design. The only edit left before
publishing is the `OWNER_UID` placeholder (§ 6).

## 1. What is wrong today

The live rule is:

```
match /{document=**} {
  allow read, write: if request.auth != null;
}
```

`request.auth != null` is satisfied by **any** Google account, because the
project's sign-in is open to the public internet — that is what "Sign in with
Google" means. The rule is not "only the owner"; it is "anyone who has ever
signed in to anything with Google, provided they know or can guess the project".

Measured against the emulator (§ 1 of the evidence), a second signed-in account
that is not the owner can, today:

- read the entire notebook, including every note's body;
- overwrite it;
- **delete it** — an I1 event, and not one Trash can undo;
- list `/notebooks` and so discover every notebook id in the project;
- write anywhere else in the database.

The only thing the live rule blocks is a signed-out client.

The candidate's own continuation file reaches the same conclusion from the
other direction: `audit/CONTINUATION-2026-09-19.md` lists Firestore Rules as
the first of only two open items and calls it "the most important open item",
noting that nothing in the repository can compensate for permissive rules.

## 2. The rules

[`firestore.rules`](firestore.rules) — in full, minus its commentary:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function ownerUid() { return 'OWNER_UID'; }
    function isOwner()  { return request.auth != null && request.auth.uid == ownerUid(); }

    match /notebooks/{notebookId} {
      allow get, create, update: if isOwner();
      allow list, delete: if false;

      match /chunks/{chunkId} {
        allow get, create, update, delete: if isOwner();
        allow list: if false;
      }
    }
  }
}
```

Four decisions, each with a reason:

**(a) Ownership is pinned to a UID, not to the document id.** The Firebase
idiom `request.auth.uid == notebookId` does not apply to this app. `notebookId`
is a free-form string the owner typed or generated (`nb-<base36>-<rand>`), and
the live notebook uses that form; the code comment claiming "UID = private
Notebook ID" (`index.html:20188`) describes an intent the code never
implemented. Requiring `uid == notebookId` would lock the owner out of their own
notebook until the document were copied to a new id — a data move, and an I1
exposure, for no security gain. Pinning the UID needs **no migration and no
application change**, so the v04.38 candidate and the sealed `legacy/v03.99/`
build both keep working untouched. The rules still permit a uid-named document,
so adopting that scheme later needs no rules change (tested).

**(b) `list` is denied everywhere, including to the owner.** Neither build ever
queries a collection — every read is a document read by known id. Denying
`list` removes the enumeration surface entirely.

**(c) `delete` of the notebook document is denied, including to the owner.**
Nothing in either build deletes it. Denying it means no client bug, and no
stolen token, can erase the notebook in one call (I1). Deliberate deletion of
*notes* is unaffected — that is Trash, inside the payload, and never a
Firestore delete (D3).

**(d) No payload validation, and no provider pin.** The first is tempting and
wrong here — see § 4. The second was offered and declined; it is not in the
file, and there is nothing to strip before publishing.

Everything outside `/notebooks` is denied by omission: there is no
`match /{document=**}` at all.

## 3. Evidence, re-run against the candidate

`npm test` in this directory, against the real Firestore emulator:
**48 checks, 48 passing**, on `f891b52`. Full transcript:
[`evidence/rules-test-output.txt`](evidence/rules-test-output.txt).

The sync tests are not mock-ups — `writeCloudDB` / `readCloudDB` in the suite
are transcribed from `index.html` 20716–20758 on this candidate, batch shape
included, so what the emulator evaluates is what the application sends.

| Actor | Checks | Result |
|---|---|---|
| **Owner** | every operation both builds perform: get, listener, create, update, chunk read/write, tail delete, uid-named doc, legacy blob shape | all allowed (10/10) |
| **Owner, denied on purpose** | list notebooks, list chunks, delete notebook, write outside `/notebooks` | all denied (4/4) |
| **Another signed-in Google user** | read, overwrite, field update, chunk read/write, delete, enumerate, attach a listener, create a notebook of their own, write elsewhere | all denied (11/11) |
| **Signed out** | read, chunk read, write, chunk write, delete, enumerate | all denied (6/6) |
| **Sync still works** | 1-chunk round trip; 1840 KB across 3 chunks; shrink 2→1 with the tail delete; two devices converging through a live listener; legacy single-blob read; the old→uid migration read/write | all pass (6/6) |

The two that matter most for the invariants:

- **I2 (cross-device sync).** "Two devices converge" attaches a real `onSnapshot`
  listener as a second device, pushes from the first, and asserts the second
  receives the change *and reassembles the correct payload* — under the proposed
  rules, not under a relaxed test rule.
- **I1 / I4 (nothing lost).** The legacy single-blob shape and the multi-chunk
  shape both round-trip byte-identically, and the shrink test proves no stale
  chunk is left behind to tear a later read.

The candidate's own gates were run on the same tree — see § 8.

## 4. The variant that was tested and rejected

[`firestore.strict.rules`](firestore.strict.rules) adds the payload validation
that looks like the obvious next hardening step. It is kept in the repository
**because the suite proves it breaks sync**, so nobody proposes it again from
first principles.

It fails for a reason that is invisible on inspection. `_writeCloudDB()` deletes
chunks `n … n+9` on every push, and those documents normally do not exist; on a
missing document `resource` is `null`, so `resource.data.ver != null` raises an
evaluation error and denies. The emulator's own words, from the transcript:

```
7 PERMISSION_DENIED: evaluation error at L50:26 for 'delete' @ L50
```

Because Firestore batches are atomic, that one denied delete fails **the whole
push**. And the app swallows the error (`try{ await b2.commit(); }catch(e){}`),
so there would be no visible failure — just stale chunks accumulating until a
growing payload crossed the stale boundary and a read came back torn.

Its second fault is `keys().hasOnly(['n','ver','deviceUpdatedAt','updatedAt'])`,
which makes the legacy single-blob shape (`db`, still read at `index.html:20718`)
permanently unwritable — a direct I1 risk.

The general lesson, recorded in the file itself: **a rule that reads `resource`
on a delete is a rule that fails on documents that are not there**, and the
failure is silent.

## 5. What remains open — not blockers on these rules

1. **The uid-as-document-id migration, if it is ever wanted.** The rules already
   allow it; the app does not do it. It needs `runMigration()` fixed first: it
   copies the data to `notebooks/{uid}` but never repoints the local config
   (PATHS.md § 5.1, re-checked on this candidate), so today it would leave the
   app syncing to the old id. A separate round, and not required by anything
   here.
2. **Publishing.** § 6. The owner's UID is the one thing this repository cannot
   supply.

## 6. What publishing would involve — when instructed

Not done. The Master Architect's instruction for this round was explicitly not
to publish, merge or deploy.

1. Get the owner's UID: Firebase console → project `aaas-notebook` → Build →
   Authentication → Users → the owner's Google row → copy **User UID**
   (28 characters; not the email, not the Notebook ID).
2. Replace the single `OWNER_UID` placeholder in `firestore.rules`. It appears
   twice in that file — once in the guidance comment, once in `ownerUid()`.
3. Re-run `npm test` with that value to confirm nothing else moved. The suite
   refuses to run if the placeholder has been removed rather than substituted,
   so a real UID must not be committed.
4. Publish via the Firebase console (Firestore Database → Rules), or
   `firebase deploy --only firestore:rules`.
5. Verify on a real device: open Siyagah, ⚙ → Cloud Sync → Diagnostics, and
   confirm "Last successful sync" advances and no `permission-denied` appears.
   `_syncErrorToast()` (`index.html:20300`) already reports that case in plain
   language, and the Diagnostics panel (21060) repeats it.

**Rollback** is the console's previous-version restore, or re-publishing
`firestore.current.rules`. The rollback is safe in one direction only: the data
is untouched by any of this, so a bad rule blocks sync but cannot lose a note.

## 7. The residue check — reported, NOT clean

The instruction was to confirm that the captured notebook ID and note titles are
absent from the candidate's shipped `index.html`. Measured on `f891b52`:

| Captured item | Status |
|---|---|
| The captured Notebook ID | **absent** — 0 occurrences (the value is not repeated here either; see PATHS.md § 3) |
| `aaas-notebook` auth iframes | **absent** — 0 occurrences |
| Real Firebase API key | **absent** — the one `AIzaSy` hit (21112) is the `"AIzaSy..."` placeholder inside the config textarea |
| `ng-non-bindable` / `__/auth/iframe` / `id-recall-widget-root` | **absent** — 0 occurrences |
| **Real note titles** | **STILL PRESENT** |

Line **2918** carries a captured tab bar with two of the owner's note titles —
`Jumu'a Khutbah - TEMPLATE` (as both a `title=` attribute and a `.tab-lbl`) and
`Siyagah FINETUNING` — together with their note ids `mss6ln6ugiw` and
`mscgu6kuhqo`. Line **2931** carries `data-aid="mss6ln6ugiw"` on the
context-menu element. Lines 2769–2908 and 22687–22789 carry captured layout
state (`left: 390px`, `width: 520px`, `display: none;`) — browser-serialised
markup, but no private content.

**Not fixed here.** Removing it edits `index.html`, and the instruction for this
round was to carry the rules, tests and evidence onto the candidate and change
nothing else. It is a one-line-per-site deletion of markup the app rebuilds at
boot, and it belongs in a round that re-runs the full gate against a changed
`index.html`. It is unrelated to the rules: note titles in a public file are not
something any Firestore rule can reach.

`legacy/v03.99/` still carries its own, larger residue. It is sealed by I6 and
was not touched; `ship-check` confirms it is byte-identical to `origin/main`.

## 8. Gates run on this exact tree

All three run against the merge of `f891b52` + this directory, with
`index.html` byte-identical to the candidate's (same md5,
`2478ece0c2d6279780967a1215bb8df7`).

| Gate | Result | Transcript |
|---|---|---|
| `audit/firestore-rules` emulator suite | **48 / 48** | [`evidence/rules-test-output.txt`](evidence/rules-test-output.txt) |
| `node tools/ship-check.mjs` | **11 / 11**, including `legacy/** untouched since origin/main — clean` | [`evidence/ship-check-on-candidate.txt`](evidence/ship-check-on-candidate.txt) |
| `node tools/audit-all.mjs` | **654 checks across 15 suites · 323 matrix rows · All suites green** (PASS 317, BLOCKED—ENVIRONMENT 4, BLOCKED—OWNER 2) | [`evidence/audit-all-on-candidate.txt`](evidence/audit-all-on-candidate.txt) |

Those totals are the candidate's own, unchanged: adding this directory moves no
check.

### One thing the gate caught, and it was mine

`audit-all` regenerates `audit/inventory/`, and its privacy row went from
"63 files scanned" to "71" — because it had started scanning the files added
here. That is what surfaced it: **the first cut of `tests/rules.test.mjs`
hard-coded the owner's real Notebook ID as its fixture.** Under the rule that
is live today that id is the only thing between a signed-in stranger and the
notebook, and this is a public repository — so carrying it into the test would
have re-introduced, in the course of fixing the exposure, the exact value the
candidate had just finished removing from `index.html`.

It is now a synthetic id of the same shape (`nb-mtest000-fixt01`); the shape is
what the rules must accommodate, the value is not. The real id appears nowhere
in this directory, and nowhere in the repository outside the sealed
`legacy/v03.99/` build. The suite was re-run after the scrub: still 48/48.

The regenerated `audit/inventory/` and `audit/FEATURE-MATRIX.md` are committed
as the run produced them, rather than reverted to the candidate's copies, so
the committed matrix describes the committed tree — a matrix that said "63
files" of a tree holding 74 would be exactly the "results table generated from
a run that measured nothing" that `audit/CONTINUATION-2026-09-19.md` warns
about. The only other differences are timestamps and timings.
