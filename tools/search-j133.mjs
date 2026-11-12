#!/usr/bin/env node
/* tools/search-j133.mjs — v05.93, J133 + J137 (block 151): narrow a search word by word, a movable search from the middle pane, two wrong menu pointers.
   node tools/search-j133.mjs            (checks)
   node tools/search-j133.mjs --measure --notes=9000   (prints the side-pane timings: today's search vs one more chip; not a check)

   151a  "planning land" = exactly the notes holding both words; removing the `land` chip gives the `planning` set again; the count line = the notes shown (side pane, pop-up, window)
   151b  `−village` / `-village` leave those notes out in all three boxes; a bare `-` changes nothing
   151c  _stLast: a longer word, an added word and an added exclusion reuse the last hits (fewer notes read) AND equal a cold search; removing a word / an exclusion reads every note
   151d  the ＋ narrow box adds several words at once on Enter; a repaint while it is focused keeps the typing, the focus and the caret
   151e  a window search over 250 matches shows 100, then "Show 100 more", then all; the count line is the true total
   151f  the Pane 2 🔍 opens the pop-up beside its button (820, 1440), a drag moves it, the place survives a reload, a resize pulls it back; at 390 a top sheet, up/down only, clear of the Zab bar
   151g  J137: both messages say ⚙ and no "🧰 → 💽" is left in the source
   151h  nothing in DB changes across the block; no page errors */
import { openApp, report, seedDB, touchDrag } from './harness.mjs';
import fs from 'node:fs';

const argv = process.argv.slice(2);
const MEASURE = argv.includes('--measure');
const NOTES = +((argv.find((a) => a.startsWith('--notes=')) || '').split('=')[1]) || 0;
const r = report('J133 — narrow a search, movable search');
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

function seed() {
  const d = seedDB(); const now = new Date().toISOString();
  const mk = (id, title, body, f = 'f1') => d.articles.push({ id, title, content: '<p>' + body + '</p>', folderIds: [f], tags: [], createdAt: now, updatedAt: now, kind: 'general' });
  for (let i = 0; i < 24; i++) mk('p' + i, 'Plan item ' + i, 'planning ' + (i < 10 ? 'land ' : '') + (i % 6 === 0 ? 'village ' : '') + 'text');
  for (let i = 0; i < 12; i++) mk('q' + i, 'Other ' + i, 'land only ' + (i % 3 === 0 ? 'village' : 'meadow'));
  for (let i = 0; i < 250; i++) mk('b' + i, 'Bulk ' + i, 'zxbulk ' + (i % 5 === 0 ? 'zxrare' : ''), 'f1a');
  if (NOTES) { const W = ['alpha', 'beta', 'gamma', 'delta', 'planning', 'land', 'village', 'lorem']; let s = 7; const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; for (let i = 0; i < NOTES; i++) { let c = ''; while (c.length < 1500) c += '<div>' + [0, 1, 2, 3, 4, 5].map(() => W[(rnd() * W.length) | 0]).join(' ') + '</div>'; d.articles.push({ id: 'm' + i, title: 'Note ' + i, content: c, folderIds: ['f2'], tags: [], createdAt: now, updatedAt: now, kind: 'general' }); } }
  return d;
}
const ids = (p, q) => p.evaluate((q) => { _stLast = null; return _searchAll(q).noteHits.map((a) => a.id).sort(); }, q);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ── measure only ── */
if (MEASURE) {
  const app = await openApp({ viewport: { width: 1440, height: 900 }, db: seed() }); const p = app.page;
  const m = await p.evaluate(async () => {
    const T = (fn) => { const t = performance.now(); fn(); return +(performance.now() - t).toFixed(1); };
    DB.articles.forEach(_stOf);
    const out = {};
    _stLast = null; out.today = T(() => _searchAll('alpha beta'));
    _stLast = null; _searchAll('alpha'); out.chip = T(() => _searchAll('alpha beta'));
    _stLast = null; out.coldChip = T(() => _searchAll('alpha beta -gamma'));
    _stLast = null; _searchAll('alpha'); out.chipExc = T(() => _searchAll('alpha -gamma'));
    return out;
  });
  console.log('measure ' + NOTES + ' notes (ms): today\'s search "alpha beta" cold ' + m.today + ' · one more chip (warm) ' + m.chip + ' · cold with exclusion ' + m.coldChip + ' · warm +exclusion ' + m.chipExc);
  await app.close(); process.exit(0);
}

const src = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
let dbBefore = null, dbAfter = null;
for (const [w, h, touch] of [[1440, 900, false], [820, 1180, true], [390, 844, true]]) {
  const t = `@${w}`, phone = w < 640;
  const app = await openApp({ viewport: { width: w, height: h }, db: seed(), hasTouch: touch });
  const p = app.page;
  try {
    if (w === 1440) dbBefore = await p.evaluate(() => JSON.stringify(DB));
    const cnt = (sel) => p.evaluate((s) => { const e = document.querySelector(s); return e ? +e.dataset.n : -1; }, sel);
    const shown = {
      side: () => p.evaluate(() => document.querySelectorAll('#tree .sr[data-aid]').length),
      gs: () => p.evaluate(() => document.querySelectorAll('#gs-results .gs-result[data-kind="note"]').length),
      fw: () => p.evaluate(() => document.querySelectorAll('.fwin-hits .fwin-hit').length),
    };
    const countSel = { side: '#tree .nw-cnt', gs: '#gs-results .nw-cnt', fw: '.fwin-body .nw-cnt' };
    const set = async (s, q) => { await p.evaluate(([s, q]) => _nwSet(s, q), [s === 'fw' ? 'fw:f1' : s, q]); await sleep(s === 'side' ? 500 : 250); };

    if (w === 1440) {
      /* the three boxes open */
      await p.evaluate(() => { document.getElementById('sq').focus(); });
      await p.evaluate(() => { openGlobalSearch(); });
      await p.evaluate(() => { _fwCtxFrom = null; openFolderWin('f1'); });
      await sleep(300);
      const exp = { planning: await ids(p, 'planning'), both: await ids(p, 'planning land'), noVil: await ids(p, 'planning -village'), noVil2: await ids(p, 'planning −village') };
      /* ── 151a ── */
      for (const s of ['side', 'gs', 'fw']) {
        await set(s, 'planning land');
        const got = s === 'fw' ? await p.evaluate(() => [...document.querySelectorAll('.fwin-hits .fwin-hit')].map((e) => e.dataset.aid).sort()) : s === 'side' ? await p.evaluate(() => [...document.querySelectorAll('#tree .sr[data-aid]')].map((e) => e.dataset.aid).sort()) : await p.evaluate(() => [...document.querySelectorAll('#gs-results .gs-result[data-kind="note"]')].map((e) => e.dataset.id).sort());
        const c = await cnt(countSel[s]);
        r.check(same(got, exp.both) && exp.both.length === 10 && c === got.length, `151a${t} ${s}: "planning land" = the ${exp.both.length} notes holding both, count line ${c} = shown ${got.length}`, JSON.stringify(got));
        /* remove the land chip */
        const li = await p.evaluate((sel) => { const chips = [...document.querySelectorAll(sel.replace('.nw-cnt', '.nw-chip'))]; return chips.findIndex((c) => c.textContent.startsWith('land')); }, countSel[s]);
        await p.evaluate(([s, i]) => _nwRemove(s === 'fw' ? 'fw:f1' : s, i), [s, li]); await sleep(s === 'side' ? 500 : 250);
        const got2 = await shown[s](); const c2 = await cnt(countSel[s]);
        r.check(li === 1 && got2 === exp.planning.length && c2 === got2, `151a${t} ${s}: removing the land chip gives the planning set again (${got2} of ${exp.planning.length})`, `chip ${li}, count ${c2}`);
      }
      /* ── 151b ── */
      for (const s of ['side', 'gs', 'fw']) {
        for (const [q, key] of [['planning -village', 'noVil'], ['planning −village', 'noVil2']]) {
          await set(s, q);
          const n = await shown[s](); const c = await cnt(countSel[s]);
          const hasX = await p.evaluate((sel) => !!document.querySelector(sel.replace('.nw-cnt', '.nw-chip.nw-x')), countSel[s]);
          r.check(n === exp[key].length && n < exp.planning.length && c === n && hasX, `151b${t} ${s}: "${q}" leaves the village notes out (${n} of ${exp.planning.length}), shown as an excluded chip`, `count ${c}`);
        }
        await set(s, 'planning -'); const nb = await shown[s]();
        r.check(nb === exp.planning.length, `151b${t} ${s}: a bare "-" changes nothing (${nb})`, '');
      }
      const exWords = await p.evaluate(() => ({ a: _searchWords('a -b −cd - -5').exc, b: [..._searchWords('a -b −cd - -5')] }));
      r.check(same(exWords.a, ['b', 'cd']) && same(exWords.b, ['a', '-5']), '151b _searchWords: letters after the hyphen make an exclusion; "-" and "-5" are not', JSON.stringify(exWords));
      const kinds = await p.evaluate(() => { const f = DB.folders.map((x) => x.name.toLowerCase())[0]; return { f, hit: _searchAll(f).folderHits.length, ex: _searchAll(f + ' -' + f.slice(-4)).folderHits.length }; });
      r.check(kinds.hit >= 1 && kinds.ex === 0, '151b an exclusion also leaves out folders (and tags/types the same way)', JSON.stringify(kinds));

      /* ── 151c ── */
      const cases = [['plan', 'planning', true], ['planning', 'planning land', true], ['planning', 'planning -village', true], ['planning -village', 'planning -village land', true], ['planning land', 'planning', false], ['planning -village', 'planning', false], ['planning -village', 'planning -villag', false], ['planning land', 'land', false]];
      for (const [o, n, reuse] of cases) {
        const res = await p.evaluate(([o, n]) => {
          _stPart = null; _stLast = null; _searchNotes(_searchWords(o)); const old = _stLast.hits.length;
          const orig = _stOf; let calls = 0; _stOf = (a) => { calls++; return orig(a); };
          let warm; try { warm = _searchNotes(_searchWords(n)).map((a) => a.id).sort(); } finally { _stOf = orig; }
          _stLast = null; const cold = _searchNotes(_searchWords(n)).map((a) => a.id).sort();
          return { old, calls, N: DB.articles.length, ok: JSON.stringify(warm) === JSON.stringify(cold), n: warm.length };
        }, [o, n]);
        r.check(res.ok && (reuse ? res.calls <= res.old : res.calls >= res.N), `151c "${o}" → "${n}": ${reuse ? 'reuses the last hits' : 'searches every note'} (${res.calls} notes read; last hits ${res.old}, all ${res.N}), same answer as a cold search`, JSON.stringify(res));
      }

      /* ── 151d ── */
      await set('side', 'planning');
      const d1 = await p.evaluate(() => { const n = document.querySelector('#tree .nw-in'); n.focus(); n.value = 'land vill'; n.setSelectionRange(3, 3); renderTree(); const m = document.querySelector('#tree .nw-in'); return { v: m.value, f: document.activeElement === m, s: m.selectionStart }; });
      r.check(d1.v === 'land vill' && d1.f && d1.s === 3, '151d a repaint while the narrow box is focused keeps the typing, the focus and the caret', JSON.stringify(d1));
      await p.evaluate(() => { const n = document.querySelector('#tree .nw-in'); n.value = 'land village'; });
      await p.locator('#tree .nw-in').press('Enter'); await sleep(600);
      const d2 = await p.evaluate(() => ({ q: ST.search, chips: [...document.querySelectorAll('#tree .nw-chip')].map((c) => c.textContent.replace('✕', '')), box: document.querySelector('#tree .nw-in').value, f: document.activeElement === document.querySelector('#tree .nw-in'), sq: document.getElementById('sq').value }));
      r.check(d2.q === 'planning land village' && same(d2.chips, ['planning', 'land', 'village']) && d2.box === '' && d2.sq === d2.q, '151d Enter adds several words at once as chips; the chips and the box are ONE query string', JSON.stringify(d2));
      r.check(d2.f, '151d the narrow box keeps the focus after Enter (add the next word at once)', '');
      const d3 = await ids(p, 'planning land village'); const sd = await shown.side();
      r.check(sd === d3.length && sd > 0, `151d the side pane shows the notes of the three chips (${sd})`, '');
      await p.evaluate(() => clearSearch());

      /* ── 151e ── */
      await set('fw', 'zxbulk');
      const e1 = await p.evaluate(() => ({ n: document.querySelectorAll('.fwin-hits .fwin-hit').length, c: +document.querySelector('.fwin-body .nw-cnt').dataset.n, more: (document.querySelector('.fwin-more') || {}).textContent }));
      r.check(e1.n === 100 && e1.c === 250 && /Show 100 more \(150 left\)/.test(e1.more || ''), '151e 250 matches: 100 rows, the count line says 250, "Show 100 more (150 left)"', JSON.stringify(e1));
      await p.evaluate(() => document.querySelector('.fwin-more').click()); await sleep(200);
      const e2 = await p.evaluate(() => ({ n: document.querySelectorAll('.fwin-hits .fwin-hit').length, more: (document.querySelector('.fwin-more') || {}).textContent }));
      await p.evaluate(() => document.querySelector('.fwin-more').click()); await sleep(200);
      const e3 = await p.evaluate(() => ({ n: document.querySelectorAll('.fwin-hits .fwin-hit').length, more: !!document.querySelector('.fwin-more'), c: +document.querySelector('.fwin-body .nw-cnt').dataset.n }));
      r.check(e2.n === 200 && /50 left/.test(e2.more || '') && e3.n === 250 && !e3.more && e3.c === 250, '151e 100 more → 200 rows, again → all 250, the button goes', JSON.stringify([e2, e3]));
      await set('fw', 'zxbulk zxrare'); const e4 = await p.evaluate(() => document.querySelectorAll('.fwin-hits .fwin-hit').length);
      r.check(e4 === 50, '151e a narrower window search starts again from the first page (50)', String(e4));
      await p.evaluate(() => { closeGlobalSearch(); _fwWins.slice().forEach((x) => _fwClose(x.id)); });

      /* ── 151g ── */
            const bad = (src.match(/🧰 → 💽/g) || []).length;
      r.check(bad === 0 && /not connected to Cloud Sync: use ⚙ → 💽 Storage/.test(src) && /⚙ → 💽 Storage/.test(src.slice(src.indexOf('A copy of your current notebook has been saved'), src.indexOf('A copy of your current notebook has been saved') + 300)), '151g J137: both messages say ⚙ → 💽 Storage & Backup; no "🧰 → 💽" is left in the source', `left ${bad}`);
      const row = await p.evaluate(() => { const mi = [...document.querySelectorAll('#sb-menu .sb-mi')].find((e) => /Storage/.test(e.textContent)); return !!mi; });
      r.check(row, '151g the 💽 Storage & Backup row really is in the ⚙ menu', '');
      const sweep = [...src.matchAll(/🧰 ?→ ?([^ ,.;)<'"]+ ?[^ ,.;)<'"]*)/g)].map((m) => m[1]).filter((x) => !/Appearance|Siyagah|Zab|🎨|👝/.test(x));
      r.check(sweep.length === 0, '151g every "🧰 →" in the source points at a row that is in 🧰 (Appearance / Siyagah Zab)', sweep.join(' | '));
    }

    /* ── 151f ── */
    await p.evaluate(() => { if (innerWidth < 1200) { try { showPane('p2'); } catch (e) { } } _renderP2SearchBar(); });
    await sleep(300);
    const bt = p.locator('#p2-srch-btn').first();
    const br = await bt.boundingBox();
    if (!br) { r.check(false, `151f${t} the Pane 2 🔍 button is visible`, 'no box'); }
    else {
      await (touch ? bt.tap() : bt.click()); await sleep(400);
      const o = await p.evaluate(() => { const b = document.getElementById('gs-box'), r = b && b.getBoundingClientRect(); return r ? { l: r.left, t: r.top, w: r.width, h: r.height, fl: document.getElementById('gs-overlay').classList.contains('gs-fl'), focus: document.activeElement && document.activeElement.id } : null; });
      if (!o) r.check(false, `151f${t} the pop-up opens from the Pane 2 button`, 'not open');
      else if (!phone) {
        r.check(o.fl && Math.abs(o.l - Math.min(br.x, w - o.w - 4)) <= 6 && o.t >= br.y + br.height - 2 && o.t <= br.y + br.height + 20, `151f${t} the pop-up opens beside the button (box ${Math.round(o.l)},${Math.round(o.t)}; button ${Math.round(br.x)},${Math.round(br.y + br.height)})`, JSON.stringify(o));
        const sx = o.l + o.w / 2, sy = o.t + 6;
        if (touch) await touchDrag(p, [{ x: sx, y: sy }, { x: sx + 20, y: sy + 20 }, { x: sx + 80, y: sy + 70 }, { x: sx + 120, y: sy + 90 }]);
        else { await p.mouse.move(sx, sy); await p.mouse.down(); await p.mouse.move(sx + 40, sy + 30, { steps: 4 }); await p.mouse.move(sx + 120, sy + 90, { steps: 4 }); await p.mouse.up(); }
        await sleep(250);
        const o2 = await p.evaluate(() => { const r = document.getElementById('gs-box').getBoundingClientRect(); return { l: r.left, t: r.top }; });
        r.check(Math.abs(o2.l - (o.l + 120)) <= 3 && Math.abs(o2.t - (o.t + 90)) <= 3, `151f${t} a drag by the top strip moves the box (+${Math.round(o2.l - o.l)},+${Math.round(o2.t - o.t)})`, JSON.stringify(o2));
        /* a tap on a result still opens the note */
        await p.evaluate(() => { _nwSet('gs', 'planning'); }); await sleep(300);
        await (touch ? p.locator('#gs-results .gs-result[data-kind="note"]').first().tap() : p.locator('#gs-results .gs-result[data-kind="note"]').first().click()); await sleep(400);
        const op = await p.evaluate(() => ({ sel: ST.article, open: !!document.getElementById('gs-overlay') }));
        r.check(/^p/.test(op.sel || '') && !op.open, `151f${t} a tap on a result opens the note and closes the pop-up`, JSON.stringify(op));
        /* the place survives a reload */
        const saved = await p.evaluate(() => localStorage.getItem('siyagah-gs-geom'));
        await p.reload(); await p.waitForFunction(() => typeof _dbLoaded !== 'undefined' && _dbLoaded, null, { timeout: 20000 }).catch(() => { });
        await sleep(800);
        await p.evaluate(() => { if (innerWidth < 1200) { try { showPane('p2'); } catch (e) { } } _renderP2SearchBar(); }); await sleep(300);
        await p.evaluate(() => document.getElementById('p2-srch-btn').click()); await sleep(400);
        const o3 = await p.evaluate(() => { const r = document.getElementById('gs-box').getBoundingClientRect(); return { l: r.left, t: r.top }; });
        r.check(!!saved && Math.abs(o3.l - o2.l) <= 3 && Math.abs(o3.t - o2.t) <= 3, `151f${t} the place survives a reload (${Math.round(o3.l)},${Math.round(o3.t)})`, saved || 'nothing stored');
        const inDb = await p.evaluate(() => JSON.stringify(DB).includes('gs-geom'));
        r.check(!inDb, `151f${t} the place is device-local, never in DB`, '');
        /* a resize pulls it back inside */
        await p.setViewportSize({ width: 700, height: 500 }); await sleep(400);
        const o4 = await p.evaluate(() => { const r = document.getElementById('gs-box').getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; });
        r.check(o4.l >= 3 && o4.t >= 3 && o4.r <= 700 + 1 && o4.b <= 500 + 1, `151f${t} after a resize to 700×500 the box is back inside the window`, JSON.stringify(o4));
        await p.setViewportSize({ width: w, height: h });
        await p.evaluate(() => closeGlobalSearch());
      } else {
        const zb = await p.evaluate(() => { const a = document.querySelector('#jeb-bar'), z = a && a.getBoundingClientRect(); return z && z.height ? z.top : innerHeight; });
        r.check(o.fl && o.t <= 2 && Math.abs(o.w - w) <= 1, `151f${t} a top sheet, full width (top ${Math.round(o.t)}, width ${Math.round(o.w)})`, JSON.stringify(o));
        await p.evaluate(() => _nwSet('gs', 'planning')); await sleep(300);
        const hb = await p.evaluate(() => document.getElementById('gs-box').getBoundingClientRect().bottom);
        r.check(hb <= zb + 1, `151f${t} the sheet ends above the Zab bar (${Math.round(hb)} ≤ ${Math.round(zb)})`, '');
        const sx = w / 2, sy = 15;
        await touchDrag(p, [{ x: sx, y: sy }, { x: sx + 30, y: sy + 20 }, { x: sx + 60, y: sy + 80 }, { x: sx + 90, y: sy + 140 }]); await sleep(250);
        const o2 = await p.evaluate(() => { const r = document.getElementById('gs-box').getBoundingClientRect(); return { l: r.left, t: r.top, b: r.bottom }; });
        r.check(o2.l === 0 && o2.t >= 100 && o2.t <= 160, `151f${t} the sheet drags down but not sideways (left ${o2.l}, top ${Math.round(o2.t)})`, JSON.stringify(o2));
        await touchDrag(p, [{ x: sx, y: o2.t + 15 }, { x: sx, y: o2.t + 600 }, { x: sx, y: o2.t + 2000 }]).catch(() => { }); await sleep(250);
        const o3 = await p.evaluate(() => document.getElementById('gs-box').getBoundingClientRect().bottom);
        r.check(o3 <= zb + 1, `151f${t} dragged as far down as it goes it still stays above the Zab bar (${Math.round(o3)} ≤ ${Math.round(zb)})`, '');
        const ok44 = await p.evaluate(() => [...document.querySelectorAll('#gs-box .nw-chip button, #gs-box .nw-in')].every((e) => { const b = e.getBoundingClientRect(); return b.height >= 43.5; }));
        r.check(ok44, `151f${t} chip buttons and the narrow box are at least 44 px tall`, '');
        await p.evaluate(() => closeGlobalSearch());
      }
    }
    const ov = await p.evaluate(() => ({ x: document.documentElement.scrollWidth <= innerWidth + 1 }));
    r.check(ov.x, `151h${t} no horizontal overflow`, '');
    if (w === 1440) dbAfter = await p.evaluate(() => JSON.stringify(DB));
    r.check(app.errors.length === 0, `151h${t} no page errors`, app.errors.slice(0, 3).join(' | '));
  } catch (e) {
    r.check(false, `151${t} ran to the end`, String(e && e.stack || e).slice(0, 500));
  } finally { await app.close(); }
}
/* DB must not change across the searches: only the open-note click can touch updatedAt-free state, so compare the notes' text, not the whole object */
{
  const strip = (s) => { try { const d = JSON.parse(s); return JSON.stringify([d.articles.map((a) => [a.id, a.title, a.content, a.updatedAt]), d.folders.map((f) => [f.id, f.name]), d.trash]); } catch (e) { return s; } };
  r.check(dbBefore && dbAfter && strip(dbBefore) === strip(dbAfter), '151h searching, chips and windows changed nothing in DB (notes, folders, Trash)', '');
}
process.exit(r.finish() ? 1 : 0);
