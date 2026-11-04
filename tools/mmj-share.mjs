#!/usr/bin/env node
/* tools/mmj-share.mjs — v05.66, J27 ① R1: the 👁 Visitors switch and the shared Mapping My Journey copy (block 126, checks 126a–126k).

   `node tools/mmj-share.mjs [--only=126a,126c] [--notes=9000] [--mmj=600]`
   Each printed ok/FAIL line is one app-check check. Runs on the fake Firestore of s1-fake.mjs (the mock cloud).

   126a  👁 menu row: present only for MMJ folders and notes (real right-click, 3 sizes), the marks, the card cache
   126b  the switch syncs both ways (and removing it removes the key — never vis:0)
   126c  first run: t~0 + one n~ per MMJ note with the exact fields; non-MMJ and Trash absent
   126d  edits: one note → one doc; out of MMJ → gone; folder rename → t~0 only; a second run writes 0
   126e  a device that has not read yet writes nothing
   126f  offline / hidden write nothing and catch up
   126g  a note over 700 KB goes into parts and reads back equal; a tree over 700 KB too
   126h  DB, the device copy and the recs are byte-identical around a run
   126i  the owner's scale (9000 notes, ~600 MMJ, 1464 folders, phone ×4): first run and one-note edit */
import { playwright, serve, seedDB, hostLimit } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, check, probeInstall, probeRead, NB } from './s1-fake.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const a = argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const onlySet = arg('only') ? new Set(arg('only').split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);
const BIGN = +arg('notes', 9000), MMJN = +arg('mmj', 600);
const T0 = '2026-10-01T00:00:00.000Z';
const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];

const pw = await playwright();
const srv = await serve();
const browser = await pw.chromium.launch({ args: ['--js-flags=--max-old-space-size=8192'] });

/* the notebook: the seed + an MMJ section (a root, a child, the owner's own folder below it, Pages) and notes */
function mmjSeed() {
  const db = seedDB(T0);
  db.sections.push({ id: 'mmj-sec', name: 'Mapping My Journey', order: 1, updatedAt: T0, mmj: { site: 'https://x.invalid' } });
  db.folders.push(
    { id: 'mmj-c-1', name: 'Journeys', parentId: null, order: 1, sectionId: 'mmj-sec', updatedAt: T0, mmj: { n: 'Journeys' } },
    { id: 'mmj-c-2', name: 'Stops', parentId: 'mmj-c-1', order: 1, updatedAt: T0, mmj: { n: 'Stops' } },
    { id: 'own-1', name: 'My own below MMJ', parentId: 'mmj-c-2', order: 1, updatedAt: T0 },
    { id: 'mmj-pages', name: 'Pages', parentId: null, order: 2, sectionId: 'mmj-sec', updatedAt: T0, mmj: { pages: true } });
  const mk = (id, title, folderIds, extra = {}) => ({ id, title, content: '<h1>' + title + '</h1><p>Body of ' + title + ' <img class="ed-img" data-pic="abc123" data-mime="image/png" alt=""></p>', folderIds, tags: ['t-' + id], createdAt: T0, updatedAt: T0, kind: 'general', ...extra });
  db.articles.push(mk('m1', 'MMJ one', ['mmj-c-2']), mk('m2', 'MMJ two', ['own-1']), mk('m3', 'MMJ page', ['mmj-pages']), mk('m4', 'MMJ and mine', ['mmj-c-2', 'f1']));
  db.trash = [{ id: 'tr1', type: 'article', item: mk('mt', 'MMJ trashed', ['mmj-c-2']), at: T0 }];
  return db;
}
const dev = (cloud, name, vp, db, opts) => addDevice(browser, srv.base, cloud, name, { width: vp.w, height: vp.h }, vp.touch, db, opts);
async function ready(d, ms = 40000) { const t = Date.now(); while (Date.now() - t < ms) { if (await on(d, () => !!_s1RdCaught && _s1WriteGate()).catch(() => false)) return true; await sleep(200); } return false; }
/* one run, forced, after any run in flight */
const run = (d) => on(d, async () => { const w = () => new Promise((r) => setTimeout(r, 40)); while (_msS.busy) await w(); await _msTick(true); while (_msS.busy) await w(); return { why: _msS.why, err: _msS.err && (_msS.err.code || String(_msS.err)), written: _msS.written, last: _msS.last }; });
const mmjDocs = (cloud) => { const o = {}; for (const [p, v] of cloud.store) if (p.startsWith(NB + '/mmj/')) o[p.slice(NB.length + 5)] = v; return o; };
const mmjLog = (cloud, from) => cloud.log.slice(from).filter((o) => o.t === 'set' && o.p.startsWith(NB + '/mmj/')).map((o) => o.p.slice(NB.length + 5));
const partLog = (cloud, from) => cloud.log.slice(from).filter((o) => o.t === 'set' && o.p.startsWith(NB + '/mmjparts/')).length;
const edit = (d, id, fn) => on(d, ([id, src]) => { const a = DB.articles.find((x) => x.id === id); new Function('a', src)(a); a.updatedAt = new Date().toISOString(); persist(); }, [id, fn]);
const nbEnc = (id) => 'n~' + encodeURIComponent(id);

try {
  /* ══ 126a — the menu row, the marks, the card cache, at the three sizes ══ */
  if (want('126a')) {
    for (const vp of VPS) {
      const cloud = makeCloud();
      const d = await dev(cloud, 'U' + vp.name, vp, mmjSeed());
      await sleep(600);
      const hasRow = async (sel) => { await d.page.locator(sel).first().click({ button: 'right' }); await sleep(250); const n = await on(d, () => document.querySelectorAll('#ctx .ci-vis').length); const txt = await on(d, () => (document.querySelector('#ctx .ci-vis') || {}).textContent || ''); const hd = await on(d, () => { const r = document.querySelector('#ctx .ci-vis'); let p = r && r.previousElementSibling; while (p && !p.classList.contains('ctx-gh')) p = p.previousElementSibling; return p ? p.textContent : ''; }); return { n, txt, hd }; };
      const close = () => on(d, () => { hideCtx(); });
      /* folder rows: open the section and the folders */
      await on(d, () => { ST.secOpen = ST.secOpen || {}; ST.secOpen['mmj-sec'] = true; ST.secOpen['sec-1'] = true; ST.exp['mmj-c-1'] = true; ST.exp['mmj-c-2'] = true; ST.exp['f1'] = true; renderTree(); });
      if (vp.w < 640) await on(d, () => showPane('sb'));
      const fMmj = await hasRow('#tree .tr-row[data-fid="mmj-c-2"]'); await close();
      const fOwn = await hasRow('#tree .tr-row[data-fid="own-1"]'); await close();
      const fPlain = await hasRow('#tree .tr-row[data-fid="f1"]'); await close();
      check(fMmj.n === 1 && /Visitors may see/.test(fMmj.txt) && fMmj.hd === 'MARK' && fOwn.n === 1 && fPlain.n === 0,
        `126a ${vp.name}: the folder menu has "👁 Visitors may see" under MARK for MMJ folders (also the owner's own below them), and not for a plain folder`, JSON.stringify({ fMmj, fOwn, fPlain }));
      /* switch it on from the menu */
      await d.page.locator('#tree .tr-row[data-fid="mmj-c-2"]').first().click({ button: 'right' }); await sleep(200);
      await d.page.locator('#ctx .ci-vis').first().click(); await sleep(300);
      const st1 = await on(d, () => ({ vis: DB.folders.find((f) => f.id === 'mmj-c-2').vis, kid: DB.articles.find((a) => a.id === 'm1').vis, mark: !!document.querySelector('#tree .tr-row[data-fid="mmj-c-2"] .tr-vis'), other: !!document.querySelector('#tree .tr-row[data-fid="mmj-c-1"] .tr-vis'), title: (document.querySelector('.ci-vis') || {}).title }));
      check(st1.vis === 1 && st1.mark && !st1.other && st1.kid === undefined, `126a ${vp.name}: the folder gets vis:1 and a 👁 after its name; the notes inside are not switched`, JSON.stringify(st1));
      const rowCss = await on(d, () => { const r = document.querySelector('#tree .tr-row'); return getComputedStyle(r).contentVisibility; });
      check(rowCss === 'auto', `126a ${vp.name}: a side-pane row still has content-visibility:auto (the 👁 draws inside it)`, rowCss);
      await d.page.locator('#tree .tr-row[data-fid="mmj-c-2"]').first().click({ button: 'right' }); await sleep(200);
      const txt2 = await on(d, () => (document.querySelector('#ctx .ci-vis') || {}).textContent || '');
      const tip = await on(d, () => (document.querySelector('#ctx .ci-vis') || {}).title || '');
      check(/Private/.test(txt2) && /does not switch the notes inside/.test(tip), `126a ${vp.name}: once on, the row says "🔒 Private (visitors can't see)", and its title says a folder does not switch its notes`, txt2 + ' | ' + tip);
      await close();
      /* notes: open the folder, right-click the card */
      await on(d, () => { selFolder('mmj-c-2'); });
      await sleep(400);
      const nMmj = await (async () => { await d.page.locator('#p2c .ar[data-aid="m1"]').first().click({ button: 'right' }); await sleep(250); const r = await on(d, () => ({ n: document.querySelectorAll('#ctx .ci-vis').length, hd: (() => { const r = document.querySelector('#ctx .ci-vis'); let p = r && r.previousElementSibling; while (p && !p.classList.contains('ctx-gh')) p = p.previousElementSibling; return p ? p.textContent : ''; })() })); return r; })();
      await close();
      await on(d, () => { selFolder('f1'); }); await sleep(300);
      const nPlain = await (async () => { await d.page.locator('#p2c .ar[data-aid="a1"]').first().click({ button: 'right' }); await sleep(250); return await on(d, () => document.querySelectorAll('#ctx .ci-vis').length); })();
      await close();
      check(nMmj.n === 1 && nMmj.hd === 'MARK' && nPlain === 0, `126a ${vp.name}: the note menu has the row under MARK for an MMJ note and not for a plain note`, JSON.stringify({ nMmj, nPlain }));
      await on(d, () => { selFolder('mmj-c-2'); }); await sleep(300);
      const cardBefore = await on(d, () => !!document.querySelector('#p2c .ar[data-aid="m1"] .ac-vis'));
      await d.page.locator('#p2c .ar[data-aid="m1"]').first().click({ button: 'right' }); await sleep(200);
      await d.page.locator('#ctx .ci-vis').first().click(); await sleep(400);
      const cardAfter = await on(d, () => ({ vis: DB.articles.find((a) => a.id === 'm1').vis, mark: !!document.querySelector('#p2c .ar[data-aid="m1"] .ac-vis') }));
      await on(d, () => selArt('m1')); await sleep(300);
      const hdr = await on(d, () => !!document.querySelector('#p3 .av-vis'));
      check(!cardBefore && cardAfter.vis === 1 && cardAfter.mark && hdr, `126a ${vp.name}: the note gets vis:1, the card shows 👁 at once (the card cache refreshed) and the note header says so`, JSON.stringify({ cardBefore, cardAfter, hdr }));
      await on(d, () => mmjToggleVis('note', 'm1')); await sleep(200);
      const off = await on(d, () => { const a = DB.articles.find((x) => x.id === 'm1'); return { has: 'vis' in a, mark: !!document.querySelector('#p2c .ar[data-aid="m1"] .ac-vis') }; });
      check(!off.has && !off.mark, `126a ${vp.name}: switching it off removes the key (never vis:0) and the mark`, JSON.stringify(off));
      check(d.errors.length === 0, `126a ${vp.name}: no page errors`, d.errors.slice(0, 2).join(' · '));
      await d.ctx.close();
    }
  }

  /* ══ 126b — synced both ways ══ */
  if (want('126b')) {
    const cloud = makeCloud();
    const A = await dev(cloud, 'A', VPS[2], mmjSeed());
    const B = await dev(cloud, 'B', VPS[0], mmjSeed());
    await ready(A); await ready(B);
    const push = (d) => on(d, () => { flushPendingPush(); }).then(() => sleep(300));
    const waitFor = async (d, fn, arg, ms = 25000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await on(d, fn, arg).catch(() => false)) return true; await sleep(250); } return false; };
    await on(A, () => { mmjToggleVis('folder', 'mmj-c-2'); mmjToggleVis('note', 'm3'); }); await push(A);
    const got = await waitFor(B, () => DB.folders.find((f) => f.id === 'mmj-c-2').vis === 1 && DB.articles.find((a) => a.id === 'm3').vis === 1);
    check(got, '126b A switches a folder and a note on; B receives vis:1 on both');
    await on(B, () => { mmjToggleVis('folder', 'mmj-c-2'); mmjToggleVis('note', 'm3'); }); await push(B);
    const back = await waitFor(A, () => !('vis' in DB.folders.find((f) => f.id === 'mmj-c-2')) && !('vis' in DB.articles.find((a) => a.id === 'm3')));
    check(back, '126b B switches them off; A receives it: the key is gone on A (no vis:0)');
    const zero = await on(A, () => JSON.stringify(DB).includes('"vis":0') || JSON.stringify(DB).includes('"vis":false'));
    check(!zero, '126b no vis:0 / vis:false anywhere in the notebook');
    check(A.errors.length === 0 && B.errors.length === 0, '126b no page errors', [...A.errors, ...B.errors].slice(0, 2).join(' · '));
    await A.ctx.close(); await B.ctx.close();
  }

  /* ══ 126c–126f, 126h — the shared copy on one device ══ */
  if (['126c', '126d', '126e', '126f', '126h'].some(want)) {
    /* 126e first: a device that has not read yet */
    if (want('126e')) {
      const cloud = makeCloud();
      const S = await dev(cloud, 'S', VPS[2], mmjSeed(), { holdQ: true });
      await sleep(1500);
      const caught = await on(S, () => !!_s1RdCaught);
      const from = cloud.log.length;
      const r1 = await run(S);
      const w1 = mmjLog(cloud, from);
      check(!caught && w1.length === 0 && r1.why === 'wait', '126e a device that has not read yet writes nothing to the shared copy (why = wait)', JSON.stringify({ caught, w1, r1 }));
      S.holdQ = false; for (const id of S.qsubs.keys()) cloud.deliverQ(S, id, true);
      const ok = await ready(S);
      const r2 = await run(S);
      const w2 = mmjLog(cloud, from);
      check(ok && w2.includes('t~0') && w2.includes(nbEnc('m1')), '126e once it has read, the same device writes the whole set', JSON.stringify({ ok, n: w2.length, r2 }));
      await S.ctx.close();
    }

    const cloud = makeCloud();
    const D = await dev(cloud, 'D', VPS[2], mmjSeed());
    await ready(D);
    await on(D, () => { selFolder('mmj-c-2'); });
    const rec0 = cloud.log.filter((o) => o.p.includes('/recs/')).length;
    const idb0 = await on(D, async () => JSON.stringify((await _idbRead('notebook')).v || null));
    const db0 = await on(D, () => JSON.stringify(DB));
    const from = cloud.log.length;
    const r1 = await run(D);
    const docs = mmjDocs(cloud);
    if (want('126c')) {
      const keys = Object.keys(docs).sort();
      const t = docs['t~0'] || {};
      const fl = (t.folders || []).map((f) => f.id).sort();
      const tOk = t.v === 1 && !!t.at && typeof t.b === 'string' && t.sec && t.sec.id === 'mmj-sec' && t.sec.n === 'Mapping My Journey' && JSON.stringify(fl) === JSON.stringify(['mmj-c-1', 'mmj-c-2', 'mmj-pages', 'own-1'])
        && (t.folders || []).every((f) => ['id', 'n', 'p', 'o', 'u'].every((k) => k in f) && !('vis' in f));
      const f2 = (t.folders || []).find((f) => f.id === 'mmj-c-2') || {};
      check(tOk && f2.n === 'Stops' && f2.p === 'mmj-c-1' && f2.o === 1 && f2.u === T0, '126c t~0 holds {v,at,b,sec,folders[{id,n,p,o,u}]} for exactly the MMJ folders (Pages and the owner\'s own included, plain folders not)', JSON.stringify(t).slice(0, 400));
      check(JSON.stringify(keys) === JSON.stringify(['n~m1', 'n~m2', 'n~m3', 'n~m4', 't~0']), '126c one n~ doc per live MMJ note; non-MMJ notes and the Trash note are absent', keys.join(','));
      const n1 = docs['n~m1'] || {}, n4 = docs['n~m4'] || {};
      const exact = JSON.stringify(Object.keys(n1).sort()) === JSON.stringify(['at', 'b', 'content', 'createdAt', 'folderIds', 'id', 'kind', 'tags', 'title', 'updatedAt'].sort());
      const live = await on(D, () => DB.articles.find((a) => a.id === 'm1').content);
      check(exact && n1.content === live && n1.title === 'MMJ one' && n1.updatedAt === T0 && JSON.stringify(n1.folderIds) === '["mmj-c-2"]' && JSON.stringify(n1.tags) === '["t-m1"]' && n1.content.includes('data-pic="abc123"') && !!n1.at && typeof n1.b === 'string',
        '126c a note doc has exactly {id,title,content,tags,folderIds,kind,createdAt,updatedAt,at,b}; content is a.content byte for byte and keeps the data-pic reference', Object.keys(n1).join(','));
      check(JSON.stringify(n4.folderIds) === '["mmj-c-2"]', '126c a note in an MMJ folder and a plain one lists only the MMJ folder in folderIds', JSON.stringify(n4.folderIds));
      check(r1.err == null && !r1.why, '126c the run reports no error', JSON.stringify(r1));
      const diag = await on(D, () => _syncDiagnosticsHTML());
      check(/Shared MMJ copy/.test(diag) && /docs written/.test(diag), '126c the Cloud Sync diagnostics have a "Shared MMJ copy" line with the last run and the count', (diag.match(/Shared MMJ copy[^]*?<\/tr>/) || [''])[0].replace(/<[^>]+>/g, ' ').slice(0, 200));
    }
    if (want('126h')) {
      const db1 = await on(D, () => JSON.stringify(DB));
      const idb1 = await on(D, async () => JSON.stringify((await _idbRead('notebook')).v || null));
      const rec1 = cloud.log.filter((o) => o.p.includes('/recs/')).length;
      const nonMmj = cloud.log.slice(from).filter((o) => !o.p.startsWith(NB + '/mmj/'));
      check(db0 === db1 && idb0 === idb1 && rec1 === rec0 && nonMmj.length === 0, '126h a run changes nothing in Siyagah: DB and the device copy are byte-identical, no rec was written, nothing outside notebooks/{nb}/mmj was touched', JSON.stringify({ dbSame: db0 === db1, idbSame: idb0 === idb1, recs: [rec0, rec1], other: nonMmj.map((o) => o.p).slice(0, 3) }));
    }
    if (want('126d')) {
      const m0 = cloud.log.length;
      const r0 = await run(D);
      check(mmjLog(cloud, m0).length === 0, '126d a second run with no change writes 0 docs', JSON.stringify({ r0, w: mmjLog(cloud, m0) }));
      const m1 = cloud.log.length;
      await edit(D, 'm1', 'a.content+="<p>edited</p>"');
      await run(D);
      const w1 = mmjLog(cloud, m1);
      const c1 = (mmjDocs(cloud)['n~m1'] || {}).content || '';
      check(JSON.stringify(w1) === '["n~m1"]' && c1.endsWith('<p>edited</p>'), '126d editing one MMJ note rewrites only that note\'s doc', JSON.stringify(w1));
      const m2 = cloud.log.length;
      await edit(D, 'm3', 'a.vis=1');
      await run(D);
      const w2 = mmjLog(cloud, m2);
      check(JSON.stringify(w2) === '["n~m3"]' && mmjDocs(cloud)['n~m3'].vis === 1, '126d switching a note 👁 on rewrites that doc with vis:1', JSON.stringify(w2));
      const m3 = cloud.log.length;
      await edit(D, 'm2', 'a.folderIds=["f2"]');
      await run(D);
      const w3 = mmjLog(cloud, m3), g = mmjDocs(cloud)['n~m2'] || {};
      check(JSON.stringify(w3) === '["n~m2"]' && g.gone === true && !!g.at && g.id === 'm2' && !('content' in g), '126d moving a note out of MMJ writes it once as {id, gone:true, at} (the doc is not deleted)', JSON.stringify(g));
      const m4 = cloud.log.length;
      await run(D);
      check(mmjLog(cloud, m4).length === 0, '126d a gone note is not written again', JSON.stringify(mmjLog(cloud, m4)));
      const m5 = cloud.log.length;
      await on(D, () => { const a = DB.articles.find((x) => x.id === 'm4'); a.updatedAt = new Date().toISOString(); DB.articles.splice(DB.articles.indexOf(a), 1); persist(); });
      await run(D);
      const w5 = mmjLog(cloud, m5);
      check(JSON.stringify(w5) === '["n~m4"]' && mmjDocs(cloud)['n~m4'].gone === true, '126d a deleted note is written once as gone', JSON.stringify(w5));
      const m6 = cloud.log.length;
      await on(D, () => { const f = DB.folders.find((x) => x.id === 'mmj-c-2'); f.name = 'Stops renamed'; f.updatedAt = new Date().toISOString(); persist(); });
      await run(D);
      const w6 = mmjLog(cloud, m6);
      check(JSON.stringify(w6) === '["t~0"]' && mmjDocs(cloud)['t~0'].folders.find((f) => f.id === 'mmj-c-2').n === 'Stops renamed', '126d renaming an MMJ folder rewrites t~0 only', JSON.stringify(w6));
      const m7 = cloud.log.length;
      await on(D, () => { const f = DB.folders.find((x) => x.id === 'mmj-c-2'); f.parentId = 'mmj-pages'; f.updatedAt = new Date().toISOString(); persist(); });
      await run(D);
      const w7 = mmjLog(cloud, m7);
      check(JSON.stringify(w7) === '["t~0"]' && mmjDocs(cloud)['t~0'].folders.find((f) => f.id === 'mmj-c-2').p === 'mmj-pages', '126d moving an MMJ folder under another rewrites t~0 (p changes)', JSON.stringify(w7));
      const m8 = cloud.log.length;
      await on(D, () => { const f = DB.folders.find((x) => x.id === 'f1'); f.name = 'plain renamed'; f.updatedAt = new Date().toISOString(); persist(); });
      await run(D);
      check(mmjLog(cloud, m8).length === 0, '126d a change outside MMJ writes nothing to the shared copy', JSON.stringify(mmjLog(cloud, m8)));
      const m9 = cloud.log.length;
      await on(D, () => { const f = DB.folders.find((x) => x.id === 'mmj-c-1'); f.vis = 1; f.updatedAt = new Date().toISOString(); persist(); });
      await run(D);
      check(JSON.stringify(mmjLog(cloud, m9)) === '["t~0"]' && mmjDocs(cloud)['t~0'].folders.find((f) => f.id === 'mmj-c-1').vis === 1, '126d a folder 👁 on appears in t~0 as vis:1', JSON.stringify(mmjLog(cloud, m9)));
      const sigs = await on(D, async () => { const v = await _msKv('get', 'sig|nb-s1'); return v && Object.keys(v.n).length; });
      check(sigs >= 4, '126d the per-device signature map lives in its own database siyagah-mmjshare-v1 (key sig|<nb>)', 'entries=' + sigs);
    }
    if (want('126f')) {
      const m0 = cloud.log.length;
      await edit(D, 'm3', 'a.content+="<p>offline edit</p>"');
      await D.ctx.setOffline(true); D.offline = true;
      await sleep(300);
      const r1 = await run(D);
      const w1 = mmjLog(cloud, m0);
      D.offline = false; await D.ctx.setOffline(false);
      check(w1.length === 0 && r1.why === 'offline', '126f offline: nothing is written to the shared copy', JSON.stringify({ r1, w1 }));
      await sleep(300);
      await run(D);
      check(JSON.stringify(mmjLog(cloud, m0)) === '["n~m3"]', '126f back online: it catches up with the one change', JSON.stringify(mmjLog(cloud, m0)));
      const m1 = cloud.log.length;
      await edit(D, 'm3', 'a.content+="<p>hidden edit</p>"');
      await on(D, () => { Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true }); });
      const r2 = await run(D);
      const w2 = mmjLog(cloud, m1);
      await on(D, () => { delete document.visibilityState; });
      check(w2.length === 0 && r2.why === 'hidden', '126f hidden: nothing is written', JSON.stringify({ r2, w2 }));
      await run(D);
      check(JSON.stringify(mmjLog(cloud, m1)) === '["n~m3"]', '126f visible again: it catches up', JSON.stringify(mmjLog(cloud, m1)));
      const m2 = cloud.log.length;
      await edit(D, 'm3', 'a.content+="<p>refused</p>"');
      cloud.refuse.push('/mmj/');
      const r3 = await run(D);
      const ref = await on(D, () => ({ refused: _msS.refused, txt: _msStateText() }));
      cloud.refuse.length = 0;
      check(r3.err === 'permission-denied' && ref.refused >= 1 && /refused/.test(ref.txt) && D.errors.length === 0, '126f a refusal (permission-denied) is shown only in the diagnostics: no toast, no page error, the push is untouched', JSON.stringify({ r3, ref, errs: D.errors.slice(0, 2) }));
      await on(D, () => { _msS.retryAt = 0; }); await run(D);
      check(JSON.stringify(mmjLog(cloud, m2)) === '["n~m3"]', '126f after the refusal is lifted the change is written', JSON.stringify(mmjLog(cloud, m2)));
    }
    await D.ctx.close();
  }

  /* ══ 126g — big note and big tree in parts ══ */
  if (want('126g')) {
    const cloud = makeCloud();
    const db = mmjSeed();
    let big = '<p>' + 'Gaza €™ café 0123456789 '.repeat(1).repeat(1);
    let s = ''; for (let i = 0; s.length < 1500000; i++) s += 'Line ' + i + ' tafsīr ' + (i * 2654435761 % 1000003) + ' ✦ ';
    big = '<p>' + s + '</p>';
    db.articles.push({ id: 'mbig', title: 'Big one', content: big, folderIds: ['mmj-c-2'], tags: [], createdAt: T0, updatedAt: T0, kind: 'general' });
    for (let i = 0; i < 7000; i++) db.folders.push({ id: 'mmj-bf' + i, name: 'Folder ' + i + ' ' + 'x'.repeat(100), parentId: 'mmj-c-1', order: i, updatedAt: T0, mmj: { n: 'x' } });
    const D = await dev(cloud, 'G', VPS[2], db);
    await ready(D);
    const from = cloud.log.length;
    const r = await run(D);
    const docs = mmjDocs(cloud);
    const nd = docs[nbEnc('mbig')] || {};
    const parts = []; for (let i = 0; i < (nd.parts || 0); i++) { const v = cloud.store.get(`${NB}/mmjparts/${nbEnc('mbig')}~${nd.g}~${i}`); parts.push(v ? v.d : null); }
    check(nd.parts >= 5 && !!nd.g && nd.content === '' && parts.every((p) => p != null) && parts.join('') === big, '126g a note over 700 KB: the doc names its parts (parts, g), the pieces rejoin to a.content exactly', JSON.stringify({ parts: nd.parts, len: big.length, joined: parts.join('').length, r }));
    const order = cloud.log.slice(from).filter((o) => o.t === 'set').map((o) => o.p);
    const iDoc = order.indexOf(`${NB}/mmj/${nbEnc('mbig')}`), iLastPart = Math.max(...order.map((p, i) => p.startsWith(NB + '/mmjparts/') ? i : -1));
    check(iDoc > iLastPart && iLastPart >= 0, '126g the pieces are written BEFORE the doc that names them', `doc@${iDoc} lastPart@${iLastPart}`);
    const t0 = docs['t~0'] || {};
    const tparts = []; for (let i = 1; i <= (t0.n || 0); i++) { const v = docs['t~' + i]; tparts.push(v); }
    const all = tparts.flatMap((p) => (p && p.g === t0.g ? p.folders : [])), live = await on(D, () => _msTree(_mmjSet()).folders);
    check(t0.n >= 2 && !('folders' in t0) && all.length === live.length && JSON.stringify(all) === JSON.stringify(live), '126g a tree over 700 KB: t~0 holds {n: parts, g}, t~1… hold the folders, and they rejoin to the whole tree', JSON.stringify({ n: t0.n, got: all.length, want: live.length }));
    /* a rewrite of the big note makes a new generation and removes the old pieces */
    const old = parts.length;
    await edit(D, 'mbig', 'a.content+="<p>tail</p>"'); await run(D); await sleep(300);
    const left = [...cloud.store.keys()].filter((k) => k.startsWith(NB + '/mmjparts/')).length;
    check(left === (cloud.store.get(`${NB}/mmj/${nbEnc('mbig')}`).parts), '126g after a rewrite the old generation\'s pieces are cleaned up (only the current ones remain)', JSON.stringify({ old, left }));
    await D.ctx.close();
  }

  /* ══ 126i — the owner's scale ══ */
  if (want('126i')) {
    const cloud = makeCloud();
    const db = seedDB(T0);
    db.sections.push({ id: 'mmj-sec', name: 'Mapping My Journey', order: 1, updatedAt: T0 });
    for (let i = 0; i < 1464; i++) db.folders.push({ id: 'mmj-f' + i, name: 'Place ' + i, parentId: i < 40 ? null : 'mmj-f' + (i % 40), order: i, sectionId: i < 40 ? 'mmj-sec' : undefined, updatedAt: T0, mmj: { n: 'x' } });
    for (let i = 0; i < 300; i++) db.folders.push({ id: 'own' + i, name: 'Mine ' + i, parentId: 'mmj-f' + (i % 40), order: i, updatedAt: T0 });
    for (let i = 0; i < BIGN; i++) db.articles.push({ id: 'bn' + i, title: 'Bulk note ' + i, content: '<p>Body ' + i + ' lorem ipsum dolor sit amet</p>', folderIds: [i % 2 ? 'f1' : 'f2'], tags: [], createdAt: T0, updatedAt: T0, kind: 'general' });
    for (let i = 0; i < MMJN; i++) db.articles.push({ id: 'mm' + i, title: 'MMJ post ' + i, content: '<h1>Post ' + i + '</h1>' + ('<p>Mapping my journey paragraph lorem ipsum dolor sit amet consectetur. </p>').repeat(30 + (i % 10)) , folderIds: ['mmj-f' + (40 + (i % 1400))], tags: ['mmj'], createdAt: T0, updatedAt: T0, kind: 'general' });
    const D = await dev(cloud, 'P', VPS[0], db, { throttle: 4 });
    const ok = await ready(D, 120000);
    await on(D, probeInstall);
    const from = cloud.log.length;
    const t0 = Date.now();
    const r = await run(D);
    const dt = Date.now() - t0;
    const lts = await on(D, probeRead, 0);
    const docs = Object.keys(mmjDocs(cloud));
    const HL = hostLimit(200);
    const worst = Math.max(0, ...lts.map((x) => x.app));
    check(ok && docs.length === MMJN + 1 && r.err == null, `126i first run at the owner's scale (${BIGN} notes, ${MMJN} MMJ, 1,764 folders, phone ×4): ${docs.length} docs written in ${(dt / 1000).toFixed(1)} s`, JSON.stringify({ ok, docs: docs.length, r, commits: mmjLog(cloud, from).length }));
    check(worst <= HL.ms, `126i the first run has no long task over ${HL.text} (worst ${worst} ms, ${lts.length} long tasks)`, JSON.stringify(lts.slice(0, 6)));
    const t = JSON.stringify((mmjDocs(cloud)['t~0'] || {}).folders || []).length;
    console.log('P126i tree ' + t + ' bytes for ' + ((mmjDocs(cloud)['t~0'] || {}).folders || []).length + ' folders');
    const mark = await on(D, () => performance.now());
    const m1 = cloud.log.length;
    await edit(D, 'mm7', 'a.content+="<p>one more</p>"');
    const t1 = Date.now(); await run(D); const dt1 = Date.now() - t1;
    const lts1 = await on(D, probeRead, mark);
    const w1 = mmjLog(cloud, m1);
    const worst1 = Math.max(0, ...lts1.map((x) => x.app));
    check(JSON.stringify(w1) === '["n~mm7"]' && worst1 <= HL.ms, `126i a one-note edit writes 1 doc in ${dt1} ms with no long task over ${HL.text} (worst ${worst1} ms)`, JSON.stringify({ w1, lts1: lts1.slice(0, 4) }));
    const m2 = cloud.log.length;
    const t2 = Date.now(); await run(D); const dt2 = Date.now() - t2;
    check(mmjLog(cloud, m2).length === 0, `126i a run with no change writes 0 docs (${dt2} ms to find that out)`, '');
    await D.ctx.close();
  }
} catch (e) {
  check(false, '126 the check ran without throwing', String(e && e.stack || e).slice(0, 600));
}
await browser.close(); await srv.close();
const bad = (await import('./s1-fake.mjs')).results.filter((x) => !x.ok).length;
const n = (await import('./s1-fake.mjs')).results.length;
console.log(`\n${n - bad}/${n} passed`);
process.exit(bad ? 1 : 0);
