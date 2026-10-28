/* tools/perf-enx/r4-prime.mjs — J08 R4: copy the seeded profile to <PERF_PROFILE>-r4 and start it once with this build, so the copy
   holds the pieces (as a device does after its first run of v05.57). Then: PERF_PROFILE=<…>-r4 node boot.mjs */
import { serveFixed, launch, PROFILE } from './common.mjs';
import { cpSync, rmSync } from 'node:fs';
const OUT = PROFILE + '-r4';
rmSync(OUT, { recursive: true, force: true }); cpSync(PROFILE, OUT, { recursive: true });
const srv = await serveFixed();
const { ctx, page } = await launch(OUT); page.setDefaultTimeout(600000);
await page.goto(srv.base + '/'); await page.waitForFunction(() => window.__appBooted === true);
const r = await page.evaluate(async () => { const v = _lpStat.via; await _ljChain.catch(() => {}); const w = await _ljCheckpoint(); return { via: v, wrote: w, N: _lpN, stat: _lpStat }; });
console.log(JSON.stringify(r));
await ctx.close(); await srv.close();
