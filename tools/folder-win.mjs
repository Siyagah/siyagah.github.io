#!/usr/bin/env node
/* tools/folder-win.mjs — v05.64, J100 + J101 + the R3 follow-up. Block 122, real clicks / long-presses at 390 (touch) / 820 (touch) / 1440 (mouse):
   122a  a folder popped out of the side pane (right-click; a long-press on touch) is a window as big as the side pane (±2 px; a phone: a full-width sheet)
   122b  from inside it a subfolder pops out: a second window of the first one's size, cascaded 24 px (clamped), the first still open
   122c  popping out the first folder again brings it forward: no third window
   122d  in a window: open a folder (Pane 2 lists its notes), rename, make a subfolder, drop a note on a folder — the DB result is what the side pane gives
   122e  a received merge that renames the folder redraws the window's title and rows; trashing it closes the window with a toast and writes nothing
   122f  nothing about windows is in DB, the `notebook` record or localStorage; a reload with two windows open brings both back at their places
   122g  the 🗂 MyDatabase heading renames by a real click; db-section.name + updatedAt moved; merges both ways; the folders filed under it by id stay put
   122h  a Drive answer of 401 clears the kept token (the next press asks again); a 403 for quota keeps it
   122i  no page errors
   `node tools/folder-win.mjs` */
import { openApp, report, seedDB } from './harness.mjs';

const r = report('J100/J101 — folder windows, the MyDatabase heading, the Drive 401');
const now = new Date().toISOString();
const seed = () => {
  const db = seedDB(now);
  db.folders.push({ id: 'f3', name: '(003) Target', parentId: null, order: 3, sectionId: 'sec-1', updatedAt: now });
  db.sections.push({ id: 'db-section', name: 'MyDatabase', order: 9999, updatedAt: now });
  db.folders.push({ id: 'mydb-root', name: '🗄 MyDatabase', parentId: null, order: 1, sectionId: 'db-section', updatedAt: now });
  db.folders.push({ id: 'mydb-p-x', name: 'Project X', parentId: 'mydb-root', order: 1, sectionId: 'db-section', updatedAt: now });
  return db;
};
const rect = (page, sel) => page.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return null; const c = e.getBoundingClientRect(); return { l: Math.round(c.left), t: Math.round(c.top), w: Math.round(c.width), h: Math.round(c.height) }; }, sel);
const winRect = (page, id) => page.evaluate((id) => { const e = [...document.querySelectorAll('.fwin')].find((x) => x.dataset.fwid === id); if (!e) return null; const c = e.getBoundingClientRect(); return { l: Math.round(c.left), t: Math.round(c.top), w: Math.round(c.width), h: Math.round(c.height), ttl: e.querySelector('.fwin-ttl').textContent, rows: [...e.querySelectorAll('[data-fid]')].map((x) => x.dataset.fid) }; }, id);
const nWins = (page) => page.evaluate(() => document.querySelectorAll('.fwin').length);

for (const [W, H, touch] of [[390, 844, true], [820, 1180, true], [1440, 900, false]]) {
  const tier = W < 640 ? 'phone' : W < 1200 ? 'tablet' : 'pc';
  const app = await openApp({ viewport: { width: W, height: H }, hasTouch: touch, db: seed() });
  const { page, ctx } = app;
  const cdp = touch ? await ctx.newCDPSession(page) : null;
  /* a real menu for a row: right-click, or a 700 ms finger */
  const menuOn = async (scope, fid) => {
    const row = page.locator(`${scope} .tr-row[data-fid="${fid}"]`).first();
    await row.scrollIntoViewIfNeeded();
    if (!touch) await row.click({ button: 'right' });
    else {
      const b = await row.boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      await page.waitForTimeout(750);   /* the finger stays down: the menu opens under it, and the lift would land on the menu (an existing trait of the side pane's long-press too) */
      held = { x, y };
    }
    await page.waitForTimeout(300);
  };
  let held = false;
  /* the finger slides away before it lifts, so the browser sends no click that could land on the menu or the dialog that opened */
  const lift = async () => { if (held) { const p = held; held = false; await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x + 60, y: p.y + 60 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(200); } };
  const pickMenu = async (re) => {
    const items = await page.evaluate(() => [...document.querySelectorAll('#ctx .ci')].map((x) => x.textContent.trim()));
    const i = items.findIndex((t) => re.test(t)); if (i < 0) { await lift(); return false; }
    const l = page.locator('#ctx .ci').nth(i);
    if (touch) await page.evaluate((i) => document.querySelectorAll('#ctx .ci')[i].click(), i);
    else await l.click();
    await lift(); await page.waitForTimeout(300); return true;
  };
  try {
    if (tier !== 'pc') await page.evaluate(() => showPane('sb'));
    await page.evaluate(() => { ST.secOpen['sec-1'] = true; renderTree(); });
    await page.waitForTimeout(300);
    /* 122a */
    const sbR = await rect(page, '#sb');
    await menuOn('#tree', 'f1'); const got1 = await pickMenu(/Pop out into window/);
    const A = await winRect(page, 'f1');
    const sameSize = !!A && (tier === 'phone' ? A.w === W : Math.abs(A.w - Math.min(W, sbR.w)) <= 2) && Math.abs(A.h - Math.min(H, sbR.h)) <= (tier === 'phone' ? 700 : 2);
    r.check(got1 && sameSize && A.rows.includes('f1') && A.rows.includes('f1a'), `122a@${W} a folder pops out at the side pane's size${tier === 'phone' ? ' (a full-width sheet)' : ''}, with its rows`, JSON.stringify({ sbR, A }));
    /* 122b */
    await menuOn('.fwin[data-fwid="f1"]', 'f1a'); const got2 = await pickMenu(/Pop out into window/);
    const B = await winRect(page, 'f1a'), A2 = await winRect(page, 'f1');
    const cas = tier === 'phone' ? (B && B.w === W) : (B && Math.abs(B.w - A.w) <= 2 && Math.abs(B.h - A.h) <= 2 && B.l >= A.l && B.t >= A.t && (A.l + A.w + 24 > W ? true : Math.abs(B.l - (A.l + 24)) <= 2));
    r.check(got2 && cas && A2 && (await nWins(page)) === 2, `122b@${W} from inside a window a subfolder pops out too: A's size, cascaded, A still open`, JSON.stringify({ A, B, A2 }));
    /* 122c */
    await page.evaluate(() => { _fwCtxFrom = null; openFolderWin('f1'); });
    await page.waitForTimeout(200);
    const top = await page.evaluate(() => _fwWins[_fwWins.length - 1].id);
    r.check((await nWins(page)) === 2 && top === 'f1', `122c@${W} popping out the first folder again brings it forward, no third window`, `windows=${await nWins(page)} top=${top}`);
    /* 122d — in the window of f1 */
    await page.evaluate(() => { _fwClose('f1a'); });
    await page.evaluate(() => { _fwTuck(false); });
    const sideRes = await page.evaluate(() => { selFolder('f2'); const s = { folder: ST.folder, p2: document.getElementById('p2c').textContent.includes('Archived') || document.getElementById('p2c').innerText.length }; return s; });
    await page.waitForTimeout(200);
    await page.locator('.fwin[data-fwid="f1"] .tr-row[data-fid="f1a"] .tr-name').first().click();
    await page.waitForTimeout(400);
    const open = await page.evaluate(() => ({ wasDrag: _wasDrag, ctx: document.getElementById('ctx').style.display, modal: !!document.querySelector('.mo,#modal,.modal-bg'), top: (() => { const r = document.querySelector('.fwin[data-fwid="f1"] .tr-row[data-fid="f1a"]'); if (!r) return 'no row'; const c = r.getBoundingClientRect(); const e = document.elementFromPoint(c.left + c.width / 2, c.top + c.height / 2); return e ? (e.className + '|' + (e.closest('.fwin') ? 'in-win' : 'out')) : 'none'; })(), folder: ST.folder, p2: document.getElementById('p2c').innerText, tucked: _fwTucked }));
    r.check(open.folder === 'f1a' && /Seeded note two/.test(open.p2) && sideRes.folder === 'f2', `122d@${W} a click on a window's row opens the folder: Pane 2 lists its notes${tier === 'phone' ? ' (the sheet tucks away)' : ''}`, JSON.stringify(open));
    if (tier === 'phone') await page.evaluate(() => _fwTuck(false));
    /* rename + subfolder through the window's own menu */
    await menuOn('.fwin[data-fwid="f1"]', 'f1a'); const gotR = await pickMenu(/Rename folder/);
    await page.locator('#inp').fill('(010) Renamed in window'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    await menuOn('.fwin[data-fwid="f1"]', 'f1a'); const gotS = await pickMenu(/Add subfolder/);
    await page.locator('#inp').fill('Made in window'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    const dbf = await page.evaluate(() => ({ nm: DB.folders.find((f) => f.id === 'f1a').name, kid: DB.folders.find((f) => /Made in window/.test(f.name)), side: [...document.querySelectorAll('#tree [data-fid]')].some((e) => e.textContent.includes('Renamed in window')), win: [...document.querySelectorAll('.fwin [data-fid]')].some((e) => e.textContent.includes('Made in window')) }));
    r.check(gotR && gotS && /Renamed in window/.test(dbf.nm) && dbf.kid && dbf.kid.parentId === 'f1a' && dbf.win, `122d@${W} rename and add-subfolder from a window change DB as in the side pane, and the window shows them`, JSON.stringify(dbf));
    /* a note dropped on a folder in the window (real drag on the PC) */
    if (!touch) {
      await page.evaluate(() => selFolder('f2')); await page.waitForTimeout(300);
      await page.locator('#p2c .ar').first().dragTo(page.locator('.fwin[data-fwid="f1"] .tr-row[data-fid="f1a"]'));
    } else await page.evaluate(() => { _artDragId = 'a3'; dDrop({ preventDefault() {} }, 'f1a'); });
    await page.waitForTimeout(300);
    const dropped = await page.evaluate(() => DB.articles.find((a) => a.id === 'a3').folderIds);
    r.check(dropped.includes('f1a') && dropped.includes('f2'), `122d@${W} a note dropped on a window's folder is filed there too, as on the side pane`, JSON.stringify(dropped));
    /* 122e */
    await page.evaluate(() => { const rem = JSON.parse(JSON.stringify(DB)); const f = rem.folders.find((x) => x.id === 'f1'); f.name = '(001) Merged name'; f.updatedAt = new Date(Date.now() + 5000).toISOString(); _mergeRemoteIn(rem, Date.now()); });
    await page.waitForTimeout(400);
    const A3 = await winRect(page, 'f1');
    r.check(A3 && /Merged name/.test(A3.ttl), `122e@${W} a received merge that renames the folder redraws the window's title`, JSON.stringify(A3 && A3.ttl));
    await page.evaluate(() => { _fwTuck(false); _fwCtxFrom = null; openFolderWin('f3'); }); await page.waitForTimeout(200);
    const open3 = !!(await winRect(page, 'f3'));
    const before = await page.evaluate(() => { trashFolder('f3'); return JSON.stringify(DB); });   /* the trash itself writes; the window closing must not */
    await page.waitForTimeout(400);
    const toastTxt = await page.evaluate(() => [...document.querySelectorAll('.toast')].map((t) => t.textContent).join(' | '));
    const after = await page.evaluate(() => JSON.stringify(DB));
    const stillF3 = await winRect(page, 'f3');
    r.check(open3 && !stillF3 && /Target/.test(toastTxt) && after === before, `122e@${W} a window whose folder is trashed closes itself with a toast, writing nothing`, JSON.stringify({ open3, toastTxt, stillF3: !!stillF3, same: after === before }));
    /* 122f */
    await page.evaluate(() => openFolderWin('f1')); await page.evaluate(() => { _fwCtxFrom = null; openFolderWin('f1a'); }); await page.waitForTimeout(300);
    const leak = await page.evaluate(() => { const ls = Object.keys(localStorage).map((k) => k + '=' + String(localStorage.getItem(k)).slice(0, 200000)).join('\n'); return { db: /fwin|"fw:|_fwWins/.test(JSON.stringify(DB)), ls: /fw:|fwin/.test(ls) }; });
    r.check(!leak.db && !leak.ls, `122f@${W} no window is in DB or localStorage`, JSON.stringify(leak));
    await page.waitForTimeout(500);
    const before2 = { a: await winRect(page, 'f1'), b: await winRect(page, 'f1a') };
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree')); await page.waitForTimeout(1200);
    const after2 = { a: await winRect(page, 'f1'), b: await winRect(page, 'f1a') };
    const same = (p, q) => p && q && Math.abs(p.l - q.l) <= 2 && Math.abs(p.t - q.t) <= 2 && Math.abs(p.w - q.w) <= 2 && Math.abs(p.h - q.h) <= 2;
    r.check(same(before2.a, after2.a) && same(before2.b, after2.b), `122f@${W} after a reload both windows are back at their places`, JSON.stringify({ before2, after2 }));
    /* 122g — only where the heading is reachable by a click on every size */
    await page.evaluate(() => { _fwWins.slice().forEach((w) => _fwClose(w.id)); showPane && innerWidth < 1200 && showPane('sb'); ST.dbOpen = true; renderTree(); });
    await page.waitForTimeout(300);
    const t0 = await page.evaluate(() => DB.sections.find((s) => s.id === 'db-section').updatedAt);
    await page.waitForTimeout(20);
    const hd = page.locator('#tree .db-hd-sec').first();
    if (!touch) await hd.click({ button: 'right' });
    else { const b = await hd.boundingBox(); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x + 60, y: b.y + b.height / 2 }] }); await page.waitForTimeout(750); held = { x: b.x + 60, y: b.y + b.height / 2 }; await page.waitForTimeout(300); }
    const gotRs = await pickMenu(/Rename section/);
    await page.locator('#sri-db-section').fill('My Data'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    const g = await page.evaluate(() => ({ s: DB.sections.find((x) => x.id === 'db-section'), head: document.querySelector('#tree .db-sec-nm') && document.querySelector('#tree .db-sec-nm').textContent, kid: DB.folders.find((f) => f.id === 'mydb-p-x'), root: DB.folders.find((f) => f.id === 'mydb-root') }));
    const merged = await page.evaluate(() => { const a = JSON.parse(JSON.stringify(DB)), b = JSON.parse(JSON.stringify(DB)); b.sections.find((s) => s.id === 'db-section').name = 'Older'; b.sections.find((s) => s.id === 'db-section').updatedAt = '2000-01-01T00:00:00.000Z'; const m1 = mergeDB(a, b); const c = JSON.parse(JSON.stringify(DB)); c.sections.find((s) => s.id === 'db-section').name = 'My Data'; const d = JSON.parse(JSON.stringify(DB)); d.sections.find((s) => s.id === 'db-section').name = 'Newer'; d.sections.find((s) => s.id === 'db-section').updatedAt = '2099-01-01T00:00:00.000Z'; const m2 = mergeDB(c, d); return [m1.sections.find((s) => s.id === 'db-section').name, m2.sections.find((s) => s.id === 'db-section').name]; });
    r.check(gotRs && g.s.name === 'My Data' && g.s.updatedAt > t0 && /My Data/.test(g.head) && g.kid.parentId === 'mydb-root' && g.root.sectionId === 'db-section' && merged[0] === 'My Data' && merged[1] === 'Newer',
      `122g@${W} the 🗂 MyDatabase heading renames (menu${touch ? ', long-press' : ', right-click'}); stamped, merges both ways; its folders stay put by id`, JSON.stringify({ g, merged }));
    /* 122h — the Drive token, once per run */
    if (tier === 'pc') {
      const dr = await page.evaluate(async () => {
        window.__driveToken = 'tok-1'; window.__driveAsks = 0;
        const realFetch = window.fetch; let status = 401, body = '{"error":{"code":401}}';
        window.fetch = async () => new Response(body, { status });
        await _driveToken(); const a1 = window.__driveAsks; await _driveToken(); const a2 = window.__driveAsks;
        try { await _uploadToDrive('tok-1', 'F', 'n.txt', new Blob(['x'])); } catch (e) {}
        await _driveToken(); const a3 = window.__driveAsks;
        status = 403; body = '{"error":{"errors":[{"reason":"rateLimitExceeded"}]}}';
        try { await _uploadToDrive('tok-1', 'F', 'n.txt', new Blob(['x'])); } catch (e) {}
        await _driveToken(); const a4 = window.__driveAsks;
        status = 403; body = '{"error":{"errors":[{"reason":"insufficientPermissions"}]}}';
        try { await _uploadToDrive('tok-1', 'F', 'n.txt', new Blob(['x'])); } catch (e) {}
        await _driveToken(); const a5 = window.__driveAsks;
        window.fetch = realFetch; window.__driveToken = ''; return [a1, a2, a3, a4, a5];
      });
      r.check(dr[0] === 1 && dr[1] === 1 && dr[2] === 2 && dr[3] === 2 && dr[4] === 3, '122h a Drive 401 (or an auth-type 403) clears the kept token so the next press asks again; a rate-limit 403 keeps it', JSON.stringify(dr));
    }
    r.check(app.errors.length === 0, `122i@${W} no page errors`, app.errors.join(' | '));
  } catch (e) {
    r.check(false, `122@${W} the check ran to the end`, String(e && e.stack || e).slice(0, 600));
  }
  await app.close();
}
process.exit(r.finish() ? 1 : 0);
