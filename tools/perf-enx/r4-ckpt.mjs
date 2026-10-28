/* tools/perf-enx/r4-ckpt.mjs — J08 R4: what a checkpoint (the journal's copy of the whole notebook) costs on the screen, before/after.
     PERF_PROFILE=… [PERF_APP=<other build>] node r4-ckpt.mjs [--vp=phone|laptop] [--runs=2]
   Per run: start, wait for the start's own work, then (a) edit 1 note, save, checkpoint; (b) edit 3,000 notes, save, checkpoint.
   Prints each checkpoint's time to done and the longest task / total long tasks while it ran. */
import { serveFixed, launch, PROFILE, DIR, med } from './common.mjs';
import { cpSync, rmSync } from 'node:fs';
const argv = process.argv.slice(2);
const arg = (k, d) => { const a = argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const RUNS = +arg('runs', 2);
const VPS = [{ name: 'laptop', w: 1440, h: 900, th: 1 }, { name: 'phone', w: 390, h: 844, th: 4, touch: true }].filter((v) => !arg('vp') || v.name === arg('vp'));
const srv = await serveFixed();
for (const vp of VPS) for (let run = 0; run < RUNS; run++) {
  const P = DIR + 'profile-r4'; rmSync(P, { recursive: true, force: true }); cpSync(PROFILE, P, { recursive: true });
  const { ctx, page } = await launch(P, { w: vp.w, h: vp.h, touch: !!vp.touch }); page.setDefaultTimeout(900000);
  await ctx.addInitScript(() => { window.__lpFirstMs = 1e9; });
  await page.goto(srv.base + '/'); await page.waitForFunction(() => window.__appBooted === true);
  /* a build with pieces: write them first (a device after its first run); then wait for the start's own work */
  await page.evaluate(async () => { await _ljChain.catch(() => {}); if (typeof _lpWrite === 'function') await _ljCheckpoint(); });
  await page.waitForTimeout(8000);
  const cdp = await ctx.newCDPSession(page);
  if (vp.th > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: vp.th });
  const r = await page.evaluate(async () => {
    const out = {};
    const L = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => L.push(Math.round(e.duration)))).observe({ type: 'longtask' });
    const one = async (n) => {
      for (let i = 0; i < n; i++) { const a = DB.articles[(i * 7) % DB.articles.length]; a.title = (a.title || '') + ' ·'; a.updatedAt = new Date(Date.now() + i).toISOString(); }
      if (n < 3000) {
        persist(); await _ljChain.catch(() => {}); await new Promise((r) => setTimeout(r, 1500));
        L.length = 0; const t0 = performance.now();
        const p = _ljCheckpoint(); if (p && p.then) await p; else { await new Promise((r) => setTimeout(r, 50)); await _ljChain.catch(() => {}); }
        await new Promise((r) => setTimeout(r, 300));
        return { ms: Math.round(performance.now() - t0 - 300), worst: Math.max(0, ...L), sum: L.reduce((s, x) => s + x, 0) };
      }
      /* 3,000 changed notes start a checkpoint by themselves (_LJ_CKPT_PUTS): the save's own task first, then that checkpoint */
      const f0 = _ljStat.full; L.length = 0; const t0 = performance.now(); persist(); const tSave = Math.round(performance.now() - t0);
      while (_ljStat.full === f0 && performance.now() - t0 < 120000) await new Promise((r) => setTimeout(r, 100));
      await _ljChain.catch(() => {}); await new Promise((r) => setTimeout(r, 300));
      const after = L.slice(1);
      return { ms: Math.round(performance.now() - t0 - 300), saveTask: L[0], saveSync: tSave, worstAfterSave: Math.max(0, ...after), sumAfterSave: after.reduce((s, x) => s + x, 0), top: L.slice().sort((x, y) => y - x).slice(0, 5) };
    };
    out.one = await one(1); out.k3 = await one(3000);
    return out;
  });
  console.log(vp.name, 'run' + run, JSON.stringify(r));
  await ctx.close();
}
await srv.close();
