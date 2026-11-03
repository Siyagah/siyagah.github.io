# The shared Mapping My Journey copy — for other apps (read-only)

Siyagah (`siyagah.github.io`, v05.66+) is the one **master** of the Mapping My Journey (MMJ) folders and their notes. It keeps a copy that
other apps (BwN Library, MSA/QuranRevival) may **read**. **A reader never writes anything** (writing from other apps is a later round, R2).

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
