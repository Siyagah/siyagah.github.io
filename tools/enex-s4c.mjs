#!/usr/bin/env node
/* tools/enex-s4c.mjs — v05.27, S4c: the Evernote pictures, audio and files, and the cloud space guard (checks 87a–87j).

   Every check runs at 390x844 (touch), 820x1180 (touch) and 1440x900 (mouse) unless it names a size, against a booted app that is connected to
   the fake cloud (tools/s1-fake.mjs), through the real dialog (🧰 → 📥 Evernote import → files → Bring them in). Fixtures are WRITTEN BY THIS FILE
   into a temp dir, with real bytes (a PNG, a JPEG-signature file, a WAV, a PDF) whose md5 / sha256 are computed here, in Node, and so are independent
   of the app's own md5 and sha. Test hooks the app honours: window.__enxCap, window.__enxNow, window.__enxDelay (as S4b), window.__picCap (the cloud
   picture cap, bytes).

   87a  the md5 is Node's md5 at every length around a block edge; the scanner with {data:true} gives the same md5 and the same bytes; without the
        option there is no blob and every count is as before
   87b  the import: pictures → img.ed-img[data-pic] (bytes in siyagah-pics-v1 verify by sha256, marked enx:1), audio and a PDF → .enx-file chips with
        the bytes in siyagah-files-v1; a.content holds no data: and no blob:; the dialog says "N of M pictures"
   87c  a note an earlier (S4b) run made, a trashed one: only the markers change, updatedAt = old + 1 ms, an open note is left, a second run changes nothing
   87d  _s2RefsOk() false: pictures wait (markers stay, the result says why, no data:); files still come in; the next run finishes it
   87e  the cloud holds the import's pictures back; a hand-added picture still uploads; after enxMediaCloud they go, and usage/v1 equals the bytes in pics/
   87f  the guard: over the cap nothing is written, not retried, the Sync panel shows the figure, no toast; a raised cap lets it through
   87g  on screen: the picture shows, the audio chip plays an <audio> with a blob: src made at display time (none in a.content), a second tap removes it,
        the chip fits the phone; a device that lacks the bytes says "kept on the computer that imported it"
   87h  resume: the page closed mid-media, reopened, Continue: every marker replaced, nothing doubled
   87i  memory: a 2,000-note / 300-picture / ~150 MB export (1440): heap growth printed and bounded
   87j  no long task over hostLimit(200) in the media step at 390 x CPU 4 (the worst and its start time printed)

   `--only=87a,87c` runs just those; `--unpatched` serves the app as of the S4c version-bump commit's parent; `--big=N` sets 87i's pictures (300).
   Each printed ok/FAIL line becomes one app-check check. */
import { playwright, serve, seedDB, hostLimit } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, quiet, waitSeeded, check, results, boot, probeInstall, probeRead, NB } from './s1-fake.mjs';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, createWriteStream } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);
const BIGPICS = +((argv.find((a) => a.startsWith('--big=')) || '').slice(6)) || 300;
if (argv.includes('--fails')) { const o = console.log; let skip = false; console.log = (...x) => { const t = x.join(' '); if (/^\s+ok\s/.test(t)) { skip = true; return; } if (skip && /^\s{6,}\S/.test(t)) { skip = false; return; } skip = false; o(...x); }; }

const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];
function makeBase() {   /* the app as it was just before this round (the commit before the S4c version bump) */
  const dir = mkdtempSync(join(tmpdir(), 'enex-s4c-base-'));
  const sha = execFileSync('git', ['log', '--format=%H', '-n', '1', '--grep=v05.27 S4c: version bump'], { encoding: 'utf8' }).trim();
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', `${sha}~1:${f}`], { encoding: 'buffer', maxBuffer: 1 << 28 })); } catch {} }
  return dir;
}
const pw = await playwright();
const srv = await serve(argv.includes('--unpatched') ? makeBase() : undefined);
const browser = await pw.chromium.launch({ args: ['--js-flags=--max-old-space-size=8192'] });
const TMP = mkdtempSync(join(tmpdir(), 'enex-s4c-'));

/* ── fixtures ── */
const md5 = (b) => createHash('md5').update(b).digest('hex');
const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const withTail = (sig, n, seed) => Buffer.concat([sig, Buffer.from(Array.from({ length: n }, (_, i) => (i * 31 + seed) & 255))]);
const JPG = withTail(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), 3000, 7);
const WAV = (() => { const n = 1600, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(8000, 24); b.writeUInt32LE(16000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40); return b; })();
const PDF = Buffer.from('%PDF-1.1\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');
const HEAD = '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE en-export SYSTEM "http://xml.evernote.com/pub/evernote-export4.dtd">\n<en-export export-date="20261014T000000Z" application="Evernote" version="10.0">\n';
const ENML = (inner) => `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd"><en-note>${inner}</en-note>`;
const wrap = (b64) => b64.replace(/(.{76})/g, '$1\n');
/* res: [{mime,name,bytes}]; each is referenced in the body by its REAL md5, as Evernote does */
function noteXML(n) {
  const res = n.res || [];
  const refs = res.map((r) => `<div><en-media hash="${md5(r.bytes)}" type="${r.mime}"/></div>`).join('');
  const rx = res.map((r) => `<resource><data encoding="base64">\n${wrap(r.bytes.toString('base64'))}\n</data><mime>${r.mime}</mime><resource-attributes><file-name>${esc(r.name)}</file-name></resource-attributes></resource>`).join('\n');
  return `<note>\n<title>${esc(n.title)}</title>\n<created>${n.created}</created>\n<updated>${n.created}</updated>\n<content><![CDATA[${ENML(`<div>Body of ${esc(n.title)}</div>` + refs)}]]></content>\n${rx}\n</note>\n`;
}
const BASIC = [
  { title: 'Media one', created: '20200103T000000Z', res: [{ mime: 'image/png', name: 'pic.png', bytes: PNG }, { mime: 'image/jpeg', name: 'photo.jpg', bytes: JPG }, { mime: 'audio/wav', name: 'tone.wav', bytes: WAV }, { mime: 'application/pdf', name: 'doc.pdf', bytes: PDF }] },
  { title: 'Media two', created: '20200104T000000Z', res: [{ mime: 'image/png', name: 'pic-again.png', bytes: PNG }] },
  { title: 'Plain', created: '20200105T000000Z', res: [] },
];
const EXPORT = join(TMP, 'export'); mkdirSync(EXPORT, { recursive: true });
const FILE = join(EXPORT, 'Media.enex');
writeFileSync(FILE, HEAD + BASIC.map(noteXML).join('') + '</en-export>\n');
const SHA = { png: sha256(PNG), jpg: sha256(JPG), wav: sha256(WAV), pdf: sha256(PDF) };
const T0 = '2026-10-01T00:00:00.000Z';
const seed = () => seedDB(T0);

/* ── the harness (as enex-s4b) ── */
const dev = (cloud, name, vp, opts = {}) => addDevice(browser, srv.base, cloud, name, { width: vp.w, height: vp.h }, vp.touch, seed(), opts);
const act = (d, vp, sel) => (vp.touch ? d.page.locator(sel).first().tap() : d.page.locator(sel).first().click());
const actText = (d, vp, sel, text) => (vp.touch ? d.page.locator(sel, { hasText: text }).first().tap() : d.page.locator(sel, { hasText: text }).first().click());
const noErr = (d, tag) => check(d.errors.length === 0, `${tag} no page errors`, d.errors.slice(0, 2).join(' · '));
const each = async (id, fn, vps = VPS, opts = {}) => {
  for (const vp of vps) {
    let d = null;
    try { const cl = makeCloud(); d = await dev(cl, 'D' + vp.name, vp, opts); d.cloudObj = cl; d.page.setDefaultTimeout(30000); await waitSeeded(cl, d); await gate(d); await fn(d, vp, cl); }
    catch (e) { check(false, `${id}@${vp.name} threw: ${String(e && e.message || e).split('\n')[0]}`); }
    finally { if (d) await d.ctx.close(); }
  }
};
/* the app may keep a picture by reference only once sync has caught up: wait for that; if the fake cloud never gets there, say so and force it */
async function gate(d) {
  const ok = await d.page.waitForFunction(() => _s2RefsOk(), null, { timeout: 20000 }).then(() => true).catch(() => false);
  if (!ok) { console.log('  note  _s2RefsOk() was not true on its own in the fake cloud; the check forces it'); await on(d, () => { window._s2RefsOk = () => true; }); }
}
const dlg = async (d, vp) => {
  await act(d, vp, '#sb-tools-btn'); await sleep(300);
  await actText(d, vp, '#sb-tools .sb-mi', 'Evernote import');
  await d.page.waitForSelector('#enx-modal.open #enx-box', { timeout: 5000 });
};
const waitDone = (d, ms = 120000) => d.page.waitForSelector('#enx-totals', { timeout: ms });
const waitState = (d, states, ms = 240000) => d.page.waitForFunction((s) => !_enx.imp.run && s.includes(_enx.imp.state), states, { timeout: ms });
async function bring(d, vp, what, states = ['done', 'capped', 'paused']) {
  if (!(await on(d, () => document.getElementById('enx-modal') && document.getElementById('enx-modal').classList.contains('open')))) await dlg(d, vp);
  if (!(await on(d, () => !!document.getElementById('enx-files')))) await actText(d, vp, '#enx-box .rm-big', 'Choose another export');
  await d.page.setInputFiles('#enx-files', what); await waitDone(d);
  await act(d, vp, '#enx-bring'); await waitState(d, states);
}
const art = (d, title) => on(d, (t) => { const a = DB.articles.find((x) => x.fromEvernote && x.title === t); return a ? JSON.parse(JSON.stringify(a)) : null; }, title);
const closeDlg = (d, vp) => actText(d, vp, '#enx-box .rem-btn', 'Close');
/* what the picture store and the files store hold, read with the app's own database names but our own code */
const idbAll = (d, dbName, store) => on(d, ([n, s]) => new Promise((res) => {
  const rq = indexedDB.open(n);
  rq.onsuccess = () => { const db = rq.result; if (!db.objectStoreNames.contains(s)) { db.close(); return res([]); } const st = db.transaction(s).objectStore(s), ks = st.getAllKeys(), vs = st.getAll();   /* read first; hash after (a transaction does not wait for a hash) */
    db.transaction(s).oncomplete = null;
    vs.onsuccess = async () => { const out = []; for (let i = 0; i < vs.result.length; i++) { const v = vs.result[i]; const buf = v && v.b ? new Uint8Array(await v.b.arrayBuffer()) : null; let h = ''; if (buf) { const dg = new Uint8Array(await crypto.subtle.digest('SHA-256', buf)); dg.forEach((x) => { h += (x < 16 ? '0' : '') + x.toString(16); }); } out.push({ key: ks.result[i], enx: v && v.enx, up: v && v.up, mime: v && v.mime, name: v && v.name, n: v && v.n, size: buf ? buf.length : -1, sha: h }); } db.close(); res(out); }; };
  rq.onerror = () => res([]);
}), [dbName, store]);
const picStore = (d) => idbAll(d, 'siyagah-pics-v1', 'pics');
const fileStore = (d) => idbAll(d, 'siyagah-files-v1', 'files');
const markers = (html) => (html.match(/class="enx-media"/g) || []).length;
const poll = async (fn, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await sleep(200); } return false; };

try {
  /* ══ 87a — the md5 and the scanner ══ */
  if (want('87a')) {
    const lens = [0, 1, 2, 3, 55, 56, 57, 63, 64, 65, 119, 120, 121, 127, 128, 1000, 65535, 200001];
    const cases = lens.map((n) => { const b = Buffer.from(Array.from({ length: n }, (_, i) => (i * 7 + n) & 255)); return { n, b64: b.toString('base64'), md5: md5(b) }; });
    const fixture = HEAD + BASIC.map(noteXML).join('') + '</en-export>\n';
    const d = await dev(makeCloud(), 'A', VPS[2]);
    try {
      const r = await on(d, ({ cases, fixture }) => {
        const bad = [];
        for (const c of cases) {
          const bin = atob(c.b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
          const st = _md5New(); for (let o = 0; o < u8.length; o += 37) _md5Update(st, u8.subarray(o, o + 37));   /* odd-sized pieces: the buffer edge is crossed */
          const got = _md5Digest(st); if (got !== c.md5) bad.push(c.n + ':' + got);
        }
        const run = (opts) => { const out = []; const sc = _enxScanner((i) => out.push(i), opts); for (let o = 0; o < fixture.length; o += 5000) sc.feed(fixture.slice(o, o + 5000)); sc.end(); return out; };
        const w = run({ content: true, data: true }), p = run({ content: true }), q = run(undefined);
        const blobs = w.map((i) => i.res.map((x) => ({ md5: x.md5, n: x.blob ? x.blob.size : -1, bytes: x.bytes })));
        return { bad, blobs, plainBlobs: p.some((i) => i.res.some((x) => x.blob || x.md5)), noOpt: q.some((i) => i.res.some((x) => x.blob || x.md5)),
          same: JSON.stringify(p.map((i) => [i.title, i.res.map((x) => [x.mime, x.name, x.bytes, x.hash]), i.contentLen])) === JSON.stringify(w.map((i) => [i.title, i.res.map((x) => [x.mime, x.name, x.bytes, x.hash]), i.contentLen])) };
      }, { cases, fixture });
      check(r.bad.length === 0, `87a the md5 equals Node's at ${lens.length} lengths around the block edge`, r.bad.join(' '));
      const want0 = BASIC.map((n) => n.res.map((x) => ({ md5: md5(x.bytes), n: x.bytes.length })));
      check(JSON.stringify(r.blobs.map((a) => a.map((x) => ({ md5: x.md5, n: x.n })))) === JSON.stringify(want0), '87a the scanner with {data:true} gives each resource its md5 and its exact bytes (size)', JSON.stringify(r.blobs));
      check(!r.plainBlobs && !r.noOpt, '87a without the data option there is no blob and no md5');
      check(r.same, '87a every title, mime, name, size and content length is the same with and without the option');
      noErr(d, '87a');
    } finally { await d.ctx.close(); }
  }

  /* ══ 87b — the import ══ */
  if (want('87b')) await each('87b', async (d, vp) => {
    const t = `87b@${vp.name}`;
    await bring(d, vp, FILE);
    const a1 = await art(d, 'Media one'), a2 = await art(d, 'Media two');
    const imgs = (h) => [...h.matchAll(/<img class="ed-img" data-pic="([0-9a-f]{64})" data-mime="([^"]*)" alt="">/g)].map((m) => [m[1], m[2]]);
    check(JSON.stringify(imgs(a1.content)) === JSON.stringify([[SHA.png, 'image/png'], [SHA.jpg, 'image/jpeg']]), `${t} the two pictures stand where their markers stood: img.ed-img[data-pic=sha256]`, JSON.stringify(imgs(a1.content)));
    check(imgs(a2.content).length === 1 && imgs(a2.content)[0][0] === SHA.png, `${t} the same picture in a second note is the same sha256`);
    check(markers(a1.content) === 0 && markers(a2.content) === 0, `${t} no marker is left`);
    check(/<span class="enx-file" contenteditable="false" data-file="[0-9a-f]{64}" data-mime="audio\/wav" data-name="tone.wav">🎧 tone.wav · [\d.]+ KB<\/span>/.test(a1.content) && a1.content.includes(`data-file="${SHA.wav}"`) && /📎 doc.pdf/.test(a1.content) && a1.content.includes(`data-file="${SHA.pdf}"`), `${t} the audio and the PDF are .enx-file chips (🎧 / 📎, name, size) holding their sha256`);
    check(!/data:|blob:/.test(a1.content + a2.content), `${t} a.content holds no data: and no blob:`);
    const pics = await picStore(d), files = await fileStore(d);
    const pp = Object.fromEntries(pics.map((p) => [p.key, p]));
    check(pics.length === 2 && [SHA.png, SHA.jpg].every((s) => pp[s] && pp[s].sha === s && pp[s].size === (s === SHA.png ? PNG.length : JPG.length)), `${t} siyagah-pics-v1 holds the two pictures and each one's bytes hash to its key (sha256 checked in the page)`, JSON.stringify(pics.map((p) => [p.key.slice(0, 8), p.size, p.sha === p.key])));
    check(pics.every((p) => p.enx === 1 && !p.up), `${t} each stored picture is marked enx:1 (and not uploaded)`);
    const ff = Object.fromEntries(files.map((f) => [f.key, f]));
    check(files.length === 2 && ff[SHA.wav] && ff[SHA.wav].sha === SHA.wav && ff[SHA.wav].name === 'tone.wav' && ff[SHA.wav].mime === 'audio/wav' && ff[SHA.wav].n === WAV.length && ff[SHA.pdf] && ff[SHA.pdf].sha === SHA.pdf, `${t} siyagah-files-v1 holds the audio and the PDF: bytes verify, name, mime and size kept`, JSON.stringify(files.map((f) => [f.key.slice(0, 8), f.name, f.size])));
    const prog = await on(d, () => (document.getElementById('enx-imed') || {}).textContent || '');
    check(/In: \d+ of \d+ pictures · \d+ of \d+ audio · \d+ of \d+ files/.test(prog) && /\b3 of 3 pictures/.test(prog) && /1 of 1 audio/.test(prog) && /1 of 1 files/.test(prog), `${t} the dialog counts pictures / audio / files ("${prog.slice(0, 90)}")`);
    noErr(d, t);
  });

  /* ══ 87c — notes an earlier run made ══ */
  if (want('87c')) await each('87c', async (d, vp) => {
    const t = `87c@${vp.name}`;
    /* S4b's path: the same scanner without the data option (what v05.26 did) */
    await on(d, () => { window.__realScanner = _enxScanner; _enxScanner = (cb, o) => window.__realScanner(cb, { content: o && o.content }); });
    await bring(d, vp, FILE);
    const old1 = await art(d, 'Media one'), old2 = await art(d, 'Media two');
    check(markers(old1.content) === 4 && markers(old2.content) === 1, `${t} (setup) the earlier path left 4 + 1 markers`);
    /* a copy in Trash, one note open */
    await on(d, (id) => { const i = DB.articles.findIndex((x) => x.id === id); const a = DB.articles[i]; DB.articles.splice(i, 1); DB.trash.push({ id: 'tr-' + id, type: 'article', item: JSON.parse(JSON.stringify(a)), deletedAt: new Date().toISOString() }); persist(); }, old2.id);
    await on(d, (id) => { const a = DB.articles.find((x) => x.id === id); ST.folder = a.folderIds[0]; render(); selArt(id); startEdit(); }, old1.id);
    await on(d, () => { _enxScanner = window.__realScanner; });
    await again(d, vp);
    let n1 = await art(d, 'Media one'), tr = await on(d, () => { const e = DB.trash.find((x) => x.type === 'article' && x.item.title === 'Media two'); return e ? JSON.parse(JSON.stringify(e.item)) : null; });
    check(markers(n1.content) === 4 && n1.content === old1.content && n1.updatedAt === old1.updatedAt, `${t} a note open in the editor is left exactly as it was`);
    check(await on(d, () => _enx.imp.openLeft) >= 1, `${t} and the result says so (open note left for next time)`);
    const strip = (h) => h.replace(/<span class="enx-media"[^>]*>[^<]*<\/span>|<img class="ed-img"[^>]*>|<span class="enx-file"[^>]*>[^<]*<\/span>/g, '§');
    check(markers(tr.content) === 0 && strip(tr.content) === strip(old2.content) && /data-pic="[0-9a-f]{64}"/.test(tr.content), `${t} the note in Trash got its picture; nothing but the marker changed`, tr.content.slice(0, 160));
    check(Date.parse(tr.updatedAt) === Date.parse(old2.updatedAt) + 1, `${t} the Trash copy's updatedAt is its own + 1 ms (${old2.updatedAt} → ${tr.updatedAt})`);
    await on(d, () => { cancelEdit(); });
    await again(d, vp);
    n1 = await art(d, 'Media one');
    check(markers(n1.content) === 0 && strip(n1.content) === strip(old1.content), `${t} once it is closed the note upgrades; only the 4 markers changed (every other character is the same)`);
    check(Date.parse(n1.updatedAt) === Date.parse(old1.updatedAt) + 1, `${t} updatedAt = old + 1 ms (${old1.updatedAt} → ${n1.updatedAt})`);
    const snap = await on(d, () => JSON.stringify([DB.articles.map((a) => [a.id, a.content, a.updatedAt]), DB.trash.map((x) => [x.id, x.item && x.item.content, x.item && x.item.updatedAt])]));
    const before = (await picStore(d)).length + (await fileStore(d)).length;
    await again(d, vp);
    const snap2 = await on(d, () => JSON.stringify([DB.articles.map((a) => [a.id, a.content, a.updatedAt]), DB.trash.map((x) => [x.id, x.item && x.item.content, x.item && x.item.updatedAt])]));
    check(snap === snap2, `${t} a second run over the same export changes nothing (no content, no updatedAt, in notes and Trash)`);
    check(before === (await picStore(d)).length + (await fileStore(d)).length, `${t} and stores nothing new`);
    noErr(d, t);
  });
  async function again(d, vp) { await bring(d, vp, FILE); }

  /* ══ 87d — pictures wait when the app is not ready to keep them ══ */
  if (want('87d')) await each('87d', async (d, vp) => {
    const t = `87d@${vp.name}`;
    await on(d, () => { window.__realGate = _s2RefsOk; _s2RefsOk = () => false; });
    await bring(d, vp, FILE);
    const a1 = await art(d, 'Media one');
    check(markers(a1.content) === 2 && !/<img/.test(a1.content) && /enx-file/.test(a1.content), `${t} with _s2RefsOk() false the 2 picture markers of the note stay; the audio and the PDF still come in`, a1.content.slice(0, 120));
    check(!/data:/.test(a1.content) && (await picStore(d)).length === 0, `${t} nothing inline as data:, nothing in the picture store`);
    const txt = await on(d, () => (document.getElementById('enx-imed') || {}).textContent || '');
    check(/Pictures wait: /.test(txt), `${t} the result says "Pictures wait: …" ("${txt.slice(0, 120)}")`);
    await on(d, () => { _s2RefsOk = window.__realGate; });
    await bring(d, vp, FILE);
    const b1 = await art(d, 'Media one');
    check(markers(b1.content) === 0 && (await picStore(d)).length === 2, `${t} the next run, once it is ready, brings the pictures in (markers 0, store 2)`);
    noErr(d, t);
  });

  /* ══ 87e — held from the cloud; a hand-added picture goes ══ */
  if (want('87e')) await each('87e', async (d, vp, cl) => {
    const t = `87e@${vp.name}`;
    await bring(d, vp, FILE); await quiet(cl, d);
    const picW = () => cl.log.filter((o) => o.t === 'set' && /\/(pics|picparts)\//.test(o.p)).map((o) => o.p.slice(NB.length + 1));
    check(picW().length === 0, `${t} nothing of the import's pictures is written to the cloud while enxMediaCloud is absent`, picW().join(' '));
    const hand = randomBytes(900); hand[0] = 0x89; hand[1] = 0x50;
    await on(d, async (b64) => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < u.length; i++) u[i] = bin.charCodeAt(i); await _picPut(u, 'image/png'); persist(); flushPendingPush(); }, hand.toString('base64'));
    const handSha = sha256(hand);
    const okHand = await poll(() => picW().some((p) => p === 'pics/' + handSha));
    await quiet(cl, d);
    check(okHand && !picW().some((p) => p.includes(SHA.png) || p.includes(SHA.jpg)), `${t} a picture the owner adds by hand still uploads; the import's two do not`, picW().join(' '));
    const useOf = () => { const u = cl.store.get(NB + '/usage/v1'); return u ? u.picBytes : null; };
    const metaSum = () => [...cl.store].filter(([p]) => p.startsWith(NB + '/pics/')).reduce((s, [, v]) => s + v.n, 0);
    check(useOf() === hand.length && metaSum() === hand.length, `${t} usage/v1 moved by exactly the bytes uploaded (${useOf()} = ${hand.length})`);
    await on(d, () => { DB.theme = DB.theme || {}; DB.theme.enxMediaCloud = true; persist(); flushPendingPush(); });
    const okAll = await poll(() => picW().some((p) => p === 'pics/' + SHA.png) && picW().some((p) => p === 'pics/' + SHA.jpg), 30000);
    await quiet(cl, d);
    check(okAll, `${t} once DB.theme.enxMediaCloud is set the two pictures go up`, picW().join(' '));
    check(useOf() === hand.length + PNG.length + JPG.length && useOf() === metaSum(), `${t} usage/v1 = every byte in pics/ (${useOf()} = ${hand.length + PNG.length + JPG.length})`);
    noErr(d, t);
  });

  /* ══ 87f — the space guard ══ */
  if (want('87f')) await each('87f', async (d, vp, cl) => {
    const t = `87f@${vp.name}`;
    const a = randomBytes(700 * 1024), b = randomBytes(700 * 1024);
    await on(d, () => { window.__picCap = 1048576; window.__toasts = []; });
    const put = (buf) => on(d, async (b64) => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < u.length; i += 1) u[i] = bin.charCodeAt(i); const s = await _picPut(u, 'image/png'); persist(); flushPendingPush(); return s; }, buf.toString('base64'));
    await put(a); const sa = sha256(a);
    await poll(() => cl.store.has(NB + '/pics/' + sa)); await quiet(cl, d);
    await put(b); const sb = sha256(b);
    await sleep(2500); await quiet(cl, d);
    const wrote = (s) => cl.log.filter((o) => o.t === 'set' && o.p.includes(s)).length;
    check(cl.store.has(NB + '/pics/' + sa) && !wrote(sb), `${t} the second picture would pass the cap: nothing of it is written (parts or meta)`);
    check((await on(d, () => _picNotUp.size)) === 1, `${t} it stays on the device, waiting`);
    const u = cl.store.get(NB + '/usage/v1');
    check(u && u.picBytes === a.length, `${t} usage/v1 holds exactly what was uploaded (${u && u.picBytes})`);
    const panel = await on(d, () => _syncDiagnosticsHTML());
    check(/Cloud picture space/.test(panel) && /0\.7 MB of 1\.0 MB/.test(panel.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')), `${t} 🧰 → Sync shows "Cloud picture space: 0.7 MB of 1.0 MB"`, panel.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(-200));
    const r0 = cl.reads.filter((x) => x.p.includes(sb)).length;
    await on(d, () => { persist(); flushPendingPush(); }); await sleep(1500); await quiet(cl, d); await on(d, () => { persist(); flushPendingPush(); }); await sleep(1500); await quiet(cl, d);
    check(cl.reads.filter((x) => x.p.includes(sb)).length === r0 && !wrote(sb), `${t} it is not asked again until the cap changes (no further read or write)`);
    const toasts = await on(d, () => window.__toasts.join('|'));
    check(!/picture|cloud|space/i.test(toasts), `${t} no toast, no alarm ("${toasts}")`);
    await on(d, () => { window.__picCap = 8 * 1048576; persist(); flushPendingPush(); });
    const ok = await poll(() => cl.store.has(NB + '/pics/' + sb), 20000); await quiet(cl, d);
    check(ok && cl.store.get(NB + '/usage/v1').picBytes === a.length + b.length, `${t} with the cap raised it goes up and the total is the sum (${cl.store.get(NB + '/usage/v1').picBytes})`);
    noErr(d, t);
  });

  /* ══ 87g — on screen ══ */
  if (want('87g')) await each('87g', async (d, vp, cl) => {
    const t = `87g@${vp.name}`;
    await bring(d, vp, FILE); await quiet(cl, d);
    await closeDlg(d, vp);
    const a1 = await art(d, 'Media one'); const before = a1.content;
    await on(d, (id) => { const a = DB.articles.find((x) => x.id === id); ST.folder = a.folderIds[0]; render(); selArt(id); }, a1.id);
    await d.page.waitForSelector('#p3 .enx-file.enx-file-ok', { timeout: 10000 });
    const shown = await on(d, () => [...document.querySelectorAll('#p3 img.ed-img')].map((i) => ({ ok: (i.getAttribute('src') || '').startsWith('blob:'), w: i.naturalWidth })));
    check(shown.length === 2 && shown.every((s) => s.ok), `${t} the pictures show from the store (blob: src made at display time)`, JSON.stringify(shown));
    const chip = d.page.locator('#p3 .enx-file', { hasText: 'tone.wav' }).first();
    const box = await chip.boundingBox(), pane = await d.page.locator('#p3').boundingBox();
    check(box && box.width <= pane.width + 1 && box.x >= pane.x - 1 && (vp.name !== '390' || box.width >= pane.width * 0.6), `${t} the chip fits the pane${vp.name === '390' ? ' and takes its own line' : ''} (${Math.round(box.width)} of ${Math.round(pane.width)} px)`);
    if (vp.touch) await chip.tap(); else await chip.click();
    await d.page.waitForSelector('#p3 .enx-file .enx-aud', { timeout: 5000 });
    const au = await on(d, () => { const a = document.querySelector('#p3 .enx-aud'); const r = a.getBoundingClientRect(); return { src: a.getAttribute('src').slice(0, 5), controls: a.controls, w: r.width, right: r.right, vw: innerWidth }; });
    check(au.src === 'blob:' && au.controls && au.right <= au.vw + 1, `${t} tapping the audio chip makes an <audio controls> with a blob: src that fits the screen (${Math.round(au.w)} px)`, JSON.stringify(au));
    check((await on(d, (id) => DB.articles.find((x) => x.id === id).content, a1.id)) === before && !/<audio|blob:/.test(before), `${t} a.content did not change and holds no player and no blob:`);
    await on(d, () => _flushEd && _flushEd());
    check((await on(d, (id) => DB.articles.find((x) => x.id === id).content, a1.id)) === before, `${t} even after a save pass the stored note is the same`);
    if (vp.touch) await chip.tap({ position: { x: 8, y: 6 } }); else await chip.click({ position: { x: 8, y: 6 } });   /* the label, not the player under it */
    await d.page.waitForFunction(() => !document.querySelector('#p3 .enx-aud'), null, { timeout: 5000 });
    check(true, `${t} a second tap takes the player away again`);
    /* a device that does not hold the bytes */
    const d2 = await dev(cl, 'Other' + vp.name, vp); d2.page.setDefaultTimeout(30000);
    try {
      await d2.page.waitForFunction((id) => DB.articles.some((x) => x.id === id), a1.id, { timeout: 60000 });
      await on(d2, (id) => { const a = DB.articles.find((x) => x.id === id); ST.folder = a.folderIds[0]; render(); selArt(id); }, a1.id);
      await d2.page.waitForSelector('#p3 .enx-file .enx-off', { timeout: 10000 });
      const off = await on(d2, () => [...document.querySelectorAll('#p3 .enx-file')].map((c) => c.textContent.trim()).filter((x) => /kept on the computer/.test(x)));
      check(off.length === 2 && off.every((x) => /kept on the computer that imported it/.test(x)) && /tone\.wav/.test(off.join()), `${t} a device without the bytes says "kept on the computer that imported it" on both chips ("${off[0] || ''}")`);
      await d2.page.locator('#p3 .enx-file', { hasText: 'tone.wav' }).first().evaluate((e) => e.click()); await sleep(400);
      check(!(await on(d2, () => !!document.querySelector('#p3 .enx-aud'))), `${t} and a tap makes no broken player`);
      check((await on(d2, (id) => DB.articles.find((x) => x.id === id).content, a1.id)) === before, `${t} the note's stored text is the same there`);
      const ph = await on(d2, () => [...document.querySelectorAll('#p3 img.ed-img')].map((i) => i.classList.contains('ed-img-missing')));
      check(ph.length === 2 && ph.every(Boolean), `${t} the pictures show S2b's placeholder there while the upload is held`);
      noErr(d2, t + ' (other device)');
    } finally { await d2.ctx.close(); }
    noErr(d, t);
  });

  /* ══ 87h — resume ══ */
  if (want('87h')) {
    const N = 600, dir = join(TMP, 'resume'); mkdirSync(dir, { recursive: true });
    let s = HEAD;
    for (let i = 0; i < N; i++) { const c = new Date(Date.UTC(2015, 0, 1) + i * 61000).toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z'); s += noteXML({ title: 'Resume ' + String(i).padStart(4, '0'), created: c, res: [{ mime: 'image/png', name: 'p' + i + '.png', bytes: withTail(Buffer.from([0x89, 0x50, 0x4e, 0x47, ...Buffer.from('#' + i)]), 200, i) }] }); }
    writeFileSync(join(dir, 'Resume.enex'), s + '</en-export>\n');
    for (const vp of [VPS[0], VPS[2]]) {
      let d = null; const t = `87h@${vp.name}`;
      try {
        const cl = makeCloud(); d = await dev(cl, 'R', vp); d.page.setDefaultTimeout(30000); await waitSeeded(cl, d); await gate(d);
        await on(d, () => { window.__enxDelay = 400; });
        await dlg(d, vp); await d.page.setInputFiles('#enx-files', join(dir, 'Resume.enex')); await waitDone(d); await act(d, vp, '#enx-bring');
        await d.page.waitForFunction(() => DB.articles.filter((a) => a.fromEvernote).length >= 250, null, { timeout: 60000 });
        await d.page.close(); d.page = await d.ctx.newPage(); d.page.on('pageerror', (e) => d.errors.push('pageerror: ' + e));
        await d.page.goto(srv.base + '/', { waitUntil: 'domcontentloaded' }); await boot(d); d.page.setDefaultTimeout(30000);
        await gate(d);
        const mid = await on(d, () => { const a = DB.articles.filter((x) => x.fromEvernote); return { n: a.length, left: a.filter((x) => x.content.includes('class="enx-media"')).length, imgs: a.filter((x) => /<img class="ed-img" data-pic/.test(x.content)).length }; });
        check(mid.n >= 250 && mid.n < N && mid.left === 0 && mid.imgs === mid.n, `${t} after the page is closed mid-media the notes that were saved are whole: ${mid.n} notes, each with its picture, none with a marker`, JSON.stringify(mid));
        await dlg(d, vp); await act(d, vp, '#enx-cont'); await d.page.waitForSelector('#enx-resume'); await d.page.setInputFiles('#enx-files', join(dir, 'Resume.enex')); await waitState(d, ['done']);
        const fin = await on(d, () => { const a = DB.articles.filter((x) => x.fromEvernote), ids = DB.articles.map((x) => x.id); return { n: a.length, uniq: new Set(a.map((x) => x.title)).size, dup: new Set(ids).size !== ids.length, left: a.filter((x) => x.content.includes('class="enx-media"')).length, imgs: a.filter((x) => (x.content.match(/<img class="ed-img" data-pic/g) || []).length === 1).length }; });
        check(fin.n === N && fin.uniq === N && !fin.dup && fin.left === 0 && fin.imgs === N, `${t} Continue finishes it: ${N} notes, no duplicate, every marker replaced, one picture each`, JSON.stringify(fin));
        { const ps = await picStore(d); check(ps.length === N && new Set(ps.map((p) => p.key)).size === N, `${t} the store holds ${N} pictures, none doubled`, String(ps.length)); }
        noErr(d, t);
      } catch (e) { check(false, `${t} threw: ${String(e && e.message || e).split('\n')[0]}`); }
      finally { if (d) await d.ctx.close(); }
    }
  }

  /* ══ 87i — memory ══ */
  if (want('87i')) {
    const t = '87i@1440', dir = join(TMP, 'big'); mkdirSync(dir, { recursive: true });
    const f = join(dir, 'Big.enex'), ws = createWriteStream(f); const NN = 2000, PER = 500 * 1024; let bytes = 0;
    const w = (x) => new Promise((r) => { if (!ws.write(x)) ws.once('drain', r); else r(); });
    await w(HEAD);
    for (let i = 0; i < NN; i++) {
      const c = new Date(Date.UTC(2010, 0, 1) + i * 61000).toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
      const res = i < BIGPICS ? [{ mime: 'image/jpeg', name: 'b' + i + '.jpg', bytes: Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), randomBytes(PER)]) }] : [];
      const x = noteXML({ title: 'Big ' + String(i).padStart(5, '0'), created: c, res }); bytes += x.length; await w(x);
    }
    await w('</en-export>\n'); await new Promise((r) => ws.end(r));
    let d = null;
    try {
      const cl = makeCloud(); d = await dev(cl, 'M', VPS[2]); d.page.setDefaultTimeout(30000); await waitSeeded(cl, d); await gate(d);
      await dlg(d, VPS[2]); await d.page.setInputFiles('#enx-files', f); await waitDone(d, 300000);
      const cdp = await d.ctx.newCDPSession(d.page); await cdp.send('HeapProfiler.collectGarbage'); await sleep(300);
      const heap = { start: (await cdp.send('Runtime.getHeapUsage')).usedSize, peak: 0 }; heap.peak = heap.start; let stopH = false;
      const pollH = (async () => { while (!stopH) { try { const u = (await cdp.send('Runtime.getHeapUsage')).usedSize; if (u > heap.peak) heap.peak = u; } catch {} await sleep(50); } })();
      const t0 = Date.now(); await act(d, VPS[2], '#enx-bring'); await waitState(d, ['done', 'capped'], 600000);
      stopH = true; await pollH; await cdp.send('HeapProfiler.collectGarbage'); const h = { ...heap, end: (await cdp.send('Runtime.getHeapUsage')).usedSize };
      const mb = (x) => Math.round(x / 1048576);
      console.log(`  heap  87i  ${NN} notes, ${BIGPICS} pictures, ${mb(bytes + BIGPICS * PER * 1.34)} MB file: start ${mb(h.start)} MB, peak ${mb(h.peak)} MB, end ${mb(h.end)} MB, ${Math.round((Date.now() - t0) / 1000)} s`);
      const st = await on(d, () => ({ n: DB.articles.filter((a) => a.fromEvernote).length, left: DB.articles.filter((a) => a.fromEvernote && a.content.includes('class="enx-media"')).length }));
      check(st.n === NN && st.left === 0 && (await picStore(d)).length === BIGPICS, `${t} ${NN} notes in, ${BIGPICS} pictures stored, no marker left`, JSON.stringify(st));
      check(h.peak - h.start < 150 * 1048576, `${t} the page's heap grew by ${mb(h.peak - h.start)} MB at its peak (limit 150 MB; the file is ${mb(BIGPICS * PER)} MB of pictures)`);
      noErr(d, t);
    } catch (e) { check(false, `${t} threw: ${String(e && e.message || e).split('\n')[0]}`); }
    finally { if (d) await d.ctx.close(); }
  }

  /* ══ 87j — no long task ══ */
  if (want('87j')) {
    const vp = VPS[0], t = '87j@390 x4', lim = hostLimit(200), dir = join(TMP, 'lt'); mkdirSync(dir, { recursive: true });
    let s = HEAD; const big = randomBytes(6 * 1024 * 1024); big[0] = 0xff; big[1] = 0xd8;
    for (let i = 0; i < 150; i++) { const c = new Date(Date.UTC(2012, 0, 1) + i * 61000).toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z'); s += noteXML({ title: 'Task ' + String(i).padStart(4, '0'), created: c, res: i % 5 === 0 ? [{ mime: i === 0 ? 'audio/mpeg' : 'image/jpeg', name: 'x' + i, bytes: i === 0 ? big : withTail(Buffer.from([0xff, 0xd8, 0xff]), 60000, i) }] : [] }); }
    writeFileSync(join(dir, 'Task.enex'), s + '</en-export>\n');
    let d = null;
    try {
      const cl = makeCloud(); d = await dev(cl, 'L', vp, { throttle: 4 }); d.page.setDefaultTimeout(60000); await waitSeeded(cl, d); await gate(d);
      await dlg(d, vp); await d.page.setInputFiles('#enx-files', join(dir, 'Task.enex')); await waitDone(d, 120000);
      await on(d, () => { window.__t0 = performance.now(); window.__pr = null; });
      await d.page.evaluate(probeInstall); const from = await on(d, () => performance.now());
      await act(d, vp, '#enx-bring'); await waitState(d, ['done'], 300000); await quiet(cl, d);
      const lt = (await on(d, probeRead, from)).sort((a, b) => b.app - a.app);
      const worst = lt[0] || { app: 0, start: 0 };
      console.log(`  long  87j  worst app long task ${worst.app} ms at ${worst.start} ms (page clock), ${lt.length} long tasks over 50 ms; limit ${lim.text}`);
      check(worst.app <= lim.ms, `${t} no long task over ${lim.text} ms in the media step (worst ${worst.app} ms, started ${worst.start} ms)`, JSON.stringify(lt.slice(0, 4)));
      const st = await on(d, () => ({ n: DB.articles.filter((a) => a.fromEvernote).length, left: DB.articles.filter((a) => a.fromEvernote && a.content.includes('class="enx-media"')).length }));
      check(st.n === 150 && st.left === 0, `${t} all 150 notes in, no marker left`, JSON.stringify(st));
      await sleep(300); const f2 = await on(d, () => performance.now()); await on(d, () => { setTimeout(() => { const t0 = performance.now(); while (performance.now() - t0 < 160); }, 10); }); await sleep(600);   /* a task of its own: a block run inside the evaluate itself is not a long task */
      const probe = (await on(d, probeRead, f2)).filter((x) => x.dur >= 150);
      check(probe.length >= 1, `${t} (the probe itself) sees a deliberate 160 ms block, so zero long tasks above means zero`, JSON.stringify(probe));
      noErr(d, t);
    } catch (e) { check(false, `${t} threw: ${String(e && e.message || e).split('\n')[0]}`); }
    finally { if (d) await d.ctx.close(); }
  }
} catch (e) {
  console.log(' FAIL  enex-s4c threw: ' + (e && e.stack || e));
  results.push({ ok: false, label: 'threw' });
} finally {
  await browser.close();
  await srv.close();
  try { rmSync(TMP, { recursive: true, force: true }); } catch {}
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
