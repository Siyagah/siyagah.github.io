#!/usr/bin/env node
/* tools/zab-news-band.mjs — v05.36, Z13b: News, round 2 — the headlines in the scrolling band (PCF J50). Checks 96a–96e. The helper is FAKE: a Playwright route
   answers https://news-helper.test/exec (never the real network). Headlines carry the marker ZZNEWS (ZZNEWS2 after the helper's answer changes).

   96a  order     Mixed / News only / Items only give the expected sequence (item, headline, item, headline…; round-robin by channel, newest first); `per` and a
                  channel switched off are respected; "My items only" is byte-identical to the band with news off
   96b  tap       a real tap / click on a headline opens the story in a new page and opens no item menu; a tap on an item still opens the menu — at 390, 820, 1440, Zab mode
   96c  refresh   new headlines enter the band at the next round start, not mid-scroll; a failing helper leaves the last headlines in the band and toasts nothing
   96d  apart     "News only" with no Zab items still shows the band; Mixed with no items shows the news alone; news off with no items: no band, as v05.35
   96e  phone     every headline >= 44 px tall and its hit box lands on it; no page errors; the headlines are not in DB

   `--only=96a,96e` runs just those; `--unpatched` serves the build before this round (96a–96d must FAIL there: the band shows no news). */
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
  const dir = mkdtempSync(join(tmpdir(), 'z13b-base-'));
  const sha = execFileSync('git', ['log', '--format=%H', '-n', '1', '--grep=v05.36 Z13b: version bump'], { encoding: 'utf8' }).trim();
  if (!sha) throw new Error('makeBase: the commit "v05.36 Z13b: version bump" is not in this clone (shallow?) — refusing to compare the build with itself');
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', `${sha}~1:${f}`], { encoding: 'buffer', maxBuffer: 1 << 28 })); } catch {} }
  return dir;
}
const pw = await playwright();
const srv = await serve(argv.includes('--unpatched') ? makeBase() : undefined);
const browser = await pw.chromium.launch();

const HELPER = 'https://news-helper.test/exec';
const fake = { mode: 'ok', tag: 'ZZNEWS', calls: 0 };
function fakeBody(u) {
  const c = JSON.parse(u.searchParams.get('c') || '[]'), n = +u.searchParams.get('n') || 10;
  return JSON.stringify({ at: new Date().toISOString(), chans: c.map((x) => ({ id: x.id, ok: true, name: x.id, items: Array.from({ length: Math.min(n, 25) }, (_, k) => ({ t: `${fake.tag} ${x.id} headline ${k}`, s: `short line ${k}`, u: `https://news-story.test/${x.id}/${k}`, d: new Date(Date.now() - k * 60000).toISOString() })) })) });
}
async function wireHelper(ctx) {
  await ctx.route('https://news-helper.test/**', async (route) => {
    const u = new URL(route.request().url()); fake.calls++;
    const h = { 'access-control-allow-origin': '*' };
    if (fake.mode === '500') return route.fulfill({ status: 500, headers: h, contentType: 'text/plain', body: 'boom' });
    return route.fulfill({ status: 200, headers: h, contentType: 'application/json', body: fakeBody(u) });
  });
  await ctx.route('https://news-story.test/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>story</title>' }));
}
const T0 = '2026-10-01T00:00:00.000Z';
const CHANS = [{ id: 'aljazeera', name: 'Al Jazeera', src: 'https://www.aljazeera.com/xml/rss/all.xml', color: '#E8A200', on: true }, { id: 'mee', name: 'Middle East Eye', src: 'https://www.middleeasteye.net/rss', color: '#2E8B57', on: true }];
function seed({ items = true, news = {} } = {}) {
  const db = seedDB(T0);
  const pk = (id, i, e = {}) => ({ id, name: id, icon: '✶', color: '#CFE8FF', order: i, createdAt: T0, updatedAt: T0, ...e });
  const mk = (id, pocketId, text, order) => ({ id, pocketId, text, done: false, folderIds: [], tags: [], kind: null, journal: false, order, createdAt: T0, updatedAt: T0 });
  db.jebPockets = [pk('jp-task', 0, { name: 'Tasks', icon: '✅' }), pk('jp-idea', 1, { name: 'Ideas', icon: '💡', color: '#FFE3A8' })];
  db.jeb = items ? [mk('t1', 'jp-task', 'Call the bank', 0), mk('t2', 'jp-task', 'Buy stamps', 1), mk('i1', 'jp-idea', 'An idea about things', 0)] : [];
  db.theme = { preset: 'forest', custom: {}, zabNews: { on: true, url: HELPER, per: 3, chans: CHANS, ...news } };
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
const gotNews = (p) => p.waitForFunction(() => typeof _newsCache !== 'undefined' && !!_newsCache, null, { timeout: 9000 }).then(() => true, () => false);
/* the headlines enter the band the way they do at a round start; the check of the real round start is 96c */
const take = (p) => p.evaluate(() => { if (typeof _tkNewsRef !== 'undefined') _tkNewsRef = _newsCache; _tkSync(); });
const seq = (p) => p.evaluate(() => [...document.querySelectorAll('#zab-tk .tk-it')].map((e) => e.classList.contains('tk-nw') ? 'N:' + new URL(e.href).pathname.slice(1) : 'I:' + e.dataset.iid));
const bandHtml = (p) => p.evaluate(() => [...document.querySelectorAll('#zab-tk .tk-it')].map((e) => e.outerHTML).join('\n'));
const setNews = async (p, k, v) => { await p.evaluate(([k, v]) => zabNewsSet(k, v, true), [k, v]); await sleep(900); await gotNews(p); await take(p); await sleep(200); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ── 96a ── */
if (want('96a')) {
  const d = await openDev(VPS[2]), p = d.page;
  await gotNews(p); await take(p); await sleep(300);
  await T('96a Mixed: your item, then one headline (round-robin by channel, newest first), item, headline… ; the band has the channel dot, name and headline + short line', async () => {
    const s = await seq(p);
    const txt = await p.evaluate(() => { const e = document.querySelector('#zab-tk .tk-nw'); return e && { cn: e.querySelector('.tk-cn').textContent, tx: e.querySelector('.tk-tx').textContent, dot: getComputedStyle(e.querySelector('.tk-dot')).backgroundColor }; });
    const want_ = ['I:t1', 'N:aljazeera/0', 'I:t2', 'N:mee/0', 'I:i1', 'N:aljazeera/1'];
    return [same(s, want_) && txt && txt.cn === 'Al Jazeera' && txt.tx === 'ZZNEWS aljazeera headline 0 — short line 0' && txt.dot === 'rgb(232, 162, 0)', JSON.stringify({ s, txt })];
  });
  await T('96a News only: just the headlines, round-robin (aljazeera, mee, aljazeera, mee…), `per` (3) from each', async () => {
    await setNews(p, 'mix', 'news'); const s = await seq(p);
    return [same(s, ['N:aljazeera/0', 'N:mee/0', 'N:aljazeera/1', 'N:mee/1', 'N:aljazeera/2', 'N:mee/2']), JSON.stringify(s)];
  });
  await T('96a `per` 5 gives at most 5 from each channel (10), and back to 3 gives 6', async () => {
    await setNews(p, 'per', 5); const s = await seq(p); await setNews(p, 'per', 3); const s3 = await seq(p);
    return [s.length === 10 && s[8] === 'N:aljazeera/4' && s[9] === 'N:mee/4' && s3.length === 6, JSON.stringify({ n: s.length, n3: s3.length })];
  });
  await T('96a a channel switched off is left out', async () => {
    await p.evaluate(() => zabNewsChan('mee', 'on', false)); await sleep(900); await take(p); await sleep(200);
    const s = await seq(p); await p.evaluate(() => zabNewsChan('mee', 'on', true)); await sleep(300);
    return [same(s, ['N:aljazeera/0', 'N:aljazeera/1', 'N:aljazeera/2']), JSON.stringify(s)];
  });
  await T('96a "short line" off: the headline alone', async () => {
    await setNews(p, 'short', false); const t = await p.evaluate(() => document.querySelector('#zab-tk .tk-nw .tk-tx').textContent); await setNews(p, 'short', true);
    return [t === 'ZZNEWS aljazeera headline 0', t];
  });
  await T('96a My items only: byte-identical to the band with the news off, and no headline in it', async () => {
    await setNews(p, 'per', 3); await setNews(p, 'mix', 'items'); const a = await bandHtml(p);
    await p.evaluate(() => zabNewsSet('on', false, true)); await sleep(1300); const b = await bandHtml(p);
    await p.evaluate(() => { zabNewsSet('on', true, true); zabNewsSet('mix', 'mix', true); });
    return [a.length > 50 && a === b && !/ZZNEWS|tk-nw/.test(a), `${a.length} ${b.length}`];
  });
  d.ctx.close().catch(() => {});
}

/* ── 96b ── */
if (want('96b')) {
  const park = (p, sel) => p.evaluate((sel) => { const b = document.getElementById('zab-tk'), it = b.querySelector(sel); _tkPhase = 'gap'; _tkGapEnd = 1e15; _tkMeasure = false; _tkX = 30 - it.offsetLeft; b.firstChild.style.transform = 'translate3d(' + _tkX + 'px,0,0)'; }, sel);
  const centre = (p, sel) => p.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
  const press = async (d, pt) => { if (d.vp.touch) await d.page.touchscreen.tap(pt.x, pt.y); else await d.page.mouse.click(pt.x, pt.y); };
  for (const cfg of [...VPS.map((v) => ({ vp: v, path: '/', tag: v.name })), { vp: VPS[2], path: '/?jeb=1', tag: 'Zab mode' }]) {
    const d = await openDev(cfg.vp, { path: cfg.path }), p = d.page, tag = `96b@${cfg.tag}`;
    await gotNews(p); await take(p); await sleep(300);
    await T(`${tag} a tap on a headline opens its story in a new page (noopener) and opens no item menu`, async () => {
      await park(p, '#zab-tk .tk-nw'); await sleep(150);
      const rel = await p.evaluate(() => document.querySelector('#zab-tk .tk-nw').rel);
      const pt = await centre(p, '#zab-tk .tk-nw');
      const [pop] = await Promise.all([p.waitForEvent('popup', { timeout: 5000 }), press(d, pt)]);
      const url = pop.url(); await pop.close().catch(() => {}); await sleep(300);
      const menu = await p.evaluate(() => !!document.getElementById('jeb-menu'));
      return [/^https:\/\/news-story\.test\/aljazeera\/0$/.test(url) && /noopener/.test(rel) && !menu, `${url} ${rel} menu:${menu}`];
    });
    await T(`${tag} a tap on one of your items still opens its menu`, async () => {
      await park(p, '#zab-tk .tk-it[data-iid="t1"]'); await sleep(150);
      await press(d, await centre(p, '#zab-tk .tk-it[data-iid="t1"]')); await sleep(500);
      const menu = await p.evaluate(() => !!document.getElementById('jeb-menu'));
      await p.keyboard.press('Escape'); return [menu, 'menu ' + menu];
    });
    d.ctx.close().catch(() => {});
  }
}

/* ── 96c ── */
if (want('96c')) {
  const d = await openDev(VPS[2]), p = d.page;
  const before = await p.evaluate(() => ({ cache: typeof _newsCache !== 'undefined' && !!_newsCache, nw: document.querySelectorAll('#zab-tk .tk-nw').length, its: document.querySelectorAll('#zab-tk .tk-it').length }));
  const roundEnd = async () => { await p.evaluate(() => { _tkX = -_tkTw + 1; _tkPhase = 'run'; _tkGapEnd = 0; }); await sleep(700); };
  const texts = () => p.evaluate(() => [...document.querySelectorAll('#zab-tk .tk-nw .tk-tx')].map((e) => e.textContent).join('|'));
  await T('96c the band was built (your items) before the first headlines arrived', async () => [!before.cache && before.nw === 0 && before.its === 3, JSON.stringify(before)]);
  await T('96c headlines that arrive mid-scroll do NOT rebuild the band; at the next round start they enter', async () => {
    await gotNews(p); await sleep(1500); const mid = await p.evaluate(() => document.querySelectorAll('#zab-tk .tk-nw').length);
    await roundEnd(); const after = await p.evaluate(() => document.querySelectorAll('#zab-tk .tk-nw').length);
    return [mid === 0 && after > 0, `mid ${mid} after ${after}`];
  });
  const base = Date.now() + 3600000; let t = base;
  const adv = async (m = 16) => { t += m * 60000; await p.evaluate((t) => { window.__zabNewsNow = t; _newsTick(); }, t); await sleep(900); };
  await T('96c a changed answer from the helper is not shown mid-scroll, only at the next round start', async () => {
    fake.tag = 'ZZNEWS2'; await adv(); const mid = await texts(); await roundEnd(); const after = await texts();
    return [/ZZNEWS aljazeera/.test(mid) && !/ZZNEWS2/.test(mid) && /ZZNEWS2 aljazeera/.test(after), `mid ${mid.slice(0, 60)} | after ${after.slice(0, 60)}`];
  });
  await T('96c a failing helper leaves the last headlines in the band and toasts nothing', async () => {
    const tb = await p.evaluate(() => document.querySelectorAll('.toast').length); fake.mode = '500'; fake.tag = 'ZZNEWS3';
    await adv(); await roundEnd(); const a = await texts(); await adv(20); await roundEnd(); const b = await texts();
    const tn = await p.evaluate(() => document.querySelectorAll('.toast').length);
    return [/ZZNEWS2 aljazeera/.test(a) && a === b && tn === tb, `${a.slice(0, 50)} toasts ${tb}->${tn}`];
  });
  fake.mode = 'ok'; fake.tag = 'ZZNEWS';
  d.ctx.close().catch(() => {});
}

/* ── 96d ── */
if (want('96d')) {
  {
    const d = await openDev(VPS[2], { db: seed({ items: false, news: { mix: 'news' } }) }), p = d.page;
    await T('96d News only with no Zab items: the band shows, all headlines, and the page makes room for it (html.zab-tk)', async () => {
      await gotNews(p); await sleep(1500); const s = await seq(p);
      const cls = await p.evaluate(() => document.documentElement.classList.contains('zab-tk'));
      return [s.length === 6 && s.every((x) => x.startsWith('N:')) && cls, JSON.stringify(s) + ' ' + cls];
    });
    d.ctx.close().catch(() => {});
  }
  {
    const d = await openDev(VPS[2], { db: seed({ items: false, news: { mix: 'mix' } }) }), p = d.page;
    await T('96d Mixed with no items shows the news alone', async () => { await gotNews(p); await sleep(1500); const s = await seq(p); return [s.length === 6 && s.every((x) => x.startsWith('N:')), JSON.stringify(s)]; });
    d.ctx.close().catch(() => {});
  }
  {
    const d = await openDev(VPS[2], { db: seed({ items: false, news: { on: false, mix: 'news' } }) }), p = d.page;
    await T('96d news off and no items: no band, exactly as v05.35 — and with items, only the items', async () => {
      await sleep(1500); const a = await p.evaluate(() => ({ band: !!document.getElementById('zab-tk'), cls: document.documentElement.classList.contains('zab-tk') }));
      const d2 = await openDev(VPS[2], { db: seed({ news: { on: false } }) }); await sleep(1200);
      const s = await seq(d2.page); d2.ctx.close().catch(() => {});
      return [!a.band && !a.cls && same(s, ['I:t1', 'I:t2', 'I:i1']), JSON.stringify({ a, s })];
    });
    d.ctx.close().catch(() => {});
  }
}

/* ── 96e ── */
if (want('96e')) {
  const d = await openDev(VPS[0]), p = d.page;
  const snap = () => p.evaluate(() => JSON.stringify([DB.jeb, DB.jebPockets, DB.articles, DB.trash]));
  const s0 = await snap();
  await gotNews(p); await take(p); await sleep(400);
  await T('96e at 390 every headline is at least 44 px tall and a tap at its centre lands on it', async () => {
    const r = await p.evaluate(() => [...document.querySelectorAll('#zab-tk .tk-nw')].map((e) => Math.round(e.getBoundingClientRect().height)));
    await p.evaluate(() => { const b = document.getElementById('zab-tk'), it = b.querySelector('.tk-nw'); _tkPhase = 'gap'; _tkGapEnd = 1e15; _tkMeasure = false; _tkX = 30 - it.offsetLeft; b.firstChild.style.transform = 'translate3d(' + _tkX + 'px,0,0)'; });
    await sleep(150);
    const hit = await p.evaluate(() => { const e = document.querySelector('#zab-tk .tk-nw'), r = e.getBoundingClientRect(), h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!h && !!h.closest('.tk-nw') && h.closest('.tk-nw') === e; });
    return [r.length >= 3 && r.every((h) => h >= 44) && hit, JSON.stringify({ r: r.slice(0, 6), hit })];
  });
  await T('96e no page errors, and the DB (items, Zabs, notes, Trash) is byte-identical with no headline in it', async () => {
    const s1 = await snap(), inDb = await p.evaluate(() => JSON.stringify(DB).includes('ZZNEWS') || (localStorage.getItem('my-notebook-v1') || '').includes('ZZNEWS'));
    return [s0 === s1 && !inDb && d.errors.length === 0, JSON.stringify({ same: s0 === s1, inDb, errors: d.errors.slice(0, 3) })];
  });
  d.ctx.close().catch(() => {});
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
await browser.close(); await srv.close?.();
process.exit(failed ? 1 : 0);
