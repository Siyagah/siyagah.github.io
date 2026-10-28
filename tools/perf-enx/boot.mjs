/* tools/perf-enx/boot.mjs — J08 round 3: what a start costs at the owner's size (build the profile first: PERF_PROFILE=… node seed.mjs --enx=26500 --plain=500).
     node boot.mjs [--runs=3] [--vp=laptop|phone] [--after=15]
   Per run: a fresh copy of the seeded profile, a CPU profile from navigation to booted, and from booted for --after seconds (the work the start leaves behind).
   Prints: first paint, the first note card / side pane on screen, booted, long tasks before and after, and the functions that cost the most in each part. */
import { serveFixed, launch, PROFILE, DIR, med } from './common.mjs';
import { cpSync, rmSync } from 'node:fs';
const argv = process.argv.slice(2);
const arg = (k, d) => { const a = argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const RUNS = +arg('runs', 3), AFTER = +arg('after', 15);
const VPS = [{ name: 'laptop', w: 1440, h: 900, th: 1 }, { name: 'phone', w: 390, h: 844, th: 4, touch: true }].filter((v) => !arg('vp') || v.name === arg('vp'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function summ(prof, top = 15) {
  const byId = new Map(), parent = new Map();
  prof.nodes.forEach((n) => { byId.set(n.id, n); (n.children || []).forEach((c) => parent.set(c, n.id)); });
  const key = (n) => { const f = n.callFrame; return (f.functionName || '(anon)') + (f.lineNumber >= 0 && f.url ? ':' + (f.lineNumber + 1) : ''); };
  const self = new Map(), tot = new Map(); const td = prof.timeDeltas;
  for (let i = 0; i < prof.samples.length; i++) {
    const d = (td[i + 1] != null ? td[i + 1] : 0) / 1000; let id = prof.samples[i]; const k0 = key(byId.get(id));
    self.set(k0, (self.get(k0) || 0) + d); const seen = new Set();
    while (id != null) { const k = key(byId.get(id)); if (!seen.has(k)) { seen.add(k); tot.set(k, (tot.get(k) || 0) + d); } id = parent.get(id); }
  }
  const s = (m) => [...m].filter(([k]) => !/^\((idle|program|root)\)/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, top).map(([k, v]) => `${k} ${Math.round(v)}`);
  return { idle: Math.round(self.get('(idle)') || 0), self: s(self), total: s(tot) };
}
const INIT = () => {
  window.__bm = { long: [], card: null, tree: null, real: null };
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__bm.long.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ type: 'longtask', buffered: true }); } catch (e) {}
  const poll = () => {
    if (window.__bm.card == null && document.querySelector('#p2c .ar')) requestAnimationFrame(() => { window.__bm.card = Math.round(performance.now()); });
    if (window.__bm.tree == null && document.querySelector('#tree .sec')) requestAnimationFrame(() => { window.__bm.tree = Math.round(performance.now()); });
    if (window.__bm.real == null && typeof _dbLoaded !== 'undefined' && _dbLoaded && document.querySelector('#p2c .ar') && !document.documentElement.classList.contains('bv')) requestAnimationFrame(() => { window.__bm.real = Math.round(performance.now()); });
    if (window.__bm.card == null || window.__bm.tree == null || window.__bm.real == null) requestAnimationFrame(poll);
  };
  requestAnimationFrame(poll);
  let v; Object.defineProperty(window, '__appBooted', { configurable: true, get: () => v, set: (x) => { v = x; if (x) window.__bm.booted = Math.round(performance.now()); } });
};
const srv = await serveFixed();
for (const vp of VPS) {
  const rows = [];
  /* prime: one start at this screen size that leaves the page hidden, so the build under test keeps its last screen (v05.56); an older build keeps nothing */
  const P0 = DIR + 'profile-prime'; rmSync(P0, { recursive: true, force: true }); cpSync(PROFILE, P0, { recursive: true });
  { const { ctx, page } = await launch(P0, { w: vp.w, h: vp.h, touch: !!vp.touch }); page.setDefaultTimeout(300000);
    await page.goto(srv.base + '/'); await page.waitForFunction(() => window.__appBooted === true, null, { timeout: 300000 });
    /* the screen the owner leaves: a big imported folder open, a note open in it (on a phone, the note's pane) */
    await page.evaluate((phone) => { const c = new Map(); DB.articles.forEach((a) => { const f = a.folderIds && a.folderIds[0]; if (f) c.set(f, (c.get(f) || 0) + 1); }); const f = [...c].sort((x, y) => y[1] - x[1])[0][0]; let x = DB.folders.find((y) => y.id === f); while (x && x.parentId) { ST.exp[x.parentId] = true; x = DB.folders.find((y) => y.id === x.parentId); } selFolder(f); const a = DB.articles.find((n) => n.folderIds && n.folderIds[0] === f && n.content.length > 8000); selArt(a.id); if (phone) showPane('p3'); }, !!vp.touch);
    await sleep(2500);
    const kept = await page.evaluate(async () => { if (typeof _bvCapture !== 'function') return 'no boot view in this build'; _bvCapture(); await new Promise((r) => setTimeout(r, 1500)); const db = await _bvDb(); return await new Promise((r) => { const q = db.transaction('kv').objectStore('kv').get('last'); q.onsuccess = () => r(q.result ? Object.entries(q.result.el).map(([k, v]) => k + ':' + v.length).join(' ') : 'nothing kept'); }); });
    console.log(`${vp.name} prime: ${kept}`); await ctx.close(); }
  for (let run = 0; run < RUNS; run++) {
    const P = DIR + 'profile-run'; rmSync(P, { recursive: true, force: true }); cpSync(P0, P, { recursive: true });
    const { ctx, page, errors } = await launch(P, { w: vp.w, h: vp.h, touch: !!vp.touch });
    page.setDefaultTimeout(300000); await ctx.addInitScript(INIT);
    const cdp = await ctx.newCDPSession(page);
    await page.goto(srv.base + '/blank.txt');
    await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
    if (vp.th > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: vp.th });
    await cdp.send('Profiler.start');
    await page.goto(srv.base + '/', { waitUntil: 'commit' });
    await page.waitForFunction(() => window.__appBooted === true, null, { timeout: 300000, polling: 50 });
    const pb = summ((await cdp.send('Profiler.stop')).profile);
    const b = await page.evaluate(() => { const fcp = (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime; const L = window.__bm.long.map((x) => x[1]); return { fcp: Math.round(fcp || 0), tree: window.__bm.tree, card: window.__bm.card, real: window.__bm.real, booted: window.__bm.booted, worst: Math.max(0, ...L), longSum: L.reduce((a, c) => a + c, 0), notes: DB.articles.length }; });
    await page.evaluate(() => { window.__bm.mark = window.__bm.long.length; });
    await cdp.send('Profiler.start'); await sleep(AFTER * 1000);
    const pa = summ((await cdp.send('Profiler.stop')).profile);
    const a = await page.evaluate(() => { const L = window.__bm.long.slice(window.__bm.mark); return { n: L.length, worst: Math.max(0, ...L.map((x) => x[1])), sum: L.reduce((s, x) => s + x[1], 0), first: L.slice(0, 8) }; });
    rows.push({ ...b, after: a });
    console.log(`${vp.name} run${run}: ${b.notes} notes · first paint ${b.fcp} · side pane ${b.tree} · first card ${b.card} · real list ${b.real} · booted ${b.booted} ms · long tasks to booted: worst ${b.worst}, sum ${b.longSum} · next ${AFTER}s: ${a.n} long tasks, worst ${a.worst}, sum ${a.sum} ${JSON.stringify(a.first)}${errors.length ? ' · errors ' + errors.slice(0, 2) : ''}`);
    if (run === 0) { console.log('  BOOT total: ' + pb.total.join(' | ')); console.log('  BOOT self:  ' + pb.self.slice(0, 10).join(' | ')); console.log('  AFTER total: ' + pa.total.join(' | ')); }
    await ctx.close();
  }
  const g = (f) => med(rows.map(f));
  console.log(`MEDIAN ${vp.name}: first paint ${g((r) => r.fcp)} · side pane ${g((r) => r.tree)} · first card ${g((r) => r.card)} · real list ${g((r) => r.real)} · booted ${g((r) => r.booted)} · worst ${g((r) => r.worst)} · after: worst ${g((r) => r.after.worst)} sum ${g((r) => r.after.sum)}`);
}
rmSync(DIR + 'profile-run', { recursive: true, force: true }); rmSync(DIR + 'profile-prime', { recursive: true, force: true });
await srv.close();
