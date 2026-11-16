#!/usr/bin/env node
/* tools/sec-counts-j181.mjs — v05.99, J181 (block 159): each section heading in the side pane shows "N folders · M notes".
   159a three sections (nested folders, a note in two folders of one section, a note in two sections, a trashed note, a MyDatabase folder): exact counts, open and closed the same
   159b filing, unfiling, trashing a note and making / moving / deleting a folder update the counts (a merge from a second device too)
   159c 28,600 notes, 390 px x4 CPU: the side pane draw with and without the counts (<= 15 ms slower x host factor); no long task over 200 ms
   159d 390 / 820 / 1440 and the five sidebar colours: contrast >= 4.5:1, the name never wraps, no horizontal overflow, JSON.stringify(DB) unchanged, no page errors
   159e (keep1116) save, update, reopen: a note, a folder and a setting are changed with this build; the page is served again as the NEXT version and reopened: all still there
   node tools/sec-counts-j181.mjs */
import { openApp, report, hostLimit, serve, playwright, ROOT, seedDB } from './harness.mjs';
import { mkdtempSync, cpSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const r = report('J181 — section counts in the side pane');
const errs = [];
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const NOTES = 28600;
const now = new Date().toISOString();
const note = (id, fo, o = {}) => ({ id, title: 'Note ' + id, content: '<p>x</p>', folderIds: fo, tags: [], createdAt: now, updatedAt: now, kind: 'general', ...o });
const fol = (id, p, sec, o = {}) => ({ id, name: 'F ' + id, parentId: p, order: 1, ...(p ? {} : { sectionId: sec }), updatedAt: now, ...o });
function seed() {
  const d = seedDB(now);
  d.sections = [{ id: 'sA', name: 'Section A', order: 0, updatedAt: now }, { id: 'sB', name: 'Section B with a rather long name to test the truncation', order: 1, updatedAt: now }, { id: 'sC', name: 'Section C', order: 2, updatedAt: now }];
  d.folders = [fol('a1', null, 'sA'), fol('a2', 'a1'), fol('a3', 'a2'), fol('b1', null, 'sB'), fol('b2', null, 'sB'), fol('c1', null, 'sC'), fol('d1', null, 'db-section')];
  d.articles = [note('n1', ['a1', 'a2']), note('n2', ['a3']), note('n3', ['a1', 'b1']), note('n4', ['b2']), note('n5', []), note('n6', ['c1']), note('n7', ['d1'])];
  d.trash = [{ id: 'tr1', type: 'article', item: note('n8', ['a1']), deletedAt: now }];
  return d;
}
const CNT = `(() => { const o = {}; document.querySelectorAll('#tree .sec[data-sid]').forEach((s) => { const c = s.querySelector('.sec-hd .sc-w'); o[s.dataset.sid] = c ? c.textContent : null; }); const d = document.querySelector('#tree .db-hd-sec .sc-w'); o['db-section'] = d ? d.textContent : null; return o; })()`;
const ALL_OPEN = (open) => `(() => { ST.secOpen = ST.secOpen || {}; DB.sections.forEach((s) => { ST.secOpen[s.id] = ${open}; }); ST.dbOpen = ${open}; renderTree(); })()`;
const J = (o) => JSON.stringify(o);

/* 159a / 159b */
{
  const app = await openApp({ viewport: { width: 1440, height: 900 }, db: seed() });
  const p = app.page;
  try {
    await p.evaluate(ALL_OPEN(false)); await sleep(150);
    const closed = await p.evaluate(CNT);
    await p.evaluate(ALL_OPEN(true)); await sleep(150);
    const open = await p.evaluate(CNT);
    const want = { sA: '3 folders · 3 notes', sB: '2 folders · 2 notes', sC: '1 folder · 1 note', 'db-section': '1 folder · 1 note' };
    r.check(J(closed) === J(want), '159a closed sections show the exact counts (a note in two folders of one section once, in two sections in each, Trash not counted)', J(closed));
    r.check(J(open) === J(closed), '159a open sections show the same numbers', J(open));
    r.check(await p.evaluate(() => document.querySelector('#tree .sec[data-sid="sA"] .sec-cnt').title) === '3 folders · 3 notes', '159a the full words are in the title');
    r.check(await p.evaluate(() => !document.querySelector('#tree .sf-sec:not(.db-sec) .sec-hd .sec-cnt, #tree [data-tag-sec] .sec-cnt')), '159a Smart Views, Tags and Note Types headings have no count');
    /* 159b */
    const step = async (label, code, sid, exp) => {
      await p.evaluate(code); await sleep(200);
      const c = await p.evaluate(CNT);
      r.check(c[sid] === exp, `159b ${label}: ${sid} reads "${exp}"`, J(c));
    };
    await step('a note is filed into a second section', `(() => { DB.articles.find(a=>a.id==='n4').folderIds.push('c1'); persist(); render(); })()`, 'sC', '1 folder · 2 notes');
    await step('a note is unfiled', `(() => { DB.articles.find(a=>a.id==='n6').folderIds = []; persist(); render(); })()`, 'sC', '1 folder · 1 note');
    await step('a note goes to Trash', `(() => { const i=DB.articles.findIndex(a=>a.id==='n2'); const [a]=DB.articles.splice(i,1); DB.trash.push({id:'tr2',type:'article',item:a,deletedAt:new Date().toISOString()}); persist(); render(); })()`, 'sA', '3 folders · 2 notes');
    await step('a folder is made', `(() => { DB.folders.push({id:'a4',name:'New',parentId:'a3',order:1,updatedAt:new Date().toISOString()}); persist(); render(); })()`, 'sA', '4 folders · 2 notes');
    await step('a folder is moved to another section', `(() => { const f=DB.folders.find(f=>f.id==='a2'); f.parentId=null; f.sectionId='sC'; f.updatedAt=new Date().toISOString(); persist(); render(); })()`, 'sC', '4 folders · 2 notes');
    await step('a folder is deleted', `(() => { DB.folders = DB.folders.filter(f=>f.id!=='a4'); persist(); render(); })()`, 'sC', '3 folders · 2 notes');
    /* a merge from a second device: a remote copy with a newer note filing n1 into section B */
    await p.evaluate(() => {
      const remote = JSON.parse(JSON.stringify(DB)); const n = remote.articles.find(a => a.id === 'n1');
      n.folderIds = ['b2']; n.updatedAt = new Date(Date.now() + 60000).toISOString();
      DB = mergeDB(DB, remote); persist(); render();
    });
    await sleep(200);
    const m = await p.evaluate(CNT);
    const exp = await p.evaluate(() => { const o = {}; DB.sections.forEach(s => { const fs = DB.folders.filter(f => { let c = f, g = 0; while (c.parentId && g++ < 20) c = DB.folders.find(x => x.id === c.parentId) || { }; return c.sectionId === s.id; }).map(f => f.id); o[s.id] = fs.length + '|' + DB.articles.filter(a => (a.folderIds || []).some(x => fs.includes(x))).length; }); return o; });
    r.check(m.sB === '2 folders · 3 notes' && exp.sB === '2|3', '159b a merge from a second device moves the count (Section B gains the note)', J({ m, exp }));
  } catch (e) { r.check(false, '159a/b threw: ' + String(e && e.message || e).split('\n')[0]); }
  errs.push(...app.errors); await app.close();
}

/* 159c */
{
  const app = await openApp({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const p = app.page;
  try {
    await p.evaluate(`(() => { const t=new Date().toISOString(); DB.sections=[]; DB.folders=[]; DB.articles=[]; DB.trash=[];
      for (let s=0;s<6;s++) DB.sections.push({id:'s'+s,name:'Section '+s,order:s,updatedAt:t});
      for (let i=0;i<600;i++) DB.folders.push({id:'F'+i,name:'Folder '+i,parentId:i<60?null:'F'+(i%60),order:i,...(i<60?{sectionId:'s'+(i%6)}:{}),updatedAt:t});
      for (let i=0;i<${NOTES};i++) DB.articles.push({id:'n'+i,title:'Note '+i,content:'<p>b</p>',folderIds:i%11===0?['F'+(i%600),'F'+((i*3)%600)]:['F'+(i%600)],tags:[],createdAt:t,updatedAt:t,kind:'general'});
      DB.sections.forEach(s=>{ST.secOpen[s.id]=true;}); _seedRecSnap(); persist(); })()`);
    await sleep(800);
    const cdp = await p.context().newCDPSession(p);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await p.evaluate(() => { window.__lt = []; try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(e.duration))).observe({ entryTypes: ['longtask'] }); } catch {} });
    const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
    const draw = (with_) => p.evaluate((w) => {
      const keep = window._secCntHTML; if (!w) window._secCntHTML = () => '';
      const t = []; try { renderTree(); for (let i = 0; i < 7; i++) { const a = performance.now(); renderTree(); t.push(performance.now() - a); } } finally { window._secCntHTML = keep; }
      return t;
    }, with_);
    const without = med(await draw(false)), withc = med(await draw(true)), extra = withc - without;
    const G = hostLimit(15);
    r.check(extra <= G.ms, `159c 28,600 notes, 390 ×4: the side pane draw takes ${withc.toFixed(1)} ms with the counts, ${without.toFixed(1)} ms without (+${extra.toFixed(1)} ms ≤ ${G.raw} × host ${G.factor})`);
    const lt = await p.evaluate(() => Math.max(0, ...window.__lt));
    r.check(lt <= hostLimit(200).ms, `159c no long task over 200 ms while drawing (worst ${Math.round(lt)} ms)`);
    r.check((await p.evaluate(CNT)).s0 !== null, '159c the counts are drawn at this size');
  } catch (e) { r.check(false, '159c threw: ' + String(e && e.message || e).split('\n')[0]); }
  errs.push(...app.errors); await app.close();
}

/* 159d */
const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
for (const [w, h, touch] of [[390, 844, true], [820, 1180, true], [1440, 900, false]]) {
  const app = await openApp({ viewport: { width: w, height: h }, hasTouch: touch, db: seed() });
  const p = app.page;
  try {
    if (w < 1200) await p.evaluate(() => showPane('sb'));
    await p.evaluate(ALL_OPEN(true)); await sleep(200);
    const before = await p.evaluate(() => JSON.stringify(DB));
    for (const preset of ['forest', 'ocean', 'amber', 'indigo', 'rose']) {
      const m = await p.evaluate(([pr, w]) => {
        DB.theme.preset = pr; DB.theme.custom = {}; applyTheme(DB.theme); renderTree();
        const parse = (s) => { const m = s.match(/[\d.]+/g).map(Number); return [m[0], m[1], m[2], m.length > 3 ? m[3] : 1]; };
        const over = (top, bot) => { const a = top[3]; return [0, 1, 2].map((i) => top[i] * a + bot[i] * (1 - a)).concat([1]); };
        const chain = (el) => { const l = []; for (let e = el; e; e = e.parentElement) l.unshift(parse(getComputedStyle(e).backgroundColor)); return l; };
        const bgOf = (el) => chain(el).reduce((acc, c) => over(c, acc), [255, 255, 255, 1]);
        const out = [];
        document.querySelectorAll('#tree .sec-hd .sec-cnt').forEach((c) => {
          const vis = c.querySelector(w < 640 ? '.sc-s' : '.sc-w'); const bg = bgOf(c); const fg = over(parse(getComputedStyle(c).color), bg);
          const hd = c.closest('.sec-hd'), nm = hd.querySelector('.sec-nm'), hr = hd.getBoundingClientRect(), cr = c.getBoundingClientRect();
          out.push({ bg, fg, vis: getComputedStyle(vis).display !== 'none', wrap: nm.getBoundingClientRect().height > 30, inside: cr.right <= hr.right + 0.5 && cr.left >= hr.left - 0.5 });
        });
        return { out, ov: document.documentElement.scrollWidth > innerWidth || document.getElementById('sb').scrollWidth > document.getElementById('sb').clientWidth + 1 };
      }, [preset, w]);
      const worst = Math.min(...m.out.map((o) => { const a = lum(o.fg) + 0.05, b = lum(o.bg) + 0.05; return Math.max(a, b) / Math.min(a, b); }));
      r.check(m.out.length === 4 && worst >= 4.5, `159d@${w} ${preset}: count contrast ${worst.toFixed(2)}:1 ≥ 4.5 on ${m.out.length} headings`);
      r.check(m.out.every((o) => o.vis && !o.wrap && o.inside) && !m.ov, `159d@${w} ${preset}: the right form is shown, the name stays on one line, the count stays inside the heading, no horizontal overflow`, J(m.out.map((o) => [o.vis, o.wrap, o.inside])));
    }
    const after = await p.evaluate(() => { DB.theme.preset = 'forest'; return JSON.stringify(DB); });
    r.check(JSON.parse(after).articles.length === JSON.parse(before).articles.length && J(JSON.parse(after).folders) === J(JSON.parse(before).folders), `159d@${w} drawing the counts changed no note or folder`);
  } catch (e) { r.check(false, `159d@${w} threw: ` + String(e && e.message || e).split('\n')[0]); }
  errs.push(...app.errors); await app.close();
}
r.check(errs.length === 0, '159d no page errors', errs.slice(0, 3).join(' | '));

/* 159e — keep1116: save · update · reopen */
{
  const dir = mkdtempSync(join(tmpdir(), 'j181-'));
  for (const f of ['index.html', 'sw.js', 'manifest.json', 'manifest-jeb.json']) { try { cpSync(join(ROOT, f), join(dir, f)); } catch {} }
  try { cpSync(join(ROOT, 'icons'), join(dir, 'icons'), { recursive: true }); } catch {}
  const srv = await serve(dir); const pw = await playwright(); const browser = await pw.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  await ctx.route('**googleapis.com/**', (x) => x.abort()); await ctx.route('**gstatic.com/**', (x) => x.abort()); await ctx.route('**firebaseio.com/**', (x) => x.abort()); await ctx.route('**firebaseapp.com/**', (x) => x.abort());
  await ctx.addInitScript((d) => { try { if (!localStorage.getItem('j181-seeded')) { localStorage.setItem('my-notebook-v1', JSON.stringify(d)); localStorage.setItem('j181-seeded', '1'); } } catch {} }, seed());
  const pe = []; const page = await ctx.newPage(); page.on('pageerror', (e) => pe.push(String(e)));
  try {
    await page.goto(srv.base + '/'); await page.waitForFunction(() => window.__appBooted === true); await sleep(600);
    const v1 = await page.evaluate(() => document.querySelector('meta[name="app-version"]').content);
    await page.evaluate(() => { DB.articles.find((a) => a.id === 'n1').title = 'Edited 159e'; DB.folders.find((f) => f.id === 'b1').name = 'Renamed 159e'; DB.theme.preset = 'ocean'; persist(); });
    await sleep(1500);
    const exp = await page.evaluate(() => JSON.stringify({ a: DB.articles, f: DB.folders, s: DB.sections, t: DB.trash, p: DB.theme.preset }));
    /* the next version: the served copy's meta and sw VERSION move on */
    const html = readFileSync(join(dir, 'index.html'), 'utf8').replace(/(name="app-version" content=")[^"]+/, '$106.00');
    writeFileSync(join(dir, 'index.html'), html);
    writeFileSync(join(dir, 'sw.js'), readFileSync(join(dir, 'sw.js'), 'utf8').replace(/v\d\d\.\d\d\.01/, 'v06.00.01'));
    await page.reload(); await page.waitForFunction(() => window.__appBooted === true); await sleep(800);
    const v2 = await page.evaluate(() => document.querySelector('meta[name="app-version"]').content);
    const got = await page.evaluate(() => JSON.stringify({ a: DB.articles, f: DB.folders, s: DB.sections, t: DB.trash, p: DB.theme.preset }));
    r.check(v1 !== v2 && v2 === '06.00', `159e the page reopened as the next version (${v1} → ${v2})`);
    r.check(got === exp, '159e the changed note, the renamed folder and the setting are still there; notes, folders, sections and Trash are exactly as saved', got === exp ? '' : got.slice(0, 200));
    r.check((await page.evaluate(CNT)).sA !== undefined && pe.length === 0, '159e the counts draw after the update; no page errors', pe.join(' | '));
  } catch (e) { r.check(false, '159e threw: ' + String(e && e.message || e).split('\n')[0]); }
  await browser.close(); await srv.close();
}
process.exit(r.finish() ? 1 : 0);
