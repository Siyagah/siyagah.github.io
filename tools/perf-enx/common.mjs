/* tools/perf-enx — the J61 measurement at the owner's scale (12,500 notes, 58 MB; 12,000 of them shaped exactly as _enxImport makes them).
   node tools/perf-enx/seed.mjs   (builds the profile once, ~10 s), then node tools/perf-enx/measure.mjs --runs=3 --idle=20 --prof [--vp=laptop|phone] (~6 min).
   Written by the Architect's measuring run on 22 Oct 2026 against v05.39; results there are in CHANGELOG v05.41. */
import os from 'node:os';
/* shared: fixed-port server (IndexedDB is per origin, so the port must not move between runs) + persistent profile launcher */
import { playwright, BLOCKED, ROOT } from '../harness.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
export const PORT = 18765;
export const DIR = new URL('.', import.meta.url).pathname;
export const PROFILE = process.env.PERF_PROFILE || (os.tmpdir() + '/siyagah-perf-enx-seed');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.css': 'text/css' };
export const APP = process.env.PERF_APP || new URL('../../', import.meta.url).pathname;   /* the repository root (the build under test); PERF_APP=<dir> measures another copy, e.g. `git archive <sha> | tar -x -C <dir>` for a before/after */
export function serveFixed(root = APP) {
  const srv = createServer(async (req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    try { const b = await readFile(join(root, p)); res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); res.end(b); }
    catch { res.writeHead(404); res.end('nf'); }
  });
  return new Promise((ok) => srv.listen(PORT, '127.0.0.1', () => ok({ base: `http://127.0.0.1:${PORT}`, close: () => new Promise((d) => srv.close(d)) })));
}
export async function launch(profile, { w = 1440, h = 900, touch = false } = {}) {
  const pw = await playwright();
  const opts = { viewport: { width: w, height: h }, serviceWorkers: 'block' };
  if (touch) Object.assign(opts, { hasTouch: true, isMobile: true });
  const ctx = await pw.chromium.launchPersistentContext(profile, opts);
  for (const p of BLOCKED) await ctx.route(p, (r) => r.abort());
  const page = ctx.pages()[0] || await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errors.push('console: ' + m.text().slice(0, 200)); });
  return { ctx, page, errors };
}
export const med = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
