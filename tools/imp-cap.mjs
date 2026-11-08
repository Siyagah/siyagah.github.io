#!/usr/bin/env node
/* tools/imp-cap.mjs — v05.77, J128 (block 136): ONE daily import limit for every import.
   `_IMP_MARKS` lists every importer's mark; `_enxWindow(now)` counts them all, over notes AND Trash, so an Evernote import sees Keep notes
   and a Keep import sees Evernote notes. Runs at 390 / 820 / 1440.
   136a  the list holds fromEvernote and fromKeep
   136b  cap 10 and 6 fromKeep notes stamped now: the Evernote room (what its dialog uses) is 4, not 10; the Keep room is 4
   136c  cap 10 and 6 fromEvernote notes: the Keep room is 4 and the Evernote room is 4
   136d  3 of each: both rooms are 4 (one quota, not two)
   136e  notes stamped 25 h ago do not count; a mark in Trash does
   `--only=136b`. */
import { playwright, serve, seedDB } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, check, results } from './s1-fake.mjs';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);
const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];
const T0 = '2026-10-01T00:00:00.000Z';

const pw = await playwright();
const srv = await serve();
const browser = await pw.chromium.launch({ args: ['--js-flags=--max-old-space-size=8192'] });
const each = async (id, fn) => {
  for (const vp of VPS) {
    let d = null;
    try { d = await addDevice(browser, srv.base, makeCloud(), 'D' + vp.name, { width: vp.w, height: vp.h }, vp.touch, seedDB(T0), {}); d.page.setDefaultTimeout(30000); await sleep(800); await fn(d, vp); }
    catch (e) { check(false, `${id}@${vp.name} threw: ${String(e && e.message || e).split('\n')[0]}`); }
    finally { if (d) await d.ctx.close(); }
  }
};
/* put n notes carrying `mark`, stamped `hoursAgo` hours before the test clock; inTrash puts them in Trash instead; returns the rooms */
const setup = (d, spec) => on(d, (s) => {
  window.__enxCap = 10; window.__enxNow = Date.now();
  DB.articles = DB.articles.filter((a) => !a.fromEvernote && !a.fromKeep); DB.trash = (DB.trash || []).filter((t) => !(t.item && (t.item.fromEvernote || t.item.fromKeep)));
  let k = 0;
  for (const [mark, n, hoursAgo, trash] of s) for (let i = 0; i < n; i++) {
    const a = { id: 'cap-' + mark + '-' + (k++), title: 'cap ' + k, content: '<p>x</p>', folderIds: [], tags: [], createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z' };
    a[mark] = { at: new Date(Date.now() - hoursAgo * 3600000).toISOString() };
    if (trash) DB.trash.push({ type: 'article', item: a, deletedAt: new Date().toISOString() }); else DB.articles.push(a);
  }
  const now = _enxNowMs();
  return { enx: _enxWindow(now).room, kp: _kpWindow(now).room, used: _enxWindow(now).used, marks: _IMP_MARKS.slice() };
}, spec);

try {
  if (want('136a')) await each('136a', async (d, vp) => {
    const r = await setup(d, []);
    check(r.marks.includes('fromEvernote') && r.marks.includes('fromKeep'), `136a@${vp.name} _IMP_MARKS holds fromEvernote and fromKeep`, JSON.stringify(r.marks));
    check(r.enx === 10 && r.kp === 10, `136a@${vp.name} nothing imported: both rooms are the whole cap (10)`, JSON.stringify(r));
  });
  if (want('136b')) await each('136b', async (d, vp) => {
    const r = await setup(d, [['fromKeep', 6, 0]]);
    check(r.enx === 4, `136b@${vp.name} 6 Keep notes today: the Evernote room is 4, not 10`, JSON.stringify(r));
    check(r.kp === 4, `136b@${vp.name} the Keep room is 4`, JSON.stringify(r));
  });
  if (want('136c')) await each('136c', async (d, vp) => {
    const r = await setup(d, [['fromEvernote', 6, 0]]);
    check(r.kp === 4 && r.enx === 4, `136c@${vp.name} 6 Evernote notes today: the Keep room is 4 and the Evernote room is 4`, JSON.stringify(r));
  });
  if (want('136d')) await each('136d', async (d, vp) => {
    const r = await setup(d, [['fromEvernote', 3, 1], ['fromKeep', 3, 2]]);
    check(r.enx === 4 && r.kp === 4 && r.used === 6, `136d@${vp.name} 3 of each: one quota, both rooms are 4`, JSON.stringify(r));
  });
  if (want('136e')) await each('136e', async (d, vp) => {
    const old = await setup(d, [['fromKeep', 6, 25], ['fromEvernote', 6, 25]]);
    check(old.enx === 10 && old.kp === 10 && old.used === 0, `136e@${vp.name} notes stamped 25 h ago do not count`, JSON.stringify(old));
    const tr = await setup(d, [['fromKeep', 6, 0, true]]);
    check(tr.enx === 4 && tr.kp === 4, `136e@${vp.name} Keep notes in Trash still count against the Evernote room`, JSON.stringify(tr));
  });
} finally {
  await browser.close(); await srv.close();
}
const bad = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - bad}/${results.length} passed${bad ? ', ' + bad + ' FAILED' : ''}`);
process.exit(bad ? 1 : 0);
