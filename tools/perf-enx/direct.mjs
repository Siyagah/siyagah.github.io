/* Direct timings of the suspects (not a click): the 30 s journal checkpoint, the picture-migration sweep, backlinks, counts.
     node direct.mjs                                                                                                  */
import { serveFixed, launch, PROFILE, DIR } from './common.mjs';
import { cpSync, rmSync } from 'node:fs';
const srv = await serveFixed();
for (const vp of [{ name: 'laptop', w: 1440, h: 900, th: 1 }, { name: 'phone', w: 390, h: 844, th: 4, touch: true }]) {
  const P = DIR + 'profile-direct'; rmSync(P, { recursive: true, force: true }); cpSync(PROFILE, P, { recursive: true });
  const { ctx, page } = await launch(P, vp); page.setDefaultTimeout(300000);
  const cdp = await ctx.newCDPSession(page);
  await page.goto(srv.base + '/'); await page.waitForFunction(() => window.__appBooted === true, null, { timeout: 300000 });
  const lj0 = await page.evaluate(() => ({ writes: _ljStat.writes, puts: _ljStat.puts, full: _ljStat.full, timer: !!_ljCkptTimer }));
  await page.waitForTimeout(2000);
  if (vp.th > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: vp.th });
  const r = await page.evaluate(async () => {
    const long = []; const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => long.push(Math.round(e.duration)))); po.observe({ type: 'longtask' });
    const T = (f) => { const a = performance.now(); f(); return Math.round(performance.now() - a); };
    const o = {};
    await new Promise((r) => setTimeout(r, 300)); long.length = 0;
    /* checkpoint: the synchronous part is the structured clone inside put() */
    const t = performance.now(); _ljCheckpoint(); o.ckptSyncMs = Math.round(performance.now() - t);
    await _ljChain.catch(() => {}); await new Promise((r) => setTimeout(r, 300)); o.ckptLong = long.splice(0);
    o.picMigSweepMs = T(() => _picMigSweepFields()); o.picMigCandsMs = T(() => _picMigCands());
    const id = DB.articles[100].id; o.getBacklinksMs = T(() => getBacklinks(id));
    o.cntOfAllEnxMs = T(() => DB.folders.forEach((f) => cntOf(f.id)));
    o.renderP2HRootMs = (() => { ST.folder = 'enx-root'; return T(() => renderP2H()); })();
    o.stampMs = T(() => _stampRecordTouches());
    o.isJournalAllMs = T(() => DB.articles.filter(isJournal).length);
    po.disconnect();
    return o;
  });
  console.log(vp.name, JSON.stringify({ afterBoot: lj0, ...r }));
  await ctx.close();
}
await srv.close();
