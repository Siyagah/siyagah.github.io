#!/usr/bin/env node
/* tools/zab-z6b.mjs — v05.11, Z6b: the Tasks pocket (checks 71a–71j).

   Every check runs at 390x844, 820x1180 and 1440x900 (unless it names a size) against a booted app, with real taps
   (touch viewports) or clicks (1440). Nothing touches the network.

   71a  groups: Overdue, Today, Tomorrow, Later, No date, Done (folded, with a count); high priority first inside a group;
        a drag keeps the item in its group and never changes its date; MIDNIGHT: with page.clock an open panel repaints
        and Today's items become Overdue
   71b  the due-date chooser: reached from the real ⋯ menu and from the chip; every choice sets `due` (Pick a date through
        the real date input); No date clears it; a box ticks the current choice; popover inside the window (820/1440),
        bottom sheet (390)
   71c  ⚑ High priority: ⋯ toggles `pri`, the flag shows, the item rises to the top of its group, and goes back
   71d  steps: three added by typing + Enter (focus kept), one ticked, one edited in place, one deleted; the counter is right;
        the item's own tick leaves the steps alone
   71e  quick typing: "Call Ali tomorrow !" -> text, tomorrow, high priority; a non-tasks pocket stays literal; the hint
        shows the first time only
   71f  the rest: → Note (text, due/flag line, steps as a list), Attach, the deck card, the bar badge (count and red),
        "All pockets", Move to a plain pocket and back (fields kept), Trash and restore
   71g  sync: due, pri and steps set on device A arrive on device B (one fake cloud)
   71h  scale: 300 tasks at 390, CPU x4: the panel paints in <= 300 ms (median of 4 openings; all printed)
   71j  layout: due chip / flag / counter follow the PANEL's width (< 560 under the text, >= 560 in the side column), not the window's;
        Attach and → Note stay on one line and no row overflows (390, 820, 1440, and 1440 + /?jeb=1)
   71i  contrast of the new text on the five presets (headers, chips, Overdue red, flag, counter, badge, chooser, deck)

   `--only=71a,71c` runs just those. Each printed ok/FAIL line becomes one app-check check (block 71). */
import { playwright, serve, seedDB, touchDrag, hostLimit } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, quiet, check, results } from './s1-fake.mjs';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);
/* --fails: print only the failing lines (the passing ones and their detail line are dropped) - for iterating */
if (argv.includes('--fails')) { const o = console.log; let skip = false; console.log = (...x) => { const t = x.join(' '); if (/^\s+ok\s/.test(t)) { skip = true; return; } if (skip && /^\s{6,}\S/.test(t)) { skip = false; return; } skip = false; o(...x); }; }

const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];
const T0 = '2026-10-01T00:00:00.000Z';
const pw = await playwright();
const srv = await serve();
const browser = await pw.chromium.launch();

const ymdOf = (dt) => dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
const day = (n, from = new Date()) => { const t = new Date(from.getFullYear(), from.getMonth(), from.getDate() + n); return ymdOf(t); };
const mk = (id, text, order, extra = {}) => ({ id, pocketId: 'jp-task', text, done: false, folderIds: [], tags: [], kind: null, journal: false, order, createdAt: T0, updatedAt: T0, ...extra });
/* t1 overdue · t2 today · t3 today + high · t4 tomorrow · t5 later · t6 no date · t7 done · t9 no date (after t6) · i1 an Ideas item */
const taskItems = (from) => [
  mk('t1', 'Pay rent', 0, { due: day(-1, from) }),
  mk('t2', 'Call bank', 1, { due: day(0, from) }),
  mk('t3', 'Email Ann', 2, { due: day(0, from), pri: 1 }),
  mk('t4', 'Buy milk', 3, { due: day(1, from) }),
  mk('t5', 'Plan trip', 4, { due: day(8, from) }),
  mk('t6', 'Read book', 5),
  mk('t7', 'Old thing', 6, { done: true, due: day(0, from) }),
  mk('t9', 'Water plants', 7),
  { id: 'i1', pocketId: 'jp-idea', text: 'An idea', done: false, folderIds: [], tags: [], kind: null, journal: false, order: 0, createdAt: T0, updatedAt: T0 },
];
const seed = (extra, from) => { const db = seedDB(T0); db.jeb = taskItems(from); if (extra) extra(db); db.theme = Object.assign({}, db.theme, { zabPhoneLayout: 'bar' }); return db; };   /* v05.18: a phone's Zab is a corner button now; this check is about the bar (block 77 covers the button) */
const dev = (cloud, name, vp, db, opts = {}) => addDevice(browser, srv.base, cloud, name, { width: vp.w, height: vp.h }, vp.touch, db || seed(), opts);
const act = (d, vp, sel) => (vp.touch ? d.page.locator(sel).first().tap() : d.page.locator(sel).first().click());
const until = async (fn, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await sleep(150); } return false; };
const rect = (d, sel) => d.page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; }, sel);
const item = (d, id) => on(d, (i) => JSON.parse(JSON.stringify(DB.jeb.find((x) => x.id === i) || null)), id);
const openPanel = async (d, vp, pid = 'jp-task') => { await act(d, vp, `#jeb-bar .jeb-chip[data-pid="${pid}"] .jeb-main`); await d.page.waitForSelector('#jeb-panel.on', { timeout: 3000 }); await sleep(400); };
const closePanel = async (d, vp) => { await act(d, vp, '#jeb-panel .jeb-x'); await sleep(300); };
/* the panel as the owner reads it: "Overdue 1:t1 | Today 2:t3+t2 | ..." */
const groups = (d) => on(d, () => [...document.querySelectorAll('#jeb-panel .jt-gh')].map((h) => {
  const list = h.nextElementSibling && h.nextElementSibling.classList.contains('jt-list') ? h.nextElementSibling : null;
  return h.querySelector('b').textContent.replace(/[▸▾]\s*/, '').trim() + ' ' + h.querySelector('small').textContent + ':' + (list ? [...list.querySelectorAll('.jeb-it')].map((e) => e.dataset.iid).join('+') : '');
}).join(' | '));
const menuItem = async (d, vp, iid, label) => { await act(d, vp, `#jeb-panel .jeb-it[data-iid="${iid}"] .jeb-more`); await d.page.waitForSelector('#jeb-menu'); await act(d, vp, `#jeb-menu .jm:has-text("${label}")`); await sleep(250); };
const noErr = (d, tag) => check(d.errors.length === 0, `${tag} no page errors`, d.errors.slice(0, 2).join(' · '));
const each = async (fn, vps = VPS, opts, db) => { for (const vp of vps) { const d = await dev(makeCloud(), 'D' + vp.name, vp, db ? db() : null, opts); try { await fn(d, vp); } finally { await d.ctx.close(); } } };
const today = () => day(0);

try {
  /* ══ 71a — groups, order, drag, midnight ══ */
  if (want('71a')) {
    await each(async (d, vp) => {
      const t = `71a@${vp.name}`;
      await openPanel(d, vp);
      const g = await groups(d);
      check(g === 'Overdue 1:t1 | Today 2:t3+t2 | Tomorrow 1:t4 | Later 1:t5 | No date 2:t6+t9 | Done 1:', `${t} the groups in order, high priority first inside Today (t3 before t2), Done folded with its count: ${g}`, g);
      const rows = await on(d, () => document.querySelectorAll('#jeb-panel .jeb-it').length);
      check(rows === 7, `${t} the folded Done group draws no rows (7 of 8 tasks)`, String(rows));
      const lab = await on(d, () => [...document.querySelectorAll('#jeb-panel .jt-due')].map((e) => e.closest('.jeb-it').dataset.iid + '=' + e.textContent));
      const lm = Object.fromEntries(lab.map((x) => x.split('=')));
      check(lm.t1 === 'Overdue · 1 d' && lm.t2 === 'Today' && lm.t4 === 'Tomorrow' && /^[A-Z][a-z]{2}\b/.test(lm.t5 || '') && lm.t6 === undefined, `${t} due chips read "Overdue · 1 d", "Today", "Tomorrow", a short date for later, nothing without a date`, JSON.stringify(lm));
      const red = await on(d, () => { const e = document.querySelector('#jeb-panel .jt-g-over b'); return getComputedStyle(e).color; });
      check(red === 'rgb(180, 35, 24)', `${t} the Overdue header is red`, red);
      await act(d, vp, '#jeb-panel .jt-gdone'); await sleep(300);
      const g2 = await groups(d);
      check(/Done 1:t7$/.test(g2), `${t} tapping Done unfolds it: ${g2}`);
      await act(d, vp, '#jeb-panel .jt-gdone'); await sleep(200);
      /* layout of one row */
      const geo = await on(d, () => { const r = (s) => { const e = document.querySelector(s); return e && e.getBoundingClientRect(); }; return { tx: r('#jeb-panel .jeb-it[data-iid="t3"] .jeb-tx'), due: r('#jeb-panel .jeb-it[data-iid="t3"] .jt-due'), flag: r('#jeb-panel .jeb-it[data-iid="t3"] .jt-flag'), body: r('#jeb-panel .jeb-it[data-iid="t3"] .jeb-body'), more: r('#jeb-panel .jeb-it[data-iid="t3"] .jeb-more') }; });
      /* review fix (v05.11): the side column follows the PANEL's width (>= 560, Zab mode, see 71j); this panel is 380px at every window size */
      check(geo.due.top >= geo.tx.bottom - 1 && geo.flag.top >= geo.tx.bottom - 1 && geo.due.right <= vp.w, `${t} ${vp.w >= 640 ? 'tablet/laptop (380px panel)' : 'phone'}: the due chip and flag sit under the text`, JSON.stringify(geo));
      /* a drag keeps the group and never changes a date */
      const before = { t6: await item(d, 't6'), t9: await item(d, 't9') };
      await on(d, () => { document.querySelector('#jeb-panel .jeb-it[data-iid="t9"]').scrollIntoView({ block: 'center' }); }); await sleep(250);
      const gr = await d.page.locator('#jeb-panel .jeb-it[data-iid="t9"] .jeb-grip').boundingBox();
      const tg = await d.page.locator('#jeb-panel .jeb-it[data-iid="t6"]').boundingBox();
      const from = { x: gr.x + gr.width / 2, y: gr.y + gr.height / 2 }, to = { x: from.x, y: tg.y + 4 };
      if (vp.touch) { const pts = Array.from({ length: 14 }, (_, i) => ({ x: from.x + (to.x - from.x) * ((i + 1) / 14), y: from.y + (to.y - from.y) * ((i + 1) / 14) })); await touchDrag(d.page, [from, ...pts]); }
      else { await d.page.mouse.move(from.x, from.y); await d.page.mouse.down(); for (let i = 1; i <= 14; i++) await d.page.mouse.move(from.x + (to.x - from.x) * (i / 14), from.y + (to.y - from.y) * (i / 14)); await d.page.mouse.up(); }
      await sleep(500);
      const g3 = await groups(d); const a9 = await item(d, 't9'), a6 = await item(d, 't6');
      check(/No date 2:t9\+t6/.test(g3) && !('due' in a9) && !('due' in a6), `${t} dragging ⠿ reorders inside its group (${vp.touch ? 'touch' : 'mouse'}) and sets no date: ${g3}`, JSON.stringify({ a9, a6, before }));
      noErr(d, t);
    });
    /* midnight: the clock moves, the open panel repaints */
    await each(async (d, vp) => {
      const t = `71a-midnight@${vp.name}`;
      await openPanel(d, vp);
      const g0 = await groups(d);
      const b0 = await on(d, () => { const c = document.querySelector('#jeb-bar .jeb-chip[data-pid="jp-task"]'); return { n: c.querySelector('.jeb-ct').textContent, red: c.querySelector('.jeb-ct').classList.contains('jt-red') }; });
      check(/^Overdue 1:t1 \| Today 2:t3\+t2 \| Tomorrow 1:t4 \|/.test(g0) && b0.n === '3' && b0.red, `${t} before midnight (14 Oct 23:59:30): ${g0}; badge ${b0.n}${b0.red ? ' red' : ''}`, g0);
      await d.page.clock.fastForward(60000); await sleep(600);
      const g1 = await groups(d);
      const b1 = await on(d, () => { const c = document.querySelector('#jeb-bar .jeb-chip[data-pid="jp-task"]'); return { n: c.querySelector('.jeb-ct').textContent, red: c.querySelector('.jeb-ct').classList.contains('jt-red'), today: _jebToday() }; });
      check(b1.today === '2026-10-15' && /^Overdue 3:t3\+t1\+t2 \| Today 1:t4 \| Later 1:t5 \|/.test(g1), `${t} one minute later (15 Oct) the open panel repaints on its own: Today's items are Overdue, Tomorrow's is Today: ${g1}`, JSON.stringify({ g1, b1 }));
      check(b1.n === '4' && b1.red, `${t} ...and the bar badge follows (${b1.n}, ${b1.red ? 'red' : 'not red'})`);
      noErr(d, t);
    }, VPS, { clock: new Date(2026, 9, 14, 23, 59, 30) }, () => seed(null, new Date(2026, 9, 14)));
  }

  /* ══ 71b — the chooser ══ */
  if (want('71b')) await each(async (d, vp) => {
    const t = `71b@${vp.name}`;
    await openPanel(d, vp);
    await menuItem(d, vp, 't6', 'Due');
    await d.page.waitForSelector('#jeb-due'); await sleep(200);
    const labels = await on(d, () => [...document.querySelectorAll('#jeb-due .jdu-r')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
    check(labels.length === 6 && /Today/.test(labels[0]) && /Tomorrow/.test(labels[1]) && /Next week \(Mon\)/.test(labels[2]) && /Pick a date/.test(labels[3]) && /No date/.test(labels[4]) && /High priority/.test(labels[5]), `${t} reached from the real ⋯ → "📅 Due…": Today · Tomorrow · Next week (Mon) · Pick a date · No date (+ ⚑ High priority)`, labels.join(' / '));
    const boxes = await on(d, () => [...document.querySelectorAll('#jeb-due .jdu-r')].map((e) => e.querySelector('.jdu-bx').textContent + (e.getAttribute('aria-checked') === 'true' ? '*' : '')));
    check(boxes.join('') === '☐☐☐☐☑*☐', `${t} every choice has a box, and only "No date" is ticked for an item with no date`, boxes.join(' '));
    const q = await rect(d, '#jeb-due');
    if (vp.w < 640) check(Math.abs(q.l) < 1 && Math.abs(q.r - vp.w) < 1 && Math.abs(q.b - vp.h) < 2 && q.t > 100, `${t} phone: a bottom sheet (full width, on the bottom edge)`, JSON.stringify(q));
    else check(q.l >= 0 && q.t >= 0 && q.r <= vp.w && q.b <= vp.h && q.w <= 320, `${t} a popover inside the window (${Math.round(q.w)}x${Math.round(q.h)} at ${Math.round(q.l)},${Math.round(q.t)})`, JSON.stringify(q));
    await act(d, vp, '#jeb-due .jdu-r[data-v]:has-text("Today")'); await sleep(300);
    check((await item(d, 't6')).due === today() && !(await on(d, () => !!document.getElementById('jeb-due'))), `${t} Today sets due and closes the chooser`, JSON.stringify(await item(d, 't6')));
    check(/^Today 3:/.test((await groups(d)).split(' | ')[1] || ''), `${t} the item moved into Today`, await groups(d));
    /* from the chip */
    await act(d, vp, '#jeb-panel .jeb-it[data-iid="t6"] .jt-due'); await d.page.waitForSelector('#jeb-due'); await sleep(200);
    const ticked = await on(d, () => [...document.querySelectorAll('#jeb-due .jdu-r[aria-checked="true"]')].map((e) => e.children[1].textContent.trim()));
    check(ticked.join() === 'Today', `${t} the chip opens the same chooser, with Today ticked`, ticked.join());
    const cq = await rect(d, '#jeb-due'), ch = await rect(d, '#jeb-panel .jeb-it[data-iid="t6"] .jt-due');
    if (vp.w >= 640) check(cq.l >= 0 && cq.r <= vp.w && cq.t >= 0 && cq.b <= vp.h && (cq.t >= ch.b - 1 || cq.b <= ch.t + 1), `${t} opened from the chip the popover is clamped inside the window and does not cover the chip`, JSON.stringify({ cq, ch }));
    else check(Math.abs(cq.b - vp.h) < 2, `${t} opened from the chip it is the same bottom sheet`, JSON.stringify(cq));
    await act(d, vp, '#jeb-due .jdu-r[data-v]:has-text("Tomorrow")'); await sleep(300);
    check((await item(d, 't6')).due === day(1), `${t} Tomorrow`, JSON.stringify(await item(d, 't6')));
    await act(d, vp, '#jeb-panel .jeb-it[data-iid="t6"] .jt-due'); await d.page.waitForSelector('#jeb-due');
    await act(d, vp, '#jeb-due .jdu-r[data-v]:has-text("Next week")'); await sleep(300);
    const nm = (await item(d, 't6')).due, dow = new Date(nm + 'T00:00:00').getDay();
    check(dow === 1 && nm > today() && nm <= day(7), `${t} Next week (Mon) is the coming Monday (${nm})`, nm);
    await act(d, vp, '#jeb-panel .jeb-it[data-iid="t6"] .jt-due'); await d.page.waitForSelector('#jeb-due');
    await d.page.locator('#jeb-due .jdu-date').fill('2026-12-25'); await sleep(400);
    check((await item(d, 't6')).due === '2026-12-25' && !(await on(d, () => !!document.getElementById('jeb-due'))), `${t} Pick a date: the real date input sets 2026-12-25`, JSON.stringify(await item(d, 't6')));
    await act(d, vp, '#jeb-panel .jeb-it[data-iid="t6"] .jt-due'); await d.page.waitForSelector('#jeb-due');
    const pk = await on(d, () => [...document.querySelectorAll('#jeb-due .jdu-r[aria-checked="true"]')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()).join('|'));
    check(/^☑\s*Pick a date/.test(pk), `${t} a date that is none of the shortcuts ticks "Pick a date"`, pk);
    await act(d, vp, '#jeb-due .jdu-r[data-v=""]'); await sleep(300);
    const nd = await item(d, 't6');
    check(!('due' in nd) && !(await on(d, () => document.querySelector('#jeb-panel .jeb-it[data-iid="t6"] .jt-due'))), `${t} No date clears it (the key is gone, the chip is gone)`, JSON.stringify(nd));
    /* flag inside the chooser, and Escape / outside close it */
    await menuItem(d, vp, 't6', 'Due');
    await act(d, vp, '#jeb-due .jdu-pri'); await sleep(300);
    check((await item(d, 't6')).pri === 1 && (await on(d, () => !!document.getElementById('jeb-due'))), `${t} the chooser's ⚑ row sets high priority and stays open`);
    await d.page.keyboard.press('Escape'); await sleep(200);
    check(!(await on(d, () => !!document.getElementById('jeb-due'))), `${t} Escape closes the chooser`);
    noErr(d, t);
  });

  /* ══ 71c — the flag ══ */
  if (want('71c')) await each(async (d, vp) => {
    const t = `71c@${vp.name}`;
    await openPanel(d, vp);
    await act(d, vp, '#jeb-panel .jeb-it[data-iid="t9"] .jeb-more'); await d.page.waitForSelector('#jeb-menu');
    const rowsM = await on(d, () => [...document.querySelectorAll('#jeb-menu .jm')].map((e) => e.textContent));
    check(rowsM.some((r) => r === '📅 Due…') && rowsM.some((r) => r === '☐ ⚑ High priority') && rowsM.some((r) => r === '☑ Steps…'), `${t} the ⋯ menu carries "📅 Due…", "☐ ⚑ High priority" and "☑ Steps…" with their words`, rowsM.join(' / '));
    await act(d, vp, '#jeb-menu .jm:has-text("High priority")'); await sleep(350);
    check((await item(d, 't9')).pri === 1, `${t} ⋯ → ⚑ sets pri to the number 1`, JSON.stringify(await item(d, 't9')));
    const g = await groups(d);
    check(/No date 2:t9\+t6/.test(g), `${t} the flagged item rose to the top of its group: ${g}`);
    const fl = await on(d, () => { const f = document.querySelector('#jeb-panel .jeb-it[data-iid="t9"] .jt-flag'); return f && f.textContent; });
    check(/⚑/.test(fl || ''), `${t} the flag shows on the row`, String(fl));
    await act(d, vp, '#jeb-panel .jeb-it[data-iid="t9"] .jeb-more'); await d.page.waitForSelector('#jeb-menu');
    check((await on(d, () => [...document.querySelectorAll('#jeb-menu .jm')].map((e) => e.textContent))).includes('☑ ⚑ High priority'), `${t} the menu box is ticked while it is on`);
    await act(d, vp, '#jeb-menu .jm:has-text("High priority")'); await sleep(350);
    const un = await item(d, 't9');
    check(!('pri' in un) && /No date 2:t6\+t9/.test(await groups(d)), `${t} unticking removes it and the item goes back to its place`, JSON.stringify(un));
    await act(d, vp, '#jeb-panel .jeb-it[data-iid="t3"] .jt-flag'); await d.page.waitForSelector('#jeb-due');
    check(true, `${t} the flag on a row opens the chooser too`);
    noErr(d, t);
  });

  /* ══ 71d — steps ══ */
  if (want('71d')) await each(async (d, vp) => {
    const t = `71d@${vp.name}`;
    await openPanel(d, vp);
    await menuItem(d, vp, 't6', 'Steps');
    const focused = await on(d, () => document.activeElement && document.activeElement.className);
    check(focused === 'jt-addin', `${t} "☑ Steps…" opens the steps in the row with the "＋ Step" box focused`, focused);
    for (const s of ['one', 'two', 'three']) { await d.page.keyboard.type(s); await d.page.keyboard.press('Enter'); await sleep(250); }
    let it = await item(d, 't6');
    check((it.steps || []).map((x) => x.t).join() === 'one,two,three' && it.steps.every((x) => x.id && !x.d), `${t} three steps added by typing and Enter, focus kept (no tap between them)`, JSON.stringify(it.steps));
    check(new Set(it.steps.map((x) => x.id)).size === 3, `${t} each step has its own id`);
    const cnt = () => on(d, () => { const c = document.querySelector('#jeb-panel .jeb-it[data-iid="t6"] .jt-cnt'); return c && c.textContent; });
    check((await cnt()) === '0/3', `${t} the counter reads 0/3`, String(await cnt()));
    await act(d, vp, '#jeb-panel .jeb-it[data-iid="t6"] .jt-st:nth-child(2) .jt-stk'); await sleep(300);
    it = await item(d, 't6');
    check(it.steps[1].d === 1 && !it.steps[0].d && (await cnt()) === '1/3', `${t} ticking step two: its d is 1 and the counter reads 1/3`, JSON.stringify(it.steps));
    await d.page.locator('#jeb-panel .jeb-it[data-iid="t6"] .jt-st:nth-child(1) .jt-sti').click();
    await d.page.keyboard.press('Control+A'); await d.page.keyboard.type('uno'); await d.page.keyboard.press('Enter'); await sleep(400);
    it = await item(d, 't6');
    check(it.steps[0].t === 'uno' && it.steps.length === 3, `${t} a step's text is edited in place`, JSON.stringify(it.steps));
    await act(d, vp, '#jeb-panel .jeb-it[data-iid="t6"] .jt-st:nth-child(3) .jt-stx'); await sleep(300);
    it = await item(d, 't6');
    check(it.steps.map((x) => x.t).join() === 'uno,two' && (await cnt()) === '1/2', `${t} ✕ deletes the third step; the counter reads 1/2`, JSON.stringify(it.steps));
    /* the item's own tick leaves the steps alone */
    const stepsBefore = JSON.stringify(it.steps);
    await act(d, vp, '#jeb-panel .jeb-it[data-iid="t6"] .jeb-tick'); await sleep(400);
    check((await item(d, 't6')).done === true && JSON.stringify((await item(d, 't6')).steps) === stepsBefore, `${t} ticking the item itself marks it done and leaves its steps exactly as they were`, JSON.stringify(await item(d, 't6')));
    await on(d, () => { jebToggleDone('t6'); jebRefresh(); }); await sleep(400);
    /* the counter folds and opens the steps */
    const open1 = await on(d, () => !!document.querySelector('#jeb-panel .jeb-it[data-iid="t6"] .jt-steps'));
    await act(d, vp, '#jeb-panel .jeb-it[data-iid="t6"] .jt-cnt'); await sleep(300);
    const open2 = await on(d, () => !!document.querySelector('#jeb-panel .jeb-it[data-iid="t6"] .jt-steps'));
    await act(d, vp, '#jeb-panel .jeb-it[data-iid="t6"] .jt-cnt'); await sleep(300);
    const open3 = await on(d, () => !!document.querySelector('#jeb-panel .jeb-it[data-iid="t6"] .jt-steps'));
    check(open1 && !open2 && open3, `${t} tapping the counter folds the steps away and opens them again`, [open1, open2, open3].join());
    const geo = await on(d, () => { const r = document.querySelector('#jeb-panel .jeb-it[data-iid="t6"] .jt-steps').getBoundingClientRect(); const x = document.querySelector('#jeb-panel .jeb-it[data-iid="t6"] .jt-stx').getBoundingClientRect(); const p = document.getElementById('jeb-panel').getBoundingClientRect(); return { inRow: r.left >= p.left && r.right <= p.right + 1, x: [Math.round(x.width), Math.round(x.height)] }; });
    check(geo.inRow && geo.x[0] >= 40 && geo.x[1] >= 40, `${t} the steps sit inside the panel and ✕ is a 40 px target`, JSON.stringify(geo));
    noErr(d, t);
  });

  /* ══ 71e — quick typing and the hint ══ */
  if (want('71e')) await each(async (d, vp) => {
    const t = `71e@${vp.name}`;
    await openPanel(d, vp);
    const hint = await on(d, () => { const h = document.querySelector('#jeb-panel .jt-hint'); return { shown: !h.hidden, text: h.textContent, flag: DB.theme.zabTaskHint }; });
    check(hint.shown && /!/.test(hint.text) && /tomorrow/.test(hint.text), `${t} the first time, a one-line hint under the add box`, JSON.stringify(hint));
    await sleep(300);
    check((await on(d, () => DB.theme.zabTaskHint)) === 1, `${t} ...and DB.theme remembers it was shown`);
    const type = async (s) => { await act(d, vp, '#jeb-add-in'); await d.page.keyboard.type(s); await d.page.keyboard.press('Enter'); await sleep(350); };
    await type('Call Ali tomorrow !');
    const a = await on(d, () => DB.jeb.find((x) => /^Call Ali/.test(x.text)));
    check(a && a.text === 'Call Ali' && a.due === day(1) && a.pri === 1, `${t} "Call Ali tomorrow !" → text "Call Ali", tomorrow, high priority`, JSON.stringify(a));
    await type('Buy bread today');
    const b = await on(d, () => DB.jeb.find((x) => /^Buy bread/.test(x.text)));
    check(b && b.text === 'Buy bread' && b.due === today() && !('pri' in b), `${t} "Buy bread today" → today only`, JSON.stringify(b));
    await type('Hurry !');
    const c = await on(d, () => DB.jeb.find((x) => /^Hurry/.test(x.text)));
    check(c && c.text === 'Hurry' && c.pri === 1 && !('due' in c), `${t} a trailing " !" alone → high priority`, JSON.stringify(c));
    await type('Wow!');
    await type('tomorrow');
    await type('Plan for tomorrow morning');
    const lit = await on(d, () => ['Wow!', 'tomorrow', 'Plan for tomorrow morning'].map((s) => DB.jeb.find((x) => x.text === s && !x.due && !x.pri) ? 1 : 0).join(''));
    check(lit === '111', `${t} a marker needs a space before it and text left over: "Wow!", "tomorrow" and "…tomorrow morning" stay literal`, lit);
    const first = await groups(d);
    check(/^Overdue 1:t1 \| Today \d+:[^|]*\| Tomorrow 2:/.test(first), `${t} the new tasks sit in their groups at once: ${first}`);
    await closePanel(d, vp); await openPanel(d, vp);
    check(await on(d, () => document.querySelector('#jeb-panel .jt-hint').hidden), `${t} closing and reopening: the hint does not come back`);
    /* a non-tasks pocket takes it literally */
    await closePanel(d, vp); await openPanel(d, vp, 'jp-idea');
    await act(d, vp, '#jeb-add-in'); await d.page.keyboard.type('Call Ali tomorrow !'); await d.page.keyboard.press('Enter'); await sleep(350);
    const lit2 = await on(d, () => DB.jeb.find((x) => x.pocketId === 'jp-idea' && /^Call Ali/.test(x.text)));
    check(lit2 && lit2.text === 'Call Ali tomorrow !' && !('due' in lit2) && !('pri' in lit2), `${t} in Ideas (not a tasks pocket) the same words stay literal`, JSON.stringify(lit2));
    check(await on(d, () => document.querySelector('#jeb-panel .jt-hint').hidden), `${t} no hint in another pocket`);
    noErr(d, t);
  });

  /* ══ 71f — the rest ══ */
  if (want('71f')) {
    await each(async (d, vp) => {
      const t = `71f@${vp.name}`;
      await on(d, () => { jebEditItem('t3', { steps: [{ id: 's1', t: 'Find address', d: 1 }, { id: 's2', t: 'Write <b>mail</b>' }] }); });
      await openPanel(d, vp);
      /* → Note */
      await act(d, vp, '#jeb-panel .jeb-it[data-iid="t3"] .jeb-note-b'); await sleep(700);
      const note = await on(d, () => { const n = DB.articles.find((a) => a.fromJeb); return n && { title: n.title, c: n.content, gone: !DB.jeb.some((x) => x.id === 't3') }; });
      check(note && note.gone && note.title === 'Email Ann', `${t} → Note: the title is the text and the item is gone`, JSON.stringify(note));
      check(note && note.c.includes('<p>📅 due ') && note.c.includes(' · ⚑ high</p>') && note.c.includes('<ul><li>☑ Find address</li><li>☐ Write &lt;b&gt;mail&lt;/b&gt;</li></ul>') && note.c.indexOf('📅') < note.c.indexOf('<ul>'), `${t} → Note: "📅 due …  · ⚑ high", then the steps as a list with the done one ticked`, note && note.c);
      await d.page.evaluate(() => { document.querySelectorAll('.toast-act').forEach((x) => x.remove()); });
      if (!(await on(d, () => document.getElementById('jeb-panel').classList.contains('on')))) await openPanel(d, vp);
      /* Attach */
      await act(d, vp, '#jeb-panel .jeb-it[data-iid="t2"] .jeb-att-b'); await d.page.waitForSelector('#jeb-att'); await sleep(200);
      await act(d, vp, '#jeb-att [data-tab="journal"]'); await act(d, vp, '#jeb-att .ja-row[data-journal]'); await sleep(300);
      const t2 = await item(d, 't2');
      check(t2.journal === true && t2.due === today(), `${t} 📎 Attach (Journal) works on a task and its date stays`, JSON.stringify(t2));
      await act(d, vp, '#jeb-att .ja-x'); await sleep(200);
      /* Move to a plain pocket and back */
      await on(d, () => { jebEditItem('t4', { pri: 1, steps: [{ id: 'q1', t: 'step q', d: 1 }] }); jebRefresh(); }); await sleep(300);
      await menuItem(d, vp, 't4', 'Move to pocket'); await act(d, vp, '#jeb-menu .jm:has-text("Ideas")'); await sleep(400);
      const mv = await item(d, 't4');
      check(mv.pocketId === 'jp-idea' && mv.due === day(1) && mv.pri === 1 && mv.steps.length === 1, `${t} Move to pocket: nothing is stripped from the item (I1)`, JSON.stringify(mv));
      await closePanel(d, vp); await openPanel(d, vp, 'jp-idea');
      const plain = await on(d, () => ({ row: !!document.querySelector('#jeb-panel .jeb-it[data-iid="t4"]'), chips: document.querySelectorAll('#jeb-panel .jt-due,#jeb-panel .jt-flag,#jeb-panel .jt-cnt,#jeb-panel .jt-gh').length }));
      check(plain.row && plain.chips === 0, `${t} in a non-tasks pocket the fields are kept but not shown`, JSON.stringify(plain));
      await on(d, () => { jebMoveItem('t4', 'jp-task', 0); }); await sleep(300);
      await closePanel(d, vp); await openPanel(d, vp);
      const back = await on(d, () => { const r = document.querySelector('#jeb-panel .jeb-it[data-iid="t4"]'); return r && [!!r.querySelector('.jt-due'), !!r.querySelector('.jt-flag'), r.querySelector('.jt-cnt').textContent].join(); });
      check(back === 'true,true,1/1', `${t} moved back, the chip, flag and counter show again`, String(back));
      /* Trash and restore */
      await menuItem(d, vp, 't4', 'Delete'); await sleep(400);
      const tr = await on(d, () => { const e = DB.trash.find((x) => x.type === 'jebItem' && x.item.id === 't4'); return e && { id: e.id, due: e.item.due, pri: e.item.pri, st: e.item.steps }; });
      check(tr && tr.due === day(1) && tr.pri === 1 && tr.st.length === 1 && !(await item(d, 't4')), `${t} Delete sends a task to Trash with its date, flag and steps`, JSON.stringify(tr));
      await on(d, (id) => { restoreItem(id); }, tr.id); await sleep(400);
      const rs = await item(d, 't4');
      check(rs && rs.due === day(1) && rs.pri === 1 && rs.steps[0].t === 'step q' && rs.steps[0].d === 1, `${t} restoring brings every task field back`, JSON.stringify(rs));
      noErr(d, t);
    });
    await each(async (d, vp) => {
      const t = `71f-deck@${vp.name}`;
      await on(d, () => { jebEditItem('t3', { steps: [{ id: 's1', t: 'a', d: 1 }, { id: 's2', t: 'b' }, { id: 's3', t: 'c' }] }); });
      await openPanel(d, vp);
      await act(d, vp, '#jeb-panel .jeb-px'); await d.page.waitForSelector('#jeb-deck.on .jeb-card'); await sleep(700);
      const dk = await on(d, () => { const c = document.querySelector('#jeb-deck .jeb-card[data-iid="t3"]'); const m = c.querySelector('.jt-meta'); return { kids: [...c.children].map((e) => e.className.split(' ')[0]), chip: m.querySelector('.jt-due').textContent, flag: !!m.querySelector('.jt-flag'), cnt: m.querySelector('.jt-cnt').textContent, under: m.offsetTop >= c.querySelector('.jeb-tx').offsetTop + c.querySelector('.jeb-tx').offsetHeight - 1 /* layout, not the rotated bounding box */, red: (() => { const o = document.querySelector('#jeb-deck .jeb-card[data-iid="t1"] .jt-due'); return o && o.textContent; })() }; });
      check(dk.chip === 'Today' && dk.flag && dk.cnt === '1/3' && dk.under && dk.red === 'Overdue · 1 d', `${t} the deck card shows the due chip, the flag and the step counter under the text`, JSON.stringify(dk));
      await act(d, vp, '#jeb-deck .jeb-card[data-iid="t2"] .jt-due'); await d.page.waitForSelector('#jeb-due'); await sleep(250);
      const q = await rect(d, '#jeb-due');
      check(q.l >= 0 && q.r <= vp.w + 1 && q.b <= vp.h + 1 && q.t >= 0, `${t} a chip on a card opens the chooser, over the deck and inside the window`, JSON.stringify(q));
      await act(d, vp, '#jeb-due .jdu-r[data-v]:has-text("Tomorrow")'); await sleep(300);
      check((await item(d, 't2')).due === day(1), `${t} ...and it sets the date from the deck`);
      await act(d, vp, '#jeb-deck .jeb-card[data-iid="t3"] .jt-cnt'); await d.page.waitForSelector('#ov.on .jt-steps'); await sleep(200);
      await act(d, vp, '#ov .jt-st:nth-child(2) .jt-stk'); await sleep(300);
      check((await item(d, 't3')).steps[1].d === 1 && (await on(d, () => document.querySelector('#ov .jt-st:nth-child(2) .jt-stk').checked)), `${t} the counter on a card opens its steps in the app's own dialog, and a tick lands`, JSON.stringify((await item(d, 't3')).steps));
      await act(d, vp, '#jt-md-done'); await sleep(300);
      await act(d, vp, '#jeb-deck .jeb-card[data-iid="t1"] .jeb-more'); await d.page.waitForSelector('#jeb-menu');
      check((await on(d, () => [...document.querySelectorAll('#jeb-menu .jm')].map((e) => e.textContent))).includes('📅 Due…'), `${t} the card's ⋯ menu has 📅 Due… too`);
      noErr(d, t);
    });
    /* the bar badge, and All pockets */
    await each(async (d, vp) => {
      const t = `71f-badge@${vp.name}`;
      const badge = () => on(d, () => { const c = document.querySelector('#jeb-bar .jeb-chip[data-pid="jp-task"]'); const ct = c.querySelector('.jeb-ct'); return { n: ct.textContent, red: ct.classList.contains('jt-red'), bg: getComputedStyle(ct).backgroundColor, title: c.title }; });
      let b = await badge();
      check(b.n === '3' && b.red && b.bg === 'rgb(180, 35, 24)' && /due today and overdue/.test(b.title) && /red/.test(b.title), `${t} overdue + due today = 3, shown red, and the chip's title says the rule`, JSON.stringify(b));
      await on(d, () => { jebEditItem('t1', { due: _jebDay(_jebToday(), 3) }); jebRefresh(); }); await sleep(300);
      b = await badge();
      check(b.n === '2' && !b.red, `${t} nothing overdue: 2 due today, not red`, JSON.stringify(b));
      await on(d, () => { jebEditItem('t2', { due: _jebDay(_jebToday(), 3) }); jebEditItem('t3', { due: _jebDay(_jebToday(), 3) }); jebRefresh(); }); await sleep(300);
      b = await badge();
      check(b.n === '7' && !b.red && b.title === 'Quick tasks', `${t} nothing due: it keeps today's count of open tasks (7) and a plain title`, JSON.stringify(b));
      const other = await on(d, () => { const c = document.querySelector('#jeb-bar .jeb-chip[data-pid="jp-idea"] .jeb-ct'); return c.textContent + (c.classList.contains('jt-red') ? 'red' : ''); });
      check(other === '1', `${t} another pocket's badge is unchanged`, other);
      /* All pockets */
      await act(d, vp, '#jeb-bar .jeb-chip.jeb-all .jeb-main'); await d.page.waitForSelector('#jeb-panel.on'); await sleep(500);
      await on(d, () => { jebEditItem('t1', { due: _jebDay(_jebToday(), -2) }); jebRefresh(); }); await sleep(300);
      const all = await on(d, () => { const g = document.querySelector('#jeb-panel .jeb-gh[data-pid="jp-task"]'); const heads = []; let e = g.nextElementSibling; while (e && !e.classList.contains('jeb-gh')) { if (e.classList.contains('jt-gh')) heads.push(e.querySelector('b').textContent); e = e.nextElementSibling; } return { heads, due: document.querySelectorAll('#jeb-panel .jeb-gl[data-pid="jp-task"] .jt-due').length, done: document.querySelectorAll('#jeb-panel .jeb-gl[data-pid="jp-task"] .jeb-it.done').length, flag: document.querySelectorAll('#jeb-panel .jeb-gl[data-pid="jp-task"] .jt-flag').length }; });
      check(all.heads.join() === 'Overdue,Tomorrow,Later,No date' && all.due >= 3 && all.done === 0 && all.flag === 1, `${t} "All pockets": the tasks group shows Overdue / Tomorrow / Later / No date as small headers with chips and flags, and no Done group`, JSON.stringify(all));
      noErr(d, t);
    });
  }

  /* ══ 71g — sync ══ */
  if (want('71g')) {
    const cloud = makeCloud();
    const A = await dev(cloud, 'A', VPS[2]), B = await dev(cloud, 'B', VPS[2]);
    try {
      await sleep(1500);
      await on(A, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.content += '<p>x</p>'; a.updatedAt = new Date().toISOString(); persist(); flushPendingPush(); });
      await sleep(800); await quiet(cloud, A); await quiet(cloud, B);
      await openPanel(A, VPS[2]); await openPanel(B, VPS[2]);
      await menuItem(A, VPS[2], 't6', 'Due'); await act(A, VPS[2], '#jeb-due .jdu-r[data-v]:has-text("Tomorrow")'); await sleep(300);
      await menuItem(A, VPS[2], 't6', 'High priority'); await sleep(300);
      await menuItem(A, VPS[2], 't6', 'Steps');
      for (const s of ['alpha', 'beta']) { await A.page.keyboard.type(s); await A.page.keyboard.press('Enter'); await sleep(250); }
      await act(A, VPS[2], '#jeb-panel .jeb-it[data-iid="t6"] .jt-st:nth-child(1) .jt-stk'); await sleep(300);
      await on(A, () => flushPendingPush()); await quiet(cloud, A);
      const want_ = JSON.stringify(await item(A, 't6'));
      let ok = false; for (let i = 0; i < 60 && !ok; i++) { const x = await item(B, 't6'); ok = !!x && x.due === day(1) && x.pri === 1 && (x.steps || []).length === 2 && x.steps[0].d === 1; if (!ok) await sleep(500); }
      const x = await item(B, 't6');
      check(ok && JSON.stringify(x.steps) === JSON.stringify(JSON.parse(want_).steps), '71g due, pri and steps set on A arrive on B', JSON.stringify(x));
      const shown = await on(B, () => { const r = document.querySelector('#jeb-panel .jeb-it[data-iid="t6"]'); return r ? [r.querySelector('.jt-due') && r.querySelector('.jt-due').textContent, !!r.querySelector('.jt-flag'), r.querySelector('.jt-cnt') && r.querySelector('.jt-cnt').textContent].join() : 'row missing'; });
      check(shown === 'Tomorrow,true,1/2', '71g B\'s OPEN panel shows the chip, flag and counter live without a reload', shown);
      await on(B, () => { jebEditItem('t6', { due: '' }); }); await sleep(400); await quiet(cloud, B);
      let ok2 = false; for (let i = 0; i < 60 && !ok2; i++) { const y = await item(A, 't6'); ok2 = !!y && !('due' in y) && y.pri === 1 && y.steps.length === 2; if (!ok2) await sleep(500); }
      check(ok2, '71g ...and B clearing the date comes back to A, the flag and steps surviving', JSON.stringify(await item(A, 't6')));
      check(A.errors.length + B.errors.length === 0, '71g no page errors', [...A.errors, ...B.errors].slice(0, 2).join(' · '));
    } finally { await A.ctx.close(); await B.ctx.close(); }
  }

  /* ══ 71h — scale ══ */
  if (want('71h')) {
    const vp = VPS[0];
    const big = () => seed((db) => {
      db.jeb = [];
      for (let i = 0; i < 300; i++) db.jeb.push(mk('b' + i, 'Task number ' + i + ' with a fairly long line of text to wrap on a phone', i, { ...(i % 6 === 5 ? {} : { due: day((i % 9) - 3) }), ...(i % 7 === 0 ? { pri: 1 } : {}), ...(i % 5 === 0 ? { steps: [1, 2, 3, 4, 5].map((k) => ({ id: 'st' + i + '_' + k, t: 'step ' + k, ...(k < 3 ? { d: 1 } : {}) })) } : {}) }));
    });
    const d = await dev(makeCloud(), 'S', vp, big());
    try {
      const cdp = await d.ctx.newCDPSession(d.page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const times = [];
      for (let k = 0; k < 4; k++) {
        const ms = await d.page.evaluate(() => new Promise((res) => {
          jebClosePanel(); const t0 = performance.now(); jebOpenPanel('jp-task');
          requestAnimationFrame(() => requestAnimationFrame(() => res(Math.round(performance.now() - t0))));
        }));
        times.push(ms); await sleep(300);
      }
      const rows = await on(d, () => document.querySelectorAll('#jeb-panel .jeb-it').length);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      console.log('Z6B-SCALE ' + JSON.stringify({ items: 300, times }));
      const med = [...times].sort((a, b) => a - b)[Math.floor(times.length / 2)];
      const H = hostLimit(300);   /* v05.24 (hs520): the runner's 300 ms × this computer's factor (≥ 1) */
      check(rows === 300 && med <= H.ms, `71h 300 tasks at 390, CPU ×4: the panel paints in ≤ ${H.text} ms, median of 4 (${times.join(' / ')} ms; median ${med})`, JSON.stringify({ rows, times }));
      noErr(d, '71h');
    } finally { await d.ctx.close(); }
  }

  /* ══ 71j — the row layout follows the panel, not the window ══ */
  if (want('71j')) {
    const cases = [...VPS.map((vp) => ({ vp, path: '/', tag: vp.name })), { vp: VPS[2], path: '/?jeb=1', tag: '1440-zab' }];
    for (const c of cases) {
      const d = await dev(makeCloud(), 'L' + c.tag, c.vp, seed((db) => { db.jeb.find((x) => x.id === 't3').steps = [{ id: 's1', t: 'a', d: 1 }, { id: 's2', t: 'b' }]; }), { path: c.path });
      try {
        await openPanel(d, c.vp);
        const m = await on(d, () => {
          const pw = document.getElementById('jeb-panel').clientWidth;
          const rows = [...document.querySelectorAll('#jeb-panel .jt-it')];
          const tops = rows.map((r) => { const a = r.querySelector('.jeb-att-b'), n = r.querySelector('.jeb-note-b'); return a && n ? [Math.round(a.getBoundingClientRect().top), Math.round(n.getBoundingClientRect().top)] : null; });
          const split = tops.filter((t) => !t || t[0] !== t[1]).length;
          const over = rows.filter((r) => r.scrollWidth > r.clientWidth).length;
          const withDue = rows.filter((r) => r.querySelector('.jt-due, .jt-flag, .jt-cnt'));
          const side = withDue.filter((r) => r.querySelector('.jt-side')).length, meta = withDue.filter((r) => r.querySelector('.jt-meta')).length;
          return { pw, n: rows.length, split, over, side, meta, withDue: withDue.length };
        });
        const wide = m.pw >= 560;
        const shapeOk = wide ? m.side === m.withDue && m.meta === 0 : m.meta === m.withDue && m.side === 0;
        check(m.n >= 7 && m.withDue >= 5 && m.split === 0 && m.over === 0 && shapeOk, `71j@${c.tag} panel ${m.pw}px: chips ${wide ? 'in the side column' : 'under the text'}, Attach and → Note on one line in all ${m.n} rows, no row overflows`, JSON.stringify(m));
        noErr(d, '71j@' + c.tag);
      } finally { await d.ctx.close(); }
    }
  }

  /* ══ 71i — contrast ══ */
  if (want('71i')) await each(async (d, vp) => {
    const wide = false;   /* v05.11 fix: a single tasks panel is 380px at every window size, so the chips are always under the text here */
    await on(d, () => { jebEditItem('t3', { steps: [{ id: 's1', t: 'a', d: 1 }, { id: 's2', t: 'b' }] }); });
    await openPanel(d, vp);
    await act(d, vp, '#jeb-panel .jeb-it[data-iid="t6"] .jt-cnt, #jeb-panel .jeb-it[data-iid="t3"] .jt-cnt'); await sleep(300);
    const measure = (sel) => d.page.evaluate((S) => {
      const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
      const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
      const bgOf = (el) => { const layers = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; } } let base = { r: 255, g: 255, b: 255 }; for (let i = layers.length - 1; i >= 0; i--) { const c = layers[i]; base = { r: c.r * c.a + base.r * (1 - c.a), g: c.g * c.a + base.g * (1 - c.a), b: c.b * c.a + base.b * (1 - c.a) }; } return base; };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      let worst = 99, who = '', n = 0;
      document.querySelectorAll(S).forEach((e) => {
        const isIn = e.tagName === 'INPUT' && e.type !== 'checkbox' && (e.value || e.placeholder);
        if (!isIn && ![...e.childNodes].some((x) => x.nodeType === 3 && x.textContent.trim())) return;
        const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return;
        let fg = parse(cs.color), bg = bgOf(e);
        if (e.tagName === 'INPUT' && !e.value && e.placeholder) { const ph = getComputedStyle(e, '::placeholder'); fg = parse(ph.color); }
        const comp = fg.a < 1 ? { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) } : fg;
        n++; const r = ratio(comp, bg); if (r < worst) { worst = r; who = e.className + ':' + (e.textContent || e.value || e.placeholder).trim().slice(0, 14); }
      });
      return { worst: Math.round(worst * 100) / 100, who, n };
    }, sel);
    const newText = '#jeb-panel .jt-gh, #jeb-panel .jt-gh *, #jeb-panel .jt-it .jeb-tx, #jeb-panel .jt-due, #jeb-panel .jt-flag, #jeb-panel .jt-cnt, #jeb-panel .jt-steps input:not([type=checkbox]), #jeb-panel .jt-stx, #jeb-panel .jt-hint';
    const presets = ['forest', 'ocean', 'amber', 'indigo', 'rose'];
    for (const p of presets) {
      await on(d, (k) => { applyPreset(k); }, p); await sleep(200);
      const m = await measure(newText);
      check(m.n >= 20 && m.worst >= 4.5, `71i@${vp.name} the Tasks text (${m.n} pieces: group headers, Overdue red, chips, flag, counter, steps, hint, ${wide ? 'right-hand column' : 'under the text'}) clears 4.5:1 on ${p} (worst ${m.worst}, ${m.who})`, JSON.stringify(m));
      const bd = await measure('#jeb-bar .jeb-ct.jt-red');
      check(bd.n >= 1 && bd.worst >= 4.5, `71i@${vp.name} the red bar badge clears 4.5:1 on ${p} (${bd.worst})`, JSON.stringify(bd));
    }
    await on(d, () => { applyPreset('forest'); setCustomColor('accent', '#F4E27A'); }); await sleep(200);
    const pm = await measure(newText);
    check(pm.worst >= 4.5, `71i@${vp.name} ...and on a pale custom accent (worst ${pm.worst}, ${pm.who})`, JSON.stringify(pm));
    for (const p of presets) {
      await on(d, (k) => { applyPreset(k); }, p);
      await act(d, vp, '#jeb-panel .jeb-it[data-iid="t2"] .jt-due'); await d.page.waitForSelector('#jeb-due'); await sleep(200);
      const cm = await measure('#jeb-due, #jeb-due *');
      check(cm.n >= 6 && cm.worst >= 4.5, `71i@${vp.name} the due chooser clears 4.5:1 on ${p} (worst ${cm.worst}, ${cm.who})`, JSON.stringify(cm));
      await d.page.keyboard.press('Escape'); await sleep(100);
    }
    await on(d, () => { applyPreset('ocean'); jebOpenDeck({ ids: ['jp-task'], all: false }); }); await sleep(700);
    const dk = await measure('#jeb-deck .jeb-card .jeb-tx, #jeb-deck .jeb-card .jt-due, #jeb-deck .jeb-card .jt-flag, #jeb-deck .jeb-card .jt-cnt');
    check(dk.n >= 8 && dk.worst >= 4.5, `71i@${vp.name} the deck cards' chips, flag and counter clear 4.5:1 (worst ${dk.worst}, ${dk.who})`, JSON.stringify(dk));
  });
} catch (e) {
  console.log(' FAIL  zab-z6b threw: ' + (e && e.stack || e));
  results.push({ ok: false, label: 'threw' });
} finally {
  await browser.close();
  await srv.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
