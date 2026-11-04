# The shared Mapping My Journey copy — for other apps (read-only)

Siyagah (`siyagah.github.io`, v05.66+) is the one **master** of the Mapping My Journey (MMJ) folders and their notes. It keeps a copy that
other apps (BwN Library, MSA/QuranRevival) may **read**. **A reader never writes Siyagah's documents.** Changing folders and notes is done by asking Siyagah (see "Writing (R2)" below).

## Where it is

Siyagah's own Firebase project, signed in with the owner's Google account (same uid, same rules). `{nb}` = the notebook id (Siyagah's
`cfg.notebookId`, e.g. `nb-…`; ask the owner — it is not necessarily the uid).

| Path | What |
|---|---|
| `notebooks/{nb}/mmj/t~0` | the tree |
| `notebooks/{nb}/mmj/t~1 … t~N` | pieces of the tree, only when it is over ~700 KB |
| `notebooks/{nb}/mmj/n~<encodeURIComponent(noteId)>` | one MMJ note (a `.` in the id is written `%2E`) |
| `notebooks/{nb}/mmjparts/n~<id>~<g>~<i>` | pieces of one note's `content`, only when it is over ~700 KB |

## The documents

**`t~0`** — `{v:1, at:<server time>, b:'<Siyagah build>', sec:{id:'mmj-sec', n:<section name>}, folders:[{id, n, p, o, vis?, u}]}`
`n` name · `p` parent id (null at the top) · `o` order among siblings · `u` updatedAt (ISO) · `vis:1` only when the owner switched 👁 on (absent = private).
All folders of the MMJ set (the section's folders, `mmj-pages`, and folders the owner made below them). Folders in Trash are left out.
*Big tree:* `t~0` is `{v:1, at, b, sec, n:<number of pieces>, g:<generation>}` with **no** `folders`; `t~1…t~n` are `{v:1, i, g, at, b, folders:[…]}`.
Join `folders` of `t~1…t~n` **only when each piece's `g` equals `t~0.g`** (otherwise a write is in progress: read again).

**`n~<id>`** — `{id, title, content, tags[], folderIds[], kind, createdAt, updatedAt, vis?, at:<server time>, b}`
`folderIds` holds only ids inside the MMJ set. `content` is the note's saved HTML, exactly as Siyagah keeps it. `vis:1` as above.
*Big note:* `parts:<n>`, `g:<generation>` and `content:''`; read `notebooks/{nb}/mmjparts/n~<id>~<g>~0 … <g>~<n-1>` (each `{d:<string>, g}`) and
concatenate the `d` strings in order to get `content`. If a piece is missing, read the note doc again (a rewrite is in progress).
*Gone:* `{id, gone:true, at, b}` — the note left the MMJ set, went to Trash or was deleted. **Remove it from your copy.** A note's doc is never deleted.

**Pictures** stay references in `content`: `<img class="ed-img" data-pic="<sha256>" data-mime="…" alt="">` with no `src`. Fetch the bytes from
`notebooks/{nb}/pics/{sha}` (meta `{n,t,p,at,b[,sm,s2]}`) and `notebooks/{nb}/picparts/{sha}~{i}` (`{d: Bytes}`), concatenate the `p` parts, **verify the
sha256 of the bytes equals `sha`** (when the meta carries `sm:s2` the cloud holds a smaller copy: verify `s2` instead), then show them — exactly what
Siyagah's `_picFetch` does. Never trust bytes that fail the check.

## What a reader does

1. Read `t~0` once (plus its pieces if `n` is present) and keep it. Re-read when a `t~` document changes (step 3 tells you).
2. Keep a device copy of the notes. Remember a cursor = the largest `at` you have seen.
3. Listen to the collection `notebooks/{nb}/mmj` with `where('at','>',cursor).orderBy('at')`. For every change:
   `n~…` with `gone:true` → delete it from your copy; any other `n~…` → replace it (re-read parts if `parts` is present); any `t~…` → re-read the tree.
4. Show only what you hold. **Visitors never read this copy** (it is readable only by the owner's sign-in; the visitors' copy is a later round, R3), so a
   reader that shows MMJ to anyone but the owner must use `vis` as a hint only, never as access control.
5. **Never write** to `mmj`, `mmjparts`, `pics`, `picparts`, `recs` or anything else of Siyagah's.

## When Firestore says `permission-denied`

The owner has not yet added your app's web address to Siyagah's Firebase sign-in list (Authentication → Settings → Authorised domains), or is not signed
in with the owner's Google account. Show "Ask the owner to allow this app", keep any copy you already hold, and retry on the next start or after 1 minute
— do not loop.

## Good to know

- Copies are written by Siyagah's devices within ~10 s of an edit while a Siyagah window is open and visible, online, and has finished its first sync.
  A closed Siyagah writes nothing; the copy can be a little behind, never ahead.
- Several Siyagah devices can write the same note with the same content: replace by `id`, last `at` wins.
- About 1 write per MMJ note on a device's first run; later runs write only what changed.

## Writing (R2) — ask Siyagah, never write its records

Since **v05.68** an app may add, rename, move, edit and delete MMJ folders and notes — **by creating a request**. The app writes ONLY a new document
`notebooks/{nb}/mmjin/{reqId}` (`reqId` = your own random id). Siyagah's own code claims it, applies it with all of Siyagah's rules and writes the
outcome onto the same document. **Never write anything else** (not `mmj`, `recs`, the main document) **and never change a request after creating it.**

### The request

`{v:1, op:'<op>', from:'bwn'|'msa'|'qr'|…, at:<serverTimestamp>, st:'new', …the op's fields}` — any field that is not listed for the op is **refused** ("unknown field").

| op | fields | what Siyagah does |
|---|---|---|
| `folder.add` | `id` (your new id, unique, e.g. `x-bwn-<random>`), `name`, `parent` (an MMJ folder id, or `null` = top of the MMJ section) | makes the folder |
| `folder.rename` | `id`, `name` | renames |
| `folder.move` | `id`, `parent` (MMJ folder id or `null`) | moves; refused into itself or one of its own subfolders |
| `folder.delete` | `id` | the folder, its subfolders and the notes whose only folders are inside go to Trash as ONE group (see the D6 rule) |
| `folder.vis` | `id`, `vis` (1 or 0) | 👁 on / off (0 removes the key) |
| `note.add` | `id`, `title`, `content`, `tags[]`, `folderIds[]` (1–20 MMJ folders), `kind?` | new note |
| `note.edit` | `id`, `base`, any of `title` / `content` / `tags` / `kind` | edits (the earlier version stays in Note History) |
| `note.move` | `id`, `base`, `folderIds[]` (MMJ folders) | sets the MMJ part of the note's folders; its non-MMJ folders are kept |
| `note.delete` | `id`, `base` | to Trash |
| `note.vis` | `id`, `vis` (1 or 0) | 👁 on / off |

`base` = the note's `updatedAt` exactly as you read it from `mmj/n~…`. Ids: letters, digits and `. _ : ~ -`, 1–120 characters. Names ≤ 200, titles ≤ 300 characters
(trimmed, control characters removed); tags are cleaned like Siyagah's own (no comma, ≤ 100 characters, ≤ 60 tags); `content` ≤ 900 KB, HTML.
**Content is cleaned by Siyagah** (the same cleaner as its imports): `<script>`, `<iframe>`, `<object>`, `<embed>`, `<style>`, `<form>`, `on…=` handlers,
`javascript:`/`data:` addresses are removed, or the request is refused ("bad content"). A picture is `<img class="ed-img" data-pic="<sha256>" data-mime="…" alt="">`.

### The outcome — Siyagah writes it on your request document

| `st` | meaning |
|---|---|
| `new` | not seen yet — **show your change at once as "waiting for Siyagah"**, then follow the document |
| `work` | a Siyagah device has it (`by`, `lease` = until when) |
| `done` | applied (or already so: an add whose id exists and matches, a delete of what is deleted). `res:{id}`, `doneAt` |
| `refused` | not applied; `why` says why, `doneAt` |

`why` values: `not a Mapping My Journey folder` / `not a Mapping My Journey note` (the target or a parent is outside MMJ), `cannot move a folder into itself or one of its own subfolders`,
`changed in Siyagah since` (+ `cur` = the note's `updatedAt` now; read the note again and ask again — Siyagah never overwrites a newer change),
`open in Siyagah — try again` (the note is being edited on that device; ask again in a minute), `id already used`, `bad id`, `bad name`, `bad title`, `bad content`, `bad tags`, `bad kind`,
`base is required`, `vis must be 1 or 0`, `folderIds must be 1 to 20 folders`, `unknown op`, `unknown field "x"`, `not a version 1 request`, `too old` (still `new` after 30 days).
A request document is **never deleted** by Siyagah. Your change shows in the copy above (`mmj/…`) within ~10 s after `done`.

### When requests are applied

Only while a Siyagah device is **signed in, online and has finished its first sync** — any tab, visible or not (an installed app in the background counts). With no Siyagah
open anywhere, requests wait as `new`. At most 200 requests a minute are claimed; the rest wait. Two Siyagah devices never apply one request twice (a claim
transaction `new → work`, lease 2 minutes; an expired lease may be claimed again, so a request must be safe to apply twice — an add with the same id is "done").

### The D6 rule (the owner's, 4 Nov 2026)

A folder that holds notes **can** be deleted. `folder.delete` moves the folder, its subfolders and the notes whose ONLY folders are inside that subtree to Siyagah's Trash as
one group (the owner's Undo / Restore brings all of it back). A note that is also in a folder outside the subtree is **not** deleted; it only loses the deleted folder ids.
Your app should confirm with the user first ("this also deletes N notes") — Siyagah applies the request without asking.

### The honest limit

Every app signs in as the owner (the same uid), so Firestore's rules **cannot tell the apps apart or stop an app writing elsewhere**. The safety is this contract (apps only
create `mmjin` documents with `st:'new'`) plus Siyagah validating every request. No rules change was made for R2.
