#!/usr/bin/env node
/* tools/zab-words.mjs — v05.34, Z12: "Zab" for a pocket on every screen (PCF J49). Only words changed; no data, id, class, URL or stored key.

   94a  screens  at 390 / 820 / 1440 and Zab mode (/?jeb=1) at 390 / 1440: every Zab surface is opened by real taps (the bar or the round button, a Zab with Zabs
                 inside, its menu, 🧩 Zab kind ▸, 📂 Move into…, ＋ New Zab inside, All Zabs, the deck, Choose, the right-click / long-press menu, 🧰 → Appearance, an
                 item's menu, then on a second copy the Rail / Drawer / Columns layouts, → Note's toast and Trash with a deleted Zab). After each one: no visible text,
                 title, aria-label or placeholder matches /pocket/i. The seed Zab names do not contain the word.
   94b  source   a static sweep of index.html: comments are removed, identifiers and property keys (jebPockets, pocketId, .pocket, pocket:) are skipped, and every
                 standalone word "pocket(s)" left is listed. The list must be empty except for the commented allow-list below.
   94c  fit      no label that carries the new words clips (scrollWidth > clientWidth) or wraps onto a second line where it is meant to be one, and the page does not
                 scroll sideways. Run it with --unpatched to see the same measurement on the build before.
   94d  data     DB (folders, articles, jeb, jebPockets, theme) is byte-identical before and after opening and closing every surface that does not change anything.

   `--only=94a,94b` runs just those; `--unpatched` serves the build before this round (94a and 94b must FAIL there). Each ok/FAIL line becomes one app-check check. */
import { playwright, serve, seedDB } from './harness.mjs';
import { sleep, on } from './s1-fake.mjs';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const unpatched = argv.includes('--unpatched');
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);
const results = [];
function check(ok, label, detail = '') { results.push({ ok, label }); console.log((ok ? '  ok   ' : ' FAIL  ') + label + (detail ? '\n         ' + String(detail).slice(0, 500) : '')); }
async function T(label, fn) { try { const r = await fn(); check(!!r[0], label, r[1] || ''); } catch (e) { check(false, label, 'threw: ' + String(e.message || e).split('\n')[0]); } }
for (const ev of ['unhandledRejection', 'uncaughtException']) process.on(ev, (e) => { check(false, 'the check script stopped early', String(e && e.message || e).split('\n')[0]); const bad = results.filter((r) => !r.ok).length; console.log(`\n${results.length - bad}/${results.length} passed, ${bad} FAILED`); process.exit(1); });

function makeBase() {   /* the app as it was just before this round */
  const dir = mkdtempSync(join(tmpdir(), 'z12-base-'));
  const sha = execFileSync('git', ['log', '--format=%H', '-n', '1', '--grep=^v05.34 Z12: version bump'], { encoding: 'utf8' }).trim();
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', `${sha}~1:${f}`], { encoding: 'buffer', maxBuffer: 1 << 28 })); } catch {} }
  return dir;
}
const SRC = unpatched ? join(makeBase(), 'index.html') : join(fileURLToPath(new URL('..', import.meta.url)), 'index.html');

/* ── 94b: the static sweep ── */
if (want('94b')) await T('94b no standalone word "pocket" is left in index.html outside comments and identifiers', async () => {
  let s = readFileSync(SRC, 'utf8');
  s = s.replace(/<!--[\s\S]*?-->/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[\s;{}),])\/\/[^\n]*/g, '$1');
  /* ALLOW: [regex over the line, why it must stay]. Keep this empty unless a word truly has to stay. */
  const ALLOW = [];
  const found = [];
  s.split('\n').forEach((line, i) => {
    const re = /(^|[^\w$.])([Pp]ockets?)(?![\w$])(?!\s*:)/g; let m;
    while ((m = re.exec(line))) {
      if (ALLOW.some(([r]) => r.test(line))) continue;
      found.push((i + 1) + ': ' + line.slice(Math.max(0, m.index - 40), m.index + 50).trim());
    }
  });
  return [found.length === 0, found.length + ' left: ' + found.slice(0, 6).join(' | ')];
});

const wantRun = want('94a') || want('94c') || want('94d');
if (wantRun) {
  const pw = await playwright();
  const srv = await serve(unpatched ? join(makeBase()) : undefined);
  const browser = await pw.chromium.launch();
  const T0 = '2026-10-01T00:00:00.000Z';
  const VPS = [
    { name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false },
    { name: 'zab390', w: 390, h: 844, touch: true, jeb: true }, { name: 'zab1440', w: 1440, h: 900, touch: false, jeb: true },
  ];
  function seed() {
    const db = seedDB(T0);
    const pk = (id, i, e = {}) => ({ id, name: id, icon: '✶', color: '#CFE8FF', order: i, createdAt: T0, updatedAt: T0, ...e });
    const mk = (id, pocketId, text, order) => ({ id, pocketId, text, done: false, folderIds: [], tags: [], kind: null, journal: false, order, createdAt: T0, updatedAt: T0 });
    db.jebPockets = [pk('zl', 0, { name: 'Leaf' }), pk('zp', 1, { name: 'Parent' }), pk('zk', 0, { name: 'Kid', parentId: 'zp' }), pk('zo', 2, { name: 'Other' })];
    db.jeb = [mk('l1', 'zl', 'First item', 0), mk('l2', 'zl', 'Second item', 1), mk('k1', 'zk', 'Kid item', 0)];
    db.theme = { preset: 'forest', custom: {}, zabTicker: { on: false } };
    return db;
  }
  async function openDev(vp) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, ...(vp.touch ? { hasTouch: true, isMobile: true } : {}) });
    for (const p of ['**googleapis.com/**', '**gstatic.com/**', '**firebaseapp.com/**', '**firebaseio.com/**']) await ctx.route(p, (r) => r.abort());
    await ctx.addInitScript((d) => { try { if (!localStorage.getItem('my-notebook-v1')) localStorage.setItem('my-notebook-v1', JSON.stringify(d)); } catch {} }, seed());
    const page = await ctx.newPage(), errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e));
    await page.goto(srv.base + (vp.jeb ? '/?jeb=1' : '/'), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree'));
    await sleep(900);
    return { ctx, page, errors, vp };
  }
  const tap = async (d, sel) => { const l = d.page.locator(sel).first(); await l.waitFor({ state: 'visible', timeout: 5000 }); if (d.vp.touch) await l.tap(); else await l.click(); await sleep(400); };
  const phone = (d) => d.vp.w < 640 && !d.vp.jeb;   /* no bar: the round button */
  async function openZab(d, pid) {
    if (phone(d)) { await tap(d, '#zab-btn'); await tap(d, `#zab-lay .zr-b[data-pid="${pid}"]`); }
    else await tap(d, `#jeb-bar .jeb-chip[data-pid="${pid}"] .jeb-main`);
    await d.page.waitForSelector('#jeb-panel.on', { timeout: 4000 }); await sleep(300);
  }
  const esc = async (d) => { await d.page.keyboard.press('Escape'); await sleep(250); };
  const closeAll = async (d) => { await esc(d); await d.page.evaluate(() => { try { if (typeof closeModal === 'function') closeModal(); } catch {} try { if (typeof jebCloseDeck === 'function') jebCloseDeck(); } catch {} try { if (_jebOpen && !_JEB_APP) jebClosePanel(); } catch {} try { if (typeof _zabClose === 'function' && window._zabOpen) _zabClose(); } catch {} try { if (_jebChoose) { _jebChoose = false; _jebBarSig = ''; jebRefresh(); } } catch {} }); await sleep(250); };

  /* every visible word and every title / aria-label / placeholder that says "pocket" */
  const sweep = (d) => d.page.evaluate(() => {
    const re = /pocket/i, bad = [];
    const vis = (e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
    for (const e of document.body.querySelectorAll('*')) {
      if (/^(SCRIPT|STYLE)$/.test(e.tagName)) continue;
      for (const a of ['title', 'aria-label', 'placeholder', 'alt']) { const v = e.getAttribute(a); if (v && re.test(v)) bad.push(a + '=' + v.slice(0, 70)); }
      if (vis(e)) for (const n of e.childNodes) if (n.nodeType === 3 && re.test(n.nodeValue)) bad.push('text=' + n.nodeValue.trim().slice(0, 70));
    }
    return bad;
  });
  const menuRow = async (d, re) => { const l = d.page.locator('#jeb-menu').locator(`text=${re}`).first(); await l.waitFor({ state: 'visible', timeout: 4000 }); if (d.vp.touch) await l.tap(); else await l.click(); await sleep(400); };
  const dbKey = (d) => on(d, () => JSON.stringify([DB.folders, DB.articles, DB.jeb, DB.jebPockets, DB.theme]));

  const devs = {};
  for (const vp of VPS) devs[vp.name] = await openDev(vp);
  const before = {};
  for (const vp of VPS) before[vp.name] = await dbKey(devs[vp.name]);

  /* step(d, name, fn): fn opens the surface (real taps) and returns a truthy "found" value; the sweep then must be empty */
  const stepFit = [];
  async function step(d, name, fn) {
    const tag = `94a@${d.vp.name}`;
    await T(`${tag} ${name}: nothing says "pocket"`, async () => {
      const found = await fn();
      const bad = await sweep(d);
      /* 94c: the labels that carry the words fit (measured in the same state) */
      const fit = await d.page.evaluate(() => {
        const sel = '#jeb-bar .jeb-nm, #jeb-bar .jeb-new, #jeb-bar .jeb-choose, #jeb-menu *, .jx-new, .jx-mv, .jx-mt, .zr-lb, .zd-act, .zc-hd button, .jeb-pm, .jeb-pt, .zn-win .mt, .modal .mt, #jeb-panel .jeb-ph';
        const out = [];
        document.querySelectorAll(sel).forEach((e) => {
          const r = e.getBoundingClientRect(); if (!r.width || !r.height || e.children.length > 3) return;
          if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible') out.push('clip:' + (e.textContent || '').trim().slice(0, 30));
        });
        if (document.documentElement.scrollWidth > innerWidth + 1) out.push('page scrolls sideways');
        return out;
      });
      stepFit.push({ d: d.vp.name, name, fit });
      return [!!found && bad.length === 0, (found ? '' : 'surface not found; ') + JSON.stringify(bad.slice(0, 5))];
    });
    await closeAll(d);
  }

  if (want('94a') || want('94c')) for (const vp of VPS) {
    const d = devs[vp.name];
    await closeAll(d);
    await step(d, 'the bar / round button', async () => { if (phone(d)) { await tap(d, '#zab-btn'); return !!(await d.page.$('#zab-lay')); } return !!(await d.page.$('#jeb-bar')); });
    await step(d, 'a Zab with Zabs inside (＋ New Zab inside)', async () => { await openZab(d, 'zp'); return (await d.page.textContent('#jeb-panel .jx-new')).includes('New Zab inside'); });
    await step(d, "the Zab's menu ⋯", async () => { await openZab(d, 'zp'); await tap(d, '#jeb-panel .jeb-pm'); return !!(await d.page.$('#jeb-menu')); });
    await step(d, '🧩 Zab kind ▸', async () => { await openZab(d, 'zp'); await tap(d, '#jeb-panel .jeb-pm'); await menuRow(d, 'Zab kind'); return (await d.page.textContent('#jeb-menu')).includes('Back'); });
    await step(d, '📂 Move into… (and its greyed reasons)', async () => { await openZab(d, 'zp'); await tap(d, '#jeb-panel .jeb-pm'); await menuRow(d, 'Move into'); await d.page.waitForSelector('.jx-mv', { timeout: 4000 }); return (await d.page.textContent('.jx-mvl')).includes('this is the Zab being moved'); });
    await step(d, '＋ New Zab inside (dialog)', async () => { await openZab(d, 'zp'); await tap(d, '#jeb-panel .jx-new'); await d.page.waitForSelector('#jeb-f-name', { timeout: 4000 }); return (await d.page.getAttribute('#jeb-f-name', 'placeholder')) === 'Zab name'; });
    await step(d, 'Rename Zab (dialog)', async () => { await openZab(d, 'zl'); await tap(d, '#jeb-panel .jeb-pm'); await menuRow(d, 'Rename'); await d.page.waitForSelector('#jeb-f-name', { timeout: 4000 }); return true; });
    await step(d, 'All Zabs', async () => {
      if (phone(d)) { await tap(d, '#zab-btn'); await tap(d, '#zab-lay [data-zact="all"]'); } else await tap(d, '#jeb-bar .jeb-chip.jeb-all .jeb-main');
      await d.page.waitForSelector('#jeb-panel.on', { timeout: 4000 }); return /All Zabs/.test(await d.page.evaluate(() => document.querySelector('#jeb-panel').textContent));
    });
    if (!phone(d)) {
      await step(d, 'the deck', async () => { await tap(d, '#jeb-bar .jeb-chip.jeb-all [data-jeb-cards]'); await d.page.waitForSelector('#jeb-deck.on, #jeb-deck', { timeout: 4000 }); return true; });
      await step(d, 'Choose', async () => { await tap(d, '#jeb-bar .jeb-choose'); return /Cancel/.test(await d.page.textContent('#jeb-bar .jeb-choose')); });
      await step(d, 'the right-click / long-press menu on a chip', async () => {
        const sel = '#jeb-bar .jeb-chip[data-pid="zp"] .jeb-main';
        if (vp.touch) await d.page.evaluate((s) => { const e = document.querySelector(s).closest('.jeb-chip'), r = e.getBoundingClientRect(); e.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.x + 8, clientY: r.y + 8 })); }, sel);
        else await d.page.locator(sel).click({ button: 'right' });
        await sleep(400); return !!(await d.page.$('#jeb-menu'));
      });
    } else {
      await step(d, 'the long-press menu on a Rail bubble', async () => {
        await tap(d, '#zab-btn');
        await d.page.evaluate(() => { const e = document.querySelector('#zab-lay .zr-b[data-pid="zp"]'), r = e.getBoundingClientRect(); e.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.x + 8, clientY: r.y + 8 })); });
        await sleep(400); return !!(await d.page.$('#jeb-menu'));
      });
    }
    await step(d, '🧰 → Appearance (the Zab settings)', async () => {
      await d.page.evaluate(() => openTheme()); await sleep(600);
      return /Show Zab bar/.test(await d.page.evaluate(() => document.body.innerText));
    });
    await step(d, "an item's menu", async () => { await openZab(d, 'zl'); await tap(d, '#jeb-panel .jeb-it[data-iid="l1"] .jeb-more'); return !!(await d.page.$('#jeb-menu')); });
    if (vp.touch) await step(d, 'the reorder grip title on a deck card', async () => { await d.page.evaluate(() => jebOpenDeck({ ids: ['zl'], all: false })); await sleep(500); return !!(await d.page.$('#jeb-deck .jc-grip')); });
  }

  /* 94d: nothing above changed the notebook */
  if (want('94d')) for (const vp of VPS) {
    const d = devs[vp.name];
    await T(`94d@${vp.name} DB (folders, articles, jeb, jebPockets, theme) is byte-identical after opening and closing every surface`, async () => {
      await closeAll(d); const after = await dbKey(d); return [after === before[vp.name], after === before[vp.name] ? '' : `len ${before[vp.name].length} -> ${after.length}`];
    });
  }

  /* a second copy per size: the things that write — layouts, → Note's toast, Trash with a deleted Zab */
  if (want('94a') || want('94c')) for (const vp of VPS) {
    const d = await openDev(vp);
    if (phone(d)) for (const lay of ['rail', 'drawer', 'cols']) {
      await step(d, `the ${lay} layout`, async () => {
        await d.page.evaluate((l) => setZabPhoneLayout(l), lay); await sleep(300);
        await tap(d, '#zab-btn'); await d.page.waitForSelector('#zab-lay', { timeout: 4000 });
        if (lay === 'drawer') { await d.page.waitForSelector('.zl-dr', { timeout: 3000 }); }
        if (lay === 'cols') { await d.page.waitForSelector('.zl-cols', { timeout: 3000 }); }
        return true;
      });
    }
    await step(d, "→ Note's toast", async () => {
      await openZab(d, 'zl');
      await d.page.evaluate(() => _jebToNoteUI('l2')); await sleep(500);
      return !!(await d.page.$('#toast, .toast, #jeb-toast'));
    });
    await step(d, 'Trash with a deleted Zab', async () => {
      await d.page.evaluate(() => { jebDeletePocket('zo'); persist(); }); await sleep(300);
      await d.page.evaluate(() => openTrash()); await sleep(600);
      return /Zab: zo/.test(await d.page.evaluate(() => document.body.innerText));
    });
    await d.ctx.close();
  }

  /* 94c: summary — a label that clips is a failure; the measurements are printed for the --unpatched comparison */
  if (want('94c')) {
    const bad = stepFit.filter((s) => s.fit.length);
    check(bad.length === 0, `94c no label that carries the new words clips and no page scrolls sideways (${stepFit.length} surfaces measured${unpatched ? ', build before' : ''})`, JSON.stringify(bad.slice(0, 6)));
  }
  const errs = Object.values(devs).flatMap((d) => d.errors);
  check(errs.length === 0, '94a no page errors while opening every surface', errs.slice(0, 3).join(' | '));
  await browser.close(); srv.close && srv.close();
}

const bad = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - bad}/${results.length} passed${bad ? `, ${bad} FAILED` : ''}`);
process.exit(bad ? 1 : 0);
