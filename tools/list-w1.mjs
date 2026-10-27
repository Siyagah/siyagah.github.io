#!/usr/bin/env node
/* tools/list-w1.mjs — v05.53, J08 W1: the note list draws only what is on screen, and "Find in this list" (the owner's choice, 15 Oct: "Keep
   Ctrl+F working"). Checks 113a–113j, real typing / clicks / taps at 390 (touch) / 820 (touch) / 1440 (mouse). The window itself (its cards
   equal a whole draw at the same places, it covers the screen, a new list leaves nothing of the old one) is check 82; this is the find box.
   113a a list over 300 notes carries the find bar above its cards (≥ 44 px to tap on a phone/tablet, 16 px text there so the phone does not
        zoom); a list of 300 or fewer has no bar and every card is in the page, as before;
   113b typing narrows the list to the notes holding the words in the title OR the text, any case — not in the markup (a class name);
        "n of N" says how many; a word split by bold (re<b>d</b>ux) is still found; ✕ brings the whole list back;
   113c every word must be there (two words), and a word with & is found in text stored as &amp;;
   113d Enter opens the first note found; Escape clears the box;
   113e nothing found: the list says so;
   113f the bar stays at the top of the pane while the list scrolls;
   113g PC: Ctrl+F after a click in the list goes to the box; after a click in the note it is left to the browser;
   113h a repaint of the same list (an edit arriving) keeps the words, the focus and what was found; another folder starts empty;
   113i speed: finding in a 9,000-note list on a phone ×4 never freezes it for more than 200 ms (× this computer's factor);
   113j finding writes nothing; no page errors.
   `node tools/list-w1.mjs` */
import { openApp, report, hostLimit } from './harness.mjs';

const r = report('J08 W1 — the windowed list and Find in this list');
const errs = [];
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

function seed(page, N) {
  return page.evaluate((N) => {
    const now = new Date().toISOString(), t0 = Date.now() - 4e6;
    DB.folders = [{ id: 'f1', name: '(001) Big', parentId: null, order: 1, sectionId: 'sec-1', updatedAt: now }, { id: 'f2', name: '(002) Small', parentId: null, order: 2, sectionId: 'sec-1', updatedAt: now }];
    DB.articles = []; DB.trash = []; DB.tombstones = [];
    const special = { 5: ['A walk', '<p>The Zebra runs far</p>'], 6: ['Plain one', '<p class="zebra">nothing here</p>'], 7: ['ZEBRA crossing', '<p>x</p>'], 8: ['Cartoons', '<p>Tom &amp; Jerry</p>'], 9: ['Pie', '<p>red <b>apple</b> pie</p>'], 10: ['Music', '<p>re<b>d</b>ux record</p>'], 11: ['Red car', '<p>no fruit</p>'] };
    for (let i = 0; i < N; i++) {
      const at = new Date(t0 + i * 400).toISOString(), sp = special[i];
      DB.articles.push({ id: 'n' + i, title: sp ? sp[0] : 'Note ' + i, content: sp ? sp[1] : '<p>Body ' + i + '</p>', folderIds: [i < 40 && !sp ? 'f2' : 'f1'], tags: [], createdAt: at, updatedAt: at, kind: 'general' });
    }
    DB.globalTags = []; _seedThemeSnap(); _seedRecSnap(); persist(); _histReset();
  }, N);
}
const settle = (page) => page.evaluate(async () => { for (let i = 0; i < 400 && _listWin && _listWin.busy; i++) await new Promise((res) => setTimeout(res, 20)); await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))); });
const shown = (page) => page.evaluate(() => [...document.querySelectorAll('#p2c .ar')].map((e) => e.getAttribute('data-aid')));

for (const [w, h, touch] of [[390, 844, true], [820, 1180, true], [1440, 900, false]]) {
  const app = await openApp({ viewport: { width: w, height: h }, hasTouch: touch });
  const { page } = app;
  const tier = w < 640 ? 'phone' : w < 1200 ? 'tablet' : 'pc';
  const tap = async (sel) => { const l = page.locator(sel).first(); if (touch) await l.tap(); else await l.click(); await sleep(200); };
  const type = async (txt) => { await tap('#lf-q'); await page.keyboard.press('Control+a'); await page.keyboard.press('Backspace'); if (txt) await page.keyboard.type(txt, { delay: 15 }); await sleep(250); await settle(page); };
  try {
    await seed(page, 2000); await sleep(300);
    await page.evaluate(() => { ST.search = ''; selFolder('f2'); if (window.innerWidth < 1200) showPane('p2'); });
    await sleep(300);
    /* 113a */
    const small = await page.evaluate(() => ({ bar: !!document.querySelector('#p2c .lf-bar'), cards: document.querySelectorAll('#p2c .ar').length, n: artsIn('f2').length, win: !!document.querySelector('#p2c .al-win') }));
    await page.evaluate(() => { selFolder('f1'); if (window.innerWidth < 1200) showPane('p2'); }); await sleep(300);
    const big = await page.evaluate(() => { const b = document.querySelector('#p2c .lf-bar'), i = document.getElementById('lf-q'), x = b && b.getBoundingClientRect(); return { bar: !!b, h: x ? Math.round(x.height) : 0, vis: !!x && x.width > 200 && getComputedStyle(b).display !== 'none', fs: i ? parseFloat(getComputedStyle(i).fontSize) : 0, ph: i ? i.placeholder : '', cards: document.querySelectorAll('#p2c .ar').length, n: artsIn('f1').length }; });
    r.check(!small.bar && !small.win && small.cards === small.n && small.n === 33, `113a@${w} a list of ${small.n} notes: no find bar, every card in the page`, JSON.stringify(small));
    r.check(big.bar && big.vis && big.ph === 'Find in this list…' && big.cards < big.n && (tier === 'pc' || (big.h >= 44 && big.fs >= 16)), `113a@${w} a list of ${big.n} notes: the find bar is there (${big.h} px, text ${big.fs} px), ${big.cards} cards in the page`, JSON.stringify(big));
    /* 113b */
    await page.evaluate(() => { window.__w1 = { writes: {} }; for (const nm of ['persist', '_save', 'scheduleAutoSave', 'pushToCloud']) { const o = window[nm]; window[nm] = function (...a) { __w1.writes[nm] = (__w1.writes[nm] || 0) + 1; return o.apply(this, a); }; } window.__w1.db = JSON.stringify(DB); });
    await type('zebra');
    const z = { ids: await shown(page), lbl: await page.evaluate(() => document.getElementById('lf-n').textContent) };
    await type('REDUX');
    const rx = await shown(page);
    await tap('.lf-x'); await settle(page);
    const back = await page.evaluate(() => ({ n: document.querySelectorAll('#p2c .ar').length, q: document.getElementById('lf-q').value, lbl: document.getElementById('lf-n').textContent, rows: _listWin.rows }));
    r.check(JSON.stringify(z.ids) === '["n5","n7"]' && /^2 of 1,9\d\d$/.test(z.lbl), `113b@${w} "zebra" finds the note with it in the text and the one with it in the title, not the one with it only in the markup (${JSON.stringify(z.ids)}, “${z.lbl}”)`);
    r.check(JSON.stringify(rx) === '["n10"]', `113b@${w} a word split by bold (re<b>d</b>ux) is found (${JSON.stringify(rx)})`);
    r.check(back.q === '' && back.lbl === '' && back.rows === null && back.n > 5, `113b@${w} ✕ brings the whole list back`, JSON.stringify(back));
    /* 113c */
    await type('red apple'); const two = await shown(page);
    await type('tom & jerry'); const amp = await shown(page);
    r.check(JSON.stringify(two) === '["n9"]', `113c@${w} two words must both be there ("red apple": ${JSON.stringify(two)}; "Red car" has no apple)`);
    r.check(JSON.stringify(amp) === '["n8"]', `113c@${w} "tom & jerry" is found in text stored as &amp; (${JSON.stringify(amp)})`);
    /* 113e */
    await type('qwertyuiop');
    const none = await page.evaluate(() => { const al = document.querySelector('#p2c .al-win'); return { n: al.children.length, cls: al.classList.contains('lf-none'), msg: getComputedStyle(al, '::before').content, lbl: document.getElementById('lf-n').textContent }; });
    r.check(none.n === 0 && none.cls && /No note in this list/.test(none.msg) && /^0 of/.test(none.lbl), `113e@${w} nothing found: the list says so`, JSON.stringify(none));
    /* 113d */
    await type('zebra');
    if (touch) await page.evaluate(() => document.getElementById('lf-q').focus());
    await page.keyboard.press('Enter'); await sleep(300);
    const opened = await page.evaluate(() => ST.article);
    if (tier !== 'pc') { await page.evaluate(() => showPane('p2')); await sleep(200); }
    await page.evaluate(() => document.getElementById('lf-q').focus());
    await page.keyboard.press('Escape'); await sleep(250); await settle(page);
    const esc = await page.evaluate(() => ({ q: document.getElementById('lf-q').value, rows: _listWin.rows }));
    r.check(opened === 'n5', `113d@${w} Enter opens the first note found (${opened})`);
    r.check(esc.q === '' && esc.rows === null, `113d@${w} Escape clears the box`, JSON.stringify(esc));
    /* 113f */
    const st = await page.evaluate(async () => { const el = document.getElementById('p2c'); el.scrollTop = el.scrollHeight / 2; await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))); const b = document.querySelector('.lf-bar').getBoundingClientRect(), e = el.getBoundingClientRect(); return { d: Math.round(b.top - e.top), st: el.scrollTop }; });
    r.check(st.st > 1000 && Math.abs(st.d) <= 1, `113f@${w} the bar stays at the top of the pane while the list scrolls (${st.d} px from the top, scrolled ${Math.round(st.st)} px)`);
    /* 113g */
    if (tier === 'pc') {
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
      const card = await page.evaluate(() => { const el = document.getElementById('p2c'), e = el.getBoundingClientRect(), bb = document.querySelector('.lf-bar').getBoundingClientRect().bottom; const c = [...el.querySelectorAll('.ar')].find((x) => x.getBoundingClientRect().top > bb + 2 && x.getBoundingClientRect().bottom < e.bottom); const rc = c.getBoundingClientRect(); return { x: rc.left + 30, y: rc.top + rc.height / 2 }; });
      await page.mouse.click(card.x, card.y); await sleep(250);
      await page.keyboard.press('Control+f'); await sleep(100);
      const inList = await page.evaluate(() => document.activeElement && document.activeElement.id);
      const p3 = await page.evaluate(() => { const e = document.getElementById('p3c').getBoundingClientRect(); return { x: e.left + e.width / 2, y: e.top + Math.min(200, e.height / 2) }; });
      await page.mouse.click(p3.x, p3.y); await sleep(200);
      await page.evaluate(() => { window.__kf = null; const f = (e) => { if (e.key !== 'f' && e.key !== 'F') return; document.removeEventListener('keydown', f); window.__kf = { prevented: e.defaultPrevented }; }; document.addEventListener('keydown', f); });
      await page.keyboard.press('Control+f'); await sleep(150);
      const out = await page.evaluate(() => Object.assign({}, window.__kf, { focus: document.activeElement && document.activeElement.id }));
      r.check(inList === 'lf-q', `113g@${w} Ctrl+F after a click in the list goes to "Find in this list" (focus: ${inList})`);
      r.check(!out.prevented && out.focus !== 'lf-q', `113g@${w} Ctrl+F after a click in the note is left to the browser`, JSON.stringify(out));
    }
    /* 113h */
    await type('zebra');
    const rp = await page.evaluate(async () => {
      const a = DB.articles.find((x) => x.id === 'n5'); a.title = 'A walk, edited'; a.updatedAt = new Date().toISOString(); persist(); render();
      for (let i = 0; i < 200 && _listWin.busy; i++) await new Promise((res) => setTimeout(res, 20));
      const i = document.getElementById('lf-q');
      return { q: i.value, focus: document.activeElement === i, ids: [...document.querySelectorAll('#p2c .ar')].map((e) => e.getAttribute('data-aid')), t: (document.querySelector('#p2c .ar[data-aid="n5"]') || {}).textContent || '' };
    });
    r.check(rp.q === 'zebra' && rp.focus && JSON.stringify(rp.ids) === '["n5","n7"]' && /edited/.test(rp.t), `113h@${w} an edit arriving keeps the words, the focus and what was found (and shows the edit)`, JSON.stringify(rp));
    const other = await page.evaluate(async () => { selFolder('f2'); selFolder('f1'); await new Promise((res) => requestAnimationFrame(res)); return { q: document.getElementById('lf-q').value, rows: _listWin.rows }; });
    r.check(other.q === '' && other.rows === null, `113h@${w} another folder, then back: the box starts empty`, JSON.stringify(other));
    /* 113j */
    const wr = await page.evaluate(() => ({ w: __w1.writes, same: (() => { const a = DB.articles.find((x) => x.id === 'n5'); return true; })() }));
    const wr0 = await page.evaluate(async () => { __w1.writes = {}; const db0 = JSON.stringify(DB); _lfInput('note 1'); await new Promise((res) => setTimeout(res, 800)); _lfClear(); await new Promise((res) => setTimeout(res, 100)); return { w: __w1.writes, same: JSON.stringify(DB) === db0 }; });
    r.check(Object.keys(wr0.w).length === 0 && wr0.same, `113j@${w} finding writes nothing and leaves the notebook byte-identical`, JSON.stringify(wr0) + ' ' + JSON.stringify(wr));
    errs.push(...app.errors);
  } catch (e) { r.check(false, `113@${w} threw: ${String(e && e.message || e).split('\n')[0]}`); }
  finally { await app.close(); }
}

/* 113i — speed: finding in a 9,000-note list, phone ×4 */
{
  const app = await openApp({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const { page } = app;
  try {
    await seed(page, 9000); await sleep(400);
    await page.evaluate(() => { ST.search = ''; selFolder('f1'); showPane('p2'); });
    await sleep(400);
    const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const m = await page.evaluate(async () => {
      const long = []; const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => long.push(Math.round(e.duration)))); po.observe({ entryTypes: ['longtask'] });
      const t0 = performance.now(); _listWin.q = 'zebra'; _lfRun(_listWin);
      while (_listWin.busy && performance.now() - t0 < 60000) await new Promise((res) => setTimeout(res, 20));
      const all = Math.round(performance.now() - t0);
      await new Promise((res) => setTimeout(res, 100)); po.disconnect();
      return { all, worst: long.length ? Math.max(...long) : 0, found: _listWin.rows.length, n: _listWin.n };
    });
    const G = hostLimit(200);
    r.check(m.found === 2 && m.worst <= G.ms, `113i finding in ${m.n.toLocaleString('en')} notes (phone ×4): done in ${m.all} ms, worst freeze ${m.worst} ms (≤ ${G.raw} ms × host ${G.factor})`, JSON.stringify(m));
    errs.push(...app.errors);
  } catch (e) { r.check(false, `113i threw: ${String(e && e.message || e).split('\n')[0]}`); }
  finally { await app.close(); }
}
r.check(errs.length === 0, '113j no page errors', errs.slice(0, 3).join(' | '));
process.exit(r.finish() ? 1 : 0);
