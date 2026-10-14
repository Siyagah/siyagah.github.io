#!/usr/bin/env node
/* tools/title-t1.mjs — v05.15, T1: on a phone the note's buttons sit on their own row and the title wraps in full (checks 75a–75f).

   75a  layout, EDIT mode, 360 and 390 touch, a 120-character title: ✕ and the Saved flash are on a row above the title and not in
        the title bar; the title is a <textarea> the full pane width, wraps onto several lines, nothing clipped, no sideways scroll
   75b  layout, READING mode (reached by a real tap on ✕), 360 and 390: the same title wraps in full, nothing clipped, no button in its bar
   75c  typing at 390: real typing, an inserted line break, Enter; the title never holds a line break, Enter puts the caret in the note's
        text, autosave stores the title and a reload reads it back
   75d  tablet and laptop (820, 1440, edit and reading) look exactly as before: the title bar's markup and box sizes equal v05.14's,
        which is served from a copy made out of git in the same run
   75e  pop-up windows on a phone (390): Multi and Single (reading and editing) show a 120-character title in full
   75f  contrast of what was restyled (title text, placeholder, Saved flash, ✕) on the five presets

   T1_ROOT=<dir> serves another build as the build under test (the unpatched run uses a copy of v05.14, so 75a/75b/75e must FAIL).
   `--only=75a,75c` runs just those. Each printed ok/FAIL line becomes one app-check check (block 75). */
import { playwright, seedDB, ROOT, BLOCKED } from './harness.mjs';
import { createServer } from 'node:http';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import { spawnSync } from 'node:child_process';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);
if (argv.includes('--fails')) { const o = console.log; let skip = false; console.log = (...x) => { const t = x.join(' '); if (/^\s+ok\s/.test(t)) { skip = true; return; } if (skip && /^\s{6,}\S/.test(t)) { skip = false; return; } skip = false; o(...x); }; }

const results = [];
const check = (ok, label, detail = '') => { results.push({ ok, label }); console.log((ok ? '  ok   ' : ' FAIL  ') + label + (detail ? '\n         ' + detail : '')); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const serveDir = (root) => new Promise((ok) => {
  const s = createServer(async (req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    try { const b = await readFile(join(root, p)); res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); res.end(b); } catch { res.writeHead(404); res.end('nf'); }
  });
  s.listen(0, '127.0.0.1', () => ok({ base: `http://127.0.0.1:${s.address().port}`, close: () => new Promise((d) => { s.closeAllConnections?.(); s.close(d); }) }));
});

const SRC = process.env.T1_ROOT || ROOT;
/* v05.14 = the commit this round started from */
const BASE_REV = process.env.T1_BASE || 'a6d6b4f';
const dir = await mkdtemp(join(tmpdir(), 't1-base-'));
const git = spawnSync('git', ['show', `${BASE_REV}:index.html`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
if (git.status !== 0) { console.log(' FAIL  could not read v05.14 from git: ' + git.stderr); process.exit(1); }
await writeFile(join(dir, 'index.html'), git.stdout);
const srvNew = await serveDir(SRC), srvOld = await serveDir(dir);
const pw = await playwright();
const browser = await pw.chromium.launch();

const LONG = 'The quick brown fox jumps over the lazy dog while a very long and winding title keeps going on and on until it is 120 chars';   /* 120 */
const T0 = new Date().toISOString();
const seed = () => { const db = seedDB(T0); db.articles[0].title = LONG; db.articles[0].content = '<p>Body of the first seeded note.</p>'; return db; };

async function open(base, w, h, touch = true) {
  const ctx = await browser.newContext(touch ? { viewport: { width: w, height: h }, hasTouch: true, isMobile: true } : { viewport: { width: w, height: h } });
  for (const p of BLOCKED) await ctx.route(p, (r) => r.abort());
  await ctx.addInitScript((d) => { try { if (!localStorage.getItem('my-notebook-v1')) localStorage.setItem('my-notebook-v1', JSON.stringify(d)); } catch {} }, seed());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree'));
  await sleep(400);
  return { ctx, page, errors };
}
const on = (d, fn, arg) => d.page.evaluate(fn, arg);
const toNote = async (d, edit) => { await on(d, (e) => { selArt('a1'); if (e) startEdit(); }, edit); await sleep(500); };

/* geometry of the title parts, in one object */
const geo = (d) => on(d, () => {
  const r = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
  const tb = document.querySelector('#p3c .p3c-titlebar'), ti = document.getElementById('ti'), tbt = document.querySelector('#p3c .tbt');
  const row = document.querySelector('#p3c .p3c-actrow');
  const stop = document.querySelector('#p3c .p3c-stop'), flash = document.getElementById('save-flash');
  return {
    tb: r(tb), ti: r(ti), tbt: r(tbt), row: r(row), stop: r(stop), flash: r(flash),
    tag: ti && ti.tagName, tiSH: ti && ti.scrollHeight, tiCH: ti && ti.clientHeight, tiSW: ti && ti.scrollWidth, tiCW: ti && ti.clientWidth,
    tbtSH: tbt && tbt.scrollHeight, tbtCH: tbt && tbt.clientHeight, tbtSW: tbt && tbt.scrollWidth, tbtCW: tbt && tbt.clientWidth,
    clamp: tbt && getComputedStyle(tbt).webkitLineClamp, tbtLH: tbt && parseFloat(getComputedStyle(tbt).lineHeight),
    btnsInBar: tb ? tb.querySelectorAll('button').length : -1,
    stopInBar: tb ? !!tb.querySelector('.p3c-stop') : false, flashInBar: tb ? !!tb.querySelector('#save-flash') : false,
    stops: document.querySelectorAll('#p3c .p3c-stop').length, flashes: document.querySelectorAll('#save-flash').length,
    pane: r(document.getElementById('p3c')), vw: innerWidth, docSW: document.documentElement.scrollWidth,
  };
});

try {
  /* ══ 75a — edit mode, 360 and 390 ══ */
  if (want('75a')) for (const w of [360, 390]) {
    const d = await open(srvNew.base, w, 800);
    try {
      await toNote(d, true);
      const g = await geo(d); const t = `75a@${w}`;
      check(g.tag === 'TEXTAREA', `${t} the title is a <textarea> (an input cannot wrap)`, String(g.tag));
      check(g.btnsInBar === 0 && !g.stopInBar && !g.flashInBar, `${t} no button and no Saved flash in the title bar (${g.btnsInBar} buttons)`, JSON.stringify({ n: g.btnsInBar, stop: g.stopInBar, flash: g.flashInBar }));
      check(g.stops === 1 && g.flashes === 1 && !!g.row && !!g.stop && g.stop.t >= g.row.t - 1 && g.stop.b <= g.row.b + 1, `${t} ✕ and the Saved flash exist once, each on the row of buttons`, JSON.stringify({ stops: g.stops, flashes: g.flashes, stop: g.stop, row: g.row }));
      check(!!g.row && !!g.tb && g.row.b <= g.tb.t + 1, `${t} the row of buttons sits above the title`, JSON.stringify({ row: g.row && g.row.b, title: g.tb && g.tb.t }));
      check(!!g.ti && !!g.pane && g.ti.w >= g.pane.w - 40 && g.ti.l >= g.pane.l && g.ti.r <= g.pane.r, `${t} the title is the full pane width (${g.ti && Math.round(g.ti.w)} of ${g.pane && Math.round(g.pane.w)})`, JSON.stringify({ ti: g.ti, pane: g.pane }));
      check(g.tiSH <= g.tiCH + 1 && g.tiSW <= g.tiCW + 1, `${t} the title's text is fully visible (scroll ${g.tiSW}x${g.tiSH}, box ${g.tiCW}x${g.tiCH})`, JSON.stringify({ sh: g.tiSH, ch: g.tiCH }));
      check(g.ti && g.ti.h >= 50, `${t} 120 characters wrap onto several lines (${g.ti && Math.round(g.ti.h)}px tall)`, JSON.stringify(g.ti));
      check(g.docSW <= g.vw, `${t} the page does not scroll sideways (${g.docSW} <= ${g.vw})`);
      /* a short title is ONE line */
      await on(d, () => { const t = document.getElementById('ti'); t.value = 'Short'; t.dispatchEvent(new Event('input', { bubbles: true })); });
      const s = await geo(d);
      check(s.ti && s.ti.h < 40, `${t} a short title takes one line (${s.ti && Math.round(s.ti.h)}px)`, JSON.stringify(s.ti));
      check(d.errors.length === 0, `${t} no page errors`, d.errors.join(' · '));
    } finally { await d.ctx.close(); }
  }

  /* ══ 75b — reading mode, 360 and 390 ══ */
  if (want('75b')) for (const w of [360, 390]) {
    const d = await open(srvNew.base, w, 800);
    try {
      await toNote(d, true);
      if (await d.page.locator('#p3c .p3c-stop').count()) await d.page.locator('#p3c .p3c-stop').first().tap();   /* the real ✕ */
      await sleep(600);
      const g = await geo(d); const t = `75b@${w}`;
      check(await on(d, () => !ST.editing), `${t} the real ✕ stops editing`);
      check(!!g.tbt && g.tbtSH <= g.tbtCH + 1 && g.tbtSW <= g.tbtCW + 1, `${t} the title is not clipped (scroll ${g.tbtSW}x${g.tbtSH}, box ${g.tbtCW}x${g.tbtCH})`, JSON.stringify({ sh: g.tbtSH, ch: g.tbtCH }));
      check(g.clamp !== '2', `${t} no two-line clamp (${g.clamp})`);
      check(g.tbt && g.tbtLH && g.tbt.h >= g.tbtLH * 2.5, `${t} 120 characters take 3 lines or more (${g.tbt && Math.round(g.tbt.h)}px, line ${g.tbtLH})`, JSON.stringify(g.tbt));
      check(g.tbt && g.tbt.r <= g.vw && g.tbt.l >= 0, `${t} the title sits inside the screen`, JSON.stringify(g.tbt));
      check(g.btnsInBar === 0, `${t} no button shares the title's row (${g.btnsInBar})`);
      check(d.errors.length === 0, `${t} no page errors`, d.errors.join(' · '));
    } finally { await d.ctx.close(); }
  }

  /* ══ 75c — typing at 390 ══ */
  if (want('75c')) {
    const d = await open(srvNew.base, 390, 800);
    try {
      await toNote(d, true);
      const t = '75c@390';
      await d.page.locator('#ti').tap();
      await d.page.keyboard.press('Control+A');
      await d.page.keyboard.type('Hello world');
      check(await on(d, () => ST.etitle === 'Hello world' && document.getElementById('ti').value === 'Hello world'), `${t} real typing reaches ST.etitle`, await on(d, () => ST.etitle));
      await d.page.keyboard.insertText('\nline two\r\nthree');
      await d.page.keyboard.type('Z');
      const v = await on(d, () => ({ ta: document.getElementById('ti').value, et: ST.etitle }));
      check(!/[\r\n]/.test(v.ta) && !/[\r\n]/.test(v.et) && v.ta === 'Hello world line two three' + 'Z', `${t} a pasted line break becomes a space; the caret stays after the pasted text`, JSON.stringify(v));
      await d.page.keyboard.press('Enter');
      await sleep(200);
      const af = await on(d, () => { const e = document.activeElement; const s = getSelection(); return { id: e && e.id, inEd: !!(e && e.closest && e.closest('#ed')), cons: s.rangeCount ? document.getElementById('ed').contains(s.anchorNode) : false, title: document.getElementById('ti').value, et: ST.etitle }; });
      check(af.inEd && af.cons, `${t} Enter moves the caret into the note's text`, JSON.stringify(af));
      check(!/[\r\n]/.test(af.title) && af.et === 'Hello world line two threeZ', `${t} Enter adds no line break to the title`, JSON.stringify(af));
      await d.page.keyboard.type('typed in body');
      await sleep(3200);   /* the debounced autosave */
      const saved = await on(d, () => DB.articles.find((a) => a.id === 'a1').title);
      check(saved === 'Hello world line two threeZ', `${t} autosave stored the title without a reload or Save`, saved);
      await d.page.reload({ waitUntil: 'domcontentloaded' });
      await d.page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree')); await sleep(500);
      const back = await on(d, () => { const a = DB.articles.find((x) => x.id === 'a1'); return { t: a.title, c: a.content }; });
      check(back.t === 'Hello world line two threeZ' && /typed in body/.test(back.c), `${t} after a reload the title and the body are read back`, JSON.stringify(back));
      /* focus and the caret survive a repaint while typing in the title */
      await toNote(d, true);
      await d.page.locator('#ti').tap();
      await d.page.keyboard.press('Control+A'); await d.page.keyboard.type('abcdef');
      await d.page.keyboard.press('ArrowLeft'); await d.page.keyboard.press('ArrowLeft');
      await on(d, () => { renderP3H(); renderP3C(); });
      await sleep(300);
      const fc = await on(d, () => { const e = document.activeElement; return { id: e && e.id, s: e && e.selectionStart, v: e && e.value, tag: e && e.tagName }; });
      check(fc.id === 'ti' && fc.tag === 'TEXTAREA' && fc.s === 4 && fc.v === 'abcdef', `${t} a repaint keeps the focus and the caret in the title`, JSON.stringify(fc));
      /* pagehide saves a title typed a moment ago */
      await d.page.keyboard.type('Q');
      await on(d, () => { window.dispatchEvent(new Event('pagehide')); document.dispatchEvent(new Event('visibilitychange')); });
      await sleep(300);
      const ph = await on(d, () => DB.articles.find((a) => a.id === 'a1').title);
      check(ph === 'abcdQef', `${t} pagehide saves the title typed a moment ago`, ph);
      check(d.errors.length === 0, `${t} no page errors`, d.errors.join(' · '));
    } finally { await d.ctx.close(); }
  }

  /* ══ 75d — tablet and laptop unchanged ══ */
  if (want('75d')) for (const [w, h, touch] of [[820, 1180, true], [1440, 900, false]]) for (const mode of ['edit', 'read']) {
    const snap = async (base) => {
      const d = await open(base, w, h, touch);
      try {
        await toNote(d, mode === 'edit');
        return await on(d, () => {
          const tb = document.querySelector('#p3c .p3c-titlebar'); if (!tb) return null;
          const rects = [tb, ...tb.querySelectorAll('*')].map((e) => { const b = e.getBoundingClientRect(); return (e.id || e.className || e.tagName) + ':' + [b.left, b.top, b.width, b.height].map((x) => Math.round(x * 10) / 10).join(','); });
          return { html: tb.outerHTML, rects, prevSibling: (tb.previousElementSibling || {}).className || '' };
        });
      } finally { await d.ctx.close(); }
    };
    const a = await snap(srvOld.base), b = await snap(srvNew.base);
    const t = `75d@${w} ${mode}`;
    check(!!a && !!b && a.html === b.html, `${t} the title bar's markup is identical to v05.14's`, a && b && a.html !== b.html ? 'old: ' + a.html.slice(0, 300) + '\n         new: ' + b.html.slice(0, 300) : '');
    check(!!a && !!b && JSON.stringify(a.rects) === JSON.stringify(b.rects), `${t} the title bar's box sizes and places are identical (${a && a.rects.length} boxes)`, a && b ? JSON.stringify(a.rects) + ' vs ' + JSON.stringify(b.rects) : '');
    check(!!a && !!b && a.prevSibling === b.prevSibling, `${t} nothing new sits above the title bar (${b && b.prevSibling})`);
  }

  /* ══ 75e — pop-up windows on a phone ══ */
  if (want('75e')) {
    const d = await open(srvNew.base, 390, 800);
    try {
      const full = (sel) => on(d, (S) => {
        const e = document.querySelector(S); if (!e) return null; const b = e.getBoundingClientRect(); const cs = getComputedStyle(e);
        return { tag: e.tagName, sh: e.scrollHeight, ch: e.clientHeight, sw: e.scrollWidth, cw: e.clientWidth, l: b.left, r: b.right, h: b.height, ws: cs.whiteSpace, to: cs.textOverflow, lh: parseFloat(cs.lineHeight) || 20 };
      }, sel);
      const ok = (g) => g && g.sh <= g.ch + 1 && g.sw <= g.cw + 1 && g.l >= 0 && g.r <= 390 && g.h >= g.lh * 2.5;
      /* Single, reading */
      await on(d, () => { selArt('a1'); openNotePopup('a1', 'panel'); }); await sleep(700);
      let g = await full('#p3-title-modal .fw-title-disp');
      check(ok(g), '75e Single (reading): the 120-character title shows in full, on several lines', JSON.stringify(g));
      /* Single, editing */
      await on(d, () => { startEdit(); }); await sleep(700);
      g = await full('#p3-title-modal #ti');
      check(ok(g) && g.tag === 'TEXTAREA', '75e Single (editing): the title is a growing <textarea>, shown in full', JSON.stringify(g));
      await d.page.locator('#p3-title-modal #ti').tap(); await d.page.keyboard.press('Control+A'); await d.page.keyboard.type('One'); await d.page.keyboard.insertText('\nTwo');
      const sv = await on(d, () => ({ v: document.getElementById('ti').value, et: ST.etitle }));
      check(sv.v === 'One Two' && sv.et === 'One Two', '75e Single (editing): typing is saved to ST.etitle and a line break becomes a space', JSON.stringify(sv));
      await on(d, () => { closeNoteModal(); }); await sleep(500);
      /* Multi */
      await on(d, () => { selArt('a1'); popOutNote('a1'); }); await sleep(800);
      g = await full('#fw-ti-a1');
      check(ok(g) && g.tag === 'TEXTAREA', '75e Multi: the 120-character title shows in full in its window', JSON.stringify(g));
      await d.page.locator('#fw-ti-a1').tap(); await d.page.keyboard.press('Control+A'); await d.page.keyboard.type('Multi'); await d.page.keyboard.insertText('\nline');
      const mv = await on(d, () => document.getElementById('fw-ti-a1').value);
      check(mv === 'Multi line', '75e Multi: a line break in the title becomes a space', mv);
      await d.page.keyboard.press('Enter'); await sleep(200);
      const mf = await on(d, () => { const e = document.activeElement; return { cls: e && e.className, inFw: !!(e && e.closest('.float-win')) }; });
      check(/fw-ed/.test(mf.cls) && mf.inFw, '75e Multi: Enter moves the caret into that window\'s note text', JSON.stringify(mf));
      check(d.errors.length === 0, '75e no page errors', d.errors.join(' · '));
    } finally { await d.ctx.close(); }
  }

  /* ══ 75f — contrast on five presets ══ */
  if (want('75f')) {
    const d = await open(srvNew.base, 390, 800);
    try {
      await toNote(d, true);
      await on(d, () => { document.getElementById('save-flash').classList.add('show'); });
      const measure = (sel) => on(d, (S) => {
        const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
        const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
        const bgOf = (el) => { const layers = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; } } let base = { r: 255, g: 255, b: 255 }; for (let i = layers.length - 1; i >= 0; i--) { const c = layers[i]; base = { r: c.r * c.a + base.r * (1 - c.a), g: c.g * c.a + base.g * (1 - c.a), b: c.b * c.a + base.b * (1 - c.a) }; } return base; };
        const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
        let worst = 99, who = '', n = 0;
        document.querySelectorAll(S).forEach((e) => {
          const field = e.tagName === 'TEXTAREA' || e.tagName === 'INPUT';
          if (!field && ![...e.childNodes].some((x) => x.nodeType === 3 && x.textContent.trim())) return;
          const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return;
          const bg = bgOf(e);
          const test = (fg) => { const comp = fg.a < 1 ? { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) } : fg; n++; const r = ratio(comp, bg); if (r < worst) { worst = r; who = (e.id || e.className) + ':' + (e.textContent || e.value || e.placeholder || '').trim().slice(0, 12); } };
          if (field) { if (e.value) test(parse(cs.color)); if (!e.value && e.placeholder) test(parse(getComputedStyle(e, '::placeholder').color)); } else test(parse(cs.color));
        });
        return { worst: Math.round(worst * 100) / 100, who, n };
      }, sel);
      for (const p of ['forest', 'ocean', 'amber', 'indigo', 'rose']) {
        await on(d, (k) => { applyPreset(k); }, p); await sleep(200);
        const m = await measure('#ti, .p3c-actrow .save-flash, .p3c-actrow .p3c-stop');
        check(m.n >= 3 && m.worst >= 4.5, `75f the title text, the Saved flash and ✕ clear 4.5:1 on ${p} (${m.n} pieces, worst ${m.worst}, ${m.who})`, JSON.stringify(m));
        await on(d, () => { const t = document.getElementById('ti'); t.value = ''; });
        const ph = await measure('#ti');
        check(ph.n === 1 && ph.worst >= 4.5, `75f the empty title's placeholder clears 4.5:1 on ${p} (${ph.worst})`, JSON.stringify(ph));
        await on(d, () => { document.getElementById('ti').value = ST.etitle || 'x'; });
      }
      await on(d, () => { cancelEdit(); }); await sleep(400);
      for (const p of ['forest', 'ocean', 'amber', 'indigo', 'rose']) {
        await on(d, (k) => { applyPreset(k); }, p); await sleep(200);
        const m = await measure('#p3c .tbt');
        check(m.n === 1 && m.worst >= 4.5, `75f the title in reading mode clears 4.5:1 on ${p} (${m.worst})`, JSON.stringify(m));
      }
    } finally { await d.ctx.close(); }
  }
} catch (e) {
  console.log(' FAIL  title-t1 threw: ' + (e && e.stack || e));
  results.push({ ok: false, label: 'threw' });
} finally {
  await browser.close();
  await srvNew.close(); await srvOld.close();
  await rm(dir, { recursive: true, force: true }).catch(() => {});
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
