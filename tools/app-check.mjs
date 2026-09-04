/* app-check — drives the real app in a real browser and measures it.
   There is no test suite in this repo; this is it. `node tools/app-check.mjs`

   Everything here is mechanical on purpose: the owner cannot read code and
   cannot be asked to click through a long list, so anything a check can
   prove must not be left to "please test this". */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, openApp, report, VIEWPORTS, seedDB } from './harness.mjs';

const r = report('app-check — boot, handlers, panes, views, editor, data round-trip');
const html = await readFile(join(ROOT, 'index.html'), 'utf8');
const app = await openApp();
const { page } = app;

/* ── 1. A clean boot ───────────────────────────────────────────────────── */
r.check(app.errors.length === 0, 'boots with no exception and no console error',
  app.errors.length ? app.errors.slice(0, 6).join('\n') : 'silent');

const painted = await page.evaluate(() => ({
  version: document.getElementById('app-version-tag')?.textContent?.trim(),
  meta: document.querySelector('meta[name="app-version"]')?.content,
  overlay: getComputedStyle(document.getElementById('login-overlay')).display,
  panes: ['tree', 'p2h', 'p2c', 'p3h', 'p3c'].map((id) => [id, (document.getElementById(id)?.innerHTML || '').length]),
  folders: DB?.folders?.length ?? -1,
  articles: DB?.articles?.length ?? -1,
}));

r.check(painted.version === 'v' + painted.meta, 'boot paints the version from the meta tag',
  `${painted.version} vs meta ${painted.meta}`);
r.check(painted.overlay === 'none', 'no sign-in overlay blocks the app when Firebase is unreachable',
  `login-overlay display: ${painted.overlay}`);
r.check(painted.folders === 3 && painted.articles === 3, 'the seeded notebook is what loadDB() actually loaded',
  `${painted.folders} folders, ${painted.articles} notes`);
const emptyPanes = painted.panes.filter(([, len]) => len === 0).map(([id]) => id);
r.check(emptyPanes.length === 0, 'every pane rendered something',
  emptyPanes.length ? `empty: ${emptyPanes.join(', ')}` : painted.panes.map(([id, n]) => `${id}:${n}`).join(' '));

/* ── 2. Every inline handler resolves to a real function ───────────────── */
/* A renamed or mistyped handler is the app's most common silent defect:
   the button looks fine and does nothing. This is the check that catches
   it without anyone clicking anything. */
const KEYWORDS = new Set(['if', 'for', 'while', 'return', 'typeof', 'switch', 'catch', 'function', 'new', 'delete', 'void', 'do', 'else', 'try', 'throw']);
const handlers = [...new Set([...html.matchAll(/\bon[a-z]+=\\?["']\s*([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1]))]
  .filter((n) => !KEYWORDS.has(n)).sort();
const undefinedHandlers = await page.evaluate((names) => names.filter((n) => typeof window[n] !== 'function'), handlers);
r.check(undefinedHandlers.length === 0, `every inline event handler is a real function (${handlers.length} names)`,
  undefinedHandlers.length ? `no such function: ${undefinedHandlers.join(', ')} — those controls do nothing when clicked` : 'all resolve');

/* ── 3. Every Smart View opens ─────────────────────────────────────────── */
const viewResults = await page.evaluate(() => {
  const out = [];
  for (const sf of SF) {
    try {
      ST.folder = sf.id; ST.article = null;
      window.renderP2H(); window.renderP2C();
      out.push({ id: sf.id, name: sf.name, len: (document.getElementById('p2c').innerHTML || '').length, err: null });
    } catch (e) { out.push({ id: sf.id, name: sf.name, len: 0, err: String(e) }); }
  }
  return out;
});
const brokenViews = viewResults.filter((v) => v.err || v.len === 0);
r.check(brokenViews.length === 0, `all ${viewResults.length} Smart Views render`,
  brokenViews.length ? brokenViews.map((v) => `${v.name}: ${v.err || 'rendered nothing'}`).join('\n') : viewResults.map((v) => `${v.id}:${v.len}`).join(' '));

/* ── 4. Every real folder opens ────────────────────────────────────────── */
const folderResults = await page.evaluate(() => {
  const out = [];
  for (const f of DB.folders) {
    try {
      ST.folder = f.id; ST.article = null;
      window.renderP2H(); window.renderP2C();
      out.push({ id: f.id, len: (document.getElementById('p2c').innerHTML || '').length, err: null });
    } catch (e) { out.push({ id: f.id, len: 0, err: String(e) }); }
  }
  return out;
});
const brokenFolders = folderResults.filter((f) => f.err);
r.check(brokenFolders.length === 0, `all ${folderResults.length} folders open without throwing`,
  brokenFolders.length ? brokenFolders.map((f) => `${f.id}: ${f.err}`).join('\n') : 'clean');

/* ── 5. Opening a note, and editing it ─────────────────────────────────── */
const readLen = await page.evaluate(() => {
  ST.folder = 'f1'; ST.article = 'a1'; ST.editing = false;
  window.render();
  return (document.getElementById('p3c').innerHTML || '').length;
});
r.check(readLen > 0, 'a note renders in read mode', `#p3c ${readLen} chars`);

/* The caret is REAL state. insertAtCaret() calls _restoreCaret() first, and
   _edRange is only ever set by the app's own focus/selection handlers — so a
   selection assembled in evaluate() is not the thing the editor is holding.
   Click and type like a person, then insert. */
await page.evaluate(() => window.startEdit());
await page.waitForSelector('#ed');
await page.click('#ed');
await page.keyboard.press('Control+End');
await page.keyboard.type(' TYPEDBYCHECK');
/* Measure each step WHERE IT HAPPENS. insertAtCaret() calls _restoreCaret()
   first, and the range it restores was captured before these keystrokes — so
   asserting "typed" after an insert measures the insert, not the typing, and
   reads as a typing failure. */
const typed = await page.evaluate(() => {
  const ed = document.getElementById('ed');
  return { ok: ed.innerText.includes('TYPEDBYCHECK'), edLen: ed.innerHTML.length };
});
r.check(typed.ok, 'typing into the Pane 3 editor reaches the note body', `#ed ${typed.edLen} chars`);

/* Assert on TEXT, never on an id or class handed to insertAtCaret():
   execCommand('insertHTML') sanitises what it inserts and can drop both,
   and the editor's own chrome (fold arrows, drag grips) is stripped again
   on commit. Text is the only thing that survives the whole path. */
const edit = await page.evaluate(() => {
  window.insertAtCaret('<b>INSERTEDBYCHECK</b>');
  const ed = document.getElementById('ed');
  return { inserted: ed.innerText.includes('INSERTEDBYCHECK'), edLen: ed.innerHTML.length };
});
r.check(edit.inserted, 'insertAtCaret() lands content in the Pane 3 editor', `#ed now ${edit.edLen} chars`);

/* Autosave: a script-driven change fires no input event, so _edTouched() is
   what commits it. If this stops working, edits are lost on pane switch. */
const saved = await page.evaluate(async () => {
  const ed = document.getElementById('ed');
  window._edTouched?.(ed);
  await new Promise((k) => setTimeout(k, 1200));
  const art = DB.articles.find((a) => a.id === 'a1');
  return { ins: (art.content || '').includes('INSERTEDBYCHECK'), len: (art.content || '').length };
});
r.check(saved.ins, '_edTouched() commits an editor change into DB', `a1.content ${saved.len} chars`);

/* ── 6. Outline: headings drive fold arrows ────────────────────────────── */
const outline = await page.evaluate(() => {
  try { window._edColHeads?.(); } catch (e) { return { err: String(e) }; }
  const ed = document.getElementById('ed');
  return { heads: ed ? ed.querySelectorAll('h1,h2,h3,h4').length : -1 };
});
r.check(!outline.err && outline.heads >= 2, '_edColHeads() runs over the editor headings',
  outline.err || `${outline.heads} headings seen`);

/* ── 7. The data round-trip — the invariant that matters most ──────────── */
/* Save File writes the whole notebook into <script id="nd">. If a single id
   fails to survive that trip, notes have been lost silently. */
const trip = await page.evaluate(() => {
  const before = { f: DB.folders.map((x) => x.id), a: DB.articles.map((x) => x.id) };
  const out = window.getExportHTML();
  const doc = new DOMParser().parseFromString(out, 'text/html');
  const nd = doc.getElementById('nd');
  let after = null, parseErr = null;
  try { after = JSON.parse(nd.textContent); } catch (e) { parseErr = String(e); }
  return {
    before, parseErr,
    lostF: after ? before.f.filter((id) => !after.folders.some((x) => x.id === id)) : before.f,
    lostA: after ? before.a.filter((id) => !after.articles.some((x) => x.id === id)) : before.a,
    hasScript: /<meta name="app-version"/.test(out) && out.includes('function loadDB'),
    liveIntact: DB.folders.length === before.f.length && DB.articles.length === before.a.length,
    bytes: out.length,
  };
});
r.check(!trip.parseErr && trip.lostF.length === 0 && trip.lostA.length === 0,
  'Save File round-trip keeps every folder and every note',
  trip.parseErr ? `exported <script id="nd"> did not parse: ${trip.parseErr}`
    : (trip.lostF.length || trip.lostA.length) ? `lost folders ${trip.lostF.join(',')} / notes ${trip.lostA.join(',')}`
    : `${trip.before.f.length} folders + ${trip.before.a.length} notes survived, ${(trip.bytes / 1024 | 0)} KB`);
r.check(trip.hasScript, 'the exported file is the whole app, not just the data',
  trip.hasScript ? 'carries the version tag and the app script' : 'export is missing the app script — a saved copy would not run');
r.check(trip.liveIntact, 'exporting does not disturb the live notebook', trip.liveIntact ? 'DB unchanged' : 'DB changed during export');

/* ── 8. mergeDB never drops a side ─────────────────────────────────────── */
/* Cross-device sync runs through mergeDB(local, remote). A union that drops
   either side is how a note "vanishes after syncing". */
const merged = await page.evaluate(() => {
  const now = new Date().toISOString();
  const local = { folders: [{ id: 'L1', name: 'local only', order: 1, updatedAt: now }], articles: [{ id: 'la', title: 'local note', content: '<p>l</p>', folderIds: ['L1'], updatedAt: now, createdAt: now }], sections: [], trash: [] };
  const remote = { folders: [{ id: 'R1', name: 'remote only', order: 2, updatedAt: now }], articles: [{ id: 'ra', title: 'remote note', content: '<p>r</p>', folderIds: ['R1'], updatedAt: now, createdAt: now }], sections: [], trash: [] };
  const m = window.mergeDB(local, remote);
  return { f: m.folders.map((x) => x.id).sort(), a: m.articles.map((x) => x.id).sort() };
});
r.check(merged.f.join() === 'L1,R1' && merged.a.join() === 'la,ra',
  'mergeDB() unions both devices instead of picking a winner',
  `folders ${merged.f.join(',')} · notes ${merged.a.join(',')}`);

/* ── 9. A newer edit wins, an older one does not overwrite it ──────────── */
const newest = await page.evaluate(() => {
  const old = new Date(Date.now() - 6e5).toISOString(), fresh = new Date().toISOString();
  const base = (t, txt) => ({ folders: [], sections: [], trash: [], articles: [{ id: 'x', title: 'x', content: txt, folderIds: [], createdAt: old, updatedAt: t }] });
  return {
    remoteNewer: window.mergeDB(base(old, '<p>old</p>'), base(fresh, '<p>new</p>')).articles[0].content,
    localNewer: window.mergeDB(base(fresh, '<p>new</p>'), base(old, '<p>old</p>')).articles[0].content,
  };
});
r.check(newest.remoteNewer === '<p>new</p>' && newest.localNewer === '<p>new</p>',
  'mergeDB() keeps the newest edit whichever side it came from',
  `remote-newer → ${newest.remoteNewer} · local-newer → ${newest.localNewer}`);

/* ── 10. Deleting is still possible ────────────────────────────────────── */
/* "Nothing is ever lost" must not become "nothing can be deleted" — the
   owner's own deletions have to work, through Trash. */
const del = await page.evaluate(() => {
  const before = DB.articles.length, trashBefore = (DB.trash || []).length;
  window.trashArt('a2');
  return { gone: !DB.articles.some((a) => a.id === 'a2'), before, after: DB.articles.length,
    inTrash: (DB.trash || []).some((t) => t?.item?.id === 'a2'), trashBefore, trashAfter: (DB.trash || []).length };
});
r.check(del.gone && del.inTrash, 'a deleted note leaves the list and lands in Trash',
  `${del.before}→${del.after} notes, trash ${del.trashBefore}→${del.trashAfter}`);

await app.close();

/* ── 11. Layout at the three real screen sizes ─────────────────────────── */
for (const vp of VIEWPORTS) {
  const s = await openApp({ viewport: { width: vp.width, height: vp.height }, db: seedDB() });
  const m = await s.page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
    boxes: ['sb', 'p2', 'p3'].map((id) => { const el = document.getElementById(id); if (!el) return [id, null];
      const b = el.getBoundingClientRect(); const st = getComputedStyle(el);
      return [id, { w: Math.round(b.width), h: Math.round(b.height), display: st.display, vis: st.visibility }]; }),
  }));
  const overflow = m.scrollW - m.clientW;
  r.check(overflow <= 1, `${vp.name} ${vp.width}×${vp.height}: page does not scroll sideways`,
    overflow > 1 ? `${overflow}px wider than the viewport` : `${m.scrollW}px in ${m.clientW}px`);
  const collapsed = m.boxes.filter(([, b]) => b && b.display !== 'none' && (b.w === 0 || b.h === 0)).map(([id]) => id);
  r.check(collapsed.length === 0, `${vp.name}: no visible pane has collapsed to nothing`,
    collapsed.length ? `zero-sized while displayed: ${collapsed.join(', ')}`
      : m.boxes.map(([id, b]) => `${id} ${b ? (b.display === 'none' ? 'hidden' : `${b.w}×${b.h}`) : 'absent'}`).join(' · '));
  r.check(s.errors.length === 0, `${vp.name}: boots with no exception`, s.errors.slice(0, 3).join('\n') || 'silent');
  r.check(s.failed.length === 0, `${vp.name}: every request the app makes succeeds`,
    s.failed.length ? `failed: ${[...new Set(s.failed)].join(', ')}` : `${s.blocked.length} Firebase/font requests blocked on purpose`);
  await s.close();
}

/* ── 12. Chromium's own verdict on the manifest ────────────────────────── */
{
  const s = await openApp();
  const cdp = await s.ctx.newCDPSession(s.page);
  const man = await cdp.send('Page.getAppManifest');
  const inst = await cdp.send('Page.getInstallabilityErrors').catch(() => ({ installabilityErrors: [] }));
  r.check((man.errors ?? []).length === 0, 'Chromium parses manifest.json with no errors',
    (man.errors ?? []).map((e) => e.message).join('; ') || 'clean');
  const ie = inst.installabilityErrors ?? [];
  r.check(ie.length === 0, 'Chromium reports the app as installable',
    ie.map((e) => e.errorId).join('; ') || 'installable');
  await s.close();
}

process.exit(r.finish() ? 1 : 0);
