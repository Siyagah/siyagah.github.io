#!/usr/bin/env node
/* tools/zab-news.mjs — v05.35, Z13a: News, round 1 — the helper, the settings and fetching (PCF J50). Checks 95a–95f. The helper is FAKE: a Playwright route
   answers https://news-helper.test/exec (never the real network). Headlines carry the marker ZZNEWS so a leak into DB / the cloud / Save File is findable.

   95a  settings  the 📰 News section is reached by real taps (🧰 → 🎨 Appearance) at 390 / 820 / 1440; defaults; every choice persists through _zabNews() and a
                  reload; garbage falls back to the default; two devices (s1-fake) merge different keys; nothing scrolls sideways
   95b  preview   each channel's newest headlines in its colour, `per` and `short` respected, a tap opens the story in a new page; #zab-tk unchanged by news
   95c  fetch     refresh at `every` (window.__zabNewsNow), a failing channel leaves the others, a failing / slow / wrong helper never toasts or blocks and the status
                  says why, offline shows the cache, a reload shows the headlines from siyagah-news-v1
   95d  apart     DB.jeb / DB.trash / DB.articles / DB.jebPockets and localStorage byte-identical; no headline in DB, the cloud or Save File's copy
   95e  helper    the generated Code.gs run in Node vm against mocks: RSS, Atom, a site page with an alternate link, a Telegram t.me/s page, one failing channel,
                  the browser User-Agent, n respected, the cache used
   95f  phone     every new control >= 44 x 44 at 390; no page errors

   `--only=95a,95e` runs just those; `--unpatched` serves the build before this round (95a–95e must FAIL). */
import { playwright, serve, seedDB } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, waitSeeded, push } from './s1-fake.mjs';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);
const results = [];
function check(ok, label, detail = '') { results.push({ ok, label }); console.log((ok ? '  ok   ' : ' FAIL  ') + label + (detail ? '\n         ' + String(detail).slice(0, 400) : '')); }
async function T(label, fn) { try { const r = await fn(); check(!!r[0], label, r[1] || ''); } catch (e) { check(false, label, 'threw: ' + String(e.message || e).split('\n')[0]); } }

const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];
function makeBase() {   /* the app as it was just before this round; throws when the commit is not found (a shallow clone would compare the build with itself) */
  const dir = mkdtempSync(join(tmpdir(), 'z13a-base-'));
  const sha = execFileSync('git', ['log', '--format=%H', '-n', '1', '--grep=v05.35 Z13a: version bump'], { encoding: 'utf8' }).trim();
  if (!sha) throw new Error('makeBase: the commit "v05.35 Z13a: version bump" is not in this clone (shallow?) — refusing to compare the build with itself');
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', `${sha}~1:${f}`], { encoding: 'buffer', maxBuffer: 1 << 28 })); } catch {} }
  return dir;
}
const pw = await playwright();
const srv = await serve(argv.includes('--unpatched') ? makeBase() : undefined);
const browser = await pw.chromium.launch();

const HELPER = 'https://news-helper.test/exec';
const CH = { aljazeera: 'Al Jazeera', mee: 'Middle East Eye', trt: 'TRT World', arabnews: 'Arab News', '5pillars': '5Pillars' };
const fake = { mode: 'ok', delay: 0, failChan: '', calls: [], lastUrl: '' };
function fakeBody(u) {
  const c = JSON.parse(u.searchParams.get('c') || '[]'), n = +u.searchParams.get('n') || 10;
  return JSON.stringify({ at: new Date().toISOString(), chans: c.map((x) => fake.failChan === x.id ? { id: x.id, ok: false, items: [], err: 'the site answered 403' }
    : { id: x.id, ok: true, name: x.id, items: Array.from({ length: Math.min(n, 25) }, (_, k) => ({ t: `ZZNEWS ${x.id} headline ${k}`, s: `short line ${k} of ${x.id}`, u: `https://news-story.test/${x.id}/${k}`, d: new Date(Date.now() - k * 60000).toISOString() })) }) });
}
async function wireHelper(ctx) {
  await ctx.route('https://news-helper.test/**', async (route) => {
    const u = new URL(route.request().url()); fake.calls.push(u.search); fake.lastUrl = route.request().url();
    if (fake.delay) await new Promise((r) => setTimeout(r, fake.delay));
    const h = { 'access-control-allow-origin': '*' };
    if (fake.mode === 'abort') return route.abort();
    if (fake.mode === '500') return route.fulfill({ status: 500, headers: h, contentType: 'text/plain', body: 'boom' });
    if (fake.mode === 'html') return route.fulfill({ status: 200, headers: h, contentType: 'text/html', body: '<html>Sign in</html>' });
    return route.fulfill({ status: 200, headers: h, contentType: 'application/json', body: fakeBody(u) });
  });
  await ctx.route('https://news-story.test/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>story</title>' }));
}
const T0 = '2026-10-01T00:00:00.000Z';
function seed(extra = {}) {
  const db = seedDB(T0);
  const pk = (id, i, e = {}) => ({ id, name: id, icon: '✶', color: '#CFE8FF', order: i, createdAt: T0, updatedAt: T0, ...e });
  const mk = (id, pocketId, text, order) => ({ id, pocketId, text, done: false, folderIds: [], tags: [], kind: null, journal: false, order, createdAt: T0, updatedAt: T0 });
  db.jebPockets = [pk('jp-task', 0, { name: 'Tasks', icon: '✅' }), pk('jp-idea', 1, { name: 'Ideas', icon: '💡', color: '#FFE3A8' })];
  db.jeb = [mk('t1', 'jp-task', 'Call the bank', 0), mk('i1', 'jp-idea', 'An idea about things', 0)];
  db.theme = { preset: 'forest', custom: {}, ...extra };
  return db;
}
async function openDev(vp, o = {}) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, ...(vp.touch ? { hasTouch: true, isMobile: true } : {}) });
  for (const p of ['**googleapis.com/**', '**gstatic.com/**', '**firebaseapp.com/**', '**firebaseio.com/**']) await ctx.route(p, (r) => r.abort());
  await wireHelper(ctx);
  await ctx.addInitScript((d) => { try { if (!localStorage.getItem('my-notebook-v1')) localStorage.setItem('my-notebook-v1', JSON.stringify(d)); } catch {} }, o.db || seed());
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e));
  page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR_FAILED|news-helper|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(srv.base + (o.path || '/'), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree'));
  await sleep(o.settle || 900);
  return { ctx, page, errors, vp };
}
const tap = async (d, sel) => { const l = d.page.locator(sel).first(); await l.scrollIntoViewIfNeeded(); const r = await l.boundingBox(); if (d.vp.touch) await d.page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); else await d.page.mouse.click(r.x + r.width / 2, r.y + r.height / 2); await sleep(350); };
async function openAppearance(d) {   /* real taps: 🧰, then 🎨 Appearance */
  await tap(d, '#sb-tools-btn');
  const l = d.page.locator('.sb-mi', { hasText: '🎨 Appearance' }).first(); await l.waitFor({ state: 'visible', timeout: 4000 });
  const r = await l.boundingBox(); if (d.vp.touch) await d.page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); else await d.page.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
  await sleep(600);
  return d.page.evaluate(() => !!document.getElementById('th-nw'));
}
const DEFAULTS = { on: false, url: '', per: 20, every: 15, mix: 'mix', short: true };
const devs = {};
for (const vp of VPS) devs[vp.name] = await openDev(vp);
const allErrors = () => Object.values(devs).flatMap((d) => d.errors);
const nw = (p) => p.evaluate(() => JSON.stringify(_zabNews()));

/* ── 95a ── */
if (want('95a')) {
  for (const vp of VPS) {
    const d = devs[vp.name], p = d.page, tag = `95a@${vp.name}`;
    await T(`${tag} 🧰 → 🎨 Appearance (real taps) reaches the 📰 News section, after the scrolling-titles settings`, async () => {
      const ok = await openAppearance(d);
      const order = await p.evaluate(() => { const a = document.getElementById('th-tk'), b = document.getElementById('th-nw'); return !!a && !!b && !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING); });
      return [ok && order, `reached ${ok}, after titles ${order}`];
    });
    await T(`${tag} defaults: off, no address, the five channels (all on, five different colours), 20 headlines, every 15 minutes, mixed, short line on`, async () => {
      const c = JSON.parse(await nw(p));
      const names = c.chans.map((x) => x.name).join('|'), cols = new Set(c.chans.map((x) => x.color.toLowerCase()));
      return [c.on === false && c.url === '' && c.per === 20 && c.every === 15 && c.mix === 'mix' && c.short === true && names === 'Al Jazeera|Middle East Eye|TRT World|Arab News|5Pillars' && c.chans.every((x) => x.on) && cols.size === 5, JSON.stringify(c).slice(0, 300)];
    });
    await T(`${tag} the section lists the channels, the helper address, Copy the helper, Add channel, the pickers and a status line; the page does not scroll sideways`, async () => {
      const r = await p.evaluate(() => { const s = document.getElementById('th-nw'); const m = s.closest('[id*=theme],.theme-modal,.modal-box,div') ; let e = s, sc = null; while (e) { if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible' && e !== document.documentElement) { sc = e.id || e.className; break; } e = e.parentElement; }
        return { rows: s.querySelectorAll('.nw-ch').length, url: !!s.querySelector('#th-nw-url'), copy: !!s.querySelector('#th-nw-copy'), add: !!s.querySelector('#th-nw-addb'), sel: ['th-nw-per', 'th-nw-every', 'th-nw-mix'].every((i) => !!s.querySelector('#' + i)), st: !!s.querySelector('#nw-status'), hint: !/next update/.test(s.innerText) /* v05.36: the "Used by the band from the next update" line is gone */, side: sc, page: document.documentElement.scrollWidth > innerWidth + 1 }; });
      return [r.rows === 5 && r.url && r.copy && r.add && r.sel && r.st && r.hint && !r.side && !r.page, JSON.stringify(r)];
    });
    await p.evaluate(() => { const b = document.querySelector('.theme-hd-x,.theme-close,[onclick*="closeTheme"]'); b && b.click(); }).catch(() => {});
    await p.keyboard.press('Escape').catch(() => {}); await sleep(200);
  }
  {
    const d = devs['1440'], p = d.page;
    await T('95a every choice persists through _zabNews() and a reload (address, on/off, per, every, mix, short, a channel off, a colour, ＋ Add, ✕ Remove)', async () => {
      await p.evaluate(() => openTheme()); await sleep(500);
      await p.evaluate(() => { const u = document.getElementById('th-nw-url'); u.value = 'https://news-helper.test/exec'; u.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(300);
      const afterUrl = await p.evaluate(() => ({ on: _zabNews().on, url: _zabNews().url }));
      const pickSel = (id, v) => p.evaluate(([id, v]) => { const s = document.getElementById(id); s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); }, [id, v]);
      await pickSel('th-nw-per', '5'); await pickSel('th-nw-every', '30'); await pickSel('th-nw-mix', 'news');
      await p.evaluate(() => document.getElementById('th-nw-short').click()); await sleep(200);
      await p.evaluate(() => document.querySelector('.nw-ch[data-cid="trt"] .nw-con').click()); await sleep(200);
      await p.evaluate(() => { const c = document.querySelector('.nw-ch[data-cid="mee"] .nw-col'); c.value = '#123456'; c.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(200);
      await p.evaluate(() => { const a = document.getElementById('th-nw-add'); a.value = '@my_channel'; document.getElementById('th-nw-addb').click(); }); await sleep(300);
      await p.evaluate(() => { const a = document.getElementById('th-nw-add'); a.value = 'example.com/blog'; document.getElementById('th-nw-addb').click(); }); await sleep(300);
      await p.evaluate(() => { const a = document.getElementById('th-nw-add'); a.value = 'not an address'; document.getElementById('th-nw-addb').click(); }); await sleep(200);
      await p.evaluate(() => document.querySelector('.nw-ch[data-cid="5pillars"] .nw-rm').click()); await sleep(300);
      await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => window.__appBooted === true); await sleep(1200);
      const c = JSON.parse(await nw(p));
      const ok = afterUrl.on && afterUrl.url === HELPER && c.on && c.url === HELPER && c.per === 5 && c.every === 30 && c.mix === 'news' && c.short === false
        && c.chans.length === 6 && !c.chans.find((x) => x.id === '5pillars') && c.chans.find((x) => x.id === 'trt').on === false && c.chans.find((x) => x.id === 'mee').color.toLowerCase() === '#123456'
        && c.chans.some((x) => x.src === 'https://t.me/my_channel' && x.name === '@my_channel') && c.chans.some((x) => x.src === 'https://example.com/blog');
      return [ok, JSON.stringify({ afterUrl, per: c.per, every: c.every, mix: c.mix, short: c.short, n: c.chans.length })];
    });
    await T('95a garbage in DB.theme.zabNews falls back to the defaults (and a bad channel entry is dropped)', async () => {
      const r = await p.evaluate(() => { const keep = DB.theme.zabNews;
        DB.theme.zabNews = { on: 'yes', url: 'ftp://x', chans: 'nope', per: 7, every: 5, mix: 'zzz', short: 'no' }; const a = _zabNews();
        DB.theme.zabNews = { on: true, url: 'https://ok.example/exec', chans: [null, 5, { id: 'x' }, { id: 'ok', src: 'https://a.example/f', color: 'red', on: 'maybe' }, { id: 'ok', src: 'https://b.example/f' }] }; const b = _zabNews();
        DB.theme.zabNews = 5; const c = _zabNews(); DB.theme.zabNews = keep; return { a, b, c }; });
      const A = r.a, ok = A.on === false && A.url === '' && A.per === 20 && A.every === 15 && A.mix === 'mix' && A.short === true && A.chans.length === 5
        && r.b.chans.length === 1 && /^#[0-9a-f]{6}$/i.test(r.b.chans[0].color) && r.b.on === true && r.c.per === 20 && r.c.chans.length === 5;
      return [ok, JSON.stringify(r).slice(0, 300)];
    });
  }
  {
    const cloud = makeCloud(), vp = VPS[2];
    const A = await addDevice(browser, srv.base, cloud, 'A', { width: vp.w, height: vp.h }, false, seed());
    const B = await addDevice(browser, srv.base, cloud, 'B', { width: vp.w, height: vp.h }, false, seed());
    await T('95a two devices: per + the channel list on A and the address + mix on B all survive the merge (a channel list is one whole key)', async () => {
      await waitSeeded(cloud, A); await waitSeeded(cloud, B);
      await on(A, () => { zabNewsSet('per', 5, true); zabNewsSet('chans', _zabNews().chans.filter((x) => x.id !== 'mee'), true); });
      await on(B, () => { zabNewsSet('url', 'https://news-helper.test/exec', true); zabNewsSet('mix', 'items', true); });
      await push(cloud, A); await push(cloud, B);
      const good = async () => { const f = (d) => on(d, () => { const c = _zabNews(); return c.per === 5 && c.mix === 'items' && c.url === 'https://news-helper.test/exec' && c.chans.length === 4 && !c.chans.some((x) => x.id === 'mee'); }); return (await f(A)) && (await f(B)); };
      const t0 = Date.now(); let ok = false; while (Date.now() - t0 < 30000) { if (await good()) { ok = true; break; } await sleep(400); }
      return [ok, JSON.stringify({ a: await on(A, () => _zabNews().per + '/' + _zabNews().mix + '/' + _zabNews().chans.length), b: await on(B, () => _zabNews().per + '/' + _zabNews().mix + '/' + _zabNews().chans.length) })];
    });
    await A.ctx.close(); await B.ctx.close();
  }
}

/* ── 95b ── */
const bandHtml = (p) => p.evaluate(() => [...document.querySelectorAll('#zab-tk .tk-it')].map((e) => e.outerHTML).join('\n'));
if (want('95b')) {
  const d = await openDev(VPS[2]), p = d.page;
  const band0 = await bandHtml(p);
  fake.mode = 'ok'; fake.failChan = ''; fake.delay = 0;
  await T('95b with the fake helper the preview lists each channel in its colour: 5 a channel (per 20), the newest first, name + headline + short line', async () => {
    await p.evaluate((u) => { zabNewsUrl(u); }, HELPER); await sleep(300);
    await p.evaluate(() => { _newsTick(); }); await p.waitForFunction(() => document.querySelector('#nw-prev .nw-it') || (window._newsCache), null, { timeout: 8000 }).catch(() => {}); await sleep(600);
    await p.evaluate(() => openTheme()); await sleep(500);
    const r = await p.evaluate(() => { const c = _zabNews(); return c.chans.map((x) => { const its = [...document.querySelectorAll('#nw-prev .nw-it')].filter((a) => a.querySelector('.nw-cn').textContent === x.name);
      return { id: x.id, n: its.length, first: its[0] && its[0].querySelector('.nw-t').textContent, dot: its[0] && getComputedStyle(its[0].querySelector('.nw-dot')).backgroundColor, want: x.color, short: its[0] && !!its[0].querySelector('.nw-s') }; }); });
    const hex = (h) => { const n = parseInt(h.slice(1), 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`; };
    return [r.length === 5 && r.every((x) => x.n === 5 && x.first === `ZZNEWS ${x.id} headline 0` && x.dot === hex(x.want) && x.short), JSON.stringify(r).slice(0, 300)];
  });
  await T('95b the helper was asked with a plain GET: only channel ids + addresses and n (no notes, no headers)', async () => {
    const q = new URL(fake.lastUrl).searchParams, c = JSON.parse(q.get('c'));
    return [fake.calls.length >= 1 && q.get('n') === '20' && c.length === 5 && c.every((x) => Object.keys(x).sort().join() === 'id,src') && !/Call the bank|Seeded note/.test(fake.lastUrl), fake.lastUrl.slice(0, 200)];
  });
  await T('95b "short line" off hides it; headlines per channel 3 shows 3 (after the next fetch)', async () => {
    await p.evaluate(() => zabNewsSet('short', false)); await sleep(300);
    const a = await p.evaluate(() => document.querySelectorAll('#nw-prev .nw-s').length);
    await p.evaluate(() => zabNewsSet('short', true)); await p.evaluate(() => zabNewsSet('per', 3)); await sleep(300);
    await p.evaluate(() => _newsTick()); await sleep(1200);
    const b = await p.evaluate(() => { const c = _zabNews(); return { n: document.querySelectorAll('#nw-prev .nw-it').length, per: c.per, s: document.querySelectorAll('#nw-prev .nw-s').length }; });
    return [a === 0 && b.per === 3 && b.n === 15 && b.s === 15, JSON.stringify({ a, b })];
  });
  await T('95b a tap on a headline opens the story in a new page (noopener)', async () => {
    const link = p.locator('#nw-prev .nw-it').first(); await link.scrollIntoViewIfNeeded();
    const rel = await link.getAttribute('rel'), tg = await link.getAttribute('target');
    const [pop] = await Promise.all([p.waitForEvent('popup', { timeout: 5000 }), link.click()]);
    const url = pop.url(); await pop.close().catch(() => {});
    return [/^https:\/\/news-story\.test\/aljazeera\/0$/.test(url) && /noopener/.test(rel) && tg === '_blank', url + ' ' + rel + ' ' + tg];
  });
  await T('95b the scrolling band is byte-identical with news on and off when the band shows "My items only" (v05.36: Mixed now adds headlines — block 96)', async () => {
    await p.evaluate(() => zabNewsSet('mix', 'items', true)); await sleep(1400);   /* the band follows a changed setting on its 1 s tick */
    const on1 = await bandHtml(p); await p.evaluate(() => zabNewsSet('on', false, true)); await sleep(1400); const off = await bandHtml(p); await p.evaluate(() => { zabNewsSet('on', true, true); zabNewsSet('mix', 'mix', true); });
    return [band0.length > 50 && band0 === on1 && on1 === off && !/ZZNEWS/.test(on1), `${band0.length} ${on1.length} ${off.length}`];
  });
  d.ctx.close().catch(() => {});
}

/* ── 95c ── */
if (want('95c')) {
  const d = await openDev(VPS[2], { db: seed({ zabNews: { on: true, url: HELPER, every: 15 } }) }), p = d.page;
  fake.mode = 'ok'; fake.failChan = ''; fake.delay = 0; fake.calls = [];
  const clock = (ms) => p.evaluate((ms) => { window.__zabNewsNow = ms; }, ms);
  const tick = async () => { await p.evaluate(() => _newsTick()); await sleep(500); };
  const base = Date.now() + 3600000;
  await T('95c a fetch at start; then one every 15 minutes (not at 14, yes at 16); at "every 30" not at 20, yes at 31', async () => {
    await sleep(2500); const c0 = fake.calls.length;
    await clock(base); await tick(); await tick(); const c1 = fake.calls.length;   /* the first tick on the new clock: the last fetch was in real time, minus an hour */
    await clock(base + 14 * 60000); await tick(); const c2 = fake.calls.length;
    await clock(base + 31 * 60000); await tick(); const c3 = fake.calls.length;
    await p.evaluate(() => zabNewsSet('every', 30, true)); await sleep(300);
    const c4 = fake.calls.length;
    await clock(base + 31 * 60000 + 20 * 60000); await tick(); const c5 = fake.calls.length;
    await clock(base + 31 * 60000 + 31 * 60000); await tick(); const c6 = fake.calls.length;
    await p.evaluate(() => zabNewsSet('every', 15, true));
    return [c0 >= 1 && c2 === c1 && c3 === c2 + 1 && c5 === c4 && c6 === c5 + 1, JSON.stringify({ c0, c1, c2, c3, c4, c5, c6 })];
  });
  let t = base + 200 * 60000; const adv = async (m = 16) => { t += m * 60000; await clock(t); await tick(); await sleep(400); };
  await T('95c one channel failing leaves the others: its words in the status, the rest shown, its old headlines kept', async () => {
    fake.failChan = 'mee'; await adv();
    const r = await p.evaluate(() => { openTheme(); return null; }); await sleep(400);
    const s = await p.evaluate(() => ({ st: document.getElementById('nw-status').textContent, aj: [...document.querySelectorAll('#nw-prev .nw-cn')].filter((e) => e.textContent === 'Al Jazeera').length, mee: [...document.querySelectorAll('#nw-prev .nw-cn')].filter((e) => e.textContent === 'Middle East Eye').length }));
    fake.failChan = '';
    return [/Middle East Eye/.test(s.st) && /403/.test(s.st) && s.aj > 0 && s.mee > 0, JSON.stringify(s)];
  });
  const toasts = () => p.evaluate(() => document.querySelectorAll('.toast').length);
  await T('95c a helper that answers 500 never toasts, keeps the old headlines, says why, and tries again a minute later', async () => {
    const tb = await toasts(); fake.mode = '500'; const c0 = fake.calls.length; await adv();
    const s = await p.evaluate(() => ({ st: document.getElementById('nw-status').textContent, n: document.querySelectorAll('#nw-prev .nw-it').length }));
    const c1 = fake.calls.length; await adv(2); const c2 = fake.calls.length; fake.mode = 'ok'; await adv(2);
    const s2 = await p.evaluate(() => document.getElementById('nw-status').textContent);
    return [/Could not fetch the news/.test(s.st) && /500/.test(s.st) && s.n > 0 && (await toasts()) === tb && c1 === c0 + 1 && c2 === c1 + 1 && /^Last fetched/.test(s2), JSON.stringify({ st: s.st.slice(0, 120), n: s.n, c0, c1, c2, s2: s2.slice(0, 60) })];
  });
  await T('95c an address that answers with a web page (not the helper) is explained in plain words', async () => {
    fake.mode = 'html'; await adv(); const st = await p.evaluate(() => document.getElementById('nw-status').textContent); fake.mode = 'ok'; await adv(2);
    return [/did not answer like the helper/.test(st) && /exec/.test(st), st.slice(0, 160)];
  });
  await T('95c a slow helper: the page stays responsive meanwhile, the wait ends with "took too long", no toast', async () => {
    await p.evaluate(() => { window.__zabNewsTimeout = 1500; }); fake.delay = 4000; const tb = await toasts();
    t += 16 * 60000; await clock(t); await p.evaluate(() => _newsTick());
    const lag = await p.evaluate(async () => { const t0 = performance.now(); await new Promise((r) => setTimeout(r, 50)); return performance.now() - t0; });
    const busy = await p.evaluate(() => _newsBusy); await sleep(2600);
    const st = await p.evaluate(() => document.getElementById('nw-status').textContent);
    fake.delay = 0; await p.evaluate(() => { delete window.__zabNewsTimeout; });
    return [busy && lag < 400 && /took too long/.test(st) && (await toasts()) === tb, JSON.stringify({ busy, lag: Math.round(lag), st: st.slice(0, 100) })];
  });
  await T('95c offline: nothing is fetched, the status says so and the saved headlines stay on screen', async () => {
    fake.mode = 'ok'; await adv(2); const c0 = fake.calls.length;
    await d.ctx.setOffline(true); await sleep(300); t += 20 * 60000; await clock(t); await tick();
    const r = await p.evaluate(() => ({ st: document.getElementById('nw-status').textContent, n: document.querySelectorAll('#nw-prev .nw-it').length }));
    const c1 = fake.calls.length; await d.ctx.setOffline(false); await sleep(300);
    return [c1 === c0 && /offline/i.test(r.st) && r.n > 0, JSON.stringify({ c0, c1, st: r.st.slice(0, 80), n: r.n })];
  });
  await T('95c after a reload with the helper unreachable, the last headlines come back from siyagah-news-v1', async () => {
    await adv(2);
    const had = await p.evaluate(() => _newsCache && Object.keys(_newsCache.chans).length);
    fake.mode = 'abort';
    await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => window.__appBooted === true); await sleep(3500);
    await p.evaluate(() => openTheme()); await sleep(600);
    const r = await p.evaluate(async () => ({ dbs: (await indexedDB.databases()).map((x) => x.name), n: document.querySelectorAll('#nw-prev .nw-it').length, st: document.getElementById('nw-status').textContent, first: (document.querySelector('#nw-prev .nw-t') || {}).textContent }));
    fake.mode = 'ok';
    return [had === 5 && r.dbs.includes('siyagah-news-v1') && r.n > 0 && /ZZNEWS aljazeera headline 0/.test(r.first || '') && /Could not fetch|Showing/.test(r.st), JSON.stringify({ had, dbs: r.dbs.filter((x) => /news/.test(x)), n: r.n, st: r.st.slice(0, 100) })];
  });
  await d.ctx.close();
}

/* ── 95d ── */
if (want('95d')) {
  fake.mode = 'ok'; fake.failChan = ''; fake.delay = 0;
  const cloud = makeCloud(), vp = VPS[2];
  const A = await addDevice(browser, srv.base, cloud, 'A', { width: vp.w, height: vp.h }, false, seed());
  await wireHelper(A.ctx);
  await T('95d DB.jeb / DB.trash / DB.articles / DB.jebPockets and the Zab bar are byte-identical with news on vs off; no headline in DB, localStorage, the cloud or Save File', async () => {
    await waitSeeded(cloud, A);
    const snap = () => on(A, () => JSON.stringify([DB.jeb, DB.trash, DB.articles, DB.jebPockets, DB.folders, DB.sections]));
    const bar = () => on(A, () => document.getElementById('jeb-bar').innerHTML);
    const a = await snap(), barA = await bar();
    await on(A, (u) => { zabNewsUrl(u); }, HELPER).catch(() => {}); await on(A, () => { zabNewsSet('on', true, true); _newsTick(); });
    await sleep(3000); await push(cloud, A); await sleep(1500);
    const had = await on(A, () => !!_newsCache && _newsCount() > 0);
    const b = await snap(), barB = await bar();
    const leak = await on(A, async () => ({ db: JSON.stringify(DB).includes('ZZNEWS'), ls: Object.keys(localStorage).some((k) => (localStorage.getItem(k) || '').includes('ZZNEWS')), html: (await _picExportHTML()).includes('ZZNEWS') }));
    const cl = JSON.stringify([...cloud.store.entries()]).includes('ZZNEWS');
    await on(A, () => zabNewsSet('on', false, true));
    const c = await snap();
    return [had && a === b && b === c && barA === barB && !leak.db && !leak.ls && !leak.html && !cl, JSON.stringify({ had, same: a === b, bar: barA === barB, leak, cl })];
  });
  await A.ctx.close();
}

/* ── 95e ── */
if (want('95e')) {
  const dp = await openDev(VPS[2]);
  let code = '';
  await T('95e the app builds the helper as text (_newsGs)', async () => { code = await dp.page.evaluate(() => _newsGs()); return [typeof code === 'string' && /function doGet/.test(code) && !/\$\{/.test(code), 'length ' + (code || '').length]; });
  await dp.ctx.close();
  const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>Feed One</title>` + [['Old story', 'Mon, 01 Jun 2026 10:00:00 GMT', 'old'], ['Middle story &amp; more', 'Tue, 02 Jun 2026 10:00:00 GMT', '<p>Middle <b>body</b> text.</p>'], ['New story', 'Wed, 03 Jun 2026 10:00:00 GMT', '<![CDATA[' + 'x'.repeat(400) + ']]>'], ['Newest', 'Thu, 04 Jun 2026 10:00:00 GMT', 'Newest body']].map(([t, d, s], i) => `<item><title><![CDATA[${t}]]></title><link>https://one.test/${i}</link><description>${s.startsWith('<![') ? s : s.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</description><pubDate>${d}</pubDate></item>`).join('') + `</channel></rss>`;
  const ATOM = `<feed xmlns="http://www.w3.org/2005/Atom"><title>Atom Two</title><entry><title>Atom entry</title><link rel="self" href="https://two.test/self"/><link rel="alternate" href="https://two.test/a1"/><updated>2026-06-05T10:00:00Z</updated><summary>Atom summary</summary></entry></feed>`;
  const SITE = `<html><head><title>The Site &amp; Co</title><link rel="alternate" type="application/rss+xml" href="/feeds/all.xml"></head><body></body></html>`;
  const TG = `<html><head><meta property="og:title" content="Chan Name"></head><body><div class="tgme_widget_message" data-post="chan/11"><div class="tgme_widget_message_text js-message_text" dir="auto">First post line<br/>second line here</div><time datetime="2026-06-01T10:00:00+00:00"></time></div><div data-post="chan/12"><div class="tgme_widget_message_text js-message_text">Newest post<br/>more</div><time datetime="2026-06-02T10:00:00+00:00"></time></div></body></html>`;
  const web = { 'https://one.test/feed': [200, RSS], 'https://two.test/atom': [200, ATOM], 'https://site.test/': [200, SITE], 'https://site.test/feeds/all.xml': [200, RSS.replace('Feed One', 'Site Feed')], 'https://t.me/s/chan': [200, TG], 'https://bad.test/feed': [403, 'no'] };
  const run = (c, n) => {
    const log = { fetches: [], uas: [], puts: 0 }, store = new Map();
    const ctx = vm.createContext({ console, JSON, Date, Math, parseInt, String, RegExp, Array, Error, isNaN, Object,
      UrlFetchApp: { fetch: (u, o) => { log.fetches.push(u); log.uas.push(o && o.headers && o.headers['User-Agent']); if (u === 'https://boom.test/feed') throw new Error('DNS error'); const w = web[u] || [404, '']; return { getResponseCode: () => w[0], getContentText: () => w[1] }; } },
      CacheService: { getScriptCache: () => ({ get: (k) => store.get(k) || null, put: (k, v) => { log.puts++; store.set(k, v); } }) },
      ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (s) => ({ s, setMimeType() { return this; }, getContent() { return this.s; } }) } });
    vm.runInContext(code, ctx);
    const call = (cc, nn) => JSON.parse(vm.runInContext('doGet', ctx)({ parameter: { c: JSON.stringify(cc), n: String(nn) } }).getContent());
    return { call, log };
  };
  await T('95e RSS 2.0: newest first whatever the feed order, n respected, plain text, short line <= 160, CDATA and entities decoded, links kept', async () => {
    const { call } = run(); const r = call([{ id: 'a', src: 'https://one.test/feed' }], 3).chans[0];
    return [r.ok && r.id === 'a' && r.name === 'Feed One' && r.items.length === 3 && r.items[0].t === 'Newest' && r.items[1].t === 'New story' && r.items[2].t === 'Middle story & more' && r.items[2].s === 'Middle body text.'
      && r.items[1].s.length <= 160 && r.items[1].s.endsWith('…') && r.items[0].u === 'https://one.test/3' && /^2026-06-04T10:00:00/.test(r.items[0].d), JSON.stringify(r).slice(0, 300)];
  });
  await T('95e Atom: the alternate link (not rel=self), the summary, the date', async () => {
    const { call } = run(); const r = call([{ id: 'b', src: 'https://two.test/atom' }], 5).chans[0];
    return [r.ok && r.name === 'Atom Two' && r.items.length === 1 && r.items[0].u === 'https://two.test/a1' && r.items[0].s === 'Atom summary' && /^2026-06-05/.test(r.items[0].d), JSON.stringify(r).slice(0, 300)];
  });
  await T('95e a plain site address: finds the alternate feed link (relative), fetches it, returns the feed used (src) and the site name', async () => {
    const { call, log } = run(); const r = call([{ id: 'c', src: 'https://site.test/' }], 2).chans[0];
    return [r.ok && r.src === 'https://site.test/feeds/all.xml' && r.name === 'The Site & Co' && r.items.length === 2 && log.fetches.length === 2, JSON.stringify(r).slice(0, 250)];
  });
  await T('95e a Telegram channel (t.me/name): reads t.me/s/name, the first line is the headline, the post link is t.me/name/id, newest first', async () => {
    const { call, log } = run(); const r = call([{ id: 'd', src: 'https://t.me/chan' }], 5).chans[0];
    return [r.ok && log.fetches[0] === 'https://t.me/s/chan' && r.name === 'Chan Name' && r.items.length === 2 && r.items[0].t === 'Newest post' && r.items[0].u === 'https://t.me/chan/12' && r.items[1].t === 'First post line' && r.items[1].s === 'second line here', JSON.stringify(r).slice(0, 300)];
  });
  await T('95e one failing channel never fails the others (HTTP 403, a thrown error, a bad address, a page with no feed); each says why', async () => {
    const { call } = run(); const r = call([{ id: 'x1', src: 'https://bad.test/feed' }, { id: 'ok', src: 'https://one.test/feed' }, { id: 'x2', src: 'https://boom.test/feed' }, { id: 'x3', src: 'ftp://nope' }, { id: 'x4', src: 'https://t.me/missing' }], 2).chans;
    return [r.length === 5 && r[1].ok && r[1].items.length === 2 && !r[0].ok && /403/.test(r[0].err) && !r[2].ok && /DNS/.test(r[2].err) && !r[3].ok && !r[4].ok && r.map((x) => x.id).join() === 'x1,ok,x2,x3,x4', JSON.stringify(r.map((x) => [x.id, x.ok, x.err])).slice(0, 300)];
  });
  await T('95e every request sends a browser User-Agent', async () => {
    const { call, log } = run(); call([{ id: 'a', src: 'https://one.test/feed' }, { id: 'b', src: 'https://site.test/' }], 1);
    return [log.uas.length >= 3 && log.uas.every((u) => /^Mozilla\/5\.0 .*Chrome/.test(u)), log.uas[0]];
  });
  await T('95e the cache: the same channel and n a second time makes no new fetch; another n does', async () => {
    const { call, log } = run(); call([{ id: 'a', src: 'https://one.test/feed' }], 3); const f1 = log.fetches.length; const r2 = call([{ id: 'z', src: 'https://one.test/feed' }], 3).chans[0]; const f2 = log.fetches.length; call([{ id: 'a', src: 'https://one.test/feed' }], 4); const f3 = log.fetches.length;
    return [f1 === 1 && f2 === 1 && r2.id === 'z' && r2.ok && f3 === 2 && log.puts === 2, JSON.stringify({ f1, f2, f3, puts: log.puts })];
  });
  await T('95e a missing / broken c: an empty list; the file contains no key, secret or note data', async () => {
    const { log } = run(); const ctx = vm.createContext({ console, JSON, Date, Math, parseInt, String, RegExp, Array, Error, isNaN, Object, ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (s) => ({ s, setMimeType() { return this; }, getContent() { return this.s; } }) }, CacheService: { getScriptCache: () => ({ get: () => null, put() {} }) }, UrlFetchApp: { fetch() { throw new Error('x'); } } });
    vm.runInContext(code, ctx); const g = vm.runInContext('doGet', ctx);
    const a = JSON.parse(g({ parameter: { c: '{broken' } }).getContent()), b = JSON.parse(g({}).getContent());
    return [a.chans.length === 0 && b.chans.length === 0 && typeof a.at === 'string' && !/apiKey|firebase|notebook|Authorization|getOAuthToken/i.test(code), JSON.stringify([a, b]).slice(0, 160)];
  });
}

/* ── 95f ── */
if (want('95f')) {
  const d = await openDev(VPS[0], { db: seed({ zabNews: { on: true, url: HELPER } }) }), p = d.page;
  fake.mode = 'ok'; fake.failChan = ''; fake.delay = 0;
  await T('95f at 390 every new control (inputs, selects, buttons, tick rows, colour swatches, ✕, headline links) is at least 44 x 44', async () => {
    await p.evaluate(() => _newsTick()); await sleep(2500);
    const ok = await openAppearance(d);
    const small = await p.evaluate(() => [...document.querySelectorAll('#th-nw input[type=url],#th-nw input[type=text],#th-nw input[type=color],#th-nw select,#th-nw button,#th-nw label,#th-nw .nw-it')].map((e) => { const r = e.getBoundingClientRect(); return { n: (e.id || e.className || e.tagName) + '', w: r.width, h: r.height }; }).filter((r) => r.w < 43.5 || r.h < 43.5).map((r) => `${r.n} ${Math.round(r.w)}x${Math.round(r.h)}`));
    const cnt = await p.evaluate(() => document.querySelectorAll('#th-nw input,#th-nw select,#th-nw button,#th-nw label,#th-nw .nw-it').length);
    return [ok && cnt > 25 && small.length === 0, `${cnt} controls; too small: ${small.slice(0, 6).join(', ') || 'none'}`];
  });
  await T('95f in Zab mode (/?jeb=1) at 390 and 1440 the News section is drawn where Appearance opens, with no sideways scroll', async () => {
    const out = [];
    for (const vp of [VPS[0], VPS[2]]) {
      const z = await openDev(vp, { path: '/?jeb=1' });
      await z.page.evaluate(() => openTheme()); await sleep(600);
      out.push(await z.page.evaluate(() => ({ has: !!document.getElementById('th-nw'), side: document.documentElement.scrollWidth > innerWidth + 1 })));
      out.push(z.errors.length === 0); await z.ctx.close();
    }
    return [out[0].has && !out[0].side && out[1] && out[2].has && !out[2].side && out[3], JSON.stringify(out)];
  });
  await T('95f no page errors across the whole run', async () => [[...allErrors(), ...d.errors].length === 0, [...allErrors(), ...d.errors].slice(0, 3).join(' · ')]);
  await d.ctx.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
await browser.close(); await srv.close?.();
process.exit(failed ? 1 : 0);
