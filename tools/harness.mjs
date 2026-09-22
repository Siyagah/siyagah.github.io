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
export async function openApp({ viewport = { width: 1400, height: 900 }, db = seedDB(), path = '/' } = {}) {
  const pw = await playwright();
  const srv = await serve();
  const browser = await pw.chromium.launch();
  const ctx = await browser.newContext({ viewport });
  for (const pattern of BLOCKED) await ctx.route(pattern, (r) => r.abort());
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
  await page.waitForFunction(() => typeof window.render === 'function' && !!document.getElementById('tree'));
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

/* Result collection. Every check file uses the same shape so the output
   reads the same and a failure is always countable, never prose. */
export function report(title) {
  const rows = [];
  const blockIds = new Set();
  const aborted = [];
  const add = (ok, label, detail = '') => { rows.push({ ok, label, detail }); return ok; };
  return {
    pass: (l, d) => add(true, l, d),
    fail: (l, d) => add(false, l, d),
    check: (cond, l, d) => add(!!cond, l, d),
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
       Every block from roughly §6d onward opens its own `openApp()`, so an
       abort there costs only that block. The early blocks (§1–§6c and the
       first §7–§13) all still drive the one `app`/`page` opened at the top
       of app-check.mjs — if one of THOSE aborts partway through, it can
       leave that shared session in a shape later blocks never expected, and
       their failures become suspects, not independent findings. */
    async block(id, fn, { expectThrow = false } = {}) {
      if (blockIds.has(id)) add(false, `block id "${id}" is used more than once`,
        'every r.block() id must be unique — see tools/README.md');
      else blockIds.add(id);
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
    },
    finish() {
      const bad = rows.filter((r) => !r.ok);
      console.log(`\n${title}`);
      console.log('='.repeat(title.length));
      for (const r of rows) console.log(`${r.ok ? '  ok  ' : ' FAIL '} ${r.label}${r.detail ? `\n         ${String(r.detail).split('\n').join('\n         ')}` : ''}`);
      if (aborted.length) console.log(`\n${aborted.length} block(s) aborted: ${aborted.join(', ')}`);
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
