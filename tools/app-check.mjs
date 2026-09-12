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
const grips_ok = (m) => m.grips >= 4;
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
      /* UPDATED for v04.34, and INVERTED. It used to require the opposite —
         "pop-out is hidden under 900px, so the palette must not offer what
         the app will refuse to show" — which was true of the app and is no
         longer true of it: the owner asked for the pop-ups on the phone and
         the tablet, and this card is the surface that reaches them there,
         because the phone's read bar has no room for two more buttons. The
         old assertion is kept as a measurement, with its sense reversed,
         rather than deleted: if the rows ever fall out of this card again,
         the phone loses the feature silently.
         UPDATED for v04.10: these rows are named "Multi Notes Pop-Up" and
         "Single Note Pop-Up" now — the old /Pop out|as a panel/ could never
         match again and the check would have passed while blind. */
      offersPopout: /Pop-Up/i.test(p.textContent),
      popFns: !p ? [] : [...p.querySelectorAll('.p3h-pal-btn')]
        .map((b) => (b.getAttribute('onclick') || '').match(/openNotePopup\('[^']+','(\w+)'\)/))
        .filter(Boolean).map((m) => m[1]),
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
       carried the chips and 📎 Attach — Types one tap inside Attach.
       v04.30 — on a PHONE that palette is the spread-open card: the type is a
       `🏷 Note Type · General` row calling openNtiPicker directly, and there
       is deliberately no 📎 middleman. So the question is asked as "can the
       type be changed from this palette", by the function, rather than as
       "is there chip markup in it" — which was only ever one way of being
       true. A tablet and a laptop still get the chip card. */
    const fns = !p ? '' : [...p.querySelectorAll('button')].map((b) => b.getAttribute('onclick') || '').join(' ');
    return { type: !!p && (/No type|nti-chip/.test(p.innerHTML) || /openNtiPicker\(/.test(fns)),
      attach: !!p && (/Attach/.test(p.textContent) || /openJournalPicker\(/.test(fns)) };
  });
  r.check(pal.open && pal.labels.length >= 5 && pal.offersPopout
    && pal.popFns.includes('float') && pal.popFns.includes('panel') && pal.minH >= 42
    && more.copy && more.arch && more.del
    && nAfter === nBefore + 1 && ntiPal.type && ntiPal.attach,
    'the palettes list the folded buttons with words, at a tappable size, and they work',
    `${pal.labels.length} actions (${pal.minH}px tall) · pop-out offered on a phone: ${pal.offersPopout} [${pal.popFns.join('/')}] · ⋯ holds copy ${more.copy}/archive ${more.arch}/delete ${more.del} · copy made ${nBefore}→${nAfter} · type reachable ${ntiPal.type} / attach rows ${ntiPal.attach}`);
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

/* ── 6k. v04.17: the folder pop-out gets what the sidebar folders got ──── */
/* The owner asked for the same treatment here. Measured first: the modal
   inputs had no ::placeholder rule at all, so the browser's own #757575 read
   4.2:1 on the default paper and 1.9:1 on a derived one; and the controls
   were 20×20 (◀ ▶), 19×19 (🗑), 22×19, 28×22 and 56×26 — the same sizes on a
   phone, where this window is full screen. */
{
  const POP_COLLECT = (root) => {
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
      out.push({ sel: el.className || el.tagName, text: own.slice(0, 22), color: cs.color, stack });
    }
    /* a placeholder has no text node of its own — it is still text on screen */
    for (const inp of document.querySelectorAll(root + ' input')) {
      if (inp.offsetParent === null || !inp.placeholder) continue;
      const stack = [];
      for (let n = inp; n; n = n.parentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') stack.push(c);
        if (/^rgb\(/.test(c)) break;
      }
      out.push({ sel: (inp.className || 'input') + ' ::placeholder', text: inp.placeholder.slice(0, 22),
        color: getComputedStyle(inp, '::placeholder').color, stack });
    }
    return out;
  };
  const openPop = async (page) => {
    await page.evaluate(() => { ST.folder = 'f1'; window.render(); openFolderPopupFromToolbar(); });
    await page.waitForTimeout(450);
  };

  for (const [label, custom] of [
    ['the theme as it ships', null],
    ['a pane background too dark to read on', { bg: '#16202A' }],
    ['a mid grey pane background', { bg: '#8A8F8C' }],
    ['a pale accent colour', { accent: '#F2D06B' }],
  ]) {
    const db = seedDB();
    if (custom) db.theme = { preset: 'forest', custom };
    const s = await openApp({ viewport: { width: 1440, height: 900 }, db });
    await openPop(s.page);
    const rows = [...await s.page.evaluate(POP_COLLECT, '#mb')];
    await s.page.evaluate(() => { document.querySelectorAll('#pkList .pk-chev').forEach((c) => c.click()); });
    await s.page.waitForTimeout(350);
    rows.push(...await s.page.evaluate(POP_COLLECT, '#mb'));   /* the tree open */
    await s.page.evaluate(() => { const q = document.getElementById('pkSearch'); q.value = 'seed'; _pkFilter('seed'); });
    await s.page.waitForTimeout(350);
    rows.push(...await s.page.evaluate(POP_COLLECT, '#mb'));   /* searching */
    await s.close();
    const seen = new Set();
    const scored = [];
    for (const row of rows) {
      const key = row.sel + row.color + row.stack.join();
      if (seen.has(key)) continue;
      seen.add(key);
      const bg = flatten(row.stack);
      scored.push({ ...row, c: ratio(over(px(row.color), bg), bg) });
    }
    scored.sort((a, b) => a.c - b.c);
    const low = scored.filter((x) => x.c < 4.5);
    r.check(low.length === 0 && scored.length > 6,
      `every word in the folder pop-out reads with ${label}`,
      low.length ? low.slice(0, 4).map((x) => `${x.c.toFixed(1)}:1 ${x.sel} ${JSON.stringify(x.text)} in ${x.color}`).join(' · ')
        : `${scored.length} pieces of text across three states, worst ${scored[0].c.toFixed(1)}:1 (${scored[0].sel})`);
  }

  /* One size, one shape — and a thumb-sized one where there is a thumb. */
  const geometry = async (width, height, minIcon, minBtn, minRow) => {
    const s = await openApp({ viewport: { width, height }, db: seedDB() });
    await openPop(s.page);
    await s.page.evaluate(() => { document.querySelectorAll('#pkList .pk-chev').forEach((c) => c.click()); });
    await s.page.waitForTimeout(400);
    const MEASURE = () => {
      const box = (e) => { const q = e.getBoundingClientRect(); return { w: Math.round(q.width), h: Math.round(q.height) }; };
      const vis = (e) => e.offsetParent !== null;
      return {
        icons: [...document.querySelectorAll('#mb .pk-act, #mb .pk-chev:not(.pk-chev-sp)')].filter(vis)
          .map((e) => ({ ...box(e), t: (e.title || e.textContent).trim().slice(0, 10) })),
        /* the title bar's four squares are ICON buttons and are measured as
           squares below; these are the ones carrying words */
        btns: [...document.querySelectorAll('#mb button')].filter(vis)
          .filter((e) => !e.classList.contains('p2h-sec-nav-btn'))
          .map((e) => ({ ...box(e), t: (e.title || e.textContent).trim().slice(0, 12) })),
        nav: [...document.querySelectorAll('#mb .pk-mt-row .p2h-sec-nav-btn')].filter(vis).map((e) => box(e)),
        rows: [...document.querySelectorAll('#mb .pr, #mb .pnav')].filter(vis).map((e) => box(e)),
        sel: (() => { const e = document.querySelector('#mb .pk-sec-sel'); return e ? box(e) : null; })(),
        strip: (() => { const h = document.querySelector('#mb .pk-grp-hd, #mb .pk-sec-hd');
          const row = document.querySelector('#mb .pr');
          return h && row ? { hd: getComputedStyle(h).backgroundColor, row: getComputedStyle(row).backgroundColor } : null; })(),
      };
    };
    /* The tree open is where the chevrons and the per-row action icons live;
       a group heading only exists once something is searched. Both states get
       measured, or one of them reads as "no icons at all". */
    const m = await s.page.evaluate(MEASURE);
    await s.page.evaluate(() => { const q = document.getElementById('pkSearch'); q.value = 'seed'; _pkFilter('seed'); });
    await s.page.waitForTimeout(350);
    m.strip = (await s.page.evaluate(MEASURE)).strip;
    await s.close();
    return m;
  };

  {
    const m = await geometry(1440, 900, 28, 34, 36);
    const smallIcons = m.icons.filter((x) => x.w < 28 || x.h < 28);
    const smallBtns = m.btns.filter((x) => x.h < 34);
    const shortRows = m.rows.filter((x) => x.h < 36);
    const navSizes = [...new Set(m.nav.map((x) => `${x.w}×${x.h}`))];
    const smallNav = m.nav.filter((x) => x.w < 32 || x.h < 32);
    r.check(smallIcons.length === 0 && smallBtns.length === 0 && shortRows.length === 0
      && navSizes.length === 1 && smallNav.length === 0,
      'on a laptop every control in the pop-out is one size, and none of them is a speck',
      [smallIcons.length ? `icons: ${smallIcons.map((x) => `${x.t} ${x.w}×${x.h}`).join(', ')}` : '',
        smallBtns.length ? `buttons: ${smallBtns.map((x) => `${x.t} ${x.h}px`).join(', ')}` : '',
        shortRows.length ? `${shortRows.length} rows under 36px` : '',
        navSizes.length !== 1 ? `title bar: ${navSizes.join(' / ')}` : ''].filter(Boolean).join(' · ')
        || `${m.icons.length} icons at 28px+, ${m.btns.length} buttons at 34px+, ${m.rows.length} rows, title bar all ${navSizes[0]}`);
    r.check(!!m.strip && m.strip.hd !== m.strip.row && m.strip.hd !== 'rgba(0, 0, 0, 0)',
      'a group heading in the pop-out sits on a strip, not on the same ground as its rows',
      m.strip ? `heading ${m.strip.hd} · row ${m.strip.row}` : 'no group heading rendered');
    r.check(!!m.sel && m.sel.w >= 142,
      'the section dropdown is wide enough to say which section you are in',
      m.sel ? `${m.sel.w}×${m.sel.h}` : 'no section dropdown');
  }
  {
    /* Under 1200px this window is full screen, and every control in it was
       still laptop-sized — 19×19 delete icons on a phone. */
    const m = await geometry(390, 844, 38, 44, 44);
    const small = [...m.icons.filter((x) => x.w < 38 || x.h < 38).map((x) => `${x.t} ${x.w}×${x.h}`),
      ...m.btns.filter((x) => x.h < 44).map((x) => `${x.t} ${x.h}px`),
      ...m.nav.filter((x) => x.w < 42 || x.h < 42).map((x) => `a title-bar square at ${x.w}×${x.h}`),
      ...m.rows.filter((x) => x.h < 44).map((x) => `a row at ${x.h}px`)];
    r.check(small.length === 0 && m.icons.length > 0 && m.rows.length > 0,
      'on a phone the pop-out is thumb-sized: 38px icons, 44px buttons and rows',
      small.length ? small.slice(0, 6).join(' · ')
        : `${m.icons.length} icons, ${m.btns.length} buttons, ${m.rows.length} rows, dropdown ${m.sel ? m.sel.w + '×' + m.sel.h : '—'}`);
  }

  /* The title bar wraps instead of squeezing: bigger steppers took the
     section dropdown from 146px to 118px, which clipped MY NOTEBOOKS. */
  {
    const s = await openApp({ viewport: { width: 1600, height: 950 }, db: seedDB() });
    await openPop(s.page);
    const widths = [];
    for (const w of [420, 520, 700, 1000]) {
      widths.push(await s.page.evaluate(async (width) => {
        const mb = document.getElementById('mb');
        mb.style.width = width + 'px'; mb.style.maxWidth = width + 'px';
        await new Promise((ok) => setTimeout(ok, 220));
        const row = document.querySelector('.pk-mt-row');
        const box = row.getBoundingClientRect();
        const outside = [...row.querySelectorAll('button,select,span')].filter((e) => e.offsetParent !== null)
          .filter((e) => { const q = e.getBoundingClientRect(); return q.left < box.left - 0.5 || q.right > box.right + 0.5; })
          .map((e) => (e.title || e.textContent).trim().slice(0, 12));
        return { width, sel: Math.round(document.querySelector('.pk-sec-sel').getBoundingClientRect().width), outside };
      }, w));
    }
    await s.close();
    const bad = widths.filter((x) => x.outside.length || x.sel < 142);
    r.check(bad.length === 0,
      'the pop-out’s title bar wraps rather than squeezing the section name out',
      bad.length ? bad.map((x) => `${x.width}px: dropdown ${x.sel}px${x.outside.length ? `, outside the row: ${x.outside.join(', ')}` : ''}`).join(' · ')
        : widths.map((x) => `${x.width}:${x.sel}px`).join(' '));
  }
}

/* ── 6l. v04.18: the Assign window, and a note count on every folder ──── */
{
  const openAssign = async (page) => {
    await page.evaluate(() => { selArt('a1'); });
    await page.waitForTimeout(350);
    await page.evaluate(() => openPicker());
    await page.waitForTimeout(450);
  };
  const openBrowse = async (page) => {
    await page.evaluate(() => { ST.folder = 'f1'; window.render(); openFolderPopupFromToolbar(); });
    await page.waitForTimeout(450);
  };

  /* Text: the same net as v04.17's, over the Assign window. It shares its
     classes with the browse pop-out, so this is a regression net more than a
     discovery — two colour settings, not five, for what that is worth. */
  for (const [label, custom] of [['the theme as it ships', null], ['a mid grey pane background', { bg: '#8A8F8C' }]]) {
    const db = seedDB();
    if (custom) db.theme = { preset: 'forest', custom };
    const s = await openApp({ viewport: { width: 1440, height: 900 }, db });
    await openAssign(s.page);
    await s.page.evaluate(() => { const row = document.querySelector('#pkList .pr'); if (row) row.click(); });
    await s.page.waitForTimeout(250);
    const rows = await s.page.evaluate(() => {
      const out = [];
      const stackOf = (el) => { const st = [];
        for (let n = el; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor;
          if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') st.push(c);
          if (/^rgb\(/.test(c)) break; } return st; };
      for (const el of document.querySelectorAll('#mb *')) {
        if (el.offsetParent === null) continue;
        const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
        if (!/[A-Za-z0-9]/.test(own)) continue;
        out.push({ sel: el.className || el.tagName, text: own.slice(0, 20), color: getComputedStyle(el).color, stack: stackOf(el) });
      }
      for (const inp of document.querySelectorAll('#mb input')) {
        if (inp.offsetParent === null || !inp.placeholder) continue;
        out.push({ sel: (inp.className || 'input') + ' ::placeholder', text: inp.placeholder.slice(0, 20),
          color: getComputedStyle(inp, '::placeholder').color, stack: stackOf(inp) });
      }
      return out;
    });
    await s.close();
    const seen = new Set();
    const scored = [];
    for (const row of rows) {
      const key = row.sel + row.color + row.stack.join();
      if (seen.has(key)) continue;
      seen.add(key);
      const bg = flatten(row.stack);
      scored.push({ ...row, c: ratio(over(px(row.color), bg), bg) });
    }
    scored.sort((a, b) => a.c - b.c);
    const low = scored.filter((x) => x.c < 4.5);
    r.check(low.length === 0 && scored.length > 5,
      `every word in the Assign window reads with ${label}`,
      low.length ? low.slice(0, 4).map((x) => `${x.c.toFixed(1)}:1 ${x.sel} ${JSON.stringify(x.text)}`).join(' · ')
        : `${scored.length} pieces of text, worst ${scored[0].c.toFixed(1)}:1 (${scored[0].sel})`);
  }

  /* The tick box is what this window is FOR, and it was 15×15 on a phone. */
  for (const [label, w, h, min] of [['a laptop', 1440, 900, 20], ['a phone', 390, 844, 24]]) {
    const s = await openApp({ viewport: { width: w, height: h }, db: seedDB() });
    await openAssign(s.page);
    const box = await s.page.evaluate(() => [...document.querySelectorAll('#mb .pc')]
      .filter((e) => e.offsetParent !== null).map((e) => { const q = e.getBoundingClientRect();
        return { w: Math.round(q.width), h: Math.round(q.height) }; }));
    await s.close();
    const small = box.filter((x) => x.w < min || x.h < min);
    r.check(box.length > 0 && small.length === 0,
      `on ${label} the Assign window's tick box is a box, not the 15×15 speck it was`,
      box.length ? `${box.length} boxes at ${box[0].w}×${box[0].h} (needs ${min})` : 'no tick boxes rendered');
  }

  /* The count: the number the sidebar badge shows, on the pop-out rows too. */
  {
    const s = await openApp({ viewport: { width: 1440, height: 900 }, db: seedDB() });
    const read = () => s.page.evaluate(() => [...document.querySelectorAll('#mb .pr')]
      .filter((e) => e.offsetParent !== null && e.dataset.fid)
      .map((row) => ({ fid: row.dataset.fid, shown: row.querySelector('.pk-cnt')?.textContent ?? null,
        real: cntOf(row.dataset.fid) })));
    await openAssign(s.page);
    const assign = await read();
    await s.page.evaluate(() => closeModal());
    await s.page.waitForTimeout(250);
    await openBrowse(s.page);
    await s.page.evaluate(() => { document.querySelectorAll('#pkList .pk-chev').forEach((c) => c.click()); });
    await s.page.waitForTimeout(350);
    const browse = await read();
    await s.close();
    const wrong = [...assign, ...browse].filter((x) => (x.real ? String(x.real) : null) !== x.shown);
    r.check(assign.length > 0 && browse.length > 0 && wrong.length === 0,
      'every folder row in both pop-up windows carries the same note count the sidebar shows',
      wrong.length ? wrong.slice(0, 4).map((x) => `${x.fid}: shows ${x.shown}, cntOf says ${x.real}`).join(' · ')
        : `${assign.length} rows in Assign, ${browse.length} in the browser, all matching cntOf()`);
  }

  /* On a phone the three row actions fold into one ⋯ — because with them on
     the row a folder name got about 65px of a 317px row and arrived as
     "(001) See…". Folded, never hidden: the ⋯ has to really open. */
  {
    const s = await openApp({ viewport: { width: 390, height: 844 }, db: seedDB() });
    const thrown = [];
    s.page.on('pageerror', (e) => thrown.push(String(e).split('\n')[0]));
    await openAssign(s.page);
    const folded = await s.page.evaluate(() => {
      const row = document.querySelector('#mb .pr');
      const nm = row.querySelector('.pk-nm');
      return { acts: [...row.querySelectorAll('.pk-acts .pk-act')].filter((e) => e.offsetParent !== null).length,
        more: !!row.querySelector('.pk-more') && row.querySelector('.pk-more').offsetParent !== null,
        nameW: Math.round(nm.getBoundingClientRect().width),
        /* what actually matters is that the whole name is on screen: the
           element is clamped to two lines, so anything longer than that
           overflows and scrollHeight says so */
        clipped: nm.scrollHeight > nm.clientHeight + 1,
        whole: nm.textContent === (DB.folders.find((f) => f.id === row.dataset.fid) || {}).name,
        name: nm.textContent };
    });
    await s.page.locator('#mb .pk-more').first().click();
    await s.page.waitForTimeout(250);
    const menu = await s.page.evaluate(() => { const m = document.getElementById('ctx');
      const q = m.getBoundingClientRect();
      return { painted: getComputedStyle(m).display !== 'none' && q.width > 0 && q.height > 0,
        text: m.textContent.replace(/\s+/g, ' ').trim() }; });
    await s.close();
    /* The first cut of this check demanded 140px of name, a number taken
       from the browse pop-out — but the Assign window also carries a tick
       box, so its name box is 122px and shows the whole name anyway. The bar
       is "the whole name is on screen", with a floor low enough to catch a
       squeeze and high enough to mean something. */
    r.check(folded.acts === 0 && folded.more && folded.whole && !folded.clipped && folded.nameW >= 110,
      'on a phone the row actions fold into one ⋯ and the whole folder name is on screen',
      `loose icons ${folded.acts} · ⋯ shown ${folded.more} · name ${folded.nameW}px, whole ${folded.whole},`
      + ` clipped ${folded.clipped} — ${JSON.stringify(folded.name)}`);
    r.check(menu.painted && /New folders go here/.test(menu.text) && /Rename/.test(menu.text)
      && /Delete/.test(menu.text) && thrown.length === 0,
      'a real click on that ⋯ opens all three actions, and the menu is still there a tick later',
      `painted ${menu.painted} · ${JSON.stringify(menu.text.slice(0, 60))}` + (thrown.length ? ` · threw: ${thrown[0]}` : ''));
  }

  /* And nothing was taken away from the laptop, where there is room. */
  {
    const s = await openApp({ viewport: { width: 1440, height: 900 }, db: seedDB() });
    await openAssign(s.page);
    const laptop = await s.page.evaluate(() => {
      const row = document.querySelector('#mb .pr');
      return { acts: [...row.querySelectorAll('.pk-acts .pk-act')].filter((e) => e.offsetParent !== null)
        .map((e) => e.title.slice(0, 10)),
        more: (row.querySelector('.pk-more') || {}).offsetParent != null };
    });
    await s.close();
    r.check(laptop.acts.length === 3 && !laptop.more,
      'on a laptop the three row actions are still on the row, and the ⋯ stays out of the way',
      `on the row: ${laptop.acts.join(', ') || 'none'} · ⋯ shown ${laptop.more}`);
  }
}

/* ── 6m. v04.19: a colour variable that is used is a colour that exists ── */
/* --hover was referenced 56 times and DEFINED nowhere, so 56 hover rules
   were invalid and painted nothing; --paper2 (7) and --accent (85) were the
   same. The 14 `background:var(--accent);color:#fff` rules were the sharp
   end: white text on no background at all.

   This is deliberately not a check for those three names. It walks every
   declaration in the stylesheet, takes every var() written WITHOUT a
   fallback, and asks whether it resolves to anything — so it also catches
   the next undefined variable anyone adds. */
{
  const VARS = () => {
    const used = new Map();
    const walk = (list) => { for (const rule of list) {
      /* Chromium supports CSS nesting, so EVERY style rule has a .cssRules —
         empty, but truthy. Recursing on it and `continue`-ing skips the
         declarations and measures 6 rules out of 1286. Read rule.style
         first, always. */
      /* rule.style.cssText, NOT the longhands. Chromium expands
         `background: var(--hover)` into nine longhands and hands back '' for
         every one of them (a pending substitution), so walking rule.style[i]
         sees no var at all and the 56 rules this round is about were invisible
         to this very check. The declaration block's own cssText keeps what was
         authored, and excludes any nested rule. */
      if (rule.style && rule.style.cssText) {
        for (const m of rule.style.cssText.matchAll(/var\(\s*(--[\w-]+)\s*\)/g))
          if (!used.has(m[1])) used.set(m[1], (rule.selectorText || '') + ' {' + m[1] + '}');
      }
      if (rule.cssRules && rule.cssRules.length) walk(rule.cssRules);
    } };
    for (const sheet of document.styleSheets) {
      let rules; try { rules = sheet.cssRules; } catch { continue; }   /* the blocked font sheet */
      walk(rules);
    }
    const root = getComputedStyle(document.documentElement);
    const dead = [];
    for (const [name, where] of used) {
      if (root.getPropertyValue(name).trim()) continue;
      let live = false;
      const sel = where.split(' {')[0];
      if (sel) { try { for (const el of document.querySelectorAll(sel))
        if (getComputedStyle(el).getPropertyValue(name).trim()) { live = true; break; } } catch { /* :hover etc */ } }
      if (!live) dead.push(name + ' — ' + where.slice(0, 60));
    }
    return { total: used.size, dead };
  };

  /* Every element painted with one of the two surface tints, scored against
     that tint. Selectors are matched with their :hover/:active stripped, so
     a row is found while it is NOT hovered and still measured on the colour
     it takes when it is. */
  const ON_TINT = () => {
    /* A custom property comes back AS AUTHORED — '#E2E7F0', which px()'s
       /[\d.]+/g reads as rgb(2,7,0), i.e. near-black, and every dark text on
       it then scores ~2:1 and reads as a failure that is not there. Paint it
       on a probe element and let the browser hand back rgb(). */
    const probe = document.createElement('div');
    document.body.appendChild(probe);
    const resolve = (name) => { probe.style.backgroundColor = ''; 
      probe.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      const c = getComputedStyle(probe).backgroundColor;
      return /^rgba?\(/.test(c) && c !== 'rgba(0, 0, 0, 0)' ? c : ''; };
    const tints = { '--hover': resolve('--hover'), '--paper2': resolve('--paper2'),
                    '--accent': resolve('--accent') };
    /* A rule that lights the row often restyles its INK in the same breath —
       `.tab-it:hover{background:var(--hover);color:var(--t1)}` flips a white
       tab to dark text. Scoring the element's un-hovered colour against the
       hover tint measures a pairing that never exists on screen (1.2:1 on a
       tab that is perfectly readable). Where the rule sets its own colour,
       that is the colour to score. */
    const resolveColor = (v) => { if (!v) return ''; probe.style.color = '';
      probe.style.color = v; const c = getComputedStyle(probe).color;
      return /^rgba?\(/.test(c) ? c : ''; };
    const out = [];
    const walk = (list) => { for (const rule of list) {
      if (rule.style && rule.selectorText) {
        const bg = rule.style.getPropertyValue('background') + ' ' + rule.style.getPropertyValue('background-color');
        const hit = Object.keys(tints).find((v) => bg.includes('var(' + v + ')'));
        /* A rule that names its OWN ink needs no element to be judged, and
           most of these 63 rules live in a modal, the calendar or a citation
           that no reachable state renders. This is where the sharpest form of
           the bug sat: 14 rules reading `background:var(--accent);color:#fff`,
           i.e. white on nothing at all. */
        if (hit && tints[hit]) {
          const own = resolveColor(rule.style.getPropertyValue('color'));
          if (own) out.push({ sel: rule.selectorText.slice(0, 46), v: hit, surface: tints[hit],
            color: own, text: 'declared ink', via: 'declared' });
        }
        if (hit && tints[hit]) {
          const plain = rule.selectorText.replace(/:(hover|active|focus|focus-visible)\b/g, '');
          let els = []; try { els = [...document.querySelectorAll(plain)]; } catch { els = []; }
          for (const el of els) {
            if (el.offsetParent === null) continue;
            const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
            if (!/[A-Za-z0-9]/.test(own)) continue;   /* emoji-only says nothing about colour */
            const ruleInk = resolveColor(rule.style.getPropertyValue('color'));
            out.push({ sel: plain.slice(0, 46), v: hit, surface: tints[hit],
              color: ruleInk || getComputedStyle(el).color, text: own.slice(0, 20),
              via: ruleInk ? 'the rule\u2019s own colour' : 'inherited' });
          }
        }
      }
      if (rule.cssRules && rule.cssRules.length) walk(rule.cssRules);
    } };
    for (const sheet of document.styleSheets) {
      let rules; try { rules = sheet.cssRules; } catch { continue; }
      walk(rules);
    }
    probe.remove();
    return out;
  };

  const THEMES_ = [['Forest', { preset: 'forest' }], ['Ocean', { preset: 'ocean' }],
    ['Amber', { preset: 'amber' }], ['Indigo', { preset: 'indigo' }], ['Rose', { preset: 'rose' }],
    ['a custom pane background', { preset: 'forest', custom: { bg: '#16202A' } }],
    ['a pale custom accent', { preset: 'forest', custom: { accent: '#F2D06B' } }]];

  for (const [label, theme] of THEMES_) {
    const db = seedDB();
    db.theme = { preset: theme.preset, custom: theme.custom || {} };
    const s = await openApp({ viewport: { width: 1440, height: 900 }, db });
    await s.page.waitForTimeout(300);

    const v = await s.page.evaluate(VARS);
    r.check(v.dead.length === 0 && v.total > 20,
      `on ${label}, every colour variable the stylesheet uses is actually defined`,
      v.dead.length ? `resolves to nothing: ${v.dead.slice(0, 6).join(' · ')}`
        : `${v.total} variables used without a fallback, all resolve`);

    /* Most of the 56 rules live in surfaces that only exist in SOME state —
       the pop-outs, a note, a live search. Measuring the landing page alone
       scored three pieces of text and would have called a broken palette
       fine, so each state is visited and the net is pooled. */
    const rows = [];
    const grab = async () => { rows.push(...await s.page.evaluate(ON_TINT)); };
    await s.page.evaluate(() => { ST.folder = 'f1'; window.render(); });
    await s.page.waitForTimeout(300); await grab();                  /* a folder open */
    await s.page.evaluate(() => selArt('a1'));
    await s.page.waitForTimeout(400); await grab();                  /* a note, reading */
    await s.page.evaluate(() => { if (typeof startEdit === 'function') startEdit(); });
    await s.page.waitForTimeout(400); await grab();                  /* the same note, editing */
    await s.page.evaluate(() => { try { openFolderPopupFromToolbar(); } catch {} });
    await s.page.waitForTimeout(450); await grab();                  /* the folder pop-out */
    await s.page.evaluate(() => { try { document.querySelectorAll('#pkList .pk-chev').forEach((c) => c.click()); } catch {} });
    await s.page.waitForTimeout(350); await grab();                  /* its tree open */
    await s.page.evaluate(() => { try { const q = document.getElementById('pkSearch'); q.value = 'seed'; _pkFilter('seed'); } catch {} });
    await s.page.waitForTimeout(350); await grab();                  /* searching in it */
    const scored = [];
    const seen = new Set();
    for (const row of rows) {
      const key = row.sel + row.color + row.surface;
      if (seen.has(key)) continue; seen.add(key);
      const bg = px(row.surface);
      scored.push({ ...row, c: ratio(over(px(row.color), bg), bg) });
    }
    scored.sort((a, b) => a.c - b.c);
    const low = scored.filter((x) => x.c < 4.5);
    r.check(low.length === 0 && scored.length > 0,
      `on ${label}, text still reads on a row that is lit up`,
      scored.length === 0 ? 'measured NOTHING — no element was painted with a tint'
        : low.length ? low.slice(0, 5).map((x) => `${x.c.toFixed(1)}:1 ${x.sel} ${JSON.stringify(x.text)}`).join(' · ')
          : `${scored.length} pieces of text on --hover/--paper2, worst ${scored[0].c.toFixed(1)}:1 (${scored[0].sel})`);
    await s.close();
  }
}

/* The proof that a hover actually PAINTS. A rule that resolves is not a rule
   that shows: this moves a real mouse onto a real row and reads the colour
   the browser ended up painting, before and after. */
{
  const s = await openApp({ viewport: { width: 1440, height: 900 }, db: seedDB() });
  await s.page.evaluate(() => { ST.folder = 'f1'; window.render(); });
  await s.page.waitForTimeout(300);
  const target = s.page.locator('#p2 .p2h-path-up, #p2 .p2h-sec-nav-btn, #mb .pkf-btn, #p2 .gs-result').first();
  let before = null, after = null, sel = '';
  if (await target.count()) {
    sel = await target.evaluate((el) => el.className || el.tagName);
    before = await target.evaluate((el) => getComputedStyle(el).backgroundColor);
    await target.hover();
    await s.page.waitForTimeout(160);
    after = await target.evaluate((el) => getComputedStyle(el).backgroundColor);
  }
  await s.close();
  r.check(before !== null && after !== null && before !== after,
    'a real mouse on a real row actually repaints it — the hover highlight is visible',
    before === null ? 'no hoverable row found to measure'
      : `${sel}: ${before} → ${after}${before === after ? '  (UNCHANGED — the highlight paints nothing)' : ''}`);
}

/* ── 6n. v04.20: a Smart View gets the same second row, and a way in ───── */
{
  /* The owner's report was "the folder screen has buttons the Smart View
     screen does not". These check the parity is real and does its job — not
     that the markup exists, but that a chip navigates, a typed title lands
     IN the view it was typed in, and the group buttons really fold. */
  const s6n = await openApp({ viewport: { width: 1440, height: 900 }, db: seedDB() });
  const pg = s6n.page;

  /* Every Smart View has the row, and it is the SAME row a folder gets —
     same class, so the two screens cannot drift apart in styling. */
  const rows = await pg.evaluate(() => {
    const out = [];
    for (const sf of SF) {
      selFolder(sf.id);
      const row = document.querySelector('#p2h-path .p2h-path-row');
      out.push({ id: sf.id, chips: row ? row.querySelectorAll('button').length : 0 });
    }
    selFolder('f1');
    const frow = document.querySelector('#p2h-path .p2h-path-row');
    return { views: out, folderRow: !!frow };
  });
  const bare = rows.views.filter((v) => v.chips < 9);
  r.check(bare.length === 0 && rows.folderRow,
    'every Smart View now carries the same second row a folder does',
    bare.length ? bare.map((v) => `${v.id}: ${v.chips} chips`).join(' · ')
      : `${rows.views.length} views, ${rows.views[0].chips}–${Math.max(...rows.views.map((v) => v.chips))} chips each, same .p2h-path-row as a folder`);

  /* A chip is a real button with a real click — not markup that looks right.
     Clicked for real and looked at again a tick later, per the v04.12 rule. */
  await pg.evaluate(() => selFolder('sf-recent'));
  await pg.waitForTimeout(200);
  const chip = await pg.evaluate(() => {
    const b = [...document.querySelectorAll('#p2h-path .p2h-path-child')]
      .find((x) => /Favourites/.test(x.textContent));
    if (!b) return null;
    const q = b.getBoundingClientRect();
    return { x: q.x + q.width / 2, y: q.y + q.height / 2 };
  });
  let landed = null;
  if (chip) {
    await pg.mouse.click(chip.x, chip.y);
    await pg.waitForTimeout(300);
    landed = await pg.evaluate(() => ({ folder: ST.folder,
      head: document.getElementById('p2h')?.textContent || '' }));
  }
  r.check(landed && landed.folder === 'sf-favs' && /Favourites/.test(landed.head),
    'clicking a Smart View chip really moves you there, without the sidebar',
    landed ? `ST.folder=${landed.folder} · header ${JSON.stringify(landed.head.slice(0, 40))}` : 'no Favourites chip on the Recently Edited row');

  /* The quick-add bar is present exactly where a new note can honestly go,
     and absent where it cannot: Archive (a brand-new archived note is a
     contradiction) and the four views that render their own list. */
  const bars = await pg.evaluate(() => {
    const out = {};
    for (const sf of SF) { selFolder(sf.id);
      out[sf.id] = !!document.querySelector('#p2c .qt-bar input'); }
    return out;
  });
  const want = ['sf-new', 'sf-recent', 'sf-time', 'sf-favs', 'sf-pinned', 'sf-remind'];
  const wantNot = ['sf-arch', 'sf-mywall', 'sf-murajaa', 'sf-practice', 'sf-journal'];
  const missing = want.filter((id) => !bars[id]);
  const stray = wantNot.filter((id) => bars[id]);
  r.check(missing.length === 0 && stray.length === 0,
    'the quick-add bar is in every Smart View a note can honestly go into, and no other',
    (missing.length || stray.length) ? `missing: ${missing.join(',') || '—'} · stray: ${stray.join(',') || '—'}`
      : `${want.length} views have it, ${wantNot.length} correctly do not`);

  /* THE check: a title typed into Favourites has to come back as a
     favourite, in a real folder, and be in the very list you typed it in.
     A bar that saves a note you then cannot find is worse than no bar. */
  for (const [view, flag, title] of [['sf-favs', 'favourite', 'Typed into Favourites'],
                                     ['sf-pinned', 'pinned', 'Typed into Pinned']]) {
    await pg.evaluate((v) => selFolder(v), view);
    await pg.waitForTimeout(150);
    await pg.fill('#p2c #qt-inp', title);
    await pg.press('#p2c #qt-inp', 'Enter');
    await pg.waitForTimeout(300);
    const got = await pg.evaluate(([t, v, f]) => {
      const a = DB.articles.find((x) => x.title === t);
      if (!a) return { found: false };
      return { found: true, flag: a[f] === true, folder: (a.folderIds || [])[0] || null,
        real: DB.folders.some((fo) => fo.id === (a.folderIds || [])[0]),
        inView: getSmartArts(v).some((x) => x.id === a.id),
        onScreen: (document.getElementById('p2c').textContent || '').includes(t) };
    }, [title, view, flag]);
    r.check(got.found && got.flag && got.real && got.inView && got.onScreen,
      `a title typed into ${view} is saved, marked ${flag}, and appears in that very list`,
      got.found ? `${flag}=${got.flag} · folder=${got.folder} (real:${got.real}) · in the view:${got.inView} · on screen:${got.onScreen}`
        : 'no note with that title was created at all');
  }

  /* A folder's own bar must be untouched by the generalisation — same note,
     same folder, and NOT quietly starred or pinned by the new code path. */
  await pg.evaluate(() => selFolder('f2'));
  await pg.waitForTimeout(150);
  await pg.fill('#p2c #qt-inp', 'Typed into a plain folder');
  await pg.press('#p2c #qt-inp', 'Enter');
  await pg.waitForTimeout(300);
  const plain = await pg.evaluate(() => {
    const a = DB.articles.find((x) => x.title === 'Typed into a plain folder');
    return a ? { in: (a.folderIds || [])[0], fav: !!a.favourite, pin: !!a.pinned } : null;
  });
  r.check(plain && plain.in === 'f2' && !plain.fav && !plain.pin,
    "a folder's own quick-add bar still behaves exactly as it did",
    plain ? `folder=${plain.in} favourite=${plain.fav} pinned=${plain.pin}` : 'nothing was created');

  /* Reminders: the bar promises the reminder dialog next, so it must open. */
  await pg.evaluate(() => selFolder('sf-remind'));
  await pg.waitForTimeout(150);
  await pg.fill('#p2c #qt-inp', 'Typed into Reminders');
  await pg.press('#p2c #qt-inp', 'Enter');
  await pg.waitForTimeout(600);
  const rem = await pg.evaluate(() => {
    /* NOT offsetParent: #rem-modal is position:fixed, and a fixed element's
       offsetParent is null whether it is on screen or not. */
    const m = document.getElementById('rem-modal');
    const q = m && m.getBoundingClientRect();
    return { open: !!m && getComputedStyle(m).display !== 'none' && q.height > 0,
      made: DB.articles.some((x) => x.title === 'Typed into Reminders') };
  });
  r.check(rem.made && rem.open,
    'in Reminders the bar really opens the reminder dialog it promises',
    `note created:${rem.made} · #rem-modal painted:${rem.open}`);
  await pg.evaluate(() => closeReminderModal());
  await pg.waitForTimeout(150);

  /* Expand all / Collapse all — the Smart View's answer to 🌳 Full tree.
     Counted by the note rows actually painted, not by the state flag. */
  const fold = await pg.evaluate(() => {
    selFolder('sf-time');
    const shown = () => document.querySelectorAll('#p2c .al').length;
    const hit = (txt) => { const b = [...document.querySelectorAll('#p2h-path .p2h-path-new')]
      .find((x) => x.textContent.includes(txt)); if (b) b.click(); return !!b; };
    const start = shown();
    const gotExpand = hit('Expand all'); const open = shown();
    const gotCollapse = hit('Collapse all'); const shut = shown();
    return { start, open, shut, gotExpand, gotCollapse };
  });
  r.check(fold.gotExpand && fold.gotCollapse && fold.open > 0 && fold.shut === 0,
    'Expand all / Collapse all really open and close a Smart View’s groups',
    `groups painted: ${fold.start} at rest → ${fold.open} expanded → ${fold.shut} collapsed`);

  /* A SECTION smart view is scoped: its bar must save into a folder that is
     actually inside that section, or the note lands outside the view. */
  const secScoped = await pg.evaluate(() => {
    selSecSF('sec-1', 'sf-favs');
    const inp = document.querySelector('#p2c .qt-bar input');
    const row = document.querySelector('#p2h-path .p2h-path-row');
    const dest = (inp?.getAttribute('onkeydown') || '').match(/qtKey\(event,'([^']+)'/);
    const ids = getSectionFolderIds('sec-1');
    return { bar: !!inp, row: !!row, dest: dest ? dest[1] : null,
      inSection: dest ? ids.includes(dest[1]) : false };
  });
  r.check(secScoped.bar && secScoped.row && secScoped.inSection,
    "a section's Smart View gets the row too, and saves inside that section",
    `bar:${secScoped.bar} row:${secScoped.row} destination:${secScoped.dest} inside the section:${secScoped.inSection}`);
  await s6n.close();

  /* The bar is the thing the owner asked to look good — so it also has to be
     hittable. A phone gets a 42px target; both sizes get measured. */
  for (const [label, w, h, min] of [['a laptop', 1440, 900, 28], ['a phone', 390, 844, 42]]) {
    const s = await openApp({ viewport: { width: w, height: h }, db: seedDB() });
    await s.page.evaluate(() => selFolder('sf-favs'));
    await s.page.waitForTimeout(250);
    const geo = await s.page.evaluate(() => {
      const bar = document.querySelector('#p2c .qt-bar');
      if (!bar) return null;
      const g = (el) => { const q = el.getBoundingClientRect();
        return { w: Math.round(q.width), h: Math.round(q.height) }; };
      /* The placeholder is the bar's only instruction, so it has to FIT.
         Measured in the field's own font on a canvas — a clipped one looks
         perfect in the DOM and arrives on the phone as "…press En". */
      const inp = bar.querySelector('input');
      const cs = getComputedStyle(inp);
      const ctx = document.createElement('canvas').getContext('2d');
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      return { bar: g(bar), go: g(bar.querySelector('.qt-go')), ic: g(bar.querySelector('.qt-ic')),
        radius: getComputedStyle(bar).borderTopLeftRadius,
        text: inp.placeholder, textW: Math.ceil(ctx.measureText(inp.placeholder).width),
        fieldW: Math.floor(g(inp).w - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) };
    });
    await s.close();
    const fits = geo && geo.textW <= geo.fieldW;
    r.check(geo && geo.go.h >= min && geo.ic.h >= min - 14 && parseFloat(geo.radius) > 8 && fits,
      `on ${label} the quick-add bar is a real, hittable control that says its whole line`,
      geo ? `bar ${geo.bar.w}×${geo.bar.h} · Save ${geo.go.w}×${geo.go.h} (needs ${min}) · badge ${geo.ic.w}×${geo.ic.h} · radius ${geo.radius} · ${JSON.stringify(geo.text)} needs ${geo.textW}px in ${geo.fieldW}px${fits ? '' : ' — CLIPPED'}`
        : 'no quick-add bar rendered');
  }

  /* And it has to READ — on the five presets, both of its own colours, and
     the placeholder, which is the one word the old flat bar got wrong. */
  for (const preset of ['forest', 'ocean', 'amber', 'indigo', 'rose']) {
    const db = seedDB(); db.theme = { preset, custom: {} };
    const s = await openApp({ viewport: { width: 1440, height: 900 }, db });
    await s.page.evaluate(() => selFolder('sf-favs'));
    await s.page.waitForTimeout(250);
    const inks = await s.page.evaluate(() => {
      const bar = document.querySelector('#p2c .qt-bar'); if (!bar) return null;
      const stackOf = (el) => { const st = [];
        for (let n = el; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor;
          if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') st.push(c);
          if (/^rgb\(/.test(c)) break; } return st; };
      const go = bar.querySelector('.qt-go'), inp = bar.querySelector('input');
      return [
        { what: 'Save', color: getComputedStyle(go).color, stack: stackOf(go) },
        { what: 'placeholder', color: getComputedStyle(inp, '::placeholder').color, stack: stackOf(inp) },
      ];
    });
    await s.close();
    const scored = (inks || []).map((x) => { const bg = flatten(x.stack);
      return { ...x, c: ratio(over(px(x.color), bg), bg) }; });
    const low = scored.filter((x) => x.c < 4.5);
    r.check(scored.length === 2 && low.length === 0,
      `the quick-add bar reads on ${preset}`,
      low.length ? low.map((x) => `${x.c.toFixed(1)}:1 ${x.what}`).join(' · ')
        : scored.map((x) => `${x.what} ${x.c.toFixed(1)}:1`).join(' · '));
  }
}

/* ── 6o. v04.21: the two header menus, reorganised ─────────────────────── */
{
  /* The owner asked for five items to leave ⚙ Settings for 🧰 Tools, and for
     both menus to be organised. The risks are all invisible from a
     screenshot: an item that lands in the other menu but still closes the one
     it came from, an item quietly lost in the move, and a menu that now runs
     off the edge of the screen. Each is measured here. */

  /* Every action in a menu, read out of the DOM as the FUNCTION it calls —
     a label can be reworded, the function is what actually happens. */
  const MENUS = async (pg) => pg.evaluate(() => {
    const read = (id) => [...document.querySelectorAll('#' + id + ' [onclick]')].map((el) => {
      const h = el.getAttribute('onclick');
      return { fn: (h.match(/^\s*([A-Za-z_$][\w$]*)\s*\(/) || [])[1] || h,
        closes: (h.match(/close(SBMenu|SBTools|SBHome)\(\)/) || [])[0] || null,
        text: (el.textContent || '').trim().replace(/\s+/g, ' ') };
    });
    const heads = (id) => [...document.querySelectorAll('#' + id + ' .sb-mi-hd')].map((h) => h.textContent.trim());
    return { tools: read('sb-tools'), menu: read('sb-menu'),
      toolHeads: heads('sb-tools'), menuHeads: heads('sb-menu') };
  });

  const s6o = await openApp({ viewport: { width: 1440, height: 900 }, db: seedDB() });
  const m = await MENUS(s6o.page);

  /* 1. The five named items are in Tools and gone from Settings. */
  const MOVED = ['openCalSettings', 'openCiteModal', 'toggleHijri', 'syncKnowledgeBase', 'addStarterMyDatabaseFolders'];
  const inTools = MOVED.filter((f) => m.tools.some((x) => x.fn === f));
  const leftBehind = MOVED.filter((f) => m.menu.some((x) => x.fn === f));
  r.check(inTools.length === 5 && leftBehind.length === 0,
    'the five notebook actions moved out of ⚙ Settings into 🧰 Tools',
    leftBehind.length ? `still in Settings: ${leftBehind.join(', ')}`
      : `in Tools: ${inTools.join(', ')}`);

  /* 2. Nothing was lost or duplicated in the move. This is the whole set of
     actions the two menus carried in v04.20, before the reorganisation. */
  const V0420 = ['undo', 'redo', 'openModal', 'addRootFolder', 'openTheme', 'autoFit', 'autoNumberAll',
    'toggleAccordionSec', 'enableAutoSave', 'exportFile', 'openTrash', 'openSyncModal', 'refreshApp',
    'openCalSettings', 'openCiteModal', 'toggleHijri', 'installPWA', 'syncKnowledgeBase',
    'addStarterMyDatabaseFolders', 'doSignOut', 'openBackupModal', 'importBackup', 'exportBackupHTML',
    'backupToGDrive', 'exportBackupPDF', 'exportDeploy'];
  const now = [...m.tools, ...m.menu].map((x) => x.fn);
  const lost = V0420.filter((f) => !now.includes(f));
  const added = [...new Set(now)].filter((f) => !V0420.includes(f));
  r.check(lost.length === 0 && added.length === 0,
    'every action the two menus had in v04.20 is still on one of them',
    lost.length || added.length ? `lost: ${lost.join(',') || '—'} · unexpected: ${added.join(',') || '—'}`
      : `${V0420.length} actions, ${m.tools.length} in Tools and ${m.menu.length} in Settings`);

  /* 3. THE defect this round could ship: a moved item still calling
     closeSBMenu() would leave the Tools menu open after being clicked. */
  const wrongTools = m.tools.filter((x) => x.closes && x.closes !== 'closeSBTools()');
  const wrongMenu = m.menu.filter((x) => x.closes && x.closes !== 'closeSBMenu()');
  r.check(wrongTools.length === 0 && wrongMenu.length === 0,
    'every item closes the menu it is actually in, not the one it came from',
    [...wrongTools, ...wrongMenu].map((x) => `${x.fn} → ${x.closes}`).join(' · ')
      || `${m.tools.filter((x) => x.closes).length} in Tools, ${m.menu.filter((x) => x.closes).length} in Settings`);

  /* 4. Both menus are organised under headings, and no heading is empty —
     a heading over nothing is worse than no heading at all. */
  const grouped = await s6o.page.evaluate(() => {
    const of = (id) => { const out = [];
      for (const el of document.getElementById(id).children) {
        if (el.classList.contains('sb-mi-hd')) out.push({ head: el.textContent.trim(), n: 0 });
        else if (el.classList.contains('sb-mi') && out.length) out[out.length - 1].n++;
      } return out; };
    return { tools: of('sb-tools'), menu: of('sb-menu') };
  });
  const empty = [...grouped.tools, ...grouped.menu].filter((g) => g.n === 0);
  r.check(grouped.tools.length >= 4 && grouped.menu.length >= 4 && empty.length === 0,
    'both menus are split into named groups and every group has items under it',
    empty.length ? `empty heading(s): ${empty.map((g) => g.head).join(', ')}`
      : `Tools: ${grouped.tools.map((g) => `${g.head} (${g.n})`).join(' · ')} | Settings: ${grouped.menu.map((g) => `${g.head} (${g.n})`).join(' · ')}`);
  await s6o.close();

  /* 5. Geometry. Opened with a REAL mouse click on the real button and looked
     at again 250ms later (the v04.12 rule), then asked the only question that
     matters: is the whole menu on the screen? The first cut of this round
     hung 88px off the LEFT edge — the menu is anchored right:0 to a button
     near the left edge of a narrow sidebar — and a screenshot found it, not
     an assertion. So both edges, the bottom, and two sidebar widths. */
  for (const vp of VIEWPORTS) {
    for (const sbw of (vp.width >= 1200 ? [160, 540] : [null])) {
      const s = await openApp({ viewport: { width: vp.width, height: vp.height }, db: seedDB() });
      if (sbw) { await s.page.evaluate((w) => { document.getElementById('sb').style.width = w + 'px'; }, sbw);
        await s.page.waitForTimeout(300); }
      const out = [];
      for (const [id, btn] of [['sb-tools', '#sb-tools-btn'], ['sb-menu', '#sb-menu-btn']]) {
        const box = await s.page.locator(btn).boundingBox();
        await s.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await s.page.waitForTimeout(250);
        out.push(await s.page.evaluate((i) => {
          const el = document.getElementById(i);
          const b = el.getBoundingClientRect();
          /* Only rows that are actually PAINTED: 📱 Install App is
             display:none until Chrome offers the install, and a hidden row
             measures 0px, which is not a touch target that failed — it is
             not a touch target at all. */
          const rows = [...el.querySelectorAll('.sb-mi')].filter((x) => x.offsetParent)
            .map((x) => Math.round(x.getBoundingClientRect().height));
          return { id: i, open: el.classList.contains('open'),
            left: Math.round(b.left), right: Math.round(b.right), bottom: Math.round(b.bottom),
            w: Math.round(b.width), h: Math.round(b.height),
            vw: innerWidth, vh: innerHeight,
            scrolls: el.scrollHeight > el.clientHeight + 1,
            cued: el.classList.contains('sb-dd-scroll'),
            reach: el.scrollHeight, shortest: Math.min(...rows), rows: rows.length };
        }, id));
        await s.page.keyboard.press('Escape').catch(() => {});
        await s.page.evaluate((i) => document.getElementById(i).classList.remove('open'), id);
      }
      await s.close();
      const off = out.filter((o) => !o.open || o.left < 0 || o.right > o.vw || o.bottom > o.vh);
      r.check(off.length === 0,
        `${vp.name}${sbw ? ` (sidebar ${sbw}px)` : ''}: a real click opens each header menu fully on screen`,
        off.length ? off.map((o) => `${o.id}: ${o.open ? '' : 'CLOSED ITSELF · '}${o.left}→${o.right} of ${o.vw}px wide, bottom ${o.bottom} of ${o.vh}`).join(' · ')
          : out.map((o) => `${o.id} ${o.w}×${o.h} at x${o.left} bottom ${o.bottom}/${o.vh}`).join(' · '));
      /* A menu too tall for the screen must scroll AND say that it does —
         rows the owner cannot see are rows that do not exist to them. */
      const silent = out.filter((o) => o.scrolls && !o.cued);
      r.check(silent.length === 0,
        `${vp.name}${sbw ? ` (sidebar ${sbw}px)` : ''}: a menu that has to scroll shows that it does`,
        silent.length ? silent.map((o) => `${o.id} holds ${o.reach}px in ${o.h}px with no cue`).join(' · ')
          : out.map((o) => `${o.id} ${o.scrolls ? `scrolls ${o.reach}px, cued` : 'fits whole'}`).join(' · '));
      /* And on a phone every row is a real touch target — 44px, the size the
         folder pop-out and the Assign window were held to in v04.17/v04.18. */
      if (vp.width < 640) {
        const small = out.filter((o) => o.shortest < 44);
        r.check(small.length === 0, `${vp.name}: every menu row is a 44px touch target`,
          small.length ? small.map((o) => `${o.id}: shortest row ${o.shortest}px`).join(' · ')
            : out.map((o) => `${o.id} ${o.rows} rows, shortest ${o.shortest}px`).join(' · '));
      }
    }
  }

  /* 6. And they have to READ. These menus live inside #sb, so the v04.15
     sweep walks them — but only ever with both of them CLOSED, which means
     display:none and nothing measured. The new group headings are the first
     text this round adds, on a --hover strip, so they are scored here on all
     five presets along with every item label. */
  for (const preset of ['forest', 'ocean', 'amber', 'indigo', 'rose']) {
    const db = seedDB(); db.theme = { preset, custom: {} };
    const s = await openApp({ viewport: { width: 1440, height: 900 }, db });
    await s.page.evaluate(() => { toggleSBTools(null); toggleSBMenu(null);
      /* both at once — only for measuring; the app itself opens one */
      document.getElementById('sb-tools').classList.add('open'); });
    await s.page.waitForTimeout(200);
    const inks = await s.page.evaluate(() => {
      const stackOf = (el) => { const st = [];
        for (let n = el; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor;
          if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') st.push(c);
          if (/^rgb\(/.test(c)) break; } return st; };
      const out = [];
      for (const id of ['sb-tools', 'sb-menu']) {
        for (const el of document.querySelectorAll(`#${id} .sb-mi, #${id} .sb-mi-hd`)) {
          const words = [...el.childNodes].filter((n) => n.nodeType === 3)
            .map((n) => n.textContent).join('').replace(/[^\p{L}\p{N}]/gu, '');
          if (!words) continue;                     /* emoji-only says nothing about colour */
          if (!el.offsetParent) continue;           /* hidden rows paint nothing */
          out.push({ what: `${id}:${el.textContent.trim().slice(0, 22)}`,
            color: getComputedStyle(el).color, stack: stackOf(el) });
        }
      }
      return out;
    });
    await s.close();
    const scored = inks.map((x) => { const bg = flatten(x.stack);
      return { ...x, c: ratio(over(px(x.color), bg), bg) }; });
    const low = scored.filter((x) => x.c < 4.5);
    r.check(scored.length > 20 && low.length === 0,
      `every word in both header menus reads on ${preset}`,
      low.length ? low.map((x) => `${x.c.toFixed(1)}:1 ${x.what}`).join(' · ')
        : `${scored.length} labels and headings, worst ${Math.min(...scored.map((x) => x.c)).toFixed(1)}:1`);
  }
}

/* ── 6p. v04.22: one bar on a phone, and a menu under its own button ───── */
{
  /* The owner measured the phone's edit view with a screenshot: five rows of
     chrome before the first line of writing, about half the screen. The round
     folds three of those rows into the one bar (Calendar, Tab, Templates and
     Attach under `+`; undo/redo and Find under `≡`; Save on the bar itself),
     and fixes a menu that opened at the FOOT of the screen instead of under
     the button that opened it.
     Four things can go wrong here and none of them is visible in a
     screenshot of a closed menu: a control lost in the fold, a menu that
     opens and shuts itself in the same tick (the v04.12 defect), a menu that
     runs off the screen (the v04.21 defect), and a date flip that rebuilds
     #ed and costs the caret. Each is measured. */

  /* Open a note for editing and hand back the surface, ready to measure. */
  const editAt = async (w, h) => {
    const s = await openApp({ viewport: { width: w, height: h }, db: seedDB() });
    await s.page.evaluate(() => { ST.folder = 'f1'; ST.article = 'a1'; window.render();
      if (innerWidth < 1200) showPane('p3'); });
    await s.page.waitForTimeout(250);
    await s.page.evaluate(() => window.startEdit());
    await s.page.waitForSelector('#ed');
    await s.page.waitForTimeout(350);
    return s;
  };
  /* Every action reachable from the whole edit surface, named by the FUNCTION
     it calls — a label can be reworded, the function is what happens. The
     group menus are opened one at a time because a closed menu is
     display:none and contributes nothing (the v04.21 lesson). */
  const reach = async (pg) => {
    const groups = await pg.evaluate(() =>
      [...document.querySelectorAll('.eb-grp-btn')].map((b) => b.dataset.g));
    const grab = () => pg.evaluate(() => {
      const out = [];
      const scan = (root) => { if (!root) return;
        for (const el of root.querySelectorAll('[onclick],[onmousedown]')) {
          if (!el.offsetParent && el.id !== 'ed-col-wrap') continue;   /* hidden = unreachable */
          for (const at of ['onclick', 'onmousedown']) {
            const h = el.getAttribute(at); if (!h) continue;
            for (const m of h.matchAll(/([A-Za-z_$][\w$]*)\s*\(/g)) out.push(m[1]);
          }
        } };
      ['tab-bar', 'p3h', 'p3c'].forEach((id) => scan(document.getElementById(id)));
      scan(document.getElementById('eb-pop'));
      return out;
    });
    const all = new Set(await grab());
    /* v04.23 — the tag bar is one of the surfaces the phone folds, so it has
       to be OPENED to be collected, exactly like the group menus. Collecting
       it closed reported rmTag and the tag input as "lost in the fold" when
       they are one tap away — the check's blind spot, not the app's. Left
       shut afterwards, because a later check asserts it starts that way. */
    if (await pg.evaluate(() => !!document.querySelector('.eb-tag-btn'))) {
      await pg.click('.eb-tag-btn'); await pg.waitForTimeout(200);
      (await grab()).forEach((f) => all.add(f));
      await pg.click('.eb-tag-btn'); await pg.waitForTimeout(200);
    }
    for (const g of groups) {
      await pg.evaluate((g) => { if (ST.ebGroup) togEBGroup(ST.ebGroup); }, g);
      await pg.waitForTimeout(80);
      await pg.click(`.eb-grp-btn[data-g="${g}"]`);
      await pg.waitForTimeout(200);
      (await grab()).forEach((f) => all.add(f));
    }
    await pg.evaluate(() => { if (ST.ebGroup) togEBGroup(ST.ebGroup); });
    await pg.waitForTimeout(80);
    /* Plumbing, not actions — these say nothing about what the owner can do. */
    ['event', 'togEBGroup', 'closeFloatPop', '_closeStickyPop', 'toggleEdColPop',
      'esc', 'String', 'if'].forEach((f) => all.delete(f));
    return all;
  };

  /* 1. The phone's edit view is ONE bar of chrome, not five. */
  const sPh = await editAt(390, 844);
  const rows = await sPh.page.evaluate(() => {
    const vis = (sel) => [...document.querySelectorAll(sel)]
      .filter((e) => e.offsetParent && e.getBoundingClientRect().height > 0).length;
    const bar = document.querySelector('.p3h-nav-edit-row');
    return { bars: vis('.p3h-nav-edit-row'), tabs: vis('#tab-bar'), kinds: vis('.kind-bar'),
      tags: vis('.p3h-tag-bar'), meta: vis('.p3-meta-row'), tagN: vis('.eb-tag-btn'),
      edTop: Math.round(document.getElementById('ed').getBoundingClientRect().top),
      vh: innerHeight,
      barText: (bar ? bar.innerText : '').replace(/\s+/g, ' ').trim(),
      save: !!document.querySelector('.p3h-nav-edit-row .et-save') };
  });
  /* v04.23 — the tag bar joined the rows that are not permanently there. The
     owner asked why it was still showing; it is behind 🏷 on the bar now, and
     🏷 carries the tag count so a closed bar still says the note is tagged. */
  r.check(rows.bars === 1 && rows.tabs === 0 && rows.kinds === 0 && rows.tags === 0 && rows.save,
    'phone: editing a note opens on ONE bar, with Save on it',
    `nav+edit rows ${rows.bars} · tab bar ${rows.tabs} · type/Attach/Save row ${rows.kinds}`
      + ` · tag bar ${rows.tags} · Save on the bar ${rows.save ? 'yes' : 'NO'} · "${rows.barText}"`);
  /* And the writing starts in the top third of the phone, not halfway down.
     v04.21 measured ~450px of 844 (53%); the budget is a third. */
  r.check(rows.edTop < rows.vh * 0.34,
    'phone: the note itself starts in the top third of the screen',
    `#ed begins at ${rows.edTop}px of ${rows.vh}px (${Math.round(rows.edTop / rows.vh * 100)}%)`);

  /* Every control on that bar is one size, and none of them is pushed off the
     end. `min-width:0` on a flex item does not overflow — it DISAPPEARS
     (v04.14), and .nav-l/.nav-r scroll, so a button that no longer fits is
     simply unreachable while the row still looks perfect. Measured against
     the viewport, not against the row. */
  const bar = await sPh.page.evaluate(() => {
    const btns = [...document.querySelectorAll('.p3h-nav-edit-row button')]
      .filter((b) => b.offsetParent)
      .map((b) => { const q = b.getBoundingClientRect();
        return { what: (b.textContent || b.title || '?').trim().slice(0, 10),
          w: Math.round(q.width), h: Math.round(q.height),
          out: q.left < -0.5 || q.right > innerWidth + 0.5 }; });
    const strips = ['nav-l', 'nav-r'].map((c) => { const e = document.querySelector('.p3h-nav-edit-row .' + c);
      return { c, over: Math.round(e.scrollWidth - e.clientWidth) }; });
    return { btns, strips };
  });
  const runt = bar.btns.filter((b) => b.w < 38 || b.h < 40);
  const gone = bar.btns.filter((b) => b.out);
  const spill = bar.strips.filter((x) => x.over > 1);
  r.check(runt.length === 0 && gone.length === 0 && spill.length === 0,
    'phone: every control on the one bar is one size and none is pushed off the end',
    runt.length ? `undersized: ${runt.map((b) => `${b.what} ${b.w}×${b.h}`).join(', ')}`
      : gone.length ? `off the viewport: ${gone.map((b) => b.what).join(', ')}`
        : spill.length ? `scrolls out of reach: ${spill.map((x) => `${x.c} by ${x.over}px`).join(', ')}`
          : `${bar.btns.length} controls, all 38×40 or bigger, nothing scrolled away`);

  /* The nav pair used to be on this bar AND on the title row — the same two
     functions, twice, one under the other. */
  const dups = await sPh.page.evaluate(() => {
    const n = (fn) => [...document.querySelectorAll('#p3h [onclick],#p3c [onclick]')]
      .filter((e) => e.offsetParent && (e.getAttribute('onclick') || '').startsWith(fn)).length;
    return { back: n('openP2'), folders: n('backFromP3') };
  });
  r.check(dups.back === 1 && dups.folders === 1,
    'phone: the ◀ and ≡ nav buttons appear once, not on two rows at the same time',
    `◀ back-to-list ×${dups.back} · ≡ folders ×${dups.folders}`);

  /* 2. Nothing was lost in the fold. Measured against the SAME app one pixel
     the other side of the breakpoint, so the check maintains itself: whatever
     a 640px screen can reach, a 390px screen must still reach too. */
  const phoneFns = await reach(sPh.page);
  const sTb = await editAt(640, 844);
  const tabFns = await reach(sTb.page);
  await sTb.close();
  /* v04.23 — goHome is the ONE deliberate exception, and it is exempted here
     with its reason rather than by loosening the comparison: 🏠 left the
     phone's bar because ≡ beside it (backFromP3 → showPane('sb')) lands on
     the same screen, and goHome() itself ends with that same call. It is
     proved reachable below instead of assumed. */
  /* v04.27 — two more, both paid for below rather than waved through.
     openAttachMenu was a button whose only job was to open four more; those
     four are in the `+` menu directly now, so the opener has nothing left to
     do. _ntiChipTap was "tap the type chip to change the type"; the phone has
     a 🏷 Note Type row that calls openNtiPicker itself. */
  const EXEMPT = ['goHome', 'openAttachMenu', '_ntiChipTap'];
  const lost = [...tabFns].filter((f) => !phoneFns.has(f) && !EXEMPT.includes(f));
  r.check(lost.length === 0 && phoneFns.size > 25,
    'phone: every control the unfolded bar reaches, the folded one still reaches',
    lost.length ? `unreachable once folded: ${lost.join(', ')}`
      : `${phoneFns.size} actions on the phone, ${tabFns.size} at 640px, none lost`
        + ` (goHome exempt — see below)`);
  /* An exemption is only honest if the thing is genuinely still reachable. ≡
     opens the sidebar, and the 📚 Siyagah logo there IS goHome(). */
  const homeOk = await sPh.page.evaluate(() => {
    backFromP3();
    const logo = document.querySelector('.sb-logo');
    return { shown: !!(logo && logo.offsetParent),
      fn: (logo && logo.getAttribute('onclick')) || null };
  });
  await sPh.page.evaluate(() => { showPane('p3'); });
  await sPh.page.waitForTimeout(150);
  r.check(homeOk.shown && /goHome\(\)/.test(homeOk.fn || ''),
    'phone: 🏠 Home is still one tap away — ≡ opens the sidebar and its logo is goHome()',
    homeOk.shown ? `.sb-logo onclick="${homeOk.fn}"` : 'the sidebar logo is not visible after ≡');

  /* v04.27 — 🏷 left the bar and the tag ROW went with it: the owner asked
     "do we need a separate tag button when the + button contains it?" and once
     📎 Attach was spread open, it did not. So the check changes from "🏷 opens
     the row" to "the `+` menu really holds the editor, and typing in it really
     tags the note" — measured through DB, not through the DOM. */
  await sPh.page.click('.eb-grp-btn[data-g="insert"]');
  await sPh.page.waitForTimeout(300);
  const tagIn = await sPh.page.evaluate(() =>
    ({ btnGone: !document.querySelector('.eb-tag-btn'),
      rowGone: !document.querySelector('.p3h-tag-bar'),
      editor: !!document.querySelector('#eb-pop .eb-tagrow #tag-editor'),
      input: !!document.querySelector('#eb-pop #tag-inp'),
      chips: document.querySelectorAll('#eb-pop .tag-chip').length }));
  if (tagIn.input) {
    await sPh.page.click('#eb-pop #tag-inp');
    await sPh.page.keyboard.type('viacheck');
    await sPh.page.keyboard.press('Enter');
    await sPh.page.waitForTimeout(300);
  }
  const tagLanded = await sPh.page.evaluate(() => (ST.etags || []).includes('viacheck'));
  await sPh.page.evaluate(() => { ST.etags = (ST.etags || []).filter((t) => t !== 'viacheck');
    if (ST.ebGroup) togEBGroup(ST.ebGroup); });
  await sPh.page.waitForTimeout(200);
  r.check(tagIn.btnGone && tagIn.rowGone && tagIn.editor && tagIn.input
    && tagIn.chips === 1 && tagLanded,
    'phone: the tag editor is inside the `+` menu, and typing in it really tags the note',
    `separate 🏷 gone ${tagIn.btnGone} · tag row gone ${tagIn.rowGone}`
      + ` · editor in the menu ${tagIn.editor} with ${tagIn.chips} existing chip(s)`
      + ` · a typed tag reached ST.etags ${tagLanded}`);

  /* The four rows that were behind 📎 Attach, in the menu itself — and the
     opener gone, because a control that moves has to leave where it was
     (v04.24). Named by the FUNCTION each row calls. */
  await sPh.page.click('.eb-grp-btn[data-g="insert"]');
  await sPh.page.waitForTimeout(300);
  const att = await sPh.page.evaluate(() => {
    const pop = document.getElementById('eb-pop');
    const fns = [...pop.querySelectorAll('button')]
      .map((b) => b.getAttribute('onclick') || '').join(' ');
    const heads = [...pop.querySelectorAll('.fl-pop-hd')].map((h) => h.textContent.trim());
    return { heads, opener: !!pop.querySelector('.nti-attach-btn'),
      nti: /openNtiPicker\(/.test(fns), folder: /openPicker\(/.test(fns),
      jrn: /openJournalPicker\(/.test(fns), mdb: /openMyDatabasePicker\(/.test(fns),
      arch: /toggleArchive\(/.test(fns) };
  });
  await sPh.page.evaluate(() => { if (ST.ebGroup) togEBGroup(ST.ebGroup); });
  await sPh.page.waitForTimeout(200);
  r.check(att.nti && att.folder && att.jrn && att.mdb && !att.opener
    && att.heads.some((h) => /attach to the note/i.test(h)) && !att.arch,
    'phone: the four Attach rows are spread open in `+`, the opener is gone, Archive is not',
    `Note Type ${att.nti} · Folder ${att.folder} · Journal ${att.jrn} · MyDatabase ${att.mdb}`
      + ` · 📎 opener still there ${att.opener} · Archive still here ${att.arch}`
      + ` · headings: ${att.heads.join(' | ')}`);

  /* And the ≡ menu: undo block first, then lists, then 📦 Archive — the order
     the owner asked for, measured by where the headings actually fall. */
  await sPh.page.click('.eb-grp-btn[data-g="lists"]');
  await sPh.page.waitForTimeout(300);
  const lm = await sPh.page.evaluate(() => {
    const pop = document.getElementById('eb-pop');
    return { heads: [...pop.querySelectorAll('.fl-pop-hd')].map((h) => h.textContent.trim()),
      arch: [...pop.querySelectorAll('button')].some((b) => /toggleArchive\(/.test(b.getAttribute('onclick') || '')) };
  });
  await sPh.page.evaluate(() => { if (ST.ebGroup) togEBGroup(ST.ebGroup); });
  await sPh.page.waitForTimeout(200);
  const iUndo = lm.heads.findIndex((h) => /undo/i.test(h));
  const iList = lm.heads.findIndex((h) => /lists/i.test(h));
  r.check(iUndo === 0 && iList > iUndo && lm.arch,
    'phone: the ≡ menu puts Undo·Redo·Find first, Lists second, and carries 📦 Archive',
    `${lm.heads.join(' → ')} · Archive here ${lm.arch}`);

  /* ✕ left the tag bar with it, so it has to be somewhere the eye lands. */
  const stop = await sPh.page.evaluate(() => {
    const b = document.querySelector('.p3c-titlebar .p3c-stop');
    if (!b || !b.offsetParent) return null;
    const q = b.getBoundingClientRect();
    return { fn: b.getAttribute('onclick'), w: Math.round(q.width), h: Math.round(q.height) };
  });
  r.check(!!stop && /cancelEdit\(\)/.test(stop.fn) && stop.w >= 38 && stop.h >= 38,
    'phone: ✕ stop-editing moved onto the title row and can be hit',
    stop ? `${stop.w}×${stop.h}, onclick="${stop.fn}"` : 'no ✕ on the title row');

  /* 3. Save on the bar really saves. A real click, and the typed words are
     read back out of DB — "it did not throw" is not a saved note. */
  await sPh.page.click('#ed');
  await sPh.page.keyboard.press('Control+End');
  await sPh.page.keyboard.type(' SAVEDBYBAR');
  await sPh.page.waitForTimeout(150);
  await sPh.page.click('.p3h-nav-edit-row .et-save');
  await sPh.page.waitForTimeout(400);
  const saved = await sPh.page.evaluate(() =>
    (DB.articles.find((a) => a.id === 'a1').content || '').includes('SAVEDBYBAR'));
  r.check(saved, 'phone: 💾 Save on the bar commits the note',
    saved ? 'typed text is in DB.articles after a real click' : 'the note did NOT save');
  await sPh.close();

  /* 4. The date line is ONE date, and a tap flips it — without rebuilding the
     editor underneath, which would cost the caret mid-sentence. */
  {
    const s = await editAt(390, 844);
    const before = await s.page.evaluate(() => {
      const b = document.querySelectorAll('.p3-meta-row .dl-flip');
      document.getElementById('ed').dataset.probe = 'same-node';
      return { n: b.length, text: b[0] ? b[0].textContent.trim() : '',
        inMeta: !!document.querySelector('.p3-meta-row .dl-flip'),
        upd: DB.articles.find((a) => a.id === 'a1').updatedAt };
    });
    await s.page.click('.dl-flip');
    await s.page.waitForTimeout(200);
    const mid = await s.page.evaluate(() => ({
      text: document.querySelector('.dl-flip').textContent.trim(),
      sameEd: document.getElementById('ed').dataset.probe === 'same-node',
      upd: DB.articles.find((a) => a.id === 'a1').updatedAt }));
    await s.page.click('.dl-flip');
    await s.page.waitForTimeout(200);
    const back = await s.page.evaluate(() => document.querySelector('.dl-flip').textContent.trim());
    r.check(before.n === 1 && before.inMeta && /^Created /.test(before.text),
      'the note shows ONE date, on the versioning bar, and it is the created one',
      `${before.n} date element(s) in .p3-meta-row: "${before.text}"`);
    r.check(/^Updated /.test(mid.text) && /^Created /.test(back),
      'tapping the date flips it to Updated, and back again',
      `"${before.text}" → "${mid.text}" → "${back}"`);
    r.check(mid.sameEd && mid.upd === before.upd,
      'flipping the date neither rebuilds the editor nor touches the note',
      `#ed ${mid.sameEd ? 'is the same node' : 'WAS REBUILT'} · updatedAt ${mid.upd === before.upd ? 'unchanged' : 'CHANGED'}`);
    await s.close();
  }

  /* 5. The section-tools ⋯ shares the versioning bar, after the date — and
     #ed-col-wrap is an id, so there must never be two of it. */
  for (const vp of VIEWPORTS) {
    const s = await editAt(vp.width, vp.height);
    const m = await s.page.evaluate(() => {
      const all = document.querySelectorAll('#ed-col-wrap');
      const w = document.getElementById('ed-col-wrap');
      const d = document.querySelector('.p3-meta-row .dl-flip');
      return { n: all.length, inMeta: !!(w && w.closest('.p3-meta-row')),
        inTb: !!(w && w.closest('.p3h-unified-tb')),
        afterDate: !!(w && d && w.getBoundingClientRect().left >= d.getBoundingClientRect().right - 1),
        shown: !!(w && getComputedStyle(w).display !== 'none') };
    });
    await s.close();
    const wantMeta = vp.width < 1200;
    r.check(m.n === 1 && m.shown && (wantMeta ? (m.inMeta && m.afterDate) : m.inTb),
      `${vp.name}: exactly one section-tools ⋯, ${wantMeta ? 'on the versioning bar after the date' : 'on the unified toolbar'}`,
      `${m.n} #ed-col-wrap · ${m.inMeta ? 'in .p3-meta-row' : m.inTb ? 'in the toolbar' : 'nowhere expected'}`
        + ` · painted ${m.shown} · after the date ${m.afterDate}`);
  }

  /* 5a. v04.24/v04.25 — the tab bar while editing on a phone, measured with
     tabs actually seeded, because that is the state it exists in.
     v04.22 put 📅 Calendar and ＋ Add Tab under `+` and hid the bar while
     editing — but only when EMPTY, and never took the two buttons off it. The
     first tab the owner opened brought the bar back carrying both.
     v04.24 stripped the buttons and left the bar. The owner's answer to that
     was "the bar is still there": a tab bar IS a second bar, and the brief was
     ONE bar. v04.25 does not render it at all while editing on a phone, and
     lists every open tab under `+` instead — so this check now asserts the bar
     is GONE, and that the tabs are still reachable and still switch. */
  {
    const s = await openApp({ viewport: { width: 390, height: 844 }, db: seedDB() });
    await s.page.evaluate(() => { DB.tabs = { a1: ['a2', 'a3'] }; ST.tabOwner = 'a1';
      ST.folder = 'f1'; ST.article = 'a1'; window.render(); showPane('p3'); });
    await s.page.waitForTimeout(300);
    const look = () => s.page.evaluate(() => {
      const b = document.getElementById('tab-bar');
      return { shown: getComputedStyle(b).display !== 'none',
        h: Math.round(b.getBoundingClientRect().height),
        cal: !!b.querySelector('.tab-cal'), add: !!b.querySelector('.tab-add-btn'),
        chips: b.querySelectorAll('.tab-strip .tab-it').length };
    });
    const rd = await look();
    await s.page.evaluate(() => window.startEdit());
    await s.page.waitForTimeout(400);
    const ed = await look();
    await s.page.evaluate(() => cancelEdit());
    await s.page.waitForTimeout(400);
    const back = await look();
    await s.close();
    r.check(!ed.shown && ed.h === 0,
      'phone: with three tabs open, the tab bar is NOT a row while editing',
      ed.shown ? `still painted, ${ed.h}px tall, ${ed.chips} chip(s),`
        + ` 📅 Cal ${ed.cal ? 'on it' : 'gone'}, ＋ Add Tab ${ed.add ? 'on it' : 'gone'}`
        : 'not rendered at all');
    /* v04.30 — updated in place, not worked around: the owner asked for the
       bar to go from the READ view too ("bar is not required"), so it no
       longer comes back when editing ends. What it carried is asserted
       reachable from the 🏷 palette instead, a few checks below. */
    r.check(!rd.shown && !back.shown,
      'phone: the tab bar does not render in read mode either, before or after an edit',
      `read ${rd.shown ? 'STILL PAINTED' : 'not rendered'} · after ✕ ${back.shown ? 'STILL PAINTED' : 'not rendered'}`);
  }

  /* 5a-ii. Hiding a bar is only allowed if what was on it is still reachable —
     and reachable means a real click really switches the note, not that a row
     with the right words exists. */
  {
    const s = await openApp({ viewport: { width: 390, height: 844 }, db: seedDB() });
    await s.page.evaluate(() => { DB.tabs = { a1: ['a2', 'a3'] }; ST.tabOwner = 'a1';
      ST.folder = 'f1'; ST.article = 'a1'; window.render(); showPane('p3'); window.startEdit(); });
    await s.page.waitForTimeout(400);
    await s.page.click('.eb-grp-btn[data-g="insert"]');
    await s.page.waitForTimeout(300);
    const rows = await s.page.evaluate(() => [...document.querySelectorAll('#eb-pop .eb-tab-row')]
      .map((b) => ({ txt: b.textContent.trim(), fn: b.getAttribute('onclick') || '' })));
    let switched = null;
    if (rows.length) {
      await s.page.evaluate(() => {
        const b = [...document.querySelectorAll('.eb-tab-row')].find((x) => /note two/i.test(x.textContent));
        if (b) b.click();
      });
      await s.page.waitForTimeout(500);
      /* v04.30 — the tab bar no longer comes back on a phone when editing
         ends (the owner asked for it gone from the read view too), so what
         this asserts is the thing that actually matters: the click really
         moved the app to that note, and it really left edit mode. */
      switched = await s.page.evaluate(() => ({ art: ST.article, editing: ST.editing }));
    }
    await s.close();
    r.check(rows.length === 3 && rows.every((x) => /tabSelect\(/.test(x.fn))
      && switched && switched.art === 'a2' && !switched.editing,
      'phone: every open tab is a row under `+`, and a real click on one switches to that note',
      rows.length ? `${rows.length} rows: ${rows.map((x) => x.txt).join(' · ')}`
        + ` → clicking one lands on ${switched ? switched.art : '?'},`
        + ` editing ${switched ? switched.editing : '?'}`
        : 'no tab rows under `+` — the tabs are unreachable while editing');
  }

  /* 5a-iii. v04.30 — "Now, do same in view mode too. Move n Place Cal n add
     tab to the attach button (bar is not required) n spread-open them on the
     pallet with the attach buttons as well spread-open."
     The read view's 🏷 palette held two controls, one of which (📎 Attach) only
     opened four MORE — two taps to reach 📓 My Journal. It is the same
     spread-open card the `+` menu carries now, from the same builders, and it
     absorbs what the tab bar used to hold. Measured by the FUNCTIONS the rows
     call, so a relabel cannot fake it. */
  {
    const s = await openApp({ viewport: { width: 390, height: 844 }, db: seedDB() });
    await s.page.evaluate(() => { DB.tabs = { a1: ['a2', 'a3'] }; ST.tabOwner = 'a1';
      ST.folder = 'f1'; ST.article = 'a1'; window.render(); showPane('p3'); });
    await s.page.waitForTimeout(450);
    const open = async (sel) => { await s.page.evaluate(() => closeFloatPop('p3h-pal'));
      await s.page.waitForTimeout(120);
      await s.page.evaluate((q) => document.querySelector(q).click(), sel);
      await s.page.waitForTimeout(300);
      return s.page.evaluate(() => {
        const p = document.getElementById('p3h-pal');
        if (!p || !p.classList.contains('open')) return { open: false };
        const fns = [...p.querySelectorAll('button')].map((b) => b.getAttribute('onclick') || '').join(' ');
        const b = p.getBoundingClientRect();
        const rows = [...p.querySelectorAll('button')].filter((x) => x.offsetParent)
          .map((x) => Math.round(x.getBoundingClientRect().height));
        return { open: true, fns,
          heads: [...p.querySelectorAll('.fl-pop-hd')].map((h) => h.textContent.trim()),
          middleman: !!p.querySelector('.nti-attach-btn'),
          left: Math.round(b.left), right: Math.round(b.right), vw: innerWidth,
          shortest: rows.length ? Math.min(...rows) : 0 };
      });
    };
    const viaGrp = await open('#p3h-nti-grp');
    const viaAttach = await open('#p3h .nti-attach-btn');
    await s.close();
    const spread = (o) => o.open && !o.middleman
      && /openNtiPicker\(/.test(o.fns) && /openJournalPicker\(/.test(o.fns)
      && /openMyDatabasePicker\(/.test(o.fns)
      && /openPicker\(|Open this note for editing/.test(o.fns);
    r.check(spread(viaGrp),
      'phone read mode: the 🏷 palette spreads all four Attach rows open, with no 📎 middleman',
      viaGrp.open ? `headings: ${viaGrp.heads.join(' | ')} · 📎 opener still there ${viaGrp.middleman}`
        : 'the palette did not open');
    /* Both ways in must land on the same card — the toolbar folds the type
       group behind 🏷 only when it does not fit, so 📎 Attach is sometimes the
       button the owner actually taps. */
    r.check(spread(viaAttach),
      'phone read mode: tapping 📎 Attach lands on that same spread-open card',
      viaAttach.open ? `headings: ${viaAttach.heads.join(' | ')}` : 'it opened something else');
    /* And it carries what the tab bar used to. */
    r.check(viaGrp.open && /_calOpen\(/.test(viaGrp.fns) && /openTabPicker\(/.test(viaGrp.fns)
      && /tabSelect\(/.test(viaGrp.fns) && viaGrp.heads.some((h) => /go to/i.test(h)),
      'phone read mode: 📅 Calendar, ＋ Add Tab and the open tabs are in that card',
      viaGrp.open ? `Calendar ${/_calOpen\(/.test(viaGrp.fns)} · Add Tab ${/openTabPicker\(/.test(viaGrp.fns)}`
        + ` · tabs ${/tabSelect\(/.test(viaGrp.fns)} · ${viaGrp.heads.join(' | ')}` : 'not measured');
    r.check(viaGrp.open && viaGrp.left <= 8 && viaGrp.right >= viaGrp.vw - 8 && viaGrp.shortest >= 44,
      'phone read mode: that card runs edge to edge and every row can be hit',
      viaGrp.open ? `${viaGrp.left}→${viaGrp.right} of ${viaGrp.vw}, shortest row ${viaGrp.shortest}px` : 'not measured');
  }

  /* And a tablet keeps the palette it had — that card exists because the
     toolbar folded, and the tab bar is still there to carry Calendar. */
  {
    const s = await openApp({ viewport: { width: 820, height: 1180 }, db: seedDB() });
    await s.page.evaluate(() => { DB.tabs = { a1: ['a2'] }; ST.tabOwner = 'a1';
      ST.folder = 'f1'; ST.article = 'a1'; window.render(); showPane('p3'); });
    await s.page.waitForTimeout(450);
    const m = await s.page.evaluate(() => {
      const bar = document.getElementById('tab-bar');
      _p3NtiPalette({ currentTarget: document.getElementById('p3h-nti-grp') });
      const p = document.getElementById('p3h-pal');
      return { barShown: getComputedStyle(bar).display !== 'none',
        oldStyle: !!p.querySelector('.p3h-pal-nti'),
        spread: !!p.querySelector('.eb-act') };
    });
    await s.close();
    r.check(m.barShown && m.oldStyle && !m.spread,
      'tablet: the tab bar and the old 🏷 palette are both untouched',
      `tab bar painted ${m.barShown} · palette is the kindBar card ${m.oldStyle} · spread-open ${m.spread}`);
  }

  /* 5a-iv. v04.31 — THE READ BAR'S THREE QUESTIONS ═══════════════════════
     The owner asked, of the phone's read view: 🏠 and 📁 do the same thing —
     is the folder icon still needed? what is "General" doing there? and what
     do the buttons at the bottom of the ⋯ card do? Three claims come out of
     the answers, and each is measured as a question rather than as a list. */
  {
    const s = await openApp({ viewport: { width: 390, height: 844 }, db: seedDB() });
    await s.page.evaluate(() => { ST.folder = 'f1'; ST.article = 'a1'; window.render(); showPane('p3'); });
    await s.page.waitForTimeout(450);
    /* (1) 🏠 and 📁 both end on showPane('sb'), so one of them goes — the same
       answer v04.23 gave the phone's EDIT bar, which is why the question came
       back: it was only ever applied to half the app. Asked by the FUNCTION,
       not the glyph: nothing visible on the read bar may call goHome(), and it
       must still be reachable from the card and from the sidebar logo. */
    const bar = await s.page.evaluate(() => {
      const el = document.getElementById('p3h');
      const on = [...el.querySelectorAll('button')].filter((b) => b.offsetParent);
      return { home: on.filter((b) => /goHome\(/.test(b.getAttribute('onclick') || '')).length,
        folders: on.filter((b) => /backFromP3\(/.test(b.getAttribute('onclick') || '')).length,
        logo: /goHome\(/.test(document.querySelector('.sb-logo')?.getAttribute('onclick') || ''),
        labels: on.map((b) => b.textContent.trim()).join(' ') };
    });
    await s.page.click('#p3h-act-grp');
    await s.page.waitForTimeout(300);
    const card = await s.page.evaluate(() => {
      const p = document.getElementById('p3h-pal');
      const rows = [...p.querySelectorAll('.p3h-pal-btn')].filter((b) => b.offsetParent);
      const fn = (b) => b.getAttribute('onclick') || '';
      return { open: !!p.classList.contains('open'),
        fns: rows.map(fn).join(' '),
        heads: [...p.querySelectorAll('.fl-pop-hd')].map((h) => h.textContent.trim()),
        /* A menu is read by someone who did not write it (v04.26): every row
           carries a word, and no row trails off into an unnamed menu. */
        wordless: rows.filter((b) => !/[A-Za-z]{3,}/.test(b.querySelector('.pal-lbl')?.textContent || '')).length,
        ellipsis: rows.filter((b) => /…\s*$/.test(b.textContent.trim())).length,
        shortest: Math.min(...rows.map((b) => Math.round(b.getBoundingClientRect().height))),
        widths: new Set(rows.map((b) => Math.round(b.getBoundingClientRect().width))).size,
        scrolls: p.scrollHeight > p.clientHeight + 1,
        /* 🗑 Delete stays one tap further in, where v04.11 deliberately put it. */
        deleteOut: rows.some((b) => /deleteNote\(/.test(fn(b))),
        rows: rows.map((b) => b.textContent.trim().replace(/\s+/g, ' ')) };
    });
    r.check(bar.home === 0 && bar.folders === 1 && bar.logo && /goHome\(/.test(card.fns),
      'phone read mode: 🏠 is off the bar (📁 keeps your place), and Home is still one tap away',
      `bar: ${bar.labels} · goHome on the bar ${bar.home}, in the ⋯ card ${/goHome\(/.test(card.fns)}, on the sidebar logo ${bar.logo}`);
    /* (3) The card's bottom row was `⋯ More — copy, archive, delete…`: a row
       whose only job was to open a twenty-item menu, which is what the owner
       was asking about. The four actions that menu is opened for are rows
       now, identified by the function each calls. */
    const spread = ['startRenameArtTitle(', 'duplicateNote(', 'openNoteHistory(', 'toggleArchive(']
      .filter((f) => card.fns.includes(f));
    r.check(card.open && spread.length === 4 && /showArtCtx\(/.test(card.fns) && !card.deleteOut
      && card.heads.length >= 3 && card.heads.every((h) => h.length > 2)
      && card.wordless === 0 && card.ellipsis === 0,
      'phone read mode: the ⋯ card spreads the four actions open under named headings, and names what is left',
      `${card.heads.join(' | ')} · spread ${spread.length}/4 · wordless rows ${card.wordless}`
      + ` · rows trailing off ${card.ellipsis} · Delete still behind the full menu ${!card.deleteOut}`);
    r.check(card.open && card.shortest >= 44 && card.widths >= 4 && !card.scrolls,
      'phone read mode: every ⋯ row is tappable, sized to its own words, and the card fits the screen',
      `shortest ${card.shortest}px · ${card.widths} distinct widths · scrolls ${card.scrolls} · ${card.rows.length} rows`);
    /* And the rows do the thing they name — one of them, all the way through. */
    const nBefore = await s.page.evaluate(() => DB.articles.length);
    await s.page.evaluate(() => [...document.querySelectorAll('#p3h-pal .p3h-pal-btn')]
      .find((b) => /Make a copy/.test(b.textContent)).click());
    await s.page.waitForTimeout(500);
    const nAfter = await s.page.evaluate(() => DB.articles.length);
    r.check(nAfter === nBefore + 1,
      'phone read mode: ⧉ Make a copy in that card really makes the copy',
      `${nBefore} → ${nAfter} notes`);
    await s.close();
  }

  /* (2) "What is General doing there?" — a value with nothing saying what it
     is the value OF. Asked as a sweep rather than as a check on one bar: any
     note-type value painted anywhere must have the word Type beside it, so
     the next surface that renders the chips cannot quietly drop it. A tablet
     is the size that paints them in all three places at once (the read bar,
     the 🏷 palette, and the edit row renderP3C keeps above 640px). */
  {
    const s = await openApp({ viewport: { width: 820, height: 1180 }, db: seedDB() });
    await s.page.evaluate(() => { ST.folder = 'f1'; ST.article = 'a1'; window.render(); showPane('p3'); });
    await s.page.waitForTimeout(450);
    const sweep = await s.page.evaluate(() => {
      const seen = [];
      const scan = (where) => {
        for (const v of document.querySelectorAll('.nti-chip, .nti-no-type')) {
          if (!v.offsetParent) continue;
          const grp = v.closest('.kind-bar, .p3h-nti-inline, .p3h-pal-nti');
          const lbl = grp && grp.querySelector('.nti-lbl');
          seen.push({ where, value: v.textContent.trim(),
            labelled: !!(lbl && lbl.offsetParent && /type/i.test(lbl.textContent)) });
        }
      };
      scan('read bar');
      _p3NtiPalette({ currentTarget: document.getElementById('p3h-nti-grp') });
      scan('🏷 palette');
      closeFloatPop('p3h-pal');
      startEdit();
      scan('edit row');
      return { seen, home: [...document.querySelectorAll('#p3h button')].filter((b) => b.offsetParent
        && /goHome\(/.test(b.getAttribute('onclick') || '')).length };
    });
    await s.close();
    const bare = sweep.seen.filter((x) => !x.labelled);
    r.check(sweep.seen.length >= 3 && bare.length === 0,
      'no note-type value is painted without the word that says what it is',
      `${sweep.seen.length} values swept (${[...new Set(sweep.seen.map((x) => x.where))].join(', ')})`
      + ` · unlabelled ${bare.length}${bare.length ? ': ' + bare.map((x) => x.where + ' “' + x.value + '”').join(', ') : ''}`);
    /* The round is the PHONE's: a tablet's row has the width for 🏠 and keeps it. */
    r.check(sweep.home >= 1, 'tablet: the read bar keeps its 🏠 — this round is the phone’s',
      `goHome buttons on the tablet read bar: ${sweep.home}`);
  }

  /* 5a-v. v04.32 — TWO SCREENSHOTS, TWO QUESTIONS ════════════════════════
     (1) "Easily database can be moved to up by removing 'attached' with
     'Folder' button." The four Attach rows flowed free, so the fourth was
     stranded on a line of its own with the rest of that line empty.
     Asked across the whole phone range rather than at one width, because the
     measurement is what made the answer bigger than the owner's suggestion:
     dropping the word saves 52px, three rows fit the first line from 410px
     of screen and the fourth needs 537px, so every common phone lands in the
     gap and strands MyDatabase exactly as the screenshot shows. The rows pair
     up now, so the question the check asks is the owner's: is any Attach row
     alone on its line? */
  {
    for (const w of [360, 390, 412, 430, 480, 600]) {
      const s = await openApp({ viewport: { width: w, height: 844 }, db: seedDB() });
      await s.page.evaluate(() => { ST.folder = 'f1'; ST.article = 'a1'; window.render(); showPane('p3'); });
      await s.page.waitForTimeout(400);
      const m = await s.page.evaluate(() => {
        /* Either way in — the toolbar folds the type group behind 🏷 only when
           it does not fit, so on a wider phone 📎 Attach is the real button. */
        const b = document.getElementById('p3h-nti-grp') || document.querySelector('#p3h .nti-attach-btn');
        if (!b || !b.offsetParent) return { reached: false };
        b.click();
        const p = document.getElementById('p3h-pal');
        if (!p || !p.classList.contains('open')) return { reached: false };
        /* The Attach four are the rows this group builds — identified by the
           FUNCTION each calls, so a relabel cannot fake the measurement. */
        const want = ['openNtiPicker\\(', 'openPicker\\(|editing to change', 'openJournalPicker\\(', 'openMyDatabasePicker\\('];
        const rows = [...p.querySelectorAll('.eb-act')].filter((x) => x.offsetParent)
          .filter((x) => want.some((f) => new RegExp(f).test(x.getAttribute('onclick') || '')));
        const lines = {};
        rows.forEach((x) => { const t = Math.round(x.getBoundingClientRect().top);
          (lines[t] = lines[t] || []).push(x.textContent.trim().replace(/\s+/g, ' ')); });
        const pr = p.getBoundingClientRect();
        return { reached: true, n: rows.length,
          per: Object.values(lines).map((v) => v.length),
          alone: Object.values(lines).filter((v) => v.length === 1).map((v) => v[0]),
          widths: new Set(rows.map((x) => Math.round(x.getBoundingClientRect().width))).size,
          over: rows.filter((x) => x.getBoundingClientRect().right > pr.right - 6).length,
          folder: rows.map((x) => x.textContent.trim().replace(/\s+/g, ' ')).find((t) => /Folder/.test(t)) || '' };
      });
      await s.close();
      r.check(m.reached && m.n === 4 && m.alone.length === 0 && m.over === 0 && m.widths >= 3,
        `phone ${w}px: no Attach row is stranded alone on its line, and each is sized to its words`,
        m.reached ? `rows per line ${JSON.stringify(m.per)} · alone: ${m.alone.join(', ') || 'none'}`
          + ` · ${m.widths} distinct widths · overflowing ${m.over}` : 'the Attach card could not be opened');
      /* And the word itself: the count stays, "attached" goes. */
      if (w === 390) {
        r.check(/Folder/.test(m.folder) && /\d/.test(m.folder) && !/attached/i.test(m.folder),
          'the 📁 Folder row shows the count without the word "attached"', `reads “${m.folder}”`);
      }
    }
    /* A tablet and a laptop never see the pairing: `.eb-pair` is
       display:contents there, and the card is 260px — a forced pair would
       ellipsis both of its buttons. */
    const s = await openApp({ viewport: { width: 1440, height: 900 }, db: seedDB() });
    const pair = await s.page.evaluate(() => {
      const a = DB.articles.find((x) => x.id === 'a1');
      const p = document.createElement('div'); p.className = 'fl-pop open';
      p.style.cssText = 'position:fixed;top:0;left:0;visibility:hidden';
      p.innerHTML = _ebAttachHTML(a, 'x'); document.body.appendChild(p);
      const d = getComputedStyle(p.querySelector('.eb-pair')).display;
      p.remove(); return d;
    });
    await s.close();
    r.check(pair === 'contents', 'laptop: the Attach rows are not paired — the narrow card is untouched',
      `.eb-pair display is ${pair}`);
  }

  /* (2) "Organise the hanging buttons more elegant way." The full ⋯ menu was
     twenty-one rows of 155px hanging in a 167px column. Opened the way the
     owner opens it — a REAL mouse click, looked at again 250ms later, which
     is the v04.12 rule and the check that catches a menu closed in the tick
     it opened. */
  {
    const s = await openApp({ viewport: { width: 390, height: 844 }, db: seedDB() });
    await s.page.evaluate(() => { ST.folder = 'f1'; ST.article = 'a1'; window.render(); showPane('p3'); });
    await s.page.waitForTimeout(450);
    await s.page.click('#p3h-act-grp');
    await s.page.waitForTimeout(300);
    const at = await s.page.evaluate(() => { const b = [...document.querySelectorAll('#p3h-pal .p3h-pal-btn')]
      .find((x) => /All actions/.test(x.textContent)).getBoundingClientRect();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
    await s.page.mouse.click(at.x, at.y);
    await s.page.waitForTimeout(250);
    const card = await s.page.evaluate(() => {
      const m = document.getElementById('ctx');
      const painted = getComputedStyle(m).display !== 'none';
      const rows = [...m.querySelectorAll('.ci')].filter((x) => x.offsetParent);
      const lines = {};
      rows.forEach((x) => { const t = Math.round(x.getBoundingClientRect().top);
        (lines[t] = lines[t] || []).push(x); });
      const groups = []; let cur = null;
      for (const el of m.children) {
        if (el.classList.contains('fl-pop-hd')) { cur = { head: el.textContent.trim(), n: 0 }; groups.push(cur); }
        else if (cur && el.classList.contains('ci')) cur.n++;
      }
      /* v04.26, inside one surface: no glyph may do two different jobs here. */
      const jobs = {};
      rows.forEach((x) => { const g = (x.textContent.trim().match(/^\S+/) || [''])[0];
        const fn = ((x.getAttribute('onclick') || '').match(/(\w+)\(/g) || []).join(',');
        (jobs[g] = jobs[g] || new Set()).add(fn); });
      const b = m.getBoundingClientRect();
      const w = rows.map((x) => Math.round(x.getBoundingClientRect().width));
      return { painted, card: m.classList.contains('ctx-card'), groups,
        rows: rows.length, lines: Object.keys(lines).length,
        seps: [...m.querySelectorAll('.csep')].filter((x) => x.offsetParent).length,
        shortest: Math.min(...rows.map((x) => Math.round(x.getBoundingClientRect().height))),
        widths: new Set(w).size, span: Math.max(...w) - Math.min(...w),
        left: Math.round(b.left), right: Math.round(b.right), top: Math.round(b.top),
        bottom: Math.round(b.bottom), vw: innerWidth, vh: innerHeight,
        scrolls: m.scrollHeight > m.clientHeight + 1,
        twoJobs: Object.entries(jobs).filter(([, v]) => v.size > 1).map(([k]) => k) };
    });
    /* The sub-panels are a different height, so each repaint is re-placed —
       a card left at the old top hangs off the bottom of the screen. */
    await s.page.evaluate(() => _ctxSub('a1', 'folders'));
    await s.page.waitForTimeout(200);
    const sub = await s.page.evaluate(() => { const m = document.getElementById('ctx');
      const b = m.getBoundingClientRect();
      return { top: Math.round(b.top), bottom: Math.round(b.bottom), vh: innerHeight,
        back: !!m.querySelector('.ci-back'), left: Math.round(b.left) }; });
    /* And #ctx is shared with four other menus, so closing it must hand the
       element back exactly as it was found. */
    const clean = await s.page.evaluate(() => { hideCtx(); const m = document.getElementById('ctx');
      return { cls: m.className, width: m.style.width }; });
    await s.close();

    r.check(card.painted && card.card,
      'phone: ⋯ All actions really opens the full menu — still painted 250ms after a real click',
      `painted ${card.painted} · card layout ${card.card} (v04.31 handed showArtCtx a fake event and`
      + ' the document closer shut it in the same tick)');
    const empty = card.groups.filter((g) => g.n === 0);
    r.check(card.groups.length >= 4 && empty.length === 0 && card.seps === 0,
      'phone: the full ⋯ menu is split into named groups, with no unnamed separator lines left',
      card.groups.map((g) => `${g.head} (${g.n})`).join(' · ') + ` · visible separators ${card.seps}`);
    /* 1.5, not 2. The first cut of this check demanded an average of exactly
       two rows a line and failed at 17 rows on 9 lines — which is a cluster,
       not a column, and would flip back and forth on any label change. The
       durable bar is the one a column can never clear whatever its labels
       say: a column is 1.0 rows a line by definition, so half again as dense
       is already proof of packing. */
    r.check(card.rows >= card.lines * 1.5 && card.widths >= 4 && card.span > 30,
      'phone: those rows pack into a cluster and each is sized to its own words',
      `${card.rows} rows on ${card.lines} lines · ${card.widths} distinct widths,`
      + ` ${card.span}px between the widest and the narrowest`);
    r.check(card.shortest >= 44 && card.left <= 8 && card.right >= card.vw - 8
      && card.top >= 0 && card.bottom <= card.vh && !card.scrolls,
      'phone: the full ⋯ menu runs edge to edge, fits the screen, and every row can be hit',
      `${card.left}→${card.right} of ${card.vw} · ${card.top}→${card.bottom} of ${card.vh}`
      + ` · shortest row ${card.shortest}px · scrolls ${card.scrolls}`);
    r.check(card.twoJobs.length === 0,
      'phone: in the full ⋯ menu no glyph does two different jobs',
      card.twoJobs.length ? `used for two things: ${card.twoJobs.join(', ')}` : 'every glyph is one job');
    r.check(sub.back && sub.top >= 0 && sub.bottom <= sub.vh && sub.left <= 8,
      'phone: a sub-panel of that menu is re-placed, not left hanging off the screen',
      `◀ Back ${sub.back} · ${sub.top}→${sub.bottom} of ${sub.vh}`);
    r.check(!/ctx-card/.test(clean.cls) && !clean.width,
      'closing the menu hands #ctx back clean for the four other menus that borrow it',
      `class “${clean.cls}” · inline width “${clean.width}”`);
  }

  /* And a tablet and a laptop keep the anchored column: there #ctx is a real
     right-click menu at a cursor, already as wide as its longest word. */
  for (const vp of [{ name: 'tablet', w: 820, h: 1180 }, { name: 'laptop', w: 1440, h: 900 }]) {
    const s = await openApp({ viewport: { width: vp.w, height: vp.h }, db: seedDB() });
    await s.page.evaluate(() => { ST.folder = 'f1'; ST.article = 'a1'; window.render(); });
    await s.page.waitForTimeout(400);
    const m = await s.page.evaluate(() => {
      showArtCtx({ clientX: 40, clientY: 40, preventDefault() {}, stopPropagation() {} }, 'a1');
      const m = document.getElementById('ctx');
      return { card: m.classList.contains('ctx-card'), heads: m.querySelectorAll('.fl-pop-hd').length,
        seps: m.querySelectorAll('.csep').length, rows: m.querySelectorAll('.ci').length,
        wide: Math.round(m.getBoundingClientRect().width) };
    });
    await s.close();
    r.check(!m.card && m.heads === 0 && m.seps >= 4 && m.rows >= 15 && m.wide <= 240,
      `${vp.name}: the right-click menu is the anchored column it has always been`,
      `card ${m.card} · ${m.rows} rows, ${m.seps} separators, ${m.wide}px wide`);
  }

  /* 5a-vi. v04.33 — THE SAME TWO BUTTONS, IN BOTH MODES, ON THE EDITOR ═════
     "Let the Multi and single button be present in the edit mode as well" and
     "Let the pop-up note opens in edit mode when click to pop-up".

     Measured on origin/main before anything was touched, BOTH buttons were
     already on the edit bar — so "is it rendered" is exactly the question
     that says yes about a control the owner cannot find, and it is not the
     question asked here. What differed was the treatment: read mode gave
     them 13px, opacity 1, gold and green, with their word; edit mode gave
     them opacity .55 in rgb(90,84,74) grey with no label. So the check
     compares the two MODES against each other rather than naming a colour —
     the day the palette changes, the comparison still holds and a hard-coded
     hex would have to be rewritten.

     And the fold is asked as an OUTCOME, at ten widths rather than one:
     the words may only be on the bar where they cost no extra line, and they
     must be on it everywhere they do. A single width cannot tell a measured
     fold from a fold that never folds (or one that always does). */
  {
    const modeCol = {};
    for (const w of [2200, 1920, 1600, 1440, 1366, 1280, 1200, 1100, 1000, 900]) {
      const s = await openApp({ viewport: { width: w, height: 900 }, db: seedDB() });
      const m = await s.page.evaluate(() => {
        ST.folder = 'f1'; ST.article = 'a1'; ST.editing = false; window.render(); showPane('p3');
        const look = (b) => ({ t: b.innerText.trim(), vis: !!b.offsetParent,
          color: getComputedStyle(b).color, op: getComputedStyle(b).opacity,
          kind: b.classList.contains('pop-multi') ? 'multi' : 'single' });
        const read = [...document.querySelectorAll('#p3h .pop-btn')].map(look);
        startEdit();
        /* Two frames: the first fold runs against a Pane 3 that has not
           settled yet, exactly as it does in the read bar. */
        return new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => {
          const el = document.getElementById('p3h');
          const tb = el.querySelector('.p3h-unified-tb');
          const nav = [...el.querySelectorAll('.p3h-nav-edit-row .nav-l,.p3h-nav-edit-row .nav-r')];
          const edit = [...el.querySelectorAll('#p3h .pop-btn')].map(look);
          /* What the app chose, then what each choice would actually cost —
             the row's own height and the strip's own overflow, read twice. */
          const chose = el.classList.contains('p3h-nolbl');
          const cost = () => [tb ? Math.round(tb.getBoundingClientRect().height) : 0,
            Math.max(0, ...nav.map((n) => n.scrollWidth - n.clientWidth))];
          el.classList.remove('p3h-nolbl');
          const [hWords, oWords] = cost();
          el.classList.add('p3h-nolbl');
          const [hBare, oBare] = cost();
          if (!chose) el.classList.remove('p3h-nolbl');
          res({ read, edit, chose, free: hWords <= hBare + 1 && oWords <= oBare + 1,
            over: chose ? oBare : oWords, hWords, hBare });
        })));
      });
      await s.close();
      const vis = m.edit.filter((b) => b.vis);
      const worded = vis.filter((b) => /\S/.test(b.t));
      if (w === 1440 || w === 1000) modeCol[w] = m;
      r.check(vis.length === 2 && (worded.length === 2) === m.free && m.over <= 1,
        `edit bar at ${w}px: both pop-up buttons are there, and wear their word wherever it costs no line`,
        `${vis.length} visible, ${worded.length} worded · the words are free here: ${m.free}`
        + ` (row ${m.hWords}px with them, ${m.hBare}px without) · overflow ${m.over}px`);
    }
    /* The comparison the round is actually about: edit mode must give these
       two buttons the SAME ink read mode gives them, and stop dimming them. */
    for (const w of [1440, 1000]) {
      const m = modeCol[w]; if (!m) continue;
      const same = ['multi', 'single'].map((k) => {
        const rd = m.read.find((b) => b.kind === k), ed = m.edit.find((b) => b.kind === k);
        return { k, rd: rd && rd.color, ed: ed && ed.color, op: ed && ed.op };
      });
      const ok = same.every((x) => x.rd && x.ed && x.rd === x.ed && x.op === '1')
        && same[0].ed !== same[1].ed;
      r.check(ok, `${w}px: edit mode paints Multi and Single exactly as read mode does`,
        same.map((x) => `${x.k} read ${x.rd} / edit ${x.ed} @${x.op}`).join(' · '));
    }
  }

  /* And the thing the buttons are FOR. A Multi Notes Pop-Up has always been
     an editor; a Single Note Pop-Up opened read-only, and opened read-only
     even when you were editing the note at the time — selArt() clears
     ST.editing unconditionally. Asked with a real mouse click on the real
     button (the v04.12 rule), and then asked the only question that matters
     for I1: does what you type in there survive closing it? */
  {
    const s = await openApp({ viewport: { width: 1440, height: 900 }, db: seedDB() });
    await s.page.evaluate(() => { ST.folder = 'f1'; ST.article = 'a1'; ST.editing = false; window.render(); startEdit(); });
    await s.page.waitForTimeout(400);
    const box = await s.page.locator('#p3h .pop-btn.pop-single').boundingBox();
    if (box) await s.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await s.page.waitForTimeout(250);
    const panel = await s.page.evaluate(() => ({
      modal: ST.noteModal, editing: ST.editing, aid: document.getElementById('ed')?.dataset.aid,
      shaped: document.getElementById('p3').classList.contains('modal-mode'),
      dimmed: !!document.getElementById('note-modal-bg')?.classList.contains('active'),
      grips: ['modal-resize-r', 'modal-resize-b', 'modal-resize-l', 'modal-corner-tr']
        .every((i) => !!document.getElementById(i)),
    }));
    r.check(!!box && panel.modal && panel.editing && panel.aid === 'a1' && panel.shaped && panel.dimmed && panel.grips,
      'a real click on the edit bar’s Single Note Pop-Up opens it ON the editor, still shaped as a panel',
      `modal ${panel.modal} · editing ${panel.editing} · #ed holds ${panel.aid}`
      + ` · modal-mode ${panel.shaped} · backdrop ${panel.dimmed} · grips ${panel.grips}`);
    /* I1 — typed into the pop-up, then closed. closeNoteModal() flushes #ed;
       if it ever stops doing so, this is where it shows. */
    await s.page.click('#ed');
    await s.page.keyboard.type(' PopupTypedHere');
    await s.page.waitForTimeout(120);
    await s.page.evaluate(() => closeNoteModal());
    await s.page.waitForTimeout(250);
    const kept = await s.page.evaluate(() => {
      const a = DB.articles.find((x) => x.id === 'a1');
      return { typed: a.content.includes('PopupTypedHere'), modal: ST.noteModal,
        shaped: document.getElementById('p3').classList.contains('modal-mode') };
    });
    r.check(kept.typed && !kept.modal && !kept.shaped,
      'words typed into the Single Note Pop-Up are in the note after it closes',
      `kept ${kept.typed} · modal closed ${!kept.modal} · pane un-shaped ${!kept.shaped}`);
    /* Multi: the same paradigm, and the caret already in it. */
    const multi = await s.page.evaluate(() => {
      closeAllPopouts(); ST.editing = false; window.render();
      openNotePopup('a1', 'float');
      const ed = document.querySelector('#fw-a1 .fw-ed');
      return { win: !!document.getElementById('fw-a1'), editable: !!ed && ed.isContentEditable,
        focused: document.activeElement === ed };
    });
    await s.close();
    r.check(multi.win && multi.editable && multi.focused,
      'the Multi Notes Pop-Up opens on the editor with the caret already in it',
      `window ${multi.win} · editable ${multi.editable} · focused ${multi.focused}`);
  }

  /* ONE EDITOR PER NOTE. F3 in index.html says the rule — "hand-over, never
     duplicate" — and enforced it only for the panel, so popping a note out of
     PANE 3's editor left #ed and .fw-ed both live on the same note, both on
     the debounced autosave. Measured on origin/main at v04.32 before this
     round began; this round adds two more routes into it, so it is fixed and
     fenced here. Typing first, because the question is not only "is there one
     editor" but "did the words make it across". */
  for (const route of ['float', 'panel-then-float']) {
    const s = await openApp({ viewport: { width: 1440, height: 900 }, db: seedDB() });
    await s.page.evaluate(() => { ST.folder = 'f1'; ST.article = 'a1'; ST.editing = false; window.render(); startEdit(); });
    await s.page.waitForTimeout(300);
    await s.page.click('#ed');
    await s.page.keyboard.type(' HandOverWords');
    await s.page.waitForTimeout(120);
    const m = await s.page.evaluate((r) => {
      if (r === 'panel-then-float') { openNotePopup('a1', 'panel'); _panelToFloat(); }
      else openNotePopup('a1', 'float');
      const ed = document.getElementById('ed');
      const fw = document.querySelector('#fw-a1 .fw-ed');
      const a = DB.articles.find((x) => x.id === 'a1');
      return { p3: !!(ed && ed.dataset.aid === 'a1' && ed.isContentEditable),
        fw: !!(fw && fw.isContentEditable), editing: ST.editing,
        inDb: a.content.includes('HandOverWords'), inFw: !!fw && fw.innerText.includes('HandOverWords') };
    }, route);
    await s.close();
    r.check(m.fw && !m.p3 && !m.editing && m.inDb && m.inFw,
      `popping a note out via ${route} hands the editor over — one live editor, and the words come with it`,
      `float editor ${m.fw} · pane-3 editor still live ${m.p3} · ST.editing ${m.editing}`
      + ` · typed words in DB ${m.inDb} · in the pop-up ${m.inFw}`);
  }

  /* ══ v04.34 — REVERSED, AND SAYING SO ════════════════════════════════════
     This pair used to assert the OPPOSITE: "neither mode offers a pop-up
     button, and the app refuses to open one", which was a true description
     of the app and a wrong description of what the owner wanted. They asked
     for the pop-ups on the phone and the tablet the round after v04.33
     reported that gap as deliberate — so the assertion is turned round in
     place, with the reason recorded, rather than deleted.

     What replaces it is not "is there a button" (a phone deliberately has
     none on its bar — v04.22 spent three rounds getting that bar to one row)
     but the question underneath it: **can the owner reach both pop-ups, and
     does the app really open one?** Reached however that platform reaches it,
     identified by the FUNCTION each control calls. */
  for (const vp of [{ name: 'tablet', w: 820, h: 1180 }, { name: 'phone', w: 390, h: 844 }]) {
    for (const mode of ['read', 'edit']) {
      const s = await openApp({ viewport: { width: vp.w, height: vp.h }, db: seedDB() });
      await s.page.evaluate((md) => { ST.folder = 'f1'; ST.article = 'a1'; ST.editing = false;
        window.render(); showPane('p3'); if (md === 'edit') startEdit(); }, mode);
      await s.page.waitForTimeout(400);
      const m = await s.page.evaluate(() => {
        /* On the bar, if this platform puts them there… */
        const fns = (els) => els.map((b) => (b.getAttribute('onclick') || ''))
          .map((o) => o.match(/openNotePopup\('[^']+','(\w+)'\)/)).filter(Boolean).map((x) => x[1]);
        let modes = fns([...document.querySelectorAll('#p3h .pop-btn')].filter((b) => b.getClientRects().length));
        let via = modes.length ? 'the bar' : '';
        /* …otherwise in the menu this platform folds them into. */
        if (!modes.length) {
          const opener = ST.editing
            ? document.querySelector('#p3h .eb-grp-btn[data-g="insert"]')
            : document.getElementById('p3h-act-grp');
          if (opener && opener.getClientRects().length) {
            if (ST.editing) opener.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            else opener.click();
            const pop = document.getElementById(ST.editing ? 'eb-pop' : 'p3h-pal');
            if (pop) {
              modes = fns([...pop.querySelectorAll('button')].filter((b) => b.getClientRects().length));
              via = ST.editing ? 'the + menu' : 'the ⋯ card';
            }
          }
        }
        return { modes: [...new Set(modes)], via };
      });
      /* And it really opens — both kinds, on this platform, in this mode. */
      const opened = await s.page.evaluate(() => {
        const out = {};
        openNotePopup('a1', 'float');
        const w = document.getElementById('fw-a1');
        out.float = !!(w && w.getClientRects().length && w.querySelector('.fw-ed')?.isContentEditable);
        closeAllPopouts();
        openNotePopup('a1', 'panel');
        out.panel = !!(ST.noteModal && document.getElementById('p3').classList.contains('modal-mode'));
        out.editing = ST.editing;
        closeAllPopouts();
        return out;
      });
      await s.close();
      r.check(m.modes.includes('float') && m.modes.includes('panel')
        && opened.float && opened.panel && opened.editing,
        `${vp.name} ${mode} mode: both pop-ups are reachable, and both really open on the editor`,
        `reached via ${m.via || 'nothing'} [${m.modes.join('/')}]`
        + ` · Multi opens editable ${opened.float} · Single opens ${opened.panel}, editing ${opened.editing}`);
    }
  }

  /* 5a-vii. v04.34 — THE POP-UPS ON EVERY PLATFORM ═══════════════════════
     "Now do same for the phone and tablet too. Always do all platforms as
     adaptible." Adaptible is the word that matters: a phone does not get a
     free-floating 320px window with a 22px drag bar, it gets the same editor
     as a card pinned to the screen. So the shape is asserted BOTH WAYS —
     sheet on a phone, real window on a tablet — because a rule that only
     says "it opens" passes a tablet that quietly became a phone, and one
     that only says "it is edge to edge" passes a laptop that did. That is
     the v04.28 lesson (assert the narrow case too) pointed at a shape. */
  {
    /* ── A phone: a sheet, with no affordance it cannot honour ── */
    for (const kind of ['float', 'panel']) {
      const s = await openApp({ viewport: { width: 390, height: 844 }, db: seedDB() });
      await s.page.evaluate(() => { ST.folder = 'f1'; ST.article = 'a1'; ST.editing = false;
        window.render(); showPane('p3'); });
      await s.page.waitForTimeout(350);
      await s.page.evaluate((k) => openNotePopup('a1', k), kind);
      /* #p3 carries `transition:left .25s` under 1200px, so a rect read in
         the same tick is the rect it is travelling THROUGH — measured at 390
         wide and reported left:390px, width:0, which looked exactly like a
         broken layout rule and was a measurement taken too early. */
      await s.page.waitForTimeout(500);
      const m = await s.page.evaluate((k) => {
        const el = k === 'float' ? document.getElementById('fw-a1') : document.getElementById('p3');
        const b = el.getBoundingClientRect();
        const grips = [...el.querySelectorAll('.modal-resize-r,.modal-resize-b,.modal-resize-l,.modal-corner,.fw-drag')]
          .filter((g) => g.getClientRects().length).length;
        const x = k === 'float' ? el.querySelector('.fw-close')
          : document.querySelector('#p3-sheet-hd .sh-x');
        const xb = x && x.getBoundingClientRect();
        const ed = k === 'float' ? el.querySelector('.fw-ed') : document.getElementById('ed');
        return { left: Math.round(b.left), top: Math.round(b.top), right: Math.round(b.right),
          bottom: Math.round(b.bottom), vw: innerWidth, vh: innerHeight, grips,
          editable: !!(ed && ed.isContentEditable),
          x: xb ? [Math.round(xb.width), Math.round(xb.height)] : null,
          xWords: x ? /\p{L}/u.test(x.textContent) : false };
      }, kind);
      await s.close();
      r.check(m.left <= 8 && m.top <= 8 && m.right >= m.vw - 8 && m.bottom <= m.vh
        && m.right <= m.vw && m.top >= 0 && m.grips === 0 && m.editable
        && m.x && Math.min(...m.x) >= 44,
        `phone: the ${kind === 'float' ? 'Multi' : 'Single'} pop-up is a sheet — edge to edge, nothing that pretends to drag, and a way out`,
        `${m.left}→${m.right} of ${m.vw} · ${m.top}→${m.bottom} of ${m.vh}`
        + ` · drag/resize affordances ${m.grips} · editable ${m.editable}`
        + ` · close ${m.x ? m.x.join('×') : 'MISSING'}${m.xWords ? ' with a word' : ''}`);
    }

    /* ── And the way out really works. Edge to edge, #note-modal-bg is a 6px
       frame, so the panel's own ✕ Close is the only honest exit — asked with
       a real mouse click and looked at again 250ms later (the v04.12 rule). */
    {
      const s = await openApp({ viewport: { width: 390, height: 844 }, db: seedDB() });
      await s.page.evaluate(() => { ST.folder = 'f1'; ST.article = 'a1'; ST.editing = false;
        window.render(); showPane('p3'); openNotePopup('a1', 'panel'); });
      await s.page.waitForTimeout(600);
      const box = await s.page.locator('#p3-sheet-hd .sh-x').boundingBox().catch(() => null);
      if (box) await s.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await s.page.waitForTimeout(400);
      const out = await s.page.evaluate(() => ({
        modal: ST.noteModal, shaped: document.getElementById('p3').classList.contains('modal-mode'),
        bg: !!document.getElementById('note-modal-bg')?.classList.contains('active'),
        hd: !!document.getElementById('p3-sheet-hd'),
        /* and the app is usable again, not left under a dead fixed layer */
        pane: (() => { const b = document.getElementById('p3').getBoundingClientRect();
          return [Math.round(b.width), Math.round(b.height)]; })() }));
      await s.close();
      r.check(!!box && !out.modal && !out.shaped && !out.bg && !out.hd && out.pane[0] > 300,
        'phone: a real tap on the Single sheet’s ✕ Close hands the whole app back',
        `clicked ${!!box} · modal ${out.modal} · modal-mode ${out.shaped} · backdrop ${out.bg}`
        + ` · sheet header left behind ${out.hd} · pane back to ${out.pane.join('×')}`);
    }

    /* ── Several at once, on a phone, means a way BACK to the ones underneath.
       Sheets stack edge to edge, so without the switcher "Multi Notes Pop-Up
       — several notes open at once" is a claim the phone cannot honour. */
    {
      const s = await openApp({ viewport: { width: 390, height: 844 }, db: seedDB() });
      await s.page.evaluate(() => { ST.folder = 'f1'; ST.article = 'a1'; ST.editing = false;
        window.render(); showPane('p3'); openNotePopup('a1', 'float'); openNotePopup('a2', 'float'); });
      await s.page.waitForTimeout(500);
      const before = await s.page.evaluate(() => {
        const bar = document.getElementById('fw-switch');
        const chips = bar ? [...bar.querySelectorAll('.fw-sw')] : [];
        const notes = chips.filter((c) => !c.classList.contains('fw-sw-x'));
        const bb = bar && bar.getBoundingClientRect();
        return { bar: !!(bar && bar.getClientRects().length), chipBar: !!document.getElementById('fw-closeall'),
          notes: notes.map((c) => c.textContent.trim()),
          words: notes.every((c) => /\p{L}/u.test(c.textContent)),
          hit: notes.length ? Math.min(...notes.map((c) => Math.round(c.getBoundingClientRect().height))) : 0,
          onScreen: !!bb && bb.bottom <= innerHeight + 1 && bb.left >= 0 && bb.right <= innerWidth + 1,
          /* the sheets get out of its way rather than hiding behind it */
          clears: Math.round(document.getElementById('fw-a1').getBoundingClientRect().bottom) <= Math.round(bb.top) + 1,
          front: _fwFocusedAid };
      });
      /* A real tap on the buried note's chip must bring it to the front. */
      const chip = await s.page.locator('#fw-switch .fw-sw:not(.fw-sw-x)').first().boundingBox();
      if (chip) await s.page.mouse.click(chip.x + chip.width / 2, chip.y + chip.height / 2);
      await s.page.waitForTimeout(350);
      const after = await s.page.evaluate(() => {
        const wins = [...document.querySelectorAll('.float-win')];
        const top = wins.reduce((a, b) => (+b.style.zIndex > +a.style.zIndex ? b : a));
        return { top: top.id.slice(3), n: wins.length, marked: document.querySelector('#fw-switch .fw-sw.on')?.textContent.trim() };
      });
      await s.close();
      r.check(before.bar && !before.chipBar && before.notes.length === 2 && before.words
        && before.hit >= 40 && before.onScreen && before.clears
        && after.top === 'a1' && after.n === 2,
        'phone: two pop-ups open give a switcher that really brings the buried one forward',
        `bar ${before.bar} (laptop chip present ${before.chipBar}) · chips ${JSON.stringify(before.notes)}`
        + ` · shortest ${before.hit}px · on screen ${before.onScreen} · sheets clear it ${before.clears}`
        + ` · was "${before.front}", tap brought "${after.top}" to the front, ${after.n} still open`);
    }

    /* ── A tablet keeps the real window. Asserted the other way round on
       purpose: if the sheet rules ever widen past 640px, a tablet silently
       loses drag, resize and the ability to see the app beside the note. */
    for (const kind of ['float', 'panel']) {
      const s = await openApp({ viewport: { width: 820, height: 1180 }, db: seedDB() });
      await s.page.evaluate(() => { ST.folder = 'f1'; ST.article = 'a1'; ST.editing = false;
        window.render(); showPane('p3'); });
      await s.page.waitForTimeout(350);
      await s.page.evaluate((k) => openNotePopup('a1', k), kind);
      await s.page.waitForTimeout(500);
      const m = await s.page.evaluate((k) => {
        const el = k === 'float' ? document.getElementById('fw-a1') : document.getElementById('p3');
        const b = el.getBoundingClientRect();
        const grips = [...el.querySelectorAll('.modal-resize-r,.modal-resize-b,.modal-resize-l,.modal-corner')]
          .filter((g) => g.getClientRects().length).length;
        /* Touch drag and resize have been wired since v03.NotePane.T4; what
           was never sized for a finger is the window's own header. */
        const hdr = k === 'float'
          ? [el.querySelector('.fw-close'), ...el.querySelectorAll('.fw-nav')].filter(Boolean)
            .map((x) => { const r = x.getBoundingClientRect(); return Math.min(Math.round(r.width), Math.round(r.height)); })
          : [];
        return { w: Math.round(b.width), h: Math.round(b.height), left: Math.round(b.left),
          top: Math.round(b.top), vw: innerWidth, vh: innerHeight, grips,
          sheetHd: !!document.getElementById('p3-sheet-hd'), hdr,
          switcher: !!document.getElementById('fw-switch') };
      }, kind);
      await s.close();
      const roomy = m.left >= 12 && m.w <= m.vw - 16;
      r.check(grips_ok(m) && roomy && !m.sheetHd && !m.switcher
        && (m.hdr.length === 0 || Math.min(...m.hdr) >= 34),
        `tablet: the ${kind === 'float' ? 'Multi' : 'Single'} pop-up is still a real window, and its header can be hit by a finger`,
        `${m.w}×${m.h} at ${m.left},${m.top} of ${m.vw}×${m.vh} · drag/resize handles ${m.grips}`
        + ` · phone sheet header ${m.sheetHd} · phone switcher ${m.switcher}`
        + ` · header targets ${m.hdr.length ? Math.min(...m.hdr) + 'px' : 'n/a'}`);
    }

    /* ── The two things that only became reachable because the gate went.
       Contents and Pinned Tabs are SIDE panels, and a 378px sheet has no
       side: measured before this was fixed, the sidepane took 184px of 378
       and the note wrote in a 180px column. Neither had ever been drawn
       under 900px, because no pop-up existed there to host them — the
       standing lesson about a surface no round has looked at. And the edit
       bar's ◀ / 📁 call showPane() on a layout sitting under a fixed z-5001
       panel, so they change something the owner cannot see. */
    for (const kind of ['float', 'panel']) {
      const s = await openApp({ viewport: { width: 390, height: 844 }, db: seedDB() });
      await s.page.evaluate(() => { const a = DB.articles.find((x) => x.id === 'a1');
        /* four headings, so Contents would certainly inject if it could */
        a.content = '<h1>One</h1><p>a</p><h2>Two</h2><p>b</p><h2>Three</h2><p>c</p><h3>Four</h3><p>d</p>';
        ST.folder = 'f1'; ST.article = 'a1'; ST.editing = false; window.render(); showPane('p3');
        if (!DB.theme) DB.theme = {}; DB.theme.pinTabIds = ['a2']; });
      await s.page.waitForTimeout(350);
      await s.page.evaluate((k) => openNotePopup('a1', k), kind);
      await s.page.waitForTimeout(600);
      const m = await s.page.evaluate((k) => {
        const el = k === 'float' ? document.getElementById('fw-a1') : document.getElementById('p3');
        const ed = k === 'float' ? el.querySelector('.fw-ed') : document.getElementById('ed');
        const nav = [...document.querySelectorAll('#p3.modal-mode .p3h-nav-edit-row .nav-l .btn')]
          .filter((b) => b.getClientRects().length)
          .map((b) => b.getAttribute('onclick') || '')
          .filter((o) => /openP2|backFromP3|goHome/.test(o));
        return { toc: !!document.getElementById('toc-panel'),
          pin: !!document.getElementById('pin-panel'),
          edW: Math.round(ed ? ed.getBoundingClientRect().width : 0),
          sheetW: Math.round(el.getBoundingClientRect().width),
          deadNav: nav.length };
      }, kind);
      await s.close();
      /* The editor must have essentially the whole sheet: a side panel eats
         about half, so 85% is a bar nothing can sneak under. */
      r.check(!m.toc && !m.pin && m.deadNav === 0 && m.edW >= m.sheetW * 0.85,
        `phone: the ${kind === 'float' ? 'Multi' : 'Single'} sheet is all note — no side panel, no pane button that cannot work`,
        `Contents panel ${m.toc} · Pinned Tabs panel ${m.pin} · pane-nav buttons ${m.deadNav}`
        + ` · editor ${m.edW}px of a ${m.sheetW}px sheet`);
    }

    /* ── A sheet's frame is the SCREEN's, not a choice. If it were written to
       the geometry store, the next device to pop the same note out would
       restore a 378×832 box measured on somebody's phone. */
    {
      const s = await openApp({ viewport: { width: 390, height: 844 }, db: seedDB() });
      await s.page.evaluate(() => { ST.folder = 'f1'; ST.article = 'a1'; ST.editing = false;
        window.render(); showPane('p3'); openNotePopup('a1', 'float'); });
      await s.page.waitForTimeout(500);
      await s.page.evaluate(() => { _fwSavePos('a1'); closeAllPopouts();
        openNotePopup('a1', 'panel'); });
      await s.page.waitForTimeout(500);
      await s.page.evaluate(() => closeNoteModal());
      await s.page.waitForTimeout(300);
      const geo = await s.page.evaluate(() => {
        let raw = null; try { raw = JSON.parse(localStorage.getItem('nb_popgeo_v1') || '{}'); } catch (e) {}
        return { float: (raw && raw.float && raw.float.a1) || null, panel: (raw && raw.panel) || null };
      });
      await s.close();
      r.check(!geo.float && !geo.panel,
        'phone: a sheet never writes a remembered frame for the laptop to restore',
        `float frame stored ${JSON.stringify(geo.float)} · panel frame stored ${JSON.stringify(geo.panel)}`);
    }
  }

  /* 5b. v04.23 — the owner asked where the collapse/expand ⋯ had gone while
     looking straight at it: a bare glyph beside a grey date pill reads as
     punctuation. It wears the versioning bar's pill now, it has to OPEN on a
     real click (the v04.12 rule), and the same three actions are under H too,
     which is the button that says headings. */
  {
    const s = await editAt(390, 844);
    const box = await s.page.locator('#ed-col-btn').boundingBox();
    await s.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await s.page.waitForTimeout(300);
    const pop = await s.page.evaluate(() => {
      const p = document.getElementById('edcol-pop');
      const b = document.getElementById('ed-col-btn');
      const st = getComputedStyle(b); const q = b.getBoundingClientRect();
      return { open: !!(p && p.classList.contains('open')),
        text: p ? (p.innerText || '').replace(/\s+/g, ' ').trim() : '',
        framed: st.borderStyle !== 'none' && st.borderTopWidth !== '0px',
        w: Math.round(q.width), h: Math.round(q.height) };
    });
    r.check(pop.open && /Collapse all/.test(pop.text) && /Expand all/.test(pop.text)
      && /Preview/.test(pop.text) && pop.framed && pop.h >= 34,
      'phone: the ⋯ on the versioning bar looks like a button and opens all three section tools',
      `${pop.w}×${pop.h}, framed ${pop.framed}, opens "${pop.text || 'NOTHING'}"`);
    await s.page.evaluate(() => closeFloatPop('edcol-pop'));
    await s.page.waitForTimeout(120);
    await s.page.click('.eb-grp-btn[data-g="heads"]');
    await s.page.waitForTimeout(250);
    const heads = await s.page.evaluate(() => {
      const p = document.getElementById('eb-pop');
      return { open: !!(p && p.classList.contains('open')),
        fns: [...p.querySelectorAll('button')].map((b) => b.getAttribute('onclick') || '').join(' '),
        text: (p.innerText || '').replace(/\s+/g, ' ').trim() };
    });
    await s.close();
    r.check(heads.open && /_edColAll\(true\)/.test(heads.fns) && /_edColAll\(false\)/.test(heads.fns)
      && /_edColPreview\(\)/.test(heads.fns),
      'phone: the H group carries the same Collapse / Expand / Preview, by the same functions',
      heads.open ? heads.text.slice(0, 110) : 'the H menu did not open');
  }

  /* 5c. v04.26 — the owner asked two things: organise these menus, and "how
     about there is two 3 line horizontal button, does it make sense?" It did
     not: ≡ was Open-folders in the nav pair AND Lists in the format pair, two
     jobs one glyph, side by side on the same 390px row. The folders button is
     📁 now. This check does not name those two — it sweeps, so it catches the
     NEXT collision as well: every visible glyph-only control in the edit
     chrome, mapped to the function it calls. */
  {
    const s = await editAt(390, 844);
    const clash = await s.page.evaluate(() => {
      const byGlyph = {};
      const sel = '.p3h-nav-edit-row button, .p3c-titlebar button,'
        + ' .p3-meta-row button, .p3h-tag-bar button';
      for (const b of document.querySelectorAll(sel)) {
        if (!b.offsetParent) continue;
        const g = (b.textContent || '').trim();
        if (!g || [...g].length > 2) continue;          /* a word is not a glyph */
        const h = b.getAttribute('onclick') || b.getAttribute('onmousedown') || '';
        const fn = (h.match(/([A-Za-z_$][\w$]*)\s*\(/) || [])[1] || h;
        (byGlyph[g] = byGlyph[g] || new Set()).add(fn);
      }
      return Object.entries(byGlyph).filter(([, v]) => v.size > 1)
        .map(([k, v]) => `${k} → ${[...v].join(' and ')}`);
    });
    await s.close();
    r.check(clash.length === 0,
      'phone: no two controls in the edit chrome wear the same glyph for different jobs',
      clash.length ? `same glyph, different job: ${clash.join(' · ')}` : 'every glyph does one job');
  }

  /* 5d. v04.26 — the `+` menu, organised. Three groups that split by WHAT THE
     ACTION DOES (put something in the note / say what the note is / leave the
     note), every group under a heading, and — the v04.23 lesson — every button
     carrying a WORD, because a bare 🔖 means nothing to someone who did not
     write it. */
  {
    /* Tabs SEEDED, because the `Open tabs` group exists only when there are
       tabs — the exact trap v04.24 was reported for, and this check fell into
       it on its first run, reporting three groups where the fourth simply was
       not there to be counted. */
    const s = await openApp({ viewport: { width: 390, height: 844 }, db: seedDB() });
    await s.page.evaluate(() => { DB.tabs = { a1: ['a2', 'a3'] }; ST.tabOwner = 'a1';
      ST.folder = 'f1'; ST.article = 'a1'; window.render(); showPane('p3'); window.startEdit(); });
    await s.page.waitForTimeout(450);
    await s.page.click('.eb-grp-btn[data-g="insert"]');
    await s.page.waitForTimeout(300);
    const m = await s.page.evaluate(() => {
      const pop = document.getElementById('eb-pop');
      const groups = []; let cur = null;
      for (const el of pop.children) {
        if (el.classList.contains('fl-pop-hd')) { cur = { head: el.textContent.trim(), n: 0, bare: [] }; groups.push(cur); }
        else if (cur && el.tagName === 'BUTTON' && !el.classList.contains('fl-pop-x')) {
          cur.n++;
          const words = (el.textContent || '').replace(/[^\p{L}\p{N}]/gu, '');
          if (words.length < 3) cur.bare.push((el.textContent || el.title || '?').trim());
        } else if (cur && el.querySelectorAll) {
          const inner = [...el.querySelectorAll('button')].filter((b) => b.offsetParent);
          cur.n += inner.length;
        }
      }
      const first = pop.firstElementChild;
      /* v04.29 — measured HERE, inside the one evaluate this block runs,
         because the page is closed before the checks below are scored. A
         second evaluate after s.close() threw "Target page has been closed"
         on its first run — the checks are read in order, the browser is not
         still there in order. */
      const acts = [...pop.querySelectorAll('.eb-act')].filter((b) => b.offsetParent)
        .map((b) => ({ t: (b.textContent || '').trim(), w: Math.round(b.getBoundingClientRect().width) }));
      const byLen = [...acts].sort((a, b) => a.t.length - b.t.length);
      return { groups, wide: Math.round(pop.getBoundingClientRect().width),
        tagFirst: !!(first && first.classList.contains('eb-tagrow')),
        tagInput: !!pop.querySelector('.eb-tagrow #tag-inp'),
        firstWas: first ? (first.className || first.tagName) : 'nothing',
        fit: acts.length < 4 ? null : { shortest: byLen[0], longest: byLen[byLen.length - 1],
          widths: new Set(acts.map((b) => b.w)).size, n: acts.length,
          tall: Math.round(pop.getBoundingClientRect().height), vh: innerHeight,
          top: Math.round(pop.getBoundingClientRect().top),
          bottom: Math.round(pop.getBoundingClientRect().bottom),
          scrolls: pop.scrollHeight > pop.clientHeight + 1 } };
    });
    await s.close();
    const empty = m.groups.filter((g) => g.n === 0);
    /* UPDATED for v04.34: four groups became five. "Pop it out" is the phone's
       only way to the two pop-ups while editing — the bar has no width for
       them and v04.22 spent three rounds getting it to one row. The number is
       asserted rather than left open so that a group going MISSING still
       fails; it moved because this round moved it, and that is written here. */
    r.check(m.groups.length === 5 && empty.length === 0,
      'phone: the `+` menu is split into named groups and every group has items',
      empty.length ? `empty heading(s): ${empty.map((g) => g.head).join(', ')}`
        : m.groups.map((g) => `${g.head} (${g.n})`).join(' · '));
    /* "Insert at the cursor" and "Go to" are the two this round wrote; the
       type row and the tab rows carry their own names already. */
    const bare = m.groups.filter((g) => /insert|go to/i.test(g.head)).flatMap((g) => g.bare);
    r.check(bare.length === 0,
      'phone: every action in the `+` menu is a word, not a bare glyph',
      bare.length ? `unlabelled: ${bare.join(', ')}` : 'all labelled');
    /* v04.28 — "place the 'add tag' above all the buttons". Above ALL of them,
       so it is the FIRST child of the menu, ahead of the first heading. */
    r.check(m.tagFirst && m.tagInput,
      'phone: the tag box is the first thing in the `+` menu, above every heading',
      m.tagFirst ? `.eb-tagrow first, with an input ${m.tagInput}`
        : `first child is ${m.firstWas}`);
    /* v04.29 — "place them closely but organisely instead of spreading all
       over the screen". The failure mode is a fixed column: every action
       stretched to the same width with its label at the left and a lot of
       nothing beside it. So the question is not "is it narrow" but "does the
       width follow the WORDS" — which is false of a stretched grid by
       definition, whatever width the grid happens to use. */
    const fit = m.fit;
    r.check(fit && fit.longest.w > fit.shortest.w && fit.widths >= 4,
      'phone: the `+` menu actions are sized to their words, not stretched to a column',
      fit ? `"${fit.shortest.t}" ${fit.shortest.w}px vs "${fit.longest.t}" ${fit.longest.w}px`
        + ` · ${fit.widths} distinct widths across ${fit.n} actions`
        : 'too few actions to measure');
    /* And the point of packing them: the whole menu fits the screen.
       UPDATED for v04.34. This read `tall < vh * 0.72`, a ratio written when
       the menu had four groups — so adding a fifth failed it at 74%, while
       the menu still fitted the screen whole with 215px to spare. That is the
       pixel-budget trap the v04.29 lesson names: the budget rots on the next
       change, and it was never the question anyway. The question is the one
       in the label — is the WHOLE menu on the screen, and does it scroll —
       so it is asked of the real top and bottom now, which stays true however
       many groups the menu comes to have. */
    r.check(fit && !fit.scrolls && fit.top >= 0 && fit.bottom <= fit.vh,
      'phone: the whole `+` menu fits on the screen without scrolling',
      fit ? `${fit.top}→${fit.bottom} of ${fit.vh}px (${fit.tall}px tall,`
        + ` ${Math.round(fit.tall / fit.vh * 100)}%), scrolls ${fit.scrolls}` : 'not measured');
  }

  /* 6. Geometry — the round's own bug report. A real mouse click on the real
     button, looked at again 250ms later (the v04.12 rule), then asked the
     question the owner asked: is it under the button, or at the bottom of the
     screen? Under 1200px it used to be pinned `bottom:60px`, half a page from
     the finger that opened it. */
  for (const vp of VIEWPORTS) {
    const s = await editAt(vp.width, vp.height);
    const groups = await s.page.evaluate(() =>
      [...document.querySelectorAll('.eb-grp-btn')].map((b) => b.dataset.g));
    const out = [];
    for (const g of groups) {
      const box = await s.page.locator(`.eb-grp-btn[data-g="${g}"]`).boundingBox();
      await s.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await s.page.waitForTimeout(250);
      out.push(await s.page.evaluate((g) => {
        const p = document.getElementById('eb-pop');
        const b = document.querySelector(`.eb-grp-btn[data-g="${g}"]`).getBoundingClientRect();
        if (!p || !p.classList.contains('open')) return { g, open: false };
        const q = p.getBoundingClientRect();
        const its = [...p.querySelectorAll('button')].filter((x) => x.offsetParent)
          .map((x) => Math.round(x.getBoundingClientRect().height));
        return { g, open: true,
          left: Math.round(q.left), right: Math.round(q.right),
          top: Math.round(q.top), bottom: Math.round(q.bottom),
          btnBottom: Math.round(b.bottom), btnTop: Math.round(b.top), btnLeft: Math.round(b.left),
          vw: innerWidth, vh: innerHeight,
          scrolls: p.scrollHeight > p.clientHeight + 1,
          shortest: its.length ? Math.min(...its) : 0, n: its.length };
      }, g));
      await s.page.evaluate(() => { if (ST.ebGroup) togEBGroup(ST.ebGroup); });
      await s.page.waitForTimeout(120);
    }
    await s.close();
    const shut = out.filter((o) => !o.open);
    r.check(shut.length === 0, `${vp.name}: a real click on each edit-bar group leaves its menu open`,
      shut.length ? `closed itself in the same tick: ${shut.map((o) => o.g).join(', ')}`
        : `${out.length} menus, all still painted 250ms later`);
    const live = out.filter((o) => o.open);
    /* Under the button (within a hair of it) or, when there is genuinely more
       room above, directly over it. Never floating somewhere else. */
    const adrift = live.filter((o) => !((o.top >= o.btnBottom - 1 && o.top <= o.btnBottom + 14)
      || (o.bottom <= o.btnTop + 1 && o.bottom >= o.btnTop - 14)));
    r.check(adrift.length === 0, `${vp.name}: every edit-bar menu opens against its own button`,
      adrift.length ? adrift.map((o) => `${o.g}: menu ${o.top}→${o.bottom}, button ${o.btnTop}→${o.btnBottom}`).join(' · ')
        : live.map((o) => `${o.g} at y${o.top} (button ends ${o.btnBottom})`).join(' · '));
    /* v04.28 — on a phone the card runs edge to edge. At min(260px,92vw) it
       was a 260px column on a 390px screen with a strip of note beside it and
       every label squeezed into half of that. A tablet and a laptop keep the
       narrow anchored card, so this is asserted BOTH ways — a rule that only
       ever says "wider is fine" would pass a phone card that never widened. */
    const gutter = live.filter((o) => o.left > 8 || o.right < o.vw - 8);
    if (vp.width < 640) {
      r.check(gutter.length === 0, `${vp.name}: every edit-bar menu runs edge to edge`,
        gutter.length ? gutter.map((o) => `${o.g}: ${o.left}→${o.right} of ${o.vw}`).join(' · ')
          : live.map((o) => `${o.g} ${o.left}→${o.right} of ${o.vw}`).join(' · '));
    } else {
      const stretched = live.filter((o) => o.right - o.left > 300);
      r.check(stretched.length === 0, `${vp.name}: the edit-bar menus stay narrow and anchored`,
        stretched.length ? stretched.map((o) => `${o.g} is ${o.right - o.left}px wide`).join(' · ')
          : live.map((o) => `${o.g} ${o.right - o.left}px at x${o.left}`).join(' · '));
    }
    const off = live.filter((o) => o.left < 0 || o.right > o.vw || o.top < 0 || o.bottom > o.vh);
    r.check(off.length === 0, `${vp.name}: every edit-bar menu is wholly on the screen`,
      off.length ? off.map((o) => `${o.g}: ${o.left}→${o.right} of ${o.vw}, ${o.top}→${o.bottom} of ${o.vh}`).join(' · ')
        : live.map((o) => `${o.g} ${o.left}→${o.right} of ${o.vw}`).join(' · '));
    if (vp.width < 640) {
      const small = live.filter((o) => o.shortest < 44);
      r.check(small.length === 0, `${vp.name}: every row inside an edit-bar menu can be hit`,
        small.length ? small.map((o) => `${o.g}: shortest ${o.shortest}px`).join(' · ')
          : live.map((o) => `${o.g} ${o.n} buttons, shortest ${o.shortest}px`).join(' · '));
    }
  }

  /* 7. And the new words have to READ: the Save label on --green (the pair
     that has always been right is .bp's, never --accent as a background —
     v04.20 paid for that), and the group headings inside the menus. */
  for (const preset of ['forest', 'ocean', 'amber', 'indigo', 'rose']) {
    const db = seedDB(); db.theme = { preset, custom: {} };
    const s = await openApp({ viewport: { width: 390, height: 844 }, db });
    await s.page.evaluate(() => { ST.folder = 'f1'; ST.article = 'a1'; window.render(); showPane('p3');
      window.startEdit(); });
    await s.page.waitForTimeout(350);
    await s.page.click('.eb-grp-btn[data-g="insert"]');
    await s.page.waitForTimeout(250);
    const inks = await s.page.evaluate(() => {
      const stackOf = (el) => { const st = [];
        for (let n = el; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor;
          if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') st.push(c);
          if (/^rgb\(/.test(c)) break; } return st; };
      const out = [];
      for (const el of document.querySelectorAll('.et-save, #eb-pop .fl-pop-hd, #eb-pop button,'
        + ' #eb-pop .eb-act-l, #eb-pop .eb-tab-row, .p3-meta-row .dl-flip')) {
        if (!el.offsetParent) continue;
        const words = [...el.childNodes].filter((n) => n.nodeType === 3)
          .map((n) => n.textContent).join('').replace(/[^\p{L}\p{N}]/gu, '');
        if (!words) continue;                /* emoji-only says nothing about colour */
        out.push({ what: el.textContent.trim().slice(0, 24), color: getComputedStyle(el).color, stack: stackOf(el) });
      }
      return out;
    });
    await s.close();
    const scored = inks.map((x) => { const bg = flatten(x.stack);
      return { ...x, c: ratio(over(px(x.color), bg), bg) }; });
    const low = scored.filter((x) => x.c < 4.5);
    r.check(scored.length > 6 && low.length === 0,
      `every new word on the phone's edit bar reads on ${preset}`,
      low.length ? low.map((x) => `${x.c.toFixed(1)}:1 "${x.what}"`).join(' · ')
        : `${scored.length} labels, worst ${Math.min(...scored.map((x) => x.c)).toFixed(1)}:1`);
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
