/* Reproduce the two recovery defects from the 19 Sep 2026 review, against
   whatever index.html is currently checked out. */
import { openApp, seedDB } from '../../tools/harness.mjs';

const app = await openApp({ db: seedDB() });
const p = app.page;

/* ── D1: a DENIED pre-restore copy must not let the replace proceed ────── */
const d1 = await p.evaluate(async () => {
  const save = await _recoverySave('a good copy to restore from');   /* 3 notes */
  DB.articles = DB.articles.slice(0, 1); persist();                  /* now 1 note */
  const beforeDB      = DB.articles.length;
  const beforeStorage = (JSON.parse(localStorage.getItem('my-notebook-v1') || '{}').articles || []).length;

  /* count cloud pushes, so "did this schedule a sync" is measurable */
  let pushes = 0; const realPush = window.pushToCloud;
  window.pushToCloud = function () { pushes++; return realPush.apply(this, arguments); };

  /* let the restore READ its record, then deny every later open —
     which is exactly what a full or locked store does to the undo copy */
  const realOpen = indexedDB.open.bind(indexedDB);
  let opens = 0;
  indexedDB.open = function () { opens++; if (opens >= 2) throw new Error('denied by policy'); return realOpen.apply(indexedDB, arguments); };

  let threw = null;
  try { await _recoveryRestore(save.id); } catch (e) { threw = String(e && e.message || e); }

  indexedDB.open = realOpen; window.pushToCloud = realPush;
  return { beforeDB, beforeStorage, threw,
           afterDB: DB.articles.length,
           afterStorage: (JSON.parse(localStorage.getItem('my-notebook-v1') || '{}').articles || []).length,
           pushes };
});
const d1Held = d1.afterDB === d1.beforeDB && d1.afterStorage === d1.beforeStorage && d1.pushes === 0;
console.log('\n=== D1: Restore when the undo copy cannot be written ===');
console.log(`  notes in DB      : ${d1.beforeDB} -> ${d1.afterDB}`);
console.log(`  notes in storage : ${d1.beforeStorage} -> ${d1.afterStorage}`);
console.log(`  cloud pushes     : ${d1.pushes}`);
console.log(`  threw            : ${d1.threw || '(nothing — it went ahead)'}`);
console.log(`  VERDICT          : ${d1Held ? 'HELD — nothing changed' : '*** DEFECT: the notebook was replaced with no undo copy ***'}`);

/* ── D2: a same-length changed payload with intact metadata ───────────── */
const d2 = await p.evaluate(async () => {
  const realTx = window._recoveryTx;
  /* corrupt only what comes BACK from the store, keeping byte-length and
     leaving the stored bytes/hash metadata untouched */
  window._recoveryTx = async function (db, mode, fn) {
    const out = await realTx(db, mode, fn);
    if (mode === 'readonly' && out && typeof out.json === 'string' && out.json.length > 2) {
      const j = out.json;
      return Object.assign({}, out, { json: j.slice(0, -1) + (j.endsWith('X') ? 'Y' : 'X') });
    }
    return out;
  };
  const s = await _recoverySave('corrupted on the way back');
  window._recoveryTx = realTx;
  return { ok: s.ok, err: s.err || null };
});
console.log('\n=== D2: read-back bytes changed, metadata intact ===');
console.log(`  save reported ok : ${d2.ok}`);
console.log(`  error            : ${d2.err || '(none)'}`);
console.log(`  VERDICT          : ${d2.ok === false ? 'HELD — the copy was refused' : '*** DEFECT: a corrupted copy passed the save gate ***'}`);

console.log('\nconsole errors:', app.errors.length ? app.errors.slice(0, 3) : 'none');
await app.close();

/* ── D3: a successful Restore leaves a WORKING undo — round-trip it ────── */
const app2 = await (await import('../../tools/harness.mjs')).openApp({ db: (await import('../../tools/harness.mjs')).seedDB() });
const d3 = await app2.page.evaluate(async () => {
  const out = {};
  const good = await _recoverySave('three notes');          /* state A: 3 notes */
  DB.articles = DB.articles.slice(0, 1); persist();          /* state B: 1 note  */
  out.stateB = DB.articles.length;
  const r1 = await _recoveryRestore(good.id);                /* back to A, undo of B */
  out.undoOk = r1.undoOk;
  out.afterRestore = DB.articles.length;
  const list = await _recoveryList();
  const undo = list.find(x => x.label === 'before restoring a safety copy');
  out.undoListed = !!undo;
  if (undo) {
    const r2 = await _recoveryRestore(undo.id);              /* restoring the undo → B */
    out.afterUndo = DB.articles.length;
    out.undoOfUndoOk = r2.undoOk;
    out.inStorage = (JSON.parse(localStorage.getItem('my-notebook-v1') || '{}').articles || []).length;
  }
  return out;
});
const d3ok = d3.undoOk && d3.afterRestore === 3 && d3.undoListed && d3.afterUndo === 1 && d3.inStorage === 1;
console.log('\n=== D3: successful restore, then restore the undo ===');
console.log(`  3 notes -> damaged to ${d3.stateB} -> restored to ${d3.afterRestore} -> undo restored to ${d3.afterUndo} (${d3.inStorage} in storage)`);
console.log(`  undo copy reported verified: ${d3.undoOk} · listed: ${d3.undoListed}`);
console.log(`  VERDICT: ${d3ok ? 'HELD — the undo round-trips' : '*** the undo does not round-trip ***'}`);
console.log('\nconsole errors:', app2.errors.length ? app2.errors.slice(0, 3) : 'none');
await app2.close();
