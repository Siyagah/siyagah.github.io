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
