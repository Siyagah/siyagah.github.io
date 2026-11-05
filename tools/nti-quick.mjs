#!/usr/bin/env node
/* tools/nti-quick.mjs — v05.70, J116 (block 130). The owner: "Add quick new note button beside the NTI headings."
   A framed ＋ on every Note Type row (MyWall, a folder's MyWall, the side pane's Note Types), built by ONE function (_ntiPlusBtn).
   At 390 / 820 / 1440, a REAL tap/click:
   130a MyWall row: a note with that kind exists, the row did NOT toggle, Pane 3 is editing, the title is focused;
   130b after typing a title and saving, the row's count rose by one and the note is listed under it;
   130c the side pane's NOTE TYPES row does the same (the view does not move);
   130d the row's right-click menu still has "New note here";
   130e the row stays on one line and the tap area is >= 44 px on phone/tablet;
   130f no page errors. */
import { openApp, report, seedDB } from './harness.mjs';

const r = report('J116 — quick new note on Note Type rows');
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

for (const [w, h, touch] of [[390, 844, true], [820, 1180, true], [1440, 900, false]]) {
  const t = `@${w}`;
  const app = await openApp({ viewport: { width: w, height: h }, db: seedDB(), hasTouch: touch });
  const p = app.page;
  const act = async (loc) => (touch ? loc.tap() : loc.click());
  const setup = async (pane) => p.evaluate((pane) => {
    ST.mwCatOpen = {}; noteKindCats().forEach((c) => { ST.mwCatOpen[c.id] = true; }); ST.ntiOpen = true;
    selFolder('sf-mywall'); if (innerWidth < 1200) showPane(pane); renderTree(); renderP2C();
  }, pane);
  const info = () => p.evaluate(() => {
    const row = document.querySelector('.mw-kind[data-kid="general"]');
    return { n: DB.articles.filter((a) => artKinds(a).includes('general')).length, has: !!row, open: row ? row.classList.contains('open') : null,
      cnt: row ? +row.querySelector('.mw-pill-s').textContent : null };
  });
  try {
    await setup('p2'); await sleep(400);
    const before = await info();
    r.check(before.has, `130a${t} MyWall shows the Note Type row`, JSON.stringify(before));
    const btn = p.locator('.mw-kind[data-kid="general"] .nti-plus').first();
    const box = await btn.boundingBox();
    r.check(!!box && (w >= 1200 || (box.width >= 44 && box.height >= 44)), `130e${t} the ＋ is visible, tap area ${box ? Math.round(box.width) + 'x' + Math.round(box.height) : 'none'}`, '');
    const oneLine = await p.evaluate(() => {
      const k = document.querySelector('.mw-kind[data-kid="general"]'); const n = k.querySelector('.mw-kname'), c = k.querySelector('.mw-pill-s'), b = k.querySelector('.nti-plus');
      const mid = (e) => { const q = e.getBoundingClientRect(); return q.top + q.height / 2; };
      return Math.abs(mid(n) - mid(c)) < 6 && Math.abs(mid(b) - mid(c)) < 6 && b.getBoundingClientRect().right <= c.getBoundingClientRect().left + 1;
    });
    r.check(oneLine, `130e${t} name, ＋ and count are on one line, ＋ before the count`, '');
    await act(btn); await sleep(600);
    const s = await p.evaluate(() => {
      const a = DB.articles.filter((x) => artKinds(x).includes('general')); const nw = a.find((x) => !x.title);
      return { made: !!nw, kind: nw && nw.kind, editing: ST.editing, focus: document.activeElement && document.activeElement.id, sf: ST.folder };
    });
    r.check(s.made && s.kind === 'general', `130a${t} a new note with that Note Type exists`, JSON.stringify(s));
    r.check(s.editing && s.focus === 'ti', `130a${t} the editor is open with the title focused`, JSON.stringify(s));
    r.check(s.sf === 'sf-mywall', `130a${t} the view stayed on MyWall`, JSON.stringify(s));
    const mid = await info();
    r.check(mid.open === before.open, `130a${t} the row did not toggle`, JSON.stringify({ before, mid }));
    await p.evaluate(() => { const ti = document.getElementById('ti'); ti.value = 'Quick J116'; ti.dispatchEvent(new Event('input', { bubbles: true })); saveArt(); });
    await sleep(500);
    await p.evaluate(() => { if (innerWidth < 1200) showPane('p2'); ST.sfGrpOpen = ST.sfGrpOpen || {}; ST.sfGrpOpen['sf-mywall|general'] = true; renderP2C(); });
    await sleep(300);
    const after = await p.evaluate(() => {
      const row = document.querySelector('.mw-kind[data-kid="general"]');
      return { cnt: +row.querySelector('.mw-pill-s').textContent, listed: document.querySelector('.mw-wall').textContent.includes('Quick J116') };
    });
    r.check(after.cnt === before.cnt + 1 && after.listed, `130b${t} count ${before.cnt} -> ${after.cnt}, the note is listed under the type`, JSON.stringify(after));

    /* 130c — the side pane's Note Types row */
    await setup('sb'); await sleep(400);
    const n0 = (await info()).n;
    const sb = p.locator('.nti-kind-row[data-kind="general"] .nti-plus').first();
    const sbox = await sb.boundingBox();
    r.check(!!sbox && (w >= 1200 || (sbox.width >= 44 && sbox.height >= 44)), `130e${t} side pane ＋ visible, ${sbox ? Math.round(sbox.width) + 'x' + Math.round(sbox.height) : 'none'}`, '');
    await act(sb); await sleep(600);
    const s2 = await p.evaluate(() => ({ editing: ST.editing, focus: document.activeElement && document.activeElement.id, n: DB.articles.filter((a) => artKinds(a).includes('general')).length, kindSel: ST.kind }));
    r.check(s2.n === n0 + 1 && s2.editing && s2.focus === 'ti' && !s2.kindSel, `130c${t} side pane ＋ makes the note, editing, title focused, no filter set`, JSON.stringify(s2));

    /* 130d — the menu */
    await p.evaluate(() => { if (ST.editing) saveArt(); });
    await setup('p2'); await sleep(300);
    await p.locator('.mw-kind[data-kid="general"]').first().click({ button: 'right' }); await sleep(300);
    const menu = await p.evaluate(() => { const m = document.getElementById('ctx'); return !!m && getComputedStyle(m).display !== 'none' && /New note here/.test(m.textContent); });
    r.check(menu, `130d${t} the right-click menu has "New note here"`, '');
  } catch (e) { r.check(false, `130${t} threw`, String((e && e.stack) || e).slice(0, 500)); }
  r.check(app.errors.length === 0, `130f${t} no page errors`, app.errors.slice(0, 3).join(' | '));
  await app.close();
}
process.exit(r.finish() ? 1 : 0);
