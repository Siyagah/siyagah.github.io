# Firestore rules audit — how to run it

Nothing in this directory is part of the application. It is a proposal plus the
proof behind it. No file here is deployed, and the app does not read any of it.

| File | What it is |
|---|---|
| `PROPOSAL.md` | **Start here.** The recommendation, for Master Architect review. |
| `PATHS.md` | Every Firestore path both builds use, measured, with line numbers. |
| `firestore.rules` | The proposed ruleset. Carries one `OWNER_UID` placeholder. |
| `firestore.current.rules` | The rule live on the project today, so the suite can show what it permits. Do not publish. |
| `firestore.strict.rules` | An over-validated variant, kept because the suite proves it breaks sync. Do not publish. |
| `tests/rules.test.mjs` | 48 checks against the real Firestore emulator. |
| `evidence/rules-test-output.txt` | The transcript of the last run. |

## Running it

Needs Node and a JVM (the Firestore emulator is a jar; `firebase-tools`
downloads it on first run).

```bash
cd audit/firestore-rules
npm install
npm test
```

Exits non-zero if any check fails. The run rewrites
`evidence/rules-test-output.txt`.

## Two things to know before editing the suite

- **The `OWNER_UID` placeholder is load-bearing.** The tests read the rules
  files off disk and substitute the placeholder for a fixture UID, so what the
  emulator evaluates is the file as written rather than a second copy that could
  drift from it. If the placeholder is missing — because someone pasted a real
  UID in — `rulesFor()` throws and refuses to run. Do not commit a real UID.
- **`writeCloudDB` / `readCloudDB` in the suite are transcriptions**, from
  `index.html` 19860–19906. If the app's chunking changes, they must change with
  it, or the suite will be proving something about code that no longer exists.
  The batch shape is part of the transcription: batch 1 writes the chunks and
  the notebook document, batch 2 deletes chunks `n … n+9`, and Firestore batches
  are atomic, so a rule that denies one document in a batch fails all of it.
