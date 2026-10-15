#!/usr/bin/env node
/* tools/zab-z7.mjs — v05.21, Z7: drag the Zab capsules into your own order (checks 81a–81i).

   Real input everywhere: mouse down/move/up at 1440; at 390 and 820 a real finger through CDP touch events (a held touch for the
   long press, then moves; a quick swipe for the scroll). Nothing touches the network (sync uses the fake cloud).

   81a  bar, mouse: 4th to 1st place and 1st to the last (screen and DB order agree); only pockets whose order changed get a new
        updatedAt; a click without movement opens the panel and writes nothing
   81b  bar, touch (390, 820): hold + move drags; hold without moving opens the menu; a short tap opens the pocket; a quick sideways
        swipe scrolls the bar and does not drag; only the lifted capsule is touch-action:none
   81c  auto-scroll: 20 pockets, the first held at the right edge until it is carried to the end (mouse, and a finger)
   81d  put back: Escape, a drop outside the bar: nothing changes and nothing is written (stringify of DB.jebPockets)
   81e  inside a pocket: the row of child chips reorders among siblings only (mouse, finger); a drop never nests
   81f  the phone corner button: Rail, Drawer (only among siblings of one parent) and Columns reorder by finger
   81g  sync (fake cloud, two devices): a drag on A reaches B and one on B reaches A; two concurrent drags end with every pocket once
   81h  reduced motion: no transition, no animation; the capsule simply jumps (and with motion on, the others do slide: it can fail)
   81i  no page errors; Choose mode: no dragging

   `--only=81a,81c` runs just those. Each printed ok/FAIL line becomes one app-check check (block 81). */
import { playwright, serve, seedDB } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, quiet, push, check, results } from './s1-fake.mjs';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);
if (argv.includes('--fails')) { const o = console.log; let skip = false; console.log = (...x) => { const t = x.join(' '); if (/^\s+ok\s/.test(t)) { skip = true; return; } if (skip && /^\s{6,}\S/.test(t)) { skip = false; return; } skip = false; o(...x); }; }

const P390 = { name: '390', w: 390, h: 844, touch: true }, T820 = { name: '820', w: 820, h: 1180, touch: true }, D1440 = { name: '1440', w: 1440, h: 900, touch: false };
const T0 = '2026-10-01T00:00:00.000Z';
/* `--unpatched` serves the app as it was before the drag was written (the step-0 version-bump commit): every check must fail there */
function makeBase() {
  const dir = mkdtempSync(join(tmpdir(), 'zab-z7-base-'));
  const sha = execFileSync('git', ['log', '--format=%H', '-n', '1', '--grep=step 0: bump to 05.21'], { encoding: 'utf8' }).trim();
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', `${sha}:${f}`], { encoding: 'buffer', maxBuffer: 1 << 28 })); } catch {} }
  return dir;
}
const pw = await playwright();
const srv = await serve(argv.includes('--unpatched') ? makeBase() : undefined);
const browser = await pw.chromium.launch();

const LET = 'ABCDEFGHIJKLMNOPQRST'.split('');
const pk = (id, i, extra = {}) => ({ id, name: id, icon: '✶', color: '#CFE8FF', order: i, createdAt: T0, updatedAt: T0, ...extra });
const seed = (ids, layout, extra) => { const db = seedDB(T0); db.jebPockets = ids.map((id, i) => pk(id, i)); db.jeb = []; if (extra) extra(db); db.theme = Object.assign({}, db.theme, { zabPhoneLayout: layout || 'bar' }); return db; };
const dev = (cloud, name, vp, db) => addDevice(browser, srv.base, cloud, name, { width: vp.w, height: vp.h }, vp.touch, db, {});
const mkDev = (vp, ids, layout, extra) => dev(makeCloud(), 'D' + vp.name, vp, seed(ids, layout, extra));
const act = (d, vp, sel) => (vp.touch ? d.page.locator(sel).first().tap() : d.page.locator(sel).first().click());
const noErr = (d, tag) => check(d.errors.length === 0, `${tag} no page errors`, d.errors.slice(0, 2).join(' · '));
const chip = (pid) => `#jeb-bar .jeb-chip[data-pid="${pid}"]`;
const screenOrder = (d) => on(d, () => [...document.querySelectorAll('#jeb-bar .jeb-chip[data-pid]')].map((c) => c.dataset.pid));
const dbOrder = (d) => on(d, () => jebChildren('').map((p) => p.id));
const snap = (d) => on(d, () => JSON.stringify(DB.jebPockets));
const stamps = (d) => on(d, () => Object.fromEntries(DB.jebPockets.map((p) => [p.id, p.updatedAt + '|' + p.order])));
const ctr = async (d, sel) => { const b = await d.page.locator(sel).first().boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, b }; };
const wait = async (fn, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await sleep(400); } return false; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* a mouse drag: down on `from`, move to `to` in steps, optional hook while held, then up */
async function mdrag(d, from, to, { steps = 14, hold, release = true } = {}) {
  const m = d.page.mouse;
  await m.move(from.x, from.y); await m.down();
  for (let i = 1; i <= steps; i++) { await m.move(from.x + (to.x - from.x) * i / steps, from.y + (to.y - from.y) * i / steps); await sleep(16); }
  if (hold) await hold();
  if (release) { await m.up(); await sleep(350); }
}
/* a finger: touch down, held `holdMs` in place (0 = a quick swipe), then moves; optional hook while held; then up */
async function fdrag(d, from, to, { holdMs = 650, steps = 14, hold, release = true, stepMs = 16 } = {}) {
  d.tcdp = d.tcdp || await d.ctx.newCDPSession(d.page);
  const send = (type, p) => d.tcdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [{ x: p.x, y: p.y }] : [] });
  await send('touchStart', from);
  if (holdMs) await sleep(holdMs);
  for (let i = 1; i <= steps; i++) { await send('touchMove', { x: from.x + (to.x - from.x) * i / steps, y: from.y + (to.y - from.y) * i / steps }); await sleep(stepMs); }
  if (hold) await hold();
  if (release) { await send('touchEnd', null); await sleep(400); }
}
const drag = (d, vp, from, to, o) => (vp.touch ? fdrag(d, from, to, o) : mdrag(d, from, to, o));
const tapAt = async (d, x, y) => { d.tcdp = d.tcdp || await d.ctx.newCDPSession(d.page); await d.tcdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await sleep(60); await d.tcdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(400); };
const leftOf = (c, o = 0) => ({ x: c.b.x + 3, y: c.y });   /* the left edge of a chip: before its middle */
const rightOf = (c) => ({ x: c.b.x + c.b.width - 3, y: c.y });   /* the right edge: past its middle */
const noDrag = (d) => on(d, () => !document.querySelector('.zx-lift,.zx-o,.zx-b,.zx-a,.zx-box') && [...document.querySelectorAll('#jeb-bar .jeb-chip, .jx-kid, .zr-b, .zd-row, .zc-row')].every((e) => !e.style.transform));

try {
  /* ══ 81a — the bar, mouse ══ */
  if (want('81a')) {
    const vp = D1440, d = await mkDev(vp, ['A', 'B', 'C', 'D']);
    try {
      await sleep(900);
      const t = '81a (1440, mouse)';
      check(same(await screenOrder(d), ['A', 'B', 'C', 'D']), `${t} the bar starts A B C D`, (await screenOrder(d)).join(' '));
      /* 4th to the 1st place */
      const s0 = await stamps(d);
      await mdrag(d, await ctr(d, chip('D')), leftOf(await ctr(d, chip('A'))));
      check(same(await screenOrder(d), ['D', 'A', 'B', 'C']) && same(await dbOrder(d), ['D', 'A', 'B', 'C']), `${t} the 4th capsule dropped on the 1st place: D A B C on screen and in DB`, (await screenOrder(d)).join(' ') + ' | ' + (await dbOrder(d)).join(' '));
      check((await on(d, () => DB.jebPockets.map((p) => p.order).sort().join())) === '0,1,2,3', `${t} the orders are 0..3 once each`);
      check(await noDrag(d), `${t} after the drop no lifted class or leftover transform stays on any capsule`);
      /* the 1st to the last */
      await mdrag(d, await ctr(d, chip('D')), rightOf(await ctr(d, chip('C'))));
      check(same(await screenOrder(d), ['A', 'B', 'C', 'D']) && same(await dbOrder(d), ['A', 'B', 'C', 'D']), `${t} the 1st capsule dropped past the last: A B C D`, (await screenOrder(d)).join(' '));
      /* only what changed is stamped: swap the 2nd and 3rd; A and D keep their stamp */
      const s1 = await stamps(d);
      await mdrag(d, await ctr(d, chip('B')), rightOf(await ctr(d, chip('C'))));
      const s2 = await stamps(d);
      check(same(await dbOrder(d), ['A', 'C', 'B', 'D']), `${t} B dropped past C: A C B D`, (await dbOrder(d)).join(' '));
      check(s2.A === s1.A && s2.D === s1.D && s2.B !== s1.B && s2.C !== s1.C, `${t} only the two pockets whose order changed got a new updatedAt (A and D untouched)`, JSON.stringify({ s1, s2 }));
      /* the same place: nothing written */
      const before = await snap(d);
      await mdrag(d, await ctr(d, chip('A')), { x: (await ctr(d, chip('A'))).x + 20, y: (await ctr(d, chip('A'))).y });
      check((await snap(d)) === before, `${t} a drag that ends in the same place writes nothing`);
      /* a click without movement still opens the pocket */
      const c = await ctr(d, chip('C') + ' .jeb-main'); await d.page.mouse.click(c.x, c.y); await sleep(500);
      check(await on(d, () => !!document.querySelector('#jeb-panel.on') && _jebOpen === 'C'), `${t} a click without movement opens the pocket, as before`);
      check((await snap(d)) === before, `${t} ...and writes nothing`);
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }

  /* ══ 81b — the bar, a finger ══ */
  if (want('81b')) for (const vp of [P390, T820]) {
    const d = await mkDev(vp, LET.slice(0, 5)), t = `81b (${vp.name}, touch)`;
    try {
      await sleep(900);
      /* the bar scrolls sideways with a finger as ever: only the lifted capsule is touch-action:none */
      const ta = await on(d, () => getComputedStyle(document.querySelector('#jeb-bar .jeb-chip[data-pid="A"]')).touchAction);
      check(ta !== 'none', `${t} an ordinary capsule is not touch-action:none (${ta}), so the bar still scrolls`);
      const toLeft = (pid) => on(d, (p) => { const b = document.getElementById('jeb-bar'), c = b.querySelector(`.jeb-chip[data-pid="${p}"]`); b.scrollLeft += c.getBoundingClientRect().left - b.getBoundingClientRect().left - 8; }, pid);
      await toLeft('A'); await sleep(200);
      const A = await ctr(d, chip('A')), B = await ctr(d, chip('B'));
      /* hold + move drags */
      let lifted = null;
      await fdrag(d, A, rightOf(B), { hold: async () => { lifted = await on(d, () => { const e = document.querySelector('.zx-lift'); return e ? { pid: e.dataset.pid, ta: getComputedStyle(e).touchAction, h: e.getBoundingClientRect().height } : null; }); } });
      check(lifted && lifted.pid === 'A' && lifted.ta === 'none' && lifted.h >= 40, `${t} a long press lifts the capsule: it alone is touch-action:none and >= 40 px (${JSON.stringify(lifted)})`);
      check(same((await dbOrder(d)).slice(0, 2), ['B', 'A']) && same(await screenOrder(d), await dbOrder(d)), `${t} a long press then a move drags: A dropped past B (${(await screenOrder(d)).join(' ')})`);
      check((await on(d, () => !document.getElementById('jeb-menu'))), `${t} ...and no menu opened`);
      check(await noDrag(d), `${t} ...and nothing stays lifted`);
      /* hold without moving = the menu */
      const before = await snap(d);
      await toLeft('A'); await sleep(200);
      const C = await ctr(d, chip('C'));
      await fdrag(d, C, C, { steps: 0, holdMs: 700 });
      await sleep(300);
      const menu = await on(d, () => { const m = document.getElementById('jeb-menu'); return m ? [...m.querySelectorAll('.jm')].map((x) => x.textContent) : null; });
      check(menu && menu.some((x) => /Rename/.test(x)), `${t} a long press released without moving opens the pocket menu, as before (${menu && menu.slice(0, 3).join(' / ')})`);
      check((await snap(d)) === before, `${t} ...and moved nothing`);
      await on(d, () => _jebHideMenu()); await sleep(200);
      /* a short tap opens the pocket */
      await on(d, () => { jebClosePanel(); });
      await sleep(300); await toLeft('A'); await sleep(200);
      const Dc = await ctr(d, chip('D') + ' .jeb-main'); await tapAt(d, Dc.x, Dc.y); await sleep(300);
      check(await on(d, () => _jebOpen === 'D'), `${t} a short tap opens the pocket`);
      check((await snap(d)) === before, `${t} ...and writes nothing`);
      /* a quick swipe (no hold) scrolls the bar and does not drag: needs overflow, so add pockets first */
      await on(d, () => { for (let i = 0; i < 12; i++) jebAddPocket('Z' + i, '✶', '#CFE8FF'); jebClosePanel(); jebRefresh(); });
      await sleep(500);
      const snap0 = await snap(d), sl0 = await on(d, () => document.getElementById('jeb-bar').scrollLeft);
      const E = await ctr(d, chip('E'));
      await fdrag(d, { x: Math.min(E.x, vp.w - 60), y: E.y }, { x: 20, y: E.y }, { holdMs: 0, steps: 10, stepMs: 20 });
      await sleep(500);
      const sl1 = await on(d, () => document.getElementById('jeb-bar').scrollLeft);
      check(sl1 > sl0 + 20, `${t} a quick sideways swipe scrolls the bar (${sl0} → ${sl1})`);
      check((await snap(d)) === snap0 && await noDrag(d), `${t} ...and does not drag anything`);
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }

  /* ══ 81c — auto-scroll ══ */
  if (want('81c')) for (const vp of [D1440, P390]) {
    const d = await mkDev(vp, LET), t = `81c (${vp.name}${vp.touch ? ', touch' : ', mouse'})`;
    try {
      await sleep(900);
      await on(d, () => { document.getElementById('jeb-bar').scrollLeft = 0; });
      const mx = await on(d, () => { const b = document.getElementById('jeb-bar'); return b.scrollWidth - b.clientWidth; });
      check(mx > 200, `${t} 20 pockets overflow the bar (${mx} px to scroll)`);
      await on(d, () => { const b = document.getElementById('jeb-bar'); b.scrollLeft += b.querySelector('.jeb-chip[data-pid="A"]').getBoundingClientRect().left - b.getBoundingClientRect().left - 8; }); await sleep(200);
      const A = await ctr(d, chip('A')); const br = await on(d, () => { const r = document.getElementById('jeb-bar').getBoundingClientRect(); return { l: r.left, r: r.right, y: r.top + r.height / 2 }; });
      let sl = 0;
      await drag(d, vp, A, { x: br.r - 12, y: br.y }, {
        steps: 8, release: false,
        hold: async () => { for (let i = 0; i < 160; i++) { await sleep(40); sl = await on(d, (m) => { const b = document.getElementById('jeb-bar'); return b.scrollLeft >= m - 2 ? -1 : b.scrollLeft; }, mx); if (sl === -1) break; } },
      });
      check(sl === -1, `${t} holding the first capsule at the right edge scrolls the bar to its end by itself`, 'scrollLeft ' + (await on(d, () => document.getElementById('jeb-bar').scrollLeft)));
      if (vp.touch) { d.tcdp = d.tcdp || await d.ctx.newCDPSession(d.page); await d.tcdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); } else await d.page.mouse.up();
      await sleep(500);
      const o = await dbOrder(d);
      check(o[19] === 'A' && o.length === 20 && new Set(o).size === 20, `${t} released there it lands last: A is 20th, every pocket once (${o.join('')})`);
      check(same(await screenOrder(d), o), `${t} the screen shows the same order`);
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }

  /* ══ 81d — put back ══ */
  if (want('81d')) for (const vp of [D1440, P390]) {
    const d = await mkDev(vp, ['A', 'B', 'C', 'D']), t = `81d (${vp.name}${vp.touch ? ', touch' : ', mouse'})`;
    try {
      await sleep(900);
      const before = await snap(d);
      /* Escape in the middle */
      await drag(d, vp, await ctr(d, chip('A')), rightOf(await ctr(d, chip('C'))), {
        release: false,
        hold: async () => {
          const mid = await on(d, () => ({ lift: !!document.querySelector('.zx-lift'), moved: [...document.querySelectorAll('#jeb-bar .jeb-chip')].some((c) => c.style.transform) }));
          check(mid.lift && mid.moved, `${t} mid-drag the capsule is lifted and the others have slid aside`);
          await d.page.keyboard.press('Escape'); await sleep(200);
        },
      });
      if (vp.touch) await d.tcdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); else await d.page.mouse.up();
      await sleep(400);
      check((await snap(d)) === before, `${t} Escape puts it back: DB.jebPockets is byte-identical`);
      check(await noDrag(d), `${t} ...and nothing is left lifted or shifted`);
      /* a drop outside the bar */
      await drag(d, vp, await ctr(d, chip('A')), { x: vp.w / 2, y: 120 }, {});
      check((await snap(d)) === before, `${t} a drop outside the bar puts it back: DB.jebPockets is byte-identical`);
      check(await noDrag(d), `${t} ...and nothing is left lifted or shifted`);
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }

  /* ══ 81e — inside a pocket ══ */
  if (want('81e')) for (const vp of [D1440, P390, T820]) {
    const d = await mkDev(vp, ['P', 'Q', 'R'], 'bar', (s) => { s.jebPockets.push(pk('K1', 3, { parentId: 'P' }), pk('K2', 4, { parentId: 'P' }), pk('K3', 5, { parentId: 'P' }), pk('K4', 6, { parentId: 'P' })); }), t = `81e (${vp.name}${vp.touch ? ', touch' : ', mouse'})`;
    try {
      await sleep(900);
      await act(d, vp, `${chip('P')} .jeb-main`); await d.page.waitForSelector('#jeb-panel.on .jx-kid', { timeout: 4000 }); await sleep(500);
      const kids = () => on(d, () => [...document.querySelectorAll('#jeb-panel .jx-kid')].map((k) => k.dataset.pid));
      const parents = () => on(d, () => JSON.stringify(DB.jebPockets.map((p) => [p.id, p.parentId || null])));
      const par0 = await parents(), top0 = await dbOrder(d);
      const k = (id) => ctr(d, `#jeb-panel .jx-kid[data-pid="${id}"]`);
      await drag(d, vp, await k('K3'), leftOf(await k('K1')));
      check(same(await kids(), ['K3', 'K1', 'K2', 'K4']) && same(await on(d, () => jebChildren('P').map((p) => p.id)), ['K3', 'K1', 'K2', 'K4']), `${t} a pocket inside dragged to the first place among its siblings: K3 K1 K2 K4 on screen and in DB`, (await kids()).join(' '));
      check((await parents()) === par0 && same(await dbOrder(d), top0), `${t} no parentId changed and the top level did not move`);
      /* dragged down onto the bar's other capsule: not a place, so it is put back; never nests */
      const snapK = await snap(d);
      await drag(d, vp, await k('K2'), await ctr(d, chip('R')));
      check((await snap(d)) === snapK && (await parents()) === par0, `${t} a drop on another pocket's capsule changes nothing: a drop is never "into" (parentIds identical)`);
      await drag(d, vp, await k('K3'), rightOf(await k('K4')));
      check(same(await kids(), ['K1', 'K2', 'K4', 'K3']) && (await parents()) === par0, `${t} past the last: K1 K2 K4 K3`, (await kids()).join(' '));
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }

  /* ══ 81f — the phone corner button ══ */
  if (want('81f')) {
    const vp = P390;
    const nest = (s) => { s.jebPockets.push(pk('K1', 4, { parentId: 'A' }), pk('K2', 5, { parentId: 'A' }), pk('K3', 6, { parentId: 'A' })); };
    /* Rail */
    { const d = await mkDev(vp, ['A', 'B', 'C', 'D'], 'rail', nest), t = '81f (390, Rail)';
      try {
        await sleep(900);
        await act(d, vp, '#zab-btn'); await d.page.waitForSelector('#zab-lay.on .zr-b[data-pid]', { timeout: 4000 }); await sleep(500);
        const shown = () => on(d, () => [...document.querySelectorAll('#zab-lay .zr-b[data-pid]')].map((e) => e.dataset.pid));
        const s = await shown();
        check(s.length === 4, `${t} the rail shows the four top-level pockets (${s.join(' ')})`);
        const A = await ctr(d, '#zab-lay .zr-b[data-pid="A"]'), C = await ctr(d, '#zab-lay .zr-b[data-pid="C"]');
        let ind = null;
        await fdrag(d, A, { x: C.x, y: C.y - 10 }, { hold: async () => { ind = await on(d, () => !!document.querySelector('#zab-lay .zx-b,#zab-lay .zx-a')); } });
        check(ind === true, `${t} while dragging a row shows where it will land`);
        check(same(await dbOrder(d), ['B', 'C', 'A', 'D']), `${t} the first bubble pulled up past the third: B C A D in DB`, (await dbOrder(d)).join(' '));
        check(await on(d, () => !!document.getElementById('zab-lay')) === true && await noDrag(d), `${t} the rail stays open and nothing is left lifted`);
        noErr(d, t);
      } finally { await d.ctx.close(); } }
    /* Drawer */
    { const d = await mkDev(vp, ['A', 'B', 'C', 'D'], 'drawer', nest), t = '81f (390, Drawer)';
      try {
        await sleep(900);
        await on(d, () => { _zabUnfold = new Set(['A']); });
        await act(d, vp, '#zab-btn'); await d.page.waitForSelector('#zab-lay.on .zd-row', { timeout: 4000 }); await sleep(500);
        const r = (id) => ctr(d, `#zab-lay .zd-row[data-pid="${id}"]`);
        const par0 = await on(d, () => JSON.stringify(DB.jebPockets.map((p) => [p.id, p.parentId || null])));
        await fdrag(d, await r('K3'), { x: (await r('K1')).x, y: (await r('K1')).y - 12 });
        check(same(await on(d, () => jebChildren('A').map((p) => p.id)), ['K3', 'K1', 'K2']), `${t} a pocket inside, dragged up in the list: K3 K1 K2 among its siblings`, (await on(d, () => jebChildren('A').map((p) => p.id))).join(' '));
        check(same(await dbOrder(d), ['A', 'B', 'C', 'D']), `${t} the top level did not move`);
        await fdrag(d, await r('K1'), { x: (await r('C')).x, y: (await r('C')).y });
        check(same(await on(d, () => jebChildren('A').map((p) => p.id)), ['K3', 'K2', 'K1']) && same(await dbOrder(d), ['A', 'B', 'C', 'D']), `${t} dragging a nested row far down over the top-level rows only moves it among its own siblings: K3 K2 K1, top level unchanged`, (await on(d, () => jebChildren('A').map((p) => p.id))).join(' '));
        check((await on(d, () => JSON.stringify(DB.jebPockets.map((p) => [p.id, p.parentId || null])))) === par0, `${t} no parentId changed`);
        await fdrag(d, await r('D'), { x: (await r('B')).x, y: (await r('B')).y - 12 });
        check(same(await dbOrder(d), ['A', 'D', 'B', 'C']), `${t} a top-level row dragged up past B: A D B C`, (await dbOrder(d)).join(' '));
        noErr(d, t);
      } finally { await d.ctx.close(); } }
    /* Columns */
    { const d = await mkDev(vp, ['A', 'B', 'C', 'D'], 'cols', nest), t = '81f (390, Columns)';
      try {
        await sleep(900);
        await act(d, vp, '#zab-btn'); await d.page.waitForSelector('#zab-lay.on .zc-row', { timeout: 4000 }); await sleep(500);
        const r = (id) => ctr(d, `#zab-lay .zc-row[data-pid="${id}"]`);
        await fdrag(d, await r('B'), { x: (await r('D')).x, y: (await r('D')).y + 14 });
        check(same(await dbOrder(d), ['A', 'C', 'D', 'B']), `${t} a row dragged down within its column: A C D B`, (await dbOrder(d)).join(' '));
        noErr(d, t);
      } finally { await d.ctx.close(); } }
  }

  /* ══ 81g — sync ══ */
  if (want('81g')) {
    const vp = D1440, names = LET.slice(0, 6), cloud = makeCloud();
    const A = await dev(cloud, 'A', vp, seed(names)), B = await dev(cloud, 'B', vp, seed(names)), t = '81g (1440, two devices)';
    const offline = async (d, v) => { d.offline = v; await d.ctx.setOffline(v); if (!v) cloud.reconnect(d); };
    try {
      await sleep(1500);
      await on(A, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.content += '<p>x</p>'; a.updatedAt = new Date().toISOString(); persist(); flushPendingPush(); });
      await sleep(800); await quiet(cloud, A); await quiet(cloud, B);
      await mdrag(A, await ctr(A, chip('F')), leftOf(await ctr(A, chip('A')))); await push(cloud, A);
      check(await wait(async () => same(await dbOrder(B), ['F', 'A', 'B', 'C', 'D', 'E'])), `${t} a drag on A (F to the first place) arrives on B`, (await dbOrder(B)).join(' '));
      check(same(await screenOrder(B), await dbOrder(B)), `${t} ...and B draws it`);
      await mdrag(B, await ctr(B, chip('F')), rightOf(await ctr(B, chip('E')))); await push(cloud, B);
      check(await wait(async () => same(await dbOrder(A), ['A', 'B', 'C', 'D', 'E', 'F'])), `${t} a drag on B (F to the end) arrives on A`, (await dbOrder(A)).join(' '));
      /* concurrent: A moves C to the front, B (offline) moves D to the end */
      await offline(B, true);
      await mdrag(B, await ctr(B, chip('A')), rightOf(await ctr(B, chip('F'))));
      await mdrag(A, await ctr(A, chip('C')), leftOf(await ctr(A, chip('A')))); await push(cloud, A);
      await sleep(1200); await offline(B, false); await push(cloud, B);
      const ok = await wait(async () => { const a = await dbOrder(A), b = await dbOrder(B); return same(a, b) && a.length === 6 && new Set(a).size === 6; }, 40000);
      check(ok, `${t} two drags made at the same time end with every pocket present exactly once, the same on both (${(await dbOrder(A)).join('')} / ${(await dbOrder(B)).join('')})`);
      check(await on(A, () => new Set(DB.jebPockets.map((p) => p.id)).size === DB.jebPockets.length) && await on(B, () => new Set(DB.jebPockets.map((p) => p.id)).size === DB.jebPockets.length), `${t} ...and no pocket is duplicated in either DB`);
      noErr(A, t + ' A'); noErr(B, t + ' B');
    } finally { await A.ctx.close(); await B.ctx.close(); }
  }

  /* ══ 81h — reduced motion ══ */
  if (want('81h')) {
    const vp = D1440;
    for (const reduce of [true, false]) {
      const d = await mkDev(vp, ['A', 'B', 'C', 'D']), t = `81h (1440, ${reduce ? 'reduced motion' : 'motion on'})`;
      try {
        await d.page.emulateMedia({ reducedMotion: reduce ? 'reduce' : 'no-preference' });
        await sleep(900);
        let m = null;
        await mdrag(d, await ctr(d, chip('D')), leftOf(await ctr(d, chip('A'))), {
          release: false,
          hold: async () => { await sleep(120); m = await on(d, () => { const o = document.querySelector('#jeb-bar .zx-o'); return { td: o ? getComputedStyle(o).transitionDuration : null, anims: document.getAnimations().length, sl: [...document.querySelectorAll('#jeb-bar .zx-o')].some((e) => e.style.transform) }; }); },
        });
        await d.page.mouse.up(); await sleep(400);
        if (reduce) {
          check(m && m.td === '0s' && m.anims === 0, `${t} no transition and no animation runs while dragging (${JSON.stringify(m)})`);
          check(m && m.sl, `${t} the others still step aside (instantly)`);
        } else check(m && m.td !== '0s' && /0\.15/.test(m.td), `${t} (the control) with motion on the others do slide: transition ${m && m.td}`);
        check(same(await dbOrder(d), ['D', 'A', 'B', 'C']), `${t} the drop works: D A B C`);
        noErr(d, t);
      } finally { await d.ctx.close(); }
    }
  }

  /* ══ 81i — Choose mode: no dragging ══ */
  if (want('81i')) for (const vp of [D1440, P390]) {
    const d = await mkDev(vp, ['A', 'B', 'C', 'D']), t = `81i (${vp.name}${vp.touch ? ', touch' : ', mouse'})`;
    try {
      await sleep(900);
      await act(d, vp, '#jeb-bar .jeb-choose'); await sleep(400);
      const before = await snap(d);
      const lifted = [];
      await drag(d, vp, await ctr(d, chip('A')), rightOf(await ctr(d, chip('B'))), { hold: async () => { lifted.push(await on(d, () => !!document.querySelector('.zx-lift'))); } });
      check(lifted[0] === false && (await snap(d)) === before, `${t} in Choose mode nothing lifts and the order does not change`);
      check(await on(d, () => _jebChoose === true), `${t} ...and Choose is still on`);
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }
} catch (e) {
  console.log(' FAIL  zab-z7 threw: ' + (e && e.stack || e));
  results.push({ ok: false, label: 'threw' });
} finally {
  await browser.close();
  await srv.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
