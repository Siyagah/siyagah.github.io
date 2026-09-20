# Every Firestore path Siyagah uses

**Re-measured on the v04.38 release candidate** (`f891b52`) on 20 September
2026, after the Master Architect approved the design. The surface was first
measured on v04.34; v04.36–v04.38 added the recovery, import and rollback work,
so nothing below was carried over on trust — every call site was found again.
Line numbers are `index.html` at `f891b52` unless marked.

**Nothing moved.** Same two paths, same operations, same document shapes, same
absence of queries. The finding in § 3 that decides the design holds verbatim.

## 1. The complete surface — two paths, no others

| Path | Operations | Called from |
|---|---|---|
| `notebooks/{notebookId}` | `get` | `initSync()` `onSnapshot` (20381), `syncNow()` (20416), `_reconcileNow()` (20895, `{source:'server'}`), `_migrateNotebook()` (7561) |
| `notebooks/{notebookId}` | `create` / `update` (via `set`, non-merge) | `_writeCloudDB()` (20755, inside a batch), `_doPush()` (20796), `_migrateNotebook()` (7562) |
| `notebooks/{notebookId}/chunks/{i}` | `get` | `_readCloudDB()` (20734, `{source:'server'}` then `'default'`) |
| `notebooks/{notebookId}/chunks/{i}` | `create` / `update` (via `set`) | `_writeCloudDB()` (20754, batch 1) |
| `notebooks/{notebookId}/chunks/{i}` | `delete` | `_writeCloudDB()` (20757, batch 2) |

`legacy/v03.99/index.html` uses the identical two paths at lines 5746, 5747,
16215, 16256, 16561, 16581, 16584, 16623 — unchanged, because it is sealed
(I6). **One ruleset covers both builds**, and the proposal needs no change to
either file.

### The sweep that proves "no others"

Run against `f891b52`, not inferred:

- every `collection(…)` string literal in `index.html`: `notebooks` ×5,
  `chunks` ×3. No other collection exists.
- `collectionGroup`, `runTransaction`, `getDocs`, `.where(`, `.orderBy(`,
  `.limit(`: **no matches**. Neither build ever queries. Every read is a
  document read by known id, so the proposal denies `list` outright and the
  collection cannot be enumerated at all — not even by the owner.
- `delete` of the notebook document: no call site. `disconnectSync()` (21177)
  only clears `localStorage`. Denied, so no client bug and no stolen token can
  erase the notebook in one call (I1).
- Anything outside `/notebooks`: nothing touches it.

## 2. Document shapes

`notebooks/{id}` — written by `_writeCloudDB()` (20755):

| Field | Type | Meaning |
|---|---|---|
| `n` | number | how many chunks the payload was split into |
| `ver` | number (ms) | the write's version; chunks carry the same value |
| `deviceUpdatedAt` | number (ms) | staleness check on the receiving device |
| `updatedAt` | `serverTimestamp()` | server clock |

`notebooks/{id}/chunks/{i}` — written by `_writeCloudDB()` (20754):

| Field | Type | Meaning |
|---|---|---|
| `p` | string | a ≤900,000-character slice of the base64 payload |
| `ver` | number (ms) | must equal the parent's `ver`, or the read is treated as torn |

**A third, older shape is still read.** `_readCloudDB()` (20718) handles a
notebook carrying `db` (a single JSON blob) instead of `n`:

```js
if(md.n==null && md.db){ try{return JSON.parse(md.db);}catch(e){return null;} }
```

Any ruleset that constrains the notebook document's field set with
`keys().hasOnly([...])` makes that shape unwritable. That is fault 2 of the
strict variant, and it is a live I1 risk, not a theoretical one.

## 3. The finding that decides the whole design

**`notebookId` is not the user's UID, and the rules cannot assume it is.**
Still true on `f891b52`.

`connectSync()` (21157) takes the id from a text input the owner can type into,
falling back to `generateNotebookId()` (21025):

```js
function generateNotebookId(){
  return 'nb-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
}
```

A grep for every assignment to `notebookId` on `f891b52` returns exactly one
line — 21157, the text input. Nothing anywhere assigns `user.uid` to it. The
comment at 20188 —
`/* UID = private Notebook ID — each Google account gets its own isolated notebook */`
— describes an intent the code does not implement.

The owner's live notebook is in the `nb-…` form. The value itself was captured
in the v04.34 build's residue and has since been removed from the shipped file
(§ 5.2); **it is deliberately not reproduced anywhere in this directory**,
because under the rule that is live today that id is the only thing between a
signed-in stranger and the notebook, and this is a public repository. The tests
use a synthetic id of the same shape — the shape is what the rules must
accommodate, the value is not.

So the standard Firebase idiom, `request.auth.uid == notebookId`, would **deny
the owner access to their own notebook**. Adopting it would require copying the
document to a new id first — a data move, and an I1 exposure, for no security
gain. The proposal pins the owner's UID instead, which needs no migration and
no application change, and still permits a uid-named document if the app ever
adopts one (tested).

## 4. Two behaviours any ruleset has to survive

**(a) The tail delete.** `_writeCloudDB()` (20757) unconditionally deletes
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
payload grew back across the stale boundary. The proposal's `delete` rule
therefore touches only `request.auth`.

**(b) Batches are atomic.** Both writes are `batch()` commits. One denied
document in a batch fails every write in it, so a rule that is merely *too
strict for one field* takes the entire push down.

## 5. Observations recorded, not acted on

Out of scope: the Master Architect's instruction for this round was to carry
the rules, tests and evidence onto the candidate and change nothing else.

1. **`runMigration()` (7577) still never repoints the config.** It copies
   `notebooks/{oldId}` to `notebooks/{user.uid}` via `_migrateNotebook()` and
   reloads, but never writes `notebookId: user.uid` back into `localStorage`.
   The app therefore keeps syncing to the *old* id, and the migrated copy is
   written once and never read again. Re-checked on `f891b52`: unchanged. It is
   not a rules problem and the proposal does not depend on it, but it means the
   migration feature does not do what its UI says — and it is the reason the
   uid-as-document-id scheme (PROPOSAL § 5.1) cannot simply be adopted.
2. **The captured live DOM in the shipped `index.html` is now only partly
   cleaned.** On v04.34 the file carried a saved copy of the running page from
   line 21885 to EOF. On `f891b52` the notebook id, the auth iframes and the
   project's API key are **gone**. What remains, measured:
   - line **2918** — a captured tab bar carrying two real note titles,
     `Jumu'a Khutbah - TEMPLATE` (in a `title=` attribute and a `.tab-lbl`)
     and `Siyagah FINETUNING`, with their note ids `mss6ln6ugiw` and
     `mscgu6kuhqo`;
   - line **2931** — `<div id="ctx" … data-aid="mss6ln6ugiw">`, a note id on
     the context-menu element;
   - lines 2769–2908 and 22687–22789 — captured layout state
     (`style="left: 390px;"`, `width: 520px`, `display: none;`), which is
     browser-serialised markup but carries no private content.

   The one `AIzaSy` hit (21112) is the placeholder text inside the config
   textarea, not a key. `mywall-style` (22794) is the app's own stylesheet.
   See PROPOSAL § 7 — this is reported, not fixed.
