@claude

# R1 — Reminder emails, through a helper in the owner's own Google account (v05.06)

**The owner (10 Oct 2026), in their words:** "What it takes to get a email notification about a reminder?". After three options were put to them: "Bismillah! go with option 2". Option 2 is a small helper in their own Google account (Google Apps Script). It runs every few minutes and emails them, from their own Gmail to themselves, when a note's reminder comes due. It is free, needs no card, and works with every device switched off.

Read `CLAUDE.md` first (the sync section, `DB.theme` stamps, I1–I8, D5). **Today a reminder (`art.reminder={dt,msg}`, see `openReminderModal`/`saveReminder`) is shown only inside the app.** Nothing runs when the app is closed. This round adds the email path. It changes nothing about how reminders are set or shown.

## 0. Record debt from v05.05 — FIRST, its own commit, push at once
In the v05.04 `CHANGELOG.md` entry, put the Architect's totals as its **Totals (Architect)** line, exactly:
`**Totals (Architect):** full \`app-check\` **__C__, twice in a row** on \`af08e1b\` (after three review rounds: Save File strips Jeb surfaces and restores the head; \`--jeb-hd\` default, the v04.20 menu inventory, the data-tag literal); \`ship-check\` 14/14; unpatched (v05.03 \`index.html\` + \`sw.js\`) \`--only 65\` 0/3 (\`_JEB_APP is not defined\`).`
In `CLAUDE.md`'s v05.04 line, add: `Architect: full \`app-check\` **__C__, twice in a row**; unpatched \`--only 65\` 0/3.`
Bump to **05.06** in all three places in the same commit. Commit, **push**.

## 1. What to build

### 1a. The setting
`DB.theme.remindMail = {on:bool, hour:0–23}`. It defaults to off, and the default hour is 8. It is a plain-object theme key, so it syncs per sub-key with nothing extra (see `CLAUDE.md`, `DB.theme`). Turning it on on one device turns it on for all of them.

### 1b. What the app writes: one small cloud doc
While `remindMail.on`, each device that is signed in and syncing keeps **one** Firestore doc up to date: `notebooks/{nb}/remind/v1`, holding `{j: <JSON string>, at: serverTimestamp, b: '<app version>'}`.
- `j` = `{v:1, hour, list:[{id, title, msg, dt, at}]}`. It holds every note with `reminder.dt` that is **not in Trash** and whose due time falls between now − 2 days and now + 60 days, sorted by `at`. `at` is the absolute due time in ms: a `dt` with a time is turned into an absolute time by the device (`new Date(dt)` in the device's zone); a date-only `dt` gets `hour:00` local that day. `title` is the note's title, trimmed to 120 characters.
- Compute it from the merged `DB`, so every device writes the same list. Write only when the list's signature changes (and once after a boot or turning it on), debounced by about 5 s, and only through the same "signed in, reader caught up" gate the recs writer uses (`_s1WriteGate()` or its equivalent). Never write it before the first read: a stale device must not write an old list.
- **It is not part of `recs`, the blob, `_S1_COLLS`, the merge or the backup.** The app never reads it back. A refused or failed write never fails a push. It shows in the panel (1d) in plain words and is retried on the next change.
- Off → stop writing, and write `{j: {v:1, hour, list:[]}, off:true}` once, so the helper goes quiet.

### 1c. The helper (Apps Script), text kept inside `index.html`
Two blocks of text, built by one function, so a downloaded copy has them too (I4):
- **`Code.gs`**, pre-filled with `PROJECT_ID` (from `cfg.firebaseConfig.projectId`) and `NOTEBOOK_ID` (`cfg.notebookId`):
  - `setup()`: removes its own old triggers, adds a time trigger `check` every 5 minutes, reads the doc once, and sends a test email: "Siyagah reminder emails are on — N upcoming reminders (next: <title>, <date time>)". On failure it throws an Error whose message says in plain words what to do. 403: "this Google account can't read the Siyagah notebook — sign in with the account that owns the Firebase project". 404: "the app hasn't sent the reminder list yet — turn Reminder emails on in Siyagah, wait a minute, run setup again".
  - `check()`: reads the doc with `UrlFetchApp` + `ScriptApp.getOAuthToken()` from the Firestore REST API (`https://firestore.googleapis.com/v1/projects/<P>/databases/(default)/documents/notebooks/<NB>/remind/v1`). For each item with `at <= now` and `at > now − 36 h` that is not already sent, it sends one email with `MailApp.sendEmail` to `Session.getEffectiveUser().getEmail()` and records `id|at` as sent in `PropertiesService.getScriptProperties()`. Entries older than 4 days are pruned. Editing the time makes a new `id|at`, so it emails again. A network or server error is quiet (the next run retries). `off:true` sends nothing.
  - The email: subject `🔔 <msg or title>`; body with the note title, the due date/time in words, the message, and a link `https://siyagah.github.io/?open=<id>` (v05.04's `?open=`). Plain text plus a simple HTML body.
- **`appsscript.json`**: `timeZone` from the device (`Intl.DateTimeFormat().resolvedOptions().timeZone`), `exceptionLogging: STACKDRIVER`, `runtimeVersion: V8`, and `oauthScopes` exactly: `https://www.googleapis.com/auth/script.external_request`, `https://www.googleapis.com/auth/datastore`, `https://www.googleapis.com/auth/script.send_mail`, `https://www.googleapis.com/auth/script.scriptapp`, `https://www.googleapis.com/auth/userinfo.email`.

### 1d. The panel: 🔔 Reminder emails
Reachable from 🧰 → "🔔 Reminder emails" **and** from the reminder dialog (`openReminderModal`), as a small "📧 Email me reminders: On / Set up" line. Use the app's own modal: on PC and tablet a dialog, on a phone a sheet (D5; state each shape in the CHANGELOG). Contents:
- An **On/off** switch and the **morning hour** for date-only reminders.
- **State, in words:** "N upcoming reminders sent to the cloud · last sent <time>", or the plain reason it couldn't send (not signed in to sync / refused / offline).
- **Set up, once (best on a laptop)**, numbered, each with a big button:
  1. **Copy the helper** (copies `Code.gs`).
  2. **Open Google Apps Script**: opens `https://script.google.com/home/projects/create` in a new tab.
  3. "Select everything in the editor and paste."
  4. "⚙ Project Settings → tick 'Show appsscript.json' → back to the editor → open appsscript.json." **Copy the settings file** (copies `appsscript.json`) → "select everything there and paste".
  5. "💾 Save, choose `setup` in the list at the top, press ▶ Run."
  6. "Google asks for permission. It warns 'Google hasn't verified this app' — this is your own helper. Press **Advanced → Go to (unsafe) → Allow**."
  7. "You'll get an email 'Siyagah reminder emails are on'. That's it."
- If sync isn't set up on this device, say that sync is needed and point to its setup; don't show the steps.
- A copy button that fails (no clipboard) falls back to a selectable text box.

## 2. Checks — new block `66-remind-mail`, file `tools/remind-r1.mjs`
- **The doc** (with the `sync-e2e`/`s1-fake` fake Firestore that the sync checks already use): off writes nothing; on writes `remind/v1` with the right list. Trash is excluded. The ±window is honoured. A date-only reminder gets `hour`. A reminder edit, set or clear rewrites it; a change on device B reaches A's doc after a merge. Nothing is written before the first read. A refused write leaves the push successful and the panel says so. Turning it off writes `off:true`. The doc is absent from recs, the blob and the Save File.
- **The helper, executed**: take the generated `Code.gs` text and run it in Node `vm` against mocks of `UrlFetchApp`, `ScriptApp`, `MailApp`, `PropertiesService`, `Session` and `Logger`, feeding it the doc the app wrote. Check that a due reminder sends exactly once over two runs; an edited time sends again; >36 h old is not sent; a future one is not sent; `off:true` sends nothing; a 403 and a 404 make `setup()` throw the plain-words messages; a 500 is quiet; the link is `/?open=<id>`; the sent set is pruned. `appsscript.json` parses and lists exactly the five scopes.
- **The panel**: reachable by real clicks from 🧰 and from the reminder dialog at 1440, 820 and 390 (touch). It fits the viewport. The switch and hour persist through `DB.theme.remindMail`. Copy fills the clipboard with the generated text (grant clipboard permissions in the context). No page errors.
- Show the new checks failing on `origin/main` (one stashed `--only 66` run).

## 3. Order of work — follow exactly
1. Step 0 → commit → **push**.
2. Implement 1a–1d → `CHANGELOG.md` v05.06 entry (including **Not done**: My Calendar events, phone push notifications, reminder repeats) and `CLAUDE.md` (five recent rounds: drop v05.00, add v05.06; one paragraph under *How the app is put together* on `remind/v1` and the helper) → commit → **push**. **No `app-check`/Playwright run before this push.**
3. `tools/remind-r1.mjs`, registered in `app-check.mjs` → commit → **push**.
4. `node tools/ship-check.mjs`; `node tools/app-check.mjs --only 66`; then `--only 59,65` → fix → **push** after each run.
5. One unpatched run (`index.html` + `sw.js` from `origin/main`): `--only 66`. Report it.
6. Open the PR: `Closes #<this issue>`, 05.05, totals. **STOP — do not merge.**

**Do NOT run the full `app-check`** (~50 min; the Architect's). At ~25 minutes, if not all green, push, write the record with what you measured, open the PR anyway and say where you stopped. **Never end a run with work only in the workspace.**

Tools: `Bash(node *)`, `Bash(npx playwright *)`, `Bash(git *)`, `Bash(gh pr *)`, `Bash(gh issue *)`, `Read`, `Edit`, `Write`, `Glob`, `Grep`. A bare `cat`/`ls`/`grep` in Bash is refused.

If anything here conflicts with `CLAUDE.md`, say so in a comment and stop.
