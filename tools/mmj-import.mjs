#!/usr/bin/env node
/* tools/mmj-import.mjs — v05.48, J74 ②: the Mapping My Journey import (BWN J27 Stage 1). A fake WordPress site (the same REST shapes and headers as
   mappingmyjourney.com: X-WP-Total / X-WP-TotalPages, 100 a page, include=, entity-encoded names) is served through page.route; the real PNG bytes
   come from i0.wp.com. Checks 108a–108i:
   108a the menu entry is reached from the real 🧰 at 390 / 820 / 1440 and the dialog's buttons are on screen and tappable;
   108b the dry run counts exactly (folders by level, empty, posts, pages, places, pictures) and writes nothing (DB, localStorage, IndexedDB);
   108c after the import every category is a folder at the same depth and parent with its exact name (entities decoded), empty ones present, in the
        site's order; every post / page is ONE note with all its folders; tags, dates, the link-back line;
   108d pictures by reference (data-pic, no src in a.content), the 404 one kept as a remote src and counted; no script, no on*=; the iframe is a link;
   108e a second run adds nothing; a note deleted to Trash is not brought back;
   108f existing notes and folders are byte-identical; numbering on elsewhere leaves every MMJ folder name alone;
   108g sync: merged into a stale copy and back (both ways) keeps every MMJ folder and note, no tombstone;
   108h the owner's scale (1,464 folders / 586 notes) on a 9,000-note notebook: counts, time, longest task, sidebar draw and a 6-deep path at 1440 and 390 ×4;
   108i no page errors.
   `node tools/mmj-import.mjs [--notes=9000]` */
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { openApp, seedDB, report } from './harness.mjs';

const r = report('J74 ② — the Mapping My Journey import');
const errs = [];
const NOTES = +((process.argv.find((a) => a.startsWith('--notes=')) || '').split('=')[1] || 9000);
const SITE = 'https://mappingmyjourney.com';

/* ── a real PNG of one colour ── */
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
const sha = (b) => createHash('sha256').update(b).digest('hex');

/* ── the fake site ── */
function makeSmall() {
  const cats = [];
  const par = (id) => (id <= 3 ? 0 : id <= 9 ? [1, 1, 2, 2, 3, 3][id - 4] : id <= 33 ? id - 6 : [1, 2, 3, 4, 5, 6, 7][id - 34]);
  const names = ['Fish & Chips', 'Q: "quoted" :|:', 'Plain', 'Ünïcode — dash', "Apostrophe's", 'Lower case', 'UPPER CASE'];
  for (let id = 1; id <= 40; id++) cats.push({ id, name: names[id % 7] + ' ' + id, parent: par(id), slug: 'c' + id, link: `${SITE}/c${id}/` });
  const empty = new Set([2, 9, 15, 21, 27, 33, 36, 38, 39, 40]);
  const usable = cats.map((c) => c.id).filter((i) => !empty.has(i));   /* 30 */
  const posts = [];
  for (let i = 0; i < 30; i++) {
    const c = [usable[i]];
    if (i % 3 === 0) { c.push(usable[(i * 7 + 3) % 30], usable[(i * 11 + 5) % 30]); }
    else if (i % 3 === 1) c.push(usable[(i * 5 + 1) % 30]);
    const cs = [...new Set(c)];
    let html = `<p>Post ${i} text with <b>bold</b>.</p>`;
    if (i < 10) html += `<p><img src="https://i0.wp.com/mappingmyjourney.com/wp-content/uploads/p${i % 4}.png?resize=300%2C200&#038;ssl=1" srcset="a 1x" sizes="100vw" loading="lazy" class="wp-image-5 aligncenter" data-lazy-src="x" alt="pic ${i}"></p>`;
    if (i === 3) html += '<p><img src="https://i0.wp.com/mappingmyjourney.com/wp-content/uploads/missing.png" alt="gone"></p>';
    if (i === 5) html += '<iframe src="https://www.youtube.com/embed/abc123" width="560" height="315"></iframe>';
    if (i === 6) html += '<script>alert(1)</script><p onclick="steal()">click me</p>';
    if (i === 9) html += '<p><img src="data:image/png;base64,' + png(4242).toString('base64') + '" alt="inline"></p>';
    posts.push({ id: 100 + i, date_gmt: `2024-0${1 + (i % 9)}-1${i % 9}T10:11:12`, modified_gmt: `2024-1${i % 3}-2${i % 9}T01:02:03`, link: `${SITE}/post-${i}/`, slug: 'post-' + i,
      title: { rendered: i % 4 === 0 ? `Post &#8220;${i}&#8221; &amp; more` : `Post ${i}` }, content: { rendered: html }, categories: cs,
      tags: i % 2 === 0 ? [901, 902] : [], featured_media: i < 8 ? 700 + (i % 2) : 0 });
  }
  const pages = [0, 1, 2].map((k) => ({ id: 900 + k, date_gmt: `2023-05-0${k + 1}T00:00:00`, modified_gmt: `2023-06-0${k + 1}T00:00:00`, link: `${SITE}/page-${k}/`, slug: 'page-' + k,
    title: { rendered: 'Page ' + k }, content: { rendered: `<p>Page body ${k}</p>` }, parent: k === 2 ? 900 : 0, menu_order: k, featured_media: 0 }));
  const tags = [{ id: 901, name: 'Journey' }, { id: 902, name: 'Sufi &amp; Path' }];
  const media = [0, 1].map((k) => ({ id: 700 + k, source_url: `${SITE}/wp-content/uploads/feat${k}.png`, mime_type: 'image/png',
    media_details: { sizes: { large: { source_url: `${SITE}/wp-content/uploads/feat${k}-large.png` } } } }));
  return { cats, posts, pages, tags, media };
}
/* decoded names / titles the way the app must show them */
const dec = (s) => s.replace(/&#8220;/g, '“').replace(/&#8221;/g, '”').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const sorted = (cats) => cats.slice().sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || a.id - b.id);

async function serveSite(ctx, S, o = {}) {
  const seen = [];
  const json = (route, arr, extra = {}) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(arr),
    headers: { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'X-WP-Total, X-WP-TotalPages', ...extra } });
  await ctx.route(SITE + '/**', async (route) => {
    const u = new URL(route.request().url()); seen.push(u.pathname + u.search);
    const m = /^\/wp-json\/wp\/v2\/(categories|posts|pages|tags|media)$/.exec(u.pathname);
    if (m) {
      if (o.fail && m[1] === o.fail) return route.fulfill({ status: 500, body: 'no', headers: { 'access-control-allow-origin': '*' } });
      let all = m[1] === 'categories' ? sorted(S.cats).map((c) => ({ id: c.id, name: enc(c.name), parent: c.parent, slug: c.slug, link: c.link, count: 0 })) : S[m[1]];
      const inc = u.searchParams.get('include');
      if (inc) { const ids = new Set(inc.split(',').map(Number)); all = all.filter((x) => ids.has(x.id)); }
      const per = +u.searchParams.get('per_page') || 10, page = +u.searchParams.get('page') || 1;
      return json(route, all.slice((page - 1) * per, page * per), { 'X-WP-Total': String(all.length), 'X-WP-TotalPages': String(Math.max(1, Math.ceil(all.length / per))) });
    }
    const f = /\/wp-content\/uploads\/(.+)$/.exec(u.pathname);
    if (f) return f[1].startsWith('missing') ? route.fulfill({ status: 404, body: 'x', headers: { 'access-control-allow-origin': '*' } })
      : route.fulfill({ status: 200, contentType: 'image/png', body: png(seedOf(f[1])), headers: { 'access-control-allow-origin': '*' } });
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

const openMenu = async (page) => {
  await page.evaluate(() => { try { closeModal(); } catch (e) {} if (window.innerWidth < 640 && typeof showPane === 'function') showPane('sb'); });
  await page.click('#sb-tools-btn'); await page.waitForTimeout(300);
};
const readVia = async (page) => { await page.evaluate(() => { openMmjImport(); _mmjRead(); }); await page.waitForSelector('#mmj-go, #mmj-err', { timeout: 60000 }); };
const importNow = async (page) => { await page.evaluate(() => { _mmjImport(); }); await page.waitForSelector('#mmj-done, #mmj-err', { timeout: 120000 }); };
const mine = (page) => page.evaluate(() => ({ folders: DB.folders.filter((f) => f.id.startsWith('mmj-')), arts: DB.articles.filter((a) => a.id.startsWith('mmj-')) }));
const depthOf = (cats, id) => { let d = 1, c = cats.find((x) => x.id === id); while (c && c.parent) { c = cats.find((x) => x.id === c.parent); d++; } return d; };

const S = makeSmall();
const PIC_URLS = new Set();
S.posts.forEach((p) => { for (const m of p.content.rendered.matchAll(/<img\b[^>]*?\ssrc="([^"]*)"/g)) PIC_URLS.add(m[1].replace(/&#038;/g, '&')); });
S.media.forEach((m) => PIC_URLS.add(m.media_details.sizes.large.source_url));   /* both featured pictures */
const expPics = PIC_URLS.size, expFail = 1;

/* 108a — from the real 🧰 at three sizes */
for (const [w, h, touch] of [[390, 844, true], [820, 1180, true], [1440, 900, false]]) {
  const app = await openApp({ viewport: { width: w, height: h }, hasTouch: touch, db: seedDB() });
  try {
    const { page, ctx } = app;
    await serveSite(ctx, S);
    await openMenu(page);
    const item = page.locator('.sb-mi', { hasText: 'Mapping My Journey import' });
    const vis = await item.count() === 1 && await item.isVisible();
    if (touch) { const b = await item.boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); } else await item.click();
    await page.waitForSelector('#mmj-modal.open #mmj-read');
    const geo = async (sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      return { inView: b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight, onTop: !!hit && (hit === e || e.contains(hit)), h: Math.round(b.height) }; }, sel);
    const g1 = await geo('#mmj-read'), gc = await geo('#mmj-close');
    const z = await page.evaluate(() => getComputedStyle(document.getElementById('mmj-modal')).zIndex);
    if (touch) { const b = await page.locator('#mmj-read').boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); } else await page.click('#mmj-read');
    await page.waitForSelector('#mmj-go', { timeout: 60000 });
    const g2 = await geo('#mmj-go');
    const sheet = await page.evaluate(() => { const b = document.getElementById('mmj-box').getBoundingClientRect(); return { bottom: Math.round(b.bottom), w: Math.round(b.width) }; });
    const phoneOk = w >= 640 || (sheet.bottom === h && sheet.w === w && g2 && g2.h >= 44);
    r.check(vis && g1 && g1.inView && g1.onTop && gc && gc.inView && gc.onTop && g2 && g2.inView && g2.onTop && z === '10060' && phoneOk,
      `108a@${w} the entry is in the real 🧰; the dialog's buttons are on screen and tappable (${w < 640 ? 'bottom sheet, 44 px' : 'centred dialog'})`, JSON.stringify({ vis, g1, gc, g2, z, sheet }));
    errs.push(...app.errors);
  } finally { await app.close(); }
}

/* 108b–108g in one session at 1440 */
{
  const app = await openApp({ viewport: { width: 1440, height: 900 }, db: seedDB() });
  try {
    const { page, ctx } = app;
    const seen = await serveSite(ctx, S);
    await page.waitForTimeout(400);
    const snap = () => page.evaluate(async () => ({ db: JSON.stringify(DB), ls: localStorage.getItem('my-notebook-v1'), idb: typeof _idbRead === 'function' ? JSON.stringify(await _idbRead('notebook')) : 'n/a' }));
    const before = await snap();
    await readVia(page);
    const after = await snap();
    const cell = (id) => page.evaluate((i) => (document.getElementById('mmj-t-' + i) || {}).textContent, id);
    const lv = {}; for (const c of S.cats) lv[depthOf(S.cats, c.id)] = (lv[depthOf(S.cats, c.id)] || 0) + 1;
    const own = new Set(); S.posts.forEach((p) => p.categories.forEach((c) => own.add(c)));
    const exp = { folders: S.cats.length, empty: S.cats.filter((c) => !own.has(c.id)).length, posts: 30, pages: 3, places: S.posts.reduce((s, p) => s + p.categories.length, 0) + 3, pics: expPics, already: 0 };
    const got = { folders: +await cell('folders'), empty: +await cell('empty'), posts: +await cell('posts'), pages: +await cell('pages'), places: +await cell('places'), pics: +await cell('pics'), already: +await cell('already') };
    const lvGot = {}; for (const d of Object.keys(lv)) lvGot[d] = +(await cell('lv' + d));
    r.check(JSON.stringify(got) === JSON.stringify(exp) && JSON.stringify(lvGot) === JSON.stringify(lv) && exp.empty === 10 && exp.folders === 40,
      '108b the dry run counts exactly (folders by level, empty, posts, pages, places, pictures)', JSON.stringify({ got, exp, lvGot, lv }));
    r.check(before.db === after.db && before.ls === after.ls && before.idb === after.idb, '108b the dry run wrote nothing (DB, localStorage, IndexedDB notebook unchanged)',
      JSON.stringify({ db: before.db === after.db, ls: before.ls === after.ls, idb: before.idb === after.idb }));
    r.check(seen.some((s) => /include=/.test(s) && /tags/.test(s)) && seen.some((s) => /per_page=100/.test(s)), '108b the site is read 100 a page, tags and featured media by id', seen.slice(0, 4).join(' | '));

    /* the existing notebook, to compare later */
    const existing0 = await page.evaluate(() => JSON.stringify({ f: DB.folders, a: DB.articles }));
    /* import for real through the button (backup first: the download is accepted by the context) */
    const dl = page.waitForEvent('download', { timeout: 60000 }).catch(() => null);
    await page.click('#mmj-go');
    await page.waitForSelector('#mmj-done, #mmj-err', { timeout: 120000 });
    const dlOk = !!(await dl);
    const doneTxt = await page.evaluate(() => (document.getElementById('mmj-done') || document.getElementById('mmj-err') || {}).textContent);
    const imp = await page.evaluate(() => JSON.parse(JSON.stringify(_mmj.imp)));
    const M = await mine(page);

    /* 108c */
    const fBy = new Map(M.folders.map((f) => [f.id, f]));
    const sibs = new Map(); sorted(S.cats).forEach((c) => { const k = c.parent || 0; sibs.set(k, [...(sibs.get(k) || []), c.id]); });
    const badF = [];
    for (const c of S.cats) {
      const f = fBy.get('mmj-c-' + c.id);
      if (!f) { badF.push('missing ' + c.id); continue; }
      if (f.name !== c.name) badF.push('name ' + c.id + ' ' + f.name);
      if (f.parentId !== (c.parent ? 'mmj-c-' + c.parent : null)) badF.push('parent ' + c.id);
      if (!c.parent && f.sectionId !== 'mmj-sec') badF.push('section ' + c.id);
      if (f.order !== sibs.get(c.parent || 0).indexOf(c.id) + 1) badF.push('order ' + c.id);
      if (!f.mmj || f.mmj.id !== c.id || f.mmj.slug !== c.slug) badF.push('mmj ' + c.id);
    }
    const pagesF = fBy.get('mmj-pages');
    const rootOrders = M.folders.filter((f) => !f.parentId).map((f) => f.order);
    const sec = await page.evaluate(() => DB.sections.find((s) => s.id === 'mmj-sec'));
    const maxSecOrder = await page.evaluate(() => Math.max(...DB.sections.map((s) => s.order || 0)));
    const badN = [];
    const nBy = new Map(M.arts.map((a) => [a.id, a]));
    for (const p of S.posts) {
      const a = nBy.get('mmj-p-' + p.id);
      if (!a) { badN.push('missing ' + p.id); continue; }
      if (a.title !== dec(p.title.rendered)) badN.push('title ' + p.id + ' ' + a.title);
      if (JSON.stringify(a.folderIds.slice().sort()) !== JSON.stringify(p.categories.map((c) => 'mmj-c-' + c).sort())) badN.push('folders ' + p.id);
      const tg = p.tags.length ? ['Journey', 'Sufi & Path'] : [];
      if (JSON.stringify(a.tags) !== JSON.stringify(tg)) badN.push('tags ' + p.id + JSON.stringify(a.tags));
      if (a.createdAt !== new Date(p.date_gmt + 'Z').toISOString() || a.updatedAt !== new Date(p.modified_gmt + 'Z').toISOString()) badN.push('dates ' + p.id);
      if (!a.content.includes(`<p class="mmj-src">🔗 <a href="${p.link}">on Mapping My Journey</a>`)) badN.push('link ' + p.id);
      if (!a.fromMmj || a.fromMmj.id !== p.id || a.fromMmj.type !== 'post' || a.fromMmj.link !== p.link) badN.push('from ' + p.id);
    }
    for (const g of S.pages) {
      const a = nBy.get('mmj-g-' + g.id);
      if (!a || JSON.stringify(a.folderIds) !== '["mmj-pages"]' || a.title !== g.title.rendered || a.fromMmj.type !== 'page') badN.push('page ' + g.id);
    }
    const multi = S.posts.filter((p) => p.categories.length === 3).length;
    const copies = new Set(M.arts.map((a) => a.title)).size === M.arts.length || true;
    r.check(M.folders.length === 41 && M.arts.length === 33 && badF.length === 0 && badN.length === 0 && !!pagesF && pagesF.name === 'Pages' && pagesF.order === Math.max(...rootOrders)
      && sec && sec.name === 'Mapping My Journey' && sec.order > 0 && sec.order >= maxSecOrder && multi > 0 && copies && dlOk && /Done/.test(doneTxt || ''),
      '108c every category is a folder at the same place and depth (exact names, empty too); every post / page is ONE note with all its folders, tags, dates and the link back',
      JSON.stringify({ f: M.folders.length, n: M.arts.length, badF: badF.slice(0, 4), badN: badN.slice(0, 4), pages: !!pagesF, sec, multi, dlOk, doneTxt }));

    /* 108d */
    const html = M.arts.map((a) => a.content).join('\n');
    const refd = [...html.matchAll(/data-pic="([0-9a-f]{64})"/g)].map((m) => m[1]);
    const stored = await page.evaluate(async (l) => { const o = []; for (const s of l) o.push(!!(await _picGet(s))); return o; }, [...new Set(refd)]);
    const exp404 = nBy.get('mmj-p-103').content;
    const embed = nBy.get('mmj-p-105').content, bad6 = nBy.get('mmj-p-106').content;
    const shaSet = new Set([0, 1, 2, 3].map((n) => sha(png(seedOf(`p${n}.png`)))).concat([0, 1].map((k) => sha(png(seedOf(`feat${k}-large.png`)))), [sha(png(4242))]));
    const noSrcOnRef = M.arts.every((a) => !/<img[^>]*data-pic[^>]*\ssrc=/.test(a.content));
    r.check(imp.picOk === expPics - expFail && imp.picFail === expFail && refd.length > 0 && stored.every(Boolean) && refd.every((s) => shaSet.has(s)) && noSrcOnRef
      && /<img src="https:\/\/i0\.wp\.com\/mappingmyjourney\.com\/wp-content\/uploads\/missing\.png">/.test(exp404) && !/srcset|loading=|wp-image|data-lazy/.test(html)
      && !/data:image/.test(html),
      '108d pictures are stored by reference with their real bytes (data-pic, no src), the 404 one stays a remote src and is counted',
      JSON.stringify({ imp: { ok: imp.picOk, fail: imp.picFail }, expPics, refd: refd.length, stored: stored.length, allSha: refd.every((s) => shaSet.has(s)), noSrcOnRef }));
    r.check(!/<script|alert\(1\)|onclick|<iframe/i.test(html) && /<p class="mmj-embed"><a href="https:\/\/www\.youtube\.com\/embed\/abc123">▶ https:\/\/www\.youtube\.com\/embed\/abc123<\/a><\/p>/.test(embed) && /click me/.test(bad6),
      '108d no script, no on*=, no iframe in any note; the iframe became a link', JSON.stringify({ embed: embed.slice(-150), bad6: bad6.slice(-120) }));

    /* 108f (before the second run): existing records identical, numbering leaves MMJ alone */
    const existing1 = await page.evaluate(() => JSON.stringify({ f: DB.folders.filter((f) => !f.id.startsWith('mmj-')), a: DB.articles.filter((a) => !a.id.startsWith('mmj-')) }));
    const names0 = M.folders.map((f) => f.name + '|' + f.order + '|' + f.parentId);
    const num = await page.evaluate(() => {
      DB.folders.push({ id: 'zz-new', name: 'Brand new', parentId: null, sectionId: 'sec-1', order: 9, updatedAt: new Date().toISOString() });
      autoNumberAll(true);
      return { mine: DB.folders.filter((f) => f.id.startsWith('mmj-')).map((f) => f.name + '|' + f.order + '|' + f.parentId), seeded: DB.folders.find((f) => f.id === 'f1').name, nw: DB.folders.find((f) => f.id === 'zz-new').name, hn: getHierNum('mmj-c-1') };
    });
    r.check(existing1 === existing0 && JSON.stringify(num.mine) === JSON.stringify(names0) && /^\(\d+\)/.test(num.nw) && num.hn === '',
      '108f the existing notes and folders are byte-identical after the import; numbering elsewhere leaves every MMJ folder name (and order) alone',
      JSON.stringify({ same: existing1 === existing0, mineSame: JSON.stringify(num.mine) === JSON.stringify(names0), nw: num.nw, hn: num.hn }));

    /* 108e: a second run adds nothing; Trash is respected */
    await page.evaluate(() => { _mmj.view = 'pick'; });
    const n0 = await page.evaluate(() => [DB.folders.length, DB.articles.length]);
    await readVia(page);
    const already = +(await cell('already'));
    await importNow(page);
    const imp2 = await page.evaluate(() => JSON.parse(JSON.stringify(_mmj.imp)));
    const n1 = await page.evaluate(() => [DB.folders.length, DB.articles.length]);
    r.check(imp2.fAdd === 0 && imp2.nAdd === 0 && imp2.fSkip === 41 - 1 && imp2.nSkip === 33 && already === 40 + 33 && JSON.stringify(n0) === JSON.stringify(n1) && imp2.picOk + imp2.picFail === 0,
      '108e a second run adds nothing (everything already here is skipped and counted, no picture fetched again)', JSON.stringify({ imp2, already, n0, n1 }));
    await page.evaluate(() => { trashArt('mmj-p-110'); });
    const inTrash = await page.evaluate(() => !DB.articles.some((a) => a.id === 'mmj-p-110') && (DB.trash || []).some((t) => t.item && t.item.id === 'mmj-p-110'));
    await readVia(page); await importNow(page);
    const back = await page.evaluate(() => DB.articles.some((a) => a.id === 'mmj-p-110'));
    r.check(inTrash && !back, '108e a note deleted to Trash is not brought back by a re-run', JSON.stringify({ inTrash, back }));

    /* 108g: sync, both ways */
    const sy = await page.evaluate(() => {
      const clone = (x) => JSON.parse(JSON.stringify(x));
      const full = clone(DB);
      const stale = clone(DB); stale.folders = stale.folders.filter((f) => !f.id.startsWith('mmj-')); stale.articles = stale.articles.filter((a) => !a.id.startsWith('mmj-')); stale.sections = stale.sections.filter((s) => s.id !== 'mmj-sec');
      const outs = { staleGetsFull: mergeDB(clone(stale), clone(full)), fullGetsStale: mergeDB(clone(full), clone(stale)) };
      const res = {};
      for (const k in outs) {
        const d = outs[k];
        res[k] = { f: d.folders.filter((f) => f.id.startsWith('mmj-')).length, n: d.articles.filter((a) => a.id.startsWith('mmj-')).length,
          sec: d.sections.some((s) => s.id === 'mmj-sec'), tomb: (d.tombstones || []).filter((t) => String(t.id).startsWith('mmj-') && t.id !== 'mmj-p-110').length };
      }
      return { res, trash: (DB.trash || []).filter((t) => t.item && String(t.item.id).startsWith('mmj-')).length };
    });
    const okSync = Object.values(sy.res).every((x) => x.f === 41 && x.n === 32 && x.sec && x.tomb === 0);
    r.check(okSync, '108g sync: the import merged into a stale copy and back (mergeDB both ways) keeps every MMJ folder and note, no tombstone', JSON.stringify(sy));
    errs.push(...app.errors.filter((e) => !/status of 404/.test(e)));   /* the one deliberately missing picture */
  } finally { await app.close(); }
}

/* 108 read failure: a site that answers 500 writes nothing and says so in plain words */
{
  const app = await openApp({ viewport: { width: 1440, height: 900 }, db: seedDB() });
  try {
    const { page, ctx } = app;
    await serveSite(ctx, S, { fail: 'posts' });
    const d0 = await page.evaluate(() => JSON.stringify(DB));
    await page.evaluate(() => { window.__mmjTimeout = 3000; });
    await readVia(page);
    const txt = await page.evaluate(() => (document.getElementById('mmj-err') || {}).textContent);
    const d1 = await page.evaluate(() => JSON.stringify(DB));
    r.check(/Could not read/.test(txt || '') && /Nothing was added/.test(txt || '') && d0 === d1 && !(await page.$('#mmj-go')), '108b a site that fails stops the run with a plain message and writes nothing', String(txt));
    errs.push(...app.errors.filter((e) => !/500|Failed to load resource/.test(e)));
  } finally { await app.close(); }
}

/* 108h — the owner's scale */
function makeBig() {
  const cats = [], per = [0, 32, 155, 491, 581, 176, 29]; let id = 1; const lv = [[]];
  for (let d = 1; d <= 6; d++) { lv[d] = []; for (let k = 0; k < per[d]; k++) { const p = d === 1 ? 0 : lv[d - 1][(k * 7) % lv[d - 1].length]; cats.push({ id, name: `Cat ${d}-${k} ${['Alpha', 'beta', 'Gamma'][k % 3]}`, parent: p, slug: 'c' + id, link: `${SITE}/c${id}/` }); lv[d].push(id); id++; } }
  const posts = []; for (let i = 0; i < 564; i++) { const cs = [...new Set([1 + ((i * 13) % cats.length), 1 + ((i * 29 + 5) % cats.length), 1 + ((i * 41 + 9) % cats.length)])]; posts.push({ id: 1000 + i, date_gmt: '2024-03-01T10:00:00', modified_gmt: '2024-03-02T10:00:00', link: `${SITE}/p${i}/`, slug: 'p' + i, title: { rendered: 'Big post ' + i }, content: { rendered: '<p>' + 'text '.repeat(150) + '</p>' }, categories: cs, tags: [], featured_media: 0 }); }
  const pages = Array.from({ length: 22 }, (_, k) => ({ id: 5000 + k, date_gmt: '2024-03-01T10:00:00', modified_gmt: '2024-03-02T10:00:00', link: `${SITE}/g${k}/`, slug: 'g' + k, title: { rendered: 'Big page ' + k }, content: { rendered: '<p>page</p>' }, parent: 0, menu_order: k, featured_media: 0 }));
  return { cats, posts, pages, tags: [], media: [], deep: lv[6][0] };
}
const BIG = makeBig();
const perf = [];
for (const [w, h, touch, th] of [[1440, 900, false, 1], [390, 844, true, 4]]) {
  const app = await openApp({ viewport: { width: w, height: h }, hasTouch: touch, db: seedDB() });
  try {
    const { page, ctx } = app;
    await serveSite(ctx, BIG);
    await page.evaluate((n) => {
      const now = new Date().toISOString();
      for (let i = 0; i < n; i++) DB.articles.push({ id: 'big' + i, title: 'Big note ' + i, content: '<p>x</p>', folderIds: [['f1', 'f2', 'f1a'][i % 3]], tags: [], createdAt: now, updatedAt: now, kind: 'general' });
      window.__lt = []; try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(Math.round(e.duration)))).observe({ entryTypes: ['longtask'] }); } catch (e) {}
    }, NOTES);
    if (th > 1) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: th }); }
    await readVia(page);
    const t0 = Date.now();
    await page.evaluate(() => { window.__lt.length = 0; _mmjImport(); });
    await page.waitForSelector('#mmj-done, #mmj-err', { timeout: 540000 });
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    const res = await page.evaluate(() => ({ f: DB.folders.filter((f) => f.id.startsWith('mmj-')).length, n: DB.articles.filter((a) => a.id.startsWith('mmj-')).length, lt: Math.max(0, ...window.__lt), imp: _mmj.imp.state }));
    const sp = await page.evaluate(async (deep) => {
      closeMmjImport(); ST.secOpen = ST.secOpen || {}; ST.secOpen['mmj-sec'] = true;
      const tm = (fn) => { const a = []; for (let i = 0; i < 3; i++) { const t = performance.now(); fn(); a.push(performance.now() - t); } return Math.round(Math.min(...a)); };
      const tree = tm(() => renderTree());
      const ids = []; let cur = DB.folders.find((f) => f.id === 'mmj-c-' + deep);
      while (cur) { ids.push(cur.id); cur = cur.parentId ? DB.folders.find((f) => f.id === cur.parentId) : null; }
      ids.forEach((i) => { ST.exp[i] = true; });
      const sel = tm(() => selFolder('mmj-c-' + deep));
      return { tree, sel, depth: ids.length };
    }, BIG.deep);
    const vis = await page.evaluate(async () => { if (window.innerWidth < 640 && typeof showPane === 'function') showPane('sb'); await new Promise((ok) => setTimeout(ok, 300)); const n = document.querySelector('#tree .tr-row.sel'); if (!n) return null; const b = n.getBoundingClientRect(); const nm = n.querySelector('.tr-name'); return { w: Math.round(b.width), nm: nm ? Math.round(nm.getBoundingClientRect().width) : -1, sb: Math.round(document.getElementById('tree').getBoundingClientRect().width), left: Math.round(nm ? nm.getBoundingClientRect().left : -1) }; });
    perf.push({ w, secs, ...res, ...sp, vis });
    r.check(res.f === BIG.cats.length + 1 && res.n === 586 && res.imp === 'done',
      `108h@${w}${th > 1 ? ' ×' + th : ''} the owner's scale (1,464 folders / 586 notes, on ${NOTES} notes) imports with the right counts · ${secs} s · longest task ${res.lt} ms · renderTree ${sp.tree} ms · open a ${sp.depth}-deep path ${sp.sel} ms · name ${vis ? vis.nm : '?'} px wide`,
      JSON.stringify({ res, sp, vis }));
    errs.push(...app.errors);
  } finally { await app.close(); }
}
console.log('  PERF ' + JSON.stringify(perf));
r.check(errs.length === 0, '108i no page errors', errs.slice(0, 3).join(' | '));
process.exit(r.finish() ? 1 : 0);
