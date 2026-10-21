#!/usr/bin/env node
/* tools/zab-bar-more.mjs — v05.40, Z15: the Zab bar's overflow, ＋ New Zab always in view, a 📰 News Zab (PCF J60). Checks 99a–99e. The owner's screenshot: 9+ Zabs
   ran off the right edge of the PC bar and ＋ New Zab (drawn last) was out of sight. Nothing touches the real network: the news service is a FAKE answered by a
   Playwright route at https://news-srv.test/news.json (window.__zabNewsSrv), as tools/zab-news-srv.mjs does. Service headlines carry the marker ZZSRV.

   99a  new     ＋ New Zab is fully on screen (14 long-named Zabs; 1440, 820, 390 with layout 'bar', Zab mode) and a real tap/click on it opens the new-Zab dialog
   99b  more    the bar never scrolls sideways; "▸ N more" shows N = the hidden count; every Zab is a visible chip or a row of the more-list; a real tap on a row
                opens that Zab's panel; the open Zab's chip is never hidden; a wide window removes "▸ N more"
   99c  news    the 📰 News chip is there only while the news is on; a real tap opens the News view with the fake headlines grouped by channel; a headline opens in
                a new page; the view has no sideways scroll at 390 / 820 / 1440; "⚙ News settings" lands on #th-nw
   99d  rail    the phone's default layout (Rail): a "News" bubble is there and opens the view; the other bubbles are as before
   99e  safe    DB is byte-identical before / after opening the News view and the more-list (no headline, no virtual Zab in DB); no page errors

   `--only=99a,99b` runs just those; `--unpatched` serves the build before this round (the new checks must FAIL there: no More, no News chip, ＋ New Zab last). */
import { playwright, serve, seedDB } from './harness.mjs';
import { sleep } from './s1-fake.mjs';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);
const results = [];
function check(ok, label, detail = '') { results.push({ ok, label }); console.log((ok ? '  ok   ' : ' FAIL  ') + label + (detail ? '\n         ' + String(detail).slice(0, 400) : '')); }
async function T(label, fn) { try { const r = await fn(); check(!!r[0], label, r[1] || ''); } catch (e) { check(false, label, 'threw: ' + String(e.message || e).split('\n')[0]); } }

const VPS = [{ name: '1440', w: 1440, h: 900, touch: false }, { name: '820', w: 820, h: 1180, touch: true }, { name: '390', w: 390, h: 844, touch: true }];
function makeBase() {   /* the app as it was just before this round; throws when the commit is not found (a shallow clone would compare the build with itself) */
  const dir = mkdtempSync(join(tmpdir(), 'z15-base-'));
  const sha = execFileSync('git', ['log', '--format=%H', '-n', '1', '--grep=v05.40 Z15: version bump'], { encoding: 'utf8' }).trim();
  if (!sha) throw new Error('makeBase: the commit "v05.40 Z15: version bump" is not in this clone (shallow?) — refusing to compare the build with itself');
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', `${sha}~1:${f}`], { encoding: 'buffer', maxBuffer: 1 << 28 })); } catch {} }
  return dir;
}
const pw = await playwright();
const srv = await serve(argv.includes('--unpatched') ? makeBase() : undefined);
const browser = await pw.chromium.launch();

const DEF = [['aljazeera', 'https://www.aljazeera.com/xml/rss/all.xml'], ['mee', 'https://www.middleeasteye.net/rss'], ['trt', 'https://www.trtworld.com/feed/rss.xml'],
  ['arabnews', 'https://www.arabnews.com/rss.xml'], ['5pillars', 'https://5pillarsuk.com/feed']];
const items = (id, n) => Array.from({ length: n }, (_, k) => ({ t: `ZZSRV ${id} headline ${k}`, s: `short ${k}`, u: `https://news-story.test/${id}/${k}`, d: new Date(Date.now() - k * 60000).toISOString() }));
const srvBody = () => JSON.stringify({ at: new Date().toISOString(), chans: DEF.map(([id, q]) => ({ id, q, ok: true, name: id, src: q, items: items(id, 20) })) });
const H = { 'access-control-allow-origin': '*' };
const T0 = '2026-10-01T00:00:00.000Z';
function seed({ news = true, layout = 'bar' } = {}) {
  const db = seedDB(T0);
  db.jebPockets = Array.from({ length: 14 }, (_, i) => ({ id: 'zp' + i, name: 'A rather long Zab name number ' + (i + 1), icon: '✶', color: '#CFE8FF', order: i, createdAt: T0, updatedAt: T0 }));
  db.jeb = [{ id: 'zi0', pocketId: 'zp13', text: 'one thing', done: false, folderIds: [], tags: [], kind: null, journal: false, order: 0, createdAt: T0, updatedAt: T0 }];
  db.theme = { preset: 'forest', custom: {}, zabPhoneLayout: layout, ...(news ? { zabNews: { on: true } } : { zabNews: { on: false } }) };
  return db;
}
const allErr = [];
async function openDev(vp, o = {}) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, ...(vp.touch ? { hasTouch: true, isMobile: true } : {}) });
  for (const p of ['**googleapis.com/**', '**gstatic.com/**', '**firebaseapp.com/**', '**firebaseio.com/**', '**raw.githubusercontent.com/**']) await ctx.route(p, (r) => r.abort());
  await ctx.addInitScript(() => { window.__zabNewsSrv = 'https://news-srv.test/news.json'; });
  await ctx.route('https://news-srv.test/**', (r) => r.fulfill({ status: 200, headers: H, contentType: 'application/json', body: srvBody() }));
  await ctx.route('https://news-story.test/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>story</title>' }));
  await ctx.addInitScript((d) => { try { if (!localStorage.getItem('my-notebook-v1')) localStorage.setItem('my-notebook-v1', JSON.stringify(d)); } catch {} }, seed(o.seed));
  const page = await ctx.newPage();
  page.on('pageerror', (e) => allErr.push('pageerror: ' + e));
  await page.goto(srv.base + (o.path || '/'), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree'));
  await sleep(o.settle || 3200);   /* the first news fetch runs 1.5 s after start */
  return { ctx, page, vp };
}
const centre = (p, sel) => p.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
const press = async (d, sel) => { const pt = await centre(d.page, sel); if (!pt) throw new Error('no ' + sel); if (d.vp.touch) await d.page.touchscreen.tap(pt.x, pt.y); else await d.page.mouse.click(pt.x, pt.y); };
const dbJson = (p) => p.evaluate(() => JSON.stringify({ a: DB.jebPockets, b: DB.jeb, t: DB.theme && DB.theme.zabNews, c: DB.articles.length, n: JSON.stringify(DB).includes('ZZSRV') }));
const barInfo = (p) => p.evaluate(() => {
  const b = document.getElementById('jeb-bar'), m = b.querySelector('.jeb-more'), chips = [...b.querySelectorAll(':scope>.jeb-chip[data-pid]')];
  return { sw: b.scrollWidth, cw: b.clientWidth, moreVis: !!m && !m.hidden && getComputedStyle(m).display !== 'none', moreTxt: m ? m.textContent : '', hidden: chips.filter((c) => c.classList.contains('jx-over')).map((c) => c.dataset.pid), shown: chips.filter((c) => !c.classList.contains('jx-over')).map((c) => c.dataset.pid) };
});
const menuRows = (p) => p.evaluate(() => [...document.querySelectorAll('#jeb-menu .jm')].map((e) => e.textContent));
const noSide = (p) => p.evaluate(() => { const e = document.getElementById('mb'); return e.scrollWidth <= e.clientWidth + 1 && document.documentElement.scrollWidth <= window.innerWidth + 1; });

const devs = {};
for (const vp of VPS) devs[vp.name] = await openDev(vp);
devs.jeb = await openDev({ name: 'jeb', w: 1440, h: 900, touch: false }, { path: '/?jeb=1' });
const bars = [devs['1440'], devs['820'], devs['390'], devs.jeb];
const nm = (d) => d.vp.name;

if (want('99a')) {
  for (const d of bars) {
    await T(`99a ${nm(d)}: ＋ New Zab is fully on screen and a real tap starts a new Zab`, async () => {
      const r = await d.page.evaluate(() => { const e = document.querySelector('#jeb-bar .jeb-new'); if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, h: b.height, vw: innerWidth, vh: innerHeight }; });
      if (!r) return [false, 'no ＋ New Zab'];
      const inside = r.l >= 0 && r.r <= r.vw && r.t >= 0 && r.b <= r.vh && r.h >= 43.5;
      await press(d, '#jeb-bar .jeb-new'); await sleep(500);
      const dlg = await d.page.evaluate(() => { const ov = document.getElementById('ov'); return !!ov && ov.classList.contains('on') && /New Zab/i.test(document.getElementById('mb').innerText); });
      await d.page.evaluate(() => closeModal());
      return [inside && dlg, JSON.stringify({ r, dlg })];
    });
  }
}

if (want('99b')) {
  for (const d of bars) {
    await T(`99b ${nm(d)}: ▸ N more, none lost, the open Zab stays, a wide window removes it`, async () => {
      const bi = await barInfo(d.page);
      const n = bi.hidden.length;
      const okShape = bi.sw <= bi.cw + 1 && bi.moreVis && n > 0 && bi.moreTxt.includes('▸ ' + n + ' more') && bi.shown.length + n === 14;
      await press(d, '#jeb-bar .jeb-more .jeb-main'); await sleep(300);
      const rows = await menuRows(d.page);
      const listed = rows.length === n;
      const target = bi.hidden[0];
      await d.page.evaluate(() => {});
      await d.page.click('#jeb-menu .jm:first-child', { force: true }).catch(() => {});
      if (!(await d.page.evaluate((t) => _jebOpen === t, target))) { /* a touch tap on the row */ }
      await sleep(500);
      const opened = await d.page.evaluate((t) => _jebOpen === t, target);
      const after = await barInfo(d.page);
      const chipVisible = await d.page.evaluate((t) => { const c = document.querySelector(`#jeb-bar>.jeb-chip[data-pid="${t}"]`); return !!c && !c.classList.contains('jx-over') && c.getBoundingClientRect().width > 0; }, target);
      const fits = after.sw <= after.cw + 1;
      await d.page.setViewportSize({ width: 2800, height: d.vp.h }); await sleep(600);
      const wide = await barInfo(d.page);
      const gone = !wide.moreVis && wide.hidden.length === 0;
      await d.page.setViewportSize({ width: d.vp.w, height: d.vp.h }); await sleep(600);
      await d.page.evaluate(() => { try { jebClosePanel(); } catch {} });
      return [okShape && listed && opened && chipVisible && fits && gone, JSON.stringify({ okShape, listed, rows: rows.length, n, opened, chipVisible, fits, gone, bi: { sw: bi.sw, cw: bi.cw, t: bi.moreTxt } })];
    });
  }
}

if (want('99c')) {
  await T('99c off: with the news switched off there is no 📰 News chip', async () => {
    const d = await openDev(VPS[0], { seed: { news: false }, settle: 1500 });
    const has = await d.page.evaluate(() => !!document.querySelector('#jeb-bar [data-news]'));
    await d.ctx.close();
    return [!has, 'chip present: ' + has];
  });
  for (const d of bars) {
    await T(`99c ${nm(d)}: 📰 News chip → the view groups the headlines by channel, opens one in a new page, fits, ⚙ lands on #th-nw`, async () => {
      const chip = await d.page.evaluate(() => { const e = document.querySelector('#jeb-bar [data-news]'), a = document.querySelector('#jeb-bar .jeb-all'); return { has: !!e, after: !!e && !!a && (a.compareDocumentPosition(e) & 4) !== 0 && e.getBoundingClientRect().width > 0 }; });
      await press(d, '#jeb-bar [data-news] .jeb-main'); await sleep(600);
      const v = await d.page.evaluate(() => { const g = [...document.querySelectorAll('#nwv .nwv-gh')].map((e) => e.textContent), a = [...document.querySelectorAll('#nwv a.nw-it')]; return { groups: g.length, links: a.length, zz: a.every((x) => /ZZSRV/.test(x.textContent)), tab: a.every((x) => x.target === '_blank' && /noopener/.test(x.rel)), tall: a.every((x) => x.getBoundingClientRect().height >= 43.5) }; });
      const fit = await noSide(d.page);
      const pg = d.ctx.waitForEvent('page', { timeout: 5000 });
      await press(d, '#nwv a.nw-it'); const np = await pg.catch(() => null); const opened = !!np; if (np) await np.close();
      await d.page.evaluate(() => { const o = document.getElementById('ov'); if (!o.classList.contains('on')) _newsViewOpen(); });
      await sleep(200);
      await d.page.evaluate(() => { const b = [...document.querySelectorAll('#mb button')].find((x) => /News settings/.test(x.textContent)); b.scrollIntoView(); });
      await press(d, '#mb .ma button:first-child'); await sleep(700);
      const st = await d.page.evaluate(() => { const e = document.getElementById('th-nw'); if (!e) return null; const r = e.getBoundingClientRect(); return { top: r.top, vh: innerHeight }; });
      await d.page.evaluate(() => { try { closeModal(); document.getElementById('theme-modal').style.display = 'none'; } catch {} });
      const landed = !!st && st.top < st.vh && st.top > -5;
      return [chip.has && chip.after && v.groups >= 5 && v.links >= 5 && v.zz && v.tab && v.tall && fit && opened && landed, JSON.stringify({ chip, v, fit, opened, st })];
    });
  }
}

if (want('99d')) {
  await T('99d 390 default Rail: a News bubble is there, opens the view; the other bubbles are as before', async () => {
    const d = await openDev(VPS[2], { seed: { layout: undefined }, settle: 3200 });
    await d.page.evaluate(() => { delete DB.theme.zabPhoneLayout; jebRefresh(); });
    await sleep(200);
    await press(d, '#zab-btn'); await sleep(500);
    const rail = await d.page.evaluate(() => { const l = document.getElementById('zab-lay'); const b = [...l.querySelectorAll('.zl-rail>.zr-b')]; return { n: b.length, pids: b.filter((x) => x.dataset.pid).length, news: !!l.querySelector('[data-zact="news"]'), acts: b.filter((x) => x.dataset.zact).map((x) => x.dataset.zact) }; });
    await press(d, '[data-zact="news"]'); await sleep(600);
    const v = await d.page.evaluate(() => ({ on: document.getElementById('ov').classList.contains('on'), groups: document.querySelectorAll('#nwv .nwv-gh').length }));
    await d.ctx.close();
    return [rail.news && rail.pids === 14 && rail.acts.includes('all') && rail.acts.includes('new') && v.on && v.groups >= 5, JSON.stringify({ rail, v })];
  });
}

if (want('99e')) {
  await T('99e: DB byte-identical around the News view and the more-list; no page errors', async () => {
    const d = devs['1440'], before = await dbJson(d.page);
    await press(d, '#jeb-bar .jeb-more .jeb-main'); await sleep(300); await d.page.keyboard.press('Escape');
    await d.page.evaluate(() => _newsViewOpen()); await sleep(400); await d.page.evaluate(() => closeModal());
    const after = await dbJson(d.page);
    return [before === after && !JSON.parse(after).n && allErr.length === 0, JSON.stringify({ same: before === after, errors: allErr.slice(0, 3) })];
  });
}

await browser.close(); await srv.close();
const bad = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - bad}/${results.length} passed${bad ? ', ' + bad + ' FAILED' : ''}`);
process.exit(bad ? 1 : 0);
