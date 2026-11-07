#!/usr/bin/env node
/* tools/theme-fold-j124.mjs — v05.74, J124 (block 134). The owner (screenshot of 🎨 Appearance): "Enable all the sections here with
   on/off switch. (it's now long)". Every section of Appearance folds under its heading, which carries an on/off switch.
   At 390 / 820 / 1440, reached by a REAL tap/click on 🧰 → 🎨 Appearance:
   134a every section heading is a switch (button, aria-expanded=false, switch drawn) and every section starts closed;
   134b closed, the dialog is short: its content is no taller than the dialog box (nothing to scroll), where it was several screens before;
   134c a real tap opens one section (its controls visible, switch on), a second tap closes it;
   134d a setting changed inside an open section (Line spacing → Relaxed) is applied and the section is still open after the repaint;
   134e the heading is a 44 px tap target on phone and tablet, inside the dialog's width;
   134f ⚙ News settings (from the 📰 News view) opens Appearance with the News section open;
   134g no page errors. */
import { openApp, report, seedDB } from './harness.mjs';

const r = report('J124 — Appearance sections fold with an on/off switch');
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

for (const [w, h, touch] of [[390, 844, true], [820, 1180, true], [1440, 900, false]]) {
  const t = `@${w}`;
  const app = await openApp({ viewport: { width: w, height: h }, db: seedDB(), hasTouch: touch });
  const p = app.page;
  const act = async (loc) => (touch ? loc.tap() : loc.click());
  try {
    await p.evaluate(() => { if (innerWidth < 640) showPane('sb'); });
    await sleep(300);
    await act(p.locator('#sb-tools-btn')); await sleep(300);
    await act(p.locator('.sb-mi', { hasText: 'Appearance' }).first()); await sleep(400);
    const s = await p.evaluate(() => {
      const b = document.getElementById('theme-body'), box = document.querySelector('.theme-box');
      const secs = [...b.querySelectorAll(':scope > .theme-sect')];
      return { n: secs.length, folded: secs.filter((x) => x.classList.contains('th-f')).length,
        closed: secs.filter((x) => !x.classList.contains('th-open')).length,
        btns: secs.filter((x) => { const f = x.querySelector(':scope > button.th-fold'); return f && f.getAttribute('aria-expanded') === 'false' && f.querySelector('.th-sw'); }).length,
        hidden: secs.every((x) => { const bd = x.querySelector(':scope > .th-bd'); return bd && getComputedStyle(bd).display === 'none'; }),
        sh: box.scrollHeight, ch: box.clientHeight, vis: getComputedStyle(document.getElementById('theme-modal')).display !== 'none' };
    });
    r.check(s.vis && s.n >= 8 && s.folded === s.n && s.btns === s.n && s.closed === s.n && s.hidden, `134a${t} all ${s.n} sections are switches and start closed`, JSON.stringify(s));
    r.check(s.sh <= s.ch + 1, `134b${t} closed, the dialog needs no scrolling (${s.sh} <= ${s.ch})`, JSON.stringify(s));
    const hd = p.locator('#theme-body > .theme-sect', { hasText: 'Line spacing' }).locator(':scope > button.th-fold');
    const hb = await hd.boundingBox(), bx = await p.locator('.theme-box').boundingBox();
    r.check(!!hb && (w >= 1200 || hb.height >= 44) && hb.x >= bx.x - 1 && hb.x + hb.width <= bx.x + bx.width + 1, `134e${t} the heading is a ${hb ? Math.round(hb.height) : 0} px target inside the dialog`, JSON.stringify({ hb, bx }));
    await act(hd); await sleep(250);
    const o1 = await p.evaluate(() => { const sec = [...document.querySelectorAll('#theme-body > .theme-sect')].find((x) => /Line spacing/.test(x.textContent));
      const btn = sec.querySelector('.ls-btn'); const q = btn.getBoundingClientRect();
      return { open: sec.classList.contains('th-open'), exp: sec.querySelector('.th-fold').getAttribute('aria-expanded'), btnH: q.height, others: document.querySelectorAll('#theme-body > .th-open').length }; });
    r.check(o1.open && o1.exp === 'true' && o1.btnH > 0 && o1.others === 1, `134c${t} a tap opens Line spacing (its buttons show), the others stay closed`, JSON.stringify(o1));
    await act(p.locator('#theme-body .ls-btn', { hasText: 'Relaxed' }).first()); await sleep(300);
    const o2 = await p.evaluate(() => { const sec = [...document.querySelectorAll('#theme-body > .theme-sect')].find((x) => /Line spacing/.test(x.textContent));
      return { ls: DB.theme.lineSpacing, open: sec.classList.contains('th-open'), on: !!sec.querySelector('.ls-btn.on') && /Relaxed/.test(sec.querySelector('.ls-btn.on').textContent) }; });
    r.check(o2.ls === 'relaxed' && o2.open && o2.on, `134d${t} Relaxed is applied and Line spacing is still open after the repaint`, JSON.stringify(o2));
    await act(p.locator('#theme-body > .theme-sect', { hasText: 'Line spacing' }).locator(':scope > button.th-fold')); await sleep(250);
    const o3 = await p.evaluate(() => [...document.querySelectorAll('#theme-body > .theme-sect')].find((x) => /Line spacing/.test(x.textContent)).classList.contains('th-open'));
    r.check(!o3, `134c${t} a second tap closes it`, '');
    await p.evaluate(() => { closeTheme(); _newsViewSettings(); }); await sleep(400);
    const o4 = await p.evaluate(() => { const s = document.getElementById('th-nw'); return { open: !!s && s.classList.contains('th-open'), n: document.querySelectorAll('#theme-body > .th-open').length }; });
    r.check(o4.open, `134f${t} ⚙ News settings opens Appearance with News open`, JSON.stringify(o4));
  } catch (e) { r.check(false, `134${t} threw`, String((e && e.stack) || e).slice(0, 500)); }
  r.check(app.errors.length === 0, `134g${t} no page errors`, app.errors.slice(0, 3).join(' | '));
  await app.close();
}
process.exit(r.finish() ? 1 : 0);
