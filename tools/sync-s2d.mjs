#!/usr/bin/env node
/* tools/sync-s2d.mjs — v04.95, S2d: existing inline pictures move out of note text (checks 56a–56k).

   Real devices (Chromium contexts) on the fake Firestore of s1-fake.mjs. The pictures are made here, in
   Node (PNG) and in a scratch page (JPEG), so the sha of each is known before any device boots and every
   expectation is derived independently of the app: the expected content of a migrated note is built by
   string surgery in Node, never by calling the app.

   56a  3 inline pictures (1 PNG, 2 JPEG) become 3 references; every other byte is unchanged; the store holds the
        exact bytes; updatedAt is exactly original + 1 ms and survives persist(); the backup equals the original
   56b  sync on: no note changes before its pictures' meta docs exist; uploads refused -> no note changes at all
   56c  I1, the race: B edits offline AFTER the original version while A migrates; B's edit wins on A, B and the cloud
   56d  two devices migrate the same note at once: identical content, and no rewrite loop (0 rec writes in 60 s)
   56e  an edit arrives between "stored + backed up" and "rewritten": abandoned, not overwritten, migrated next pass
   56f  a note open in Pane 3 or in a float window is not touched while open, and is migrated after it closes
   56g  the gate shut (an older build wrote within 48 h): nothing migrates
   56h  budget: the cap stops the pass, the counter is in IndexedDB, the next UTC day resumes
   56i  _premigRestore puts the original content back
   56j  the real v04.94 build (git) receives migrated notes and paints their pictures
   56k  size at the Evernote scale (S2D_MB, default 140): time, peak heap, writes, notebook size, longest task

   `--only=56a,56c` runs just those. Each printed ok/FAIL line becomes one app-check check (block 56). */
import { playwright, serve, seedDB, ROOT } from './harness.mjs';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import zlib from 'node:zlib';
import { makeCloud, addDevice, on, sleep, quiet, check, results, NB } from './s1-fake.mjs';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);

const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];
const T0 = '2026-10-01T00:00:00.000Z';
const T0_PLUS = '2026-10-01T00:00:00.001Z';
const OLD94 = '59c0a5b';   /* the merge of v04.94 (PR #137): the real previous build */

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
let seq = 0;
/* every call makes a DIFFERENT picture (the pixel at 0,0 carries a counter), so no two notes share a sha by accident */
const solid = (r, g, b) => { const n = ++seq; return png(120, 80, (x, y) => (x < 8 && y < 1 ? [n & 255, (n >> 8) & 255, 7] : [r, g, b])); };
const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const P = (buf, mime = 'image/png') => ({ buf, mime, sha: sha256(buf) });
const url = (p) => `data:${p.mime};base64,${p.buf.toString('base64')}`;
const inl = (p, attrs = ' class="ed-img"', tail = ' alt=""') => `<img${attrs} src="${url(p)}"${tail}>`;
/* the content a migration must produce, derived by string surgery */
const expectRef = (html, ps) => { let h = html; for (const p of ps) h = h.split(` src="${url(p)}"`).join(` data-pic="${p.sha}" data-mime="${p.mime}"`); return h; };
function seedWith(notes) {
  const db = seedDB(T0);
  for (const n of notes) db.articles.push({ id: n.id, title: n.title, content: n.html, folderIds: ['f1'], tags: [], createdAt: T0, updatedAt: T0, kind: 'general' });
  return db;
}

const pw = await playwright();
const srv = await serve();
const browser = await pw.chromium.launch();
const dev = (cloud, name, vp, seed, opts) => addDevice(browser, srv.base, cloud, name, { width: vp.w, height: vp.h }, vp.touch, seed, opts);
const touch = (cloud, d, tag) => on(d, (t) => { const a = DB.articles.find((x) => x.id === 'a1'); a.content += '<p>' + t + '</p>'; a.updatedAt = new Date().toISOString(); persist(); flushPendingPush(); }, tag).then(() => sleep(300)).then(() => quiet(cloud, d));
/* one push, then wait for the gate (_s2RefsOk) to open */
async function ready(cloud, d) { await touch(cloud, d, 'first push'); for (let i = 0; i < 80; i++) { if (await on(d, () => _s2RefsOk())) return true; await sleep(250); } return false; }
/* the background pass is stopped so a check decides exactly when a pass runs */
const hush = (d) => on(d, () => { _picMigWant = false; _picMigKick = function () {}; });
const migrate = (d) => on(d, async () => { await _picMigrate(); return JSON.parse(JSON.stringify(_picMig.wait)); });
const note = (d, id) => on(d, (i) => { const a = DB.articles.find((x) => x.id === i); return a ? { c: a.content, u: a.updatedAt } : null; }, id);
const backupOf = (d, key) => on(d, async (k) => { const db = await _premigDB(); return await new Promise((res) => { const r = db.transaction('backup', 'readonly').objectStore('backup').get(k); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); }); }, key);
const backupCount = (d) => on(d, async () => { const db = await _premigDB(); return await new Promise((res) => { const r = db.transaction('backup', 'readonly').objectStore('backup').count(); r.onsuccess = () => res(r.result); r.onerror = () => res(-1); }); });
const storeBytes = (d, sha) => on(d, async (s) => { const b = await _picGet(s); if (!b) return null; return await _picSha(await b.arrayBuffer()); }, sha);
const recOf = (cloud, id) => { const r = cloud.store.get(`${NB}/recs/articles~${id}`); return r && r.j ? JSON.parse(r.j) : null; };
const picDocs = (cloud, from = 0) => cloud.log.slice(from).filter((o) => o.t === 'set' && /\/(pics|picparts)\//.test(o.p));
const recWr = (cloud, from = 0) => cloud.log.slice(from).filter((o) => o.t === 'set' && o.p.startsWith(NB + '/recs/'));
const painted = (page, sel, n) => page.waitForFunction(({ sel, n }) => { const im = [...document.querySelectorAll(sel + ' img[data-pic]')];
  return im.length >= n && im.every((i) => i.complete && i.naturalWidth > 0 && !i.classList.contains('ed-img-missing')); }, { sel, n }, { timeout: 20000 }).then(() => true, () => false);
const closeWins = (d) => on(d, () => { try { cancelEdit(); } catch {} document.querySelectorAll('[id^="fw-"] .fw-close').forEach((b) => b.click()); });
async function poll(fn, ms = 30000, every = 250) { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await sleep(every); } return false; }

try {
  /* JPEGs come from a scratch page's canvas: real, decodable files */
  const scratch = await browser.newPage();
  const jpegs = [];
  for (let i = 0; i < 12; i++) {
    const b64 = await scratch.evaluate((i) => { const c = document.createElement('canvas'); c.width = 96; c.height = 64; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 96, 64); gr.addColorStop(0, `hsl(${i * 29},70%,50%)`); gr.addColorStop(1, `hsl(${i * 29 + 120},70%,30%)`); g.fillStyle = gr; g.fillRect(0, 0, 96, 64); g.fillStyle = '#fff'; g.fillRect(4 + i, 4, 10, 10); return c.toDataURL('image/jpeg', 0.8).split(',')[1]; }, i);
    jpegs.push(P(Buffer.from(b64, 'base64'), 'image/jpeg'));
  }
  await scratch.close();
  let jn = 0; const jpg = () => jpegs[jn++ % jpegs.length];
  const pngP = () => P(solid(200, 60, 60));

  /* ══ 56a / 56i — one note, three inline pictures, sync OFF (the local store is enough) ══ */
  if (want('56a') || want('56i')) {
    const p1 = pngP(), j1 = jpg(), j2 = jpg();
    const html = `<p>Intro <b>bold</b></p>${inl(p1)}<p>between</p><img class="ed-img" style="width:50%;max-width:100%" src="${url(j1)}" alt="photo one"><p>more</p><img width="200" src="${url(j2)}" class="ed-img" alt=""><p>end</p>`;
    const A = await dev(makeCloud(), 'A', VPS[2], seedWith([{ id: 'm1', title: 'Three pictures', html }]));
    await sleep(800);
    await on(A, () => { localStorage.removeItem('siyagah-sync-v1'); _picMigWant = false; _picMigKick = function () {}; });
    const gateOk = await on(A, () => _s2RefsOk());
    const before = await note(A, 'm1');
    const wait = await migrate(A);
    await sleep(1200);
    await on(A, () => { persist(); }); await sleep(600);
    const after = await note(A, 'm1');
    const want_c = expectRef(html, [p1, j1, j2]);
    if (want('56a')) {
      check(before && before.c === html && gateOk === true, '56a the note holds 3 inline pictures and the gate is open (sync off)', JSON.stringify({ gateOk, same: before && before.c === html }));
      const refs = (after.c.match(/data-pic="[0-9a-f]{64}"/g) || []).length;
      check(refs === 3 && !after.c.includes('data:') && !/<img[^>]*\ssrc=/.test(after.c), '56a the content holds 3 references and no data: / src', JSON.stringify({ refs, wait }));
      check(after.c === want_c, '56a every other byte of the content is unchanged (attributes, order, text)', after.c.slice(0, 260));
      const hs = [await storeBytes(A, p1.sha), await storeBytes(A, j1.sha), await storeBytes(A, j2.sha)];
      check(hs[0] === p1.sha && hs[1] === j1.sha && hs[2] === j2.sha && after.c.includes(`data-pic="${p1.sha}"`) && after.c.includes(`data-pic="${j1.sha}"`) && after.c.includes(`data-pic="${j2.sha}"`), '56a the store holds the exact original bytes (sha of the decoded data: = the reference)', JSON.stringify(hs.map((h) => h && h.slice(0, 8))));
      check(after.u === T0_PLUS, '56a updatedAt is exactly the original + 1 ms, and a later persist() did not re-stamp it', JSON.stringify({ before: before.u, after: after.u }));
      const bk = await backupOf(A, 'articles~m1');
      check(!!bk && bk.content === html && bk.updatedAt === T0 && bk.id === 'm1' && bk.coll === 'articles' && !!bk.at, '56a the backup in siyagah-premig-v1 equals the original content', JSON.stringify(bk && { id: bk.id, coll: bk.coll, u: bk.updatedAt, same: bk.content === html }));
      const ls = await on(A, () => Object.keys(localStorage).filter((k) => /premig/i.test(k)));
      check(ls.length === 0, '56a nothing of the backup is in localStorage', JSON.stringify(ls));
      const dg = await on(A, () => _picDiagText());
      check(/moved out of notes: 3 of 3/.test(dg) && /inline pictures in: none/.test(dg), '56a the Pictures line says "moved out of notes: 3 of 3"', dg.slice(-200));
      check(A.errors.length === 0, '56a no page errors', A.errors.slice(0, 2).join(' · '));
    }
    if (want('56i')) {
      const restored = await on(A, async () => await _premigRestore('articles~m1'));
      await sleep(300);
      const r = await note(A, 'm1');
      await on(A, () => { _picMigWant = true; _picMigAt = 0; }); await migrate(A);
      const r2 = await note(A, 'm1');
      check(restored === true && r.c === html && r.u > after.u, '56i _premigRestore puts the original content back with a fresh updatedAt', JSON.stringify({ restored, same: r.c === html, u: r.u }));
      check(r2.c === html, '56i ...and the pass leaves a restored note alone for the rest of the session', '');
      check(await on(A, async () => (await _premigRestore('articles~nope')) === false), '56i an unknown key restores nothing', '');
    }
    await A.ctx.close();
  }

  /* ══ 56b — sync on: nothing changes before the cloud copy is confirmed ══ */
  if (want('56b')) {
    const cloud = makeCloud();
    const ps = { b1: [pngP(), jpg()], b2: [jpg(), pngP()] };
    const htmls = {}; for (const id of Object.keys(ps)) htmls[id] = `<p>${id}</p>${inl(ps[id][0])}<p>x</p>${inl(ps[id][1])}`;
    const seed = seedWith(Object.keys(ps).map((id) => ({ id, title: id, html: htmls[id] })));
    const A = await dev(cloud, 'A', VPS[2], seed);
    const okReady = await ready(cloud, A); await hush(A);
    cloud.refuse.push('/pics/');
    const m = cloud.log.length;
    const w1 = await migrate(A);
    await sleep(800);
    const r1 = [await note(A, 'b1'), await note(A, 'b2')];
    const nb = await backupCount(A);
    const dg = await on(A, () => _picDiagText());
    check(okReady && r1[0].c === htmls.b1 && r1[1].c === htmls.b2 && r1[0].u === T0 && r1[1].u === T0, '56b with picture uploads refused (permission-denied) no note changes at all (text and updatedAt)', JSON.stringify({ okReady, w1 }));
    check(nb === 0 && w1.upload === 4, '56b ...and no backup was written for an unconfirmed note; the 4 pictures wait as "not uploaded"', JSON.stringify({ nb, w1 }));
    check(/4 waiting: not uploaded/.test(dg), '56b the Pictures line names the wait', dg.slice(-260));
    const rc = recOf(cloud, 'b1');
    check(!!rc && rc.content.includes('data:image'), '56b the cloud still holds the inline version', '');
    cloud.refuse.length = 0;
    const m2 = cloud.log.length;
    const w2 = await migrate(A);
    await quiet(cloud, A);
    const r2 = [await note(A, 'b1'), await note(A, 'b2')];
    check(r2[0].c === expectRef(htmls.b1, ps.b1) && r2[1].c === expectRef(htmls.b2, ps.b2) && r2[0].u === T0_PLUS && r2[1].u === T0_PLUS, '56b once the refusal is lifted both notes migrate', JSON.stringify(w2));
    const all = [...ps.b1, ...ps.b2];
    check(all.every((p) => cloud.store.has(`${NB}/pics/${p.sha}`)), '56b every picture has its meta doc in the cloud', '');
    /* the rewritten rec of each note comes AFTER the meta docs of its pictures */
    const seen = cloud.log.map((o, i) => [o, i]).slice(m2);
    const order = Object.keys(ps).every((id) => {
      const lastRec = Math.max(-1, ...seen.filter(([o]) => o.t === 'set' && o.p === `${NB}/recs/articles~${id}`).map(([, i]) => i));
      const metas = ps[id].map((p) => { const f = seen.find(([o]) => o.t === 'set' && o.p === `${NB}/pics/${p.sha}`); return f ? f[1] : Infinity; });
      return lastRec > -1 && metas.every((i) => i < lastRec);
    });
    const rc2 = recOf(cloud, 'b1');
    check(order && !!rc2 && rc2.content === r2[0].c, '56b the note\'s rec in the cloud (references only) was written after the meta docs of its pictures', JSON.stringify({ order, recHasRef: !!rc2 && rc2.content.includes('data-pic') }));
    check(A.errors.length === 0, '56b no page errors', A.errors.slice(0, 2).join(' · '));
    await A.ctx.close();
  }

  /* ══ 56c — I1: an edit made offline after the original version beats the migration ══ */
  if (want('56c')) {
    const cloud = makeCloud();
    const pa = pngP(), pb = jpg(), pe = pngP();
    const html = `<p>Original</p>${inl(pa)}<p>x</p>${inl(pb)}`;
    const seed = seedWith([{ id: 'r1', title: 'Race', html }]);
    const A = await dev(cloud, 'A', VPS[2], seed), B = await dev(cloud, 'B', VPS[2], seed);
    const rA = await ready(cloud, A), rB = await ready(cloud, B);
    await hush(A); await hush(B);
    await B.ctx.setOffline(true); B.offline = true;
    const added = `<p>B-EDIT typed offline</p>${inl(pe)}`;
    await on(B, (h) => { const a = DB.articles.find((x) => x.id === 'r1'); a.content += h; a.updatedAt = new Date().toISOString(); persist(); }, added);
    const bEdit = await note(B, 'r1');
    await migrate(A); await quiet(cloud, A);
    const aMig = await note(A, 'r1');
    check(rA && rB && aMig.c === expectRef(html, [pa, pb]) && aMig.u === T0_PLUS && bEdit.u > aMig.u, '56c A migrated the note (+1 ms) while B held a LATER offline edit', JSON.stringify({ aU: aMig.u, bU: bEdit.u }));
    B.offline = false; await B.ctx.setOffline(false); cloud.reconnect(B);
    await on(B, () => { persist(); flushPendingPush(); });
    const conv = await poll(async () => (await note(A, 'r1')).c === bEdit.c, 40000);
    await quiet(cloud, B); await quiet(cloud, A);
    const fa = await note(A, 'r1'), fb = await note(B, 'r1'), rc = recOf(cloud, 'r1');
    check(conv && fa.c === bEdit.c && fb.c === bEdit.c && !!rc && rc.content === bEdit.c, '56c B\'s edit wins on A, on B and in the cloud (B\'s text, with B\'s inline pictures)', JSON.stringify({ conv, a: fa.c.includes('B-EDIT'), b: fb.c.includes('B-EDIT'), cloud: !!rc && rc.content.includes('B-EDIT') }));
    check(fa.u === bEdit.u && fb.u === bEdit.u && fa.c.includes('data:image') && !fa.c.includes('data-pic'), '56c ...at B\'s updatedAt, and the migration of the older version left nothing in the winning copy', JSON.stringify({ a: fa.u, b: fb.u }));
    /* now B's own pass migrates the winning text, keeping it */
    const gateB = await poll(() => on(B, () => _s2RefsOk()), 30000);
    await migrate(B); await quiet(cloud, B);
    const mb = await note(B, 'r1');
    const wantB = expectRef(bEdit.c, [pa, pb, pe]);
    const conv2 = await poll(async () => (await note(A, 'r1')).c === wantB, 40000);
    const ma = await note(A, 'r1');
    check(gateB && mb.c === wantB && mb.c.includes('B-EDIT typed offline') && mb.u > bEdit.u && !mb.c.includes('data:'), '56c B\'s own pass then migrates it again, keeping B\'s text', JSON.stringify({ gateB, kept: mb.c.includes('B-EDIT'), u: mb.u }));
    check(conv2 && ma.c === wantB && ma.u === mb.u, '56c ...and A receives the migrated version of B\'s text', JSON.stringify({ conv2, au: ma.u, bu: mb.u }));
    check(A.errors.length === 0 && B.errors.length === 0, '56c no page errors', [...A.errors, ...B.errors].slice(0, 2).join(' · '));
    await A.ctx.close(); await B.ctx.close();
  }

  /* ══ 56d — two devices migrate the same note at once: same content, no rewrite loop ══ */
  if (want('56d')) {
    const cloud = makeCloud();
    const pa = pngP(), pb = jpg();
    const html = `<p>Same</p>${inl(pa)}<p>x</p>${inl(pb)}`;
    const seed = seedWith([{ id: 'd1', title: 'Both', html }]);
    const A = await dev(cloud, 'A', VPS[2], seed), B = await dev(cloud, 'B', VPS[2], seed);
    const rA = await ready(cloud, A), rB = await ready(cloud, B);
    await Promise.all([migrate(A), migrate(B)]);
    await quiet(cloud, A); await quiet(cloud, B);
    await sleep(2000); await quiet(cloud, A); await quiet(cloud, B);
    const fa = await note(A, 'd1'), fb = await note(B, 'd1'), rc = recOf(cloud, 'd1'), wantC = expectRef(html, [pa, pb]);
    check(rA && rB && fa.c === wantC && fb.c === wantC && !!rc && rc.content === wantC && fa.u === T0_PLUS && fb.u === T0_PLUS && rc.updatedAt === T0_PLUS, '56d both devices converge on identical content (same shas) and the same updatedAt, A = B = cloud', JSON.stringify({ rA, rB, a: fa.c === wantC, b: fb.c === wantC, cloud: !!rc && rc.content === wantC, u: [fa.u, fb.u] }));
    const m = cloud.log.length;
    await sleep(60000);
    const w = recWr(cloud, m).length, pw2 = picDocs(cloud, m).length;
    check(w === 0, `56d no rewrite loop: ${w} rec writes in the 60 s after convergence (and ${pw2} picture writes)`, JSON.stringify(recWr(cloud, m).map((o) => o.p.slice(NB.length + 6)).slice(0, 5)));
    check(A.errors.length === 0 && B.errors.length === 0, '56d no page errors', [...A.errors, ...B.errors].slice(0, 2).join(' · '));
    await A.ctx.close(); await B.ctx.close();
  }

  /* ══ 56e — an edit arrives between "stored + backed up" and "rewritten" ══ */
  if (want('56e')) {
    const cloud = makeCloud();
    const pa = pngP(), pb = jpg();
    const html = `<p>Hold</p>${inl(pa)}<p>x</p>${inl(pb)}`;
    const A = await dev(cloud, 'A', VPS[2], seedWith([{ id: 'e1', title: 'Held', html }]));
    const rA = await ready(cloud, A); await hush(A);
    let held = false; A.page.on('console', (mm) => { if (mm.text().startsWith('PICMIG_HOLD')) held = true; });
    await on(A, () => { window.__picMigHold = 2500; });
    const run = on(A, async () => { await _picMigrate(); return JSON.parse(JSON.stringify(_picMig.wait)); });
    const sawHold = await poll(async () => held, 20000, 50);
    await on(A, () => { const a = DB.articles.find((x) => x.id === 'e1'); a.content += '<p>EDITED-DURING-HOLD</p>'; a.updatedAt = new Date().toISOString(); persist(); });
    const edited = await note(A, 'e1');
    const w = await run;
    const mid = await note(A, 'e1');
    check(rA && sawHold && w.changed === 2 && mid.c === edited.c && mid.u === edited.u && mid.c.includes('EDITED-DURING-HOLD') && mid.c.includes('data:image') && !mid.c.includes('data-pic'), '56e the edit that arrived mid-way is kept: the note was abandoned (2 pictures wait as "edited meanwhile"), not overwritten', JSON.stringify({ rA, sawHold, w, kept: mid.c.includes('EDITED-DURING-HOLD'), sameU: mid.u === edited.u }));
    await on(A, () => { window.__picMigHold = 0; });
    const w2 = await migrate(A);
    const fin = await note(A, 'e1');
    check(fin.c === expectRef(edited.c, [pa, pb]) && fin.c.includes('EDITED-DURING-HOLD') && fin.u > edited.u, '56e the next pass migrates it, with the edit in it', JSON.stringify({ w2, u: fin.u }));
    const bk = await backupOf(A, 'articles~e1');
    check(!!bk, '56e the abandoned attempt left a backup (harmless: nothing is ever deleted)', '');
    await A.ctx.close();
  }

  /* ══ 56f — a note open in an editor is not touched ══ */
  if (want('56f')) {
    const cloud = makeCloud();
    const ps = { o1: [pngP(), jpg()], o2: [jpg(), pngP()], o3: [pngP()] };
    const htmls = {}; for (const id of Object.keys(ps)) htmls[id] = `<p>${id}</p>` + ps[id].map((p) => inl(p)).join('<p>-</p>');
    const A = await dev(cloud, 'A', VPS[2], seedWith(Object.keys(ps).map((id) => ({ id, title: id, html: htmls[id] }))));
    const rA = await ready(cloud, A); await hush(A);
    await on(A, () => { selArt('o2'); popOutNote('o2'); });
    await sleep(500);
    await on(A, () => { selArt('o1'); startEdit(); });
    await sleep(700);
    const open = await on(A, () => ({ o1: _picMigOpen('o1'), o2: _picMigOpen('o2'), o3: _picMigOpen('o3') }));
    const w = await migrate(A);
    const r = { o1: await note(A, 'o1'), o2: await note(A, 'o2'), o3: await note(A, 'o3') };
    check(rA && open.o1 && open.o2 && !open.o3, '56f the editors are really open (Pane 3 on o1, a float window on o2)', JSON.stringify(open));
    check(r.o1.c === htmls.o1 && r.o2.c === htmls.o2 && r.o1.u === T0 && r.o2.u === T0 && w.open === 4, '56f the notes open in Pane 3 and in a float window are untouched (text and updatedAt); 4 pictures wait as "open"', JSON.stringify(w));
    check(r.o3.c === expectRef(htmls.o3, ps.o3) && r.o3.u === T0_PLUS, '56f ...while the closed note was migrated in the same pass', '');
    await closeWins(A); await sleep(700);
    const closedOk = await on(A, () => !_picMigOpen('o1') && !_picMigOpen('o2'));
    const w2 = await migrate(A);
    const r2 = { o1: await note(A, 'o1'), o2: await note(A, 'o2') };
    check(closedOk && !r2.o1.c.includes('data:image') && !r2.o2.c.includes('data:image') && (r2.o1.c.match(/data-pic=/g) || []).length === 2 && (r2.o2.c.match(/data-pic=/g) || []).length === 2 && r2.o1.c.includes('<p>o1</p>') && r2.o2.c.includes('<p>o2</p>'), '56f after they close, both are migrated', JSON.stringify({ closedOk, w2 }));
    check(A.errors.length === 0, '56f no page errors', A.errors.slice(0, 2).join(' · '));
    await A.ctx.close();
  }

  /* ══ 56g — the gate is shut ══ */
  if (want('56g')) {
    const cloud = makeCloud();
    const pa = pngP();
    const html = `<p>Gate</p>${inl(pa)}`;
    const A = await dev(cloud, 'A', VPS[2], seedWith([{ id: 'g1', title: 'Gate', html }]));
    const rA = await ready(cloud, A); await hush(A);
    const nowIso = new Date().toISOString();
    cloud.apply([{ t: 'set', p: NB + '/recs/articles~old1', d: { c: 'articles', id: 'old1', sig: 'sig-old1', ver: 'v-old1', at: { __sts: 1 }, j: JSON.stringify({ id: 'old1', title: 'From an older build', content: '<p>x</p>', folderIds: ['f1'], tags: [], createdAt: nowIso, updatedAt: nowIso, kind: 'general' }) } }], null);
    const seen = await A.page.waitForFunction(() => _s1Rep && _s1Rep.older > 0, null, { timeout: 20000 }).then(() => true, () => false);
    const gate = await on(A, () => _s2RefsOk());
    const w = await migrate(A);
    const r = await note(A, 'g1');
    const dg = await on(A, () => _picDiagText());
    check(rA && seen && gate === false && r.c === html && r.u === T0 && w.gate === 1 && (await backupCount(A)) === 0 && (await storeBytes(A, pa.sha)) === null, '56g with an older build seen writing, nothing migrates (note, stamp, store and backup all untouched)', JSON.stringify({ seen, gate, w }));
    check(/1 waiting: gate/.test(dg), '56g the Pictures line says "waiting: gate"', dg.slice(-240));
    /* control: the same pass with the clock past 48 h migrates, so the gate was the only blocker */
    await on(A, () => { window.__realNow = _s1Now; _s1Now = () => Date.now() + 49 * 3600000; });
    const g2 = await on(A, () => _s2RefsOk());
    await migrate(A);
    const r2 = await note(A, 'g1');
    check(g2 === true && r2.c === expectRef(html, [pa]), '56g control: 49 h on the gate opens and the same pass migrates the note', JSON.stringify({ g2 }));
    check(A.errors.length === 0, '56g no page errors', A.errors.slice(0, 2).join(' · '));
    await A.ctx.close();
  }

  /* ══ 56h — the daily budget ══ */
  if (want('56h')) {
    const cloud = makeCloud();
    const ps = ['h1', 'h2', 'h3', 'h4'].map((id) => [id, pngP()]);
    const htmls = Object.fromEntries(ps.map(([id, p]) => [id, `<p>${id}</p>${inl(p)}`]));
    const A = await dev(cloud, 'A', VPS[2], seedWith(ps.map(([id]) => ({ id, title: id, html: htmls[id] }))));
    const rA = await ready(cloud, A); await hush(A);
    const m = cloud.log.length;
    await on(A, () => { _PICMIG_CAP = 7; });
    const w = await migrate(A); await quiet(cloud, A);
    const st = await Promise.all(ps.map(([id]) => note(A, id)));
    const migrated = st.filter((n, i) => n.c !== htmls[ps[i][0]]).length;
    const docs = picDocs(cloud, m).length;
    const meta = await on(A, async () => { const db = await _premigDB(); return await new Promise((res) => { const r = db.transaction('meta', 'readonly').objectStore('meta').get('budget'); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); }); });
    const dg = await on(A, () => _picDiagText());
    const ls = await on(A, () => Object.keys(localStorage).filter((k) => /premig|budget/i.test(k)));
    check(rA && migrated === 3 && w.budget === 1 && docs === 6, '56h with the cap at 7 documents the pass stops after 3 notes (6 picture documents); the 4th waits as "budget"', JSON.stringify({ migrated, w, docs }));
    check(!!meta && meta.n === 6 && /^\d{4}-\d\d-\d\d$/.test(meta.day) && ls.length === 0, '56h the day\'s counter is in IndexedDB (siyagah-premig-v1), none in localStorage', JSON.stringify({ meta, ls }));
    check(/1 waiting: budget/.test(dg) && /daily upload budget used \(6 of 7\)/.test(dg), '56h the Pictures line says the budget is used and the pass resumes tomorrow', dg.slice(-300));
    await on(A, () => { window.__realNow = _s1Now; _s1Now = () => Date.now() + 25 * 3600000; });
    const w2 = await migrate(A); await quiet(cloud, A);
    const last = await note(A, 'h4');
    const meta2 = await on(A, async () => { const db = await _premigDB(); return await new Promise((res) => { const r = db.transaction('meta', 'readonly').objectStore('meta').get('budget'); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); }); });
    check(last.c === expectRef(htmls.h4, [ps[3][1]]) && !!meta2 && meta2.n === 2 && meta2.day !== meta.day, '56h on the next UTC day (clock moved) the 4th migrates and the counter restarts (2 documents)', JSON.stringify({ w2, meta2 }));
    check(A.errors.length === 0, '56h no page errors', A.errors.slice(0, 2).join(' · '));
    await A.ctx.close();
  }

  /* ══ 56j — the real v04.94 build receives migrated notes ══ */
  if (want('56j')) {
    let oldSrv = null, why = '';
    try {
      const dir = mkdtempSync(join(tmpdir(), 'siyagah-old94-'));
      for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', OLD94 + ':' + f], { cwd: ROOT, maxBuffer: 1 << 28 })); } catch (e) { if (f === 'index.html') throw e; } }
      oldSrv = await serve(dir);
    } catch (e) { why = String(e.message || e).slice(0, 200); }
    if (!oldSrv) check(false, `56j the v04.94 build could not be read from git (commit ${OLD94})`, why);
    else {
      const cloud = makeCloud();
      const pa = pngP(), pb = jpg();
      const html = `<p>Old build</p>${inl(pa)}<p>x</p>${inl(pb)}`;
      const A = await dev(cloud, 'A', VPS[2], seedWith([{ id: 'j1', title: 'For the old build', html }]));
      const rA = await ready(cloud, A); await hush(A);
      await migrate(A); await quiet(cloud, A);
      const migrated = await note(A, 'j1');
      const D = await addDevice(browser, oldSrv.base, cloud, 'old94', { width: 1440, height: 900 }, false, seedWith([]));
      const ver = await on(D, () => document.querySelector('meta[name=app-version]').content);
      const got = await poll(() => on(D, () => /data-pic=/.test((DB.articles.find((x) => x.id === 'j1') || {}).content || '')), 40000);
      const dc = got ? (await note(D, 'j1')).c : '';
      await on(D, () => { selArt('j1'); });
      const ok = await painted(D.page, '.av-body', 2);
      check(rA && ver === '04.94' && got && dc === migrated.c && migrated.c === expectRef(html, [pa, pb]), '56j the real v04.94 build receives the migrated note (references, same text)', JSON.stringify({ ver, got, same: dc === migrated.c }));
      check(ok, '56j ...and paints both pictures from the cloud copy', '');
      check(D.errors.length === 0, '56j no page errors on the old build', D.errors.slice(0, 2).join(' · '));
      await A.ctx.close(); await D.ctx.close(); await oldSrv.close();
    }
  }

  /* ══ layouts (D5): a migrated note shows its pictures in the read view, Pane 3 and a float window ══ */
  if (want('56l')) {
    for (const vp of VPS) {
      const cloud = makeCloud();
      const pa = pngP(), pb = jpg();
      const html = `<p>Layout</p>${inl(pa)}<p>x</p>${inl(pb)}`;
      const A = await dev(cloud, 'A', vp, seedWith([{ id: 'l1', title: 'Layout', html }]));
      const rA = await ready(cloud, A); await hush(A);
      await migrate(A); await quiet(cloud, A);
      const mig = await note(A, 'l1');
      for (const [label, sel, open] of [
        ['read view', '.av-body', () => { selArt('l1'); }],
        ['Pane 3 editor', '#ed', () => { selArt('l1'); startEdit(); }],
        ['float window', '#fw-ed-l1', () => { selArt('l1'); popOutNote('l1'); }],
      ]) {
        await on(A, open);
        const ok = await painted(A.page, sel, 2);
        const g = await on(A, (sel) => { const root = document.querySelector(sel); if (!root) return null; const rb = root.getBoundingClientRect(); return { n: root.querySelectorAll('img[data-pic]').length, inside: [...root.querySelectorAll('img[data-pic]')].every((i) => { const b = i.getBoundingClientRect(); return b.width > 0 && b.right <= innerWidth + 1 && b.left >= rb.left - 1 && b.right <= rb.right + 1; }), overflow: root.scrollWidth > root.clientWidth + 1 }; }, sel);
        check(rA && mig.c === expectRef(html, [pa, pb]) && ok && g && g.n === 2 && g.inside && !g.overflow, `56l ${vp.name} ${label}: both pictures of the migrated note are painted inside the pane, no horizontal overflow`, JSON.stringify(g));
        await closeWins(A); await sleep(400);
      }
      /* the diagnostics line, opened the way the owner opens it, fits and reads */
      await on(A, () => { openSyncModal(); });
      await sleep(500);
      const dg = await on(A, () => { const rows = [...document.querySelectorAll('table td')]; const td = rows.find((t) => t.textContent === 'Pictures'); const v = td && td.nextElementSibling; if (!v) return null; const vb = v.getBoundingClientRect(), tb = v.closest('table').getBoundingClientRect(); const box = v.closest('div[class*="modal"],div[id*="modal"],.mb') || document.body; return { text: v.textContent.slice(-160), right: Math.round(vb.right), vw: innerWidth, tableRight: Math.round(tb.right), scrollW: document.documentElement.scrollWidth }; });
      check(dg && /moved out of notes: 2 of 2/.test(dg.text) && dg.right <= dg.vw + 1 && dg.scrollW <= dg.vw + 1, `56l ${vp.name} the Pictures line reads "moved out of notes: 2 of 2" and fits the screen`, JSON.stringify(dg));
      check(A.errors.length === 0, `56l ${vp.name} no page errors`, A.errors.slice(0, 2).join(' · '));
      await A.ctx.close();
    }
  }

  /* ══ 56k — size, at the Evernote scale ══ */
  if (want('56k')) {
    const MB = +(process.env.S2D_MB || 140);
    const NOTES = 300, PER = 2, SIZE = Math.floor(MB * 1048576 / (NOTES * PER));
    const cloud = makeCloud();
    const A = await dev(cloud, 'A', VPS[2], seedWith([]));
    const rA = await ready(cloud, A); await hush(A);
    const t0 = Date.now();
    await on(A, async ({ NOTES, PER, SIZE, T0 }) => {
      const gen = (n) => { const u = new Uint8Array(n); for (let o = 0; o < n; o += 65536) crypto.getRandomValues(u.subarray(o, Math.min(n, o + 65536))); return u; };
      const b64 = (u) => { let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); return btoa(s); };
      for (let i = 0; i < NOTES; i++) {
        let h = '<p>Evernote-sized note ' + i + '</p>';
        for (let k = 0; k < PER; k++) h += '<img class="ed-img" src="data:image/jpeg;base64,' + b64(gen(SIZE)) + '" alt=""><p>caption ' + k + '</p>';
        DB.articles.push({ id: 'k' + i, title: 'K' + i, content: h, folderIds: ['f1'], tags: [], createdAt: T0, updatedAt: T0, kind: 'general' });
      }
    }, { NOTES, PER, SIZE, T0 });
    const genMs = Date.now() - t0;
    const sizeBefore = await on(A, () => JSON.stringify(DB).length);
    await on(A, () => {
      window.__lt = []; try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(Math.round(e.duration)))).observe({ entryTypes: ['longtask'] }); } catch (e) {}
      window.__heap = 0; window.__heapT = setInterval(() => { const h = performance.memory && performance.memory.usedJSHeapSize; if (h > window.__heap) window.__heap = h; }, 100);
    });
    const m = cloud.log.length;
    const t1 = Date.now();
    const w = await migrate(A);
    const migMs = Date.now() - t1;
    await quiet(cloud, A, 900000);
    const totalMs = Date.now() - t1;
    const out = await on(A, () => { clearInterval(window.__heapT); const left = DB.articles.filter((a) => /^k\d+$/.test(a.id) && a.content.includes('data:image')).length; const refs = DB.articles.filter((a) => /^k\d+$/.test(a.id)).reduce((s, a) => s + (a.content.match(/data-pic=/g) || []).length, 0); return { left, refs, heapMB: Math.round(window.__heap / 1048576), lt: window.__lt.slice().sort((a, b) => b - a).slice(0, 5), size: JSON.stringify(DB).length, moved: _picMig.moved }; });
    const pdocs = picDocs(cloud, m), rwr = recWr(cloud, m).filter((o) => /articles~k\d+$/.test(o.p));
    const shown = { MB, notes: NOTES, pictures: NOTES * PER, genSec: Math.round(genMs / 100) / 10, migrateSec: Math.round(migMs / 100) / 10, untilQuietSec: Math.round(totalMs / 100) / 10, peakHeapMB: out.heapMB, pictureDocWrites: pdocs.length, pictureMBWritten: Math.round(pdocs.reduce((s, o) => s + o.bytes, 0) / 1048576), recWritesForTheNotes: rwr.length, notebookMBBefore: Math.round(sizeBefore / 1048576 * 10) / 10, notebookMBAfter: Math.round(out.size / 1048576 * 10) / 10, longestTasksMs: out.lt };
    console.log('P56k ' + JSON.stringify(shown));
    check(rA && out.left === 0 && out.refs === NOTES * PER && out.moved === NOTES * PER && Object.values(w).every((v) => v === 0), `56k ${MB} MB, ${NOTES} notes, ${NOTES * PER} pictures: all migrated (${shown.migrateSec} s; notebook ${shown.notebookMBBefore} MB -> ${shown.notebookMBAfter} MB; peak heap ${out.heapMB} MB; ${pdocs.length} picture writes, ${rwr.length} rec writes)`, JSON.stringify({ w, left: out.left, refs: out.refs }));
    const maxLt = out.lt.length ? out.lt[0] : 0;
    check(maxLt <= 200, `56k no main-thread task over 200 ms during the pass (longest ${maxLt} ms; ${out.lt.length ? out.lt.join(', ') : 'none'} observed)`, JSON.stringify(out.lt));
    check(A.errors.length === 0, '56k no page errors', A.errors.slice(0, 2).join(' · '));
    await A.ctx.close();
  }
} catch (e) {
  console.log(' FAIL  sync-s2d threw: ' + (e && e.stack || e));
  results.push({ ok: false, label: 'threw' });
} finally {
  await browser.close();
  await srv.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
