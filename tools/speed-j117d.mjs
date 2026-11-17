#!/usr/bin/env node
/* tools/speed-j117d.mjs — v06.03, J117 part 4 (block 162): a save touches only the notes it changed.
   `node tools/speed-j117d.mjs --measure [--before=<ref>] [--notes=28600] [--reps=5] [--no-before]`  prints the before/after table (not a check).
   Without --measure it runs the checks 162a–162e (the second half of this file).
   The "before" build is a PINNED commit (default 09a3380 = v06.01), never origin/main: a check that compares against main stops
   meaning anything the moment its own round merges (see BEFORE_REF in speed-j117c.mjs). */
import { playwright, serve, BLOCKED } from './harness.mjs';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const argv = process.argv.slice(2);
const arg = (k, d = '') => { const a = argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
export const NOTES = +arg('notes') || 28600;
export const BEFORE_REF = arg('before') || '09a3380';
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
export const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

export function makeBase(ref = BEFORE_REF) {
  const dir = mkdtempSync(join(tmpdir(), 'j117d-base-'));
  for (const f of ['index.html', 'sw.js', 'manifest.json']) writeFileSync(join(dir, f), execFileSync('git', ['show', `${ref}:${f}`], { encoding: 'buffer', maxBuffer: 1 << 28 }));
  return dir;
}

export async function launch({ root, w, h, th = 1, touch = false } = {}) {
  const pw = await playwright();
  const srv = await serve(root);
  const browser = await pw.chromium.launch();
  const ctx = await browser.newContext(touch ? { viewport: { width: w, height: h }, hasTouch: true, isMobile: true, serviceWorkers: 'block' } : { viewport: { width: w, height: h }, serviceWorkers: 'block' });
  for (const pattern of BLOCKED) await ctx.route(pattern, (r) => r.abort());
  await ctx.route('**://mappingmyjourney.com/**', (r) => r.abort());
  const errors = [];
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e));
  await page.goto(srv.base + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree'), null, { timeout: 280000 });
  await page.waitForTimeout(300);
  const cdp = await ctx.newCDPSession(page);
  if (th > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: th });
  return { page, errors, cdp, srv, close: async () => { await browser.close(); await srv.close(); } };
}

/* a notebook of N notes (journal mode starts at 1,500), ~4,000 folders, a Trash of 2,000 */
export function seedOwner(page, N) {
  return page.evaluate((N) => {
    const now = new Date().toISOString(), t0 = Date.now() - 9e6;
    DB.sections = []; for (let s = 1; s <= 6; s++) DB.sections.push({ id: 'sec-' + s, name: 'Section ' + s, order: s, updatedAt: now });
    DB.folders = []; const F = 4000;
    for (let i = 0; i < F; i++) { const top = i < 120; DB.folders.push(top ? { id: 'fo' + i, name: '(' + String(i + 1).padStart(3, '0') + ') Folder ' + i, parentId: null, order: i + 1, sectionId: 'sec-' + (1 + i % 6), updatedAt: now } : { id: 'fo' + i, name: 'Sub ' + i, parentId: 'fo' + (i % 120), order: i, updatedAt: now }); }
    DB.articles = []; DB.trash = []; DB.tombstones = [];
    const kinds = ['general', 'idea', 'task', 'quote'];
    for (let i = 0; i < N; i++) {
      const at = new Date(t0 + i * 300).toISOString();
      const pic = i % 9 === 0 ? '<p><img class="ed-img" data-pic="' + ('0'.repeat(63) + (i % 16).toString(16)) + '" data-mime="image/png" alt=""></p>' : '';
      DB.articles.push({ id: 'n' + i, title: 'Note ' + i, content: '<h2>Head ' + i + '</h2><p>Body ' + i + ' lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.</p>' + pic + '<p>More text for note ' + i + '.</p>', folderIds: ['fo' + (i % F)], tags: i % 3 === 0 ? ['big'] : [], createdAt: at, updatedAt: at, kind: kinds[i % 4] });
    }
    for (let i = 0; i < 2000; i++) DB.trash.push({ id: 'tr' + i, type: 'note', deletedAt: now, item: { id: 'tn' + i, title: 'Trashed ' + i, content: '<p>gone ' + i + '</p>', folderIds: [], tags: [], createdAt: now, updatedAt: now } });
    DB.globalTags = []; DB.tagColors = {}; DB.tagColorsAt = {};
    _seedThemeSnap(); _seedRecSnap(); persist(); _histReset();
    return DB.articles.length;
  }, N);
}

/* the three saves this round speeds up. "ms" is the SAVE itself (the persist()/_save()/_enxPersist() call), not the repaint after it. */
export async function measureSaves(page, reps = 5) {
  return await page.evaluate(async (reps) => {
    const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
    const tick = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
    const out = {};
    selFolder('fo5'); await tick(); await new Promise((r) => setTimeout(r, 500));
    const ids = DB.articles.filter((a) => a.folderIds[0] === 'fo5').slice(0, 12).map((a) => a.id);
    selArt(ids[0]); await tick(); startEdit(); await tick(); await new Promise((r) => setTimeout(r, 400));
    const ed = document.getElementById('ed'); ed.focus();
    const sel = getSelection(), r0 = document.createRange(); r0.selectNodeContents(ed.querySelector('p') || ed); r0.collapse(false); sel.removeAllRanges(); sel.addRange(r0);
    const K = [];
    for (let i = 0; i < reps; i++) { await new Promise((r) => setTimeout(r, 120)); document.execCommand('insertText', false, 'x'); const s0 = performance.now(); _edAutoSave(); K.push(performance.now() - s0); }
    out.autosave = med(K);
    cancelEdit(); await tick();
    /* a 30-note move: jmApply, with the repaint after the save left out of the number */
    const M = [], origPersist = window.persist;
    for (let i = 0; i < Math.min(reps, 3); i++) {
      const pick = DB.articles.slice(200 + i * 40, 230 + i * 40).map((a) => a.id);
      const pr = window.render, pt = window.persist; let t = 0;
      window.render = function () {}; 
      try { const s0 = performance.now(); jmApply(pick, 'fo' + (300 + i), 'add'); M.push(performance.now() - s0); } finally { window.render = pr; }
    }
    out.move30 = med(M);
    /* a 30-note import batch: 30 new notes then _enxPersist(ids) */
    const E = [];
    for (let i = 0; i < Math.min(reps, 3); i++) {
      const now = new Date().toISOString(), added = [];
      for (let j = 0; j < 30; j++) { const id = 'imp-' + i + '-' + j; added.push(id); DB.articles.push({ id, title: 'Imported ' + i + '-' + j, content: '<p>imported</p>', folderIds: ['fo9'], tags: [], createdAt: now, updatedAt: now, kind: 'general' }); }
      const s0 = performance.now(); _enxPersist([{ c: 'articles', add: added }]); E.push(performance.now() - s0);
    }
    out.import30 = med(E);
    return out;
  }, reps);
}

export async function measureAll(root, reps, vps) {
  const rows = [];
  for (const [w, h, th, touch] of vps) {
    const A = await launch({ root, w, h, touch });
    try {
      await seedOwner(A.page, NOTES); await sleep(2000);
      if (th > 1) await A.cdp.send('Emulation.setCPUThrottlingRate', { rate: th });
      const m = await measureSaves(A.page, reps);
      const row = { vp: w + (th > 1 ? ' x' + th : ''), notes: NOTES, ...m, errors: A.errors.length };
      rows.push(row); console.log('measure ' + JSON.stringify(row));
    } finally { await A.close(); }
  }
  return rows;
}

if (argv.includes('--measure')) {
  const vps = [[390, 844, 4, true], [1440, 900, 1, false]];
  const reps = +arg('reps') || 5;
  const L = ['| build | viewport | autosave ms | 30-note move ms | 30-note import batch ms |', '|---|---|---|---|---|'];
  if (!argv.includes('--no-before')) for (const x of await measureAll(makeBase(), reps, vps)) L.push(`| ${BEFORE_REF} | ${x.vp} | ${x.autosave.toFixed(0)} | ${x.move30.toFixed(0)} | ${x.import30.toFixed(0)} |`);
  if (!argv.includes('--only-before')) for (const x of await measureAll(arg('root') || undefined, reps, vps)) L.push(`| this build | ${x.vp} | ${x.autosave.toFixed(0)} | ${x.move30.toFixed(0)} | ${x.import30.toFixed(0)} |`);
  console.log('\n' + L.join('\n'));
  process.exit(0);
}

/* ───────────────────────────── the checks (block 162) ─────────────────────────────
   162a before (pinned commit) / after table at 390 x4 and 1440 x1, 28,600 notes: autosave <= 30 ms, a 30-note move <= 50 ms at 390 x4
   162b oracle: for each operation, (1) the targeted path then the full sweep, (2) the full sweep alone, same seed: every record's updatedAt, the journal's
        records and _s1Dirty end the same (an in-place edit nobody reported included)
   162c an in-place edit of a note the targeted save did NOT name, then a push / a received merge / a checkpoint / pagehide: the edit is stamped and reaches
        the other device (fake cloud, two devices)
   162d type in a note 40 times with autosave, reload as the NEXT version: the text, its noteHistory and every other note are as before
   162e 390 / 820 / 1440 with the journal running: no page errors */
import { report, hostLimit, seedDB } from './harness.mjs';
import { readFileSync, cpSync } from 'node:fs';
const r = report('J117 part 4 — a save touches only the notes it changed');
const only = arg('only'); const want = (t) => !only || only.split(',').some((o) => t.startsWith(o));
const here = new URL('..', import.meta.url).pathname;
const seedMid = (page, N) => page.evaluate((N) => {
  const T = '2026-01-01T00:00:00.000Z';
  DB.sections = [{ id: 'sec-1', name: 'My Notebooks', order: 0, updatedAt: T }];
  DB.folders = [{ id: 'f1', name: '(001) A', parentId: null, order: 1, sectionId: 'sec-1', updatedAt: T }, { id: 'f2', name: '(002) B', parentId: null, order: 2, sectionId: 'sec-1', updatedAt: T }, { id: 'f3', name: 'Sub', parentId: 'f1', order: 1, updatedAt: T }];
  DB.articles = []; DB.trash = []; DB.tombstones = [];
  for (let i = 0; i < N; i++) DB.articles.push({ id: 'n' + i, title: 'Note ' + i, content: '<p>Body ' + i + '</p>', folderIds: [i % 2 ? 'f1' : 'f2'], tags: i % 5 ? [] : ['t'], createdAt: T, updatedAt: T, kind: 'general' });
  DB.globalTags = ['t']; DB.theme = DB.theme || {};
  _seedThemeSnap(); _seedRecSnap(); persist(); _histReset();
  return DB.articles.length;
}, N);
const settle = (page, ms = 1500) => page.waitForTimeout(ms);

if (want('162a')) {
  const base = makeBase();
  try {
    const hl30 = hostLimit(30), hl50 = hostLimit(50);
    const vps = [[390, 844, 4, true], [1440, 900, 1, false]];
    const before = await measureAll(base, 3, vps), after = await measureAll(undefined, 3, vps);
    const row = (x, tag) => `| ${tag} | ${x.vp} | ${x.autosave.toFixed(0)} | ${x.move30.toFixed(0)} | ${x.import30.toFixed(0)} |`;
    console.log('\n| build | viewport | autosave ms | 30-note move ms | 30-note import batch ms |\n|---|---|---|---|---|\n' + [...before.map((x) => row(x, BEFORE_REF)), ...after.map((x) => row(x, 'this build'))].join('\n') + '\n');
    const a4 = after[0], b4 = before[0];
    r.check(a4.autosave <= hl30.ms, `162a the autosave is <= ${hl30.text} ms at 390 x4, 28,600 notes (before ${b4.autosave.toFixed(0)} ms, now ${a4.autosave.toFixed(0)} ms)`);
    r.check(a4.move30 <= hl50.ms, `162a a 30-note move saves in <= ${hl50.text} ms at 390 x4 (before ${b4.move30.toFixed(0)} ms, now ${a4.move30.toFixed(0)} ms)`);
    r.check(a4.import30 <= hl50.ms, `162a a 30-note import batch saves in <= ${hl50.text} ms at 390 x4 (before ${b4.import30.toFixed(0)} ms, now ${a4.import30.toFixed(0)} ms)`);
    r.check(after.every((x) => x.errors === 0) && before.every((x) => x.errors === 0), '162a no page errors while measuring');
  } catch (e) { r.check(false, '162a threw', String(e && e.stack || e).slice(0, 500)); }
}

if (want('162b')) {
  let A = null;
  try {
    A = await launch({ w: 1440, h: 900 });
    await seedMid(A.page, 1600); await settle(A.page);
    const res = await A.page.evaluate(async () => {
      const COLLS = ['articles', 'folders'];
      const snapDB = JSON.stringify({ a: DB.articles, f: DB.folders });
      /* every journal transaction is recorded: the last put of each key wins, as it would on disk */
      const J = new Map(); const tx0 = window._ljTx;
      window._ljTx = function (puts, m, c) { puts.forEach((p) => { if (p[0] !== 'h') J.set(p[0], p[1].g ? 'gone' : p[1].j); else J.set('h', p[1].j); }); return tx0.apply(this, arguments); };
      let hits = 0; const tg0 = window._tgGo; window._tgGo = function () { const v = tg0.apply(this, arguments); if (v === true) hits++; return v; };
      const stubOff = () => { window.__planKeep = window._tgPlan; window._tgPlan = () => null; };
      const stubOn = () => { window._tgPlan = window.__planKeep; };
      const ua = () => { const o = {}; COLLS.forEach((c) => DB[c].forEach((x) => { o[c + '~' + x.id] = x.updatedAt + '|' + (x.noteHistory ? x.noteHistory.length : 0); })); return o; };
      const reset = async () => {
        const s = JSON.parse(snapDB); DB.articles = s.a; DB.folders = s.f;
        _seedRecSnap(); _seedThemeSnap(); persist(); _histReset();   /* the journal and both baselines now hold exactly this state */
        await new Promise((rr) => setTimeout(rr, 250)); J.clear(); _s1Dirty.keys.clear(); _s1Dirty.gone.clear(); _s1Dirty.full = false;
      };
      const unreported = () => { DB.articles[77].title = 'edited in place, nobody told'; DB.folders[1].name = '(002) renamed in place'; };
      const ops = [
        ['autosave of one note', () => { const a = DB.articles[10]; a.content = a.content + '<p>typed</p>'; a.noteHistory = (a.noteHistory || []).concat([{ ts: new Date().toISOString(), title: a.title, content: '<p>old</p>' }]); unreported(); return () => _tgGo([{ c: 'articles', ids: ['n10'] }]); }],
        ['move 30 notes', () => { unreported(); const ids = DB.articles.slice(100, 130).map((x) => x.id); jmApply(ids, 'f3', 'add'); return null; }],
        ['move 30 notes (leave the old folder)', () => { unreported(); const ids = DB.articles.slice(200, 230).map((x) => x.id); jmApply(ids, 'f2', 'move'); return null; }],
        ['import batch: 1 folder + 30 notes', () => {
          unreported(); const now = '2026-02-02T00:00:00.000Z', added = [];
          DB.folders.push({ id: 'imp-f', name: 'Imported', parentId: null, order: 9, updatedAt: now });
          for (let j = 0; j < 30; j++) { const id = 'imp-' + j; added.push(id); DB.articles.push({ id, title: 'Imported ' + j, content: '<p>x</p>', folderIds: ['imp-f'], tags: [], createdAt: now, updatedAt: now, kind: 'general' }); }
          return () => _enxPersist([{ c: 'folders', add: ['imp-f'] }, { c: 'articles', add: added }]);
        }],
        ['an edit the caller did not stamp (title only)', () => { DB.articles[300].title = 'changed, not stamped'; unreported(); return () => _tgGo([{ c: 'articles', ids: ['n300'] }]); }],
      ];
      const out = { bad: [], n: 0, targeted: 0 };
      for (const [name, mk] of ops) {
        const run = async (targeted) => {
          await reset(); if (!targeted) stubOff();
          try {
            hits = 0; const act = mk();
            if (act) act();
            gotHits = hits;
            _save();   /* the full sweep that follows */
            await new Promise((rr) => setTimeout(rr, 300));
            return { ua: ua(), j: JSON.stringify([...J.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))), d: JSON.stringify([..._s1Dirty.keys].sort()) };
          } finally { if (!targeted) stubOn(); }
        };
        let gotHits = 0;
        const T = await run(true), tHits = gotHits, F = await run(false), fHits = gotHits;
        out.n++; if (tHits >= 1 && fHits === 0) out.targeted++; else out.bad.push(name + ': targeted path used ' + tHits + ' times, full-only run ' + fHits);
        const diffs = [];
        for (const k of new Set([...Object.keys(T.ua), ...Object.keys(F.ua)])) if (T.ua[k] !== F.ua[k]) diffs.push(k);
        /* timestamps differ by the clock between the two runs: compare WHICH records moved off the seed stamp, not the instant */
        const moved = (u) => Object.keys(u).filter((k) => !/^2026-01-01T00:00:00.000Z\|/.test(u[k])).sort().join(',');
        if (moved(T.ua) !== moved(F.ua)) out.bad.push(name + ': stamped ' + moved(T.ua).slice(0, 120) + ' vs ' + moved(F.ua).slice(0, 120));
        const jkeys = (s) => JSON.parse(s).map((x) => x[0]).join(',');
        if (jkeys(T.j) !== jkeys(F.j)) out.bad.push(name + ': journal keys differ');
        if (T.d !== F.d) out.bad.push(name + ': _s1Dirty differs');
        if (!/n77/.test(moved(T.ua)) || !/folders~f2/.test(moved(T.ua))) out.bad.push(name + ': the unreported edit was not stamped by the following sweep');
      }
      window._ljTx = tx0; window._tgGo = tg0;
      return out;
    });
    r.check(res.bad.length === 0 && res.n >= 5 && res.targeted === res.n, `162b for ${res.n} operations, the targeted path + the full sweep ends with the same stamped records, journal records and _s1Dirty as the full sweep alone (an in-place edit nobody reported included)`, res.bad.slice(0, 4).join(' | '));
    r.check(A.errors.length === 0, '162b no page errors', A.errors.slice(0, 3).join(' | '));
  } catch (e) { r.check(false, '162b threw', String(e && e.stack || e).slice(0, 500)); } finally { if (A) await A.close(); }
}

if (want('162c')) {
  const s1 = await import('./s1-fake.mjs');
  const { makeCloud, addDevice, on, push, sleep: sl, quiet, waitSeeded } = s1;
  const pw = await playwright(); const srv = await serve(); const browser = await pw.chromium.launch();
  const cloud = makeCloud(); const devs = [];
  try {
    const mk = async (name) => { const d = await addDevice(browser, srv.base, cloud, name, { width: 1440, height: 900 }, false, seedDB(), { recsOnly: true, builtinOff: true }); devs.push(d); return d; };
    const A = await mk('A');
    await on(A, () => { const a0 = DB.articles[0]; for (let i = 0; i < 1600; i++) DB.articles.push({ ...a0, id: 'j4-n' + i, title: 'Note ' + i, content: '<p>text ' + i + '</p>', folderIds: [...a0.folderIds], tags: [] }); persist(); });
    await push(cloud, A); await waitSeeded(cloud, A, 300000);
    const B = await mk('B');
    const caught = async (d) => { for (let i = 0; i < 300; i++) { if (await on(d, () => !!_s1RdCaught && !_s1RepUnmerged && !_pullInFlight).catch(() => false)) return true; await sl(200); } return false; };
    await caught(B);
    const triggers = {
      push: (d) => on(d, () => { persist(); flushPendingPush(); }),
      merge: async (d) => { await on(B, () => { const a = DB.articles.find((x) => x.id === 'j4-n5'); a.title = 'from B'; persist(); flushPendingPush(); }); await sl(3000); },
      checkpoint: (d) => on(d, () => { _ljCheckpoint(); }),
      pagehide: (d) => on(d, () => { window.dispatchEvent(new Event('pagehide')); }),
    };
    let i = 0;
    for (const [name, fire] of Object.entries(triggers)) {
      const nid = 'j4-n' + (100 + i), tgt = 'j4-n' + (200 + i); i++;
      const before = await on(A, (id) => DB.articles.find((x) => x.id === id).updatedAt, nid);
      await sl(20);
      /* a targeted save that names ONLY tgt; nid is changed in place and never reported */
      const used = await on(A, ([nid, tgt]) => { DB.articles.find((x) => x.id === nid).title = 'in place ' + nid; const a = DB.articles.find((x) => x.id === tgt); a.title = 'targeted ' + tgt; a.updatedAt = new Date().toISOString(); return _tgGo([{ c: 'articles', ids: [tgt] }]); }, [nid, tgt]);
      const mid = await on(A, (id) => DB.articles.find((x) => x.id === id).updatedAt, nid);
      await fire(A); await sl(500);
      const after = await on(A, (id) => DB.articles.find((x) => x.id === id).updatedAt, nid);
      await push(cloud, A); await sl(2500); await quiet(cloud, B);
      const onB = await on(B, ([nid, tgt]) => [(DB.articles.find((x) => x.id === nid) || {}).title, (DB.articles.find((x) => x.id === tgt) || {}).title], [nid, tgt]);
      r.check(used === true && mid === before && after > before && onB[0] === 'in place ' + nid && onB[1] === 'targeted ' + tgt, `162c after a targeted save, an in-place edit of another note is left alone (${used === true && mid === before ? 'yes' : 'NO'}), then stamped by the ${name} and reaches the other device`, JSON.stringify({ used, before, mid, after, onB }));
    }
    r.check(devs.every((d) => d.errors.length === 0), '162c no page errors', devs.flatMap((d) => d.errors).slice(0, 3).join(' | '));
  } catch (e) { r.check(false, '162c threw', String(e && e.stack || e).slice(0, 500)); }
  finally { await browser.close().catch(() => {}); await srv.close().catch(() => {}); }
}

if (want('162d')) {
  const dir = mkdtempSync(join(tmpdir(), 'j117d-next-'));
  for (const f of ['index.html', 'sw.js', 'manifest.json']) writeFileSync(join(dir, f), readFileSync(join(here, f)));
  try { cpSync(join(here, 'icons'), join(dir, 'icons'), { recursive: true }); } catch {}
  let A = null;
  try {
    A = await launch({ root: dir, w: 1440, h: 900 });
    await seedMid(A.page, 1600); await settle(A.page, 1000);
    const was = await A.page.evaluate(async () => {
      NH_CFG.minGapSec = 0;
      selArt('n40'); startEdit(); await new Promise((rr) => setTimeout(rr, 300));
      const ed = document.getElementById('ed'); ed.focus(); const sel = getSelection(), rg = document.createRange(); rg.selectNodeContents(ed.querySelector('p') || ed); rg.collapse(false); sel.removeAllRanges(); sel.addRange(rg);
      for (let i = 0; i < 40; i++) { document.execCommand('insertText', false, 'k' + i); _edAutoSave(); await new Promise((rr) => setTimeout(rr, 5)); }
      cancelEdit(); await new Promise((rr) => setTimeout(rr, 300));
      const a = DB.articles.find((x) => x.id === 'n40');
      return { content: a.content, nh: (a.noteHistory || []).length, updatedAt: a.updatedAt, others: JSON.stringify(DB.articles.filter((x) => x.id !== 'n40').map((x) => [x.id, x.title, x.content, x.updatedAt])).length };
    });
    await settle(A.page, 800);
    await A.page.evaluate(() => { window.dispatchEvent(new Event('pagehide')); }); await settle(A.page, 800);
    const m = readFileSync(join(dir, 'index.html'), 'utf8').match(/name="app-version" content="(\d+)\.(\d+)"/);
    const next = m[1] + '.' + String(+m[2] + 1).padStart(2, '0');
    writeFileSync(join(dir, 'index.html'), readFileSync(join(dir, 'index.html'), 'utf8').replace(`name="app-version" content="${m[1]}.${m[2]}"`, `name="app-version" content="${next}"`));
    writeFileSync(join(dir, 'sw.js'), readFileSync(join(dir, 'sw.js'), 'utf8').replace(`'v${m[1]}.${m[2]}.01'`, `'v${next}.01'`));
    await A.page.reload({ waitUntil: 'domcontentloaded' });
    await A.page.waitForFunction(() => window.__appBooted === true, null, { timeout: 120000 });
    const now = await A.page.evaluate(() => { const a = DB.articles.find((x) => x.id === 'n40'); return { v: document.querySelector('meta[name="app-version"]').content, content: a.content, nh: (a.noteHistory || []).length, updatedAt: a.updatedAt, others: JSON.stringify(DB.articles.filter((x) => x.id !== 'n40').map((x) => [x.id, x.title, x.content, x.updatedAt])).length, count: DB.articles.length }; });
    r.check(now.v === next && now.v !== m[1] + '.' + m[2] && now.content === was.content && now.content.includes('k39') && now.nh === was.nh && was.nh > 1 && now.updatedAt === was.updatedAt && now.others === was.others && now.count === 1600, `162d typed 40 times with autosave, reloaded as the next version (${next}): the text, its ${was.nh} history entries and every other note are as before`, JSON.stringify({ was: { ...was, content: was.content.slice(-30) }, now: { ...now, content: now.content.slice(-30) } }));
    r.check(A.errors.length === 0, '162d no page errors', A.errors.slice(0, 3).join(' | '));
  } catch (e) { r.check(false, '162d threw', String(e && e.stack || e).slice(0, 500)); } finally { if (A) await A.close(); }
}

if (want('162e')) {
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
        cancelEdit(); await tick();
        const ids = DB.articles.filter((x) => x.folderIds.includes('f1')).slice(0, 5).map((x) => x.id);
        jmApply(ids, 'f3', 'add'); await tick();
        const moved = ids.every((id) => DB.articles.find((x) => x.id === id).folderIds.includes('f3'));
        undo(); await tick();
        const undone = ids.every((id) => !DB.articles.find((x) => x.id === id).folderIds.includes('f3'));
        return { typed, moved, undone, tgn: _tgN };
      });
      r.check(o.typed && o.moved && o.undone, `162e@${w} type + autosave, move 5 notes, Undo puts them back, journal running`, JSON.stringify(o));
      r.check(A.errors.length === 0, `162e@${w} no page errors`, A.errors.slice(0, 3).join(' | '));
    } catch (e) { r.check(false, `162e@${w} threw`, String(e && e.stack || e).slice(0, 500)); } finally { if (A) await A.close(); }
  }
}
process.exit(r.finish() ? 1 : 0);
