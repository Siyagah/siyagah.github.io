/* Shared plumbing for every check in this folder.
   Nothing here asserts anything — it just gets a real, booted Siyagah in a
   real browser, with Firebase unreachable, so the checks can measure it. */

import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const ROOT = resolve(new URL('..', import.meta.url).pathname);

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
export async function openApp({ viewport = { width: 1400, height: 900 }, db = seedDB(), path = '/', disableIndexedDB = false } = {}) {
  const pw = await playwright();
  const srv = await serve();
  const browser = await pw.chromium.launch();
  const ctx = await browser.newContext({ viewport });
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
