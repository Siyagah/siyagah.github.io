#!/usr/bin/env node
/* tools/sync-s1d.mjs — v04.91, S1d: the local hot path at 9,000 notes.

   `--profile` (52a) seeds 9,000 notes (~5 KB each, ~47 MB) and three devices on the fake Firestore of
   sync-s1.mjs (copied into s1-fake.mjs) and prints, per step, the main-thread time of
     (a) typing one character through autosave and push,
     (b) receiving one edited note from another device (every step of _mergeRemoteIn),
     (c) one undo,
     (d) the JS heap after 30 edits,
   on a 1440 laptop and on a 390 phone with the CPU throttled ×4. The numbers are reported (not pass/fail),
   then each target is a pass/fail line.

   Main-thread time = the CDP `TaskDuration` counter's delta (every task the page ran, wall clock, so the
   ×4 throttle is in it). Per-step times wrap the app's own global functions (inclusive of what they call). */
import { playwright, serve, seedDB, ROOT } from './harness.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeCloud, addDevice, on, sleep, quiet, waitSeeded, check, results, NB } from './s1-fake.mjs';
import { runChecks } from './s1d-checks.mjs';

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const N = +((argv.find((a) => a.startsWith('--notes=')) || '').slice(8)) || 9000;

/* Targets at 9,000 notes: phone ×4 figures; the laptop gets a quarter of each. */
const TARGET = { typeMs: 300, receiveMs: 1000, undoMs: 500, heapMB: 300 };

const INSTR = String.raw`(() => {
  if (window.__T) return;
  const T = window.__T = {};
  const add = (k, d) => { const e = T[k] || (T[k] = { n: 0, ms: 0 }); e.n++; e.ms += d; };
  const wrap = (name) => {
    const o = window[name]; if (typeof o !== 'function') return;
    window[name] = function (...a) { const t = performance.now(); let r; try { r = o.apply(this, a); } catch (e) { add(name, performance.now() - t); throw e; }
      if (r && typeof r.then === 'function' && name[0] === '_' && /^(_s1OnSnap|_pullRecsMerge)$/.test(name)) return r.finally(() => add(name, performance.now() - t));
      add(name, performance.now() - t); return r; };
  };
  ['persist2','snapshotState','_save','_stampThemeTouches','_stampRecordTouches','_flushAllEditors','mergeDB','_seedThemeSnap','_seedRecSnap',
   '_s1DirtyFromDiff','_renderPreserveEdit','_edApplyRemote','_syncDigest','_s1AssembleRep','_mergeRemoteIn','_pullRecsMerge','_s1OnSnap',
   '_doPush','_pushWrite','_s1TakeSnap','_s1Snap','_edAutoSave','_flushEd','undo','redo','scheduleAutoSave','render','renderTree','renderP2C',
   '_idbPut','_s1Run','_s1RepSave','pushToCloud','_recSig','_collect','_ljSave','_ljCheckpoint','_histCapture','_histApply','_histStep','_s1SnapDirty','_s1AssembleMap'].forEach(wrap);
  /* JSON and localStorage calls are many and small: timing each one costs more than the call, so only with --json (the CPU profile names them anyway) */
  if (window.__JSONWRAP) {
    const js = JSON.stringify.bind(JSON); JSON.stringify = function (...a) { const t = performance.now(); try { return js(...a); } finally { add('JSON.stringify', performance.now() - t); } };
    const jp = JSON.parse.bind(JSON); JSON.parse = function (...a) { const t = performance.now(); try { return jp(...a); } finally { add('JSON.parse', performance.now() - t); } };
    const si = Storage.prototype.setItem; Storage.prototype.setItem = function (...a) { const t = performance.now(); try { return si.apply(this, a); } catch (e) { add('localStorage.setItem(threw)', performance.now() - t); throw e; } finally { add('localStorage.setItem', performance.now() - t); } };
  }
  /* --stacks: who calls the whole-notebook passes (printed with each step list) */
  if (window.__STACKS) for (const name of ['_collect']) { const o = window[name]; window[name] = function (...a) { (T['stack:' + name] || (T['stack:' + name] = { n: 0, ms: 0, s: [] })).s.push(new Error().stack.split('\n').slice(2, 6).map((x) => x.trim().replace(/\(.*\/index.html:/, '(')).join(' < ')); return o.apply(this, a); }; }
  const fq = window.__fsDeliverQ; if (fq) window.__fsDeliverQ = function (...a) { window.__arrive = performance.now(); return fq.apply(this, a); };
})();`;

/* --base=<git rev>: measure that build instead of the working tree (the "before" column) */
const baseRev = (argv.find((a) => a.startsWith('--base=')) || '').slice(7);
let srvRoot;
if (baseRev) {
  srvRoot = mkdtempSync(join(tmpdir(), 'siyagah-base-'));
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(srvRoot, f), execFileSync('git', ['show', baseRev + ':' + f], { cwd: ROOT, maxBuffer: 1 << 28 })); } catch (e) { if (f === 'index.html') throw e; } }
}
const pw = await playwright();
const srv = await serve(srvRoot);
const browser = await pw.chromium.launch({ args: ['--js-flags=--max-old-space-size=8192'] });
const out = {};
const M = (k, v) => { out[k] = v; console.log('P52 ' + k + ' ' + JSON.stringify(v)); };
const r1 = (x) => Math.round(x * 10) / 10;

async function cdpOf(d) { if (!d.cdp) d.cdp = await d.ctx.newCDPSession(d.page); if (!d.perfOn) { await d.cdp.send('Performance.enable'); d.perfOn = true; } return d.cdp; }
const taskMs = async (d) => { const c = await cdpOf(d); const m = (await c.send('Performance.getMetrics')).metrics.find((x) => x.name === 'TaskDuration'); return m.value * 1000; };
const resetT = (d) => on(d, () => { for (const k of Object.keys(window.__T)) delete window.__T[k]; window.__arrive = 0; });
const readT = (d) => on(d, () => { const o = {}; for (const [k, v] of Object.entries(window.__T)) o[k] = { n: v.n, ms: Math.round(v.ms * 10) / 10, ...(v.s ? { s: v.s } : {}) }; return o; });
async function heapMB(d) { const c = await cdpOf(d); await c.send('HeapProfiler.enable').catch(() => {}); await c.send('HeapProfiler.collectGarbage').catch(() => {}); const h = await c.send('Runtime.getHeapUsage'); return { usedMB: r1(h.usedSize / 1048576), totalMB: r1(h.totalSize / 1048576) }; }
/* --cpuprofile: a sampling profile of one step, top self-time functions (what the wrappers cannot see) */
async function profStart(d) { const c = await cdpOf(d); await c.send('Profiler.enable'); await c.send('Profiler.setSamplingInterval', { interval: 100 }); await c.send('Profiler.start'); }
/* --trace also records every change to <html>/<body> attributes, <body>'s children and <head> (stylesheets), and focus */
const MUTWATCH = String.raw`(() => {
  window.__MUT = []; const t0 = performance.now();
  const nm = (x) => x.nodeName + (x.id ? '#' + x.id : '');
  const log = (s) => { if (window.__MUT && window.__MUT.length < 80) window.__MUT.push(Math.round(performance.now() - t0) + 'ms ' + s); };
  if (window.__MO) window.__MO.disconnect();
  const mo = window.__MO = new MutationObserver((ms) => ms.forEach((m) => {
    if (m.type === 'attributes') log('attr ' + nm(m.target) + ' @' + m.attributeName + '=' + String(m.target.getAttribute(m.attributeName)).slice(0, 80));
    else if (m.type === 'childList') log('child ' + nm(m.target) + ' +' + [...m.addedNodes].map(nm).join(',') + ' -' + [...m.removedNodes].map(nm).join(','));
    else log(m.type + ' ' + nm(m.target.parentNode || m.target));
  }));
  mo.observe(document.documentElement, { attributes: true });
  mo.observe(document.body, { attributes: true, childList: true });
  mo.observe(document.head, { childList: true, subtree: true, characterData: true });
  if (!window.__FOCW) { window.__FOCW = 1; window.addEventListener('focusin', (e) => log('focusin ' + nm(e.target)), true); }
})()`;
/* --trace: a Chromium trace of one step on the main thread, summed by event name (inclusive ms, count) — names the
   browser's own work ("(program)" in a CPU profile: style, layout, paint, parsing, storage) */
async function traceStart(d) { await browser.startTracing(d.page, { categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.stack', 'v8', 'blink', 'IndexedDB', 'loading'] }); }
async function traceStop(d, label) {
  const ev = JSON.parse((await browser.stopTracing()).toString()).traceEvents || [];
  /* three devices share one browser: of the renderer main threads, the one that worked hardest in the window is this page's */
  const mains = ev.filter((e) => e.name === 'thread_name' && e.args && e.args.name === 'CrRendererMain'), busy = new Map();
  ev.forEach((e) => { if (e.ph === 'X' && e.name === 'RunTask' && e.dur) busy.set(e.pid + ':' + e.tid, (busy.get(e.pid + ':' + e.tid) || 0) + e.dur); });
  const main = mains.sort((a, b) => (busy.get(b.pid + ':' + b.tid) || 0) - (busy.get(a.pid + ':' + a.tid) || 0))[0];
  const tot = new Map();
  ev.forEach((e) => { if (e.ph !== 'X' || !e.dur || !main || e.pid !== main.pid || e.tid !== main.tid) return; const t = tot.get(e.name) || [0, 0]; t[0] += e.dur / 1000; t[1]++; tot.set(e.name, t); });
  const top = [...tot.entries()].sort((a, b) => b[1][0] - a[1][0]).slice(0, 30).map(([k, v]) => k + ' ' + Math.round(v[0]) + 'ms×' + v[1]);
  console.log('TRACE ' + label + ' ' + JSON.stringify(top));
  /* who forced each style/layout pass (the JS frames that asked for it) */
  const by = new Map();
  ev.forEach((e) => { if (e.ph !== 'X' || !main || e.pid !== main.pid || e.tid !== main.tid || !/^(UpdateLayoutTree|Layout|HitTest)$/.test(e.name)) return;
    const st = (e.args && e.args.beginData && e.args.beginData.stackTrace) || [];
    const k = e.name + ' ' + (st.slice(0, 4).map((f) => f.functionName + ':' + f.lineNumber).join(' < ') || '(no JS: a frame or an event)');
    const t = by.get(k) || [0, 0]; t[0] += e.dur / 1000; t[1]++; by.set(k, t); });
  console.log('TRACESTACKS ' + label + ' ' + JSON.stringify([...by.entries()].sort((a, b) => b[1][0] - a[1][0]).slice(0, 25).map(([k, v]) => Math.round(v[0]) + 'ms×' + v[1] + ' ' + k)));
}
async function profStop(d, label) {
  const c = await cdpOf(d); const { profile } = await c.send('Profiler.stop');
  const self = new Map(), byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const dts = profile.timeDeltas; profile.samples.forEach((id, i) => { const n = byId.get(id), k = (n.callFrame.functionName || '(anon)') + ' ' + (n.callFrame.url || '').split('/').pop() + ':' + n.callFrame.lineNumber; self.set(k, (self.get(k) || 0) + (dts[i] || 0) / 1000); });
  const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => k + ' ' + Math.round(v) + 'ms');
  console.log('CPUPROFILE ' + label + ' ' + JSON.stringify(top));
}
const busy = (d) => on(d, () => !!_s1Busy || !!_pushInFlight || !!_syncPushTimer || !!_s1KickTimer || _pullInFlight || !!_tiAsT && false).catch(() => true);
async function quiesce(cloud, d, ms = 180000) { await sleep(400); return quiet(cloud, d, ms); }

const runProfile = has('--profile') || !has('--checks');
const doChecks = has('--checks') || !has('--profile');
try {
  if (runProfile) {
  const cloud = makeCloud();
  const L = await addDevice(browser, srv.base, cloud, 'laptop', { width: 1440, height: 900 }, false, seedDB());
  await sleep(1500);
  const tSeed = Date.now();
  await on(L, (n) => {
    const t0 = Date.now() - 5e6, s = 'The quick brown fox jumps over the lazy dog. ';   /* a note each second apart: a list of identical dates would flatter every date-formatting cost */
    for (let i = 0; i < n; i++) { const at = new Date(t0 + i * 500).toISOString(); DB.articles.push({ id: 'n' + i, title: 'Note ' + i, content: '<p>' + s.repeat(110) + i + '</p>', folderIds: ['f1'], tags: [], createdAt: at, updatedAt: at, kind: 'general' }); }
    persist(); flushPendingPush();
  }, N);
  const okSeed = await waitSeeded(cloud, L, 1500000);
  M('seed', { notes: N, ok: okSeed, ms: Date.now() - tSeed });
  const fresh = async (name, vp, touch, throttle) => {
    const t0 = Date.now();
    const d = await addDevice(browser, srv.base, cloud, name, vp, touch, seedDB('2026-01-01T00:00:00.000Z'), { throttle });
    let ok = false;
    while (Date.now() - t0 < 1500000) { if (await on(d, (n) => DB.articles.length >= n && !_pullInFlight && !_s1RepUnmerged && !_s1RecsMergeQueued, N).catch(() => false)) { ok = true; break; } await sleep(250); }
    M('fresh_' + name, { ok, ms: Date.now() - t0 });
    return d;
  };
  const F1 = await fresh('freshLaptop', { width: 1440, height: 900 }, false, 0);
  const F2 = await fresh('freshPhoneX4', { width: 390, height: 844 }, true, 4);
  /* everyone quiet before the first measurement */
  for (const d of [L, F1, F2]) await quiesce(cloud, d);
  for (const d of [L, F1, F2]) { await cdpOf(d); if (has('--stacks')) await on(d, () => { window.__STACKS = true; }); if (has('--json')) await on(d, () => { window.__JSONWRAP = true; }); await on(d, INSTR); }

  /* ── (a) typing one character, through autosave and push ── */
  const typeOne = async (d, id) => {
    await on(d, (i) => { ST.article = i; ST.editing = false; render(); startEdit(); const ed = document.getElementById('ed'); ed.focus(); const r = document.createRange(); r.selectNodeContents(ed); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }, id);
    await sleep(600); await quiesce(cloud, d);
    await resetT(d);
    if (has('--cpuprofile')) await profStart(d);
    const t0 = await taskMs(d), mark = cloud.log.length;
    await d.page.keyboard.type('x');
    await sleep(500);
    let committed = false; const tw = Date.now();
    while (Date.now() - tw < 120000) { if (cloud.log.slice(mark).some((o) => o.t === 'set')) { committed = true; break; } await sleep(50); }
    await quiesce(cloud, d);
    const t1 = await taskMs(d);
    if (has('--cpuprofile')) await profStop(d, d.name + ' (a) typing');
    return { mainThreadMs: Math.round(t1 - t0), committed, steps: await readT(d) };
  };
  const recvOne = async (src, rcv, tag) => {
    await resetT(rcv);
    if (has('--cpuprofile')) await profStart(rcv);
    if (has('--trace')) { await traceStart(rcv); await on(rcv, MUTWATCH); }
    const r0 = await taskMs(rcv);
    await on(src, (t) => { const a = DB.articles.find((x) => x.id === 'n77'); a.title = t; a.updatedAt = new Date().toISOString(); persist(); flushPendingPush(); }, tag);
    let got = false; const tw = Date.now();
    while (Date.now() - tw < 240000) { if (await on(rcv, (t) => (DB.articles.find((x) => x.id === 'n77') || {}).title === t, tag).catch(() => false)) { got = true; break; } await sleep(20); }
    for (const d of [src, rcv]) await quiesce(cloud, d);
    const r1t = await taskMs(rcv);
    if (has('--cpuprofile')) await profStop(rcv, rcv.name + ' (b) receive');
    if (has('--trace')) { await traceStop(rcv, rcv.name + ' (b) receive'); console.log('MUTATIONS ' + rcv.name + ' ' + JSON.stringify(await on(rcv, () => window.__MUT))); }
    const steps = await readT(rcv);
    const arrive = await on(rcv, () => window.__arrive);
    return { got, mainThreadMs: Math.round(r1t - r0), steps };
  };
  const edits30 = async (d) => {
    for (let i = 0; i < 30; i++) await on(d, (k) => { const a = DB.articles.find((x) => x.id === 'n' + (100 + k)); a.title = 'Edit ' + k + ' ' + Date.now(); a.updatedAt = new Date().toISOString(); persist(); }, i);
    await quiesce(cloud, d);
    return heapMB(d);
  };
  const undoOne = async (d) => {
    await resetT(d);
    if (has('--cpuprofile')) await profStart(d);
    const t0 = await taskMs(d);
    const wall = await on(d, () => { const t = performance.now(); undo(); return performance.now() - t; });
    await quiesce(cloud, d);
    const t1 = await taskMs(d);
    if (has('--cpuprofile')) await profStop(d, d.name + ' (c) undo');
    return { undoCallMs: Math.round(wall), mainThreadMs: Math.round(t1 - t0), steps: await readT(d) };
  };
  const P = {};
  const quiesceAll = async () => { for (let i = 0; i < 2; i++) for (const d of [L, F1, F2]) await quiesce(cloud, d); };
  for (const [name, d, other] of [['laptop', L, F1], ['phoneX4', F2, L]]) {
    await quiesceAll();   /* the other device's edits (30 of them, an undo) must have landed everywhere before this one is measured */
    P[name] = {};
    P[name].a = await typeOne(d, 'n42'); M(name + '_a_type', P[name].a);
    await on(d, () => { ST.editing = false; render(); });
    P[name].b = await recvOne(other, d, 'Received on ' + name + ' ' + Date.now()); M(name + '_b_receive', P[name].b);
    P[name].d = await edits30(d); M(name + '_d_heap_after_30_edits', P[name].d);
    P[name].c = await undoOne(d); M(name + '_c_undo', P[name].c);
  }
  /* targets */
  const lim = (name, k) => TARGET[k] / (name === 'laptop' ? 4 : 1);
  for (const name of ['laptop', 'phoneX4']) {
    check(P[name].a.committed && P[name].a.mainThreadMs <= lim(name, 'typeMs'), `52a ${name} (a) autosave+push of one typed character: ${P[name].a.mainThreadMs} ms main-thread (target ≤ ${lim(name, 'typeMs')})`);
    check(P[name].b.got && P[name].b.mainThreadMs <= lim(name, 'receiveMs'), `52a ${name} (b) receiving one edited note: ${P[name].b.mainThreadMs} ms main-thread (target ≤ ${lim(name, 'receiveMs')})`);
    check(P[name].c.mainThreadMs <= lim(name, 'undoMs'), `52a ${name} (c) one undo: ${P[name].c.mainThreadMs} ms main-thread (target ≤ ${lim(name, 'undoMs')})`);
    check(P[name].d.usedMB <= TARGET.heapMB, `52a ${name} (d) JS heap after 30 edits: ${P[name].d.usedMB} MB (target ≤ ${TARGET.heapMB})`);
  }
  console.log('P52_DONE ' + JSON.stringify(out));
  for (const d of [L, F1, F2]) await d.ctx.close().catch(() => {});
  }
  if (doChecks) { const o = (argv.find((a) => a.startsWith('--only=')) || '').slice(7); await runChecks({ browser, srv, only: o ? new Set(o.split(',')) : null }); }
} catch (e) {
  console.log(' FAIL  sync-s1d threw: ' + (e && e.stack || e));
  results.push({ ok: false, label: 'threw' });
} finally {
  await browser.close();
  await srv.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
