#!/usr/bin/env node
/* tools/jeb-j4.mjs — v05.03, J4: pockets as sticky cards, All pockets, ☑ Choose (checks 64a–64i).

   Every check runs at 390x844, 820x1180 and 1440x900 against a booted app, with real clicks / taps / typing /
   drags (a touch viewport TAPS and drags with real touch events, the 1440 one CLICKS and uses the mouse), and counts
   page errors. Data a check needs is seeded before boot.

   64a  ▦ on a chip opens the deck with exactly that pocket's cards in order; the name half still opens the panel;
        ▤ Panel and ▦ switch between the two for the same pocket
   64b  "All pockets" ▤ and ▦: every pocket, grouped, in order, right counts
   64c  ☑ Choose: tick 2 of 4; Cards (2) / Panel (2) show only those; ＋ on a group works; a tap opens nothing; Cancel
        restores the bar exactly
   64d  in the deck: tick, edit in place, 📎 Attach, → Note, ＋ Card, an empty ＋ Card is dropped, Clear done
   64e  drag: reorder inside a pocket, move into another pocket's group; persists across a reload and reaches device B
   64f  "Jump out": the start transform points at the card's own chip, ends at its place; staggered and capped;
        none of it (and no rotation) under prefers-reduced-motion
   64g  layering: Attach and a modal open above the deck; Escape closes Attach first, then the deck
   64h  layout: 2 columns at 390, no horizontal overflow, cards >= 150px, header controls >= 40px; contrast
   64i  live: device B with a deck open gets A's new item without a reload; a card mid-edit on B is not repainted

   `--only=64a,64c` runs just those. Each printed ok/FAIL line becomes one app-check check (block 64). */
import { playwright, serve, seedDB } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, quiet, check, results, reopen } from './s1-fake.mjs';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);

const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];
const T0 = '2026-10-01T00:00:00.000Z';
const PIDS = ['jp-task', 'jp-idea', 'jp-link', 'jp-shop'];
const pw = await playwright();
const srv = await serve();
const browser = await pw.chromium.launch();

const mkItem = (id, pocketId, text, order, extra = {}) => ({ id, pocketId, text, done: false, folderIds: [], tags: [], kind: null, journal: false, order, createdAt: T0, updatedAt: T0, ...extra });
const seed = (extra) => {
  const db = seedDB(T0);
  db.jeb = [mkItem('t1', 'jp-task', 'Alpha', 0), mkItem('t2', 'jp-task', 'Bravo', 1), mkItem('t3', 'jp-task', 'Charlie', 2),
    mkItem('i1', 'jp-idea', 'Idea one', 0), mkItem('i2', 'jp-idea', 'Idea two', 1), mkItem('l1', 'jp-link', 'Link one', 0), mkItem('s1', 'jp-shop', 'Milk', 0)];
  if (extra) extra(db);
  return db;
};
const dev = (cloud, name, vp, db) => addDevice(browser, srv.base, cloud, name, { width: vp.w, height: vp.h }, vp.touch, db || seed());
const act = (d, vp, sel) => (vp.touch ? d.page.locator(sel).first().tap() : d.page.locator(sel).first().click());
const rect = (d, sel) => d.page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; }, sel);
const item = (d, id) => on(d, (i) => JSON.parse(JSON.stringify((DB.jeb || []).find((x) => x.id === i) || null)), id);
const order = (d, pid) => on(d, (p) => jebItems(p).map((x) => x.id), pid);
const noErr = (d, tag) => check(d.errors.length === 0, `${tag} no page errors`, d.errors.slice(0, 2).join(' · '));
const each = async (fn) => { for (const vp of VPS) { const d = await dev(makeCloud(), 'D' + vp.name, vp); try { await fn(d, vp); } finally { await d.ctx.close(); } } };
const chip = (pid) => `#jeb-bar .jeb-chip[data-pid="${pid}"]`;
const openDeckOf = async (d, vp, pid) => { await act(d, vp, `${chip(pid)} [data-jeb-cards]`); await d.page.waitForSelector('#jeb-deck.on', { timeout: 3000 }); await sleep(1300); };
const openAllDeck = async (d, vp) => { await act(d, vp, '#jeb-bar .jeb-all [data-jeb-cards]'); await d.page.waitForSelector('#jeb-deck.on', { timeout: 3000 }); await sleep(1300); };
const closeDeck = async (d, vp) => { await act(d, vp, '#jeb-deck .jd-x'); await d.page.waitForFunction(() => !document.getElementById('jeb-deck').classList.contains('on'), null, { timeout: 3000 }); await sleep(200); };
const deckOn = (d) => on(d, () => { const e = document.getElementById('jeb-deck'); return !!e && e.classList.contains('on'); });
const panelOn = (d) => on(d, () => { const e = document.getElementById('jeb-panel'); return !!e && e.classList.contains('on'); });
const cardIds = (d, pid) => on(d, (p) => [...document.querySelectorAll(`#jeb-deck .jd-grid${p ? `[data-pid="${p}"]` : ''} .jeb-card`)].map((c) => c.dataset.iid), pid || null);
const panelIds = (d) => on(d, () => [...document.querySelectorAll('#jeb-panel .jeb-it')].map((c) => c.dataset.iid));
const txt = (d, sel) => on(d, (s) => { const e = document.querySelector(s); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; }, sel);
const toastText = (d) => on(d, () => { const e = document.querySelector('.toast-act'); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; });
const lum = (rgb) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbOf = (s) => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(s || ''); return m ? { c: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : +m[4] } : null; };

/* a real drag: the mouse at 1440, real touch events (CDP) on a touch viewport */
async function dragBy(d, vp, from, to) {
  if (!vp.touch) {
    await d.page.mouse.move(from.x, from.y); await d.page.mouse.down();
    for (let i = 1; i <= 12; i++) { await d.page.mouse.move(from.x + (to.x - from.x) * i / 12, from.y + (to.y - from.y) * i / 12); await sleep(15); }
    await sleep(120); await d.page.mouse.up();
  } else {
    const s = await d.ctx.newCDPSession(d.page);
    await s.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y, id: 1 }] });
    for (let i = 1; i <= 12; i++) { await s.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + (to.x - from.x) * i / 12, y: from.y + (to.y - from.y) * i / 12, id: 1 }] }); await sleep(20); }
    await sleep(120);
    await s.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await s.detach();
  }
  await sleep(500);
}
const gripOf = async (d, id) => { const r = await rect(d, `#jeb-deck .jeb-card[data-iid="${id}"] .jc-grip`); if (!r) throw new Error('no grip for ' + id); return { x: r.cx, y: r.cy }; };
const leftOfCard = async (d, id) => { const r = await rect(d, `#jeb-deck .jeb-card[data-iid="${id}"]`); if (!r) throw new Error('no card ' + id); return { x: r.l + Math.min(14, r.w * 0.15), y: r.cy }; };

try {
  /* ══ 64a — ▦ opens the deck, the name half opens the panel, they switch ══ */
  if (want('64a')) await each(async (d, vp) => {
    const t = `64a@${vp.name}`;
    const half = await on(d, () => { const c = document.querySelector('#jeb-bar .jeb-chip[data-pid="jp-task"] [data-jeb-cards]'); const r = c.getBoundingClientRect(); return { h: r.height, w: r.width, aria: c.getAttribute('aria-label'), title: c.getAttribute('title'), txt: c.textContent.trim(), disp: getComputedStyle(c).display }; });
    check(half.disp !== 'none' && half.h >= 40 && half.aria === 'Spread Quick tasks as cards' && half.title === 'Spread Quick tasks as cards' && half.txt === '▦', `${t} every chip has a ▦ half: shown, >= 40px tall, aria-label and title "Spread Quick tasks as cards"`, JSON.stringify(half));
    await openDeckOf(d, vp, 'jp-task');
    const ids = await cardIds(d);
    check(ids.join() === 't1,t2,t3', `${t} ▦ opens the deck with exactly that pocket's cards, in order`, ids.join());
    check((await txt(d, '#jeb-deck .jd-hd b')) === 'Quick tasks' && /^3 open$/.test(await txt(d, '#jeb-deck .jd-hd small')), `${t} the title is the pocket and says "3 open"`, await txt(d, '#jeb-deck .jd-hd'));
    check(!(await panelOn(d)), `${t} the panel is not open behind the deck`);
    /* ▤ Panel */
    await act(d, vp, '#jeb-deck [data-d="panel"]'); await sleep(400);
    check(!(await deckOn(d)) && (await panelOn(d)) && (await panelIds(d)).join() === 't1,t2,t3', `${t} ▤ Panel switches to the panel for the same pocket`, (await panelIds(d)).join());
    /* the panel's ▦ switches back */
    await act(d, vp, '#jeb-panel .jeb-px'); await sleep(500);
    check((await deckOn(d)) && !(await panelOn(d)) && (await cardIds(d)).join() === 't1,t2,t3', `${t} the panel's ▦ switches back to the deck`);
    await closeDeck(d, vp);
    /* the name half still opens the panel */
    await act(d, vp, `${chip('jp-task')} .jeb-main`); await sleep(400);
    check((await panelOn(d)) && !(await deckOn(d)) && (await panelIds(d)).join() === 't1,t2,t3', `${t} the name half still opens the panel (and not the deck)`);
    const addShown = await on(d, () => getComputedStyle(document.querySelector('#jeb-panel .jeb-add')).display !== 'none');
    check(addShown, `${t} the single-pocket add box is shown for one pocket`);
    noErr(d, t);
  });

  /* ══ 64b — All pockets ══ */
  if (want('64b')) await each(async (d, vp) => {
    const t = `64b@${vp.name}`;
    const first = await on(d, () => { const b = document.getElementById('jeb-bar'); const k = b.firstElementChild; const a = b.querySelector('.jeb-all'); return { firstIsChoose: k.classList.contains('jeb-choose'), allIsNext: k.nextElementSibling === a, bg: getComputedStyle(a.querySelector('.jeb-sw')).backgroundImage, name: a.querySelector('.jeb-nm').textContent }; });
    check(first.firstIsChoose && first.allIsNext && first.name === 'All pockets' && /conic-gradient/.test(first.bg) && /255, 241, 168/.test(first.bg) && /255, 217, 184/.test(first.bg) && /207, 232, 255/.test(first.bg) && /246, 210, 228/.test(first.bg), `${t} "☑ Choose" then "All pockets" start the bar; the swatch mixes four seed pastels`, JSON.stringify(first));
    await act(d, vp, '#jeb-bar .jeb-all .jeb-main'); await d.page.waitForSelector('#jeb-panel.on'); await sleep(400);
    const heads = await on(d, () => [...document.querySelectorAll('#jeb-panel .jeb-gh')].map((h) => h.querySelector('b').textContent + ':' + h.querySelector('small').textContent));
    check(heads.join('|') === 'Quick tasks:3 open|Ideas:2 open|Links to read:1 open|Shopping:1 open', `${t} All pockets ▤: a header per pocket, in order, with counts`, heads.join('|'));
    const groups = await on(d, () => [...document.querySelectorAll('#jeb-panel .jeb-gl')].map((g) => g.dataset.pid + '=' + [...g.querySelectorAll('.jeb-it')].map((r) => r.dataset.iid).join('+')));
    check(groups.join('|') === 'jp-task=t1+t2+t3|jp-idea=i1+i2|jp-link=l1|jp-shop=s1', `${t} the rows sit under their own pocket`, groups.join('|'));
    check(!(await on(d, () => getComputedStyle(document.querySelector('#jeb-panel .jeb-add')).display !== 'none')), `${t} the single-pocket add box is hidden with several pockets`);
    await act(d, vp, '#jeb-panel .jeb-x'); await sleep(300);
    await openAllDeck(d, vp);
    const gh = await on(d, () => [...document.querySelectorAll('#jeb-deck .jd-gh')].map((h) => h.querySelector('b').textContent + ':' + h.querySelector('small').textContent));
    check(gh.join('|') === 'Quick tasks:3 open|Ideas:2 open|Links to read:1 open|Shopping:1 open', `${t} All pockets ▦: every pocket grouped, in order, with counts`, gh.join('|'));
    const g2 = [];
    for (const p of PIDS) g2.push((await cardIds(d, p)).join('+'));
    check(g2.join('|') === 't1+t2+t3|i1+i2|l1|s1', `${t} each card is under its own pocket`, g2.join('|'));
    check((await txt(d, '#jeb-deck .jd-hd b')) === 'All pockets' && (await txt(d, '#jeb-deck .jd-hd small')) === '7 open', `${t} the title is "All pockets" and says "7 open"`, await txt(d, '#jeb-deck .jd-hd'));
    check((await on(d, () => document.querySelectorAll('#jeb-deck [data-d="add"]').length)) === 0, `${t} ＋ Card is for one pocket only (absent here)`);
    noErr(d, t);
  });

  /* ══ 64c — ☑ Choose ══ */
  if (want('64c')) await each(async (d, vp) => {
    const t = `64c@${vp.name}`;
    const before = await on(d, () => document.getElementById('jeb-bar').innerHTML);
    const barH = (await rect(d, '#jeb-bar')).h;
    await act(d, vp, '#jeb-bar .jeb-choose'); await sleep(300);
    const m0 = await on(d, () => ({ label: document.querySelector('#jeb-bar .jeb-choose').textContent.trim(), tk: [...document.querySelectorAll('#jeb-bar .jeb-chip .jeb-tk')].filter((e) => getComputedStyle(e).display !== 'none').length, go: [...document.querySelectorAll('#jeb-bar .jeb-go')].map((b) => b.textContent.trim() + (b.disabled ? '#off' : '')), newShown: getComputedStyle(document.querySelector('#jeb-bar .jeb-new')).display !== 'none', cardsHalf: [...document.querySelectorAll('#jeb-bar [data-jeb-cards]')].filter((e) => getComputedStyle(e).display !== 'none').length }));
    check(m0.label === '✕ Cancel' && m0.tk === 5 && m0.go.join('|') === '▤ Panel (0)#off|▦ Cards (0)#off', `${t} choose mode: the button reads ✕ Cancel, every chip shows a tick box, Panel (0) / Cards (0) are disabled`, JSON.stringify(m0));
    check(vp.w < 640 ? !m0.newShown : m0.newShown, `${t} ${vp.w < 640 ? 'on a phone the two buttons replace "＋ New pocket"' : '"＋ New pocket" stays beside the two buttons'}`, String(m0.newShown));
    check(Math.abs((await rect(d, '#jeb-bar')).h - barH) < 1, `${t} the bar does not grow in choose mode`);
    /* tapping a chip opens nothing, ticks it */
    await act(d, vp, `${chip('jp-task')} .jeb-main`); await sleep(250);
    check(!(await panelOn(d)) && !(await deckOn(d)), `${t} while choosing, tapping a chip opens nothing`);
    await act(d, vp, `${chip('jp-shop')} .jeb-main`); await sleep(250);
    const m2 = await on(d, () => ({ chosen: [...document.querySelectorAll('#jeb-bar .jeb-chip.chosen')].map((c) => c.dataset.pid), go: [...document.querySelectorAll('#jeb-bar .jeb-go')].map((b) => b.textContent.trim() + (b.disabled ? '#off' : '')) }));
    check(m2.chosen.join() === 'jp-task,jp-shop' && m2.go.join('|') === '▤ Panel (2)|▦ Cards (2)', `${t} two ticked: Panel (2) and Cards (2), enabled`, JSON.stringify(m2));
    /* All pockets ticks and unticks every pocket */
    await act(d, vp, '#jeb-bar .jeb-all .jeb-main'); await sleep(250);
    const all4 = await on(d, () => document.querySelectorAll('#jeb-bar .jeb-chip.chosen[data-pid]').length);
    await act(d, vp, '#jeb-bar .jeb-all .jeb-main'); await sleep(250);
    const none = await on(d, () => document.querySelectorAll('#jeb-bar .jeb-chip.chosen').length);
    check(all4 === 4 && none === 0, `${t} "All pockets" ticks every pocket, and again unticks them`, `${all4} then ${none}`);
    await act(d, vp, `${chip('jp-task')} .jeb-main`); await act(d, vp, `${chip('jp-shop')} .jeb-main`); await sleep(200);
    /* Cards (2) */
    await act(d, vp, '#jeb-bar .jeb-go[data-go="cards"]'); await d.page.waitForSelector('#jeb-deck.on'); await sleep(1200);
    const gh = await on(d, () => [...document.querySelectorAll('#jeb-deck .jd-gh b')].map((b) => b.textContent));
    check(gh.join('|') === 'Quick tasks|Shopping' && (await txt(d, '#jeb-deck .jd-hd b')) === '2 pockets' && (await cardIds(d)).join() === 't1,t2,t3,s1', `${t} Cards (2): only those two groups, titled "2 pockets"`, gh.join('|') + ' ' + (await cardIds(d)).join());
    check(!(await on(d, () => document.getElementById('jeb-bar').classList.contains('choosing'))), `${t} choosing ends once the cards are open`);
    await closeDeck(d, vp);
    /* Panel (2) with a working ＋ on each group */
    await act(d, vp, '#jeb-bar .jeb-choose'); await act(d, vp, `${chip('jp-idea')} .jeb-main`); await act(d, vp, `${chip('jp-link')} .jeb-main`); await sleep(200);
    await act(d, vp, '#jeb-bar .jeb-go[data-go="panel"]'); await d.page.waitForSelector('#jeb-panel.on'); await sleep(400);
    const heads = await on(d, () => [...document.querySelectorAll('#jeb-panel .jeb-gh b')].map((b) => b.textContent));
    check(heads.join('|') === 'Ideas|Links to read', `${t} Panel (2): only those two groups`, heads.join('|'));
    for (const [pid, word] of [['jp-idea', 'Plus idea'], ['jp-link', 'Plus link']]) {
      await act(d, vp, `#jeb-panel .jeb-gadd[data-pid="${pid}"]`); await sleep(300);
      const focused = await on(d, () => document.activeElement && document.activeElement.classList.contains('jeb-edit'));
      await d.page.keyboard.type(word); await d.page.keyboard.press('Enter'); await sleep(400);
      const o = await order(d, pid);
      const top = await item(d, o[0]);
      check(focused && top && top.text === word, `${t} ＋ on the "${pid}" group puts the caret in a new item, and what is typed is saved on top`, JSON.stringify({ focused, top: top && top.text }));
    }
    await act(d, vp, '#jeb-panel .jeb-x'); await sleep(300);
    /* Cancel restores the bar exactly */
    await act(d, vp, '#jeb-bar .jeb-choose'); await act(d, vp, `${chip('jp-task')} .jeb-main`); await sleep(150);
    await act(d, vp, '#jeb-bar .jeb-choose'); await sleep(300);
    const after = await on(d, () => document.getElementById('jeb-bar').innerHTML);
    const cnt = (s) => s.replace(/<span class="jeb-ct">\d+<\/span>/g, '<ct>');
    check(cnt(after) === cnt(before) && !(await panelOn(d)) && !(await deckOn(d)), `${t} ✕ Cancel leaves the bar exactly as it was (counts aside) with nothing open`);
    noErr(d, t);
  });

  /* ══ 64d — in the deck ══ */
  if (want('64d')) await each(async (d, vp) => {
    const t = `64d@${vp.name}`;
    await openDeckOf(d, vp, 'jp-task');
    const card = (id) => `#jeb-deck .jeb-card[data-iid="${id}"]`;
    /* tick */
    await act(d, vp, `${card('t2')} .jc-tick`); await sleep(400);
    const done = await on(d, () => { const c = document.querySelector('#jeb-deck .jeb-card[data-iid="t2"]'); return { cls: c.classList.contains('done'), dec: getComputedStyle(c.querySelector('.jeb-tx')).textDecorationLine, small: document.querySelector('#jeb-deck .jd-hd small').textContent }; });
    check((await item(d, 't2')).done === true && done.cls && /line-through/.test(done.dec) && done.small === '2 open', `${t} ✓ ticks a card: saved, struck through, "2 open"`, JSON.stringify(done));
    /* edit in place */
    await act(d, vp, `${card('t1')} .jeb-tx`); await sleep(200);
    const ed = await on(d, () => { const a = document.activeElement; return { ta: a && a.classList.contains('jeb-edit'), inCard: !!(a && a.closest('#jeb-deck .jeb-card[data-iid="t1"]')) }; });
    await d.page.keyboard.press('Control+A'); await d.page.keyboard.type('Alpha edited'); await d.page.keyboard.press('Enter'); await sleep(400);
    check(ed.ta && ed.inCard && (await item(d, 't1')).text === 'Alpha edited' && (await txt(d, `${card('t1')} .jeb-tx`)) === 'Alpha edited', `${t} tapping the text edits it in place; Enter saves`, JSON.stringify(ed));
    /* attach */
    await act(d, vp, `${card('t1')} .jeb-att-b`); await d.page.waitForSelector('#jeb-att'); await sleep(250);
    await act(d, vp, '#jeb-att [data-tab="journal"]'); await sleep(150); await act(d, vp, '#jeb-att .ja-row[data-journal]'); await sleep(250);
    await act(d, vp, '#jeb-att .ja-x'); await sleep(300);
    check((await item(d, 't1')).journal === true && /📔 Journal/.test(await txt(d, `${card('t1')} .jeb-chips`) || ''), `${t} 📎 Attach on a card: the chip appears on the card`, String(await txt(d, `${card('t1')} .jeb-chips`)));
    /* → Note */
    const notesBefore = await on(d, () => DB.articles.filter((a) => a.fromJeb).length);
    await act(d, vp, `${card('t3')} .jeb-note-b`); await sleep(600);
    const tt = await toastText(d);
    const made = await on(d, () => { const n = DB.articles.find((a) => a.fromJeb && a.title === 'Charlie'); return n ? { pocket: n.fromJeb.pocket } : null; });
    check(notesBefore === 0 && !!made && made.pocket === 'Quick tasks' && (await item(d, 't3')) === null && !(await cardIds(d)).includes('t3'), `${t} → Note: the card leaves, a note "Charlie" carries fromJeb`, JSON.stringify(made) + ' ' + (await cardIds(d)).join());
    check(typeof tt === 'string' && /Turned into a note in/.test(tt) && /From Jeb|Journal|📁/.test(tt), `${t} → Note: the toast says where it went`, String(tt));
    const inSF = await on(d, () => DB.articles.filter((a) => a.fromJeb).length);
    check(inSF === 1, `${t} "From Jeb" gains the note`, String(inSF));
    /* ＋ Card */
    await act(d, vp, '#jeb-deck [data-d="add"]'); await sleep(350);
    const foc = await on(d, () => { const a = document.activeElement; return !!(a && a.classList.contains('jeb-edit') && a.closest('#jeb-deck .jeb-card')); });
    await d.page.keyboard.type('Fresh card'); await d.page.keyboard.press('Enter'); await sleep(500);
    const o1 = await order(d, 'jp-task'); const fresh = await item(d, o1[0]);
    check(foc && !!fresh && fresh.text === 'Fresh card' && (await cardIds(d))[0] === o1[0], `${t} ＋ Card: the caret is in the new card, typing is saved, it sits first`, JSON.stringify({ foc, o1 }));
    /* an empty ＋ Card is dropped again */
    const nBefore = (await order(d, 'jp-task')).length;
    await act(d, vp, '#jeb-deck [data-d="add"]'); await sleep(350); await d.page.keyboard.press('Escape'); await sleep(450);
    check((await order(d, 'jp-task')).length === nBefore && (await on(d, () => DB.trash.filter((x) => x.type === 'jebItem').length)) === 0, `${t} a ＋ Card left empty is dropped (no stray empty card, nothing in Trash)`);
    check(await deckOn(d), `${t} Escape ended the edit, not the deck`);
    /* Clear done */
    await act(d, vp, '#jeb-deck [data-d="clear"]'); await sleep(500);
    check((await item(d, 't2')) === null && (await on(d, () => DB.trash.some((x) => x.type === 'jebItem' && x.item.id === 't2'))) && !(await cardIds(d)).includes('t2'), `${t} Clear done: the done card goes to Trash and leaves the deck`);
    noErr(d, t);
  });

  /* ══ 64e — drag ══ */
  if (want('64e')) for (const vp of VPS) {
    const cloud = makeCloud();
    const A = await dev(cloud, 'A', vp), B = await dev(cloud, 'B', vp);
    const t = `64e@${vp.name}`;
    try {
      await sleep(1500);
      await on(A, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.content += '<p>x</p>'; a.updatedAt = new Date().toISOString(); persist(); flushPendingPush(); });
      await sleep(800); await quiet(cloud, A); await quiet(cloud, B);
      await openDeckOf(A, vp, 'jp-task');
      /* within a pocket: t3 to the front */
      await dragBy(A, vp, await gripOf(A, 't3'), await leftOfCard(A, 't1'));
      let o = await order(A, 'jp-task');
      check(o.join() === 't3,t1,t2' && (await cardIds(A, 'jp-task')).join() === 't3,t1,t2', `${t} drag inside a pocket (${vp.touch ? 'touch' : 'mouse'}): t3 goes first`, o.join());
      check((await on(A, () => document.querySelectorAll('#jeb-deck .jeb-before,#jeb-deck .jeb-after,#jeb-deck .jeb-drag').length)) === 0, `${t} the drop marker and the lifted look are gone after the drop`);
      await closeDeck(A, vp);
      /* into another pocket's group (All deck) */
      await openAllDeck(A, vp);
      const mid = await on(A, () => { const m = document.querySelector('#jeb-deck .jd-grid[data-pid="jp-task"]'); return m ? true : false; });
      const target = await leftOfCard(A, 't1');
      /* show the marker while dragging, then drop */
      await dragBy(A, vp, await gripOf(A, 'i1'), target);
      const oT = await order(A, 'jp-task'), oI = await order(A, 'jp-idea'), moved = await item(A, 'i1');
      check(mid && oT.join() === 't3,i1,t1,t2' && moved.pocketId === 'jp-task' && oI.join() === 'i2', `${t} drag into another pocket's group moves it there (first, where it was dropped)`, `${oT.join()} / ${oI.join()}`);
      check((await cardIds(A, 'jp-task')).join() === oT.join() && (await cardIds(A, 'jp-idea')).join() === 'i2', `${t} the deck shows it under its new pocket`);
      /* persists across a reload */
      await reopen(A); await sleep(600);
      check((await order(A, 'jp-task')).join() === oT.join(), `${t} the new order survives a reload`, (await order(A, 'jp-task')).join());
      /* reaches B */
      let seen = '';
      for (let i = 0; i < 60; i++) { seen = (await order(B, 'jp-task')).join(); if (seen === oT.join()) break; await sleep(500); }
      check(seen === oT.join(), `${t} the new order reaches device B`, seen + ' vs ' + oT.join());
      noErr(A, t);
    } finally { await A.ctx.close(); await B.ctx.close(); }
  }

  /* ══ 64f — jump out ══ */
  if (want('64f')) await each(async (d, vp) => {
    const t = `64f@${vp.name}`;
    await on(d, () => { for (let k = 0; k < 20; k++) jebAddItem('jp-link', 'extra ' + k); });
    await d.page.waitForTimeout(300);
    await act(d, vp, '#jeb-bar .jeb-all [data-jeb-cards]'); await d.page.waitForSelector('#jeb-deck.on');
    const snap = await on(d, () => {
      const cs = [...document.querySelectorAll('#jeb-deck .jeb-card')];
      return cs.map((c) => { const a = c.getAnimations(); const kf = a.length ? a[0].effect.getKeyframes() : []; const tm = a.length ? a[0].effect.getTiming() : null; return { id: c.dataset.iid, pid: c.dataset.pid, n: a.length, first: kf.length ? kf[0].transform : null, last: kf.length ? kf[kf.length - 1].transform : null, jump: c.dataset.jump || null, delay: tm ? tm.delay : null, dur: tm ? tm.duration : null }; });
    });
    const tr = (s) => { const m = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(s || ''); return m ? { x: +m[1], y: +m[2] } : null; };
    const f0 = snap[0], f1 = snap[1];
    check(snap.length === 27 && snap.every((s) => s.n === 1), `${t} every card (27) is animated as it opens`, JSON.stringify(snap.filter((s) => s.n !== 1).slice(0, 2)));
    check(tr(f0.first) !== null && /scale\(0?\.15\)/.test(f0.first) && /translate\(0px,\s*0px\)/.test(f0.last) && /rotate\(-?[\d.]+deg\)/.test(f0.last), `${t} it starts small and displaced from its chip, and ends in place with its tilt`, JSON.stringify(f0));
    check(f0.delay === 0 && f1.delay === 45, `${t} cards are staggered ~45 ms apart`, `${f0.delay}, ${f1.delay}`);
    check(Math.max(...snap.map((s) => s.delay + s.dur)) <= 920 && Math.max(...snap.map((s) => s.delay + s.dur)) >= 800, `${t} the whole jump is capped near 900 ms`, String(Math.max(...snap.map((s) => s.delay + s.dur))));
    await sleep(1400);
    /* the start transform points at the card's OWN chip: first of each of two pockets */
    for (const pk of ['jp-task', 'jp-link']) {
      const s = snap.find((x) => x.pid === pk);
      const pos = await on(d, ([id, p]) => { const c = document.querySelector(`#jeb-deck .jeb-card[data-iid="${id}"]`).getBoundingClientRect(); const h = document.querySelector(`#jeb-bar .jeb-chip[data-pid="${p}"]`).getBoundingClientRect(); return { dx: h.left + h.width / 2 - (c.left + c.width / 2), dy: h.top + h.height / 2 - (c.top + c.height / 2) }; }, [s.id, pk]);
      const v = tr(s.first);
      check(v !== null && Math.abs(v.x - pos.dx) <= 3 && Math.abs(v.y - pos.dy) <= 3, `${t} the "${pk}" card starts at ITS OWN chip (${Math.round(pos.dx)},${Math.round(pos.dy)})`, JSON.stringify({ start: v, want: pos }));
    }
    const end = await on(d, () => { const c = document.querySelector('#jeb-deck .jeb-card'); return { anims: c.getAnimations().length, tf: getComputedStyle(c).transform }; });
    check(end.anims === 0 && end.tf !== 'none', `${t} afterwards it rests in its place, tilted (${end.tf.slice(0, 30)})`);
    /* reduced motion: nothing flies, nothing tilts */
    await closeDeck(d, vp);
    await d.page.emulateMedia({ reducedMotion: 'reduce' });
    await act(d, vp, '#jeb-bar .jeb-all [data-jeb-cards]'); await d.page.waitForSelector('#jeb-deck.on');
    const rm = await on(d, () => { const cs = [...document.querySelectorAll('#jeb-deck .jeb-card')]; return { n: cs.length, anim: cs.reduce((s, c) => s + c.getAnimations().length, 0), jumps: cs.filter((c) => c.dataset.jump).length, tf: [...new Set(cs.map((c) => getComputedStyle(c).transform))] }; });
    check(rm.n === 27 && rm.anim === 0 && rm.jumps === 0 && rm.tf.length === 1 && rm.tf[0] === 'none', `${t} prefers-reduced-motion: no animation and no rotation`, JSON.stringify(rm));
    noErr(d, t);
  });

  /* ══ 64g — layering and Escape ══ */
  if (want('64g')) await each(async (d, vp) => {
    const t = `64g@${vp.name}`;
    await openDeckOf(d, vp, 'jp-task');
    const z = await on(d, () => { const k = (s) => { const e = document.querySelector(s); return e ? +getComputedStyle(e).zIndex : null; }; return { deck: k('#jeb-deck'), ov: k('#ov'), att: 9150, floats: 5001 }; });
    check(z.deck !== null && z.deck > z.floats && z.deck < z.att && z.deck < z.ov, `${t} the deck sits above the panes and float windows, below Attach and modals`, JSON.stringify(z));
    const covers = await on(d, () => { const e = document.querySelector('#jeb-deck').getBoundingClientRect(); const bar = document.querySelector('#jeb-bar').getBoundingClientRect(); return { left: e.left, top: e.top, right: e.right, w: innerWidth, bottom: e.bottom, barTop: bar.top, h: innerHeight }; });
    check(covers.left === 0 && covers.top === 0 && covers.right === covers.w && (vp.w < 640 ? covers.bottom === covers.h : Math.abs(covers.bottom - covers.barTop) <= 1), `${t} ${vp.w < 640 ? 'on a phone the deck covers the bar' : 'the deck covers the panes and stops at the bar, which stays visible'}`, JSON.stringify(covers));
    /* Attach above the deck */
    await act(d, vp, '#jeb-deck .jeb-card[data-iid="t1"] .jeb-att-b'); await d.page.waitForSelector('#jeb-att'); await sleep(300);
    const topAtt = await on(d, () => { const r = document.getElementById('jeb-att').getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + 30); return !!(e && e.closest('#jeb-att')); });
    check(topAtt, `${t} 📎 Attach opens above the deck`);
    await d.page.keyboard.press('Escape'); await sleep(250);
    check(!(await on(d, () => !!document.getElementById('jeb-att'))) && (await deckOn(d)), `${t} Escape closes Attach first and leaves the deck`);
    /* a modal above the deck */
    if (vp.w >= 640) await act(d, vp, '#jeb-bar .jeb-new'); else await on(d, () => jebNewPocketDialog());
    await d.page.waitForSelector('#ov.on', { timeout: 3000 }); await sleep(250);
    const topOv = await on(d, () => { const r = document.getElementById('mb').getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!(e && e.closest('#ov')); });
    check(topOv, `${t} a modal (${vp.w >= 640 ? 'New pocket, by its real button' : 'New pocket, opened by its function: the phone deck covers the button'}) opens above the deck`);
    await act(d, vp, '#ov .ma .btn:not(.bp)'); await sleep(300);
    await d.page.keyboard.press('Escape'); await sleep(300);
    check(!(await deckOn(d)), `${t} the next Escape closes the deck`);
    noErr(d, t);
  });

  /* ══ 64h — layout and contrast ══ */
  if (want('64h')) await each(async (d, vp) => {
    const t = `64h@${vp.name}`;
    await on(d, () => { jebAddItem('jp-task', 'Unbrokenwordunbrokenwordunbrokenwordunbrokenwordunbrokenword'); });
    await openAllDeck(d, vp);
    const m = await on(d, () => {
      const g = document.querySelector('#jeb-deck .jd-grid[data-pid="jp-task"]'), body = document.querySelector('#jeb-deck .jd-body');
      const cards = [...document.querySelectorAll('#jeb-deck .jeb-card')];
      const hd = [...document.querySelectorAll('#jeb-deck .jd-hd button')].map((b) => { const r = b.getBoundingClientRect(); return { n: b.textContent.trim(), w: r.width, h: r.height }; });
      const wrap = document.querySelector('#jeb-deck .jd-wrap').getBoundingClientRect();
      return { cols: getComputedStyle(g).gridTemplateColumns.split(' ').length, minW: Math.min(...cards.map((c) => c.getBoundingClientRect().width)), docW: document.documentElement.scrollWidth, innerW: innerWidth, bodyOver: body.scrollWidth - body.clientWidth, cardOver: cards.filter((c) => c.scrollWidth > c.clientWidth + 1).length, hd, wrapW: wrap.width, ncards: cards.length };
    });
    check(vp.w < 640 ? m.cols === 2 : m.cols >= 3, `${t} the grid has ${m.cols} columns (${vp.w < 640 ? '2 on a phone' : '3 or more'})`);
    check(m.minW >= 150, `${t} cards are never narrower than 150px (narrowest ${Math.round(m.minW)})`);
    check(m.docW <= m.innerW && m.bodyOver <= 0 && m.cardOver === 0, `${t} no horizontal overflow, and a long word wraps inside its card`, JSON.stringify({ docW: m.docW, innerW: m.innerW, bodyOver: m.bodyOver, cardOver: m.cardOver }));
    check(m.wrapW <= 1100 + 1, `${t} the deck is at most 1,100px wide (${Math.round(m.wrapW)})`);
    check(m.hd.length >= 3 && m.hd.every((b) => b.h >= 40 && b.w >= 40), `${t} every header control is at least 40px`, JSON.stringify(m.hd.filter((b) => b.h < 40 || b.w < 40)));
    /* contrast: the ink on all 8 pastels, and what is really painted */
    const cols = await on(d, () => _JEB_COLORS.slice()), ink = hex('#2A2418');
    const worst = Math.min(...cols.map((c) => ratio(ink, hex(c))));
    check(cols.length === 8 && worst >= 4.5, `${t} card ink on all 8 pastels clears 4.5:1 (worst ${worst.toFixed(2)})`);
    const paint = await on(d, () => [...document.querySelectorAll('#jeb-deck .jeb-card')].slice(0, 7).map((c) => { const s = getComputedStyle(c), x = getComputedStyle(c.querySelector('.jeb-tx')); return { bg: s.backgroundColor, ink: x.color }; }));
    const pr = paint.map((p) => ({ bg: rgbOf(p.bg), ink: rgbOf(p.ink) }));
    check(pr.length === 7 && pr.every((p) => p.bg && p.ink && p.bg.a === 1 && ratio(p.ink.c, p.bg.c) >= 4.5), `${t} the painted card text clears 4.5:1 on its pocket colour`, JSON.stringify(paint[0]));
    const hdp = await on(d, () => { const h = document.querySelector('#jeb-deck .jd-hd'); return { bg: getComputedStyle(h).backgroundColor, items: [...h.querySelectorAll('b,small,button')].map((e) => getComputedStyle(e).color) }; });
    const hb = rgbOf(hdp.bg);
    check(!!hb && hb.a === 1 && hdp.items.length >= 4 && hdp.items.every((c) => { const k = rgbOf(c); return k && ratio(k.c, hb.c) >= 4.5; }), `${t} the deck header text clears 4.5:1`, JSON.stringify(hdp));
    noErr(d, t);
  });

  /* ══ 64i — live ══ */
  if (want('64i')) for (const vp of VPS) {
    const cloud = makeCloud();
    const A = await dev(cloud, 'A', vp), B = await dev(cloud, 'B', vp);
    const t = `64i@${vp.name}`;
    try {
      await sleep(1500);
      await on(A, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.content += '<p>x</p>'; a.updatedAt = new Date().toISOString(); persist(); flushPendingPush(); });
      await sleep(800); await quiet(cloud, A); await quiet(cloud, B);
      await openDeckOf(B, vp, 'jp-task');
      /* A adds an item through its own panel */
      await act(A, vp, `${chip('jp-task')} .jeb-main`); await A.page.waitForSelector('#jeb-panel.on'); await sleep(300);
      await A.page.locator('#jeb-add-in').click(); await A.page.keyboard.type('From A one'); await A.page.keyboard.press('Enter'); await sleep(300);
      let got = false;
      for (let i = 0; i < 60; i++) { got = await on(B, () => [...document.querySelectorAll('#jeb-deck .jeb-card .jeb-tx')].some((e) => e.textContent === 'From A one')); if (got) break; await sleep(500); }
      check(got, `${t} device B, deck open, shows A's new item without a reload`);
      /* B starts typing in a card; A adds another */
      await act(B, vp, '#jeb-deck .jeb-card[data-iid="t2"] .jeb-tx'); await sleep(250);
      await B.page.keyboard.press('Control+A'); await B.page.keyboard.type('B is typing');
      await A.page.locator('#jeb-add-in').click(); await A.page.keyboard.type('From A two'); await A.page.keyboard.press('Enter');
      let inDb = false;
      for (let i = 0; i < 60; i++) { inDb = await on(B, () => DB.jeb.some((x) => x.text === 'From A two')); if (inDb) break; await sleep(500); }
      await sleep(1200);
      const mid = await on(B, () => { const a = document.activeElement; return { ta: !!(a && a.classList.contains('jeb-edit')), val: a ? a.value : null, painted: [...document.querySelectorAll('#jeb-deck .jeb-card .jeb-tx')].some((e) => e.textContent === 'From A two') }; });
      check(inDb && mid.ta && mid.val === 'B is typing' && mid.painted === false, `${t} a card mid-edit on B is not repainted: focus and typing survive while A's item arrives`, JSON.stringify(mid));
      await B.page.keyboard.press('Enter'); await sleep(900);
      const after = await on(B, () => ({ t2: DB.jeb.find((x) => x.id === 't2').text, painted: [...document.querySelectorAll('#jeb-deck .jeb-card .jeb-tx')].some((e) => e.textContent === 'From A two') }));
      check(after.t2 === 'B is typing' && after.painted, `${t} B's typing is saved, and A's item appears once the edit ends`, JSON.stringify(after));
      noErr(A, t); noErr(B, t);
    } finally { await A.ctx.close(); await B.ctx.close(); }
  }
} catch (e) {
  console.log(' FAIL  jeb-j4 threw: ' + (e && e.stack || e));
  results.push({ ok: false, label: 'threw' });
} finally {
  await browser.close();
  await srv.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
