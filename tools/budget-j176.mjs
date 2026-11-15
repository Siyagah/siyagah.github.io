#!/usr/bin/env node
/* tools/budget-j176.mjs — v05.97, J176 (block 156): live inside the free cloud limits.
   156a a fresh device reads a cloud of ~3,000 records in pages of 500, ends with all of it, and writes nothing before it has caught up
   156b the line breaks after page 3: THAT page is retried (never page 1); a reload in the middle continues from the saved cursor
   156c the replica after a paged first read equals the replica after the listener-only read of the same cloud
   156d the automatic check re-reads the whole cloud once; a reload an hour later does not; with the last check 13 h old it does
   156e the daily budget: a first read stops at the limit with the paused words, an ordinary push still goes out, the next Los Angeles day carries it on to the end
   156f a refused read (resource-exhausted; unavailable after one good read, online) is named in the ⚙ line, the banner and Diagnostics; the next good read clears it
   156g JSON.stringify(DB) of an existing device is unchanged by 156d–156f; no page errors; the words fit at 390/820/1440
   node tools/budget-j176.mjs [--only=156a,156e]   [--unpatched]: serves origin/main (the checks that need the new code then fail) */
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
const NOTES = +arg('notes', 2990);
function makeBase() {
  const dir = mkdtempSync(join(tmpdir(), 'j176-base-'));
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', `origin/main:${f}`], { encoding: 'buffer', maxBuffer: 1 << 28 })); } catch {} }
  return dir;
}
const pw = await playwright();
const srv = await serve(argv.includes('--unpatched') ? makeBase() : undefined);
const browser = await pw.chromium.launch();
const errs = [];
const waitFor = async (fn, ms, d, a) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await on(d, fn, a).catch(() => false)) return true; await sleep(200); } return false; };
const PAUSED = /^Paused: today's share of the free cloud limit is used\. Carries on by itself after \d{1,2}:\d{2} (am|pm)\.$/;
const RDHELD = /Firebase is not answering reads right now, most likely its free daily limit \(about 50,000 reads a day\)\. It carries on by itself after \d{1,2}:\d{2} (am|pm)\./;
const recKeys = (cloud) => [...cloud.store.keys()].filter((p) => p.startsWith(NB + '/recs/'));
const addNotes = (d, n) => on(d, (n) => { const a0 = DB.articles[0]; for (let i = 0; i < n; i++) DB.articles.push({ ...a0, id: 'j176-n' + i, title: 'Note ' + i, content: '<p>text ' + i + '</p>', folderIds: [...a0.folderIds], tags: [] }); persist(); }, n);
const dbJson = (d) => on(d, () => JSON.stringify(DB));
const dbHash = (d) => on(d, () => { const s = JSON.stringify(DB); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return s.length + ':' + h; });
const caught = (d) => on(d, () => !!_s1RdCaught && !_s1RepUnmerged && !_pullInFlight);
const repDump = (d) => on(d, () => JSON.stringify([..._s1Rep.map.entries()].map(([k, e]) => [k, e.sig, e.at, !!e.gone]).sort((a, b) => (a[0] < b[0] ? -1 : 1))));
const pagesOf = (cloud, name) => (cloud.pageLog || []).filter((x) => x.dev === name);
const hdr = [];
const mkDev = (cloud, name, opts = {}, vp = { w: 1440, h: 900, touch: false }) => addDevice(browser, srv.base, cloud, name, { width: vp.w, height: vp.h }, vp.touch, seedDB(), { recsOnly: true, builtinOff: true, ...opts });

/* ── the cloud: one device seeds ~3,000 records; then every record gets its own server time (groups of 3 share one, to test ties), 40 ms apart ── */
const cloud = makeCloud(); let A = null, R = 0;
try {
  A = await mkDev(cloud, 'A');
  await addNotes(A, NOTES);
  await push(cloud, A); await waitSeeded(cloud, A, 300000);
  const keys = recKeys(cloud).sort(); const base = Date.now() - 3600000;
  keys.forEach((k, i) => { const ms = base + Math.floor(i / 3) * 40; cloud.store.get(k).at = { __ts: [Math.floor(ms / 1000), (ms % 1000) * 1e6] }; });
  cloud.lastMs = Date.now() + 1000;
  R = keys.length;
  check(R >= 2900, `156 setup: the cloud holds ${R} records`);
  errs.push(...A.errors);
} catch (e) { check(false, `156 setup threw: ${String(e && e.message || e).split('\n')[0]}`); }
if (A) await A.ctx.close().catch(() => {});
const PAGES = [Math.ceil(R / 500), Math.ceil(R / 500) + 1];

let B = null, hBefore = null;
/* ══ 156a — pages ══ */
if (want('156a') || want('156d') || want('156e') || want('156f') || want('156g')) {
  try {
    const p0 = cloud.pagedAt || 0, log0 = cloud.log.length;
    B = await mkDev(cloud, 'B');
    let early = 0, seenLive = 0;
    const t0 = Date.now();
    for (;;) {
      const w = cloud.log.slice(log0).filter((o) => o.dev === 'B' && o.t === 'set').length;   /* read the log FIRST, then the state: a write before "caught up" cannot hide */
      const c = await caught(B);
      if (w > 0 && !c) early++;
      if (c || Date.now() - t0 > 180000) break;
      await sleep(60);
    }
    await quiet(cloud, B);
    const pages = (cloud.pagedAt || 0) - p0;
    const st = await on(B, () => ({ n: DB.articles.length, live: [..._s1Rep.map.entries()].filter(([k, e]) => !e.gone && k !== '_head~0').length, caught: _s1RdCaught, cursor: _s1Rep.cursor }));
    check(pages >= PAGES[0] && pages <= PAGES[1], `156a ${R} records were read in ${pages} paged reads of 500 (expected ${PAGES[0]}–${PAGES[1]})`);
    check(st.n >= NOTES && st.live >= R - 2, `156a the replica holds ${st.live} of ${R} records, DB has ${st.n} notes`);
    check(pagesOf(cloud, 'B').every((x) => x.n <= 500), '156a no page is bigger than 500');
    check(early === 0 && st.caught, `156a nothing was written before the device had caught up (${early} early writes)`);
    errs.push(...B.errors);
  } catch (e) { check(false, `156a threw: ${String(e && e.message || e).split('\n')[0]}`); }
}

/* ══ 156b — a broken line: the same page again; a reload continues ══ */
if (want('156b')) {
  let D = null, E = null;
  try {
    D = await mkDev(cloud, 'D', { failListAfter: 3, init: 'window.__s1PageRetry=[1500];' });
    const stalled = await waitFor(() => !!(_s1Stat.rd && _s1Stat.rd.paging && _s1Stat.rd.paging.nextAt), 60000, D);
    const n1 = pagesOf(cloud, 'D').length;
    check(stalled && n1 === 3, `156b the line broke after page 3 (${n1} pages served) and the device is waiting to retry that page`);
    const txt = await on(D, () => _s1DiagText());
    check(/reading the cloud: 1,500 (of about [\d,]+|records so far)/.test(txt) && /trying it again at \d+:\d\d/.test(txt), '156b Diagnostics "Per-note copy" says how far it is and when it tries again', txt);
    D.failListAfter = null;
    await waitFor(() => !!_s1RdCaught, 90000, D); await quiet(cloud, D);
    const ps = pagesOf(cloud, 'D');
    check(ps.filter((x) => x.after === null).length === 1, `156b only ONE page started from the beginning (page 1); the retry was the same page 4 (${ps.length} pages in all)`, JSON.stringify(ps.map((x) => x.after && x.after.slice(0, 12))));
    check(ps.length >= PAGES[0] && ps.length <= PAGES[1], `156b ${ps.length} pages in all, none read twice`);
    const live = await on(D, () => [..._s1Rep.map.entries()].filter(([k, e]) => !e.gone && k !== '_head~0').length);
    check(live >= R - 2, `156b the replica holds ${live} of ${R}`);
    errs.push(...D.errors);
    /* a reload in the middle */
    E = await mkDev(cloud, 'E', { failListAfter: 3, init: 'window.__s1PageRetry=[60000];' });
    check(await waitFor(() => !!(_s1Stat.rd && _s1Stat.rd.paging && _s1Stat.rd.paging.nextAt), 60000, E), '156b (reload) the second device stopped after page 3');
    const before = pagesOf(cloud, 'E').length;
    E.failListAfter = null; await reopen(E);
    await waitFor(() => !!_s1RdCaught, 90000, E); await quiet(cloud, E);
    const after = pagesOf(cloud, 'E').slice(before);
    const served = after.reduce((a, x) => a + x.n, 0);
    const done = await on(E, () => ({ n: DB.articles.length, live: [..._s1Rep.map.entries()].filter(([k, e]) => !e.gone && k !== '_head~0').length }));
    check(served < R - 1000 && served > 0 && done.live >= R - 2 && done.n >= NOTES, `156b after the reload it continued from the saved cursor: ${served} records served again of ${R} (3 pages = 1,500 were already saved); the replica holds ${done.live}`);
    errs.push(...E.errors);
  } catch (e) { check(false, `156b threw: ${String(e && e.message || e).split('\n')[0]}`); }
  for (const d of [D, E]) if (d) await d.ctx.close().catch(() => {});
}

/* ══ 156c — the paged read gives the replica the listener gives ══ */
if (want('156c') && B) {
  let C = null;
  try {
    C = await mkDev(cloud, 'C', { init: 'window.__s1NoPaging=true;' });
    await waitFor(() => !!_s1RdCaught, 180000, C); await quiet(cloud, C); await quiet(cloud, B); await sleep(1500);
    const [x, y] = [await repDump(B), await repDump(C)];
    const ka = JSON.parse(x), kb = JSON.parse(y);
    const same = x === y;
    const diff = same ? '' : `${ka.length} vs ${kb.length} records; first difference ${JSON.stringify(ka.find((r, i) => JSON.stringify(r) !== JSON.stringify(kb[i])))}`;
    check(same && ka.length >= R - 2, `156c the replica after paging equals the replica after the listener-only read (${ka.length} records: same keys, sigs and times)`, diff);
    errs.push(...C.errors);
  } catch (e) { check(false, `156c threw: ${String(e && e.message || e).split('\n')[0]}`); }
  if (C) await C.ctx.close().catch(() => {});
}

/* ══ 156d — the automatic check never re-reads the whole cloud twice inside 12 h ══ */
if (B && (want('156d') || want('156g'))) hBefore = await dbJson(B);
if (want('156d') && B) {
  try {
    const dropPicks = async () => {   /* delete from the cloud 5 of the 12 records the spot check will ask for */
      const picks = await on(B, () => { const m = _s1Map; const keys = Object.keys(m.s).filter((k) => m.s[k] !== 'gone' && (k.startsWith('articles~') || k.startsWith('folders~'))); const out = [], step = Math.max(1, keys.length / 12); for (let i = 0; i < 12 && Math.floor(i * step) < keys.length; i++) out.push(keys[Math.floor(i * step)]); return out; });
      picks.slice(0, 5).forEach((k) => { const p = NB + '/recs/' + k; cloud.store.delete(p); cloud.ver.delete(p); });
      return picks.length;
    };
    const setChk = (ageMs) => on(B, async (age) => { const m = await _s1MapLoad(getSyncConfig().notebookId); if (age == null) delete m.chkAt; else m.chkAt = Date.now() - age; await _idbPut('s1:' + getSyncConfig().notebookId, m); }, ageMs);
    const settle = (d) => waitFor(() => ['ok', 'skipped', 'sent', 'paused', 'send-failed', 'gave-up', 'small'].includes(_s1Auto.state), 120000, d);
    await quiet(cloud, B);
    check((await dropPicks()) === 12, '156d setup: the cloud lacks 5 of the 12 records the spot check asks for');
    await setChk(null);
    let p0 = cloud.pagedAt || 0; await reopen(B);
    const ok1 = await settle(B); const re1 = (cloud.pagedAt || 0) - p0;
    check(ok1 && re1 >= PAGES[0], `156d with a third missing the check re-read the whole cloud once (${re1} paged reads)`);
    await quiet(cloud, B);
    await setChk(3600000);   /* the last check was an hour ago */
    p0 = cloud.pagedAt || 0; await reopen(B);
    const ok2 = await settle(B); await sleep(1500); const re2 = (cloud.pagedAt || 0) - p0;
    const at = await on(B, () => ({ s: _s1Auto.state, t: _s1AutoText() }));
    check(ok2 && re2 === 0 && at.s === 'skipped' && /not read again/.test(at.t), `156d a reload an hour later did not re-read (${re2} paged reads); Diagnostics: ${at.t}`);
    await setChk(13 * 3600000);
    p0 = cloud.pagedAt || 0; await reopen(B);
    const ok3 = await settle(B); const re3 = (cloud.pagedAt || 0) - p0;
    check(ok3 && re3 >= PAGES[0], `156d with the last check 13 h old it re-reads again (${re3} paged reads)`);
    errs.push(...B.errors);
  } catch (e) { check(false, `156d threw: ${String(e && e.message || e).split('\n')[0]}`); }
}

let hD = null; if (B && want('156g')) hD = await dbJson(B);   /* after 156d: the window 156d is compared over */
/* ══ 156e — the daily budget ══ */
if (want('156e')) {
  let F = null, P = null;
  try {
    const T0 = Date.now();
    const p0 = cloud.pagedAt || 0;
    F = await mkDev(cloud, 'F', { init: 'window.__bigReads=1000;' });
    check(await waitFor(() => !!_s1Stat.big, 90000, F), '156e the first read stopped when its daily share ran out');
    await sleep(800);
    const served = pagesOf(cloud, 'F').reduce((a, x) => a + x.n, 0);
    const info = await on(F, () => ({ big: _s1Stat.big, text: _s1DiagText(), line: _bgText(), caught: _s1RdCaught, used: _bgUsed('r') }));
    check(info.big && PAUSED.test(info.big.why), '156e the paused words, with a time', info.big && info.big.why);
    check(served >= 1000 && served <= 1500 && !info.caught, `156e it stopped at about 1,000 reads (${served} served, ${info.used} counted)`);
    check(info.text.includes(info.big.why) && /Big jobs today/.test(await on(F, () => _syncDiagnosticsHTML())) && /reads 1,\d{3} of 1,000/.test(info.line), '156e Diagnostics shows the paused words and "Big jobs today"', info.line);
    /* an ordinary push on a device that HAS caught up goes out even with its budget used up (this device's own push waits for its first read, as always) */
    const cl0 = cloud.log.length;
    P = await mkDev(cloud, 'P'); await waitFor(() => !!_s1RdCaught, 120000, P); await quiet(cloud, P);
    await on(P, () => { _bgRoll(); _bg.r = 99999; _bg.w = 99999; });
    await on(P, () => { const a = DB.articles.find((x) => x.id === 'j176-n1'); a.title = 'edited e'; a.updatedAt = new Date(Date.now() + 5000).toISOString(); persist(); flushPendingPush(); });
    await sleep(1500); await quiet(cloud, P);
    const w = cloud.log.slice(cl0).filter((o) => o.dev === 'P' && o.t === 'set' && o.p.endsWith('/recs/articles~j176-n1')).length;
    check(w >= 1, `156e an ordinary push still went out with the budget used up (${w} write)`);
    /* the next Los Angeles days carry it on to the end */
    let day = 0, finished = false;
    while (day < 6 && !finished) {
      day++;
      await on(F, (ms) => { window.__s1BigNow = ms; }, T0 + day * 26 * 3600000);
      finished = await waitFor(() => !!_s1RdCaught, 30000, F);
      if (!finished) await waitFor(() => !!_s1Stat.big, 20000, F);
    }
    await quiet(cloud, F);
    const fin = await on(F, () => ({ n: DB.articles.length, live: [..._s1Rep.map.entries()].filter(([k, e]) => !e.gone && k !== '_head~0').length, big: _s1Stat.big }));
    const cl = recKeys(cloud).length, cn = [...cloud.store.keys()].filter((k) => k.startsWith(NB + '/recs/articles~j176-')).length;   /* 156d left the cloud 5 records short; the device must hold what the cloud holds */
    check(finished && fin.live >= cl - 2 && fin.n >= cn && !fin.big && day >= 3, `156e after ${day} Los Angeles days it carried on by itself and finished: ${fin.live} of ${cl} records, ${fin.n} notes`);
    errs.push(...F.errors);
  } catch (e) { check(false, `156e threw: ${String(e && e.message || e).split('\n')[0]}`); }
  for (const d of [F, P]) if (d) await d.ctx.close().catch(() => {});
}

let hF0 = null; if (B && want('156g')) hF0 = await dbJson(B);   /* before 156f (156e edits a note from another device on purpose, so it is not in a window) */
/* ══ 156f — a refused read is named ══ */
if (want('156f') && B) {
  let N = null;
  try {
    const look = () => on(B, () => { const dot = document.getElementById('sync-dot'); const bn = document.getElementById('sw-banner'); return { dot: dot.textContent, why: dot.getAttribute('data-why') || '', banner: bn ? bn.innerText : '', diag: _syncDiagnosticsHTML(), held: _s1Stat.rdHeld }; });
    const probe = () => on(B, () => _s1CloudCheck(getSyncConfig().notebookId, 10, 'auto', 10).then(() => 'ok', (e) => String(e && e.message)));
    for (const code of ['resource-exhausted', 'unavailable']) {
      await on(B, () => { _bgRoll(); _bg.r = 0; });
      B.failReads = true; B.failCode = code;
      await probe(); await sleep(3500);
      const m = await look();
      check(RDHELD.test(m.dot) && RDHELD.test(m.why), `156f (${code}) the ⚙ sync line says it, with a time (and wraps)`, m.dot);
      check(RDHELD.test(m.banner), `156f (${code}) the watchdog banner says it`, m.banner);
      check(/Cloud reads<\/td><td[^>]*>Firebase is not answering reads/.test(m.diag) && /since \d+:\d\d\)/.test(m.diag) && /Per-note copy<\/td><td[^>]*>[^<]*Firebase is not answering reads/.test(m.diag), `156f (${code}) Diagnostics "Cloud reads" and "Per-note copy" show it`);
      B.failReads = false; B.failCode = null;
      await probe(); await sleep(1200);
      const m2 = await look();
      check(!m2.held && !RDHELD.test(m2.why) && /Cloud reads<\/td><td[^>]*>answering/.test(m2.diag), `156f (${code}) the next read that works clears it`);
    }
    /* "unavailable" before any read in this session worked is only offline, not a named limit */
    N = await mkDev(cloud, 'N', { failListAfter: 0, init: 'window.__s1PageRetry=[60000];' });
    await sleep(3000);
    check(await on(N, () => !_s1Stat.rdHeld && !_s1ReadOk), '156f "unavailable" before any good read is not called the limit');
    errs.push(...B.errors, ...N.errors);
  } catch (e) { check(false, `156f threw: ${String(e && e.message || e).split('\n')[0]}`); }
  if (N) await N.ctx.close().catch(() => {});
}

let hF1 = null; if (B && want('156g')) hF1 = await dbJson(B);
/* ══ 156g — DB unchanged, the words at three sizes ══ */
/* Architect review: compared key by key, value by value. Two things a merge may do without changing any content are allowed: give a record that had NO
   updatedAt its first stamp (the existing _stampRecordTouches sweep; seen on the four built-in noteKindCats), and rebuild DB with its top-level keys in
   another order. Any other difference fails and is listed. */
const dbSame = (h0, h1) => {
  const a0 = JSON.parse(h0), b0 = JSON.parse(h1), stamped = [];
  for (const k of Object.keys(b0)) if (Array.isArray(b0[k]) && Array.isArray(a0[k])) b0[k].forEach((r, i) => { const o = a0[k][i]; if (r && o && typeof r === 'object' && o.updatedAt === undefined && r.updatedAt !== undefined && r.id === o.id) { delete r.updatedAt; stamped.push(k + '~' + r.id); } });
  const dif = [];
  for (const k of new Set([...Object.keys(a0), ...Object.keys(b0)])) { const x = JSON.stringify(a0[k]), y = JSON.stringify(b0[k]); if (x !== y) { if (a0[k] && b0[k] && typeof a0[k] === 'object') { for (const kk of new Set([...Object.keys(a0[k]), ...Object.keys(b0[k])])) if (JSON.stringify(a0[k][kk]) !== JSON.stringify(b0[k][kk])) dif.push(k + '.' + kk + ': ' + String(JSON.stringify(a0[k][kk])).slice(0, 140) + ' → ' + String(JSON.stringify(b0[k][kk])).slice(0, 140)); } else dif.push(k); } }
  return { ok: dif.length === 0, stamped, dif };
};
/* Architect review: compared key by key, value by value, over the two steps that must change nothing (156d's skipped re-read, 156f's refused read);
   156e edits a note from a second device on purpose, so it sits between the windows. Allowed without a change of content: a first updatedAt on a record
   that had none (the existing _stampRecordTouches sweep; seen on the four built-in noteKindCats) and the top-level keys in another order. */
if (want('156g') && B && hBefore && hD) { const r = dbSame(hBefore, hD); check(r.ok, `156g DB of the existing device is unchanged by 156d (apart from a first updatedAt on ${r.stamped.length} record(s) that had none)`, r.dif.slice(0, 6).join(' | ')); }
if (want('156g') && B && hF0 && hF1) { const r = dbSame(hF0, hF1); check(r.ok, `156g DB of the existing device is unchanged by 156f (apart from a first updatedAt on ${r.stamped.length} record(s) that had none)`, r.dif.slice(0, 6).join(' | ')); }
if (want('156g')) {
  for (const vp of [{ w: 390, h: 844, touch: true }, { w: 820, h: 1180, touch: true }, { w: 1440, h: 900, touch: false }]) {
    const c2 = makeCloud(); let G = null;
    try {
      G = await mkDev(c2, 'G' + vp.w, {}, vp);
      await waitSeeded(c2, G, 60000);
      await on(G, () => { _s1ReadFailNote({ code: 'resource-exhausted' }); _bgPause('r', 'page'); });
      await sleep(3500);
      const r = await G.page.evaluate(async () => {
        const W = innerWidth, out = { W, doc: document.documentElement.scrollWidth, bad: [] };
        const b = document.getElementById('sw-banner'); out.banner = !!b;
        if (b) { const q = b.getBoundingClientRect(); if (q.left < -1 || q.right > W + 1) out.bad.push('banner'); }
        document.getElementById('sb-menu-btn').click(); await new Promise((ok) => setTimeout(ok, 300));
        const dot = document.getElementById('sync-dot'); const dq = dot.getBoundingClientRect();
        out.dot = { clip: dot.scrollWidth > dot.clientWidth + 2, why: !!dot.getAttribute('data-why') };
        if (dq.right > W + 1 || dq.left < -1) out.bad.push('dot');
        openSyncModal(); await new Promise((ok) => setTimeout(ok, 800));
        const mb = document.getElementById('sync-mb'); out.mb = mb.scrollWidth - mb.clientWidth;
        const dg = document.getElementById('sync-diag'); out.diag = !!dg && /Cloud reads/.test(dg.innerText) && /Big jobs today/.test(dg.innerText) && /free daily limit/.test(dg.innerText);
        out.tbl = dg ? dg.scrollWidth - dg.clientWidth : 0;
        return out;
      });
      check(r.banner && !r.bad.length && r.doc <= r.W && r.mb <= 1 && r.diag && r.dot.why && !r.dot.clip, `156g@${vp.w} the new words fit: nothing overflows, the ⚙ line wraps, Diagnostics shows them`, JSON.stringify(r));
      errs.push(...G.errors);
    } catch (e) { check(false, `156g@${vp.w} threw: ${String(e && e.message || e).split('\n')[0]}`); }
    if (G) await G.ctx.close().catch(() => {});
  }
}
/* ══ 156h — Architect review: a device that already holds notes never merges a half-read replica (the "merge the FULL replica" rule) ══ */
if (want('156h') && B) {
  try {
    await on(B, () => { window.__mergeN = 0; const f = window._pullRecsMerge; window._pullRecsMerge = function () { window.__mergeN++; return f.apply(this, arguments); }; window.__s1PageRetry = [1500]; });
    B.failListAfter = 2;
    await on(B, () => { _s1ReRead(); });
    const stalled = await waitFor(() => !!(_s1Stat.rd && _s1Stat.rd.paging && _s1Stat.rd.paging.nextAt), 60000, B);
    await sleep(2500);
    const mid = await on(B, () => ({ n: window.__mergeN, fresh: _s1Stat.rd.paging.fresh }));
    check(stalled && mid.fresh === false && mid.n === 0, `156h a device holding notes whose re-read stalls after page 2 merges nothing meanwhile (fresh ${mid.fresh}, ${mid.n} merges)`);
    B.failListAfter = null;
    await waitFor(() => !!_s1RdCaught && !(_s1Stat.rd.paging && _s1Stat.rd.paging.active), 90000, B); await quiet(cloud, B);
    const end = await on(B, () => ({ n: window.__mergeN, notes: DB.articles.length, caught: _s1RdCaught, active: !!(_s1Stat.rd.paging && _s1Stat.rd.paging.active), unmerged: !!_s1RepUnmerged }));
    check(end.caught && !end.active && !end.unmerged && end.notes >= NOTES, `156h the re-read finished, nothing waits to be merged, and every note is still there (${end.notes} notes; ${end.n} merges were needed)`);
    await on(B, () => { window.__s1PageRetry = undefined; });
  } catch (e) { check(false, `156h threw: ${String(e && e.message || e).split('\n')[0]}`); }
}
if (B) await B.ctx.close().catch(() => {});

const real = errs.filter((e) => !/net::ERR|Failed to load resource/.test(e));
check(real.length === 0, '156 no page errors on any sync device', real.slice(0, 3).join(' · '));
await browser.close(); srv.close && srv.close();
const fails = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - fails}/${results.length} passed${fails ? ', ' + fails + ' FAILED' : ''}`);
process.exit(fails ? 1 : 0);
