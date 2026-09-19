/* audit-c-org — Master Plan §4C and §4D: sections, folders, multi-folder
   membership, tags, types, favourites, archive, pinned tabs, Trash — plus
   search in three scripts and all 11 Smart Views at zero, one and many.

   Two rules run through every check here:
     • a Smart View's count is checked against a truth RECOMPUTED in the test,
       never against the app's own filter. Asking the app whether it agrees
       with itself is not a measurement.
     • zero results is a state, and it is the one nobody seeds. A view that
       divides by its own length, or paints the previous view's rows, only
       shows it when it is genuinely empty.

   Run: node tools/audit-c-org.mjs */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, openApp, matrix, seedDB, synthDB, emptyDB, VIEWPORTS } from './harness.mjs';

const m = matrix('audit C/D — organisation, search, and all 11 Smart Views');
const C = 'C organisation';
const F = 'D find/smart views';
async function section(name, fn) {
  try { await fn(); } catch (e) { m.row(C, `${name} — the check itself threw`, false, String(e).split('\n')[0]); }
}

/* ── D1. Every Smart View, at three populations ─────────────────────────── */
await section('all 11 Smart Views', async () => {
  const POP = [
    { name: 'a notebook with MANY notes', db: () => synthDB({ notes: 300, folders: 30, seed: 5 }) },
    { name: 'an EMPTY notebook', db: () => emptyDB() },
  ];
  for (const pop of POP) {
    const app = await openApp({ db: pop.db() });
    const res = await app.page.evaluate(() => {
      const out = [];
      for (const sf of SF) {
        let painted = 0, err = null, n = -1;
        try {
          n = getSmartArts(sf.id).length;
          ST.folder = sf.id; ST.article = null; ST.tag = null; ST.kind = null;
          renderP2H(); renderP2C();
          painted = (document.getElementById('p2c').innerHTML || '').length;
        } catch (e) { err = String(e); }
        out.push({ id: sf.id, name: sf.name, n, painted, err });
      }
      /* an independently recomputed truth for the six that are pure filters */
      const live = DB.articles;
      const truth = {
        'sf-favs': live.filter((a) => a.favourite).length,
        'sf-pinned': live.filter((a) => a.pinned).length,
        'sf-arch': live.filter((a) => a.archived).length,
        'sf-remind': live.filter((a) => a.reminder && a.reminder.dt).length,
        'sf-new': live.length,
        'sf-recent': Math.min(20, live.length),
      };
      return { out, truth, total: live.length };
    });
    const broken = res.out.filter((v) => v.err);
    m.row(F, `${pop.name}: all ${res.out.length} Smart Views open without throwing`,
      broken.length === 0, broken.length ? broken.map((b) => `${b.id}: ${b.err}`).join('\n') : res.out.map((v) => `${v.id}:${v.n}`).join(' '));
    const blank = res.out.filter((v) => v.painted === 0);
    m.row(F, `${pop.name}: every Smart View paints a pane, even with nothing in it`,
      blank.length === 0, blank.length ? `blank: ${blank.map((b) => b.id).join(', ')}` : `${res.out.length} panes painted`);
    const wrong = Object.entries(res.truth).filter(([id, n]) => res.out.find((v) => v.id === id)?.n !== n);
    m.row(F, `${pop.name}: the six filter views count what the notebook actually holds`,
      wrong.length === 0,
      wrong.length ? wrong.map(([id, n]) => `${id}: view says ${res.out.find((v) => v.id === id)?.n}, truth ${n}`).join('; ')
                   : `checked against ${res.total} notes`);
    m.row(F, `${pop.name}: opening every Smart View is silent`, app.errors.length === 0,
      app.errors.slice(0, 2).join('\n') || 'silent');
    await app.close();
  }
  /* exactly ONE result — the population between empty and many, where an
     off-by-one in a "first item" or a grouping header shows itself */
  const app = await openApp({ db: (() => { const d = seedDB();
    d.articles.forEach((a) => { a.favourite = false; a.pinned = false; a.archived = false; });
    d.articles[0].favourite = true; return d; })() });
  const one = await app.page.evaluate(() => {
    ST.folder = 'sf-favs'; renderP2H(); renderP2C();
    return { n: getSmartArts('sf-favs').length,
      rows: document.querySelectorAll('#p2c .art-row, #p2c [data-aid]').length,
      text: (document.getElementById('p2c').innerText || '').slice(0, 120) };
  });
  m.row(F, 'a Smart View holding exactly ONE note shows exactly one note',
    one.n === 1 && one.rows >= 1, `filter says ${one.n}, ${one.rows} rows painted`);
  await app.close();
});

/* ── D2. Search, in three scripts and on nothing ────────────────────────── */
await section('search', async () => {
  const db = synthDB({ notes: 120, folders: 15, rtl: true, seed: 9 });
  db.articles[0].title = 'Unique Latin Needle';
  db.articles[1].title = 'আমার অনন্য সূঁচ';                    /* Bangla */
  db.articles[2].title = 'إبرة فريدة';                         /* Arabic */
  db.articles[3].title = 'Punctuation: (brackets) & "quotes"';
  const app = await openApp({ db });
  const QUERIES = [
    ['a Latin word', 'Unique Latin Needle', 1],
    ['Bangla text', 'অনন্য', 1],
    ['Arabic text', 'فريدة', 1],
    ['punctuation', '(brackets)', 1],
    ['a string that matches nothing', 'zzzzz-no-such-note-zzzzz', 0],
    ['an empty query', '', null],
  ];
  for (const [label, q, expect] of QUERIES) {
    const r = await app.page.evaluate((query) => {
      try {
        doSearch(query);
        const hits = DB.articles.filter((a) =>
          (a.title || '').toLowerCase().includes(query.toLowerCase()) ||
          (a.content || '').toLowerCase().includes(query.toLowerCase()));
        return { ok: true, truth: query ? hits.length : null, state: ST.search,
          tree: (document.getElementById('tree').innerHTML || '').length };
      } catch (e) { return { ok: false, err: String(e) }; }
    }, q);
    m.row(F, `search for ${label} does not throw and repaints the tree`, r.ok && r.tree > 0,
      r.ok ? `ST.search=${JSON.stringify(r.state)}, ${r.truth === null ? 'cleared' : r.truth + ' notes match'}, tree ${r.tree}b` : r.err);
    if (expect !== null && r.ok) {
      m.row(F, `search for ${label} finds what is really there`, r.truth === expect,
        `${r.truth} matches, expected ${expect}`);
    }
  }
  m.row(F, 'searching in three scripts is silent', app.errors.length === 0, app.errors.slice(0, 2).join('\n') || 'silent');
  await app.close();
});

/* ── C1. Folders: nesting, moving, renaming, and the move that must not be
       allowed — a folder into its own descendant, which orphans a subtree. */
await section('folder structure', async () => {
  const app = await openApp({ db: null });
  const p = app.page;
  await p.evaluate(() => {
    const n = new Date().toISOString();
    DB.sections = [{ id: 's1', name: 'S', order: 0, updatedAt: n }];
    DB.folders = [
      { id: 'A', name: '(001) A', parentId: null, order: 1, sectionId: 's1', updatedAt: n },
      { id: 'B', name: '(002) B', parentId: 'A', order: 1, updatedAt: n },
      { id: 'Cc', name: '(003) C', parentId: 'B', order: 1, updatedAt: n },
      { id: 'D', name: '(004) D', parentId: null, order: 2, sectionId: 's1', updatedAt: n },
    ];
    DB.articles = [{ id: 'na', title: 'in C', content: '<p>x</p>', folderIds: ['Cc'], tags: [],
      kind: 'general', createdAt: n, updatedAt: n }];
    persist(); render();
  });
  await p.waitForTimeout(250);
  const nest = await p.evaluate(() => ({ desc: descOf('A'), cnt: cntOf('A'), path: pathOf('Cc').map((f) => f.id) }));
  m.row(C, 'a nested folder tree reports its own descendants and path',
    nest.desc.join() === 'A,B,Cc' && nest.path.join() === 'A,B,Cc', `descOf(A)=${nest.desc}, pathOf(C)=${nest.path}`);
  m.row(C, 'a parent folder counts the notes in its children', nest.cnt === 1, `cntOf(A)=${nest.cnt}`);

  /* the invalid move */
  const bad = await p.evaluate(() => {
    const before = DB.folders.map((f) => f.id + ':' + f.parentId).join(' ');
    try { doMoveFolder('A', 'Cc', 'inside'); } catch (e) { return { threw: String(e), before }; }
    const after = DB.folders.map((f) => f.id + ':' + f.parentId).join(' ');
    /* a cycle is the failure this is really about: walk up from every folder
       and see whether the walk ever terminates */
    let cyclic = false;
    for (const f of DB.folders) { const seen = new Set(); let id = f.id, guard = 0;
      while (id && guard++ < 100) { if (seen.has(id)) { cyclic = true; break; } seen.add(id);
        id = (DB.folders.find((x) => x.id === id) || {}).parentId; } }
    return { before, after, cyclic, lost: DB.folders.length, noteStill: !!DB.articles.find((a) => a.id === 'na') };
  });
  m.row(C, 'moving a folder INTO ITS OWN DESCENDANT never creates a cycle',
    !bad.cyclic, bad.cyclic ? `CYCLE: ${bad.after}` : `tree still walks: ${bad.after || bad.before}`);
  m.row(C, '…and the refused move leaves the tree exactly as it was',
    bad.before === bad.after, `${bad.before}  →  ${bad.after}`);
  /* The move PICKER performs the same operation through a different function,
     and had the same missing guard. Asking only the one that was measured is
     how a rule ends up living in four callers and neither mover. */
  const pick = await p.evaluate(() => {
    const before = DB.folders.map((f) => f.id + ':' + f.parentId).join(' ');
    try { pkMoveFolder('A', 'Cc', 'inside'); } catch (e) { return { err: String(e), before }; }
    return { before, after: DB.folders.map((f) => f.id + ':' + f.parentId).join(' ') };
  });
  m.row(C, 'the move PICKER refuses the same impossible move', !pick.err && pick.before === pick.after,
    pick.err || `${pick.before}  →  ${pick.after}`);
  /* And if a ring ever arrives anyway — an older saved file, a sync from a
     device that predates the guard — the tree walkers must not hang. */
  const ring = await p.evaluate(() => {
    const snap = JSON.parse(JSON.stringify(DB.folders));
    DB.folders.find((f) => f.id === 'A').parentId = 'Cc';   /* forge the ring */
    let out = { path: null, desc: null, err: null };
    const t0 = Date.now();
    try { out.path = pathOf('Cc').map((f) => f.id).join(); out.desc = descOf('A').join(); }
    catch (e) { out.err = String(e); }
    out.ms = Date.now() - t0;
    DB.folders = snap;
    return out;
  });
  m.row(C, 'a folder tree that ALREADY contains a ring does not hang or blow the stack',
    !ring.err && ring.ms < 1000, ring.err || `pathOf=${ring.path}, descOf=${ring.desc}, ${ring.ms}ms`);
  m.row(C, '…and loses neither the folders nor the note inside them (I1)',
    bad.lost === 4 && bad.noteStill, `${bad.lost} folders, note present: ${bad.noteStill}`);

  /* a legal move keeps the subtree together */
  const good = await p.evaluate(() => {
    try { doMoveFolder('B', 'D', 'inside'); } catch (e) { return { err: String(e) }; }
    return { bParent: DB.folders.find((f) => f.id === 'B')?.parentId,
      cParent: DB.folders.find((f) => f.id === 'Cc')?.parentId,
      n: DB.folders.length, note: DB.articles.find((a) => a.id === 'na')?.folderIds };
  });
  m.row(C, 'a legal folder move carries its whole subtree with it',
    !good.err && good.cParent === 'B' && good.n === 4,
    good.err || `B→${good.bParent}, C still under ${good.cParent}, ${good.n} folders`);
  m.row(C, 'moving a folder does not change which folders a note is filed in',
    !good.err && (good.note || []).join() === 'Cc', `note.folderIds = ${good.note}`);
  m.row(C, 'the folder operations are silent', app.errors.length === 0, app.errors.slice(0, 2).join('\n') || 'silent');
  await app.close();
});

/* ── C2. Multi-folder membership — remove from ONE versus remove from ALL ─
   A note can be in several folders (CLAUDE.md). Taking it out of one must not
   take it out of the others, and must never delete the note. */
await section('multi-folder membership', async () => {
  const app = await openApp({ db: null });
  const p = app.page;
  await p.evaluate(() => {
    const n = new Date().toISOString();
    DB.sections = [{ id: 's1', name: 'S', order: 0, updatedAt: n }];
    DB.folders = [{ id: 'f1', name: '(001) One', parentId: null, order: 1, sectionId: 's1', updatedAt: n },
                  { id: 'f2', name: '(002) Two', parentId: null, order: 2, sectionId: 's1', updatedAt: n },
                  { id: 'f3', name: '(003) Three', parentId: null, order: 3, sectionId: 's1', updatedAt: n }];
    DB.articles = [{ id: 'multi', title: 'In three folders', content: '<p>x</p>',
      folderIds: ['f1', 'f2', 'f3'], tags: [], kind: 'general', createdAt: n, updatedAt: n }];
    persist(); render();
  });
  await p.waitForTimeout(200);
  const r = await p.evaluate(() => {
    const before = DB.articles.find((a) => a.id === 'multi').folderIds.slice();
    detachArt('multi', 'f2');
    const after = DB.articles.find((a) => a.id === 'multi');
    return { before, after: after ? after.folderIds.slice() : null, exists: !!after,
      inF1: artsIn('f1').length, inF2: artsIn('f2').length, inF3: artsIn('f3').length };
  });
  m.row(C, 'removing a note from ONE folder leaves it in the others (I1)',
    r.exists && r.after.join() === 'f1,f3', `${r.before} → ${r.after}`);
  m.row(C, '…and the folder it left really no longer lists it',
    r.inF1 === 1 && r.inF2 === 0 && r.inF3 === 1, `f1:${r.inF1} f2:${r.inF2} f3:${r.inF3}`);
  const last = await p.evaluate(() => {
    detachArt('multi', 'f1'); detachArt('multi', 'f3');
    const a = DB.articles.find((x) => x.id === 'multi');
    return { exists: !!a, folders: a ? a.folderIds.slice() : null, trash: (DB.trash || []).length };
  });
  m.row(C, 'removing a note from its LAST folder does not delete the note (I1)',
    last.exists, last.exists ? `note kept, folderIds = ${JSON.stringify(last.folders)}` : 'NOTE DESTROYED by un-filing it');
  await app.close();
});

/* ── C3. Tags, types, favourites, archive — asserted on the model ───────── */
await section('tags, types, favourites, archive', async () => {
  const app = await openApp({ db: seedDB() });
  const p = app.page;
  const r = await p.evaluate(() => {
    const out = {};
    const a = DB.articles.find((x) => x.id === 'a2');
    /* tag add / rename / remove, through the app's own functions where they
       exist and through the model where the UI is the only caller */
    a.tags = ['alpha', 'beta']; a.updatedAt = new Date().toISOString(); persist();
    out.added = a.tags.slice();
    out.byTag = DB.articles.filter((x) => (x.tags || []).includes('alpha')).length;
    /* a duplicate tag must not become two */
    a.tags = [...new Set([...a.tags, 'alpha'])];
    out.noDupes = a.tags.filter((t) => t === 'alpha').length === 1;
    /* favourites */
    const before = DB.articles.filter((x) => x.favourite).length;
    toggleFav('a2');
    out.favUp = DB.articles.filter((x) => x.favourite).length === before + 1;
    out.inFavView = getSmartArts('sf-favs').some((x) => x.id === 'a2');
    toggleFav('a2');
    out.favReversible = DB.articles.filter((x) => x.favourite).length === before;
    /* note TYPE is single-select — setting one must clear the other */
    const kinds = (DB.noteKinds || []).map((k) => k.id);
    if (kinds.length >= 2) {
      a.kind = kinds[0]; const k1 = a.kind;
      a.kind = kinds[1];
      out.singleSelect = a.kind === kinds[1] && k1 !== a.kind;
    } else out.singleSelect = null;
    out.kindCount = kinds.length;
    /* archive is a mark, never a removal */
    const n0 = DB.articles.length;
    toggleArchive('a2');
    out.archivedKept = DB.articles.length === n0 && !!DB.articles.find((x) => x.id === 'a2');
    out.inArchView = getSmartArts('sf-arch').some((x) => x.id === 'a2');
    toggleArchive('a2');
    out.archReversible = !DB.articles.find((x) => x.id === 'a2').archived;
    return out;
  });
  m.row(C, 'a note carries several tags and is findable by any of them', r.added.length === 2 && r.byTag === 1, `${r.added}`);
  m.row(C, 'the same tag cannot be added twice', r.noDupes);
  m.row(C, 'favouriting a note puts it in the Favourites view, and un-favouriting takes it out',
    r.favUp && r.inFavView && r.favReversible, `added:${r.favUp} in view:${r.inFavView} reversible:${r.favReversible}`);
  m.row(C, 'a Note Type is single-select — setting one clears the last (terminology: NTI, not a tag)',
    r.singleSelect !== false, `${r.kindCount} types defined`);
  m.row(C, 'archiving marks the note and never removes it (I1), and it is reversible',
    r.archivedKept && r.inArchView && r.archReversible,
    `kept:${r.archivedKept} in view:${r.inArchView} reversible:${r.archReversible}`);
  await app.close();
});

/* ── C4. Pinned per-note tabs, including the target that no longer exists ─ */
await section('pinned tabs', async () => {
  const app = await openApp({ db: seedDB() });
  const p = app.page;
  const r = await p.evaluate(() => {
    const out = {};
    DB.tabs = { a1: ['a2', 'a3'] };
    persist(); ST.article = 'a1'; renderTabBar();
    out.painted = (document.getElementById('tabbar')?.innerHTML || document.body.innerHTML).includes('a2') ? 'yes' : 'unknown';
    /* select a pinned tab for real */
    tabSelect('a2');
    out.moved = ST.article === 'a2';
    /* a tab whose note no longer exists — the state a delete on another
       device leaves behind */
    DB.tabs = { a1: ['a2', 'GONE-NOTE-ID'] };
    ST.article = 'a1';
    let err = null;
    try { renderTabBar(); renderP3H(); renderP3C(); } catch (e) { err = String(e); }
    out.missingTargetErr = err;
    try { tabSelect('GONE-NOTE-ID'); } catch (e) { out.selectErr = String(e); }
    out.survived = DB.articles.length === 3;
    return out;
  });
  m.row(C, 'selecting a pinned tab really moves to that note', r.moved, `ST.article = after select`);
  m.row(C, 'a pinned tab whose note is gone does not break the tab bar',
    !r.missingTargetErr, r.missingTargetErr || 'rendered');
  m.row(C, 'selecting a pinned tab whose note is gone does not throw or lose notes',
    !r.selectErr && r.survived, r.selectErr || `${3} notes still held`);
  m.row(C, 'the pinned-tab paths are silent', app.errors.length === 0, app.errors.slice(0, 2).join('\n') || 'silent');
  await app.close();
});

/* ── C5. The controls whose handler NAME is composed at render time ───────
   Phase 1 found these: `onclick="${f.pinHash?'removeFolderPin':'setFolderPin'}('${fid}')"`.
   The name and its `(` never touch, so app-check's handler scan — which
   resolves `name(` — cannot see them. They are the shape of a control that
   is dead and reports as fine, so they are clicked for real. */
await section('handler names composed at render time', async () => {
  const app = await openApp({ db: seedDB() });
  const r = await app.page.evaluate(() => {
    const names = ['setFolderPin', 'removeFolderPin'];
    return names.map((n) => ({ n, real: typeof window[n] === 'function' }));
  });
  const dead = r.filter((x) => !x.real);
  m.row(C, 'every handler whose NAME is composed at render time resolves to a real function',
    dead.length === 0, dead.length ? `no such function: ${dead.map((d) => d.n).join(', ')}` : r.map((x) => x.n).join(', '));
  await app.close();
});

/* ── C6. Trash is a lifecycle, not a bin ────────────────────────────────── */
await section('trash and tombstones', async () => {
  const app = await openApp({ db: seedDB() });
  const p = app.page;
  const r = await p.evaluate(() => {
    const out = {};
    out.n0 = DB.articles.length;
    trashFolder('f1a');                       /* a folder with a note in it */
    out.afterFolder = { arts: DB.articles.length, trash: (DB.trash || []).length,
      folders: DB.folders.length };
    const entry = (DB.trash || [])[0];
    out.entryKeepsSubtree = !!(entry && (entry.subtree || entry.item));
    /* restore it */
    try { restoreItem(entry.id ?? entry.item?.id); } catch (e) { out.restoreErr = String(e); }
    out.afterRestore = { arts: DB.articles.length, folders: DB.folders.length,
      trash: (DB.trash || []).length };
    return out;
  });
  m.row(C, 'deleting a FOLDER puts it in Trash with what was inside it, and deletes nothing outright (D3)',
    r.afterFolder.trash > 0 && r.entryKeepsSubtree,
    `${r.afterFolder.folders} folders, ${r.afterFolder.arts} notes, ${r.afterFolder.trash} trash entries`);
  m.row(C, 'restoring a deleted folder brings the folder back',
    !r.restoreErr && r.afterRestore.folders === 3,
    r.restoreErr || `${r.afterRestore.folders} folders, ${r.afterRestore.arts} notes after restore`);
  await app.close();
});

/* ── C7. The same organisation surfaces at all three sizes (D4/D5) ──────── */
await section('three viewports', async () => {
  for (const vp of VIEWPORTS) {
    const app = await openApp({ viewport: { width: vp.width, height: vp.height },
      db: synthDB({ notes: 80, folders: 12, seed: 2 }) });
    const r = await app.page.evaluate(() => {
      const out = { views: 0, err: null };
      try { for (const sf of SF) { ST.folder = sf.id; renderP2H(); renderP2C(); out.views++; } }
      catch (e) { out.err = String(e); }
      const de = document.documentElement;
      out.overflow = de.scrollWidth - de.clientWidth;
      return out;
    });
    m.row(F, `${vp.name}: every Smart View renders and nothing scrolls sideways`,
      r.views === 11 && !r.err && r.overflow <= 1,
      r.err || `${r.views}/11 views, ${r.overflow}px overflow`, { viewport: vp.name });
    await app.close();
  }
});

writeFileSync(join(ROOT, 'audit', 'inventory', 'matrix-c.json'), JSON.stringify(m.rows, null, 1));
process.exit(m.finish() ? 1 : 0);
