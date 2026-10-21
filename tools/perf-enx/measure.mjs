/* Measures the owner-scale notebook (build it first: node seed.mjs).
     node measure.mjs [--runs=3] [--vp=laptop|phone] [--idle=20] [--prof]     (--prof: CPU profiles of every step on run 1)
   Each run copies profile-seed/ to a fresh profile, so every run boots the same notebook. */
import { serveFixed, launch, PROFILE, DIR, med } from './common.mjs';
import { cpSync, rmSync, writeFileSync } from 'node:fs';
const argv = process.argv.slice(2);
const arg = (k, d) => { const a = argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const RUNS = +arg('runs', 3), IDLE = +arg('idle', 20), PROF = argv.includes('--prof');
const VPS = [{ name: 'laptop', w: 1440, h: 900, th: 1, touch: false }, { name: 'phone', w: 390, h: 844, th: 4, touch: true }].filter((v) => !arg('vp') || v.name === arg('vp'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* summarise a CDP profile: top self and total (inclusive, each sample counted once per function) */
function summ(prof, top = 15) {
  const byId = new Map(), parent = new Map();
  prof.nodes.forEach((n) => { byId.set(n.id, n); (n.children || []).forEach((c) => parent.set(c, n.id)); });
  const key = (n) => { const f = n.callFrame; const u = (f.url || '').split('/').pop(); return (f.functionName || '(anon)') + (f.lineNumber >= 0 && f.url ? ' ' + (u || 'index.html') + ':' + (f.lineNumber + 1) : ''); };
  const self = new Map(), tot = new Map(); let all = 0;
  const td = prof.timeDeltas;
  for (let i = 0; i < prof.samples.length; i++) {
    const d = (td[i + 1] != null ? td[i + 1] : 0) / 1000; all += d;
    let id = prof.samples[i]; const n0 = byId.get(id); const k0 = key(n0);
    self.set(k0, (self.get(k0) || 0) + d);
    const seen = new Set();
    while (id != null) { const k = key(byId.get(id)); if (!seen.has(k)) { seen.add(k); tot.set(k, (tot.get(k) || 0) + d); } id = parent.get(id); }
  }
  const s = (m) => [...m].filter(([k]) => !/^\((idle|program|root)\)/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, top).map(([k, v]) => [k, Math.round(v)]);
  return { wallMs: Math.round(all), idle: Math.round(self.get('(idle)') || 0), self: s(self), total: s(tot) };
}

const INIT = () => {
  window.__pm = { long: [], firstTree: null };
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__pm.long.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ type: 'longtask', buffered: true }); } catch (e) {}
  const poll = () => { if (window.__pm.firstTree == null && document.querySelector('#tree .sec')) { requestAnimationFrame(() => { window.__pm.firstTree = Math.round(performance.now()); }); return; } requestAnimationFrame(poll); };
  requestAnimationFrame(poll);
};

/* a real click on `sel`, then wait for `done` (a page expression) — first paint = the frame after `first` holds */
async function clickMeasure(page, sel, first, done, maxMs = 120000) {
  await page.evaluate(() => { window.__pm.mark = window.__pm.long.length; window.__cm = { t0: null }; document.addEventListener('pointerdown', (e) => { window.__cm.t0 = performance.now(); }, { capture: true, once: true }); });
  await page.locator(sel).first().scrollIntoViewIfNeeded();
  const t = Date.now();
  await page.locator(sel).first().click();
  const r = await page.evaluate(async ({ first, done, maxMs }) => {
    const f = (0, eval)('() => (' + first + ')'), d = (0, eval)('() => (' + done + ')');
    const t0 = window.__cm.t0 || performance.now(); let tf = null, td = null;
    while (performance.now() - t0 < maxMs) {
      await new Promise((r) => requestAnimationFrame(r));
      if (tf == null && f()) { await new Promise((r) => requestAnimationFrame(r)); tf = performance.now() - t0; }
      if (tf != null && d()) { td = performance.now() - t0; break; }
    }
    await new Promise((r) => setTimeout(r, 300));
    const L = window.__pm.long.slice(window.__pm.mark).map((x) => x[1]);
    return { first: tf == null ? null : Math.round(tf), whole: td == null ? null : Math.round(td), worst: L.length ? Math.max(...L) : 0, longSum: L.reduce((a, b) => a + b, 0) };
  }, { first, done, maxMs });
  r.wall = Date.now() - t;
  return r;
}

const out = {};
const srv = await serveFixed();
for (const vp of VPS) {
  const rows = [];
  for (let run = 0; run < RUNS; run++) {
    const prof = PROF && run === 0; const Tstart = Date.now();
    const P = DIR + 'profile-run'; rmSync(P, { recursive: true, force: true }); cpSync(PROFILE, P, { recursive: true });
    const { ctx, page, errors } = await launch(P, vp);
    page.setDefaultTimeout(60000);
    await ctx.addInitScript(INIT);
    const cdp = await ctx.newCDPSession(page);
    await page.goto(srv.base + '/blank.txt');   /* same origin: the profiler survives into the app's page */
    await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
    if (vp.th > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: vp.th });
    await cdp.send('Profiler.start');
    await page.goto(srv.base + '/', { waitUntil: 'commit' });
    await page.waitForFunction(() => window.__appBooted === true, null, { timeout: 300000, polling: 50 });
    const bootP = summ((await cdp.send('Profiler.stop')).profile, 18);
    const R = { run };
    R.boot = await page.evaluate(() => { const nav = performance.getEntriesByType('navigation')[0]; const L = window.__pm.long.map((x) => x[1]); return { booted: Math.round(performance.now()), firstTree: window.__pm.firstTree, dcl: Math.round(nav.domContentLoadedEventEnd), worst: Math.max(0, ...L), longSum: L.reduce((a, b) => a + b, 0), notes: DB.articles.length }; });
    if (argv.includes('--snippet')) await page.evaluate(() => { ST.snippet = true; DB.theme.listView = 'snippet'; renderP2C(); });
    /* settle: wait a few seconds after boot */
    await sleep(3000);
    if (prof) R.bootProfile = bootP;
    /* idle profile (run 1) */
    if (run === 0) {
      await cdp.send('Performance.enable');
      const td = async () => (await cdp.send('Performance.getMetrics')).metrics.find((m) => m.name === 'TaskDuration').value * 1000;
      await page.evaluate(() => { window.__pm.mark = window.__pm.long.length; });
      const t0 = await td(); await cdp.send('Profiler.start'); await sleep(IDLE * 1000);
      const ip = summ((await cdp.send('Profiler.stop')).profile, 20); const t1 = await td();
      const L = await page.evaluate(() => window.__pm.long.slice(window.__pm.mark).map((x) => x[1]));
      R.idle = { seconds: IDLE, mainThreadMs: Math.round(t1 - t0), longTasks: L.length, worst: Math.max(0, ...L), profile: ip };
    }
    const step = async (name, fn) => { if (prof) await cdp.send('Profiler.start'); const r = await fn(); if (prof) r.profile = summ((await cdp.send('Profiler.stop')).profile, 12); R[name] = r; await sleep(800); };
    const phone = vp.w < 640;
    const showSB = async () => { if (phone) await page.evaluate(() => { try { showPane('sb'); } catch (e) {} }); await sleep(300); };
    /* expand the Evernote root in the tree (real click on its arrow) */
    await showSB();
    await step('openSection', () => clickMeasure(page, '.sec[data-sid="sec-1"] .sec-hd .sec-nm', "!!document.querySelector('#tree .tr-row[data-fid=\"enx-root\"]')", 'true'));
    await step('expandRoot', () => clickMeasure(page, '#tree .tr-row[data-fid="enx-root"] .tr-tog', "document.querySelectorAll('#tree .tr-row').length>0 && !!document.querySelector('#tree .tr-row[data-fid=\"enx-root\"] .tr-tog') && document.querySelector('#tree .tr-row[data-fid=\"enx-root\"] .tr-tog').textContent==='▾'", 'true'));
    R.expandRoot.rows = await page.evaluate(() => document.querySelectorAll('#tree .tr-row').length);
    R.renderTreeMs = await page.evaluate(() => { const t = []; for (let i = 0; i < 3; i++) { const a = performance.now(); renderTree(); t.push(performance.now() - a); } t.sort((a, b) => a - b); return Math.round(t[1]); });
    R.cntOfRoot = await page.evaluate(() => { const a = performance.now(); const n = cntOf('enx-root'); return { n, ms: Math.round(performance.now() - a) }; });
    /* click the Evernote root folder */
    const wantList = (fid) => `!!document.querySelector('#p2c .ar') && document.querySelector('#tree .tr-row.sel[data-fid="${fid}"]')`;
    const wholeList = '!(typeof _listPending==="function"&&_listPending())';
    await step('clickRoot', () => clickMeasure(page, '#tree .tr-row[data-fid="enx-root"] .tr-name', `document.querySelector('#tree .tr-row.sel[data-fid="enx-root"]')`, wholeList));
    R.clickRoot.cards = await page.evaluate(() => document.querySelectorAll('#p2c .ar').length);
    const big = await page.evaluate(() => { const c = new Map(); DB.articles.forEach((a) => { if (a.fromEvernote) c.set(a.folderIds[0], (c.get(a.folderIds[0]) || 0) + 1); }); return [...c].sort((a, b) => b[1] - a[1])[0]; });
    await showSB();
    R.rootExpAfterClick = await page.evaluate((f) => { const had = !!document.querySelector('#tree .tr-row[data-fid="' + f + '"]'); if (!had) { let x = DB.folders.find((y) => y.id === f); while (x && x.parentId) { ST.exp[x.parentId] = true; x = DB.folders.find((y) => y.id === x.parentId); } renderTree(); } return had; }, big[0]);
    await sleep(300);
    await step('clickBig', () => clickMeasure(page, `#tree .tr-row[data-fid="${big[0]}"] .tr-name`, wantList(big[0]), wholeList));
    R.clickBig.cards = await page.evaluate(() => document.querySelectorAll('#p2c .ar').length); R.clickBig.notes = big[1];
    /* Smart Views: open the panel (every row counts getSmartArts over all notes), then the "From Evernote" view (12,000 cards) */
    await showSB();
    await step('openSmart', () => clickMeasure(page, '.sf-hd-sec', "!!document.querySelector('#tree .sf-row')", 'true'));
    R.renderTreeSmartOpenMs = await page.evaluate(() => { const t = []; for (let i = 0; i < 3; i++) { const a = performance.now(); renderTree(); t.push(performance.now() - a); } t.sort((a, b) => a - b); return Math.round(t[1]); });
    R.getSmartArtsMs = await page.evaluate(() => { const o = {}; for (const sf of sfOrdered()) { const a = performance.now(); const n = getSmartArts(sf.id).length; o[sf.id] = [n, Math.round(performance.now() - a)]; } return o; });
    await step('clickSfEnx', () => clickMeasure(page, '#tree .sf-row[data-sfid="sf-enx"] .tr-name', "!!document.querySelector('#p2c .ar') && ST.folder==='sf-enx'", wholeList));
    R.clickSfEnx.cards = await page.evaluate(() => document.querySelectorAll('#p2c .ar').length);
    /* the section's own Smart Views sub-panel */
    R.renderTreeSecSFMs = await page.evaluate(() => { ST.secSFOpen = { 'sec-1': true }; const t = []; for (let i = 0; i < 3; i++) { const a = performance.now(); renderTree(); t.push(performance.now() - a); } t.sort((a, b) => a - b); ST.secSFOpen = {}; renderTree(); return Math.round(t[1]); });
    /* a note opened while Smart Views is open: every renderTree pays the counts */
    await page.evaluate(() => { ST.sfOpen = false; renderTree(); }); await sleep(300);
    /* open one imported note (the 5th card) */
    if (phone) await page.evaluate(() => showPane('p2'));
    const aid = await page.evaluate(() => document.querySelectorAll('#p2c .ar')[4].dataset.aid);
    await step('openNote', () => clickMeasure(page, `#p2c .ar[data-aid="${aid}"]`, `ST.article==='${aid}' && !!document.querySelector('#p3c .av, #p3c')`, 'true'));
    /* open a ~150 KB note */
    const bigN = await page.evaluate(() => { const a = DB.articles.filter((x) => x.fromEvernote && x.content.length > 120000 && x.content.length < 200000).sort((x, y) => Math.abs(x.content.length - 150000) - Math.abs(y.content.length - 150000))[0]; return { id: a.id, f: a.folderIds[0], kb: Math.round(a.content.length / 1024) }; });
    await page.evaluate((f) => { selFolder(f); _listFinish && _listFinish(); }, bigN.f); await sleep(1500);
    if (phone) await page.evaluate(() => showPane('p2'));
    await step('openBig', () => clickMeasure(page, `#p2c .ar[data-aid="${bigN.id}"]`, `ST.article==='${bigN.id}'`, 'true'));
    R.openBig.kb = bigN.kb;
    /* edit the 5th-card note: start edit, one keystroke, then the autosave */
    await page.evaluate((id) => { selArt(id); }, aid); await sleep(800);
    await page.evaluate(() => { startEdit(); }); await sleep(1500);
    await page.evaluate(() => { const ed = document.getElementById('ed'); ed.focus(); const r = document.createRange(); r.selectNodeContents(ed); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
    await sleep(500);
    await step('keystroke', async () => {
      await page.evaluate(() => { window.__pm.mark = window.__pm.long.length; window.__ks = { t0: performance.now() }; });
      await page.keyboard.type('x');
      const k = await page.evaluate(async () => { await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return Math.round(performance.now() - window.__ks.t0); });
      await sleep(4000);   /* autosave: 1.2 s quiet + journal write */
      return await page.evaluate((k) => { const L = window.__pm.long.slice(window.__pm.mark).map((x) => x[1]); return { keyToPaint: k, longTasks: L, worst: Math.max(0, ...L), saved: (DB.articles.find((a) => a.id === ST.article) || {}).content.endsWith('x') || /x(<\/[a-z]+>)*$/.test((DB.articles.find((a) => a.id === ST.article) || {}).content) }; }, k);
    });
    /* the whole-notebook serialisation and the sweep, called directly */
    R.direct = await page.evaluate(() => {
      const T = (f) => { const a = performance.now(); const v = f(); return [Math.round(performance.now() - a), v]; };
      const [js, j] = T(() => JSON.stringify(DB));
      const [st] = T(() => _stampRecordTouches());
      const [col] = T(() => _collect(DB, null));
      const [sd] = T(() => _syncDigest ? _syncDigest(DB) : null);
      const [p] = T(() => persist());
      return { jsonMB: +(j.length / 1048576).toFixed(1), stringifyMs: js, stampRecordTouchesMs: st, collectMs: col, syncDigestMs: sd, persistMs: p };
    });
    R.errors = errors.filter((e) => !/404/.test(e)).slice(0, 4); R.sessionSec = Math.round((Date.now() - Tstart) / 1000);
    rows.push(R);
    console.log(vp.name + ' run' + run + ' ' + JSON.stringify(R, (k, v) => (k === 'profile' || k === 'bootProfile' ? undefined : v)));
    writeFileSync(DIR + `out${argv.includes('--snippet') ? '-snip' : ''}-${vp.name}-run${run}.json`, JSON.stringify(R, null, 1));
    await ctx.close();
  }
  const g = (f) => med(rows.map((r) => { try { return f(r); } catch { return null; } }));
  out[vp.name] = {
    bootMs: g((r) => r.boot.booted), firstTree: g((r) => r.boot.firstTree), bootWorst: g((r) => r.boot.worst),
    openSecFirst: g((r) => r.openSection.first), openSecWorst: g((r) => r.openSection.worst), expandFirst: g((r) => r.expandRoot.first), expandWorst: g((r) => r.expandRoot.worst), treeRows: g((r) => r.expandRoot.rows), renderTreeMs: g((r) => r.renderTreeMs),
    rootFirst: g((r) => r.clickRoot.first), rootWhole: g((r) => r.clickRoot.whole), rootWorst: g((r) => r.clickRoot.worst), rootCards: g((r) => r.clickRoot.cards),
    bigFirst: g((r) => r.clickBig.first), bigWhole: g((r) => r.clickBig.whole), bigWorst: g((r) => r.clickBig.worst), bigCards: g((r) => r.clickBig.cards),
    smartOpen: g((r) => r.openSmart.first), smartWorst: g((r) => r.openSmart.worst), renderTreeSmartOpenMs: g((r) => r.renderTreeSmartOpenMs), renderTreeSecSFMs: g((r) => r.renderTreeSecSFMs), sfEnxFirst: g((r) => r.clickSfEnx.first), sfEnxWhole: g((r) => r.clickSfEnx.whole), sfEnxWorst: g((r) => r.clickSfEnx.worst), sfEnxCards: g((r) => r.clickSfEnx.cards), openNote: g((r) => r.openNote.first), openNoteWorst: g((r) => r.openNote.worst), openBig: g((r) => r.openBig.first), openBigWorst: g((r) => r.openBig.worst),
    key: g((r) => r.keystroke.keyToPaint), keyWorst: g((r) => r.keystroke.worst),
    ...Object.fromEntries(Object.keys(rows[0].direct).map((k) => [k, g((r) => r.direct[k])])),
  };
  console.log('MEDIAN ' + vp.name + ' ' + JSON.stringify(out[vp.name]));
}
writeFileSync(DIR + (argv.includes('--snippet') ? 'out-snip-median.json' : 'out-median.json'), JSON.stringify(out, null, 1));
await srv.close();
