#!/usr/bin/env node
/* tools/zab-sync-j196.mjs — J196 (block 167): Zabs (DB.jebPockets / DB.jeb) ride in the head doc `_head~0`; phone 18 Zabs, computer 12, both "synced".
   node tools/zab-sync-j196.mjs [--notes=0] */
import { playwright, serve, seedDB } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, quiet, waitSeeded, check, results, push, reopen, NB } from './s1-fake.mjs';
const argv = process.argv.slice(2);
const arg = (k, d) => { const a = argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const NOTES = Number(arg('notes', 0));
const pw = await playwright(); const srv = await serve(); const browser = await pw.chromium.launch();
const waitFor = async (fn, ms, d, a) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await on(d, fn, a).catch(() => false)) return true; await sleep(250); } return false; };
const zn = (d) => on(d, () => [(DB.jebPockets || []).length, (DB.jeb || []).length]);
const addZabs = (d, from, to) => on(d, ([f, t]) => { for (let i = f; i < t; i++) jebAddPocket('Zab ' + i, '✶', '#cccccc'); }, [from, to]);
const mk = (cloud, name) => addDevice(browser, srv.base, cloud, name, { width: 1440, height: 900 }, false, seedDB(), { recsOnly: true, builtinOff: true });
const addNotes = (d, n) => on(d, (n) => { const a0 = DB.articles[0]; for (let i = 0; i < n; i++) DB.articles.push({ ...a0, id: 'j196-n' + i, title: 'N' + i, content: '<p>t' + i + '</p>', folderIds: [...a0.folderIds], tags: [] }); persist(); }, n);
const errs = [];
const cloud = makeCloud(); let A, B;
try {
  A = await mk(cloud, 'A'); if (NOTES) await addNotes(A, NOTES);
  const base = (await zn(A))[0];
  await addZabs(A, 0, 18 - base); await push(cloud, A); await waitSeeded(cloud, A, 240000);
  B = await mk(cloud, 'B');
  check(await waitFor((n) => (DB.jebPockets || []).length >= n, 60000, B, 18), `B (a fresh device) receives A's 18 Zabs: ${(await zn(B))[0]}`);
  /* each Zab-only change, A -> B and B -> A */
  const ops = [
    ['add a Zab', (n) => jebAddPocket('Added ' + n, '★', '#aaaaaa'), (n) => (DB.jebPockets || []).some((p) => p.name === 'Added ' + n)],
    ['rename a Zab', (n) => jebEditPocket(jebPockets()[0].id, { name: 'Renamed ' + n }), (n) => (DB.jebPockets || []).some((p) => p.name === 'Renamed ' + n)],
    ['add an item', (n) => jebAddItem(jebPockets()[1].id, 'Item ' + n), (n) => (DB.jeb || []).some((i) => i.text === 'Item ' + n)],
    ['reorder', (n) => jebMovePocket(jebPockets()[3].id, 0), null],
  ];
  for (const [dir, X, Y] of [['A→B', A, B], ['B→A', B, A]]) {
    for (let k = 0; k < ops.length; k++) {
      const [name, op, test] = ops[k]; const tag = dir + k;
      await on(X, op, tag); await push(cloud, X);
      if (test) check(await waitFor(test, 30000, Y, tag), `${dir} ${name} arrives`);
      else { const ax = await on(X, () => jebPockets().map((p) => p.id).join()); check(await waitFor((w) => jebPockets().map((p) => p.id).join() === w, 30000, Y, ax), `${dir} ${name} arrives`); }
    }
  }
  const [a, b] = [await zn(A), await zn(B)];
  check(a[0] === b[0] && a[1] === b[1], `both devices hold the same number of Zabs and items (A ${a}, B ${b})`);
  await reopen(B);
  await on(A, () => { jebAddPocket('Late', '☆', '#bbbbbb'); }); await push(cloud, A);
  check(await waitFor(() => (DB.jebPockets || []).some((p) => p.name === 'Late'), 30000, B), 'after a reload B receives a later Zab from A');
  const [a2, b2] = [await zn(A), await zn(B)];
  check(a2[0] === b2[0] && a2[1] === b2[1], `same numbers after the reload (A ${a2}, B ${b2})`);
  /* THE OWNER'S STATE: another device (the computer, 12 Zabs, not yet told about the phone's 6) writes ITS head over the phone's.
     The phone's merge changes nothing (it holds all 12 and more), so nothing marks its head new — and its sig map says the cloud already holds it. */
  {
    const HP = NB + '/recs/_head~0', cloud2 = makeCloud();
    const P = await mk(cloud2, 'P'); await addZabs(P, 0, 12 - (await zn(P))[0]); await push(cloud2, P); await waitSeeded(cloud2, P, 120000);
    const stale = JSON.parse(JSON.stringify(cloud2.store.get(HP)));
    await addZabs(P, 0, 6); await push(cloud2, P);
    const full = (await zn(P))[0];
    check(JSON.parse(cloud2.store.get(HP).j).jebPockets.length === full, `setup: the cloud head holds the phone's ${full} Zabs`);
    cloud2.apply([{ t: 'set', p: HP, d: { ...stale, sig: 'computer-head', ver: 'v-computer', at: { __sts: 1 } } }], null);   /* the computer's older head lands last */
    await sleep(1500); await quiet(cloud2, P); await sleep(3000); await quiet(cloud2, P);
    const inCloud = JSON.parse(cloud2.store.get(HP).j).jebPockets.length;
    check(inCloud === full, `the phone puts its Zabs back: the cloud head holds ${inCloud} of ${full}`);
    const C = await mk(cloud2, 'C');
    check(await waitFor((n) => (DB.jebPockets || []).length >= n, 40000, C, full), `the computer gets all ${full} Zabs: ${(await zn(C))[0]}`);
    errs.push(...P.errors, ...C.errors);
  }
  errs.push(...A.errors, ...B.errors);
} catch (e) { check(false, 'threw: ' + String(e && e.message || e).split('\n')[0]); }
check(errs.length === 0, 'no page errors', errs.slice(0, 3).join(' · '));
await browser.close(); srv.close && srv.close();
const fails = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - fails}/${results.length} passed${fails ? ', ' + fails + ' FAILED' : ''}`);
process.exit(fails ? 1 : 0);
