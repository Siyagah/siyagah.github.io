#!/usr/bin/env node
/* tools/zab-open-link.mjs — v05.38, Z14: "🔗 Open link" in an item's menu (PCF J57). Checks 98a–98c. The owner tapped a saved Facebook link in the scrolling band
   and got the item menu with no way to open the address. Nothing touches the real network: the address is https://link-target.test/…, answered by a route.

   98a  band   a real tap / click on a link item in the band opens its menu, whose FIRST row is "🔗 Open link"; a tap on it opens the address in a new page
               and closes the menu — at 390, 820, 1440 and Zab mode (/?jeb=1)
   98b  where  an address in the middle of an item's text is found too (without the trailing full stop); an item with no address has no "Open link" row;
               a Links Zab item uses its stored `url`
   98c  safe   opening a link changes nothing in DB (no edit, no updatedAt), and no page errors

   `--only=98a` runs just that; `--unpatched` serves the build before this round (98a and the "found too" half of 98b must FAIL there). */
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

const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];
function makeBase() {   /* the app as it was just before this round; throws when the commit is not found (a shallow clone would compare the build with itself) */
  const dir = mkdtempSync(join(tmpdir(), 'z14-base-'));
  const sha = execFileSync('git', ['log', '--format=%H', '-n', '1', '--grep=v05.38 Z14: version bump'], { encoding: 'utf8' }).trim();
  if (!sha) throw new Error('makeBase: the commit "v05.38 Z14: version bump" is not in this clone (shallow?) — refusing to compare the build with itself');
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', `${sha}~1:${f}`], { encoding: 'buffer', maxBuffer: 1 << 28 })); } catch {} }
  return dir;
}
const pw = await playwright();
const srv = await serve(argv.includes('--unpatched') ? makeBase() : undefined);
const browser = await pw.chromium.launch();

const T0 = '2026-10-01T00:00:00.000Z';
function seed() {
  const db = seedDB(T0);
  const pk = (id, i, e = {}) => ({ id, name: id, icon: '✶', color: '#CFE8FF', order: i, createdAt: T0, updatedAt: T0, ...e });
  const mk = (id, pocketId, text, order, e = {}) => ({ id, pocketId, text, done: false, folderIds: [], tags: [], kind: null, journal: false, order, createdAt: T0, updatedAt: T0, ...e });
  db.jebPockets = [pk('jp-idea', 0, { name: 'Ideas', icon: '💡' }), pk('jp-link', 1, { name: 'Links', icon: '🔗' })];
  db.jeb = [mk('l1', 'jp-idea', 'https://link-target.test/share/v/1E9CiUqF8h/', 0), mk('l2', 'jp-idea', 'Read this later: https://link-target.test/mid?a=1. Then decide', 1),
    mk('n1', 'jp-idea', 'Call the bank', 2), mk('k1', 'jp-link', 'A saved video', 0, { url: 'https://link-target.test/stored' })];
  db.theme = { preset: 'forest', custom: {}, zabTicker: { on: true } };
  return db;
}
const allErr = [];
async function openDev(vp, o = {}) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, ...(vp.touch ? { hasTouch: true, isMobile: true } : {}) });
  for (const p of ['**googleapis.com/**', '**gstatic.com/**', '**firebaseapp.com/**', '**firebaseio.com/**', '**raw.githubusercontent.com/**', '**youtube.com/**']) await ctx.route(p, (r) => r.abort());
  await ctx.route('https://link-target.test/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>target</title>' }));
  await ctx.addInitScript((d) => { try { if (!localStorage.getItem('my-notebook-v1')) localStorage.setItem('my-notebook-v1', JSON.stringify(d)); } catch {} }, seed());
  const page = await ctx.newPage();
  page.on('pageerror', (e) => allErr.push('pageerror: ' + e));
  await page.goto(srv.base + (o.path || '/'), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree'));
  await sleep(1200);
  return { ctx, page, vp };
}
/* hold the band still with one item at the left edge (as 96b does) */
const park = (p, sel) => p.evaluate((sel) => { const b = document.getElementById('zab-tk'), it = b.querySelector(sel); _tkPhase = 'gap'; _tkGapEnd = 1e15; _tkMeasure = false; _tkX = 30 - it.offsetLeft; b.firstChild.style.transform = 'translate3d(' + _tkX + 'px,0,0)'; }, sel);
const centre = (p, sel) => p.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
const press = async (d, pt) => { if (d.vp.touch) await d.page.touchscreen.tap(pt.x, pt.y); else await d.page.mouse.click(pt.x, pt.y); };
const rows = (p) => p.evaluate(() => [...document.querySelectorAll('#jeb-menu .jm')].map((e) => e.textContent));
async function bandMenu(d, iid) {
  await d.page.waitForFunction((iid) => !!document.querySelector(`#zab-tk .tk-it[data-iid="${iid}"]`), iid, { timeout: 8000 });
  await park(d.page, `#zab-tk .tk-it[data-iid="${iid}"]`); await sleep(150);
  await press(d, await centre(d.page, `#zab-tk .tk-it[data-iid="${iid}"]`)); await sleep(500);
  return rows(d.page);
}

if (want('98a')) {
  for (const cfg of [...VPS.map((v) => ({ vp: v, path: '/', tag: v.name })), { vp: VPS[2], path: '/?jeb=1', tag: 'Zab mode' }]) {
    const d = await openDev(cfg.vp, { path: cfg.path }), p = d.page;
    await T(`98a@${cfg.tag} a tap on a link item in the band opens its menu with "🔗 Open link" first; tapping it opens the address in a new page and closes the menu`, async () => {
      const r = await bandMenu(d, 'l1');
      if (r[0] !== '🔗 Open link') return [false, 'menu: ' + JSON.stringify(r)];
      const [pop] = await Promise.all([p.waitForEvent('popup', { timeout: 5000 }), press(d, await centre(p, '#jeb-menu .jm[data-i="0"]'))]);
      const url = pop.url(); await pop.close().catch(() => {}); await sleep(300);
      const open = await p.evaluate(() => !!document.getElementById('jeb-menu'));
      return [url === 'https://link-target.test/share/v/1E9CiUqF8h/' && !open, `${url} menu still open: ${open}`];
    });
    await d.ctx.close().catch(() => {});
  }
}
if (want('98b') || want('98c')) {
  const d = await openDev(VPS[2]), p = d.page;
  const before = await p.evaluate(() => JSON.stringify(DB.jeb));
  if (want('98b')) {
    await T('98b an address in the middle of the text is found (without the trailing full stop) and opened', async () => {
      const r = await bandMenu(d, 'l2');
      if (r[0] !== '🔗 Open link') return [false, 'menu: ' + JSON.stringify(r)];
      const [pop] = await Promise.all([p.waitForEvent('popup', { timeout: 5000 }), press(d, await centre(p, '#jeb-menu .jm[data-i="0"]'))]);
      const url = pop.url(); await pop.close().catch(() => {});
      return [url === 'https://link-target.test/mid?a=1', url];
    });
    await T('98b an item with no address has no "Open link" row (its menu starts with ☑ Done, as before)', async () => {
      const r = await bandMenu(d, 'n1'); await p.keyboard.press('Escape'); await p.evaluate(() => _jebHideMenu());
      return [r.length > 3 && r[0] === '☑ Done' && !r.some((t) => /Open link/.test(t)), JSON.stringify(r)];
    });
    await T('98b a Links Zab item opens its stored address', async () => {
      const r = await bandMenu(d, 'k1');
      if (r[0] !== '🔗 Open link') return [false, 'menu: ' + JSON.stringify(r)];
      const [pop] = await Promise.all([p.waitForEvent('popup', { timeout: 5000 }), press(d, await centre(p, '#jeb-menu .jm[data-i="0"]'))]);
      const url = pop.url(); await pop.close().catch(() => {});
      return [url === 'https://link-target.test/stored', url];
    });
  }
  if (want('98c')) {
    await T('98c opening links changed nothing in DB.jeb (no edit, no updatedAt)', async () => {
      const after = await p.evaluate(() => JSON.stringify(DB.jeb));
      return [after === before, after === before ? 'unchanged' : 'changed'];
    });
    await T('98c no page errors across the whole run', async () => [allErr.length === 0, allErr.slice(0, 3).join(' · ')]);
  }
  await d.ctx.close().catch(() => {});
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
await browser.close(); await srv.close?.();
process.exit(failed ? 1 : 0);
