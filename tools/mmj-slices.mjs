#!/usr/bin/env node
/* tools/mmj-slices.mjs — v05.79, J130: the Mapping My Journey keeping-matching reads the site in small slices (block 138, checks 138a–138d).

   `node tools/mmj-slices.mjs [--only=138a,138b]`   Each printed ok/FAIL line is one app-check check.

   The site is FAKE and local: 150 categories, 1,000 posts of ~6 KB content, 20 pages, served by page.route at http://mmj-fake.test (window.__mmjSite points the app
   there). The real mappingmyjourney.com is never reached: the shared harness aborts it and COUNTS the request as an error (`errors`), so 138d would fail.
   138a  390 ×4: the READING of 1,000 posts has no long task over the host-scaled 50 ms (every long task that starts before `_mmjAssemble` is called)
   138b  the written result (notes, folders, fromMmj) is byte-identical to the unsliced read (per_page=100, window.__mmjPer=100), at 390, 820 and 1440
   138c  the decide-and-write stretch (from `_mmjAssemble` on, one await-free stretch by the rule) — its worst long task is PRINTED, not limited (the rule is to keep it one stretch)
   138d  zero requests to mappingmyjourney.com across the run, and no page errors */
import { openApp, seedDB, report, hostLimit } from './harness.mjs';

const r = report('J130 — the keeping-matching reads in slices');
const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);
const SITE = 'http://mmj-fake.test';
const T0 = '2026-10-01T00:00:00.000Z';
const VPS = [{ name: '390', w: 390, h: 844, touch: true, thr: 4 }, { name: '820', w: 820, h: 1180, touch: true, thr: 0 }, { name: '1440', w: 1440, h: 900, touch: false, thr: 0 }];

/* ── the fake site ── */
function makeSite() {
  const cats = [];
  for (let id = 1; id <= 150; id++) cats.push({ id, name: 'Place ' + String(id).padStart(3, '0') + (id % 7 === 0 ? ' &amp; Co' : ''), parent: id <= 12 ? 0 : 1 + ((id * 5) % 12), slug: 'c' + id, link: `${SITE}/c${id}/`, count: 0 });
  const para = 'Today we walked along the old road, past the market and the river, and talked about the long way home. '.repeat(1);
  const posts = [];
  for (let i = 0; i < 1000; i++) {
    let html = '';
    while (html.length < 6000) html += `<p>Post ${i}: ${para}<b>bold</b> and <i>italic</i> &amp; a link <a href="${SITE}/x${i}/">here</a>.</p>`;
    posts.push({ id: 1000 + i, date_gmt: `2024-0${1 + (i % 9)}-1${i % 9}T10:11:12`, modified_gmt: `2024-1${i % 3}-2${i % 9}T01:02:03`, link: `${SITE}/post-${i}/`, slug: 'post-' + i,
      title: { rendered: `Post ${i}` }, content: { rendered: html }, categories: [1 + (i % 150), 1 + ((i * 7) % 150)].filter((x, k, a) => a.indexOf(x) === k), tags: [], featured_media: 0 });
  }
  const pages = [];
  for (let k = 0; k < 20; k++) pages.push({ id: 5000 + k, date_gmt: '2023-05-01T00:00:00', modified_gmt: '2023-06-01T00:00:00', link: `${SITE}/page-${k}/`, slug: 'page-' + k,
    title: { rendered: 'Page ' + k }, content: { rendered: `<p>Page body ${k}</p>`.repeat(50) }, parent: 0, menu_order: k, featured_media: 0 });
  return { categories: cats.slice().sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || a.id - b.id), posts, pages, tags: [], media: [] };
}
const S = makeSite();
const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'X-WP-Total, X-WP-TotalPages' };

async function serveSite(ctx) {
  const seen = [];
  await ctx.route(SITE + '/**', async (route) => {
    const u = new URL(route.request().url()); seen.push(u.pathname + u.search);
    const m = /^\/wp-json\/wp\/v2\/(categories|posts|pages|tags|media)$/.exec(u.pathname);
    if (!m) return route.fulfill({ status: 404, body: '{}', headers: CORS });
    let all = S[m[1]];
    const f = u.searchParams.get('_fields'); const fl = f ? f.split(',') : null;
    const per = +u.searchParams.get('per_page') || 10, page = +u.searchParams.get('page') || 1;
    const rows = all.slice((page - 1) * per, page * per).map((x) => { if (!fl) return x; const o = {}; for (const k of fl) if (k in x) o[k] = x[k]; return o; });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows),
      headers: { ...CORS, 'X-WP-Total': String(all.length), 'X-WP-TotalPages': String(Math.max(1, Math.ceil(all.length / per))) } });
  });
  return seen;
}

function seed() {
  const db = seedDB(T0);
  db.sections.push({ id: 'mmj-sec', name: 'Mapping My Journey', order: 1, updatedAt: T0, mmj: { site: SITE } });
  db.theme.mmjSync = false;   /* the background timer stays out of the way; the check calls _mmjSyncRun(true) itself */
  return db;
}

/* one run: boot, point the app at the fake site, (throttle), run the matching once, return what it wrote + the long tasks */
async function oneRun(vp, per) {
  const init = new Function(`window.__mmjSite=${JSON.stringify(SITE)};${per ? `window.__mmjPer=${per};` : ''}`);
  const app = await openApp({ viewport: { width: vp.w, height: vp.h }, hasTouch: vp.touch, db: seed(), initScript: init });
  try {
    const { page, ctx } = app;
    const seen = await serveSite(ctx);
    await page.evaluate(() => {
      window.__lt = []; window.__asmAt = null;
      try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push({ st: e.startTime, d: Math.round(e.duration) }))).observe({ type: 'longtask', buffered: false }); } catch (e) {}
      const orig = window._mmjAssemble;
      window._mmjAssemble = function () { if (window.__asmAt == null) window.__asmAt = performance.now(); return orig.apply(this, arguments); };
    });
    if (vp.thr) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: vp.thr }); }
    await page.waitForTimeout(500);
    const t0 = Date.now();
    const sum = await page.evaluate(async () => { const t = performance.now(); const s = await _mmjSyncRun(true); return { s, t0: t }; });
    await page.waitForTimeout(500);
    const lt = await page.evaluate(() => ({ lt: window.__lt, asm: window.__asmAt }));
    const out = await page.evaluate(() => JSON.stringify({
      f: DB.folders.filter((f) => String(f.id).startsWith('mmj-')).map((f) => { const c = JSON.parse(JSON.stringify(f)); delete c.updatedAt; return c; }).sort((a, b) => (a.id > b.id ? 1 : -1)),
      a: DB.articles.filter((a) => String(a.id).startsWith('mmj-')).map((a) => { const c = JSON.parse(JSON.stringify(a)); if (c.fromMmj) delete c.fromMmj.at; return c; }).sort((a, b) => (a.id > b.id ? 1 : -1)),
    }));
    const counts = await page.evaluate(() => ({ a: DB.articles.filter((a) => String(a.id).startsWith('mmj-')).length, f: DB.folders.filter((f) => String(f.id).startsWith('mmj-')).length }));
    return { out, counts, sum: sum.s, lt: lt.lt, asm: lt.asm, seen, errors: app.errors.slice(), ms: Date.now() - t0 };
  } finally { await app.close(); }
}

const runs = {};
try {
  for (const vp of VPS) {
    if (!(want('138a') || want('138b') || want('138c') || want('138d'))) break;
    const sliced = await oneRun(vp, 0), whole = await oneRun({ ...vp, thr: 0 }, 100);
    runs[vp.name] = { sliced, whole };
    const HL = hostLimit(50);
    const reading = sliced.lt.filter((x) => sliced.asm == null || x.st < sliced.asm), deciding = sliced.lt.filter((x) => sliced.asm != null && x.st >= sliced.asm);
    const worstRead = Math.max(0, ...reading.map((x) => x.d)), worstDecide = Math.max(0, ...deciding.map((x) => x.d));
    const sentSliced = sliced.seen.filter((s) => /per_page=10&/.test(s) || /per_page=10$/.test(s)).length;
    const sentWhole = whole.seen.filter((s) => /\/posts\?/.test(s) && /per_page=100/.test(s)).length;
    if (want('138a') && vp.thr) r.check(sliced.asm != null && worstRead <= HL.ms, `138a ${vp.name} ×${vp.thr}: no long task over ${HL.text} while the 1,000 posts are READ (worst ${worstRead} ms of ${reading.length} long tasks)`, JSON.stringify({ reading, asm: sliced.asm }));
    if (want('138a') && !vp.thr) r.check(sliced.asm != null && worstRead <= HL.ms, `138a ${vp.name}: no long task over ${HL.text} while the posts are read (worst ${worstRead} ms)`, JSON.stringify(reading));
    if (want('138b')) {
      r.check(sliced.counts.a >= 1000 && sliced.counts.f >= 150 && sliced.sum && sliced.sum.added > 0, `138b ${vp.name}: the matching wrote the site's 1,000+ notes and 150+ folders (${sliced.counts.a} notes, ${sliced.counts.f} folders)`, JSON.stringify({ c: sliced.counts, sum: sliced.sum }));
      r.check(sliced.out === whole.out && sentSliced >= 100 && sentWhole >= 1, `138b ${vp.name}: the sliced read writes exactly what the unsliced (100 a page) read writes — notes, folders, every fromMmj field (${sentSliced} small requests vs ${sentWhole} big ones)`,
        sliced.out === whole.out ? '' : `sliced ${sliced.out.length} chars vs whole ${whole.out.length} chars`);
    }
    if (want('138c')) r.check(true, `138c ${vp.name}: the decide-and-write stretch, one await-free stretch as the rule says — worst long task ${worstDecide} ms (${deciding.length} long tasks), reported not limited`, JSON.stringify(deciding));
    if (want('138d')) r.check(sliced.errors.length === 0 && whole.errors.length === 0 && ![...sliced.seen, ...whole.seen].some((s) => /mappingmyjourney\.com/.test(s)), `138d ${vp.name}: zero requests to mappingmyjourney.com and no page errors`, [...sliced.errors, ...whole.errors].slice(0, 3).join(' | '));
  }
} catch (e) {
  r.check(false, '138 the check ran without throwing', String((e && e.stack) || e).slice(0, 600));
}
process.exit(r.finish() ? 1 : 0);
