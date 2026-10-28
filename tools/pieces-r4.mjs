#!/usr/bin/env node
/* tools/pieces-r4.mjs — v05.57, J08 round 4: the device copy in pieces. Until v05.56 every checkpoint wrote the whole notebook as ONE
   record (27,000 notes: 5.8 s frozen on a phone ×4) and the start read it in one step. Now the checkpoint writes only the pieces holding a
   record saved since the last one ('P:<i>', 'Po', 'Ph', 'Pm' in siyagah-localrecs-v1), and the start reads whichever copy is newer, the
   pieces or the old full copy, with the journal laid over it (_devRead). Checks 117a–117m (the data checks at 1440; 117l at 390 / 820 / 1440):
   117a the first checkpoint writes every piece: Pm.P pieces, every record in exactly one (the one _lpIdx names), Po/Ph, Pm last; the full
        copy (`notebook`, `notebook-seq`) is not rewritten;
   117b a start reads the pieces (via 'pieces') and gets the notebook BYTE FOR BYTE (every key, every record, every order);
   117c an edited note: the next checkpoint rewrites ONE piece; a new note, a note to Trash, a folder moved and a setting all come back
        after a start, byte for byte;
   117d the journal newer than the pieces (saved, no checkpoint): an edit and a deletion come back after a start (laid over the pieces);
   117e a checkpoint cut off before its last step (Pm not moved): the start still gets every save (the journal is kept);
   117f the full copy newer than the pieces (an older build in an old tab checkpointed it): the start reads it (via 'full'), and the next
        checkpoint writes every piece again;
   117g an older build's clean-up (deletes every journal entry with an old `s`) leaves every piece, Po, Ph and Pm;
   117h a piece missing (damage): the start joins the pieces it has with the full copy: no note of either is lost;
   117i the journal's database cannot be opened at the start while a journal exists: "could not read" (B1: _idbBootFail, the warning, no
        starter notebook, nothing written), and the copy is joined back in when it opens;
   117j the empty built-in notebook is no longer merged at every start: the notebook is byte for byte what mergeDB with it gave; a built-in
        notebook with notes is still merged (_embHas);
   117k a checkpoint never runs one long step: with 2,000 notes in 64 pieces no write step is over _LP_SLICE_MS + one piece;
   117l "Linked from" at the start: the first draw leaves it out, then it is filled in place (read view) within a few seconds; opening
        another linked note shows it at once;
   117m no page errors.
   `node tools/pieces-r4.mjs` */
import { openApp, report } from './harness.mjs';

const r = report('J08 R4 — the device copy in pieces');
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const PRE = () => {
  /* 117i: make the journal's database fail to open N times (sessionStorage carries N across the reload) */
  const n = +(sessionStorage.getItem('r4fail') || 0);
  window.__r4 = { left: n, fails: 0 };
  if (n > 0) {
    const orig = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function (name) {
      if (name === 'siyagah-localrecs-v1' && window.__r4.left > 0) {
        window.__r4.left--; window.__r4.fails++;
        const req = { result: undefined, error: null, onerror: null, onsuccess: null, onblocked: null, onupgradeneeded: null };
        setTimeout(() => { req.error = new DOMException('made to fail by pieces-r4', 'UnknownError'); if (req.onerror) req.onerror({ target: req }); }, 5);
        return req;
      }
      return orig.apply(this, arguments);
    };
  }
};
/* in the page: the whole notebook as one string, keys sorted at the top (the order of records is part of it) */
const SIG = () => { const o = {}; Object.keys(DB).sort().forEach((k) => { o[k] = DB[k]; }); return JSON.stringify(o); };
const sig = (page) => page.evaluate(SIG);
/* the journal database, read raw with a cursor */
const raw = (page) => page.evaluate(() => new Promise((res) => {
  const rq = indexedDB.open('siyagah-localrecs-v1');
  rq.onsuccess = () => { const db = rq.result, out = {}; const cur = db.transaction('kv').objectStore('kv').openCursor();
    cur.onsuccess = () => { const c = cur.result; if (!c) { db.close(); res(out); return; } out[c.key] = c.value; c.continue(); }; };
  rq.onerror = () => res(null);
}));
const fullSeq = (page) => page.evaluate(() => _idbGet('notebook-seq'));
const reboot = async (page) => { await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.__appBooted === true, null, { timeout: 60000 }); await sleep(300); };
const ckpt = (page) => page.evaluate(async () => { await _ljChain.catch(() => {}); const w = await _ljCheckpoint(); await _ljChain.catch(() => {}); return w; });
const save = (page, fs) => page.evaluate(async (s) => { (0, eval)(s)(); persist(); await _ljChain.catch(() => {}); }, fs.toString());

const app = await openApp({ viewport: { width: 1440, height: 900 }, initScript: PRE });
const page = app.page;
try {
  /* a notebook in journal mode: 60 notes in two folders, journal from 0 notes (the owner's devices are past _LJ_MIN_NOTES) */
  await page.evaluate(async () => {
    window.__lpFirstMs = 1e9;
    _LJ_MIN_NOTES = 0;
    const sec = DB.sections[0].id, iso = new Date(Date.now() - 864e5).toISOString();
    DB.folders.push({ id: 'r4-a', name: 'R4 A', parentId: null, order: 50, sectionId: sec, updatedAt: iso }, { id: 'r4-b', name: 'R4 B', parentId: 'r4-a', order: 1, updatedAt: iso });
    for (let i = 0; i < 60; i++) DB.articles.push({ id: 'r4-n' + i, title: 'R4 note ' + i, content: '<p>Text ' + i + (i === 7 ? ' <span class="mention" data-art="r4-n8">R4 note 8</span>' : '') + '</p>', folderIds: [i < 40 ? 'r4-b' : 'r4-a'], tags: i % 5 ? [] : ['r4tag'], createdAt: iso, updatedAt: iso });
    DB.articles.push({ id: 'r4-odd', title: 'R4 · id with a dot.and/slash', content: '<p>x</p>', folderIds: ['r4-a'], tags: [], createdAt: iso, updatedAt: iso });
    persist(); await _ljChain.catch(() => {});
  });
  await page.waitForFunction(() => _ljOn === true, null, { timeout: 15000 });
  /* one start first: the sample notebook's Note Type groups get their first stamp at a start (v05.56 does the same), and the
     baseline below must be a notebook a start leaves as it is */
  await reboot(page); await page.evaluate(async () => { window.__lpFirstMs = 1e9; persist(); await _ljChain.catch(() => {}); });
  const seq0 = await fullSeq(page);

  /* 117a */
  const w1 = await ckpt(page);
  const kv = await raw(page);
  const a = await page.evaluate((kv) => {
    const pm = kv.Pm, P = pm && pm.P, seen = new Map(); let wrong = 0, missing = 0;
    for (let i = 0; i < (P || 0); i++) { const p = kv['P:' + i]; if (!p || !Array.isArray(p.r)) { missing++; continue; } p.r.forEach(([k]) => { seen.set(k, (seen.get(k) || 0) + 1); if (_lpIdx(k, P) !== i) wrong++; }); }
    const sw = _collect(DB, null), keys = [...sw.map.keys()];
    return { P, missing, wrong, dup: [...seen.values()].filter((n) => n > 1).length, absent: keys.filter((k) => !seen.has(k)).length, extra: [...seen.keys()].filter((k) => !sw.map.has(k)).length, n: keys.length, po: !!(kv.Po && kv.Po.o && Array.isArray(kv.Po.o.articles)), ph: !!(kv.Ph && typeof kv.Ph.j === 'string'), seq: pm && pm.seq, ljSeq: _ljSeq, ps: kv['P:0'] && kv['P:0'].ps, sInPiece: kv['P:0'] && 's' in kv['P:0'] };
  }, kv);
  r.check(w1 === true && a.P >= 64 && a.missing === 0, '117a the first checkpoint writes every piece', JSON.stringify(a));
  r.check(a.wrong === 0 && a.dup === 0 && a.absent === 0 && a.extra === 0 && a.n > 60, '117a every record is in exactly one piece, the one _lpIdx names', JSON.stringify(a));
  r.check(a.po && a.ph && a.seq === a.ljSeq && a.ps === a.seq && !a.sInPiece, '117a order, head and the marker (Pm.seq = the last save); a piece carries `ps`, never `s`', JSON.stringify(a));
  r.check((await fullSeq(page)) === seq0, '117a the full copy is not rewritten by the checkpoint', `notebook-seq ${seq0} → ${await fullSeq(page)}`);

  /* 117b */
  const s1 = await sig(page);
  await reboot(page);
  const b = await page.evaluate(() => ({ via: _lpStat.via, on: _ljOn }));
  r.check(b.via === 'pieces' && b.on, '117b a start reads the pieces', JSON.stringify(b));
  r.check((await sig(page)) === s1, '117b the notebook comes back byte for byte', '');

  /* 117c */
  const p0 = await page.evaluate(() => _lpStat.pieces);
  await save(page, () => { const n = DB.articles.find((x) => x.id === 'r4-n3'); n.content = '<p>edited R4</p>'; n.updatedAt = new Date().toISOString(); });
  await ckpt(page);
  const p1 = await page.evaluate(() => _lpStat.pieces);
  r.check(p1 - p0 === 1, '117c one edited note: the checkpoint rewrites ONE piece', `${p1 - p0} pieces`);
  await save(page, () => {
    const iso = new Date().toISOString();
    DB.articles.push({ id: 'r4-new', title: 'R4 new', content: '<p>new</p>', folderIds: ['r4-a'], tags: [], createdAt: iso, updatedAt: iso });
    DB.theme.r4Setting = 'on';
    const f = DB.folders.find((x) => x.id === 'r4-b'); f.parentId = null; f.sectionId = DB.sections[0].id; f.updatedAt = iso;
  });
  await page.evaluate(async () => { trashArt('r4-n9'); await _ljChain.catch(() => {}); });
  await ckpt(page);
  const s2 = await sig(page);
  await reboot(page);
  const c = await page.evaluate(() => ({ via: _lpStat.via, edited: (DB.articles.find((x) => x.id === 'r4-n3') || {}).content, nw: !!DB.articles.find((x) => x.id === 'r4-new'), gone: !DB.articles.find((x) => x.id === 'r4-n9'), trash: (DB.trash || []).some((t) => t.item && t.item.id === 'r4-n9'), set: DB.theme.r4Setting, moved: (DB.folders.find((x) => x.id === 'r4-b') || {}).parentId }));
  r.check(c.via === 'pieces' && c.edited === '<p>edited R4</p>' && c.nw && c.gone && c.trash && c.set === 'on' && c.moved === null, '117c an edit, a new note, a note to Trash, a folder moved and a setting come back', JSON.stringify(c));
  r.check((await sig(page)) === s2, '117c … byte for byte', '');

  /* 117d */
  await save(page, () => { const n = DB.articles.find((x) => x.id === 'r4-n4'); n.title = 'R4 journal only'; n.updatedAt = new Date().toISOString(); });
  await page.evaluate(async () => { trashArt('r4-n5'); await _ljChain.catch(() => {}); });
  const kvd = await raw(page);
  const s3 = await sig(page);
  await reboot(page);
  const d = await page.evaluate(() => ({ via: _lpStat.via, t: (DB.articles.find((x) => x.id === 'r4-n4') || {}).title, gone: !DB.articles.find((x) => x.id === 'r4-n5') }));
  r.check(!!kvd['r:articles~r4-n4'] && kvd['r:articles~r4-n4'].s > kvd.Pm.seq, '117d (the edit is in the journal only, newer than the pieces)', JSON.stringify({ s: (kvd['r:articles~r4-n4'] || {}).s, pm: kvd.Pm.seq }));
  r.check(d.via === 'pieces' && d.t === 'R4 journal only' && d.gone, '117d the journal is laid over the pieces: the edit and the deletion come back', JSON.stringify(d));
  r.check((await sig(page)) === s3, '117d … byte for byte', '');

  /* 117e */
  await save(page, () => { const n = DB.articles.find((x) => x.id === 'r4-n6'); n.title = 'R4 cut off'; n.updatedAt = new Date().toISOString(); });
  const e = await page.evaluate(async () => {
    const pm0 = (await new Promise((res) => { _ljOpen().then((db) => { const q = db.transaction('kv').objectStore('kv').get('Pm'); q.onsuccess = () => res(q.result); }); })).seq;
    const orig = _ljTx; let cut = 0;
    _ljTx = function (puts, m, clean) { if (puts && puts.some((p) => p[0] === 'Pm')) { cut++; return Promise.reject(new Error('cut off by pieces-r4')); } return orig.apply(this, arguments); };
    const w = await _ljCheckpoint(); _ljTx = orig;
    const pm1 = (await new Promise((res) => { _ljOpen().then((db) => { const q = db.transaction('kv').objectStore('kv').get('Pm'); q.onsuccess = () => res(q.result); }); })).seq;
    return { w, cut, same: pm0 === pm1, dirty: _lpDirty.size };
  });
  const s4 = await sig(page);
  await reboot(page);
  const e2 = await page.evaluate(() => ({ via: _lpStat.via, t: (DB.articles.find((x) => x.id === 'r4-n6') || {}).title }));
  r.check(e.w === false && e.cut === 1 && e.same && e.dirty > 0, '117e a checkpoint cut off before its last step: Pm not moved, the piece kept to be written again', JSON.stringify(e));
  r.check(e2.via === 'pieces' && e2.t === 'R4 cut off' && (await sig(page)) === s4, '117e the start still gets every save, byte for byte', JSON.stringify(e2));

  /* 117f — an older build checkpoints the full copy (newer than the pieces): it carries a note the pieces do not */
  await ckpt(page);
  await page.evaluate(async () => {
    const full = JSON.parse(JSON.stringify(DB)); const iso = new Date().toISOString();
    full.articles.push({ id: 'r4-oldtab', title: 'R4 from an old tab', content: '<p>o</p>', folderIds: ['r4-a'], tags: [], createdAt: iso, updatedAt: iso });
    const seq = Date.now() + 5000;
    const db = await _idbOpen(); await new Promise((res) => { const t = db.transaction('kv', 'readwrite'); const st = t.objectStore('kv'); st.put(full, 'notebook'); st.put(seq, 'notebook-seq'); t.oncomplete = res; });
    /* and its clean-up (v05.56's: every entry but m with s <= seq) */
    const ldb = await _ljOpen(); await new Promise((res) => { const t = ldb.transaction('kv', 'readwrite'); const cr = t.objectStore('kv').openCursor(); cr.onsuccess = () => { const c = cr.result; if (!c) return; if (c.key !== 'm' && c.value && c.value.s <= seq) c.delete(); c.continue(); }; t.oncomplete = res; });
    await new Promise((res) => { const t = ldb.transaction('kv', 'readwrite'); t.objectStore('kv').put({ seq: seq, n: { articles: full.articles.length } }, 'm'); t.oncomplete = res; });
  });
  /* 117g — that clean-up left every piece */
  const kvg = await raw(page);
  const g = await page.evaluate((kv) => { const P = kv.Pm && kv.Pm.P; let miss = 0; for (let i = 0; i < P; i++) if (!kv['P:' + i]) miss++; return { P, miss, po: !!kv.Po, ph: !!kv.Ph, r: Object.keys(kv).filter((k) => k.startsWith('r:')).length }; }, kvg);
  r.check(g.P >= 64 && g.miss === 0 && g.po && g.ph && g.r === 0, '117g an older build\'s clean-up leaves every piece, Po, Ph and Pm', JSON.stringify(g));
  await reboot(page);
  const f = await page.evaluate(() => ({ via: _lpStat.via, old: !!DB.articles.find((x) => x.id === 'r4-oldtab'), all: _lpAll }));
  r.check(f.via === 'full' && f.old && f.all, '117f the full copy newer than the pieces: the start reads it, and every piece is to be written', JSON.stringify(f));
  const pf = await page.evaluate(() => _lpStat.pieces);
  await ckpt(page);
  const pf2 = await page.evaluate(() => ({ n: _lpStat.pieces, P: _lpN, all: _lpAll }));
  const s5 = await sig(page);
  await reboot(page);
  const f2 = await page.evaluate(() => ({ via: _lpStat.via, old: !!DB.articles.find((x) => x.id === 'r4-oldtab') }));
  r.check(pf2.n - pf === pf2.P && !pf2.all && f2.via === 'pieces' && f2.old && (await sig(page)) === s5, '117f … the next checkpoint writes every piece, and the start is back on the pieces, byte for byte', JSON.stringify({ wrote: pf2.n - pf, P: pf2.P, f2 }));

  /* 117h — a piece lost: the start joins the rest with the full copy; nothing in either is lost */
  const h = await page.evaluate(async () => {
    const ids = new Set(DB.articles.map((x) => x.id));
    const full = JSON.parse(JSON.stringify(DB)); const db = await _idbOpen();
    await new Promise((res) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(full, 'notebook'); t.oncomplete = res; });   /* the full copy, as old as it may be: here = now */
    const ldb = await _ljOpen(); const P = _lpN; let gone = 0, k = -1;
    for (let i = 0; i < P; i++) { const v = await new Promise((res) => { const q = ldb.transaction('kv').objectStore('kv').get('P:' + i); q.onsuccess = () => res(q.result); }); if (v.r.some(([key]) => key.startsWith('articles~'))) { k = i; gone = v.r.filter(([key]) => key.startsWith('articles~')).length; break; } }
    await new Promise((res) => { const t = ldb.transaction('kv', 'readwrite'); t.objectStore('kv').delete('P:' + k); t.oncomplete = res; });
    return { ids: [...ids], piece: k, notesInIt: gone };
  });
  await reboot(page);
  const h2 = await page.evaluate((ids) => ({ via: _lpStat.via, partial: _lpStat.partial, lost: ids.filter((id) => !DB.articles.find((x) => x.id === id)), all: _lpAll }), h.ids);
  r.check(h.notesInIt > 0 && h2.partial === 1 && h2.lost.length === 0 && h2.all, '117h a piece missing: joined with the full copy, no note lost, every piece to be written', JSON.stringify({ h: { piece: h.piece, notes: h.notesInIt }, h2 }));
  await ckpt(page);

  /* 117i — the journal's database will not open at the start */
  const nBefore = await page.evaluate(() => DB.articles.length);
  await page.evaluate(() => sessionStorage.setItem('r4fail', '1000000'));
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.__appBooted === true, null, { timeout: 90000 }); await sleep(300);
  const i1 = await page.evaluate(() => ({ fail: _idbBootFail, ready: _idbReady, warn: !!document.getElementById('idb-warn'), notes: DB.articles.map((x) => x.id), fails: window.__r4.fails }));
  const kvi = await page.evaluate(() => { const l = window.__r4.left; window.__r4.left = 0; return l; });   /* (raw() opens it: let it) */
  const rawi = await raw(page);
  /* (what B1 then shows is its own business — boot-b1.mjs: never the starter set over a copy it could not read; here the harness's small
     localStorage copy, as a device that once saved there has) */
  r.check(i1.fail === true && i1.ready === false && i1.warn && i1.fails > 0 && !i1.notes.some((id) => id.startsWith('r4-')), '117i the journal cannot be read at the start: "could not read" (B1), the warning, the device copy not taken for read', JSON.stringify(i1));
  r.check(!!rawi.Pm && rawi.Pm.seq === kvg.Pm.seq || rawi.Pm.seq >= kvg.Pm.seq, '117i … and nothing was written meanwhile', '');
  await page.evaluate(async () => { sessionStorage.removeItem('r4fail'); await _idbRecoverTry(); });
  const i2 = await page.evaluate(() => ({ fail: _idbBootFail, n: DB.articles.length, warn: !!document.getElementById('idb-warn') }));
  r.check(i2.fail === false && i2.n === nBefore && !i2.warn, '117i … the copy is joined back in once it opens', JSON.stringify({ i2, nBefore, kvi }));

  /* 117j — the empty built-in notebook */
  const j = await page.evaluate(() => {
    const emb = JSON.parse(document.getElementById('nd').textContent);
    const a = SIG_(); const m = mergeDB(JSON.parse(JSON.stringify(DB)), emb); const o = {}; Object.keys(m).sort().forEach((k) => { o[k] = m[k]; });
    function SIG_() { const o = {}; Object.keys(DB).sort().forEach((k) => { o[k] = DB[k]; }); return JSON.stringify(o); }
    const x = {}; _embShape(x, emb); const z = mergeDB({ folders: [], articles: [], sections: [], trash: [] }, emb);
    return { empty: !_embHas(emb), same: a === JSON.stringify(o), shape: JSON.stringify(Object.keys(x)) === JSON.stringify(Object.keys(z)) && JSON.stringify(x) === JSON.stringify(z), withNotes: _embHas({ folders: [], articles: [{ id: 'x' }], sections: [], trash: [] }), withKey: _embHas({ folders: [], articles: [], sections: [], trash: [], theme: {} }) };
  });
  r.check(j.empty && j.same, '117j the empty built-in notebook is not merged, and the notebook is byte for byte what the merge gave', JSON.stringify(j));
  r.check(j.shape && j.withNotes && j.withKey, '117j a built-in notebook with notes (or any other key) is still merged; the shape added is mergeDB\'s own', JSON.stringify(j));

  /* 117k — no long step: 2,000 notes in 64 pieces */
  const k = await page.evaluate(async () => {
    const iso = new Date().toISOString(); for (let i = 0; i < 2000; i++) DB.articles.push({ id: 'r4-k' + i, title: 'K ' + i, content: '<p>' + 'word '.repeat(4000) + '</p>', folderIds: ['r4-a'], tags: [], createdAt: iso, updatedAt: iso });
    persist(); await _ljChain.catch(() => {});
    _lpAll = true; _lpAllGen++; _lpStat.worst = 0; const st0 = _lpStat.steps;
    const w = await _ljCheckpoint();
    return { w, worst: Math.round(_lpStat.worst), steps: _lpStat.steps - st0, P: _lpN };
  });
  r.check(k.w && k.steps > 1 && k.worst < 25 + 40, '117k a checkpoint of every piece runs in short steps (no step over the slice and one piece)', JSON.stringify(k));
} catch (e) {
  r.check(false, '117 threw', String(e && e.stack || e));
}
const errs = app.errors.filter((x) => !/a piece is missing; joined with the full copy/.test(x));   /* 117h's own report */
r.check(errs.length === 0, '117m no page errors (data checks; 117h\'s report of the missing piece aside)', errs.slice(0, 3).join(' | '));
await app.close();

/* 117l — "Linked from" at the start, at the three sizes */
for (const [w, h, touch] of [[390, 844, true], [820, 1180, true], [1440, 900, false]]) {
  const t = `@${w}`;
  const app2 = await openApp({ viewport: { width: w, height: h }, hasTouch: touch });
  const pg = app2.page;
  try {
    await pg.evaluate(async () => {
      const iso = new Date(Date.now() - 864e5).toISOString(), sec = DB.sections[0].id;
      DB.folders.push({ id: 'bl-f', name: 'BL', parentId: null, order: 60, sectionId: sec, updatedAt: iso });
      DB.articles.push({ id: 'bl-target', title: 'BL target', content: '<p>the target</p>', folderIds: ['bl-f'], tags: [], createdAt: iso, updatedAt: iso },
        { id: 'bl-src', title: 'BL source', content: '<p>see <span class="mention" data-art="bl-target">BL target</span></p>', folderIds: ['bl-f'], tags: [], createdAt: iso, updatedAt: iso },
        { id: 'bl-t2', title: 'BL second target', content: '<p>second</p>', folderIds: ['bl-f'], tags: [], createdAt: iso, updatedAt: iso },
        { id: 'bl-src2', title: 'BL second source', content: '<p><span class="mention" data-art="bl-t2">x</span></p>', folderIds: ['bl-f'], tags: [], createdAt: iso, updatedAt: iso });
      selFolder('bl-f'); selArt('bl-target'); persist(); await _ljChain.catch(() => {});
    });
    await sleep(800);
    await pg.reload({ waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(() => window.__appBooted === true, null, { timeout: 60000 });
    const first = await pg.evaluate(() => ({ art: ST.article, boot: _blBoot }));
    await pg.waitForFunction(() => { const b = document.querySelector('#p3c #backlinks'); return b && /Linked from \(1\)/.test(b.textContent); }, null, { timeout: 10000 }).catch(() => {});
    const filled = await pg.evaluate(() => { const b = document.querySelector('#p3c #backlinks'); return { txt: b ? b.textContent.replace(/\s+/g, ' ').slice(0, 80) : null, n: document.querySelectorAll('#p3c #backlinks').length, inAv: !!(b && b.closest('.av')), warm: _blWarmState }; });
    r.check(first.art === 'bl-target' && !first.boot && filled.n === 1 && filled.inAv && filled.warm === 2 && /BL source/.test(filled.txt || ''), `117l${t} the open note's "Linked from" is filled in after the start's first draw`, JSON.stringify({ first, filled }));
    await pg.evaluate(() => selArt('bl-t2'));
    const second = await pg.evaluate(() => { const b = document.querySelector('#p3c #backlinks'); return b ? b.textContent.replace(/\s+/g, ' ').slice(0, 80) : null; });
    r.check(/Linked from \(1\)/.test(second || '') && /BL second source/.test(second || ''), `117l${t} opening another linked note shows it at once`, String(second));
  } catch (e) { r.check(false, `117l${t} threw`, String(e && e.stack || e)); }
  r.check(app2.errors.length === 0, `117m${t} no page errors`, app2.errors.slice(0, 3).join(' | '));
  await app2.close();
}
process.exit(r.finish() ? 1 : 0);
