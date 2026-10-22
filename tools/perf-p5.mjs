#!/usr/bin/env node
/* tools/perf-p5.mjs — v05.41, P5: speed at the owner's scale, round 1 (PCF J61). Checks 100a–100e, at the laptop (1440×900) and the phone (390×844, CPU ×4).
   A notebook shaped like the owner's Evernote import, smaller (default 6,000 imported notes, 20 notebook folders under one root, ~2.5 KB each; `--notes=N`),
   built inside a real persistent profile (IndexedDB survives the reload and the kill). The guard scales: the checks count checkpoints and compare work done,
   they do not depend on this container's speed beyond the stated limits.

   100a  idle     after opening a note: NO journal checkpoint in the next 45 s (_ljStat.full unchanged) and no main-thread task over 250 ms (laptop) / 600 ms (phone);
                  a save followed by visibilitychange→hidden DOES checkpoint; a reload after it boots with the edit
   100b  crash    a save, then every process of the profile killed with SIGKILL before any checkpoint (journal only): the next boot has the edit (the journal overlay)
   100c  list     clicking a note in the finished list: the list node is the SAME one, exactly two cards changed class, the page equals a whole draw (_LIST_MIN=1e9,
                  _cardC.clear()), and the read view is there in < 400 ms (laptop) / < 1500 ms (phone ×4)
   100d  sidebar  with Smart Views and a section's Smart Views open: every number in the sidebar equals the one the old way gives (getSmartArts / getSecSmartArts
                  lengths, descOf + some), and the redraw is ≥ 3× faster than the old counting alone costs (phone ×4; the laptop's ratio is reported)
   100e  errors   no page errors

   `--unpatched` serves the build before this round (found with git log --grep="v05.41 P5: version bump"; throws if it is not in the clone). */
import { serveFixed, launch, med } from './perf-enx/common.mjs';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const arg = (k, d) => +((argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1]) || d;
const NOTES = arg('notes', 6000), IDLE = arg('idle', 45);
const results = [];
function check(ok, label, detail = '') { results.push({ ok, label }); console.log((ok ? '  ok   ' : ' FAIL  ') + label + (detail ? '\n         ' + String(detail).slice(0, 500) : '')); }
function makeBase() {
  const dir = mkdtempSync(join(tmpdir(), 'p5-base-'));
  const sha = execFileSync('git', ['log', '--format=%H', '-n', '1', '--grep=v05.41 P5: version bump'], { encoding: 'utf8' }).trim();
  if (!sha) throw new Error('makeBase: the commit "v05.41 P5: version bump" is not in this clone (shallow?) — refusing to compare the build with itself');
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', `${sha}~1:${f}`], { encoding: 'buffer', maxBuffer: 1 << 28 })); } catch {} }
  return dir;
}
const srv = await serveFixed(argv.includes('--unpatched') ? makeBase() : undefined);
const allErr = [];
const boot = async (page) => { await page.waitForFunction(() => window.__appBooted === true, null, { timeout: 300000 }); };

async function seed(page) {
  return page.evaluate(async (N) => {
    let s = 4242; const rnd = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const W = 'the of and to in is that for it with as was on be at by this have from or one had not but what all were when we there can an your which their said if do will each about how up out them then she many some'.split(' ');
    const words = (n) => { let r = ''; for (let i = 0; i < n; i++) r += W[(rnd() * W.length) | 0] + ' '; return r; };
    const sec = DB.sections[0].id, iso = (t) => new Date(t).toISOString(), now = Date.now();
    DB.folders.push({ id: 'p5-root', name: 'Evernote', parentId: null, order: 99, sectionId: sec, updatedAt: iso(now) });
    for (let i = 0; i < 20; i++) DB.folders.push({ id: 'p5-b' + i, name: 'Notebook ' + i, parentId: 'p5-root', order: i + 1, updatedAt: iso(now) });
    for (let i = 0; i < N; i++) {
      const cr = now - 864e5 * (3 + rnd() * 3000), up = cr + rnd() * (now - 864e5 * 3 - cr), nb = 'Notebook ' + (i % 20);
      let c = ''; while (c.length < 2500) c += '<div>' + words(10 + ((rnd() * 30) | 0)) + '</div>';
      if (i % 40 === 0) c += '<p>see <span class="mention" data-art="p5-n' + ((i + 1) % N) + '">x</span></p>';
      const a = { id: 'p5-n' + i, title: words(3 + (i % 5)).trim() + ' ' + i, content: c, folderIds: ['p5-b' + (i % 20)], tags: [], createdAt: iso(cr - (cr % 1000)), updatedAt: iso(up - (up % 1000)), fromEvernote: { nb, stack: '', k: 'k' + i, at: iso(now - i * 1000) } };
      if (i % 33 === 0) a.favourite = true;
      if (i % 97 === 0) { a.folderIds.push('p5-b' + ((i + 1) % 20)); }
      DB.articles.push(a);
    }
    persist(); await _ljChain.catch(() => {});
    _ljCheckpoint(); await new Promise((r) => setTimeout(r, 100)); await _ljChain.catch(() => {});
    return { notes: DB.articles.length, journal: _ljWanted(), sec };
  }, NOTES);
}

const VPS = [{ name: 'laptop', w: 1440, h: 900, th: 1, lt: 250, clickMs: 400 }, { name: 'phone ×4', w: 390, h: 844, th: 4, touch: true, lt: 600, clickMs: 1500 }];
for (const vp of VPS) {
  const P = mkdtempSync(join(tmpdir(), 'p5-prof-'));
  let { ctx, page, errors } = await launch(P, { w: vp.w, h: vp.h, touch: !!vp.touch });
  page.setDefaultTimeout(300000);
  try {
    await page.goto(srv.base + '/', { waitUntil: 'domcontentloaded' }); await boot(page);
    const info = await seed(page);
    console.log(`${vp.name}: ${info.notes} notes, journal mode ${info.journal}`);
    await page.reload({ waitUntil: 'domcontentloaded' }); await boot(page);
    await page.waitForTimeout(1500);
    const cdp = await ctx.newCDPSession(page);
    if (vp.th > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: vp.th });

    /* ── 100c: the list ── */
    await page.evaluate(() => { selFolder('sf-enx'); });
    await page.waitForFunction(() => !_listPending() && document.querySelectorAll('#p2c .ar').length > 100, null, { timeout: 300000 });
    await page.evaluate(() => { const c = document.querySelectorAll('#p2c .ar'); selArt(c[2].getAttribute('data-aid')); });   /* the first open: a whole draw, and a previous selection for the next */
    await page.waitForFunction(() => !_listPending() && document.querySelector('#p2c .ar.sel'), null, { timeout: 300000 });
    await page.waitForTimeout(500);
    const c1 = await page.evaluate(async () => {
      const al = document.querySelector('#p2c .al'); window.__al = al;
      const before = [...document.querySelectorAll('#p2c .ar')].map((e) => e.className);
      const card = document.querySelectorAll('#p2c .ar')[5]; const id = card.getAttribute('data-aid');
      const t = performance.now(); card.click();
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r)));
      const ms = Math.round(performance.now() - t);
      const after = [...document.querySelectorAll('#p2c .ar')].map((e) => e.className);
      let changed = 0; before.forEach((b, i) => { if (after[i] !== b) changed++; });
      const read = !!document.getElementById('p3c') && ST.article === id && document.getElementById('p3c').textContent.length > 20;
      const page1 = document.getElementById('p2c').innerHTML;
      const same = document.querySelector('#p2c .al') === window.__al;
      const lm = _LIST_MIN; _LIST_MIN = 1e9; _cardC.clear(); _p2cLast = null; renderP2C(); const whole = document.getElementById('p2c').innerHTML; _LIST_MIN = lm;
      return { ms, changed, same, read, equal: page1 === whole, cards: before.length };
    });
    check(c1.same && c1.changed === 2 && c1.equal && c1.read && c1.ms < vp.clickMs, `100c ${vp.name}: a click in a ${c1.cards}+ card list moves the highlight only`,
      `same node ${c1.same} · cards changed ${c1.changed} (want 2) · equals a whole draw ${c1.equal} · read view ${c1.read} · ${c1.ms} ms (limit ${vp.clickMs})`);

    /* ── 100d: the sidebar ── */
    const d = await page.evaluate(({ N }) => {
      const sec = DB.sections[0].id;
      ST.sfOpen = true; ST.secOpen[sec] = true; ST.secSFOpen = { [sec]: true }; DB.folders.forEach((f) => { ST.exp[f.id] = true; });
      renderTree();
      const tt = []; for (let i = 0; i < 5; i++) { const a = performance.now(); renderTree(); tt.push(performance.now() - a); }
      tt.sort((a, b) => a - b); const nu = tt[2];
      const oldCnt = (fid) => { const ids = descOf(fid); return DB.articles.filter((a) => a.folderIds.some((x) => ids.includes(x))).length; };
      const ot = []; for (let i = 0; i < 3; i++) { const a = performance.now(); sfOrdered().forEach((sf) => { getSmartArts(sf.id).length; getSecSmartArts(sec, sf.id).length; }); DB.folders.forEach((f) => oldCnt(f.id)); ot.push(performance.now() - a); }
      ot.sort((a, b) => a - b); const old = ot[1];
      let bad = [], seen = 0;
      document.querySelectorAll('#tree .sf-row[data-sfid]').forEach((r) => { seen++; const want = getSmartArts(r.getAttribute('data-sfid')).length, got = +r.querySelector('.tr-cnt').textContent; if (want !== got) bad.push(r.getAttribute('data-sfid') + ' ' + got + '≠' + want); });
      document.querySelectorAll('#tree .sec-sf-item').forEach((r) => { const m = /selSecSF\('([^']+)','([^']+)'\)/.exec(r.getAttribute('onclick')); if (!m) return; seen++; const want = getSecSmartArts(m[1], m[2]).length, e = r.querySelector('.sf-cnt'), got = e ? +e.textContent : 0; if (want !== got) bad.push(m[2] + '@' + m[1] + ' ' + got + '≠' + want); });
      document.querySelectorAll('#tree .tr-row[data-fid]').forEach((r) => { seen++; const f = r.getAttribute('data-fid'), want = oldCnt(f), got = +r.querySelector('.tr-cnt').textContent; if (want !== got) bad.push(f + ' ' + got + '≠' + want); });
      return { nu: +nu.toFixed(1), old: +old.toFixed(1), bad: bad.slice(0, 5), seen };
    }, { N: NOTES });
    const ratio = d.old / Math.max(0.1, d.nu);
    check(d.bad.length === 0 && d.seen > 30, `100d ${vp.name}: every count in the sidebar is the old answer (${d.seen} numbers)`, d.bad.join(' · '));
    const need = vp.th > 1 ? 3 : 0;
    check(ratio >= need, `100d ${vp.name}: the sidebar redraw (${d.nu} ms) against the old counting alone (${d.old} ms): ${ratio.toFixed(1)}×${need ? ' (want ≥ 3×)' : ' (reported)'}`);

    /* ── 100a: idle, then hide, then reload ── */
    const a1 = await page.evaluate(() => {
      window.__lt = []; try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(Math.round(e.duration)))).observe({ type: 'longtask' }); } catch {}
      return { full: _ljStat.full, timer: !!_ljCkptTimer };
    });
    await page.evaluate(() => { const c = document.querySelectorAll('#p2c .ar'); selArt(c[8].getAttribute('data-aid')); });
    await page.waitForTimeout(IDLE * 1000);
    const a2 = await page.evaluate(() => ({ full: _ljStat.full, lt: window.__lt.slice(), timer: !!_ljCkptTimer }));
    const maxLt = Math.max(0, ...a2.lt.filter((x) => true));
    check(a2.full === a1.full && maxLt <= vp.lt, `100a ${vp.name}: after opening a note nothing is copied in ${IDLE} s of idle`, `checkpoints ${a2.full - a1.full} (want 0) · worst task ${maxLt} ms (limit ${vp.lt}) · a timer is ${a2.timer ? 'armed' : 'not armed'}`);
    const ed = 'P5 EDIT ' + Date.now();
    const h = await page.evaluate(async (ed) => {
      const a = DB.articles[7]; a.title = ed; a.updatedAt = new Date().toISOString(); persist(); await _ljChain.catch(() => {});
      const full0 = _ljStat.full, ck0 = _ljCkpt, seq0 = _ljSeq;
      Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange'));
      for (let i = 0; i < 100 && _ljStat.full === full0; i++) await new Promise((r) => setTimeout(r, 50));
      await _ljChain.catch(() => {}); await new Promise((r) => setTimeout(r, 200));
      return { grew: _ljStat.full > full0, caught: _ljCkpt >= seq0, behind: seq0 > ck0, id: a.id };
    }, ed);
    check(h.grew && h.caught, `100a ${vp.name}: hiding the page copies the notebook (a save was ${h.behind ? 'ahead of' : 'at'} the last copy)`, JSON.stringify(h));
    await page.reload({ waitUntil: 'domcontentloaded' }); await boot(page);
    const t1 = await page.evaluate((id) => (DB.articles.find((a) => a.id === id) || {}).title, h.id);
    check(t1 === ed, `100a ${vp.name}: a reload after hiding boots with the edit`, String(t1));

    /* ── 100b: a kill with the edit only in the journal ── */
    const ed2 = 'P5 CRASH ' + Date.now();
    const k = await page.evaluate(async (ed2) => {
      const a = DB.articles[11]; a.title = ed2; a.updatedAt = new Date().toISOString(); persist(); await _ljChain.catch(() => {});
      return { id: a.id, journalOnly: _ljCkpt < _ljSeq, on: _ljOn };
    }, ed2);
    spawnSync('pkill', ['-9', '-f', P]);
    await new Promise((r) => setTimeout(r, 1500));
    try { await ctx.close(); } catch {}
    ({ ctx, page, errors } = await launch(P, { w: vp.w, h: vp.h, touch: !!vp.touch }));
    page.setDefaultTimeout(300000);
    await page.goto(srv.base + '/', { waitUntil: 'domcontentloaded' }); await boot(page);
    const t2 = await page.evaluate((id) => (DB.articles.find((a) => a.id === id) || {}).title, k.id);
    check(k.journalOnly && k.on && t2 === ed2, `100b ${vp.name}: killed with the edit only in the journal, the next boot has it`, `journal only ${k.journalOnly} · journal on ${k.on} · title after ${t2}`);
  } catch (e) { check(false, `100 ${vp.name}: ran to the end`, 'threw: ' + String(e.stack || e).split('\n').slice(0, 3).join(' | ')); }
  allErr.push(...errors);
  try { await ctx.close(); } catch {}
  spawnSync('pkill', ['-9', '-f', P]);
  rmSync(P, { recursive: true, force: true });
}
check(allErr.length === 0, '100e no page errors', allErr.slice(0, 3).join(' | '));
await srv.close();
const bad = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - bad}/${results.length} passed${bad ? `, ${bad} FAILED` : ''}`);
process.exit(bad ? 1 : 0);
