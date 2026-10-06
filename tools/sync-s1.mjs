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
  /* v04.89 — Timestamps and query listeners (where('at','>',x).orderBy('at'),
     docChanges(), metadata.hasPendingWrites). A stored server time is
     {__ts:[seconds,nanos]} and reaches the app as a Timestamp. */
  class TS { constructor(s, n){ this.seconds = s; this.nanoseconds = n; } toMillis(){ return this.seconds * 1000 + this.nanoseconds / 1e6; } }
  const conv = (d) => { if (d == null) return d; const o = JSON.parse(JSON.stringify(d)); for (const k of Object.keys(o)) if (o[k] && o[k].__ts) o[k] = new TS(o[k].__ts[0], o[k].__ts[1]); return o; };
  const snap = (d) => ({ exists: d != null, data: () => (d == null ? undefined : conv(d)) });
  const mkErr = (e) => { const x = new Error(e.message); x.code = e.code; return x; };
  window.__fsDeliver = (path, data) => { (listeners[path] || []).forEach((cb) => { try { cb(snap(data)); } catch (e) { console.error(e); } }); };
  let qid = 0; const qls = {};
  window.__fsDeliverQ = (id, changes) => { const l = qls[id]; if (!l) return;
    try { l.cb({ docChanges: () => changes.map((c) => ({ type: c.type, doc: { id: c.id, data: () => conv(c.data), metadata: { hasPendingWrites: !!c.pending } } })) }); } catch (e) { console.error(e); } };
  window.__fsDeliverQErr = (id, e) => { const l = qls[id]; if (l && l.err) l.err(mkErr(e)); };
  function query(path, cur){ const q = { orderBy(){ return q; },
    onSnapshot(cb, err){ const id = ++qid; qls[id] = { cb, err }; window.__fsListenQ(id, path, [cur.seconds, cur.nanoseconds]); return () => { delete qls[id]; window.__fsUnlistenQ(id); }; } }; return q; }
  function docRef(path){ return { _path: path, id: path.split('/').pop(),
    collection: (n) => collRef(path + '/' + n),
    async get(opts){ const r = await window.__fsGet(path, (opts && opts.source) || 'default'); if (r.error) throw mkErr(r.error); return snap(r.data); },
    onSnapshot(cb){ (listeners[path] = listeners[path] || []).push(cb); window.__fsListen(path); return () => { listeners[path] = (listeners[path] || []).filter((x) => x !== cb); }; } }; }
  function collRef(path){ return { doc: (id) => docRef(path + '/' + id), where: (f, op, v) => query(path, v) }; }
  function batch(){ const ops = []; const b = {
    set(ref, data){ ops.push({ t: 'set', p: ref._path, d: data }); return b; },
    delete(ref){ ops.push({ t: 'del', p: ref._path }); return b; },
    async commit(){ const r = await window.__fsCommit(ops); if (r.error) throw mkErr(r.error); } }; return b; }
  const fs = { collection: (n) => collRef(n), batch, settings(){} };
  fb.firestore = function(){ return fs; };
  fb.firestore.FieldValue = { serverTimestamp: () => ({ __sts: 1 }) };
  fb.firestore.Timestamp = TS;
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
  const cloud = { store: new Map(), devices: [], log: [], commits: 0, refuse: [], refuseRead: [], ver: new Map(), lastMs: 0 };
  const deliverTo = (d, path) => {
    if (d.offline || !d.listens.has(path)) return;
    const data = cloud.store.has(path) ? cloud.store.get(path) : null;
    setTimeout(() => { d.page.evaluate(([p, x]) => window.__fsDeliver && window.__fsDeliver(p, x), [path, data]).catch(() => {}); }, 40 + Math.floor(Math.random() * 120));
  };
  /* v04.89 — query listeners. Each device's deliveries go out in order (one
     chain per device), like a real listener's; a doc is re-sent only when its
     write counter moved since the last time it was sent on that listener. */
  const tsCmp = (a, b) => (a[0] - b[0]) || (a[1] - b[1]);
  cloud.refusedRead = (path) => cloud.refuseRead.some((pre) => path.includes(pre));
  cloud.deliverQ = (d, id, initial) => {
    const sub = d.qsubs.get(id); if (!sub || d.offline || d.holdQ) return;
    if (cloud.refusedRead(sub.path)) {
      d.qchain = d.qchain.then(() => d.page.evaluate(([i, e]) => window.__fsDeliverQErr && window.__fsDeliverQErr(i, e), [id, { code: 'permission-denied', message: 'Missing or insufficient permissions.' }]).catch(() => {}));
      d.qsubs.delete(id); return;
    }
    const rows = [];
    for (const [p, v] of cloud.store) {
      if (!p.startsWith(sub.path + '/') || p.slice(sub.path.length + 1).includes('/')) continue;
      if (!v.at || !v.at.__ts || tsCmp(v.at.__ts, sub.cur) <= 0) continue;
      rows.push([p, v]);
    }
    rows.sort((a, b) => tsCmp(a[1].at.__ts, b[1].at.__ts));
    const changes = [];
    for (const [p, v] of rows) {
      const ver = cloud.ver.get(p);
      if (sub.sent.get(p) === ver) continue;
      changes.push({ type: sub.sent.has(p) ? 'modified' : 'added', id: p.split('/').pop(), data: v });
      sub.sent.set(p, ver);
    }
    if (!changes.length && !initial) return;   /* a real listener always fires once at the start, even with nothing */
    d.qDelivered += changes.length;
    d.qChangeLog.push(...changes.map((c) => ({ id: c.id, at: c.data.at.__ts })));
    d.qchain = d.qchain.then(async () => { await sleep(40 + Math.floor(Math.random() * 100)); await d.page.evaluate(([i, c]) => window.__fsDeliverQ && window.__fsDeliverQ(i, c), [id, changes]).catch(() => {}); });
  };
  /* A device's own write shows up on its own listener at once, as a pending
     write whose server time is not known yet (the SDK's latency compensation). */
  cloud.deliverPending = (d, ops) => {
    for (const [id, sub] of d.qsubs) {
      const changes = ops.filter((o) => o.t === 'set' && o.p.slice(0, o.p.lastIndexOf('/')) === sub.path).map((o) => ({ type: 'added', id: o.p.split('/').pop(), data: { ...o.d, at: null }, pending: true }));
      if (changes.length) d.page.evaluate(([i, c]) => window.__fsDeliverQ && window.__fsDeliverQ(i, c), [id, changes]).catch(() => {});
    }
  };
  cloud.reconnect = (d) => { for (const p of d.listens) deliverTo(d, p); for (const id of d.qsubs.keys()) cloud.deliverQ(d, id); };
  cloud.apply = (ops, committer) => {
    if (ops.some((o) => cloud.refuse.some((pre) => o.p.includes(pre)))) return { error: { code: 'permission-denied', message: 'Missing or insufficient permissions.' } };
    let total = 0;
    for (const o of ops) if (o.t === 'set') {
      const s = Buffer.byteLength(JSON.stringify(o.d));
      if (s > MAX_DOC) return { error: { code: 'invalid-argument', message: 'document over 1 MiB at ' + o.p } };
      total += s;
    }
    if (total > MAX_REQ) return { error: { code: 'invalid-argument', message: 'request over 10 MiB' } };
    /* Strictly increasing commit times, shared by every doc of one commit. */
    const ms = Math.max(Date.now(), cloud.lastMs + 1); cloud.lastMs = ms;
    const at = { __ts: [Math.floor(ms / 1000), (ms % 1000) * 1e6] };
    if (committer) cloud.deliverPending(committer, ops);
    for (const o of ops) {
      if (o.t === 'del') { cloud.store.delete(o.p); cloud.log.push({ t: 'del', p: o.p, dev: committer && committer.name }); continue; }
      const d = JSON.parse(JSON.stringify(o.d));
      for (const k of Object.keys(d)) if (d[k] && d[k].__sts) d[k] = at;
      cloud.store.set(o.p, d);
      cloud.ver.set(o.p, (cloud.ver.get(o.p) || 0) + 1);
      cloud.log.push({ t: 'set', p: o.p, bytes: Buffer.byteLength(JSON.stringify(d)), dev: committer && committer.name, gone: !!d.gone, ms });
    }
    cloud.commits++;
    const touched = new Set(ops.map((o) => o.p));
    for (const dv of cloud.devices) {
      for (const p of touched) deliverTo(dv, p);
      for (const id of dv.qsubs.keys()) cloud.deliverQ(dv, id);
    }
    return {};
  };
  return cloud;
}
async function addDevice(browser, base, cloud, name, viewport, touch, seed, opts = {}) {
  const ctx = await browser.newContext(touch ? { viewport, hasTouch: true, isMobile: true } : { viewport });
  await ctx.route('**gstatic.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_SDK }));
  for (const p of ['**googleapis.com/**', '**firebaseapp.com/**', '**firebaseio.com/**']) await ctx.route(p, (r) => r.abort());
  const cfg = { firebaseConfig: { apiKey: 'fake', projectId: 'fake', authDomain: 'fake', appId: 'fake' }, notebookId: 'nb-s1' };
  await ctx.addInitScript(([db, c, recsOnly]) => {
    try { if (!localStorage.getItem('my-notebook-v1')) localStorage.setItem('my-notebook-v1', JSON.stringify(db)); localStorage.setItem('siyagah-sync-v1', JSON.stringify(c)); } catch {}
    if (recsOnly) window.__s1RecsOnly = true;   /* test-only: this device does not read the blob */
  }, [seed, cfg, !!opts.recsOnly]);
  const d = { name, ctx, offline: false, listens: new Set(), errors: [], dieAfterRec: null, qsubs: new Map(), qchain: Promise.resolve(), qDelivered: 0, qChangeLog: [], partHook: null, holdQ: !!opts.holdQ, grace: opts.grace || 1500 };
  await ctx.exposeBinding('__fsGet', async (_s, path, src) => {
    if (d.offline && src !== 'cache') return { error: { code: 'unavailable', message: 'Failed to get document because the client is offline.' } };
    if (cloud.refusedRead(path)) return { error: { code: 'permission-denied', message: 'Missing or insufficient permissions.' } };
    if (d.partHook && /\/recparts\//.test(path)) { const h = d.partHook; d.partHook = null; await h(path); }
    await sleep(10 + Math.random() * 30);
    return { data: cloud.store.has(path) ? cloud.store.get(path) : null };
  });
  await ctx.exposeBinding('__fsListen', async (_s, path) => { d.listens.add(path); const data = cloud.store.has(path) ? cloud.store.get(path) : null; setTimeout(() => d.page.evaluate(([p, x]) => window.__fsDeliver && window.__fsDeliver(p, x), [path, data]).catch(() => {}), 50); });
  await ctx.exposeBinding('__fsListenQ', async (_s, id, path, cur) => { d.qsubs.set(id, { path, cur, sent: new Map() }); setTimeout(() => cloud.deliverQ(d, id, true), 50); });
  await ctx.exposeBinding('__fsUnlistenQ', async (_s, id) => { d.qsubs.delete(id); });
  await ctx.exposeBinding('__fsCommit', async (_s, ops) => {
    /* Offline: the SDK queues the write and lands it on reconnect. */
    while (d.offline) await sleep(100);
    await sleep(10 + Math.random() * 30);
    /* A phone killed mid-seed: let `dieAfterRec` commits that touch recs land,
       then hang every later one of those forever (the blob is not touched). */
    if (d.dieAfterRec != null && ops.some((o) => /\/recs?(parts)?\//.test(o.p))) {
      if (d.dieAfterRec <= 0) await new Promise(() => {});
      d.dieAfterRec--;
    }
    return cloud.apply(ops, d);
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
  await d.page.evaluate((g) => { window.__toasts = []; const _t = toast; toast = (m, ...rest) => { window.__toasts.push(String(m)); try { return _t(m, ...rest); } catch (e) {} }; if (g) _S1_GRACE_MS = g; }, d.grace);
}
async function reopen(d) { d.qsubs.clear(); d.qDelivered = 0; d.qChangeLog = []; await d.page.reload({ waitUntil: 'domcontentloaded' }); await boot(d); }

const on = (d, fn, arg) => d.page.evaluate(fn, arg);
const recWrites = (cloud, from) => cloud.log.slice(from).filter((o) => o.t === 'set' && o.p.startsWith(NB + '/recs/')).map((o) => o.p.slice((NB + '/recs/').length));
const partWrites = (cloud, from) => cloud.log.slice(from).filter((o) => o.t === 'set' && o.p.startsWith(NB + '/recparts/'));
/* Nothing in flight on this device and nothing written for 1.5s. */
async function quiet(cloud, d, ms = 30000) {
  const t0 = Date.now(); let last = cloud.log.length, since = Date.now();
  while (Date.now() - t0 < ms) {
    await sleep(250);
    const busy = await on(d, () => !!_s1Busy || !!_pushInFlight || !!_syncPushTimer || !!_s1KickTimer || _pullInFlight).catch(() => true);
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
  for (const vp of (process.argv.includes('--s1b') ? [] : VPS)) {   /* --s1b: only 51h–51o (a faster loop while working) */
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

  /* ══ v04.89 — S1b: the recs are READ into a replica and merged ══════════════
     Three devices (phone 390×844 touch, tablet 820×1180 touch, laptop
     1440×900), as sync-e2e does. 51h/51l/51m run with the blob NOT read
     (window.__s1RecsOnly, set from an init script only). */
  const VP3 = [{ name: 'phone', w: 390, h: 844, touch: true }, { name: 'tablet', w: 820, h: 1180, touch: true }, { name: 'laptop', w: 1440, h: 900, touch: false }];
  const trio = async (opts = {}, cloud = makeCloud(), seed = seedDB()) => {
    const devs = [];
    for (const v of VP3) devs.push(await addDevice(browser, srv.base, cloud, v.name, { width: v.w, height: v.h }, v.touch, seed, opts));
    await sleep(1500);
    return { cloud, devs, A: devs[0], B: devs[1], C: devs[2] };
  };
  const busyOf = (d) => on(d, () => !!_s1Busy || !!_pushInFlight || !!_syncPushTimer || !!_s1KickTimer || _pullInFlight).catch(() => true);
  /* Nothing in flight anywhere, nothing written or delivered for 2 s. */
  async function settle(cloud, devs, ms = 60000) {
    const t0 = Date.now(); let last = -1, since = Date.now();
    while (Date.now() - t0 < ms) {
      await sleep(300);
      const busy = (await Promise.all(devs.filter((d) => !d.offline).map(busyOf))).some(Boolean);
      const n = devs.reduce((a, d) => a + d.qDelivered, 0) + cloud.log.length;
      if (busy || n !== last) { last = n; since = Date.now(); } else if (Date.now() - since > 2000) return true;
    }
    return false;
  }
  const act = async (d, fn, arg) => { const r = await on(d, fn, arg); await on(d, () => { persist(); flushPendingPush(); }); return r; };
  const PROTECT = [...S1_COLLS, 'theme', 'themeAt'];
  /* Do the devices hold the same notebook, array ORDER included? Top-level keys
     that are per-device by nature are left out of the comparison and named. */
  async function sameDB(devs) {
    const dbs = []; for (const d of devs) dbs.push(await liveDB(d));
    const keys = [...new Set(dbs.flatMap((x) => Object.keys(x)))];
    const own = keys.filter((k) => new Set(dbs.map((x) => JSON.stringify(x[k]))).size > 1 && !PROTECT.includes(k));
    const fp = (x) => { const o = {}; for (const k of keys) if (!own.includes(k)) o[k] = S1_COLLS.includes(k) && Array.isArray(x[k]) ? x[k].map((r) => JSON.stringify(r)) : JSON.stringify(x[k]); return o; };
    const fps = dbs.map(fp); let why = '';
    for (let i = 1; i < fps.length && !why; i++) for (const k of Object.keys(fps[0])) if (JSON.stringify(fps[0][k]) !== JSON.stringify(fps[i][k])) {
      const a = fps[0][k], b = fps[i][k];
      why = `${devs[0].name} vs ${devs[i].name}: "${k}" differs` + (Array.isArray(a) && Array.isArray(b) ? (a.length !== b.length ? ` (${a.length} vs ${b.length} items)` : ' (same count; ' + (() => { const ia = a.map((s) => JSON.parse(s).id), ib = b.map((s) => JSON.parse(s).id); return ia.join() === ib.join() ? 'same order, a record\'s CONTENT differs: ' + ia.filter((id, j) => a[j] !== b[j]).join() : 'order ' + ia.join() + ' vs ' + ib.join(); })() + ')') : ''); break;
    }
    return { ok: !why, why, dbs, own };
  }
  const recsAssemble = (cloud, dbs, own) => {
    const { db, missingParts } = assembleRecs(cloud.store, NB);
    const strip = (x) => { const y = { ...x }; own.forEach((k) => delete y[k]); return y; };
    return !!db && missingParts === 0 && canonDB(strip(db)) === canonDB(strip(dbs[0]));
  };
  const has = (d, fn, arg) => on(d, fn, arg).catch(() => false);
  const noteTitle = (d, id) => on(d, (i) => (DB.articles.find((a) => a.id === i) || {}).title, id);

  /* ── 51h: recs only — three devices converge through recs alone ── */
  {
    const { cloud, devs, A, B, C } = await trio({ recsOnly: !process.argv.includes('--normal') });   /* --normal: run 51h with the blob read too, to tell a recs fault from an old one */
    const fails = [], steps = [];
    const step = async (label, fn, verify) => {
      await fn(); const s = await settle(cloud, devs); const r = await sameDB(devs);
      const extra = verify ? await verify() : '';
      steps.push(label + ':' + (r.ok && !extra && s ? 'ok' : 'FAIL'));
      if (!s) fails.push(label + ': did not go quiet');
      if (!r.ok) fails.push(label + ': ' + r.why);
      if (extra) fails.push(label + ': ' + extra);
      return r;
    };
    const idOf = (d, title) => on(d, (t) => (DB.articles.find((a) => a.title === t) || {}).id, title);
    await step('create', () => act(A, () => { mkArt('f1', 'Created on A'); try { if (ST.editing) saveArt(); } catch (e) {} ST.editing = false; /* a note left open in edit mode restamps itself when a rename arrives (an old, separate behaviour) */ }), async () => ((await has(B, () => DB.articles.some((a) => a.title === 'Created on A'))) && (await has(C, () => DB.articles.some((a) => a.title === 'Created on A')))) ? '' : 'note missing on B or C');
    const nid = await idOf(A, 'Created on A');
    await step('edit', () => act(B, (i) => { const a = DB.articles.find((x) => x.id === i); a.content = '<p>Edited on B</p>'; a.updatedAt = new Date().toISOString(); }, nid),
      async () => ((await has(A, (i) => DB.articles.find((x) => x.id === i).content.includes('Edited on B'), nid)) && (await has(C, (i) => DB.articles.find((x) => x.id === i).content.includes('Edited on B'), nid))) ? '' : 'edit missing');
    await step('rename', () => act(C, (i) => { finRenameArtTitle(i, 'Renamed on C'); }, nid),
      async () => {
        const ts = await Promise.all(devs.map((d) => noteTitle(d, nid)));
        if (ts.every((t) => t === 'Renamed on C')) return '';
        const ups = await Promise.all(devs.map((d) => on(d, (i) => DB.articles.find((x) => x.id === i).updatedAt, nid)));
        const rec = cloud.store.get(NB + '/recs/articles~' + encodeURIComponent(nid));
        const wr = cloud.log.filter((o) => o.t === 'set' && o.p === NB + '/recs/articles~' + encodeURIComponent(nid)).map((o) => o.dev);
        return 'rename missing, titles now: ' + JSON.stringify(ts) + ' updatedAt ' + JSON.stringify(ups) + ' cloud rec ' + (rec && rec.j ? JSON.parse(rec.j).title + '@' + JSON.parse(rec.j).updatedAt : String(rec)) + ' writers ' + wr.join();
      });
    await step('trash', () => act(A, (i) => { trashArt(i); }, nid), async () => (await has(B, (i) => !DB.articles.some((a) => a.id === i) && DB.trash.some((t) => t.item && t.item.id === i), nid)) ? '' : 'not in Trash on B');
    await step('restore', () => act(B, (i) => { restoreItem(DB.trash.find((t) => t.item && t.item.id === i).id); }, nid), async () => ((await has(A, (i) => DB.articles.some((a) => a.id === i), nid)) && (await has(C, (i) => DB.articles.some((a) => a.id === i), nid))) ? '' : 'restored note missing on A or C');
    await step('empty Trash', async () => { await act(A, (i) => { trashArt(i); }, nid); await settle(cloud, devs); await act(C, () => { emptyTrash(); }); },
      async () => (await Promise.all(devs.map((d) => has(d, (i) => !DB.articles.some((a) => a.id === i) && !DB.trash.some((t) => t.item && t.item.id === i), nid)))).every(Boolean) ? '' : 'a device still holds the note or its Trash entry');
    await step('move folder', () => act(C, () => { doMoveFolder('f2', 'f1', 'inside'); }), async () => (await Promise.all(devs.map((d) => has(d, () => DB.folders.find((f) => f.id === 'f2').parentId === 'f1')))).every(Boolean) ? '' : 'folder not moved everywhere');
    await step('theme colour', () => act(B, () => { DB.theme.custom = Object.assign({}, DB.theme.custom, { sidebar: '#223344' }); }), async () => (await Promise.all(devs.map((d) => has(d, () => DB.theme.custom && DB.theme.custom.sidebar === '#223344')))).every(Boolean) ? '' : 'theme colour not everywhere');
    await step('concurrent edit, newer wins', () => Promise.all([
      act(A, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.content = '<p>older edit from A</p>'; a.updatedAt = new Date(Date.now() - 5000).toISOString(); }),
      act(B, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.content = '<p>newer edit from B</p>'; a.updatedAt = new Date().toISOString(); })]),
      async () => (await Promise.all(devs.map((d) => has(d, () => DB.articles.find((x) => x.id === 'a1').content.includes('newer edit from B'))))).every(Boolean) ? '' : 'the newer edit did not win everywhere');
    await step('offline device rejoins', async () => {
      B.offline = true; await B.ctx.setOffline(true);
      await act(B, () => { const a = DB.articles.find((x) => x.id === 'a2'); a.title = 'Written offline on B'; a.updatedAt = new Date().toISOString(); });
      await act(A, () => { const a = DB.articles.find((x) => x.id === 'a3'); a.title = 'Written on A meanwhile'; a.updatedAt = new Date().toISOString(); });
      await sleep(3000);
      B.offline = false; await B.ctx.setOffline(false); cloud.reconnect(B);
    }, async () => ((await Promise.all(devs.map((d) => noteTitle(d, 'a2')))).every((t) => t === 'Written offline on B') && (await Promise.all(devs.map((d) => noteTitle(d, 'a3')))).every((t) => t === 'Written on A meanwhile')) ? '' : 'an offline/online edit missing');
    const fin = await sameDB(devs);
    check(fails.length === 0, '51h three devices, blob NOT read: create, edit, rename, Trash, restore, empty Trash, move folder, theme colour, concurrent edit, offline rejoin all converge (order included)', fails.slice(0, 3).join(' · ') + ' ' + steps.join(' '));
    check(recsAssemble(cloud, fin.dbs, fin.own), '51h …and the recs assemble to the converged notebook', 'per-device keys ignored: ' + fin.own.join(','));
    const sts = await Promise.all(devs.map((d) => stat(d)));
    check(sts.every((s) => s.rd && s.rd.on && s.rd.records > 0), '51h …every device reports the per-note copy on, with records', JSON.stringify(sts.map((s) => s.rd)));
    check(devs.every((d) => d.errors.length === 0), '51h no page errors', devs.flatMap((d) => d.errors).slice(0, 3).join(' · '));
    for (const d of devs) await d.ctx.close();
  }

  /* ── 51j: received = known — the two that receive an edit write zero recs for it ── */
  {
    const { cloud, devs, A, B, C } = await trio();
    await act(A, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.content += '<p>seed edit</p>'; a.updatedAt = new Date().toISOString(); });
    await settle(cloud, devs);
    const mark = cloud.log.length;
    await act(A, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.content += '<p>edit received by two</p>'; a.updatedAt = new Date().toISOString(); });
    await sleep(500); await settle(cloud, devs);
    const w = cloud.log.slice(mark).filter((o) => o.t === 'set' && o.p === NB + '/recs/articles~a1');
    const by = {}; w.forEach((o) => { by[o.dev] = (by[o.dev] || 0) + 1; });
    const others = cloud.log.slice(mark).filter((o) => o.t === 'set' && o.p.startsWith(NB + '/recs/') && o.p !== NB + '/recs/articles~a1' && o.p !== NB + '/recs/_head~0').map((o) => o.dev + ':' + o.p.slice(NB.length + 6));
    const got = await Promise.all([B, C].map((d) => has(d, () => DB.articles.find((x) => x.id === 'a1').content.includes('edit received by two'))));
    check(by.phone === 1 && !by.tablet && !by.laptop && got.every(Boolean) && others.length === 0,
      '51j one device edits a note, the other two receive it: they write ZERO recs for it (or for any other record)', JSON.stringify({ writesForNote: by, otherRecWrites: others, got }));
    const idleMark = cloud.log.length; await sleep(9000);
    check(cloud.log.length === idleMark, '51j converged and idle for 9 s: nothing is written to the cloud (no ping-pong between the three)', JSON.stringify(cloud.log.slice(idleMark).map((o) => o.dev + ':' + o.p.slice(NB.length + 1))));
    check(devs.every((d) => d.errors.length === 0), '51j no page errors', devs.flatMap((d) => d.errors).slice(0, 3).join(' · '));
    for (const d of devs) await d.ctx.close();
  }

  /* ── 51k: self-heal — a device's merged copy is newer than the cloud's rec: it is written back up ── */
  {
    const { cloud, devs, A, B, C } = await trio();
    await act(A, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.content += '<p>first</p>'; a.updatedAt = new Date().toISOString(); });
    await settle(cloud, devs);
    const recBefore = cloud.store.get(NB + '/recs/articles~a1');
    B.dieAfterRec = 0;   /* B's recs writes now hang for ever; its blob push still lands */
    const mark = cloud.log.length;
    await act(B, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.content += '<p>held back</p>'; a.updatedAt = new Date().toISOString(); });
    let got = false; const t0 = Date.now();
    while (Date.now() - t0 < 30000) { if ((await Promise.all([A, C].map((d) => has(d, () => DB.articles.find((x) => x.id === 'a1').content.includes('held back'))))).every(Boolean)) { got = true; break; } await sleep(300); }
    await sleep(4000); await settle(cloud, [A, C]);
    const want = await on(B, () => _syncSig(JSON.stringify(DB.articles.find((x) => x.id === 'a1'))));
    const recNow = cloud.store.get(NB + '/recs/articles~a1');
    const writers = cloud.log.slice(mark).filter((o) => o.t === 'set' && o.p === NB + '/recs/articles~a1').map((o) => o.dev);
    check(got && recNow && recNow.sig === want && recNow.at.__ts[0] * 1e3 > recBefore.at.__ts[0] * 1e3 - 1 && writers.length >= 1 && writers.every((x) => x === 'phone' || x === 'laptop') && !writers.includes('tablet'),
      '51k B\'s recs write is held back; the other devices merge B\'s newer copy from the blob and write it back up (the cloud rec ends newest)', JSON.stringify({ got, writers, sigOk: recNow && recNow.sig === want }));
    check(devs.every((d) => d.errors.length === 0), '51k no page errors', devs.flatMap((d) => d.errors).slice(0, 3).join(' · '));
    for (const d of devs) await d.ctx.close();
  }

  /* ── 51l: a fourth, fresh device (empty replica, blob not read) gets everything from recs ── */
  {
    const { cloud, devs, A, B } = await trio({ recsOnly: true });
    await act(A, () => { mkArt('f1', 'Before the fresh device'); });
    await settle(cloud, devs);
    await act(B, () => { trashArt('a3'); });
    await settle(cloud, devs);
    const D = await addDevice(browser, srv.base, cloud, 'fresh', { width: 1440, height: 900 }, false, seedDB('2026-01-01T00:00:00.000Z'), { recsOnly: true });   /* an OLD notebook: a note newer than its own deletion would (rightly) survive it */
    await settle(cloud, [...devs, D]);
    const all = [...devs, D];
    const total = [...cloud.store.keys()].filter((k) => k.startsWith(NB + '/recs/')).length;
    const r = await sameDB(all);
    check(r.ok && D.qDelivered >= total && (await has(D, () => DB.articles.some((a) => a.title === 'Before the fresh device'))),
      '51l fresh device: cursor 0 downloads every rec once, and it equals the other three', JSON.stringify({ why: r.why, delivered: D.qDelivered, total, ...(r.ok ? {} : { state: await Promise.all(all.map((d) => on(d, () => ({ a: DB.articles.map((x) => x.id), t: DB.trash.map((x) => x.item && x.item.id), ts: DB.tombstones.map((x) => x.id) })))) }) }));
    const maxAt = Math.max(...[...cloud.store.entries()].filter(([k]) => k.startsWith(NB + '/recs/')).map(([, v]) => v.at.__ts[0] * 1e3 + v.at.__ts[1] / 1e6));
    const within = [...cloud.store.entries()].filter(([k, v]) => k.startsWith(NB + '/recs/') && v.at.__ts[0] * 1e3 + v.at.__ts[1] / 1e6 > maxAt - 2000).length;
    await reopen(D); await settle(cloud, all);
    const redelivered = D.qChangeLog.filter((c) => c.at[0] * 1e3 + c.at[1] / 1e6 <= maxAt).length;
    const r2 = await sameDB(all);
    check(r2.ok && redelivered <= within && redelivered < total,
      '51l …then reloading it re-downloads nothing beyond the 2 s overlap', JSON.stringify({ redelivered, overlapDocs: within, total, why: r2.why }));
    check(all.every((d) => d.errors.length === 0), '51l no page errors', all.flatMap((d) => d.errors).slice(0, 3).join(' · '));
    for (const d of all) await d.ctx.close();
  }

  /* ── 51p: a stale device writes nothing until it has read — it cannot put a deleted note's live rec over the cloud's `gone` ── */
  {
    const { cloud, devs, A, B } = await trio({ recsOnly: true });
    await act(A, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.content += '<p>warm</p>'; a.updatedAt = new Date().toISOString(); });
    await settle(cloud, devs);
    await act(B, () => { trashArt('a3'); });
    await settle(cloud, devs);
    const goneBefore = cloud.store.get(NB + '/recs/articles~a3');
    const mark = cloud.log.length;
    /* A device with an OLD copy of the notebook (a3 still alive in it) whose first read of the per-note copy is held back. */
    const D = await addDevice(browser, srv.base, cloud, 'stale', { width: 1440, height: 900 }, false, seedDB('2026-01-01T00:00:00.000Z'), { recsOnly: true, holdQ: true });
    await act(D, () => { const a = DB.articles.find((x) => x.id === 'a2'); a.content += '<p>typed on the stale device</p>'; a.updatedAt = new Date().toISOString(); });
    await sleep(5000);
    const early = cloud.log.slice(mark).filter((o) => o.t === 'set' && o.p.startsWith(NB + '/recs/') && o.dev === 'stale').map((o) => o.p.slice(NB.length + 6));
    D.holdQ = false; for (const id of D.qsubs.keys()) cloud.deliverQ(D, id, true);
    const all = [...devs, D];
    await settle(cloud, all);
    const goneAfter = cloud.store.get(NB + '/recs/articles~a3');
    const r = await sameDB(all);
    check(early.length === 0 && goneBefore && goneBefore.gone === true && goneAfter && goneAfter.gone === true && r.ok && (await has(D, () => !DB.articles.some((a) => a.id === 'a3') && DB.articles.find((a) => a.id === 'a2').content.includes('typed on the stale device'))),
      '51p a stale device whose first read is held back writes no recs until it has read; the deleted note stays gone and its own edit still arrives', JSON.stringify({ earlyWrites: early, goneBefore: !!(goneBefore && goneBefore.gone), goneAfter: !!(goneAfter && goneAfter.gone), why: r.why }));
    check(all.every((d) => d.errors.length === 0), '51p no page errors', all.flatMap((d) => d.errors).slice(0, 3).join(' · '));
    for (const d of all) await d.ctx.close();
  }

  /* ── 51m: a >1 MB note edited on A while B is reading its parts ── */
  {
    const { cloud, devs, A, B } = await trio({ recsOnly: true });
    await on(B, () => { window.__putLog = []; const o = _s1RepSave; _s1RepSave = async (nb, puts, c) => { puts.forEach(([k, e]) => { if (k === 'articles~a-big') { let ok = true; try { JSON.parse(e.rec); } catch (x) { ok = false; } window.__putLog.push({ g: e.g, n: e.n, ok, v2: /v2-marker/.test(e.rec || '') }); } }); return o(nb, puts, c); }; });
    let hook = null;
    B.partHook = async (path) => {
      const g1 = path.split('~').slice(-2)[0];
      hook = { g1, fired: true };
      await act(A, () => { const a = DB.articles.find((x) => x.id === 'a-big'); a.content += '<p>v2-marker</p>'; a.updatedAt = new Date(Date.now() + 1000).toISOString(); });
      const t0 = Date.now();
      while (Date.now() - t0 < 40000) {
        const rec = cloud.store.get(NB + '/recs/articles~a-big');
        const old = [...cloud.store.keys()].some((k) => k.includes('/recparts/articles~a-big~' + g1 + '~'));
        if (rec && rec.g && rec.g !== g1 && !old) break;
        await sleep(200);
      }
    };
    await act(A, () => {
      const now = new Date().toISOString();
      DB.articles.push({ id: 'a-big', title: 'Big', content: '<p><img src="data:image/png;base64,' + 'QUJD'.repeat(330000) + '"></p>', folderIds: ['f1'], tags: [], createdAt: now, updatedAt: now, kind: 'general' });
    });
    await settle(cloud, devs, 120000);
    const log = await on(B, () => window.__putLog);
    const gotV2 = await has(B, () => (DB.articles.find((x) => x.id === 'a-big') || { content: '' }).content.includes('v2-marker'));
    const r = await sameDB(devs);
    check(hook && hook.fired && gotV2 && log.length >= 1 && log.every((x) => x.ok) && log[log.length - 1].v2 && r.ok,
      '51m >1 MB note edited on A while B reads its parts: B never applies half a record and ends with the new version', JSON.stringify({ hook, gotV2, putLog: log, why: r.why }));
    check(devs.every((d) => d.errors.length === 0), '51m no page errors', devs.flatMap((d) => d.errors).slice(0, 3).join(' · '));
    for (const d of devs) await d.ctx.close();
  }

  /* ── 51n: reads of recs refused → the blob still carries, quietly, and _s1Stat names the refusal ── */
  {
    const cloud = makeCloud(); cloud.refuseRead = ['/recs', '/recparts'];
    const { devs, A, B, C } = await trio({}, cloud);
    await act(A, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.title = 'Edited on A (read refused)'; a.updatedAt = new Date().toISOString(); });
    let got = false; const t0 = Date.now();
    while (Date.now() - t0 < 30000) { if ((await Promise.all([B, C].map((d) => noteTitle(d, 'a1')))).every((t) => t === 'Edited on A (read refused)')) { got = true; break; } await sleep(300); }
    await act(C, () => { const a = DB.articles.find((x) => x.id === 'a2'); a.title = 'Edited on C (read refused)'; a.updatedAt = new Date().toISOString(); });
    let got2 = false; const t1 = Date.now();
    while (Date.now() - t1 < 30000) { if ((await Promise.all([A, B].map((d) => noteTitle(d, 'a2')))).every((t) => t === 'Edited on C (read refused)')) { got2 = true; break; } await sleep(300); }
    await sleep(2500);
    const sts = await Promise.all(devs.map((d) => stat(d)));
    const dots = await Promise.all(devs.map((d) => on(d, () => document.getElementById('sync-dot')?.textContent || '')));
    const alarms = await Promise.all(devs.map((d) => on(d, () => window.__toasts.filter((t) => /NOT syncing|Sync error|Still cannot|failed|REJECTING|Can.t reach|denied/i.test(t)))));
    check(got && got2, '51n recs reads refused (permission-denied): the blob still converges three devices, an edit each way', JSON.stringify({ got, got2 }));
    check(alarms.every((x) => x.length === 0) && dots.every((t) => !/err|NOT/i.test(t)), '51n …no toast, the dot not in error', JSON.stringify({ dots, alarms }));
    check(sts.every((s) => s.rd && s.rd.on === false && s.rd.reason === 'permission-denied' && s.rd.err && s.rd.err.code === 'permission-denied'), '51n …and _s1Stat names the refusal on every device', JSON.stringify(sts.map((s) => s.rd)));
    check(devs.every((d) => d.errors.length === 0), '51n no page errors', devs.flatMap((d) => d.errors).slice(0, 3).join(' · '));
    for (const d of devs) await d.ctx.close();
  }

  /* ── 51o: order — where a note created on another device lands ── */
  {
    const { cloud, devs, A, B, C } = await trio();
    await act(A, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.content += '<p>warm up</p>'; a.updatedAt = new Date().toISOString(); });
    await settle(cloud, devs);
    await Promise.all([B, C].map((d) => on(d, () => { window.__pre = JSON.parse(JSON.stringify(DB)); })));
    await act(A, () => { mkArt('f1', 'Order note'); });
    await settle(cloud, devs);
    const aDB = await liveDB(A);
    const ids = (d) => on(d, () => artsIn('f1').map((a) => a.id));
    const idA = await ids(A), pos = {};
    pos.A = idA.findIndex((i) => aDB.articles.find((a) => a.id === i).title === 'Order note');
    const same = [];
    for (const d of [B, C]) {
      const exp = await on(d, (adb) => mergeDB(JSON.parse(JSON.stringify(window.__pre)), adb).articles.filter((a) => a.folderIds.includes('f1')).map((a) => a.id), aDB);
      const act2 = await ids(d);
      pos[d.name] = act2.findIndex((i) => aDB.articles.find((a) => a.id === i).title === 'Order note');
      same.push(JSON.stringify(exp) === JSON.stringify(act2) && JSON.stringify(act2) === JSON.stringify(idA));
    }
    check(same.every(Boolean), '51o a note created on A lands at the same place in Pane 2\'s list on B and C as the blob path gives (and as on A)', JSON.stringify({ position_in_f1_list: pos, listLength: idA.length, same }));
    /* A device with NO notes yet, reading recs only: the replica's (o, key) order against A's own array order. */
    const empty = seedDB(); empty.articles = [];
    const D = await addDevice(browser, srv.base, cloud, 'empty', { width: 1440, height: 900 }, false, empty, { recsOnly: true });
    await settle(cloud, [...devs, D]);
    const orderA = (await liveDB(A)).articles.map((a) => a.id), orderD = (await liveDB(D)).articles.map((a) => a.id);
    check(JSON.stringify(orderA) === JSON.stringify(orderD),
      '51o a device that starts with no notes and reads only recs lists them in the same order as the writer (blob order)', JSON.stringify({ writer: orderA, recsOnly: orderD }));
    check([...devs, D].every((d) => d.errors.length === 0), '51o no page errors', [...devs, D].flatMap((d) => d.errors).slice(0, 3).join(' · '));
    for (const d of [...devs, D]) await d.ctx.close();
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
