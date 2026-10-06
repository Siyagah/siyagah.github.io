#!/usr/bin/env node
/* tools/sync-s1.mjs — v04.88, S1a: the per-record cloud copy ("recs").

   After every blob push the app also writes one Firestore doc per record,
   beside the blob, and NOTHING reads them yet. These checks prove the copy is
   faithful, minimal, resumable, and invisible when it fails.

   The Firebase SDK is replaced by the same kind of fake sync-e2e.mjs uses (a
   Node-held store, 1 MiB per doc, 10 MiB per commit), extended with what this
   needs: a refusal by path prefix, a write log by path prefix, and a hang
   that only bites commits touching recs (a phone killed mid-seed).

   Every scenario runs at 390×844 (touch), 820×1180 (touch) and 1440×900: the
   layout does not matter to the shadow, but the platforms are what the owner
   uses and the same boot path runs on each.

   Run: node tools/sync-s1.mjs            (add --measure for the S1a numbers) */
import { playwright, serve, seedDB } from './harness.mjs';
import { assembleRecs, canonDB, diffDB, S1_COLLS } from './s1-assemble.mjs';

const FAKE_SDK = String.raw`(function(){
  if (window.firebase && window.firebase.__fake) return;
  const apps = {};
  const fb = window.firebase = { __fake: true,
    initializeApp(cfg, name){ const k = name || '[DEFAULT]'; apps[k] = { name: k, options: cfg, delete: async () => { delete apps[k]; } }; return apps[k]; },
    app(name){ const a = apps[name || '[DEFAULT]']; if (!a){ const e = new Error('No Firebase App'); e.code = 'app/no-app'; throw e; } return a; },
    get apps(){ return Object.values(apps); } };
  const listeners = {};
  const snap = (d) => ({ exists: d != null, data: () => (d == null ? undefined : JSON.parse(JSON.stringify(d))) });
  const mkErr = (e) => { const x = new Error(e.message); x.code = e.code; return x; };
  window.__fsDeliver = (path, data) => { (listeners[path] || []).forEach((cb) => { try { cb(snap(data)); } catch (e) { console.error(e); } }); };
  function docRef(path){ return { _path: path, id: path.split('/').pop(),
    collection: (n) => collRef(path + '/' + n),
    async get(opts){ const r = await window.__fsGet(path, (opts && opts.source) || 'default'); if (r.error) throw mkErr(r.error); return snap(r.data); },
    onSnapshot(cb){ (listeners[path] = listeners[path] || []).push(cb); window.__fsListen(path); return () => { listeners[path] = (listeners[path] || []).filter((x) => x !== cb); }; } }; }
  function collRef(path){ return { doc: (id) => docRef(path + '/' + id) }; }
  function batch(){ const ops = []; const b = {
    set(ref, data){ ops.push({ t: 'set', p: ref._path, d: data }); return b; },
    delete(ref){ ops.push({ t: 'del', p: ref._path }); return b; },
    async commit(){ const r = await window.__fsCommit(ops); if (r.error) throw mkErr(r.error); } }; return b; }
  const fs = { collection: (n) => collRef(n), batch, settings(){} };
  fb.firestore = function(){ return fs; };
  fb.firestore.FieldValue = { serverTimestamp: () => ({ __sts: 1 }) };
  fb.auth = function(){ return { setPersistence: async () => {}, signInWithPopup: async () => ({}), signOut: async () => {},
    currentUser: { uid: 'u-s1' }, onAuthStateChanged(cb){ setTimeout(() => cb({ uid: 'u-s1', email: 'owner@example.invalid' }), 30); return () => {}; } }; };
  fb.auth.Auth = { Persistence: { LOCAL: 'local' } };
  fb.auth.GoogleAuthProvider = function(){};
})();`;

const NB = 'notebooks/nb-s1';
const MAX_DOC = 1024 * 1024, MAX_REQ = 10 * 1024 * 1024;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function check(ok, label, detail = '') {
  results.push({ ok, label });
  console.log((ok ? '  ok   ' : ' FAIL  ') + label + (detail ? '\n         ' + detail : ''));
}

/* One cloud (a Node Map) shared by the devices of a scenario. */
function makeCloud() {
  const cloud = { store: new Map(), devices: [], log: [], commits: 0, refuse: [] };
  const deliverTo = (d, path) => {
    if (d.offline || !d.listens.has(path)) return;
    const data = cloud.store.has(path) ? cloud.store.get(path) : null;
    setTimeout(() => { d.page.evaluate(([p, x]) => window.__fsDeliver && window.__fsDeliver(p, x), [path, data]).catch(() => {}); }, 40 + Math.floor(Math.random() * 120));
  };
  cloud.apply = (ops) => {
    if (ops.some((o) => cloud.refuse.some((pre) => o.p.includes(pre)))) return { error: { code: 'permission-denied', message: 'Missing or insufficient permissions.' } };
    let total = 0;
    for (const o of ops) if (o.t === 'set') {
      const s = Buffer.byteLength(JSON.stringify(o.d));
      if (s > MAX_DOC) return { error: { code: 'invalid-argument', message: 'document over 1 MiB at ' + o.p } };
      total += s;
    }
    if (total > MAX_REQ) return { error: { code: 'invalid-argument', message: 'request over 10 MiB' } };
    const now = Date.now();
    for (const o of ops) {
      if (o.t === 'del') { cloud.store.delete(o.p); cloud.log.push({ t: 'del', p: o.p }); continue; }
      const d = JSON.parse(JSON.stringify(o.d));
      for (const k of Object.keys(d)) if (d[k] && d[k].__sts) d[k] = now;
      cloud.store.set(o.p, d);
      cloud.log.push({ t: 'set', p: o.p, bytes: Buffer.byteLength(JSON.stringify(d)) });
    }
    cloud.commits++;
    const touched = new Set(ops.map((o) => o.p));
    for (const dv of cloud.devices) for (const p of touched) deliverTo(dv, p);
    return {};
  };
  return cloud;
}
async function addDevice(browser, base, cloud, name, viewport, touch, seed) {
  const ctx = await browser.newContext(touch ? { viewport, hasTouch: true, isMobile: true } : { viewport });
  await ctx.route('**gstatic.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_SDK }));
  for (const p of ['**googleapis.com/**', '**firebaseapp.com/**', '**firebaseio.com/**']) await ctx.route(p, (r) => r.abort());
  const cfg = { firebaseConfig: { apiKey: 'fake', projectId: 'fake', authDomain: 'fake', appId: 'fake' }, notebookId: 'nb-s1' };
  await ctx.addInitScript(([db, c]) => {
    try { if (!localStorage.getItem('my-notebook-v1')) localStorage.setItem('my-notebook-v1', JSON.stringify(db)); localStorage.setItem('siyagah-sync-v1', JSON.stringify(c)); } catch {}
  }, [seed, cfg]);
  const d = { name, ctx, offline: false, listens: new Set(), errors: [], dieAfterRec: null };
  await ctx.exposeBinding('__fsGet', async (_s, path) => { await sleep(10 + Math.random() * 30); return { data: cloud.store.has(path) ? cloud.store.get(path) : null }; });
  await ctx.exposeBinding('__fsListen', async (_s, path) => { d.listens.add(path); const data = cloud.store.has(path) ? cloud.store.get(path) : null; setTimeout(() => d.page.evaluate(([p, x]) => window.__fsDeliver && window.__fsDeliver(p, x), [path, data]).catch(() => {}), 50); });
  await ctx.exposeBinding('__fsCommit', async (_s, ops) => {
    await sleep(10 + Math.random() * 30);
    /* A phone killed mid-seed: let `dieAfterRec` commits that touch recs land,
       then hang every later one of those forever (the blob is not touched). */
    if (d.dieAfterRec != null && ops.some((o) => /\/recs?(parts)?\//.test(o.p))) {
      if (d.dieAfterRec <= 0) await new Promise(() => {});
      d.dieAfterRec--;
    }
    return cloud.apply(ops);
  });
  const page = await ctx.newPage();
  d.page = page;
  page.on('dialog', (x) => x.accept().catch(() => {}));
  page.on('pageerror', (e) => d.errors.push('pageerror: ' + e));
  page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR_FAILED/.test(m.text())) d.errors.push('console: ' + m.text()); });
  await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
  await boot(d);
  cloud.devices.push(d);
  return d;
}
async function boot(d) {
  await d.page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree'));
  await d.page.evaluate(() => { window.__toasts = []; const _t = toast; toast = (m, ...rest) => { window.__toasts.push(String(m)); try { return _t(m, ...rest); } catch (e) {} }; });
}
async function reopen(d) { await d.page.reload({ waitUntil: 'domcontentloaded' }); await boot(d); }

const on = (d, fn, arg) => d.page.evaluate(fn, arg);
const recWrites = (cloud, from) => cloud.log.slice(from).filter((o) => o.t === 'set' && o.p.startsWith(NB + '/recs/')).map((o) => o.p.slice((NB + '/recs/').length));
const partWrites = (cloud, from) => cloud.log.slice(from).filter((o) => o.t === 'set' && o.p.startsWith(NB + '/recparts/'));
/* Nothing in flight on this device and nothing written for 1.5s. */
async function quiet(cloud, d, ms = 30000) {
  const t0 = Date.now(); let last = cloud.log.length, since = Date.now();
  while (Date.now() - t0 < ms) {
    await sleep(250);
    const busy = await on(d, () => !!_s1Busy || !!_pushInFlight || !!_syncPushTimer).catch(() => true);
    if (cloud.log.length !== last || busy) { last = cloud.log.length; since = Date.now(); }
    else if (Date.now() - since > 1500) return true;
  }
  return false;
}
const push = (cloud, d) => on(d, () => { persist(); flushPendingPush(); }).then(() => sleep(300)).then(() => quiet(cloud, d));
const liveDB = (d) => on(d, () => JSON.parse(JSON.stringify(DB)));
const stat = (d) => on(d, () => JSON.parse(JSON.stringify(window._s1Stat)));
async function waitSeeded(cloud, d, ms = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if ((await stat(d)).seeded) { await quiet(cloud, d); return true; } await sleep(300); }
  return false;
}
async function assembleEquals(cloud, d) {
  const dev = await liveDB(d);
  const { db, missingParts } = assembleRecs(cloud.store, NB);
  if (!db) return { ok: false, why: 'no _head~0 rec', dev };
  const ok = missingParts === 0 && canonDB(db) === canonDB(dev);
  return { ok, why: ok ? '' : (missingParts ? missingParts + ' parts missing' : diffDB(db, dev)), dev, db };
}
async function freshDevice(browser, base, vp, seed = seedDB(), cloud = makeCloud()) {
  const d = await addDevice(browser, base, cloud, 'dev', { width: vp.w, height: vp.h }, vp.touch, seed);
  return { cloud, d };
}

const pw = await playwright();
const srv = await serve();
const browser = await pw.chromium.launch();
const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];
const measure = process.argv.includes('--measure');

try {
  for (const vp of VPS) {
    const T = (s) => `${vp.name}: ${s}`;
    const ARABIC = 'ملاحظة عربية 😀 مرحبا بالعالم';
    /* ── 51a: a seeded notebook, all 11 arrays non-empty, Arabic + emoji, a null-id element ── */
    {
      const { cloud, d } = await freshDevice(browser, srv.base, vp);
      await sleep(1500);
      await on(d, (ar) => {
        const now = new Date().toISOString();
        DB.articles.push({ id: 'a-ar', title: ar, content: '<p>' + ar + '</p>', folderIds: ['f1'], tags: [], createdAt: now, updatedAt: now, kind: 'general' });
        (DB.calEvents = DB.calEvents || []).push({ id: 'ce1', title: 'Event', date: '2026-10-06', updatedAt: now });
        (DB.calCategories = DB.calCategories || []).push({ id: 'cc1', name: 'Cat', updatedAt: now });
        (DB.noteKinds = DB.noteKinds || []).push({ id: 'nk1', name: 'Kind', catId: 'nkc1', updatedAt: now });
        (DB.noteKindCats = DB.noteKindCats || []).push({ id: 'nkc1', name: 'KindCat', updatedAt: now });
        (DB.myFavCats = DB.myFavCats || []).push({ id: 'mf1', name: 'Fav', updatedAt: now });
        (DB.folderGroups = DB.folderGroups || []).push({ id: 'fg1', name: 'Group', updatedAt: now }, { label: 'a group with no id' });
        (DB.tombstones = DB.tombstones || []).push({ id: 'tomb1', type: 'article', deletedAt: now });
        DB.trash = DB.trash || [];
        DB.trash.push({ id: 'tr1', type: 'article', deletedAt: now, item: { id: 'a-tr', title: 'In trash', content: '<p>t</p>', updatedAt: now } });
        persist(); flushPendingPush();
      }, ARABIC);
      const seeded = await waitSeeded(cloud, d);
      const live = await liveDB(d);
      const allFull = S1_COLLS.every((c) => Array.isArray(live[c]) && live[c].length > 0);
      const asm = await assembleEquals(cloud, d);
      const odd = asm.db && (asm.db.folderGroups || []).some((x) => x && x.id == null);
      const ar = asm.db && (asm.db.articles || []).find((a) => a.id === 'a-ar');
      check(seeded && allFull && asm.ok && odd && ar && ar.title === ARABIC,
        T('51a one device, all 11 arrays non-empty, Arabic + emoji, a null-id element: the recs assemble to exactly the device DB'),
        JSON.stringify({ seeded, allFull, why: asm.why, odd: !!odd, recs: [...cloud.store.keys()].filter((k) => k.startsWith(NB + '/recs/')).length }));
      const st = await stat(d);
      check(st.enabled && st.seeded && st.lastErr == null, T('51a _s1Stat reports enabled, seeded, no error'), JSON.stringify(st));

      /* ── 51b: edit one note → one rec (+ _head only if it changed) ── */
      const headBefore = cloud.store.get(NB + '/recs/_head~0').sig;
      let mark = cloud.log.length;
      await on(d, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.content += '<p>edited</p>'; a.updatedAt = new Date().toISOString(); persist(); flushPendingPush(); });
      await sleep(300); await quiet(cloud, d);
      const w = recWrites(cloud, mark);
      const headNow = cloud.store.get(NB + '/recs/_head~0').sig;
      const others = w.filter((k) => k !== 'articles~a1' && k !== '_head~0');
      check(w.filter((k) => k === 'articles~a1').length === 1 && others.length === 0 && (w.includes('_head~0') === (headNow !== headBefore)),
        T('51b edit one note: exactly that note\'s rec is written (+ _head only if it changed)'), JSON.stringify(w));
      const asm2 = await assembleEquals(cloud, d);
      check(asm2.ok, T('51b …and the recs still equal the device DB'), asm2.why);

      /* ── 51c: reload, push with nothing changed → zero rec writes ── */
      await reopen(d);
      await sleep(1500); await quiet(cloud, d);
      mark = cloud.log.length;
      const before = (await stat(d)).lastRun;
      await on(d, () => { _lastPushedSig = ''; flushPendingPush(); });
      await sleep(300); await quiet(cloud, d);
      const w3 = recWrites(cloud, mark), st3 = await stat(d);
      check(w3.length === 0 && st3.lastRun > before && st3.seeded,
        T('51c reload, push with nothing changed: zero rec writes (the sig map survived)'), JSON.stringify({ w3, ran: st3.lastRun > before, st3 }));

      /* ── 51d: a note over 1 MB → parts; edit it → new generation, old parts deleted ── */
      await on(d, () => {
        const now = new Date().toISOString();
        DB.articles.push({ id: 'a-big', title: 'Big', content: '<p><img src="data:image/png;base64,' + 'QUJD'.repeat(330000) + '"></p>', folderIds: ['f1'], tags: [], createdAt: now, updatedAt: now, kind: 'general' });
        persist(); flushPendingPush();
      });
      await sleep(300); await quiet(cloud, d, 60000);
      const bigKey = NB + '/recs/articles~a-big';
      const rec1 = cloud.store.get(bigKey);
      const parts1 = [...cloud.store.keys()].filter((k) => k.startsWith(NB + '/recparts/articles~a-big~'));
      const asm4 = await assembleEquals(cloud, d);
      check(rec1 && rec1.j == null && rec1.n >= 2 && rec1.g && parts1.length === rec1.n && asm4.ok,
        T('51d a note over 1 MB is stored as parts, and the recs still assemble equal'), JSON.stringify({ n: rec1 && rec1.n, parts: parts1.length, why: asm4.why }));
      await on(d, () => { const a = DB.articles.find((x) => x.id === 'a-big'); a.content += '<p>more</p>'; a.updatedAt = new Date().toISOString(); persist(); flushPendingPush(); });
      await sleep(300); await quiet(cloud, d, 60000);
      const rec2 = cloud.store.get(bigKey);
      const parts2 = [...cloud.store.keys()].filter((k) => k.startsWith(NB + '/recparts/articles~a-big~'));
      const oldLeft = parts2.filter((k) => k.includes('~' + rec1.g + '~')).length;
      const asm5 = await assembleEquals(cloud, d);
      check(rec2 && rec2.g && rec2.g !== rec1.g && oldLeft === 0 && parts2.length === rec2.n && asm5.ok,
        T('51d edit it: a new generation is written and the old parts are deleted'), JSON.stringify({ g1: rec1.g, g2: rec2 && rec2.g, oldLeft, parts: parts2.length, why: asm5.why }));

      /* ── 51e: delete to Trash, then empty Trash ── */
      await on(d, () => { deleteNote('a3'); });
      await sleep(300); await push(cloud, d);
      const goneA3 = cloud.store.get(NB + '/recs/articles~a3');
      const trashKeys = [...cloud.store.keys()].filter((k) => k.startsWith(NB + '/recs/trash~') && !cloud.store.get(k).gone);
      const asm6 = await assembleEquals(cloud, d);
      check(goneA3 && goneA3.gone === true && goneA3.j == null && trashKeys.length >= 1 && asm6.ok,
        T('51e delete a note to Trash: its rec becomes gone, a trash~ rec appears, assembly equals DB'), JSON.stringify({ gone: !!(goneA3 && goneA3.gone), trashKeys: trashKeys.length, why: asm6.why }));
      await on(d, () => { emptyTrash(); flushPendingPush(); });
      await sleep(300); await quiet(cloud, d);
      const trashLive = [...cloud.store.keys()].filter((k) => k.startsWith(NB + '/recs/trash~') && !cloud.store.get(k).gone);
      const tombs = [...cloud.store.keys()].filter((k) => k.startsWith(NB + '/recs/tombstones~') && !cloud.store.get(k).gone);
      const live2 = await liveDB(d);
      const asm7 = await assembleEquals(cloud, d);
      check(trashLive.length === 0 && tombs.length === live2.tombstones.length && tombs.length >= 1 && asm7.ok,
        T('51e empty Trash: the trash~ recs go (gone), tombstones~ recs appear, assembly equals DB'), JSON.stringify({ trashLive: trashLive.length, tombs: tombs.length, deviceTombs: live2.tombstones.length, why: asm7.why }));
      check(d.errors.length === 0, T('51 no page errors (single device)'), d.errors.slice(0, 3).join(' · '));
      await d.ctx.close();
    }

    /* ── 51f: recs refused with permission-denied → blob sync still converges, invisibly ── */
    {
      const cloud = makeCloud(); cloud.refuse = ['/recs/', '/recparts/'];
      const seed = seedDB();
      const A = await addDevice(browser, srv.base, cloud, 'A', { width: vp.w, height: vp.h }, vp.touch, seed);
      const B = await addDevice(browser, srv.base, cloud, 'B', { width: 1440, height: 900 }, false, seed);
      await sleep(1500);
      await on(A, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.title = 'Edited on A'; a.updatedAt = new Date().toISOString(); persist(); flushPendingPush(); });
      let got = false; const t0 = Date.now();
      while (Date.now() - t0 < 30000) { if (await on(B, () => DB.articles.find((x) => x.id === 'a1')?.title === 'Edited on A')) { got = true; break; } await sleep(300); }
      await on(B, () => { const a = DB.articles.find((x) => x.id === 'a2'); a.title = 'Edited on B'; a.updatedAt = new Date().toISOString(); persist(); flushPendingPush(); });
      let got2 = false; const t1 = Date.now();
      while (Date.now() - t1 < 30000) { if (await on(A, () => DB.articles.find((x) => x.id === 'a2')?.title === 'Edited on B')) { got2 = true; break; } await sleep(300); }
      await sleep(2500);
      const sa = await stat(A), sb = await stat(B);
      const dots = await Promise.all([A, B].map((d) => on(d, () => document.getElementById('sync-dot')?.textContent || '')));
      const alarms = await Promise.all([A, B].map((d) => on(d, () => window.__toasts.filter((t) => /NOT syncing|Sync error|Still cannot|failed|REJECTING|Can.t reach/i.test(t)))));
      const failures = await Promise.all([A, B].map((d) => on(d, () => _pushFailures)));
      const recsWritten = [...cloud.store.keys()].filter((k) => k.includes('/recs/')).length;
      check(got && got2, T('51f recs refused (permission-denied): the blob still carries an edit each way between two devices'), JSON.stringify({ got, got2 }));
      check(alarms.every((x) => x.length === 0) && dots.every((t) => !/err|NOT/i.test(t)) && failures.every((n) => n === 0),
        T('51f …with no toast, the dot not in error, _pushFailures untouched'), JSON.stringify({ dots, alarms, failures }));
      check(sa.lastErr && sa.lastErr.code === 'permission-denied' && sb.lastErr && sb.lastErr.code === 'permission-denied' && sa.enabled === false && recsWritten === 0,
        T('51f …and _s1Stat records permission-denied, stops trying, nothing written to recs'), JSON.stringify({ sa, sb, recsWritten }));
      check(A.errors.length === 0 && B.errors.length === 0, T('51f no page errors'), [...A.errors, ...B.errors].slice(0, 3).join(' · '));
      await A.ctx.close(); await B.ctx.close();
    }

    /* ── 51g: cut off after the first seed batch → the seed resumes ── */
    {
      const N = 1000;
      const seed = seedDB();
      const now = new Date().toISOString();
      for (let i = 0; i < N; i++) seed.articles.push({ id: 'n' + i, title: 'Note ' + i, content: '<p>Body ' + i + '</p>', folderIds: ['f1'], tags: [], createdAt: now, updatedAt: now, kind: 'general' });
      const cloud = makeCloud();
      const d = await addDevice(browser, srv.base, cloud, 'dev', { width: vp.w, height: vp.h }, vp.touch, seed);
      d.dieAfterRec = 1;
      await sleep(1500);
      await on(d, () => { _lastPushedSig = ''; pushToCloud(); });
      await sleep(6000);
      const recsFirst = recWrites(cloud, 0).length;
      const stCut = await stat(d);
      check(recsFirst > 0 && recsFirst <= 400 && !stCut.seeded,
        T('51g seed cut off after its first batch: at most one batch (≤400) landed, not seeded yet'), JSON.stringify({ recsFirst, seeded: stCut.seeded }));
      d.dieAfterRec = null;
      await reopen(d);
      await sleep(1500);
      await on(d, () => { _lastPushedSig = ''; pushToCloud(); });
      const seeded = await waitSeeded(cloud, d, 90000);
      const live = await liveDB(d);
      const records = S1_COLLS.reduce((n, c) => n + (live[c] || []).length, 0) + 1;
      const total = recWrites(cloud, 0).length;
      const asm = await assembleEquals(cloud, d);
      check(seeded && total <= records + 400 && total < records * 1.5 && asm.ok,
        T('51g reopen: the seed resumes (total rec writes ≤ records + one batch, not 2×), and the recs equal the DB'),
        JSON.stringify({ records, total, resumed: total - recsFirst, why: asm.why }));
      check(d.errors.length === 0, T('51g no page errors'), d.errors.slice(0, 3).join(' · '));
      await d.ctx.close();
    }
  }

  /* ── --measure: seed time and "edit one note" for ~2,000 notes (not a check) ── */
  if (measure) {
    const N = 2000; const seed = seedDB(); const now = new Date().toISOString();
    for (let i = 0; i < N; i++) seed.articles.push({ id: 'n' + i, title: 'Note ' + i, content: '<p>' + ('Body text of note ' + i + '. ').repeat(40) + '</p>', folderIds: ['f1'], tags: [], createdAt: now, updatedAt: now, kind: 'general' });
    const cloud = makeCloud();
    const t0 = Date.now();
    const d = await addDevice(browser, srv.base, cloud, 'dev', { width: 1440, height: 900 }, false, seed);
    await sleep(1500);
    await on(d, () => { _lastPushedSig = ''; pushToCloud(); });
    const ok = await waitSeeded(cloud, d, 120000);
    const seedMs = Date.now() - t0 - 1500;
    const seedWrites = recWrites(cloud, 0).length, seedCommits = cloud.commits;
    const mark = cloud.log.length;
    await on(d, () => { const a = DB.articles.find((x) => x.id === 'n5'); a.content += '<p>x</p>'; a.updatedAt = new Date().toISOString(); persist(); flushPendingPush(); });
    await sleep(300); await quiet(cloud, d);
    console.log('MEASURE ' + JSON.stringify({ notes: N + 3, seeded: ok, seedMs, seedRecWrites: seedWrites, seedCommitsIncludingBlob: seedCommits, editOneNoteRecWrites: recWrites(cloud, mark) }));
    await d.ctx.close();
  }
} catch (e) {
  console.log(' FAIL  sync-s1 threw: ' + (e && e.stack || e));
  results.push({ ok: false, label: 'threw' });
} finally {
  await browser.close();
  await srv.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
