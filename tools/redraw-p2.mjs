#!/usr/bin/env node
/* tools/redraw-p2.mjs — v05.19, P2: redraw only what changed after a received edit and after undo / redo (checks 78a–78d).

   What it proves. After a merge from another device and after undo / redo, the app draws only what the change touches
   (`_renderFor`). The ORACLE: right after every such draw the page snapshots #sb, #p2, #p3 (and Zab's #jeb-bar, #jeb-panel,
   #zab-btn: the bar and the phone's corner button), then calls the full render() and snapshots again. The two must be
   identical. Volatile text stripped before comparing (and why): ` data-p2c="N"` only, the mark _p2cPaint() puts on the list
   so that the NEXT paint can find it; it counts up on every whole paint, so it differs by construction. Nothing else is
   stripped: no style, no class, no id.
   Run at 390 (touch), 820 (touch) and 1440, after each of the 13 changes below, received from a second device on the fake
   cloud AND applied by undo then redo (the undo runs with the device offline, so its own change is not sent back at it).

   78a  the oracle: (1) text of a note that is not open · (2) the open note while reading · (3) a title change that moves a note
        in a Smart View · (4) a note moved to another folder · (5) a tag added, then removed · (6) a note sent to Trash, then
        restored · (7) a new note · (8) a folder renamed · (9) a note made Favourite and Pinned · (10) a Zab item edited ·
        (10b) a Zab pocket moved into another pocket · (11) a change while a search / a tag filter is on · (12) a change while
        the open note is being edited (the typed text, the editor itself and the caret survive; the oracle compares #sb and #p2
        with what _renderPreserveEdit() draws, because a whole render() would rebuild the editor)
        and for each: which panes were drawn (a text edit of a note that is not open draws the list only), and that a change
        the classifier cannot place (6, 7, 8) draws everything.
   78b  speed at --notes=9000 (default), phone x4 and laptop, median of 5: a received edit to a note that is NOT open, to the
        OPEN note, and one undo — the time of the redraw itself (_rdLast.ms); every figure is printed
   78c  fallback: an unknown change, a moved note order, a changed setting, a folder, more than 40 notes, a pop-up open → the
        caller's own full draw runs
   78d  no new writes: the redraw never calls _save / _stampThemeTouches / scheduleAutoSave / pushToCloud and never changes DB

   `--only=78a,78c` runs just those. `RDP2_ROOT=<dir>` serves another build (the unpatched run: v05.18's index.html + sw.js);
   `RDP2_BREAK=1` serves a scratch copy of this build with ONE targeted path broken (the list does not rebuild the card of the
   note that changed) to show the oracle failing. Each printed ok/FAIL line becomes one app-check check (block 78). */
import { playwright, serve, seedDB, ROOT } from './harness.mjs';
import { mkdtempSync, writeFileSync, readFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeCloud, addDevice, on, sleep, quiet, waitSeeded, check, results } from './s1-fake.mjs';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);
const vpArg = (argv.find((a) => a.startsWith('--vp=')) || '').slice(5), scArg = (argv.find((a) => a.startsWith('--scen=')) || '').slice(7);   /* narrowing, for iterating on one failure */
const NOTES = +((argv.find((a) => a.startsWith('--notes=')) || '').slice(8)) || 9000;

let root = process.env.RDP2_ROOT || (argv.find((a) => a.startsWith('--root=')) || '').slice(7) || undefined;
if (process.env.RDP2_BREAK || argv.includes('--break')) {
  root = mkdtempSync(join(tmpdir(), 'siyagah-rdp2-break-'));
  for (const f of ['sw.js', 'manifest.json']) { try { copyFileSync(join(ROOT, f), join(root, f)); } catch {} }
  const src = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const bad = src.replace('if(redo.has(String(a.id))) cards[i]=artCard(a,ST.article===a.id,true);', 'if(false) cards[i]=artCard(a,ST.article===a.id,true);');
  if (bad === src) throw new Error('RDP2_BREAK: the line to break was not found');
  writeFileSync(join(root, 'index.html'), bad);
}

const pw = await playwright();
const srv = await serve(root);
const browser = await pw.chromium.launch({ args: ['--js-flags=--max-old-space-size=8192'] });
const T0 = '2026-10-01T00:00:00.000Z';
const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];

const seed = () => {
  const db = seedDB(T0);
  for (let i = 1; i <= 40; i++) db.articles.push({ id: 'n' + i, title: 'Note ' + i, content: '<p>Body of note ' + i + '</p>', folderIds: ['f1'], tags: i % 5 === 0 ? ['five'] : [], createdAt: T0, updatedAt: T0, kind: 'general' });
  db.jebPockets = [{ id: 'pk1', name: 'Alpha', icon: '✶', color: '#CFE8FF', order: 0, createdAt: T0, updatedAt: T0 }, { id: 'pk2', name: 'Beta', icon: '✶', color: '#FFF1A8', order: 1, createdAt: T0, updatedAt: T0 }];
  db.tabs = { n3: ['n3', 'n6'] };   /* the open note n3 owns a tab group that holds n6 */
  db.jeb = [{ id: 'jz1', pocketId: 'pk1', text: 'first item', done: false, folderIds: [], tags: [], kind: null, journal: false, order: 0, createdAt: T0, updatedAt: T0 }];
  return db;
};

/* installed on the device under test: counts which panes a draw used, and runs the oracle after every _renderFor() */
const HOOK = String.raw`(() => {
  if (window.__orc) return;
  const R = window.__orc = { n: 0, res: [], calls: {}, oracle: true, ref: 'render', regions: ['#sb', '#p2', '#p3', '#jeb-bar', '#jeb-panel', '#zab-btn'], writes: {} };
  const strip = (s) => s.replace(/ data-p2c="\d+"/g, '');
  const snap = () => R.regions.map((q) => { const e = document.querySelector(q); return q + ' = ' + (e ? strip(e.innerHTML) : '(none)'); });
  for (const nm of ['renderTree', 'renderP2H', 'renderP2C', 'renderP3H', 'renderP3C', 'jebRefresh']) { const o = window[nm]; if (typeof o !== 'function') continue; window[nm] = function (...a) { if (R.counting) R.calls[nm] = (R.calls[nm] || 0) + 1; return o.apply(this, a); }; }
  for (const nm of ['_save', '_stampThemeTouches', 'scheduleAutoSave', 'pushToCloud']) { const o = window[nm]; if (typeof o !== 'function') continue; window[nm] = function (...a) { if (R.counting) R.writes[nm] = (R.writes[nm] || 0) + 1; return o.apply(this, a); }; }
  const o = window._renderFor;
  if (typeof o === 'function') window._renderFor = function (ch, fn, opts) {
    R.calls = {}; R.writes = {}; R.counting = true;
    const db0 = R.oracle ? JSON.stringify(DB) : null;
    let mode; try { mode = o.apply(this, arguments); } finally { R.counting = false; }
    const rec = { mode, nkeys: (ch && ch.keys) ? ch.keys.length : -1, calls: Object.assign({}, R.calls), writes: Object.assign({}, R.writes), plan: _rdLast && _rdLast.plan, why: _rdLast && _rdLast.why, ms: _rdLast && _rdLast.ms };
    if (db0 !== null) rec.dbSame = JSON.stringify(DB) === db0;
    if (R.oracle) {
      const a = snap();
      (R.ref === 'preserve' ? _renderPreserveEdit : render)();
      const b = snap(); rec.eq = true; rec.diff = '';
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { let k = 0; while (k < a[i].length && a[i][k] === b[i][k]) k++; rec.eq = false; rec.diff = a[i].slice(0, a[i].indexOf(' = ')) + ' @' + k + ' targeted «' + a[i].slice(Math.max(0, k - 40), k + 100) + '» full «' + b[i].slice(Math.max(0, k - 40), k + 100) + '»'; break; }
    }
    R.res.push(rec); R.n++; return mode;
  };
})();`;

const dev = (cloud, name, vp, db, opts = {}) => addDevice(browser, srv.base, cloud, name, { width: vp.w, height: vp.h }, vp.touch, db || seed(), opts);
const settle = async (cloud, ...ds) => { for (const d of ds) await quiet(cloud, d, 60000); };
const resetOrc = (d) => on(d, () => { __orc.res.length = 0; __orc.n = 0; });
const noErr = (d, tag) => check(d.errors.length === 0, `${tag} no page errors`, d.errors.slice(0, 3).join(' · '));

/* ── the changes. Each takes {id,...} and runs in the page, on a device; `persist()` only, the caller sends it. ── */
const now = () => new Date().toISOString();
const EDIT = (o) => { const a = DB.articles.find((x) => x.id === o.id); if (o.title != null) a.title = o.title; if (o.content != null) a.content = o.content; if (o.tags) a.tags = o.tags; if (o.fav) { a.favourite = true; a.pinned = true; } if (o.folderIds) a.folderIds = o.folderIds; a.updatedAt = new Date().toISOString(); persist(); };
const NEWNOTE = (o) => { const t = new Date().toISOString(); DB.articles.push({ id: o.id, title: o.title, content: '<p>brand new</p>', folderIds: ['f1'], tags: [], createdAt: t, updatedAt: t, kind: 'general' }); persist(); };
const RENAME = (o) => { const f = DB.folders.find((x) => x.id === o.id); f.name = o.name; f.updatedAt = new Date().toISOString(); persist(); };
const TRASH = (o) => { trashArt(o.id); };
const RESTORE = (o) => { const t = DB.trash.find((x) => x.item && x.item.id === o.id); restoreItem(t.id); };
const JEBEDIT = (o) => { jebEditItem(o.id, { text: o.text }); persist(); };
const JEBMOVE = (o) => { jebMovePocketInto(o.id, o.into, 0); persist(); };
const VIEW_F1 = () => { ST.search = ''; selFolder('f1'); selArt('n3'); };
const VIEW_RECENT = () => { ST.search = ''; selFolder('sf-recent'); selArt('n3'); };
const VIEW_SEARCH = () => { selFolder('f1'); selArt('n3'); ST.search = 'note'; render(); };
const VIEW_TAG = () => { ST.search = ''; selFolder('f1'); selArt('n3'); selTag('five'); };

/* steps: [{fn,arg}]; recv/undo: 'targeted' | 'full' | 'any' (what the merge / the undo must have drawn) */
const SCEN = [
  { id: '1', label: 'text of a note that is not open', view: VIEW_F1, steps: [{ fn: EDIT, arg: { id: 'n7', content: '<p>Edited text of note seven</p>' } }], recv: 'targeted', undo: 'targeted',
    recvCalls: (c) => !c.renderP3C && !c.renderP3H && !c.renderTree && !c.renderP2H && !c.jebRefresh, why: 'the list only (no sidebar, header, note or Zab)' },
  { id: '2', label: 'the open note while reading it', view: VIEW_F1, steps: [{ fn: EDIT, arg: { id: 'n3', title: 'Note 3 edited elsewhere', content: '<p>The open note, edited on the other device</p>' } }], recv: 'targeted', undo: 'targeted',
    recvCalls: (c) => c.renderP3C >= 1 && c.renderP3H >= 1, why: 'the note is drawn again' },
  { id: '3', label: "a title change that moves a note's place in a Smart View", view: VIEW_RECENT, steps: [{ fn: EDIT, arg: { id: 'n9', title: 'Note 9 now first' } }], recv: 'targeted', undo: 'targeted',
    recvCalls: (c) => c.renderP2C >= 1, why: 'the list is drawn whole' },
  { id: '4', label: 'a note moved to another folder', view: VIEW_F1, steps: [{ fn: EDIT, arg: { id: 'n12', folderIds: ['f2'] } }], recv: 'targeted', undo: 'targeted', recvCalls: (c) => c.renderTree >= 1 && c.renderP2C >= 1, why: 'sidebar counts and the list' },
  { id: '5', label: 'a tag added to a note, then removed', view: VIEW_F1, steps: [{ fn: EDIT, arg: { id: 'n15', tags: ['t-new', 'five'] } }, { fn: EDIT, arg: { id: 'n15', tags: ['five'] } }], recv: 'targeted', undo: 'targeted', recvCalls: (c) => c.renderTree >= 1, why: 'the sidebar (tag counts)' },
  { id: '6', label: 'a note sent to Trash, then restored', view: VIEW_F1, steps: [{ fn: TRASH, arg: { id: 'n20' } }, { fn: RESTORE, arg: { id: 'n20' } }], recv: 'full', undo: 'full', why: 'Trash is not classified: everything is drawn' },
  { id: '7', label: 'a new note', view: VIEW_F1, steps: [{ fn: NEWNOTE, arg: { id: 'n-new', title: 'A brand new note' } }], recv: 'full', undo: 'full', why: 'a new note is not classified: everything is drawn' },
  { id: '8', label: 'a folder renamed', view: VIEW_F1, steps: [{ fn: RENAME, arg: { id: 'f2', name: '(002) Renamed folder' } }], recv: 'full', undo: 'full', why: 'a folder is not classified: everything is drawn' },
  { id: '9', label: 'a note made Favourite and Pinned', view: VIEW_F1, steps: [{ fn: EDIT, arg: { id: 'n22', fav: true } }], recv: 'targeted', undo: 'targeted', recvCalls: (c) => c.renderTree >= 1, why: 'Smart View counts in the sidebar' },
  { id: '10', label: 'a Zab item edited', view: VIEW_F1, steps: [{ fn: JEBEDIT, arg: { id: 'jz1', text: 'first item, edited' } }], recv: 'targeted', undo: 'targeted',
    recvCalls: (c) => c.jebRefresh >= 1 && !c.renderP2C && !c.renderP3C && !c.renderTree, why: 'Zab only' },
  { id: '10b', label: 'a Zab pocket moved into another pocket', view: VIEW_F1, steps: [{ fn: JEBMOVE, arg: { id: 'pk2', into: 'pk1' } }], recv: 'any', undo: 'any', why: 'Zab (or everything when the order moved)' },
  { id: '13', label: "the title of a note in the open note's tab group", view: VIEW_F1, steps: [{ fn: EDIT, arg: { id: 'n6', title: 'Note 6 renamed, on a tab' } }], recv: 'targeted', undo: 'targeted', why: 'the tab bar follows' },
  { id: '11a', label: 'a change while a search is on', view: VIEW_SEARCH, steps: [{ fn: EDIT, arg: { id: 'n5', title: 'Note 5 found by the search' } }], recv: 'targeted', undo: 'targeted', recvCalls: (c) => c.renderTree >= 1, why: 'the search results in the sidebar' },
  { id: '11b', label: 'a change while a tag filter is on', view: VIEW_TAG, steps: [{ fn: EDIT, arg: { id: 'n10', content: '<p>Edited under the tag filter</p>' } }], recv: 'targeted', undo: 'targeted', recvCalls: (c) => c.renderP2C >= 1, why: 'the tag list' },
];

const sample = (r) => r.filter((x) => x.nkeys !== 0);
const eqAll = (r) => r.every((x) => x.eq !== false);
const firstDiff = (r) => (r.find((x) => x.eq === false) || {}).diff || '';

try {
  /* ══ 78a — the oracle, at three layouts ══ */
  if (want('78a')) {
    for (const vp of VPS.filter((v) => !vpArg || v.name === vpArg)) {
      const cloud = makeCloud(), A = await dev(cloud, 'A' + vp.name, vp), B = await dev(cloud, 'B' + vp.name, vp);
      await sleep(1500); await settle(cloud, A, B);
      await on(A, HOOK);
      /* warm-up: the first frame of a fresh notebook also carries first-render defaults (note types, settings), which is a
         legitimate whole draw; one throw-away edit, undo and redo puts the history in its everyday state */
      for (const w of ['warm up', 'warm up again']) {
        A.offline = true;
        await on(A, VIEW_F1); await on(A, EDIT, { id: 'n1', title: w }); await on(A, () => { render(); undo(); redo(); });
        A.offline = false; await settle(cloud, A, B);
      }
      for (const s of SCEN.filter((x) => !scArg || scArg.split(',').includes(x.id))) {
        const t = `78a-${s.id}@${vp.name}`;
        /* ── received from the second device ── */
        await on(A, s.view); await settle(cloud, A, B);
        let recvAll = [];
        for (const st of s.steps) {
          await resetOrc(A);
          await on(B, st.fn, st.arg); await on(B, () => { flushPendingPush(); });
          const t0 = Date.now(); let got = false;
          while (Date.now() - t0 < 25000) { if (sample(await on(A, () => __orc.res.slice())).length) { got = true; break; } await sleep(100); }
          await settle(cloud, A, B);
          const r = await on(A, () => __orc.res.slice());
          recvAll = recvAll.concat(sample(r).length ? r : []);
          check(got, `${t} received: the change reached the device and was drawn`, got ? '' : 'nothing arrived');
          check(eqAll(r), `${t} received: the targeted draw equals a full render() (${s.label})`, firstDiff(r));
          const smp = sample(r);
          if (s.recv !== 'any') check(smp.length > 0 && smp.every((x) => x.mode === s.recv), `${t} received: drawn ${s.recv === 'full' ? 'whole (the classifier does not place it)' : 'by the targeted path — ' + s.why}`, JSON.stringify(smp.map((x) => ({ mode: x.mode, why: x.why, calls: x.calls }))));
          if (s.recvCalls && st === s.steps[0]) check(smp.length > 0 && smp.some((x) => x.mode === 'targeted' && s.recvCalls(x.calls)), `${t} received: panes drawn = ${s.why}`, JSON.stringify(smp.map((x) => x.calls)));
          check(smp.every((x) => !Object.keys(x.writes || {}).length && x.dbSame !== false), `${t} received: the redraw wrote nothing and did not change DB`, JSON.stringify(smp.map((x) => [x.writes, x.dbSame])));
        }
        /* ── undo, then redo, on the device itself (offline, so its own change is not sent back at it) ── */
        A.offline = true;
        await on(A, s.view);
        for (const [i, st] of s.steps.entries()) {
          await on(A, st.fn, st.arg); await on(A, () => { render(); });   /* the screen shows the change before it is undone */
          await resetOrc(A);
          await on(A, () => { undo(); }); const ru = await on(A, () => __orc.res.slice());
          check(ru.length >= 1 && eqAll(ru), `${t} undo${s.steps.length > 1 ? ' #' + (i + 1) : ''}: the targeted draw equals a full render()`, ru.length ? firstDiff(ru) : 'undo drew nothing through _renderFor');
          if (s.undo !== 'any') check(ru.length >= 1 && ru.every((x) => x.mode === s.undo), `${t} undo${s.steps.length > 1 ? ' #' + (i + 1) : ''}: drawn ${s.undo === 'full' ? 'whole' : 'by the targeted path'}`, JSON.stringify(ru.map((x) => ({ mode: x.mode, why: x.why, calls: x.calls }))));
          await resetOrc(A);
          await on(A, () => { redo(); }); const rr = await on(A, () => __orc.res.slice());
          check(rr.length >= 1 && eqAll(rr), `${t} redo${s.steps.length > 1 ? ' #' + (i + 1) : ''}: the targeted draw equals a full render()`, rr.length ? firstDiff(rr) : 'redo drew nothing through _renderFor');
          if (s.undo !== 'any') check(rr.length >= 1 && rr.every((x) => x.mode === s.undo), `${t} redo${s.steps.length > 1 ? ' #' + (i + 1) : ''}: drawn ${s.undo === 'full' ? 'whole' : 'by the targeted path'}`, JSON.stringify(rr.map((x) => ({ mode: x.mode, why: x.why, calls: x.calls }))));
          /* only the targeted draw is held to "never touches DB": a whole render() may legitimately create a default (ensureNoteKinds) */
          check(ru.concat(rr).every((x) => x.mode !== 'targeted' || (!Object.keys(x.writes || {}).length && x.dbSame !== false)), `${t} undo/redo: the redraw wrote nothing and did not change DB`, JSON.stringify(ru.concat(rr).map((x) => [x.mode, x.writes, x.dbSame])));
          if (i < s.steps.length - 1) { await on(A, () => { render(); }); }
        }
        A.offline = false; await settle(cloud, A, B);
      }
      /* ── 12: a change arrives while the open note is being edited ── */
      {
        const t = `78a-12@${vp.name}`;
        await on(A, () => { ST.search = ''; selFolder('f1'); selArt('n4'); startEdit(); const ed = document.getElementById('ed'); ed.__keep = 'same-editor'; ed.focus(); const r = document.createRange(); r.selectNodeContents(ed); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
        await sleep(300); await A.page.keyboard.type('typed-by-the-owner'); await sleep(300);
        const before = await on(A, () => { const s = getSelection(); return { off: s.anchorOffset, in: !!(s.anchorNode && document.getElementById('ed').contains(s.anchorNode)), txt: document.getElementById('ed').textContent }; });
        await on(A, () => { __orc.ref = 'preserve'; __orc.regions = ['#sb', '#p2']; });
        await resetOrc(A);
        await on(B, EDIT, { id: 'n8', title: 'Note 8 edited while A types', content: '<p>other device edit</p>' }); await on(B, () => { flushPendingPush(); });
        const t0 = Date.now(); while (Date.now() - t0 < 25000) { if (sample(await on(A, () => __orc.res.slice())).length) break; await sleep(100); }
        await sleep(600);
        const r = await on(A, () => __orc.res.slice()), smp = sample(r);
        const after = await on(A, () => { const ed = document.getElementById('ed'), s = getSelection(); return { same: !!ed && ed.__keep === 'same-editor', editing: ST.editing, off: s.anchorOffset, in: !!(s.anchorNode && ed && ed.contains(s.anchorNode)), txt: ed ? ed.textContent : null, card: (document.querySelector('#p2c [data-aid="n8"] .ar-t') || {}).textContent }; });
        check(smp.length > 0 && eqAll(r), `${t} editing: the list and the sidebar equal what _renderPreserveEdit() draws`, firstDiff(r));
        check(smp.length > 0 && smp.every((x) => x.mode === 'targeted'), `${t} editing: drawn by the targeted path`, JSON.stringify(smp.map((x) => x.mode)));
        check(after.same && after.editing && after.txt === before.txt && after.txt.includes('typed-by-the-owner'), `${t} editing: the editor is the same node, still editing, and the typed text is there`, JSON.stringify({ before: before.txt && before.txt.slice(-30), after }));
        check(after.in && after.off === before.off, `${t} editing: the caret is where it was (${before.off} → ${after.off})`, JSON.stringify({ before, after }));
        check(/edited while A types/.test(after.card || ''), `${t} editing: the other device's change reached the list (${after.card})`);
        await on(A, () => { __orc.ref = 'render'; __orc.regions = ['#sb', '#p2', '#p3', '#jeb-bar', '#jeb-panel', '#zab-btn']; ST.editing = false; });
      }
      noErr(A, `78a@${vp.name} device A`); noErr(B, `78a@${vp.name} device B`);
      for (const d of [A, B]) await d.ctx.close().catch(() => {});
    }
  }

  /* ══ 78c / 78d — fallback and no writes, on a small notebook ══ */
  if (want('78c') || want('78d')) {
    const cloud = makeCloud(), vp = VPS[0], A = await dev(cloud, 'C390', vp);
    await sleep(1200); await settle(cloud, A);
    await on(A, () => { ST.search = ''; selFolder('f1'); selArt('n3'); });
    if (want('78c')) {
      const r = await on(A, () => {
        const cases = {
          'unknown change': { unknown: true },
          'no change given': null,
          'an order that moved': { keys: [], ord: ['articles'], head: false },
          'a setting changed': { keys: [], ord: [], head: ['theme.preset'] },
          'a setting changed (unparsable)': { keys: [], ord: [], head: true },
          'a folder changed': { keys: [{ c: 'folders', id: 'f2' }], ord: [], head: false },
          'Trash changed': { keys: [{ c: 'trash', id: 'x' }], ord: [], head: false },
          'a note that is new': { keys: [{ c: 'articles', id: 'zz', b: null, a: { id: 'zz', title: 'x' } }], ord: [], head: false },
          'a note that is gone': { keys: [{ c: 'articles', id: 'n5', b: { id: 'n5', title: 'x' }, a: null }], ord: [], head: false },
          'an unknown collection': { keys: [{ c: 'zzz', id: 'q' }], ord: [], head: false },
          '41 notes changed': { keys: Array.from({ length: 41 }, (_, i) => ({ c: 'articles', id: 'n' + (i + 1), b: Object.assign({}, DB.articles.find((x) => x.id === 'n' + (i + 1)), { title: 'old' }), a: DB.articles.find((x) => x.id === 'n' + (i + 1)) })), ord: [], head: false },
        };
        const out = {};
        for (const [k, ch] of Object.entries(cases)) { let ran = 0; const mode = _renderFor(ch, () => { ran++; }, {}); out[k] = { mode, ran }; }
        /* a note changed while a Multi window is open and while Calendar is shown: also everything */
        const one = () => ({ keys: [{ c: 'articles', id: 'n5', b: Object.assign({}, DB.articles.find((x) => x.id === 'n5'), { title: 'old' }), a: DB.articles.find((x) => x.id === 'n5') }], ord: [], head: false });
        const w = document.createElement('div'); w.className = 'float-win'; w.id = 'fw-zz'; document.body.appendChild(w);
        let ran1 = 0; out['a Multi window is open'] = { mode: _renderFor(one(), () => { ran1++; }, {}), ran: ran1 }; w.remove();
        const sv = ST.article; ST.article = 'cal'; let ran2 = 0; out['the Calendar is shown'] = { mode: _renderFor(one(), () => { ran2++; }, {}), ran: ran2 }; ST.article = sv;
        let ran3 = 0; out['control: one note, nothing unusual'] = { mode: _renderFor(one(), () => { ran3++; }, {}), ran: ran3 };
        return out;
      });
      for (const [k, v] of Object.entries(r)) {
        if (k.startsWith('control')) check(v.mode === 'targeted' && v.ran === 0, `78c control: ${k} is drawn by the targeted path and the full draw does NOT run`, JSON.stringify(v));
        else check(v.mode === 'full' && v.ran === 1, `78c fallback: ${k} → the caller's own full draw runs, once`, JSON.stringify(v));
      }
      noErr(A, '78c');
    }
    if (want('78d')) {
      const r = await on(A, () => {
        const cnt = {}; const wrap = (n) => { const o = window[n]; if (typeof o !== 'function') return () => {}; window[n] = function (...a) { cnt[n] = (cnt[n] || 0) + 1; return o.apply(this, a); }; return () => { window[n] = o; }; };
        const undoW = ['_save', '_stampThemeTouches', '_stampRecordTouches', 'scheduleAutoSave', 'pushToCloud', 'snapshotState', '_ljSave'].map(wrap);
        const live = (id) => DB.articles.find((x) => x.id === id);
        const changes = [
          { keys: [{ c: 'articles', id: 'n5', b: Object.assign({}, live('n5'), { title: 'old five' }), a: live('n5') }], ord: [], head: false },
          { keys: [{ c: 'articles', id: 'n3', b: Object.assign({}, live('n3'), { content: '<p>older</p>' }), a: live('n3') }], ord: [], head: false },
          { keys: [{ c: 'jeb', id: 'jz1' }], ord: [], head: ['themeAt'] },
          { keys: [{ c: 'folders', id: 'f2' }], ord: [], head: false },   /* the fallback path writes nothing either */
        ];
        const out = [];
        for (const ch of changes) { const j0 = JSON.stringify(DB); for (const k in cnt) delete cnt[k]; const mode = _renderFor(ch, render, {}); out.push({ mode, writes: Object.assign({}, cnt), same: JSON.stringify(DB) === j0 }); }
        undoW.forEach((f) => f());
        return out;
      });
      r.forEach((x, i) => check(Object.keys(x.writes).length === 0 && x.same, `78d the redraw (${x.mode}) of change ${i + 1} calls no save / push / stamp and leaves DB as it was`, JSON.stringify(x)));
      noErr(A, '78d');
    }
    await A.ctx.close().catch(() => {});
  }

  /* ══ 78b — speed at the owner's scale ══ */
  if (want('78b')) {
    const TARGET = { recvAway: 60, recvOpen: 150, undo: 120 };   /* phone x4 (ms of the redraw); the laptop gets a quarter */
    const cloud = makeCloud();
    const L = await dev(cloud, 'L', { w: 1440, h: 900, touch: false }, seedDB('2026-01-01T00:00:00.000Z'));
    await sleep(1500);
    await on(L, (n) => {
      const t0 = Date.now() - 5e6, s = 'The quick brown fox jumps over the lazy dog. ';
      for (let i = 0; i < n; i++) { const at = new Date(t0 + i * 500).toISOString(); DB.articles.push({ id: 'n' + i, title: 'Note ' + i, content: '<p>' + s.repeat(110) + i + '</p>', folderIds: ['f1'], tags: [], createdAt: at, updatedAt: at, kind: 'general' }); }
      persist(); flushPendingPush();
    }, NOTES);
    const okSeed = await waitSeeded(cloud, L, 1500000);
    check(okSeed, `78b the ${NOTES}-note notebook reached the fake cloud`);
    const fresh = async (name, vp, throttle) => {
      const t0 = Date.now();
      const d = await addDevice(browser, srv.base, cloud, name, { width: vp.w, height: vp.h }, vp.touch, seedDB('2026-01-01T00:00:00.000Z'), { throttle });
      while (Date.now() - t0 < 1500000) { if (await on(d, (n) => DB.articles.length >= n && !_pullInFlight && !_s1RepUnmerged && !_s1RecsMergeQueued, NOTES).catch(() => false)) break; await sleep(250); }
      return d;
    };
    const F1 = await fresh('freshLaptop', { w: 1440, h: 900, touch: false }, 0);
    const F2 = await fresh('freshPhoneX4', { w: 390, h: 844, touch: true }, 4);
    for (let i = 0; i < 2; i++) for (const d of [L, F1, F2]) await quiet(cloud, d, 180000);
    const LITE = String.raw`(() => { if (window.__lite) return; const R = window.__lite = { res: [] }; const o = window._renderFor; if (typeof o !== 'function') return;
      window._renderFor = function (ch, fn, opts) { const mode = o.apply(this, arguments); R.res.push({ mode, nkeys: (ch && ch.keys) ? ch.keys.length : -1, ms: _rdLast && _rdLast.ms }); return mode; }; })();`;
    for (const d of [F1, F2]) await on(d, LITE);
    const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
    const quietAll = async () => { for (const d of [L, F1, F2]) await quiet(cloud, d, 180000); };
    const results9 = {};
    for (const [name, d, k] of [['laptop', F1, 1], ['phone x4', F2, 4]]) {
      results9[name] = {};
      await on(d, () => { selFolder('f1'); selArt('n42'); }); await quietAll();
      /* received edit to a note that is NOT open (n42 is open) */
      const away = [];
      for (let i = 0; i < 5; i++) {
        await on(d, () => { __lite.res.length = 0; });
        await on(L, (j) => { const a = DB.articles.find((x) => x.id === 'n' + (77 + j)); a.title = 'Received away ' + Date.now(); a.updatedAt = new Date().toISOString(); persist(); flushPendingPush(); }, i);
        const t0 = Date.now(); let r = [];
        while (Date.now() - t0 < 240000) { r = (await on(d, () => __lite.res.slice())).filter((x) => x.nkeys > 0); if (r.length) break; await sleep(50); }
        await quietAll(); r = (await on(d, () => __lite.res.slice())).filter((x) => x.nkeys > 0);
        away.push({ ms: r.length ? Math.max(...r.map((x) => x.ms)) : NaN, mode: r.map((x) => x.mode).join('+') });
      }
      /* received edit to the OPEN note, reading it */
      const open = [];
      for (let i = 0; i < 5; i++) {
        await on(d, () => { __lite.res.length = 0; });
        await on(L, () => { const a = DB.articles.find((x) => x.id === 'n42'); a.title = 'Received open ' + Date.now(); a.content = '<p>' + 'Edited open note. '.repeat(40) + Date.now() + '</p>'; a.updatedAt = new Date().toISOString(); persist(); flushPendingPush(); });
        const t0 = Date.now(); let r = [];
        while (Date.now() - t0 < 240000) { r = (await on(d, () => __lite.res.slice())).filter((x) => x.nkeys > 0); if (r.length) break; await sleep(50); }
        await quietAll(); r = (await on(d, () => __lite.res.slice())).filter((x) => x.nkeys > 0);
        open.push({ ms: r.length ? Math.max(...r.map((x) => x.ms)) : NaN, mode: r.map((x) => x.mode).join('+') });
      }
      /* one undo of a local edit, a note open */
      const und = [];
      /* a fresh device's first history entry is its baseline, so its first undo is a no-op: take it out of the samples */
      await on(d, () => { const a = DB.articles.find((x) => x.id === 'n99'); a.title = 'Local warm-up ' + Date.now(); a.updatedAt = new Date().toISOString(); persist(); undo(); });
      await quietAll();
      for (let i = 0; i < 5; i++) {
        await on(d, (j) => { selArt('n42'); const a = DB.articles.find((x) => x.id === 'n' + (100 + j)); a.title = 'Local edit ' + Date.now(); a.updatedAt = new Date().toISOString(); persist(); }, i);
        await quietAll();
        await on(d, () => { selArt('n42'); __lite.res.length = 0; });
        const wall = await on(d, () => { const t = performance.now(); undo(); return performance.now() - t; });
        const r = await on(d, () => __lite.res.slice());
        und.push({ ms: r.length ? r[r.length - 1].ms : NaN, mode: r.map((x) => x.mode).join('+'), wall: Math.round(wall) });
        await quietAll();
      }
      const fmt = (a) => a.map((x) => Math.round(x.ms * 10) / 10).join(' / ');
      console.log(`SPEED ${name}: received away ${fmt(away)} · received open ${fmt(open)} · undo ${fmt(und)} (undo() call: ${und.map((x) => x.wall).join(' / ')} ms)`);
      const m = { away: med(away.map((x) => x.ms)), open: med(open.map((x) => x.ms)), undo: med(und.map((x) => x.ms)) };
      results9[name] = m;
      check(away.every((x) => x.mode === 'targeted') && open.every((x) => x.mode === 'targeted') && und.every((x) => x.mode === 'targeted'), `78b ${name}: all fifteen draws were the targeted path`, JSON.stringify({ away: away.map((x) => x.mode), open: open.map((x) => x.mode), und: und.map((x) => x.mode) }));
      check(m.away <= TARGET.recvAway / (4 / k), `78b ${name}: a received edit to a note that is not open redraws in ${Math.round(m.away * 10) / 10} ms, median of 5 (limit ${TARGET.recvAway / (4 / k)}) [${fmt(away)}]`);
      check(m.open <= TARGET.recvOpen / (4 / k), `78b ${name}: a received edit to the OPEN note redraws in ${Math.round(m.open * 10) / 10} ms, median of 5 (limit ${TARGET.recvOpen / (4 / k)}) [${fmt(open)}]`);
      check(m.undo <= TARGET.undo / (4 / k), `78b ${name}: one undo redraws in ${Math.round(m.undo * 10) / 10} ms, median of 5 (limit ${TARGET.undo / (4 / k)}) [${fmt(und)}]`);
    }
    console.log('SPEED_JSON ' + JSON.stringify(results9));
    for (const d of [L, F1, F2]) { noErr(d, '78b ' + d.name); await d.ctx.close().catch(() => {}); }
  }
} catch (e) {
  console.log(' FAIL  redraw-p2 threw: ' + (e && e.stack || e));
  results.push({ ok: false, label: 'threw' });
} finally {
  await browser.close();
  await srv.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
