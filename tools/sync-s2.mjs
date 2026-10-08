#!/usr/bin/env node
/* tools/sync-s2.mjs — v04.93, S2b: the cloud copy of pictures (checks 54a–54h) and the build stamp.

   Two or more real devices (Chromium contexts) on the fake Firestore of s1-fake.mjs, which now also
   holds Bytes (`firebase.firestore.Blob`, serialised across the binding as {__bytes: base64}).
   The pictures are made here, in Node, so the sha of each is known before any device boots:
   a note that references a picture can be in the seed of a device that does not hold its bytes.

   54a  upload: pics/{sha} + picparts, every part Bytes <= 900,000, 2.5 MB = 3 parts, meta written LAST
   54b  a device with an empty store shows the picture (read view, editor, float window) at 390/820/1440
   54c  a reference the cloud lacks keeps the placeholder; once uploaded it appears with no reload
   54d  a corrupted part, a missing part: nothing stored, placeholder stays, no wrong picture painted
   54e  a second push writes 0 picture docs; a push with an empty store makes 0 picture reads/writes
   54f  permission-denied on pics: the text still syncs, the sha stays pending, uploads once lifted
   54g  every rec carries `b`; _s2OlderActive() (a rec with no `b`, 31 days on, survives a reload)
   54h  size: 20 pictures of ~1.5 MB (numbers reported, no assertion beyond "all arrive intact")

   `--only=54a,54c` runs just those. Each printed ok/FAIL line becomes one app-check check (block 54). */
import { playwright, serve, seedDB, ROOT } from './harness.mjs';
import { readFileSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import zlib from 'node:zlib';
import { makeCloud, addDevice, reopen, on, sleep, quiet, check, results, NB } from './s1-fake.mjs';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);

const VERSION = /name="app-version" content="([^"]+)"/.exec(readFileSync(ROOT + '/index.html', 'utf8'))[1];
const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];
const T0 = '2026-10-01T00:00:00.000Z';

/* ── pictures, made in Node ── */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'ascii'), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };
function png(w, h, pixel) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { const o = y * (w * 3 + 1); raw[o] = 0; for (let x = 0; x < w; x++) { const p = pixel(x, y); raw[o + 1 + x * 3] = p[0]; raw[o + 2 + x * 3] = p[1]; raw[o + 3 + x * 3] = p[2]; } }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 1 })), chunk('IEND', Buffer.alloc(0))]);
}
const solid = (r, g, b) => png(120, 80, (x, y) => (x < 40 && y < 20 ? [255, 255, 255] : [r, g, b]));
const noisePng = (w, h) => { const rnd = randomBytes(w * h * 3); return png(w, h, (x, y) => { const i = (y * w + x) * 3; return [rnd[i], rnd[i + 1], rnd[i + 2]]; }); };   /* does not compress: ~w*h*3 bytes */
const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const P = (buf, mime = 'image/png') => ({ buf, mime, sha: sha256(buf) });
const ref = (p) => `<img class="ed-img" data-pic="${p.sha}" data-mime="${p.mime}" alt="">`;
function seedWith(notes) {
  const db = seedDB(T0);
  for (const n of notes) db.articles.push({ id: n.id, title: n.title, content: n.html, folderIds: ['f1'], tags: [], createdAt: T0, updatedAt: T0, kind: 'general' });
  return db;
}

const pw = await playwright();
const srv = await serve();
const browser = await pw.chromium.launch();
const dev = (cloud, name, vp, seed, opts) => addDevice(browser, srv.base, cloud, name, { width: vp.w, height: vp.h }, vp.touch, seed, opts);
const putPic = (d, p) => on(d, async ([b64, mime]) => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return await _picPut(new Blob([u], { type: mime }), mime); }, [p.buf.toString('base64'), p.mime]);
const touch = (cloud, d, tag) => on(d, (t) => { const a = DB.articles.find((x) => x.id === 'a1'); a.content += '<p>' + t + '</p>'; a.updatedAt = new Date().toISOString(); persist(); flushPendingPush(); }, tag).then(() => sleep(300)).then(() => quiet(cloud, d));
const waitUp = (d, ms = 60000) => d.page.waitForFunction(() => _picNotUp.size === 0, null, { timeout: ms, polling: 100 }).then(() => true, () => false);
const picIO = (cloud, from, devName) => ({
  writes: cloud.log.slice(from).filter((o) => o.t === 'set' && /\/(pics|picparts)\//.test(o.p)),
  reads: cloud.reads.slice(0).filter((o) => /\/(pics|picparts)\//.test(o.p) && (!devName || o.dev === devName)),
});
const rawLen = (v) => Buffer.from(v.__bytes, 'base64').length;
const partsOf = (cloud, sha) => { const out = []; for (let i = 0; ; i++) { const v = cloud.store.get(`${NB}/picparts/${sha}~${i}`); if (!v) break; out.push(v); } return out; };
const painted = (page, sel, n) => page.waitForFunction(({ sel, n }) => { const im = [...document.querySelectorAll(sel + ' img[data-pic]')];
  return im.length >= n && im.every((i) => i.complete && i.naturalWidth > 0 && !i.classList.contains('ed-img-missing')); }, { sel, n }, { timeout: 20000 }).then(() => true, () => false);
/* measured twice, 150 ms apart, until two readings agree: a phone's pane slides in, and a box measured mid-slide is "outside" */
const geo = async (page, sel) => { let prev = null, g = null; for (let i = 0; i < 20; i++) { g = await geo1(page, sel); const s = JSON.stringify(g); if (s === prev) break; prev = s; await sleep(150); } return g; };
const geo1 = (page, sel) => page.evaluate((sel) => {
  const root = document.querySelector(sel); if (!root) return null; const rb = root.getBoundingClientRect();
  return { imgs: [...root.querySelectorAll('img[data-pic]')].map((i) => { const b = i.getBoundingClientRect();
      return { nw: i.naturalWidth, w: Math.round(b.width), inside: b.left >= rb.left - 1 && b.right <= rb.right + 1 && b.width > 0 && b.right <= innerWidth + 1, src: (i.getAttribute('src') || '').slice(0, 5) }; }),
    overflow: root.scrollWidth > root.clientWidth + 1 };
}, sel);
const storeHas = (d, sha) => on(d, async (s) => { const b = await _picGet(s); if (!b) return null; return (await _picSha(await b.arrayBuffer())) === s; }, sha);
/* polled from Node: waitForFunction does not await a promise a predicate returns */
async function waitStored(d, sha, ms = 60000) { const t = Date.now(); while (Date.now() - t < ms) { if (await on(d, async (s) => !!(await _picGet(s)), sha)) return true; await sleep(40); } return false; }
const content = (d, id) => on(d, (i) => DB.articles.find((a) => a.id === i).content, id);

try {
  /* ══ shared scenario: A holds three pictures, pushes; B devices (empty store) read them ══ */
  const png1 = P(solid(200, 50, 50)), png2 = P(solid(50, 80, 200)), big = P(randomBytes(2500000), 'image/jpeg');
  const cloud1 = makeCloud();
  const notes1 = [{ id: 'p1', title: 'Two pictures', html: `<p>Before</p>${ref(png1)}<p>Middle</p>${ref(png2)}<p>After</p>` }, { id: 'p9', title: 'Big picture', html: `<p>Big</p>${ref(big)}` }];
  const seed1 = seedWith(notes1);
  let A = null;
  if (['54a', '54b', '54e', '54g'].some(want)) {
    A = await dev(cloud1, 'A', VPS[2], seed1);
    await sleep(1500);
    for (const p of [png1, png2, big]) await putPic(A, p);
    const pending = await on(A, () => _picNotUp.size);
    const mark = cloud1.log.length;
    await touch(cloud1, A, 'first push');
    const up = await waitUp(A);
    await quiet(cloud1, A);

    /* 54a */
    if (want('54a')) {
      const sum = [];
      let ok = up && pending === 3;
      for (const p of [png1, png2, big]) {
        const meta = cloud1.store.get(`${NB}/pics/${p.sha}`), parts = partsOf(cloud1, p.sha);
        const want_n = Math.ceil(p.buf.length / 900000);
        const sizes = parts.map((v) => (v.d && typeof v.d.__bytes === 'string') ? rawLen(v.d) : -1);
        const whole = Buffer.concat(parts.map((v) => Buffer.from(v.d.__bytes, 'base64')));
        const good = !!meta && meta.p === want_n && meta.n === p.buf.length && meta.t === p.mime && meta.b === VERSION && !!meta.at && parts.length === want_n && sizes.every((s) => s > 0 && s <= 900000) && sha256(whole) === p.sha;
        sum.push({ sha: p.sha.slice(0, 8), bytes: p.buf.length, parts: parts.length, sizes, meta: meta && { p: meta.p, n: meta.n, b: meta.b } });
        ok = ok && good;
      }
      check(ok, '54a A\'s pictures are in the cloud: pics/{sha} + picparts, every part Bytes <= 900,000, parts rejoin to the sha', JSON.stringify({ up, pending, sum }));
      const bigParts = partsOf(cloud1, big.sha).length;
      check(bigParts === 3, '54a a 2.5 MB picture makes 3 parts', 'parts=' + bigParts);
      const order = cloud1.log.slice(mark).filter((o) => o.t === 'set' && /\/(pics|picparts)\//.test(o.p)).map((o) => o.p.slice(NB.length + 1));
      const orderOk = [png1, png2, big].every((p) => { const mi = order.indexOf('pics/' + p.sha); const idx = order.map((x, i) => x.startsWith('picparts/' + p.sha) ? i : -1).filter((i) => i >= 0); return mi >= 0 && idx.length > 0 && Math.max(...idx) < mi; });
      check(orderOk, '54a for every picture the meta doc is written AFTER its last part', JSON.stringify(order.map((x) => x.replace(/^(pics|picparts)\/([0-9a-f]{6})[0-9a-f]*/, '$1/$2'))));
      const upFlags = await on(A, async () => { const db = await _picDB(); return await new Promise((res) => { const o = {}; const c = db.transaction('pics', 'readonly').objectStore('pics').openCursor(); c.onsuccess = () => { const x = c.result; if (x) { o[x.key.slice(0, 6)] = x.value.up || 0; x.continue(); } else res(o); }; }); });
      check(Object.keys(upFlags).length === 3 && Object.values(upFlags).every((v) => v === 1), '54a the store records carry up:1 (in IndexedDB, not localStorage)', JSON.stringify(upFlags));
      check(A.errors.length === 0, '54a no page errors on A', A.errors.slice(0, 2).join(' · '));
    }

    /* 54e (first half) — A's second push writes nothing for pictures */
    if (want('54e')) {
      const m2 = cloud1.log.length, r2 = cloud1.reads.length;
      await touch(cloud1, A, 'second push'); await sleep(500); await quiet(cloud1, A);
      const wr = cloud1.log.slice(m2).filter((o) => o.t === 'set' && /\/(pics|picparts)\//.test(o.p));
      const rd = cloud1.reads.slice(r2).filter((o) => /\/(pics|picparts)\//.test(o.p));
      const recs = cloud1.log.slice(m2).filter((o) => o.t === 'set' && o.p.startsWith(NB + '/recs/')).length;
      check(wr.length === 0 && rd.length === 0 && recs > 0, '54e a second push from A writes 0 picture docs and reads 0 (the text push itself went out)', JSON.stringify({ picWrites: wr.length, picReads: rd.length, recWrites: recs }));
    }

    /* 54g (first half) — every rec A wrote carries `b` */
    if (want('54g')) {
      const all = [...cloud1.store.entries()].filter(([k]) => k.startsWith(NB + '/recs/'));
      const noB = all.filter(([, v]) => v.b !== VERSION).map(([k]) => k.slice(NB.length + 6));
      check(all.length > 3 && noB.length === 0 && all.some(([k]) => k.endsWith('/_head~0')), `54g every rec A wrote (${all.length}, including _head~0) carries b:'${VERSION}'`, JSON.stringify(noB.slice(0, 5)));
    }

    /* 54b — empty-store devices at three sizes */
    if (want('54b')) {
      for (const vp of VPS) {
        const B = await dev(cloud1, 'B' + vp.name, vp, seed1);
        await sleep(1200);
        const before = await content(B, 'p1');
        const notYet = await on(B, () => _picNotUp.size === 0 && true);
        for (const [label, sel, open] of [
          ['read view', '.av-body', () => { selArt('p1'); }],
          ['Pane 3 editor', '#ed', () => { selArt('p1'); startEdit(); }],
          ['float window', '#fw-ed-p1', () => { selArt('p1'); popOutNote('p1'); }],
        ]) {
          await on(B, open);
          const ok = await painted(B.page, sel, 2);
          const g = await geo(B.page, sel);
          check(ok && g && g.imgs.length === 2 && g.imgs.every((i) => i.nw > 0 && i.inside && i.src === 'blob:') && !g.overflow, `54b ${vp.name} ${label}: both fetched pictures are painted inside the pane, no horizontal overflow`, JSON.stringify(g));
          await on(B, () => { try { cancelEdit(); } catch {} document.querySelectorAll('[id^="fw-"] .fw-close,[id^="fw-"] [title="Close"]').forEach((b) => b.click()); });
        }
        const h1 = await storeHas(B, png1.sha), h2 = await storeHas(B, png2.sha);
        await on(B, () => window.dispatchEvent(new Event('pagehide')));
        await sleep(400);
        const after = await content(B, 'p1');
        check(h1 === true && h2 === true, `54b ${vp.name}: the bytes in B's store hash to their sha`, JSON.stringify({ h1, h2 }));
        check(before === after && !/<img[^>]*\ssrc=/.test(after) && !after.includes('blob:'), `54b ${vp.name}: B's a.content is byte-identical before and after (no src, no blob:)`, after.slice(0, 120));
        check(B.errors.length === 0, `54b ${vp.name}: no page errors`, B.errors.slice(0, 2).join(' · '));
        await B.ctx.close();
      }
    }
  }

  /* ══ 54c — a reference the cloud lacks: placeholder, then the picture once A uploads ══ */
  if (want('54c')) {
    const cloud = makeCloud(), pc = P(solid(30, 150, 80));
    const seed = seedWith([{ id: 'c1', title: 'Late picture', html: `<p>Words</p>${ref(pc)}<p>Tail</p>` }]);
    const A2 = await dev(cloud, 'A', VPS[2], seed), B = await dev(cloud, 'B', VPS[2], seed);
    await sleep(1500);
    await on(B, () => { _PIC_FETCH_BACKOFF = [600, 600, 600]; _PIC_FETCH_GAP = 500; });
    const before = await content(B, 'c1');
    await on(B, () => { selArt('c1'); });
    await sleep(2500);
    const ph = await on(B, () => { const i = document.querySelector('.av-body img[data-pic]'); return i && { missing: i.classList.contains('ed-img-missing'), src: (i.getAttribute('src') || '').slice(0, 15), failed: _picFetchStat.failed }; });
    check(ph && ph.missing && ph.src.startsWith('data:image/svg') && ph.failed >= 1, '54c a reference the cloud lacks shows the placeholder (and the fetch was tried)', JSON.stringify(ph));
    check(B.errors.length === 0, '54c ...with no page error', B.errors.slice(0, 2).join(' · '));
    await putPic(A2, pc);
    await touch(cloud, A2, 'now upload'); await waitUp(A2);
    const ok = await painted(B.page, '.av-body', 1);
    const g = await geo(B.page, '.av-body');
    const noReload = await on(B, () => performance.now() > 5000 || true);
    check(ok && g && g.imgs[0].src === 'blob:' && g.imgs[0].nw > 0, '54c after A uploads, B shows the picture with no reload (by the retry or on reopening)', JSON.stringify(g));
    await on(B, () => { selArt('a1'); selArt('c1'); });
    check((await content(B, 'c1')) === before, '54c a.content is byte-identical', '');
    check(B.errors.length === 0, '54c no page errors after', B.errors.slice(0, 2).join(' · '));
    await A2.ctx.close(); await B.ctx.close();
  }

  /* ══ 54d — a corrupted part; a missing part ══ */
  if (want('54d')) {
    const cloud = makeCloud(), pcor = P(noisePng(600, 600)), pmis = P(noisePng(600, 600));
    const seed = seedWith([{ id: 'd1', title: 'Corrupt', html: `<p>Words</p>${ref(pcor)}` }, { id: 'd2', title: 'Missing part', html: `<p>Words</p>${ref(pmis)}` }]);
    const A2 = await dev(cloud, 'A', VPS[2], seed);
    await sleep(1500);
    await putPic(A2, pcor); await putPic(A2, pmis);
    await touch(cloud, A2, 'upload'); await waitUp(A2); await quiet(cloud, A2);
    const np = partsOf(cloud, pcor.sha).length, np2 = partsOf(cloud, pmis.sha).length;
    /* flip one byte in the middle of part 1 of the first; drop part 1 of the second */
    const k = `${NB}/picparts/${pcor.sha}~1`, v = cloud.store.get(k), u = Buffer.from(v.d.__bytes, 'base64'); u[Math.floor(u.length / 2)] ^= 0xFF; v.d.__bytes = u.toString('base64');
    cloud.store.delete(`${NB}/picparts/${pmis.sha}~1`);
    const B = await dev(cloud, 'B', VPS[2], seed);
    await sleep(1200);
    await on(B, () => { _PIC_FETCH_BACKOFF = [400, 400, 400]; _PIC_FETCH_GAP = 300; });
    const before = [await content(B, 'd1'), await content(B, 'd2')];
    const wrong = [];
    for (const id of ['d1', 'd2']) {
      await on(B, (i) => { selArt(i); }, id);
      for (let t = 0; t < 25; t++) { const s = await on(B, () => [...document.querySelectorAll('img[data-pic]')].map((i) => (i.getAttribute('src') || '').slice(0, 5))); if (s.some((x) => x === 'blob:')) wrong.push(id); await sleep(120); }
      const st = await on(B, () => { const i = document.querySelector('.av-body img[data-pic]'); return i && i.classList.contains('ed-img-missing'); });
      check(st === true, `54d ${id === 'd1' ? 'a corrupted part' : 'a missing part'}: the placeholder stays`, '');
    }
    const stored = [await storeHas(B, pcor.sha), await storeHas(B, pmis.sha)];
    const failed = await on(B, () => _picFetchStat.failed);
    check(np === 2 && np2 === 2 && stored[0] === null && stored[1] === null && wrong.length === 0, '54d nothing is stored on B and no wrong picture is ever painted', JSON.stringify({ partsA: [np, np2], stored, wrong, failed }));
    check(failed >= 2 && (await content(B, 'd1')) === before[0] && (await content(B, 'd2')) === before[1], '54d the fetches were tried and failed; a.content is untouched', 'failed=' + failed);
    check(B.errors.length === 0, '54d no page errors', B.errors.slice(0, 2).join(' · '));
    await A2.ctx.close(); await B.ctx.close();
  }

  /* ══ 54e (second half) — a push with an empty store ══ */
  if (want('54e')) {
    const cloud = makeCloud();
    const E = await dev(cloud, 'E', VPS[2], seedWith([]));
    await sleep(1500);
    const n0 = await on(E, () => _picNotUp.size);
    const m = cloud.log.length, r0 = cloud.reads.length;
    await touch(cloud, E, 'empty-store push'); await sleep(500); await quiet(cloud, E);
    const wr = cloud.log.slice(m).filter((o) => o.t === 'set' && /\/(pics|picparts)\//.test(o.p)).length;
    const rd = cloud.reads.slice(r0).filter((o) => /\/(pics|picparts)\//.test(o.p)).length;
    const cost = await on(E, () => { const t = performance.now(); let r = 1; for (let i = 0; i < 5000; i++) r = _picUploadPending(); return { perCallUs: Math.round((performance.now() - t) / 5000 * 1000 * 100) / 100, ret: r }; });
    check(n0 === 0 && wr === 0 && rd === 0 && cost.ret === null, '54e a push with an empty store makes 0 picture reads and 0 picture writes; _picUploadPending() returns at once (no promise)', JSON.stringify({ pending: n0, wr, rd, cost }));
    check(cost.perCallUs < 20, `54e the empty-store check costs ${cost.perCallUs} µs per push (limit 20)`, '');
    await E.ctx.close();
  }

  /* ══ 54f — permission-denied on pics ══ */
  if (want('54f')) {
    const cloud = makeCloud(), pf = P(solid(160, 60, 160));
    const seed = seedWith([{ id: 'f9', title: 'Refused', html: `<p>Words</p>${ref(pf)}` }]);
    const A2 = await dev(cloud, 'A', VPS[2], seed), B = await dev(cloud, 'B', VPS[2], seed);
    await sleep(1500);
    await on(A2, () => { _PIC_UP_BACKOFF = [500, 500, 500]; });
    await putPic(A2, pf);
    cloud.refuse.push('/pics/');
    await touch(cloud, A2, 'text-while-refused'); await sleep(2500);
    const bGot = await on(B, () => DB.articles.find((x) => x.id === 'a1').content.includes('text-while-refused'));
    const st = await on(A2, () => ({ pending: _picNotUp.size, refused: _picUpStat.refused, pf: _pushFailures, dot: (document.getElementById('sync-dot') || {}).className + ' | ' + (document.getElementById('sync-dot') || {}).title, diag: _picDiagText(), toasts: (window.__toasts || []).filter((t) => /NOT syncing|cannot reach/i.test(t)).length }));
    check(bGot, '54f with pictures refused, A\'s text push still reaches B', '');
    check(st.pending === 1 && st.refused === true && st.pf === 0 && !/err|NOT syncing/i.test(st.dot) && st.toasts === 0, '54f the sha stays pending, no push failure, no "NOT syncing" alarm', JSON.stringify(st));
    check(/permission-denied/.test(st.diag), '54f the refusal is named in the diagnostics line', st.diag);
    cloud.refuse.length = 0;
    await sleep(700);
    await touch(cloud, A2, 'after-lift');
    const up = await waitUp(A2, 20000);
    check(up && cloud.store.has(`${NB}/pics/${pf.sha}`) && (await on(A2, () => _picUpStat.refused)) === null, '54f once the refusal is lifted the picture uploads and the refusal is cleared', 'up=' + up);
    await A2.ctx.close(); await B.ctx.close();
  }

  /* ══ 54g — _s2OlderActive() ══ */
  if (want('54g')) {
    const cloud = makeCloud();
    const A2 = await dev(cloud, 'A', VPS[2], seedWith([])), B = await dev(cloud, 'B', VPS[2], seedWith([]));
    await sleep(1500);
    await touch(cloud, A2, 'stamp'); await sleep(1500); await quiet(cloud, B);
    const base = await on(B, () => ({ older: _s2OlderActive(), rep: _s1Rep && _s1Rep.older, s1: _s1OlderActive() }));
    check(base.older === false && !base.rep, '54g with only v04.93 devices writing, _s2OlderActive() is false', JSON.stringify(base));
    const now = new Date().toISOString();
    cloud.apply([{ t: 'set', p: NB + '/recs/articles~old1', d: { c: 'articles', id: 'old1', sig: 'sig-old1', ver: 'v-old1', at: { __sts: 1 }, j: JSON.stringify({ id: 'old1', title: 'From an older build', content: '<p>x</p>', folderIds: ['f1'], tags: [], createdAt: now, updatedAt: now, kind: 'general' }) } }], null);
    await B.page.waitForFunction(() => _s1Rep && _s1Rep.older > 0, null, { timeout: 15000 }).catch(() => {});
    const seen = await on(B, () => ({ older: _s2OlderActive(), rep: _s1Rep.older }));
    check(seen.older === true && seen.rep > 0, '54g B receives a rec with no `b`: _s2OlderActive() is true', JSON.stringify(seen));
    cloud.apply([{ t: 'set', p: NB + '/recs/articles~old2', d: { c: 'articles', id: 'old2', sig: 'sig-old2', ver: 'v-old2', b: '04.92', at: { __sts: 1 }, j: JSON.stringify({ id: 'old2', title: 'From 04.92', content: '<p>y</p>', folderIds: ['f1'], tags: [], createdAt: now, updatedAt: now, kind: 'general' }) } }], null);
    await B.page.waitForFunction((r) => _s1Rep.older > r, seen.rep, { timeout: 15000 }).catch(() => {});
    const seen2 = await on(B, () => _s1Rep.older);
    check(seen2 > seen.rep, '54g a rec stamped b:04.92 (lower than 04.93) also counts', JSON.stringify({ before: seen.rep, after: seen2 }));
    const idb = await on(B, async () => { const db = await _s1RdDb(); return await new Promise((res) => { const r = db.transaction('meta', 'readonly').objectStore('meta').get('older|nb-s1'); r.onsuccess = () => res(r.result); r.onerror = () => res(null); }); });
    /* the clock first: after a reload the main doc has not been seen yet and _s1OlderActive() says "yes" (nothing seen = be careful) */
    await on(B, () => { window.__realNow = _s1Now; _s1Now = () => Date.now() + 31 * 86400000; });
    const moved = await on(B, () => ({ older: _s2OlderActive(), s1: _s1OlderActive(), rep: _s1Rep.older }));
    check(moved.older === false, '54g with the clock moved 31 days on, _s2OlderActive() is false', JSON.stringify(moved));
    await on(B, () => { _s1Now = window.__realNow; });
    const back = await on(B, () => _s2OlderActive());
    check(back === true, '54g ...and true again with the real clock', 'older=' + back);
    await reopen(B);
    await B.page.waitForFunction(() => _s1Rep && _s1Rep.older > 0, null, { timeout: 15000 }).catch(() => {});
    const reloaded = await on(B, () => ({ rep: _s1Rep && _s1Rep.older }));
    check(idb === seen2 && reloaded.rep === seen2, '54g the "older build seen" time is kept in the replica\'s meta store and survives a reload of B', JSON.stringify({ idb, seen2, reloaded }));
    check(A2.errors.length === 0 && B.errors.length === 0, '54g no page errors', [...A2.errors, ...B.errors].slice(0, 2).join(' · '));
    await A2.ctx.close(); await B.ctx.close();
  }

  /* ══ 54h — size: 20 pictures of ~1.5 MB ══ */
  if (want('54h')) {
    const cloud = makeCloud();
    const pics = Array.from({ length: 20 }, () => P(randomBytes(1500000 + Math.floor(Math.random() * 100000)), 'image/jpeg'));
    const seed = seedWith(pics.map((p, i) => ({ id: 'h' + i, title: 'Size ' + i, html: `<p>Pic ${i}</p>${ref(p)}` })));
    const A2 = await dev(cloud, 'A', VPS[2], seed);
    await sleep(1500);
    for (const p of pics) await putPic(A2, p);
    const m = cloud.log.length;
    const t0 = Date.now();
    await touch(cloud, A2, 'size push');
    const up = await waitUp(A2, 300000);
    const upMs = Date.now() - t0;
    const w = cloud.log.slice(m).filter((o) => o.t === 'set' && /\/(pics|picparts)\//.test(o.p));
    const bytes = w.reduce((s, o) => s + o.bytes, 0);
    console.log('P54h upload ' + JSON.stringify({ pictures: 20, ms: upMs, docWrites: w.length, mbWritten: Math.round(bytes / 1048576 * 10) / 10 }));
    const B = await dev(cloud, 'B', VPS[2], seed);
    await sleep(1500);
    const r0 = cloud.reads.length, t1 = Date.now();
    await on(B, () => { selArt('h0'); });
    const got0 = await waitStored(B, pics[0].sha);
    const fetchMs = Date.now() - t1;
    const rd = cloud.reads.slice(r0).filter((o) => o.dev === 'B' && /\/(pics|picparts)\//.test(o.p)).length;
    console.log('P54h fetch ' + JSON.stringify({ ms: fetchMs, reads: rd }));
    let intact = 0;
    for (let i = 1; i < 20; i++) {   /* h0 is counted with the rest below */
      await on(B, (id) => { selArt(id); }, 'h' + i);
      await waitStored(B, pics[i].sha);
    }
    for (let i = 0; i < 20; i++) if ((await storeHas(B, pics[i].sha)) === true) intact++;
    check(up && w.length === 60 && intact === 20, `54h 20 pictures of ~1.5 MB: uploaded in ${Math.round(upMs / 100) / 10} s with ${w.length} writes; one note opened on B fetched in ${fetchMs} ms with ${rd} reads; all 20 arrived intact`, JSON.stringify({ up, writes: w.length, intact }));
    await A2.ctx.close(); await B.ctx.close();
  }
} catch (e) {
  console.log(' FAIL  sync-s2 threw: ' + (e && e.stack || e));
  results.push({ ok: false, label: 'threw' });
} finally {
  await browser.close();
  await srv.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
