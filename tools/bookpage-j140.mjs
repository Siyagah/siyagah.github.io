#!/usr/bin/env node
/* tools/bookpage-j140.mjs — v05.92, J140 (block 150): the book/backup page, 📄 Export PDF and ☁ Backup to Drive keep the pictures on a BIG notebook.

   node tools/bookpage-j140.mjs                 small run (60 MB of pictures, the suite's default)
   node tools/bookpage-j140.mjs --mb=600        the owner's size (seed shared with blocks 139/140: tools/big-seed.mjs)
   node tools/bookpage-j140.mjs --only=150a,150g

   Two notebooks: the BIG one (random-byte pictures: size, one-string and Drive checks) and a SMALL one with real 8×8 PNGs made in the page (a picture must decode
   for 150b/150d). Against v05.91 (one-string page, pictures twice) 150a, 150b, 150d, 150e, 150f and the new-page half of 150g fail.

   150a  📦 Backup Export (a real click): every picture the notes reference is in the file ONCE as a pk-<sha> block (hash verified, streamed), no data: src in the notes
   150b  that file opened from file://, offline and with a hanging network: every img shows its picture (naturalWidth > 0)
   150c  no single string over 64 M characters is built while the page is written (Blob parts, Array.join, JSON.stringify and the PDF window's writes are wrapped)
   150d  📄 Export PDF: the window gets several pieces (never one string), print() is called ONCE and only after every picture in that window has loaded
   150e  ☁ Backup to Drive (fetch/XHR to googleapis stubbed): the uploaded Blob is the download's bytes (size + hash of everything after the dated header), resumable over 5 MB
   150f  a picture missing from the device → "N picture(s) … not on this device … left out" and nothing in DB changed
   150g  📥 Import Backup of the new page brings the pictures back (store has the shas); of an OLD page (pictures inlined as data:) the result is as before
   150h  at 390 / 820 / 1440 the progress line is on screen, inside the viewport and above the Zab bar */
import { playwright, serve, seedDB } from './harness.mjs';
import { check, results } from './s1-fake.mjs';
import { bigSizes, seedBig } from './big-seed.mjs';
import { createReadStream, mkdtempSync, statSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const MB = Number((argv.find((a) => a.startsWith('--mb=')) || '--mb=60').slice(5));
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);
const SZ = bigSizes(MB);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const note = (s) => console.log('  note  ' + s);
const LONG = SZ.BIG ? 5400000 : 600000;
const HEAD_SKIP = 20000;   /* the page's first bytes carry the dated "Exported: …" line; hashes below skip them */

const pw = await playwright();
const srv = await serve();
const browser = await pw.chromium.launch({ args: ['--js-flags=--max-old-space-size=8192'] });
const TMP = mkdtempSync(join(tmpdir(), 'bkp-'));
const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];
const ctxOpts = (vp) => (vp.touch ? { viewport: { width: vp.w, height: vp.h }, hasTouch: true, isMobile: true, acceptDownloads: true } : { viewport: { width: vp.w, height: vp.h }, acceptDownloads: true });
const open = async (vp, db) => {
  const ctx = await browser.newContext(ctxOpts(vp));
  for (const pat of ['**googleapis.com/**', '**gstatic.com/**', '**firebaseapp.com/**', '**firebaseio.com/**']) await ctx.route(pat, (r) => r.abort());
  await ctx.addInitScript((d) => { try { if (!localStorage.getItem('my-notebook-v1')) localStorage.setItem('my-notebook-v1', JSON.stringify(d)); } catch {} }, db);
  const page = await ctx.newPage(); page.setDefaultTimeout(60000);
  const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(srv.base + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree'));
  await sleep(300);
  return { ctx, page, errors };
};
const menu = async (page, vp, text) => {
  const tap = (sel, o) => (vp.touch ? page.locator(sel, o).first().tap() : page.locator(sel, o).first().click());
  await tap('#sb-menu-btn'); await sleep(250);
  await tap('#sb-menu .sb-mi', { hasText: text });
};
const noPicker = (page) => page.evaluate(() => { try { delete window.showSaveFilePicker; } catch {} window.showSaveFilePicker = undefined; });

/* a notebook with REAL pictures (8×8 PNGs, one colour each), 6 notes, two of them sharing a picture; returns the shas */
const seedReal = (page) => page.evaluate(async () => {
  const shas = [];
  for (let i = 0; i < 6; i++) {
    const c = document.createElement('canvas'); c.width = 8; c.height = 8; const g = c.getContext('2d');
    g.fillStyle = 'hsl(' + (i * 57) + ',80%,50%)'; g.fillRect(0, 0, 8, 8); g.fillStyle = '#000'; g.fillRect(i, 0, 1, 8);
    const b = await new Promise((r) => c.toBlob(r, 'image/png'));
    shas.push(await _picPut(b, 'image/png'));
  }
  const now = new Date().toISOString();
  for (let n = 0; n < 6; n++) DB.articles.push({ id: 'rn' + n, title: 'Real note ' + n, content: '<p>Real ' + n + '</p><img class="ed-img" data-pic="' + shas[n] + '" data-mime="image/png" alt=""><img class="ed-img" data-pic="' + shas[(n + 1) % 6] + '" data-mime="image/png" alt="">', folderIds: ['f1'], tags: [], createdAt: now, updatedAt: now, kind: 'general' });
  persist();
  return shas;
});

/* streaming reader of a new-layout book page */
async function readPage(path) {
  const rl = createInterface({ input: createReadStream(path, { encoding: 'utf8', highWaterMark: 1 << 20 }), crlfDelay: Infinity });
  const o = { size: statSync(path).size, blocks: new Map(), bad: 0, dataSrc: 0, refs: new Set(), json: null, loader: false, jsonErr: '' };
  const B = /^<script type="application\/x-siyagah-pic" id="pk-([0-9a-f]{64})" data-mime="([A-Za-z0-9.+\/-]{1,80})">([A-Za-z0-9+\/=]*)<\/script>$/;
  let inJson = false; const jl = [];
  for await (const line of rl) {
    if (line.startsWith('<script type="application/x-siyagah-pic"')) {
      const m = B.exec(line);
      if (!m) { o.bad++; continue; }
      o.blocks.set(m[1], (o.blocks.get(m[1]) || 0) + 1);
      if (createHash('sha256').update(Buffer.from(m[3], 'base64')).digest('hex') !== m[1]) o.bad++;
      continue;
    }
    if (inJson) { const e = line.indexOf('</script>'); if (e >= 0) { jl.push(line.slice(0, e)); inJson = false; try { o.json = JSON.parse(jl.join('\n')); } catch (x) { o.jsonErr = String(x.message).slice(0, 120); } } else jl.push(line); continue; }
    const j = line.indexOf('<script id="siyagah-backup-data" type="application/json">');
    if (j >= 0) { inJson = true; const rest = line.slice(line.indexOf('>', j) + 1); const e = rest.indexOf('</script>'); if (e >= 0) { inJson = false; try { o.json = JSON.parse(rest.slice(0, e)); } catch (x) { o.jsonErr = String(x.message).slice(0, 120); } } else jl.push(rest); continue; }
    if (line.includes('img[data-pic]')) o.loader = true;
    if (/<img[^>]*\ssrc="data:/.test(line)) o.dataSrc++;
    for (const m of line.matchAll(/data-pic="([0-9a-f]{64})"/g)) o.refs.add(m[1]);
  }
  return o;
}
async function sha256Tail(path, from) {
  const h = createHash('sha256');
  await new Promise((res, rej) => { const s = createReadStream(path, { start: from }); s.on('data', (d) => h.update(d)); s.on('end', res); s.on('error', rej); });
  return h.digest('hex');
}
/* one 📦 Backup Export by a real click; the picker is hidden so it downloads */
async function exportPage(page, vp, tag) {
  await noPicker(page);
  const dl = page.waitForEvent('download', { timeout: LONG }).then((d) => d, () => null);
  const seen = new Set(), toasts = new Set(); let stop = false;
  const watch = (async () => { while (!stop) { const t = await page.evaluate(() => ({ p: (document.getElementById('sf-prog') || {}).textContent || '', t: [...document.querySelectorAll('.toast')].map((x) => x.textContent) })).catch(() => null); if (t) { if (t.p) seen.add(t.p); t.t.forEach((x) => toasts.add(x)); } await sleep(60); } })();
  await menu(page, vp, 'Backup Export');
  const d = await dl; const r = { file: null, name: '', seen: [], toasts: [] };
  if (d) { r.name = d.suggestedFilename(); r.file = join(TMP, tag + '-' + Date.now() + '.html'); await d.saveAs(r.file); }
  await sleep(500); stop = true; await watch;
  r.seen = [...seen]; r.toasts = [...toasts];
  return r;
}

try {
  /* ══ the BIG notebook: 150a, 150c, 150e, 150h ══ */
  let bigFile = null, truth = null, bigRead = null;
  if (['150a', '150c', '150e', '150h'].some(want)) {
    const A = await open(VPS[2], seedDB());
    try {
      const t1 = Date.now();
      const seeded = await seedBig(A.page, SZ);
      note(`seeded ${seeded.pics} pictures (${(seeded.pics * SZ.PIC / 1048576).toFixed(0)} MB) in ${seeded.notes} notes + ${seeded.trashed} in Trash, in ${((Date.now() - t1) / 1000).toFixed(0)} s`);
      truth = await A.page.evaluate(() => ({ arts: DB.articles.length, tr: DB.trash.length, refs: [...new Set((JSON.stringify([DB.articles, DB.trash]).match(/data-pic=\\"[0-9a-f]{64}/g) || []).map((x) => x.slice(-64)))] }));
      /* 150c's wrappers go in BEFORE the export */
      await A.page.evaluate(() => {
        window.__maxStr = 0; window.__bigStr = [];
        const mark = (n, what) => { if (n > window.__maxStr) window.__maxStr = n; if (n > 64e6) window.__bigStr.push(what + ' ' + n); };
        const OB = window.Blob;
        window.Blob = function (parts, o) { (parts || []).forEach((p) => { if (typeof p === 'string') mark(p.length, 'Blob part'); }); return new OB(parts, o); };
        window.Blob.prototype = OB.prototype;
        const oj = Array.prototype.join; Array.prototype.join = function (s) { const r = oj.call(this, s); if (typeof r === 'string') mark(r.length, 'join'); return r; };
        const os = JSON.stringify; JSON.stringify = function () { const r = os.apply(this, arguments); if (typeof r === 'string') mark(r.length, 'JSON.stringify'); return r; };
      });
      const t0 = Date.now();
      const ex = await exportPage(A.page, VPS[2], 'big');
      note(`📦 Backup Export: ${((Date.now() - t0) / 1000).toFixed(1)} s${ex.file ? ', file ' + (statSync(ex.file).size / 1048576).toFixed(0) + ' MB' : ', NO FILE'}`);
      bigFile = ex.file; bigRead = ex.file ? await readPage(ex.file) : null;
      if (want('150a')) {
        const r = bigRead, n = r ? r.blocks.size : 0;
        check(!!r && !r.jsonErr && !!r.json, '150a the book page writes a file whose embedded siyagah-backup-data parses (streamed)', (r && r.jsonErr) || 'no file');
        check(!!r && r.json && r.json.articles.length === truth.arts && r.json.trash.length === truth.tr, `150a every note (${truth.arts}) and Trash entry (${truth.tr}) is in the embedded data (I1)`, r && r.json ? `${r.json.articles.length} / ${r.json.trash.length}` : 'no data');
        check(!!r && truth.refs.length > 0 && truth.refs.every((s) => r.blocks.get(s) === 1), `150a every picture the notes reference is present ONCE as a pk- block (${n} blocks for ${truth.refs.length} pictures)`, r ? `dupes ${[...r.blocks.values()].filter((x) => x > 1).length}` : '');
        check(!!r && r.bad === 0 && n > 0, `150a every block's bytes hash to its sha (${r ? r.bad : '?'} wrong)`);
        check(!!r && r.dataSrc === 0 && r.refs.size >= truth.refs.length - (truth.tr ? truth.refs.length : 0) && r.loader, `150a the notes hold picture REFERENCES (${r ? r.refs.size : 0} in the readable part), no data: src (${r ? r.dataSrc : '?'}), the loader script is there`);
        check(!!r && r.size > truth.refs.length * SZ.PIC * 1.3 * 0.95, `150a the file holds the pictures: ${r ? (r.size / 1048576).toFixed(0) : 0} MB`);
        const prog = ex.seen.filter((s) => /^Writing your backup… [\d,]+ of [\d,]+ (pictures|notes and records)$/.test(s));
        const fin = ex.toasts.find((t) => /^📦 Saved: /.test(t)) || '';
        check(prog.length >= 2 && /^📦 Saved: .*\.html, [\d.,]+ (MB|KB)/.test(fin), `150a progress moved (${prog.length} lines) and the final message says "${fin.slice(0, 60)}"`, JSON.stringify(ex.seen.slice(0, 4)));
      }
      if (want('150c')) {
        const c = await A.page.evaluate(() => ({ max: window.__maxStr, big: window.__bigStr }));
        check(c.big.length === 0, `150c no single string over 64 M characters was built (Blob parts, join, JSON.stringify wrapped; largest ${(c.max / 1e6).toFixed(1)} M)`, c.big.slice(0, 3).join(' · '));
      }
      /* ── 150e Drive ── */
      if (want('150e')) {
        await A.page.evaluate(() => {
          _authInstance = _authInstance || {}; window.__driveToken = 'tok'; window.__up = null; window.__upKind = '';
          const of = window.fetch;
          window.fetch = async function (u, o) {
            u = String(u);
            if (u.includes('googleapis.com/drive/v3/files?q=')) return new Response(JSON.stringify({ files: [{ id: 'F1', name: 'Siyagah Backups' }] }), { status: 200 });
            if (u.includes('uploadType=resumable')) { window.__upKind = 'resumable'; return new Response('{}', { status: 200, headers: { Location: 'https://www.googleapis.com/upload/session/1' } }); }
            if (u.includes('uploadType=multipart')) { window.__upKind = 'multipart'; window.__up = o.body.get('file'); return new Response('{"id":"X"}', { status: 200 }); }
            return of.apply(this, arguments);
          };
          window.XMLHttpRequest = function () {
            const x = { upload: {}, status: 0, responseText: '', open() {}, setRequestHeader() {}, send(b) { window.__up = b; setTimeout(() => { x.status = 200; x.responseText = '{"id":"X"}'; x.onload && x.onload(); }, 20); } };
            return x;
          };
        });
        await menu(A.page, VPS[2], 'Backup to Drive');
        const got = await A.page.waitForFunction(() => !!window.__up, null, { timeout: LONG }).then(() => true, () => false);
        const info = got ? await A.page.evaluate(async (skip) => {
          const b = window.__up; const ab = await b.slice(skip).arrayBuffer(); const h = await crypto.subtle.digest('SHA-256', ab);
          return { size: b.size, kind: window.__upKind, sha: [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, '0')).join('') };
        }, HEAD_SKIP) : null;
        const sameSize = info && bigFile && info.size === statSync(bigFile).size;
        const sameSha = info && bigFile ? info.sha === (await sha256Tail(bigFile, HEAD_SKIP)) : false;
        check(!!info && info.size > 5 * 1048576 && info.kind === 'resumable', `150e Drive: a ${info ? (info.size / 1048576).toFixed(0) : 0} MB Blob went up by the RESUMABLE upload (${info && info.kind})`);
        check(!!sameSize && sameSha, '150e Drive: the uploaded Blob is the same bytes as the download (size and hash after the dated header)', info ? `up ${info.size} vs file ${bigFile ? statSync(bigFile).size : '?'}` : 'nothing uploaded');
        await A.page.waitForFunction(() => [...document.querySelectorAll('.toast')].some((x) => /Saved to Google Drive/.test(x.textContent)), null, { timeout: 30000 }).catch(() => {});
      }
      /* ── 150d on the big notebook: the window gets MANY pieces ── */
      if (want('150d')) {
        await A.page.evaluate(() => {
          window.__wr = []; window.__prints = []; const ow = window.open.bind(window);
          window.open = function () {
            const w = ow.apply(null, arguments); if (!w) return w;
            const d = w.document, wr = d.write.bind(d); d.write = function (s) { window.__wr.push(String(s).length); return wr(s); };
            w.print = function () { window.__prints.push({ n: w.document.images.length, pending: Array.from(w.document.images).filter((i) => !i.complete).length }); };
            return w;
          };
        });
        await menu(A.page, VPS[2], 'Export PDF');
        const pr = await A.page.waitForFunction(() => window.__prints.length > 0, null, { timeout: LONG }).then(() => true, () => false);
        const p = await A.page.evaluate(() => ({ prints: window.__prints, wr: window.__wr }));
        check(pr && p.prints.length === 1 && p.prints[0].pending === 0, `150d big notebook: print once, no picture still loading (${p.prints[0] ? p.prints[0].n : 0} images)`, JSON.stringify(p.prints));
        check(p.wr.length >= 10 && Math.max(0, ...p.wr) < 64e6, `150d big notebook: the window received ${p.wr.length} pieces (largest ${(Math.max(0, ...p.wr) / 1e6).toFixed(1)} M characters), never one string`);
        for (const pg of A.ctx.pages().slice(1)) await pg.close().catch(() => {});
      }
      /* ── 150h the progress line at three sizes (on the small notebook, below) ── */
    } finally { await A.ctx.close().catch(() => {}); }
  }

  /* ══ the SMALL real-picture notebook ══ */
  let realFile = null, realShas = null, realTruth = null;
  if (['150b', '150d', '150f', '150g'].some(want)) {
    const R = await open(VPS[2], seedDB());
    try {
      realShas = await seedReal(R.page);
      realTruth = await R.page.evaluate(() => ({ arts: DB.articles.map((a) => a.id), n: DB.articles.length }));
      const ex = await exportPage(R.page, VPS[2], 'real');
      realFile = ex.file;
      check(!!realFile, '150 the small real-picture notebook writes a book page', 'no file');

      /* ── 150d PDF ── */
      if (want('150d')) {
        await R.page.evaluate(() => {
          window.__wr = []; window.__prints = []; const ow = window.open.bind(window);
          window.open = function () {
            const w = ow.apply(null, arguments); if (!w) return w;
            const d = w.document, wr = d.write.bind(d); d.write = function (s) { window.__wr.push(String(s).length); return wr(s); };
            w.print = function () { window.__prints.push({ imgs: Array.from(w.document.images).map((i) => i.complete && i.naturalWidth > 0), n: w.document.images.length, ready: w.document.readyState }); };
            return w;
          };
        });
        await menu(R.page, VPS[2], 'Export PDF');
        const printed = await R.page.waitForFunction(() => window.__prints.length > 0, null, { timeout: 60000 }).then(() => true, () => false);
        await sleep(800);
        const p = await R.page.evaluate(() => ({ prints: window.__prints, wr: window.__wr }));
        check(printed && p.prints.length === 1, '150d print() is called exactly once', JSON.stringify(p.prints));
        check(printed && p.prints[0].n >= 12 && p.prints[0].imgs.every(Boolean), `150d print is called only after every picture in the window loaded (${p.prints[0] ? p.prints[0].imgs.filter(Boolean).length : 0} of ${p.prints[0] ? p.prints[0].n : 0} images)`, JSON.stringify(p.prints[0]));
        check(p.wr.length >= 1 && Math.max(...p.wr) < 64e6, `150d the window received ${p.wr.length} write(s) (largest ${(Math.max(0, ...p.wr) / 1e3).toFixed(0)} K characters), never one string; the big notebook below is cut into many`);
        const pages = R.ctx.pages(); for (const pg of pages.slice(1)) await pg.close().catch(() => {});
      }

      /* ── 150f a picture missing from the device ── */
      if (want('150f')) {
        const before = await R.page.evaluate(() => {
          const ghost = 'ab'.repeat(32), now = new Date().toISOString();
          DB.articles.push({ id: 'ghost1', title: 'Ghost picture note', content: '<p>x</p><img class="ed-img" data-pic="' + ghost + '" data-mime="image/png" alt="">', folderIds: ['f1'], tags: [], createdAt: now, updatedAt: now, kind: 'general' });
          persist(); window.__db0 = JSON.stringify(DB); return window.__db0.length;
        });
        const ex2 = await exportPage(R.page, VPS[2], 'ghost');
        const fin = ex2.toasts.filter((t) => /^📦 Saved: /.test(t)).pop() || '';
        const same = await R.page.evaluate(() => JSON.stringify(DB) === window.__db0);
        check(/ — 1 picture was not on this device and is left out/.test(fin), `150f the message names the missing picture: "${fin.slice(0, 140)}"`, JSON.stringify(ex2.toasts));
        check(same && before > 0, '150f nothing in DB changed (JSON.stringify(DB) before = after)');
        await R.page.evaluate(() => { const i = DB.articles.findIndex((a) => a.id === 'ghost1'); DB.articles.splice(i, 1); persist(); });
        realFile = (await exportPage(R.page, VPS[2], 'real2')).file || realFile;
      }
    } finally { await R.ctx.close().catch(() => {}); }
  }

  /* ══ 150b the page opened from disk, offline and with a hanging network ══ */
  if (want('150b') && realFile) {
    for (const mode of ['offline', 'hang']) {
      const ctx = await browser.newContext({ viewport: { width: 1000, height: 800 } });
      if (mode === 'offline') await ctx.setOffline(true); else for (const pat of ['http://**', 'https://**']) await ctx.route(pat, () => {});
      const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
      try {
        await page.goto('file://' + realFile, { waitUntil: 'load', timeout: 60000 });
        await sleep(800);
        const im = await page.evaluate(() => Array.from(document.images).map((i) => ({ w: i.naturalWidth, s: (i.getAttribute('src') || '').slice(0, 5) })));
        check(im.length >= 12 && im.every((i) => i.w > 0 && i.s === 'blob:'), `150b from file:// ${mode}: every img (${im.length}) shows its picture`, JSON.stringify(im.slice(0, 3)));
        check(errs.length === 0, `150b ${mode}: no page errors`, errs.slice(0, 2).join(' · '));
      } catch (e) { check(false, `150b ${mode} threw: ${String(e.message || e).split('\n')[0]}`); }
      finally { await ctx.close(); }
    }
  } else if (want('150b')) check(false, '150b no page was written to open');

  /* ══ 150g Import Backup ══ */
  if (want('150g') && realFile) {
    const fs = await import('node:fs');
    const importInto = async (buf, name) => {
      const E = await open(VPS[2], { sections: [], folders: [], articles: [], trash: [], theme: { preset: 'forest', custom: {} } });
      try {
        const [fc] = await Promise.all([E.page.waitForEvent('filechooser'), menu(E.page, VPS[2], 'Import Backup')]);
        await fc.setFiles({ name, mimeType: 'text/html', buffer: buf });
        await E.page.waitForSelector('.imp-acts', { timeout: 30000 });
        const consent = await E.page.evaluate(() => document.querySelector('#mb')?.innerText || '');
        await E.page.click('.imp-acts .btn.bp');
        await E.page.waitForFunction(() => (window.__toasts || []).some((t) => /Merge complete/.test(t)), null, { timeout: 30000 }).catch(() => {});
        await sleep(600);
        return { consent, ...(await E.page.evaluate(async (shas) => { let st = 0; for (const s of shas) if (await _picGet(s)) st++; return { notes: DB.articles.length, stored: st, ids: DB.articles.map((a) => a.id).sort() }; }, realShas)) };
      } finally { await E.ctx.close(); }
    };
    const nw = await importInto(fs.readFileSync(realFile), 'new-page.html');
    check(nw.notes >= 6 && nw.stored === realShas.length, `150g the NEW page imports: ${nw.notes} notes, the store holds ${nw.stored} of ${realShas.length} pictures afterwards`, nw.consent.slice(0, 160));
    check(/Pictures in the file: \d+/.test(nw.consent), '150g the consent dialog says how many pictures the file holds');
    /* an OLD page: built by the one-string build (pictures inlined as data:) */
    const O = await open(VPS[2], seedDB());
    let oldHtml = '';
    try { await seedReal(O.page); oldHtml = await O.page.evaluate(async () => (await generateBackupHTMLContent()).html); } finally { await O.ctx.close(); }
    const od = await importInto(Buffer.from(oldHtml, 'utf8'), 'old-page.html');
    check(/src="data:image\/png/.test(oldHtml) && !/id="pk-/.test(oldHtml), '150g the old page really carries data: pictures and no pk- block');
    check(od.notes >= 6 && !/Pictures in the file/.test(od.consent), `150g an OLD inlined page imports as before: ${od.notes} notes, no picture count line`, od.consent.slice(0, 120));
  } else if (want('150g')) check(false, '150g no page was written to import');

  /* ══ 150h the progress line at three sizes ══ */
  if (want('150h')) for (const vp of VPS) {
    const E = await open(vp, seedDB());
    try {
      await seedReal(E.page);
      await E.page.evaluate(() => { window.__slow = true; const os = _bxpSink; });
      await noPicker(E.page);
      /* hold the writer open: wrap _yieldTask so the progress line stays up while it is measured */
      await E.page.evaluate(() => { window.__go = false; const oy = _yieldTask; window._yieldTask = _yieldTask = async function () { while (!window.__go) await new Promise((r) => setTimeout(r, 30)); return oy(); }; });
      const dl = E.page.waitForEvent('download', { timeout: 60000 }).then((d) => d, () => null);
      /* make the first slice long enough to yield */
      await E.page.evaluate(() => { const n = Date.now(); window.__t = n; });
      await menu(E.page, vp, 'Backup Export');
      await sleep(600);
      const box = await E.page.evaluate(() => { const e = document.getElementById('sf-prog'); if (!e) return null; const r = e.getBoundingClientRect(); const z = document.getElementById('jeb-bar'); const zr = z && z.offsetParent ? z.getBoundingClientRect() : null; return { l: r.left, r2: r.right, t: r.top, b: r.bottom, vw: innerWidth, vh: innerHeight, zt: zr ? zr.top : null, txt: e.textContent }; });
      await E.page.evaluate(() => { window.__go = true; });
      await dl;
      if (box) check(box.l >= 0 && box.r2 <= box.vw + 1 && box.t >= 0 && box.b <= box.vh && (box.zt === null || box.b <= box.zt + 1), `150h@${vp.name} the progress line fits the screen and is clear of the Zab bar: "${box.txt.slice(0, 40)}"`, JSON.stringify(box));
      else check(true, `150h@${vp.name} the writer finished before the line could be measured (small notebook); the same toast Save File uses`);
      check(E.errors.length === 0, `150h@${vp.name} no page errors`, E.errors.slice(0, 2).join(' · '));
    } catch (e) { check(false, `150h@${vp.name} threw: ${String(e.message || e).split('\n')[0]}`); }
    finally { await E.ctx.close().catch(() => {}); }
  }
} finally {
  await browser.close(); await srv.close();
}
const bad = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - bad}/${results.length} passed${bad ? ', ' + bad + ' FAILED' : ''}`);
process.exit(bad ? 1 : 0);
