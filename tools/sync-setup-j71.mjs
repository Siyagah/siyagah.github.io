#!/usr/bin/env node
/* tools/sync-setup-j71.mjs — v05.45, J71: the owner's PC and tablet showed the same Notebook ID and the same Google account, yet the PC read
   942 records and the tablet 19,285: the Notebook ID is only half of a cloud's address, the Firebase project is the other half, and the
   Cloud Sync window showed only the ID. Checks 105a–105e:
   105a the Diagnostics name the cloud project;
   105b "📋 Copy sync setup" is reached from the real ⚙ menu and can be tapped at 390 / 820 / 1440;
   105c it copies the project AND the notebook ID (clipboard refused: the fallback box shows the same text);
   105d pasting that text into another device's setup screen fills the notebook ID, and Connect saves exactly that project and ID;
   105e no page errors.
   `node tools/sync-setup-j71.mjs` */
import { openApp, seedDB, report } from './harness.mjs';

const r = report('J71 — which cloud a device reads');
const CFG = { firebaseConfig: { apiKey: 'AIza-fake-tablet', authDomain: 'tablet-proj.firebaseapp.com', projectId: 'tablet-proj', appId: '1:2:web:3' }, notebookId: 'nb-same-id' };
const PC = { firebaseConfig: { apiKey: 'AIza-fake-pc', authDomain: 'pc-proj.firebaseapp.com', projectId: 'pc-proj', appId: '1:9:web:9' }, notebookId: 'nb-same-id' };
const errs = [];
let copied = '';
for (const [w, h, touch] of [[390, 844, true], [820, 1180, true], [1440, 900, false]]) {
  const app = await openApp({ viewport: { width: w, height: h }, hasTouch: touch, db: seedDB() });
  /* the config is set after boot: getSyncConfig() reads it each time, and no cloud is ever reached */
  await app.page.evaluate((c) => localStorage.setItem('siyagah-sync-v1', JSON.stringify(c)), CFG);
  try {
    const { page } = app;
    const res = await page.evaluate(async () => {
      _syncFsDb = _syncFsDb || {};   /* test-only: the window's "Sync is active" view (no cloud is reached) */
      navigator.clipboard.writeText = () => Promise.reject(new Error('denied'));
      try { closeModal(); } catch (e) {}
      if (window.innerWidth < 640 && typeof showPane === 'function') showPane('sb');
      document.getElementById('sb-menu-btn').click(); await new Promise((ok) => setTimeout(ok, 200));
      const dot = document.getElementById('sync-dot'); if (!dot) return { why: 'no sync-dot' };
      dot.click(); await new Promise((ok) => setTimeout(ok, 300));
      const diag = (document.getElementById('sync-diag') || {}).textContent || '';
      const b = document.getElementById('sync-copy-btn'); if (!b) return { why: 'no copy button', diag };
      b.scrollIntoView({ block: 'center' }); await new Promise((ok) => setTimeout(ok, 100));
      const rc = b.getBoundingClientRect();
      const inView = rc.width > 0 && rc.left >= 0 && rc.right <= innerWidth && rc.top >= 0 && rc.bottom <= innerHeight;
      const hit = document.elementFromPoint(rc.left + rc.width / 2, rc.top + rc.height / 2);
      return { diag, inView, onTop: !!hit && (hit === b || b.contains(hit)), h: Math.round(rc.height) };
    });
    r.check(/Cloud project\s*tablet-proj/.test(res.diag || ''), `105a@${w} the Diagnostics name the cloud project`, (res.diag || res.why || '').slice(0, 160));
    r.check(res.inView && res.onTop, `105b@${w} "📋 Copy sync setup" is reached from ⚙ → ☁ and can be tapped`, JSON.stringify({ inView: res.inView, onTop: res.onTop, h: res.h, why: res.why }));
    if (res.inView) {
      await page.click('#sync-copy-btn'); await page.waitForTimeout(300);
      const t = await page.evaluate(() => (document.getElementById('sync-copy-t') || {}).value || '');
      let o = null; try { o = JSON.parse(t); } catch (e) {}
      r.check(!!o && o.notebookId === 'nb-same-id' && o.firebaseConfig && o.firebaseConfig.projectId === 'tablet-proj' && o.firebaseConfig.apiKey === 'AIza-fake-tablet',
        `105c@${w} the copied setup carries the project and the notebook ID (shown to select when the clipboard refuses)`, t.slice(0, 120));
      if (w === 390) copied = t;
    }
    errs.push(...app.errors);
  } finally { await app.close(); }
}
/* 105d — the PC: another project saved, sync not running; the owner pastes the tablet's setup and presses Connect */
{
  const app = await openApp({ viewport: { width: 1440, height: 900 }, db: seedDB() });
  try {
    const { page } = app;
    const out = await page.evaluate(async ([pc, txt]) => {
      localStorage.setItem('siyagah-sync-v1', JSON.stringify(pc));
      _syncFsDb = null;
      openSyncModal(); await new Promise((ok) => setTimeout(ok, 200));
      const ta = document.getElementById('fb-cfg'), ni = document.getElementById('nb-id-inp');
      if (!ta || !ni) return { why: 'no setup screen' };
      ni.value = 'nb-something-else';
      ta.value = txt; ta.dispatchEvent(new Event('input', { bubbles: true }));
      const idAfterPaste = ni.value;
      window.initAuth = async () => {};   /* test-only: no Google sign-in */
      try { await connectSync(); } catch (e) {}
      return { idAfterPaste, saved: getSyncConfig() };
    }, [PC, copied]);
    r.check(out.idAfterPaste === 'nb-same-id' && out.saved && out.saved.notebookId === 'nb-same-id' && out.saved.firebaseConfig && out.saved.firebaseConfig.projectId === 'tablet-proj',
      '105d pasting the copied setup on the other device fills the notebook ID, and Connect saves the tablet\'s project and ID', JSON.stringify(out).slice(0, 220));
    errs.push(...app.errors.filter((e) => !/initAuth|firebase|Failed to load/i.test(e)));
  } finally { await app.close(); }
}
r.check(errs.length === 0, '105e no page errors', errs.slice(0, 3).join(' | '));
process.exit(r.finish() ? 1 : 0);
