#!/usr/bin/env node
/* tools/speed-j117.mjs — v05.71, J117 (block 131). Faster search: the plain-text cache (_stOf), the 150 ms pause, the sliced search.
   131a the new search (_searchAll(q).noteHits) gives the SAME notes in the SAME order as the old search
        `DB.articles.filter(a=>_matchesAllWords(a.title+' '+strip(a.content),words))`, for many queries;
   131b the same after an edit that keeps the content LENGTH and does not move updatedAt (the exact-key rule: e.c===c), after a title edit,
        after a received merge (mergeDB) and after undo / redo;
   131c a note changes while a sliced search is running: the final answer is the old search's answer on the final data, and no stale partial shows;
   131d the cache holds at most _ST_CAP characters, and a note over the budget is still found;
   131e typing a key does not search before the 150 ms pause and a newer key cancels the older run (one final paint, for the last key);
   131f no page errors.
   `--measure [--notes=N]` prints the search timings and heap with and without a warm cache (not a check). */
import { openApp, report, seedDB } from './harness.mjs';
const argv = process.argv.slice(2);
const MEASURE = argv.includes('--measure');
const NOTES = +((argv.find((a) => a.startsWith('--notes=')) || '').split('=')[1]) || 3000;
const r = report('J117 — faster search');
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const WORDS = 'alpha beta gamma delta lorem ipsum dolor sit amet zebra quick brown fox river stone cloud'.split(' ');
const mk = (n) => {
  const d = seedDB(); const now = new Date().toISOString(); let s = 7; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let i = 0; i < n; i++) {
    let c = ''; for (let k = 0; k < 8; k++) c += '<p>' + [0, 1, 2, 3, 4, 5].map(() => WORDS[(rnd() * WORDS.length) | 0]).join(' ') + (k === 3 ? ' tok' + i : '') + '</p>';
    d.articles.push({ id: 'j' + i, title: 'Note ' + i + ' ' + WORDS[(rnd() * WORDS.length) | 0], content: c, folderIds: ['f1'], tags: [], createdAt: now, updatedAt: now, kind: 'general' });
  }
  return d;
};
const QUERIES = ['alpha', 'ALPHA beta', 'lorem ipsum dolor', 'zebra  fox', 'tok7', 'tok12 tok', 'note 1', 'quick brown', 'cloud stone river', 'nomatchzzz', 'a', ' dolor ', 'sit amet'];
const oldIds = (p, q) => p.evaluate((q) => { const w = _searchWords(q); return DB.articles.filter((a) => _matchesAllWords(a.title + ' ' + strip(a.content), w)).map((a) => a.id); }, q);
const newIds = (p, q) => p.evaluate((q) => _searchAll(q).noteHits.map((a) => a.id), q);
async function same(p, label) {
  const bad = [];
  for (const q of QUERIES) { const [o, n] = [await oldIds(p, q), await newIds(p, q)]; if (JSON.stringify(o) !== JSON.stringify(n)) bad.push(`${q}: old ${o.length} new ${n.length}`); }
  return bad;
}

for (const [w, h] of MEASURE ? [[1440, 900], [390, 844]] : [[390, 844], [820, 1180], [1440, 900]]) {
  const t = `@${w}`;
  const app = await openApp({ viewport: { width: w, height: h }, db: mk(MEASURE ? 5 : NOTES) });
  const p = app.page;
  try {
    await sleep(1500);
    if (MEASURE) {
      /* a big notebook is built inside the page (a 36,000-note db handed over from outside does not fit the page's storage) */
      await p.evaluate((n) => {
        const W = 'alpha beta gamma delta lorem ipsum dolor sit amet zebra quick brown fox river stone cloud'.split(' '), now = new Date().toISOString(); let s = 7; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
        for (let i = 0; i < n; i++) { let c = ''; while (c.length < 2500) c += '<div>' + [0, 1, 2, 3, 4, 5, 6, 7].map(() => W[(rnd() * W.length) | 0]).join(' ') + '</div>'; DB.articles.push({ id: 'm' + i, title: 'Note ' + i + ' ' + W[(rnd() * W.length) | 0], content: c, folderIds: ['f1'], tags: [], createdAt: now, updatedAt: now, kind: 'general' }); }
      }, NOTES);
      const c = await p.context().newCDPSession(p);
      const heap = async () => { await c.send('HeapProfiler.collectGarbage'); return (await c.send('Runtime.getHeapUsage')).usedSize; };
      if (w < 640) await c.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      for (const cap of [0, 24e6, 40e6, 1e9]) {
        await p.evaluate((cap) => { _stC.clear(); _stChars = 0; _ST_CAP = cap; }, cap);
        const h0 = await heap();
        const m = await p.evaluate(async () => {
          const out = {}; let t0 = performance.now(); _searchAll('lorem ipsum'); out.first = Math.round(performance.now() - t0);
          t0 = performance.now(); _searchAll('lorem ipsum d'); out.next = Math.round(performance.now() - t0);
          t0 = performance.now(); _searchAll('lorem ipsum do'); out.next2 = Math.round(performance.now() - t0);
          out.chars = _stChars; out.entries = _stC.size; return out;
        });
        const h1 = await heap();
        console.log(`measure ${t} notes ${NOTES} cap ${cap}: first key ${m.first} ms · next key ${m.next}/${m.next2} ms · cache ${m.entries} entries ${m.chars} chars · heap ${(h0 / 1e6).toFixed(1)} → ${(h1 / 1e6).toFixed(1)} MB (+${((h1 - h0) / 1e6).toFixed(1)})`);
      }
      const ui = await p.evaluate(async () => {
        const T = async (f) => { await new Promise((r) => setTimeout(r, 50)); const t0 = performance.now(); f(); await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); return Math.round(performance.now() - t0); };
        const o = {}; o.folder = await T(() => selFolder('f1')); o.note = await T(() => selArt(DB.articles[40].id)); o.wall = await T(() => selFolder('sf-mywall')); o.smart = await T(() => selFolder('sf-favs'));
        return o;
      });
      console.log(`measure ${t} notes ${NOTES}: open a 36,000-note folder ${ui.folder} ms · open a note ${ui.note} ms · MyWall ${ui.wall} ms · a Smart View ${ui.smart} ms`);
      await app.close(); continue;
    }
    /* 131a */
    const a = await same(p, 'a');
    r.check(a.length === 0, `131a${t} the new search = the old search (same notes, same order) for ${QUERIES.length} queries at ${NOTES} notes`, a.join(' | '));
    /* 131b */
    const bad = [];
    await p.evaluate(() => { _searchAll('alpha'); });                       /* warm the cache */
    await p.evaluate(() => { const a = DB.articles[3]; const c = a.content; a.content = c.replace(/alpha|beta|gamma|delta|lorem|ipsum/, (m) => 'xxxxx'.slice(0, m.length)).replace(/<p>/, '<p>qqqq '); a.content = a.content.slice(0, c.length); _dbRev++; });   /* same length, same updatedAt */
    let x = await same(p); if (x.length) bad.push('same-length edit: ' + x.join(' | '));
    await p.evaluate(() => { const a = DB.articles[5]; a.content = a.content.replace(/<p>/, '<p>ipsum '); _dbRev++; });
    x = await same(p); if (x.length) bad.push('content edit: ' + x.join(' | '));
    await p.evaluate(() => { DB.articles[7].title = 'zebra renamed alpha'; _dbRev++; });
    x = await same(p); if (x.length) bad.push('title edit: ' + x.join(' | '));
    await p.evaluate(() => { const b = DB.articles[9]; b.title = 'dolor undo me'; persist(); b.title = 'dolor undo me 2'; persist(); undo(); });
    x = await same(p); if (x.length) bad.push('undo: ' + x.join(' | '));
    await p.evaluate(() => { redo(); });
    x = await same(p); if (x.length) bad.push('redo: ' + x.join(' | '));
    await p.evaluate(() => {
      const newer = new Date(Date.now() + 60000).toISOString(); const rem = JSON.parse(JSON.stringify(DB));
      rem.articles = [{ ...JSON.parse(JSON.stringify(DB.articles[11])), title: 'FROM REMOTE zebra', content: '<p>merged fox alpha</p>', updatedAt: newer }, { id: 'j-new', title: 'brand new lorem', content: '<p>quick brown</p>', folderIds: [], tags: [], createdAt: newer, updatedAt: newer }];
      for (const k of ['folders', 'sections']) rem[k] = DB[k];
      DB = mergeDB(DB, rem);
    });
    x = await same(p); if (x.length) bad.push('merge: ' + x.join(' | '));
    r.check(bad.length === 0, `131b${t} the same notes after a same-length edit (no updatedAt move), a title edit, undo, redo and a received merge`, bad.join(' || '));
    /* 131c */
    const c = await p.evaluate(async () => {
      _stC.clear(); _stChars = 0; _stPart = null;
      const q = 'lorem ipsum'; ST.search = q; const tok = ++_stTok;
      const run = _searchRunAsync(tok);
      await new Promise((res) => setTimeout(res, 0));
      const idx = DB.articles.length - 2;                                    /* a note the run has not reached yet */
      DB.articles[idx].content = '<p>lorem ipsum arrived late</p>'; DB.articles[idx].title = 'late';
      DB.articles[0].content = '<p>nothing here</p>'; DB.articles[0].title = 'cleared'; _dbRev++;  /* stands in for the _save() a real edit makes */
      await run;
      const w = _searchWords(q);
      const oldI = DB.articles.filter((a) => _matchesAllWords(a.title + ' ' + strip(a.content), w)).map((a) => a.id);
      return { eq: JSON.stringify(oldI) === JSON.stringify(_searchAll(q).noteHits.map((a) => a.id)), part: _stPart, late: oldI.includes(DB.articles[idx].id), zero: !oldI.includes(DB.articles[0].id) };
    });
    r.check(c.eq && c.part === null && c.late && c.zero, `131c${t} a note that changes during a sliced search: the final answer is the old search's answer on the final data`, JSON.stringify(c));
    /* 131d */
    const d = await p.evaluate(() => {
      const keep = [_stC, _stChars];
      const big = { id: 'big-note', title: 'Huge', content: '<p>' + 'needlezz '.repeat(10) + '</p>' };
      _stChars = _ST_CAP - 5;                                              /* nearly full: the next note does not fit */
      const hit = _stOf(big).includes('needlezz'); const kept = _stC.has('big-note');
      const again = _stOf(big).includes('needlezz');
      const under = _stChars <= _ST_CAP;
      _stC.delete('big-note'); _stChars = keep[1];
      return { hit, again, kept, under, cap: _ST_CAP };
    });
    r.check(d.hit && d.again && !d.kept && d.under, `131d${t} over the budget (${d.cap} chars) a note is not cached, is still found, and the total never passes the cap`, JSON.stringify(d));
    /* 131g: typing a query letter by letter (the refinement path), and a new/edited note in between */
    const g = await p.evaluate(() => {
      const bad = [], q = 'lorem ipsum dolor';
      for (let i = 1; i <= q.length; i++) {
        const qq = q.slice(0, i), w = _searchWords(qq);
        const o = DB.articles.filter((a) => _matchesAllWords(a.title + ' ' + strip(a.content), w)).map((a) => a.id).join();
        if (o !== _searchAll(qq).noteHits.map((a) => a.id).join()) bad.push('typed ' + qq);
        if (i === 8) { DB.articles.push({ id: 'g-late', title: 'lorem ipsum dolor late', content: '<p>x</p>', folderIds: [], tags: [], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }); _dbRev++; }
      }
      /* backspacing is not a refinement and must search everything */
      for (const qq of ['lorem ipsum dol', 'lorem', 'lor']) { const w = _searchWords(qq); if (DB.articles.filter((a) => _matchesAllWords(a.title + ' ' + strip(a.content), w)).map((a) => a.id).join() !== _searchAll(qq).noteHits.map((a) => a.id).join()) bad.push('back ' + qq); }
      return bad;
    });
    r.check(g.length === 0, `131g${t} typed letter by letter, a note added in between, then backspaced: every step equals the old search`, g.join(' | '));
    /* 131e */
    const e = await p.evaluate(async () => {
      let paints = 0; const orig = renderTree; window.renderTree = function () { paints++; return orig.apply(this, arguments); };
      try {
        const base = paints; _searchTyped('l'); _searchTyped('lo'); _searchTyped('lor');
        const early = paints - base;                                       /* nothing inside the 150 ms pause */
        await new Promise((res) => setTimeout(res, 140)); const at140 = paints - base;
        await new Promise((res) => setTimeout(res, 1500));
        return { early, at140, final: ST.search, painted: paints - base };
      } finally { window.renderTree = orig; }
    });
    r.check(e.final === 'lor' && e.at140 <= 1 && e.painted >= 1, `131e${t} keys inside the 150 ms pause are one search, for the last key`, JSON.stringify(e));
  } catch (err) { r.check(false, `131${t} threw`, String(err && err.stack || err).slice(0, 500)); }
  r.check(app.errors.length === 0, `131f${t} no page errors`, app.errors.slice(0, 3).join(' | '));
  await app.close();
}
if (!MEASURE) process.exit(r.finish() ? 1 : 0);
