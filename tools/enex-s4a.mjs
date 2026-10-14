#!/usr/bin/env node
/* tools/enex-s4a.mjs — v05.13, S4a: the Evernote import DRY RUN (checks 73a–73i).

   Every check runs at 390x844 (touch), 820x1180 (touch) and 1440x900 (mouse) unless it names a size, against a booted app, with real
   taps or clicks. Nothing touches the network. The fixtures are WRITTEN BY THIS FILE into a temp dir (no binary file is committed).

   73a  reachable: 🧰 → "📥 Evernote import" by real clicks opens a dialog (820, 1440) or a bottom sheet (390); the folder button is
        there on 820/1440 and not on a phone; the one-line stacks note; Close works
   73b  folder pick (820, 1440; setInputFiles on the folder input): every total and every notebook row equals the generator's own counts;
        stacks come from the folders; the broken notes are listed; the non-.enex file is counted as skipped
   73c  file pick (all three): the same notes arrive with no stacks
   73d  already in Siyagah: the matching note (title trimmed, case-insensitive, same created second) is counted, a near miss
        (one second later) is not; the tag overlap (case-insensitive) is right
   73e  nothing written: DB, the IndexedDB `notebook` record, localStorage and the list of databases are byte-identical before and after,
        and the fake cloud got no write
   73f  Stop: stopping mid-file leaves a clean "Stopped" state and no page error; a second run afterwards completes
   73g  scale and memory: a generated 150 MB .enex (2,000 notes, most of the bytes base64 <data>) at 1440 and at 390 with CPU x4: it
        completes; no long task over 200 ms; the JS heap never grows by more than 60 MB (all figures printed)
   73h  copy summary: the clipboard gets the totals; when the clipboard is refused a selectable box appears
   73i  contrast of the new text on the five presets

   `--only=73a,73c` runs just those. Each printed ok/FAIL line becomes one app-check check (block 73). */
import { playwright, serve, seedDB } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, quiet, waitSeeded, check, results } from './s1-fake.mjs';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, openSync, writeSync, closeSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);
if (argv.includes('--fails')) { const o = console.log; let skip = false; console.log = (...x) => { const t = x.join(' '); if (/^\s+ok\s/.test(t)) { skip = true; return; } if (skip && /^\s{6,}\S/.test(t)) { skip = false; return; } skip = false; o(...x); }; }

const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];
const pw = await playwright();
const srv = await serve();
const browser = await pw.chromium.launch();
const TMP = mkdtempSync(join(tmpdir(), 'enex-s4a-'));

/* ── the fixture generator ── */
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const b64 = (bytes) => randomBytes(bytes).toString('base64').replace(/(.{76})/g, '$1\n');
const MB = 1048576;
const HEAD = '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE en-export SYSTEM "http://xml.evernote.com/pub/evernote-export4.dtd">\n<en-export export-date="20261014T000000Z" application="Evernote" version="10.0">\n';
function noteXML(n) {
  const res = (n.res || []).map((r) => `<resource><data encoding="base64">\n${r.b64 || b64(r.bytes)}\n</data><mime>${r.mime}</mime><width>10</width><height>10</height><resource-attributes><file-name>${esc(r.name)}</file-name></resource-attributes></resource>`).join('\n');
  const media = (n.res || []).map((r) => `<en-media hash="0123abc" type="${r.mime}"/>`).join('');
  const body = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd"><en-note><div title="a ]]&gt; b &lt;/content&gt;">Body of ${esc(n.title)}</div>${media}</en-note>`;
  const content = n.cut ? `<content><![CDATA[<en-note><div>cut off in the middle of a sent` : `<content><![CDATA[${body}]]></content>`;
  const head = `<note>\n<title>${esc(n.title)}</title>\n<created>${n.created}</created>\n<updated>${n.updated || n.created}</updated>\n${(n.tags || []).map((t) => `<tag>${esc(t)}</tag>`).join('\n')}\n<note-attributes><source-url>https://x.example/?a=1&amp;b=2</source-url></note-attributes>\n${content}\n`;
  return n.cut ? head : head + res + '\n</note>\n';
}
const T = (n) => ({ ...n });
/* name -> notes. `already` marks the ones the seed notebook holds. */
const BOOKS = [
  { stack: 'Stack A', name: 'Alpha', notes: [
    { title: 'Hello world', created: '20200101T000000Z', tags: ['travel', 'work'], res: [{ mime: 'image/png', name: 'a.png', bytes: 1.5 * MB }] },
    { title: 'Ünïcödé 日本語 title ☕', created: '20210615T120000Z', tags: ['work'], res: [{ mime: 'application/pdf', name: 'b.pdf', bytes: 3 * MB }, { mime: 'audio/mpeg', name: 'c.mp3', bytes: 0.5 * MB }] },
    { title: '  CAFÉ ☕ note  ', created: '20240305T102030Z', tags: [], already: true } ] },
  { stack: 'Stack A', name: 'Beta', notes: [
    { title: 'Café ☕ Note', created: '20240305T102031Z', tags: ['R&D'], res: [{ mime: 'image/jpeg', name: 'd.jpg', bytes: 1 * MB }, { mime: 'image/jpeg', name: 'e.jpg', bytes: 2 * MB }, { mime: 'application/zip', name: 'f.zip', bytes: 0.25 * MB }] },
    { title: 'Broken date', created: '20241399T000000Z', broken: true } ] },
  { stack: 'Stack B', name: 'Gamma', notes: [
    { title: 'Gamma one', created: '20231231T235959Z', tags: [] },
    { title: 'Gamma two', created: '20250101T000000Z', tags: [], res: [{ mime: 'image/png', name: 'g.png', bytes: 4096 }] } ] },
  { stack: '', name: 'Loose', notes: [
    { title: 'Loose note', created: '20220202T020202Z', tags: ['seed'] },
    { title: 'Cut off here', created: '20230303T030303Z', cut: true, broken: true } ] },
];
const EXPORT = join(TMP, 'export');
for (const b of BOOKS) {
  const dir = b.stack ? join(EXPORT, b.stack) : EXPORT;
  mkdirSync(dir, { recursive: true });
  for (const n of b.notes) for (const r of n.res || []) r.b64 = b64(Math.round(r.bytes));
  writeFileSync(join(dir, b.name + '.enex'), HEAD + b.notes.map(noteXML).join('') + (b.notes.some((n) => n.cut) ? '' : '</en-export>\n'));
}
writeFileSync(join(EXPORT, 'Stack A', 'readme.txt'), 'not an enex file');
const FILES = BOOKS.map((b) => join(b.stack ? join(EXPORT, b.stack) : EXPORT, b.name + '.enex'));
const TXT = join(EXPORT, 'Stack A', 'readme.txt');

/* the generator's own counts */
const kind = (m) => (m.startsWith('image/') ? 'img' : m === 'application/pdf' ? 'pdf' : m.startsWith('audio/') ? 'audio' : 'other');
const mbs = (b) => (b / MB).toFixed(1) + ' MB';
const bookExp = (b) => {
  const ok = b.notes.filter((n) => !n.broken), res = ok.flatMap((n) => n.res || []);
  return { notes: ok.length, pics: res.filter((r) => kind(r.mime) === 'img').length, mb: (res.reduce((s, r) => s + Math.round(r.bytes), 0) / MB).toFixed(1), already: ok.filter((n) => n.already).length, broken: b.notes.filter((n) => n.broken).map((n) => n.title) };
};
const okNotes = BOOKS.flatMap((b) => b.notes.filter((n) => !n.broken));
const allRes = okNotes.flatMap((n) => n.res || []);
const sumB = (k) => allRes.filter((r) => kind(r.mime) === k).reduce((s, r) => s + Math.round(r.bytes), 0);
const cnt = (k) => allRes.filter((r) => kind(r.mime) === k).length;
const tagsAll = [...new Set(okNotes.flatMap((n) => n.tags || []))];
const EXP = {
  Notebooks: String(BOOKS.length), Notes: String(okNotes.length), Tags: `${tagsAll.length} (2 already in Siyagah)`,
  Pictures: `${cnt('img')} · ${mbs(sumB('img'))}`, PDFs: `${cnt('pdf')} · ${mbs(sumB('pdf'))}`, Audio: `${cnt('audio')} · ${mbs(sumB('audio'))}`, 'Other files': `${cnt('other')} · ${mbs(sumB('other'))}`,
  'Oldest note': '2020-01-01', 'Newest note': '2025-01-01', 'Already in Siyagah': '1', 'Could not be read': '2',
};

/* the big file: 2,000 notes, 56,000 raw bytes (~77 KB of base64 with line breaks) each = ~153 MB */
let BIG = null, BIG_BYTES = 0;
function makeBig() {
  if (BIG) return BIG;
  mkdirSync(join(TMP, 'big'), { recursive: true }); BIG = join(TMP, 'big', 'Big notebook.enex');
  const one = b64(56000), fd = openSync(BIG, 'w');
  writeSync(fd, HEAD);
  for (let i = 0; i < 2000; i++) {
    const s = noteXML({ title: 'Big note ' + i, created: '2020' + String(1 + (i % 12)).padStart(2, '0') + String(1 + (i % 28)).padStart(2, '0') + 'T101010Z', tags: ['big', 't' + (i % 50)], res: [{ mime: 'image/png', name: 'p' + i + '.png', bytes: 56000, b64: one }] });
    writeSync(fd, s);
  }
  writeSync(fd, '</en-export>\n'); closeSync(fd);
  BIG_BYTES = statSync(BIG).size;
  return BIG;
}

/* ── the harness ── */
const seed = () => {
  const db = seedDB('2026-10-01T00:00:00.000Z');
  db.articles.push({ id: 'ev1', title: 'Café ☕ Note', content: '<p>already here</p>', folderIds: ['f1'], tags: ['Travel'], createdAt: '2024-03-05T10:20:30.000Z', updatedAt: '2026-10-01T00:00:00.000Z', kind: 'general' });
  return db;
};
const dev = (cloud, name, vp, opts = {}) => addDevice(browser, srv.base, cloud, name, { width: vp.w, height: vp.h }, vp.touch, seed(), opts);
const act = (d, vp, sel) => (vp.touch ? d.page.locator(sel).first().tap() : d.page.locator(sel).first().click());
const actText = (d, vp, sel, text) => (vp.touch ? d.page.locator(sel, { hasText: text }).first().tap() : d.page.locator(sel, { hasText: text }).first().click());
const noErr = (d, tag) => check(d.errors.length === 0, `${tag} no page errors`, d.errors.slice(0, 2).join(' · '));
const each = async (id, fn, vps = VPS, opts = {}) => {
  for (const vp of vps) {
    let d = null;
    try { const cl = makeCloud(); d = await dev(cl, 'D' + vp.name, vp, opts); d.cloudObj = cl; d.page.setDefaultTimeout(10000); await fn(d, vp); }
    catch (e) { check(false, `${id}@${vp.name} threw: ${String(e && e.message || e).split('\n')[0]}`); }
    finally { if (d) await d.ctx.close(); }
  }
};
const dlg = async (d, vp) => {
  await act(d, vp, '#sb-tools-btn'); await sleep(300);
  await actText(d, vp, '#sb-tools .sb-mi', 'Evernote import');
  await d.page.waitForSelector('#enx-modal.open #enx-box', { timeout: 5000 });
};
const waitDone = (d, ms = 120000) => d.page.waitForSelector('#enx-totals', { timeout: ms });
const readRes = (d) => on(d, () => ({
  grid: Object.fromEntries([...document.querySelectorAll('#enx-totals dt')].map((dt) => [dt.textContent, dt.nextElementSibling.textContent])),
  rows: [...document.querySelectorAll('.enx-t tbody tr')].map((tr) => ({ stack: tr.dataset.stack, nb: tr.dataset.nb, n: tr.querySelector('.enx-c-n').textContent, p: tr.querySelector('.enx-c-p').textContent, m: tr.querySelector('.enx-c-m').textContent, a: tr.querySelector('.enx-c-a').textContent })),
  broken: [...document.querySelectorAll('#enx-broken li')].map((l) => l.textContent),
  skipped: (document.getElementById('enx-skipped') || {}).textContent || '',
  dry: (document.getElementById('enx-dry') || {}).textContent || '',
  stacks: document.querySelector('#enx-totals dt + dd') && [...document.querySelectorAll('#enx-totals dt')].find((x) => x.textContent === 'Stacks').nextElementSibling.textContent,
}));
const pickFolder = (d) => d.page.setInputFiles('#enx-dir', EXPORT);
const pickFiles = (d, withTxt = true) => d.page.setInputFiles('#enx-files', withTxt ? [...FILES, TXT] : FILES);
const rowMap = (rows) => Object.fromEntries(rows.map((r) => [r.nb, r]));

try {
  /* ══ 73a — reachable ══ */
  if (want('73a')) await each('73a', async (d, vp) => {
    const t = `73a@${vp.name}`;
    await dlg(d, vp);
    const g = await on(d, () => { const b = document.getElementById('enx-box').getBoundingClientRect(); const dir = document.querySelector('.enx-dirbtn'), fl = document.querySelector('.enx-filebtn'); const vis = (e) => !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0; return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width, vw: innerWidth, vh: innerHeight, dir: vis(dir), file: vis(fl), dirTxt: dir && dir.textContent, fileTxt: fl && fl.textContent, line: document.getElementById('enx-box').textContent.includes('Stacks come from the folder; files picked one by one go in without a stack'), title: document.querySelector('#enx-box .rem-title').textContent }; });
    if (vp.w < 640) check(g.w >= g.vw - 1 && g.b >= g.vh - 2 && g.t > 0, `${t} on a phone it is a bottom sheet (full width, sitting on the bottom edge)`, JSON.stringify(g));
    else check(g.w < g.vw - 60 && g.l > 20 && g.b < g.vh - 20 && g.t > 20, `${t} on a tablet/laptop it is a dialog (centred, clear of every edge)`, JSON.stringify(g));
    check(g.title.includes('Evernote import'), `${t} the dialog is titled "📥 Evernote import"`, g.title);
    check(g.file && /Choose \.enex files/.test(g.fileTxt), `${t} "📄 Choose .enex files" is there and visible`, g.fileTxt);
    check(vp.w < 640 ? !g.dir : (g.dir && /Choose the export folder/.test(g.dirTxt)), `${t} "📁 Choose the export folder" ${vp.w < 640 ? 'is not offered on a phone (it cannot pick folders)' : 'is there and visible'}`, String(g.dir));
    check(g.line, `${t} the one-line note: "Stacks come from the folder; files picked one by one go in without a stack"`);
    await actText(d, vp, '#enx-box .rem-btn', 'Close'); await sleep(250);
    check(!(await on(d, () => document.getElementById('enx-modal').classList.contains('open'))), `${t} ✕ Close closes it`);
    noErr(d, t);
  });

  /* ══ 73b — folder pick ══ */
  if (want('73b')) await each('73b', async (d, vp) => {
    const t = `73b@${vp.name}`;
    await dlg(d, vp); await pickFolder(d); await waitDone(d);
    const r = await readRes(d);
    for (const [k, v] of Object.entries(EXP)) check(r.grid[k] === v, `${t} total "${k}" is ${v}`, r.grid[k]);
    check(r.grid.Stacks === '2' && r.stacks === '2', `${t} two stacks (from the folders)`, r.stacks);
    const rm = rowMap(r.rows);
    for (const b of BOOKS) {
      const e = bookExp(b), x = rm[b.name] || {};
      check(x.stack === b.stack && x.n === String(e.notes) && x.p === String(e.pics) && x.m === e.mb && x.a === String(e.already), `${t} row ${b.stack ? b.stack + ' ▸ ' : ''}${b.name}: ${e.notes} notes · ${e.pics} pictures · ${e.mb} MB · already ${e.already}`, JSON.stringify(x));
    }
    check(r.rows.length === BOOKS.length, `${t} one row per notebook`, String(r.rows.length));
    check(r.broken.length === 2 && r.broken.some((l) => /1 note could not be read in Beta: Broken date/.test(l)) && r.broken.some((l) => /1 note could not be read in Loose: Cut off here/.test(l)), `${t} the two unreadable notes are listed by notebook and title`, r.broken.join(' || '));
    check(/^1 other file skipped$/.test(r.skipped), `${t} the non-.enex file is counted: "1 other file skipped"`, r.skipped);
    check(/This was a dry run: nothing was added to your notebook\. The import itself comes in the next update\./.test(r.dry), `${t} the dry-run line is at the bottom`, r.dry);
    noErr(d, t);
  }, VPS.slice(1));

  /* ══ 73c — file pick ══ */
  if (want('73c')) await each('73c', async (d, vp) => {
    const t = `73c@${vp.name}`;
    await dlg(d, vp); await pickFiles(d); await waitDone(d);
    const r = await readRes(d);
    for (const [k, v] of Object.entries(EXP)) check(r.grid[k] === v, `${t} total "${k}" is ${v}`, r.grid[k]);
    check(r.grid.Stacks === '0' && r.rows.every((x) => x.stack === ''), `${t} files picked one by one come in with no stack`, JSON.stringify(r.rows.map((x) => x.stack)));
    const rm = rowMap(r.rows);
    check(BOOKS.every((b) => { const e = bookExp(b), x = rm[b.name] || {}; return x.n === String(e.notes) && x.p === String(e.pics) && x.m === e.mb && x.a === String(e.already); }), `${t} the four notebook rows equal the generator's counts`, JSON.stringify(r.rows));
    check(/^1 other file skipped$/.test(r.skipped), `${t} the non-.enex file is counted as skipped`, r.skipped);
    const fold = await on(d, () => { const s = document.querySelector('.enx-stack'); return { open: s.open, n: document.querySelectorAll('.enx-stack').length }; });
    check(vp.w < 640 ? !fold.open : fold.open, `${t} the stack groups are ${vp.w < 640 ? 'folded on a phone' : 'open on a tablet/laptop'}`, JSON.stringify(fold));
    if (vp.w < 640) { await act(d, vp, '.enx-stack > summary'); await sleep(250); check(await on(d, () => document.querySelector('.enx-stack').open && document.querySelector('.enx-t').getBoundingClientRect().height > 0), `${t} tapping a stack opens its table`); }
    noErr(d, t);
  });

  /* ══ 73d — already in Siyagah ══ */
  if (want('73d')) await each('73d', async (d, vp) => {
    const t = `73d@${vp.name}`;
    await dlg(d, vp); await pickFiles(d); await waitDone(d);
    const r = await readRes(d), rm = rowMap(r.rows);
    check(r.grid['Already in Siyagah'] === '1' && rm.Alpha.a === '1', `${t} the note with the same title (trimmed, any case) and the same created second is counted (1, in Alpha)`, r.grid['Already in Siyagah'] + ' / Alpha ' + rm.Alpha.a);
    check(rm.Beta.a === '0', `${t} the near miss (same title, one second later) is NOT counted`, rm.Beta.a);
    check(r.grid.Tags === '4 (2 already in Siyagah)', `${t} 4 distinct tags, 2 already in Siyagah ("travel" matches "Travel", and "seed")`, r.grid.Tags);
    /* it must be able to fail: a seed with the match removed gives 0 */
    await on(d, () => { DB.articles.find((a) => a.id === 'ev1').createdAt = '2024-03-05T10:20:45.000Z'; });
    await actText(d, vp, '#enx-box .rm-big', 'Choose another export'); await pickFiles(d); await waitDone(d);
    const r2 = await readRes(d);
    check(r2.grid['Already in Siyagah'] === '0', `${t} with the Siyagah note moved to another second, nothing matches (0)`, r2.grid['Already in Siyagah']);
    noErr(d, t);
  });

  /* ══ 73e — nothing written ══ */
  if (want('73e')) await each('73e', async (d, vp) => {
    const t = `73e@${vp.name}`;
    const snap = () => on(d, async () => ({ db: JSON.stringify(DB), idb: JSON.stringify(await _idbGet('notebook')), ls: localStorage.getItem('my-notebook-v1'), lsKeys: Object.keys(localStorage).sort().join(), dbs: (await indexedDB.databases()).map((x) => x.name).sort().join() }));
    await waitSeeded(d.cloudObj, d); await sleep(1500); await quiet(d.cloudObj, d); await sleep(1000);
    const before = await snap(), c0 = d.cloudObj.log.length, k0 = d.cloudObj.commits;
    await dlg(d, vp); await pickFiles(d); await waitDone(d);
    await actText(d, vp, '#enx-box .rm-big', 'Copy summary').catch(() => {});
    await actText(d, vp, '#enx-box .rem-btn', 'Close'); await sleep(2500); await quiet(d.cloudObj, d);
    const after = await snap();
    check(before.db === after.db && before.db.length > 500, `${t} DB is byte-identical before and after (${before.db.length} bytes)`);
    check(before.idb === after.idb && before.idb.length > 500, `${t} the IndexedDB "notebook" record is byte-identical (${before.idb.length} bytes)`);
    check(before.ls === after.ls && before.lsKeys === after.lsKeys, `${t} localStorage is unchanged (same notebook, same keys)`, after.lsKeys);
    check(before.dbs === after.dbs, `${t} no IndexedDB database was added`, before.dbs + ' → ' + after.dbs);
    check(d.cloudObj.log.length === c0 && d.cloudObj.commits === k0, `${t} the fake cloud received no write (${c0} → ${d.cloudObj.log.length})`);
    noErr(d, t);
  });

  /* ══ 73f — Stop ══ */
  if (want('73f')) await each('73f', async (d, vp) => {
    const t = `73f@${vp.name}`;
    makeBig();
    await dlg(d, vp); await d.page.setInputFiles('#enx-files', BIG);
    await d.page.waitForFunction(() => _enx.busy && _enx.read > 6 * 1048576, null, { timeout: 60000 });
    await actText(d, vp, '#enx-box .rm-big', 'Stop');
    await d.page.waitForSelector('#enx-stopped', { timeout: 20000 });
    const s = await on(d, () => ({ txt: document.getElementById('enx-stopped').textContent, busy: _enx.busy, view: _enx.view, read: _enx.read, total: _enx.total, res: _enx.res, totals: !!document.getElementById('enx-totals') }));
    check(/^Stopped after [\d,]+ notes\. Nothing was added to your notebook\.$/.test(s.txt) && !s.busy && s.view === 'stopped' && !s.totals, `${t} Stop leaves a clean "Stopped" state (${s.txt})`, JSON.stringify({ ...s, res: null }));
    check(s.read < s.total * 0.9, `${t} it really stopped mid-file (${(s.read / MB).toFixed(0)} MB of ${(s.total / MB).toFixed(0)} MB read)`);
    await sleep(500);
    const r0 = await on(d, () => _enx.read); await sleep(700);
    check((await on(d, () => _enx.read)) === r0, `${t} nothing is still reading after Stop`);
    noErr(d, t);
    await actText(d, vp, '#enx-box .rm-big', 'Start again'); await pickFiles(d, false); await waitDone(d);
    const r = await readRes(d);
    check(r.grid.Notes === String(okNotes.length) && r.grid['Could not be read'] === '2', `${t} a second run afterwards completes (${r.grid.Notes} notes)`, JSON.stringify(r.grid));
    noErr(d, t + ' after the second run');
  });

  /* ══ 73g — scale and memory ══ */
  if (want('73g')) {
    makeBig();
    for (const [vp, throttle] of [[VPS[2], 0], [VPS[0], 4]]) {
      let d = null; const t = `73g@${vp.name}${throttle ? ' CPU x' + throttle : ''}`;
      try {
        d = await dev(makeCloud(), 'D' + vp.name, vp, throttle ? { throttle } : {}); d.page.setDefaultTimeout(30000);
        const cdp = d.cdp || (await d.ctx.newCDPSession(d.page));
        await dlg(d, vp);
        await on(d, () => { window.__lt = []; try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(Math.round(e.duration)))).observe({ entryTypes: ['longtask'] }); } catch (e) { window.__ltErr = String(e); } });
        await cdp.send('HeapProfiler.collectGarbage'); await sleep(300);
        const base = (await cdp.send('Runtime.getHeapUsage')).usedSize;
        let peak = base, stop = false;
        const poll = (async () => { while (!stop) { try { const u = (await cdp.send('Runtime.getHeapUsage')).usedSize; if (u > peak) peak = u; } catch {} await sleep(100); } })();
        const t0 = Date.now();
        await d.page.setInputFiles('#enx-files', BIG);
        await d.page.waitForSelector('#enx-totals', { timeout: 900000 });
        const secs = (Date.now() - t0) / 1000; stop = true; await poll;
        const lt = await on(d, () => ({ lt: window.__lt, err: window.__ltErr || '' }));
        const worst = Math.max(0, ...lt.lt), grow = (peak - base) / MB;
        const r = await readRes(d), res = await on(d, () => ({ n: _enx.res.books[0].notes, pics: _enx.res.books[0].pics, bytes: _enx.res.books[0].bytes, unread: _enx.res.unread }));
        check(res.n === 2000 && res.pics === 2000 && res.bytes === 2000 * 56000 && res.unread === 0, `${t} the ${(BIG_BYTES / MB).toFixed(0)} MB file completes: 2,000 notes, 2,000 pictures, ${res.bytes} bytes counted exactly, none unreadable (${secs.toFixed(1)} s)`, JSON.stringify(res));
        check(!lt.err && lt.lt.length >= 0 && worst <= 200, `${t} the page never blocks for more than 200 ms (worst long task ${worst} ms; ${lt.lt.length} over 50 ms; all: ${lt.lt.slice(0, 12).join(',')}${lt.lt.length > 12 ? ',…' : ''})`, lt.err);
        check(grow <= 60, `${t} the JS heap grows by at most 60 MB (start ${(base / MB).toFixed(1)} MB, peak ${(peak / MB).toFixed(1)} MB, +${grow.toFixed(1)} MB)`);
        check(r.grid.Notes === '2,000', `${t} the result shows 2,000 notes`, r.grid.Notes);
        noErr(d, t);
      } catch (e) { check(false, `${t} threw: ${String(e && e.message || e).split('\n')[0]}`); }
      finally { if (d) await d.ctx.close(); }
    }
  }

  /* ══ 73h — copy summary ══ */
  if (want('73h')) await each('73h', async (d, vp) => {
    const t = `73h@${vp.name}`;
    await d.ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: srv.base });
    await dlg(d, vp); await pickFiles(d); await waitDone(d);
    await on(d, () => navigator.clipboard.writeText('SENTINEL'));
    await actText(d, vp, '#enx-box .rm-big', 'Copy summary'); await sleep(500);
    const clip = await on(d, () => navigator.clipboard.readText());
    check(clip.includes(`Notebooks: ${BOOKS.length} · Stacks: 0 · Notes: ${okNotes.length}`) && clip.includes(`Tags: ${tagsAll.length} (2 already in Siyagah)`) && clip.includes('Already in Siyagah: 1 · Could not be read: 2 · Other files skipped: 1'), `${t} Copy summary puts the totals on the clipboard`, clip.split('\n').slice(0, 6).join(' / '));
    check(clip.includes(`Alpha | 3 | 1 | ${bookExp(BOOKS[0]).mb} | 1`) && clip.includes(`Gamma | 2 | 1 | ${bookExp(BOOKS[2]).mb} | 0`) && /This was a dry run/.test(clip), `${t} ...and the per-notebook table and the dry-run line`, clip.split('\n').slice(7).join(' / '));
    check(await on(d, () => document.querySelector('.toast') && /Copied/.test([...document.querySelectorAll('.toast')].map((x) => x.textContent).join(''))), `${t} a "Copied" toast confirms it`);
    /* the clipboard refused: a selectable box */
    await on(d, () => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('refused')) }, configurable: true }); });
    await actText(d, vp, '#enx-box .rm-big', 'Copy summary'); await sleep(400);
    const fb = await on(d, () => { const ta = document.getElementById('enx-fbt'); return ta ? { v: ta.value, ro: ta.readOnly, h: ta.getBoundingClientRect().height } : null; });
    check(fb && fb.v.includes(`Notes: ${okNotes.length}`) && fb.h > 40, `${t} when the clipboard is refused a selectable text box shows the summary`, JSON.stringify(fb && { ...fb, v: fb.v.slice(0, 40) }));
    noErr(d, t);
  });

  /* ══ 73i — contrast ══ */
  if (want('73i')) await each('73i', async (d, vp) => {
    const t = `73i@${vp.name}`;
    const measure = () => d.page.evaluate(() => {
      const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
      const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
      const bgOf = (el) => { const layers = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; } } let base = { r: 255, g: 255, b: 255 }; for (let i = layers.length - 1; i >= 0; i--) { const c = layers[i]; base = { r: c.r * c.a + base.r * (1 - c.a), g: c.g * c.a + base.g * (1 - c.a), b: c.b * c.a + base.b * (1 - c.a) }; } return base; };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      document.querySelectorAll('#enx-box details').forEach((x) => { x.open = true; });
      let worst = 99, who = '', n = 0;
      document.querySelectorAll('#enx-box *').forEach((e) => {
        if (![...e.childNodes].some((x) => x.nodeType === 3 && x.textContent.trim())) return;
        const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return;
        const fg = parse(cs.color), bg = bgOf(e);
        const comp = fg.a < 1 ? { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) } : fg;
        n++; const rr = ratio(comp, bg); if (rr < worst) { worst = rr; who = e.className + ':' + e.textContent.trim().slice(0, 14); }
      });
      return { worst: Math.round(worst * 100) / 100, who, n };
    });
    const presets = ['forest', 'ocean', 'amber', 'indigo', 'rose'];
    await dlg(d, vp);
    for (const p of presets) { await on(d, (k) => applyPreset(k), p); await sleep(200); const m = await measure(); check(m.n >= 5 && m.worst >= 4.5, `${t} the start screen's text (${m.n} pieces) clears 4.5:1 on ${p} (worst ${m.worst}, ${m.who})`, JSON.stringify(m)); }
    await on(d, () => applyPreset('forest')); await pickFiles(d); await waitDone(d);
    for (const p of presets) { await on(d, (k) => applyPreset(k), p); await sleep(200); const m = await measure(); check(m.n >= 30 && m.worst >= 4.5, `${t} the result (totals, table, broken list, dry-run line, buttons: ${m.n} pieces) clears 4.5:1 on ${p} (worst ${m.worst}, ${m.who})`, JSON.stringify(m)); }
    noErr(d, t);
  });

  /* ══ 73j — empty and padded notes are readable; only a CDATA that is never closed is "cut short" ══ */
  if (want('73j')) await each('73j', async (d, vp) => {
    const t = `73j@${vp.name}`;
    const dir = join(TMP, 'edge'); mkdirSync(dir, { recursive: true });
    const enml = (tail) => `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">${tail}`;
    const mk = (title, content) => `<note>\n<title>${title}</title>\n<created>20220101T000000Z</created>\n<updated>20220101T000000Z</updated>\n<content><![CDATA[${content}]]></content>\n</note>\n`;
    const pad = ' \n'.repeat(100);
    const file = join(dir, 'Edge.enex');
    writeFileSync(file, HEAD + mk('Empty self-closing', enml('<en-note/>')) + mk('Empty with style', enml('<en-note style="x"/>')) + mk('Padded end', enml('<en-note><div>x</div></en-note>' + pad)) + mk('Plain', enml('<en-note><div>ok</div></en-note>'))
      + `<note>\n<title>Cut in the middle</title>\n<created>20220101T000000Z</created>\n<content><![CDATA[<en-note><div>cut off in the middle of a sent`);
    await dlg(d, vp); await d.page.setInputFiles('#enx-files', [file]); await waitDone(d);
    const r = await readRes(d);
    check(r.grid.Notes === '4', `${t} the four readable notes are counted (empty, empty with style, padded, plain)`, r.grid.Notes);
    check(r.broken.length === 1 && /Cut in the middle/.test(r.broken[0]) && !/Empty|Padded|Plain/.test(r.broken.join('')), `${t} only the note cut off in the middle is listed as broken`, r.broken.join(' || '));
    noErr(d, t);
  });
} catch (e) {
  console.log(' FAIL  enex-s4a threw: ' + (e && e.stack || e));
  results.push({ ok: false, label: 'threw' });
} finally {
  await browser.close();
  await srv.close();
  try { rmSync(TMP, { recursive: true, force: true }); } catch {}
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
