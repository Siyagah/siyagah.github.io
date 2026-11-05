#!/usr/bin/env node
/* tools/mmj-write.mjs — v05.68, J27 ① R2: other apps change the real Mapping My Journey folders and notes (requests that Siyagah applies), and the owner's
   new D6 in Siyagah itself (block 128, checks 128a–128h).

   `node tools/mmj-write.mjs [--only=128a,128c] [--unpatched]`   Each printed ok/FAIL line is one app-check check. Runs on the fake Firestore of s1-fake.mjs.
   `--unpatched` serves origin/main's index.html (no request box, the old refusal), where the D6 and request checks FAIL.

   128a  every op applied (folder add/rename/move/vis/delete, note add/edit/move/vis/delete); the outcome is written back; the diagnostics line
   128b  every refusal: non-MMJ target / parent, a move into its own subtree, a stale base (with cur), an unknown op, an unknown field, bad content, an open note; DB byte-identical
   128c  content: <script>, onerror, javascript:, data: and srcdoc never reach a.content
   128d  two Siyagah devices apply the same queue: each request is applied exactly once
   128e  an applied request merged both ways with a stale device, and the shared copy follows
   128f  D6 in Siyagah: the right-click / long-press confirmation (3 sizes), the Trash group, the kept note, tombstones, stale merges, Undo, Restore
   128g  the gate (nothing before the first read), hidden page, the pace line
   128h  200 queued requests at 390 ×4: no long task over the host-scaled 200 ms */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { playwright, serve, seedDB, hostLimit } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, check, probeInstall, probeRead, NB } from './s1-fake.mjs';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);
const UNPATCHED = argv.includes('--unpatched');
const T0 = '2026-10-01T00:00:00.000Z';
const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];

function makeBase() {
  const dir = mkdtempSync(join(tmpdir(), 'mmj-write-base-'));
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', `origin/main:${f}`], { encoding: 'buffer', maxBuffer: 1 << 28 })); } catch {} }
  return dir;
}
const pw = await playwright();
const srv = await serve(UNPATCHED ? makeBase() : undefined);
const browser = await pw.chromium.launch({ args: ['--js-flags=--max-old-space-size=8192'] });

function mmjSeed() {
  const db = seedDB(T0);
  db.sections.push({ id: 'mmj-sec', name: 'Mapping My Journey', order: 1, updatedAt: T0, mmj: { site: 'https://x.invalid' } });
  db.folders.push(
    { id: 'mmj-c-1', name: 'Journeys', parentId: null, order: 1, sectionId: 'mmj-sec', updatedAt: T0, mmj: { n: 'Journeys' } },
    { id: 'mmj-c-2', name: 'Stops', parentId: 'mmj-c-1', order: 1, updatedAt: T0, mmj: { n: 'Stops' } },
    { id: 'own-1', name: 'My own below MMJ', parentId: 'mmj-c-2', order: 1, updatedAt: T0 },
    { id: 'mmj-pages', name: 'Pages', parentId: null, order: 2, sectionId: 'mmj-sec', updatedAt: T0, mmj: { pages: true } });
  const mk = (id, title, folderIds) => ({ id, title, content: '<h1>' + title + '</h1><p>Body of ' + title + '</p>', folderIds, tags: ['t-' + id], createdAt: T0, updatedAt: T0, kind: 'general' });
  db.articles.push(mk('m1', 'MMJ one', ['mmj-c-2']), mk('m2', 'MMJ two', ['own-1']), mk('m3', 'MMJ page', ['mmj-pages']), mk('m4', 'MMJ and mine', ['mmj-c-2', 'f1']));
  return db;
}
const dev = (cloud, name, vp, db, opts) => addDevice(browser, srv.base, cloud, name, { width: vp.w, height: vp.h }, vp.touch, db, opts);
async function ready(d, ms = 40000) { const t = Date.now(); while (Date.now() - t < ms) { if (await on(d, () => !!_s1RdCaught && _s1WriteGate()).catch(() => false)) return true; await sleep(200); } return false; }
const clone = (x) => JSON.parse(JSON.stringify(x));
let SEQ = 0;
/* another app creates a request: one set on notebooks/{nb}/mmjin/{reqId}, st:'new', at = the server's time */
function req(cloud, body, id) {
  const reqId = id || ('r' + (++SEQ) + '-' + Math.random().toString(36).slice(2, 6));
  cloud.apply([{ t: 'set', p: `${NB}/mmjin/${reqId}`, d: { v: 1, from: 'bwn', st: 'new', at: { __sts: 1 }, ...body } }], null);
  return reqId;
}
const doc = (cloud, reqId) => cloud.store.get(`${NB}/mmjin/${reqId}`);
async function outcome(cloud, reqId, ms = 30000) { const t = Date.now(); while (Date.now() - t < ms) { const d = doc(cloud, reqId); if (d && (d.st === 'done' || d.st === 'refused')) return d; await sleep(120); } return doc(cloud, reqId) || null; }
const send = async (cloud, body) => outcome(cloud, req(cloud, body));
const snapDB = (d) => on(d, () => JSON.stringify(DB));
const get = (d, fn, arg) => on(d, fn, arg);
const run = (d) => on(d, async () => { const w = () => new Promise((r) => setTimeout(r, 40)); while (_msS.busy) await w(); await _msTick(true); while (_msS.busy) await w(); });

try {
  /* ══ 128a — every op applied ══ */
  if (want('128a')) {
    const cloud = makeCloud();
    const D = await dev(cloud, 'D', VPS[2], mmjSeed());
    check(await ready(D), '128a the device has read the cloud');
    const o1 = await send(cloud, { op: 'folder.add', id: 'x-bwn-f1', name: '  Added   folder ', parent: 'mmj-c-1' });
    const f1 = await get(D, () => DB.folders.find((f) => f.id === 'x-bwn-f1'));
    check(o1 && o1.st === 'done' && o1.res && o1.res.id === 'x-bwn-f1' && !!o1.doneAt && f1 && f1.name === 'Added folder' && f1.parentId === 'mmj-c-1' && !!f1.updatedAt, '128a folder.add under an MMJ folder: done, res.id, doneAt, the name trimmed, stamped', JSON.stringify({ o1, f1 }));
    const o2 = await send(cloud, { op: 'folder.add', id: 'x-bwn-f2', name: 'Top one', parent: null });
    const f2 = await get(D, () => DB.folders.find((f) => f.id === 'x-bwn-f2'));
    check(o2.st === 'done' && f2.parentId === null && f2.sectionId === 'mmj-sec' && f2.order >= 3, '128a folder.add with parent null lands at the top of the MMJ section', JSON.stringify(f2));
    const oAgain = await send(cloud, { op: 'folder.add', id: 'x-bwn-f1', name: 'Added folder', parent: 'mmj-c-1' });
    const cnt = await get(D, () => DB.folders.filter((f) => f.id === 'x-bwn-f1').length);
    check(oAgain.st === 'done' && cnt === 1, '128a an add whose id already exists and matches is "done" and adds nothing (idempotent)', JSON.stringify({ oAgain, cnt }));
    const oClash = await send(cloud, { op: 'folder.add', id: 'x-bwn-f1', name: 'Another name', parent: 'mmj-c-1' });
    check(oClash.st === 'refused' && /id already used/.test(oClash.why), '128a an add whose id exists with other details is refused', JSON.stringify(oClash));
    const o3 = await send(cloud, { op: 'folder.rename', id: 'x-bwn-f1', name: 'Renamed' });
    check(o3.st === 'done' && (await get(D, () => DB.folders.find((f) => f.id === 'x-bwn-f1').name)) === 'Renamed', '128a folder.rename', JSON.stringify(o3));
    const o4 = await send(cloud, { op: 'folder.move', id: 'x-bwn-f1', parent: 'mmj-pages' });
    check(o4.st === 'done' && (await get(D, () => DB.folders.find((f) => f.id === 'x-bwn-f1').parentId)) === 'mmj-pages', '128a folder.move into another MMJ folder', JSON.stringify(o4));
    const o4b = await send(cloud, { op: 'folder.move', id: 'x-bwn-f1', parent: null });
    const mv = await get(D, () => { const f = DB.folders.find((x) => x.id === 'x-bwn-f1'); return { p: f.parentId, s: f.sectionId }; });
    check(o4b.st === 'done' && mv.p === null && mv.s === 'mmj-sec', '128a folder.move to the top of the MMJ section', JSON.stringify(mv));
    /* Architect's review: up/down. `before` places it in front of a sibling; only the moved folder is stamped */
    const ord0 = await get(D, () => DB.folders.filter((f) => !f.parentId && f.sectionId === 'mmj-sec').sort((a, b) => (+a.order || 0) - (+b.order || 0)).map((f) => [f.id, f.updatedAt]));
    const firstId = ord0[0][0];
    const ob = await send(cloud, { op: 'folder.move', id: 'x-bwn-f1', parent: null, before: firstId });
    const ord1 = await get(D, () => DB.folders.filter((f) => !f.parentId && f.sectionId === 'mmj-sec').sort((a, b) => (+a.order || 0) - (+b.order || 0)).map((f) => [f.id, f.updatedAt]));
    const others = ord1.filter((x) => x[0] !== 'x-bwn-f1'), stampedOthers = others.filter((x) => { const o = ord0.find((y) => y[0] === x[0]); return o && o[1] !== x[1]; });
    check(ob.st === 'done' && ord1[0][0] === 'x-bwn-f1' && stampedOthers.length === 0, '128a folder.move with before: moved up in front of the first folder, and no other folder stamped', JSON.stringify({ ob, first: ord1[0], stampedOthers }));
    const obad = await send(cloud, { op: 'folder.move', id: 'x-bwn-f1', parent: null, before: 'x-bwn-f1' });
    check(obad.st === 'refused' && /before must be a folder beside it/.test(obad.why || ''), '128a folder.move with a bad before is refused', JSON.stringify(obad));
    const o5 = await send(cloud, { op: 'folder.vis', id: 'x-bwn-f1', vis: 1 });
    const v1 = await get(D, () => DB.folders.find((f) => f.id === 'x-bwn-f1').vis);
    const o5b = await send(cloud, { op: 'folder.vis', id: 'x-bwn-f1', vis: 0 });
    const v0 = await get(D, () => 'vis' in DB.folders.find((f) => f.id === 'x-bwn-f1'));
    check(o5.st === 'done' && v1 === 1 && o5b.st === 'done' && v0 === false, '128a folder.vis 1 sets vis:1, 0 removes the key (never vis:0)', JSON.stringify({ v1, v0 }));
    const on1 = await send(cloud, { op: 'note.add', id: 'n-bwn-1', title: ' Hello  note ', content: '<p>Hi <b>there</b></p>', tags: ['alpha', ' #beta ', 'alpha', 'a,b'], folderIds: ['x-bwn-f1', 'mmj-pages'], kind: 'general' });
    const n1 = await get(D, () => DB.articles.find((a) => a.id === 'n-bwn-1'));
    check(on1.st === 'done' && n1 && n1.title === 'Hello note' && n1.content === '<p>Hi <b>there</b></p>' && JSON.stringify(n1.tags) === '["alpha","beta","ab"]' && JSON.stringify(n1.folderIds) === '["x-bwn-f1","mmj-pages"]' && n1.kind === 'general' && !!n1.createdAt && n1.updatedAt === n1.createdAt, '128a note.add: title trimmed, tags cleaned and de-duplicated, folders, kind, stamps', JSON.stringify(n1));
    const base1 = n1.updatedAt;
    const oe = await send(cloud, { op: 'note.edit', id: 'n-bwn-1', base: base1, title: 'Edited', content: '<p>New body</p>', tags: ['gamma'] });
    const n2 = await get(D, () => { const a = DB.articles.find((x) => x.id === 'n-bwn-1'); return { title: a.title, content: a.content, tags: a.tags, upd: a.updatedAt, hist: (a.noteHistory || []).length }; });
    check(oe.st === 'done' && n2.title === 'Edited' && n2.content === '<p>New body</p>' && JSON.stringify(n2.tags) === '["gamma"]' && n2.upd > base1 && n2.hist >= 1, '128a note.edit with the right base: applied, newer updatedAt, the old version kept in Note History', JSON.stringify(n2));
    const om = await send(cloud, { op: 'note.move', id: 'm4', base: T0, folderIds: ['mmj-pages'] });
    const m4 = await get(D, () => DB.articles.find((a) => a.id === 'm4').folderIds);
    check(om.st === 'done' && JSON.stringify(m4) === '["mmj-pages","f1"]', '128a note.move sets the MMJ part of folderIds and keeps the note\'s non-MMJ folder (f1)', JSON.stringify(m4));
    const ov = await send(cloud, { op: 'note.vis', id: 'm3', vis: 1 });
    check(ov.st === 'done' && (await get(D, () => DB.articles.find((a) => a.id === 'm3').vis)) === 1, '128a note.vis 1', JSON.stringify(ov));
    const cur = await get(D, () => DB.articles.find((a) => a.id === 'n-bwn-1').updatedAt);
    const od = await send(cloud, { op: 'note.delete', id: 'n-bwn-1', base: cur });
    const dd = await get(D, () => ({ live: DB.articles.some((a) => a.id === 'n-bwn-1'), trash: DB.trash.some((t) => t.type === 'article' && t.item.id === 'n-bwn-1'), tomb: DB.tombstones.some((t) => t.id === 'n-bwn-1') }));
    check(od.st === 'done' && !dd.live && dd.trash && dd.tomb, '128a note.delete: to Trash, with its tombstone', JSON.stringify(dd));
    const odel = await send(cloud, { op: 'note.delete', id: 'n-bwn-1', base: cur });
    check(odel.st === 'done', '128a deleting what is already deleted is "done" (idempotent)', JSON.stringify(odel));
    const ofd = await send(cloud, { op: 'folder.delete', id: 'x-bwn-f2' });
    const fd = await get(D, () => ({ gone: !DB.folders.some((f) => f.id === 'x-bwn-f2'), trash: DB.trash.some((t) => t.type === 'folder' && t.item.id === 'x-bwn-f2') }));
    check(ofd.st === 'done' && fd.gone && fd.trash, '128a folder.delete (empty): to Trash', JSON.stringify(fd));
    const diag = await get(D, () => _syncDiagnosticsHTML());
    check(/Requests from other apps/.test(diag) && /done \d+/.test(diag) && /refused \d+/.test(diag), '128a the Cloud Sync diagnostics have a "Requests from other apps" line (last applied, done, refused)', (diag.match(/Requests from other apps[^]*?<\/tr>/) || [''])[0].replace(/<[^>]+>/g, ' ').slice(0, 200));
    check(D.errors.length === 0, '128a no page errors', D.errors.slice(0, 2).join(' · '));
    await D.ctx.close();
  }

  /* ══ 128b — refusals; 128c — content ══ */
  if (want('128b') || want('128c')) {
    const cloud = makeCloud();
    const D = await dev(cloud, 'D', VPS[2], mmjSeed());
    await ready(D);
    if (want('128b')) {
      await on(D, () => { persist(); }); await sleep(300);   /* a first save settles the app's own bookkeeping (themeAt) before the baseline */
      const before = await snapDB(D);
      const cases = [
        ['a folder outside MMJ', { op: 'folder.rename', id: 'f1', name: 'Hacked' }, /not a Mapping My Journey folder/],
        ['a note outside MMJ', { op: 'note.edit', id: 'a1', base: T0, title: 'Hacked' }, /not a Mapping My Journey note/],
        ['a delete of a note outside MMJ', { op: 'note.delete', id: 'a1', base: T0 }, /not a Mapping My Journey note/],
        ['a parent outside MMJ (add)', { op: 'folder.add', id: 'x-1', name: 'X', parent: 'f1' }, /not a Mapping My Journey folder/],
        ['a parent outside MMJ (move)', { op: 'folder.move', id: 'mmj-c-2', parent: 'f1' }, /not a Mapping My Journey folder/],
        ['a folder moved into itself', { op: 'folder.move', id: 'mmj-c-1', parent: 'mmj-c-1' }, /itself or one of its own subfolders/],
        ['a folder moved into its own subtree', { op: 'folder.move', id: 'mmj-c-1', parent: 'mmj-c-2' }, /itself or one of its own subfolders/],
        ['a note filed in a folder outside MMJ', { op: 'note.move', id: 'm1', base: T0, folderIds: ['f2'] }, /not a Mapping My Journey folder/],
        ['an add filed outside MMJ', { op: 'note.add', id: 'n-x', title: 'T', content: '', folderIds: ['f2'] }, /not a Mapping My Journey folder/],
        ['an unknown op', { op: 'folder.explode', id: 'mmj-c-1' }, /unknown op/],
        ['an unknown field', { op: 'folder.rename', id: 'mmj-c-1', name: 'Z', evil: 1 }, /unknown field "evil"/],
        ['an empty name', { op: 'folder.rename', id: 'mmj-c-1', name: '   ' }, /bad name/],
        ['a bad id', { op: 'folder.rename', id: '../../x', name: 'Z' }, /bad id/],
        ['a vis that is not 1 or 0', { op: 'note.vis', id: 'm1', vis: 2 }, /vis must be 1 or 0/],
        ['a missing base', { op: 'note.edit', id: 'm1', title: 'Z' }, /base is required/],
        ['tags that are not a list', { op: 'note.add', id: 'n-y', title: 'T', content: '', folderIds: ['mmj-c-1'], tags: 'x' }, /bad tags/],
      ];
      for (const [label, body, re] of cases) {
        const o = await send(cloud, body);
        check(o && o.st === 'refused' && re.test(o.why || '') && !!o.doneAt, `128b refused: ${label} (${o && o.why})`, JSON.stringify(o));
      }
      const oStale = await send(cloud, { op: 'note.edit', id: 'm1', base: '2020-01-01T00:00:00.000Z', title: 'Z' });
      check(oStale.st === 'refused' && oStale.why === 'changed in Siyagah since' && oStale.cur === T0, 'x'.length ? '128b a stale base is refused with why "changed in Siyagah since" and cur = the note\'s updatedAt' : '', JSON.stringify(oStale));
      for (const op of ['note.move', 'note.delete']) {
        const o = await send(cloud, { op, id: 'm1', base: 'stale', ...(op === 'note.move' ? { folderIds: ['mmj-c-1'] } : {}) });
        check(o.st === 'refused' && o.why === 'changed in Siyagah since' && o.cur === T0, `128b ${op} with a stale base is refused too`, JSON.stringify(o));
      }
      await on(D, () => { ST.article = 'm1'; ST.editing = true; });
      const oOpen = await send(cloud, { op: 'note.edit', id: 'm1', base: T0, title: 'Under the caret' });
      await on(D, () => { ST.editing = false; ST.article = null; });
      check(oOpen.st === 'refused' && /open in Siyagah — try again/.test(oOpen.why), '128b a note being edited in Siyagah is never changed: "open in Siyagah — try again"', JSON.stringify(oOpen));
      const oOld = await send(cloud, { op: 'folder.rename', id: 'mmj-c-1', name: 'Old', at: { __ts: [Math.floor(Date.now() / 1000) - 40 * 86400, 0] } });
      check(oOld.st === 'refused' && /too old/.test(oOld.why), '128b a request older than 30 days still in "new" is refused as "too old"', JSON.stringify(oOld));
      const after = await snapDB(D);
      check(before === after, '128b DB is byte-identical after the whole refused batch (nothing changed)', before === after ? '' : (() => { let i = 0; while (before[i] === after[i]) i++; return 'DB differs at ' + i + ': ' + before.slice(Math.max(0, i - 120), i + 120) + ' <> ' + after.slice(Math.max(0, i - 120), i + 120); })());
      check(D.errors.length === 0, '128b no page errors', D.errors.slice(0, 2).join(' · '));
    }
    if (want('128c')) {
      const evil = '<p>ok</p><script>window.__pwn=1</script><img src="x" onerror="window.__pwn=2"><a href="javascript:window.__pwn=3">j</a><img src="data:image/png;base64,AAAA"><iframe srcdoc="<b>x</b>"></iframe><style>body{display:none}</style><p onclick="window.__pwn=4">c</p><scr<script>ipt>window.__pwn=5</scr</script>ipt><a href=" JaVa&#x0A;script:window.__pwn=6">k</a><form action="javascript:1"><input></form>';
      const o = await send(cloud, { op: 'note.add', id: 'n-evil', title: 'Evil', content: evil, folderIds: ['mmj-c-1'] });
      const c = await get(D, () => (DB.articles.find((a) => a.id === 'n-evil') || {}).content);
      const bad = c == null ? ['(no note)'] : [/<script/i, /onerror/i, /onclick/i, /javascript:/i, /data:image/i, /srcdoc/i, /<iframe/i, /<style/i, /<form/i, /java\s*script/i].filter((re) => re.test(c)).map(String);
      check((o.st === 'done' && c != null && bad.length === 0 && c.includes('<p>ok</p>')) || (o.st === 'refused' && c == null), '128c <script>, onerror, onclick, javascript:, data:, srcdoc, iframe, style and form never reach a.content (stripped, or the request refused)', JSON.stringify({ o, c, bad }));
      const live = await get(D, () => ({ pwn: window.__pwn || 0, inDom: !!document.querySelector('#p3 script') }));
      check(live.pwn === 0, '128c nothing ran', JSON.stringify(live));
      const e2 = await send(cloud, { op: 'note.edit', id: 'm1', base: T0, content: evil });
      const c2 = await get(D, () => DB.articles.find((a) => a.id === 'm1').content);
      check((e2.st === 'done' && !/<script|onerror|javascript:|<iframe|srcdoc/i.test(c2)) || (e2.st === 'refused' && c2.includes('Body of MMJ one')), '128c the same holds for note.edit', JSON.stringify({ e2: e2.st, why: e2.why, c2: c2.slice(0, 120) }));
      const big = await send(cloud, { op: 'note.add', id: 'n-big', title: 'Big', content: 'x'.repeat(950000), folderIds: ['mmj-c-1'] });
      check(big.st === 'refused' && /bad content/.test(big.why), '128c content over 900 KB is refused', JSON.stringify(big));
      const longName = await send(cloud, { op: 'folder.add', id: 'x-long', name: 'N'.repeat(500), parent: null });
      const ln = await get(D, () => (DB.folders.find((f) => f.id === 'x-long') || {}).name);
      check(longName.st === 'done' && ln.length === 200, '128c a name is capped at 200 characters', String(ln && ln.length));
    }
    await D.ctx.close();
  }

  /* ══ 128d — two devices, one queue ══ */
  if (want('128d')) {
    const cloud = makeCloud();
    const A = await dev(cloud, 'A', VPS[2], mmjSeed());
    const B = await dev(cloud, 'B', VPS[0], mmjSeed());
    await ready(A); await ready(B);
    const hook = (d) => on(d, () => { window.__applied = []; const o = _miApply; _miApply = (r) => { window.__applied.push(r.id); return o(r); }; });
    await hook(A); await hook(B);
    const ids = []; const N = 24;
    for (let i = 0; i < N; i++) ids.push(req(cloud, { op: 'folder.add', id: 'x-two-' + i, name: 'Two ' + i, parent: 'mmj-c-1' }));
    for (const id of ids) await outcome(cloud, id, 60000);
    await sleep(800);
    const a = await on(A, () => window.__applied), b = await on(B, () => window.__applied);
    const all = a.concat(b), dup = all.filter((x, i) => all.indexOf(x) !== i);
    const states = ids.map((id) => doc(cloud, id).st);
    check(states.every((s) => s === 'done') && all.length === N && dup.length === 0 && new Set(all).size === N, `128d ${N} requests, two devices: each applied exactly once (A ${a.length}, B ${b.length}, repeats ${dup.length})`, JSON.stringify({ states: [...new Set(states)], a: a.length, b: b.length, dup }));
    check(a.length > 0 || b.length > 0, '128d at least one device took work', '');
    check(ids.every((id) => !!doc(cloud, id).by), '128d each request records which device claimed it (by)', '');
    check(A.errors.length === 0 && B.errors.length === 0, '128d no page errors', [...A.errors, ...B.errors].slice(0, 2).join(' · '));
    await A.ctx.close(); await B.ctx.close();
  }

  /* ══ 128e — merged with a stale device, and the shared copy ══ */
  if (want('128e')) {
    const cloud = makeCloud();
    const D = await dev(cloud, 'D', VPS[2], mmjSeed());
    await ready(D);
    await run(D);
    const stale = await on(D, () => JSON.parse(JSON.stringify(DB)));
    await send(cloud, { op: 'folder.rename', id: 'mmj-c-2', name: 'Stops renamed' });
    await send(cloud, { op: 'note.edit', id: 'm1', base: T0, title: 'MMJ one edited' });
    await send(cloud, { op: 'note.delete', id: 'm3', base: T0 });
    await send(cloud, { op: 'note.add', id: 'n-new', title: 'Brand new', content: '<p>n</p>', folderIds: ['mmj-c-2'] });
    const out = await on(D, (stale) => {
      const m1 = mergeDB(JSON.parse(JSON.stringify(stale)), JSON.parse(JSON.stringify(DB)));
      const m2 = mergeDB(JSON.parse(JSON.stringify(DB)), JSON.parse(JSON.stringify(stale)));
      const sum = (m) => ({ f: (m.folders.find((f) => f.id === 'mmj-c-2') || {}).name, t1: (m.articles.find((a) => a.id === 'm1') || {}).title, m3: m.articles.some((a) => a.id === 'm3'), nn: m.articles.some((a) => a.id === 'n-new'), n: m.articles.length });
      return { stale: sum(stale), m1: sum(m1), m2: sum(m2) };
    }, stale);
    const want1 = { f: 'Stops renamed', t1: 'MMJ one edited', m3: false, nn: true, n: 7 };
    check(JSON.stringify(out.m1) === JSON.stringify(want1) && JSON.stringify(out.m2) === JSON.stringify(want1), '128e the requests\' changes merged into a stale device and back: renamed, edited, deleted note stays deleted, new note present, no note lost (both directions)', JSON.stringify(out));
    await run(D);
    const docs = {}; for (const [p, v] of cloud.store) if (p.startsWith(NB + '/mmj/')) docs[p.slice(NB.length + 5)] = v;
    check(docs['n~m1'] && docs['n~m1'].title === 'MMJ one edited' && docs['n~m3'] && docs['n~m3'].gone === true && docs['n~n-new'] && docs['n~n-new'].title === 'Brand new' && docs['t~0'].folders.find((f) => f.id === 'mmj-c-2').n === 'Stops renamed', '128e the shared copy followed: the edited note, the deleted note gone:true, the new note, the renamed folder in t~0', JSON.stringify(Object.keys(docs)));
    /* a second device really receives them */
    const B = await dev(cloud, 'B', VPS[0], mmjSeed());
    await ready(B);
    await on(D, () => { flushPendingPush(); }); await sleep(600);
    const got = await (async () => { const t = Date.now(); while (Date.now() - t < 25000) { const r = await on(B, () => ({ f: (DB.folders.find((f) => f.id === 'mmj-c-2') || {}).name, n: DB.articles.some((a) => a.id === 'n-new'), m3: DB.articles.some((a) => a.id === 'm3') })).catch(() => null); if (r && r.f === 'Stops renamed' && r.n && !r.m3) return r; await sleep(300); } return null; })();
    check(!!got, 'a second Siyagah device receives the applied requests through normal sync', JSON.stringify(got));
    await B.ctx.close(); await D.ctx.close();
  }

  /* ══ 128f — the owner's new D6, in Siyagah itself ══ */
  if (want('128f')) {
    for (const vp of VPS) {
      const cloud = makeCloud();
      const db = seedDB(T0);
      db.articles.push({ id: 'a4', title: 'Two folders', content: '<p>x</p>', folderIds: ['f1a', 'f2'], tags: [], createdAt: T0, updatedAt: T0, kind: 'general' });
      const D = await dev(cloud, 'U' + vp.name, vp, db);
      await ready(D);
      const stale = await on(D, () => JSON.parse(JSON.stringify(DB)));
      await on(D, () => { ST.secOpen = { 'sec-1': true }; renderTree(); });
      if (vp.w < 640) await on(D, () => showPane('sb'));
      const row = D.page.locator('#tree .tr-row[data-fid="f1"]').first();
      if (vp.touch) {
        await row.scrollIntoViewIfNeeded();
        const b = await row.boundingBox(); const cdp = await D.page.context().newCDPSession(D.page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x + Math.min(40, b.width / 2), y: b.y + b.height / 2 }] });
        await sleep(900); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(300);
      } else await row.click({ button: 'right' });
      await sleep(250);
      await D.page.locator('#ctx .ci', { hasText: 'Delete folder' }).first().click(); await sleep(300);
      const msg = await on(D, () => { const m = document.getElementById('del-msg'); const b = document.getElementById('del-folder-ok'); const r = m && m.getBoundingClientRect(); return { text: m ? m.textContent : '', btn: !!b, inside: !!r && r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, f1: DB.folders.some((f) => f.id === 'f1') }; });
      check(/Delete “\(001\) Seeded Folder”, its 1 subfolder and 2 notes\? They go to Trash together; Undo or Restore brings them all back\./.test(msg.text) && /1 note is also in other folders: it stays there\./.test(msg.text) && msg.btn && msg.inside && msg.f1, `128f ${vp.name}: the real ${vp.touch ? 'long-press' : 'right-click'} → Delete folder shows one confirmation with the counts and the "also in other folders" line, on screen, and deletes nothing yet`, JSON.stringify(msg));
      await D.page.locator('#del-folder-ok').click(); await sleep(400);
      const st = await on(D, () => ({
        folders: DB.folders.map((f) => f.id), arts: DB.articles.map((a) => a.id).sort(), a4: DB.articles.find((a) => a.id === 'a4'),
        trash: DB.trash.map((t) => ({ type: t.type, id: t.item.id, fo: (t.subtree.folders || []).map((f) => f.id), ar: (t.subtree.articles || []).map((a) => a.id).sort(), kept: (t.subtree.kept || []).map((k) => k.id) })),
        tomb: DB.tombstones.map((t) => t.id).sort() }));
      check(!st.folders.includes('f1') && !st.folders.includes('f1a') && JSON.stringify(st.arts) === '["a3","a4"]' && st.trash.length === 1 && st.trash[0].type === 'folder' && JSON.stringify(st.trash[0].ar) === '["a1","a2"]' && JSON.stringify(st.trash[0].fo) === '["f1a"]' && JSON.stringify(st.trash[0].kept) === '["a4"]', `128f ${vp.name}: the folder, its subfolder and the notes whose only folders were inside went to Trash as ONE group; the multi-folder note stayed`, JSON.stringify(st.trash));
      /* Architect's review (v05.68): the kept note is NOT stamped (unfiling is not an edit; mergeDB() unfiles it from the folders' tombstones), so a
         concurrent edit on another device is never beaten by the deletion's time. This check used to require a new updatedAt; updated in place. */
      check(JSON.stringify(st.a4.folderIds) === '["f2"]' && st.a4.updatedAt === T0, `128f ${vp.name}: the kept note lost only the deleted folder id and was NOT stamped`, JSON.stringify(st.a4));
      check(JSON.stringify(st.tomb) === '["a1","a2","f1","f1a"]', `128f ${vp.name}: tombstones name only what was removed (f1, f1a, a1, a2) - never the kept note`, JSON.stringify(st.tomb));
      const mg = await on(D, (stale) => {
        const m1 = mergeDB(JSON.parse(JSON.stringify(stale)), JSON.parse(JSON.stringify(DB)));
        const m2 = mergeDB(JSON.parse(JSON.stringify(DB)), JSON.parse(JSON.stringify(stale)));
        const s = (m) => ({ f: m.folders.map((f) => f.id).sort(), a: m.articles.map((a) => a.id).sort(), a4: (m.articles.find((a) => a.id === 'a4') || {}).folderIds, t: m.trash.length });
        return { m1: s(m1), m2: s(m2) };
      }, stale);
      const w = { f: ['f2'], a: ['a3', 'a4'], a4: ['f2'], t: 1 };
      check(JSON.stringify(mg.m1) === JSON.stringify(w) && JSON.stringify(mg.m2) === JSON.stringify(w), `128f ${vp.name}: merged both ways with a stale device nothing comes back and the kept note is not lost`, JSON.stringify(mg));
      /* Architect's review: the other device EDITED the kept note meanwhile (later than the seed, earlier than the deletion): its edit survives both ways */
      const ce = await on(D, (stale) => {
        const ed = JSON.parse(JSON.stringify(stale)); const n = ed.articles.find((a) => a.id === 'a4'); n.content = '<p>edited elsewhere</p>'; n.updatedAt = '2026-10-02T00:00:00.000Z';
        const s = (m) => { const a = m.articles.find((x) => x.id === 'a4') || {}; return { c: a.content, f: a.folderIds }; };
        return { m1: s(mergeDB(JSON.parse(JSON.stringify(ed)), JSON.parse(JSON.stringify(DB)))), m2: s(mergeDB(JSON.parse(JSON.stringify(DB)), JSON.parse(JSON.stringify(ed)))) };
      }, stale);
      const cw = { c: '<p>edited elsewhere</p>', f: ['f2'] };
      check(JSON.stringify(ce.m1) === JSON.stringify(cw) && JSON.stringify(ce.m2) === JSON.stringify(cw), `128f ${vp.name}: an edit of the kept note made meanwhile on another device survives the deletion, both ways, and the note still leaves the deleted folder`, JSON.stringify(ce));
      /* Undo brings it all back */
      await on(D, () => { undo(); }); await sleep(400);
      const u = await on(D, () => ({ f: DB.folders.map((f) => f.id).sort(), a: DB.articles.map((a) => a.id).sort(), a4: DB.articles.find((a) => a.id === 'a4').folderIds.slice().sort(), t: DB.trash.length }));
      check(JSON.stringify(u.f) === '["f1","f1a","f2"]' && JSON.stringify(u.a) === '["a1","a2","a3","a4"]' && JSON.stringify(u.a4) === '["f1a","f2"]' && u.t === 0, `128f ${vp.name}: ↶ Undo brings the whole group back exactly`, JSON.stringify(u));
      await on(D, () => { if (!DB.trash.length) trashFolder('f1'); }); await sleep(400);
      /* Restore from Trash */
      const r = await on(D, () => { const tr = DB.trash[0]; if (!tr) return null; restoreItem(tr.id); return { f: DB.folders.map((f) => f.id).sort(), a: DB.articles.map((a) => a.id).sort(), a1: DB.articles.find((a) => a.id === 'a1').folderIds, a2: DB.articles.find((a) => a.id === 'a2').folderIds, a4: DB.articles.find((a) => a.id === 'a4').folderIds.slice().sort(), t: DB.trash.length, tomb: DB.tombstones.length }; });
      check(r && JSON.stringify(r.f) === '["f1","f1a","f2"]' && JSON.stringify(r.a) === '["a1","a2","a3","a4"]' && JSON.stringify(r.a1) === '["f1"]' && JSON.stringify(r.a2) === '["f1a"]' && JSON.stringify(r.a4) === '["f1a","f2"]' && r.t === 0 && r.tomb === 0, `128f ${vp.name}: Restore from Trash brings back the folders, both notes in their folders, and the kept note's folder`, JSON.stringify(r));
      /* an empty folder deletes as before; a folder of only multi-folder notes keeps them */
      const e = await on(D, () => { const id = mkFolder(null, 'Empty one'); const msg = _folderDelText(id); trashFolder(id); return { msg, gone: !DB.folders.some((f) => f.id === id), tomb: DB.tombstones.some((t) => t.id === id) }; });
      check(/^Move folder “.*Empty one” to Trash\?/.test(e.msg) && e.gone && e.tomb, `128f ${vp.name}: an empty folder deletes as before (old wording, tombstoned)`, JSON.stringify(e));
      check(D.errors.length === 0, `128f ${vp.name}: no page errors`, D.errors.slice(0, 2).join(' · '));
      await D.ctx.close();
    }
  }

  /* ══ 128g — the gate, a hidden page ══ */
  if (want('128g')) {
    const cloud = makeCloud();
    const S = await dev(cloud, 'S', VPS[2], mmjSeed(), { holdQ: true });
    await sleep(1500);
    const caught = await on(S, () => !!_s1RdCaught);
    const id1 = req(cloud, { op: 'folder.add', id: 'x-gate', name: 'Gate', parent: null });
    await sleep(7500);
    const mid = await on(S, () => ({ has: DB.folders.some((f) => f.id === 'x-gate'), ready: _miReady() }));
    check(!caught && !mid.has && !mid.ready && doc(cloud, id1).st === 'new', '128g a device that has not read yet applies nothing (the request stays new)', JSON.stringify({ caught, mid, st: doc(cloud, id1).st }));
    S.holdQ = false; for (const id of S.qsubs.keys()) cloud.deliverQ(S, id, true);
    await ready(S);
    const o = await outcome(cloud, id1, 40000);
    check(o && o.st === 'done', '128g once it has read, it applies the waiting request', JSON.stringify(o));
    await on(S, () => { Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true }); });
    const o2 = await send(cloud, { op: 'folder.add', id: 'x-hid', name: 'Hidden page', parent: null });
    await on(S, () => { delete document.visibilityState; });
    check(o2 && o2.st === 'done', '128g a hidden page (any tab) still applies requests', JSON.stringify(o2));
    const noDel = [...cloud.store.keys()].filter((k) => k.startsWith(NB + '/mmjin/')).length === cloud.log.filter((l) => l.t === 'del' && l.p.includes('/mmjin/')).length + [...cloud.store.keys()].filter((k) => k.startsWith(NB + '/mmjin/')).length;
    check(noDel && cloud.log.every((l) => !(l.t === 'del' && l.p.includes('/mmjin/'))), '128g a request doc is never deleted', '');
    const other = cloud.log.filter((l) => l.dev === 'S' && l.t === 'set' && l.p.startsWith(NB + '/mmjin/'));
    check(other.length >= 3, '128g the outcome is written on the same doc (claim + outcome writes)', String(other.length));
    check(S.errors.length === 0, '128g no page errors', S.errors.slice(0, 2).join(' · '));
    await S.ctx.close();
  }

  /* ══ 128h — 200 queued requests on a phone ×4 ══ */
  if (want('128h')) {
    const cloud = makeCloud();
    const db = mmjSeed();
    for (let i = 0; i < 1500; i++) db.articles.push({ id: 'bulk' + i, title: 'Bulk ' + i, content: '<p>b' + i + '</p>', folderIds: ['f2'], tags: [], createdAt: T0, updatedAt: T0 });
    const P = await dev(cloud, 'P', VPS[0], db, { throttle: 4 });
    await ready(P, 90000);
    await on(P, probeInstall);
    const mark = await on(P, () => performance.now());
    const ids = [];
    for (let i = 0; i < 200; i++) ids.push(req(cloud, i % 2 ? { op: 'folder.add', id: 'x-p-' + i, name: 'Phone ' + i, parent: 'mmj-c-1' } : { op: 'note.add', id: 'n-p-' + i, title: 'Phone note ' + i, content: '<p>' + i + '</p>', folderIds: ['mmj-c-1'] }));
    const t0 = Date.now();
    let done = 0;
    while (Date.now() - t0 < 240000) { done = ids.filter((id) => { const d = doc(cloud, id); return d && (d.st === 'done' || d.st === 'refused'); }).length; if (done === ids.length) break; await sleep(500); }
    const lts = await on(P, probeRead, mark);
    const HL = hostLimit(200), worst = Math.max(0, ...lts.map((x) => x.app));
    const okN = ids.filter((id) => doc(cloud, id).st === 'done').length;
    check(okN === 200, `128h 200 queued requests were all applied (${okN} done in ${((Date.now() - t0) / 1000).toFixed(1)} s)`, JSON.stringify({ done }));
    check(worst <= HL.ms, `128h no long task over ${HL.text} while they were applied (worst ${worst} ms, ${lts.length} long tasks)`, JSON.stringify(lts.slice(0, 6)));
    check(P.errors.length === 0, '128h no page errors', P.errors.slice(0, 2).join(' · '));
    await P.ctx.close();
  }
} catch (e) {
  check(false, '128 the check ran without throwing', String(e && e.stack || e).slice(0, 600));
}
await browser.close(); await srv.close();
const res = (await import('./s1-fake.mjs')).results;
const bad = res.filter((x) => !x.ok).length;
console.log(`\n${res.length - bad}/${res.length} passed`);
process.exit(bad ? 1 : 0);
