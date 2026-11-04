#!/usr/bin/env node
/* tools/enx-dups.mjs — v05.67, J111 + J112 (block 127).

   J111  📂 Move to folder… in the folder menu — real right-click on a folder row → the row → the searchable picker → pick.
   127a  the row is in ORGANISE; the picker opens ("Top level" first), the folder itself and its subfolders are greyed with a reason;
         a tap on a greyed row does nothing; a pick moves the folder last among its new siblings and stamps updatedAt;
         "Top level" works; into another section's folder takes that section; merged both ways with a stale copy the move holds.
         Phone: a full-width sheet, rows >= 44 px. No page errors.
   J112  the duplicate Evernote tree.
   127b  the cause: an export imported by picking the folder and then its PARENT — the fixed build adds nothing (0 notes, 0 folders);
         `--unpatched` serves origin/main's index.html, where the second run builds a second tree, so this check FAILS there.
   127c  a note already imported under another path is skipped by the path-free identity, never re-keyed.
   127d  🧹 Remove duplicates: the dry run counts exactly (sets / copies / both changed), an edited copy is kept, a set with two changed
         copies is kept whole, a copy with changed tags or moved out of its folder is kept; the button moves exactly the extra copies to
         Trash with tombstones (Restore works), the empty duplicate folders go with tombstones, a folder that still holds a note stays and is
         listed; nothing else in DB changed (byte-compared); a stale device merged both ways brings nothing back and loses nothing.
   127e  the daily cap: a smaller cap moves that many, says so, and a later day carries on.
   127f  scale at 390 x4 CPU: 3,000 sets, no long task over the host-scaled limit.
   `--unpatched` runs 127b against the build before this round; `--only=127a,127d`. */
import { playwright, serve, seedDB, hostLimit } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, boot, check, results } from './s1-fake.mjs';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);
const UNPATCHED = argv.includes('--unpatched');
const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];

function makeBase() {
  const dir = mkdtempSync(join(tmpdir(), 'enx-dups-base-'));
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', `origin/main:${f}`], { encoding: 'buffer', maxBuffer: 1 << 28 })); } catch {} }
  return dir;
}
const pw = await playwright();
const srv = await serve(UNPATCHED ? makeBase() : undefined);
const browser = await pw.chromium.launch({ args: ['--js-flags=--max-old-space-size=8192'] });
const TMP = mkdtempSync(join(tmpdir(), 'enx-dups-'));

/* ── fixtures ── */
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const HEAD = '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE en-export SYSTEM "http://xml.evernote.com/pub/evernote-export4.dtd">\n<en-export export-date="20261014T000000Z" application="Evernote" version="10.0">\n';
const ENML = (inner) => `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd"><en-note>${inner}</en-note>`;
const noteXML = (n) => `<note>\n<title>${esc(n.title)}</title>\n<created>${n.created}</created>\n<updated>${n.created}</updated>\n<content><![CDATA[${ENML(`<div>Body of ${esc(n.title)}</div>`)}]]></content>\n</note>\n`;
const mkBook = (dir, name, titles, base) => { mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, name + '.enex'), HEAD + titles.map((t, i) => noteXML({ title: t, created: `2020${String(base).padStart(2, '0')}${String(i + 1).padStart(2, '0')}T000000Z` })).join('') + '</en-export>\n'); };
const PARENT = join(TMP, 'Parent'), EXP = join(PARENT, 'Evernote-Export');
mkBook(join(EXP, 'Stack A'), 'Alpha', ['A1', 'A2', 'A3', 'A4'], 1);
mkBook(EXP, 'Beta', ['B1', 'B2', 'B3'], 2);
mkBook(join(EXP, 'Stack B'), 'Gamma', ['G1', 'G2', 'G3'], 3);
const NOTES = 10;

const T0 = '2026-10-01T00:00:00.000Z';
const seed = () => {
  const db = seedDB(T0);
  db.sections.push({ id: 'sec-2', name: 'Second Section', order: 1, updatedAt: T0 });
  db.folders.push(
    { id: 'mP', name: 'MovP', parentId: null, order: 3, sectionId: 'sec-1', updatedAt: T0 },
    { id: 'mC', name: 'MovC', parentId: 'mP', order: 1, updatedAt: T0 },
    { id: 'mG', name: 'MovG', parentId: 'mC', order: 2, updatedAt: T0 },
    { id: 'mQ', name: 'MovQ', parentId: null, order: 4, sectionId: 'sec-1', updatedAt: T0 },
    { id: 'mR', name: 'MovR', parentId: 'mQ', order: 1, updatedAt: T0 },
    { id: 'mS', name: 'MovS', parentId: null, order: 1, sectionId: 'sec-2', updatedAt: T0 });
  return db;
};
const dev = (vp, db = seed()) => addDevice(browser, srv.base, makeCloud(), 'D' + vp.name, { width: vp.w, height: vp.h }, vp.touch, db, {});
const act = (d, vp, sel, opt) => (vp.touch ? d.page.locator(sel, opt).first().tap() : d.page.locator(sel, opt).first().click());
const each = async (id, fn, vps = VPS) => {
  for (const vp of vps) {
    let d = null;
    try { d = await dev(vp); d.page.setDefaultTimeout(20000); await sleep(800); await fn(d, vp); }
    catch (e) { check(false, `${id}@${vp.name} threw: ${String(e && e.message || e).split('\n')[0]}`); }
    finally { if (d) await d.ctx.close(); }
  }
};
const noErr = (d, tag) => check(d.errors.length === 0, `${tag} no page errors`, d.errors.slice(0, 2).join(' · '));
const dlg = async (d, vp) => {
  await act(d, vp, '#sb-tools-btn'); await sleep(300);
  await act(d, vp, '#sb-tools .sb-mi', { hasText: 'Evernote import' });
  await d.page.waitForSelector('#enx-modal.open #enx-box');
};
async function bring(d, vp, what) {
  if (!(await on(d, () => { const m = document.getElementById('enx-modal'); return !!m && m.classList.contains('open'); }))) await dlg(d, vp);
  if (!(await on(d, () => !!document.getElementById('enx-dir')))) await act(d, vp, '#enx-box .rm-big', { hasText: 'Choose another export' });
  await d.page.setInputFiles('#enx-dir', what); await d.page.waitForSelector('#enx-totals', { timeout: 120000 });
  await act(d, vp, '#enx-bring'); await d.page.waitForFunction(() => !_enx.imp.run && ['done', 'capped', 'paused'].includes(_enx.imp.state), null, { timeout: 120000 });
}
/* the dialog's start view, opened through the real 🧰 menu the first time, then just put back to it */
async function toPick(d, vp) {
  if (await on(d, () => { const m = document.getElementById('enx-modal'); return !!m && m.classList.contains('open'); })) { await on(d, () => { _enx.view = 'pick'; _enxPaint(); }); return; }
  await dlg(d, vp);
}
const counts = (d) => on(d, () => ({ n: DB.articles.filter((a) => a.fromEvernote).length, f: DB.folders.filter((f) => f.enx).length }));

try {
  /* ══ 127a — J111 ══ */
  if (want('127a')) await each('127a', async (d, vp) => {
    const t = `127a@${vp.name}`;
    const open = async (fid) => {
      await on(d, (fid) => { hideCtx(); closeModal(); if (innerWidth < 1200) showPane('sb'); ST.secOpen['sec-1'] = true; ST.secOpen['sec-2'] = true; DB.folders.forEach((f) => { ST.exp[f.id] = true; }); renderTree(); }, fid);
      await sleep(300);
      await d.page.locator(`.tr-row[data-fid="${fid}"]`).first().click({ button: 'right' });
      await d.page.waitForSelector('#ctx .ci');
    };
    await open('mP');
    const org = await on(d, () => { const row = [...document.querySelectorAll('#ctx .ci')].find((x) => /openMoveFolder\(/.test(x.getAttribute('onclick') || '')); if (!row) return null; let e = row.previousElementSibling; while (e && !e.classList.contains('ctx-gh')) e = e.previousElementSibling; return { head: e && e.textContent.trim(), text: row.textContent.trim() }; });
    check(org && org.head === 'ORGANISE' && org.text === '📂 Move to folder…', `${t} “📂 Move to folder…” is a row of the folder menu's ORGANISE group`, JSON.stringify(org));
    const before = await on(d, () => JSON.stringify(DB.folders.find((f) => f.id === 'mP')));
    await d.page.locator('#ctx .ci', { hasText: 'Move to folder' }).first().click();
    await d.page.waitForSelector('#mv-l .pr');
    const pk = await on(d, () => { const rows = [...document.querySelectorAll('#mv-l .pr')]; const mb = document.getElementById('mb').getBoundingClientRect(); return { first: rows[0].textContent.trim(), off: rows.filter((r) => r.classList.contains('af-off')).map((r) => r.textContent.replace(/\s+/g, ' ').trim()), minH: Math.min(...rows.map((r) => r.getBoundingClientRect().height)), w: mb.width, vw: innerWidth, sheet: document.getElementById('ov').classList.contains('mydb-sheet'), srch: !!document.getElementById('mv-q') }; });
    check(pk.first.includes('Top level') && pk.srch, `${t} the picker has a search box and “Top level” first`, JSON.stringify(pk.first));
    check(pk.off.length === 3 && pk.off.every((x) => /MovP|MovC|MovG/.test(x)) && pk.off.some((x) => /itself/.test(x)) && pk.off.filter((x) => /inside this folder/.test(x)).length === 2, `${t} the folder itself and its two subfolders are greyed and say why`, pk.off.join(' | '));
    check(pk.minH >= 44, `${t} rows are at least 44 px high (${Math.round(pk.minH)})`);
    if (vp.w < 640) check(pk.sheet && pk.w >= pk.vw - 2, `${t} phone: a full-width sheet (${Math.round(pk.w)} of ${pk.vw})`);
    await d.page.locator('#mv-l .pr.af-off').first().click({ force: true }).catch(() => {});
    check((await on(d, () => document.getElementById('ov').classList.contains('on'))) && (await on(d, () => JSON.stringify(DB.folders.find((f) => f.id === 'mP')))) === before, `${t} a tap on a greyed row moves nothing and keeps the picker open`);
    await d.page.fill('#mv-q', 'MovQ'); await sleep(200);
    const stale = await on(d, () => JSON.stringify(DB));
    await d.page.locator('#mv-l .pr:not(.af-off)').nth(1).click();
    await sleep(500);
    const m1 = await on(d, () => { const p = DB.folders.find((f) => f.id === 'mP'); return { par: p.parentId, ord: p.order, up: p.updatedAt, open: !!document.getElementById('mv-l') }; });   /* the numbering offer of the existing move path may be showing: that is the app's own rule, not the picker */
    check(m1.par === 'mQ' && m1.ord === 2 && m1.up > T0 && !m1.open, `${t} picking MovQ moves MovP inside it, last among its siblings (order ${m1.ord}), updatedAt stamped, picker closed`, JSON.stringify(m1));
    /* the move survives a merge with a stale copy, both ways */
    const mg = await on(d, (stale) => { const s = JSON.parse(stale); const a = mergeDB(JSON.parse(JSON.stringify(DB)), s).folders.find((f) => f.id === 'mP'), b = mergeDB(s, JSON.parse(JSON.stringify(DB))).folders.find((f) => f.id === 'mP'); return [a.parentId, b.parentId]; }, stale);
    check(mg[0] === 'mQ' && mg[1] === 'mQ', `${t} merged with a stale copy both ways, the move holds (${mg})`);
    /* Top level, from the nested row */
    await open('mP');
    await d.page.locator('#ctx .ci', { hasText: 'Move to folder' }).first().click(); await d.page.waitForSelector('#mv-l .pr');
    await d.page.locator('#mv-l .pr').first().click(); await sleep(500);
    const m2 = await on(d, () => { const p = DB.folders.find((f) => f.id === 'mP'); return { par: p.parentId, sec: p.sectionId }; });
    check(m2.par === null && m2.sec === 'sec-1', `${t} “Top level” makes it a root folder and keeps its section`, JSON.stringify(m2));
    /* another section's folder */
    await open('mP');
    await d.page.locator('#ctx .ci', { hasText: 'Move to folder' }).first().click(); await d.page.waitForSelector('#mv-l .pr');
    await d.page.fill('#mv-q', 'MovS'); await sleep(200);
    await d.page.locator('#mv-l .pr:not(.af-off)').nth(1).click(); await sleep(500);
    const m3 = await on(d, () => { const p = DB.folders.find((f) => f.id === 'mP'); return { par: p.parentId, sec: p.sectionId }; });
    check(m3.par === 'mS' && m3.sec === 'sec-2', `${t} into a folder of another section: it takes that section`, JSON.stringify(m3));
    noErr(d, t);
  });

  /* ══ 127b / 127c — the cause, and the path-free identity ══ */
  if (want('127b')) await each('127b', async (d, vp) => {
    const t = `127b@${vp.name}`;
    await bring(d, vp, EXP);
    const c1 = await counts(d);
    check(c1.n === NOTES, `${t} the export folder brings in ${NOTES} notes`, JSON.stringify(c1));
    await bring(d, vp, PARENT);
    const c2 = await counts(d);
    check(c2.n === c1.n && c2.f === c1.f, `${t} picking the folder ABOVE the export adds 0 notes and 0 folders (${c1.n}/${c1.f} → ${c2.n}/${c2.f})`, JSON.stringify(c2));
    const st = await on(d, () => [...new Set(DB.articles.filter((a) => a.fromEvernote).map((a) => a.fromEvernote.stack))].sort());
    check(JSON.stringify(st) === JSON.stringify(['', 'Stack A', 'Stack B']), `${t} stacks never carry the export folder's own name`, JSON.stringify(st));
    noErr(d, t);
  });
  if (want('127c') && !UNPATCHED) await each('127c', async (d, vp) => {
    const t = `127c@${vp.name}`;
    await bring(d, vp, EXP);
    /* make the notebook hold only an old-style copy under another path (what the bug left): clone the notes, drop the originals */
    await on(d, () => {
      const orig = DB.articles.filter((a) => a.fromEvernote); const ids = new Set(orig.map((a) => a.id));
      orig.forEach((a) => { const k = 'Evernote-Export/' + a.fromEvernote.k; a.id = _enxId('enx-n-', k); a.fromEvernote.k = k; a.fromEvernote.stack = 'Evernote-Export' + (a.fromEvernote.stack ? ' / ' + a.fromEvernote.stack : ''); });
      persist();
    });
    const c1 = await counts(d);
    await bring(d, vp, EXP);
    const c2 = await counts(d);
    check(c2.n === c1.n && c2.f === c1.f, `${t} a note already brought in under another path is skipped by its path-free identity (${c1.n} → ${c2.n}; folders ${c1.f} → ${c2.f}); nothing re-keyed`, JSON.stringify(c2));
    const ids = await on(d, () => DB.articles.filter((a) => a.fromEvernote).every((a) => a.id === _enxId('enx-n-', a.fromEvernote.k)));
    check(ids, `${t} existing ids are untouched`);
    noErr(d, t);
  });

  /* ══ 127d — remove duplicates ══ */
  /* make the second tree the old bug made: every imported note again, under "Evernote-Export / <stack>", with its own folders */
  const CLONE = () => {
    const at0 = DB.articles.find((a) => a.fromEvernote).fromEvernote.at, rootId = 'enx-root', T = at0;
    const origs = DB.articles.filter((a) => a.fromEvernote), out = [];
    origs.forEach((a) => {
      const cst = 'Evernote-Export' + (a.fromEvernote.stack ? ' / ' + a.fromEvernote.stack : ''), nb = a.fromEvernote.nb;
      const sid = _enxId('enx-s-', cst), bid = _enxId('enx-b-', cst + '\u0001' + nb);
      if (!DB.folders.some((f) => f.id === sid)) DB.folders.push({ id: sid, name: cst, parentId: rootId, order: 50, enx: { kind: 'stack', name: cst }, updatedAt: T });
      if (!DB.folders.some((f) => f.id === bid)) DB.folders.push({ id: bid, name: nb + ' ', parentId: sid, order: 1, enx: { kind: 'nb', name: nb }, updatedAt: T });
      const k = cst + '/' + nb + '\u0001' + _enxKeyNoPath(a.fromEvernote.k);
      const c = JSON.parse(JSON.stringify(a));
      c.id = _enxId('enx-n-', k); c.folderIds = [bid]; c.fromEvernote.k = k; c.fromEvernote.stack = cst;
      out.push(c);
    });
    out.forEach((c) => DB.articles.push(c));
    persist();
  };
  const dupDB = async (d) => {
    await on(d, CLONE);
    /* variations (by title): A1 clone edited · A2 both edited · A3 clone moved out of its folder · A4 clone with other tags */
    await on(d, () => {
      const late = new Date(Date.parse(DB.articles.find((a) => a.fromEvernote).fromEvernote.at) + 3600000).toISOString();
      const pick = (title, clone) => DB.articles.find((a) => a.fromEvernote && a.title === title && a.fromEvernote.stack.startsWith('Evernote-Export') === clone);
      pick('A1', true).updatedAt = late; pick('A1', true).content += '<p>edited</p>';
      pick('A2', true).updatedAt = late; pick('A2', false).updatedAt = late;
      pick('A3', true).folderIds = ['f1'];
      pick('A4', true).tags = ['mine'];
      /* things that must not be touched: a plain note with the same title, a MyDatabase and a Mapping My Journey note */
      const mk = (id, extra) => DB.articles.push(Object.assign({ id, title: 'B1', content: '<p>x</p>', folderIds: ['f1'], tags: [], createdAt: '2020-02-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z', kind: 'general' }, extra));
      mk('plain1', {}); mk('mydb1', { fromMydb: { pid: 'p', id: 'i' } }); mk('mmj1', { fromMmj: { id: 1 } });
      persist();
    });
  };
  if (want('127d')) await each('127d', async (d, vp) => {
    const t = `127d@${vp.name}`;
    await bring(d, vp, EXP);
    await dupDB(d);
    const snap = await on(d, () => ({ all: JSON.stringify(DB), stale: JSON.stringify(DB) }));
    await toPick(d, vp);
    await act(d, vp, '.enx-dupbtn');
    await d.page.waitForSelector('#enx-dtotals');
    const dry = await on(d, () => ({ g: [...document.querySelectorAll('#enx-dtotals dt')].map((x) => x.textContent + '=' + x.nextElementSibling.textContent), trees: !!document.getElementById('enx-dtrees'), ex: document.querySelectorAll('#enx-dex li').length, both: document.querySelectorAll('#enx-dboth li').length, go: (document.getElementById('enx-dgo') || {}).textContent, same: JSON.stringify(DB) }));
    check(dry.g.join(' · ') === 'Duplicate sets=10 · Copies to move to Trash=8 · Both changed — kept both=2', `${t} the dry run counts exactly: 10 sets, 8 copies, 2 kept whole`, dry.g.join(' · '));
    check(dry.trees && dry.ex === 8 && dry.both === 2 && /Move 8 copies to Trash/.test(dry.go || ''), `${t} the two trees, ${dry.ex} examples (10 at most), the “both changed” list (${dry.both}) and the button “${dry.go}” are shown`);
    check(dry.same === snap.all, `${t} the dry run changed nothing in the notebook`);
    const sum = await on(d, () => _enxDupSummary());
    check(/Copies to move to Trash: 8/.test(sum) && /Evernote-Export \/ …: \d+ copies → Trash/.test(sum), `${t} 📋 Copy summary carries the numbers`, sum.split('\n').slice(0, 4).join(' | '));
    const phone = vp.w < 640;
    if (phone) check(await on(d, () => { const b = document.getElementById('enx-box').getBoundingClientRect(); return b.width >= innerWidth - 2; }), `${t} phone: the dialog is a full-width sheet`);
    await act(d, vp, '#enx-dgo');
    await d.page.waitForFunction(() => _enx.dup && _enx.dup.state === 'done', null, { timeout: 60000 });
    const after = await on(d, (stale) => {
      const s = JSON.parse(stale), gone = s.articles.filter((a) => !DB.articles.some((x) => x.id === a.id)).map((a) => a.id);
      const goneF = s.folders.filter((f) => !DB.folders.some((x) => x.id === f.id)).map((f) => f.id);
      const ev = DB.articles.filter((a) => a.fromEvernote), bySet = new Map(); ev.forEach((a) => { const k = _enxKeyNoPath(a.fromEvernote.k); bySet.set(k, (bySet.get(k) || 0) + 1); });
      const tr = DB.trash.filter((x) => x.type === 'article' && gone.includes(x.item.id)).length, trF = DB.trash.filter((x) => x.type === 'folder').length;
      const tomb = (id) => (DB.tombstones || []).some((x) => x.id === id);
      const keepSame = JSON.stringify([DB.articles.filter((a) => !gone.includes(a.id)), DB.folders.filter((f) => !goneF.includes(f.id)), DB.sections, DB.theme]) === JSON.stringify([s.articles.filter((a) => !gone.includes(a.id)), s.folders.filter((f) => !goneF.includes(f.id)), s.sections, s.theme]);
      const m1 = mergeDB(JSON.parse(JSON.stringify(DB)), s), m2 = mergeDB(s, JSON.parse(JSON.stringify(DB)));
      const back = (m) => gone.filter((id) => m.articles.some((a) => a.id === id)).length + goneF.filter((id) => m.folders.some((f) => f.id === id)).length;
      const lost = (m) => DB.articles.filter((a) => !m.articles.some((x) => x.id === a.id)).length + DB.folders.filter((f) => !m.folders.some((x) => x.id === f.id)).length;
      const names = DB.folders.filter((f) => f.enx).map((f) => f.name.trim());
      const rest = (title, clone) => DB.articles.filter((a) => a.fromEvernote && a.title === title).length;
      return { gone: gone.length, goneF: goneF.length, tr, trF, allTomb: gone.every(tomb) && goneF.every(tomb), keepSame, back: [back(m1), back(m2)], lost: [lost(m1), lost(m2)], sets: [...bySet.values()].sort().join(''), ev: ev.length, names, st: _enx.dup.stay.map((x) => x.name + ':' + x.n), A: ['A1', 'A2', 'A3', 'A4'].map(rest).join(''), plain: DB.articles.filter((a) => ['plain1', 'mydb1', 'mmj1'].includes(a.id)).length, restore: (() => { const e = DB.trash.find((x) => x.type === 'article' && gone.includes(x.item.id)); restoreItem(e.id); return DB.articles.some((a) => a.id === e.item.id); })() };
    }, snap.stale);
    check(after.gone === 8 && after.tr === 8 && after.allTomb, `${t} exactly the 8 extra copies left the notebook, each in Trash with its tombstone (${after.gone}/${after.tr})`, JSON.stringify(after));
    check(after.A === '1212', `${t} A1 (edited) kept 1, A2 (both edited) kept 2, A3 (moved out) kept 1, A4 (tags differ) kept 2: ${after.A}`);
    check(after.ev === 12 && after.sets.split('').filter((x) => x === '2').length === 2 && after.sets.split('').filter((x) => x === '1').length === 8, `${t} one copy of every set, two only in the two “both changed” sets (${after.ev} notes)`, after.sets);
    check(after.goneF === 4 && after.trF === 2, `${t} the 4 now-empty folders of the duplicate tree went with their tombstones (${after.goneF}; ${after.trF} in Trash)`);
    check(after.st.some((x) => /^Alpha/.test(x) && /:2$/.test(x)), `${t} a folder that held a removed copy and still holds notes stays and is listed (${after.st.join(', ')})`);
    check(after.names.includes('Evernote-Export / Stack A') && after.names.filter((x) => x === 'Alpha').length === 2 && !after.names.includes('Evernote-Export') && !after.names.includes('Evernote-Export / Stack B'), `${t} the duplicate tree keeps only the folder that still holds the edited copies`, after.names.join(' | '));
    check(after.plain === 3, `${t} a plain note, a MyDatabase note and a Mapping My Journey note with the same title were not touched`);
    check(after.keepSame, `${t} everything else in the notebook is byte-identical (notes, folders, sections, settings)`);
    check(after.back[0] === 0 && after.back[1] === 0 && after.lost[0] === 0 && after.lost[1] === 0, `${t} merged both ways with the stale copy: nothing comes back (${after.back}), nothing is lost (${after.lost})`);
    check(after.restore, `${t} Restore from Trash brings a removed copy back`);
    await act(d, vp, '#enx-box .rm-big', { hasText: 'Back' });
    noErr(d, t);
  });

  /* ══ 127e — the cap ══ */
  if (want('127e') && !UNPATCHED) await each('127e', async (d, vp) => {
    const t = `127e@${vp.name}`;
    await bring(d, vp, EXP);
    await on(d, CLONE);
    await on(d, () => { window.__enxCap = 4; window.__enxNow = Date.now(); });
    await toPick(d, vp); await act(d, vp, '.enx-dupbtn'); await d.page.waitForSelector('#enx-dtotals');
    await act(d, vp, '#enx-dgo');
    await d.page.waitForFunction(() => _enx.dup && _enx.dup.state !== 'run' && _enx.dup.state !== 'ready', null, { timeout: 60000 });
    const r1 = await on(d, () => ({ s: _enx.dup.state, moved: _enx.dup.moved, left: DB.articles.filter((a) => a.fromEvernote).length, msg: (document.getElementById('enx-dcap') || {}).textContent }));
    check(r1.s === 'capped' && r1.moved === 4 && r1.left === NOTES * 2 - 4 && /free cloud plan/.test(r1.msg || ''), `${t} with a cap of 4 it moves 4, stops and says so`, JSON.stringify(r1));
    await on(d, () => { window.__enxNow = Date.now() + 25 * 3600000; });
    await act(d, vp, '#enx-box .rm-big', { hasText: 'Back' });
    await act(d, vp, '.enx-dupbtn'); await d.page.waitForSelector('#enx-dtotals');
    await act(d, vp, '#enx-dgo');
    await d.page.waitForFunction(() => _enx.dup && _enx.dup.state !== 'run' && _enx.dup.state !== 'ready', null, { timeout: 60000 });
    const r2 = await on(d, () => ({ s: _enx.dup.state, moved: _enx.dup.moved, left: DB.articles.filter((a) => a.fromEvernote).length }));
    check(r2.moved === 4 && r2.left === NOTES * 2 - 8, `${t} a day later it carries on with the next 4`, JSON.stringify(r2));
    noErr(d, t);
  }, [VPS[2]]);

  /* ══ 127f — scale ══ */
  if (want('127f') && !UNPATCHED) await each('127f', async (d, vp) => {
    const t = `127f@${vp.name}`;
    await on(d, () => {
      const at = new Date().toISOString(); DB.folders.push({ id: 'enx-root', name: 'Evernote', parentId: null, order: 9, sectionId: 'sec-1', enx: { kind: 'root', name: 'Evernote' }, updatedAt: at });
      for (const [cst, pre] of [['', 'o'], ['Evernote-Export', 'c']]) {
        const sid = cst ? _enxId('enx-s-', cst) : 'enx-root', bid = _enxId('enx-b-', cst + '\u0001Big');
        if (cst) DB.folders.push({ id: sid, name: cst, parentId: 'enx-root', order: 1, enx: { kind: 'stack', name: cst }, updatedAt: at });
        DB.folders.push({ id: bid, name: 'Big', parentId: sid, order: 1, enx: { kind: 'nb', name: 'Big' }, updatedAt: at });
        for (let i = 0; i < 3000; i++) { const k = cst + '/Big\u0001' + (1500000000 + i) + '\u0001note ' + i + '\u0001' + (20 + i % 7); DB.articles.push({ id: _enxId('enx-n-', k), title: 'Note ' + i, content: '<div>Body ' + i + '</div>', folderIds: [bid], tags: [], createdAt: new Date((1500000000 + i) * 1000).toISOString(), updatedAt: new Date((1500000000 + i) * 1000).toISOString(), fromEvernote: { nb: 'Big', stack: cst, k, at } }); }
      }
      persist();
    });
    const cdp = await d.ctx.newCDPSession(d.page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await on(d, () => { window.__lt = []; try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(e.duration))).observe({ entryTypes: ['longtask'] }); } catch (e) {} window.__enxCap = 10000; });
    await toPick(d, vp); await act(d, vp, '.enx-dupbtn'); await d.page.waitForSelector('#enx-dtotals', { timeout: 120000 });
    await act(d, vp, '#enx-dgo');
    await d.page.waitForFunction(() => _enx.dup && _enx.dup.state !== 'run' && _enx.dup.state !== 'ready', null, { timeout: 300000 });
    const r = await on(d, () => ({ left: DB.articles.filter((a) => a.fromEvernote).length, moved: _enx.dup.moved, mx: Math.max(0, ...window.__lt) }));
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    check(r.left === 3000 && r.moved === 3000, `${t} 3,000 sets: 3,000 copies moved, 3,000 left`, JSON.stringify(r));
    const lim = hostLimit(200);
    check(r.mx <= lim.ms, `${t} longest task ${Math.round(r.mx)} ms at 390 ×4 (limit ${lim.text})`);
    noErr(d, t);
  }, [VPS[0]]);
} finally {
  await browser.close(); await srv.close();
}
const bad = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - bad}/${results.length} passed${bad ? ', ' + bad + ' FAILED' : ''}`);
process.exit(bad ? 1 : 0);
