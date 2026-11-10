#!/usr/bin/env node
/* tools/merge-j154.mjs — v05.87, J154: 📥 Import → Merge must not bring back deleted notes, folders or sections (checks 146a–146g).

   146a  a file holding notes A, B, C; B deleted into Trash, C deleted and emptied from Trash (tombstone) → Merge: A is still there, B stays in Trash,
         C stays gone, the message counts 2
   146b  the same with a deleted folder, a deleted {type:'folder'} group (with a subfolder and a note) and a deleted section; a folder emptied from Trash
   146c  a second device receives the merge from the cloud → B and C do not come back there either (I2)
   146d  the box "Also bring back notes I deleted since this backup" ticked → B and C come back, out of Trash, no tombstone; the second device receives them
   146e  a note in Trash whose copy in the file is newer → still not changed
   146f  a Save File copy and an Automatic Backups file (v05.86 paths) behave the same
   146g  the dialog at 390 / 820 / 1440 with nothing off screen
   Each printed ok/FAIL line becomes one app-check check (block 146). `--root=dir` serves another copy of the app (the stash run). */
import { playwright, seedDB, ROOT } from './harness.mjs';
import { makeCloud, addDevice, sleep, check, results, quiet, waitSeeded } from './s1-fake.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const argv = process.argv.slice(2);
const SRC = (argv.find((a) => a.startsWith('--root=')) || '').slice(7) || process.env.J154_ROOT || ROOT;
const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];
const pw = await playwright();
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const srv = await new Promise((ok) => {
  const sockets = new Set();
  const s = createServer(async (req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    try { const body = await readFile(join(SRC, p)); res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); res.end(body); } catch { res.writeHead(404); res.end('nf'); }
  });
  s.on('connection', (c) => { sockets.add(c); c.on('close', () => sockets.delete(c)); });
  s.listen(0, '127.0.0.1', () => ok({ base: `http://127.0.0.1:${s.address().port}`, close: async () => { for (const c of sockets) c.destroy(); await new Promise((d) => s.close(d)); } }));
});
const browser = await pw.chromium.launch();
const T0 = new Date(Date.now() - 3600e3).toISOString();
const realErr = (e) => !/ERR_|Failed to load resource|net::/i.test(e);
const waitFor = async (page, fn, ms = 20000, arg) => { try { await page.waitForFunction(fn, arg, { timeout: ms }); return true; } catch { return false; } };
const dev = (cloud, name, vp, seed, opts = {}) => addDevice(browser, srv.base, cloud, name, { width: vp.w, height: vp.h }, vp.touch, seed, opts);
const close = (...ds) => Promise.all(ds.map((d) => d && d.ctx.close().catch(() => {})));
const clickMenu = async (page, text) => { await page.click('#sb-menu-btn'); await page.click('#sb-menu .sb-mi:has-text("' + text + '")'); };
const note = (id, title, folderIds = ['f1']) => ({ id, title, content: '<p>' + title + ' body</p>', folderIds, tags: [], createdAt: T0, updatedAt: T0, kind: 'general' });

/* the notebook the file is made from */
const baseSeed = (extras) => {
  const s = seedDB(T0);
  s.articles.push(note('jn-A', 'Keep note A'), note('jn-B', 'Trashed note B'), note('jn-C', 'Emptied note C'));
  if (extras) {
    s.folders.push({ id: 'fDel', name: '(020) Deleted folder', parentId: null, order: 3, sectionId: 'sec-1', updatedAt: T0 },
      { id: 'fGrp', name: '(030) Group folder', parentId: null, order: 4, sectionId: 'sec-1', updatedAt: T0 },
      { id: 'fGrpC', name: '(031) Group child', parentId: 'fGrp', order: 1, updatedAt: T0 },
      { id: 'fGone', name: '(040) Emptied folder', parentId: null, order: 5, sectionId: 'sec-1', updatedAt: T0 });
    s.sections.push({ id: 'sDel', name: 'Deleted section', order: 1, updatedAt: T0 });
    s.articles.push(note('jn-G', 'Note in the group', ['fGrpC']));
  }
  return s;
};

/* both kinds of file, from the state the device is in NOW */
async function makeFiles(page) {
  const r = await page.evaluate(async () => {
    const ctx = _bxpCtx('x', () => {}, 0), S = _bxpSink(null);
    await _sfWrite(S, ctx); await S.flush();
    const ab = await new Blob(S.parts).arrayBuffer(); let bin = ''; const u8 = new Uint8Array(ab);
    for (let i = 0; i < u8.length; i += 32768) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 32768));
    return { save: btoa(bin), backup: (await generateBackupHTMLContent()).html };
  });
  return { save: Buffer.from(r.save, 'base64'), backup: Buffer.from(r.backup, 'utf8') };
}

/* what the owner does after the file was made */
const deleteStuff = (page, extras) => page.evaluate((x) => {
  const entryOf = (id) => DB.trash.find((t) => (t.item && t.item.id) === id).id;
  trashArt('jn-B');
  trashArt('jn-C'); permDeleteItem(entryOf('jn-C'));
  if (x) {
    trashFolder('fDel');
    trashFolder('fGrp');
    trashFolder('fGone'); permDeleteItem(entryOf('fGone'));
    DB.sections = DB.sections.filter((s) => s.id !== 'sDel'); _addTombstones(['sDel'], new Date().toISOString());
    persist();
  }
}, extras);

const snap = (page) => page.evaluate(() => ({
  art: DB.articles.map((a) => a.id), fol: DB.folders.map((f) => f.id), sec: DB.sections.map((s) => s.id),
  trash: DB.trash.map((t) => ({ type: t.type, id: t.item && t.item.id, upd: t.item && t.item.updatedAt, subF: ((t.subtree && t.subtree.folders) || []).map((f) => f.id) })),
  tomb: (DB.tombstones || []).map((t) => t.id),
}));

/* open Import Backup through the real menu; tick the box or not; Merge; return the toast and the consent text */
async function doImport(page, file, name, tick) {
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), clickMenu(page, 'Import Backup')]);
  await fc.setFiles({ name, mimeType: 'text/html', buffer: file });
  const asked = await waitFor(page, () => !!document.querySelector('.imp-acts'), 15000);
  if (!asked) return { asked };
  const consent = await page.evaluate(() => document.querySelector('.imp-acts').parentElement.innerText);
  const hasBox = await page.evaluate(() => { const b = document.getElementById('imp-back-del'); return !!b && !b.checked; });
  if (tick) await page.check('#imp-back-del');
  await page.click('.imp-acts .btn.bp');
  await waitFor(page, () => window.__toasts.some((t) => /Merge complete/.test(t)), 20000);
  const toast = await page.evaluate(() => window.__toasts.filter((t) => /Merge complete/.test(t)).pop() || '');
  await sleep(400);
  return { asked, consent, hasBox, toast };
}

/* one device: seed, make the file, delete, merge */
async function single(vp, { extras = false, kind = 'backup', tick = false, newer = false } = {}) {
  const cloud = makeCloud();
  const D = await dev(cloud, 'one', vp, baseSeed(extras), { noCfg: true });
  try {
    if (newer) await D.page.evaluate(() => { DB.articles.find((a) => a.id === 'jn-B').updatedAt = new Date(Date.now() + 3600e3).toISOString(); persist(); });
    const files = await makeFiles(D.page);
    if (newer) await D.page.evaluate((t0) => { DB.articles.find((a) => a.id === 'jn-B').updatedAt = t0; persist(); }, T0);
    await deleteStuff(D.page, extras);
    const before = await snap(D.page);
    const file = kind === 'backup' ? files.backup : files.save;
    const nm = kind === 'backup' ? 'Siyagah-backup-2026-11-10.html' : kind === 'auto' ? 'Siyagah Backup 2026-11-10.html' : 'Siyagah Save.html';
    const res = await doImport(D.page, file, nm, tick);
    const after = await snap(D.page);
    return { D, before, after, res, files };
  } catch (e) { return { D, err: String(e.message || e) }; }
}

try {
  /* ══ 146a ══ */
  try {
    const r = await single(VPS[2]);
    if (r.err || !r.res.asked) check(false, '146a the scenario ran', r.err || 'no dialog');
    else {
      const { before, after, res } = r;
      check(before.trash.some((t) => t.id === 'jn-B') && before.tomb.includes('jn-C') && !before.art.includes('jn-B') && !before.art.includes('jn-C'), '146a set-up: B in Trash, C emptied (tombstone), both out of the notebook');
      check(after.art.includes('jn-A') && after.art.includes('a1'), '146a A (and the seeded notes) are still there');
      check(!after.art.includes('jn-B') && after.trash.some((t) => t.id === 'jn-B'), '146a B stays in Trash, not back in the notebook');
      check(!after.art.includes('jn-C') && after.tomb.includes('jn-C'), '146a C stays gone (tombstone kept)');
      check(/2 deleted notes/.test(res.toast) && /left deleted/.test(res.toast), '146a the message says "2 deleted notes … left deleted"', res.toast);
      check(after.art.length === before.art.length && after.tomb.length === before.tomb.length && after.trash.length === before.trash.length, '146a nothing else was added or removed (notes, tombstones, Trash)');
      check(res.hasBox && /bring back notes I deleted/i.test(res.consent), '146a the consent dialog has the unticked box "Also bring back notes I deleted since this backup"', res.consent.slice(-200));
      check(r.D.errors.filter(realErr).length === 0, '146a no page errors', r.D.errors.slice(0, 2).join(' · '));
    }
    await close(r.D);
  } catch (e) { check(false, '146a threw: ' + String(e.message || e).split('\n')[0]); }

  /* ══ 146b ══ */
  try {
    const r = await single(VPS[2], { extras: true });
    if (r.err || !r.res.asked) check(false, '146b the scenario ran', r.err || 'no dialog');
    else {
      const { before, after, res } = r;
      check(before.trash.filter((t) => t.type === 'folder').length === 2 && before.tomb.includes('fGone') && before.tomb.includes('sDel') && !before.sec.includes('sDel'), '146b set-up: two folder groups in Trash, an emptied folder and a deleted section');
      for (const id of ['fDel', 'fGrp', 'fGrpC', 'fGone']) check(!after.fol.includes(id), `146b folder ${id} stays deleted`);
      check(!after.sec.includes('sDel'), '146b the deleted section stays deleted');
      check(!after.art.includes('jn-G') && !after.art.includes('jn-B') && !after.art.includes('jn-C'), '146b the notes B, C and the group\'s note stay deleted');
      check(after.trash.filter((t) => t.type === 'folder').length === 2 && JSON.stringify(after.trash) === JSON.stringify(before.trash), '146b Trash is exactly as it was (the {type:"folder"} groups included)');
      check(/3 deleted notes/.test(res.toast) && /5 folders/.test(res.toast), '146b the message counts 3 notes and 5 folders/sections', res.toast);
      check(after.fol.includes('f1') && after.sec.includes('sec-1'), '146b the live folders and section are untouched');
    }
    await close(r.D);
  } catch (e) { check(false, '146b threw: ' + String(e.message || e).split('\n')[0]); }

  /* ══ 146c / 146d — two devices ══ */
  for (const tick of [false, true]) {
    const L = tick ? '146d' : '146c';
    const cloud = makeCloud();
    let A, B;
    try {
      A = await dev(cloud, 'A', VPS[2], baseSeed(false));
      check(await waitSeeded(cloud, A, 90000), `${L} set-up: device A wrote the notebook to the cloud`);
      B = await dev(cloud, 'B', VPS[2], seedDB(T0));
      await quiet(cloud, B);
      check(await waitFor(B.page, () => DB.articles.some((a) => a.id === 'jn-B'), 30000), `${L} set-up: device B received the notes`);
      const files = await makeFiles(A.page);
      await deleteStuff(A.page, false);
      await quiet(cloud, A); await quiet(cloud, B);
      const bDel = await snap(B.page);
      check(!bDel.art.includes('jn-B') && !bDel.art.includes('jn-C'), `${L} set-up: B and C are deleted on device B too`);
      const res = await doImport(A.page, files.backup, 'Siyagah-backup-2026-11-10.html', tick);
      await quiet(cloud, A); await quiet(cloud, B); await sleep(1500); await quiet(cloud, B);
      const a = await snap(A.page), b = await snap(B.page);
      if (!tick) {
        check(!a.art.includes('jn-B') && !a.art.includes('jn-C'), '146c after the Merge, device A does not have B or C');
        check(!b.art.includes('jn-B') && !b.art.includes('jn-C') && b.art.includes('jn-A'), '146c device B (from the cloud) does not get B or C back', JSON.stringify(b.art));
        check(b.trash.some((t) => t.id === 'jn-B') && b.tomb.includes('jn-C'), '146c device B still holds B in Trash and C\'s tombstone');
      } else {
        check(a.art.includes('jn-B') && a.art.includes('jn-C') && !a.trash.some((t) => t.id === 'jn-B') && !a.tomb.includes('jn-B') && !a.tomb.includes('jn-C'), '146d ticked: B and C are back on A, out of Trash, no tombstone', JSON.stringify(a));
        check(/brought back/.test(res.toast), '146d the message says they were brought back', res.toast);
        check(b.art.includes('jn-B') && b.art.includes('jn-C') && !b.trash.some((t) => t.id === 'jn-B') && !b.tomb.includes('jn-B') && !b.tomb.includes('jn-C'), '146d device B receives B and C (not deleted again)', JSON.stringify(b));
      }
      check(A.errors.filter(realErr).length === 0 && B.errors.filter(realErr).length === 0, `${L} no page errors`, A.errors.concat(B.errors).slice(0, 2).join(' · '));
    } catch (e) { check(false, `${L} threw: ` + String(e.message || e).split('\n')[0]); }
    await close(A, B);
  }

  /* ══ 146e — a newer copy in the file, the note in Trash ══ */
  try {
    const r = await single(VPS[2], { newer: true });
    if (r.err || !r.res.asked) check(false, '146e the scenario ran', r.err || 'no dialog');
    else {
      const { before, after } = r;
      check(!after.art.includes('jn-B') && JSON.stringify(after.trash) === JSON.stringify(before.trash), '146e the note in Trash is not changed or brought back by a newer copy in the file', JSON.stringify(after.trash));
      const hist = await r.D.page.evaluate(() => (DB.trash.find((t) => t.item && t.item.id === 'jn-B').item.noteHistory || []).length);
      check(hist === 0, '146e its Trash copy gained no history', 'history ' + hist);
    }
    await close(r.D);
  } catch (e) { check(false, '146e threw: ' + String(e.message || e).split('\n')[0]); }

  /* ══ 146f — Save File and Automatic Backups ══ */
  for (const [kind, label] of [['save', 'Save File copy'], ['auto', 'Automatic Backups file']]) {
    try {
      const r = await single(VPS[2], { kind });
      if (r.err || !r.res.asked) { check(false, `146f ${label}: the scenario ran`, r.err || 'no dialog'); await close(r.D); continue; }
      const { before, after, res } = r;
      check(after.art.includes('jn-A') && !after.art.includes('jn-B') && !after.art.includes('jn-C') && JSON.stringify(after.trash) === JSON.stringify(before.trash), `146f ${label}: A stays, B stays in Trash, C stays gone`, JSON.stringify(after.art));
      check(/2 deleted notes/.test(res.toast), `146f ${label}: the message counts 2`, res.toast);
      await close(r.D);
    } catch (e) { check(false, `146f ${label} threw: ` + String(e.message || e).split('\n')[0]); }
  }

  /* ══ 146g — the dialog at three sizes ══ */
  for (const vp of VPS) {
    const cloud = makeCloud();
    const G = await dev(cloud, 'g' + vp.name, vp, baseSeed(false), { noCfg: true });
    try {
      const files = await makeFiles(G.page);
      const [fc] = await Promise.all([G.page.waitForEvent('filechooser'), clickMenu(G.page, 'Import Backup')]);
      await fc.setFiles({ name: 'Siyagah-backup.html', mimeType: 'text/html', buffer: files.backup });
      await waitFor(G.page, () => !!document.getElementById('imp-back-del'), 15000);
      await sleep(300);
      const m = await G.page.evaluate(() => {
        const W = innerWidth, H = innerHeight, q = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; };
        const els = [document.getElementById('imp-back-del').closest('label'), ...document.querySelectorAll('.imp-acts .btn')];
        const rs = els.map(q);
        return { W, H, ok: rs.every((r) => r.l >= 0 && r.r <= W && r.t >= 0 && r.b <= H), doc: document.documentElement.scrollWidth, n: rs.length, rs };
      });
      check(m.n === 4 && m.ok && m.doc <= m.W, `146g@${vp.name} the box and the three buttons are wholly on screen`, JSON.stringify(m));
      await G.page.click('#imp-back-del');
      check(await G.page.evaluate(() => document.getElementById('imp-back-del').checked), `146g@${vp.name} the box can be ticked`);
      check(G.errors.filter(realErr).length === 0, `146g@${vp.name} no page errors`, G.errors.slice(0, 2).join(' · '));
    } catch (e) { check(false, `146g@${vp.name} threw: ` + String(e.message || e).split('\n')[0]); }
    await close(G);
  }
} catch (e) {
  check(false, 'merge-j154 threw: ' + (e && e.stack || e));
} finally {
  await browser.close().catch(() => {});
  await srv.close().catch(() => {});
}
const pass = results.filter((r) => r.ok).length;
console.log(`\n${pass}/${results.length} passed`);
process.exit(pass === results.length ? 0 : 1);
