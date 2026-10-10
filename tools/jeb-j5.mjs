#!/usr/bin/env node
/* tools/jeb-j5.mjs — v05.04, J5: "Siyagah Jeb", the second home-screen icon (checks 65a–65j).

   The same index.html opened as /?jeb=1. Every check that clicks names its size and uses real clicks (1440) or real
   taps (390 / 820, touch viewports), against a booted app with a seeded notebook, and counts page errors.

   65a  head: manifest, title, icons — /?jeb=1 vs /
   65b  installability measured by Chrome itself (CDP Page.getAppManifest / getInstallabilityErrors)
   65c  layout at each size: notes panes hidden; header, docked panel and bar visible, inside, not overlapping;
        All pockets by default; the phone keyboard rule leaves the bar alone while typing in Jeb
   65d  real clicks: add, tick, switch pockets, ▦ cards and back; an outside tap, Escape and the open chip keep the panel
   65e  DB.theme.jebBar=false: the bar still shows, the stored value is still false
   65f  jebAppView restores after a reload (panel and deck); a stale pocket falls back to All pockets
   65g  → Note in Jeb mode, "Open note" → /?open=<id> → the full app shows the note, the address ends as /
   65h  🧰 → 👝 Siyagah Jeb from a booted full app opens /?jeb=1
   65i  the data path is the same: identical DB after boot in both modes; an item added in Jeb mode is in the full app
   65j  the header reads the sidebar's own sync dot and ⚠; 📱 Install follows _pwaPrompt

   `--only=65a,65c` runs just those. Each printed ok/FAIL line becomes one app-check check (block 65). */
import { playwright, serve, seedDB, BLOCKED } from './harness.mjs';
import { sleep, check, results } from './s1-fake.mjs';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);

const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];
const T0 = '2026-10-01T00:00:00.000Z';
const pw = await playwright();
const srv = await serve();
const browser = await pw.chromium.launch();

const mkItem = (id, pocketId, text, order, extra = {}) => ({ id, pocketId, text, done: false, folderIds: [], tags: [], kind: null, journal: false, order, createdAt: T0, updatedAt: T0, ...extra });
const seed = (extra) => {
  const db = seedDB(T0);
  db.jeb = [mkItem('t1', 'jp-task', 'Alpha', 0), mkItem('t2', 'jp-task', 'Bravo', 1), mkItem('i1', 'jp-idea', 'Idea one', 0), mkItem('s1', 'jp-shop', 'Milk', 0)];
  if (extra) extra(db);
  return db;
};
/* a fresh context (its own storage) with the notebook seeded once, never over a later save */
async function ctxFor(vp, db) {
  const ctx = await browser.newContext(vp.touch ? { viewport: { width: vp.w, height: vp.h }, hasTouch: true, isMobile: true } : { viewport: { width: vp.w, height: vp.h } });
  for (const p of BLOCKED) await ctx.route(p, (r) => r.abort());
  await ctx.addInitScript((d) => { try { if (!localStorage.getItem('my-notebook-v1')) localStorage.setItem('my-notebook-v1', JSON.stringify(d)); } catch {} }, db);
  return ctx;
}
async function pageOn(ctx, path) {
  const d = { ctx, errors: [], urls: [] };
  d.page = await ctx.newPage();
  hook(d, d.page);
  await d.page.goto(srv.base + path, { waitUntil: 'domcontentloaded' });
  await booted(d.page);
  return d;
}
function hook(d, page) {
  page.on('pageerror', (e) => d.errors.push('pageerror: ' + e));
  page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR_FAILED/.test(m.text())) d.errors.push('console: ' + m.text()); });
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) d.urls.push(f.url()); });
}
const booted = async (page) => { await page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree')); await sleep(500); };
const open = async (vp, path, db = seed()) => pageOn(await ctxFor(vp, db), path);
const on = (d, fn, arg) => d.page.evaluate(fn, arg);
const act = (d, vp, sel) => (vp.touch ? d.page.locator(sel).first().tap() : d.page.locator(sel).first().click());
const rect = (d, sel) => on(d, (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; }, sel);
const visible = (d, sel) => on(d, (s) => { const e = document.querySelector(s); if (!e) return false; const c = getComputedStyle(e), r = e.getBoundingClientRect(); return c.display !== 'none' && c.visibility !== 'hidden' && r.width > 0 && r.height > 0; }, sel);
const panelIds = (d) => on(d, () => [...document.querySelectorAll('#jeb-panel .jeb-it')].map((c) => c.dataset.iid));
const panelOn = (d) => on(d, () => { const e = document.getElementById('jeb-panel'); return !!e && e.classList.contains('on') && getComputedStyle(e).display !== 'none'; });
const deckOn = (d) => on(d, () => { const e = document.getElementById('jeb-deck'); return !!e && e.classList.contains('on'); });
const noErr = (d, tag) => check(d.errors.length === 0, `${tag} no page errors`, d.errors.slice(0, 2).join(' · '));
const each = async (fn, db) => { for (const vp of VPS) { const d = await open(vp, '/?jeb=1', db ? db() : seed()); try { await fn(d, vp); } finally { await d.ctx.close(); } } };
const chip = (pid) => `#jeb-bar .jeb-chip[data-pid="${pid}"] .jeb-main`;
const stripTimes = (o) => JSON.parse(JSON.stringify(o, (k, v) => (/At$|^at$|^ver$/.test(k) ? 0 : v)));

try {
  /* ══ 65a — the head ══ */
  if (want('65a')) for (const vp of VPS) {
    const t = `65a@${vp.name}`;
    const j = await open(vp, '/?jeb=1'), m = await open(vp, '/');
    try {
      const jh = await on(j, () => ({ man: document.querySelector('link[rel="manifest"]').getAttribute('href'), title: document.title, app: _JEB_APP, cls: document.documentElement.classList.contains('jeb-app'),
        ati: document.querySelector('meta[name="apple-mobile-web-app-title"]').content, touch: document.querySelector('link[rel="apple-touch-icon"][sizes]').getAttribute('href'), ico: document.querySelector('link[rel="icon"][type="image/svg+xml"]').getAttribute('href'),
        fallback: document.querySelector('link[rel="apple-touch-icon"]:not([sizes])').getAttribute('href').slice(0, 25), nd: !!document.getElementById('nd') }));
      check(jh.man === '/manifest-jeb.json' && jh.title === 'Siyagah Zab' && jh.app && jh.cls && jh.ati === 'Zab' && jh.touch === '/icons/apple-touch-icon-jeb.png' && jh.ico === '/icons/icon-jeb.svg', /* v05.05: renamed to Zab */
        `${t} /?jeb=1: manifest-jeb.json, title "Siyagah Jeb", Jeb icons, _JEB_APP and html.jeb-app`, JSON.stringify(jh));
      check(jh.fallback === 'data:image/svg+xml;base64' && jh.nd, `${t} /?jeb=1: the data-URI fallback icon and <script id="nd"> are untouched`);
      const mh = await on(m, () => ({ man: document.querySelector('link[rel="manifest"]').getAttribute('href'), title: document.title, app: _JEB_APP, cls: document.documentElement.classList.contains('jeb-app'), ati: document.querySelector('meta[name="apple-mobile-web-app-title"]').content,
        touch: document.querySelector('link[rel="apple-touch-icon"][sizes]').getAttribute('href'), jebBar: !!document.getElementById('jeb-app-hd'), sb: getComputedStyle(document.getElementById('sb')).display }));
      check(mh.man === '/manifest.json' && mh.title === 'My Knowledge Notebook' && !mh.app && !mh.cls && mh.ati === 'Siyagah' && mh.touch === '/icons/apple-touch-icon.png' && !mh.jebBar && mh.sb !== 'none',
        `${t} /: still manifest.json, the same title and icons, no Jeb header, the sidebar is there`, JSON.stringify(mh));
      noErr(j, t); noErr(m, t);
    } finally { await j.ctx.close(); await m.ctx.close(); }
  }

  /* ══ 65b — installability, measured by Chrome ══ */
  if (want('65b')) {
    const vp = VPS[2], t = '65b@1440';
    const j = await open(vp, '/?jeb=1'), m = await open(vp, '/');
    try {
      const probe = async (d) => {
        const s = await d.ctx.newCDPSession(d.page);
        await s.send('Page.enable');
        const man = await s.send('Page.getAppManifest');
        let inst = null; try { inst = await s.send('Page.getInstallabilityErrors'); } catch (e) { inst = { error: String(e) }; }
        return { man, inst };
      };
      const J = await probe(j), M = await probe(m);
      const idOf = (x) => { try { return JSON.parse(x.man.data).id; } catch { return null; } };
      const jid = idOf(J), mid = idOf(M);
      const jerr = (J.man.errors || []).map((e) => e.message), merr = (M.man.errors || []).map((e) => e.message);
      /* Chrome gives the resolved id back from the parsed manifest only through the data; resolve it the way the spec does */
      const resolve = (id, base) => new URL(id, base).href;
      check(!!J.man.data && jerr.length === 0, `${t} the Jeb page's manifest parses in Chrome with no errors`, jerr.join(' · ') || J.man.url);
      check(J.man.url === srv.base + '/manifest-jeb.json', `${t} Chrome fetched /manifest-jeb.json for the Jeb page`, J.man.url);
      check(jid && resolve(jid, srv.base) === srv.base + '/?jeb=1', `${t} the Jeb manifest's id resolves to …/?jeb=1`, `${jid} -> ${jid && resolve(jid, srv.base)}`);
      check(mid && resolve(mid, srv.base) === srv.base + '/', `${t} the main manifest's id still resolves to …/`, `${mid} -> ${mid && resolve(mid, srv.base)}`);
      check(merr.length === 0, `${t} the main manifest still parses with no errors`, merr.join(' · '));
      const BAD = /manifest|icon|start-?url|name/i;
      const list = (x) => (x.inst.installabilityErrors || []).map((e) => e.errorId + (e.errorArguments && e.errorArguments.length ? '(' + e.errorArguments.map((a) => a.value).join(',') + ')' : ''));
      const jl = list(J), ml = list(M);
      check(!jl.some((e) => BAD.test(e)), `${t} Chrome reports no manifest/icon installability error for the Jeb page`, `Jeb: [${jl.join(', ')}]  main: [${ml.join(', ')}]  (anything not about the manifest/icons — e.g. no service worker yet in headless — is recorded, not failed)`);
      check(jl.filter((e) => BAD.test(e)).join() === ml.filter((e) => BAD.test(e)).join(), `${t} the Jeb page reports the same manifest/icon errors as the main page (no worse)`, `Jeb: [${jl.join(', ')}]  main: [${ml.join(', ')}]`);
      noErr(j, t); noErr(m, t);
    } finally { await j.ctx.close(); await m.ctx.close(); }
  }

  /* ══ 65c — layout ══ */
  if (want('65c')) await each(async (d, vp) => {
    const t = `65c@${vp.name}`;
    const hidden = [];
    for (const s of ['#sb', '#p2', '#p3', '#tab-bar', '#toc-float-btn']) if (await visible(d, s)) hidden.push(s);
    check(hidden.length === 0, `${t} the notes surfaces are not visible (#sb, #p2, #p3, tab bar, TOC button)`, hidden.join());
    const shown = [];
    for (const s of ['#jeb-app-hd', '#jeb-bar', '#jeb-panel.on']) if (!(await visible(d, s))) shown.push(s);
    check(shown.length === 0, `${t} the header, the bar and the docked panel are visible`, 'not visible: ' + shown.join());
    const h = await rect(d, '#jeb-app-hd'), b = await rect(d, '#jeb-bar'), p = await rect(d, '#jeb-panel');
    const inside = [h, b, p].every((r) => r && r.l >= -0.5 && r.t >= -0.5 && r.r <= vp.w + 0.5 && r.b <= vp.h + 0.5);
    check(inside, `${t} all three are inside the ${vp.w}x${vp.h} screen`, JSON.stringify({ h, b, p }));
    check(h.b <= p.t + 1 && p.b <= b.t + 1 && p.b - p.t > 200, `${t} header, panel and bar stack without overlapping, and the panel fills the space between (${Math.round(p.b - p.t)}px tall)`, JSON.stringify({ hb: h.b, pt: p.t, pb: p.b, bt: b.t }));
    const shape = vp.w >= 1200 ? (p.w <= 721 && p.w >= 600 && Math.abs((p.l + p.r) / 2 - vp.w / 2) < 2 && b.l <= 1 && b.r >= vp.w - 1) : (p.w >= vp.w - 2);
    check(shape, `${t} shape: ${vp.w >= 1200 ? 'a centred column of about 720px with the bar full width' : 'the panel is full width'}`, `panel ${Math.round(p.w)}px at ${Math.round(p.l)}; bar ${Math.round(b.l)}–${Math.round(b.r)}`);
    const all = await on(d, () => ({ open: _jebOpen, multi: _jebMulti && _jebMulti.all, title: document.querySelector('#jeb-panel .jeb-pt b').textContent, groups: document.querySelectorAll('#jeb-panel .jeb-gh').length }));
    check(all.open === '*' && all.multi && all.title === 'All pockets' && all.groups === 4, `${t} it opens on "All pockets", a header per pocket`, JSON.stringify(all));
    check(!(await on(d, () => document.getElementById('jeb-add-in') === document.activeElement)), `${t} opening did not put the caret in a box (no keyboard on a phone)`);
    /* typing in Jeb must not hide the bar (the jeb-kb rule) */
    await act(d, vp, chip('jp-task')); await sleep(300);
    await act(d, vp, '#jeb-add-in'); await d.page.keyboard.type('typing here'); await sleep(500);
    const kb = await on(d, () => ({ cls: document.documentElement.classList.contains('jeb-kb'), disp: getComputedStyle(document.getElementById('jeb-bar')).display, focus: document.activeElement.id }));
    const b2 = await rect(d, '#jeb-bar');
    check(!kb.cls && kb.disp !== 'none' && kb.focus === 'jeb-add-in' && b2 && b2.b <= vp.h + 0.5, `${t} typing in a Jeb field keeps the bar (no jeb-kb, bar still on screen)`, JSON.stringify({ kb, b2 }));
    noErr(d, t);
  });

  /* ══ 65d — real clicks ══ */
  if (want('65d')) await each(async (d, vp) => {
    const t = `65d@${vp.name}`;
    await act(d, vp, chip('jp-task')); await sleep(400);
    check((await panelIds(d)).join() === 't1,t2', `${t} a chip switches the panel to that pocket`, (await panelIds(d)).join());
    await act(d, vp, '#jeb-add-in'); await d.page.keyboard.type('Charlie from Jeb'); await act(d, vp, '#jeb-panel [data-act="add"]'); await sleep(500);
    const added = await on(d, () => { const x = DB.jeb.find((i) => i.text === 'Charlie from Jeb'); return x ? { pid: x.pocketId, done: x.done } : null; });
    check(added && added.pid === 'jp-task' && (await panelIds(d)).length === 3, `${t} typing an item and Add puts it in the pocket (DB and panel)`, JSON.stringify(added));
    const first = (await panelIds(d))[0];
    await act(d, vp, `#jeb-panel .jeb-it[data-iid="${first}"] .jeb-tick`); await sleep(400);
    check(await on(d, (i) => DB.jeb.find((x) => x.id === i).done === true, first), `${t} ticking an item marks it done`);
    await act(d, vp, chip('jp-idea')); await sleep(400);
    check((await panelIds(d)).join() === 'i1' && await panelOn(d), `${t} another chip switches again`, (await panelIds(d)).join());
    await act(d, vp, '#jeb-bar .jeb-chip[data-pid="jp-idea"] [data-jeb-cards]'); await d.page.waitForSelector('#jeb-deck.on', { timeout: 3000 }); await sleep(1300);
    check((await deckOn(d)) && !(await panelOn(d)), `${t} ▦ opens the deck`);
    const dk = await rect(d, '#jeb-deck'), hd = await rect(d, '#jeb-app-hd');
    check(dk.t >= hd.b - 1, `${t} the deck sits below the header, which stays`, JSON.stringify({ deckTop: dk.t, headerBottom: hd.b }));
    await act(d, vp, '#jeb-deck .jd-x'); await sleep(500);
    check(!(await deckOn(d)) && await panelOn(d) && (await panelIds(d)).join() === 'i1', `${t} closing the deck returns to the panel for the same pocket`, (await panelIds(d)).join());
    await act(d, vp, '#jeb-bar .jeb-chip[data-pid="jp-idea"] [data-jeb-cards]'); await d.page.waitForSelector('#jeb-deck.on'); await sleep(1300);
    await d.page.keyboard.press('Escape'); await sleep(500);
    check(!(await deckOn(d)) && await panelOn(d), `${t} Escape closes the deck back to the panel`);
    /* nothing may leave an empty screen */
    await d.page.mouse.click(Math.round(vp.w / 2), Math.round(vp.h / 2)); await sleep(300);
    await d.page.keyboard.press('Escape'); await sleep(300);
    check(await panelOn(d), `${t} a tap outside and Escape leave the panel open`);
    await act(d, vp, chip('jp-idea')); await sleep(300);
    check(await panelOn(d) && (await panelIds(d)).join() === 'i1', `${t} tapping the open chip leaves it open`);
    await act(d, vp, '#jeb-bar .jeb-all .jeb-main'); await sleep(300); await act(d, vp, '#jeb-bar .jeb-all .jeb-main'); await sleep(300);
    check(await panelOn(d), `${t} tapping the open "All pockets" chip leaves it open`);
    const del = await on(d, () => { const s = _jebOpen; jebDeletePocket('jp-link'); jebRefresh(); return s; });
    check(await panelOn(d), `${t} a pocket deleted under the panel does not leave an empty screen`, String(del));
    noErr(d, t);
  });

  /* ══ 65e — the bar setting is ignored, not changed ══ */
  if (want('65e')) await each(async (d, vp) => {
    const t = `65e@${vp.name}`;
    const st = await on(d, () => ({ bar: !!document.getElementById('jeb-bar') && getComputedStyle(document.getElementById('jeb-bar')).display !== 'none', stored: DB.theme.jebBar, hh: getComputedStyle(document.documentElement).getPropertyValue('--jeb-h').trim() }));
    check(st.bar && st.stored === false && st.hh === '56px', `${t} jebBar=false: the bar still shows in Jeb mode, the stored value is still false`, JSON.stringify(st));
    await d.page.reload({ waitUntil: 'domcontentloaded' }); await booted(d.page);
    check(await visible(d, '#jeb-bar') && (await on(d, () => DB.theme.jebBar)) === false, `${t} ... also after a reload`);
    noErr(d, t);
  }, () => seed((db) => { db.theme = { jebBar: false }; }));

  /* ══ 65f — what opens first ══ */
  if (want('65f')) for (const vp of VPS) {
    const t = `65f@${vp.name}`;
    const d = await open(vp, '/?jeb=1');
    try {
      const before = await on(d, () => JSON.stringify(DB.theme.jebAppView || null));
      check(before === 'null', `${t} nothing is written at boot (no jebAppView yet)`, before);
      await act(d, vp, chip('jp-idea')); await sleep(2500);
      const v = await on(d, () => DB.theme.jebAppView);
      check(v && v.sel.ids.join() === 'jp-idea' && !v.sel.all && v.deck === false, `${t} switching a pocket stores DB.theme.jebAppView`, JSON.stringify(v));
      await d.page.reload({ waitUntil: 'domcontentloaded' }); await booted(d.page);
      check((await on(d, () => _jebOpen)) === 'jp-idea' && (await panelIds(d)).join() === 'i1', `${t} after a reload it opens on the last pocket`, await on(d, () => String(_jebOpen)));
      await act(d, vp, '#jeb-bar .jeb-chip[data-pid="jp-shop"] [data-jeb-cards]'); await d.page.waitForSelector('#jeb-deck.on'); await sleep(2500);
      await d.page.reload({ waitUntil: 'domcontentloaded' }); await booted(d.page); await sleep(1300);
      check(await deckOn(d) && !(await panelOn(d)), `${t} a deck left open reopens as the deck after a reload`);
      await act(d, vp, '#jeb-deck .jd-x'); await sleep(2500);
      await d.page.evaluate(() => { DB.theme.jebAppView = { sel: { ids: ['gone-pocket'], all: false }, deck: false }; persist(); });
      await sleep(1500);
      await d.page.reload({ waitUntil: 'domcontentloaded' }); await booted(d.page);
      const fb = await on(d, () => ({ open: _jebOpen, all: _jebMulti && _jebMulti.all }));
      check(fb.open === '*' && fb.all && await panelOn(d), `${t} a stored view whose pocket no longer exists falls back to All pockets`, JSON.stringify(fb));
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }

  /* ══ 65g — → Note, then "Open note" ══ */
  if (want('65g')) for (const vp of VPS) {
    const t = `65g@${vp.name}`;
    const d = await open(vp, '/?jeb=1');
    try {
      const art0 = await on(d, () => DB.articles.length);
      await act(d, vp, chip('jp-task')); await sleep(400);
      await act(d, vp, '#jeb-panel .jeb-it[data-iid="t1"] .jeb-note-b'); await sleep(700);
      const r = await on(d, () => ({ n: DB.articles.length, note: DB.articles.find((a) => a.fromJeb) || null, item: !!(DB.jeb || []).find((i) => i.id === 't1' && !i.deleted), items: jebItems('jp-task').map((i) => i.id), toast: !!document.querySelector('.toast-act') }));
      check(r.n === art0 + 1 && r.note && /Alpha/.test(r.note.title + r.note.content) && !r.items.includes('t1') && r.toast, `${t} → Note in Jeb mode: the note exists, the item is gone, the toast offers "Open note"`, JSON.stringify({ n: r.n, items: r.items, toast: r.toast }));
      const nid = r.note.id;
      d.urls.length = 0;
      await act(d, vp, '.toast-act'); await d.page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree')); await sleep(1800);
      check(d.urls.some((u) => /\?open=/.test(u) && u.includes(nid)), `${t} tapping the toast goes to /?open=<note id>`, d.urls.join(' > '));
      const u = new URL(d.page.url());
      check(u.pathname === '/' && u.search === '', `${t} the address ends as /`, d.page.url());
      const s = await on(d, (n) => ({ jeb: _JEB_APP, art: ST.article, title: document.querySelector('#p3h')?.innerText.slice(0, 60), p3: (() => { const e = document.getElementById('p3'); const r = e.getBoundingClientRect(); return { l: r.left, w: r.width, disp: getComputedStyle(e).display }; })() }), nid);
      check(!s.jeb && s.art === nid && s.p3.disp !== 'none' && s.p3.w > 100 && s.p3.l < vp.w - 50, `${t} the full app shows that note (${vp.w >= 1200 ? 'Pane 3' : 'the note screen'})`, JSON.stringify(s));
      /* an unknown id does nothing, and the address is tidied */
      await d.page.goto(srv.base + '/?open=no-such-note', { waitUntil: 'domcontentloaded' }); await booted(d.page);
      const un = await on(d, () => ({ art: ST.article, path: location.pathname + location.search }));
      check(un.path === '/' && un.art !== 'no-such-note', `${t} an unknown ?open= id does nothing and the address is tidied`, JSON.stringify(un));
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }

  /* ══ 65h — reaching it from the full app ══ */
  if (want('65h')) for (const vp of VPS) {
    const t = `65h@${vp.name}`;
    const d = await open(vp, '/');
    try {
      await act(d, vp, '#sb-tools-btn'); await sleep(400);
      const item = await rect(d, '#jeb-app-mi');
      check(item && item.w > 60 && item.l >= 0 && item.r <= vp.w + 0.5 && item.t >= 0 && item.b <= vp.h + 0.5, `${t} 🧰 shows "👝 Siyagah Jeb", whole and on the screen`, JSON.stringify(item));
      const title = await on(d, () => document.getElementById('jeb-app-mi').title);
      check(/home screen/i.test(title), `${t} its title says it can be added to the home screen`, title);
      const [pop] = await Promise.all([d.ctx.waitForEvent('page', { timeout: 8000 }), act(d, vp, '#jeb-app-mi')]);
      hook(d, pop); await pop.waitForLoadState('domcontentloaded');
      await booted(pop); await sleep(500);
      const u = new URL(pop.url());
      const st = await pop.evaluate(() => ({ app: _JEB_APP, hd: !!document.getElementById('jeb-app-hd'), title: document.title }));
      check(u.pathname === '/' && u.search === '?jeb=1' && st.app && st.hd && st.title === 'Siyagah Zab', `${t} it opens /?jeb=1 in a new window, in Jeb mode`, pop.url() + ' ' + JSON.stringify(st)); /* v05.05: renamed to Zab */
      check(!(await on(d, () => document.getElementById('sb-tools').classList.contains('open') && false)) , `${t} (the full app is still there behind it)`);
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }

  /* ══ 65i — the data path is the same ══ */
  if (want('65i')) for (const vp of VPS) {
    const t = `65i@${vp.name}`;
    const J = await open(vp, '/?jeb=1'), F = await open(vp, '/');
    try {
      const dj = stripTimes(await on(J, () => JSON.parse(JSON.stringify(DB)))), df = stripTimes(await on(F, () => JSON.parse(JSON.stringify(DB))));
      const sj = JSON.stringify(dj), sf = JSON.stringify(df);
      let diff = '';
      if (sj !== sf) { const keys = new Set([...Object.keys(dj), ...Object.keys(df)]); diff = [...keys].filter((k) => JSON.stringify(dj[k]) !== JSON.stringify(df[k])).join(','); }
      check(sj === sf, `${t} the same notebook booted in Jeb mode and in full mode has an identical DB`, diff ? 'differs in: ' + diff : `${sj.length} bytes`);
      noErr(J, t); noErr(F, t);
    } finally { await J.ctx.close(); await F.ctx.close(); }
    const d = await open(vp, '/?jeb=1');
    try {
      await act(d, vp, chip('jp-shop')); await sleep(300);
      await act(d, vp, '#jeb-add-in'); await d.page.keyboard.type('Eggs from Jeb'); await act(d, vp, '#jeb-panel [data-act="add"]'); await sleep(2500);
      await d.page.goto(srv.base + '/', { waitUntil: 'domcontentloaded' }); await booted(d.page);
      const has = await on(d, () => { const x = DB.jeb.find((i) => i.text === 'Eggs from Jeb'); return x ? x.pocketId : null; });
      check(has === 'jp-shop', `${t} an item added in Jeb mode is in the notebook when the full app loads`, String(has));
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }

  /* ══ 65j — the header reads what the sidebar already knows ══ */
  if (want('65j')) await each(async (d, vp) => {
    const t = `65j@${vp.name}`;
    const words = async () => on(d, () => ({ hd: document.getElementById('jah-sync').textContent, dot: document.getElementById('sync-dot').title }));
    const w0 = await words();
    check(w0.hd.length > 2 && /[A-Za-z]{3,}/.test(w0.hd) && w0.dot.startsWith(w0.hd), `${t} the sync state is in words, taken from the sidebar's own dot`, JSON.stringify(w0));
    await on(d, () => setSyncStatus('live')); await sleep(200);
    check(/Live/.test((await words()).hd), `${t} the dot going "live" changes the header`, JSON.stringify(await words()));
    await on(d, () => setSyncStatus('err')); await sleep(200);
    check(/error/i.test((await words()).hd), `${t} the dot going "err" shows "Sync error" in the header`, JSON.stringify(await words()));
    await on(d, () => setSyncStatus('offline')); await sleep(200);
    check(/Offline/.test((await words()).hd), `${t} "offline" shows in the header`, JSON.stringify(await words()));
    check(!(await visible(d, '#jah-inst')), `${t} 📱 Install is hidden while there is no install prompt`);
    await on(d, () => { _pwaPrompt = { prompt() { window.__prompted = true; }, userChoice: Promise.resolve({ outcome: 'dismissed' }) }; _jebAppHdSync(); }); await sleep(200);
    check(await visible(d, '#jah-inst'), `${t} 📱 Install shows once _pwaPrompt is set`);
    await act(d, vp, '#jah-inst'); await sleep(400);
    check((await on(d, () => window.__prompted === true)) && !(await visible(d, '#jah-inst')), `${t} tapping it calls installPWA() and then hides`);
    check(!(await visible(d, '#jah-warn')), `${t} ⚠ is hidden while saving works`);
    await on(d, () => { document.getElementById('save-warn-dot').style.display = ''; }); await sleep(200);
    check(await visible(d, '#jah-warn'), `${t} ⚠ shows when the sidebar's storage warning is on (the alarm still reaches the owner)`);
    await act(d, vp, '#jah-warn'); await sleep(500);
    check(await on(d, () => /can no longer save/.test(document.getElementById('mb').innerText)), `${t} tapping it opens the storage details`);
    await d.page.keyboard.press('Escape'); await sleep(200); await on(d, () => { try { closeModal(); } catch (e) {} });
    await act(d, vp, '#jah-sync'); await sleep(500);
    check(await on(d, () => getComputedStyle(document.getElementById('sync-modal')).display !== 'none'), `${t} tapping the sync words opens the sync window`);
    await on(d, () => { try { closeSyncModal(); } catch (e) {} });
    const op = await rect(d, '#jah-open');
    check(op && op.h >= 40 && op.w >= 40, `${t} 📓 Open Siyagah is at least 40px`, JSON.stringify(op));
    await Promise.all([d.page.waitForNavigation({ waitUntil: 'domcontentloaded' }), act(d, vp, '#jah-open')]); await booted(d.page);
    check(!(await on(d, () => _JEB_APP)) && new URL(d.page.url()).pathname === '/' && new URL(d.page.url()).search === '', `${t} 📓 Open Siyagah goes to the full app in the same window`, d.page.url());
    noErr(d, t);
  });

  /* ══ 65s — Save File: an export is never a Jeb page, and never carries Jeb's contents ══ */
  if (want('65s')) {
    const { mkdtemp, writeFile } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const dir = await mkdtemp(join(tmpdir(), 'jeb-exp-'));
    const esrv = await serve(dir);
    try {
      for (const vp of VPS) {
        const t = `65s@${vp.name}`;
        const files = {};
        for (const [mode, path] of [['jeb', '/?jeb=1'], ['main', '/']]) {
          const d = await open(vp, path);
          try {
            await act(d, vp, chip('jp-task')); await sleep(400);
            const html = await on(d, () => getExportHTML());
            const live = await on(d, () => ({ app: _JEB_APP, hd: !!document.getElementById('jeb-app-hd'), cls: document.documentElement.classList.contains('jeb-app'), docked: !!document.getElementById('jeb-panel')?.classList.contains('on'), title: document.title }));
            const isJ = mode === 'jeb';
            check(live.app === isJ && live.hd === isJ && live.cls === isJ && live.docked && (live.title === 'Siyagah Zab') === isJ, `${t} ${mode}: the live page is unchanged by the export (mode, header, docked panel)`, JSON.stringify(live)); /* v05.05: renamed to Zab */
            const f = `exp-${mode}-${vp.name}.html`; await writeFile(join(dir, f), html); files[mode] = f;
            const n = (html.match(/id="jeb-bar"|id="jeb-panel"|id="jeb-app-hd"|id="jeb-deck"/g) || []).length;
            check(n === 0, `${t} ${mode}: the saved HTML has no Jeb bar, panel or header`, String(n));
          } finally { await d.ctx.close(); }
        }
        for (const mode of ['jeb', 'main']) {
          const ctx = await ctxFor(vp, seed());
          const d = { ctx, errors: [], urls: [] }; d.page = await ctx.newPage();
          d.page.on('pageerror', (e) => d.errors.push('pageerror: ' + e));
          try {
            await d.page.goto(esrv.base + '/' + files[mode], { waitUntil: 'domcontentloaded' }); await booted(d.page);
            const s = await on(d, () => ({ app: _JEB_APP, cls: document.documentElement.classList.contains('jeb-app'), title: document.title, man: document.querySelector('link[rel="manifest"]').getAttribute('href'), bars: document.querySelectorAll('#jeb-bar').length, hd: !!document.getElementById('jeb-app-hd') }));
            check(!s.app && !s.cls && s.title !== 'Siyagah Zab' && s.man === '/manifest.json' && !s.hd, `${t} reopening the ${mode} export: not a Jeb page, main title and manifest`, JSON.stringify(s)); /* v05.05: renamed to Zab */
            check(s.bars === 1, `${t} reopening the ${mode} export: exactly one #jeb-bar`, String(s.bars));
            check(await visible(d, '#sb'), `${t} reopening the ${mode} export: the sidebar is visible`);
            if (!vp.touch) {
              await on(d, () => selFolder('f1')); await sleep(400);
              await d.page.locator('#p2c [onclick^="selArt("]').first().click(); await sleep(500);
              check(await on(d, () => !!ST.article), `${t} reopening the ${mode} export: a note opens by a real click`);
            }
            await act(d, vp, chip('jp-task')); await sleep(400);
            check(await on(d, () => _jebOpen === 'jp-task'), `${t} reopening the ${mode} export: a real click on a chip opens the panel`);
            check(d.errors.length === 0, `${t} reopening the ${mode} export: no page errors`, d.errors.slice(0, 2).join(' · '));
          } finally { await ctx.close(); }
        }
        /* Deploy Export: an empty shell holds no pocket name and no item text, even with a panel open */
        const d = await open(vp, '/');
        try {
          await on(d, () => { DB.jebPockets.forEach((p) => { p.name = 'Zqpocket' + p.id; }); DB.jeb.forEach((i) => { i.text = 'Zqitem' + i.id; }); persist(); render(); });
          await sleep(300); await act(d, vp, chip('jp-task')); await sleep(400);
          const names = await on(d, () => DB.jebPockets.map((p) => p.name));
          const html = await on(d, () => getExportHTML(JSON.stringify({ folders: [], articles: [], sections: [], trash: [] })));
          const leak = [...names, 'Zqitem'].filter((w) => html.includes(w));
          check(leak.length === 0, `${t} Deploy Export with a panel open: no pocket name or item text`, leak.join(','));
        } finally { await d.ctx.close(); }
      }
    } finally { await esrv.close(); }
  }
} catch (e) {
  console.log(' FAIL  jeb-j5 threw: ' + (e && e.stack || e));
  results.push({ ok: false, label: 'threw' });
} finally {
  await browser.close();
  await srv.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
