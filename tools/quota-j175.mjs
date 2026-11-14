#!/usr/bin/env node
/* tools/quota-j175.mjs — v05.96, J175 (block 155): the Firebase free daily limit holds a commit queued for ever; "Send everything" re-sent what the cloud had.
   155a a commit that never settles (reads still work) is NAMED: Send line, ⚙ dot, watchdog banner, Diagnostics; releasing it clears it and the send finishes
   155b a commit that never settles AND reads that fail is the offline case, not "held"
   155c the cloud holds 550 unchanged + 50 different + 400 missing: Send everything writes exactly 450, says "the cloud already holds …", no `gone`
   155d the sig map emptied for 1,000 keys (the cloud holds 700): after a reload the ordinary run checks first and writes 300; with 400 unknown (< 500) it writes all 400 with no check
   155e a read that fails half-way writes nothing and says why; the next press checks again and finishes
   155f JSON.stringify(DB) is unchanged by the resends on the writing device; a second device ends with every note and folder
   155g the words at 390/820/1440: nothing overflows, taps ≥ 44 px at 390
   node tools/quota-j175.mjs [--only=155a,155c]   [--unpatched]: serves origin/main (the checks that need the new code then fail) */
import { playwright, serve, seedDB } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, quiet, waitSeeded, check, results, reopen, push, NB } from './s1-fake.mjs';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const arg = (k, d) => { const a = argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const onlyArg = arg('only', ''); const onlySet = onlyArg ? new Set(onlyArg.split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t) || [...onlySet].some((o) => t.startsWith(o));
function makeBase() {
  const dir = mkdtempSync(join(tmpdir(), 'j175-base-'));
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', `origin/main:${f}`], { encoding: 'buffer', maxBuffer: 1 << 28 })); } catch {} }
  return dir;
}
const pw = await playwright();
const srv = await serve(argv.includes('--unpatched') ? makeBase() : undefined);
const browser = await pw.chromium.launch();
const VPS = [{ w: 390, h: 844, touch: true }, { w: 820, h: 1180, touch: true }, { w: 1440, h: 900, touch: false }];
const errs = [];
const waitFor = async (fn, ms, d, a) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await on(d, fn, a).catch(() => false)) return true; await sleep(200); } return false; };
const HELD = /Firebase is not accepting changes right now, most likely its free daily limit \(about 20,000 changes a day\)\. It carries on by itself after \d{1,2}:\d{2} (am|pm)\./;
const arts = (cloud) => [...cloud.store.keys()].filter((p) => p.startsWith(NB + '/recs/articles~j175-')).length;
const aWrites = (cloud, from) => cloud.log.slice(from).filter((o) => o.t === 'set' && o.p.startsWith(NB + '/recs/articles~j175-')).length;
const goneN = (cloud, from) => cloud.log.slice(from).filter((o) => o.t === 'set' && o.gone).length;
const addNotes = (d, n) => on(d, (n) => { const a0 = DB.articles[0]; for (let i = 0; i < n; i++) DB.articles.push({ ...a0, id: 'j175-n' + i, title: 'Note ' + i, content: '<p>text ' + i + '</p>', folderIds: [...a0.folderIds], tags: [] }); persist(); }, n);
const idOf = (i) => 'articles~j175-n' + i;
/* a cloud that lost / changed some of this device's notes: i in [a,b) */
const cloudDrop = (cloud, a, b) => { for (let i = a; i < b; i++) { const p = NB + '/recs/' + idOf(i); cloud.store.delete(p); cloud.ver.delete(p); } };
const cloudDiff = (cloud, a, b) => { for (let i = a; i < b; i++) { const p = NB + '/recs/' + idOf(i); const v = cloud.store.get(p); if (v) { v.sig = 'different-' + i; cloud.ver.set(p, (cloud.ver.get(p) || 0) + 1); } } };
async function seeded(cloud, name, n, vp = { w: 1440, h: 900, touch: false }, opts = {}) {
  const d = await addDevice(browser, srv.base, cloud, name, { width: vp.w, height: vp.h }, vp.touch, seedDB(), { recsOnly: true, builtinOff: true, ...opts });
  if (n) await addNotes(d, n);
  await push(cloud, d); await waitSeeded(cloud, d, 240000);
  return d;
}
const dbHash = (d) => on(d, () => { const s = JSON.stringify(DB); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return s.length + ':' + h; });
const press = (d) => on(d, () => { window.__sendDone = false; _s1ResendUI().then(() => { window.__sendDone = true; }); });
const sendState = (d) => on(d, () => ({ ..._s1Send, text: _s1SendText(), held: _s1Stat.held, writes: _s1WritesText() }));
const hashes = [];

/* ══ 155a — held ══ */
if (want('155a')) {
  const cloud = makeCloud(); let A = null;
  try {
    A = await seeded(cloud, 'A', 100);
    await on(A, () => { window.__s1StallMs = 1500; });
    cloudDrop(cloud, 0, 80);
    const h0 = await dbHash(A);
    A.holdCommits = true;
    await press(A);
    const t0 = Date.now();
    check(await waitFor(() => !!_s1Stat.held, 1500 + 5000 + 4000, A), `155a within the stall time + 5 s the write is held (${Date.now() - t0} ms)`);
    await sleep(500);
    const s = await sendState(A);
    check(s.state === 'held' && HELD.test(s.text), '155a the Send line says it, with a time', s.text);
    const m = await on(A, () => { const dot = document.getElementById('sync-dot'); const bn = document.getElementById('sw-banner'); return { dot: dot.textContent, why: dot.getAttribute('data-why') || '', banner: bn ? bn.querySelector('.sw-tx').textContent : '', diag: _syncDiagnosticsHTML() }; });
    check(HELD.test(m.dot) && HELD.test(m.why), '155a the ⚙ menu sync line says it (and wraps: data-why)', m.dot);
    check(HELD.test(m.banner), '155a the watchdog banner says it', m.banner);
    check(/Cloud writes<\/td><td[^>]*>Firebase is not accepting changes/.test(m.diag) && /since \d+:\d\d\)/.test(m.diag), '155a Diagnostics: "Cloud writes" shows the held text and "since h:mm"');
    A.holdCommits = false;
    check(await waitFor(() => window.__sendDone === true, 60000, A), '155a releasing the commits lets the send finish');
    await sleep(500);
    const s2 = await sendState(A);
    check(!s2.held && s2.writes === 'accepted' && s2.state === 'done' && arts(cloud) === 100, `155a held clears, the line says accepted, the cloud has all notes (${arts(cloud)})`, s2.text);
    check(await on(A, () => !document.getElementById('sw-banner') || !/not accepting/.test(document.getElementById('sw-banner').innerText)), '155a the banner no longer says it');
    hashes.push(['155a', h0, await dbHash(A)]);
    errs.push(...A.errors);
  } catch (e) { check(false, `155a threw: ${String(e && e.message || e).split('\n')[0]}`); }
  if (A) await A.ctx.close().catch(() => {});
}

/* ══ 155b — held commit + failing reads = offline, not held ══ */
if (want('155b')) {
  const cloud = makeCloud(); let A = null;
  try {
    A = await seeded(cloud, 'A', 20);
    await on(A, () => { window.__s1StallMs = 1500; });
    A.holdCommits = true; A.failReads = true;
    await on(A, () => { const a = DB.articles.find((x) => x.id === 'j175-n1'); a.title = 'edited b'; a.updatedAt = new Date(Date.now() + 5000).toISOString(); persist(); flushPendingPush(); });
    await sleep(1500 + 5000 + 1000);
    const s = await sendState(A);
    const bn = await on(A, () => { const b = document.getElementById('sw-banner'); return b ? b.innerText : ''; });
    check(!s.held && s.writes === 'accepted' && !HELD.test(bn), '155b a stuck commit with failing reads is NOT called "held"', JSON.stringify({ held: s.held, writes: s.writes, bn }));
    A.holdCommits = false; A.failReads = false;
    check(await waitFor(() => !_s1Busy, 60000, A), '155b released: the push goes through');
    errs.push(...A.errors);
  } catch (e) { check(false, `155b threw: ${String(e && e.message || e).split('\n')[0]}`); }
  if (A) await A.ctx.close().catch(() => {});
}

/* ══ 155c / 155f — the cloud holds most of it ══ */
if (want('155c') || want('155f')) {
  const cloud = makeCloud(); let A = null, B = null;
  try {
    A = await seeded(cloud, 'A', 1000);
    cloudDiff(cloud, 550, 600); cloudDrop(cloud, 600, 1000);
    check(arts(cloud) === 600, `155c setup: the cloud holds 600 of 1,000 (550 unchanged, 50 different)`);
    const h0 = await dbHash(A), log0 = cloud.log.length, pr0 = cloud.pagedReads || 0;
    await on(A, () => { window.__ss = new Set(); setInterval(() => window.__ss.add(_s1SendText()), 20); });
    await press(A);
    check(await waitFor(() => window.__sendDone === true, 120000, A), '155c the send finished');
    await quiet(cloud, A);
    const s = await on(A, () => ({ ..._s1Send, seen: [...window.__ss], size: _s1Snap().size }));
    check(aWrites(cloud, log0) === 450 && arts(cloud) === 1000, `155c exactly 400 + 50 records written (${aWrites(cloud, log0)}), the cloud now holds all (${arts(cloud)})`);
    check(goneN(cloud, log0) === 0, '155c no `gone` written');
    check(s.known === s.size - 450 && s.known >= 550, `155c the cloud already holds ${s.known} (every record it had unchanged)`);
    check(s.seen.some((t) => /^Checking [\d,]+ of [\d,]+ in the cloud$/.test(t)) && s.seen.some((t) => new RegExp('^Sending [\\d,]+ of [\\d,]+ records \\(the cloud already holds ' + s.known.toLocaleString('en-US') + '\\)').test(t)), '155c the line: "Checking N of M…", then "Sending N of M (the cloud already holds K)"', JSON.stringify([...s.seen].slice(0, 12)));
    check((cloud.pagedReads || 0) - pr0 >= 3, `155c the check paged through the cloud (${(cloud.pagedReads || 0) - pr0} pages of 300)`);
    hashes.push(['155c', h0, await dbHash(A)]);
    if (want('155f')) {
      B = await addDevice(browser, srv.base, cloud, 'B', { width: 1440, height: 900 }, false, seedDB(), { recsOnly: true, builtinOff: true });
      const wantIds = await on(A, () => ({ a: DB.articles.map((x) => x.id).sort(), f: DB.folders.map((x) => x.id).sort() }));
      check(await waitFor((w) => DB.articles.length >= w, 90000, B, wantIds.a.length), '155f a second device reads the cloud');
      const got = await on(B, () => ({ a: DB.articles.map((x) => x.id).sort(), f: DB.folders.map((x) => x.id).sort() }));
      check(wantIds.a.every((x) => got.a.includes(x)) && wantIds.f.every((x) => got.f.includes(x)), `155f the second device has every note (${got.a.length} of ${wantIds.a.length}) and folder (${got.f.length} of ${wantIds.f.length})`);
      errs.push(...B.errors);
    }
    errs.push(...A.errors);
  } catch (e) { check(false, `155c threw: ${String(e && e.message || e).split('\n')[0]}`); }
  for (const d of [A, B]) if (d) await d.ctx.close().catch(() => {});
}

/* ══ 155d — the tablet's state ══ */
if (want('155d')) {
  const cloud = makeCloud(); let A = null;
  const emptyMap = (d, a, b) => on(d, async ([a, b]) => { const m = await _s1MapLoad(getSyncConfig().notebookId); for (let i = a; i < b; i++) delete m.s[_s1Key('articles', 'j175-n' + i)]; await _idbPut('s1:' + getSyncConfig().notebookId, m); }, [a, b]);
  try {
    A = await seeded(cloud, 'A', 1000);
    cloudDrop(cloud, 700, 1000);
    await emptyMap(A, 0, 1000);
    await reopen(A);
    await waitFor(() => _s1RdCaught === true && _s1WriteGate() === true, 120000, A);
    const log0 = cloud.log.length, pr0 = cloud.pagedReads || 0;
    await on(A, () => { _s1Dirty.full = true; });
    await push(cloud, A);
    await quiet(cloud, A);
    const n = aWrites(cloud, log0);
    check(n === 300 && arts(cloud) === 1000, `155d after a reload the ordinary run checked first and wrote 300 (${n}); the cloud holds ${arts(cloud)}`);
    check((cloud.pagedReads || 0) - pr0 >= 3 && goneN(cloud, log0) === 0, `155d it read the cloud in pages (${(cloud.pagedReads || 0) - pr0}) and wrote no gone`);
    const c = await on(A, () => ({ chk: _s1ChkText(), done: _s1ChkNb }));
    check(/^done /.test(c.chk) && !!c.done, '155d Diagnostics "Checking the cloud" says done', c.chk);
    /* under the limit: 400 unknown keys are written as today, no check */
    await emptyMap(A, 0, 400);
    await on(A, () => { _s1ChkNb = null; });
    const log1 = cloud.log.length, pr1 = cloud.pagedReads || 0;
    await on(A, () => { _s1Dirty.full = true; });
    await push(cloud, A); await quiet(cloud, A);
    check(aWrites(cloud, log1) === 400 && (cloud.pagedReads || 0) === pr1, `155d with 400 unknown (under 500) all 400 are written as before (${aWrites(cloud, log1)}) and nothing was checked (${(cloud.pagedReads || 0) - pr1} pages)`);
    errs.push(...A.errors);
  } catch (e) { check(false, `155d threw: ${String(e && e.message || e).split('\n')[0]}`); }
  if (A) await A.ctx.close().catch(() => {});
}

/* ══ 155e — a read that fails half-way ══ */
if (want('155e')) {
  const cloud = makeCloud(); let A = null;
  try {
    A = await seeded(cloud, 'A', 1000);
    cloudDrop(cloud, 500, 1000);
    const h0 = await dbHash(A), log0 = cloud.log.length;
    const mapN = () => on(A, () => JSON.stringify(_s1Map.s).length);
    const m0 = await mapN();
    A.failListAfter = 1;
    await press(A);
    check(await waitFor(() => window.__sendDone === true, 60000, A), '155e the send stopped');
    const s = await sendState(A);
    check(s.state === 'failed' && /could not be read/.test(s.text) && /nothing was sent/.test(s.text) && aWrites(cloud, log0) === 0 && (await mapN()) === m0, `155e a failed read part-way writes nothing, leaves the list as it was, and says why`, s.text);
    A.failListAfter = null;
    await press(A);
    check(await waitFor(() => window.__sendDone === true, 120000, A), '155e a second press finishes');
    await quiet(cloud, A);
    check(arts(cloud) === 1000 && aWrites(cloud, log0) === 500, `155e it checked again and sent the 500 that were missing (${aWrites(cloud, log0)}); the cloud holds ${arts(cloud)}`);
    hashes.push(['155e', h0, await dbHash(A)]);
    errs.push(...A.errors);
  } catch (e) { check(false, `155e threw: ${String(e && e.message || e).split('\n')[0]}`); }
  if (A) await A.ctx.close().catch(() => {});
}

if (want('155f') || !onlySet) for (const [k, a, b] of hashes) check(a === b, `155f ${k}: JSON.stringify(DB) is unchanged on the writing device`, a + ' → ' + b);

/* ══ 155g — the words at three sizes ══ */
if (want('155g')) {
  for (const vp of VPS) {
    const cloud = makeCloud(); let A = null;
    try {
      A = await seeded(cloud, 'G' + vp.w, 0, vp);
      await on(A, () => { _s1SetHeld(); });
      await sleep(3500);
      const r = await A.page.evaluate(async () => {
        const W = innerWidth, out = { W, doc: document.documentElement.scrollWidth, bad: [] };
        const b = document.getElementById('sw-banner'); out.banner = !!b;
        if (b) { const q = b.getBoundingClientRect(); if (q.left < -1 || q.right > W + 1) out.bad.push('banner'); out.btn = [...b.querySelectorAll('button')].map((x) => Math.round(Math.min(x.getBoundingClientRect().height, 999))); }
        document.getElementById('sb-menu-btn').click(); await new Promise((ok) => setTimeout(ok, 300));
        const dot = document.getElementById('sync-dot'); const dq = dot.getBoundingClientRect();
        out.dot = { l: Math.round(dq.left), r: Math.round(dq.right), clip: dot.scrollWidth > dot.clientWidth + 2, why: !!dot.getAttribute('data-why') };
        if (dq.right > W + 1 || dq.left < -1) out.bad.push('dot');
        openSyncModal(); await new Promise((ok) => setTimeout(ok, 800));
        const mb = document.getElementById('sync-mb'); out.mb = mb.scrollWidth - mb.clientWidth;
        const bt = document.getElementById('s1-resend-btn'); out.resend = bt ? Math.round(bt.getBoundingClientRect().height) : 0;
        const dg = document.getElementById('sync-diag'); out.diag = !!dg && /Cloud writes/.test(dg.innerText) && /free daily limit/.test(dg.innerText);
        return out;
      });
      check(r.banner && !r.bad.length && r.doc <= r.W && r.mb <= 1 && r.diag && r.dot.why && !r.dot.clip, `155g@${vp.w} the held words fit: nothing overflows, the ⚙ line wraps, Diagnostics shows them`, JSON.stringify(r));
      if (vp.w === 390) check(r.btn.every((h) => h >= 44) && r.resend >= 44, `155g@390 buttons are at least 44 px (banner ${r.btn}, Send everything ${r.resend})`);
      errs.push(...A.errors);
    } catch (e) { check(false, `155g@${vp.w} threw: ${String(e && e.message || e).split('\n')[0]}`); }
    if (A) await A.ctx.close().catch(() => {});
  }
}

const real = errs.filter((e) => !/net::ERR|Failed to load resource/.test(e));
check(real.length === 0, '155 no page errors on any sync device', real.slice(0, 3).join(' · '));
await browser.close(); srv.close && srv.close();
const fails = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - fails}/${results.length} passed${fails ? ', ' + fails + ' FAILED' : ''}`);
process.exit(fails ? 1 : 0);
