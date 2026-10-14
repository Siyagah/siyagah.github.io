#!/usr/bin/env node
/* tools/jebh-p1.mjs — v05.08, P1: the phone keyboard no longer restyles the whole page (checks 69a–69d).

   Any change to <html>'s own style makes Chromium restyle every element on the page. With 9,000 notes that is
   ~45,000 elements (Pane 2 holds every card), so v05.00–v05.07, which flipped the Zab bar's height (--jeb-h) on
   <html> each time a phone keyboard came up or went down, spent ~0.75 s of style work (×4 CPU) on every tap into
   or out of a text field. v05.08 never sets a changing value on <html>: --jeb-h is a NON-inheriting registered
   property set on each element that uses it, and --jeb-l is written onto #jeb-bar / #jeb-deck.

   69a  the sweep, NAME NOTHING: every stylesheet rule whose declarations use var(--jeb-h) is found by its text;
        each element it matches (live, or a probe built from the selector's last compound) must carry the bar's
        height — 56px with the bar up, 0px with html.jeb-kb — at 390 / 820 / 1440. Plus a planted rule
        (.zz-p1-new{bottom:var(--jeb-h)}) that is NOT on the list must be caught, so the sweep can fail.
   69b  <html> carries no --jeb-h/--jeb-l of its own: its inline style is empty of both and its computed --jeb-h
        does not move when the keyboard class flips (3 sizes)
   69c  the cost, 9,000 notes (~47 MB) at 390 with the CPU throttled ×4: each of 4 keyboard up/down flips costs
        ≤ 100 ms of style recalculation (it was ~750 ms)
   69d  the real flow at 390 and 820 (touch): focus the note editor → on the phone the bar hides and Pane 3 reaches
        the screen's foot (a tablet keeps the bar, J2's rule); 💾 Save → the bar is back within 1 s and Pane 3 ends
        at the bar's top

   `--only=69a` runs one. Each printed ok/FAIL line becomes one app-check check (block 69). */
import { playwright, serve, seedDB, BLOCKED } from './harness.mjs';
import { sleep, check, results } from './s1-fake.mjs';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);
const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];

const pw = await playwright();
const srv = await serve();
const browser = await pw.chromium.launch();

async function dev(vp) {
  const ctx = await browser.newContext(vp.touch ? { viewport: { width: vp.w, height: vp.h }, hasTouch: true, isMobile: true } : { viewport: { width: vp.w, height: vp.h } });
  for (const p of BLOCKED) await ctx.route(p, (r) => r.abort());
  await ctx.addInitScript((d) => { try { localStorage.setItem('my-notebook-v1', JSON.stringify(d)); } catch {} }, Object.assign(seedDB(), { theme: { zabPhoneLayout: 'bar' } }));   /* v05.17: this check is about the bar on a phone (block 77 covers the button) */
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.setDefaultTimeout(300000);
  await page.goto(srv.base + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('jeb-bar'));
  await sleep(400);
  return { ctx, page, errors };
}

/* in the page: every rule using var(--jeb-h) (inside @media too), and for each comma-separated selector the
   elements it matches, or one probe built from its last compound when nothing matches */
const SWEEP = () => {
  const rules = [];
  const walk = (list) => { for (const r of list) { if (r.cssRules && !r.selectorText) walk(r.cssRules); else if (r.selectorText && /var\(--jeb-h\)/.test(r.style.cssText)) rules.push(r.selectorText); } };
  for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch (_) {} }
  const out = [], probes = [];
  for (const sel of rules) for (const one of sel.split(',').map((s) => s.trim())) {
    let els = []; try { els = [...document.querySelectorAll(one)].filter((e) => e !== document.documentElement); } catch (_) {}
    if (!els.length) {
      const last = one.split(/[\s>+~]+/).filter(Boolean).pop().replace(/:[\w-]+(\([^)]*\))?/g, '');
      const tag = (last.match(/^[a-z][\w-]*/i) || ['div'])[0], id = (last.match(/#([\w-]+)/) || [])[1], cls = [...last.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
      if (id && document.getElementById(id)) els = [document.getElementById(id)];
      else { const p = document.createElement(tag); if (id) p.id = id; cls.forEach((c) => p.classList.add(c)); p.style.display = 'none'; document.body.appendChild(p); probes.push(p); els = [p]; }
    }
    els.slice(0, 3).forEach((e) => out.push({ sel: one, el: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.classList.length ? '.' + [...e.classList].slice(0, 2).join('.') : ''), h: getComputedStyle(e).getPropertyValue('--jeb-h').trim() }));
  }
  probes.forEach((p) => p.remove());
  return { rules: rules.length, out };
};

try {
  /* ── 69a / 69b: the sweep and <html> itself, at three sizes ── */
  if (want('69a') || want('69b')) for (const vp of VPS) {
    const d = await dev(vp);
    const t = '@' + vp.name;
    try {
      const kb = (on) => d.page.evaluate((on) => { document.documentElement.classList.toggle('jeb-kb', on); return new Promise((r) => requestAnimationFrame(() => r())); }, on);
      if (want('69a')) {
        const up = await d.page.evaluate(SWEEP);
        const badUp = up.out.filter((x) => x.h !== '56px');
        check(up.rules >= 10 && up.out.length >= 10 && !badUp.length, `69a${t} bar up: every element a var(--jeb-h) rule styles carries 56px (${up.rules} rules, ${up.out.length} elements)`, JSON.stringify(badUp.slice(0, 6)));
        await kb(true);
        const dn = await d.page.evaluate(SWEEP);
        const badDn = dn.out.filter((x) => x.h !== '0px');
        check(!badDn.length, `69a${t} keyboard up (html.jeb-kb): every one of them carries 0px`, JSON.stringify(badDn.slice(0, 6)));
        await kb(false);
        /* the sweep can fail: a new rule whose element is not on the list */
        const planted = await d.page.evaluate((SW) => { const st = document.createElement('style'); st.id = 'zz-p1'; st.textContent = '.zz-p1-new{bottom:var(--jeb-h)}'; document.head.appendChild(st); const r = (0, eval)('(' + SW + ')')(); st.remove(); return r.out.filter((x) => x.sel === '.zz-p1-new'); }, SWEEP.toString());
        check(planted.length === 1 && planted[0].h !== '56px', `69a${t} a planted rule for an element NOT on the list is caught (it reads ${planted[0] && planted[0].h}, not the bar's 56px)`, JSON.stringify(planted));
      }
      if (want('69b')) {
        const st = await d.page.evaluate(async () => {
          const h = document.documentElement, g = () => getComputedStyle(h).getPropertyValue('--jeb-h').trim();
          jebLayout();
          const a = { inlineH: h.style.getPropertyValue('--jeb-h'), inlineL: h.style.getPropertyValue('--jeb-l'), up: g() };
          h.classList.add('jeb-kb'); await new Promise((r) => requestAnimationFrame(r)); a.kb = g(); h.classList.remove('jeb-kb');
          const bar = document.getElementById('jeb-bar'), sb = document.getElementById('sb');
          a.barL = bar.style.getPropertyValue('--jeb-l'); a.barLeft = Math.round(bar.getBoundingClientRect().left);
          a.sbRight = innerWidth >= 1200 ? Math.round(sb.getBoundingClientRect().right) : 0;
          return a;
        });
        check(!st.inlineH && !st.inlineL && st.up === st.kb, `69b${t} <html> holds no --jeb-h/--jeb-l of its own, and its --jeb-h does not move with the keyboard`, JSON.stringify(st));
        check(st.barL === st.sbRight + 'px' && Math.abs(st.barLeft - st.sbRight) <= 1, `69b${t} the bar carries --jeb-l itself and starts at ${vp.w >= 1200 ? "the sidebar's right edge" : 'the left edge'} (${st.barLeft}px)`, JSON.stringify(st));
      }
      check(!d.errors.length, `69${t} no page errors`, d.errors.slice(0, 3).join(' | '));
    } finally { await d.ctx.close(); }
  }

  /* ── 69c: the cost at 9,000 notes on a ×4 phone ── */
  if (want('69c')) {
    const vp = VPS[0], d = await dev(vp);
    try {
      const info = await d.page.evaluate(() => {
        const s = 'The quick brown fox jumps over the lazy dog. ', t0 = Date.now() - 5e6;
        for (let i = 0; i < 9000; i++) { const at = new Date(t0 + i * 500).toISOString(); DB.articles.push({ id: 'n' + i, title: 'Note ' + i, content: '<p>' + s.repeat(110) + i + '</p>', folderIds: ['f1'], tags: [], createdAt: at, updatedAt: at, kind: 'general' }); }
        persist(); render();
        return { notes: DB.articles.length, elements: document.getElementsByTagName('*').length };
      });
      await sleep(2500);
      const cdp = await d.ctx.newCDPSession(d.page);
      await cdp.send('Performance.enable');
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const met = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
      const costs = [];
      for (let i = 0; i < 4; i++) {
        const a = await met();
        await d.page.evaluate(() => new Promise((r) => { document.documentElement.classList.toggle('jeb-kb'); requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 50))); }));
        const b = await met();
        costs.push({ style: Math.round((b.RecalcStyleDuration - a.RecalcStyleDuration) * 1000), task: Math.round((b.TaskDuration - a.TaskDuration) * 1000) });
      }
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      console.log('P1C ' + JSON.stringify({ info, costs }));
      check(info.notes >= 9000 && costs.every((c) => c.style <= 100), `69c 9,000 notes (${info.elements} elements), phone ×4: each keyboard up/down costs ≤ 100 ms of style work (${costs.map((c) => c.style).join(' / ')} ms; whole task ${costs.map((c) => c.task).join(' / ')} ms)`, JSON.stringify(costs));
      check(!d.errors.length, '69c no page errors', d.errors.slice(0, 3).join(' | '));
    } finally { await d.ctx.close(); }
  }

  /* ── 69d: the real flow on the two touch layouts ── */
  if (want('69d')) for (const vp of VPS.slice(0, 2)) {
    const d = await dev(vp);
    const t = '69d@' + vp.name;
    try {
      await d.page.evaluate(() => { selArt('a1'); document.getElementById('p3').classList.add('mob-open'); startEdit(); });
      await sleep(500);
      await d.page.locator('#ed').first().tap(); await d.page.keyboard.type('x'); await sleep(400);
      const geo = () => d.page.evaluate(() => { const bar = document.getElementById('jeb-bar'), p3 = document.getElementById('p3'); return { barShown: getComputedStyle(bar).display !== 'none', barTop: Math.round(bar.getBoundingClientRect().top), p3Bottom: Math.round(p3.getBoundingClientRect().bottom), vh: innerHeight, kb: document.documentElement.classList.contains('jeb-kb') }; });
      const typing = await geo();
      /* J2's rule: only a phone (< 640 px) gives the bar's room to the keyboard; a tablet keeps the bar */
      if (vp.w < 640) check(typing.kb && !typing.barShown && Math.abs(typing.p3Bottom - typing.vh) <= 1, `${t} typing in the note: the bar hides and the note reaches the foot of the screen`, JSON.stringify(typing));
      else check(!typing.kb && typing.barShown && Math.abs(typing.p3Bottom - typing.barTop) <= 1, `${t} typing in the note on a tablet: the bar stays (J2) and the note ends at its top`, JSON.stringify(typing));
      const saved = await d.page.evaluate(() => { const b = [...document.querySelectorAll('#p3 button')].find((x) => x.offsetParent && /^💾/.test(x.textContent.trim())); if (b) b.setAttribute('data-p1', '1'); return !!b; });
      if (saved) await d.page.locator('[data-p1="1"]').tap(); else await d.page.evaluate(() => saveArt());
      await sleep(1000);
      const after = await geo();
      check(saved && !after.kb && after.barShown && Math.abs(after.p3Bottom - after.barTop) <= 1, `${t} 💾 Save: the bar is back within 1 s and the note ends at its top`, JSON.stringify(after));
      check(!d.errors.length, `${t} no page errors`, d.errors.slice(0, 3).join(' | '));
    } finally { await d.ctx.close(); }
  }
} catch (e) {
  console.log(' FAIL  jebh-p1 threw: ' + (e && e.stack || e));
  results.push({ ok: false, label: 'threw' });
} finally {
  await browser.close();
  await srv.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
