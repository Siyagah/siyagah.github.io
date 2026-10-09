#!/usr/bin/env node
/* tools/jeb-j2.mjs — v04.99, J2: the Jeb bar and the pocket panel (checks 60a–60l).

   Every check runs at 390x844, 820x1180 and 1440x900 against a booted app, with real clicks / taps / typing
   (a touch viewport TAPS, the 1440 one CLICKS), and counts page errors. Data that a check needs is seeded
   into the notebook before boot, not poked in afterwards.

   60a  the bar + its 4 pockets in order + counts; PC: left edge = #sb right edge, follows #rsz and the collapse
   60b  nothing hides behind the bar (Pane 2, a long note, the phone sidebar buttons)
   60c  the panel: opens, closes three ways, sheet on a phone; add (Enter / Shift+Enter), newest on top
   60d  tick, edit in place, Move to pocket, Delete -> Trash -> Restore, Clear done
   60e  drag ⠿ to reorder (mouse at 1440, a real touch drag on the others); persists across a reload
   60f  pockets: New, Rename, Icon & colour, Move left/right, Delete (empty ok, non-empty refused)
   60g  two devices: an item added on A reaches B's bar and OPEN panel live; B's edit in progress survives
   60h  phone keyboard: #ed / .fw-ed focus hides the bar; blur restores; the panel's own input keeps it
   60i  "Show Jeb bar" is reached by real clicks from the sidebar menu; off = no bar, --jeb-h 0; it syncs
   60j  12 pockets: the bar scrolls sideways, last chip reachable, no page-level overflow
   60k  contrast on the five presets + a pale accent; swatch ink on the 8 pastels
   60l  the bottom-fixed sweep: each element against the bar

   `--only=60a,60c` runs just those. Each printed ok/FAIL line becomes one app-check check (block 60). */
import { playwright, serve, seedDB, touchDrag } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, quiet, check, results, NB } from './s1-fake.mjs';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);

const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];
const T0 = '2026-10-01T00:00:00.000Z';
const pw = await playwright();
const srv = await serve();
const browser = await pw.chromium.launch();

const mkItem = (id, pocketId, text, order, done = false) => ({ id, pocketId, text, done, folderIds: [], tags: [], kind: null, journal: false, order, createdAt: T0, updatedAt: T0 });
/* Alpha, Bravo open + "Done one" done in Quick tasks (count 2); Idea in Ideas (count 1) */
const baseItems = () => [mkItem('t1', 'jp-task', 'Alpha', 0), mkItem('t2', 'jp-task', 'Bravo', 1), mkItem('t3', 'jp-task', 'Done one', 2, true), mkItem('i1', 'jp-idea', 'Idea', 0)];
const longNote = () => ({ id: 'long1', title: 'A long note', content: '<h2>One</h2><h2>Two</h2><h2>Three</h2>' + Array.from({ length: 140 }, (_, i) => `<p>Paragraph number ${i} of the long note, with enough words to wrap on a phone screen.</p>`).join('') + '<p id="the-end">THE END</p>', folderIds: ['f1'], tags: [], createdAt: T0, updatedAt: T0, kind: 'general' });
const seed = (extra) => { const db = seedDB(T0); db.jeb = baseItems(); db.articles.push(longNote()); if (extra) extra(db); return db; };
const dev = (cloud, name, vp, db) => addDevice(browser, srv.base, cloud, name, { width: vp.w, height: vp.h }, vp.touch, db || seed());
const act = (d, vp, sel) => (vp.touch ? d.page.locator(sel).first().tap() : d.page.locator(sel).first().click());
const rect = (d, sel) => d.page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; }, sel);
const jebState = (d) => on(d, () => JSON.parse(JSON.stringify({ p: DB.jebPockets, i: DB.jeb, trash: (DB.trash || []).filter((t) => /^jeb/.test(t.type)).length })));
const chipCounts = (d) => on(d, () => [...document.querySelectorAll('#jeb-bar .jeb-chip')].map((c) => c.querySelector('.jeb-nm').textContent + ':' + c.querySelector('.jeb-ct').textContent));
const itemTexts = (d) => on(d, () => [...document.querySelectorAll('#jeb-panel .jeb-it .jeb-tx')].map((e) => e.textContent));
const openPanel = async (d, vp, name) => { await act(d, vp, `#jeb-bar .jeb-chip[title="${name}"]`); await d.page.waitForSelector('#jeb-panel.on', { timeout: 3000 }); await sleep(300); };
const noErr = (d, tag) => check(d.errors.length === 0, `${tag} no page errors`, d.errors.slice(0, 2).join(' · '));
const each = async (fn) => { for (const vp of VPS) { const d = await dev(makeCloud(), 'D' + vp.name, vp); try { await fn(d, vp); } finally { await d.ctx.close(); } } };

try {
  /* ══ 60a — the bar ══ */
  if (want('60a')) await each(async (d, vp) => {
    const t = `60a@${vp.name}`;
    await sleep(800);   /* the sidebar's own width transition (0.2s) has finished */
    const names = await chipCounts(d);
    check(names.join('|') === 'Quick tasks:2|Ideas:1|Links to read:0|Shopping:0', `${t} the bar has the 4 seeded pockets in order with the right not-done counts`, names.join('|'));
    const bar = await rect(d, '#jeb-bar');
    check(!!bar && Math.abs(bar.b - vp.h) <= 1 && bar.h >= 40, `${t} the bar sits at the bottom of the viewport`, JSON.stringify(bar));
    const hasNew = await on(d, () => /New pocket/.test(document.querySelector('#jeb-bar .jeb-new')?.textContent || ''));
    check(hasNew, `${t} "＋ New pocket" follows the last pocket`);
    if (vp.w >= 1200) {
      const sbR = async () => (await rect(d, '#sb')).r;
      check(Math.abs(bar.l - (await sbR())) <= 1, `${t} PC: the bar's left edge = the sidebar's right edge`, `${bar.l} vs ${await sbR()}`);
      const h = await rect(d, '#rsz');
      await d.page.mouse.move(h.l + h.w / 2, 300); await d.page.mouse.down(); await d.page.mouse.move(h.l + 60, 300, { steps: 6 }); await d.page.mouse.move(h.l + 120, 300, { steps: 6 }); await d.page.mouse.up();
      await sleep(500);
      const b2 = await rect(d, '#jeb-bar'), s2 = await sbR();
      check(Math.abs(b2.l - s2) <= 1 && Math.abs(b2.l - bar.l) > 20, `${t} PC: dragging #rsz moves the bar's left edge with the sidebar`, `${bar.l} -> ${b2.l}, sidebar ${s2}`);
      await act(d, vp, '#sb-toggle'); await sleep(700);
      const b3 = await rect(d, '#jeb-bar');
      check(b3.l <= 1, `${t} PC: collapsing the sidebar makes the bar start at 0`, String(b3.l));
      await act(d, vp, '#sb-toggle'); await sleep(700);
      const b4 = await rect(d, '#jeb-bar'), s4 = await sbR();
      check(Math.abs(b4.l - s4) <= 1 && b4.l > 100, `${t} PC: expanding it again puts the edge back`, `${b4.l} vs ${s4}`);
    } else {
      check(bar.l <= 1 && Math.abs(bar.r - vp.w) <= 1, `${t} full width on this layout`, JSON.stringify(bar));
    }
    noErr(d, t);
  });

  /* ══ 60b — nothing hides behind the bar ══ */
  if (want('60b')) await each(async (d, vp) => {
    const t = `60b@${vp.name}`;
    const barTop = (await rect(d, '#jeb-bar')).t;
    if (vp.w < 1200) {
      const tb = await rect(d, '#sb-toolbar'), sb = await rect(d, '#sb');
      check(tb && tb.b <= barTop + 0.5 && sb.b <= barTop + 0.5, `${t} the sidebar screen ends at the bar and its four buttons sit above it`, `toolbar.bottom ${tb && tb.b}, #sb.bottom ${sb.b}, bar.top ${barTop}`);
    }
    await on(d, () => { selFolder('f1'); });
    await sleep(300);
    if (vp.w < 1200) await on(d, () => { document.getElementById('p2').classList.add('mob-open'); });
    await sleep(400);
    const p2 = await on(d, () => { const c = document.getElementById('p2c'); c.scrollTop = c.scrollHeight; const last = c.lastElementChild; const r = last ? last.getBoundingClientRect() : null; const pr = document.getElementById('p2').getBoundingClientRect(); return { lastBottom: r && r.bottom, paneBottom: pr.bottom }; });
    check(p2.paneBottom <= barTop + 0.5 && (p2.lastBottom == null || p2.lastBottom <= barTop + 0.5), `${t} Pane 2 and the end of its list end above the bar`, JSON.stringify({ ...p2, barTop }));
    await on(d, () => { selArt('long1'); });
    await sleep(600);
    if (vp.w < 1200) await on(d, () => { document.getElementById('p3').classList.add('mob-open'); });
    await sleep(400);
    const p3 = await on(d, () => { document.querySelectorAll('#p3c, #p3c .avw, #p3c .av-body').forEach((e) => { e.scrollTop = e.scrollHeight; }); const e = document.getElementById('the-end'); const er = e ? e.getBoundingClientRect() : null; return { endBottom: er && er.bottom, paneBottom: document.getElementById('p3').getBoundingClientRect().bottom }; });
    check(p3.paneBottom <= barTop + 0.5 && p3.endBottom != null && p3.endBottom <= barTop + 0.5, `${t} Pane 3 and the last line of a long note end above the bar`, JSON.stringify({ ...p3, barTop }));
    noErr(d, t);
  });

  /* ══ 60c — the panel ══ */
  if (want('60c')) await each(async (d, vp) => {
    const t = `60c@${vp.name}`;
    await openPanel(d, vp, 'Quick tasks');
    const pr = await rect(d, '#jeb-panel'), bar = await rect(d, '#jeb-bar');
    if (vp.w < 640) check(Math.abs(pr.w - vp.w) <= 1 && Math.abs(pr.h - vp.h * 0.72) <= 8 && Math.abs(pr.b - bar.t) <= 1, `${t} phone: a bottom sheet, full width, ~72% high, resting on the bar`, JSON.stringify({ pr, barTop: bar.t }));
    else check(Math.abs(pr.w - 380) <= 2 && Math.abs(pr.r - vp.w) <= 1 && pr.t <= 1 && Math.abs(pr.b - bar.t) <= 1, `${t} a ~380px panel on the right, over Pane 3, above the bar`, JSON.stringify(pr));
    const head = await on(d, () => document.querySelector('#jeb-panel .jeb-ph').textContent);
    check(/Quick tasks/.test(head) && /2 open · 3 in this pocket/.test(head), `${t} header: name and "N open · M in this pocket"`, head);
    /* close three ways */
    await act(d, vp, '#jeb-panel .jeb-x'); await sleep(250);
    check(!(await on(d, () => document.getElementById('jeb-panel').classList.contains('on'))), `${t} ✕ closes it`);
    await openPanel(d, vp, 'Quick tasks'); await d.page.keyboard.press('Escape'); await sleep(250);
    check(!(await on(d, () => document.getElementById('jeb-panel').classList.contains('on'))), `${t} Escape closes it`);
    await openPanel(d, vp, 'Quick tasks');
    const out = vp.w < 640 ? { x: 200, y: 80 } : { x: 120, y: 300 };
    if (vp.touch) await d.page.touchscreen.tap(out.x, out.y); else await d.page.mouse.click(out.x, out.y);
    await sleep(250);
    check(!(await on(d, () => document.getElementById('jeb-panel').classList.contains('on'))), `${t} a tap outside closes it`);
    /* the tap may have landed on a field (a phone then hides the bar for the keyboard, by design — 60h) */
    await on(d, () => { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); }); await sleep(250);
    /* add */
    await openPanel(d, vp, 'Quick tasks');
    await d.page.locator('#jeb-add-in').click();
    await d.page.keyboard.type('First jot'); await d.page.keyboard.press('Enter');
    await d.page.keyboard.type('Second jot'); await d.page.keyboard.press('Enter');
    await sleep(300);
    const tx = await itemTexts(d);
    check(tx[0] === 'Second jot' && tx[1] === 'First jot' && tx[2] === 'Alpha', `${t} Enter adds at the TOP, twice in a row`, tx.join(' | '));
    check(await on(d, () => document.activeElement && document.activeElement.id === 'jeb-add-in' && document.getElementById('jeb-add-in').value === ''), `${t} focus stays in the box, which is emptied`);
    check((await chipCounts(d))[0] === 'Quick tasks:4', `${t} the bar count updates (2 -> 4)`, (await chipCounts(d))[0]);
    await d.page.keyboard.type('L1'); await d.page.keyboard.press('Shift+Enter'); await d.page.keyboard.type('L2'); await d.page.keyboard.press('Enter');
    await sleep(300);
    const st = await jebState(d);
    const two = st.i.find((x) => x.text === 'L1\nL2');
    check(!!two && st.i.filter((x) => x.pocketId === 'jp-task').length === 6, `${t} Shift+Enter keeps two lines in ONE item`, JSON.stringify(st.i.map((x) => x.text)));
    noErr(d, t);
  });

  /* ══ 60d — tick, edit, move, delete / restore, clear done ══ */
  if (want('60d')) await each(async (d, vp) => {
    const t = `60d@${vp.name}`;
    await openPanel(d, vp, 'Quick tasks');
    const row = (txt) => `#jeb-panel .jeb-it:has(.jeb-tx:text-is("${txt}"))`;
    await act(d, vp, `${row('Alpha')} .jeb-tick`); await sleep(300);
    let c = (await chipCounts(d))[0], done = await on(d, () => document.querySelector('#jeb-panel .jeb-it.done .jeb-tx') && [...document.querySelectorAll('#jeb-panel .jeb-it.done')].length);
    check(c === 'Quick tasks:1' && done === 2, `${t} ticking an item: count 2 -> 1, the item stays, struck through`, c + ' done rows ' + done);
    await act(d, vp, `${row('Alpha')} .jeb-tick`); await sleep(300);
    check((await chipCounts(d))[0] === 'Quick tasks:2', `${t} unticking: count back to 2`, (await chipCounts(d))[0]);
    /* edit in place */
    await act(d, vp, `${row('Alpha')} .jeb-tx`);
    await d.page.keyboard.press('Control+A'); await d.page.keyboard.type('Alpha edited'); await d.page.keyboard.press('Enter'); await sleep(300);
    let st = await jebState(d);
    check(st.i.find((x) => x.id === 't1').text === 'Alpha edited', `${t} tap to edit in place; Enter saves`);
    await act(d, vp, `${row('Alpha edited')} .jeb-tx`);
    await d.page.keyboard.press('Control+A'); await d.page.keyboard.type('NOT SAVED'); await d.page.keyboard.press('Escape'); await sleep(300);
    st = await jebState(d);
    check(st.i.find((x) => x.id === 't1').text === 'Alpha edited' && (await on(d, () => document.getElementById('jeb-panel').classList.contains('on'))), `${t} Escape cancels the edit (and does not close the panel)`);
    /* move */
    await act(d, vp, `${row('Bravo')} .jeb-more`);
    await act(d, vp, '#jeb-menu .jm:has-text("Move to pocket")');
    await act(d, vp, '#jeb-menu .jm:has-text("Ideas")'); await sleep(300);
    st = await jebState(d);
    check(st.i.find((x) => x.id === 't2').pocketId === 'jp-idea' && (await chipCounts(d)).slice(0, 2).join('|') === 'Quick tasks:1|Ideas:2', `${t} ⋯ → Move to pocket → Ideas`, (await chipCounts(d)).join('|'));
    /* delete -> trash -> restore from the Trash modal */
    await act(d, vp, `${row('Alpha edited')} .jeb-more`);
    await act(d, vp, '#jeb-menu .jm:has-text("Delete")'); await sleep(300);
    st = await jebState(d);
    check(!st.i.some((x) => x.id === 't1') && st.trash === 1, `${t} ⋯ → Delete moves the item to Trash`, 'trash ' + st.trash);
    await on(d, () => { openTrash(); });
    await act(d, vp, '#trash-body .trash-row:has-text("Alpha edited") button:has-text("Restore")'); await sleep(400);
    await on(d, () => { closeTrash(); });
    st = await jebState(d);
    check(st.i.some((x) => x.id === 't1' && x.text === 'Alpha edited') && (await chipCounts(d))[0] === 'Quick tasks:1', `${t} restoring it from the Trash modal brings it back (Quick tasks 1: Bravo moved to Ideas)`, (await chipCounts(d)).join('|'));
    /* clear done (the Trash modal was outside the panel, so the panel closed — reopen it) */
    await openPanel(d, vp, 'Quick tasks');
    const foot = await on(d, () => document.querySelector('#jeb-panel .jeb-foot').textContent);
    check(/Clear done \(1\)/.test(foot), `${t} the foot offers "Clear done (1)"`, foot);
    await act(d, vp, '#jeb-panel .jeb-foot button'); await sleep(300);
    st = await jebState(d);
    check(!st.i.some((x) => x.id === 't3') && st.trash === 1 && !(await on(d, () => document.querySelector('#jeb-panel .jeb-foot').textContent.trim())), `${t} Clear done sends the done item to Trash and the foot goes`, 'trash ' + st.trash);
    noErr(d, t);
  });

  /* ══ 60e — drag to reorder ══ */
  if (want('60e')) await each(async (d, vp) => {
    const t = `60e@${vp.name}`;
    await openPanel(d, vp, 'Quick tasks');
    /* order now: Alpha, Bravo, Done one -> drag "Done one" above "Alpha" */
    const g = await d.page.locator('#jeb-panel .jeb-it:has(.jeb-tx:text-is("Done one")) .jeb-grip').boundingBox();
    const a = await d.page.locator('#jeb-panel .jeb-it:has(.jeb-tx:text-is("Alpha"))').boundingBox();
    const from = { x: g.x + g.width / 2, y: g.y + g.height / 2 }, to = { x: from.x, y: a.y + 4 };
    if (vp.touch) {
      const pts = Array.from({ length: 12 }, (_, i) => ({ x: from.x, y: from.y + (to.y - from.y) * ((i + 1) / 12) }));
      await touchDrag(d.page, [from, ...pts]);
    } else {
      await d.page.mouse.move(from.x, from.y); await d.page.mouse.down();
      for (let i = 1; i <= 12; i++) await d.page.mouse.move(from.x, from.y + (to.y - from.y) * (i / 12));
      await d.page.mouse.up();
    }
    await sleep(500);
    const tx = await itemTexts(d);
    check(tx.join('|') === 'Done one|Alpha|Bravo', `${t} dragging ⠿ moves "Done one" to the top (${vp.touch ? 'real touch drag' : 'mouse'})`, tx.join('|'));
    await sleep(600);
    await d.page.reload({ waitUntil: 'domcontentloaded' });
    await d.page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('jeb-bar'));
    await sleep(500);
    await openPanel(d, vp, 'Quick tasks');
    const tx2 = await itemTexts(d);
    check(tx2.join('|') === 'Done one|Alpha|Bravo', `${t} the new order persists across a reload`, tx2.join('|'));
    noErr(d, t);
  });

  /* ══ 60f — pockets ══ */
  if (want('60f')) await each(async (d, vp) => {
    const t = `60f@${vp.name}`;
    await act(d, vp, '#jeb-bar .jeb-new');
    await d.page.waitForSelector('#jeb-f-name');
    await d.page.locator('#jeb-f-name').fill('Reading');
    await d.page.locator('#jeb-f-icons button[data-icon="★"]').click();
    await d.page.locator('#jeb-f-colors button[data-color="#E6DCF7"]').click();
    await d.page.locator('#jeb-f-ok').click(); await sleep(300);
    let st = await jebState(d);
    const np = st.p.find((p) => p.name === 'Reading');
    check(!!np && np.icon === '★' && np.color === '#E6DCF7' && (await chipCounts(d)).pop() === 'Reading:0', `${t} ＋ New pocket: name, icon and colour are kept; the chip appears last`, JSON.stringify(np));
    const menuOf = async (name) => { await d.page.locator(`#jeb-bar .jeb-chip[title="${name}"]`).first().click({ button: 'right' }); await d.page.waitForSelector('#jeb-menu'); await sleep(100); };
    await menuOf('Reading');
    const rows = await on(d, () => [...document.querySelectorAll('#jeb-menu .jm')].map((e) => e.textContent));
    check(['Rename', 'Icon & colour', 'Move left', 'Move right', 'Clear done items', 'Delete pocket'].every((w) => rows.some((r) => r.includes(w))) && rows.every((r) => /[A-Za-z]/.test(r)), `${t} the pocket menu: every row carries a word`, rows.join(' / '));
    await act(d, vp, '#jeb-menu .jm:has-text("Rename")');
    await d.page.waitForSelector('#jeb-f-name'); await d.page.locator('#jeb-f-name').fill('Reading list'); await d.page.keyboard.press('Enter'); await sleep(300);
    st = await jebState(d);
    check(st.p.some((p) => p.id === np.id && p.name === 'Reading list'), `${t} Rename`);
    await menuOf('Reading list');
    await act(d, vp, '#jeb-menu .jm:has-text("Icon & colour")');
    await d.page.waitForSelector('#jeb-f-icons'); await d.page.locator('#jeb-f-icons button[data-icon="♥"]').click(); await d.page.locator('#jeb-f-colors button[data-color="#FFD0CC"]').click(); await d.page.locator('#jeb-f-ok').click(); await sleep(300);
    st = await jebState(d);
    check(st.p.some((p) => p.id === np.id && p.icon === '♥' && p.color === '#FFD0CC'), `${t} Icon & colour`);
    await menuOf('Reading list'); await act(d, vp, '#jeb-menu .jm:has-text("Move left")'); await sleep(300);
    check((await chipCounts(d)).map((x) => x.split(':')[0]).join('|') === 'Quick tasks|Ideas|Links to read|Reading list|Shopping', `${t} Move left`, (await chipCounts(d)).join('|'));
    await menuOf('Reading list'); await act(d, vp, '#jeb-menu .jm:has-text("Move right")'); await sleep(300);
    check((await chipCounts(d)).pop().startsWith('Reading list'), `${t} Move right`);
    await menuOf('Reading list'); await act(d, vp, '#jeb-menu .jm:has-text("Delete pocket")'); await sleep(300);
    st = await jebState(d);
    check(!st.p.some((p) => p.id === np.id) && st.trash === 1, `${t} deleting an EMPTY pocket works (to Trash)`);
    const before = JSON.stringify((await jebState(d)).p.map((p) => p.id));
    await on(d, () => { window.__toasts.length = 0; });
    await menuOf('Quick tasks'); await act(d, vp, '#jeb-menu .jm:has-text("Delete pocket")'); await sleep(300);
    const toasts = await on(d, () => window.__toasts.join(' / '));
    check(JSON.stringify((await jebState(d)).p.map((p) => p.id)) === before && /holds items/.test(toasts), `${t} deleting a pocket that holds items is refused with the toast, nothing changes`, toasts);
    noErr(d, t);
  });

  /* ══ 60g — two devices, live ══ */
  if (want('60g')) {
    const cloud = makeCloud();
    const A = await dev(cloud, 'A', VPS[2]), B = await dev(cloud, 'B', VPS[2]);
    try {
      await sleep(1500);
      await on(A, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.content += '<p>x</p>'; a.updatedAt = new Date().toISOString(); persist(); flushPendingPush(); });
      await sleep(800); await quiet(cloud, A); await quiet(cloud, B);
      await openPanel(B, VPS[2], 'Quick tasks');
      await openPanel(A, VPS[2], 'Quick tasks');
      await A.page.locator('#jeb-add-in').click(); await A.page.keyboard.type('From A'); await A.page.keyboard.press('Enter');
      const seen = async () => (await chipCounts(B))[0] === 'Quick tasks:3' && (await itemTexts(B)).includes('From A');
      let ok = false; for (let i = 0; i < 60 && !ok; i++) { await sleep(500); ok = await seen(); }
      check(ok, '60g B shows A\'s new item in its bar count (3) and its OPEN panel, without a reload', (await chipCounts(B))[0] + ' | ' + (await itemTexts(B)).join(','));
      /* B edits Bravo; while the textarea is open A edits Alpha */
      await B.page.locator('#jeb-panel .jeb-it:has(.jeb-tx:text-is("Bravo")) .jeb-tx').click();
      await B.page.keyboard.press('Control+A'); await B.page.keyboard.type('Bravo typed on B');
      await on(A, () => { jebEditItem('t1', { text: 'Alpha changed on A' }); });
      await sleep(500); await quiet(cloud, A);
      let live = false; for (let i = 0; i < 40 && !live; i++) { await sleep(500); live = await on(B, () => (DB.jeb.find((x) => x.id === 't1') || {}).text === 'Alpha changed on A'); }
      const mid = await on(B, () => ({ val: document.querySelector('#jeb-panel .jeb-edit') && document.querySelector('#jeb-panel .jeb-edit').value, focused: document.activeElement && document.activeElement.classList.contains('jeb-edit') }));
      check(live && mid.val === 'Bravo typed on B' && mid.focused, '60g a merge that arrives while B is typing does NOT repaint the item: the text and the caret survive', JSON.stringify({ live, ...mid }));
      await B.page.keyboard.press('Enter'); await sleep(600); await quiet(cloud, B); await sleep(1500); await quiet(cloud, A);
      let both = false; for (let i = 0; i < 40 && !both; i++) { both = await on(A, () => (DB.jeb.find((x) => x.id === 't2') || {}).text === 'Bravo typed on B'); if (!both) await sleep(500); }
      const bt = await itemTexts(B);
      check(both && (await jebState(B)).i.find((x) => x.id === 't1').text === 'Alpha changed on A' && bt.includes('Alpha changed on A') && bt.includes('Bravo typed on B'), '60g both edits end up on both devices, and B\'s panel repaints once the edit ends', JSON.stringify(bt));
      check(A.errors.length + B.errors.length === 0, '60g no page errors', [...A.errors, ...B.errors].slice(0, 2).join(' · '));
    } finally { await A.ctx.close(); await B.ctx.close(); }
  }

  /* ══ 60h — phone keyboard ══ */
  if (want('60h')) {
    const vp = VPS[0];
    const d = await dev(makeCloud(), 'H', vp);
    try {
      const shown = () => on(d, () => !!document.getElementById('jeb-bar') && getComputedStyle(document.getElementById('jeb-bar')).display !== 'none' && getComputedStyle(document.documentElement).getPropertyValue('--jeb-h').trim());
      check((await shown()) === '56px', '60h@390 the bar is up to start with', String(await shown()));
      await on(d, () => { selArt('a1'); document.getElementById('p3').classList.add('mob-open'); startEdit && startEdit(); });
      await sleep(600);
      await d.page.locator('#ed').first().click(); await sleep(300);
      const hid = await on(d, () => ({ disp: getComputedStyle(document.getElementById('jeb-bar')).display, h: getComputedStyle(document.documentElement).getPropertyValue('--jeb-h').trim(), ae: document.activeElement && document.activeElement.id }));
      check(hid.ae === 'ed' && hid.disp === 'none' && hid.h === '0px', '60h@390 focusing the note editor #ed hides the bar and gives the room back', JSON.stringify(hid));
      await on(d, () => document.activeElement.blur()); await sleep(600);
      check((await shown()) === '56px', '60h@390 blurring brings it back (after 300 ms, so a tap that blurs does not shift the layout under the finger)');
      /* a float window's editor */
      const fw = await on(d, () => { popOutNote('a2'); return true; });
      await sleep(700);
      const hasFw = await on(d, () => !!document.querySelector('.fw-ed'));
      if (hasFw) {
        await d.page.locator('.fw-ed').first().click(); await sleep(300);
        check((await on(d, () => getComputedStyle(document.getElementById('jeb-bar')).display)) === 'none', '60h@390 focusing a float window\'s .fw-ed hides the bar');
        await on(d, () => document.activeElement.blur()); await sleep(600);
        check((await shown()) === '56px', '60h@390 blurring the float window\'s editor brings it back');
      } else check(false, '60h@390 a float window with a .fw-ed could be opened', 'fw=' + fw);
      /* Jeb's own input keeps the bar */
      await on(d, () => { closeAllFloats(); if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); });
      await sleep(700);
      const shownBefore = await shown();
      check(shownBefore === '56px', '60h@390 with nothing focused the bar is up again', String(shownBefore));
      await act(d, vp, '#jeb-bar .jeb-chip[title="Ideas"]'); await sleep(400);
      await d.page.locator('#jeb-add-in').tap(); await sleep(300);
      check((await shown()) === '56px', '60h@390 focusing the panel\'s own input does NOT hide the bar', String(await shown()));
      check(d.errors.length === 0, '60h no page errors', d.errors.slice(0, 2).join(' · '));
    } finally { await d.ctx.close(); }
  }

  /* ══ 60i — the switch ══ */
  if (want('60i')) {
    for (const vp of VPS) {
      const cloud = makeCloud();
      const A = await dev(cloud, 'A' + vp.name, vp), B = await dev(cloud, 'B' + vp.name, vp);
      const t = `60i@${vp.name}`;
      try {
        await sleep(1200);
        await on(A, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.content += '<p>x</p>'; a.updatedAt = new Date().toISOString(); persist(); flushPendingPush(); });
        await sleep(800); await quiet(cloud, A); await quiet(cloud, B);
        /* the real route: sidebar menu -> 🎨 Appearance -> the switch */
        await act(A, vp, '#sb-tools-btn'); await sleep(300);
        await act(A, vp, '.sb-mi:has-text("Appearance")'); await sleep(400);
        check(await A.page.locator('#th-jebbar').isVisible(), `${t} "Show Jeb bar" is on screen after clicking 🧰 -> Appearance`);
        check(await A.page.locator('#th-jebbar').isChecked(), `${t} it is on by default`);
        await act(A, vp, '#th-jebbar'); await sleep(400);
        const off = await on(A, () => ({ bar: !!document.getElementById('jeb-bar'), h: getComputedStyle(document.documentElement).getPropertyValue('--jeb-h').trim(), cls: document.documentElement.classList.contains('jeb-on'), theme: DB.theme.jebBar }));
        check(!off.bar && off.h === '0px' && !off.cls && off.theme === false, `${t} off: no bar, --jeb-h is 0`, JSON.stringify(off));
        await on(A, () => closeTheme());
        const reach = await on(A, () => { const p = document.getElementById('p2'); if (innerWidth < 1200) { p.classList.add('mob-open'); } return { pb: Math.round(p.getBoundingClientRect().bottom), vh: innerHeight }; });
        await sleep(400);
        const pb = await on(A, () => Math.round(document.getElementById('p2').getBoundingClientRect().bottom));
        check(Math.abs(pb - reach.vh) <= 1, `${t} off: the panes reach the bottom again`, `${pb} vs ${reach.vh}`);
        await sleep(600); await quiet(cloud, A);
        let synced = false; for (let i = 0; i < 40 && !synced; i++) { synced = await on(B, () => !document.getElementById('jeb-bar') && DB.theme.jebBar === false); if (!synced) await sleep(500); }
        check(synced, `${t} the switch syncs: device B loses its bar too`);
        await on(A, () => { setJebBar(true); });
        check(await on(A, () => !!document.getElementById('jeb-bar')), `${t} on again: the bar returns`);
        noErr(A, t);
      } finally { await A.ctx.close(); await B.ctx.close(); }
    }
  }

  /* ══ 60j — 12 pockets ══ */
  if (want('60j')) await each(async (d, vp) => {
    const t = `60j@${vp.name}`;
    await on(d, () => { for (let i = 0; i < 8; i++) jebAddPocket('Pocket number ' + (i + 5), '★', '#D8F0D2'); jebRefresh(); });
    await sleep(300);
    const m = await on(d, () => { const b = document.getElementById('jeb-bar'); return { chips: b.querySelectorAll('.jeb-chip').length, sw: b.scrollWidth, cw: b.clientWidth, docW: document.documentElement.scrollWidth, innerW: innerWidth, bodyW: document.body.scrollWidth }; });
    check(m.chips === 12 && m.sw > m.cw, `${t} 12 pockets overflow the bar sideways (scrollable)`, JSON.stringify(m));
    check(m.docW <= m.innerW && m.bodyW <= m.innerW, `${t} no page-level horizontal overflow`, JSON.stringify(m));
    await d.page.mouse.move(vp.w / 2, vp.h - 28);
    await d.page.mouse.wheel(0, 3000); await sleep(300);
    const sl = await on(d, () => document.getElementById('jeb-bar').scrollLeft);
    check(sl > 50, `${t} a vertical mouse wheel over the bar scrolls it sideways`, String(sl));
    await on(d, () => { const b = document.getElementById('jeb-bar'); b.scrollLeft = b.scrollWidth; });
    await sleep(200);
    const last = await on(d, () => { const b = document.getElementById('jeb-bar'), n = b.querySelector('.jeb-new').getBoundingClientRect(), br = b.getBoundingClientRect(); return { right: n.right, barRight: br.right, left: n.left }; });
    check(last.right <= last.barRight + 1 && last.left >= 0, `${t} the last item ("＋ New pocket") is reachable`, JSON.stringify(last));
    noErr(d, t);
  });

  /* ══ 60k — contrast ══ */
  if (want('60k')) {
    const d = await dev(makeCloud(), 'K', VPS[2]);
    try {
      await act(d, VPS[2], '#jeb-bar .jeb-chip[title="Quick tasks"]'); await sleep(300);
      await on(d, () => { jebAddItem('jp-task', 'Ticked'); const it = DB.jeb[DB.jeb.length - 1]; jebToggleDone(it.id); jebRefresh(); });
      const measure = () => d.page.evaluate(() => {
        const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
        const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
        const bgOf = (el) => { const layers = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; } } let base = { r: 255, g: 255, b: 255 }; for (let i = layers.length - 1; i >= 0; i--) { const c = layers[i]; base = { r: c.r * c.a + base.r * (1 - c.a), g: c.g * c.a + base.g * (1 - c.a), b: c.b * c.a + base.b * (1 - c.a) }; } return base; };
        const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
        let worst = 99, who = '';
        document.querySelectorAll('#jeb-bar *, #jeb-panel *').forEach((e) => {
          if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return;
          const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return;
          const fg = parse(cs.color); const bg = bgOf(e);
          const comp = fg.a < 1 ? { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) } : fg;
          const r = ratio(comp, bg); if (r < worst) { worst = r; who = e.className + ':' + e.textContent.trim().slice(0, 14); }
        });
        return { worst: Math.round(worst * 100) / 100, who };
      });
      for (const p of ['forest', 'ocean', 'amber', 'indigo', 'rose']) {
        await on(d, (k) => { applyPreset(k); }, p); await sleep(200);
        const m = await measure();
        check(m.worst >= 4.5, `60k the bar's and the panel's text clear 4.5:1 on ${p} (worst ${m.worst}, ${m.who})`, JSON.stringify(m));
      }
      await on(d, () => { applyPreset('forest'); setCustomColor('accent', '#F4E27A'); }); await sleep(200);
      const pm = await measure();
      check(pm.worst >= 4.5, `60k ...and on a pale custom accent (worst ${pm.worst}, ${pm.who})`, JSON.stringify(pm));
      const sw = await on(d, () => {
        const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        const L = (h) => { const n = parseInt(h.slice(1), 16); return 0.2126 * f(n >> 16) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255); };
        const ink = L('#2A2418');
        return _JEB_COLORS.map((c) => { const x = L(c); return [c, Math.round(((Math.max(x, ink) + 0.05) / (Math.min(x, ink) + 0.05)) * 100) / 100]; });
      });
      check(sw.length === 8 && sw.every(([, r]) => r >= 4.5), '60k the swatch ink #2A2418 clears 4.5:1 on all 8 pastels', JSON.stringify(sw));
      const real = await on(d, () => { const s = document.querySelector('#jeb-bar .jeb-sw'); return getComputedStyle(s).color; });
      check(real === 'rgb(42, 36, 24)', '60k the swatch really is painted with #2A2418', real);
      noErr(d, '60k');
    } finally { await d.ctx.close(); }
  }

  /* ══ 60l — the bottom-fixed sweep ══ */
  if (want('60l')) await each(async (d, vp) => {
    const t = `60l@${vp.name}`;
    const barTop = (await rect(d, '#jeb-bar')).t;
    /* toast: moves up by --jeb-h */
    await on(d, () => { toast('sweep toast', 4000); });
    await sleep(150);
    const to = await rect(d, '.toast');
    check(to && to.b <= barTop + 0.5, `${t} .toast sits above the bar (moves up by --jeb-h)`, JSON.stringify({ toast: to, barTop }));
    /* fw-closeall / fw-switch: two float windows */
    await on(d, () => { popOutNote('a1'); popOutNote('a2'); });
    await sleep(900);
    /* opening a window may focus a field; a phone then hides the bar for the keyboard (60h) — measure with it up */
    await on(d, () => { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); });
    await sleep(300);
    const fs = await rect(d, '#fw-switch'), fc = await rect(d, '#fw-closeall');
    const chip = fs || fc;
    check(chip && chip.b <= barTop + 0.5, `${t} ${fs ? '#fw-switch' : '#fw-closeall'} sits above the bar (moves up by --jeb-h)`, JSON.stringify({ chip, barTop }));
    if (fs) {
      const fwin = await on(d, () => Math.max(...[...document.querySelectorAll('.float-win')].map((w) => w.getBoundingClientRect().bottom)));
      check(fwin <= fs.t + 1, `${t} the float-window sheets stop at the switcher, which is above the bar`, JSON.stringify({ fwin, switcherTop: fs.t, barTop }));
    }
    await on(d, () => { closeAllFloats(); });
    /* toc-float-btn: only under 900px and for a note with 3+ headings */
    await on(d, () => { selArt('long1'); popOutNote('long1'); });   /* Contents is a float-window / pop-up feature, and needs a selected note */
    await sleep(900);
    await on(d, () => { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); _tocMobileCheck(); });
    await sleep(400);
    const tb = await on(d, () => { const b = document.getElementById('toc-float-btn'); if (!b) return null; return { r: b.getBoundingClientRect().bottom, scan: _tocScan().length }; });
    if (vp.w < 900 && !tb) console.log('DBG toc', JSON.stringify(await on(d, () => ({ art: ST.article, scan: _tocScan().length, iw: innerWidth }))));
    if (vp.w < 900) check(!!tb && tb.r <= barTop - 60, `${t} #toc-float-btn sits above the bar (76px + --jeb-h)`, JSON.stringify({ tb, barTop }));
    else check(tb === null, `${t} #toc-float-btn is not used on this layout (>= 900px): nothing to overlap`, JSON.stringify(tb));
    await on(d, () => { closeAllFloats(); if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); });
    await sleep(400);
    /* the panel: over Pane 3, ends at the bar; the TOC drawer, tab picker and modals sit OVER the bar on purpose */
    await openPanel(d, vp, 'Ideas');
    const pr = await rect(d, '#jeb-panel');
    check(Math.abs(pr.b - barTop) <= 1, `${t} the panel rests on the bar, not under it`, JSON.stringify({ pr, barTop }));
    const z = await on(d, () => {
      const rule = (sel) => { for (const ss of document.styleSheets) { let rs; try { rs = ss.cssRules; } catch (e) { continue; } for (const r of rs) if (r.selectorText === sel && r.style.zIndex) return +r.style.zIndex; } return null; };
      return { bar: rule('#jeb-bar'), drawer: rule('#toc-drawer'), modal: rule('#trash-modal'), tab: rule('#tab-picker'), ov: rule('#ov') };
    });
    check(z.bar === 140 && z.drawer > z.bar && z.modal > z.bar && z.tab > z.bar && z.ov > z.bar, `${t} the TOC drawer, the tab picker and modals are stacked above the bar (over it on purpose)`, JSON.stringify(z));
    noErr(d, t);
  });
} catch (e) {
  console.log(' FAIL  jeb-j2 threw: ' + (e && e.stack || e));
  results.push({ ok: false, label: 'threw' });
} finally {
  await browser.close();
  await srv.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
