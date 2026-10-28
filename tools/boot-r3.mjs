#!/usr/bin/env node
/* tools/boot-r3.mjs — v05.56, J08 round 3: a faster start. The owner (27 Oct): "How can make loading and navigating faster? We still have to
   import other notebook". At 27,000 notes the device copy is one ~120 MB read (15–21 s on a phone ×4, nothing on screen), so the last screen
   is kept as a picture (`siyagah-boot-v1`) and painted before the read; the start opens where this device left off. Checks 116a–116h at
   390 (touch) / 820 (touch) / 1440 (mouse):
   116a after the page is hidden, the next start paints the picture BEFORE booted: the side pane (and at 820/1440 the note list and the open
        note), the three panes inert, a click on a card reaches nothing, "Opening your notebook…" shown;
   116b the picture holds nothing live: no id (renamed data-bvid), no on* handler, no contenteditable, no iframe/script, no blob: src;
   116c booted: the picture is gone (no html.bv, no data-bvid, no pill, nothing inert) and the panes are BYTE FOR BYTE what a start without a
        picture draws at the same place (the oracle: the same record with another version, so the place is kept and the picture is not);
   116d the place: the folder and the note open before are open again; a folder deleted since is not (loadDB's choice stands);
   116e no picture for another screen tier, in Zab mode (/?jeb=1, which also keeps none), or before the notebook is in (_bvCapture refuses);
   116f the picture is kept only on the device: not in DB, localStorage or the notebook record;
   116g the picture-migration scans give the same answer as before and pause (a timer runs during them) on a 4,000-note notebook;
   116h no page errors.
   `node tools/boot-r3.mjs` */
import { openApp, report } from './harness.mjs';

const r = report('J08 R3 — the last screen at start');
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
/* recorded at document start: the moment html.bv appears, what is on screen */
const WATCH = () => {
  window.__bvSeen = null;
  new MutationObserver(() => {
    if (window.__bvSeen || !document.documentElement.classList.contains('bv')) return;
    const q = (s) => document.querySelectorAll(s).length, panes = ['#sb', '#p2', '#p3'].map((s) => document.querySelector(s));
    const inPanes = (s) => ['#tree', '#p2c', '#p3c', '#p3h', '#p2h'].reduce((n, p) => n + document.querySelectorAll(s.split(',').map((x) => p + ' ' + x.trim()).join(',')).length, 0);
    let on = 0; ['#tree', '#p2c', '#p3c', '#p3h', '#p2h'].forEach((p) => document.querySelectorAll(p + ' *').forEach((e) => { for (const a of e.attributes) if (/^on/.test(a.name) || a.name === 'contenteditable') on++; }));
    const card = document.querySelector('#p2c .ar'); let hit = null;
    if (card) { const b = card.getBoundingClientRect(); if (b.width) { const el = document.elementFromPoint(b.left + 20, b.top + 8); hit = el ? !!el.closest('#p2') : false; } }
    window.__bvSeen = { booted: window.__appBooted === true, loaded: typeof _dbLoaded !== 'undefined' && _dbLoaded, sec: q('#tree .sec'), cards: q('#p2c .ar'), p3: (document.getElementById('p3c') || {}).textContent ? document.getElementById('p3c').textContent.length : 0,
      inert: panes.map((e) => !!(e && e.inert)), pill: !!document.getElementById('bv-pill'), bvid: q('[data-bvid]'), ids: inPanes('[id]'), on, live: inPanes('iframe, script, [src^="blob:"]'), hit };
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] });
};
const SEED = () => {
  const sec = DB.sections[0].id, iso = new Date(Date.now() - 864e5).toISOString();
  DB.folders.push({ id: 'r3-a', name: 'R3 folder A', parentId: null, order: 50, sectionId: sec, updatedAt: iso }, { id: 'r3-b', name: 'R3 folder B', parentId: 'r3-a', order: 1, updatedAt: iso });
  for (let i = 0; i < 40; i++) DB.articles.push({ id: 'r3-n' + i, title: 'R3 note ' + i, content: '<p>Text of note ' + i + '</p>' + (i === 3 ? '<p><img src="nope.png" onerror="window.__bvErr=(window.__bvErr||0)+1"><iframe src="about:blank"></iframe><img class="ed-img" src="blob:http://x/1"><span contenteditable="false" id="r3-inner">w</span></p>' : ''), folderIds: [i < 30 ? 'r3-b' : 'r3-a'], tags: [], createdAt: iso, updatedAt: iso });
  persist();
};
const place = (page) => page.evaluate(() => ({ folder: ST.folder, article: ST.article, exp: !!(ST.exp && ST.exp['r3-a']) }));
const panes = (page) => page.evaluate(() => Object.fromEntries(['tree', 'p2h', 'p2c', 'p3c'].map((id) => [id, document.getElementById(id).innerHTML])));
const hide = (page) => page.evaluate(async () => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); delete document.visibilityState; await new Promise((res) => setTimeout(res, 600)); });
const rec = (page) => page.evaluate(async () => { const db = await _bvDb(); return await new Promise((res) => { const q = db.transaction('kv').objectStore('kv').get('last'); q.onsuccess = () => res(q.result || null); }); });
const setRec = (page, f) => page.evaluate(async (fs) => { const fn = (0, eval)(fs); const db = await _bvDb(); const q = db.transaction('kv').objectStore('kv').get('last'); const v = await new Promise((res) => { q.onsuccess = () => res(q.result); }); fn(v); await new Promise((res) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, 'last'); t.oncomplete = res; }); }, f.toString());
const reboot = async (page) => { await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.__appBooted === true, null, { timeout: 60000 }); await sleep(400); };

for (const [w, h, touch] of [[390, 844, true], [820, 1180, true], [1440, 900, false]]) {
  const t = `@${w}`;
  const app = await openApp({ viewport: { width: w, height: h }, hasTouch: touch, initScript: WATCH });
  const page = app.page;
  try {
    await page.evaluate(SEED); await sleep(300);
    /* the owner's way there: open folder A, then B inside it, then a note (on a phone the list then the note) */
    await page.evaluate(() => { selFolder('r3-a'); selFolder('r3-b'); selArt('r3-n3'); if (window.innerWidth < 1200) showPane('p2'); });
    await sleep(500);
    const before = await place(page);
    await hide(page);
    const kept = await rec(page);
    await reboot(page);
    const s = await page.evaluate(() => window.__bvSeen);
    const wide = w >= 640;
    r.check(!!s && !s.booted && !s.loaded && s.sec > 0 && (!wide || (s.cards >= 30 && s.p3 > 10)), `116a${t} the picture is on screen before the notebook is read: side pane${wide ? ', the list and the open note' : ''}`, JSON.stringify(s));
    r.check(!!s && s.inert.every(Boolean) && s.pill && s.hit !== true, `116a${t} while it shows the three panes are inert, a tap on a card reaches nothing, "Opening your notebook…" is shown`, JSON.stringify(s && { inert: s.inert, pill: s.pill, hit: s.hit }));
    r.check(!!s && s.bvid > 0 && s.ids === 0 && s.on === 0 && s.live === 0, `116b${t} the picture holds nothing live (ids renamed: ${s && s.bvid}; ids ${s && s.ids}, handlers ${s && s.on}, iframe/script/blob ${s && s.live})`, JSON.stringify(s));
    const after = await page.evaluate(() => ({ bv: document.documentElement.classList.contains('bv'), bvid: document.querySelectorAll('[data-bvid]').length, pill: !!document.getElementById('bv-pill'), inert: ['sb', 'p2', 'p3'].some((i) => document.getElementById(i).inert) }));
    r.check(!after.bv && !after.bvid && !after.pill && !after.inert, `116c${t} booted: the picture is gone (no class, no renamed element, no pill, nothing inert)`, JSON.stringify(after));
    const got = await place(page);
    r.check(got.folder === before.folder && got.article === before.article && got.exp, `116d${t} the start opens where this device left off: folder ${got.folder}, note ${got.article}, folder A unfolded`, JSON.stringify({ before, got }));
    /* 116c oracle: the same record, another version -> place kept, no picture; the panes must be identical */
    const withPic = await panes(page);
    await setRec(page, (v) => { v.v = '00.00'; });
    await page.evaluate(() => { window.__bvSeen = null; });
    await reboot(page);
    const noPic = await panes(page), s2 = await page.evaluate(() => window.__bvSeen);
    const diff = Object.keys(withPic).filter((k) => withPic[k] !== noPic[k]);
    r.check(!s2 && diff.length === 0, `116c${t} the panes after the picture are byte for byte those of a start without it (another version: no picture, ${diff.length} pane(s) differ)`, diff.map((k) => k + ' ' + withPic[k].length + '/' + noPic[k].length).join(' ') + (s2 ? ' picture shown for another version' : ''));
    /* 116d a folder gone since: loadDB's choice */
    await hide(page);
    await setRec(page, (v) => { v.st.folder = 'r3-gone'; });
    const def = await page.evaluate(() => DB.folders.filter((f) => !f.parentId).sort((a, b) => a.order - b.order)[0].id);
    await reboot(page);
    const g2 = await place(page);
    r.check(g2.folder === def, `116d${t} a folder that no longer exists is not opened (loadDB's first folder ${def} stands)`, JSON.stringify(g2));
    /* 116e another tier */
    await hide(page);
    await setRec(page, (v) => { v.tier = (v.tier + 1) % 3; });
    await page.evaluate(() => { window.__bvSeen = null; });
    await reboot(page);
    r.check(!(await page.evaluate(() => window.__bvSeen)), `116e${t} no picture kept at another screen size`);
    /* 116f only on the device */
    await hide(page);
    const where = await page.evaluate(async () => {
      const inDB = /bvid|siyagah-boot/.test(JSON.stringify(DB)); let inLS = false; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/data-bvid/.test(localStorage.getItem(k) || '')) inLS = true; }
      const nb = await _idbGet(IDB_KEY); return { inDB, inLS, inNb: /data-bvid/.test(JSON.stringify(nb || {})) };
    });
    r.check(!where.inDB && !where.inLS && !where.inNb && !!kept && !!kept.el, `116f${t} the picture is only in the device's own store (not DB, localStorage or the notebook record)`, JSON.stringify(where));
    const errs = app.errors.filter((e) => !/404|nope\.png|blob:http:\/\/x/.test(e));
    r.check(errs.length === 0, `116h${t} no page errors`, errs.join(' | ').slice(0, 400));
  } catch (e) { r.check(false, `116${t} threw: ${String(e && e.message || e).split('\n')[0]}`); }
  finally { await app.close(); }
}

/* 116e Zab mode, and a capture before the notebook is in */
{
  const app = await openApp({ viewport: { width: 1440, height: 900 }, path: '/?jeb=1', initScript: WATCH });
  try {
    await app.page.evaluate(async () => { _bvCapture(); await new Promise((r) => setTimeout(r, 500)); });
    const v = await app.page.evaluate(async () => { const db = await _bvDb(); return await new Promise((res) => { const q = db.transaction('kv').objectStore('kv').get('last'); q.onsuccess = () => res(!!q.result); }); });
    r.check(!v, '116e Zab mode keeps no picture');
    const pre = await app.page.evaluate(() => { const was = _dbLoaded; _dbLoaded = false; _bvOn = null; let wrote = false; const o = _bvDb; _bvDb = () => { wrote = true; return o(); }; _bvCapture(); _bvDb = o; _dbLoaded = was; return wrote; });
    r.check(!pre, '116e before the notebook is in, nothing is kept');
  } catch (e) { r.check(false, '116e Zab mode threw: ' + String(e && e.message || e).split('\n')[0]); }
  finally { await app.close(); }
}

/* 116g the picture-migration scans: same answer as the recursive v05.55 version, and they pause */
{
  const app = await openApp({ viewport: { width: 1440, height: 900 } });
  try {
    const g = await app.page.evaluate(async () => {
      const iso = new Date().toISOString(), pic = '<img src="data:image/png;base64,' + 'A'.repeat(200) + '">';
      for (let i = 0; i < 4000; i++) DB.articles.push({ id: 'g' + i, title: 'n' + i, content: '<p>' + 'word '.repeat(400) + '</p>' + (i % 97 === 0 ? pic + pic : ''), folderIds: [], tags: [], createdAt: iso, updatedAt: iso });
      DB.trash.push({ id: 'tg1', type: 'article', item: { id: 'gt', content: pic }, deletedAt: iso });
      DB.theme.r3probe = { deep: [pic] };
      const old = () => { const out = {}; const walk = (v, p, d) => { if (typeof v === 'string') { if (v.length > 20 && v.indexOf('data:image') !== -1) { const m = v.match(/\bsrc=["']data:image/g); if (m) out[p] = (out[p] || 0) + m.length; } return; } if (!v || typeof v !== 'object' || d > 7) return; if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) walk(v[i], p, d + 1); return; } const ks = Object.keys(v); for (let i = 0; i < ks.length; i++) walk(v[ks[i]], p ? p + '.' + ks[i] : ks[i], d + 1); }; walk(DB, '', 0); return out; };
      const oldC = () => { const out = []; DB.articles.forEach((a) => { if (a && typeof a.content === 'string' && a.content.indexOf('data:image') !== -1) { const n = _picMigFind(a.content).length; if (n) out.push({ coll: 'articles', id: a.id, n }); } }); DB.trash.forEach((t) => { if (t && t.type === 'article' && t.item && typeof t.item.content === 'string' && t.item.content.indexOf('data:image') !== -1) { const n = _picMigFind(t.item.content).length; if (n) out.push({ coll: 'trash', id: t.id, n }); } }); return out; };
      /* a 1 ms slice (test hook) so the pause is certain on any machine; a timer must run between the slices */
      window.__picMigSliceMs = 1; let ticks = 0; const iv = setInterval(() => ticks++, 0);
      const f = await _picMigSweepFields(), c = await _picMigCands();
      clearInterval(iv); delete window.__picMigSliceMs;
      const of = old(), oc = oldC(); delete DB.theme.r3probe;
      return { same: JSON.stringify(Object.entries(f).sort()) === JSON.stringify(Object.entries(of).sort()) && JSON.stringify(c) === JSON.stringify(oc), f, n: c.length, ticks };
    });
    r.check(g.same && g.n >= 40, `116g the picture scans give the v05.55 answer (${g.n} notes with pictures; ${JSON.stringify(g.f)})`);
    r.check(g.ticks > 0, `116g the scans pause for other work (a timer ran ${g.ticks} times during them)`);
  } catch (e) { r.check(false, '116g threw: ' + String(e && e.message || e).split('\n')[0]); }
  finally { await app.close(); }
}
process.exit(r.finish() ? 1 : 0);
