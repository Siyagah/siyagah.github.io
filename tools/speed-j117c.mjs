#!/usr/bin/env node
/* tools/speed-j117c.mjs — v06.00, J117 part 3 (block 160): opening a note and the first screen at the owner's scale.
   `node tools/speed-j117c.mjs --measure [--notes=28600] [--reps=5] [--root=<dir>]`  prints the table (not a check).
   Without --measure it runs the checks 160a–160e (see the second half). `--root=<dir>` serves another copy of the app
   (e.g. a `git show origin/main` copy) so "before" and "after" come out of the same tool. */
import { playwright, serve, BLOCKED, hostLimit } from './harness.mjs';
const argv = process.argv.slice(2);
const arg = (k, d = '') => { const a = argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
export const NOTES = +arg('notes') || 28600;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
export const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

/* The owner's shape: ~4,000 folders over 6 sections (some nested), notes with pictures BY REFERENCE (data-pic, no src), a Trash of 2,000. */
export function seedOwner(page, N) {
  return page.evaluate((N) => {
    const now = new Date().toISOString(), t0 = Date.now() - 9e6;
    DB.sections = []; for (let s = 1; s <= 6; s++) DB.sections.push({ id: 'sec-' + s, name: 'Section ' + s, order: s, updatedAt: now });
    DB.folders = [];
    const F = 4000;
    for (let i = 0; i < F; i++) {
      const top = i < 120, par = top ? null : 'fo' + (i % 120);
      DB.folders.push(top ? { id: 'fo' + i, name: '(' + String(i + 1).padStart(3, '0') + ') Folder ' + i, parentId: null, order: i + 1, sectionId: 'sec-' + (1 + i % 6), updatedAt: now }
        : { id: 'fo' + i, name: 'Sub ' + i, parentId: par, order: i, updatedAt: now });
    }
    DB.articles = []; DB.trash = []; DB.tombstones = [];
    const kinds = ['general', 'idea', 'task', 'quote'];
    for (let i = 0; i < N; i++) {
      const at = new Date(t0 + i * 300).toISOString();
      const pic = i % 9 === 0 ? '<p><img class="ed-img" data-pic="' + ('0'.repeat(63) + (i % 16).toString(16)) + '" data-mime="image/png" alt=""></p>' : '';
      DB.articles.push({ id: 'n' + i, title: 'Note ' + i, content: '<h2>Head ' + i + '</h2><p>Body ' + i + ' lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.</p>' + pic + '<p>More text for note ' + i + '.</p>',
        folderIds: ['fo' + (i % F)], tags: i % 3 === 0 ? ['big'] : [], createdAt: at, updatedAt: at, kind: kinds[i % 4], favourite: i % 211 === 0, pinned: i % 307 === 0 });
    }
    for (let i = 0; i < 2000; i++) DB.trash.push({ id: 'tr' + i, type: 'note', deletedAt: now, item: { id: 'tn' + i, title: 'Trashed ' + i, content: '<p>gone ' + i + '</p>', folderIds: [], tags: [], createdAt: now, updatedAt: now } });
    DB.globalTags = []; DB.tagColors = {}; DB.tagColorsAt = {};
    _seedThemeSnap(); _seedRecSnap(); persist(); _histReset();
    return DB.articles.length;
  }, N);
}

/* Boot marks: the HTML is served with timing hooks around the first render (a COPY; the file on disk is not changed). */
export const BOOT_HOOK = (html) => html
  .replace("try{ performance.mark('siy-render0'); }catch(e){}", "try{ performance.mark('siy-render0'); }catch(e){} try{ window.__rwrap&&window.__rwrap(); }catch(e){}")
  .replace("try{ performance.mark('siy-render1'); }catch(e){}", "try{ performance.mark('siy-render1'); }catch(e){} try{ window.__rdone&&window.__rdone(); }catch(e){}");

export async function launch({ root = arg('root') || undefined, w, h, th = 1, touch = false, route = true } = {}) {
  const pw = await playwright();
  const srv = await serve(root);
  const browser = await pw.chromium.launch();
  const ctx = await browser.newContext(touch ? { viewport: { width: w, height: h }, hasTouch: true, isMobile: true, serviceWorkers: 'block' } : { viewport: { width: w, height: h }, serviceWorkers: 'block' });
  for (const pattern of BLOCKED) await ctx.route(pattern, (r) => r.abort());
  await ctx.route('**://mappingmyjourney.com/**', (r) => r.abort());
  const errors = [];
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e));
  await ctx.addInitScript(() => {
    window.__long = [];
    try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push({ s: Math.round(e.startTime), d: Math.round(e.duration) }))).observe({ entryTypes: ['longtask'] }); } catch {}
    /* cold-start split: every pane/step render() calls is timed once, as the first render() runs */
    window.__rt = {};
    window.__rwrap = () => {
      for (const n of ['renderTree', 'renderP2H', 'renderP2C', 'renderP3H', 'renderP3C', 'renderTabBar', 'updateTrashBtn', 'adjustP3Layout', '_applyHeadingStyles', 'jebRefresh']) {
        const f = window[n]; if (typeof f !== 'function') continue;
        window[n] = function () { const t = performance.now(); try { return f.apply(this, arguments); } finally { window.__rt[n] = (window.__rt[n] || 0) + performance.now() - t; } };
      }
    };
  });
  if (route) await page.route(/\/(index\.html)?(\?.*)?$/, async (r) => {
    const resp = await r.fetch(); const t = await resp.text(); await r.fulfill({ response: resp, body: BOOT_HOOK(t) });
  });
  await page.goto(srv.base + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree'), null, { timeout: 280000 });
  await page.waitForTimeout(300);
  const cdp = await ctx.newCDPSession(page);
  if (th > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: th });
  return { page, errors, cdp, close: async () => { await browser.close(); await srv.close(); } };
}

/* (a) open a note, (b) one keystroke, (d) a save after 30 notes changed — in the page, split by function */
export async function measureUI(page, reps = 5) {
  return await page.evaluate(async (reps) => {
    const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
    const tick = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
    const acc = {}; const NAMES = ['_save', '_stampRecordTouches', '_stampThemeTouches', 'renderP2C', 'renderP3H', 'renderP3C', 'snapshotState', '_ljSave', '_collect', 'saveArt', '_flushEd'];
    const orig = {};
    for (const n of NAMES) { orig[n] = window[n]; if (typeof orig[n] !== 'function') continue; window[n] = function () { const t = performance.now(); try { return orig[n].apply(this, arguments); } finally { acc[n] = (acc[n] || 0) + performance.now() - t; } }; }
    const reset = () => { for (const k of Object.keys(acc)) delete acc[k]; };
    const out = {};
    try {
      selFolder('fo5'); await tick(); await new Promise((r) => setTimeout(r, 500));
      const ids = DB.articles.filter((a) => a.folderIds[0] === 'fo5').slice(0, 12).map((a) => a.id);
      /* (a) open a note by a real click on its card; "script" = the synchronous handler, "paint" = to the next frame */
      const A = { script: [], paint: [], parts: {} };
      for (let i = 0; i < reps; i++) {
        const card = [...document.querySelectorAll('#p2c .ar')].find((c) => !c.classList.contains('sel'));
        if (!card) break;
        await new Promise((r) => setTimeout(r, 300)); reset();
        const t0 = performance.now(); card.click(); const t1 = performance.now(); await tick(); const t2 = performance.now();
        A.script.push(t1 - t0); A.paint.push(t2 - t0);
        for (const k of Object.keys(acc)) (A.parts[k] = A.parts[k] || []).push(acc[k]);
      }
      out.open = { script: med(A.script), paint: med(A.paint), parts: Object.fromEntries(Object.entries(A.parts).map(([k, v]) => [k, +med(v).toFixed(1)])) };
      /* (b) one keystroke in the open note */
      selArt(ids[0]); await tick(); startEdit(); await tick(); await new Promise((r) => setTimeout(r, 400));
      const ed = document.getElementById('ed'); ed.focus();
      const sel = getSelection(); const r0 = document.createRange(); r0.selectNodeContents(ed.querySelector('p') || ed); r0.collapse(false); sel.removeAllRanges(); sel.addRange(r0);
      const K = { script: [], save: [] };
      for (let i = 0; i < reps; i++) {
        await new Promise((r) => setTimeout(r, 120)); reset();
        const t0 = performance.now(); document.execCommand('insertText', false, 'x'); const t1 = performance.now();
        K.script.push(t1 - t0);
        /* the debounced autosave, called directly: the cost behind the keystroke */
        reset(); const s0 = performance.now(); _edAutoSave(); K.save.push(performance.now() - s0);
      }
      out.key = { script: med(K.script), autosave: med(K.save), parts: Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, +v.toFixed(1)])) };
      cancelEdit(); await tick();
      /* (d) a save after 30 notes changed at once (the shape of an import batch or a sync merge) */
      const D = [];
      for (let i = 0; i < Math.min(reps, 3); i++) {
        for (let j = 0; j < 30; j++) { const a = DB.articles[100 + i * 40 + j]; a.title = a.title.replace(/ ·.*$/, '') + ' · ' + i; }
        reset(); const t0 = performance.now(); persist(); renderP2C(); D.push(performance.now() - t0);
      }
      out.save30 = { ms: med(D), parts: Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, +v.toFixed(1)])) };
    } finally { for (const n of NAMES) if (typeof orig[n] === 'function') window[n] = orig[n]; }
    return out;
  }, reps);
}

/* (c) the cold start: reload, read the marks and the per-step split of the first render() */
export async function measureStart(page, reps = 3) {
  const runs = [];
  for (let i = 0; i < reps; i++) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__appBooted === true, null, { timeout: 280000 });
    runs.push(await page.evaluate(() => {
      const m = (n) => { const e = performance.getEntriesByName(n)[0]; return e ? Math.round(e.startTime) : null; };
      const rt = {}; for (const k of Object.keys(window.__rt || {})) rt[k] = Math.round(window.__rt[k]);
      const fp = (performance.getEntriesByType('paint').find((e) => e.name === 'first-contentful-paint') || {}).startTime;
      return { fp: fp ? Math.round(fp) : null, r0: m('siy-render0'), r1: m('siy-render1'), booted: Math.round(performance.now()), rt };
    }));
  }
  const mm = (k) => med(runs.map((r) => r[k] ?? 0));
  const rt = {}; for (const k of Object.keys(runs[0].rt)) rt[k] = med(runs.map((r) => r.rt[k] ?? 0));
  const r = { fp: mm('fp'), loadDBEnds: mm('r0'), render: mm('r1') - mm('r0'), r1: mm('r1'), booted: mm('booted'), rt };
  return r;
}

export async function measureAll(root, reps) {
  const rows = [];
  for (const [w, h, th, touch] of [[1440, 900, 1, false], [390, 844, 4, true]]) {
    const A = await launch({ root, w, h, th: 1, touch });
    try {
      await seedOwner(A.page, NOTES); await sleep(2000);
      if (th > 1) await A.cdp.send('Emulation.setCPUThrottlingRate', { rate: th });
      const ui = argv.includes('--start-only') ? { open: { script: 0, paint: 0, parts: {} }, key: { script: 0, autosave: 0 }, save30: { ms: 0 } } : await measureUI(A.page, reps);
      const st = await measureStart(A.page, 3);
      const row = { vp: w + (th > 1 ? ' x' + th : ''), notes: NOTES, ...ui, start: st, errors: A.errors.length };
      rows.push(row); console.log('measure ' + JSON.stringify(row));
    } finally { await A.close(); }
  }
  return rows;
}

if (argv.includes('--measure')) {
  const rows = await measureAll(arg('root') || undefined, +arg('reps') || 5);
  const L = [];
  L.push('| viewport | open note: script | open note: to paint | _save | _stampRecordTouches | renderP3H | renderP3C | renderP2C | key (script) | autosave | first render() | load → render0 | booted | save after 30 notes |');
  L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) {
    const p = r.open.parts;
    L.push(`| ${r.vp} | ${r.open.script.toFixed(0)} | ${r.open.paint.toFixed(0)} | ${p._save ?? '-'} | ${p._stampRecordTouches ?? '-'} | ${p.renderP3H ?? '-'} | ${p.renderP3C ?? '-'} | ${p.renderP2C ?? '-'} | ${r.key.script.toFixed(1)} | ${r.key.autosave.toFixed(0)} | ${r.start.render} | ${r.start.loadDBEnds} | ${r.start.booted} | ${r.save30.ms.toFixed(0)} |`);
  }
  console.log('\n' + L.join('\n'));
  for (const r of rows) console.log('first render() split @' + r.vp + ': ' + JSON.stringify(r.start.rt));
  process.exit(0);
}
