#!/usr/bin/env node
/* tools/audit-a1.mjs — v05.28, A1: the audit's fixes (PCF J13). Checks 88a–88f, at 390 / 820 / 1440, every surface opened by real clicks.
   (tools/audit-explore.mjs is the crawler that found them; it is not a check.)

   88a  enxw   🧰 → 📥 Evernote import: the first screen and the result screen no longer say "dry run" / "next update" (the import has
               been in the app since v05.20); they say nothing is added until "Bring them in"
   88b  sbcon  the 🧰 menu: "💾 Save File", "● Unsaved to file" and "✓ File saved" read at 4.5:1 or more on the menu's white (were 2.7–2.9)
   88c  dlgb   phone: the buttons of the dialogs (New Section, Cloud Sync, Storage & Backup) are >= 44 px high; tablet and laptop keep their size
   88d  calh   📅 My Calendar: the header's title and all five layer buttons are inside the header, and the header inside the screen; phone = two rows, tablet/laptop = one row
   88e  artw   the word "article" is gone from what the owner sees: the title field while editing, an empty folder, the menus' source strings
   88f  no page errors

   `--only=88a,88d` runs just those; `--unpatched` serves the build before this round (the parent of the "v05.28 A1: version bump" commit).
   Each ok/FAIL line becomes one app-check check. */
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
  const dir = mkdtempSync(join(tmpdir(), 'a1-base-'));
  const sha = execFileSync('git', ['log', '--format=%H', '-n', '1', '--grep=v05.28 A1: version bump'], { encoding: 'utf8' }).trim();
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', `${sha}~1:${f}`], { encoding: 'buffer', maxBuffer: 1 << 28 })); } catch {} }
  return dir;
}
const pw = await playwright();
const srv = await serve(argv.includes('--unpatched') ? makeBase() : undefined);
const browser = await pw.chromium.launch();

function seed() {
  const db = seedDB(T0);
  db.folders.push({ id: 'f3', name: '(003) Empty Folder', parentId: null, order: 3, sectionId: 'sec-1', updatedAt: T0 });
  return db;
}
async function open(vp) {
  const ctx = await browser.newContext(vp.touch ? { viewport: { width: vp.w, height: vp.h }, hasTouch: true, isMobile: true } : { viewport: { width: vp.w, height: vp.h } });
  for (const p of ['**googleapis.com/**', '**gstatic.com/**', '**firebaseapp.com/**', '**firebaseio.com/**']) await ctx.route(p, (r) => r.abort());
  await ctx.addInitScript((d) => { try { if (!localStorage.getItem('my-notebook-v1')) localStorage.setItem('my-notebook-v1', JSON.stringify(d)); } catch {} }, seed());
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e));
  page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR_FAILED/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(srv.base + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree'));
  await sleep(900);
  return { ctx, page, errors, vp };
}
const tag = (id, vp) => `${id} (${vp.name})`;
/* a real tap on a phone / tablet, a real click on the laptop */
const hit = async (d, loc) => { const l = typeof loc === 'string' ? d.page.locator(loc).first() : loc; await l.waitFor({ state: 'visible', timeout: 5000 }); await (d.vp.touch ? l.tap() : l.click()); await sleep(500); };
const tools = async (d, label) => { await hit(d, '#sb-tools-btn'); await hit(d, d.page.locator('#sb-tools').locator(`text=${label}`).first()); };
const menu = async (d, label) => { await hit(d, '#sb-menu-btn'); await hit(d, d.page.locator('#sb-menu').locator(`text=${label}`).first()); };
const contrastOf = (page, sel) => page.evaluate((s) => {
  const e = document.querySelector(s); if (!e) return null;
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); const p = m[1].split(',').map(parseFloat); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
  const layers = []; for (let p = e; p; p = p.parentElement) { const c = parse(getComputedStyle(p).backgroundColor); if (c[3] > 0) { layers.push(c); if (c[3] >= 1) break; } }
  let b = [255, 255, 255]; for (let i = layers.length - 1; i >= 0; i--) { const c = layers[i], a = c[3]; b = [c[0] * a + b[0] * (1 - a), c[1] * a + b[1] * (1 - a), c[2] * a + b[2] * (1 - a)]; }
  const fg = parse(getComputedStyle(e).color), a = fg[3], f = [fg[0] * a + b[0] * (1 - a), fg[1] * a + b[1] * (1 - a), fg[2] * a + b[2] * (1 - a)];
  const L1 = lum(f), L2 = lum(b); return (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
}, sel);

const errorsAll = [];
const ENEX = '<?xml version="1.0" encoding="UTF-8"?><en-export><note><title>One</title><created>20260101T000000Z</created><updated>20260101T000000Z</updated>'
  + '<content><![CDATA[<?xml version="1.0"?><en-note><div>hello</div></en-note>]]></content></note></en-export>';

try {
  /* ══ 88a — the Evernote dialog's words ══ */
  if (want('88a')) for (const vp of VPS) {
    const d = await open(vp), t = tag('88a', vp);
    try {
      await tools(d, 'Evernote');
      const first = await d.page.evaluate(() => document.getElementById('enx-box').innerText);
      check(!/dry run/i.test(first) && !/nothing is added to your notebook\./i.test(first), `${t} the first screen does not call itself a dry run`, first.replace(/\s+/g, ' ').slice(0, 160));
      check(/nothing is added until you tap .Bring them in./i.test(first), `${t} it says nothing is added until "Bring them in"`);
      await d.page.setInputFiles('#enx-files', { name: 'one.enex', mimeType: 'text/xml', buffer: Buffer.from(ENEX) });
      await d.page.waitForSelector('#enx-dry', { timeout: 15000 });
      const dry = await d.page.evaluate(() => document.getElementById('enx-dry').innerText);
      check(!/next update/i.test(dry) && /nothing has been added to your notebook yet/i.test(dry) && /Bring them in/.test(dry), `${t} the result screen's last line is true now: "${dry}"`);
      errorsAll.push(...d.errors);
    } finally { await d.ctx.close(); }
  }

  /* ══ 88b — contrast in the 🧰 menu ══ */
  if (want('88b')) for (const vp of VPS) {
    const d = await open(vp), t = tag('88b', vp);
    try {
      await hit(d, '#sb-tools-btn');
      for (const [cls, label] of [['save-lbl busy', 'Unsaved to file'], ['save-lbl ok', 'File saved']]) {
        await d.page.evaluate(([c, l]) => { const e = document.getElementById('save-lbl'); e.className = c; e.textContent = l; }, [cls, label]);
        const c = await contrastOf(d.page, '#save-lbl');
        check(c !== null && c >= 4.5, `${t} "${label}" in the menu reads at ${c && c.toFixed(2)}:1 (needs 4.5)`);
      }
      const c2 = await contrastOf(d.page, '#export-btn');
      check(c2 !== null && c2 >= 4.5, `${t} "💾 Save File" in the menu reads at ${c2 && c2.toFixed(2)}:1 (needs 4.5)`);
      errorsAll.push(...d.errors);
    } finally { await d.ctx.close(); }
  }

  /* ══ 88c — dialog buttons ══ */
  if (want('88c')) for (const vp of VPS) {
    const d = await open(vp), t = tag('88c', vp);
    try {
      const hs = async (sel) => d.page.evaluate((s) => [...document.querySelectorAll(s)].filter((b) => b.offsetParent !== null).map((b) => ({ t: b.innerText.trim().slice(0, 24), h: Math.round(b.getBoundingClientRect().height) })), sel);
      await tools(d, 'New Section');
      let b = await hs('#mb .btn');
      check(b.length >= 2 && (vp.name === '390' ? b.every((x) => x.h >= 44) : b.every((x) => x.h < 44)), `${t} New Section: ${b.map((x) => x.t + ' ' + x.h).join(', ')} (${vp.name === '390' ? '>= 44' : 'unchanged, < 44'})`);
      await d.page.evaluate(() => closeModal()); await sleep(300);
      await menu(d, 'Cloud Sync');
      b = await hs('#sync-mb .btn');
      check(b.length >= 2 && (vp.name === '390' ? b.every((x) => x.h >= 44) : b.every((x) => x.h < 44)), `${t} Cloud Sync: ${b.map((x) => x.t + ' ' + x.h).join(', ')}`);
      await d.page.evaluate(() => closeSyncModal()); await sleep(300);
      await menu(d, 'Storage');
      b = await hs('#mb .btn');
      check(b.length >= 3 && (vp.name === '390' ? b.every((x) => x.h >= 44) : b.every((x) => x.h < 44)), `${t} Storage & Backup: ${b.map((x) => x.t + ' ' + x.h).join(', ')}`);
      const ov = await d.page.evaluate(() => { const m = document.getElementById('mb'); return m ? m.scrollWidth <= m.clientWidth + 1 : true; });
      check(ov, `${t} the dialog does not overflow sideways`);
      errorsAll.push(...d.errors);
    } finally { await d.ctx.close(); }
  }

  /* ══ 88d — the calendar's header ══ */
  if (want('88d')) for (const vp of VPS) {
    const d = await open(vp), t = tag('88d', vp);
    try {
      await hit(d, '.sec-hd.db-hd-sec');
      await hit(d, d.page.locator('.tr-row', { hasText: 'My Calendar' }).first());
      await sleep(600);
      const m = await d.page.evaluate(() => {
        const h = document.getElementById('p3h'); if (!h || !h.querySelector('.cal-layers')) return null;
        const vw = innerWidth, R = (e) => e.getBoundingClientRect();
        const btns = [...h.querySelectorAll('.cal-layer-btn')].map((b) => R(b));
        const title = h.querySelector(':scope > span');
        return { vw, h: R(h).height, n: btns.length, inside: btns.every((r) => r.left >= R(h).left - 1 && r.right <= R(h).right + 1) && R(h).width <= vw + 1, titleW: title ? R(title).width : 0, titleTxt: title ? title.innerText.trim() : '', };
      });
      check(m !== null && m.n === 5 && m.inside, `${t} all five layer buttons are inside the screen`, JSON.stringify(m));
      check(m !== null && m.titleW >= 80 && /\d{4}/.test(m.titleTxt), `${t} the month title is visible (${m && Math.round(m.titleW)} px wide: "${m && m.titleTxt.replace(/\s+/g, ' ')}")`);
      if (vp.name === '390') check(m !== null && m.h > 70 && m.h < 130, `${t} the header is two rows on a phone (${m && Math.round(m.h)} px)`);
      else check(m !== null && m.h < 70, `${t} the header stays one row (${m && Math.round(m.h)} px)`);
      errorsAll.push(...d.errors);
    } finally { await d.ctx.close(); }
  }

  /* ══ 88e — "article" is not the owner's word ══ */
  if (want('88e')) for (const vp of VPS) {
    const d = await open(vp), t = tag('88e', vp);
    try {
      const src = (await d.page.evaluate(() => [...document.scripts].map((s) => s.text).join('\n') + document.body.innerHTML)).replace(/\/\*[\s\S]*?\*\//g, '');
      const OLD = ['Add article', 'No articles', 'Article title', 'New article', 'Rename article', 'Back to article list', 'An article must', 'all articles?', 'editing articles', 'Article list', 'Article body', '>Articles ('];
      const found = OLD.filter((w) => src.includes(w));
      check(found.length === 0, `${t} none of ${OLD.length} on-screen phrases still says "article"`, found.join(' | '));
      /* an empty folder, reached by a real click on the tree */
      const row = d.page.locator('.tr-row', { hasText: '(003) Empty Folder' }).first();
      if (!(await row.isVisible())) await hit(d, d.page.locator('.sec-hd', { hasText: 'MY NOTEBOOKS' }).first());
      await hit(d, row);
      const empty = await d.page.evaluate(() => document.body.innerText);
      check(/No notes yet/.test(empty) && /Add note/.test(empty) && !/No articles yet|Add article/.test(empty), `${t} the empty folder says "No notes yet" and offers "Add note"`);
      /* editing a note: the title field */
      await d.page.evaluate(() => { selArt('a1'); startEdit(); }); await sleep(900);
      const ph = await d.page.evaluate(() => (document.getElementById('ti') || {}).placeholder);
      check(ph === 'Note title…', `${t} the title field's hint while editing is "${ph}"`);
      errorsAll.push(...d.errors);
    } finally { await d.ctx.close(); }
  }

  /* ══ 88f — no page errors ══ */
  if (want('88f')) check(errorsAll.length === 0, '88f no page errors in any of the above', errorsAll.slice(0, 3).join(' | '));
} finally {
  await browser.close();
  srv.close?.();
}
const bad = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - bad}/${results.length} passed`);
process.exit(bad ? 1 : 0);
