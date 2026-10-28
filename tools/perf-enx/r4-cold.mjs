/* tools/perf-enx/r4-cold.mjs — J08 round 4: a COLD read (a fresh browser, as at a real start) of the device copy in three forms:
   obj = the `notebook` record as it is today; one = the notebook as one JSON string; b<N> = records in N string pieces (by id hash).
     PERF_PROFILE=… node r4-cold.mjs [--vp=phone] [--runs=2] [--buckets=64] */
import { serveFixed, launch, PROFILE, DIR, med } from './common.mjs';
import { cpSync, rmSync } from 'node:fs';
const argv = process.argv.slice(2);
const arg = (k, d) => { const a = argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const RUNS = +arg('runs', 2), NB = +arg('buckets', 64);
const VPS = [{ name: 'laptop', w: 1440, h: 900, th: 1 }, { name: 'phone', w: 390, h: 844, th: 4, touch: true }].filter((v) => !arg('vp') || v.name === arg('vp'));
const srv = await serveFixed();
const P0 = DIR + 'profile-r4c';
rmSync(P0, { recursive: true, force: true }); cpSync(PROFILE, P0, { recursive: true });
{ /* build the scratch forms once */
  const { ctx, page } = await launch(P0); page.setDefaultTimeout(600000);
  await page.goto(srv.base + '/'); await page.waitForFunction(() => window.__appBooted === true, null, { timeout: 600000 });
  const r = await page.evaluate(async (NB) => {
    const sdb = await new Promise((ok) => { const q = indexedDB.open('r4-scratch', 1); q.onupgradeneeded = () => q.result.createObjectStore('kv'); q.onsuccess = () => ok(q.result); });
    const h = (s) => { let x = 2166136261; for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 16777619); return (x >>> 0) % NB; };
    const B = Array.from({ length: NB }, () => []);
    ['articles', 'folders', 'trash'].forEach((c) => (DB[c] || []).forEach((a, i) => B[h(c + (a.id || i))].push(JSON.stringify(a))));
    const t0 = performance.now(); let worst = 0;
    const tx = sdb.transaction('kv', 'readwrite'); const st = tx.objectStore('kv');
    B.forEach((b, i) => { const s = performance.now(); st.put('[' + b.join(',') + ']', 'b' + i); worst = Math.max(worst, performance.now() - s); });
    /* the same pieces as OBJECTS (arrays of records), 64 and 256 of them; and the cost of writing ONE piece */
    const ow = {};
    for (const M of [NB, NB * 4]) { const O = Array.from({ length: M }, () => []); ['articles', 'folders', 'trash'].forEach((c) => (DB[c] || []).forEach((a, i) => O[(h(c + (a.id || i)) * 0 + (function (s) { let x = 2166136261; for (let j = 0; j < s.length; j++) x = Math.imul(x ^ s.charCodeAt(j), 16777619); return x >>> 0; })(c + (a.id || i))) % M].push(a)));
      let w = 0; O.forEach((b, i) => { const s = performance.now(); st.put(b, 'o' + M + '-' + i); w = Math.max(w, performance.now() - s); }); ow[M] = Math.round(w); }
    st.put(JSON.stringify(DB), 'one');
    await new Promise((ok) => (tx.oncomplete = ok));
    return { ow, sizes: B.map((b) => b.reduce((s, x) => s + x.length, 0)).sort((a, b) => b - a).slice(0, 3), ms: Math.round(performance.now() - t0) };
  }, NB);
  console.log('built', JSON.stringify(r)); await ctx.close();
}
const FORMS = (arg('forms', '') || ['obj', 'o' + NB, 'o' + NB * 4].join(',')).split(',');
for (const vp of VPS) for (const form of FORMS) {
  const rows = [];
  for (let run = 0; run < RUNS; run++) {
    const P = DIR + 'profile-r4c-run'; rmSync(P, { recursive: true, force: true }); cpSync(P0, P, { recursive: true });
    const { ctx, page } = await launch(P, { w: vp.w, h: vp.h, touch: !!vp.touch }); page.setDefaultTimeout(600000);
    await page.goto(srv.base + '/blank.txt');
    const cdp = await ctx.newCDPSession(page);
    if (vp.th > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: vp.th });
    const r = await page.evaluate(async ({ form, NB }) => {
      const longs = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => longs.push(Math.round(e.duration)))).observe({ type: 'longtask' });
      const open = (n) => new Promise((ok) => { const q = indexedDB.open(n); q.onsuccess = () => ok(q.result); });
      const get = (db, s, k) => new Promise((ok) => { const q = db.transaction(s).objectStore(s).get(k); q.onsuccess = () => ok(q.result); });
      const t0 = performance.now(); let n = 0, worst = 0;
      if (form === 'obj') { const db = await open('siyagah-local-v1'); const s = performance.now(); const v = await get(db, 'kv', 'notebook'); n = v.articles.length; worst = performance.now() - s; }
      else if (form === 'one') { const db = await open('r4-scratch'); const s = performance.now(); const v = await get(db, 'kv', 'one'); const o = JSON.parse(v); n = o.articles.length; worst = performance.now() - s; }
      else if (form[0] === 'p') { const M = +form.slice(1); const db = await open('r4-scratch'); const st = db.transaction('kv').objectStore('kv');
        await new Promise((ok) => { let left = M; for (let i = 0; i < M; i++) { const q = st.get('o' + M + '-' + i); q.onsuccess = () => { const s = performance.now(); n += q.result.length; worst = Math.max(worst, performance.now() - s); if (!--left) ok(); }; } }); }
      else if (form[0] === 'o') { const M = +form.slice(1); const db = await open('r4-scratch'); for (let i = 0; i < M; i++) { const s = performance.now(); const v = await get(db, 'kv', 'o' + M + '-' + i); n += v.length; worst = Math.max(worst, performance.now() - s); await new Promise((r) => setTimeout(r, 0)); } }
      else { const db = await open('r4-scratch'); for (let i = 0; i < NB; i++) { const s = performance.now(); const v = await get(db, 'kv', 'b' + i); n += JSON.parse(v).length; worst = Math.max(worst, performance.now() - s); await new Promise((r) => setTimeout(r, 0)); } }
      await new Promise((r) => setTimeout(r, 300));
      return { ms: Math.round(performance.now() - t0 - 300), n, worstStep: Math.round(worst), longMax: Math.max(0, ...longs) };
    }, { form, NB: +form.slice(1) || NB });
    rows.push(r); await ctx.close();
  }
  console.log(vp.name, form, JSON.stringify(rows));
}
await srv.close();
