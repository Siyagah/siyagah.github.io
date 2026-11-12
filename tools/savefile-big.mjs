#!/usr/bin/env node
/* tools/savefile-big.mjs — v05.81, J138 (block 140): 📦 Save File keeps the pictures on a BIG notebook, and the copy opens from disk with them.

   node tools/savefile-big.mjs                 small run (60 MB of pictures, the suite's default)
   node tools/savefile-big.mjs --mb=600        the owner's size (the seed is shared with block 139: tools/big-seed.mjs)
   node tools/savefile-big.mjs --mb=600 --only=140a,140b

   Against v05.80 (one-string Save File) this check shows the fault: at the large size the copy is built WITHOUT pictures (no picture block, no data: srcs), so
   140a, 140b, 140c and 140e fail, and so does the `</script>` row of 140d; 140f (the control is reachable) passes there too. Each path is recorded as a `note`.

   140a  at this size Save File (a real click on 💾 Save File) writes a file; every picture the notes reference is present ONCE as a block and its bytes hash to its sha
         (the file is STREAMED in Node, never read whole)
   140b  that copy opened in a NEW profile, from file://, offline (setOffline) and again with a hanging network: every note and Trash entry is there (I1), a note
         with pictures shows them painted (blob: srcs, no placeholder), and every picture ends up in the store; first paint time and peak JS heap at 390 ×4 and 1440
   140c  Save File from inside the opened copy: the new copy holds every picture too
   140d  small notebook: a copy with no pictures opens as before (same notes), a note holding `</script>` and `<!--` round-trips and runs nothing, and the copy's own
         syncKnowledgeBase still reads nd
   140e  progress moves ("Writing your file… N of M …"), the final message carries the file's real size, a failed write shows a reason and no "Saved", no double press
   140f  at 390 / 820 / 1440: 🧰 → 💾 Save File by a real click/tap from a booted app
   note  the old one-string book page at this size — REPORTED. (v05.92 · J140: the book page, PDF and Drive backup now keep the pictures; block 150 checks them.) */
import { playwright, serve, seedDB } from './harness.mjs';
import { check, results } from './s1-fake.mjs';
import { bigSizes, seedBig } from './big-seed.mjs';
import { createReadStream, mkdtempSync, statSync, writeFileSync } from 'node:fs';
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

const pw = await playwright();
const srv = await serve();
const browser = await pw.chromium.launch({ args: ['--js-flags=--max-old-space-size=8192'] });
const TMP = mkdtempSync(join(tmpdir(), 'sfb-'));
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
const act = (p, vp, sel, opt) => (vp.touch ? p.locator(sel, opt).first().tap() : p.locator(sel, opt).first().click());

/* Node-side STREAMING reader of a Save File copy: the nd text (small, references only), then every picture block line by line, hashed one at a time. */
async function verifyCopy(path) {
  const rl = createInterface({ input: createReadStream(path, { encoding: 'utf8', highWaterMark: 1 << 20 }), crlfDelay: Infinity });
  const o = { size: statSync(path).size, nd: null, ndErr: '', blocks: new Map(), bad: 0, badMime: 0, dataSrc: 0, order: true, refs: new Set() };
  let inNd = false, ndDone = false; const ndLines = [];
  const B = /^<script type="application\/x-siyagah-pic" id="pk-([0-9a-f]{64})" data-mime="([A-Za-z0-9.+\/-]{1,80})">([A-Za-z0-9+\/=]*)<\/script>$/;
  for await (const line of rl) {
    if (inNd) {
      if (line.startsWith('</script>')) { inNd = false; ndDone = true; try { o.nd = JSON.parse(ndLines.join('\n')); } catch (e) { o.ndErr = String(e.message).slice(0, 160); } ndLines.length = 0; }
      else ndLines.push(line);
      continue;
    }
    /* the writer puts the notebook's opening `{` straight after the tag, on the same line */
    if (!ndDone) { const at = line.indexOf('<script id="nd" type="application/json">'); if (at >= 0) { inNd = true; const rest = line.slice(at + 40); if (rest) ndLines.push(rest); } continue; }
    if (line.startsWith('<script type="application/x-siyagah-pic"')) {
      const m = B.exec(line);
      if (!m) { o.badMime++; continue; }
      o.blocks.set(m[1], (o.blocks.get(m[1]) || 0) + 1);
      if (createHash('sha256').update(Buffer.from(m[3], 'base64')).digest('hex') !== m[1]) o.bad++;
    }
  }
  if (o.nd) {
    const walk = (x) => { if (typeof x === 'string') { if (x.includes('data-pic')) { for (const m of x.matchAll(/data-pic="([0-9a-f]{64})"/g)) o.refs.add(m[1]); if (/<img[^>]*\ssrc="data:/.test(x)) o.dataSrc++; } } else if (x && typeof x === 'object') for (const v of Object.values(x)) walk(v); };
    walk(o.nd.articles); walk(o.nd.trash);
  }
  return o;
}

/* one Save File by a REAL click on 🧰 → 💾 Save File; the picker is hidden (download path) unless `picker` says otherwise; never throws */
async function saveCopy(page, vp, { picker = 'hide', timeout = LONG } = {}) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  let peak = 0, stop = false;
  const poll = (async () => { while (!stop) { try { const m = (await cdp.send('Performance.getMetrics')).metrics.find((x) => x.name === 'JSHeapUsedSize'); if (m && m.value > peak) peak = m.value; } catch {} await sleep(200); } })();
  const seen = new Set(), toasts = new Set();
  const watch = (async () => { while (!stop) {
    const t = await page.evaluate(() => ({ p: (document.getElementById('sf-prog') || {}).textContent || '', t: [...document.querySelectorAll('.toast')].map((x) => x.textContent) })).catch(() => null);
    if (t) { if (t.p) seen.add(t.p); t.t.forEach((x) => toasts.add(x)); }
    await sleep(60);
  } })();
  await page.evaluate((picker) => {
    if (picker === 'throw') window.showSaveFilePicker = async (o) => ({ name: o.suggestedName, createWritable: async () => ({ write: async () => { throw new DOMException('disk is full', 'QuotaExceededError'); }, close: async () => {}, abort: async () => {} }) });
    else { try { delete window.showSaveFilePicker; } catch {} window.showSaveFilePicker = undefined; }
  }, picker);
  const r = { ok: false, file: null, name: '', ms: 0, peak: 0, seen: [], toasts: [], err: '', busyAfter: null, progGone: null };
  const t0 = Date.now();
  try {
    const dl = picker === 'hide' ? page.waitForEvent('download', { timeout }).then((d) => d, () => null) : null;
    await act(page, vp, '#sb-tools-btn'); await sleep(300);
    await act(page, vp, '#export-btn');
    if (dl) {
      const d = await dl;
      if (d) { r.name = d.suggestedFilename(); r.file = join(TMP, 'copy-' + Date.now() + '.html'); await d.saveAs(r.file); r.ok = true; }
      else r.err = 'no download inside ' + Math.round(timeout / 1000) + ' s';
    } else await page.waitForFunction(() => [...document.querySelectorAll('.toast')].some((x) => /Save File failed|Saved:/.test(x.textContent)), null, { timeout: 60000 }).catch(() => {});
    await sleep(400);
  } catch (e) { r.err = String(e.message || e).split('\n')[0]; }
  r.ms = Date.now() - t0; stop = true; await Promise.all([poll, watch]);
  r.peak = peak; r.seen = [...seen]; r.toasts = [...toasts];
  r.busyAfter = await page.evaluate(() => _sfBusy).catch(() => null);
  r.progGone = await page.evaluate(() => !document.getElementById('sf-prog')).catch(() => null);
  await cdp.detach().catch(() => {});
  return r;
}
const mbOf = (s) => { const m = /, ([\d,.]+) (MB|KB)/.exec(s || ''); return m ? Number(m[1].replace(/,/g, '')) * (m[2] === 'MB' ? 1048576 : 1024) : NaN; };

try {
  /* ══ the notebook at this size ══ */
  const A = await open(VPS[2], seedDB());
  const t1 = Date.now();
  const seeded = await seedBig(A.page, SZ);
  note(`seeded ${seeded.pics} pictures (${(seeded.pics * SZ.PIC / 1048576).toFixed(0)} MB) in ${seeded.notes} notes + ${seeded.trashed} in Trash, in ${((Date.now() - t1) / 1000).toFixed(0)} s`);
  const truth = await A.page.evaluate(() => ({ arts: DB.articles.map((a) => a.id), tr: DB.trash.map((t) => t.id), refs: [...new Set((JSON.stringify([DB.articles, DB.trash]).match(/data-pic=\\"[0-9a-f]{64}/g) || []).map((x) => x.slice(-64)))] }));

  /* ══ 140a (and 140e's progress, from the same run) ══ */
  let run = null, ver = null;
  if (want('140a') || want('140b') || want('140c') || want('140e')) {
    run = await saveCopy(A.page, VPS[2]);
    note(`Save File: ${(run.ms / 1000).toFixed(1)} s, PEAK JS HEAP ${(run.peak / 1048576).toFixed(0)} MB${run.file ? ', file ' + (statSync(run.file).size / 1048576).toFixed(0) + ' MB' : ''}${run.err ? ', ' + run.err : ''}`);
    ver = run.file ? await verifyCopy(run.file) : null;
    const nBlocks = ver ? ver.blocks.size : 0;
    if (want('140a')) {
      check(!!ver && ver.nd && !ver.ndErr, '140a Save File wrote a file whose <script id="nd"> parses (streamed)', run.err || (ver && ver.ndErr) || '');
      check(!!ver && ver.nd && ver.nd.articles.length === truth.arts.length && ver.nd.trash.length === truth.tr.length, `140a every note (${truth.arts.length}) and Trash entry (${truth.tr.length}) is in nd (I1)`, ver && ver.nd ? `${ver.nd.articles.length} / ${ver.nd.trash.length}` : 'no nd');
      check(!!ver && ver.dataSrc === 0 && ver.refs.size === truth.refs.length, `140a nd keeps picture REFERENCES (${ver ? ver.refs.size : 0} distinct), no data: src inside the notes (${ver ? ver.dataSrc : '?'})`);
      check(!!ver && truth.refs.length > 0 && truth.refs.every((s) => ver.blocks.get(s) === 1) && nBlocks >= truth.refs.length, `140a every picture the notes reference is present ONCE as a block (${nBlocks} blocks for ${truth.refs.length} pictures)`, ver ? `dupes ${[...ver.blocks.values()].filter((n) => n > 1).length}, malformed ${ver.badMime}` : '');
      check(!!ver && ver.bad === 0 && nBlocks > 0, `140a every block's bytes hash to its sha (${ver ? ver.bad : '?'} wrong)`);
      check(!!ver && ver.size > truth.refs.length * SZ.PIC * 1.3 * 0.95, `140a the file holds the pictures: ${ver ? (ver.size / 1048576).toFixed(0) : 0} MB (a copy without them is a few MB)`);
    }
  }

  /* ══ 140e — progress, the final message, a failed write ══ */
  if (want('140e')) {
    const prog = run ? run.seen.filter((s) => /^Writing your file… [\d,]+ of [\d,]+ (pictures|notes and records)$/.test(s)) : [];
    check(prog.length >= 2, `140e the progress moved (${prog.length} different "Writing your file… N of M" lines seen)`, JSON.stringify(run ? run.seen.slice(0, 6) : []));
    const fin = run ? run.toasts.find((t) => /^📦 Saved: /.test(t)) : '';
    const said = mbOf(fin), real = run && run.file ? statSync(run.file).size : -1;
    check(!!fin && run.name && fin.includes(run.name) && real > 0 && Math.abs(said - real) <= Math.max(1048576, real * 0.002), `140e the final message "${(fin || '').slice(0, 90)}" carries the file's real size (${real} bytes)`);
    check(!!run && run.busyAfter === false && run.progGone === true, `140e usable again after (busy ${run && run.busyAfter}), progress line gone (${run && run.progGone})`);
    const F = await open(VPS[2], seedDB());
    try {
      const bad = await saveCopy(F.page, VPS[2], { picker: 'throw' });
      const failT = bad.toasts.find((t) => /Save File failed/.test(t)) || '';
      check(/Out of space/.test(failT) && !bad.toasts.some((t) => /^📦 Saved/.test(t)) && bad.progGone === true && bad.busyAfter === false, `140e a failed write shows a reason ("${failT.slice(0, 80)}"), no "Saved", progress line gone, usable again`, JSON.stringify(bad.toasts));
      check(F.errors.length === 0, '140e no page errors in the failed run', F.errors.slice(0, 2).join(' · '));
    } finally { await F.ctx.close(); }
  }
  await A.ctx.close().catch(() => {});

  /* ══ 140b / 140c — the copy opened from disk, in a NEW profile ══ */
  let keep = null;   /* the 1440 offline page, for 140c */
  if ((want('140b') || want('140c')) && run && run.file) {
    const MODES = [{ vp: VPS[0], mode: 'offline', slow: 4 }, { vp: VPS[2], mode: 'offline', slow: 1 }, { vp: VPS[2], mode: 'hang', slow: 1 }];
    for (const M of MODES) {
      const tag = `140b@${M.vp.name}${M.slow > 1 ? ' ×' + M.slow : ''} ${M.mode}`;
      const ctx = await browser.newContext(ctxOpts(M.vp));
      if (M.mode === 'offline') await ctx.setOffline(true);
      else for (const pat of ['http://**', 'https://**']) await ctx.route(pat, () => { /* never answered: a silent network */ });
      const page = await ctx.newPage(); page.setDefaultTimeout(60000);
      const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Performance.enable'); if (M.slow > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: M.slow });
      let peak = 0, stop = false;
      const poll = (async () => { while (!stop) { try { const m = (await cdp.send('Performance.getMetrics')).metrics.find((x) => x.name === 'JSHeapUsedSize'); if (m && m.value > peak) peak = m.value; } catch {} await sleep(250); } })();
      const t0 = Date.now(); let booted = false, err = '';
      try {
        await page.goto('file://' + run.file, { waitUntil: 'domcontentloaded', timeout: LONG });
        await page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree'), null, { timeout: LONG });
        booted = true;
      } catch (e) { err = String(e.message || e).split('\n')[0]; }
      const tBoot = Date.now() - t0;
      let fcp = -1, got = { arts: 0, tr: 0, ids: false }, painted = null;
      if (booted) {
        fcp = await page.evaluate(() => { const e = performance.getEntriesByType('paint').find((x) => x.name === 'first-contentful-paint'); return e ? Math.round(e.startTime) : -1; });
        got = await page.evaluate((t) => ({ arts: DB.articles.length, tr: DB.trash.length, ids: t.arts.every((id) => DB.articles.some((a) => a.id === id)) && t.tr.every((id) => DB.trash.some((x) => x.id === id)) }), truth);
        painted = await page.evaluate(async () => {
          const out = [];
          for (const id of ['bn0', 'bn4']) {
            selArt(id);
            const t0 = performance.now();
            while (performance.now() - t0 < 120000) {
              const imgs = [...document.querySelectorAll('#p3c img[data-pic], #p3c .av-body img[data-pic]')];
              if (imgs.length && imgs.every((i) => (i.getAttribute('src') || '').startsWith('blob:') && !i.classList.contains('ed-img-missing'))) { out.push({ id, n: imgs.length, ok: true, ms: Math.round(performance.now() - t0) }); break; }
              await new Promise((r) => setTimeout(r, 100));
            }
            if (!out.some((x) => x.id === id)) out.push({ id, n: document.querySelectorAll('#p3c img[data-pic]').length, ok: false });
          }
          return out;
        });
      }
      if (want('140b')) {
        check(booted, `${tag} the copy boots from file:// with no network in ${(tBoot / 1000).toFixed(1)} s (first paint ${fcp} ms, peak JS heap ${(peak / 1048576).toFixed(0)} MB)`, err || '');
        check(booted && got.arts === truth.arts.length && got.tr === truth.tr.length && got.ids, `${tag} every note (${truth.arts.length}) and Trash entry (${truth.tr.length}) is there (I1)`, JSON.stringify(got));
        check(!!painted && painted.every((x) => x.ok), `${tag} notes with pictures show them painted from the page (blob: srcs, no placeholder)`, JSON.stringify(painted));
        check(errors.length === 0, `${tag} no page errors`, errors.slice(0, 2).join(' · '));
        note(`${tag}: boot ${(tBoot / 1000).toFixed(1)} s, first paint ${fcp} ms, PEAK JS HEAP ${(peak / 1048576).toFixed(0)} MB${booted ? '' : ' — THIS DEVICE SIZE CANNOT OPEN THE COPY: ' + err}`);
      }
      if (booted && M.mode === 'offline' && M.vp.name === '1440' && want('140c')) {
        /* every block into the store (the adoption runs 3 s after the page is parsed), then Save File from inside the copy */
        await page.waitForFunction(() => !document.querySelector('script[type="application/x-siyagah-pic"]:not([data-bad])'), null, { timeout: LONG }).catch(() => {});
        const inStore = await page.evaluate(async (refs) => { let n = 0; for (const s of refs) if (await _picGet(s)) n++; return n; }, truth.refs);
        if (want('140b')) check(inStore === truth.refs.length, `140b@1440 offline every picture of the copy ended up in the device store (${inStore} of ${truth.refs.length})`);
        const run2 = await saveCopy(page, M.vp);
        const v2 = run2.file ? await verifyCopy(run2.file) : null;
        check(!!v2 && v2.nd && v2.nd.articles.length === truth.arts.length && truth.refs.every((s) => v2.blocks.get(s) === 1) && v2.bad === 0, `140c Save File from inside the copy: the new copy holds every note and every picture once, all hashing to their sha (${v2 ? v2.blocks.size : 0} blocks)`, run2.err || (v2 ? `dupes ${[...v2.blocks.values()].filter((n) => n > 1).length}, wrong ${v2.bad}` : ''));
      } else if (M.mode === 'offline' && M.vp.name === '1440' && want('140c')) check(false, '140c the copy did not open, so it could not save itself again', err);
      stop = true; await poll; await ctx.close().catch(() => {});
    }
  } else if (want('140b') || want('140c')) { if (want('140b')) check(false, '140b no copy was written, so there is nothing to open (see 140a)'); if (want('140c')) check(false, '140c no copy was written (see 140a)'); }

  /* ══ 140d — a small copy with no pictures; `</script>` round-trips; syncKnowledgeBase reads nd ══ */
  if (want('140d')) {
    const NASTY = '<p>before</p></script><script>window.__pwn=1</script><!-- c --><p>after &lt;/script&gt; ünï “q”</p>';
    const D = await open(VPS[2], seedDB());
    try {
      await D.page.evaluate((c) => { DB.articles.push({ id: 'nasty1', title: 'Nasty </script> title', content: c, folderIds: [], tags: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), kind: 'general' }); persist(); }, NASTY);
      const src = await D.page.evaluate(() => ({ n: DB.articles.length, ids: DB.articles.map((a) => a.id), titles: DB.articles.map((a) => a.title) }));
      const sv = await saveCopy(D.page, VPS[2], { timeout: 120000 });
      const txt = sv.file ? (await import('node:fs')).readFileSync(sv.file, 'utf8') : '';
      check(!!sv.file && !/^<script type="application\/x-siyagah-pic" id="pk-[0-9a-f]{64}"/m.test(txt), '140d a notebook with no pictures gives a copy with no picture block');
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, offline: true });
      const page = await ctx.newPage(); const errs = [];
      page.on('pageerror', (e) => errs.push(String(e)));
      try {
        await page.goto('file://' + sv.file);
        await page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree'), null, { timeout: 30000 });
        const got = await page.evaluate(() => ({ n: DB.articles.length, ids: DB.articles.map((a) => a.id), titles: DB.articles.map((a) => a.title), nasty: (DB.articles.find((a) => a.id === 'nasty1') || {}).content, pwn: window.__pwn === 1 }));
        check(got.n === src.n && src.ids.every((id) => got.ids.includes(id)) && src.titles.every((t) => got.titles.includes(t)), '140d the copy opens as before: every note is there (I1)', JSON.stringify({ a: src.n, b: got.n }));
        check(got.nasty === NASTY && !got.pwn, '140d a note holding </script> and <!-- round-trips byte for byte and runs nothing', String(got.nasty).slice(0, 120));
        const kb = await page.evaluate(() => { window.confirm = () => true; let thrown = ''; try { syncKnowledgeBase(); } catch (e) { thrown = String(e); } return { thrown, toast: [...document.querySelectorAll('.toast')].map((x) => x.textContent).join(' | ') }; });
        check(!kb.thrown && /Knowledge base updated/.test(kb.toast), '140d the copy\'s own syncKnowledgeBase still reads nd', kb.thrown || kb.toast);
        check(errs.length === 0, '140d no page errors in the copy', errs.slice(0, 2).join(' · '));
      } finally { await ctx.close(); }
    } catch (e) { check(false, `140d threw: ${String(e.message || e).split('\n')[0]}`); }
    finally { await D.ctx.close(); }
  }

  /* ══ 140f — the control is reached by a real click/tap, three sizes ══ */
  if (want('140f')) for (const vp of VPS) {
    const E = await open(vp, seedDB());
    try {
      const sv = await saveCopy(E.page, vp, { timeout: 120000 });
      const fin = sv.toasts.find((t) => /^📦 Saved: /.test(t)) || '';
      check(!!sv.file && /\.html$/.test(sv.name) && /^📦 Saved: .*\.html, /.test(fin), `140f@${vp.name} 🧰 → 💾 Save File by a real ${vp.touch ? 'tap' : 'click'}: a download starts and the message says "${fin.slice(0, 70)}"`, sv.err);
      check(E.errors.length === 0, `140f@${vp.name} no page errors`, E.errors.slice(0, 2).join(' · '));
    } catch (e) { check(false, `140f@${vp.name} threw: ${String(e.message || e).split('\n')[0]}`); }
    finally { await E.ctx.close(); }
  }

  /* ══ the two paths this round does not change — measured and REPORTED ══ */
  if (want('140a') || want('note')) {
    const B = await open(VPS[2], seedDB());
    try {
      await seedBig(B.page, SZ);
      const bk = await B.page.evaluate(async () => { const t = performance.now(); try { const x = await generateBackupHTMLContent(); const miss = (x.html.match(/data-pic="[0-9a-f]{64}"(?![^>]*\ssrc=)/g) || []).length; return { ok: true, len: x.html.length, ms: Math.round(performance.now() - t), noSrc: miss, withData: (x.html.match(/src="data:image/g) || []).length }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } });
      note(`v05.92 · J140 — the book/backup page, 📄 PDF and ☁ Drive no longer use this one-string build (they write piece by piece with the pictures kept: block 150); the old string (generateBackupHTMLContent, kept for this measurement only) at ${MB} MB: ${bk.ok ? `built a string of ${(bk.len / 1048576).toFixed(0)} MB in ${bk.ms} ms; ${bk.withData} pictures inlined, ${bk.noSrc} left as bare references` : 'FAILED — ' + bk.err}`);
    } catch (e) { note('book/backup page: could not measure — ' + String(e.message || e).split('\n')[0]); }
    finally { await B.ctx.close().catch(() => {}); }
  }
} finally {
  await browser.close(); await srv.close();
}
const bad = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - bad}/${results.length} passed${bad ? ', ' + bad + ' FAILED' : ''}`);
process.exit(bad ? 1 : 0);
