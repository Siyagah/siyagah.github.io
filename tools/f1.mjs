#!/usr/bin/env node
/* tools/f1.mjs — v05.24, F1: small follow-ups (PCF J10). Checks 84a–84e. (Item 3, enxf1, is in block 80: tools/enex-s4b.mjs.)

   84a  fav14   the empty Favourites Smart View names the menu item exactly as the note menu shows it ("⭐ Favourite"); no text in the
                app says "Add to Favourites"
   84b  enxf2   🧰 → 📥 Evernote import: the hover text no longer says "dry run" / "nothing is added", and says it brings the notes in
   84c  t1f     phone (390): editing gives ✕ a row that is slimmer than before (<= 40 px; was 44) while the BUTTON stays >= 44 x 44 and is
                inside the screen; tablet (820) and laptop (1440): no such row (unchanged)
   84d  z8f1    the pockets inside a pocket: on every line the count's right edge is within 16 px of the line's right edge, at 390, 820
                and 1440, for a short and a long name, and "▸" comes before the count
   84e  no page errors in any of the above

   `--only=84a,84d` runs just those; `--unpatched` serves the build before this round (the parent of the "v05.24 — bump version"
   commit). Each ok/FAIL line becomes one app-check check. */
import { playwright, serve, seedDB } from './harness.mjs';
import { mkdtempSync, writeFileSync } from 'node:fs';
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
  const dir = mkdtempSync(join(tmpdir(), 'f1-base-'));
  const sha = execFileSync('git', ['log', '--format=%H', '-n', '1', '--grep=v05.24 — bump version'], { encoding: 'utf8' }).trim();
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', `${sha}~1:${f}`], { encoding: 'buffer', maxBuffer: 1 << 28 })); } catch {} }
  return dir;
}
const pw = await playwright();
const srv = await serve(argv.includes('--unpatched') ? makeBase() : undefined);
const browser = await pw.chromium.launch();

const pk = (id, i, extra = {}) => ({ id, name: id, icon: '✶', color: '#CFE8FF', order: i, createdAt: T0, updatedAt: T0, ...extra });
const mk = (id, pocketId, text, order) => ({ id, pocketId, text, done: false, folderIds: [], tags: [], kind: null, journal: false, order, createdAt: T0, updatedAt: T0 });
function seed() {
  const db = seedDB(T0);
  db.jebPockets = [pk('A', 0), pk('A1', 1, { parentId: 'A' }), { ...pk('A2', 2, { parentId: 'A' }), name: 'A pocket with quite a long name that has to be cut short' }, pk('A2a', 3, { parentId: 'A2' })];
  db.jeb = [mk('ia', 'A', 'in A', 0), mk('i11', 'A1', 'one', 0), mk('i12', 'A1', 'two', 1), mk('i21', 'A2', 'three', 0), mk('ia1', 'A2a', 'x', 0)];
  db.theme = Object.assign({}, db.theme, { zabPhoneLayout: 'bar' });
  return db;
}
async function open(vp, db) {
  const ctx = await browser.newContext(vp.touch ? { viewport: { width: vp.w, height: vp.h }, hasTouch: true, isMobile: true } : { viewport: { width: vp.w, height: vp.h } });
  for (const p of ['**googleapis.com/**', '**gstatic.com/**', '**firebaseapp.com/**', '**firebaseio.com/**']) await ctx.route(p, (r) => r.abort());
  await ctx.addInitScript((d) => { try { if (!localStorage.getItem('my-notebook-v1')) localStorage.setItem('my-notebook-v1', JSON.stringify(d)); } catch {} }, db);
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e));
  page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR_FAILED/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(srv.base + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree'));
  await sleep(900);
  return { ctx, page, errors };
}
const noErr = (d, tag) => check(d.errors.length === 0, `${tag} no page errors`, d.errors.slice(0, 2).join(' · '));
const tag = (id, vp) => `${id} (${vp.name})`;

try {
  /* ══ 84a — fav14: the Favourites wording ══ */
  if (want('84a')) for (const vp of VPS) {
    const d = await open(vp, seed()), t = tag('84a', vp);
    try {
      const r = await d.page.evaluate(() => {
        for (const a of DB.articles) a.favourite = false;
        selFolder('sf-favs');
        const txt = (document.getElementById('p2') || document.body).innerText;
        const src = [...document.scripts].map((s) => s.text).join('\n');
        return { txt, ctx: /art\.favourite\?'✅ In favourites':'⭐ Favourite'/.test(src), old: src.includes('Add to Favourites') || document.documentElement.innerHTML.includes('Add to Favourites') };
      });
      check(r.ctx, `${t} the note menu's item is "⭐ Favourite"`);
      check(/No favourites yet/.test(r.txt) && r.txt.includes('choose ⭐ Favourite'), `${t} the empty Favourites list says "choose ⭐ Favourite"`, r.txt.replace(/\s+/g, ' ').slice(0, 200));
      check(!r.old, `${t} no text in the app says "Add to Favourites"`);
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }

  /* ══ 84b — enxf2: the Evernote menu's hover text ══ */
  if (want('84b')) {
    const vp = D1440, d = await open(vp, seed()), t = tag('84b', vp);
    try {
      const ti = await d.page.evaluate(() => { const e = [...document.querySelectorAll('.sb-mi')].find((x) => /openEnexImport/.test(x.getAttribute('onclick') || '')); return e ? e.getAttribute('title') : null; });
      check(ti !== null && !/dry run|nothing is added/i.test(ti), `${t} the hover text no longer says "dry run" or "nothing is added"`, String(ti));
      check(ti !== null && /brings? the notes in/i.test(ti) && /reads/i.test(ti) && /shows what it found/i.test(ti), `${t} it says it reads the export, shows what it found, then brings the notes in`, String(ti));
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }

  /* ══ 84c — t1f: the phone's ✕ row while editing ══ */
  if (want('84c')) for (const vp of VPS) {
    const d = await open(vp, seed()), t = tag('84c', vp);
    try {
      await d.page.evaluate(() => { const a = DB.articles.find((x) => !x.archived && !x.deleted) || DB.articles[0]; selArt(a.id); startEdit(); });
      await sleep(900);
      const m = await d.page.evaluate(() => {
        const R = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right, w: r.width, h: r.height }; };
        const row = document.querySelector('.p3c-actrow'), btn = document.querySelector('.p3c-stop');
        return { editing: !!document.getElementById('ed'), row: R(row), btn: R(btn), title: R(document.getElementById('ti')), vw: innerWidth };
      });
      if (vp.name === '390') {
        check(m.editing && m.row && m.row.h <= 40, `${t} the ✕ row is slimmer: ${m.row && Math.round(m.row.h)} px (was 44; limit 40)`, JSON.stringify(m));
        check(m.btn && m.btn.w >= 44 && m.btn.h >= 44, `${t} the ✕ button is still a >= 44 x 44 touch target (${m.btn && Math.round(m.btn.w)} x ${m.btn && Math.round(m.btn.h)})`);
        check(m.btn && m.btn.r <= m.vw && m.btn.l >= 0 && m.btn.t >= 0, `${t} the ✕ button is on the screen`, JSON.stringify(m.btn));
        check(m.title && m.row && m.title.t >= m.row.b - 1, `${t} the title sits below the row`, JSON.stringify([m.row, m.title]));
        await d.page.locator('.p3c-stop').first().tap(); await sleep(500);
        check(await d.page.evaluate(() => !document.querySelector('.p3c-actrow') && !document.getElementById('ed')?.isContentEditable), `${t} tapping ✕ stops editing`);
      } else {
        check(m.editing && m.row === null, `${t} no phone row here (tablet and laptop unchanged)`, JSON.stringify(m.row));
      }
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }

  /* ══ 84d — z8f1: the count at the right end of every line ══ */
  if (want('84d')) for (const vp of VPS) {
    const d = await open(vp, seed()), t = tag('84d', vp);
    try {
      await d.page.evaluate(() => jebOpenPanel('A')); await sleep(700);
      const g = await d.page.evaluate(() => [...document.querySelectorAll('#jeb-panel .jx-kid')].map((k) => {
        const kr = k.getBoundingClientRect(), c = k.querySelector('.jeb-ct').getBoundingClientRect(), s = k.querySelector('.jx-in'), sr = s && s.getBoundingClientRect(), n = k.querySelector('.jx-nm').getBoundingClientRect();
        return { id: k.dataset.pid, gap: kr.right - c.right, arrowBeforeCount: s ? sr.right <= c.left + 1 : null, nameR: n.right, ctL: c.left, w: kr.width };
      }));
      check(g.length === 2, `${t} two lines are drawn (A1, A2)`, JSON.stringify(g));
      for (const l of g) check(l.gap <= 16, `${t} ${l.id}: the count's right edge is ${Math.round(l.gap * 10) / 10} px from the line's right edge (limit 16)`, JSON.stringify(l));
      check(g.every((l) => l.arrowBeforeCount !== false), `${t} "▸" comes before the count, both at the right end`, JSON.stringify(g));
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }
} catch (e) {
  console.log(' FAIL  f1 threw: ' + (e && e.stack || e));
  results.push({ ok: false, label: 'threw' });
} finally {
  await browser.close();
  await srv.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
