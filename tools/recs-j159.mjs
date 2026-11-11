#!/usr/bin/env node
/* tools/recs-j159.mjs — v05.89, J159 (block 147): the cloud's per-note copy (recs) lacked most of the notebook (the owner's phone believed it held 24,612
   records, the cloud 458) and nothing ever sent the rest. Checks 147a–147g:
   147a "☁ Send everything to the cloud again" writes every record the device holds to a cloud that lacks them, writes NO `gone`, shows "Sending N of M";
        a second device then has every note and a change made there reaches the first (I1)
   147b the automatic check: fires on a cloud holding < half, does NOT fire on one holding them all, on a small notebook, or before the reader has caught up
   147c the pointer owners/{uid}: one naming ANOTHER notebook is not overwritten by _opTick; an absent one is written; the button writes it
   147d Diagnostics: Firebase project, notebook id, where the setup came from, what the pointer names — and no apiKey; reached and not overflowing at 390/820/1440
   147e an export never ends at 0 bytes (phone path: no showSaveFilePicker): a writer that writes nothing is reported, never "Saved"
   147f an OLD-layout backup of 150 MB (JSON.stringify(DB,null,2)) imports through Merge with every note, folder and section; the heap peak is reported
   147g a device whose reader has not caught up (the phone: "Live", last received never) SAYS so; and it catches up once the cloud answers
   node tools/recs-j159.mjs [--notes=1500] [--mb=150] [--only=147a,147c]    (--notes=25000 is the owner's size; by hand)   [--unpatched]: serves origin/main */
import { playwright, serve, seedDB, openApp } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, quiet, waitSeeded, check, results, reopen, push, NB } from './s1-fake.mjs';
import { mkdtempSync, writeFileSync, createWriteStream, statSync, readFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';

const argv = process.argv.slice(2);
const arg = (k, d) => { const a = argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const NOTES = Number(arg('notes', 1500)), MB = Number(arg('mb', 150));
const onlyArg = arg('only', ''); const onlySet = onlyArg ? new Set(onlyArg.split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t) || [...onlySet].some((o) => t.startsWith(o));
const note = (s) => console.log('  note  ' + s);
function makeBase() {
  const dir = mkdtempSync(join(tmpdir(), 'j159-base-'));
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', `origin/main:${f}`], { encoding: 'buffer', maxBuffer: 1 << 28 })); } catch {} }
  return dir;
}
const pw = await playwright();
const srv = await serve(argv.includes('--unpatched') ? makeBase() : undefined);
const browser = await pw.chromium.launch();
const VPS = [{ w: 390, h: 844, touch: true }, { w: 820, h: 1180, touch: true }, { w: 1440, h: 900, touch: false }];
const noteCount = (d) => on(d, () => DB.articles.filter((a) => !String(a.id).startsWith('kb-')).length);
const cloudArts = (cloud) => [...cloud.store.keys()].filter((p) => p.startsWith(NB + '/recs/articles~')).length;
const goneN = (cloud, from) => cloud.log.slice(from).filter((o) => o.t === 'set' && o.gone).length;
const dropRecs = (cloud, keep) => { let k = 0; for (const p of [...cloud.store.keys()]) if (p.startsWith(NB + '/recs/articles~')) { if (k++ >= keep) { cloud.store.delete(p); cloud.ver.delete(p); } } };
const addNotes = (d, n) => on(d, (n) => { const a0 = DB.articles[0]; for (let i = 0; i < n; i++) DB.articles.push({ ...a0, id: 'j159-n' + i, title: 'Note ' + i, content: '<p>text ' + i + '</p>', folderIds: [...a0.folderIds], tags: [] }); persist(); }, n);
async function seeded(cloud, name, n, opts = {}) {
  const d = await addDevice(browser, srv.base, cloud, name, { width: 1440, height: 900 }, false, seedDB(), { recsOnly: true, builtinOff: true, ...opts });
  if (n) await addNotes(d, n);
  if (!opts.holdQ) { await push(cloud, d); await waitSeeded(cloud, d, 240000); }
  return d;
}
const waitFor = async (fn, ms, d, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await on(d, fn, arg).catch(() => false)) return true; await sleep(250); } return false; };
const errs = [];

/* ══ 147a — send everything again ══ */
if (want('147a')) {
  const cloud = makeCloud(); let A = null, B = null;
  try {
    A = await seeded(cloud, 'A', 200);
    const wantN = await noteCount(A);
    check(cloudArts(cloud) === wantN, `147a setup: the cloud holds all ${wantN} notes (${cloudArts(cloud)})`);
    dropRecs(cloud, 20);   /* the cloud "lost" them; A's sig map and replica still say it holds them */
    check(cloudArts(cloud) === 20, '147a setup: the cloud now lacks all but 20 notes');
    const log0 = cloud.log.length;
    await on(A, () => { window.__ss = new Set(); setInterval(() => window.__ss.add(_s1SendText()), 20); });
    await quiet(cloud, A);
    check(cloudArts(cloud) === 20, '147a before the button: nothing sends the rest by itself (the owner\'s situation)');
    await on(A, () => { _s1ResendUI(); });   /* the dialog is accepted by the harness */
    await waitFor(() => _s1Send.state === 'done', 60000, A);
    await quiet(cloud, A);
    const s = await on(A, () => ({ ..._s1Send, seen: [...window.__ss] }));
    check(cloudArts(cloud) === wantN, `147a "Send everything again" put every note back in the cloud (${cloudArts(cloud)} of ${wantN})`);
    check(goneN(cloud, log0) === 0, `147a it wrote no "gone" record (${goneN(cloud, log0)})`);
    check(s.state === 'done' && s.total >= wantN && s.done === s.total, `147a progress ran to the end: ${s.done} of ${s.total}`, JSON.stringify(s.seen));
    check(s.seen.some((t) => /^Sending \d+ of [\d,]+ records/.test(t)) || s.seen.some((t) => /^sent /.test(t)), '147a the line said "Sending N of M" (then "sent")', JSON.stringify(s.seen));
    B = await addDevice(browser, srv.base, cloud, 'B', { width: 1440, height: 900 }, false, seedDB(), { recsOnly: true, builtinOff: true });
    check(await waitFor((w) => DB.articles.filter((a) => !String(a.id).startsWith('kb-')).length >= w, 60000, B, wantN), `147a a second device has every note (${await noteCount(B)} of ${wantN})`);
    await on(B, () => { const a = DB.articles.find((x) => x.id === 'j159-n1'); a.title = 'Edited on B'; a.updatedAt = new Date(Date.now() + 5000).toISOString(); persist(); });
    await push(cloud, B);
    check(await waitFor(() => (DB.articles.find((x) => x.id === 'j159-n1') || {}).title === 'Edited on B', 40000, A), '147a a change made on the second device reaches the first');
    check((await noteCount(A)) === wantN && (await noteCount(B)) === wantN, `147a nothing lost on either device (I1): A ${await noteCount(A)}, B ${await noteCount(B)}`);
    errs.push(...A.errors, ...B.errors);
  } catch (e) { check(false, `147a threw: ${String(e && e.message || e).split('\n')[0]}`); }
  for (const d of [A, B]) if (d) await d.ctx.close().catch(() => {});
}

/* ══ 147b — the automatic check ══ */
if (want('147b')) {
  let A = null, S = null, H = null;
  try {
    const cloud = makeCloud();
    A = await seeded(cloud, 'A', 200);
    const wantN = await noteCount(A);
    dropRecs(cloud, 20);
    const log0 = cloud.log.length;
    await reopen(A);
    const fired = await waitFor(() => _s1Auto.state === 'sent', 90000, A);
    await quiet(cloud, A);
    const au = await on(A, () => JSON.parse(JSON.stringify(_s1Auto)));
    check(fired && cloudArts(cloud) === wantN, `147b the automatic check fired on a cloud holding 20 of ${wantN} and sent what it lacked (${cloudArts(cloud)} of ${wantN})`, JSON.stringify(au));
    check(au.how === 're-read' && au.probe && au.probe.missing > 0, `147b evidence: the loaded SDK has no count(), so a spot check then ONE re-read from cursor 0 (how=${au.how}, probe ${JSON.stringify(au.probe)}, cloud ${au.cloud})`);
    check(goneN(cloud, log0) === 0, '147b the automatic send wrote no "gone" record');
    /* the cloud holds everything now: a new page load must not send again */
    const log1 = cloud.log.length;
    await reopen(A);
    const ok = await waitFor(() => _s1Auto.state === 'ok', 60000, A);
    await sleep(1500);
    const recW = cloud.log.slice(log1).filter((o) => o.t === 'set' && o.p.startsWith(NB + '/recs/articles~')).length;
    check(ok && recW === 0, `147b a cloud holding everything: the check says so and sends nothing (${recW} article writes)`);
    /* a small notebook */
    const cs = makeCloud();
    S = await addDevice(browser, srv.base, cs, 'S', { width: 1440, height: 900 }, false, seedDB(), { recsOnly: true, builtinOff: true });
    await waitSeeded(cs, S, 60000);
    dropRecs(cs, 0);
    await reopen(S);
    await waitFor(() => _s1RdCaught === true, 30000, S);
    await sleep(12000);
    const sa = await on(S, () => ({ st: _s1Auto.state, send: _s1Send.state }));
    check(sa.st === 'small' && !sa.send, `147b a small notebook (under 50): never checked, never sent (${JSON.stringify(sa)})`);
    /* before the reader has caught up */
    const ch = makeCloud();
    H = await seeded(ch, 'H', 200, { holdQ: true });
    await sleep(13000);
    const h2 = await on(H, () => ({ st: _s1Auto.state, send: _s1Send.state, caught: _s1RdCaught }));
    check(h2.caught === false && (h2.st === 'idle' || !h2.st) && !h2.send, `147b before the reader has caught up the check does not run (${JSON.stringify(h2)})`);
    H.holdQ = false; for (const id of H.qsubs.keys()) ch.deliverQ(H, id, true);
    check(await waitFor(() => _s1RdCaught === true, 40000, H), '147b once the cloud answers the reader catches up');
    errs.push(...A.errors, ...S.errors, ...H.errors);
  } catch (e) { check(false, `147b threw: ${String(e && e.message || e).split('\n')[0]}`); }
  for (const d of [A, S, H]) if (d) await d.ctx.close().catch(() => {});
}

/* ══ 147c / 147d — the pointer, and what Diagnostics show ══ */
if (want('147c') || want('147d')) {
  let P = null, Q = null;
  try {
    const cloud = makeCloud();
    cloud.store.set('owners/u-s1', { nb: 'nb-other', b: '05.87' }); cloud.ver.set('owners/u-s1', 1);
    P = await addDevice(browser, srv.base, cloud, 'P', { width: 1440, height: 900 }, false, seedDB(), { recsOnly: true, builtinOff: true });
    await waitSeeded(cloud, P, 60000);
    const seen = await waitFor(() => _opS.differs === true, 60000, P);
    await sleep(1500);
    const ptr = cloud.store.get('owners/u-s1');
    check(seen && ptr.nb === 'nb-other' && !cloud.log.some((o) => o.p === 'owners/u-s1'), `147c a pointer naming ANOTHER notebook is not overwritten by _opTick (it still names ${ptr.nb}; ${cloud.log.filter((o) => o.p === 'owners/u-s1').length} writes)`);
    await on(P, () => openSyncModal());
    await sleep(900);
    const line = await on(P, () => (document.getElementById('op-line') || {}).textContent || '');
    check(/A new computer that signs in opens notebook\s*nb-other\.\s*This device syncs\s*nb-s1\./.test(line.replace(/\s+/g, ' ')) && /Make new computers open this notebook/.test(line), '147c Cloud Sync shows the line and the button', line.replace(/\s+/g, ' ').slice(0, 200));
    if (want('147d')) {
      /* 147d — Diagnostics: plain words, nothing secret */
      await on(P, () => { const c = JSON.parse(localStorage.getItem('siyagah-sync-v1')); c.firebaseConfig.apiKey = 'SECRET-APIKEY-XYZ'; c.firebaseConfig.projectId = 'proj-abc'; c.src = 'built-in'; localStorage.setItem('siyagah-sync-v1', JSON.stringify(c)); openSyncModal(); });
      await sleep(900);
      const dg = await on(P, () => ({ t: document.getElementById('sync-diag').innerText, all: document.getElementById('sync-mb').innerHTML + document.getElementById('sync-mb').innerText }));
      const flat = dg.t.replace(/\s+/g, ' ');
      check(/proj-abc/.test(flat) && /nb-s1/.test(flat) && /built-in setup/.test(flat) && /A DIFFERENT notebook: nb-other/.test(flat), '147d Diagnostics show the Firebase project, the notebook id, where the setup came from and what the pointer names', flat.slice(0, 400));
      check(!/SECRET-APIKEY-XYZ/.test(dg.all), '147d the apiKey is nowhere in the dialog');
      await on(P, () => { const c = JSON.parse(localStorage.getItem('siyagah-sync-v1')); c.firebaseConfig.apiKey = 'fake'; c.firebaseConfig.projectId = 'fake'; delete c.src; localStorage.setItem('siyagah-sync-v1', JSON.stringify(c)); });
      const flat2 = (await on(P, () => { openSyncModal(); return document.getElementById('sync-diag').innerText; })).replace(/\s+/g, ' ');
      check(/pasted by hand on this device/.test(flat2), '147d a pasted setup says "pasted by hand on this device"');
      for (const vp of VPS) {
        await P.page.setViewportSize({ width: vp.w, height: vp.h }); await sleep(300);
        const r = await P.page.evaluate(async () => {
          openSyncModal(); await new Promise((ok) => setTimeout(ok, 700));
          const out = {}; const mb = document.getElementById('sync-mb');
          for (const id of ['s1-resend-btn', 'op-make-btn']) {
            const b = document.getElementById(id); if (!b) { out[id] = 'missing'; continue; }
            b.scrollIntoView({ block: 'center' }); await new Promise((ok) => setTimeout(ok, 80));
            const rc = b.getBoundingClientRect(), hit = document.elementFromPoint(rc.left + rc.width / 2, rc.top + rc.height / 2);
            out[id] = rc.width > 0 && rc.left >= 0 && rc.right <= innerWidth && rc.top >= 0 && rc.bottom <= innerHeight && !!hit && (hit === b || b.contains(hit)) ? 'ok' : 'unreachable ' + JSON.stringify([rc.left, rc.right, rc.top, rc.bottom]);
          }
          out.overflow = mb.scrollWidth > mb.clientWidth + 1 ? mb.scrollWidth + '>' + mb.clientWidth : 'none';
          return out;
        });
        check(r['s1-resend-btn'] === 'ok' && r['op-make-btn'] === 'ok' && r.overflow === 'none', `147d@${vp.w} the new buttons are reachable and nothing overflows (${JSON.stringify(r)})`);
      }
      await P.page.setViewportSize({ width: 1440, height: 900 });
    }
    /* the button writes it */
    await on(P, () => { openSyncModal(); });
    await sleep(800);
    await on(P, () => { _opMakeMine(); });
    check(await waitFor(() => true, 100, P) && await (async () => { const t0 = Date.now(); while (Date.now() - t0 < 15000 && (cloud.store.get('owners/u-s1') || {}).nb !== 'nb-s1') await sleep(200); return (cloud.store.get('owners/u-s1') || {}).nb === 'nb-s1'; })(), '147c "Make new computers open this notebook" writes the pointer (after one question)');
    /* an absent pointer is written by the ordinary tick */
    const c2 = makeCloud();
    Q = await addDevice(browser, srv.base, c2, 'Q', { width: 1440, height: 900 }, false, seedDB(), { recsOnly: true, builtinOff: true });
    const t0 = Date.now(); while (Date.now() - t0 < 60000 && (c2.store.get('owners/u-s1') || {}).nb !== 'nb-s1') await sleep(300);
    check((c2.store.get('owners/u-s1') || {}).nb === 'nb-s1', '147c an ABSENT pointer is written by _opTick (first device on an account)');
    errs.push(...P.errors, ...Q.errors);
  } catch (e) { check(false, `147c/d threw: ${String(e && e.message || e).split('\n')[0]}`); }
  for (const d of [P, Q]) if (d) await d.ctx.close().catch(() => {});
}

/* ══ 147e — an export never ends at 0 bytes (the phone's path) ══ */
if (want('147e')) {
  let app = null;
  try {
    app = await openApp({ viewport: { width: 390, height: 844 }, hasTouch: true, initScript: () => { window.showSaveFilePicker = undefined; } });
    const p = app.page; let dls = 0; p.on('download', () => { dls++; });
    await p.tap('#sb-menu-btn'); await sleep(300);
    await p.locator('#sb-menu .sb-mi', { hasText: 'Storage & Backup' }).first().tap();
    await p.waitForSelector('#bxp-exp');
    const status = () => p.evaluate(() => (document.getElementById('bxp-status') || {}).textContent || '');
    const run = async () => { dls = 0; await p.evaluate(() => { document.getElementById('bxp-status').textContent = ''; }); await p.tap('#bxp-exp'); await p.waitForFunction(() => /^(Saved|Backup failed|Backup cancelled)/.test((document.getElementById('bxp-status') || {}).textContent || ''), null, { timeout: 30000 }).catch(() => {}); await sleep(600); return status(); };
    const dlp = p.waitForEvent('download', { timeout: 30000 }).catch(() => null);
    const st1 = await run(); const dl = await dlp;
    let size = 0; if (dl) { const f = join(mkdtempSync(join(tmpdir(), 'j159-dl-')), 'b.json'); await dl.saveAs(f); size = statSync(f).size; }
    check(/^Saved: notebook-backup-.*\.json, /.test(st1) && size > 1024, `147e@390 (no showSaveFilePicker) the normal export says "${st1}" and the file holds ${size} bytes`);
    await p.evaluate(() => { window.__w = _bxpWriteDB; });
    await p.evaluate(() => { window._bxpWriteDB = async function () {}; });
    const st2 = await run();
    check(/^Backup failed/.test(st2) && !/^Saved/.test(st2) && /empty/.test(st2) && dls === 0, `147e a writer that writes nothing: "${st2}" — never "Saved", no download`);
    await p.evaluate(() => { window._bxpWriteDB = async function (S) { await S.put('{}\n'); }; });
    const st3 = await run();
    check(/^Backup failed/.test(st3) && !/^Saved/.test(st3) && dls === 0, `147e a writer that writes 3 bytes for a notebook that holds notes: "${st3}"`);
    await p.evaluate(() => { window._bxpWriteDB = window.__w; window.showSaveFilePicker = async () => ({ name: 'x.json', createWritable: async () => ({ write: async () => {}, close: async () => {}, abort: async () => {} }), getFile: async () => ({ size: 0 }) }); });
    const st4 = await run();
    check(/^Backup failed/.test(st4) && !/^Saved/.test(st4), `147e a linked file / stream that kept nothing: "${st4}"`);
    await p.evaluate(() => { window.showSaveFilePicker = undefined; });
    const thrown = await p.evaluate(() => { try { _bxpDownload([], 'x.json', 'application/json'); return 'no error'; } catch (e) { return e.bxpEmpty ? 'refused' : String(e); } });
    check(thrown === 'refused', `147e a Blob of no pieces is never offered as a download (${thrown})`);
    const btn = await p.evaluate(() => !document.getElementById('bxp-exp').disabled);
    check(btn, '147e the Export button is usable again after a refused export');
    check(app.errors.length === 0, '147e no page errors', app.errors.slice(0, 2).join(' · '));
  } catch (e) { check(false, `147e threw: ${String(e && e.message || e).split('\n')[0]}`); }
  if (app) await app.close().catch(() => {});
}

/* ══ 147f — a 150 MB backup in the OLD layout ══ */
if (want('147f')) {
  let app = null; let file = null;
  try {
    /* the generator writes exactly what JSON.stringify(DB,null,2) writes — proved on a small object first */
    const indent = (s, n) => s.replace(/\n/g, '\n' + ' '.repeat(n));
    const oldLayout = (db) => '{\n' + Object.keys(db).map((k) => { const v = db[k]; if (Array.isArray(v) && v.length && v.every((x) => x && typeof x === 'object')) return '  ' + JSON.stringify(k) + ': [\n' + v.map((x) => '    ' + indent(JSON.stringify(x, null, 2), 4)).join(',\n') + '\n  ]'; return '  ' + JSON.stringify(k) + ': ' + indent(JSON.stringify(v, null, 2), 2); }).join(',\n') + '\n}';
    const tiny = { folders: [{ id: 'f', name: 'F', parentId: null }], articles: [{ id: 'a', title: 'A', content: '<p>x\n"q"</p>', tags: ['t'] }], sections: [], theme: { a: 1, b: { c: [1, 2] } }, empty: {}, n: 3 };
    check(oldLayout(tiny) === JSON.stringify(tiny, null, 2), '147f setup: the generator writes exactly what JSON.stringify(DB,null,2) writes');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    const sha = createHash('sha256').update(png).digest('hex');
    const NN = 3000, per = Math.floor((MB * 1048576) / NN) - 600;
    const filler = ('<p>' + 'the quick brown fox jumps over the lazy dog, again and again. '.repeat(40) + '</p>');
    const arts = []; for (let i = 0; i < NN; i++) { const body = filler.repeat(Math.ceil(per / filler.length)).slice(0, per); arts.push({ id: 'old-n' + i, title: 'Old note ' + i, content: (i % 500 === 0 ? '<p><img src="data:image/png;base64,' + png.toString('base64') + '" data-pic="' + sha + '" data-mime="image/png" alt=""></p>' : '') + body, folderIds: ['old-f' + (i % 20)], tags: ['t' + (i % 7)], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }); }
    const folders = []; for (let i = 0; i < 20; i++) folders.push({ id: 'old-f' + i, name: 'Folder ' + i, parentId: null, order: i });
    const secs = [{ id: 'old-s1', name: 'Old section', folderIds: ['old-f0', 'old-f1'] }];
    const db = { folders, articles: arts, sections: secs, trash: [], theme: { accent: '#123456', fonts: { a: 1 } } };
    file = join(mkdtempSync(join(tmpdir(), 'j159-old-')), 'old-layout.json');
    const ws = createWriteStream(file);
    const w = async (s) => { if (!ws.write(s)) await once(ws, 'drain'); };
    await w('{\n');
    const keys = Object.keys(db);
    for (let ki = 0; ki < keys.length; ki++) {
      const k = keys[ki], v = db[k], last = ki === keys.length - 1;
      if (Array.isArray(v) && v.length) { await w('  ' + JSON.stringify(k) + ': [\n'); for (let i = 0; i < v.length; i++) await w('    ' + indent(JSON.stringify(v[i], null, 2), 4) + (i < v.length - 1 ? ',' : '') + '\n'); await w('  ]' + (last ? '' : ',') + '\n'); }
      else await w('  ' + JSON.stringify(k) + ': ' + indent(JSON.stringify(v, null, 2), 2) + (last ? '' : ',') + '\n');
    }
    await w('}'); ws.end(); await once(ws, 'finish');
    const mbSize = statSync(file).size / 1048576;
    note(`147f the old-layout file: ${mbSize.toFixed(0)} MB, ${NN} notes, ${folders.length} folders, ${secs.length} section`);
    app = await openApp({ viewport: { width: 1440, height: 900 }, db: seedDB() });
    const p = app.page;
    await p.evaluate(() => { window.__heapMax = 0; window.__hp = setInterval(() => { try { window.__heapMax = Math.max(window.__heapMax, performance.memory.usedJSHeapSize); } catch (e) {} }, 100); });
    const fc = p.waitForEvent('filechooser'); await p.evaluate(() => { importJSON(); });
    await (await fc).setFiles(file);
    const okC = await p.waitForFunction(() => /In the file: [\d,]+ notes/.test((document.getElementById('mb') || {}).textContent || '') || /Could not read|too big/.test([...document.querySelectorAll('.toast')].map((t) => t.textContent).join(' ')), null, { timeout: 280000 }).then(() => true, () => false);
    const cons = await p.evaluate(() => (document.getElementById('mb') || {}).textContent || '');
    check(okC && /In the file: 3,?000 notes/.test(cons), `147f a ${mbSize.toFixed(0)} MB OLD-layout file is read and the consent dialog says ${(cons.match(/In the file: [^\n.]*/) || [''])[0]}`);
    await p.evaluate(() => { const b = [...document.querySelectorAll('#mb button')].find((x) => /^Merge/.test(x.textContent.trim())); if (b) b.click(); });
    await sleep(800);
    await p.evaluate(() => { const b = [...document.querySelectorAll('#mb button')].find((x) => /^Merge/.test(x.textContent.trim())); if (b) b.click(); });
    await p.waitForFunction(() => DB.articles.filter((a) => /^old-n/.test(a.id)).length >= 3000, null, { timeout: 120000 }).catch(() => {});
    const got = await p.evaluate(() => ({ arts: DB.articles.filter((a) => /^old-n/.test(a.id)).length, folders: DB.folders.filter((f) => /^old-f/.test(f.id)).length, secs: DB.sections.filter((s) => s.id === 'old-s1').length, heap: Math.round(window.__heapMax / 1048576), srcs: DB.articles.filter((a) => /data:image/.test(a.content)).length }));
    const pic = await p.evaluate(async (s) => !!(await _picGet(s)), sha);
    check(got.arts === NN && got.folders === 20 && got.secs === 1, `147f through Merge every note, folder and section is there: ${got.arts}/${NN} notes, ${got.folders}/20 folders, ${got.secs}/1 section (I1)`);
    check(pic && got.srcs === 0, `147f its pictures went to the store by sha (${pic}) and no data: picture is left in a note (${got.srcs})`);
    check(got.heap < mbSize * 5 + 400, `147f the heap stayed bounded: peak ${got.heap} MB for a ${mbSize.toFixed(0)} MB file (the notes themselves are ${mbSize.toFixed(0)} MB of text; the whole text and its parse are never held together)`);
    note(`147f peak JS heap during the import: ${got.heap} MB`);
    check(app.errors.length === 0, '147f no page errors', app.errors.slice(0, 2).join(' · '));
  } catch (e) { check(false, `147f threw: ${String(e && e.message || e).split('\n')[0]}`); }
  if (app) await app.close().catch(() => {});
  if (file) try { unlinkSync(file); } catch {}
}

/* ══ 147g — a reader that has not caught up says so, and catches up ══ */
if (want('147g')) {
  let A = null;
  try {
    const cloud = makeCloud();
    A = await seeded(cloud, 'A', NOTES);
    const wantN = await noteCount(A);
    note(`147g notebook of ${wantN} notes; cloud holds ${cloudArts(cloud)} of them`);
    A.holdQ = true;   /* the phone: the cloud's first answer does not come */
    await A.ctx.addInitScript(() => { window.__s1StuckMs = 1500; });
    await reopen(A);
    const t0 = Date.now(); let d0 = ''; while (Date.now() - t0 < 120000) { d0 = await on(A, () => _s1DiagText()).catch(() => ''); if (/^live|reading|on/i.test(d0) || !/starting/.test(d0)) break; await sleep(300); }
    await sleep(3500);
    const r = await on(A, () => { openSyncModal(); const dot = document.getElementById('sync-dot'); return { caught: _s1RdCaught, gate: _s1WriteGate(), why: _s1StuckWhy(), title: dot.title, stuck: !!document.getElementById('s1-stuck'), row: document.getElementById('sync-diag').innerText.replace(/\s+/g, ' ') }; });
    check(r.caught === false && r.gate === false && /first answer/.test(r.why), `147g the stuck reader is named in plain words: "${r.why}" (records on the device: ${wantN})`);
    check(r.stuck && /Sending to the cloud not yet — /.test(r.row) && (/not sending/.test(r.title) || !/Live/.test(r.title)), `147g the dialog and the dot say it (dot: "${r.title}")`, r.row.slice(0, 300));
    A.holdQ = false; for (const id of A.qsubs.keys()) cloud.deliverQ(A, id, true);
    const up = await waitFor(() => _s1RdCaught === true && _s1WriteGate() === true, 120000, A);
    await sleep(600);
    const r2 = await on(A, () => ({ why: _s1StuckWhy(), n: DB.articles.length, stuck: !!document.getElementById('s1-stuck') }));
    check(up && !r2.why, `147g once the cloud answers it catches up (gate open, no warning) with every note (${r2.n})`);
    errs.push(...A.errors);
  } catch (e) { check(false, `147g threw: ${String(e && e.message || e).split('\n')[0]}`); }
  if (A) await A.ctx.close().catch(() => {});
}

check(errs.length === 0, '147 no page errors on any sync device', errs.slice(0, 3).join(' · '));
await browser.close(); srv.close && srv.close();
const fails = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - fails}/${results.length} passed${fails ? ', ' + fails + ' FAILED' : ''}`);
process.exit(fails ? 1 : 0);
