#!/usr/bin/env node
/* tools/offline-o1.mjs — v05.14, O1: Siyagah opens and works on a dead connection (checks 74a–74i).

   Every scenario installs the service worker first (two online loads), then changes the network under the page. The app is served by
   THIS file's own little server, because the service worker's own requests must be able to fail or hang too, and a browser-side route
   cannot reach them reliably. Server modes: ok · dead (the connection is cut at once, like flight mode) · hang (connected, nothing
   ever answers). Google (gstatic, googleapis, firebase) is handled by browser routes: abort or hang.

   74a  clean offline: boots <= 2 s, and the sidebar, a folder, the note list and a note open by real taps/clicks, no page errors
   74b  EVERYTHING hangs: boots <= 5 s (the 3 s service-worker limit + boot), browsing works as in 74a
   74c  only Google hangs: boots <= 2 s, browsing works
   74d  saving offline: new note, an edit, a folder rename and a Zab item by real input; reload while offline: all four are there;
        back online, a second device on the fake cloud gets all four, none lost or doubled
   74e  back online, sync starts: after an offline boot the SDK failed to load; going online loads it (a retry) and sync goes live
   74f  a new version still arrives (I3): v(N) installed, v(N+1) served online -> the next load shows v(N+1); a network that answers
        slowly (> 3 s) gets the cached page, and its late answer refreshes the cache
   74g  I4: a Save File copy opens from disk with no network and shows its baked notes; it carries no <script src>
   74h  the offline wording: plain words, no "NOT syncing", no error colour
   74i  the ship-check guard fails on a scratch copy with the old leftovers put back, and passes on the real file

   O1_ROOT=<dir> serves another build (the unpatched run uses a copy of the previous version). `--only=74a,74c` runs just those.
   Each printed ok/FAIL line becomes one app-check check (block 74). */
import { playwright, seedDB, ROOT } from './harness.mjs';
import { makeCloud, addDevice, reopen, on, sleep, quiet, waitSeeded, check, results, liveDB } from './s1-fake.mjs';
import { createServer } from 'node:http';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import { spawnSync } from 'node:child_process';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);
if (argv.includes('--fails')) { const o = console.log; let skip = false; console.log = (...x) => { const t = x.join(' '); if (/^\s+ok\s/.test(t)) { skip = true; return; } if (skip && /^\s{6,}\S/.test(t)) { skip = false; return; } skip = false; o(...x); }; }

const SRC = (argv.find((a) => a.startsWith('--root=')) || '').slice(7) || process.env.O1_ROOT || ROOT;
const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];
const pw = await playwright();

/* ── the server: ok | dead | hang, and an optional version override (74f) ── */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
function makeServer() {
  const st = { mode: 'ok', ver: null, htmlDelay: 0, sockets: new Set(), hits: [] };
  const srv = createServer(async (req, res) => {
    st.hits.push(req.url);
    if (st.mode === 'dead') { req.socket.destroy(); return; }
    if (st.mode === 'hang') return;
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    try {
      let body = await readFile(join(SRC, p));
      if (st.ver && p === '/index.html') body = Buffer.from(body.toString('utf8').replace(/(<meta name="app-version" content=")[^"]+/, '$1' + st.ver));
      if (st.ver && p === '/sw.js') body = Buffer.from(body.toString('utf8').replace(/const VERSION\s*=\s*'[^']+'/, `const VERSION = 'v${st.ver}.01'`));
      if (st.htmlDelay && p === '/index.html') await sleep(st.htmlDelay);
      res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404); res.end('not found'); }
  });
  srv.on('connection', (s) => { st.sockets.add(s); s.on('close', () => st.sockets.delete(s)); });
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok(Object.assign(st, {
    base: `http://127.0.0.1:${srv.address().port}`,
    close: async () => { for (const s of st.sockets) s.destroy(); await new Promise((d) => srv.close(d)); },
  }))));
}

const srv = await makeServer();
const browser = await pw.chromium.launch();
const GOOGLE = ['**googleapis.com/**', '**gstatic.com/**', '**firebaseapp.com/**', '**firebaseio.com/**'];
const T0 = new Date().toISOString();
/* the seed: a2 sits in f1 beside a1, so one folder click shows both notes */
const seed = () => { const db = seedDB(T0); db.articles.find((a) => a.id === 'a2').folderIds = ['f1']; db.theme = Object.assign({}, db.theme, { zabPhoneLayout: 'bar' }); return db; };   /* v05.18 (updated in place, Architect review): a phone's Zab is a corner button now; 74d opens a pocket from the bar, so the notebook chooses the bar */
const tapper = (page, vp) => (sel) => (vp.touch ? page.locator(sel).first().tap() : page.locator(sel).first().click());
const realErr = (m) => m.type() === 'error' && !/ERR_|Failed to load resource|net::|timed out|failed to load/i.test(m.text());

/* A plain context (no cloud). g = what Google does: 'abort' | 'hang'. */
async function plain(vp, { sync = false } = {}) {
  const ctx = await browser.newContext(vp.touch ? { viewport: { width: vp.w, height: vp.h }, hasTouch: true, isMobile: true } : { viewport: { width: vp.w, height: vp.h } });
  const net = { g: 'abort' };
  for (const p of GOOGLE) await ctx.route(p, (r) => (net.g === 'hang' ? undefined : r.abort()));
  await ctx.addInitScript(([db, cfg]) => {
    try { if (!localStorage.getItem('my-notebook-v1')) localStorage.setItem('my-notebook-v1', JSON.stringify(db)); if (cfg) localStorage.setItem('siyagah-sync-v1', JSON.stringify(cfg)); } catch {}
  }, [seed(), sync ? { firebaseConfig: { apiKey: 'fake', projectId: 'fake', authDomain: 'fake', appId: 'fake' }, notebookId: 'nb-o1' } : null]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e));
  page.on('console', (m) => { if (realErr(m)) errors.push('console: ' + m.text()); });
  page.on('dialog', (x) => x.accept().catch(() => {}));
  return { ctx, page, net, errors, vp };
}
const booted = (page, ms = 20000) => page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree'), null, { timeout: ms });
/* two online loads, then wait until the worker controls the page and the page is in its cache */
async function install(s) {
  srv.mode = 'ok';
  await s.page.goto(srv.base + '/', { waitUntil: 'domcontentloaded' }); await booted(s.page);
  await s.page.reload({ waitUntil: 'domcontentloaded' }); await booted(s.page);
  const ok = await s.page.evaluate(async () => {
    if (!navigator.serviceWorker) return false;
    await navigator.serviceWorker.ready;
    for (let i = 0; i < 100; i++) { if (navigator.serviceWorker.controller && (await caches.match('./index.html'))) return true; await new Promise((r) => setTimeout(r, 100)); }
    return false;
  });
  return ok;
}
async function timedBoot(s) {
  const t0 = Date.now();
  try {
    await s.page.goto(srv.base + '/', { waitUntil: 'commit', timeout: 20000 });
    await booted(s.page, Math.max(1000, 30000 - (Date.now() - t0)));
  } catch { return -1; }   /* never answered / never booted: the check reports it, the run goes on */
  return Date.now() - t0;
}
/* the sidebar on screen with the notebook section open (the sections start folded) */
async function openTree(page, vp) {
  const tap = tapper(page, vp);
  await page.evaluate(() => { if (window.innerWidth < 1200) showPane('sb'); });
  if (!(await page.locator('.tr-row[data-fid="f1"]').first().isVisible().catch(() => false))) await tap('#tree >> text=/my notebooks/i');
  await page.waitForSelector('.tr-row[data-fid="f1"]', { state: 'visible', timeout: 5000 });
}
/* sidebar -> folder -> note list -> note, by real taps/clicks */
async function browse(s) {
  const tap = tapper(s.page, s.vp);
  try {
    await openTree(s.page, s.vp);
    await tap('.tr-row[data-fid="f1"]');
    await s.page.waitForSelector('.ar[data-aid="a1"]', { state: 'visible', timeout: 5000 });
    /* aim at the left end of the card: a1 is a favourite and pinned, and its badges sit in the middle */
    const card = s.page.locator('.ar[data-aid="a1"]').first();
    await (s.vp.touch ? card.tap({ position: { x: 30, y: 14 } }) : card.click({ position: { x: 30, y: 14 } }));
    await s.page.waitForFunction(() => ST.article === 'a1' && /Body of the first seeded note/.test(document.body.textContent), null, { timeout: 5000 });
    return true;
  } catch (e) { return String(e).split('\n')[0]; }
}

try {
  /* ══ 74a / 74b / 74c — the same browsing under three networks ══ */
  const states = [
    ['74a', 'clean offline', 2000, async (s) => { srv.mode = 'dead'; s.net.g = 'abort'; await s.ctx.setOffline(true); }],
    ['74b', 'everything hangs', 5000, async (s) => { srv.mode = 'hang'; s.net.g = 'hang'; }],
    ['74c', 'only Google hangs', 2000, async (s) => { srv.mode = 'ok'; s.net.g = 'hang'; }],
  ];
  for (const [tag, what, limit, setNet] of states) {
    if (!want(tag)) continue;
    for (const vp of VPS) {
      const t = `${tag}@${vp.name}`;
      const s = await plain(vp);
      try {
        check(await install(s), `${t} the service worker is installed and holds the page before the network changes`);
        await setNet(s);
        const ms = await timedBoot(s);
        check(ms >= 0 && ms <= limit, `${t} ${what}: the app boots in ${limit / 1000} s or less`, ms < 0 ? 'never booted (30 s)' : `${ms} ms`);
        if (ms >= 0) {
          const b = await browse(s);
          check(b === true, `${t} ${what}: sidebar, folder, note list and a note open by real taps`, String(b));
        }
        check(s.errors.length === 0, `${t} ${what}: no page errors`, s.errors.slice(0, 2).join(' · '));
      } finally { srv.mode = 'ok'; await s.ctx.setOffline(false).catch(() => {}); await s.ctx.close(); }
    }
  }

  /* ══ 74d / 74e — a device on the fake cloud, offline, then back ══ */
  const mkDev = async (cloud, name, vp, sd = seed()) => {
    srv.mode = 'ok';
    const d = await addDevice(browser, srv.base, cloud, name, { width: vp.w, height: vp.h }, vp.touch, sd);
    d.gOn = true; d.vp = vp;
    await d.ctx.route('**gstatic.com/**', (r) => (d.gOn ? r.fallback() : r.abort()));   /* later routes win; fallback goes to the fake SDK */
    return d;
  };
  const goOffline = async (d) => { d.gOn = false; d.offline = true; srv.mode = 'dead'; await d.ctx.setOffline(true); };
  const goOnline = async (d) => { srv.mode = 'ok'; d.gOn = true; d.offline = false; await d.ctx.setOffline(false); };
  const warm = async (d) => {
    await reopen(d);
    return d.page.evaluate(async () => { await navigator.serviceWorker.ready; for (let i = 0; i < 100; i++) { if (navigator.serviceWorker.controller && (await caches.match('./index.html'))) return true; await new Promise((r) => setTimeout(r, 100)); } return false; });
  };
  const waitFor = async (fn, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn().catch(() => false)) return true; await sleep(400); } return false; };

  if (want('74d')) for (const vp of VPS) {
    const t = `74d@${vp.name}`;
    const cloud = makeCloud();
    const A = await mkDev(cloud, 'A', vp), B = await mkDev(cloud, 'B', vp);
    try {
      await waitSeeded(cloud, A); await quiet(cloud, A);
      check(await warm(A), `${t} device A: the service worker is installed`);
      await goOffline(A);
      await reopen(A);   /* an offline boot */
      const tap = tapper(A.page, vp);
      await openTree(A.page, vp);
      /* 1. rename folder f2 */
      await A.page.locator('.tr-row[data-fid="f2"]').first().click({ button: 'right' });
      await tap('#ctx .ci:has-text("Rename folder")');
      await A.page.waitForSelector('#ov.on #inp'); await A.page.locator('#inp').fill('(002) Renamed Offline'); await A.page.keyboard.press('Enter');
      await sleep(500);
      /* 2. a new note in f1 */
      await openTree(A.page, vp);
      await A.page.locator('.tr-row[data-fid="f1"]').first().click({ button: 'right' });
      await tap('#ctx .ci:has-text("Add note here")');
      await A.page.waitForSelector('#ov.on #inp'); await A.page.locator('#inp').fill('Offline new note'); await A.page.keyboard.press('Enter');
      await sleep(900);
      await A.page.evaluate(() => { if (window.innerWidth < 1200) showPane('p3'); });   /* navigation only: a phone shows one pane at a time */
      await A.page.locator('#ed').first().click(); await A.page.keyboard.type('typed while offline');
      await sleep(3200);
      /* 3. edit another note (a2) */
      await A.page.evaluate(() => { if (ST.editing) { try { saveArt(); } catch (e) {} } });
      await openTree(A.page, vp);
      await tap('.tr-row[data-fid="f1"]');
      await A.page.waitForSelector('.ar[data-aid="a2"]', { state: 'visible' }); await tap('.ar[data-aid="a2"]');
      await A.page.waitForFunction(() => ST.article === 'a2');
      await tap('button:has-text("Edit")'); await A.page.waitForSelector('#ed');
      await A.page.locator('#ed').first().click(); await A.page.keyboard.press('Control+End'); await A.page.keyboard.type(' EDITED-OFFLINE');
      await sleep(3200);
      /* 4. a Zab item (the keyboard is put away first: a phone hides the bar while one is up) */
      await A.page.evaluate(() => { if (ST.editing) { try { saveArt(); } catch (e) {} } if (document.activeElement) document.activeElement.blur(); });
      await sleep(500);
      await tap('#jeb-bar .jeb-chip[data-pid="jp-idea"] .jeb-main'); await A.page.waitForSelector('#jeb-panel.on', { timeout: 4000 }); await sleep(400);
      await tap('#jeb-add-in'); await A.page.keyboard.type('Offline zab item'); await A.page.keyboard.press('Enter'); await sleep(900);
      await tap('#jeb-panel .jeb-x'); await sleep(300);
      const have = async (d) => {
        const db = await liveDB(d);
        return {
          folder: db.folders.filter((f) => f.id === 'f2' && f.name === '(002) Renamed Offline').length === 1,
          newNote: db.articles.filter((a) => a.title === 'Offline new note' && /typed while offline/.test(a.content)).length,
          edit: /EDITED-OFFLINE/.test((db.articles.find((a) => a.id === 'a2') || {}).content || ''),
          zab: (db.jeb || []).filter((i) => i.text === 'Offline zab item').length,
          notes: db.articles.length,
        };
      };
      const before = await have(A);
      check(before.folder && before.newNote === 1 && before.edit && before.zab === 1, `${t} offline: the folder rename, the new note, the edit and the Zab item are all in the notebook`, JSON.stringify(before));
      /* the page has no network; reload and look again, from what the device itself stored */
      await sleep(1500);
      await reopen(A);
      const after = await have(A);
      check(after.folder && after.newNote === 1 && after.edit && after.zab === 1, `${t} reloaded while still offline: all four are still there`, JSON.stringify(after));
      check(A.errors.length === 0, `${t} no page errors on the offline device`, A.errors.slice(0, 2).join(' · '));
      /* back online */
      await goOnline(A);
      const got = await waitFor(async () => { const x = await have(B); return x.folder && x.newNote === 1 && x.edit && x.zab === 1; }, 90000);
      const bx = await have(B);
      check(got, `${t} back online: all four reach device B`, JSON.stringify(bx));
      await quiet(cloud, A).catch(() => {});
      const ax = await have(A), bx2 = await have(B);
      check(ax.newNote === 1 && ax.zab === 1 && bx2.newNote === 1 && bx2.zab === 1 && ax.notes === bx2.notes && ax.notes === seed().articles.length + 1,
        `${t} nothing lost or doubled on either device (A ${ax.notes} notes, B ${bx2.notes})`, JSON.stringify({ ax, bx2 }));
    } finally { srv.mode = 'ok'; await A.ctx.close().catch(() => {}); await B.ctx.close().catch(() => {}); }
  }

  if (want('74e')) for (const vp of VPS) {
    const t = `74e@${vp.name}`;
    const cloud = makeCloud();
    const A = await mkDev(cloud, 'A', vp);
    try {
      await waitSeeded(cloud, A);
      check(await warm(A), `${t} the service worker is installed`);
      const gReq = [];
      A.page.on('request', (rq) => { if (/gstatic\.com/.test(rq.url())) gReq.push(Date.now()); });
      await goOffline(A);
      await reopen(A);
      await sleep(1500);
      const off = await on(A, () => ({ fs: !!_syncFsDb, dot: document.getElementById('sync-dot').textContent }));
      check(!off.fs && gReq.length >= 1, `${t} an offline boot: the SDK was tried (${gReq.length} request(s)), failed, and sync is not started (${off.dot})`, JSON.stringify(off));
      const tries = gReq.length;
      await goOnline(A);
      const live = await waitFor(async () => on(A, () => !!_syncFsDb), 30000);
      check(live, `${t} going online starts sync: the SDK loads on a retry and Firestore is up`);
      check(gReq.length > tries, `${t} the failed load was retried for real (${tries} -> ${gReq.length} requests)`);
      const dot = await waitFor(async () => on(A, () => /Live/.test(document.getElementById('sync-dot').textContent)), 30000);
      check(dot, `${t} the status goes to Live`, await on(A, () => document.getElementById('sync-dot').textContent));
      check(A.errors.length === 0, `${t} no page errors`, A.errors.slice(0, 2).join(' · '));
    } finally { srv.mode = 'ok'; await A.ctx.close().catch(() => {}); }
  }

  /* ══ 74f — a new version still arrives (I3) ══ */
  if (want('74f')) for (const vp of VPS) {
    const t = `74f@${vp.name}`;
    const s = await plain(vp);
    const ver = () => s.page.evaluate(() => document.querySelector('meta[name=app-version]').content);
    const keys = () => s.page.evaluate(() => caches.keys());
    try {
      srv.ver = '99.01';
      check(await install(s), `${t} version 99.01 installed`);
      check((await ver()) === '99.01', `${t} the page is 99.01`, await ver());
      srv.ver = '99.02';
      await s.page.reload({ waitUntil: 'domcontentloaded' }); await booted(s.page);
      check((await ver()) === '99.02', `${t} 99.02 served online: the very next load shows 99.02, not the cached 99.01`, await ver());
      await waitFor(async () => (await keys()).join() === 'siyagah-v99.02.01', 12000);   /* the new worker installs a second or two after the page */
      const k = await keys();
      check(k.includes('siyagah-v99.02.01') && !k.includes('siyagah-v99.01.01'), `${t} the new worker took over and purged the old cache`, k.join(','));
      /* an answering-but-slow network (1.5 s) still wins over the cache */
      srv.ver = '99.03'; srv.htmlDelay = 1500;
      const t1 = Date.now();
      await s.page.reload({ waitUntil: 'domcontentloaded' }); await booted(s.page);
      check((await ver()) === '99.03', `${t} a network that answers in 1.5 s still wins (99.03)`, `${await ver()} after ${Date.now() - t1} ms`);
      await waitFor(async () => (await keys()).join() === 'siyagah-v99.03.01', 12000);
      /* a silent-for-5 s network: the cache is served at about 3 s, the late answer refreshes the cache */
      srv.ver = '99.04'; srv.htmlDelay = 5000;
      const t2 = Date.now();
      await s.page.goto(srv.base + '/', { waitUntil: 'commit', timeout: 30000 }); await booted(s.page, 30000);
      const slowMs = Date.now() - t2;
      check((await ver()) === '99.03' && slowMs >= 2500 && slowMs < 4800, `${t} a network silent for 5 s: the cached page (99.03) opens after the 3 s limit`, `${await ver()} after ${slowMs} ms`);
      const readCache = () => s.page.evaluate(async () => { const r = await caches.match('./index.html'); return r ? (await r.text()).match(/name="app-version" content="([^"]+)"/)[1] : null; });
      await waitFor(async () => (await readCache()) === '99.04', 12000);
      const cached = await readCache();
      check(cached === '99.04', `${t} the late answer still refreshed the cache (${cached})`);
      srv.htmlDelay = 0;
      await s.page.reload({ waitUntil: 'domcontentloaded' }); await booted(s.page);
      check((await ver()) === '99.04', `${t} the next load shows 99.04`, await ver());
      check(s.errors.length === 0, `${t} no page errors`, s.errors.slice(0, 2).join(' · '));
    } finally { srv.ver = null; srv.htmlDelay = 0; await s.ctx.close(); }
  }

  /* ══ 74g — I4: a Save File copy opens from disk with no network ══ */
  if (want('74g')) for (const vp of VPS) {
    const t = `74g@${vp.name}`;
    const s = await plain(vp);
    const dir = await mkdtemp(join(tmpdir(), 'siyagah-74g-'));
    try {
      srv.mode = 'ok';
      await s.page.goto(srv.base + '/', { waitUntil: 'domcontentloaded' }); await booted(s.page);
      /* as if the SDK had been loaded in this session: its tags are in the live page */
      await s.page.evaluate(() => { for (const n of ['app', 'firestore', 'auth']) { const e = document.createElement('script'); e.src = `https://www.gstatic.com/firebasejs/9.23.0/firebase-${n}-compat.js`; e.setAttribute('data-test', '1'); document.head.appendChild(e); } });
      const dl = s.page.waitForEvent('download');
      await s.page.evaluate(() => { exportFile(); });
      const d = await dl; const file = join(dir, 'copy.html'); await d.saveAs(file);
      const text = await readFile(file, 'utf8');
      check(!/<script\b[^>]*\bsrc=/i.test(text), `${t} the Save File copy carries no <script src> (the live page had three Firebase tags)`);
      check(!/<body\b[^>]*\sstyle=/i.test(text.replace(/<script id="nd"[\s\S]*?<\/script>/, '')), `${t} the copy has no <body style>`);
      const ctx2 = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, offline: true });
      const p2 = await ctx2.newPage(); const e2 = [];
      p2.on('pageerror', (e) => e2.push(String(e)));
      const t0 = Date.now();
      await p2.goto('file://' + file);
      let ok = true; try { await p2.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree'), null, { timeout: 15000 }); } catch { ok = false; }
      check(ok, `${t} opened from disk with no network: it boots (${Date.now() - t0} ms)`);
      const titles = ok ? await p2.evaluate(() => DB.articles.map((a) => a.title)) : [];
      check(titles.includes('Seeded note one') && titles.includes('Seeded note two'), `${t} the baked notes are there`, titles.join(' | '));
      check(e2.length === 0, `${t} no page errors in the copy`, e2.slice(0, 2).join(' · '));
      await ctx2.close();
    } finally { await s.ctx.close(); await rm(dir, { recursive: true, force: true }).catch(() => {}); }
  }

  /* ══ 74h — the offline wording ══ */
  if (want('74h')) for (const vp of VPS) {
    const t = `74h@${vp.name}`;
    const s = await plain(vp, { sync: true });
    try {
      check(await install(s), `${t} the service worker is installed`);
      await s.ctx.setOffline(true); srv.mode = 'dead'; s.net.g = 'abort';
      await timedBoot(s);
      await sleep(1500);
      const dot = await s.page.evaluate(() => { const e = document.getElementById('sync-dot'); return { cls: e.className, txt: e.textContent, title: e.title, toasts: [...document.querySelectorAll('.toast')].map((x) => x.textContent).join(' | ') }; });
      check(/Offline/.test(dot.txt) && /sd-conn/.test(dot.cls) && !/sd-err/.test(dot.cls), `${t} the status reads Offline and is not an error colour`, JSON.stringify(dot));
      check(/changes are saved on this device and will sync when you.re back online/i.test(dot.title), `${t} it says, in plain words, that changes are saved on this device and will sync later`, dot.title);
      check(!/NOT syncing/i.test(dot.toasts + dot.title), `${t} no "NOT syncing" alarm`, dot.toasts);
      check(s.errors.length === 0, `${t} no page errors`, s.errors.slice(0, 2).join(' · '));
    } finally { srv.mode = 'ok'; await s.ctx.setOffline(false).catch(() => {}); await s.ctx.close(); }
  }

  /* ══ 74i — the ship-check guard can fail ══ */
  if (want('74i')) {
    const dir = await mkdtemp(join(tmpdir(), 'siyagah-74i-'));
    try {
      const html = await readFile(join(ROOT, 'index.html'), 'utf8');
      const run = (file) => spawnSync(process.execPath, [join(ROOT, 'tools/ship-check.mjs')], { encoding: 'utf8', env: { ...process.env, SHIP_HTML: file } });
      const LINE = /index\.html carries no blocking external script or saved-page style/;
      const okLine = (o) => (o.stdout.split('\n').find((l) => LINE.test(l)) || '');
      /* the detail must not start with ok/FAIL, or app-check would read it as a check of its own */
      const say = (l) => l.trim().replace(/^ok\s+/, 'the guard passes: ').replace(/^FAIL\s+/, 'the guard fails: ');
      const real = run(join(ROOT, 'index.html'));
      check(/^\s*ok\s/.test(okLine(real)), '74i the guard passes on the real index.html', say(okLine(real)));
      const variants = [
        ['a static gstatic <script src>', html.replace('</head>', '<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script></head>')],
        ['a baked <style id="dyn-hs">', html.replace('</head>', '<style id="dyn-hs">h1{color:red}</style></head>')],
        ['a <body style="">', html.replace(/<body\b/, '<body style=""')],
        ['a render-blocking Google Fonts <link>', html.replace(' media="print" onload="this.media=\'all\'"', '')],
      ];
      for (const [what, text] of variants) {
        const f = join(dir, 'scratch.html'); await writeFile(f, text);
        const o = run(f);
        check(/^\s*FAIL\s/.test(okLine(o)) && o.status !== 0, `74i the guard FAILS on a scratch copy with ${what} put back`, say(okLine(o)));
      }
    } finally { await rm(dir, { recursive: true, force: true }).catch(() => {}); }
  }
} catch (e) {
  console.log(' FAIL  offline-o1 threw: ' + (e && e.stack || e));
  results.push({ ok: false, label: 'threw' });
} finally {
  await browser.close();
  await srv.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
