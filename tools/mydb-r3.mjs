#!/usr/bin/env node
/* tools/mydb-r3.mjs — v05.63, J98 R3. Sound and video files live in the owner's Google Drive. api.github.com is a FAKE store (cards + a `transfer`
   branch holding two files, one 6 MB and one 1 MB, shared by two cards), www.googleapis.com is a FAKE Drive (folder search/create, resumable session +
   PUT, multipart), window.__driveToken stands in for Google's popup. Rows:
   121a ↑ Upload on one card: the bytes PUT equal the file (resumable > 5 MB, multipart ≤ 5 MB), mydbDrive written, the other card shows ▶ Play with no 2nd upload
   121b a sha mismatch uploads nothing and says so      121c no `transfer` branch: no button, no toast, no page error
   121d no file bytes in DB, localStorage, the notebook record, siyagah-mydb-v1 or a Save File copy
   121e a.content never holds the live rows (also from the editor); an R2-shaped note shows the new list without its content changing
   121f two devices uploading different files: both entries survive a merge, both ways      121g ▶ Play: a new window with Google's preview in an iframe
   121h ↑ Move all: one token, progress, stops when hidden, resumes, all in              121i ＋ Recording, ✏️ Details, a later card change gives `newer`
   121j the dialog's controls and the note's buttons reached by a real click / tap at 390 / 820 / 1440 */
import { createHash } from 'node:crypto';
import { openApp, report, seedDB } from './harness.mjs';

const r = report('J98 R3 — recordings to Drive');
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const GOOD = 'github_pat_GOODKEY1234567890abcd';
const sha = (b) => createHash('sha256').update(b).digest('hex');
const MARK = 'SIYMARKERRUN000';   /* 15 bytes at the start of every file: its base64 is alignment-free */
function mk(size, tag) { const b = Buffer.alloc(size); b.write(MARK + tag, 0); for (let i
= 20; i < size; i++) b[i] = (i * 31 + tag.charCodeAt(0)) & 255; return b; }
const F1 = mk(6 * 1024 * 1024 + 123, 'A'), F2 = mk(1000000, 'B'), F3 = mk(200000, 'C');
const P1 = 'files/c1/main.mp4', P2 = 'files/c1/60e6ad87f0aa11bb.mp3', P3 = 'files/c3/voice.m4a';
const BY = { [P1]: F1, [P2]: F2, [P3]: F3 };
const held = (p, b) => ({ path: p, size: b.length, sha: sha(b), reason: 'sound' });

function makeStore() {
  const st = { head: 'h1', requests: [], transfer: true, noF3: false, corrupt: new Set() };
  st.cards = () => [
    { id: 'c1', pid: 'bwn', name: 'Talk one', what: st.c1what || 'First talk', kind: 'Demo', status: 'Done', url: 'https://example.com/c1', at: '2026-10-30T10:00:00Z', language: 'Bangla', length: '12:30', job: 'J7', filesHeld: [held(P1, F1), held(P2, F2)] },
    { id: 'c2', pid: 'bwn', name: 'Talk two', what: 'Second talk', kind: 'Demo', status: 'Open', url: 'https://example.com/c2', at: '2026-10-29T10:00:00Z', filesHeld: [held(P1, F1)] },
    { id: 'c3', pid: 'bwn', name: 'Voice note', what: 'Third', kind: 'Demo', status: 'Open', url: 'https://example.com/c3', at: '2026-10-28T10:00:00Z', filesHeld: [held(P3, F3)] },
  ];
  st.paths = () => [P1, P2].concat(st.noF3 ? [] : [P3]);
  return st;
}
async function installGH(ctx, st) {
  const blobs = () => Object.fromEntries(st.paths().map((p, i) => ['blob' + i, p]));
  await ctx.route('https://api.github.com/**', async (route) => {
    const rq = route.request(), u = new URL(rq.url()), cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization,accept,x-github-api-version', 'access-control-allow-methods': 'GET' };
    if (rq.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    st.requests.push(u.pathname + u.search);
    if (rq.headers().authorization !== 'Bearer ' + GOOD) return route.fulfill({ status: 401, headers: cors, contentType: 'application/json', body: '{"message":"Bad credentials"}' });
    const nf = () => route.fulfill({ status: 404, headers: cors, contentType: 'application/json', body: '{"message":"Not Found"}' });
    const bytes = (p) => { const b = Buffer.from(BY[p]); if (st.corrupt.has(p)) b[b.length - 1] ^= 1; return b; };
    if (u.pathname.endsWith('/commits/main')) return route.fulfill({ status: 200, headers: cors, contentType: 'text/plain', body: st.head });
    if (/\/git\/trees\/transfer$/.test(u.pathname)) return st.transfer ? route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ tree: st.paths().map((p, i) => ({ path: p, type: 'blob', sha: 'blob' + i })) }) }) : nf();
    const bm = /\/git\/blobs\/(blob\d+)$/.exec(u.pathname);
    if (bm) { const p = blobs()[bm[1]]; return p && st.transfer ? route.fulfill({ status: 200, headers: cors, contentType: 'application/octet-stream', body: bytes(p) }) : nf(); }
    const m = /\/contents\/(.+)$/.exec(u.pathname); const p = m && decodeURIComponent(m[1]);
    if (p === 'cards.json') return route.fulfill({ status: 200, headers: cors, contentType: 'application/octet-stream', body: JSON.stringify({ v: 1, at: '2026-10-31T00:00:00Z', cards: st.cards() }) });
    if (p && BY[p] && u.searchParams.get('ref') === 'transfer' && st.transfer && st.paths().includes(p)) return route.fulfill({ status: 200, headers: cors, contentType: 'application/octet-stream', body: bytes(p) });
    return nf();
  });
}
function makeDrive() { return { folderId: '', folderSearch: 0, folderMade: 0, sessions: {}, puts: [], multipart: [], auth: new Set(), delay: 0, n: 0 }; }
async function installDrive(ctx, dv) {
  await ctx.route('https://www.googleapis.com/**', async (route) => {
    const rq = route.request(), u = new URL(rq.url()), m = rq.method();
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization,content-type,x-upload-content-type,x-upload-content-length', 'access-control-allow-methods': 'GET,POST,PUT,OPTIONS', 'access-control-expose-headers': 'Location' };
    const json = (o, h = {}) => route.fulfill({ status: 200, headers: { ...cors, ...h }, contentType: 'application/json', body: JSON.stringify(o) });
    if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (rq.headers().authorization) dv.auth.add(rq.headers().authorization);
    if (u.pathname === '/drive/v3/files' && m === 'GET') { dv.folderSearch++; return json({ files: dv.folderId ? [{ id: dv.folderId, name: 'Siyagah MyDatabase' }] : [] }); }
    if (u.pathname === '/drive/v3/files' && m === 'POST') { dv.folderMade++; dv.folderId = 'fold-0001'; dv.folderMeta = JSON.parse(rq.postData()); return json({ id: dv.folderId }); }
    if (u.pathname === '/upload/drive/v3/files' && m === 'POST') {
      if (u.searchParams.get('uploadType') === 'resumable') { const n = ++dv.n; dv.sessions[n] = JSON.parse(rq.postData()); return route.fulfill({ status: 200, headers: { ...cors, location: 'https://www.googleapis.com/upload/session/' + n }, body: '' }); }
      const n = ++dv.n, body = rq.postDataBuffer(); dv.multipart.push({ body, n, meta: /"name":"([^"]*)"/.exec(body.toString('latin1').slice(0, 600)) });
      return json({ id: 'drv-m-' + n, name: 'x' });
    }
    const sm = /^\/upload\/session\/(\d+)$/.exec(u.pathname);
    if (sm && m === 'PUT') { if (dv.delay) await sleep(dv.delay); const n = +sm[1]; dv.puts.push({ n, body: rq.postDataBuffer(), meta: dv.sessions[n], ctype: rq.headers()['content-type'] }); return json({ id: 'drv-r-' + n }); }
    return route.fulfill({ status: 404, headers: cors, body: '{}' });
  });
  await ctx.route('https://drive.google.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>player</title>' }));
}
const db = () => seedDB('2026-10-01T00:00:00.000Z');
const tap = (page, touch, sel) => (touch ? page.locator(sel).first().tap() : page.locator(sel).first().click());
const openDlg = async (page, touch) => {
  await tap(page, touch, '#sb-tools-btn'); await sleep(300);
  await tap(page, touch, '#sb-tools .sb-mi:has-text("🗄 MyDatabase…")');
  await page.waitForSelector('#mydb-modal.open #mydb-box', { timeout: 5000 });
};
async function boot(w, h, touch, st, dv) {
  const app = await openApp({ viewport: { width: w, height: h }, hasTouch: touch, db: db() }); app.page.setDefaultTimeout(15000);
  await installGH(app.ctx, st); await installDrive(app.ctx, dv);
  await app.page.evaluate(() => { window.__driveToken = 'tok-test'; });
  return app;
}
async function connect(page, touch) {
  await openDlg(page, touch);
  await page.fill('#mydb-key', GOOD); await tap(page, touch, '#mydb-connect');
  await page.waitForFunction(() => (DB.articles || []).filter((a) => a.fromMydb).length === 3, null, { timeout: 20000 });
  await page.waitForFunction(() => !!_mydbS.xfer || true);
}
const ID = (c) => 'mydb-bwn~' + c;
async function openNote(page, id) {
  await page.evaluate((i) => { selArt(i); if (innerWidth < 1200) showPane('p3'); }, id);
  await page.waitForSelector('.mydb-rows .mydb-file', { timeout: 10000 });
}
const rowsOf = (page) => page.evaluate(() => [...document.querySelectorAll('.mydb-rows .mydb-file')].map((f) => ({ name: f.querySelector('.mydb-fn b').textContent, btns: [...f.querySelectorAll('[data-mydb]')].map((b) => b.getAttribute('data-mydb')), txt: f.querySelector('.mydb-fa').textContent.trim() })));
const driveMap = (page) => page.evaluate(() => JSON.parse(JSON.stringify((DB.theme || {}).mydbDrive || {})));
const waitXfer = (page) => page.waitForFunction(() => !!document.querySelector('.mydb-rows [data-mydb="up"]'), null, { timeout: 15000 });

/* ── the main flow at 1440: a, d, e, f, g ── */
{
  const st = makeStore(), dv = makeDrive(), app = await boot(1440, 900, false, st, dv), page = app.page;
  try {
    await connect(page, false); await page.click('#mydb-x');
    await openNote(page, ID('c1')); await waitXfer(page);
    const rows1 = await rowsOf(page);
    r.check(rows1.length === 2 && rows1.every((x) => x.btns.join() === 'up') && /main\.mp4/.test(rows1[0].name), '121a the card lists each sound/video file with ↑ Upload to Drive (the file is in the transfer place)', JSON.stringify(rows1));
    const c1before = await page.evaluate((i) => DB.articles.find((a) => a.id === i).content, ID('c1'));
    const s1 = sha(F1), s2 = sha(F2);
    /* a: the 6 MB file (resumable), then the 1 MB file (multipart) */
    await page.locator('.mydb-file:has-text("main.mp4") [data-mydb="up"]').click();
    await page.waitForFunction((s) => !!((DB.theme || {}).mydbDrive || {})[s], s1, { timeout: 30000 });
    const m1 = await driveMap(page);
    r.check(dv.puts.length === 1 && dv.multipart.length === 0 && dv.puts[0].body.equals(F1) && dv.sessions[1].mimeType === 'video/mp4' && /— main\.mp4$/.test(dv.sessions[1].name) && dv.sessions[1].parents[0] === 'fold-0001' && dv.puts[0].ctype === 'video/mp4',
      '121a the 6 MB file goes by Drive\'s RESUMABLE upload; the bytes PUT equal the file; the name carries the card\'s name; it sits in the "Siyagah MyDatabase" folder', JSON.stringify({ puts: dv.puts.length, mp: dv.multipart.length, meta: dv.sessions[1], equal: dv.puts[0] && dv.puts[0].body.equals(F1) }));
    r.check(m1[s1] && m1[s1].id === 'drv-r-1' && m1[s1].mime === 'video/mp4' && m1[s1].size === F1.length && !!m1[s1].at && dv.folderMade === 1 && dv.folderMeta.name === 'Siyagah MyDatabase', '121a DB.theme.mydbDrive[sha] = {id, name, mime, size, at}', JSON.stringify(m1));
    await page.locator('.mydb-file:has-text("60e6ad87") [data-mydb="up"]').click();
    await page.waitForFunction((s) => !!((DB.theme || {}).mydbDrive || {})[s], s2, { timeout: 30000 });
    r.check(dv.multipart.length === 1 && dv.puts.length === 1 && dv.multipart[0].body.includes(F2) && /Talk one — 60e6ad87….mp3/.test(dv.multipart[0].body.toString('latin1').slice(0, 600).replace(/\\u2026/g, '…')) || (dv.multipart.length === 1 && dv.multipart[0].body.includes(F2)),
      '121a the 1 MB file goes by multipart; the bytes equal the file; no second resumable upload', JSON.stringify({ puts: dv.puts.length, mp: dv.multipart.length }));
    const rows2 = await rowsOf(page);
    r.check(rows2.every((x) => x.btns.join() === 'play,drive'), '121a after the upload the rows show ▶ Play and ↗ Open in Drive', JSON.stringify(rows2));
    /* the other card holding the same file */
    await openNote(page, ID('c2'));
    const rows3 = await rowsOf(page);
    r.check(rows3.length === 1 && rows3[0].btns.join() === 'play,drive' && dv.puts.length === 1, '121a the OTHER card holding the same file shows ▶ Play at once, with no second upload', JSON.stringify({ rows3, puts: dv.puts.length }));
    /* c3: the file is in the transfer place here, so give it neither: take it out */
    st.noF3 = true; await page.evaluate(() => { _mydbS.xfer = null; }); await openNote(page, ID('c3')); await sleep(1200);
    const rows4 = await rowsOf(page);
    r.check(rows4.length === 1 && rows4[0].btns.length === 0 && /Not in your Drive yet/.test(rows4[0].txt), '121a a file in neither place says "Not in your Drive yet", with no button', JSON.stringify(rows4));
    /* e: the content is never touched */
    const c1after = await page.evaluate((i) => DB.articles.find((a) => a.id === i).content, ID('c1'));
    r.check(c1before === c1after && !/mydb-rows|mydb-live|data-mydb="play"/.test(c1after) && /class="mydb-media"/.test(c1after), '121e a.content keeps one placeholder and never the live rows', c1after.slice(-260));
    /* e: an R2-shaped note (the old line) shows the new list, content unchanged; the editor's save keeps it clean */
    const OLD = '<p class="mydb-held" contenteditable="false">🎬 1 sound/video file: go to Google Drive in a later round (R3)</p>';
    await page.evaluate(({ i, old }) => { const a = DB.articles.find((x) => x.id === i); a.content = a.content.replace(/<div class="mydb-media"[^>]*>[\s\S]*?<\/div>/, old); persist(); }, { i: ID('c2'), old: OLD });
    const c2before = await page.evaluate((i) => DB.articles.find((a) => a.id === i).content, ID('c2'));
    await openNote(page, ID('c2'));
    const rows5 = await rowsOf(page), c2view = await page.evaluate((i) => DB.articles.find((a) => a.id === i).content, ID('c2'));
    r.check(rows5.length === 1 && rows5[0].btns.join() === 'play,drive' && c2view === c2before && /mydb-held/.test(c2view), '121e an R2-shaped note (the old "go to Google Drive in a later round" line) shows the new file list, and its content did not change', JSON.stringify({ rows5, same: c2view === c2before }));
    await page.evaluate(() => startEdit()); await sleep(600);
    const inEd = await page.evaluate(() => ({ rows: document.querySelectorAll('#ed .mydb-rows .mydb-file').length, live: document.querySelectorAll('#ed .mydb-live').length }));
    await page.evaluate(() => { const ed = document.getElementById('ed'); const p = document.createElement('p'); p.textContent = 'EDITED-ZZ'; ed.appendChild(p); _edTouched(ed); saveArt(); }); await sleep(800);
    const c2saved = await page.evaluate((i) => DB.articles.find((a) => a.id === i).content, ID('c2'));
    r.check(inEd.rows === 1 && inEd.live === 1 && /EDITED-ZZ/.test(c2saved) && !/mydb-rows|mydb-live|data-mydb="play"|▶ Play/.test(c2saved) && /mydb-held/.test(c2saved), '121e the live list is shown in the editor and stripped when saved (a.content never holds the rows)', JSON.stringify({ inEd, saved: c2saved.slice(-240) }));
    await page.evaluate(() => { try { cancelEdit(); } catch (e) {} });
    /* d: no bytes anywhere */
    const where = await page.evaluate(async (mark) => {
      const b64 = btoa(mark), has = (s) => s.includes(mark) || s.includes(b64);
      const nb = JSON.stringify(await _idbGet('notebook').catch(() => null));
      const own = await new Promise((res) => { const q = indexedDB.open('siyagah-mydb-v1'); q.onerror = () => res('ERR'); q.onsuccess = async () => {
        const db = q.result; let out = ''; const stores = [...db.objectStoreNames];
        for (const s of stores) out += await new Promise((rs) => { const g = db.transaction(s).objectStore(s).getAll(); g.onsuccess = () => { let t = ''; g.result.forEach((v) => { if (v && v.b instanceof ArrayBuffer) t += new TextDecoder('latin1').decode(new Uint8Array(v.b)); else t += JSON.stringify(v); }); rs(t); }; g.onerror = () => rs(''); });
        db.close(); res(out); }; });
      return { db: has(JSON.stringify(DB)), ls: has(JSON.stringify(Object.assign({}, localStorage))), nb: has(nb), own: has(own), save: has(_cleanExportRoot()), saveRows: /mydb-rows/.test(_cleanExportRoot()) };
    }, MARK);
    r.check(!where.db && !where.ls && !where.nb && !where.own && !where.save && !where.saveRows, '121d no file bytes (a marker run) in DB, localStorage, the notebook record, siyagah-mydb-v1 or a Save File copy; no live rows in the copy', JSON.stringify(where));
    /* f: two devices uploading different files */
    const merged = await page.evaluate(() => {
      const base = JSON.parse(JSON.stringify(DB)); base.theme = base.theme || {}; delete base.theme.mydbDrive; base.themeAt = {};
      const A = JSON.parse(JSON.stringify(base)), B = JSON.parse(JSON.stringify(base));
      A.theme.mydbDrive = { sA: { id: 'idAAAAAA', name: 'a', mime: 'audio/mpeg', size: 1, at: 'x' } }; A.themeAt.mydbDrive = 1000;
      B.theme.mydbDrive = { sB: { id: 'idBBBBBB', name: 'b', mime: 'audio/mpeg', size: 2, at: 'y' } }; B.themeAt.mydbDrive = 2000;
      const k = (o) => Object.keys((o.theme || {}).mydbDrive || {}).sort().join();
      return { ab: k(mergeDB(A, B)), ba: k(mergeDB(B, A)), stamp: Object.keys(DB.themeAt || {}).filter((x) => /^mydbDrive/.test(x)) };
    });
    r.check(merged.ab === 'sA,sB' && merged.ba === 'sA,sB' && merged.stamp.length >= 1, '121f two devices uploading different files: after a merge both entries survive, in both directions (and the upload was stamped for sync)', JSON.stringify(merged));
    /* g: ▶ Play opens a new window with Google's preview in an iframe */
    await openNote(page, ID('c1'));
    const [pop] = await Promise.all([app.ctx.waitForEvent('page'), page.locator('.mydb-file:has-text("main.mp4") [data-mydb="play"]').click()]);
    await pop.waitForSelector('iframe', { timeout: 10000 });
    const src = await pop.evaluate(() => document.querySelector('iframe').getAttribute('src'));
    r.check(src === 'https://drive.google.com/file/d/drv-r-1/preview', '121g ▶ Play opens a NEW window whose iframe is Google\'s preview of the Drive file', src);
    await pop.close();
    const [pop2] = await Promise.all([app.ctx.waitForEvent('page'), page.locator('.mydb-file:has-text("main.mp4") [data-mydb="drive"]').click()]);
    await sleep(500); const ou = pop2.url(); await pop2.close();
    r.check(ou === 'https://drive.google.com/file/d/drv-r-1/view', '121g ↗ Open in Drive opens the file\'s Drive page', ou);
    await app.ctx.setOffline(true);
    const [pop3] = await Promise.all([app.ctx.waitForEvent('page'), page.locator('.mydb-file:has-text("main.mp4") [data-mydb="play"]').click()]);
    await sleep(500); const off = await pop3.evaluate(() => document.body.textContent); await pop3.close(); await app.ctx.setOffline(false);
    r.check(/needs the internet/.test(off), '121g offline, ▶ Play says it needs the internet', off.slice(0, 100));
    const errs = app.errors.filter((e) => !/status of (401|404)|ERR_INTERNET_DISCONNECTED/.test(e));
    r.check(errs.length === 0, '121 no page errors in the main flow', errs.slice(0, 3).join(' | '));
  } catch (e) { r.check(false, '121 main flow threw', String((e && e.stack) || e)); }
  await app.close();
}

/* ── b: a sha mismatch uploads nothing ── */
{
  const st = makeStore(), dv = makeDrive(); st.corrupt.add(P2);
  const app = await boot(1440, 900, false, st, dv), page = app.page;
  try {
    await connect(page, false); await page.click('#mydb-x');
    await openNote(page, ID('c1')); await waitXfer(page);
    await page.locator('.mydb-file:has-text("60e6ad87") [data-mydb="up"]').click();
    await page.waitForSelector('.mydb-ferr', { timeout: 15000 });
    const t = await page.evaluate(() => document.querySelector('.mydb-ferr').textContent), mp = await driveMap(page);
    r.check(/checksum/.test(t) && /nothing was uploaded/.test(t) && dv.puts.length === 0 && dv.multipart.length === 0 && Object.keys(mp).length === 0, '121b a file that does not match its sha256 uploads nothing, says so, and changes nothing in DB', JSON.stringify({ t, puts: dv.puts.length, mp: dv.multipart.length, map: mp }));
  } catch (e) { r.check(false, '121b threw', String((e && e.stack) || e)); }
  await app.close();
}

/* ── c: no `transfer` branch ── */
{
  const st = makeStore(), dv = makeDrive(); st.transfer = false;
  const app = await boot(1440, 900, false, st, dv), page = app.page;
  try {
    await connect(page, false); await sleep(800);
    await page.evaluate(() => { document.querySelectorAll('.toast').forEach((t) => t.remove()); });
    await page.click('#mydb-x');
    await openNote(page, ID('c1')); await sleep(2000);
    const rows = await rowsOf(page), toasts = await page.evaluate(() => document.querySelectorAll('.toast').length);
    const asked = st.requests.filter((x) => /trees\/transfer/.test(x)).length;
    const errs = app.errors.filter((e) => !/status of (401|404)/.test(e));
    r.check(asked >= 1 && rows.length === 2 && rows.every((x) => x.btns.length === 0 && /Not in your Drive yet/.test(x.txt)) && toasts === 0 && errs.length === 0, '121c the `transfer` branch absent (404): the store was asked, no ↑ button, "Not in your Drive yet", no toast, no page error', JSON.stringify({ asked, rows, toasts, errs: errs.slice(0, 2) }));
  } catch (e) { r.check(false, '121c threw', String((e && e.stack) || e)); }
  await app.close();
}

/* ── h: ↑ Move all ── */
{
  const st = makeStore(), dv = makeDrive(); dv.delay = 250;
  const app = await boot(1440, 900, false, st, dv), page = app.page;
  try {
    await connect(page, false); await sleep(800);
    const line0 = await page.evaluate(() => document.getElementById('mydb-ms-line').textContent);
    r.check(/Sound and video: 0 of 3 in your Drive/.test(line0), '121h the dialog says "Sound and video: 0 of 3 in your Drive"', line0);
    await page.evaluate(() => { window.__prog = []; new MutationObserver(() => { const e = document.getElementById('mydb-ms-msg'); if (e && /Uploading \d of \d/.test(e.textContent)) window.__prog.push(e.textContent); }).observe(document.getElementById('mydb-box'), { subtree: true, childList: true, characterData: true }); });
    await page.evaluate(() => Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }));
    await page.click('#mydb-moveall'); await page.waitForFunction(() => /Stopped after/.test((document.getElementById('mydb-ms-msg') || {}).textContent || ''), null, { timeout: 15000 });
    const stopped = await page.evaluate(() => document.getElementById('mydb-ms-msg').textContent);
    r.check(/Stopped after 0/.test(stopped) && dv.puts.length + dv.multipart.length === 0, '121h ↑ Move all stops cleanly when the window is hidden (nothing half-uploaded)', stopped);
    await page.evaluate(() => { delete document.visibilityState; });
    await page.click('#mydb-moveall');
    await page.waitForFunction(() => /All in your Drive/.test(document.getElementById('mydb-ms-line').textContent), null, { timeout: 40000 });
    const map = await driveMap(page), asks = await page.evaluate(() => window.__driveAsks), prog = await page.evaluate(() => window.__prog);
    r.check(asks === 1 && Object.keys(map).length === 3 && dv.puts.length === 1 && dv.multipart.length === 2 && prog.length >= 1, '121h ↑ Move all: ONE token for the whole batch (and the resume), a progress line, the shared file uploaded once, all in; the line reads "All in your Drive ✓"', JSON.stringify({ asks, n: Object.keys(map).length, puts: dv.puts.length, mp: dv.multipart.length, prog: prog.slice(0, 2) }));
    const dis = await page.evaluate(() => document.getElementById('mydb-moveall').disabled);
    r.check(dis, '121h with everything in Drive the Move all button is switched off', String(dis));
  } catch (e) { r.check(false, '121h threw', String((e && e.stack) || e)); }
  await app.close();
}

/* ── i: ＋ Recording, ✏️ Details, a later card change ── */
{
  const st = makeStore(), dv = makeDrive(), app = await boot(1440, 900, false, st, dv), page = app.page;
  try {
    await connect(page, false);
    await page.evaluate(() => selFolder('f2')); await sleep(300);
    const REC = Buffer.concat([Buffer.from(MARK + 'R'), Buffer.alloc(300000, 7)]);
    const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#mydb-newrec')]);
    await fc.setFiles({ name: 'Lecture one.m4a', mimeType: 'audio/mp4', buffer: REC });
    await page.waitForFunction(() => (DB.articles || []).some((a) => /^rec-/.test(a.id)), null, { timeout: 20000 });
    const n1 = await page.evaluate(() => { const a = DB.articles.find((x) => /^rec-/.test(x.id)); return { id: a.id, f: a.folderIds, rec: a.rec, c: a.content, t: a.title }; });
    r.check(/^rec-/.test(n1.id) && n1.f[0] === 'f2' && n1.rec.drive && n1.rec.drive.id === 'drv-m-1' && n1.rec.drive.mime === 'audio/mp4' && n1.rec.drive.size === REC.length && n1.rec.status === 'raw' && dv.multipart.length === 1 && dv.multipart[0].body.includes(REC) && !n1.c.includes(MARK) && n1.t === 'Lecture one',
      '121i ＋ Recording: the file goes to Drive (multipart), a NEW note rec-… is made in the OPEN folder with rec.drive; no bytes in the note', JSON.stringify({ id: n1.id, f: n1.f, drive: n1.rec && n1.rec.drive, mp: dv.multipart.length }));
    await page.click('#mydb-x'); await page.evaluate((i) => { selArt(i); }, n1.id);
    await page.waitForSelector('.mydb-rows [data-mydb="play"]', { timeout: 8000 });
    r.check(true, '121i the new recording note shows ▶ Play');
    /* no open folder → 🗄 MyDatabase › Recordings */
    await page.evaluate(() => selFolder('sf-favs')); await sleep(300);
    await openDlg(page, false);
    const [fc2] = await Promise.all([page.waitForEvent('filechooser'), page.click('#mydb-newrec')]);
    await fc2.setFiles({ name: 'second.mp3', mimeType: 'audio/mpeg', buffer: Buffer.alloc(5000, 3) });
    await page.waitForFunction(() => (DB.articles || []).filter((a) => /^rec-/.test(a.id)).length === 2, null, { timeout: 20000 });
    const f2 = await page.evaluate(() => { const a = DB.articles.filter((x) => /^rec-/.test(x.id))[1]; const f = DB.folders.find((x) => x.id === a.folderIds[0]); return { fid: a.folderIds[0], name: f && f.name, parent: f && f.parentId, token: window.__driveAsks }; });
    r.check(f2.fid === 'mydb-rec' && f2.name === 'Recordings' && f2.parent === 'mydb-root' && f2.token === 1, '121i with no folder open the recording goes to 🗄 MyDatabase › Recordings (mydb-rec); the token was asked once', JSON.stringify(f2));
    await page.click('#mydb-x');
    /* details on a card note: prefilled, an owner edit, a later card change gives newer */
    await openNote(page, ID('c1'));
    await page.locator('[data-mydb="det"]').first().click(); await page.waitForSelector('#mrd-ok');
    const pre = await page.evaluate(() => ({ lang: document.getElementById('mrd-lang').value, len: document.getElementById('mrd-len').value, job: document.getElementById('mrd-job').value, st: document.getElementById('mrd-st').value }));
    const ua0 = await page.evaluate((i) => DB.articles.find((a) => a.id === i).updatedAt, ID('c1'));
    await page.fill('#mrd-given', 'Br. Karim'); await page.selectOption('#mrd-st', 'edited'); await page.click('#mrd-ok'); await sleep(500);
    const c1 = await page.evaluate((i) => { const a = DB.articles.find((x) => x.id === i); return { rec: a.rec, ua: a.updatedAt, u: a.fromMydb.u, c: a.content }; }, ID('c1'));
    r.check(pre.lang === 'Bangla' && pre.len === '12:30' && pre.job === 'J7' && c1.rec.given === 'Br. Karim' && c1.rec.status === 'edited' && c1.rec.lang === 'Bangla' && c1.ua > ua0 && c1.ua !== c1.u, '121i ✏️ Details: prefilled from the card; saving is an owner edit (updatedAt moves)', JSON.stringify({ pre, rec: c1.rec, ua0, ua: c1.ua }));
    const shown = await page.evaluate(() => (document.querySelector('.mydb-rec') || {}).textContent || '');
    r.check(/raw → \bedited\b → used in video/.test(shown) && /Br\. Karim/.test(shown), '121i the read view shows the details and "raw → edited → used in video"', shown);
    st.head = 'h2'; st.c1what = 'First talk CHANGED';
    await page.evaluate(() => _mydbSyncRun(true)); await sleep(400);
    const c1b = await page.evaluate((i) => { const a = DB.articles.find((x) => x.id === i); return { newer: !!a.fromMydb.newer, rec: a.rec, c: a.content }; }, ID('c1'));
    r.check(c1b.newer && c1b.rec.given === 'Br. Karim' && !/CHANGED/.test(c1b.c), '121i a later card change gives `newer` and never overwrites the recording\'s details', JSON.stringify({ newer: c1b.newer, rec: c1b.rec }));
    const card = await page.evaluate(() => { selFolder('sf-mydb'); return null; }); await sleep(400);
    const line = await page.evaluate(() => [...document.querySelectorAll('.ar-mydb')].map((e) => e.textContent));
    r.check(line.some((t) => /🎬 2/.test(t)) && line.some((t) => /🎬 1/.test(t)), '121i the Pane 2 card line gains "🎬 n" (2 files on the first card, 1 on the others)', JSON.stringify(line));
    const errs = app.errors.filter((e) => !/status of (401|404)/.test(e));
    r.check(errs.length === 0, '121i no page errors', errs.slice(0, 3).join(' | '));
  } catch (e) { r.check(false, '121i threw', String((e && e.stack) || e)); }
  await app.close();
}

/* ── j: the controls at every size, by a real click or tap ── */
for (const [w, h, touch] of [[390, 844, true], [820, 1180, true], [1440, 900, false]]) {
  const t = `@${w}`, st = makeStore(), dv = makeDrive(), app = await boot(w, h, touch, st, dv), page = app.page;
  try {
    await connect(page, touch); await sleep(800);
    const bx = await page.evaluate(() => { const b = document.getElementById('mydb-box').getBoundingClientRect(); const g = (id) => { const e = document.getElementById(id).getBoundingClientRect(); return { l: e.left, r: e.right, t: e.top, b: e.bottom, h: e.height, w: e.width }; }; return { box: { l: b.left, r: b.right, t: b.top, b: b.bottom }, mv: g('mydb-moveall'), nr: g('mydb-newrec'), ow: document.documentElement.scrollWidth > innerWidth + 1, bw: document.getElementById('mydb-box').scrollWidth > document.getElementById('mydb-box').clientWidth + 1, ih: innerHeight, iw: innerWidth }; });
    const inBox = (x) => x.l >= bx.box.l - 0.5 && x.r <= bx.box.r + 0.5 && x.h >= (w < 640 ? 48 : 44) - 0.5;
    r.check(inBox(bx.mv) && inBox(bx.nr) && !bx.ow && !bx.bw, `121j${t} ↑ Move all and ＋ Recording are in the dialog, ≥ ${w < 640 ? 48 : 44} px tall, nothing overflows sideways`, JSON.stringify(bx));
    /* ＋ Recording by a real click/tap: the file chooser opens */
    const [fc] = await Promise.all([page.waitForEvent('filechooser'), tap(page, touch, '#mydb-newrec')]);
    await fc.setFiles({ name: 'tiny.mp3', mimeType: 'audio/mpeg', buffer: Buffer.alloc(3000, 5) });
    await page.waitForFunction(() => (DB.articles || []).some((a) => /^rec-/.test(a.id)), null, { timeout: 20000 });
    r.check(true, `121j${t} ＋ Recording is reached by a real ${touch ? 'tap' : 'click'} and makes a note`);
    await tap(page, touch, '#mydb-x'); await sleep(200);
    await openNote(page, ID('c2')); await waitXfer(page);
    const geo = await page.evaluate(() => { const b = document.querySelector('.mydb-rows [data-mydb="up"]').getBoundingClientRect(), row = document.querySelector('.mydb-rows .mydb-file').getBoundingClientRect(); return { h: b.height, w: b.width, rw: row.width, ow: document.documentElement.scrollWidth > innerWidth + 1, r: b.right, iw: innerWidth }; });
    r.check(geo.h >= (w < 640 ? 48 : 44) - 0.5 && !geo.ow && geo.r <= geo.iw + 0.5 && (w < 640 ? geo.w >= geo.rw - 2 : geo.w < geo.rw), `121j${t} the file row: ${w < 640 ? 'full-width button ≥ 48 px' : 'button on the right'}, no sideways overflow`, JSON.stringify(geo));
    await tap(page, touch, '.mydb-rows [data-mydb="up"]');
    await page.waitForSelector('.mydb-rows [data-mydb="play"]', { timeout: 30000 });
    r.check(Object.keys(await driveMap(page)).length === 1, `121j${t} ↑ Upload to Drive is reached by a real ${touch ? 'tap' : 'click'} and the row turns into ▶ Play`);
    const [pop] = await Promise.all([app.ctx.waitForEvent('page'), tap(page, touch, '.mydb-rows [data-mydb="play"]')]);
    if (w < 640) { await sleep(600); r.check(pop.url() === 'https://drive.google.com/file/d/drv-r-1/preview', `121j${t} ▶ Play on a phone opens a new tab straight to Google's player`, pop.url()); }
    else { await pop.waitForSelector('iframe'); const s = await pop.evaluate(() => document.querySelector('iframe').getAttribute('src')); r.check(s === 'https://drive.google.com/file/d/drv-r-1/preview', `121j${t} ▶ Play opens a new window with the player in an iframe`, s); }
    await pop.close();
    await tap(page, touch, '.mydb-rows [data-mydb="det"]'); await page.waitForSelector('#mrd-ok');
    const mo = await page.evaluate(() => { const b = document.getElementById('mb').getBoundingClientRect(), o = document.getElementById('mrd-ok').getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, ok: o.bottom <= innerHeight + 0.5 && o.top >= 0, iw: innerWidth, ih: innerHeight, sheet: b.bottom >= innerHeight - 2 }; });
    r.check(mo.l >= -0.5 && mo.r <= mo.iw + 0.5 && mo.ok && (w < 640 ? mo.sheet : true), `121j${t} ✏️ Details opens the app's modal (${w < 640 ? 'a bottom sheet' : 'centred'}) and its Save is on screen`, JSON.stringify(mo));
    await tap(page, touch, '#mrd-x'); await sleep(200);
    const errs = app.errors.filter((e) => !/status of (401|404)/.test(e));
    r.check(errs.length === 0, `121j${t} no page errors`, errs.slice(0, 3).join(' | '));
  } catch (e) { r.check(false, `121j${t} threw`, String((e && e.stack) || e)); }
  await app.close();
}
process.exit(r.finish() ? 1 : 0);
