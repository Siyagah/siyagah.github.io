/* tools/perf-enx/r4-hidden.mjs — J08 R4 (rebuilt): what saving costs on the screen while the app is in use, before/after.
     PERF_PROFILE=… [PERF_APP=<other build>] node r4-hidden.mjs [--vp=phone|laptop] [--runs=2] [--wait=12]
   Per run: start, wait for the start's own work, then on a VISIBLE page (a) edit 1 note and save, then wait --wait s with _LJ_CKPT_MS
   cut to 2 s (v05.56's 10-minute timer, shortened so it fires in the run); (b) edit 3,000 notes and save (v05.56 starts a checkpoint
   after 3,000 puts), then wait --wait s. Prints the checkpoints that ran and the longest task / total long tasks after each save's own
   task; then (c) hides the page and times the checkpoint it makes there (the same in both builds: the full copy, off screen). */
import { serveFixed, launch, PROFILE, DIR } from './common.mjs';
import { cpSync, rmSync } from 'node:fs';
const argv = process.argv.slice(2);
const arg = (k, d) => { const a = argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const RUNS = +arg('runs', 2), WAIT = +arg('wait', 12);
const VPS = [{ name: 'laptop', w: 1440, h: 900, th: 1 }, { name: 'phone', w: 390, h: 844, th: 4, touch: true }].filter((v) => !arg('vp') || v.name === arg('vp'));
const srv = await serveFixed();
for (const vp of VPS) for (let run = 0; run < RUNS; run++) {
  const P = DIR + 'profile-r4h'; rmSync(P, { recursive: true, force: true }); cpSync(PROFILE, P, { recursive: true });
  const { ctx, page } = await launch(P, { w: vp.w, h: vp.h, touch: !!vp.touch }); page.setDefaultTimeout(900000);
  await page.goto(srv.base + '/'); await page.waitForFunction(() => window.__appBooted === true);
  await page.evaluate(async () => { await _ljChain.catch(() => {}); });
  await page.waitForTimeout(8000);
  const cdp = await ctx.newCDPSession(page);
  if (vp.th > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: vp.th });
  const r = await page.evaluate(async (WAIT) => {
    const out = {}, L = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => L.push(Math.round(e.duration)))).observe({ type: 'longtask' });
    _LJ_CKPT_MS = 2000;
    const one = async (n) => {
      for (let i = 0; i < n; i++) { const a = DB.articles[(i * 7) % DB.articles.length]; a.title = (a.title || '') + ' ·'; a.updatedAt = new Date(Date.now() + i).toISOString(); }
      const f0 = _ljStat.full; L.length = 0;
      const t0 = performance.now(); persist(); const saveSync = Math.round(performance.now() - t0);
      await _ljChain.catch(() => {}); await new Promise((r) => setTimeout(r, WAIT * 1000)); await _ljChain.catch(() => {});
      const after = L.slice(1);
      return { saveSync, ckpts: _ljStat.full - f0, worstAfterSave: Math.max(0, ...after), sumAfterSave: after.reduce((s, x) => s + x, 0), top: L.slice().sort((x, y) => y - x).slice(0, 4) };
    };
    out.one = await one(1); out.k3 = await one(3000);
    const f0 = _ljStat.full; L.length = 0; const t0 = performance.now();
    Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange'));
    while (_ljStat.full === f0 && performance.now() - t0 < 120000) await new Promise((r) => setTimeout(r, 50));
    await _ljChain.catch(() => {});
    out.hidden = { ms: Math.round(performance.now() - t0), worst: Math.max(0, ...L) };
    return out;
  }, WAIT);
  console.log(vp.name, 'run' + run, JSON.stringify(r));
  await ctx.close();
}
await srv.close();
