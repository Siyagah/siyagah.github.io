# Every Firestore path Siyagah uses

Measured against `index.html` at v04.34 and the sealed `legacy/v03.99/index.html`,
by reading every `collection(…)` / `.doc(…)` call in both files. Line numbers are
`index.html` unless marked.

## 1. The complete surface — two paths, no others

| Path | Operations | Called from |
|---|---|---|
| `notebooks/{notebookId}` | `get` | `initSync()` `onSnapshot` (19541), `syncNow()` (19577), `_reconcileNow()` (20042, `{source:'server'}`), `_migrateNotebook()` (6772) |
| `notebooks/{notebookId}` | `create` / `update` (via `set`, non-merge) | `_writeCloudDB()` (19902, inside a batch), `_migrateNotebook()` (6779) |
| `notebooks/{notebookId}/chunks/{i}` | `get` | `_readCloudDB()` (19881, `{source:'server'}` then `'default'`) |
| `notebooks/{notebookId}/chunks/{i}` | `create` / `update` (via `set`) | `_writeCloudDB()` (19901, batch 1) |
| `notebooks/{notebookId}/chunks/{i}` | `delete` | `_writeCloudDB()` (19904, batch 2) |

`legacy/v03.99/index.html` uses the identical two paths at lines 5746, 5747,
16215, 16256, 16561, 16581, 16584, 16623. **One ruleset covers both builds**, and
the proposal needs no change to either file — which is what lets the sealed build
stay sealed (I6) and keeps the owner's decision to keep data in `legacy/v03.99/`
intact.

Operations that appear **nowhere** in either build, and are therefore denied:

- **`list` / queries.** Neither build ever calls `getDocs`, `query`, `where` or
  `orderBy` on `notebooks` or on `chunks`. Every read is a document read by
  known id. The proposal denies `list` outright, so the collection cannot be
  enumerated at all — not even by the owner.
- **`delete` of the notebook document.** Nothing deletes it. `disconnectSync()`
  (20310) only clears `localStorage`. The proposal denies it, so no client bug
  and no stolen token can erase the notebook in a single call (I1).
- **Anything outside `/notebooks`.** No other collection is touched.

## 2. Document shapes

`notebooks/{id}` — written by `_writeCloudDB()` (19902):

| Field | Type | Meaning |
|---|---|---|
| `n` | number | how many chunks the payload was split into |
| `ver` | number (ms) | the write's version; chunks carry the same value |
| `deviceUpdatedAt` | number (ms) | staleness check on the receiving device |
| `updatedAt` | `serverTimestamp()` | server clock |

`notebooks/{id}/chunks/{i}` — written by `_writeCloudDB()` (19901):

| Field | Type | Meaning |
|---|---|---|
| `p` | string | a ≤900,000-character slice of the base64 payload |
| `ver` | number (ms) | must equal the parent's `ver`, or the read is treated as torn |

**A third, older shape is still read.** `_readCloudDB()` (19865) handles a
notebook carrying `db` (a single JSON blob) instead of `n`:

```js
if(md.n==null && md.db){ try{return JSON.parse(md.db);}catch(e){return null;} }
```

Any ruleset that constrains the notebook document's field set with
`keys().hasOnly([...])` makes that shape unwritable. That is fault 2 of the
strict variant, and it is a live I1 risk, not a theoretical one.

## 3. The finding that decides the whole design

**`notebookId` is not the user's UID, and the rules cannot assume it is.**

`connectSync()` (20298) takes the id from a text input the owner can type into,
falling back to `generateNotebookId()` (20166):

```js
function generateNotebookId(){
  return 'nb-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
}
```

Nothing anywhere assigns `user.uid` to `notebookId`. The comment at 19348 —
`/* UID = private Notebook ID — each Google account gets its own isolated notebook */`
— describes an intent the code does not implement.

The owner's live notebook really is in the `nb-…` form: `index.html` carries a
captured copy of the owner's own sync modal at line 21909, with
`value="nb-msrzuilt-gghlh5"` in the Notebook ID field. The tests use that id.

So the standard Firebase idiom, `request.auth.uid == notebookId`, would **deny
the owner access to their own notebook**. Adopting it would require copying the
document to a new id first — a data move, and an I1 exposure, for no security
gain. The proposal pins the owner's UID instead, which needs no migration and no
application change, and still permits a uid-named document if the app ever
adopts one (tested).

## 4. Two behaviours any ruleset has to survive

**(a) The tail delete.** `_writeCloudDB()` (19904) unconditionally deletes
chunks `n … n+9` to clear the tail of a previously longer payload:

```js
const b2=_syncFsDb.batch();
for(let i=n;i<n+10;i++) b2.delete(nb.collection("chunks").doc(String(i)));
try{ await b2.commit(); }catch(e){}
```

Those documents usually do not exist. On a missing document `resource` is
`null`, so **any `delete` condition that reads `resource.data` raises an
evaluation error and denies**, failing the whole batch. The app swallows the
error (`catch(e){}`), so the symptom would not be a visible failure — it would
be stale chunks accumulating silently, and a torn read the first time the
payload grows back across the stale boundary. The proposal's `delete` rule
therefore touches only `request.auth`.

**(b) Batches are atomic.** Both writes are `writeBatch` commits. One denied
document in a batch fails every write in it, so a rule that is merely *too
strict for one field* takes the entire push down.

## 5. Unrelated observations, recorded but not acted on

Out of scope for this round; listed so they are not lost.

1. **`runMigration()` (6789) never repoints the config.** It copies
   `notebooks/{oldId}` to `notebooks/{user.uid}` and reloads, but never writes
   `notebookId: user.uid` back into `localStorage`. The app therefore keeps
   syncing to the *old* id, and the migrated copy is written once and never read
   again. Under the current blanket rule this is invisible. It is not a rules
   problem and the proposal does not depend on it, but it means the migration
   feature does not do what its UI says.
2. **`index.html` carries captured live DOM.** From line 21885 to the end of the
   file there is a saved copy of the running page: the owner's sync modal with a
   real Notebook ID, four real note titles, and three `aaas-notebook.firebaseapp.com`
   auth iframes carrying the project's Web API key. The API key is public by
   design in Firebase and is not the vulnerability here — the blanket rule is —
   but the note titles and the Notebook ID are the owner's content sitting in a
   public repository, and the iframes are dead markup shipped to every device.
