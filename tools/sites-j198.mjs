#!/usr/bin/env node
/* tools/sites-j198.mjs — v06.12, J198 (block 171): the 🌐 Sites menu beside 🏠.
   171a button beside 🏠, inside the header, at 360 / 390 / 820 / 1440 (opened by a REAL click; painted, inside the viewport)
   171b absent list = the 13 built-in sites, nothing written to DB; row = anchor to the right address, new tab; closes after opening / Escape / outside
   171c add, rename, change address, move up / down, delete + Undo; a javascript: address is refused; tap targets ≥ 44 on a phone
   171d an edit reaches a stale copy through mergeDB both ways, an emptied list stays empty; the Save File copy has no open menu */
import { openApp, report, seedDB } from './harness.mjs';
const r = report('J198 — 🌐 Sites');
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const T0 = new Date().toISOString();
for (const [w, h, touch] of [[360, 740, true], [390, 844, true], [820, 1180, true], [1440, 900, false]]) {
  const t = `@${w}`, phone = w < 640;
  const app = await openApp({ viewport: { width: w, height: h }, db: seedDB(T0), hasTouch: touch });
  const p = app.page;
  const click = async (sel) => { const l = p.locator(sel).first(); await (touch ? l.tap() : l.click()); await sleep(200); };
  try {
    const before = await p.evaluate(() => JSON.stringify(DB.theme.sites === undefined));
    const pos = await p.evaluate(() => { const b = document.getElementById('sites-btn'), h = document.querySelector('#sb-home-wrap .sb-act'), hd = document.querySelector('.sb-hd'); const a = b.getBoundingClientRect(), c = h.getBoundingClientRect(), d = hd.getBoundingClientRect(); const e = document.elementFromPoint(a.left + a.width / 2, a.top + a.height / 2); return { a: [a.left, a.right, a.top, a.bottom], home: [c.left, c.right, c.top, c.bottom], hd: [d.left, d.right], hit: !!(e && (e === b || b.contains(e))), txt: b.textContent, vw: innerWidth }; });
    const near = Math.abs(pos.a[2] - pos.home[2]) < 40 || pos.a[2] >= pos.home[3] - 2;
    r.check(pos.a[0] >= 0 && pos.a[1] <= pos.vw + 0.5 && pos.hit && /Sites/.test(pos.txt) && near, `171a${t} 🌐 Sites is on screen, tappable, beside 🏠`, JSON.stringify(pos));
    r.check(pos.a[0] >= pos.hd[0] - 1 && pos.a[1] <= pos.hd[1] + 1, `171a${t} it stays inside the header`, JSON.stringify(pos));
    r.check(before === 'true', `171b${t} absent list at start`, before);
    await click('#sites-btn');
    const m = await p.evaluate(() => { const e = document.getElementById('sites-menu'); if (!e) return null; const c = e.getBoundingClientRect(), cs = getComputedStyle(e); return { l: c.left, r: c.right, t: c.top, b: c.bottom, vis: cs.display !== 'none' && cs.visibility !== 'hidden', n: e.querySelectorAll('a.st-a').length, vw: innerWidth, vh: innerHeight, z: cs.zIndex }; });
    r.check(m && m.vis && m.l >= -0.5 && m.r <= m.vw + 0.5 && m.t >= -0.5 && m.b <= m.vh + 0.5, `171a${t} the menu is painted and inside the viewport`, JSON.stringify(m));
    r.check(m && m.n === 13 && +m.z < 10000 && +m.z > 5002, `171b${t} 13 built-in rows, z-index between pop-ups and modals`, JSON.stringify(m));
    r.check(await p.evaluate(() => DB.theme.sites === undefined), `171b${t} opening writes nothing to DB`, '');
    const row0 = await p.evaluate(() => { const a = document.querySelector('#sites-menu a.st-a'); return { h: a.getAttribute('href'), t: a.target, rel: a.rel, name: a.querySelector('.st-n').textContent, hh: a.closest('.st-row').getBoundingClientRect().height }; });
    r.check(row0.h === 'https://basheerawanazeera.github.io/BasheeraWaNazeera/library/page.html?p=6BYUwxCixuSj5Jde4x7qBS' && row0.t === '_blank' && /noopener/.test(row0.rel) && row0.name === "Jumua'h Khutbah", `171b${t} first row: right address, new tab, noopener`, JSON.stringify(row0));
    if (phone) r.check(row0.hh >= 44, `171c${t} rows ≥ 44 px`, String(row0.hh));
    await p.keyboard.press('Escape'); await sleep(150);
    r.check(await p.evaluate(() => !document.getElementById('sites-menu')), `171b${t} Escape closes it`, '');
    await click('#sites-btn'); await p.mouse.click(Math.round(w / 2), 5); await sleep(200);
    r.check(await p.evaluate(() => !document.getElementById('sites-menu')), `171b${t} an outside tap closes it`, '');
    await p.evaluate(() => { document.addEventListener('click', (e) => { const a = e.target.closest && e.target.closest('#sites-menu a'); if (a) { window.__opened = a.href; e.preventDefault(); } }, true); });
    await click('#sites-btn'); await click('#sites-menu a.st-a >> nth=3'); await sleep(250);
    r.check(await p.evaluate(() => window.__opened === 'https://basheerawanazeera.github.io/BasheeraWaNazeera/library/my.html' && !document.getElementById('sites-menu')), `171b${t} a row opens BwN Database and the menu closes`, '');
    if (w === 390 || w === 1440) {
      /* edits */
      const dlg = async (n, u) => { if (n != null) await p.fill('#st-in-n', n); if (u != null) await p.fill('#st-in-u', u); await click('#st-ok'); };
      await click('#sites-btn'); await click('#sites-menu .st-add');
      await dlg('Test Site', 'javascript:alert(1)');
      r.check(await p.evaluate(() => /http/.test(document.getElementById('st-err').textContent) && DB.theme.sites === undefined), `171c${t} a javascript: address is refused, nothing written`, '');
      await p.fill('#st-in-u', 'https://example.test/x'); await click('#st-ok');
      let L = await p.evaluate(() => _sitesList().map((x) => [x.n, x.u]));
      r.check(L.length === 14 && L[13][0] === 'Test Site' && L[13][1] === 'https://example.test/x', `171c${t} add writes the whole list with the new site last`, JSON.stringify(L[13]));
      const pHeight = await p.evaluate(() => [...document.querySelectorAll('#sites-menu .st-more')].map((b) => b.getBoundingClientRect().height));
      if (phone) r.check(pHeight.every((x) => x >= 44), `171c${t} ⋯ buttons ≥ 44 px`, String(Math.min(...pHeight)));
      await click('#sites-menu .st-row >> nth=13 >> .st-more');
      await click('#sites-menu .st-act [data-st="ren"]'); await dlg('Renamed', null);
      await click('#sites-menu .st-row >> nth=13 >> .st-more'); await click('#sites-menu .st-act [data-st="adr"]'); await dlg(null, 'http://example.test/y');
      L = await p.evaluate(() => _sitesList().map((x) => [x.n, x.u]));
      r.check(L[13][0] === 'Renamed' && L[13][1] === 'http://example.test/y', `171c${t} rename and change address`, JSON.stringify(L[13]));
      await click('#sites-menu .st-row >> nth=13 >> .st-more'); await click('#sites-menu .st-act [data-st="up"]');
      L = await p.evaluate(() => _sitesList().map((x) => x.n));
      r.check(L[12] === 'Renamed' && L[13] === 'SSEVM', `171c${t} move up`, L.slice(11).join('|'));
      await click('#sites-menu .st-act [data-st="dn"]');
      L = await p.evaluate(() => _sitesList().map((x) => x.n));
      r.check(L[13] === 'Renamed', `171c${t} move down`, L.slice(11).join('|'));
            await click('#sites-menu .st-act [data-st="del"]'); await sleep(200);
      r.check(await p.evaluate(() => _sitesList().length === 13 && !!document.querySelector('.toast-act')), `171c${t} delete removes it and offers Undo`, '');
      await p.evaluate(() => document.querySelector('.toast-act').click()); await sleep(500);
      r.check(await p.evaluate(() => _sitesList().length === 14 && _sitesList()[13].n === 'Renamed'), `171c${t} Undo brings it back`, await p.evaluate(() => _sitesList().length));
      /* sync */
      const sy = await p.evaluate(() => { const cur = JSON.parse(JSON.stringify(DB)); const stale = JSON.parse(JSON.stringify(DB)); delete stale.theme.sites; if (stale.themeAt) delete stale.themeAt.sites; const a = mergeDB(stale, JSON.parse(JSON.stringify(cur))); const b = mergeDB(JSON.parse(JSON.stringify(cur)), stale); return [a.theme.sites && a.theme.sites.length, b.theme.sites && b.theme.sites.length]; });
      r.check(sy[0] === 14 && sy[1] === 14, `171d${t} the edited list survives a merge both ways`, JSON.stringify(sy));
      const emp = await p.evaluate(() => { _sitesSet([]); return [_sitesList().length, DB.theme.sites.length]; });
      r.check(emp[0] === 0 && emp[1] === 0, `171d${t} an emptied list stays empty (absent ≠ empty)`, JSON.stringify(emp));
      r.check(await p.evaluate(() => !_cleanExportRoot().includes('id="sites-menu"')), `171d${t} Save File copy carries no open menu`, '');
      await p.keyboard.press('Escape');
    }
    r.check(app.errors.length === 0, `171d${t} no page errors`, app.errors.slice(0, 3).join(' | '));
  } catch (e) { r.check(false, `171${t} threw`, String(e && e.stack || e).slice(0, 700)); }
  await app.close();
}
process.exit(r.finish() ? 1 : 0);
