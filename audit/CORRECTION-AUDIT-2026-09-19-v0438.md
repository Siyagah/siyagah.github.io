# Siyagah — Correction Round, v04.38

**Date:** 19 September 2026
**Branch:** `claude/elegant-maxwell-8maykf`
**Reviewed head (the state this round corrects):** `817da3c08df0edd7b9a8e6e1377adf149fd64721` (v04.37)
**Delivered head:** see §8 — recorded after the final push, with the real SHA
**Review acted on:** *Siyagah v04.37 — Master Architect review*, 19 September 2026
**Merged / deployed:** **no** — and nothing in `legacy/`, and no production Firebase data touched

---

## 1. For the owner, in plain language

Your architect reviewed the "Safety Copies" feature that the last round built,
and found two faults in it. **Both were real. I reproduced both before
changing anything, and both are now fixed and proved fixed.**

What the feature is for: before anything replaces your notes — an import, or
restoring an older copy — Siyagah takes a **safety copy** first, so there is
always a way back.

**Fault 1 — the way back could be missing at the exact moment you were told it
existed.** When you restore a safety copy, Siyagah is supposed to save a fresh
copy of what you have *now* first, so you can undo the restore. It tried, and
if that save failed — no room left, or the browser refusing — **it carried on
anyway and replaced your notes.** The message you had just read said "a fresh
safety copy of what you have now is taken first, so this can be undone". It
said that at the moment it stopped being true, and the replacement was then
sent to your other devices.

> Now: if the safety copy cannot be made, **nothing is changed at all** — not
> your notes, not this browser's storage, and nothing is sent to your other
> devices. You are told why, and asked what you want to do. You can still go
> ahead if you want to, but you have to say so, and the message afterwards
> says plainly that it was done *without* a way back.

**Fault 2 — the check on the copy was checking the wrong thing.** After
writing a safety copy, Siyagah reads it back to make sure it arrived intact.
It was comparing the copy's *description of itself* — its recorded size and
fingerprint — instead of re-examining the actual contents. A copy that came
back damaged, but at the same size, passed as good. It would then be refused
later, when you actually tried to restore it, because that step *does* look at
the contents. So the app could tell you a copy was verified and then refuse
the same copy afterwards.

> Now: the fingerprint is recalculated from the bytes that came back, and the
> contents are compared in full. A damaged copy is refused straight away. An
> undamaged copy is separately proved to still pass, so the check cannot be
> "fixed" by simply refusing everything.

**And the wording.** Your architect asked for the limits of this feature to be
stated where you would actually read them. The Safety Copies screen now says
that these copies live **in this browser on this device only**, that they are
**not** on your other devices and **not** in the cloud, that clearing your
browsing data or using a different browser or profile **removes them**, and
that only the last 5 are kept. For a copy that survives all of that, it points
you to **📦 Save File** — and says honestly that Siyagah hands that file to
your browser but **cannot confirm your browser finished saving it**, so you
should check your downloads yourself.

**You do not need to test any of this.** Everything above is checked
automatically, every time.

---

## 2. Defect C1 — Restore went ahead when the undo copy had not been made

**Severity: High. Invariant I1** ("no note, folder or section is ever lost or
silently changed"). **D3 does not excuse it** — this is not a deliberate
deletion through Trash.

### The code, as reviewed

```js
/* Undo needs an Undo: snapshot what is here before replacing it. */
await _recoverySave('before restoring a safety copy');
const rp=_repairDB(parsed,'recovery');
DB=rp.db||parsed; persist(); render();
```

`_recoverySave()` is careful: it returns `{ok:false, err}` when the store is
full, locked, or denied by policy, rather than throwing. Nothing read it. The
review's description of the mechanism was exactly right.

### Reproduced on `817da3c`, before any change

`audit/repro/recovery-undo-precondition.mjs` — the store is allowed to serve
the restore's own read and denied from the second `open()` onward, which is
what a full or locked store does to the undo copy:

```
=== D1: Restore when the undo copy cannot be written ===
  notes in DB      : 1 -> 3
  notes in storage : 1 -> 3
  cloud pushes     : 1
  threw            : (nothing — it went ahead)
  VERDICT          : *** DEFECT: the notebook was replaced with no undo copy ***
```

Three separate harms in one line: the notebook replaced, `localStorage`
rewritten, and a push scheduled so the other devices receive it.

### The fix

The undo copy is a **precondition**, not a courtesy.

- `_recoveryRestore()` reads what `_recoverySave()` returned. No verified
  copy → it throws a **named** `RecoveryUndoError` and touches nothing.
- Proceeding is still possible — an owner told there is no way back may still
  want to go forward — but only via `_recoveryRestore(id, {allowNoUndo:true})`,
  reached through a **separate explicit choice**: a card stating that their
  notes have **not** been changed, that there will be **no way back**, with
  `Stop — change nothing` focused, Escape and backdrop both cancelling.
- The result carries `undoOk`, and the toast says `WITHOUT an undo copy, as
  you chose` — a restore with no undo must not read like one that had one.
- The first confirmation no longer promises what it cannot guarantee: it now
  says that if the copy cannot be made, nothing will change and you will be
  asked.

### After

```
  notes in DB      : 1 -> 1
  notes in storage : 1 -> 1        (compared as raw bytes, not note counts)
  cloud pushes     : 0
  threw            : a safety copy of what you have now could not be made
                     (this browser would not open the safety store: …),
                     so nothing was changed
  VERDICT          : HELD — nothing changed
```

---

## 3. Defect C2 — The save gate compared metadata with metadata

**Severity: High.**

### The code, as reviewed

```js
const back=await _recoveryTx(db,'readonly',st=>st.get(rec.id));
if(!back) return {ok:false, err:'the safety copy could not be read back'};
if(back.bytes!==rec.bytes||back.hash!==rec.hash||back.json.length!==json.length)
  return {ok:false, err:'the safety copy read back differently from what was written'};
```

Reading back in a separate transaction is the right idea and was the point of
v04.37's fix. But `back.bytes` and `back.hash` are **metadata written in the
same `put()` as the payload** — comparing them against `rec.bytes`/`rec.hash`
asks the record to confirm its own description. The only property of the
payload itself that was ever measured is its **length**.

The sharpest way to see it: `_recoveryRestore()` *does* hash the real string
(`_fnv1a(rec.json)!==rec.hash`). So the two halves of the same feature
disagreed about whether a copy was usable — and the destructive path trusted
the half that had not looked.

### Reproduced on `817da3c`

A payload corrupted **on the way back** at the same length, metadata intact:

```
=== D2: read-back bytes changed, metadata intact ===
  save reported ok : true
  error            : (none)
  VERDICT          : *** DEFECT: a corrupted copy passed the save gate ***
```

### The fix

```js
if(typeof back.json!=='string')
  return {ok:false, err:'the safety copy read back without its contents'};
if(back.json.length!==json.length||back.json!==json||_fnv1a(back.json)!==rec.hash
   ||back.bytes!==rec.bytes||back.hash!==rec.hash)
  return {ok:false, err:'the safety copy read back differently from what was written'};
```

The digest is recomputed **from `back.json`** and the full string compared.
After: `save reported ok : false`. And the honest case is asserted separately
to still pass, so the gate cannot be satisfied by refusing everything.

---

## 4. C3 — Claims brought back to what the code does

| Claim | Before | Now |
|---|---|---|
| Where safety copies live | not stated | "in this browser on this device only", **not** on other devices, **not** in the cloud |
| How they can be lost | not stated | clearing site data, clearing browsing data, a private window, or a different browser/profile **removes them** |
| How many are kept | not stated | "only the last 5 are kept — an older one is deleted when a new one is made" |
| The downloaded file | offered | offered, **and** "Siyagah hands that file to your browser but cannot confirm your browser finished saving it, so check your downloads folder yourself" |
| Restore's promise | "a fresh safety copy … is taken first, so this can be undone" | "…and if that copy cannot be made, nothing will be changed and you will be asked what to do" |
| Salvage | "kept **verbatim** … so nothing is discarded" | bounded — 64 KB per entry, 256 KB in total, older entries pruned to metadata; the guarantee restated as *nothing is discarded **silently***, not *every byte survives* |

The Safety Copies wording is asserted on the **rendered text**, so a later
rewrite that drops one of these limits fails a check rather than being noticed
by a reviewer.

---

## 5. The regression evidence the review asked for

The review specified four scenarios. All four are permanent checks in
`tools/audit-j-recovery.mjs`, which goes **41 → 45 rows**. Every one asserts
on **persisted bytes** or on **whether a cloud push was scheduled** — never on
the return value of the call under test, which is precisely what defect C1
was.

| The review asked for | Check | Result |
|---|---|---|
| "Simulate a denied/quota write on Restore and assert storage bytes and sync scheduling are unchanged" | `a restore whose undo copy cannot be written changes NOTHING that is persisted` (raw-byte comparison of `localStorage`) + `…and schedules no cloud push` (push counter) + `…and says so, with an error the caller can offer a choice on` | ✅ ×3 |
| "Simulate same-length corruption of read-back JSON while keeping metadata unchanged and assert the copy fails" | `a same-length changed payload with intact metadata is REFUSED by the save gate` + `…while an untampered copy still passes it` | ✅ ×2 |
| "Verify a successful Restore creates a working undo copy, and that restoring the undo returns the previous notebook" | `restoring a copy takes a VERIFIED undo copy first` + `restoring that undo puts the previous notebook back, in storage as well as in memory` (`3 → 1 → 3 → 1`) | ✅ ×2 |
| "…and all cancellation paths" | `Cancel at the restore confirmation leaves the notebook and storage untouched` + `a failed undo copy offers a real choice rather than silently proceeding or dead-ending` + `…and pressing "Stop — change nothing" changes nothing that is persisted` (a **real click** on the button) | ✅ ×3 |
| (beyond the ask) | `restoring without an undo copy works when it is explicitly chosen, and reports that it had none` | ✅ |
| (beyond the ask) | `the Safety Copies screen says where the copies live and how they can be lost` | ✅ |

**One of these failed on its first run, and it was the check that was wrong,
not the app.** The block before it deliberately leaves the notebook at one
note, so the snapshot it took held one note and "restored to 3" could never be
true. That is the harness's own standing trap — a check measuring the previous
check's leftovers — and the block is self-contained now. It is recorded here
because a suite that is only ever reported green teaches nobody anything.

---

## 6. Full gate

`node tools/audit-all.mjs`, run locally on the delivered tree — **exit 0**,
raw output in `audit/evidence/v0438-03-audit-all-AFTER.txt`:

| Suite | v04.37 | v04.38 |
|---|---:|---:|
| `ship-check` — version, `#nd`, precache, manifest, `legacy/**` seal | 11/11 | **11/11** |
| `app-check` — boot, handlers, panes, views, editor, exports, colour | 290/290 | **290/290** |
| audit A — shell, startup, corruption recovery, breakpoints | 43 | **43** |
| audit B — editor ownership, autosave flushing, note lifecycle | 47 | **47** |
| audit C/D — organisation, search, all 11 Smart Views | 49 | **49** |
| audit E/F — calendar, journal, contacts, database, reminders, review | 31 | **31** |
| audit G/H — export fidelity, import safety, privacy, merge | 44 | **44** |
| audit I — accessibility, security, privacy, scale, PWA | 46 | **46** |
| **audit J — salvage, consent, the verified recovery copy** | 41 | **45** |
| audit K — rollback, both directions | 18 | **18** |
| journeys — 24 principal journeys, real clicks | 24/24 | **24/24** |
| persistence — what the app writes survives a real reload | 6/6 | **6/6** |
| **Total** | 642 | **654 checks across 15 suites** |

**Feature matrix: 323 rows — 317 PASS, 4 `BLOCKED—ENVIRONMENT`, 2
`BLOCKED—OWNER`, 0 FAIL.** The matrix is assembled by `audit-all` from the
checks that actually ran, so no row can be written by hand, and a suite that
never started is named `NEVER RAN` rather than silently omitted.

Only audit J changed. Every other suite is identical to v04.37, which is the
result this round wanted: a correction that fixes what the review found and
moves nothing else.

Version bumped **v04.37 → v04.38** in all three required places (`<meta
name="app-version">`, the `.sb-logo` pre-boot tag, and `sw.js`'s `VERSION`,
which is the cache name — without it the update never reaches a device).

---

## 7. Still unverified, and still the owner's

Unchanged by this round, and stated as the review requires:

- **Live Firestore security rules — NOT VERIFIED.** No access from here. This
  remains the single most important owner item.
- **Real two-device sync — NOT VERIFIED.** Cannot be measured in this
  environment.
- **The deployed PWA — NOT VERIFIED.** This sandbox's egress policy denies
  `siyagah.github.io` (`403` on `CONNECT`), so the live site cannot be loaded.
- **`legacy/v03.99/` still carries the v04.35 residue** — the sign-in iframes,
  the API key, the notebook ID and one real note title, at a public URL. I6
  seals that folder, so nothing in it was touched. Decision 1, still open. The
  standing recommendation is unchanged: remove only the residue and record the
  exception.

---

## 8. The delivered head, and the CI run

*(Filled in after the final push — see the end of this file.)*
