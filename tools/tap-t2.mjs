#!/usr/bin/env node
/* tools/tap-t2.mjs — v05.30, T2: every tappable control on a PHONE (< 640) has a hit area of at least 44 × 44 px (PCF J42, the owner's
   choice A). Tablet and laptop do not change. Checks 90a–90e.

   90a  44 px   at 360 and 390, on each main surface (sidebar, note list, open note read + edit, Smart Views, search, Trash, 🧰 / settings menus,
                section ⋯ menu, note ⋯ menu, Appearance, Zab panel + All pockets + each pocket kind, calendar, pop-up note): every visible tappable
                element is >= 44 x 44. Reasons for the few allowed exceptions are in EXCEPT below and printed in the check's own text.
   90b  hit     the same elements: elementFromPoint at the centre and 2 px inside each edge returns the control or something inside it
   90c  fit     no horizontal overflow (scrollWidth <= clientWidth) at 360 / 390 on those surfaces; no two targets overlap
   90d  same    820 and 1440: the boxes of the same surfaces' tappable elements equal the v05.28 build's (the parent of the "v05.30 T2: version bump"
                commit, served beside this one), compared like 75d does
   90e  no page errors.   Printed, not asserted: how many note-list cards and folder-tree rows fit on 390 x 844, before and after.

   `--only=90a,90d` runs just those; `--unpatched` serves the v05.28 build as the build under test (so 90a–90c must FAIL). Each ok/FAIL line
   becomes one app-check check. */
import { z12Words } from './z12-words.mjs';
import { playwright, serve, seedDB } from './harness.mjs';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function check(ok, label, detail = '') { results.push({ ok, label }); console.log((ok ? '  ok   ' : ' FAIL  ') + label + (detail ? '\n         ' + detail : '')); }

function makeBase() {
  const dir = mkdtempSync(join(tmpdir(), 't2-base-'));
  const sha = execFileSync('git', ['log', '--format=%H', '-n', '1', '--grep=Merge pull request #206'], { encoding: 'utf8' }).trim(); /* v05.29, the build on main before this round */
  if (!sha) throw new Error('the v05.29 build ("Merge pull request #206") is not in this clone - fetch more history (git fetch --unshallow)');   /* never compare the build with itself */
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', `${sha}:${f}`], { encoding: 'buffer', maxBuffer: 1 << 28 })); } catch {} }
  /* v05.34 (Z12), updated in place by the Architect: the owner's word is "Zab" now ("All Zabs" is narrower than "All pockets"), so the older build gets the same word
     changes (tools/z12-words.mjs) before it is compared; every other difference still fails. */
  try { const f = join(dir, 'index.html'); writeFileSync(f, z12Words(readFileSync(f, 'utf8'))); } catch {}
  return dir;
}
const pw = await playwright();
const baseDir = makeBase();
const srvBase = await serve(baseDir);
const srv = argv.includes('--unpatched') ? srvBase : await serve();
const browser = await pw.chromium.launch();

const T0 = '2026-10-01T00:00:00.000Z';
function seed() {
  const db = seedDB(T0);
  /* enough notes and folders to fill a phone screen, and one note in the Trash so its buttons exist */
  for (let i = 0; i < 14; i++) db.articles.push({ id: 'n' + i, title: 'Filler note ' + i, content: '<p>Filler ' + i + '</p>', folderIds: ['f1'], tags: [], createdAt: T0, updatedAt: T0, kind: 'general' });
  for (let i = 0; i < 8; i++) db.folders.push({ id: 'fx' + i, name: '(0' + (20 + i) + ') Extra ' + i, parentId: null, order: 5 + i, sectionId: 'sec-1', updatedAt: T0 });
  db.trash = [{ type: 'article', id: 'tr1', deletedAt: T0, item: { id: 'tr1', title: 'In the Trash', content: '<p>x</p>', folderIds: ['f1'], tags: [], createdAt: T0, updatedAt: T0, kind: 'general' } }];
  const pk = (id, i, extra = {}) => ({ id, name: id, icon: '✶', color: '#CFE8FF', order: i, createdAt: T0, updatedAt: T0, ...extra });
  const mk = (id, pocketId, text, order, extra = {}) => ({ id, pocketId, text, done: false, folderIds: [], tags: [], kind: null, journal: false, order, createdAt: T0, updatedAt: T0, ...extra });
  db.jebPockets = [pk('jp-link', 0, { name: 'Links', icon: '🔗' }), pk('jp-task', 1, { name: 'Tasks', icon: '✅' }), pk('jp-idea', 2, { name: 'Ideas', icon: '💡' }), pk('jp-shop', 3, { name: 'Shopping', icon: '🛒' }), pk('jp-sub', 4, { name: 'Sub', parentId: 'jp-idea' })];
  db.jeb = [mk('l1', 'jp-link', 'https://example.com/a', 0, { url: 'https://example.com/a', title: 'My titled link' }), mk('t1', 'jp-task', 'Call the bank', 0, { due: T0.slice(0, 10), pri: 1, steps: [{ id: 's1', t: 'dial', d: false }] }), mk('i1', 'jp-idea', 'An idea about things', 0, { stars: 2, topics: ['alpha'] }), mk('s1', 'jp-shop', 'Milk', 0, { qty: '2', shop: 'Aldi' }), mk('x1', 'jp-sub', 'inside', 0)];
  return db;
}
async function open(s, w, h, touch, goto) {
  const ctx = await browser.newContext(touch ? { viewport: { width: w, height: h }, hasTouch: true, isMobile: true } : { viewport: { width: w, height: h } });
  for (const p of ['**googleapis.com/**', '**gstatic.com/**', '**firebaseapp.com/**', '**firebaseio.com/**']) await ctx.route(p, (r) => r.abort());
  /* v05.32 (Z10): 90d compares tablet / laptop boxes with the build before, which had no scrolling titles band; the band (block 92) moves the panes up by its height, so it is
     off for those two sizes. The phone sizes keep it ON: 90a–90c measure its titles and settings too. */
  const sd = seed(); if (w >= 640) sd.theme = Object.assign({}, sd.theme, { zabTicker: { on: false } });
  await ctx.addInitScript((d) => { try { if (!localStorage.getItem('my-notebook-v1')) localStorage.setItem('my-notebook-v1', JSON.stringify(d)); } catch {} }, sd);
  /* v05.34 (Z12), updated in place by the Architect: v05.33 (Z11) put a Zab's own note row (`.zn-area`, 44 px) at the top of a leaf Zab's panel, which moves the
     items below it down; like the band above, it is hidden for the two sizes compared with v05.29. Its own size is checked by 93g, and 90a–90c at the phone sizes keep it. */
  if (w >= 640) await ctx.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '.zn-area{display:none!important}'; document.head.appendChild(st); }); });
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e));
  page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR_FAILED/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(s.base + (goto || '/'), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree'));
  await sleep(800);
  return { ctx, page, errors };
}
const tap = async (page, sel) => { const l = page.locator(sel).first(); await l.waitFor({ state: 'visible', timeout: 4000 }); await (page.viewportSize().width < 1000 ? l.tap() : l.click()); await sleep(500); };
const tapText = async (page, text, scope) => { const l = page.locator(scope).locator(`text=${text}`).first(); await l.waitFor({ state: 'visible', timeout: 4000 }); await (page.viewportSize().width < 1000 ? l.tap() : l.click()); await sleep(500); };
const toolsItem = async (p, label) => { await tap(p, '#sb-tools-btn'); await tapText(p, label, '#sb-tools'); };
const menuItem = async (p, label) => { await tap(p, '#sb-menu-btn'); await tapText(p, label, '#sb-menu'); };
const pocket = (id) => async (p) => { await p.evaluate((i) => { _jebOpen = i; jebRefresh(); }, id); await sleep(600); };

/* the surfaces; each opens by real clicks where the owner would click, by the app's own function where the control is out of a test's reach */
const SURF = {
  home: async () => {},
  tools: (p) => tap(p, '#sb-tools-btn'),
  settingsMenu: (p) => tap(p, '#sb-menu-btn'),
  appearance: (p) => toolsItem(p, 'Appearance'),
  backup: (p) => menuItem(p, 'Storage & Backup'),
  trash: (p) => toolsItem(p, 'Trash'),
  search: async (p) => { await p.locator('#sq').first().tap().catch(() => {}); await p.fill('#sq', 'seed'); await sleep(700); },
  sections: async (p) => { for (const h of await p.locator('.sec-hd').all()) { try { await h.click({ timeout: 1500 }); await sleep(200); } catch {} } await sleep(400); },
  secMenu: async (p) => { await p.evaluate(() => { const b = [...document.querySelectorAll('.sec-act')].find((e) => e.textContent.trim() === '⋯' && e.getBoundingClientRect().width > 0); b && b.click(); }); await sleep(500); },
  smartviews: async (p) => { await p.evaluate(() => { ST.sfOpen = true; render(); selFolder('sf-favs'); }); await sleep(500); },
  note: async (p) => { await p.evaluate(() => selArt(DB.articles.find((a) => !a.deleted).id)); await sleep(600); },
  edit: async (p) => { await p.evaluate(() => { selArt(DB.articles.find((a) => !a.deleted).id); startEdit(); }); await sleep(900); },
  noteMenu: async (p) => { await p.evaluate(() => selArt(DB.articles.find((a) => !a.deleted).id)); await sleep(500); await p.evaluate(() => { const b = [...document.querySelectorAll('#p3 button')].find((e) => e.textContent.trim() === '⋯' && e.getBoundingClientRect().width > 0); b && b.click(); }); await sleep(500); },
  popup: async (p) => { await p.evaluate(() => popOutNote(DB.articles.find((a) => !a.deleted).id)); await sleep(900); },
  zabPanel: async (p) => { const c = p.locator('#jeb-bar .jeb-chip[data-pid] .jeb-main, #zab-btn').first(); await c.waitFor({ state: 'visible', timeout: 4000 }); await (p.viewportSize().width < 1000 ? c.tap() : c.click()); await sleep(600); },
  zabAll: async (p) => { await SURF.zabPanel(p); const a = p.locator('.jeb-chip.jeb-all, #zab-lay >> text=All Zabs').first(); await a.waitFor({ state: 'visible', timeout: 4000 }); await (p.viewportSize().width < 1000 ? a.tap() : a.click()); await sleep(600); },
  zabLinks: pocket('jp-link'), zabTasks: pocket('jp-task'), zabIdeas: pocket('jp-idea'), zabShop: pocket('jp-shop'),
  cal: async (p) => { await p.evaluate(() => _calOpen()); await sleep(800); },
};
const PHONE_SURF = Object.keys(SURF);
const WIDE_SURF = ['home', 'tools', 'trash', 'search', 'note', 'edit', 'smartviews', 'zabPanel', 'zabTasks', 'cal'];

/* what is measured, inside the page: every tappable element that is on screen and actually reachable at its centre */
const MEASURE = () => {
  const vw = innerWidth, vh = innerHeight, sel = 'button,a[href],select,input:not([type=hidden]),summary,[onclick],[role=button],label';
  const inEd = (e) => e.closest('.ed,.fw-ed,#ed,[contenteditable=true]');
  /* an open menu, sheet or dialog sits over the rest: while one is open only what is inside it can be tapped */
  const overs = [...document.querySelectorAll('#sb-tools,#sb-menu,#sb-home,#jeb-menu,.modal-bg.open,.modal-overlay.open,.fl-pop,#enx-modal,.jx-mv,#jeb-att,#jeb-due,#ctx,.ci,#jeb-panel,#zab-lay')].map((e) => (e.matches('.ci') ? e.parentElement : e)).filter((e) => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 20 && r.height > 20 && c.display !== 'none' && c.visibility !== 'hidden' && +c.opacity > 0; });
  const els = [...document.querySelectorAll(sel)].filter((e) => !inEd(e) && (!overs.length || overs.some((o) => o.contains(e))));
  const key = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.') : '');
  const text = (e) => (e.innerText || e.title || e.value || '').trim().replace(/\s+/g, ' ').slice(0, 24);
  const rows = [];
  for (const e of els) {
    const r = e.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cx < 0 || cy < 0 || cx > vw || cy > vh) continue; /* off screen (a pane that is not showing) */
    const hit0 = document.elementFromPoint(cx, cy);
    if (!hit0 || !(e === hit0 || e.contains(hit0))) continue; /* covered or not reachable here: not a target on this surface */
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || +cs.opacity === 0 || cs.pointerEvents === 'none') continue;
    /* a label that only wraps a control that is itself in the list, or a container that holds other targets, is not a target of its own */
    if (e.tagName === 'LABEL' && !e.querySelector('input,select,button') && !e.getAttribute('onclick')) continue;
    if (e.matches('[onclick]') && e.querySelectorAll('button,a[href],[onclick],input,select').length && r.height >= 44) continue;
    const t = { key: key(e), text: text(e), x: r.left, y: r.top, w: r.width, h: r.height, edges: [] };
    /* the part of the box that is on the screen (a menu's last row may end at the screen's edge) */
    let L = Math.max(r.left, 0), R = Math.min(r.right, vw), T = Math.max(r.top, 0), B = Math.min(r.bottom, vh);
    for (let p = e.parentElement; p && p !== document.documentElement; p = p.parentElement) { /* …and the part not clipped by a scrolling or clipping parent */
      const c = getComputedStyle(p); if (c.overflowX === 'visible' && c.overflowY === 'visible') continue;
      const q = p.getBoundingClientRect(); L = Math.max(L, q.left); R = Math.min(R, q.right); T = Math.max(T, q.top); B = Math.min(B, q.bottom);
    }
    const mx = (L + R) / 2, my = (T + B) / 2;
    for (const [x, y] of [[mx, my], [L + 2, my], [R - 2, my], [mx, T + 2], [mx, B - 2]]) {
      const h = document.elementFromPoint(x, y);
      /* the floating Zab button sits over the end of a scrolling list on purpose (the list has room below its last row) */
      t.edges.push(!!h && (e === h || e.contains(h) || !!h.closest('#zab-btn')));
    }
    t.input = e.tagName === 'INPUT' ? e.type : '';
    t.labelH = e.tagName === 'INPUT' && e.closest('label') ? e.closest('label').getBoundingClientRect().height : 0;
    t.inline = e.tagName === 'A' && getComputedStyle(e).display === 'inline';
    t.sbRow = !!e.closest('#tree') && e.matches('.sr,.tr-row,.sec-hd');
    rows.push(t);
  }
  /* page-level overflow, and the same for the open overlay */
  const over = document.documentElement.scrollWidth > vw + 1 ? 'page ' + document.documentElement.scrollWidth + ' > ' + vw : '';
  return { rows, over, vw, vh };
};
/* allowed exceptions, each with its reason (printed with the check) */
const EXCEPT = [
  { re: (t) => t.inline, why: 'an address written inside a sentence (an inline link) is as tall as its line of text, as everywhere on the web' },
  { re: (t) => t.input === 'checkbox' || t.input === 'radio', ok: (t) => t.labelH >= 44, why: 'a 20 px drawn tick box is the 44 px target of the label around it' },
  { re: (t) => /^(text|search|number|email|url|password|date|time|range|color)$/.test(t.input), ok: () => true, why: 'a typing/slider field is aimed by its own height, not 44 px wide' },
];
const verdict = (t) => { for (const ex of EXCEPT) if (ex.re(t) && (!ex.ok || ex.ok(t))) return 'exempt'; return t.w >= 43.5 && t.h >= 43.5 ? 'ok' : 'small'; };
const overlaps = (rows) => {
  const out = [];
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
    const a = rows[i], b = rows[j];
    if (a.key.includes('#zab-btn') || b.key.includes('#zab-btn')) continue; /* floating button over a scrolling list: see the hit test */
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ox <= 3 || oy <= 3) continue;
    const inside = (p, q) => p.x >= q.x - 1 && p.y >= q.y - 1 && p.x + p.w <= q.x + q.w + 1 && p.y + p.h <= q.y + q.h + 1;
    if (inside(a, b) || inside(b, a)) continue; /* a control inside a control (a row and its button) */
    out.push(`${a.key} "${a.text}" × ${b.key} "${b.text}" (${Math.round(ox)}×${Math.round(oy)})`);
  }
  return out;
};
async function surfaceRows(s, w, h, touch, names, goto) {
  const out = {}, errors = [];
  for (const name of names) {
    const d = await open(s, w, h, touch, goto);
    try { await SURF[name](d.page); } catch (e) { out[name] = { err: String(e).split('\n')[0] }; await d.ctx.close(); continue; }
    out[name] = await d.page.evaluate(MEASURE);
    errors.push(...d.errors);
    await d.ctx.close();
  }
  return { out, errors };
}

try {
  /* ══ 90a–90c — the phone ══ */
  if (want('90a') || want('90b') || want('90c') || want('90e')) {
    const allErrors = [];
    for (const w of [360, 390]) {
      const { out, errors } = await surfaceRows(srv, w, 844, true, PHONE_SURF);
      allErrors.push(...errors);
      let n = 0, small = [], hitBad = [], exempt = new Set(), overflow = [], ovl = [], notOpened = [];
      for (const [name, m] of Object.entries(out)) {
        if (m.err) { notOpened.push(name + ': ' + m.err); continue; }
        if (m.over) overflow.push(`${name}: ${m.over}`);
        const rows = m.rows.filter((t) => verdict(t) !== 'exempt');
        for (const t of m.rows) if (verdict(t) === 'exempt') exempt.add(EXCEPT.find((ex) => ex.re(t) && (!ex.ok || ex.ok(t))).why);
        n += m.rows.length;
        for (const t of rows) { if (verdict(t) === 'small') small.push(`${name}: ${t.key} "${t.text}" ${Math.round(t.w)}x${Math.round(t.h)}`); else if (t.edges.some((e) => !e)) hitBad.push(`${name}: ${t.key} "${t.text}" edges ${t.edges.map((e) => (e ? 1 : 0)).join('')}`); }
        for (const o of overlaps(rows)) ovl.push(`${name}: ${o}`);
      }
      const uniq = (a) => [...new Set(a)];
      if (want('90a')) {
        check(notOpened.length === 0, `90a (${w}) all ${PHONE_SURF.length} surfaces opened`, notOpened.slice(0, 4).join(' · '));
        check(n > 150, `90a (${w}) ${n} tappable elements measured on ${PHONE_SURF.length} surfaces`);
        check(small.length === 0, `90a (${w}) every tappable element is >= 44 x 44` + (small.length ? ` — ${uniq(small).length} are not` : ''), uniq(small).slice(0, 8).join(' · '));
        console.log('         exceptions allowed: ' + ([...exempt].join('; ') || 'none'));
      }
      if (want('90b')) check(hitBad.length === 0, `90b (${w}) a tap at the centre and 2 px inside each edge lands on the control` + (hitBad.length ? ` — ${uniq(hitBad).length} do not` : ''), uniq(hitBad).slice(0, 8).join(' · '));
      if (want('90c')) {
        check(overflow.length === 0, `90c (${w}) no horizontal overflow on any surface`, overflow.slice(0, 4).join(' · '));
        check(ovl.length === 0, `90c (${w}) no two targets overlap`, uniq(ovl).slice(0, 6).join(' · '));
      }
    }
    if (want('90e')) check(allErrors.length === 0, '90e no page errors on the phone surfaces', allErrors.slice(0, 2).join(' · '));
  }

  /* ══ 90d — tablet and laptop equal v05.28 ══ */
  if (want('90d')) {
    for (const [w, h, touch] of [[820, 1180, true], [1440, 900, false]]) {
      const cur = await surfaceRows(srv, w, h, touch, WIDE_SURF), old = await surfaceRows(srvBase, w, h, touch, WIDE_SURF);
      const diffs = []; let n = 0;
      for (const name of WIDE_SURF) {
        const a = cur.out[name], b = old.out[name];
        if (a.err || b.err) { diffs.push(`${name}: could not open (${a.err || b.err})`); continue; }
        const sig = (m) => m.rows.map((t) => `${t.key}|${t.text.replace(/v\d\d\.\d\d/, 'vX')}|${Math.round(t.x)},${Math.round(t.y)},${Math.round(t.w)}x${Math.round(t.h)}`).sort();
        const A = sig(a), B = sig(b); n += A.length;
        const sa = new Set(A), sb = new Set(B);
        for (const x of A) if (!sb.has(x)) diffs.push(`${name}: now ${x}`);
        for (const x of B) if (!sa.has(x)) diffs.push(`${name}: was ${x}`);
      }
      check(n > 100 && diffs.length === 0, `90d (${w}) the boxes of ${n} tappable elements on ${WIDE_SURF.length} surfaces equal the build before this round's (v05.29)`, diffs.slice(0, 6).join(' · '));
    }
  }

  /* ══ printed, not asserted: how many rows fit on 390 x 844 ══ */
  if (!onlySet || want('90a')) {
    const rowsOn = async (s) => {
      const d = await open(s, 390, 844, true);
      try {
        await SURF.sections(d.page);
        const tree = await d.page.evaluate(() => { const vh = innerHeight; return [...document.querySelectorAll('#tree .tr-row,#tree .sr')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.top >= 0 && r.bottom <= vh; }).length; });
        await d.page.evaluate(() => { const f = DB.folders.find((x) => DB.articles.some((a) => !a.deleted && (a.folderIds || [a.folderId]).includes(x.id))) || DB.folders[0]; selFolder(f.id); openP2 && openP2(); });
        await sleep(600);
        const cards = await d.page.evaluate(() => { const vh = innerHeight; return [...document.querySelectorAll('#p2 .al > .ar')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.top >= 0 && r.bottom <= vh; }).length; });
        return { tree, cards };
      } finally { await d.ctx.close(); }
    };
    const before = await rowsOn(srvBase), after = await rowsOn(srv);
    console.log(`  info  rows fully on a 390 x 844 phone — folder tree: ${before.tree} before, ${after.tree} after · note list cards: ${before.cards} before, ${after.cards} after`);
  }
} catch (e) {
  console.log(' FAIL  t2 threw: ' + (e && e.stack || e));
  results.push({ ok: false, label: 'threw' });
} finally {
  await browser.close();
  await srv.close(); if (srvBase !== srv) await srvBase.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
