#!/usr/bin/env node
/* tools/speed-j117b.mjs — v05.73, J117 part 2 (block 133). A faster start, faster big folder / note / MyWall / Smart View.
   `node tools/speed-j117b.mjs --measure [--notes=36000] [--reps=2]`  prints the before/after table (not a check).
   Checks (390 / 820 / 1440) are in the second half of this file. */
import { openApp, seedDB } from './harness.mjs';
const argv = process.argv.slice(2);
const arg = (k) => (argv.find((a) => a.startsWith('--' + k + '=')) || '').slice(k.length + 3);
const MEASURE = argv.includes('--measure');
const NOTES = +arg('notes') || 36000;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

/* a big notebook built in the page: f2 holds 2,000 notes, f1 the rest; favourites 1 in 211; Note Types spread over four kinds */
export function seedBig(page, N, F2 = 2000) {
  return page.evaluate(({ N, F2 }) => {
    const now = new Date().toISOString(), t0 = Date.now() - 4e6;
    DB.folders = [{ id: 'f1', name: '(001) A', parentId: null, order: 1, sectionId: 'sec-1', updatedAt: now }, { id: 'f2', name: '(002) B', parentId: null, order: 2, sectionId: 'sec-1', updatedAt: now }];
    DB.articles = []; DB.trash = []; DB.tombstones = [];
    const kinds = ['general', 'idea', 'task', 'quote'];
    for (let i = 0; i < N; i++) {
      const ts = []; if (i % 3 === 0) ts.push('big'); if (i % 97 === 0) ts.push('rare');
      const at = new Date(t0 + i * 400).toISOString();
      DB.articles.push({ id: 'n' + i, title: 'Note ' + i, content: '<p>Body ' + i + ' lorem ipsum dolor sit amet</p>', folderIds: [i < F2 ? 'f2' : 'f1'], tags: ts, createdAt: at, updatedAt: at, kind: kinds[i % 4], favourite: i % 211 === 0, pinned: i % 307 === 0 });
    }
    DB.globalTags = []; DB.tagColors = {}; DB.tagColorsAt = {};
    _seedThemeSnap(); _seedRecSnap(); persist(); _histReset();
    return DB.articles.length;
  }, { N, F2 });
}

/* recorded from document start of every navigation */
export const WATCH = () => {
  window.__long = []; window.__fp = null;
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push({ s: Math.round(e.startTime), d: Math.round(e.duration) }))).observe({ entryTypes: ['longtask'] }); } catch {}
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (e.name === 'first-contentful-paint' || (e.name === 'first-paint' && window.__fp === null)) window.__fp = Math.round(e.startTime); })).observe({ type: 'paint', buffered: true }); } catch {}
};

async function startMetrics(p) {
  return await p.evaluate(async () => {
    const m = (n) => { const e = performance.getEntriesByName(n)[0]; return e ? Math.round(e.startTime) : null; };
    const o = { fp: window.__fp, r0: m('siy-render0'), r1: m('siy-render1'), booted: Math.round(performance.now()) };
    const card = document.querySelector('#p2c .ar'); const t0 = performance.now();
    if (card) card.click();
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
    o.tap = Math.round(performance.now() - t0);
    return o;
  });
}

async function measureAll() {
  const rows = [];
  for (const [w, h, th, touch] of [[1440, 900, 1, false], [390, 844, 4, true]]) {
    const A = await openApp({ viewport: { width: w, height: h }, db: seedDB(), hasTouch: touch, initScript: WATCH });
    const p = A.page;
    try {
      await seedBig(p, NOTES); await sleep(1500);
      const c = await p.context().newCDPSession(p);
      if (th > 1) await c.send('Emulation.setCPUThrottlingRate', { rate: th });
      const runs = [];
      for (let i = 0; i < (+arg('reps') || 2); i++) {
        await p.reload({ waitUntil: 'domcontentloaded' });
        await p.waitForFunction(() => window.__appBooted === true, null, { timeout: 280000 });
        const s = await startMetrics(p);
        await sleep(10000);
        const long = await p.evaluate(() => window.__long);
        s.longest10 = Math.max(0, ...long.filter((x) => x.s < s.booted + 10000).map((x) => x.d));
        runs.push(s);
      }
      const ms = (k) => med(runs.map((r) => r[k] ?? 0));
      const ui = await p.evaluate(async () => {
        const T = async (f) => { await new Promise((r) => setTimeout(r, 400)); const t0 = performance.now(); f(); await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); return Math.round(performance.now() - t0); };
        const o = {};
        o.folder2000 = await T(() => selFolder('f2')); o.folder34000 = await T(() => selFolder('f1'));
        o.note = await T(() => selArt(DB.articles[40].id)); o.wall = await T(() => selFolder('sf-mywall')); o.smart = await T(() => selFolder('sf-favs'));
        return o;
      });
      const row = { vp: w + (th > 1 ? ' x' + th : ''), notes: NOTES, firstPaint: ms('fp'), render0: ms('r0'), render1: ms('r1'), booted: ms('booted'), tapOpensNote: ms('tap'), longest10s: ms('longest10'), ...ui };
      rows.push(row); console.log('measure ' + JSON.stringify(row));
    } finally { await A.close(); }
  }
  return rows;
}
if (MEASURE) { await measureAll(); process.exit(0); }

/* ───────────────────────────── the checks (block 133) ─────────────────────────────
   133a the seven deferred jobs start after boot's first render(), one at a time (≥ 300 ms apart), each within 5 s of "booted", and each
        job's own timer then really calls its tick (a wrapped tick is seen);
   133b a change made on device A before B's start — and one made right after B opened, inside the delay — reaches B with no tap;
   133c a pagehide during the delay still saves; a pagehide/visibility "hidden" fired at every moment of the start writes NOTHING to the
        device copy before _dbLoaded, and the notebook is intact after;
   133d oracle: the Smart View / Timeline counts and lists, MyWall (compact + preview, closed + open) and the screens drawn
        (#tree, #p2h, #p2c) are byte for byte what the v05.71 code draws;
   133e no page errors. */
import { report, playwright, serve } from './harness.mjs';
import { makeCloud, addDevice, on, quiet, waitSeeded } from './s1-fake.mjs';
const r = report('J117 part 2 — a faster start, faster Smart Views and MyWall');
const NAMES = ['news', 'ms', 'mp', 'mi', 'pk', 'mydb', 'mmj'];

/* the notebook the oracle draws: dates of every shape, four Note Types, favourites, pinned, archived */
function seedOracle(page, N) {
  return page.evaluate((N) => {
    const now = Date.now(), H = 36e5; const kinds = (typeof noteKinds === 'function' ? noteKinds() : []).map((k) => k.id); const K = kinds.length ? kinds : ['general'];
    DB.folders = [{ id: 'f1', name: '(001) A', parentId: null, order: 1, sectionId: 'sec-1', updatedAt: new Date().toISOString() }];
    DB.articles = []; DB.trash = []; DB.tombstones = [];
    for (let i = 0; i < N; i++) {
      let u = new Date(now - i * 2 * H).toISOString();                    /* the newest 700 or so are this month / last month */
      if (i % 7 === 1) u = new Date(now - (40 + i % 400) * 24 * H).toISOString();
      if (i % 13 === 0) u = '2026-11-03T10:00:00Z';                        /* 20 characters, no milliseconds */
      if (i % 17 === 0) u = 'garbage';
      const a = { id: 'o' + i, title: 'Note ' + i, content: '<p>Body ' + i + '</p>', folderIds: ['f1'], tags: [], createdAt: new Date(now - i * H).toISOString(), updatedAt: u, kind: K[i % K.length], favourite: i % 19 === 0, pinned: i % 23 === 0, archived: i % 29 === 0 };
      if (i % 11 === 0) delete a.updatedAt;
      DB.articles.push(a);
    }
    DB.globalTags = []; _seedThemeSnap(); _seedRecSnap(); persist(); _histReset();
    return DB.articles.length;
  }, N);
}

/* the v05.71 code, kept here as the oracle (the Timeline lists, and the number beside every Smart View) */
const OLD_TIME = `(() => {
  const now = new Date(), day = 864e5;
  const ts = (a) => new Date(a.updatedAt || a.createdAt || 0).getTime();
  const sod = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
  const arts = [...DB.articles].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const dow = (now.getDay() + 6) % 7, weekStart = sod(now) - dow * day, lastWeekStart = weekStart - 7 * day;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime(), lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  return [['📅 This Week', arts.filter((a) => ts(a) >= weekStart)], ['📅 Last Week', arts.filter((a) => ts(a) >= lastWeekStart && ts(a) < weekStart)],
    ['🗓 This Month', arts.filter((a) => ts(a) >= monthStart)], ['🗓 Last Month', arts.filter((a) => ts(a) >= lastMonthStart && ts(a) < monthStart)]];
})`;

for (const [w, h, touch] of [[390, 844, true], [820, 1180, true], [1440, 900, false]]) {
  const t = `@${w}`;
  /* ---- 133a ---- */
  {
    const app = await openApp({ viewport: { width: w, height: h }, hasTouch: touch, db: seedDB(), initScript: WATCH });
    const p = app.page;
    try {
      await p.waitForFunction(() => typeof _jobs !== 'undefined' && _jobs.armed && Object.keys(_jobs.t).length === 7, null, { timeout: 8000 });
      const s = await p.evaluate(() => {
        const m = performance.getEntriesByName('siy-render1')[0], origin = performance.timeOrigin;
        return { t: { ..._jobs.t }, render1: Math.round(origin + (m ? m.startTime : 0)), armedAt: _jobs.at, origin: Math.round(origin), now: Math.round(performance.now()), ok: { ..._jobs.ok } };
      });
      const ts = NAMES.map((n) => s.t[n]);
      const after = ts.every((x) => x >= s.render1), gaps = ts.slice(1).every((x, i) => x - ts[i] >= 300), within = ts.every((x) => x - s.origin <= 5000 + 1500);
      r.check(after && gaps && within && NAMES.every((n) => s.ok[n]), `133a${t} the 7 deferred jobs start after the first render, 350 ms apart, all within 5 s`, JSON.stringify({ after, gaps, within, rel: ts.map((x) => x - s.origin), render1: s.render1 - s.origin }));
      /* each job's own timer calls its tick: wrap the global tick after boot and wait one period */
      const calls = await p.evaluate(async () => {
        const c = {}; const names = { news: '_newsTick', ms: '_msTick', mp: '_mpTick', mi: '_miTick', mydb: '_mydbTick' };
        for (const [k, fn] of Object.entries(names)) { const orig = window[fn]; c[k] = 0; window[fn] = function () { c[k]++; return orig.apply(this, arguments); }; }
        await new Promise((res) => setTimeout(res, 5600));
        return c;
      });
      r.check(Object.values(calls).every((n) => n >= 1), `133a2${t} after the start every 5-second job's timer reaches its tick`, JSON.stringify(calls));
      /* a held job does not run by timer: a fresh flag set false stops it, true lets it run (the gate is the timer's only condition) */
      const gate = await p.evaluate(async () => {
        let n = 0; const orig = window._msTick; window._msTick = function () { n++; return orig.apply(this, arguments); };
        _jobs.ok.ms = false; await new Promise((res) => setTimeout(res, 5600)); const held = n; _jobs.ok.ms = true; await new Promise((res) => setTimeout(res, 5600)); window._msTick = orig;
        return { held, released: n - held };
      });
      r.check(gate.held === 0 && gate.released >= 1, `133a3${t} the timer runs a job only while its gate is open`, JSON.stringify(gate));
    } catch (e) { r.check(false, `133a${t} threw`, String(e && e.stack || e).slice(0, 400)); }
    r.check(app.errors.length === 0, `133e-a${t} no page errors`, app.errors.slice(0, 3).join(' | '));
    await app.close();
  }
  /* ---- 133c ---- */
  {
    /* a hook at document start: every write to the device copy is logged with whether the notebook had loaded; a slow idle callback widens the delay */
    const HOOK = () => {
      window.__wr = []; window.__early = [];
      const loaded = () => { try { return _dbLoaded === true; } catch { return false; } };
      const note = (what) => { (loaded() ? window.__wr : window.__early).push(what); };
      const P = IDBObjectStore.prototype;
      for (const m of ['put', 'add', 'delete', 'clear']) { const o = P[m]; P[m] = function () { try { const n = this.transaction.db.name; if (/^siyagah-(local|localrecs)-v1$/.test(n)) note(n + '.' + m); } catch {} return o.apply(this, arguments); }; }
      /* the harness seeds localStorage before the page has a body; only the app's own writes (after that) count */
      const ls = Storage.prototype.setItem; Storage.prototype.setItem = function (k) { if (k === 'my-notebook-v1' && document.body) note('ls:' + k); return ls.apply(this, arguments); };
      window.requestIdleCallback = (f) => setTimeout(f, 3000);
      /* fire the leave-the-page events over and over through the start */
      let n = 0; const iv = setInterval(() => { n++; try { window.dispatchEvent(new Event('pagehide')); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); delete document.visibilityState; } catch {} if (n > 200) clearInterval(iv); }, 5);
    };
    const app = await openApp({ viewport: { width: w, height: h }, hasTouch: touch, db: seedDB(), initScript: HOOK });
    const p = app.page;
    try {
      const st = await p.evaluate(() => ({ early: window.__early.slice(0, 5), earlyN: window.__early.length, armed: _jobs.armed, n: DB.articles.length, folders: DB.folders.length }));
      r.check(st.earlyN === 0 && st.n >= 3 && st.folders >= 1, `133c${t} pagehide/hidden fired through the whole start wrote nothing to the device copy before _dbLoaded, and the notebook is intact`, JSON.stringify(st));
      /* inside the delay: an edit that only the pagehide path can save */
      await p.evaluate(() => { window.__armedAtEdit = _jobs.armed; DB.articles[0].title = 'saved by pagehide during the delay'; DB.articles[0].updatedAt = new Date().toISOString(); });
      const armed = await p.evaluate(() => window.__armedAtEdit);
      await p.evaluate(() => { window.dispatchEvent(new Event('pagehide')); });
      await p.waitForTimeout(600);
      await p.reload({ waitUntil: 'domcontentloaded' });
      await p.waitForFunction(() => window.__appBooted === true, null, { timeout: 60000 });
      const title = await p.evaluate(() => (DB.articles.find((a) => a.title === 'saved by pagehide during the delay') || {}).title || null);
      r.check(armed === false && title === 'saved by pagehide during the delay', `133c2${t} a pagehide inside the delay (jobs not yet started) still saves the edit`, JSON.stringify({ armed, title }));
    } catch (e) { r.check(false, `133c${t} threw`, String(e && e.stack || e).slice(0, 400)); }
    await app.close();
  }
  /* ---- 133d ---- */
  {
    const app = await openApp({ viewport: { width: w, height: h }, hasTouch: touch, db: seedDB() });
    const p = app.page;
    try {
      await seedOracle(p, 3000); await sleep(600);
      const o = await p.evaluate(async (OLD) => {
        const out = { bad: [] };
        const oldTime = (0, eval)(OLD);
        const ids = (g) => JSON.stringify(g.map(([n, arr]) => [n, arr.map((a) => a.id)]));
        /* lists */
        if (ids(getSmartGroups('sf-time')) !== ids(oldTime())) out.bad.push('Timeline lists differ');
        const uni = new Set(); getSmartGroups('sf-time').forEach(([, arr]) => arr.forEach((a) => uni.add(a.id)));
        /* counts, with and without the one-pass map */
        const oldCount = (id) => getSmartArts(id).length;
        const before = {}; SF.forEach((s) => { try { before[s.id] = smartCount(s.id); } catch (e) { before[s.id] = 'err ' + e; } });
        SF.forEach((s) => { const want = s.id === 'sf-time' ? uni.size : oldCount(s.id); if (before[s.id] !== want) out.bad.push(`count ${s.id}: new ${before[s.id]} old ${want}`); });
        out.timeN = uni.size;
        /* the screens: draw each view with the new code, then with the old pieces swapped in, then compare */
        const names = ['#tree', '#p2h', '#p2c'];
        const grab = () => names.map((s) => (document.querySelector(s) || {}).innerHTML || '').join('\n§§§\n');
        const draw = (fid) => { ST.search = ''; selFolder(fid); return grab(); };
        const views = ['sf-time', 'sf-favs', 'sf-pinned', 'sf-new', 'sf-recent', 'sf-arch', 'sf-mywall', 'sf-journal'].filter((id) => SF.some((s) => s.id === id));
        /* MyWall: five states */
        const states = [{ prev: false, open: false }, { prev: true, open: false }, { prev: false, open: true }, { prev: true, open: true }];
        const oldMW = (() => { const src = renderMyWall.toString();
          const A = "let arr=byKind[k.id]||[];"; const i0 = src.indexOf(A); if (i0 < 0) throw new Error('renderMyWall: new lines not found');
          const j0 = src.indexOf("const dot=", i0);
          const g0 = src.indexOf("const gkey="), gE = src.indexOf("let arr=byKind");
          /* old: arr sorted for every type, then gkey / gOpen */
          const gk = src.slice(g0, gE);                                   /* const gkey=…; const gOpen=…; (+ the comment) */
          const oldTop = "const arr=(byKind[k.id]||[]).slice().sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));\n" + gk.replace(/\/\*[\s\S]*?\*\//g, '');
          const body = src.slice(0, g0) + oldTop + src.slice(j0);
          return (0, eval)('(' + body + ')');
        })();
        const sf = SF.find((s) => s.id === 'sf-mywall');
        for (const sfx of states) {
          DB.theme.mwViewMode = sfx.prev ? 'preview' : 'compact';
          ST.mwCatOpen = {}; noteKindCats().forEach((c) => { ST.mwCatOpen[c.id] = true; });
          ST.sfGrpOpen = {}; if (sfx.open) noteKinds().forEach((k, i) => { if (i % 2 === 0) ST.sfGrpOpen['sf-mywall|' + k.id] = true; });
          if (renderMyWall(sf) !== oldMW(sf)) out.bad.push(`MyWall html differs (preview ${sfx.prev}, open ${sfx.open})`);
        }
        DB.theme.mwViewMode = 'preview'; ST.sfGrpOpen = {};
        const newScreens = {}; views.forEach((v) => { newScreens[v] = draw(v); });
        const sg = window.getSmartGroups, sc = window.smartCount, mw = window.renderMyWall;
        window.getSmartGroups = function (id) { return id === 'sf-time' ? oldTime() : sg.apply(this, arguments); };
        window.smartCount = function (id) { return getSmartArts(id).length; };
        window.renderMyWall = oldMW;
        const oldScreens = {}; try { views.forEach((v) => { oldScreens[v] = draw(v); }); } finally { window.getSmartGroups = sg; window.smartCount = sc; window.renderMyWall = mw; }
        views.forEach((v) => { if (newScreens[v] !== oldScreens[v]) out.bad.push('screen differs: ' + v); });
        out.views = views.length; selFolder('f1');
        return out;
      }, OLD_TIME);
      r.check(o.bad.length === 0, `133d${t} oracle: Timeline lists, the Smart View numbers, MyWall (4 states) and ${o.views} drawn screens equal the v05.71 code, byte for byte (Timeline holds ${o.timeN})`, o.bad.join(' | '));
    } catch (e) { r.check(false, `133d${t} threw`, String(e && e.stack || e).slice(0, 500)); }
    r.check(app.errors.length === 0, `133e-d${t} no page errors`, app.errors.slice(0, 3).join(' | '));
    await app.close();
  }
}

/* ---- 133b — sync with the existing two-device harness (S1 fake), once at 1440 and once as a phone ---- */
{
  const pw = await playwright(); const srv = await serve(); const browser = await pw.chromium.launch();
  const cloud = makeCloud(); let A = null, B = null;
  const waitFor = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return Date.now() - t0; await sleep(400); } return -1; };
  try {
    const seedB = seedDB();                                   /* made BEFORE A's edit: B's copy is the older one, as a real second device's is */
    A = await addDevice(browser, srv.base, cloud, 'A', { width: 1440, height: 900 }, false, seedDB(), { recsOnly: true });
    await waitSeeded(cloud, A, 90000); await quiet(cloud, A);
    const id = await on(A, () => DB.articles[0].id);
    await on(A, () => { const a = DB.articles[0]; a.title = 'edited on A before B started'; a.updatedAt = new Date().toISOString(); persist(); });
    await quiet(cloud, A);
    B = await addDevice(browser, srv.base, cloud, 'B', { width: 390, height: 844 }, true, seedB, { recsOnly: true });
    /* right after B opened — inside its delay — A edits another note */
    const id2 = await on(A, () => DB.articles[1].id);
    await on(A, () => { const a = DB.articles[1]; a.title = 'edited on A while B was starting'; a.updatedAt = new Date().toISOString(); persist(); });
    const t1 = await waitFor(() => on(B, (i) => (DB.articles.find((x) => x.id === i) || {}).title === 'edited on A before B started', id) , 90000).catch(() => -1);
    const t1b = await waitFor(() => on(B, (i) => (DB.articles.find((x) => x.id === i) || {}).title === 'edited on A while B was starting', id2), 90000).catch(() => -1);
    r.check(t1 >= 0 && t1b >= 0, `133b a change made on A before B started, and one made while B was starting, reach B with no tap (${t1} ms, ${t1b} ms)`);
    /* and the other way, once B's jobs are running */
    await on(B, () => { const a = DB.articles[2]; a.title = 'edited on B after its jobs started'; a.updatedAt = new Date().toISOString(); persist(); });
    const id3 = await on(B, () => DB.articles[2].id);
    const t2 = await waitFor(() => on(A, (i) => (DB.articles.find((x) => x.id === i) || {}).title === 'edited on B after its jobs started', id3), 90000).catch(() => -1);
    r.check(t2 >= 0, `133b2 B's edit made after its jobs started reaches A (${t2} ms)`);
    r.check([...A.errors, ...B.errors].length === 0, '133e-b no page errors on either device', [...A.errors, ...B.errors].slice(0, 3).join(' | '));
  } catch (e) { r.check(false, `133b threw: ${String(e && e.stack || e).slice(0, 400)}`); }
  finally { await browser.close(); srv.close && srv.close(); }
}
process.exit(r.finish() ? 1 : 0);
