#!/usr/bin/env node
/* tools/jeb-j1.mjs — v04.98, J1: Jeb's data (pockets and items) — synced, merged, trashed, restored (checks 59a–59h).

   No UI this round, so every check drives the real jeb*() functions J2 will call, in a booted app, and judges
   what reached DB, Trash, the other devices and the cloud.

   59a  fresh notebook: the four default pockets, once; two devices seeding at once still make 4 (same ids);
        an emptied jebPockets is never re-seeded
   59b  tools/sync-audit.mjs (the J-operations): every Jeb operation, both directions
   59c  deletion sticks: B, holding the old copy, does not resurrect a deleted item; a restore reaches B
   59d  jebToNote: title/content/tags/folders/kind/fromJeb/journal, one persist(), tombstone and no Trash
        entry, createdAt kept, nothing removed when the note cannot be built
   59e  three devices against one fake cloud add items to the same pocket at once: all converge on every item
        (the head path: jeb~ recs are NOT written)
   59f  the real v04.97 build (git) receives a cloud holding Jeb data, edits an unrelated note and pushes:
        the v04.98 devices still hold every Jeb record, unchanged
   59g  Save File + backup HTML round trip; JSON import "replace" and "merge" both keep Jeb
   59h  size: 2,000 items in 8 pockets — head size, split or not, a full merge and persist() on a phone (x4)

   `--only=59a,59c` runs just those. Each printed ok/FAIL line becomes one app-check check (block 59). */
import { playwright, serve, seedDB, ROOT } from './harness.mjs';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeCloud, addDevice, on, sleep, quiet, check, results, NB } from './s1-fake.mjs';
import { assembleRecs } from './s1-assemble.mjs';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);

const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];
const T0 = '2026-10-01T00:00:00.000Z';
const OLD97 = '5b65080';   /* the merge of v04.97 (PR #143): the real previous build */
const SEED_IDS = ['jp-idea', 'jp-link', 'jp-shop', 'jp-task'];

const pw = await playwright();
const srv = await serve();
const browser = await pw.chromium.launch();
const dev = (cloud, name, vp, seed, opts) => addDevice(browser, srv.base, cloud, name, { width: vp.w, height: vp.h }, vp.touch, seed, opts);
async function poll(fn, ms = 30000, every = 250) { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await sleep(every); } return false; }
/* a push that touches an unrelated note, then waits for the gate the S2 checks wait for */
const touch = (cloud, d, tag) => on(d, (t) => { const a = DB.articles.find((x) => x.id === 'a1'); a.content += '<p>' + t + '</p>'; a.updatedAt = new Date().toISOString(); persist(); flushPendingPush(); }, tag).then(() => sleep(300)).then(() => quiet(cloud, d));
async function ready(cloud, d) {
  await sleep(1500);
  await touch(cloud, d, 'first push');
  for (let i = 0; i < 80; i++) { if (await on(d, () => _s2RefsOk())) return true; await sleep(250); }
  return false;
}
const jebOf = (d) => on(d, () => JSON.parse(JSON.stringify({ p: DB.jebPockets, i: DB.jeb })));
const norm = (j) => JSON.stringify({ p: (j.p || []).slice().sort((a, b) => (a.id < b.id ? -1 : 1)), i: (j.i || []).slice().sort((a, b) => (a.id < b.id ? -1 : 1)) });
const withJeb = (seed, pockets, items) => { const db = seed; if (pockets) db.jebPockets = pockets; if (items) db.jeb = items; return db; };

try {
  /* ══ 59a — the default pockets, once ══ */
  if (want('59a')) {
    const cloud = makeCloud();
    const A = await dev(cloud, 'A', VPS[2], seedDB(T0));
    const j = await jebOf(A);
    const byId = Object.fromEntries(j.p.map((p) => [p.id, p]));
    const exp = { 'jp-task': ['Quick tasks', '✓', '#FFF1A8'], 'jp-idea': ['Ideas', '✶', '#FFD9B8'], 'jp-link': ['Links to read', '↗', '#CFE8FF'], 'jp-shop': ['Shopping', '◫', '#F6D2E4'] };
    const shape = Object.entries(exp).every(([id, [n, i, c]]) => byId[id] && byId[id].name === n && byId[id].icon === i && byId[id].color === c && byId[id].createdAt === '1970-01-01T00:00:00.000Z' && byId[id].updatedAt === '1970-01-01T00:00:00.000Z');
    check(j.p.length === 4 && shape && Array.isArray(j.i) && j.i.length === 0, '59a a fresh notebook has the four default pockets (fixed ids, name, icon, colour, 1970 stamp) and no items', JSON.stringify(j.p.map((p) => p.id)));
    const api = await on(A, () => ({ ps: jebPockets().map((p) => p.id), its: jebItems('jp-task').length }));
    check(api.ps.join() === 'jp-task,jp-idea,jp-link,jp-shop' && api.its === 0, '59a jebPockets() returns them in order; jebItems() of an empty pocket is []', JSON.stringify(api));
    await on(A, () => { persist(); });
    await sleep(600);
    await A.page.reload({ waitUntil: 'domcontentloaded' });
    await A.page.waitForFunction(() => window.__appBooted === true);
    const j2 = await jebOf(A);
    check(j2.p.length === 4 && SEED_IDS.every((id) => j2.p.some((p) => p.id === id)), '59a after a reload there are still exactly 4 (seeded once)', JSON.stringify(j2.p.map((p) => p.id)));
    check(A.errors.length === 0, '59a no page errors', A.errors.slice(0, 2).join(' · '));
    await A.ctx.close();

    /* two devices seeding at once, merged through the real cloud */
    const cloud2 = makeCloud();
    const [X, Y] = await Promise.all([dev(cloud2, 'X', VPS[2], seedDB(T0)), dev(cloud2, 'Y', VPS[0], seedDB(T0))]);
    await ready(cloud2, X);
    await on(Y, () => { const a = DB.articles.find((x) => x.id === 'a2'); a.content += '<p>from Y</p>'; a.updatedAt = new Date().toISOString(); persist(); flushPendingPush(); });
    await sleep(600); await quiet(cloud2, Y); await quiet(cloud2, X);
    const [jx, jy] = [await jebOf(X), await jebOf(Y)];
    check(jx.p.length === 4 && jy.p.length === 4 && norm(jx) === norm(jy), '59a two devices that seeded at the same time and then synced have 4 pockets each, the same four', JSON.stringify({ x: jx.p.map((p) => p.id), y: jy.p.map((p) => p.id) }));
    const mem = await on(X, () => { const a = JSON.parse(JSON.stringify(DB)), b = JSON.parse(JSON.stringify(DB)); const m = mergeDB(a, b); return m.jebPockets.length; });
    check(mem === 4, '59a mergeDB of two identical seeds is 4 pockets, not 8', String(mem));
    check(X.errors.length === 0 && Y.errors.length === 0, '59a no page errors on either device', [...X.errors, ...Y.errors].slice(0, 2).join(' · '));
    await X.ctx.close(); await Y.ctx.close();

    /* an array the owner emptied is never seeded again */
    const E = await dev(makeCloud(), 'E', VPS[2], withJeb(seedDB(T0), [], []));
    const je = await jebOf(E);
    check(Array.isArray(je.p) && je.p.length === 0, '59a an emptied jebPockets (key present, []) is not re-seeded', JSON.stringify(je.p));
    await E.ctx.close();
  }

  /* ══ 59b — sync-audit, every Jeb operation, both directions ══ */
  if (want('59b')) {
    const out = spawnSync(process.execPath, [join(ROOT, 'tools/sync-audit.mjs'), '--only', 'J'], { encoding: 'utf8', timeout: 900000, maxBuffer: 1 << 26 });
    const txt = (out.stdout || '') + (out.stderr || '');
    const rows = txt.split('\n').filter((l) => /^(PASS|FAIL|ERROR|NOTRUN|KNOWN|BY-DESIGN)\s/.test(l));
    for (const l of rows) check(/^PASS\s/.test(l), '59b ' + l.replace(/^(\S+)\s+d1:\S+\s+d2:\S+\s+st:\S+\s+/, '$1 · '), /^PASS/.test(l) ? '' : txt.slice(txt.indexOf(l), txt.indexOf(l) + 600));
    check(rows.length >= 22, '59b all 22 Jeb sync-audit operations ran', 'ran ' + rows.length);
    check(out.status === 0, '59b sync-audit exits cleanly', 'exit ' + out.status + ' ' + txt.slice(-300));
  }

  /* ══ 59c — deletion sticks ══ */
  if (want('59c')) {
    const A = await dev(makeCloud(), 'A', VPS[2], seedDB(T0));
    const r = await on(A, () => {
      const cl = (o) => JSON.parse(JSON.stringify(o)), has = (db, id) => (db.jeb || []).some((i) => i.id === id);
      const keep = jebAddItem('jp-task', 'keep me'), gone = jebAddItem('jp-task', 'delete me');
      const B0 = cl(DB);
      jebDeleteItem(gone);
      const A1 = cl(DB);
      const MB = mergeDB(cl(B0), cl(A1)), MA = mergeDB(cl(A1), cl(B0));
      const out = { trashed: DB.trash.filter((t) => t.type === 'jebItem').length, tomb: (DB.tombstones || []).some((t) => t.id === gone),
        bNo: !has(MB, gone), aNo: !has(MA, gone), bKeep: has(MB, keep), aKeep: has(MA, keep), bTrash: MB.trash.some((t) => t.type === 'jebItem' && t.item.id === gone) };
      /* restore on A, then B (which has the deletion) receives it */
      const te = DB.trash.find((t) => t.type === 'jebItem' && t.item.id === gone);
      restoreItem(te.id);
      const A2 = cl(DB);
      const MB2 = mergeDB(cl(MB), cl(A2)), MA2 = mergeDB(cl(A2), cl(MB));
      out.restoredOnA = has(A2, gone); out.restoredOnB = has(MB2, gone); out.aKeeps = has(MA2, gone);
      out.trashGoneB = !MB2.trash.some((t) => t.type === 'jebItem' && t.item.id === gone);
      out.sameText = (MB2.jeb.find((i) => i.id === gone) || {}).text === 'delete me';
      /* a pocket's whole life: the first pocket gets it back when its own pocket is gone */
      const lone = jebAddItem('jp-shop', 'in shopping'); jebDeleteItem(lone);
      jebDeletePocket('jp-shop');
      const tl = DB.trash.find((t) => t.type === 'jebItem' && t.item.id === lone); restoreItem(tl.id);
      out.fallbackPocket = (DB.jeb.find((i) => i.id === lone) || {}).pocketId;
      const tp = DB.trash.find((t) => t.type === 'jebPocket'); restoreItem(tp.id);
      out.pocketBack = DB.jebPockets.some((p) => p.id === 'jp-shop') && !DB.jeb.some((i) => i.pocketId === 'jp-shop' && i.id !== lone);
      /* the Trash modal labels */
      openTrash(); const body = document.getElementById('trash-body').textContent; closeTrash();
      jebDeleteItem(keep); openTrash(); out.label = document.getElementById('trash-body').textContent; closeTrash();
      out.body = body.length;
      return out;
    });
    check(r.trashed === 1 && r.tomb, '59c delete: one Trash entry (type jebItem) and a tombstone for the item id', JSON.stringify({ trashed: r.trashed, tomb: r.tomb }));
    check(r.bNo && r.aNo && r.bKeep && r.aKeep, '59c B, holding the old copy, merges and does NOT resurrect the deleted item (both directions); the other item stays', JSON.stringify(r));
    check(r.restoredOnA && r.restoredOnB && r.aKeeps && r.trashGoneB && r.sameText, '59c restore from Trash on A brings the item back on both, and its Trash entry is gone', JSON.stringify(r));
    check(r.fallbackPocket === 'jp-task' || /^jp-/.test(r.fallbackPocket || ''), '59c an item whose pocket was deleted restores into the first pocket', JSON.stringify({ fallbackPocket: r.fallbackPocket }));
    check(r.pocketBack, '59c a deleted pocket restores as an empty pocket', JSON.stringify({ pocketBack: r.pocketBack }));
    check(/Jeb item: keep me/.test(r.label), '59c the Trash modal shows "Jeb item: <text>"', r.label.slice(0, 200));
    const refuse = await on(A, () => { const id = jebAddItem('jp-task', 'stays'); const n = DB.jebPockets.length, t = DB.trash.length; const ok = jebDeletePocket('jp-task'); return { ok, n: DB.jebPockets.length === n, t: DB.trash.length === t, toast: [...document.querySelectorAll('.toast')].map((x) => x.textContent).join('|') }; });
    check(refuse.ok === false && refuse.n && refuse.t && /holds items/.test(refuse.toast), '59c a pocket that holds items cannot be deleted (a toast says so; nothing changed)', JSON.stringify(refuse));
    check(A.errors.length === 0, '59c no page errors', A.errors.slice(0, 2).join(' · '));
    await A.ctx.close();
  }

  /* ══ 59d — jebToNote ══ */
  if (want('59d')) {
    const A = await dev(makeCloud(), 'A', VPS[2], seedDB(T0));
    const r = await on(A, () => {
      const cl = (o) => JSON.parse(JSON.stringify(o));
      const id = jebAddItem('jp-idea', 'x');
      jebEditItem(id, { text: 'Title line\nsecond <b>x</b>\n\nthird & more', folderIds: ['f1'], tags: ['t1'], kind: 'general', journal: true });
      const item = cl(DB.jeb.find((i) => i.id === id));
      const B0 = cl(DB);
      let persists = 0; const op = window.persist; window.persist = function () { persists++; return op.apply(this, arguments); };
      const nid = jebToNote(id);
      window.persist = op;
      const n = DB.articles.find((a) => a.id === nid);
      const out = { nid: !!nid, persists, title: n && n.title, content: n && n.content, tags: n && n.tags, folderIds: n && n.folderIds, kind: n && n.kind,
        fromJeb: n && n.fromJeb, createdAt: n && n.createdAt, itemCreated: item.createdAt, updated: n && n.updatedAt,
        itemGone: !DB.jeb.some((i) => i.id === id), tomb: (DB.tombstones || []).some((t) => t.id === id), trashEntry: DB.trash.some((t) => t.item && t.item.id === id),
        globalJournal: (DB.globalTags || []).includes('journal') };
      const A1 = cl(DB);
      const MB = mergeDB(cl(B0), cl(A1)), MA = mergeDB(cl(A1), cl(B0));
      out.bGone = !MB.jeb.some((i) => i.id === id); out.aGone = !MA.jeb.some((i) => i.id === id);
      out.bNote = MB.articles.some((a) => a.id === nid); out.aNote = MA.articles.some((a) => a.id === nid);
      out.bTrash = MB.trash.some((t) => t.item && t.item.id === id);
      /* a long first line, and no journal flag */
      const lid = jebAddItem('jp-idea', 'L'.repeat(200) + '\nbody'); const ln = DB.articles.find((a) => a.id === jebToNote(lid));
      out.longTitle = ln.title.length; out.plain = !ln.tags.includes('journal') && !('kind' in ln) && ln.folderIds.length === 0;
      /* the note cannot be built: the item must stay, and no note appears */
      const bid = jebAddItem('jp-idea', 'will fail\nsecond line'); const nBefore = DB.articles.length, oe = window.esc;
      window.esc = () => { throw new Error('boom'); };
      let nid2; try { nid2 = jebToNote(bid); } finally { window.esc = oe; }
      out.failNull = nid2 === null; out.failKept = DB.jeb.some((i) => i.id === bid); out.failNoNote = DB.articles.length === nBefore; out.failNoTomb = !(DB.tombstones || []).some((t) => t.id === bid);
      out.missing = jebToNote('no-such-id') === null;
      return out;
    });
    check(r.nid && r.title === 'Title line' && r.content === '<p>second &lt;b&gt;x&lt;/b&gt;</p><p>third &amp; more</p>', '59d the note has the first line as title and the other lines as escaped <p> paragraphs', JSON.stringify({ title: r.title, content: r.content }));
    check(r.tags && r.tags.includes('t1') && r.tags.includes('journal') && r.globalJournal && r.folderIds.join() === 'f1' && r.kind === 'general', '59d tags, folders and Note Type come from the item; the Journal flag adds the "journal" tag (and the global tag)', JSON.stringify({ tags: r.tags, f: r.folderIds, k: r.kind }));
    check(r.fromJeb && r.fromJeb.pocket === 'Ideas' && !Number.isNaN(Date.parse(r.fromJeb.at)) && r.createdAt === r.itemCreated && !Number.isNaN(Date.parse(r.updated)) && r.updated > r.createdAt, '59d fromJeb {pocket, at}; the note createdAt is the item\'s; updatedAt is now', JSON.stringify({ fromJeb: r.fromJeb, createdAt: r.createdAt, itemCreated: r.itemCreated, updated: r.updated }));
    check(r.persists === 1, '59d the note is created and the item removed in ONE persist()', String(r.persists));
    check(r.itemGone && r.tomb && !r.trashEntry, '59d the item is removed with a tombstone and NO Trash entry', JSON.stringify({ gone: r.itemGone, tomb: r.tomb, trash: r.trashEntry }));
    check(r.bGone && r.aGone && r.bNote && r.aNote && !r.bTrash, '59d after a merge the item is gone on both devices and the note is on both', JSON.stringify({ bGone: r.bGone, aGone: r.aGone, bNote: r.bNote, aNote: r.aNote }));
    check(r.longTitle === 120 && r.plain, '59d a first line over 120 characters is cut to 120; no journal flag means no journal tag', JSON.stringify({ longTitle: r.longTitle, plain: r.plain }));
    check(r.failNull && r.failKept && r.failNoNote && r.failNoTomb && r.missing, '59d if the note cannot be built the item stays (no note, no tombstone); an unknown id returns null', JSON.stringify(r));
    check(A.errors.length === 0, '59d no page errors', A.errors.slice(0, 2).join(' · '));
    await A.ctx.close();
  }

  /* ══ 59e — three devices, one cloud, the head path ══ */
  if (want('59e')) {
    const cloud = makeCloud();
    const seed = () => seedDB(T0);
    const D = [await dev(cloud, 'A', VPS[2], seed()), await dev(cloud, 'B', VPS[1], seed()), await dev(cloud, 'C', VPS[0], seed())];
    const rd = await Promise.all(D.map((d) => ready(cloud, d)));
    const N = 5;
    await Promise.all(D.map((d, k) => on(d, ({ k, N }) => { for (let i = 0; i < N; i++) jebAddItem('jp-idea', 'dev' + k + '-item' + i); persist(); flushPendingPush(); }, { k, N })));
    const want15 = (d) => on(d, () => DB.jeb.filter((i) => i.pocketId === 'jp-idea').length);
    const conv = await poll(async () => (await Promise.all(D.map(want15))).every((n) => n === 3 * N), 60000, 500);
    for (const d of D) await quiet(cloud, d);
    const js = await Promise.all(D.map(jebOf));
    const texts = js.map((j) => j.i.map((i) => i.text).sort().join('|'));
    const expectTexts = [0, 1, 2].flatMap((k) => Array.from({ length: N }, (_, i) => 'dev' + k + '-item' + i)).sort().join('|');
    check(rd.every(Boolean) && conv && texts.every((t) => t === expectTexts) && js.every((j) => j.p.length === 4), `59e three devices each added ${N} items to one pocket at once: all three hold all ${3 * N}, nothing twice, 4 pockets`, JSON.stringify({ rd, counts: js.map((j) => j.i.length), same: texts.every((t) => t === texts[0]) }));
    const keys = [...cloud.store.keys()].filter((p) => p.startsWith(NB + '/recs/'));
    const jebRecs = keys.filter((p) => /\/recs\/jeb(Pockets)?~/.test(p));
    const { db: head, missingParts } = assembleRecs(cloud.store, NB);
    check(jebRecs.length === 0, '59e no jeb~ / jebPockets~ rec exists in the cloud (not in _S1_COLLS this round: the arrays ride in the head)', JSON.stringify(jebRecs.slice(0, 3)));
    check(head && missingParts === 0 && Array.isArray(head.jeb) && head.jeb.length === 3 * N && Array.isArray(head.jebPockets) && head.jebPockets.length === 4, '59e the assembled head _head~0 carries all the items and pockets', JSON.stringify({ jeb: head && head.jeb && head.jeb.length, pockets: head && head.jebPockets && head.jebPockets.length, missingParts }));
    /* an edit on one device and a delete on another reach the third, per record */
    const victim = js[0].i.find((i) => i.text === 'dev1-item0').id, edited = js[0].i.find((i) => i.text === 'dev2-item0').id;
    await on(D[0], (v) => { jebDeleteItem(v); persist(); flushPendingPush(); }, victim);
    await on(D[1], (e) => { jebEditItem(e, { text: 'edited on B' }); persist(); flushPendingPush(); }, edited);
    const ok2 = await poll(async () => (await Promise.all(D.map((d) => on(d, ([v, e]) => !DB.jeb.some((i) => i.id === v) && (DB.jeb.find((i) => i.id === e) || {}).text === 'edited on B', [victim, edited])))).every(Boolean), 60000, 500);
    check(ok2, '59e a delete on A and an edit on B (different items) both reach all three devices (merged per record from the head)', '');
    check(D.every((d) => d.errors.length === 0), '59e no page errors', D.flatMap((d) => d.errors).slice(0, 2).join(' · '));
    for (const d of D) await d.ctx.close();
  }

  /* ══ 59f — the real v04.97 build in the same cloud ══ */
  if (want('59f')) {
    let oldSrv = null, why = '';
    try {
      const dir = mkdtempSync(join(tmpdir(), 'siyagah-old97-'));
      for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', OLD97 + ':' + f], { cwd: ROOT, maxBuffer: 1 << 28 })); } catch (e) { if (f === 'index.html') throw e; } }
      oldSrv = await serve(dir);
    } catch (e) { why = String(e.message || e).slice(0, 200); }
    if (!oldSrv) check(false, `59f the v04.97 build could not be read from git (commit ${OLD97})`, why);
    else {
      const cloud = makeCloud();
      const A = await dev(cloud, 'A', VPS[2], seedDB(T0));
      const B = await dev(cloud, 'B', VPS[1], seedDB(T0));
      const rA = await ready(cloud, A); await ready(cloud, B);
      await on(A, () => { jebAddItem('jp-task', 'first'); jebAddItem('jp-idea', 'second\nline'); const p = jebAddPocket('Calls', '☎', '#cccccc'); jebAddItem(p, 'ring Sam'); jebEditItem(jebItems('jp-task')[0].id, { tags: ['t'], folderIds: ['f1'], kind: 'general', journal: true }); persist(); flushPendingPush(); });
      await sleep(500); await quiet(cloud, A);
      const want7 = () => on(B, () => DB.jeb.length === 3 && DB.jebPockets.length === 5);
      const synced = await poll(want7, 40000);
      const before = norm(await jebOf(A));
      const mark = cloud.log.length;
      const O = await addDevice(browser, oldSrv.base, cloud, 'old97', { width: 1440, height: 900 }, false, seedDB(T0));
      const ver = await on(O, () => document.querySelector('meta[name=app-version]').content);
      const gotOld = await poll(() => on(O, () => (DB.jeb || []).length === 3), 40000);
      await sleep(1500);
      await on(O, () => { const a = DB.articles.find((x) => x.id === 'a2'); a.content += '<p>edited on the old build</p>'; a.updatedAt = new Date().toISOString(); persist(); flushPendingPush(); });
      await sleep(500); await quiet(cloud, O);
      const reached = await poll(() => on(A, () => /edited on the old build/.test((DB.articles.find((x) => x.id === 'a2') || {}).content || '')), 40000);
      await sleep(1500);
      const after = [norm(await jebOf(A)), norm(await jebOf(B))];
      const w = cloud.log.slice(mark).filter((o) => o.t === 'set' && o.dev === 'old97');
      const recW = w.filter((o) => o.p.startsWith(NB + '/recs/')).map((o) => o.p.slice((NB + '/recs/').length) + (o.gone ? ' GONE' : ''));
      const jebW = recW.filter((p) => /^jeb(Pockets)?~/.test(p));
      console.log('P59f ' + JSON.stringify({ oldVersion: ver, oldReceivedJebInDB: gotOld, oldWritesRecs: recW.length, oldRecKeys: recW.slice(0, 12), oldWritesToJebRecs: jebW.length, oldWroteHead: recW.includes('_head~0'), oldWroteBlob: w.some((o) => !o.p.includes('/recs') && !o.p.includes('/recparts')) }));
      check(rA && synced && ver === '04.97' && gotOld, '59f the real v04.97 build joins the cloud and receives the Jeb arrays (it keeps them as an unknown key)', JSON.stringify({ ver, synced, gotOld }));
      check(reached, '59f the old build\'s edit of an unrelated note reaches the v04.98 device', '');
      check(after[0] === before && after[1] === before, '59f after the old build pushed, both v04.98 devices still hold every Jeb pocket and item, unchanged (I1)', JSON.stringify({ a: after[0] === before, b: after[1] === before }));
      check(jebW.length === 0 && !recW.some((p) => /^jeb/.test(p)), '59f the old build wrote nothing to a jeb~ rec and marked none gone (reported above: P59f)', JSON.stringify(jebW));
      /* now A keeps working: its later Jeb edits must survive the old build's stale copy */
      await on(A, () => { const it = jebItems('jp-task')[0]; jebEditItem(it.id, { text: 'edited on A after the old build joined' }); persist(); flushPendingPush(); });
      await sleep(500); await quiet(cloud, A);
      await on(O, () => { const a = DB.articles.find((x) => x.id === 'a2'); a.content += '<p>and again</p>'; a.updatedAt = new Date().toISOString(); persist(); flushPendingPush(); });
      await sleep(500); await quiet(cloud, O);
      await sleep(2500);
      const fin = await Promise.all([A, B].map((d) => on(d, () => DB.jeb.map((i) => i.text).sort().join('|'))));
      check(fin[0] === fin[1] && /edited on A after the old build joined/.test(fin[0]),'59f A\'s later Jeb edit is not undone by the old build\'s stale copy (A and B agree)', JSON.stringify(fin));
      check(A.errors.length === 0 && B.errors.length === 0 && O.errors.length === 0, '59f no page errors on A, B or the old build', [...A.errors, ...B.errors, ...O.errors].slice(0, 2).join(' · '));
      await A.ctx.close(); await B.ctx.close(); await O.ctx.close(); await oldSrv.close();
    }
  }

  /* ══ 59g — Save File, backup HTML, JSON import ══ */
  if (want('59g')) {
    const A = await dev(makeCloud(), 'A', VPS[2], seedDB(T0));
    const sig = await on(A, () => {
      jebAddItem('jp-task', 'one'); jebAddItem('jp-idea', 'two\nlines'); jebAddPocket('Calls', '☎', '#cccccc');
      const keep = jebAddItem('jp-link', 'to delete'); jebDeleteItem(keep);
      persist();
      return JSON.stringify({ p: DB.jebPockets, i: DB.jeb });
    });
    /* Save File: the file's <script id="nd">, then the file opened somewhere with nothing stored */
    const html = await on(A, () => getExportHTML());
    const ndText = /<script id="nd" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
    const ndDb = ndText ? JSON.parse(ndText[1]) : null;
    check(ndDb && JSON.stringify({ p: ndDb.jebPockets, i: ndDb.jeb }) === sig, '59g Save File: the baked <script id="nd"> holds every Jeb pocket and item, identical', ndDb ? (ndDb.jeb || []).length + ' items' : 'no nd');
    const dir = mkdtempSync(join(tmpdir(), 'siyagah-59g-'));
    writeFileSync(join(dir, 'index.html'), html);
    const s2 = await serve(dir);
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pg = await ctx.newPage(); const perrs = [];
    pg.on('pageerror', (e) => perrs.push(String(e)));
    for (const p of ['**googleapis.com/**', '**gstatic.com/**', '**firebaseapp.com/**', '**firebaseio.com/**']) await ctx.route(p, (r) => r.abort());
    await pg.goto(s2.base + '/', { waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree'));
    const reopened = await pg.evaluate(() => JSON.stringify({ p: DB.jebPockets, i: DB.jeb }));
    check(reopened === sig, '59g the saved file, opened on a device with nothing stored, shows every Jeb record', JSON.stringify({ same: reopened === sig }));
    check(perrs.length === 0, '59g the reopened saved file has no page errors', perrs.slice(0, 2).join(' · '));
    await ctx.close(); await s2.close();

    /* backup HTML */
    const bk = await on(A, async () => { const { html } = await generateBackupHTMLContent(); const m = /<script id="siyagah-backup-data" type="application\/json">([\s\S]*?)<\/script>/.exec(html); return m ? m[1] : null; });
    const bj = bk ? JSON.parse(bk) : null;
    check(bj && JSON.stringify({ p: bj.jebPockets, i: bj.jeb }) === sig, '59g backup HTML: the embedded data holds every Jeb pocket and item', bj ? (bj.jeb || []).length + ' items' : 'no data');
    /* import */
    const imp = await on(A, (bjs) => {
      const cl = (o) => JSON.parse(JSON.stringify(o)), data = JSON.parse(bjs), out = {};
      _showImportConsent(cl(data), 'x.json'); out.dialog = document.querySelector('.mm') ? document.querySelector('.mm').textContent : ''; closeModal(); _pendingImport = null;
      /* replace: another notebook's Jeb replaces this one's; a file with no Jeb keys leaves it alone */
      const mine = cl({ p: DB.jebPockets, i: DB.jeb });
      const other = cl(data); other.jeb = [{ id: 'imp1', pocketId: 'jp-task', text: 'imported', done: false, folderIds: [], tags: [], kind: null, journal: false, order: 0, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }];
      _replaceWithBackup(cl(other));
      out.replaceHasImported = DB.jeb.length === 1 && DB.jeb[0].id === 'imp1' && DB.jebPockets.length === other.jebPockets.length;
      const noJeb = cl(data); delete noJeb.jeb; delete noJeb.jebPockets;
      _replaceWithBackup(noJeb);
      out.replaceOldFileKeeps = DB.jeb.length === 1 && DB.jebPockets.length === other.jebPockets.length;
      _replaceWithBackup(cl(data));
      out.replaceBack = JSON.stringify({ p: DB.jebPockets, i: DB.jeb }) === JSON.stringify(mine);
      /* merge: this notebook has an item the file lacks and the file has one this notebook lacks; a deleted item stays deleted */
      const localOnly = jebAddItem('jp-task', 'local only');
      const fileOnly = { id: 'imp2', pocketId: 'jp-idea', text: 'file only', done: false, folderIds: [], tags: [], kind: null, journal: false, order: 5, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };
      const deleted = cl(DB.trash.find((t) => t.type === 'jebItem') || {}).item;
      const file = cl(data); file.jeb = (file.jeb || []).concat([fileOnly]); if (deleted) { deleted.updatedAt = '2026-01-01T00:00:00.000Z'; file.jeb.push(deleted); }
      _mergeBackup(file);
      out.mergeKeepsLocal = DB.jeb.some((i) => i.id === localOnly);
      out.mergeAddsFile = DB.jeb.some((i) => i.id === 'imp2');
      out.mergeNoResurrect = deleted ? !DB.jeb.some((i) => i.id === deleted.id) : null;
      out.mergeKeepsAll = (data.jeb || []).every((i) => DB.jeb.some((x) => x.id === i.id));
      return out;
    }, bk);
    check(/Jeb items: 3/.test(imp.dialog), '59g the import dialog shows "Jeb items: N"', imp.dialog.replace(/\s+/g, ' ').slice(0, 220));
    check(imp.replaceHasImported && imp.replaceOldFileKeeps && imp.replaceBack, '59g JSON import "replace": the file\'s Jeb replaces ours; a file from before Jeb leaves ours alone; the original comes back whole', JSON.stringify(imp));
    check(imp.mergeKeepsLocal && imp.mergeAddsFile && imp.mergeKeepsAll && imp.mergeNoResurrect !== false, '59g JSON import "merge": keeps ours, adds the file\'s, never resurrects a deleted item (merged through mergeDB, not "local wins")', JSON.stringify(imp));
    check(A.errors.length === 0, '59g no page errors', A.errors.slice(0, 2).join(' · '));
    await A.ctx.close();
  }

  /* ══ 59h — size ══ */
  if (want('59h')) {
    const cloud = makeCloud();
    const A = await dev(cloud, 'A', VPS[0], seedDB(T0), { throttle: 4 });
    await ready(cloud, A);
    const m = await on(A, () => {
      const cl = (o) => JSON.parse(JSON.stringify(o));
      for (let k = 4; k < 8; k++) DB.jebPockets.push({ id: 'jp-x' + k, name: 'Pocket ' + k, icon: '✶', color: '#FFF1A8', order: k, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z' });
      const ps = DB.jebPockets.map((p) => p.id);
      for (let i = 0; i < 2000; i++) DB.jeb.push({ id: 'ji-' + i, pocketId: ps[i % 8], text: 'Item number ' + i + ' — call someone about the thing and then write it down (' + 'x'.repeat(40) + ')', done: i % 7 === 0, folderIds: i % 5 === 0 ? ['f1'] : [], tags: i % 3 === 0 ? ['seed'] : [], kind: null, journal: false, order: Math.floor(i / 8), createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z' });
      const t0 = performance.now(); persist(); const persistMs = performance.now() - t0;
      const t1 = performance.now(); persist(); const persist2Ms = performance.now() - t1;
      const a = cl(DB), b = cl(DB); b.jeb.forEach((x, i) => { if (i % 10 === 0) x.updatedAt = '2026-10-02T00:00:00.000Z'; });
      const t2 = performance.now(); const mm = mergeDB(a, b); const mergeMs = performance.now() - t2;
      const t3 = performance.now(); jebAddItem('jp-task', 'one more'); const addMs = performance.now() - t3;
      return { persistMs: Math.round(persistMs), persist2Ms: Math.round(persist2Ms), mergeMs: Math.round(mergeMs), addAndPersistMs: Math.round(addMs), items: mm.jeb.length, headBytes: JSON.stringify((() => { const h = {}; Object.keys(DB).forEach((k) => { if (_S1_COLLS.indexOf(k) < 0) h[k] = DB[k]; }); return h; })()).length };
    });
    await on(A, () => { flushPendingPush(); });
    await sleep(1000); await quiet(cloud, A, 60000);
    const hr = cloud.store.get(NB + '/recs/_head~0');
    const split = !!(hr && hr.g);
    const { db: head, missingParts } = assembleRecs(cloud.store, NB);
    const cloudHeadBytes = hr ? (hr.j != null ? Buffer.byteLength(hr.j) : hr.n) : 0;
    console.log('P59h ' + JSON.stringify({ ...m, headBytesLocalJson: m.headBytes, cloudHead: split ? { split: true, pieces: hr.n } : { split: false, bytes: cloudHeadBytes }, cloudHeadHoldsItems: head && head.jeb && head.jeb.length, missingParts }));
    check(m.items === 2000 + 0 && head && head.jeb && head.jeb.length >= 2000 && missingParts === 0, '59h 2,000 items in 8 pockets reach the cloud head intact (head ' + (split ? 'SPLIT into ' + hr.n + ' recparts' : 'NOT split, ' + Math.round(cloudHeadBytes / 1024) + ' KB') + ')', JSON.stringify({ items: m.items, inCloud: head && head.jeb && head.jeb.length, split, headKB: Math.round(m.headBytes / 1024) }));
    check(m.headBytes < 700000, '59h the head stays under the 700,000-byte split threshold with 2,000 items (' + Math.round(m.headBytes / 1024) + ' KB)', String(m.headBytes));
    check(m.mergeMs < 1500 && m.persistMs < 3000, `59h phone x4: a full mergeDB of 2,000 items ${m.mergeMs} ms, persist() ${m.persistMs} ms (second: ${m.persist2Ms} ms), one jebAddItem ${m.addAndPersistMs} ms`, JSON.stringify(m));
    check(A.errors.length === 0, '59h no page errors', A.errors.slice(0, 2).join(' · '));
    await A.ctx.close();
  }
} catch (e) {
  console.log(' FAIL  jeb-j1 threw: ' + (e && e.stack || e));
  results.push({ ok: false, label: 'threw' });
} finally {
  await browser.close();
  await srv.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
