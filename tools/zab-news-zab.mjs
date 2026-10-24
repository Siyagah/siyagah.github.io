#!/usr/bin/env node
/* tools/zab-news-zab.mjs — v05.46, Z16: a 📰 News Zab of the owner's own (PCF J70). Checks 104a–104e. Nothing touches the real network: the news service is
   a FAKE answered by a Playwright route (window.__zabNewsSrv), as tools/zab-news-srv.mjs does. Headlines carry the marker ZZSRV.

   For each of 1440, 820, 390 (Rail) and Zab mode (/?jeb=1) at 1440, with 8 Zabs, one named "News" (plain) and the other Zabs holding items:
   104a  fill      switching "News" to 📰 News through the Zab's menu fills it with the five channels as items (text, src, color); DB.theme.zabNews.chans is
                   byte-identical before and after (the backup)
   104b  tick      unticking two channels by a real tap writes off:true on exactly those items; ▶ Scroll these starts the band and it holds headlines ONLY
                   from the three ticked channels
   104c  zabs      ticking two other Zabs writes zabTicker.pids = those two; after ▶ the band holds those Zabs' items AND the ticked channels' headlines,
                   nothing from the unticked Zabs, and no channel item as an item
   104d  add       ＋ Add channel adds an item with a normalised src; it reaches a second device (mergeDB both ways) as an item; deleting a channel goes to Trash
   104e  shape     no sideways scroll in the panel; every tick ≥ 44 px tall on 390/820; no headline in DB; no page errors

   `--unpatched` serves the build before this round (the checks must fail there: no 📰 News kind). */
import { playwright, serve, seedDB } from './harness.mjs';
import { sleep } from './s1-fake.mjs';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const results = [];
function check(ok, label, detail = '') { results.push({ ok, label }); console.log((ok ? '  ok   ' : ' FAIL  ') + label + (detail ? '\n         ' + String(detail).slice(0, 500) : '')); }
async function T(label, fn) { try { const r = await fn(); check(!!r[0], label, r[1] || ''); } catch (e) { check(false, label, 'threw: ' + String(e.message || e).split('\n')[0]); } }

function makeBase() {   /* the app as it was just before this round; throws when the commit is not found (a shallow clone would compare the build with itself) */
  const dir = mkdtempSync(join(tmpdir(), 'z16-base-'));
  const sha = execFileSync('git', ['log', '--format=%H', '-n', '1', '--grep=v05.46 Z16: version bump'], { encoding: 'utf8' }).trim();
  if (!sha) throw new Error('makeBase: the commit "v05.46 Z16: version bump" is not in this clone (shallow?) — refusing to compare the build with itself');
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', `${sha}~1:${f}`], { encoding: 'buffer', maxBuffer: 1 << 28 })); } catch {} }
  return dir;
}
const pw = await playwright();
const srv = await serve(argv.includes('--unpatched') ? makeBase() : undefined);
const browser = await pw.chromium.launch();

const VPS = [{ name: '1440', w: 1440, h: 900, touch: false }, { name: '820', w: 820, h: 1180, touch: true }, { name: '390', w: 390, h: 844, touch: true },
  { name: 'jeb', w: 1440, h: 900, touch: false, path: '/?jeb=1' }];
const DEF = [['aljazeera', 'Al Jazeera', 'https://www.aljazeera.com/xml/rss/all.xml', '#E8A200'], ['mee', 'Middle East Eye', 'https://www.middleeasteye.net/rss', '#2E8B57'],
  ['trt', 'TRT World', 'https://www.trtworld.com/feed/rss.xml', '#D62839'], ['arabnews', 'Arab News', 'https://www.arabnews.com/rss.xml', '#1E6FD9'],
  ['5pillars', '5Pillars', 'https://5pillarsuk.com/feed', '#8E44AD']];
const items = (id, n) => Array.from({ length: n }, (_, k) => ({ t: `ZZSRV ${id} headline ${k}`, s: `short ${k}`, u: `https://news-story.test/${id}/${k}`, d: new Date(Date.now() - k * 60000).toISOString() }));
const srvBody = () => JSON.stringify({ at: new Date().toISOString(), chans: DEF.map(([id, , q]) => ({ id, q, ok: true, name: id, src: q, items: items(id, 20) })) });
const H = { 'access-control-allow-origin': '*' };
const T0 = '2026-10-01T00:00:00.000Z';
const ZABS = ['News', 'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta'];
function seed() {
  const db = seedDB(T0);
  db.jebPockets = ZABS.map((name, i) => ({ id: 'zp' + i, name, icon: '✶', color: '#CFE8FF', order: i, createdAt: T0, updatedAt: T0 }));
  const mk = (id, pid, text, o) => ({ id, pocketId: pid, text, done: false, folderIds: [], tags: [], kind: null, journal: false, order: o, createdAt: T0, updatedAt: T0 });
  db.jeb = [mk('i1a', 'zp1', 'Alpha one', 0), mk('i1b', 'zp1', 'Alpha two', 1), mk('i2a', 'zp2', 'Beta one', 0), mk('i2b', 'zp2', 'Beta two', 1), mk('i3a', 'zp3', 'Gamma one', 0), mk('i4a', 'zp4', 'Delta one', 0)];
  db.theme = { preset: 'forest', custom: {}, zabNews: { on: false, chans: DEF.map(([id, name, src, color]) => ({ id, name, src, color, on: true })) } };
  return db;
}
const allErr = [];
async function openDev(vp) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, ...(vp.touch ? { hasTouch: true, isMobile: true } : {}) });
  for (const p of ['**googleapis.com/**', '**gstatic.com/**', '**firebaseapp.com/**', '**firebaseio.com/**', '**raw.githubusercontent.com/**']) await ctx.route(p, (r) => r.abort());
  await ctx.addInitScript(() => { window.__zabNewsSrv = 'https://news-srv.test/news.json'; });
  await ctx.route('https://news-srv.test/**', (r) => r.fulfill({ status: 200, headers: H, contentType: 'application/json', body: srvBody() }));
  await ctx.route('https://news-story.test/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>story</title>' }));
  await ctx.addInitScript((d) => { try { if (!localStorage.getItem('my-notebook-v1')) localStorage.setItem('my-notebook-v1', JSON.stringify(d)); } catch {} }, seed());
  const page = await ctx.newPage();
  page.on('pageerror', (e) => allErr.push('pageerror: ' + e));
  await page.goto(srv.base + (vp.path || '/'), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree'));
  await sleep(2500);
  return { ctx, page, vp };
}
const centre = (p, sel) => p.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return null; e.scrollIntoView({ block: 'nearest', inline: 'nearest' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
const press = async (d, sel) => { const pt = await centre(d.page, sel); if (!pt) throw new Error('no ' + sel); await sleep(60); if (d.vp.touch) await d.page.touchscreen.tap(pt.x, pt.y); else await d.page.mouse.click(pt.x, pt.y); };
const pressRow = async (d, needle) => {
  const pt = await d.page.evaluate((n) => { const e = [...document.querySelectorAll('#jeb-menu .jm')].find((x) => x.textContent.includes(n)); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, needle);
  if (!pt) throw new Error('no menu row ' + needle);
  if (d.vp.touch) await d.page.touchscreen.tap(pt.x, pt.y); else await d.page.mouse.click(pt.x, pt.y);
};
/* open a Zab's panel the way a person does: the bar chip (laptop, tablet, Zab mode) or the round button then the Rail (phone) */
async function openZab(d, pid) {
  if (d.vp.name === '390') {
    await press(d, '#zab-btn'); await sleep(500);
    await press(d, `#zab-lay .zr-b[data-pid="${pid}"]`);
  } else await press(d, `#jeb-bar .jeb-chip[data-pid="${pid}"] .jeb-main`);
  await d.page.waitForSelector('#jeb-panel.on', { timeout: 4000 }); await sleep(500);
}
const bandInfo = (p) => p.evaluate(() => [...document.querySelectorAll('#zab-tk .tk-it')].map((e) => ({ nw: e.classList.contains('tk-nw'), t: e.textContent })));
const waitBand = (p, fn) => p.waitForFunction(fn, null, { timeout: 20000 }).then(() => true, () => false);

const out = {};
for (const vp of VPS) {
  const d = await openDev(vp), p = d.page, nm = vp.name, tag = `104 ${nm}:`;
  out[nm] = d;
  const before = await p.evaluate(() => JSON.stringify(DB.theme.zabNews));
  await T(`${tag} 104a "News" switched to 📰 News through its menu: the five channels become items (text, src, color); the settings array is byte-identical`, async () => {
    await openZab(d, 'zp0');
    if (!vp.touch) { await p.click('#jeb-bar .jeb-chip[data-pid="zp0"]', { button: 'right' }); await sleep(300); } else { await press(d, '#jeb-panel .jeb-pm'); await sleep(300); }
    await pressRow(d, 'Zab kind'); await sleep(300); await pressRow(d, '📰 News'); await sleep(900);
    const r = await p.evaluate(() => ({ ty: _jebType(_jebPocket('zp0')), its: jebItems('zp0').map((i) => [i.text, i.src, i.color, !!i.off]), after: JSON.stringify(DB.theme.zabNews), rows: document.querySelectorAll('#jeb-panel .jn-it').length, btn: !!document.querySelector('#jeb-panel .jn-go') }));
    const ok = r.ty === 'news' && r.its.length === 5 && DEF.every(([, name, src, color], k) => r.its[k][0] === name && r.its[k][1] === src && r.its[k][2] === color && !r.its[k][3]) && r.after === before && r.rows === 5 && r.btn;
    return [ok, JSON.stringify({ ty: r.ty, n: r.its.length, same: r.after === before, rows: r.rows })];
  });
  await T(`${tag} 104b two channels unticked by a tap write off:true on exactly those; ▶ Scroll these starts the band with headlines of the three ticked only`, async () => {
    for (const id of await p.evaluate(() => jebItems('zp0').slice(0, 2).map((i) => i.id))) await press(d, `#jeb-panel .jn-it[data-iid="${id}"] .jn-tick`);
    await sleep(500);
    const off = await p.evaluate(() => jebItems('zp0').map((i) => !!i.off));
    await press(d, '#jeb-panel .jn-go');
    const ok = await waitBand(p, () => document.querySelectorAll('#zab-tk a.tk-nw').length > 0);
    const band = await bandInfo(p), ch = new Set(band.filter((b) => b.nw).map((b) => b.t.split(' ')[1]));
    const st = await p.evaluate(() => document.querySelector('#jeb-panel .jn-status').textContent);
    const want = ['trt', 'arabnews', '5pillars'];
    return [ok && off.join() === 'true,true,false,false,false' && [...ch].every((c) => want.includes(c)) && ch.size === 3 && band.every((b) => b.nw) && /^Scrolling now: TRT World, Arab News, 5Pillars/.test(st) && /\(3\)/.test(await p.evaluate(() => document.querySelector('#jeb-panel .jn-go').textContent)),
      JSON.stringify({ off: off.join(), ch: [...ch], n: band.length, st })];
  });
  await T(`${tag} 104c two other Zabs ticked: pids are those two; the band holds their items AND the ticked channels' headlines; nothing from the others; no channel item`, async () => {
    if (await p.evaluate(() => !!document.querySelector('#jeb-panel .jn-fold'))) { await press(d, '#jeb-panel .jn-fold'); await sleep(400); }
    await press(d, '#jeb-panel .jn-zt[data-pid="zp1"]'); await sleep(300); await press(d, '#jeb-panel .jn-zt[data-pid="zp2"]'); await sleep(400);
    const pids = await p.evaluate(() => (DB.theme.zabTicker || {}).pids);
    await press(d, '#jeb-panel .jn-go');
    const ok = await waitBand(p, () => [...document.querySelectorAll('#zab-tk .tk-it')].some((e) => /Alpha one/.test(e.textContent)));
    const band = await bandInfo(p), own = band.filter((b) => !b.nw).map((b) => b.t), nws = new Set(band.filter((b) => b.nw).map((b) => b.t.split(' ')[1]));
    const th = await p.evaluate(() => ({ m: DB.theme.zabTicker.mode, mix: DB.theme.zabNews.mix, on: DB.theme.zabNews.on }));
    const names = DEF.map((x) => x[1]);
    return [ok && JSON.stringify(pids) === '["zp1","zp2"]' && own.length > 0 && own.every((t) => /^(Alpha|Beta) /.test(t)) && !own.some((t) => names.includes(t)) && nws.size > 0 && [...nws].every((c) => ['trt', 'arabnews', '5pillars'].includes(c)) && th.m === 'only' && th.mix === 'mix' && th.on,
      JSON.stringify({ pids, own, nws: [...nws], th })];
  });
  await T(`${tag} 104d ＋ Add channel adds an item with a normalised src; it reaches a second device both ways; deleting a channel goes to Trash`, async () => {
    const stale = await p.evaluate(() => JSON.stringify(DB));
    await p.fill('#jn-add-in', '@somenews'); await press(d, '#jeb-panel .jn-addb'); await sleep(700);
    const r = await p.evaluate((st) => {
      const it = jebItems('zp0').find((i) => i.src === 'https://t.me/somenews'); if (!it) return { none: true };
      const A = JSON.parse(JSON.stringify(DB)), B = JSON.parse(st);
      const ab = mergeDB(JSON.parse(JSON.stringify(B)), JSON.parse(JSON.stringify(A))), ba = mergeDB(JSON.parse(JSON.stringify(A)), JSON.parse(JSON.stringify(B)));
      const has = (x) => (x.jeb || []).some((i) => i.id === it.id && i.src === 'https://t.me/somenews' && i.pocketId === 'zp0');
      return { id: it.id, text: it.text, color: it.color, ab: has(ab), ba: has(ba) };
    }, stale);
    await press(d, `#jeb-panel .jn-it[data-iid="${r.id}"] .jeb-more`); await sleep(300); await pressRow(d, 'Delete'); await sleep(600);
    const t = await p.evaluate((id) => ({ gone: !DB.jeb.some((i) => i.id === id), trash: DB.trash.some((x) => x.type === 'jebItem' && x.item && x.item.id === id) }), r.id);
    return [!r.none && r.text === '@somenews' && /^#[0-9a-f]{6}$/i.test(r.color) && r.ab && r.ba && t.gone && t.trash, JSON.stringify({ r, t })];
  });
  await T(`${tag} 104e no sideways scroll in the panel; every tick ≥ 44 px tall on 390/820; no headline in DB`, async () => {
    const r = await p.evaluate(() => { const pn = document.getElementById('jeb-panel'), ticks = [...pn.querySelectorAll('.jn-tick')];
      return { side: pn.scrollWidth > pn.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth + 1, hs: ticks.map((e) => Math.round(e.getBoundingClientRect().height)), n: ticks.length, hl: JSON.stringify(DB).includes('ZZSRV') }; });
    const tall = !vp.touch || r.hs.every((h) => h >= 44);
    return [!r.side && r.n > 0 && tall && !r.hl, JSON.stringify(r)];
  });
}
/* the settings: while a News Zab exists the channel list is one line with an Open button */
{
  const d = out['1440'];
  await T('104e settings: with a News Zab the channel list is replaced by "Your channels are in the 📰 News Zab" + Open; per / every / mix stay', async () => {
    const r = await d.page.evaluate(() => { openTheme(); const s = document.getElementById('th-nw'); return { line: /Your channels are in the 📰 News Zab/.test(s.innerText), open: !!s.querySelector('#th-nw-open'), list: !!s.querySelector('#th-nw-chans'), per: !!s.querySelector('#th-nw-per'), mix: !!s.querySelector('#th-nw-mix') }; });
    return [r.line && r.open && !r.list && r.per && r.mix, JSON.stringify(r)];
  });
}
await T('104e no page errors across the whole run', async () => [allErr.length === 0, allErr.slice(0, 3).join(' · ')]);

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
await browser.close(); await srv.close?.();
process.exit(failed ? 1 : 0);
