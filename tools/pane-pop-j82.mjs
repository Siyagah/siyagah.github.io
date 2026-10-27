#!/usr/bin/env node
/* tools/pane-pop-j82.mjs — v05.52, J82: the owner (27 Oct): "Enable a pop-up buttons for both sidepane and middle pane and moveable/ resizeable
   from all sides and corners. Enable full-width/ resizeable of all panes while on the dock as well." Checks 112a–112j, real clicks/taps/drags at
   390 (touch) / 820 (touch) / 1440 (mouse):
   112a the side pane's 🪟 button (beside the search box) and 🧰 → 🪟 Side pane open the menu with "Pop out the side pane as a window"; the header is no taller than on v05.51;
   112b popped out: the pane floats inside the screen, with its bar and the 8 edge/corner handles (a phone: a full-width sheet, edges hidden);
   112c dragging its bar moves it (a phone: up and down only);
   112d dragging an edge and a corner resizes it (a phone: the top edge);
   112e a reload keeps it popped out, in the same place and size;
   112f the note list pops out too, from "🪟 Pane" (both at once; the Zab bar starts at the left edge on the PC);
   112g "⇲ Dock" puts each back: no window left, the PC's panes side by side again;
   112h PC: the dividers drag past the old 540 / 520 px limits, keep the note pane ≥ 320 px, and the note list's width survives a reload;
   112i PC: "⤢ … full width" for the side pane, the note list and the note; ⤡ brings all back; a folder click leaves the side pane's full width;
   112j no page errors.
   `node tools/pane-pop-j82.mjs` */
import { openApp, report, touchDrag } from './harness.mjs';

const r = report('J82 — panes pop out and widen');
const errs = [];
const geo = (page, id) => page.evaluate((id) => { const e = document.getElementById(id); const rc = e.getBoundingClientRect(); return { pp: e.classList.contains('pp'), l: Math.round(rc.left), t: Math.round(rc.top), w: Math.round(rc.width), h: Math.round(rc.height), W: innerWidth, H: innerHeight, vis: rc.width > 0 && getComputedStyle(e).display !== 'none', bar: !!e.querySelector(':scope>.pp-bar'), hs: e.querySelectorAll(':scope>.rsz').length, hsVis: [...e.querySelectorAll(':scope>.rsz')].filter((x) => getComputedStyle(x).display !== 'none').length }; }, id);
const inside = (g) => g.l >= 0 && g.t >= 0 && g.l + g.w <= g.W + 1 && g.t + g.h <= g.H + 1;
for (const [w, h, touch] of [[390, 844, true], [820, 1180, true], [1440, 900, false]]) {
  const app = await openApp({ viewport: { width: w, height: h }, hasTouch: touch });
  const { page } = app;
  const tier = w < 640 ? 'phone' : w < 1200 ? 'tablet' : 'pc';
  const tap = async (sel) => { const l = page.locator(sel).first(); await l.scrollIntoViewIfNeeded(); if (touch) await l.tap(); else await l.click(); await page.waitForTimeout(250); };
  const drag = async (x0, y0, x1, y1) => {
    if (touch) await touchDrag(page, Array.from({ length: 9 }, (_, i) => ({ x: x0 + (x1 - x0) * i / 8, y: y0 + (y1 - y0) * i / 8 })));
    else { await page.mouse.move(x0, y0); await page.mouse.down(); await page.mouse.move(x1, y1, { steps: 8 }); await page.mouse.up(); }
    await page.waitForTimeout(200);
  };
  const center = (sel) => page.evaluate((sel) => { const e = document.querySelector(sel); const rc = e.getBoundingClientRect(); return { x: rc.left + rc.width / 2, y: rc.top + rc.height / 2 }; }, sel);
  const menuItems = () => page.evaluate(() => { const m = document.getElementById('ctx'); return getComputedStyle(m).display === 'none' ? [] : [...m.querySelectorAll('.ci')].map((x) => x.textContent.trim()); });
  const pick = async (re) => { const items = await menuItems(); const i = items.findIndex((t) => re.test(t)); if (i < 0) return false; await tap(`#ctx .ci:nth-child(${i + 1})`); return true; };
  try {
    if (tier !== 'pc') await page.evaluate(() => showPane('sb'));
    await page.waitForTimeout(300);
    /* 112a */
    /* the header stays one row (a phone reaches it through 🧰 → 🪟 Side pane; v05.51's header is 65 px high at 390) */
    const hh0 = { phone: 65, tablet: 63, pc: 84 }[tier] + 2;   /* the header's height on v05.51 at this size (measured 27 Oct) */
    const hd = await page.evaluate((hh0) => { const hd = document.querySelector('.sb-hd'), hh = Math.round(hd.getBoundingClientRect().height); const b = document.querySelector('.sb-pp-btn'), rc = b.getBoundingClientRect(); const hit = document.elementFromPoint(rc.left + rc.width / 2, rc.top + rc.height / 2); return { inView: rc.width > 0 && rc.left >= 0 && rc.right <= innerWidth, onTop: !!hit && (hit === b || b.contains(hit)), fits: hd.scrollWidth <= hd.clientWidth + 1 && hh <= hh0, hh, w: Math.round(rc.width), h: Math.round(rc.height) }; }, hh0);
    /* the 🧰 Tools menu reaches the same menu */
    await tap('[onclick*="toggleSBTools"]'); await tap('#sb-tools .sb-pp-mi');
    const viaTools = (await menuItems()).includes('🪟 Pop out the side pane as a window');
    await page.evaluate(() => hideCtx());
    await tap('.sb-pp-btn');
    const it1 = await menuItems();
    r.check(hd.inView && hd.onTop && hd.fits && viaTools && it1.includes('🪟 Pop out the side pane as a window'), `112a@${w} the side pane's 🪟 button (beside the search box) and 🧰 → 🪟 Side pane both open the menu with Pop out; the header is no taller than on v05.51`, JSON.stringify({ hd, viaTools, it1 }));
    /* 112b */
    await pick(/^🪟 Pop out/);
    const g1 = await geo(page, 'sb');
    const wantVis = tier === 'phone' ? 2 : 8;
    r.check(g1.pp && g1.vis && inside(g1) && g1.bar && g1.hs === 8 && g1.hsVis === wantVis && (tier !== 'phone' || (g1.l === 0 && g1.w === w)),
      `112b@${w} popped out: a window inside the screen with its bar and ${wantVis} working edge/corner handles${tier === 'phone' ? ' (a full-width sheet)' : ''}`, JSON.stringify(g1));
    /* 112c */
    const bc = await center('#sb>.pp-bar .pp-ttl');
    await drag(bc.x, bc.y, bc.x + 40, bc.y + 50);
    const g2 = await geo(page, 'sb');
    const movedOk = tier === 'phone' ? (g2.l === 0 && Math.abs(g2.t - g1.t - 50) <= 3) : (Math.abs(g2.t - g1.t - 50) <= 3 && Math.abs(g2.l - Math.min(g1.l + 40, g1.W - g1.w)) <= 3);
    r.check(movedOk && g2.w === g1.w && g2.h === g1.h, `112c@${w} dragging the bar moves the window${tier === 'phone' ? ' (up and down only)' : ''}`, JSON.stringify({ g1, g2 }));
    /* 112d */
    let g3;
    if (tier === 'phone') {
      const n = await center('#sb>.rsz-n'); await drag(n.x, n.y, n.x, n.y - 80); g3 = await geo(page, 'sb');
      r.check(Math.abs(g3.h - g2.h - 80) <= 3 && Math.abs(g3.t - (g2.t - 80)) <= 3 && g3.w === w, `112d@${w} the top edge makes the sheet taller`, JSON.stringify({ g2, g3 }));
    } else {
      const se = await center('#sb>.rsz-se'); await drag(se.x, se.y, se.x + 70, se.y - 60);
      const ww = await center('#sb>.rsz-w'); await drag(ww.x, ww.y, ww.x - 30, ww.y);
      g3 = await geo(page, 'sb');
      r.check(Math.abs(g3.w - (g2.w + 100)) <= 4 && Math.abs(g3.h - (g2.h - 60)) <= 4 && Math.abs(g3.l - (g2.l - 30)) <= 4, `112d@${w} a corner and a side edge resize it`, JSON.stringify({ g2, g3 }));
    }
    /* 112e */
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree')); await page.waitForTimeout(500);
    const g4 = await geo(page, 'sb');
    r.check(g4.pp && g4.bar && Math.abs(g4.l - g3.l) <= 2 && Math.abs(g4.t - g3.t) <= 2 && Math.abs(g4.w - g3.w) <= 2 && Math.abs(g4.h - g3.h) <= 2, `112e@${w} after a reload it is still popped out, same place and size`, JSON.stringify({ g3, g4 }));
    /* 112f */
    if (tier !== 'pc') await page.evaluate(() => showPane('p2'));
    await page.waitForTimeout(300);
    await tap('#p2 .p2-pp-btn');
    await pick(/^🪟 Pop out the note list/);
    const g5 = await geo(page, 'p2'), g5s = await geo(page, 'sb');
    const jebL = await page.evaluate(() => { const b = document.getElementById('jeb-bar'); return b ? Math.round(b.getBoundingClientRect().left) : 0; });
    r.check(g5.pp && g5.vis && inside(g5) && g5.bar && g5s.pp && (tier !== 'pc' || jebL === 0), `112f@${w} the note list pops out too, from "🪟 Pane" (both windows at once${tier === 'pc' ? '; the Zab bar starts at the left edge' : ''})`, JSON.stringify({ g5, jebL }));
    /* 112g */
    await tap('#p2>.pp-bar .pp-dock'); await tap('#sb>.pp-bar .pp-dock');
    const d = await page.evaluate(() => ({ left: document.querySelectorAll('.pp,.pp-bar').length, sb: Math.round(document.getElementById('sb').getBoundingClientRect().left), vars: document.getElementById('sb').style.getPropertyValue('--pp-l') }));
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('siyagah-pp-v1') || '{}'));
    r.check(d.left === 0 && d.vars === '' && stored.sb && stored.sb.on === false && stored.p2 && stored.p2.on === false && (tier !== 'pc' || d.sb === 0), `112g@${w} "⇲ Dock" puts both back in place`, JSON.stringify({ d, stored }));
    if (tier === 'pc') {
      /* 112h */
      const rs = await center('#rsz'); await drag(rs.x, 150, 760, 150);   /* y 150: clear of the ◀ tab at the divider's middle */
      const sbw = await page.evaluate(() => document.getElementById('sb').getBoundingClientRect().width);
      const rs2 = await center('#rsz'); await drag(rs2.x, 150, 250, 150);   /* the side pane back to 250, so the note list has room */
      const r2 = await center('#rsz2'); await drag(r2.x, 150, w - 200, 150);
      const pw = await page.evaluate(() => ({ p2: document.getElementById('p2').getBoundingClientRect().width, p3: document.getElementById('p3').getBoundingClientRect().width }));
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree')); await page.waitForTimeout(500);
      const p2r = await page.evaluate(() => document.getElementById('p2').getBoundingClientRect().width);
      r.check(sbw > 560 && pw.p2 > 600 && pw.p3 >= 319 && Math.abs(p2r - pw.p2) <= 2, `112h@${w} the dividers drag past the old limits (side pane ${Math.round(sbw)} px), the note pane keeps ≥ 320 px (${Math.round(pw.p3)}), the note list's ${Math.round(pw.p2)} px survives a reload (${Math.round(p2r)})`, JSON.stringify({ sbw, pw, p2r }));
      /* 112i */
      const vis = () => page.evaluate(() => ['sb', 'p2', 'p3'].map((id) => { const rc = document.getElementById(id).getBoundingClientRect(); return rc.width > 0 ? Math.round(rc.width) : 0; }));
      await tap('.sb-pp-btn'); await pick(/^⤢ The side pane full width/);
      const v1 = await vis(), back1 = await page.evaluate(() => !!document.getElementById('pw-back') && getComputedStyle(document.getElementById('pw-back')).display !== 'none');
      await page.locator('#tree .sec[data-sid] .sec-hd').first().click(); await page.waitForTimeout(300);
      await page.locator('#tree .tr-row:visible').first().click(); await page.waitForTimeout(300);
      const v2 = await vis();
      await tap('#p2 .p2-pp-btn'); await pick(/^⤢ The note list full width/);
      const v3 = await vis();
      await tap('#pw-back'); const v4 = await vis();
      await tap('#p2 .p2-pp-btn'); await pick(/^⤢ The note full width/);
      const v5 = await vis();
      await tap('#pw-back'); const v6 = await vis();
      r.check(v1[0] >= w - 2 && !v1[1] && !v1[2] && back1 && v2[1] > 0 && v3[1] >= w - 2 && !v3[0] && !v3[2] && v4.every((x) => x > 0) && v5[2] >= w - 2 && !v5[0] && !v5[1] && v6.every((x) => x > 0),
        `112i@${w} "⤢ full width" for the side pane, the note list and the note; ⤡ brings all back; a folder click leaves the side pane's full width`, JSON.stringify({ v1, back1, v2, v3, v4, v5, v6 }));
    }
    errs.push(...app.errors);
  } catch (e) { r.check(false, `112@${w} threw: ${String(e && e.message || e).split('\n')[0]}`); }
  finally { await app.close(); }
}
r.check(errs.length === 0, '112j no page errors', errs.slice(0, 3).join(' | '));
process.exit(r.finish() ? 1 : 0);
