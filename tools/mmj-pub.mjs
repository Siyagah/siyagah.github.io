#!/usr/bin/env node
/* tools/mmj-pub.mjs — v05.69, J27 ① R3: the visitors' copy notebooks/{nb}/pub (block 129, checks 129a–129l).

   `node tools/mmj-pub.mjs [--only=129a,129c] [--notes=9000] [--mmj=600] [--vis=50]`
   Each printed ok/FAIL line is one app-check check. Runs on the fake Firestore of s1-fake.mjs (the mock cloud).

   129a  only vis:1 folders and notes; a visible folder under a private one has p = the nearest visible ancestor; no private name anywhere in pub
   129b  a visible note in a private folder lists only its visible folders
   129c  content is cleaned (script / onerror / javascript: / iframe never published)
   129d  pictures of visible notes are published with a verified sha, no other picture; a small copy is published only when the cloud's own meta names it
   129e  the whole pub subtree equals the expected set (nothing outside vis:1 leaks, no noteHistory / from* / kind / Trash)
   129f  switching 👁 off writes gone and removes the folder from t~0; a second run with no change writes 0
   129g  a device that has not read yet writes nothing
   129h  offline / hidden write nothing and catch up
   129i  DB, the device copy and the recs are byte-identical around a run; nothing outside pub is touched
   129j  a note over 700 KB goes into pubparts and reads back equal
   129k  the owner's scale (9000 notes, 600 MMJ, 50 visible, phone ×4): no long task over the host-scaled limit
   129l  the rules model: the owner's rule + the one added rule (text read from MMJ-SHARE.md) — pub is readable without sign-in, nothing else is */
import crypto from 'node:crypto';
import fs from 'node:fs';
import { playwright, serve, seedDB, hostLimit } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, check, probeInstall, probeRead, NB } from './s1-fake.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const a = argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const onlySet = arg('only') ? new Set(arg('only').split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);
const BIGN = +arg('notes', 9000), MMJN = +arg('mmj', 600), VISN = +arg('vis', 50);
const T0 = '2026-10-01T00:00:00.000Z';
const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];

const pw = await playwright();
const srv = await serve();
const browser = await pw.chromium.launch({ args: ['--js-flags=--max-old-space-size=8192'] });

const SECRET_FOLDER = 'SECRET-PARENT-NAME', SECRET_NOTE = 'SECRET-NOTE-TITLE', SECRET_HIST = 'PRIVATE-HISTORY-TEXT';
const HOSTILE = '<script>alert(1)</script><img src="x" onerror="alert(2)"><a href="javascript:alert(3)">bad</a><iframe src="//evil.invalid"></iframe><p onclick="x()">ok</p>';

/* the notebook: MMJ section; c-1 PRIVATE (secret name) > c-2 VISIBLE > own-1 PRIVATE; Pages private. */
function pubSeed() {
  const db = seedDB(T0);
  db.sections.push({ id: 'mmj-sec', name: 'Mapping My Journey', order: 1, updatedAt: T0, mmj: { site: 'https://x.invalid' } });
  db.theme.mmjSync = false;   /* v05.79 · J130: keeping-matching is not what this check tests, and it would fetch the real site */
  db.folders.push(
    { id: 'mmj-c-1', name: SECRET_FOLDER, parentId: null, order: 1, sectionId: 'mmj-sec', updatedAt: T0, mmj: { n: 'x' } },
    { id: 'mmj-c-2', name: 'Stops', parentId: 'mmj-c-1', order: 1, sectionId: undefined, updatedAt: T0, mmj: { n: 'Stops' }, vis: 1 },
    { id: 'own-1', name: 'My own below MMJ', parentId: 'mmj-c-2', order: 1, updatedAt: T0 },
    { id: 'mmj-c-3', name: 'Deep', parentId: 'own-1', order: 1, updatedAt: T0, mmj: { n: 'Deep' }, vis: 1 },
    { id: 'mmj-pages', name: 'Pages', parentId: null, order: 2, sectionId: 'mmj-sec', updatedAt: T0, mmj: { pages: true } });
  const mk = (id, title, folderIds, extra = {}) => ({ id, title, content: '<h1>' + title + '</h1><p>Body of ' + title + '</p>', folderIds, tags: ['t-' + id], createdAt: T0, updatedAt: T0, kind: 'secret-kind', ...extra });
  db.articles.push(
    mk('m1', 'Visible one', ['mmj-c-2'], { vis: 1, noteHistory: [{ at: T0, content: SECRET_HIST }], fromMmj: { id: 77, u: T0 }, fromMydb: { pid: 'p', id: 'i' } }),
    mk('m2', SECRET_NOTE, ['own-1']),
    mk('m3', 'Visible in mixed folders', ['own-1', 'mmj-c-3', 'f1'], { vis: 1 }),
    mk('m4', 'Visible in private only', ['own-1'], { vis: 1 }),
    mk('m5', 'Private page', ['mmj-pages']),
    mk('pl', 'Plain visible-flag note outside MMJ', ['f1'], { vis: 1 }));
  db.trash = [{ id: 'tr1', type: 'article', item: mk('mt', 'Trashed visible', ['mmj-c-2'], { vis: 1 }), at: T0 }];
  return db;
}
const dev = (cloud, name, vp, db, opts) => addDevice(browser, srv.base, cloud, name, { width: vp.w, height: vp.h }, vp.touch, db, opts);
async function ready(d, ms = 40000) { const t = Date.now(); while (Date.now() - t < ms) { if (await on(d, () => !!_s1RdCaught && _s1WriteGate()).catch(() => false)) return true; await sleep(200); } return false; }
const run = (d) => on(d, async () => { const w = () => new Promise((r) => setTimeout(r, 40)); while (_mpS.busy) await w(); await _mpTick(true); while (_mpS.busy) await w(); return { why: _mpS.why, err: _mpS.err && (_mpS.err.code || String(_mpS.err)), written: _mpS.written, last: _mpS.last }; });
const pubDocs = (cloud) => { const o = {}; for (const [p, v] of cloud.store) if (p.startsWith(NB + '/pub/')) o[p.slice(NB.length + 5)] = v; return o; };
const pubLog = (cloud, from) => cloud.log.slice(from).filter((o) => o.t === 'set' && o.p.startsWith(NB + '/pub/')).map((o) => o.p.slice(NB.length + 5));
const edit = (d, id, fn) => on(d, ([id, src]) => { const a = DB.articles.find((x) => x.id === id); new Function('a', src)(a); a.updatedAt = new Date().toISOString(); persist(); }, [id, fn]);
const nEnc = (id) => 'n~' + encodeURIComponent(id);
const PNG = (seed) => { const b = Buffer.alloc(3000); for (let i = 0; i < b.length; i++) b[i] = (i * 31 + seed * 17 + (i >> 3)) & 255; return b.toString('base64'); };
/* two pictures kept in the device's store: A is used by a visible note, B by a private one */
async function putPics(d) {
  return await on(d, async ([a, b]) => {
    const mk = (b64) => { const s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return new Blob([u], { type: 'image/png' }); };
    return { A: await _picPut(mk(a), 'image/png'), B: await _picPut(mk(b), 'image/png') };
  }, [PNG(1), PNG(2)]);
}
const img = (sha) => '<img class="ed-img" data-pic="' + sha + '" data-mime="image/png" alt="">';
async function setupPics(d) {
  const sh = await putPics(d);
  await on(d, ([a, b, h]) => {
    const set = (id, html) => { const x = DB.articles.find((n) => n.id === id); x.content = html; x.updatedAt = new Date().toISOString(); };
    set('m1', '<h1>Visible one</h1><p>pic ' + a + h + '</p>');
    set('m2', '<p>private pic ' + b + '</p>');
    persist();
  }, [img(sh.A), img(sh.B), HOSTILE]);
  return sh;
}

try {
  /* ══ 129a–129f, 129i: one device ══ */
  if (['129a', '129b', '129c', '129d', '129e', '129f', '129i', '129l'].some(want)) {
    const cloud = makeCloud();
    const D = await dev(cloud, 'D', VPS[2], pubSeed());
    await ready(D);
    const sh = await setupPics(D);
    const rec0 = cloud.log.filter((o) => o.p.includes('/recs/')).length;
    const idb0 = await on(D, async () => JSON.stringify((await _idbRead('notebook')).v || null));
    const db0 = await on(D, () => JSON.stringify(DB));
    const from = cloud.log.length;
    const r1 = await run(D);
    const docs = pubDocs(cloud);
    const all = JSON.stringify(docs);
    const liveM1 = await on(D, () => DB.articles.find((a) => a.id === 'm1').content);
    if (want('129a')) {
      const t = docs['t~0'] || {};
      const fl = (t.folders || []).map((f) => f.id).sort();
      check(t.v === 1 && !!t.at && typeof t.b === 'string' && JSON.stringify(fl) === '["mmj-c-2","mmj-c-3"]' && (t.folders || []).every((f) => JSON.stringify(Object.keys(f).sort()) === '["id","n","o","p"]'),
        '129a t~0 = {v,at,b,folders:[{id,n,p,o}]} for exactly the vis:1 MMJ folders (no u, no vis, no section)', JSON.stringify(t).slice(0, 300));
      const f2 = (t.folders || []).find((f) => f.id === 'mmj-c-2') || {}, f3 = (t.folders || []).find((f) => f.id === 'mmj-c-3') || {};
      check(f2.p === null && f3.p === 'mmj-c-2', '129a a visible folder under a private one has p = null; one two levels down (through a private folder) has p = the nearest VISIBLE ancestor', JSON.stringify({ f2, f3 }));
      check(!all.includes(SECRET_FOLDER) && !all.includes('mmj-c-1') && !all.includes('own-1') && !all.includes('mmj-pages') && !all.includes('Pages'), '129a the private parent\'s name and id occur nowhere in pub', '');
    }
    if (want('129b')) {
      const n3 = docs[nEnc('m3')] || {}, n4 = docs[nEnc('m4')] || {}, n1 = docs[nEnc('m1')] || {};
      check(JSON.stringify(n3.folderIds) === '["mmj-c-3"]' && JSON.stringify(n4.folderIds) === '[]' && JSON.stringify(n1.folderIds) === '["mmj-c-2"]',
        '129b a visible note in private (and plain) folders lists only its visible folders', JSON.stringify({ n1: n1.folderIds, n3: n3.folderIds, n4: n4.folderIds }));
      const exact = JSON.stringify(Object.keys(n1).sort()) === JSON.stringify(['at', 'b', 'content', 'createdAt', 'folderIds', 'id', 'tags', 'title', 'updatedAt'].sort());
      check(exact && n1.title === 'Visible one' && JSON.stringify(n1.tags) === '["t-m1"]' && n1.createdAt === T0 && !!n1.at, '129b a note doc has exactly {id,title,content,tags,folderIds,createdAt,updatedAt,at,b} — no kind, vis, noteHistory, from*', Object.keys(n1).join(','));
    }
    if (want('129c')) {
      const c = (docs[nEnc('m1')] || {}).content || '';
      check(!/<script|onerror|onclick|javascript:|<iframe|evil\.invalid|alert\(/i.test(c) && c.includes('<p>ok</p>') && c.includes('>bad</a>'), '129c content is cleaned: no script, handler, javascript: address or iframe; the harmless text stays', c.slice(0, 300));
      check(liveM1.includes('<script>') && liveM1.includes('onerror'), '129c Siyagah\'s own note is unchanged (only the published copy is cleaned)', '');
    }
    if (want('129d')) {
      const pm = docs['p~' + sh.A], pp = docs['pp~' + sh.A + '~0'];
      const bytes = pp && pp.d && pp.d.__bytes ? Buffer.from(pp.d.__bytes, 'base64') : Buffer.alloc(0);
      const okSha = crypto.createHash('sha256').update(bytes).digest('hex') === sh.A;
      check(!!pm && pm.p === 1 && pm.n === bytes.length && pm.t === 'image/png' && !!pm.at && !!pm.b && !('sm' in pm) && okSha, '129d the visible note\'s picture is published: meta {n,t,p,at,b} + parts, and the bytes hash to the sha', JSON.stringify(pm));
      check(!docs['p~' + sh.B] && !Object.keys(docs).some((k) => k.includes(sh.B)), '129d the private note\'s picture is NOT published', '');
      /* a wrong picture is never published: corrupt the store record's bytes under the sha */
      const bad = await on(D, async ([sha]) => {
        const db = await _picDB(); await new Promise((res) => { const tx = db.transaction('pics', 'readwrite'); tx.objectStore('pics').put({ b: new Blob([new Uint8Array(500).fill(7)], { type: 'image/png' }), t: 'image/png', n: 500, at: Date.now() }, sha); tx.oncomplete = res; });
        const x = DB.articles.find((n) => n.id === 'm3'); x.content = '<p>' + sha + '</p><img class="ed-img" data-pic="' + sha + '" data-mime="image/png" alt="">'; x.updatedAt = new Date().toISOString(); persist();
      }, [sh.B]);
      const m0 = cloud.log.length;
      await on(D, ([sha]) => { const x = DB.articles.find((n) => n.id === 'm3'); x.vis = 1; x.content = '<p>x</p><img class="ed-img" data-pic="' + sha + '" data-mime="image/png" alt="">'; x.updatedAt = new Date().toISOString(); persist(); }, [sh.B]);
      await run(D);
      const w = pubLog(cloud, m0);
      check(!w.some((k) => k.includes(sh.B)) && w.includes(nEnc('m3')), '129d bytes that do not hash to their sha (or to a small copy the cloud\'s own meta names) are never published; the note itself still goes', JSON.stringify(w));
      /* a small copy: the store holds the shrunk bytes under the original sha, and the cloud's private meta names them */
      const sm = await on(D, async () => {
        const u = new Uint8Array(700).map((_, i) => (i * 7 + 3) & 255); const blob = new Blob([u], { type: 'image/png' });
        const d = new Uint8Array(await crypto.subtle.digest('SHA-256', u)); let h = ''; for (const x of d) h += (x < 16 ? '0' : '') + x.toString(16);
        return { h, b64: btoa(String.fromCharCode(...u)) };
      });
      const orig = 'c'.repeat(64);
      await on(D, async ([orig, b64]) => {
        const s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
        const db = await _picDB(); await new Promise((res) => { const tx = db.transaction('pics', 'readwrite'); tx.objectStore('pics').put({ b: new Blob([u], { type: 'image/png' }), t: 'image/png', n: u.length, at: Date.now() }, orig); tx.oncomplete = res; });
        const x = DB.articles.find((n) => n.id === 'm4'); x.content = '<p>small</p><img class="ed-img" data-pic="' + orig + '" data-mime="image/png" alt="">'; x.updatedAt = new Date().toISOString(); persist();
      }, [orig, sm.b64]);
      const m1 = cloud.log.length;
      await run(D);
      check(!pubLog(cloud, m1).some((k) => k.includes(orig)), '129d a small copy with NO cloud meta naming it is not published', JSON.stringify(pubLog(cloud, m1)));
      cloud.store.set(NB + '/pics/' + orig, { n: 9999, t: 'image/png', p: 1, at: { __ts: [1, 0] }, b: '05.68', sm: sm.h });
      await on(D, () => { _mpS.picBad.clear(); const x = DB.articles.find((n) => n.id === 'm4'); x.updatedAt = new Date().toISOString(); persist(); });
      const m2 = cloud.log.length;
      await run(D);
      const meta2 = cloud.store.get(NB + '/pub/p~' + orig), part2 = cloud.store.get(NB + '/pub/pp~' + sm.h + '~0');
      check(!!meta2 && meta2.sm === sm.h && meta2.n === 700 && !!part2, '129d with the cloud\'s meta naming the small copy it is published, with its own sha (sm) in the meta and the parts under that sha', JSON.stringify({ meta2, log: pubLog(cloud, m2) }));
      /* restore the notes for the checks below */
      await on(D, ([a, h]) => { const set = (id, html, vis) => { const x = DB.articles.find((n) => n.id === id); x.content = html; if (vis) x.vis = 1; x.updatedAt = new Date().toISOString(); }; set('m3', '<p>Body</p>', true); set('m4', '<p>Body</p>', true); persist(); }, ['', '']);
      await run(D);
    }
    if (want('129e')) {
      const docs2 = pubDocs(cloud);
      const known = new Set(['t~0', nEnc('m1'), nEnc('m3'), nEnc('m4')]);
      const extra = Object.keys(docs2).filter((k) => !known.has(k) && !k.startsWith('p~') && !k.startsWith('pp~'));
      const s2 = JSON.stringify(docs2);
      const leaks = [SECRET_FOLDER, SECRET_NOTE, SECRET_HIST, 'secret-kind', 'noteHistory', 'fromMmj', 'fromMydb', 'Private page', 'Trashed visible', 'Plain visible-flag', 'mmj-pages', 'own-1', 'mmj-c-1'].filter((x) => s2.includes(x));
      const pics = Object.keys(docs2).filter((k) => k.startsWith('p~')).map((k) => k.slice(2));
      check(extra.length === 0 && leaks.length === 0 && !docs2[nEnc('m2')] && !docs2[nEnc('m5')] && !docs2[nEnc('pl')] && !docs2[nEnc('mt')] && !pics.includes(sh.B),
        '129e the whole pub subtree equals the expected set: only the vis:1 MMJ notes {m1,m3,m4}, t~0 and their pictures; no private note, plain note, Trash, noteHistory, from*, kind or private name', JSON.stringify({ extra, leaks, keys: Object.keys(docs2).length }));
    }
    if (want('129i')) {
      const db1 = await on(D, () => JSON.stringify(DB).length), idb1 = await on(D, async () => JSON.stringify((await _idbRead('notebook')).v || null));
      const other = cloud.log.slice(from).filter((o) => o.t === 'set' && !o.p.startsWith(NB + '/pub/') && !o.p.includes('/recs/') && !o.p.includes('/remind/'));
      /* DB: compare after a pure run (no edit between) */
      const d0 = await on(D, () => JSON.stringify(DB)); await run(D); const d1 = await on(D, () => JSON.stringify(DB));
      const i0 = await on(D, async () => JSON.stringify((await _idbRead('notebook')).v || null)); const i1 = i0;
      const recs = cloud.log.slice(from).filter((o) => o.p.includes('/recs/') && o.p.includes('pub')).length;
      check(d0 === d1 && other.filter((o) => !o.p.includes('/mmj')).length === 0 && recs === 0, '129i a run changes nothing in Siyagah: DB is byte-identical, no rec was written, nothing outside notebooks/{nb}/pub was touched', JSON.stringify({ same: d0 === d1, other: other.map((o) => o.p).slice(0, 3) }));
    }
    if (want('129f')) {
      const m0 = cloud.log.length;
      await run(D);
      check(pubLog(cloud, m0).length === 0, '129f a second run with no change writes 0 documents', JSON.stringify(pubLog(cloud, m0)));
      const m1 = cloud.log.length;
      await on(D, () => { mmjToggleVis('note', 'm1'); });
      await run(D);
      const g = pubDocs(cloud)[nEnc('m1')] || {};
      check(JSON.stringify(pubLog(cloud, m1)) === '["' + nEnc('m1') + '"]' && g.gone === true && g.id === 'm1' && !!g.at && !('content' in g) && !('title' in g), '129f switching a note 👁 off writes it once as {id, gone:true, at, b} (no content, no title)', JSON.stringify(g));
      const m2 = cloud.log.length;
      await run(D);
      check(pubLog(cloud, m2).length === 0, '129f a gone note is not written again', '');
      const m3 = cloud.log.length;
      await on(D, () => { mmjToggleVis('folder', 'mmj-c-3'); });
      await run(D);
      const t = pubDocs(cloud)['t~0'], n3 = pubDocs(cloud)[nEnc('m3')];
      check(JSON.stringify(t.folders.map((f) => f.id)) === '["mmj-c-2"]' && JSON.stringify(n3.folderIds) === '[]' && !JSON.stringify(t).includes('Deep') && !JSON.stringify(n3).includes('mmj-c-3'), '129f switching a folder 👁 off removes it from t~0, and a note in it no longer lists it (rewritten)', JSON.stringify({ t: t.folders.map((f) => f.id), n3: n3.folderIds }));
      const m4 = cloud.log.length;
      await on(D, () => { const a = DB.articles.find((x) => x.id === 'm3'); a.updatedAt = new Date().toISOString(); DB.trash.push({ id: 'trx', type: 'article', item: JSON.parse(JSON.stringify(a)), at: a.updatedAt }); DB.articles.splice(DB.articles.indexOf(a), 1); persist(); });
      await run(D);
      check(JSON.stringify(pubLog(cloud, m4)) === '["' + nEnc('m3') + '"]' && pubDocs(cloud)[nEnc('m3')].gone === true, '129f a note sent to Trash is written once as gone', JSON.stringify(pubLog(cloud, m4)));
      const m5 = cloud.log.length;
      await on(D, () => { const f = DB.folders.find((x) => x.id === 'mmj-c-1'); f.name = 'renamed private'; f.updatedAt = new Date().toISOString(); persist(); });
      await run(D);
      check(pubLog(cloud, m5).length === 0, '129f renaming a PRIVATE folder writes nothing to pub', JSON.stringify(pubLog(cloud, m5)));
      const diag = await on(D, () => _syncDiagnosticsHTML());
      check(/Visitors&#39; copy|Visitors' copy|Visitors\\' copy/.test(diag) && /docs written/.test(diag), '129f the Cloud Sync diagnostics have a "Visitors\' copy" line', (diag.match(/Visitors[^]*?<\/tr>/) || [''])[0].replace(/<[^>]+>/g, ' ').slice(0, 200));
    }
    if (want('129l')) {
      /* the rules model: the owner's rule (only the owner under a notebook) + the one added rule, text taken from MMJ-SHARE.md */
      const md = fs.readFileSync(new URL('../MMJ-SHARE.md', import.meta.url), 'utf8');
      const m = /match \/notebooks\/\{nb\}\/pub\/\{doc=\*\*\} \{\s*allow read: if true;\s*\}/.exec(md);
      const owner = (path, auth) => auth === 'owner' && path.startsWith('notebooks/');
      const added = (path, op) => !!m && op === 'read' && /^notebooks\/[^/]+\/pub\/.+/.test(path);
      const can = (path, op, auth) => owner(path, auth) || added(path, op);
      const paths = [...cloud.store.keys()];
      const pubPaths = paths.filter((p) => p.includes('/pub/')), other = paths.filter((p) => !p.includes('/pub/')).concat(['mmj/t~0', 'mmjparts/n~x~g~0', 'mmjin/r1', 'pics/abc', 'picparts/abc~0', 'recs/articles~a1', 'remind/v1', 'pubx/t~0', 'pub'].map((x) => NB + '/' + x), [NB]);
      check(!!m && pubPaths.length > 3 && pubPaths.every((p) => can(p, 'read', 'none')) && other.length > 3 && other.every((p) => !can(p, 'read', 'none')) && pubPaths.every((p) => !can(p, 'write', 'none')) && other.every((p) => can(p, 'read', 'owner')),
        '129l rules model (s1-fake has no rules engine, so this is a stand-in): with the rule text from MMJ-SHARE.md, every pub path is readable without sign-in and not writable, every other path (mmj, recs, pics, mmjin…) is NOT readable without sign-in, and the owner keeps everything', JSON.stringify({ rule: !!m, pub: pubPaths.length, other: other.length }));
    }
    check(D.errors.length === 0, '129 no page errors on the one-device run', D.errors.slice(0, 2).join(' · '));
    await D.ctx.close();
  }

  /* ══ 129g — a device that has not read yet ══ */
  if (want('129g')) {
    const cloud = makeCloud();
    const S = await dev(cloud, 'S', VPS[2], pubSeed(), { holdQ: true });
    await sleep(1500);
    const caught = await on(S, () => !!_s1RdCaught);
    const from = cloud.log.length;
    const r1 = await run(S);
    check(!caught && pubLog(cloud, from).length === 0 && r1.why === 'wait', '129g a device that has not read yet writes nothing to pub (why = wait)', JSON.stringify({ caught, w: pubLog(cloud, from), r1 }));
    S.holdQ = false; for (const id of S.qsubs.keys()) cloud.deliverQ(S, id, true);
    const ok = await ready(S);
    await run(S);
    check(ok && pubLog(cloud, from).includes('t~0') && pubLog(cloud, from).includes(nEnc('m1')), '129g once it has read, the same device writes the visible set', JSON.stringify(pubLog(cloud, from)));
    await S.ctx.close();
  }

  /* ══ 129h — offline / hidden ══ */
  if (want('129h')) {
    const cloud = makeCloud();
    const D = await dev(cloud, 'H', VPS[2], pubSeed());
    await ready(D); await run(D);
    const m0 = cloud.log.length;
    await edit(D, 'm1', 'a.content+="<p>offline edit</p>"');
    await D.ctx.setOffline(true); D.offline = true; await sleep(300);
    const r1 = await run(D);
    const w1 = pubLog(cloud, m0);
    D.offline = false; await D.ctx.setOffline(false);
    check(w1.length === 0 && r1.why === 'offline', '129h offline: nothing is written to pub', JSON.stringify({ r1, w1 }));
    await sleep(300); await run(D);
    check(JSON.stringify(pubLog(cloud, m0)) === '["' + nEnc('m1') + '"]', '129h back online: it catches up with the one change', JSON.stringify(pubLog(cloud, m0)));
    const m1 = cloud.log.length;
    await edit(D, 'm1', 'a.content+="<p>hidden edit</p>"');
    await on(D, () => { Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true }); });
    const r2 = await run(D);
    const w2 = pubLog(cloud, m1);
    await on(D, () => { delete document.visibilityState; });
    check(w2.length === 0 && r2.why === 'hidden', '129h hidden: nothing is written', JSON.stringify({ r2, w2 }));
    await run(D);
    check(JSON.stringify(pubLog(cloud, m1)) === '["' + nEnc('m1') + '"]', '129h visible again: it catches up', JSON.stringify(pubLog(cloud, m1)));
    const m2 = cloud.log.length;
    await edit(D, 'm1', 'a.content+="<p>refused</p>"');
    cloud.refuse.push('/pub/');
    const r3 = await run(D);
    const ref = await on(D, () => ({ refused: _mpS.refused, txt: _mpStateText() }));
    cloud.refuse.length = 0;
    check(r3.err === 'permission-denied' && ref.refused >= 1 && /refused/.test(ref.txt) && D.errors.length === 0, '129h a refusal is shown only in the diagnostics: no toast, no page error', JSON.stringify({ r3, ref, errs: D.errors.slice(0, 2) }));
    await on(D, () => { _mpS.retryAt = 0; }); await run(D);
    check(JSON.stringify(pubLog(cloud, m2)) === '["' + nEnc('m1') + '"]', '129h after the refusal is lifted the change is written', JSON.stringify(pubLog(cloud, m2)));
    /* nothing switched on, nothing ever shared: nothing is written (not even an empty tree) */
    const cloud2 = makeCloud();
    const db2 = pubSeed(); db2.folders.forEach((f) => { delete f.vis; }); db2.articles.forEach((a) => { delete a.vis; });
    const E = await dev(cloud2, 'E', VPS[2], db2);
    await ready(E);
    const f2 = cloud2.log.length; await run(E);
    check(pubLog(cloud2, f2).length === 0, '129h nothing switched to 👁: pub is not written at all (no empty tree)', JSON.stringify(pubLog(cloud2, f2)));
    await E.ctx.close();
    await D.ctx.close();
  }

  /* ══ 129j — a big note in parts ══ */
  if (want('129j')) {
    const cloud = makeCloud();
    const db = pubSeed();
    let s = ''; for (let i = 0; s.length < 1500000; i++) s += 'Line ' + i + ' tafsīr ' + (i * 2654435761 % 1000003) + ' ✦ ';
    const big = '<p>' + s + '</p>';
    db.articles.push({ id: 'mbig', title: 'Big one', content: big, folderIds: ['mmj-c-2'], tags: [], createdAt: T0, updatedAt: T0, vis: 1 });
    const D = await dev(cloud, 'G', VPS[2], db);
    await ready(D);
    const from = cloud.log.length;
    await run(D);
    const nd = pubDocs(cloud)[nEnc('mbig')] || {};
    const parts = []; for (let i = 0; i < (nd.parts || 0); i++) { const v = cloud.store.get(`${NB}/pub/pubparts~${nEnc('mbig')}~${nd.g}~${i}`); parts.push(v ? v.d : null); }
    check(nd.parts >= 5 && !!nd.g && nd.content === '' && parts.every((p) => p != null) && parts.join('') === big, '129j a note over 700 KB: the doc names its parts (parts, g), the pieces in pub/pubparts~… rejoin to the content exactly', JSON.stringify({ parts: nd.parts, len: big.length, joined: parts.join('').length }));
    const order = cloud.log.slice(from).filter((o) => o.t === 'set').map((o) => o.p);
    const iDoc = order.indexOf(`${NB}/pub/${nEnc('mbig')}`), iLast = Math.max(...order.map((p, i) => p.includes('/pub/pubparts~') ? i : -1));
    check(iDoc > iLast && iLast >= 0 && ![...cloud.store.keys()].some((k) => k.includes('/mmjparts/')) || iDoc > iLast, '129j the pieces are written BEFORE the doc that names them, and inside pub (so the one rule covers them)', `doc@${iDoc} lastPart@${iLast}`);
    await edit(D, 'mbig', 'a.content+="<p>tail</p>"'); await run(D); await sleep(300);
    const left = [...cloud.store.keys()].filter((k) => k.includes('/pub/pubparts~')).length;
    check(left === cloud.store.get(`${NB}/pub/${nEnc('mbig')}`).parts, '129j after a rewrite the old generation\'s pieces are cleaned up', JSON.stringify({ left }));
    await D.ctx.close();
  }

  /* ══ 129k — the owner's scale ══ */
  if (want('129k')) {
    const cloud = makeCloud();
    const db = seedDB(T0);
    db.sections.push({ id: 'mmj-sec', name: 'Mapping My Journey', order: 1, updatedAt: T0 }); db.theme.mmjSync = false;   /* v05.79 · J130 */
    for (let i = 0; i < 1464; i++) db.folders.push({ id: 'mmj-f' + i, name: 'Place ' + i, parentId: i < 40 ? null : 'mmj-f' + (i % 40), order: i, sectionId: i < 40 ? 'mmj-sec' : undefined, updatedAt: T0, mmj: { n: 'x' }, ...(i % 29 === 0 ? { vis: 1 } : {}) });
    for (let i = 0; i < BIGN; i++) db.articles.push({ id: 'bn' + i, title: 'Bulk note ' + i, content: '<p>Body ' + i + ' lorem ipsum dolor sit amet</p>', folderIds: [i % 2 ? 'f1' : 'f2'], tags: [], createdAt: T0, updatedAt: T0, kind: 'general' });
    for (let i = 0; i < MMJN; i++) db.articles.push({ id: 'mm' + i, title: 'MMJ post ' + i, content: '<h1>Post ' + i + '</h1>' + ('<p>Mapping my journey paragraph lorem ipsum dolor sit amet consectetur. </p>').repeat(30 + (i % 10)), folderIds: ['mmj-f' + (40 + (i % 1400))], tags: ['mmj'], createdAt: T0, updatedAt: T0, kind: 'general', ...(i < VISN ? { vis: 1 } : {}) });
    const D = await dev(cloud, 'P', VPS[0], db, { throttle: 4 });
    const ok = await ready(D, 120000);
    await on(D, probeInstall);
    const from = cloud.log.length;
    const t0 = Date.now();
    const r = await run(D);
    const dt = Date.now() - t0;
    const lts = await on(D, probeRead, 0);
    const docs = pubDocs(cloud), keys = Object.keys(docs);
    const HL = hostLimit(200), worst = Math.max(0, ...lts.map((x) => x.app));
    check(ok && keys.length === VISN + 1 && r.err == null, `129k first run at the owner's scale (${BIGN} notes, ${MMJN} MMJ, ${VISN} visible, phone ×4): ${keys.length} docs (${VISN} notes + the tree) in ${(dt / 1000).toFixed(1)} s`, JSON.stringify({ ok, docs: keys.length, r }));
    check(worst <= HL.ms, `129k the first run has no long task over ${HL.text} (worst ${worst} ms, ${lts.length} long tasks)`, JSON.stringify(lts.slice(0, 6)));
    const mark = await on(D, () => performance.now());
    const m1 = cloud.log.length;
    await edit(D, 'mm7', 'a.content+="<p>one more</p>"');
    const t1 = Date.now(); await run(D); const dt1 = Date.now() - t1;
    const lts1 = await on(D, probeRead, mark), worst1 = Math.max(0, ...lts1.map((x) => x.app));
    check(JSON.stringify(pubLog(cloud, m1)) === '["' + nEnc('mm7') + '"]' && worst1 <= HL.ms, `129k a one-note edit writes 1 doc in ${dt1} ms with no long task over ${HL.text} (worst ${worst1} ms)`, JSON.stringify({ w: pubLog(cloud, m1), lts1: lts1.slice(0, 4) }));
    const m2 = cloud.log.length; const t2 = Date.now(); await run(D);
    check(pubLog(cloud, m2).length === 0, `129k a run with no change writes 0 docs (${Date.now() - t2} ms to find that out)`, '');
    const m3 = cloud.log.length;
    await edit(D, 'mm300', 'a.content+="<p>private edit</p>"'); const t3 = Date.now(); await run(D);
    check(pubLog(cloud, m3).length === 0, `129k editing a note that is NOT visible writes nothing to pub (${Date.now() - t3} ms)`, '');
    await D.ctx.close();
  }
} catch (e) {
  check(false, '129 the check ran without throwing', String(e && e.stack || e).slice(0, 600));
}
await browser.close(); await srv.close();
const bad = (await import('./s1-fake.mjs')).results.filter((x) => !x.ok).length;
const n = (await import('./s1-fake.mjs')).results.length;
console.log(`\n${n - bad}/${n} passed`);
process.exit(bad ? 1 : 0);
