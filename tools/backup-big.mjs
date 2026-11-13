#!/usr/bin/env node
/* tools/backup-big.mjs — v05.80, J135 (block 139): ⬇ Export data as JSON backup on a BIG notebook, and ⬆ Import reading it back.

   node tools/backup-big.mjs                 small run (60 MB of pictures, the suite's default)
   node tools/backup-big.mjs --mb=600        the owner's size (≈ 3,000 pictures of 200 KB, ≈ 1,000 notes; random bytes, nothing compresses)
   node tools/backup-big.mjs --mb=600 --only=139a,139d

   The pictures are made INSIDE the page (crypto.getRandomValues → _picPut into siyagah-pics-v1), so nothing big crosses to Node. About 5% of the notes are in Trash.
   Run against v05.78's index.html this check shows what the OLD exportJSON did at that size: the check RECORDS the outcome (a file, a thrown error, a fallback to
   the plain text without pictures, or no download inside the time limit) as a "note" line and fails 139a/139b/139c/139d — those are the rows expected to fail on
   v05.78 (the old build has no #bxp-status, no progress line and no one-record-per-line layout). 139e (the button is reachable) passes on v05.78 too.

   139a  the new export writes a file: valid JSON, every note present, every picture inlined and its bytes hash to its data-pic (checked by STREAMING the file in Node)
   139b  export → ⬆ Import into an EMPTY profile (a fresh browser): every note, folder, section equal (I1), every picture's bytes back in the store by sha
   139c  the small-size file also imports the OLD way: JSON.parse of the whole file → _showImportConsent (needs ≤ 100 MB: skipped, said so, at a larger size)
   139d  the progress line moves, the final line carries the real size, a failed write shows a reason and no "Saved", a cancelled picker is quiet, no double press
   139e  at 390 / 820 / 1440: ⚙ → 💽 Storage & Backup → ⬇ Export, by a real click/tap, from a booted app
   note  peak JS heap during the export at this size (must stay well below the file's size at ≥ 300 MB), Save File (_picExportHTML) at this size — REPORTED, not changed. */
import { playwright, serve, seedDB } from './harness.mjs';
import { check, results } from './s1-fake.mjs';
import { seedBig as seedBigShared } from './big-seed.mjs';
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
const BIG = MB >= 300;
const PIC = 200 * 1024;
const NPICS = Math.max(30, Math.round((MB * 1048576) / PIC));
const NNOTES = Math.max(10, Math.round(NPICS / 3));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const note = (s) => console.log('  note  ' + s);

const pw = await playwright();
const srv = await serve();
const browser = await pw.chromium.launch({ args: ['--js-flags=--max-old-space-size=8192'] });
const TMP = mkdtempSync(join(tmpdir(), 'bxp-'));

const open = async (vp, db) => {
  const ctx = await browser.newContext(vp.touch ? { viewport: { width: vp.w, height: vp.h }, hasTouch: true, isMobile: true, acceptDownloads: true } : { viewport: { width: vp.w, height: vp.h }, acceptDownloads: true });
  await ctx.route('**googleapis.com/**', (r) => r.abort()); await ctx.route('**gstatic.com/**', (r) => r.abort());
  await ctx.route('**firebaseapp.com/**', (r) => r.abort()); await ctx.route('**firebaseio.com/**', (r) => r.abort());
  await ctx.addInitScript((d) => { try { if (!localStorage.getItem('my-notebook-v1')) localStorage.setItem('my-notebook-v1', JSON.stringify(d)); } catch {} }, db);
  const page = await ctx.newPage(); page.setDefaultTimeout(60000);
  const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(srv.base + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree'));
  await sleep(300);
  return { ctx, page, errors };
};
const EMPTY = { sections: [], folders: [], articles: [], trash: [], theme: { preset: 'forest', custom: {} } };

/* the notebook at this size, made inside the page */
const seedBig = (page) => seedBigShared(page, { NPICS, NNOTES, PIC });   /* v05.81: the seed lives in tools/big-seed.mjs, shared with block 140 */

/* Node-side streaming verifier of THIS writer's layout: every line parsed by itself, pictures hashed. */
async function verifyFile(path) {
  const rl = createInterface({ input: createReadStream(path, { encoding: 'utf8', highWaterMark: 1 << 20 }), crlfDelay: Infinity });
  const o = { first: null, last: null, keys: [], ids: { articles: new Set(), trash: new Set(), folders: new Set(), sections: new Set() }, refs: 0, bad: 0, nosrc: 0, shas: new Set(), json: true, err: '' };
  let arr = null;
  const eatPics = (html) => {
    const re = /<img\b[^>]*\bdata-pic="([0-9a-f]{64})"[^>]*>/g; let m;
    while ((m = re.exec(html))) {
      o.refs++;
      const sm = /\bsrc="data:([^;,"]*);base64,([A-Za-z0-9+/=]*)"/.exec(m[0]);
      if (!sm) { o.nosrc++; continue; }
      if (createHash('sha256').update(Buffer.from(sm[2], 'base64')).digest('hex') !== m[1]) o.bad++; else o.shas.add(m[1]);
    }
  };
  const walk = (x) => { if (typeof x === 'string') { if (x.includes('data-pic')) eatPics(x); } else if (x && typeof x === 'object') for (const v of Object.values(x)) walk(v); };
  try {
    for await (let line of rl) {
      if (o.first === null) { o.first = line; continue; }
      o.last = line;
      if (arr) {
        if (line === ']' || line === '],') { arr = null; continue; }
        const v = JSON.parse(line.endsWith(',') ? line.slice(0, -1) : line);
        const id = v && (v.id || (v.item && v.item.id));
        if (o.ids[arr.key]) o.ids[arr.key].add(id);
        walk(v); continue;
      }
      if (line === '}') continue;
      const m = /^("(?:[^"\\]|\\.)*"):(.*)$/.exec(line); if (!m) throw new Error('unrecognised line: ' + line.slice(0, 80));
      const key = JSON.parse(m[1]); o.keys.push(key);
      if (m[2] === '[') { arr = { key }; continue; }
      walk(JSON.parse(m[2].endsWith(',') ? m[2].slice(0, -1) : m[2]));
    }
  } catch (e) { o.json = false; o.err = String(e.message || e).slice(0, 200); }
  return o;
}

/* one export, run by a real click on the button; returns what happened (never throws) */
async function runExport(page, { picker, saveTo, timeout = 3600000 }) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  let peak = 0, stop = false;
  const poll = (async () => { while (!stop) { try { const m = (await cdp.send('Performance.getMetrics')).metrics.find((x) => x.name === 'JSHeapUsedSize'); if (m && m.value > peak) peak = m.value; } catch {} await sleep(200); } })();
  const seen = new Set();
  const watch = (async () => { while (!stop) { const t = await page.evaluate(() => (document.getElementById('bxp-status') || {}).textContent || '').catch(() => ''); if (t) seen.add(t); await sleep(80); } })();
  await page.evaluate((picker) => {
    window.__bxpOpfs = null;
    if (picker === 'opfs') {
      window.showSaveFilePicker = async (o) => { const root = await navigator.storage.getDirectory(); const h = await root.getFileHandle(o.suggestedName, { create: true }); window.__bxpOpfs = o.suggestedName; return h; };
    } else if (picker === 'count') {
      /* Architect review: at the large size the browser's private test storage (OPFS) in a fresh test profile has too little quota for an 800 MB file
         ("Out of space on this device" after 0 bytes). A real disk picker is not limited that way, so this stand-in is a real writable that checks
         every line as it arrives and counts the bytes, keeping nothing. */
      window.__bxpCount = { n: 0, lines: 0, first: '', last: '', bad: 0, closed: false };
      window.showSaveFilePicker = async (o) => ({ name: o.suggestedName, createWritable: async () => {
        const C = window.__bxpCount, enc = new TextEncoder(); let buf = '';
        const line = (l) => { if (!C.lines) C.first = l; C.last = l; C.lines++; if (l.length > 2 && !/^[{}\]]/.test(l) && !/^"[^"]*":\[?$/.test(l)) { try { JSON.parse(l.replace(/^("(?:[^"\\]|\\.)*"):/, '').replace(/,$/, '')); } catch { C.bad++; } } };
        return { write: async (d) => { const s = typeof d === 'string' ? d : (d instanceof Blob ? await d.text() : new TextDecoder().decode(d.buffer ? d : new Uint8Array(d))); C.n += enc.encode(s).length; buf += s; let i; while ((i = buf.indexOf('\n')) >= 0) { line(buf.slice(0, i)); buf = buf.slice(i + 1); } },
          close: async () => { if (buf) line(buf); buf = ''; C.closed = true; }, abort: async () => {} };
      } });
    } else if (picker === 'throw') {
      window.showSaveFilePicker = async (o) => ({ name: o.suggestedName, createWritable: async () => ({ write: async () => { throw new DOMException('disk is full', 'QuotaExceededError'); }, close: async () => {}, abort: async () => {} }) });
    } else if (picker === 'cancel') {
      window.showSaveFilePicker = async () => { throw new DOMException('cancelled', 'AbortError'); };
    } else { try { delete window.showSaveFilePicker; } catch {} window.showSaveFilePicker = undefined; }
  }, picker);
  const r = { ok: false, how: '', ms: 0, peak: 0, seen: [], status: '', file: null, err: '' };
  const t0 = Date.now();
  try {
    await page.evaluate(() => openModal('settings'));
    await page.waitForSelector('#bxp-exp, button[onclick*="exportJSON"]');
    r.oldBuild = !(await page.$('#bxp-exp'));   /* v05.78 and older: no status line — the download event is the only signal */
    const dl = saveTo ? page.waitForEvent('download', { timeout }).then((d) => d, () => null) : null;
    await page.click('#bxp-exp, button[onclick*="exportJSON"]');
    if (!r.oldBuild) await page.click('#bxp-all');   /* v05.95 · J172 — ⬇ Export opens the choice first; 'Everything' is today's file */
    r.dbl = r.oldBuild ? null : await page.evaluate(() => document.getElementById('bxp-exp').disabled);
    if (r.oldBuild) {
      const d = await dl;
      if (d) { r.file = join(TMP, 'dl-' + Date.now() + '.json'); await d.saveAs(r.file); r.dlName = d.suggestedFilename(); r.ok = true; r.how = 'OLD build: a download arrived'; }
      else r.how = 'OLD build: NO download inside ' + Math.round(timeout / 1000) + ' s (the owner report)';
    } else {
      await page.waitForFunction(() => /^(Saved|Backup failed|Backup cancelled)/.test((document.getElementById('bxp-status') || {}).textContent || ''), null, { timeout });
      if (dl) { const d = await dl; if (d) { r.file = join(TMP, 'dl-' + Date.now() + '.json'); await d.saveAs(r.file); r.dlName = d.suggestedFilename(); } }
      r.ok = true; r.how = 'status';
    }
  } catch (e) { r.how = 'timeout/throw: ' + String(e.message || e).split('\n')[0]; r.err = r.how; }
  r.ms = Date.now() - t0; stop = true; await Promise.all([poll, watch]);
  r.status = await page.evaluate(() => (document.getElementById('bxp-status') || {}).textContent || '').catch(() => '');
  r.peak = peak; r.seen = [...seen]; r.btn = await page.evaluate(() => { const b = document.getElementById('bxp-exp'); return b ? !b.disabled : null; }).catch(() => null);
  await cdp.detach().catch(() => {});
  return r;
}

try {
  const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];
  const mbOf = (s) => { const m = /, ([\d,.]+) (MB|KB)/.exec(s || ''); return m ? Number(m[1].replace(/,/g, '')) * (m[2] === 'MB' ? 1048576 : 1024) : NaN; };

  /* ══ the notebook at this size ══ */
  const A = await open(VPS[2], seedDB());
  const t1 = Date.now();
  const seeded = await seedBig(A.page);
  note(`seeded ${seeded.pics} pictures (${(seeded.pics * PIC / 1048576).toFixed(0)} MB) in ${seeded.notes} notes + ${seeded.trashed} in Trash, in ${((Date.now() - t1) / 1000).toFixed(0)} s`);
  const truth = await A.page.evaluate(() => ({ arts: DB.articles.map((a) => a.id), tr: DB.trash.map((t) => t.id), folders: DB.folders.map((f) => f.id), secs: DB.sections.map((s) => s.id), json: JSON.stringify([DB.articles, DB.folders, DB.sections, DB.trash]).length }));
  const refsInDB = await A.page.evaluate(() => { const s = JSON.stringify(DB); return (s.match(/data-pic=/g) || []).length; });
  /* Architect review: the export inlines the pictures the notes REFERENCE; a seeded picture no note uses is rightly not in the file */
  const distinctRefs = await A.page.evaluate(() => new Set((JSON.stringify(DB).match(/data-pic=\\"[0-9a-f]{64}/g) || []).map((x) => x.slice(-64))).size);


  /* ══ 139d (picker path first: progress, the final line, the heap) ══ */
  let pickRun = null;
  if (want('139a') || want('139d')) {
    pickRun = await runExport(A.page, { picker: BIG ? 'count' : 'opfs', timeout: BIG ? 3600000 : 300000 });
    const t = '139d';
    const prog = pickRun.seen.filter((s) => /^Writing your backup… [\d,]+ of [\d,]+ (pictures|notes and records)( — Expected size: .*)?$/.test(s)   /* v05.95 · J172: the expected size and the keep-open sentence now stay on the progress line */);
    check(prog.length >= 2, `${t} the progress line moved (${prog.length} different "Writing your backup… N of M" lines seen)`, JSON.stringify(pickRun.seen.slice(0, 6)));
    const sz = BIG ? await A.page.evaluate(() => ({ n: window.__bxpCount.n, name: '(counted)' })) : await A.page.evaluate(async () => { try { const root = await navigator.storage.getDirectory(); const f = await (await root.getFileHandle(window.__bxpOpfs)).getFile(); return { n: f.size, name: f.name }; } catch (e) { return { n: -1, name: String(e) }; } });
    const mt = /^Saved: (notebook-backup-\d{4}-\d\d-\d\d\.json), /.exec(pickRun.status);
    check(!!mt && pickRun.ok, `${t} the final line says Saved: <name>, <size>`, pickRun.status || pickRun.how);
    const said = mbOf(pickRun.status);
    check(sz.n > 0 && Math.abs(said - sz.n) <= Math.max(1048576, sz.n * 0.002), `${t} the size in the message (${pickRun.status.slice(-40)}) is the real file's (${sz.n} bytes)`);
    check(pickRun.dbl === true && pickRun.btn === true, `${t} the button is disabled while working (${pickRun.dbl}) and usable again after (${pickRun.btn})`);
    note(`picker path: ${(pickRun.ms / 1000).toFixed(1)} s, file ${(sz.n / 1048576).toFixed(0)} MB, PEAK JS HEAP ${(pickRun.peak / 1048576).toFixed(0)} MB`);
    if (BIG) check(pickRun.peak < sz.n / 4, `${t} peak JS heap ${(pickRun.peak / 1048576).toFixed(0)} MB stays well below the file (${(sz.n / 1048576).toFixed(0)} MB; limit ¼)`);
    /* the file written through createWritable is valid by lines (streamed in the page) */
    const inPage = BIG ? await A.page.evaluate(() => { const C = window.__bxpCount; return { lines: C.lines, first: C.first, last: C.last, bad: C.bad }; }) : await A.page.evaluate(async (name) => {
      const root = await navigator.storage.getDirectory(); const f = await (await root.getFileHandle(name)).getFile();
      const rd = f.stream().pipeThrough(new TextDecoderStream()).getReader(); let buf = '', lines = 0, first = '', last = '', bad = 0;
      for (;;) { const r = await rd.read(); if (r.done) break; buf += r.value; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); if (!lines) first = l; last = l; lines++; if (l.length > 2 && !/^[{}\]]/.test(l) && !/^"[^"]*":\[?$/.test(l)) { try { JSON.parse(l.replace(/^("(?:[^"\\]|\\.)*"):/, '').replace(/,$/, '')); } catch { bad++; } } } }
      await root.removeEntry(name);
      return { lines, first, last, bad };
    }, sz.name);
    if (want('139a')) check(inPage.first === '{' && inPage.last === '}' && inPage.bad === 0 && inPage.lines > truth.arts.length, `139a the picker-path file (createWritable) is valid by lines: ${inPage.lines} lines, first "{", last "}", ${inPage.bad} unparsable`, JSON.stringify(inPage).slice(0, 200));

    /* a failed write: a reason, no "Saved"; a cancelled picker: quiet */
    const fail = await runExport(A.page, { picker: 'throw', timeout: 120000 });
    check(/^Backup failed\. Out of space on this device\./.test(fail.status) && !/Saved/.test(fail.status) && fail.btn === true, `${t} a write that throws QuotaExceededError shows a plain reason, no "Saved", the button is back`, fail.status);
    const canc = await runExport(A.page, { picker: 'cancel', timeout: 60000 });
    check(canc.status === 'Backup cancelled' && !/fail|Saved/i.test(canc.status), `${t} a cancelled picker shows "Backup cancelled", no error`, canc.status);
  }

  /* ══ 139a/139b/139c — the downloaded file (the Blob path), checked in Node by streaming ══ */
  let dlRun = null, ver = null;
  if (want('139a') || want('139b') || want('139c')) {
    dlRun = await runExport(A.page, { picker: 'none', saveTo: true, timeout: BIG ? 3600000 : 300000 });
    note(`download (Blob) path: ${dlRun.ok ? 'file ' + (statSync(dlRun.file).size / 1048576).toFixed(0) + ' MB' : 'NO FILE — ' + dlRun.how} in ${(dlRun.ms / 1000).toFixed(1)} s, peak JS heap ${(dlRun.peak / 1048576).toFixed(0)} MB, status: ${dlRun.status}`);
    check(dlRun.ok && !!dlRun.file, `139a the export writes a file at ${MB} MB (the Blob path: ${dlRun.dlName || dlRun.how})`, dlRun.status);
    if (dlRun.file) {
      ver = await verifyFile(dlRun.file);
      const sameIds = (s, a) => s.size === a.length && a.every((x) => s.has(x));
      check(ver.json && ver.first === '{' && ver.last === '}', '139a the file is valid JSON by streaming it back, line by line (no whole-file parse)', ver.err);
      check(sameIds(ver.ids.articles, truth.arts) && sameIds(ver.ids.trash, truth.tr), `139a every note is in the file: ${ver.ids.articles.size} notes + ${ver.ids.trash.size} in Trash (expected ${truth.arts.length} + ${truth.tr.length})`);
      check(ver.refs === refsInDB && ver.nosrc === 0 && ver.bad === 0, `139a every picture is inlined and its bytes hash to its data-pic: ${ver.refs} references, ${ver.nosrc} without bytes, ${ver.bad} wrong (expected ${refsInDB} references)`);
      check(ver.shas.size === distinctRefs, `139a all ${distinctRefs} distinct pictures the notes reference are in the file (${ver.shas.size}; ${seeded.pics} seeded in the store)`);
      if (!BIG) {
        /* a file with no pictures: say how it differs from today's */
        /* a notebook with no pictures: the new file = JSON.stringify(DB) after parsing both (only whitespace differs) */
        const same = await A.page.evaluate(async () => {
          const keep = [DB.articles, DB.trash]; DB.articles = [{ id: 'z1', title: 'Z', content: '<p>plain ünï</p>', folderIds: [], tags: [], createdAt: 'x', updatedAt: 'x' }]; DB.trash = [];
          window.showSaveFilePicker = async () => { const root = await navigator.storage.getDirectory(); return root.getFileHandle('plain.json', { create: true }); };
          await exportJSON();
          for (let i = 0; i < 100 && !/^Saved/.test((document.getElementById('bxp-status') || {}).textContent || ''); i++) await new Promise((r) => setTimeout(r, 50));
          const f = await (await (await navigator.storage.getDirectory()).getFileHandle('plain.json')).getFile();
          const t = await f.text(); const eq = JSON.stringify(JSON.parse(t)) === JSON.stringify(JSON.parse(JSON.stringify(DB)));
          DB.articles = keep[0]; DB.trash = keep[1]; return { eq, lines: t.split('\n').length };
        });
        check(same.eq, '139a a notebook with no pictures: the new file parses to exactly JSON.stringify(DB) (it differs from the old file only in whitespace — one record per line)', JSON.stringify(same));
      }
    }
  }

  if (want('139b') && dlRun && dlRun.file) {
    const B = await open(VPS[2], EMPTY);
    try {
      const before = await B.page.evaluate(() => ({ a: DB.articles.length, f: DB.folders.length }));
      await B.page.evaluate((n) => { window.__bxpBigMin = n; }, 1);   /* take the streaming path even at the small size */
      await B.page.evaluate(() => { window.__seenConsent = null; const o = window._showImportConsent; window._showImportConsent = function (d, n) { window.__seenConsent = { a: d.articles.length, tr: (d.trash || []).length, json: JSON.stringify(d).length }; return o.apply(this, arguments); }; });
      const fc = B.page.waitForEvent('filechooser');
      await B.page.evaluate(() => importJSON());
      await (await fc).setFiles(dlRun.file);
      await B.page.waitForFunction(() => !!window.__seenConsent, null, { timeout: BIG ? 3600000 : 300000 });
      const cons = await B.page.evaluate(() => window.__seenConsent);
      check(cons.a === truth.arts.length && cons.tr === truth.tr.length, `139b the big-file reader hands _showImportConsent ${cons.a} notes + ${cons.tr} in Trash`, JSON.stringify(cons));
      check(cons.json < statSync(dlRun.file).size / 4, `139b the data given to the consent dialog is small: ${(cons.json / 1048576).toFixed(1)} MB for a ${(statSync(dlRun.file).size / 1048576).toFixed(0)} MB file (pictures went to the store)`);
      /* Architect review: Replace everything, the path that restores a whole notebook (Trash included); Merge adds notes/folders/sections only, as it always has */
      await B.page.evaluate(() => { const b = [...document.querySelectorAll('#mb button')].find((x) => /^Replace everything/.test(x.textContent.trim())); if (b) b.click(); });
      await sleep(500);
      await B.page.evaluate(() => { const b = [...document.querySelectorAll('#mb button')].find((x) => /^Replace everything/.test(x.textContent.trim())); if (b) b.click(); });
      await sleep(1500);
      const got = await B.page.evaluate(() => ({ arts: DB.articles.map((a) => a.id), tr: DB.trash.map((t) => t.id), folders: DB.folders.map((f) => f.id), secs: DB.sections.map((s) => s.id) }));
      const eq = (x, y) => x.length === y.length && y.every((i) => x.includes(i));
      check(eq(got.arts, truth.arts) && eq(got.tr, truth.tr) && eq(got.folders, truth.folders) && eq(got.secs, truth.secs), `139b into an EMPTY profile every note, folder and section is equal (I1): ${got.arts.length}/${truth.arts.length} notes, ${got.tr.length}/${truth.tr.length} Trash, ${got.folders.length}/${truth.folders.length} folders, ${got.secs.length}/${truth.secs.length} sections`);
      const missing = await B.page.evaluate(async (shas) => { let m = 0; for (const s of shas) if (!(await _picGet(s))) m++; return m; }, [...ver.shas]);
      check(missing === 0, `139b every picture's bytes are in the new profile's store by sha (${ver.shas.size - missing}/${ver.shas.size})`);
      const refs = await B.page.evaluate(() => { const s = JSON.stringify(DB); return { r: (s.match(/data-pic=/g) || []).length, d: (s.match(/data:image/g) || []).length }; });
      check(refs.r === refsInDB && refs.d === 0, `139b the notes hold data-pic references again, no data: pictures left in them (${refs.r} refs, ${refs.d} data:)`);
      /* a big file NOT in the layout: a clear message, nothing imported */
      const bad = join(TMP, 'plain.json');
      const fsm = await import('node:fs'); fsm.writeFileSync(bad, JSON.stringify({ folders: [], articles: [{ id: 'q', title: 'q', content: '<p>x</p>' }] }));   /* v05.89 J159: the 2-space layout is now READ (block 147f); a one-line file is the 'not in any layout' case */
      const fc2 = B.page.waitForEvent('filechooser'); await B.page.evaluate(() => { window.__seenConsent = null; importJSON(); });
      await (await fc2).setFiles(bad); await sleep(1200);
      const msg = await B.page.evaluate(() => [...document.querySelectorAll('.toast')].map((t) => t.textContent).join(' | '));
      check(/too big to read here and is not in a layout Siyagah writes/.test(msg) && (await B.page.evaluate(() => window.__seenConsent)) === null, '139b a big file not in the layout gets the clear message and imports nothing', msg);
    } finally { await B.ctx.close(); }
  }

  if (want('139c') && dlRun && dlRun.file) {
    if (BIG) note('139c skipped at this size: a whole-file JSON.parse is what v05.80 replaces (run at the small default size)');
    else {
      const C = await open(VPS[2], EMPTY);
      try {
        const txt = (await import('node:fs')).readFileSync(dlRun.file, 'utf8');
        const d = JSON.parse(txt);   /* the OLD way: one parse of the whole file */
        const ok = await C.page.evaluate((d) => { _showImportConsent(d, 'notebook-backup.json'); return /In the file: \d+ notes/.test(document.getElementById('mb').textContent); }, d);
        check(d.articles.length === truth.arts.length && d.trash.length === truth.tr.length && ok && /^<img src="data:image\/png;base64,/.test(((d.articles.find((a) => /<img/.test(a.content || '')) || {}).content || '').match(/<img[^>]*>/)?.[0] || ''), `139c the small file imports the OLD way too: JSON.parse of the whole file → _showImportConsent (${d.articles.length} notes, pictures inlined as data: srcs)`);
      } finally { await C.ctx.close(); }
    }
  }

  /* ── Save File at this size: REPORTED only ── */
  if (want('139a')) {
    const sv = await A.page.evaluate(async () => { const t = performance.now(); try { const h = await _picExportHTML(); return { ok: true, len: h.length, ms: Math.round(performance.now() - t) }; } catch (e) { return { ok: false, err: String(e && e.message || e), ms: Math.round(performance.now() - t) }; } }).catch((e) => ({ ok: false, err: 'page died: ' + String(e.message || e).split('\n')[0] }));
    note(`Save File (_picExportHTML, NOT changed in this round) at ${MB} MB: ${sv.ok ? 'built a string of ' + (sv.len / 1048576).toFixed(0) + ' MB in ' + sv.ms + ' ms' : 'FAILED — ' + sv.err}`);
  }
  await A.ctx.close().catch(() => {});

  /* ══ 139e — the button is reached by a real click, three sizes ══ */
  if (want('139e')) for (const vp of VPS) {
    const E = await open(vp, seedDB());
    try {
      const p = E.page, act = (sel, opt) => (vp.touch ? p.locator(sel, opt).first().tap() : p.locator(sel, opt).first().click());
      await act('#sb-menu-btn'); await sleep(300);   /* Architect review: 💽 Storage & Backup is in the ⚙ Settings menu, not 🧰 (the issue said 🧰 by mistake) */
      await act('#sb-menu .sb-mi', { hasText: 'Storage & Backup' });
      await p.waitForSelector('#bxp-exp');
      const fc = p.waitForEvent('download', { timeout: 60000 }).catch(() => null);
      await p.evaluate(() => { try { window.showSaveFilePicker = undefined; } catch {} });
      await act('#bxp-exp');
      await act('#bxp-all');   /* v05.95 · J172 */
      await p.waitForFunction(() => /^Saved: notebook-backup-/.test((document.getElementById('bxp-status') || {}).textContent || ''), null, { timeout: 60000 }).catch(() => {});
      const st = await p.evaluate(() => (document.getElementById('bxp-status') || {}).textContent || '');
      const open_ = await p.evaluate(() => document.getElementById('ov').classList.contains('on'));
      check(/^Saved: notebook-backup-\d{4}-\d\d-\d\d\.json, /.test(st) && open_ && !!(await fc), `139e@${vp.name} ⚙ → 💽 Storage & Backup → ⬇ Export by a real ${vp.touch ? 'tap' : 'click'}: a download starts, the dialog stays open and says "${st}"`);
      check(E.errors.length === 0, `139e@${vp.name} no page errors`, E.errors.slice(0, 2).join(' · '));
    } catch (e) { check(false, `139e@${vp.name} threw: ${String(e.message || e).split('\n')[0]}`); }
    finally { await E.ctx.close(); }
  }
} finally {
  await browser.close(); await srv.close();
}
const bad = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - bad}/${results.length} passed${bad ? ', ' + bad + ' FAILED' : ''}`);
process.exit(bad ? 1 : 0);
