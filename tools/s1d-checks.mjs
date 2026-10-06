/* tools/s1d-checks.mjs — v04.91, S1d: checks 52b–52e (called by sync-s1d.mjs; 52a, the profile, is there).

   52b  the faster assembly of the received copy merges exactly like the full one (500 random pairs, both ways)
   52c  undo / redo of ten kinds of change gives back exactly the notebook, inside the byte budget
   52d  a page killed at a random point inside a save reopens as the notebook before the save or after it, never fewer
   52e  at 9,000 notes, with localStorage refusing every write: every save lands in IndexedDB, no alarm

   No cloud here: these run the real app on its own. */
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT } from './harness.mjs';
import { check, sleep } from './s1-fake.mjs';

const BLOCK = ['**googleapis.com/**', '**gstatic.com/**', '**firebaseapp.com/**', '**firebaseio.com/**'];
const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];

async function openPlain(browser, base, vp, ctx0) {
  const ctx = ctx0 || await browser.newContext(vp.touch ? { viewport: { width: vp.w, height: vp.h }, hasTouch: true, isMobile: true } : { viewport: { width: vp.w, height: vp.h } });
  if (!ctx0) for (const p of BLOCK) await ctx.route(p, (r) => r.abort());
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e));
  page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR_FAILED/.test(m.text())) errors.push('console: ' + m.text()); });
  page.on('dialog', (x) => x.accept().catch(() => {}));
  await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree'));
  await page.waitForTimeout(300);
  await page.evaluate(`window.__sig52=${SIG52};`);
  return { ctx, page, errors };
}
/* the journal's writes have all landed */
const idle = (page) => page.evaluate(async () => { await _ljChain.catch(() => {}); await new Promise((r) => setTimeout(r, 60)); await _ljChain.catch(() => {}); return true; });

/* a notebook of n notes in the app, saved (a notebook that big enters journal mode on the first save) */
function seedInPage(page, n) {
  return page.evaluate((n) => {
    const t0 = Date.now() - 4e6, now = new Date().toISOString(), s = 'The quick brown fox jumps over the lazy dog. ';
    DB.sections = [{ id: 'sec-1', name: 'One', order: 0, updatedAt: now }, { id: 'sec-2', name: 'Two', order: 1, updatedAt: now }];
    DB.folders = [{ id: 'f1', name: '(001) A', parentId: null, order: 1, sectionId: 'sec-1', updatedAt: now }, { id: 'f2', name: '(002) B', parentId: null, order: 2, sectionId: 'sec-1', updatedAt: now }];
    DB.articles = []; DB.trash = []; DB.tombstones = [];
    for (let i = 0; i < n; i++) { const at = new Date(t0 + i * 400).toISOString(); DB.articles.push({ id: 'n' + i, title: 'Note ' + i, content: '<p>' + s.repeat(i % 7 === 0 ? 110 : 12) + i + '</p>', folderIds: [i % 3 ? 'f1' : 'f2'], tags: i % 5 ? [] : ['seed'], createdAt: at, updatedAt: at, kind: 'general' }); }
    _seedThemeSnap(); _seedRecSnap();
    persist();
    _histReset();
    return DB.articles.length;
  }, n);
}

/* ══ 52b ═════════════════════════════════════════════════════════════════════ */
const GEN = String.raw`(arg) => {
  const rnd = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const iso = (n) => new Date(1.7e12 + n * 1000).toISOString();
  const out = { tested: 0, failures: [] };
  for (let i = 0; i < arg.n; i++) {
    const seed = arg.seed0 + i, R = rnd(seed), pick = (a) => a[Math.floor(R() * a.length)], T = () => 50 + Math.floor(R() * 8) * 10;
    const base = { sections: [{ id: 's1', name: 'S1', order: 0, updatedAt: iso(1) }, { id: 's2', name: 'S2', order: 1, updatedAt: iso(1) }],
      folders: [], articles: [], trash: [], tombstones: [], calEvents: [{ id: 'ce1', title: 'E', date: '2026-10-06', updatedAt: iso(3) }], noteKinds: [{ id: 'general', name: 'General', order: 0, updatedAt: iso(1) }],
      globalTags: ['g1', 'g2'], theme: { preset: 'forest', fonts: { global: 100, sidebar: 100 } }, themeAt: {} };
    for (let f = 0; f < 5; f++) base.folders.push({ id: 'f' + f, name: 'F' + f, parentId: f > 2 ? 'f' + (f - 3) : null, order: f, sectionId: 's' + (1 + (f % 2)), updatedAt: iso(2 + f) });
    const nA = 6 + Math.floor(R() * 14);
    for (let a = 0; a < nA; a++) base.articles.push({ id: 'a' + a, title: 'Note ' + a, content: '<p>' + 'x'.repeat(Math.floor(R() * 40)) + a + '</p>', folderIds: [pick(base.folders).id], tags: R() < 0.5 ? ['t1'] : [], kind: 'general', createdAt: iso(5), updatedAt: iso(10 + Math.floor(R() * 30)) });
    for (let k = 0; k < Math.floor(R() * 3); k++) { const a = base.articles.pop(); const at = iso(40 + k); base.trash.push({ id: 'tr' + k, type: 'article', item: clone(a), deletedAt: at }); base.tombstones.push({ id: a.id, deletedAt: at }); }
    if (R() < 0.3) base.articles.push({ odd: 'no id', n: Math.floor(R() * 5) });
    const ops = (db, side) => {
      let seq = 0;
      const live = () => db.articles.filter((x) => x && x.id != null);
      const nOps = Math.floor(R() * 7);
      for (let o = 0; o < nOps; o++) {
        const kind = pick(['edit', 'edit', 'delete', 'purge', 'restore', 'fmove', 'fdelete', 'stale', 'add', 'odd', 'tag', 'theme']);
        const L = live();
        if (kind === 'edit' && L.length) { const a = pick(L); a.title += '*' + side; a.content += '<p>' + side + o + '</p>'; a.updatedAt = iso(T()); }
        else if (kind === 'delete' && L.length) { const a = pick(L), at = iso(T()); db.articles = db.articles.filter((x) => x !== a); db.trash.push({ id: 'tr' + side + o, type: 'article', item: clone(a), deletedAt: at }); db.tombstones.push({ id: a.id, deletedAt: at }); }
        else if (kind === 'purge' && db.trash.length) { const t = pick(db.trash), at = iso(T()); db.trash = db.trash.filter((x) => x !== t); db.tombstones.push({ id: t.id, deletedAt: at }); if (t.item && !db.tombstones.some((x) => x.id === t.item.id)) db.tombstones.push({ id: t.item.id, deletedAt: at }); }
        else if (kind === 'restore' && db.trash.length) { const t = pick(db.trash); db.trash = db.trash.filter((x) => x !== t); if (t.item) { t.item.updatedAt = iso(T()); db.articles.push(t.item); db.tombstones = db.tombstones.filter((x) => x.id !== t.item.id); } }
        else if (kind === 'fmove') { const f = pick(db.folders); f.parentId = R() < 0.5 ? null : pick(db.folders).id; if (f.parentId === f.id) f.parentId = null; f.order = Math.floor(R() * 9); f.updatedAt = iso(T()); }
        else if (kind === 'fdelete' && db.folders.length > 1) {
          const f = pick(db.folders), at = iso(T()); db.folders = db.folders.filter((x) => x !== f);
          const inside = db.articles.filter((x) => x && x.folderIds && x.folderIds.includes(f.id)).map(clone); inside.forEach((x) => { x.folderIds = x.folderIds.filter((i) => i !== f.id); });
          db.articles.forEach((x) => { if (x && x.folderIds) x.folderIds = x.folderIds.filter((i) => i !== f.id); });
          db.trash.push({ id: 'trf' + side + o, type: 'folder', item: clone(f), deletedAt: at, subtree: { folders: [], articles: inside } }); db.tombstones.push({ id: f.id, deletedAt: at });
        }
        else if (kind === 'stale' && L.length) { const a = pick(L); db.tombstones.push({ id: a.id, deletedAt: iso(T()) }); }   /* a tombstone of a note this very copy still holds (v04.65) */
        else if (kind === 'add') { const at = iso(T()); db.articles.push({ id: 'n' + side + o + '-' + (seq++), title: 'New ' + side, content: '<p>new</p>', folderIds: [pick(db.folders).id], tags: [], kind: 'general', createdAt: at, updatedAt: at }); }
        else if (kind === 'odd') { (R() < 0.5 ? db.articles : db.folders).push({ odd: side + o }); }
        else if (kind === 'tag' && L.length) { const a = pick(L); a.tags = R() < 0.5 ? [] : ['t1', 't' + side]; a.updatedAt = iso(T()); }
        else if (kind === 'theme') { db.theme.preset = pick(['ocean', 'sand', 'forest']); db.themeAt.preset = 1e12 + Math.floor(R() * 1000); }
      }
      return db;
    };
    const Lf = ops(clone(base), 'L'), Rt = ops(clone(base), 'R');
    for (const [dir, A, B] of [['L<-R', Lf, Rt], ['R<-L', Rt, Lf]]) {
      out.tested++;
      try {
        const snap = _s1Snap(clone(B)), map = new Map(); snap.forEach((r, k) => map.set(k, { c: r.c, o: r.o, rec: r.json }));
        const full = _s1AssembleMap(map);
        const Af = clone(A), As = clone(A);
        const fast = _s1AssembleMap(map, Af);
        out.reused = (out.reused || 0) + ['articles', 'folders', 'trash'].reduce((n, c) => n + (fast[c] || []).filter((x) => x && (Af[c] || []).includes(x)).length, 0);
        const mFull = mergeDB(As, full), mFast = mergeDB(Af, fast);
        if (_s1Canon(mFull) !== _s1Canon(mFast)) out.failures.push({ seed, dir, why: 'the faster assembly merged differently' });
        /* and whatever mergeDB() itself does to the notebook it is given, it does the same in both */
        if (_s1Canon(Af) !== _s1Canon(As)) out.failures.push({ seed, dir, why: 'the two paths left the local notebook different' });
      } catch (e) { out.failures.push({ seed, dir, why: 'threw ' + (e && e.message) }); }
    }
  }
  return out;
}`;

async function check52b(browser, srv) {
  for (const vp of VPS) {
    const { ctx, page, errors } = await openPlain(browser, srv.base, vp);
    const per = vp.name === '1440' ? 250 : 50;   /* 500 pairs at one size, 100 at the other two */
    const r = await page.evaluate(eval(GEN), { n: per, seed0: 1000 }).catch((e) => ({ tested: 0, failures: [{ seed: -1, dir: '-', why: String(e) }] }));
    const r2 = await page.evaluate(eval(GEN), { n: per, seed0: 777000 }).catch((e) => ({ tested: 0, failures: [{ seed: -1, dir: '-', why: String(e) }] }));
    const tested = r.tested + r2.tested, fails = [...r.failures, ...r2.failures], reused = (r.reused || 0) + (r2.reused || 0);
    check(tested >= per * 4 && reused > per * 4 && fails.length === 0, `52b ${vp.name}: ${per * 2} random pairs × 2 directions — merging the faster assembly gives exactly what merging the full one gives (${tested} merges, ${reused} records taken from the local copy instead of parsed)`, fails.slice(0, 5).map((f) => `seed ${f.seed} ${f.dir}: ${f.why}`).join(' | '));
    check(errors.length === 0, `52b ${vp.name}: no page errors`, errors.slice(0, 3).join(' · '));
    await ctx.close();
  }
  /* mergeDB() itself, byte for byte, is the v04.90 one: the faster path changed what is fed to it, never it */
  const cut = (txt) => { const a = txt.indexOf('function _mergeById('), b = txt.indexOf('/* ── Chunked cloud storage'); return a < 0 || b < a ? null : txt.slice(a, b); };
  let was = null;
  try { was = cut(execFileSync('git', ['show', '42e1165:index.html'], { cwd: ROOT, maxBuffer: 1 << 28 }).toString()); } catch (e) { was = null; }
  const now = cut(readFileSync(ROOT + '/index.html', 'utf8'));
  check(was !== null && was === now, '52b the merge code (_mergeById … mergeDB, 22,000+ characters of it) is exactly the v04.90 text', was === null ? 'v04.90 could not be read from git (commit 42e1165)' : `${was && was.length} vs ${now && now.length} characters`);
}

/* ══ 52c ═════════════════════════════════════════════════════════════════════ */
const OPS52C = String.raw`(() => {
  const T = window.__T52 = {};
  /* a digest of the whole notebook that does not rely on the app's own cache: every record's JSON, in array order, hashed */
  const h = (s) => { let a = 0x811c9dc5, b = 0x1b873593; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = Math.imul(a ^ c, 0x01000193); b = (Math.imul(b + c, 0x85ebca6b) ^ (b >>> 13)) | 0; } return s.length + ':' + (a >>> 0).toString(36) + (b >>> 0).toString(36); };
  T.digest = () => {
    const parts = [], collKeys = Object.keys(DB).filter((k) => Array.isArray(DB[k])).sort();
    collKeys.forEach((c) => { parts.push(c + '#' + DB[c].length); DB[c].forEach((x) => parts.push(h(JSON.stringify(x)))); });
    const head = {}; Object.keys(DB).filter((k) => !Array.isArray(DB[k]) && k !== 'themeAt').sort().forEach((k) => { head[k] = DB[k]; });   /* themeAt: see below */
    parts.push(_s1Canon(head));
    return h(parts.join('\n'));
  };
  /* DB.themeAt is the sync stamp map of the settings. undo() has always put the settings back and then let _save() stamp what it changed (so an undone setting reaches the other devices), which makes the stamps of a setting — including the 'last note viewed' the app keeps there — differ from before the step. Everything else must be exact. */
  T.canon = () => { const c = Object.assign({}, DB); delete c.themeAt; return _s1Canon(c); };
  const art = (id) => DB.articles.find((a) => a.id === id);
  T.edit = (id) => { selArt(id); startEdit(); document.getElementById('ed').insertAdjacentHTML('beforeend', '<p>UNDO-EDIT</p>'); saveArt(); };
  T.rename = (id) => { selArt(id); startEdit(); ST.etitle = 'Renamed ' + id; saveArt(); };
  T.del = (id) => trashArt(id);
  T.restore = () => restoreItem(DB.trash[DB.trash.length - 1].id);
  T.empty = () => emptyTrash();
  T.fmove = () => moveFolderToSec('f2', 'sec-2');
  T.tagAdd = (id) => { const a = art(id); a.tags = [...(a.tags || []), 'newtag']; persist(); };
  T.tagRm = (id) => { const a = art(id); a.tags = (a.tags || []).filter((t) => t !== 'newtag'); persist(); };
  T.theme = () => { DB.theme.preset = DB.theme.preset === 'ocean' ? 'sand' : 'ocean'; persist(); };
  T.sheet = (id) => { const a = art(id); a.content = '<div class="sgx" data-sg=\'{"v":1,"rows":2,"cols":2,"cells":{"0,0":{"raw":"5"}}}\'><table class="sg-static"><tr><td>5</td></tr></table></div><p>sheet</p>'; a.updatedAt = new Date().toISOString(); persist(); };
  T.merge = (id) => { const remote = JSON.parse(JSON.stringify(DB)); const r = remote.articles.find((a) => a.id === id); r.title = 'From another device'; r.updatedAt = new Date(Date.now() + 5000).toISOString(); _mergeRemoteIn(remote, 0); persist(); };
  T.frames = () => HISTORY.length;
  T.bytes = () => _histBytes();
  T.settle = () => { ST.editing = false; try { closeModal(); } catch (e) {} };
})()`;

/* what differs between two canonical forms (only for the 1,600-note runs, where the digest is the whole text) */
function explain(a, b) {
  try {
    const A = JSON.parse(a), B = JSON.parse(b), out = [];
    for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) {
      if (JSON.stringify(A[k]) === JSON.stringify(B[k])) continue;
      if (Array.isArray(A[k]) && Array.isArray(B[k])) { const i = A[k].length === B[k].length ? A[k].findIndex((x, j) => JSON.stringify(x) !== JSON.stringify(B[k][j])) : -1; out.push(k + ' ' + A[k].length + '/' + B[k].length + (i >= 0 ? ' @' + i + ' ' + JSON.stringify(A[k][i]).slice(0, 160) + ' => ' + JSON.stringify(B[k][i]).slice(0, 160) : '')); }
      else out.push(k + ': ' + JSON.stringify(A[k]).slice(0, 160) + ' => ' + JSON.stringify(B[k]).slice(0, 160));
    }
    return out.slice(0, 4).join(' ; ');
  } catch (e) { return ''; }
}
function firstDiff(a, b) { let i = 0; while (i < a.length && a[i] === b[i]) i++; return 'at char ' + i + ' of ' + a.length + '/' + b.length + ': …' + a.slice(Math.max(0, i - 80), i + 100) + '… vs …' + b.slice(Math.max(0, i - 80), i + 100) + '…'; }
async function runKinds(page, label, mode) {
  const kinds = [
    ['edit', 'edit a note', (p) => p.evaluate(() => __T52.edit('n5'))],
    ['rename', 'rename a note', (p) => p.evaluate(() => __T52.rename('n6'))],
    ['delete', 'delete a note to Trash', (p) => p.evaluate(() => __T52.del('n7'))],
    ['restore', 'restore from Trash', (p) => p.evaluate(() => __T52.restore()), (p) => p.evaluate(() => { __T52.del('n8'); })],
    ['empty', 'empty Trash', (p) => p.evaluate(() => __T52.empty()), (p) => p.evaluate(() => { __T52.del('n9'); __T52.del('n10'); })],
    ['fmove', 'move a folder to another section', (p) => p.evaluate(() => __T52.fmove())],
    ['tagadd', 'add a tag', (p) => p.evaluate(() => __T52.tagAdd('n11'))],
    ['tagrm', 'remove a tag', (p) => p.evaluate(() => __T52.tagRm('n11'))],
    ['theme', 'change the theme', (p) => p.evaluate(() => __T52.theme())],
    ['sheet', 'edit a sheet', (p) => p.evaluate(() => __T52.sheet('n12'))],
    ['merge', 'a merged remote change, then the next save', (p) => p.evaluate(() => __T52.merge('n13'))],
  ];
  const dig = (p) => p.evaluate(() => (window.__T52[window.__MODE]()));
  await page.evaluate((m) => { window.__MODE = m; }, mode);
  for (const [id, name, op, setup] of kinds) {
    if (setup) { await setup(page); await page.evaluate(() => __T52.settle()); }
    const r = {};
    r.d0 = await dig(page); const f0 = await page.evaluate(() => __T52.frames());
    await op(page); await page.evaluate(() => __T52.settle());
    r.d1 = await dig(page); const f1 = await page.evaluate(() => __T52.frames());
    await page.evaluate(() => undo()); r.du = await dig(page);
    await page.evaluate(() => redo()); r.dr = await dig(page);
    await page.evaluate(() => undo()); r.du2 = await dig(page);   /* and back again: a second undo of the same step */
    await page.evaluate(() => redo()); r.dr2 = await dig(page);
    check(r.d1 !== r.d0 && f1 === f0 + 1 && r.du === r.d0 && r.dr === r.d1 && r.du2 === r.d0 && r.dr2 === r.d1,
      `52c ${label}: ${name}: undo gives back the notebook as it was, redo gives back the one after, twice over`,
      `changed ${r.d1 !== r.d0} · frames ${f0}→${f1} · undo ${r.du === r.d0 ? 'exact' : 'DIFFERENT'} · redo ${r.dr === r.d1 ? 'exact' : 'DIFFERENT'} · undo again ${r.du2 === r.d0 ? 'exact' : 'DIFFERENT'} · redo again ${r.dr2 === r.d1 ? 'exact' : 'DIFFERENT'}${mode === 'canon' && r.du !== r.d0 ? ' — undo left: ' + (explain(r.d0, r.du) || firstDiff(r.d0, r.du)) : ''}`);
  }
}

async function check52c(browser, srv) {
  /* every viewport: 1,600 notes, compared as the full canonical form of the whole notebook (not a hash of the app's own cache) */
  for (const vp of VPS) {
    const { ctx, page, errors } = await openPlain(browser, srv.base, vp);
    await page.evaluate(OPS52C.length ? `(${OPS52C})` : '');
    await seedInPage(page, 1600); await idle(page);
    await runKinds(page, vp.name + ' · 1,600 notes', 'canon');
    check(errors.length === 0, `52c ${vp.name}: no page errors`, errors.slice(0, 3).join(' · '));
    await ctx.close();
  }
  /* the owner's size, the laptop and the phone: 9,000 notes, then the budget */
  for (const vp of [VPS[2], VPS[0]]) {
    const { ctx, page, errors } = await openPlain(browser, srv.base, vp);
    await page.evaluate(`(${OPS52C})`);
    await seedInPage(page, 9000); await idle(page);
    await runKinds(page, vp.name + ' · 9,000 notes', 'digest');
    /* a long run of edits of big notes: the history must stay inside its budget */
    for (let i = 0; i < 80; i++) await page.evaluate((i) => { const a = DB.articles.find((x) => x.id === 'n' + (i * 7 + 20)); a.content += '<p>' + 'y'.repeat(150000) + '</p>'; a.updatedAt = new Date().toISOString(); persist(); }, i);
    const st = await page.evaluate(() => ({ frames: HISTORY.length, bytes: _histBytes(), pos: HIST_POS }));
    check(st.bytes <= 30 * 1048576 && st.frames <= 61, `52c ${vp.name}: 80 edits of 150 KB each at 9,000 notes: the history holds ${st.frames - 1} steps in ${(st.bytes / 1048576).toFixed(1)} MB (budget 30 MB, 60 steps)`, JSON.stringify(st));
    const heap = await (async () => { const c = await ctx.newCDPSession(page); await c.send('HeapProfiler.enable').catch(() => {}); await c.send('HeapProfiler.collectGarbage').catch(() => {}); const h = await c.send('Runtime.getHeapUsage'); return Math.round(h.usedSize / 1048576); })();
    check(heap <= 400, `52c ${vp.name}: the JS heap is ${heap} MB after all of it (9,000 notes, a full history)`, String(heap));
    check(errors.length === 0, `52c ${vp.name} 9k: no page errors`, errors.slice(0, 3).join(' · '));
    await ctx.close();
  }
}

/* ══ 52d ═════════════════════════════════════════════════════════════════════ */
const SIG52 = `() => { const h = (s) => { let a = 0x811c9dc5; for (let i = 0; i < s.length; i++) a = Math.imul(a ^ s.charCodeAt(i), 0x01000193); return (a >>> 0).toString(36); };
  return { n: DB.articles.length, trash: DB.trash.length, sig: h(DB.articles.map((a) => a.id + '@' + a.updatedAt + '@' + a.title + '@' + a.content.length).join('|') + '#' + DB.trash.map((t) => t.id).join(',') + '#' + DB.folders.map((f) => f.id).join(',')) }; }`;

/* Each trial runs in its OWN browser process on one profile directory, so IndexedDB survives a kill. CDP Page.crash cannot be used: in this
   Chromium it hangs ~2 min and then takes the whole browser down. SIGKILL on every process of the profile is a real dead tab: no unload, no flush. */
const withTimeout = (p, ms, what) => { let t; return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error(what + ' took more than ' + ms / 1000 + ' s')), ms); })]).finally(() => clearTimeout(t)); };
async function openPersistent(browser, base, vp, dir) {
  return withTimeout((async () => {
    const ctx = await browser.browserType().launchPersistentContext(dir, { args: ['--js-flags=--max-old-space-size=8192'], ...(vp.touch ? { viewport: { width: vp.w, height: vp.h }, hasTouch: true, isMobile: true } : { viewport: { width: vp.w, height: vp.h } }) });
    for (const p of BLOCK) await ctx.route(p, (r) => r.abort());
    const page = ctx.pages()[0] || await ctx.newPage(), errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e));
    page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR_FAILED/.test(m.text())) errors.push('console: ' + m.text()); });
    page.on('dialog', (x) => x.accept().catch(() => {}));
    await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree'));
    await page.waitForTimeout(300);
    await page.evaluate(`window.__sig52=${SIG52};`);
    return { ctx, page, errors };
  })(), 60000, 'launch + boot');
}
const killProfile = (dir) => { try { execFileSync('pkill', ['-9', '-f', '--', 'user-data-dir=' + dir]); } catch (e) { /* none left */ } };
const closeQuiet = (ctx) => withTimeout(ctx.close(), 15000, 'close').catch(() => {});

async function check52d(browser, srv) {
  for (const vp of [VPS[2], VPS[0]]) {
    const dir = mkdtempSync(join(tmpdir(), 's1d-52d-'));
    const bad = [], seen = { before: 0, after: 0 }, errsAll = [];
    let ctx, page, errors, state, failed = null, last = null;
    try {
    ({ ctx, page, errors } = await openPersistent(browser, srv.base, vp, dir));
    await seedInPage(page, 2000); await idle(page);
    state = await page.evaluate(() => window.__sig52());
    for (let i = 0; i < 20; i++) {
      /* every other trial the full copy is also written straight after the save, so a kill can land inside that one too */
      const r = await page.evaluate(({ i, ck }) => {
        _LJ_CKPT_MS = ck;
        const n0 = DB.articles.length;
        /* a save big enough to take a few milliseconds to commit: 6 new notes of 250 KB, 3 edited, sometimes one deleted */
        for (let k = 0; k < 6; k++) DB.articles.push({ id: 'k' + i + '-' + k, title: 'Killed ' + i, content: '<p>' + 'z'.repeat(250000) + '</p>', folderIds: ['f1'], tags: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), kind: 'general' });
        for (let k = 0; k < 3; k++) { const a = DB.articles[(i * 13 + k * 101) % n0]; a.title += '!'; a.content += '<p>' + i + '</p>'; a.updatedAt = new Date(Date.now() + i * 1000 + k).toISOString(); }
        if (i % 3 === 0) trashArt(DB.articles[(i * 29) % n0].id);
        persist();
        return window.__sig52();
      }, { i, ck: i % 2 ? 1 : 30000 });
      await sleep(Math.floor(Math.random() * 30));   /* anywhere from "before the transaction began" to "after it ended" */
      killProfile(dir);   /* SIGKILL: a dead browser, not a closed one — no unload handler, no chance to finish */
      await sleep(300);
      closeQuiet(ctx);
      ({ ctx, page, errors } = await openPersistent(browser, srv.base, vp, dir));
      errsAll.push(...errors.filter((e) => /local journal/.test(e)));
      const got = await page.evaluate(() => window.__sig52());
      const isBefore = got.sig === state.sig, isAfter = got.sig === r.sig;
      if (isBefore) seen.before++; else if (isAfter) seen.after++;
      if (!isBefore && !isAfter) bad.push(`trial ${i}: reopened with ${got.n} notes / ${got.trash} in Trash; before the save ${state.n}/${state.trash}, after ${r.n}/${r.trash}`);
      if (got.n < Math.min(state.n, r.n)) bad.push(`trial ${i}: FEWER notes (${got.n} < ${Math.min(state.n, r.n)})`);
      state = got;
    }
    } catch (e) { failed = String(e && e.message || e); }
    if (failed) { check(false, `52d ${vp.name}: the kill trials ran to the end (${seen.before} before · ${seen.after} after so far)`, failed); killProfile(dir); rmSync(dir, { recursive: true, force: true }); continue; }
    check(bad.length === 0, `52d ${vp.name}: 20 pages killed at random points inside a save reopen as the notebook before the save or after it, never fewer (${seen.before} before · ${seen.after} after)`, bad.slice(0, 4).join(' | '));
    check(errsAll.length === 0, `52d ${vp.name}: no reopen found the journal and the full copy out of step`, errsAll.slice(0, 3).join(' · '));
    /* a write that throws half-way (the 3rd record of a save): nothing of that save may be kept, the alarm must ring, and the next save repairs everything */
    {
      const before = await page.evaluate(() => window.__sig52());
      await page.evaluate(() => {
        const orig = IDBObjectStore.prototype.put; let n = 0;
        IDBObjectStore.prototype.put = function (...a) { if (++n === 3) { IDBObjectStore.prototype.put = orig; throw new Error('stubbed: a put threw half-way through the save'); } return orig.apply(this, a); };
        for (let k = 0; k < 5; k++) { const a = DB.articles[k * 11]; a.title += ' (half)'; a.updatedAt = new Date(Date.now() + 99000 + k).toISOString(); }
        persist();
      });
      await idle(page); await sleep(300);
      const alarm = await page.evaluate(() => _lsFail);
      await closeQuiet(ctx);
      const re = await openPersistent(browser, srv.base, vp, dir);
      const after1 = await re.page.evaluate(() => window.__sig52());
      check(alarm === true && after1.sig === before.sig, `52d ${vp.name}: a save whose write throws half-way keeps NOTHING of itself (the notebook reopens as it was), and the alarm rings`, JSON.stringify({ alarm, reopenedAsBefore: after1.sig === before.sig, n: after1.n, was: before.n }));
      await re.page.evaluate(() => { for (let k = 0; k < 5; k++) { const a = DB.articles[k * 11]; a.title += ' (again)'; a.updatedAt = new Date(Date.now() + 199000 + k).toISOString(); } persist(); });
      await idle(re.page); await sleep(300);
      const want = await re.page.evaluate(() => window.__sig52());
      const alarm2 = await re.page.evaluate(() => _lsFail);
      await closeQuiet(re.ctx);
      const re2 = await openPersistent(browser, srv.base, vp, dir);
      last = re2.ctx;
      const after2 = await re2.page.evaluate(() => window.__sig52());
      check(alarm2 === false && after2.sig === want.sig, `52d ${vp.name}: the next save puts everything right and the alarm clears (reopened exactly as saved)`, JSON.stringify({ alarm2, same: after2.sig === want.sig }));
    }
    await closeQuiet(last || ctx); killProfile(dir); rmSync(dir, { recursive: true, force: true });
  }
}

/* ══ 52e ═════════════════════════════════════════════════════════════════════ */
async function check52e(browser, srv) {
  for (const vp of [VPS[2], VPS[0]]) {
    const { ctx, page, errors } = await openPlain(browser, srv.base, vp);
    /* localStorage refuses the notebook (as the owner's does): count the tries and let each one throw */
    await page.evaluate(() => {
      window.__lsTries = 0; const orig = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) { if (k === 'my-notebook-v1') { window.__lsTries++; const e = new Error('quota exceeded (stubbed)'); e.name = 'QuotaExceededError'; throw e; } return orig.call(this, k, v); };
    });
    await seedInPage(page, 9000); await idle(page);
    const cost = await page.evaluate(() => { const t = performance.now(); let threw = false; try { localStorage.setItem('my-notebook-v1', JSON.stringify(DB)); } catch (e) { threw = true; } return { ms: Math.round(performance.now() - t), threw }; });
    const tries0 = await page.evaluate(() => window.__lsTries);
    const edits = [];
    for (let i = 0; i < 6; i++) {
      const id = 'n' + (100 + i * 37), title = 'Saved in the quota-full test ' + i;
      await page.evaluate(({ id, title }) => { const a = DB.articles.find((x) => x.id === id); a.title = title; a.updatedAt = new Date().toISOString(); persist(); }, { id, title });
      await idle(page); edits.push({ id, title });
    }
    const st = await page.evaluate(() => ({ lsFail: _lsFail, tries: window.__lsTries, dot: (() => { const d = document.getElementById('save-warn-dot'); return !!d && getComputedStyle(d).display !== 'none'; })(), toasts: [...document.querySelectorAll('.toast, #toast')].map((x) => x.textContent).join(' ') }));
    const inIdb = await page.evaluate(async (edits) => {
      const db = await new Promise((res) => { const rq = indexedDB.open('siyagah-localrecs-v1', 1); rq.onsuccess = () => res(rq.result); rq.onerror = () => res(null); });
      if (!db) return edits.map(() => false);
      const get = (k) => new Promise((res) => { const rq = db.transaction('kv').objectStore('kv').get(k); rq.onsuccess = () => res(rq.result); rq.onerror = () => res(null); });
      const out = []; for (const e of edits) { const v = await get('r:articles~' + e.id); out.push(!!v && !!v.j && JSON.parse(v.j).title === e.title); } return out;
    }, edits);
    check(st.lsFail === false && !st.dot && !/storage is FULL|save failed/i.test(st.toasts), `52e ${vp.name}: 9,000 notes, localStorage refusing every write: the save-failed alarm does not fire (${tries0 === 1 ? 'one' : tries0} localStorage attempt${tries0 === 1 ? '' : 's'} before; ${st.tries - tries0} during 6 saves)`, JSON.stringify(st));
    check(inIdb.every(Boolean), `52e ${vp.name}: every one of 6 saves is in IndexedDB (read back from the journal store, not from a variable)`, JSON.stringify(inIdb));
    const t0 = Date.now();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__appBooted === true);
    const bootMs = Date.now() - t0;
    const re = await page.evaluate((edits) => ({ n: DB.articles.length, ok: edits.every((e) => (DB.articles.find((x) => x.id === e.id) || {}).title === e.title) }), edits);
    check(re.n === 9000 && re.ok, `52e ${vp.name}: reopened, all 9,000 notes and all 6 edits are there (boot ${bootMs} ms)`, JSON.stringify(re));
    console.log(`E52 ${vp.name} one failed localStorage attempt at 9,000 notes: ${cost.ms} ms (stringify + throw) — journal mode makes it ${st.tries - tries0} per save`);
    check(errors.length === 0, `52e ${vp.name}: no page errors`, errors.slice(0, 3).join(' · '));
    await ctx.close();
  }
}

export async function runChecks({ browser, srv, only }) {
  const want = (k) => !only || only.has(k);
  if (want('52b')) await check52b(browser, srv);
  if (want('52c')) await check52c(browser, srv);
  if (want('52d')) await check52d(browser, srv);
  if (want('52e')) await check52e(browser, srv);
}
