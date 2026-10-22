#!/usr/bin/env node
/* tools/zab-note.mjs — v05.33, Z11: a Zab's own note (PCF J30, the owner's choice A). Checks 93a–93h at 390 (touch), 820 (touch) and 1440 (mouse),
   and in Zab mode (/?jeb=1) at 390 and 1440, unless a check names a size.

   93a  where    a leaf Zab shows "📝 Write a note for this Zab" ABOVE the add box and its items (reached by real taps: the bar chip / the round button's Rail); a Zab
                 with Zabs inside shows none; All Zabs, the deck and Choose show none; looking creates nothing
   93b  write    a real tap opens the pop-up note window (a sheet on a phone), typing autosaves, closing repaints the area with the text; the note is `zabn-<pid>`,
                 folder `zab-notes`, `zabNote.pid`; a note opened and left blank is dropped again
   93c  items    DB.jeb is byte-identical before and after writing the note; the items below still tick and open their menu
   93d  sync     two devices (s1-fake) write the first note of the same Zab offline, then sync: ONE note `zabn-<pid>`, the newer text; a third device shows it
   93e  life     Trash the note → "Write a note" again; restore → back; delete the (empty) Zab → note kept, "(Zab deleted)"; move the Zab into another → note kept; rename keeps the title
   93f  area     Show all / Show less, the fold ▾, ✏️ Edit, pictures hydrate; Pane 2's card and the read view say "📝 note of Zab <name>" and a tap opens the Zab
   93g  phone    44 x 44 for every new control; nothing under the round button; no page errors
   93h  find     search finds the note's text; Save File's copy contains it
   93j  sync     an edit received by sync repaints the open Zab's note area (the targeted redraw counts a zabNote note as a Zab change)
   93i  zab mode the same in the docked panel (390 and 1440): the note area, a write in the pop-up window, the text back in the area

   `--only=93a,93d` runs just those; `--unpatched` serves the build before this round (so the checks must FAIL). Each ok/FAIL line becomes one app-check check. */
import { playwright, serve, seedDB, zabTap } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, quiet, waitSeeded, push } from './s1-fake.mjs';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);
const results = [];
function check(ok, label, detail = '') { results.push({ ok, label }); console.log((ok ? '  ok   ' : ' FAIL  ') + label + (detail ? '\n         ' + String(detail).slice(0, 400) : '')); }
async function T(label, fn) { try { const r = await fn(); check(!!r[0], label, r[1] || ''); } catch (e) { check(false, label, 'threw: ' + String(e.message || e).split('\n')[0]); } }

const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];
function makeBase() {   /* the app as it was just before this round */
  const dir = mkdtempSync(join(tmpdir(), 'z11-base-'));
  const sha = execFileSync('git', ['log', '--format=%H', '-n', '1', '--grep=^v05.33: version bump'], { encoding: 'utf8' }).trim();
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', `${sha}~1:${f}`], { encoding: 'buffer', maxBuffer: 1 << 28 })); } catch {} }
  return dir;
}
/* a setup step outside a check (the build before this round has no _zabNoteOf) stops the run: say so as a failure and print the totals */
for (const ev of ['unhandledRejection', 'uncaughtException']) process.on(ev, (e) => { check(false, 'the check script stopped early', String(e && e.message || e).split('\n')[0]); const bad = results.filter((r) => !r.ok).length; console.log(`\n${results.length - bad}/${results.length} passed, ${bad} FAILED`); process.exit(1); });
const pw = await playwright();
const srv = await serve(argv.includes('--unpatched') ? makeBase() : undefined);
const browser = await pw.chromium.launch();

const T0 = '2026-10-01T00:00:00.000Z';
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
function seed() {
  const db = seedDB(T0);
  const pk = (id, i, e = {}) => ({ id, name: id, icon: '✶', color: '#CFE8FF', order: i, createdAt: T0, updatedAt: T0, ...e });
  const mk = (id, pocketId, text, order) => ({ id, pocketId, text, done: false, folderIds: [], tags: [], kind: null, journal: false, order, createdAt: T0, updatedAt: T0 });
  db.jebPockets = [pk('zl', 0, { name: 'Leaf' }), pk('zp', 1, { name: 'Parent' }), pk('zk', 0, { name: 'Kid', parentId: 'zp' }), pk('zo', 2, { name: 'Other' })];
  db.jeb = [mk('l1', 'zl', 'First item', 0), mk('l2', 'zl', 'Second item', 1), mk('k1', 'zk', 'Kid item', 0)];
  db.theme = { preset: 'forest', custom: {}, zabTicker: { on: false } };
  return db;
}
async function openDev(vp, o = {}) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, ...(vp.touch ? { hasTouch: true, isMobile: true } : {}) });
  for (const p of ['**googleapis.com/**', '**gstatic.com/**', '**firebaseapp.com/**', '**firebaseio.com/**']) await ctx.route(p, (r) => r.abort());
  await ctx.addInitScript((d) => { try { if (!localStorage.getItem('my-notebook-v1')) localStorage.setItem('my-notebook-v1', JSON.stringify(d)); } catch {} }, o.db || seed());
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e));
  page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR_FAILED/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(srv.base + (o.path || '/'), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree'));
  await sleep(900);
  return { ctx, page, errors, vp };
}
const tap = async (d, sel) => { const l = d.page.locator(sel).first(); await l.waitFor({ state: 'visible', timeout: 5000 }); if (d.vp.touch) await l.tap(); else await l.click(); await sleep(400); };
/* a real tap on the Zab: the bar's chip (≥ 640), the round button's Rail (phone), the docked bar (Zab mode) */
async function openZab(d, pid, jebMode) {
  if (d.vp.w < 640 && !jebMode) { await tap(d, '#zab-btn'); await tap(d, `#zab-lay .zr-b[data-pid="${pid}"]`); }
  else { /* v05.40 · Z15: the chip may be folded into "▸ N more"; reach it through the list as the owner does */ await zabTap(d.page, `#jeb-bar .jeb-chip[data-pid="${pid}"] .jeb-main`, { touch: d.vp.touch }); await sleep(400); }
  await d.page.waitForSelector('#jeb-panel.on', { timeout: 4000 }); await sleep(300);
}
const closeAll = async (d) => { await d.page.keyboard.press('Escape'); await sleep(300); await d.page.evaluate(() => { if (_jebOpen) jebClosePanel(); if (typeof _zabClose === 'function' && window._zabOpen) _zabClose(); }); await sleep(200); };
const area = (d) => on(d, () => { const e = document.querySelector('#jeb-panel.on .zn-area'); return e && !e.hidden ? e.textContent.replace(/\s+/g, ' ').trim() : null; });
const zabNotes = (d) => on(d, () => DB.articles.filter((a) => a.zabNote).map((a) => ({ id: a.id, pid: a.zabNote.pid, f: a.folderIds, c: a.content, t: a.title })));
/* a step that cannot happen (the build before this round has no window to type in) is not a throw here: the check after it says so */
const typeNote = async (d, id, text) => { try {
  await d.page.waitForSelector(`#fw-${id} #fw-ed-${id}`, { timeout: 5000 });
  await d.page.locator(`#fw-ed-${id}`).click(); await sleep(150);
  await d.page.keyboard.type(text, { delay: 15 });
} catch {} };
const closeWin = async (d, id) => { try { await tap(d, `#fw-${id} .fw-close`); } catch {} await sleep(300); };
const waitFor = async (fn, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await sleep(250); } return false; };

const devs = {};
for (const vp of VPS) devs[vp.name] = await openDev(vp);
const allErrors = () => Object.values(devs).flatMap((d) => d.errors);

/* ── 93a ── */
if (want('93a')) for (const vp of VPS) {
  const d = devs[vp.name], tag = `93a@${vp.name}`;
  await T(`${tag} a leaf Zab shows "📝 Write a note for this Zab" above the add box and the items, found by real taps`, async () => {
    await openZab(d, 'zl'); const a = await area(d);
    const order = await on(d, () => { const z = document.querySelector('#jeb-panel .zn-area'), ad = document.querySelector('#jeb-panel .jeb-add'), li = document.querySelector('#jeb-panel .jeb-list'); const F = Node.DOCUMENT_POSITION_FOLLOWING; return !!(z.compareDocumentPosition(ad) & F) && !!(z.compareDocumentPosition(li) & F); });
    return [a === '📝 Write a note for this Zab' && order, JSON.stringify({ a, order })];
  });
  await T(`${tag} looking at the area creates nothing (no note, no folder)`, async () => [(await zabNotes(d)).length === 0 && await on(d, () => !DB.folders.some((f) => f.id === 'zab-notes')), '']);
  await closeAll(d);
  await T(`${tag} a Zab with Zabs inside shows no note area`, async () => { await openZab(d, 'zp'); const a = await area(d); const kids = await on(d, () => document.querySelectorAll('#jeb-panel .jx-kid').length); return [a === null && kids === 1, JSON.stringify({ a, kids })]; });
  await closeAll(d);
  await T(`${tag} All Zabs, the deck and Choose show none`, async () => {
    const r = await on(d, () => {
      const out = {};
      jebToggleAllPanel(); out.all = !!document.querySelector('#jeb-panel.on .zn-area:not([hidden])') || !!document.querySelector('#jeb-panel.on .zn-write'); jebClosePanel();
      jebOpenDeck({ ids: ['zl'], all: false }); out.deck = !!document.querySelector('#jeb-deck .zn-area,#jeb-deck .zn-write'); jebCloseDeck();
      return out;
    });
    return [!r.all && !r.deck, JSON.stringify(r)];
  });
  await closeAll(d);
}

/* ── 93b + 93c ── */
if (want('93b') || want('93c')) for (const vp of VPS) {
  const d = devs[vp.name], tag = `93b@${vp.name}`;
  await closeAll(d);
  const before = await on(d, () => JSON.stringify(DB.jeb));
  await openZab(d, 'zl');
  await T(`${tag} a tap on "Write a note" opens the pop-up note window${vp.w < 640 ? ' (the phone sheet)' : ''}; the panel stays where it is`, async () => {
    await tap(d, '#jeb-panel .zn-write');
    await d.page.waitForSelector('#fw-zabn-zl', { timeout: 5000 });
    const r = await on(d, () => { const w = document.getElementById('fw-zabn-zl').getBoundingClientRect(); return { w: Math.round(w.width), open: !!document.querySelector('#jeb-panel.on'), vw: innerWidth }; });
    return [r.open && (vp.w < 640 ? r.w >= r.vw - 20 : r.w > 300), JSON.stringify(r)];
  });
  await typeNote(d, 'zabn-zl', 'Zab note ' + vp.name + ' needle');
  await T(`${tag} typing autosaves into DB.articles as zabn-zl, folder zab-notes, zabNote.pid, title = the Zab's name`, async () => {
    const ok = await waitFor(async () => (await zabNotes(d)).some((n) => n.c.includes('needle')));
    const n = (await zabNotes(d))[0] || {};
    const fo = await on(d, () => DB.folders.find((f) => f.id === 'zab-notes'));
    return [ok && n.id === 'zabn-zl' && n.pid === 'zl' && n.f.length === 1 && n.f[0] === 'zab-notes' && n.t === 'Leaf' && fo && fo.name === '📝 Zab notes' && !fo.parentId, JSON.stringify({ n, fo })];
  });
  await T(`${tag} the panel does not close while a tap lands inside the pop-up window`, async () => {
    await d.page.locator('#fw-ed-zabn-zl').click(); await sleep(300);
    return [await on(d, () => !!document.querySelector('#jeb-panel.on')), ''];
  });
  await closeWin(d, 'zabn-zl');
  await T(`${tag} closing the window repaints the note area with the text`, async () => { const a = await area(d); return [!!a && a.includes('needle') && a.includes('Edit'), String(a)]; });
  if (want('93c')) {
    const t3 = `93c@${vp.name}`;
    await T(`${t3} DB.jeb is byte-identical after writing the note`, async () => [await on(d, (b) => JSON.stringify(DB.jeb) === b, before), '']);
    await T(`${t3} the items under the note area still tick and open their menu`, async () => {
      await tap(d, '#jeb-panel .jeb-it[data-iid="l1"] .jeb-tick, #jeb-panel .jeb-it[data-iid="l1"] .jeb-chk');
      const done = await on(d, () => DB.jeb.find((i) => i.id === 'l1').done);
      await tap(d, '#jeb-panel .jeb-it[data-iid="l1"] .jeb-more');
      const menu = await on(d, () => !!document.getElementById('jeb-menu'));
      await d.page.keyboard.press('Escape'); await sleep(200);
      await on(d, () => { const i = DB.jeb.find((x) => x.id === 'l1'); if (i.done) { jebToggleDone('l1'); jebRefresh(); } });
      return [done === true && menu, JSON.stringify({ done, menu })];
    });
  }
  await closeAll(d);
  /* a note opened and never written in is dropped again */
  await T(`${tag} a note opened on another Zab and left blank is dropped again (no note, nothing left in Trash)`, async () => {
    await openZab(d, 'zo'); await tap(d, '#jeb-panel .zn-write'); await d.page.waitForSelector('#fw-zabn-zo', { timeout: 5000 });
    const during = (await zabNotes(d)).some((n) => n.id === 'zabn-zo');
    await closeWin(d, 'zabn-zo');
    const after = (await zabNotes(d)).some((n) => n.pid === 'zo'), trash = await on(d, () => DB.trash.some((t) => t.item && t.item.id && String(t.item.id).startsWith('zabn-zo')));
    return [during && !after && !trash, JSON.stringify({ during, after, trash })];
  });
  await closeAll(d);
  if (vp.name !== '1440') await on(d, () => { DB.articles = DB.articles.filter((a) => !a.zabNote); persist(); });   /* each size starts clean except the last, which 93e–93h use */
  else await on(d, () => 0);
  if (vp.name !== '1440') await on(d, () => { DB.tombstones = (DB.tombstones || []).filter((t) => !String(t.id).startsWith('zabn-')); persist(); });
}

/* ── 93e ── */
if (want('93e')) {
  const d = devs['1440'], tag = '93e@1440';
  await on(d, () => { if (!_zabNoteOf('zl')) { _zabNoteEnsure('zl'); _znFresh.clear(); } const n = _zabNoteOf('zl'); n.content = '<p>Lifecycle needle</p>'; n.updatedAt = new Date().toISOString(); persist(); });
  await closeAll(d);
  await T(`${tag} Trash the note → the Zab shows "Write a note" again; restore → the note is back`, async () => {
    await on(d, () => trashArt('zabn-zl')); await openZab(d, 'zl'); const a1 = await area(d); await closeAll(d);
    await on(d, () => restoreItem(DB.trash.find((t) => t.type === 'article' && t.item.id === 'zabn-zl').id)); await openZab(d, 'zl'); const a2 = await area(d); await closeAll(d);
    return [a1 === '📝 Write a note for this Zab' && !!a2 && a2.includes('Lifecycle needle'), JSON.stringify({ a1, a2 })];
  });
  await T(`${tag} a Zab renamed keeps the note and the note's title`, async () => {
    const r = await on(d, () => { jebEditPocket('zl', { name: 'Leaf renamed' }); jebRefresh(); const n = _zabNoteOf('zl'); const r = { t: n && n.title, lbl: n && _zabNoteLabel(n) }; jebEditPocket('zl', { name: 'Leaf' }); return r; });
    return [r.t === 'Leaf' && r.lbl === '📝 note of Zab Leaf renamed', JSON.stringify(r)];
  });
  await T(`${tag} a Zab moved into another keeps its note`, async () => {
    const r = await on(d, () => { const ok = jebMovePocketInto('zl', 'zo', 0); const n = _zabNoteOf('zl'); const out = { ok, kept: !!n }; jebMovePocketInto('zl', null, 0); return out; });
    return [r.kept, JSON.stringify(r)];
  });
  await T(`${tag} deleting the (empty) Zab keeps the note, in "📝 Zab notes", the card says "(Zab deleted)"`, async () => {
    const r = await on(d, () => {
      jebClosePanel(); DB.jeb.filter((i) => i.pocketId === 'zl').forEach((i) => jebDeleteItem(i.id));
      const del = jebDeletePocket('zl'); const n = _zabNoteOf('zl');
      return { del, kept: !!n, folder: n && n.folderIds[0], lbl: n && _zabNoteLabel(n), card: n ? artCard(n, false).includes('(Zab deleted)') : false };
    });
    return [r.del && r.kept && r.folder === 'zab-notes' && /\(Zab deleted\)/.test(r.lbl) && r.card, JSON.stringify(r)];
  });
}

/* ── 93f ── */
if (want('93f')) for (const vp of VPS) {
  const d = devs[vp.name], tag = `93f@${vp.name}`;
  await closeAll(d);
  await on(d, () => { if (!_jebPocket('zl')) { const p = jebAddPocket('Leaf', '✶', '#CFE8FF', null); DB.articles.filter((a) => a.zabNote && a.zabNote.pid === 'zl').forEach((a) => { a.zabNote.pid = p; }); window.__zl = p; } else window.__zl = 'zl'; jebRefresh(); });
  const pid = await on(d, () => window.__zl);
  const sha = await on(d, async (b64) => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < u.length; i++) u[i] = bin.charCodeAt(i); return _picPut(u, 'image/png'); }, PNG);
  await on(d, ([p, sha]) => {
    let n = _zabNoteOf(p); if (!n) { n = _zabNoteEnsure(p); _znFresh.clear(); }
    n.content = Array.from({ length: 30 }, (_, i) => '<p>Line ' + i + ' of the long note</p>').join('') + '<p><img class="ed-img" data-pic="' + sha + '" data-mime="image/png" alt=""></p>';
    n.updatedAt = new Date().toISOString(); persist(); jebRefresh();
  }, [pid, sha]);
  await openZab(d, pid);
  await T(`${tag} a long note is clipped with "Show all"; it opens, says "Show less", and clips again`, async () => {
    const m = () => on(d, () => { const b = document.querySelector('#jeb-panel .zn-body'), t = document.querySelector('#jeb-panel .zn-more'); return { h: Math.round(b.getBoundingClientRect().height), sh: b.scrollHeight, lim: Math.round(parseFloat(getComputedStyle(b).fontSize) * 12), txt: t && !t.hidden ? t.textContent : null }; });
    const a = await m(); await tap(d, '#jeb-panel .zn-more'); const b = await m(); await tap(d, '#jeb-panel .zn-more'); const c = await m();
    return [a.txt === 'Show all' && a.h <= a.lim + 2 && b.txt === 'Show less' && b.h > a.h && c.txt === 'Show all' && c.h <= c.lim + 2, JSON.stringify({ a, b, c })];
  });
  await T(`${tag} the fold ▾ hides the note and ▸ brings it back (session only: nothing stored)`, async () => {
    const th = await on(d, () => JSON.stringify(DB.theme));
    await tap(d, '#jeb-panel .zn-fold'); const hid = await on(d, () => !document.querySelector('#jeb-panel .zn-body'));
    await tap(d, '#jeb-panel .zn-fold'); const back = await on(d, () => !!document.querySelector('#jeb-panel .zn-body'));
    return [hid && back && (await on(d, (t) => JSON.stringify(DB.theme) === t, th)), JSON.stringify({ hid, back })];
  });
  await T(`${tag} the picture in the note hydrates (a real image, not the placeholder)`, async () => {
    await tap(d, '#jeb-panel .zn-more'); await sleep(600);
    const r = await on(d, () => { const i = document.querySelector('#jeb-panel .zn-body img[data-pic]'); return i ? { w: i.naturalWidth, src: (i.getAttribute('src') || '').slice(0, 5) } : null; });
    await tap(d, '#jeb-panel .zn-more');
    return [!!r && r.w > 0 && r.src === 'blob:', JSON.stringify(r)];
  });
  await T(`${tag} ✏️ Edit opens the note in the pop-up window, and the text opens it too`, async () => {
    const nid = await on(d, (p) => _zabNoteOf(p).id, pid);
    await tap(d, '#jeb-panel .zn-edit'); const a = await d.page.waitForSelector(`#fw-${nid}`, { timeout: 5000 }).then(() => true, () => false);
    await closeWin(d, nid); await tap(d, '#jeb-panel .zn-body');
    const b = await d.page.waitForSelector(`#fw-${nid}`, { timeout: 5000 }).then(() => true, () => false);
    await closeWin(d, nid);
    return [a && b, JSON.stringify({ a, b })];
  });
  await closeAll(d);
  await T(`${tag} Pane 2's card and the read view say "📝 note of Zab <name>"; a tap opens the Zab`, async () => {
    const r = await on(d, ([pid]) => {
      const n = _zabNoteOf(pid), nm = _jebPocket(pid).name;
      const card = artCard(n, false); const okCard = card.includes('note of Zab ' + nm) && card.includes('_zabNoteGo(');
      return { okCard, id: n.id, nm };
    }, [pid]);
    await on(d, (id) => { ST.article = id; ST.editing = false; try { selArt(id); } catch (e) {} }, r.id); await sleep(500);
    const rv = await on(d, () => { const b = document.querySelector('.av-zn-b'); return b ? b.textContent : null; });
    await on(d, () => document.querySelector('.av-zn-b') && document.querySelector('.av-zn-b').click()); await sleep(500);
    const opened = await on(d, (pid) => _jebOpen === pid && !!document.querySelector('#jeb-panel.on'), pid);
    return [r.okCard && rv === '📝 note of Zab ' + r.nm && opened, JSON.stringify({ ...r, rv, opened })];
  });
  await closeAll(d);
}

/* ── 93g ── */
if (want('93g')) {
  const d = devs['390'], tag = '93g@390', pid = await on(d, () => (DB.articles.find((a) => a.zabNote) || {}).zabNote?.pid);
  await closeAll(d);
  await openZab(d, pid || 'zl');
  await T(`${tag} every new control is at least 44 x 44 (Write a note / the fold ▾ / ✏️ Edit / Show all)`, async () => {
    const r = await on(d, () => [...document.querySelectorAll('#jeb-panel .zn-write,#jeb-panel .zn-fold,#jeb-panel .zn-edit,#jeb-panel .zn-more:not([hidden])')].map((e) => { const b = e.getBoundingClientRect(); return { c: e.className, w: Math.round(b.width), h: Math.round(b.height) }; }));
    return [r.length >= 2 && r.every((x) => x.w >= 44 && x.h >= 44), JSON.stringify(r)];
  });
  await T(`${tag} the note area is not under the round button or the panel's own foot`, async () => {
    const r = await on(d, () => { const z = document.querySelector('#jeb-panel .zn-area').getBoundingClientRect(), p = document.getElementById('jeb-panel').getBoundingClientRect(); const b = document.getElementById('zab-btn'), br = b && b.getBoundingClientRect(); return { inside: z.top >= p.top - 1 && z.bottom <= p.bottom + 1, btn: br ? !(br.left < z.right && br.right > z.left && br.top < z.bottom && br.bottom > z.top) || getComputedStyle(b).display === 'none' : true }; });
    return [r.inside && r.btn, JSON.stringify(r)];
  });
  await closeAll(d);
}

/* ── 93h ── */
if (want('93h')) {
  const d = devs['1440'], tag = '93h@1440';
  await on(d, () => { if (!_jebPocket('zl')) jebAddPocket('Leaf', '✶', '#CFE8FF', null); });
  await on(d, () => { const p = _jebPocket('zl') ? 'zl' : jebPockets()[0].id; let n = _zabNoteOf(p); if (!n) { n = _zabNoteEnsure(p); _znFresh.clear(); } n.content = '<p>unique-zebra-needle</p>'; n.updatedAt = new Date().toISOString(); persist(); });
  await T(`${tag} search finds the note's text`, async () => {
    await on(d, () => { document.getElementById('sq').value = 'unique-zebra-needle'; doSearch('unique-zebra-needle'); }); await sleep(500);
    const n = await on(d, () => document.querySelectorAll('#sb .sr').length);
    await on(d, () => { document.getElementById('sq').value = ''; doSearch(''); });
    return [n >= 1, 'results ' + n];
  });
  await T(`${tag} Save File's copy contains the note`, async () => {
    const html = await on(d, async () => { try { return await _picExportHTML(); } catch (e) { return 'ERR ' + e; } });
    return [typeof html === 'string' && html.includes('unique-zebra-needle') && html.includes('zabn-'), typeof html === 'string' ? 'len ' + html.length : String(html)];
  });
}

/* ── 93d ── */
if (want('93d')) {
  const cloud = makeCloud(), vp = VPS[2], sd = () => seed();
  const A = await addDevice(browser, srv.base, cloud, 'A', { width: vp.w, height: vp.h }, false, sd());
  const B = await addDevice(browser, srv.base, cloud, 'B', { width: vp.w, height: vp.h }, false, sd());
  await T('93d two devices write the first note of one Zab offline, then sync: ONE note zabn-zl, the newer text; a third device shows it', async () => {
    await waitSeeded(cloud, A); await waitSeeded(cloud, B);
    for (const d of [A, B]) { d.offline = true; await d.ctx.setOffline(true); }
    const write = (d, txt) => on(d, (t) => { const a = _zabNoteEnsure('zl'); _znFresh.clear(); a.content = '<p>' + t + '</p>'; a.updatedAt = new Date().toISOString(); persist(); return a.id; }, txt);
    const ia = await write(A, 'text from A'); await sleep(1200); const ib = await write(B, 'text from B newer');
    for (const d of [A, B]) { d.offline = false; await d.ctx.setOffline(false); cloud.reconnect(d); }
    await push(cloud, A); await push(cloud, B);
    const good = async (d) => on(d, () => { const ns = DB.articles.filter((a) => a.zabNote && a.zabNote.pid === 'zl'); return ns.length === 1 && ns[0].id === 'zabn-zl' && ns[0].content.includes('from B newer') && DB.folders.filter((f) => f.id === 'zab-notes').length === 1; });
    const ok = await waitFor(async () => (await good(A)) && (await good(B)), 40000);
    await push(cloud, A); await push(cloud, B);
    const C = await addDevice(browser, srv.base, cloud, 'C', { width: vp.w, height: vp.h }, false, sd());
    const seen = await waitFor(async () => on(C, () => !!_zabNoteOf('zl')), 40000);
    let txt = null;
    if (seen) { await zabTap(C.page, '#jeb-bar .jeb-chip[data-pid="zl"] .jeb-main'); await sleep(500); txt = await on(C, () => { const e = document.querySelector('#jeb-panel.on .zn-area'); return e ? e.textContent : null; }); }
    const stable = (await on(A, () => DB.articles.filter((a) => a.zabNote).length)) === 1;
    return [ia === 'zabn-zl' && ib === 'zabn-zl' && ok && stable && !!txt && txt.includes('from B newer'), JSON.stringify({ ia, ib, ok, stable, txt: txt && txt.slice(0, 60), errs: [...A.errors, ...B.errors, ...C.errors].slice(0, 2) })];
  });
  /* 93j (Architect, review of #214): an edit of the note received by sync repaints the OPEN Zab's note area — the targeted redraw (_renderFor) must count a
     note carrying zabNote as a Zab change, or the area keeps the old text until something else repaints the panel */
  await T('93j an edit of the note made on another device shows in the OPEN Zab\'s note area after sync (targeted redraw)', async () => {
    await zabTap(A.page, '#jeb-bar .jeb-chip[data-pid="zl"] .jeb-main'); await sleep(500);
    const before = await on(A, () => { const e = document.querySelector('#jeb-panel.on .zn-area'); return e ? e.textContent : null; });
    await on(B, () => { const a = _zabNoteOf('zl'); a.content = '<p>synced needle 93j</p>'; a.updatedAt = new Date().toISOString(); persist(); });
    await push(cloud, B);
    const got = await waitFor(async () => on(A, () => (_zabNoteOf('zl') || {}).content?.includes('synced needle 93j')), 40000);
    await sleep(800);
    const after = await on(A, () => { const e = document.querySelector('#jeb-panel.on .zn-area'); return e ? e.textContent : null; });
    const mode = await on(A, () => _rdLast && _rdLast.mode);
    return [got && !!before && before.includes('from B newer') && !!after && after.includes('synced needle 93j'), JSON.stringify({ got, before: before && before.slice(0, 40), after: after && after.slice(0, 40), mode })];
  });
}

/* ── 93i — Zab mode ── */
if (want('93i')) for (const vp of [VPS[0], VPS[2]]) {
  const d = await openDev(vp, { path: '/?jeb=1' }), tag = `93i@${vp.name} Zab mode`;
  await T(`${tag}: the note area shows above the items of a leaf Zab`, async () => {
    await openZab(d, 'zl', true); const a = await area(d); return [a === '📝 Write a note for this Zab', String(a)];
  });
  await T(`${tag}: a real tap writes in the pop-up window, and the text is back in the docked panel`, async () => {
    await tap(d, '#jeb-panel .zn-write'); await d.page.waitForSelector('#fw-zabn-zl', { timeout: 5000 });
    const shown = await on(d, () => getComputedStyle(document.getElementById('fw-zabn-zl')).display !== 'none');
    await typeNote(d, 'zabn-zl', 'docked needle'); await waitFor(async () => (await zabNotes(d)).some((n) => n.c.includes('docked')));
    await closeWin(d, 'zabn-zl'); const a = await area(d);
    return [shown && !!a && a.includes('docked needle') && await on(d, () => !!document.querySelector('#jeb-panel.on')), JSON.stringify({ shown, a })];
  });
  await T(`${tag}: no page errors`, async () => [d.errors.length === 0, d.errors.slice(0, 2).join(' · ')]);
  await d.ctx.close();
}

await T('93g no page errors on any size', async () => [allErrors().length === 0, allErrors().slice(0, 3).join(' · ')]);

const bad = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - bad}/${results.length} passed${bad ? `, ${bad} FAILED` : ''}`);
await browser.close(); await srv.close?.();
process.exit(bad ? 1 : 0);
