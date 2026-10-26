#!/usr/bin/env node
/* tools/replica-load-j71.mjs — v05.51, J71: the owner's phone showed "Per-note copy: off — starting" for good. The per-record reader
   waits for its device copy (the replica, siyagah-s1-v1) to open and load before it starts; the load was ONE getAll of the whole
   notebook and the open had no time limit, so a load or open that never answered left the reader "starting" with nothing to see.
   Checks 111a–111f:
   111a a replica of 240 records loads in batches (step 37 → 7 batches) into exactly what the database holds, cursor included;
   111b after a reload the reader is on and every note is there;
   111c an open that never answers is given up after its time limit: Diagnostics say "did not open", not "no IndexedDB", and
        while it waits they say "opening the device copy (for N s)";
   111d a minute later (here 3 s) the reader tries again, opens, and is on with every note; B wrote no "gone" record;
   111e the starting text names the step and the count ("reading the device copy, 1,234 records so far");
   111f the Diagnostics line is reached from ⚙ → ☁ at 390 / 820 / 1440; no page errors.
   `node tools/replica-load-j71.mjs [--unpatched]`: --unpatched serves the build before this round (111c, 111d, 111e must fail there). */
import { playwright, serve, seedDB } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, quiet, waitSeeded, check, results, reopen } from './s1-fake.mjs';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
function makeBase() {
  const dir = mkdtempSync(join(tmpdir(), 'rl-base-'));
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', `origin/main:${f}`], { encoding: 'buffer', maxBuffer: 1 << 28 })); } catch {} }
  return dir;
}
const N = 240;
function bigSeed() {
  const db = seedDB(), a0 = db.articles[0];
  for (let i = 0; i < N; i++) db.articles.push({ ...a0, id: 'rl-n' + i, title: 'Note ' + i, content: '<p>text ' + i + '</p>', folderIds: [...a0.folderIds], tags: [] });
  return db;
}
const pw = await playwright();
const srv = await serve(argv.includes('--unpatched') ? makeBase() : undefined);
const browser = await pw.chromium.launch();
const cloud = makeCloud();
const VPS = [{ w: 390, h: 844 }, { w: 820, h: 1180 }, { w: 1440, h: 900 }];
const noteCount = (d) => on(d, () => DB.articles.filter((a) => !String(a.id).startsWith('kb-')).length);
const goneBy = (name) => cloud.log.filter((o) => o.t === 'set' && o.gone && o.dev === name).length;
const rdOn = (d) => on(d, () => !!(_s1Stat.rd && _s1Stat.rd.on));
const errs = [];
let A = null, B = null;
try {
  const seed = bigSeed(), want = seed.articles.length;
  A = await addDevice(browser, srv.base, cloud, 'A', { width: 1440, height: 900 }, false, seed, { recsOnly: true });
  check(await waitSeeded(cloud, A, 90000), `111 setup: device A wrote its ${want} notes to the per-record copy`);
  B = await addDevice(browser, srv.base, cloud, 'B', { width: 1440, height: 900 }, false, seedDB(), { recsOnly: true });
  let t0 = Date.now(); while (Date.now() - t0 < 60000 && (await noteCount(B)) < want) await sleep(300);
  check((await noteCount(B)) === want, `111 setup: device B caught up (${await noteCount(B)} of ${want} notes)`);
  await quiet(cloud, B);
  const gone0 = goneBy('B');

  /* 111a — the batched load equals what the database holds */
  const la = await on(B, async () => {
    const db = await new Promise((ok) => { const o = indexedDB.open('siyagah-s1-v1'); o.onsuccess = () => ok(o.result); o.onerror = () => ok(null); });
    const all = await new Promise((ok) => { const tx = db.transaction(['recs', 'meta'], 'readonly'); const k = tx.objectStore('recs').getAllKeys(IDBKeyRange.bound('nb-s1|', 'nb-s1|￿')), c = tx.objectStore('meta').get('cursor|nb-s1'); tx.oncomplete = () => ok({ keys: k.result.map(String), cursor: c.result }); });
    db.close();
    window.__s1LoadStep = 37; const prog = {};
    const L = await _s1RepLoad('nb-s1', prog); window.__s1LoadStep = 0;
    if (!L) return { why: 'load returned ' + L };
    const want = all.keys.map((k) => k.slice('nb-s1|'.length)).sort(), got = [...L.map.keys()].sort();
    let same = want.length === got.length && want.every((k, i) => k === got[i]);
    if (same) for (const k of got) { if (JSON.stringify(L.map.get(k)) !== JSON.stringify(_s1Rep.map.get(k))) { same = k; break; } }
    return { n: got.length, dbN: want.length, same, cursor: L.cursor, dbCursor: all.cursor, step: prog.step, progN: prog.n };
  });
  check(la && la.same === true && la.n > 200 && la.cursor === la.dbCursor && la.step === 'done' && la.progN === la.n, `111a the replica loads in batches of 37 into exactly what the database holds (${JSON.stringify(la)})`);

  /* 111b — a reload starts the reader from the batched load */
  await B.ctx.addInitScript(() => { window.__s1LoadStep = 37; });
  await reopen(B);
  t0 = Date.now(); while (Date.now() - t0 < 30000 && !(await rdOn(B))) await sleep(200);
  check((await rdOn(B)) && (await noteCount(B)) === want, `111b after a reload the reader is on and every note is there (${await noteCount(B)} of ${want})`, await on(B, () => _s1DiagText()));

  /* 111c — an open of the replica that never answers (the first two opens of this page) */
  await B.ctx.addInitScript(() => {
    window.__s1OpenMs = 2500; window.__s1OpenRetryMs = 3000;
    let hang = 1; const real = indexedDB.open.bind(indexedDB);
    indexedDB.open = function (name, v) { if (name === 'siyagah-s1-v1' && hang > 0) { hang--; return {}; } return real(name, v); };
  });
  await reopen(B);
  await sleep(1200);
  const dWait = await on(B, () => _s1DiagText());
  check(/starting: opening the device copy \(for \d+ s\)/.test(dWait), '111c while the open hangs, Diagnostics say "starting: opening the device copy (for N s)"', dWait);
  t0 = Date.now(); let dGave = ''; while (Date.now() - t0 < 6000) { dGave = await on(B, () => _s1DiagText()); if (/did not open/.test(dGave)) break; await sleep(200); }
  check(/did not open/.test(dGave) && !/no-indexeddb/.test(dGave), '111c after the time limit Diagnostics say the device copy did not open (not "no IndexedDB")', dGave);

  /* 111d — the retry opens it */
  t0 = Date.now(); while (Date.now() - t0 < 20000 && !(await rdOn(B))) await sleep(200);
  check((await rdOn(B)) && (await noteCount(B)) === want, `111d the retry opened it: the reader is on with every note (${await noteCount(B)} of ${want})`, await on(B, () => _s1DiagText()));
  await quiet(cloud, B);
  check(goneBy('B') === gone0, `111d B wrote no "gone" record (${goneBy('B') - gone0} new)`);

  /* 111e — the wording of each starting step */
  const words = await on(B, () => {
    const keep = _s1Stat.rd, out = [];
    for (const L of [{ step: 'open' }, { step: 'read', n: 1234 }, { step: 'done' }]) { _s1Stat.rd = { on: false, reason: 'starting', load: { ...L, since: Date.now() - 65000, stepAt: Date.now() - 65000 } }; out.push(_s1DiagText()); }
    _s1Stat.rd = keep; return out;
  });
  check(/opening the device copy \(for 1 min\)/.test(words[0]) && /reading the device copy, 1,234 records so far/.test(words[1]) && /connecting to the cloud/.test(words[2]), '111e the starting text names the step, the count and the time', words.join(' | '));

  /* 111f — the Diagnostics line, from the real menu, at each size */
  for (const vp of VPS) {
    await B.page.setViewportSize({ width: vp.w, height: vp.h }); await sleep(300);
    const r = await B.page.evaluate(async () => {
      try { closeModal(); } catch (e) {}
      if (window.innerWidth < 640 && typeof showPane === 'function') showPane('sb');
      document.getElementById('sb-menu-btn').click(); await new Promise((ok) => setTimeout(ok, 200));
      const dot = document.getElementById('sync-dot'); if (!dot) return { why: 'no sync-dot' };
      dot.click(); await new Promise((ok) => setTimeout(ok, 300));
      const dg = document.getElementById('sync-diag'); if (!dg) return { why: 'no diagnostics' };
      const row = [...dg.querySelectorAll('*')].find((e) => e.children.length === 0 && /Per-note copy/.test(e.textContent));
      const box = row && row.closest('tr,div') || row; if (!box) return { why: 'no Per-note copy row' };
      box.scrollIntoView({ block: 'center' }); await new Promise((ok) => setTimeout(ok, 100));
      const rc = box.getBoundingClientRect();
      return { inView: rc.width > 0 && rc.left >= 0 && rc.right <= innerWidth + 1 && rc.top >= 0 && rc.bottom <= innerHeight, text: box.textContent.slice(0, 120) };
    });
    check(r.inView && /on ·/.test(r.text || ''), `111f@${vp.w} the Per-note copy line is in Diagnostics, from ⚙ → ☁ (${JSON.stringify(r)})`);
    await B.page.evaluate(() => { try { closeModal(); } catch (e) {} });
  }
  errs.push(...A.errors, ...B.errors);
  check(errs.length === 0, '111f no page errors', errs.slice(0, 3).join(' · '));
} catch (e) { check(false, `111 threw: ${String(e && e.message || e).split('\n')[0]}`); }
finally { await browser.close(); srv.close && srv.close(); }
const fails = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - fails}/${results.length} passed${fails ? ', ' + fails + ' FAILED' : ''}`);
process.exit(fails ? 1 : 0);
