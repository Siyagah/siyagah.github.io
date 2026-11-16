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

export async function measureAll(root, reps, vps = [[1440, 900, 1, false], [390, 844, 4, true]], startReps = 3) {
  const rows = [];
  for (const [w, h, th, touch] of vps) {
    const A = await launch({ root, w, h, th: 1, touch });
    try {
      await seedOwner(A.page, NOTES); await sleep(2000);
      if (th > 1) await A.cdp.send('Emulation.setCPUThrottlingRate', { rate: th });
      const ui = argv.includes('--start-only') ? { open: { script: 0, paint: 0, parts: {} }, key: { script: 0, autosave: 0 }, save30: { ms: 0 } } : await measureUI(A.page, reps);
      const st = await measureStart(A.page, startReps);
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


/* ───────────────────────────── the checks (block 160) ─────────────────────────────
   160a the measurement table, before (origin/main) and after (this build), at 28,600 notes: opening a note <= 50 ms of script at 390 x4,
        one keystroke <= 16 ms of script, the first render() >= 30 % faster than main's, no page errors
   160b oracle: for an in-place change of every kind of record (edit, add, remove) the records stamped by "open a note, then save" are exactly
        the ones a full save stamps (the head-only save of an open defers the sweep, it never drops it)
   160c opening 50 notes in a row changes nothing in JSON.stringify(DB) except what it changes on main (same seed, both builds)
   160d save, update, reopen (keep1116): a note, a folder and a setting changed, a note changed in place and never saved but followed by an open;
        reloaded as the NEXT version: everything kept, the open note remembered
   160e 390 / 820 / 1440 with the journal running: open, type, autosave, open again; no page errors
   `--unpatched` is not needed: the "before" is main's copy, made here. */
import { report } from './harness.mjs';
import { mkdtempSync, writeFileSync, readFileSync, cpSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const r = report('J117 part 3 — opening a note and the first screen at 28,600 notes');
const only = arg('only'); const want = (t) => !only || only.split(',').some((o) => t.startsWith(o));
function makeBase() {
  const dir = mkdtempSync(join(tmpdir(), 'j117c-base-'));
  for (const f of ['index.html', 'sw.js', 'manifest.json']) writeFileSync(join(dir, f), execFileSync('git', ['show', `origin/main:${f}`], { encoding: 'buffer', maxBuffer: 1 << 28 }));
  return dir;
}
const here = new URL('..', import.meta.url).pathname;
/* a notebook of N notes (journal mode starts at 1,500) with one record in each of the other collections */
const seedMid = (page, N) => page.evaluate((N) => {
  const T = '2026-01-01T00:00:00.000Z';
  DB.sections = [{ id: 'sec-1', name: 'My Notebooks', order: 0, updatedAt: T }, { id: 'sec-2', name: 'Two', order: 1, updatedAt: T }];
  DB.folders = [{ id: 'f1', name: '(001) A', parentId: null, order: 1, sectionId: 'sec-1', updatedAt: T }, { id: 'f2', name: '(002) B', parentId: null, order: 2, sectionId: 'sec-1', updatedAt: T }, { id: 'f3', name: 'Sub', parentId: 'f1', order: 1, updatedAt: T }];
  DB.articles = []; DB.trash = []; DB.tombstones = [];
  for (let i = 0; i < N; i++) DB.articles.push({ id: 'n' + i, title: 'Note ' + i, content: '<p>Body ' + i + '</p>', folderIds: [i % 2 ? 'f1' : 'f2'], tags: i % 5 ? [] : ['t'], createdAt: T, updatedAt: T, kind: 'general' });
  DB.calEvents = [{ id: 'ev1', title: 'Dentist', date: '2026-10-01', allDay: true, createdAt: T, updatedAt: T }];
  DB.calCategories = [{ id: 'cc1', name: 'Health', icon: '🏥', color: '#10B981', order: 0, updatedAt: T }];
  DB.myFavCats = [{ id: 'fav1', name: 'Music', icon: '🎵', order: 0, updatedAt: T }];
  DB.folderGroups = [{ id: 'fg-1', name: 'Work', icon: '📁', order: 1, updatedAt: T }];
  DB.noteKindCats = [{ id: 'cat-x', name: 'Extra', icon: '📦', order: 1, updatedAt: T }];
  DB.noteKinds = [{ id: 'general', name: 'General', color: '#888888', nag: false, order: 1, catId: 'cat-x', updatedAt: T }, { id: 'k2', name: 'Idea', color: '#aa0000', nag: false, order: 2, catId: 'cat-x', updatedAt: T }];
  DB.jebPockets = [{ id: 'jp1', name: 'Quick', icon: '✓', color: '#FFF1A8', order: 0, createdAt: T, updatedAt: T }];
  DB.jeb = [{ id: 'ji1', pocketId: 'jp1', text: 'Call', done: false, folderIds: [], tags: [], kind: null, journal: false, order: 0, createdAt: T, updatedAt: T }];
  DB.globalTags = ['t']; DB.theme = DB.theme || {};
  _seedThemeSnap(); _seedRecSnap(); persist(); _histReset();
  return DB.articles.length;
}, N);
const settle = (page, ms = 1500) => page.waitForTimeout(ms);

if (want('160a')) {
  const base = makeBase();
  try {
    const hl50 = hostLimit(50), hl16 = hostLimit(16);
    const before = (await measureAll(base, 3, [[390, 844, 4, true]], 5))[0];
    const after = (await measureAll(undefined, 3, [[1440, 900, 1, false], [390, 844, 4, true]], 5));
    const a4 = after[1];
    const row = (x, tag) => `| ${tag} | ${x.vp} | ${x.open.script.toFixed(0)} | ${x.open.paint.toFixed(0)} | ${(x.open.parts._save ?? 0).toFixed(0)} | ${x.key.script.toFixed(1)} | ${x.key.autosave.toFixed(0)} | ${x.start.render} | ${x.start.booted} | ${x.save30.ms.toFixed(0)} |`;
    console.log('\n| build | viewport | open: script ms | open: to paint | of it _save | keystroke ms | autosave ms | first render() ms | booted ms | save after 30 notes ms |\n|---|---|---|---|---|---|---|---|---|---|\n' + [row(before, 'main'), ...after.map((x) => row(x, 'v06.00'))].join('\n') + '\n');
    console.log('first render() split, main @390 x4: ' + JSON.stringify(before.start.rt) + '\nfirst render() split, v06.00 @390 x4: ' + JSON.stringify(a4.start.rt));
    r.check(a4.open.script <= hl50.ms, `160a opening a note is <= ${hl50.text} ms of script at 390 x4, 28,600 notes (main ${before.open.script.toFixed(0)} ms, now ${a4.open.script.toFixed(0)} ms)`);
    r.check(a4.key.script <= hl16.ms, `160a one keystroke is <= ${hl16.text} ms of script outside the debounce (now ${a4.key.script.toFixed(1)} ms)`);
    r.check(a4.start.render <= before.start.render * 0.7, `160a the first render() is >= 30 % faster (main ${before.start.render} ms, now ${a4.start.render} ms, ${Math.round(100 - 100 * a4.start.render / before.start.render)} % less)`);
    r.check(after.every((x) => x.errors === 0) && before.errors === 0, '160a no page errors while measuring');
  } catch (e) { r.check(false, '160a threw', String(e && e.stack || e).slice(0, 500)); }
}

if (want('160b')) {
  let A = null;
  try {
    A = await launch({ w: 1440, h: 900 });
    await seedMid(A.page, 1600); await settle(A.page);
    const res = await A.page.evaluate(async () => {
      const COLLS = ['articles', 'folders', 'sections', 'calEvents', 'calCategories', 'noteKinds', 'noteKindCats', 'myFavCats', 'folderGroups', 'jebPockets', 'jeb'];
      const field = { articles: 'title', folders: 'name', sections: 'name', calEvents: 'title', calCategories: 'name', noteKinds: 'name', noteKindCats: 'name', myFavCats: 'name', folderGroups: 'name', jebPockets: 'name', jeb: 'text' };
      const ua = () => { const o = {}; COLLS.forEach((c) => (DB[c] || []).forEach((x) => { o[c + '~' + x.id] = x.updatedAt; })); return o; };
      const stampedSince = (b) => { const a = ua(), out = []; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (a[k] !== b[k]) out.push(k + (b[k] === undefined ? '+' : a[k] === undefined ? '-' : '')); return out.sort(); };
      const ops = [];
      for (const c of COLLS) {
        ops.push([c + ' edit', () => { const x = DB[c][DB[c].length > 3 ? 3 : 0]; x[field[c]] = x[field[c]] + ' edited'; }]);
        ops.push([c + ' add', () => { const x = JSON.parse(JSON.stringify(DB[c][0])); x.id = 'new-' + c; x[field[c]] = 'added'; DB[c].push(x); }]);
        ops.push([c + ' remove', () => { DB[c].splice(DB[c].length > 3 ? 3 : 0, 1); }]);
      }
      ops.push(['note folder + tag', () => { const a = DB.articles[10]; a.folderIds = ['f3']; a.tags = ['zz']; }]);
      ops.push(['note favourite + pin', () => { const a = DB.articles[11]; a.favourite = true; a.pinned = true; }]);
      ops.push(['folder move', () => { DB.folders[2].parentId = 'f2'; }]);
      const out = { bad: [], n: 0, deferred: 0 };
      for (const [name, op] of ops) {
        const snap = {}; COLLS.forEach((c) => { snap[c] = JSON.stringify(DB[c]); });
        const reset = () => { COLLS.forEach((c) => { DB[c] = JSON.parse(snap[c]); }); _seedRecSnap(); _seedThemeSnap(); };
        /* OLD: the change, then a full save */
        reset(); const b0 = ua(); op(); _save(); const sOld = stampedSince(b0);
        /* NEW: the change, an open (head-only save), then the next ordinary save */
        reset(); const b1 = ua(); op(); selArt('n' + (name.length % 50)); const mid = stampedSince(b1); _save(); const sNew = stampedSince(b1);
        out.n++; if (mid.length === 0 && sOld.length) out.deferred++;
        if (JSON.stringify(sOld) !== JSON.stringify(sNew) || !sOld.length) out.bad.push(name + ': old ' + JSON.stringify(sOld) + ' new ' + JSON.stringify(sNew));
        reset();
      }
      return out;
    });
    r.check(res.bad.length === 0 && res.n >= 35, `160b the records stamped by "open a note, then save" are exactly the ones a full save stamps, for ${res.n} operations over 11 kinds of record (${res.deferred} were left for the next save, none dropped)`, res.bad.slice(0, 4).join(' | '));
    r.check(A.errors.length === 0, '160b no page errors', A.errors.slice(0, 3).join(' | '));
  } catch (e) { r.check(false, '160b threw', String(e && e.stack || e).slice(0, 500)); } finally { if (A) await A.close(); }
}

if (want('160c')) {
  const base = makeBase();
  const runOne = async (root) => {
    const A = await launch({ root, w: 1440, h: 900 });
    try {
      await seedMid(A.page, 1600); await settle(A.page, 800);
      const o = await A.page.evaluate(() => {
        const norm = () => { const d = JSON.parse(JSON.stringify(DB)); delete d.themeAt; if (d.theme) delete d.theme.lastArticle; return JSON.stringify(d); };
        const before = norm();
        for (let i = 0; i < 50; i++) selArt('n' + (i * 7));
        const after = norm();
        return { same: before === after, last: DB.theme.lastArticle, at: Object.keys(DB.themeAt || {}).filter((k) => /lastArticle/.test(k)), len: before.length };
      });
      return { ...o, errors: A.errors.length };
    } finally { await A.close(); }
  };
  try {
    const oldR = await runOne(base), newR = await runOne(undefined);
    r.check(oldR.same && newR.same && oldR.last === newR.last && JSON.stringify(oldR.at) === JSON.stringify(newR.at), '160c opening 50 notes in a row changes nothing in JSON.stringify(DB) except theme.lastArticle (+ its stamp), same as main', JSON.stringify({ oldR, newR }));
    r.check(oldR.errors + newR.errors === 0, '160c no page errors');
  } catch (e) { r.check(false, '160c threw', String(e && e.stack || e).slice(0, 500)); }
}

if (want('160d')) {
  const dir = mkdtempSync(join(tmpdir(), 'j117c-next-'));
  for (const f of ['index.html', 'sw.js', 'manifest.json']) writeFileSync(join(dir, f), readFileSync(join(here, f)));
  try { cpSync(join(here, 'icons'), join(dir, 'icons'), { recursive: true }); } catch {}
  let A = null;
  try {
    A = await launch({ root: dir, w: 1440, h: 900 });
    await seedMid(A.page, 1600); await settle(A.page, 1000);
    await A.page.evaluate(() => {
      const a = DB.articles.find((x) => x.id === 'n20'); a.title = 'Changed note title'; a.updatedAt = new Date().toISOString();
      const f = DB.folders.find((x) => x.id === 'f2'); f.name = '(002) Renamed folder'; f.updatedAt = new Date().toISOString();
      DB.theme.zzJ117 = 'kept-setting';
      persist();
    });
    await settle(A.page, 800);
    /* a note changed in place, never saved by its owner, then an open: the open's head-only save must not lose it */
    await A.page.evaluate(() => { DB.articles.find((x) => x.id === 'n30').title = 'In place, no save'; selArt('n44'); });
    await settle(A.page, 800);
    await A.page.evaluate(() => { window.dispatchEvent(new Event('pagehide')); });
    await settle(A.page, 800);
    /* the NEXT version: the same origin serves a copy with the version moved on */
    writeFileSync(join(dir, 'index.html'), readFileSync(join(dir, 'index.html'), 'utf8').replace('<meta name="app-version" content="06.00">', '<meta name="app-version" content="06.01">'));
    writeFileSync(join(dir, 'sw.js'), readFileSync(join(dir, 'sw.js'), 'utf8').replace("'v06.00.01'", "'v06.01.01'"));
    await A.page.reload({ waitUntil: 'domcontentloaded' });
    await A.page.waitForFunction(() => window.__appBooted === true, null, { timeout: 120000 });
    const k = await A.page.evaluate(() => ({ v: document.querySelector('meta[name="app-version"]').content, n20: (DB.articles.find((x) => x.id === 'n20') || {}).title, f2: (DB.folders.find((x) => x.id === 'f2') || {}).name, set: DB.theme.zzJ117, n30: (DB.articles.find((x) => x.id === 'n30') || {}).title, last: DB.theme.lastArticle, count: DB.articles.length }));
    r.check(k.v === '06.01' && k.n20 === 'Changed note title' && k.f2 === '(002) Renamed folder' && k.set === 'kept-setting' && k.n30 === 'In place, no save' && k.last === 'n44' && k.count === 1600, '160d changed a note, a folder and a setting (and a note in place before an open), reloaded as the next version: all kept, the open note remembered', JSON.stringify(k));
    r.check(A.errors.length === 0, '160d no page errors', A.errors.slice(0, 3).join(' | '));
  } catch (e) { r.check(false, '160d threw', String(e && e.stack || e).slice(0, 500)); } finally { if (A) await A.close(); }
}

if (want('160e')) {
  for (const [w, h, touch] of [[390, 844, true], [820, 1180, true], [1440, 900, false]]) {
    let A = null;
    try {
      A = await launch({ w, h, touch });
      await seedMid(A.page, 1600); await settle(A.page, 800);
      const o = await A.page.evaluate(async () => {
        const tick = () => new Promise((rr) => setTimeout(rr, 150));
        selFolder('f1'); await tick();
        const cards = [...document.querySelectorAll('#p2c .ar')]; cards[1].click(); await tick();
        const first = ST.article; startEdit(); await tick();
        const ed = document.getElementById('ed'); ed.focus(); const sel = getSelection(), rg = document.createRange(); rg.selectNodeContents(ed.querySelector('p') || ed); rg.collapse(false); sel.removeAllRanges(); sel.addRange(rg);
        document.execCommand('insertText', false, 'Z'); await new Promise((rr) => setTimeout(rr, 2600));
        const typed = DB.articles.find((x) => x.id === first).content.includes('Z');
        cancelEdit(); await tick(); const cards2 = [...document.querySelectorAll('#p2c .ar')]; cards2[3].click(); await tick();
        return { first, typed, second: ST.article, last: DB.theme.lastArticle, p3: !!document.querySelector('#p3c *') };
      });
      r.check(o.typed && o.second && o.second !== o.first && o.last === o.second && o.p3, `160e@${w} open, type, autosave, open again with the journal running`, JSON.stringify(o));
      r.check(A.errors.length === 0, `160e@${w} no page errors`, A.errors.slice(0, 3).join(' | '));
    } catch (e) { r.check(false, `160e@${w} threw`, String(e && e.stack || e).slice(0, 500)); } finally { if (A) await A.close(); }
  }
}
process.exit(r.finish() ? 1 : 0);
