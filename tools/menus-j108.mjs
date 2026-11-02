#!/usr/bin/env node
/* tools/menus-j108.mjs — v05.65, J108 (block 124). The owner (2 Nov): "Organise all these context menu everywhere."
   Every item menu uses ONE builder (_menuHTML / _menuRows): the groups OPEN · MARK · ORGANISE · REMIND & PRACTISE · DELETE, each under a
   heading that is not a row (role="presentation", never a .ci / .jm), only the groups the menu has. For each menu in the inventory, at
   390 / 820 / 1440, opened with a REAL right-click (or the real ⋯ tap for a Zab item):
   124a the headings are exactly the expected ones, in the agreed order, none of them a tappable row;
   124b every action the v05.64 build had is still there (by the function each row calls; Zab menus by their words);
   124c one row per group is really tapped and reaches its function (the function is spied; the tap is a real click) and sits under the
        heading it should;
   124d the menu is inside the screen after it has opened;
   124e no page errors.
   The "before" lists are the v05.64 build's rows, written out here from its source. */
import { openApp, report, seedDB } from './harness.mjs';

const r = report('J108 — organised menus');
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const ORDER = ['OPEN', 'MARK', 'ORGANISE', 'REMIND & PRACTISE', 'DELETE'];

const db = () => {
  const d = seedDB();
  d.theme = { preset: 'forest', custom: {}, zabPhoneLayout: 'bar' };   /* the phone draws the bottom bar, so a Zab chip can be right-clicked there too */
  d.articles[0].tags = ['seed'];
  d.tabs = { a1: ['a2'] };
  return d;
};

/* kind 'ctx' = rows are .ci in #ctx, compared by the function they call; kind 'jeb' = rows are .jm in #jeb-menu, compared by their words */
const MENUS = [
  { name: 'note', kind: 'ctx', heads: ORDER,
    fns: ['startRenameArtTitle', 'duplicateNote', 'openNoteHistory', 'openNotePopup', 'toggleFav', 'togglePin', 'toggleArchive', 'finishNote', '_ctxSub', 'toggleTab', 'openJournalPicker', 'mrjToggle', 'practiceToggle', 'deleteNote'],
    tap: { OPEN: 'duplicateNote', MARK: 'togglePin', ORGANISE: 'toggleTab', 'REMIND & PRACTISE': 'mrjToggle', DELETE: 'deleteNote' },
    open: async (p) => { await p.evaluate(() => { ST.folder = 'f1'; render(); if (innerWidth < 1200) showPane('p2'); }); await sleep(300);
      await p.locator('[oncontextmenu*="showArtCtx"]:visible').first().click({ button: 'right' }); } },
  { name: 'folder', kind: 'ctx', heads: ORDER,
    fns: ['openModal', 'openFolderWin', 'setFolderPin', 'autoNumberAll', 'offerRenumberManual', 'convertFolderToSection', 'toggleFolderStructured', 'openDbFolderBuilder', 'toggleJournalMode', 'confirmDel'],
    tap: { OPEN: 'openFolderWin', MARK: 'setFolderPin', ORGANISE: 'autoNumberAll', 'REMIND & PRACTISE': 'toggleJournalMode', DELETE: 'confirmDel' },
    open: async (p) => { await p.evaluate(() => { if (innerWidth < 1200) showPane('sb'); ST.secOpen['sec-1'] = true; renderTree(); }); await sleep(300);
      await p.locator('.tr-row[data-fid="f1"]').first().click({ button: 'right' }); } },
  { name: 'section', kind: 'ctx', heads: ['OPEN', 'MARK', 'ORGANISE'],
    fns: ['startRenSec', 'openSecWin', 'addFolderInSec'],
    tap: { OPEN: 'openSecWin', ORGANISE: 'addFolderInSec' },
    open: async (p) => { await p.evaluate(() => { if (innerWidth < 1200) showPane('sb'); render(); }); await sleep(300);
      await p.locator('[oncontextmenu*="showSecCtx"]').first().click({ button: 'right' }); } },
  { name: 'tag', kind: 'ctx', heads: ['OPEN', 'DELETE'],
    fns: ['renameTag', 'deleteTag'], tap: { OPEN: 'renameTag', DELETE: 'deleteTag' },
    open: async (p) => { await p.evaluate(() => { if (innerWidth < 1200) showPane('sb'); ST.tagOpen = true; renderTree(); }); await sleep(300);
      await p.locator('[oncontextmenu*="showTagCtx"]').first().click({ button: 'right' }); } },
  { name: 'tags section', kind: 'ctx', heads: ['OPEN', 'MARK', 'ORGANISE'],
    fns: ['promptAddGlobalTag', 'renameTagSection'], tap: { OPEN: 'renameTagSection', ORGANISE: 'promptAddGlobalTag' },
    open: async (p) => { await p.evaluate(() => { if (innerWidth < 1200) showPane('sb'); render(); }); await sleep(300);
      await p.locator('[oncontextmenu*="showTagSecCtx"]').first().click({ button: 'right' }); } },
  { name: 'Smart Views section', kind: 'ctx', heads: ['OPEN', 'MARK'],
    fns: ['startRenSmartViews'], tap: { OPEN: 'startRenSmartViews' },
    open: async (p) => { await p.evaluate(() => { if (innerWidth < 1200) showPane('sb'); render(); }); await sleep(300);
      await p.locator('[oncontextmenu*="showSmartViewCtx"]').first().click({ button: 'right' }); } },
  { name: 'Smart View row', kind: 'ctx', heads: ['OPEN', 'MARK', 'ORGANISE'],
    fns: ['renameSfItem', 'moveSfItem'], tap: { OPEN: 'renameSfItem', ORGANISE: 'moveSfItem' },
    open: async (p) => { await p.evaluate(() => { if (innerWidth < 1200) showPane('sb'); ST.sfOpen = true; renderTree(); }); await sleep(300);
      await p.locator('[oncontextmenu*="showSfItemCtx"]:visible').first().click({ button: 'right' }); } },
  { name: 'tab', kind: 'ctx', heads: ['OPEN', 'MARK'],
    fns: ['renameTab', 'openTabClrPicker'], tap: { OPEN: 'renameTab', MARK: 'openTabClrPicker' },
    open: async (p) => { await p.evaluate(() => { ST.tabOwner = 'a1'; ST.folder = 'f1'; selArt('a1'); if (innerWidth < 1200) showPane('p3'); render(); }); await sleep(400);
      await p.locator('.tab-it[data-tid]:visible, .eb-tab-row[data-tid]:visible').first().click({ button: 'right' }); } },
  { name: 'Zab (pocket)', kind: 'jeb', heads: ['OPEN', 'MARK', 'ORGANISE', 'DELETE'],
    labels: ['Rename', 'Icon & colour', 'Move into…', 'New Zab inside', 'Zab kind', 'Move left', 'Move right', 'Clear done items', 'In the scrolling titles', 'Zab settings…', 'Delete Zab'],
    tap: { OPEN: ['Zab settings…', 'openZabSettings'], MARK: ['In the scrolling titles', '_zabTkToggle'], ORGANISE: ['Move into…', '_jebMoveIntoOpen'], DELETE: ['Delete Zab', 'jebDeletePocket'] },
    /* the bar folds its chips away on a phone (only "All Zabs" is left), so there the real tap is the open Zab's ⋯ in its panel */
    open: async (p) => { const phone = await p.evaluate(() => innerWidth < 640);
      if (phone) { await p.evaluate(() => { jebOpenPanel('jp-task'); jebRefresh(); }); await sleep(400); await p.locator('#jeb-panel .jeb-pm').first().click(); return; }
      await p.evaluate(() => { jebClosePanel && jebClosePanel(); jebRefresh(); }); await sleep(300);
      await p.locator('#jeb-bar .jeb-chip[data-pid]:visible').first().click({ button: 'right' }); } },
  { name: 'Zab item', kind: 'jeb', heads: ORDER,
    labels: ['Done', 'Edit', 'Due…', 'High priority', 'Steps…', 'Title…', 'Attach', '→ Note', 'Move to Zab', 'Delete'],
    tap: { OPEN: ['Edit', '_jebStartEdit'], MARK: ['Done', 'jebToggleDone'], ORGANISE: ['→ Note', '_jebToNoteUI'], 'REMIND & PRACTISE': ['Due…', '_jebDueOpen'], DELETE: ['Delete', 'jebDeleteItem'] },
    open: async (p) => { await p.evaluate(() => { jebAddItem('jp-task', 'Pay the bill'); jebOpenPanel('jp-task'); jebRefresh(); }); await sleep(500);
      await p.locator('#jeb-panel .jeb-it .jeb-more').first().click(); } },
];

const clean = (p) => p.evaluate(() => { try { hideCtx(); } catch (e) {} try { _jebHideMenu(); } catch (e) {} });
const read = (p, kind) => p.evaluate((kind) => {
  const m = document.getElementById(kind === 'ctx' ? 'ctx' : 'jeb-menu');
  if (!m || (kind === 'ctx' && getComputedStyle(m).display === 'none')) return { open: false };
  const hs = [...m.querySelectorAll(kind === 'ctx' ? '.ctx-gh' : '.jm-h')];
  const rows = [...m.querySelectorAll(kind === 'ctx' ? '.ci' : '.jm')];
  const b = m.getBoundingClientRect();
  return { open: true, heads: hs.map((h) => h.textContent.trim()),
    headBad: hs.filter((h) => h.getAttribute('role') !== 'presentation' || h.classList.contains('ci') || h.classList.contains('jm') || h.onclick || h.getAttribute('onclick')).length,
    fns: kind === 'ctx' ? [...new Set(rows.flatMap((x) => [...(x.getAttribute('onclick') || '').matchAll(/\b([A-Za-z_]\w*)\(/g)].map((q) => q[1])))].filter((f) => !['hideCtx', 'stopPropagation', 'event'].includes(f)) : [],
    texts: kind === 'jeb' ? rows.map((x) => x.textContent.trim()) : [],
    rect: { l: b.left, t: b.top, r: b.right, b: b.bottom }, vw: innerWidth, vh: innerHeight };
}, kind);

for (const [w, h] of [[390, 844], [820, 1180], [1440, 900]]) {
  const app = await openApp({ viewport: { width: w, height: h }, db: db() });
  const page = app.page, t = `@${w}`;
  await sleep(500);
  for (const M of MENUS) {
    const id = `${M.name}${t}`;
    /* the tab strip is not drawn under 640 px (a phone's tabs live in the edit bar's pop-up), so there is no tab to right-click there;
       the same menu is covered at 820 and 1440 and its builder is the one every other menu uses */
    if (M.name === 'tab' && w < 640) continue;
    try {
      await clean(page); await M.open(page); await sleep(450);
      const s = await read(page, M.kind);
      if (!s.open) { r.check(false, `124a ${id} the menu opened from a real right-click`, 'not open'); continue; }
      r.check(JSON.stringify(s.heads) === JSON.stringify(M.heads) && s.headBad === 0,
        `124a ${id} headings in the agreed order, none of them a row`, `${s.heads.join(' · ')} (not rows: ${s.headBad === 0})`);
      const missing = M.kind === 'ctx' ? M.fns.filter((f) => !s.fns.includes(f)) : M.labels.filter((l) => !s.texts.some((x) => x.includes(l)));
      r.check(missing.length === 0, `124b ${id} every v05.64 action is still there`, missing.length ? 'missing: ' + missing.join(', ') : `${M.kind === 'ctx' ? s.fns.length + ' functions' : s.texts.length + ' rows'}`);
      const R = s.rect;
      r.check(R.l >= -1 && R.t >= -1 && R.r <= s.vw + 1 && R.b <= s.vh + 1, `124d ${id} the menu is inside the screen`, JSON.stringify({ ...R, vw: s.vw, vh: s.vh }));
      /* one real tap per group */
      for (const [grp, spec] of Object.entries(M.tap)) {
        const fn = M.kind === 'ctx' ? spec : spec[1], label = M.kind === 'jeb' ? spec[0] : null;
        await clean(page); await M.open(page); await sleep(400);
        await page.evaluate((fn) => { window.__hits = []; const f = window[fn]; if (typeof f === 'function') window[fn] = function () { window.__hits.push(fn); }; }, fn);
        let under = null;
        if (M.kind === 'ctx') {
          under = await page.evaluate((fn) => { const row = [...document.querySelectorAll('#ctx .ci')].find((x) => (x.getAttribute('onclick') || '').includes(fn + '(')); if (!row) return null; let e = row.previousElementSibling; while (e && !e.classList.contains('ctx-gh')) e = e.previousElementSibling; return e ? e.textContent.trim() : ''; }, fn);
          await page.locator(`#ctx .ci[onclick*="${fn}("]`).first().click();
        } else {
          under = await page.evaluate((label) => { const row = [...document.querySelectorAll('#jeb-menu .jm')].find((x) => x.textContent.includes(label)); if (!row) return null; let e = row.previousElementSibling; while (e && !e.classList.contains('jm-h')) e = e.previousElementSibling; return e ? e.textContent.trim() : ''; }, label);
          await page.locator('#jeb-menu .jm', { hasText: label }).first().click();
        }
        await sleep(250);
        const hits = await page.evaluate(() => window.__hits || []);
        r.check(under === grp && hits.includes(fn), `124c ${id} a real tap on “${fn}” (${grp}) reaches it`, `under “${under}” · calls ${JSON.stringify(hits)}`);
        await app.page.reload(); await sleep(900);
      }
    } catch (e) { r.check(false, `124 ${id} threw`, String(e && e.stack || e).slice(0, 400)); }
  }
  r.check(app.errors.length === 0, `124e${t} no page errors`, app.errors.slice(0, 3).join(' | '));
  await app.close();
}
process.exit(r.finish() ? 1 : 0);
