#!/usr/bin/env node
/* tools/f2.mjs — v05.29, F2: three small fixes found by the A1 audit (PCF J43, J44). Checks 89a–89d.

   89a  j43   "(01) New Notes": the sidebar, Pane 2 header and the path chip show it; a stored name that is exactly the old default
              "(01) New Articles" shows the new default and DB is unchanged (deep-equal, nothing persisted); "My new" shows as stored
   89b  j44a  🧰 → Storage & Backup (real clicks) opens a window titled "Storage & Backup"; the source says "Backup & Restore" nowhere
   89c  j44b  phone pop-up: a 12-character folder name is not cut (scrollWidth <= clientWidth); at 360 a 60-character name ends in an
              ellipsis and the window does not overflow; tablet and laptop: the tag's max-width is still the old 32%
   89d  no page errors in any of the above

   `--only=89a,89c` runs just those; `--unpatched` serves the build before this round (the parent of the "v05.29 F2: version bump"
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
  const dir = mkdtempSync(join(tmpdir(), 'f2-base-'));
  const sha = execFileSync('git', ['log', '--format=%H', '-n', '1', '--grep=v05.29 F2: version bump'], { encoding: 'utf8' }).trim();
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', `${sha}~1:${f}`], { encoding: 'buffer', maxBuffer: 1 << 28 })); } catch {} }
  return dir;
}
const pw = await playwright();
const srv = await serve(argv.includes('--unpatched') ? makeBase() : undefined);
const browser = await pw.chromium.launch();

function seed(folderName) {
  const db = seedDB(T0);
  if (folderName) db.folders.find((f) => f.id === 'f1').name = folderName;
  return db;
}
async function open(vp, db, w) {
  const ctx = await browser.newContext(vp.touch ? { viewport: { width: w || vp.w, height: vp.h }, hasTouch: true, isMobile: true } : { viewport: { width: vp.w, height: vp.h } });
  for (const p of ['**googleapis.com/**', '**gstatic.com/**', '**firebaseapp.com/**', '**firebaseio.com/**']) await ctx.route(p, (r) => r.abort());
  await ctx.addInitScript((d) => { try { if (!localStorage.getItem('my-notebook-v1')) localStorage.setItem('my-notebook-v1', JSON.stringify(d)); } catch {} }, db);
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e));
  page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR_FAILED/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(srv.base + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree'));
  await sleep(900);
  return { ctx, page, errors, vp };
}
const noErr = (d, tag) => check(d.errors.length === 0, `${tag} no page errors`, d.errors.slice(0, 2).join(' · '));
const tag = (id, vp) => `${id} (${vp.name})`;
const hit = async (d, loc) => { const l = typeof loc === 'string' ? d.page.locator(loc).first() : loc; await l.waitFor({ state: 'visible', timeout: 5000 }); await (d.vp.touch ? l.tap() : l.click()); await sleep(500); };

try {
  /* ══ 89a — j43: the Smart View's name ══ */
  if (want('89a')) for (const vp of VPS) {
    const d = await open(vp, seed()), t = tag('89a', vp);
    try {
      /* what each surface shows for a given stored name; sf-recent is selected so the path chip for sf-new is drawn */
      const probe = (stored) => d.page.evaluate((st) => {
        if (st === null) delete DB.sfItems; else DB.sfItems = { 'sf-new': { name: st, updatedAt: '2026-10-01T00:00:00.000Z' } };
        ST.sfOpen = true; /* the sidebar draws the Smart Views rows only while the group is open (UI state, not DB) */
        const before = JSON.stringify(DB);
        render();
        const sb = document.getElementById('sb').textContent;
        selFolder('sf-recent');
        const chip = document.getElementById('p2').innerText;
        selFolder('sf-new');
        const head = document.getElementById('p2').innerText.split('\n').slice(0, 6).join(' ');
        const after = JSON.stringify(DB);
        return { sb, chip, head, same: before === after };
      }, stored);
      const a = await probe(null);
      check(a.sb.includes('(01) New Notes') && !a.sb.includes('New Articles'), `${t} the sidebar says "(01) New Notes"`);
      check(a.chip.includes('(01) New Notes') && !a.chip.includes('New Articles'), `${t} the path chip says "(01) New Notes"`);
      check(a.head.includes('(01) New Notes'), `${t} Pane 2's header says "(01) New Notes"`, a.head);
      const b = await probe('(01) New Articles');
      check(b.sb.includes('(01) New Notes') && !b.sb.includes('New Articles') && b.chip.includes('(01) New Notes') && b.head.includes('(01) New Notes'), `${t} a stored "(01) New Articles" shows "(01) New Notes" in the sidebar, chip and header`);
      check(b.same, `${t} reading it changes nothing in DB`);
      const c = await probe('My new');
      check(c.sb.includes('My new') && c.chip.includes('My new') && c.head.includes('My new') && !c.sb.includes('(01) New Notes'), `${t} a name the owner typed ("My new") shows exactly as stored`, JSON.stringify([c.sb.includes('My new'), c.chip.includes('My new'), c.head]));
      const rn = await d.page.evaluate(() => { DB.sfItems = { 'sf-new': { name: '(01) New Articles', updatedAt: '2026-10-01T00:00:00.000Z' } }; renameSfItem('sf-new'); const v = document.getElementById('sf-ren-inp').value; closeModal(); return v; });
      check(rn === '(01) New Notes', `${t} the rename dialog starts at "(01) New Notes"`, rn);
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }

  /* ══ 89b — j44a: the Backup window's title ══ */
  if (want('89b')) for (const vp of VPS) {
    const d = await open(vp, seed()), t = tag('89b', vp);
    try {
      await hit(d, '#sb-menu-btn');
      const item = await d.page.evaluate(() => [...document.querySelectorAll('#sb-menu .sb-mi')].map((e) => e.textContent.trim()).find((x) => /Storage/.test(x)));
      await hit(d, d.page.locator('#sb-menu').locator('text=Storage & Backup').first());
      const title = await d.page.evaluate(() => (document.querySelector('#mb .mt') || document.querySelector('.mt') || {}).textContent || '');
      check(/Storage & Backup/.test(item || '') && title.trim() === item, `${t} 🧰 → "${item}" opens a window titled "${title.trim()}" (the same words)`);
      if (vp.name === '390') {
        const src = await d.page.evaluate(() => fetch('/').then((r) => r.text()));
        check(!/Backup &(amp;)? Restore/.test(src), `${t} no "Backup & Restore" is left in the app's source`);
        check(/restore it from 🧰 → 💽 Storage & Backup/.test(src), `${t} the message that sends the owner to the recovery copy names "Storage & Backup"`);
      }
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }

  /* ══ 89c — j44b: the folder tag in a pop-up note window ══ */
  if (want('89c')) {
    const run = async (vp, w, name, expect) => {
      const d = await open(vp, seed(name), w), t = tag('89c', { name: String(w || vp.name) });
      try {
        await d.page.evaluate(() => popOutNote('a1')); await sleep(1000);
        const m = await d.page.evaluate(() => {
          const f = document.querySelector('.float-win .pop-details-line .ftag'), win = document.querySelector('.float-win');
          if (!f) return null;
          return { sw: f.scrollWidth, cw: f.clientWidth, mw: getComputedStyle(f).maxWidth, text: f.textContent, wsw: win.scrollWidth, wcw: win.clientWidth, wr: win.getBoundingClientRect().right, vw: innerWidth };
        });
        if (!m) { check(false, `${t} the pop-up shows a folder tag`); return; }
        if (expect === 'whole') check(m.sw <= m.cw, `${t} "${name}" is not cut: scrollWidth ${m.sw} <= clientWidth ${m.cw}`, JSON.stringify(m));
        else if (expect === 'ellipsis') {
          check(m.sw > m.cw, `${t} a ${name.length}-character name is still cut with an ellipsis (${m.sw} > ${m.cw})`, JSON.stringify(m));
          check(m.wsw <= m.wcw + 1 && m.wr <= m.vw + 1, `${t} the window does not overflow`, JSON.stringify(m));
        } else check(m.mw !== '100%', `${t} unchanged here: the tag's max-width is ${m.mw} (not 100%)`);
        noErr(d, t);
      } finally { await d.ctx.close(); }
    };
    await run(P390, 0, '(001) Ahkam', 'whole');
    await run(P390, 360, 'An extremely long folder name that cannot possibly fit on a phone row', 'ellipsis');
    await run(T820, 0, '(001) Ahkam', 'unchanged');
    await run(D1440, 0, '(001) Ahkam', 'unchanged');
  }
} catch (e) {
  console.log(' FAIL  f2 threw: ' + (e && e.stack || e));
  results.push({ ok: false, label: 'threw' });
} finally {
  await browser.close();
  await srv.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
