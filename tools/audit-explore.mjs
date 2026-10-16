#!/usr/bin/env node
/* tools/audit-explore.mjs — v05.28, A1: the audit crawler. Not a check: it opens each surface by REAL clicks at 390/820/1440 and reports
   overflow, off-screen controls, small phone tap targets and low-contrast text. Findings become block 88 (tools/audit-a1.mjs).
   Usage: node tools/audit-explore.mjs [--vp=390] [--only=name,name] */
import { playwright, serve, seedDB } from './harness.mjs';
import { mkdirSync } from 'node:fs';

const argv = process.argv.slice(2);
const vpArg = argv.find((a) => a.startsWith('--vp='))?.slice(5);
const onlyArg = argv.find((a) => a.startsWith('--only='))?.slice(7).split(',');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }].filter((v) => !vpArg || v.name === vpArg);
const OUT = '/tmp/audit-a1'; mkdirSync(OUT, { recursive: true });

const pw = await playwright(); const srv = await serve(); const browser = await pw.chromium.launch();

/* measurement run inside the page, over the visible part of the top-most overlay (or the whole page) */
const MEASURE = () => {
  const vw = innerWidth, vh = innerHeight, out = { over: [], off: [], small: [], contrast: [], pageOverflow: document.documentElement.scrollWidth > vw + 1 };
  const vis = (e) => { const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return false; for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const c = getComputedStyle(p); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) return false; } return true; };
  const desc = (e) => (e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + ' "' + (e.innerText || e.title || '').trim().replace(/\s+/g, ' ').slice(0, 28) + '"');
  const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return [0, 0, 0, 0]; const p = m[1].split(',').map(parseFloat); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
  const bgOf = (e) => { let layers = []; for (let p = e; p; p = p.parentElement) { const c = parse(getComputedStyle(p).backgroundColor); if (c[3] > 0) { layers.push(c); if (c[3] >= 1) break; } } let base = [255, 255, 255]; for (let i = layers.length - 1; i >= 0; i--) { const c = layers[i], a = c[3]; base = [c[0] * a + base[0] * (1 - a), c[1] * a + base[1] * (1 - a), c[2] * a + base[2] * (1 - a)]; } return base; };
  /* the scope: highest-z fixed overlay that is visible, else document */
  const all = [...document.querySelectorAll('body *')];
  const inScroll = (e) => { for (let p = e.parentElement; p && p !== document.documentElement; p = p.parentElement) { const c = getComputedStyle(p); if (/(auto|scroll)/.test(c.overflowX) && p.scrollWidth > p.clientWidth) return true; } return false; };
  const scoped = (e) => !window.__scope || window.__scope.contains(e);
  for (const e of all) {
    if (!scoped(e) || !vis(e)) continue;
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (own || /^(BUTTON|INPUT|SELECT|TEXTAREA)$/.test(e.tagName)) {
      if (((r.right > vw + 1 && r.left < vw - 4) || (r.left < -1 && r.right > 4)) && !inScroll(e)) out.off.push(desc(e) + ` L${Math.round(r.left)} R${Math.round(r.right)}`);
    }
    if (e.scrollWidth > e.clientWidth + 2 && /^(hidden|clip)$/.test(cs.overflowX) && e.clientWidth > 0 && own) out.over.push(desc(e) + ` sw${e.scrollWidth}>cw${e.clientWidth}`);
    const clickable = e.matches('button,a[href],select,input:not([type=hidden]),[onclick],[role=button]') && !e.closest('[contenteditable=true]');
    if (clickable && vw < 640 && (r.height < 32 || r.width < 32) && r.height > 0 && !e.closest('.ed,.fw-ed,#ed')) { /* a tap target is the element or its parent row */ out.small.push(desc(e) + ` ${Math.round(r.width)}x${Math.round(r.height)}`); }
    if (own && cs.fontSize) {
      const fg = parse(cs.color); const bg = bgOf(e); const a = fg[3];
      const f = [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a)];
      const L1 = lum(f), L2 = lum(bg), cr = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
      const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700);
      if (cr < (big ? 3 : 4.5) && !e.disabled && !e.closest('[disabled],.disabled')) out.contrast.push(desc(e) + ` ${cr.toFixed(2)}`);
    }
  }
  for (const k of ['over', 'off', 'small', 'contrast']) out[k] = [...new Set(out[k])].slice(0, 25);
  return out;
};

const click = async (page, sel, opt = {}) => { const l = page.locator(sel).first(); await l.waitFor({ state: 'visible', timeout: 4000 }); await (page.viewportSize().width < 1000 ? l.tap(opt) : l.click(opt)); await sleep(500); };
const clickText = async (page, text, scope = 'body') => { const l = page.locator(scope).locator(`text=${text}`).first(); await l.waitFor({ state: 'visible', timeout: 4000 }); await (page.viewportSize().width < 1000 ? l.tap() : l.click()); await sleep(500); };
const toolsItem = async (page, label) => { await click(page, '#sb-tools-btn'); await clickText(page, label, '#sb-tools'); };
const menuItem = async (page, label) => { await click(page, '#sb-menu-btn'); await clickText(page, label, '#sb-menu'); };
const esc = async (page) => { await page.keyboard.press('Escape'); await sleep(250); await page.evaluate(() => { try { document.querySelectorAll('.modal-bg.open,.modal-overlay.open').forEach((m) => m.classList.remove('open')); } catch {} }); };

const SURF = {
  home: async () => {},
  tools: async (p) => { await click(p, '#sb-tools-btn'); },
  settingsMenu: async (p) => { await click(p, '#sb-menu-btn'); },
  appearance: (p) => toolsItem(p, 'Appearance'),
  enex: (p) => toolsItem(p, 'Evernote'),
  remmail: (p) => toolsItem(p, 'Reminder emails'),
  calcountry: (p) => toolsItem(p, 'Calendar Country'),
  cite: (p) => toolsItem(p, 'Insert Reference'),
  trash: (p) => toolsItem(p, 'Trash'),
  sync: (p) => menuItem(p, 'Cloud Sync'),
  backup: (p) => menuItem(p, 'Storage & Backup'),
  autobackup: (p) => menuItem(p, 'Automatic Backups'),
  newSection: (p) => toolsItem(p, 'New Section'),
  note: async (p) => { await p.evaluate(() => selArt(DB.articles.find((a) => !a.deleted).id)); await sleep(500); },
  edit: async (p) => { await p.evaluate(() => { selArt(DB.articles.find((a) => !a.deleted).id); startEdit(); }); await sleep(900); },
  smartviews: async (p) => { for (const id of ['sf-favs', 'sf-pinned', 'sf-timeline', 'sf-archived', 'sf-review', 'sf-practice']) { try { await p.evaluate((i) => selFolder(i), id); } catch {} await sleep(300); } },
  zabBar: async (p) => { await p.evaluate(() => { const b = document.getElementById('jeb-bar'); if (b) b.scrollIntoView(); }); },
  zabPanel: async (p) => { const c = p.locator('#jeb-bar .jeb-chip[data-pid] .jeb-main, #zab-btn').first(); await c.waitFor({ state: 'visible', timeout: 4000 }); await (p.viewportSize().width < 1000 ? c.tap() : c.click()); await sleep(600); },
  calendar: async (p) => { await p.evaluate(() => { try { openCalendar(); } catch (e) { } }); await sleep(600); },
};

const results = []; const base = {};
for (const vp of VPS) {
  const ctx = await browser.newContext(vp.touch ? { viewport: { width: vp.w, height: vp.h }, hasTouch: true, isMobile: true } : { viewport: { width: vp.w, height: vp.h } });
  for (const pat of ['**googleapis.com/**', '**gstatic.com/**', '**firebaseapp.com/**', '**firebaseio.com/**']) await ctx.route(pat, (r) => r.abort());
  const db = seedDB(new Date().toISOString());
  await ctx.addInitScript((d) => { try { if (!localStorage.getItem('my-notebook-v1')) localStorage.setItem('my-notebook-v1', JSON.stringify(d)); } catch {} }, db);
  for (const [name, fn] of Object.entries(SURF)) {
    if (onlyArg && !onlyArg.includes(name)) continue;
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e));
    await page.goto(srv.base + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree'));
    await sleep(700);
    let err = null;
    try { await fn(page); } catch (e) { err = String(e).split('\n')[0]; }
    const m = await page.evaluate(MEASURE);
    await page.screenshot({ path: `${OUT}/${name}-${vp.name}.png` });
    results.push({ vp: vp.name, name, err, errors, ...m });
    console.log(`\n== ${name} @${vp.name}${err ? '  OPEN-FAILED: ' + err : ''}${errors.length ? '  ERRORS: ' + errors.join(' | ') : ''}${m.pageOverflow ? '  PAGE-OVERFLOW' : ''}`);
    if (name === 'home') base[vp.name] = m;
    for (const k of ['off', 'over', 'small', 'contrast']) { const b = new Set((base[vp.name] || { [k]: [] })[k]); const rows = name === 'home' ? m[k] : m[k].filter((x) => !b.has(x.replace(/ [0-9.]+$/, '')) && !b.has(x)); if (rows.length) console.log(`  ${k}:\n    ` + rows.join('\n    ')); }
    await page.close();
  }
  await ctx.close();
}
await browser.close(); srv.close?.();
process.exit(0);
