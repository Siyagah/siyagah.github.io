#!/usr/bin/env node
/* tools/pickeep-j74.mjs — v05.47, J74 ①: the owner asked that with no internet every device opens Siyagah with ALL its notes,
   folders and pictures. Notes and folders were already held in full on each device; a picture was kept only once it had been shown.
   "🖼 Keep every picture on this device" (on unless switched off) fetches the rest in the background; the app also asks the browser to
   protect its storage. A fake cloud serves the pictures' real bytes, so the app's own check of every picture (sha-256) runs. Checks 107a–107h:
   107a every picture in a note or a trashed note that this device lacks is fetched and stored, and no note changes;
   107b switched off: nothing is fetched;
   107c offline: nothing is fetched (and nothing breaks);
   107d a picture missing from the cloud fails without stopping the others, and is not asked for again after 3 tries;
   107e the day's share of cloud reads is respected, and the Diagnostics say so;
   107f the switch and the two Diagnostics lines are reached from the real ⚙ → ☁ menu at 390 / 820 / 1440, and the switch can be tapped
        and turns the setting off;
   107g the storage-protection answer is recorded;
   107h no page errors.
   `node tools/pickeep-j74.mjs` */
import { openApp, seedDB, report } from './harness.mjs';

const r = report('J74 ① — every picture kept on the device');
const errs = [];
const CFG = { firebaseConfig: { apiKey: 'AIza-fake', authDomain: 'p.firebaseapp.com', projectId: 'p', appId: '1:2:web:3' }, notebookId: 'nb-keep' };

/* In the page: make N pictures, put their bytes in a fake cloud, reference them from notes (and one trashed note), none in the store. */
const setup = async (page, opts) => page.evaluate(async ([cfg, o]) => {
  localStorage.setItem('siyagah-sync-v1', JSON.stringify(cfg));
  const reads = { n: 0 };
  const cloud = new Map();   /* path -> data */
  const shas = [];
  for (let i = 0; i < o.n; i++) {
    const u8 = new Uint8Array(500 + i); for (let j = 0; j < u8.length; j++) u8[j] = (j * 7 + i * 13) & 255;
    const sha = await _picSha(u8.buffer);
    shas.push(sha);
    if (o.missing !== i) {
      cloud.set('pics/' + sha, { n: u8.length, t: 'image/png', p: 1, at: 1, b: '05.47' });
      cloud.set('picparts/' + sha + '~0', { d: { toUint8Array: () => u8 } });
    }
  }
  const doc = (coll, id) => ({ get: async () => { reads.n++; const v = cloud.get(coll + '/' + id); return { exists: !!v, data: () => v }; } });
  _syncFsDb = { collection: () => ({ doc: () => ({ collection: (c) => ({ doc: (id) => doc(c, id) }) }) }) };
  _authInstance = { currentUser: { uid: 'u-test' } };
  const img = (s) => `<img class="ed-img" data-pic="${s}" data-mime="image/png" alt="">`;
  const now = new Date().toISOString();
  const last = shas.length - 1;
  shas.slice(0, last).forEach((s, i) => DB.articles.push({ id: 'pk' + i, title: 'Pic note ' + i, content: '<p>x</p>' + img(s) + (i === 0 ? img(s) : ''), folderIds: ['f1'], tags: [], createdAt: now, updatedAt: now }));
  DB.trash.push({ id: 'tr-pk', type: 'article', item: { id: 'pk-tr', title: 'Trashed pic', content: img(shas[last]), folderIds: [], tags: [], createdAt: now, updatedAt: now }, deletedAt: now });
  window.__reads = reads; window.__shas = shas;
  if (o.cap != null && typeof _PIC_KEEP_DAY !== 'undefined') _PIC_KEEP_DAY = o.cap;
  if (o.off) DB.theme.picKeepAll = false;
  return { shas, before: JSON.stringify([DB.articles, DB.trash]) };
}, [CFG, opts]);
const runTick = async (page, times = 1) => page.evaluate(async (k) => { if (typeof _picKeepTick !== 'function') { await new Promise((ok) => setTimeout(ok, 1500)); return; } for (let i = 0; i < k; i++) { _picKeepBad.forEach((v) => { if (v.n < 3) v.until = 0; });   /* the 30 s-style gap is skipped; the 3-try wait is not */ await _picKeepTick(); } }, times);
const known = async (page) => page.evaluate(async () => { const out = []; for (const s of window.__shas) out.push(!!(await _picGet(s))); return out; });

/* 107a / 107g */
{
  const app = await openApp({ viewport: { width: 1440, height: 900 }, db: seedDB() });
  try {
    const { page } = app;
    await page.waitForTimeout(500);
    const s = await setup(page, { n: 5 });
    await runTick(page);
    const k = await known(page);
    const after = await page.evaluate(() => JSON.stringify([DB.articles, DB.trash]));
    const st = await page.evaluate(() => ({ ...window._picKeep, reads: window.__reads.n, txt: typeof _picKeepText === 'function' ? _picKeepText() : '' }));
    r.check(k.every(Boolean) && after === s.before && st.missing === 0 && st.want === 5,
      '107a every picture in a note or a trashed note is fetched and kept on the device; no note changes', JSON.stringify({ k, same: after === s.before, st }).slice(0, 260));
    await page.evaluate(async () => { if (typeof _storeProtect === 'function') await _storeProtect(); });
    const pv = await page.evaluate(() => window._storeProt && window._storeProt.v);
    r.check(typeof pv === 'string' && pv.length > 1, '107g the storage-protection answer is recorded', String(pv));
    errs.push(...app.errors);
  } finally { await app.close(); }
}
/* 107b off · 107c offline */
for (const mode of ['off', 'offline']) {
  const app = await openApp({ viewport: { width: 1440, height: 900 }, db: seedDB() });
  try {
    const { page, ctx } = app;
    await page.waitForTimeout(500);
    await setup(page, { n: 3, off: mode === 'off' });
    if (mode === 'offline') await ctx.setOffline(true);
    await runTick(page);
    const k = await known(page);
    const reads = await page.evaluate(() => window.__reads.n);
    r.check(k.every((x) => !x) && reads === 0, mode === 'off' ? '107b switched off: nothing is fetched' : '107c offline: nothing is fetched, nothing breaks', JSON.stringify({ k, reads }));
    if (mode === 'offline') { await ctx.setOffline(false); }
    errs.push(...app.errors);
  } finally { await app.close(); }
}
/* 107d a missing picture · 107e the day's share */
{
  const app = await openApp({ viewport: { width: 1440, height: 900 }, db: seedDB() });
  try {
    const { page } = app;
    await page.waitForTimeout(500);
    await setup(page, { n: 4, missing: 1 });
    await runTick(page, 5);
    const k = await known(page);
    const st = await page.evaluate(() => ({ reads: window.__reads.n, bad: typeof _picKeepBad === 'undefined' ? [] : [..._picKeepBad.values()].map((v) => v.n), failed: window._picKeep ? window._picKeep.failed : 0 }));
    r.check(k[0] && !k[1] && k[2] && k[3] && st.bad.length === 1 && st.bad[0] === 3 && st.failed === 3,
      '107d a picture missing from the cloud fails without stopping the others, and is not asked for after 3 tries', JSON.stringify({ k, st }));
    errs.push(...app.errors);
  } finally { await app.close(); }
}
{
  const app = await openApp({ viewport: { width: 1440, height: 900 }, db: seedDB() });
  try {
    const { page } = app;
    await page.waitForTimeout(500);
    await setup(page, { n: 5, cap: 4 });
    await runTick(page, 2);
    const k = await known(page);
    const txt = await page.evaluate(() => typeof _picKeepText === 'function' ? _picKeepText() : '');
    r.check(k.filter(Boolean).length === 2 && /share of cloud reads/.test(txt), '107e the day\'s share of cloud reads is kept to, and the Diagnostics say so', JSON.stringify({ k, txt }));
    errs.push(...app.errors);
  } finally { await app.close(); }
}
/* 107f the switch from the real menu */
for (const [w, h, touch] of [[390, 844, true], [820, 1180, true], [1440, 900, false]]) {
  const app = await openApp({ viewport: { width: w, height: h }, hasTouch: touch, db: seedDB() });
  try {
    const { page } = app;
    await page.evaluate((c) => localStorage.setItem('siyagah-sync-v1', JSON.stringify(c)), CFG);
    const res = await page.evaluate(async () => {
      _syncFsDb = _syncFsDb || {};   /* test-only: the window's "Sync is active" view (no cloud is reached) */
      try { closeModal(); } catch (e) {}
      if (window.innerWidth < 640 && typeof showPane === 'function') showPane('sb');
      document.getElementById('sb-menu-btn').click(); await new Promise((ok) => setTimeout(ok, 200));
      document.getElementById('sync-dot').click(); await new Promise((ok) => setTimeout(ok, 300));
      const diag = (document.getElementById('sync-diag') || {}).textContent || '';
      const cb = document.getElementById('pickeep-cb'); if (!cb) return { why: 'no switch', diag };
      cb.scrollIntoView({ block: 'center' }); await new Promise((ok) => setTimeout(ok, 100));
      const row = document.getElementById('pickeep-row').getBoundingClientRect();
      const rc = cb.getBoundingClientRect();
      const hit = document.elementFromPoint(rc.left + rc.width / 2, rc.top + rc.height / 2);
      return { diag, checked: cb.checked, inView: rc.left >= 0 && rc.right <= innerWidth && rc.top >= 0 && rc.bottom <= innerHeight, onTop: !!hit && (hit === cb || document.getElementById('pickeep-row').contains(hit)), rowH: Math.round(row.height) };
    });
    let off = null;
    if (res.inView && res.onTop) {
      if (touch) { const b = await page.locator('#pickeep-cb').boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); }
      else await page.click('#pickeep-cb');
      await page.waitForTimeout(200);
      off = await page.evaluate(() => DB.theme.picKeepAll);
    }
    r.check(/Pictures kept here/.test(res.diag || '') && /Storage protected/.test(res.diag || '') && res.checked && res.inView && res.onTop && res.rowH >= 44 && off === false,
      `107f@${w} the switch and both Diagnostics lines are reached from ⚙ → ☁; it is on by default, can be tapped, and turns the setting off`, JSON.stringify({ ...res, diag: (res.diag || '').slice(0, 60), off }));
    errs.push(...app.errors);
  } finally { await app.close(); }
}
r.check(errs.length === 0, '107h no page errors', errs.slice(0, 3).join(' | '));
process.exit(r.finish() ? 1 : 0);
