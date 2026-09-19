# Proposed Firestore security rules — for Master Architect review

**Status: drafted and tested, NOT published.** Nothing has been deployed, no
rule has been changed on the live project, and nothing has been merged.

---

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

The only thing the live rule does block is a signed-out client.

One further point the architect should weigh: `index.html` is a public
repository file, and from line 21885 it contains a captured copy of the owner's
running page — including the real Notebook ID (`nb-msrzuilt-gghlh5`) and the
project's auth endpoint. Under the live rule, the notebook id is the only thing
standing between a signed-in stranger and the notebook, and it is published.

## 2. The proposal

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

**(a) Ownership is pinned to a UID, not to the document id.** The Firebase idiom
`request.auth.uid == notebookId` does not apply to this app. `notebookId` is a
free-form string the owner typed or generated (`nb-<base36>-<rand>`), and the
live notebook uses that form; the code comment claiming "UID = private Notebook
ID" (19348) describes an intent the code never implemented. Requiring
`uid == notebookId` would lock the owner out of their own notebook until the
document were copied to a new id — a data move, and an I1 exposure, for no
security gain. Pinning the UID needs **no migration and no application change**,
so v04.34 and the sealed `legacy/v03.99/` build both keep working untouched.
The rules still permit a uid-named document, so adopting that scheme later
needs no rules change (tested).

**(b) `list` is denied everywhere, including to the owner.** Neither build ever
queries a collection — every read is a document read by known id. Denying
`list` removes the enumeration surface entirely.

**(c) `delete` of the notebook document is denied, including to the owner.**
Nothing in either build deletes it. Denying it means no client bug, and no
stolen token, can erase the notebook in one call (I1). Deliberate deletion of
*notes* is unaffected — that is Trash, inside the payload, and never a
Firestore delete (D3).

**(d) No payload validation.** Tempting, and wrong here — see § 4.

Everything outside `/notebooks` is denied by omission: there is no
`match /{document=**}` at all.

## 3. Evidence

`npm test` in this directory, against the real Firestore emulator:
**48 checks, 48 passing.** Full transcript:
[`evidence/rules-test-output.txt`](evidence/rules-test-output.txt).

The sync tests are not mock-ups — `writeCloudDB` / `readCloudDB` in the suite are
transcribed from `index.html` 19860–19906, batch shape included, so what the
emulator evaluates is what the application sends.

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
which makes the legacy single-blob shape (`db`, still read at 19865) permanently
unwritable — a direct I1 risk.

The general lesson for the rules, recorded in the file itself: **a rule that
reads `resource` on a delete is a rule that fails on documents that are not
there**, and the failure is silent.

## 5. Decisions the architect needs to take

1. **Approve the UID pin, or require the uid-as-document-id migration instead.**
   The pin ships today with no data movement. The migration is the more
   idiomatic long-term shape but is a separate round: it needs `runMigration()`
   fixed first (§ 5.1 of PATHS.md — it copies the data but never repoints the
   local config, so today it would leave the app syncing to the old id).
2. **Confirm that denying `delete` on the notebook document is wanted.** It is a
   deliberate one-way door: recovering from it means a console edit. The
   alternative is `allow delete: if isOwner()`, which restores a single call
   that erases everything.
3. **Confirm D1 is still literal.** The rules give no other account a notebook
   of its own. If a second account is ever wanted, this is the line that changes.
4. **Optional: pin the sign-in provider** —
   `request.auth.token.firebase.sign_in_provider == 'google.com'`. It adds
   little, since a UID is unique per project and an anonymous or email/password
   user cannot hold the owner's UID, but it would block a token minted through a
   provider the owner did not intend to enable. Not in the proposal; say the
   word and it is one clause.

## 6. What publishing would involve — when approved

Not done, and not to be done without the architect's word.

1. Get the owner's UID: Firebase console → project `aaas-notebook` → Build →
   Authentication → Users → the owner's Google row → copy **User UID**
   (28 characters; not the email, not the Notebook ID).
2. Replace the single `OWNER_UID` placeholder in `firestore.rules`.
3. Re-run `npm test` with that value to confirm nothing else moved.
4. Publish via the Firebase console (Firestore Database → Rules), or
   `firebase deploy --only firestore:rules`.
5. Verify on a real device: open Siyagah, ⚙ → Cloud Sync → Diagnostics, and
   confirm "Last successful sync" advances and no `permission-denied` appears.
   `_syncErrorToast()` (19461) already reports that case in plain language.

**Rollback** is the console's previous-version restore, or re-publishing
`firestore.current.rules`. Worth noting the rollback is safe in one direction
only: the data is untouched by any of this, so a bad rule blocks sync but
cannot lose a note.
