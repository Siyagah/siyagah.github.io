#!/usr/bin/env node
/* tools/zab-z1.mjs — v05.05, Z1: "Jeb" is "Zab" on every screen the owner sees (checks 66a–66d).

   Words only: the data and every internal name (DB.jeb, #jeb-*, ?jeb=1, manifest-jeb.json) are unchanged, so this file
   itself still says jeb in selectors. NAME NOTHING, SWEEP EVERYTHING: on each surface, collect every rendered text node
   plus every title / aria-label / placeholder / alt in the page and assert none reads /\bJeb\b/i. Each surface is also
   asserted to HAVE opened (a known Zab word on it), so an empty sweep cannot pass for a clean one.

   66a  the sweep — every Zab surface at 390 / 820 / 1440, in the full app and at /?jeb=1
   66b  Chrome's reading of the Zab manifest (name "Siyagah Zab", short "Zab"); document.title; apple title
   66c  the stored data is byte-identical before and after booting (no migration, nothing rewritten)
   66d  a pocket name the owner typed (even "Jeb") is shown as typed, never rewritten

   `--only=66a` runs one. Each printed ok/FAIL line becomes one app-check check (block 66). */
import { playwright, serve, seedDB, BLOCKED } from './harness.mjs';
import { sleep, check, results } from './s1-fake.mjs';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);

const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];
const T0 = '2026-10-01T00:00:00.000Z';
const OLD = /\bJeb\b/i;
const pw = await playwright();
const srv = await serve();
const browser = await pw.chromium.launch();

const mkItem = (id, pocketId, text, order, extra = {}) => ({ id, pocketId, text, done: false, folderIds: [], tags: [], kind: null, journal: false, order, createdAt: T0, updatedAt: T0, ...extra });
const seed = () => {
  const db = seedDB(T0);
  /* a notebook as v05.04 left it: the pockets already exist (the seeding at first boot is not under test) */
  db.jebPockets = [['jp-task', 'Quick tasks', '✓', '#FFF1A8'], ['jp-idea', 'Ideas', '✶', '#FFD9B8'], ['jp-link', 'Links to read', '↗', '#CFE8FF'], ['jp-shop', 'Shopping', '◫', '#F6D2E4']]
    .map(([id, name, icon, color], order) => ({ id, name, icon, color, order, createdAt: T0, updatedAt: T0 }));
  db.jeb = [mkItem('t1', 'jp-task', 'Alpha', 0), mkItem('t2', 'jp-task', 'Bravo', 1), mkItem('t3', 'jp-task', 'Charlie', 2), mkItem('i1', 'jp-idea', 'Idea one', 0), mkItem('s1', 'jp-shop', 'Milk', 0)];
  /* a note made from Zab whose pocket name was never stored: the card and the read view show the fallback word */
  db.articles.push({ id: 'zn1', title: 'Made from a pocket', content: '<p>Body</p>', folderIds: [], tags: [], kind: 'general', createdAt: T0, updatedAt: T0, fromJeb: { pocket: '', at: T0 } });
  return db;
};
async function ctxFor(vp, db) {
  const ctx = await browser.newContext(vp.touch ? { viewport: { width: vp.w, height: vp.h }, hasTouch: true, isMobile: true } : { viewport: { width: vp.w, height: vp.h } });
  for (const p of BLOCKED) await ctx.route(p, (r) => r.abort());
  await ctx.addInitScript((d) => { try { if (!localStorage.getItem('my-notebook-v1')) localStorage.setItem('my-notebook-v1', d); } catch {} }, typeof db === 'string' ? db : JSON.stringify(db));
  return ctx;
}
const booted = async (page) => { await page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree')); await sleep(500); };
async function open(vp, path, db = seed()) {
  const ctx = await ctxFor(vp, db);
  const d = { ctx, errors: [] };
  d.page = await ctx.newPage();
  d.page.on('pageerror', (e) => d.errors.push('pageerror: ' + e));
  d.page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR_FAILED/.test(m.text())) d.errors.push('console: ' + m.text()); });
  await d.page.goto(srv.base + path, { waitUntil: 'domcontentloaded' });
  await booted(d.page);
  return d;
}
const on = (d, fn, arg) => d.page.evaluate(fn, arg);
const act = (d, vp, sel) => (vp.touch ? d.page.locator(sel).first().tap() : d.page.locator(sel).first().click());
const chip = (pid) => `#jeb-bar .jeb-chip[data-pid="${pid}"] .jeb-main`;

/* every string the owner could read or hover: rendered text nodes, then title / aria-label / placeholder / alt */
const collect = () => {
  const out = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const el = n.parentElement; if (!el || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(el.tagName)) continue;
    const t = n.nodeValue.trim(); if (!t) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || !el.getClientRects().length) continue;
    out.push(t);
  }
  for (const el of document.querySelectorAll('[title],[aria-label],[placeholder],[alt]')) for (const a of ['title', 'aria-label', 'placeholder', 'alt']) { const v = el.getAttribute(a); if (v) out.push(v); }
  out.push(document.title);
  return out;
};
const tally = [];
async function sweep(d, label, mustHave) {
  const strs = await on(d, collect);
  const bad = [...new Set(strs.filter((s) => OLD.test(s)))];
  check(bad.length === 0, `${label}: no "Jeb" in ${strs.length} visible strings`, bad.slice(0, 3).join(' | '));
  if (mustHave) check(strs.some((s) => mustHave.test(s)), `${label}: the surface is really open (shows ${mustHave})`, strs.slice(0, 5).join(' | '));
  tally.push({ label, n: strs.length });
}
const reset = (d) => on(d, () => { try { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); } catch {} for (const f of ['_jebHideMenu', '_jebAttClose', 'closeModal', 'closeSBTools', 'closeSyncModal']) { try { window[f](); } catch {} } const tm = document.getElementById('trash-modal'); if (tm) tm.style.display = 'none'; document.querySelectorAll('.toast').forEach((e) => e.remove()); });
const openAll = async (d, vp) => { if (!(await on(d, () => _jebOpen === '*' && _jebMulti && _jebMulti.all))) await act(d, vp, '#jeb-bar .jeb-all .jeb-main'); await sleep(400); };
const openPocket = async (d, vp, pid) => { if (!(await on(d, (p) => _jebOpen === p, pid))) await act(d, vp, chip(pid)); await sleep(400); };
async function longPress(d, vp, sel) {
  if (!vp.touch) { await d.page.locator(sel).first().click({ button: 'right' }); return; }
  const r = await on(d, (s) => { const b = document.querySelector(s).getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, sel);
  const s = await d.ctx.newCDPSession(d.page);
  await s.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y }] }); await sleep(800);
  await s.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

try {
  /* ══ 66a — the sweep ══ */
  if (want('66a')) for (const vp of VPS) for (const mode of ['full', 'zab']) {
    const isZ = mode === 'zab', t = `66a@${vp.name} ${isZ ? '/?jeb=1' : '/'}`;
    const d = await open(vp, isZ ? '/?jeb=1' : '/');
    try {
      await reset(d);
      if (isZ) await sweep(d, `${t} Zab-mode header`, /Siyagah Zab/);
      await sweep(d, `${t} the bar and the panel as opened`, /Quick tasks/);
      await openPocket(d, vp, 'jp-task');
      await sweep(d, `${t} single panel`, /Alpha/);
      await openAll(d, vp);
      await sweep(d, `${t} All pockets`, /All pockets/);
      /* ☑ Choose */
      await act(d, vp, '#jeb-bar .jeb-choose'); await sleep(300);
      await sweep(d, `${t} ☑ Choose`, /Cancel/);
      await act(d, vp, '#jeb-bar .jeb-choose'); await sleep(300);
      /* ▦ the deck */
      await act(d, vp, '#jeb-bar .jeb-chip[data-pid="jp-task"] [data-jeb-cards]'); await d.page.waitForSelector('#jeb-deck.on', { timeout: 4000 }); await sleep(1300);
      await sweep(d, `${t} ▦ the deck`, /Alpha/);
      await on(d, () => { try { jebCloseDeckUser ? jebCloseDeckUser() : jebCloseDeck(); } catch { try { jebCloseDeck(); } catch {} } }); await sleep(500);
      /* 📎 Attach, all four tabs */
      await openPocket(d, vp, 'jp-task');
      await act(d, vp, '#jeb-panel .jeb-it[data-iid="t1"] .jeb-att-b'); await d.page.waitForSelector('#jeb-att', { timeout: 3000 }); await sleep(300);
      for (const [tab, re] of [['folder', /Folder/], ['tag', /Tag/], ['kind', /Note Type/], ['journal', /Journal/]]) {
        await act(d, vp, `#jeb-att [data-tab="${tab}"]`); await sleep(250);
        await sweep(d, `${t} 📎 Attach · ${tab} tab`, re);
      }
      await reset(d);
      /* the item ⋯ menu, and its Move submenu */
      await openPocket(d, vp, 'jp-task');
      await act(d, vp, '#jeb-panel .jeb-it[data-iid="t2"] .jeb-more'); await d.page.waitForSelector('#jeb-menu', { timeout: 3000 });
      await sweep(d, `${t} item ⋯ menu`, /Attach/);
      await d.page.locator('#jeb-menu .jm', { hasText: 'Move to pocket' }).first().click(); await sleep(250);
      await sweep(d, `${t} item ⋯ → Move to pocket`, /Back/);
      await reset(d);
      /* the pocket menu (right-click / long-press), and its two dialogs */
      await longPress(d, vp, chip('jp-idea')); await d.page.waitForSelector('#jeb-menu', { timeout: 3000 });
      await sweep(d, `${t} pocket menu (${vp.touch ? 'long-press' : 'right-click'})`, /Icon & colour/);
      await d.page.locator('#jeb-menu .jm', { hasText: 'Icon & colour' }).first().click(); await sleep(400);
      await sweep(d, `${t} Icon & colour dialog`, /Icon & colour/);
      await reset(d);
      await act(d, vp, '#jeb-bar .jeb-new'); await sleep(400);
      await sweep(d, `${t} New pocket dialog`, /New pocket/);
      await reset(d);
      /* Trash holding a deleted item (real ⋯ → Delete) */
      await openPocket(d, vp, 'jp-task');
      await act(d, vp, '#jeb-panel .jeb-it[data-iid="t3"] .jeb-more'); await d.page.waitForSelector('#jeb-menu');
      await d.page.locator('#jeb-menu .jm', { hasText: 'Delete' }).first().click(); await sleep(500);
      await sweep(d, `${t} the "Moved to Trash" toast`, /Trash/);
      await on(d, () => openTrash()); await sleep(500);
      await sweep(d, `${t} Trash holding a deleted item`, /Zab item: Charlie/);
      await reset(d);
      /* → Note and its toast */
      await openPocket(d, vp, 'jp-task');
      await act(d, vp, '#jeb-panel .jeb-it[data-iid="t1"] .jeb-note-b'); await sleep(700);
      await sweep(d, `${t} → Note's toast`, /note|Note/);
      const nid = await on(d, () => (DB.articles.find((a) => a.fromJeb && a.fromJeb.pocket) || {}).id);
      check(!!nid, `${t} → Note made a note carrying its pocket name`, String(nid));
      await reset(d);
      /* 🎨 Appearance */
      if (!isZ) { await act(d, vp, '#sb-tools-btn'); await sleep(400); await sweep(d, `${t} 🧰 menu`, /Siyagah Zab/); await d.page.locator('#sb-tools .sb-mi', { hasText: 'Appearance' }).first().click(); }
      else await on(d, () => openTheme());
      await sleep(600);
      await sweep(d, `${t} 🎨 Appearance`, /Show Zab bar/);
      await reset(d);
      if (!isZ) {
        /* the Smart View, and a note made from Zab: Pane 2 card, read view */
        await on(d, () => { selFolder('sf-jeb'); }); await sleep(600);
        await sweep(d, `${t} Smart View "From Zab"`, /From Zab/);
        await sweep(d, `${t} Pane 2 card of a note made from Zab`, /from Zab/);
        await on(d, () => { selArt('zn1'); }); await sleep(700);
        await sweep(d, `${t} read view of a note made from Zab`, /from Zab/);
        await on(d, () => { selFolder('sf-jeb'); }); await sleep(300);
        await sweep(d, `${t} Smart View listing`, /From Zab/);
      }
      check(d.errors.length === 0, `${t} no page errors`, d.errors.slice(0, 2).join(' · '));
    } finally { await d.ctx.close(); }
  }

  /* ══ 66b — the manifest, the title ══ */
  if (want('66b')) {
    const vp = VPS[2], t = '66b@1440';
    const d = await open(vp, '/?jeb=1');
    try {
      const s = await d.ctx.newCDPSession(d.page); await s.send('Page.enable');
      const man = await s.send('Page.getAppManifest');
      let j = {}; try { j = JSON.parse(man.data); } catch {}
      check(j.name === 'Siyagah Zab' && j.short_name === 'Zab', `${t} Chrome reads the Zab manifest: name "Siyagah Zab", short name "Zab"`, JSON.stringify({ name: j.name, short: j.short_name }));
      check(!OLD.test(j.description || ''), `${t} the manifest description has no "Jeb"`, j.description);
      check(j.id === '/?jeb=1' && j.start_url === '/?jeb=1' && /manifest-jeb\.json$/.test(man.url), `${t} the manifest file, id and start_url are unchanged`, JSON.stringify({ id: j.id, start: j.start_url, url: man.url }));
      const h = await on(d, () => ({ title: document.title, ati: document.querySelector('meta[name="apple-mobile-web-app-title"]').content }));
      check(h.title === 'Siyagah Zab' && h.ati === 'Zab', `${t} document.title "Siyagah Zab", apple-mobile-web-app-title "Zab"`, JSON.stringify(h));
      const f = await open(vp, '/');
      try { check((await on(f, () => document.title)) === 'My Knowledge Notebook', `${t} the full app's title is unchanged`); } finally { await f.ctx.close(); }
    } finally { await d.ctx.close(); }
  }

  /* ══ 66c — no migration: what is stored is byte-identical after booting ══ */
  if (want('66c')) {
    /* A boot rewrites the stored copy anyway (it adds keys), so "identical" is measured against the build that came
       before: the same v05.04 notebook is booted by v05.04's own index.html (git, ddc86d6) and by this one, and what each
       leaves in storage must match byte for byte. The Zab collections must also be exactly what was seeded. */
    const { mkdtemp, writeFile } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const { execFileSync } = await import('node:child_process');
    const dir = await mkdtemp(join(tmpdir(), 'zab-old-'));
    await writeFile(join(dir, 'index.html'), execFileSync('git', ['show', 'ddc86d6:index.html'], { maxBuffer: 1 << 28 }));
    const osrv = await serve(dir);
    try {
      for (const vp of VPS) for (const path of ['/', '/?jeb=1']) {
        const t = `66c@${vp.name} ${path}`;
        const S = JSON.stringify(seed());
        const stored = async (base) => {
          const ctx = await ctxFor(vp, S); const page = await ctx.newPage(); const errs = [];
          page.on('pageerror', (e) => errs.push(String(e)));
          try { await page.goto(base + path, { waitUntil: 'domcontentloaded' }); await booted(page); await sleep(2500); return { raw: await page.evaluate(() => localStorage.getItem('my-notebook-v1')), errs }; } finally { await ctx.close(); }
        };
        const was = await stored(osrv.base), now = await stored(srv.base);
        const strip = (s) => JSON.stringify(JSON.parse(s), (k, v) => (/^(ver|savedAt|lastSaved)$/.test(k) ? 0 : v));
        /* the clock times a boot stamps itself (_folderNoteRecoveryV1.at, noteKinds' stamps) differ run to run in any build */
        const clock = (s) => (s || '{}').replace(/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z/g, 'T');
        const pa = JSON.parse(clock(was.raw)), pb = JSON.parse(clock(now.raw));
        const dk = [...new Set([...Object.keys(pa), ...Object.keys(pb)])].filter((k) => JSON.stringify(pa[k]) !== JSON.stringify(pb[k]));
        check(was.raw && now.raw && !dk.length, `${t} v05.05 leaves the same bytes in storage as v05.04 does (${(now.raw || '').length} bytes)`, 'differs in: ' + dk.map((k) => k + '=' + JSON.stringify(pa[k]).slice(0, 60) + ' vs ' + JSON.stringify(pb[k]).slice(0, 60)).join('; '));
        const a = JSON.parse(S), b = JSON.parse(now.raw || '{}');
        const same = ['jeb', 'jebPockets', 'articles', 'folders', 'trash'].filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
        check(same.length === 0, `${t} the Zab pockets and items, the notes, folders and Trash are exactly as seeded`, same.join());
        check(now.errs.length === 0, `${t} no page errors`, now.errs.slice(0, 2).join(' · '));
      }
    } finally { await osrv.close(); }
  }

  /* ══ 66d — typed names are shown as typed ══ */
  if (want('66d')) {
    const vp = VPS[2], t = '66d@1440';
    const db = seed(); db.jebPockets.find((p) => p.id === 'jp-idea').name = 'Jeb stuff';
    const d = await open(vp, '/', db);
    try {
      const names = await on(d, () => [...document.querySelectorAll('#jeb-bar .jeb-chip .jeb-main')].map((e) => e.textContent));
      check(names.some((n) => /Jeb stuff/.test(n)) && (await on(d, () => DB.jebPockets.find((p) => p.id === 'jp-idea').name)) === 'Jeb stuff', `${t} a pocket the owner named "Jeb stuff" is shown and stored exactly so`, names.join(' | '));
    } finally { await d.ctx.close(); }
  }

  console.log('\nSurfaces swept (' + tally.length + '):');
  for (const x of tally) console.log(`  ${x.label} — ${x.n} strings`);
  console.log(`  total strings checked: ${tally.reduce((a, x) => a + x.n, 0)}`);
} catch (e) {
  console.log(' FAIL  zab-z1 threw: ' + (e && e.stack || e));
  results.push({ ok: false, label: 'threw' });
} finally {
  await browser.close();
  await srv.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
