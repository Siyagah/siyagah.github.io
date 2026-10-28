#!/usr/bin/env node
/* tools/tree-w2.mjs — v05.54, J08 W2: the side pane with many folders (checks 114a–114f), at 390 (touch) / 820 (touch) / 1440 (mouse).
   114a same result: with 800 folders (nested, some journal folders, colours) and 27,000 notes, the side pane drawn with every folder closed and
        with every folder open is byte-identical to the one drawn with the functions as they were before this round (chOf filtering the
        folders, isJournal searching the folders), swapped in by the check; so are the journal Smart View's list and every count;
   114b outside a draw nothing is remembered: a folder made, moved and renamed, and a folder made a journal folder, are seen at once by
        chOf / isJournal in the same task;
   114c a folder row off the screen is not laid out (content-visibility:auto), a row on the screen is, and the open folder's row can be
        scrolled to and tapped / clicked;
   114d speed: opening a folder with 800 folders open, phone ×4 ≤ 550 ms and laptop ≤ 150 ms to the next frame (× this computer's factor);
        measured before this round on the same notebook: 994 ms and 161 ms;
   114e opening folders and drawing the side pane writes nothing;
   114f no page errors.
   `node tools/tree-w2.mjs` */
import { openApp, report, hostLimit } from './harness.mjs';

const r = report('J08 W2 — the side pane with many folders');
const errs = [];
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const SEED = (N, NF) => {
  const now = new Date().toISOString(); DB.folders = []; DB.articles = []; DB.trash = []; DB.tombstones = [];
  for (let i = 0; i < NF; i++) { const par = i < 40 ? null : 'F' + (i % 40); DB.folders.push({ id: 'F' + i, name: 'Folder ' + i, parentId: par, order: (i * 7919) % NF, sectionId: 'sec-1', updatedAt: now, ...(i % 97 === 5 ? { journalMode: true } : {}), ...(i % 53 === 3 ? { color: '#a33' } : {}) }); }
  for (let i = 0; i < N; i++) DB.articles.push({ id: 'n' + i, title: i % 501 === 0 ? 'Diary 12.06.26' : 'Note ' + i, content: '<p>b</p>', folderIds: i % 11 === 0 ? ['F' + (i % NF), 'F' + ((i * 3) % NF)] : ['F' + (i % NF)], tags: i % 3 ? [] : (i % 333 === 0 ? ['Journal'] : ['t' + (i % 200)]), createdAt: now, updatedAt: now, kind: 'general' });
  _seedRecSnap(); persist();
};
/* the functions as they were in v05.53 */
const OLD = String.raw`(() => {
  window.__w2old = {
    chOf: (pid) => DB.folders.filter(f => f.parentId === pid).sort((a, b) => a.order - b.order),
    isJournal: (a) => { const tags = (a.tags || []).map(t => String(t).toLowerCase()); if (tags.includes('journal') || tags.includes('daily')) return true; if (_dateTitleRe.test(a.title || '')) return true; return (a.folderIds || []).some(fid => { const f = DB.folders.find(x => x.id === fid); return f && f.journalMode; }); },
  };
})();`;
const COMPARE = () => {
  const nw = { chOf: window.chOf, isJournal: window.isJournal, _jrnPred: window._jrnPred };
  const snap = () => ({ tree: document.getElementById('tree').innerHTML, jl: getSmartArts('sf-journal').map(a => a.id).join(','), jc: smartCount('sf-journal'), cnt: DB.folders.slice(0, 60).map(f => cntOf(f.id)).join(',') });
  renderTree(); const a = snap();
  window.chOf = __w2old.chOf; window.isJournal = __w2old.isJournal; window._jrnPred = () => __w2old.isJournal;
  try { renderTree(); var b = snap(); } finally { Object.assign(window, nw); }
  renderTree();
  const d = (x, y) => { if (x === y) return ''; let k = 0; while (k < x.length && x[k] === y[k]) k++; return '@' + k + ' new «' + x.slice(Math.max(0, k - 40), k + 80) + '» old «' + y.slice(Math.max(0, k - 40), k + 80) + '»'; };
  return { tree: a.tree === b.tree, jl: a.jl === b.jl && a.jl.length > 0, jc: a.jc === b.jc, cnt: a.cnt === b.cnt, rows: document.querySelectorAll('#tree .tr-row').length, diff: d(a.tree, b.tree) || d(a.jl, b.jl) };
};

for (const [w, h, touch] of [[390, 844, true], [820, 1180, true], [1440, 900, false]]) {
  const app = await openApp({ viewport: { width: w, height: h }, hasTouch: touch });
  const { page } = app;
  try {
    await page.evaluate(`(${SEED})(27000, 800)`); await sleep(500);
    await page.evaluate(OLD);
    /* 114a */
    const closed = await page.evaluate(`(() => { ST.secOpen = ST.secOpen || {}; DB.sections.forEach(s => { ST.secOpen[s.id] = true; }); ST.sfOpen = true; ST.exp = {}; return (${COMPARE})(); })()`);
    const open = await page.evaluate(`(() => { DB.folders.forEach(f => { ST.exp[f.id] = true; }); return (${COMPARE})(); })()`);
    r.check(closed.tree && closed.jl && closed.jc && closed.cnt, `114a@${w} every folder closed: the side pane, the journal Smart View and the counts equal the build before (${closed.rows} rows)`, closed.diff);
    r.check(open.tree && open.jl && open.jc && open.cnt && open.rows >= 800, `114a@${w} every folder open: the same (${open.rows} rows)`, open.diff);
    /* 114b */
    const fresh = await page.evaluate(() => {
      const t = new Date().toISOString();
      DB.folders.push({ id: 'Fnew', name: 'Brand new', parentId: 'F3', order: -1, sectionId: 'sec-1', updatedAt: t });
      const a1 = chOf('F3')[0]?.id;
      DB.folders.find((f) => f.id === 'Fnew').parentId = 'F4';
      const a2 = chOf('F4')[0]?.id, a3 = chOf('F3').some((f) => f.id === 'Fnew');
      DB.folders.find((f) => f.id === 'F7').journalMode = true;
      const j = isJournal(DB.articles.find((a) => a.id === 'n7')), jl = getSmartArts('sf-journal').some((a) => a.id === 'n7');
      DB.folders = DB.folders.filter((f) => f.id !== 'Fnew'); delete DB.folders.find((f) => f.id === 'F7').journalMode;
      return { a1, a2, a3, j, jl };
    });
    r.check(fresh.a1 === 'Fnew' && fresh.a2 === 'Fnew' && !fresh.a3 && fresh.j && fresh.jl, `114b@${w} outside a draw a new, moved folder and a new journal folder are seen at once`, JSON.stringify(fresh));
    /* 114c */
    if (w < 1200) await page.evaluate(() => showPane('sb'));
    await sleep(300);
    const cv = await page.evaluate(() => {
      const t = document.getElementById('tree'), rows = [...t.querySelectorAll('.tr-row')];
      t.querySelector('.tr-row[data-fid="F0"]').scrollIntoView({ block: 'center' });
      const tr = t.getBoundingClientRect();
      const cs = getComputedStyle(rows[rows.length - 1]).contentVisibility;
      const on = rows.find((x) => { const b = x.getBoundingClientRect(); return b.top >= tr.top && b.bottom <= tr.bottom && x.dataset.fid; });
      const nm = on && on.querySelector('.tr-name'), nb = nm && nm.getBoundingClientRect();
      return { cs, n: rows.length, onName: !!nb && nb.width > 10, fid: on && on.dataset.fid };
    });
    const target = await page.evaluate(() => { const row = document.querySelector('#tree .tr-row[data-fid="F600"]'); row.scrollIntoView({ block: 'center' }); return !!row; });
    await sleep(200);
    const loc = page.locator('#tree .tr-row[data-fid="F600"] .tr-name');
    if (touch) await loc.tap(); else await loc.click();
    await sleep(300);
    const picked = await page.evaluate(() => ST.folder);
    r.check(cv.cs === 'auto' && cv.onName, `114c@${w} folder rows off the screen are not laid out (content-visibility ${cv.cs}); a row on the screen is (its name ${cv.onName ? 'drawn' : 'missing'})`, JSON.stringify(cv));
    r.check(target && picked === 'F600', `114c@${w} a folder far down the open list can be scrolled to and ${touch ? 'tapped' : 'clicked'} (${picked})`);
    errs.push(...app.errors);
  } catch (e) { r.check(false, `114@${w} threw: ${String(e && e.message || e).split('\n')[0]}`); }
  finally { await app.close(); }
}

/* 114d / 114e — speed and no writes */
for (const vp of [{ name: 'phone ×4', w: 390, h: 844, th: 4, lim: 550 }, { name: 'laptop', w: 1440, h: 900, th: 1, lim: 150 }]) {
  const app = await openApp({ viewport: { width: vp.w, height: vp.h }, hasTouch: vp.w < 1200 });
  const { page } = app;
  try {
    await page.evaluate(`(${SEED})(27000, 800)`);
    await page.evaluate(() => { DB.sections.forEach((s) => { ST.secOpen = ST.secOpen || {}; ST.secOpen[s.id] = true; }); DB.folders.forEach((f) => { ST.exp[f.id] = true; }); render(); });
    await sleep(800);
    if (vp.th > 1) { const c = await page.context().newCDPSession(page); await c.send('Emulation.setCPUThrottlingRate', { rate: vp.th }); }
    const m = await page.evaluate(async () => {
      const writes = {}; for (const nm of ['persist', '_save', 'pushToCloud']) { const o = window[nm]; window[nm] = function (...a) { writes[nm] = (writes[nm] || 0) + 1; return o.apply(this, a); }; }
      const db0 = JSON.stringify(DB.folders) + JSON.stringify(DB.articles.length);
      const t = [];
      for (let i = 0; i < 5; i++) { const a = performance.now(); selFolder('F' + (i * 7 % 40)); await new Promise((res) => requestAnimationFrame(() => setTimeout(res, 0))); t.push(Math.round(performance.now() - a)); }
      t.sort((a, b) => a - b);
      return { ms: t[2], all: t, writes, same: JSON.stringify(DB.folders) + JSON.stringify(DB.articles.length) === db0 };
    });
    const G = hostLimit(vp.lim);
    r.check(m.ms <= G.ms, `114d ${vp.name}: opening a folder with 800 folders open takes ${m.ms} ms to the next frame (≤ ${G.raw} ms × host ${G.factor}; v05.53: ${vp.th > 1 ? 994 : 161} ms)`, JSON.stringify(m.all));
    /* selFolder itself saves nothing (it changes only what is open and shown) */
    r.check(!m.writes.persist && !m.writes.pushToCloud && m.same, `114e ${vp.name}: opening folders writes nothing to the notebook`, JSON.stringify(m.writes));
    errs.push(...app.errors);
  } catch (e) { r.check(false, `114d ${vp.name} threw: ${String(e && e.message || e).split('\n')[0]}`); }
  finally { await app.close(); }
}
r.check(errs.length === 0, '114f no page errors', errs.slice(0, 3).join(' | '));
process.exit(r.finish() ? 1 : 0);
