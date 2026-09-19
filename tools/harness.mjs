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
export async function openApp({ viewport = { width: 1400, height: 900 }, db = seedDB(), path = '/', rawDB = null } = {}) {
  const pw = await playwright();
  const srv = await serve();
  const browser = await pw.chromium.launch();
  const ctx = await browser.newContext({ viewport });
  for (const pattern of BLOCKED) await ctx.route(pattern, (r) => r.abort());
  if (db) await ctx.addInitScript((d) => {
    try { localStorage.setItem('my-notebook-v1', JSON.stringify(d)); } catch {}
  }, db);
  /* A notebook that is DAMAGED cannot be handed over as an object — the
     damage is in the bytes (truncated, not JSON, wrong types), and
     JSON.stringify would repair it on the way in. `rawDB` writes the string
     itself. It must go through addInitScript like `db` does: writing it with
     setItem after boot and then reloading loses to the app's own unload
     flush, which rewrites localStorage from the DB it is holding — the
     measurement then reads as "the app wiped the notebook" when it was the
     test that wiped it. */
  if (rawDB != null) await ctx.addInitScript((sVal) => {
    try { localStorage.setItem('my-notebook-v1', sVal); } catch {}
  }, rawDB);

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
  const add = (ok, label, detail = '') => { rows.push({ ok, label, detail }); return ok; };
  return {
    pass: (l, d) => add(true, l, d),
    fail: (l, d) => add(false, l, d),
    check: (cond, l, d) => add(!!cond, l, d),
    finish() {
      const bad = rows.filter((r) => !r.ok);
      console.log(`\n${title}`);
      console.log('='.repeat(title.length));
      for (const r of rows) console.log(`${r.ok ? '  ok  ' : ' FAIL '} ${r.label}${r.detail ? `\n         ${String(r.detail).split('\n').join('\n         ')}` : ''}`);
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

/* ── Synthetic notebooks ───────────────────────────────────────────────────
   The Master Plan (2026-09-19 §3) forbids running a destructive-path test on
   anything resembling the owner's real notebook, and asks for empty, normal,
   large, malformed, duplicate and RTL/Bangla cases. `seedDB()` above is the
   small fixture every existing check is written against and is left exactly
   as it is; this is the generator for everything else.

   DETERMINISTIC on purpose: a seeded PRNG, so a failure at note 7,431 of a
   10,000-note run reproduces on the next run instead of evaporating. */
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

const BANGLA = 'আমার জ্ঞানের নোটবই — পরীক্ষা';
const ARABIC = 'مُرَاجَعَة الحفظ — اختبار';
const RTL_MIX = `<p dir="rtl">${ARABIC}</p><p>${BANGLA}</p>`;

/* Every hostile shape a note's content or a folder's name can arrive in.
   Content is raw HTML with no sanitiser (CLAUDE.md), so these are the inputs
   that decide whether that is a design or a defect. */
export const MALFORMED = {
  script: '<p>before</p><script>window.__XSS_RAN=1<\/script><p>after</p>',
  imgOnerror: '<img src="x" onerror="window.__XSS_IMG=1">',
  svgOnload: '<svg onload="window.__XSS_SVG=1"></svg>',
  iframeExternal: '<iframe src="https://evil.example.com/steal"></iframe>',
  jsHref: '<a href="javascript:window.__XSS_HREF=1">click</a>',
  blankNoRel: '<a href="https://example.com" target="_blank">out</a>',
  unclosed: '<div><p>never closed',
  deepNest: '<div>'.repeat(200) + 'deep' + '</div>'.repeat(200),
  hugeAttr: `<p data-x="${'A'.repeat(20000)}">huge attribute</p>`,
  nullish: '<p>\u0000￾ control bytes</p>',
  onclickWidget: '<div contenteditable="false" onclick="window.__XSS_WIDGET=1">widget</div>',
};

/* A notebook of any size, with the shapes a real one grows: nested folders,
   several sections, multi-folder membership, tags, types, favourites,
   archived notes, pinned tabs, trash tombstones and non-Latin text. */
export function synthDB({ notes = 500, folders = 40, sections = 3, seed = 7,
                          heavy = false, rtl = true, malformed = false, now = new Date().toISOString() } = {}) {
  const rnd = rng(seed);
  const iso = (daysAgo) => new Date(Date.parse(now) - daysAgo * 86400000).toISOString();
  const secs = Array.from({ length: sections }, (_, i) => ({
    id: `syn-sec-${i}`, name: `Synthetic Section ${i + 1}`, order: i, updatedAt: now }));
  const flds = [];
  for (let i = 0; i < folders; i++) {
    const parent = i > 3 && rnd() < 0.45 ? flds[Math.floor(rnd() * i)].id : null;
    flds.push({ id: `syn-f-${i}`, name: `(${String(i).padStart(3, '0')}) Folder ${i}${rtl && i % 11 === 0 ? ' ' + BANGLA : ''}`,
      parentId: parent, order: i, sectionId: secs[i % sections].id, updatedAt: iso(rnd() * 400) });
  }
  const KINDS = ['general', 'reference', 'idea', 'journal', 'task'];
  const arts = [];
  for (let i = 0; i < notes; i++) {
    const nF = 1 + (rnd() < 0.18 ? 1 : 0) + (rnd() < 0.05 ? 1 : 0);
    const mine = new Set(); while (mine.size < nF) mine.add(flds[Math.floor(rnd() * flds.length)].id);
    let body = `<h1>Note ${i}</h1><p>${'Synthetic body sentence. '.repeat(heavy ? 40 : 4)}</p>`
      + `<h2>Section A</h2><ul><li>one</li><li>two</li></ul>`;
    if (rtl && i % 7 === 0) body += RTL_MIX;
    if (heavy && i % 25 === 0) body += `<div class="embed-wrap"><img src="data:image/png;base64,${'A'.repeat(4000)}"></div>`;
    if (malformed && i % 13 === 0) body += Object.values(MALFORMED)[i % Object.keys(MALFORMED).length];
    arts.push({ id: `syn-a-${i}`, title: `${rtl && i % 9 === 0 ? BANGLA + ' ' : ''}Synthetic note ${i}`,
      content: body, folderIds: [...mine], tags: rnd() < 0.4 ? [`t${i % 12}`, 'syn'] : ['syn'],
      kind: KINDS[i % KINDS.length], createdAt: iso(400 - (i % 400)), updatedAt: iso(rnd() * 200),
      favourite: i % 17 === 0, pinned: i % 23 === 0, archived: i % 31 === 0,
      ...(i % 29 === 0 ? { reminder: iso(-(i % 14)) } : {}),
      ...(i % 37 === 0 ? { done: true } : {}) });
  }
  const trash = Array.from({ length: Math.min(12, Math.floor(notes / 20)) }, (_, i) => ({
    id: `syn-tr-${i}`, title: `Trashed note ${i}`, content: '<p>in the bin</p>',
    folderIds: [flds[0].id], tags: [], kind: 'general', createdAt: iso(50), updatedAt: iso(40),
    deletedAt: iso(i) }));
  return { sections: secs, folders: flds, articles: arts, trash,
    theme: { preset: 'forest', custom: {} },
    tabs: arts.slice(0, 5).map((a, i) => ({ id: a.id, order: i })) };
}

/* An empty notebook — the state a brand-new device boots into, and the one
   most likely to divide by zero somewhere. */
export function emptyDB() {
  return { sections: [], folders: [], articles: [], trash: [], theme: {} };
}

/* A notebook whose stored JSON is damaged in each of the ways a real one can
   be: truncated, wrong types, missing collections, duplicate ids, orphan
   references. Returned as STRINGS, because the damage is what loadDB() has
   to survive reading, not what it has to survive holding. */
export function corruptDBs() {
  const good = seedDB();
  return {
    truncated: JSON.stringify(good).slice(0, 220),
    notJSON: 'this is not json at all {{{',
    nullCollections: JSON.stringify({ ...good, articles: null, folders: null }),
    wrongTypes: JSON.stringify({ ...good, articles: 'nope', sections: 42, trash: {} }),
    missingKeys: JSON.stringify({ hello: 'world' }),
    duplicateIds: JSON.stringify({ ...good, articles: [...good.articles, { ...good.articles[0] }] }),
    orphanFolderRef: JSON.stringify({ ...good,
      articles: good.articles.map((a) => ({ ...a, folderIds: ['no-such-folder'] })) }),
    nullNote: JSON.stringify({ ...good, articles: [...good.articles, null] }),
    noteWithoutId: JSON.stringify({ ...good, articles: [...good.articles, { title: 'no id', content: '<p>x</p>' }] }),
    arrayRoot: JSON.stringify([1, 2, 3]),
  };
}

/* ── The Feature Coverage Matrix ───────────────────────────────────────────
   Master Plan §3: every row ends as PASS, FAIL—FIXED, BLOCKED—OWNER,
   BLOCKED—ENVIRONMENT or NOT APPLICABLE, and "present in code" is not a PASS.
   So a row cannot be WRITTEN by hand — it is emitted by a check that ran. */
export function matrix(title) {
  const rows = [];
  const api = {
    /* domain: Master Plan §4 letter; feature: what a person would call it */
    row(domain, feature, ok, detail = '', { viewport = 'desktop', status = null } = {}) {
      rows.push({ domain, feature, viewport, status: status || (ok ? 'PASS' : 'FAIL'), ok: !!ok, detail: String(detail) });
      return !!ok;
    },
    blockedOwner(domain, feature, why) { rows.push({ domain, feature, viewport: '—', status: 'BLOCKED—OWNER', ok: true, detail: why }); },
    blockedEnv(domain, feature, why) { rows.push({ domain, feature, viewport: '—', status: 'BLOCKED—ENVIRONMENT', ok: true, detail: why }); },
    na(domain, feature, why) { rows.push({ domain, feature, viewport: '—', status: 'NOT APPLICABLE', ok: true, detail: why }); },
    rows,
    finish() {
      const bad = rows.filter((x) => !x.ok);
      console.log(`\n${title}`);
      console.log('='.repeat(title.length));
      for (const x of rows) console.log(`${x.ok ? '  ok  ' : ' FAIL '} [${x.domain}] ${x.feature} (${x.viewport})${x.detail ? `\n         ${x.detail.split('\n').join('\n         ')}` : ''}`);
      const byStatus = rows.reduce((a, x) => (a[x.status] = (a[x.status] || 0) + 1, a), {});
      console.log(`\n${rows.length - bad.length}/${rows.length} passed${bad.length ? `, ${bad.length} FAILED` : ''}`);
      console.log(Object.entries(byStatus).map(([k, v]) => `${k}: ${v}`).join(' · ') + '\n');
      return bad.length;
    },
  };
  return api;
}
