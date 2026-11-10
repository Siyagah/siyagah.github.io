#!/usr/bin/env node
/* tools/onenote-j148.mjs — v05.84, J148 (block 143): the 📥 OneNote import keeps going when Microsoft throttles, renews its own sign-in, saves every 25 pages
   and says why a page was not read. Its own FAKE Microsoft (token endpoint with a refresh grant; Graph with sustained 429, a revoked token, refusals).
   143a  sustained 429 (Retry-After on 30 requests in a row): no page given up, ONE request in flight while throttled, the status line names the wait + the page; Pause works mid-wait
   143b  the token expires mid-import: the refresh grant renews it (proactively, and on a 401) with no sign-in; the refresh token is in NO storage nor in the Save File copy;
         a refresh that fails shows “Sign in again to continue”, then the import carries on
   143c  pages are saved every 25 (steps of 25 in DB); a killed page keeps ≥ 50 in the device copy
   143d  every page not read keeps its reason; grouped, folded, nothing off screen at 390/820/1440; the next run tries them again
   143e  the typed client id survives every repaint and the async config read: 20 repeats
   143f  2,722 pages with intermittent 429s at 390 ×4 CPU: all in; the worst long task is reported
   `--only=143a,143e`. */
import { playwright, serve, seedDB, hostLimit } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, check, results } from './s1-fake.mjs';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);
const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];
const pw = await playwright();
const srv = await serve();
const browser = await pw.chromium.launch({ args: ['--js-flags=--max-old-space-size=8192'] });
const G = 'https://graph.microsoft.com/v1.0/me/onenote';
const CID = '11111111-2222-3333-4444-555555555555';
const OLD = '99999999-8888-7777-6666-555555555555';
const T0 = '2026-10-01T00:00:00.000Z';

const body = (i) => `<html><head><title>x</title></head><body><div><p>Body ${i}</p></div></body></html>`;
/* secs sections of per pages each, ids Pn_s */
const makeFix = (n, secs = 1) => {
  const F = { notebooks: [{ id: 'NB1', displayName: 'Big' }], nbSecs: { NB1: [] }, pages: {}, pageSize: 100 };
  for (let s = 1; s <= secs; s++) {
    F.nbSecs.NB1.push({ id: 'S' + s, displayName: 'Sec ' + s });
    const per = Math.ceil(n / secs);
    F.pages['S' + s] = Array.from({ length: Math.min(per, n - (s - 1) * per) }, (_, i) => ({ id: `P${s}_${i}`, title: `Page ${s}/${i}`, createdDateTime: new Date(Date.UTC(2020, 0, 1 + i)).toISOString(), lastModifiedDateTime: new Date(Date.UTC(2021, 0, 1 + i)).toISOString(), level: 0, order: i }));
  }
  return F;
};

const fakeMs = async (ctx, FIX, opt) => {
  const S = { authorize: [], token: [], tokN: 0, minTok: 1, fly: 0, maxFly: 0, thrMaxFly: 0, last429: 0, n429: 0, contentN: 0, contentReq: [], ok: 0, refreshes: 0 };
  S.opt = opt;
  await ctx.route('https://login.microsoftonline.com/**', async (r) => {
    const u = new URL(r.request().url());
    if (/\/authorize$/.test(u.pathname)) {
      S.authorize.push({ q: Object.fromEntries(u.searchParams) });
      return r.fulfill({ status: 302, headers: { location: `${u.searchParams.get('redirect_uri')}?code=FAKECODE${S.authorize.length}&state=${encodeURIComponent(u.searchParams.get('state'))}` }, body: '' });
    }
    if (/\/token$/.test(u.pathname)) {
      const h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST' };
      if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: h });
      const b = Object.fromEntries(new URLSearchParams(r.request().postData() || ''));
      S.token.push(b);
      if (b.grant_type === 'refresh_token') {
        S.refreshes++;
        if (opt.failRefresh || !/^FAKE-REFRESH-SECRET-/.test(b.refresh_token || '')) return r.fulfill({ status: 400, headers: { ...h, 'content-type': 'application/json' }, body: JSON.stringify({ error: 'invalid_grant', error_description: 'the refresh token has expired' }) });
      }
      S.tokN++;
      return r.fulfill({ status: 200, headers: { ...h, 'content-type': 'application/json' }, body: JSON.stringify({ access_token: 'FAKE-TOKEN-SECRET-' + S.tokN, refresh_token: 'FAKE-REFRESH-SECRET-' + S.tokN, token_type: 'Bearer', expires_in: opt.expiresIn || 3600, scope: 'Notes.Read offline_access' }) });
    }
    return r.fulfill({ status: 404, body: '' });
  });
  await ctx.route('https://graph.microsoft.com/**', async (r) => {
    const req = r.request(), u = new URL(req.url());
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET', 'access-control-expose-headers': 'Retry-After' };
    if (req.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors });
    const p = u.pathname.replace('/v1.0/me/onenote', '');
    const m0 = /^\/pages\/([^/]+)\/content$/.exec(p);
    /* concurrency: a request that STARTS more than 400 ms after a 429 was answered (the earlier ones have finished by then) while others are still in flight */
    if (S.last429 && Date.now() - S.last429 > 400) S.thrMaxFly = Math.max(S.thrMaxFly, S.fly + 1);
    S.fly++; S.maxFly = Math.max(S.maxFly, S.fly);
    const done = () => { S.fly--; };
    await sleep(opt.latency || 20);
    const tn = +((/^Bearer FAKE-TOKEN-SECRET-(\d+)$/.exec(req.headers()['authorization'] || '') || [])[1] || 0);
    if (!tn || tn < S.minTok) { done(); return r.fulfill({ status: 401, headers: cors, body: '{}' }); }
    const json = (o) => { done(); return r.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(o) }); };
    let m;
    if (p === '/notebooks') return json({ value: FIX.notebooks });
    if ((m = /^\/notebooks\/([^/]+)\/sections$/.exec(p))) return json({ value: FIX.nbSecs[m[1]] || [] });
    if (/\/sectionGroups$/.test(p)) return json({ value: [] });
    if ((m = /^\/sections\/([^/]+)\/pages$/.exec(p))) {
      const all = FIX.pages[m[1]] || [], from = +(u.searchParams.get('$skiptoken') || 0), slice = all.slice(from, from + FIX.pageSize), o = { value: slice };
      if (from + FIX.pageSize < all.length) { const nu = new URL(`${G}/sections/${m[1]}/pages`); u.searchParams.forEach((v, k) => nu.searchParams.set(k, v)); nu.searchParams.set('$skiptoken', String(from + FIX.pageSize)); o['@odata.nextLink'] = nu.href; }
      return json(o);
    }
    if (m0) {
      const id = m0[1]; S.contentN++; S.contentReq.push(id);
      if (opt.revokeAt && S.contentN === opt.revokeAt) { S.minTok = S.tokN + 1; done(); return r.fulfill({ status: 401, headers: cors, body: '{}' }); }
      if (opt.net && opt.net.includes(id)) { done(); return r.abort('failed'); }
      if (opt.status && opt.status[id] && !(opt.statusOnce && S.contentReq.filter((x) => x === id).length > 1 && opt.statusOnce.includes(id))) { done(); return r.fulfill({ status: opt.status[id], headers: cors, body: '{}' }); }
      const throttle = (opt.throttleFirst && S.contentN <= opt.throttleFirst) || (opt.every && S.contentN % opt.every === 0);
      if (throttle) {
        S.last429 = Date.now(); S.n429++; done();
        return r.fulfill({ status: 429, headers: opt.noRetryAfter ? cors : { ...cors, 'retry-after': String(opt.retryAfter || 1) }, body: '{}' });
      }
      S.ok++; done();
      return r.fulfill({ status: 200, headers: { ...cors, 'content-type': 'text/html' }, body: body(id) });
    }
    done(); return r.fulfill({ status: 404, headers: cors, body: '' });
  });
  return S;
};

const dev = async (vp, cfg = {}) => {
  const cloud = makeCloud(); const d = await addDevice(browser, srv.base, cloud, 'D' + vp.name, { width: vp.w, height: vp.h }, vp.touch, seedDB(T0), cfg.dev || {});
  d.cloud = cloud; d.FIX = makeFix(cfg.pages || 40, cfg.secs || 1); d.ms = await fakeMs(d.ctx, d.FIX, cfg.ms || {});
  return d;
};
const act = (d, vp, sel, opt) => (vp.touch ? d.page.locator(sel, opt).first().tap() : d.page.locator(sel, opt).first().click());
const each = async (id, fn, vps, cfg = {}) => {
  for (const vp of vps) {
    let d = null;
    try { d = await dev(vp, cfg); d.page.setDefaultTimeout(30000); await sleep(800); await fn(d, vp); }
    catch (e) { check(false, `${id}@${vp.name} threw: ${String(e && e.message || e).split('\n')[0]}`); }
    finally { if (d) await d.ctx.close(); }
  }
};
const noErr = (d, tag) => { const e = d.errors.filter((x) => !/Failed to load resource/.test(x)); check(e.length === 0, `${tag} no page errors`, e.slice(0, 2).join(' · ')); };
const ready = async (d) => { const ok = await d.page.waitForFunction(() => _s2RefsOk(), null, { timeout: 20000 }).then(() => true).catch(() => false); if (!ok) await on(d, () => { window._s2RefsOk = () => true; }); };
const dlg = async (d, vp) => {
  await act(d, vp, '#sb-tools-btn'); await sleep(300);
  await act(d, vp, '#sb-tools .sb-mi', { hasText: 'OneNote import' });
  await d.page.waitForSelector('#on-modal.open #on-box');
};
const isOpen = (d) => on(d, () => { const m = document.getElementById('on-modal'); return !!m && m.classList.contains('open'); });
const look = async (d, vp, to = 120000) => {
  if (!(await isOpen(d))) await dlg(d, vp); else await on(d, () => { _on.view = 'setup'; _onPaint(); });
  await d.page.fill('#on-cid', CID);
  await act(d, vp, '#on-signin');
  await d.page.waitForSelector('#on-totals', { timeout: to });
};
const IDLE = () => !_on.imp.run && ['done', 'capped', 'paused', 'signin'].includes(_on.imp.state);
const start = async (d, vp, to) => { await look(d, vp, to); await act(d, vp, '#on-bring'); };
const finish = (d, to = 300000) => d.page.waitForFunction(IDLE, null, { timeout: to });
const ones = (d) => on(d, () => DB.articles.filter((a) => a.fromOneNote).length);
const dumpAll = (d) => on(d, async () => {
  const out = [JSON.stringify(Object.assign({}, localStorage)), JSON.stringify(sessionStorage), JSON.stringify(DB)];
  for (const i of (indexedDB.databases ? await indexedDB.databases() : [])) {
    await new Promise((res) => {
      const q = indexedDB.open(i.name);
      q.onerror = () => res();
      q.onsuccess = () => {
        const db = q.result; const names = [...db.objectStoreNames];
        if (!names.length) { db.close(); return res(); }
        const tx = db.transaction(names, 'readonly'); let left = names.length;
        names.forEach((n) => { const st = tx.objectStore(n), rq = st.getAll(); rq.onsuccess = () => { try { out.push(i.name + '/' + n + JSON.stringify(rq.result, (k, v) => (v instanceof Blob ? '[blob]' : v))); } catch (e) {} if (--left === 0) { db.close(); res(); } }; });
      };
    });
  }
  out.push(_cleanExportRoot());   /* the Save File copy */
  return out.join('\n');
});
const SECRET = /FAKE-(TOKEN|REFRESH)-SECRET/;
const slowRe = /Microsoft asked Siyagah to slow down — waiting \d+ s \(page [\d,]+ of [\d,]+\)/;

try {
  /* ══ 143a — sustained 429 ══ */
  if (want('143a')) {
    await each('143a', async (d, vp) => {
      const t = `143a@${vp.name}`;
      await ready(d);
      await start(d, vp);
      const line = await d.page.waitForFunction(() => { const x = (document.getElementById('on-iprog') || {}).textContent || ''; return /slow down/.test(x) ? x : false; }, null, { timeout: 30000, polling: 40 }).then((h) => h.jsonValue()).catch(() => '');
      check(slowRe.test(line), `${t} the status line says “${line}”`, line);
      await finish(d);
      const r = await on(d, () => ({ s: _on.imp.state, took: _on.imp.took, broken: _on.imp.broken, thr: window.__onThrFly, fly: window.__onMaxFly, failed: _on.imp.failed.length }));
      check(r.s === 'done' && r.took === 40 && r.broken === 0 && r.failed === 0 && (await ones(d)) === 40, `${t} all 40 pages came in; none was given up after 30 throttled answers`, JSON.stringify(r));
      check(d.ms.n429 === 30 && d.ms.thrMaxFly <= 1 && r.thr <= 1, `${t} one request in flight while throttled (Microsoft saw ${d.ms.thrMaxFly}, the app ${r.thr}); 30 × 429 answered`, JSON.stringify({ n429: d.ms.n429, thr: d.ms.thrMaxFly, app: r.thr }));
      noErr(d, t);
    }, [VPS[2], VPS[0]], { pages: 40, ms: { throttleFirst: 30, retryAfter: 1 } });

    /* backoff without Retry-After: 5 → 10 → 20 → 60 (shortened in the page by a hook) and Pause mid-wait */
    await each('143a2', async (d, vp) => {
      const t = `143a2@${vp.name}`;
      await ready(d);
      await start(d, vp);
      await d.page.waitForFunction(() => /slow down/.test((document.getElementById('on-iprog') || {}).textContent || ''), null, { timeout: 30000, polling: 40 });
      const g = await on(d, () => { const p = document.getElementById('on-iprog'), b = document.getElementById('on-pause'), r = b.getBoundingClientRect(); return { sw: p.scrollWidth, cw: p.clientWidth, right: r.right, bottom: r.bottom, vw: innerWidth, vh: innerHeight, txt: p.textContent }; });
      check(g.sw <= g.cw + 1 && g.right <= g.vw && g.bottom <= g.vh && /waiting \d+ s \(page/.test(g.txt), `${t} the slow-down line wraps (${g.sw}/${g.cw}) and the Pause button is on screen`, JSON.stringify(g));
      const t0 = Date.now();
      await act(d, vp, '#on-pause');
      await finish(d, 20000);
      const dt = Date.now() - t0, s = await on(d, () => ({ s: _on.imp.state, b: _on.imp.broken, slow: _on.slow }));
      check(s.s === 'paused' && s.b === 0 && dt < 5000, `${t} Pause worked in the middle of a 20 s wait (paused after ${dt} ms, nothing counted as failed)`, JSON.stringify(s));
      /* with no Retry-After header the wait grows 5 → 10 → 20 → 60 s */
      const W = await on(d, () => ({ w: _ON_WAITS.slice() }));
      check(JSON.stringify(W.w) === '[5,10,20,60]', `${t} without Retry-After the waits are 5 → 10 → 20 → 60 s`, JSON.stringify(W));
      noErr(d, t);
    }, [VPS[2], VPS[0]], { pages: 40, ms: { throttleFirst: 100000, retryAfter: 20 } });
  }

  /* ══ 143b — the token expires mid-import ══ */
  if (want('143b')) {
    const run = async (label, ms, fn) => each(label, async (d, vp) => { await ready(d); await fn(d, vp); }, [VPS[2]], { pages: 120, ms: { latency: 60, ...ms } });
    await run('143b1', {}, async (d, vp) => {
      const t = '143b1@1440';
      await start(d, vp);
      await d.page.waitForFunction(() => DB.articles.filter((a) => a.fromOneNote).length >= 25, null, { timeout: 60000, polling: 40 });
      await on(d, () => { _on.exp = Date.now() + 100; });   /* about to expire: renewed BEFORE it does */
      await finish(d);
      const r = await on(d, () => ({ s: _on.imp.state, took: _on.imp.took }));
      const rt = d.ms.token.filter((b) => b.grant_type === 'refresh_token');
      check(r.s === 'done' && r.took === 120 && (await ones(d)) === 120, `${t} the import finished: 120 pages, no sign-in prompt`, JSON.stringify(r));
      check(rt.length >= 1 && /^FAKE-REFRESH-SECRET-/.test(rt[0].refresh_token) && rt[0].client_id === CID && !('client_secret' in rt[0]) && rt[0].scope === 'Notes.Read offline_access' && d.ms.authorize.length === 1, `${t} the refresh grant renewed it (${rt.length}×) with no second sign-in`, JSON.stringify(rt[0]));
      check(!SECRET.test(await dumpAll(d)), `${t} neither token is in DB, localStorage, any IndexedDB database or the Save File copy`);
      check(await on(d, () => !!_on.rt && typeof _on.rt === 'string'), `${t} the refresh token is held in memory (_on.rt)`);
      noErr(d, t);
    });
    await run('143b2', { revokeAt: 40 }, async (d, vp) => {
      const t = '143b2@1440';
      await start(d, vp);
      await finish(d);
      const r = await on(d, () => ({ s: _on.imp.state, took: _on.imp.took }));
      const rt = d.ms.token.filter((b) => b.grant_type === 'refresh_token');
      check(r.s === 'done' && r.took === 120 && rt.length === 1 && d.ms.authorize.length === 1, `${t} the server revoked the token (401): the refresh grant renewed it once and the import finished (${rt.length} refresh, ${d.ms.authorize.length} sign-in)`, JSON.stringify({ r, n: rt.length }));
      noErr(d, t);
    });
    await run('143b3', { revokeAt: 40, failRefresh: true }, async (d, vp) => {
      const t = '143b3@1440';
      await start(d, vp);
      await finish(d);
      const r = await on(d, () => ({ s: _on.imp.state, txt: (document.getElementById('on-resignin') || {}).textContent, n: DB.articles.filter((a) => a.fromOneNote).length, rt: _on.rt }));
      check(r.s === 'signin' && /Sign in again to continue/.test(r.txt || '') && r.rt === '' && r.n >= 30, `${t} a failing refresh shows “Sign in again to continue” (${r.n} pages already in)`, JSON.stringify(r));
      d.ms.opt.failRefresh = false; d.ms.minTok = 1;
      await act(d, vp, '#on-signin');
      await finish(d);
      const r2 = await on(d, () => ({ s: _on.imp.state, n: DB.articles.filter((a) => a.fromOneNote).length, ids: new Set(DB.articles.filter((a) => a.fromOneNote).map((a) => a.id)).size }));
      check(r2.s === 'done' && r2.n === 120 && r2.ids === 120, `${t} after signing in again it carried on where it stopped: ${r2.n} pages, no duplicate`, JSON.stringify(r2));
      noErr(d, t);
    });
  }

  /* ══ 143c — saved every 25 ══ */
  if (want('143c')) await each('143c', async (d, vp) => {
    const t = '143c@1440';
    await ready(d);
    await on(d, () => { window.__steps = []; let last = 0; setInterval(() => { const n = DB.articles.filter((a) => a.fromOneNote).length; if (n !== last) { window.__steps.push(n - last); last = n; } }, 10); });
    await start(d, vp);
    await d.page.waitForFunction(() => DB.articles.filter((a) => a.fromOneNote).length >= 75, null, { timeout: 120000, polling: 20 });
    const steps = await on(d, () => window.__steps.slice());
    check(steps.length >= 3 && steps.every((x) => x === 25) && steps[0] === 25, `${t} pages arrive in DB 25 at a time (${steps.join(', ')})`, JSON.stringify(steps));
    await sleep(600);
    const pg = d.page, ctx = d.ctx;
    await pg.close({ runBeforeUnload: false });   /* the run is killed */
    const p2 = await ctx.newPage(); const errs = [];
    p2.on('pageerror', (e) => errs.push(String(e)));
    await p2.goto(srv.base + '/', { waitUntil: 'domcontentloaded' });
    await p2.waitForFunction(() => window.__appBooted === true, null, { timeout: 30000 });
    const n = await p2.evaluate(() => DB.articles.filter((a) => a.fromOneNote).length);
    check(n >= 50, `${t} the run was killed: ${n} pages are in the device copy after a restart (at least 50)`, String(n));
  }, [VPS[2]], { pages: 200, ms: { latency: 40 } });

  /* ══ 143d — reasons ══ */
  if (want('143d')) await each('143d', async (d, vp) => {
    const t = `143d@${vp.name}`;
    await ready(d);
    await start(d, vp);
    await finish(d);
    const f = await on(d, () => ({ s: _on.imp.state, failed: _on.imp.failed.map((x) => [x.title, x.why]), took: _on.imp.took }));
    check(f.s === 'done' && f.took === 30 - 7 && f.failed.length === 7 && f.failed.every((x) => x[0] && x[1]), `${t} 23 pages in; 7 not read, each with a title and a reason`, JSON.stringify(f));
    const whys = [...new Set(f.failed.map((x) => x[1]))].sort();
    check(whys.length === 3 && whys.includes('network') && whys.some((w) => /refused this page \(HTTP 403\)/.test(w)) && whys.some((w) => /\(HTTP 500\)/.test(w)), `${t} reasons: ${whys.join(' | ')}`, JSON.stringify(whys));
    const g = await on(d, () => {
      const box = document.getElementById('on-box'), b = box.getBoundingClientRect(), gs = [...document.querySelectorAll('#on-why .on-why-g')];
      const over = [...box.querySelectorAll('*')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1); }).length;
      return { n: gs.length, sums: gs.map((x) => x.querySelector('summary').textContent), open: gs.map((x) => x.open), vis: gs.map((x) => { const l = x.querySelector('li'); return l && l.getBoundingClientRect().height; }), bw: b.width, vw: innerWidth, sw: box.scrollWidth, cw: box.clientWidth, over, bottom: b.bottom, vh: innerHeight };
    });
    check(g.n === 3 && g.open.every((x) => !x) && g.vis.every((h) => !h) && /^\d+ pages? — /.test(g.sums[0]), `${t} grouped by reason, one folded line each: ${g.sums.join(' · ')}`, JSON.stringify(g));
    await act(d, vp, '#on-why .on-why-g summary');
    const g2 = await on(d, () => { const x = document.querySelector('#on-why .on-why-g'); const l = x.querySelector('li'); return { open: x.open, h: l.getBoundingClientRect().height, txt: l.textContent }; });
    check(g2.open && g2.h > 0 && /^Page /.test(g2.txt), `${t} tapping a reason shows the titles under it (“${g2.txt}”)`, JSON.stringify(g2));
    const g3 = await on(d, () => { const box = document.getElementById('on-box'), r = box.getBoundingClientRect(); const over = [...box.querySelectorAll('*')].filter((e) => { const q = e.getBoundingClientRect(); return q.width > 0 && (q.right > innerWidth + 1 || q.left < -1); }).length; return { over, sw: box.scrollWidth, cw: box.clientWidth, right: r.right, vw: innerWidth, sheet: innerWidth < 640 ? Math.abs(r.width - innerWidth) < 2 : r.width < innerWidth }; });
    check(g3.over === 0 && g3.sw <= g3.cw + 1 && g3.right <= g3.vw + 1 && g3.sheet, `${t} nothing off screen; ${vp.w < 640 ? 'a bottom sheet' : 'a dialog'} (${g3.sw}/${g3.cw})`, JSON.stringify(g3));
    /* the next run tries them again */
    d.ms.opt.status = {}; d.ms.opt.net = [];
    const before = d.ms.contentReq.length;
    await on(d, () => { _on.view = 'done'; _on.imp.state = 'idle'; _onPaint(); });
    await act(d, vp, '#on-bring');
    await finish(d);
    const again = d.ms.contentReq.slice(before), r = await on(d, () => ({ s: _on.imp.state, took: _on.imp.took, n: DB.articles.filter((a) => a.fromOneNote).length }));
    check(again.length === 7 && r.took === 7 && r.n === 30, `${t} the next run tried exactly the 7 unread pages again and brought them in (${r.n} of 30)`, JSON.stringify({ again: again.length, r }));
    noErr(d, t);
  }, VPS, { pages: 30, ms: { status: { 'P1_3': 403, 'P1_4': 403, 'P1_9': 403, 'P1_11': 500, 'P1_12': 500 }, net: ['P1_20', 'P1_21'] } });

  /* ══ 143e — the typed client id survives every repaint ══ */
  if (want('143e')) await each('143e', async (d, vp) => {
    const t = `143e@${vp.name}`;
    await ready(d);
    await dlg(d, vp);
    let bad = 0, first = '';
    for (let i = 0; i < 20; i++) {
      await on(d, async (o) => { _on.tok = null; _on.rt = ''; _on.cid = ''; _on.cidTouched = false; _on.loaded = false; _on.view = 'setup'; _on.err = ''; await _onIdb('put', 'cfg', { cid: o, common: false }); _onPaint(); }, OLD);
      /* the async config read and the job read repaint the dialog while the id is being typed */
      await on(d, () => { _onLoadCfg().then(() => _onPaint()); _onJobGet().then(() => _onPaint()); setTimeout(_onPaint, 5); setTimeout(_onPaint, 30); });
      await d.page.fill('#on-cid', CID);
      await on(d, () => { _onPaint(); });
      const n0 = d.ms.authorize.length;
      await act(d, vp, '#on-signin');
      const ok = await d.page.waitForFunction((n) => _on.view === 'reading' || _on.view === 'done' || !!_on.err || _on.view === 'signing' || _on.view === 'import', null, { timeout: 20000 }).then(() => true).catch(() => false);
      await d.page.waitForFunction(() => _on.view === 'done' || !!_on.err, null, { timeout: 30000 }).catch(() => {});
      const s = await on(d, () => ({ err: _on.err, cid: _on.cid, v: _on.view }));
      const au = d.ms.authorize[n0];
      if (!(ok && !s.err && s.cid === CID && au && au.q.client_id === CID)) { bad++; if (!first) first = JSON.stringify({ i, s, au: au && au.q.client_id }); }
      await on(d, () => { _onAgain(); });
    }
    check(bad === 0, `${t} the typed client id survived 20 repaints/async reads and reached Microsoft every time (${bad} bad)`, first);
    noErr(d, t);
  }, [VPS[2], VPS[0]], { pages: 2 });

  /* ══ 143f — 2,722 pages ══ */
  if (want('143f')) await each('143f', async (d, vp) => {
    const t = `143f@${vp.name}`;
    await ready(d);
    const cdp = await d.ctx.newCDPSession(d.page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await on(d, () => { window.__lt = []; try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(e.duration))).observe({ entryTypes: ['longtask'] }); } catch (e) {} window.__enxCap = 10000; });
    const t0 = Date.now();
    await look(d, vp, 600000);
    const mxLook = await on(d, () => Math.max(0, ...window.__lt)); await on(d, () => { window.__lt.length = 0; });
    await act(d, vp, '#on-bring');
    await finish(d, 1500000);
    const r = await on(d, () => ({ s: _on.imp.state, n: DB.articles.filter((a) => a.fromOneNote).length, mx: Math.max(0, ...window.__lt), thr: window.__onThrFly, failed: _on.imp.failed.length }));
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    console.log(`  note  ${t}: ${((Date.now() - t0) / 1000).toFixed(0)} s in all · ${d.ms.n429} throttled answers · longest task while importing ${Math.round(r.mx)} ms, while looking ${Math.round(mxLook)} ms`);
    check(r.s === 'done' && r.n === 2722 && r.failed === 0, `${t} all 2,722 pages in with ${d.ms.n429} intermittent 429s, none given up`, JSON.stringify(r));
    check(d.ms.thrMaxFly <= 1 && r.thr <= 1, `${t} one request in flight while throttled`, JSON.stringify({ ms: d.ms.thrMaxFly, app: r.thr }));
    const lim = hostLimit(200);
    check(r.mx <= lim.ms && mxLook <= lim.ms, `${t} longest task ${Math.round(Math.max(r.mx, mxLook))} ms (limit ${lim.text})`);
    noErr(d, t);
  }, [VPS[0]], { pages: 2722, secs: 6, ms: { every: 150, retryAfter: 1, latency: 10 } });
} finally {
  await browser.close(); await srv.close();
}
const bad = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - bad}/${results.length} passed${bad ? ', ' + bad + ' FAILED' : ''}`);
process.exit(bad ? 1 : 0);
