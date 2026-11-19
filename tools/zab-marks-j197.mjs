#!/usr/bin/env node
/* tools/zab-marks-j197.mjs — v06.09, J197 (block 168): no body buttons under a jot; Urgent / Important / Priority marks.
   node tools/zab-marks-j197.mjs
   167a  390 / 820 / 1440: no Attach / Title / → Note button and no empty "Add link" box in the panel, the deck, All pockets — every pocket kind; the item's ⋯ and the tick stay
   167b  the ⋯ menu still holds ✎ Title… · 📎 Attach · → Note · 🔗 Add link; Add link from ⋯ adds a link that shows as its card; an item's existing links still show
   167c  marks toggle from ⋯ (🔥 ❗ 🚩, Tasks Zab: its own ⚑ High priority, no second 🚩), show as badges (word from 640, icon only under), keys deleted when off, survive a reload
   167d  a marked item reaches a second copy through mergeDB; the band shows the marks; → Note carries them; an unmarked item draws as before (no badge markup) */
import { openApp, report, seedDB } from './harness.mjs';

const r = report('J197 — body buttons gone, Urgent · Important · Priority');
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const T0 = new Date().toISOString();
const mk = (id, pocketId, text, order, extra = {}) => ({ id, pocketId, text, done: false, folderIds: [], tags: [], kind: null, journal: false, order, createdAt: T0, updatedAt: T0, ...extra });
const seed = () => {
  const db = seedDB(T0);
  db.jeb = [
    mk('p1', 'jp-idea', 'Plain-ish idea', 0), mk('t1', 'jp-task', 'Task one', 0), mk('l1', 'jp-link', 'https://zablink.test/own', 0),
    mk('s1', 'jp-shop', 'Milk', 0), mk('k1', 'jp-idea', 'Linked idea', 1, { links: [{ id: 'x1', u: 'https://zablink.test/held', at: T0 }] }),
  ];
  db.theme = Object.assign({}, db.theme, { zabPhoneLayout: 'bar' });
  return db;
};
const BODY = '.jeb-att-b,.jeb-note-b,.jeb-ttl-b,.jeb-acts,.jlk-open,.jl-tb';

for (const [w, h, touch] of [[390, 844, true], [820, 1180, true], [1440, 900, false]]) {
  const t = `@${w}`, phone = w < 640;
  const app = await openApp({ viewport: { width: w, height: h }, db: seed(), hasTouch: touch });
  const p = app.page;
  await p.context().route('**://zablink.test/**', (rt) => rt.fulfill({ status: 200, contentType: 'text/html', body: '<title>x</title>ok' }));
  const act = async (loc) => (touch ? loc.tap() : loc.click());
  const menuPick = async (scope, iid, word) => { await act(p.locator(`${scope}[data-iid="${iid}"] .jeb-more`).first()); await p.waitForSelector('#jeb-menu'); await act(p.locator(`#jeb-menu .jm:has-text("${word}")`).first()); await sleep(250); };
  try {
    /* 167a */
    const counts = [];
    for (const pid of ['jp-idea', 'jp-task', 'jp-link', 'jp-shop']) {
      await p.evaluate((pid) => { jebOpenPanel(pid); _jebPanelSig = ''; jebRefresh(); }, pid); await sleep(300);
      counts.push(await p.evaluate((B) => ({ n: document.querySelectorAll('#jeb-panel .jeb-it').length, bad: document.querySelectorAll('#jeb-panel ' + B.split(',').join(', #jeb-panel ')).length, more: document.querySelectorAll('#jeb-panel .jeb-it .jeb-more').length, tick: document.querySelectorAll('#jeb-panel .jeb-it .jeb-tick').length }), BODY));
    }
    r.check(counts.every((c) => c.n > 0 && c.bad === 0 && c.more === c.n && c.tick === c.n), `167a${t} panel rows (idea, task, link, shop): no body buttons, no Add link box; ⋯ and tick stay`, JSON.stringify(counts));
    await p.evaluate(() => { jebOpenPanel('*'); _jebOpen = '*'; _jebMulti = true; _jebPanelSig = ''; jebRefresh(); }).catch(() => {}); await sleep(300);
    r.check(await p.evaluate((B) => !document.querySelector('#jeb-panel ' + B.split(',').join(', #jeb-panel ')), BODY), `167a${t} All pockets: no body buttons`, '');
    await p.evaluate(() => { jebOpenDeck({ ids: ['jp-idea', 'jp-task', 'jp-link', 'jp-shop'], all: false }); }); await sleep(500);
    const dk = await p.evaluate((B) => ({ cards: document.querySelectorAll('#jeb-deck .jeb-card').length, bad: document.querySelectorAll('#jeb-deck ' + B.split(',').join(', #jeb-deck ') + ', #jeb-deck .jl-dtop').length, more: document.querySelectorAll('#jeb-deck .jeb-card .jeb-more').length, tick: document.querySelectorAll('#jeb-deck .jeb-card .jc-tick').length }), BODY);
    r.check(dk.cards > 0 && dk.bad === 0 && dk.more === dk.cards && dk.tick === dk.cards, `167a${t} deck cards: no body buttons; ⋯ and ✓ stay`, JSON.stringify(dk));
    await p.evaluate(() => { jebCloseDeck && jebCloseDeck(); }).catch(() => {});

    /* 167b */
    await p.evaluate(() => { jebOpenPanel('jp-idea'); _jebPanelSig = ''; jebRefresh(); }); await sleep(300);
    await act(p.locator('#jeb-panel .jeb-it[data-iid="p1"] .jeb-more').first()); await p.waitForSelector('#jeb-menu');
    const menu = await p.evaluate(() => [...document.querySelectorAll('#jeb-menu .jm')].map((e) => e.textContent));
    r.check(['✎ Title', '📎 Attach', '→ Note', '🔗 Add link', '🔥 Urgent', '❗ Important', '🚩 Priority'].every((x) => menu.some((m) => m.includes(x))), `167b${t} the ⋯ menu holds Title, Attach, → Note, Add link and the three marks`, menu.join(' | '));
    await p.keyboard.press('Escape'); await p.evaluate(() => _jebHideMenu()); await sleep(100);
    await menuPick('#jeb-panel .jeb-it', 'p1', 'Add link');
    await p.waitForSelector('#jeb-panel .jlk-in'); await p.keyboard.type('https://zablink.test/new-one'); await p.keyboard.press('Enter'); await sleep(300);
    r.check(await p.evaluate(() => ((DB.jeb.find((x) => x.id === 'p1') || {}).links || []).length === 1 && !!document.querySelector('#jeb-panel .jeb-it[data-iid="p1"] .jlk')), `167b${t} 🔗 Add link from ⋯ adds a link that shows as its card`, '');
    r.check(await p.evaluate(() => !!document.querySelector('#jeb-panel .jeb-it[data-iid="k1"] .jlk[data-lid="x1"]')), `167b${t} a link an item already holds still shows`, '');
    await p.evaluate(() => _jlkCloseBox());

    /* 167c */
    await menuPick('#jeb-panel .jeb-it', 'p1', 'Urgent'); await menuPick('#jeb-panel .jeb-it', 'p1', 'Priority');
    const m1 = await p.evaluate(() => { const i = DB.jeb.find((x) => x.id === 'p1'); const b = [...document.querySelectorAll('#jeb-panel .jeb-it[data-iid="p1"] .jc-m')]; return { urg: i.urg, imp: 'imp' in i, prio: i.prio, pri: 'pri' in i, n: b.length, vis: b.map((e) => getComputedStyle(e.querySelector('.jc-mw')).display !== 'none'), lab: b.map((e) => e.getAttribute('aria-label')) }; });
    r.check(m1.urg === true && m1.prio === true && !m1.imp && !m1.pri && m1.n === 2 && m1.lab.join() === 'Urgent,Priority' && m1.vis.every((v) => v === !phone), `167c${t} 🔥 + 🚩 set from ⋯; badges ${phone ? 'icon only' : 'with the word'}; no pri; titles/aria-labels`, JSON.stringify(m1));
    await menuPick('#jeb-panel .jeb-it', 'p1', 'Urgent');
    r.check(await p.evaluate(() => { const i = DB.jeb.find((x) => x.id === 'p1'); return !('urg' in i) && i.prio === true; }), `167c${t} turning Urgent off deletes the key (never false)`, '');
    await p.evaluate(() => { jebOpenPanel('jp-task'); _jebPanelSig = ''; jebRefresh(); }); await sleep(300);
    await act(p.locator('#jeb-panel .jeb-it[data-iid="t1"] .jeb-more').first()); await p.waitForSelector('#jeb-menu');
    const tm = await p.evaluate(() => [...document.querySelectorAll('#jeb-menu .jm')].map((e) => e.textContent));
    r.check(tm.some((x) => x.includes('High priority')) && !tm.some((x) => x.includes('🚩')) && tm.some((x) => x.includes('Urgent')) && tm.some((x) => x.includes('Important')), `167c${t} a Tasks Zab: ⚑ High priority is its priority (no second 🚩); Urgent and Important are there`, tm.join(' | '));
    await p.evaluate(() => _jebHideMenu());
    await menuPick('#jeb-panel .jeb-it', 't1', 'Important'); await sleep(100);
    await p.evaluate(() => { jebEditItem('s1', { urg: true, imp: true }); _jebPanelSig = ''; _jebDeckSig = ''; jebRefresh(); });
    await p.evaluate(() => _save && _save()); await sleep(600);
    await p.reload(); await p.waitForFunction(() => typeof DB !== 'undefined' && DB.jeb && DB.jeb.length, null, { timeout: 20000 }); await sleep(800);
    r.check(await p.evaluate(() => { const g = (id) => DB.jeb.find((x) => x.id === id); return g('p1').prio === true && g('t1').imp === true && g('s1').urg === true && g('s1').imp === true; }), `167c${t} marks survive a reload`, '');

    /* 167d */
    const merged = await p.evaluate(() => { const stale = JSON.parse(JSON.stringify(DB)); stale.jeb.forEach((i) => { delete i.urg; delete i.imp; delete i.prio; i.updatedAt = '2020-01-01T00:00:00.000Z'; }); const m = mergeDB(stale, JSON.parse(JSON.stringify(DB))); const g = (id) => m.jeb.find((x) => x.id === id); return g('s1').urg === true && g('s1').imp === true && g('p1').prio === true; });
    r.check(merged, `167d${t} the marks reach a stale copy through mergeDB (whole item, last write wins)`, '');
    const band = await p.evaluate(() => { const c = _zabTk(); const its = _tkOwnItems(Object.assign({}, c, { mode: 'all', skip: [], done: true })); const s = its.find((x) => x.id === 's1'); return { s: s && s.mk, plain: (its.find((x) => x.id === 'l1') || {}).mk }; });
    r.check(band.s === '🔥❗' && band.plain === '', `167d${t} the band's item carries the marks (and none for an unmarked one)`, JSON.stringify(band));
    const un = await p.evaluate(() => _jebChipsHTML(DB.jeb.find((x) => x.id === 'l1')));
    r.check(!/jc-m/.test(un) && !/jeb-chips/.test(un.replace(/<div class="jlk-wrap".*$/s, '')), `167d${t} an unmarked item draws no badge markup`, un.slice(0, 160));
    const nid = await p.evaluate(() => jebToNote('s1')); 
    r.check(await p.evaluate((n) => { const a = DB.articles.find((x) => x.id === n); return !!a && /🔥 Urgent · ❗ Important/.test(a.content); }, nid), `167d${t} → Note carries the marks as a plain first line`, '');
    r.check(app.errors.length === 0, `167d${t} no page errors`, app.errors.slice(0, 3).join(' | '));
    await p.screenshot({ path: `/tmp/j197-${w}.png` }).catch(() => {});
  } catch (e) { r.check(false, `167${t} threw`, String(e && e.stack || e).slice(0, 600)); }
  await app.close();
}
process.exit(r.finish() ? 1 : 0);
