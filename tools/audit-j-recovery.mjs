/* audit-j-recovery — the four blockers from the independent review of
   2026-09-19, each one reproduced against v04.36 first and then required to
   stay fixed.

   Every assertion here is on PERSISTED or EXPORTED data, or on a
   cancellation invariant ("after Cancel, is anything different?"). An
   assertion on a transient input object is what let the v04.36 salvage claim
   through in the first place.

   Run: node tools/audit-j-recovery.mjs */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, openApp, matrix, seedDB, synthDB, MALFORMED } from './harness.mjs';

const m = matrix('audit J — salvage across merges, a real choice, a verified recovery copy');
const V = 'J data preservation';
const C = 'J destructive-path consent';
const S = 'J sanitiser (adversarial)';
async function section(dom, name, fn) {
  try { await fn(); } catch (e) { m.row(dom, `${name} — the check itself threw`, false, String(e).split('\n')[0]); }
}

/* ── J1. Salvage survives every path it can travel ──────────────────────── */
await section(V, 'salvage survives merges and persistence', async () => {
  const app = await openApp({ db: seedDB() });
  const p = app.page;
  const r = await p.evaluate(() => {
    const vals = (sv) => Object.values(sv || {}).map((e) => (e && typeof e === 'object' ? e.value : e)).filter(Boolean);
    const out = {};

    /* (a) REMOTE — the path the review proved was losing it */
    const remote = { sections: [], folders: [], articles: 'CORRUPT-REMOTE', trash: [] };
    const rr = _repairDB(JSON.parse(JSON.stringify(remote)), 'remote');
    DB = mergeDB(DB, rr.db); persist();
    out.remoteInDB = vals(DB._salvage);
    out.remoteInStorage = vals(JSON.parse(localStorage.getItem('my-notebook-v1') || '{}')._salvage);

    /* (b) IMPORTED — merged into an existing notebook */
    const imp = { sections: [], folders: [], articles: 'CORRUPT-IMPORTED', trash: [] };
    const ri = _repairDB(imp, 'imported');
    DB = mergeDB(DB, ri.db); persist();
    out.afterImport = vals(DB._salvage).sort();

    /* (c) EXPORTED — it has to reach the file too */
    const ex = getExportHTML();
    const nd = (ex.match(/<script id="nd"[^>]*>([\s\S]*?)<\/script>/) || [])[1];
    out.inExport = vals(JSON.parse(nd)._salvage).sort();

    /* (d) two devices repairing the SAME collection in the same moment */
    const A = _repairDB({ folders: [], articles: 'DEVICE-A', sections: [], trash: [] }, 'remote').db;
    const B = _repairDB({ folders: [], articles: 'DEVICE-B', sections: [], trash: [] }, 'remote').db;
    const both = mergeDB(A, B);
    out.twoDevices = vals(both._salvage).sort();
    out.twoDeviceKeys = Object.keys(both._salvage).length;

    /* (e) merging is idempotent and order-independent */
    const once = mergeDB(A, B), twice = mergeDB(once, B), flipped = mergeDB(B, A);
    out.idempotent = Object.keys(twice._salvage).length === Object.keys(once._salvage).length;
    out.orderFree = vals(flipped._salvage).sort().join('|') === vals(once._salvage).sort().join('|');

    /* (f) the intact records on BOTH sides survive alongside the salvage */
    const healthy = { sections: [], trash: [],
      folders: [{ id: 'hf', name: 'healthy folder', parentId: null, order: 1, updatedAt: new Date().toISOString() }],
      articles: 'CORRUPT-BUT-FOLDER-IS-FINE' };
    const rh = _repairDB(healthy, 'remote');
    const merged = mergeDB(DB, rh.db);
    out.intactKept = !!merged.folders.find((f) => f.id === 'hf')
      && merged.articles.length === DB.articles.length;
    return out;
  });
  m.row(V, 'a repaired REMOTE notebook keeps its salvaged bytes through the merge (I1)',
    r.remoteInDB.includes('CORRUPT-REMOTE'), JSON.stringify(r.remoteInDB));
  m.row(V, '…and they are in localStorage, not just in memory',
    r.remoteInStorage.includes('CORRUPT-REMOTE'), JSON.stringify(r.remoteInStorage));
  m.row(V, 'a repaired IMPORTED file keeps its salvaged bytes through the merge (I1)',
    r.afterImport.includes('CORRUPT-IMPORTED'), JSON.stringify(r.afterImport));
  m.row(V, '…and they reach a Save File export as well (I4)',
    r.inExport.includes('CORRUPT-REMOTE') && r.inExport.includes('CORRUPT-IMPORTED'), JSON.stringify(r.inExport));
  m.row(V, 'two devices salvaging the SAME collection keep both, not one (collision-safe keys)',
    r.twoDevices.join() === 'DEVICE-A,DEVICE-B' && r.twoDeviceKeys === 2,
    `${r.twoDeviceKeys} entries: ${JSON.stringify(r.twoDevices)}`);
  m.row(V, 'merging salvage twice adds nothing, and the order of the two sides does not matter',
    r.idempotent && r.orderFree, `idempotent:${r.idempotent} order-free:${r.orderFree}`);
  m.row(V, 'the records that WERE readable on both sides survive beside the salvage (I1)', r.intactKept);
  await app.close();
});

/* ── J2. Salvage is bounded, and bounding never hides that it was ──────── */
await section(V, 'salvage is bounded and honest about it', async () => {
  const app = await openApp({ db: seedDB() });
  const r = await app.page.evaluate(() => {
    /* one payload far larger than the per-entry cap */
    const huge = 'X'.repeat(300000);
    const rr = _repairDB({ folders: [], sections: [], trash: [], articles: huge }, 'imported');
    const e = Object.values(rr.db._salvage)[0];
    const out = { truncated: e.truncated, kept: e.value.length, original: e.bytes, hash: !!e.hash,
      saysSo: /too large/i.test(rr.fixes.join(' ')) };
    /* many repairs over time must not grow without limit */
    let db = { _salvage: {} };
    for (let i = 0; i < 60; i++) {
      const one = _repairDB({ folders: [], sections: [], trash: [], articles: 'PAYLOAD-' + i + '-'.padEnd(6000, 'y') }, 'remote').db;
      db = mergeDB(db, one);
    }
    const entries = Object.values(db._salvage || {});
    out.entries = entries.length;
    out.live = entries.filter((x) => x.value != null).length;
    out.totalBytes = entries.reduce((n, x) => n + ((x.value || '').length), 0);
    /* the ones whose bytes had to go still EXIST as records */
    out.prunedKeepRecord = entries.filter((x) => x.value == null)
      .every((x) => x.bytes > 0 && !!x.hash && !!x.prunedAt);
    return out;
  });
  m.row(V, 'a salvage payload too large to keep whole is truncated, not dropped, and says its real size',
    r.truncated && r.kept === 65536 && r.original === 300000, `kept ${r.kept} of ${r.original} bytes`);
  m.row(V, '…and the owner is told it was only kept in part', r.saysSo);
  m.row(V, 'sixty repairs do not grow the notebook without bound',
    r.totalBytes <= 262144 && r.live <= 24, `${r.entries} entries, ${r.live} still holding bytes, ${r.totalBytes} bytes`);
  m.row(V, 'an entry whose bytes had to be dropped still keeps its size, hash and the fact it was pruned',
    r.prunedKeepRecord, 'no silent disappearance');
  await app.close();
});

/* ── J3. Cancel is Cancel — on every exit, and measured on storage ─────── */
await section(C, 'cancellation writes nothing', async () => {
  const incoming = JSON.stringify({ sections: [], trash: [],
    folders: [{ id: 'if1', name: '(900) Imported', parentId: null, order: 9, updatedAt: new Date().toISOString() }],
    articles: [{ id: 'ia1', title: 'Imported note', content: '<p>x</p>', folderIds: ['if1'], tags: [],
      kind: 'general', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }] });

  /* drives the real file-reader path and clicks a real button in the dialog */
  const feed = (page, payload) => page.evaluate((data) => {
    window.__writes = 0;
    const realSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) { if (k === 'my-notebook-v1') window.__writes++; return realSet.call(this, k, v); };
    const realCreate = document.createElement.bind(document);
    document.createElement = function (t) {
      const el = realCreate(t);
      if (t === 'input') {
        setTimeout(() => { const f = new File([data], 'backup.json', { type: 'application/json' });
          Object.defineProperty(el, 'files', { value: [f] }); el.onchange({ target: el }); }, 0);
        el.click = () => {};
      }
      return el;
    };
    importJSON();
  }, payload);

  const EXITS = [
    { name: 'the Cancel button on the choice dialog', run: async (p) => { await p.click('#mb [data-choice="cancel"]'); } },
    { name: 'the Escape key on the choice dialog', run: async (p) => { await p.keyboard.press('Escape'); } },
    { name: 'Cancel on the SECOND confirmation, after choosing Replace All', run: async (p) => {
        await p.click('#mb [data-choice="replace"]'); await p.waitForTimeout(350);
        await p.click('#mb [data-choice="cancel"]'); } },
  ];
  for (const exit of EXITS) {
    const app = await openApp({ db: seedDB() });
    const p = app.page;
    const before = await p.evaluate(() => localStorage.getItem('my-notebook-v1'));
    await feed(p, incoming);
    await p.waitForSelector('#mb [data-choice="cancel"]', { timeout: 8000 });
    await exit.run(p);
    await p.waitForTimeout(900);
    const after = await p.evaluate(() => ({ raw: localStorage.getItem('my-notebook-v1'),
      notes: DB.articles.length, has: !!DB.articles.find((a) => a.id === 'ia1'), writes: window.__writes }));
    m.row(C, `Cancel via ${exit.name} leaves the notebook byte-identical (I1)`,
      after.raw === before && !after.has && after.notes === 3,
      after.raw === before ? `${after.notes} notes, storage unchanged, ${after.writes} writes` : 'STORAGE CHANGED BY A CANCEL');
    await app.close();
  }

  /* the dialog itself: three separate buttons, and Cancel holds the focus */
  const app = await openApp({ db: seedDB() });
  const p = app.page;
  await feed(p, incoming);
  await p.waitForSelector('#mb [data-choice="cancel"]', { timeout: 8000 });
  await p.waitForTimeout(250);
  const dlg = await p.evaluate(() => ({
    choices: [...document.querySelectorAll('#mb [data-choice]')].map((b) => b.getAttribute('data-choice')),
    labels: [...document.querySelectorAll('#mb [data-choice]')].map((b) => (b.textContent || '').trim()),
    focused: document.activeElement?.getAttribute('data-choice'),
    allButtons: [...document.querySelectorAll('#mb [data-choice]')].every((b) => b.tagName === 'BUTTON'),
  }));
  m.row(C, 'the import choice is three separate buttons — Merge, Replace All and Cancel',
    dlg.choices.sort().join() === 'cancel,merge,replace', dlg.labels.join(' | '));
  m.row(C, 'no choice is expressed as "Cancel = Replace All" (the review\'s blocker 2)',
    !dlg.labels.some((l) => /cancel/i.test(l) && /replace/i.test(l)), dlg.labels.join(' | '));
  m.row(C, 'Cancel holds the focus, so Enter on a dialog nobody read does nothing',
    dlg.focused === 'cancel', `focus on "${dlg.focused}"`);
  m.row(C, 'every choice is a real <button>, so it is reachable by keyboard', dlg.allButtons);
  await app.close();

  /* and the two that DO change things still work, with a verified copy */
  for (const [choice, expect] of [['merge', 4], ['replace', 1]]) {
    const a2 = await openApp({ db: seedDB() });
    const q = a2.page;
    await feed(q, incoming);
    await q.waitForSelector('#mb [data-choice="cancel"]', { timeout: 8000 });
    await q.click(`#mb [data-choice="${choice}"]`);
    await q.waitForTimeout(400);
    if (choice === 'replace') { await q.click('#mb [data-choice="replace"]'); await q.waitForTimeout(400); }
    await q.waitForTimeout(1500);
    const s = await q.evaluate(async () => ({ notes: DB.articles.length,
      has: !!DB.articles.find((a) => a.id === 'ia1'),
      keptSeed: !!DB.articles.find((a) => a.id === 'a1'),
      snaps: (await _recoveryList()).length }));
    m.row(C, `${choice.toUpperCase()} really ${choice === 'merge' ? 'merges and keeps the existing notes' : 'replaces'}`,
      s.notes === expect && s.has && (choice === 'merge' ? s.keptSeed : !s.keptSeed),
      `${s.notes} notes, imported present: ${s.has}, seed kept: ${s.keptSeed}`);
    m.row(C, `${choice.toUpperCase()} took a recovery snapshot that can be listed afterwards`,
      s.snaps > 0, `${s.snaps} snapshot(s) in the store`);
    await a2.close();
  }
});

/* ── J4. The recovery copy is verified, and it can actually be used ─────── */
await section(V, 'the recovery copy is real', async () => {
  const app = await openApp({ db: seedDB() });
  const p = app.page;
  const r = await p.evaluate(async () => {
    const out = {};
    const save = await _recoverySave('audit');
    out.ok = save.ok; out.err = save.err; out.bytes = save.bytes;
    /* it is READ BACK — prove the bytes are really in the store */
    const list = await _recoveryList();
    out.listed = list.length;
    out.matches = !!list.find((x) => x.id === save.id && x.bytes === save.bytes && x.hash === save.hash);
    /* now change the notebook, then restore, and read the result out of DB */
    DB.articles = DB.articles.slice(0, 1); persist();
    out.afterDamage = DB.articles.length;
    await _recoveryRestore(save.id);
    out.afterRestore = DB.articles.length;
    out.inStorage = (JSON.parse(localStorage.getItem('my-notebook-v1') || '{}').articles || []).length;
    /* restoring took its own snapshot first, so the undo has an undo */
    out.snapsAfter = (await _recoveryList()).length;
    return out;
  });
  m.row(V, 'a recovery snapshot is written and READ BACK before it is called a copy',
    r.ok && r.matches, r.err || `${r.bytes} bytes, verified by length and hash`);
  m.row(V, 'the snapshot can be listed — the owner has something to restore from', r.listed > 0, `${r.listed} listed`);
  m.row(V, 'restoring a snapshot really puts the notes back, in storage as well as in memory',
    r.afterDamage === 1 && r.afterRestore === 3 && r.inStorage === 3,
    `3 → ${r.afterDamage} → ${r.afterRestore} notes (${r.inStorage} in storage)`);
  m.row(V, 'restoring takes a fresh snapshot first, so the undo has an undo', r.snapsAfter >= 2,
    `${r.snapsAfter} snapshots held`);

  /* a store that refuses to write must NOT report a copy was taken */
  const denied = await p.evaluate(async () => {
    const real = indexedDB.open.bind(indexedDB);
    indexedDB.open = () => { throw new Error('denied by policy'); };
    const s = await _recoverySave('should fail');
    indexedDB.open = real;
    return s;
  });
  m.row(V, 'a recovery copy that could NOT be stored reports failure rather than success',
    denied.ok === false && /denied/.test(denied.err || ''), JSON.stringify(denied.err));

  /* a damaged snapshot must be refused, not restored */
  const damaged = await p.evaluate(async () => {
    const s = await _recoverySave('to be damaged');
    const db = await _recoveryOpen();
    await _recoveryTx(db, 'readwrite', (st) => st.put({ id: s.id, at: new Date().toISOString(),
      label: 'damaged', notes: 0, folders: 0, bytes: 5, hash: 'wrong-hash', json: '{"articles":[]}' }));
    try { db.close(); } catch {}
    const before = DB.articles.length;
    let err = null;
    try { await _recoveryRestore(s.id); } catch (e) { err = String(e.message || e); }
    return { err, notes: DB.articles.length, before };
  });
  m.row(V, 'a DAMAGED recovery snapshot is refused and the notebook is left alone',
    /damaged/i.test(damaged.err || '') && damaged.notes === damaged.before,
    `${damaged.err} — notebook still holds ${damaged.notes} notes`);
  await app.close();
});

/* ── J4b. The two recovery defects of the 2026-09-19 review ──────────────
   Both were reproduced against 817da3c (v04.37) before v04.38 touched
   anything, and both asserted on PERSISTED bytes and on whether a cloud
   push was scheduled — never on the return value of the call under test,
   which is the thing that was wrong in the first place. */
await section(V, 'a restore with no undo copy changes nothing', async () => {
  const app = await openApp({ db: seedDB() });
  const p = app.page;

  /* (1) The undo copy is a PRECONDITION. With the store denied, a restore
         must leave DB, localStorage and the cloud queue exactly as they were.
         On v04.37 this replaced a 1-note notebook with a 3-note one, rewrote
         localStorage and scheduled a push, with nothing thrown. */
  const denied = await p.evaluate(async () => {
    const good = await _recoverySave('three notes');
    DB.articles = DB.articles.slice(0, 1); persist();
    const beforeRaw = localStorage.getItem('my-notebook-v1');
    let pushes = 0; const realPush = window.pushToCloud;
    window.pushToCloud = function () { pushes++; return realPush.apply(this, arguments); };
    const realOpen = indexedDB.open.bind(indexedDB);
    let opens = 0;
    indexedDB.open = function () { opens++; if (opens >= 2) throw new Error('denied by policy'); return realOpen.apply(indexedDB, arguments); };
    let name = null, msg = null;
    try { await _recoveryRestore(good.id); } catch (e) { name = e && e.name; msg = String(e && e.message || e); }
    indexedDB.open = realOpen; window.pushToCloud = realPush;
    return { name, msg, notes: DB.articles.length, pushes,
      storageUnchanged: localStorage.getItem('my-notebook-v1') === beforeRaw,
      storageNotes: (JSON.parse(localStorage.getItem('my-notebook-v1') || '{}').articles || []).length };
  });
  m.row(V, 'a restore whose undo copy cannot be written changes NOTHING that is persisted',
    denied.notes === 1 && denied.storageNotes === 1 && denied.storageUnchanged,
    `${denied.storageNotes} notes in storage, bytes ${denied.storageUnchanged ? 'identical' : 'REWRITTEN'}`);
  m.row(V, '…and schedules no cloud push, so the other devices never see it',
    denied.pushes === 0, `${denied.pushes} pushes`);
  m.row(C, '…and says so, with an error the caller can offer a choice on',
    denied.name === 'RecoveryUndoError' && /could not be made/.test(denied.msg || ''), denied.msg);

  /* (2) Proceeding without an undo copy stays POSSIBLE, but only when it is
         asked for explicitly — never as a silent fallback. */
  const explicit = await p.evaluate(async () => {
    /* Self-contained: the block above deliberately leaves the notebook at one
       note, so a snapshot taken here without resetting would hold ONE note and
       "restored to 3" would fail for a reason that has nothing to do with the
       thing under test. */
    DB.articles = [
      { id: 'x1', title: 'one', content: '<p>1</p>', folderIds: ['f1'], tags: [], updatedAt: new Date().toISOString() },
      { id: 'x2', title: 'two', content: '<p>2</p>', folderIds: ['f1'], tags: [], updatedAt: new Date().toISOString() },
      { id: 'x3', title: 'three', content: '<p>3</p>', folderIds: ['f1'], tags: [], updatedAt: new Date().toISOString() }];
    persist();
    const good = await _recoverySave('three notes again');
    DB.articles = DB.articles.slice(0, 1); persist();
    const realOpen = indexedDB.open.bind(indexedDB);
    let opens = 0;
    indexedDB.open = function () { opens++; if (opens >= 2) throw new Error('denied by policy'); return realOpen.apply(indexedDB, arguments); };
    let rec = null, err = null;
    try { rec = await _recoveryRestore(good.id, { allowNoUndo: true }); } catch (e) { err = String(e && e.message || e); }
    indexedDB.open = realOpen;
    return { err, undoOk: rec && rec.undoOk, notes: DB.articles.length };
  });
  m.row(C, 'restoring without an undo copy works when it is explicitly chosen, and reports that it had none',
    !explicit.err && explicit.notes === 3 && explicit.undoOk === false,
    explicit.err || `restored to ${explicit.notes} notes, undoOk=${explicit.undoOk}`);
  await app.close();
});

await section(V, 'the save gate hashes the bytes it read back', async () => {
  const app = await openApp({ db: seedDB() });
  const p = app.page;
  /* A payload that comes back CHANGED at the same length, with its stored
     bytes/hash metadata untouched. On v04.37 this reported ok:true: the gate
     compared metadata against metadata and never hashed back.json, so the
     save path certified a snapshot the restore path would later refuse. */
  const corrupt = await p.evaluate(async () => {
    const realTx = window._recoveryTx;
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
    return { ok: s.ok, err: s.err || null, sameLength: true };
  });
  m.row(V, 'a same-length changed payload with intact metadata is REFUSED by the save gate',
    corrupt.ok === false && /read back differently/.test(corrupt.err || ''), corrupt.err || 'reported ok:true');

  /* And the honest case still passes, so the gate is not simply refusing. */
  const honest = await p.evaluate(async () => { const s = await _recoverySave('an honest copy');
    return { ok: s.ok, err: s.err || null, bytes: s.bytes }; });
  m.row(V, '…while an untampered copy still passes it', honest.ok === true, honest.err || `${honest.bytes} bytes verified`);
  await app.close();
});

await section(C, 'every way out of the restore dialogs changes nothing', async () => {
  const app = await openApp({ db: seedDB() });
  const p = app.page;
  /* Each path is driven through restoreRecovery(), the function the button
     actually calls, and judged on PERSISTED bytes — not on what it returned. */
  const setup = `
    DB.articles=[{id:'y1',title:'one',content:'<p>1</p>',folderIds:['f1'],tags:[],updatedAt:new Date().toISOString()},
                 {id:'y2',title:'two',content:'<p>2</p>',folderIds:['f1'],tags:[],updatedAt:new Date().toISOString()}];
    persist();`;

  /* (a) Cancel at the first confirm() */
  const first = await p.evaluate(async (setupSrc) => {
    eval(setupSrc);
    const snap = await _recoverySave('a copy to restore');
    DB.articles = DB.articles.slice(0, 1); persist();
    const beforeRaw = localStorage.getItem('my-notebook-v1');
    let pushes = 0; const realPush = window.pushToCloud;
    window.pushToCloud = function () { pushes++; return realPush.apply(this, arguments); };
    const realConfirm = window.confirm; window.confirm = () => false;      /* the owner says no */
    await restoreRecovery(snap.id);
    window.confirm = realConfirm; window.pushToCloud = realPush;
    return { notes: DB.articles.length, pushes, unchanged: localStorage.getItem('my-notebook-v1') === beforeRaw };
  }, setup);
  m.row(C, 'Cancel at the restore confirmation leaves the notebook and storage untouched',
    first.notes === 1 && first.unchanged && first.pushes === 0,
    `${first.notes} note, storage ${first.unchanged ? 'identical' : 'REWRITTEN'}, ${first.pushes} pushes`);

  /* (b) "Stop — change nothing" on the no-undo-copy choice, by a REAL click
         on the button the owner would press. */
  const stopped = await p.evaluate(async (setupSrc) => {
    eval(setupSrc);
    const snap = await _recoverySave('another copy');
    DB.articles = DB.articles.slice(0, 1); persist();
    const beforeRaw = localStorage.getItem('my-notebook-v1');
    let pushes = 0; const realPush = window.pushToCloud;
    window.pushToCloud = function () { pushes++; return realPush.apply(this, arguments); };
    const realConfirm = window.confirm; window.confirm = () => true;
    const realOpen = indexedDB.open.bind(indexedDB);
    let opens = 0;
    indexedDB.open = function () { opens++; if (opens >= 2) throw new Error('denied by policy'); return realOpen.apply(indexedDB, arguments); };
    const done = restoreRecovery(snap.id);
    /* wait for the choice card, then press Stop the way a person would */
    let btn = null;
    for (let i = 0; i < 60 && !btn; i++) { await new Promise((r) => setTimeout(r, 25));
      btn = document.querySelector('#mb [data-choice="cancel"]'); }
    const offered = !!btn;
    if (btn) btn.click();
    await done;
    indexedDB.open = realOpen; window.confirm = realConfirm; window.pushToCloud = realPush;
    return { offered, notes: DB.articles.length, pushes,
      unchanged: localStorage.getItem('my-notebook-v1') === beforeRaw };
  }, setup);
  m.row(C, 'a failed undo copy offers a real choice rather than silently proceeding or dead-ending',
    stopped.offered, stopped.offered ? 'the choice card was shown' : 'NO choice was offered');
  m.row(C, '…and pressing "Stop — change nothing" changes nothing that is persisted',
    stopped.notes === 1 && stopped.unchanged && stopped.pushes === 0,
    `${stopped.notes} note, storage ${stopped.unchanged ? 'identical' : 'REWRITTEN'}, ${stopped.pushes} pushes`);
  await app.close();
});

await section(V, 'a successful restore leaves an undo that really works', async () => {
  const app = await openApp({ db: seedDB() });
  const r = await app.page.evaluate(async () => {
    const out = {};
    const good = await _recoverySave('three notes');
    DB.articles = DB.articles.slice(0, 1); persist();
    out.damaged = DB.articles.length;
    const r1 = await _recoveryRestore(good.id);
    out.undoOk = r1.undoOk; out.restored = DB.articles.length;
    const undo = (await _recoveryList()).find((x) => x.label === 'before restoring a safety copy');
    out.undoListed = !!undo;
    if (undo) { await _recoveryRestore(undo.id);
      out.afterUndo = DB.articles.length;
      out.inStorage = (JSON.parse(localStorage.getItem('my-notebook-v1') || '{}').articles || []).length; }
    return out;
  });
  m.row(V, 'restoring a copy takes a VERIFIED undo copy first', r.undoOk === true && r.undoListed);
  m.row(V, 'restoring that undo puts the previous notebook back, in storage as well as in memory',
    r.restored === 3 && r.afterUndo === 1 && r.inStorage === 1,
    `3 → ${r.damaged} → ${r.restored} → ${r.afterUndo} notes (${r.inStorage} in storage)`);
  await app.close();
});

await section(C, 'the Safety Copies screen states its own limits', async () => {
  /* v04.38 — the review asked for the limits to be stated where the owner
     reads them, not only in a changelog. Asserted on the RENDERED text, so a
     rewrite that drops a limit fails here rather than being noticed later. */
  const app = await openApp({ db: seedDB() });
  const r = await app.page.evaluate(async () => {
    await _recoverySave('a copy so the list is not empty');
    await openRecoveryModal();
    const t = (document.getElementById('mb') || document.body).textContent.replace(/\s+/g, ' ');
    return {
      thisBrowserOnly: /in this browser on this device only/i.test(t),
      notOtherDevices: /not on your other devices/i.test(t),
      clearingRemoves: /clearing/i.test(t) && /remove them/i.test(t),
      keepCount: /only the last \d+ are kept/i.test(t),
      cannotConfirmDownload: /cannot confirm your browser finished saving it/i.test(t),
      noRawTemplate: !t.includes('${'),
    };
  });
  const missing = Object.entries(r).filter(([, v]) => !v).map(([k]) => k);
  m.row(C, 'the Safety Copies screen says where the copies live and how they can be lost',
    missing.length === 0, missing.length ? `MISSING: ${missing.join(', ')}` : 'browser-only, not synced, cleared by site data, keep-count, download unverifiable');
  await app.close();
});

/* ── J5. The sanitiser, adversarially ──────────────────────────────────── */
await section(S, 'adversarial sanitiser', async () => {
  const app = await openApp({ db: seedDB() });
  const p = app.page;
  const VECTORS = {
    'an iframe srcdoc holding a whole document': '<iframe srcdoc="&lt;script&gt;window.__X=1&lt;/script&gt;"></iframe>',
    'an entity-encoded javascript: scheme': '<a href="java&#115;cript:window.__X=1">x</a>',
    'a tab inside the scheme': '<a href="java\tscript:window.__X=1">x</a>',
    'a newline inside the scheme': '<a href="java\nscript:window.__X=1">x</a>',
    'a leading-space scheme': '<a href="  javascript:window.__X=1">x</a>',
    'uppercase JAVASCRIPT:': '<a href="JAVASCRIPT:window.__X=1">x</a>',
    'a form whose action is a script': '<form action="javascript:window.__X=1"><button>go</button></form>',
    'a base tag re-pointing every relative URL': '<base href="https://evil.example.com/">',
    'a meta refresh': '<meta http-equiv="refresh" content="0;url=https://evil.example.com">',
    'an object tag': '<object data="https://evil.example.com/x.swf"></object>',
    'an embed tag': '<embed src="https://evil.example.com/x">',
    'an svg use pointing off-site': '<svg><use xlink:href="https://evil.example.com/x#y"/></svg>',
    'a style attribute fetching a URL': '<p style="background:url(https://evil.example.com/t.png)">x</p>',
    'a style attribute with expression()': '<p style="width:expression(window.__X=1)">x</p>',
    'a stylesheet link': '<link rel="stylesheet" href="https://evil.example.com/x.css">',
    'a style block with @import': '<style>@import url(https://evil.example.com/x.css);</style>',
    'a data: URL document in an anchor': '<a href="data:text/html;base64,PHNjcmlwdD4x">x</a>',
    'an animated SVG handler': '<svg><animate onbegin="window.__X=1" attributeName="x"/></svg>',
    'a nested unknown element wrapping text': '<weird><p>KEEP THIS TEXT</p></weird>',
    'an autofocus image with onerror': '<img src="x" onerror="window.__X=1" autofocus>',
  };
  const res = await p.evaluate((vec) => {
    const out = {};
    for (const [name, html] of Object.entries(vec)) {
      const clean = _sanitiseForeignHTML(html);
      out[name] = {
        clean,
        handler: /\son[a-z]+\s*=/i.test(clean),
        scheme: /(javascript|vbscript)\s*:/i.test(clean.replace(/&#?\w+;/g, (m2) => { const t = document.createElement('textarea'); t.innerHTML = m2; return t.value; })),
        srcdoc: /srcdoc/i.test(clean),
        killed: /<(script|style|link|base|meta|object|embed|form|svg|math)\b/i.test(clean),
        cssFetch: /url\s*\(|expression\s*\(|@import/i.test(clean),
      };
    }
    return out;
  }, VECTORS);
  const bad = Object.entries(res).filter(([, v]) => v.handler || v.scheme || v.srcdoc || v.killed || v.cssFetch);
  m.row(S, `every one of ${Object.keys(VECTORS).length} adversarial vectors is neutralised`,
    bad.length === 0, bad.length ? bad.map(([k, v]) => `${k} → ${JSON.stringify(v.clean).slice(0, 90)}`).join('\n')
      : 'no handler, no script scheme, no srcdoc, no fetching CSS, none of the killed tags');
  m.row(S, 'an UNKNOWN element is unwrapped, so the words inside it survive (I1)',
    /KEEP THIS TEXT/.test(res['a nested unknown element wrapping text'].clean),
    JSON.stringify(res['a nested unknown element wrapping text'].clean));

  /* and the things a note legitimately contains must still come through */
  const kept = await p.evaluate(() => {
    const good = '<h2>A heading</h2><p><strong>bold</strong> and <a href="https://example.com" target="_blank">a link</a></p>'
      + '<ul><li>one</li></ul><table><tr><td colspan="2">cell</td></tr></table>'
      + '<img src="data:image/png;base64,iVBORw0KGgo=" alt="pic">'
      + '<div class="embed-wrap"><iframe src="https://www.youtube.com/embed/abc"></iframe></div>'
      + '<div contenteditable="false" class="widget" data-aid="a1">chrome</div>'
      + '<p dir="rtl">مراجعة</p><p>আমার</p>';
    const out = _sanitiseForeignHTML(good);
    return { heading: /<h2/.test(out), bold: /<strong/.test(out), link: /href="https:\/\/example\.com"/.test(out),
      rel: /rel="noopener noreferrer"/.test(out), list: /<li/.test(out), table: /colspan="2"/.test(out),
      img: /data:image\/png/.test(out), embed: /youtube\.com\/embed/.test(out),
      widget: /contenteditable="false"/.test(out), dataAttr: /data-aid="a1"/.test(out),
      rtl: /مراجعة/.test(out), bn: /আমার/.test(out), len: out.length };
  });
  const missing = Object.entries(kept).filter(([k, v]) => k !== 'len' && !v).map(([k]) => k);
  m.row(S, 'everything a note legitimately contains survives the sanitiser (I1)',
    missing.length === 0, missing.length ? `LOST: ${missing.join(', ')}` : `all 12 kinds kept (${kept.len} bytes)`);

  /* the whole pipeline: a hostile file, imported, then read back out of storage */
  const endToEnd = await p.evaluate((vec) => {
    const hostile = Object.values(vec).join('');
    const file = { sections: [], folders: [], trash: [],
      articles: [{ id: 'hx', title: 'hostile', content: hostile + '<p>SURVIVING WORDS</p>',
        folderIds: [], tags: [], kind: 'general', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }] };
    const r = _repairDB(file, 'imported');
    DB = mergeDB(DB, r.db); persist();
    const stored = JSON.parse(localStorage.getItem('my-notebook-v1')).articles.find((a) => a.id === 'hx');
    return { handler: /\son[a-z]+\s*=/i.test(stored.content), script: /<script/i.test(stored.content),
      words: /SURVIVING WORDS/.test(stored.content), bytes: stored.content.length };
  }, VECTORS);
  m.row(S, 'a hostile file leaves NO inline handler and NO script in PERSISTED note content',
    !endToEnd.handler && !endToEnd.script, `${endToEnd.bytes} bytes stored`);
  m.row(S, '…and the words that came with it are still there (I1)', endToEnd.words);
  await app.close();
});

writeFileSync(join(ROOT, 'audit', 'inventory', 'matrix-j.json'), JSON.stringify(m.rows, null, 1));
process.exit(m.finish() ? 1 : 0);
