#!/usr/bin/env node
/* tools/enex-s4b.mjs — v05.20, S4b: the Evernote import itself, for the NOTES (checks 80a–80i).

   Every check runs at 390x844 (touch), 820x1180 (touch) and 1440x900 (mouse) unless it names a size, against a booted app, through the real
   dialog (🧰 → 📥 Evernote import → files → Bring them in …) with real taps or clicks. Nothing touches the network (sync uses the fake cloud).
   The fixtures are WRITTEN BY THIS FILE into a temp dir. Test hooks the app honours: window.__enxCap (the daily cap), window.__enxNow (the
   clock, ms), window.__enxDelay (ms added after each batch), window.__ljHold (an open journal transaction).

   80a  structure: stacks and no-stack notebooks land under My Notebooks ▸ Evernote exactly, with stable ids; no pre-existing record changes
   80b  content: ☑/☐, the crypt marker, media markers keep hash/mime/name, script/on*=/javascript: removed, the source line, dates, title and
        tags exact (a comma, Bengali), the 📥 card and read-view line, the sf-enx Smart View and its count
   80c  never twice: the same export twice; a trashed note (and a permanently deleted one) stays away; "already in Siyagah" is skipped, counted, untouched
   80d  the cap: stops at the cap with the right message and time; Continue refused until the window allows, then resumes exactly where it
        stopped; the window counts notes another device brought in (synced through the fake cloud)
   80e  interrupted: the page closed between batches and inside one (an open journal transaction): no half note, no duplicate, the rest continues
   80f  sync: a second device receives every note and folder, and later edits go both ways
   80g  the owner's path: real taps — 🧰 → import → files → Bring them in → Pause → Continue; the toast once per session
   80h  scale: a 2,000-note import at 390 with CPU x4 into a 9,000-note notebook; boot and render() with 27,000 notes, before (v05.19's
        index.html from git) and after
   80i  contrast of the new text on the five presets

   `--only=80a,80c` runs just those; `--notes=N` sets the size of the big notebook in 80h. Each printed ok/FAIL line becomes one app-check check. */
import { playwright, serve, seedDB, hostLimit } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, quiet, waitSeeded, check, results, boot, probeInstall, probeRead } from './s1-fake.mjs';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);
const BIGN = +((argv.find((a) => a.startsWith('--notes=')) || '').slice(8)) || 27000;
if (argv.includes('--fails')) { const o = console.log; let skip = false; console.log = (...x) => { const t = x.join(' '); if (/^\s+ok\s/.test(t)) { skip = true; return; } if (skip && /^\s{6,}\S/.test(t)) { skip = false; return; } skip = false; o(...x); }; }

const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];
/* the app as it was before the import was written (the S4b version-bump commit): for 80h's "before", and for `--unpatched`, which runs
   every check against it — they must fail there (they do: the import is not in it) */
function makeBase() {
  const dir = mkdtempSync(join(tmpdir(), 'enex-s4b-base-'));
  const sha = execFileSync('git', ['log', '--format=%H', '-n', '1', '--grep=S4b: version bump'], { encoding: 'utf8' }).trim();
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', `${sha}:${f}`], { encoding: 'buffer', maxBuffer: 1 << 28 })); } catch {} }
  return dir;
}
const pw = await playwright();
const srv = await serve(argv.includes('--unpatched') ? makeBase() : undefined);
const browser = await pw.chromium.launch({ args: ['--js-flags=--max-old-space-size=8192'] });
const TMP = mkdtempSync(join(tmpdir(), 'enex-s4b-'));
const DAY = 86400000;

/* ── the fixture generator ── */
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const HEAD = '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE en-export SYSTEM "http://xml.evernote.com/pub/evernote-export4.dtd">\n<en-export export-date="20261014T000000Z" application="Evernote" version="10.0">\n';
const ENML = (inner) => `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd"><en-note>${inner}</en-note>`;
function noteXML(n) {
  const res = (n.res || []).map((r) => `<resource><data encoding="base64">\nQUJDREVGRw==\n</data><mime>${r.mime}</mime><width>10</width><height>10</height><recognition><![CDATA[<?xml version="1.0"?><recoIndex docType="unknown" objType="image" objID="${r.hash}" engineVersion="7.0" recoType="service" lang="en" objWidth="10" objHeight="10"/>]]></recognition><resource-attributes><file-name>${esc(r.name)}</file-name></resource-attributes></resource>`).join('\n');
  const attrs = n.src ? `<note-attributes><source-url>${esc(n.src)}</source-url></note-attributes>\n` : '';
  return `<note>\n<title>${esc(n.title)}</title>\n<created>${n.created}</created>\n<updated>${n.updated || n.created}</updated>\n${(n.tags || []).map((t) => `<tag>${esc(t)}</tag>`).join('\n')}\n${attrs}<content><![CDATA[${ENML(n.inner || `<div>Body of ${esc(n.title)}</div>`)}]]></content>\n${res}\n</note>\n`;
}
const H1 = '0123456789abcdef0123456789abcdef', H2 = 'fedcba9876543210fedcba9876543210', H3 = 'aaaabbbbccccddddeeeeffff00001111';
const BOOKS = [
  { stack: 'Stack A', name: 'Alpha', notes: [
    { title: 'Todo list', created: '20200101T000000Z', updated: '20200202T030405Z', tags: ['travel', 'work'], src: 'https://x.example/?a=1&b=2', inner: '<div><en-todo checked="true"/>done item</div><div><en-todo/>open item</div><div style="color:red">styled</div>' },
    { title: 'Secret', created: '20200102T000000Z', inner: '<div>before</div><en-crypt hint="h" cipher="RC2" length="64">ABCDEFGSECRETBLOB</en-crypt><div>after</div>' },
    { title: 'Media', created: '20200103T000000Z', inner: `<div><en-media hash="${H1}" type="image/png"/></div><en-media hash="${H2}" type="audio/mpeg"/><en-media hash="${H3}" type="application/pdf"/>`,
      res: [{ mime: 'image/png', name: 'pic.png', hash: H1 }, { mime: 'audio/mpeg', name: 'snd.mp3', hash: H2 }, { mime: 'application/pdf', name: 'doc.pdf', hash: H3 }] },
    { title: 'Evil', created: '20200104T000000Z', inner: '<div>x</div><script>alert(1)</script><iframe src="http://e.example/"></iframe><object data="x"></object><embed src="y"><style>p{color:red}</style><a href="javascript:alert(1)" onclick="bad()">bad link</a> <a href="https://ok.example/">good link</a><img src="data:image/png;base64,AAAA" onerror="bad()"><div ONMOUSEOVER="bad()">hover</div>' },
    { title: 'বাংলা নোট', created: '20200105T000000Z', tags: ['a,b', 'Plain', 'দেশ'], inner: '<div>বাংলা লেখা</div>' },
    { title: '', created: '20200106T000000Z', inner: '<div>no title</div>' } ] },
  { stack: 'Stack A', name: 'Beta', notes: [
    { title: 'café ☕ note', created: '20240305T102030Z', tags: [] },
    { title: 'Beta two', created: '20240306T102030Z', tags: ['seed'] } ] },
  { stack: 'Stack B', name: 'Gamma', notes: [{ title: 'Gamma one', created: '20231231T235959Z' }] },
  { stack: '', name: 'Loose', notes: [{ title: 'Loose one', created: '20220202T020202Z' }] },
];
const EXPORT = join(TMP, 'export');
for (const b of BOOKS) {
  const dir = b.stack ? join(EXPORT, b.stack) : EXPORT;
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, b.name + '.enex'), HEAD + b.notes.map(noteXML).join('') + '</en-export>\n');
}
const FILES = BOOKS.map((b) => join(b.stack ? join(EXPORT, b.stack) : EXPORT, b.name + '.enex'));
const nIn = BOOKS.reduce((s, b) => s + b.notes.length, 0), nNew = nIn - 1;   /* one matches the notebook's own "Café ☕ Note" */
const stamp = (n) => `${n.created.slice(0, 4)}-${n.created.slice(4, 6)}-${n.created.slice(6, 8)}T${n.created.slice(9, 11)}:${n.created.slice(11, 13)}:${n.created.slice(13, 15)}.000Z`;

/* a many-note export for the cap, the interruption and the screen-path checks: 2 notebooks, `n` notes, small, unique titles */
function makeMany(name, n, split = Math.ceil(n * 0.6)) {
  const dir = join(TMP, name); mkdirSync(join(dir, 'Stack M'), { recursive: true });
  const mk = (from, to) => { let s = HEAD; for (let i = from; i < to; i++) { const t = new Date(Date.UTC(2015, 0, 1) + i * 61000); const c = t.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z'); s += noteXML({ title: 'Many ' + String(i + 1).padStart(5, '0'), created: c, tags: ['m' + (i % 7)], inner: `<div>Body ${i}</div>` + (i % 10 === 0 ? `<en-media hash="${H1}" type="image/png"/>` : '') }); } return s + '</en-export>\n'; };
  writeFileSync(join(dir, 'Stack M', 'Many one.enex'), mk(0, split)); writeFileSync(join(dir, 'Stack M', 'Many two.enex'), mk(split, n));
  return [join(dir, 'Stack M', 'Many one.enex'), join(dir, 'Stack M', 'Many two.enex')];
}

/* ── the harness ── */
const T0 = '2026-10-01T00:00:00.000Z';
const bulk = (db, n) => { for (let i = 0; i < n; i++) db.articles.push({ id: 'bn' + i, title: 'Bulk note ' + i, content: '<p>Body ' + i + ' lorem ipsum dolor sit amet</p>', folderIds: [i % 2 ? 'f1' : 'f2'], tags: i % 9 === 0 ? ['bulk'] : [], createdAt: T0, updatedAt: T0, kind: 'general' }); return db; };
const seed = (extra = 0) => {
  const db = seedDB(T0);
  db.articles.push({ id: 'ev1', title: 'Café ☕ Note', content: '<p>already here</p>', folderIds: ['f1'], tags: ['Travel'], createdAt: '2024-03-05T10:20:30.000Z', updatedAt: '2026-10-01T00:00:00.000Z', kind: 'general' });
  return extra ? bulk(db, extra) : db;
};
const dev = (cloud, name, vp, opts = {}, db = null) => addDevice(browser, srv.base, cloud, name, { width: vp.w, height: vp.h }, vp.touch, db || seed(), opts);
const act = (d, vp, sel) => (vp.touch ? d.page.locator(sel).first().tap() : d.page.locator(sel).first().click());
const actText = (d, vp, sel, text) => (vp.touch ? d.page.locator(sel, { hasText: text }).first().tap() : d.page.locator(sel, { hasText: text }).first().click());
const noErr = (d, tag) => check(d.errors.length === 0, `${tag} no page errors`, d.errors.slice(0, 2).join(' · '));
const each = async (id, fn, vps = VPS, opts = {}, extra = 0) => {
  for (const vp of vps) {
    let d = null;
    try { const cl = makeCloud(); d = await dev(cl, 'D' + vp.name, vp, opts, seed(extra)); d.cloudObj = cl; d.page.setDefaultTimeout(15000); await fn(d, vp); }
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
const waitState = (d, states, ms = 180000) => d.page.waitForFunction((s) => !_enx.imp.run && s.includes(_enx.imp.state), states, { timeout: ms });
/* pick, read (the dry run), tap 📥 Bring them in, wait until the run stops */
async function bring(d, vp, what, states = ['done', 'capped', 'paused'], dir = false) {
  await dlg(d, vp);
  await d.page.setInputFiles(dir ? '#enx-dir' : '#enx-files', what); await waitDone(d);
  await act(d, vp, '#enx-bring'); await waitState(d, states);
}
const again = async (d, vp, what, states, dir = false) => {   /* "Choose another export" → files → Bring */
  if (!(await on(d, () => document.getElementById('enx-modal').classList.contains('open')))) await dlg(d, vp);
  if (!(await on(d, () => !!document.getElementById('enx-files')))) await actText(d, vp, '#enx-box .rm-big', 'Choose another export');
  await d.page.setInputFiles(dir ? '#enx-dir' : '#enx-files', what); await waitDone(d); await act(d, vp, '#enx-bring'); await waitState(d, states || ['done', 'capped', 'paused']);
};
const enxIds = (d) => on(d, () => DB.articles.filter((a) => a.fromEvernote).map((a) => a.id));
const enxTitles = (d) => on(d, () => DB.articles.filter((a) => a.fromEvernote).map((a) => a.title).sort());
const art = (d, title) => on(d, (t) => { const a = DB.articles.find((x) => x.fromEvernote && x.title === t); return a ? JSON.parse(JSON.stringify(a)) : null; }, title);
const pathOf = (d) => on(d, () => { const m = new Map(DB.folders.map((f) => [f.id, f])); const p = (f) => (f.parentId && m.get(f.parentId) ? p(m.get(f.parentId)) + '/' : '') + f.name; return DB.folders.filter((f) => f.enx).map((f) => p(f)).sort(); });
const when = (ms, now) => {   /* written independently of the app's _enxWhen */
  const d = new Date(ms), n = new Date(now), h = d.getHours(), m = d.getMinutes();
  const day = (x) => Math.floor(new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime() / DAY);
  const dd = day(d) - day(n);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}${h < 12 ? 'am' : 'pm'} ${dd <= 0 ? 'today' : dd === 1 ? 'tomorrow' : d.toLocaleDateString('en-US', { weekday: 'long' })}`;
};
async function newPage(d) {   /* the page is gone (closed mid-import); a fresh one in the same browser profile, like reopening the app */
  try { await d.page.close(); } catch {}
  const page = await d.ctx.newPage(); d.page = page;
  page.on('dialog', (x) => x.accept().catch(() => {}));
  page.on('pageerror', (e) => d.errors.push('pageerror: ' + e));
  await page.goto(srv.base + '/', { waitUntil: 'domcontentloaded' });
  await boot(d); page.setDefaultTimeout(15000);
}

try {
  /* ══ 80a — structure ══ */
  if (want('80a')) await each('80a', async (d, vp) => {
    const t = `80a@${vp.name}`;
    await waitSeeded(d.cloudObj, d); await sleep(800);
    const before = await on(d, () => JSON.stringify({ a: DB.articles, f: DB.folders, s: DB.sections, tr: DB.trash, th: DB.theme }));
    await bring(d, vp, EXPORT, ['done'], true);
    const exp = ['Evernote', 'Evernote/Loose', 'Evernote/Stack A', 'Evernote/Stack A/Alpha', 'Evernote/Stack A/Beta', 'Evernote/Stack B', 'Evernote/Stack B/Gamma'];
    const paths = await pathOf(d);
    check(JSON.stringify(paths) === JSON.stringify(exp), `${t} the folders are Evernote ▸ stack ▸ notebook, and a notebook with no stack is directly under Evernote`, paths.join(' | '));
    const info = await on(d, () => { const r = DB.folders.find((f) => f.id === 'enx-root'); const sec = DB.sections.find((s) => s.id === r.sectionId); return { root: !!r, name: r.name, sec: sec && sec.name, kind: r.enx.kind, par: r.parentId, kinds: DB.folders.filter((f) => f.enx).map((f) => f.enx.kind + ':' + f.enx.name + ':' + /^enx-/.test(f.id)).sort() }; });
    check(info.root && info.sec === 'My Notebooks' && info.kind === 'root' && info.par === null, `${t} the root "Evernote" sits in the section My Notebooks and carries enx.kind root`, JSON.stringify(info));
    check(JSON.stringify(info.kinds) === JSON.stringify(['nb:Alpha:true', 'nb:Beta:true', 'nb:Gamma:true', 'nb:Loose:true', 'root:Evernote:true', 'stack:Stack A:true', 'stack:Stack B:true']), `${t} every folder carries enx:{kind,name} and an enx- id`, info.kinds.join(' '));
    const bad = await on(d, () => DB.articles.filter((a) => a.fromEvernote).filter((a) => a.folderIds.length !== 1 || !DB.folders.some((f) => f.id === a.folderIds[0] && f.enx && f.enx.kind === 'nb' && f.enx.name === a.fromEvernote.nb)).map((a) => a.title));
    check(bad.length === 0 && (await enxIds(d)).length === nNew, `${t} all ${nNew} new notes are in the folder of their own notebook`, bad.join());
    const ids1 = await on(d, () => DB.folders.filter((f) => f.enx).map((f) => f.id).sort());
    const after = await on(d, () => JSON.stringify({ a: DB.articles.filter((x) => !x.fromEvernote), f: DB.folders.filter((x) => !x.enx), s: DB.sections, tr: DB.trash, th: DB.theme }));
    const b0 = JSON.parse(before);
    check(JSON.stringify({ a: b0.a, f: b0.f, s: b0.s, tr: b0.tr, th: b0.th }) === after, `${t} nothing that was already in the notebook changed (notes, folders, section, Trash, settings: ${after.length} bytes compared)`);
    /* a second run, in the same page: the same folders, no new ones */
    await again(d, vp, EXPORT, ['done'], true);
    const ids2 = await on(d, () => DB.folders.filter((f) => f.enx).map((f) => f.id).sort());
    check(JSON.stringify(ids1) === JSON.stringify(ids2), `${t} the folder ids are stable: a later run finds the same folders (${ids2.length}) and makes none`, ids1.length + ' vs ' + ids2.length);
    /* folders found by id, not by name: rename + move one, run again */
    await on(d, () => { for (const [id, nm] of [['enx-root', 'Renamed by the owner'], [DB.folders.find((x) => x.enx && x.enx.name === 'Stack A').id, 'My own stack name']]) { const f = DB.folders.find((x) => x.id === id); f.name = nm; f.updatedAt = new Date().toISOString(); } persist(); });
    const dir2 = join(TMP, 'export2', 'Stack A'); mkdirSync(dir2, { recursive: true });
    writeFileSync(join(dir2, 'Alpha.enex'), HEAD + noteXML({ title: 'Late arrival', created: '20210101T000000Z' }) + '</en-export>\n');
    const nf = await on(d, () => DB.folders.length);
    await again(d, vp, join(TMP, 'export2'), ['done'], true);
    const late = await on(d, () => { const a = DB.articles.find((x) => x.title === 'Late arrival'); const f = a && DB.folders.find((x) => x.id === a.folderIds[0]); return { f: f && f.name, par: f && DB.folders.find((x) => x.id === f.parentId).name, nf: DB.folders.length }; });
    check(late.f === 'Alpha' && late.par === 'My own stack name' && late.nf === nf, `${t} folders are found by their id, not their name: after the owner renamed the root and the stack, a later note lands in the same Alpha folder and no folder is added`, JSON.stringify(late));
    noErr(d, t);
  });

  /* ══ 80b — content ══ */
  if (want('80b')) await each('80b', async (d, vp) => {
    const t = `80b@${vp.name}`;
    await bring(d, vp, FILES, ['done']);
    const A = BOOKS[0].notes;
    const todo = await art(d, 'Todo list');
    check(todo && todo.content.includes('☑ done item') && todo.content.includes('☐ open item') && !/en-todo/i.test(todo.content), `${t} ☑ for a ticked to-do and ☐ for an open one`, todo && todo.content);
    check(todo.content.includes('style="color:red"') && !/<\?xml|DOCTYPE|<\/?en-note/i.test(todo.content), `${t} Evernote's own styling stays; the prologue and the en-note wrapper are gone`, todo.content);
    check(todo.content.startsWith('<p class="enx-src">Source: <a href="https://x.example/?a=1&amp;b=2">https://x.example/?a=1&amp;b=2</a></p>'), `${t} the source address is a first paragraph`, todo.content.slice(0, 160));
    const sec = await art(d, 'Secret');
    check(sec.content.includes('<span class="enx-crypt" contenteditable="false">🔒 encrypted text (Evernote; not imported)</span>') && !/ABCDEFGSECRETBLOB|en-crypt/.test(sec.content) && sec.content.includes('before') && sec.content.includes('after'), `${t} encrypted text becomes the marker, and the cipher text is not kept`, sec.content);
    const med = await art(d, 'Media');
    const spans = await on(d, (c) => { const x = document.createElement('div'); x.innerHTML = c; return [...x.querySelectorAll('.enx-media')].map((s) => ({ h: s.dataset.enxHash, m: s.dataset.mime, n: s.dataset.name, ce: s.getAttribute('contenteditable'), t: s.textContent })); }, med.content);
    const want3 = [[H1, 'image/png', 'pic.png', '🖼 picture'], [H2, 'audio/mpeg', 'snd.mp3', '🎧 audio'], [H3, 'application/pdf', 'doc.pdf', '📎 file']];
    check(spans.length === 3 && want3.every((w, i) => spans[i].h === w[0] && spans[i].m === w[1] && spans[i].n === w[2] && spans[i].ce === 'false' && spans[i].t.startsWith(w[3]) && /arrives with the next import step/.test(spans[i].t)) && !/en-media/.test(med.content), `${t} each picture/audio/file becomes a marker that keeps its hash, mime and file name`, JSON.stringify(spans));
    const ev = await art(d, 'Evil');
    check(!/<script|<iframe|<object|<embed|<style|onclick|onerror|onmouseover|javascript:/i.test(ev.content) && !/data:image/.test(ev.content), `${t} script, iframe, object, embed, style, every on*= and javascript:/data: addresses are removed`, ev.content);
    check(ev.content.includes('<a href="#">bad link</a>') || /<a href="#"[^>]*>bad link/.test(ev.content), `${t} a javascript: link becomes #`, ev.content);
    check(ev.content.includes('<a href="https://ok.example/">good link</a>') && ev.content.includes('<div>x</div>') && ev.content.includes('hover'), `${t} a good link and the plain text around it are untouched`, ev.content);
    for (const n of A.filter((x) => x.title && x.title !== 'Secret')) { /* dates and titles */ }
    check(todo.createdAt === '2020-01-01T00:00:00.000Z' && todo.updatedAt === '2020-02-02T03:04:05.000Z', `${t} created and updated dates are the note's own (${todo.createdAt} / ${todo.updatedAt})`);
    check(JSON.stringify(todo.tags) === JSON.stringify(['travel', 'work']), `${t} tags are exact`, JSON.stringify(todo.tags));
    const bn = await art(d, 'বাংলা নোট');
    check(bn && JSON.stringify(bn.tags) === JSON.stringify(['ab', 'Plain', 'দেশ']) && bn.content.includes('বাংলা লেখা'), `${t} a Bengali title and body, and a tag with a comma keeps everything but the comma ("a,b" → "ab")`, bn && JSON.stringify(bn.tags));
    check((await on(d, () => _enx.imp.commaTags)) === 1 && /1 tag had a comma taken out/.test(await on(d, () => document.getElementById('enx-isum').textContent)), `${t} the comma tag is counted and said`);
    const un = await art(d, 'Untitled (Evernote)');
    check(!!un, `${t} an empty title becomes "Untitled (Evernote)"`);
    const meta = await on(d, () => { const a = DB.articles.find((x) => x.title === 'Todo list' && x.fromEvernote); return { f: a.fromEvernote, id: a.id, k: a.fromEvernote.k }; });
    check(meta.f.nb === 'Alpha' && meta.f.stack === '' && /^Alpha\u0001|^\/Alpha\u0001/.test(meta.k) && meta.k.includes('todo list') && !isNaN(Date.parse(meta.f.at)) && /^enx-n-/.test(meta.id), `${t} fromEvernote carries nb, stack, a stable key and the import time; the id comes from the key`, JSON.stringify(meta));
    /* the card, the read view and the Smart View */
    const ui = await on(d, () => {
      const a = DB.articles.find((x) => x.title === 'Gamma one' && x.fromEvernote);
      ST.folder = a.folderIds[0]; ST.article = null; render(); selArt(a.id);
      const card = document.querySelector('#p2 .ar-enx'), rv = document.querySelector('#p3 .av-enx');
      return { card: card && card.textContent, rv: rv && rv.textContent };
    });
    check(ui.card === '📥 from Evernote · Gamma', `${t} the Pane 2 card says "📥 from Evernote · Gamma"`, String(ui.card));
    check(ui.rv === '📥 from Evernote · Gamma', `${t} the read view says "📥 from Evernote · Gamma"`, String(ui.rv));
    const sf = await on(d, () => { const l = getSmartArts('sf-enx'); const ats = l.map((a) => a.fromEvernote.at); ST.sfOpen = true; renderTree(); const row = [...document.querySelectorAll('#sb *')].find((e) => e.children.length === 0 && /\(13\) From Evernote/.test(e.textContent)); return { n: l.length, sorted: ats.every((x, i) => !i || ats[i - 1] >= x), row: !!row, ico: SF.find((s) => s.id === 'sf-enx').icon, inSfList: typeof sfOrdered === 'function' && sfOrdered().some((s) => s.id === 'sf-enx') }; });
    check(sf.n === nNew && sf.sorted && sf.row && sf.ico === '📥' && sf.inSfList, `${t} the Smart View "(13) From Evernote" is in the sidebar and lists the ${nNew} notes, newest-imported first`, JSON.stringify(sf));
    noErr(d, t);
  });

  /* ══ 80c — never twice ══ */
  if (want('80c')) await each('80c', async (d, vp) => {
    const t = `80c@${vp.name}`;
    await bring(d, vp, FILES, ['done']);
    const ids1 = (await enxIds(d)).sort(), ev0 = await on(d, () => JSON.stringify(DB.articles.find((a) => a.id === 'ev1')));
    check(ids1.length === nNew && (await enxTitles(d)).filter((x) => /caf/i.test(x)).length === 0, `${t} ${nNew} notes came in; the one matching "Café ☕ Note" (title + created second) did not`, String(ids1.length));
    check((await on(d, () => _enx.imp.already)) === 1, `${t} ...and it is counted as already in Siyagah (1)`, String(await on(d, () => _enx.imp.already)));
    await again(d, vp, FILES, ['done']);
    const ids2 = (await enxIds(d)).sort();
    const s2 = await on(d, () => ({ took: _enx.imp.took, earlier: _enx.imp.earlier, dup: new Set(DB.articles.map((a) => a.id)).size !== DB.articles.length }));
    check(JSON.stringify(ids1) === JSON.stringify(ids2) && s2.took === 0 && s2.earlier === nNew && !s2.dup, `${t} the same export again brings in nothing (0 new, ${s2.earlier} left alone as brought in earlier, no duplicate id)`, JSON.stringify(s2));
    check((await on(d, () => JSON.stringify(DB.articles.find((a) => a.id === 'ev1')))) === ev0, `${t} the existing "Café ☕ Note" is byte-identical (never overwritten)`);
    /* delete one imported note to Trash: it stays deleted */
    const gone = await on(d, () => { const a = DB.articles.find((x) => x.title === 'Gamma one' && x.fromEvernote); deleteNote(a.id); return a.id; });
    await again(d, vp, FILES, ['done']);
    const back = await on(d, (id) => ({ inArts: DB.articles.some((a) => a.id === id), inTrash: DB.trash.some((x) => x.item && x.item.id === id), n: DB.articles.filter((a) => a.fromEvernote).length, earlier: _enx.imp.earlier }), gone);
    check(!back.inArts && back.inTrash && back.n === nNew - 1 && back.earlier === nNew, `${t} a note moved to Trash does not come back on the next run`, JSON.stringify(back));
    /* emptied out of Trash for good (only the tombstone is left) */
    await on(d, (id) => { DB.trash = DB.trash.filter((x) => !(x.item && x.item.id === id)); _addTombstones([id]); persist(); }, gone);
    await again(d, vp, FILES, ['done']);
    check(!(await on(d, (id) => DB.articles.some((a) => a.id === id), gone)) && (await enxIds(d)).length === nNew - 1, `${t} ...nor after it is deleted from Trash for good`);
    /* the matching rule must be able to fail: move the Siyagah note one second and it IS brought in */
    await on(d, () => { DB.articles.find((a) => a.id === 'ev1').createdAt = '2024-03-05T10:20:31.000Z'; persist(); });
    await again(d, vp, FILES, ['done']);
    check((await enxTitles(d)).includes('café ☕ note'), `${t} with the Siyagah note one second off, the Evernote note is a different note and comes in`, (await enxTitles(d)).join());
    noErr(d, t);
  });

  /* ══ 80j — an emptied Evernote folder in Trash (v05.24, enxf1) ══ */
  if (want('80j')) await each('80j', async (d, vp) => {
    const t = `80j@${vp.name}`;
    /* The case: the owner empties an Evernote folder and puts it in Trash WHILE an import is running; the next batch of the same
       notebook must not create a second folder with the trashed one's id. (The id sets were read when the import began, so a folder
       trashed after that was invisible to them.) 700 notes, the first notebook has 420: two batches reach it. */
    const files = makeMany('many-j', 700);
    await on(d, () => { window.__enxDelay = 700; });
    await dlg(d, vp); await d.page.setInputFiles('#enx-files', files); await waitDone(d); await act(d, vp, '#enx-bring');
    await d.page.waitForFunction(() => DB.articles.filter((a) => a.fromEvernote).length >= 250, null, { timeout: 30000 });
    const f0 = await on(d, () => { const f = DB.folders.find((x) => x.enx && x.enx.kind === 'nb' && x.name === 'Many one'); return f ? f.id : null; });
    check(!!f0 && /^enx-b-/.test(f0), `${t} the first batch made the notebook folder "Many one" (${f0})`);
    /* empty it (its notes go to Trash) and put the empty folder in Trash, between two batches */
    const tr = await on(d, (id) => {
      DB.articles.filter((a) => a.fromEvernote && a.folderIds.includes(id)).forEach((a) => deleteNote(a.id));
      trashFolder(id);
      return { inFolders: DB.folders.some((x) => x.id === id), inTrash: DB.trash.some((x) => x.type === 'folder' && x.item && x.item.id === id), running: !!_enx.imp.run };
    }, f0);
    check(!tr.inFolders && tr.inTrash && tr.running, `${t} the emptied folder is in Trash while the import is still running`, JSON.stringify(tr));
    await waitState(d, ['done']);
    const r = await on(d, (id) => {
      const a = DB.articles.find((x) => x.fromEvernote && x.fromEvernote.nb === 'Many one'), fol = a && DB.folders.find((x) => x.id === a.folderIds[0]);
      const trashIds = new Set(); DB.trash.forEach((x) => { if (x.type === 'folder') { if (x.item) trashIds.add(x.item.id); ((x.subtree && x.subtree.folders) || []).forEach((f) => trashIds.add(f.id)); } });
      const ids = DB.folders.map((f) => f.id);
      return { came: !!a, folder: fol ? fol.id : null, name: fol ? fol.name : null, clash: ids.filter((i) => trashIds.has(i)), dupIds: new Set(ids).size !== ids.length, stillTrashed: DB.trash.some((x) => x.type === 'folder' && x.item && x.item.id === id), oldGone: !DB.folders.some((f) => f.id === id) };
    }, f0);
    check(r.came && r.name === 'Many one' && r.folder !== f0 && /^enx-b-.*-2$/.test(r.folder || ''), `${t} the next batch makes a new "Many one" with the next free id (${f0} → ${r.folder}), not the trashed id`, JSON.stringify(r));
    check(r.clash.length === 0 && !r.dupIds, `${t} no folder id in the folder list equals one in Trash, and none is doubled`, JSON.stringify(r.clash));
    check(r.stillTrashed && r.oldGone, `${t} the trashed folder is still in Trash, untouched (nothing lost)`);
    noErr(d, t);
  });

  /* ══ 80d — the cap ══ */
  if (want('80d')) await each('80d', async (d, vp) => {
    const t = `80d@${vp.name}`;
    const many = makeMany('many-d', 700), NOW = Date.now();
    await on(d, (n) => { window.__enxCap = 300; window.__enxNow = n; }, NOW);
    await bring(d, vp, many);
    const s1 = await on(d, () => ({ st: _enx.imp.state, took: _enx.imp.took, n: DB.articles.filter((a) => a.fromEvernote).length, cap: document.getElementById('enx-icap') && document.getElementById('enx-icap').textContent, dis: document.getElementById('enx-cont') && document.getElementById('enx-cont').disabled }));
    check(s1.st === 'capped' && s1.n === 300 && s1.took === 300, `${t} the import stops at the cap (300 of 700)`, JSON.stringify(s1));
    check(s1.cap === `300 brought in today. 400 to go. Continue after ${when(NOW + DAY, NOW)}`, `${t} the message names what is done, what is left and the real time`, s1.cap);
    check(s1.dis === true, `${t} "Continue" is disabled while the window is shut`);
    await on(d, () => _enxContinue());
    const refused = await on(d, () => ({ n: DB.articles.filter((a) => a.fromEvernote).length, note: (document.getElementById('enx-inote') || {}).textContent }));
    check(refused.n === 300 && /Not yet/.test(refused.note || '') && (refused.note || '').includes(when(NOW + DAY, NOW)), `${t} Continue is refused until the window allows (nothing added), and says when`, JSON.stringify(refused));
    await on(d, (n) => { window.__enxNow = n; }, NOW + DAY / 2);
    await actText(d, vp, '#enx-box .rem-btn', 'Close'); await dlg(d, vp);
    check(await on(d, () => document.getElementById('enx-cont').disabled), `${t} 12 hours later it is still shut (a rolling 24 hours)`);
    await on(d, (n) => { window.__enxNow = n; }, NOW + DAY + 5000);
    await actText(d, vp, '#enx-box .rem-btn', 'Close'); await dlg(d, vp);
    check(!(await on(d, () => document.getElementById('enx-cont').disabled)), `${t} after 24 hours "Continue" is enabled`);
    const first300 = (await enxTitles(d));
    await act(d, vp, '#enx-cont'); await waitState(d, ['capped', 'done']);
    const t2 = await enxTitles(d);
    const exp600 = Array.from({ length: 600 }, (_, i) => 'Many ' + String(i + 1).padStart(5, '0'));
    check(t2.length === 600 && JSON.stringify(t2) === JSON.stringify(exp600) && first300.every((x) => t2.includes(x)), `${t} it resumes exactly where it stopped: notes 1–300 stay, 301–600 follow, none twice`, t2.length + ' ' + t2.slice(298, 302).join());
    await on(d, (n) => { window.__enxNow = n; }, NOW + 2 * DAY + 20000);
    await actText(d, vp, '#enx-box .rem-btn', 'Close'); await dlg(d, vp);
    await act(d, vp, '#enx-cont'); await waitState(d, ['done', 'capped']);
    const t3 = await enxTitles(d);
    check(t3.length === 700 && new Set(t3).size === 700 && (await on(d, () => _enx.imp.state)) === 'done', `${t} the third day brings the last 100: 700 in all, all different, state done`, t3.length + ' ' + (await on(d, () => _enx.imp.state)));
    check((await on(d, () => _enxJobGet())) === null, `${t} a finished import forgets its job (no more "Continue" toast)`);
    noErr(d, t);
  });
  if (want('80d')) {   /* the window is counted from the notes, so another device's notes count */
    const vp = VPS[2], t = '80d@1440';
    let A = null, B = null;
    try {
      const cl = makeCloud(), NOW = Date.now(), many = makeMany('many-d2', 400);
      A = await dev(cl, 'A', vp); B = await dev(cl, 'B', vp); A.page.setDefaultTimeout(15000); B.page.setDefaultTimeout(15000);
      await waitSeeded(cl, A); await waitSeeded(cl, B);
      await on(A, (n) => { window.__enxCap = 300; window.__enxNow = n; }, NOW); await on(B, (n) => { window.__enxCap = 300; window.__enxNow = n; }, NOW);
      await bring(A, vp, many);
      await on(A, () => { persist(); flushPendingPush(); }); await quiet(cl, A, 60000);
      const got = await B.page.waitForFunction(() => DB.articles.filter((a) => a.fromEvernote).length >= 300, null, { timeout: 60000 }).then(() => true, () => false);
      const w = await on(B, () => _enxWindow(_enxNowMs()));
      check(got && w.used === 300 && w.room === 0, `${t} device B counts the 300 notes device A brought in: window used ${w.used}, room ${w.room}`, JSON.stringify(w));
      await dlg(B, vp); await B.page.setInputFiles('#enx-files', many); await waitDone(B); await act(B, vp, '#enx-bring'); await waitState(B, ['capped']);
      const b = await on(B, () => ({ n: DB.articles.filter((a) => a.fromEvernote).length, took: _enx.imp.took, txt: document.getElementById('enx-icap').textContent }));
      check(b.took === 0 && b.n === 300 && /^300 brought in today\./.test(b.txt) && /Continue after/.test(b.txt), `${t} so B brings in nothing more today and says "${b.txt}"`, JSON.stringify(b));
      noErr(A, t + ' A'); noErr(B, t + ' B');
    } catch (e) { check(false, `${t} threw: ${String(e && e.message || e).split('\n')[0]}`); }
    finally { if (A) await A.ctx.close(); if (B) await B.ctx.close(); }
  }

  /* ══ 80e — interrupted ══ */
  if (want('80e')) {
    const files = makeMany('many-e', 700);
    for (const [vp, kind] of [[VPS[0], 'between'], [VPS[2], 'between'], [VPS[2], 'inside']]) {
      let d = null; const t = `80e@${vp.name} ${kind}`;
      try {
        const cl = makeCloud(); d = await dev(cl, 'E', vp, {}, seed(kind === 'inside' ? 1600 : 0)); d.page.setDefaultTimeout(30000);
        await waitSeeded(cl, d);
        let held = false; d.page.on('console', (m) => { if (m.text() === 'LJ_HOLD') held = true; });
        await on(d, ([k]) => { window.__enxDelay = 400; if (k === 'inside') window.__ljHold = 6000; }, [kind]);
        await dlg(d, vp); await d.page.setInputFiles('#enx-files', files); await waitDone(d); await act(d, vp, '#enx-bring');
        if (kind === 'between') await d.page.waitForFunction(() => DB.articles.filter((a) => a.fromEvernote).length >= 250, null, { timeout: 30000 });
        else { const t0 = Date.now(); while (!held && Date.now() - t0 < 30000) await sleep(20); }
        await d.page.close();   /* the page goes away in the middle: whatever was not saved is gone */
        await newPage(d);
        const st = await on(d, () => {
          const arts = DB.articles.filter((a) => a.fromEvernote), ids = DB.articles.map((a) => a.id);
          return { n: arts.length, dup: new Set(ids).size !== ids.length, orphan: arts.filter((a) => !a.folderIds.length || !a.folderIds.every((f) => DB.folders.some((x) => x.id === f))).length, bare: arts.filter((a) => !a.title || a.content == null || !a.fromEvernote.k || !a.createdAt).length, folders: DB.folders.filter((f) => f.enx).length };
        });
        check(st.n % 250 === 0 && st.n <= 500 && !st.dup && st.orphan === 0 && st.bare === 0, `${t} after the page is closed mid-import the notebook holds ${st.n} notes: whole batches only, none half, none without a folder, no duplicate id (${held ? 'a journal transaction was open at the kill' : 'killed between batches'})`, JSON.stringify(st));
        if (kind === 'inside') check(held && st.n < 250 * 2, `${t} the kill really landed with a journal transaction open (LJ_HOLD seen)`);
        /* the rest continues: the toast / the dialog's Continue, then the files again */
        await dlg(d, vp);
        const un = await on(d, () => new Promise((r) => setTimeout(() => r(document.getElementById('enx-unfinished') ? document.getElementById('enx-unfinished').textContent : ''), 600)));
        check(/An import is unfinished: [\d,]+ of 700 brought in/.test(un), `${t} the reopened app knows an import is unfinished ("${un}")`);
        await act(d, vp, '#enx-cont'); await d.page.waitForSelector('#enx-resume');
        await d.page.setInputFiles('#enx-files', files); await waitState(d, ['done']);
        const fin = await on(d, () => { const a = DB.articles.filter((x) => x.fromEvernote), ids = DB.articles.map((x) => x.id); return { n: a.length, uniq: new Set(a.map((x) => x.title)).size, dup: new Set(ids).size !== ids.length }; });
        check(fin.n === 700 && fin.uniq === 700 && !fin.dup, `${t} Continue finishes it: 700 notes, 700 different titles, no duplicate`, JSON.stringify(fin));
        noErr(d, t);
      } catch (e) { check(false, `${t} threw: ${String(e && e.message || e).split('\n')[0]}`); }
      finally { if (d) await d.ctx.close(); }
    }
  }

  /* ══ 80f — sync ══ */
  if (want('80f')) {
    const vp = VPS[2], t = '80f@1440';
    let A = null, B = null;
    try {
      const cl = makeCloud(); A = await dev(cl, 'A', vp); B = await dev(cl, 'B', vp); A.page.setDefaultTimeout(15000); B.page.setDefaultTimeout(15000);
      await waitSeeded(cl, A); await waitSeeded(cl, B);
      await bring(A, vp, EXPORT, ['done'], true);
      await on(A, () => { persist(); flushPendingPush(); }); await quiet(cl, A, 60000);
      const ok = await B.page.waitForFunction((n) => DB.articles.filter((a) => a.fromEvernote).length >= n && DB.folders.filter((f) => f.enx).length >= 7, nNew, { timeout: 60000 }).then(() => true, () => false);
      check(ok, `${t} device B receives every imported note (${nNew}) and folder (7), unprompted`);
      const same = await (async () => { const a = await on(A, () => JSON.stringify(DB.articles.filter((x) => x.fromEvernote).sort((x, y) => (x.id < y.id ? -1 : 1)))), b = await on(B, () => JSON.stringify(DB.articles.filter((x) => x.fromEvernote).sort((x, y) => (x.id < y.id ? -1 : 1)))); const fa = await on(A, () => JSON.stringify(DB.folders.filter((x) => x.enx).sort((x, y) => (x.id < y.id ? -1 : 1)))), fb = await on(B, () => JSON.stringify(DB.folders.filter((x) => x.enx).sort((x, y) => (x.id < y.id ? -1 : 1)))); return a === b && fa === fb; })();
      check(same, `${t} ...and they are byte-identical on both (content, dates, tags, fromEvernote, folder ids)`);
      const treeB = await pathOf(B);
      check(treeB.length === 7 && treeB[0] === 'Evernote', `${t} B draws Evernote ▸ stack ▸ notebook too`, treeB.join(' | '));
      /* edits go both ways */
      await on(A, () => { const a = DB.articles.find((x) => x.title === 'Gamma one' && x.fromEvernote); a.title = 'Gamma one (edited on A)'; a.updatedAt = new Date().toISOString(); persist(); flushPendingPush(); }); await quiet(cl, A);
      check(await B.page.waitForFunction(() => DB.articles.some((a) => a.title === 'Gamma one (edited on A)' && a.fromEvernote), null, { timeout: 30000 }).then(() => true, () => false), `${t} an edit of an imported note on A reaches B`);
      await on(B, () => { const a = DB.articles.find((x) => x.title === 'Loose one' && x.fromEvernote); a.content += '<p>added on B</p>'; a.updatedAt = new Date().toISOString(); persist(); flushPendingPush(); }); await quiet(cl, B);
      check(await A.page.waitForFunction(() => DB.articles.some((a) => a.title === 'Loose one' && /added on B/.test(a.content)), null, { timeout: 30000 }).then(() => true, () => false), `${t} an edit on B reaches A (still marked fromEvernote)`);
      await on(B, () => { const a = DB.articles.find((x) => x.title === 'Beta two' && x.fromEvernote); deleteNote(a.id); persist(); flushPendingPush(); }); await quiet(cl, B);
      check(await A.page.waitForFunction(() => !DB.articles.some((a) => a.title === 'Beta two'), null, { timeout: 30000 }).then(() => true, () => false), `${t} a deletion on B (to Trash) reaches A`);
      noErr(A, t + ' A'); noErr(B, t + ' B');
    } catch (e) { check(false, `${t} threw: ${String(e && e.message || e).split('\n')[0]}`); }
    finally { if (A) await A.ctx.close(); if (B) await B.ctx.close(); }
  }

  /* ══ 80g — the owner's path ══ */
  if (want('80g')) await each('80g', async (d, vp) => {
    const t = `80g@${vp.name}`;
    const many = makeMany('many-g', 700);
    await on(d, () => { window.__enxCap = 600; window.__enxDelay = 700; });
    await dlg(d, vp);
    /* v05.28 (A1) made the first screen's text say that nothing is added until "Bring them in", so the words now appear on it; what
       80g means is that the BUTTON is not there before a result. Updated in place in the Architect's review of v05.28. */
    const first = await on(d, () => ({ h: document.getElementById('enx-box').textContent, btn: !!document.getElementById('enx-bring') }));
    check(!first.btn, `${t} the first screen offers the dry run only (no Bring button before there is a result)`);
    await d.page.setInputFiles('#enx-files', many); await waitDone(d);
    const br = await on(d, () => ({ b: document.getElementById('enx-bring').textContent, n: document.getElementById('enx-bringnote').textContent, dry: document.getElementById('enx-dry').textContent }));
    check(br.b === '📥 Bring them in' && br.n === 'Up to 600 notes now (the free cloud plan allows about that much a day). The rest continues later from here. Nothing in your notebook is changed or deleted.', `${t} "📥 Bring them in" with its one plain line`, br.n);
    await act(d, vp, '#enx-bring');
    await d.page.waitForSelector('#enx-pause');
    const prog = await on(d, () => new Promise((r) => setTimeout(() => r({ p: document.getElementById('enx-iprog').textContent, w: document.getElementById('enx-ibar').style.width }), 900)));
    check(/^Bringing in… [\d,]+ of 600 this time · 700 in all$/.test(prog.p) && /%$/.test(prog.w), `${t} progress reads "${prog.p}" with a bar (${prog.w})`);
    await act(d, vp, '#enx-pause'); await waitState(d, ['paused']);
    const ps = await on(d, () => ({ took: _enx.imp.took, n: DB.articles.filter((a) => a.fromEvernote).length, txt: document.getElementById('enx-ipaused').textContent, dis: document.getElementById('enx-cont').disabled }));
    check(ps.took === ps.n && ps.n % 250 === 0 && ps.n > 0 && ps.n < 600 && /^Paused after [\d,]+ notes this time\./.test(ps.txt) && !ps.dis, `${t} Pause stops after the batch in hand (${ps.n} notes) and Continue is there`, JSON.stringify(ps));
    await on(d, () => { window.__enxDelay = 0; });
    await actText(d, vp, '#enx-box .rem-btn', 'Close'); await sleep(300);
    check(!(await on(d, () => document.getElementById('enx-modal').classList.contains('open'))), `${t} the dialog closes`);
    await dlg(d, vp);
    check(await on(d, () => !!document.getElementById('enx-cont')), `${t} reopened: still at the paused screen with Continue`);
    await act(d, vp, '#enx-cont'); await waitState(d, ['capped']);
    const fin = await on(d, () => ({ n: DB.articles.filter((a) => a.fromEvernote).length, msg: document.getElementById('enx-icap').textContent }));
    check(fin.n === 600 && /^600 brought in today\. 100 to go\. Continue after /.test(fin.msg), `${t} Continue picks up and the day's share (600) is done: "${fin.msg}"`, JSON.stringify(fin));
    /* the toast: once per session, only when the window allows */
    await newPage(d);
    await on(d, () => { window.__enxCap = 600; }); await sleep(5500);
    check((await on(d, () => document.querySelectorAll('.toast-enx').length)) === 0, `${t} a reopened app does NOT nag while today's share is used up`);
    await on(d, () => { window.__enxNow = Date.now() + 25 * 3600000; return _enxBootToast(); }); await sleep(300);
    const tt = await on(d, () => ({ n: document.querySelectorAll('.toast-enx').length, txt: (document.querySelector('.toast-enx') || {}).textContent }));
    check(tt.n === 1 && tt.txt === '📥 Evernote: 600 of 700 brought in — Continue', `${t} when the window allows, one calm toast: "${tt.txt}"`);
    await on(d, () => _enxBootToast()); await sleep(200);
    check((await on(d, () => document.querySelectorAll('.toast-enx').length)) === 1 && (await on(d, () => _enx.toasted)), `${t} ...and only once per session`);
    await act(d, vp, '.toast-enx'); await sleep(400);
    check(await on(d, () => document.getElementById('enx-modal').classList.contains('open') && !!document.getElementById('enx-cont')), `${t} tapping the toast opens the dialog at Continue`);
    noErr(d, t);
  });

  /* ══ 80h — scale ══ */
  if (want('80h')) {
    /* the base build, for "before": index.html of the commit before the import was written */
    let baseSrv = null;
    try { baseSrv = await serve(makeBase()); } catch (e) { console.log('(no base build: ' + e.message + ')'); }
    /* 80h-1 the import of 2,000 notes at 390, CPU x4, into a 9,000-note notebook */
    {
      const vp = VPS[0], t = '80h@390 CPU x4';
      let d = null;
      try {
        const files = [join(TMP, 'two-k', 'Stack K', 'Two thousand.enex')]; mkdirSync(join(TMP, 'two-k', 'Stack K'), { recursive: true });
        let s = HEAD; for (let i = 0; i < 2000; i++) { const tm = new Date(Date.UTC(2016, 0, 1) + i * 90000); const c = tm.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z'); s += noteXML({ title: 'Two thousand ' + i, created: c, tags: ['k' + (i % 40), 'two'], src: 'https://k.example/' + i, inner: '<div>' + 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(20) + `</div><div><en-todo/>step ${i}</div><en-media hash="${H1}" type="image/png"/>` }); }
        writeFileSync(files[0], s + '</en-export>\n');
        const cl = makeCloud(); d = await dev(cl, 'K', vp, { throttle: 4 }, seed(9000)); d.page.setDefaultTimeout(60000);
        const cdp = d.cdp || (await d.ctx.newCDPSession(d.page));
        await waitSeeded(cl, d, 300000);
        await dlg(d, vp); await d.page.setInputFiles('#enx-files', files); await waitDone(d, 300000);
        await on(d, probeInstall);   /* v05.26 (P4): the app's own long tasks, the fake cloud's clone taken out (s1-fake.mjs) */
        await on(d, () => { window.__lt = []; window.__bt = []; try { new PerformanceObserver((l) => l.getEntries().forEach((e) => { window.__lt.push(Math.round(e.duration)); (window.__lts = window.__lts || []).push([Math.round(e.startTime), Math.round(e.duration)]); })).observe({ entryTypes: ['longtask'] }); } catch (e) {} const o = window._enxPersist; window._enxPersist = function () { const t0 = performance.now(); const r = o.apply(this, arguments); window.__bt.push(Math.round(performance.now() - t0)); (window.__bts = window.__bts || []).push([Math.round(t0), Math.round(performance.now() - t0)]); return r; }; });
        await cdp.send('HeapProfiler.collectGarbage'); await sleep(300);
        const base = (await cdp.send('Runtime.getHeapUsage')).usedSize; let peak = base, stop = false;
        const poll = (async () => { while (!stop) { try { const u = (await cdp.send('Runtime.getHeapUsage')).usedSize; if (u > peak) peak = u; } catch {} await sleep(100); } })();
        const pFrom = await on(d, () => performance.now()); const t0 = Date.now(); await act(d, vp, '#enx-bring'); await waitState(d, ['done', 'capped'], 600000); const secs = (Date.now() - t0) / 1000;
        await quiet(cl, d, 300000);   /* v05.26 (P4): measured until the app's push of the new notes has returned too, not only until the import is done */
        stop = true; await poll; const probe = await on(d, probeRead, pFrom);
        console.log('# long tasks [start,dur]: ' + JSON.stringify(await on(d, () => window.__lts)) + ' persist [start,dur]: ' + JSON.stringify(await on(d, () => window.__bts)));
        const m = await on(d, () => ({ lt: window.__lt, bt: window.__bt, n: DB.articles.filter((a) => a.fromEvernote).length, tot: DB.articles.length, undo: HISTORY.length }));
        const worst = Math.max(0, ...probe.map((x) => x.app)), rawWorst = Math.max(0, ...m.lt), bworst = Math.max(0, ...m.bt), grow = (peak - base) / 1048576;
        console.log(`# 80h 2,000-note import at 390 CPU x4: ${secs.toFixed(1)} s, ${m.bt.length} batches, per batch (persist) median ${m.bt.slice().sort((a, b) => a - b)[m.bt.length >> 1]} ms worst ${bworst} ms, worst long task ${worst} ms of the app's own work (${rawWorst} ms raw, the rest the fake cloud's clone; ${m.lt.length} over 50 ms), heap +${grow.toFixed(1)} MB`);
        console.log("# long tasks, worst 6 by the app's own time [start ms, total, fake cloud, app]: " + probe.slice().sort((a, b) => b.app - a.app).slice(0, 6).map((x) => `[${x.start}, ${x.dur}, ${x.fake}, ${x.app}]`).join(' ') + '; clicked at ' + Math.round(pFrom));
        check(m.n === 2000 && m.tot === 9000 + 4 + 2000, `${t} 2,000 notes came in to a notebook of ${9000 + 4} (now ${m.tot})`, JSON.stringify({ n: m.n, tot: m.tot }));
        const HL = hostLimit(200);   /* v05.24 (hs520): the runner's limit × this computer's factor (≥ 1) */
        check(worst <= HL.ms, `${t} no long task over ${HL.text} ms (worst ${worst} ms; ${m.lt.length} over 50 ms; time per batch: median ${m.bt.slice().sort((a, b) => a - b)[m.bt.length >> 1]} ms, worst ${bworst} ms; ${secs.toFixed(1)} s in all)`, m.lt.join());
        check(grow <= 150, `${t} the JS heap grows by at most 150 MB (start ${(base / 1048576).toFixed(1)}, peak ${(peak / 1048576).toFixed(1)}, +${grow.toFixed(1)} MB)`);
        check(m.undo <= 2, `${t} the import made no undo frames (history length ${m.undo})`);
        noErr(d, t);
      } catch (e) { check(false, `${t} threw: ${String(e && e.message || e).split('\n')[0]}`); }
      finally { if (d) await d.ctx.close(); }
    }
    /* 80h-2 boot and render() with 27,000 notes — after (this build) and before (the base build) */
    for (const [label, base] of [['after (v05.20, with the import)', srv.base], ['before (the same app without the import)', baseSrv && baseSrv.base]]) {
      if (!base) continue;
      for (const vp of [VPS[0], VPS[2]]) {
        const t = `80h@${vp.name} ${BIGN} notes, ${label}`;
        let d = null;
        try {
          const ctxOpts = vp.touch ? { viewport: { width: vp.w, height: vp.h }, hasTouch: true, isMobile: true } : { viewport: { width: vp.w, height: vp.h } };
          const ctx = await browser.newContext(ctxOpts); const db = bulk(seed(), BIGN - 4);
          await ctx.addInitScript((db0) => { try { if (!localStorage.getItem('my-notebook-v1')) localStorage.setItem('my-notebook-v1', JSON.stringify(db0)); } catch {} }, JSON.parse(JSON.stringify({ ...db, articles: db.articles.slice(0, 4) })));
          const page = await ctx.newPage(); page.setDefaultTimeout(120000);
          const cdp = await ctx.newCDPSession(page); if (vp.touch) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
          await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
          await page.waitForFunction(() => window.__appBooted === true);
          /* v05.56: wait for the save itself, not a fixed 1.5 s. On a busy host the first journal save of 27,000 notes (a full copy) was not
             committed when the reload came, so the start found the 4-note seed and waited for 27,000 notes that never arrived (both builds). */
          await page.evaluate(async (arts) => { DB.articles.push(...arts); persist(); await _ljChain.catch(() => {}); }, db.articles.slice(4));
          await sleep(500);
          await page.reload({ waitUntil: 'domcontentloaded' });
          const t0 = Date.now(); await page.waitForFunction((n0) => window.__appBooted === true && !!document.getElementById('tree') && DB.articles.length > n0, BIGN - 100, { timeout: 300000 }); const boot = Date.now() - t0;
          const rend = await page.evaluate(() => { const r = []; for (let i = 0; i < 3; i++) { const a = performance.now(); render(); r.push(Math.round(performance.now() - a)); } return r; });
          const n = await page.evaluate(() => DB.articles.length);
          console.log(`# 80h ${label} ${vp.name}${vp.touch ? ' CPU x4' : ''}: ${n} notes, boot ${boot} ms, render() ${rend.join('/')} ms`);
          const HB = hostLimit(vp.touch ? 120000 : 60000), HR = hostLimit(vp.touch ? 8000 : 3000);   /* v05.24 (hs520) */
          check(n >= BIGN - 10 && boot < HB.ms, `${t}: boots in ${boot} ms (limit ${HB.raw / 1000} s × host ${HB.factor})`);
          check(Math.min(...rend) < HR.ms, `${t}: render() takes ${rend.join('/')} ms (limit ${HR.raw} ms × host ${HR.factor})`);
          await ctx.close();
        } catch (e) { check(false, `${t} threw: ${String(e && e.message || e).split('\n')[0]}`); }
      }
    }
    if (baseSrv) await baseSrv.close();
  }

  /* ══ 80i — contrast ══ */
  if (want('80i')) await each('80i', async (d, vp) => {
    const t = `80i@${vp.name}`;
    const measure = () => d.page.evaluate(() => {
      const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
      const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
      const bgOf = (el) => { const layers = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; } } let base = { r: 255, g: 255, b: 255 }; for (let i = layers.length - 1; i >= 0; i--) { const c = layers[i]; base = { r: c.r * c.a + base.r * (1 - c.a), g: c.g * c.a + base.g * (1 - c.a), b: c.b * c.a + base.b * (1 - c.a) }; } return base; };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      let worst = 99, who = '', n = 0;
      document.querySelectorAll('#enx-box *, #p3 .enx-media, #p3 .enx-crypt, #p3 .enx-src, #p2 .ar-enx, #p3 .av-enx').forEach((e) => {
        if (![...e.childNodes].some((x) => x.nodeType === 3 && x.textContent.trim())) return;
        const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return;
        const fg = parse(cs.color), bg = bgOf(e);
        const comp = fg.a < 1 ? { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) } : fg;
        n++; const rr = ratio(comp, bg); if (rr < worst) { worst = rr; who = e.className + ':' + e.textContent.trim().slice(0, 14); }
      });
      return { worst: Math.round(worst * 100) / 100, who, n };
    });
    const presets = ['forest', 'ocean', 'amber', 'indigo', 'rose'];
    const many = makeMany('many-i', 500);
    await on(d, () => { window.__enxCap = 300; window.__enxNow = Date.now(); });
    await dlg(d, vp); await d.page.setInputFiles('#enx-files', many); await waitDone(d);
    for (const p of presets) { await on(d, (k) => applyPreset(k), p); await sleep(150); const m = await measure(); check(m.n >= 20 && m.worst >= 4.5, `${t} the "Bring them in" screen (${m.n} pieces) clears 4.5:1 on ${p} (worst ${m.worst}, ${m.who})`, JSON.stringify(m)); }
    await on(d, () => applyPreset('forest')); await act(d, vp, '#enx-bring'); await waitState(d, ['capped']);
    for (const p of presets) { await on(d, (k) => applyPreset(k), p); await sleep(150); const m = await measure(); check(m.n >= 4 && m.worst >= 4.5, `${t} the stopped-for-today screen with its disabled Continue (${m.n} pieces) clears 4.5:1 on ${p} (worst ${m.worst}, ${m.who})`, JSON.stringify(m)); }
    await on(d, () => { window.__enxCap = 6000; applyPreset('forest'); }); await actText(d, vp, '#enx-box .rem-btn', 'Close'); await dlg(d, vp); await act(d, vp, '#enx-cont'); await waitState(d, ['done']);
    for (const p of presets) { await on(d, (k) => applyPreset(k), p); await sleep(150); const m = await measure(); check(m.n >= 4 && m.worst >= 4.5, `${t} the done screen (${m.n} pieces) clears 4.5:1 on ${p} (worst ${m.worst}, ${m.who})`, JSON.stringify(m)); }
    await actText(d, vp, '#enx-box .rem-btn', 'Close');
    await on(d, () => { const a = DB.articles.find((x) => x.fromEvernote && x.content.includes('enx-media')) || DB.articles.find((x) => x.fromEvernote); ST.folder = a.folderIds[0]; render(); selArt(a.id); });
    for (const p of presets) { await on(d, (k) => applyPreset(k), p); await sleep(150); const m = await measure(); check(m.n >= 1 && m.worst >= 4.5, `${t} the 📥 card line, the read-view line and the markers in a note (${m.n} pieces) clear 4.5:1 on ${p} (worst ${m.worst}, ${m.who})`, JSON.stringify(m)); }
    noErr(d, t);
  });
} catch (e) {
  console.log(' FAIL  enex-s4b threw: ' + (e && e.stack || e));
  results.push({ ok: false, label: 'threw' });
} finally {
  await browser.close();
  await srv.close();
  try { rmSync(TMP, { recursive: true, force: true }); } catch {}
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
