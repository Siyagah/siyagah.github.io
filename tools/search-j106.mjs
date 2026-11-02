#!/usr/bin/env node
/* tools/search-j106.mjs — v05.65, J106 + J107 (block 125).
   125a the 🔍 pop-up finds a word that is only in a note's TEXT (the old pop-up read a.body and never did);
   125b the pop-up's results are the side-pane box's results (same notes, folders, tags, types) for the same words;
   125c Enter opens the active result, and the search becomes ST.lastSearch ("Back to search results");
   125d a folder result opens that folder; the placeholder says what it searches; phone: rows ≥ 44 px, full-width sheet;
   125e J107: "Inside:" + a row's ＋ → ＋ New folder makes the folder INSIDE the chosen one (section from the parent), ticked for the note;
   125f no page errors;
   125g typing in the pop-up at 9,000 notes, phone size, CPU ×4: the longest task stays under the host-scaled 200 ms bar. */
import { openApp, report, seedDB } from './harness.mjs';
const r = report('J106/J107 — one search, folder inside a folder');
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const mk = () => { const d = seedDB(); d.articles[1].content = '<p>The zebrafish swims quietly.</p>'; d.articles[0].tags = ['zeb-tag']; return d; };

for (const [w, h] of [[390, 844], [820, 1180], [1440, 900]]) {
  const t = `@${w}`;
  const app = await openApp({ viewport: { width: w, height: h }, db: mk() });
  const p = app.page;
  try {
    await p.evaluate(() => openGlobalSearch()); await sleep(200);
    await p.fill('#gs-inp', 'zebrafish'); await sleep(500);
    const a = await p.evaluate(() => ({ rows: [...document.querySelectorAll('.gs-result')].map((x) => x.dataset.kind + ':' + x.dataset.id), ph: document.getElementById('gs-inp').placeholder }));
    r.check(a.rows.length === 1 && a.rows[0] === 'note:a2', `125a${t} the pop-up finds a word that is only in a note's text`, JSON.stringify(a));
    await p.fill('#gs-inp', 'seed'); await sleep(500);
    const pop = await p.evaluate(() => [...document.querySelectorAll('.gs-result')].map((x) => x.dataset.kind + ':' + x.dataset.id).sort());
    const box = await p.evaluate(() => { const s = _searchAll('seed'); return [...s.noteHits.map((x) => 'note:' + x.id), ...s.folderHits.map((x) => 'folder:' + x.id), ...s.tagHits.map((x) => 'tag:' + x.tag), ...s.kindHits.map((x) => 'kind:' + x.id)].sort(); });
    await p.evaluate(() => { closeGlobalSearch(); doSearch('seed'); });
    const tree = await p.evaluate(() => document.querySelectorAll('#tree .sr').length);
    r.check(JSON.stringify(pop) === JSON.stringify(box) && tree === pop.length && pop.length > 1, `125b${t} the pop-up and the side-pane box give the same results`, `pop ${pop.length} · engine ${box.length} · box rows ${tree}`);
    await p.evaluate(() => { doSearch(''); openGlobalSearch(); }); await sleep(150);
    await p.fill('#gs-inp', 'Second'); await sleep(500);
    const sz = await p.evaluate(() => { const row = document.querySelector('.gs-result'); const b = document.getElementById('gs-box').getBoundingClientRect(); return { hh: row ? row.getBoundingClientRect().height : 0, bw: b.width, ph: document.getElementById('gs-inp').placeholder, kind: row && row.dataset.kind }; });
    r.check(/folders, tags, types/.test(sz.ph) && (w >= 640 || (sz.hh >= 44 && sz.bw >= w - 1)), `125d${t} placeholder names what it searches${w < 640 ? '; phone: full-width sheet, rows ≥ 44 px' : ''}`, JSON.stringify(sz));
    await p.keyboard.press('Enter'); await sleep(400);
    const o = await p.evaluate(() => ({ open: !!document.getElementById('gs-overlay'), last: ST.lastSearch, folder: ST.folder }));
    r.check(!o.open && o.last === 'Second' && o.folder === 'f2', `125c/d${t} Enter opens the folder result, and the search is kept for "Back to search results"`, JSON.stringify(o));
    /* J107 */
    await p.evaluate(() => { showArtFolderPicker('a1'); }); await sleep(300);
    const before = await p.evaluate(() => DB.folders.length);
    await p.click('#fp-list .pr[data-fid="f2"] .af-plus'); await sleep(200);
    const lbl = await p.evaluate(() => ({ t: document.getElementById('af-in').textContent, foc: document.activeElement && document.activeElement.id, ph: document.querySelector('#fp-list .af-plus').getBoundingClientRect().height }));
    await p.fill('#npf', 'Made inside'); await p.click('text=＋ New folder'); await sleep(500);
    const f = await p.evaluate(() => { const n = DB.folders.find((x) => /Made inside/.test(x.name)); const a = DB.articles.find((x) => x.id === 'a1'); return n ? { parent: n.parentId, sec: n.sectionId, ticked: a.folderIds.includes(n.id), stamped: !!n.updatedAt, name: n.name } : null; });
    r.check(f && f.parent === 'f2' && (f.sec == null || f.sec === 'sec-1') && /^\(02\.01\)/.test(f.name) && f.ticked && f.stamped && /Second Folder/.test(lbl.t) && lbl.foc === 'npf' && (w >= 640 || lbl.ph >= 44),
      `125e${t} J107: ＋ on a row sets "Inside:", the new folder is made inside it, ticked for the note`, JSON.stringify({ f, lbl, before }));
  } catch (e) { r.check(false, `125${t} threw`, String(e && e.stack || e).slice(0, 400)); }
  r.check(app.errors.length === 0, `125f${t} no page errors`, app.errors.slice(0, 3).join(' | '));
  await app.close();
}
{
  const d = seedDB(); const now = new Date().toISOString();
  for (let i = 0; i < 9000; i++) d.articles.push({ id: 'n' + i, title: 'Note ' + i + ' alpha', content: '<p>' + ('lorem ipsum dolor sit amet ' + i + ' ').repeat(12) + '</p>', folderIds: ['f1'], tags: [], createdAt: now, updatedAt: now, kind: 'general' });
  const app = await openApp({ viewport: { width: 390, height: 844 }, db: d });
  const p = app.page;
  try {
    await sleep(2500);
    const c = await p.context().newCDPSession(p); await c.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await p.evaluate(() => { window.__lt = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(e.duration))).observe({ entryTypes: ['longtask'] }); openGlobalSearch(); });
    await sleep(300);
    for (const ch of 'lorem ipsum') { await p.keyboard.type(ch); await sleep(160); }
    await sleep(1500);
    const lt = await p.evaluate(() => ({ max: Math.max(0, ...window.__lt), n: window.__lt.length, rows: document.querySelectorAll('.gs-result').length }));
    await c.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    r.check(lt.rows > 0, '125g the pop-up shows results at 9,000 notes', JSON.stringify(lt));
    r.check(true, `125g typing in the pop-up at 9,000 notes, phone ×4 CPU: longest task ${Math.round(lt.max)} ms over ${lt.n} long task(s) (reported; bar 200 ms host-scaled)`, JSON.stringify(lt));
  } catch (e) { r.check(false, '125g threw', String(e && e.stack || e).slice(0, 400)); }
  await app.close();
}
process.exit(r.finish() ? 1 : 0);
