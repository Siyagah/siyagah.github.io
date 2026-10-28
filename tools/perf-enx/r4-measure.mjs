/* tools/perf-enx/r4-measure.mjs — J08 round 4: the device copy's cost at the owner's size, measured before building.
     PERF_PROFILE=… node r4-measure.mjs [--vp=laptop|phone] [--runs=3]
   Per run, in the booted app: (1) the checkpoint (put of the whole notebook object: the main-thread part and until committed);
   (2) reading it back (the start's read); (3) the same notebook as one JSON string per record in a scratch database: writing all,
   reading all (getAll) and parsing; (4) writing 1 changed note as a string. Nothing here touches the app's own databases but (1)'s
   put, which writes what the app already holds. */
import { serveFixed, launch, PROFILE, DIR, med } from './common.mjs';
import { cpSync, rmSync } from 'node:fs';
const argv = process.argv.slice(2);
const arg = (k, d) => { const a = argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const RUNS = +arg('runs', 3);
const VPS = [{ name: 'laptop', w: 1440, h: 900, th: 1 }, { name: 'phone', w: 390, h: 844, th: 4, touch: true }].filter((v) => !arg('vp') || v.name === arg('vp'));
const srv = await serveFixed();
for (const vp of VPS) {
  const rows = [];
  for (let run = 0; run < RUNS; run++) {
    const P = DIR + 'profile-r4'; rmSync(P, { recursive: true, force: true }); cpSync(PROFILE, P, { recursive: true });
    const { ctx, page } = await launch(P, { w: vp.w, h: vp.h, touch: !!vp.touch }); page.setDefaultTimeout(600000);
    await page.goto(srv.base + '/'); await page.waitForFunction(() => window.__appBooted === true, null, { timeout: 600000 });
    await new Promise((r) => setTimeout(r, 3000));
    const cdp = await ctx.newCDPSession(page);
    if (vp.th > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: vp.th });
    const r = await page.evaluate(async () => {
      const out = {}; const now = () => performance.now();
      const longs = []; const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => longs.push(Math.round(e.duration)))); po.observe({ type: 'longtask' });
      const idb = await _idbOpen();
      /* (1) checkpoint */
      let t0 = now(); let t1;
      await new Promise((ok, no) => { const tx = idb.transaction(IDB_STORE, 'readwrite'); tx.objectStore(IDB_STORE).put(DB, IDB_KEY); t1 = now(); tx.oncomplete = ok; tx.onerror = no; });
      out.ckptSync = Math.round(t1 - t0); out.ckptAll = Math.round(now() - t0);
      /* (2) read back */
      t0 = now(); await new Promise((ok) => { const q = idb.transaction(IDB_STORE).objectStore(IDB_STORE).get(IDB_KEY); q.onsuccess = () => { const v = q.result; out.readN = v.articles.length; t1 = now(); ok(v); }; });
      out.readObj = Math.round(t1 - t0);
      /* (3) one string per record */
      await new Promise((ok) => { const d = indexedDB.deleteDatabase('r4-scratch'); d.onsuccess = d.onerror = d.onblocked = ok; });
      const sdb = await new Promise((ok) => { const q = indexedDB.open('r4-scratch', 1); q.onupgradeneeded = () => q.result.createObjectStore('kv'); q.onsuccess = () => ok(q.result); });
      t0 = now(); const ent = []; DB.articles.forEach((a) => ent.push(['r:articles~' + a.id, JSON.stringify(a)])); DB.folders.forEach((a) => ent.push(['r:folders~' + a.id, JSON.stringify(a)]));
      out.stringify = Math.round(now() - t0); out.n = ent.length; out.mb = Math.round(ent.reduce((s, e) => s + e[1].length, 0) / 1e6);
      t0 = now(); await new Promise((ok) => { const tx = sdb.transaction('kv', 'readwrite'); const st = tx.objectStore('kv'); ent.forEach((e) => st.put({ s: 1, j: e[1] }, e[0])); t1 = now(); tx.oncomplete = ok; });
      out.strWriteSync = Math.round(t1 - t0); out.strWriteAll = Math.round(now() - t0);
      t0 = now(); const vs = await new Promise((ok) => { const q = sdb.transaction('kv').objectStore('kv').getAll(); q.onsuccess = () => { const v = q.result; v.length; t1 = now(); ok(v); }; });
      out.strRead = Math.round(t1 - t0);
      /* the same, read in batches of 500 (each its own request, a macrotask between): total and worst batch */
      t0 = now(); { let lo = null, got = 0, w = 0; for (;;) { const s0 = now(); const b = await new Promise((ok) => { const q = sdb.transaction('kv').objectStore('kv').getAll(lo == null ? null : IDBKeyRange.lowerBound(lo, true), 500); q.onsuccess = () => ok(q.result); }); const k = await new Promise((ok) => { const q = sdb.transaction('kv').objectStore('kv').getAllKeys(lo == null ? null : IDBKeyRange.lowerBound(lo, true), 500); q.onsuccess = () => ok(q.result); }); b.length; w = Math.max(w, now() - s0); got += b.length; if (b.length < 500) break; lo = k[k.length - 1]; await new Promise((r) => setTimeout(r, 0)); } out.strBatch = Math.round(now() - t0); out.strBatchN = got; }
      /* parse in 25 ms slices with a macrotask between: total time and the worst slice */
      t0 = now(); let i = 0, worst = 0; const objs = new Array(vs.length);
      while (i < vs.length) { const s = now(); while (i < vs.length && now() - s < 25) { objs[i] = JSON.parse(vs[i].j); i++; } worst = Math.max(worst, now() - s); await new Promise((r) => setTimeout(r, 0)); }
      out.parseSliced = Math.round(now() - t0); out.parseWorst = Math.round(worst);
      /* (4) one changed note */
      const a = DB.articles[100]; t0 = now(); await new Promise((ok) => { const tx = sdb.transaction('kv', 'readwrite'); tx.objectStore('kv').put({ s: 2, j: JSON.stringify(a) }, 'r:articles~' + a.id); tx.oncomplete = ok; });
      out.one = Math.round(now() - t0);
      sdb.close(); await new Promise((ok) => { const d = indexedDB.deleteDatabase('r4-scratch'); d.onsuccess = d.onerror = d.onblocked = ok; });
      po.disconnect(); out.longMax = Math.max(0, ...longs);
      return out;
    });
    console.log(vp.name, run, JSON.stringify(r)); rows.push(r);
    await ctx.close();
  }
  const keys = Object.keys(rows[0]); console.log(vp.name, 'MEDIAN', JSON.stringify(Object.fromEntries(keys.map((k) => [k, med(rows.map((x) => x[k]))]))));
}
await srv.close();
