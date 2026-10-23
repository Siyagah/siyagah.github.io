#!/usr/bin/env node
/* tools/kb-j67.mjs — v05.44, J67: "In deeper down scrolling, the menu bar disappears" (the owner's phone, Android Chrome, writing far
   down a long note with the keyboard up). Since Chrome 108 the on-screen keyboard only COVERS the page (it shrinks the visual viewport, not
   the layout one), so when the caret goes under the keyboard Chrome pans the whole page up and the note's bar at the top slides off. The fix
   is `interactive-widget=resizes-content` in the viewport meta: the page is laid out above the keyboard again, and only the note scrolls.
   Headless Chromium has no on-screen keyboard, so the keyboard is played by shrinking the viewport, which is what Chrome does with the
   fix in place. Checks 103a–103e:
   103a the viewport meta asks for resizes-content (fails on the build before this round);
   103b/103c at 390 (phone) and 820 (tablet), touch, keyboard up: typing at the end of a 120-paragraph note leaves the page itself
        unscrolled, the bar (#p3h) on screen, and the caret on screen;
   103d a Save File copy keeps the meta;  103e no page errors.
   `node tools/kb-j67.mjs` */
import { openApp, seedDB, report } from './harness.mjs';
import { readFileSync } from 'node:fs';

const r = report('J67 — the bar stays with the keyboard up');
const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const meta = (/<meta name="viewport" content="([^"]*)"/.exec(src) || [])[1] || '';
r.check(/interactive-widget=resizes-content/.test(meta), '103a the viewport meta asks Chrome to lay the page out above the keyboard (resizes-content)', meta);

function longSeed() {
  const db = seedDB(), a = db.articles[0];
  a.content = Array.from({ length: 120 }, (_, i) => `<p>Paragraph ${i + 1}: পারবে না যদি না কেউ সম্পূর্ণরূপে নিজেকে একজন স্টুডেন্ট ভাবে।</p>`).join('');
  return db;
}
const errs = [];
for (const [id, w, h, kbH] of [['103b', 390, 844, 420], ['103c', 820, 1180, 760]]) {
  const app = await openApp({ viewport: { width: w, height: h }, db: longSeed(), hasTouch: true });
  try {
    const { page } = app;
    const aid = await page.evaluate(() => DB.articles[0].id);
    await page.evaluate((x) => { selArt(x); startEdit(); }, aid);
    await page.waitForSelector('#ed[contenteditable="true"]', { timeout: 5000 });
    /* keyboard up: Chrome (with the fix) shrinks the layout viewport to what is above the keyboard */
    await page.setViewportSize({ width: w, height: kbH });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      const ed = document.getElementById('ed'); ed.focus();
      const s = getSelection(), rg = document.createRange(); rg.selectNodeContents(ed.lastElementChild); rg.collapse(false); s.removeAllRanges(); s.addRange(rg);
    });
    await page.keyboard.type(' আরও লেখা', { delay: 10 });
    await page.keyboard.press('Enter');
    await page.keyboard.type('next line', { delay: 10 });
    await page.waitForTimeout(400);
    const m = await page.evaluate(() => {
      const se = document.scrollingElement, bar = document.getElementById('p3h'), br = bar.getBoundingClientRect();
      const s = getSelection(); let cy = null;
      if (s.rangeCount) { const rr = s.getRangeAt(0).getClientRects(); const r0 = rr.length ? rr[rr.length - 1] : s.getRangeAt(0).startContainer.parentElement.getBoundingClientRect(); cy = Math.round(r0.bottom); }
      return { pageY: se.scrollTop, bodyY: document.body.scrollTop, vvTop: window.visualViewport ? Math.round(window.visualViewport.offsetTop) : 0,
        barTop: Math.round(br.top), barBot: Math.round(br.bottom), barH: Math.round(br.height), vis: getComputedStyle(bar).display !== 'none' && getComputedStyle(bar).visibility !== 'hidden',
        ih: innerHeight, caret: cy, typed: document.getElementById('ed').innerText.includes('next line') };
    });
    r.check(m.typed && m.pageY === 0 && m.bodyY === 0 && m.vvTop === 0 && m.vis && m.barH > 0 && m.barTop >= 0 && m.barBot <= m.ih
      && m.caret !== null && m.caret <= m.ih && m.caret > m.barBot,
      `${id} at ${w} wide, keyboard up (${kbH} px left): typing at the end of a long note keeps the page still, the bar on screen and the caret below it`, JSON.stringify(m));
    errs.push(...app.errors);
  } finally { await app.close(); }
}
{
  const app = await openApp({ viewport: { width: 390, height: 844 }, hasTouch: true });
  try {
    const out = await app.page.evaluate(() => _cleanExportRoot());
    r.check(/name="viewport"[^>]*interactive-widget=resizes-content/.test(out), '103d a Save File copy keeps the keyboard setting', (/<meta name="viewport"[^>]*>/.exec(out) || [''])[0]);
    errs.push(...app.errors);
  } finally { await app.close(); }
}
r.check(errs.length === 0, '103e no page errors', errs.slice(0, 3).join(' | '));
process.exit(r.finish() ? 1 : 0);
