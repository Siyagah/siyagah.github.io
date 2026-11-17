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
  put('_head', '0', { theme: { preset: 'forest', custom: {} }, globalTags: [], jebPockets: [], jeb: [] }, 0);
  for (let i = nf; i < n; i++) { const a = { id: 'j188-n' + i, title: 'Note ' + i, content: '<p>text ' + i + ' ' + 'lorem ipsum dolor sit amet '.repeat(8) + '</p>', folderIds: ['j188-f' + (i % nf)], tags: [], createdAt: now, updatedAt: now, kind: 'general' }; put('articles', a.id, a, i); }
  return { cloud, nf, n };
}
const MEASURE_INIT = `(()=>{ const M=window.__m={t0:performance.now(),first:null,end:null,lt:[],snap:[],merge:[]};
  try{ new PerformanceObserver(l=>l.getEntries().forEach(e=>M.lt.push(Math.round(e.duration)))).observe({entryTypes:['longtask']}); }catch(e){}
  const iv=setInterval(()=>{ try{
    if(typeof _s1OnSnap==='function'&&!window.__wrapped){ window.__wrapped=1;
      const os=window._s1OnSnap; window._s1OnSnap=async function(g,sn,nb,paging){ const t=performance.now(); try{ return await os.apply(this,arguments); } finally{ if(paging) M.snap.push(performance.now()-t); } };
      const om=window._pullRecsMerge; window._pullRecsMerge=function(){ const t=performance.now(); const r=om.apply(this,arguments); Promise.resolve(r).then(()=>M.merge.push(performance.now()-t)); return r; }; }
    if(M.first==null&&DB.articles.length>0) M.first=performance.now()-M.t0;
    const pg=_s1Stat&&_s1Stat.rd&&_s1Stat.rd.paging;
    if(M.end==null&&pg&&pg.done>0&&!pg.active) { M.end=performance.now()-M.t0; M.done=pg.done; }
  }catch(e){} },20); })();`;
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
async function measureOne(base, n, delay, pageN, label) {
  const srv = await serve(base);
  const { cloud } = synthCloud(n); cloud.pageDelay = delay;
  const init = MEASURE_INIT + (pageN ? `window.__s1Page=${pageN};` : '');
  const d = await addDevice(browser, srv.base, cloud, 'M', { width: 390, height: 844 }, true, emptySeed(), { recsOnly: true, builtinOff: true, init, throttle: 4 });
  const t0 = Date.now();
  await waitFor(() => !!window.__m && window.__m.end != null, 900000, d);
  await waitFor((k) => DB.articles.length >= k, 120000, d, n - Math.round(n / 28) - 5);   /* the merge at the end is part of the wait */
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
    for (const p of pagesList.filter(Boolean)) rows.push(await measureOne(ad, n, delay, p, 'this build'));
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

/* ══ the checks (163a–163e) ══ */
const SAMPLER = `(()=>{ window.__s=[]; setInterval(()=>{ try{
  const pg=_s1Stat.rd&&_s1Stat.rd.paging; const vis=[...document.querySelectorAll('.fr-card')].filter(e=>{ const q=e.getBoundingClientRect(); return e.getClientRects().length&&q.right>0&&q.left<innerWidth; });
  const c=vis[0]; const r=c?c.getBoundingClientRect():null;
  window.__s.push({t:Math.round(performance.now()),active:!!(pg&&pg.active),done:pg?pg.done:0,pages:pg?pg.pages||0:0,fresh:pg?pg.fresh:null,art:DB.articles.length,fol:DB.folders.length,
    n:document.querySelectorAll('.fr-card').length,txt:c?c.querySelector('.fr-tx').textContent:'',keep:c&&c.querySelector('.fr-keep')?c.querySelector('.fr-keep').textContent:'',
    id:c?c.id:'',l:r?r.left:0,r:r?r.right:0,w:innerWidth}); }catch(e){} },40); })();`;
const R = 3000, PAGE = 250;
const num = (s) => +String(s).replace(/,/g, '');
const VPS = [{ w: 390, h: 844, touch: true }, { w: 820, h: 1180, touch: true }, { w: 1440, h: 900, touch: false }];
const mk = (cloud, srv, name, vp, seed, opts = {}) => addDevice(browser, srv.base, cloud, name, { width: vp.w, height: vp.h }, vp.touch, seed, { recsOnly: true, builtinOff: true, ...opts, init: SAMPLER + 'window.__s1Page=' + PAGE + ';' + (opts.init || '') });
const samples = (d) => on(d, () => window.__s.slice());
const ownSeed = () => { const s = seedDB(); for (let i = 0; i < 10; i++) s.articles.push({ id: 'own-' + i, title: 'Own ' + i, content: '<p>mine ' + i + '</p>', folderIds: ['f1'], tags: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), kind: 'general' }); return s; };
const srv = await serve(argv.includes('--unpatched') ? baseOf('origin/main') : undefined);
const earlyWrites = async (cloud, d, log0) => { let early = 0, latched = false; const t0 = Date.now(); for (;;) { const w = cloud.log.slice(log0).filter((o) => o.dev === d.name && o.t === 'set').length; const fin = await on(d, () => { const pg = _s1Stat.rd && _s1Stat.rd.paging; return !!(pg && pg.complete); }).catch(() => false); if (fin) latched = true; if (w > 0 && !latched) early++; if ((latched && w > 0) || Date.now() - t0 > 120000) break; await sleep(50); } return early; };   /* latched: once the read has ended and the device has caught up, later writes (its own, with the stand-in's sigs) are fine */

/* ══ 163a — the card, on every layout ══ */
if (want('163a')) {
  for (const vp of VPS) {
    const tag = `${vp.w}`; let d = null;
    try {
      const { cloud, nf } = synthCloud(R); cloud.pageDelay = 150;
      d = await mk(cloud, srv, 'F' + vp.w, vp, emptySeed());
      const ok = await waitFor(() => { const pg = _s1Stat.rd && _s1Stat.rd.paging; return !!(pg && pg.done > 0 && !pg.active) && _s1RdCaught; }, 120000, d);
      await sleep(600);
      const S = await samples(d); const withCard = S.filter((x) => x.txt);
      const dn = withCard.map((x) => { const m = /: ([\d,]+) so far/.exec(x.txt); return m ? num(m[1]) : null; }).filter((x) => x != null);
      check(ok && withCard.length >= 3, `163a ${tag}: a card was shown while the notebook was being read (${withCard.length} samples)`, withCard[0] && withCard[0].txt);
      check(dn.length >= 3 && dn[dn.length - 1] > dn[0] && new Set(dn).size >= 3, `163a ${tag}: the count rises (${dn[0]} → ${dn[dn.length - 1]} so far, ${new Set(dn).size} distinct)`);
      check(/^Reading your notebook from the cloud: [\d,]+ so far/.test(withCard[0].txt), `163a ${tag}: the words`, withCard[0].txt);
      check(withCard.every((x) => !/left|of about/.test(x.txt)), `163a ${tag}: with the total unknown the card says "so far" and promises no estimate`);
      const last = S[S.length - 1];
      check(last.n === 0 && !S.slice(-5).some((x) => x.txt), `163a ${tag}: the card is gone when the read ends`, JSON.stringify({ n: last.n }));
      const st = await on(d, () => ({ n: DB.articles.length, f: DB.folders.length }));
      check(st.n >= R - nf - 2 && st.f >= nf, `163a ${tag}: the device ends with the whole notebook (${st.n} notes, ${st.f} folders)`);
      /* where the card sits: a visible card, inside the window */
      const ids = [...new Set(withCard.map((x) => x.id))];
      check(vp.w < 640 ? ids.some((i) => i === 'fr-p2' || i === 'fr-sb') : vp.w < 1200 ? ids.includes('fr-sb') : ids.includes('fr-p3'), `163a ${tag}: the visible card is in ${vp.w < 640 ? 'the list area or the side pane' : vp.w < 1200 ? 'the side pane (the first screen)' : 'Pane 3'}`, ids.join(','));
      check(withCard.every((x) => x.l >= 0 && x.r <= x.w + 1), `163a ${tag}: the card is inside the window`, JSON.stringify(withCard.slice(0, 1).map((x) => [x.id, Math.round(x.l), Math.round(x.r), x.w])));
      /* a second read of the same device knows the total: "N of about M" */
      const pairs = await on(d, async () => { await _bgLoad(); _bg.cn = 3000; _bgSave(); _s1ReRead(); const t0 = Date.now(), out = []; await new Promise((r) => setTimeout(r, 0)); while (Date.now() - t0 < 25000) { const pg = _s1Stat.rd.paging; if (pg && pg.pages != null) out.push([pg.pages, _s1PagingText(), (document.querySelector('.fr-card .fr-tx') || {}).textContent || '']); if (pg && !pg.active && pg.done > 0 && out.length > 3) break; await new Promise((r) => setTimeout(r, 50)); } return out; });
      const known = pairs.filter((x) => /of about 3,000/.test(x[1]));
      check(known.length >= 3, `163a ${tag}: with the total known, ⚙/Diagnostics say "N of about M"`, known[0] && known[0][1]);
      check(pairs.filter((x) => x[0] < 2).every((x) => !/left/.test(x[1] + x[2])) && pairs.some((x) => x[0] >= 2 && /(under a minute|about \d+ min) left/.test(x[1])), `163a ${tag}: the estimate shows only after 2 pages`, (pairs.find((x) => /left/.test(x[1])) || [])[1]);
      check(!pairs.some((x) => /left/.test(x[2])) || pairs.filter((x) => x[2]).every((x) => /Reading your notebook from the cloud: ([\d,]+ of about 3,000 notes|3,\d{3} so far)/.test(x[2])), `163a ${tag}: a card, if shown, says "N of about M notes"`, (pairs.filter((x) => x[2]).find((x) => !/Reading your notebook from the cloud: ([\d,]+ of about 3,000 notes|3,\d{3} so far)/.test(x[2])) || pairs.find((x) => x[2]) || [])[2]);
      errs.push(...d.errors.map((e) => `${tag}: ${e}`));
    } catch (e) { check(false, `163a ${tag} threw: ${String(e && e.message || e).split('\n')[0]}`); }
    if (d) await d.ctx.close().catch(() => {});
  }
}

/* ══ 163b — notes appear early on a fresh device; a device that holds notes keeps the old rule ══ */
if (want('163b')) {
  let F = null, N = null;
  try {
    const { cloud, nf } = synthCloud(R); cloud.pageDelay = 300;
    F = await mk(cloud, srv, 'FR', VPS[2], emptySeed()); const log0 = cloud.log.length;
    const early = await earlyWrites(cloud, F, log0);
    const S = await samples(F);
    const mid = S.filter((x) => x.active && x.art > 0 && x.art < R - nf - 200);
    check(mid.length >= 3 && mid[0].fresh === true, `163b a fresh device showed notes before the read ended (${mid.length} samples, e.g. ${mid[0] && mid[0].art} notes / ${mid[0] && mid[0].fol} folders at ${mid[0] && mid[0].done} records read)`);
    check(S.some((x) => x.active && x.fol > 0), '163b folders filled in while the rest was read');
    check(early === 0, `163b nothing was written to the cloud before the read ended (${early} early writes)`);
    errs.push(...F.errors);
    /* a device that holds notes */
    const cloud2 = synthCloud(R).cloud; cloud2.pageDelay = 300;
    const lateMs = Date.now() + 5000;   /* newer than every other record: it is in the LAST page */
    cloud2.store.set(`${NB}/recs/articles~own-0`, { c: 'articles', id: 'own-0', gone: true, sig: 'gone', ver: lateMs, at: { __ts: [Math.floor(lateMs / 1000), 0] }, b: '06.04' });
    N = await mk(cloud2, srv, 'NF', VPS[2], ownSeed()); const l2 = cloud2.log.length;
    const early2 = await earlyWrites(cloud2, N, l2);
    const S2 = await samples(N);
    const act = S2.filter((x) => x.active && x.done > 0);
    check(act.length >= 5 && act.every((x) => x.fresh === false) && act.every((x) => x.art === 13), `163b a device that holds notes merged nothing while it read (${act.length} samples, always ${[...new Set(act.map((x) => x.art))].join('/')} notes)`);
    check(act.length > 0 && act.every((x) => x.art === 13), '163b the cloud tombstone in a later page did not remove a held note early (13 notes held to the last sample before the end)');
    check(early2 === 0, `163b nothing was written to the cloud before the read ended (${early2} early writes)`);
    const end = await on(N, () => ({ n: DB.articles.length }));
    check(end.n >= R - nf, `163b at the end it merged the full replica (${end.n} notes)`);
    errs.push(...N.errors);
  } catch (e) { check(false, `163b threw: ${String(e && e.message || e).split('\n')[0]}`); }
  for (const d of [F, N]) if (d) await d.ctx.close().catch(() => {});
}

/* ══ 163c — a window that keeps nothing says so ══ */
if (want('163c')) {
  const stub = (per, quota) => `Object.defineProperty(navigator,'storage',{configurable:true,value:{persisted:async()=>${per},estimate:async()=>({quota:${quota},usage:0})}});`;
  for (const [label, per, quota, expect] of [['small quota, not persisted', false, 120 * 1024 * 1024, true], ['a normal first visit (big quota, not persisted)', false, 60 * 1024 ** 3, false], ['persisted, small quota', true, 120 * 1024 * 1024, false]]) {
    let d = null;
    try {
      const { cloud } = synthCloud(1500); cloud.pageDelay = 300;
      d = await mk(cloud, srv, 'K', VPS[2], emptySeed(), { init: stub(per, quota) });
      await waitFor(() => { const pg = _s1Stat.rd && _s1Stat.rd.paging; return !!(pg && pg.done > 0 && !pg.active); }, 60000, d);
      const S = await samples(d); const seen = S.find((x) => x.keep);
      check(expect ? !!seen && /keeps nothing after it closes/.test(seen.keep) && /Install Siyagah/.test(seen.keep) : !S.some((x) => x.keep), `163c ${label}: the line ${expect ? 'shows' : 'does not show'}`, seen && seen.keep);
      const toasts = await on(d, () => (window.__toasts || []).filter((t) => /keeps nothing/.test(t)).length);
      check(toasts === 0, `163c ${label}: no toast`);
      errs.push(...d.errors);
    } catch (e) { check(false, `163c ${label} threw: ${String(e && e.message || e).split('\n')[0]}`); }
    if (d) await d.ctx.close().catch(() => {});
  }
}

/* ══ 163d — a read stopped half-way resumes from the marker ══ */
if (want('163d')) {
  let d = null;
  try {
    const { cloud, nf } = synthCloud(R); cloud.pageDelay = 300;
    d = await mk(cloud, srv, 'RS', VPS[2], emptySeed()); const log0 = cloud.log.length;
    await waitFor(() => { const pg = _s1Stat.rd && _s1Stat.rd.paging; return !!(pg && pg.pages >= 4 && pg.active); }, 60000, d);
    const p0 = cloud.pagedAt || 0;
    await reopen(d);
    const early = await earlyWrites(cloud, d, log0);
    const served = (cloud.pagedAt || 0) - p0;
    const st = await on(d, () => ({ n: DB.articles.length, live: [..._s1Rep.map.entries()].filter(([k, e]) => !e.gone && k !== '_head~0').length }));
    const S = await samples(d); const a = S.find((x) => x.active);
    check(a && a.fresh === true, '163d after the reload the device is still treated as fresh (the marker kept it)');
    check(served < Math.ceil(R / PAGE) + 1 && served >= 1, `163d it resumed from the saved cursor: ${served} pages after the reload of ${Math.ceil(R / PAGE)}`);
    check(st.live >= R - 2 && st.n >= R - nf - 2, `163d it still ended with every record (${st.live} of ${R}; ${st.n} notes)`);
    check(early === 0, `163d nothing was written to the cloud before the end (${early} early writes)`);
    errs.push(...d.errors);
  } catch (e) { check(false, `163d threw: ${String(e && e.message || e).split('\n')[0]}`); }
  if (d) await d.ctx.close().catch(() => {});
}

/* ══ 163e — the measurement (6,000 records here; --measure does 28,600) and no page errors ══ */
if (want('163e')) {
  try {
    const m = await measure(+arg('mnotes', 6000), [100], arg('before', '09a3380'), [500, 1000]);
    console.log(m.table);
    const mine = m.rows.filter((r) => r.label === 'this build');
    check(m.rows.every((r) => r.end != null && r.notes > 0), '163e every measured run reached the end with its notes');
    check(mine.every((r) => r.first != null && r.first < r.end), `163e this build shows notes before the read ends (first ${mine.map((r) => (r.first / 1000).toFixed(1)).join('/')} s, end ${mine.map((r) => (r.end / 1000).toFixed(1)).join('/')} s)`);
  } catch (e) { check(false, `163e threw: ${String(e && e.message || e).split('\n')[0]}`); }
  check(errs.length === 0, '163e no page errors at 390/820/1440', errs.slice(0, 3).join(' | '));
}
await srv.close(); await browser.close();
const n = results.length, bad = results.filter((x) => !x.ok).length;
console.log(`\n${n - bad}/${n} passed`);
process.exit(bad ? 1 : 0);
