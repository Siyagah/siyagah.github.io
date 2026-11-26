#!/usr/bin/env node
/* tools/zab-followup-j199.mjs — v06.11, J199 (block 170): ↩ Follow up mark (`fup`) on jots.
   170a ⋯ menu row, tick sets / un-tick deletes the key, badge on panel row (word from 640, icon only below)
   170b badge on deck card, band item carries ↩, Tasks and Links Zab show it too
   170c fup reaches a stale copy through mergeDB both ways, survives a reload; unmarked item draws no badge */
import { openApp, report, seedDB } from './harness.mjs';
const r = report('J199 — ↩ Follow up');
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const T0 = new Date().toISOString();
const mk = (id, pocketId, text, order, extra = {}) => ({ id, pocketId, text, done: false, folderIds: [], tags: [], kind: null, journal: false, order, createdAt: T0, updatedAt: T0, ...extra });
const seed = () => { const db = seedDB(T0); db.jeb = [mk('p1', 'jp-idea', 'Idea', 0), mk('t1', 'jp-task', 'Task', 0), mk('l1', 'jp-link', 'https://zablink.test/own', 0)]; db.theme = Object.assign({}, db.theme, { zabPhoneLayout: 'bar' }); return db; };
for (const [w, h, touch] of [[390, 844, true], [820, 1180, true], [1440, 900, false]]) {
  const t = `@${w}`, phone = w < 640;
  const app = await openApp({ viewport: { width: w, height: h }, db: seed(), hasTouch: touch });
  const p = app.page;
  const act = async (loc) => (touch ? loc.tap() : loc.click());
  const pick = async (iid) => { await act(p.locator(`#jeb-panel .jeb-it[data-iid="${iid}"] .jeb-more`).first()); await p.waitForSelector('#jeb-menu'); await act(p.locator('#jeb-menu .jm:has-text("Follow up")').first()); await sleep(250); };
  try {
    await p.evaluate(() => { jebOpenPanel('jp-idea'); _jebPanelSig = ''; jebRefresh(); }); await sleep(300);
    await act(p.locator('#jeb-panel .jeb-it[data-iid="p1"] .jeb-more').first()); await p.waitForSelector('#jeb-menu');
    const menu = await p.evaluate(() => [...document.querySelectorAll('#jeb-menu .jm')].map((e) => e.textContent));
    r.check(menu.some((m) => m.includes('☐ ↩ Follow up')), `170a${t} ⋯ menu has an unticked ↩ Follow up row`, menu.join(' | '));
    await act(p.locator('#jeb-menu .jm:has-text("Follow up")').first()); await sleep(250);
    const b = await p.evaluate(() => { const e = document.querySelector('#jeb-panel .jeb-it[data-iid="p1"] .jc-m-fup'); return { fup: DB.jeb.find((x) => x.id === 'p1').fup, has: !!e, word: e && getComputedStyle(e.querySelector('.jc-mw')).display !== 'none', lab: e && e.getAttribute('aria-label') }; });
    r.check(b.fup === true && b.has && b.word === !phone && b.lab === 'Follow up', `170a${t} tick sets fup; badge ${phone ? 'icon only' : 'with the word'}`, JSON.stringify(b));
    await pick('p1');
    r.check(await p.evaluate(() => !('fup' in DB.jeb.find((x) => x.id === 'p1')) && !document.querySelector('#jeb-panel .jeb-it[data-iid="p1"] .jc-m-fup')), `170a${t} un-tick deletes the key and the badge`, '');
    await p.evaluate(() => { jebEditItem('p1', { fup: true }); jebEditItem('t1', { fup: true }); jebEditItem('l1', { fup: true }); _jebPanelSig = ''; _jebDeckSig = ''; jebRefresh(); }); await sleep(200);
    for (const [pid, iid] of [['jp-task', 't1'], ['jp-link', 'l1']]) {
      await p.evaluate((pid) => { jebOpenPanel(pid); _jebPanelSig = ''; jebRefresh(); }, pid); await sleep(300);
      r.check(await p.evaluate((i) => !!document.querySelector(`#jeb-panel .jeb-it[data-iid="${i}"] .jc-m-fup`), iid), `170b${t} ${pid} row shows the badge`, '');
    }
    await p.evaluate(() => { jebOpenDeck({ ids: ['jp-idea', 'jp-task', 'jp-link'], all: false }); }); await sleep(500);
    r.check(await p.evaluate(() => document.querySelectorAll('#jeb-deck .jeb-card .jc-m-fup').length >= 3), `170b${t} deck cards show the badge`, '');
    await p.evaluate(() => { jebCloseDeck && jebCloseDeck(); }).catch(() => {});
    r.check(await p.evaluate(() => { const c = _zabTk(); const its = _tkOwnItems(Object.assign({}, c, { mode: 'all', skip: [], done: true })); return (its.find((x) => x.id === 'p1') || {}).mk === '↩'; }), `170b${t} the band item carries ↩`, '');
    const merged = await p.evaluate(() => { const stale = JSON.parse(JSON.stringify(DB)); stale.jeb.forEach((i) => { delete i.fup; i.updatedAt = '2020-01-01T00:00:00.000Z'; }); const a = mergeDB(stale, JSON.parse(JSON.stringify(DB))); const fresh = JSON.parse(JSON.stringify(DB)); const b = mergeDB(JSON.parse(JSON.stringify(DB)), stale); return a.jeb.every((i) => i.fup === true) && b.jeb.every((i) => i.fup === true); });
    r.check(merged, `170c${t} fup survives a merge both ways`, '');
    await p.evaluate(() => _save && _save()); await sleep(600);
    await p.reload(); await p.waitForFunction(() => typeof DB !== 'undefined' && DB.jeb && DB.jeb.length, null, { timeout: 20000 }); await sleep(600);
    r.check(await p.evaluate(() => DB.jeb.every((i) => i.fup === true)), `170c${t} fup survives a reload`, '');
    r.check(await p.evaluate(() => !/jc-m/.test(_jebChipsHTML({ id: 'z', pocketId: 'jp-idea', text: 'x' }))), `170c${t} an unmarked item draws no badge`, '');
    r.check(app.errors.length === 0, `170c${t} no page errors`, app.errors.slice(0, 3).join(' | '));
  } catch (e) { r.check(false, `169${t} threw`, String(e && e.stack || e).slice(0, 600)); }
  await app.close();
}
process.exit(r.finish() ? 1 : 0);
