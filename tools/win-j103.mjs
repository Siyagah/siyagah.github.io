#!/usr/bin/env node
/* tools/win-j103.mjs — v05.64 second pass, block 123. Real clicks / taps / long-presses / pointer drags at 390 (touch) / 820 (touch) / 1440 (mouse):
   123a  A1  a ⧉ on every folder row (side pane and window) opens that folder's window; on a phone it is visible and ≥ 48 px
   123b  A2  a search box in a folder window lists the notes of that folder's subtree; a hit opens the note
   123c  A3  a phone with two windows has a strip of chips along the top; a tap brings that window to the front
   123d  A4  "↺ Back to “MyDatabase”" only after a rename, and it restores the name (stamped)
   123e  A5  every section heading renames from its own menu: the owner's section, 📌 Smart Views, Tags, Note Types
   123f  B1  ⬆️ / ⬇️ move a section; both stamped; the order wins a merge from either side
   123g  B2  a section's 🗗 Pop out and the ⧉ on its heading open a folder window of its root folders (not the picker)
   123h  B3  all 8 handles of a folder window (and of a popped-out pane) resize by a real drag; a phone's sheet: height only, from the top edge;
             the corner grips are painted (pixel check); hit areas ≥ 22 px on touch; hover lights an edge
   123i  C   J104: ☑ Choose two Zabs → 🎞 Scroll → DB.theme.zabTicker {on, mode:'only', pids}; the band shows only their titles (bar, Rail, Drawer, Columns)
   123j  no page errors
   123k  (Architect's review) a float NOTE window's 💾 Save still saves — a second top-level _fwSave had replaced it
   `node tools/win-j103.mjs` */
import { inflateSync } from 'node:zlib';
import { openApp, report, seedDB } from './harness.mjs';

const r = report('J100/J101/J103/J104 — second pass of v05.64');
const now = new Date().toISOString();
const seed = () => {
  const db = seedDB(now);
  db.sections.push({ id: 'sec-2', name: 'Second Section', order: 1, updatedAt: now });
  db.folders.push({ id: 'f4', name: '(004) In second', parentId: null, order: 1, sectionId: 'sec-2', updatedAt: now });
  db.sections.push({ id: 'db-section', name: 'MyDatabase', order: 9999, updatedAt: now });
  db.folders.push({ id: 'mydb-root', name: '🗄 MyDatabase', parentId: null, order: 1, sectionId: 'db-section', updatedAt: now });
  db.articles[0].tags = ['seed', 'second'];
  db.jebPockets = [1, 2, 3].map((n, i) => ({ id: 'zp' + n, name: ['Alpha', 'Beta', 'Gamma'][i], icon: ['🅰', '🅱', '🅲'][i], color: '#cfd8c6', order: n, updatedAt: now }));
  db.jeb = [1, 2, 3].map((n, i) => ({ id: 'zi' + n, pocketId: 'zp' + n, text: ['alpha item', 'beta item', 'gamma item'][i], done: false, order: 1, updatedAt: now }));
  return db;
};
/* a tiny PNG reader (8-bit RGB/RGBA, not interlaced) for the grip pixel check */
const decodePng = (buf) => {
  let p = 8, w = 0, h = 0, bpp = 3; const idat = [];
  while (p < buf.length) { const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8); const d = buf.subarray(p + 8, p + 8 + len); if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); bpp = d[9] === 6 ? 4 : 3; } if (type === 'IDAT') idat.push(d); p += 12 + len; }
  const raw = inflateSync(Buffer.concat(idat)), stride = w * bpp, out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[y * stride + x - bpp] : 0, b = y ? out[(y - 1) * stride + x] : 0, c = x >= bpp && y ? out[(y - 1) * stride + x - bpp] : 0;
      let v = row[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1; else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[y * stride + x] = v & 255;
    }
  }
  return { w, h, bpp, px: (x, y) => [out[y * stride + x * bpp], out[y * stride + x * bpp + 1], out[y * stride + x * bpp + 2]] };
};
const winRect = (page, id) => page.evaluate((id) => { const e = [...document.querySelectorAll('.fwin')].find((x) => x.dataset.fwid === id); if (!e) return null; const c = e.getBoundingClientRect(); return { l: Math.round(c.left), t: Math.round(c.top), w: Math.round(c.width), h: Math.round(c.height), rows: [...e.querySelectorAll('[data-fid]')].map((x) => x.dataset.fid) }; }, id);

for (const [W, H, touch] of [[390, 844, true], [820, 1180, true], [1440, 900, false]]) {
  const tier = W < 640 ? 'phone' : W < 1200 ? 'tablet' : 'pc';
  const app = await openApp({ viewport: { width: W, height: H }, hasTouch: touch, db: seed() });
  const { page, ctx } = app;
  const cdp = touch ? await ctx.newCDPSession(page) : null;
  let held = false;
  const press = async (loc) => { if (touch) await loc.tap(); else await loc.click(); await page.waitForTimeout(250); };
  const menuAt = async (sel) => {
    await page.evaluate(() => { hideCtx(); document.getElementById('ctx').innerHTML = ''; });   /* a stale menu must never answer for this one */
    const el = page.locator(sel).first(); await el.scrollIntoViewIfNeeded();
    if (!touch) await el.click({ button: 'right', position: { x: 40, y: 8 } });
    else { const b = await el.boundingBox(); const x = b.x + 40, y = b.y + b.height / 2; await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await page.waitForTimeout(750); held = { x, y }; }
    await page.waitForTimeout(300);
  };
  const lift = async () => { if (held) { const p = held; held = false; await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x + 60, y: p.y + 60 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(200); } };
  const pick = async (re) => {
    const items = await page.evaluate(() => [...document.querySelectorAll('#ctx .ci')].map((x) => x.textContent.trim()));
    const i = items.findIndex((t) => re.test(t)); if (i < 0) { await lift(); return false; }
    if (touch) await page.evaluate((i) => document.querySelectorAll('#ctx .ci')[i].click(), i); else await page.locator('#ctx .ci').nth(i).click();
    await lift(); await page.waitForTimeout(300); return true;
  };
  const menuItems = () => page.evaluate(() => [...document.querySelectorAll('#ctx .ci')].map((x) => x.textContent.trim()));
  try {
    if (tier !== 'pc') await page.evaluate(() => showPane('sb'));
    await page.evaluate(() => { ST.secOpen['sec-1'] = true; ST.secOpen['sec-2'] = true; ST.dbOpen = true; renderTree(); });
    await page.waitForTimeout(300);

    /* 123a — A1 */
    const pop = page.locator('#tree .tr-row[data-fid="f1"] .tr-pop').first();
    const pb = await pop.boundingBox(); const op = await pop.evaluate((e) => +getComputedStyle(e).opacity);
    await press(pop);
    const A = await winRect(page, 'f1');
    const inWin = page.locator('.fwin[data-fwid="f1"] .tr-row[data-fid="f1a"] .tr-pop').first();
    await press(inWin);
    const B = await winRect(page, 'f1a');
    const tapOk = tier !== 'phone' || (pb && pb.width >= 47.5 && pb.height >= 47.5 && op > 0.5);
    r.check(!!A && !!B && tapOk && (!touch || op > 0.5), `123a@${W} a ⧉ on a side-pane row and on a window row opens that folder's window${tier === 'phone' ? '; ≥ 48 px and visible without hover' : touch ? '; visible without hover' : ''}`, JSON.stringify({ A, B, pb, op }));

    /* 123b — A2 */
    await page.evaluate(() => { _fwClose('f1a'); _fwTuck(false); });
    await page.locator('.fwin[data-fwid="f1"] .fwin-q').fill('second');
    await page.waitForTimeout(300);
    const hits = await page.evaluate(() => [...document.querySelectorAll('.fwin[data-fwid="f1"] .fwin-hit')].map((e) => e.textContent));
    await page.locator('.fwin[data-fwid="f1"] .fwin-q').fill('archived');
    await page.waitForTimeout(250);
    const hits2 = await page.evaluate(() => document.querySelectorAll('.fwin[data-fwid="f1"] .fwin-hit').length);
    await page.locator('.fwin[data-fwid="f1"] .fwin-q').fill('second');
    await page.waitForTimeout(250);
    await press(page.locator('.fwin[data-fwid="f1"] .fwin-hit').first());
    const cur = await page.evaluate(() => ST.article || null);
    r.check(hits.length === 1 && /Seeded note two/.test(hits[0]) && hits2 === 0 && !!cur, `123b@${W} the window's search lists the notes of that folder's subtree only (f1 → "Seeded note two", not the note in another folder); a hit opens the note`, JSON.stringify({ hits, hits2, cur }));

    /* 123c — A3 */
    await page.evaluate(() => { _fwTuck(false); _fwCtxFrom = null; openFolderWin('f1'); openFolderWin('f1a'); });
    await page.waitForTimeout(300);
    const strip = await page.evaluate(() => { const s = document.getElementById('fw-strip'); return s ? { vis: getComputedStyle(s).display !== 'none', chips: [...s.querySelectorAll('.fw-chip')].map((c) => c.dataset.fwid), on: (s.querySelector('.fw-chip.on') || {}).dataset && s.querySelector('.fw-chip.on').dataset.fwid } : null; });
    if (tier === 'phone') {
      await press(page.locator('#fw-strip .fw-chip[data-fwid="f1"]'));
      const top = await page.evaluate(() => _fwWins[_fwWins.length - 1].id);
      const old = await page.evaluate(() => !!document.querySelector('.fwin-sw') && getComputedStyle(document.querySelector('.fwin-sw')).display !== 'none');
      r.check(strip && strip.vis && strip.chips.length >= 2 && top === 'f1' && !old, `123c@${W} a phone shows a strip of chips for the open windows; a tap brings that window to the front (no "◀ n more")`, JSON.stringify({ strip, top, old }));
    } else r.check(!strip || !strip.vis, `123c@${W} the chip strip is a phone's: none on a ${tier}`, JSON.stringify(strip));
    await page.evaluate(() => { _fwWins.slice().forEach((w) => _fwClose(w.id)); });

    /* 123d — A4 */
    await page.evaluate(() => { if (innerWidth < 1200) showPane('sb'); ST.dbOpen = true; renderTree(); });
    await menuAt('#tree .db-hd-sec');
    const m0 = await menuItems(); await pick(/Rename section/);
    await page.locator('#sri-db-section').fill('My Data'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    const t1 = await page.evaluate(() => DB.sections.find((s) => s.id === 'db-section').updatedAt);
    await menuAt('#tree .db-hd-sec');
    const m1 = await menuItems(); const got = await pick(/Back to .?MyDatabase/);
    const s2 = await page.evaluate(() => DB.sections.find((s) => s.id === 'db-section'));
    r.check(!m0.some((t) => /Back to/.test(t)) && m1.some((t) => /Back to/.test(t)) && got && s2.name === 'MyDatabase' && s2.updatedAt > t1, `123d@${W} "↺ Back to “MyDatabase”" appears only after a rename and restores the name, stamped`, JSON.stringify({ m0, m1, s2 }));

    /* 123e — A5 */
    const names = {};
    await menuAt('#tree .sec[data-sid="sec-1"] .sec-hd'); const g1 = await pick(/Rename section/);
    await page.locator('#sri-sec-1').fill('Mine Renamed'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    names.own = await page.evaluate(() => DB.sections.find((s) => s.id === 'sec-1').name);
    await page.evaluate(() => { ST.sfOpen = false; renderTree(); });
    await menuAt('#tree [data-smart-sec]'); const g2 = await pick(/Rename section/);
    await page.locator('#sri-sf').fill('Views Renamed'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    names.smart = await page.evaluate(() => DB.sfLabel);
    await menuAt('#tree [data-tag-sec]'); const g3 = await pick(/Rename section/);
    await page.locator('#sri-tag').fill('Tags Renamed'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    names.tags = await page.evaluate(() => DB.tagLabel);
    page.once('dialog', (d) => d.accept('Types Renamed'));
    await menuAt('#tree [oncontextmenu*="showNtiSectionMenu"]'); const g4 = await pick(/Rename/);
    await page.waitForTimeout(300);
    names.nti = await page.evaluate(() => DB.theme.ntiSectionLabel);
    r.check(g1 && g2 && g3 && g4 && names.own === 'Mine Renamed' && names.smart === 'Views Renamed' && names.tags === 'Tags Renamed' && names.nti === 'Types Renamed', `123e@${W} every section heading renames from its own menu (${touch ? 'long-press' : 'right-click'}): own section, Smart Views, Tags, Note Types`, JSON.stringify({ g1, g2, g3, g4, names }));

    /* 123f — B1 */
    const before = await page.evaluate(() => JSON.parse(JSON.stringify(DB)));
    await menuAt('#tree .sec[data-sid="sec-1"] .sec-hd'); const items = await menuItems();
    const upBefore = items.some((t) => /Move up/.test(t)), dnBefore = items.some((t) => /Move down/.test(t));
    const gotDn = await pick(/Move down/);
    const after = await page.evaluate(() => JSON.parse(JSON.stringify(DB)));
    const o = (db, id) => db.sections.find((s) => s.id === id);
    const stamped = ['sec-1', 'sec-2'].every((id) => o(after, id).updatedAt > o(before, id).updatedAt);
    const order = (db) => [...db.sections].filter((s) => /^sec-/.test(s.id)).sort((a, b) => a.order - b.order).map((s) => s.id).join(',');
    const mg = await page.evaluate(([b, a]) => [mergeDB(JSON.parse(JSON.stringify(b)), JSON.parse(JSON.stringify(a))), mergeDB(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)))].map((m) => [...m.sections].filter((s) => /^sec-/.test(s.id)).sort((x, y) => x.order - y.order).map((s) => s.id).join(',')), [before, after]);
    r.check(!upBefore && dnBefore && gotDn && order(before) === 'sec-1,sec-2' && order(after) === 'sec-2,sec-1' && stamped && mg[0] === 'sec-2,sec-1' && mg[1] === 'sec-2,sec-1', `123f@${W} ⬇️ Move down moves a section (the first has no ⬆️); both stamped; the order wins a merge from either side`, JSON.stringify({ items, ord: [order(before), order(after)], stamped, mg }));
    await menuAt('#tree .sec[data-sid="sec-1"] .sec-hd'); const gotUp = await pick(/Move up/);
    const back = await page.evaluate(() => [...DB.sections].filter((s) => /^sec-/.test(s.id)).sort((x, y) => x.order - y.order).map((s) => s.id).join(','));
    r.check(gotUp && back === 'sec-1,sec-2', `123f@${W} ⬆️ Move up puts it back`, back);
    /* 123g — B2 */
    await menuAt('#tree .sec[data-sid="sec-1"] .sec-hd'); const gotPop = await pick(/Pop out into window/);
    const S = await winRect(page, 'sec:sec-1');
    const picker = await page.evaluate(() => !!document.querySelector('#pk-overlay.on,#pkOverlay.on,.pk-popout.on'));
    await page.evaluate(() => { _fwClose('sec:sec-1'); });
    const hdPop = page.locator('#tree .sec[data-sid="sec-2"] .sec-pop').first();
    await hdPop.evaluate((e) => { e.closest('.sec-acts').style.opacity = 1; });
    await press(hdPop);
    const S2 = await winRect(page, 'sec:sec-2');
    r.check(gotPop && !!S && S.rows.includes('f1') && S.rows.includes('f2') && !S.rows.includes('f4') && !!S2 && S2.rows.includes('f4') && !picker, `123g@${W} a section's 🗗 Pop out and the ⧉ on its heading open a window of that section's root folders (not the picker)`, JSON.stringify({ S, S2, picker }));
    await page.evaluate(() => { _fwWins.slice().forEach((w) => _fwClose(w.id)); });
    /* 123f2 (Architect, review of v05.64): the last owner section offers no ⬇️, and a move never touches MyDatabase (db-section keeps
       order 9999 and its stamp), because several places take the FIRST section by order as the default home of a new folder or note. */
    const dbBefore = await page.evaluate(() => { const d = DB.sections.find((s) => s.id === 'db-section'); return { o: d.order, u: d.updatedAt || null }; });
    await menuAt('#tree .sec[data-sid="sec-2"] .sec-hd'); const lastItems = await menuItems();
    await page.evaluate(() => hideCtx());
    const past = await page.evaluate(() => moveSection('sec-2', 1));
    const dbAfter = await page.evaluate(() => { const d = DB.sections.find((s) => s.id === 'db-section'); return { o: d.order, u: d.updatedAt || null, first: [...DB.sections].sort((a, b) => a.order - b.order)[0].id }; });
    r.check(!lastItems.some((t) => /Move down/.test(t)) && past === false && dbAfter.o === 9999 && dbAfter.u === dbBefore.u && dbAfter.first !== 'db-section', `123f2@${W} the last own section has no ⬇️ and cannot move past MyDatabase; MyDatabase keeps order 9999 and its stamp`, JSON.stringify({ lastItems, past, dbBefore, dbAfter }));


    /* 123h — B3 */
    if (tier !== 'phone') {
      await page.evaluate(() => { _fwCtxFrom = null; openFolderWin('f1'); const w = _fwGet('f1'); w.l = 300; w.t = 200; w.w = 360; w.h = 400; _fwLayout(); });
      await page.waitForTimeout(200);
      const exp = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0], ne: [1, -1], nw: [-1, -1], se: [1, 1], sw: [-1, 1] };
      const res = {};
      for (const d of Object.keys(exp)) {
        await page.evaluate(() => { const w = _fwGet('f1'); w.l = 300; w.t = 200; w.w = 360; w.h = 400; _fwLayout(); });
        const b0 = await winRect(page, 'f1');
        const hb = await page.evaluate((d) => { const e = document.querySelector('.fwin[data-fwid="f1"] > .rsz-' + d); const c = e.getBoundingClientRect(); return { x: c.left + c.width / 2, y: c.top + c.height / 2, w: c.width, h: c.height }; }, d);
        await page.mouse.move(hb.x, hb.y); await page.mouse.down(); await page.mouse.move(hb.x + exp[d][0] * 30, hb.y + exp[d][1] * 30, { steps: 5 }); await page.mouse.up();
        const b1 = await winRect(page, 'f1');
        res[d] = { dw: b1.w - b0.w, dh: b1.h - b0.h, dl: b1.l - b0.l, dt: b1.t - b0.t, hit: [Math.round(hb.w), Math.round(hb.h)] };
      }
      const okDir = (d, x) => { const [sx, sy] = exp[d]; const wOk = sx === 0 ? x.dw === 0 : x.dw === 30 && x.dl === (sx < 0 ? -30 : 0); const hOk = sy === 0 ? x.dh === 0 : x.dh === 30 && x.dt === (sy < 0 ? -30 : 0); return wOk && hOk; };
      r.check(Object.keys(exp).every((d) => okDir(d, res[d])), `123h@${W} a real drag on each of the 8 handles of a folder window resizes it that way (and only that way)`, JSON.stringify(res));
      /* a popped-out pane (J82) uses the same engine */
      await page.evaluate(() => { _fwWins.slice().forEach((w) => _fwClose(w.id)); _ppSet('sb', true); const st = _ppState.sb; st.g = { l: .2, t: .2, w: .3, h: .5 }; _ppApply('sb'); });
      await page.waitForTimeout(200);
      const pb0 = await page.evaluate(() => { const c = document.getElementById('sb').getBoundingClientRect(); return { w: c.width, h: c.height }; });
      const ph = await page.evaluate(() => { const c = document.querySelector('#sb > .rsz-se').getBoundingClientRect(); return { x: c.left + c.width / 2, y: c.top + c.height / 2 }; });
      await page.mouse.move(ph.x, ph.y); await page.mouse.down(); await page.mouse.move(ph.x + 40, ph.y + 40, { steps: 5 }); await page.mouse.up();
      const pb1 = await page.evaluate(() => { const c = document.getElementById('sb').getBoundingClientRect(); return { w: c.width, h: c.height }; });
      r.check(Math.round(pb1.w - pb0.w) === 40 && Math.round(pb1.h - pb0.h) === 40, `123h@${W} the same engine resizes J82's popped-out pane (se corner +40/+40)`, JSON.stringify({ pb0, pb1 }));
      /* findable: hit areas, hover, painted grips */
      const geo = await page.evaluate(() => { const g = (s) => { const e = document.querySelector(s); const c = e.getBoundingClientRect(); return [Math.round(c.width), Math.round(c.height)]; }; return { pn: g('#sb > .rsz-n'), pe: g('#sb > .rsz-e'), pse: g('#sb > .rsz-se') }; });
      await page.mouse.move(ph.x + 40, ph.y + 40); const hov = await page.evaluate(() => getComputedStyle(document.querySelector('#sb > .rsz-se')).backgroundColor + '|' + getComputedStyle(document.querySelector('#sb > .rsz-se')).cursor);
      const cl = await page.evaluate(() => { const c = document.querySelector('#sb > .rsz-se').getBoundingClientRect(); return { x: Math.max(0, Math.round(c.left - 4)), y: Math.max(0, Math.round(c.top - 4)), width: Math.round(c.width + 8), height: Math.round(c.height + 8) }; });
      await page.mouse.move(5, 5); await page.waitForTimeout(150);
      const png = decodePng(await page.screenshot({ clip: cl }));
      let grey = 0; for (let y = 0; y < png.h; y++) for (let x = 0; x < png.w; x++) { const [R, G, B] = png.px(x, y); if (Math.abs(R - 128) < 30 && Math.abs(G - 128) < 30 && Math.abs(B - 128) < 30) grey++; }
      const hit22 = !touch || (Math.min(...geo.pn) >= 22 && Math.min(...geo.pe) >= 22);
      r.check(grey >= 12 && /nwse-resize/.test(hov) && hit22, `123h@${W} the handles can be found: the corner grip is painted (${grey} grey pixels), the resize cursor shows${touch ? ', edge hit areas ≥ 22 px' : ''}, hovering lights the corner`, JSON.stringify({ grey, hov, geo }));
      await page.evaluate(() => _ppSet('sb', false));
    } else {
      await page.evaluate(() => { _fwCtxFrom = null; openFolderWin('f1'); });
      await page.waitForTimeout(250);
      const g0 = await winRect(page, 'f1');
      const hn = await page.evaluate(() => { const e = document.querySelector('.fwin[data-fwid="f1"] > .rsz-n'); const c = e.getBoundingClientRect(); return { x: c.left + c.width / 2, y: c.top + c.height / 2, w: c.width, h: c.height, vis: getComputedStyle(e).display !== 'none' }; });
      const others = await page.evaluate(() => ['s', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map((d) => getComputedStyle(document.querySelector('.fwin[data-fwid="f1"] > .rsz-' + d)).display));
      /* the sheet starts at its tallest: pull the top edge DOWN 120 (shorter), then UP 40 (taller) */
      await page.mouse.move(hn.x, hn.y); await page.mouse.down(); await page.mouse.move(hn.x, hn.y + 120, { steps: 5 }); await page.mouse.up();
      const g1 = await winRect(page, 'f1');
      const hn2 = await page.evaluate(() => { const c = document.querySelector('.fwin[data-fwid="f1"] > .rsz-n').getBoundingClientRect(); return { x: c.left + c.width / 2, y: c.top + c.height / 2 }; });
      await page.mouse.move(hn2.x, hn2.y); await page.mouse.down(); await page.mouse.move(hn2.x, hn2.y - 40, { steps: 5 }); await page.mouse.up();
      const g2 = await winRect(page, 'f1');
      r.check(hn.vis && hn.h >= 22 && others.every((d) => d === 'none') && g0.h - g1.h === 120 && g2.h - g1.h === 40 && g1.w === g0.w && g2.w === g0.w && g2.l === 0 && g1.t + g1.h === g0.t + g0.h && g2.t + g2.h === g0.t + g0.h, `123h@${W} a phone's sheet resizes its HEIGHT only, from a ≥ 22 px top edge (down 120 shortened it, up 40 grew it; the foot, width and left never moved; no other handle)`, JSON.stringify({ g0, g1, g2, hn, others }));
      await page.evaluate(() => { _fwWins.slice().forEach((w) => _fwClose(w.id)); });
    }

    /* 123i — J104 */
    await page.evaluate(() => { const a = document.activeElement; if (a && a !== document.body) a.blur(); if (innerWidth < 1200) showPane('sb'); });   /* a field with the keyboard up hides the Zab button */
    await page.waitForTimeout(700);   /* the keyboard class is put away 300 ms after the field loses focus */
    const layouts = tier === 'phone' ? ['rail', 'drawer', 'cols'] : ['bar'];
    for (const L of layouts) {
      await page.evaluate((L) => { DB.theme.zabTicker = { on: false, mode: 'all', pids: [], skip: [] }; DB.theme.zabPhoneLayout = L; persist(); _zabBtnSig = ''; _jebBarSig = ''; jebRefresh(); }, L);
      await page.waitForTimeout(400);
      if (tier === 'phone') {
        const bs = await page.evaluate(() => { const b = document.getElementById('zab-btn'); const c = b && b.getBoundingClientRect(); const cs = b && getComputedStyle(b); return { cls: document.documentElement.className, display: cs && cs.display, vis: cs && cs.visibility, r: c && [Math.round(c.left), Math.round(c.top), Math.round(c.width), Math.round(c.height)], act: document.activeElement && document.activeElement.tagName + '.' + document.activeElement.className, layout: DB.theme.zabPhoneLayout }; });
        r.check(!!bs.r && bs.r[2] > 0, `123i@${W} ${L} the Zab button is on screen`, JSON.stringify(bs));
        await page.locator('#zab-btn').tap({ timeout: 5000 }); await page.waitForTimeout(400);
        await page.locator('#zab-lay [data-zact="choose"]').first().tap(); await page.waitForTimeout(300);
        for (const id of ['zp1', 'zp3']) { const row = page.locator(`#zab-lay [data-pid="${id}"]`).first(); await row.tap(); await page.waitForTimeout(250); }
        const dis0 = await page.evaluate(() => document.querySelector('#zab-lay [data-zact="go-scroll"]').disabled);
        await page.locator('#zab-lay [data-zact="go-scroll"]').tap();
      } else {
        await page.locator('#jeb-bar .jeb-choose').click(); await page.waitForTimeout(300);
        const d0 = await page.evaluate(() => document.querySelector('#jeb-bar .jeb-go[data-go="scroll"]').disabled);
        await page.locator('#jeb-bar .jeb-chip[data-pid="zp1"]').click(); await page.waitForTimeout(200);
        await page.locator('#jeb-bar .jeb-chip[data-pid="zp3"]').click(); await page.waitForTimeout(200);
        r.check(d0 === true, `123i@${W} 🎞 Scroll starts disabled like ▤/▦ (nothing chosen)`, String(d0));
        await touchOrClick(page, touch, '#jeb-bar .jeb-go[data-go="scroll"]');
      }
      await page.waitForTimeout(900);
      const out = await page.evaluate(() => ({ t: DB.theme.zabTicker, tx: [...document.querySelectorAll('#zab-tk .tk-it')].map((e) => e.textContent).join(' | '), toast: [...document.querySelectorAll('.toast')].map((t) => t.textContent).join(' | '), choose: _jebChoose || _zabChoose }));
      const t = out.t || {};
      r.check(t.on === true && t.mode === 'only' && JSON.stringify([...(t.pids || [])].sort()) === '["zp1","zp3"]' && /alpha item/.test(out.tx) && /gamma item/.test(out.tx) && !/beta item/.test(out.tx) && /Scrolling: Alpha, Gamma/.test(out.toast) && !out.choose,
        `123i@${W}${tier === 'phone' ? ' ' + L : ''} Choose Alpha + Gamma → 🎞 Scroll: zabTicker {on, only, [zp1,zp3]}, the band shows only their titles, toast, Choose ended`, JSON.stringify(out));
    }
    /* 123k (Architect, review of v05.64): the folder windows' first cut declared a second top-level `_fwSave`, which silently replaced
       the float NOTE window's save, so its 💾 Save did nothing. A real click on that button must save the typed text and toast. */
    await page.evaluate(() => { _fwWins.slice().forEach((w) => _fwClose(w.id)); hideCtx(); popOutNote('a1'); });
    await page.waitForTimeout(900);
    await page.locator('#fw-a1 .fw-ed').click(); await page.keyboard.press('End'); await page.keyboard.type(' typed123k');
    await page.evaluate(() => document.querySelectorAll('.toast').forEach((t) => t.remove()));
    const svBtn = page.locator('#fw-a1 [data-pf="save"]').filter({ visible: true }).first();
    await press(svBtn); await page.waitForTimeout(500);
    const k = await page.evaluate(() => ({ saved: /typed123k/.test(DB.articles.find((a) => a.id === 'a1').content), toast: [...document.querySelectorAll('.toast')].map((t) => t.textContent).join(' | '), noteSave: /_fwFlush/.test(String(_fwSave)) }));
    r.check(k.saved && /Saved/.test(k.toast) && k.noteSave, `123k@${W} a float note window's 💾 Save (real ${touch ? 'tap' : 'click'}) saves the typed text and says "💾 Saved"`, JSON.stringify(k));
    await page.evaluate(() => { try { closeAllPopouts(); } catch (e) {} });
    r.check(app.errors.length === 0, `123j@${W} no page errors`, app.errors.join(' | '));
  } catch (e) {
    r.check(false, `123@${W} the check ran to the end`, String(e && e.stack || e).slice(0, 700));
  }
  await app.close();
}
async function touchOrClick(page, touch, sel) { const loc = page.locator(sel).first(); if (touch) await loc.tap(); else await loc.click(); }
process.exit(r.finish() ? 1 : 0);
