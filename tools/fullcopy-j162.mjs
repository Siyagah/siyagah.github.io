#!/usr/bin/env node
/* tools/fullcopy-j162.mjs — v05.90, J162 (block 148): this Chromium refuses ONE IndexedDB record over ~128 MB, and the device's full copy ('notebook' in
   siyagah-local-v1) is one record — so a 157 MB notebook could not write its full copy: every checkpoint failed, the journal grew for ever and every start
   laid an ever-longer journal over an ever-older copy. From v05.90 a big copy is written in PIECES with a manifest written LAST. Checks 148a–148h:
   148a a 190 MB notebook checkpoints in pieces: the manifest's seq moves, the journal is cleaned, the old generation is swept, Diagnostics says so, and a
        reload shows every note, folder, section and Trash entry, compared record for record
   148b a kill (pkill -9, on the LJ_HOLD line, as 52d2) INSIDE the piece write (second batch, fourth batch, the manifest's own transaction) leaves a readable
        notebook — the old manifest and pieces plus the journal; the orphan pieces of the unfinished copy are on disk (proof the kill landed inside); the
        next checkpoint sweeps them
   148c a small notebook still writes ONE record (keys exactly 'notebook' + 'notebook-seq', no manifest), and it is DB itself, byte for byte
   148d a piece deleted, and a piece cut short: #idb-warn, no starter set, nothing written over the copy (keys, manifest and journal unchanged), the journal untouched
   148e the older build (v05.89's index.html, from git) opening a device written by v05.90 opens a notebook and loses nothing it held; v05.90 then still
        opens the newest one
   148f start time: v05.90 at 190 MB with a cleaned journal, against v05.89 (90 MB — the biggest it can write) with a 2,000-change journal. Reported, bounded
   148g a notebook small enough for one record that is not in journal mode (the non-journal save path) goes in pieces too when over the line — no "Local save failed"
   148h a stale manifest never beats a newer single record (a notebook that shrank back under the line)
   node tools/fullcopy-j162.mjs [--mb=190] [--only=148a,148c]    [--unpatched]: serves origin/main */
import { playwright, ROOT } from './harness.mjs';
import { check, results, sleep } from './s1-fake.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const arg = (k, d) => { const a = argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const MB = Number(arg('mb', 190));
const onlyArg = arg('only', ''); const onlySet = onlyArg ? new Set(onlyArg.split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t) || [...onlySet].some((o) => t.startsWith(o));
const note = (s) => console.log('  note  ' + s);
const git = (...a) => execFileSync('git', a, { encoding: 'buffer', maxBuffer: 1 << 28 });
function buildDir(ref) {
  const dir = mkdtempSync(join(tmpdir(), 'j162-build-'));
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), git('show', `${ref}:${f}`)); } catch {} }
  return dir;
}
/* v05.89's final index.html: the merge commit of PR #304 (found by its subject), checked by its own version meta */
function oldBuild() {
  let ref = '';
  try { ref = git('log', '--format=%H', '--grep=^Merge PR #304', '-1').toString().trim(); } catch {}
  for (const r of [ref, 'origin/main'].filter(Boolean)) {
    try { const html = git('show', `${r}:index.html`).toString(); if (/name="app-version" content="05\.89"/.test(html)) return { dir: buildDir(r), ref: r.slice(0, 8) }; } catch {}
  }
  return null;
}
/* IndexedDB belongs to an ORIGIN, port included: the older build has to be served on the very port the new one was, one after the other */
function serveAt(root, port = 0) {
  const server = createServer(async (req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    try { const body = await readFile(join(root, p)); res.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(body); }
    catch { res.writeHead(404); res.end('not found'); }
  });
  return new Promise((ok, no) => { server.on('error', no); server.listen(port, '127.0.0.1', () => ok({ port: server.address().port, base: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((d) => { try { server.closeAllConnections(); } catch {} server.close(d); }) })); });
}
const pw = await playwright();
const ROOTDIR = argv.includes('--unpatched') ? buildDir('origin/main') : ROOT;
let srv = await serveAt(ROOTDIR);
const browser = await pw.chromium.launch();
const BLOCK = ['**googleapis.com/**', '**gstatic.com/**', '**firebaseapp.com/**', '**firebaseio.com/**'];
const VP = { w: 1440, h: 900 };
const dirs = [];
const mk = (n) => { const d = mkdtempSync(join(tmpdir(), 'j162-' + n + '-')); dirs.push(d); return d; };
const killProfile = (dir) => { try { execFileSync('pkill', ['-9', '-f', '--', 'user-data-dir=' + dir]); } catch (e) { /* none left */ } };
const alive = (dir) => { try { execFileSync('pgrep', ['-f', '--', 'user-data-dir=' + dir], { stdio: 'pipe' }); return true; } catch (e) { return false; } };
const closeQuiet = (ctx) => Promise.race([ctx.close(), sleep(20000)]).catch(() => {});
/* a normal close (pagehide runs, the copy may be made) and then wait until every process of the profile is gone */
async function shut(o) {
  await Promise.race([o.ctx.close(), sleep(90000)]).catch(() => {});
  const t0 = Date.now(); while (alive(o.dir) && Date.now() - t0 < 90000) await sleep(100);
  if (alive(o.dir)) await killAndWait(o.dir, null);
}
async function killAndWait(dir, ctx) {
  const t0 = Date.now(); killProfile(dir);
  while (alive(dir) && Date.now() - t0 < 15000) { await sleep(25); killProfile(dir); }
  if (alive(dir)) throw new Error('the killed browser is still running after 15 s');
  if (ctx) await closeQuiet(ctx);
}
/* one browser process per profile directory, so IndexedDB survives a kill. opts.app=false: stop on a same-origin file (no app boot: raw IndexedDB only) */
async function open(dir, base, opts = {}) {
  const ctx = await browser.browserType().launchPersistentContext(dir, { args: ['--js-flags=--max-old-space-size=8192'], viewport: { width: VP.w, height: VP.h } });
  for (const p of BLOCK) await ctx.route(p, (r) => r.abort());
  const page = ctx.pages()[0] || await ctx.newPage(), errors = [], logs = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e));
  page.on('console', (m) => { logs.push(m.text().slice(0, 300)); if (m.type() === 'error' && !/net::ERR_FAILED/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
  page.on('dialog', (x) => x.accept().catch(() => {}));
  page.setDefaultTimeout(0);
  const t0 = Date.now();
  if (opts.app === false) { await page.goto(base + '/manifest.json'); return { ctx, page, errors, logs, ms: 0, dir }; }
  await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree'), null, { timeout: 600000 });
  const ms = Date.now() - t0;
  if (opts.joined !== false) await page.waitForFunction(() => typeof _idbBootFail === 'undefined' || !_idbBootFail, null, { timeout: 120000 });
  await page.waitForTimeout(300);
  await page.evaluate(SIG);
  return { ctx, page, errors, logs, ms, dir };
}
/* record-for-record: id -> hash of the record's own JSON, for the four lists a notebook is made of */
const SIGSRC = `() => { const h = (s) => { let a = 0x811c9dc5; for (let i = 0; i < s.length; i++) a = Math.imul(a ^ s.charCodeAt(i), 0x01000193); return (a >>> 0).toString(36) + ':' + s.length; };
  const o = {}; ['articles', 'folders', 'sections', 'trash'].forEach((c) => { o[c] = {}; (DB[c] || []).forEach((r, i) => { o[c][(r && r.id) || ('#' + i)] = h(JSON.stringify(r)); }); }); return o; }`;
const SIG = `window.__rec62=${SIGSRC};`;
const recs = (page) => page.evaluate(() => window.__rec62());
function diff(a, b) {
  const bad = [];
  for (const c of Object.keys(a)) {
    const ka = Object.keys(a[c]), kb = new Set(Object.keys(b[c] || {}));
    if (ka.length !== kb.size) bad.push(`${c}: ${ka.length} vs ${kb.size}`);
    for (const k of ka) if (b[c][k] !== a[c][k]) { bad.push(`${c}/${k}`); if (bad.length > 5) return bad; }
  }
  return bad;
}
/* raw IndexedDB (never opens a database that is not there: that would create an empty one) */
const RAW = `async () => {
  const have = (await indexedDB.databases()).map((d) => d.name);
  const o = (n) => new Promise((res, rej) => { const r = indexedDB.open(n); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const get = (db, k) => new Promise((res) => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(undefined); });
  const keys = (db) => new Promise((res) => { const q = db.transaction('kv').objectStore('kv').getAllKeys(); q.onsuccess = () => res(q.result); q.onerror = () => res([]); });
  const out = { keys: [], man: null, seq: null, jr: null };
  if (have.includes('siyagah-local-v1')) { const a = await o('siyagah-local-v1'); out.keys = (await keys(a)).map(String); const m = await get(a, 'notebook-pieces'); out.seq = (await get(a, 'notebook-seq')) ?? null; out.man = m ? { gen: m.gen, seq: m.seq, n: m.keys.length, keys: m.keys, chars: m.chars } : null; a.close(); }
  if (have.includes('siyagah-localrecs-v1')) { const j = await o('siyagah-localrecs-v1'); const jk = await keys(j); out.jr = { n: jk.length, hasM: jk.includes('m') }; j.close(); }
  return out; }`;
const raw = (page) => page.evaluate(`(${RAW})()`);
const orphans = (r) => r.keys.filter((k) => k.startsWith('nbp:') && !(r.man && r.man.keys.includes(k)));
const corrupt = (page, mode) => page.evaluate(`(async () => {
  const o = (n) => new Promise((res, rej) => { const r = indexedDB.open(n); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const db = await o('siyagah-local-v1'); const st = () => db.transaction('kv', 'readwrite').objectStore('kv');
  const m = await new Promise((res) => { const q = db.transaction('kv').objectStore('kv').get('notebook-pieces'); q.onsuccess = () => res(q.result); });
  const k = m.keys[Math.min(2, m.keys.length - 1)];
  if (${JSON.stringify(mode)} === 'delete') { await new Promise((res) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').delete(k); t.oncomplete = res; }); }
  else { const v = await new Promise((res) => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); }); v.s = v.s.slice(0, v.s.length - 7);
         await new Promise((res) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = res; }); }
  db.close(); return k; })()`);
/* seeds. n small notes (journal mode starts at 1,500) plus nBig notes of bigChars characters each */
const seed = (page, { n, nBig = 0, bigChars = 0 }) => page.evaluate(({ n, nBig, bigChars }) => {
  const t0 = Date.now() - 4e6, now = new Date().toISOString(), s = 'The quick brown fox jumps over the lazy dog. ';
  DB.sections = [{ id: 'sec-1', name: 'One', order: 0, updatedAt: now }, { id: 'sec-2', name: 'Two', order: 1, updatedAt: now }];
  DB.folders = [{ id: 'f1', name: '(001) A', parentId: null, order: 1, sectionId: 'sec-1', updatedAt: now }, { id: 'f2', name: '(002) B', parentId: null, order: 2, sectionId: 'sec-1', updatedAt: now }];
  DB.articles = []; DB.trash = []; DB.tombstones = [];
  for (let i = 0; i < n; i++) { const at = new Date(t0 + i * 400).toISOString(); DB.articles.push({ id: 'n' + i, title: 'Note ' + i, content: '<p>' + s.repeat(i % 7 === 0 ? 40 : 6) + i + '</p>', folderIds: [i % 3 ? 'f1' : 'f2'], tags: i % 5 ? [] : ['seed'], createdAt: at, updatedAt: at, kind: 'general' }); }
  for (let i = 0; i < nBig; i++) { const at = new Date(t0 + (n + i) * 400).toISOString(); DB.articles.push({ id: 'big' + i, title: 'Big ' + i, content: '<p>big ' + i + ' ' + 'abcdefghij'.repeat(bigChars / 10) + '</p>', folderIds: ['f1'], tags: [], createdAt: at, updatedAt: at, kind: 'general' }); }
  DB.trash.push({ id: 'tr1', type: 'article', deletedAt: now, item: { id: 'trashed1', title: 'Trashed', content: '<p>in the bin</p>', folderIds: ['f1'], tags: [], createdAt: now, updatedAt: now, kind: 'general' } });
  _seedThemeSnap(); _seedRecSnap(); persist(); _histReset();
  return DB.articles.length;
}, { n, nBig, bigChars });
const idle = (page) => page.evaluate(async () => { await _ljChain.catch(() => {}); await new Promise((r) => setTimeout(r, 80)); await _ljChain.catch(() => {}); while (_ljCkptBusy) await new Promise((r) => setTimeout(r, 100)); return true; });
const edit = (page, k, tag) => page.evaluate(({ k, tag }) => { for (let j = 0; j < 3; j++) { const a = DB.articles[(k * 37 + j * 101) % 900]; a.title += tag; a.updatedAt = new Date(Date.now() + k * 1000 + j).toISOString(); }
  DB.articles.push({ id: 'add-' + tag + k, title: 'Added ' + tag, content: '<p>added</p>', folderIds: ['f1'], tags: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), kind: 'general' }); persist(); }, { k, tag });
const checkpoint = (page) => page.evaluate(async () => { await _ljChain.catch(() => {}); _ljCheckpoint(); await new Promise((r) => setTimeout(r, 50)); while (_ljCkptBusy) await new Promise((r) => setTimeout(r, 100)); return true; });
const errsAll = [];
const guard = async (tag, fn) => { try { await fn(); } catch (e) { check(false, `${tag} threw: ${String(e && e.message || e).split('\n')[0]}`); } };

let D = null, dctx = null, haveBigLayout = false, bigRecs = null;
const BIGDIR = mk('big');

/* ══ 148a — 190 MB, in pieces ══ */
if (want('148a') || want('148b') || want('148f')) await guard('148a', async () => {
  let o = await open(BIGDIR, srv.base); dctx = o;
  const t0 = Date.now();
  const nBig = Math.round(MB / 2);
  const total = await seed(o.page, { n: 1600, nBig, bigChars: 2e6 }); await idle(o.page);
  const size = await o.page.evaluate(() => { let n = 0; DB.articles.forEach((a) => { n += a.content.length; }); return n; });
  note(`seeded ${total} notes, ${Math.round(size / 1048576)} MB of text, in ${Math.round((Date.now() - t0) / 1000)} s`);
  const r0 = await raw(o.page);
  check(size > 133169152, `148a the notebook is over the browser's limit for one record (${size} characters > 133169152)`);
  check(!!r0.man && r0.man.n >= 8 && !r0.keys.includes('notebook'), `148a the first full copy is written in pieces (${r0.man ? r0.man.n : 0} pieces, manifest seq ${r0.man && r0.man.seq}), and no single record is attempted`, JSON.stringify({ keys: r0.keys.length, seq: r0.seq }));
  haveBigLayout = !!r0.man;
  await edit(o.page, 1, '(a)'); await idle(o.page);
  const r1b = await raw(o.page);
  check(r1b.jr && r1b.jr.n > 1, `148a before the checkpoint the journal holds the change (${r1b.jr && r1b.jr.n - 1} entries)`);
  const t1 = Date.now(); await checkpoint(o.page); const ckMs = Date.now() - t1;
  const r1 = await raw(o.page);
  check(r1.man && r0.man && r1.man.seq > r0.man.seq, `148a the checkpoint moved the manifest's seq (${r0.man && r0.man.seq} -> ${r1.man && r1.man.seq}; ${r1.man ? r1.man.n : 0} pieces; ${Math.round(ckMs / 100) / 10} s)`);
  check(r1.jr && r1.jr.n === 1 && r1.jr.hasM, `148a the journal is cleaned (${r1.jr && r1.jr.n} entry left: the marker)`);
  check(r1.keys.filter((k) => k.startsWith('nbp:')).length === (r1.man ? r1.man.n : -1) && orphans(r1).length === 0, `148a the old generation's pieces were removed after the new manifest committed (${r1.keys.filter((k) => k.startsWith('nbp:')).length} pieces on disk, ${r1.man && r1.man.n} named)`);
  const dc = await o.page.evaluate(() => _dcText());
  check(/\d+ pieces, [\d.]+ MB, last written .*, journal holds 0 changes/.test(dc), `148a Diagnostics says it: "${dc}"`);
  const shown = await o.page.evaluate(async () => { openSyncModal(); await new Promise((r) => setTimeout(r, 400)); const t = document.getElementById('sync-diag'); return t ? t.innerText.replace(/\s+/g, ' ') : ''; });
  check(/Device copy/.test(shown), '148a the 🩺 Diagnostics panel shows a "Device copy" row', shown.slice(0, 200));
  bigRecs = await recs(o.page);
  await shut(o);   /* the page goes away the normal way: pagehide, then the copy is made again if anything is new */
  o = await open(BIGDIR, srv.base); dctx = o;
  const back = await recs(o.page);
  const d = diff(bigRecs, back);
  const mode = await o.page.evaluate(() => _pcStat.mode);
  check(d.length === 0 && mode === 'pieces', `148a a reload shows every note (${Object.keys(back.articles).length}), folder (${Object.keys(back.folders).length}), section (${Object.keys(back.sections).length}) and Trash entry (${Object.keys(back.trash).length}), record for record; layout read: ${mode}; boot ${Math.round(o.ms / 100) / 10} s`, d.join(' | '));
  errsAll.push(...o.errors.filter((e) => !/localStorage best-effort/.test(e)));
  await shut(o);
});

/* ══ 148b — a kill inside the piece write ══ */
if (want('148b')) await guard('148b', async () => {
  if (!haveBigLayout) { check(false, '148b needs the 148a layout (pieces) to be there'); return; }
  const cnt = { before: 0, after: 0 }, bad = [], proof = [];
  let o = await open(BIGDIR, srv.base), prevRecs = await recs(o.page), prev = await raw(o.page);
  for (const [i, hp] of [[1, 1], [2, 3], [3, 'm']]) {
    let held = null; const onLog = (m) => { if (m.text() === 'LJ_HOLD' && !held) held = Date.now(); }; o.page.on('console', onLog);
    await edit(o.page, 10 + i, '(k' + i); await idle(o.page);
    const after = await recs(o.page);
    await o.page.evaluate((hp) => { window.__ljHoldPiece = hp; window.__ljHold = 6000; _ljCheckpoint(); }, hp);
    const t0 = Date.now(); while (!held && Date.now() - t0 < 180000) await sleep(50);
    if (!held) bad.push(`trial ${i}: the checkpoint never reached the held transaction`);
    await killAndWait(BIGDIR, o.ctx);
    const rr = await open(BIGDIR, srv.base, { app: false });
    const st = await raw(rr.page); const orph = orphans(st);
    proof.push(`${hp === 'm' ? 'manifest tx' : 'batch ' + hp}: ${orph.length} unfinished pieces on disk, manifest still gen ${st.man && st.man.gen}`);
    if (!held) bad.push(`trial ${i}: no kill`);
    if (!(st.man && prev.man && st.man.gen === prev.man.gen)) bad.push(`trial ${i}: the manifest moved although the kill landed before its commit`);
    if (!orph.length) bad.push(`trial ${i}: no unfinished pieces on disk — the kill did not land inside the piece write`);
    await shut(rr);
    o = await open(BIGDIR, srv.base);
    const got = await recs(o.page); const toAfter = diff(after, got), toBefore = diff(prevRecs, got);
    if (!toAfter.length) cnt.after++; else if (!toBefore.length) cnt.before++; else bad.push(`trial ${i}: reopened as neither notebook: ${toAfter.slice(0, 3).join(',')}`);
    if (Object.keys(got.articles).length < Object.keys(prevRecs.articles).length) bad.push(`trial ${i}: FEWER notes`);
    prevRecs = got; prev = st;
  }
  check(bad.length === 0, `148b three kills inside the piece write (second batch, fourth batch, the manifest's transaction) each reopen as a complete notebook, never fewer notes (reopened as the journaled notebook ${cnt.after}, as the one before ${cnt.before}); ${proof.join(' · ')}`, bad.slice(0, 4).join(' | '));
  await checkpoint(o.page);
  const fin = await raw(o.page);
  check(orphans(fin).length === 0 && fin.man && fin.man.seq > prev.man.seq, `148b the next checkpoint swept the unfinished pieces (${orphans(fin).length} left) and moved the manifest`);
  errsAll.push(...o.errors.filter((e) => /pageerror|out of step/.test(e)));
  await shut(o);
});

/* ══ 148f — start time ══ */
if (want('148f')) await guard('148f', async () => {
  if (!haveBigLayout) { check(false, '148f needs the 148a layout (pieces) to be there'); return; }
  const t = [];
  for (let k = 0; k < 2; k++) { const o = await open(BIGDIR, srv.base); const n = await o.page.evaluate(() => DB.articles.length); t.push(o.ms); await shut(o); if (!n) throw new Error('no notes'); }
  const ob = oldBuild();
  let oldMs = null, oldJ = 0;
  if (ob) {
    const osrv = await serveAt(ob.dir), OD = mk('old');
    let o = await open(OD, osrv.base);
    await o.page.evaluate(() => { _LJ_CKPT_MS = 3e9; });
    await seed(o.page, { n: 2400, nBig: 45, bigChars: 2e6 }); await idle(o.page); await checkpoint(o.page);
    for (let k = 0; k < 2000; k++) { await o.page.evaluate((k) => { const a = DB.articles[k]; a.title += '.'; a.updatedAt = new Date(Date.now() + k).toISOString(); persist(); }, k); if (k % 250 === 0) await idle(o.page); }
    await idle(o.page);
    await killAndWait(OD, o.ctx);   /* killed, not closed: a normal close would make the full copy and clean the journal */
    const rr = await open(OD, osrv.base, { app: false }); oldJ = ((await raw(rr.page)).jr || {}).n - 1; await shut(rr);
    o = await open(OD, osrv.base); oldMs = o.ms; await shut(o); await osrv.close();
  }
  note(`start (page loaded to the first screen): v05.90, ${MB} MB in pieces, journal cleaned: ${t.map((x) => Math.round(x / 100) / 10).join(' s, ')} s · v05.89 (${ob ? ob.ref : 'not found'}), ~90 MB in one record, journal holding ${oldJ} changes: ${oldMs == null ? 'n/a' : Math.round(oldMs / 100) / 10 + ' s'}`);
  check(t.every((x) => x < 120000) && (!ob || oldJ >= 1900), `148f start at ${MB} MB with a cleaned journal: ${t.map((x) => Math.round(x / 100) / 10).join(' s, ')} s; v05.89 with a ${oldJ}-change journal at ~90 MB: ${oldMs == null ? 'n/a' : Math.round(oldMs / 100) / 10 + ' s'} (different sizes: v05.89 cannot write the bigger one at all)`);
});

/* ══ 148c — a small notebook: ONE record, as before ══ */
if (want('148c')) await guard('148c', async () => {
  const dir = mk('small'); const o = await open(dir, srv.base);
  await seed(o.page, { n: 1600 }); await idle(o.page); await edit(o.page, 1, '(c)'); await idle(o.page); await checkpoint(o.page);
  const r = await raw(o.page);
  check(r.man === null && JSON.stringify(r.keys.filter((k) => !k.startsWith('nbp:')).sort()) === JSON.stringify(['notebook', 'notebook-seq']) && !r.keys.some((k) => k.startsWith('nbp:')), '148c a small notebook writes exactly the single record and its seq (no manifest, no pieces)', JSON.stringify(r.keys));
  const same = await o.page.evaluate(async () => { const got = await _idbGet('notebook'); return { eq: JSON.stringify(got) === JSON.stringify(DB), keys: Object.keys(got).join() === Object.keys(DB).join(), seq: (await _idbGet('notebook-seq')) === _ljCkpt }; });
  check(same.eq && same.keys && same.seq, '148c the record is DB itself, byte for byte (same JSON, same key order), and notebook-seq holds the checkpoint\'s seq', JSON.stringify(same));
  const mode = await o.page.evaluate(() => _pcStat.mode); check(mode === 'one', `148c Diagnostics layout: ${mode}`);
  await shut(o);
});

/* a small notebook forced into pieces by the test hook (3 MB over a 1 MB line, 400,000-character pieces) */
async function piecesDevice(dir, base, n = 1600) {
  const o = await open(dir, base);
  await o.page.evaluate(() => { window.__pcMax = 1e6; window.__pcChunk = 4e5; });
  await seed(o.page, { n }); await idle(o.page); await edit(o.page, 2, '(p)'); await idle(o.page); await checkpoint(o.page);
  return o;
}

/* ══ 148d — a piece missing, a piece cut short ══ */
if (want('148d')) await guard('148d', async () => {
  for (const mode of ['delete', 'short']) {
    const dir = mk('d-' + mode); let o = await piecesDevice(dir, srv.base);
    const r0 = await raw(o.page); const sig0 = await recs(o.page);
    check(r0.man && r0.man.n >= 3, `148d(${mode}) setup: a pieces device (${r0.man && r0.man.n} pieces)`);
    await shut(o);
    let rr = await open(dir, srv.base, { app: false }); const k = await corrupt(rr.page, mode); const before = await raw(rr.page); await shut(rr);
    o = await open(dir, srv.base, { joined: false });
    await sleep(2500);
    const s = await o.page.evaluate(() => { const w = document.getElementById('idb-warn'); return { fail: _idbBootFail, ready: _idbReady, warn: !!w && w.offsetParent !== null, n: DB.articles.length, f: DB.folders.length, text: w ? w.innerText.slice(0, 120) : '' }; });
    await o.page.evaluate(() => { DB.theme.j162 = 1; _save(); persist(); }); await sleep(1500);
    const after = await raw(o.page);
    const same = JSON.stringify({ ...before, keys: before.keys.slice().sort() }) === JSON.stringify({ ...after, keys: after.keys.slice().sort() });
    check(s.fail && !s.ready && s.warn && s.n === 0 && s.f === 0, `148d(${mode}) piece ${k} ${mode === 'delete' ? 'missing' : 'cut short'}: the warning line shows, the starter set is NOT made, nothing is taken for the notebook (${s.n} notes, ${s.f} folders)`, JSON.stringify(s));
    check(same && !after.keys.includes('notebook'), `148d(${mode}) nothing was written over the copy: same keys, same manifest, same journal, no 'notebook' record made after a save was tried`, JSON.stringify({ b: before.keys.length, a: after.keys.length }));
    await shut(o);
    void sig0;
  }
});

/* ══ 148e — the older build opens a device the new one wrote ══ */
if (want('148e')) await guard('148e', async () => {
  const ob = oldBuild(); if (!ob) { check(false, '148e could not find v05.89\'s index.html in git'); return; }
  const dir = mk('e'); let o = await open(dir, srv.base);
  await seed(o.page, { n: 1600 }); await idle(o.page); await checkpoint(o.page);
  const first = await recs(o.page);   /* the last copy that fitted: the single record */
  await o.page.evaluate(() => { window.__pcMax = 1e6; window.__pcChunk = 4e5; });
  await o.page.evaluate(() => { for (let i = 0; i < 60; i++) DB.articles.push({ id: 'new' + i, title: 'New ' + i, content: '<p>made after</p>', folderIds: ['f1'], tags: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), kind: 'general' }); persist(); });
  await idle(o.page); await checkpoint(o.page);
  const newest = await recs(o.page), r = await raw(o.page);
  check(r.man && r.keys.includes('notebook'), '148e setup: the device holds both the older single record and the pieces', JSON.stringify(r.keys.length));
  await shut(o);
  const port = srv.port; await srv.close();
  const osrv = await serveAt(ob.dir, port);
  let old = await open(dir, osrv.base, { joined: false });
  const got = await recs(old.page); const lost = [];
  for (const c of Object.keys(first)) for (const id of Object.keys(first[c])) if (!(id in (got[c] || {}))) lost.push(c + '/' + id);
  check(Object.keys(got.articles).length >= 1600 && lost.length === 0, `148e v05.89 opens this device as a notebook of ${Object.keys(got.articles).length} notes and loses nothing the older record held (${lost.length} missing); it sees the last copy that fitted, not the ${Object.keys(newest.articles).length} of v05.90`, lost.slice(0, 3).join(','));
  errsAll.push(...old.errors.filter((e) => /pageerror/.test(e)));
  await shut(old); await osrv.close(); srv = await serveAt(ROOTDIR, port);
  o = await open(dir, srv.base);
  const again = await recs(o.page); const d = diff(newest, again);
  check(d.length === 0, `148e v05.90 then opens the device again with the newest notebook, all ${Object.keys(newest.articles).length} notes (older build ${ob.ref})`, d.join(' | '));
  await shut(o);
});

/* ══ 148g — the non-journal save path goes in pieces too ══ */
if (want('148g')) await guard('148g', async () => {
  const dir = mk('g'); let o = await open(dir, srv.base);
  await o.page.evaluate(() => { window.__pcMax = 1e6; window.__pcChunk = 4e5; });
  const n = await seed(o.page, { n: 40, nBig: 6, bigChars: 4e5 }); await sleep(2500);
  const r = await raw(o.page);
  const st = await o.page.evaluate(() => ({ lj: _ljOn, fail: _lsFail }));
  check(!st.lj && r.man && !r.keys.includes('notebook') && !st.fail, `148g a ${n}-note notebook (not in journal mode) over the line is saved in pieces (${r.man && r.man.n} pieces) and the ⚠ "Local save failed" alarm stays off`, JSON.stringify(st));
  const sig = await recs(o.page); await shut(o);
  o = await open(dir, srv.base); const d = diff(sig, await recs(o.page));
  check(d.length === 0, '148g a reload shows the same notebook, record for record', d.join(' | '));
  errsAll.push(...o.errors.filter((e) => /Local save failed/.test(e)));
  await shut(o);
});

/* ══ 148h — a stale manifest never beats a newer single record ══ */
if (want('148h')) await guard('148h', async () => {
  const dir = mk('h'); let o = await piecesDevice(dir, srv.base, 1600);
  await o.page.evaluate(() => { window.__pcMax = 1e9; });   /* the notebook "shrinks" under the line: the next copy is a single record */
  await edit(o.page, 5, '(h)'); await idle(o.page); await checkpoint(o.page);
  const r = await raw(o.page); const sig = await recs(o.page);
  check(r.man === null && r.keys.includes('notebook') && !r.keys.some((k) => k.startsWith('nbp:')), '148h the single record replaced the manifest in the same transaction; the pieces were swept', JSON.stringify(r.keys.length));
  await shut(o);
  o = await open(dir, srv.base); const d = diff(sig, await recs(o.page));
  check(d.length === 0, '148h a reload shows the newest notebook (the single record, not an older manifest)', d.join(' | '));
  await shut(o);
});

check(errsAll.length === 0, '148 no page errors, no "Local save failed", no journal out of step', errsAll.slice(0, 3).join(' · '));
await browser.close(); srv.close && srv.close();
for (const d of dirs) { killProfile(d); try { rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {} }
const fails = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - fails}/${results.length} passed${fails ? ', ' + fails + ' FAILED' : ''}`);
process.exit(fails ? 1 : 0);
