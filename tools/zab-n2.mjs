#!/usr/bin/env node
/* tools/zab-n2.mjs — v05.18, N2: on a phone Zab is one corner button with three layouts (checks 77a–77h).

   Phones (touch, 360 and 390 wide) are driven with real taps and a real long-press (CDP touch events); 820 is touch, 1440 uses
   real clicks. Nothing touches the network (sync uses the fake cloud). `--notes=N` sets the size of the big notebook in 77f
   (default 9000). N2_ROOT=<dir> serves another build as the build under test (the unpatched run uses a copy of v05.16).

   77a  the button: present at 360/390, no bar, --jeb-h 0, overlaps no other fixed control (notes list, toast, read, edit, panel
        open); absent at 820/1440 where the N1 bar is exactly as before; the badge = "All pockets", red with an overdue task;
        hides with the keyboard
   77b  each layout (Rail, Drawer, Columns): open, reach the 4th level of a 4-deep chain, open its panel, add an item, close,
        reopen, the item and the right count all the way up; long-press on a pocket opens its menu (Rename works); All pockets, ＋
   77c  choosing: the long-press card (inside the screen at 360), each row switches, right-click opens it, the Appearance choice
        (incl. 'bar' = the N1 bar) from a phone and from 1440, the setting reaches a second device both ways
   77d  calm: with Zab closed the notes screens are where they are with Zab off; the last line of the list, a read note and an
        edited note scroll clear of the button
   77e  an address in an item is tappable (new tab) in every kind except links; a tap elsewhere on the item still edits it
   77f  scale: 50 pockets × 5 levels × 300 items, each layout opens in <= 300 ms (median of 4) at 390, CPU x4; with the big
        notebook the style+layout cost of opening/closing a layout and of the keyboard hide/show is <= 50 ms
   77g  contrast of the new text on the five presets
   77h  no animation runs under prefers-reduced-motion (and one does without it, so the check can fail)

   `--only=77a,77c` runs just those. Each printed ok/FAIL line becomes one app-check check (block 77). */
import { playwright, serve, seedDB } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, quiet, check, results } from './s1-fake.mjs';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);
const NOTES = +((argv.find((a) => a.startsWith('--notes=')) || '').slice(8)) || 9000;

const P360 = { name: '360', w: 360, h: 740, touch: true }, P390 = { name: '390', w: 390, h: 844, touch: true };
const T820 = { name: '820', w: 820, h: 1180, touch: true }, D1440 = { name: '1440', w: 1440, h: 900, touch: false };
const T0 = '2026-10-01T00:00:00.000Z';
const pw = await playwright();
const srv = await serve(process.env.N2_ROOT || undefined);
const browser = await pw.chromium.launch();

const mk = (id, pocketId, text, order, extra = {}) => ({ id, pocketId, text, done: false, folderIds: [], tags: [], kind: null, journal: false, order, createdAt: T0, updatedAt: T0, ...extra });
const seed = (extra) => { const db = seedDB(T0); if (extra) extra(db); return db; };
const dev = (cloud, name, vp, db, opts = {}) => addDevice(browser, srv.base, cloud, name, { width: vp.w, height: vp.h }, vp.touch, db || seed(), opts);
const tapEl = (d, vp, sel, o) => (vp.touch ? d.page.locator(sel).first().tap(o) : d.page.locator(sel).first().click(o));
const noErr = (d, tag) => check(d.errors.length === 0, `${tag} no page errors`, d.errors.slice(0, 2).join(' · '));
const mkP = (d, name, par, ty) => on(d, ([n, p, t]) => { const id = jebAddPocket(n, '✶', '#CFE8FF', p || null); if (t) jebEditPocket(id, { ztype: t }); jebRefresh(); return id; }, [name, par, ty]);
const addItems = (d, pid, n, extra = {}) => on(d, ([p, k, x]) => { for (let i = 0; i < k; i++) jebEditItem(jebAddItem(p, 'item ' + i), x); jebRefresh(); }, [pid, n, extra]);
const setLayout = (d, k) => on(d, (v) => { DB.theme.zabPhoneLayout = v; jebRefresh(); }, k);
const layout = (d) => on(d, () => (DB.theme && DB.theme.zabPhoneLayout) || null);
const panelName = (d) => on(d, () => { const b = document.querySelector('#jeb-panel.on .jeb-pt b'); return b ? b.textContent : ''; });
const pathText = (d) => on(d, () => { const e = document.querySelector('#jeb-panel .jx-path'); return !e || e.hidden ? '' : e.textContent.replace(/\s+/g, ' ').trim(); });
const kidsText = (d) => on(d, () => { const e = document.querySelector('#jeb-panel .jx-kids'); return !e || e.hidden ? [] : [...e.querySelectorAll('.jx-kid')].map((k) => k.querySelector('.jx-nm').textContent + ' ' + k.querySelector('.jeb-ct').textContent); });
const modalOpen = (d) => d.page.waitForSelector('#ov.on #mb', { timeout: 3000 });
const fillCreate = async (d, vp, name) => { await modalOpen(d); await sleep(150); await d.page.fill('#jeb-f-name', name); await tapEl(d, vp, '#jeb-f-ok'); await sleep(450); };
const wait = async (fn, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await sleep(400); } return false; };
const longPressAt = async (d, x, y, ms = 700) => {
  d.tcdp = d.tcdp || await d.ctx.newCDPSession(d.page);
  await d.tcdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await sleep(ms);
  await d.tcdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
};
const longPress = async (d, sel) => { const b = await d.page.locator(sel).first().boundingBox(); await longPressAt(d, b.x + b.width / 2, b.y + b.height / 2); await sleep(250); };
const openLay = async (d, vp, cls) => { await tapEl(d, vp, '#zab-btn'); await d.page.waitForSelector('#zab-lay.on ' + cls, { timeout: 3000 }); await sleep(350); };
const layGone = (d) => on(d, () => !document.getElementById('zab-lay'));
const btnRect = (d) => on(d, () => { const b = document.getElementById('zab-btn'); if (!b) return null; const r = b.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; });
/* every visible position:fixed element that overlaps the button (full-screen panes and sheets are not "controls") */
const overlaps = (d) => on(d, () => {
  const b = document.getElementById('zab-btn'); if (!b) return ['no button'];
  const br = b.getBoundingClientRect(), out = [];
  for (const e of document.body.querySelectorAll('*')) {
    if (e === b || b.contains(e) || e.contains(b)) continue;
    const cs = getComputedStyle(e); if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    if (r.width >= innerWidth * 0.9 && r.height >= innerHeight * 0.9) continue;
    if (r.left < br.right - 1 && r.right > br.left + 1 && r.top < br.bottom - 1 && r.bottom > br.top + 1) out.push((e.id || e.className || e.tagName) + '');
  }
  return out;
});
const showRead = (d) => on(d, () => { selArt('a1'); document.getElementById('p3').classList.add('mob-open'); });

try {
  /* ══ 77a — the button ══ */
  if (want('77a')) {
    for (const vp of [P360, P390]) {
      const d = await dev(makeCloud(), 'a' + vp.name, vp); const t = `77a@${vp.name}`;
      try {
        const T = await mkP(d, 'Tree'); await addItems(d, T, 2); await addItems(d, 'jp-idea', 3); await addItems(d, 'jp-idea', 1, { done: true }); await sleep(300);
        const g = await on(d, () => { const b = document.getElementById('zab-btn'), r = b && b.getBoundingClientRect(), cs = b && getComputedStyle(b); return { has: !!b, w: r && Math.round(r.width), h: r && Math.round(r.height), right: r && Math.round(innerWidth - r.right), bottom: r && Math.round(innerHeight - r.bottom), bar: !!document.getElementById('jeb-bar'), on: document.documentElement.classList.contains('jeb-on'), btnCls: document.documentElement.classList.contains('zab-btn'), jh: getComputedStyle(document.getElementById('p2')).getPropertyValue('--jeb-h'), title: b && b.title, aria: b && b.getAttribute('aria-label'), glyph: b && b.firstElementChild.textContent, bg: cs && cs.backgroundColor, ink: cs && cs.color, z: cs && cs.zIndex, shape: cs && cs.borderRadius }; });
        check(g.has && g.w === 52 && g.h === 52 && g.right >= 10 && g.bottom >= 10, `${t} the corner button is there: 52 px round, ${g.right}px from the right edge and ${g.bottom}px from the bottom`, JSON.stringify(g));
        /* v05.32 (Z10): --jeb-h is the room the fixed bottom things leave, so with the scrolling titles band (on by default, 44 px on a phone) it is the BAND's 44, never the bar's 56; it is 0 without the band */
        check(!g.bar && !g.on && g.btnCls && (g.jh === '0px' || g.jh === '44px'), `${t} the bar is not drawn and --jeb-h is 0, or only the titles band's 44 px (${g.jh})`, JSON.stringify(g));
        const L = 'Zab: your pockets (press and hold to change the layout)';
        check(g.title === L && g.aria === L && g.glyph === '▤', `${t} its title and aria-label read "${L}"; the glyph is the text glyph ▤`, JSON.stringify(g));
        check(+g.z === 142, `${t} z-index 142 (below Attach 9150, menus 9200, modals 10000)`, String(g.z));
        let ov = await overlaps(d);
        check(ov.length === 0, `${t} on the notes list it overlaps no other fixed control`, ov.join());
        /* v05.18 (Architect review) — the folder screen: the sidebar's bottom row (New Note · Recent · MyWall · Folders) is not
           position:fixed, so the check above never saw it; the button hid "Folders". Every visible control in the sidebar now. */
        await on(d, () => { showPane('sb'); }); await sleep(300);
        const sbo = await on(d, () => { const b = document.getElementById('zab-btn').getBoundingClientRect(), hit = [];
          document.querySelectorAll('#sb button, #sb a, #sb input, #sb [role="button"], #sb [onclick]').forEach((e) => { const r = e.getBoundingClientRect(); if (!r.width || !r.height || getComputedStyle(e).visibility === 'hidden') return;
            if (r.left < b.right - 1 && r.right > b.left + 1 && r.top < b.bottom - 1 && r.bottom > b.top + 1) hit.push((e.textContent || e.title || e.tagName).trim().slice(0, 24)); });
          const tb = document.getElementById('sb-toolbar').getBoundingClientRect(); return { hit, gap: Math.round(tb.top - b.bottom), right: Math.round(innerWidth - b.right) }; });
        check(sbo.hit.length === 0 && sbo.gap >= 4 && sbo.right >= 10, `${t} on the folder screen it covers no control of the sidebar: it sits ${sbo.gap}px above the New Note · Recent · MyWall · Folders row`, JSON.stringify(sbo));
        await openLay(d, vp, '.zl-rail');
        const rl = await on(d, () => { const r = document.querySelector('#zab-lay .zl-rail').getBoundingClientRect(), b = document.getElementById('zab-btn').getBoundingClientRect(); return { railBottom: Math.round(r.bottom), btnTop: Math.round(b.top) }; });
        check(rl.railBottom <= rl.btnTop, `${t} ...and the Rail's bubbles rise from above the button there (${rl.railBottom} <= ${rl.btnTop})`, JSON.stringify(rl));
        await tapEl(d, vp, '#zab-btn'); await sleep(250);
        await on(d, () => { showPane('p2'); }); await sleep(300);
        const back = await on(d, () => { const b = document.getElementById('zab-btn'); const tk = document.getElementById('zab-tk'); return { inline: b.style.bottom, bottom: Math.round(innerHeight - b.getBoundingClientRect().bottom), band: tk ? Math.round(tk.getBoundingClientRect().height) : 0 }; });   /* v05.32: back in the corner = just above the titles band when it shows */
        check(back.inline === '' && back.bottom >= 10 && back.bottom <= 40 + (back.band || 0), `${t} ...on the notes list it is back in the corner (${back.bottom}px from the bottom)`, JSON.stringify(back));
        await on(d, () => toast('A longer message that fills most of the width of the screen'));
        await sleep(200); ov = await overlaps(d);
        const tt = await on(d, () => { const e = document.querySelector('.toast'), b = document.getElementById('zab-btn'); return e ? { bot: Math.round(e.getBoundingClientRect().bottom), btop: Math.round(b.getBoundingClientRect().top) } : null; });
        check(ov.length === 0 && tt && tt.bot <= tt.btop, `${t} a toast is lifted above the button (toast bottom ${tt && tt.bot} <= button top ${tt && tt.btop})`, ov.join() + JSON.stringify(tt));
        await sleep(3500);
        await showRead(d); await sleep(500); ov = await overlaps(d);
        check(ov.length === 0, `${t} reading a note (its contents button, its bars) overlaps nothing`, ov.join());
        await on(d, () => startEdit()); await sleep(500); ov = await overlaps(d);
        check(ov.length === 0, `${t} editing a note overlaps nothing`, ov.join());
        await on(d, () => { try { cancelEdit(); } catch (e) {} document.getElementById('p3').classList.remove('mob-open'); });
        await on(d, ([p]) => jebOpenPanel(p), [T]); await sleep(400);
        ov = await overlaps(d);
        const up = await on(d, () => { const b = document.getElementById('zab-btn').getBoundingClientRect(), p = document.getElementById('jeb-panel').getBoundingClientRect(); return { btnBottom: Math.round(b.bottom), panelTop: Math.round(p.top), up: document.getElementById('zab-btn').classList.contains('up') }; });
        check(ov.length === 0 && up.up && up.btnBottom <= up.panelTop, `${t} with a panel open the button rides above its top edge, so it can still close it (${up.btnBottom} <= ${up.panelTop})`, ov.join() + JSON.stringify(up));
        await tapEl(d, vp, '#zab-btn'); await sleep(350);
        check(!(await on(d, () => document.getElementById('jeb-panel').classList.contains('on'))) && !(await on(d, () => document.getElementById('zab-btn').classList.contains('up'))), `${t} tapping the button with a panel open closes the panel and the button drops back`);
        /* the badge: the same number as "All pockets" */
        await openLay(d, vp, '.zl-rail');
        const nb = await on(d, () => ({ badge: document.querySelector('#zab-btn .zb-n').textContent, all: document.querySelector('.zl-rail [data-zact="all"] .zb-n').textContent, red: document.querySelector('#zab-btn .zb-n').classList.contains('jt-red'), vis: !document.querySelector('#zab-btn .zb-n').hidden, api: (DB.jeb || []).filter((i) => !i.done).length }));
        check(nb.vis && nb.badge === nb.all && +nb.badge === nb.api && nb.badge === '5' && !nb.red, `${t} the badge (${nb.badge}) equals "All pockets" (${nb.all}) and the open items (${nb.api}); not red`, JSON.stringify(nb));
        await tapEl(d, vp, '#zab-btn'); await sleep(250);
        const ti = await on(d, () => { const i = jebAddItem('jp-task', 'late one'); jebEditItem(i, { due: '2000-01-01' }); jebRefresh(); return i; });
        await sleep(300);
        const rd = await on(d, () => ({ red: document.querySelector('#zab-btn .zb-n').classList.contains('jt-red'), n: document.querySelector('#zab-btn .zb-n').textContent }));
        check(rd.red && rd.n === '6', `${t} the badge goes red (and counts 6) with an overdue task`, JSON.stringify(rd));
        await on(d, (i) => { jebToggleDone(i); jebRefresh(); }, ti); await sleep(300);
        check(!(await on(d, () => document.querySelector('#zab-btn .zb-n').classList.contains('jt-red'))), `${t} ...and is plain again once it is ticked off`);
        /* the keyboard: a real focus in a field outside Zab */
        await on(d, () => { const i = [...document.querySelectorAll('#sb input')].find((x) => x.offsetParent && /^(text|search)?$/.test(x.type)); (i || document.body).focus(); });
        await sleep(200);
        const hid = await on(d, () => ({ disp: getComputedStyle(document.getElementById('zab-btn')).display, kb: document.documentElement.classList.contains('jeb-kb'), tag: document.activeElement.tagName }));
        check(hid.kb && hid.disp === 'none', `${t} the button hides while the keyboard is up for a field outside Zab (html.jeb-kb)`, JSON.stringify(hid));
        await on(d, () => document.activeElement.blur()); await sleep(700);
        check((await on(d, () => getComputedStyle(document.getElementById('zab-btn')).display)) === 'flex', `${t} ...and comes back after it`);
        noErr(d, t);
      } finally { await d.ctx.close(); }
    }
    for (const vp of [T820, D1440]) {
      const d = await dev(makeCloud(), 'a' + vp.name, vp); const t = `77a@${vp.name}`;
      try {
        await addItems(d, 'jp-idea', 3); await setLayout(d, 'drawer'); await sleep(300);
        const g = await on(d, () => { const bar = document.getElementById('jeb-bar'), r = bar && bar.getBoundingClientRect(); return { btn: !!document.getElementById('zab-btn'), lay: !!document.getElementById('zab-lay'), bar: !!bar, bh: r && Math.round(r.height), bb: r && Math.round(innerHeight - r.bottom), on: document.documentElement.classList.contains('jeb-on'), zb: document.documentElement.classList.contains('zab-btn'), jh: getComputedStyle(document.getElementById('p2')).getPropertyValue('--jeb-h'), all: bar && bar.querySelector('.jeb-all .jeb-ct').textContent, chips: bar && [...bar.querySelectorAll('.jeb-chip[data-pid] .jeb-nm')].map((e) => e.textContent).join() }; });
        check(!g.btn && !g.lay && !g.zb, `${t} the corner button is never drawn (even with the phone layout set to Drawer)`, JSON.stringify(g));
        check(g.bar && g.on && g.bh === 56 && g.bb === 0 && (vp.w >= 1200 || g.jh === '56px' || g.jh === '90px') && g.all === '3' && /Quick tasks,Ideas,Links to read,Shopping/.test(g.chips), `${t} the N1 bar is exactly as before: 56 px tall at the bottom, ${g.chips}, All pockets ${g.all}`, JSON.stringify(g));
        noErr(d, t);
      } finally { await d.ctx.close(); }
    }
  }

  /* ══ 77b — each layout ══ */
  if (want('77b')) {
    const cases = [
      ['rail', '.zl-rail'], ['drawer', '.zl-dr'], ['cols', '.zl-cols'],
    ];
    for (const [L, cls] of cases) {
      const vp = P390, d = await dev(makeCloud(), 'b' + L, vp); const t = `77b-${L}@${vp.name}`;
      try {
        const T = await mkP(d, 'Tree'), L1 = await mkP(d, 'L1', T), L2 = await mkP(d, 'L2', L1), L3 = await mkP(d, 'L3', L2);
        await setLayout(d, L); await sleep(300);
        await openLay(d, vp, cls);
        const shown = await on(d, () => { const l = document.getElementById('zab-lay'); return { n: l.querySelectorAll('[data-pid]').length, txt: l.textContent.replace(/\s+/g, ' ').slice(0, 160) }; });
        check(shown.n >= 5, `${t} the layout opens from the button and lists the top-level pockets (${shown.n})`, JSON.stringify(shown));
        const geo = await on(d, () => { const l = document.querySelector('#zab-lay > :not(.zl-bd)'), r = l.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), vw: innerWidth, vh: innerHeight }; });
        check(geo.l >= 0 && geo.r <= geo.vw + 1 && geo.t >= 0 && geo.b <= geo.vh + 1, `${t} it sits inside the screen (${JSON.stringify(geo)})`);
        if (L === 'drawer') check(geo.r - geo.l <= 360 && geo.r - geo.l >= 0.8 * 390 - 4 && geo.r - geo.l <= 0.86 * 390, `${t} the drawer is about 85% of the width, never over 360 px (${geo.r - geo.l}px)`);
        /* to the 4th level */
        if (L === 'rail') {
          await tapEl(d, vp, `.zl-rail .zr-b[data-pid="${T}"]`); await d.page.waitForSelector('#jeb-panel.on'); await sleep(350);
          for (const k of [L1, L2, L3]) { await tapEl(d, vp, `#jeb-panel .jx-kid[data-pid="${k}"]`); await sleep(350); }
        } else if (L === 'drawer') {
          for (const k of [T, L1, L2]) await tapEl(d, vp, `#zab-lay .zd-row[data-pid="${k}"] .zd-fold`);
          const ind = await on(d, (ids) => ids.map((i) => parseInt(document.querySelector(`#zab-lay .zd-row[data-pid="${i}"]`).style.paddingLeft, 10)), [T, L1, L2, L3]);
          check(ind[0] < ind[1] && ind[1] < ind[2] && ind[2] < ind[3], `${t} unfolding ▸ shows the pockets inside, indented by depth (${ind.join(' < ')})`);
          await tapEl(d, vp, `#zab-lay .zd-row[data-pid="${L3}"] .zd-nm`); await d.page.waitForSelector('#jeb-panel.on'); await sleep(350);
        } else {
          await tapEl(d, vp, `#zab-lay .zc-row[data-pid="${T}"] .zc-nm`); await sleep(250);
          const two = await on(d, () => ({ cols: document.querySelectorAll('#zab-lay .zc-col').length, hd: document.querySelector('#zab-lay .zc-col:last-child .zc-hd').textContent.trim(), back: !!document.querySelector('#zab-lay [data-zact="back"]') }));
          check(two.cols === 2 && /^Its items \(0\)$/.test(two.hd) && two.back, `${t} a pocket that holds pockets opens a second column headed "Its items (n)", with ‹ in the left one (${JSON.stringify(two)})`);
          for (const k of [L1, L2]) { await tapEl(d, vp, `#zab-lay .zc-row[data-pid="${k}"] .zc-nm`); await sleep(250); }
          const shift = await on(d, (ids) => ({ cols: document.querySelectorAll('#zab-lay .zc-col').length, left: [...document.querySelectorAll('#zab-lay .zc-col:first-child .zc-row')].map((r) => r.dataset.pid).join(), sel: (document.querySelector('#zab-lay .zc-col:first-child .zc-row.on') || {}).dataset.pid, right: [...document.querySelectorAll('#zab-lay .zc-col:last-child .zc-row')].map((r) => r.dataset.pid).join(), back: document.querySelector('#zab-lay [data-zact="back"]').textContent.trim() }), 0);
          check(shift.cols === 2 && shift.left === L2 && shift.sel === L2 && shift.right === L3 && /L1/.test(shift.back), `${t} going deeper shifts the columns along: the parent (L2) is on the left, its pockets (L3) on the right, ‹ names the level above (${JSON.stringify(shift)})`);
          await tapEl(d, vp, `#zab-lay .zc-row[data-pid="${L3}"] .zc-nm`); await d.page.waitForSelector('#jeb-panel.on'); await sleep(350);
        }
        check((await panelName(d)) === 'L3' && (await pathText(d)) === 'Tree › L1 › L2 › L3' && (await layGone(d)), `${t} the 4th level opens in the one #jeb-panel with its path line; the layout closed (${await panelName(d)} / ${await pathText(d)})`);
        await tapEl(d, vp, '#jeb-add-in'); await d.page.keyboard.type('fourth level ' + L); await d.page.keyboard.press('Enter'); await sleep(450);
        check((await on(d, (p) => jebItems(p).map((i) => i.text).join('|'), L3)) === 'fourth level ' + L, `${t} typing in the panel's add box adds the item to L3`);
        await tapEl(d, vp, '#zab-btn'); await sleep(400);
        check(!(await on(d, () => document.getElementById('jeb-panel').classList.contains('on'))), `${t} the button closes the panel`);
        /* reopen: counts all the way up */
        await tapEl(d, vp, '#zab-btn'); await d.page.waitForSelector('#zab-lay.on ' + cls); await sleep(350);
        if (L === 'rail') {
          const n1 = await on(d, (p) => document.querySelector(`.zl-rail .zr-b[data-pid="${p}"] .zb-n`).textContent, T);
          await tapEl(d, vp, `.zl-rail .zr-b[data-pid="${T}"]`); await sleep(350);
          const chain = [await kidsText(d)];
          for (const k of [L1, L2]) { await tapEl(d, vp, `#jeb-panel .jx-kid[data-pid="${k}"]`); await sleep(350); chain.push(await kidsText(d)); }
          await tapEl(d, vp, `#jeb-panel .jx-kid[data-pid="${L3}"]`); await sleep(350);
          check(n1 === '1' && chain.join('|') === 'L1 1|L2 1|L3 1', `${t} reopened: Tree's bubble says 1, and the chips say L1 1, L2 1, L3 1 all the way down (${n1} ${chain.join('|')})`);
        } else if (L === 'drawer') {
          const cs = await on(d, (ids) => ids.map((i) => document.querySelector(`#zab-lay .zd-row[data-pid="${i}"] .zd-ct`).textContent), [T, L1, L2, L3]);
          check(cs.join() === '1,1,1,1', `${t} reopened (still unfolded this session): Tree, L1, L2, L3 each count 1 (${cs.join()})`);
          await tapEl(d, vp, `#zab-lay .zd-row[data-pid="${L3}"] .zd-nm`); await sleep(350);
        } else {
          const read = () => on(d, () => [...document.querySelectorAll('#zab-lay .zc-row')].map((r) => r.querySelector('.zn').textContent + ' ' + r.querySelector('.zd-ct').textContent).join(','));
          const seen = [await read()];
          await tapEl(d, vp, '#zab-lay [data-zact="back"]'); await sleep(200); seen.push(await read());
          await tapEl(d, vp, '#zab-lay [data-zact="back"]'); await sleep(200); seen.push(await read());
          await tapEl(d, vp, '#zab-lay [data-zact="back"]'); await sleep(200); seen.push(await read());
          const top = seen[3];
          check(/L2 1,L3 1/.test(seen[0]) && /L1 1,L2 1/.test(seen[1]) && /Tree 1,L1 1/.test(seen[2]) && /Tree 1/.test(top), `${t} reopened: ‹ walks up and every level counts 1 (${seen.join(' / ')})`);
          check(/All pockets/.test(await on(d, () => document.querySelector('#zab-lay .zc-hd').textContent)), `${t} at the top the left header is "▤ All pockets" (no ‹)`);
          for (const k of [T, L1, L2]) { await tapEl(d, vp, `#zab-lay .zc-row[data-pid="${k}"] .zc-nm`); await sleep(220); }
          await tapEl(d, vp, `#zab-lay .zc-row[data-pid="${L3}"] .zc-nm`); await sleep(350);
        }
        check((await panelName(d)) === 'L3' && (await on(d, () => [...document.querySelectorAll('#jeb-panel .jeb-list .jeb-tx')].map((e) => e.textContent).join('|'))) === 'fourth level ' + L, `${t} L3's panel shows the item added before`);
        await tapEl(d, vp, '#zab-btn'); await sleep(350);
        /* long-press a pocket: its menu; Rename from it */
        await tapEl(d, vp, '#zab-btn'); await d.page.waitForSelector('#zab-lay.on ' + cls); await sleep(350);
        const lpSel = L === 'rail' ? `.zl-rail .zr-b[data-pid="${T}"] .zr-c` : L === 'drawer' ? `#zab-lay .zd-row[data-pid="${T}"] .zd-nm` : `#zab-lay .zc-row[data-pid]`;
        const lpPid = L === 'cols' ? await on(d, () => document.querySelector('#zab-lay .zc-row[data-pid]').dataset.pid) : T;
        await longPress(d, lpSel);
        const mr = await on(d, () => { const m = document.getElementById('jeb-menu'); if (!m) return null; const r = m.getBoundingClientRect(); return { rows: [...m.querySelectorAll('.jm')].map((e) => e.textContent), in: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight }; });
        check(mr && ['Rename', 'Move into…', 'Pocket kind', 'Delete pocket'].every((w) => mr.rows.some((r) => r.includes(w))) && mr.in, `${t} a long-press on a pocket opens the existing pocket menu, inside the screen (${mr && mr.rows.join(' / ')})`, JSON.stringify(mr));
        await tapEl(d, vp, '#jeb-menu .jm:has-text("Rename")'); await modalOpen(d); await sleep(150);
        await d.page.fill('#jeb-f-name', 'Renamed ' + L); await tapEl(d, vp, '#jeb-f-ok'); await sleep(450);
        const rn = await on(d, ([p]) => ({ name: DB.jebPockets.find((x) => x.id === p).name, shown: document.getElementById('zab-lay') ? document.getElementById('zab-lay').textContent.includes('Renamed') : false }), [lpPid]);
        check(rn.name === 'Renamed ' + L && rn.shown, `${t} Rename from that menu works and the open layout shows the new name`, JSON.stringify(rn));
        /* All pockets */
        if (L === 'cols') { for (let k = 0; k < 4; k++) { if (await on(d, () => !!document.querySelector('#zab-lay [data-zact="back"]'))) { await tapEl(d, vp, '#zab-lay [data-zact="back"]'); await sleep(150); } } }
        if (!(await on(d, () => !!document.getElementById('zab-lay')))) { await tapEl(d, vp, '#zab-btn'); await d.page.waitForSelector('#zab-lay.on ' + cls); await sleep(300); }
        await tapEl(d, vp, '#zab-lay [data-zact="all"]'); await d.page.waitForSelector('#jeb-panel.on'); await sleep(450);
        const heads = await on(d, () => [...document.querySelectorAll('#jeb-panel .jeb-gh b')].map((e) => e.textContent));
        check(heads.length >= 8 && (await layGone(d)), `${t} "▤ All pockets" opens the grouped panel (${heads.length} groups) and closes the layout`);
        await tapEl(d, vp, '#zab-btn'); await sleep(350);
        /* ＋ */
        await tapEl(d, vp, '#zab-btn'); await d.page.waitForSelector('#zab-lay.on ' + cls); await sleep(300);
        await tapEl(d, vp, '#zab-lay [data-zact="new"]'); await fillCreate(d, vp, 'Fresh ' + L);
        const fr = await on(d, () => ({ top: DB.jebPockets.some((p) => /^Fresh /.test(p.name) && !p.parentId), shown: document.getElementById('zab-lay') ? document.getElementById('zab-lay').textContent.includes('Fresh') : false }));
        check(fr.top && fr.shown, `${t} "＋ New pocket" makes a top-level pocket, and the layout shows it at once`, JSON.stringify(fr));
        noErr(d, t);
      } finally { await d.ctx.close(); }
    }
  }

  /* ══ 77c — choosing ══ */
  if (want('77c')) {
    {
      const vp = P360, d = await dev(makeCloud(), 'c360', vp); const t = '77c@360';
      try {
        await mkP(d, 'Tree');
        const lpBtn = async () => { await longPress(d, '#zab-btn'); await d.page.waitForSelector('#zab-card', { timeout: 3000 }); await sleep(250); };
        await lpBtn();
        const c = await on(d, () => { const e = document.getElementById('zab-card'), r = e.getBoundingClientRect(), b = document.getElementById('zab-btn').getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), vw: innerWidth, vh: innerHeight, btop: Math.round(b.top), rows: [...e.querySelectorAll('.zc-r')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()), hs: [...e.querySelectorAll('.zc-r')].map((x) => Math.round(x.getBoundingClientRect().height)), more: e.querySelector('.zc-more').textContent, z: getComputedStyle(e).zIndex, open: !!document.getElementById('zab-lay') }; });
        check(c.l >= 8 && c.r <= c.vw - 8 && c.t >= 8 && c.b <= c.vh - 8, `${t} a long-press (700 ms, real touch) opens the card, measured inside the screen (${c.l}–${c.r} × ${c.t}–${c.b} of ${c.vw}×${c.vh})`, JSON.stringify(c));
        check(c.b <= c.btop, `${t} ...anchored above the button (card bottom ${c.b} <= button top ${c.btop})`);
        check(c.rows.join(' / ') === '☑ Rail · bubbles up the right edge / ☐ Drawer · a list, ▸ opens the pockets inside / ☐ Columns · the pockets inside in a second column' && c.more === 'More in 🧰 → 🎨 Appearance', `${t} it holds the three rows with tick boxes and the Appearance line`, JSON.stringify(c.rows));
        check(c.hs.every((h) => h >= 40) && !c.open && +c.z === 143, `${t} every row is >= 40 px tall (${c.hs.join('/')}); the long-press did not also open the layout; z 143`);
        await d.page.mouse.click(30, 60); await sleep(250);
        check(!(await on(d, () => !!document.getElementById('zab-card'))), `${t} a tap outside closes the card`);
        for (const [k, cls, word] of [['drawer', '.zl-dr', 'Drawer'], ['cols', '.zl-cols', 'Columns'], ['rail', '.zl-rail', 'Rail']]) {
          await lpBtn();
          await tapEl(d, vp, `#zab-card .zc-r[data-k="${k}"]`); await sleep(300);
          check((await layout(d)) === k && !(await on(d, () => !!document.getElementById('zab-card'))), `${t} tapping "${word}" switches at once (setting ${await layout(d)}) and closes the card`);
          await openLay(d, vp, cls);
          check(true, `${t} ...and the button now opens the ${word}`);
          await tapEl(d, vp, '#zab-btn'); await sleep(250);
        }
        const wrote = await on(d, () => ({ ph: DB.jeb.length, pk: DB.jebPockets.length }));
        check(wrote.ph === 0, `${t} switching layouts wrote no item (and only the setting changed)`);
        noErr(d, t);
      } finally { await d.ctx.close(); }
    }
    {
      const vp = P390, d = await dev(makeCloud(), 'c390', vp); const t = '77c@390';
      try {
        await d.page.locator('#zab-btn').click({ button: 'right' }); await d.page.waitForSelector('#zab-card', { timeout: 3000 });
        check(true, `${t} a right-click on the button opens the same card`);
        await d.page.keyboard.press('Escape'); await sleep(200);
        check(!(await on(d, () => !!document.getElementById('zab-card'))), `${t} Escape closes it`);
        /* Appearance, through 🧰 → 🎨 Appearance */
        const appearance = async () => { await tapEl(d, vp, '#sb-tools-btn'); await sleep(250); await tapEl(d, vp, '.sb-mi:has-text("Appearance")'); await d.page.waitForSelector('#th-zpl', { timeout: 3000 }); await sleep(250); };
        await appearance();
        const ap = await on(d, () => { const s = document.getElementById('th-zpl'); return { txt: s.textContent.replace(/\s+/g, ' '), vals: [...s.querySelectorAll('input[type=radio]')].map((r) => r.value + (r.checked ? '*' : '')).join() }; });
        check(ap.vals === 'rail*,drawer,cols,bar' && /Bar along the bottom \(as before\)/.test(ap.txt) && /applies to phones/.test(ap.txt), `${t} 🎨 Appearance has "Zab on the phone" with Rail ticked, and says it applies to phones (${ap.vals})`, ap.txt);
        await tapEl(d, vp, '#th-zpl label:has(input[value="drawer"])'); await sleep(400);
        check((await layout(d)) === 'drawer', `${t} choosing Drawer in Appearance sets the layout`);
        await tapEl(d, vp, '#th-zpl label:has(input[value="bar"])'); await sleep(500);
        await on(d, () => closeTheme());
        const bar = await on(d, () => { const b = document.getElementById('jeb-bar'), r = b && b.getBoundingClientRect(); return { btn: !!document.getElementById('zab-btn'), bar: !!b, h: r && Math.round(r.height), bot: r && Math.round(innerHeight - r.bottom), on: document.documentElement.classList.contains('jeb-on'), jh: getComputedStyle(document.getElementById('p2')).getPropertyValue('--jeb-h'), pb: Math.round(innerHeight - document.getElementById('p2').getBoundingClientRect().bottom), chips: [...document.querySelectorAll('#jeb-bar .jeb-chip .jeb-nm')].map((e) => e.textContent).join() }; });
        check(!bar.btn && bar.bar && bar.h === 56 && bar.bot === 0 && bar.on && bar.jh === '56px' && bar.pb === 56, `${t} "Bar along the bottom (as before)" gives back the N1 bar exactly: no button, 56 px bar, panes end above it (--jeb-h ${bar.jh})`, JSON.stringify(bar));
        await tapEl(d, vp, '#jeb-bar .jeb-chip[data-pid="jp-idea"] .jeb-main'); await d.page.waitForSelector('#jeb-panel.on'); await sleep(350);
        const sheet = await on(d, () => { const r = document.getElementById('jeb-panel').getBoundingClientRect(); return Math.round(innerHeight - r.bottom); });
        check(sheet === 56, `${t} ...and a panel opened from it sits above the bar as before (${sheet}px)`);
        await on(d, () => jebClosePanel());
        await appearance(); await tapEl(d, vp, '#th-zpl label:has(input[value="cols"])'); await sleep(500); await on(d, () => closeTheme());
        check(!!(await btnRect(d)) && !(await on(d, () => !!document.getElementById('jeb-bar'))) && (await layout(d)) === 'cols', `${t} ...and back to Columns brings the button and removes the bar again`);
        noErr(d, t);
      } finally { await d.ctx.close(); }
    }
    {
      /* from a laptop: set it at 1440, then the same device narrowed to a phone shows it */
      const vp = D1440, d = await dev(makeCloud(), 'c1440', vp); const t = '77c@1440';
      try {
        await tapEl(d, vp, '#sb-tools-btn'); await sleep(250); await tapEl(d, vp, '.sb-mi:has-text("Appearance")'); await d.page.waitForSelector('#th-zpl'); await sleep(250);
        const note = await on(d, () => document.getElementById('th-zpl').textContent);
        check(/applies to phones/.test(note), `${t} the "Zab on the phone" choice is shown at 1440 with a line saying it applies to phones`);
        await tapEl(d, vp, '#th-zpl label:has(input[value="cols"])'); await sleep(400);
        const nowL = await layout(d);
        check(nowL === 'cols' && !(await btnRect(d)) && !!(await on(d, () => document.getElementById('jeb-bar'))), `${t} choosing Columns at 1440 stores it; the laptop still has its bar and no button`);
        await on(d, () => closeTheme());
        await d.page.setViewportSize({ width: 390, height: 844 }); await sleep(700);
        await openLay(d, D1440, '.zl-cols');   /* a mouse context, narrowed: clicks */
        check(true, `${t} ...and the same notebook narrowed to a phone opens Columns`);
      } finally { await d.ctx.close(); }
    }
    {
      /* a second device through the fake cloud, both ways */
      const cloud = makeCloud(), db = () => seed();
      const A = await dev(cloud, 'A', P390, db()), B = await dev(cloud, 'B', D1440, db());
      const flush = (x) => on(x, () => { jebRefresh(); persist(); flushPendingPush(); });
      try {
        await sleep(1500);
        await on(A, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.content += '<p>x</p>'; a.updatedAt = new Date().toISOString(); persist(); flushPendingPush(); });
        await sleep(800); await quiet(cloud, A); await quiet(cloud, B);
        await longPress(A, '#zab-btn'); await A.page.waitForSelector('#zab-card'); await tapEl(A, P390, '#zab-card .zc-r[data-k="cols"]'); await sleep(300);
        await flush(A); await quiet(cloud, A);
        check(await wait(async () => (await layout(B)) === 'cols'), '77c the layout chosen on the phone (Columns) reaches the laptop through the cloud', 'B: ' + (await layout(B)));
        await tapEl(B, D1440, '#sb-tools-btn'); await sleep(250); await tapEl(B, D1440, '.sb-mi:has-text("Appearance")'); await B.page.waitForSelector('#th-zpl'); await sleep(250);
        const ticked = await on(B, () => document.querySelector('#th-zpl input:checked').value);
        check(ticked === 'cols', `77c ...and the laptop's Appearance shows it ticked (${ticked})`);
        await tapEl(B, D1440, '#th-zpl label:has(input[value="drawer"])'); await sleep(300); await on(B, () => closeTheme());
        await flush(B); await quiet(cloud, B);
        check(await wait(async () => (await layout(A)) === 'drawer'), '77c a choice made on the laptop (Drawer) reaches the phone', 'A: ' + (await layout(A)));
        await tapEl(A, P390, '#zab-btn'); await A.page.waitForSelector('#zab-lay.on .zl-dr', { timeout: 4000 }).then(() => check(true, '77c ...and the phone opens a Drawer'), () => check(false, '77c ...and the phone opens a Drawer', 'no drawer'));
        check(A.errors.length + B.errors.length === 0, '77c no page errors', [...A.errors, ...B.errors].slice(0, 2).join(' · '));
      } finally { await A.ctx.close(); await B.ctx.close(); }
    }
  }

  /* ══ 77d — calm ══ */
  if (want('77d')) {
    const vp = P390, d = await dev(makeCloud(), 'd390', vp); const t = '77d@390';
    try {
      await on(d, () => {
        const art = DB.articles.find((a) => a.id === 'a1');
        art.content = '<h1>One</h1>' + Array.from({ length: 160 }, (_, i) => '<p>Paragraph ' + i + ' of a long note that goes on and on.</p>').join('');
        art.updatedAt = new Date().toISOString();
        const at = new Date().toISOString();
        for (let i = 0; i < 70; i++) DB.articles.push({ id: 'ln' + i, title: 'List note ' + i, content: '<p>x</p>', folderIds: ['f1'], tags: [], createdAt: at, updatedAt: at, kind: 'general' });
        persist(); render();
      });
      await sleep(600);
      const snap = () => on(d, () => { const out = []; for (const root of ['sb', 'p2', 'p3']) document.querySelectorAll('#' + root + ', #' + root + ' *').forEach((e) => { const r = e.getBoundingClientRect(); if (r.width <= 0 || r.height <= 0) return; const cs = getComputedStyle(e); if (cs.visibility === 'hidden') return; out.push((e.id || e.className || e.tagName) + '@' + [r.left, r.top, r.width, r.height].map((v) => Math.round(v * 10) / 10).join(',')); }); return out; });
      const screens = [['the folders screen', () => on(d, () => { document.getElementById('p2').classList.remove('mob-open'); document.getElementById('p3').classList.remove('mob-open'); })],
        ['the note list', () => on(d, () => { selFolder('f1'); document.getElementById('p2').classList.add('mob-open'); })],
        ['a read note', () => on(d, () => { selArt('a1'); document.getElementById('p3').classList.add('mob-open'); })]];
      for (const [name, go] of screens) {
        await go(); await sleep(700);
        await on(d, () => { DB.theme.jebBar = true; jebRefresh(); }); await sleep(300);
        const withBtn = await snap(), btnThere = !!(await btnRect(d));
        await on(d, () => { DB.theme.jebBar = false; jebRefresh(); }); await sleep(300);
        const without = await snap(), btnGone = !(await btnRect(d));
        const diff = []; for (let i = 0; i < Math.max(withBtn.length, without.length); i++) if (withBtn[i] !== without[i]) diff.push(`${withBtn[i]} <> ${without[i]}`);
        check(btnThere && btnGone && withBtn.length === without.length && diff.length === 0, `${t} ${name}: ${withBtn.length} visible elements are exactly where they are with Zab off (button aside)`, diff.slice(0, 3).join(' | '));
        await on(d, () => { DB.theme.jebBar = true; jebRefresh(); });
      }
      const clear = (sel) => on(d, (s) => { const b = document.getElementById('zab-btn').getBoundingClientRect(), last = document.querySelector(s); const r = last.getBoundingClientRect(); return { lastBottom: Math.round(r.bottom), btnTop: Math.round(b.top), overlapsX: r.right > b.left }; }, sel);
      const toEnd = () => on(d, () => { for (const id of ['p2c', 'p3c', 'ed', 'p3']) { const e = document.getElementById(id); if (e) e.scrollTop = 1e7; } window.scrollTo(0, 1e7); });
      await on(d, () => { selFolder('f1'); document.getElementById('p2').classList.add('mob-open'); }); await sleep(500); await toEnd(); await sleep(200);
      let c = await clear('#p2c > :last-child');
      check(c.lastBottom <= c.btnTop, `${t} scrolled to the end, the last line of the note list is clear of the button (bottom ${c.lastBottom} <= ${c.btnTop})`, JSON.stringify(c));
      await on(d, () => { selArt('a1'); document.getElementById('p3').classList.add('mob-open'); }); await sleep(700); await toEnd(); await sleep(200);
      c = await clear('.avw p:last-of-type, .av-body p:last-of-type, #p3c p:last-of-type');
      check(c.lastBottom <= c.btnTop, `${t} the last line of a long note being read is clear of the button (${c.lastBottom} <= ${c.btnTop})`, JSON.stringify(c));
      await on(d, () => startEdit()); await sleep(700); await toEnd(); await sleep(200);
      await on(d, () => document.documentElement.classList.remove('jeb-kb'));   /* the keyboard hid the button while typing; it is back once the keyboard is down */
      c = await clear('#ed > p:last-of-type');
      check(c.lastBottom <= c.btnTop, `${t} the last line of a long note being edited is clear of the button (${c.lastBottom} <= ${c.btnTop})`, JSON.stringify(c));
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }

  /* ══ 77e — addresses in items ══ */
  if (want('77e')) {
    for (const vp of [P390, D1440]) {
      const d = await dev(makeCloud(), 'e' + vp.name, vp); const t = `77e@${vp.name}`;
      try {
        await d.ctx.route('**example.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>x</title>ok' }));
        const PL = await mkP(d, 'Plain');
        const kinds = [['plain', PL], ['tasks', 'jp-task'], ['ideas', 'jp-idea'], ['shop', 'jp-shop']];
        for (const [kind, pid] of kinds) {
          const iid = await on(d, (p) => { const i = jebAddItem(p, 'read https://example.com/page?x=1 later'); jebRefresh(); jebOpenPanel(p); return i; }, pid);
          await sleep(450);
          const a = await on(d, (i) => { const e = document.querySelector(`#jeb-panel .jeb-it[data-iid="${i}"] a.jeb-lnk`); return e ? { href: e.getAttribute('href'), target: e.target, rel: e.rel, text: e.textContent, h: Math.round(e.getBoundingClientRect().height), tx: e.closest('.jeb-tx').textContent } : null; }, iid);
          check(a && a.href === 'https://example.com/page?x=1' && a.target === '_blank' && /noopener/.test(a.rel) && a.tx === 'read https://example.com/page?x=1 later', `${t} ${kind}: the address in the item is a link (new tab, noopener) and the text around it is unchanged`, JSON.stringify(a));
          const popup = d.page.waitForEvent('popup', { timeout: 4000 }).catch(() => null);
          await tapEl(d, vp, `#jeb-panel .jeb-it[data-iid="${iid}"] a.jeb-lnk`);
          const pp = await popup;
          check(!!pp && /example\.com\/page\?x=1/.test(pp.url()), `${t} ${kind}: tapping it opens the address in a new tab (${pp && pp.url()})`);
          if (pp) await pp.close().catch(() => {});
          check((await on(d, () => _jebEditId)) === null, `${t} ${kind}: ...and did not start editing the item`);
          await tapEl(d, vp, `#jeb-panel .jeb-it[data-iid="${iid}"] .jeb-tx`, { position: { x: 4, y: 4 } }); await sleep(300);
          check((await on(d, () => _jebEditId)) === iid, `${t} ${kind}: a tap on the rest of the item still edits it`);
          await d.page.keyboard.press('Escape'); await sleep(200);
          await on(d, () => { jebClosePanel(); });
        }
        const L = await on(d, () => { const i = jebAddItem('jp-link', 'https://example.com/clip'); jebRefresh(); jebOpenPanel('jp-link'); return i; }); await sleep(450);
        check(!(await on(d, () => !!document.querySelector('#jeb-panel a.jeb-lnk'))), `${t} a links pocket keeps its own rows (no inline link added)`);
        noErr(d, t);
      } finally { await d.ctx.close(); }
    }
  }

  /* ══ 77f — scale ══ */
  if (want('77f')) {
    const vp = P390;
    const db = () => seed((s) => {
      const ps = [], items = [];
      for (let i = 0; i < 50; i++) {
        const parent = i < 5 ? (i === 0 ? null : 'p' + (i - 1)) : (i % 7 === 0 ? null : 'p' + (i % 5));
        ps.push({ id: 'p' + i, name: 'Pocket ' + i, icon: '✶', color: '#CFE8FF', order: i, createdAt: T0, updatedAt: T0, ...(parent ? { parentId: parent } : {}) });
      }
      for (let k = 0; k < 300; k++) items.push(mk('i' + k, 'p' + (k % 50), 'Item ' + k + ' with a fairly long line of text to wrap on a phone', Math.floor(k / 50), k % 5 === 0 ? { done: true } : {}));
      s.jebPockets = ps; s.jeb = items;
    });
    const d = await dev(makeCloud(), 'f390', vp, db());
    try {
      const shape = await on(d, () => ({ n: DB.jebPockets.length, depth: Math.max(...DB.jebPockets.map((p) => jebPath(p.id).length)), items: DB.jeb.length }));
      check(shape.n === 50 && shape.depth >= 5 && shape.items === 300, `77f the scale notebook: ${shape.n} pockets over ${shape.depth} levels, ${shape.items} items`, JSON.stringify(shape));
      const cdp = await d.ctx.newCDPSession(d.page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const res = {};
      for (const L of ['rail', 'drawer', 'cols']) {
        res[L] = [];
        for (let k = 0; k < 4; k++) {
          res[L].push(await d.page.evaluate((L) => new Promise((done) => {
            DB.theme.zabPhoneLayout = L; jebRefresh(); _zabClose();
            if (L === 'drawer') _zabUnfold = new Set(DB.jebPockets.map((p) => p.id)); if (L === 'cols') _zabPath = ['p0', 'p1', 'p2', 'p3'];
            setTimeout(() => { _jebTreeC = null; const t0 = performance.now(); _zabOpenLay(); requestAnimationFrame(() => requestAnimationFrame(() => { const ms = Math.round(performance.now() - t0); _zabClose(); done(ms); })); }, 250);
          }), L));
        }
      }
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      console.log('N2-SCALE ' + JSON.stringify(res));
      const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
      for (const L of ['rail', 'drawer', 'cols']) check(med(res[L]) <= 300, `77f ${L} (50 pockets over 5 levels, 300 items) opens in <= 300 ms at 390, CPU x4, median of 4 (${res[L].join(' / ')} ms; median ${med(res[L])})`, JSON.stringify(res[L]));
      noErr(d, '77f');
    } finally { await d.ctx.close(); }
    {
      const d2 = await dev(makeCloud(), 'f9000', vp);
      try {
        const info = await d2.page.evaluate((N) => {
          const s = 'The quick brown fox jumps over the lazy dog. ', t0 = Date.now() - 5e6;
          for (let i = 0; i < N; i++) { const at = new Date(t0 + i * 500).toISOString(); DB.articles.push({ id: 'n' + i, title: 'Note ' + i, content: '<p>' + s.repeat(110) + i + '</p>', folderIds: ['f1'], tags: [], createdAt: at, updatedAt: at, kind: 'general' }); }
          persist(); render();
          return { notes: DB.articles.length, elements: document.getElementsByTagName('*').length };
        }, NOTES);
        await sleep(2500);
        const cdp = await d2.ctx.newCDPSession(d2.page);
        await cdp.send('Performance.enable'); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        const met = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
        const cost = async (fn) => { const a = await met(); await d2.page.evaluate(fn); const b = await met(); return Math.round((b.RecalcStyleDuration - a.RecalcStyleDuration + b.LayoutDuration - a.LayoutDuration) * 1000); };
        const openClose = [], kb = [];
        for (let i = 0; i < 4; i++) {
          openClose.push(await cost(() => new Promise((r) => { _zabOpenLay(); requestAnimationFrame(() => requestAnimationFrame(() => { _zabClose(); requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 50))); })); })));
          kb.push(await cost(() => new Promise((r) => { const h = document.documentElement; h.classList.add('jeb-kb'); requestAnimationFrame(() => requestAnimationFrame(() => { h.classList.remove('jeb-kb'); requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 50))); })); })));
        }
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
        console.log('N2-9000 ' + JSON.stringify({ info, openClose, kb }));
        check(info.notes >= NOTES && openClose.every((c) => c <= 50), `77f ${info.notes} notes (${info.elements} elements), phone x4: opening and closing a layout costs <= 50 ms of style and layout each time (${openClose.join(' / ')} ms)`, JSON.stringify(openClose));
        check(kb.every((c) => c <= 50), `77f ...and hiding/showing the button with the keyboard costs <= 50 ms (${kb.join(' / ')} ms)`, JSON.stringify(kb));
        noErr(d2, '77f-9000');
      } finally { await d2.ctx.close(); }
    }
  }

  /* ══ 77g — contrast ══ */
  if (want('77g')) {
    const vp = P390, d = await dev(makeCloud(), 'g390', vp); const t = '77g@390';
    try {
      const T = await mkP(d, 'Tree'), L1 = await mkP(d, 'L1', T); await mkP(d, 'L2', L1); await addItems(d, T, 2);
      const ti = await on(d, () => { const i = jebAddItem('jp-task', 'late one'); jebEditItem(i, { due: '2000-01-01' }); jebRefresh(); return i; });
      void ti;
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
      const presets = ['forest', 'ocean', 'amber', 'indigo', 'rose'];
      const sets = [
        ['rail', '#zab-btn > span, #zab-btn .zb-n, .zr-lb, .zr-c, .zr-c .zb-n', 12],
        ['drawer', '.zd-act, .zd-nm .zn, .zd-nm .zs, .zd-ct, .zd-fold', 8],
        ['cols', '.zc-hd button, .zc-nm .zn, .zc-nm .zs, .zd-ct, .zd-act', 8],
      ];
      for (const [L, sel, min] of sets) {
        await on(d, ([k, a, b]) => { DB.theme.zabPhoneLayout = k; jebRefresh(); _zabClose(); if (k === 'drawer') _zabUnfold = new Set([a, b]); if (k === 'cols') _zabPath = [a]; _zabOpenLay(); }, [L, T, L1]);
        await sleep(450);
        for (const p of presets) {
          await on(d, (k) => { applyPreset(k); }, p); await sleep(150);
          const m = await measure(sel);
          check(m.n >= min && m.worst >= 4.5, `${t} ${L}: the button, labels, names, counts and marks (${m.n} pieces) clear 4.5:1 on ${p} (worst ${m.worst}, ${m.who})`, JSON.stringify(m));
        }
        await on(d, () => { applyPreset('forest'); _zabClose(); });
      }
      await on(d, () => { DB.theme.zabPhoneLayout = 'rail'; jebRefresh(); }); await longPress(d, '#zab-btn'); await d.page.waitForSelector('#zab-card');
      for (const p of presets) {
        await on(d, (k) => { applyPreset(k); }, p); await sleep(150);
        const m = await measure('#zab-card .zc-r, #zab-card .zc-r span, #zab-card b, #zab-card .zc-more');
        check(m.n >= 4 && m.worst >= 4.5, `${t} the layout card (${m.n} pieces) clears 4.5:1 on ${p} (worst ${m.worst}, ${m.who})`, JSON.stringify(m));
      }
      await on(d, () => { applyPreset('forest'); _zabCardClose(); const i = jebAddItem(DB.jebPockets.find((p) => p.name === 'Tree').id, 'see https://example.com/a'); jebRefresh(); jebOpenPanel(DB.jebPockets.find((p) => p.name === 'Tree').id); }); await sleep(450);
      for (const p of presets) {
        await on(d, (k) => { applyPreset(k); }, p); await sleep(150);
        const m = await measure('#jeb-panel a.jeb-lnk');
        check(m.n >= 1 && m.worst >= 4.5, `${t} an address inside an item (${m.n}) clears 4.5:1 on ${p} (worst ${m.worst})`, JSON.stringify(m));
      }
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }

  /* ══ 77h — reduced motion ══ */
  if (want('77h')) {
    const vp = P390, d = await dev(makeCloud(), 'h390', vp); const t = '77h@390';
    try {
      await mkP(d, 'Tree');
      const anims = () => on(d, () => document.getAnimations().filter((a) => { const e = a.effect && a.effect.target; return e && e.closest && e.closest('#zab-lay,#zab-card,#zab-btn'); }).length);
      const run = async (L) => {
        await setLayout(d, L);
        await on(d, () => _zabClose());
        await tapEl(d, vp, '#zab-btn'); const n = await anims(); await sleep(150); const n2 = await anims();
        await tapEl(d, vp, '#zab-btn'); await sleep(250);
        return [n, n2];
      };
      await d.page.emulateMedia({ reducedMotion: 'no-preference' });
      const motion = {}; for (const L of ['rail', 'drawer', 'cols']) motion[L] = await run(L);
      check(Object.values(motion).every((m) => m[0] > 0), `${t} without the preference, opening each layout does animate (${JSON.stringify(motion)}) - so this check can fail`);
      await d.page.emulateMedia({ reducedMotion: 'reduce' });
      const still = {}; for (const L of ['rail', 'drawer', 'cols']) still[L] = await run(L);
      check(Object.values(still).every((m) => m[0] === 0 && m[1] === 0), `${t} under prefers-reduced-motion no animation runs in the button or any layout (${JSON.stringify(still)})`);
      await longPress(d, '#zab-btn'); await d.page.waitForSelector('#zab-card');
      check((await anims()) === 0, `${t} ...nor on the layout card`);
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }
} catch (e) {
  console.log(' FAIL  zab-n2 threw: ' + (e && e.stack || e));
  results.push({ ok: false, label: 'threw' });
} finally {
  await browser.close();
  await srv.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
