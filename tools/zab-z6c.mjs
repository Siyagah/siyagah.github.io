#!/usr/bin/env node
/* tools/zab-z6c.mjs — v05.12, Z6c: the Ideas pocket and the Shopping pocket (checks 72a–72k).

   Every check runs at 390x844, 820x1180 and 1440x900 (unless it names a size) against a booted app, with real taps
   (touch viewports) or clicks (1440). Nothing touches the network.

   72a  stars: tap to set 1, 2, 3; tap the top star again to clear; ⋯ → ★ Stars… (None / ★ / ★★ / ★★★, tick boxes); stars are >= 32 px
   72b  topics: ⋯ → # Topic… (names used in this pocket, tick boxes, New…, Done); Group by Topic (a multi-topic item under each topic,
        "No topic yet" last, counts); Sort by stars; both choices stored per pocket and kept over a reload
   72c  quantity: inline edit on the chip (set, change by blur, clear, Escape cancels)
   72d  shop: the picker (one of; picking replaces), the filter row narrows the list, the choice persists over a reload, and falls back
        to All when the shop is no longer used
   72e  basket: ticking drops an item under "In the basket (n)", still visible and struck through; unticking returns it; Clear basket
        goes to Trash and restores
   72f  quick typing: "2 milk", "500g flour @Coles", "eggs"; a plain pocket stays literal; the hint shows the first time only
   72g  the rest: → Note (both kinds), "All pockets", deck cards, Attach, Move to a plain pocket and back (fields kept, also task
        fields), Trash and restore
   72h  layout: Attach and → Note share a line in every row, no row overflows, the view and filter bars fit on one line
        (390, 820, 1440, and 1440 + /?jeb=1)
   72i  sync: stars, topics, qty and shop set on device A arrive on device B (one fake cloud)
   72j  scale: 300 items in each kind at 390, CPU x4: the panel paints in <= 300 ms (median of 4 openings; all printed)
   72k  contrast of the new text on the five presets

   `--only=72a,72c` runs just those. Each printed ok/FAIL line becomes one app-check check (block 72). */
import { playwright, serve, seedDB } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, quiet, check, results } from './s1-fake.mjs';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);
/* --fails: print only the failing lines (the passing ones and their detail line are dropped) - for iterating */
if (argv.includes('--fails')) { const o = console.log; let skip = false; console.log = (...x) => { const t = x.join(' '); if (/^\s+ok\s/.test(t)) { skip = true; return; } if (skip && /^\s{6,}\S/.test(t)) { skip = false; return; } skip = false; o(...x); }; }

const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];
const T0 = '2026-10-01T00:00:00.000Z';
const pw = await playwright();
const srv = await serve();
const browser = await pw.chromium.launch();

const mk = (id, pocketId, text, order, extra = {}) => ({ id, pocketId, text, done: false, folderIds: [], tags: [], kind: null, journal: false, order, createdAt: T0, updatedAt: T0, ...extra });
/* Ideas: d1 ★3 Garden · d2 ★1 Garden+Water · d3 Media · d4 (nothing) · d5 ★2 · d6 (nothing).  Shopping: s1 2 Milk Coles · s4 Bread (in the basket) · s2 500 g Flour Aldi · s3 Eggs · s5 Rice.  t1: a task with a date */
const items = () => [
  mk('d1', 'jp-idea', 'Solar fence', 0, { stars: 3, topics: ['Garden'] }),
  mk('d2', 'jp-idea', 'Rain tank', 1, { stars: 1, topics: ['Garden', 'Water'] }),
  mk('d3', 'jp-idea', 'Podcast idea', 2, { topics: ['Media'] }),
  mk('d4', 'jp-idea', 'Loose thought', 3),
  mk('d5', 'jp-idea', 'Big idea', 4, { stars: 2 }),
  mk('d6', 'jp-idea', 'Untagged', 5),
  mk('s1', 'jp-shop', 'Milk', 0, { qty: '2', shop: 'Coles' }),
  mk('s4', 'jp-shop', 'Bread', 1, { done: true, shop: 'Coles' }),
  mk('s2', 'jp-shop', 'Flour', 2, { qty: '500 g', shop: 'Aldi' }),
  mk('s3', 'jp-shop', 'Eggs', 3),
  mk('s5', 'jp-shop', 'Rice', 4),
  mk('t1', 'jp-task', 'Pay rent', 0, { due: '2026-12-01', pri: 1, steps: [{ id: 'k1', t: 'call', d: 1 }] }),
];
const seed = (extra) => { const db = seedDB(T0); db.jeb = items(); if (extra) extra(db); db.theme = Object.assign({}, db.theme, { zabPhoneLayout: 'bar' }); return db; };   /* v05.17: a phone's Zab is a corner button now; this check is about the bar (block 77 covers the button) */
const dev = (cloud, name, vp, db, opts = {}) => addDevice(browser, srv.base, cloud, name, { width: vp.w, height: vp.h }, vp.touch, db || seed(), opts);
const act = (d, vp, sel) => (vp.touch ? d.page.locator(sel).first().tap() : d.page.locator(sel).first().click());
const rect = (d, sel) => d.page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; }, sel);
const item = (d, id) => on(d, (i) => JSON.parse(JSON.stringify(DB.jeb.find((x) => x.id === i) || null)), id);
const openPanel = async (d, vp, pid = 'jp-idea') => { await act(d, vp, `#jeb-bar .jeb-chip[data-pid="${pid}"] .jeb-main`); await d.page.waitForSelector('#jeb-panel.on', { timeout: 3000 }); await sleep(400); };
const closePanel = async (d, vp) => { await act(d, vp, '#jeb-panel .jeb-x'); await sleep(300); };
const menuItem = async (d, vp, iid, label) => { await act(d, vp, `#jeb-panel .jeb-it[data-iid="${iid}"] .jeb-more`); await d.page.waitForSelector('#jeb-menu'); await act(d, vp, `#jeb-menu .jm:has-text("${label}")`); await sleep(250); };
const noErr = (d, tag) => check(d.errors.length === 0, `${tag} no page errors`, d.errors.slice(0, 2).join(' · '));
const each = async (fn, vps = VPS, opts, db) => { for (const vp of vps) { const d = await dev(makeCloud(), 'D' + vp.name, vp, db ? db() : null, opts); try { await fn(d, vp); } finally { await d.ctx.close(); } } };
const reload = async (d) => { await d.page.reload({ waitUntil: 'domcontentloaded' }); await d.page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('jeb-bar')); await sleep(600); };
/* the panel as the owner reads it */
const ids = (d, sel = '#jeb-panel .jeb-list') => on(d, (s) => [...document.querySelectorAll(s + ' .jeb-it')].map((e) => e.dataset.iid).join('+'), sel);
const igroups = (d) => on(d, () => [...document.querySelectorAll('#jeb-panel .ji-gh')].map((h) => h.querySelector('b').textContent.replace(/^# /, '') + ' ' + h.querySelector('small').textContent + ':' + [...h.nextElementSibling.querySelectorAll('.jeb-it')].map((e) => e.dataset.iid).join('+')).join(' | '));
const shopView = (d) => on(d, () => { const g = (k) => { const l = document.querySelector('#jeb-panel .jeb-gl[data-g="' + k + '"]'); return l ? [...l.querySelectorAll('.jeb-it')].map((e) => e.dataset.iid).join('+') : '-'; }; const h = document.querySelector('#jeb-panel .js-basket b'); return g('open') + ' / ' + (h ? h.textContent : 'no basket') + ': ' + g('basket'); });
const starsOn = (d, id, root = '#jeb-panel') => on(d, ([i, r]) => document.querySelectorAll(r + ' [data-iid="' + i + '"] .ji-star.on').length, [id, root]);
const modalOpen = (d) => d.page.waitForSelector('#ov.on #mb', { timeout: 3000 });
const typeAdd = async (d, vp, s) => { await act(d, vp, '#jeb-add-in'); await d.page.keyboard.type(s); await d.page.keyboard.press('Enter'); await sleep(350); };

try {
  /* ══ 72a — stars ══ */
  if (want('72a')) await each(async (d, vp) => {
    const t = `72a@${vp.name}`;
    await openPanel(d, vp);
    const sz = await on(d, () => [...document.querySelectorAll('#jeb-panel .jeb-it[data-iid="d4"] .ji-star')].map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
    check(sz.length === 3 && sz.every((s) => s[0] >= 32 && s[1] >= 32), `${t} three stars on the row, each at least 32x32 px`, JSON.stringify(sz));
    const tap = async (id, n) => { await act(d, vp, `#jeb-panel .jeb-it[data-iid="${id}"] .ji-star[data-n="${n}"]`); await sleep(250); };
    await tap('d4', 1); let it = await item(d, 'd4');
    check(it.stars === 1 && typeof it.stars === 'number' && (await starsOn(d, 'd4')) === 1, `${t} tap the first star: stars is the number 1, one star filled`, JSON.stringify(it));
    await tap('d4', 2); it = await item(d, 'd4');
    check(it.stars === 2 && (await starsOn(d, 'd4')) === 2, `${t} tap the second star: 2`, String(it.stars));
    await tap('d4', 3); it = await item(d, 'd4');
    check(it.stars === 3 && (await starsOn(d, 'd4')) === 3, `${t} tap the third: 3`, String(it.stars));
    await tap('d4', 3); it = await item(d, 'd4');
    check(!('stars' in it) && (await starsOn(d, 'd4')) === 0, `${t} tapping the top star again clears it (the key is gone, no star filled)`, JSON.stringify(it));
    await tap('d4', 2); await tap('d4', 1); it = await item(d, 'd4');
    check(it.stars === 1, `${t} with 2 set, tapping star 1 sets 1 (not a clear)`, String(it.stars));
    await tap('d4', 1); it = await item(d, 'd4');
    check(!('stars' in it), `${t} ...and tapping that top star clears it`);
    const glyphs = await on(d, () => [...document.querySelectorAll('#jeb-panel .jeb-it[data-iid="d1"] .ji-star')].map((e) => e.textContent).join(''));
    check(glyphs === '★★★' && (await on(d, () => [...document.querySelectorAll('#jeb-panel .jeb-it[data-iid="d4"] .ji-star')].map((e) => e.textContent).join(''))) === '☆☆☆', `${t} filled stars are ★, empty ones ☆`, glyphs);
    /* the ⋯ menu */
    await act(d, vp, '#jeb-panel .jeb-it[data-iid="d4"] .jeb-more'); await d.page.waitForSelector('#jeb-menu');
    const menu = await on(d, () => [...document.querySelectorAll('#jeb-menu .jm')].map((e) => e.textContent));
    check(menu.includes('★ Stars…') && menu.includes('# Topic…') && !menu.some((m) => /Quantity|Shop/.test(m)), `${t} the ⋯ menu of an idea carries "★ Stars…" and "# Topic…" (with words), nothing of shopping`, menu.join(' / '));
    await act(d, vp, '#jeb-menu .jm:has-text("Stars")'); await modalOpen(d); await sleep(200);
    const rows = await on(d, () => [...document.querySelectorAll('#mb .jl-pkrow')].map((e) => e.textContent.trim() + (e.querySelector('input').checked ? '*' : '')));
    check(rows.join('|') === 'None*|★|★★|★★★', `${t} the chooser: ☐ None / ★ / ★★ / ★★★ with tick boxes, None ticked for an item with no stars`, rows.join('|'));
    await act(d, vp, '#mb input[data-n="2"]'); await sleep(300);
    const r2 = await on(d, () => [...document.querySelectorAll('#mb .jl-pkrow')].map((e) => (e.querySelector('input').checked ? '*' : '-')).join(''));
    check((await item(d, 'd4')).stars === 2 && r2 === '--*-' && (await starsOn(d, 'd4')) === 2, `${t} ticking ★★ sets 2, ticks only that row, and the row behind it shows two stars`, r2);
    await act(d, vp, '#mb input[data-n="3"]'); await sleep(250);
    check((await item(d, 'd4')).stars === 3, `${t} ticking ★★★ replaces it with 3`);
    await act(d, vp, '#mb input[data-n="0"]'); await sleep(250);
    check(!('stars' in (await item(d, 'd4'))), `${t} ticking None clears it`);
    await act(d, vp, '#jk-st-done'); await sleep(250);
    check(!(await on(d, () => document.getElementById('ov').classList.contains('on'))), `${t} Done closes the chooser`);
    noErr(d, t);
  });

  /* ══ 72b — topics, group by, sort ══ */
  if (want('72b')) await each(async (d, vp) => {
    const t = `72b@${vp.name}`;
    await openPanel(d, vp);
    check((await ids(d)) === 'd1+d2+d3+d4+d5+d6', `${t} the default view lists the pocket in its own order (newest on top): ${await ids(d)}`);
    const chips = await on(d, () => [...document.querySelectorAll('#jeb-panel .jeb-it[data-iid="d2"] .jc-tp')].map((e) => e.textContent));
    check(chips.join() === '# Garden,# Water', `${t} topic chips read "# topic"`, chips.join());
    await menuItem(d, vp, 'd4', 'Topic'); await modalOpen(d); await sleep(200);
    const names = await on(d, () => [...document.querySelectorAll('#mb .jl-pkrow')].map((e) => e.textContent.trim() + (e.querySelector('input').checked ? '*' : '')));
    check(names.join('|') === 'Garden|Media|Water' && (await on(d, () => !!document.querySelector('#mb #jl-pk-in') && !!document.querySelector('#mb #jl-pk-done'))), `${t} the picker lists the names used in this pocket, each with a tick box, plus New… and Done`, names.join('|'));
    await act(d, vp, '#mb input[data-n="Media"]'); await sleep(300);
    check(JSON.stringify((await item(d, 'd4')).topics) === '["Media"]', `${t} ticking Media sets topics`, JSON.stringify(await item(d, 'd4')));
    await act(d, vp, '#jl-pk-done'); await sleep(250);
    await menuItem(d, vp, 'd5', 'Topic'); await modalOpen(d);
    await act(d, vp, '#jl-pk-in'); await d.page.keyboard.type('Home'); await act(d, vp, '#jl-pk-add'); await sleep(300);
    check(JSON.stringify((await item(d, 'd5')).topics) === '["Home"]', `${t} New… adds a topic and ticks it`, JSON.stringify((await item(d, 'd5')).topics));
    await act(d, vp, '#mb input[data-n="Home"]'); await sleep(250);
    check(!('topics' in (await item(d, 'd5'))), `${t} unticking the last topic removes the key`, JSON.stringify(await item(d, 'd5')));
    check(!(await on(d, () => !!document.querySelector('#mb input[data-n="Home"]'))), `${t} a topic no item uses any more is no longer listed`);
    await act(d, vp, '#jl-pk-in'); await d.page.keyboard.type('Home'); await d.page.keyboard.press('Enter'); await sleep(300);
    check(JSON.stringify((await item(d, 'd5')).topics) === '["Home"]', `${t} New… + Enter adds it again`);
    await act(d, vp, '#jl-pk-done'); await sleep(250);
    /* the view bar */
    const bar = await on(d, () => [...document.querySelectorAll('#jeb-panel .ji-bar button')].map((e) => e.textContent + (e.classList.contains('on') ? '*' : '')).join('|'));
    check(bar === 'Newest*|★ Stars|None*|Topic', `${t} the view bar: Sort Newest | ★ Stars, Group by None | Topic`, bar);
    await act(d, vp, '#jeb-panel .ji-gb[data-v="topic"]'); await sleep(350);
    const g = await igroups(d);
    check(g === 'Garden 2:d1+d2 | Home 1:d5 | Media 2:d3+d4 | Water 1:d2 | No topic yet 1:d6', `${t} Group by Topic: one group per topic with counts, d2 under both Garden and Water, "No topic yet" last: ${g}`, g);
    await act(d, vp, '#jeb-panel .ji-sb[data-v="stars"]'); await sleep(350);
    await act(d, vp, '#jeb-panel .ji-gb[data-v="none"]'); await sleep(350);
    check((await ids(d)) === 'd1+d5+d2+d3+d4+d6', `${t} Sort ★ Stars, no grouping: stars high to low, ties in the pocket's order: ${await ids(d)}`);
    const st = await on(d, () => JSON.stringify(DB.theme.zabIdeaView));
    check(JSON.parse(st)['jp-idea'].s === 'stars' && JSON.parse(st)['jp-idea'].g === 'none', `${t} stored per pocket in DB.theme.zabIdeaView`, st);
    await act(d, vp, '#jeb-panel .ji-gb[data-v="topic"]'); await sleep(350);
    await act(d, vp, '#jeb-panel .ji-sb[data-v="new"]'); await sleep(350);
    await act(d, vp, '#jeb-panel .ji-sb[data-v="stars"]'); await sleep(350);
    await reload(d); await openPanel(d, vp);
    const after = await on(d, () => [...document.querySelectorAll('#jeb-panel .ji-bar button.on')].map((e) => e.textContent).join('|'));
    check(after === '★ Stars|Topic' && (await igroups(d)).startsWith('Garden 2:d1+d2 | Home 1:d5'), `${t} both choices survive a reload (${after}): ${await igroups(d)}`);
    await closePanel(d, vp); await openPanel(d, vp, 'jp-shop');
    check((await on(d, () => document.querySelectorAll('#jeb-panel .ji-bar').length)) === 0, `${t} another pocket (Shopping) has no Ideas bar`);
    await closePanel(d, vp);
    await act(d, vp, '#jeb-bar .jeb-chip.jeb-all .jeb-main'); await d.page.waitForSelector('#jeb-panel.on'); await sleep(400);
    check((await on(d, () => document.querySelectorAll('#jeb-panel .ji-bar, #jeb-panel .js-filters').length)) === 0, `${t} "All pockets" has no view bar and no filter row`);
    noErr(d, t);
  });

  /* ══ 72c — quantity ══ */
  if (want('72c')) await each(async (d, vp) => {
    const t = `72c@${vp.name}`;
    await openPanel(d, vp, 'jp-shop');
    const chipOf = (id) => on(d, (i) => { const e = document.querySelector('#jeb-panel .jeb-it[data-iid="' + i + '"] .jk-q'); return e && e.textContent; }, id);
    check((await chipOf('s1')) === '2' && (await chipOf('s2')) === '500 g' && (await chipOf('s3')) === '＋ Qty', `${t} the chip shows the quantity, or "＋ Qty" when there is none`, [await chipOf('s1'), await chipOf('s2'), await chipOf('s3')].join(' / '));
    await act(d, vp, '#jeb-panel .jeb-it[data-iid="s3"] .jk-q'); await d.page.waitForSelector('#jeb-panel .jk-qin'); await sleep(150);
    check(await on(d, () => document.activeElement && document.activeElement.classList.contains('jk-qin')), `${t} tapping the chip opens a small text field with the caret in it`);
    await d.page.keyboard.type('1 dozen'); await d.page.keyboard.press('Enter'); await sleep(350);
    check((await item(d, 's3')).qty === '1 dozen' && (await chipOf('s3')) === '1 dozen' && !(await on(d, () => !!document.querySelector('#jeb-panel .jk-qin'))), `${t} Enter saves "1 dozen", the field turns back into a chip`, JSON.stringify(await item(d, 's3')));
    await act(d, vp, '#jeb-panel .jeb-it[data-iid="s3"] .jk-q'); await d.page.waitForSelector('#jeb-panel .jk-qin');
    await d.page.keyboard.press('Control+A'); await d.page.keyboard.type('6'); await act(d, vp, '#jeb-panel .jeb-pt'); await sleep(350);
    check((await item(d, 's3')).qty === '6' && (await chipOf('s3')) === '6', `${t} changing it and tapping away (blur) saves "6"`, JSON.stringify(await item(d, 's3')));
    await act(d, vp, '#jeb-panel .jeb-it[data-iid="s3"] .jk-q'); await d.page.waitForSelector('#jeb-panel .jk-qin');
    await d.page.keyboard.type('zzz'); await d.page.keyboard.press('Escape'); await sleep(300);
    check((await item(d, 's3')).qty === '6' && (await on(d, () => document.getElementById('jeb-panel').classList.contains('on'))), `${t} Escape cancels the edit and leaves the panel open`, JSON.stringify(await item(d, 's3')));
    await act(d, vp, '#jeb-panel .jeb-it[data-iid="s3"] .jk-q'); await d.page.waitForSelector('#jeb-panel .jk-qin');
    await d.page.keyboard.press('Control+A'); await d.page.keyboard.press('Backspace'); await d.page.keyboard.press('Enter'); await sleep(350);
    check(!('qty' in (await item(d, 's3'))) && (await chipOf('s3')) === '＋ Qty', `${t} an empty field clears it (the key is gone, the chip is "＋ Qty" again)`, JSON.stringify(await item(d, 's3')));
    /* a repaint is never drawn under the open field */
    await act(d, vp, '#jeb-panel .jeb-it[data-iid="s5"] .jk-q'); await d.page.waitForSelector('#jeb-panel .jk-qin');
    await on(d, () => { jebEditItem('s1', { qty: '3' }); jebRefresh(); }); await sleep(300);
    check(await on(d, () => document.activeElement && document.activeElement.classList.contains('jk-qin')), `${t} a change arriving while the field is open does not take the caret away`);
    await d.page.keyboard.type('4'); await d.page.keyboard.press('Enter'); await sleep(350);
    check((await item(d, 's5')).qty === '4' && (await chipOf('s1')) === '3', `${t} ...and both land`, JSON.stringify([await item(d, 's5'), await chipOf('s1')]));
    /* from the ⋯ menu */
    await act(d, vp, '#jeb-panel .jeb-it[data-iid="s2"] .jeb-more'); await d.page.waitForSelector('#jeb-menu');
    const menu = await on(d, () => [...document.querySelectorAll('#jeb-menu .jm')].map((e) => e.textContent));
    check(menu.includes('🔢 Quantity…') && menu.includes('🏪 Shop…'), `${t} the ⋯ menu of a shopping item carries "🔢 Quantity…" and "🏪 Shop…"`, menu.join(' / '));
    await act(d, vp, '#jeb-menu .jm:has-text("Quantity")'); await d.page.waitForSelector('#jeb-panel .jk-qin'); await sleep(150);
    await d.page.keyboard.press('Control+A'); await d.page.keyboard.type('750 g'); await d.page.keyboard.press('Enter'); await sleep(350);
    check((await item(d, 's2')).qty === '750 g', `${t} ⋯ → Quantity… edits it in place too`, JSON.stringify(await item(d, 's2')));
    noErr(d, t);
  });

  /* ══ 72d — shop ══ */
  if (want('72d')) await each(async (d, vp) => {
    const t = `72d@${vp.name}`;
    await openPanel(d, vp, 'jp-shop');
    const chipOf = (id) => on(d, (i) => { const e = document.querySelector('#jeb-panel .jeb-it[data-iid="' + i + '"] .jk-s'); return e && e.textContent; }, id);
    check((await chipOf('s1')) === '🏪 Coles' && (await chipOf('s3')) === '🏪 Shop', `${t} the shop chip reads "🏪 shop" (or "🏪 Shop" when none)`, [await chipOf('s1'), await chipOf('s3')].join(' / '));
    await act(d, vp, '#jeb-panel .jeb-it[data-iid="s3"] .jk-s'); await modalOpen(d); await sleep(200);
    const names = await on(d, () => [...document.querySelectorAll('#mb .jl-pkrow')].map((e) => e.textContent.trim() + (e.querySelector('input').checked ? '*' : '')));
    check(names.join('|') === 'Aldi|Coles', `${t} the picker (the same one Person/Topic use) lists the shops used in this pocket with tick boxes`, names.join('|'));
    await act(d, vp, '#mb input[data-n="Aldi"]'); await sleep(250);
    check((await item(d, 's3')).shop === 'Aldi', `${t} ticking Aldi sets the shop`);
    await act(d, vp, '#mb input[data-n="Coles"]'); await sleep(250);
    const two = await on(d, () => [...document.querySelectorAll('#mb .jl-pkrow')].map((e) => (e.querySelector('input').checked ? '*' : '-')).join(''));
    check((await item(d, 's3')).shop === 'Coles' && two === '-*', `${t} ticking Coles REPLACES Aldi (one shop per item): ${two}`, JSON.stringify(await item(d, 's3')));
    await act(d, vp, '#jl-pk-in'); await d.page.keyboard.type('Woolies'); await act(d, vp, '#jl-pk-add'); await sleep(250);
    check((await item(d, 's3')).shop === 'Woolies', `${t} New… sets a new shop and replaces the old`, JSON.stringify(await item(d, 's3')));
    await act(d, vp, '#mb input[data-n="Woolies"]'); await sleep(250);
    check(!('shop' in (await item(d, 's3'))), `${t} unticking it clears the shop (the key is gone)`);
    await act(d, vp, '#mb input[data-n="Coles"]'); await sleep(250);
    await act(d, vp, '#jl-pk-done'); await sleep(250);
    /* the filter row */
    const row = await on(d, () => [...document.querySelectorAll('#jeb-panel .js-fc')].map((e) => e.textContent + (e.classList.contains('on') ? '*' : '')).join('|'));
    check(row === 'All*|Aldi|Coles', `${t} the 🏪 Shop row: All + each shop used in this pocket`, row);
    check((await shopView(d)) === 's1+s3+s2+s5 / In the basket (1): s4' || (await shopView(d)) === 's1+s2+s3+s5 / In the basket (1): s4', `${t} All shows everything: ${await shopView(d)}`);
    await act(d, vp, '#jeb-panel .js-fc[data-fv="Coles"]'); await sleep(350);
    check((await shopView(d)) === 's1+s3 / In the basket (1): s4', `${t} Coles narrows the list (basket included): ${await shopView(d)}`);
    await act(d, vp, '#jeb-panel .js-fc[data-fv="Aldi"]'); await sleep(350);
    check((await shopView(d)) === 's2 / no basket: -', `${t} Aldi narrows it to s2: ${await shopView(d)}`);
    const sv = await on(d, () => JSON.stringify(DB.theme.zabShopView));
    check(JSON.parse(sv)['jp-shop'].f === 'Aldi', `${t} the choice is stored per pocket in DB.theme.zabShopView`, sv);
    await reload(d); await openPanel(d, vp, 'jp-shop');
    check((await shopView(d)) === 's2 / no basket: -', `${t} ...and kept over a reload: ${await shopView(d)}`);
    await on(d, () => { jebEditItem('s2', { shop: '' }); jebRefresh(); }); await sleep(350);
    check((await ids(d)).split('+').length === 5, `${t} when nothing uses the chosen shop any more the list falls back to All: ${await ids(d)}`);
    noErr(d, t);
  });

  /* ══ 72e — the basket ══ */
  if (want('72e')) await each(async (d, vp) => {
    const t = `72e@${vp.name}`;
    await openPanel(d, vp, 'jp-shop');
    check((await shopView(d)) === 's1+s2+s3+s5 / In the basket (1): s4', `${t} ticked items sit under "In the basket (n)", unticked ones keep their order above: ${await shopView(d)}`);
    await act(d, vp, '#jeb-panel .jeb-it[data-iid="s3"] .jeb-tick'); await sleep(400);
    check((await shopView(d)) === 's1+s2+s5 / In the basket (2): s4+s3', `${t} ticking Eggs drops it under the header: ${await shopView(d)}`);
    const vis = await on(d, () => { const e = document.querySelector('#jeb-panel .jeb-it[data-iid="s3"]'); const r = e.getBoundingClientRect(); const cs = getComputedStyle(e.querySelector('.jeb-tx')); return { shown: r.height > 0 && cs.display !== 'none', line: cs.textDecorationLine, folded: !!document.querySelector('#jeb-panel .js-basket[aria-expanded]') }; });
    check(vis.shown && /line-through/.test(vis.line) && !vis.folded, `${t} the ticked item is still visible, struck through, and the basket is not folded`, JSON.stringify(vis));
    await act(d, vp, '#jeb-panel .jeb-it[data-iid="s3"] .jeb-tick'); await sleep(400);
    check((await shopView(d)) === 's1+s2+s3+s5 / In the basket (1): s4', `${t} unticking returns it to its old place: ${await shopView(d)}`);
    check(/Clear basket \(1\)/.test(await on(d, () => document.querySelector('#jeb-panel .jeb-foot').textContent)) && !/Clear done/.test(await on(d, () => document.querySelector('#jeb-panel .jeb-foot').textContent)), `${t} the footer says "🧹 Clear basket (1)", not Clear done`);
    await act(d, vp, '#jeb-panel .jeb-it[data-iid="s2"] .jeb-tick'); await sleep(300);
    await act(d, vp, '#jeb-panel .jeb-foot [data-act="clear"]'); await sleep(450);
    const tr = await on(d, () => DB.trash.filter((x) => x.type === 'jebItem').map((x) => ({ id: x.id, item: x.item.id, qty: x.item.qty, shop: x.item.shop, done: x.item.done })));
    check(tr.length === 2 && tr.some((x) => x.item === 's2' && x.qty === '500 g' && x.shop === 'Aldi') && tr.some((x) => x.item === 's4'), `${t} Clear basket sends the ticked items to Trash with their quantity and shop`, JSON.stringify(tr));
    check((await ids(d)) === 's1+s3+s5' && (await on(d, () => document.querySelector('#jeb-panel .jeb-foot').textContent.trim())) === '', `${t} they are gone from the list and the footer is empty: ${await ids(d)}`);
    const tombs = await on(d, () => ['s2', 's4'].map((i) => !!DB.jeb.find((x) => x.id === i)).join());
    check(tombs === 'false,false', `${t} out of DB.jeb`, tombs);
    for (const x of tr) await on(d, (id) => { restoreItem(id); }, x.id);
    await sleep(500);
    const back = await item(d, 's2');
    check(back && back.qty === '500 g' && back.shop === 'Aldi' && back.done === true && !!(await item(d, 's4')), `${t} restoring from Trash brings them back, fields intact`, JSON.stringify(back));
    check((await shopView(d)).includes('In the basket (2)'), `${t} ...and they are in the basket again: ${await shopView(d)}`);
    await closePanel(d, vp); await openPanel(d, vp, 'jp-idea');
    await act(d, vp, '#jeb-panel .jeb-it[data-iid="d3"] .jeb-tick'); await sleep(300);
    check(/Clear done \(1\)/.test(await on(d, () => document.querySelector('#jeb-panel .jeb-foot').textContent)), `${t} an Ideas pocket keeps "Clear done"`);
    noErr(d, t);
  });

  /* ══ 72f — quick typing ══ */
  if (want('72f')) await each(async (d, vp) => {
    const t = `72f@${vp.name}`;
    await openPanel(d, vp, 'jp-shop');
    const hint = await on(d, () => { const h = document.querySelector('#jeb-panel .jt-hint'); return { shown: !h.hidden, text: h.textContent }; });
    check(hint.shown && /@/.test(hint.text) && /quantity/.test(hint.text), `${t} the first time, a one-line hint under the add box`, JSON.stringify(hint));
    await sleep(300);
    check((await on(d, () => DB.theme.zabShopHint)) === 1, `${t} ...and DB.theme.zabShopHint remembers it was shown`);
    const find = (txt) => on(d, (x) => JSON.parse(JSON.stringify(DB.jeb.filter((i) => i.pocketId === 'jp-shop' && i.text === x)[0] || null)), txt);
    await typeAdd(d, vp, '2 milk'); let a = await find('milk');
    check(a && a.qty === '2' && !('shop' in a), `${t} "2 milk" → text "milk", qty "2"`, JSON.stringify(a));
    await typeAdd(d, vp, '500g flour @Coles'); a = await find('flour');
    check(a && a.qty === '500 g' && a.shop === 'Coles', `${t} "500g flour @Coles" → text "flour", qty "500 g", shop "Coles"`, JSON.stringify(a));
    await typeAdd(d, vp, '500 g rice'); a = await find('rice');
    check(a && a.qty === '500 g', `${t} "500 g rice" → qty "500 g"`, JSON.stringify(a));
    await typeAdd(d, vp, '1 dozen eggs'); a = await find('eggs');
    check(a && a.qty === '1 dozen', `${t} "1 dozen eggs" → qty "1 dozen"`, JSON.stringify(a));
    await typeAdd(d, vp, 'oranges @Aldi'); a = await find('oranges');
    check(a && a.shop === 'Aldi' && !('qty' in a), `${t} "oranges @Aldi" → shop only`, JSON.stringify(a));
    await typeAdd(d, vp, 'eggs'); const e2 = await on(d, () => JSON.parse(JSON.stringify(DB.jeb.filter((i) => i.pocketId === 'jp-shop' && i.text === 'eggs' && !i.qty)[0] || null)));
    check(e2 && !('qty' in e2) && !('shop' in e2), `${t} "eggs" stays plain`, JSON.stringify(e2));
    await typeAdd(d, vp, '2 lemons'); a = await find('lemons');
    check(a && a.qty === '2', `${t} "2 lemons" is not mistaken for "2 l"`, JSON.stringify(a));
    await typeAdd(d, vp, '@Coles'); await typeAdd(d, vp, '12');
    const lit = await on(d, () => ['@Coles', '12'].map((s) => DB.jeb.find((x) => x.pocketId === 'jp-shop' && x.text === s && !x.qty && !x.shop) ? 1 : 0).join(''));
    check(lit === '11', `${t} a marker with no text left ("@Coles", "12") stays literal`, lit);
    const first = await item(d, (await on(d, () => DB.jeb.filter((i) => i.pocketId === 'jp-shop').sort((x, y) => x.order - y.order)[0].id)));
    check(first.text === '12', `${t} new items go on top`, first.text);
    await closePanel(d, vp); await openPanel(d, vp, 'jp-shop');
    check(await on(d, () => document.querySelector('#jeb-panel .jt-hint').hidden), `${t} closing and reopening: the hint does not come back`);
    /* a plain pocket (and Ideas) takes it literally */
    const pid = await on(d, () => { const id = jebAddPocket('Plainy', '✎', '#CFE8FF'); jebRefresh(); return id; }); await sleep(300);
    await closePanel(d, vp); await openPanel(d, vp, pid);
    await typeAdd(d, vp, '2 milk @Coles');
    const lit2 = await on(d, (p) => JSON.parse(JSON.stringify(DB.jeb.find((x) => x.pocketId === p))), pid);
    check(lit2 && lit2.text === '2 milk @Coles' && !('qty' in lit2) && !('shop' in lit2), `${t} in a plain pocket the same words stay literal`, JSON.stringify(lit2));
    check(await on(d, () => document.querySelector('#jeb-panel .jt-hint').hidden), `${t} no hint in a plain pocket`);
    await closePanel(d, vp); await openPanel(d, vp, 'jp-idea');
    await typeAdd(d, vp, '3 ideas @home');
    const lit3 = await on(d, () => DB.jeb.find((x) => x.pocketId === 'jp-idea' && /^3 ideas/.test(x.text)));
    check(lit3 && lit3.text === '3 ideas @home' && !('qty' in lit3) && !('shop' in lit3), `${t} in Ideas the same words stay literal`, JSON.stringify(lit3));
    noErr(d, t);
  });

  /* ══ 72g — the rest ══ */
  if (want('72g')) {
    await each(async (d, vp) => {
      const t = `72g@${vp.name}`;
      /* → Note, Ideas */
      await openPanel(d, vp);
      await act(d, vp, '#jeb-panel .jeb-it[data-iid="d1"] .jeb-note-b'); await sleep(700);
      let note = await on(d, () => { const n = DB.articles.find((a) => a.fromJeb && a.title === 'Solar fence'); return n && { c: n.content, gone: !DB.jeb.some((x) => x.id === 'd1') }; });
      check(note && note.gone && note.c.includes('<p>★★★ · # Garden</p>'), `${t} → Note (idea): the text, then "★★★ · # Garden"`, note && note.c);
      await d.page.evaluate(() => { document.querySelectorAll('.toast-act').forEach((x) => x.remove()); });
      if (!(await on(d, () => document.getElementById('jeb-panel').classList.contains('on')))) await openPanel(d, vp);
      await act(d, vp, '#jeb-panel .jeb-it[data-iid="d2"] .jeb-note-b'); await sleep(700);
      note = await on(d, () => { const n = DB.articles.find((a) => a.fromJeb && a.title === 'Rain tank'); return n && n.content; });
      check(note && note.includes('<p>★ · # Garden, # Water</p>'), `${t} → Note (idea): "★ · # Garden, # Water"`, note);
      await d.page.evaluate(() => { document.querySelectorAll('.toast-act').forEach((x) => x.remove()); });
      /* → Note, Shopping */
      await closePanel(d, vp).catch(() => {}); await openPanel(d, vp, 'jp-shop');
      await act(d, vp, '#jeb-panel .jeb-it[data-iid="s2"] .jeb-note-b'); await sleep(700);
      const sn = await on(d, () => { const n = DB.articles.find((a) => a.fromJeb && /Flour/.test(a.title)); return n && { title: n.title, c: n.content }; });
      check(sn && sn.title === '500 g Flour' && sn.c.includes('<p>🏪 Aldi</p>'), `${t} → Note (shopping): "qty text" as the title, then "🏪 shop"`, JSON.stringify(sn));
      await d.page.evaluate(() => { document.querySelectorAll('.toast-act').forEach((x) => x.remove()); });
      noErr(d, t);
    });
    await each(async (d, vp) => {
      const t = `72g-all@${vp.name}`;
      await act(d, vp, '#jeb-bar .jeb-chip.jeb-all .jeb-main'); await d.page.waitForSelector('#jeb-panel.on'); await sleep(500);
      const m = await on(d, () => {
        const q = (p, s) => document.querySelectorAll('#jeb-panel .jeb-gl[data-pid="' + p + '"] ' + s).length;
        const ids = (p) => [...document.querySelectorAll('#jeb-panel .jeb-gl[data-pid="' + p + '"] .jeb-it')].map((e) => e.dataset.iid).join('+');
        return { stars: q('jp-idea', '.ji-star'), chips: q('jp-idea', '.jc-tp'), qty: q('jp-shop', '.jk-q'), shop: q('jp-shop', '.jk-s'), shopIds: ids('jp-shop'), bar: document.querySelectorAll('#jeb-panel .ji-bar,#jeb-panel .js-filters').length };
      });
      check(m.stars === 18 && m.chips === 4 && m.qty === 5 && m.shop === 5 && m.bar === 0, `${t} "All pockets": stars and topic chips under each idea, quantity and shop chips under each shopping item, no view bar`, JSON.stringify(m));
      check(m.shopIds === 's1+s2+s3+s5+s4', `${t} ...and the shopping group lists the ticked item last: ${m.shopIds}`);
      await act(d, vp, '#jeb-panel .jeb-it[data-iid="d4"] .ji-star[data-n="2"]'); await sleep(300);
      check((await item(d, 'd4')).stars === 2, `${t} a star tapped in "All pockets" lands`);
      noErr(d, t);
    });
    await each(async (d, vp) => {
      const t = `72g-deck@${vp.name}`;
      await openPanel(d, vp); await act(d, vp, '#jeb-panel .jeb-px'); await d.page.waitForSelector('#jeb-deck.on .jeb-card'); await sleep(700);
      const dk = await on(d, () => { const c = document.querySelector('#jeb-deck .jeb-card[data-iid="d2"]'); return { stars: c.querySelectorAll('.ji-star.on').length, chips: [...c.querySelectorAll('.jc-tp')].map((e) => e.textContent).join(), under: c.querySelector('.jk-meta').offsetTop >= c.querySelector('.jeb-tx').offsetTop + c.querySelector('.jeb-tx').offsetHeight - 1, none: !document.querySelector('#jeb-deck .jeb-card[data-iid="d4"] .jk-meta') }; });
      check(dk.stars === 1 && dk.chips === '# Garden,# Water' && dk.under && dk.none, `${t} an idea card shows its stars and topic chips under the text (and nothing for an idea with neither)`, JSON.stringify(dk));
      await act(d, vp, '#jeb-deck .jeb-card[data-iid="d2"] .ji-star[data-n="3"]'); await sleep(300);
      check((await item(d, 'd2')).stars === 3, `${t} a star tapped on a card lands`);
      await act(d, vp, '#jeb-deck .jeb-card[data-iid="d4"] .jeb-more'); await d.page.waitForSelector('#jeb-menu');
      check((await on(d, () => [...document.querySelectorAll('#jeb-menu .jm')].map((e) => e.textContent))).includes('★ Stars…'), `${t} the card's ⋯ menu has ★ Stars… (so a card with no stars can get some)`);
      await d.page.keyboard.press('Escape'); await sleep(200);
      await on(d, () => { jebCloseDeck(); }); await sleep(300);
      await openPanel(d, vp, 'jp-shop'); await act(d, vp, '#jeb-panel .jeb-px'); await d.page.waitForSelector('#jeb-deck.on .jeb-card'); await sleep(700);
      const sd = await on(d, () => { const c = document.querySelector('#jeb-deck .jeb-card[data-iid="s2"]'); return { q: c.querySelector('.jc-q') && c.querySelector('.jc-q').textContent, s: c.querySelector('.jc-sh') && c.querySelector('.jc-sh').textContent, order: [...document.querySelectorAll('#jeb-deck .jeb-card')].map((e) => e.dataset.iid).join('+') }; });
      check(sd.q === '500 g' && sd.s === '🏪 Aldi' && sd.order === 's1+s2+s3+s5+s4', `${t} a shopping card shows quantity and shop chips; the ticked card is last`, JSON.stringify(sd));
      await act(d, vp, '#jeb-deck .jeb-card[data-iid="s3"] .jeb-more'); await d.page.waitForSelector('#jeb-menu');
      await act(d, vp, '#jeb-menu .jm:has-text("Quantity")'); await modalOpen(d); await sleep(200);
      await d.page.keyboard.type('9'); await d.page.keyboard.press('Enter'); await sleep(350);
      check((await item(d, 's3')).qty === '9', `${t} ⋯ → Quantity… on a card uses the app's dialog and saves`, JSON.stringify(await item(d, 's3')));
      noErr(d, t);
    });
    await each(async (d, vp) => {
      const t = `72g-move@${vp.name}`;
      const plain = await on(d, () => { const id = jebAddPocket('Plainy', '✎', '#CFE8FF'); jebRefresh(); return id; }); await sleep(300);
      await openPanel(d, vp);
      /* Attach */
      await act(d, vp, '#jeb-panel .jeb-it[data-iid="d1"] .jeb-att-b'); await d.page.waitForSelector('#jeb-att'); await sleep(200);
      await act(d, vp, '#jeb-att [data-tab="journal"]'); await act(d, vp, '#jeb-att .ja-row[data-journal]'); await sleep(300);
      const a1 = await item(d, 'd1');
      check(a1.journal === true && a1.stars === 3 && a1.topics.join() === 'Garden', `${t} 📎 Attach (Journal) works on an idea and its stars and topics stay`, JSON.stringify(a1));
      await act(d, vp, '#jeb-att .ja-x'); await sleep(200);
      /* Ideas → plain and back */
      await menuItem(d, vp, 'd1', 'Move to pocket'); await act(d, vp, '#jeb-menu .jm:has-text("Plainy")'); await sleep(400);
      const mv = await item(d, 'd1');
      check(mv.pocketId === plain && mv.stars === 3 && mv.topics.join() === 'Garden', `${t} Move to a plain pocket: nothing is stripped from the idea (I1)`, JSON.stringify(mv));
      await closePanel(d, vp); await openPanel(d, vp, plain);
      const pl = await on(d, () => ({ row: !!document.querySelector('#jeb-panel .jeb-it[data-iid="d1"]'), shown: document.querySelectorAll('#jeb-panel .ji-star,#jeb-panel .jc-tp,#jeb-panel .jk-q,#jeb-panel .jk-s,#jeb-panel .ji-bar').length }));
      check(pl.row && pl.shown === 0, `${t} in a plain pocket the stars and topics are kept but not shown`, JSON.stringify(pl));
      await on(d, (p) => { jebMoveItem('d1', 'jp-idea', 0); }, plain); await sleep(300);
      await closePanel(d, vp); await openPanel(d, vp);
      check((await starsOn(d, 'd1')) === 3 && (await on(d, () => document.querySelectorAll('#jeb-panel .jeb-it[data-iid="d1"] .jc-tp').length)) === 1, `${t} moved back, the three stars and the topic chip show again`);
      /* Shopping → Ideas and back; a task into Shopping */
      await on(d, () => { jebMoveItem('s2', 'jp-idea', 0); jebMoveItem('t1', 'jp-shop', 0); jebRefresh(); }); await sleep(300);
      const s2 = await item(d, 's2'), t1 = await item(d, 't1');
      check(s2.qty === '500 g' && s2.shop === 'Aldi' && t1.due === '2026-12-01' && t1.pri === 1 && t1.steps.length === 1, `${t} a shopping item moved into Ideas and a task moved into Shopping keep every field`, JSON.stringify({ s2, t1 }));
      const shown = await on(d, () => document.querySelectorAll('#jeb-panel .jeb-it[data-iid="s2"] .jk-q,#jeb-panel .jeb-it[data-iid="s2"] .jk-s').length);
      check(shown === 0, `${t} ...and Ideas draws no quantity or shop on it`, String(shown));
      await closePanel(d, vp); await openPanel(d, vp, 'jp-shop');
      const tk = await on(d, () => { const r = document.querySelector('#jeb-panel .jeb-it[data-iid="t1"]'); return r && { due: !!r.querySelector('.jt-due'), flag: !!r.querySelector('.jt-flag'), cnt: !!r.querySelector('.jt-cnt'), qty: !!r.querySelector('.jk-q') }; });
      check(tk && !tk.due && !tk.flag && !tk.cnt && tk.qty, `${t} a task in Shopping is drawn as a shopping row (no date, flag or counter)`, JSON.stringify(tk));
      await on(d, () => { jebMoveItem('s2', 'jp-shop', 0); jebMoveItem('t1', 'jp-task', 0); jebRefresh(); }); await sleep(300);
      await closePanel(d, vp); await openPanel(d, vp, 'jp-shop');
      check((await on(d, () => document.querySelector('#jeb-panel .jeb-it[data-iid="s2"] .jk-q').textContent)) === '500 g' && (await on(d, () => document.querySelector('#jeb-panel .jeb-it[data-iid="s2"] .jk-s').textContent)) === '🏪 Aldi', `${t} moved back, the quantity and shop show again`);
      /* Trash and restore */
      await menuItem(d, vp, 's2', 'Delete'); await sleep(400);
      const tr = await on(d, () => { const e = DB.trash.find((x) => x.type === 'jebItem' && x.item.id === 's2'); return e && { id: e.id, qty: e.item.qty, shop: e.item.shop }; });
      check(tr && tr.qty === '500 g' && tr.shop === 'Aldi' && !(await item(d, 's2')), `${t} Delete sends it to Trash with quantity and shop`, JSON.stringify(tr));
      await on(d, (id) => { restoreItem(id); }, tr.id); await sleep(400);
      const rs = await item(d, 's2');
      check(rs && rs.qty === '500 g' && rs.shop === 'Aldi', `${t} restoring brings every field back`, JSON.stringify(rs));
      await closePanel(d, vp); await openPanel(d, vp);
      await menuItem(d, vp, 'd2', 'Delete'); await sleep(400);
      const tr2 = await on(d, () => { const e = DB.trash.find((x) => x.type === 'jebItem' && x.item.id === 'd2'); return e && { id: e.id, stars: e.item.stars, topics: e.item.topics }; });
      await on(d, (id) => { restoreItem(id); }, tr2.id); await sleep(400);
      const rd = await item(d, 'd2');
      check(tr2 && tr2.stars === 1 && rd && rd.stars === 1 && rd.topics.join() === 'Garden,Water', `${t} an idea goes to Trash and back with its stars and topics`, JSON.stringify(rd));
      noErr(d, t);
    });
  }

  /* ══ 72h — layout ══ */
  if (want('72h')) {
    const cases = [...VPS.map((vp) => ({ vp, path: '/', tag: vp.name })), { vp: VPS[2], path: '/?jeb=1', tag: '1440-zab' }];
    for (const c of cases) {
      const d = await dev(makeCloud(), 'L' + c.tag, c.vp, seed((db) => { db.jeb.find((x) => x.id === 'd2').text = 'A longer idea that needs to wrap onto a couple of lines on a phone screen'; db.jeb.find((x) => x.id === 's2').shop = 'A long shop name'; }), { path: c.path });
      try {
        for (const pid of ['jp-idea', 'jp-shop']) {
          await openPanel(d, c.vp, pid);
          const m = await on(d, () => {
            const rows = [...document.querySelectorAll('#jeb-panel .jk-it')];
            const tops = rows.map((r) => { const a = r.querySelector('.jeb-att-b'), n = r.querySelector('.jeb-note-b'); return a && n ? [Math.round(a.getBoundingClientRect().top), Math.round(n.getBoundingClientRect().top)] : null; });
            const split = tops.filter((t) => !t || t[0] !== t[1]).length;
            const over = rows.filter((r) => r.scrollWidth > r.clientWidth).length;
            const bar = document.querySelector('#jeb-panel .ji-bar .jl-frow, #jeb-panel .js-filters .jl-frow');
            const bt = bar ? [...bar.children].map((e) => { const r = e.getBoundingClientRect(); return Math.round(r.top + r.height / 2); }) : [];
            const stars = [...document.querySelectorAll('#jeb-panel .ji-star')].filter((e) => { const r = e.getBoundingClientRect(); return r.width < 32 || r.height < 32; }).length;
            const hd = document.querySelector('#jeb-panel .jeb-ph').getBoundingClientRect().height;
            const pn = document.getElementById('jeb-panel');
            return { n: rows.length, split, over, bar: !!bar, barFits: bar ? bar.scrollWidth <= bar.clientWidth + 1 : false, oneLine: new Set(bt).size === 1, stars, hd: Math.round(hd), pw: pn.clientWidth, pover: pn.scrollWidth > pn.clientWidth + 1 };
          });
          check(m.n >= 5 && m.split === 0 && m.over === 0 && m.bar && m.barFits && m.oneLine && m.stars === 0 && m.hd <= 72 && !m.pover, `72h@${c.tag} ${pid === 'jp-idea' ? 'Ideas' : 'Shopping'} (panel ${m.pw}px): Attach and → Note on one line in all ${m.n} rows, no row overflows, the ${pid === 'jp-idea' ? 'Sort / Group by' : 'Shop'} bar fits on one line, the header is not wrapped (${m.hd}px)`, JSON.stringify(m));
          await closePanel(d, c.vp).catch(() => {});
        }
        noErr(d, '72h@' + c.tag);
      } finally { await d.ctx.close(); }
    }
  }

  /* ══ 72i — sync ══ */
  if (want('72i')) {
    const cloud = makeCloud();
    const A = await dev(cloud, 'A', VPS[2]), B = await dev(cloud, 'B', VPS[2]);
    try {
      await sleep(1500);
      await on(A, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.content += '<p>x</p>'; a.updatedAt = new Date().toISOString(); persist(); flushPendingPush(); });
      await sleep(800); await quiet(cloud, A); await quiet(cloud, B);
      await openPanel(A, VPS[2]); await openPanel(B, VPS[2]);
      await act(A, VPS[2], '#jeb-panel .jeb-it[data-iid="d4"] .ji-star[data-n="2"]'); await sleep(300);
      await menuItem(A, VPS[2], 'd4', 'Topic'); await modalOpen(A);
      await act(A, VPS[2], '#mb input[data-n="Media"]'); await sleep(250); await act(A, VPS[2], '#jl-pk-done'); await sleep(250);
      await on(A, () => { jebEditItem('s3', { qty: '2 kg', shop: 'Aldi' }); jebEditItem('d6', { topics: ['Zed'] }); });
      await sleep(300); await on(A, () => flushPendingPush()); await quiet(cloud, A);
      let ok = false; for (let i = 0; i < 60 && !ok; i++) { const x = await item(B, 'd4'), y = await item(B, 's3'); ok = !!x && x.stars === 2 && (x.topics || []).join() === 'Media' && !!y && y.qty === '2 kg' && y.shop === 'Aldi'; if (!ok) await sleep(500); }
      const x = await item(B, 'd4'), y = await item(B, 's3');
      check(ok, '72i stars and topics (set by real taps) and qty and shop set on A arrive on B', JSON.stringify({ x, y }));
      const shown = await on(B, () => { const r = document.querySelector('#jeb-panel .jeb-it[data-iid="d4"]'); return r ? r.querySelectorAll('.ji-star.on').length + ',' + [...r.querySelectorAll('.jc-tp')].map((e) => e.textContent).join() : 'row missing'; });
      check(shown === '2,# Media', '72i B\'s OPEN panel shows the stars and the topic chip live without a reload', shown);
      await on(B, () => { jebEditItem('d4', { stars: 0, topics: [] }); jebEditItem('s3', { qty: '', shop: '' }); }); await sleep(400); await quiet(cloud, B);
      let ok2 = false; for (let i = 0; i < 60 && !ok2; i++) { const p = await item(A, 'd4'), q = await item(A, 's3'); ok2 = !!p && !('stars' in p) && !('topics' in p) && !!q && !('qty' in q) && !('shop' in q); if (!ok2) await sleep(500); }
      check(ok2, '72i ...and B clearing them comes back to A', JSON.stringify([await item(A, 'd4'), await item(A, 's3')]));
      check(A.errors.length + B.errors.length === 0, '72i no page errors', [...A.errors, ...B.errors].slice(0, 2).join(' · '));
    } finally { await A.ctx.close(); await B.ctx.close(); }
  }

  /* ══ 72j — scale ══ */
  if (want('72j')) {
    const vp = VPS[0];
    for (const kind of ['jp-idea', 'jp-shop']) {
      const big = () => seed((db) => {
        db.jeb = [];
        for (let i = 0; i < 300; i++) {
          db.jeb.push(kind === 'jp-idea'
            ? mk('b' + i, kind, 'Idea number ' + i + ' with a fairly long line of text to wrap on a phone', i, { ...(i % 4 ? { stars: (i % 3) + 1 } : {}), ...(i % 3 === 0 ? { topics: ['Topic ' + (i % 7), 'Other'] } : {}) })
            : mk('b' + i, kind, 'Item number ' + i + ' with a fairly long line of text to wrap on a phone', i, { ...(i % 3 ? { qty: (i % 9) + ' kg' } : {}), ...(i % 2 ? { shop: 'Shop ' + (i % 5) } : {}), ...(i % 6 === 0 ? { done: true } : {}) }));
        }
      });
      const d = await dev(makeCloud(), 'S', vp, big());
      try {
        const cdp = await d.ctx.newCDPSession(d.page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        const times = [];
        for (let k = 0; k < 4; k++) {
          const ms = await d.page.evaluate((p) => new Promise((res) => {
            jebClosePanel(); const t0 = performance.now(); jebOpenPanel(p);
            requestAnimationFrame(() => requestAnimationFrame(() => res(Math.round(performance.now() - t0))));
          }), kind);
          times.push(ms); await sleep(300);
        }
        const rows = await on(d, () => document.querySelectorAll('#jeb-panel .jeb-it').length);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
        console.log('Z6C-SCALE ' + JSON.stringify({ kind, items: 300, times }));
        const med = [...times].sort((a, b) => a - b)[Math.floor(times.length / 2)];
        check(rows === 300 && med <= 300, `72j 300 ${kind === 'jp-idea' ? 'ideas' : 'shopping items'} at 390, CPU ×4: the panel paints in ≤ 300 ms, median of 4 (${times.join(' / ')} ms; median ${med})`, JSON.stringify({ rows, times }));
        noErr(d, '72j');
      } finally { await d.ctx.close(); }
    }
  }

  /* ══ 72k — contrast ══ */
  if (want('72k')) await each(async (d, vp) => {
    await openPanel(d, vp);
    const measure = (sel) => d.page.evaluate((S) => {
      const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
      const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
      const bgOf = (el) => { const layers = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; } } let base = { r: 255, g: 255, b: 255 }; for (let i = layers.length - 1; i >= 0; i--) { const c = layers[i]; base = { r: c.r * c.a + base.r * (1 - c.a), g: c.g * c.a + base.g * (1 - c.a), b: c.b * c.a + base.b * (1 - c.a) }; } return base; };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      let worst = 99, who = '', n = 0;
      document.querySelectorAll(S).forEach((e) => {
        const isIn = e.tagName === 'INPUT' && e.type !== 'checkbox' && (e.value || e.placeholder);
        if (!isIn && ![...e.childNodes].some((x) => x.nodeType === 3 && x.textContent.trim())) return;
        const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return;
        let fg = parse(cs.color), bg = bgOf(e);
        const comp = fg.a < 1 ? { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) } : fg;
        n++; const r = ratio(comp, bg); if (r < worst) { worst = r; who = e.className + ':' + (e.textContent || e.value || e.placeholder).trim().slice(0, 14); }
      });
      return { worst: Math.round(worst * 100) / 100, who, n };
    }, sel);
    const ideaText = '#jeb-panel .ji-star, #jeb-panel .jc-tp, #jeb-panel .ji-bar button, #jeb-panel .ji-bar .jl-fl, #jeb-panel .ji-gh, #jeb-panel .ji-gh *, #jeb-panel .ji-it .jeb-tx';
    const shopText = '#jeb-panel .jk-q, #jeb-panel .jk-s, #jeb-panel .js-fc, #jeb-panel .js-filters .jl-fl, #jeb-panel .js-basket, #jeb-panel .js-basket *, #jeb-panel .js-it .jeb-tx, #jeb-panel .jt-hint';
    const presets = ['forest', 'ocean', 'amber', 'indigo', 'rose'];
    /* make the group view and some filled stars so the group headers are on screen */
    await on(d, () => { jebEditItem('d4', { stars: 3 }); _jebIdeaSetView('jp-idea', { g: 'topic' }); _jebPanelSig = ''; jebRefresh(); }); await sleep(300);
    for (const p of presets) {
      await on(d, (k) => { applyPreset(k); }, p); await sleep(200);
      const m = await measure(ideaText);
      check(m.n >= 20 && m.worst >= 4.5, `72k@${vp.name} the Ideas text (${m.n} pieces: stars filled and empty, topic chips, Sort/Group by bar, group headers) clears 4.5:1 on ${p} (worst ${m.worst}, ${m.who})`, JSON.stringify(m));
    }
    await on(d, () => { applyPreset('forest'); setCustomColor('accent', '#F4E27A'); }); await sleep(200);
    const pm = await measure(ideaText);
    check(pm.worst >= 4.5, `72k@${vp.name} ...and on a pale custom accent (worst ${pm.worst}, ${pm.who})`, JSON.stringify(pm));
    await on(d, () => { applyPreset('forest'); }); await closePanel(d, vp); await openPanel(d, vp, 'jp-shop');
    for (const p of presets) {
      await on(d, (k) => { applyPreset(k); }, p); await sleep(200);
      const m = await measure(shopText);
      check(m.n >= 14 && m.worst >= 4.5, `72k@${vp.name} the Shopping text (${m.n} pieces: quantity and shop chips, filter row, "In the basket" header, struck-through basket items, hint) clears 4.5:1 on ${p} (worst ${m.worst}, ${m.who})`, JSON.stringify(m));
    }
    await on(d, () => { applyPreset('ocean'); jebOpenDeck({ ids: ['jp-idea'], all: false }); }); await sleep(700);
    const dk = await measure('#jeb-deck .jeb-card .jeb-tx, #jeb-deck .jeb-card .ji-star, #jeb-deck .jeb-card .jc-tp');
    check(dk.n >= 8 && dk.worst >= 4.5, `72k@${vp.name} the idea cards' text, stars and topic chips clear 4.5:1 (worst ${dk.worst}, ${dk.who})`, JSON.stringify(dk));
    await on(d, () => { jebOpenDeck({ ids: ['jp-shop'], all: false }); }); await sleep(700);
    const sk = await measure('#jeb-deck .jeb-card .jeb-tx, #jeb-deck .jeb-card .jc-q, #jeb-deck .jeb-card .jc-sh');
    check(sk.n >= 8 && sk.worst >= 4.5, `72k@${vp.name} the shopping cards' text, quantity and shop chips clear 4.5:1 (worst ${sk.worst}, ${sk.who})`, JSON.stringify(sk));
  });
} catch (e) {
  console.log(' FAIL  zab-z6c threw: ' + (e && e.stack || e));
  results.push({ ok: false, label: 'threw' });
} finally {
  await browser.close();
  await srv.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
