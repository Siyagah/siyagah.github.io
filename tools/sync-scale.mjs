#!/usr/bin/env node
/* tools/sync-scale.mjs — v05.45, J69 ("Check the sync in detail"): the sync path at the owner's size. Every other sync check runs on a
   few hundred notes at most; the owner's notebook holds about 12,500 records. Two devices on the S1 fake (per-record copy only), N notes
   in 60 folders:
     sc-a  device A writes all N notes to the per-record copy;
     sc-b  a NEW device B (an empty notebook) receives every note and folder, and says how long it took;
     sc-c  B edits a note → it reaches A; A moves a note to Trash → it leaves B and sits in B's Trash; both hold the same notes;
     sc-d  B loses its own copy (both local databases), keeps its replica: the next start shows every note again (J65's shape);
     sc-e  nothing but the one deleted note was ever marked "gone" by either device, and once settled neither device writes (no ping-pong);
     sc-f  no page errors.
   `node tools/sync-scale.mjs [--notes=12500]` */
import { playwright, serve, seedDB } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, quiet, waitSeeded, check, results } from './s1-fake.mjs';

const N = +((process.argv.find((a) => a.startsWith('--notes=')) || '').split('=')[1] || 12500);
const F = 60;
function bigSeed() {
  const db = seedDB(), a0 = db.articles[0], f0 = db.folders[0];
  for (let j = 0; j < F; j++) db.folders.push({ ...f0, id: 'sc-f' + j, name: 'Folder ' + j, parentId: null, order: 100 + j });
  for (let i = 0; i < N; i++) db.articles.push({ ...a0, id: 'sc-n' + i, title: 'Note ' + i, content: '<p>Text of note ' + i + ' — লেখা ' + i + '</p>', folderIds: ['sc-f' + (i % F)], tags: [] });
  return db;
}
const pw = await playwright();
const srv = await serve();
const browser = await pw.chromium.launch();
const cloud = makeCloud();
const cnt = (d) => on(d, () => ({ n: DB.articles.filter((a) => String(a.id).startsWith('sc-n')).length, f: DB.folders.filter((x) => String(x.id).startsWith('sc-f')).length,
  t: (DB.trash || []).filter((x) => String((x.item || {}).id || '').startsWith('sc-n')).length }));
const goneBy = (name) => cloud.log.filter((o) => o.t === 'set' && o.gone && o.dev === name).map((o) => o.p || o.k || '');
const waitFor = async (fn, ms) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return Date.now() - t; await sleep(500); } return -1; };
const errs = [];
let A = null, B = null;
try {
  const t0 = Date.now();
  A = await addDevice(browser, srv.base, cloud, 'A', { width: 1440, height: 900 }, false, bigSeed(), { recsOnly: true });
  check(await waitSeeded(cloud, A, 1800000), `sc-a device A wrote its ${N} notes to the per-record copy (${Math.round((Date.now() - t0) / 1000)} s)`);
  await quiet(cloud, A);

  const t1 = Date.now();
  B = await addDevice(browser, srv.base, cloud, 'B', { width: 390, height: 844 }, true, seedDB(), { recsOnly: true });
  const tb = await waitFor(async () => { const c = await cnt(B); return c.n === N && c.f === F; }, 1800000);
  const cb = await cnt(B);
  check(tb >= 0, `sc-b a NEW phone receives every note and folder: ${cb.n} of ${N} notes, ${cb.f} of ${F} folders, in ${Math.round((Date.now() - t1) / 1000)} s from opening`);
  await quiet(cloud, B); await quiet(cloud, A);

  await on(B, () => { const a = DB.articles.find((x) => x.id === 'sc-n7'); a.content = '<p>edited on the phone</p>'; a.updatedAt = new Date().toISOString(); persist(); });
  const te = await waitFor(() => on(A, () => /edited on the phone/.test((DB.articles.find((x) => x.id === 'sc-n7') || {}).content || '')), 120000);
  await on(A, () => { trashArt('sc-n9'); });
  const td = await waitFor(async () => { const c = await cnt(B); return c.n === N - 1 && c.t >= 1; }, 120000);
  const ca = await cnt(A), cb2 = await cnt(B);
  check(te >= 0 && td >= 0 && ca.n === cb2.n && ca.n === N - 1, `sc-c an edit on the phone reaches the laptop (${Math.round(te / 1000)} s); a note moved to Trash on the laptop leaves the phone and sits in its Trash (${Math.round(td / 1000)} s); both hold ${ca.n} notes`, JSON.stringify({ ca, cb2 }));
  await quiet(cloud, B); await quiet(cloud, A);

  /* sc-d — B loses its own copy (J65's shape), keeps the replica */
  await B.page.goto(srv.base + '/manifest.json');
  await B.page.evaluate(async () => {
    const del = (n) => new Promise((ok) => { const r = indexedDB.deleteDatabase(n); r.onsuccess = r.onerror = r.onblocked = () => ok(); });
    await del('siyagah-local-v1'); await del('siyagah-localrecs-v1');
    try { const e = JSON.parse(localStorage.getItem('my-notebook-v1') || 'null'); if (e) { e.articles = []; e.folders = []; localStorage.setItem('my-notebook-v1', JSON.stringify(e)); } } catch (e) {}
  });
  const t3 = Date.now();
  await B.page.goto(srv.base + '/', { waitUntil: 'domcontentloaded' });
  B.qsubs.clear(); B.qDelivered = 0; B.qChangeLog = [];
  await B.page.waitForFunction(() => window.__appBooted === true, null, { timeout: 300000 });
  const tr = await waitFor(async () => (await cnt(B)).n === N - 1, 1800000);
  check(tr >= 0, `sc-d the phone lost its own copy and kept its sync copy: after a restart it shows every note again (${(await cnt(B)).n} of ${N - 1}, ${Math.round((Date.now() - t3) / 1000)} s)`);
  await quiet(cloud, B); await quiet(cloud, A);

  const gA = goneBy('A'), gB = goneBy('B');
  const okGone = gB.length === 0 && gA.length >= 1 && gA.every((p) => /sc-n9/.test(p));
  check(okGone, `sc-e nothing was marked deleted but the one note sent to Trash (laptop ${gA.length}, phone ${gB.length})`, JSON.stringify({ gA: gA.slice(0, 4), gB: gB.slice(0, 4) }));
  const w0 = cloud.log.length; await sleep(20000);
  check(cloud.log.length === w0, `sc-e settled: in 20 s neither device wrote to the cloud (${cloud.log.length - w0} writes)`);
  errs.push(...A.errors, ...B.errors);
  check(errs.length === 0, 'sc-f no page errors', errs.slice(0, 3).join(' · '));
} catch (e) { check(false, `sync-scale threw: ${String(e && e.message || e).split('\n')[0]}`); }
finally { await browser.close(); srv.close && srv.close(); }
const fails = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - fails}/${results.length} passed${fails ? ', ' + fails + ' FAILED' : ''}`);
process.exit(fails ? 1 : 0);
