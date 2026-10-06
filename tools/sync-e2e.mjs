#!/usr/bin/env node
/* tools/sync-e2e.mjs — v04.73: three real devices, one cloud.

   tools/sync-audit.mjs (v04.68) proves mergeDB() settles every kind of change
   correctly, one function call at a time. This proves the WHOLE sync path does,
   end to end, across the three platforms the owner uses at once:

     phone   390×844, touch   ┐
     tablet  820×1180, touch  ├─ three separate browser contexts (their own
     laptop  1440×900         ┘  localStorage + IndexedDB), each running the
                                 real app, signed in to the same notebook.

   The Firebase SDK is the only thing replaced. The three gstatic scripts the
   app loads are answered with a small fake SDK (below) that forwards every
   read, write and listener to ONE store held here in Node — so the real
   initAuth() → initSync() → onSnapshot → _pullRemote() → mergeDB() → push
   timers → _doPush() → _writeCloudDB() chain runs on every device, exactly
   as it does against Firestore. The fake keeps Firestore's own rules that
   matter here: 1 MiB per document, 10 MiB per commit, a write made while
   offline waits and lands when the device reconnects (it does not fail),
   and a server read while offline fails with code 'unavailable'.

   Exit code: 0 only if every check passes.  Run: node tools/sync-e2e.mjs */
import { playwright, serve, seedDB } from './harness.mjs';
import { assembleRecs, canonDB, diffDB } from './s1-assemble.mjs';

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
    currentUser: { uid: 'u-e2e' }, onAuthStateChanged(cb){ setTimeout(() => cb({ uid: 'u-e2e', email: 'owner@example.invalid' }), 30); return () => {}; } }; };
  fb.auth.Auth = { Persistence: { LOCAL: 'local' } };
  fb.auth.GoogleAuthProvider = function(){};
})();`;

const MAX_DOC = 1024 * 1024, MAX_REQ = 10 * 1024 * 1024;
const store = new Map();
const devices = [];
let commitCount = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function deliverTo(d, path) {
  if (d.offline || !d.listens.has(path)) return;
  const data = store.has(path) ? store.get(path) : null;
  setTimeout(() => { d.page.evaluate(([p, x]) => window.__fsDeliver && window.__fsDeliver(p, x), [path, data]).catch(() => {}); },
    40 + Math.floor(Math.random() * 160));
}
function applyCommit(ops) {
  let total = 0;
  for (const o of ops) if (o.t === 'set') {
    const s = Buffer.byteLength(JSON.stringify(o.d));
    if (s > MAX_DOC) return { error: { code: 'invalid-argument', message: 'document over 1 MiB at ' + o.p } };
    total += s;
  }
  if (total > MAX_REQ) return { error: { code: 'invalid-argument', message: 'request over 10 MiB' } };
  const now = Date.now();
  for (const o of ops) {
    if (o.t === 'del') { store.delete(o.p); continue; }
    const d = JSON.parse(JSON.stringify(o.d));
    for (const k of Object.keys(d)) if (d[k] && d[k].__sts) d[k] = now;
    store.set(o.p, d);
  }
  commitCount++;
  const touched = new Set(ops.map((o) => o.p));
  for (const dv of devices) for (const p of touched) deliverTo(dv, p);
  return {};
}

async function addDevice(browser, base, name, viewport, touch, seed, cfg) {
  const ctx = await browser.newContext(touch ? { viewport, hasTouch: true, isMobile: true } : { viewport });
  await ctx.route('**gstatic.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_SDK }));
  for (const p of ['**googleapis.com/**', '**firebaseapp.com/**', '**firebaseio.com/**']) await ctx.route(p, (r) => r.abort());
  await ctx.addInitScript(([db, c]) => {
    try {
      if (!localStorage.getItem('my-notebook-v1')) localStorage.setItem('my-notebook-v1', JSON.stringify(db));
      localStorage.setItem('siyagah-sync-v1', JSON.stringify(c));
    } catch {}
  }, [seed, cfg]);
  const d = { name, ctx, offline: false, listens: new Set(), errors: [], pending: [] };
  await ctx.exposeBinding('__fsGet', async (_s, path, src) => {
    if (d.offline && src !== 'cache') return { error: { code: 'unavailable', message: 'Failed to get document because the client is offline.' } };
    await sleep(20 + Math.random() * 60);
    return { data: store.has(path) ? store.get(path) : null };
  });
  await ctx.exposeBinding('__fsListen', async (_s, path) => { d.listens.add(path); deliverTo(d, path); });
  await ctx.exposeBinding('__fsCommit', async (_s, ops) => {
    /* Offline: the real SDK queues the write and resolves it once the
       server has it — it does not fail. So does this. */
    while (d.offline) await sleep(100);
    await sleep(20 + Math.random() * 60);
    /* v04.82 — `dieAfter`: let this many more commits land, then hang every
       later one forever, as a phone frozen or killed mid-upload does. */
    if (d.dieAfter != null) { if (d.dieAfter <= 0) await new Promise(() => {}); d.dieAfter--; }
    return applyCommit(ops);
  });
  const page = await ctx.newPage();
  d.page = page;
  page.on('pageerror', (e) => d.errors.push('pageerror: ' + e));
  page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR_FAILED/.test(m.text())) d.errors.push('console: ' + m.text()); });
  await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree'));
  await hookToasts(page);
  devices.push(d);
  return d;
}
async function hookToasts(page) {
  await page.evaluate(() => {
    window.__toasts = [];
    const _t = toast;
    toast = (m, ...rest) => { window.__toasts.push(String(m)); try { return _t(m, ...rest); } catch (e) {} };
  });
}
async function reopen(d) {
  await d.page.reload({ waitUntil: 'domcontentloaded' });
  await d.page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree'));
  await hookToasts(d.page);
}
/* The notebook the cloud's main doc currently names, as text. v04.82 chunks
   are named by generation ("<g>_<i>"); a main doc without `g` names the old
   numbered chunks. */
function cloudText() {
  const m = store.get('notebooks/nb-e2e'); if (!m || !m.n) return '';
  const id = (i) => 'notebooks/nb-e2e/chunks/' + (m.g ? m.g + '_' + i : String(i));
  let b64 = ''; for (let i = 0; i < m.n; i++) b64 += (store.get(id(i)) || {}).p || '';
  try { return Buffer.from(b64, 'base64').toString('utf8'); } catch { return ''; }
}

async function setOffline(d, off) {
  d.offline = off;
  await d.ctx.setOffline(off);
  if (!off) for (const p of d.listens) deliverTo(d, p);
}

/* What the owner would call "the same notebook": every note's words, title,
   tags, folders and flags; every folder's name and place; sections; Trash;
   the theme preset. Deliberately NOT the stamps — those are how sync gets
   there, this is whether it did. */
const FP = () => {
  const s = (a, f) => (a || []).map(f).sort((x, y) => (x < y ? -1 : 1)).join('\n');
  return [
    s(DB.articles, (a) => JSON.stringify([a.id, a.title, a.content, (a.tags || []).slice().sort(), (a.folderIds || []).slice().sort(), !!a.archived, !!a.favourite, !!a.pinned, a.kind || ''])),
    s(DB.folders, (f) => JSON.stringify([f.id, f.name, f.parentId || null, f.order])),
    s(DB.sections, (x) => JSON.stringify([x.id, x.name])),
    s(DB.trash, (t) => JSON.stringify([t.id, t.type, t.item && t.item.id])),
    JSON.stringify((DB.theme && DB.theme.preset) || ''),
  ].join('\n#\n');
};

async function converge(label, ms = 20000) {
  const t0 = Date.now();
  let fps = [];
  while (Date.now() - t0 < ms) {
    fps = await Promise.all(devices.map((d) => d.page.evaluate(FP).catch(() => 'x')));
    if (fps.every((f) => f === fps[0])) {
      await sleep(1500);
      const again = await Promise.all(devices.map((d) => d.page.evaluate(FP).catch(() => 'x')));
      if (again.every((f) => f === again[0]) && again[0] === fps[0]) return { ok: true, ms: Date.now() - t0 };
    }
    await sleep(300);
  }
  return { ok: false, ms: Date.now() - t0 };
}

const results = [];
function check(ok, label, detail = '') {
  results.push({ ok, label });
  console.log((ok ? '  ok   ' : ' FAIL  ') + label + (detail ? '\n         ' + detail : ''));
}
const on = (d, fn, arg) => d.page.evaluate(fn, arg);
const has = (d, id, txt) => on(d, ([i, t]) => (DB.articles.find((a) => a.id === i)?.content || '').includes(t), [id, txt]);
const alarms = (d) => on(d, () => window.__toasts.filter((t) => /NOT syncing|Sync error|REJECTING|Can.t reach/.test(t)));
const dot = (d) => on(d, () => document.getElementById('sync-dot')?.textContent || '');

async function typeInto(d, aid, words) {
  await on(d, (id) => { ST.folder = 'f1'; ST.article = id; render(); if (window.innerWidth < 1200) showPane('p3'); startEdit(); }, aid);
  await d.page.waitForTimeout(400);
  const ed = d.page.locator('#ed');
  await ed.click();
  await d.page.keyboard.press('End');
  await d.page.keyboard.press('Control+End');
  await d.page.keyboard.type(' ' + words, { delay: 15 });
}

const pw = await playwright();
const srv = await serve();
const browser = await pw.chromium.launch();
const seed = seedDB('2026-09-01T00:00:00.000Z');
const cfg = { firebaseConfig: { apiKey: 'fake', projectId: 'fake', authDomain: 'fake', appId: 'fake' }, notebookId: 'nb-e2e' };
let exitCode = 0;
try {
  const phone = await addDevice(browser, srv.base, 'phone', { width: 390, height: 844 }, true, seed, cfg);
  const tablet = await addDevice(browser, srv.base, 'tablet', { width: 820, height: 1180 }, true, seed, cfg);
  const laptop = await addDevice(browser, srv.base, 'laptop', { width: 1440, height: 900 }, false, seed, cfg);
  const all = [phone, tablet, laptop];

  /* 0. All three sign in and go Live; the laptop publishes the notebook. */
  await sleep(1500);
  await on(laptop, () => pushToCloud());
  let c = await converge('boot');
  const dots0 = await Promise.all(all.map(dot));
  check(c.ok && dots0.every((t) => /Live/.test(t)), 'boot: all three devices signed in, Live, holding the same notebook',
    JSON.stringify({ dots: dots0, ms: c.ms, docs: store.size }));

  /* 1. Typing on the phone reaches the tablet and the laptop, unprompted. */
  await typeInto(phone, 'a1', 'typed-on-phone');
  c = await converge('phone-type');
  check(c.ok && await has(tablet, 'a1', 'typed-on-phone') && await has(laptop, 'a1', 'typed-on-phone'),
    'phone → tablet + laptop: words typed in a note on the phone arrive on both', `${c.ms}ms`);
  await on(phone, () => { try { cancelEdit(); } catch (e) {} });

  /* 2. The tablet creates a folder and files a note into it. */
  await on(tablet, () => {
    const now = new Date().toISOString();
    DB.folders.push({ id: 'f-tab', name: '(003) From the tablet', parentId: null, order: 3, sectionId: 'sec-1', updatedAt: now });
    const a = DB.articles.find((x) => x.id === 'a2'); a.folderIds = ['f-tab'];
    persist(); render();
  });
  c = await converge('tablet-folder');
  const folderOk = await Promise.all([phone, laptop].map((d) => on(d, () => DB.folders.some((f) => f.id === 'f-tab')
    && (DB.articles.find((a) => a.id === 'a2')?.folderIds || []).includes('f-tab'))));
  check(c.ok && folderOk.every(Boolean), 'tablet → phone + laptop: a new folder, and a note filed into it, arrive on both', `${c.ms}ms`);

  /* 3. The laptop deletes a note (to Trash). It is gone everywhere, and in Trash everywhere. */
  await on(laptop, () => deleteNote('a3'));
  c = await converge('laptop-delete');
  const delOk = await Promise.all([phone, tablet].map((d) => on(d, () => !DB.articles.some((a) => a.id === 'a3')
    && (DB.trash || []).some((t) => t.item && t.item.id === 'a3'))));
  check(c.ok && delOk.every(Boolean), 'laptop → phone + tablet: a deleted note leaves every device and sits in every Trash', `${c.ms}ms`);

  /* 4. Two devices edit two DIFFERENT notes at the same moment. Both survive. */
  await Promise.all([
    on(phone, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.content += '<p>phone-same-moment</p>'; persist(); }),
    on(laptop, () => { const a = DB.articles.find((x) => x.id === 'a2'); a.content += '<p>laptop-same-moment</p>'; persist(); }),
  ]);
  c = await converge('concurrent');
  const both = await Promise.all(all.map(async (d) => (await has(d, 'a1', 'phone-same-moment')) && (await has(d, 'a2', 'laptop-same-moment'))));
  if (!c.ok || !both.every(Boolean)) {
    const cloud = (() => { try { const d = JSON.parse(cloudText()); return { a1: /phone-same-moment/.test(d.articles.find((a) => a.id === 'a1')?.content), a2: /laptop-same-moment/.test(d.articles.find((a) => a.id === 'a2')?.content) }; } catch (e) { return String(e); } })();
    const per = await Promise.all(all.map(async (d) => ({ n: d.name, a1: await has(d, 'a1', 'phone-same-moment'), a2: await has(d, 'a2', 'laptop-same-moment'),
      st: await on(d, () => ({ a1: DB.articles.find((a) => a.id === 'a1')?.updatedAt, a2: DB.articles.find((a) => a.id === 'a2')?.updatedAt, dot: document.getElementById('sync-dot')?.textContent, digest: _syncDigest(DB).length })) })));
    console.log('DEBUG concurrent', JSON.stringify({ cloud, per, main: store.get('notebooks/nb-e2e'), commits: commitCount }, null, 1));
  }
  check(c.ok && both.every(Boolean), 'phone + laptop edit two different notes at the same moment: both edits reach all three devices', `${c.ms}ms`);

  /* 4b. The same, forced into the SAME millisecond on both devices' clocks —
         the case the natural race above only hits sometimes. Up to v04.72 a
         push's version was Date.now(), so the two pushes carried the same
         version and the laptop skipped the phone's write as its own echo. */
  const FIXED = Date.now() + 5000;
  await Promise.all([phone, laptop].map((d) => on(d, (t) => { window.__realNow = Date.now; Date.now = () => t; }, FIXED)));
  await Promise.all([
    on(phone, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.content += '<p>phone-same-ms</p>'; persist(); flushPendingPush(); }),
    on(laptop, () => { const a = DB.articles.find((x) => x.id === 'a2'); a.content += '<p>laptop-same-ms</p>'; persist(); flushPendingPush(); }),
  ]);
  await sleep(1500);
  await Promise.all([phone, laptop].map((d) => on(d, () => { Date.now = window.__realNow; })));
  c = await converge('same-ms');
  const sameMs = await Promise.all(all.map(async (d) => (await has(d, 'a1', 'phone-same-ms')) && (await has(d, 'a2', 'laptop-same-ms'))));
  check(c.ok && sameMs.every(Boolean), 'phone + laptop push in the SAME millisecond: neither mistakes the other\'s write for its own, both edits reach all three', `${c.ms}ms · ${JSON.stringify(sameMs)}`);

  /* 5. The SAME note edited on two devices, the laptop a second later: the newer edit wins everywhere. */
  await on(tablet, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.title = 'Title from the tablet'; persist(); });
  await sleep(1100);
  await on(laptop, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.title = 'Title from the laptop'; persist(); });
  c = await converge('same-note');
  const titles = await Promise.all(all.map((d) => on(d, () => DB.articles.find((a) => a.id === 'a1')?.title)));
  check(c.ok && titles.every((t) => t === 'Title from the laptop'), 'the same note changed on tablet then laptop: the newer change wins on all three', JSON.stringify(titles));

  /* 6. A setting (the colour preset) changed on the tablet reaches the others. */
  await on(tablet, () => { DB.theme.preset = 'ocean'; persist(); });
  c = await converge('theme');
  const presets = await Promise.all(all.map((d) => on(d, () => DB.theme.preset)));
  check(c.ok && presets.every((p) => p === 'ocean'), 'tablet → phone + laptop: a setting (colour preset) arrives on both', JSON.stringify(presets));

  /* 7. The phone goes OFFLINE, writes, and the laptop writes meanwhile. The
        phone says Offline, raises no alarm, and when it reconnects everything
        meets on all three. */
  await setOffline(phone, true);
  await typeInto(phone, 'a2', 'written-offline');
  await on(laptop, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.content += '<p>laptop-while-phone-offline</p>'; persist(); });
  await sleep(6000);
  const offDot = await dot(phone), offAlarm = await alarms(phone);
  check(offAlarm.length === 0, 'phone offline for 6s while both sides write: no sync alarm on the phone', JSON.stringify({ offDot, offAlarm }));
  await setOffline(phone, false);
  await on(phone, () => { try { cancelEdit(); } catch (e) {} });
  c = await converge('offline-rejoin', 30000);
  const rejoin = await Promise.all(all.map(async (d) => (await has(d, 'a2', 'written-offline')) && (await has(d, 'a1', 'laptop-while-phone-offline'))));
  check(c.ok && rejoin.every(Boolean), 'phone back online: its offline writing reaches tablet + laptop, and the laptop\'s change reaches the phone', `${c.ms}ms`);

  /* 8. The phone is put in the background mid-sentence (the owner switches
        app). What was typed is sent at once, not on the next timer. */
  await typeInto(phone, 'a1', 'typed-then-backgrounded');
  const before = commitCount;
  const tHide = Date.now();
  await on(phone, () => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  let sentMs = -1;
  while (Date.now() - tHide < 3000) {
    const txt = cloudText();
    if (commitCount > before && /typed-then-backgrounded/.test(txt)) { sentMs = Date.now() - tHide; break; }
    await sleep(50);
  }
  check(sentMs >= 0 && sentMs < 1500, 'phone backgrounded right after typing: the words reach the cloud straight away', `${sentMs}ms after hiding`);
  await on(phone, () => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    try { cancelEdit(); } catch (e) {}
  });
  c = await converge('background');
  check(c.ok && await has(laptop, 'a1', 'typed-then-backgrounded'), '…and it arrives on the laptop', `${c.ms}ms`);

  /* 9. A notebook past Firestore's 10 MiB single-request limit (a 9 MB note
        on the laptop — the multi-batch write path) still reaches both. */
  await on(laptop, () => {
    const now = new Date().toISOString();
    DB.articles.push({ id: 'a-big', title: 'Huge note', content: '<p>' + 'big '.repeat(2300000) + 'END-OF-BIG</p>', folderIds: ['f1'], tags: [], createdAt: now, updatedAt: now, kind: 'general' });
    persist();
  });
  c = await converge('big', 60000);
  const chunks = (store.get('notebooks/nb-e2e') || {}).n;
  check(c.ok && await has(phone, 'a-big', 'END-OF-BIG') && await has(tablet, 'a-big', 'END-OF-BIG'),
    'laptop adds a 9 MB note (over the 10 MiB single-write limit): it reaches phone + tablet whole', `${chunks} chunks · ${c.ms}ms`);

  /* 9b. v04.82 — the owner's report (4 Oct 2026): the phone's upload of a
         notebook this size is CUT OFF after its first batch (put to sleep,
         tab killed). Up to v04.81 that left the cloud copy half new, half
         old, and every device that opened said "NOT syncing", for good. */
  phone.dieAfter = 1;
  await on(phone, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.content += '<p>phone-cut-off</p>'; persist(); flushPendingPush(); });
  await sleep(3000);
  devices.splice(devices.indexOf(phone), 1);
  await Promise.all([tablet, laptop].map(reopen));
  await sleep(12000);
  const cutAl = await Promise.all([tablet, laptop].map(alarms)), cutDots = await Promise.all([tablet, laptop].map(dot));
  check(cutAl.every((a) => a.length === 0) && cutDots.every((t) => /Live/.test(t)),
    'phone\'s upload of a 9 MB notebook cut off half-way: tablet + laptop reopen Live, with no sync alarm', JSON.stringify({ cutDots, cutAl }));
  phone.dieAfter = null;
  await reopen(phone);
  devices.push(phone);
  c = await converge('cut-off', 60000);
  check(c.ok && await has(tablet, 'a1', 'phone-cut-off') && await has(laptop, 'a1', 'phone-cut-off'),
    '…and when the phone reopens, its cut-off edit reaches tablet + laptop', `${c.ms}ms`);

  /* 9c. The cloud copy is ALREADY half-saved in the pre-v04.82 layout (the
         owner's cloud on 4 Oct 2026): numbered chunks, the first batch one
         version ahead of the rest. Opening the new build repairs it. */
  /* Quiet first: no device may still be writing when the old-layout copy is
     put in place. v04.86's second full run caught a save from 9b's merge
     landing just AFTER this setup, superseding it (so nothing was ever
     repaired) and leaving its numbered pieces behind. That is the test
     racing an in-flight push, not the app. */
  { let last = commitCount, quietSince = Date.now(); const t0 = Date.now();
    while (Date.now() - quietSince < 4000 && Date.now() - t0 < 30000) { await sleep(250); if (commitCount !== last) { last = commitCount; quietSince = Date.now(); } } }
  {
    const m = store.get('notebooks/nb-e2e');
    const parts = []; for (let i = 0; i < m.n; i++) parts.push(store.get('notebooks/nb-e2e/chunks/' + m.g + '_' + i).p);
    for (const k of [...store.keys()]) if (k.includes('/chunks/')) store.delete(k);
    const v0 = m.ver - 1000;
    parts.forEach((p, i) => store.set('notebooks/nb-e2e/chunks/' + i, { p, ver: i < 8 ? m.ver : v0 }));
    store.set('notebooks/nb-e2e', { n: m.n, ver: v0, deviceUpdatedAt: v0, updatedAt: Date.now() });
  }
  await Promise.all(all.map(reopen));
  const tFix = Date.now();
  while (Date.now() - tFix < 45000 && !(store.get('notebooks/nb-e2e') || {}).g) await sleep(250);
  const fixMs = Date.now() - tFix;
  c = await converge('legacy-torn', 60000);
  await sleep(3000);
  const tornAl = await Promise.all(all.map(alarms)), tornDots = await Promise.all(all.map(dot));
  const mFixed = store.get('notebooks/nb-e2e');
  const legacyLeft = [...store.keys()].filter((k) => /\/chunks\/\d+$/.test(k)).length;
  check(c.ok && !!mFixed.g && /phone-cut-off/.test(cloudText()) && tornAl.every((a) => a.length === 0) && tornDots.every((t) => /Live/.test(t)),
    'a cloud copy already half-saved (old layout) is repaired on opening: all three Live, no alarm, the cloud readable again',
    JSON.stringify({ repairedAfterMs: fixMs, ms: c.ms, g: !!mFixed.g, legacyLeft, tornDots, tornAl }));
  check(legacyLeft === 0, '…and the old numbered pieces are cleaned up', `${legacyLeft} left`);

  await on(laptop, () => deleteNote('a-big'));
  c = await converge('big-delete', 60000);
  check(c.ok, '…and deleting it settles on all three', `${c.ms}ms`);

  /* 10. Once everyone agrees, nobody keeps writing (no ping-pong). */
  await sleep(4000);
  const idle0 = commitCount;
  await sleep(20000);
  check(commitCount - idle0 === 0, 'converged and idle for 20s: no device writes to the cloud (no ping-pong)', `${commitCount - idle0} writes`);

  /* 10b. v04.88 (S1a) — the per-record copy beside the blob describes the
          notebook: assembled from recs (+ parts), it equals each converged
          device's DB, order-insensitive by id per array. Every device writes
          its own shadow, so wait for all of them to go quiet first. */
  {
    const t0 = Date.now(); let lastN = -1, since = Date.now();
    while (Date.now() - t0 < 30000) {
      const busy = (await Promise.all(all.map((d) => on(d, () => !!_s1Busy || !!_pushInFlight).catch(() => true)))).some(Boolean);
      if (busy || store.size !== lastN) { lastN = store.size; since = Date.now(); }
      else if (Date.now() - since > 2000) break;
      await sleep(250);
    }
    const { db: asm, missingParts } = assembleRecs(store, 'notebooks/nb-e2e');
    const per = [];
    for (const d of all) {
      const dev = await on(d, () => JSON.parse(JSON.stringify(DB)));
      const same = !!asm && missingParts === 0 && canonDB(asm) === canonDB(dev);
      per.push(same ? d.name + ':equal' : d.name + ':' + (asm ? diffDB(asm, dev) : 'no head'));
    }
    check(per.every((x) => /:equal$/.test(x)), 'S1a: the per-record cloud copy (recs) assembles to each converged device\'s notebook', JSON.stringify(per));
  }

  /* 11. Nothing alarming, nothing broken, on any device. */
  const endDots = await Promise.all(all.map(dot));
  const endAlarms = await Promise.all(all.map(alarms));
  check(endDots.every((t) => /Live/.test(t)) && endAlarms.every((a) => a.length === 0),
    'end: all three say Live, and none showed a sync alarm at any point', JSON.stringify({ endDots, endAlarms }));
  for (const d of all) {
    const errs = d.errors.filter((e) => !/chunk fetch \(server\).*offline/.test(e) && !/localStorage best-effort save failed \(IndexedDB is authoritative\): QuotaExceededError/.test(e));
    check(errs.length === 0, `${d.name}: no page errors`, errs.slice(0, 3).join(' · '));
  }
} catch (e) {
  console.log(' FAIL  sync-e2e threw: ' + (e && e.stack || e));
  results.push({ ok: false, label: 'threw' });
} finally {
  await browser.close();
  await srv.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
exitCode = failed ? 1 : 0;
process.exit(exitCode);
