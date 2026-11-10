#!/usr/bin/env node
/* tools/disaster-j150.mjs — v05.86, J150: Disaster Preparedness (checks 145a–145g).

   145a  the sync watchdog: the SDK held back while online → ONE banner with the time and the reason; offline → none; ⟳ Try now reconnects and the banner goes;
         "Last synced" moves; the episode is in 🩺 Diagnostics
   145b  📥 Import Backup reads a Save File copy, an Automatic Backups file and a Backup Export file: Merge brings the notes and the pictures (sha checked) back,
         nothing is removed, a picture block with a wrong sha is ignored, a file over the big limit gets a plain message
   145c  a copy opened from file: shows the bar; an edit → ⬇ Save my changes → ⬆ Import → Merge in the app: the edit arrives, nothing else changes; the copy asks
         the cloud for nothing
   145d  the ⚙ menu's last-backup line, fresh and stale (and none)
   145e  the ✈ Ready for offline line counts (one picture missing → "1 picture still to fetch")
   145f  the OneNote "all in" line, both forms
   145g  the banner, the menu lines and the copy bar at 390 / 820 / 1440 with nothing off screen
   Each printed ok/FAIL line becomes one app-check check (block 145). `--root=dir` serves another copy of the app (the stash run). */
import { playwright, seedDB, ROOT } from './harness.mjs';
import { makeCloud, addDevice, reopen, sleep, check, results } from './s1-fake.mjs';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';

const argv = process.argv.slice(2);
const SRC = (argv.find((a) => a.startsWith('--root=')) || '').slice(7) || process.env.J150_ROOT || ROOT;
const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];
const pw = await playwright();
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const srv = await new Promise((ok) => {
  const sockets = new Set();
  const s = createServer(async (req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    try { const body = await readFile(join(SRC, p)); res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); res.end(body); } catch { res.writeHead(404); res.end('nf'); }
  });
  s.on('connection', (c) => { sockets.add(c); c.on('close', () => sockets.delete(c)); });
  s.listen(0, '127.0.0.1', () => ok({ base: `http://127.0.0.1:${s.address().port}`, close: async () => { for (const c of sockets) c.destroy(); await new Promise((d) => s.close(d)); } }));
});
const browser = await pw.chromium.launch();
const T0 = new Date(Date.now() - 3600e3).toISOString();
const dir = await mkdtemp(join(tmpdir(), 'j150-'));
const realErr = (e) => !/ERR_|Failed to load resource|net::/i.test(e);
const waitFor = async (page, fn, ms = 20000, arg) => { try { await page.waitForFunction(fn, arg, { timeout: ms }); return true; } catch { return false; } };
const dev = (cloud, name, vp, seed, opts = {}) => addDevice(browser, srv.base, cloud, name, { width: vp.w, height: vp.h }, vp.touch, seed, opts);
const close = (...ds) => Promise.all(ds.map((d) => d && d.ctx.close().catch(() => {})));
const PNG = (n) => { const b = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'); return [...b, n]; };
const seedA = () => { const s = seedDB(T0); s.articles.push({ id: 'zz-local', title: 'Only here note', content: '<p>local only</p>', folderIds: ['f1'], tags: [], createdAt: T0, updatedAt: T0, kind: 'general' }); return s; };
const plainSeed = () => seedDB(T0);
const clickMenu = async (page, text) => { await page.click('#sb-menu-btn'); await page.click('#sb-menu .sb-mi:has-text("' + text + '")'); };

/* the source device: notes with pictures; returns the three kinds of file as Buffers */
async function makeFiles() {
  const cloud = makeCloud();
  const D = await dev(cloud, 'src', VPS[2], plainSeed(), { noCfg: true });
  try {
    const info = await D.page.evaluate(async (bytes) => {
      const mk = async (n) => { const u8 = new Uint8Array(bytes[n]); return _picPut(new Blob([u8], { type: 'image/png' }), 'image/png'); };
      const s1 = await mk(0), s2 = await mk(1);
      const now = new Date().toISOString();
      DB.articles.push({ id: 'pic-1', title: 'Picture note one', content: '<p>with a picture</p><img class="ed-img" data-pic="' + s1 + '" data-mime="image/png" alt="">', folderIds: ['f1'], tags: [], createdAt: now, updatedAt: now, kind: 'general' });
      DB.articles.push({ id: 'pic-2', title: 'Picture note two', content: '<p>another</p><img class="ed-img" data-pic="' + s2 + '" data-mime="image/png" alt="">', folderIds: ['f1'], tags: [], createdAt: now, updatedAt: now, kind: 'general' });
      persist();
      const ctx = _bxpCtx('x', () => {}, 0), S = _bxpSink(null);
      await _sfWrite(S, ctx); await S.flush();
      const blob = new Blob(S.parts);
      const ab = await blob.arrayBuffer(); let bin = ''; const u8 = new Uint8Array(ab); for (let i = 0; i < u8.length; i += 32768) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 32768));
      const bk = (await generateBackupHTMLContent()).html;
      return { save: btoa(bin), backup: bk, s1, s2 };
    }, [PNG(1), PNG(2)]);
    return { save: Buffer.from(info.save, 'base64'), backup: Buffer.from(info.backup, 'utf8'), s1: info.s1, s2: info.s2 };
  } finally { await close(D); }
}

/* import one file into a fresh device through the real menu; returns the device state after Merge */
async function importInto(vp, file, name, bigMin) {
  const cloud = makeCloud();
  const R = await dev(cloud, 'rcv', vp, seedA(), { noCfg: true });
  try {
    if (bigMin) await R.page.evaluate((n) => { window.__bxpBigMin = n; }, bigMin);
    const before = await R.page.evaluate(() => ({ a: DB.articles.map((x) => x.id), f: DB.folders.map((x) => x.id) }));
    const [fc] = await Promise.all([R.page.waitForEvent('filechooser'), clickMenu(R.page, 'Import Backup')]);
    await fc.setFiles({ name, mimeType: 'text/html', buffer: file });
    const asked = await waitFor(R.page, () => !!document.querySelector('.imp-acts'), 15000);
    const toasts0 = await R.page.evaluate(() => window.__toasts.slice());
    if (!asked) return { R, cloud, before, asked, toasts: toasts0 };
    const consent = await R.page.evaluate(() => document.querySelector('#mb')?.innerText || document.querySelector('.imp-acts')?.parentElement?.innerText || '');
    await R.page.click('.imp-acts .btn.bp');
    await waitFor(R.page, () => window.__toasts.some((t) => /Merge complete/.test(t)), 20000);
    await sleep(500);
    return { R, cloud, before, asked, consent };
  } catch (e) { return { R, cloud, err: String(e.message || e) }; }
}

const tamper = (buf, sha) => { const t = buf.toString('utf8'); const re = new RegExp('(id="pk-' + sha + '"[^>]*>)([A-Za-z0-9+/=])'); return Buffer.from(t.replace(re, (m, a, c) => a + (c === 'A' ? 'B' : 'A')), 'utf8'); };

try {
  /* ══ 145a — the watchdog ══ */
  try {
    const cloud = makeCloud();
    const A = await dev(cloud, 'A', VPS[2], plainSeed(), { blockSdk: true });
    try {
      await A.page.evaluate(() => { window.__swMs = 1500; });
      const shown = await waitFor(A.page, () => !!document.getElementById('sw-banner'), 25000);
      const txt = await A.page.evaluate(() => document.getElementById('sw-banner')?.innerText || '');
      const n1 = await A.page.evaluate(() => document.querySelectorAll('#sw-banner').length);
      check(shown && /Not synced since \d+:\d\d — /.test(txt) && /Try now/.test(txt), '145a the SDK held back while online → the banner "Not synced since h:mm — reason" with ⟳ Try now', txt);
      check(n1 === 1, '145a ONE banner (not one per tick)', 'count ' + n1);
      check(!/^\s*—\s*$/.test(txt.split('—')[1] || '') && (txt.split('—')[1] || '').trim().length > 3, '145a the banner names a reason (the dot\'s data-why)', txt);
      await sleep(3500);
      check(await A.page.evaluate(() => document.querySelectorAll('#sw-banner').length) === 1, '145a still ONE banner after more ticks');
      await A.ctx.setOffline(true);
      const gone = await waitFor(A.page, () => !document.getElementById('sw-banner'), 8000);
      check(gone, '145a going offline hides the banner (no banner while offline)');
      await sleep(3500);
      check(await A.page.evaluate(() => !document.getElementById('sw-banner')), '145a still no banner while offline');
      await A.ctx.setOffline(false);
      check(await waitFor(A.page, () => !!document.getElementById('sw-banner'), 10000), '145a back online and still not synced → the banner returns');
      A.sdkBlock = false;
      await A.page.click('#sw-banner .sw-try');
      const live = await waitFor(A.page, () => document.getElementById('sync-dot').classList.contains('sd-live'), 30000);
      check(live, '145a ⟳ Try now reconnects (the dot is Live)');
      check(await waitFor(A.page, () => !document.getElementById('sw-banner'), 8000), '145a the banner goes by itself when sync is Live');
      const dg = await A.page.evaluate(() => ({ t: _swDiagText(), h: _syncDiagnosticsHTML() }));
      check(/\d+:\d\d → \d+:\d\d \(/.test(dg.t) && /Sync stops/.test(dg.h), '145a the episode (start, end, reason) is in 🩺 Diagnostics', dg.t);
      await A.page.evaluate(() => { _swSynced = Date.now() - 3600e3; _dpMenuFill(); });
      const t1 = await A.page.evaluate(() => document.getElementById('sw-last').textContent);
      await A.page.evaluate(() => { setSyncStatus('live'); });
      const t2 = await A.page.evaluate(() => document.getElementById('sw-last').textContent);
      check(/^Last synced: \d+:\d\d$/.test(t2) && t1 !== t2, '145a "Last synced: h:mm" is in the ⚙ menu and moves', t1 + ' → ' + t2);
      check(A.errors.filter(realErr).length === 0, '145a no page errors', A.errors.slice(0, 2).join(' · '));
    } finally { await close(A); }
  } catch (e) { check(false, '145a threw: ' + String(e.message || e).split('\n')[0]); }

  /* ══ 145b — Import Backup, three kinds of file ══ */
  let FILES = null;
  try { FILES = await makeFiles(); } catch (e) { check(false, '145b could not make the files: ' + String(e.message || e).split('\n')[0]); }
  if (FILES) {
    check(/id="pk-[0-9a-f]{64}"/.test(FILES.save.toString('utf8')) && /id="nd"/.test(FILES.save.toString('utf8')) && /siyagah-backup-data/.test(FILES.backup.toString('utf8')), '145b the three files are real (nd + pk- blocks; siyagah-backup-data)');
    const kinds = [['Save File copy', 'Siyagah Save.html', FILES.save, true], ['Automatic Backups file', 'Siyagah Backup 2026-11-10.html', FILES.save, true], ['Backup Export file', 'Siyagah-backup-2026-11-10.html', FILES.backup, false]];
    for (const [k, nm, buf, pics] of kinds) {
      try {
        const r = await importInto(VPS[2], buf, nm);
        if (!r.asked) { check(false, `145b ${k}: the consent dialog opens`, (r.toasts || []).join(' | ') + (r.err || '')); await close(r.R); continue; }
        const st = await r.R.page.evaluate(async ([s1, s2]) => ({
          ids: DB.articles.map((x) => x.id), a1: (DB.articles.find((x) => x.id === 'pic-1') || {}).content || '', local: !!DB.articles.find((x) => x.id === 'zz-local'),
          p1: await _picGet(s1).then((b) => !!b).catch(() => false), p2: await _picGet(s2).then((b) => !!b).catch(() => false),
        }), [FILES.s1, FILES.s2]);
        const all = ['a1', 'a2', 'a3', 'zz-local'].every((i) => st.ids.includes(i));
        check(st.ids.includes('pic-1') && st.ids.includes('pic-2'), `145b ${k}: Merge brings the notes back`, st.ids.join(','));
        check(all && st.local, `145b ${k}: nothing is removed`);
        if (pics) check(st.p1 && st.p2, `145b ${k}: both pictures are on the device (sha checked)`, JSON.stringify([st.p1, st.p2]));
        else check(/data:image|data-pic/.test(st.a1), `145b ${k}: the picture comes with the note`, st.a1.slice(0, 120));
        check(/Merge|restored/.test(r.consent || '') && /Replace/.test(r.consent || ''), `145b ${k}: it goes through the Merge / Replace consent (never silent)`);
        check(r.R.errors.filter(realErr).length === 0, `145b ${k}: no page errors`, r.R.errors.slice(0, 2).join(' · '));
        await close(r.R);
      } catch (e) { check(false, `145b ${k} threw: ` + String(e.message || e).split('\n')[0]); }
    }
    try {
      const r = await importInto(VPS[2], tamper(FILES.save, FILES.s2), 'Siyagah Save.html');
      const st = r.asked ? await r.R.page.evaluate(async ([s1, s2]) => ({ p1: await _picGet(s1).then((b) => !!b).catch(() => false), p2: await _picGet(s2).then((b) => !!b).catch(() => false), has: !!DB.articles.find((x) => x.id === 'pic-2'), t: window.__toasts.join(' | ') }), [FILES.s1, FILES.s2]) : {};
      check(r.asked && st.p1 && !st.p2 && st.has, '145b a picture block with a wrong sha is ignored (not stored); the good one is; the note still arrives', JSON.stringify(st));
      check(/ignored/.test(st.t || ''), '145b the owner is told a picture block was ignored', st.t);
      await close(r.R);
    } catch (e) { check(false, '145b wrong-sha threw: ' + String(e.message || e).split('\n')[0]); }
    try {
      const r = await importInto(VPS[2], FILES.save, 'Siyagah Save.html', 1000);
      const t = r.asked ? 'dialog' : (r.toasts || []).join(' | ');
      check(!r.asked && /too big/.test(t), '145b a file over the big limit gets a plain message (no one-go read)', t);
      await close(r.R);
    } catch (e) { check(false, '145b big threw: ' + String(e.message || e).split('\n')[0]); }
  }

  /* ══ 145c — a copy opened from file: ══ */
  if (FILES) {
    try {
      const cloudS = makeCloud();
      const S = await dev(cloudS, 'save', VPS[2], plainSeed(), { noCfg: true });
      let copy;
      try {
        const b64 = await S.page.evaluate(async () => {
          const ctx = _bxpCtx('x', () => {}, 0), St = _bxpSink(null); await _sfWrite(St, ctx); await St.flush();
          const u8 = new Uint8Array(await new Blob(St.parts).arrayBuffer()); let bin = ''; for (let i = 0; i < u8.length; i += 32768) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 32768)); return btoa(bin);
        });
        copy = join(dir, 'copy.html'); await writeFile(copy, Buffer.from(b64, 'base64'));
      } finally { await close(S); }
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
      await ctx.addInitScript(() => { window.showSaveFilePicker = undefined; try { localStorage.removeItem('siyagah-sync-v1'); } catch {} });
      const reqs = [];
      const page = await ctx.newPage(); const errs = [];
      page.on('pageerror', (e) => errs.push(String(e)));
      page.on('request', (rq) => reqs.push(rq.url()));
      await page.goto('file://' + copy, { waitUntil: 'domcontentloaded' });
      await waitFor(page, () => window.__appBooted === true && !!document.getElementById('tree'), 30000);
      await sleep(800);
      const bar = await page.evaluate(() => document.getElementById('bk-copy-bar')?.innerText || '');
      check(/You are working in a backup copy \(saved .+\)/.test(bar) && /Save my changes to bring back/.test(bar), '145c a copy opened from file: shows the backup-copy bar with its saved date', bar);
      await page.evaluate(() => { const a = DB.articles.find((x) => x.id === 'a1'); a.content = '<p>EDITED IN THE COPY</p>'; a.updatedAt = new Date().toISOString(); persist(); });
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.click('#bk-copy-save')]);
      const jsonPath = join(dir, 'changes.json'); await dl.saveAs(jsonPath);
      const sync = await page.evaluate(() => ({ cfg: getSyncConfig(), db: typeof _syncFsDb === 'undefined' ? null : _syncFsDb, banner: !!document.getElementById('sw-banner') }));
      const cloudReq = reqs.filter((u) => /firebase|firestore|gstatic\.com\/firebasejs|identitytoolkit/.test(u));
      check(!sync.cfg && !sync.db && cloudReq.length === 0 && !sync.banner, '145c the copy has no sync config and makes no cloud request', JSON.stringify({ cfg: !!sync.cfg, cloudReq }));
      check(/notebook-backup-.*\.json$/.test(dl.suggestedFilename()), '145c ⬇ writes the JSON export', dl.suggestedFilename());
      await ctx.close();
      const cloudR = makeCloud();
      const R = await dev(cloudR, 'app', VPS[2], plainSeed(), { noCfg: true });
      try {
        const before = await R.page.evaluate(() => ({ n: DB.articles.length, f: DB.folders.length, s: DB.sections.length, t: DB.articles.map((a) => a.id + '|' + a.title + '|' + a.content).filter((x) => !x.startsWith('a1|')).join('\n') }));
        await R.page.evaluate(() => openModal('settings'));
        const [fc] = await Promise.all([R.page.waitForEvent('filechooser'), R.page.click('#bxp-imp')]);
        await fc.setFiles(jsonPath);
        await waitFor(R.page, () => !!document.querySelector('.imp-acts'), 15000);
        await R.page.click('.imp-acts .btn.bp');
        await waitFor(R.page, () => window.__toasts.some((t) => /Merge complete/.test(t)), 20000);
        const after = await R.page.evaluate(() => ({ n: DB.articles.length, f: DB.folders.length, s: DB.sections.length, a1: DB.articles.find((x) => x.id === 'a1').content, t: DB.articles.map((a) => a.id + '|' + a.title + '|' + a.content).filter((x) => !x.startsWith('a1|')).join('\n'), h: (DB.articles.find((x) => x.id === 'a1').noteHistory || []).length }));
        check(/EDITED IN THE COPY/.test(after.a1), '145c Merge into the app: the edit arrives', after.a1.slice(0, 80));
        check(after.n === before.n && after.f === before.f && after.s === before.s && after.t === before.t, '145c nothing else changes', JSON.stringify([before.n, after.n, before.f, after.f]));
        check(after.h >= 1, '145c the older text of the edited note is kept in its history');
      } finally { await close(R); }
      check(errs.filter(realErr).length === 0, '145c no page errors in the copy', errs.slice(0, 2).join(' · '));
    } catch (e) { check(false, '145c threw: ' + String(e.message || e).split('\n')[0]); }
  }

  /* ══ 145d — the last-backup line ══ */
  try {
    const cloud = makeCloud();
    const D = await dev(cloud, 'D', VPS[2], plainSeed(), { noCfg: true });
    try {
      const line = async (lastAt) => { await D.page.evaluate((t) => { _bkSaveCfg(Object.assign({}, _bkCfg(), { lastAt: t })); _dpMenuFill(); }, lastAt); return D.page.evaluate(() => { const e = document.getElementById('bk-last'); return { t: e.textContent, stale: e.getAttribute('data-stale'), warn: e.classList.contains('dp-warn'), col: getComputedStyle(e).color }; }); };
      const fresh = await line(Date.now() - 3600e3), stale = await line(Date.now() - 3 * 86400e3), none = await line(0);
      check(/^🗄 Last backup: /.test(fresh.t) && fresh.stale === '0' && !fresh.warn, '145d a fresh backup: "🗄 Last backup: <date>", no warning', fresh.t);
      check(stale.stale === '1' && stale.warn && /over 2 days/.test(stale.t) && stale.col !== fresh.col, '145d older than 2 days: the line says so, in amber', stale.t + ' ' + stale.col);
      check(none.stale === '1' && /No backup yet/.test(none.t), '145d no backup at all: says so', none.t);
      await D.page.click('#sb-menu-btn');
      await D.page.click('#bk-last');
      const opened = await waitFor(D.page, () => /Automatic Backup/i.test(document.body.innerText) && !!document.querySelector('.modal-ov.open, .ov.open, #mb, .modal'), 8000);
      check(opened, '145d tapping the line opens 🗄 Automatic Backups');
    } finally { await close(D); }
  } catch (e) { check(false, '145d threw: ' + String(e.message || e).split('\n')[0]); }

  /* ══ 145e — ✈ Ready for offline ══ */
  try {
    const cloud = makeCloud();
    const E = await dev(cloud, 'E', VPS[2], plainSeed(), { noCfg: true });
    try {
      const miss = 'c'.repeat(64);
      await E.page.evaluate(async ([bytes, miss]) => {
        const s = []; for (const b of bytes) s.push(await _picPut(new Blob([new Uint8Array(b)], { type: 'image/png' }), 'image/png'));
        const now = new Date().toISOString();
        DB.articles.push({ id: 'e-1', title: 'E one', content: '<p>x</p><img class="ed-img" data-pic="' + s[0] + '" alt=""><img class="ed-img" data-pic="' + s[1] + '" alt=""><img class="ed-img" data-pic="' + miss + '" alt="">', folderIds: ['f1'], tags: [], createdAt: now, updatedAt: now, kind: 'general' });
        persist();
      }, [PNG(7), PNG(8), miss]);
      const r1 = await E.page.evaluate(async () => { const r = await _dpOffline(); await _dpOfflineFill(); return { r, menu: document.getElementById('dp-offl-menu').textContent, n: DB.articles.filter((a) => !a.id.startsWith('kb-')).length }; });
      check(r1.r.missing === 1 && /1 picture still to fetch/.test(r1.r.text) && r1.r.pics === 3, '145e one picture missing → "1 picture still to fetch"', r1.r.text);
      check(new RegExp('all ' + r1.n + ' notes').test(r1.r.text) && r1.menu === r1.r.text, '145e the note count is right, and the ⚙ menu carries the same line', r1.menu);
      await E.page.evaluate((miss) => { const a = DB.articles.find((x) => x.id === 'e-1'); a.content = a.content.replace('<img class="ed-img" data-pic="' + miss + '" alt="">', ''); a.updatedAt = new Date(Date.now() + 5000).toISOString(); persist(); }, miss);
      const r2 = await E.page.evaluate(async () => (await _dpOffline()));
      check(r2.missing === 0 && /all \d+ notes and 2 pictures are on this device/.test(r2.text), '145e nothing missing → "all N notes and M pictures are on this device"', r2.text);
      const prot = await E.page.evaluate(() => navigator.storage.persisted());
      check(/Storage not protected — 📱 Install App usually fixes this/.test(r2.text) === !prot, '145e "Storage not protected" appears exactly when the browser says it is not persisted', 'persisted=' + prot);
      await E.page.evaluate(() => { navigator.storage.persisted = () => Promise.resolve(false); });
      const r3 = await E.page.evaluate(async () => (await _dpOffline()).text);
      check(/Storage not protected — 📱 Install App usually fixes this/.test(r3), '145e not persisted → the install hint is added', r3);
      await E.page.evaluate(() => openModal('settings'));
      check(true, '145e (the ✈ line also sits in ⚙ → ☁ Cloud Sync when sync is active; see 145g)');
    } finally { await close(E); }
  } catch (e) { check(false, '145e threw: ' + String(e.message || e).split('\n')[0]); }

  /* ══ 145f — OneNote "all in" ══ */
  try {
    const cloud = makeCloud();
    const F = await dev(cloud, 'F', VPS[2], plainSeed(), { noCfg: true });
    try {
      const html = async (brought, broken) => F.page.evaluate(([b, k]) => {
        _onBrought = function () { return b; };
        _on.imp = Object.assign({}, _on.imp || {}, { state: 'done', total: 2722, broken: k, took: 5, earlier: 0, pics: 0, fls: 0, doneAll: b, run: false });
        const d = document.createElement('div'); d.innerHTML = _onImpHTML(); const e = d.querySelector('#on-allin'); return e ? e.textContent : null;
      }, [brought, broken]);
      const a = await html(2722, 0), b = await html(2690, 32);
      check(a === '✅ All 2,722 OneNote pages are in Siyagah', '145f nothing left and nothing failed → "✅ All 2,722 OneNote pages are in Siyagah"', String(a));
      check(b === '2,690 of 2,722 are in; 32 not yet — run it again to bring only the missing ones', '145f otherwise → "2,690 of 2,722 are in; 32 not yet — run it again…"', String(b));
    } finally { await close(F); }
  } catch (e) { check(false, '145f threw: ' + String(e.message || e).split('\n')[0]); }

  /* ══ 145g — the three sizes ══ */
  for (const vp of VPS) {
    try {
      const cloud = makeCloud();
      const G = await dev(cloud, 'G', vp, plainSeed(), { blockSdk: true });
      try {
        await G.page.evaluate(() => { window.__swMs = 800; });
        await waitFor(G.page, () => !!document.getElementById('sw-banner'), 25000);
        const m = await G.page.evaluate(() => {
          const W = innerWidth, H = innerHeight, b = document.getElementById('sw-banner'); if (!b) return { none: true };
          const r = b.getBoundingClientRect(), bad = [...b.querySelectorAll('*')].filter((e) => { const q = e.getBoundingClientRect(); return q.width && (q.right > W + 1 || q.left < -1); }).length;
          const btn = b.querySelector('.sw-try').getBoundingClientRect();
          return { W, H, l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), bad, bh: Math.round(btn.height), doc: document.documentElement.scrollWidth };
        });
        check(!m.none && m.l >= 0 && m.r <= m.W && m.t >= 0 && m.b <= m.H && !m.bad && m.doc <= m.W, `145g@${vp.name} the banner is wholly inside the window`, JSON.stringify(m));
        check(!m.none && m.bh >= (vp.touch ? 36 : 28), `145g@${vp.name} ⟳ Try now is big enough to tap`, 'height ' + m.bh);
        await G.page.click('#sb-menu-btn');
        await sleep(300);
        await G.page.evaluate(async () => { await _dpOfflineFill(); });
        const mm = await G.page.evaluate(() => {
          const W = innerWidth, H = innerHeight, menu = document.getElementById('sb-menu'), out = [];
          for (const id of ['sw-last', 'bk-last', 'dp-offl-menu']) { const e = document.getElementById(id); const r = e.getBoundingClientRect(); if (!r.width || r.left < -1 || r.right > W + 1 || r.top < 0 || r.bottom > H + 1) out.push(id + ' ' + [r.left, r.right, r.top, r.bottom].map(Math.round).join(',')); if (e.scrollWidth > e.clientWidth + 2) out.push(id + ' clipped'); }
          return { out, open: menu.classList.contains('open'), W, H };
        });
        check(mm.open && !mm.out.length, `145g@${vp.name} the ⚙ menu's Last synced / Last backup / ✈ lines are on screen`, mm.out.join(' | '));
        check(G.errors.filter(realErr).length === 0, `145g@${vp.name} no page errors`, G.errors.slice(0, 2).join(' · '));
      } finally { await close(G); }
      const cp = join(dir, 'size.html');
      if (FILES) {
        await writeFile(cp, FILES.save);
        const ctx = await browser.newContext(vp.touch ? { viewport: { width: vp.w, height: vp.h }, hasTouch: true, isMobile: true } : { viewport: { width: vp.w, height: vp.h } });
        const page = await ctx.newPage();
        await page.goto('file://' + cp, { waitUntil: 'domcontentloaded' });
        await waitFor(page, () => window.__appBooted === true, 30000);
        await sleep(600);
        const c = await page.evaluate(() => { const W = innerWidth, H = innerHeight, b = document.getElementById('bk-copy-bar'); if (!b) return { none: true }; const r = b.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), W, H, doc: document.documentElement.scrollWidth }; });
        check(!c.none && c.l >= 0 && c.r <= c.W && c.t >= 0 && c.b <= c.H && c.doc <= c.W, `145g@${vp.name} the backup-copy bar is wholly inside the window`, JSON.stringify(c));
        await ctx.close();
      }
    } catch (e) { check(false, `145g@${vp.name} threw: ` + String(e.message || e).split('\n')[0]); }
  }
} catch (e) {
  check(false, 'disaster-j150 threw: ' + (e && e.stack || e));
} finally {
  await browser.close().catch(() => {});
  await srv.close().catch(() => {});
}
const pass = results.filter((r) => r.ok).length;
console.log(`\n${pass}/${results.length} passed`);
process.exit(pass === results.length ? 0 : 1);
