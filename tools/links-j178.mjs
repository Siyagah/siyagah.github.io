#!/usr/bin/env node
/* tools/links-j178.mjs — v06.05, J178 (block 164): the Links Zab.
   164a full screen: a phone's open Links Zab fills the screen (nothing written to <html>'s style); 820 / 1440: a ⛶ toggle, per session, never stored
   164b the Filter card: no Person / Issue rows in the panel; Filter ▾ opens a card; choose (chip + ✕), add, rename (every item of THIS Zab carrying it, ONE persist, only those stamped, the other Zab untouched), delete (confirmation with the count, items kept, ONE persist)
   164c the Title box: a filled box gives the new item `title` (trimmed), an empty one adds no key; only in a Links Zab
   164d the title source per site, with fetch routed: YouTube, Vimeo, noembed; the owner's title wins; a failure → the short address, silently, one retry
   164e the buttons: ✎ Title and → Note on the top line of a row / card / deck card; 📎 Attach below; the ⋯ menu holds 👤 Person and # Issue; other kinds keep their row
   164f no sideways scroll at 390 / 820 / 1440, no page errors
   164g (keep1116) save, update, reopen: the data still there after the NEXT version is served
   node tools/links-j178.mjs */
import { openApp, report, serve, playwright, ROOT, seedDB } from './harness.mjs';
import { mkdtempSync, cpSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const r = report('J178 — the Links Zab');
const errs = [];
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const T0 = '2026-10-01T00:00:00.000Z';
const mk = (id, pid, text, order, o = {}) => ({ id, pocketId: pid, text, done: false, folderIds: [], tags: [], kind: null, journal: false, order, createdAt: T0, updatedAt: T0, ...o });
const seed = () => {
  const d = seedDB(T0);
  d.jeb = [
    mk('l1', 'jp-link', 'https://example.com/alpha', 0, { url: 'https://example.com/alpha', ttl: 'Alpha page', people: ['Ann'], issues: ['Rent'] }),
    mk('l2', 'jp-link', 'https://example.com/beta', 1, { url: 'https://example.com/beta', ttl: 'Beta page', people: ['Ann', 'Bob'], issues: ['Tax'] }),
    mk('l3', 'jp-link', 'https://example.com/gamma', 2, { url: 'https://example.com/gamma', ttl: 'Gamma page', people: ['Bob'], issues: [] }),
    mk('l4', 'jp-link', 'https://example.com/delta', 3, { url: 'https://example.com/delta', ttl: 'Delta page' }),
    mk('t1', 'jp-task', 'A task about Ann', 0, { people: ['Ann'], issues: ['Rent'] }),
    mk('i1', 'jp-idea', 'An idea', 0),
  ];
  d.theme = Object.assign({}, d.theme, { zabPhoneLayout: 'bar' });
  return d;
};
const routes = async (ctx, hits, mode) => {
  await ctx.route('**/www.youtube.com/oembed**', (x) => { hits.yt.push(new URL(x.request().url()).searchParams.get('url')); return x.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ title: 'YT fixture', author_name: 'Chan' }) }); });
  await ctx.route('**/vimeo.com/api/oembed.json**', (x) => { hits.vimeo.push(new URL(x.request().url()).searchParams.get('url')); return x.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ title: 'Vimeo fixture' }) }); });
  await ctx.route('**/noembed.com/embed**', (x) => { hits.ne.push(x.request().url()); if (mode.ne === 'fail') return x.abort(); return x.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ title: 'Noembed fixture' }) }); });
  await ctx.route('**/i.ytimg.com/**', (x) => x.abort());
};
const open = async (p) => { await p.evaluate(() => { jebOpenPanel('jp-link'); }); await p.waitForSelector('#jeb-panel.on .jl-it', { timeout: 20000 }); await sleep(300); };
const item = (p, id) => p.evaluate((i) => JSON.parse(JSON.stringify(DB.jeb.find((x) => x.id === i) || null)), id);
const rows = (p) => p.evaluate(() => [...new Set([...document.querySelectorAll('#jeb-panel .jl-it')].map((e) => e.dataset.iid))].join());   /* a grouped (wide) list shows an item once per person it carries */

for (const [w, h, touch] of [[390, 844, true], [820, 1180, true], [1440, 900, false]]) {
  const t = `@${w}`, phone = w < 640;
  const hits = { yt: [], vimeo: [], ne: [] }, mode = { ne: 'ok' };
  const app = await openApp({ viewport: { width: w, height: h }, db: seed(), hasTouch: touch });
  const p = app.page;
  await routes(p.context(), hits, mode);
  try {
    await p.evaluate(() => { window.__pc = 0; const os = window._save; window._save = function () { window.__pc++; return os.apply(this, arguments); }; });
    await open(p);

    /* ── 164a ── */
    const htmlStyle0 = await p.evaluate(() => document.documentElement.getAttribute('style') || '');
    const geo = () => p.evaluate(() => { const e = document.getElementById('jeb-panel'), b = e.getBoundingClientRect(); return { jb: Math.round(parseFloat(getComputedStyle(e).bottom) || 0), l: Math.round(b.left), t: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), iw: innerWidth, ih: innerHeight, fs: !!document.querySelector('#jeb-panel .jl-fs'), cls: e.classList.contains('jl-full') }; });
    const g0 = await geo();
    if (phone) {
      r.check(g0.w === g0.iw && g0.t <= 1 && g0.h + g0.jb >= g0.ih - 2 && !g0.fs, `164a${t} a phone: the open Links Zab fills the screen (${g0.w}x${g0.h} of ${g0.iw}x${g0.ih}), no ⛶ toggle`, JSON.stringify(g0));
      const pad = await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#jeb-panel .jeb-list')).paddingBottom));
      r.check(pad >= 60, `164a${t} room is kept at the foot for the Zab button (${pad}px)`);
      await p.evaluate(() => jebOpenPanel('jp-idea')); await sleep(400);
      const gi = await geo();
      r.check(!gi.cls && gi.h < gi.ih * 0.8, `164a${t} another kind of Zab keeps its sheet (${gi.h} of ${gi.ih})`, JSON.stringify(gi));
      await open(p);
    } else {
      r.check(g0.fs && g0.w < g0.iw && !g0.cls, `164a${t} a ⛶ toggle on the panel header; not full screen at first (${g0.w} of ${g0.iw})`, JSON.stringify(g0));
      await p.locator('#jeb-panel .jl-fs').click(); await sleep(400);
      const g1 = await geo();
      r.check(g1.w === g1.iw && g1.cls, `164a${t} ⛶ makes it fill the width (${g1.w} of ${g1.iw})`, JSON.stringify(g1));
      const stored = await p.evaluate(() => JSON.stringify(DB).includes('jl-full') || JSON.stringify(DB.theme).includes('"full') || /jlFull/i.test(JSON.stringify(DB)));
      r.check(!stored, `164a${t} the choice is not stored`);
      await p.locator('#jeb-panel .jl-fs').click(); await sleep(400);
      r.check((await geo()).w === g0.w, `164a${t} the toggle puts it back`);
    }
    r.check((await p.evaluate(() => document.documentElement.getAttribute('style') || '')) === htmlStyle0, `164a${t} nothing written to <html>'s style`);

    /* ── 164b ── */
    const noRows = await p.evaluate(() => document.querySelectorAll('#jeb-panel .jl-frow').length);
    const fb = await p.evaluate(() => { const b = document.querySelector('#jeb-panel .jl-filters .jl-fopen'); return b ? b.textContent : null; });
    r.check(noRows === 0 && fb === 'Filter ▾', `164b${t} no Person / Issue rows at the top; one "Filter ▾" button`, `${noRows} ${fb}`);
    await p.locator('#jeb-panel .jl-fopen').click(); await p.waitForSelector('#ov.on .jl-fcs', { timeout: 5000 }); await sleep(200);
    const card = await p.evaluate(() => ({ secs: [...document.querySelectorAll('#ov .jl-fch')].map((e) => e.textContent), names: [...document.querySelectorAll('#ov .jl-fcs[data-f=people] .jl-fcr[data-n]')].map((e) => e.dataset.n).join(), inames: [...document.querySelectorAll('#ov .jl-fcs[data-f=issues] .jl-fcr[data-n]')].map((e) => e.dataset.n).join() }));
    r.check(card.secs.join('|') === '👤 Person|# Issue' && card.names === 'Ann,Bob' && card.inames === 'Rent,Tax', `164b${t} the card lists this Zab's people and issues (not the Tasks Zab's)`, JSON.stringify(card));
    await p.locator('#ov .jl-fcs[data-f=people] .jl-fcr[data-n="Ann"] [data-a=pick]').click(); await sleep(400);
    const chip = await p.evaluate(() => [...document.querySelectorAll('#jeb-panel .jl-fchip')].map((e) => e.textContent.replace('✕', '').trim()).join('|'));
    r.check((await rows(p)) === 'l1,l2' && chip === '👤 Ann' && !(await p.evaluate(() => document.getElementById('ov').classList.contains('on'))), `164b${t} choosing Ann filters the list (l1,l2) and shows a chip`, `${await rows(p)} / ${chip}`);
    await p.locator('#jeb-panel .jl-fx').click(); await sleep(300);
    r.check((await rows(p)) === 'l1,l2,l3,l4' && (await p.evaluate(() => document.querySelectorAll('#jeb-panel .jl-fchip').length)) === 0, `164b${t} the chip's ✕ clears the filter`);
    /* add */
    const before = await p.evaluate(() => JSON.stringify(DB.jeb));
    await p.locator('#jeb-panel .jl-fopen').click(); await p.waitForSelector('#ov.on .jl-fcs');
    await p.locator('#ov .jl-fcnew[data-f=people]').fill('Cara'); await p.keyboard.press('Enter'); await sleep(300);
    const added = await p.evaluate(() => [...document.querySelectorAll('#ov .jl-fcs[data-f=people] .jl-fcr[data-n]')].map((e) => e.dataset.n).join());
    r.check(added === 'Ann,Bob,Cara' && (await p.evaluate(() => JSON.stringify(DB.jeb))) === before, `164b${t} adding Cara puts her in the list; no item changed`, added);
    /* rename: l1 + l2 carry Ann; the Tasks item t1 also carries Ann */
    const t1b = await item(p, 't1'), l3b = await item(p, 'l3');
    await p.evaluate(() => { window.__pc = 0; });
    await p.locator('#ov .jl-fcs[data-f=people] .jl-fcr[data-n="Ann"] [data-a=ren]').click(); await sleep(200);
    await p.locator('#ov .jl-fcin').fill('Anna'); await p.locator('#ov [data-a=ren-ok]').click(); await sleep(400);
    const pc = await p.evaluate(() => window.__pc);
    const l1 = await item(p, 'l1'), l2 = await item(p, 'l2'), l3 = await item(p, 'l3'), t1 = await item(p, 't1');
    r.check(JSON.stringify(l1.people) === '["Anna"]' && JSON.stringify(l2.people) === '["Anna","Bob"]', `164b${t} rename: both items carrying Ann now say Anna`, JSON.stringify([l1.people, l2.people]));
    r.check(pc === 1, `164b${t} rename saved ONCE (${pc} persist calls)`);
    r.check(l1.updatedAt !== T0 && l2.updatedAt !== T0 && l3.updatedAt === T0 && JSON.stringify(t1) === JSON.stringify(t1b) && l3.updatedAt === l3b.updatedAt, `164b${t} only the two changed items were stamped; the Tasks Zab's Ann is untouched`);
    r.check((await p.evaluate(() => [...document.querySelectorAll('#ov .jl-fcs[data-f=people] .jl-fcr[data-n]')].map((e) => e.dataset.n).join()) === 'Anna,Bob,Cara'), `164b${t} the card shows the new name`);
    /* delete */
    const nItems = await p.evaluate(() => DB.jeb.length);
    await p.locator('#ov .jl-fcs[data-f=people] .jl-fcr[data-n="Bob"] [data-a=del]').click(); await sleep(200);
    const q = await p.evaluate(() => (document.querySelector('#ov .jl-fcq') || {}).textContent || '');
    r.check(/Remove “Bob” from 2 links\? The links stay\./.test(q) && (await item(p, 'l3')).people.length === 1, `164b${t} delete asks first, with the count: "${q}"`);
    await p.locator('#ov [data-a=cancel]').click(); await sleep(150);
    r.check((await item(p, 'l3')).people.length === 1, `164b${t} Cancel changes nothing`);
    await p.evaluate(() => { window.__pc = 0; });
    await p.locator('#ov .jl-fcs[data-f=people] .jl-fcr[data-n="Bob"] [data-a=del]').click(); await p.locator('#ov [data-a=del-ok]').click(); await sleep(400);
    const l2d = await item(p, 'l2'), l3d = await item(p, 'l3');
    r.check(JSON.stringify(l2d.people) === '["Anna"]' && l3d && !(l3d.people || []).length && (await p.evaluate(() => DB.jeb.length)) === nItems && (await p.evaluate(() => window.__pc)) === 1, `164b${t} delete removed Bob from both links, kept every item, saved once`, JSON.stringify([l2d.people, l3d.people]));
    await p.locator('#ov #jl-fc-done').click(); await sleep(200);

    /* ── 164c ── */
    const tv = await p.evaluate(() => { const e = document.getElementById('jeb-title-in'); const b = e.getBoundingClientRect(); return { shown: !e.hidden && b.width > 0, w: Math.round(b.width), ph: e.placeholder }; });
    r.check(tv.shown && /Title/.test(tv.ph), `164c${t} a Title box beside the Paste-a-link field`, JSON.stringify(tv));
    await p.locator('#jeb-title-in').fill('  My   own title '); await p.locator('#jeb-add-in').fill('https://example.com/own'); await p.locator('#jeb-add-in').press('Enter'); await sleep(500);
    const own = await p.evaluate(() => DB.jeb.find((x) => x.text === 'https://example.com/own'));
    r.check(own && own.title === 'My own title' && (await p.evaluate(() => document.getElementById('jeb-title-in').value)) === '', `164c${t} the filled box gives the item its title (trimmed); the box is emptied`, JSON.stringify(own));
    await p.locator('#jeb-add-in').fill('https://example.com/plain'); await p.locator('#jeb-add-in').press('Enter'); await sleep(500);
    const plain = await p.evaluate(() => DB.jeb.find((x) => x.text === 'https://example.com/plain'));
    r.check(plain && !('title' in plain), `164c${t} an empty box adds no title key`, JSON.stringify(plain));
    await p.evaluate(() => jebOpenPanel('jp-idea')); await sleep(300);
    r.check(await p.evaluate(() => document.getElementById('jeb-title-in').hidden), `164c${t} no Title box in another kind of Zab`);
    await open(p);

    /* ── 164d ── */
    const addLink = async (txt, title) => { if (title) await p.locator('#jeb-title-in').fill(title); await p.locator('#jeb-add-in').fill(txt); await p.locator('#jeb-add-in').press('Enter'); await sleep(1200); };
    await addLink('https://www.youtube.com/watch?v=AAAAAAAAAAA');
    await addLink('https://vimeo.com/123456');
    await addLink('https://news.example.net/story/one');
    await addLink('https://news.example.net/mine', 'Owner wins');
    const byText = (s) => p.evaluate((s) => { const x = DB.jeb.find((i) => i.text === s); return x ? { ttl: x.ttl, title: x.title, ch: x.ch } : null; }, s);
    const ty = await byText('https://www.youtube.com/watch?v=AAAAAAAAAAA'), tv2 = await byText('https://vimeo.com/123456'), tn = await byText('https://news.example.net/story/one'), tm = await byText('https://news.example.net/mine');
    r.check(ty && ty.ttl === 'YT fixture' && hits.yt.length === 1, `164d${t} YouTube: its own oEmbed (${hits.yt.length} request)`, JSON.stringify(ty));
    r.check(tv2 && tv2.ttl === 'Vimeo fixture' && hits.vimeo.length === 1 && hits.vimeo[0] === 'https://vimeo.com/123456', `164d${t} Vimeo: its own oEmbed, only the address sent`, JSON.stringify([tv2, hits.vimeo]));
    r.check(tn && tn.ttl === 'Noembed fixture' && !tn.ch && hits.ne.some((u) => u.includes(encodeURIComponent('https://news.example.net/story/one'))), `164d${t} other sites: noembed, title in ttl only`, JSON.stringify([tn, hits.ne.length]));
    const shownOwn = await p.evaluate(() => { const x = DB.jeb.find((i) => i.text === 'https://news.example.net/mine'); const e = document.querySelector(`#jeb-panel .jl-it[data-iid="${x.id}"] .jeb-ttl`); return e ? e.textContent : null; });
    r.check(tm && tm.title === 'Owner wins' && tm.ttl === 'Noembed fixture' && shownOwn === 'Owner wins', `164d${t} the owner's title wins on screen; the fetched one is kept in ttl`, JSON.stringify([tm, shownOwn]));
    mode.ne = 'fail'; const n0 = hits.ne.length;
    await addLink('https://fail.example.org/some/page');
    const tf = await byText('https://fail.example.org/some/page');
    const shortShown = await p.evaluate(() => { const x = DB.jeb.find((i) => i.text === 'https://fail.example.org/some/page'); const e = document.querySelector(`#jeb-panel .jl-it[data-iid="${x.id}"] .jeb-tx`); return e ? e.textContent : null; });
    r.check(tf && !tf.ttl && shortShown === 'fail.example.org/some' && !(await p.evaluate(() => !!document.querySelector('.toast'))), `164d${t} a failing site: no title, the short address shows ("${shortShown}"), nothing said`, JSON.stringify(tf));
    await p.evaluate(() => { _jebPanelSig = ''; jebRefresh(); }); await sleep(1000); await p.evaluate(() => { _jebPanelSig = ''; jebRefresh(); }); await sleep(1000);
    const failHits = hits.ne.length - n0;
    r.check(failHits <= 2 && failHits >= 1, `164d${t} one retry at most (${failHits} requests)`);

    /* ── 164e ── */
    const pos = await p.evaluate(() => {
      const row = document.querySelector('#jeb-panel .jl-it[data-iid="l1"]'), R = (e) => e && e.getBoundingClientRect();
      const ttl = R(row.querySelector('.jeb-ttl-b')), note = R(row.querySelector('.jeb-note-b')), att = R(row.querySelector('.jeb-att-b')), th = R(row.querySelector('.jl-th')), chips = R(row.querySelector('.jeb-chips')), more = R(row.querySelector('.jeb-more'));
      return { ttlTop: ttl.top, noteTop: note.top, thTop: th.top, thBot: th.bottom, attTop: att.top, chipsTop: chips ? chips.top : 1e9, moreTop: more.top, row: R(row).top, hasP: !!row.querySelector('.jl-p-b,.jl-i-b'), attTxt: row.querySelector('.jeb-att-b').textContent, acts: [...row.querySelectorAll('.jeb-acts button')].map((b) => b.textContent).join('|') };
    });
    r.check((w < 640 ? (pos.ttlTop < pos.thBot && pos.noteTop < pos.thBot) : (pos.ttlTop < pos.thTop && pos.noteTop < pos.thTop)) && pos.ttlTop < pos.attTop && pos.noteTop < pos.chipsTop && !pos.hasP && /Attach/.test(pos.acts) && !/Title|Note/.test(pos.acts), `164e${t} ✎ Title and → Note are on the top line (beside the link), above the chips; 📎 Attach stays below; no 👤 / # buttons`, JSON.stringify(pos));
    await p.locator('#jeb-panel .jl-it[data-iid="l1"] .jeb-more').click(); await sleep(300);
    const menu = await p.evaluate(() => [...document.querySelectorAll('#jeb-menu .jm')].map((e) => e.textContent).join('|'));
    r.check(/Person/.test(menu) && /Issue/.test(menu), `164e${t} the item's ⋯ menu holds 👤 Person… and # Issue…`, menu);
    await p.keyboard.press('Escape'); await sleep(200);
    await p.evaluate(() => { _jebHideMenu(); });
    await p.locator('#jeb-panel .jl-it[data-iid="l1"] .jeb-ttl-b').click(); await sleep(400);
    r.check(await p.evaluate(() => document.getElementById('ov').classList.contains('on')), `164e${t} the top-line ✎ Title still opens the title dialog`);
    await p.evaluate(() => closeModal());
    await p.evaluate(() => { jebOpenDeck({ ids: ['jp-link'], all: false }); }); await p.waitForSelector('#jeb-deck.on .jeb-card', { timeout: 10000 }); await sleep(400);
    const dk = await p.evaluate(() => { const c = document.querySelector('#jeb-deck .jeb-card.jl-dcard'); const R = (e) => e.getBoundingClientRect(); const th = R(c.querySelector('.jl-th')); const tb = c.querySelector('.jl-dtop .jeb-ttl-b'), nb = c.querySelector('.jl-dtop .jeb-note-b'); return { ok: !!tb && !!nb, above: !!tb && (R(tb).top + R(tb).bottom) / 2 < th.top && (R(nb).top + R(nb).bottom) / 2 < th.top,   /* the deck cards are tilted a little: compare centres */ dbg: [R(tb).bottom, R(nb).bottom, th.top].join('/'), acts: [...c.querySelectorAll('.jc-acts button')].map((b) => b.getAttribute('aria-label')).join('|') }; });
    r.check(dk.ok && dk.above && !/Title|note/i.test(dk.acts), `164e${t} the deck card: ✎ and → Note on its top line, above the thumbnail; 📎 and ⋯ stay below`, JSON.stringify(dk));
    await p.evaluate(() => jebCloseDeck());
    await p.evaluate(() => jebOpenPanel('jp-idea')); await sleep(400);
    r.check((await p.evaluate(() => document.querySelector('#jeb-panel .jeb-it .jeb-acts').textContent.replace(/\s+/g, ' '))).includes('Attach') && (await p.evaluate(() => !!document.querySelector('#jeb-panel .jeb-it .jeb-acts .jeb-ttl-b'))), `164e${t} an Ideas row keeps its three buttons`);
    await open(p);

    /* ── 164f ── */
    const ov = await p.evaluate(() => ({ doc: document.documentElement.scrollWidth - innerWidth, list: (() => { const l = document.querySelector('#jeb-panel .jeb-list'); return l.scrollWidth - l.clientWidth; })() }));
    r.check(ov.doc <= 0 && ov.list <= 1, `164f${t} no sideways scroll`, JSON.stringify(ov));
    await p.locator('#jeb-panel .jl-fopen').click(); await p.waitForSelector('#ov.on .jl-fcs'); await sleep(200);
    const ovc = await p.evaluate(() => { const m = document.querySelector('#ov .mbox, #mb') || document.getElementById('mb'); return { d: document.documentElement.scrollWidth - innerWidth, m: m ? m.scrollWidth - m.clientWidth : 0 }; });
    r.check(ovc.d <= 0 && ovc.m <= 1, `164f${t} the Filter card has no sideways scroll`, JSON.stringify(ovc));
    await p.evaluate(() => closeModal());
  } catch (e) { r.check(false, `164${t} threw: ` + String(e && e.stack || e).split('\n').slice(0, 3).join(' / ')); }
  errs.push(...app.errors); await app.close();
}
r.check(errs.length === 0, '164f no page errors', errs.slice(0, 3).join(' | '));

/* 164g — keep1116: save · update · reopen */
{
  const dir = mkdtempSync(join(tmpdir(), 'j178-'));
  for (const f of ['index.html', 'sw.js', 'manifest.json', 'manifest-jeb.json']) { try { cpSync(join(ROOT, f), join(dir, f)); } catch {} }
  try { cpSync(join(ROOT, 'icons'), join(dir, 'icons'), { recursive: true }); } catch {}
  const srv = await serve(dir); const pw = await playwright(); const browser = await pw.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  for (const g of ['**googleapis.com/**', '**gstatic.com/**', '**firebaseio.com/**', '**firebaseapp.com/**', '**noembed.com/**', '**vimeo.com/**']) await ctx.route(g, (x) => x.abort());
  await ctx.addInitScript((d) => { try { if (!localStorage.getItem('j178-seeded')) { localStorage.setItem('my-notebook-v1', JSON.stringify(d)); localStorage.setItem('j178-seeded', '1'); } } catch {} }, seed());
  const pe = []; const page = await ctx.newPage(); page.on('pageerror', (e) => pe.push(String(e)));
  try {
    await page.goto(srv.base + '/'); await page.waitForFunction(() => window.__appBooted === true); await sleep(600);
    const v1 = await page.evaluate(() => document.querySelector('meta[name="app-version"]').content);
    await page.evaluate(() => { jlRenameName('jp-link', 'people', 'Ann', 'Anna'); jlAddName('jp-link', 'issues', 'Gas'); jebEditItem('l4', { title: 'Mine 164g' }); });
    await sleep(1500);
    const exp = await page.evaluate(() => JSON.stringify({ j: DB.jeb, v: DB.theme.zabLinkView }));
    const [mj, mn] = v1.split('.').map(Number); const nx = String(mj).padStart(2, '0') + '.' + String(mn + 1).padStart(2, '0');
    writeFileSync(join(dir, 'index.html'), readFileSync(join(dir, 'index.html'), 'utf8').replace(/(name="app-version" content=")[^"]+/, '$1' + nx));
    writeFileSync(join(dir, 'sw.js'), readFileSync(join(dir, 'sw.js'), 'utf8').replace(/v\d\d\.\d\d\.01/, 'v' + nx + '.01'));
    await page.reload(); await page.waitForFunction(() => window.__appBooted === true); await sleep(800);
    const v2 = await page.evaluate(() => document.querySelector('meta[name="app-version"]').content);
    const got = await page.evaluate(() => JSON.stringify({ j: DB.jeb, v: DB.theme.zabLinkView }));
    r.check(v1 !== v2 && v2 === nx, `164g the page reopened as the next version (${v1} → ${v2})`);
    r.check(got === exp, '164g the renamed person, the added issue and the title are still there', got === exp ? '' : got.slice(0, 200));
    r.check(pe.length === 0, '164g no page errors', pe.join(' | '));
  } catch (e) { r.check(false, '164g threw: ' + String(e && e.message || e).split('\n')[0]); }
  await browser.close(); await srv.close();
}
process.exit(r.finish() ? 1 : 0);
