#!/usr/bin/env node
/* tools/keep-import.mjs — v05.76, J110 ① (block 135): the 📥 Keep import (Google Takeout ▸ Keep).

   A FAKE Takeout Keep folder of 40 .json notes (+ .html copies, Labels.txt, a jpg, a png, a 3gp voice memo): text, html text, a checklist,
   labels, archived, trashed, pinned, colour, pictures, a voice memo, a file that is named but missing, a broken json, an empty title,
   a weblink, a note with no createdTimestampUsec.
   135a  the menu item is reached by a real tap (390 / 820 / 1440) and opens the dialog (bottom sheet on a phone)
   135b  the dry run: the counts are exact and NOTHING is written (DB, theme, trash, tombstones byte-identical)
   135c  the import: folders (Keep (Imported), Archived), tags, checklists, pictures by reference, files, links, titles, Keep's Trash skipped,
         Keep's pin is not Siyagah's pin, text cleaned
   135d  dates: createdAt = updatedAt = Keep's created time (else its edit time); the card says "📥 Keep · created …"; the list is by creation date
   135e  a second run adds nothing; a note in Trash or a tombstone is never re-added
   135f  the daily cap is honoured and a later day carries on
   135g  scale: 3,000 notes at 1440 and at 390 ×4 CPU (time, longest task, heap)
   `--only=135c,135e`. */
import { playwright, serve, seedDB, hostLimit } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, check, results } from './s1-fake.mjs';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);
const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];

const pw = await playwright();
const srv = await serve();
const browser = await pw.chromium.launch({ args: ['--js-flags=--max-old-space-size=8192'] });
const TMP = mkdtempSync(join(tmpdir(), 'keep-import-'));

/* ── the fake Takeout ── */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const JPG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
const BASE = 1552392000e6;   /* 12 Mar 2019 12:00 UTC, in microseconds */
const DAY = 86400e6;
const usec = (d) => BASE + d * DAY;
const isoOf = (u) => new Date(Math.floor(u / 1000)).toISOString();
const NOTES = {};   /* file name → object (or a raw string) */
const note = (n, o, d) => { NOTES[n + '.json'] = Object.assign({ color: 'DEFAULT', isTrashed: false, isPinned: false, isArchived: false, userEditedTimestampUsec: usec(d + 0.5), createdTimestampUsec: usec(d), title: '', textContent: '' }, o); };
note('n01', { title: 'Plain text', textContent: 'Line one\nLine two' }, 0);
note('n02', { title: 'Html text', textContentHtml: '<p dir="ltr">Hello <b>bold</b></p><script>window.__kpx=1</script><a href="javascript:alert(1)" onclick="alert(2)">x</a>', textContent: 'Hello bold' }, 1);
note('n03', { title: 'Shopping', listContent: [{ text: 'Milk', isChecked: true }, { text: 'Eggs <b>', isChecked: false }] }, 2);
note('n04', { title: 'Labelled', textContent: 'Has two labels', labels: [{ name: 'Work' }, { name: 'Idea, big' }] }, 3);
note('n05', { title: 'Archived one', textContent: 'Old', isArchived: true }, 4);
note('n06', { title: 'In Keep trash', textContent: 'Binned', isTrashed: true }, 5);
note('n07', { title: 'Pinned one', textContent: 'Pinned in Keep', isPinned: true }, 6);
note('n08', { title: 'Blue one', textContent: 'Coloured', color: 'BLUE' }, 7);
note('n09', { title: 'Has a jpg', textContent: 'See picture', attachments: [{ filePath: 'pic1.jpg', mimetype: 'image/jpeg' }] }, 8);
note('n10', { title: 'Has a png', textContent: 'See picture', attachments: [{ filePath: 'pic2.png', mimetype: 'image/png' }] }, 9);
note('n11', { title: 'Voice memo', textContent: '', attachments: [{ filePath: 'memo1.3gp', mimetype: 'audio/3gpp' }] }, 10);
note('n12', { title: 'Missing file', textContent: 'File is not here', attachments: [{ filePath: 'gone.jpg', mimetype: 'image/jpeg' }] }, 11);
NOTES['n13.json'] = '{ this is not json';
note('n14', { title: '', textContent: 'This is a fairly long first line that should be cut at about sixty characters wide, for sure' }, 13);
note('n15', { title: 'With links', textContent: 'Links below', annotations: [{ url: 'https://example.com/a', title: 'Example', source: 'WEBLINK' }, { url: 'javascript:alert(1)', title: 'Bad', source: 'WEBLINK' }] }, 14);
NOTES['n16.json'] = { color: 'DEFAULT', isTrashed: false, isPinned: false, isArchived: false, userEditedTimestampUsec: usec(300), title: 'No created time', textContent: 'Only an edit time' };
note('n17', { title: '', textContent: '' }, 16);
for (let i = 18; i <= 40; i++) note('n' + i, { title: 'Filler ' + i, textContent: 'Filler body ' + i }, i);
const FIX = { total: 40, broken: 1, trashed: 1, notes: 38, lists: 1, pics: 2, memo: 1, labels: 2, pinned: 1, archived: 1, missing: 1, skipped: 3 };
const writeTakeout = (root, notes, extra = true) => {
  const dir = join(root, 'Takeout', 'Keep'); mkdirSync(dir, { recursive: true });
  for (const [n, v] of Object.entries(notes)) writeFileSync(join(dir, n), typeof v === 'string' ? v : JSON.stringify(v));
  if (extra) {
    writeFileSync(join(dir, 'pic1.jpg'), JPG); writeFileSync(join(dir, 'pic2.png'), PNG); writeFileSync(join(dir, 'memo1.3gp'), Buffer.from('3gp-fake-bytes-0123456789'));
    writeFileSync(join(dir, 'Labels.txt'), 'Work\nIdea, big\n'); writeFileSync(join(dir, 'n01.html'), '<html></html>'); writeFileSync(join(dir, 'other.txt'), 'x');
  }
  return dir;
};
const DIR = writeTakeout(join(TMP, 'fix'), NOTES);

const T0 = '2026-10-01T00:00:00.000Z';
const dev = (vp) => addDevice(browser, srv.base, makeCloud(), 'D' + vp.name, { width: vp.w, height: vp.h }, vp.touch, seedDB(T0), {});
const act = (d, vp, sel, opt) => (vp.touch ? d.page.locator(sel, opt).first().tap() : d.page.locator(sel, opt).first().click());
const each = async (id, fn, vps = VPS) => {
  for (const vp of vps) {
    let d = null;
    try { d = await dev(vp); d.page.setDefaultTimeout(30000); await sleep(800); await fn(d, vp); }
    catch (e) { check(false, `${id}@${vp.name} threw: ${String(e && e.message || e).split('\n')[0]}`); }
    finally { if (d) await d.ctx.close(); }
  }
};
const noErr = (d, tag) => check(d.errors.length === 0, `${tag} no page errors`, d.errors.slice(0, 2).join(' · '));
const ready = async (d) => { const ok = await d.page.waitForFunction(() => _s2RefsOk(), null, { timeout: 20000 }).then(() => true).catch(() => false); if (!ok) await on(d, () => { window._s2RefsOk = () => true; }); };
const dlg = async (d, vp) => {
  await act(d, vp, '#sb-tools-btn'); await sleep(300);
  await act(d, vp, '#sb-tools .sb-mi', { hasText: 'Keep import' });
  await d.page.waitForSelector('#kp-modal.open #kp-box');
};
const isOpen = (d) => on(d, () => { const m = document.getElementById('kp-modal'); return !!m && m.classList.contains('open'); });
const toPick = async (d, vp) => { if (await isOpen(d)) await on(d, () => { _kp.view = 'pick'; _kpPaint(); }); else await dlg(d, vp); };
const lookAt = async (d, vp, dir, to = 120000) => { await toPick(d, vp); await d.page.setInputFiles('#kp-dir', dir); await d.page.waitForSelector('#kp-totals', { timeout: to }); };
const bring = async (d, vp, dir, to = 120000) => {
  await lookAt(d, vp, dir, to);
  await act(d, vp, '#kp-bring');
  await d.page.waitForFunction(() => !_kp.imp.run && ['done', 'capped', 'paused'].includes(_kp.imp.state), null, { timeout: to });
};
const kept = (d) => on(d, () => DB.articles.filter((a) => a.fromKeep).length);
const snap = (d) => on(d, () => JSON.stringify([DB.articles, DB.folders, DB.sections, DB.trash, DB.tombstones, DB.theme]));
const byTitle = (d, t) => on(d, (t) => { const a = DB.articles.find((x) => x.fromKeep && x.title === t); return a ? JSON.parse(JSON.stringify(a)) : null; }, t);

try {
  /* ══ 135a + 135b — the menu, the dry run ══ */
  if (want('135b')) await each('135b', async (d, vp) => {
    const t = `135b@${vp.name}`;
    await ready(d);
    await dlg(d, vp);
    const sheet = await on(d, () => { const b = document.getElementById('kp-box').getBoundingClientRect(); return { w: b.width, vw: innerWidth, bottom: Math.round(b.bottom), vh: innerHeight, btn: !!document.getElementById('kp-dirbtn'), files: !!document.getElementById('kp-filebtn') }; });
    check(sheet.btn && sheet.files, `${t} (135a) the real tap on 🧰 → 📥 Keep import opens the dialog with “Choose the Keep folder” and a files choice`, JSON.stringify(sheet));
    if (vp.w < 640) check(sheet.w >= sheet.vw - 2 && sheet.bottom >= sheet.vh - 2, `${t} phone: a full-width bottom sheet (${Math.round(sheet.w)} of ${sheet.vw})`);
    else check(sheet.w <= 640, `${t} the dialog is a centred window (${Math.round(sheet.w)} px)`);
    const before = await snap(d), ls = await on(d, () => JSON.stringify(Object.assign({}, localStorage)));
    await d.page.setInputFiles('#kp-dir', DIR); await d.page.waitForSelector('#kp-totals', { timeout: 60000 });
    const g = await on(d, () => { const m = {}; document.querySelectorAll('#kp-totals dt').forEach((dt) => { m[dt.textContent] = dt.nextElementSibling.textContent; }); return { m, broken: [...document.querySelectorAll('#kp-broken li')].map((x) => x.textContent), missing: [...document.querySelectorAll('#kp-missing li')].map((x) => x.textContent), skipped: (document.getElementById('kp-skipped') || {}).textContent, nodate: (document.getElementById('kp-nodate') || {}).textContent }; });
    const m = g.m;
    check(m.Notes === String(FIX.notes) && m.Checklists === '1' && m.Pictures === '2' && m['Voice memos / other files'] === '1' && m.Labels === '2', `${t} counts: ${FIX.notes} notes, 1 checklist, 2 pictures, 1 voice memo, 2 labels`, JSON.stringify(m));
    check(m['Pinned in Keep'] === '1' && m.Archived === '1' && m['In Keep’s Trash (skipped)'] === '1' && m['Already in Siyagah'] === '0' && m['Could not be read'] === '1', `${t} counts: 1 pinned, 1 archived, 1 in Keep's Trash (skipped), 0 already, 1 broken`, JSON.stringify(m));
    check(g.broken.length === 1 && /n13\.json/.test(g.broken[0]) && g.missing.length === 1 && /gone\.jpg/.test(g.missing[0]) && /3 other files/.test(g.skipped || ''), `${t} the broken file and the missing file are listed by name; 3 other files skipped`, JSON.stringify([g.broken, g.missing, g.skipped]));
    check(g.nodate === undefined, `${t} no “no date” line: every note has a created or an edit time`);
    const after = await snap(d), ls2 = await on(d, () => JSON.stringify(Object.assign({}, localStorage)));
    check(before === after && ls === ls2 && (await kept(d)) === 0, `${t} the dry run wrote nothing: notes, folders, sections, Trash, tombstones and settings are byte-identical, localStorage too`);
    check(await on(d, () => !DB.folders.some((f) => f.kp) && !!document.getElementById('kp-bring') && /nothing has been added/.test(document.getElementById('kp-dry').textContent)), `${t} no Keep folder yet; the dry-run note and “Bring them in” are shown`);
    noErr(d, t);
  });

  /* ══ 135c + 135d — the import, the dates ══ */
  if (want('135c') || want('135d')) await each('135c', async (d, vp) => {
    const t = `135c@${vp.name}`;
    await ready(d);
    await dlg(d, vp);
    const arts0 = await on(d, () => DB.articles.length);
    await bring(d, vp, DIR);
    const st = await on(d, () => ({ s: _kp.imp.state, took: _kp.imp.took, msg: (document.getElementById('kp-idone') || {}).textContent, sum: (document.getElementById('kp-isum') || {}).textContent }));
    check(st.s === 'done' && st.took === FIX.notes && /My Notebooks ▸ Keep \(Imported\)/.test(await on(d, () => document.getElementById('kp-box').textContent)), `${t} done: ${FIX.notes} notes brought in, the message names “My Notebooks ▸ Keep (Imported)”`, JSON.stringify(st));
    check(/^✅ Done\. 38 notes brought in this time \(1 archived\)/.test(st.msg || '') && /Not in the folder, so left out: gone\.jpg/.test(st.sum || ''), `${t} the totals and the missing file are in the summary`, st.msg + ' | ' + st.sum);
    const f = await on(d, () => ({ root: DB.folders.find((x) => x.id === 'kp-root'), arch: DB.folders.find((x) => x.id === 'kp-arch'), sec: (DB.sections.find((s) => s.name === 'My Notebooks') || {}).id, n: DB.articles.length }));
    check(f.root && f.root.name === 'Keep (Imported)' && f.root.parentId === null && f.root.sectionId === f.sec && f.root.kp.kind === 'root', `${t} “Keep (Imported)” is a top folder of My Notebooks, marked kp`, JSON.stringify(f.root));
    check(f.arch && f.arch.name === 'Archived' && f.arch.parentId === 'kp-root' && f.arch.kp.kind === 'archived', `${t} “Archived” is its subfolder (kp-arch)`, JSON.stringify(f.arch));
    check(f.n === arts0 + FIX.notes, `${t} exactly ${FIX.notes} notes were added (${arts0} → ${f.n}); the 3 seeded notes are untouched`);
    const own = await on(d, () => DB.articles.filter((a) => !a.fromKeep).every((a) => ['a1', 'a2', 'a3'].includes(a.id) && a.updatedAt === '2026-10-01T00:00:00.000Z'));
    check(own, `${t} (I1) the owner's own notes are untouched`);
    /* content */
    const n3 = await byTitle(d, 'Shopping'), n1 = await byTitle(d, 'Plain text'), n2 = await byTitle(d, 'Html text'), n4 = await byTitle(d, 'Labelled');
    check(n3 && /☑ Milk/.test(n3.content) && /☐ Eggs &lt;b&gt;/.test(n3.content), `${t} the checklist is one line each, ☑ / ☐, text escaped`, n3 && n3.content);
    check(n1 && /Line one<br>Line two/.test(n1.content), `${t} text keeps its line breaks`, n1 && n1.content);
    check(n2 && /<b>bold<\/b>/.test(n2.content) && !/<script|onclick|javascript:/i.test(n2.content) && (await on(d, () => window.__kpx)) === undefined, `${t} html text is kept and cleaned (no script, no handler, no javascript:)`, n2 && n2.content);
    const tagWant = await on(d, () => [_cleanTag('Work'), _cleanTag('Idea, big')]);
    check(n4 && JSON.stringify(n4.tags) === JSON.stringify(tagWant) && n4.tags.length === 2 && n4.tags.every((x) => !x.includes(',')), `${t} labels became tags through _cleanTag`, JSON.stringify(n4 && n4.tags));
    const n9 = await byTitle(d, 'Has a jpg'), n10 = await byTitle(d, 'Has a png'), n11 = await byTitle(d, 'Voice memo');
    const pics = await on(d, (a) => a.map((c) => { const m = /<img class="ed-img" data-pic="([0-9a-f]{64})" data-mime="([^"]*)" alt="">/.exec(c); return m && { sha: m[1], mime: m[2], known: _picKnown.has(m[1]), src: /src=/.test(c), data: /data:/.test(c) }; }), [n9.content, n10.content]);
    check(pics.every((p) => p && p.known && !p.src && !p.data) && pics[0].mime === 'image/jpeg' && pics[1].mime === 'image/png', `${t} pictures are by reference (data-pic, no src, no data:), held in the picture store`, JSON.stringify(pics));
    const fl = await on(d, async (c) => { const m = /<span class="enx-file" contenteditable="false" data-file="([0-9a-f]{64})" data-mime="([^"]*)" data-name="([^"]*)">🎧 /.exec(c); if (!m) return null; const r = await _fileGet(m[1]); return { mime: m[2], name: m[3], held: !!r, n: r && r.n }; }, n11.content);
    check(fl && fl.held && fl.name === 'memo1.3gp' && fl.mime === 'audio/3gpp' && fl.n === 25, `${t} the 3gp voice memo is an audio chip, bytes in siyagah-files-v1`, JSON.stringify(fl));
    const n12 = await byTitle(d, 'Missing file'), n15 = await byTitle(d, 'With links');
    check(n12 && /File is not here/.test(n12.content) && !/data-file|data-pic/.test(n12.content), `${t} a note naming a missing file is still imported`);
    check(n15 && /<a href="https:\/\/example\.com\/a">Example<\/a>/.test(n15.content) && !/href="javascript/i.test(n15.content) && /Bad \(javascript:alert\(1\)\)/.test(n15.content), `${t} weblinks end the note; https only is a link`, n15 && n15.content);
    const titles = await on(d, () => ({ long: DB.articles.find((a) => a.fromKeep && a.fromKeep.file === 'n14.json').title, empty: DB.articles.find((a) => a.fromKeep && a.fromKeep.file === 'n17.json').title }));
    check(titles.long.length <= 60 && titles.long.startsWith('This is a fairly long first line') && titles.empty === 'Keep note', `${t} empty title → the first words (≤ 60) else “Keep note”`, JSON.stringify(titles));
    const flags = await on(d, () => { const g = (f) => DB.articles.find((a) => a.fromKeep && a.fromKeep.file === f); return { trashed: DB.articles.some((a) => a.fromKeep && a.fromKeep.file === 'n06.json'), pin: g('n07.json').fromKeep.pinned === true && !g('n07.json').pinned, anyPinned: DB.articles.filter((a) => a.fromKeep && a.pinned).length, colour: g('n08.json').fromKeep.color, arch: g('n05.json').folderIds.join(), archFlag: g('n05.json').archived, root: g('n01.json').folderIds.join(), brokenIn: DB.articles.some((a) => a.fromKeep && a.fromKeep.file === 'n13.json') }; });
    check(!flags.trashed && !flags.brokenIn, `${t} Keep's Trash note and the broken file were not brought in`);
    check(flags.pin && flags.anyPinned === 0, `${t} Keep's pin is kept in fromKeep.pinned and is NOT Siyagah's pinned`);
    check(flags.colour === 'BLUE' && flags.arch === 'kp-arch' && !flags.archFlag && flags.root === 'kp-root', `${t} colour kept; archived note is in kp-arch (not Siyagah's archived); the rest in kp-root`, JSON.stringify(flags));
    /* 135d — the dates */
    const dt = await on(d, () => DB.articles.filter((a) => a.fromKeep).map((a) => ({ f: a.fromKeep.file, c: a.createdAt, u: a.updatedAt, fc: a.fromKeep.created, fe: a.fromKeep.edited, at: a.fromKeep.at })));
    const want = (file) => { const o = NOTES[file]; const u = o.createdTimestampUsec != null ? o.createdTimestampUsec : o.userEditedTimestampUsec; return isoOf(u); };
    const bad = dt.filter((x) => x.c !== want(x.f) || x.u !== x.c || x.fc !== x.c);
    check(dt.length === FIX.notes && bad.length === 0, `${t} (135d) createdAt = updatedAt = fromKeep.created = Keep's created time on all ${dt.length} notes`, JSON.stringify(bad.slice(0, 2)));
    const one = dt.find((x) => x.f === 'n01.json'), nc = dt.find((x) => x.f === 'n16.json');
    check(one.c === '2019-03-12T12:00:00.000Z' && one.fe === isoOf(usec(0.5)) && one.at > T0, `${t} Keep's own edit time stays in fromKeep.edited; fromKeep.at is the import time`, JSON.stringify(one));
    check(nc.c === isoOf(usec(300)), `${t} a note with no createdTimestampUsec uses its edit time (${nc.c})`);
    /* the card and the list order */
    await on(d, () => { hideCtx(); closeModal(); closeKeepImport(); if (innerWidth < 1200) showPane('p2'); selFolder('kp-root'); });
    await d.page.waitForSelector('#p2 .ar .ar-keep');
    const card = await on(d, () => {
      const ids = [...document.querySelectorAll('#p2 .ar[data-aid]')].map((x) => x.dataset.aid);
      const a = DB.articles.find((x) => x.fromKeep && x.fromKeep.file === 'n01.json'), el = document.querySelector(`#p2 .ar[data-aid="${a.id}"] .ar-keep`);
      const want = new Date(a.fromKeep.created).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
      const p = DB.articles.find((x) => x.fromKeep && x.fromKeep.file === 'n07.json'), pe = document.querySelector(`#p2 .ar[data-aid="${p.id}"] .ar-keep`);
      const bl = DB.articles.find((x) => x.fromKeep && x.fromKeep.file === 'n08.json'), be = document.querySelector(`#p2 .ar[data-aid="${bl.id}"] .ar-keep .kp-dot`);
      const exp = DB.articles.filter((x) => x.fromKeep && x.folderIds[0] === 'kp-root').sort((x, y) => y.fromKeep.created.localeCompare(x.fromKeep.created)).map((x) => x.id);
      return { txt: el && el.textContent, want, pin: pe && pe.textContent, dot: !!be, ids, exp, meta: document.querySelector(`#p2 .ar[data-aid="${a.id}"]`).textContent };
    });
    check(card.txt && card.txt.startsWith('📥 Keep · created ') && card.txt.includes(card.want), `${t} the card says “${card.txt}”`, card.want);
    check(card.pin && card.pin.includes('📌') && card.dot, `${t} a pinned note shows 📌 and a Keep-colour dot on its card`, card.pin);
    check(JSON.stringify(card.ids) === JSON.stringify(card.exp), `${t} the Keep folder lists the notes by creation date, newest first (${card.ids.length} cards)`, card.ids.slice(0, 4).join() + ' vs ' + card.exp.slice(0, 4).join());
    await on(d, () => { const a = DB.articles.find((x) => x.fromKeep && x.fromKeep.file === 'n01.json'); selArt(a.id); });
    await d.page.waitForSelector('.av-keep');
    const rv = await on(d, () => { const a = DB.articles.find((x) => x.fromKeep && x.fromKeep.file === 'n01.json'); return { t: document.querySelector('.av-keep').textContent, w: new Date(a.fromKeep.created).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) }; });
    check(rv.t.startsWith('📥 Keep · created ') && rv.t.includes(rv.w), `${t} the read view says “${rv.t}”`);
    await on(d, () => { const a = DB.articles.find((x) => x.fromKeep && x.fromKeep.file === 'n01.json'); a.content += '<p>edited</p>'; a.updatedAt = new Date().toISOString(); persist(); renderP2C && renderP2C(); });
    await sleep(300);
    const kept2 = await on(d, () => { const a = DB.articles.find((x) => x.fromKeep && x.fromKeep.file === 'n01.json'); const el = document.querySelector(`#p2 .ar[data-aid="${a.id}"] .ar-keep`); return el && el.textContent; });
    check(kept2 === card.txt, `${t} after the owner edits the note the line still says the original creation date`, kept2);
    /* Smart View */
    const sv = await on(d, () => { const s = SF.find((x) => x.id === 'sf-keep'); return { name: s && s.name, n: getSmartArts('sf-keep').length }; });
    check(sv.name === '(15) From Keep' && sv.n === FIX.notes, `${t} Smart View “(15) From Keep” lists ${sv.n} notes`, JSON.stringify(sv));
    noErr(d, t);
  });

  /* ══ 135e — a second run; Trash and tombstones block a re-add ══ */
  if (want('135e')) await each('135e', async (d, vp) => {
    const t = `135e@${vp.name}`;
    await ready(d);
    await dlg(d, vp);
    await bring(d, vp, DIR);
    const c1 = await kept(d), fold1 = await on(d, () => DB.folders.length);
    await bring(d, vp, DIR);
    const r = await on(d, () => ({ n: DB.articles.filter((a) => a.fromKeep).length, took: _kp.imp.took, earlier: _kp.imp.earlier, f: DB.folders.length, s: _kp.imp.state }));
    check(r.n === c1 && r.took === 0 && r.earlier === FIX.notes && r.f === fold1 && r.s === 'done', `${t} a second run adds nothing (${c1} → ${r.n}; ${r.earlier} left as they were; no new folder)`, JSON.stringify(r));
    /* Trash and a tombstone */
    const ids = await on(d, () => {
      const a = DB.articles.find((x) => x.fromKeep && x.fromKeep.file === 'n20.json'), b = DB.articles.find((x) => x.fromKeep && x.fromKeep.file === 'n21.json');
      DB.articles = DB.articles.filter((x) => x !== a && x !== b);
      DB.trash.push({ type: 'article', item: a, deletedAt: new Date().toISOString() });
      DB.tombstones = DB.tombstones || []; DB.tombstones.push({ id: b.id, deletedAt: new Date().toISOString() });
      persist(); return [a.id, b.id];
    });
    await bring(d, vp, DIR);
    const r2 = await on(d, (ids) => ({ n: DB.articles.filter((a) => a.fromKeep).length, back: DB.articles.some((a) => ids.includes(a.id)), took: _kp.imp.took }), ids);
    check(r2.n === c1 - 2 && !r2.back && r2.took === 0, `${t} a note in Trash and a note with a tombstone are not added again (${r2.n} of ${c1})`, JSON.stringify(r2));
    noErr(d, t);
  });

  /* ══ 135f — the cap ══ */
  if (want('135f')) await each('135f', async (d, vp) => {
    const t = `135f@${vp.name}`;
    await ready(d);
    await dlg(d, vp);
    await on(d, () => { window.__enxCap = 5; window.__enxNow = Date.now(); });
    await bring(d, vp, DIR);
    const r1 = await on(d, () => ({ s: _kp.imp.state, took: _kp.imp.took, n: DB.articles.filter((a) => a.fromKeep).length, cont: !!document.getElementById('kp-cont'), dis: (document.getElementById('kp-cont') || {}).disabled, txt: (document.getElementById('kp-icap') || {}).textContent }));
    check(r1.s === 'capped' && r1.took === 5 && r1.n === 5 && r1.cont && r1.dis === true, `${t} with a cap of 5 it brings in 5, stops, and Continue waits`, JSON.stringify(r1));
    await on(d, () => { window.__enxNow = Date.now() + 25 * 3600000; });
    await on(d, () => { _kpPaint(); });
    await act(d, vp, '#kp-cont');
    await d.page.waitForFunction(() => !_kp.imp.run && ['capped', 'done'].includes(_kp.imp.state) && _kp.imp.took > 0, null, { timeout: 60000 });
    const r2 = await on(d, () => ({ took: _kp.imp.took, n: DB.articles.filter((a) => a.fromKeep).length }));
    check(r2.took === 5 && r2.n === 10, `${t} a day later Continue brings in the next 5 (${r2.n} in all)`, JSON.stringify(r2));
    noErr(d, t);
  }, [VPS[2]]);

  /* ══ 135g — scale: 3,000 notes ══ */
  if (want('135g')) {
    const big = {};
    for (let i = 0; i < 3000; i++) big['k' + String(i).padStart(4, '0') + '.json'] = { color: i % 9 ? 'DEFAULT' : 'GREEN', isTrashed: false, isPinned: i % 50 === 0, isArchived: i % 40 === 0, userEditedTimestampUsec: usec(i + 0.5), createdTimestampUsec: usec(i), title: 'Big ' + i, textContent: 'Body of note ' + i + '\nsecond line ' + 'x'.repeat(i % 200), labels: i % 3 ? [{ name: 'L' + (i % 20) }] : [], listContent: i % 7 ? undefined : [{ text: 'a' + i, isChecked: i % 2 === 0 }] };
    const BIG = writeTakeout(join(TMP, 'big'), big, false);
    await each('135g', async (d, vp) => {
      const t = `135g@${vp.name}`;
      await ready(d);
      const cdp = await d.ctx.newCDPSession(d.page); if (vp.w < 640) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await on(d, () => { window.__lt = []; try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(e.duration))).observe({ entryTypes: ['longtask'] }); } catch (e) {} window.__enxCap = 10000; });
      await dlg(d, vp);
      const h0 = await on(d, () => performance.memory ? performance.memory.usedJSHeapSize : 0);
      const t0 = Date.now();
      await d.page.setInputFiles('#kp-dir', BIG); await d.page.waitForSelector('#kp-totals', { timeout: 300000 });
      const tLook = Date.now() - t0, mxLook = await on(d, () => Math.max(0, ...window.__lt));
      await on(d, () => { window.__lt.length = 0; });
      const t1 = Date.now();
      await act(d, vp, '#kp-bring');
      await d.page.waitForFunction(() => !_kp.imp.run && _kp.imp.state === 'done', null, { timeout: 600000 });
      const tImp = Date.now() - t1;
      const r = await on(d, () => ({ n: DB.articles.filter((a) => a.fromKeep).length, mx: Math.max(0, ...window.__lt), heap: performance.memory ? performance.memory.usedJSHeapSize : 0 }));
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      console.log(`  note  ${t}: look ${(tLook / 1000).toFixed(1)} s (longest task ${Math.round(mxLook)} ms) · import ${(tImp / 1000).toFixed(1)} s (longest task ${Math.round(r.mx)} ms) · heap +${Math.round((r.heap - h0) / 1048576)} MB`);
      check(r.n === 3000, `${t} 3,000 notes brought in`, JSON.stringify(r));
      const lim = hostLimit(vp.w < 640 ? 250 : 150);
      check(r.mx <= lim.ms && mxLook <= lim.ms, `${t} longest task ${Math.round(Math.max(r.mx, mxLook))} ms (limit ${lim.text})`);
      noErr(d, t);
    }, [VPS[2], VPS[0]]);
  }
} finally {
  await browser.close(); await srv.close();
}
const bad = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - bad}/${results.length} passed${bad ? ', ' + bad + ' FAILED' : ''}`);
process.exit(bad ? 1 : 0);
