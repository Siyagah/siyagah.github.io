#!/usr/bin/env node
/* tools/enex-s4e.mjs — v05.31, S4e: the Evernote pictures go to the cloud at a smaller size (checks 91a–91g).

   The owner's choice A: at most 2,000 px wide, the full original stays on the computer that imported it. Every scenario runs at 390x844 (touch),
   820x1180 (touch) and 1440x900 (mouse) unless it names a size, against the fake cloud (tools/s1-fake.mjs), through the real dialog. Fixtures are written
   by THIS file: PNGs by a small encoder below (so colour type 2 / 6 are known), JPEGs by a plain Chromium page (Node has no JPEG encoder). Hashes are Node's.

   91a  A imports a 4,000 x 3,000 JPEG, a 1,200 px PNG with alpha, a 600 px JPEG, a 3,000 px PNG with alpha and a screenshot-like PNG: the cloud gets small
        parts (≤ 2,000 px wide, decoded with createImageBitmap here), the 600 px and 1,200 px ones unchanged, the big alpha PNG still PNG with its transparent
        corner; the ORIGINAL sha's meta carries sm and was written after its parts; the ratio for the set is printed
   91b  B (no local copy) shows every picture; its store holds them under the ORIGINAL shas, sm:1 on the shrunk ones, the bytes' sha256 = the meta's sm;
        an export from B inlines the small copy; a full-size arrival replaces the small copy; a corrupted part on C stores nothing and keeps the placeholder
   91c  A keeps the full originals; no note's content / updatedAt changed on A or B (deep-equal), and B's notes equal A's
   91d  enxMediaCloud:'hold' → nothing of the import uploads; a hand-added picture uploads full size, exactly as before (S2b)
   91e  the guard counts the SMALL bytes: a cap just under them writes nothing for that picture; a cap that fits them but not the original lets it through;
        usage/v1 = the bytes in pics/
   91f  no long task over hostLimit(200) while reducing 50 large pictures at 390 x CPU 4 (the worst printed)

   `--only=91a,91d` runs just those (91b/91c ride on 91a's scenario); `--unpatched` serves the app as of the S4e version-bump commit's parent.
   Each printed ok/FAIL line becomes one app-check check. */
import { playwright, serve, seedDB, hostLimit } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, quiet, waitSeeded, check, results, probeInstall, probeRead, NB } from './s1-fake.mjs';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);
if (argv.includes('--fails')) { const o = console.log; let skip = false; console.log = (...x) => { const t = x.join(' '); if (/^\s+ok\s/.test(t)) { skip = true; return; } if (skip && /^\s{6,}\S/.test(t)) { skip = false; return; } skip = false; o(...x); }; }

const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];
function makeBase() {   /* the app as it was just before this round (the commit before the S4e version bump) */
  const dir = mkdtempSync(join(tmpdir(), 'enex-s4e-base-'));
  const sha = execFileSync('git', ['log', '--format=%H', '-n', '1', '--grep=v05.31 S4e: version bump'], { encoding: 'utf8' }).trim();
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', `${sha}~1:${f}`], { encoding: 'buffer', maxBuffer: 1 << 28 })); } catch {} }
  return dir;
}
const pw = await playwright();
const srv = await serve(argv.includes('--unpatched') ? makeBase() : undefined);
const browser = await pw.chromium.launch({ args: ['--js-flags=--max-old-space-size=8192'] });
const TMP = mkdtempSync(join(tmpdir(), 'enex-s4e-'));

/* ── fixtures ── */
const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const md5 = (b) => createHash('md5').update(b).digest('hex');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
let seedN = 12345; const rnd = () => { seedN ^= seedN << 13; seedN ^= seedN >>> 17; seedN ^= seedN << 5; return seedN >>> 0; };
const crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = crcT[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
function makePng(w, h, ct, px) {   /* ct 2 = RGB, 6 = RGBA */
  const bpp = ct === 6 ? 4 : 3, raw = Buffer.alloc(h * (1 + w * bpp)); let o = 0;
  for (let y = 0; y < h; y++) { raw[o++] = 0; for (let x = 0; x < w; x++) { px(x, y, raw, o); o += bpp; } }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = ct;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 3 })), chunk('IEND', Buffer.alloc(0))]);
}
const hole = (x, y) => x < 200 && y < 200;   /* the transparent corner */
const PNG_A1200 = makePng(1200, 700, 6, (x, y, r, o) => { r[o] = (x * 255 / 1200) | 0; r[o + 1] = (y * 255 / 700) | 0; r[o + 2] = 90; r[o + 3] = hole(x, y) ? 0 : 255; });
const PNG_A3000 = makePng(3000, 1500, 6, (x, y, r, o) => { const n = rnd() % 24; r[o] = (x * 255 / 3000 + n) & 255; r[o + 1] = (y * 255 / 1500 + n) & 255; r[o + 2] = ((x + y) * 255 / 4500 + n) & 255; r[o + 3] = hole(x, y) ? 0 : 255; });
const PNG_SHOT = makePng(2200, 1200, 2, (x, y, r, o) => { let v = 245; if (y < 150) { const n = rnd() % 10; r[o] = (x * 255 / 2200 + n) & 255; r[o + 1] = 120 + n; r[o + 2] = 200 - n; return; } if (y % 60 < 40 && x % 300 < 220) v = ((x * 7 + y * 13) % 50 < 25) ? 30 : 200; r[o] = r[o + 1] = r[o + 2] = v; });
const fx = await (await browser.newContext()).newPage();
await fx.goto('about:blank');
const jpegMaker = (w, h, seed, noise) => fx.evaluate(([w, h, seed, noise]) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); const id = x.createImageData(w, h), d = id.data; let s = seed | 1;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; const n = ((s >>> 0) % (2 * noise + 1)) - noise, o = (j * w + i) * 4; d[o] = Math.max(0, Math.min(255, i * 255 / w + n)); d[o + 1] = Math.max(0, Math.min(255, j * 255 / h + n)); d[o + 2] = Math.max(0, Math.min(255, (i + j) * 255 / (w + h) + n)); d[o + 3] = 255; }
  x.putImageData(id, 0, 0);
  return new Promise((r) => c.toBlob(async (b) => { const u = new Uint8Array(await b.arrayBuffer()); let t = ''; for (let i = 0; i < u.length; i += 8192) t += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); r(btoa(t)); }, 'image/jpeg', 0.92));
}, [w, h, seed, noise]).then((b) => Buffer.from(b, 'base64'));
const JPG4000 = await jpegMaker(4000, 3000, 7, 6);
const JPG600 = await jpegMaker(600, 400, 9, 3);
const JPG_HAND = await jpegMaker(3500, 2500, 11, 6);
const JPG_BIG = await jpegMaker(3000, 2000, 13, 6);
const decode = (buf, mime) => fx.evaluate(async ([b, m]) => { const bin = atob(b), u = new Uint8Array(bin.length); for (let i = 0; i < u.length; i++) u[i] = bin.charCodeAt(i); const bm = await createImageBitmap(new Blob([u], { type: m })); const c = new OffscreenCanvas(bm.width, bm.height), x = c.getContext('2d'); x.drawImage(bm, 0, 0); return { w: bm.width, h: bm.height, a: x.getImageData(0, 0, 1, 1).data[3] }; }, [buf.toString('base64'), mime]);

const HEAD = '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE en-export SYSTEM "http://xml.evernote.com/pub/evernote-export4.dtd">\n<en-export export-date="20261014T000000Z" application="Evernote" version="10.0">\n';
const ENML = (inner) => `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd"><en-note>${inner}</en-note>`;
const wrap = (b64) => b64.replace(/(.{76})/g, '$1\n');
function noteXML(n) {
  const res = n.res || [];
  const refs = res.map((r) => `<div><en-media hash="${md5(r.bytes)}" type="${r.mime}"/></div>`).join('');
  const rx = res.map((r) => `<resource><data encoding="base64">\n${wrap(r.bytes.toString('base64'))}\n</data><mime>${r.mime}</mime><resource-attributes><file-name>${esc(r.name)}</file-name></resource-attributes></resource>`).join('\n');
  return `<note>\n<title>${esc(n.title)}</title>\n<created>${n.created}</created>\n<updated>${n.created}</updated>\n<content><![CDATA[${ENML(`<div>Body of ${esc(n.title)}</div>` + refs)}]]></content>\n${rx}\n</note>\n`;
}
const PICS = [   /* name, mime, bytes, whether the app should shrink it */
  { name: 'photo4000.jpg', mime: 'image/jpeg', bytes: JPG4000, shrink: true, jpeg: true },
  { name: 'alpha1200.png', mime: 'image/png', bytes: PNG_A1200, shrink: false },
  { name: 'photo600.jpg', mime: 'image/jpeg', bytes: JPG600, shrink: false },
  { name: 'alpha3000.png', mime: 'image/png', bytes: PNG_A3000, shrink: true, alpha: true },
  { name: 'shot2200.png', mime: 'image/png', bytes: PNG_SHOT, shrink: null },
].map((p) => ({ ...p, sha: sha256(p.bytes) }));
const EXPORT = join(TMP, 'export'); mkdirSync(EXPORT, { recursive: true });
const FILE = join(EXPORT, 'Pics.enex');
writeFileSync(FILE, HEAD + noteXML({ title: 'Pics note', created: '20200103T000000Z', res: PICS }) + '</en-export>\n');
const FILE2 = join(EXPORT, 'Two.enex');
writeFileSync(FILE2, HEAD + noteXML({ title: 'Two note', created: '20200104T000000Z', res: [PICS[0], PICS[2]] }) + '</en-export>\n');
const T0 = '2026-10-01T00:00:00.000Z';
const seed = () => seedDB(T0);

/* ── the harness (as enex-s4c) ── */
const dev = (cloud, name, vp, opts = {}) => addDevice(browser, srv.base, cloud, name, { width: vp.w, height: vp.h }, vp.touch, seed(), opts);
const act = (d, vp, sel) => (vp.touch ? d.page.locator(sel).first().tap() : d.page.locator(sel).first().click());
const actText = (d, vp, sel, text) => (vp.touch ? d.page.locator(sel, { hasText: text }).first().tap() : d.page.locator(sel, { hasText: text }).first().click());
const noErr = (d, tag) => check(d.errors.length === 0, `${tag} no page errors`, d.errors.slice(0, 2).join(' · '));
async function gate(d) {
  const ok = await d.page.waitForFunction(() => _s2RefsOk(), null, { timeout: 20000 }).then(() => true).catch(() => false);
  if (!ok) { console.log('  note  _s2RefsOk() was not true on its own in the fake cloud; the check forces it'); await on(d, () => { window._s2RefsOk = () => true; }); }
}
async function newDev(cl, name, vp, opts = {}) { const d = await dev(cl, name, vp, opts); d.page.setDefaultTimeout(60000); await waitSeeded(cl, d); await gate(d); return d; }
const dlg = async (d, vp) => {
  await act(d, vp, '#sb-tools-btn'); await sleep(300);
  await actText(d, vp, '#sb-tools .sb-mi', 'Evernote import');
  await d.page.waitForSelector('#enx-modal.open #enx-box', { timeout: 5000 });
};
const waitState = (d, states, ms = 240000) => d.page.waitForFunction((s) => !_enx.imp.run && s.includes(_enx.imp.state), states, { timeout: ms });
async function bring(d, vp, what) {
  await dlg(d, vp);
  await d.page.setInputFiles('#enx-files', what); await d.page.waitForSelector('#enx-totals', { timeout: 180000 });
  await act(d, vp, '#enx-bring'); await waitState(d, ['done', 'capped', 'paused']);
}
const poll = async (fn, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await sleep(250); } return false; };
const notes = (d) => on(d, () => DB.articles.filter((a) => a.fromEvernote).map((a) => ({ id: a.id, title: a.title, content: a.content, updatedAt: a.updatedAt })).sort((x, y) => (x.id < y.id ? -1 : 1)));
const picRecs = (d) => on(d, () => new Promise((res) => {
  const rq = indexedDB.open('siyagah-pics-v1');
  rq.onsuccess = () => { const db = rq.result, tx = db.transaction('pics'), st = tx.objectStore('pics'), ks = st.getAllKeys(), vs = st.getAll();
    tx.oncomplete = async () => { const out = []; for (let i = 0; i < vs.result.length; i++) { const v = vs.result[i], buf = new Uint8Array(await v.b.arrayBuffer()), dg = new Uint8Array(await crypto.subtle.digest('SHA-256', buf)); out.push({ key: ks.result[i], sm: v.sm || 0, up: v.up || 0, enx: v.enx || 0, size: buf.length, sha: [...dg].map((x) => x.toString(16).padStart(2, '0')).join('') }); } db.close(); res(out); }; };
  rq.onerror = () => res([]);
}));
const meta = (cl, sha) => cl.store.get(`${NB}/pics/${sha}`);
const cloudBytes = (cl, key, p) => Buffer.concat(Array.from({ length: p }, (_, i) => Buffer.from(cl.store.get(`${NB}/picparts/${key}~${i}`).d.__bytes, 'base64')));
const wroteTo = (cl, frag) => cl.log.filter((o) => o.t === 'set' && o.p.includes(frag));
const openNote = async (d, title) => { await on(d, (t) => { const a = DB.articles.find((x) => x.fromEvernote && x.title === t); ST.folder = a.folderIds[0]; render(); selArt(a.id); }, title); };
const mb = (x) => (x / 1048576).toFixed(2);

try {
  /* ══ 91a / 91b / 91c — the main scenario: A imports, B and C receive ══ */
  if (want('91a') || want('91b') || want('91c')) for (const vp of VPS) {
    const t = `@${vp.name}`; let A = null, B = null, C = null;
    try {
      const cl = makeCloud(); A = await newDev(cl, 'A', vp);
      await bring(A, vp, FILE);
      const aNotes0 = await notes(A);
      const okUp = await poll(() => PICS.every((p) => meta(cl, p.sha)), 90000); await quiet(cl, A);
      check(okUp, `91a${t} all ${PICS.length} pictures reach the cloud`, PICS.map((p) => p.name + ':' + !!meta(cl, p.sha)).join(' '));
      let orig = 0, up = 0;
      for (const p of PICS) {
        const m = meta(cl, p.sha); if (!m) continue;
        const bytes = cloudBytes(cl, m.sm || p.sha, m.p); orig += p.bytes.length; up += bytes.length;
        const info = await decode(bytes, m.t).catch(() => null);
        if (p.shrink === true) {
          check(!!m.sm && m.sm !== p.sha && sha256(bytes) === m.sm && m.n === bytes.length, `91a${t} ${p.name}: the meta of the original sha points (sm) at smaller bytes whose sha256 is sm (${p.bytes.length} → ${bytes.length})`, JSON.stringify({ sm: m.sm, n: m.n }));
          check(info && info.w <= 2000 && info.w === m.w && info.h === m.h && bytes.length < p.bytes.length, `91a${t} ${p.name}: ≤ 2,000 px wide (${info && info.w}x${info && info.h}), meta w/h say so, fewer bytes`, JSON.stringify(info));
          if (p.alpha) check(m.t === 'image/png' && info && info.a === 0, `91a${t} ${p.name}: still a PNG, transparent corner kept (alpha ${info && info.a})`, m.t);
          if (p.jpeg) check(m.t === 'image/jpeg', `91a${t} ${p.name}: a photo goes up as JPEG`);
          check(wroteTo(cl, `picparts/${p.sha}~`).length === 0, `91a${t} ${p.name}: the original's bytes were not uploaded`);
          const pi = Math.max(...cl.log.map((o, i) => (o.t === 'set' && o.p.includes(`picparts/${m.sm}~`) ? i : -1))), mi = cl.log.findIndex((o) => o.t === 'set' && o.p === `${NB}/pics/${p.sha}`);
          check(pi >= 0 && mi > pi, `91a${t} ${p.name}: the pointer (meta) is written after the last part (${pi} < ${mi})`);
        } else if (p.shrink === false) {
          check(!m.sm && bytes.equals(p.bytes) && m.n === p.bytes.length, `91a${t} ${p.name}: ≤ 2,000 px and ≤ 1 MB goes up unchanged, no sm`, JSON.stringify({ sm: m.sm, n: m.n }));
        } else console.log(`  note  91a${t} ${p.name}: ${m.sm ? 'shrunk' : 'unchanged'} (${p.bytes.length} → ${bytes.length})`);
      }
      console.log(`  ratio 91a${t} ${PICS.length} pictures: ${mb(orig)} MB originals → ${mb(up)} MB in the cloud (${(up / orig * 100).toFixed(0)} %)`);
      PICS.filter((p) => p.shrink !== false && meta(cl, p.sha)).forEach((p) => console.log(`  ratio 91a${t}   ${p.name}: ${mb(p.bytes.length)} MB → ${mb(meta(cl, p.sha).n)} MB`));
      const sumN = [...cl.store].filter(([k]) => k.startsWith(NB + '/pics/')).reduce((s, [, v]) => s + v.n, 0);
      check(cl.store.get(NB + '/usage/v1').picBytes === sumN && sumN === up, `91e${t} usage/v1 counts the bytes actually uploaded (${cl.store.get(NB + '/usage/v1').picBytes} = ${up})`);

      /* A keeps the originals */
      const ar = await picRecs(A);
      check(PICS.every((p) => ar.some((r) => r.key === p.sha && r.size === p.bytes.length && r.sha === p.sha && !r.sm && r.up)), `91c${t} A still holds every full-size original under its sha (no sm), marked uploaded`, JSON.stringify(ar.map((r) => [r.key.slice(0, 6), r.size, r.sm, r.up])));
      const aNotes1 = await notes(A);
      check(JSON.stringify(aNotes0) === JSON.stringify(aNotes1) && aNotes1.length === 1, `91c${t} A: the note's content and updatedAt are unchanged by the uploads`);

      /* B */
      B = await newDev(cl, 'B', vp);
      check(await poll(() => on(B, () => DB.articles.some((a) => a.fromEvernote && a.title === 'Pics note')), 60000), `91b${t} B receives the note`);
      const bNotes0 = await notes(B);
      await openNote(B, 'Pics note');
      const shown = await poll(() => on(B, (n) => { const im = [...document.querySelectorAll('#p3 img.ed-img')]; return im.length === n && im.every((i) => (i.getAttribute('src') || '').startsWith('blob:') && i.naturalWidth > 0); }, PICS.length), 90000);
      check(shown, `91b${t} B shows all ${PICS.length} pictures`, await on(B, () => [...document.querySelectorAll('#p3 img.ed-img')].map((i) => (i.getAttribute('src') || '').slice(0, 8) + i.naturalWidth).join(' ')));
      const br = await picRecs(B);
      for (const p of PICS) {
        const m = meta(cl, p.sha), r = br.find((x) => x.key === p.sha);
        if (!r) { check(false, `91b${t} B's store holds ${p.name} under its original sha`); continue; }
        check(r.up === 1 && (m.sm ? (r.sm === 1 && r.sha === m.sm) : (!r.sm && r.sha === p.sha)), `91b${t} B: ${p.name} stored under the ORIGINAL sha, ${m.sm ? 'sm:1, bytes\' sha256 = sm' : 'full bytes'}`, JSON.stringify({ sm: r.sm, up: r.up }));
      }
      const exp = await on(B, async () => { const r = await _picInline(false); return { inlined: r.inlined, missing: r.missing, imgs: (r.text.match(/data:image\/(jpeg|png);base64,/g) || []).length }; });
      check(exp.inlined && exp.missing === 0 && exp.imgs >= PICS.length, `91b${t} an export from B inlines the small copies and loses none (${JSON.stringify(exp)})`);
      const sj = PICS[0];
      await on(B, async (b64) => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < u.length; i++) u[i] = bin.charCodeAt(i); await _picPut(u, 'image/jpeg'); }, sj.bytes.toString('base64'));
      const br2 = (await picRecs(B)).find((x) => x.key === sj.sha);
      check(br2 && br2.size === sj.bytes.length && !br2.sm, `91b${t} a full-size arrival replaces the small copy (${br2 && br2.size}), sm gone`);
      const bNotes1 = await notes(B);
      check(JSON.stringify(bNotes0) === JSON.stringify(bNotes1), `91c${t} B: content and updatedAt unchanged by fetching`);
      check(JSON.stringify(aNotes1) === JSON.stringify(bNotes1), `91c${t} B's note equals A's`);
      noErr(A, `91a${t} A`); noErr(B, `91b${t} B`);

      /* C: a part is corrupted in the cloud */
      const sm0 = meta(cl, sj.sha).sm, key0 = `${NB}/picparts/${sm0}~0`, pt = cl.store.get(key0), raw = Buffer.from(pt.d.__bytes, 'base64'); raw[raw.length >> 1] ^= 0xff; pt.d.__bytes = raw.toString('base64');
      C = await newDev(cl, 'C', vp);
      check(await poll(() => on(C, () => DB.articles.some((a) => a.fromEvernote && a.title === 'Pics note')), 60000), `91b${t} C receives the note`);
      await openNote(C, 'Pics note');
      await poll(() => on(C, (n) => document.querySelectorAll('#p3 img.ed-img:not(.ed-img-missing)').length >= n, PICS.length - 1), 90000);
      await sleep(1500);
      const cr = await picRecs(C), cs = await on(C, (s) => { const i = document.querySelector('#p3 img[data-pic="' + s + '"]'); return { missing: !!i && i.classList.contains('ed-img-missing'), err: (window._picFetchStat.lastErr || {}).message || '' }; }, sj.sha);
      check(!cr.some((r) => r.key === sj.sha) && cs.missing && /check/.test(cs.err), `91b${t} a corrupted part: nothing stored, the placeholder stays ("${cs.err}")`);
      check(PICS.slice(1).every((p) => cr.some((r) => r.key === p.sha)), `91b${t} the other pictures still arrive on C`);
    } catch (e) { check(false, `91a${t} threw: ${String(e && e.message || e).split('\n')[0]}`); }
    finally { for (const d of [A, B, C]) if (d) await d.ctx.close(); }
  }

  /* ══ 91d — 'hold' and the hand-added picture ══ */
  if (want('91d')) for (const vp of VPS) {
    const t = `91d@${vp.name}`; let A = null;
    try {
      const cl = makeCloud(); A = await newDev(cl, 'A', vp);
      await on(A, () => { DB.theme = DB.theme || {}; DB.theme.enxMediaCloud = 'hold'; persist(); });
      await bring(A, vp, FILE2); await quiet(cl, A);
      const picW = () => cl.log.filter((o) => o.t === 'set' && /\/(pics|picparts)\//.test(o.p)).map((o) => o.p.slice(NB.length + 1));
      check(picW().length === 0, `${t} 'hold': nothing of the import's pictures is written to the cloud`, picW().join(' '));
      await on(A, async (b64) => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < u.length; i++) u[i] = bin.charCodeAt(i); await _picPut(u, 'image/jpeg'); persist(); flushPendingPush(); }, JPG_HAND.toString('base64'));
      const hs = sha256(JPG_HAND);
      check(await poll(() => meta(cl, hs), 60000), `${t} a picture added by hand still uploads`);
      await quiet(cl, A);
      const m = meta(cl, hs);
      check(m && !m.sm && m.n === JPG_HAND.length && cloudBytes(cl, hs, m.p).equals(JPG_HAND), `${t} … at full size, under its own sha, no sm (S2b as before: ${m && m.n})`);
      check(!picW().some((p) => p.includes(PICS[0].sha) || p.includes(PICS[2].sha)), `${t} … and the import's two still do not`);
      noErr(A, t);
    } catch (e) { check(false, `${t} threw: ${String(e && e.message || e).split('\n')[0]}`); }
    finally { if (A) await A.ctx.close(); }
  }

  /* ══ 91e — the guard counts the small bytes ══ */
  if (want('91e')) for (const vp of VPS) {
    const t = `91e@${vp.name}`; let A = null;
    try {
      const cl = makeCloud(); A = await newDev(cl, 'A', vp);
      await on(A, () => { window.__picCap = 1; });
      await bring(A, vp, FILE2); await quiet(cl, A);
      const smallN = await on(A, async (s) => { const r = await _picShrink(await _picGet(s)); return r.same ? -1 : r.blob.size; }, PICS[0].sha);
      const j6 = PICS[2].bytes.length;
      check(smallN > 0 && smallN + j6 + 4096 < PICS[0].bytes.length, `${t} (setup) the small copy ${smallN} + the 600 px picture ${j6} fits under the original ${PICS[0].bytes.length}`);
      check(wroteTo(cl, '/pics').length === 0, `${t} cap of 1 byte: nothing written`);
      await on(A, (n) => { window.__picCap = n; persist(); flushPendingPush(); }, smallN - 1);
      check(await poll(() => meta(cl, PICS[2].sha), 40000), `${t} cap just under the small copy: the 600 px picture (which fits) goes up`);
      await sleep(2500); await quiet(cl, A);
      check(!meta(cl, PICS[0].sha) && wroteTo(cl, PICS[0].sha).length === 0 && wroteTo(cl, 'picparts/').every((o) => o.p.includes(PICS[2].sha)), `${t} … the 4,000 px one writes nothing (no part, no meta, no small parts)`);
      await on(A, (n) => { window.__picCap = n; persist(); flushPendingPush(); }, smallN + j6 + 2048);
      check(await poll(() => meta(cl, PICS[0].sha), 40000), `${t} a cap that fits the small copy but not the original lets it through`);
      await quiet(cl, A);
      const m = meta(cl, PICS[0].sha), u = cl.store.get(NB + '/usage/v1').picBytes;
      check(m && m.sm && m.n === smallN && u === smallN + j6, `${t} usage/v1 = the small bytes + the other picture (${u} = ${smallN} + ${j6})`);
      noErr(A, t);
    } catch (e) { check(false, `${t} threw: ${String(e && e.message || e).split('\n')[0]}`); }
    finally { if (A) await A.ctx.close(); }
  }

  /* ══ 91f — no long task while reducing 50 large pictures ══ */
  if (want('91f')) {
    const vp = VPS[0], t = '91f@390 x4', lim = hostLimit(200); let A = null;
    try {
      const cl = makeCloud(); A = await newDev(cl, 'L', vp, { throttle: 4 });
      const shas = await on(A, async (b64) => { const bin = atob(b64), base = new Uint8Array(bin.length); for (let i = 0; i < base.length; i++) base[i] = bin.charCodeAt(i); const out = []; for (let k = 0; k < 50; k++) { const u = new Uint8Array(base.length + 8); u.set(base); for (let j = 0; j < 8; j++) u[base.length + j] = (k * 7 + j) & 255; out.push(await _picPut(u, 'image/jpeg', { enx: true })); } return out; }, JPG_BIG.toString('base64'));
      await d_probe(A);
      const from = await on(A, () => performance.now());
      await on(A, () => { persist(); flushPendingPush(); });
      const ok = await poll(() => shas.every((s) => meta(cl, s)), 600000); await quiet(cl, A);
      const lt = (await on(A, probeRead, from)).sort((a, b) => b.app - a.app), worst = lt[0] || { app: 0, start: 0 };
      console.log(`  long  91f  worst app long task ${worst.app} ms at ${worst.start} ms (page clock), ${lt.length} long tasks over 50 ms; limit ${lim.text}`);
      check(ok && shas.every((s) => meta(cl, s).sm), `${t} all 50 large pictures went up as small copies`, shas.filter((s) => !meta(cl, s) || !meta(cl, s).sm).length + ' not');
      check(worst.app <= lim.ms, `${t} no long task over ${lim.text} ms while reducing 50 pictures (worst ${worst.app} ms, started ${worst.start} ms)`, JSON.stringify(lt.slice(0, 4)));
      await sleep(300); const f2 = await on(A, () => performance.now()); await on(A, () => { setTimeout(() => { const t0 = performance.now(); while (performance.now() - t0 < 160); }, 10); }); await sleep(600);
      const probe = (await on(A, probeRead, f2)).filter((x) => x.dur >= 150);
      check(probe.length >= 1, `${t} (the probe itself) sees a deliberate 160 ms block, so zero long tasks above means zero`, JSON.stringify(probe));
      noErr(A, t);
    } catch (e) { check(false, `${t} threw: ${String(e && e.message || e).split('\n')[0]}`); }
    finally { if (A) await A.ctx.close(); }
  }
} catch (e) {
  console.log(' FAIL  enex-s4e threw: ' + (e && e.stack || e));
  results.push({ ok: false, label: 'threw' });
} finally {
  await browser.close();
  await srv.close();
  try { rmSync(TMP, { recursive: true, force: true }); } catch {}
}
function d_probe(d) { return d.page.evaluate(probeInstall); }
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
