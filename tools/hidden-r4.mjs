#!/usr/bin/env node
/* tools/hidden-r4.mjs — v05.57, J08 round 4 (rebuilt): the device's full copy is rewritten ONLY while the page is hidden. Until v05.56 a
   checkpoint (the whole notebook as one put: 27,000 notes froze a phone ×4 for 5.8 s) also ran 10 minutes after the last save and after
   3,000 journal puts, while the owner was using the app. The first design of this round (the copy in pieces, PR #247) was withdrawn: under
   load a kill during its first whole write made Chromium drop the origin's whole IndexedDB store (52d). Checks 117a–117m:
   117a a visible page: an edit, 10 × _LJ_CKPT_MS of idle and a save past _LJ_CKPT_PUTS start no checkpoint and arm no timer;
   117b … every one of those saves comes back after a reload, byte for byte (the journal laid over the older full copy);
   117c hiding the page writes the full copy (notebook-seq catches up with the last save);
   117d a save made while hidden (a sync in the background) is copied _LJ_CKPT_MS later if the page is still hidden; one made just
        before the page came back into view is not copied while it is visible;
   117e pagehide while still "visible" (a desktop window closed) writes the copy;
   117f a failed open of the journal's database is not remembered (_ljOpen asks again);
   117j the empty built-in notebook is no longer merged at every start: the notebook is byte for byte what mergeDB with it gave; a built-in
        notebook with notes (or any other key) is still merged (_embHas);
   117l "Linked from" at the start: the first draw leaves it out, then it is filled in place (read view); opening another linked note
        shows it at once — at 390 / 820 / 1440;
   117m no page errors.
   `node tools/hidden-r4.mjs` */
import { openApp, report } from './harness.mjs';

const r = report('J08 R4 — the full copy only while hidden');
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const SIG = () => { const o = {}; Object.keys(DB).sort().forEach((k) => { o[k] = DB[k]; }); return JSON.stringify(o); };
const sig = (page) => page.evaluate(SIG);
const reboot = async (page) => { await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.__appBooted === true, null, { timeout: 60000 }); await sleep(300); };
const VIS = (v) => { Object.defineProperty(document, 'visibilityState', { get: () => v, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); };
const st = (page) => page.evaluate(async () => ({ full: _ljStat.full, timer: !!_ljCkptTimer, ckpt: _ljCkpt, seq: _ljSeq, nseq: await _idbGet('notebook-seq') }));

const app = await openApp({ viewport: { width: 1440, height: 900 } });
const page = app.page;
try {
  await page.evaluate(async () => {
    _LJ_MIN_NOTES = 0;
    const sec = DB.sections[0].id, iso = new Date(Date.now() - 864e5).toISOString();
    DB.folders.push({ id: 'r4-a', name: 'R4 A', parentId: null, order: 50, sectionId: sec, updatedAt: iso });
    for (let i = 0; i < 40; i++) DB.articles.push({ id: 'r4-n' + i, title: 'R4 note ' + i, content: '<p>Text ' + i + '</p>', folderIds: ['r4-a'], tags: [], createdAt: iso, updatedAt: iso });
    persist(); await _ljChain.catch(() => {});
  });
  await page.waitForFunction(() => _ljOn === true, null, { timeout: 15000 });
  await reboot(page);
  await page.evaluate(async () => { persist(); await _ljChain.catch(() => {}); });

  /* 117a — visible: nothing copied */
  const a0 = await st(page);
  await page.evaluate(async () => {
    _LJ_CKPT_MS = 50;
    const a = DB.articles.find((x) => x.id === 'r4-n3'); a.title = 'R4 edited'; a.updatedAt = new Date().toISOString(); persist(); await _ljChain.catch(() => {});
    DB.articles.push({ id: 'r4-new', title: 'R4 new', content: '<p>new</p>', folderIds: ['r4-a'], tags: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    persist(); await _ljChain.catch(() => {});
    trashArt('r4-n5'); await _ljChain.catch(() => {});
  });
  await sleep(600);
  const a1 = await st(page);
  await page.evaluate(async () => {
    _ljPuts = _LJ_CKPT_PUTS + 10;
    const a = DB.articles.find((x) => x.id === 'r4-n4'); a.content += '<p>more</p>'; a.updatedAt = new Date().toISOString(); persist(); await _ljChain.catch(() => {});
  });
  await sleep(400);
  const a2 = await st(page);
  r.check(a1.full === a0.full && a2.full === a0.full && !a1.timer && !a2.timer && a2.seq > a2.ckpt, '117a a visible page: edits, idle past _LJ_CKPT_MS and a save past _LJ_CKPT_PUTS start no checkpoint', JSON.stringify({ a0, a1, a2 }));

  /* 117b — the journal holds every one of them */
  const before = await sig(page);
  await reboot(page);
  const after = await sig(page);
  const b = await page.evaluate(() => ({ t: (DB.articles.find((x) => x.id === 'r4-n3') || {}).title, nw: !!DB.articles.find((x) => x.id === 'r4-new'), gone: !DB.articles.find((x) => x.id === 'r4-n5') }));
  r.check(before === after && b.t === 'R4 edited' && b.nw && b.gone, '117b after a reload every save made while visible is there, byte for byte (the journal over the older full copy)', JSON.stringify({ same: before === after, ...b }));

  /* 117c — hidden: the copy is written */
  const c = await page.evaluate(async () => {
    const a = DB.articles.find((x) => x.id === 'r4-n6'); a.title = 'R4 c'; a.updatedAt = new Date().toISOString(); persist(); await _ljChain.catch(() => {});
    const f0 = _ljStat.full, seq = _ljSeq;
    Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange'));
    for (let i = 0; i < 100 && _ljStat.full === f0; i++) await new Promise((r) => setTimeout(r, 50));
    await _ljChain.catch(() => {});
    return { grew: _ljStat.full - f0, nseq: await _idbGet('notebook-seq'), seq };
  });
  r.check(c.grew === 1 && c.nseq >= c.seq, '117c hiding the page writes the full copy (it catches up with the last save)', JSON.stringify(c));

  /* 117d — a save while hidden: copied _LJ_CKPT_MS later; one just before coming back into view: not copied while visible */
  const d = await page.evaluate(async () => {
    _LJ_CKPT_MS = 300;
    const f0 = _ljStat.full;
    const a = DB.articles.find((x) => x.id === 'r4-n7'); a.title = 'R4 d'; a.updatedAt = new Date().toISOString(); persist(); await _ljChain.catch(() => {});
    const armed = !!_ljCkptTimer;
    for (let i = 0; i < 60 && _ljStat.full === f0; i++) await new Promise((r) => setTimeout(r, 50));
    await _ljChain.catch(() => {});
    const hiddenCopy = _ljStat.full - f0, f1 = _ljStat.full;
    const b2 = DB.articles.find((x) => x.id === 'r4-n8'); b2.title = 'R4 d2'; b2.updatedAt = new Date().toISOString(); persist(); await _ljChain.catch(() => {});
    Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange'));
    await new Promise((r) => setTimeout(r, 800));
    return { armed, hiddenCopy, visibleCopy: _ljStat.full - f1, timer: !!_ljCkptTimer };
  });
  r.check(d.armed && d.hiddenCopy === 1, '117d a save made while hidden is copied _LJ_CKPT_MS later, still hidden', JSON.stringify(d));
  r.check(d.visibleCopy === 0 && !d.timer, '117d … a save just before the page came back into view is not copied while it is visible', JSON.stringify(d));

  /* 117e — pagehide while "visible" */
  const e = await page.evaluate(async () => {
    const f0 = _ljStat.full;
    const a = DB.articles.find((x) => x.id === 'r4-n9'); a.title = 'R4 e'; a.updatedAt = new Date().toISOString(); persist(); await _ljChain.catch(() => {});
    window.dispatchEvent(new Event('pagehide'));
    for (let i = 0; i < 100 && _ljStat.full === f0; i++) await new Promise((r) => setTimeout(r, 50));
    window.dispatchEvent(new Event('pageshow'));
    return { grew: _ljStat.full - f0, gone: _ljPageGone };
  });
  r.check(e.grew === 1 && e.gone === false, '117e pagehide (a window closed while visible) writes the copy', JSON.stringify(e));

  /* 117f — a failed open is not remembered */
  const f = await page.evaluate(async () => {
    _ljDbP = null;
    const orig = IDBFactory.prototype.open; let n = 0;
    IDBFactory.prototype.open = function (name) {
      if (name === 'siyagah-localrecs-v1' && n === 0) { n++; const req = { onerror: null, onsuccess: null, onblocked: null, onupgradeneeded: null }; setTimeout(() => req.onerror && req.onerror({}), 5); return req; }
      return orig.apply(this, arguments);
    };
    const x1 = await _ljOpen(); const x2 = await _ljOpen();
    IDBFactory.prototype.open = orig;
    return { first: x1 === null, second: !!(x2 && x2.name) };
  });
  r.check(f.first && f.second, '117f a failed open of the journal\'s database is asked again, not remembered', JSON.stringify(f));

  /* 117j — the empty built-in notebook */
  const j = await page.evaluate(() => {
    const emb = JSON.parse(document.getElementById('nd').textContent);
    const SIG_ = () => { const o = {}; Object.keys(DB).sort().forEach((k) => { o[k] = DB[k]; }); return JSON.stringify(o); };
    const a = SIG_(); const m = mergeDB(JSON.parse(JSON.stringify(DB)), emb); const o = {}; Object.keys(m).sort().forEach((k) => { o[k] = m[k]; });
    const x = {}; _embShape(x, emb); const z = mergeDB({ folders: [], articles: [], sections: [], trash: [] }, emb);
    return { empty: !_embHas(emb), same: a === JSON.stringify(o), shape: JSON.stringify(x) === JSON.stringify(z), withNotes: _embHas({ folders: [], articles: [{ id: 'x' }], sections: [], trash: [] }), withKey: _embHas({ folders: [], articles: [], sections: [], trash: [], theme: {} }) };
  });
  r.check(j.empty && j.same, '117j the empty built-in notebook is not merged, and the notebook is byte for byte what the merge gave', JSON.stringify(j));
  r.check(j.shape && j.withNotes && j.withKey, '117j a built-in notebook with notes (or any other key) is still merged; the shape added is mergeDB\'s own', JSON.stringify(j));
} catch (e) {
  r.check(false, '117 threw', String(e && e.stack || e));
}
r.check(app.errors.length === 0, '117m no page errors (data checks)', app.errors.slice(0, 3).join(' | '));
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
