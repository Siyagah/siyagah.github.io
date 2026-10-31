#!/usr/bin/env node
/* tools/mydb-r2.mjs — v05.62, J98 R2. 🗄 MyDatabase: the owner's private cards, read from the private store Siyagah/MyDB through the GitHub
   REST API with a read-only key. api.github.com is answered by a FAKE store routed in Playwright (3 cards: one whose `folder` matches a seeded
   Mapping My Journey path, one with no folder, one with a copied page + a file + live:true). Rows:
   120a the key: a good key works, a wrong key says "wrong key", offline says offline            120b the key is nowhere but its own database
   120c the three notes land in the right folders                                                120d the same commit again: one request, no _save()
   120e an owner's edit survives a changed card (newer mark), a moved note is not moved back    120f a deleted card is not brought back; a card removed from the store is marked gone, not deleted
   120g the copy opens in a new window: sandboxed iframe WITHOUT allow-same-origin, its script cannot read Siyagah's storage, the thumbnail is a data: URL
   120h offline after a first open, the cached copy still opens                                  120i 🧰 → 🗄 MyDatabase… reached by a real click at 390 / 820 / 1440, the dialog fits
   120j a page whose sha does not match stores nothing                                           120k Smart View lists them; the phone's buttons are full-width rows; no page errors */
import { createHash } from 'node:crypto';
import { openApp, report, seedDB } from './harness.mjs';

const r = report('J98 R2 — MyDatabase');
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const GOOD = 'github_pat_GOODKEY1234567890abcd', BAD = 'github_pat_BADKEY0000';
const sha = (b) => createHash('sha256').update(b).digest('hex');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const PAGE = `<!doctype html><html><body><h1>Copied</h1><img id="t" src="files/art1/thumb-a.jpg"><audio id="s" src="files/art1/sound.mp3"></audio><script>
var o={};try{localStorage.getItem('x');o.ls='read'}catch(e){o.ls=e.name}
try{var q=indexedDB.open('siyagah-local-v1');o.idb='opened'}catch(e){o.idb=e.name}
try{o.ck=document.cookie}catch(e){o.ck=e.name}
o.origin=location.origin;window.__o=o;
</script></body></html>`;
const PAGE_BYTES = Buffer.from(PAGE);
const MMJ_PATH = 'Mapping My Journey › Section 04 Testing Ground › (521–600) Understanding the MISGUIDANCE › Know the RESPONSIBILITY of ULEMA';

function makeStore() {
  const st = { head: 'h1', requests: [], badPageSha: false, files: {} };
  st.cards = () => [
    { id: 'c1', pid: 'mmsa', name: st.c1name || 'Ulema card', what: 'About <b>ulema</b>', kind: 'Report', status: 'Done', url: 'https://example.com/c1', at: '2026-10-30T10:00:00Z', by: 'x', folder: MMJ_PATH, topics: ['responsibility'] },
    { id: 'c2', pid: 'bwn', name: 'Plain card', what: st.c2what || 'A plain one', kind: 'Demo', status: 'Open', url: 'https://example.com/c2', at: '2026-10-29T10:00:00Z', by: 'x' },
    { id: 'c3', pid: 'khutbah', name: 'Live page', what: 'Shows live data', kind: 'Demo', status: 'Done', url: 'https://claude.ai/x', at: '2026-10-31T10:00:00Z', by: 'x', page: 'pages/khutbah~c3.html', pageAt: '2026-10-28T00:00:00Z',
      pageSha: st.badPageSha ? sha('something else') : sha(PAGE_BYTES), live: true,
      files: [{ path: 'files/art1/thumb-a.jpg', size: PNG.length, sha: sha(PNG) }], filesHeld: [{ path: 'files/art1/sound.mp3', size: 9, sha: 'ab', reason: 'sound' }] },
  ].filter((c) => !(st.drop || []).includes(c.id));
  return st;
}
async function install(ctx, st) {
  await ctx.route('https://api.github.com/**', async (route) => {
    const rq = route.request(), u = new URL(rq.url()), cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization,accept,x-github-api-version', 'access-control-allow-methods': 'GET' };
    if (rq.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    st.requests.push(u.pathname + u.search);
    if (rq.headers().authorization !== 'Bearer ' + GOOD) return route.fulfill({ status: 401, headers: cors, contentType: 'application/json', body: '{"message":"Bad credentials"}' });
    if (u.pathname.endsWith('/commits/main')) return route.fulfill({ status: 200, headers: cors, contentType: 'text/plain', body: st.head });
    const m = /\/contents\/(.+)$/.exec(u.pathname); const p = m && decodeURIComponent(m[1]);
    if (p === 'cards.json') return route.fulfill({ status: 200, headers: cors, contentType: 'application/octet-stream', body: JSON.stringify({ v: 1, at: '2026-10-31T00:00:00Z', cards: st.cards() }) });
    if (p === 'pages/khutbah~c3.html') return route.fulfill({ status: 200, headers: cors, contentType: 'application/octet-stream', body: PAGE_BYTES });
    if (p === 'files/art1/thumb-a.jpg') return route.fulfill({ status: 200, headers: cors, contentType: 'application/octet-stream', body: PNG });
    return route.fulfill({ status: 404, headers: cors, contentType: 'application/json', body: '{"message":"Not Found"}' });
  });
}
const db = () => {
  const d = seedDB('2026-10-01T00:00:00.000Z');
  const mk = (id, name, parentId, mmj) => ({ id, name, parentId, order: 1, ...(parentId ? {} : { sectionId: 'sec-1' }), mmj, updatedAt: '2026-10-01T00:00:00.000Z' });
  d.folders.push(mk('mmj-c-1', 'Mapping My Journey', null, { id: 1, n: 'Mapping My Journey', p: null }), mk('mmj-c-2', 'Section 04 Testing Ground', 'mmj-c-1', { id: 2, n: 'Section 04 Testing Ground', p: 'mmj-c-1' }),
    mk('mmj-c-3', '(521–600) Understanding the MISGUIDANCE', 'mmj-c-2', { id: 3, n: '(521–600) Understanding the MISGUIDANCE', p: 'mmj-c-2' }), mk('mmj-c-4', 'Know the RESPONSIBILITY of ULEMA', 'mmj-c-3', { id: 4, n: 'Know the RESPONSIBILITY of ULEMA', p: 'mmj-c-3' }));
  return d;
};
const tap = (page, touch, sel) => (touch ? page.locator(sel).first().tap() : page.locator(sel).first().click());
const openDlg = async (page, touch) => {
  await tap(page, touch, '#sb-tools-btn'); await sleep(300);
  await tap(page, touch, '#sb-tools .sb-mi:has-text("🗄 MyDatabase…")');
  await page.waitForSelector('#mydb-modal.open #mydb-box', { timeout: 5000 });
};
const msg = (page) => page.evaluate(() => (document.getElementById('mydb-st') || {}).textContent || '');
const connect = async (page, touch, key) => { await page.fill('#mydb-key', key); await tap(page, touch, '#mydb-connect'); await sleep(900); };
const notes = (page) => page.evaluate(() => Object.fromEntries((DB.articles || []).filter((a) => a.fromMydb).map((a) => [a.id, { f: a.folderIds, t: a.title, tags: a.tags, m: a.fromMydb, c: a.content }])));

/* ── the main flow at 1440 ── */
{
  const st = makeStore(), app = await openApp({ viewport: { width: 1440, height: 900 }, db: db() }), page = app.page; page.setDefaultTimeout(10000);
  await install(app.ctx, st);
  try {
    await openDlg(page, false);
    /* a: wrong key, offline, good key */
    await connect(page, false, BAD);
    const bad = await msg(page);
    await app.ctx.setOffline(true); await connect(page, false, GOOD); const off = await msg(page); await app.ctx.setOffline(false);
    r.check(/wrong key/i.test(bad) && /offline/i.test(off), '120a a wrong key says "wrong key"; offline says offline', JSON.stringify({ bad, off }));
    const none = await page.evaluate(() => (DB.articles || []).filter((a) => a.fromMydb).length);
    await connect(page, false, GOOD); await sleep(1500);
    const good = await msg(page), n1 = await notes(page);
    r.check(/Works/.test(good) || /added/.test(good), '120a a good key works', good);
    /* b: the key is nowhere but its own database */
    const where = await page.evaluate(async (k) => {
      const nb = JSON.stringify(await _idbGet('notebook').catch(() => null));
      const dbs = (await indexedDB.databases()).map((x) => x.name);
      return { db: JSON.stringify(DB).includes(k), theme: JSON.stringify(DB.theme).includes(k), ls: JSON.stringify(Object.assign({}, localStorage)).includes(k), nb: nb.includes(k), save: _cleanExportRoot().includes(k), dbs, box: !!document.getElementById('mydb-key').value };
    }, GOOD);
    const inOwn = await page.evaluate(async () => new Promise((res) => { const q = indexedDB.open('siyagah-mydb-v1'); q.onsuccess = () => { const g = q.result.transaction('kv').objectStore('kv').get('key'); g.onsuccess = () => { q.result.close(); res(g.result); }; }; }));
    r.check(!where.db && !where.theme && !where.ls && !where.nb && !where.save && !where.box && inOwn === GOOD && where.dbs.includes('siyagah-mydb-v1'), '120b the key is not in DB, theme, localStorage, the notebook record or a Save File copy; only in siyagah-mydb-v1', JSON.stringify(where));
    /* c: folders */
    const ids = Object.keys(n1);
    const fold = await page.evaluate(() => Object.fromEntries(DB.folders.filter((f) => /^mydb-/.test(f.id)).map((f) => [f.id, { n: f.name, p: f.parentId, sec: f.sectionId, my: !!f.mydb }])));
    r.check(none === 0 && ids.length === 3 && n1['mydb-mmsa~c1'].f[0] === 'mmj-c-4' && n1['mydb-bwn~c2'].f[0] === 'mydb-p-bwn-demo' && n1['mydb-khutbah~c3'].f[0] === 'mydb-p-khutbah-demo'
      && fold['mydb-p-bwn-demo'].p === 'mydb-p-bwn' && fold['mydb-p-bwn'].p === 'mydb-root' && fold['mydb-root'].sec === 'sec-1' && fold['mydb-p-bwn'].n === 'Basheera wa Nazeera' && fold['mydb-p-bwn-demo'].n === 'Demos' && Object.values(fold).every((f) => f.my),
    '120c the three notes land in the right folders (MMJ path matched; else 🗄 MyDatabase › project › type)', JSON.stringify({ ids, f: Object.values(n1).map((x) => x.f), fold }));
    r.check(n1['mydb-mmsa~c1'].tags.includes('mydb') && n1['mydb-mmsa~c1'].tags.includes('responsibility') && /About &lt;b&gt;ulema&lt;\/b&gt;/.test(n1['mydb-mmsa~c1'].c) && /data-mydb="orig"/.test(n1['mydb-mmsa~c1'].c) && !/data-mydb="copy"/.test(n1['mydb-mmsa~c1'].c)
      && /data-mydb="copy"/.test(n1['mydb-khutbah~c3'].c) && /1 sound\/video file/.test(n1['mydb-khutbah~c3'].c), '120c the card is drawn as the note (text escaped, tags, buttons only where they apply, files held line)', n1['mydb-khutbah~c3'].c.slice(0, 300));
    /* d: same commit */
    await page.evaluate(() => { window.__sv = 0; const o = window._save; window._save = function () { window.__sv++; return o.apply(this, arguments); }; });
    const before = st.requests.length;
    await page.evaluate(() => _mydbSyncRun(true));
    const mid = st.requests.slice(before), sv = await page.evaluate(() => window.__sv);
    r.check(mid.length === 1 && /commits\/main/.test(mid[0]) && sv === 0, '120d the same commit again: one request (the sha check), no _save()', JSON.stringify({ mid, sv }));
    /* e: owner edit survives, moved note stays; untouched note updates */
    await page.evaluate(() => { const a = DB.articles.find((x) => x.id === 'mydb-bwn~c2'); a.content += '<p>MINE</p>'; a.folderIds = ['f2']; persist(); });
    st.head = 'h2'; st.c2what = 'A changed plain one'; st.c1name = 'Ulema card v2';
    await page.evaluate(() => _mydbSyncRun(true)); await sleep(300);
    const n2 = await notes(page);
    r.check(/MINE/.test(n2['mydb-bwn~c2'].c) && !/changed plain one/.test(n2['mydb-bwn~c2'].c) && !!n2['mydb-bwn~c2'].m.newer && n2['mydb-bwn~c2'].f[0] === 'f2' && n2['mydb-mmsa~c1'].t === 'Ulema card v2' && n2['mydb-mmsa~c1'].f[0] === 'mmj-c-4' && !n2['mydb-mmsa~c1'].m.newer,
      '120e an owner\'s edit survives a changed card (newer mark), a moved note is not moved back, an untouched note is updated in place', JSON.stringify({ c2: n2['mydb-bwn~c2'].m.newer ? 'newer' : 'none', f: n2['mydb-bwn~c2'].f, t: n2['mydb-mmsa~c1'].t }));
    /* f: deleted by the owner is not brought back; removed from the store is marked gone */
    await page.evaluate(() => trashArt('mydb-khutbah~c3'));
    st.head = 'h3'; st.drop = ['c1'];
    await page.evaluate(() => _mydbSyncRun(true)); await sleep(300);
    const n3 = await notes(page), tr = await page.evaluate(() => (DB.trash || []).some((t) => t.item && t.item.id === 'mydb-khutbah~c3'));
    r.check(!n3['mydb-khutbah~c3'] && tr && !!n3['mydb-mmsa~c1'] && n3['mydb-mmsa~c1'].m.gone === true && Object.keys(n3).length === 2, '120f a note the owner deleted is not brought back; a card removed from the store is marked gone, never deleted', JSON.stringify({ ids: Object.keys(n3), gone: n3['mydb-mmsa~c1'] && n3['mydb-mmsa~c1'].m.gone, tr }));
    st.drop = []; st.head = 'h4';
    await page.evaluate(() => _mydbSyncRun(true)); await sleep(300);
    const n4 = await notes(page);
    r.check(!n4['mydb-khutbah~c3'] && n4['mydb-mmsa~c1'] && !n4['mydb-mmsa~c1'].m.gone, '120f the card back in the store clears the gone mark; the deleted note still stays out', JSON.stringify(Object.keys(n4)));
    /* Smart View */
    const sv2 = await page.evaluate(() => { try { return getSmartArts('sf-mydb').map((a) => a.id); } catch (e) { return String(e); } });
    r.check(Array.isArray(sv2) && sv2.length === 2 && sv2[0] === 'mydb-mmsa~c1', '120k the Smart View lists the cards, newest card first', JSON.stringify(sv2));
    /* g, h: the copy */
    st.badPageSha = false; st.head = 'h5';
    await page.click('#mydb-x');
    // bring c3 back as a fresh note: the owner's deletion keeps it out, so open from a second card note instead (restore from Trash)
    await page.evaluate(() => { const i = DB.trash.findIndex((t) => t.item && t.item.id === 'mydb-khutbah~c3'); if (i >= 0) { const t = DB.trash.splice(i, 1)[0]; DB.articles.push(t.item); persist(); } });
    await page.evaluate(() => { selArt('mydb-khutbah~c3'); }); await sleep(500);
    const [pop] = await Promise.all([app.ctx.waitForEvent('page'), page.locator('[data-mydb="copy"]').first().click()]);
    await pop.waitForSelector('iframe', { timeout: 15000 }); await sleep(500);
    const info = await pop.evaluate(() => { const f = document.querySelector('iframe'); return { sb: f.getAttribute('sandbox'), bar: document.querySelector('.bar').textContent, blob: /blob:/.test(f.getAttribute('srcdoc')) }; });
    const fr = pop.frames().find((x) => x !== pop.mainFrame());
    const inside = await fr.evaluate(() => { const o = {}; try { localStorage.getItem('siyagah'); o.ls = 'read'; } catch (e) { o.ls = e.name; } try { o.idb = String(indexedDB.open('siyagah-mydb-v1') && 'opened'); } catch (e) { o.idb = e.name; } try { o.ck = document.cookie; } catch (e) { o.ck = e.name; } o.origin = location.origin; o.src = document.getElementById('t').getAttribute('src').slice(0, 30); o.snd = document.getElementById('s').getAttribute('src'); return o; });
    r.check(/allow-scripts/.test(info.sb) && !/allow-same-origin/.test(info.sb) && !info.blob && inside.origin === 'null' && inside.ls === 'SecurityError' && (inside.ck === 'SecurityError' || inside.ck === '') && /^data:image\/jpeg;base64,/.test(inside.src) && inside.snd === 'files/art1/sound.mp3' && /Copy of 2026-10-28.*live data/.test(info.bar),
      '120g the copy opens in a new window: sandboxed iframe without allow-same-origin, its script cannot read Siyagah\'s storage, the thumbnail is a data: URL, a held file is left alone, the live bar is shown', JSON.stringify({ info, inside }));
    const idbProbe = await fr.evaluate(() => new Promise((res) => { try { const q = indexedDB.open('siyagah-mydb-v1'); q.onerror = () => res('error'); q.onsuccess = () => { try { const has = q.result.objectStoreNames.length; q.result.close(); res('own-db-empty:' + has); } catch (e) { res('x'); } }; q.onupgradeneeded = () => {}; } catch (e) { res(e.name); } }));
    r.check(/SecurityError|error|own-db-empty:0/.test(idbProbe), '120g script inside the copy cannot see Siyagah\'s IndexedDB (an opaque origin: error, or an empty database of its own)', idbProbe);
    await pop.close();
    /* h: offline, cached */
    await app.ctx.setOffline(true);
    const [pop2] = await Promise.all([app.ctx.waitForEvent('page'), page.locator('[data-mydb="copy"]').first().click()]);
    await pop2.waitForSelector('iframe', { timeout: 15000 });
    r.check(true, '120h offline after a first open, the cached copy still opens');
    await pop2.close(); await app.ctx.setOffline(false);
    const errs = app.errors.filter((e) => !/status of 401/.test(e));   /* the wrong key's 401 is the browser's own line for the answer this row asks for */
    r.check(errs.length === 0, '120k no page errors in the main flow', errs.slice(0, 3).join(' | '));
  } catch (e) { r.check(false, '120 main flow threw', String(e && e.stack || e)); }
  await app.close();
}

/* ── j: a page whose sha does not match stores nothing; an uncached page offline says so ── */
{
  const st = makeStore(); st.badPageSha = true;
  const app = await openApp({ viewport: { width: 1440, height: 900 }, db: db() }), page = app.page; page.setDefaultTimeout(10000);
  await install(app.ctx, st);
  try {
    await openDlg(page, false); await connect(page, false, GOOD); await sleep(1500);
    await page.click('#mydb-x');
    await page.evaluate(() => { _mydbS.keeping = true; });   /* the background keep must not race this row */
    await page.evaluate(() => { selArt('mydb-khutbah~c3'); }); await sleep(500);
    const [pop] = await Promise.all([app.ctx.waitForEvent('page'), page.locator('[data-mydb="copy"]').first().click()]);
    await sleep(1500);
    const txt = await pop.evaluate(() => document.body.textContent);
    const stored = await page.evaluate(async () => new Promise((res) => { const q = indexedDB.open('siyagah-mydb-v1'); q.onsuccess = () => { const g = q.result.transaction('pages').objectStore('pages').getAllKeys(); g.onsuccess = () => { q.result.close(); res(g.result); }; }; }));
    r.check(/checksum/.test(txt) && !stored.includes('pages/khutbah~c3.html') && !(await pop.$('iframe')), '120j a page whose sha does not match is not opened and stores nothing', JSON.stringify({ txt: txt.slice(0, 120), stored }));
    await pop.close();
    await app.ctx.setOffline(true);
    st.badPageSha = false;
    const [pop2] = await Promise.all([app.ctx.waitForEvent('page'), page.locator('[data-mydb="copy"]').first().click()]);
    await sleep(800);
    const t2 = await pop2.evaluate(() => document.body.textContent);
    r.check(/not on this device yet/.test(t2), '120h an uncached copy offline says so plainly', t2.slice(0, 160));
    await pop2.close(); await app.ctx.setOffline(false);
  } catch (e) { r.check(false, '120j threw', String(e && e.stack || e)); }
  await app.close();
}

/* ── i: the dialog at every size, by a real click; the phone's note buttons ── */
for (const [w, h, touch] of [[390, 844, true], [820, 1180, true], [1440, 900, false]]) {
  const t = `@${w}`, st = makeStore();
  const app = await openApp({ viewport: { width: w, height: h }, hasTouch: touch, db: db() }), page = app.page; page.setDefaultTimeout(10000);
  await install(app.ctx, st);
  try {
    await openDlg(page, touch);
    const m = await page.evaluate(() => { const b = document.getElementById('mydb-box').getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, ow: document.documentElement.scrollWidth > innerWidth + 1, bw: document.getElementById('mydb-box').scrollWidth > document.getElementById('mydb-box').clientWidth + 1, iw: innerWidth, ih: innerHeight, sheet: b.bottom >= innerHeight - 1 }; });
    r.check(m.l >= -0.5 && m.r <= m.iw + 0.5 && m.t >= -0.5 && m.b <= m.ih + 0.5 && !m.ow && !m.bw && (w >= 640 ? !m.sheet : m.sheet), `120i${t} the dialog fits the screen (sheet on a phone, centred above), nothing overflows sideways`, JSON.stringify(m));
    await page.fill('#mydb-key', GOOD); await tap(page, touch, '#mydb-connect'); await sleep(1800);
    await page.waitForFunction(() => !document.getElementById('mydb-check').disabled, null, { timeout: 15000 }).catch(async (e) => { throw new Error('Check now stayed disabled: ' + JSON.stringify(await page.evaluate(() => ({ busy: _mydbS.busy, key: !!_mydbS.key, conn: _mydbS.connecting, msg: _mydbS.msg, st: document.getElementById('mydb-st').textContent })))); });
    const ok1 = /Works|added/.test(await msg(page));
    await tap(page, touch, '#mydb-check'); await sleep(900);
    const ok2 = /Up to date|added|updated/.test(await msg(page));
    r.check(ok1 && ok2, `120i${t} Connect and ⟳ Check now are reached by a real ${touch ? 'tap' : 'click'}`, await msg(page));
    await tap(page, touch, '#mydb-x'); await sleep(200);
    r.check(await page.evaluate(() => !document.getElementById('mydb-modal').classList.contains('open')), `120i${t} ✕ closes the dialog`);
    const meta = await page.evaluate(() => { selArt('mydb-khutbah~c3'); if (innerWidth < 1200) showPane('p3'); });
    await sleep(500);
    const bt = await page.evaluate(() => [...document.querySelectorAll('.mydb-b')].filter((b) => b.offsetParent).map((b) => { const x = b.getBoundingClientRect(); return { w: Math.round(x.width), h: Math.round(x.height) }; }));
    const pw = await page.evaluate(() => document.querySelector('.mydb-btns').getBoundingClientRect().width);
    r.check(bt.length === 2 && bt.every((b) => b.h >= 44) && (w < 640 ? bt.every((b) => b.h >= 48 && b.w >= pw - 2) : bt[0].w < pw - 20), `120k${t} the note's buttons: ${w < 640 ? 'full-width rows ≥ 48 px' : 'one row under the table'}`, JSON.stringify({ bt, pw }));
    if (w === 390) {
      await page.evaluate(() => selFolder('sf-mydb')); await sleep(300);
      const ar = await page.evaluate(() => (document.querySelector('.ar-mydb') || {}).textContent || '');
      r.check(/🗄 Khutbah · Demo/.test(ar) || /🗄/.test(ar), '120k@390 the Smart View is a normal list with the 🗄 project · type line', ar);
    }
  } catch (e) { r.check(false, `120i${t} threw`, String(e && e.stack || e)); }
  r.check(app.errors.length === 0, `120k${t} no page errors`, app.errors.slice(0, 3).join(' | '));
  await app.close();
}
/* the empty Smart View reaches the dialog */
{
  const app = await openApp({ viewport: { width: 1440, height: 900 }, db: db() }), page = app.page; page.setDefaultTimeout(10000);
  try {
    await page.evaluate(() => selFolder('sf-mydb')); await sleep(400);
    await page.locator('#mydb-empty-btn').click(); await page.waitForSelector('#mydb-modal.open');
    const dbs = await page.evaluate(async () => (await indexedDB.databases()).map((x) => x.name));
    r.check(!dbs.includes('siyagah-mydb-v1'), '120i the empty Smart View opens the dialog; a device that never connects never gets the MyDatabase database', JSON.stringify(dbs));
  } catch (e) { r.check(false, '120i empty view threw', String(e && e.stack || e)); }
  await app.close();
}
process.exit(r.finish() ? 1 : 0);
