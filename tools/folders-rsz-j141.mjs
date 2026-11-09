#!/usr/bin/env node
/* tools/folders-rsz-j141.mjs — v05.82, J141 (block 141): 📁 Manage folders (a note's folder dialog) resizes from every side and corner, moves by its title,
   and goes ⛶ full screen. The Folder Browser keeps its own remembered place.

   node tools/folders-rsz-j141.mjs

   141a  at 390 / 820 / 1440: Manage folders is reached by REAL taps/clicks from a booted app (a note opened from the middle pane, then 📎 Attach → Folder)
   141b  at 820 / 1440: each of the 8 handles dragged — the box changes in the right direction(s), stays inside the window (also dragged far past it), reopening
         restores the size; the Folder Browser's remembered place is untouched and the reverse; one finger drag at 820
   141c  ⛶ fills the window and goes back at all three sizes; at 390 there are no handles (and 8 at 820 / 1440, hidden while full screen)
   141d  in a resized box and in a full-screen box: tick a folder, search, ＋ New folder in a chosen parent — the note's folderIds are right, and search, Inside,
         the new-folder row and Done stay on screen (measured, and the point at each one's centre belongs to it)
   141e  no page errors; no horizontal page scroll at 390
   note  a full-screen box is per session: it is NOT kept when the dialog is opened again (＋ New folder re-opens the dialog) — reported, not changed. */
import { openApp, seedDB, touchDrag } from './harness.mjs';
import { check, results } from './s1-fake.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const note = (s) => console.log('  note  ' + s);
const VPS = [{ name: '390', w: 390, h: 844 }, { name: '820', w: 820, h: 1180 }, { name: '1440', w: 1440, h: 900 }];
const KEY = 'siyagah-mb-attach-geom', OLD = 'siyagah-mb-popout-geom';
const MARK = JSON.stringify({ wPct: 40, hPct: 50, lPct: 10, tPct: 10, mark: 'j141' });
const DIRS = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

const rectOf = (page) => page.evaluate(() => { const r = document.getElementById('mb').getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; });
const inside = (r, W, H) => r.l >= -0.5 && r.t >= -0.5 && r.r <= W + 0.5 && r.b <= H + 0.5;
const near = (a, b, e = 2) => Math.abs(a - b) <= e;
const tapOrClick = (page, touch, loc) => (touch ? loc.tap() : loc.click());
const openDlg = async (page) => { await page.evaluate(() => { closeModal(); showArtFolderPicker('a1'); }); await sleep(250); };
const visTap = async (page, touch, sel) => {
  const loc = page.locator(sel).filter({ visible: true }).first();
  if (!(await loc.count())) return false;
  await tapOrClick(page, touch, loc); await sleep(350); return true;
};
/* 📎 Attach → Folder, by real taps (the way block 40 reaches it) */
async function reach(page, touch) {
  const A = '#p3h [onclick^="openAttachMenu"]';
  if (!(await visTap(page, touch, A))) {
    if (!((await visTap(page, touch, '#p3h .pop-details-btn')) && (await visTap(page, touch, A)))) {
      await visTap(page, touch, '#p3h [onclick*="_p3NtiPalette"]');
      await visTap(page, touch, '[onclick^="openAttachMenu"]');
    }
  }
  return visTap(page, touch, '#ctx .ci:has-text("Folder"), .eb-act:has-text("Folder")');
}
/* the four things the owner must always see, and Done: on the screen, and the point at the centre of each is its own */
const onScreen = (page) => page.evaluate(() => {
  const W = innerWidth, H = innerHeight, out = {};
  const mb = document.getElementById('mb');
  const done = [...mb.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Done');
  const add = [...mb.querySelectorAll('button')].find((b) => /New folder/.test(b.textContent));
  const els = { search: document.getElementById('fp-srch'), inside: document.getElementById('af-in'), newName: document.getElementById('npf'), newBtn: add, done };
  for (const k in els) {
    const e = els[k]; if (!e) { out[k] = 'missing'; continue; }
    const r = e.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const hit = document.elementFromPoint(cx, cy);
    out[k] = (r.width > 0 && r.height > 0 && r.left >= -0.5 && r.top >= -0.5 && r.right <= W + 0.5 && r.bottom <= H + 0.5 && hit && (e === hit || e.contains(hit))) ? 'ok' : `off ${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)} in ${W}x${H}`;
  }
  return out;
});
const allOn = (o) => Object.values(o).every((v) => v === 'ok');
const hScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.body.scrollWidth <= innerWidth + 1);

for (const vp of VPS) {
  const touch = vp.w < 1200, phone = vp.w < 640;
  const s = await openApp({ viewport: { width: vp.w, height: vp.h }, db: seedDB(), hasTouch: touch });
  const { page } = s;
  let scrollOk = true;
  try {
    /* ── 141a ── */
    await page.evaluate(() => { selFolder('f1'); if (innerWidth < 640) showPane('p2'); });
    await sleep(500);
    /* tap near the card's top-left: its centre can be the badge (which has its own tap) */
    await (touch ? page.locator('#p2 .ar[data-aid="a1"]').first().tap({ position: { x: 24, y: 10 } }) : page.locator('#p2 .ar[data-aid="a1"]').first().click({ position: { x: 24, y: 10 } }));
    await sleep(700);
    const hit = await reach(page, touch);
    const st = await page.evaluate(() => { const l = document.getElementById('fp-list'); const row = l && l.querySelector('.pr[data-fid="f2"]'); const b = row && row.getBoundingClientRect(); return { open: !!l, top: !!b && row.contains(document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)), title: (document.querySelector('#mb .mt') || {}).textContent, fs: !!document.getElementById('mb-fs') }; });
    check(hit && st.open && st.top && /Manage folders/.test(st.title || '') && st.fs, `141a ${vp.name}: real ${touch ? 'taps' : 'clicks'} (note from the middle pane → 📎 Attach → Folder) open Manage folders, on top, with ⛶`, JSON.stringify({ hit, st }));
    scrollOk = scrollOk && (await hScroll(page));

    /* ── 141c (handles and ⛶) ── */
    const nH = await page.evaluate(() => document.querySelectorAll('#mb > .rsz').length);
    check(phone ? nH === 0 : nH === 8, `141c ${vp.name}: ${phone ? 'no resize handles on the phone sheet' : '8 handles (4 sides, 4 corners)'}`, `handles ${nH}`);
    const r0 = await rectOf(page);
    await tapOrClick(page, touch, page.locator('#mb-fs'));
    await sleep(300);
    const rf = await rectOf(page);
    const hid = await page.evaluate(() => [...document.querySelectorAll('#mb > .rsz')].every((h) => getComputedStyle(h).display === 'none'));
    const lab = await page.evaluate(() => document.getElementById('mb-fs').getAttribute('aria-label'));
    check(near(rf.l, 0, 1) && near(rf.t, 0, 1) && near(rf.w, vp.w, 1.5) && near(rf.h, vp.h, 1.5) && hid && /Exit/.test(lab), `141c ${vp.name}: ⛶ fills the window (handles hidden, button says Exit)`, JSON.stringify({ rf, hid, lab }));
    scrollOk = scrollOk && (await hScroll(page));
    await tapOrClick(page, touch, page.locator('#mb-fs'));
    await sleep(300);
    const rb = await rectOf(page);
    check(near(rb.l, r0.l, 2) && near(rb.t, r0.t, 2) && near(rb.w, r0.w, 2) && near(rb.h, r0.h, 2), `141c ${vp.name}: ⛶ again goes back to the box it was`, JSON.stringify({ r0, rb }));
    const keyAfterFs = await page.evaluate((k) => localStorage.getItem(k), KEY);
    check(keyAfterFs === null || (JSON.parse(keyAfterFs).wPct < 99.5), `141c ${vp.name}: full screen is not remembered as the box's place`, String(keyAfterFs));

    if (!phone) {
      /* ── 141b ── */
      await page.evaluate((m) => { localStorage.setItem('siyagah-mb-popout-geom', m); }, MARK);
      const rows = [];
      for (const d of DIRS) {
        await page.evaluate((k) => { localStorage.removeItem(k); }, KEY);
        await openDlg(page);
        const a = await rectOf(page);
        const hc = await page.evaluate((d) => { const r = document.querySelector('#mb > .rsz-' + d).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, d);
        await page.mouse.move(hc.x, hc.y); await page.mouse.down();
        const dx = d.includes('e') ? 60 : d.includes('w') ? -60 : 0, dy = d.includes('s') ? 60 : d.includes('n') ? -60 : 0;
        for (let i = 1; i <= 6; i++) { await page.mouse.move(hc.x + dx * i / 6, hc.y + dy * i / 6); await sleep(16); }
        await page.mouse.up(); await sleep(150);
        const b = await rectOf(page);
        const okH = d.includes('e') ? b.w > a.w + 20 && near(b.l, a.l) : d.includes('w') ? b.w > a.w + 20 && b.l < a.l - 20 : near(b.w, a.w);
        const okV = d.includes('s') ? b.h > a.h + 20 && near(b.t, a.t) : d.includes('n') ? b.h > a.h + 20 && b.t < a.t - 20 : near(b.h, a.h);
        await openDlg(page);
        const c = await rectOf(page);
        const kept = near(c.w, b.w, 2) && near(c.h, b.h, 2) && near(c.l, b.l, 2) && near(c.t, b.t, 2);
        rows.push({ d, ok: okH && okV && inside(b, vp.w, vp.h) && kept, a, b, c });
      }
      check(rows.every((x) => x.ok), `141b ${vp.name}: all 8 handles — right direction(s), inside the window, size restored on reopening`, JSON.stringify(rows.filter((x) => !x.ok).slice(0, 2)));
      /* dragged far past the window */
      const far = [];
      for (const [d, sx, sy] of [['se', 1, 1], ['nw', -1, -1], ['ne', 1, -1], ['sw', -1, 1]]) {
        await openDlg(page);
        const hc = await page.evaluate((d) => { const r = document.querySelector('#mb > .rsz-' + d).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, d);
        await page.mouse.move(hc.x, hc.y); await page.mouse.down();
        await page.mouse.move(Math.max(0, Math.min(vp.w - 1, hc.x + sx * 3000)), Math.max(0, Math.min(vp.h - 1, hc.y + sy * 3000)), { steps: 8 });
        await page.mouse.up(); await sleep(150);
        const b = await rectOf(page);
        far.push({ d, ok: inside(b, vp.w, vp.h), b });
      }
      check(far.every((x) => x.ok), `141b ${vp.name}: a handle dragged far outside the window keeps the box inside it`, JSON.stringify(far.filter((x) => !x.ok)));
      /* move by the title, stays inside, is remembered */
      await page.evaluate((k) => { localStorage.removeItem(k); }, KEY);
      await openDlg(page);
      const m0 = await rectOf(page);
      const tt = await page.evaluate(() => { const r = document.querySelector('#mb .mt > span').getBoundingClientRect(); return { x: r.left + 4, y: r.top + r.height / 2 }; });
      await page.mouse.move(tt.x, tt.y); await page.mouse.down(); await page.mouse.move(tt.x - 80, tt.y + 40, { steps: 6 }); await page.mouse.up(); await sleep(150);
      const m1 = await rectOf(page);
      await openDlg(page);
      const m2 = await rectOf(page);
      check(near(m1.l, m0.l - 80, 3) && near(m1.t, m0.t + 40, 3) && inside(m1, vp.w, vp.h) && near(m2.l, m1.l, 2) && near(m2.t, m1.t, 2), `141b ${vp.name}: the title moves the box, and the place is remembered`, JSON.stringify({ m0, m1, m2 }));
      /* one finger on a corner (touch handles are bigger) */
      if (touch) {
        await page.evaluate((k) => { localStorage.removeItem(k); }, KEY);
        await openDlg(page);
        const a = await rectOf(page);
        const hc = await page.evaluate(() => { const r = document.querySelector('#mb > .rsz-se').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; });
        const pts = []; for (let i = 0; i <= 8; i++) pts.push({ x: hc.x + 50 * i / 8, y: hc.y + 50 * i / 8 });
        await touchDrag(page, pts); await sleep(200);
        const b = await rectOf(page);
        check(b.w > a.w + 30 && b.h > a.h + 30 && inside(b, vp.w, vp.h) && hc.w >= 28 && hc.h >= 28, `141b ${vp.name}: one finger on a corner resizes (touch corner ≥ 28 px)`, JSON.stringify({ a, b, hc }));
      }
      /* the two remembered places do not touch each other */
      const k1 = await page.evaluate((k) => localStorage.getItem(k), KEY);
      const old1 = await page.evaluate((k) => localStorage.getItem(k), OLD);
      check(!!k1 && old1 === MARK, `141b ${vp.name}: Manage folders wrote its own key, and the Folder Browser's key is untouched`, JSON.stringify({ k1: !!k1, old1 }));
      try {
        await page.evaluate(() => { closeModal(); openPicker(); }); await sleep(300);
        const hc = await page.evaluate(() => { const e = document.querySelector('#mb > .rsz-se'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
        if (hc) {
          await page.mouse.move(hc.x, hc.y); await page.mouse.down(); await page.mouse.move(hc.x - 40, hc.y - 40, { steps: 5 }); await page.mouse.up(); await sleep(150);
          const old2 = await page.evaluate((k) => localStorage.getItem(k), OLD);
          const k2 = await page.evaluate((k) => localStorage.getItem(k), KEY);
          check(old2 !== MARK && k2 === k1, `141b ${vp.name}: resizing the Folder Browser changes only its own key, not Manage folders'`, JSON.stringify({ oldChanged: old2 !== MARK, attachSame: k2 === k1 }));
        } else check(false, `141b ${vp.name}: the Folder Browser (openPicker) shows its handles`, 'no .rsz-se');
      } catch (e) { check(false, `141b ${vp.name}: the reverse check threw`, String(e.message || e).split('\n')[0]); }
      await page.evaluate(() => closeModal());
    }
    scrollOk = scrollOk && (await hScroll(page));

    /* ── 141d ── */
    const stages = phone ? ['sheet', 'fullscreen'] : ['resized', 'fullscreen'];
    let n = 0;
    for (const stage of stages) {
      n++;
      await page.evaluate(() => { const a = DB.articles.find((x) => x.id === 'a1'); a.folderIds = ['f1']; persist(); closeModal(); });
      if (stage === 'resized') await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ wPct: 60, hPct: 70, lPct: 15, tPct: 12 })), KEY);
      await openDlg(page);
      if (stage === 'fullscreen') { await tapOrClick(page, touch, page.locator('#mb-fs')); await sleep(300); }
      const box = await rectOf(page);
      const on0 = await onScreen(page);
      check(allOn(on0), `141d ${vp.name} ${stage}: search, Inside, the new-folder row and Done are on the screen`, JSON.stringify(on0));
      await tapOrClick(page, touch, page.locator('#fp-list .pr[data-fid="f2"] .pc').first()); await sleep(300);
      const ids1 = await page.evaluate(() => DB.articles.find((x) => x.id === 'a1').folderIds.slice());
      check(ids1.includes('f2') && ids1.includes('f1'), `141d ${vp.name} ${stage}: ticking a folder adds it to the note`, JSON.stringify(ids1));
      await page.locator('#fp-srch').fill('Second'); await sleep(250);
      const sr = await page.evaluate(() => ({ rows: [...document.querySelectorAll('#fp-list .pr')].map((r) => r.dataset.fid), q: document.getElementById('fp-srch').value }));
      const on1 = await onScreen(page);
      check(sr.rows.includes('f2') && allOn(on1), `141d ${vp.name} ${stage}: searching keeps the list and everything on the screen`, JSON.stringify({ sr, on1 }));
      await page.locator('#fp-srch').fill(''); await sleep(250);
      await tapOrClick(page, touch, page.locator('#fp-list .pr[data-fid="f2"] .af-plus').first()); await sleep(250);
      const lbl = await page.evaluate(() => document.getElementById('af-in').textContent);
      await page.locator('#npf').fill('J141 kid ' + n);
      await tapOrClick(page, touch, page.locator('#mb button', { hasText: 'New folder' }).first()); await sleep(600);
      const res = await page.evaluate((nm) => { const f = DB.folders.find((x) => (x.name || '').includes(nm)); const a = DB.articles.find((x) => x.id === 'a1'); return { f: f ? { parent: f.parentId, stamped: !!f.updatedAt } : null, ticked: !!f && a.folderIds.includes(f.id), keep: a.folderIds.includes('f1') && a.folderIds.includes('f2'), fsOn: !!document.getElementById('mb') && document.getElementById('mb').classList.contains('mb-fs-on') }; }, 'J141 kid ' + n);
      check(/Second/.test(lbl) && res.f && res.f.parent === 'f2' && res.f.stamped && res.ticked && res.keep, `141d ${vp.name} ${stage}: ＋ New folder inside the chosen parent is made, ticked for the note, the other ticks kept`, JSON.stringify({ lbl, res }));
      const on2 = await onScreen(page);
      check(allOn(on2), `141d ${vp.name} ${stage}: after ＋ New folder (the dialog is drawn again) everything is still on the screen`, JSON.stringify(on2));
      if (stage === 'fullscreen') {
        const rF = await rectOf(page);
        check(res.fsOn && near(rF.w, vp.w, 1.5) && near(rF.h, vp.h, 1.5), `141d ${vp.name} fullscreen: full screen is kept across ＋ New folder (the dialog is drawn again)`, JSON.stringify({ fsOn: res.fsOn, rF }));
      }
      const rD = await rectOf(page);
      check(stage !== 'resized' || (near(rD.w, box.w, 3) && near(rD.h, box.h, 3)), `141d ${vp.name} ${stage}: the resized box keeps its size after ＋ New folder`, JSON.stringify({ box, rD }));
      scrollOk = scrollOk && (await hScroll(page));
    }
    await page.evaluate(() => closeModal());
  } catch (e) {
    check(false, `141 ${vp.name} threw`, String(e && e.stack || e).slice(0, 500));
  }
  check(s.errors.length === 0, `141e ${vp.name}: no page errors`, s.errors.slice(0, 3).join(' | '));
  if (phone) check(scrollOk, '141e 390: no horizontal page scroll (with the dialog, full screen, after ＋ New folder)', '');
  await s.close();
}
const bad = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - bad}/${results.length} passed${bad ? ', ' + bad + ' FAILED' : ''}`);
process.exit(bad ? 1 : 0);
