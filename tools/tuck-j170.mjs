#!/usr/bin/env node
/* tools/tuck-j170.mjs — v06.07, J170 (block 166): a pop-up window tucked into a chip.
   166a (390 / 820 / 1440) a double-click (computer) / double-tap (phone, tablet) on a ⧉ folder window's bar and on a note window's bar tucks it into a chip; a single press-and-drag still moves the window (820, 1440; a phone's window is a sheet)
   166b where the chips sit: 1440 = folder chip inside the side pane's top band, note chip inside the note pane's top band; 390 / 820 = ONE bottom row above the Zab bar, never over it
   166c a tap on a chip opens the window again at the same box (±1 px); ✕ closes it
   166d tucking and reopening write no note (updatedAt and DB.articles unchanged); no page errors
   166e text typed in a note window, then tucked and reopened, is saved and still there
   166f (keep1116) tucked chips and boxes, reloaded as the NEXT version, are as left
   node tools/tuck-j170.mjs */
import { openApp, report, serve, playwright, ROOT, seedDB } from './harness.mjs';
import { mkdtempSync, cpSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const r = report('J170 — tuck a pop-up into a chip');
const errs = [];
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const now = new Date().toISOString();
const note = (id, fo, o = {}) => ({ id, title: 'Note ' + id, content: '<p>alpha ' + id + '</p>', folderIds: fo, tags: [], createdAt: now, updatedAt: now, kind: 'general', ...o });
function seed() {
  const d = seedDB(now);
  d.sections = [{ id: 'sA', name: 'Section A', order: 0, updatedAt: now }];
  d.folders = [{ id: 'a1', name: 'Folder One', parentId: null, order: 1, sectionId: 'sA', updatedAt: now }];
  d.articles = [note('n3', ['a1']), note('n4', ['a1'])];
  d.trash = [];
  return d;
}
const J = (o) => JSON.stringify(o);
const SKIP = 'button,input,textarea,select,a,.tab-it,.tab-add-btn,.tab-nav,.tab-x,.pf-act,.fw-close,.pf-ti';
const barPt = (p, sel) => p.evaluate(({ sel, skip }) => {
  const b = document.querySelector(sel); if (!b) return null; const rc = b.getBoundingClientRect();
  for (const fy of [.5, .3, .7]) for (let x = rc.left + 10; x < rc.right - 10; x += 5) {
    const y = rc.top + rc.height * fy, e = document.elementFromPoint(x, y);
    if (e && b.contains(e) && !e.closest(skip)) return { x, y };
  } return null;
}, { sel, skip: SKIP });
const box = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const c = e.getBoundingClientRect(); return { l: Math.round(c.left), t: Math.round(c.top), w: Math.round(c.width), h: Math.round(c.height), shown: getComputedStyle(e).display !== 'none' }; }, sel);
const near = (a, b) => a && b && ['l', 't', 'w', 'h'].every((k) => Math.abs(a[k] - b[k]) <= 1);
async function dbl(p, pt, touch) {
  if (touch) { await p.touchscreen.tap(pt.x, pt.y); await sleep(60); await p.touchscreen.tap(pt.x, pt.y); }
  else await p.mouse.dblclick(pt.x, pt.y);
  await sleep(350);
}
const stamp = (p) => p.evaluate(() => JSON.stringify(DB.articles.map((a) => [a.id, a.updatedAt, a.content, a.title])));
const FB = '.fwin[data-fwid="a1"] .fwin-bar', NB = '#fw-n3 .fw-hd';

for (const w of [390, 820, 1440]) {
  const touch = w < 1200;
  const app = await openApp({ viewport: { width: w, height: w === 390 ? 844 : w === 820 ? 1180 : 900 }, db: seed(), hasTouch: touch });
  const p = app.page;
  try {
    await p.evaluate(() => { openFolderWin('a1'); }); await p.waitForSelector('.fwin[data-fwid="a1"]'); await sleep(300);
    const fb0 = await box(p, '.fwin[data-fwid="a1"]');
    let fbPhone = null;
    if (w < 640) { fbPhone = fb0; await dbl(p, await barPt(p, FB), touch); }   /* a phone's note sheet lies over the folder sheet: tuck the folder first */
    await p.evaluate(() => { popOutNote('n3'); }); await p.waitForSelector('#fw-n3'); await sleep(400);
    const s0 = await stamp(p);
    const nb0 = await box(p, '#fw-n3');
    /* 166a — a single press-and-drag still moves the window (a phone's window is a sheet) */
    if (w >= 640) {
      const pt = await barPt(p, FB);
      await p.mouse.move(pt.x, pt.y); await p.mouse.down(); await p.mouse.move(pt.x + 40, pt.y + 30, { steps: 5 }); await p.mouse.up(); await sleep(200);
      const fm = await box(p, '.fwin[data-fwid="a1"]');
      r.check(Math.abs(fm.l - fb0.l) + Math.abs(fm.t - fb0.t) >= 25 && fm.shown, `166a@${w} a single press-and-drag still moves the folder window`, J({ fb0, fm }));
      const np = await barPt(p, NB);
      await p.mouse.move(np.x, np.y); await p.mouse.down(); await p.mouse.move(np.x + 30, np.y + 20, { steps: 5 }); await p.mouse.up(); await sleep(200);
      const nm = await box(p, '#fw-n3');
      r.check(Math.abs(nm.l - nb0.l) + Math.abs(nm.t - nb0.t) >= 15 && nm.shown && !(await p.evaluate(() => document.querySelector('.tk-chip'))), `166a@${w} … and the note window, with no chip made`, J({ nb0, nm }));
    }
    const fb1 = fbPhone || await box(p, '.fwin[data-fwid="a1"]'), nb1 = await box(p, '#fw-n3');
    /* tuck both */
    if (w >= 640) await dbl(p, await barPt(p, FB), touch);
    const fHid = await p.evaluate(() => { const e = document.querySelector('.fwin[data-fwid="a1"]'); return getComputedStyle(e).display === 'none'; });
    r.check(fHid && await p.locator('.tk-chip[data-k="f"]').count() === 1, `166a@${w} ${touch ? 'a double-tap' : 'a double-click'} on the folder window's bar tucks it into a chip`);
    const np2 = await barPt(p, NB); await dbl(p, np2, touch);
    const nHid = await p.evaluate(() => getComputedStyle(document.getElementById('fw-n3')).display === 'none');
    r.check(nHid && await p.locator('.tk-chip[data-k="n"]').count() === 1, `166a@${w} … and on the note window's bar`);
    const chips = await p.evaluate(() => [...document.querySelectorAll('.tk-chip')].map((c) => ({ k: c.dataset.k, t: c.textContent, title: c.title })));
    r.check(chips.some((c) => c.k === 'f' && c.t.includes('📁') && c.t.includes('Folder One') && c.title.includes('Folder One')) && chips.some((c) => c.k === 'n' && c.t.includes('📝') && c.title.includes('Note n3')), `166a@${w} the chips carry the icon, the name and a full title`, J(chips));
    /* 166b — where the chips sit */
    const pl = await p.evaluate(() => {
      const R = (e) => { if (!e) return null; const c = e.getBoundingClientRect(); return { l: c.left, t: c.top, r: c.right, b: c.bottom }; };
      const fc = document.querySelector('.tk-chip[data-k="f"]'), nc = document.querySelector('.tk-chip[data-k="n"]');
      const bar = document.getElementById('jeb-bar'), zb = document.getElementById('zab-btn');
      const barR = bar && bar.getBoundingClientRect().height > 4 && getComputedStyle(bar).display !== 'none' ? R(bar) : null;
      const zbR = zb && getComputedStyle(zb).display !== 'none' ? R(zb) : null;
      return { f: R(fc), n: R(nc), sb: R(document.getElementById('sb')), p3: R(document.getElementById('p3')), bot: R(document.getElementById('tk-bot')), inBot: !!document.querySelector('#tk-bot .tk-chip[data-k="f"]') && !!document.querySelector('#tk-bot .tk-chip[data-k="n"]'), barR, zbR, bots: document.querySelectorAll('#tk-bot').length, ih: innerHeight, z: getComputedStyle(document.querySelector('.tk-row')).zIndex };
    });
    const inside = (c, pn) => c && pn && c.l >= pn.l - 1 && c.r <= pn.r + 1 && c.t >= pn.t - 1 && c.t - pn.t < 60;
    if (w >= 1200) r.check(inside(pl.f, pl.sb) && inside(pl.n, pl.p3), `166b@${w} the folder chip sits in the side pane's top band, the note chip in the note pane's`, J(pl));
    else {
      const aboveBar = pl.barR ? pl.bot.b <= pl.barR.t + 1 && pl.bot.b >= pl.barR.t - 12 : pl.bot.b <= pl.ih;
      const clearZb = !pl.zbR || pl.bot.r <= pl.zbR.l + 1 || pl.bot.b <= pl.zbR.t + 1;
      r.check(pl.bots === 1 && pl.inBot && aboveBar && clearZb, `166b@${w} ONE bottom row holds both chips, above the Zab bar, never over it`, J(pl));
    }
    r.check(+pl.z < 9200, `166b@${w} the chip row is below menus (9200) and modals (10000)`, pl.z);
    /* 166c — a tap reopens at the same box; ✕ closes */
    await p.locator('.tk-chip[data-k="f"] .tk-open').click(); await sleep(300);
    const fb2 = await box(p, '.fwin[data-fwid="a1"]');
    r.check(fb2 && fb2.shown && near(fb1, fb2), `166c@${w} a tap on the folder chip reopens the window at the same box`, J({ fb1, fb2 }));
    await p.locator('.tk-chip[data-k="n"] .tk-open').click(); await sleep(300);
    const nb2 = await box(p, '#fw-n3');
    r.check(nb2 && nb2.shown && near(nb1, nb2), `166c@${w} a tap on the note chip reopens the note window at the same box`, J({ nb1, nb2 }));
    r.check(await p.evaluate(() => document.querySelectorAll('.tk-chip').length) === 0, `166c@${w} the chips are gone once both are open`);
    await dbl(p, await barPt(p, NB), touch); await dbl(p, await barPt(p, FB), touch);
    await p.locator('.tk-chip[data-k="f"] .tk-x').click(); await sleep(200);
    r.check(await p.evaluate(() => !_fwGet('a1') && !document.querySelector('.fwin[data-fwid="a1"]')), `166c@${w} ✕ on the folder chip closes the window`);
    await p.locator('.tk-chip[data-k="n"] .tk-x').click(); await sleep(300);
    r.check(await p.evaluate(() => !document.getElementById('fw-n3') && !document.querySelector('.tk-chip')), `166c@${w} ✕ on the note chip closes the window`);
    /* 166d */
    const s1 = await stamp(p);
    r.check(s0 === s1, `166d@${w} tucking, reopening and closing wrote no note`, s0 === s1 ? '' : 'DB.articles changed');
    /* 166e — typing */
    await p.evaluate(() => popOutNote('n4')); await p.waitForSelector('#fw-n4'); await sleep(400);
    await p.evaluate(() => { const e = document.querySelector('#fw-n4 .fw-ed'); e.focus(); const s = getSelection(), rg = document.createRange(); rg.selectNodeContents(e); rg.collapse(false); s.removeAllRanges(); s.addRange(rg); });
    await p.keyboard.type(' TYPEDZZ');
    await dbl(p, await barPt(p, '#fw-n4 .fw-hd'), touch);
    const saved = await p.evaluate(() => DB.articles.find((a) => a.id === 'n4').content);
    r.check(saved.includes('TYPEDZZ'), `166e@${w} text typed in a note window is saved when it is tucked`, saved);
    await p.locator('.tk-chip[data-k="n"] .tk-open').click(); await sleep(300);
    r.check(await p.evaluate(() => document.querySelector('#fw-n4 .fw-ed').textContent.includes('TYPEDZZ')), `166e@${w} … and still there after reopening`);
  } catch (e) { r.check(false, `166@${w} threw: ` + String(e && e.message || e).slice(0, 700)); }
  errs.push(...app.errors); await app.close();
}
r.check(errs.length === 0, '166d no page errors', errs.slice(0, 3).join(' | '));

/* 166f — keep1116 */
{
  const dir = mkdtempSync(join(tmpdir(), 'j170-'));
  for (const f of ['index.html', 'sw.js', 'manifest.json', 'manifest-jeb.json']) { try { cpSync(join(ROOT, f), join(dir, f)); } catch {} }
  try { cpSync(join(ROOT, 'icons'), join(dir, 'icons'), { recursive: true }); } catch {}
  const srv = await serve(dir); const pw = await playwright(); const browser = await pw.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  await ctx.route('**googleapis.com/**', (x) => x.abort()); await ctx.route('**gstatic.com/**', (x) => x.abort()); await ctx.route('**firebaseio.com/**', (x) => x.abort()); await ctx.route('**firebaseapp.com/**', (x) => x.abort());
  await ctx.addInitScript((d) => { try { if (!localStorage.getItem('j170-seeded')) { localStorage.setItem('my-notebook-v1', JSON.stringify(d)); localStorage.setItem('j170-seeded', '1'); } } catch {} }, seed());
  const pe = []; const page = await ctx.newPage(); page.on('pageerror', (e) => pe.push(String(e)));
  try {
    await page.goto(srv.base + '/'); await page.waitForFunction(() => window.__appBooted === true); await sleep(600);
    const v1 = await page.evaluate(() => document.querySelector('meta[name="app-version"]').content);
    await page.evaluate(() => { openFolderWin('a1'); popOutNote('n3'); }); await sleep(900);
    const fb1 = await box(page, '.fwin[data-fwid="a1"]'), nb1 = await box(page, '#fw-n3');
    await dbl(page, await barPt(page, FB), false); await dbl(page, await barPt(page, NB), false); await sleep(1500);
    const [mj, mn] = v1.split('.').map(Number); const nx = String(mj).padStart(2, '0') + '.' + String(mn + 1).padStart(2, '0');
    writeFileSync(join(dir, 'index.html'), readFileSync(join(dir, 'index.html'), 'utf8').replace(/(name="app-version" content=")[^"]+/, '$1' + nx));
    writeFileSync(join(dir, 'sw.js'), readFileSync(join(dir, 'sw.js'), 'utf8').replace(/v\d\d\.\d\d\.01/, 'v' + nx + '.01'));
    await page.reload(); await page.waitForFunction(() => window.__appBooted === true); await sleep(1800);
    const v2 = await page.evaluate(() => document.querySelector('meta[name="app-version"]').content);
    r.check(v1 !== v2 && v2 === nx, `166f the page reopened as the next version (${v1} → ${v2})`);
    const st = await page.evaluate(() => ({ f: !!document.querySelector('#tk-sb .tk-chip[data-k="f"]'), n: !!document.querySelector('#tk-p3 .tk-chip[data-k="n"]'), fw: !!(_fwGet('a1') && _fwGet('a1').tk), fshown: getComputedStyle(document.querySelector('.fwin[data-fwid="a1"]')).display !== 'none' }));
    r.check(st.f && st.n && st.fw && !st.fshown, '166f both chips are back after the reload, the folder window still tucked', J(st));
    await page.locator('.tk-chip[data-k="f"] .tk-open').click(); await sleep(400);
    await page.locator('.tk-chip[data-k="n"] .tk-open').click(); await sleep(600);
    const fb2 = await box(page, '.fwin[data-fwid="a1"]'), nb2 = await box(page, '#fw-n3');
    r.check(near(fb1, fb2), '166f the folder window opens at the box it had', J({ fb1, fb2 }));
    r.check(near(nb1, nb2), '166f the note window opens at the box it had', J({ nb1, nb2 }));
    r.check(pe.length === 0, '166f no page errors', pe.join(' | '));
  } catch (e) { r.check(false, '166f threw: ' + String(e && e.message || e).split('\n')[0]); }
  await browser.close(); await srv.close();
}
process.exit(r.finish() ? 1 : 0);
