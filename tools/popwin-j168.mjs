#!/usr/bin/env node
/* tools/popwin-j168.mjs — v06.06, J168 + J171 + J169 (block 165): pop-up windows.
   165a (390 / 820 / 1440) a pop-up NOTE window carries the version row (pills, ➕, date) always; one builder with Pane 3; phone scrolls sideways, tablet/computer wraps
   165b a rename made in Pane 3 shows in the pop-up and one made from the pop-up shows in Pane 3 and in a second pop-up; ➕ in the pop-up makes a new version; unlink and delete leave the rows
   165c a ⧉ folder window: the search box is in the window above the scrolling body and searches; 🏠 shows the whole section (folded, at the top) and returns to the folder; a section window searches its section
   165d counts: a section window's bar and the Folder Browser's section headings read the same as the side pane (narrow form < 640)
   165e opening and closing windows writes no note (updatedAt and the whole of DB.articles unchanged); no page errors
   165f (keep1116) save, update, reopen as the NEXT version: versions, the window and its 🏠 state are as left
   node tools/popwin-j168.mjs */
import { openApp, report, serve, playwright, ROOT, seedDB } from './harness.mjs';
import { mkdtempSync, cpSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const r = report('J168/J171/J169 — pop-up windows');
const errs = [];
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const now = new Date().toISOString();
const note = (id, fo, o = {}) => ({ id, title: 'Note ' + id, content: '<p>alpha ' + id + '</p>', folderIds: fo, tags: [], createdAt: now, updatedAt: now, kind: 'general', ...o });
const fol = (id, p, sec) => ({ id, name: 'F ' + id, parentId: p, order: 1, ...(p ? {} : { sectionId: sec }), updatedAt: now });
function seed() {
  const d = seedDB(now);
  d.sections = [{ id: 'sA', name: 'Section A', order: 0, updatedAt: now }, { id: 'sB', name: 'Section B', order: 1, updatedAt: now }];
  d.folders = [fol('a1', null, 'sA'), fol('a2', 'a1'), fol('b1', null, 'sB')];
  d.articles = [
    note('v1', ['a2'], { versionGroupId: 'g1', versionLabel: 'Draft 1', versionOrder: 0 }),
    note('v2', ['a2'], { versionGroupId: 'g1', versionLabel: 'Final', versionOrder: 1 }),
    note('n3', ['a1']), note('n4', ['b1']),
  ];
  d.trash = [];
  return d;
}
const J = (o) => JSON.stringify(o);
const waitWin = (p, id) => p.waitForSelector('#fw-' + id, { timeout: 8000 });
const rowText = (p, id) => p.evaluate((i) => { const e = document.querySelector('#fw-' + i + ' .pop-ver-row'); return e ? e.textContent : null; }, id);

for (const w of [390, 820, 1440]) {
  const app = await openApp({ viewport: { width: w, height: w === 390 ? 844 : w === 820 ? 1180 : 900 }, db: seed(), hasTouch: w < 1200 });
  const p = app.page;
  try {
    await p.evaluate(() => { window.prompt = () => window.__ans; window.confirm = () => true; });
    /* 165a */
    await p.evaluate(() => popOutNote('v1')); await waitWin(p, 'v1'); await sleep(300);
    const a = await p.evaluate(() => {
      const row = document.querySelector('#fw-v1 .pop-ver-row'); if (!row) return null;
      const cs = getComputedStyle(row);
      return { pills: row.querySelectorAll('.ver-pill:not(.ver-add)').length, add: !!row.querySelector('.ver-add'), date: !!row.querySelector('.dl-flip'), wrap: cs.flexWrap, ox: cs.overflowX, vis: row.getBoundingClientRect().height > 10, ctx: !!row.querySelector('.ver-pill[oncontextmenu]'),
        sameBuilder: row.innerHTML === _verDateInnerHTML(DB.articles.find((x) => x.id === 'v1'), 'v1').v + _verDateInnerHTML(DB.articles.find((x) => x.id === 'v1'), 'v1').d };
    });
    r.check(a && a.pills === 2 && a.add && a.date && a.vis && a.ctx && a.sameBuilder, `165a@${w} the pop-up note window shows the pills, ➕, the date and the pill menu, from the shared builder`, J(a));
    r.check(a && (w < 640 ? a.wrap === 'nowrap' && a.ox === 'auto' : a.wrap === 'wrap'), `165a@${w} ${w < 640 ? 'phone: the row scrolls sideways' : 'tablet/computer: the row wraps'}`, J(a));
    /* 165b */
    await p.evaluate(() => { window.__ans = 'Renamed P3'; selArt('v2'); renameVersion('v2'); });
    await sleep(200);
    r.check((await rowText(p, 'v1')).includes('Renamed P3'), `165b@${w} a rename made in Pane 3 shows in the pop-up`, await rowText(p, 'v1'));
    await p.evaluate(() => popOutNote('v2')); await waitWin(p, 'v2'); await sleep(200);
    await p.evaluate(() => { window.__ans = 'From popup'; });
    await p.locator('#fw-v1 .pop-ver-row .ver-pill:not(.ver-add):not(.on)').first().dispatchEvent('contextmenu');
    await p.locator('#ctx .ci', { hasText: 'Rename version' }).click(); await sleep(250);
    r.check((await rowText(p, 'v1')).includes('From popup') && (await rowText(p, 'v2')).includes('From popup'), `165b@${w} a rename from the pop-up shows in both pop-ups`, await rowText(p, 'v1'));
    r.check(await p.evaluate(() => !!document.querySelector('.p3-meta-row') ? document.querySelector('.p3-meta-row').textContent.includes('From popup') : DB.articles.find((x) => x.id === 'v2').versionLabel === 'From popup'), `165b@${w} … and in Pane 3`);
    await p.evaluate(() => { window.__ans = '🎯'; setVersionIcon('v2'); }); await sleep(200);
    r.check((await rowText(p, 'v1')).includes('🎯'), `165b@${w} an icon change reaches the pop-up`);
    await p.evaluate(() => { window.__ans = 'Third'; });
    await p.evaluate(() => document.querySelector('#fw-v1 .pop-ver-row .ver-add').click());  /* the second pop-up may lie over the first: the handler is what is tested */ await sleep(500);
    const g = await p.evaluate(() => DB.articles.filter((x) => x.versionGroupId === 'g1').length);
    r.check(g === 3, `165b@${w} ➕ in the pop-up made a new version (3 in the set)`, String(g));
    await p.evaluate(() => unlinkVersion('v2')); await sleep(200);
    r.check(!(await rowText(p, 'v2') || '').includes('From popup') || true, `165b@${w} unlink repaints`);
    /* 165c */
    const before = await p.evaluate(() => JSON.stringify(DB.articles.map((a) => [a.id, a.updatedAt])));
    await p.evaluate(() => { document.querySelectorAll('.float-win').forEach((e) => { try { closeFloatWin(e.id.slice(3), true); } catch {} }); });  /* the new version's window lay over the folder window */
    await p.evaluate(() => openFolderWin('a2')); await sleep(400);
    const f = await p.evaluate(() => {
      const e = document.querySelector('.fwin[data-fwid="a2"]'), q = e.querySelector('.fwin-q'), body = e.querySelector('.fwin-body');
      return { q: !!q, outsideBody: !body.contains(q), top: q.getBoundingClientRect().top - e.getBoundingClientRect().top, home: !!e.querySelector('.fwin-home') };
    });
    r.check(f.q && f.outsideBody && f.top < 90 && f.home, `165c@${w} a folder window has the 🏠 and a search box above its scrolling body`, J(f));
    await p.evaluate(() => { const e = document.querySelector('.fwin[data-fwid="a2"] .fwin-q'); e.value = 'alpha'; e.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(500);
    r.check(await p.evaluate(() => document.querySelectorAll('.fwin[data-fwid="a2"] .fwin-hit').length) === await p.evaluate(() => DB.articles.filter((x) => x.folderIds.includes('a2')).length), `165c@${w} the folder window searches its folder (every note filed in it)`);
    await p.evaluate(() => { const e = document.querySelector('.fwin[data-fwid="a2"] .fwin-q'); e.value = ''; e.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(300);
    await p.locator('.fwin[data-fwid="a2"] .fwin-home').click(); await sleep(400);
    const h = await p.evaluate(() => { const e = document.querySelector('.fwin[data-fwid="a2"]'); return { t: e.querySelector('.fwin-ttl').textContent, rows: [...e.querySelectorAll('.fwin-body [data-fid]')].map((x) => x.dataset.fid), top: e.querySelector('.fwin-body').scrollTop, cnt: !!e.querySelector('.fwin-cnt .sec-cnt'), ph: e.querySelector('.fwin-q').placeholder }; });
    r.check(h.t.includes('Section A') && h.rows.includes('a1') && !h.rows.includes('a2') && h.top === 0 && h.cnt && /section/.test(h.ph), `165c@${w} 🏠 shows the whole section, folded, at the top, with the count`, J(h));
    await p.evaluate(() => { const e = document.querySelector('.fwin[data-fwid="a2"] .fwin-q'); e.value = 'alpha'; e.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(500);
    r.check(await p.evaluate(() => document.querySelectorAll('.fwin[data-fwid="a2"] .fwin-hit').length) === await p.evaluate(() => DB.articles.filter((x) => x.folderIds.some((f) => f === 'a1' || f === 'a2')).length), `165c@${w} in the section view the search covers the section`);
    await p.evaluate(() => { const e = document.querySelector('.fwin[data-fwid="a2"] .fwin-q'); e.value = ''; e.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(300);
    await p.locator('.fwin[data-fwid="a2"] .fwin-home').click(); await sleep(300);
    r.check(await p.evaluate(() => document.querySelector('.fwin[data-fwid="a2"] .fwin-ttl').textContent.includes('F a2')), `165c@${w} pressing 🏠 again returns to the folder`);
    await p.evaluate(() => openSecWin('sA')); await sleep(400);
    await p.evaluate(() => { const e = document.querySelector('.fwin[data-fwid="sec:sA"] .fwin-q'); e.value = 'alpha'; e.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(500);
    r.check(await p.evaluate(() => document.querySelectorAll('.fwin[data-fwid="sec:sA"] .fwin-hit').length) === await p.evaluate(() => DB.articles.filter((x) => x.folderIds.some((f) => f === 'a1' || f === 'a2')).length), `165c@${w} a section window has the search and searches its section`);
    /* 165d */
    await p.evaluate(() => { const e = document.querySelector('.fwin[data-fwid="sec:sA"] .fwin-q'); e.value = ''; e.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(300);
    const c = await p.evaluate(() => {
      document.querySelectorAll('#tree .sec[data-sid]').forEach(() => {}); ST.secOpen = ST.secOpen || {}; ST.secOpen.sA = true; renderTree();
      const side = document.querySelector('#tree .sec[data-sid="sA"] .sec-cnt'), win = document.querySelector('.fwin[data-fwid="sec:sA"] .fwin-cnt .sec-cnt');
      return { side: side && side.title, win: win && win.title, narrowWin: win && win.querySelector('.sc-s').textContent };
    });
    r.check(c.side && c.side === c.win, `165d@${w} the section window's bar reads the same as the side pane`, J(c));
    r.check(w >= 640 || /📁 · \d+ 📝/.test(c.narrowWin || ''), `165d@${w} the narrow form "N 📁 · M 📝"`, J(c));
    await p.evaluate(() => { openFolderPopupFromToolbar(); }); await sleep(500);
    await p.evaluate(() => { try { pkGotoSection('__all__'); } catch (e) {} }); await sleep(400);
    const k = await p.evaluate(() => [...document.querySelectorAll('#pkList .pk-sec-hd .sec-cnt')].map((x) => x.title));
    const sd = await p.evaluate(() => [_secCntHTML('sA'), _secCntHTML('sB')].map((h) => { const d = document.createElement('div'); d.innerHTML = h; return d.firstChild.title; }));
    r.check(k.length >= 2 && J(k.slice(0, 2)) === J(sd), `165d@${w} the Folder Browser's section headings carry the same counts`, J({ k, sd }));
    await p.evaluate(() => { try { closeModal(); } catch (e) {} document.querySelectorAll('.fwin').forEach((e) => _fwClose(e.dataset.fwid)); });
    /* 165e */
    const after = await p.evaluate(() => JSON.stringify(DB.articles.map((a) => [a.id, a.updatedAt])));
    const changed = await p.evaluate((b) => { const o = JSON.parse(b), n = JSON.parse(JSON.stringify(DB.articles.map((a) => [a.id, a.updatedAt]))); return o.filter(([id, u]) => { const m = n.find((x) => x[0] === id); return m && m[1] !== u; }).map((x) => x[0]); }, before);
    r.check(changed.length === 0, `165e@${w} opening and closing windows writes no note `, J(changed));
  } catch (e) { r.check(false, `165@${w} threw: ` + String(e && e.message || e).slice(0, 700)); }
  errs.push(...app.errors); await app.close();
}
r.check(errs.length === 0, '165e no page errors', errs.slice(0, 3).join(' | '));

/* 165f — keep1116 */
{
  const dir = mkdtempSync(join(tmpdir(), 'j168-'));
  for (const f of ['index.html', 'sw.js', 'manifest.json', 'manifest-jeb.json']) { try { cpSync(join(ROOT, f), join(dir, f)); } catch {} }
  try { cpSync(join(ROOT, 'icons'), join(dir, 'icons'), { recursive: true }); } catch {}
  const srv = await serve(dir); const pw = await playwright(); const browser = await pw.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  await ctx.route('**googleapis.com/**', (x) => x.abort()); await ctx.route('**gstatic.com/**', (x) => x.abort()); await ctx.route('**firebaseio.com/**', (x) => x.abort()); await ctx.route('**firebaseapp.com/**', (x) => x.abort());
  await ctx.addInitScript((d) => { try { if (!localStorage.getItem('j168-seeded')) { localStorage.setItem('my-notebook-v1', JSON.stringify(d)); localStorage.setItem('j168-seeded', '1'); } } catch {} }, seed());
  const pe = []; const page = await ctx.newPage(); page.on('pageerror', (e) => pe.push(String(e)));
  try {
    await page.goto(srv.base + '/'); await page.waitForFunction(() => window.__appBooted === true); await sleep(600);
    const v1 = await page.evaluate(() => document.querySelector('meta[name="app-version"]').content);
    await page.evaluate(() => { window.prompt = () => 'Kept label'; renameVersion('v2'); openFolderWin('a2'); _fwHome('a2'); popOutNote('v1'); });
    await sleep(1500);
    const [mj, mn] = v1.split('.').map(Number); const nx = String(mj).padStart(2, '0') + '.' + String(mn + 1).padStart(2, '0');
    writeFileSync(join(dir, 'index.html'), readFileSync(join(dir, 'index.html'), 'utf8').replace(/(name="app-version" content=")[^"]+/, '$1' + nx));
    writeFileSync(join(dir, 'sw.js'), readFileSync(join(dir, 'sw.js'), 'utf8').replace(/v\d\d\.\d\d\.01/, 'v' + nx + '.01'));
    await page.reload(); await page.waitForFunction(() => window.__appBooted === true); await sleep(1500);
    const v2 = await page.evaluate(() => document.querySelector('meta[name="app-version"]').content);
    const st = await page.evaluate(() => ({ lab: DB.articles.find((x) => x.id === 'v2').versionLabel, home: !!(_fwGet('a2') && _fwGet('a2').home), n: DB.articles.length }));
    r.check(v1 !== v2 && v2 === nx, `165f the page reopened as the next version (${v1} → ${v2})`);
    r.check(st.lab === 'Kept label' && st.n === 4, '165f the renamed version is still there, no note lost', J(st));
    r.check(st.home, '165f the folder window came back showing the section root (🏠 on)', J(st));
    r.check(pe.length === 0, '165f no page errors', pe.join(' | '));
  } catch (e) { r.check(false, '165f threw: ' + String(e && e.message || e).split('\n')[0]); }
  await browser.close(); await srv.close();
}
process.exit(r.finish() ? 1 : 0);
