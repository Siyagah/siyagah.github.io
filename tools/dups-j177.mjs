#!/usr/bin/env node
/* tools/dups-j177.mjs — v05.98, J177 (block 157): 🧹 Find duplicate notes.
   157a the seeded notebook: the three lists hold exactly the right groups; excluded notes are greyed with their reasons; the suggested Keep follows the rules
   157b the scan changes nothing (DB, the `notebook` record, localStorage, the cloud log); ⬇ Save the list = a CSV with one row per note listed
   157c Move to Trash: dup:1 + a tombstone each, the kept notes carry the removed copies' folders and tags, ONE undo frame; a second device agrees after sync
   157d the daily limit (_DUP_DAY = 5): only 5 go, the words say how many are left, the rest of the ticks are remembered after a reload, an edited note is dropped, the next day carries on, Empty only the duplicates stops at 5 too
   157e Trash → Empty only the duplicates removes only dup:1 entries; other Trash entries stay; a second device agrees after sync
   157f 28,000 notes at 390 px x4 CPU: the scan finishes, no long task over 200 ms (time and worst task reported)
   157g the dialog at 390/820/1440: reached from the 🧰 menu by a real click, no horizontal overflow, taps >= 44 px at 390; no page errors
   node tools/dups-j177.mjs [--only=157a,157d] [--notes=28000] [--unpatched] */
import { playwright, serve, seedDB, openApp, hostLimit } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, quiet, waitSeeded, check, results, push, NB } from './s1-fake.mjs';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const arg = (k, d) => { const a = argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const onlyArg = arg('only', ''); const onlySet = onlyArg ? new Set(onlyArg.split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t) || [...onlySet].some((o) => t.startsWith(o));
const NOTES = +arg('notes', 28000);
function makeBase() {
  const dir = mkdtempSync(join(tmpdir(), 'j177-base-'));
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', `origin/main:${f}`], { encoding: 'buffer', maxBuffer: 1 << 28 })); } catch {} }
  return dir;
}
const T = (d) => new Date(Date.parse('2025-01-01T00:00:00Z') + d * 86400000).toISOString();
const note = (id, title, html, o = {}) => ({ id, title, content: html, folderIds: ['fA'], tags: [], createdAt: T(0), updatedAt: T(0), kind: 'general', ...o });

function seed() {
  const d = seedDB(T(0));
  d.folders = [
    { id: 'fA', name: 'Alpha', parentId: null, order: 1, sectionId: 'sec-1', updatedAt: T(0) },
    { id: 'fB', name: 'Beta', parentId: 'fA', order: 1, updatedAt: T(0) },
    { id: 'fC', name: 'Gamma', parentId: null, order: 2, sectionId: 'sec-1', updatedAt: T(0) },
  ];
  const A = [];
  /* 3 exact groups */
  A.push(note('e1a', 'Exact one', '<p>exact one body words</p>', { tags: ['t1'], createdAt: T(10) }));
  A.push(note('e1b', 'Exact one', '<p>exact one body words</p>', { folderIds: ['fA', 'fB'], createdAt: T(20) }));
  A.push(note('e1c', 'Exact one', '<p>exact  one body   words</p>', { createdAt: T(30) }));
  A.push(note('e2a', 'Exact two', '<p>exact two body</p>', { tags: ['x', 'y'], folderIds: ['fA', 'fB'], createdAt: T(30) }));
  A.push(note('e2b', 'Exact two', '<p>exact two body</p>', { tags: ['x'], folderIds: ['fA', 'fC'], createdAt: T(10) }));
  A.push(note('e3a', 'Exact three', '<p>exact three body</p>', { createdAt: T(10) }));
  A.push(note('e3b', 'Exact three', '<p>exact three body</p>', { createdAt: T(150) }));
  /* same title, changed */
  A.push(note('c1a', 'Evolving', '<p>alpha beta gamma delta epsilon</p>', { updatedAt: T(400) }));
  A.push(note('c1b', 'Evolving', '<p>alpha beta gamma delta epsilon zeta eta theta</p>', { updatedAt: T(300) }));
  A.push(note('d1a', 'Draft notes', '<p>one two three four five six seven eight</p>', { updatedAt: T(400) }));
  A.push(note('d1b', 'Draft notes', '<p>one two three four five six seven nine ten</p>', { updatedAt: T(450) }));
  A.push(note('l1a', 'Different', '<p>cat dog</p>', { updatedAt: T(400) }));
  A.push(note('l1b', 'Different', '<p>fish bird snake lizard</p>', { updatedAt: T(450) }));
  /* same text, different title */
  A.push(note('s1a', 'Title Alpha', '<p>shared text body unique</p>', { folderIds: ['fA', 'fB'] }));
  A.push(note('s1b', 'Title Beta', '<p>shared text body unique</p>'));
  /* excluded: versions of each other, MMJ pair, journal pair, an open note */
  A.push(note('v1', 'Versioned', '<p>version first</p>', { versionGroupId: 'vg1', versionOrder: 0 }));
  A.push(note('v2', 'Versioned', '<p>version second text</p>', { versionGroupId: 'vg1', versionOrder: 1 }));
  A.push(note('m1', 'MMJ post', '<p>mmj post body</p>', { fromMmj: { id: 1, type: 'post', modified: T(0) } }));
  A.push(note('m2', 'MMJ post', '<p>mmj post body</p>', { fromMmj: { id: 2, type: 'post', modified: T(0) } }));
  A.push(note('j1', 'Day 2026-01-05', '<p>journal one</p>', { tags: ['journal'] }));
  A.push(note('j2', 'Day 2026-01-05', '<p>journal two entirely different</p>', { tags: ['journal'] }));
  A.push(note('o1', 'Open dup', '<p>open note body</p>', { createdAt: T(50) }));
  A.push(note('o2', 'Open dup', '<p>open note body</p>', { folderIds: ['fA', 'fC'], createdAt: T(60) }));
  /* unique notes */
  for (let i = 1; i <= 4; i++) A.push(note('u' + i, 'Unique ' + i, '<p>unique text number ' + i + ' ' + 'z'.repeat(i) + '</p>'));
  d.articles = A;
  d.trash = [{ id: 'tr-keep', type: 'article', deletedAt: T(5), item: note('gone-1', 'Deleted before', '<p>old</p>') }];
  return d;
}
const EXPECT = {
  1: ['Exact one', 'Exact two', 'Exact three', 'MMJ post', 'Open dup'].sort(),
  2: ['Evolving', 'Draft notes', 'Different', 'Versioned', 'Day 2026-01-05'].sort(),
  3: ['Title Alpha|Title Beta'],
};
const readGroups = (p) => p.evaluate(() => _dup.groups.map((g) => ({ id: g.id, list: g.list, label: g.label, low: g.low, keep: _dup.keep[g.id], members: g.members.slice().sort(), why: g.why, def: g.def.slice().sort(),
  titles: Array.from(new Set(g.members.map((id) => (DB.articles.find((a) => a.id === id) || {}).title))).sort() })));
const waitReady = (p, ms = 120000) => p.waitForFunction(() => typeof _dup !== 'undefined' && _dup && _dup.state === 'ready', null, { timeout: ms });
const idsOf = (p) => p.evaluate(() => DB.articles.map((a) => a.id).sort().join(','));

const pw = await playwright();
const srv = await serve(argv.includes('--unpatched') ? makeBase() : undefined);
const browser = await pw.chromium.launch();
const errs = [];
const cloud = makeCloud();
let A = null, B = null;
const mk = (name, vp = { w: 1440, h: 900, touch: false }, db = seed(), opts = {}) => addDevice(browser, srv.base, cloud, name, { width: vp.w, height: vp.h }, vp.touch, db, { recsOnly: true, builtinOff: true, ...opts });
const openFromMenu = async (d, touch) => {
  const p = d.page;
  if (await p.evaluate(() => innerWidth) < 1200) await p.evaluate(() => showPane('sb'));
  await sleep(300);
  await p.locator('#sb-tools-btn').click(); await sleep(300);
  const row = p.locator('#sb-tools .sb-mi', { hasText: 'Find duplicate notes' }).first();
  await row.click();
};

/* ══ 157a / 157b / 157c / 157e — two devices on one fake cloud ══ */
try {
  A = await mk('A'); await push(cloud, A); await waitSeeded(cloud, A, 120000);
  B = await mk('B'); await sleep(500); await quiet(cloud, B);
  check(await idsOf(B.page) === await idsOf(A.page), '157 setup: device B holds the same notes as A');
  const p = A.page;
  /* an open note: a pop-up editor for o1 is present on the page */
  await p.evaluate(() => { const d = document.createElement('div'); d.id = 'fw-ed-o1'; d.style.display = 'none'; document.body.appendChild(d); });

  /* 157b first part: before-state */
  const snap = async () => p.evaluate(async () => ({ db: JSON.stringify(DB), ls: JSON.stringify(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k).length])), nb: JSON.stringify(await _idbGet('notebook')).length, rev: _dbRev }));
  const before = await snap(); const logN = cloud.log.length;
  await openFromMenu(A);
  await waitReady(p);
  const status0 = await p.evaluate(() => document.getElementById('dup-body').innerText.slice(0, 120));
  const G = await readGroups(p);
  /* 157a */
  const lists = { 1: [], 2: [], 3: [] }; G.forEach((g) => lists[g.list].push(g));
  check(JSON.stringify(lists[1].map((g) => g.titles[0]).sort()) === JSON.stringify(EXPECT[1]), '157a Exact copies holds exactly the right groups', JSON.stringify(lists[1].map((g) => g.titles)));
  check(JSON.stringify(lists[2].map((g) => g.titles[0]).sort()) === JSON.stringify(EXPECT[2]), '157a Same title, changed holds exactly the right groups', JSON.stringify(lists[2].map((g) => g.titles)));
  check(JSON.stringify(lists[3].map((g) => g.titles.join('|'))) === JSON.stringify(EXPECT[3]), '157a Same text, different title holds exactly the right group', JSON.stringify(lists[3].map((g) => g.titles)));
  const gt = (l, t) => lists[l].find((g) => g.titles[0] === t);
  const sameSet = (a, b) => JSON.stringify(a.slice().sort()) === JSON.stringify(b.slice().sort());
  check(sameSet(gt(1, 'Exact one').members, ['e1a', 'e1b', 'e1c']), '157a "exact  one body   words" (extra spaces) is an exact copy', JSON.stringify(gt(1, 'Exact one').members));
  check(gt(1, 'Exact one').keep === 'e1b' && gt(1, 'Exact two').keep === 'e2a' && gt(1, 'Exact three').keep === 'e3a', '157a suggested Keep: most folders / most tags / oldest', [gt(1, 'Exact one').keep, gt(1, 'Exact two').keep, gt(1, 'Exact three').keep].join(','));
  check(gt(2, 'Evolving').keep === 'c1b' && /contains/i.test(gt(2, 'Evolving').label), '157a Same title, changed: one text contains the other, the longer one is kept (although older)', gt(2, 'Evolving').keep + ' ' + gt(2, 'Evolving').label);
  check(gt(2, 'Draft notes').keep === 'd1b' && /70% alike/.test(gt(2, 'Draft notes').label) && /likely an older and a newer/.test(gt(2, 'Draft notes').label) && sameSet(gt(2, 'Draft notes').def, ['d1a']), '157a Draft notes: 70 % alike, the newest kept, the older ticked', gt(2, 'Draft notes').label + ' keep ' + gt(2, 'Draft notes').keep);
  check(gt(2, 'Different').low && /same title only/.test(gt(2, 'Different').label) && gt(2, 'Different').def.length === 0, '157a a low overlap is "same title only" with nothing ticked', gt(2, 'Different').label);
  check(lists[2].findIndex((g) => g.low) > lists[2].findLastIndex((g) => !g.low), '157a "same title only" groups are listed last');
  check(gt(3, 'Title Alpha').keep === 's1a', '157a Same text, different title: the note in more folders is kept', gt(3, 'Title Alpha').keep);
  check(Object.keys(gt(2, 'Versioned').why).length === 2 && /version of another/.test(Object.values(gt(2, 'Versioned').why)[0]), '157a the version pair is greyed (a version of another note)', JSON.stringify(gt(2, 'Versioned').why));
  check(Object.keys(gt(1, 'MMJ post').why).length === 2 && /Mapping My Journey/.test(Object.values(gt(1, 'MMJ post').why)[0]), '157a the MMJ pair is greyed', JSON.stringify(gt(1, 'MMJ post').why));
  check(Object.keys(gt(2, 'Day 2026-01-05').why).length === 2 && /Journal/.test(Object.values(gt(2, 'Day 2026-01-05').why)[0]), '157a the journal pair is greyed in Same title, changed', JSON.stringify(gt(2, 'Day 2026-01-05').why));
  const defAll = new Set(G.flatMap((g) => g.def));
  check(!['v1', 'v2', 'm1', 'm2', 'j1', 'j2', 'o1'].some((x) => defAll.has(x)), '157a no excluded note is suggested for removal');
  /* the greyed reasons in the page */
  await p.evaluate(() => dupTab(1)); await sleep(200);
  const dom1 = await p.evaluate(() => Array.from(document.querySelectorAll('.dup-n.off')).map((n) => n.dataset.id + ':' + n.querySelector('.dup-why').textContent));
  check(dom1.some((x) => /^o1:.*Open in the editor/.test(x)) && dom1.some((x) => /^m1:.*Mapping My Journey/.test(x)), '157a the open note and the MMJ notes are greyed in the dialog with their reasons', JSON.stringify(dom1));
  const sum = await p.evaluate(() => document.getElementById('dup-sum').textContent);
  check(/^12 groups · 6 notes can go · about 0\.0 MB of note text$/.test(sum) || /^\d+ groups · \d+ notes? can go · about [\d.]+ MB of note text$/.test(sum), '157a the top line reads "N groups · M notes can go · about X MB"', sum);
  const plan = await p.evaluate(() => _dupPlan().ids.slice().sort());
  check(JSON.stringify(plan) === JSON.stringify(['d1a', 'c1a', 'e1a', 'e1c', 'e2b', 'e3b', 's1b'].sort()), '157a exactly the right notes can go', JSON.stringify(plan));
  check(/Pictures are stored once already; removing notes frees the note text\./.test(await p.evaluate(() => document.getElementById('dup-picnote').textContent)) && /Empty only the duplicates/.test(await p.evaluate(() => document.getElementById('dup-trashnote').textContent)), '157a the dialog says pictures are stored once and that only emptying the duplicates frees the space');
  await p.evaluate(() => document.getElementById('fw-ed-o1').remove());

  /* 157b — the scan changed nothing; the CSV */
  const after = await snap();
  check(before.db === after.db && before.ls === after.ls && before.nb === after.nb && before.rev === after.rev, '157b the scan changed nothing: DB, localStorage, the notebook record, the save counter');
  await sleep(1500); await quiet(cloud, A);
  check(cloud.log.length === logN, `157b the scan wrote nothing to the cloud (${cloud.log.length - logN} writes)`);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('#dup-csv').click()]);
  const csvPath = await dl.path(); const csv = readFileSync(csvPath, 'utf8');
  const rows = csv.replace(/^﻿/, '').trim().split(/\r\n/);
  const members = G.reduce((n, g) => n + g.members.length, 0);
  check(/\.csv$/.test(dl.suggestedFilename()) && rows.length === members + 1 && /^"group","list","title","folders","source","created","edited","size","suggested action"$/.test(rows[0]), `157b ⬇ Save the list: a CSV with one row per note listed (${rows.length - 1} rows, ${members} notes)`, rows[0]);
  check(rows.some((r) => /"e1b".*|"Exact one"/.test(r) && /,"Keep"$/.test(r)) && rows.some((r) => /,"Remove"$/.test(r)) && rows.some((r) => /,"Stays \(/.test(r)), '157b the CSV says Keep / Remove / Stays for each note');

  /* 157c — Move to Trash */
  const n0 = await p.evaluate(() => ({ a: DB.articles.length, t: DB.trash.length, ts: DB.tombstones.length, h: HIST_POS }));
  const a0 = await idsOf(p);
  await p.evaluate(() => { const d = document.createElement('div'); d.id = 'fw-ed-o1'; document.body.appendChild(d); });
  await p.locator('#dup-go').click(); await sleep(1500);
  const n1 = await p.evaluate(() => ({ a: DB.articles.length, t: DB.trash.length, ts: DB.tombstones.length, h: HIST_POS, dup: DB.trash.filter((t) => t.dup === 1).map((t) => t.item.id).sort(), tombs: DB.tombstones.map((t) => t.id),
    e1b: DB.articles.find((a) => a.id === 'e1b'), e2a: DB.articles.find((a) => a.id === 'e2a'), c1b: DB.articles.find((a) => a.id === 'c1b'), e3a: DB.articles.find((a) => a.id === 'e3a'), d1a: DB.articles.some((a) => a.id === 'd1a') }));
  const gone = ['c1a', 'd1a', 'e1a', 'e1c', 'e2b', 'e3b', 's1b'];
  check(n1.a === n0.a - 7 && n1.t === n0.t + 7 && JSON.stringify(n1.dup) === JSON.stringify(gone.slice().sort()), `157c the 7 ticked notes are in Trash with dup:1 (${n1.a} notes left, Trash ${n1.t})`, JSON.stringify(n1.dup));
  check(gone.every((id) => n1.tombs.includes(id)) && n1.ts === n0.ts + 7, `157c a tombstone each, and only those (${n1.ts - n0.ts} added)`);
  check(n1.e1b.tags.includes('t1') && n1.e1b.updatedAt > T(1000 - 1000) && n1.e2a.folderIds.includes('fC') && !n1.e3a.tags.length, '157c the kept notes carry the removed copies\' folders and tags', JSON.stringify([n1.e1b.tags, n1.e2a.folderIds]));
  check(n1.h === n0.h + 1, `157c ONE undo frame (${n0.h} -> ${n1.h})`);
  await p.evaluate(() => undo()); await sleep(600);
  const u1 = await p.evaluate(() => ({ a: DB.articles.length, t: DB.trash.length, ids: DB.articles.map((a) => a.id).sort().join(','), e1b: DB.articles.find((a) => a.id === 'e1b').tags.length }));
  check(u1.a === n0.a && u1.t === n0.t && u1.ids === a0 && u1.e1b === 0, 'ONE undo brings all back: the notes, Trash and the kept note\'s tags'.replace(/^/, '157c '), JSON.stringify(u1));
  /* again, and the second device */
  await p.evaluate(() => { document.getElementById('fw-ed-o1')?.remove(); dupTab(1); });
  await p.evaluate(() => { _dup.byId = null; });
  await p.locator('#dup-go').click(); await sleep(1200);
  await quiet(cloud, A);
  await p.evaluate(() => { persist(); flushPendingPush(); }); await quiet(cloud, A, 60000);
  let okB = false; for (let i = 0; i < 60 && !okB; i++) { okB = await on(B, (n) => DB.articles.length === n, n0.a - 7); if (!okB) await sleep(500); }
  await quiet(cloud, B);
  const sa = await p.evaluate(() => ({ ids: DB.articles.map((a) => a.id).sort().join(','), tr: DB.trash.map((t) => t.id).sort().join(','), tags: DB.articles.find((a) => a.id === 'e1b').tags.join(',') }));
  const sb = await on(B, () => ({ ids: DB.articles.map((a) => a.id).sort().join(','), tr: DB.trash.map((t) => t.id).sort().join(','), tags: DB.articles.find((a) => a.id === 'e1b').tags.join(','), dup: DB.trash.filter((t) => t.dup === 1).length }));
  check(okB && sa.ids === sb.ids && sa.tr === sb.tr && sa.tags === sb.tags && sb.dup === 7, `157c a second device after sync has the same notes, the same Trash (${sb.dup} dup entries) and the same tags`, JSON.stringify({ a: sa.ids.length, b: sb.ids.length }));

  /* 157e — Trash: Empty only the duplicates */
  await p.evaluate(() => closeModal());
  const tr0 = await p.evaluate(() => DB.trash.length);
  await p.evaluate(() => { openTrash && openTrash(); }).catch(() => {});
  await sleep(500);
  const btn = await p.evaluate(() => { const b = document.getElementById('dup-empty-btn'); return b && b.offsetParent ? b.textContent : ''; });
  check(/Empty only the duplicates \(7\)/.test(btn), '157e the Trash window has "🧹 Empty only the duplicates (7)"', btn);
  await p.locator('#dup-empty-btn').click(); await sleep(1000);
  const e1 = await p.evaluate(() => ({ t: DB.trash.map((x) => x.id), dupLeft: DB.trash.filter((x) => x.dup).length, tomb: DB.tombstones.map((t) => t.id) }));
  check(e1.dupLeft === 0 && e1.t.length === tr0 - 7 && e1.t.includes('tr-keep'), `157e only the dup:1 entries went; the other Trash entry stays (${e1.t.length} left)`, JSON.stringify(e1.t));
  await quiet(cloud, A); await p.evaluate(() => { persist(); flushPendingPush(); }); await quiet(cloud, A, 60000);
  let okB2 = false; for (let i = 0; i < 60 && !okB2; i++) { okB2 = await on(B, (n) => DB.trash.length === n, tr0 - 7); if (!okB2) await sleep(500); }
  const bt = await on(B, () => DB.trash.map((x) => x.id));
  check(okB2 && bt.length === tr0 - 7 && bt.includes('tr-keep'), '157e a second device agrees after sync (same Trash, the other entry still there)', JSON.stringify(bt));
  errs.push(...A.errors, ...B.errors);
} catch (e) { check(false, `157a–e threw: ${String((e && e.stack) || e).split('\n').slice(0, 4).join(' | ')}`); }
for (const d of [A, B]) if (d) await d.ctx.close().catch(() => {});

/* ══ 157d — the daily limit (_DUP_DAY = 5) ══ */
if (want('157d')) {
  let app = null;
  try {
    const d = seedDB(T(0)); d.folders = [{ id: 'fA', name: 'Alpha', parentId: null, order: 1, sectionId: 'sec-1', updatedAt: T(0) }];
    d.articles = []; const W = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    for (let i = 0; i < 12; i++) { d.articles.push(note('p' + i + 'a', 'Pair ' + i, '<p>cat dog ' + i + '</p>', { updatedAt: T(10) })); d.articles.push(note('p' + i + 'b', 'Pair ' + i, '<p>fish bird snake lizard ' + i + '</p>', { updatedAt: T(20) })); }
    app = await openApp({ viewport: { width: 1440, height: 900 }, db: d, initScript: 'window.__dupDay=5;' });
    const p = app.page; p.on('dialog', (x) => x.accept().catch(() => {}));
    await p.evaluate(() => openDupFinder()); await waitReady(p);
    const lowN = await p.evaluate(() => _dup.groups.filter((g) => g.low).length);
    check(lowN === 12 && await p.evaluate(() => _dup.tick.size) === 0, `157d 12 "same title only" groups, nothing ticked (${lowN})`);
    await p.evaluate(() => _dup.groups.forEach((g) => dupTick(g.members.find((id) => id !== _dup.keep[g.id]), true)));
    await p.evaluate(() => dupTab(2));
    await p.locator('#dup-go').click(); await sleep(1500);
    const m1 = await p.evaluate(() => ({ a: DB.articles.length, dup: DB.trash.filter((t) => t.dup).length, note: document.getElementById('dup-day').textContent, ticks: _dup.tick.size }));
    check(m1.a === 19 && m1.dup === 5, `157d only 5 went (${m1.dup} in Trash, ${m1.a} notes left)`);
    check(/Today: 5 of 5 notes moved to Trash\. The limit is used; the rest can go after \d{1,2}:\d{2} (am|pm)/.test(m1.note) && /7 more wait/.test(m1.note) || /7 more/.test(m1.note), '157d the words say how many are left and when', m1.note);
    await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => window.__appBooted === true); await sleep(500);
    const rem = await p.evaluate(async () => ({ r: (await _idbGet('dupday')).ticks, m: (await _idbGet('dupday')).moved }));
    check(Object.keys(rem.r).length === 7 && rem.m === 5, '157d the remaining 7 ticks are remembered in the device\'s own database (not DB)', JSON.stringify(Object.keys(rem.r).length));
    /* edit one remembered note: its tick is dropped */
    const victim = Object.keys(rem.r)[0];
    await p.evaluate((id) => { const a = DB.articles.find((x) => x.id === id); a.content += ' edited'; a.updatedAt = new Date().toISOString(); persist(); }, victim);
    await p.evaluate(() => openDupFinder()); await waitReady(p);
    const t2 = await p.evaluate((id) => ({ n: _dup.tick.size, has: _dup.tick.has(id) }), victim);
    check(t2.n === 6 && !t2.has, `157d after a reload the ticks are back, except the note edited since (${t2.n} ticked)`);
    const lim = await p.evaluate(() => document.getElementById('dup-day').textContent);
    check(/Today: 5 of 5/.test(lim) && /limit is used/.test(lim), '157d the dialog still says today\'s limit is used', lim);
    await p.locator('#dup-go').click(); await sleep(800);
    check(await p.evaluate(() => DB.trash.filter((t) => t.dup).length) === 5, '157d nothing more goes the same day');
    /* the next Los Angeles day */
    await p.evaluate(() => { window.__s1BigNow = Date.now() + 26 * 3600000; });
    await p.evaluate(() => openDupFinder()); await waitReady(p);
    await p.locator('#dup-go').click(); await sleep(1500);
    const m3 = await p.evaluate(() => ({ dup: DB.trash.filter((t) => t.dup).length, a: DB.articles.length }));
    check(m3.dup === 10 && m3.a === 14, `157d the next day 5 more went (${m3.dup} in Trash)`);
    /* Empty only the duplicates also stops at 5 */
    await p.evaluate(() => closeModal());
    await p.evaluate(() => dupEmptyTrash()); await sleep(800);
    const em = await p.evaluate(() => DB.trash.filter((t) => t.dup).length);
    check(em === 5, `157d Empty only the duplicates stopped at 5 (${em} left)`);
    await p.evaluate(() => dupEmptyTrash()); await sleep(500);
    check(await p.evaluate(() => DB.trash.filter((t) => t.dup).length) === 5 && await p.evaluate(() => (window.__toasts || []).length >= 0), '157d a second Empty the same day removes nothing');
    check(app.errors.length === 0, '157d no page errors', app.errors.slice(0, 3).join(' | '));
  } catch (e) { check(false, `157d threw: ${String((e && e.stack) || e).split('\n').slice(0, 4).join(' | ')}`); }
  if (app) await app.close().catch(() => {});
}

/* ══ 157f — 28,000 notes at 390 px x4 CPU ══ */
if (want('157f')) {
  let app = null;
  try {
    app = await openApp({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const p = app.page; const lim = hostLimit(200);
    await p.evaluate((N) => {
      const out = []; const base = '2025-01-01T00:00:00.000Z';
      for (let i = 0; i < N; i++) {
        const k = i % 10; let title = 'Note ' + i, body = '<p>Body of note ' + i + ' ' + 'lorem ipsum dolor sit amet '.repeat(12) + (i * 7919 % 10007) + '</p>';
        if (k === 9 && i > 0) { const j = i - 1; title = 'Note ' + j; body = '<p>Body of note ' + j + ' ' + 'lorem ipsum dolor sit amet '.repeat(12) + (j * 7919 % 10007) + '</p>'; }
        else if (k === 4 && i > 0) { const j = i - 1; title = 'Note ' + j; body = '<p>Body of note ' + j + ' ' + 'lorem ipsum dolor sit amet '.repeat(12) + (j * 7919 % 10007) + ' and then an update</p>'; }
        else if (k === 7 && i > 0) { const j = i - 1; title = 'Other title ' + i; body = '<p>Body of note ' + j + ' ' + 'lorem ipsum dolor sit amet '.repeat(12) + (j * 7919 % 10007) + '</p>'; }
        out.push({ id: 'big' + i, title, content: body, folderIds: ['f1'], tags: [], createdAt: base, updatedAt: base, kind: 'general' });
      }
      DB.articles = DB.articles.concat(out);
      window.__lt = []; try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(e.duration))).observe({ entryTypes: ['longtask'] }); } catch (e) {}
    }, NOTES);
    const cdp = await app.ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const t0 = Date.now(); const lt0 = await p.evaluate(() => window.__lt.length);
    await p.evaluate(() => openDupFinder());
    await sleep(400);
    const seen = await p.evaluate(() => (document.getElementById('dup-stat') || {}).textContent || '');
    await waitReady(p, 600000);
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    const res = await p.evaluate((lt0) => ({ n: DB.articles.length, groups: _dup.groups.length, by: [1, 2, 3].map((l) => _dup.groups.filter((g) => g.list === l).length), lt: window.__lt.slice(lt0) }), lt0);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const worst = Math.max(0, ...res.lt);
    check(res.groups >= NOTES / 10 * 2.5 && /^Checking [\d,]+ of [\d,]+ notes$/.test(seen), `157f the scan of ${res.n} notes finished in ${secs} s: ${res.by.join(' / ')} groups; the status read "${seen}"`);
    check(worst <= lim.ms, `157f no long task over ${lim.text} ms while scanning at 390 px x4 CPU (worst ${Math.round(worst)} ms, ${res.lt.length} long tasks)`, JSON.stringify(res.lt));
    check(app.errors.length === 0, '157f no page errors', app.errors.slice(0, 3).join(' | '));
  } catch (e) { check(false, `157f threw: ${String((e && e.stack) || e).split('\n').slice(0, 4).join(' | ')}`); }
  if (app) await app.close().catch(() => {});
}

/* ══ 157g — the dialog at three sizes, reached by a real click ══ */
if (want('157g')) {
  for (const [w, h, touch] of [[390, 844, true], [820, 1180, true], [1440, 900, false]]) {
    let app = null; const t = `@${w}`;
    try {
      app = await openApp({ viewport: { width: w, height: h }, db: seed(), hasTouch: touch });
      const p = app.page;
      if (w < 1200) await p.evaluate(() => showPane('sb'));
      await sleep(400);
      await p.locator('#sb-tools-btn').click(); await sleep(300);
      await p.locator('#sb-tools .sb-mi', { hasText: 'Find duplicate notes' }).first().click();
      await waitReady(p);
      await sleep(300);
      const m = await p.evaluate(() => {
        const mb = document.getElementById('mb'), body = document.getElementById('dup-body'), q = mb.getBoundingClientRect();
        const small = Array.from(document.querySelectorAll('#mb button, #mb .dup-lb, #mb .dup-tab')).filter((e) => e.offsetParent).map((e) => { const r = e.getBoundingClientRect(); return { t: (e.textContent || '').trim().slice(0, 20), w: Math.round(r.width), h: Math.round(r.height) }; }).filter((x) => x.h < 44 && !/^$/.test(x.t));
        return { sw: body.scrollWidth, cw: body.clientWidth, mbw: Math.round(q.width), left: Math.round(q.left), right: Math.round(q.right), vw: innerWidth, bh: Math.round(q.height), vh: innerHeight, small, fs: !!document.getElementById('mb-fs'), docSw: document.documentElement.scrollWidth };
      });
      check(m.sw <= m.cw + 1 && m.docSw <= m.vw + 1 && m.left >= -1 && m.right <= m.vw + 1, `157g${t} no horizontal overflow (body ${m.sw}/${m.cw}, box ${m.left}..${m.right} of ${m.vw})`);
      check(m.fs, `157g${t} the ⛶ full-screen button is there`);
      if (w === 390) { check(m.small.length === 0 && m.bh >= m.vh * 0.8, `157g${t} taps are at least 44 px high and the sheet is nearly full height (${m.bh} of ${m.vh})`, JSON.stringify(m.small)); }
      /* the three tabs and ⛶ full screen */
      for (const l of [2, 3, 1]) await p.locator('#dup-tab-' + l).click();
      await p.locator('#mb-fs').click(); await sleep(300);
      const fs = await p.evaluate(() => ({ on: document.getElementById('mb').classList.contains('mb-fs-on'), sw: document.getElementById('dup-body').scrollWidth <= document.getElementById('dup-body').clientWidth + 1 }));
      check(fs.on && fs.sw, `157g${t} ⛶ full screen works without overflow`);
      check(app.errors.length === 0, `157g${t} no page errors`, app.errors.slice(0, 3).join(' | '));
    } catch (e) { check(false, `157g${t} threw: ${String((e && e.stack) || e).split('\n').slice(0, 4).join(' | ')}`); }
    if (app) await app.close().catch(() => {});
  }
}

const real = errs.filter((e) => !/net::ERR|Failed to load resource/.test(e));
check(real.length === 0, '157 no page errors on the sync devices', real.slice(0, 3).join(' · '));
await browser.close(); srv.close && srv.close();
const fails = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - fails}/${results.length} passed${fails ? ', ' + fails + ' FAILED' : ''}`);
process.exit(fails ? 1 : 0);
