#!/usr/bin/env node
/* tools/firstread-j188.mjs — v06.04, J188 (block 163): a new device that reads the whole notebook says so and shows notes as they arrive.
   163m  the measurement (--measure): a stand-in cloud of 28,600 records answering each page after a set delay (100 ms, 400 ms), phone ×4 CPU:
         time to the first notes on screen, time to the end, the page-handling time, the longest long task — the build before J188 (--before=<ref>,
         default the v06.01 merge 09a3380, NEVER origin/main) against this build at 500 and at 1,000 a page.
   node tools/firstread-j188.mjs --measure [--notes=28600] [--delays=100,400] [--before=09a3380] [--pages=500,1000]
   node tools/firstread-j188.mjs [--only=163a,163b] [--unpatched]   [--unpatched]: serves origin/main (the checks that need the new code then fail) */
import { playwright, serve, seedDB } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, quiet, check, results, reopen, NB } from './s1-fake.mjs';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const arg = (k, d) => { const a = argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const onlyArg = arg('only', ''); const onlySet = onlyArg ? new Set(onlyArg.split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t) || [...onlySet].some((o) => t.startsWith(o));
const baseOf = (ref) => {
  const dir = mkdtempSync(join(tmpdir(), 'j188-base-'));
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', `${ref}:${f}`], { encoding: 'buffer', maxBuffer: 1 << 28 })); } catch {} }
  return dir;
};
const pw = await playwright();
const browser = await pw.chromium.launch();
const errs = [];
const waitFor = async (fn, ms, d, a) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await on(d, fn, a).catch(() => false)) return true; await sleep(100); } return false; };

/* an EMPTY device: it holds no note and no folder, so its first read is `fresh` */
export const emptySeed = () => { const e = seedDB(); e.folders = []; e.articles = []; e.sections = []; return e; };
/* a stand-in cloud of n records written straight into the store (folders ~1 in 28, the rest notes), every one with its own server time, 40 ms apart */
export function synthCloud(n) {
  const cloud = makeCloud(); const base = Date.now() - 3600000; const nf = Math.max(2, Math.round(n / 28)); const now = new Date().toISOString();
  const put = (c, id, obj, i) => {
    const j = JSON.stringify(obj); const ms = base + i * 40;
    cloud.store.set(`${NB}/recs/${c}~${id}`, { c, id, sig: j.length + ':' + (i * 2654435761 >>> 0).toString(36), ver: ms + (i % 997) / 1000, at: { __ts: [Math.floor(ms / 1000), (ms % 1000) * 1e6] }, b: '06.04', o: i, j });
  };
  const folders = [];
  for (let i = 0; i < nf; i++) { const f = { id: 'j188-f' + i, name: 'Folder ' + i, parentId: i && i % 7 ? 'j188-f' + (i - (i % 7)) : null, order: i, sectionId: 'sec-1', updatedAt: now }; folders.push(f); put('folders', f.id, f, i); }
  for (let i = nf; i < n; i++) { const a = { id: 'j188-n' + i, title: 'Note ' + i, content: '<p>text ' + i + ' ' + 'lorem ipsum dolor sit amet '.repeat(8) + '</p>', folderIds: ['j188-f' + (i % nf)], tags: [], createdAt: now, updatedAt: now, kind: 'general' }; put('articles', a.id, a, i); }
  return { cloud, nf, n };
}
const MEASURE_INIT = `(()=>{ const M=window.__m={t0:performance.now(),first:null,end:null,lt:[],snap:[],merge:[]};
  try{ new PerformanceObserver(l=>l.getEntries().forEach(e=>M.lt.push(Math.round(e.duration)))).observe({entryTypes:['longtask']}); }catch(e){}
  const iv=setInterval(()=>{ try{
    if(typeof _s1OnSnap==='function'&&!window.__wrapped){ window.__wrapped=1;
      const os=window._s1OnSnap; window._s1OnSnap=async function(){ const t=performance.now(); try{ return await os.apply(this,arguments); } finally{ M.snap.push(performance.now()-t); } };
      const om=window._pullRecsMerge; window._pullRecsMerge=function(){ const t=performance.now(); const r=om.apply(this,arguments); M.merge.push(performance.now()-t); return r; }; }
    if(M.first==null&&DB.articles.length>0) M.first=performance.now()-M.t0;
    const pg=_s1Stat&&_s1Stat.rd&&_s1Stat.rd.paging;
    if(M.end==null&&pg&&pg.done>0&&!pg.active&&_s1RdCaught===false||(M.end==null&&pg&&pg.done>0&&!pg.active)) { M.end=performance.now()-M.t0; M.done=pg.done; }
  }catch(e){} },20); })();`;
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
async function measureOne(base, n, delay, pageN, label) {
  const srv = await serve(base);
  const { cloud } = synthCloud(n); cloud.pageDelay = delay;
  const init = MEASURE_INIT + (pageN ? `window.__s1Page=${pageN};` : '');
  const d = await addDevice(browser, srv.base, cloud, 'M', { width: 390, height: 844 }, true, emptySeed(), { recsOnly: true, builtinOff: true, init, throttle: 4 });
  const t0 = Date.now();
  await waitFor(() => !!window.__m && window.__m.end != null, 900000, d);
  const m = await on(d, () => ({ first: window.__m.first, end: window.__m.end, done: window.__m.done, lt: window.__m.lt, snap: window.__m.snap, merge: window.__m.merge, notes: DB.articles.length }));
  errs.push(...d.errors);
  await d.ctx.close().catch(() => {}); await srv.close();
  return { label, delay, pageN: pageN || 500, first: m.first, end: m.end, pages: m.snap.length, snapAvg: avg(m.snap), merges: m.merge.length, mergeAvg: avg(m.merge), ltMax: Math.max(0, ...m.lt), ltN: m.lt.length, notes: m.notes, done: m.done };
}
export async function measure(n, delays, before, pagesList) {
  const rows = [];
  const bd = baseOf(before), ad = undefined;
  for (const delay of delays) {
    rows.push(await measureOne(bd, n, delay, 0, 'before (' + before.slice(0, 7) + ')'));
    for (const p of pagesList) rows.push(await measureOne(ad, n, delay, p, 'this build'));
  }
  const f = (x) => (x == null ? '—' : (x / 1000).toFixed(1) + ' s');
  const out = ['| build | page size | server delay | first notes on screen | end of read | pages | page handling (avg) | merges (avg) | longest long task | notes at end |', '|---|---|---|---|---|---|---|---|---|---|'];
  rows.forEach((r) => out.push(`| ${r.label} | ${r.pageN} | ${r.delay} ms | ${f(r.first)} | ${f(r.end)} | ${r.pages} | ${r.snapAvg.toFixed(0)} ms | ${r.merges} (${r.mergeAvg.toFixed(0)} ms) | ${r.ltMax} ms | ${r.notes.toLocaleString('en-US')} |`));
  return { rows, table: out.join('\n') };
}

if (argv.includes('--measure')) {
  const { table } = await measure(+arg('notes', 28600), arg('delays', '100,400').split(',').map(Number), arg('before', '09a3380'), arg('pages', '500,1000').split(',').map(Number));
  console.log(table);
  await browser.close(); process.exit(0);
}
