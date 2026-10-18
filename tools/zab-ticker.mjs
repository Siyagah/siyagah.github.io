#!/usr/bin/env node
/* tools/zab-ticker.mjs — v05.32, Z10: the scrolling titles band above the Zab bar (PCF J48). Checks 92a–92k at 390 (touch), 820 (touch) and
   1440 (mouse), unless a check names a size.

   92a  drawn    the seeded items' titles (title over text), the Zab's colour on the dot, tree order; the band's bottom edge = the bar's top edge (820 / 1440),
                 at the bottom of the phone and not under the round button; no pane (sidebar, list, note) reaches under it
   92b  speed    it moves right to left; the measured speed is within ±20 % of the setting at 30, 60 and 110 px/s
   92c  clocks   the pause between rounds; "run for 1 minute" hides it and the show-again button brings it back; hours inside / outside / past midnight
   92d  which    the three Which-Zabs modes, the tick list (nested Zabs indented), and Include done
   92e  phone    "along the bottom" / "no band" / "only while Zab is open"; the 'bar' layout puts it above the bar; keyboard up hides it
   92f  menu     a real tap / click on a title opens the item menu at that title; Done / Not done, Move to Zab, Delete, Edit, Due; the band repaints; it pauses
   92g  sync     the settings survive a reload and travel between two devices (speed on A, mode on B)
   92h  motion   prefers-reduced-motion: no transform, one title at a time
   92i  scale    9,000 notes at 390 x CPU 4: no long task over hostLimit(200) in 10 s, and zero changes to <html>'s style attribute
   92j  I1       nothing in DB.articles / DB.jeb changes from showing the band and changing every setting; no page errors
   92k  44 px    every control this round adds on a phone is at least 44 x 44

   `--only=92a,92f` runs just those; `--unpatched` serves the build before this round (so the checks must FAIL). Each ok/FAIL line becomes one app-check check. */
import { playwright, serve, seedDB, hostLimit } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, quiet, waitSeeded, reopen, push } from './s1-fake.mjs';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);
const NOTES = +((argv.find((a) => a.startsWith('--notes=')) || '').slice(8)) || 9000;
const results = [];
function check(ok, label, detail = '') { results.push({ ok, label }); console.log((ok ? '  ok   ' : ' FAIL  ') + label + (detail ? '\n         ' + String(detail).slice(0, 400) : '')); }
/* one check body: [ok, detail] or a throw (the unpatched build has no band, so it throws or says no) */
async function T(label, fn) { try { const r = await fn(); check(!!r[0], label, r[1] || ''); } catch (e) { check(false, label, 'threw: ' + String(e.message || e).split('\n')[0]); } }

const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];
function makeBase() {   /* the app as it was just before this round */
  const dir = mkdtempSync(join(tmpdir(), 'z10-base-'));
  const sha = execFileSync('git', ['log', '--format=%H', '-n', '1', '--grep=v05.32 Z10: version bump'], { encoding: 'utf8' }).trim();
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', `${sha}~1:${f}`], { encoding: 'buffer', maxBuffer: 1 << 28 })); } catch {} }
  return dir;
}
const pw = await playwright();
const srv = await serve(argv.includes('--unpatched') ? makeBase() : undefined);
const browser = await pw.chromium.launch();

const T0 = '2026-10-01T00:00:00.000Z';
function seed(extra = {}) {
  const db = seedDB(T0);
  const pk = (id, i, extra2 = {}) => ({ id, name: id, icon: '✶', color: '#CFE8FF', order: i, createdAt: T0, updatedAt: T0, ...extra2 });
  const mk = (id, pocketId, text, order, e = {}) => ({ id, pocketId, text, done: false, folderIds: [], tags: [], kind: null, journal: false, order, createdAt: T0, updatedAt: T0, ...e });
  db.jebPockets = [pk('jp-task', 0, { name: 'Tasks', icon: '✅', color: '#CFE8FF' }), pk('jp-idea', 1, { name: 'Ideas', icon: '💡', color: '#FFE3A8' }),
    pk('jp-sub', 0, { name: 'Sub', icon: '🌱', color: '#D5F5D0', parentId: 'jp-idea' }), pk('jp-shop', 2, { name: 'Shopping', icon: '🛒', color: '#FFD1DC' })];
  db.jeb = [mk('t1', 'jp-task', 'Call the bank', 0, { due: T0.slice(0, 10) }), mk('t2', 'jp-task', 'a longer text that is not the title', 1, { title: 'Pay rent' }),
    mk('i1', 'jp-idea', 'An idea about things', 0), mk('s1', 'jp-sub', 'Inside the sub', 0), mk('m1', 'jp-shop', 'Milk', 0), mk('d1', 'jp-shop', 'Old milk', 1, { done: true })];
  db.theme = { preset: 'forest', custom: {}, ...extra };
  return db;
}
const EXPECT = ['Call the bank', 'Pay rent', 'An idea about things', 'Inside the sub', 'Milk'];
async function openDev(vp, o = {}) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, ...(vp.touch ? { hasTouch: true, isMobile: true } : {}), ...(o.reduced ? { reducedMotion: 'reduce' } : {}) });
  for (const p of ['**googleapis.com/**', '**gstatic.com/**', '**firebaseapp.com/**', '**firebaseio.com/**']) await ctx.route(p, (r) => r.abort());
  await ctx.addInitScript((d) => { try { if (!localStorage.getItem('my-notebook-v1')) localStorage.setItem('my-notebook-v1', JSON.stringify(d)); } catch {} }, o.db || seed());
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e));
  page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR_FAILED/.test(m.text())) errors.push('console: ' + m.text()); });
  if (o.throttle) { const c = await ctx.newCDPSession(page); await c.send('Emulation.setCPUThrottlingRate', { rate: o.throttle }); }
  await page.goto(srv.base + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree'));
  await sleep(o.settle || 900);
  return { ctx, page, errors, vp };
}
const texts = (p) => p.evaluate(() => [...document.querySelectorAll('#zab-tk .tk-it .tk-tx')].map((e) => e.textContent));
const set = (p, k, v) => p.evaluate(([k, v]) => zabTkSet(k, v, true), [k, v]);
const rect = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; }, sel);
const hasBand = (p) => p.evaluate(() => !!document.getElementById('zab-tk'));
/* a title brought fully on screen, then its centre */
async function titlePos(p, iid) {
  await p.evaluate((id) => { const b = document.getElementById('zab-tk'), it = b.querySelector('.tk-it[data-iid="' + id + '"]'); _tkX = 30 - it.offsetLeft; _tkPhase = 'run'; _tkMeasure = false; b.firstChild.style.transform = 'translate3d(' + _tkX + 'px,0,0)'; }, iid);
  await sleep(150);
  return p.evaluate((id) => { const r = document.querySelector('#zab-tk .tk-it[data-iid="' + id + '"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, t: r.top, b: r.bottom, l: r.left, r: r.right }; }, iid);
}
async function pressAt(d, x, y) { if (d.vp.touch) await d.page.touchscreen.tap(x, y); else await d.page.mouse.click(x, y); await sleep(350); }
const pick = async (d, text) => { const l = d.page.locator('#jeb-menu .jm', { hasText: text }).first(); await l.waitFor({ state: 'visible', timeout: 4000 }); const r = await l.boundingBox(); await pressAt(d, r.x + r.width / 2, r.y + r.height / 2); };
const stable = (p, ms = 500) => p.evaluate(async (ms) => { const a = _tkX; await new Promise((r) => setTimeout(r, ms)); return a === _tkX; }, ms);

const devs = {};
for (const vp of VPS) devs[vp.name] = await openDev(vp);
const allErrors = () => Object.values(devs).flatMap((d) => d.errors);

/* ── 92a ── */
if (want('92a')) for (const vp of VPS) {
  const d = devs[vp.name], p = d.page, tag = `92a@${vp.name}`;
  await T(`${tag} the band shows the seeded titles (title over text) in tree order`, async () => { const t = await texts(p); return [JSON.stringify(t) === JSON.stringify(EXPECT), JSON.stringify(t)]; });
  await T(`${tag} each dot is the Zab's colour`, async () => {
    const c = await p.evaluate(() => [...document.querySelectorAll('#zab-tk .tk-it')].map((b) => ({ id: b.dataset.iid, bg: getComputedStyle(b.querySelector('.tk-dot')).backgroundColor })));
    const want2 = { t1: 'rgb(207, 232, 255)', t2: 'rgb(207, 232, 255)', i1: 'rgb(255, 227, 168)', s1: 'rgb(213, 245, 208)', m1: 'rgb(255, 209, 220)' };
    return [c.length === 5 && c.every((x) => x.bg === want2[x.id]), JSON.stringify(c)];
  });
  await T(`${tag} placed: ${vp.touch && vp.w < 640 ? 'at the bottom, above nothing, clear of the round button' : "its bottom edge is the bar's top edge"}`, async () => {
    const b = await rect(p, '#zab-tk');
    if (vp.w < 640) { const z = await rect(p, '#zab-btn'); return [Math.abs(b.b - vp.h) <= 1 && z.b <= b.t + 1 && b.h >= 44, JSON.stringify({ b, z })]; }
    const bar = await rect(p, '#jeb-bar'); return [Math.abs(b.b - bar.t) <= 1 && Math.abs(b.h - 34) <= 1 && Math.abs(b.l - bar.l) <= 1, JSON.stringify({ b, bar })];
  });
  await T(`${tag} no pane reaches under the band (sidebar, list, open note)`, async () => {
    await p.evaluate(() => { selArt('a1'); }); await sleep(500);
    const r = await p.evaluate(() => { const bt = document.getElementById('zab-tk').getBoundingClientRect().top; return (innerWidth >= 1200 ? ["p2", "p3"] : ["sb", "p2", "p3"]).map((id) => { const e = document.getElementById(id), r = e.getBoundingClientRect(); return { id, vis: r.width > 0 && r.left < innerWidth && r.right > 0, b: r.bottom }; }).filter((x) => x.vis).map((x) => ({ ...x, ok: x.b <= bt + 1 })); });
    return [r.length > 0 && r.every((x) => x.ok), JSON.stringify(r)];
  });
}

/* ── 92b ── */
if (want('92b')) for (const vp of VPS) {
  const p = devs[vp.name].page;
  await set(p, 'gap', 0);
  for (const s of [30, 60, 110]) await T(`92b@${vp.name} moves right to left at ${s} px/s (within 20 %)`, async () => {
    await set(p, 'speed', s);
    const r = await p.evaluate(async () => { _tkX = null; _tkMeasure = true; _tkPhase = 'run'; await new Promise((r) => setTimeout(r, 300)); const x1 = _tkX, t1 = performance.now(); await new Promise((r) => setTimeout(r, 1500)); return { x1, x2: _tkX, dt: performance.now() - t1 }; });
    const v = (r.x1 - r.x2) / r.dt * 1000;
    return [r.x2 < r.x1 && Math.abs(v - s) <= s * 0.2, `measured ${v.toFixed(1)} px/s`];
  });
  await set(p, 'speed', 60);
}

/* ── 92c ── */
if (want('92c')) {
  const vp = VPS[2], p = devs[vp.name].page;
  await T('92c pause between rounds: after the last title leaves, it waits (5 s), the pill counts, then it starts again from the right', async () => {
    await set(p, 'gap', 5);
    const r = await p.evaluate(async () => { window.__zabTkNow = performance.now(); _tkX = -_tkTw + 2; _tkPhase = 'run'; await new Promise((r) => setTimeout(r, 400)); const ph = _tkPhase; _tkTick(); const pill = document.querySelector('#zab-tk .tk-pill').textContent;
      window.__zabTkNow += 6000; await new Promise((r) => setTimeout(r, 200)); const ph2 = _tkPhase, x = _tkX; return { ph, pill, ph2, x, vw: _tkVw }; });
    return [r.ph === 'gap' && /^next round in 0:0[0-5]$/.test(r.pill) && r.ph2 === 'run' && r.x <= r.vw && r.x > r.vw - 400, JSON.stringify(r)];
  });
  await p.evaluate(() => { delete window.__zabTkNow; _tkPhase = 'run'; });
  await T('92c run for 1 minute, then it hides and "▶ Show the titles again" brings it back for another run', async () => {
    const r = await p.evaluate(async () => { window.__zabTkNow = performance.now(); zabTkSet('run', 1, true); await new Promise((r) => setTimeout(r, 1300)); const pill = document.querySelector('#zab-tk .tk-pill').textContent;
      window.__zabTkNow += 61000; _tkTick(); const gone = !document.getElementById('zab-tk'), btn = document.getElementById('zab-tk-again'), cls = document.documentElement.classList.contains('zab-tk');
      const b = btn && btn.getBoundingClientRect(); btn && btn.click(); const back = !!document.getElementById('zab-tk'), btnGone = !document.getElementById('zab-tk-again'); return { pill, gone, btn: !!btn, cls, w: b && b.width, h: b && b.height, back, btnGone }; });
    return [/^hides in (1:00|0:[0-5]\d)$/.test(r.pill) && r.gone && r.btn && !r.cls && r.back && r.btnGone, JSON.stringify(r)];
  });
  await p.evaluate(() => { delete window.__zabTkNow; }); await set(p, 'run', 0);
  const at = (h) => p.evaluate((h) => { window.__zabTkNow = new Date(2026, 9, 19, h, 30, 0).getTime(); _tkTick(); return !!document.getElementById('zab-tk'); }, h);
  await T('92c hours 8 am–10 pm: shown at noon, hidden at 11 pm', async () => { await p.evaluate(() => zabTkSet('hours', { on: true, from: 8, to: 22 }, true)); const a = await at(12), b = await at(23), c = await at(7); return [a && !b && !c, `${a} ${b} ${c}`]; });
  await T('92c hours 10 pm–6 am (past midnight): shown at 11 pm and 3 am, hidden at noon', async () => { await p.evaluate(() => zabTkSet('hours', { on: true, from: 22, to: 6 }, true)); const a = await at(23), b = await at(3), c = await at(12); return [a && b && !c, `${a} ${b} ${c}`]; });
  await p.evaluate(() => { delete window.__zabTkNow; zabTkSet('hours', { on: false, from: 8, to: 22 }, true); });
  await sleep(300);
}

/* ── 92d ── */
if (want('92d')) {
  const vp = VPS[2], d = devs[vp.name], p = d.page;
  await T('92d all except the ones I untick: unticking Shopping removes Milk; a new Zab would still show', async () => { await set(p, 'mode', 'all'); await set(p, 'skip', ['jp-shop']); const t = await texts(p); return [JSON.stringify(t) === JSON.stringify(EXPECT.slice(0, 4)), JSON.stringify(t)]; });
  await T('92d only the ones I tick: just Ideas (not the Zab inside it)', async () => { await set(p, 'mode', 'only'); await set(p, 'pids', ['jp-idea']); const t = await texts(p); return [JSON.stringify(t) === JSON.stringify(['An idea about things']), JSON.stringify(t)]; });
  await T('92d only the Zab that is open: none open = no band; open Sub = its titles', async () => {
    await set(p, 'mode', 'open'); const none = !(await hasBand(p));
    await p.evaluate(() => jebOpenPanel('jp-sub')); await sleep(300); const t = await texts(p); await p.evaluate(() => jebClosePanel()); await sleep(200);
    return [none && JSON.stringify(t) === JSON.stringify(['Inside the sub']) && !(await hasBand(p)), JSON.stringify(t)];
  });
  await T('92d Include ticked (done) items', async () => { await set(p, 'mode', 'all'); await set(p, 'skip', []); await set(p, 'done', true); const t = await texts(p); await set(p, 'done', false); return [t.includes('Old milk') && t.length === 6, JSON.stringify(t)]; });
  await T('92d the tick list (Appearance, by real clicks): every Zab, the nested one indented; unticking one hides its titles', async () => {
    await set(p, 'pids', []);
    await p.locator('#sb-tools-btn').click(); await sleep(300); await p.locator('#sb-tools >> text=Appearance').first().click(); await sleep(600);
    const info = await p.evaluate(() => [...document.querySelectorAll('#th-tk .tk-pk')].map((c) => ({ pid: c.dataset.pid, pad: parseInt(c.closest('label').style.paddingLeft) || 0, on: c.checked })));
    await p.locator('#th-tk .tk-pk[data-pid="jp-shop"]').click(); await sleep(400);
    const t = await texts(p);
    await p.locator('#th-tk-mode').selectOption('only'); await sleep(300);
    const ticked = await p.evaluate(() => [...document.querySelectorAll('#th-tk .tk-pk')].filter((c) => c.checked).length);
    return [info.length === 4 && info.find((x) => x.pid === 'jp-sub').pad > info.find((x) => x.pid === 'jp-idea').pad && info.every((x) => x.on) && !t.includes('Milk') && ticked === 0, JSON.stringify({ info, t, ticked })];
  });
  await p.evaluate(() => { closeTheme(); }); await set(p, 'mode', 'all'); await set(p, 'skip', []); await set(p, 'pids', []);
}

/* ── 92e ── */
if (want('92e')) {
  const d = devs['390'], p = d.page;
  await T('92e phone "no band": no band, no room taken', async () => { await set(p, 'phone', 'none'); const r = await p.evaluate(() => ({ b: !!document.getElementById('zab-tk'), c: document.documentElement.classList.contains('zab-tk'), h: getComputedStyle(document.getElementById('p2')).getPropertyValue('--jeb-h') })); return [!r.b && !r.c && r.h === '0px', JSON.stringify(r)]; });
  await T('92e phone "only while Zab is open": hidden, then shown with the layout open, hidden when closed', async () => {
    await set(p, 'phone', 'open'); const a = await hasBand(p);
    await p.evaluate(() => _zabOpenLay()); await sleep(300); const b = await hasBand(p);
    const covered = await p.evaluate(() => { const r = document.getElementById('zab-tk').getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !document.getElementById('zab-tk').contains(e); });
    await p.evaluate(() => _zabClose()); await sleep(200); const c = await hasBand(p);
    await p.evaluate(() => jebOpenPanel('jp-task')); await sleep(300); const e2 = await hasBand(p); await p.evaluate(() => jebClosePanel()); await sleep(200);
    return [!a && b && !covered && !c && e2 && !(await hasBand(p)), JSON.stringify({ a, b, covered, c, e2 })];
  });
  await T('92e phone "along the bottom" is back; the bar layout puts the band above the bar', async () => {
    await set(p, 'phone', 'bottom'); const a = await hasBand(p);
    await p.evaluate(() => { DB.theme.zabPhoneLayout = 'bar'; persist(); jebRefresh(); }); await sleep(400);
    const r = await p.evaluate(() => { const b = document.getElementById('zab-tk').getBoundingClientRect(), bar = document.getElementById('jeb-bar').getBoundingClientRect(); return { bb: b.bottom, bt: bar.top, h: b.height }; });
    await p.evaluate(() => { DB.theme.zabPhoneLayout = 'rail'; persist(); jebRefresh(); }); await sleep(300);
    return [a && Math.abs(r.bb - r.bt) <= 1 && r.h >= 44, JSON.stringify(r)];
  });
  await T('92e keyboard up (html.jeb-kb) hides the band and gives its room back', async () => {
    await p.evaluate(() => document.documentElement.classList.add('jeb-kb')); await sleep(200);
    const r = await p.evaluate(() => ({ d: getComputedStyle(document.getElementById('zab-tk')).display, h: getComputedStyle(document.getElementById('p2')).getPropertyValue('--jeb-h') }));
    await p.evaluate(() => document.documentElement.classList.remove('jeb-kb')); await sleep(200);
    return [r.d === 'none' && r.h === '0px', JSON.stringify(r)];
  });
}

/* ── 92f ── */
if (want('92f')) for (const vp of VPS) {
  const d = devs[vp.name], p = d.page, tag = `92f@${vp.name}`;
  await set(p, 'speed', 60); await set(p, 'gap', 0);
  await T(`${tag} a real ${vp.touch ? 'tap' : 'click'} on a moving title opens the item menu at that title, and the band waits while it is open`, async () => {
    const pos = await titlePos(p, 't1'); await pressAt(d, pos.x, pos.y);
    const m = await rect(p, '#jeb-menu'); if (!m) return [false, 'no menu'];
    const st = await stable(p, 600);
    const items = await p.evaluate(() => [...document.querySelectorAll('#jeb-menu .jm')].map((e) => e.textContent));
    return [st && (Math.abs(m.b - pos.t) <= 8 || Math.abs(m.t - pos.b) <= 8) && items[0] === '☑ Done' && items.includes('📂 Move to Zab ▸') && items.includes('📅 Due…') && !items.some((x) => /Move to pocket/.test(x)), JSON.stringify({ m, pos, items, st })];
  });
  await T(`${tag} Due on a task opens the due chooser`, async () => { await pick(d, '📅 Due…'); const r = await p.evaluate(() => !!document.getElementById('jeb-due')); await p.evaluate(() => _jebDueClose()); return [r, String(r)]; });
  await T(`${tag} ✏️ Edit opens that item's Zab with the item in edit mode`, async () => {
    const pos = await titlePos(p, 't2'); await pressAt(d, pos.x, pos.y); await pick(d, '✏️ Edit'); await sleep(400);
    const r = await p.evaluate(() => ({ id: _jebEditId, open: _jebOpen, ta: !!document.querySelector('#jeb-panel .jeb-edit') }));
    await p.evaluate(() => { _jebEditCancel = true; document.querySelector('#jeb-panel .jeb-edit')?.blur(); jebClosePanel(); }); await sleep(300);
    return [r.id === 't2' && r.open === 'jp-task' && r.ta, JSON.stringify(r)];
  });
  await T(`${tag} Move to Zab changes pocketId and the band takes the new Zab's colour`, async () => {
    const pos = await titlePos(p, 't1'); await pressAt(d, pos.x, pos.y); await pick(d, '📂 Move to Zab'); await pick(d, 'Shopping'); await sleep(400);
    const r = await p.evaluate(() => ({ pid: DB.jeb.find((i) => i.id === 't1').pocketId, bg: getComputedStyle(document.querySelector('#zab-tk .tk-it[data-iid="t1"] .tk-dot')).backgroundColor, ic: document.querySelector('#zab-tk .tk-it[data-iid="t1"]').textContent.includes('🛒') }));
    return [r.pid === 'jp-shop' && r.bg === 'rgb(255, 209, 220)' && r.ic, JSON.stringify(r)];
  });
  await T(`${tag} ☑ Done removes it from the band (and the item is done)`, async () => {
    const pos = await titlePos(p, 't1'); await pressAt(d, pos.x, pos.y); await pick(d, '☑ Done'); await sleep(400);
    const r = await p.evaluate(() => ({ done: DB.jeb.find((i) => i.id === 't1').done, on: !!document.querySelector('#zab-tk .tk-it[data-iid="t1"]') }));
    return [r.done === true && !r.on, JSON.stringify(r)];
  });
  await T(`${tag} ☐ Not done (with Include done on) puts it back`, async () => {
    await set(p, 'done', true); const pos = await titlePos(p, 't1'); await pressAt(d, pos.x, pos.y);
    const first = await p.evaluate(() => document.querySelector('#jeb-menu .jm').textContent); await pick(d, '☐ Not done'); await sleep(400);
    const r = await p.evaluate(() => ({ done: DB.jeb.find((i) => i.id === 't1').done, on: !!document.querySelector('#zab-tk .tk-it[data-iid="t1"]') })); await set(p, 'done', false);
    return [first === '☐ Not done' && r.done === false && r.on, JSON.stringify({ first, r })];
  });
  await T(`${tag} 🗑 Delete puts it in the Trash and the band drops it`, async () => {
    const pos = await titlePos(p, 'm1'); await pressAt(d, pos.x, pos.y); await pick(d, '🗑 Delete'); await sleep(400);
    const r = await p.evaluate(() => ({ gone: !DB.jeb.find((i) => i.id === 'm1'), tr: DB.trash.some((t) => t.id === 'm1' || (t.item && t.item.id === 'm1') || JSON.stringify(t).includes('"m1"')), on: !!document.querySelector('#zab-tk .tk-it[data-iid="m1"]') }));
    return [r.gone && r.tr && !r.on, JSON.stringify(r)];
  });
  await T(`${tag} each title is a <button>; Enter on it opens the menu`, async () => {
    if (vp.touch) { return [await p.evaluate(() => document.querySelector('#zab-tk .tk-it').tagName === 'BUTTON'), 'button']; }
    await p.evaluate(() => document.querySelector('#zab-tk .tk-it').focus()); await p.keyboard.press('Enter'); await sleep(300);
    const r = await p.evaluate(() => [document.querySelector('#zab-tk .tk-it').tagName, !!document.getElementById('jeb-menu')]); await p.keyboard.press('Escape'); await sleep(200);
    return [r[0] === 'BUTTON' && r[1], JSON.stringify(r)];
  });
  /* put the seed back for the next size */
  await p.evaluate(() => { const s = (id, f) => { const i = DB.jeb.find((x) => x.id === id); if (i) Object.assign(i, f); }; });
}

/* ── 92g ── */
if (want('92g')) {
  const cloud = makeCloud(), vp = VPS[2], sd = () => seed({ zabTicker: {} });
  const A = await addDevice(browser, srv.base, cloud, 'A', { width: vp.w, height: vp.h }, false, sd());
  const B = await addDevice(browser, srv.base, cloud, 'B', { width: vp.w, height: vp.h }, false, sd());
  await T('92g two devices: speed on A and mode on B both survive the merge, and a reload', async () => {
    await waitSeeded(cloud, A); await waitSeeded(cloud, B);
    await on(A, () => zabTkSet('speed', 110, true)); await on(B, () => zabTkSet('mode', 'only', true));
    await push(cloud, A); await push(cloud, B);
    const ok = async () => { const f = (d) => on(d, () => { const c = _zabTk(); return c.speed === 110 && c.mode === 'only'; }); return (await f(A)) && (await f(B)); };
    const t0 = Date.now(); let good = false; while (Date.now() - t0 < 30000) { if (await ok()) { good = true; break; } await sleep(400); }
    await push(cloud, A); await push(cloud, B);
    await reopen(B); await sleep(1500);
    const after = await on(B, () => ({ s: _zabTk().speed, m: _zabTk().mode }));
    return [good && after.s === 110 && after.m === 'only', JSON.stringify({ good, after, errs: [...A.errors, ...B.errors].slice(0, 2) })];
  });
}

/* ── 92h ── */
if (want('92h')) for (const vp of [VPS[0], VPS[2]]) {
  const d = await openDev(vp, { reduced: true }), p = d.page;
  await T(`92h@${vp.name} prefers-reduced-motion: no movement, one title at a time, changing every 4 s`, async () => {
    const r = await p.evaluate(async () => { const b = document.getElementById('zab-tk'); await new Promise((r) => setTimeout(r, 1500));
      const tr = b.firstChild.style.transform, vis = () => [...b.querySelectorAll('.tk-it')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.dataset.iid);
      const a = vis(); window.__zabTkNow = performance.now() + 4200; _tkTick(); const c = vis(); delete window.__zabTkNow; return { rm: b.classList.contains('tk-rm'), tr, a, c, raf: !!_tkRaf }; });
    return [r.rm && !r.tr && r.a.length === 1 && r.c.length === 1 && r.a[0] !== r.c[0] && !r.raf, JSON.stringify(r)];
  });
  await d.ctx.close();
}

/* ── 92i ── */
if (want('92i')) {
  const vp = VPS[0], db = seed();
  for (let i = 0; i < NOTES; i++) db.articles.push({ id: 'big' + i, title: 'Big note ' + i, content: '<p>Body ' + i + '</p>', folderIds: [i % 2 ? 'f1' : 'f2'], tags: [], createdAt: T0, updatedAt: T0, kind: 'general' });
  const d = await openDev(vp, { db, throttle: 4, settle: 4000 }), p = d.page, lim = hostLimit(200);
  await T(`92i ${NOTES} notes at 390 x CPU 4: no long task over ${lim.text} ms in 10 s while the band runs; <html>'s style is never written`, async () => {
    const r = await p.evaluate(async () => { window.__lt = []; window.__hs = 0; try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(Math.round(e.duration)))).observe({ entryTypes: ['longtask'] }); } catch (e) {}
      new MutationObserver((m) => { window.__hs += m.length; }).observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
      const x1 = _tkX; await new Promise((r) => setTimeout(r, 10000)); return { lt: window.__lt, hs: window.__hs, moved: x1 !== _tkX, band: !!document.getElementById('zab-tk') }; });
    const worst = Math.max(0, ...r.lt);
    return [r.band && r.moved && worst <= lim.ms && r.hs === 0, `worst ${worst} ms (limit ${lim.ms}), html style changes ${r.hs}, moved ${r.moved}`];
  });
  await d.ctx.close();
}

/* ── 92j ── */
if (want('92j')) {
  const d = await openDev(VPS[2]), p = d.page;
  await T('92j nothing in DB.articles / DB.jeb changes from showing the band and changing every setting', async () => {
    const snap = () => p.evaluate(() => JSON.stringify([DB.articles, DB.jeb, DB.jebPockets]));
    const a = await snap();
    await p.evaluate(async () => { const w = () => new Promise((r) => setTimeout(r, 120));
      for (const [k, v] of [['on', false], ['on', true], ['speed', 30], ['speed', 180], ['gap', 0], ['gap', 300], ['run', 5], ['run', 0], ['hours', { on: true, from: 0, to: 23 }], ['hours', { on: false, from: 8, to: 22 }], ['mode', 'only'], ['pids', ['jp-task']], ['mode', 'open'], ['mode', 'all'], ['skip', ['jp-idea']], ['skip', []], ['done', true], ['done', false], ['phone', 'none'], ['phone', 'bottom']]) { zabTkSet(k, v, true); await w(); } });
    const b = await snap();
    return [a === b && d.errors.length === 0, d.errors.slice(0, 2).join(' · ')];
  });
  await T('92j no page errors across the whole run', async () => [allErrors().length === 0, allErrors().slice(0, 3).join(' · ')]);
  await d.ctx.close();
}

/* ── 92k ── */
if (want('92k')) {
  const d = await openDev(VPS[0]), p = d.page;
  await T('92k the titles (≥ 44 x 44), the show-again button, the item menu rows and the new Appearance controls', async () => {
    const small = [];
    const note = (what, r) => { if (r.width < 43.5 || r.height < 43.5) small.push(`${what} ${Math.round(r.width)}x${Math.round(r.height)}`); };
    const tk = await p.evaluate(() => [...document.querySelectorAll('#zab-tk .tk-it')].map((e) => { const r = e.getBoundingClientRect(); return { width: r.width, height: r.height }; }));
    tk.forEach((r, i) => note('title ' + i, r));
    await p.evaluate(() => { window.__zabTkNow = performance.now(); zabTkSet('run', 1, true); window.__zabTkNow += 61000; _tkTick(); });
    const ag = await p.evaluate(() => { const b = document.getElementById('zab-tk-again').getBoundingClientRect(); return { width: b.width, height: b.height }; }); note('show-again', ag);
    await p.evaluate(() => { delete window.__zabTkNow; zabTkSet('run', 0, true); });
    await sleep(300);
    const pos = await titlePos(p, 't1'); await pressAt(d, pos.x, pos.y);
    (await p.evaluate(() => [...document.querySelectorAll('#jeb-menu .jm')].map((e) => { const r = e.getBoundingClientRect(); return { width: r.width, height: r.height }; }))).forEach((r, i) => note('menu row ' + i, r));
    await p.keyboard.press('Escape'); await p.evaluate(() => _jebHideMenu());
    await p.evaluate(() => { openTheme ? openTheme() : 0; }).catch(() => {}); await sleep(500);
    await p.evaluate(() => { zabTkHours('on', true); renderThemeModal(); }); await sleep(300);
    const ctl = await p.evaluate(() => [...document.querySelectorAll('#th-tk select,#th-tk .ls-btn,#th-tk input[type=range],#th-tk label')].map((e) => { const r = e.getBoundingClientRect(); return { n: (e.id || e.className || e.tagName) + '', width: r.width, height: r.height }; }));
    ctl.forEach((r) => note(r.n, r));
    return [tk.length === 5 && ctl.length > 10 && small.length === 0, `${tk.length} titles, ${ctl.length} settings controls; too small: ${small.slice(0, 6).join(', ') || 'none'}`];
  });
  await d.ctx.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
await browser.close(); await srv.close?.();
process.exit(failed ? 1 : 0);
