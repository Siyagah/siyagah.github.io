#!/usr/bin/env node
/* tools/mmj-sync.mjs — v05.49, J74 ③: keep Mapping My Journey and Siyagah matching (site → Siyagah only; never deletes; the owner's edits win).
   The same fake WordPress site as tools/mmj-import.mjs (served through page.route, mutated between checks; `window.__mmjNow` sets the clock). Checks 109a–109i:
   109a nothing runs without mmj-sec, or switched off, or offline (no request made); the same device does run when allowed;
   109b a new category, a new post and a new page arrive on the next check, in the right place, asking only for what changed (modified_after);
   109c a category renamed and moved on the site follows; one the owner renamed in Siyagah keeps the owner's name;
   109d a post changed on the site replaces an untouched note (title, content, pictures, folders, updatedAt); an edited note is unchanged and shows
        the "newer version" line, and Show opens the new text;
   109e a post and a category removed from the site are marked, never deleted; they come back clean when restored;
   109f a note in Trash and a folder in Trash are never brought back;
   109g sync: the check's changes merged into a stale copy both ways keep everything; a second device running the same check produces the same records;
   109h the dialog row at 390 / 820 / 1440 is reached from the real 🧰 and tappable; ⟳ Check now works; the read-view lines wrap at 390;
   109i no page errors.
   `node tools/mmj-sync.mjs` */
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { openApp, seedDB, report } from './harness.mjs';

const r = report('J74 ③ — keep Mapping My Journey and Siyagah matching');
const errs = [];
const SITE = 'https://mappingmyjourney.com';

const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (b) => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const png = (seed) => {
  const w = 4, h = 4, raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = (seed * 53) & 255; raw[o + 1] = (seed * 97 + x * 5) & 255; raw[o + 2] = (seed * 31 + y * 7) & 255; }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
};
const seedOf = (u) => [...u].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % 9973, 7);
const enc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const iso = (s) => new Date(s + 'Z').toISOString();

function makeSmall() {
  const cats = [];
  const par = (id) => (id <= 3 ? 0 : id <= 9 ? [1, 1, 2, 2, 3, 3][id - 4] : id <= 33 ? id - 6 : [1, 2, 3, 4, 5, 6, 7][id - 34]);
  const names = ['Fish & Chips', 'Q: "quoted" :|:', 'Plain', 'Ünïcode — dash', "Apostrophe's", 'Lower case', 'UPPER CASE'];
  for (let id = 1; id <= 40; id++) cats.push({ id, name: names[id % 7] + ' ' + id, parent: par(id), slug: 'c' + id, link: `${SITE}/c${id}/` });
  const empty = new Set([2, 9, 15, 21, 27, 33, 36, 38, 39, 40]);
  const usable = cats.map((c) => c.id).filter((i) => !empty.has(i));
  const posts = [];
  for (let i = 0; i < 30; i++) {
    const c = [usable[i]];
    if (i % 3 === 0) c.push(usable[(i * 7 + 3) % 30], usable[(i * 11 + 5) % 30]); else if (i % 3 === 1) c.push(usable[(i * 5 + 1) % 30]);
    let html = `<p>Post ${i} text with <b>bold</b>.</p>`;
    if (i < 10) html += `<p><img src="https://i0.wp.com/mappingmyjourney.com/wp-content/uploads/p${i % 4}.png?resize=300%2C200" alt="pic ${i}"></p>`;
    if (i === 3) html += '<p><img src="https://i0.wp.com/mappingmyjourney.com/wp-content/uploads/missing.png" alt="gone"></p>';
    posts.push({ id: 100 + i, date_gmt: `2024-0${1 + (i % 9)}-1${i % 9}T10:11:12`, modified_gmt: `2024-1${i % 3}-2${i % 9}T01:02:03`, link: `${SITE}/post-${i}/`, slug: 'post-' + i,
      title: { rendered: `Post ${i}` }, content: { rendered: html }, categories: [...new Set(c)], tags: i % 2 === 0 ? [901, 902] : [], featured_media: 0 });
  }
  const pages = [0, 1, 2].map((k) => ({ id: 900 + k, date_gmt: `2023-05-0${k + 1}T00:00:00`, modified_gmt: `2023-06-0${k + 1}T00:00:00`, link: `${SITE}/page-${k}/`, slug: 'page-' + k,
    title: { rendered: 'Page ' + k }, content: { rendered: `<p>Page body ${k}</p>` }, parent: 0, menu_order: k, featured_media: 0 }));
  return { cats: cats.slice(), posts, pages, tags: [{ id: 901, name: 'Journey' }, { id: 902, name: 'Sufi &amp; Path' }], media: [] };
}
const sorted = (cats) => cats.slice().sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || a.id - b.id);

async function serveSite(ctx, S, o = {}) {
  const seen = [];
  const json = (route, arr, extra = {}) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(arr),
    headers: { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'X-WP-Total, X-WP-TotalPages', ...extra } });
  await ctx.route(SITE + '/**', async (route) => {
    const u = new URL(route.request().url()); seen.push(u.pathname + u.search);
    const one = /^\/wp-json\/wp\/v2\/(posts|pages)\/(\d+)$/.exec(u.pathname);
    if (one) { const x = S[one[1]].find((p) => p.id === +one[2]); return x ? json(route, x) : route.fulfill({ status: 404, body: '{}', headers: { 'access-control-allow-origin': '*' } }); }
    const m = /^\/wp-json\/wp\/v2\/(categories|posts|pages|tags|media)$/.exec(u.pathname);
    if (m) {
      if (o.fail && m[1] === o.fail) return route.fulfill({ status: 500, body: 'no', headers: { 'access-control-allow-origin': '*' } });
      let all = m[1] === 'categories' ? sorted(S.cats).map((c) => ({ id: c.id, name: enc(c.name), parent: c.parent, slug: c.slug, link: c.link, count: 0 })) : S[m[1]];
      const inc = u.searchParams.get('include');
      if (inc) { const ids = new Set(inc.split(',').map(Number)); all = all.filter((x) => ids.has(x.id)); }
      const ma = u.searchParams.get('modified_after');
      if (ma) all = all.filter((x) => x.modified_gmt > ma);
      const per = +u.searchParams.get('per_page') || 10, page = +u.searchParams.get('page') || 1;
      return json(route, all.slice((page - 1) * per, page * per), { 'X-WP-Total': String(all.length), 'X-WP-TotalPages': String(Math.max(1, Math.ceil(all.length / per))) });
    }
    return route.fulfill({ status: 404, body: '' });
  });
  await ctx.route('https://i0.wp.com/**', async (route) => {
    const u = new URL(route.request().url()); seen.push(u.host + u.pathname);
    const name = u.pathname.split('/').pop();
    if (name.startsWith('missing')) return route.fulfill({ status: 404, body: 'x', headers: { 'access-control-allow-origin': '*' } });
    return route.fulfill({ status: 200, contentType: 'image/png', body: png(seedOf(name)), headers: { 'access-control-allow-origin': '*' } });
  });
  return seen;
}
const wp = (seen) => seen.filter((s) => s.startsWith('/wp-json')).length;
const importAll = async (page) => {
  await page.evaluate(() => { openMmjImport(); _mmjRead(); }); await page.waitForSelector('#mmj-go, #mmj-err', { timeout: 60000 });
  await page.evaluate(() => { _mmjImport(); }); await page.waitForSelector('#mmj-done, #mmj-err', { timeout: 120000 });
  await page.evaluate(() => closeMmjImport());
};
const setNow = (page, t) => page.evaluate((x) => { window.__mmjNow = Date.parse(x); }, t);
const run = (page) => page.evaluate(() => _mmjSyncRun(true));
const art = (page, id) => page.evaluate((i) => JSON.parse(JSON.stringify(DB.articles.find((a) => a.id === i) || null)), id);
const fol = (page, id) => page.evaluate((i) => JSON.parse(JSON.stringify(DB.folders.find((f) => f.id === i) || null)), id);
const dbSnap = (page) => page.evaluate(() => JSON.stringify({ f: DB.folders.map((f) => { const c = JSON.parse(JSON.stringify(f)); delete c.updatedAt; if (c.mmj) { delete c.mmj.n; delete c.mmj.p; } return c; }), a: DB.articles }));   /* the first check writes each v05.48 folder's baseline name / parent (mmj.n / mmj.p) and nothing else */
const openMenu = async (page) => {
  await page.evaluate(() => { try { closeModal(); } catch (e) {} if (window.innerWidth < 640 && typeof showPane === 'function') showPane('sb'); });
  await page.click('#sb-tools-btn'); await page.waitForTimeout(300);
};

const S = makeSmall();
let pre = null, post = null;

/* 109a (no section) — a device that never ran the import makes no request */
{
  const app = await openApp({ viewport: { width: 1440, height: 900 }, db: seedDB() });
  try {
    const { page, ctx } = app;
    const seen = await serveSite(ctx, S);
    await page.evaluate(async () => { await _mmjSyncTick(); await _mmjSyncRun(true); });
    r.check(wp(seen) === 0, '109a a device without the section Mapping My Journey makes no request (tick or ⟳ Check now)', JSON.stringify(seen.slice(0, 3)));
    errs.push(...app.errors);
  } finally { await app.close(); }
}

/* 109b–109g in one session at 1440 */
{
  const app = await openApp({ viewport: { width: 1440, height: 900 }, db: seedDB() });
  try {
    const { page, ctx } = app;
    const seen = await serveSite(ctx, S);
    await page.waitForTimeout(400);
    await importAll(page);

    /* 109a (switched off, offline) and the positive control */
    let n0 = seen.length;
    await page.evaluate(async () => { DB.theme = DB.theme || {}; DB.theme.mmjSync = false; await _mmjSyncTick(); });
    const offOk = seen.length === n0;
    await page.evaluate(() => { DB.theme.mmjSync = true; });
    await ctx.setOffline(true); n0 = seen.length;
    await page.evaluate(async () => { await _mmjSyncTick(); await _mmjSyncRun(true); });
    const offlineOk = seen.length === n0;
    await ctx.setOffline(false);
    await setNow(page, '2025-01-10T00:00:00Z');
    const before = await dbSnap(page); n0 = wp(seen);
    await page.evaluate(async () => { await _mmjSyncTick(); });
    const ranTick = wp(seen) > n0;
    const lastSaved = await page.evaluate(async () => { const k = await _mmjKv('get'); return k && k.at; });
    const after = await dbSnap(page);
    const baseOk = await page.evaluate(() => DB.folders.filter((f) => f.id.startsWith('mmj-c-')).every((f) => f.mmj.n === f.name && f.mmj.p === (f.parentId || null)));
    r.check(offOk && offlineOk && ranTick && lastSaved === Date.parse('2025-01-10T00:00:00Z') && before === after && baseOk,
      '109a switched off → no request; offline → no request; allowed → the tick checks the site, remembers the time in siyagah-mmj-v1, and a site with no change changes nothing (except the baseline mmj.n / mmj.p written on each folder)',
      JSON.stringify({ offOk, offlineOk, ranTick, lastSaved, same: before === after, baseOk }));
    pre = JSON.parse(await page.evaluate(() => JSON.stringify(DB)));

    /* 109b — new category, post and page */
    S.cats.push({ id: 41, name: 'Brand New Cat', parent: 5, slug: 'c41', link: `${SITE}/c41/` });
    S.posts.push({ id: 130, date_gmt: '2025-01-11T10:00:00', modified_gmt: '2025-01-12T01:00:00', link: `${SITE}/post-30/`, slug: 'post-30', title: { rendered: 'Fresh post' },
      content: { rendered: '<p>Fresh text <img src="https://i0.wp.com/mappingmyjourney.com/wp-content/uploads/fresh1.png"></p>' }, categories: [41], tags: [], featured_media: 0 });
    S.pages.push({ id: 903, date_gmt: '2025-01-11T00:00:00', modified_gmt: '2025-01-12T00:00:00', link: `${SITE}/page-3/`, slug: 'page-3', title: { rendered: 'Fresh page' }, content: { rendered: '<p>Fresh page body</p>' }, parent: 0, menu_order: 3, featured_media: 0 });
    await setNow(page, '2025-01-13T00:00:00Z'); n0 = seen.length;
    const s1 = await run(page);
    const f41 = await fol(page, 'mmj-c-41'), a130 = await art(page, 'mmj-p-130'), a903 = await art(page, 'mmj-g-903');
    const maxSib = await page.evaluate(() => Math.max(...DB.folders.filter((f) => f.parentId === 'mmj-c-5' && f.id !== 'mmj-c-41').map((f) => f.order || 0)));
    const asked = seen.slice(n0).filter((s) => /\/(posts|pages)\?/.test(s) && /modified_after=2025-01-09/.test(decodeURIComponent(s)));
    r.check(s1 && s1.added === 3 && f41 && f41.name === 'Brand New Cat' && f41.parentId === 'mmj-c-5' && f41.order === maxSib + 1 && !f41.sectionId
      && a130 && a130.title === 'Fresh post' && JSON.stringify(a130.folderIds) === '["mmj-c-41"]' && /data-pic="[0-9a-f]{64}"/.test(a130.content) && a130.updatedAt === iso('2025-01-12T01:00:00') && a130.fromMmj.u === a130.updatedAt
      && a903 && JSON.stringify(a903.folderIds) === '["mmj-pages"]' && a903.title === 'Fresh page' && asked.length >= 2,
      '109b a new category, a new post (with its picture) and a new page arrive on the next check, in the right place, asking only for what changed since', JSON.stringify({ s1, f41, a130: a130 && a130.folderIds, a903: a903 && a903.folderIds, asked: asked.length, maxSib }));

    /* 109c — rename and move; the owner's own rename wins */
    S.cats.find((c) => c.id === 10).name = 'Renamed Ten & Co'; S.cats.find((c) => c.id === 10).parent = 3;
    S.cats.find((c) => c.id === 12).name = 'Site Twelve';
    await page.evaluate(() => { const f = DB.folders.find((x) => x.id === 'mmj-c-12'); f.name = 'Owner Twelve'; f.updatedAt = new Date().toISOString(); });
    await setNow(page, '2025-01-14T00:00:00Z');
    const s2 = await run(page);
    const f10 = await fol(page, 'mmj-c-10'), f12 = await fol(page, 'mmj-c-12');
    r.check(s2 && s2.updated === 1 && s2.kept === 1 && f10.name === 'Renamed Ten & Co' && f10.parentId === 'mmj-c-3' && !f10.sectionId && f10.mmj.n === 'Renamed Ten & Co' && f10.mmj.p === 'mmj-c-3'
      && f12.name === 'Owner Twelve' && f12.mmj.slug === 'c12',
      '109c a category renamed and moved on the site follows in Siyagah; one the owner renamed in Siyagah keeps the owner\'s name', JSON.stringify({ s2, f10: f10 && [f10.name, f10.parentId, f10.mmj], f12: f12 && f12.name }));

    /* 109d — a changed post: untouched replaced; edited kept + newer line */
    const p101 = S.posts.find((p) => p.id === 101), p102 = S.posts.find((p) => p.id === 102);
    Object.assign(p101, { title: { rendered: 'Post 1 — site edit' }, content: { rendered: '<p>Edited on the site <img src="https://i0.wp.com/mappingmyjourney.com/wp-content/uploads/editpic.png"></p>' }, categories: [3, 5], tags: [901], modified_gmt: '2025-01-15T00:00:00' });
    Object.assign(p102, { title: { rendered: 'Post 2 site newer' }, content: { rendered: '<p>Site newer text 102</p>' }, modified_gmt: '2025-01-15T00:00:00' });
    await page.evaluate(() => { const a = DB.articles.find((x) => x.id === 'mmj-p-102'); a.content += '<p>MINE</p>'; a.updatedAt = new Date().toISOString(); });
    const t102 = (await art(page, 'mmj-p-102')).title;
    await setNow(page, '2025-01-16T00:00:00Z');
    const s3 = await run(page);
    const a101 = await art(page, 'mmj-p-101'), a102 = await art(page, 'mmj-p-102');
    const okReplace = a101.title === 'Post 1 — site edit' && /Edited on the site/.test(a101.content) && /data-pic="[0-9a-f]{64}"/.test(a101.content) && !/Post 1 text/.test(a101.content)
      && JSON.stringify(a101.folderIds.slice().sort()) === '["mmj-c-3","mmj-c-5"]' && JSON.stringify(a101.tags) === '["Journey"]'
      && a101.updatedAt === iso('2025-01-15T00:00:00') && a101.fromMmj.modified === '2025-01-15T00:00:00' && a101.fromMmj.u === a101.updatedAt && !a101.fromMmj.newer;
    const okKeep = a102.title === t102 && /MINE/.test(a102.content) && !/Site newer/.test(a102.content) && a102.fromMmj.newer && a102.fromMmj.newer.modified === '2025-01-15T00:00:00' && a102.fromMmj.modified !== '2025-01-15T00:00:00';
    await page.evaluate(() => { selArt('mmj-p-102'); });
    await page.waitForSelector('.mmj-newer', { timeout: 10000 });
    const line = await page.evaluate(() => (document.querySelector('.mmj-newer') || {}).textContent);
    await page.click('.mmj-newer-b');
    await page.waitForFunction(() => /Site newer text 102/.test((document.getElementById('mmj-newer-body') || {}).textContent || ''), null, { timeout: 15000 });
    const stored = (await art(page, 'mmj-p-102')).content;
    await page.evaluate(() => closeModal());
    await page.evaluate(() => { selArt('mmj-p-101'); });
    await page.waitForTimeout(300);
    const no101 = await page.evaluate(() => !document.querySelector('.mmj-newer'));
    r.check(s3 && s3.updated === 1 && s3.kept === 2 /* the edited note + the folder the owner renamed (still differs from the site) */ && okReplace, '109d a post changed on the site replaces an untouched note (title, content, pictures, folders, tags, updatedAt = the site\'s modified time)', JSON.stringify({ s3, a101: { t: a101.title, f: a101.folderIds, u: a101.updatedAt, from: a101.fromMmj } }));
    r.check(okKeep && /newer version/.test(line || '') && /Show it/.test(line || '') && !/Site newer/.test(stored) && no101,
      '109d a note the owner edited is unchanged (only fromMmj.newer), shows the "newer version" line, and Show opens the new text without storing it', JSON.stringify({ okKeep, line, no101 }));

    /* 109e — removed from the site: marked, never deleted; restored → clean */
    const gonePost = S.posts.splice(S.posts.findIndex((p) => p.id === 103), 1)[0], goneCat = S.cats.splice(S.cats.findIndex((c) => c.id === 40), 1)[0];
    const c103 = (await art(page, 'mmj-p-103')).content;
    await setNow(page, '2025-01-20T00:00:00Z');
    const s4 = await run(page);
    const g103 = await art(page, 'mmj-p-103'), g40 = await fol(page, 'mmj-c-40');
    const row = await page.evaluate(() => trNode(DB.folders.find((f) => f.id === 'mmj-c-40'), 0));
    await page.evaluate(() => { selArt('mmj-p-103'); }); await page.waitForTimeout(300);
    const rmLine = await page.evaluate(() => (document.querySelector('.mmj-removed') || {}).textContent);
    r.check(s4 && s4.gone === 2 && g103 && g103.fromMmj.gone === true && g103.content === c103 && g40 && g40.mmj.gone === true && /mmj-gone/.test(row) && /removed from Mapping My Journey/.test(rmLine || ''),
      '109e a post and a category removed from the site are marked (note line, sidebar mark), never deleted', JSON.stringify({ s4, g103: g103 && g103.fromMmj, g40: g40 && g40.mmj, row: row.includes('mmj-gone'), rmLine }));
    S.posts.push(gonePost); S.cats.push(goneCat);
    await setNow(page, '2025-01-22T00:00:00Z');
    const s5 = await run(page);
    const b103 = await art(page, 'mmj-p-103'), b40 = await fol(page, 'mmj-c-40');
    const row2 = await page.evaluate(() => trNode(DB.folders.find((f) => f.id === 'mmj-c-40'), 0));
    r.check(s5 && b103 && !b103.fromMmj.gone && b103.content === c103 && b40 && !b40.mmj.gone && !/mmj-gone/.test(row2) && (await page.evaluate(() => !document.querySelector('.mmj-removed'))),
      '109e when they come back on the site the marks are cleared and nothing else changed', JSON.stringify({ s5, b103: b103 && b103.fromMmj, b40: b40 && b40.mmj }));

    /* 109f — Trash and the tombstones are never undone */
    await page.evaluate(() => { trashArt('mmj-p-104'); trashFolder('mmj-c-38'); });
    const gone0 = await page.evaluate(() => !DB.articles.some((a) => a.id === 'mmj-p-104') && !DB.folders.some((f) => f.id === 'mmj-c-38'));
    Object.assign(S.posts.find((p) => p.id === 104), { title: { rendered: 'Post 4 changed' }, modified_gmt: '2025-01-25T00:00:00' });
    S.cats.find((c) => c.id === 38).name = 'Renamed 38';
    await setNow(page, '2025-01-26T00:00:00Z');
    const s6 = await run(page);
    const back = await page.evaluate(() => ({ a: DB.articles.some((a) => a.id === 'mmj-p-104'), f: DB.folders.some((f) => f.id === 'mmj-c-38'), inTrash: (DB.trash || []).some((t) => t.item && t.item.id === 'mmj-p-104') }));
    r.check(gone0 && s6 && !back.a && !back.f && back.inTrash, '109f a note in Trash and a deleted folder are never brought back, even when the site changed them', JSON.stringify({ gone0, s6, back }));

    /* 109g — sync, both ways, and a second device */
    post = JSON.parse(await page.evaluate(() => JSON.stringify(DB)));
    const sy = await page.evaluate(({ pre, post }) => {
      const clone = (x) => JSON.parse(JSON.stringify(x));
      const skip = new Set(['mmj-p-104', 'mmj-c-38']);
      const out = { staleGetsNew: mergeDB(clone(pre), clone(post)), newGetsStale: mergeDB(clone(post), clone(pre)) };
      const res = {};
      for (const k in out) {
        const d = out[k], bad = [];
        post.folders.filter((f) => f.id.startsWith('mmj-') && !skip.has(f.id)).forEach((f) => { const g = d.folders.find((x) => x.id === f.id); if (!g || JSON.stringify(g) !== JSON.stringify(f)) bad.push(f.id); });
        post.articles.filter((a) => a.id.startsWith('mmj-') && !skip.has(a.id)).forEach((a) => { const g = d.articles.find((x) => x.id === a.id); if (!g || JSON.stringify(g) !== JSON.stringify(a)) bad.push(a.id); });
        res[k] = { bad: bad.slice(0, 5), tomb: (d.tombstones || []).filter((t) => String(t.id).startsWith('mmj-') && !skip.has(t.id)).length };
      }
      return res;
    }, { pre, post });
    r.check(Object.values(sy).every((x) => x.bad.length === 0 && x.tomb === 0), '109g the check\'s changes merged into a stale copy and back (mergeDB both ways) keep every record exactly, no tombstone', JSON.stringify(sy));
    errs.push(...app.errors.filter((e) => !/status of 404/.test(e)));
  } finally { await app.close(); }
}
{
  const app = await openApp({ viewport: { width: 1440, height: 900 }, db: JSON.parse(JSON.stringify(pre)) });
  try {
    const { page, ctx } = app;
    await serveSite(ctx, S);
    await page.waitForTimeout(400);
    await setNow(page, '2025-02-01T00:00:00Z');
    const sB = await run(page);
    const B = await page.evaluate(() => JSON.parse(JSON.stringify({ f: DB.folders, a: DB.articles })));
    const skip = new Set(['mmj-p-102', 'mmj-p-103', 'mmj-c-12', 'mmj-p-104', 'mmj-c-38']), bad = [];
    const nf = (f) => { const c = JSON.parse(JSON.stringify(f)); delete c.updatedAt; return JSON.stringify(c); };
    post.folders.filter((f) => f.id.startsWith('mmj-') && !skip.has(f.id)).forEach((f) => { const g = B.f.find((x) => x.id === f.id); if (!g || nf(g) !== nf(f)) bad.push('f:' + f.id + (g ? ' ' + nf(g).slice(0, 120) + ' vs ' + nf(f).slice(0, 120) : ' missing')); });
    post.articles.filter((a) => a.id.startsWith('mmj-') && !skip.has(a.id)).forEach((a) => { const g = B.a.find((x) => x.id === a.id); if (!g || JSON.stringify(g) !== JSON.stringify(a)) bad.push('a:' + a.id); });
    r.check(sB && bad.length === 0, '109g a second device running the same check produces the same records (names, parents, order, notes, updatedAt, marks)', JSON.stringify({ sB, bad: bad.slice(0, 3) }));
    errs.push(...app.errors.filter((e) => !/status of 404/.test(e)));
  } finally { await app.close(); }
}

/* 109h — the dialog row from the real 🧰 at three sizes; the read-view lines at 390 */
for (const [w, h, touch] of [[390, 844, true], [820, 1180, true], [1440, 900, false]]) {
  const app = await openApp({ viewport: { width: w, height: h }, hasTouch: touch, db: seedDB() });
  try {
    const { page, ctx } = app;
    const seen = await serveSite(ctx, S);
    await page.evaluate(() => {
      DB.sections.push({ id: 'mmj-sec', name: 'Mapping My Journey', order: 99, mmj: { site: 'x' } });
      const now = new Date().toISOString();
      DB.articles.push({ id: 'zz-mmj-line', title: 'A note with the lines', content: '<p>hello</p>', folderIds: ['f1'], tags: [], createdAt: now, updatedAt: now, kind: 'general',
        fromMmj: { id: 5, type: 'post', link: 'https://mappingmyjourney.com/x/', modified: '2025-01-01T00:00:00', newer: { modified: '2025-01-02T00:00:00', link: 'x' }, gone: true } });
    });
    if (w < 640) {
      await page.evaluate(() => { selArt('zz-mmj-line'); if (typeof showPane === 'function') showPane('p3'); });
      await page.waitForSelector('.mmj-newer', { timeout: 10000 });
      await page.waitForTimeout(800);
      const fit = await page.evaluate(() => { const a = document.querySelector('.mmj-newer').getBoundingClientRect(), b = document.querySelector('.mmj-removed').getBoundingClientRect();
        return { aR: Math.round(a.right), bR: Math.round(b.right), a2: Math.round(a.height), doc: document.documentElement.scrollWidth, w: innerWidth }; });
      r.check(fit.aR <= fit.w && fit.bR <= fit.w && fit.doc <= fit.w + 1, `109h@${w} the "newer version" and "removed" lines fit the phone's width (they wrap)`, JSON.stringify(fit));
    }
    await openMenu(page);
    const item = page.locator('.sb-mi', { hasText: 'Mapping My Journey import' });
    if (touch) { const b = await item.boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); } else await item.click();
    await page.waitForSelector('#mmj-modal.open #mmj-know');
    const geo = (sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      return { inView: b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight, onTop: !!hit && (hit === e || e.contains(hit)), h: Math.round(b.height) }; }, sel);
    const gOn = await geo('.mmj-kon'), gNow = await geo('#mmj-know');
    const sheet = await page.evaluate(() => { const b = document.getElementById('mmj-box').getBoundingClientRect(); return { bottom: Math.round(b.bottom), w: Math.round(b.width) }; });
    const lastBefore = await page.evaluate(() => document.getElementById('mmj-klast').textContent);
    const n0 = wp(seen);
    if (touch) { const b = await page.locator('#mmj-know').boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); } else await page.click('#mmj-know');
    await page.waitForSelector('#mmj-ksum', { timeout: 90000 });
    const sumTxt = await page.evaluate(() => document.getElementById('mmj-ksum').textContent);
    const lastAfter = await page.evaluate(() => document.getElementById('mmj-klast').textContent);
    r.check(gOn && gNow && gOn.inView && gOn.onTop && gNow.inView && gNow.onTop && gOn.h >= 44 && gNow.h >= 44 && (w >= 640 || (sheet.bottom === h && sheet.w === w))
      && /not yet/.test(lastBefore) && !/not yet/.test(lastAfter) && wp(seen) > n0 && /^\d+ added, \d+ updated, \d+ kept \(you had changed them\), \d+ marked removed$/.test(sumTxt),
      `109h@${w} the "Keep matching" row is reached from the real 🧰, 44 px and tappable (${w < 640 ? 'bottom sheet' : 'dialog'}); ⟳ Check now checks the site and shows the totals`, JSON.stringify({ gOn, gNow, sheet, lastBefore, lastAfter, sumTxt }));
    errs.push(...app.errors.filter((e) => !/status of 404/.test(e)));
  } finally { await app.close(); }
}
r.check(errs.length === 0, '109i no page errors', errs.slice(0, 3).join(' | '));
process.exit(r.finish() ? 1 : 0);
