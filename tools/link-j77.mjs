#!/usr/bin/env node
/* tools/link-j77.mjs — v05.50, J77: the owner (26 Oct): "these links doesn't open to the site". Tapping a link in a note's read view opened its menu
   (🌐 Open in new tab · 📋 Copy link) and the document's "close any menu on a click" listener, registered later on the same node, shut it in the
   same tick (stopPropagation never reached it). Now that click keeps its menu, and a Mapping My Journey link also offers its GitHub copy
   (https://mappingmyjourney.github.io/MappingMyJourney/<same path>, 586 of 586 checked live on 26 Oct). Checks 110a–110d at 390 / 820 / 1440:
   110a a real tap on a Mapping My Journey link leaves the menu open, on screen, with Open on mappingmyjourney.com · Open on GitHub · Copy link;
   110b "🐙 Open on GitHub" opens a new tab at the GitHub address with the same path;
   110c a plain link's menu stays open too, and "🌐 Open in new tab" opens it;
   110d no page errors.
   `node tools/link-j77.mjs` */
import { openApp, seedDB, report } from './harness.mjs';

const r = report('J77 — links in a note open');
const errs = [];
const MMJ = 'https://mappingmyjourney.com/some-post-name/';
const GH = 'https://mappingmyjourney.github.io/MappingMyJourney/some-post-name/';
const PLAIN = 'https://example.org/page';
const seed = () => {
  const db = seedDB(), now = new Date().toISOString();
  db.articles.push({ id: 'mmj-p-7', title: 'An imported note', content: `<p class="mmj-src">🔗 <a href="${MMJ}">on Mapping My Journey</a> · 1 Jan 2020</p><p>Text with <a href="${PLAIN}">a plain link</a>.</p>`,
    folderIds: ['f1'], tags: [], createdAt: now, updatedAt: now, fromMmj: { id: 7, type: 'post', link: MMJ, modified: '2020-01-01T00:00:00' } });
  return db;
};
const menu = (page) => page.evaluate(() => {
  const m = document.getElementById('ctx'); if (!m) return null;
  const rc = m.getBoundingClientRect();
  return { shown: getComputedStyle(m).display !== 'none' && rc.width > 0, inView: rc.left >= 0 && rc.top >= 0 && rc.right <= innerWidth + 0.5 && rc.bottom <= innerHeight + 0.5, items: [...m.querySelectorAll('.ci')].map((x) => x.textContent.trim()) };
});
for (const [w, h, touch] of [[390, 844, true], [820, 1180, true], [1440, 900, false]]) {
  const app = await openApp({ viewport: { width: w, height: h }, hasTouch: touch, db: seed() });
  try {
    const { page, ctx } = app;
    await ctx.route(/^https:\/\/(mappingmyjourney\.github\.io|mappingmyjourney\.com|example\.org)\//, (rt) => rt.fulfill({ status: 200, contentType: 'text/html', body: '<title>stub</title>ok' }));
    await page.waitForTimeout(600);
    await page.evaluate(() => selArt('mmj-p-7')); await page.waitForTimeout(600);
    const tapOn = async (sel) => { const l = page.locator(sel).first(); await l.scrollIntoViewIfNeeded(); if (touch) await l.tap(); else await l.click(); await page.waitForTimeout(400); };
    await tapOn('#p3c .mmj-src a');
    const m1 = await menu(page);
    r.check(!!m1 && m1.shown && m1.inView && m1.items.join('|') === '🌐 Open on mappingmyjourney.com|🐙 Open on GitHub|📋 Copy link',
      `110a@${w} a tap on a Mapping My Journey link leaves its menu open and on screen: Open on mappingmyjourney.com · Open on GitHub · Copy link`, JSON.stringify(m1));
    let gh = '';
    if (m1 && m1.shown) {
      const [pop] = await Promise.all([ctx.waitForEvent('page', { timeout: 8000 }).catch(() => null), tapOn('#ctx .ci:nth-child(2)')]);
      if (pop) { await pop.waitForLoadState('domcontentloaded').catch(() => {}); gh = pop.url(); await pop.close(); }
    }
    r.check(gh === GH, `110b@${w} "🐙 Open on GitHub" opens a new tab at the GitHub copy, same path`, gh || '(no tab)');
    await tapOn('#p3c a[href="' + PLAIN + '"]');
    const m2 = await menu(page);
    let pl = '';
    if (m2 && m2.shown) {
      const [pop] = await Promise.all([ctx.waitForEvent('page', { timeout: 8000 }).catch(() => null), tapOn('#ctx .ci:nth-child(1)')]);
      if (pop) { await pop.waitForLoadState('domcontentloaded').catch(() => {}); pl = pop.url(); await pop.close(); }
    }
    r.check(!!m2 && m2.shown && m2.items[0] === '🌐 Open in new tab' && pl === PLAIN, `110c@${w} a plain link's menu stays open, and "🌐 Open in new tab" opens it`, JSON.stringify({ m2, pl }));
    errs.push(...app.errors);
  } finally { await app.close(); }
}
r.check(errs.length === 0, '110d no page errors', errs.slice(0, 3).join(' | '));
process.exit(r.finish() ? 1 : 0);
