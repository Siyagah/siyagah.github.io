#!/usr/bin/env node
/* tools/reread-r2.mjs — v05.43, R2 (PCF J65): a device whose per-record replica holds only a few records while its cursor has moved past
   the rest never received them again (the owner's laptop: 16 of 12,500 records, an empty notebook, "Live"). Checks 102a–102e:
   102a device B catches up normally; 102b after B loses its own copy and its replica is cut to 16 records (cursor kept), the next start
   reads the whole notebook again and B has every note; 102c B never writes a `gone` record; 102d "⟳ Read everything again" is reached
   from the real ⚙ menu at 390 / 820 / 1440 and works; 102e no page errors.
   `node tools/reread-r2.mjs [--unpatched]`: --unpatched serves the build before this round (102b must fail there). */
import { playwright, serve, seedDB } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, quiet, waitSeeded, check, results, reopen } from './s1-fake.mjs';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
function makeBase() {
  const dir = mkdtempSync(join(tmpdir(), 'reread-base-'));
  const sha = execFileSync('git', ['log', '--format=%H', '-n', '1', '--grep=v05.43 R2: version bump'], { encoding: 'utf8' }).trim();
  if (!sha) throw new Error('the v05.43 version-bump commit was not found (shallow clone? git fetch --unshallow)');
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', `${sha}~1:${f}`], { encoding: 'buffer', maxBuffer: 1 << 28 })); } catch {} }
  return dir;
}
const N = 200;
function bigSeed() {
  const db = seedDB(), a0 = db.articles[0];
  for (let i = 0; i < N; i++) db.articles.push({ ...a0, id: 'rr-n' + i, title: 'Note ' + i, content: '<p>text ' + i + '</p>', folderIds: [...a0.folderIds], tags: [] });
  return db;
}
const pw = await playwright();
const srv = await serve(argv.includes('--unpatched') ? makeBase() : undefined);
const browser = await pw.chromium.launch();
const cloud = makeCloud();
const VPS = [{ w: 390, h: 844, touch: true }, { w: 820, h: 1180, touch: true }, { w: 1440, h: 900, touch: false }];
const noteCount = (d) => on(d, () => DB.articles.filter((a) => !String(a.id).startsWith('kb-')).length);
const goneBy = (name) => cloud.log.filter((o) => o.t === 'set' && o.gone && o.dev === name).length;
const errs = [];
let A = null, B = null;
try {
  const seed = bigSeed(), want = seed.articles.length;
  A = await addDevice(browser, srv.base, cloud, 'A', { width: 1440, height: 900 }, false, seed, { recsOnly: true });
  check(await waitSeeded(cloud, A, 90000), `102 setup: device A wrote its ${want} notes to the per-record copy`);
  B = await addDevice(browser, srv.base, cloud, 'B', { width: 1440, height: 900 }, false, seedDB(), { recsOnly: true });
  const t0 = Date.now(); while (Date.now() - t0 < 60000 && (await noteCount(B)) < want) await sleep(300);
  check((await noteCount(B)) === want, `102a device B caught up normally (${await noteCount(B)} of ${want} notes)`);
  await quiet(cloud, B);
  const gone0 = goneBy('B');

  /* B loses its own copy (both local databases and the localStorage copy); its replica keeps 16 records and its cursor */
  await B.page.goto(srv.base + '/manifest.json');
  const cut = await B.page.evaluate(async () => {
    const del = (n) => new Promise((ok) => { const r = indexedDB.deleteDatabase(n); r.onsuccess = r.onerror = r.onblocked = () => ok(); });
    await del('siyagah-local-v1'); await del('siyagah-localrecs-v1');
    try { localStorage.removeItem('my-notebook-v1'); } catch (e) {}
    return await new Promise((ok) => {
      const o = indexedDB.open('siyagah-s1-v1');
      o.onsuccess = () => {
        const db = o.result, tx = db.transaction(['recs', 'meta'], 'readwrite'), st = tx.objectStore('recs'); let kept = 0, cut = 0, cursor = null;
        tx.objectStore('meta').get('cursor|nb-s1').onsuccess = (e) => { cursor = e.target.result; };
        st.openCursor().onsuccess = (e) => { const c = e.target.result; if (!c) return; const k = String(c.key); if (k.endsWith('|_head~0') || kept < 16) { kept++; } else { c.delete(); cut++; } c.continue(); };
        tx.oncomplete = () => { db.close(); ok({ kept, cut, cursor }); };
      };
      o.onerror = () => ok(null);
    });
  });
  check(!!cut && cut.cut > 100 && cut.cursor > 0, `102 setup: B's own copy removed, its replica cut to ${cut && cut.kept} records (cursor kept: ${cut && cut.cursor})`);
  await B.page.goto(srv.base + '/', { waitUntil: 'domcontentloaded' });
  B.qsubs.clear(); B.qDelivered = 0; B.qChangeLog = [];
  await B.page.waitForFunction(() => window.__appBooted === true, null, { timeout: 60000 });
  const t1 = Date.now(); while (Date.now() - t1 < 60000 && (await noteCount(B)) < want) await sleep(300);
  const got = await noteCount(B), diag = await on(B, () => _s1DiagText());
  check(got === want, `102b after the restart B read the whole notebook again: ${got} of ${want} notes`, diag);
  check(/reading everything again/.test(diag), '102b the Cloud Sync diagnostics say the notebook is being read again', diag);
  await quiet(cloud, B);
  check(goneBy('B') === gone0, `102c B wrote no "gone" record (${goneBy('B') - gone0} new)`);

  /* 102d — the button, from the real menu, at each size */
  for (const vp of VPS) {
    await B.page.setViewportSize({ width: vp.w, height: vp.h }); await sleep(300);
    const r = await B.page.evaluate(async () => {
      closeModal && closeModal();
      const mb = document.getElementById('sb-menu-btn');
      if (window.innerWidth < 640 && typeof showPane === 'function') showPane('sb');
      mb.click(); await new Promise((ok) => setTimeout(ok, 200));
      const dot = document.getElementById('sync-dot'); if (!dot) return { why: 'no sync-dot' };
      dot.click(); await new Promise((ok) => setTimeout(ok, 300));
      const b = document.getElementById('s1-reread-btn'); if (!b) return { why: 'no button' };
      b.scrollIntoView({ block: 'center' }); await new Promise((ok) => setTimeout(ok, 100));
      const rc = b.getBoundingClientRect();
      const inView = rc.width > 0 && rc.left >= 0 && rc.right <= innerWidth && rc.top >= 0 && rc.bottom <= innerHeight;
      const hit = document.elementFromPoint(rc.left + rc.width / 2, rc.top + rc.height / 2);
      return { inView, onTop: !!hit && (hit === b || b.contains(hit)), w: Math.round(rc.width), h: Math.round(rc.height) };
    });
    check(r.inView && r.onTop, `102d@${vp.w} "⟳ Read everything again" is reached from ⚙ → ☁ and can be tapped (${JSON.stringify(r)})`);
    if (vp.w === 1440 && r.inView) {
      await B.page.click('#s1-reread-btn'); await sleep(1500);
      const t2 = Date.now(); while (Date.now() - t2 < 60000 && !(await on(B, () => _s1RdCaught))) await sleep(300);
      const d2 = await on(B, () => _s1DiagText()), n2 = await noteCount(B);
      check(/reading everything again/.test(d2) && n2 === want, `102d@1440 the button reads again and every note stays (${n2} of ${want})`, d2);
      await quiet(cloud, B);
      check(goneBy('B') === gone0, `102d@1440 still no "gone" record from B (${goneBy('B') - gone0} new)`);
    }
    await B.page.evaluate(() => { try { closeModal(); } catch (e) {} });
  }
  errs.push(...A.errors, ...B.errors);
  check(errs.length === 0, '102e no page errors', errs.slice(0, 3).join(' · '));
} catch (e) { check(false, `102 threw: ${String(e && e.message || e).split('\n')[0]}`); }
finally { await browser.close(); srv.close && srv.close(); }
const fails = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - fails}/${results.length} passed${fails ? ', ' + fails + ' FAILED' : ''}`);
process.exit(fails ? 1 : 0);
