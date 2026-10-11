/* S4 groundwork (not a check): what a save costs once the notebook holds the Evernote
   import's ~45 MB of note text. Reports numbers only.
     node tools/s4-save-measure.mjs [--notes=9000] [--kb=5]
   Per size (1440 laptop; 390 phone with the CPU throttled ×4), main-thread time
   (the CDP TaskDuration delta, so the throttle is in it) of:
     edit1     one edited note → persist(), until the journal write has committed
     ckpt      the 30 s idle checkpoint: the full copy rewritten into IndexedDB
     batch500  500 new notes (~2.5 MB) added → one persist() (one import batch)
     whole     the pre-journal path, for comparison: JSON.stringify(DB) and _idbPut(DB)
     boot      a reload: the full copy read back and the journal laid over it
   plus the share of persist() taken by _stampRecordTouches / snapshotState / _save. */
import { openApp, seedDB } from './harness.mjs';

const arg = (k, d) => +((process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1]) || d;
const NN = arg('notes', 9000), KB = arg('kb', 5);
const SIZES = [
  { name: 'laptop', width: 1440, height: 900, throttle: 1, touch: false },
  { name: 'phoneX4', width: 390, height: 844, throttle: 4, touch: true },
];

const WRAP = `(() => {
  const T = window.__T = {};
  for (const n of ['persist','_stampRecordTouches','snapshotState','_save','_ljSave','_collect','_histCapture','pushToCloud','scheduleAutoSave']) {
    const o = window[n]; if (typeof o !== 'function') continue;
    const w = function (...a) { const t = performance.now(); try { return o.apply(this, a); } finally { const e = T[n] || (T[n] = { n: 0, ms: 0 }); e.n++; e.ms += performance.now() - t; } };
    try { window[n] = w; } catch (_) {}
    if (n === 'persist') { try { persist = w; } catch (_) {} }
  }
})()`;

const out = {};
for (const vp of SIZES) {
  const app = await openApp({ viewport: { width: vp.width, height: vp.height }, db: seedDB(), hasTouch: vp.touch });
  const { page } = app;
  page.setDefaultTimeout(600000);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const task = async () => (await cdp.send('Performance.getMetrics')).metrics.find((m) => m.name === 'TaskDuration').value * 1000;
  const settle = () => page.evaluate(() => _ljChain.catch(() => {}).then(() => new Promise((r) => setTimeout(r, 50))));
  const measure = async (fn, arg) => {
    await page.evaluate(() => { for (const k of Object.keys(window.__T || {})) delete window.__T[k]; });
    const t0 = await task();
    const call = await page.evaluate(fn, arg);
    await settle();
    const t1 = await task();
    const steps = await page.evaluate(() => Object.fromEntries(Object.entries(window.__T || {}).map(([k, v]) => [k, Math.round(v.ms)])));
    return { mainThreadMs: Math.round(t1 - t0), call, steps };
  };

  const seeded = await page.evaluate(({ NN, KB }) => {
    const s = 'The quick brown fox jumps over the lazy dog. ', reps = Math.round(KB * 1024 / s.length);
    const t0 = Date.now() - 5e6;
    for (let i = 0; i < NN; i++) { const at = new Date(t0 + i * 500).toISOString(); DB.articles.push({ id: 'n' + i, title: 'Note ' + i, content: '<p>' + s.repeat(reps) + i + '</p>', folderIds: ['f1'], tags: [], createdAt: at, updatedAt: at, kind: 'general' }); }
    persist();
    const textMB = DB.articles.reduce((n, a) => n + a.content.length, 0) / 1048576;
    return { notes: DB.articles.length, textMB: Math.round(textMB * 10) / 10, journal: _ljWanted() };
  }, { NN, KB });
  await settle();
  await page.evaluate(() => new Promise((r) => setTimeout(r, 1000)));
  await page.evaluate(WRAP);
  if (vp.throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: vp.throttle });
  const R = { seeded };

  R.edit1 = await measure(() => { clearTimeout(_ljCkptTimer); const a = DB.articles.find((x) => x.id === 'n77'); a.title = 'Edited ' + Date.now(); a.updatedAt = new Date().toISOString(); const t = performance.now(); persist(); clearTimeout(_ljCkptTimer); return Math.round(performance.now() - t); });
  R.edit1b = await measure(() => { clearTimeout(_ljCkptTimer); const a = DB.articles.find((x) => x.id === 'n78'); a.content += '<p>x</p>'; a.updatedAt = new Date().toISOString(); const t = performance.now(); persist(); clearTimeout(_ljCkptTimer); return Math.round(performance.now() - t); });
  R.ckpt = await measure(() => { const f = _ljStat.full; const t = performance.now(); _ljCheckpoint(); return { syncMs: Math.round(performance.now() - t), fullBefore: f }; });
  R.ckpt.fullAfter = await page.evaluate(() => _ljStat.full);
  R.batch500 = await measure((NN) => {
    clearTimeout(_ljCkptTimer);
    const s = 'Imported text, as an Evernote note might hold it. ', now = new Date().toISOString();
    for (let i = 0; i < 500; i++) DB.articles.push({ id: 'imp' + i, title: 'Imported ' + i, content: '<div>' + s.repeat(100) + i + '</div>', folderIds: ['f1'], tags: ['evernote'], createdAt: now, updatedAt: now, kind: 'general' });
    const t = performance.now(); persist(); clearTimeout(_ljCkptTimer); return Math.round(performance.now() - t);
  }, NN);
  R.whole = await measure(() => { let t = performance.now(); const j = JSON.stringify(DB); const str = Math.round(performance.now() - t); t = performance.now(); const p = _idbPut('s4-measure-scratch', DB); const put = Math.round(performance.now() - t); window.__p = p; return { stringifyMs: str, idbPutSyncMs: put, jsonMB: Math.round(j.length / 1048576 * 10) / 10 }; });
  await page.evaluate(() => window.__p.then(() => _idbPut('s4-measure-scratch', null)));
  R.ckpt2 = await measure(() => { const t = performance.now(); _ljCheckpoint(); return Math.round(performance.now() - t); });

  /* boot: reload and time until the app says it has booted */
  if (vp.throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await page.evaluate(() => new Promise((r) => setTimeout(r, 500)));
  await page.addInitScript(() => { try { localStorage.removeItem('my-notebook-v1'); } catch (_) {} });
  const cdp2 = vp.throttle > 1 ? cdp : null;
  const tB = Date.now();
  if (cdp2) await cdp2.send('Emulation.setCPUThrottlingRate', { rate: vp.throttle });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__appBooted === true, null, { timeout: 600000 });
  R.boot = { wallMs: Date.now() - tB, notes: await page.evaluate(() => DB.articles.length) };

  out[vp.name] = R;
  console.log('S4M ' + vp.name + ' ' + JSON.stringify(R));
  console.log('S4M errors ' + JSON.stringify(app.errors.filter((e) => !/best-effort/.test(e)).slice(0, 5)));
  await app.close();
}
console.log('S4M_DONE ' + JSON.stringify(out));
