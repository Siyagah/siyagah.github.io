#!/usr/bin/env node
/* tools/zab-z8.mjs — v05.23, Z8: the pockets inside a pocket as a vertical list (checks 83a–83h).

   Tree used throughout: A ▸ A1, A2 ▸ A2a (A: 1 open item, A1: 2, A2: 1, A2a: 3, so the rolled counts are A1 2, A2 4, A2a 3), and B.
   Real input: mouse at 1440; a real finger through CDP touch events at 390 and 820. Sync uses the fake cloud, nothing the network.

   83a  opening A: A1 and A2 are vertical lines (each below the previous, >= 90% of the panel's width, >= 44 px), after the path
        line and before A's items, with the right counts and "▸" on A2 only
   83b  tapping A2 shows A2a the same way and the path "A › A2"; stepping back through the path returns to A
   83c  a pocket with nothing inside: the panel is byte-identical to what the build before this round draws
   83d  long press (touch) / right-click (mouse) on a line opens that pocket's menu; "＋ New pocket inside" makes one inside the open one
   83e  drag A2 above A1 (mouse, finger): order on screen and in DB; only pockets whose order changed are stamped; parentId never set
   83f  a received merge (rename A1, an item added to A2a) repaints the line with no reload; nothing repaints during a drag
   83g  40 pockets inside: the panel scrolls as one, every line reachable, no horizontal scroll at 390
   83h  no page errors; Zab mode (/?jeb=1) shows the same list

   `--only=83a,83c` runs just those; `--unpatched` serves the build before this round. Each ok/FAIL line becomes one app-check check. */
import { z12Words } from './z12-words.mjs';
import { playwright, serve, seedDB, zabVisible, zabAct, zabTap } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, quiet, push, check, results } from './s1-fake.mjs';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
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
/* the build before this round: the commit that merged Z7 in and bumped to 05.23 (nothing of Z8 yet) */
function makeBase() {
  const dir = mkdtempSync(join(tmpdir(), 'zab-z8-base-'));
  const sha = execFileSync('git', ['log', '--format=%H', '-n', '1', '--grep=Z8 step 0'], { encoding: 'utf8' }).trim();
  if (!sha) throw new Error('the build before Z8 (commit "Z8 step 0") is not in this clone - fetch more history (git fetch --unshallow)');   /* never compare the build with itself */
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', `${sha}:${f}`], { encoding: 'buffer', maxBuffer: 1 << 28 })); } catch {} }
  /* v05.34 (Z12), updated in place by the Architect: the owner's word is "Zab" now ("All Zabs" is narrower than "All pockets"), so the older build gets the same word
     changes (tools/z12-words.mjs) before it is compared; every other difference still fails. */
  try { const f = join(dir, 'index.html'); writeFileSync(f, z12Words(readFileSync(f, 'utf8'))); } catch {}
  return dir;
}
const pw = await playwright();
const baseDir = makeBase();
const srv = await serve(argv.includes('--unpatched') ? baseDir : undefined);
const srvOld = await serve(baseDir);
const browser = await pw.chromium.launch();

const pk = (id, i, extra = {}) => ({ id, name: id, icon: '✶', color: '#CFE8FF', order: i, createdAt: T0, updatedAt: T0, ...extra });
const mk = (id, pocketId, text, order, extra = {}) => ({ id, pocketId, text, done: false, folderIds: [], tags: [], kind: null, journal: false, order, createdAt: T0, updatedAt: T0, ...extra });
const tree = (s, extra) => {
  s.jebPockets = [pk('A', 0), pk('B', 1), pk('A1', 2, { parentId: 'A' }), pk('A2', 3, { parentId: 'A' }), pk('A2a', 4, { parentId: 'A2' })];
  s.jeb = [mk('ia', 'A', 'in A', 0), mk('i11', 'A1', 'one', 0), mk('i12', 'A1', 'two', 1), mk('i21', 'A2', 'three', 0), mk('ia1', 'A2a', 'x', 0), mk('ia2', 'A2a', 'y', 1), mk('ia3', 'A2a', 'z', 2)];
  if (extra) extra(s);
};
const seed = (extra) => { const db = seedDB(T0); tree(db, extra); db.theme = Object.assign({}, db.theme, { zabPhoneLayout: 'bar' }); return db; };
const mkDev = (vp, extra, cloud) => addDevice(browser, srv.base, cloud || makeCloud(), 'D' + vp.name, { width: vp.w, height: vp.h }, vp.touch, seed(extra), {});
/* v05.40 · Z15: a Zab chip the bar has folded into "▸ N more" is reached through the more-list, as the owner does (harness zabTap); a folded chip's ▦ half is reached through the panel header (zabAct) */
const act = (d, vp, sel) => (/^#jeb-bar[ >]+\.jeb-(?:chip|all)/.test(sel) ? zabAct(d.page, sel, { touch: vp.touch }) : vp.touch ? d.page.locator(sel).first().tap() : d.page.locator(sel).first().click());
const noErr = (d, tag) => check(d.errors.length === 0, `${tag} no page errors`, d.errors.slice(0, 2).join(' · '));
const chip = (pid) => `#jeb-bar .jeb-chip[data-pid="${pid}"]`;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const ctr = async (d, sel) => { const b = await d.page.locator(sel).first().boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, b }; };
const kidSel = (id) => `#jeb-panel .jx-kid[data-pid="${id}"]`;
const kids = (d) => on(d, () => [...document.querySelectorAll('#jeb-panel .jx-kid')].map((k) => k.dataset.pid));
const dbKids = (d, id) => on(d, (p) => jebChildren(p).map((x) => x.id), id);
const stamps = (d) => on(d, () => Object.fromEntries(DB.jebPockets.map((p) => [p.id, p.updatedAt + '|' + p.order])));
const parents = (d) => on(d, () => JSON.stringify(DB.jebPockets.map((p) => [p.id, p.parentId || null])));
const wait = async (fn, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await sleep(400); } return false; };
const openA = async (d, vp) => { await act(d, vp, `${chip('A')} .jeb-main`); await d.page.waitForSelector('#jeb-panel.on .jx-kid', { timeout: 5000 }); await sleep(500); };
/* what the panel draws, as the owner sees it */
const geo = (d) => on(d, () => {
  const R = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right, w: r.width, h: r.height }; };
  const p = document.getElementById('jeb-panel'), cs = getComputedStyle(p), cw = p.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const path = document.querySelector('#jeb-panel .jx-path');
  return {
    cw, scrollW: p.scrollWidth, clientW: p.clientWidth,
    path: path && !path.hidden ? R(path) : null, pathText: path && !path.hidden ? [...path.querySelectorAll('button,b')].map((x) => x.textContent).join('>') : '',
    lines: [...document.querySelectorAll('#jeb-panel .jx-kid')].map((k) => ({ id: k.dataset.pid, ...R(k), ct: k.querySelector('.jeb-ct').textContent.trim(), sub: !!k.querySelector('.jx-in') })),
    nw: R(document.querySelector('#jeb-panel .jx-new')), item: R(document.querySelector('#jeb-panel .jeb-list .jeb-it')),
  };
});

/* a mouse drag and a finger drag (the Z7 helpers) */
async function mdrag(d, from, to, { steps = 14, hold, release = true } = {}) {
  const m = d.page.mouse;
  await m.move(from.x, from.y); await m.down();
  for (let i = 1; i <= steps; i++) { await m.move(from.x + (to.x - from.x) * i / steps, from.y + (to.y - from.y) * i / steps); await sleep(16); }
  if (hold) await hold();
  if (release) { await m.up(); await sleep(350); }
}
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
const VPS = [P390, T820, D1440];
const tag = (id, vp) => `${id} (${vp.name}${vp.touch ? ', touch' : ', mouse'})`;

try {
  /* ══ 83a — opening A ══ */
  if (want('83a')) for (const vp of VPS) {
    const d = await mkDev(vp), t = tag('83a', vp);
    try {
      await sleep(900); await openA(d, vp);
      const g = await geo(d);
      check(same(g.lines.map((l) => l.id), ['A1', 'A2']), `${t} A shows A1 and A2 as lines`, JSON.stringify(g.lines.map((l) => l.id)));
      check(g.lines.length === 2 && g.lines[1].t >= g.lines[0].b - 1 && g.lines[0].l === g.lines[1].l, `${t} each line starts below the previous one (a vertical list)`, JSON.stringify(g.lines.map((l) => [l.t, l.b])));
      check(g.lines.every((l) => l.w >= g.cw * 0.9 && l.h >= 44), `${t} each line is >= 90% of the panel width (${g.cw}) and >= 44 px tall`, JSON.stringify(g.lines.map((l) => [l.w, l.h])));
      check(g.nw && g.nw.t >= g.lines[1].b - 1 && g.nw.w >= g.cw * 0.9 && g.nw.h >= 44, `${t} "＋ New pocket inside" is the last line of the list`, JSON.stringify(g.nw));
      check(g.item && g.item.t >= g.nw.b - 1, `${t} A's own item comes after the list`, JSON.stringify([g.item, g.nw]));
      check(g.path === null, `${t} a top-level pocket has no path line to sit under (hidden)`);
      check(g.lines[0].ct === '2' && g.lines[1].ct === '4', `${t} counts are the rolled-up ones: A1 2, A2 4 (${g.lines.map((l) => l.ct)})`);
      check(g.lines[0].sub === false && g.lines[1].sub === true, `${t} "▸" on A2 only`);
      check(await on(d, () => document.querySelector('#jeb-panel .jx-kids').scrollWidth <= document.querySelector('#jeb-panel .jx-kids').clientWidth + 1), `${t} no line is cut off sideways`);
      check(await on(d, () => { const s = getComputedStyle(document.querySelector('#jeb-panel .jx-kid')); return s.display !== 'inline-flex' && s.borderRadius !== '999px'; }), `${t} a row, not a chip (no pill shape)`);
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }

  /* ══ 83b — going down and back ══ */
  if (want('83b')) for (const vp of VPS) {
    const d = await mkDev(vp), t = tag('83b', vp);
    try {
      await sleep(900); await openA(d, vp);
      await act(d, vp, kidSel('A2')); await sleep(500);
      let g = await geo(d);
      check(same(g.lines.map((l) => l.id), ['A2a']) && g.lines[0].ct === '3' && g.lines[0].h >= 44 && g.lines[0].w >= g.cw * 0.9, `${t} A2 shows A2a the same way (count 3)`, JSON.stringify(g.lines));
      check(g.path && g.pathText === 'A>A2', `${t} the path line reads A › A2`, g.pathText);
      check(g.path && g.nw && g.path.b <= g.lines[0].t + 1 && g.lines[0].b <= (g.item ? g.item.t : 1e9) + 1, `${t} path line, then the list, then A2's item`);
      check(await on(d, () => _jebOpen === 'A2'), `${t} A2 is the open pocket`);
      await act(d, vp, '#jeb-panel .jx-path button'); await sleep(500);
      check(same(await kids(d), ['A1', 'A2']) && (await on(d, () => _jebOpen)) === 'A', `${t} stepping back through the path returns to A`, (await kids(d)).join(' '));
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }

  /* ══ 83c — nothing inside: unchanged ══ */
  if (want('83c')) for (const vp of VPS) {
    const t = tag('83c', vp);
    const dn = await mkDev(vp);
    const dold = await addDevice(browser, srvOld.base, makeCloud(), 'Dold', { width: vp.w, height: vp.h }, vp.touch, seed(), {});
    try {
      const html = async (d, pid) => { await sleep(900); await on(d, (p) => { jebOpenPanel(p); }, pid); await sleep(600); return on(d, () => document.getElementById('jeb-panel').outerHTML); };
      for (const pid of ['A1', 'B', 'A2a']) {
        /* v05.25 (Z9, J36), updated in place by the Architect: every item row now carries a "✎ Title" button, so the new build's panel is compared
           with that one button removed; anything else that differs still fails. */
        /* v05.34 (Z12), updated in place by the Architect: v05.33 (Z11, J30) put a Zab's own note area at the top of a Zab with nothing inside
           (`.zn-area` + the panel class `zn-has`), so that is removed from the new build's panel too; anything else that differs still fails. (This check
           passed on v05.33 only because a shallow clone could not find the old commit and compared the build with itself; makeBase() now refuses that.) */
        const a = (await html(dn, pid)).split('<button class="jeb-ttl-b" title="Give this item a title">✎ Title</button>').join('')
          .replace(/<div class="zn-area"[^>]*>[\s\S]*?<\/div>/, '').replace(' class="on zn-has"', ' class="on"'), b = await html(dold, pid);
        check(a === b, `${t} pocket ${pid} (nothing inside): the panel's HTML is byte-identical to the previous build's (apart from v05.25's ✎ Title button)`, a === b ? '' : (() => { let i = 0; while (i < a.length && a[i] === b[i]) i++; return `new ${a.length} bytes, old ${b.length}; first difference at ${i}: new …${a.slice(Math.max(0, i - 60), i + 120)}… old …${b.slice(Math.max(0, i - 60), i + 120)}…`; })());
      }
      const k = await on(dn, () => { const e = document.querySelector('#jeb-panel .jx-kids'); return { hidden: e.hidden, empty: e.innerHTML === '', has: document.getElementById('jeb-panel').classList.contains('jx-has') }; });
      check(k.hidden && k.empty && !k.has, `${t} no list, no heading, no scroll-as-one class`, JSON.stringify(k));
      noErr(dn, t);
    } finally { await dn.ctx.close(); await dold.ctx.close(); }
  }

  /* ══ 83d — menu and new pocket ══ */
  if (want('83d')) for (const vp of VPS) {
    const d = await mkDev(vp), t = tag('83d', vp);
    try {
      await sleep(900); await openA(d, vp);
      const before = await on(d, () => JSON.stringify(DB.jebPockets));
      if (vp.touch) { const c = await ctr(d, kidSel('A1')); await fdrag(d, c, c, { steps: 0, holdMs: 700 }); await sleep(300); }
      else await d.page.locator(kidSel('A1')).first().click({ button: 'right' });
      await sleep(300);
      const menu = await on(d, () => { const m = document.getElementById('jeb-menu'); return m ? [...m.querySelectorAll('.jm')].map((x) => x.textContent) : null; });
      check(menu && menu.some((x) => /Rename/.test(x)) && menu.some((x) => /New Zab inside/.test(x))   /* v05.34 · Z12: words only */, `${t} ${vp.touch ? 'a long press' : 'a right-click'} on a line opens that pocket's menu`, JSON.stringify(menu && menu.slice(0, 4)));
      check((await on(d, () => _jebOpen)) === 'A' && (await on(d, () => JSON.stringify(DB.jebPockets))) === before, `${t} ...A stays open and nothing is written`);
      await on(d, () => _jebHideMenu()); await sleep(200);
      await act(d, vp, '#jeb-panel .jx-new'); await d.page.waitForSelector('#jeb-f-name', { timeout: 4000 }); await sleep(150);
      await d.page.fill('#jeb-f-name', 'A3'); await act(d, vp, '#jeb-f-ok'); await sleep(600);
      const made = await on(d, () => { const p = DB.jebPockets.find((x) => x.name === 'A3'); return p ? p.parentId : null; });
      check(made === 'A', `${t} "＋ New pocket inside" creates A3 inside A`, String(made));
      const lastName = await on(d, () => { const k = [...document.querySelectorAll('#jeb-panel .jx-kid')]; return k.length + ':' + (k.length ? k[k.length - 1].querySelector('.jx-nm').textContent : ''); });
      check(lastName === '3:A3', `${t} ...and the list shows it as the last line (${lastName})`);
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }

  /* ══ 83e — drag ══ */
  if (want('83e')) for (const vp of VPS) {
    const d = await mkDev(vp), t = tag('83e', vp);
    try {
      await sleep(900); await openA(d, vp);
      const s0 = await stamps(d), par0 = await parents(d);
      let lifted = null;
      const from = await ctr(d, kidSel('A2')), to = await ctr(d, kidSel('A1'));
      await drag(d, vp, from, { x: to.x, y: to.b.y + 4 }, { hold: async () => { lifted = await on(d, () => { const e = document.querySelector('.zx-lift'); return e ? { pid: e.dataset.pid, ta: getComputedStyle(e).touchAction } : null; }); } });
      check(lifted && lifted.pid === 'A2' && (!vp.touch || lifted.ta === 'none'), `${t} the line lifts while dragged${vp.touch ? ' and only it is touch-action:none' : ''}`, JSON.stringify(lifted));
      check(same(await kids(d), ['A2', 'A1']) && same(await dbKids(d, 'A'), ['A2', 'A1']), `${t} A2 dropped above A1: A2 A1 on screen and in DB`, (await kids(d)).join(' '));
      const s1 = await stamps(d);
      check(s1.A === s0.A && s1.B === s0.B && s1.A2a === s0.A2a && s1.A2 !== s0.A2, `${t} only pockets whose order changed got a new stamp (A, B, A2a untouched)`, JSON.stringify({ s0, s1 }));
      check((await parents(d)) === par0, `${t} no parentId changed`);
      /* put back: a drop on the bar */
      const snap = await on(d, () => JSON.stringify(DB.jebPockets));
      const f2 = await ctr(d, kidSel('A1'));
      /* v05.40 · Z15: B's capsule may be folded into "▸ N more" (no box); the drop then lands on that chip, which is another Zab's place on the bar all the same */
      await drag(d, vp, f2, await ctr(d, (await zabVisible(d.page, chip('B'))) ? chip('B') : '#jeb-bar .jeb-more'));
      check((await on(d, () => JSON.stringify(DB.jebPockets))) === snap && (await parents(d)) === par0, `${t} a drop on another pocket's capsule changes nothing (never "into")`);
      check(await on(d, () => !document.querySelector('.zx-lift,.zx-o,.zx-b,.zx-a') && [...document.querySelectorAll('.jx-kid')].every((e) => !e.style.transform)), `${t} nothing stays lifted or shifted`);
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }

  /* ══ 83f — a received merge ══ */
  if (want('83f')) {
    const vp = D1440, cloud = makeCloud();
    const A = await mkDev(vp, null, cloud), B = await mkDev(vp, null, cloud), t = '83f (1440, two devices)';
    try {
      await sleep(1500);
      await on(A, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.content += '<p>x</p>'; a.updatedAt = new Date().toISOString(); persist(); flushPendingPush(); });
      await sleep(800); await quiet(cloud, A); await quiet(cloud, B);
      await openA(A, vp);
      const names = () => on(A, () => [...document.querySelectorAll('#jeb-panel .jx-kid')].map((k) => k.querySelector('.jx-nm').textContent + ':' + k.querySelector('.jeb-ct').textContent.trim()));
      check(same(await names(), ['A1:2', 'A2:4']), `${t} before: A1:2 A2:4`, (await names()).join(' '));
      await on(B, () => { jebEditPocket('A1', { name: 'Renamed' }); jebAddItem('A2a', 'fourth'); }); await push(cloud, B);
      check(await wait(async () => same(await names(), ['Renamed:2', 'A2:5'])), `${t} a received rename and a new item repaint the lines with no reload (name and count)`, (await names()).join(' '));
      /* nothing repaints during a drag */
      const from = await ctr(A, kidSel('A2')), to = await ctr(A, kidSel('A1'));
      let during = null;
      await mdrag(A, from, { x: to.x, y: to.y + 10 }, {
        release: false,
        hold: async () => {
          await on(B, () => { jebEditPocket('A1', { name: 'Mid' }); }); await push(cloud, B); await sleep(1500);
          during = await names();
        },
      });
      check(during && during.some((x) => /^Renamed/.test(x)), `${t} nothing repaints while a line is held (still "Renamed" mid-drag)`, JSON.stringify(during));
      await A.page.mouse.up(); await sleep(800);
      check(await wait(async () => (await names()).some((x) => /^Mid/.test(x))), `${t} ...and it catches up after the drop`, (await names()).join(' '));
      noErr(A, t + ' A'); noErr(B, t + ' B');
    } finally { await A.ctx.close(); await B.ctx.close(); }
  }

  /* ══ 83g — many ══ */
  if (want('83g')) for (const vp of VPS) {
    const d = await mkDev(vp, (s) => { for (let i = 0; i < 40; i++) s.jebPockets.push(pk('K' + i, 10 + i, { parentId: 'A' })); }), t = tag('83g', vp);
    try {
      await sleep(900); await openA(d, vp);
      const r = await on(d, async () => {
        const p = document.getElementById('jeb-panel'), out = { n: document.querySelectorAll('#jeb-panel .jx-kid').length, hx: p.scrollWidth - p.clientWidth };
        out.canScroll = p.scrollHeight > p.clientHeight + 10; out.listScrolls = (() => { const l = p.querySelector('.jeb-list'); return l.scrollHeight > l.clientHeight + 5 && getComputedStyle(l).overflowY === 'auto'; })();
        const it = p.querySelector('.jeb-list .jeb-it'), pr = p.getBoundingClientRect();
        for (let k = 0; k < 3; k++) { p.scrollTop = p.scrollHeight; await new Promise((r) => setTimeout(r, 150)); }   /* the rows' real heights replace their estimate as they scroll in */
        const ir = it.getBoundingClientRect();
        out.itemReachable = ir.bottom <= pr.bottom + 2 && ir.top >= pr.top;
        const last = [...p.querySelectorAll('.jx-kid')].pop().getBoundingClientRect(); out.lastIn = last.top < pr.bottom;
        p.scrollTop = 0; const first = p.querySelector('.jx-kid').getBoundingClientRect(); out.firstIn = first.top >= pr.top && first.bottom <= pr.bottom;
        out.head = p.querySelector('.jeb-ph').getBoundingClientRect().top >= pr.top - 1;
        return out;
      });
      check(r.n === 42 || r.n === 40 + 2, `${t} all 40 new lines plus A1 and A2 are drawn, none capped (${r.n})`);
      check(r.canScroll && !r.listScrolls, `${t} the panel scrolls as one (not the item list on its own)`, JSON.stringify(r));
      check(r.itemReachable && r.lastIn && r.firstIn, `${t} the first line, the last line and A's item are each reachable by scrolling`, JSON.stringify(r));
      check(r.hx <= 1, `${t} no horizontal scroll (${r.hx})`);
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }

  /* ══ 83h — Zab mode, no errors ══ */
  if (want('83h')) {
    const vp = D1440, d = await mkDev(vp), t = '83h (1440, Zab mode /?jeb=1)';
    try {
      await d.page.goto(srv.base + '/?jeb=1', { waitUntil: 'domcontentloaded' });
      await d.page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree')); await sleep(900);
      await on(d, () => jebOpenPanel('A')); await sleep(600);
      const g = await geo(d);
      check(same(g.lines.map((l) => l.id), ['A1', 'A2']) && g.lines.every((l) => l.h >= 44 && l.w >= g.cw * 0.9) && g.lines[1].t >= g.lines[0].b - 1, `${t} the docked panel draws the same vertical list`, JSON.stringify(g.lines.map((l) => [l.id, Math.round(l.w), Math.round(l.h)])));
      check(g.item && g.nw && g.item.t >= g.nw.b - 1, `${t} A's items come after it`);
      await d.page.locator(kidSel('A2')).first().click(); await sleep(500);
      check(same(await kids(d), ['A2a']) && (await geo(d)).pathText === 'A>A2', `${t} a click goes down one level`);
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }
} catch (e) {
  console.log(' FAIL  zab-z8 threw: ' + (e && e.stack || e));
  results.push({ ok: false, label: 'threw' });
} finally {
  await browser.close();
  await srv.close(); await srvOld.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
