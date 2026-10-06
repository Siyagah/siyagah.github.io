/* tools/s1-fake.mjs — v04.91: the fake Firestore + multi-device plumbing of sync-s1.mjs, copied (lines 25–237 of it,
   unchanged) so sync-s1d.mjs can use the same cloud. Keep the two in step if the fake ever changes. */
import { seedDB } from './harness.mjs';
import { assembleRecs, canonDB, diffDB } from './s1-assemble.mjs';
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
    const res = cloud.apply(ops, d);
    /* test hook (51r): the commit lands, but this device is not told until released */
    if (d.holdAfterRec && !res.error && ops.some((o) => o.t === 'set' && o.p.endsWith('/recs/articles~a-big') && o.d.g)) { const h = d.holdAfterRec; d.holdAfterRec = null; await h; }
    return res;
  });
  const page = await ctx.newPage();
  d.page = page;
  if (opts.throttle) { d.cdp = await ctx.newCDPSession(page); await d.cdp.send('Emulation.setCPUThrottlingRate', { rate: opts.throttle }); }   /* v04.90 measurements: a phone's CPU */
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
export { FAKE_SDK, NB, MAX_DOC, MAX_REQ, sleep, results, check, makeCloud, addDevice, boot, reopen, on, recWrites, partWrites, quiet, push, liveDB, stat, waitSeeded, assembleEquals, freshDevice };
