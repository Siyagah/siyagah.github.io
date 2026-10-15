#!/usr/bin/env node
/* tools/zab-n1.mjs — v05.16, N1: pockets inside pockets, no depth limit (checks 76a–76g).

   Every check runs at 390x844, 820x1180 and 1440x900 (unless it names a size) against a booted app, with real taps
   (touch viewports) or clicks (1440). Nothing touches the network (sync uses the fake cloud).

   76a  move: "＋ New pocket inside" and "📂 Move into…" through the real menus; a 4-deep chain; the path line and the child chips;
        moving into itself / into a pocket inside it is refused with a toast and the picker greys those rows with the reason
   76b  counts: a chip counts its own open items plus those of every pocket inside it (title says so), the tasks due/overdue rule
        rolls up the same way, the ▸ mark shows only on a chip that holds pockets, "All pockets" does not count twice
   76c  delete: a pocket holding a pocket (or an item) cannot be deleted; empty it, delete it, restore it from Trash: the tree is back,
        in either order of restoring (a pocket whose parent is not there yet is drawn at the top level, parentId kept)
   76d  sync (fake cloud, two devices): a move on A reaches B; a parent deleted on A while B moved a pocket into it (B's pocket is at the
        top level with its parentId kept, and snaps back when the parent is restored); a cross-move cycle made on two devices: both
        pockets visible at the top level, no hang; each in both directions
   76e  everything else: the panel shows only its own items, All pockets (indented, foldable, fold not stored), the deck's "inside:" chips,
        the item's "Move to pocket" tree, Choose at any depth, kinds not inherited, → Note from a nested pocket, Zab mode (/?jeb=1)
   76f  scale: 50 pockets over 5 levels with 300 items at 390, CPU x4: the bar and a panel each paint in <= 300 ms (median of 4)
   76g  contrast of the new text on the five presets

   `--only=76a,76c` runs just those. Each printed ok/FAIL line becomes one app-check check (block 76). */
import { playwright, serve, seedDB } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, quiet, push, check, results } from './s1-fake.mjs';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);
if (argv.includes('--fails')) { const o = console.log; let skip = false; console.log = (...x) => { const t = x.join(' '); if (/^\s+ok\s/.test(t)) { skip = true; return; } if (skip && /^\s{6,}\S/.test(t)) { skip = false; return; } skip = false; o(...x); }; }

const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];
const T0 = '2026-10-01T00:00:00.000Z';
const SEED_AT = '1970-01-01T00:00:00.000Z';
const pw = await playwright();
const srv = await serve();
const browser = await pw.chromium.launch();

const mk = (id, pocketId, text, order, extra = {}) => ({ id, pocketId, text, done: false, folderIds: [], tags: [], kind: null, journal: false, order, createdAt: T0, updatedAt: T0, ...extra });
const seed = (extra) => { const db = seedDB(T0); if (extra) extra(db); db.theme = Object.assign({}, db.theme, { zabPhoneLayout: 'bar' }); return db; };   /* v05.18: a phone's Zab is a corner button now; this check is about the bar, so the notebook chooses it (block 77 covers the button) */
/* the four seed pockets (as the app seeds them) plus named ones, for the sync check where both devices must start identical */
const SEEDS = [['jp-task', 'Quick tasks', '✓', '#FFF1A8'], ['jp-idea', 'Ideas', '✶', '#FFD9B8'], ['jp-link', 'Links to read', '↗', '#CFE8FF'], ['jp-shop', 'Shopping', '◫', '#F6D2E4']];
const pockets = (names) => [...SEEDS.map(([id, name, icon, color], i) => ({ id, name, icon, color, order: i, createdAt: SEED_AT, updatedAt: SEED_AT })),
  ...names.map((n, i) => ({ id: n, name: n, icon: '✶', color: '#CFE8FF', order: 4 + i, createdAt: T0, updatedAt: T0 }))];
const dev = (cloud, name, vp, db, opts = {}) => addDevice(browser, srv.base, cloud, name, { width: vp.w, height: vp.h }, vp.touch, db || seed(), opts);
const act = (d, vp, sel) => (vp.touch ? d.page.locator(sel).first().tap() : d.page.locator(sel).first().click());
const noErr = (d, tag) => check(d.errors.length === 0, `${tag} no page errors`, d.errors.slice(0, 2).join(' · '));
const each = async (fn, vps = VPS, opts, db) => { for (const vp of vps) { const d = await dev(makeCloud(), 'D' + vp.name, vp, db ? db() : null, opts); try { await fn(d, vp); } finally { await d.ctx.close(); } } };
const chip = (pid) => `#jeb-bar .jeb-chip[data-pid="${pid}"]`;
const mkP = (d, name, par, ty) => on(d, ([n, p, t]) => { const id = jebAddPocket(n, '✶', '#CFE8FF', p || null); if (t) jebEditPocket(id, { ztype: t }); jebRefresh(); return id; }, [name, par, ty]);
const addItems = (d, pid, n, extra = {}) => on(d, ([p, k, x]) => { for (let i = 0; i < k; i++) jebEditItem(jebAddItem(p, 'item ' + i), x); jebRefresh(); }, [pid, n, extra]);
const pocket = (d, id) => on(d, (i) => JSON.parse(JSON.stringify(DB.jebPockets.find((x) => x.id === i) || null)), id);
const menuOn = async (d, vp, pid) => { await d.page.locator(chip(pid)).first().click({ button: 'right' }); await d.page.waitForSelector('#jeb-menu'); await sleep(120); };
const menuRow = (d, vp, label) => act(d, vp, `#jeb-menu .jm:has-text("${label}")`);
const pm = async (d, vp) => { await act(d, vp, '#jeb-panel .jeb-pm'); await d.page.waitForSelector('#jeb-menu'); await sleep(120); };
const openTop = async (d, vp, pid) => { await act(d, vp, `${chip(pid)} .jeb-main`); await d.page.waitForSelector('#jeb-panel.on', { timeout: 3000 }); await sleep(350); };
const tapKid = async (d, vp, pid) => { await act(d, vp, `#jeb-panel .jx-kid[data-pid="${pid}"]`); await sleep(350); };
const pathText = (d) => on(d, () => { const e = document.querySelector('#jeb-panel .jx-path'); return !e || e.hidden ? '' : e.textContent.replace(/\s+/g, ' ').trim(); });
const kidsText = (d) => on(d, () => { const e = document.querySelector('#jeb-panel .jx-kids'); return !e || e.hidden ? [] : [...e.querySelectorAll('.jx-kid')].map((k) => k.querySelector('.jx-nm').textContent + ' ' + k.querySelector('.jeb-ct').textContent); });
const panelName = (d) => on(d, () => { const b = document.querySelector('#jeb-panel .jeb-pt b'); return b ? b.textContent : ''; });
const barChips = (d) => on(d, () => [...document.querySelectorAll('#jeb-bar .jeb-chip[data-pid]')].map((c) => c.dataset.pid));
const chipInfo = (d, pid) => on(d, (p) => { const c = document.querySelector(`#jeb-bar .jeb-chip[data-pid="${p}"]`); if (!c) return null; const n = c.querySelector('.jeb-ct'); return { n: n.textContent, red: n.classList.contains('jt-red'), kids: !!c.querySelector('.jx-in'), title: c.title }; }, pid);
const toastText = (d) => on(d, () => { const t = [...document.querySelectorAll('.toast')].pop(); return t ? t.textContent : ''; });
const modalOpen = (d) => d.page.waitForSelector('#ov.on #mb', { timeout: 3000 });
const fillCreate = async (d, vp, name) => { await modalOpen(d); await sleep(150); await d.page.fill('#jeb-f-name', name); await act(d, vp, '#jeb-f-ok'); await sleep(450); };
const reload = async (d) => { await d.page.reload({ waitUntil: 'domcontentloaded' }); await d.page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('jeb-bar')); await sleep(600); };
const wait = async (fn, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await sleep(400); } return false; };

try {
  /* ══ 76a — move ══ */
  if (want('76a')) await each(async (d, vp) => {
    const t = `76a@${vp.name}`;
    const T = await mkP(d, 'Tree');
    /* ＋ New pocket inside, through the real long-press / right-click menu */
    await menuOn(d, vp, T);
    const rows = await on(d, () => [...document.querySelectorAll('#jeb-menu .jm')].map((e) => e.textContent));
    check(rows.some((r) => r.includes('Move into…')) && rows.some((r) => r.includes('New pocket inside')), `${t} the pocket menu carries "📂 Move into…" and "＋ New pocket inside" (words, not glyphs)`, rows.join(' / '));
    await menuRow(d, vp, 'New pocket inside'); await fillCreate(d, vp, 'L1');
    const L1 = await on(d, () => DB.jebPockets.find((p) => p.name === 'L1').id);
    const p1 = await pocket(d, L1);
    check(p1.parentId === T && (await panelName(d)) === 'Tree' && (await kidsText(d)).join() === 'L1 0', `${t} it makes L1 inside Tree (parentId set), and Tree's panel opens with L1 in the row of pockets inside`, JSON.stringify({ p1, kids: await kidsText(d) }));
    check((await barChips(d)).includes(T) && !(await barChips(d)).includes(L1), `${t} the bar shows the top level only (Tree yes, L1 no)`, (await barChips(d)).join());
    check((await pathText(d)) === '', `${t} a top-level pocket shows no path line`);
    await tapKid(d, vp, L1);
    check((await panelName(d)) === 'L1' && (await pathText(d)) === 'Tree › L1', `${t} tapping the chip opens L1 in the same panel; the path reads "Tree › L1"`, await pathText(d));
    /* a 4-deep chain: L1 > L2 > L3 > L4 (five levels with Tree); L2 and L3 by the ⋯ menu in the panel */
    await pm(d, vp); await menuRow(d, vp, 'New pocket inside'); await fillCreate(d, vp, 'L2');
    const L2 = await on(d, () => DB.jebPockets.find((p) => p.name === 'L2').id);
    await tapKid(d, vp, L2);
    await pm(d, vp); await menuRow(d, vp, 'New pocket inside'); await fillCreate(d, vp, 'L3');
    const L3 = await on(d, () => DB.jebPockets.find((p) => p.name === 'L3').id);
    await tapKid(d, vp, L3);
    await pm(d, vp); await menuRow(d, vp, 'New pocket inside'); await fillCreate(d, vp, 'L4');
    const L4 = await on(d, () => DB.jebPockets.find((p) => p.name === 'L4').id);
    check((await panelName(d)) === 'L3' && (await pathText(d)) === 'Tree › L1 › L2 › L3' && (await kidsText(d)).join() === 'L4 0', `${t} a chain Tree › L1 › L2 › L3 › L4 (no depth limit): L3's path reads "Tree › L1 › L2 › L3", L4 in its row`, (await pathText(d)) + ' / ' + (await kidsText(d)).join());
    check((await on(d, (i) => jebPath(i).map((p) => p.name).join('>'), L4)) === 'Tree>L1>L2>L3>L4', `${t} jebPath(L4) = [root … L4]`);
    /* ＋ Pocket at the end of the row */
    await act(d, vp, '#jeb-panel .jx-new'); await fillCreate(d, vp, 'L4b');
    check((await kidsText(d)).join() === 'L4 0,L4b 0' && (await on(d, () => jebChildren(null).filter((p) => !p.id.startsWith('jp-')).length)) === 1, `${t} "＋ Pocket" in the row makes another pocket inside L3 (L4, L4b)`, (await kidsText(d)).join());
    /* a path part is tappable */
    await act(d, vp, '#jeb-panel .jx-path button:has-text("L1")'); await sleep(350);
    check((await panelName(d)) === 'L1' && (await pathText(d)) === 'Tree › L1' && (await kidsText(d)).join() === 'L2 0', `${t} tapping "L1" in the path opens L1`, (await panelName(d)) + ' / ' + (await pathText(d)));
    /* move L3 (holding L4 and L4b) to the top level through the picker */
    await on(d, (i) => jebOpenPanel(i), L3); await sleep(300);
    const tBefore = await on(d, () => DB.jebPockets.find((p) => p.id === 'jp-task').updatedAt);
    await pm(d, vp); await menuRow(d, vp, 'Move into'); await modalOpen(d); await sleep(200);
    const pick = await on(d, () => [...document.querySelectorAll('#mb .jx-mv')].map((e) => ({ id: e.dataset.to, off: e.disabled, t: e.querySelector('.jx-mt').textContent, why: (e.querySelector('small') || {}).textContent || '', box: e.querySelector('.jx-box').textContent })));
    check(pick[0].id === '' && pick[0].t === 'Top level' && pick.length >= 1 + 4 + 5 + 1, `${t} the picker lists "Top level" first, then every pocket as a tree (${pick.length} rows)`, pick.map((r) => r.t).join(' | '));
    const off = pick.filter((r) => r.off).map((r) => r.t.replace(/^\S+ /, '') + ':' + r.why);
    check(off.length === 3 && off.every((o) => /L3|L4|L4b/.test(o) && o.split(':')[1].length > 5), `${t} the pocket itself and the two inside it are greyed, each with the reason`, off.join(' | '));
    const boxes = pick.filter((r) => r.box === '☑').map((r) => r.t);
    check(boxes.length === 1 && /L2/.test(boxes[0]), `${t} tick boxes: a ☑ on where it is now (L2) and ☐ elsewhere`, boxes.join());
    await d.page.locator('#mb .jx-mv[disabled]').first().click({ force: true }).catch(() => {}); await sleep(250);
    check((await pocket(d, L3)).parentId === L2 && (await d.page.locator('#ov.on #mb').count()) === 1, `${t} tapping a greyed row does nothing (the dialog stays, L3 stays in L2)`);
    await act(d, vp, '#mb .jx-mv[data-to=""]'); await sleep(450);
    const p3 = await pocket(d, L3);
    check(!('parentId' in p3) && (await barChips(d)).includes(L3) && (await pathText(d)) === '', `${t} "Top level" moves L3 out: parentId gone, a chip on the bar, no path line`, JSON.stringify(p3));
    const ci = await chipInfo(d, L3);
    check(ci && ci.kids, `${t} L3's chip carries the ▸ mark (it holds pockets)`, JSON.stringify(ci));
    check((await pocket(d, 'jp-task')).updatedAt === tBefore && (await pocket(d, L4)).parentId === L3 && (await kidsText(d)).join() === 'L4 0,L4b 0', `${t} only what moved is stamped (a pocket elsewhere is untouched); L4 and L4b went with L3`);
    /* refused moves: into itself, into a pocket inside it - API (the toast) and the picker (greyed, above) */
    const r1 = await on(d, ([a]) => jebMovePocketInto(a, a), [L3]);
    check(r1 === false && /itself/.test(await toastText(d)), `${t} moving a pocket into itself is refused with a toast in plain words`, await toastText(d));
    const r2 = await on(d, ([a, b]) => jebMovePocketInto(a, b), [L3, L4]);
    check(r2 === false && /inside it/.test(await toastText(d)) && !('parentId' in (await pocket(d, L3))), `${t} moving a pocket into one inside it is refused with a toast, nothing changes`, await toastText(d));
    const r3 = await on(d, ([a]) => jebMovePocketInto(a, 'no-such'), [L3]);
    check(r3 === false && !('parentId' in (await pocket(d, L3))), `${t} a move into a pocket that is not there is refused`);
    const r4 = await on(d, ([a]) => jebEditPocket(a, { parentId: 'jp-task', name: 'L3' }) && DB.jebPockets.find((p) => p.id === a).parentId, [L3]);
    check(r4 === undefined, `${t} jebEditPocket does not take parentId (only jebMovePocketInto changes it)`, String(r4));
    /* move back in, by the picker, at the top level (the bar chip's own menu), into L2 */
    await menuOn(d, vp, L3); await menuRow(d, vp, 'Move into'); await modalOpen(d); await sleep(200);
    await act(d, vp, `#mb .jx-mv[data-to="${L2}"]`); await sleep(450);
    const tail = await on(d, (i) => jebPath(i).map((p) => p.name).join('>'), L3);
    check(tail === 'Tree>L1>L2>L3' && !(await barChips(d)).includes(L3), `${t} moved back into L2 from the bar chip's menu: ${tail}; the chip leaves the bar`, tail);
    /* siblings are renumbered 0..n-1 */
    const ord = await on(d, (i) => jebChildren(i).map((p) => p.order).join(), L2);
    check(ord === '0', `${t} order is the place among siblings (L2 holds one: ${ord})`);
    noErr(d, t);
  });

  /* ══ 76b — counts and the ▸ mark ══ */
  if (want('76b')) await each(async (d, vp) => {
    const t = `76b@${vp.name}`;
    const T = await mkP(d, 'Tree'), L1 = await mkP(d, 'L1', T), L2 = await mkP(d, 'L2', L1), LEAF = await mkP(d, 'Leaf');
    await addItems(d, T, 1); await addItems(d, T, 1, { done: true }); await addItems(d, L1, 2); await addItems(d, L2, 3); await addItems(d, LEAF, 4);
    await sleep(300);
    let ci = await chipInfo(d, T);
    check(ci && ci.n === '6' && !ci.red, `${t} Tree's chip counts its own 1 open + L1's 2 + L2's 3 = 6 (a done item adds nothing)`, JSON.stringify(ci));
    check(ci.title.includes('every pocket inside it'), `${t} the chip's title states the rule`, ci.title);
    check(ci.kids, `${t} the ▸ mark is on Tree`);
    const lf = await chipInfo(d, LEAF);
    check(lf.n === '4' && !lf.kids && !lf.title.includes('inside it'), `${t} a pocket with nothing inside counts only itself (4), has no ▸ mark and the plain title`, JSON.stringify(lf));
    const allN = await on(d, () => document.querySelector('#jeb-bar .jeb-all .jeb-ct').textContent);
    check(allN === '10', `${t} "All pockets" counts every open item once (6 + 4 = 10, not double): ${allN}`);
    await openTop(d, vp, T);
    const kids = await kidsText(d);
    check(kids.join() === 'L1 5', `${t} inside Tree's panel, the L1 chip counts L1 + L2 = 5`, kids.join());
    /* tasks: the due/overdue count follows the same rule */
    const TK = 'jp-task';   /* a tasks pocket (seed) */
    const BOX = await mkP(d, 'Box'); await addItems(d, BOX, 1);
    const TKC = await mkP(d, 'Tk', BOX, 'tasks');
    const i1 = await on(d, (p) => jebAddItem(p, 'overdue'), TKC), i2 = await on(d, (p) => jebAddItem(p, 'whenever'), TKC);
    await on(d, (i) => { jebEditItem(i, { due: '2000-01-01' }); jebRefresh(); }, i1);
    ci = await chipInfo(d, BOX);
    check(ci.n === '2' && ci.red, `${t} a tasks pocket inside: Box (1 item) + Tk's overdue count (1) = 2, shown red`, JSON.stringify(ci));
    await on(d, (i) => { jebToggleDone(i); jebRefresh(); }, i1);
    ci = await chipInfo(d, BOX);
    check(ci.n === '2' && !ci.red, `${t} overdue ticked off: Tk counts its open tasks (1: "whenever") again, Box 1 + 1 = 2, no longer red`, JSON.stringify(ci));
    /* a tasks pocket that holds a plain pocket */
    const sub = await mkP(d, 'Sub', TK); await addItems(d, sub, 3);
    const o1 = await on(d, (p) => jebAddItem(p, 'late'), TK); await on(d, (i) => { jebEditItem(i, { due: '2000-01-01' }); jebRefresh(); }, o1);
    ci = await chipInfo(d, TK);
    check(ci.n === '4' && ci.red && ci.title.includes('due today'), `${t} a tasks pocket holding a pocket: its own overdue (1) + Sub's 3 open = 4, red; the title keeps the tasks rule too`, JSON.stringify(ci));
    /* the chip number is live: a new item in the deepest pocket */
    await addItems(d, L2, 1);
    check((await chipInfo(d, T)).n === '7', `${t} a new item in L2 raises Tree's number at once (7)`, (await chipInfo(d, T)).n);
    noErr(d, t);
  });

  /* ══ 76c — delete and restore ══ */
  if (want('76c')) await each(async (d, vp) => {
    const t = `76c@${vp.name}`;
    const P = await mkP(d, 'Parent'), C = await mkP(d, 'Child', P);
    const it = await on(d, (p) => jebAddItem(p, 'inside the child'), C);
    const r1 = await on(d, (p) => jebDeletePocket(p), P);
    check(r1 === false && /holds items or pockets/.test(await toastText(d)) && !!(await pocket(d, P)), `${t} a pocket that holds a pocket cannot be deleted - the toast says "A pocket that holds items or pockets cannot be deleted — move or delete them first"`, await toastText(d));
    await menuOn(d, vp, P); await menuRow(d, vp, 'Delete pocket'); await sleep(350);
    check(!!(await pocket(d, P)) && (await on(d, () => DB.trash.filter((x) => x.type === 'jebPocket').length)) === 0, `${t} ...and the real menu's "🗑 Delete pocket" refuses too (Parent and Child are still there, Trash empty)`);
    const r2 = await on(d, (p) => jebDeletePocket(p), C);
    check(r2 === false && /items/.test(await toastText(d)), `${t} a pocket that holds an item cannot be deleted either`);
    await on(d, (i) => { jebDeleteItem(i); jebRefresh(); }, it);
    /* the child, deleted from its own ⋯ menu inside the parent's panel */
    await openTop(d, vp, P); await tapKid(d, vp, C);
    await pm(d, vp); await menuRow(d, vp, 'Delete pocket'); await sleep(450);
    const trC = await on(d, () => DB.trash.filter((x) => x.type === 'jebPocket').map((x) => ({ id: x.id, pid: x.item.id, par: x.item.parentId })));
    check(trC.length === 1 && trC[0].par === P && !(await pocket(d, C)) && (await panelName(d)) === 'Parent', `${t} the empty child goes to Trash (with its parentId); the panel steps up to Parent`, JSON.stringify(trC) + ' ' + (await panelName(d)));
    check((await on(d, (i) => DB.tombstones ? JSON.stringify(DB.tombstones).includes(i) : true, C)), `${t} ...and its tombstone is written`);
    await on(d, () => jebClosePanel());
    await menuOn(d, vp, P); await menuRow(d, vp, 'Delete pocket'); await sleep(450);
    const tr = await on(d, () => DB.trash.filter((x) => x.type === 'jebPocket').map((x) => ({ id: x.id, pid: x.item.id })));
    check(tr.length === 2 && !(await pocket(d, P)), `${t} now Parent is empty and goes to Trash too (2 entries)`, JSON.stringify(tr));
    /* restore: Parent first, then Child - the tree is back */
    const tid = (pid) => tr.find((x) => x.pid === pid).id;
    await on(d, (id) => { restoreItem(id); }, tid(P)); await sleep(300); await on(d, (id) => { restoreItem(id); }, tid(C)); await sleep(500);
    const back = await on(d, ([a, b]) => ({ pa: jebPath(b).map((p) => p.name).join('>'), raw: DB.jebPockets.find((p) => p.id === b).parentId === a }), [P, C]);
    check(back.pa === 'Parent>Child' && back.raw, `${t} restored from Trash (Parent, then Child): the tree is back, ${back.pa}`, JSON.stringify(back));
    check((await chipInfo(d, P)).kids && !(await barChips(d)).includes(C), `${t} Parent's chip has the ▸ mark again; Child is not on the bar`);
    /* delete both again, restore the child FIRST: it is drawn at the top level, keeps its parentId, and snaps back */
    await on(d, ([a, b]) => { jebDeletePocket(b); jebDeletePocket(a); jebRefresh(); }, [P, C]);
    const tr2 = await on(d, () => DB.trash.filter((x) => x.type === 'jebPocket').slice(-2).map((x) => ({ id: x.id, pid: x.item.id })));
    await on(d, (id) => { restoreItem(id); }, tr2.find((x) => x.pid === C).id); await sleep(500);
    const lone = await on(d, (c) => ({ top: jebChildren(null).some((p) => p.id === c), pid: DB.jebPockets.find((p) => p.id === c).parentId, chip: !!document.querySelector(`#jeb-bar .jeb-chip[data-pid="${c}"]`) }), C);
    check(lone.top && lone.chip && lone.pid === P, `${t} restoring Child while Parent is still in Trash: Child is on the bar at the top level and keeps its parentId`, JSON.stringify(lone));
    await on(d, (id) => { restoreItem(id); }, tr2.find((x) => x.pid === P).id); await sleep(500);
    check((await on(d, (c) => jebPath(c).length, C)) === 2 && !(await barChips(d)).includes(C), `${t} ...then restoring Parent snaps Child back inside it`);
    noErr(d, t);
  });

  /* ══ 76d — sync, two devices on one fake cloud ══ */
  if (want('76d')) {
    const vp = VPS[2];
    const names = ['X', 'Y', 'X2', 'Y2', 'P', 'Q', 'P2', 'Q2', 'M', 'N', 'M2', 'N2'];
    const db = () => seed((s) => { s.jebPockets = pockets(names); s.jeb = []; });
    const cloud = makeCloud();
    const A = await dev(cloud, 'A', vp, db()), B = await dev(cloud, 'B', vp, db());
    const par = (d, id) => on(d, (i) => { const p = DB.jebPockets.find((x) => x.id === i); return p ? (p.parentId || null) : 'GONE'; }, id);
    const drawn = (d, id) => on(d, (i) => { const t = _jebTree(); return t.byId.has(i) ? (t.eff.get(i) || null) : 'GONE'; }, id);
    const flush = (d) => on(d, () => { jebRefresh(); flushPendingPush(); });
    const offline = async (d, v) => { d.offline = v; await d.ctx.setOffline(v); if (!v) cloud.reconnect(d); };
    try {
      await sleep(1500);
      await on(A, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.content += '<p>x</p>'; a.updatedAt = new Date().toISOString(); persist(); flushPendingPush(); });
      await sleep(800); await quiet(cloud, A); await quiet(cloud, B);
      /* 1 - a move on A arrives on B, and one on B arrives on A */
      await on(A, () => { jebMovePocketInto('M', 'N'); }); await flush(A); await quiet(cloud, A);
      check(await wait(async () => (await par(B, 'M')) === 'N'), '76d a move on A (M into N) arrives on B', 'B: ' + (await par(B, 'M')));
      check((await on(B, () => jebPath('M').map((p) => p.name).join('>'))) === 'N>M', '76d ...and B draws it inside N');
      await on(B, () => { jebMovePocketInto('M2', 'N2'); }); await flush(B); await quiet(cloud, B);
      check(await wait(async () => (await par(A, 'M2')) === 'N2'), '76d a move on B (M2 into N2) arrives on A', 'A: ' + (await par(A, 'M2')));
      await on(A, () => { jebMovePocketInto('M', null); }); await flush(A); await quiet(cloud, A);
      check(await wait(async () => (await par(B, 'M')) === null && (await on(B, () => 'parentId' in DB.jebPockets.find((p) => p.id === 'M'))) === false), '76d moving it back to the top level on A reaches B (parentId gone)');
      /* 2 - a parent deleted on one device while the other moved a pocket into it (both directions) */
      for (const [one, other, X, Y, tag] of [[A, B, 'X', 'Y', 'B moved into it while A deleted it'], [B, A, 'X2', 'Y2', 'A moved into it while B deleted it']]) {
        await offline(other, true);
        await on(other, ([x, y]) => { jebMovePocketInto(y, x); }, [X, Y]);
        await on(one, (x) => { jebDeletePocket(x); jebRefresh(); }, X);
        await flush(one); await quiet(cloud, one);
        await sleep(1500);
        await offline(other, false); await push(cloud, other);
        const ok = await wait(async () => (await par(one, X)) === 'GONE' && (await par(other, X)) === 'GONE' && (await par(one, Y)) === X && (await par(other, Y)) === X);
        check(ok, `76d parent deleted, ${tag}: ${Y} keeps its parentId (${X}) on both devices`, JSON.stringify([await par(one, X), await par(other, X), await par(one, Y), await par(other, Y)]));
        check((await drawn(one, Y)) === null && (await drawn(other, Y)) === null && (await barChips(one)).includes(Y) && (await barChips(other)).includes(Y), `76d ...and ${Y} is drawn at the top level, with a chip on the bar, on both`);
        /* restore the parent where it was deleted: the pocket snaps back inside it everywhere */
        const tid = await on(one, (x) => DB.trash.find((e) => e.type === 'jebPocket' && e.item.id === x).id, X);
        await on(one, (id) => { restoreItem(id); jebRefresh(); flushPendingPush(); }, tid); await quiet(cloud, one);
        const snap = await wait(async () => (await drawn(one, Y)) === X && (await drawn(other, Y)) === X);
        check(snap, `76d ...restoring ${X} snaps ${Y} back inside it on both devices`, JSON.stringify([await drawn(one, Y), await drawn(other, Y)]));
      }
      /* 3 - a cross-move cycle made on two devices (both directions) */
      for (const [one, other, p, q, tag] of [[A, B, 'P', 'Q', 'B moved P into Q, A moved Q into P'], [B, A, 'P2', 'Q2', 'A moved P2 into Q2, B moved Q2 into P2']]) {
        await offline(other, true);
        await on(other, ([a, b]) => { jebMovePocketInto(a, b); }, [p, q]);
        await sleep(300);
        await on(one, ([a, b]) => { jebMovePocketInto(b, a); }, [p, q]);
        await flush(one); await quiet(cloud, one); await sleep(1500);
        await offline(other, false); await push(cloud, other);
        const both = async (d) => (await par(d, p)) === q && (await par(d, q)) === p;
        const ok = await wait(async () => (await both(one)) && (await both(other)));
        check(ok, `76d cycle (${tag}): both devices end with P → Q and Q → P stored`, JSON.stringify([await par(one, p), await par(one, q), await par(other, p), await par(other, q)]));
        for (const d of [one, other]) {
          const r = await Promise.race([on(d, ([a, b]) => ({ ea: _jebTree().eff.get(a) || null, eb: _jebTree().eff.get(b) || null, pa: jebPath(a).length, pb: jebPath(b).length, da: jebDescendants(a).length, db: jebDescendants(b).length, flat: _jebTree().flat.filter((x) => x.id === a || x.id === b).length }), [p, q]), sleep(5000).then(() => 'HANG')]);
          check(r !== 'HANG' && r.ea === null && r.eb === null && r.pa === 1 && r.pb === 1 && r.flat === 2, `76d cycle (${tag}) on ${d.name}: no hang; both pockets are drawn at the top level, each once`, JSON.stringify(r));
          const chips = await barChips(d);
          check(chips.includes(p) && chips.includes(q), `76d ...and both have a chip on ${d.name}'s bar`, chips.join());
        }
        await on(one, ([a]) => { jebOpenPanel(a); }, [p]); await sleep(300);
        check((await panelName(one)) !== '' && (await pathText(one)) === '', `76d ...a cycle member's panel opens (no path line)`);
        await on(one, () => jebClosePanel());
        /* repair: moving one to the top level mends the cycle */
        await on(one, ([a]) => { jebMovePocketInto(a, null); }, [p]);
        check((await on(one, ([a, b]) => jebPath(b).map((x) => x.name).join('>'), [p, q])) === `${p}>${q}`, `76d ...moving ${p} to the top level mends it (${q} is inside ${p})`);
        await flush(one); await quiet(cloud, one);
      }
      check(A.errors.length + B.errors.length === 0, '76d no page errors', [...A.errors, ...B.errors].slice(0, 2).join(' · '));
    } finally { await A.ctx.close(); await B.ctx.close(); }
  }

  /* ══ 76e — the rest ══ */
  if (want('76e')) {
    await each(async (d, vp) => {
      const t = `76e@${vp.name}`;
      const T = await mkP(d, 'Tree'), L1 = await mkP(d, 'L1', T), L2 = await mkP(d, 'L2', L1), SIDE = await mkP(d, 'Side', T);
      const it0 = await on(d, ([p]) => jebAddItem(p, 'tree item'), [T]); await on(d, ([p]) => jebAddItem(p, 'l1 item'), [L1]); await on(d, ([p]) => jebAddItem(p, 'l2 item'), [L2]);
      await on(d, () => jebRefresh());
      /* the panel: own items only */
      await openTop(d, vp, T);
      const own = await on(d, () => [...document.querySelectorAll('#jeb-panel .jeb-list .jeb-tx')].map((e) => e.textContent).join('|'));
      check(own === 'tree item', `${t} a pocket's panel lists its own items only (not those of the pockets inside): ${own}`);
      check((await kidsText(d)).join() === 'L1 2,Side 0', `${t} ...with the pockets inside as chips above (icon, name, count)`, (await kidsText(d)).join());
      const geom = await on(d, () => { const k = document.querySelector('#jeb-panel .jx-kids'), a = document.querySelector('#jeb-panel .jeb-add'), h = document.querySelector('#jeb-panel .jeb-ph'); return { kidsBelowHead: k.getBoundingClientRect().top >= h.getBoundingClientRect().bottom - 1, kidsAboveAdd: k.getBoundingClientRect().bottom <= a.getBoundingClientRect().top + 1, ph: Math.round(h.getBoundingClientRect().height), kh: Math.round(k.getBoundingClientRect().height), over: document.getElementById('jeb-panel').scrollWidth > document.getElementById('jeb-panel').clientWidth + 1 }; });
      check(geom.kidsBelowHead && geom.kidsAboveAdd && geom.kh >= 132 && !geom.over, `${t} the list sits under the header and above the add box, full rows (${geom.kh}px; v05.23 Z8 turned the one-line chip row into a vertical list, so the old limit kh <= 64 is now kh >= 132, three rows of >= 44), the panel does not overflow`, JSON.stringify(geom));
      await tapKid(d, vp, L1); await tapKid(d, vp, L2);
      const nest = await on(d, () => [...document.querySelectorAll('#jeb-panel .jeb-list .jeb-tx')].map((e) => e.textContent).join('|'));
      check(nest === 'l2 item' && (await pathText(d)) === 'Tree › L1 › L2', `${t} L2's panel: its own item, path "Tree › L1 › L2"`, nest + ' / ' + (await pathText(d)));
      const pw = await on(d, () => { const e = document.querySelector('#jeb-panel .jx-path'); return { h: Math.round(e.getBoundingClientRect().height), w: e.scrollWidth <= e.clientWidth + 1 }; });
      check(pw.h <= 60 && pw.w, `${t} the path line is calm (${pw.h}px, no sideways overflow)`, JSON.stringify(pw));
      /* an item added in the nested panel by real typing */
      await act(d, vp, '#jeb-add-in'); await d.page.keyboard.type('typed in L2'); await d.page.keyboard.press('Enter'); await sleep(400);
      check((await on(d, (p) => jebItems(p).map((i) => i.text).join('|'), L2)).includes('typed in L2'), `${t} typing into a nested pocket's add box adds to that pocket`);
      /* → Note from a nested pocket */
      const nN = await on(d, () => DB.articles.length);
      await act(d, vp, '#jeb-panel .jeb-it:first-child .jeb-note-b'); await sleep(700);
      const made = await on(d, () => { const a = DB.articles.find((x) => x.fromJeb); return a ? a.fromJeb.pocket : null; });
      check((await on(d, () => DB.articles.length)) === nN + 1 && !!made, `${t} → Note works on an item in a nested pocket (a note is made, "from" its pocket)`, String(made));
      await on(d, () => jebRefresh());
      /* All pockets: indented, foldable */
      await on(d, () => jebClosePanel()); await sleep(200);
      await act(d, vp, '#jeb-bar .jeb-all .jeb-main'); await d.page.waitForSelector('#jeb-panel.on'); await sleep(450);
      const heads = await on(d, () => [...document.querySelectorAll('#jeb-panel .jeb-gh')].map((h) => ({ n: h.querySelector('b').textContent, d: +h.dataset.depth, pl: parseInt(h.style.paddingLeft || '0', 10) })));
      const want6 = ['Quick tasks', 'Ideas', 'Links to read', 'Shopping', 'Tree', 'L1', 'L2', 'Side'];
      check(heads.map((h) => h.n).join() === ['Quick tasks', 'Ideas', 'Links to read', 'Shopping', 'Tree', 'L1', 'L2', 'Side'].join(), `${t} All pockets: each top-level pocket, the pockets inside under it in order (${heads.map((h) => h.n).join(', ')})`, JSON.stringify(heads));
      const dp = Object.fromEntries(heads.map((h) => [h.n, h])); void want6;
      check(dp.Tree.d === 0 && dp.L1.d === 1 && dp.L2.d === 2 && dp.Side.d === 1 && dp.L1.pl > dp.Tree.pl && dp.L2.pl > dp.L1.pl, `${t} ...sub-groups are indented by depth (Tree ${dp.Tree.pl} < L1 ${dp.L1.pl} < L2 ${dp.L2.pl}px)`, JSON.stringify(dp));
      await act(d, vp, `#jeb-panel .jx-fold[data-pid="${L1}"]`); await sleep(350);
      const f1 = await on(d, () => [...document.querySelectorAll('#jeb-panel .jeb-gh')].map((h) => h.querySelector('b').textContent).join() + '|' + document.querySelector('#jeb-panel .jx-fold[aria-expanded="false"]').dataset.pid);
      check(f1.startsWith('Quick tasks,Ideas,Links to read,Shopping,Tree,L1,Side|') && f1.endsWith(L1), `${t} folding L1 hides L2 (its header and items) and keeps L1's own header and Side`, f1);
      await act(d, vp, `#jeb-panel .jx-fold[data-pid="${T}"]`); await sleep(350);
      const f2 = await on(d, () => [...document.querySelectorAll('#jeb-panel .jeb-gh')].map((h) => h.querySelector('b').textContent).join());
      check(f2 === 'Quick tasks,Ideas,Links to read,Shopping,Tree', `${t} folding Tree hides everything inside it: ${f2}`);
      check(!JSON.stringify(await on(d, () => DB.theme)).includes('fold'), `${t} the fold is per session: nothing is stored in the notebook`);
      await act(d, vp, `#jeb-panel .jx-fold[data-pid="${T}"]`); await act(d, vp, `#jeb-panel .jx-fold[data-pid="${L1}"]`); await sleep(300);
      check((await on(d, () => document.querySelectorAll('#jeb-panel .jeb-gh').length)) === 8, `${t} unfolding both brings all eight groups back`);
      /* the item's Move to pocket, as a tree */
      await on(d, () => jebClosePanel());
      await openTop(d, vp, T);
      await act(d, vp, `#jeb-panel .jeb-it[data-iid="${it0}"] .jeb-more`); await d.page.waitForSelector('#jeb-menu');
      await act(d, vp, '#jeb-menu .jm:has-text("Move to pocket")'); await sleep(250);
      const mrows = await on(d, () => [...document.querySelectorAll('#jeb-menu .jm')].map((e) => e.textContent));
      const ind = mrows.filter((r) => /^ +\S/.test(r)).map((r) => r.replace(/ /g, '·'));
      const iL1 = mrows.findIndex((r) => /L1$/.test(r)), iL2 = mrows.findIndex((r) => /L2$/.test(r));
      check(iL1 > 0 && iL2 === iL1 + 1 && /^ +/.test(mrows[iL1]) && mrows[iL2].match(/^ */)[0].length > mrows[iL1].match(/^ */)[0].length, `${t} item "📂 Move to pocket ▸" lists pockets as an indented tree (L1 under Tree, L2 under L1, deeper)`, ind.join(' / '));
      await act(d, vp, '#jeb-menu .jm:has-text("L2")'); await sleep(400);
      check((await on(d, (i) => jebMoveItem && DB.jeb.find((x) => x.id === i).pocketId, it0)) === L2, `${t} picking L2 moves the item into the nested pocket`);
      /* the deck: "inside:" chips */
      await on(d, () => jebClosePanel()); await sleep(200);
      await act(d, vp, `${chip(T)} [data-jeb-cards]`); await d.page.waitForSelector('#jeb-deck.on'); await sleep(500);
      const ins = await on(d, () => [...document.querySelectorAll('#jeb-deck .jx-ins button')].map((b) => b.lastChild.textContent.trim()));
      const cards = await on(d, () => [...document.querySelectorAll('#jeb-deck .jeb-card .jeb-tx')].map((e) => e.textContent).join('|'));
      check(ins.join() === 'L1,Side' && !cards.includes('l1 item'), `${t} the deck of a pocket that holds pockets has "inside:" chips (${ins.join()}) and only its own cards (${cards || 'none'})`, ins.join() + ' / ' + cards);
      await act(d, vp, '#jeb-deck .jx-ins button:has-text("L1")'); await sleep(500);
      const dt = await on(d, () => ({ title: document.querySelector('#jeb-deck .jd-hd b').textContent, ins: [...document.querySelectorAll('#jeb-deck .jx-ins button')].map((b) => b.lastChild.textContent.trim()).join(), cards: [...document.querySelectorAll('#jeb-deck .jeb-card .jeb-tx')].map((e) => e.textContent).join('|') }));
      check(dt.title === 'L1' && dt.ins === 'L2' && dt.cards === 'l1 item', `${t} tapping a chip spreads that pocket's cards (L1: its own card, "inside: L2")`, JSON.stringify(dt));
      await on(d, () => jebCloseDeck());
      /* Choose reaches any depth */
      await act(d, vp, '#jeb-bar .jeb-choose'); await sleep(350);
      const cc = await on(d, () => [...document.querySelectorAll('#jeb-bar .jeb-chip[data-pid] .jeb-nm')].map((e) => e.textContent));
      check(cc.includes('↳ L1') && cc.includes('↳ L2') && cc.includes('Tree'), `${t} Choose lists every pocket at any depth (nested ones marked ↳): ${cc.slice(4).join(', ')}`, cc.join());
      await act(d, vp, chip(L2) + ' .jeb-main'); await act(d, vp, chip(T) + ' .jeb-main'); await sleep(250);
      await act(d, vp, '#jeb-bar .jeb-go[data-go="panel"]'); await d.page.waitForSelector('#jeb-panel.on'); await sleep(400);
      const chosen = await on(d, () => [...document.querySelectorAll('#jeb-panel .jeb-gh b')].map((e) => e.textContent).join());
      check(chosen === 'Tree,L2', `${t} choosing a deep pocket and a top one: the grouped panel shows both (${chosen})`);
      await on(d, () => jebClosePanel());
      /* kinds are not inherited */
      const TKc = await mkP(d, 'Tasks inside', T, 'tasks'), PLc = await mkP(d, 'Plain inside', 'jp-task');
      const ky = await on(d, ([a, b, c]) => [_jebType(_jebPocket(a)), _jebType(_jebPocket(b)), _jebType(_jebPocket(c))].join(), [TKc, PLc, T]);
      check(ky === 'tasks,plain,plain', `${t} every pocket keeps its own kind: a tasks pocket inside a plain one stays tasks, a plain one inside a tasks pocket stays plain (${ky})`);
      await on(d, ([p]) => { jebAddItem(p, 'rent'); jebRefresh(); }, [TKc]);
      await on(d, ([p]) => jebOpenPanel(p), [TKc]); await sleep(350);
      check((await on(d, () => !!document.querySelector('#jeb-panel .jt-group, #jeb-panel .jt-g, #jeb-panel .jeb-list [class*="jt-"]'))), `${t} ...and the nested tasks pocket is drawn as a tasks list`);
      noErr(d, t);
    });
    /* Zab mode, docked */
    const vp = VPS[2];
    const d = await dev(makeCloud(), 'Z', vp, seed(), { path: '/?jeb=1' });
    try {
      const t = '76e@1440-zab';
      const T = await mkP(d, 'Tree'), L1 = await mkP(d, 'L1', T); await addItems(d, L1, 2);
      await on(d, ([p]) => jebOpenPanel(p), [T]); await sleep(500);
      check((await kidsText(d)).join() === 'L1 2' && (await panelName(d)) === 'Tree', `${t} Zab mode: the docked panel shows the pockets inside as chips`, (await kidsText(d)).join());
      await tapKid(d, vp, L1);
      check((await pathText(d)) === 'Tree › L1' && (await panelName(d)) === 'L1', `${t} ...a tap opens L1 in the same panel, with the path`, await pathText(d));
      await act(d, vp, '#jeb-panel .jx-path button:has-text("Tree")'); await sleep(350);
      check((await panelName(d)) === 'Tree', `${t} ...and the path steps back up`);
      const docked = await on(d, () => { const p = document.getElementById('jeb-panel'); const r = p.getBoundingClientRect(); return { on: p.classList.contains('on'), over: p.scrollWidth > p.clientWidth + 1, w: Math.round(r.width) }; });
      check(docked.on && !docked.over, `${t} ...docked, no overflow (${docked.w}px wide)`, JSON.stringify(docked));
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }

  /* ══ 76f — scale ══ */
  if (want('76f')) {
    const vp = VPS[0];
    const db = () => seed((s) => {
      const ps = [], items = [];
      /* 50 pockets over 5 levels: a spine p0 > p1 > p2 > p3 > p4, the rest spread under the first ones; 300 items */
      for (let i = 0; i < 50; i++) {
        const parent = i < 5 ? (i === 0 ? null : 'p' + (i - 1)) : (i % 7 === 0 ? null : 'p' + (i % 5));
        ps.push({ id: 'p' + i, name: 'Pocket ' + i, icon: '✶', color: '#CFE8FF', order: i, createdAt: T0, updatedAt: T0, ...(parent ? { parentId: parent } : {}) });
      }
      for (let k = 0; k < 300; k++) items.push(mk('i' + k, 'p' + (k % 50), 'Item ' + k + ' with a fairly long line of text to wrap on a phone', Math.floor(k / 50), k % 5 === 0 ? { done: true } : {}));
      s.jebPockets = [...pockets([]).slice(0, 4), ...ps.map((p, i) => ({ ...p, order: p.order }))]; s.jeb = items;
    });
    const d = await dev(makeCloud(), 'S', vp, db());
    try {
      const shape = await on(d, () => ({ n: DB.jebPockets.length, depth: Math.max(...DB.jebPockets.map((p) => jebPath(p.id).length)), items: DB.jeb.length }));
      check(shape.n === 54 && shape.depth >= 5 && shape.items === 300, `76f the scale notebook: ${shape.n - 4} pockets over ${shape.depth} levels, ${shape.items} items`, JSON.stringify(shape));
      const cdp = await d.ctx.newCDPSession(d.page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const bar = [], panel = [], deep = [];
      for (let k = 0; k < 4; k++) {
        bar.push(await d.page.evaluate(() => new Promise((res) => { _jebBarSig = ''; _jebTreeC = null; const t0 = performance.now(); jebRefresh(); requestAnimationFrame(() => requestAnimationFrame(() => res(Math.round(performance.now() - t0)))); })));
        await sleep(250);
        panel.push(await d.page.evaluate(() => new Promise((res) => { jebClosePanel(); _jebTreeC = null; const t0 = performance.now(); jebOpenPanel('p0'); requestAnimationFrame(() => requestAnimationFrame(() => res(Math.round(performance.now() - t0)))); })));
        await sleep(250);
        deep.push(await d.page.evaluate(() => new Promise((res) => { jebClosePanel(); const t0 = performance.now(); jebOpenPanelSel({ ids: [], all: true }); requestAnimationFrame(() => requestAnimationFrame(() => res(Math.round(performance.now() - t0)))); })));
        await sleep(250);
      }
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      console.log('N1-SCALE ' + JSON.stringify({ bar, panel, allPockets: deep }));
      const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
      check(med(bar) <= 300, `76f the bar paints in <= 300 ms at 390, CPU x4, median of 4 (${bar.join(' / ')} ms; median ${med(bar)})`, JSON.stringify(bar));
      check(med(panel) <= 300, `76f a pocket's panel (with its pockets inside) paints in <= 300 ms (${panel.join(' / ')} ms; median ${med(panel)})`, JSON.stringify(panel));
      check(med(deep) <= 300, `76f "All pockets" (50 pockets as indented groups, 300 items) paints in <= 300 ms (${deep.join(' / ')} ms; median ${med(deep)})`, JSON.stringify(deep));
      noErr(d, '76f');
    } finally { await d.ctx.close(); }
  }

  /* ══ 76g — contrast ══ */
  if (want('76g')) await each(async (d, vp) => {
    const t = `76g@${vp.name}`;
    const T = await mkP(d, 'Tree'), L1 = await mkP(d, 'L1', T), L2 = await mkP(d, 'L2', L1); await mkP(d, 'Side', T);
    await addItems(d, T, 2); await addItems(d, L1, 1);
    await on(d, ([p]) => jebOpenPanel(p), [L1]); await sleep(400);
    const measure = (sel) => d.page.evaluate((S) => {
      const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
      const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
      const bgOf = (el) => { const layers = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; } } let base = { r: 255, g: 255, b: 255 }; for (let i = layers.length - 1; i >= 0; i--) { const c = layers[i]; base = { r: c.r * c.a + base.r * (1 - c.a), g: c.g * c.a + base.g * (1 - c.a), b: c.b * c.a + base.b * (1 - c.a) }; } return base; };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      let worst = 99, who = '', n = 0;
      document.querySelectorAll(S).forEach((e) => {
        if (![...e.childNodes].some((x) => x.nodeType === 3 && x.textContent.trim())) return;
        const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return;
        const fg = parse(cs.color), bg = bgOf(e);
        const comp = fg.a < 1 ? { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) } : fg;
        n++; const r = ratio(comp, bg); if (r < worst) { worst = r; who = e.className + ':' + (e.textContent || '').trim().slice(0, 14); }
      });
      return { worst: Math.round(worst * 100) / 100, who, n };
    }, sel);
    const panelText = '#jeb-panel .jx-path, #jeb-panel .jx-path button, #jeb-panel .jx-path b, #jeb-panel .jx-kid, #jeb-panel .jx-nm, #jeb-panel .jx-new, #jeb-panel .jx-kid .jeb-ct, #jeb-panel .jeb-pm, #jeb-panel .jx-in';
    const barText = '#jeb-bar .jx-in, #jeb-bar .jeb-chip[data-pid] .jeb-ct, #jeb-bar .jeb-chip[data-pid] .jeb-nm';
    const presets = ['forest', 'ocean', 'amber', 'indigo', 'rose'];
    for (const p of presets) {
      await on(d, (k) => { applyPreset(k); }, p); await sleep(200);
      const m = await measure(panelText), b = await measure(barText);
      check(m.n >= 6 && m.worst >= 4.5, `${t} the path line, the pocket chips and ＋ Pocket (${m.n} pieces) clear 4.5:1 on ${p} (worst ${m.worst}, ${m.who})`, JSON.stringify(m));
      check(b.n >= 6 && b.worst >= 4.5, `${t} the bar chips' ▸ mark, name and number (${b.n} pieces) clear 4.5:1 on ${p} (worst ${b.worst}, ${b.who})`, JSON.stringify(b));
    }
    /* All pockets: sub-group headers; the picker; the deck chips */
    await on(d, () => { applyPreset('forest'); jebClosePanel(); jebOpenPanelSel({ ids: [], all: true }); }); await sleep(400);
    for (const p of presets) {
      await on(d, (k) => { applyPreset(k); }, p); await sleep(200);
      const m = await measure('#jeb-panel .jeb-gh, #jeb-panel .jeb-gh b, #jeb-panel .jeb-gh small, #jeb-panel .jx-fold');
      check(m.n >= 8 && m.worst >= 4.5, `${t} the indented group headers and fold marks (${m.n} pieces) clear 4.5:1 on ${p} (worst ${m.worst}, ${m.who})`, JSON.stringify(m));
    }
    await on(d, () => { applyPreset('forest'); jebClosePanel(); jebOpenDeck({ ids: [], all: true }); }); await sleep(600);
    for (const p of presets) {
      await on(d, (k) => { applyPreset(k); }, p); await sleep(200);
      const m = await measure('#jeb-deck .jx-ins, #jeb-deck .jx-ins button');
      check(m.n >= 2 && m.worst >= 4.5, `${t} the deck's "inside:" chips (${m.n} pieces) clear 4.5:1 on ${p} (worst ${m.worst}, ${m.who})`, JSON.stringify(m));
    }
    await on(d, () => { applyPreset('forest'); jebCloseDeck(); const id = DB.jebPockets.find((x) => x.name === 'L1').id; jebOpenPanel(id); }); await sleep(300);
    await pm(d, vp); await menuRow(d, vp, 'Move into'); await modalOpen(d); await sleep(250);
    for (const p of presets) {
      await on(d, (k) => { applyPreset(k); }, p); await sleep(200);
      const m = await measure('#mb .mt, #mb .jx-mv .jx-mt, #mb .jx-mv small, #mb .jx-mv .jx-box');
      check(m.n >= 8 && m.worst >= 4.5, `${t} the "Move into…" picker, its greyed rows and their reasons (${m.n} pieces) clear 4.5:1 on ${p} (worst ${m.worst}, ${m.who})`, JSON.stringify(m));
    }
  });
} catch (e) {
  console.log(' FAIL  zab-n1 threw: ' + (e && e.stack || e));
  results.push({ ok: false, label: 'threw' });
} finally {
  await browser.close();
  await srv.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
