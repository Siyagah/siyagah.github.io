#!/usr/bin/env node
/* tools/boot-b1.mjs — v05.17 · B1: this device's copy of the notebook cannot be read at start.

   Before v05.17 a failed IndexedDB read at boot looked exactly like "no notebook on this device": loadDB() fell through to the
   starter set (mkDefaults) and the boot migration then wrote it OVER the real copy (_idbMigrateFrom -> _idbPut). Found by the
   Architect when 52d's kill trials reopened a 2,011-note notebook with 0 notes.

   The failure is made on purpose by an init script, before the app runs, in one of two ways (sessionStorage 'b1sab'):
     get:<n|all>   IDBObjectStore.get('notebook') throws  — the open works, so a write WOULD land (the dangerous case)
     open:<n|all>  indexedDB.open('siyagah-local-v1') fails
   `__b1.lift()` ends the failure. sessionStorage 'b1dropls' removes the localStorage copy before boot (the owner's devices: a big
   notebook has no localStorage copy). The device copy is always read back RAW (a cursor, not the sabotaged get).

   79a  a read that fails twice then works: boots normally (all notes, no warning line)
   79b  a read that keeps failing (get), no other copy: never the starter set, the copy is NOT written, the warning line shows
        (measured at each size); a note added meanwhile; the read works again -> "Try now" (a real tap/click) joins the copy in:
        every note plus the new one, the line goes, the copy holds them all, and a plain reload shows them all
   79c  the same with the OPEN failing, recovered by the timer alone (no tap)
   79d  the same in journal mode (the owner's case: a big notebook saves through the local journal), with a journal entry newer than
        the full copy: after recovery and a reload nothing is lost and nothing is older
   79e  a new device (nothing anywhere, IndexedDB fine) starts as before and writes its copy, with no warning line
   79f  no page errors
   Every check runs at 390x844 (touch), 820x1180 (touch) and 1440x900. --unpatched serves origin/main's index.html instead. */
import { playwright, serve, seedDB, BLOCKED, ROOT } from './harness.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, copyFileSync, rmSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const argv = process.argv.slice(2);
let pass = 0, fail = 0;
const check = (ok, label, detail = '') => { if (ok) { pass++; console.log('  ok   ' + label); } else { fail++; console.log(' FAIL  ' + label); if (detail) console.log('         ' + String(detail).slice(0, 600)); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T0 = '2026-10-01T00:00:00.000Z';
const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];

/* --unpatched: the same harness against origin/main's app (it must FAIL 79b-79d) */
let root = ROOT, tmpRoot = null;
if (argv.includes('--unpatched')) {
  tmpRoot = mkdtempSync(join(tmpdir(), 'b1-unpatched-'));
  const copy = (src, dst) => { const st = statSync(src); if (st.isDirectory()) { mkdirSync(dst, { recursive: true }); for (const f of readdirSync(src)) if (f !== '.git' && f !== 'node_modules') copy(join(src, f), join(dst, f)); } else copyFileSync(src, dst); };
  copy(ROOT, tmpRoot);
  writeFileSync(join(tmpRoot, 'index.html'), execFileSync('git', ['-C', ROOT, 'show', 'origin/main:index.html'], { maxBuffer: 1 << 27 }));
  writeFileSync(join(tmpRoot, 'sw.js'), execFileSync('git', ['-C', ROOT, 'show', 'origin/main:sw.js'], { maxBuffer: 1 << 27 }));
  root = tmpRoot;
  console.log('UNPATCHED: serving origin/main index.html + sw.js');
}

const SAB = () => {
  const cfg = sessionStorage.getItem('b1sab');
  if (sessionStorage.getItem('b1dropls')) { try { localStorage.removeItem('my-notebook-v1'); } catch (e) {} sessionStorage.removeItem('b1dropls'); }
  window.__b1 = { fails: 0, left: 0, lift() { this.left = 0; } };
  if (!cfg) return;
  const [mode, n] = cfg.split(':');
  window.__b1.left = n === 'all' ? Infinity : +n;
  if (mode === 'open') {
    const orig = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function (name) {
      if (name === 'siyagah-local-v1' && window.__b1.left > 0) {
        window.__b1.left--; window.__b1.fails++;
        const req = { result: undefined, error: null, onerror: null, onsuccess: null, onblocked: null, onupgradeneeded: null };
        setTimeout(() => { req.error = new DOMException('made to fail by boot-b1', 'UnknownError'); if (req.onerror) req.onerror({ target: req }); }, 5);
        return req;
      }
      return orig.apply(this, arguments);
    };
  } else if (mode === 'get') {
    const orig = IDBObjectStore.prototype.get;
    IDBObjectStore.prototype.get = function (key) {
      if (key === 'notebook' && this.name === 'kv' && this.transaction.db.name === 'siyagah-local-v1' && window.__b1.left > 0) {
        window.__b1.left--; window.__b1.fails++;
        throw new DOMException('made to fail by boot-b1', 'UnknownError');
      }
      return orig.apply(this, arguments);
    };
  }
};
/* the device copy, read RAW with a cursor (never through the sabotaged get): how many notes, and the ids */
const rawCopy = (page) => page.evaluate(() => new Promise((res) => {
  const rq = indexedDB.open('siyagah-local-v1');
  rq.onerror = () => res({ err: 'open' });
  rq.onsuccess = () => {
    const db = rq.result; let out = { n: -1 };
    try {
      const cur = db.transaction('kv', 'readonly').objectStore('kv').openCursor();
      cur.onsuccess = () => { const c = cur.result; if (!c) { db.close(); res(out); return; } if (c.key === 'notebook') { const v = c.value; out = { n: (v.articles || []).length, ids: (v.articles || []).map((a) => a.id), folders: (v.folders || []).map((f) => f.id) }; } c.continue(); };
      cur.onerror = () => { db.close(); res({ err: 'cursor' }); };
    } catch (e) { res({ err: String(e) }); }
  };
}));
const state = (page) => page.evaluate(() => ({ n: DB.articles.length, ids: DB.articles.map((a) => a.id), folders: DB.folders.map((f) => f.id), fail: typeof _idbBootFail === 'undefined' ? null : _idbBootFail, ready: _idbReady, warn: !!document.getElementById('idb-warn'), b1: window.__b1 ? window.__b1.fails : null }));
const booted = (page) => page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree'), null, { timeout: 30000 });

const pw = await playwright();
const srv = await serve(root);
const browser = await pw.chromium.launch();

async function device(vp) {
  const ctx = await browser.newContext(vp.touch ? { viewport: { width: vp.w, height: vp.h }, hasTouch: true, isMobile: true } : { viewport: { width: vp.w, height: vp.h } });
  for (const p of BLOCKED) await ctx.route(p, (r) => r.abort());
  await ctx.addInitScript(SAB);
  const seed = seedDB(T0);
  await ctx.addInitScript((d) => { if (!localStorage.getItem('b1-init')) { localStorage.setItem('my-notebook-v1', JSON.stringify(d)); localStorage.setItem('b1-init', '1'); } }, seed);
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e));
  page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR_FAILED/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(srv.base + '/', { waitUntil: 'domcontentloaded' }); await booted(page); await sleep(300);
  return { ctx, page, errors };
}
/* N notes added through the app's own save; then wait until the device copy holds them */
async function addNotes(page, n, tag) {
  await page.evaluate(([n, tag]) => {
    const now = Date.now();
    for (let i = 0; i < n; i++) DB.articles.push({ id: tag + '-' + i, title: 'B1 ' + tag + ' ' + i, content: '<p>' + tag + ' ' + i + '</p>', folderIds: [], tags: [], kind: 'general', createdAt: new Date(now + i).toISOString(), updatedAt: new Date(now + i).toISOString() });
    persist();
  }, [n, tag]);
}
async function settle(page, want) {
  for (let i = 0; i < 60; i++) { const c = await rawCopy(page); if (c.n === want) return c; await sleep(150); }
  return rawCopy(page);
}
async function reloadWith(page, sab, dropLs) {
  await page.evaluate(([s, d]) => { if (s) sessionStorage.setItem('b1sab', s); else sessionStorage.removeItem('b1sab'); if (d) sessionStorage.setItem('b1dropls', '1'); }, [sab, dropLs]);
  await page.reload({ waitUntil: 'domcontentloaded' }); await booted(page); await sleep(400);
}
const tapOrClick = (page, vp, sel) => (vp.touch ? page.locator(sel).first().tap() : page.locator(sel).first().click());

try {
  for (const vp of VPS) {
    const t = (s) => `79${s}@${vp.name}`;
    /* ── 79a — fails twice, then works ── */
    {
      const { ctx, page, errors } = await device(vp);
      try {
        await addNotes(page, 40, 'a'); const c0 = await settle(page, 43);
        check(c0.n === 43, `${t('a')} the device copy holds the 43 notes before the test`, JSON.stringify(c0).slice(0, 200));
        await reloadWith(page, 'get:2', true);
        const s = await state(page);
        check(s.n === 43 && !s.warn && s.fail === false && s.ready === true && s.b1 === 2, `${t('a')} a read that fails twice, then works, boots normally: 43 notes, no warning line (${s.b1} failed reads)`, JSON.stringify({ ...s, ids: undefined, folders: undefined }));
        check(errors.length === 0, `${t('a')} no page errors`, errors.slice(0, 2).join(' · '));
      } finally { await ctx.close(); }
    }
    /* ── 79b — get keeps failing, no other copy ── */
    {
      const { ctx, page, errors } = await device(vp);
      try {
        await addNotes(page, 40, 'b'); await settle(page, 43);
        await reloadWith(page, 'get:all', true);
        const s = await state(page);
        check(s.n === 0 && !s.ids.includes('a1') && !s.folders.includes('f1'), `${t('b')} a read that keeps failing opens EMPTY, never the starter set (${s.n} notes, folders: ${s.folders.join(',') || 'none'})`, JSON.stringify(s.ids.slice(0, 5)));
        const c1 = await rawCopy(page);
        check(c1.n === 43, `${t('b')} ...and the device copy is NOT written: it still holds 43 notes`, JSON.stringify(c1).slice(0, 200));
        check(s.warn && s.ready === false, `${t('b')} ...the warning line shows and the device copy is not used for saving`, JSON.stringify({ warn: s.warn, ready: s.ready }));
        const box = await page.evaluate(() => { const e = document.getElementById('idb-warn'), b = e && e.querySelector('button'); if (!e) return null; const r = e.getBoundingClientRect(), br = b.getBoundingClientRect(); const cs = getComputedStyle(e); return { top: Math.round(r.top), left: Math.round(r.left), right: Math.round(r.right), vw: innerWidth, over: e.scrollWidth > e.clientWidth + 1, btnH: Math.round(br.height), btnIn: br.right <= innerWidth && br.left >= 0, bg: cs.backgroundColor, fg: cs.color, txt: e.textContent }; });
        check(!!box && box.top === 0 && box.left === 0 && box.right === box.vw && !box.over && box.btnH >= 40 && box.btnIn, `${t('b')} ...the line sits across the top, nothing cut off, "Try now" ≥ 40 px and on screen (${box && box.btnH}px)`, JSON.stringify(box));
        check(!!box && /could not be read/.test(box.txt) && /Nothing is lost/.test(box.txt), `${t('b')} ...it says in plain words what happened and that nothing is lost`, box && box.txt);
        /* Hide: the line shrinks to a small ⚠ in the top-right corner; ⚠ brings it back */
        await tapOrClick(page, vp, '#idb-warn .iw-hide');
        const mini = await page.evaluate(() => { const e = document.getElementById('idb-warn'), r = e.getBoundingClientRect(), b = e.querySelector('.iw-show').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), right: Math.round(innerWidth - r.right), bw: Math.round(b.width), bh: Math.round(b.height), textShown: getComputedStyle(e.querySelector('.iw-t')).display !== 'none' }; });
        check(mini.w <= 48 && mini.h <= 48 && mini.bw >= 40 && mini.bh >= 40 && !mini.textShown && mini.right >= 0, `${t('b')} "Hide" shrinks the line to a 40 px ⚠ in the top-right corner`, JSON.stringify(mini));
        await tapOrClick(page, vp, '#idb-warn .iw-show');
        const full = await page.evaluate(() => { const e = document.getElementById('idb-warn'); return { full: Math.round(e.getBoundingClientRect().width) === innerWidth, min: e.classList.contains('min') }; });
        check(full.full && !full.min, `${t('b')} ...and ⚠ brings the full line back`, JSON.stringify(full));
        /* a note added meanwhile, through the app */
        await addNotes(page, 1, 'meanwhile');
        await sleep(300);
        const c2 = await rawCopy(page);
        check(c2.n === 43, `${t('b')} a note added meanwhile does not touch the device copy (still 43)`, JSON.stringify(c2).slice(0, 120));
        /* the read works again: a real tap/click on "Try now" */
        await page.evaluate(() => window.__b1.lift());
        await tapOrClick(page, vp, '#idb-warn .iw-try');
        await page.waitForFunction(() => !document.getElementById('idb-warn'), null, { timeout: 8000 }).catch(() => {});
        const s2 = await state(page);
        check(s2.n === 44 && s2.ids.includes('meanwhile-0') && s2.ids.includes('b-39') && !s2.warn && s2.ready === true && s2.fail === false, `${t('b')} "Try now" joins the copy in: 44 notes (43 + the one added meanwhile), the line is gone`, JSON.stringify({ ...s2, ids: s2.ids.length, folders: undefined }));
        const c3 = await settle(page, 44);
        check(c3.n === 44, `${t('b')} ...and the device copy now holds all 44`, JSON.stringify(c3).slice(0, 120));
        await reloadWith(page, null, false);
        const s3 = await state(page);
        check(s3.n === 44 && !s3.warn, `${t('b')} ...a plain reload shows all 44, no line`, JSON.stringify({ n: s3.n, warn: s3.warn }));
        check(errors.filter((e) => !/made to fail/.test(e)).length === 0, `${t('b')} no page errors`, errors.slice(0, 2).join(' · '));
      } finally { await ctx.close(); }
    }
    /* ── 79c — the OPEN keeps failing; recovered by the timer alone ── */
    {
      const { ctx, page, errors } = await device(vp);
      try {
        await addNotes(page, 20, 'c'); await settle(page, 23);
        await reloadWith(page, 'open:all', true);
        const s = await state(page);
        check(s.n === 0 && s.warn && !s.folders.includes('f1'), `${t('c')} an open that keeps failing opens empty with the warning line, never the starter set`, JSON.stringify({ n: s.n, warn: s.warn, folders: s.folders }));
        await addNotes(page, 1, 'meanwhile');
        await page.evaluate(() => window.__b1.lift());
        await page.waitForFunction(() => !document.getElementById('idb-warn'), null, { timeout: 10000 }).catch(() => {});
        const s2 = await state(page);
        check(s2.n === 24 && s2.ids.includes('meanwhile-0') && !s2.warn && s2.ready === true, `${t('c')} with no tap, the next try (every 3 s) joins the copy in: 24 notes, the line is gone`, JSON.stringify({ n: s2.n, warn: s2.warn, ready: s2.ready }));
        const c = await settle(page, 24);
        check(c.n === 24, `${t('c')} ...and the device copy holds all 24`, JSON.stringify(c).slice(0, 120));
        check(errors.filter((e) => !/made to fail/.test(e)).length === 0, `${t('c')} no page errors`, errors.slice(0, 2).join(' · '));
      } finally { await ctx.close(); }
    }
    /* ── 79d — journal mode, with a journal entry newer than the full copy ── */
    {
      const { ctx, page, errors } = await device(vp);
      try {
        await page.evaluate(() => { _LJ_MIN_NOTES = 10; _LJ_CKPT_MS = 600000; });   /* journal mode at 10 notes; no checkpoint during the test */
        await addNotes(page, 20, 'd'); await settle(page, 23);
        await page.evaluate(() => _ljChain.catch(() => {}));
        /* an edit that only the journal holds (no checkpoint yet): the full copy is older */
        await page.evaluate(() => { const a = DB.articles.find((x) => x.id === 'd-5'); a.title = 'Edited in the journal only'; a.updatedAt = new Date(Date.now() + 1000).toISOString(); persist(); });
        await page.evaluate(() => _ljChain.catch(() => {}));
        const jm = await page.evaluate(() => _ljOn);
        check(jm === true, `${t('d')} the notebook saves through the local journal`, String(jm));
        await reloadWith(page, 'get:all', true);
        const s = await state(page);
        check(s.n === 0 && s.warn, `${t('d')} a read that keeps failing opens empty with the warning line`, JSON.stringify({ n: s.n, warn: s.warn }));
        await addNotes(page, 1, 'meanwhile');
        await page.evaluate(() => window.__b1.lift());
        await tapOrClick(page, vp, '#idb-warn .iw-try');
        await page.waitForFunction(() => !document.getElementById('idb-warn'), null, { timeout: 8000 }).catch(() => {});
        await page.evaluate(() => _ljChain.catch(() => {}));
        const s2 = await page.evaluate(() => ({ n: DB.articles.length, t: (DB.articles.find((x) => x.id === 'd-5') || {}).title, m: DB.articles.some((x) => x.id === 'meanwhile-0') }));
        check(s2.n === 24 && s2.m && s2.t === 'Edited in the journal only', `${t('d')} recovery lays the journal over the full copy and joins in the new note: 24 notes, the journal-only edit kept`, JSON.stringify(s2));
        await reloadWith(page, null, false);
        const s3 = await page.evaluate(() => ({ n: DB.articles.length, t: (DB.articles.find((x) => x.id === 'd-5') || {}).title, m: DB.articles.some((x) => x.id === 'meanwhile-0'), warn: !!document.getElementById('idb-warn') }));
        check(s3.n === 24 && s3.m && s3.t === 'Edited in the journal only' && !s3.warn, `${t('d')} ...a plain reload: 24 notes, the new note and the journal-only edit both there`, JSON.stringify(s3));
        check(errors.filter((e) => !/made to fail/.test(e)).length === 0, `${t('d')} no page errors`, errors.slice(0, 2).join(' · '));
      } finally { await ctx.close(); }
    }
    /* ── 79e — a new device: nothing anywhere, IndexedDB fine ── */
    {
      const ctx = await browser.newContext(vp.touch ? { viewport: { width: vp.w, height: vp.h }, hasTouch: true, isMobile: true } : { viewport: { width: vp.w, height: vp.h } });
      for (const p of BLOCKED) await ctx.route(p, (r) => r.abort());
      const page = await ctx.newPage(), errors = [];
      page.on('pageerror', (e) => errors.push('pageerror: ' + e));
      try {
        await page.goto(srv.base + '/', { waitUntil: 'domcontentloaded' }); await booted(page); await sleep(300);
        const s = await state(page);
        const c = await settle(page, s.n);
        /* the served page's <script id="nd"> holds an EMPTY notebook, so a new device starts empty (as it always has) */
        check(!s.warn && s.fail === false && s.ready === true && c.n === s.n && c.n >= 0, `${t('e')} a new device starts as before (${s.n} notes, from the page's own empty notebook), with no warning line, and writes its own copy`, JSON.stringify({ s: { n: s.n, warn: s.warn, ready: s.ready }, c }));
        check(errors.length === 0, `${t('e')} no page errors`, errors.slice(0, 2).join(' · '));
      } finally { await ctx.close(); }
    }
  }
} catch (e) {
  check(false, 'boot-b1 threw', e && e.stack || e);
} finally {
  await browser.close(); await srv.close();
  if (tmpRoot) rmSync(tmpRoot, { recursive: true, force: true });
}
console.log(`${pass}/${pass + fail} passed${fail ? `, ${fail} FAILED` : ''}`);
process.exit(fail ? 1 : 0);
