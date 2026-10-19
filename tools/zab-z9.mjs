#!/usr/bin/env node
/* tools/zab-z9.mjs — v05.25, Z9: a title for any Zab item (PCF J36). Checks 85a–85h, at 390 / 820 / 1440.

   85a  the ✎ Title button is on every item row (plain, Links, Tasks, Ideas, Shopping), on a deck card and in All pockets; the ⋯ menu says "✎ Title…";
        on the phone the button is >= 44 px high
   85b  a real click on ✎ Title, type, Enter -> DB has `title`; the row shows it bold with the link small and on one line; the link is an
        a.jeb-lnk (new tab); a tap on the small text edits the TEXT; Escape in the dialog changes nothing
   85c  Clear removes the key (absent, not ""), and the row is byte-identical to before the title was set
   85d  an item with no title: the panel's HTML equals the v05.24 build's, apart from the new button (the build before this round is served too)
   85e  Links pocket: the title wins over the fetched `ttl`, and `ttl` is untouched in DB
   85f  → Note on a titled item: the note's title is the item's title (a Links item too)
   85g  two devices (mergeDB both ways): a title set on A arrives on B; set on A, then cleared on B later -> cleared
   85h  the deck card and All pockets show it; at 360 nothing overflows
   85i  no page errors

   `--only=85a,85d` runs just those; `--unpatched` serves the build before this round (the parent of the "v05.25: version bump" commit).
   Each ok/FAIL line becomes one app-check check. */
import { z12Words } from './z12-words.mjs';
import { playwright, serve, seedDB } from './harness.mjs';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function check(ok, label, detail = '') { results.push({ ok, label }); console.log((ok ? '  ok   ' : ' FAIL  ') + label + (detail ? '\n         ' + detail : '')); }

const P390 = { name: '390', w: 390, h: 844, touch: true }, T820 = { name: '820', w: 820, h: 1180, touch: true }, D1440 = { name: '1440', w: 1440, h: 900, touch: false };
const VPS = [P390, T820, D1440];
const T0 = '2026-10-01T00:00:00.000Z';
function makeBase() {
  const dir = mkdtempSync(join(tmpdir(), 'z9-base-'));
  const sha = execFileSync('git', ['log', '--format=%H', '-n', '1', '--grep=v05.25: version bump'], { encoding: 'utf8' }).trim();
  if (!sha) throw new Error('the v05.24 build ("v05.25: version bump"~1) is not in this clone - fetch more history (git fetch --unshallow)');   /* never compare the build with itself */
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', `${sha}~1:${f}`], { encoding: 'buffer', maxBuffer: 1 << 28 })); } catch {} }
  /* v05.34 (Z12), updated in place by the Architect: the owner's word is "Zab" now (the deck card's grip says "…move to another Zab"), so the v05.24 build gets the same
     word changes (tools/z12-words.mjs) before it is compared; every other difference still fails. */
  try { const f = join(dir, 'index.html'); writeFileSync(f, z12Words(readFileSync(f, 'utf8'))); } catch {}
  return dir;
}
const pw = await playwright();
const unpatched = argv.includes('--unpatched');
const srv = await serve(unpatched ? makeBase() : undefined);
const srvBase = await serve(makeBase());
const browser = await pw.chromium.launch();

const URL1 = 'https://x.com/someone/status/1234567890123456789?s=20&t=averyveryverylongtrackingtoken';
const pk = (id, i, extra = {}) => ({ id, name: id, icon: '✶', color: '#CFE8FF', order: i, createdAt: T0, updatedAt: T0, ...extra });
const mk = (id, pocketId, text, order, extra = {}) => ({ id, pocketId, text, done: false, folderIds: [], tags: [], kind: null, journal: false, order, createdAt: T0, updatedAt: T0, ...extra });
function seed() {
  const db = seedDB(T0);
  db.jebPockets = [pk('P', 0), pk('L', 1, { ztype: 'links' }), pk('T', 2, { ztype: 'tasks' }), pk('I', 3, { ztype: 'ideas' }), pk('S', 4, { ztype: 'shop' })];
  db.jeb = [mk('p1', 'P', 'Hanging Stuff', 0), mk('p2', 'P', URL1, 1),
    mk('l1', 'L', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 0, { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', ttl: 'Fetched YouTube Title', ch: 'Chan' }),
    mk('t1', 'T', 'Pay the bill', 0), mk('i1', 'I', 'An idea', 0), mk('s1', 'S', 'milk', 0)];
  db.theme = Object.assign({}, db.theme, { zabPhoneLayout: 'bar' });
  return db;
}
async function open(vp, db, base = srv.base) {
  const ctx = await browser.newContext(vp.touch ? { viewport: { width: vp.w, height: vp.h }, hasTouch: true, isMobile: true } : { viewport: { width: vp.w, height: vp.h } });
  for (const p of ['**googleapis.com/**', '**gstatic.com/**', '**firebaseapp.com/**', '**firebaseio.com/**', '**youtube.com/**', '**ytimg.com/**']) await ctx.route(p, (r) => r.abort());
  await ctx.addInitScript((d) => { try { if (!localStorage.getItem('my-notebook-v1')) localStorage.setItem('my-notebook-v1', JSON.stringify(d)); } catch {} }, db);
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e));
  page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR_FAILED|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  page.on('popup', (p) => p.close().catch(() => {}));
  await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree'));
  await sleep(900);
  return { ctx, page, errors };
}
const noErr = (d, tag) => check(d.errors.length === 0, `${tag} no page errors`, d.errors.slice(0, 2).join(' · '));
const tag = (id, vp) => `${id} (${vp.name})`;
const tap = async (d, vp, loc) => { if (vp.touch) await loc.tap(); else await loc.click(); };
const rowSel = (iid) => `#jeb-panel .jeb-it[data-iid="${iid}"]`;
const openP = async (d, pid) => { await d.page.evaluate((p) => { jebClosePanel && jebClosePanel(); jebOpenPanel(p); }, pid); await sleep(600); };
const setTitle = async (d, vp, iid, text) => {
  await tap(d, vp, d.page.locator(rowSel(iid) + ' .jeb-ttl-b'));
  await d.page.waitForSelector('#jt-tm'); await d.page.fill('#jt-tm', text); await d.page.press('#jt-tm', 'Enter'); await sleep(500);
};
const dbItem = (d, iid) => d.page.evaluate((i) => JSON.parse(JSON.stringify(DB.jeb.find((x) => x.id === i) || null)), iid);

try {
  /* ══ 85a — the button everywhere ══ */
  if (want('85a')) for (const vp of VPS) {
    const d = await open(vp, seed()), t = tag('85a', vp);
    try {
      for (const [pid, iid] of [['P', 'p1'], ['L', 'l1'], ['T', 't1'], ['I', 'i1'], ['S', 's1']]) {
        await openP(d, pid);
        const m = await d.page.evaluate((r) => { const b = document.querySelector(r + ' .jeb-ttl-b'); if (!b) return null; const q = b.getBoundingClientRect(), n = document.querySelector(r + ' .jeb-note-b').getBoundingClientRect(); return { h: q.height, w: q.width, text: b.textContent, sameRow: Math.abs(q.top - n.top) < q.height }; }, rowSel(iid));
        check(!!m && /Title/.test(m.text), `${t} pocket ${pid}: the row has a "✎ Title" button`, JSON.stringify(m));
        if (vp.name === '390') check(!!m && m.h >= 44 && m.w >= 44, `${t} pocket ${pid}: the button is a >= 44 px target (${m && Math.round(m.w)} x ${m && Math.round(m.h)})`);
      }
      await openP(d, 'P');
      await tap(d, vp, d.page.locator(rowSel('p1') + ' .jeb-more')); await sleep(400);
      check(await d.page.evaluate(() => document.body.innerText.includes('✎ Title…')), `${t} the ⋯ menu has "✎ Title…"`);
      await d.page.keyboard.press('Escape');
      await d.page.evaluate(() => { jebClosePanel(); jebOpenDeck({ ids: ['P'], all: false }); }); await sleep(600);
      check(await d.page.evaluate(() => !!document.querySelector('#jeb-deck .jeb-card[data-iid="p1"] .jeb-ttl-b')), `${t} a deck card has the title button`);
      await d.page.evaluate(() => { jebCloseDeck(); jebOpenPanelSel({ ids: [], all: true }); }); await sleep(600);
      check(await d.page.evaluate(() => document.querySelectorAll('#jeb-panel .jeb-it .jeb-ttl-b').length >= 6), `${t} All pockets: every row has the title button`);
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }

  /* ══ 85b / 85c — set, show, edit text, clear ══ */
  if (want('85b') || want('85c')) for (const vp of VPS) {
    const d = await open(vp, seed()), t = tag('85b', vp), t2 = tag('85c', vp);
    try {
      await openP(d, 'P');
      const before = await d.page.evaluate((r) => document.querySelector(r).outerHTML, rowSel('p2'));
      await tap(d, vp, d.page.locator(rowSel('p2') + ' .jeb-ttl-b'));
      await d.page.waitForSelector('#jt-tm');
      await d.page.fill('#jt-tm', 'Should not be saved'); await d.page.press('#jt-tm', 'Escape'); await sleep(400);
      let it = await dbItem(d, 'p2');
      check(!('title' in it) && !(await d.page.evaluate(() => document.getElementById('ov').classList.contains('on'))), `${t} Escape closes the dialog and saves nothing`, JSON.stringify(it));
      await setTitle(d, vp, 'p2', '  A saved   title ');
      it = await dbItem(d, 'p2');
      check(it.title === 'A saved title', `${t} DB has the trimmed title`, JSON.stringify(it.title));
      const m = await d.page.evaluate((r) => {
        const row = document.querySelector(r), ttl = row.querySelector('.jeb-ttl'), tx = row.querySelector('.jeb-tx'), a = tx && tx.querySelector('a.jeb-lnk');
        const cs = (e) => e && getComputedStyle(e);
        return { ttl: ttl && ttl.textContent, w: ttl && +cs(ttl).fontWeight, fs: [ttl && parseFloat(cs(ttl).fontSize), tx && parseFloat(cs(tx).fontSize)], nowrap: tx && cs(tx).whiteSpace, ell: tx && cs(tx).textOverflow, th: tx && tx.getBoundingClientRect().height, link: a && a.getAttribute('href'), target: a && a.target, over: row.scrollWidth <= row.clientWidth + 1, order: ttl && tx && ttl.getBoundingClientRect().bottom <= tx.getBoundingClientRect().top + 1 };
      }, rowSel('p2'));
      check(m.ttl === 'A saved title' && m.w >= 600, `${t} the row shows the title in bold`, JSON.stringify(m));
      check(m.fs[1] < m.fs[0] && m.nowrap === 'nowrap' && m.ell === 'ellipsis' && m.th < 30 && m.order, `${t} the link is small, on one line, ellipsised, under the title`, JSON.stringify(m));
      check(m.link === URL1 && m.target === '_blank', `${t} the address is still a tappable a.jeb-lnk (new tab)`, JSON.stringify(m));
      check(m.over, `${t} the row does not overflow`);
      /* a tap on the small text (not on the link) edits the text */
      await d.page.locator(rowSel('p2') + ' .jeb-tx').click({ position: { x: 1, y: 3 }, force: true }).catch(() => {});
      await sleep(300);
      check(await d.page.evaluate(() => !!document.querySelector('#jeb-panel .jeb-edit') && document.querySelector('#jeb-panel .jeb-edit').value.startsWith('https://x.com')), `${t} tapping the rest of the line edits the TEXT`);
      await d.page.keyboard.press('Escape'); await sleep(300);
      /* clear */
      await tap(d, vp, d.page.locator(rowSel('p2') + ' .jeb-ttl-b'));
      await d.page.waitForSelector('#jt-tm');
      check(await d.page.evaluate(() => document.getElementById('jt-tm').value) === 'A saved title', `${t2} the dialog starts with the current title`);
      await tap(d, vp, d.page.locator('#jt-tm-c')); await sleep(500);
      it = await dbItem(d, 'p2');
      check(!('title' in it), `${t2} Clear removes the key (absent, not "")`, JSON.stringify(it));
      const after = await d.page.evaluate((r) => document.querySelector(r).outerHTML, rowSel('p2'));
      check(after === before, `${t2} the row is byte-identical to before the title was set`);
      /* a whitespace-only title is also absent */
      await setTitle(d, vp, 'p2', '   ');
      check(!('title' in (await dbItem(d, 'p2'))), `${t2} a blank title leaves the key absent`);
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }

  /* ══ 85d — no title: the same HTML as v05.24 ══ */
  if (want('85d')) for (const vp of VPS) {
    const d = await open(vp, seed()), b = await open(vp, seed(), srvBase.base), t = tag('85d', vp);
    try {
      const btn = '<button class="jeb-ttl-b" title="Give this item a title">✎ Title</button>';
      for (const pid of ['P', 'L', 'T', 'I', 'S']) {
        await openP(d, pid); await openP(b, pid);
        const [x, y] = await Promise.all([d, b].map((q) => q.page.evaluate(() => document.querySelector('#jeb-panel .jeb-list').innerHTML)));
        check(x.split(btn).join('') === y, `${t} pocket ${pid}: the panel list is v05.24's, apart from the new button`, x.split(btn).join('') === y ? '' : x.slice(0, 160));
      }
      for (const q of [d, b]) await q.page.evaluate(() => { jebClosePanel(); jebOpenDeck({ ids: ['P', 'L'], all: false }); });
      await sleep(600);
      let [x, y] = await Promise.all([d, b].map((q) => q.page.evaluate(() => document.querySelector('#jeb-deck .jd-wrap').innerHTML)));
      const nj = (s) => s.replace(/ data-jump="[^"]*"/g, '');   /* where the card flies out from: a measured position, not markup */
      const xs = nj(x.split('<button class="jeb-ttl-b" aria-label="Title" title="Give this item a title">✎</button>').join('')); y = nj(y);
      let k = 0; while (k < xs.length && xs[k] === y[k]) k++;
      check(xs === y, `${t} the deck cards are v05.24's, apart from the new button`, xs === y ? '' : `differs at ${k}: new …${xs.slice(k - 30, k + 60)}… old …${y.slice(k - 30, k + 60)}…`);
    } finally { await d.ctx.close(); await b.ctx.close(); }
  }

  /* ══ 85e — Links: the title wins over ttl ══ */
  if (want('85e')) for (const vp of VPS) {
    const d = await open(vp, seed()), t = tag('85e', vp);
    try {
      await openP(d, 'L');
      check(await d.page.evaluate((r) => document.querySelector(r + ' .jeb-tx').textContent, rowSel('l1')) === 'Fetched YouTube Title', `${t} without a title the fetched title shows`);
      await setTitle(d, vp, 'l1', 'My own name');
      const m = await d.page.evaluate((r) => { const row = document.querySelector(r); return { ttl: row.querySelector('.jeb-ttl') && row.querySelector('.jeb-ttl').textContent, all: row.textContent, a: !!row.querySelector('.jeb-tx a.jeb-lnk') }; }, rowSel('l1'));
      check(m.ttl === 'My own name' && !m.all.includes('Fetched YouTube Title') && m.a, `${t} the title replaces the fetched one on screen; the link stays a link`, JSON.stringify(m));
      const it = await dbItem(d, 'l1');
      check(it.ttl === 'Fetched YouTube Title' && it.title === 'My own name', `${t} ttl is untouched in DB`, JSON.stringify(it));
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }

  /* ══ 85f — → Note ══ */
  if (want('85f')) for (const vp of VPS) {
    const d = await open(vp, seed()), t = tag('85f', vp);
    try {
      const r = await d.page.evaluate(() => {
        jebEditItem('p2', { title: 'Note title from item' }); jebEditItem('l1', { title: 'Link note title' }); jebEditItem('s1', { title: 'Milk run', qty: '2' });
        const out = {}; for (const id of ['p2', 'l1', 's1']) { const n0 = DB.articles.length; jebToNote(id); const n = DB.articles[DB.articles.length - 1]; out[id] = { added: DB.articles.length - n0, title: n.title, content: n.content }; }
        return out;
      });
      check(r.p2.added === 1 && r.p2.title === 'Note title from item' && r.p2.content.includes('https://x.com'), `${t} → Note: a plain item's note has its title, the text in the body`, JSON.stringify(r.p2));
      check(r.l1.title === 'Link note title' && r.l1.content.includes('Link note title') && r.l1.content.includes('href'), `${t} → Note: a Links item's note has the owner's title`, JSON.stringify(r.l1));
      check(r.s1.title === 'Milk run', `${t} → Note: a Shopping item's title is not prefixed with the quantity`, JSON.stringify(r.s1));
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }

  /* ══ 85g — two devices ══ */
  if (want('85g')) {
    const vp = D1440, d = await open(vp, seed()), t = tag('85g', vp);
    try {
      const r = await d.page.evaluate(() => {
        const cl = (x) => JSON.parse(JSON.stringify(x)), get = (db) => (db.jeb.find((i) => i.id === 'p2') || {});
        const B0 = cl(DB); jebEditItem('p2', { title: 'From A' }); const A1 = cl(DB);
        const MB = mergeDB(cl(B0), cl(A1)), MA = mergeDB(cl(A1), cl(B0));
        const out = { bGets: get(MB).title, aKeeps: get(MA).title };
        const B2 = cl(MB), it = get(B2); delete it.title; it.updatedAt = new Date(Date.now() + 5000).toISOString();
        const MA2 = mergeDB(cl(A1), cl(B2)), MB2 = mergeDB(cl(B2), cl(A1));
        out.aCleared = 'title' in get(MA2); out.bCleared = 'title' in get(MB2);
        return out;
      });
      check(r.bGets === 'From A' && r.aKeeps === 'From A', `${t} a title set on A arrives on B (both merge directions)`, JSON.stringify(r));
      check(r.aCleared === false && r.bCleared === false, `${t} set on A, cleared on B later -> cleared on both`, JSON.stringify(r));
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }

  /* ══ 85h — deck, All pockets, 360 ══ */
  if (want('85h')) for (const vp of VPS) {
    const d = await open(vp, seed()), t = tag('85h', vp);
    try {
      await d.page.evaluate(() => { jebEditItem('p2', { title: 'Shown everywhere' }); jebEditItem('p1', { title: 'Hanging' }); jebEditItem('l1', { title: 'Shown on a link' }); jebEditItem('t1', { title: 'Task title' }); });
      await d.page.evaluate(() => jebOpenDeck({ ids: ['P', 'L'], all: false })); await sleep(700);
      const dk = await d.page.evaluate(() => ['p2', 'l1'].map((i) => { const c = document.querySelector('#jeb-deck .jeb-card[data-iid="' + i + '"]'); return c && c.querySelector('.jeb-ttl') && c.querySelector('.jeb-ttl').textContent; }));
      check(dk[0] === 'Shown everywhere' && dk[1] === 'Shown on a link', `${t} the deck cards show the title`, JSON.stringify(dk));
      await tap(d, vp, d.page.locator('#jeb-deck .jeb-card[data-iid="p1"] .jeb-ttl-b')); await d.page.waitForSelector('#jt-tm');
      check(await d.page.evaluate(() => document.getElementById('jt-tm').value) === 'Hanging', `${t} the deck card's ✎ opens the dialog with its title`);
      const box = await d.page.evaluate(() => { const r = document.getElementById('mb').getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, vw: innerWidth, vh: innerHeight }; });
      check(box.l >= 0 && box.r <= box.vw && box.t >= 0 && box.b <= box.vh + 1, `${t} the dialog is on the screen`, JSON.stringify(box));
      await d.page.press('#jt-tm', 'Escape'); await sleep(300);
      await d.page.evaluate(() => { jebCloseDeck(); jebOpenPanelSel({ ids: [], all: true }); }); await sleep(700);
      const al = await d.page.evaluate(() => [...document.querySelectorAll('#jeb-panel .jeb-ttl')].map((e) => e.textContent).sort());
      check(['Hanging', 'Shown everywhere', 'Shown on a link', 'Task title'].every((x) => al.includes(x)), `${t} All pockets shows the titles`, JSON.stringify(al));
      if (vp.name === '390') {
        await d.page.setViewportSize({ width: 360, height: 800 }); await sleep(500);
        const ov = await d.page.evaluate(() => { const p = document.getElementById('jeb-panel'), bad = [...p.querySelectorAll('.jeb-it,.jeb-body')].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.className); return { p: p.scrollWidth <= p.clientWidth, bad }; });
        check(ov.p && ov.bad.length === 0, `${t} at 360 nothing overflows (scrollWidth <= clientWidth)`, JSON.stringify(ov));
      }
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }
} catch (e) {
  console.log(' FAIL  zab-z9 threw: ' + (e && e.stack || e));
  results.push({ ok: false, label: 'threw' });
} finally {
  await browser.close();
  await srv.close();
  await srvBase.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
