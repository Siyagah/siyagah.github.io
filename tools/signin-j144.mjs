#!/usr/bin/env node
/* tools/signin-j144.mjs — v05.85, J144: open on a new PC with only "Sign in with Google" (checks 144a–144g).

   A fake Firebase (s1-fake.mjs) and ONE fake cloud per scenario. The built-in switch is a `const` in the page, so a check turns it on with the test hook
   window.__builtinOn (an init script) and reloads; 144a leaves it off. A "fresh browser" is addDevice(..., {noCfg:true}) (no sync config in localStorage).
   144a  switch off: a fresh browser behaves as today (no sign-in started, no cloud read or write, the "Set up Cloud Sync first" hint)
   144b  switch on: signs in, reads owners/{uid}, saves {builtin code, nb}, syncs and shows the notes; with NO pointer: the message, nothing written, no config
   144c  a device with its own config ignores the built-in code (config and notebook id unchanged)
   144d  the rules text: the uid, the pub read rule, no email, every root the source uses; the paths a session touches are all roots of the rule; the self-test
   144e  the pointer is written once (not on every push), not before the first read, and a second device does not rewrite it
   144f  a file: open and a Save File copy never use the built-in code
   144g  the 🔐 section at 390 / 820 / 1440 with nothing off screen
   Each printed ok/FAIL line becomes one app-check check (block 144). `--root=dir` serves another copy of the app (the stash run). */
import { playwright, seedDB, ROOT } from './harness.mjs';
import { makeCloud, addDevice, reopen, sleep, check, results, push } from './s1-fake.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const argv = process.argv.slice(2);
const SRC = (argv.find((a) => a.startsWith('--root=')) || '').slice(7) || process.env.J144_ROOT || ROOT;
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
const T0 = new Date().toISOString();
const seedWith = (title) => { const s = seedDB(T0); s.articles = [...s.articles, { id: 'cloud-1', title, content: '<p>' + title + '</p>', folderIds: ['f1'], tags: [], createdAt: T0, updatedAt: T0, kind: 'general' }]; return s; };
const emptySeed = () => { const s = seedDB(T0); s.articles = []; return s; };
const NOTE = 'Note from the first device J144';

const dev = (cloud, name, vp, seed, opts = {}) => addDevice(browser, srv.base, cloud, name, { width: vp.w, height: vp.h }, vp.touch, seed, opts);
const builtinOn = async (d) => { await d.ctx.addInitScript('window.__builtinOn = true;'); await reopen(d); };
const cfgOf = (d) => d.page.evaluate(() => { try { return JSON.parse(localStorage.getItem('siyagah-sync-v1')); } catch { return null; } });
const waitFor = async (d, fn, ms = 30000) => { try { await d.page.waitForFunction(fn, null, { timeout: ms }); return true; } catch { return false; } };
const ownerWrites = (cloud) => cloud.log.filter((o) => o.t === 'set' && o.p.startsWith('owners/'));
const realErr = (e) => !/ERR_|Failed to load resource|net::/i.test(e);
const close = (...ds) => Promise.all(ds.map((d) => d && d.ctx.close().catch(() => {})));

/* a notebook with a pointer: device A (own config, nb-s1) seeded with a note, pointer written */
async function owner(vp) {
  const cloud = makeCloud();
  const A = await dev(cloud, 'A', vp, seedWith(NOTE));
  const ok = await waitFor(A, () => typeof _s1RdCaught !== 'undefined' && _s1RdCaught === true, 40000);
  const wrote = await (async () => { for (let i = 0; i < 40; i++) { if (cloud.store.has('owners/u-s1')) return true; await sleep(500); } return false; })();
  return { cloud, A, ok, wrote };
}

try {
  const vp0 = VPS[2];

  /* ══ 144a — switch off ══ */
  {
    const cloud = makeCloud();
    const d = await dev(cloud, 'F', vp0, emptySeed(), { noCfg: true });
    try {
      await sleep(4000);
      const s = await d.page.evaluate(() => ({ auth: !!_authInstance, bi: _biMode, on: _BUILTIN_ON, cfg: localStorage.getItem('siyagah-sync-v1'), hint: (document.getElementById('login-err') || {}).textContent || '', fb: typeof firebase }));
      check(s.on === false, '144a the shipped switch _BUILTIN_ON is false');
      check(!s.auth && !s.bi && !s.cfg, '144a switch off: no sign-in started, no config made', JSON.stringify(s));
      check(/Set up Cloud Sync first/.test(s.hint), '144a the hint is the one of today', s.hint);
      check(cloud.log.length === 0 && cloud.reads.length === 0, '144a no cloud read or write', `${cloud.reads.length} reads, ${cloud.log.length} writes`);
      check(d.errors.filter(realErr).length === 0, '144a no page errors', d.errors.slice(0, 2).join(' · '));
    } finally { await close(d); }
  }

  /* ══ 144b — switch on ══ */
  {
    const { cloud, A, ok, wrote } = await owner(vp0);
    let B;
    try {
      check(ok && wrote, '144b setup: device A read, then wrote the pointer owners/u-s1', `caught=${ok} pointer=${wrote}`);
      const ptr = cloud.store.get('owners/u-s1') || {};
      check(ptr.nb === 'nb-s1' && !!ptr.at && /^\d\d\.\d\d$/.test(ptr.b || ''), '144b the pointer is {nb, at, b}', JSON.stringify(ptr));
      B = await dev(cloud, 'B', vp0, emptySeed(), { noCfg: true });
      await builtinOn(B);
      const got = await waitFor(B, () => { try { const c = JSON.parse(localStorage.getItem('siyagah-sync-v1')); return !!(c && c.notebookId); } catch { return false; } }, 40000);
      const cfg = await cfgOf(B);
      check(got && cfg.notebookId === 'nb-s1' && cfg.firebaseConfig.projectId === 'aaas-notebook', '144b a fresh browser signs in, reads owners/{uid} and keeps {built-in code, nb}', JSON.stringify(cfg && { nb: cfg.notebookId, p: cfg.firebaseConfig && cfg.firebaseConfig.projectId }));
      check(cloud.reads.some((r) => r.dev === 'B' && r.p === 'owners/u-s1'), '144b it read owners/u-s1');
      const shown = await B.page.waitForFunction((t) => (DB.articles || []).some((a) => a.title === t), NOTE, { timeout: 60000 }).then(() => true).catch(() => false);
      check(shown, '144b the notebook syncs: the note from the first device is in B');
      const listed = await B.page.evaluate((t) => document.body.innerText.includes(t) || (DB.articles || []).some((a) => a.title === t), NOTE);
      check(listed, '144b ...and B shows its notes');
      const bWrites = cloud.log.filter((o) => o.dev === 'B' && o.t === 'set');
      check(bWrites.every((o) => o.p.startsWith('notebooks/nb-s1/')), '144b B wrote only inside the found notebook', bWrites.slice(0, 3).map((o) => o.p).join(', '));
      check(B.errors.filter(realErr).length === 0, '144b no page errors', B.errors.slice(0, 2).join(' · '));
    } finally { await close(A, B); }

    /* no pointer: an empty cloud */
    const cloud2 = makeCloud();
    const N = await dev(cloud2, 'N', vp0, emptySeed(), { noCfg: true });
    try {
      await builtinOn(N);
      const shown = await waitFor(N, () => /No notebook found/.test((document.getElementById('sync-mb') || {}).innerText || ''), 30000);
      const txt = await N.page.evaluate(() => (document.getElementById('sync-mb') || {}).innerText || '');
      check(shown && /No notebook found for this Google account yet — open Siyagah on a device that already syncs, or set up sync/.test(txt), '144b no pointer: the plain message is shown', txt.slice(0, 160));
      check(/Cloud Sync Setup/.test(txt) && (await N.page.evaluate(() => getComputedStyle(document.getElementById('sync-modal')).display)) !== 'none', '144b ...and the existing setup dialog is offered');
      await sleep(1500);
      check(cloud2.log.length === 0, '144b no pointer: nothing was written to the cloud (no notebook made)', JSON.stringify(cloud2.log.slice(0, 3)));
      check((await cfgOf(N)) === null, '144b no pointer: no config was saved');
      check(N.errors.filter(realErr).length === 0, '144b no page errors (no pointer)', N.errors.slice(0, 2).join(' · '));
    } finally { await close(N); }
  }

  /* ══ 144c — a device with its own config ══ */
  {
    const cloud = makeCloud();
    cloud.store.set('owners/u-s1', { nb: 'nb-other', b: '05.85' });
    const C = await dev(cloud, 'C', vp0, seedWith(NOTE));
    try {
      await builtinOn(C);
      await sleep(5000);
      const s = await C.page.evaluate(() => ({ bi: _biMode, ok: _builtinCfgOk(), cfg: JSON.parse(localStorage.getItem('siyagah-sync-v1')) }));
      check(!s.bi && !s.ok && s.cfg.notebookId === 'nb-s1' && s.cfg.firebaseConfig.projectId === 'fake', '144c a device with its own config ignores the built-in code and keeps its notebook id', JSON.stringify({ bi: s.bi, nb: s.cfg.notebookId, p: s.cfg.firebaseConfig.projectId }));
      check(C.errors.filter(realErr).length === 0, '144c no page errors', C.errors.slice(0, 2).join(' · '));
    } finally { await close(C); }
  }

  /* ══ 144d — the rules text, and the self-test ══ */
  {
    const { cloud, A } = await owner(vp0);
    try {
      const src = readFileSync(join(SRC, 'index.html'), 'utf8');
      const text = await A.page.evaluate(() => _oaRules(_authInstance.currentUser.uid));
      const roots = await A.page.evaluate(() => _OA_ROOTS.slice());
      check(text.includes("request.auth.uid == 'u-s1'") && text.includes('request.auth != null'), '144d the rules text carries the signed-in uid', text.slice(0, 80));
      check(text.includes('match /notebooks/{nb}/pub/{doc=**}') && /allow read: if true;/.test(text), '144d notebooks/{nb}/pub/** is readable by anyone');
      check(!/[\w.+-]+@[\w-]+\.[\w.]+/.test(text) && !/owner@example/.test(text) && !/[\w.+-]+@[\w-]+\.[\w.]+/.test(src.slice(src.indexOf('v05.85 · J144'), src.indexOf('v05.85 · J144') + 9000).replace(/@(claude|media|keyframes|import|font-face)/g, '')), '144d no email in the text or in the J144 code');
      /* every root the source uses: db.collection('X') straight off the database */
      const found = new Set();
      for (const m of src.matchAll(/(?:_syncFsDb|firestore\([^)]*\)|\bfs|\bdb)\s*\.collection\((['"])([\w-]+)\1\)/g)) found.add(m[2]);
      found.delete('zz-probe-other');   /* the self-test's deliberate outsider: it must be REFUSED, so it is not in the rule */
      const missing = [...found].filter((r) => !roots.includes(r) || !text.includes('match /' + r + '/{any=**}'));
      check(found.size >= 1 && !missing.length, `144d every top-level collection in the source is in the rules (${[...found].join(', ')})`, 'missing: ' + missing.join(', '));
      check(roots.includes('owners') && text.includes('match /owners/{any=**}'), '144d the pointer collection owners is in the rules');
      /* every path this session touched, on the fake cloud, starts with a root */
      await A.page.evaluate(() => { DB.articles[0].title += ' x'; DB.articles[0].updatedAt = new Date().toISOString(); });
      await push(cloud, A);
      const paths = [...new Set([...cloud.log.map((o) => o.p), ...cloud.reads.map((r) => r.p)])];
      const stray = paths.filter((p) => !roots.includes(p.split('/')[0]));
      check(paths.length > 5 && !stray.length, `144d all ${paths.length} paths the app read or wrote are under a root of the rule`, stray.slice(0, 3).join(', '));
      check(!(await A.page.evaluate(() => _oaRules('bad uid"; allow'))), '144d a uid with odd characters makes no rules text');
      /* self-test: the rule in place (zz-probe-other refused) */
      await A.page.evaluate(() => openSyncModal());
      cloud.refuse.push('zz-probe-other');
      await A.page.click('#oa-test');
      const okTxt = await waitFor(A, () => /Only your account can get in|not in place|Could not/.test((document.getElementById('oa-res') || {}).textContent || ''), 15000).then(() => A.page.evaluate(() => document.getElementById('oa-res').textContent));
      check(/✅ Only your account can get in/.test(okTxt), '144d self-test with the rule in place: ✅ Only your account can get in', okTxt);
      check(cloud.log.some((o) => o.t === 'set' && /^notebooks\/nb-s1\/probe\//.test(o.p)),'144d the probe doc under notebooks/{nb}/probe/{device} was written');
      cloud.refuse.length = 0;
      await A.page.click('#oa-test');
      await sleep(300);
      const noTxt = await waitFor(A, () => /not in place|Could not|Only your account/.test((document.getElementById('oa-res') || {}).textContent || '') && !document.getElementById('oa-test').disabled, 15000).then(() => A.page.evaluate(() => document.getElementById('oa-res').textContent));
      check(/not in place yet/.test(noTxt) && !/✅/.test(noTxt), '144d self-test with the old open rules: says plainly that the rule is not in place', noTxt);
      check(!cloud.store.has('zz-probe-other/x'), '144d the test leaves nothing behind in zz-probe-other');
      /* the tick: stored in DB.theme, with its stamp */
      await A.page.evaluate(() => openSyncModal());
      await A.page.click('#oa-pub');
      const t = await A.page.evaluate(() => { _stampThemeTouches(); return { v: DB.theme.oaPublished, at: !!(DB.themeAt && DB.themeAt.oaPublished) }; });
      check(t.v === true && t.at, '144d the "I have published it" tick is stored in DB.theme and gets its stamp', JSON.stringify(t));
      check(A.errors.filter(realErr).length === 0, '144d no page errors', A.errors.slice(0, 2).join(' · '));
    } finally { await close(A); }
  }

  /* ══ 144e — the pointer is written once, and after the first read ══ */
  {
    const cloud = makeCloud();
    const H = await dev(cloud, 'H', vp0, seedWith(NOTE), { holdQ: true });   /* the reader is held: no first read yet */
    let A2;
    try {
      await sleep(9000);
      const held = await H.page.evaluate(() => ({ caught: _s1RdCaught, gate: _s1WriteGate() }));
      check(!held.caught && ownerWrites(cloud).length === 0, '144e before the first read nothing is written (reader not caught up, no pointer)', JSON.stringify(held));
      H.holdQ = false; for (const id of H.qsubs.keys()) cloud.deliverQ(H, id, true);
      let w = 0; for (let i = 0; i < 40 && !(w = ownerWrites(cloud).length); i++) await sleep(500);
      const caught = await H.page.evaluate(() => _s1RdCaught);
      check(w === 1 && caught, '144e after the first read the pointer is written, once', `writes=${w} caught=${caught}`);
      for (let i = 0; i < 4; i++) { await H.page.evaluate((i) => { DB.articles[0].title = 'edit ' + i; DB.articles[0].updatedAt = new Date().toISOString(); persist(); flushPendingPush(); }, i); await sleep(1200); }
      await sleep(12000);
      check(ownerWrites(cloud).length === 1, '144e four more pushes and 12 s later: still ONE pointer write', String(ownerWrites(cloud).length));
      A2 = await dev(cloud, 'A2', vp0, seedWith(NOTE));
      await sleep(14000);
      check(ownerWrites(cloud).length === 1, '144e a second device with the same notebook does not write it again', String(ownerWrites(cloud).length));
      const inBlob = await H.page.evaluate(() => JSON.stringify(DB).includes('"owners"') || JSON.stringify(DB).includes('u-s1'));
      check(!inBlob, '144e the pointer is not in DB (so not in a backup or export)');
    } finally { await close(H, A2); }
  }

  /* ══ 144f — file: and a Save File copy ══ */
  {
    const cloud = makeCloud();
    const F = await dev(cloud, 'F', vp0, emptySeed(), { noCfg: true });
    try {
      await F.ctx.addInitScript('window.__builtinOn = true;');
      await F.page.reload({ waitUntil: 'domcontentloaded' });
      await F.page.waitForFunction(() => window.__appBooted === true, null, { timeout: 30000 });
      const http = await F.page.evaluate(() => _builtinCfgOk());
      check(http === true, '144f (control) with the switch on, an http page with no config WOULD use the built-in code');
      const html = await F.page.evaluate(() => _cleanExportRoot());
      const fileUrl = 'file://' + join(SRC, 'index.html');
      const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
      await ctx.addInitScript('window.__builtinOn = true;');
      const pg = await ctx.newPage();
      const errs = []; pg.on('pageerror', (e) => errs.push(String(e)));
      await pg.goto(fileUrl, { waitUntil: 'domcontentloaded' });
      await pg.waitForFunction(() => window.__appBooted === true, null, { timeout: 30000 }).catch(() => {});
      await sleep(2500);
      const s = await pg.evaluate(() => ({ proto: location.protocol, ok: _builtinCfgOk(), bi: _biMode, auth: !!_authInstance, cfg: localStorage.getItem('siyagah-sync-v1') }));
      check(s.proto === 'file:' && !s.ok && !s.bi && !s.auth && !s.cfg, '144f a file: open never uses the built-in code (even with the switch on)', JSON.stringify(s));
      /* a Save File copy opened from disk */
      const copy = join(process.env.TMPDIR || '/tmp', 'j144-copy.html');
      const { writeFileSync } = await import('node:fs');
      writeFileSync(copy, html);
      const pg2 = await ctx.newPage();
      await pg2.goto('file://' + copy, { waitUntil: 'domcontentloaded' });
      await pg2.waitForFunction(() => window.__appBooted === true, null, { timeout: 30000 }).catch(() => {});
      await sleep(2500);
      const s2 = await pg2.evaluate(() => ({ proto: location.protocol, ok: _builtinCfgOk(), bi: _biMode, auth: !!_authInstance }));
      check(s2.proto === 'file:' && !s2.ok && !s2.bi && !s2.auth, '144f a Save File copy opened from disk never uses the built-in code', JSON.stringify(s2));
      await ctx.close();
    } finally { await close(F); }
  }

  /* ══ 144g — the 🔐 section at three sizes ══ */
  for (const vp of VPS) {
    const cloud = makeCloud();
    const A = await dev(cloud, 'A', vp, seedWith(NOTE));
    try {
      await waitFor(A, () => !!_syncFsDb && !!_authInstance, 30000);
      await sleep(1500);
      await A.page.evaluate(() => openSyncModal());
      await sleep(300);
      const m = await A.page.evaluate(() => {
        const sec = document.getElementById('oa-sec'); if (!sec) return { none: true };
        sec.scrollIntoView(); const W = innerWidth, out = [];
        for (const el of sec.querySelectorAll('*')) { const r = el.getBoundingClientRect(); if (r.width && (r.right > W + 1 || r.left < -1)) out.push(el.tagName + '#' + (el.id || '') + ' ' + Math.round(r.left) + '–' + Math.round(r.right)); }
        const ta = document.getElementById('oa-rules').getBoundingClientRect(), box = sec.getBoundingClientRect();
        const bad = [...sec.querySelectorAll('li,div,label')].filter((e) => e.scrollWidth > e.clientWidth + 2).map((e) => e.tagName + ' ' + e.scrollWidth + '>' + e.clientWidth);
        return { W, out, ta: [Math.round(ta.left), Math.round(ta.right), Math.round(ta.width)], box: [Math.round(box.left), Math.round(box.right)], doc: document.documentElement.scrollWidth, bad, steps: sec.querySelectorAll('ol li').length, btn: !!document.getElementById('oa-copy'), tick: !!document.getElementById('oa-pub'), test: !!document.getElementById('oa-test') };
      });
      check(!m.none && m.steps === 4 && m.btn && m.tick && m.test, `144g@${vp.name} the 🔐 section has four steps, 📋 Copy, the tick and the test`, JSON.stringify(m).slice(0, 200));
      check(!m.none && !m.out.length && m.doc <= m.W && !m.bad.length, `144g@${vp.name} nothing runs off screen (copy box ${m.ta}, section ${m.box}, window ${m.W})`, (m.out || []).concat(m.bad || []).slice(0, 4).join(' | '));
      check(!m.none && m.ta[0] >= 0 && m.ta[1] <= m.W && m.ta[2] > 150, `144g@${vp.name} the copy box is wholly inside the window and wide enough`);
      await A.page.click('#oa-copy').catch(() => {});
      check(A.errors.filter(realErr).length === 0, `144g@${vp.name} no page errors`, A.errors.slice(0, 2).join(' · '));
    } finally { await close(A); }
  }
} catch (e) {
  check(false, 'signin-j144 threw: ' + (e && e.stack || e));
} finally {
  await browser.close().catch(() => {});
  await srv.close().catch(() => {});
}
const pass = results.filter((r) => r.ok).length;
console.log(`\n${pass}/${results.length} passed`);
process.exit(pass === results.length ? 0 : 1);
