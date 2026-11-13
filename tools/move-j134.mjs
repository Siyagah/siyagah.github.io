#!/usr/bin/env node
/* tools/move-j134.mjs — v05.94, J134 (block 152). The owner: "Enable single and multiple notes to move to a different folder."
   A real MOVE (F leaves, T joins) for one note (menu row) or many (☑ Choose, Ctrl/Shift-click, drag), and "Also add".
   At 390 / 820 / 1440:
   152a ⋯ 📂 Move to folder… (right-click at 1440, a real long-press at 390/820): F -> T, the note's other folder stays; F is greyed; no Top level row
   152b Choose: 3 ticked (taps at 390/820; Ctrl-click + Shift-click at 1440) never open a note; Move -> all 3 in T, out of F; Undo puts all back; ONE undo frame
   152c Also add: the 3 are in F and T
   152d (1440) drag: an unticked card moves itself; a ticked card carries every ticked note; Ctrl = add; the ghost's words change
   152e (1440) a 2,000-note folder (windowed): Select all (2000) -> Move -> 2,000 in T, ONE persist, no long task over 200 ms x host factor; a card scrolled into view shows its tick
   152f from a tag view Move gives exactly [T] after a line that names what they leave
   152g sync: a move on device A merged into a stale B, and the reverse, gives the same folders; nothing else in the notes changed
   152h the Choose bar is not under the Zab bar (390), fits at 360; Escape ends Choose; no page errors */
import { openApp, report, seedDB, hostLimit } from './harness.mjs';

const r = report('J134 — move one note, or many, to another folder');
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const OLD = '2026-01-01T00:00:00.000Z';

function db(extra = 0) {
  const d = seedDB(OLD);
  d.folders = [
    { id: 'fF', name: 'From', parentId: null, order: 1, sectionId: 'sec-1', updatedAt: OLD },
    { id: 'fT', name: 'Target', parentId: null, order: 2, sectionId: 'sec-1', updatedAt: OLD },
    { id: 'fX', name: 'Other', parentId: null, order: 3, sectionId: 'sec-1', updatedAt: OLD },
  ];
  d.articles = [];
  for (let i = 1; i <= 6; i++) {
    d.articles.push({ id: 'n' + i, title: 'Move note ' + i, content: '<p>Body ' + i + '</p>', folderIds: i === 1 ? ['fF', 'fX'] : (i === 2 ? ['fX'] : ['fF']),
      tags: i <= 3 ? ['tg'] : [], createdAt: OLD, updatedAt: new Date(Date.parse(OLD) + (7 - i) * 1000).toISOString(), kind: 'general' });
  }
  for (let i = 0; i < extra; i++) d.articles.push({ id: 'b' + i, title: 'Bulk ' + i, content: '<p>x</p>', folderIds: ['fF'], tags: [], createdAt: OLD, updatedAt: new Date(Date.parse(OLD) - i * 1000).toISOString(), kind: 'general' });
  return d;
}
const fids = (p, id) => p.evaluate((id) => (DB.articles.find((a) => a.id === id) || {}).folderIds, id).then((x) => (x || []).slice().sort().join(','));
const goF = (p) => p.evaluate(() => { ST.tag = null; ST.kind = null; ST.secSF = null; selFolder('fF'); if (innerWidth < 1200) showPane('p2'); renderP2C(); });
const card = (p, id) => p.locator(`#p2c .ar[data-aid="${id}"]`).first();

async function longPress(p, id) {
  await p.evaluate((id) => {
    const c = document.querySelector(`#p2c .ar[data-aid="${id}"]`); const q = c.getBoundingClientRect();
    const t = new Touch({ identifier: 7, target: c, clientX: q.left + 30, clientY: q.top + q.height / 2 });
    c.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [t], targetTouches: [t], changedTouches: [t] }));
  }, id);
  await sleep(800);
  await p.evaluate((id) => {
    const c = document.querySelector(`#p2c .ar[data-aid="${id}"]`);
    c.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [] }));
  }, id);
}
async function menuMove(p, id, touch) {
  if (touch) await longPress(p, id); else await card(p, id).click({ button: 'right' });
  await sleep(300);
  await p.locator('#ctx .ci', { hasText: 'Move to folder' }).first().click();
  await sleep(300);
}
const pickRow = async (p, name) => { await p.locator('#mv-l .pr', { hasText: name }).first().click(); await sleep(500); };

for (const [w, h, touch] of [[390, 844, true], [820, 1180, true], [1440, 900, false]]) {
  const t = `@${w}`;
  const app = await openApp({ viewport: { width: w, height: h }, db: db(), hasTouch: touch });
  const p = app.page;
  const act = async (loc) => (touch ? loc.tap() : loc.click());
  try {
    await sleep(500); await goF(p); await sleep(400);

    /* 152a — one note, from the menu */
    await menuMove(p, 'n1', touch);
    const rows = await p.evaluate(() => Array.from(document.querySelectorAll('#mv-l .pr')).map((x) => ({ t: x.textContent, off: x.classList.contains('af-off') })));
    r.check(rows.length === 3 && !rows.some((x) => /Top level/.test(x.t)), `152a${t} the picker lists the folders and has no Top level row`, JSON.stringify(rows));
    r.check(rows.some((x) => x.off && /From/.test(x.t) && /here now/.test(x.t)) && rows.filter((x) => x.off).length === 1, `152a${t} the folder the note is in view of is greyed ("it is here now")`, JSON.stringify(rows));
    await pickRow(p, 'Target');
    r.check(await fids(p, 'n1') === 'fT,fX', `152a${t} n1 moved From -> Target and kept Other`, await fids(p, 'n1'));
    const ts = await p.evaluate(() => (DB.articles.find((a) => a.id === 'n1') || {}).updatedAt);
    r.check(ts > OLD, `152a${t} the moved note got a new updatedAt`, ts);
    r.check(await p.evaluate(() => /Moved 1 note to Target/.test(document.querySelector('.toast-act')?.textContent || '')), `152a${t} the toast says what happened`, '');
    await p.evaluate(() => undo()); await sleep(300);
    r.check(await fids(p, 'n1') === 'fF,fX', `152a${t} Undo puts n1 back`, await fids(p, 'n1'));

    /* 152b — Choose */
    await goF(p); await sleep(300);
    const tick3 = async () => {
      if (touch) {
        await act(p.locator('.jm-choose').first()); await sleep(300);
        for (const id of ['n3', 'n4', 'n5']) { await act(card(p, id)); await sleep(150); }
      } else {
        await card(p, 'n3').click({ modifiers: ['Control'] }); await sleep(250);
        await card(p, 'n5').click({ modifiers: ['Shift'] }); await sleep(250);
      }
    };
    await tick3();
    const st = await p.evaluate(() => ({ on: _jm.on, ids: Array.from(_jm.set).sort().join(','), art: ST.article, ed: ST.editing, cls: document.documentElement.classList.contains('jm-on'), boxes: document.querySelectorAll('#p2c .ar.jm-on').length }));
    r.check(st.on && st.ids === 'n3,n4,n5' && !st.art && !st.ed, `152b${t} 3 cards ticked, no note opened`, JSON.stringify(st));
    r.check(st.boxes === 3 && st.cls, `152b${t} each ticked card shows its tick`, JSON.stringify(st));
    const barTxt = await p.evaluate(() => (document.querySelector('#jm-bar')?.textContent || '') + '|' + (document.querySelector('#jm-top')?.textContent || ''));
    r.check(/3 chosen/.test(barTxt) && /Move to folder/.test(barTxt) && /Also add to folder/.test(barTxt) && /Select all \(5\)/.test(barTxt), `152b${t} the bar says "3 chosen · Move · Also add · Select all (5)"`, barTxt);
    const h0 = await p.evaluate(() => HIST_POS);
    await act(p.locator('.jm-b', { hasText: 'Move to folder' }).first()); await sleep(300);
    await pickRow(p, 'Target');
    r.check(await fids(p, 'n3') === 'fT' && await fids(p, 'n4') === 'fT' && await fids(p, 'n5') === 'fT', `152b${t} all 3 are in Target and out of From`, [await fids(p, 'n3'), await fids(p, 'n4'), await fids(p, 'n5')].join(' '));
    r.check(await fids(p, 'n6') === 'fF', `152b${t} an unticked note did not move`, await fids(p, 'n6'));
    r.check(await p.evaluate(() => HIST_POS) === h0 + 1, `152b${t} ONE undo frame for the three`, `${h0} -> ${await p.evaluate(() => HIST_POS)}`);
    r.check(await p.evaluate(() => !_jm.on && !document.documentElement.classList.contains('jm-on')), `152b${t} Choose ended after the move`, '');
    await p.locator('.toast-act').click(); await sleep(400);
    r.check(await fids(p, 'n3') === 'fF' && await fids(p, 'n4') === 'fF' && await fids(p, 'n5') === 'fF' && await p.evaluate(() => HIST_POS) === h0, `152b${t} Undo puts all 3 back`, [await fids(p, 'n3'), await fids(p, 'n4'), await fids(p, 'n5')].join(' '));

    /* 152c — Also add */
    await goF(p); await sleep(300);
    await tick3();
    await act(p.locator('.jm-b', { hasText: 'Also add to folder' }).first()); await sleep(300);
    await pickRow(p, 'Target');
    const add = [await fids(p, 'n3'), await fids(p, 'n4'), await fids(p, 'n5')];
    r.check(add.every((x) => x === 'fF,fT'), `152c${t} the 3 are in From and Target`, add.join(' '));
    r.check(await p.evaluate(() => /Added 3 notes to Target/.test(document.querySelector('.toast-act')?.textContent || '')), `152c${t} the toast says "Added 3 notes"`, '');
    await p.evaluate(() => { undo(); }); await sleep(300);

    /* 152h — Escape / another folder ends Choose; the bar and the Zab bar */
    await goF(p); await sleep(300);
    await act(p.locator('.jm-choose').first()); await sleep(300);
    r.check(await p.evaluate(() => _jm.on), `152h${t} ☑ Choose starts Choose`, '');
    if (w < 640) {
      await act(card(p, 'n3')); await sleep(200);
      const g = await p.evaluate(() => { const b = document.getElementById('jm-bar').getBoundingClientRect(); const z = document.getElementById('jeb-bar'); const zr = z && getComputedStyle(z).display !== 'none' ? z.getBoundingClientRect() : null; const bt = document.getElementById('zab-btn'); const br = bt && getComputedStyle(bt).display !== 'none' ? bt.getBoundingClientRect() : null; const x = document.querySelector('#jm-bar .jm-x').getBoundingClientRect();
        return { bar: [b.left, b.right, b.top, b.bottom], vh: innerHeight, zab: zr ? zr.top : null, btn: br ? [br.left, br.top] : null, x: [x.left, x.right, x.top, x.bottom], jeb: getComputedStyle(document.getElementById('jm-bar')).getPropertyValue('--jeb-h') }; });
      const clearZab = g.zab == null || g.bar[3] <= g.zab + 1;
      const btnOk = !g.btn || !(g.x[1] > g.btn[0] && g.x[3] > g.btn[1] && g.x[2] < g.btn[1] + 60);
      r.check(g.bar[3] <= g.vh + 1 && clearZab && btnOk, `152h${t} the Choose bar sits above the Zab bar / round button`, JSON.stringify(g));
      const fit = await p.evaluate(() => { const b = document.getElementById('jm-bar'); return b.scrollWidth <= b.clientWidth + 1; });
      r.check(fit, `152h${t} the bar fits the width`, '');
      await p.setViewportSize({ width: 360, height: 780 }); await sleep(400);
      const fit360 = await p.evaluate(() => { const b = document.getElementById('jm-bar'); const bs = Array.from(b.querySelectorAll('button')).map((x) => x.getBoundingClientRect()); return b.scrollWidth <= b.clientWidth + 1 && bs.every((q) => q.right <= innerWidth + 1 && q.left >= -1); });
      r.check(fit360, `152h360 the bar fits at 360`, '');
      await p.setViewportSize({ width: w, height: h }); await sleep(300);
    }
    await p.keyboard.press('Escape'); await sleep(300);
    r.check(await p.evaluate(() => !_jm.on && _jm.set.size === 0), `152h${t} Escape ends Choose`, '');
    await p.evaluate(() => { jmStart('n3'); }); await sleep(200);
    await p.evaluate(() => { selFolder('fT'); }); await sleep(300);
    r.check(await p.evaluate(() => !_jm.on), `152h${t} opening another folder ends Choose`, '');

    /* 152f — from a tag view */
    await p.evaluate(() => { selTag('tg'); if (innerWidth < 1200) showPane('p2'); }); await sleep(400);
    await menuMove(p, 'n2', touch);
    r.check(await p.evaluate(() => !document.querySelector('#mv-l .af-off')), `152f${t} in a tag view no folder is greyed`, '');
    await pickRow(p, 'Target');
    const line = await p.evaluate(() => (document.getElementById('jm-leave') || {}).textContent || '');
    r.check(/will leave: Other/.test(line) && (await fids(p, 'n2')) === 'fX', `152f${t} the line names what they leave and nothing moved yet`, line + ' | ' + await fids(p, 'n2'));
    await p.evaluate(() => document.getElementById('jm-go').click()); await sleep(500);
    r.check(await fids(p, 'n2') === 'fT', `152f${t} after Move the note's folders are exactly [Target]`, await fids(p, 'n2'));
    await p.evaluate(() => undo()); await sleep(200);

    /* 152d — drag (laptop) */
    if (w >= 1200) {
      await goF(p); await p.evaluate(() => { ST.secOpen['sec-1'] = true; renderTree(); }); await sleep(400);
      const drag =async (aid, ctrl, drop = true) => p.evaluate(({ aid, ctrl, drop }) => {
        const c = document.querySelector(`#p2c .ar[data-aid="${aid}"]`), row = document.querySelector('#tree [data-fid="fT"]');
        const dt = new DataTransfer();
        c.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
        const rc = row.getBoundingClientRect();
        row.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, ctrlKey: ctrl, clientX: rc.left + 20, clientY: rc.top + 8 }));
        const ghost = document.getElementById('dgh').textContent;
        if (drop) row.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt, ctrlKey: ctrl, clientX: rc.left + 20, clientY: rc.top + 8 }));
        c.dispatchEvent(new DragEvent('dragend', { bubbles: true, cancelable: true, dataTransfer: dt }));
        return ghost;
      }, { aid, ctrl, drop });
      const g1 = await drag('n6', false, false), g2 = await drag('n6', true, false);
      r.check(/Move to Folder/.test(g1) && !/Also add/.test(g1) && /Also add to Folder/.test(g2), `152d${t} the ghost says Move to Folder, and Also add to Folder with Ctrl`, g1 + ' | ' + g2);
      await drag('n6', false); await sleep(400);
      r.check(await fids(p, 'n6') === 'fT' && await fids(p, 'n3') === 'fF', `152d${t} an unticked card moves itself only`, await fids(p, 'n6') + ' ' + await fids(p, 'n3'));
      await p.evaluate(() => undo()); await sleep(300);
      await goF(p); await sleep(300);
      await card(p, 'n3').click({ modifiers: ['Control'] }); await sleep(200);
      await card(p, 'n4').click({ modifiers: ['Control'] }); await sleep(200);
      await drag('n3', false); await sleep(400);
      r.check(await fids(p, 'n3') === 'fT' && await fids(p, 'n4') === 'fT' && await fids(p, 'n5') === 'fF', `152d${t} a ticked card carries every ticked note`, [await fids(p, 'n3'), await fids(p, 'n4'), await fids(p, 'n5')].join(' '));
      await p.evaluate(() => undo()); await sleep(300);
      await goF(p); await sleep(300);
      await drag('n5', true); await sleep(400);
      r.check(await fids(p, 'n5') === 'fF,fT', `152d${t} Ctrl held on the drop ADDS the folder`, await fids(p, 'n5'));
      await p.evaluate(() => undo()); await sleep(200);
    }

    /* 152g — sync: A moves, stale B receives, and the reverse */
    const sy = await p.evaluate(() => {
      const strip = (d) => JSON.stringify(d.articles.map((a) => { const c = Object.assign({}, a); delete c.folderIds; delete c.updatedAt; return c; }).sort((x, y) => x.id < y.id ? -1 : 1));
      const folders = (d) => JSON.stringify(d.articles.map((a) => [a.id, a.folderIds.slice().sort()]).sort((x, y) => x[0] < y[0] ? -1 : 1));
      const B0 = JSON.parse(JSON.stringify(DB));
      ST.tag = null; ST.kind = null; ST.secSF = null; ST.folder = 'fF';
      jmApply(['n3', 'n4', 'n6'], 'fT', 'move'); jmApply(['n5'], 'fT', 'add');
      const A1 = JSON.parse(JSON.stringify(DB)), B1 = JSON.parse(JSON.stringify(B0));
      const toB = mergeDB(JSON.parse(JSON.stringify(B1)), JSON.parse(JSON.stringify(A1)));
      const toA = mergeDB(JSON.parse(JSON.stringify(A1)), JSON.parse(JSON.stringify(B1)));
      return { f1: folders(toB), f2: folders(toA), f3: folders(A1), s1: strip(toB) === strip(A1), s2: strip(toA) === strip(A1), n: A1.articles.length === toB.articles.length };
    });
    r.check(sy.f1 === sy.f3 && sy.f2 === sy.f3, `152g${t} A -> stale B and B -> A give the same folders as A`, sy.f1.slice(0, 200));
    r.check(sy.s1 && sy.s2 && sy.n, `152g${t} nothing but folderIds / updatedAt changed in any note`, JSON.stringify(sy).slice(0, 120));
  } catch (e) { r.check(false, `152${t} threw`, String((e && e.stack) || e).slice(0, 600)); }
  r.check(app.errors.length === 0, `152h${t} no page errors`, app.errors.slice(0, 3).join(' | '));
  await app.close();
}

/* 152e — a 2,000-note folder (a window), Select all, Move */
{
  const lim = hostLimit(200);
  const app = await openApp({ viewport: { width: 1440, height: 900 }, db: db(1995) });
  const p = app.page;
  try {
    await sleep(800); await goF(p); await sleep(1200);
    await p.evaluate(() => { window.__lt = []; try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(e.duration))).observe({ entryTypes: ['longtask'] }); } catch (e) {} });
    await p.locator('.jm-choose').first().click(); await sleep(500);
    const lbl = await p.evaluate(() => document.querySelector('#jm-top').textContent);
    r.check(/Select all \(2000\)/.test(lbl), '152e@1440 the bar says Select all (2000)', lbl);
    await p.locator('.jm-b', { hasText: 'Select all' }).click(); await sleep(800);
    const n = await p.evaluate(() => ({ set: _jm.set.size, win: !!(_listWin && _listWin.n > 300), drawn: document.querySelectorAll('#p2c .ar').length }));
    r.check(n.set === 2000 && n.win && n.drawn < 400, '152e@1440 2,000 chosen from the data, in a windowed list (cards drawn: ' + n.drawn + ')', JSON.stringify(n));
    await p.evaluate(() => { document.getElementById('p2c').scrollTop = 40000; }); await sleep(800);
    const vis = await p.evaluate(() => { const cs = Array.from(document.querySelectorAll('#p2c .ar')); return { n: cs.length, ticked: cs.filter((c) => c.classList.contains('jm-on')).length, tickPaint: cs[0] ? getComputedStyle(cs[0], '::before').content : '' }; });
    r.check(vis.n > 0 && vis.ticked === vis.n && /✓/.test(vis.tickPaint), '152e@1440 a card scrolled into view shows its tick', JSON.stringify(vis));
    await p.locator('.jm-b', { hasText: 'Move to folder' }).click(); await sleep(400);
    const rev0 = await p.evaluate(() => _dbRev); const lt0 = await p.evaluate(() => window.__lt.length), h0 = await p.evaluate(() => HIST_POS);
    await p.locator('#mv-l .pr', { hasText: 'Target' }).first().click(); await sleep(2500);
    const out = await p.evaluate(() => ({ inT: DB.articles.filter((a) => a.folderIds.includes('fT')).length, inF: DB.articles.filter((a) => a.folderIds.includes('fF')).length, rev: _dbRev, h: HIST_POS, lt: window.__lt.slice() }));
    r.check(out.inT === 2000 && out.inF === 0 || (out.inT === 2000 && out.inF === 0), '152e@1440 2,000 notes are in Target and out of From', JSON.stringify({ inT: out.inT, inF: out.inF }));
    r.check(out.h === h0 + 1, '152e@1440 one undo frame', `${h0} -> ${out.h}`);
    r.check(out.rev - rev0 === 1, '152e@1440 ONE save (persist) for 2,000 notes', `_dbRev ${rev0} -> ${out.rev}`);
    const worst = Math.max(0, ...out.lt.slice(lt0));
    r.check(worst <= lim.ms, `152e@1440 no long task over ${lim.text} ms (worst ${Math.round(worst)} ms)`, JSON.stringify(out.lt.slice(lt0)));
  } catch (e) { r.check(false, '152e@1440 threw', String((e && e.stack) || e).slice(0, 600)); }
  r.check(app.errors.length === 0, '152h@1440-bulk no page errors', app.errors.slice(0, 3).join(' | '));
  await app.close();
}
process.exit(r.finish() ? 1 : 0);
