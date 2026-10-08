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
import { playwright, serve, seedDB, ROOT } from './harness.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
  /* v04.93 — Firestore Bytes: {__bytes: base64} across the binding */
  class FB { constructor(b){ this.__bytes = b; } toUint8Array(){ const s = atob(this.__bytes), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
    static fromUint8Array(u){ let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); return new FB(btoa(s)); } }
  const conv = (d) => { if (d == null) return d; const o = JSON.parse(JSON.stringify(d)); for (const k of Object.keys(o)) if (o[k] && o[k].__ts) o[k] = new TS(o[k].__ts[0], o[k].__ts[1]); else if (o[k] && typeof o[k].__bytes === 'string') o[k] = new FB(o[k].__bytes); return o; };
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
    async set(data){ const r = await window.__fsCommit([{ t: 'set', p: path, d: JSON.parse(JSON.stringify(data)) }]); if (r.error) throw mkErr(r.error); },
    onSnapshot(cb){ (listeners[path] = listeners[path] || []).push(cb); window.__fsListen(path); return () => { listeners[path] = (listeners[path] || []).filter((x) => x !== cb); }; } }; }
  function collRef(path){ return { doc: (id) => docRef(path + '/' + id), where: (f, op, v) => query(path, v) }; }
  function batch(){ const ops = []; const b = {
    set(ref, data){ ops.push({ t: 'set', p: ref._path, d: JSON.parse(JSON.stringify(data)) }); return b; },
    delete(ref){ ops.push({ t: 'del', p: ref._path }); return b; },
    async commit(){ const r = await window.__fsCommit(ops); if (r.error) throw mkErr(r.error); } }; return b; }
  const fs = { collection: (n) => collRef(n), batch, settings(){} };
  fb.firestore = function(){ return fs; };
  fb.firestore.FieldValue = { serverTimestamp: () => ({ __sts: 1 }) };
  fb.firestore.Timestamp = TS;
  fb.firestore.Blob = FB;
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
  const cloud = { store: new Map(), devices: [], log: [], commits: 0, refuse: [], refuseRead: [], reads: [], ver: new Map(), lastMs: 0 };
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
      let raw = 0;   /* v04.93 — Bytes count as raw bytes, as Firestore counts them */
      const s = Buffer.byteLength(JSON.stringify(o.d, (k, v) => { if (v && typeof v === 'object' && typeof v.__bytes === 'string') { raw += Math.floor(v.__bytes.length * 3 / 4); return ''; } return v; })) + raw;
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
    cloud.reads.push({ p: path, dev: d.name });
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

const pw = await playwright();
const srv = await serve();
const browser = await pw.chromium.launch();
const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];
const measure = process.argv.includes('--measure');
/* --only=51t,51u runs just those multi-device blocks (a faster loop); no flag = all. 51a–51g (single device) run only without it. */
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (tag) => !onlySet || onlySet.has(tag);

try {
  for (const vp of (process.argv.includes('--s1b') || onlySet ? [] : VPS)) {   /* --s1b: only 51h–51o (a faster loop while working) */
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

  /* ── 51h: recs only — three devices converge through recs alone ──
     v04.90 — the scenario is a function: 51s runs it again with the blob read
     too, after every main doc has been marked, and counts blob writes. */
  const blobWrites = (cloud, from) => cloud.log.slice(from).filter((o) => o.t === 'set' && (o.p === NB || o.p.startsWith(NB + '/chunks/')));
  const scenarioH = async (tag, trioOpts, warm) => {
    const { cloud, devs, A, B, C } = await trio(trioOpts);
    if (warm) await warm(cloud, devs);
    const mark0 = cloud.log.length;
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
    check(fails.length === 0, tag + ' three devices' + (trioOpts.recsOnly ? ', blob NOT read' : ', blob read too, every main doc marked') + ': create, edit, rename, Trash, restore, empty Trash, move folder, theme colour, concurrent edit, offline rejoin all converge (order included)', fails.slice(0, 3).join(' · ') + ' ' + steps.join(' '));
    check(recsAssemble(cloud, fin.dbs, fin.own), tag + ' …and the recs assemble to the converged notebook', 'per-device keys ignored: ' + fin.own.join(','));
    const sts = await Promise.all(devs.map((d) => stat(d)));
    check(sts.every((s) => s.rd && s.rd.on && s.rd.records > 0), tag + ' …every device reports the per-note copy on, with records', JSON.stringify(sts.map((s) => s.rd)));
    const blobs = blobWrites(cloud, mark0), mainDoc = cloud.store.get(NB);
    check(devs.every((d) => d.errors.length === 0), tag + ' no page errors', devs.flatMap((d) => d.errors).slice(0, 3).join(' · '));
    for (const d of devs) await d.ctx.close();
    return { blobs, mainDoc };
  };
  if (want('51h')) await scenarioH('51h', { recsOnly: !process.argv.includes('--normal') });   /* --normal: run 51h with the blob read too, to tell a recs fault from an old one */

  /* ── 51s (v04.90): three v04.90 devices, every main doc marked. After the first
        marked writes a push writes ZERO blob docs, and the whole 51h scenario
        still converges (with the blob read too: marked main docs are skipped). ── */
  if (want('51s')) {
    const r = await scenarioH('51s', {}, async (cloud, devs) => {
      for (const d of devs) { await act(d, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.content += '<p>warm ' + Math.random() + '</p>'; a.updatedAt = new Date().toISOString(); }); await settle(cloud, devs); }
    });
    check(r.blobs.length === 0 && r.mainDoc && r.mainDoc.s1c === '04.90',
      '51s after the first marked writes, the whole scenario writes ZERO blob docs (main doc + chunks), and the main doc carries s1c "04.90"',
      JSON.stringify({ blobWritesAfterWarmUp: r.blobs.map((o) => o.dev + ':' + o.p.slice(NB.length)), s1c: r.mainDoc && r.mainDoc.s1c }));
  }

  /* ── 51j: received = known — the two that receive an edit write zero recs for it ── */
  if (want('51j')) {
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
  if (want('51k')) {
    const { cloud, devs, A, B, C } = await trio();
    await act(A, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.content += '<p>first</p>'; a.updatedAt = new Date().toISOString(); });
    await settle(cloud, devs);
    const recBefore = cloud.store.get(NB + '/recs/articles~a1');
    /* v04.90 — updated in place. Until v04.89 the blob always carried an edit
       whatever happened to the recs. Now a device with the blob off that cannot
       finish its recs write simply does not finish the push (that is the
       point: recs ARE the sync). What this check is about — the cloud's recs
       lacking an edit that the blob carried, and the other devices writing it
       back — is the situation a device that can only write the blob (an older
       build, or one the recs refuse) creates. So B is made to be one: its plan
       is the blob, and its detached recs write hangs for ever. */
    await on(B, () => { _s1Plan = () => 'blob'; });
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
  if (want('51l')) {
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
  if (want('51p')) {
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
  if (want('51m')) {
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
  if (want('51n')) {
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

  /* ── 51q: a rec naming a generation whose pieces are gone — bounded retries, then given up on; later recs still arrive ── */
  if (want('51q')) {
    const { cloud, devs, A, B, C } = await trio({ recsOnly: true });
    await settle(cloud, devs);
    for (const d of devs) await on(d, () => { _S1_BACKOFF = [400, 800, 1200]; window.__rs = 0; const o = _s1ReadStart; _s1ReadStart = async (c) => { window.__rs++; return o(c); }; });
    const ghost = NB + '/recs/articles~ghost';
    cloud.apply([{ t: 'set', p: ghost, d: { c: 'articles', id: 'ghost', sig: 'x', ver: 'v-ghost', n: 2, g: 'gGONE', at: { __sts: 1 } } }], null);
    /* wait for the condition, never a fixed time: the give-up comes after the 4th failure (3 backoffs of 400+800+1200 ms plus the reads) */
    for (let t0 = Date.now(); Date.now() - t0 < 60000;) {
      const sts = await Promise.all(devs.map((d) => stat(d)));
      if (sts.every((x) => x.rd && x.rd.err && x.rd.err.code === 'unresolvable')) break;
      await sleep(300);
    }
    await sleep(2000);   /* unpatched: a restart every 3 s, for ever — still bites after the give-up point */
    const rs1 = await Promise.all(devs.map((d) => on(d, () => window.__rs)));
    const st1 = await Promise.all(devs.map((d) => stat(d)));
    await sleep(6000);
    const rs2 = await Promise.all(devs.map((d) => on(d, () => window.__rs)));
    await act(A, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.title = 'After the unresolvable rec'; a.updatedAt = new Date().toISOString(); });
    let got = false; const t0 = Date.now();
    while (Date.now() - t0 < 30000) { if ((await Promise.all([B, C].map((d) => noteTitle(d, 'a1')))).every((t) => t === 'After the unresolvable rec')) { got = true; break; } await sleep(300); }
    const gAt = cloud.store.get(ghost).at.__ts[0] * 1000 + cloud.store.get(ghost).at.__ts[1] / 1e6;
    const st2 = await Promise.all(devs.map((d) => stat(d)));
    check(rs1.every((n) => n <= 4) && rs2.every((n, i) => n === rs1[i]) && st1.every((s) => s.rd && s.rd.err && s.rd.err.code === 'unresolvable' && s.rd.err.key === 'articles~ghost'),
      '51q a rec naming a generation whose pieces are gone: at most 4 listener restarts, then given up on (st.err unresolvable, no more restarts)', JSON.stringify({ rs1, rs2, err: st1.map((s) => s.rd && s.rd.err) }));
    check(got && st2.every((s) => s.rd.cursor >= gAt - 1) && st2.every((s) => s.rd.on), '51q …a rec written after it still arrives, and the cursor is past it', JSON.stringify({ got, gAt, cursors: st2.map((s) => s.rd.cursor) }));
    check(devs.every((d) => d.errors.length === 0), '51q no page errors', devs.flatMap((d) => d.errors).slice(0, 3).join(' · '));
    for (const d of devs) await d.ctx.close();
  }

  /* ── 51z: a rec whose piece is not there yet, and another rec written inside its backoff — the first one still arrives ──
     The running listener delivers the later doc as its own snapshot; the cursor must not pass the pending rec. */
  if (want('51z')) {
    const { cloud, devs, A, B, C } = await trio({ recsOnly: true });
    await settle(cloud, devs);
    for (const d of devs) await on(d, () => { _S1_BACKOFF = [5000, 10000, 15000]; });
    const late = NB + '/recs/articles~late', part = NB + '/recparts/articles~late~gLATE~0';
    cloud.apply([{ t: 'set', p: late, d: { c: 'articles', id: 'late', sig: 'zz1', ver: 'v-late', n: 1, g: 'gLATE', o: 99, at: { __sts: 1 } } }], null);
    const pend = (d) => on(d, () => _s1RdFails.size);   /* exists unpatched too: one failure recorded, retry scheduled */
    let pending = false;
    for (let t0 = Date.now(); Date.now() - t0 < 15000 && !pending;) { pending = (await Promise.all(devs.map(pend))).every((n) => n === 1); if (!pending) await sleep(200); }
    /* inside the backoff window another device writes a different rec — more than the 2 s cursor overlap later, or the overlap alone hides the fault */
    await sleep(2600);
    await act(A, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.title = 'Written inside the backoff'; a.updatedAt = new Date().toISOString(); });
    let got1 = false;
    for (let t0 = Date.now(); Date.now() - t0 < 4000 && !got1;) { got1 = (await Promise.all([B, C].map((d) => noteTitle(d, 'a1')))).every((t) => t === 'Written inside the backoff'); if (!got1) await sleep(200); }
    await sleep(300);
    const lAt = cloud.store.get(late).at.__ts[0] * 1000 + cloud.store.get(late).at.__ts[1] / 1e6;
    const mid = await Promise.all(devs.map((d) => stat(d)));
    /* now the piece arrives; the scheduled retry must find the rec */
    const body = await on(A, () => _b64enc(JSON.stringify({ id: 'late', title: 'Arrived late', content: '<p>x</p>', folderIds: ['f1'], tags: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), kind: 'general' })));
    cloud.apply([{ t: 'set', p: part, d: { p: body } }], null);
    let got = false;
    for (let t0 = Date.now(); Date.now() - t0 < 60000 && !got;) { got = (await Promise.all(devs.map((d) => noteTitle(d, 'late')))).every((t) => t === 'Arrived late'); if (!got) await sleep(300); }
    const end = await Promise.all(devs.map((d) => stat(d)));
    check(pending && got1 && mid.every((s) => s.rd && s.rd.cursor < lAt), '51z …the cursor did not pass the pending rec while another rec was delivered', JSON.stringify({ pending, got1, lAt, cursors: mid.map((s) => s.rd && s.rd.cursor) }));
    check(got, '51z …the rec whose piece came late still arrives on every device after its retry', JSON.stringify({ titles: await Promise.all(devs.map((d) => noteTitle(d, 'late'))), cursors: end.map((s) => s.rd && s.rd.cursor), lAt }));
    check(devs.every((d) => d.errors.length === 0), '51z no page errors', devs.flatMap((d) => d.errors).slice(0, 3).join(' · '));
    for (const d of devs) await d.ctx.close();
  }

  /* ── 51r: two devices save the same >700 KB note within seconds — the clean-up never deletes a generation the rec still names ── */
  if (want('51r')) {
    const { cloud, devs, A, B, C } = await trio({ recsOnly: true });
    const BIG = NB + '/recs/articles~a-big';
    await act(A, () => {
      const now = new Date().toISOString();
      DB.articles.push({ id: 'a-big', title: 'Big', content: '<p><img src="data:image/png;base64,' + 'QUJD'.repeat(330000) + '"></p>', folderIds: ['f1'], tags: [], createdAt: now, updatedAt: now, kind: 'general' });
    });
    await settle(cloud, devs, 120000);
    const g1 = (cloud.store.get(BIG) || {}).g;
    let release; A.holdAfterRec = new Promise((r) => { release = r; });   /* A's rec commit lands, but A is not told until released */
    await on(A, () => { const a = DB.articles.find((x) => x.id === 'a-big'); a.content += '<p>vA</p>'; a.updatedAt = new Date().toISOString(); persist(); flushPendingPush(); });
    let gA = null; let t0 = Date.now();
    while (Date.now() - t0 < 40000) { const r = cloud.store.get(BIG); if (r && r.g && r.g !== g1) { gA = r.g; break; } await sleep(100); }
    const bHas = () => has(B, () => DB.articles.find((x) => x.id === 'a-big').content.includes('vA'));
    t0 = Date.now(); while (Date.now() - t0 < 40000 && !(await bHas())) await sleep(200);
    await on(B, () => { const a = DB.articles.find((x) => x.id === 'a-big'); a.content += '<p>vB</p>'; a.updatedAt = new Date(Date.now() + 1000).toISOString(); persist(); flushPendingPush(); });
    let gB = null; t0 = Date.now();
    while (Date.now() - t0 < 40000) { const r = cloud.store.get(BIG); if (r && r.g && r.g !== g1 && r.g !== gA) { gB = r.g; break; } await sleep(100); }
    /* wait until A's own reader holds B's generation as the one it knows: its clean-up will treat it as "previous" */
    t0 = Date.now(); while (Date.now() - t0 < 40000) { const pg = await on(A, () => (_s1Map && _s1Map.p['articles~a-big'] || [])[0]); if (pg && pg === gB) break; await sleep(200); }
    release();
    /* sample the cloud while the clean-ups run: at no moment may the rec name a generation with a piece missing */
    let torn = null; const tS = Date.now();
    while (Date.now() - tS < 12000) {
      const rr = cloud.store.get(BIG);
      if (rr && rr.g) { const have = [...cloud.store.keys()].filter((k) => k.includes('/recparts/articles~a-big~' + rr.g + '~')).length; if (have < rr.n) torn = { g: rr.g, have, n: rr.n }; }
      await sleep(50);
    }
    await settle(cloud, devs, 120000);
    const named = cloud.store.get(BIG);
    const parts = [...cloud.store.keys()].filter((k) => named && k.includes('/recparts/articles~a-big~' + named.g + '~'));
    const r = await sameDB(devs);
    const eq = { ok: recsAssemble(cloud, r.dbs, r.own), why: 'recs differ from the devices (per-device keys ignored: ' + r.own.join(',') + ')' };
    check(gA && gB && !torn && named && parts.length === named.n && eq.ok && r.ok && (await has(A, () => DB.articles.find((x) => x.id === 'a-big').content.includes('vB'))),
      '51r the generation the rec names keeps all its pieces after the other device\'s clean-up; the assembly equals both devices', JSON.stringify({ torn, g1, gA, gB, namedG: named && named.g, parts: parts.length, n: named && named.n, why: eq.why || r.why }));
    check(devs.every((d) => d.errors.length === 0), '51r no page errors', devs.flatMap((d) => d.errors).slice(0, 3).join(' · '));
    for (const d of devs) await d.ctx.close();
  }

  /* ── 51o: order — where a note created on another device lands ── */
  if (want('51o')) {
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

  /* ══ v04.90 — S1c: recs is the sync; the blob only while an older build is active ══ */
  const warmAll = async (cloud, devs) => {
    for (const d of devs) { await act(d, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.content += '<p>warm ' + Math.random() + '</p>'; a.updatedAt = new Date().toISOString(); }); await settle(cloud, devs); }
  };
  const editTitle = (d, id, t) => act(d, ([i, tt]) => { const a = DB.articles.find((x) => x.id === i); a.title = tt; a.updatedAt = new Date().toISOString(); }, [id, t]);
  const waitTitle = async (devs, id, t, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if ((await Promise.all(devs.map((d) => noteTitle(d, id)))).every((x) => x === t)) return true; await sleep(300); } return false; };
  const toastsOf = (d, re) => on(d, (s) => window.__toasts.filter((t) => new RegExp(s, 'i').test(t)), re.source);

  /* ── 51t: an OLD build (v04.89, from git) is active. v04.90 devices write the blob too; the old device receives
        their edits and they receive its edits. Then the unmarked write ages past 30 days and blob writes stop;
        when the old build writes again, they flip back. ── */
  if (want('51t')) {
    let oldSrv = null, why = '';
    try {
      const dir = mkdtempSync(join(tmpdir(), 'siyagah-old-'));
      for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', '2a5d1ca:' + f], { cwd: ROOT, maxBuffer: 1 << 28 })); } catch (e) { if (f === 'index.html') throw e; } }
      oldSrv = await serve(dir);
    } catch (e) { why = String(e.message || e).slice(0, 200); }
    if (!oldSrv) check(false, '51t the v04.89 build could not be read from git (commit 2a5d1ca)', why);
    else {
      const { cloud, devs: three, A, B, C } = await trio();
      const D = await addDevice(browser, oldSrv.base, cloud, 'old', { width: 1440, height: 900 }, false, seedDB());
      const devs = [...three, D];
      await settle(cloud, devs);
      const oldVer = await on(D, () => document.querySelector('meta[name=app-version]').content);
      await editTitle(D, 'a2', 'Edited on the OLD build');
      await settle(cloud, devs);
      const g1 = await waitTitle(three, 'a2', 'Edited on the OLD build');
      check(oldVer === '04.89' && g1, '51t the old build (v04.89) writes the blob unmarked: all three v04.90 devices receive its edit', JSON.stringify({ oldVer, g1 }));
      let mark = cloud.log.length;
      await editTitle(A, 'a1', 'Edited on A while old is active');
      await settle(cloud, devs);
      const gOld = await waitTitle([D], 'a1', 'Edited on A while old is active');
      const bw1 = blobWrites(cloud, mark);
      const md1 = cloud.store.get(NB);
      check(gOld && bw1.length > 0 && recWrites(cloud, mark).length > 0 && md1.s1c === '04.90' && md1.s1o > 0,
        '51t a v04.90 device edits: it writes recs AND the blob, the old build receives it, and the marked main doc remembers when an older build last wrote (s1o)', JSON.stringify({ gOld, blobDocs: bw1.length, recs: recWrites(cloud, mark).length, s1c: md1.s1c, s1o: md1.s1o }));
      mark = cloud.log.length;
      await editTitle(B, 'a3', 'Edited on B, old still active');
      await settle(cloud, devs);
      const gOld2 = await waitTitle([D], 'a3', 'Edited on B, old still active');
      check(gOld2 && blobWrites(cloud, mark).length > 0, '51t …and the NEXT v04.90 device (main doc now marked) still writes the blob, because the older build is still active', JSON.stringify({ gOld2, blobDocs: blobWrites(cloud, mark).length }));
      await editTitle(D, 'a2', 'Edited on the OLD build again');
      await settle(cloud, devs);
      const g2 = await waitTitle(three, 'a2', 'Edited on the OLD build again');
      check(g2, '51t …and the old build\'s next edit reaches all three v04.90 devices', JSON.stringify({ g2 }));
      /* age the unmarked write past 30 days (inject the clock on the v04.90 devices) */
      await Promise.all(three.map((d) => on(d, () => { window._s1Now = () => Date.now() + 31 * 864e5; })));
      mark = cloud.log.length;
      await editTitle(A, 'a1', 'Edited on A after 30 days');
      await settle(cloud, devs);
      const gB = await waitTitle([B, C], 'a1', 'Edited on A after 30 days');
      const staleOld = (await noteTitle(D, 'a1')) !== 'Edited on A after 30 days';
      check(gB && blobWrites(cloud, mark).length === 0 && recWrites(cloud, mark).length > 0,
        '51t the last unmarked write is over 30 days old: a push writes recs only (zero blob docs) and the other v04.90 devices still receive it', JSON.stringify({ gB, blobDocs: blobWrites(cloud, mark).length, oldDeviceStale: staleOld }));
      /* the old build writes again: they flip back by themselves */
      await editTitle(D, 'a2', 'Old build writes again');
      await settle(cloud, devs);
      await waitTitle(three, 'a2', 'Old build writes again');
      await Promise.all(three.map((d) => on(d, () => { window._s1Now = () => Date.now(); })));
      mark = cloud.log.length;
      await editTitle(C, 'a3', 'Edited on C, old wrote again');
      await settle(cloud, devs);
      const gOld3 = await waitTitle([D], 'a3', 'Edited on C, old wrote again');
      check(gOld3 && blobWrites(cloud, mark).length > 0, '51t an old build writes again: the v04.90 devices flip back to writing the blob, and it reaches the old build', JSON.stringify({ gOld3, blobDocs: blobWrites(cloud, mark).length }));
      check(devs.every((d) => d.errors.length === 0), '51t no page errors', devs.flatMap((d) => d.errors).slice(0, 3).join(' · '));
      for (const d of devs) await d.ctx.close();
      await oldSrv.close();
    }
  }

  /* ── 51u: recs writes refused while the blob is off → the device falls back to the blob, one toast, two devices converge ── */
  if (want('51u')) {
    const { cloud, devs, A, B } = await trio();
    await warmAll(cloud, devs);
    const planA = await on(A, () => _s1Plan());
    cloud.refuse = ['/recs/', '/recparts/'];
    const mark = cloud.log.length;
    await editTitle(A, 'a1', 'A edit 1, recs refused');
    const g1 = await waitTitle([B], 'a1', 'A edit 1, recs refused');
    await editTitle(B, 'a2', 'B edit, recs refused');
    const g2 = await waitTitle([A], 'a2', 'B edit, recs refused');
    for (let i = 2; i <= 4; i++) { await editTitle(A, 'a1', 'A edit ' + i + ', recs refused'); await sleep(1200); }
    const g3 = await waitTitle([B], 'a1', 'A edit 4, recs refused');
    await settle(cloud, devs);
    const toastsA = await toastsOf(A, /per-note copy/), alarmsA = await toastsOf(A, /NOT syncing|Sync error|REJECTING|Still cannot/), alarmsB = await toastsOf(B, /NOT syncing|Sync error|REJECTING|Still cannot/);
    const dots = await Promise.all([A, B].map((d) => on(d, () => document.getElementById('sync-dot').textContent)));
    const pf = await Promise.all([A, B].map((d) => on(d, () => _pushFailures)));
    const unmarked = blobWrites(cloud, mark).length > 0 && cloud.store.get(NB).s1c === '04.90' && cloud.store.get(NB).s1fb === 1;   /* v04.90 review: a fallback is s1c + s1fb */
    check(planA === 'recs' && g1 && g2 && g3 && unmarked, '51u recs refused with the blob off: the device falls back to the blob (written UNMARKED), and the two devices converge, an edit each way', JSON.stringify({ planBefore: planA, g1, g2, g3, mainMarked: cloud.store.get(NB).s1c }));
    check(toastsA.length === 1 && alarmsA.length === 0 && alarmsB.length === 0 && dots.every((t) => !/err/i.test(t)) && pf.every((n) => n === 0),
      '51u …with ONE toast about it (not a stream), no sync alarm, the dot not in error, no push failures', JSON.stringify({ toastsA, alarmsA, alarmsB, dots, pf }));
    check(devs.every((d) => d.errors.length === 0), '51u no page errors', devs.flatMap((d) => d.errors).slice(0, 3).join(' · '));
    for (const d of devs) await d.ctx.close();
  }

  /* ── 51v: the reader is stuck on a transient error and an edit is waiting → within the bound the edit leaves through the blob, and the dot shows the problem ── */
  if (want('51v')) {
    const { cloud, devs, A, B, C } = await trio();
    await warmAll(cloud, devs);
    const bound = await on(A, () => _S1_GATE_MAX_MS);
    await on(A, () => {
      _S1_GATE_MAX_MS = 5000;
      _s1ReadStop(); _s1ReadStart = async () => {};
      const st = _s1Stat.rd; st.on = false; st.reason = 'error: unavailable'; st.perm = false; _s1RdCaught = false;
    });
    const mark = cloud.log.length;
    const t0 = Date.now();
    await editTitle(A, 'a1', 'Edit while the reader is stuck');
    await sleep(2500);
    const early = cloud.log.slice(mark).filter((o) => o.dev === 'phone').length;   /* inside the bound: nothing has left A */
    const got = await waitTitle([B, C], 'a1', 'Edit while the reader is stuck', 30000);
    const ms = Date.now() - t0;
    await sleep(500);
    const dotA = await on(A, () => ({ cls: document.getElementById('sync-dot').className, txt: document.getElementById('sync-dot').textContent, title: document.getElementById('sync-dot').title }));
    check(bound === 120000 && early === 0 && got && blobWrites(cloud, mark).length > 0 && cloud.store.get(NB).s1fb === 1 && ms < 30000,
      '51v the reader is stuck (transient error) and an edit waits: nothing is written ahead of the reader inside the bound (default 2 min, shortened to 5 s here), then the edit leaves through the blob (unmarked) and reaches the others', JSON.stringify({ defaultBoundMs: bound, writesInsideBound: early, got, ms, blobDocs: blobWrites(cloud, mark).length }));
    check(/sd-err/.test(dotA.cls) && /Err/.test(dotA.txt), '51v …and the sync dot on the stuck device shows the problem', JSON.stringify(dotA));
    check(devs.every((d) => d.errors.length === 0), '51v no page errors', devs.flatMap((d) => d.errors).slice(0, 3).join(' · '));
    for (const d of devs) await d.ctx.close();
  }

  /* ── 51w: an own echo causes no merge; a real remote change still merges ── */
  if (want('51w')) {
    const { cloud, devs, A, B, C } = await trio();
    await warmAll(cloud, devs);
    await Promise.all(devs.map((d) => on(d, () => { window.__mrg = 0; const o = _mergeRemoteIn; _mergeRemoteIn = function (...a) { window.__mrg++; return o.apply(this, a); }; })));
    for (let i = 1; i <= 3; i++) { await editTitle(A, 'a1', 'Echo test ' + i); await settle(cloud, devs); }
    const got = await waitTitle([B, C], 'a1', 'Echo test 3');
    const m = await Promise.all(devs.map((d) => on(d, () => window.__mrg)));
    check(got && m[0] === 0 && m[1] >= 1 && m[2] >= 1,
      '51w three own edits on A: A\'s own recs come back through its listener and cause NO merge, while B and C (a real remote change) do merge', JSON.stringify({ mergesA: m[0], mergesB: m[1], mergesC: m[2], got }));
    check(devs.every((d) => d.errors.length === 0), '51w no page errors', devs.flatMap((d) => d.errors).slice(0, 3).join(' · '));
    for (const d of devs) await d.ctx.close();
  }

  /* ── 51x: the dirty-set snapshot misses a change on purpose; the periodic full snapshot writes it ── */
  if (want('51x')) {
    const { cloud, devs, A, B } = await trio();
    await warmAll(cloud, devs);
    const recTitle = () => { const r = cloud.store.get(NB + '/recs/articles~a2'); return r && r.j ? JSON.parse(r.j).title : null; };
    const before = recTitle();
    await on(A, () => {
      const a = DB.articles.find((x) => x.id === 'a2'); a.title = 'Changed without being stamped';   /* as a buggy future function would: no updatedAt, no mark … */
      _seedRecSnap(true);                                                                              /* … and the sweep's baseline already holds it */
      persist(); flushPendingPush();
    });
    await settle(cloud, devs);
    const missed = recTitle() === before;
    const lastFull = await on(A, () => { _S1_FULL_MS = 3000; _s1LastFull = Date.now(); return _s1LastFull; });
    const t0 = Date.now(); let wrote = false;
    while (Date.now() - t0 < 25000) { if (recTitle() === 'Changed without being stamped') { wrote = true; break; } await sleep(300); }
    check(before && missed && wrote, '51x a change the dirty set never saw is NOT written by the next push, and IS written by the periodic full snapshot within its interval (3 s here, 1 h by default)', JSON.stringify({ before, missedByPush: missed, writtenByFull: wrote, afterMs: Date.now() - t0, defaultMs: 3600000 }));
    check(devs.every((d) => d.errors.length === 0), '51x no page errors', devs.flatMap((d) => d.errors).slice(0, 3).join(' · '));
    for (const d of devs) await d.ctx.close();
  }

  /* ── 51y: a v04.90 FALLBACK blob must not count as "an older build is active" (Architect review of v04.90).
        Three v04.90 devices, no older build ever seen. Force fallbacks: the gate shut under plan 'both', the gate bound
        (shortened) and a recs refusal switched on then off. The group must then be on plan 'recs' (zero blob writes) within one
        push after the last fallback. Separately a real unmarked writer (v04.89, as 51t) still keeps the group on 'both'
        even after fallbacks. Unpatched (fallback written unmarked, no s1fb) the group stays on 'both'. ── */
  if (want('51y')) {
    const { cloud, devs, A, B, C } = await trio();
    await warmAll(cloud, devs);
    const plans = () => Promise.all(devs.map((d) => on(d, () => _s1Plan())));
    const p0 = await plans();
    const sav = () => on(A, () => { window.__o = { plan: _s1Plan, gate: _s1WriteGate }; });
    const rest = () => on(A, () => { _s1Plan = window.__o.plan; _s1WriteGate = window.__o.gate; });
    const fb = () => { const m = cloud.store.get(NB); return m && m.s1c === '04.90' && m.s1fb === 1; };
    await sav();
    /* (1) the gate shut under plan 'both' */
    let mark = cloud.log.length;
    await on(A, () => { _s1Plan = () => 'both'; _s1WriteGate = () => false; });
    await editTitle(A, 'a1', 'Fallback 1, gate shut under both');
    await settle(cloud, devs);
    const f1 = fb() && blobWrites(cloud, mark).length > 0 && await waitTitle([B, C], 'a1', 'Fallback 1, gate shut under both');
    await rest();
    /* (2) the gate bound (3 s here) */
    mark = cloud.log.length;
    await on(A, () => { _S1_GATE_MAX_MS = 3000; _s1WriteGate = () => false; });
    await editTitle(A, 'a1', 'Fallback 2, gate bound');
    const f2 = await waitTitle([B, C], 'a1', 'Fallback 2, gate bound', 30000);
    await settle(cloud, devs);
    const f2fb = fb() && blobWrites(cloud, mark).length > 0;
    await rest();
    /* (3) a recs refusal on, then off */
    mark = cloud.log.length;
    for (const d of devs) await on(d, () => { _S1_DENY_RETRY_MS = 4000; });   /* the real cool-down is 10 minutes */
    cloud.refuse = ['/recs/', '/recparts/'];
    await editTitle(A, 'a1', 'Fallback 3, recs refused');
    const f3 = await waitTitle([B, C], 'a1', 'Fallback 3, recs refused', 30000);
    await settle(cloud, devs);
    const f3fb = fb() && blobWrites(cloud, mark).length > 0;
    cloud.refuse = [];
    await sleep(9000);   /* one cool-down, plus the reader coming back (no reload) */
    await settle(cloud, devs);
    const mdLast = { ...cloud.store.get(NB) };
    check(f1 && f2 && f2fb && f3 && f3fb && !('s1o' in mdLast) && !(mdLast.s1o > 0),
      '51y three v04.90 devices, no older build ever seen: three kinds of fallback each write a blob carrying s1c AND s1fb, none of them sets s1o, and every edit reaches the others', JSON.stringify({ planBefore: p0, f1, f2, f2fb, f3, f3fb, s1o: mdLast.s1o, s1c: mdLast.s1c, s1fb: mdLast.s1fb }));
    /* the next push from another device: plan 'recs', zero blob writes */
    const pl = await plans();
    mark = cloud.log.length;
    await editTitle(B, 'a2', 'After the last fallback');
    const gAfter = await waitTitle([A, C], 'a2', 'After the last fallback');
    await settle(cloud, devs);
    const bAfter = blobWrites(cloud, mark).length, rAfter = recWrites(cloud, mark).length;
    check(pl.every((p) => p === 'recs') && gAfter && bAfter === 0 && rAfter > 0,
      '51y …and the group is on plan "recs" within one push after the last fallback: the next edit writes recs only (zero blob docs) and still reaches the others', JSON.stringify({ plans: pl, gAfter, blobDocs: bAfter, recs: rAfter }));
    check(devs.every((d) => d.errors.length === 0), '51y no page errors', devs.flatMap((d) => d.errors).slice(0, 3).join(' · '));
    for (const d of devs) await d.ctx.close();
  }

  /* ── 51y2: a real unmarked writer (the v04.89 build) still keeps the group on 'both' — also after v04.90 fallbacks ── */
  if (want('51y')) {
    let oldSrv = null, why = '';
    try {
      const dir = mkdtempSync(join(tmpdir(), 'siyagah-old-'));
      for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', '2a5d1ca:' + f], { cwd: ROOT, maxBuffer: 1 << 28 })); } catch (e) { if (f === 'index.html') throw e; } }
      oldSrv = await serve(dir);
    } catch (e) { why = String(e.message || e).slice(0, 200); }
    if (!oldSrv) check(false, '51y the v04.89 build could not be read from git (commit 2a5d1ca)', why);
    else {
      const { cloud, devs: three, A, B, C } = await trio();
      const D = await addDevice(browser, oldSrv.base, cloud, 'old', { width: 1440, height: 900 }, false, seedDB());
      const devs = [...three, D];
      await settle(cloud, devs);
      await editTitle(D, 'a2', 'Old build writes');
      await settle(cloud, devs);
      await waitTitle(three, 'a2', 'Old build writes');
      /* two v04.90 fallbacks in a row, from different devices */
      await on(A, () => { window.__o = { plan: _s1Plan }; _s1Plan = () => 'blob'; });
      await editTitle(A, 'a1', 'Fallback while old is active');
      await settle(cloud, devs);
      await on(A, () => { _s1Plan = window.__o.plan; });
      const m1 = { ...cloud.store.get(NB) };
      const mark = cloud.log.length;
      await editTitle(B, 'a3', 'B after the fallback, old still active');
      await settle(cloud, devs);
      const gOld = await waitTitle([D], 'a3', 'B after the fallback, old still active');
      const pl = await Promise.all(three.map((d) => on(d, () => _s1Plan())));
      check(m1.s1fb === 1 && m1.s1o > 0 && gOld && blobWrites(cloud, mark).length > 0 && pl.every((p) => p === 'both'),
        '51y a v04.90 fallback while an older build is active keeps the window (s1o carried): the next push still writes recs AND the blob, the old build receives it', JSON.stringify({ s1fb: m1.s1fb, s1o: m1.s1o, gOld, blobDocs: blobWrites(cloud, mark).length, plans: pl }));
      check(devs.every((d) => d.errors.length === 0), '51y2 no page errors', devs.flatMap((d) => d.errors).slice(0, 3).join(' · '));
      for (const d of devs) await d.ctx.close();
      await oldSrv.close();
    }
  }

  /* ── --measure9k (v04.90, not a check): the owner's import size — 9,000 notes of ~5 KB (~45 MB) — and three
        devices. (a) one edited note pushed: time, bytes, writes; (b) one edited note received by another device:
        write → on screen; (c) the merge's main-thread time; (d) a fresh device's first full download from recs.
        Each on the 1440 laptop and on a 390 phone with the CPU throttled ×4 (Emulation.setCPUThrottlingRate). ── */
  if (process.argv.includes('--measure9k')) {
    const N = 9000, out = {};
    const M = (k, v) => { out[k] = v; console.log('M9K ' + k + ' ' + JSON.stringify(v)); };
    const cloud = makeCloud();
    const bytesSince = (from) => cloud.log.slice(from).filter((o) => o.t === 'set').reduce((a, o) => a + o.bytes, 0);
    const setsSince = (from) => cloud.log.slice(from).filter((o) => o.t === 'set');
    const L = await addDevice(browser, srv.base, cloud, 'laptop', { width: 1440, height: 900 }, false, seedDB());
    await sleep(1500);
    const tSeed = Date.now();
    await on(L, (n) => {
      const now = new Date().toISOString(), s = 'The quick brown fox jumps over the lazy dog. ';
      for (let i = 0; i < n; i++) DB.articles.push({ id: 'n' + i, title: 'Note ' + i, content: '<p>' + s.repeat(110) + i + '</p>', folderIds: ['f1'], tags: [], createdAt: now, updatedAt: now, kind: 'general' });
      persist(); flushPendingPush();
    }, N);
    const okSeed = await waitSeeded(cloud, L, 900000);
    M('seed', { notes: N, ok: okSeed, ms: Date.now() - tSeed, docs: setsSince(0).length, MB: +(bytesSince(0) / 1048576).toFixed(1), commits: cloud.commits, blobDocs: blobWrites(cloud, 0).length });
    /* (d) a fresh device's first full download from recs */
    const fresh = async (name, vp, touch, throttle) => {
      const t0 = Date.now();
      const d = await addDevice(browser, srv.base, cloud, name, vp, touch, seedDB('2026-01-01T00:00:00.000Z'), { throttle });
      let ok = false;
      while (Date.now() - t0 < 900000) { if (await on(d, (n) => DB.articles.length >= n && !_pullInFlight && !_s1RepUnmerged && !_s1RecsMergeQueued, N).catch(() => false)) { ok = true; break; } await sleep(250); }
      const ms = Date.now() - t0;
      const eq = ok ? (await on(d, () => DB.articles.length)) : -1;
      M('fresh_' + name, { ok, ms, readsDocs: d.qDelivered, articlesOnDevice: eq });
      return d;
    };
    const F1 = await fresh('freshLaptop', { width: 1440, height: 900 }, false, 0);
    const F2 = await fresh('freshPhoneX4', { width: 390, height: 844 }, true, 4);
    await settle(cloud, [L, F1, F2], 300000);
    for (const d of [L, F1, F2]) await on(d, () => { window.__mrg = []; const o1 = _mergeRemoteIn, o2 = _s1AssembleRep; window.__asm = []; _mergeRemoteIn = function (...a) { const t = performance.now(); try { return o1.apply(this, a); } finally { window.__mrg.push(performance.now() - t); } }; _s1AssembleRep = function () { const t = performance.now(); try { return o2.apply(this); } finally { window.__asm.push(performance.now() - t); } }; });
    /* (a) + (b) + (c): an edit on each of the three devices in turn, received by the other two */
    for (const [src, name] of [[L, 'laptop'], [F2, 'phoneX4']]) {
      const others = [L, F1, F2].filter((x) => x !== src);
      const mark = cloud.log.length, tEdit = Date.now();
      const tag = 'Measured edit from ' + name + ' ' + tEdit;
      const inPage = await on(src, (t) => { const t0 = performance.now(); const a = DB.articles.find((x) => x.id === 'n42'); a.title = t; a.updatedAt = new Date().toISOString(); persist(); const t1 = performance.now(); return { persistMs: t1 - t0 }; }, tag);
      await on(src, () => { window.__pp = performance.now(); flushPendingPush(); });
      let tCommit = null; const tw = Date.now();
      while (Date.now() - tw < 120000) { const w = setsSince(mark); if (w.length) { tCommit = w[w.length - 1].ms; break; } await sleep(20); }
      await quiet(cloud, src, 120000);
      const pushDone = await on(src, () => performance.now() - window.__pp);
      const w = setsSince(mark);
      M('push_' + name, { editToCommitMs: tCommit ? tCommit - tEdit : null, pushMainThreadAndWaitMs: Math.round(pushDone), persistMs: Math.round(inPage.persistMs), writes: w.length, bytes: w.reduce((a, o) => a + o.bytes, 0), docs: w.map((o) => o.p.slice(NB.length + 1)), blobDocs: blobWrites(cloud, mark).length });
      for (const d of others) {
        const t0 = Date.now(); let got = false;
        while (Date.now() - t0 < 120000) { if (await on(d, (t) => (DB.articles.find((x) => x.id === 'n42') || {}).title === t, tag).catch(() => false)) { got = true; break; } await sleep(20); }
        const onScreenMs = got && tCommit ? Date.now() - tCommit : null;
        await settle(cloud, [L, F1, F2], 120000);
        const mrg = await on(d, () => ({ merges: window.__mrg.map((x) => Math.round(x)), assembleMs: window.__asm.map((x) => Math.round(x)) }));
        M('receive_' + name + '_on_' + d.name, { got, commitToDbMs: onScreenMs, ...mrg });
      }
    }
    console.log('M9K_DONE ' + JSON.stringify(out));
    for (const d of [L, F1, F2]) await d.ctx.close();
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
