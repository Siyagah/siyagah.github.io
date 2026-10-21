import { serveFixed, launch, PROFILE, DIR } from './common.mjs';
import { cpSync, rmSync } from 'node:fs';
const P = DIR + 'profile-probe'; rmSync(P, { recursive: true, force: true }); cpSync(PROFILE, P, { recursive: true });
const srv = await serveFixed(); const { ctx, page, errors } = await launch(P, { w: +(process.argv[2] || 1440), h: 900 });
await page.goto(srv.base + '/'); await page.waitForFunction(() => window.__appBooted === true, null, { timeout: 120000 });
console.log(await page.evaluate(process.argv[3] || `(() => ({ rows: [...document.querySelectorAll('#tree .tr-row')].map(r => (r.dataset.fid||'') + ':' + r.textContent.trim().slice(0,30)).slice(0,40), secs: DB.sections, root: DB.folders.find(f=>f.id==='enx-root'), folder: ST.folder, exp: ST.exp }))()`));
console.log(errors);
await ctx.close(); await srv.close();
