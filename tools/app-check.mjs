/* app-check — drives the real app in a real browser and measures it.
   There is no test suite in this repo; this is it. `node tools/app-check.mjs`

   Everything here is mechanical on purpose: the owner cannot read code and
   cannot be asked to click through a long list, so anything a check can
   prove must not be left to "please test this". */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, openApp, report, VIEWPORTS, seedDB } from './harness.mjs';

const r = report('app-check — boot, handlers, panes, views, editor, data round-trip');

/* Relative luminance / contrast, WCAG 2.1. Colours come out of the browser as
   rgb()/rgba(), so a translucent one is composited over what is behind it
   before anything is judged — an alpha colour compared against nothing is not
   a measurement. `stack` is the backgrounds from the element outward, as the
   page paints them. */
const px = (c) => { const m = String(c).match(/[\d.]+/g).map(Number);
  return { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 }; };
const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a),
  g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
const lum = ({ r, g, b }) => { const f = (v) => { v /= 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05); };
const flatten = (stack) => { let bg = px('rgb(255,255,255)');
  for (let i = stack.length - 1; i >= 0; i--) bg = over(px(stack[i]), bg);
  return bg; };
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

/* ── 6b. v04.07: a line to write on, above and below the note ──────────── */
/* The gutter is #ed's own padding and leftover height, so a click there
   lands on #ed itself — for the top, the bottom AND the sides alike. These
   drive REAL mouse clicks, because the caret is real browser state and a
   Range assembled in evaluate() is not what the editor is holding. */
const edSetup = async (html) => {
  await page.evaluate((h) => {
    const a = DB.articles.find((x) => x.id === 'a1');
    a.content = h; a.sectionState = {};
    ST.article = 'a1'; ST.editing = false; window.render(); window.startEdit();
  }, html);
  await page.waitForSelector('#ed');
  await page.waitForTimeout(150);
  return page.evaluate(() => {
    const ed = document.getElementById('ed');
    const b = ed.getBoundingClientRect();
    const k = [...ed.children].map((c) => c.getBoundingClientRect()).filter((x) => x.width || x.height);
    return { left: b.left, right: b.right, top: b.top, bottom: b.bottom,
      firstTop: k[0].top, lastBottom: k[k.length - 1].bottom };
  });
};
const edShape = () => page.evaluate(() => [...document.getElementById('ed').children]
  .map((c) => c.tagName + ':' + (c.textContent || '').replace(/[⠿▼▶]/g, '')).join(' | '));

/* BELOW: this used to drop the caret at the END of the last block, so on a
   note ending in a heading the typing carried on the heading itself. */
let g = await edSetup('<h2>TOPHEAD</h2><p>middle</p><h2>LASTHEAD</h2>');
await page.mouse.click(g.left + 120, Math.min(g.bottom - 6, g.lastBottom + 40));
await page.keyboard.type('BELOWTEXT');
await page.waitForTimeout(120);
const below = await page.evaluate(() => {
  const ed = document.getElementById('ed');
  const last = ed.lastElementChild;
  const heads = [...ed.querySelectorAll('h1,h2,h3,h4')];
  return { tag: last.tagName, text: (last.textContent || '').trim(),
    headClean: heads.every((h) => !/BELOWTEXT/.test(h.textContent)) };
});
r.check(below.tag === 'P' && below.text === 'BELOWTEXT' && below.headClean,
  'clicking below the last block opens a new line, not the end of the heading',
  `last is <${below.tag.toLowerCase()}> "${below.text}"`);

/* SIDE: a click beside a block is the browser's business, not ours. */
const sideBefore = await edShape();
await page.mouse.click(g.left + 3, (g.firstTop + g.lastBottom) / 2);
await page.waitForTimeout(120);
const sideAfter = await edShape();
r.check(sideBefore === sideAfter, 'clicking beside a block adds nothing',
  `${(await page.evaluate(() => document.getElementById('ed').children.length))} blocks, unchanged`);

/* ABOVE: a note opening with a heading had nothing in front of it to click
   into — the caret landed at offset 1 of the <h2>, between the fold grip and
   the fold arrow. */
g = await edSetup('<h2>TOPHEAD</h2><p>middle</p>');
if (g.top >= g.firstTop - 4) {
  r.pass('top gutter above the first heading', 'no gutter at this size — skipped');
} else {
  await page.mouse.click(g.left + 120, (g.top + g.firstTop) / 2);
  await page.keyboard.type('ABOVETEXT');
  await page.waitForTimeout(120);
  const above = await page.evaluate(() => {
    const ed = document.getElementById('ed');
    const f = ed.firstElementChild;
    return { tag: f.tagName, text: (f.textContent || '').trim(),
      headClean: [...ed.querySelectorAll('h1,h2,h3,h4')].every((h) => !/ABOVETEXT/.test(h.textContent)) };
  });
  r.check(above.tag === 'P' && above.text === 'ABOVETEXT' && above.headClean,
    'clicking above a leading heading opens a line in front of it',
    `first is <${above.tag.toLowerCase()}> "${above.text}"`);
}

/* A note that OPENS with a plain paragraph must keep the browser's own
   behaviour — the caret already lands at the start of that paragraph. */
g = await edSetup('<p>plainfirst</p><h2>TOPHEAD</h2>');
const plainBefore = await page.evaluate(() => document.getElementById('ed').children.length);
if (g.top < g.firstTop - 4) await page.mouse.click(g.left + 120, (g.top + g.firstTop) / 2);
await page.waitForTimeout(120);
const plainAfter = await page.evaluate(() => document.getElementById('ed').children.length);
r.check(plainBefore === plainAfter, 'a note starting with a paragraph is left to the browser',
  `${plainAfter} blocks, unchanged`);

/* The v03.67.01 "Enter above the first heading" rule tested the caret with
   pre.toString(), which counts the fold grip and arrow as characters — so it
   never fired once the chrome existed, and Enter split the heading into a
   stray chrome-only heading instead. _edPrefixText() strips the chrome. */
g = await edSetup('<h2>TOPHEAD</h2><p>middle</p>');
await page.evaluate(() => {
  const h = document.getElementById('ed').querySelector('h2');
  const t = [...h.childNodes].find((n) => n.nodeType === 3);
  const rg = document.createRange(); rg.setStart(t, 0); rg.collapse(true);
  const s = getSelection(); s.removeAllRanges(); s.addRange(rg);
  document.getElementById('ed').focus();
});
await page.keyboard.press('Enter');
await page.keyboard.type('ENTERTEXT');
await page.waitForTimeout(120);
const ent = await page.evaluate(() => {
  const ed = document.getElementById('ed');
  const f = ed.firstElementChild;
  const heads = [...ed.querySelectorAll('h1,h2,h3,h4')];
  return { tag: f.tagName, text: (f.textContent || '').trim(),
    stray: heads.some((h) => !(h.textContent || '').replace(/[⠿▼▶]/g, '').trim()) };
});
r.check(ent.tag === 'P' && ent.text === 'ENTERTEXT' && !ent.stray,
  'Enter at the start of the first heading writes above it, not into it',
  ent.stray ? 'left a chrome-only empty heading behind' : `first is <${ent.tag.toLowerCase()}> "${ent.text}"`);

/* A click on a heading's left edge landed the caret between the grip and the
   arrow, so typing went in among the chrome. It belongs at the start of the
   heading's own text — and the chrome must survive. */
g = await edSetup('<h2>TOPHEAD</h2><p>middle</p>');
const arr = await page.evaluate(() => {
  const a = document.getElementById('ed').querySelector('h2 .ed-col-arr');
  if (!a) return null;
  const b = a.getBoundingClientRect();
  return { x: b.right + 2, y: b.top + b.height / 2 };
});
if (!arr) r.fail('caret nudged out of a heading’s fold chrome', 'no .ed-col-arr was injected');
else {
  await page.mouse.click(arr.x, arr.y);
  await page.keyboard.type('Z');
  await page.waitForTimeout(120);
  const nudge = await page.evaluate(() => {
    const h = document.getElementById('ed').querySelector('h2');
    return { text: (h.textContent || '').replace(/[⠿▼▶]/g, ''),
      chrome: !!(h.querySelector('.ed-col-grip') && h.querySelector('.ed-col-arr')) };
  });
  r.check(nudge.text === 'ZTOPHEAD' && nudge.chrome,
    'typing at a heading’s left edge writes at the front of the title',
    `heading reads "${nudge.text}", chrome ${nudge.chrome ? 'intact' : 'LOST'}`);
}

/* Opening a line and then walking away must not dirty the note by itself —
   nothing in the gutter path calls _edTouched().
   The settle wait is not padding: a debounced autosave armed by the TYPING in
   the checks above outlives its editor (renderP3C() builds a fresh #ed, the
   old timer still fires and commits whatever #ed holds by then). Without it
   this check measures that stale timer and reads as a failure that isn't one.
   _ED_AUTOSAVE_MAX_MS is the ceiling, so wait past it on both sides. */
g = await edSetup('<h2>TOPHEAD</h2><p>middle</p>');
await page.waitForTimeout(2800);
const clean = await page.evaluate(() => ({ before: DB.articles.find((a) => a.id === 'a1').content }));
await page.mouse.click(g.left + 120, Math.min(g.bottom - 6, g.lastBottom + 40));
await page.waitForTimeout(2800);
const stillClean = await page.evaluate((b) => { const c = DB.articles.find((a) => a.id === 'a1').content; return { same: c === b, before: b, after: c }; }, clean.before);
r.check(stillClean.same, 'opening a line without typing leaves the note untouched in DB',
  stillClean.same ? 'no autosave fired on a bare click' : `before=${JSON.stringify(stillClean.before)}\nafter =${JSON.stringify(stillClean.after)}`);


/* ── 6c. v04.08: the read view's chrome folded into two rows ───────────── */
/* The note view used to stack six rows before the note's first line. Home,
   the type chips and the section tools now live in the Pane-3 toolbar, and
   the version strip and the date line share one meta row. */
const viewNote = async (html, aid = 'a1') => {
  await page.evaluate(({ h, id }) => {
    const a = DB.articles.find((x) => x.id === id);
    if (h != null) a.content = h;
    ST.editing = false; ST.article = id; window.render();
  }, { h: html, id: aid });
  await page.waitForTimeout(200);
};

await viewNote('<h2>ALPHA</h2><p>alpha body</p><h2>BETA</h2><p>beta body</p>');
const folded = await page.evaluate(() => ({
  kindRow: !!document.querySelector('#p3c .kind-bar'),
  colRow: !!document.querySelector('#p3c .col-toolbar'),
  homeRow: (document.getElementById('p3-srch-bar')?.textContent || '').trim(),
  homeInTb: !!document.querySelector('#p3h button[onclick="goHome()"]'),
  chipsInTb: !!document.querySelector('#p3h .p3h-nti-inline .nti-chip, #p3h .p3h-nti-inline .nti-no-type'),
  typesInTb: !!document.querySelector('#p3h .nti-picker-btn'),
  colBtn: document.getElementById('col-tb-wrap') ? getComputedStyle(document.getElementById('col-tb-wrap')).display : 'MISSING',
}));
r.check(!folded.kindRow && !folded.colRow && !folded.homeRow,
  'the read view no longer stacks a Home row, a type row and a section-tools row',
  `kind-bar ${folded.kindRow ? 'STILL THERE' : 'gone'} · col-toolbar ${folded.colRow ? 'STILL THERE' : 'gone'} · Home row ${folded.homeRow ? 'STILL THERE' : 'gone'}`);
r.check(folded.homeInTb && folded.chipsInTb && folded.typesInTb && folded.colBtn !== 'none',
  'Home, the type chips and the section tools moved into the Pane-3 toolbar',
  `home ${folded.homeInTb} · chips ${folded.chipsInTb} · Types ${folded.typesInTb} · section-tools display ${folded.colBtn}`);

/* The version strip and the date line share ONE line when there is room. */
const meta = await page.evaluate(() => {
  const row = document.querySelector('#p3c .p3-meta-row');
  if (!row) return null;
  const v = row.querySelector('.ver-strip'), d = row.querySelector('.note-dateline');
  if (!v || !d) return { v: !!v, d: !!d };
  const vb = v.getBoundingClientRect(), db2 = d.getBoundingClientRect();
  return { v: true, d: true, sameLine: Math.abs(vb.top - db2.top) < 24, dateRight: db2.left > vb.right };
});
r.check(meta && meta.v && meta.d && meta.sameLine && meta.dateRight,
  'the version strip and the date line share one row, dates to the right',
  meta ? `sameLine ${meta.sameLine} · dates right of versions ${meta.dateRight}` : 'no .p3-meta-row rendered');

/* The bug v04.08 found: fitting was first written against window.innerWidth,
   but on a 1215px screen the three-pane layout leaves Pane 3 only ~485px wide
   — so a window-width test read "desktop, plenty of room" and squeezed the
   type chips to ZERO width, silently removing them.
   UPDATED for v04.09, which deliberately changed half of what this asserted:
   the row no longer wraps, so at 485px the Types/Attach/Archive buttons are
   FOLDED into the 🏷 palette on purpose and are 0px wide by design. What must
   still hold is that nothing is lost — the note's own type chip stays visible,
   and Types is still reachable, from the palette button if not inline. */
await page.setViewportSize({ width: 1215, height: 661 });
await viewNote(null);
const narrow = await page.evaluate(() => {
  const vis = (el) => !!el && el.offsetParent !== null;
  const p3 = document.getElementById('p3').getBoundingClientRect();
  const chip = document.querySelector('#p3h .p3h-nti-inline .nti-chip, #p3h .p3h-nti-inline .nti-no-type');
  const types = document.querySelector('#p3h .p3h-nti-inline .nti-picker-btn');
  const grpBtn = document.getElementById('p3h-nti-grp');
  return { p3w: Math.round(p3.width),
    chipW: chip && vis(chip) ? Math.round(chip.getBoundingClientRect().width) : 0,
    typesInline: vis(types), typesViaPalette: vis(grpBtn),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
});
r.check(narrow.chipW > 0 && (narrow.typesInline || narrow.typesViaPalette) && narrow.overflow <= 1,
  'at a narrow Pane 3 the type chip stays visible and Types stays reachable',
  `Pane 3 ${narrow.p3w}px · chip ${narrow.chipW}px · Types inline ${narrow.typesInline} / via palette ${narrow.typesViaPalette} · overflow ${narrow.overflow}px`);
await page.setViewportSize({ width: 1400, height: 900 });
await page.waitForTimeout(150);

/* The section-tools button is driven by whether the note HAS headings — that
   is decided in _initCollapsible(), the only place that knows. */
await viewNote('<p>no headings at all here</p>');
const noHead = await page.evaluate(() => getComputedStyle(document.getElementById('col-tb-wrap')).display);
await viewNote('<h2>ALPHA</h2><p>alpha body</p><h2>BETA</h2><p>beta body</p>');
const withHead = await page.evaluate(() => getComputedStyle(document.getElementById('col-tb-wrap')).display);
r.check(noHead === 'none' && withHead !== 'none',
  'the section-tools button shows only on a note that has headings',
  `no headings → ${noHead} · with headings → ${withHead}`);

/* Collapse all / Expand all still work, now from the popover. */
await page.click('#col-tb-btn');
await page.waitForTimeout(150);
const popBtns = await page.evaluate(() => [...document.querySelectorAll('#col-pop button')].map((b) => b.textContent.trim()));
await page.evaluate(() => [...document.querySelectorAll('#col-pop button')].find((b) => /Collapse all/.test(b.textContent)).click());
await page.waitForTimeout(250);
const collapsed = await page.evaluate(() => ({
  clp: document.querySelectorAll('#p3c .col-sec.clp').length,
  hidden: [...document.querySelectorAll('#p3c .col-body')].every((b) => b.style.display === 'none'),
}));
await page.click('#col-tb-btn');
await page.waitForTimeout(150);
await page.evaluate(() => [...document.querySelectorAll('#col-pop button')].find((b) => /Expand all/.test(b.textContent)).click());
await page.waitForTimeout(250);
const expanded = await page.evaluate(() => document.querySelectorAll('#p3c .col-sec.clp').length);
r.check(popBtns.length === 3 && collapsed.clp === 2 && collapsed.hidden && expanded === 0,
  'Collapse all / Expand all still work from the section-tools popover',
  `${popBtns.length} actions · collapsed ${collapsed.clp} · expanded back to ${expanded}`);

/* Every control that moved must still DO its job from its new home.
   UPDATED for v04.11, which deliberately moved both controls this asserted:
   🏷 Types is the first row of the 📎 Attach menu now, and 📦 Archive left the
   read toolbar for ⋯ More. Clicking `#p3h .kind-arch-btn` threw here — the
   button is genuinely gone from read mode, which is the change, not a break.
   What must still hold is that both still WORK, from their new homes. */
await page.evaluate(() => document.querySelector('#p3h .nti-attach-btn').click());
await page.waitForTimeout(250);
const attachRows = await page.evaluate(() => (document.getElementById('ctx')?.textContent || ''));
await page.evaluate(() => {
  [...document.querySelectorAll('#ctx .ci')].find((c) => /Note Type/.test(c.textContent))?.click();
});
await page.waitForTimeout(300);
const typesOpen = await page.evaluate(() => {
  const p = document.getElementById('nti-picker');
  if (!p || !p.classList.contains('open')) return null;
  const b = p.getBoundingClientRect();
  /* It is positioned from the menu row it was clicked on. A row measured
     after the menu was hidden would be 0×0 and put the picker in the corner. */
  return { open: true, left: Math.round(b.left), top: Math.round(b.top) };
});
await page.evaluate(() => { closeNtiPicker(); hideCtx(); });
const archBefore = await page.evaluate(() => !!DB.articles.find((a) => a.id === 'a1').archived);
await page.evaluate(() => {
  window.showArtCtx({ clientX: 40, clientY: 60, preventDefault() {}, stopPropagation() {} }, 'a1');
  [...document.querySelectorAll('#ctx .ci')].find((c) => /Archive/.test(c.textContent)).click();
});
await page.waitForTimeout(300);
const archAfter = await page.evaluate(() => !!DB.articles.find((a) => a.id === 'a1').archived);
await page.evaluate((v) => { const a = DB.articles.find((x) => x.id === 'a1'); a.archived = v; window.render(); }, archBefore);
r.check(/Note Type/.test(attachRows) && /Folder/.test(attachRows)
  && typesOpen && typesOpen.top > 10 && archBefore !== archAfter,
  'Note Type opens from the Attach menu, anchored to its row, and Archive works from ⋯',
  `Attach menu "${attachRows.replace(/\s+/g, ' ').slice(0, 60)}" · picker ${typesOpen ? `at ${typesOpen.left},${typesOpen.top}` : 'DID NOT OPEN'} · archive ${archBefore} → ${archAfter}`);

/* The landing page has no Pane-3 toolbar to carry Home, so it keeps its row. */
await page.evaluate(() => { ST.article = null; ST.editing = false; window.render(); });
await page.waitForTimeout(250);
const landing = await page.evaluate(() => (document.getElementById('p3-srch-bar')?.textContent || '').trim());
r.check(/Home/.test(landing), 'the landing page keeps its own Home row', landing || '(empty)');

/* Edit mode was NOT part of this round and must be exactly as it was. */
await page.evaluate(() => { ST.article = 'a1'; ST.editing = false; window.render(); window.startEdit(); });
await page.waitForTimeout(300);
const editTb = await page.evaluate(() => ({
  unified: !!document.querySelector('.p3h-unified-tb'),
  editing: document.getElementById('p3h').classList.contains('editing'),
  dir: getComputedStyle(document.getElementById('p3h')).flexDirection,
}));
r.check(editTb.unified && editTb.editing && editTb.dir === 'column',
  'edit mode’s own toolbar is untouched by the view-mode rearrangement',
  `unified bar ${editTb.unified} · #p3h.editing ${editTb.editing} · ${editTb.dir}`);
await page.evaluate(() => { ST.editing = false; ST.article = 'a1'; window.render(); });
await page.waitForTimeout(200);


/* ── 6d. v04.09: one row of buttons, bunched by type when it will not fit ─ */
/* On a phone v04.08's wrapping toolbar became THREE rows. The row is nowrap
   now and folds by measuring itself. These open their own app per size,
   because the fold depends on the width of Pane 3, not of the window. */
const TB_SIZES = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'narrow Pane 3', width: 1215, height: 661 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'wide', width: 1920, height: 1000 },
];
const tbRows = [];
for (const vp of TB_SIZES) {
  const s = await openApp({ viewport: { width: vp.width, height: vp.height }, db: seedDB() });
  await s.page.evaluate(() => { const a = DB.articles.find((x) => x.id === 'a1');
    a.content = '<h2>Alpha</h2><p>a</p>'; selArt('a1'); });
  await s.page.waitForTimeout(450);
  tbRows.push({ vp, m: await s.page.evaluate(() => {
    const el = document.getElementById('p3h');
    const r = el.getBoundingClientRect();
    const vis = (b) => b.offsetParent !== null;
    const btns = [...el.querySelectorAll('button')].filter(vis);
    const rowTops = new Set(btns.map((b) => Math.round(b.getBoundingClientRect().top / 8)));
    return {
      paneW: el.clientWidth, rowH: Math.round(r.height), rows: rowTops.size,
      overflow: el.scrollWidth - el.clientWidth,
      /* UPDATED for v04.10, which inserted a fold stage between 'tight' and
         'tighter': the two pop-up buttons drop their words. Without this arm
         a row folded to 'nolbl' would read as 'full' and the progression
         check below would be measuring nothing. */
      mode: el.classList.contains('p3h-tightest') ? 'tightest'
          : el.classList.contains('p3h-tighter') ? 'tighter'
          : el.classList.contains('p3h-nolbl') ? 'nolbl'
          : el.classList.contains('p3h-tight') ? 'tight' : 'full',
      minH: Math.min(...btns.map((b) => Math.round(b.getBoundingClientRect().height))),
      minW: Math.min(...btns.map((b) => Math.round(b.getBoundingClientRect().width))),
      editVisible: btns.some((b) => /Edit/.test(b.textContent)),
      /* Everything that can fold must still be REACHABLE — inline or behind
         its palette button. Nothing may simply disappear. */
      actionsReachable: !!(el.querySelector('.p3h-actions') && vis(el.querySelector('.p3h-actions')))
        || vis(document.getElementById('p3h-act-grp')),
      typesReachable: !!(el.querySelector('.p3h-nti-inline .nti-picker-btn') && vis(el.querySelector('.p3h-nti-inline .nti-picker-btn')))
        || vis(document.getElementById('p3h-nti-grp')),
      clipped: btns.filter((b) => b.getBoundingClientRect().right > r.right + 0.5).length,
    };
  }) });
  await s.close();
}
const oneRow = tbRows.filter((x) => x.m.rows > 1 || x.m.clipped > 0);
r.check(oneRow.length === 0, 'the note toolbar is one row at every size, with nothing clipped off it',
  tbRows.map((x) => `${x.vp.name} ${x.m.paneW}px → ${x.m.rows} row(s), ${x.m.clipped} clipped`).join(' · '));

const folds = tbRows.map((x) => x.m.mode);
r.check(tbRows.every((x) => x.m.overflow <= 1) && folds.includes('full') && folds.some((f) => f !== 'full'),
  'it folds progressively as Pane 3 narrows, and never overflows',
  tbRows.map((x) => `${x.vp.name} ${x.m.paneW}px → ${x.m.mode} (over ${x.m.overflow}px)`).join(' · '));

r.check(tbRows.every((x) => x.m.editVisible && x.m.actionsReachable && x.m.typesReachable),
  'folding hides nothing — Edit stays out, actions and Types stay reachable',
  tbRows.map((x) => `${x.vp.name}: edit ${x.m.editVisible}, actions ${x.m.actionsReachable}, types ${x.m.typesReachable}`).join(' · '));

const phone = tbRows.find((x) => x.vp.name === 'phone').m;
const desk = tbRows.find((x) => x.vp.name === 'wide').m;
r.check(phone.minH >= 42 && phone.minW >= 42 && desk.minH >= 34 && desk.minW >= 26,
  'the toolbar buttons are a real touch size — 42px+ on a phone',
  `phone smallest ${phone.minW}×${phone.minH}px · wide smallest ${desk.minW}×${desk.minH}px`);

/* The palettes must actually DO the things they list. */
{
  const s = await openApp({ viewport: { width: 390, height: 844 }, db: seedDB() });
  await s.page.evaluate(() => { const a = DB.articles.find((x) => x.id === 'a1');
    a.content = '<h2>Alpha</h2><p>a</p>'; selArt('a1'); });
  await s.page.waitForTimeout(450);
  await s.page.click('#p3h-act-grp');
  await s.page.waitForTimeout(250);
  const pal = await s.page.evaluate(() => {
    const p = document.getElementById('p3h-pal');
    return { open: !!p?.classList.contains('open'),
      labels: [...p.querySelectorAll('.p3h-pal-btn')].map((b) => b.textContent.trim()),
      /* Pop-out is hidden under 900px by its own CSS, so the palette must not
         offer to open something the app will refuse to show.
         UPDATED for v04.10: these rows are named "Multi Notes Pop-Up" and
         "Single Note Pop-Up" now — the old /Pop out|as a panel/ could never
         match again and the check would have passed while blind. */
      offersPopout: /Pop-Up/i.test(p.textContent),
      minH: Math.min(...[...p.querySelectorAll('.p3h-pal-btn')].map((b) => Math.round(b.getBoundingClientRect().height))) };
  });
  /* UPDATED for v04.11. This clicked "Make a copy" in the palette; the palette
     mirrors the row, and Make a copy / Archive / Delete left the row for ⋯
     More, so that row is gone by design and the click threw. What must still
     hold is that the palette REACHES them — one tap further in, through ⋯ —
     and that a copy really gets made at the end of it. */
  const nBefore = await s.page.evaluate(() => DB.articles.length);
  await s.page.evaluate(() => [...document.querySelectorAll('#p3h-pal .p3h-pal-btn')].find((b) => /^⋯|More/.test(b.textContent)).click());
  await s.page.waitForTimeout(300);
  const more = await s.page.evaluate(() => {
    const t = document.getElementById('ctx')?.textContent || '';
    return { copy: /Make a copy/.test(t), arch: /Archive/.test(t), del: /Delete/.test(t) };
  });
  await s.page.evaluate(() => [...document.querySelectorAll('#ctx .ci')].find((c) => /Make a copy/.test(c.textContent)).click());
  await s.page.waitForTimeout(500);
  const nAfter = await s.page.evaluate(() => DB.articles.length);
  await s.page.click('#p3h-nti-grp');
  await s.page.waitForTimeout(250);
  const ntiPal = await s.page.evaluate(() => {
    const p = document.getElementById('p3h-pal');
    /* 🏷 Types left the bar for the Attach menu in v04.11, so the type palette
       carries the chips and 📎 Attach — Types is one tap inside Attach. */
    return { chips: !!p && /No type|nti-chip/.test(p.innerHTML), attach: !!p && /Attach/.test(p.textContent) };
  });
  r.check(pal.open && pal.labels.length >= 5 && !pal.offersPopout && pal.minH >= 42
    && more.copy && more.arch && more.del
    && nAfter === nBefore + 1 && ntiPal.chips && ntiPal.attach,
    'the palettes list the folded buttons with words, at a tappable size, and they work',
    `${pal.labels.length} actions (${pal.minH}px tall) · pop-out offered on a phone: ${pal.offersPopout} · ⋯ holds copy ${more.copy}/archive ${more.arch}/delete ${more.del} · copy made ${nBefore}→${nAfter} · type palette chips ${ntiPal.chips} / Attach ${ntiPal.attach}`);
  await s.close();
}


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

/* ── 6e. v04.10: the two pop-up buttons say which is which ─────────────── */
/* They were ⊡ and ⛶ — two faint square glyphs beside a third square glyph
   (⧉ Make a copy), indistinguishable without a hover. Each now carries a
   drawn icon and, while the row has room, its own word. */
{
  /* 1600, not 1440: MEASURED, the row wants 737px of Pane 3 to carry the
     words with the type group folded, and a 1440 window leaves Pane 3 only
     710px — 27px short. 1600 gives it 870px. The next check covers what
     happens at the sizes where they do not fit. */
  const s2 = await openApp({ viewport: { width: 1600, height: 900 }, db: seedDB() });
  await s2.page.evaluate(() => { const a = DB.articles.find((x) => x.id === 'a1');
    a.content = '<h2>Alpha</h2><p>a</p>'; selArt('a1'); });
  await s2.page.waitForTimeout(450);

  const pop = await s2.page.evaluate(() => {
    const el = document.getElementById('p3h');
    const vis = (n) => !!n && n.offsetParent !== null;
    const m = el.querySelector('.pop-btn.pop-multi'), s = el.querySelector('.pop-btn.pop-single');
    const dup = [...el.querySelectorAll('button')].find((b) => /Make a copy/.test(b.title || ''));
    const box = (n) => { const r = n.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; };
    return {
      both: !!m && !!s,
      /* Drawn, not typed — a glyph the device has no font for is an empty box,
         which is the bug v04.09 paid for with 🗐. An <svg> cannot do that. */
      drawn: !!m?.querySelector('svg.pop-ico') && !!s?.querySelector('svg.pop-ico'),
      noGlyph: !/[⊡⛶]/.test((m?.textContent || '') + (s?.textContent || '')),
      words: [m, s].map((b) => b.querySelector('.pop-lbl')?.textContent.trim()).join('/'),
      wordsShown: vis(m.querySelector('.pop-lbl')) && vis(s.querySelector('.pop-lbl')),
      /* The two must not read the same, and must not read like ⧉ next door. */
      sameShape: JSON.stringify(m.querySelector('svg').innerHTML) === JSON.stringify(s.querySelector('svg').innerHTML),
      /* v04.12 — Multi is three sheets, and they stand upright. A two-layer or
         landscape drawing means the redraw silently did not land. */
      multiLayers: m.querySelectorAll('svg rect').length,
      multiPortrait: [...m.querySelectorAll('svg rect')]
        .every((x) => parseFloat(x.getAttribute('height')) > parseFloat(x.getAttribute('width'))),
      tinted: getComputedStyle(m).color !== getComputedStyle(s).color,
      titles: [m.title, s.title],
      dupTitle: dup ? dup.textContent.trim() : '(none)',
      mW: box(m).w, sW: box(s).w, mH: box(m).h,
      paneW: el.clientWidth,
    };
  });
  r.check(pop.both && pop.drawn && pop.noGlyph && !pop.sameShape
    && pop.multiLayers === 3 && pop.multiPortrait,
    'the two pop-up buttons are drawn icons, and Multi is three upright sheets',
    `both present ${pop.both} · svg ${pop.drawn} · no ⊡/⛶ glyph left ${pop.noGlyph}` +
    ` · identical drawing ${pop.sameShape} · Multi layers ${pop.multiLayers} · all portrait ${pop.multiPortrait}`);
  r.check(/Multi Notes Pop-Up/.test(pop.titles[0]) && /Single Note Pop-Up/.test(pop.titles[1]),
    'each one names itself in its tooltip',
    pop.titles.join('  ·  '));
  r.check(pop.wordsShown && pop.words === 'Multi/Single' && pop.tinted,
    'where the pane can carry them the words are on the buttons, tinted apart',
    `Pane 3 ${pop.paneW}px · words "${pop.words}" shown ${pop.wordsShown} · different colour ${pop.tinted} · ${pop.mW}×${pop.mH}px`);
  await s2.close();
}

/* "As long as space permits" is the whole ask, so it is measured: the words
   must appear when the pane can carry them, fold away when it cannot, and
   never push the row into overflowing or into a second line. */
{
  const WORD_SIZES = [
    { name: 'phone', width: 390, height: 844 },
    { name: 'tablet', width: 820, height: 1180 },
    { name: 'laptop', width: 1440, height: 900 },
    { name: 'wide', width: 1920, height: 1000 },
  ];
  const rows = [];
  for (const vp of WORD_SIZES) {
    const s2 = await openApp({ viewport: { width: vp.width, height: vp.height }, db: seedDB() });
    await s2.page.evaluate(() => { const a = DB.articles.find((x) => x.id === 'a1');
      a.content = '<h2>Alpha</h2><p>a</p>'; selArt('a1'); });
    await s2.page.waitForTimeout(450);
    rows.push({ vp, m: await s2.page.evaluate(() => {
      const el = document.getElementById('p3h');
      const vis = (n) => !!n && n.offsetParent !== null;
      const lbl = el.querySelector('.pop-lbl');
      const btn = el.querySelector('.pop-btn');
      const tops = new Set([...el.querySelectorAll('button')].filter(vis)
        .map((b) => Math.round(b.getBoundingClientRect().top / 8)));
      return {
        pane: el.clientWidth,
        words: vis(lbl),
        /* Folded or not, the button itself must still be reachable and a real
           target — unless the whole action group has gone to the ⋯ palette. */
        btnVisible: vis(btn),
        btnW: btn && vis(btn) ? Math.round(btn.getBoundingClientRect().width) : 0,
        actionsFolded: !vis(el.querySelector('.p3h-actions')),
        popInPalette: vis(document.getElementById('p3h-act-grp')),
        overflow: el.scrollWidth - el.clientWidth,
        rows: tops.size,
      };
    }) });
    await s2.close();
  }
  const fmt = rows.map((x) => `${x.vp.name} pane ${x.m.pane}px → words ${x.m.words ? 'shown' : 'folded'}, ${x.m.rows} row(s), over ${x.m.overflow}px`).join(' · ');
  r.check(rows.every((x) => x.m.overflow <= 1 && x.m.rows === 1),
    'the words never break the one-row rule or push the toolbar over its width', fmt);
  r.check(rows.some((x) => x.m.words) && rows.some((x) => !x.m.words),
    'the words show where the pane can carry them and fold away where it cannot', fmt);
  /* Nothing may simply vanish: wherever the button itself is folded out of the
     row, the ⋯ palette must be there to reach it.
     Only above 900px, because below it there is nothing to reach — pop-ups
     are display:none under 900px and openNotePopup() refuses to open one, so
     the palette deliberately does not offer them either. Asserting otherwise
     was a wrong assertion on this checker's part, not a defect in the app. */
  const lost = rows.filter((x) => x.vp.width >= 900 && !x.m.btnVisible && !x.m.popInPalette);
  r.check(lost.length === 0, 'above 900px, wherever the pop-up buttons fold away the ⋯ palette reaches them',
    lost.length ? `unreachable at: ${lost.map((x) => x.vp.name).join(', ')}` : fmt);
  /* Folded back to icons, the button must be the same target it was before
     this round — the words are an addition, not a squeeze. */
  const folded = rows.filter((x) => x.vp.width >= 900 && x.m.btnVisible && !x.m.words);
  r.check(folded.every((x) => x.m.btnW >= 36),
    'with the words off, the buttons are the same size target they were in v04.09',
    folded.map((x) => `${x.vp.name} ${x.m.btnW}px`).join(' · ') || 'no size folded to icons');
}

/* The full names must be everywhere the button is not: both menus. */
{
  const s2 = await openApp({ viewport: { width: 1440, height: 900 }, db: seedDB() });
  await s2.page.evaluate(() => { selArt('a1'); });
  await s2.page.waitForTimeout(400);
  const menu = await s2.page.evaluate(() => {
    window.showArtCtx({ clientX: 40, clientY: 60, preventDefault() {}, stopPropagation() {} }, 'a1');
    const t = document.getElementById('ctx').textContent;
    return { multi: /Multi Notes Pop-Up/.test(t), single: /Single Note Pop-Up/.test(t),
      /* v04.09 swapped 🗐 for ⧉ on the toolbar because Android drew it as an
         empty box, but the right-click menu kept the bad glyph. */
      badGlyph: /🗐/.test(t), text: t.slice(0, 90) };
  });
  r.check(menu.multi && menu.single && !menu.badGlyph,
    'the right-click menu carries both full names, and the 🗐 glyph v04.09 replaced is gone',
    `Multi ${menu.multi} · Single ${menu.single} · 🗐 still there ${menu.badGlyph}`);
  await s2.close();
}

/* ── 6f. v04.11: three actions under one button, and boxes round them all ─ */
{
  const s2 = await openApp({ viewport: { width: 1440, height: 900 }, db: seedDB() });
  await s2.page.evaluate(() => { const a = DB.articles.find((x) => x.id === 'a1');
    a.content = '<h2>Alpha</h2><p>a</p>'; selArt('a1'); });
  await s2.page.waitForTimeout(450);

  /* Make a copy, Archive and Delete came off the row. The only acceptable
     version of that is: gone from the row AND all three present in ⋯ More. */
  const consolidated = await s2.page.evaluate(() => {
    const el = document.getElementById('p3h');
    const vis = (n) => !!n && n.offsetParent !== null;
    const onRow = [...el.querySelectorAll('button')].filter(vis)
      .map((b) => (b.title || '') + ' ' + b.textContent).join(' | ');
    const more = [...el.querySelectorAll('button')].filter(vis).find((b) => /^More/.test(b.title || ''));
    more?.click();
    const menu = document.getElementById('ctx')?.textContent || '';
    return {
      copyOnRow: /Make a copy/.test(onRow), delOnRow: /🗑/.test(onRow), archOnRow: /Archive|📦/.test(onRow),
      moreExists: !!more, moreHint: more?.title || '',
      inMenu: { copy: /Make a copy/.test(menu), arch: /Archive/.test(menu), del: /Delete/.test(menu) },
    };
  });
  await s2.page.evaluate(() => hideCtx());
  r.check(!consolidated.copyOnRow && !consolidated.delOnRow && !consolidated.archOnRow
    && consolidated.inMenu.copy && consolidated.inMenu.arch && consolidated.inMenu.del,
    'Copy, Archive and Delete are off the row and all three sit under ⋯ More',
    `on the row: copy ${consolidated.copyOnRow} / archive ${consolidated.archOnRow} / delete ${consolidated.delOnRow}` +
    ` · in ⋯: copy ${consolidated.inMenu.copy} / archive ${consolidated.inMenu.arch} / delete ${consolidated.inMenu.del}`);
  /* ⋯ was anonymous "More options" while those buttons still sat beside it.
     Now that it is where they went, it has to say so — the owner asked what
     the three-dot button was even for. */
  r.check(/copy/i.test(consolidated.moreHint) && /archive/i.test(consolidated.moreHint)
    && /delete/i.test(consolidated.moreHint),
    'the ⋯ button names what it now holds instead of saying "More options"',
    consolidated.moreHint || '(no title)');

  /* 📎 Attach stays on the row; 🏷 Types is one tap inside it. */
  const attach = await s2.page.evaluate(() => {
    const el = document.getElementById('p3h');
    const vis = (n) => !!n && n.offsetParent !== null;
    const at = el.querySelector('.nti-attach-btn');
    return { onRow: vis(at), typesOnRow: !!el.querySelector('#p3h .nti-picker-btn:not(.nti-attach-btn):not(.nti-save)'),
      chip: vis(el.querySelector('.nti-chip, .nti-no-type')) };
  });
  r.check(attach.onRow && !attach.typesOnRow && attach.chip,
    'Attach is on the row, Types is not, and the note’s own type chip still shows',
    `Attach on row ${attach.onRow} · a separate Types button ${attach.typesOnRow} · chip visible ${attach.chip}`);

  /* Every button in its own box — the row was nine borderless glyphs. */
  const boxes = await s2.page.evaluate(() => {
    const el = document.getElementById('p3h');
    const vis = (n) => n.offsetParent !== null;
    const btns = [...el.querySelectorAll('button')].filter(vis);
    const clear = btns.filter((b) => {
      const c = getComputedStyle(b);
      /* transparent / zero-width borders and no background is the old look */
      return (c.borderTopStyle === 'none' || parseFloat(c.borderTopWidth) < 0.5
        || c.borderTopColor === 'rgba(0, 0, 0, 0)' || c.borderTopColor === 'transparent')
        && (c.backgroundColor === 'rgba(0, 0, 0, 0)' || c.backgroundColor === 'transparent');
    });
    return { n: btns.length, clear: clear.map((b) => (b.title || b.textContent).trim().slice(0, 18)),
      radius: getComputedStyle(btns[0]).borderRadius };
  });
  r.check(boxes.clear.length === 0,
    'every button on the row is drawn in its own rounded box',
    boxes.clear.length ? `still borderless: ${boxes.clear.join(', ')}`
      : `${boxes.n} buttons, radius ${boxes.radius}`);
  await s2.close();
}

/* Every button on the row must actually DO something when clicked.
   This is the check that would have caught the ⋯ button: its onclick passed a
   bare `curA.id`, a const local to renderP3H(), so the handler threw
   ReferenceError and the button was dead. Section 2's "every inline handler is
   a real function" cannot see this — the function name (showArtCtx) is real;
   it is an ARGUMENT that does not exist. So click them for real and watch for
   a page error. Each click re-renders from a clean state first, because some
   of these buttons navigate or open editors. */
{
  const s2 = await openApp({ viewport: { width: 1600, height: 900 }, db: seedDB() });
  const thrown = [];
  s2.page.on('pageerror', (e) => thrown.push(String(e).split('\n')[0]));
  const n = await s2.page.evaluate(() => {
    selArt('a1');
    return [...document.querySelectorAll('#p3h button')].filter((b) => b.offsetParent !== null).length;
  });
  await s2.page.waitForTimeout(300);
  const dead = [];
  for (let i = 0; i < n; i++) {
    const label = await s2.page.evaluate((idx) => {
      ST.editing = false; ST.article = 'a1'; window.render();
      const b = [...document.querySelectorAll('#p3h button')].filter((x) => x.offsetParent !== null)[idx];
      if (!b) return null;
      const name = (b.title || b.textContent || '?').trim().slice(0, 22);
      b.click();
      return name;
    }, i);
    await s2.page.waitForTimeout(120);
    if (label && thrown.length) { dead.push(`${label} → ${thrown.pop()}`); }
    await s2.page.evaluate(() => { try { hideCtx(); closeNtiPicker(); closeFloatPop('p3h-pal'); closeAllPopouts(); } catch (e) {} });
  }
  r.check(dead.length === 0, `every button on the note toolbar does something when clicked (${n} buttons)`,
    dead.length ? `these threw and do nothing: ${dead.join(' · ')}` : `${n} clicked, no handler threw`);

  /* v04.12 — "it did not throw" is NOT the same as "it opened", and this is
     the check that was missing. The ⋯ button handed showArtCtx a synthesised
     event whose stopPropagation() was a no-op, so the real click carried on
     to `document.addEventListener('click', () => hideCtx())` and the menu was
     shut in the same tick it was built. No error, menu populated, nothing on
     screen — v04.11 read both of those as a pass and shipped it still broken.
     So: a REAL mouse click through Playwright, then ask whether the menu is
     still painted a moment later. */
  await s2.page.evaluate(() => { ST.editing = false; ST.article = 'a1'; window.render(); });
  await s2.page.waitForTimeout(300);
  await s2.page.click('#p3h .p3h-actions button:last-child');
  await s2.page.waitForTimeout(350);
  const menuAfterClick = await s2.page.evaluate(() => {
    const c = document.getElementById('ctx');
    const b = c.getBoundingClientRect();
    return { display: getComputedStyle(c).display, w: Math.round(b.width), h: Math.round(b.height),
      rows: c.querySelectorAll('.ci').length,
      onScreen: b.width > 40 && b.height > 40 && b.left >= 0 && b.top >= 0 };
  });
  r.check(menuAfterClick.display !== 'none' && menuAfterClick.onScreen && menuAfterClick.rows >= 10,
    'the ⋯ menu is still on screen after a real left-click, not closed in the same tick',
    `display ${menuAfterClick.display} · ${menuAfterClick.w}×${menuAfterClick.h}px · ${menuAfterClick.rows} rows`);
  await s2.page.evaluate(() => hideCtx());
  await s2.close();
}

/* ── 6g. v04.13: the type chip is a badge, not a delete button ──────────── */
/* It called toggleNoteKind(), so one tap on what reads as a label stripped the
   note's type. It opens the type picker now. Both halves are asserted: the
   types must be UNCHANGED by the tap, and the picker must actually open —
   anchored to the chip, not dumped in the corner. */
{
  const s2 = await openApp({ viewport: { width: 1600, height: 900 }, db: seedDB() });
  await s2.page.evaluate(() => { selArt('a1'); });
  await s2.page.waitForTimeout(400);
  const chipTap = await s2.page.evaluate(() => {
    const before = artKinds(DB.articles.find((a) => a.id === 'a1')).slice();
    const chip = document.querySelector('#p3h .nti-chip');
    if (!chip) return { noChip: true };
    const hint = chip.title;
    chip.click();
    const after = artKinds(DB.articles.find((a) => a.id === 'a1')).slice();
    const p = document.getElementById('nti-picker');
    const b = p ? p.getBoundingClientRect() : null;
    return { before, after, hint,
      kept: JSON.stringify(before) === JSON.stringify(after),
      opened: !!p && p.classList.contains('open'),
      anchored: !!b && b.width > 40 && b.top > 10 && b.left > 10 };
  });
  await s2.page.evaluate(() => { try { closeNtiPicker(); } catch (e) {} });
  r.check(!chipTap.noChip && chipTap.kept && chipTap.opened && chipTap.anchored
    && !/remove/i.test(chipTap.hint),
    'tapping the note-type chip opens the picker and does NOT strip the type',
    chipTap.noChip ? 'no chip rendered'
      : `types ${JSON.stringify(chipTap.before)} → ${JSON.stringify(chipTap.after)}` +
        ` · picker opened ${chipTap.opened}, anchored ${chipTap.anchored} · tooltip "${chipTap.hint}"`);

  /* A type can still be removed deliberately — from the picker itself.
     This first asserted that removing the note's ONLY type reduced the count,
     and failed. That was a wrong assertion, not a defect: toggleNoteKind()
     ends with `if(!kinds.length)kinds.push('general')`, so "general" is the
     FALLBACK a note falls back to, and a note always carries at least one
     type. The real question is whether a type you deliberately added can be
     taken off again, so the check adds one and removes it. */
  const stillRemovable = await s2.page.evaluate(() => {
    const other = noteKinds().map((k) => k.id).find((id) => id !== 'general');
    if (!other) return { skipped: true };
    window.toggleNoteKind('a1', other);
    const withIt = artKinds(DB.articles.find((x) => x.id === 'a1')).slice();
    window.toggleNoteKind('a1', other);
    const without = artKinds(DB.articles.find((x) => x.id === 'a1')).slice();
    return { other, withIt, without,
      added: withIt.includes(other), removed: !without.includes(other) };
  });
  r.check(stillRemovable.skipped || (stillRemovable.added && stillRemovable.removed),
    'a type can still be added and taken off deliberately, from the picker',
    stillRemovable.skipped ? 'only one note type exists in the seed'
      : `"${stillRemovable.other}" on → ${JSON.stringify(stillRemovable.withIt)}` +
        ` · off → ${JSON.stringify(stillRemovable.without)}`);
  await s2.close();
}

/* ── 6h. v04.14: the sidebar header reads, and fits its own pane ───────── */
/* Three complaints, one row: the version number was invisible, the buttons
   were four different sizes, and the ▾ beside 🏠 was a 14×19px speck. */
{
  /* The sidebar colour is owner-settable (Appearance ▸ Custom colours), so
     the fixed grey #6A7F6C the version tag used to be painted in scored 4.3:1
     on the Forest preset and about 1.2:1 on the teal the owner had actually
     set — invisible, which is what was reported. Measured on both. */
  for (const [label, sidebar] of [['the Forest preset', null], ['a custom teal sidebar', '#0B7A6B']]) {
    const db = seedDB();
    if (sidebar) db.theme = { preset: 'forest', custom: { sidebar } };
    const s = await openApp({ viewport: { width: 1440, height: 900 }, db });
    await s.page.evaluate(() => { document.getElementById('sb').style.width = '390px'; });
    await s.page.waitForTimeout(400);
    const m = await s.page.evaluate(() => {
      const tag = document.getElementById('app-version-tag');
      const input = document.querySelector('.sb-si input');
      const cs = getComputedStyle(tag);
      return {
        sbBg: getComputedStyle(document.getElementById('sb')).backgroundColor,
        tag: { color: cs.color, bg: cs.backgroundColor, text: tag.textContent.trim(),
          shown: tag.offsetParent !== null, w: Math.round(tag.getBoundingClientRect().width) },
        siBg: getComputedStyle(document.querySelector('.sb-si')).backgroundColor,
        input: getComputedStyle(input).color,
        placeholder: getComputedStyle(input, '::placeholder').color,
      };
    });
    await s.close();
    const sbBg = px(m.sbBg);
    const tagBg = over(px(m.tag.bg), sbBg);
    const tagC = ratio(over(px(m.tag.color), tagBg), tagBg);
    r.check(m.tag.shown && m.tag.w > 20 && tagC >= 4.5,
      `the version badge is legible on ${label}`,
      `${m.tag.text} — ${tagC.toFixed(1)}:1 against its own pill, ${m.tag.w}px wide, painted ${m.tag.shown}`);

    const siBg = over(px(m.siBg), sbBg);
    const phC = ratio(over(px(m.placeholder), siBg), siBg);
    const inC = ratio(over(px(m.input), siBg), siBg);
    r.check(phC >= 3 && inC >= 4.5,
      `the search box reads on ${label} too — placeholder and typed text both`,
      `placeholder ${phC.toFixed(1)}:1 · typed text ${inC.toFixed(1)}:1`);
  }

  /* The header is a PANE, not the screen: the sidebar is draggable from 160px
     to 540px, so a 1440px laptop can be showing a 200px one. At 200px the old
     header ran 292px wide and pushed 🧰 and ⚙ off the edge of the pane, where
     nothing could reach them. Every width is measured after the layout has
     settled — a class toggled on a resize is not applied in the same frame. */
  {
    const s = await openApp({ viewport: { width: 1440, height: 900 }, db: seedDB() });
    const rows = [];
    for (const w of [160, 200, 240, 280, 330, 390, 460, 540]) {
      rows.push(await s.page.evaluate(async (width) => {
        document.getElementById('sb').style.width = width + 'px';
        await new Promise((ok) => setTimeout(ok, 250));
        const hd = document.querySelector('.sb-hd');
        const box = hd.getBoundingClientRect();
        const vis = [...hd.querySelectorAll('button')].filter((b) => b.offsetParent !== null);
        const outside = vis.filter((b) => { const q = b.getBoundingClientRect();
          return q.left < box.left - 0.5 || q.right > box.right + 0.5
              || q.top < box.top - 0.5 || q.bottom > box.bottom + 0.5; })
          .map((b) => (b.title || b.textContent).trim().slice(0, 14));
        const tag = document.getElementById('app-version-tag');
        return { width, buttons: vis.length, outside,
          overflow: hd.scrollWidth - hd.clientWidth,
          badge: tag.offsetParent !== null && tag.getBoundingClientRect().width > 20,
          name: document.querySelector('.sb-logo-name').offsetParent !== null,
          rows: Math.round(box.height) };
      }, w));
    }
    await s.close();
    const bad = rows.filter((x) => x.outside.length || x.overflow > 1 || x.buttons !== 5 || !x.badge);
    r.check(bad.length === 0,
      'the header fits the sidebar at every width it can be dragged to, 160px to 540px',
      bad.length ? bad.map((x) => `${x.width}px: ${x.buttons} buttons, ${x.overflow}px overflow`
        + `${x.outside.length ? `, outside the header: ${x.outside.join(', ')}` : ''}${x.badge ? '' : ', version badge gone'}`).join(' · ')
        : rows.map((x) => `${x.width}:${x.rows}px${x.name ? '' : ' (wordmark folded)'}`).join(' '));
    /* The fold is measured, not guessed: the word "Siyagah" is the first
       thing to go and it only goes when it genuinely does not fit. */
    const wide = rows.filter((x) => x.width >= 390);
    r.check(wide.every((x) => x.name),
      'at a normal sidebar width the wordmark, the badge and all five buttons share one row',
      wide.map((x) => `${x.width}px ${x.rows}px tall, wordmark ${x.name}`).join(' · '));
  }

  /* One size, one shape. The row was 37×36, 14×19, 37×36, 42×40 and 37×45,
     in four different font sizes. The ▾ is the one deliberate exception: it
     is the narrow half of a split button, so it is checked on both of its
     dimensions — Math.min() would call a 26×34 target "26px". */
  {
    const s = await openApp({ viewport: { width: 1440, height: 900 }, db: seedDB() });
    await s.page.evaluate(() => { document.getElementById('sb').style.width = '390px'; });
    await s.page.waitForTimeout(400);
    const m = await s.page.evaluate(() => {
      const hd = document.querySelector('.sb-hd');
      const b = [...hd.querySelectorAll('button')].filter((x) => x.offsetParent !== null)
        .map((x) => { const q = x.getBoundingClientRect(); const c = getComputedStyle(x);
          return { cv: x.classList.contains('sb-home-cv'), w: Math.round(q.width), h: Math.round(q.height),
            radius: c.borderTopLeftRadius, fs: c.fontSize, t: (x.title || '').slice(0, 12) }; });
      return { b };
    });
    await s.close();
    const cv = m.b.find((x) => x.cv);
    const rest = m.b.filter((x) => !x.cv);
    const sizes = [...new Set(rest.map((x) => `${x.w}×${x.h}`))];
    const fonts = [...new Set(rest.map((x) => x.fs))];
    r.check(sizes.length === 1 && fonts.length === 1 && rest.every((x) => x.w >= 34 && x.h >= 34),
      'every header button is the same square, in the same icon size',
      `${rest.length} buttons at ${sizes.join(' / ')}, font ${fonts.join(' / ')}`);
    r.check(!!cv && cv.w >= 26 && cv.h >= 34,
      'the ▾ beside 🏠 is a real target, not the 14×19px speck it was',
      cv ? `${cv.w}×${cv.h}` : 'the ▾ is not in the header at all');
  }

  /* Phone: the same row has to be thumb-sized. 42px is the size the note
     toolbar is already held to (v04.09). Both dimensions, per the ▾ lesson. */
  {
    const s = await openApp({ viewport: { width: 390, height: 844 }, db: seedDB() });
    await s.page.waitForTimeout(400);
    const m = await s.page.evaluate(() => [...document.querySelectorAll('.sb-hd button')]
      .filter((b) => b.offsetParent !== null)
      .map((b) => { const q = b.getBoundingClientRect();
        return { cv: b.classList.contains('sb-home-cv'), t: (b.title || '').slice(0, 12),
          w: Math.round(q.width), h: Math.round(q.height) }; }));
    const small = m.filter((x) => (x.cv ? x.w < 30 || x.h < 42 : x.w < 42 || x.h < 42));
    r.check(m.length >= 5 && small.length === 0,
      'on a phone every header button is a 42px touch target (the ▾ 30px wide, full height)',
      small.length ? small.map((x) => `${x.t} ${x.w}×${x.h}`).join(', ')
        : m.map((x) => `${x.w}×${x.h}`).join(' '));
    await s.close();
  }

  /* And it still opens. A handler that survives is not a menu that stays
     open — v04.11 shipped a ⋯ that passed both of those and was shut in the
     same tick by the global click-closer. So: a real mouse click, then look
     again a moment later and see whether the menu is still painted. */
  {
    const s = await openApp({ viewport: { width: 1440, height: 900 }, db: seedDB() });
    const thrown = [];
    s.page.on('pageerror', (e) => thrown.push(String(e).split('\n')[0]));
    await s.page.evaluate(() => { document.getElementById('sb').style.width = '390px'; });
    await s.page.waitForTimeout(400);
    await s.page.locator('.sb-home-cv').click();
    await s.page.waitForTimeout(250);
    const dd = await s.page.evaluate(() => { const el = document.getElementById('sb-home');
      const q = el.getBoundingClientRect();
      return { painted: getComputedStyle(el).display !== 'none' && q.width > 0 && q.height > 0,
        legacy: /Legacy App/.test(el.textContent) }; });
    r.check(dd.painted && dd.legacy && thrown.length === 0,
      'a real click on the ▾ opens the frozen-archives menu and it is still there a tick later',
      `painted ${dd.painted} · names the legacy build ${dd.legacy}` + (thrown.length ? ` · threw: ${thrown[0]}` : ''));
    await s.close();
  }
}

/* ── 6i. v04.15: every word in the sidebar reads, whatever colour it is ── */
/* v04.14 proved the version badge on two colours. The rest of the sidebar was
   still painted in fixed greys meant for text on paper — the section
   headings at 1.2:1 on the owner's teal, the count badges at 1.3:1, the two
   toolbar buttons at 1.4:1. This sweeps the WHOLE sidebar instead of naming
   elements one at a time, so a grey added later is caught by the same net. */
{
  /* Gathers every element in #sb that carries a word of its own, with the
     backgrounds stacked behind it. Emoji-only chrome is skipped: its colour
     property says nothing about what is painted. */
  const COLLECT = () => {
    const out = [];
    for (const el of document.querySelectorAll('#sb *')) {
      if (el.offsetParent === null) continue;
      const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
      if (!/[A-Za-z0-9]/.test(own)) continue;
      const cs = getComputedStyle(el);
      const stack = [];
      for (let n = el; n; n = n.parentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') stack.push(c);
        if (/^rgb\(/.test(c)) break;
      }
      out.push({ sel: el.className || el.tagName, text: own.slice(0, 22), color: cs.color, fs: cs.fontSize, stack });
    }
    return out;
  };

  /* Five sidebars: the default, the owner's teal, a preset that is not green,
     a PALE one (where white ink has to flip to dark), and a mid grey — the
     worst case there is, because neither ink scores well against it. */
  const COLOURS = [
    ['the Forest preset', null],
    ['the owner’s teal', '#0B7A6B'],
    ['the Ocean preset’s navy', '#0C1E3C'],
    ['a pale cream sidebar', '#EFE7D2'],
    ['a mid grey sidebar', '#8A8F8C'],
  ];
  for (const [label, colour] of COLOURS) {
    const db = seedDB();
    if (colour) db.theme = { preset: 'forest', custom: { sidebar: colour } };
    const s = await openApp({ viewport: { width: 1440, height: 900 }, db });
    await s.page.evaluate(() => { document.getElementById('sb').style.width = '390px'; });
    await s.page.waitForTimeout(300);
    const rows = [];
    /* Three states, because a colour that only reads in the default state is
       not fixed: everything expanded, a folder selected, and a live search
       (the results list has labels of its own). */
    await s.page.evaluate(() => { document.querySelectorAll('.sec-hd').forEach((h) => h.click()); });
    await s.page.waitForTimeout(350);
    rows.push(...await s.page.evaluate(COLLECT));
    await s.page.evaluate(() => { ST.folder = 'f1'; window.render(); });
    await s.page.waitForTimeout(300);
    rows.push(...await s.page.evaluate(COLLECT));
    await s.page.fill('#sq', 'seed');
    await s.page.waitForTimeout(400);
    rows.push(...await s.page.evaluate(COLLECT));
    const ink = await s.page.evaluate(() => ({
      ink: getComputedStyle(document.documentElement).getPropertyValue('--sb-ink').trim(),
      sb: getComputedStyle(document.getElementById('sb')).backgroundColor,
    }));
    await s.close();

    /* The bar is 4.5:1 — except against a background where no ink can reach
       it. A mid grey caps out around 5:1 whichever way you go, so the bar is
       what is actually achievable there, not a number that cannot be met. */
    const sbBg = px(ink.sb);
    const best = Math.max(ratio(px('rgb(255,255,255)'), sbBg), ratio(px('rgb(16,26,20)'), sbBg));
    const bar = Math.min(4.5, best * 0.97);
    const scored = rows.map((row) => { const bg = flatten(row.stack);
      return { ...row, c: ratio(over(px(row.color), bg), bg) }; }).sort((a, b) => a.c - b.c);
    const low = scored.filter((x) => x.c < bar);
    const uniq = [...new Map(low.map((x) => [x.sel + x.color, x])).values()];
    r.check(low.length === 0 && scored.length > 8,
      `every word in the sidebar reads on ${label}`,
      low.length ? uniq.slice(0, 5).map((x) => `${x.c.toFixed(1)}:1 ${x.sel} ${JSON.stringify(x.text)} in ${x.color}`).join(' · ')
        : `${scored.length} pieces of text, worst ${scored[0].c.toFixed(1)}:1 (${scored[0].sel}), bar ${bar.toFixed(1)}:1, ink ${ink.ink}`);
  }

  /* An empty notebook paints text nothing else does — "Empty — add a folder
     with ＋", "No tags yet" — each one written inline in a fixed green that
     the sweep above never reaches, because the seeded notebook is not empty. */
  {
    const db = seedDB();
    db.folders = []; db.articles = [];
    db.theme = { preset: 'forest', custom: { sidebar: '#0B7A6B' } };
    const s = await openApp({ viewport: { width: 1440, height: 900 }, db });
    await s.page.evaluate(() => { document.getElementById('sb').style.width = '390px';
      document.querySelectorAll('.sec-hd').forEach((h) => h.click()); });
    await s.page.waitForTimeout(400);
    const rows = await s.page.evaluate(COLLECT);
    const sbBg = await s.page.evaluate(() => getComputedStyle(document.getElementById('sb')).backgroundColor);
    await s.close();
    const scored = rows.map((row) => { const bg = flatten(row.stack);
      return { ...row, c: ratio(over(px(row.color), bg), bg) }; }).sort((a, b) => a.c - b.c);
    const low = scored.filter((x) => x.c < 4.5);
    r.check(low.length === 0 && scored.length > 4,
      'the "nothing here yet" lines read too, on an empty notebook on a teal sidebar',
      low.length ? low.slice(0, 4).map((x) => `${x.c.toFixed(1)}:1 ${JSON.stringify(x.text)} in ${x.color}`).join(' · ')
        : `${scored.length} pieces of text over ${sbBg}, worst ${scored[0].c.toFixed(1)}:1 ${JSON.stringify(scored[0].text)}`);
  }

  /* The mechanism, not just the outcome: the ink flips on a pale sidebar, and
     a section heading sits on a strip that is not the colour of the rows. */
  {
    const dark = await openApp({ viewport: { width: 1440, height: 900 }, db: seedDB() });
    await dark.page.waitForTimeout(250);
    const d = await dark.page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--sb-ink').trim());
    await dark.close();
    const dbL = seedDB(); dbL.theme = { preset: 'forest', custom: { sidebar: '#EFE7D2' } };
    const light = await openApp({ viewport: { width: 1440, height: 900 }, db: dbL });
    await light.page.waitForTimeout(250);
    const l = await light.page.evaluate(() => ({
      ink: getComputedStyle(document.documentElement).getPropertyValue('--sb-ink').trim(),
      sr: getComputedStyle(document.documentElement).getPropertyValue('--sr-color').trim(),
    }));
    await light.close();
    r.check(/^#FFFFFF$/i.test(d) && !/^#FFFFFF$/i.test(l.ink) && !/^#FFFFFF$/i.test(l.sr),
      'the ink flips to dark when the owner picks a pale sidebar, search results with it',
      `dark sidebar ink ${d} · pale sidebar ink ${l.ink}, search-results ${l.sr}`);
  }
  {
    const s = await openApp({ viewport: { width: 1440, height: 900 }, db: seedDB() });
    await s.page.waitForTimeout(300);
    const m = await s.page.evaluate(() => {
      const hd = document.querySelector('.sec-hd');
      const row = document.querySelector('.tr-row');
      const btns = [...document.querySelectorAll('.sb-toolbar .sb-tb-btn')].filter((b) => b.offsetParent !== null)
        .map((b) => { const q = b.getBoundingClientRect(); const c = getComputedStyle(b);
          return { h: Math.round(q.height), border: c.borderTopWidth, bg: c.backgroundColor,
            label: b.textContent.trim().slice(0, 12) }; });
      return { strip: getComputedStyle(hd).backgroundColor, rowBg: getComputedStyle(row).backgroundColor, btns };
    });
    await s.close();
    r.check(m.strip !== 'rgba(0, 0, 0, 0)' && m.strip !== m.rowBg,
      'a section heading sits on a strip of its own, not on the same ground as its rows',
      `heading ${m.strip} · row ${m.rowBg}`);
    const bare = m.btns.filter((b) => b.bg === 'rgba(0, 0, 0, 0)' || parseFloat(b.border) < 0.5 || b.h < 40);
    r.check(m.btns.length === 2 && bare.length === 0,
      'the sidebar’s own two buttons are boxes you can hit, not bare labels',
      bare.length ? bare.map((b) => `${b.label} ${b.h}px bg ${b.bg} border ${b.border}`).join(' · ')
        : m.btns.map((b) => `${b.label} ${b.h}px`).join(' · '));
  }
}

/* ── 6j. v04.16: panes 2 and 3 read, at every colour the pickers allow ── */
/* Same sweep as the sidebar's, pointed at the panes. It found 14 of 36
   pieces of text below 4.5:1 at the DEFAULT theme — every date, "Home",
   "Preview", "Full tree", "Articles (n)", "Set the Status" — all of them
   var(--t3) at 2.7–3.1:1, before any custom colour was involved. */
{
  const PANE_COLLECT = (root) => {
    const out = [];
    for (const el of document.querySelectorAll(root + ' *')) {
      if (el.offsetParent === null) continue;
      const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
      if (!/[A-Za-z0-9]/.test(own)) continue;
      const cs = getComputedStyle(el);
      const stack = [];
      for (let n = el; n; n = n.parentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') stack.push(c);
        if (/^rgb\(/.test(c)) break;
      }
      out.push({ sel: el.className || el.tagName, text: own.slice(0, 22), color: cs.color, fs: cs.fontSize, stack });
    }
    return out;
  };

  /* The two pickers that sit under these panes, at their least forgiving:
     a pane background far too dark to write on, a mid grey, an accent so
     pale that white on it is invisible, and both at once. */
  const SETTINGS = [
    ['the theme as it ships', null],
    ['a pane background too dark to read on', { bg: '#16202A' }],
    ['a mid grey pane background', { bg: '#8A8F8C' }],
    ['a pale accent colour', { accent: '#F2D06B' }],
    ['a pale accent on a dark pane background', { bg: '#16202A', accent: '#F2D06B' }],
  ];
  for (const [label, custom] of SETTINGS) {
    const db = seedDB();
    if (custom) db.theme = { preset: 'forest', custom };
    const s = await openApp({ viewport: { width: 1440, height: 900 }, db });
    await s.page.waitForTimeout(300);
    const rows = [];
    const grab = async () => { for (const root of ['#p2', '#p3']) rows.push(...(await s.page.evaluate(PANE_COLLECT, root)).map((x) => ({ ...x, root }))); };
    await grab();                                                    /* the landing page */
    await s.page.evaluate(() => { ST.folder = 'f1'; window.render(); });
    await s.page.waitForTimeout(300); await grab();                  /* a folder open */
    await s.page.evaluate(() => selArt('a1'));
    await s.page.waitForTimeout(500); await grab();                  /* a note, reading */
    await s.page.evaluate(() => { if (typeof startEdit === 'function') startEdit(); else { ST.editing = true; window.render(); } });
    await s.page.waitForTimeout(500); await grab();                  /* the same note, editing */
    await s.close();

    const seen = new Set();
    const scored = [];
    for (const row of rows) {
      const key = row.root + row.sel + row.color + row.stack.join();
      if (seen.has(key)) continue;
      seen.add(key);
      const bg = flatten(row.stack);
      scored.push({ ...row, c: ratio(over(px(row.color), bg), bg) });
    }
    scored.sort((a, b) => a.c - b.c);
    const low = scored.filter((x) => x.c < 4.5);
    r.check(low.length === 0 && scored.length > 20,
      `every word in panes 2 and 3 reads with ${label}`,
      low.length ? low.slice(0, 5).map((x) => `${x.c.toFixed(1)}:1 ${x.root} ${x.sel} ${JSON.stringify(x.text)} in ${x.color}`).join(' · ')
        : `${scored.length} pieces of text across four states, worst ${scored[0].c.toFixed(1)}:1 (${scored[0].sel})`);
  }

  /* The mechanism. A dark pane background is not applied as chosen — the note
     keeps pale heading bands and pale widgets baked into the stylesheet, so
     flipping the ink under them measures WORSE (1.0:1) than leaving it. It is
     lightened until dark ink can live on it, and the owner is told. */
  {
    const db = seedDB();
    db.theme = { preset: 'forest', custom: { bg: '#16202A', accent: '#EFEFEF' } };
    const s = await openApp({ viewport: { width: 1440, height: 900 }, db });
    await s.page.waitForTimeout(300);
    const m = await s.page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      return { paper: cs.getPropertyValue('--paper').trim(),
        body: cs.getPropertyValue('--body-ink').trim(),
        t3: cs.getPropertyValue('--t3').trim(),
        onAccent: cs.getPropertyValue('--on-accent').trim() };
    });
    await s.close();
    const paper = px(m.paper.startsWith('#') ? `rgb(${parseInt(m.paper.slice(1, 3), 16)},${parseInt(m.paper.slice(3, 5), 16)},${parseInt(m.paper.slice(5, 7), 16)})` : m.paper);
    const toRgb = (h) => px(`rgb(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)})`);
    const bodyC = ratio(toRgb(m.body), paper);
    const t3C = ratio(toRgb(m.t3), paper);
    r.check(m.paper.toLowerCase() !== '#16202a' && lum(paper) >= 0.35 && bodyC >= 4.5 && t3C >= 4.5,
      'a pane background too dark to read on is lightened, and the inks are re-derived from what it becomes',
      `#16202A → ${m.paper} · body text ${bodyC.toFixed(1)}:1 · faintest ink ${t3C.toFixed(1)}:1`);
    r.check(m.onAccent.toLowerCase() !== '#ffffff',
      'white stops being the label colour on an accent too pale to carry it',
      `accent #EFEFEF → label ${m.onAccent}`);
  }
}

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
