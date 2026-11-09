#!/usr/bin/env node
/* tools/offline-j143.mjs — v05.83, J143: a busy start or a long import must not say ☁ Offline (checks 142a–142e).

   The app is served by a small server of this file (as offline-o1.mjs does) and the Firebase SDK is the fake one of s1-fake.mjs, answered by a browser route
   that this file controls: ok | hang | abort-then-ok. "Busy" is injected the way a real busy start looks: the moment the app appends its first gstatic <script>, a
   MutationObserver microtask spins the main thread (so the app's 15 s timer is armed, then the page is blocked and the timer fires late). A MutationObserver on
   #sync-dot logs every change of the dot with its time.

   142a  busy 18 s, the SDK answers: the dot never says Offline, sync reaches Live/conn, no "timed out" warning                       (390, 820, 1440)
   142b  busy 18 s, the SDK URL hangs: ends Offline within 15 s + 5 s grace + the busy time, "the cloud is not answering"; setOffline -> "no connection"
   142b2 3 s bursts for 90 s, the SDK refused for the first 5 s then working: the dot is never left Offline longer than one retry; ends Live/conn
   142c  the label carries "last try" and fits its row in the ⚙ menu at 390 (no page scroll, text not cut)
   142d  unit: _loadScript, a script whose onload is queued behind a late timer, resolves (never rejects); a hanging one still rejects
   142e  no page errors
   Each printed ok/FAIL line becomes one app-check check (block 142). */
import { playwright, seedDB, ROOT } from './harness.mjs';
import { makeCloud, addDevice, reopen, sleep, check, results, FAKE_SDK } from './s1-fake.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const argv = process.argv.slice(2);
const SRC = (argv.find((a) => a.startsWith('--root=')) || '').slice(7) || process.env.J143_ROOT || ROOT;
const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];
const pw = await playwright();
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const srv = await new Promise((ok) => {
  const sockets = new Set();
  const s = createServer(async (req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    try { const body = await readFile(join(SRC, p)); res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); res.end(body); } catch { res.writeHead(404); res.end('nf'); }
  });
  s.on('connection', (c) => { sockets.add(c); c.on('close', () => sockets.delete(c)); });
  s.listen(0, '127.0.0.1', () => ok({ base: `http://127.0.0.1:${s.address().port}`, close: async () => { for (const c of sockets) c.destroy(); await new Promise((d) => s.close(d)); } }));
});
const browser = await pw.chromium.launch();
const T0 = new Date().toISOString();
const seed = () => seedDB(T0);

/* a device on the fake cloud; the SDK route is mine; busy / dot log are installed for the next load, then the page is reopened */
async function device(vp, { sdk = 'ok', busyMs = 0, burst = false }) {
  const cloud = makeCloud();
  const d = await addDevice(browser, srv.base, cloud, 'A', { width: vp.w, height: vp.h }, vp.touch, seed());
  d.sdk = sdk; d.t0 = Date.now(); d.warn = [];
  await d.ctx.route('**gstatic.com/**', (r) => {
    if (d.sdk === 'hang') return;
    if (d.sdk === 'abort' || (d.sdk === 'abort5' && Date.now() - d.t0 < 5000)) return r.abort();
    return r.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_SDK });
  });
  await d.ctx.addInitScript((ms) => {
    window.__dotLog = [];
    const watch = () => { const el = document.getElementById('sync-dot'); if (!el) return setTimeout(watch, 5);
      const log = () => window.__dotLog.push([Math.round(performance.now()), el.className, el.textContent, el.title]); log();
      new MutationObserver(log).observe(el, { attributes: true, childList: true, characterData: true, subtree: true }); };
    document.addEventListener('DOMContentLoaded', watch);
    if (ms) { let done = false;   /* the first gstatic <script> the app adds: spin right after, in the observer's microtask */
      new MutationObserver((muts) => { if (done) return; for (const m of muts) for (const n of m.addedNodes) if (n.tagName === 'SCRIPT' && /gstatic/.test(n.src || '')) { done = true; window.__busyAt = performance.now(); const e = performance.now() + ms; while (performance.now() < e); return; } })
        .observe(document, { childList: true, subtree: true }); }
  }, busyMs);
  d.page.on('console', (m) => { if (/not loaded|timed out/i.test(m.text())) d.warn.push(m.text()); });
  d.errors.length = 0;
  d.t0 = Date.now();
  await d.page.reload({ waitUntil: 'domcontentloaded' });
  return d;
}
const dot = (d) => d.page.evaluate(() => { const e = document.getElementById('sync-dot'); return e ? { cls: e.className, txt: e.textContent, title: e.title, why: e.getAttribute('data-why') } : null; });
const log = (d) => d.page.evaluate(() => window.__dotLog || []);
const waitDot = async (d, re, ms) => { const t = Date.now(); while (Date.now() - t < ms) { const x = await dot(d).catch(() => null); if (x && re.test(x.txt)) return x; await sleep(300); } return null; };
const realErr = (e) => !/ERR_|Failed to load resource|net::|timed out|failed to load/i.test(e);

try {
  for (const vp of VPS) {
    const t = `${vp.name}`;
    /* ══ 142a — busy 18 s, the SDK answers ══ */
    {
      const d = await device(vp, { sdk: 'ok', busyMs: 18000 });
      try {
        await d.page.waitForFunction(() => typeof firebase === 'object' && !!_syncFsDb, null, { timeout: 90000 }).catch(() => {});   /* the static markup already says "Live": wait for the SDK to really run */
        await sleep(2000);
        const x = await waitDot(d, /Live|☁…/, 90000);
        const L = await log(d);
        const off = L.filter((e) => /Offline/.test(e[2]));
        const sdkRan = await d.page.evaluate(() => typeof firebase === 'object');
        check(sdkRan && !off.length, `142a@${t} busy start (18 s), the SDK answers: the dot never says Offline (${L.length} changes seen)`, off.slice(0, 2).map((e) => e[2]).join(' | '));
        check(!!x && !!(await waitDot(d, /Live/, 60000)) || (await dot(d)).cls.includes('sd-conn'), `142a@${t} sync reaches Live/connecting`, JSON.stringify(await dot(d)));
        check(d.warn.length === 0, `142a@${t} no "timed out" / "not loaded" warning`, d.warn.join(' | '));
        check(d.errors.filter(realErr).length === 0, `142e@${t} no page errors (142a)`, d.errors.slice(0, 2).join(' · '));
      } finally { await d.ctx.close().catch(() => {}); }
    }
    /* ══ 142b — busy 18 s, the SDK hangs; then no connection ══ */
    {
      const d = await device(vp, { sdk: 'hang', busyMs: 18000 });
      try {
        const t1 = Date.now();
        const x = await waitDot(d, /Offline/, 70000);
        const took = Date.now() - t1;
        check(!!x && took <= 18000 + 5000 + 15000 + 8000, `142b@${t} SDK hangs: ends Offline within 15 s + 5 s grace + the busy time`, `${took} ms`);
        check(!!x && /the cloud is not answering/.test(x.txt) && /tries again by itself/.test(x.title), `142b@${t} the label says "the cloud is not answering" and that it tries again`, x && x.txt);
        await d.ctx.setOffline(true);
        const y = await waitDot(d, /no connection/, 8000);
        check(!!y, `142b@${t} with the connection cut it says "no connection"`, JSON.stringify(await dot(d)));
        check(d.errors.filter(realErr).length === 0, `142e@${t} no page errors (142b)`, d.errors.slice(0, 2).join(' · '));
      } finally { await d.ctx.close().catch(() => {}); }
    }
  }

  /* ══ 142b2 — a long busy stretch (an import): 3 s bursts for 90 s, the SDK refused for the first 5 s ══ */
  {
    const vp = VPS[2];
    const d = await device(vp, { sdk: 'abort5', busyMs: 3000 });
    try {
      const t1 = Date.now();
      while (Date.now() - t1 < 90000) { await d.page.evaluate(() => { const e = performance.now() + 3000; while (performance.now() < e); }).catch(() => {}); await sleep(400); }
      const fin = await waitDot(d, /Live|☁…/, 60000);
      const L = await log(d);
      let worst = 0, since = null;
      for (let i = 0; i < L.length; i++) { const isOff = /Offline/.test(L[i][2]); if (isOff && since == null) since = L[i][0]; if (!isOff && since != null) { worst = Math.max(worst, L[i][0] - since); since = null; } }
      if (since != null) worst = Math.max(worst, (await d.page.evaluate(() => Math.round(performance.now()))) - since);
      check(worst <= 32000, `142b2 3 s bursts for 90 s: the dot is never Offline longer than one retry (worst ${Math.round(worst)} ms)`);
      check(!!fin && !!(await d.page.evaluate(() => !!_syncFsDb)), `142b2 it ends Live/connecting with sync started`, JSON.stringify(await dot(d)));
      check(d.errors.filter(realErr).length === 0, '142e 142b2 no page errors', d.errors.slice(0, 2).join(' · '));
    } finally { await d.ctx.close().catch(() => {}); }
  }

  /* ══ 142c — the label fits its row at 390 ══ */
  {
    const vp = VPS[0];
    const d = await device(vp, { sdk: 'abort', busyMs: 0 });
    try {
      const x = await waitDot(d, /Offline/, 40000);
      await d.page.evaluate(() => { if (window.innerWidth < 1200) showPane('sb'); document.getElementById('sb-menu-btn').click(); });
      await sleep(400);
      const m = await d.page.evaluate(() => { const e = document.getElementById('sync-dot'), menu = document.getElementById('sb-menu'), r = e.getBoundingClientRect(), mr = menu.getBoundingClientRect();
        return { txt: e.textContent, hscroll: document.documentElement.scrollWidth > window.innerWidth, cut: e.scrollWidth > e.clientWidth + 1, inMenu: r.left >= mr.left - 1 && r.right <= mr.right + 1, inView: r.right <= window.innerWidth + 1, w: Math.round(r.width), mw: Math.round(mr.width) }; });
      check(!!x && /last try \d{1,2}:\d\d/.test(m.txt), '142c the label carries "last try h:mm"', m.txt);
      check(!m.hscroll && !m.cut && m.inMenu && m.inView, '142c at 390 the label fits its row: no page scroll, text not cut', JSON.stringify(m));
    } finally { await d.ctx.close().catch(() => {}); }
  }

  /* ══ 142d — unit: _loadScript against a late timer ══ */
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await ctx.route('**/unit-ok.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: 'window.__unitRan=1;' }));
    await ctx.route('**/unit-hang.js*', () => {});
    await page.goto(srv.base + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof _loadScript === 'function');
    const ok = await page.evaluate(async (base) => {
      /* the script is fetched (route answers at once), then the page is busy past the 1.5 s timer: its onload is queued behind the late timer */
      const p = _loadScript(base + '/unit-ok.js', 1500).then(() => 'resolved', (e) => 'rejected: ' + e.message);
      const e = performance.now() + 2600; while (performance.now() < e);
      return { r: await p, ran: window.__unitRan === 1 };
    }, srv.base);
    check(ok.r === 'resolved' && ok.ran, '142d a script whose onload is queued behind a late timer resolves, never rejects', JSON.stringify(ok));
    const hang = await page.evaluate(async (base) => { const t = performance.now(); const r = await _loadScript(base + '/unit-hang.js', 800).then(() => 'resolved', (e) => 'rejected'); return { r, ms: Math.round(performance.now() - t) }; }, srv.base);
    check(hang.r === 'rejected' && hang.ms < 800 + 200, '142d a script that really hangs still rejects at its time limit', JSON.stringify(hang));
    const hangBusy = await page.evaluate(async (base) => { const t = performance.now(); const p = _loadScript(base + '/unit-hang.js?b', 800).then(() => 'resolved', (e) => 'rejected'); const e = performance.now() + 2000; while (performance.now() < e); const r = await p; return { r, ms: Math.round(performance.now() - t) }; }, srv.base);
    check(hangBusy.r === 'rejected' && hangBusy.ms >= 2000 + 4500 && hangBusy.ms < 2000 + 5000 + 1500, '142d a late timer on a script that never answers waits ONE 5 s grace, then rejects', JSON.stringify(hangBusy));
    await ctx.close();
  }
} catch (e) {
  console.log(' FAIL  offline-j143 threw: ' + (e && e.stack || e));
  results.push({ ok: false, label: 'threw' });
} finally {
  await browser.close();
  await srv.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
