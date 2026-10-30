#!/usr/bin/env node
/* tools/card-j96.mjs — v05.61, J96. The owner (30 Oct, a screenshot of Aa ▸ 🎨 in a pop-out window): "This is not ideal having a second
   card from a button." 🎨 Colour and ↕ Spacing, pressed inside the edit bar's card (Aa), now open their choices as a section of that SAME
   card. Real clicks only. Checks 119a–119f at 390 / 820 (touch) / 1440, and 119g in a pop-out window at 1440:
   119a Aa ▸ 🎨: the colours are inside the Aa card (no second card on the page), the card is inside the screen, a swatch is on top where it is drawn;
   119b a swatch still colours the selected text, and the card stays open;
   119c 🎨 again closes the colours, the Aa card stays;
   119d Aa ▸ ↕ Spacing: inside the same card; a choice still applies to the paragraph;
   119e 🎨 while Spacing is open swaps one section for the other (never both);
   119f no page errors;
   119g the same in a pop-out window (Multi): the colours inside its Aa card, a swatch colours the text. */
import { openApp, report, seedDB } from './harness.mjs';

const r = report('J96 — choices inside their card');
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const db = () => { const d = seedDB(); d.articles[0].content = '<p>Colour this word here.</p><p>Second paragraph.</p>'; return d; };
const state = (page) => page.evaluate(() => {
  const card = document.querySelector('.fl-pop.open'), clr = [...document.querySelectorAll('.clr-pop')], spc = [...document.querySelectorAll('.spc-pop')];
  const cb = card && card.getBoundingClientRect();
  const sw = card && card.querySelector('.clr-pop .clr-sw:nth-of-type(2)'); let top = null;
  if (sw) { const b = sw.getBoundingClientRect(); const e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); top = !!(e && (e === sw || sw.contains(e))); }
  return { card: !!card, clr: clr.length, clrIn: clr.filter((x) => card && card.contains(x)).length, spc: spc.length, spcIn: spc.filter((x) => card && card.contains(x)).length,
    inView: !!(cb && cb.left >= -0.5 && cb.top >= -0.5 && cb.right <= innerWidth + 0.5 && cb.bottom <= innerHeight + 0.5), swTop: top };
});
const selectWord = (page, sel) => page.evaluate((sel) => { const p = document.querySelector(sel); const t = p.firstChild; const rg = document.createRange(); rg.setStart(t, 7); rg.setEnd(t, 11); const s = getSelection(); s.removeAllRanges(); s.addRange(rg); _edRange = rg.cloneRange(); }, sel);

for (const [w, h, touch] of [[390, 844, true], [820, 1180, true], [1440, 900, false]]) {
  const t = `@${w}`;
  const app = await openApp({ viewport: { width: w, height: h }, hasTouch: touch, db: db() });
  const page = app.page;
  const tap = (sel) => (touch ? page.locator(sel).first().tap() : page.locator(sel).first().click());
  try {
    await page.evaluate(() => { selArt('a1'); if (innerWidth < 1200) showPane('p3'); startEdit(); }); await sleep(500);
    await page.click('#ed p >> nth=0');
    await tap('.eb-grp-btn[data-g="text"]:visible'); await sleep(200);
    await selectWord(page, '#ed p');
    await tap('.fl-pop.open button[title="Colour"]'); await sleep(200);
    const a = await state(page);
    r.check(a.card && a.clr === 1 && a.clrIn === 1 && a.inView && a.swTop, `119a${t} Aa ▸ 🎨: the colours are inside the Aa card (no second card), the card inside the screen`, JSON.stringify(a));
    await tap('.fl-pop.open .clr-pop .clr-sw:nth-of-type(2)'); await sleep(200);
    const col = await page.evaluate(() => { const s = document.querySelector('#ed [style*="color"]'); return s ? s.textContent : null; });
    const b = await state(page);
    r.check(col === 'this' && b.card && b.clrIn === 1, `119b${t} a swatch colours the selected word, and the card stays open`, JSON.stringify({ col, b }));
    await tap('.fl-pop.open button[title="Colour"]'); await sleep(200);
    const c = await state(page);
    r.check(c.card && c.clr === 0, `119c${t} 🎨 again closes the colours; the Aa card stays`, JSON.stringify(c));
    await page.click('#ed p >> nth=1'); await sleep(100);
    if (!(await state(page)).card) { await tap('.eb-grp-btn[data-g="text"]:visible'); await sleep(200); }
    await tap('.fl-pop.open button.et-spc'); await sleep(200);
    const d = await state(page);
    await tap('.fl-pop.open #spc-pop [data-gap="24px"]'); await sleep(150);
    const gap = await page.evaluate(() => [...document.querySelectorAll('#ed p')].map((p) => p.style.marginBottom));
    r.check(d.card && d.spc === 1 && d.spcIn === 1 && d.inView && gap[1] === '24px', `119d${t} Aa ▸ ↕ Spacing: inside the same card, and a choice applies to the paragraph`, JSON.stringify({ d, gap }));
    await tap('.fl-pop.open button[title="Colour"]'); await sleep(200);
    const e = await state(page);
    r.check(e.clrIn === 1 && e.spc === 0, `119e${t} 🎨 while Spacing is open swaps the sections (never both)`, JSON.stringify(e));
  } catch (e) { r.check(false, `119${t} threw`, String(e && e.stack || e)); }
  r.check(app.errors.length === 0, `119f${t} no page errors`, app.errors.slice(0, 3).join(' | '));
  await app.close();
}
{
  const app = await openApp({ viewport: { width: 1440, height: 900 }, db: db() });
  const page = app.page;
  try {
    await page.evaluate(() => popOutNote('a1')); await sleep(400);
    await page.click('#fw-ed-a1 p >> nth=0');
    await page.click('#fw-a1 .eb-grp-btn[data-g="text"]'); await sleep(200);
    await selectWord(page, '#fw-ed-a1 p');
    await page.click('.fl-pop.open button[title="Colour"]'); await sleep(200);
    const a = await state(page);
    await page.click('.fl-pop.open .clr-pop .clr-sw:nth-of-type(2)'); await sleep(200);
    const col = await page.evaluate(() => { const s = document.querySelector('#fw-ed-a1 [style*="color"]'); return s ? s.textContent : null; });
    r.check(a.clr === 1 && a.clrIn === 1 && a.inView && col === 'this', '119g@1440 in a pop-out window: the colours inside its Aa card, and a swatch colours the word', JSON.stringify({ a, col }));
  } catch (e) { r.check(false, '119g threw', String(e && e.stack || e)); }
  r.check(app.errors.length === 0, '119f pop-out no page errors', app.errors.slice(0, 3).join(' | '));
  await app.close();
}
process.exit(r.finish() ? 1 : 0);
