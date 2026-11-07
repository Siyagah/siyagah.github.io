#!/usr/bin/env node
/* tools/zab-set-j86.mjs — v05.55, J86: the owner (28 Oct, with a screenshot of Siyagah Zab's All Zabs cards): "Enable a Zab Settings button here.
   How do I set a particular Single/ Multiple Zab scrolling?" Checks 115a–115f, real clicks / taps at 390 (touch) / 820 (touch) / 1440 (mouse).
   115a Zab mode (/?jeb=1), All Zabs as cards: "⚙ Settings" in the header row opens "⚙ Zab settings" ON TOP of the cards (the point at its
        middle is inside it): the Zab bar, 🎞 Scrolling titles, 📰 News and Zab on the phone, and not the theme presets;
   115b the ⚙ in a Zab's panel header (one Zab, and All Zabs) opens it too, in Zab mode and in the notes app;
   115c "🎨 All appearance settings…" shows the rest, still on top; ✕ closes; 🧰 → Appearance afterwards is the plain Appearance dialog;
   115d a Zab's menu "🎞 In the scrolling titles": unticks one Zab (its titles leave the band), ticks it back; from "Only the Zab that is
        open" it makes "Only the ones I tick" with that Zab; with the band off it switches the band on;
   115e in ⚙ Zab settings, "Only the ones I tick" with two Zabs ticked: the band holds those two Zabs' titles and no other;
   115f no page errors.
   `node tools/zab-set-j86.mjs` */
import { openApp, report } from './harness.mjs';

const r = report('J86 — Zab settings and which Zabs scroll');
const errs = [];
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const SEED = () => {
  const ps = jebPockets(); const ids = ps.slice(0, 4).map((p) => p.id);
  ids.forEach((id, k) => { for (let i = 0; i < 2; i++) jebAddItem(id, 'Z' + k + ' item ' + i); });
  jebRefresh(); return ids;
};
const band = (page) => page.evaluate(() => [...document.querySelectorAll('#zab-tk .tk-it')].map((e) => e.textContent.trim()).filter((t) => /^Z\d item/.test(t.replace(/^[^Z]*/, ''))).map((t) => t.replace(/^[^Z]*/, '').slice(0, 2)));
const modal = (page) => page.evaluate(() => {
  const m = document.getElementById('theme-modal'), box = m.querySelector('.theme-box'), on = getComputedStyle(m).display !== 'none';
  if (!on) return { on };
  const b = box.getBoundingClientRect(), top = document.elementFromPoint(b.left + b.width / 2, b.top + Math.min(60, b.height / 2));
  const txt = box.textContent;
  return { on, hd: m.querySelector('.theme-hd-t').textContent, onTop: !!top && box.contains(top), zab: /Zab bar/.test(txt) && /Scrolling titles/.test(txt) && /News/.test(txt) && /Zab on the phone/.test(txt), preset: /Theme preset/.test(txt), zset: m.classList.contains('zab-set') };
});

for (const [w, h, touch] of [[390, 844, true], [820, 1180, true], [1440, 900, false]]) {
  /* Zab mode */
  let app = await openApp({ viewport: { width: w, height: h }, hasTouch: touch, path: '/?jeb=1' });
  let page = app.page;
  const tap = async (sel) => { const l = page.locator(sel).first(); if (touch) await l.tap(); else await l.click(); await sleep(250); };
  try {
    await sleep(500);
    const ids = await page.evaluate(SEED);
    await page.evaluate(() => { jebOpenDeck({ ids: [], all: true }); });
    await sleep(400);
    const btn = await page.evaluate(() => { const b = document.querySelector('#jeb-deck .jd-hd button[data-d="set"]'); const x = b && b.getBoundingClientRect(); return b ? { t: b.textContent, w: Math.round(x.width), h: Math.round(x.height), in: x.right <= innerWidth + 1 && x.left >= -1 } : null; });
    await tap('#jeb-deck .jd-hd button[data-d="set"]');
    const a = await modal(page);
    r.check(!!btn && /Settings/.test(btn.t) && btn.in, `115a@${w} Zab mode, All Zabs as cards: "⚙ Settings" is in the header row (${btn && btn.w}×${btn && btn.h})`, JSON.stringify(btn));
    r.check(a.on && a.onTop && a.hd === '⚙ Zab settings' && a.zab && !a.preset, `115a@${w} it opens "⚙ Zab settings" on top of the cards: the Zab bar, scrolling titles, News, Zab on the phone (no theme presets)`, JSON.stringify(a));
    /* 115c */
    await tap('#theme-modal button:has-text("All appearance settings")');
    const c1 = await modal(page);
    await tap('#theme-modal .theme-hd button');
    const c2 = await modal(page);
    r.check(c1.on && c1.onTop && c1.preset && c1.hd === '🎨 Appearance', `115c@${w} "All appearance settings…" shows the rest, still on top`, JSON.stringify(c1));
    r.check(!c2.on, `115c@${w} ✕ closes it`, JSON.stringify(c2));
    /* 115b — panel headers in Zab mode: All Zabs, then one Zab */
    await page.evaluate(() => { jebCloseDeck && jebCloseDeck(); jebOpenPanelSel({ ids: [], all: true }); });
    await sleep(300);
    await tap('#jeb-panel .jeb-ph .jeb-set');
    const b1 = await modal(page);
    await page.evaluate(() => closeTheme());
    await page.evaluate((id) => jebOpenPanel(id), ids[1]); await sleep(300);
    await tap('#jeb-panel .jeb-ph .jeb-set');
    const b2 = await modal(page);
    await page.evaluate(() => closeTheme());
    r.check(b1.on && b1.onTop && b1.zab && b2.on && b2.onTop && b2.zab && !b2.preset, `115b@${w} Zab mode: the ⚙ in the panel header (All Zabs and one Zab) opens ⚙ Zab settings`, JSON.stringify({ b1, b2 }));
    /* 115d — the Zab menu toggle */
    await page.evaluate(() => { zabTkSet('on', true, true); zabTkSet('mode', 'all', true); zabTkSet('skip', [], true); zabTkSet('done', false, true); });
    await sleep(300);
    const menuPick = async (pid) => {
      await page.evaluate((pid) => { jebOpenPanel(pid); }, pid); await sleep(250);
      await tap('#jeb-panel .jeb-ph .jeb-pm');
      const items = await page.evaluate(() => [...document.querySelectorAll('#jeb-menu .jm')].map((b) => b.textContent.trim()));
      const it = page.locator('#jeb-menu .jm', { hasText: 'In the scrolling titles' }).first();
      const label = await it.textContent();
      if (touch) await it.tap(); else await it.click();
      await sleep(300);
      return { label: label.trim(), items: items.length };
    };
    const before = await band(page);
    const m1 = await menuPick(ids[2]);
    const after1 = await band(page), st1 = await page.evaluate(() => JSON.stringify(DB.theme.zabTicker));
    const m2 = await menuPick(ids[2]);
    const after2 = await band(page);
    r.check(/^☑/.test(m1.label) && before.includes('Z2') && !after1.includes('Z2') && after1.includes('Z1') && /^☐/.test(m2.label) && after2.includes('Z2'), `115d@${w} a Zab's menu "🎞 In the scrolling titles": off takes its titles out of the band, on puts them back`, JSON.stringify({ before, after1, after2, m1: m1.label, m2: m2.label, st1 }));
    /* "only the Zab that is open": the open Zab is in the band, so its menu shows ☑; another Zab (from its bar chip's menu) is added and kept */
    await page.evaluate(() => { zabTkSet('mode', 'open', true); });
    const mo = await menuPick(ids[3]);
    const o0 = await page.evaluate(() => { const c = _zabTk(); return { mode: c.mode, pids: c.pids }; });
    await page.evaluate(() => { zabTkSet('mode', 'open', true); });
    await page.evaluate((id) => { jebOpenPanel(id); _zabTkToggle(_jebPocket(id) && jebPockets().find((p) => p.id !== id).id); }, ids[1]);
    const o = await page.evaluate(() => { const c = _zabTk(); return { mode: c.mode, pids: c.pids }; });
    const otherId = await page.evaluate((id) => jebPockets().find((p) => p.id !== id).id, ids[1]);
    await page.evaluate(() => { zabTkSet('on', false, true); zabTkSet('mode', 'only', true); zabTkSet('pids', [], true); });
    await menuPick(ids[0]);
    const o2 = await page.evaluate(() => { const c = _zabTk(); return { on: c.on, pids: c.pids }; });
    r.check(/^☑/.test(mo.label) && o0.mode === 'only' && o0.pids.length === 0 && o.mode === 'only' && JSON.stringify(o.pids) === JSON.stringify([otherId]) && o2.on && JSON.stringify(o2.pids) === JSON.stringify([ids[0]]), `115d@${w} from "only the open Zab" it makes "only the ones I tick" with that Zab; with the band off it switches it on`, JSON.stringify({ mo: mo.label, o0, o, otherId, o2 }));
    /* 115e — in ⚙ Zab settings: only the ones I tick, two Zabs */
    await page.evaluate(() => { zabTkSet('pids', [], true); jebClosePanel(); });
    await page.evaluate(() => openZabSettings()); await sleep(250);
    await page.selectOption('#th-tk-mode', 'only'); await sleep(250);
    for (const id of [ids[0], ids[1]]) { const l = page.locator(`#th-tk-list input.tk-pk[data-pid="${id}"]`); await l.scrollIntoViewIfNeeded(); if (touch) await l.tap(); else await l.click(); await sleep(200); }
    await page.evaluate(() => closeTheme()); await sleep(400);
    const e = await band(page);
    r.check(e.length >= 2 && e.every((x) => x === 'Z0' || x === 'Z1') && e.includes('Z0') && e.includes('Z1'), `115e@${w} "Only the ones I tick" with two Zabs ticked in ⚙ Zab settings: the band holds those two Zabs' titles only (${JSON.stringify([...new Set(e)])})`);
    errs.push(...app.errors);
  } catch (e) { r.check(false, `115@${w} (Zab mode) threw: ${String(e && e.message || e).split('\n')[0]}`); }
  finally { await app.close(); }

  /* the notes app: the panel header's ⚙, then 🧰 → Appearance is the plain dialog */
  app = await openApp({ viewport: { width: w, height: h }, hasTouch: touch });
  page = app.page;
  try {
    await sleep(400);
    const ids = await page.evaluate(SEED);
    await page.evaluate((id) => { if (window._zabPhone && _zabPhone()) { } jebOpenPanel(id); }, ids[0]); await sleep(300);
    const l = page.locator('#jeb-panel .jeb-ph .jeb-set').first(); if (touch) await l.tap(); else await l.click(); await sleep(250);
    const n1 = await modal(page);
    await page.evaluate(() => closeTheme());
    await page.evaluate(() => { jebClosePanel(); openTheme(); }); await sleep(200);
    const n2 = await modal(page);
    await page.evaluate(() => closeTheme());
    r.check(n1.on && n1.onTop && n1.zab && !n1.preset, `115b@${w} the notes app: a Zab panel's ⚙ opens ⚙ Zab settings`, JSON.stringify(n1));
    r.check(n2.on && n2.hd === '🎨 Appearance' && n2.preset && !n2.zset, `115c@${w} 🧰 → Appearance afterwards is the plain Appearance dialog`, JSON.stringify(n2));
    errs.push(...app.errors);
  } catch (e) { r.check(false, `115@${w} (notes app) threw: ${String(e && e.message || e).split('\n')[0]}`); }
  finally { await app.close(); }
}
r.check(errs.length === 0, '115f no page errors', errs.slice(0, 3).join(' | '));
process.exit(r.finish() ? 1 : 0);
