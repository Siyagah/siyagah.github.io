#!/usr/bin/env node
/* tools/list-p3.mjs — v05.22, P3: the note list after a tag change is drawn in slices, from reused card text (checks 82a–82f).
   v05.53 — J08 W1, changed in place: a list over 300 cards is now a WINDOW (only the cards around the screen are in the page), so
   "complete" means "the window is drawn", the oracle compares the cards in the window with a whole cache-free draw AT THE SAME
   PLACES (and everything around the list byte for byte, the find bar aside), and the checks that asked for every card in the page
   (82b, 82c's slices, 82d's _listFinish and select-all) now ask what replaces them: the last note reached by scrolling and by
   "Find in this list", a new list leaving nothing of the old one, the window drawn at once. Lists of 300 or fewer are compared
   whole, exactly as before.

   `--measure` prints the before/after table only (no checks):  node tools/list-p3.mjs --measure [--notes=9000,27000] [--reps=3]
   Otherwise runs the checks (`--only=82a,82c`; `--vp=390` narrows to one layout; `--notes=9000,27000` sets 82e's sizes).

   82a  same result: after select / un-select / switch of a tag, a search cleared, a folder change, an edit, a favourite and a pin, a
        folder renamed, a tag renamed, a note to Trash and back, and an edit RECEIVED from a second device, the list — once complete —
        is identical to a cache-free whole draw (`_cardC` emptied, `_p2cLast` forgotten, `_LIST_MIN` huge). Only ` data-p2c="N"` is
        stripped before comparing: the mark a whole paint puts on the list so the next paint can find it; it counts up on every paint.
        Also: the list really was drawn in slices (the first paint is a part of the list) wherever the list is over 300 cards.
   82b  every card ends up in the page: the count of cards equals the notes in the view, and the last note's title is in the DOM
        (the precondition of Ctrl+F)
   82c  a new change cancels the old slices: no card that only the old list had is appended after the new one starts
   82d  what needs the whole list: _listFinish() completes at once; a card opened mid-slices stays marked; a received edit's targeted
        redraw (_p2cTry) works on a whole list; scrolling to the end draws on; select-all takes in the last title; counts follow the data
   82e  speed at --notes (default 9000,27000), phone x4 and laptop, median of 5
   82f  no new writes: drawing the list never calls persist / _save / scheduleAutoSave / pushToCloud / _stampThemeTouches, DB is untouched
   Each printed ok/FAIL line becomes one app-check check (block 82). */
import { openApp, seedDB, playwright, serve, hostLimit } from './harness.mjs';
import { makeCloud, addDevice, on, quiet } from './s1-fake.mjs';

const argv = process.argv.slice(2);
const arg = (k) => (argv.find((a) => a.startsWith('--' + k + '=')) || '').slice(k.length + 3);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const NOTES_LIST = (arg('notes') || '9000,27000').split(',').map(Number);
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const onlySet = arg('only') ? new Set(arg('only').split(',')) : null;
const want = (t) => !onlySet || [...onlySet].some((o) => t.startsWith(o));
const VPS = [{ n: 390, w: 390, h: 844, touch: true }, { n: 820, w: 820, h: 1180, touch: true }, { n: 1440, w: 1440, h: 900, touch: false }]
  .filter((v) => !arg('vp') || String(v.n) === arg('vp'));

/* a big notebook: folder f2 holds F2 notes, f1 the rest; tag "big" is on a third of the notes, "mid" on a fifth, "rare" on 1 in 97.
   Done in the page, one persist(). */
function seed(page, N, F2 = 2000) {
  return page.evaluate(({ N, F2 }) => {
    const now = new Date().toISOString(), t0 = Date.now() - 4e6;
    DB.folders = [{ id: 'f1', name: '(001) A', parentId: null, order: 1, sectionId: 'sec-1', updatedAt: now }, { id: 'f2', name: '(002) B', parentId: null, order: 2, sectionId: 'sec-1', updatedAt: now }];
    DB.articles = []; DB.trash = []; DB.tombstones = [];
    for (let i = 0; i < N; i++) {
      const ts = []; if (i % 3 === 0) ts.push('big'); if (i % 5 === 0) ts.push('mid'); if (i % 97 === 0) ts.push('rare');
      const at = new Date(t0 + i * 400).toISOString();
      DB.articles.push({ id: 'n' + i, title: 'Note ' + i, content: '<p>Body ' + i + '</p>', folderIds: [i < F2 ? 'f2' : 'f1'], tags: ts, createdAt: at, updatedAt: at, kind: 'general', favourite: i % 211 === 0, pinned: i % 307 === 0 });
    }
    DB.globalTags = []; DB.tagColors = {}; DB.tagColorsAt = {};
    _seedThemeSnap(); _seedRecSnap(); persist(); _histReset();
    return DB.articles.length;
  }, { N, F2 });
}

/* In the page: run `act` (a string), report when the first screenful is painted (the next frame), when the whole list is in
   the page (`want` cards in #p2c and no slice pending), the worst long task, and the heap. */
const MEASURE = async ({ pre, act, want }) => {
  (0, eval)(pre);
  /* the user waits: the setup list finishes by itself and the page lays it out before the action is taken */
  await new Promise((r) => setTimeout(r, 400));
  for (let i = 0; i < 6000 && typeof _listPending === 'function' && _listPending(); i++) await new Promise((r) => setTimeout(r, 10));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await new Promise((r) => setTimeout(r, 300));
  const long = []; let po = null;
  try { po = new PerformanceObserver((l) => l.getEntries().forEach((e) => long.push(Math.round(e.duration)))); po.observe({ entryTypes: ['longtask'] }); } catch {}
  const t0 = performance.now(); (0, eval)(act);
  const tCall = performance.now() - t0;
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  const tFirst = performance.now() - t0;
  const cards = () => document.querySelectorAll('#p2c .ar').length;
  const first = cards();
  let tAll = null;
  while (performance.now() - t0 < 60000) {
    /* v05.53: a list over 300 cards is complete when its window is drawn (only the cards around the screen are in the page) */
    const win = typeof _listWin !== 'undefined' && _listWin && _listWin.al.isConnected && _listWin.n === want;
    if ((cards() >= want || (win && cards() > 0)) && !(typeof _listPending === 'function' && _listPending())) { tAll = performance.now() - t0; break; }
    await new Promise((r) => setTimeout(r, 20));
  }
  await new Promise((r) => setTimeout(r, 150));
  if (po) po.disconnect();
  return { call: Math.round(tCall), first: Math.round(tFirst), firstCards: first, all: tAll === null ? null : Math.round(tAll), cards: cards(), want, worst: long.length ? Math.max(...long) : 0, heapMB: Math.round(((performance.memory || {}).usedJSHeapSize || 0) / 1048576) };
};

const SCEN = (N) => {
  const big = Math.ceil(N / 3), mid = Math.ceil(N / 5), f1 = N - 2000;
  return [
    { id: 'select a tag', pre: "ST.search='';selFolder('f1');", act: "selTag('big')", want: big },
    { id: 'un-select it', pre: "ST.search='';selFolder('f1');selTag('big');", act: "selTag('big')", want: f1 },
    { id: 'switch tags', pre: "ST.search='';selFolder('f1');selTag('big');", act: "selTag('mid')", want: mid },
    { id: 'clear a search', pre: "ST.search='';selFolder('f1');doSearch('note 1');", act: 'clearSearch()', want: f1 },
    { id: 'back to a folder of 2,000', pre: "ST.search='';selFolder('f1');selTag('big');", act: "selFolder('f2')", want: 2000 },
  ];
};

const VP_SPEED = [{ name: 'phone ×4', w: 390, h: 844, th: 4, touch: true }, { name: 'laptop', w: 1440, h: 900, th: 1, touch: false }];
async function measure(label, onRow) {
  const rows = [];
  for (const N of NOTES_LIST) for (const vp of VP_SPEED) {
    const A = await openApp({ viewport: { width: vp.w, height: vp.h }, db: seedDB(), hasTouch: vp.touch });
    const p = A.page;
    try {
      await seed(p, N); await sleep(500);
      if (vp.th > 1) { const cdp = await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: vp.th }); }
      for (const s of SCEN(N)) {
        const rs = [];
        for (let i = 0; i < (+arg('reps') || (argv.includes('--measure') ? 3 : 5)); i++) rs.push(await p.evaluate(MEASURE, { pre: s.pre, act: s.act, want: s.want }));
        const m = (k) => med(rs.map((r) => (r[k] === null ? 1e9 : r[k])));
        const row = { N, vp: vp.name, scen: s.id, call: m('call'), first: m('first'), firstCards: m('firstCards'), all: m('all'), cards: m('cards'), want: s.want, worst: m('worst'), heapMB: m('heapMB') };
        rows.push(row); console.log(label + ' ' + JSON.stringify(row)); if (onRow) onRow(row);
      }
      if (A.errors.length) console.log('ERRORS', A.errors.slice(0, 3));
    } finally { await A.close(); }
  }
  return rows;
}

if (argv.includes('--measure')) { await measure('M'); process.exit(0); }

/* ═══════════════ the checks ═══════════════ */
const results = [];
function check(ok, label, detail = '') {
  results.push({ ok, label });
  console.log((ok ? '  ok   ' : ' FAIL  ') + label + (detail ? '\n         ' + String(detail).slice(0, 600) : ''));
}

/* installed on the device under test */
const HOOK = String.raw`(() => {
  if (window.__lp) return;
  const L = window.__lp = { writes: {} };
  for (const nm of ['persist', '_save', 'scheduleAutoSave', 'pushToCloud', '_stampThemeTouches']) { const o = window[nm]; if (typeof o !== 'function') continue; window[nm] = function (...a) { L.writes[nm] = (L.writes[nm] || 0) + 1; return o.apply(this, a); }; }
  L.strip = (s) => s.replace(/ data-p2c="\d+"/g, '');
  L.pending = () => (typeof _listPending === 'function' ? _listPending() : false);
  L.settle = async () => { for (let i = 0; i < 6000 && L.pending(); i++) await new Promise((r) => setTimeout(r, 10)); };
  L.want = () => {
    if (ST.kind) return DB.articles.filter((a) => artKinds(a).includes(ST.kind)).length;
    if (ST.tag) return DB.articles.filter((a) => (a.tags || []).includes(ST.tag)).length;
    if (SF.find((s) => s.id === ST.folder)) return getSmartArts(ST.folder).length;
    return artsIn(ST.folder).length;
  };
  L.cards = () => document.querySelectorAll('#p2c .ar').length;
  L.win = () => { const J = typeof _listWin !== 'undefined' ? _listWin : null; return !!(J && J.al.isConnected && document.getElementById('p2c').contains(J.al)); };
  /* the page with the list's cards taken out (and, for a window, the find bar): what must equal the whole draw around the list */
  L.frame = (el, win) => { const c = el.cloneNode(true); if (win) { c.querySelectorAll('.lf-bar').forEach((x) => x.remove()); c.querySelectorAll('.al-win').forEach((x) => { const d = document.createElement('div'); d.className = 'al'; x.replaceWith(d); }); } else { const als = c.querySelectorAll('.fv > .al'); if (als.length) als[als.length - 1].innerHTML = ''; } return L.strip(c.innerHTML); };
  L.oracle = () => {
    const out = {};
    try {
      const p2c = document.getElementById('p2c'), win = L.win();
      const a = L.strip(p2c.innerHTML), J = win ? _listWin : null;
      const fa = win ? L.frame(p2c, true) : null, wc = win ? [...J.al.children].map((x) => L.strip(x.outerHTML)) : null, r0 = win ? J.r0 : 0;
      const idx = win ? wc.map((_, k) => _lwI(J, r0 + k)) : null;
      _cardC.clear(); _p2cLast = null; const keep = _LIST_MIN; _LIST_MIN = 1e9;
      try { renderP2C(); } finally { _LIST_MIN = keep; }
      const b = L.strip(p2c.innerHTML);
      if (!win) {
        out.eq = a === b;
        if (a !== b) { let k = 0; while (k < a.length && a[k] === b[k]) k++; out.diff = '@' + k + ' cached «' + a.slice(Math.max(0, k - 60), k + 100) + '» full «' + b.slice(Math.max(0, k - 60), k + 100) + '»'; }
      } else {
        const als = p2c.querySelectorAll('.fv > .al'), whole = als.length ? [...als[als.length - 1].children].map((x) => L.strip(x.outerHTML)) : [];
        const fb = L.frame(p2c, false);
        let bad = -1; for (let k = 0; k < wc.length; k++) if (wc[k] !== whole[idx[k]]) { bad = k; break; }
        out.eq = fa === fb && bad < 0 && wc.length > 0;
        out.win = { r0, k: wc.length, n: whole.length };
        if (fa !== fb) { let k = 0; while (k < fa.length && fa[k] === fb[k]) k++; out.diff = 'around the list @' + k + ' window «' + fa.slice(Math.max(0, k - 60), k + 100) + '» whole «' + fb.slice(Math.max(0, k - 60), k + 100) + '»'; }
        else if (bad >= 0) out.diff = 'card ' + idx[bad] + ': window «' + wc[bad].slice(0, 160) + '» whole «' + String(whole[idx[bad]]).slice(0, 160) + '»';
        else if (!wc.length) out.diff = 'the window is empty';
      }
    } catch (e) { out.err = String(e); }
    return out;
  };
  /* the visible part of the list is covered by drawn cards (no blank rows on the screen) */
  L.covered = () => {
    if (!L.win()) return true;
    const J = _listWin, el = document.getElementById('p2c'), ch = J.al.children, e = el.getBoundingClientRect(), a = J.al.getBoundingClientRect();
    if (!ch.length) return _lwM(J) === 0;
    const top = ch[0].getBoundingClientRect().top, bot = ch[ch.length - 1].getBoundingClientRect().bottom;
    const vt = Math.max(e.top, a.top + parseFloat(J.al.style.paddingTop || 0) - 1), vb = Math.min(e.bottom, a.bottom);
    return (J.r0 === 0 || top <= vt + 1) && (J.r1 >= _lwM(J) || bot >= vb - 1);
  };
  /* run an action, note how much was in the page straight away, then once complete compare with a whole cache-free draw */
  L.run = async (src) => {
    (0, eval)(src);
    const first = L.cards();
    await L.settle();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const out = { first, n: L.want(), cards: L.cards(), win: L.win(), covered: L.covered() };
    return Object.assign(out, L.oracle());
  };
})();`;

const SCEN_A = [
  { id: 'select a tag', src: "ST.search='';selFolder('f1');selTag('big')" },
  { id: 'un-select it', src: "selTag('big')" },
  { id: 'switch tags', src: "selTag('big');selTag('mid')" },
  { id: 'a search cleared', src: "selTag('mid');doSearch('note 1');clearSearch()" },
  { id: 'a folder change', src: "selFolder('f2')" },
  { id: 'back to the big folder', src: "selFolder('f1')" },
  { id: 'a note edited', patch: true, src: "(()=>{const a=DB.articles.find(x=>x.id==='n2500');a.title='Edited title';a.updatedAt=new Date().toISOString();persist();render();})()" },
  { id: 'a favourite and a pin', patch: true, src: "toggleFav('n2501');togglePin('n2502');render()" },
  { id: 'a folder renamed', patch: true, src: "(()=>{const f=DB.folders.find(x=>x.id==='f1');f.name='(001) Renamed';f.updatedAt=new Date().toISOString();persist();render();})()" },
  { id: 'a tag renamed', src: "(()=>{const t=new Date().toISOString();DB.articles.forEach(a=>{const i=(a.tags||[]).indexOf('big');if(i>=0){a.tags[i]='bigger';a.updatedAt=t;}});persist();selTag('bigger');})()" },
  { id: 'a note to Trash', src: "trashArt('n2601');render()" },
  { id: 'and back', src: "(()=>{const t=DB.trash.find(x=>x.item&&x.item.id==='n2601');restoreItem(t.id);render();})()" },
  { id: 'an edit under the tag', src: "(()=>{const a=DB.articles.find(x=>x.id==='n3000');a.title='Edited under the tag';a.updatedAt=new Date().toISOString();persist();render();})()" },
  { id: 'a note-type list', src: "selKind('general')" },
  { id: 'a Smart View', src: "selFolder('sf-recent')" },
  { id: 'a Smart View, edited', src: "(()=>{const a=DB.articles.find(x=>x.id==='n2700');a.title='Edited, in the Smart View';a.updatedAt=new Date().toISOString();persist();render();})()" },
];

const NBIG = 4000, F2 = 1200;
async function chkA(vp) {
  const A = await openApp({ viewport: { width: vp.w, height: vp.h }, db: seedDB(), hasTouch: vp.touch });
  const p = A.page, tag = (s) => `${s}@${vp.n}`;
  try {
    await seed(p, NBIG, F2); await sleep(300); await p.evaluate(HOOK);
    await p.evaluate(() => { ST.search = ''; selFolder('f1'); });
    await p.evaluate(() => __lp.settle());
    for (const s of SCEN_A) {
      const r = await p.evaluate((src) => __lp.run(src), s.src);
      if (want('82a')) {
        check(!r.err && r.eq === true, `${tag('82a')} ${s.id}: the list (${r.n} cards) equals a whole cache-free draw`, r.err || r.diff || '');
        /* v05.53: a list over 300 cards is a window: only the cards around the screen are in the page, from the first paint on */
        if (r.n > 300) check(r.win && r.first < r.n && r.cards <= 200, `${tag('82a')} ${s.id}: only a window of the list is in the page (${r.cards} of ${r.n} cards)`);
      }
      if (want('82b')) check(r.n > 300 ? r.covered : r.cards === r.n, r.n > 300 ? `${tag('82b')} ${s.id}: the visible part of the list is covered by drawn cards` : `${tag('82b')} ${s.id}: every card is in the page (${r.cards} of ${r.n})`);
    }
    if (want('82b')) {
      await p.evaluate(() => { selFolder('f1'); return __lp.settle(); });
      const last = await p.evaluate(async () => {
        const a = artsIn(ST.folder), t = a.length ? a[a.length - 1].title : '', el = document.getElementById('p2c');
        el.scrollTop = el.scrollHeight; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const card = el.querySelector('.ar[data-aid="' + a[a.length - 1].id + '"]'), cr = card && card.getBoundingClientRect(), er = el.getBoundingClientRect();
        const seen = !!card && cr.bottom <= er.bottom + 1 && cr.top >= er.top - 1;
        el.scrollTop = 0; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const inp = document.getElementById('lf-q'); inp.value = t; _lfInput(t);
        for (let i = 0; i < 300 && !(_listWin.q === t && !_listWin.busy); i++) await new Promise((r) => setTimeout(r, 20));
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const found = [...el.querySelectorAll('.ar')].map((x) => x.getAttribute('data-aid')), lbl = document.getElementById('lf-n').textContent;
        _lfClear(); await new Promise((r) => setTimeout(r, 50));
        return { t, n: a.length, seen, found, lbl, id: a[a.length - 1].id };
      });
      check(last.n > 300 && last.seen, `${tag('82b')} scrolling to the end shows the last note's card (“${last.t}”, ${last.n} notes)`);
      check(last.found.length === 1 && last.found[0] === last.id && /^1 of /.test(last.lbl), `${tag('82b')} "Find in this list" finds the last note by its title (${JSON.stringify(last.found)}, “${last.lbl}”): the place of Ctrl+F in a window`);
    }
    check(A.errors.length === 0, `${tag('82a')} no page errors`, A.errors.slice(0, 3).join(' | '));
  } finally { await A.close(); }
}

/* 82a — an edit RECEIVED from a second device (the merge path's own redraw), on the fake cloud */
async function chkRecv(vp, pw, srv, browser) {
  const cloud = makeCloud(), tag = (s) => `${s}@${vp.n}`;
  const db = () => { const d = seedDB('2026-10-01T00:00:00.000Z'); for (let i = 1; i <= 700; i++) d.articles.push({ id: 'r' + i, title: 'Recv ' + i, content: '<p>Body ' + i + '</p>', folderIds: ['f1'], tags: i % 3 === 0 ? ['big'] : [], createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z', kind: 'general' }); return d; };
  const A = await addDevice(browser, srv.base, cloud, 'A' + vp.n, { width: vp.w, height: vp.h }, vp.touch, db());
  const B = await addDevice(browser, srv.base, cloud, 'B' + vp.n, { width: vp.w, height: vp.h }, vp.touch, db());
  try {
    await sleep(1500); await quiet(cloud, A, 60000); await quiet(cloud, B, 60000);
    await on(A, HOOK);
    await on(A, () => { ST.search = ''; selFolder('f1'); return __lp.settle(); });
    for (const s of [{ id: 'a title', f: () => { const a = DB.articles.find((x) => x.id === 'r50'); a.title = 'Recv 50 edited elsewhere'; a.updatedAt = new Date().toISOString(); persist(); } },
      { id: 'a tag added', f: () => { const a = DB.articles.find((x) => x.id === 'r60'); a.tags = ['big', 'fresh']; a.updatedAt = new Date().toISOString(); persist(); } }]) {
      await on(B, s.f); await on(B, () => { flushPendingPush(); });
      const t0 = Date.now(); let got = false;
      while (Date.now() - t0 < 25000) { if (await on(A, (id) => { const a = DB.articles.find((x) => x.id === id); return !!a && /edited elsewhere|fresh/.test(a.title + (a.tags || []).join()); }, s.id === 'a title' ? 'r50' : 'r60')) { got = true; break; } await sleep(100); }
      await quiet(cloud, A, 60000);
      const r = await on(A, async () => { await __lp.settle(); return Object.assign({ n: __lp.want(), cards: __lp.cards() }, __lp.oracle()); });
      check(got, `${tag('82a')} received ${s.id}: it reached the device`);
      check(!r.err && r.eq === true && (r.n > 300 ? r.cards < r.n : r.cards === r.n), `${tag('82a')} received ${s.id}: the list (${r.cards} of ${r.n} cards in the page) equals a whole cache-free draw`, r.err || r.diff || '');
    }
    check(A.errors.length === 0, `${tag('82a')} received: no page errors`, A.errors.slice(0, 3).join(' | '));
  } finally { await A.page.context().close().catch(() => {}); await B.page.context().close().catch(() => {}); }
}

async function chkC(vp) {
  const A = await openApp({ viewport: { width: vp.w, height: vp.h }, db: seedDB(), hasTouch: vp.touch });
  const p = A.page, tag = `82c@${vp.n}`;
  try {
    await seed(p, NBIG, F2); await sleep(300); await p.evaluate(HOOK);
    await p.evaluate(() => { ST.search = ''; selFolder('f1'); return __lp.settle(); });
    /* v05.53: there are no slices left to cancel. What 82c guards is the same: a new list leaves nothing of the old one in the page,
       now or later (a frame, a scroll, a timer of the old list) */
    const r = await p.evaluate(async () => {
      const p2c = document.getElementById('p2c'), late = [];
      const mo = new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1 && n.classList && n.classList.contains('ar')) late.push(n.getAttribute('data-aid')); })));
      selTag('big');
      p2c.scrollTop = 4000; await new Promise((r) => requestAnimationFrame(r));
      mo.observe(p2c, { childList: true, subtree: true });
      selTag('mid');   /* switch to another tag while the first list has just been scrolled */
      await new Promise((r) => setTimeout(r, 300));
      p2c.scrollTop += 2500; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); await new Promise((r) => setTimeout(r, 200)); mo.disconnect();
      const inMid = new Set(DB.articles.filter((a) => (a.tags || []).includes('mid')).map((a) => a.id));
      const stray = late.filter((id) => !inMid.has(id)), dom = [...document.querySelectorAll('#p2c .ar')].map((e) => e.getAttribute('data-aid'));
      return { stray: stray.length, domStray: dom.filter((id) => !inMid.has(id)).length, dom: dom.length, mid: inMid.size, late: late.length, covered: __lp.covered() };
    });
    check(r.stray === 0 && r.domStray === 0, `${tag} no card of the old list was added after the new one began (${r.stray} stray added, ${r.domStray} stray in the page)`);
    check(r.dom > 0 && r.dom < r.mid && r.late > 0 && r.covered, `${tag} the new list is a window (${r.dom} of ${r.mid} cards) that follows the scroll (${r.late} cards drawn after the switch), covering the screen`);
    check(A.errors.length === 0, `${tag} no page errors`, A.errors.slice(0, 3).join(' | '));
  } finally { await A.close(); }
}

async function chkD(vp) {
  const A = await openApp({ viewport: { width: vp.w, height: vp.h }, db: seedDB(), hasTouch: vp.touch });
  const p = A.page, tag = (s) => `82d@${vp.n} ${s}`;
  try {
    await seed(p, NBIG, F2); await sleep(300); await p.evaluate(HOOK);
    await p.evaluate(() => { ST.search = ''; selFolder('f1'); return __lp.settle(); });
    /* (i) the window is drawn at once: nothing is added to the page afterwards while nobody scrolls (v05.53; was: _listFinish()) */
    let r = await p.evaluate(async () => {
      const p2c = document.getElementById('p2c'); let late = 0;
      const mo = new MutationObserver((ms) => ms.forEach((m) => { late += m.addedNodes.length; }));
      selTag('big'); const first = __lp.cards();
      mo.observe(p2c, { childList: true, subtree: true });
      await new Promise((r) => setTimeout(r, 600)); mo.disconnect();
      return { first, late, want: __lp.want(), pending: __lp.pending(), covered: __lp.covered() };
    });
    check(r.first > 0 && r.first < r.want && r.late === 0 && !r.pending && r.covered, tag(`the window is complete at once (${r.first} of ${r.want} cards, ${r.late} added in the next 600 ms)`));
    /* (ii) a card opened from elsewhere is marked and brought into view; a click in the list does not move it */
    r = await p.evaluate(async () => {
      selFolder('f1'); const el = document.getElementById('p2c'); el.scrollTop = 0;
      await new Promise((r) => requestAnimationFrame(r));
      selArt('n1200'); await new Promise((r) => requestAnimationFrame(r)); selArt('n3999');
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const s = el.querySelector('.ar.sel'), sr = s && s.getBoundingClientRect(), er = el.getBoundingClientRect();
      const inView = !!s && sr.top >= er.top - 1 && sr.bottom <= er.bottom + 1;
      const st = el.scrollTop, bb = document.querySelector('.lf-bar').getBoundingClientRect().bottom;   /* a card in full view, not under the sticky find bar */
      const other = [...el.querySelectorAll('.ar')].find((x) => x !== s && x.getBoundingClientRect().top > Math.max(er.top, bb) && x.getBoundingClientRect().bottom < er.bottom);
      if (other) other.click(); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return { sel: [...document.querySelectorAll('#p2c .ar.sel')].map((e) => e.getAttribute('data-aid')), inView, still: el.scrollTop === st, other: other && other.getAttribute('data-aid'), ...__lp.oracle() };
    });
    check(r.inView && r.sel.length === 1 && r.sel[0] === r.other, tag(`a note opened from elsewhere is brought into view, and a click in the list then marks only the clicked card (${JSON.stringify(r.sel)})`));
    check(r.still, tag('…the click does not move the list'));
    check(r.eq === true, tag('…and the window equals a whole cache-free draw'), r.diff || r.err || '');
    /* (iii) a received edit's targeted redraw works on the window */
    r = await p.evaluate(async () => {
      selFolder('f2'); selFolder('f1'); const el = document.getElementById('p2c'); el.scrollTop = 0; await new Promise((r) => requestAnimationFrame(r));
      const vis = el.querySelector('.ar'), id = vis.getAttribute('data-aid');
      const a = DB.articles.find((x) => x.id === id); a.title = 'Edited while drawn'; a.updatedAt = new Date().toISOString();
      const node = el.firstElementChild, got = _p2cTry([id]);
      const c = el.querySelector('.ar[data-aid="' + id + '"]');
      return { got, same: el.firstElementChild === node, shown: !!c && c.textContent.includes('Edited while drawn'), ...__lp.oracle() };
    });
    check(r.got === true && r.same && r.shown, tag(`a targeted redraw works on the window: the edit shows, the page around it is the same node (${r.got ? 'targeted' : 'fell back'})`));
    check(r.eq === true, tag('…and equals a whole cache-free draw'), r.diff || r.err || '');
    /* (iv) scrolling to the end draws the last cards */
    r = await p.evaluate(async () => {
      selFolder('f2'); selFolder('f1'); const el = document.getElementById('p2c');
      el.scrollTop = el.scrollHeight; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const a = artsIn(ST.folder), last = a[a.length - 1].id;
      return { has: !!el.querySelector('.ar[data-aid="' + last + '"]'), covered: __lp.covered(), cards: __lp.cards(), ...__lp.oracle() };
    });
    check(r.has && r.covered, tag(`scrolling to the end draws the last card (${r.cards} cards in the window)`));
    check(r.eq === true, tag('…and the window at the end equals a whole cache-free draw'), r.diff || r.err || '');
    /* (v) the counts follow the data (the list's own header) */
    r = await p.evaluate(() => {
      selFolder('f1'); const el = document.getElementById('p2c'), a = artsIn(ST.folder);
      const m = /Notes \((\d+)\)/.exec(el.textContent);
      return { head: m ? +m[1] : -1, n: a.length, f1: cntOf('f1') };
    });
    check(r.head === r.n && r.f1 === r.n, tag(`the folder's counts follow the data (header ${r.head}, list ${r.n}, cntOf ${r.f1})`));
    check(A.errors.length === 0, tag('no page errors'), A.errors.slice(0, 3).join(' | '));
  } finally { await A.close(); }
}

async function chkF(vp) {
  const A = await openApp({ viewport: { width: vp.w, height: vp.h }, db: seedDB(), hasTouch: vp.touch });
  const p = A.page, tag = `82f@${vp.n}`;
  try {
    await seed(p, NBIG, F2); await sleep(300); await p.evaluate(HOOK);
    await p.evaluate(() => { ST.search = ''; selFolder('f1'); return __lp.settle(); });
    const r = await p.evaluate(async () => {
      const db0 = JSON.stringify(DB); __lp.writes = {};
      /* the list path itself: set what the list shows and draw it, as selTag / selFolder do after their own bookkeeping */
      for (const st of [{ tag: 'big' }, { tag: null }, { tag: 'mid' }, { tag: null }, { folder: 'f2' }, { folder: 'f1' }]) {
        if ('tag' in st) ST.tag = st.tag; if ('folder' in st) { ST.folder = st.folder; ST.tag = null; }
        renderP2C(); await __lp.settle();
      }
      /* v05.53: scrolling the window and finding in it write nothing either */
      const el = document.getElementById('p2c'); el.scrollTop = el.scrollHeight / 2; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      _lfInput('Note 12'); await new Promise((r) => setTimeout(r, 600)); _lfClear(); await new Promise((r) => setTimeout(r, 100));
      const w = Object.assign({}, __lp.writes), same = JSON.stringify(DB) === db0;
      return { w, same, cards: __lp.cards(), want: __lp.want(), covered: __lp.covered() };
    });
    check(Object.keys(r.w).length === 0, `${tag} drawing the list (tag, un-select, switch, folder, back), scrolling it and finding in it wrote nothing`, JSON.stringify(r.w));
    check(r.same, `${tag} …and DB is byte-identical afterwards`);
    check(r.cards > 0 && r.cards < r.want && r.covered, `${tag} …and the list is a window covering the screen (${r.cards} of ${r.want})`);
  } finally { await A.close(); }
}

/* 82e — speed. Targets (phone x4, 27,000 notes): first screenful ≤ 200 ms; no long task over 100 ms; the list complete within 3 s.
   v05.53 (J08 W1), changed in place: a list over 300 cards is complete when its window is drawn, so the old regression guards (the
   build before v05.22: 5.8 s, a 5.0 s long task) are replaced by the window's own targets as guards, scaled by this computer's
   factor. Measured on v05.52 for the record: un-selecting a tag of 25,000 complete in ~21 s with a 1.7–1.8 s long task (phone x4). */
async function chkE() {
  const rows = await measure('P82e', null);
  for (const row of rows) {
    if (row.scen === 'clear a search') continue;   /* the sidebar only: the list is not drawn */
    const L = `82e ${row.vp} ${row.N.toLocaleString('en')} notes, ${row.scen} (${row.want} cards)`;
    if (row.worst > 100) console.log(`  note  ${L}: target not met — worst long task ${row.worst} ms (target ≤ 100 ms)`);
    /* v05.24 (hs520): each guard is the runner's limit × this computer's factor (≥ 1), both printed */
    const G1 = hostLimit(200), G2 = hostLimit(200), G3 = hostLimit(400);
    check(row.first <= G1.ms, `${L}: first screenful ${row.first} ms (≤ ${G1.raw} ms × host ${G1.factor})`);
    check(row.worst <= G2.ms, `${L}: worst long task ${row.worst} ms (guard ≤ ${G2.raw} ms × host ${G2.factor}; target 100)`);
    check(row.all !== null && row.all <= G3.ms && (row.want <= 300 ? row.cards === row.want : row.cards > 0 && row.cards < row.want), `${L}: the list is complete in ${row.all} ms (${row.cards} of ${row.want} cards in the page; ≤ ${G3.raw} ms × host ${G3.factor}; target 3 s)`);
  }
}

const pw = await playwright(), srv = await serve(), browser = await pw.chromium.launch();
try {
  if (want('82a') || want('82b')) for (const vp of VPS) await chkA(vp);
  if (want('82a')) for (const vp of VPS) await chkRecv(vp, pw, srv, browser);
  if (want('82c')) for (const vp of VPS) await chkC(vp);
  if (want('82d')) for (const vp of VPS) await chkD(vp);
  if (want('82f')) for (const vp of VPS) await chkF(vp);
  if (want('82e')) await chkE();
} finally { await browser.close(); await srv.close(); }
const bad = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - bad}/${results.length} passed`);
process.exit(bad ? 1 : 0);
