# Firestore security rules — proposal and test evidence

**For Master Architect review. Nothing here has been published, merged or deployed.**
Drafted 19 Sep 2026 on branch `claude/clever-faraday-ynnoqj`.

---

## In one paragraph

The rule live in the project today lets **any Google account on the internet**
read, overwrite and delete the owner's entire notebook. That is measured below,
not asserted. The proposed replacement grants exactly one Google account, over
exactly the two paths the app uses, and denies everything else to everyone. The
owner's sync keeps working unchanged: the real push/pull cycle, including a
multi-chunk notebook, round-trips byte-identically through the new rules.

**One value must be filled in before it can be deployed** — `OWNER_UID` in
`firestore.rules`. It ships as a literal placeholder on purpose, so the file
cannot be deployed half-configured.

---

## 1. Every Firestore path Siyagah uses

Found by exhaustive grep of `.collection(` and `.doc(` across `index.html` —
eight call sites, no others anywhere in the file. The sealed `legacy/v03.99`
build was inspected too (read only; not touched) and uses **the same two path
shapes and no others**, so these rules cover it as well.

| Path | Written as | Operations the app performs | Call site |
|---|---|---|---|
| `notebooks/{nbId}` | `{n, ver, deviceUpdatedAt, updatedAt}` | `get`, realtime `onSnapshot`, `set` (full overwrite, in a batch) | `index.html:19535`, `19576`, `19899`, `19943` |
| `notebooks/{nbId}` (legacy) | `{db: "<json>", …}` | same; `_readCloudDB` still reads the single-blob shape | `index.html:19878` |
| `notebooks/{nbId}` (migration) | a copy of an older document's fields | `get` old, `set` new | `index.html:6770-6776` |
| `notebooks/{nbId}/chunks/{i}` | `{p: "<base64 slice>", ver}` | `get` by explicit id, `set` in a batch, `delete` of indices `n..n+9` | `index.html:19881`, `19901`, `19904` |

Notes that shaped the rules:

- **No queries anywhere.** Not one `where()`, no collection-group query, no
  `getDocs`. Chunks are always fetched by explicit id, so `list` is never needed.
- **The parent document is never deleted** by either build — the only
  `.delete()` calls on a Firestore document are the chunk tidy-up batch. The
  two `_syncApp.delete()` calls at `index.html:20313`/`20321` delete the
  *Firebase app instance*, not a document.
- **Writes are full overwrites, not merges**, and the migration path copies
  arbitrary fields forward from an older document.

## 2. What the live rule actually permits

Run 1 in the evidence file puts the current rule —
`match /{document=**} { allow read, write: if request.auth != null; }` —
through the same matrix as the proposal. Eleven expectations fail. Eight of them
are the security hole:

```
XX other user   get owner notebook doc          -> ALLOW   (should be DENY)
XX other user   overwrite owner notebook doc    -> ALLOW
XX other user   get owner chunk (the note text) -> ALLOW
XX other user   overwrite owner chunk           -> ALLOW
XX other user   delete owner chunk              -> ALLOW
XX other user   delete owner notebook doc       -> ALLOW
XX other user   list the notebooks collection   -> ALLOW
XX other user   create their own notebook       -> ALLOW
```

"Signed in" is not a restriction here. Firebase Google sign-in accepts any
Google account by default, and the project's `apiKey` ships in the page source
of a public site (`siyagah.github.io`). Anyone who views source can sign in as
themselves and reach the notebook. This is an **I1** ("no note is ever lost")
exposure and a privacy breach at the same time — the intruder can read the notes
*and* wipe them.

The remaining three failures are the proposal being deliberately stricter than
the live rule for the owner as well: it denies deleting the notebook document,
and denies the owner reading or writing outside `/notebooks`.

## 3. Why the rules pin the UID and not the document id

The obvious rule is `nbId == request.auth.uid`. **It would lock the owner out of
their own notebook**, and this is the single most important finding in this round.

`index.html:19349` carries the comment *"UID = private Notebook ID — each Google
account gets its own isolated notebook"*. No code implements it. `cfg.notebookId`
is read from `localStorage['siyagah-sync-v1']`, and it was written by
`connectSync()` (`index.html:20298`) from a free-text input whose default value
is `generateNotebookId()` → `'nb-' + Date.now().toString(36) + '-' + random`
(`index.html:20166`). Unless the owner happened to paste their raw UID into that
box, their notebook is at `notebooks/nb-xxxxx`.

`runMigration()` does copy `notebooks/{oldId}` → `notebooks/{uid}`, but it never
updates the stored `notebookId`, so after a migration the app carries on syncing
to the **old** id. Either way, the document id cannot be assumed equal to the UID.

Measured (Run 3, E1):

```
ok  naive rule: owner writing notebooks/nb-m1x2y3z-a4b5c6  -> DENY
ok  naive rule: owner writing notebooks/owner-uid-0001     -> ALLOW
```

Pinning on `request.auth.uid == OWNER_UID` is correct whatever the notebook id
turns out to be, and it matches **D1** (one user, one Google account). It is also
strictly tighter than the doc-id rule: under the doc-id rule every other Google
account still gets their own writable space in the project; under this one,
nobody else gets anything.

## 4. Test evidence

Real Firestore emulator (`cloud-firestore-emulator-v1.19.8`), driven by
`@firebase/rules-unit-testing` v3. The suite issues the app's actual operations —
the `_writeCloudDB` batch byte for byte, the per-chunk `_readCloudDB` gets, the
tidy-up delete batch — as three principals. Full output:
[`audit/RULES-TEST-EVIDENCE-2026-09-19.txt`](RULES-TEST-EVIDENCE-2026-09-19.txt).

| Run | Rules under test | Result |
|---|---|---|
| 1 | current live rule | 14 passed, **11 failed** — the hole, itemised above |
| 2 | proposed `firestore.rules` | **25 passed, 0 failed** |
| 3 | deployment-risk edge cases | **5 passed, 0 failed** |

**Owner** (11 checks): every operation the app performs is allowed — parent-doc
get and update, chunk get/set/delete, the legacy single-blob write, the migration
copy, and a notebook at a UID-named id as well as a `nb-…` one. Denied on
purpose: deleting the notebook document, and any read or write outside
`/notebooks`.

**Another signed-in Google account** (8 checks): denied on every one — reading
the notebook doc, reading the chunk that holds the note text, overwriting either,
deleting either, listing the `notebooks` collection, and creating a notebook of
their own.

**Signed out** (5 checks): denied on every one.

**Sync still works** (I2). The push/pull cycle was run end to end as two
separate sessions of the owner's account:

```
ok  owner (2 devices)  push from A (1 chunk) then pull on B  -> payload identical
ok  owner push of a 1.81 MB payload as 3 chunks              -> ALLOW
ok  owner tidy-up batch deleting chunks 3..12                -> ALLOW
ok  device B reassembled 3 chunks                            -> byte-identical
```

The multi-chunk case matters because the owner's notebook is very likely past
the 900 KB single-chunk threshold, and it exercises the batch shape (n chunk
docs plus the parent, one commit) that a one-chunk test does not.

## 5. Decisions taken, and what was deliberately left out

**Denying delete on the notebook document.** No code path in either build
deletes it, so denying costs nothing and puts one more lock between a stray call
and I1. If the Master Architect would rather keep the operation available for
manual cleanup from the console, note that console access uses admin
credentials and bypasses rules entirely — so this denial does not obstruct the
owner there either.

**No field or schema validation.** It is tempting to assert that `n` is an
integer and `p` is a string. I left it out and want that decision reviewed
rather than assumed: `_migrateNotebook` writes `{...oldSnap.data()}` — arbitrary
fields copied forward from a document written by an older build — and a rejected
write is a **failed sync**, which under I1/I2 is worse than a permissive write
from the only account that can write at all. Authorization is the job here;
schema is not. A strict variant can be drafted and tested if wanted.

**The `OWNER_UID` placeholder is not filled in.** I do not have the owner's
Google UID, and guessing it would be the one mistake that locks them out. The
rules file says where to find it (Firebase console → Authentication → Users, or
`firebase.app('siyagah-main').auth().currentUser.uid` in the console while
signed in).

## 6. Two defects found in passing — reported, not fixed

Neither is in scope for this round; both are recorded here so they are not lost.

1. **`runMigration()` does not update the stored notebook id.** It copies data
   to `notebooks/{uid}` and reloads, but `cfg.notebookId` is untouched
   (`index.html:6795-6810` vs `20298`), so the app resumes syncing to the old
   id and the migrated copy is never read. The migration appears to succeed and
   silently does nothing.
2. **`index.html:19349`'s comment is false.** "UID = private Notebook ID" is not
   what the code does, and it is precisely the belief that would produce the
   lock-out rule in §3. Worth correcting in the source whatever is decided here.

## 7. If this is approved — deployment order

Sequence matters. A wrong `OWNER_UID` stops sync on every device at once.

1. Fill in `OWNER_UID` from the Firebase console.
2. Paste the rules into the Firebase console's **Rules Playground** first and
   run one read against the owner's real notebook path as the owner's UID.
3. Publish, then immediately open the app on one device and confirm the sync
   dot reads **☁ Live** and an edit reaches a second device.
4. If the dot reads **☁ Err**, the app's own diagnostics panel (⚙ → Cloud Sync)
   already names `permission-denied` explicitly and says to check the rules —
   revert to the previous rule in the console's rule history and re-check the
   UID.

## 8. Reproducing the tests

```bash
npm install firebase-tools@13 @firebase/rules-unit-testing@3
npx firebase setup:emulators:firestore
npx firebase emulators:start --only firestore --project siyagah-rules-test &
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
cd audit
node rules-check.mjs ./firestore.rules.current "CURRENT LIVE RULE"
node rules-check.mjs ../firestore.rules            "PROPOSED RULES"
node edge-check.mjs
```

`rules-check.mjs` exits non-zero if any expectation fails; against the live rule
it is *expected* to fail 11, which is the point of Run 1.

---

## Files in this round

| File | What it is |
|---|---|
| `firestore.rules` | **the proposal** — not deployed, `OWNER_UID` placeholder unfilled |
| `audit/FIRESTORE-RULES-REVIEW-2026-09-19.md` | this document |
| `audit/RULES-TEST-EVIDENCE-2026-09-19.txt` | raw output of all three runs |
| `audit/rules-check.mjs` | the 25-check matrix (owner / other user / signed out / sync) |
| `audit/edge-check.mjs` | naive-rule lock-out and multi-chunk sync checks |
| `audit/firestore.rules.current` | the live rule, reproduced as evidence — never deploy |
| `audit/naive-rule-rejected.rules` | the doc-id rule, kept to show why it was rejected |

No application file was changed this round. `index.html`, `sw.js`,
`manifest.json` and `legacy/v03.99/` are all untouched.
