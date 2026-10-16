#!/usr/bin/env node
/* tools/push-p4.mjs — v05.26, P4: no pause when the new notes go to the cloud after an import (checks 86a–86e).

   `node tools/push-p4.mjs --profile [--plan=recs|both] [--notes=9000]`  prints the profile table (no checks)
   `node tools/push-p4.mjs [--only=86a,86c] [--notes=9000] [--unpatched]` runs the checks; each printed ok/FAIL line is one app-check check.
   `--unpatched` serves the build before this round (the P4 version-bump commit's parent), where the new checks must fail. */
import { playwright, serve, seedDB, hostLimit } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, quiet, waitSeeded, check, results, liveDB, probeInstall, probeRead, assembleEquals, reopen } from './s1-fake.mjs';
import { canonDB, diffDB } from './s1-assemble.mjs';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const arg = (k, d) => { const a = argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const onlySet = arg('only') ? new Set(arg('only').split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);
const BIGN = +arg('notes', 9000), IMPN = +arg('import', 2000);
const PROFILE = argv.includes('--profile');

function makeBase() {
  const dir = mkdtempSync(join(tmpdir(), 'push-p4-base-'));
  const sha = execFileSync('git', ['log', '--format=%H', '-n', '1', '--grep=v05.26 P4: version bump'], { encoding: 'utf8' }).trim();
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', `${sha}~1:${f}`], { encoding: 'buffer', maxBuffer: 1 << 28 })); } catch {} }
  return dir;
}
const pw = await playwright();
const srv = await serve(argv.includes('--unpatched') ? makeBase() : undefined);
const browser = await pw.chromium.launch({ args: ['--js-flags=--max-old-space-size=8192'] });
const TMP = mkdtempSync(join(tmpdir(), 'push-p4-'));

/* ── fixtures: an Evernote export of `n` notes ── */
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const HEAD = '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE en-export SYSTEM "http://xml.evernote.com/pub/evernote-export4.dtd">\n<en-export export-date="20261014T000000Z" application="Evernote" version="10.0">\n';
const H1 = '0123456789abcdef0123456789abcdef';
const ENML = (inner) => `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd"><en-note>${inner}</en-note>`;
const noteXML = (n) => `<note>\n<title>${esc(n.title)}</title>\n<created>${n.created}</created>\n<updated>${n.created}</updated>\n${(n.tags || []).map((t) => `<tag>${esc(t)}</tag>`).join('\n')}\n<content><![CDATA[${ENML(n.inner)}]]></content>\n</note>\n`;
function makeExport(name, n, prefix = 'Two thousand ') {
  const dir = join(TMP, name, 'Stack K'); mkdirSync(dir, { recursive: true });
  let s = HEAD;
  for (let i = 0; i < n; i++) {
    const tm = new Date(Date.UTC(2016, 0, 1) + i * 90000), c = tm.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    s += noteXML({ title: prefix + i, created: c, tags: ['k' + (i % 40), 'two'], inner: '<div>' + 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(20) + `</div><div><en-todo/>step ${i}</div><en-media hash="${H1}" type="image/png"/>` });
  }
  const f = join(dir, 'Two thousand.enex'); writeFileSync(f, s + '</en-export>\n');
  return [f];
}

/* ── the harness ── */
const T0 = '2026-10-01T00:00:00.000Z';
const seed = (extra) => { const db = seedDB(T0); for (let i = 0; i < extra; i++) db.articles.push({ id: 'bn' + i, title: 'Bulk note ' + i, content: '<p>Body ' + i + ' lorem ipsum dolor sit amet</p>', folderIds: [i % 2 ? 'f1' : 'f2'], tags: i % 9 === 0 ? ['bulk'] : [], createdAt: T0, updatedAt: T0, kind: 'general' }); return db; };
const VP = { w: 390, h: 844, touch: true }, VPD = { w: 1440, h: 900, touch: false };
const dev = (cloud, name, vp, opts, db) => addDevice(browser, srv.base, cloud, name, { width: vp.w, height: vp.h }, vp.touch, db, opts);
const act = (d, vp, sel) => (vp.touch ? d.page.locator(sel).first().tap() : d.page.locator(sel).first().click());
const actText = (d, vp, sel, text) => (vp.touch ? d.page.locator(sel, { hasText: text }).first().tap() : d.page.locator(sel, { hasText: text }).first().click());
const dlg = async (d, vp) => {
  await act(d, vp, '#sb-tools-btn'); await sleep(300);
  await actText(d, vp, '#sb-tools .sb-mi', 'Evernote import');
  await d.page.waitForSelector('#enx-modal.open #enx-box', { timeout: 5000 });
};
const pick = async (d, vp, files) => { await dlg(d, vp); await d.page.setInputFiles('#enx-files', files); await d.page.waitForSelector('#enx-totals', { timeout: 300000 }); };
const waitState = (d, states, ms = 600000) => d.page.waitForFunction((s) => !_enx.imp.run && s.includes(_enx.imp.state), states, { timeout: ms });

/* the page-side recorder: wraps named globals and records [name, start, dur] (inclusive), the long tasks, and the fake SDK's own time */
const INSTALL = () => {
  window.__prof = []; window.__lts = []; window.__fake = [];
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lts.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ entryTypes: ['longtask'] }); } catch (e) {}
  for (const n of ['_stampRecordTouches', '_s1TakeSnap', '_s1SnapDirty', '_s1Snap', '_s1Exec', '_s1Write', '_pushWrite', '_doPush', '_save', '_syncSig', '_b64enc', '_writeCloudDB', '_rcJson', '_rcEntry', '_enxPersist']) {
    const o = window[n]; if (typeof o !== 'function') continue;
    window[n] = function () {
      const t0 = performance.now(), r = o.apply(this, arguments);
      if (r && typeof r.then === 'function') { window.__prof.push([n + ' (sync part)', t0, performance.now() - t0]); return r; }
      window.__prof.push([n, t0, performance.now() - t0]); return r;
    };
  }
  /* the fake SDK's own work: time around every batch.set / doc.set / commit's synchronous clone */
  const fs = firebase.firestore(), ob = fs.batch.bind(fs);
  fs.batch = function () { const b = ob(), os = b.set, oc = b.commit; b.set = function () { const t0 = performance.now(); const r = os.apply(this, arguments); window.__fake.push([t0, performance.now() - t0]); return r; }; b.commit = function () { const t0 = performance.now(); const p = oc.apply(this, arguments); window.__fake.push([t0, performance.now() - t0]); return p; }; return b; };
};

async function importInto(d, vp, files, { plan, hook } = {}) {
  const cdp = d.cdp;
  await on(d, INSTALL);
  /* the fake cloud's first blob is an unmarked one, so "an older build is active" is true by default: say which plan this run is */
  await on(d, (p) => { window._s1OlderActive = () => p === 'both'; }, plan || 'recs');
  await pick(d, vp, files);
  await on(d, () => { window.__t0 = performance.now(); window.__pushRet = 0; const o = window._doPush; window._doPush = async function () { const r = await o.apply(this, arguments); window.__pushRet = performance.now(); (window.__pushRets = window.__pushRets || []).push(Math.round(performance.now())); return r; }; });
  if (hook) await hook(d);
  await act(d, vp, '#enx-bring');
  await waitState(d, ['done', 'capped']);
  await quiet(d.cloudObj, d, 120000);
  return cdp;
}

async function newDevice(name, vp, opts = {}, nbig = BIGN) {
  const cl = makeCloud(); const d = await dev(cl, name, vp, opts, seed(nbig)); d.cloudObj = cl; d.page.setDefaultTimeout(60000);
  await waitSeeded(cl, d, 600000);
  return d;
}

async function profile(plan) {
  const d = await newDevice('P-' + plan, VP, { throttle: 4 });
  try {
    const files = makeExport('prof-' + plan, IMPN);
    await importInto(d, VP, files, { plan });
    const r = await on(d, () => ({ prof: window.__prof, lts: window.__lts, fake: window.__fake, t0: window.__t0, rets: window.__pushRets }));
    const agg = new Map();
    for (const [n, t, dur] of r.prof) { if (t < r.t0) continue; const a = agg.get(n) || { c: 0, tot: 0, max: 0, at: 0 }; a.c++; a.tot += dur; if (dur > a.max) { a.max = dur; a.at = t; } agg.set(n, a); }
    console.log(`\n## profile — plan ${plan}, 390 × CPU 4, ${BIGN} + ${IMPN} notes (ms; inclusive, from the click)`);
    console.log('| step | calls | total | worst | worst at |\n|---|---|---|---|---|');
    for (const [n, a] of [...agg.entries()].sort((x, y) => y[1].max - x[1].max)) console.log(`| ${n} | ${a.c} | ${Math.round(a.tot)} | ${Math.round(a.max)} | ${Math.round(a.at)} |`);
    const lts = r.lts.filter(([s]) => s >= r.t0 - 5).sort((x, y) => y[1] - x[1]).slice(0, 8);
    console.log('long tasks (worst 8) [start, dur]: ' + JSON.stringify(lts) + ' push returned at ' + JSON.stringify(r.rets));
    const fk = r.fake.filter(([t]) => t >= r.t0); console.log(`fake SDK time in batch.set/commit: ${fk.length} calls, total ${Math.round(fk.reduce((s, x) => s + x[1], 0))} ms, worst ${Math.round(Math.max(0, ...fk.map((x) => x[1])))} ms`);
  } finally { await d.ctx.close(); }
}

if (PROFILE) {
  for (const plan of (arg('plan') ? [arg('plan')] : ['recs', 'both'])) await profile(plan);
  await browser.close(); srv.close && srv.close();
  process.exit(0);
}

/* ═══════════════ the checks (block 86) ═══════════════ */
/* the cloud's records assembled = the device's notebook; _folderNoteRecoveryV1 is a per-device boot mark (sync-e2e.mjs ignores it too) */
const cloudEq = async (cl, d) => { const r = await assembleEquals(cl, d); if (r.ok || !r.db || !r.dev) return r; delete r.db._folderNoteRecoveryV1; delete r.dev._folderNoteRecoveryV1; const ok = canonDB(r.db) === canonDB(r.dev); return { ok, why: ok ? '' : diffDB(r.db, r.dev) }; };
const noErr = (d, tag) => check(d.errors.length === 0, `${tag} no page errors`, d.errors.slice(0, 2).join(' · '));
const HL = hostLimit(200);
const SYN_BIG = 300, SYN_IMP = 600;   /* the sync checks need many slices, not many notes: a small notebook, the slices held open by a test hook */
const polled = async (fn, ms = 120000, every = 150) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await sleep(every); } return false; };
const holdSlices = (d, hold) => on(d, (h) => { window.__s1SliceHold = h; _S1_SLICE_MS = 1; }, hold);   /* test-only: a 1 ms slice and `hold` ms of waiting at every yield */
const impCount = (d) => on(d, () => DB.articles.filter((a) => a.fromEvernote).length);
const enxFolders = (d) => on(d, () => DB.folders.filter((f) => f.enx).map((f) => f.id).sort().join(','));
const startImport = async (d, vp, files) => { await pick(d, vp, files); await act(d, vp, '#enx-bring'); };
const done = (d) => waitState(d, ['done', 'capped']);
const readBlob = (cloud) => {   /* the main doc, then its chunks, as a reader assembles them */
  const md = cloud.store.get('notebooks/nb-s1'); if (!md) return null;
  let b64 = ''; for (let i = 0; i < md.n; i++) { const c = cloud.store.get(`notebooks/nb-s1/chunks/${md.g ? md.g + '_' + i : i}`); if (!c) return { missing: i }; b64 += c.p; }
  try { return { md, db: JSON.parse(Buffer.from(b64, 'base64').toString('utf8')) }; } catch (e) { return { bad: String(e) }; }
};

/* 86a/86b/86c — the profile, and the pause: a 2,000-note import into 9,000 notes at 390 × CPU 4, both plans; then 1440 */
async function pauseCase(plan, vp, label, throttle) {
  const t = `86@${label} ${plan}`;
  let d = null;
  try {
    d = await newDevice('Q-' + plan + label, vp, throttle ? { throttle } : {});
    await on(d, probeInstall);
    const files = makeExport('pause-' + plan + label, IMPN);
    await on(d, (p) => { window._s1OlderActive = () => p === 'both'; }, plan);
    await pick(d, vp, files);
    const from = await on(d, () => performance.now());
    await act(d, vp, '#enx-bring'); await waitState(d, ['done', 'capped']);
    await quiet(d.cloudObj, d, 300000);
    const lts = await on(d, probeRead, from), n = await impCount(d);
    const worst = Math.max(0, ...lts.map((x) => x.app)), top = lts.slice().sort((a, b) => b.app - a.app).slice(0, 5);
    console.log(`# ${t}: long tasks [start ms, total, fake cloud, app] worst 5: ${top.map((x) => `[${x.start}, ${x.dur}, ${x.fake}, ${x.app}]`).join(' ')}; clicked at ${Math.round(from)}; ${lts.length} over 50 ms`);
    check(n === IMPN, `${t} ${IMPN} notes came in (${n})`);
    check(worst <= HL.ms, `${t} no long task over ${HL.text} ms from the click until the push returned (worst ${worst} ms of the app's own work; ${lts.length} over 50 ms)`, JSON.stringify(top));
    const w = await on(d, () => ({ s: window._s1Stat && window._s1Stat.lastWritten, st: window._s1SliceStat }));
    check(w.st && w.st.builds >= 1, `${t} the snapshot was built by the sliced builder (${JSON.stringify(w.st)})`);
    noErr(d, t);
  } catch (e) { check(false, `${t} threw: ${String(e && e.message || e).split('\n')[0]}`); }
  finally { if (d) await d.ctx.close(); }
}

/* 86d–86g — sync unchanged, edit while slicing, interrupted, the blob */
async function syncCases() {
  const vp = VP;
  /* 86d — import on A, B receives every note and folder */
  if (want('86d')) {
    const t = '86d';
    let A = null, B = null;
    try {
      const cl = makeCloud(); A = await dev(cl, 'A', vp, {}, seed(SYN_BIG)); A.cloudObj = cl; A.page.setDefaultTimeout(60000);
      await waitSeeded(cl, A, 120000);
      B = await dev(cl, 'B', vp, {}, seed(SYN_BIG)); B.page.setDefaultTimeout(60000);
      const files = makeExport('sync-d', SYN_IMP);
      await startImport(A, vp, files); await done(A); await quiet(cl, A, 120000);
      const okB = await polled(async () => (await impCount(B)) === SYN_IMP, 120000);
      check(await impCount(A) === SYN_IMP, `${t} A imported ${SYN_IMP}`);
      check(okB, `${t} B received all ${SYN_IMP} notes (${await impCount(B)})`);
      check(await enxFolders(A) === await enxFolders(B) && (await enxFolders(A)).length > 0, `${t} B received the folders (${(await enxFolders(A)).split(',').length})`);
      noErr(A, t + ' A'); noErr(B, t + ' B');
    } catch (e) { check(false, `${t} threw: ${String(e && e.message || e).split('\n')[0]}`); }
    finally { if (A) await A.ctx.close(); if (B) await B.ctx.close(); }
  }
  /* 86e — an edit made WHILE the snapshot is being built reaches B, and nothing is mixed */
  if (want('86e')) {
    const t = '86e';
    let A = null, B = null;
    try {
      const cl = makeCloud(); A = await dev(cl, 'A', vp, {}, seed(SYN_BIG)); A.cloudObj = cl; A.page.setDefaultTimeout(60000);
      await waitSeeded(cl, A, 120000);
      B = await dev(cl, 'B', vp, {}, seed(SYN_BIG)); B.page.setDefaultTimeout(60000);
      await holdSlices(A, 120);
      await on(A, () => { window._s1OlderActive = () => false; });
      const files = makeExport('sync-e', SYN_IMP);
      await startImport(A, vp, files); await done(A);
      const sliced = await polled(() => on(A, () => !!window.__s1Slicing), 60000, 20);
      check(sliced, `${t} the snapshot was being built in slices when the edit was made`);
      const before = await on(A, () => (window._s1SliceStat || {}).restarts || 0);
      await on(A, () => { const a = DB.articles.find((x) => x.id === 'bn5'); a.title = 'Edited while slicing'; a.content = '<p>edited while slicing</p>'; persist(); const n = DB.articles.find((x) => x.id === 'bn6'); n.title = 'Edited twice'; persist(); });
      await on(A, () => { window.__s1SliceHold = 0; });
      await quiet(cl, A, 120000);
      const okB = await polled(async () => (await impCount(B)) === SYN_IMP && (await on(B, () => { const a = DB.articles.find((x) => x.id === 'bn5'); return !!a && a.title === 'Edited while slicing'; })), 120000);
      const after = await on(A, () => (window._s1SliceStat || {}).restarts || 0);
      check(after > before, `${t} the half-built snapshot was thrown away and started again (restarts ${before} → ${after})`);
      const pick5 = (d) => on(d, () => { const g = (id) => { const a = DB.articles.find((x) => x.id === id); return a ? [a.title, a.content, a.updatedAt] : null; }; return JSON.stringify([g('bn5'), g('bn6')]); });
      check(okB, `${t} B received the import and the edit`);
      check(await pick5(A) === await pick5(B), `${t} the records B holds equal A's latest`, (await pick5(A)) + ' vs ' + (await pick5(B)));
      const ce = await cloudEq(cl, A);
      check(ce.ok, `${t} the cloud's records assemble to exactly A's notebook`, ce.why);
      noErr(A, t + ' A'); noErr(B, t + ' B');
    } catch (e) { check(false, `${t} threw: ${String(e && e.message || e).split('\n')[0]}`); }
    finally { if (A) await A.ctx.close(); if (B) await B.ctx.close(); }
  }
  /* 86f — the page closed in the middle of a build: nothing half-written, and the next session pushes the rest */
  if (want('86f')) {
    const t = '86f';
    let A = null, B = null;
    try {
      const cl = makeCloud(); A = await dev(cl, 'A', vp, {}, seed(SYN_BIG)); A.cloudObj = cl; A.page.setDefaultTimeout(60000);
      await waitSeeded(cl, A, 120000);
      B = await dev(cl, 'B', vp, {}, seed(SYN_BIG)); B.page.setDefaultTimeout(60000);
      await holdSlices(A, 150);
      await on(A, () => { window._s1OlderActive = () => false; });
      const files = makeExport('sync-f', SYN_IMP);
      await startImport(A, vp, files); await done(A);
      const sliced = await polled(() => on(A, () => !!window.__s1Slicing), 60000, 20);
      const cloudBefore = cl.log.filter((o) => o.t === 'set' && o.p.includes('/recs/articles~enx-n-')).length;
      check(sliced && cloudBefore === 0, `${t} the page was closed mid-build with none of the new notes written yet (slicing ${sliced}; ${cloudBefore} written)`);
      await reopen(A);   /* the page is gone; the device copy (the journal) stays */
      check(await impCount(A) === SYN_IMP, `${t} the next session still holds all ${SYN_IMP} notes`);
      await quiet(cl, A, 180000);
      const okB = await polled(async () => (await impCount(B)) === SYN_IMP, 120000);
      check(okB, `${t} the next session pushed the rest: B received all ${SYN_IMP} (${await impCount(B)})`);
      const ce = await cloudEq(cl, A);
      check(ce.ok, `${t} the cloud's records assemble to exactly A's notebook`, ce.why);
      noErr(A, t + ' A');
    } catch (e) { check(false, `${t} threw: ${String(e && e.message || e).split('\n')[0]}`); }
    finally { if (A) await A.ctx.close(); if (B) await B.ctx.close(); }
  }
  /* 86g — the `both` plan: one blob that parses and holds every note, written with the recs */
  if (want('86g')) {
    const t = '86g';
    let A = null;
    try {
      const cl = makeCloud(); A = await dev(cl, 'A', vp, {}, seed(SYN_BIG)); A.cloudObj = cl; A.page.setDefaultTimeout(60000);
      await waitSeeded(cl, A, 120000);
      await on(A, () => { window._s1OlderActive = () => true; });
      const files = makeExport('sync-g', SYN_IMP);
      const from = cl.log.length;
      await startImport(A, vp, files); await done(A); await quiet(cl, A, 180000);
      const bl = readBlob(cl);
      const live = await liveDB(A);
      check(!!bl && !!bl.db, `${t} the blob parses (${bl && (bl.bad || (bl.missing != null ? 'chunk ' + bl.missing + ' missing' : 'ok'))})`);
      const ids = bl && bl.db ? new Set(bl.db.articles.map((a) => a.id)) : new Set();
      check(live.articles.every((a) => ids.has(a.id)) && ids.size === live.articles.length, `${t} the blob holds every note (${ids.size} of ${live.articles.length})`);
      check(bl && bl.md && bl.md.s1c, `${t} the blob is marked (the recs were written first)`);
      const recsW = cl.log.slice(from).filter((o) => o.t === 'set' && o.p.includes('/recs/articles~enx-n-')).length;
      check(recsW >= SYN_IMP, `${t} the recs were written too (${recsW})`);
      const blobsW = new Set(cl.log.slice(from).filter((o) => o.t === 'set' && o.p === 'notebooks/nb-s1').map((o) => o.ms)).size;
      check(blobsW >= 1, `${t} the main doc was written (${blobsW} times)`);
      noErr(A, t);
    } catch (e) { check(false, `${t} threw: ${String(e && e.message || e).split('\n')[0]}`); }
    finally { if (A) await A.ctx.close(); }
  }
}

/* 86h — the sliced builders give exactly what the whole ones give */
async function sameBytes() {
  const t = '86h';
  let A = null;
  try {
    const cl = makeCloud(); A = await dev(cl, 'A', VP, {}, seed(1500)); A.cloudObj = cl;
    const r = await on(A, async () => {
      const out = {};
      const strs = ['', 'abc', 'é☕𝒳ন', 'x'.repeat(100000) + 'é' + 'y'.repeat(70001), JSON.stringify(DB), JSON.stringify(DB).repeat(3)];
      out.b64 = (await Promise.all(strs.map(async (s) => (await _b64encAsync(s)) === _b64enc(s)))).every(Boolean);
      out.sig = (await Promise.all(strs.map(async (s) => (await _syncSigAsync(s)) === _syncSig(s)))).every(Boolean);
      const cmp = (a, b) => a.size === b.size && [...a].every(([k, v]) => b.has(k) && b.get(k).sig === v.sig && b.get(k).json === v.json) && a.partial === b.partial && a.seq === b.seq;
      _S1_SLICE_MS = 0;   /* a slice per record */
      _s1Dirty.full = true; const whole = _s1Snap(); const sl = await _s1TakeSnapAsync();
      out.full = cmp(whole, sl); out.fullN = sl.size;
      const ids = DB.articles.slice(0, 40).map((a) => _s1DirtyKey('articles', a.id));
      ids.forEach((k) => _s1Dirty.keys.add(k)); const wholeD = _s1SnapDirty(); const slD = await _s1TakeSnapAsync();
      out.dirty = cmp(wholeD, slD) && !_s1Dirty.keys.size && !_s1Dirty.full; out.dirtyN = slD.size;
      return out;
    });
    check(r.b64, `${t} _b64encAsync gives the same text as _b64enc (ASCII, accents, an emoji, Bengali, 100 KB+, the whole notebook)`);
    check(r.sig, `${t} _syncSigAsync gives the same signature as _syncSig`);
    check(r.full && r.fullN > 1500, `${t} a sliced full snapshot equals the whole one (${r.fullN} records)`);
    check(r.dirty, `${t} a sliced dirty-set snapshot equals the whole one, and clears the dirty set (${r.dirtyN} records)`);
    noErr(A, t);
  } catch (e) { check(false, `${t} threw: ${String(e && e.message || e).split('\n')[0]}`); }
  finally { if (A) await A.ctx.close(); }
}

try {
  if (want('86a')) { for (const plan of ['recs', 'both']) await profile(plan); check(true, '86a the profile table was printed for both plans (see the # lines; not asserted)'); }
  if (want('86b')) { await pauseCase('recs', VP, '390 CPU x4', 4); await pauseCase('both', VP, '390 CPU x4', 4); }
  if (want('86c')) { await pauseCase('recs', VPD, '1440', 0); await pauseCase('both', VPD, '1440', 0); }
  if (['86d', '86e', '86f', '86g'].some(want)) await syncCases();
  if (want('86h')) await sameBytes();
} catch (e) { check(false, `block 86 threw: ${String(e && e.message || e).split('\n')[0]}`); }
const bad = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - bad}/${results.length} passed${bad ? ', ' + bad + ' FAILED' : ''}`);
await browser.close(); srv.close && srv.close();
process.exit(bad ? 1 : 0);
