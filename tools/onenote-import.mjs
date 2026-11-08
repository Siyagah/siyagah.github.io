#!/usr/bin/env node
/* tools/onenote-import.mjs — v05.78, J110 ② (block 137): the 📥 OneNote import (straight from Microsoft Graph, the owner's own sign-in).

   A FAKE Microsoft: login.microsoftonline.com (authorize → 302 back with ?code&state, token endpoint) and graph.microsoft.com (notebooks, section groups, sections,
   pages with @odata.nextLink, page content with a picture, a missing picture, an attachment, a <script> and an onerror, one 429 with Retry-After: 1, one page whose
   content fails with 500, one 401 once).
   137a  a real tap on 🧰 → 📥 OneNote import opens the dialog at 390 / 820 / 1440 (a bottom sheet on a phone); opening it creates no database
   137b  the sign-in: popup, PKCE (code_challenge = S256 of the verifier), no secret; the token is in no storage; the client id only in siyagah-onenote-v1
   137c  the look: counts exact, a tick per notebook, and NOTHING is written
   137d  the import: folders, notes, dates, levels, order, cleaned content, pictures by reference, files, a left-out picture, a failing page, 429 waited, ≤ 4 in flight
   137e  the card and read line, indent of a sub-page, Smart View (16); a second run adds nothing; Trash and tombstones block a re-add
   137f  the shared daily limit counts Keep and Evernote notes too, and a later day carries on
   137g  the token expires mid-import: "Sign in again to continue", then it carries on where it stopped
   137h  the popup-landing boot (fake opener) writes nothing and sends nothing
   137i  scale: 1,500 pages at 390 ×4 CPU
   `--only=137c,137e`. */
import { playwright, serve, seedDB, hostLimit } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, check, results } from './s1-fake.mjs';
import { createHash } from 'node:crypto';

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
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const PDF = Buffer.from('%PDF-1.4 fake attachment bytes 0123456789');
const b64u = (b) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/* ── the fake Graph ── */
const R = (id) => `${G}/resources/${id}/$value`;
const page = (id, title, c, m, level, order, body) => ({ id, title, createdDateTime: c, lastModifiedDateTime: m, level, order, body });
const html = (inner) => `<html><head><title>x</title><meta name="created" content="2020-01-01"/></head><body data-absolute-enabled="true"><div id="div:{1}" data-id="_default" style="position:absolute;left:48px;top:120px;width:624px;font-size:11pt"><p id="p:{a}" style="margin-top:0pt;color:#336699">${inner}</p></div></body></html>`;
const makeGraph = () => {
  const FIX = {
    notebooks: [{ id: 'NB1', displayName: 'Work' }, { id: 'NB2', displayName: 'Home' }],
    nbSecs: { NB1: [{ id: 'S1', displayName: 'Meetings' }], NB2: [{ id: 'S4', displayName: 'Recipes' }] },
    nbGroups: { NB1: [{ id: 'G1', displayName: 'Projects' }], NB2: [] },
    grpSecs: { G1: [{ id: 'S2', displayName: 'Alpha' }], G2: [{ id: 'S3', displayName: 'Archive' }] },
    grpGroups: { G1: [{ id: 'G2', displayName: 'Old' }], G2: [] },
    pages: {
      S1: [
        page('P1', 'First page', '2020-01-02T03:04:05Z', '2021-02-03T04:05:06Z', 0, 0, html('Hello <b>world</b>')),
        page('P2', 'A sub-page', '2020-02-02T03:04:05Z', '2021-03-03T04:05:06Z', 1, 1, html('Child text')),
        page('P3', 'Rich page', '2019-05-06T07:08:09Z', '2019-06-07T08:09:10Z', 0, 2,
          html(`<span>Rich</span><img src="${R('RIMG')}" data-src-type="image/png" data-fullres-src="${R('RIMGF')}" data-fullres-src-type="image/png" width="1" height="1" alt="Chart" />`
            + `<img src="${R('RGONE')}" alt="Missing pic" /><object data-attachment="notes.pdf" data="${R('RPDF')}" type="application/pdf" />`
            + `<script>window.__onx=1</script><div onerror="window.__onx=2" onclick="window.__onx=3">clean me</div><a href="javascript:alert(1)">bad</a>`)),
        page('P4', 'Broken page', '2018-01-01T00:00:00Z', '2018-01-02T00:00:00Z', 0, 3, 'FAIL500'),
        page('P5', 'Slow page', '2018-03-01T00:00:00Z', '2018-03-02T00:00:00Z', 0, 4, html('After a 429')),
      ],
      S2: [page('P6', 'Alpha one', '2021-01-01T00:00:00Z', '2021-01-02T00:00:00Z', 0, 0, html('A1')), page('P7', 'Alpha two', '2021-01-03T00:00:00Z', '2021-01-04T00:00:00Z', 2, 1, html('A2'))],
      S3: [page('P8', 'Old archive', '2015-01-01T00:00:00Z', '2015-01-02T00:00:00Z', 0, 0, html('Archived text'))],
      S4: [page('P9', 'Soup', '2022-01-01T00:00:00Z', '2022-01-02T00:00:00Z', 0, 0, html('Soup recipe')), page('P10', 'Bread', '2022-02-01T00:00:00Z', '2022-02-02T00:00:00Z', 0, 1, html('Bread recipe'))],
    },
    pageSize: 3,
  };
  return FIX;
};

/* routes for one context; returns the state the checks read */
const fakeMs = async (ctx, FIX, opt = {}) => {
  const S = { authorize: [], token: [], graph: [], auth: new Set(), fly: 0, maxFly: 0, got429: 0, p5: 0, expired: 0, tokN: 0, contentReq: [] };
  await ctx.route('https://login.microsoftonline.com/**', async (r) => {
    const u = new URL(r.request().url());
    if (/\/authorize$/.test(u.pathname)) {
      S.authorize.push({ path: u.pathname, q: Object.fromEntries(u.searchParams) });
      const ru = u.searchParams.get('redirect_uri'), st = u.searchParams.get('state');
      return r.fulfill({ status: 302, headers: { location: `${ru}?code=FAKECODE${S.authorize.length}&state=${encodeURIComponent(st)}` }, body: '' });
    }
    if (/\/token$/.test(u.pathname)) {
      const h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST' };
      if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: h });
      S.token.push({ path: u.pathname, body: Object.fromEntries(new URLSearchParams(r.request().postData() || '')) });
      S.tokN++;
      return r.fulfill({ status: 200, headers: { ...h, 'content-type': 'application/json' }, body: JSON.stringify({ access_token: 'FAKE-TOKEN-SECRET-' + S.tokN, token_type: 'Bearer', expires_in: opt.expiresIn || 3600, scope: 'Notes.Read' }) });
    }
    return r.fulfill({ status: 404, body: '' });
  });
  await ctx.route('https://graph.microsoft.com/**', async (r) => {
    const req = r.request(), u = new URL(req.url());
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET', 'access-control-expose-headers': 'Retry-After' };
    if (req.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors });
    const auth = req.headers()['authorization'] || '';
    S.auth.add(auth);
    S.fly++; S.maxFly = Math.max(S.maxFly, S.fly);
    const done = () => { S.fly--; };
    await sleep(25);   /* a request takes a moment, so in-flight requests really overlap and the count means something */
    const json = (o) => { done(); return r.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(o) }); };
    const p = u.pathname.replace('/v1.0/me/onenote', '');
    S.graph.push(p + (u.search ? '?' + decodeURIComponent(u.searchParams.toString()).slice(0, 200) : ''));
    if (!/^Bearer FAKE-TOKEN-SECRET-/.test(auth)) { done(); return r.fulfill({ status: 401, headers: cors, body: '{}' }); }
    let m;
    if (p === '/notebooks') return json({ value: FIX.notebooks });
    if ((m = /^\/notebooks\/([^/]+)\/sections$/.exec(p))) return json({ value: FIX.nbSecs[m[1]] || [] });
    if ((m = /^\/notebooks\/([^/]+)\/sectionGroups$/.exec(p))) return json({ value: FIX.nbGroups[m[1]] || [] });
    if ((m = /^\/sectionGroups\/([^/]+)\/sections$/.exec(p))) return json({ value: FIX.grpSecs[m[1]] || [] });
    if ((m = /^\/sectionGroups\/([^/]+)\/sectionGroups$/.exec(p))) return json({ value: FIX.grpGroups[m[1]] || [] });
    if ((m = /^\/sections\/([^/]+)\/pages$/.exec(p))) {
      const all = FIX.pages[m[1]] || [], from = +(u.searchParams.get('$skiptoken') || 0), n = FIX.pageSize, slice = all.slice(from, from + n);
      const o = { value: slice.map(({ body, ...rest }) => rest) };
      if (from + n < all.length) { const nu = new URL(`${G}/sections/${m[1]}/pages`); u.searchParams.forEach((v, k) => nu.searchParams.set(k, v)); nu.searchParams.set('$skiptoken', String(from + n)); o['@odata.nextLink'] = nu.href; }   /* like Graph: the same query plus a token */
      return json(o);
    }
    if ((m = /^\/pages\/([^/]+)\/content$/.exec(p))) {
      S.contentReq.push(m[1]);
      const pg = Object.values(FIX.pages).flat().find((x) => x.id === m[1]);
      if (!pg) { done(); return r.fulfill({ status: 404, headers: cors, body: '' }); }
      if (pg.body === 'FAIL500') { done(); return r.fulfill({ status: 500, headers: cors, body: 'boom' }); }
      if (m[1] === 'P5' && !S.got429) { S.got429 = Date.now(); done(); return r.fulfill({ status: 429, headers: { ...cors, 'retry-after': '1' }, body: '{}' }); }
      if (m[1] === 'P5') S.p5 = Date.now() - S.got429;
      if (opt.expireOn === m[1] && !S.expired) { S.expired = 1; done(); return r.fulfill({ status: 401, headers: cors, body: '{}' }); }
      done(); return r.fulfill({ status: 200, headers: { ...cors, 'content-type': 'text/html' }, body: typeof pg.body === 'function' ? pg.body() : pg.body });
    }
    if ((m = /^\/resources\/([^/]+)\/\$value$/.exec(p))) {
      done();
      if (m[1] === 'RIMG' || m[1] === 'RIMGF') return r.fulfill({ status: 200, headers: { ...cors, 'content-type': 'image/png' }, body: PNG });
      if (m[1] === 'RPDF') return r.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/pdf' }, body: PDF });
      return r.fulfill({ status: 404, headers: cors, body: '' });
    }
    done(); return r.fulfill({ status: 404, headers: cors, body: '' });
  });
  return S;
};

const T0 = '2026-10-01T00:00:00.000Z';
const dev = async (vp, cfg = {}) => {
  const cloud = makeCloud(); const d = await addDevice(browser, srv.base, cloud, 'D' + vp.name, { width: vp.w, height: vp.h }, vp.touch, seedDB(T0), cfg.dev || {});
  d.cloud = cloud; d.FIX = makeGraph(); if (cfg.fix) cfg.fix(d.FIX);
  d.ms = await fakeMs(d.ctx, d.FIX, cfg.ms || {});
  return d;
};
const act = (d, vp, sel, opt) => (vp.touch ? d.page.locator(sel, opt).first().tap() : d.page.locator(sel, opt).first().click());
const each = async (id, fn, vps = VPS, cfg = {}) => {
  for (const vp of vps) {
    let d = null;
    try { d = await dev(vp, cfg); d.page.setDefaultTimeout(30000); await sleep(800); await fn(d, vp); }
    catch (e) { check(false, `${id}@${vp.name} threw: ${String(e && e.message || e).split('\n')[0]}`); }
    finally { if (d) await d.ctx.close(); }
  }
};
/* the browser logs every 4xx/5xx the FAKE Microsoft answers on purpose (the failing page, the missing picture, the 401) as a console error: those are expected */
const noErr = (d, tag) => { const e = d.errors.filter((x) => !/Failed to load resource: the server responded with a status of (401|404|429|500)/.test(x)); check(e.length === 0, `${tag} no page errors`, e.slice(0, 2).join(' · ')); };
const again = async (d, vp) => { await on(d, () => { openOneNoteImport(); _on.view = 'done'; _on.imp.state = 'idle'; _onPaint(); }); await act(d, vp, '#on-bring'); await d.page.waitForFunction(() => !_on.imp.run && ['done', 'capped', 'paused', 'signin'].includes(_on.imp.state), null, { timeout: 120000 }); };
const ready = async (d) => { const ok = await d.page.waitForFunction(() => _s2RefsOk(), null, { timeout: 20000 }).then(() => true).catch(() => false); if (!ok) await on(d, () => { window._s2RefsOk = () => true; }); };
const dlg = async (d, vp) => {
  await act(d, vp, '#sb-tools-btn'); await sleep(300);
  await act(d, vp, '#sb-tools .sb-mi', { hasText: 'OneNote import' });
  await d.page.waitForSelector('#on-modal.open #on-box');
};
const isOpen = (d) => on(d, () => { const m = document.getElementById('on-modal'); return !!m && m.classList.contains('open'); });
const signIn = async (d, vp) => {
  if (!(await isOpen(d))) await dlg(d, vp); else await on(d, () => { _on.view = 'setup'; _onPaint(); });
  await d.page.fill('#on-cid', CID);
  await act(d, vp, '#on-signin');
};
const look = async (d, vp, to = 60000) => { await signIn(d, vp); await totals(d, to); };
const totals = async (d, to = 60000) => {
  try { await d.page.waitForSelector('#on-totals', { timeout: to }); }
  catch (e) { const s = await on(d, () => ({ v: _on.view, err: _on.err, n: _on.n, cur: _on.cur })); throw new Error('the look did not finish: ' + JSON.stringify(s) + ' graph: ' + (d.ms.graph || []).slice(-4).join(' | ')); }
};
const bring = async (d, vp, to = 120000) => {
  if (!(await on(d, () => !!document.getElementById('on-bring')))) await look(d, vp, to);
  await act(d, vp, '#on-bring');
  await d.page.waitForFunction(() => !_on.imp.run && ['done', 'capped', 'paused', 'signin'].includes(_on.imp.state), null, { timeout: to });
};
const snap = (d) => on(d, () => JSON.stringify([DB.articles, DB.folders, DB.sections, DB.trash, DB.tombstones, DB.theme]));
const ones = (d) => on(d, () => DB.articles.filter((a) => a.fromOneNote).length);
const byId = (d, id) => on(d, (id) => { const a = DB.articles.find((x) => x.fromOneNote && x.fromOneNote.id === id); return a ? JSON.parse(JSON.stringify(a)) : null; }, id);
/* every byte the page can store: localStorage, every IndexedDB database (all stores), DB */
const dumpAll = (d) => on(d, async () => {
  const out = [JSON.stringify(Object.assign({}, localStorage)), JSON.stringify(DB)];
  const dbs = (indexedDB.databases ? await indexedDB.databases() : []);
  for (const i of dbs) {
    await new Promise((res) => {
      const q = indexedDB.open(i.name);
      q.onerror = () => res();
      q.onsuccess = () => {
        const db = q.result; const names = [...db.objectStoreNames];
        if (!names.length) { db.close(); return res(); }
        const tx = db.transaction(names, 'readonly'); let left = names.length;
        names.forEach((n) => {
          const st = tx.objectStore(n), rq = st.getAll(), kq = st.getAllKeys();
          rq.onsuccess = () => { kq.onsuccess = () => { try { out.push(i.name + '/' + n + ':' + JSON.stringify(kq.result) + JSON.stringify(rq.result, (k, v) => (v instanceof Blob ? '[blob]' : v))); } catch (e) {} if (--left === 0) { db.close(); res(); } }; };
        });
      };
    });
  }
  return out.join('\n');
});
const dbNames = (d) => on(d, async () => (await indexedDB.databases()).map((x) => x.name));

try {
  /* ══ 137a — the menu, the dialog ══ */
  if (want('137a')) await each('137a', async (d, vp) => {
    const t = `137a@${vp.name}`;
    await ready(d);
    const had = (await dbNames(d)).includes('siyagah-onenote-v1');
    await dlg(d, vp);
    await sleep(500);
    const sheet = await on(d, () => { const b = document.getElementById('on-box').getBoundingClientRect(); return { w: b.width, vw: innerWidth, bottom: Math.round(b.bottom), vh: innerHeight, cid: !!document.getElementById('on-cid'), btn: !!document.getElementById('on-signin'), how: !!document.getElementById('on-how'), steps: (document.getElementById('on-how') || {}).textContent || '' }; });
    check(sheet.cid && sheet.btn && sheet.how, `${t} (137a) the real tap on 🧰 → 📥 OneNote import opens the dialog with the client-id box, “Sign in with Microsoft” and “How to get this”`, JSON.stringify({ ...sheet, steps: '' }));
    check(/Single-page application/.test(sheet.steps) && /Notes\.Read/.test(sheet.steps) && sheet.steps.includes(srv.base + '/'), `${t} the steps name the SPA platform, the redirect address and Notes.Read`);
    if (vp.w < 640) check(sheet.w >= sheet.vw - 2 && sheet.bottom >= sheet.vh - 2, `${t} phone: a full-width bottom sheet (${Math.round(sheet.w)} of ${sheet.vw})`);
    else check(sheet.w <= 640, `${t} the dialog is a centred window (${Math.round(sheet.w)} px)`);
    check(!had && !(await dbNames(d)).includes('siyagah-onenote-v1'), `${t} opening the dialog (a read) creates no siyagah-onenote-v1 database`);
    check(await on(d, () => /laptop/.test(document.getElementById('on-box').textContent) && /tablet or phone/.test(document.getElementById('on-box').textContent)), `${t} the dialog says it is meant for the laptop but works on a tablet and phone`);
    noErr(d, t);
  });

  /* ══ 137b — the sign-in ══ */
  if (want('137b')) await each('137b', async (d, vp) => {
    const t = `137b@${vp.name}`;
    await ready(d);
    await dlg(d, vp);
    await d.page.fill('#on-cid', 'not-an-id');
    await act(d, vp, '#on-signin');
    check(await on(d, () => /does not look like an Application/.test((document.getElementById('on-err') || {}).textContent || '')) && d.ms.authorize.length === 0, `${t} a wrong client id is refused before any popup`);
    await d.page.fill('#on-cid', CID);
    await act(d, vp, '#on-signin');
    await d.page.waitForFunction(() => _on.tok, null, { timeout: 30000 });
    await sleep(300);
    const au = d.ms.authorize[0], tk = d.ms.token[0];
    check(au && au.path === '/consumers/oauth2/v2.0/authorize' && au.q.client_id === CID && au.q.response_type === 'code' && au.q.scope === 'Notes.Read' && au.q.code_challenge_method === 'S256' && au.q.redirect_uri === srv.base + '/', `${t} authorization-code request to /consumers with the client id, Notes.Read, S256 and the app's own address`, JSON.stringify(au));
    check(tk && tk.body.grant_type === 'authorization_code' && tk.body.client_id === CID && tk.body.code === 'FAKECODE1' && !('client_secret' in tk.body) && tk.body.redirect_uri === srv.base + '/' && !/offline_access/.test(tk.body.scope), `${t} the code is exchanged at the token endpoint with no secret and no offline_access`, JSON.stringify(tk));
    check(au && tk && b64u(createHash('sha256').update(tk.body.code_verifier).digest()) === au.q.code_challenge && tk.body.code_verifier.length >= 43, `${t} PKCE: code_challenge = base64url(SHA-256(code_verifier)), verifier ${tk && tk.body.code_verifier.length} chars`);
    check(au && /^siyon\./.test(au.q.state) && tk.body.code_verifier !== au.q.state, `${t} a random state is sent`);
    const inMem = await on(d, () => ({ tok: _on.tok, ver: _on.ver, signed: _on.view !== 'signing' }));
    check(/^FAKE-TOKEN-SECRET-1$/.test(inMem.tok) && inMem.ver === '' && inMem.signed, `${t} the token is held in memory (_on.tok), the verifier is dropped, the dialog moves on to the look`, JSON.stringify(inMem));
    const all = await dumpAll(d);
    check(!/FAKE-TOKEN-SECRET/.test(all) && !/FAKECODE/.test(all), `${t} the access token and the code are in no storage: localStorage, every IndexedDB database, DB`);
    const names = await dbNames(d);
    const cfg = await on(d, () => new Promise((res) => { const q = indexedDB.open('siyagah-onenote-v1'); q.onsuccess = () => { const db = q.result; const st = [...db.objectStoreNames]; const r = db.transaction('kv').objectStore('kv').getAll(); r.onsuccess = () => { db.close(); res({ st, v: r.result }); }; }; }));
    check(names.includes('siyagah-onenote-v1') && JSON.stringify(cfg.st) === '["kv"]' && JSON.stringify(cfg.v) === JSON.stringify([{ cid: CID, common: false }]), `${t} the client id is kept in siyagah-onenote-v1 (store kv) and nowhere else`, JSON.stringify(cfg));
    check(!(await on(d, () => JSON.stringify(DB).includes('11111111-2222') || JSON.stringify(Object.assign({}, localStorage)).includes('11111111-2222'))), `${t} the client id is not in DB or localStorage`);
    await sleep(500);
    check(await on(d, () => _on.popup === null), `${t} the popup was closed after the code arrived`);
    noErr(d, t);
  });

  /* ══ 137c — the look ══ */
  if (want('137c')) await each('137c', async (d, vp) => {
    const t = `137c@${vp.name}`;
    await ready(d);
    await dlg(d, vp);
    const before = await snap(d), ls = await on(d, () => JSON.stringify(Object.assign({}, localStorage)));
    const c0 = d.cloud.commits;
    await d.page.fill('#on-cid', CID);
    await act(d, vp, '#on-signin');
    await totals(d);
    const g =await on(d, () => { const m = {}; document.querySelectorAll('#on-totals dt').forEach((dt) => { m[dt.textContent] = dt.nextElementSibling.textContent; }); return { m, nbs: [...document.querySelectorAll('.on-nb')].map((x) => x.textContent), ticks: [...document.querySelectorAll('.on-nb-tick')].map((x) => x.checked) }; });
    check(g.m.Notebooks === '2' && g.m.Sections === '4' && g.m.Pages === '10' && g.m['Already in Siyagah'] === '0', `${t} counts: 2 notebooks, 4 sections (groups of any depth), 10 pages (nextLink followed), 0 already`, JSON.stringify(g.m));
    check(g.ticks.length === 2 && g.ticks.every(Boolean) && /Work — 3 sections · 8 pages/.test(g.nbs[0]) && /Home — 1 sections · 2 pages/.test(g.nbs[1]), `${t} a tick per notebook, all ticked, with sections/pages/already`, JSON.stringify(g.nbs));
    const pageReqs = d.ms.graph.filter((p) => /\/pages\?/.test(p));
    check(d.ms.graph.some((p) => p.includes('skiptoken')) && pageReqs.every((p) => /\$select=id,title,createdDateTime,lastModifiedDateTime,level,order/.test(p)), `${t} pages are listed with $select of only the needed fields, and the next page is followed`, pageReqs[0]);
    check(!d.ms.graph.some((p) => /\/content$/.test(p)), `${t} the look reads no page content`);
    const after = await snap(d), ls2 = await on(d, () => JSON.stringify(Object.assign({}, localStorage)));
    check(before === after && ls === ls2 && (await ones(d)) === 0, `${t} the look wrote nothing: notes, folders, sections, Trash, tombstones and settings are byte-identical, localStorage too`);
    check(await on(d, () => !DB.folders.some((f) => f.on) && /nothing has been added/.test(document.getElementById('on-dry').textContent)), `${t} no OneNote folder yet; the dry-run note is shown`);
    await sleep(800);
    check(d.cloud.commits === c0, `${t} no cloud write during the look (${c0} → ${d.cloud.commits})`);
    await act(d, vp, '.on-nb-tick >> nth=1');
    check(await on(d, () => _on.res.nbs[1].tick === false && /8 new pages/.test(document.getElementById('on-bringnote').textContent)), `${t} unticking a notebook changes what will be brought in (8 new pages)`);
    noErr(d, t);
  });

  /* ══ 137d + 137e — the import, the card, a second run ══ */
  if (want('137d') || want('137e')) await each('137d', async (d, vp) => {
    const t = `137d@${vp.name}`;
    await ready(d);
    const arts0 = await on(d, () => DB.articles.length);
    await look(d, vp);
    await act(d, vp, '#on-bring');
    const slow = await d.page.waitForFunction(() => /Microsoft asked us to slow down — waiting \d+ s/.test((document.getElementById('on-iprog') || {}).textContent || ''), null, { timeout: 30000, polling: 40 }).then(() => true).catch(() => false);
    await d.page.waitForFunction(() => !_on.imp.run && ['done', 'capped', 'paused', 'signin'].includes(_on.imp.state), null, { timeout: 120000 });
    const st = await on(d, () => ({ s: _on.imp.state, took: _on.imp.took, broken: _on.imp.broken, msg: (document.getElementById('on-idone') || {}).textContent, sum: (document.getElementById('on-isum') || {}).textContent, box: document.getElementById('on-box').textContent, left: _on.imp.left.slice(), failed: _on.imp.failed.slice(), fly: window.__onMaxFly }));
    check(st.s === 'done' && st.took === 9 && /My Notebooks ▸ OneNote \(Imported\)/.test(st.box), `${t} done: 9 of 10 pages brought in (one cannot be read); the message names “My Notebooks ▸ OneNote (Imported)”`, JSON.stringify({ s: st.s, took: st.took }));
    check(st.broken === 1 && st.failed[0] === 'Broken page' && /1 pages could not be read/.test(st.sum || '') && /Pages not read: Broken page/.test(st.sum || ''), `${t} the page whose content failed is counted and named; the others went on`, st.sum);
    check(!(await byId(d, 'P4')) && (await ones(d)) === 9, `${t} the failing page was NOT imported (so the next run tries it again)`);
    check(slow && d.ms.got429 > 0 && d.ms.p5 >= 900 && d.ms.contentReq.filter((x) => x === 'P5').length === 2, `${t} a 429 with Retry-After: 1 was waited (${d.ms.p5} ms), shown as “Microsoft asked us to slow down — waiting N s”, and that page retried`, JSON.stringify({ slow, p5: d.ms.p5, n: d.ms.contentReq.filter((x) => x === 'P5').length }));
    check(d.ms.maxFly <= 4 && st.fly <= 4 && d.ms.maxFly >= 2, `${t} never more than 4 requests in flight (Microsoft saw at most ${d.ms.maxFly}; the app counted ${st.fly})`);
    /* folders */
    const F = await on(d, () => { const m = {}; DB.folders.filter((f) => f.on).forEach((f) => { m[f.on.name] = { id: f.id, parentId: f.parentId, kind: f.on.kind, sec: f.sectionId, order: f.order }; }); return { m, sec: (DB.sections.find((s) => s.name === 'My Notebooks') || {}).id, n: DB.folders.filter((f) => f.on).length, other: DB.folders.filter((f) => !f.on).length }; });
    const root = F.m['OneNote (Imported)'];
    check(root && root.id === 'on-root' && root.parentId === null && root.sec === F.sec && root.kind === 'root', `${t} “OneNote (Imported)” (on-root) is a top folder of My Notebooks, marked on`, JSON.stringify(root));
    check(F.m.Work.parentId === 'on-root' && F.m.Work.kind === 'notebook' && F.m.Meetings.parentId === F.m.Work.id && F.m.Meetings.kind === 'section' && F.m.Projects.parentId === F.m.Work.id && F.m.Projects.kind === 'group', `${t} notebook ▸ section and notebook ▸ section group`, JSON.stringify(F.m));
    check(F.m.Alpha.parentId === F.m.Projects.id && F.m.Old.parentId === F.m.Projects.id && F.m.Archive.parentId === F.m.Old.id && F.m.Recipes.parentId === F.m.Home.id && F.n === 9, `${t} section groups of any depth: Projects ▸ Old ▸ Archive; 9 folders in all`, JSON.stringify(F.m));
    check(await on(d, () => DB.folders.filter((f) => f.on).every((f) => /^on-root$|^on-f-[0-9a-f]+$/.test(f.id)) && getHierNum('on-root') === '' && getHierNum(DB.folders.find((f) => f.on && f.on.name === 'Archive').id) === ''), `${t} folder ids are _enxId('on-f-', OneNote id); they are never auto-numbered`);
    check(await on(d, () => { const before = JSON.stringify(DB.folders.filter((f) => f.on).map((f) => [f.id, f.name, f.order])); autoNumberAll(); return before === JSON.stringify(DB.folders.filter((f) => f.on).map((f) => [f.id, f.name, f.order])); }), `${t} autoNumberAll leaves the OneNote folders alone`);
    check(await on(d, () => DB.folders.find((f) => f.on && f.on.name === 'Meetings').id === 'on-f-' + _enxH('S1', 0) + _enxH('S1', 7).slice(0, 6)), `${t} a section folder id is _enxId('on-f-', section id)`);
    /* notes */
    const p1 = await byId(d, 'P1'), p2 = await byId(d, 'P2'), p3 = await byId(d, 'P3'), p7 = await byId(d, 'P7'), p8 = await byId(d, 'P8');
    check(p1 && p1.id === (await on(d, () => _enxId('on-n-', 'P1'))) && p1.createdAt === '2020-01-02T03:04:05.000Z' && p1.updatedAt === '2021-02-03T04:05:06.000Z', `${t} id _enxId('on-n-', page id); createdAt = createdDateTime, updatedAt = lastModifiedDateTime`, p1 && p1.createdAt + ' ' + p1.updatedAt);
    check(p1.fromOneNote.nb === 'Work' && p1.fromOneNote.sec === 'Meetings' && p1.fromOneNote.created === p1.createdAt && p1.fromOneNote.edited === p1.updatedAt && p1.fromOneNote.level === 0 && p1.fromOneNote.at > T0, `${t} fromOneNote:{id,nb,sec,created,edited,level,at}`, JSON.stringify(p1.fromOneNote));
    check(p2.fromOneNote.level === 1 && p2.folderIds[0] === p1.folderIds[0] && p7.fromOneNote.level === 2, `${t} a sub-page stays in its section's folder with its level kept (1, 2)`);
    check(p1.title === 'First page' && p8.fromOneNote.sec === 'Archive' && p8.folderIds[0] === F.m.Archive.id && p1.folderIds[0] === F.m.Meetings.id, `${t} titles and folders: each page is in its section's folder`);
    const order = await on(d, () => DB.articles.filter((a) => a.fromOneNote && a.fromOneNote.sec === 'Meetings').map((a) => a.fromOneNote.id));
    check(JSON.stringify(order) === JSON.stringify(['P1', 'P2', 'P3', 'P5']), `${t} pages are added in OneNote's page order`, JSON.stringify(order));
    check(/<b>world<\/b>/.test(p1.content) && !/[;"]\s*(position|left|top|width)\s*:|data-absolute|\sid=|data-id/.test(p1.content) && /color:#336699/.test(p1.content), `${t} the page body is kept; absolute positioning and ids are dropped, other styles stay`, p1.content);
    check(!/<script|onerror|onclick|javascript:/i.test(p3.content) && /clean me/.test(p3.content) && (await on(d, () => window.__onx)) === undefined, `${t} a <script>, an onerror, an onclick and a javascript: link never reach a.content or run`, p3.content);
    const pic = await on(d, (c) => { const m = /<img class="ed-img" data-pic="([0-9a-f]{64})" data-mime="image\/png" alt="">/.exec(c); return m && { sha: m[1], known: _picKnown.has(m[1]), src: /src=/.test(c), data: /data:/.test(c) }; }, p3.content);
    check(pic && pic.known && !pic.src && !pic.data, `${t} the picture is by reference (data-pic, no src, held in the picture store; bytes fetched with the token)`, JSON.stringify(pic));
    check(await on(d, async ([sha, n]) => { const x = await _picGet(sha); return !!x && x.size === n; }, [pic.sha, PNG.length]), `${t} the picture bytes (${PNG.length}) are in the picture store`);
    const fl = await on(d, async (c) => { const m = /<span class="enx-file" contenteditable="false" data-file="([0-9a-f]{64})" data-mime="([^"]*)" data-name="([^"]*)">📎 /.exec(c); if (!m) return null; const r = await _fileGet(m[1]); return { mime: m[2], name: m[3], held: !!r, n: r && r.n }; }, p3.content);
    check(fl && fl.held && fl.name === 'notes.pdf' && fl.mime === 'application/pdf' && fl.n === PDF.length, `${t} the attachment is a file chip, bytes in siyagah-files-v1`, JSON.stringify(fl));
    check(/<p class="on-left">⚠ Left out \(could not be fetched from OneNote\): Missing pic<\/p>/.test(p3.content) && st.left.length === 1 && /Left out, could not be fetched: Missing pic/.test(st.sum || ''), `${t} a picture that fails is a plain line naming it, counted as left out; the page still imported`, p3.content);
    check(d.ms.auth.size >= 1 && [...d.ms.auth].every((a) => /^Bearer FAKE-TOKEN-SECRET-1$/.test(a)), `${t} every Graph request carried the token (and only Graph got it)`);
    const own = await on(d, () => DB.articles.filter((a) => !a.fromOneNote).every((a) => ['a1', 'a2', 'a3'].includes(a.id) && a.updatedAt === '2026-10-01T00:00:00.000Z') && DB.articles.length);
    check(own === arts0 + 9, `${t} (I1) the owner's own notes are untouched (${arts0} → ${own})`);
    check(!/FAKE-TOKEN-SECRET/.test(await dumpAll(d)), `${t} after the import the token is still in no storage`);
    noErr(d, t);

    /* 137e — the card, the read view, the Smart View */
    if (want('137e')) {
      const u = `137e@${vp.name}`;
      await on(d, () => { hideCtx(); closeModal(); closeOneNoteImport(); if (innerWidth < 1200) showPane('p2'); selFolder(DB.folders.find((f) => f.on && f.on.name === 'Meetings').id); });
      await d.page.waitForSelector('#p2 .ar .ar-on');
      const card = await on(d, () => {
        const a = DB.articles.find((x) => x.fromOneNote && x.fromOneNote.id === 'P1'), el = document.querySelector(`#p2 .ar[data-aid="${a.id}"] .ar-on`);
        const want = new Date(a.fromOneNote.created).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
        const s = DB.articles.find((x) => x.fromOneNote && x.fromOneNote.id === 'P2'), sc = document.querySelector(`#p2 .ar[data-aid="${s.id}"]`), pc = document.querySelector(`#p2 .ar[data-aid="${a.id}"]`);
        return { txt: el && el.textContent, want, subIndent: sc && sc.getBoundingClientRect().left - pc.getBoundingClientRect().left, subTxt: sc && sc.querySelector('.ar-on').textContent };
      });
      check(card.txt === `📥 OneNote · Work ▸ Meetings · created ${card.want}`, `${u} the card says “${card.txt}”`, card.want);
      check(Math.round(card.subIndent) === 14 && /sub-page/.test(card.subTxt), `${u} a sub-page (level 1) is drawn indented on its card (${Math.round(card.subIndent)} px) and says so`, JSON.stringify(card));
      await on(d, () => { selArt(DB.articles.find((x) => x.fromOneNote && x.fromOneNote.id === 'P1').id); });
      await d.page.waitForSelector('.av-on');
      const rv = await on(d, () => document.querySelector('.av-on').textContent);
      check(rv === card.txt, `${u} the read view says the same: “${rv}”`);
      await on(d, () => { const a = DB.articles.find((x) => x.fromOneNote && x.fromOneNote.id === 'P1'); a.content += '<p>edited</p>'; a.updatedAt = new Date().toISOString(); persist(); renderP2C && renderP2C(); });
      await sleep(300);
      check(await on(d, () => { const a = DB.articles.find((x) => x.fromOneNote && x.fromOneNote.id === 'P1'); const el = document.querySelector(`#p2 .ar[data-aid="${a.id}"] .ar-on`); return el && el.textContent; }) === card.txt, `${u} after the owner edits the page the line still says the original creation date`);
      const sv = await on(d, () => { const s = SF.find((x) => x.id === 'sf-onenote'); const l = getSmartArts('sf-onenote'); return { name: s && s.name, n: l.length, first: l[0].fromOneNote.id, last: l[l.length - 1].fromOneNote.id, cnt: _SF_CNT['sf-onenote'] ? DB.articles.filter(_SF_CNT['sf-onenote']).length : -1 }; });
      check(sv.name === '(16) From OneNote' && sv.n === 9 && sv.first === 'P10' && sv.last === 'P8' && sv.cnt === 9, `${u} Smart View “(16) From OneNote” lists 9 pages, newest created first (${sv.first} … ${sv.last})`, JSON.stringify(sv));
      /* a second run */
      const c1 = await ones(d), fold1 = await on(d, () => DB.folders.length);
      await again(d, vp);
      const r = await on(d, () => ({ n: DB.articles.filter((a) => a.fromOneNote).length, took: _on.imp.took, earlier: _on.imp.earlier, f: DB.folders.length, s: _on.imp.state, broken: _on.imp.broken }));
      check(r.n === c1 && r.took === 0 && r.earlier === 9 && r.f === fold1 && r.s === 'done' && r.broken === 1, `${u} a second run adds nothing (${c1} → ${r.n}; 9 left as they were; no new folder; the failed page tried again and failed again)`, JSON.stringify(r));
      /* Trash and a tombstone */
      const ids = await on(d, () => {
        const a = DB.articles.find((x) => x.fromOneNote && x.fromOneNote.id === 'P9'), b = DB.articles.find((x) => x.fromOneNote && x.fromOneNote.id === 'P10');
        DB.articles = DB.articles.filter((x) => x !== a && x !== b);
        DB.trash.push({ type: 'article', item: a, deletedAt: new Date().toISOString() });
        DB.tombstones = DB.tombstones || []; DB.tombstones.push({ id: b.id, deletedAt: new Date().toISOString() });
        persist(); return [a.id, b.id];
      });
      await again(d, vp);
      const r2 = await on(d, (ids) => ({ n: DB.articles.filter((a) => a.fromOneNote).length, back: DB.articles.some((a) => ids.includes(a.id)), took: _on.imp.took }), ids);
      check(r2.n === c1 - 2 && !r2.back && r2.took === 0, `${u} a page in Trash and a page with a tombstone are not added again (${r2.n} of ${c1})`, JSON.stringify(r2));
      noErr(d, u);
    }
  });

  /* ══ 137f — the shared daily limit ══ */
  if (want('137f')) await each('137f', async (d, vp) => {
    const t = `137f@${vp.name}`;
    await ready(d);
    await on(d, () => {
      const now = new Date().toISOString();
      DB.articles.push({ id: 'k1', title: 'k1', content: '', folderIds: [], tags: [], createdAt: now, updatedAt: now, fromKeep: { at: now } });
      DB.articles.push({ id: 'k2', title: 'k2', content: '', folderIds: [], tags: [], createdAt: now, updatedAt: now, fromKeep: { at: now } });
      DB.articles.push({ id: 'e1', title: 'e1', content: '', folderIds: [], tags: [], createdAt: now, updatedAt: now, fromEvernote: { at: now, nb: 'x' } });
      persist(); window.__enxCap = 5; window.__enxNow = Date.now();
    });
    await bring(d, vp);
    const r1 = await on(d, () => ({ s: _on.imp.state, took: _on.imp.took, n: DB.articles.filter((a) => a.fromOneNote).length, dis: (document.getElementById('on-cont') || {}).disabled, kp: _kpWindow(Date.now()).used }));
    check(r1.s === 'capped' && r1.took === 2 && r1.n === 2 && r1.dis === true, `${t} with a cap of 5 and 3 Keep/Evernote notes already today, OneNote brings in 2 and stops; Continue waits`, JSON.stringify(r1));
    check(r1.kp === 5, `${t} Keep's own window now counts the OneNote notes too (${r1.kp} of 5)`);
    await on(d, () => { window.__enxNow = Date.now() + 25 * 3600000; _onPaint(); });
    await act(d, vp, '#on-cont');
    await d.page.waitForFunction(() => !_on.imp.run && ['capped', 'done'].includes(_on.imp.state) && _on.imp.took > 0, null, { timeout: 60000 });
    const r2 = await on(d, () => ({ took: _on.imp.took, n: DB.articles.filter((a) => a.fromOneNote).length, s: _on.imp.state }));
    check(r2.n === 7 && r2.took === 5 && r2.s === 'capped', `${t} a day later Continue brings in the next 5 (${r2.n} in all)`, JSON.stringify(r2));
    noErr(d, t);
  }, [VPS[2], VPS[0]]);

  /* ══ 137g — the token expires mid-import ══ */
  if (want('137g')) await each('137g', async (d, vp) => {
    const t = `137g@${vp.name}`;
    await ready(d);
    await bring(d, vp);
    const r1 = await on(d, () => ({ s: _on.imp.state, n: DB.articles.filter((a) => a.fromOneNote).length, txt: (document.getElementById('on-resignin') || {}).textContent, btn: !!document.getElementById('on-signin'), tok: _on.tok }));
    check(r1.s === 'signin' && /Sign in again to continue/.test(r1.txt || '') && r1.btn && r1.tok === null, `${t} a 401 pauses the import with “Sign in again to continue”, and the dead token is dropped`, JSON.stringify(r1));
    check(r1.n > 0 && r1.n < 9, `${t} what was fetched before it stopped is saved (${r1.n} pages)`);
    await act(d, vp, '#on-signin');
    await d.page.waitForFunction(() => !_on.imp.run && ['done', 'capped', 'paused'].includes(_on.imp.state), null, { timeout: 120000 });
    const r2 = await on(d, () => ({ s: _on.imp.state, n: DB.articles.filter((a) => a.fromOneNote).length, dup: DB.articles.length - new Set(DB.articles.map((a) => a.id)).size }));
    check(r2.s === 'done' && r2.n === 9 && r2.dup === 0 && d.ms.tokN === 2, `${t} after signing in again it carries on where it stopped: 9 pages, no duplicate (${r2.n}); a second token was fetched`, JSON.stringify(r2));
    check(!/FAKE-TOKEN-SECRET/.test(await dumpAll(d)), `${t} neither token is in any storage`);
    noErr(d, t);
  }, [VPS[2], VPS[0]], { ms: { expireOn: 'P5' } });

  /* ══ 137h — the popup-landing boot ══ */
  if (want('137h')) {
    const t = '137h';
    for (const vp of [VPS[0], VPS[2]]) {
      const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
      const reqs = [];
      ctx.on('request', (r) => { const u = r.url(); if (!u.startsWith(srv.base) && !u.startsWith('data:') && !u.startsWith('blob:') && !/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(u)) reqs.push(u); });   /* the page's own <link> to Google Fonts is static markup, not a call */
      await ctx.addInitScript(() => {
        Object.defineProperty(window, 'opener', { value: { postMessage(m, o) { (window.__posted = window.__posted || []).push([m, o]); } }, configurable: true });
        window.__writes = []; const o = IDBFactory.prototype.open; IDBFactory.prototype.open = function (n) { window.__writes.push(n); return o.apply(this, arguments); };
        const s = Storage.prototype.setItem; Storage.prototype.setItem = function (k) { window.__writes.push('ls:' + k); return s.apply(this, arguments); };
      });
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
      await p.goto(srv.base + '/?code=ABC123&state=siyon.test-state', { waitUntil: 'domcontentloaded' });
      await sleep(1500);
      const r = await p.evaluate(async () => ({ posted: window.__posted, writes: window.__writes, booted: window.__appBooted === true, loaded: typeof _dbLoaded !== 'undefined' ? _dbLoaded : 'n/a', dbs: (await indexedDB.databases()).map((x) => x.name), ls: Object.keys(localStorage), body: (document.getElementById('on-popup-msg') || {}).textContent || '' }));
      check(r.posted && r.posted[0][0].code === 'ABC123' && r.posted[0][0].state === 'siyon.test-state' && r.posted[0][1] === srv.base, `${t}@${vp.name} the code is handed to the opener (same origin only)`, JSON.stringify(r.posted));
      check(!r.booted && r.loaded === false && r.writes.length === 0 && r.dbs.length === 0 && r.ls.length === 0, `${t}@${vp.name} the app did not start: no IndexedDB opened, no localStorage write, no database created (_dbLoaded=${r.loaded})`, JSON.stringify({ w: r.writes, d: r.dbs, ls: r.ls }));
      check(reqs.length === 0, `${t}@${vp.name} no request left the page (no cloud call, no Microsoft call)`, reqs.slice(0, 3).join(' '));
      check(/Signed in\. You can close this window/.test(r.body) && errs.length === 0, `${t}@${vp.name} the page only says it can be closed; no page error`, r.body + ' ' + errs[0]);
      /* the same address in an ordinary tab (no opener, no state of ours) still starts the app */
      const p2 = await ctx.newPage(); await p2.addInitScript(() => { Object.defineProperty(window, 'opener', { value: null, configurable: true }); });
      await p2.goto(srv.base + '/?code=ABC123&state=other', { waitUntil: 'domcontentloaded' });
      check(await p2.waitForFunction(() => window.__appBooted === true, null, { timeout: 20000 }).then(() => true).catch(() => false), `${t}@${vp.name} a page with a code but not our state starts the app as usual`);
      await ctx.close();
    }
  }

  /* ══ 137i — scale: 1,500 pages ══ */
  if (want('137i')) {
    const fix = (F) => {
      F.notebooks = [{ id: 'NB1', displayName: 'Big' }];
      F.nbSecs = { NB1: [1, 2, 3, 4, 5].map((i) => ({ id: 'BS' + i, displayName: 'Sec ' + i })) }; F.nbGroups = { NB1: [] }; F.pageSize = 100; F.pages = {};
      for (let s = 1; s <= 5; s++) F.pages['BS' + s] = Array.from({ length: 300 }, (_, i) => page('BP' + s + '_' + i, 'Big ' + s + '/' + i, new Date(Date.UTC(2020, 0, 1 + i)).toISOString(), new Date(Date.UTC(2021, 0, 1 + i)).toISOString(), i % 5 === 0 ? 1 : 0, i, html('Body ' + s + ' ' + i + ' ' + 'x'.repeat(i % 200))));
    };
    await each('137i', async (d, vp) => {
      const t = `137i@${vp.name}`;
      await ready(d);
      const cdp = await d.ctx.newCDPSession(d.page); if (vp.w < 640) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await on(d, () => { window.__lt = []; try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(e.duration))).observe({ entryTypes: ['longtask'] }); } catch (e) {} window.__enxCap = 10000; });
      const t0 = Date.now();
      await look(d, vp, 300000);
      const tLook = Date.now() - t0, mxLook = await on(d, () => Math.max(0, ...window.__lt));
      await on(d, () => { window.__lt.length = 0; });
      const t1 = Date.now();
      await act(d, vp, '#on-bring');
      await d.page.waitForFunction(() => !_on.imp.run && _on.imp.state === 'done', null, { timeout: 900000 });
      const tImp = Date.now() - t1, r = await on(d, () => ({ n: DB.articles.filter((a) => a.fromOneNote).length, mx: Math.max(0, ...window.__lt), fly: window.__onMaxFly }));
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      console.log(`  note  ${t}: look ${(tLook / 1000).toFixed(1)} s (longest task ${Math.round(mxLook)} ms) · import ${(tImp / 1000).toFixed(1)} s (longest task ${Math.round(r.mx)} ms)`);
      check(r.n === 1500 && r.fly <= 4, `${t} 1,500 pages brought in, never more than 4 requests in flight`, JSON.stringify(r));
      const lim = hostLimit(200);
      check(r.mx <= lim.ms && mxLook <= lim.ms, `${t} longest task ${Math.round(Math.max(r.mx, mxLook))} ms (limit ${lim.text})`);
      noErr(d, t);
    }, [VPS[0]], { fix });
  }
} finally {
  await browser.close(); await srv.close();
}
const bad = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - bad}/${results.length} passed${bad ? ', ' + bad + ' FAILED' : ''}`);
process.exit(bad ? 1 : 0);
