/* Shared plumbing for every check in this folder.
   Nothing here asserts anything — it just gets a real, booted Siyagah in a
   real browser, with Firebase unreachable, so the checks can measure it. */

import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const ROOT = resolve(new URL('..', import.meta.url).pathname);

/* Host calibration (v05.24, hs520). A speed check's millisecond limit was set on the GitHub runner; on a slower
   computer the same check misses with nothing wrong in the app. hostFactor() times a short fixed CPU workload once
   per process (median of 5) and divides by HOST_REF_MS, the median measured on the runner: 1.0 there, clamped to
   [1, 4], so a limit is NEVER tighter than the runner's. A check multiplies its limit by it and prints both
   (see hostLimit). The workload is plain integer/float arithmetic plus array and string churn, the kind of work
   the app's own paths do, so it scales with the browser's speed. */
const HOST_REF_MS = 23;   /* measured on the GitHub runner, 15 Oct 2026: 21.3–22.3 ms over 5 processes */
let _hf = null;
export function hostFactor() {
  if (_hf) return _hf;
  const once = () => {
    const t = performance.now();
    let x = 1, s = 0; const a = [];
    for (let i = 0; i < 2e6; i++) { x = (x * 1103515245 + 12345) & 0x7fffffff; s += x % 7; if (i % 64 === 0) a.push('k' + x); }
    a.sort(); s += a.join('').length;
    if (s < 0) console.log(s);   /* keeps the result alive */
    return performance.now() - t;
  };
  once();   /* warm-up, not counted */
  const r = [once(), once(), once(), once(), once()].sort((p, q) => p - q);
  const med = r[2];
  const f = Math.min(4, Math.max(1, med / HOST_REF_MS));
  _hf = { factor: Math.round(f * 100) / 100, medianMs: Math.round(med * 10) / 10 };
  return _hf;
}
/* A limit scaled for this computer, and the text a check prints: `limit` (raw, as on the runner) × factor. */
export function hostLimit(limit) {
  const f = hostFactor().factor;
  return { ms: Math.round(limit * f), raw: limit, factor: f, text: f === 1 ? `${limit}` : `${Math.round(limit * f)} (${limit} × host ${f})` };
}

/* Playwright is installed globally in this sandbox, and ESM ignores
   NODE_PATH — so fall back to the global root by path. A repo-local
   `npm install playwright` also works and is picked up by the first try. */
let _pw = null;
export async function playwright() {
  if (_pw) return _pw;
  try { _pw = await import('playwright'); }
  catch {
    const g = execSync('npm root -g').toString().trim();
    _pw = await import(pathToFileURL(join(g, 'playwright', 'index.js')).href);
  }
  _pw = _pw.default ?? _pw;
  return _pw;
}

/* Firebase must never be reachable from a check. If it is, boot waits on the
   network, the login overlay races the render, and every measurement below is
   taken against a half-painted app. */
export const BLOCKED = ['**googleapis.com/**', '**gstatic.com/**', '**firebaseapp.com/**', '**firebaseio.com/**'];

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.css': 'text/css', '.ico': 'image/x-icon' };

/* http, not file:// — the service worker, the manifest and the clipboard APIs
   all need a real origin. Port 0 lets several checks run at once. */
export function serve(root = ROOT) {
  const srv = createServer(async (req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    try {
      const body = await readFile(join(root, p));
      res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404); res.end('not found'); }
  });
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok({
    base: `http://127.0.0.1:${srv.address().port}`,
    close: () => new Promise((d) => srv.close(d)),
  })));
}

/* A notebook big enough to make every pane and every Smart View render
   something. Written straight into localStorage under the app's own key,
   which is what loadDB() reads — no UI clicking to get to a populated app. */
export function seedDB(now = new Date().toISOString()) {
  return {
    sections: [{ id: 'sec-1', name: 'My Notebooks', order: 0, updatedAt: now }],
    folders: [
      { id: 'f1', name: '(001) Seeded Folder', parentId: null, order: 1, sectionId: 'sec-1', updatedAt: now },
      { id: 'f2', name: '(002) Second Folder', parentId: null, order: 2, sectionId: 'sec-1', updatedAt: now },
      { id: 'f1a', name: '(010) Child', parentId: 'f1', order: 1, updatedAt: now },
    ],
    articles: [
      { id: 'a1', title: 'Seeded note one', content: '<h1>One</h1><p>Body of the first seeded note.</p><h2>Sub</h2><p>More.</p>',
        folderIds: ['f1'], tags: ['seed'], createdAt: now, updatedAt: now, favourite: true, pinned: true, kind: 'general' },
      { id: 'a2', title: 'Seeded note two', content: '<p>Second note, no headings.</p>',
        folderIds: ['f1a'], tags: [], createdAt: now, updatedAt: now, kind: 'general' },
      { id: 'a3', title: 'Archived seeded note', content: '<p>Archived.</p>',
        folderIds: ['f2'], tags: [], createdAt: now, updatedAt: now, archived: true, kind: 'general' },
    ],
    trash: [],
    theme: { preset: 'forest', custom: {} },
  };
}

/* Opens the app the way a device does, and hands back everything a check
   needs to judge whether the boot was clean. `errors` collects BOTH thrown
   exceptions and console errors — in this codebase a silent exception
   usually means a half-rendered pane, not a visible crash. */
export async function openApp({ viewport = { width: 1400, height: 900 }, db = seedDB(), path = '/', disableIndexedDB = false, initScript = null, hasTouch = false } = {}) {
  const pw = await playwright();
  const srv = await serve();
  const browser = await pw.chromium.launch();
  const ctx = await browser.newContext(hasTouch ? { viewport, hasTouch: true, isMobile: true } : { viewport });
  for (const pattern of BLOCKED) await ctx.route(pattern, (r) => r.abort());
  /* v04.50 — the ONLY way to genuinely exercise index.html's IndexedDB-
     unavailable fallback path in a real browser: delete window.indexedDB
     before the app's own script runs, so its own `if(!window.indexedDB)`
     check (see _idbOpen()) takes the same branch a browser that never
     shipped IndexedDB would. Registered before the db-seeding init script
     below so it runs first on every navigation, including a reload. */
  if (disableIndexedDB) await ctx.addInitScript(() => {
    try { Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true }); } catch {}
  });
  /* v04.50 — a check that must act BEFORE boot finishes (openApp() itself
     only returns once it has) passes a function to run at document start,
     before the app's own script. */
  if (initScript) await ctx.addInitScript(initScript);
  if (db) await ctx.addInitScript((d) => {
    try { localStorage.setItem('my-notebook-v1', JSON.stringify(d)); } catch {}
  }, db);

  const errors = [], blocked = [], failed = [];
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e}`));
  /* A route we aborted ourselves surfaces as a console "net::ERR_FAILED".
     Those are OURS, not the app's — so they are matched against the real
     failed-request URLs and only counted when the URL was NOT one we
     blocked. A genuine 404 reads differently ("status of 404") and is
     always counted. */
  page.on('requestfailed', (rq) => {
    const url = rq.url();
    (/googleapis|gstatic|firebaseapp|firebaseio/.test(url) ? blocked : failed).push(url);
  });
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (m.text().includes('net::ERR_FAILED') && blocked.length) return;
    errors.push(`console: ${m.text()}`);
  });
  await page.goto(srv.base + path, { waitUntil: 'domcontentloaded' });
  /* v04.50 — loadDB() reads IndexedDB first and is now async, so boot no
     longer finishes in one synchronous tick. `typeof window.render ===
     'function'` is true the instant the script is PARSED (function
     declarations hoist) and proves nothing about whether render() has
     actually RUN — window.__appBooted is set by index.html only after
     loadDB() resolves and render() has been called. */
  await page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree'));
  await page.waitForTimeout(300);

  return {
    page, browser, ctx, base: srv.base, errors, blocked, failed,
    close: async () => { await browser.close(); await srv.close(); },
  };
}

/* A REAL touch drag through CDP `Input.dispatchTouchEvent` — Playwright's own
   `page.touchscreen` only taps, it has no drag. Needs a context opened with
   `hasTouch: true` (see openApp above), or Chromium ignores the events.
   `points` is an array of {x,y} in CSS pixels; the first is touchstart, the
   rest are touchmove, and touchend fires with no points (finger lifted). */
export async function touchDrag(page, points, { stepMs = 16 } = {}) {
  const cdp = await page.context().newCDPSession(page);
  const send = (type, p) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [{ x: p.x, y: p.y }] : [] });
  await send('touchStart', points[0]);
  for (let i = 1; i < points.length; i++) {
    await new Promise((r) => setTimeout(r, stepMs));
    await send('touchMove', points[i]);
  }
  await new Promise((r) => setTimeout(r, stepMs));
  await send('touchEnd', null);
}

/* The three sizes the app has genuinely different layouts for — the CSS
   breakpoints are <640 (mobile), 640-1199 (tablet), 1200+ (desktop). */
export const VIEWPORTS = [
  { name: 'phone',   width: 390,  height: 844 },
  { name: 'tablet',  width: 820,  height: 1180 },
  { name: 'desktop', width: 1440, height: 900 },
];

/* A block id "matches" a --only prefix either exactly or when the id
   continues past the prefix with anything other than another DIGIT — a
   digit there means the number keeps going (`10-delete`/`11-theme-perkey`
   are NOT `1`), where a letter or a hyphen there means the prefix's number
   is already complete and what follows is a sub-block of it (`15a-...`,
   `15b-...`, `15c-...`, `15d-...` all ARE `15`). Same disambiguation the
   v04.46 id-uniqueness fix already relies on to tell numbers apart. */
export function blockIdMatches(id, prefix) {
  if (id === prefix) return true;
  if (!id.startsWith(prefix)) return false;
  return !/[0-9]/.test(id[prefix.length] ?? '');
}

/* Result collection. Every check file uses the same shape so the output
   reads the same and a failure is always countable, never prose. */
export function report(title) {
  const rows = [];
  const blockIds = new Set();
  const registered = [];
  const results = new Map();
  const aborted = [];
  const add = (ok, label, detail = '') => { rows.push({ ok, label, detail }); return ok; };

  /* Runs `fn`, isolating whatever it does from every OTHER block in the
     file — v04.45 wrapped §14 by hand, five identical catches; this is the
     general form. A throw anywhere inside `fn` records ONE failed row
     naming the block, how many of its own checks ran before it died, and
     the error's first line — and the run carries on to the next block,
     instead of v04.45's defect: one uncaught exception silencing all 322
     checks with no report at all.
     `expectThrow: true` inverts the scoring — a throw is the block's own
     PASS, no throw is its FAIL — for the one permanent self-check in
     app-check.mjs that proves this mechanism works; nothing else should
     ever set it. `String(e)`, never `e.message` — a non-Error throw (a
     bare string, a Playwright rejection) has no `.message` and must still
     read in the report.
     IMPORTANT (see tools/README.md): this isolates FAILURES, not STATE.
     Every block in `app-check.mjs` opens and closes its own `openApp()`
     (v04.48), so an abort in one costs only that one. */
  async function runOne(id, fn, { expectThrow = false } = {}) {
    const before = rows.length;
    try {
      await fn();
      if (expectThrow) add(false, `block "${id}" was declared expectThrow and did not throw`, '');
      return { threw: false };
    } catch (e) {
      const msg = String(e).split('\n')[0];
      if (expectThrow) {
        add(true, `block "${id}" threw as expected`, msg);
      } else {
        const ran = rows.length - before;
        aborted.push(id);
        add(false, `block "${id}" aborted — a throw ended it after ${ran} of its own check(s) had already run`, msg);
      }
      return { threw: true };
    }
  }

  return {
    pass: (l, d) => add(true, l, d),
    fail: (l, d) => add(false, l, d),
    check: (cond, l, d) => add(!!cond, l, d),
    /* Registers a block WITHOUT running it — v04.49's collect-then-run.
       Every call site keeps the exact shape it always had
       (`await r.block(id, fn, opts)`); the awaited value now resolves the
       instant the block is recorded, and the real execution happens later,
       in file order, when `run()` is called. `results` (below) is how a
       block can read what an EARLIER block actually did once both have run
       — the one call site that needs this is the block-isolation
       self-check at the end of app-check.mjs. */
    async block(id, fn, opts = {}) {
      if (blockIds.has(id)) add(false, `block id "${id}" is used more than once`,
        'every r.block() id must be unique — see tools/README.md');
      else blockIds.add(id);
      registered.push({ id, fn, opts });
      return { id };
    },
    results,
    /* Actually runs the registered blocks, in the order they were
       registered (== the order they appear in the file). With no
       `onlyPrefixes`, runs all of them — an unfiltered run's behaviour and
       output are unchanged from before v04.49. With `onlyPrefixes` (an
       array of strings), runs only the registered blocks whose id matches
       one of them via `blockIdMatches()`; throws (a clear message, not a
       silent empty run) if that matches nothing, since a filter that
       silently runs zero blocks and reports "0/0 passed" is worse than
       useless. */
    async run(onlyPrefixes = null) {
      let toRun = registered;
      if (onlyPrefixes && onlyPrefixes.length) {
        toRun = registered.filter(({ id }) => onlyPrefixes.some((p) => blockIdMatches(id, p)));
        if (!toRun.length) {
          throw new Error(`--only ${onlyPrefixes.join(',')} matched no registered block id (${registered.length} registered)`);
        }
      }
      for (const { id, fn, opts } of toRun) results.set(id, await runOne(id, fn, opts));
      return { ranCount: toRun.length, totalCount: registered.length, only: onlyPrefixes };
    },
    finish(runInfo = null) {
      const bad = rows.filter((r) => !r.ok);
      console.log(`\n${title}`);
      console.log('='.repeat(title.length));
      for (const r of rows) console.log(`${r.ok ? '  ok  ' : ' FAIL '} ${r.label}${r.detail ? `\n         ${String(r.detail).split('\n').join('\n         ')}` : ''}`);
      if (aborted.length) console.log(`\n${aborted.length} block(s) aborted: ${aborted.join(', ')}`);
      if (runInfo?.only?.length) console.log(`\n${runInfo.ranCount}/${runInfo.totalCount} blocks run (--only=${runInfo.only.join(',')}) — this is NOT the full suite`);
      console.log(`\n${rows.length - bad.length}/${rows.length} passed${bad.length ? `, ${bad.length} FAILED` : ''}\n`);
      return bad.length;
    },
  };
}

/* PNG pixel size straight out of the IHDR chunk — no image library, and it
   reads the REAL pixels rather than whatever the manifest claims. */
export function pngSize(buf) {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

/* v05.40 · Z15 — the Zab bar folds the chips that do not fit into "▸ N more" (class jx-over on the hidden chip). A check that needs a Zab
   reaches it the way the owner does. `zabTap(page, sel, {touch})` presses `sel` with a real tap/click; when `sel` is a bar chip that is folded
   (jx-over, or "All Zabs"/"News" moved in on a phone) it opens "▸ N more" and presses that Zab's row instead. Returns 'chip' or 'more'.
   `zabOpen(page, name, {touch})` is the same for "the chip titled <name>". A folded chip has no box: a check that needs the CHIP ITSELF
   (its ▦ half, its geometry, a drag) must not use this; it makes room instead (fewer/shorter Zabs, or a wider window) and says so. */
export async function zabVisible(page, sel) {
  return page.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; if (e.closest('.jx-over')) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }, sel);
}
export async function zabTap(page, sel, { touch = false } = {}) {
  const press = async (x, y) => (touch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
  const centre = (s) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; if (e.closest('#jeb-bar')) e.scrollIntoView({ inline: 'nearest', block: 'nearest' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, s);
  const folded = await page.evaluate((s) => { const e = document.querySelector(s); const c = e && e.closest('#jeb-bar>.jeb-chip'); return !!(c && c.classList.contains('jx-over')); }, sel);
  if (!folded) { const pt = await centre(sel); if (!pt) throw new Error('zabTap: no ' + sel); await press(pt.x, pt.y); return 'chip'; }
  const label = await page.evaluate((s) => { const c = document.querySelector(s).closest('#jeb-bar>.jeb-chip'); const p = c.dataset.pid ? (DB.jebPockets.find((x) => x.id === c.dataset.pid) || {}) : {}; return c.dataset.news ? 'News' : c.dataset.all ? 'All Zabs' : p.name; }, sel);
  /* the bar may be re-laid-out a moment after a keyboard/blur or a resize: wait for the more chip to have a box, and press again once if no list came */
  await page.waitForFunction(() => { const e = document.querySelector('#jeb-bar .jeb-more .jeb-main'); return !!e && e.getBoundingClientRect().width > 0; }, null, { timeout: 5000 });
  for (let k = 0; k < 3; k++) {
    /* at 390 with a Zab open, its chip + the buttons are wider than the row (the app lets it scroll): scroll "▸ N more" into view first, as a finger would */
    await page.evaluate(() => { const e = document.querySelector('#jeb-bar .jeb-more'); if (e) e.scrollIntoView({ inline: 'nearest', block: 'nearest' }); });
    const m = await centre('#jeb-bar .jeb-more .jeb-main'); if (!m) throw new Error('zabTap: no ▸ N more');
    await press(m.x, m.y);
    try { await page.waitForSelector('#jeb-menu', { timeout: 1500 }); break; } catch (e) {
      if (k === 2) { const hit = await page.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); return el ? el.tagName + '.' + el.className + '#' + el.id : null; }, [m.x, m.y]); throw new Error('zabTap: ▸ N more pressed at ' + Math.round(m.x) + ',' + Math.round(m.y) + ' (' + hit + ') opened no list'); }
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  let row = null;
  for (let k = 0; k < 6 && !row; k++) { if (k) await new Promise((r) => setTimeout(r, 200)); row = await page.evaluate((l) => { const r = [...document.querySelectorAll('#jeb-menu .jm')].find((e) => e.textContent.includes(l)); if (!r) return null; const b = r.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, label); }
  if (!row) throw new Error('zabTap: no row "' + label + '" in the more-list: ' + JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('#jeb-menu .jm')].map((e) => e.textContent))));
  await press(row.x, row.y); return 'more';
}
/* a check that needs the CHIP (right-click menu, its box): when it is folded, open that Zab from the list; the open Zab's chip is never folded */
export async function zabShow(page, sel, { touch = false } = {}) {
  if (await zabVisible(page, sel)) return false;
  await zabTap(page, sel, { touch }); await page.waitForSelector('#jeb-panel.on', { timeout: 3000 }); await new Promise((r) => setTimeout(r, 500)); return true;
}
/* what a check's `act()` calls for a bar chip: the ▦ half of a folded chip has no box, so the owner opens that Zab from "▸ N more" and spreads it with the ▦ in the panel header (.jeb-px);
   anything else goes through zabTap */
export async function zabAct(page, sel, { touch = false } = {}) {
  if (!/\[data-jeb-cards\]\s*$/.test(sel) || await zabVisible(page, sel)) return zabTap(page, sel, { touch });
  const chipSel = sel.replace(/\s*\[data-jeb-cards\]\s*$/, '');
  await zabTap(page, chipSel, { touch }); await page.waitForSelector('#jeb-panel.on', { timeout: 3000 }); await new Promise((r) => setTimeout(r, 400));
  const px = await page.evaluate(() => { const e = document.querySelector('#jeb-panel .jeb-px'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  if (!px) throw new Error('zabAct: no ▦ in the panel header');
  if (touch) await page.touchscreen.tap(px.x, px.y); else await page.mouse.click(px.x, px.y);
}
export const zabOpen = (page, name, o) => zabTap(page, `#jeb-bar .jeb-chip[title="${name}"]`, o);
