#!/usr/bin/env node
/* tools/arrows-v1.mjs — v05.07, V1: the sidebar's fold arrows are readable (checks 68a–68c).

   NAME NOTHING, SWEEP EVERYTHING: an "arrow" is found by what it SAYS — any element in #sb whose own text is only
   one of the arrow glyphs ▸ ▾ ▶ ▼ › ⌄ — never by class name. Each is asserted to be at least 14 px high on screen and
   to clear 4.5:1 against its real background (every translucent layer from the element outward is composited).

   68a  the sweep — 390 (touch) / 820 (touch) / 1440, the five presets plus one custom sidebar colour, with the
        sections and folders expanded and then collapsed (nested folders seeded)
   68b  a real tap / click on a section arrow still closes and re-opens its section
   68c  no row is clipped and nothing overflows horizontally

   `--only=68a` runs one. Each printed ok/FAIL line becomes one app-check check (block 68). */
import { playwright, serve, seedDB, BLOCKED } from './harness.mjs';
import { sleep, check, results } from './s1-fake.mjs';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);

const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];
const THEMES = [['forest', null], ['ocean', null], ['amber', null], ['indigo', null], ['rose', null], ['forest', '#0B7A6B']];
const T0 = '2026-10-01T00:00:00.000Z';
const GLYPHS = '▸▾▶▼›⌄';

const px = (c) => { const m = String(c).match(/[\d.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 }; };
const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
const flatten = (stack) => { let bg = px('rgb(255,255,255)'); for (let i = stack.length - 1; i >= 0; i--) bg = over(px(stack[i]), bg); return bg; };

const pw = await playwright();
const srv = await serve();
const browser = await pw.chromium.launch();

const seed = (preset, sidebar) => {
  const db = seedDB(T0);
  db.theme = { preset, custom: sidebar ? { sidebar } : {} };
  /* nested folders: a root with a child with a grandchild, a second root with a child */
  db.folders.push({ id: 'f1b', name: '(011) Grandchild-bearing', parentId: 'f1', order: 2, updatedAt: T0 }, { id: 'f1a1', name: '(100) Grandchild', parentId: 'f1a', order: 1, updatedAt: T0 }, { id: 'f2a', name: '(020) Child of two', parentId: 'f2', order: 1, updatedAt: T0 });
  return db;
};
async function open(vp, db) {
  const ctx = await browser.newContext(vp.touch ? { viewport: { width: vp.w, height: vp.h }, hasTouch: true, isMobile: true } : { viewport: { width: vp.w, height: vp.h } });
  for (const p of BLOCKED) await ctx.route(p, (r) => r.abort());
  await ctx.addInitScript((d) => { try { if (!localStorage.getItem('my-notebook-v1')) localStorage.setItem('my-notebook-v1', d); } catch {} }, JSON.stringify(db));
  const d = { ctx, errors: [] };
  d.page = await ctx.newPage();
  d.page.on('pageerror', (e) => d.errors.push('pageerror: ' + e));
  await d.page.goto(srv.base + '/', { waitUntil: 'domcontentloaded' });
  await d.page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree'));
  await sleep(500);
  /* under 1200px the sidebar is a pane of its own: bring it on screen */
  await d.page.evaluate(() => { const sb = document.getElementById('sb'); if (sb && !sb.offsetWidth && typeof showPane === 'function') showPane('sb'); });
  await sleep(300);
  return d;
}

/* every arrow in #sb, found by content; size, ink and the backgrounds behind it */
const sweep = (page) => page.evaluate((glyphs) => {
  const sb = document.getElementById('sb');
  const out = [];
  const stackOf = (el) => { const st = []; for (let n = el; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') st.push(c); if (/^rgb\(/.test(c)) break; } return st; };
  for (const el of sb.querySelectorAll('*')) {
    if (el.children.length) continue;
    const t = el.textContent.trim();
    if (!t || t.length > 1 || !glyphs.includes(t)) continue;
    const q = el.getBoundingClientRect();
    if (!q.width && !q.height) continue;
    const cs = getComputedStyle(el);
    out.push({ cls: el.className || el.tagName, glyph: t, h: q.height, w: q.width, fs: parseFloat(cs.fontSize), color: cs.color, stack: stackOf(el),
      row: (el.closest('.tr-row,.sec-hd,.sf-grp-hd') || el.parentElement).className });
  }
  return out;
}, GLYPHS);

async function states(d, vp, fn) {
  /* expanded: every section open and every folder open; collapsed: the arrows folded back */
  await d.page.evaluate(() => { for (const f of DB.folders) { if (typeof ST !== 'undefined' && ST.exp) ST.exp[f.id] = true; } if (typeof renderTree === 'function') renderTree(); });
  await sleep(300);
  await fn('expanded');
  await d.page.evaluate(() => { for (const f of DB.folders) { if (typeof ST !== 'undefined' && ST.exp) ST.exp[f.id] = false; } if (typeof renderTree === 'function') renderTree(); });
  await sleep(300);
  await fn('collapsed');
}

try {
  if (want('68a')) {
    for (const vp of VPS) for (const [preset, sidebar] of THEMES) {
      const d = await open(vp, seed(preset, sidebar));
      const label = `68a@${vp.name} ${preset}${sidebar ? ' + custom sidebar ' + sidebar : ''}`;
      try {
        await states(d, vp, async (state) => {
          const arrows = await sweep(d.page);
          const t = `${label} ${state}`;
          const sec = arrows.filter((a) => /sec-tog/.test(String(a.cls)));
          check(arrows.length >= 6 && sec.length >= 3, `${t}: arrows were found by content (${arrows.length}, ${sec.length} of them section arrows)`, arrows.map((a) => a.cls).join());
          const short = arrows.filter((a) => a.h < 14);
          check(short.length === 0, `${t}: every arrow is at least 14 px high (smallest ${Math.min(...arrows.map((a) => a.h)).toFixed(1)})`, short.map((a) => `${a.cls} ${a.h.toFixed(1)}px`).join(' · '));
          const scored = arrows.map((a) => { const bg = flatten(a.stack); return { ...a, c: ratio(over(px(a.color), bg), bg) }; });
          const low = scored.filter((a) => a.c < 4.5);
          check(low.length === 0, `${t}: every arrow clears 4.5:1 (lowest ${Math.min(...scored.map((a) => a.c)).toFixed(2)}:1)`, low.map((a) => `${a.cls} ${a.c.toFixed(2)}:1`).join(' · '));
        });
      } finally { await d.ctx.close(); }
    }
  }

  if (want('68b')) {
    for (const vp of VPS) {
      const d = await open(vp, seed('forest', null));
      const t = `68b@${vp.name}`;
      try {
        const sel = '#sb .sec-hd .sec-tog';
        const glyph = () => d.page.evaluate((s) => document.querySelector(s)?.textContent.trim(), sel);
        const before = await glyph();
        const hit = async () => { const loc = d.page.locator(sel).first(); if (vp.touch) await loc.tap(); else await loc.click(); await sleep(350); };
        await hit();
        const mid = await glyph();
        await hit();
        const after = await glyph();
        check(before && mid && before !== mid && after === before, `${t} a real ${vp.touch ? 'tap' : 'click'} on a section arrow closes and re-opens its section`, `${before} → ${mid} → ${after}`);
        check(d.errors.length === 0, `${t} no page errors`, d.errors.slice(0, 2).join(' · '));
      } finally { await d.ctx.close(); }
    }
  }

  if (want('68c')) {
    for (const vp of VPS) for (const [preset, sidebar] of [THEMES[0], THEMES[5]]) {
      const d = await open(vp, seed(preset, sidebar));
      const t = `68c@${vp.name} ${preset}${sidebar ? ' + custom' : ''}`;
      try {
        await states(d, vp, async (state) => {
          const m = await d.page.evaluate(() => {
            const sb = document.getElementById('sb');
            const clipped = [];
            for (const row of sb.querySelectorAll('.sec-hd,.tr-row,.sf-grp-hd')) {
              const rq = row.getBoundingClientRect(); if (!rq.width) continue;
              for (const a of row.querySelectorAll('.sec-tog,.tr-tog,.sf-grp-tog')) {
                if (!a.textContent.trim()) continue;
                const q = a.getBoundingClientRect();
                if (q.top < rq.top - 0.5 || q.bottom > rq.bottom + 0.5 || q.left < rq.left - 0.5 || q.right > rq.right + 0.5) clipped.push(a.className + ' ' + a.textContent.trim());
              }
              if (row.scrollWidth - row.clientWidth > 1) clipped.push('row overflows: ' + row.className);
            }
            return { clipped, over: sb.scrollWidth - sb.clientWidth, doc: document.documentElement.scrollWidth - document.documentElement.clientWidth };
          });
          check(m.clipped.length === 0 && m.over <= 1 && m.doc <= 1, `${t} ${state}: no arrow or row is clipped, nothing overflows sideways`, `${m.clipped.slice(0, 3).join(' · ')} sb ${m.over}px page ${m.doc}px`);
        });
      } finally { await d.ctx.close(); }
    }
  }
} catch (e) {
  console.log(' FAIL  arrows-v1 threw: ' + (e && e.stack || e));
  results.push({ ok: false, label: 'threw' });
} finally {
  await browser.close();
  await srv.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
