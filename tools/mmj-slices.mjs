#!/usr/bin/env node
/* tools/mmj-slices.mjs — v05.79, J130: the Mapping My Journey keeping-matching reads the site in small slices (block 138, checks 138a–138d).

   `node tools/mmj-slices.mjs [--only=138a,138b]`   Each printed ok/FAIL line is one app-check check.

   The site is FAKE and local: 150 categories, 1,000 posts of ~6 KB content, 20 pages, served by page.route at http://mmj-fake.test (window.__mmjSite points the app
   there). The real mappingmyjourney.com is never reached: the shared harness aborts it and COUNTS the request as an error (`errors`), so 138d would fail.

   Three matchings run in ONE page (the owner's real life), under the CPU throttle at 390:
     first   the first-ever read — 1,000 posts + 20 pages, all new (1,170 new notes and folders). REPORTED, not limited (138c).
     steady  the notebook already holds them; ~30 posts changed on the site; only those are read (modified_after). LIMITED (138a).
     daily   the same, with `_mmjS.full` made old, so the day's id lists are read too. LIMITED (138a).
   The boundary between READING and DECIDING is marked from inside the page: `_mmjAssemble` is wrapped (start of the assemble + decide + write stretch) and
   `_enxPersist` is wrapped (its end). A long task is attributed by its START time: before the assemble mark = reading; between the marks = deciding.

   138a  steady and daily: no READING long task over the host-scaled 50 ms (the deciding worst is printed beside it)
   138b  the written result of the first read (notes, folders, fromMmj) is byte-identical to the unsliced read (per_page=100, window.__mmjPer=100), at 390, 820 and 1440
   138c  the first-ever read and the decide-and-write stretch — worst reading / deciding long tasks PRINTED, not limited (the rule is to keep it one stretch)
   138d  zero requests to mappingmyjourney.com across the run, and no page errors (the harness's own "localStorage best-effort save failed" line is excluded, as in 56k)

   Expected on v05.78 (old index.html, these tools): 138b's "small requests" half FAILS (v05.78 sends no per_page=10 reads). 138a fails at 390 ×4 only if the ~30 changed
   posts (one 100-a-page request, ~180 KB) parse in one task over the limit; if it passes there, 138b is what separates the builds. 138d stays meaningful: the old app is
   held to the same zero-real-site count (mmjSync is off in the check). 138c always passes (it only prints). */
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
/* post indexes whose modified_gmt the fake site has moved to CHANGED_AT: the owner's "~30 posts changed" */
let CHANGED = new Set(), CHANGED_AT = '';
const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'X-WP-Total, X-WP-TotalPages' };

async function serveSite(ctx) {
  const seen = [];
  await ctx.route(SITE + '/**', async (route) => {
    const u = new URL(route.request().url()); seen.push(u.pathname + u.search);
    const m = /^\/wp-json\/wp\/v2\/(categories|posts|pages|tags|media)$/.exec(u.pathname);
    if (!m) return route.fulfill({ status: 404, body: '{}', headers: CORS });
    let all = S[m[1]];
    if (m[1] === 'posts' && CHANGED.size) all = all.map((p, i) => (CHANGED.has(i) ? { ...p, modified_gmt: CHANGED_AT } : p));
    const ma = u.searchParams.get('modified_after');
    if (ma && (m[1] === 'posts' || m[1] === 'pages')) all = all.filter((x) => x.modified_gmt > ma);
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

/* one run: boot, point the app at the fake site, (throttle), then the matchings in the same page */
async function oneRun(vp, per, phases) {
  const init = new Function(`window.__mmjSite=${JSON.stringify(SITE)};${per ? `window.__mmjPer=${per};` : ''}`);
  const app = await openApp({ viewport: { width: vp.w, height: vp.h }, hasTouch: vp.touch, db: seed(), initScript: init });
  try {
    const { page, ctx } = app;
    CHANGED = new Set(); CHANGED_AT = '';
    const seen = await serveSite(ctx);
    await page.evaluate(() => {
      window.__lt = []; window.__m = { asm: null, end: null };
      try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push({ st: e.startTime, d: Math.round(e.duration) }))).observe({ type: 'longtask', buffered: false }); } catch (e) {}
      const oa = window._mmjAssemble;
      window._mmjAssemble = function () { if (window.__m.asm == null) window.__m.asm = performance.now(); return oa.apply(this, arguments); };
      const op = window._enxPersist;
      window._enxPersist = function () { const x = op.apply(this, arguments); window.__m.end = performance.now(); return x; };
    });
    if (vp.thr) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: vp.thr }); }
    await page.waitForTimeout(500);
    const phase = async (name) => {
      await page.evaluate(() => { window.__lt = []; window.__m = { asm: null, end: null }; });
      const from = seen.length;
      const sum = await page.evaluate(() => _mmjSyncRun(true));
      await page.waitForTimeout(500);
      const o = await page.evaluate(() => ({ lt: window.__lt, m: window.__m }));
      const asm = o.m.asm, end = o.m.end == null ? Infinity : o.m.end;
      const reading = o.lt.filter((x) => asm == null || x.st < asm);
      const deciding = asm == null ? [] : o.lt.filter((x) => x.st >= asm && x.st <= end);
      return { name, sum, asm, reading, deciding, reqs: seen.slice(from) };
    };
    const first = await phase('first');
    const out = await page.evaluate(() => JSON.stringify({
      f: DB.folders.filter((f) => String(f.id).startsWith('mmj-')).map((f) => { const c = JSON.parse(JSON.stringify(f)); delete c.updatedAt; return c; }).sort((a, b) => (a.id > b.id ? 1 : -1)),
      a: DB.articles.filter((a) => String(a.id).startsWith('mmj-')).map((a) => { const c = JSON.parse(JSON.stringify(a)); if (c.fromMmj) delete c.fromMmj.at; return c; }).sort((a, b) => (a.id > b.id ? 1 : -1)),
    }));
    const counts = await page.evaluate(() => ({ a: DB.articles.filter((a) => String(a.id).startsWith('mmj-')).length, f: DB.folders.filter((f) => String(f.id).startsWith('mmj-')).length }));
    let steady = null, daily = null;
    if (phases) {
      for (let i = 0; i < 30; i++) CHANGED.add(i * 33);
      CHANGED_AT = new Date().toISOString().slice(0, 19);
      steady = await phase('steady');
      await page.evaluate(() => { _mmjS.full = 1; });   /* the last full check is long ago: the day's id lists are read as well */
      daily = await phase('daily');
    }
    return { out, counts, first, steady, daily, seen, errors: app.errors.slice() };
  } finally { await app.close(); }
}

const worst = (l) => Math.max(0, ...l.map((x) => x.d));
const fmt = (ph) => (ph ? `${ph.reading.length} reading long tasks (worst ${worst(ph.reading)} ms), ${ph.deciding.length} deciding (worst ${worst(ph.deciding)} ms)` : 'not run');
try {
  for (const vp of VPS) {
    if (!(want('138a') || want('138b') || want('138c') || want('138d'))) break;
    const sliced = await oneRun(vp, 0, true), whole = await oneRun({ ...vp, thr: 0 }, 100, false);
    const HL = hostLimit(50);
    const x3 = vp.thr ? ` ×${vp.thr}` : '';
    if (want('138a')) for (const ph of [sliced.steady, sliced.daily]) {
      const w = worst(ph.reading);
      r.check(ph.asm != null && ph.sum && ph.sum.updated >= 30 && w <= HL.ms,
        `138a ${vp.name}${x3}: ${ph.name === 'steady' ? '1,000 posts already held, ~30 changed' : 'the daily full run (id lists too), ~30 changed'} — no long task over ${HL.text} while READING (worst ${w} ms of ${ph.reading.length}); deciding worst ${worst(ph.deciding)} ms`,
        JSON.stringify({ reading: ph.reading, deciding: ph.deciding, asm: ph.asm, sum: ph.sum, requests: ph.reqs.length }));
    }
    const sentSliced = sliced.first.reqs.filter((s) => /\/posts\?/.test(s) && /per_page=10(&|$)/.test(s)).length;
    const sentWhole = whole.first.reqs.filter((s) => /\/posts\?/.test(s) && /per_page=100/.test(s)).length;
    if (want('138b')) {
      r.check(sliced.counts.a >= 1000 && sliced.counts.f >= 150 && sliced.first.sum && sliced.first.sum.added > 0, `138b ${vp.name}: the matching wrote the site's 1,000+ notes and 150+ folders (${sliced.counts.a} notes, ${sliced.counts.f} folders)`, JSON.stringify({ c: sliced.counts, sum: sliced.first.sum }));
      r.check(sliced.out === whole.out && sentSliced >= 100 && sentWhole >= 1, `138b ${vp.name}: the sliced read writes exactly what the unsliced (100 a page) read writes — notes, folders, every fromMmj field (${sentSliced} small requests vs ${sentWhole} big ones)`,
        sliced.out === whole.out ? '' : `sliced ${sliced.out.length} chars vs whole ${whole.out.length} chars`);
    }
    if (want('138c')) r.check(true, `138c ${vp.name}${x3}: FIRST-ever read (1,170 new), reported not limited — ${fmt(sliced.first)}; steady: ${fmt(sliced.steady)}; daily: ${fmt(sliced.daily)}`, JSON.stringify({ firstReading: sliced.first.reading, firstDeciding: sliced.first.deciding }));
    if (want('138d')) {
      /* the harness's own "localStorage best-effort save failed … QuotaExceededError" line is expected at this size (the notebook is in IndexedDB), as in 56k; every other error, including a real-site request, fails */
      const errs = [...sliced.errors, ...whole.errors].filter((e) => !/localStorage best-effort save failed \(IndexedDB is authoritative\)/.test(e));
      r.check(errs.length === 0 && ![...sliced.seen, ...whole.seen].some((s) => /mappingmyjourney\.com/.test(s)), `138d ${vp.name}: zero requests to mappingmyjourney.com and no page errors (the best-effort localStorage line excluded)`, errs.slice(0, 3).join(' | '));
    }
  }
} catch (e) {
  r.check(false, '138 the check ran without throwing', String((e && e.stack) || e).slice(0, 600));
}
process.exit(r.finish() ? 1 : 0);
