/* audit-b-editor — Master Plan §4B: notes, the editor, pop-out ownership,
   autosave flushing, history, quota failure and the whole note lifecycle.

   This is the domain Finding 1 came out of, so it is tested the way Finding 1
   was found: with real mouse clicks and real typing, and by reading the
   answer back out of `DB` rather than off the screen.

   The central question is **ownership**. A note can be open in Pane 3's `#ed`
   or in a float window's `.fw-ed`. Two live editors on one note is the defect
   — whichever debounced autosave fires last silently overwrites the other.
   v04.35 fixed the one route that was known. This file asks the question of
   EVERY route, which is the only way the answer stays true.

   Run: node tools/audit-b-editor.mjs */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, openApp, matrix, seedDB, MALFORMED } from './harness.mjs';

const m = matrix('audit B — editor ownership, autosave flushing, note lifecycle');
const D = 'B notes/editor';
const AUTOSAVE_CEILING = 2800;   /* _ED_AUTOSAVE_MAX_MS is 2.5s — see tools/README.md */

/* A section that throws must not take the other eight with it: an audit that
   stops at the first surprise reports on whatever ran before the surprise and
   silently says nothing about the rest. The throw is recorded as a failed row,
   which is what it is. */
async function section(name, fn) {
  try { await fn(); }
  catch (e) { m.row(D, `${name} — the check itself threw`, false, String(e).split('\n')[0]); }
}

/* Open the app with one note in one folder and nothing else, so a count is
   never ambiguous about which note it is counting. */
const oneNote = () => {
  const now = new Date().toISOString();
  return { sections: [{ id: 's1', name: 'S', order: 0, updatedAt: now }],
    folders: [{ id: 'f1', name: '(001) One', parentId: null, order: 1, sectionId: 's1', updatedAt: now },
              { id: 'f2', name: '(002) Two', parentId: null, order: 2, sectionId: 's1', updatedAt: now }],
    articles: [{ id: 'n1', title: 'Note one', content: '<p>original</p>', folderIds: ['f1'],
      tags: [], kind: 'general', createdAt: now, updatedAt: now }],
    trash: [], theme: { preset: 'forest', custom: {} } };
};

/* ── B1. One editor per note, on every route that could open a second ──────
   Each route is driven for real, then the DOM is asked how many live
   contenteditable editors are pointed at that note. Two is the defect. */
await section('editor ownership', async () => {
  const ROUTES = [
    { name: 'pop out, then press Edit in Pane 3', run: async (p) => {
        await p.evaluate(() => { selArt('n1'); popOutNote('n1'); });
        await p.waitForTimeout(500);
        await p.evaluate(() => startEdit()); } },
    { name: 'press Edit in Pane 3, then pop out', run: async (p) => {
        await p.evaluate(() => { selArt('n1'); startEdit(); });
        await p.waitForTimeout(400);
        await p.evaluate(() => popOutNote('n1')); } },
    { name: 'pop out twice', run: async (p) => {
        await p.evaluate(() => { selArt('n1'); popOutNote('n1'); });
        await p.waitForTimeout(400);
        await p.evaluate(() => popOutNote('n1')); } },
    { name: 'pop out, then open the same note as a panel', run: async (p) => {
        await p.evaluate(() => { selArt('n1'); popOutNote('n1'); });
        await p.waitForTimeout(400);
        await p.evaluate(() => openNotePopup('n1', 'panel')); } },
    { name: 'panel, then pop out as a window', run: async (p) => {
        await p.evaluate(() => { selArt('n1'); openNotePopup('n1', 'panel'); });
        await p.waitForTimeout(400);
        await p.evaluate(() => openNotePopup('n1', 'float')); } },
    { name: 'edit in Pane 3, navigate away and back, then pop out', run: async (p) => {
        await p.evaluate(() => { selArt('n1'); startEdit(); });
        await p.waitForTimeout(300);
        await p.evaluate(() => { selFolder('f2'); selFolder('f1'); selArt('n1'); });
        await p.waitForTimeout(300);
        await p.evaluate(() => popOutNote('n1')); } },
    { name: 'pop out, select the note in the list, then Edit', run: async (p) => {
        await p.evaluate(() => { selArt('n1'); popOutNote('n1'); });
        await p.waitForTimeout(400);
        await p.evaluate(() => { selArt('n1'); startEdit(); }); } },
  ];
  for (const route of ROUTES) {
    const app = await openApp({ db: oneNote() });
    await route.run(app.page);
    await app.page.waitForTimeout(500);
    const owners = await app.page.evaluate(() => {
      const out = [];
      const ed = document.getElementById('ed');
      if (ed && ed.isContentEditable && getComputedStyle(ed).display !== 'none') out.push('#ed');
      document.querySelectorAll('.fw-ed').forEach((e) => { if (e.isContentEditable) out.push(e.id || '.fw-ed'); });
      const panel = document.querySelector('#note-modal .nm-ed, .nm-ed');
      if (panel && panel.isContentEditable) out.push('.nm-ed');
      return out;
    });
    m.row(D, `one editor per note — ${route.name}`, owners.length <= 1,
      owners.length ? `live editors: ${owners.join(', ')}` : 'no editor open (read mode)');
    m.row(D, `no exception — ${route.name}`, app.errors.length === 0, app.errors.slice(0, 2).join('\n') || 'silent');
    await app.close();
  }
})

/* ── B2. Every navigation route flushes what is on screen ──────────────────
   The Finding-1 family. Type into the editor that owns the note, leave by
   route X, and ask DB what it holds. Real clicks and real keystrokes: a
   selection assembled inside page.evaluate is not what the editor is holding
   (tools/README.md). */
await section('flush on navigation', async () => {
  const LEAVE = [
    { name: 'clicking another folder', go: (p) => p.evaluate(() => selFolder('f2')) },
    { name: 'opening a Smart View', go: (p) => p.evaluate(() => selFolder('sf-favs')) },
    { name: 'going Home', go: (p) => p.evaluate(() => goHome()) },
    { name: 'pressing Back out of the note', go: (p) => p.evaluate(() => back()) },
    { name: 'switching to the article-list pane', go: (p) => p.evaluate(() => showPane('p2')) },
    { name: 'closing the pop-up', go: (p) => p.evaluate(() => closeAllPopouts()) },
    { name: 'a real page reload', go: async (p) => { await p.reload({ waitUntil: 'domcontentloaded' });
        await p.waitForFunction(() => typeof window.render === 'function');
        await p.waitForTimeout(400); } },
  ];
  for (const host of ['pop-up', 'Pane 3']) {
    for (const leave of LEAVE) {
      const app = await openApp({ db: null });
      const p = app.page;
      /* build the notebook through the app so a reload does not re-seed it */
      await p.evaluate((seed) => { Object.assign(DB, seed); persist(); render(); }, oneNote());
      await p.waitForTimeout(250);
      await p.evaluate(() => selArt('n1'));
      await p.waitForTimeout(250);
      let sel;
      if (host === 'pop-up') { await p.evaluate(() => popOutNote('n1')); await p.waitForTimeout(500); sel = '#fw-ed-n1'; }
      else { await p.evaluate(() => startEdit()); await p.waitForTimeout(400); sel = '#ed'; }
      const el = await p.$(sel);
      if (!el) { m.row(D, `${host}: typing survives ${leave.name}`, false, `no editor at ${sel}`); await app.close(); continue; }
      await el.click();
      await p.keyboard.type('FLUSH MARKER ' + host);
      await p.waitForTimeout(250);
      await leave.go(p);
      await p.waitForTimeout(AUTOSAVE_CEILING);
      const got = await p.evaluate(() => { const a = DB.articles.find((x) => x.id === 'n1');
        let stored = null; try { stored = (JSON.parse(localStorage.getItem('my-notebook-v1') || '{}').articles || []).find((x) => x.id === 'n1'); } catch {}
        return { db: a ? a.content : null, ls: stored ? stored.content : null }; });
      const ok = !!got.db && got.db.includes('FLUSH MARKER');
      m.row(D, `${host}: typing survives ${leave.name} (I1)`, ok,
        ok ? `in DB (${got.db.length}b)${got.ls && got.ls.includes('FLUSH MARKER') ? ' and in storage' : ' — NOT yet in storage'}`
           : `LOST — DB holds ${JSON.stringify((got.db || '').slice(0, 60))}`);
      await app.close();
    }
  }
})

/* ── B3. Storage full ──────────────────────────────────────────────────────
   localStorage throws QuotaExceededError when it is full, and the app is a
   single file that keeps the whole notebook in it. What must NOT happen is
   the in-memory notebook being damaged, or the failure passing in silence. */
await section('storage full', async () => {
  const app = await openApp({ db: oneNote() });
  const p = app.page;
  /* The caret goes in FIRST. The app answers a failed write with a real
     full-screen modal, and `#ov` then intercepts every click — so stubbing
     before the click made this check time out on its own success. */
  await p.evaluate(() => { selArt('n1'); startEdit(); });
  await p.waitForTimeout(400);
  const ed = await p.$('#ed');
  await ed.click();
  await p.evaluate(() => {
    window.__quotaHits = 0;
    const real = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === 'my-notebook-v1') { window.__quotaHits++;
        const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; }
      return real.call(this, k, v);
    };
  });
  await p.keyboard.type('QUOTA MARKER');
  await p.waitForTimeout(AUTOSAVE_CEILING);
  const s = await p.evaluate(() => ({ hits: window.__quotaHits,
    content: DB.articles.find((a) => a.id === 'n1')?.content || '',
    notes: DB.articles.length,
    told: !!document.querySelector('.toast, #ov.on, .modal.on')
      || /storage|space|full|quota|could not save/i.test(document.body.innerText) }));
  m.row(D, 'a full localStorage is actually exercised by this check', s.hits > 0, `${s.hits} rejected writes`);
  m.row(D, 'a full localStorage does not damage the in-memory notebook (I1)',
    s.content.includes('QUOTA MARKER') && s.notes === 1, `${s.notes} notes, content ${s.content.length}b`);
  m.row(D, 'a full localStorage is reported to the owner, not swallowed', s.told,
    s.told ? 'a modal or toast is on screen' : 'NOTHING on screen said the save failed');
  /* The app's own `console.error('Local save failed: …')` is the app doing
     its job, not a crash. Only a thrown, unhandled exception counts. */
  const thrown = app.errors.filter((e) => e.startsWith('pageerror:'));
  m.row(D, 'a full localStorage throws no unhandled exception', thrown.length === 0,
    thrown.slice(0, 2).join('\n') || `silent (the app logged ${app.errors.length} deliberate report(s))`);
  await app.close();
})

/* ── B4. Note history ─────────────────────────────────────────────────────── */
await section('note history', async () => {
  const app = await openApp({ db: oneNote() });
  const p = app.page;
  await p.evaluate(() => { selArt('n1'); startEdit(); });
  await p.waitForTimeout(400);
  (await p.$('#ed')).click();
  await p.keyboard.type('VERSION TWO');
  await p.waitForTimeout(AUTOSAVE_CEILING);
  await p.evaluate(() => saveArt());
  await p.waitForTimeout(400);
  /* The key is `noteHistory`, not `history` — the first cut asked for the
     wrong field and reported a working feature as absent. */
  const h = await p.evaluate(() => { const a = DB.articles.find((x) => x.id === 'n1');
    return { n: (a.noteHistory || []).length, cur: a.content,
      firstId: (a.noteHistory || [])[0]?.id || null, first: (a.noteHistory || [])[0]?.content ?? null }; });
  m.row(D, 'editing a note records a history entry', h.n > 0, `${h.n} entries held`);
  /* restoreNoteHistory(aid, versionId) confirms first, and captures the
     CURRENT text into history before overwriting it — so the assertion is
     both halves: the old text comes back AND the new text is not lost. */
  const restored = await p.evaluate(() => {
    const a = DB.articles.find((x) => x.id === 'n1');
    const v = (a.noteHistory || [])[0];
    if (!v) return { err: 'no history to restore' };
    const live = a.content;
    window.confirm = () => true;
    try { restoreNoteHistory('n1', v.id); } catch (e) { return { err: String(e) }; }
    const b = DB.articles.find((x) => x.id === 'n1');
    return { content: b.content, wanted: v.content, depth: (b.noteHistory || []).length,
      keptLive: (b.noteHistory || []).some((x) => x.content === live) };
  });
  m.row(D, 'restoring from history puts the earlier text back',
    !restored.err && restored.content === restored.wanted,
    restored.err || `now ${JSON.stringify((restored.content || '').slice(0, 40))}`);
  m.row(D, 'restoring from history does NOT lose the version being replaced (I1)',
    !restored.err && restored.keptLive, restored.err || `${restored.depth} versions held, the replaced one among them`);
  await app.close();
})

/* ── B5. Text the app was not written in ──────────────────────────────────
   Bangla and Arabic, typed for real and read back out of storage. A notebook
   whose owner writes in these is not an edge case. */
await section('Bangla and Arabic', async () => {
  const app = await openApp({ db: null });
  const p = app.page;
  await p.evaluate((seed) => { Object.assign(DB, seed); persist(); render(); }, oneNote());
  await p.waitForTimeout(250);
  await p.evaluate(() => { selArt('n1'); startEdit(); });
  await p.waitForTimeout(400);
  const ed = await p.$('#ed');
  await ed.click();
  const BN = 'আমার জ্ঞানের নোটবই';
  const AR = 'مراجعة الحفظ';
  await p.keyboard.type(BN + ' | ' + AR);
  await p.waitForTimeout(AUTOSAVE_CEILING);
  await p.evaluate(() => { saveArt(); persist(); });
  await p.waitForTimeout(400);
  const got = await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('my-notebook-v1') || '{}');
    const a = (raw.articles || []).find((x) => x.id === 'n1');
    return a ? a.content : ''; });
  m.row(D, 'Bangla text round-trips through the editor into storage byte for byte', got.includes(BN), `stored ${got.length}b`);
  m.row(D, 'Arabic text round-trips through the editor into storage byte for byte', got.includes(AR), `stored ${got.length}b`);
  await app.close();
})

/* ── B6. The whole note lifecycle, asserted on the MODEL ──────────────────
   create → rename → duplicate → archive → unarchive → trash → restore →
   trash again → empty trash → tombstone. Every step read out of DB, because
   a list that no longer shows a note is not the same claim as a note that is
   no longer there — and D3 says deleting must keep working. */
await section('note lifecycle', async () => {
  const app = await openApp({ db: oneNote() });
  const p = app.page;
  const st = () => p.evaluate(() => ({
    notes: DB.articles.length, trash: (DB.trash || []).length,
    tombs: (DB.tombstones || []).length,
    n1: (() => { const a = DB.articles.find((x) => x.id === 'n1'); return a ? { title: a.title, archived: !!a.archived } : null; })(),
    ids: DB.articles.map((a) => a.id),
  }));
  const a0 = await st();

  await p.evaluate(() => { selFolder('f1'); quickNewNote(); });
  await p.waitForTimeout(700);
  const a1 = await st();
  m.row(D, 'create — a new note really lands in the model', a1.notes === a0.notes + 1, `${a0.notes} → ${a1.notes}`);
  await p.evaluate(() => closeAllPopouts());
  await p.waitForTimeout(400);

  await p.evaluate(() => { const a = DB.articles.find((x) => x.id === 'n1'); a.title = 'Renamed note'; a.updatedAt = new Date().toISOString(); persist(); render(); });
  const a2 = await st();
  m.row(D, 'rename — the new title is what the model holds', a2.n1.title === 'Renamed note', a2.n1.title);

  await p.evaluate(() => duplicateNote('n1'));
  await p.waitForTimeout(500);
  const a3 = await st();
  m.row(D, 'duplicate — one more note, and the original is untouched',
    a3.notes === a2.notes + 1 && a3.n1 && a3.n1.title === 'Renamed note', `${a2.notes} → ${a3.notes}`);

  await p.evaluate(() => toggleArchive('n1'));
  await p.waitForTimeout(300);
  const a4 = await st();
  m.row(D, 'archive — the note is marked, not removed (I1)', a4.n1 && a4.n1.archived && a4.notes === a3.notes,
    `archived=${a4.n1?.archived}, ${a4.notes} notes`);
  await p.evaluate(() => toggleArchive('n1'));
  await p.waitForTimeout(300);
  const a5 = await st();
  m.row(D, 'unarchive — fully reversible', a5.n1 && !a5.n1.archived, `archived=${a5.n1?.archived}`);

  await p.evaluate(() => trashArt('n1'));
  await p.waitForTimeout(400);
  const a6 = await st();
  m.row(D, 'delete — the note leaves the list and lands in Trash, never nowhere (D3)',
    !a6.ids.includes('n1') && a6.trash === a5.trash + 1, `${a6.notes} notes, ${a6.trash} in trash`);

  const restored = await p.evaluate(() => {
    const t = (DB.trash || []).find((x) => (x.item && x.item.id) === 'n1' || x.id === 'n1');
    if (!t) return { err: 'not found in trash' };
    try { restoreItem(t.id ?? (t.item && t.item.id)); } catch (e) { return { err: String(e) }; }
    return { back: !!DB.articles.find((x) => x.id === 'n1'), trash: (DB.trash || []).length };
  });
  await p.waitForTimeout(400);
  m.row(D, 'restore — a trashed note comes back whole', restored && !restored.err && restored.back,
    restored?.err || `back in the list, ${restored?.trash} left in trash`);

  await p.evaluate(() => trashArt('n1'));
  await p.waitForTimeout(300);
  await p.evaluate(() => { window.confirm = () => true; window.prompt = () => 'DELETE'; emptyTrash(); });
  await p.waitForTimeout(500);
  const a8 = await st();
  m.row(D, 'empty trash — the note is gone and a tombstone remains so it cannot resurrect on sync (I2)',
    a8.trash === 0 && a8.tombs > 0, `${a8.trash} in trash, ${a8.tombs} tombstones`);
  m.row(D, 'the whole lifecycle throws nothing', app.errors.length === 0, app.errors.slice(0, 3).join('\n') || 'silent');
  await app.close();
})

/* ── B7. A very large note ───────────────────────────────────────────────── */
await section('a very large note', async () => {
  const app = await openApp({ db: oneNote() });
  const p = app.page;
  const big = '<p>' + 'A large paragraph of text. '.repeat(20000) + '</p>';   /* ~540 KB */
  const t0 = Date.now();
  const res = await p.evaluate((b) => {
    const a = DB.articles.find((x) => x.id === 'n1'); a.content = b; a.updatedAt = new Date().toISOString();
    try { persist(); } catch (e) { return { err: String(e) }; }
    selArt('n1'); renderP3C();
    return { len: DB.articles.find((x) => x.id === 'n1').content.length,
      painted: (document.getElementById('p3c').innerText || '').length };
  }, big);
  m.row(D, 'a ~540 KB note saves and paints without throwing', !res.err && res.len === big.length && res.painted > 1000,
    res.err || `${res.len}b held, ${res.painted} chars painted, ${Date.now() - t0}ms`);
  await app.close();
})

writeFileSync(join(ROOT, 'audit', 'inventory', 'matrix-b.json'), JSON.stringify(m.rows, null, 1));
process.exit(m.finish() ? 1 : 0);
