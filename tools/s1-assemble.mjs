/* v04.88 — S1a: read the per-record cloud copy (notebooks/<nb>/recs) back into
   a DB, in Node, the way S1b's devices eventually will. Used by sync-s1.mjs and
   by sync-e2e.mjs to prove the shadow describes the notebook. Nothing in the
   app calls this; it exists only to check the shadow. */
export const S1_COLLS = ['articles', 'folders', 'sections', 'calEvents', 'calCategories', 'noteKinds', 'noteKindCats', 'myFavCats', 'folderGroups', 'trash', 'tombstones'];

/* store: Map of full document path → data. nbPath e.g. 'notebooks/nb-e2e'.
   Returns { db, missingParts } — db is null if there is no head. */
export function assembleRecs(store, nbPath) {
  const prefix = nbPath + '/recs/';
  let head = null, missingParts = 0;
  const items = [];
  for (const [path, v] of store) {
    if (!path.startsWith(prefix) || v.gone) continue;
    const key = path.slice(prefix.length);
    let json;
    if (v.j != null) json = v.j;
    else {
      let b64 = '';
      for (let i = 0; i < v.n; i++) {
        const p = store.get(nbPath + '/recparts/' + key + '~' + v.g + '~' + i);
        if (!p) { missingParts++; continue; }
        b64 += p.p;
      }
      json = Buffer.from(b64, 'base64').toString('utf8');
    }
    const obj = JSON.parse(json);
    if (key === '_head~0') head = obj; else items.push([v.c, obj]);
  }
  if (!head) return { db: null, missingParts };
  for (const [c, o] of items) (head[c] = head[c] || []).push(o);
  return { db: head, missingParts };
}

/* Order-insensitive by element within the 11 id-keyed arrays; every other key
   compared as written. */
export function canonDB(db) {
  const o = {};
  for (const k of Object.keys(db).sort()) {
    const v = db[k];
    o[k] = (S1_COLLS.includes(k) && Array.isArray(v)) ? v.map((x) => JSON.stringify(x)).sort() : JSON.stringify(v);
  }
  return JSON.stringify(o);
}

/* A short description of the first difference, for a failing check. */
export function diffDB(a, b) {
  const ca = JSON.parse(canonDB(a)), cb = JSON.parse(canonDB(b));
  for (const k of new Set([...Object.keys(ca), ...Object.keys(cb)])) {
    if (JSON.stringify(ca[k]) !== JSON.stringify(cb[k])) {
      const la = Array.isArray(ca[k]) ? ca[k].length : '-', lb = Array.isArray(cb[k]) ? cb[k].length : '-';
      return `key "${k}" differs (recs ${la} vs device ${lb})`;
    }
  }
  return 'no difference';
}
