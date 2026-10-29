#!/usr/bin/env node
/* tools/lost-j92.mjs — v05.59, J92: this device's copy LOST by the browser. Under load, a browser killed in the middle of a save was seen
   (52d, about 1 kill in 400) to come back with the site's whole IndexedDB storage empty: every read worked and found nothing, so the app
   opened as a brand-new device, silently. A cookie (`siyagah_had=1`, outside IndexedDB) now says this device held a notebook. Checks 118a–118f,
   at 390 / 820 (touch) and 1440:
   118a a first start (no mark, no copy): no notice; the device copy is written and the mark set; a note is added;
   118b the storage emptied behind the app's back (every IndexedDB database deleted, the cookie kept): the app opens from what is left
        outside IndexedDB (a small notebook's localStorage copy still holds the note) and says what happened (#idb-warn.lost), inside the screen; with no built-in notebook loadDB() would not
        give the starter set either (it would join the real notebook from the cloud) — the code path is the B1 one;
   118c "Hide" shrinks it to the ⚠ in the corner, ⚠ brings it back;
   118d the next start (the copy now written again) shows no notice;
   118e site data cleared on purpose (the cookie gone too): a plain first start, no notice;
   118f no page errors.
   `node tools/lost-j92.mjs` */
import { openApp, report } from './harness.mjs';

const r = report('J92 — the device copy lost by the browser');
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const boot = async (page, url) => { await page.goto(url, { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.__appBooted === true, null, { timeout: 60000 }); await sleep(400); };
const wipeIdb = (page, base) => page.goto(base + '/manifest.json').then(() => page.evaluate(async () => {
  const names = (await indexedDB.databases()).map((d) => d.name);
  await Promise.all(names.map((n) => new Promise((res) => { const q = indexedDB.deleteDatabase(n); q.onsuccess = q.onerror = q.onblocked = () => res(); })));
  return names;
}));
const state = (page) => page.evaluate(() => {
  const w = document.getElementById('idb-warn'), b = w && w.getBoundingClientRect();
  return { folders: DB.folders.length, notes: DB.articles.length, lost: _idbLost, warn: !!w, lostCls: !!(w && w.classList.contains('lost')), min: !!(w && w.classList.contains('min')),
    inView: !!(b && b.top >= 0 && b.left >= 0 && b.right <= innerWidth + 0.5 && b.bottom <= innerHeight), mark: document.cookie.includes('siyagah_had=1'), text: w ? w.textContent.slice(0, 60) : '' };
});

for (const [w, h, touch] of [[390, 844, true], [820, 1180, true], [1440, 900, false]]) {
  const t = `@${w}`;
  const app = await openApp({ viewport: { width: w, height: h }, hasTouch: touch, db: null });
  const page = app.page, base = new URL(page.url()).origin;
  try {
    await page.waitForFunction(() => _idbReady === true, null, { timeout: 15000 }).catch(() => {});
    const a = await state(page);
    r.check(!a.warn && !a.lost && a.mark, `118a${t} a first start: no notice, the mark set`, JSON.stringify(a));
    await page.evaluate(async () => { DB.articles.push({ id: 'j92-n', title: 'J92 note', content: '<p>x</p>', folderIds: [], tags: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); persist(); await new Promise((res) => setTimeout(res, 500)); });
    const names = await wipeIdb(page, base);
    await boot(page, base + '/');
    const b = await state(page);
    r.check(names.length > 0 && b.lost && b.notes === 1, `118b${t} the storage emptied behind the app's back: it opens from what the browser kept outside IndexedDB (here the localStorage copy, with the note)`, JSON.stringify({ names, ...b }));
    r.check(b.warn && b.lostCls && b.inView, `118b${t} … and says what happened, inside the screen`, JSON.stringify(b));
    const tap = (sel) => (touch ? page.locator(sel).tap() : page.locator(sel).click());
    await tap('#idb-warn .iw-hide'); const c1 = await state(page);
    await tap('#idb-warn .iw-show'); const c2 = await state(page);
    r.check(c1.min && !c2.min, `118c${t} Hide shrinks it to the corner ⚠, ⚠ brings it back`, JSON.stringify({ c1: c1.min, c2: c2.min }));
    await page.waitForFunction(() => _idbReady === true, null, { timeout: 15000 }).catch(() => {});
    await boot(page, base + '/');
    const d = await state(page);
    r.check(!d.warn && !d.lost, `118d${t} the next start shows no notice (the copy is written again)`, JSON.stringify(d));
    await wipeIdb(page, base); await page.context().clearCookies();
    await boot(page, base + '/');
    const e = await state(page);
    r.check(!e.warn && !e.lost, `118e${t} site data cleared on purpose (the mark gone too): a plain first start, no notice`, JSON.stringify(e));
  } catch (e) { r.check(false, `118${t} threw`, String(e && e.stack || e)); }
  r.check(app.errors.length === 0, `118f${t} no page errors`, app.errors.slice(0, 3).join(' | '));
  await app.close();
}
process.exit(r.finish() ? 1 : 0);
