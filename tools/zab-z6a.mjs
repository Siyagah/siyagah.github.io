#!/usr/bin/env node
/* tools/zab-z6a.mjs — v05.10, Z6a: pocket kinds, and the Links pocket (checks 70a–70i).

   Every check runs at 390x844, 820x1180 and 1440x900 (unless it names a size) against a booted app, with real taps
   (touch viewports) or clicks (1440). The network is never touched: www.youtube.com/oembed and i.ytimg.com are
   routed to local fixtures (page.route), and "offline" is a route.abort().

   70a  kind: the seed pockets' derived kinds; "🧩 Pocket kind" through the real pocket menu (five boxes, current one
        ticked); Links -> Plain -> Links changes the layout; nothing is written until the owner chooses
   70b  YouTube: a pasted link fills title, channel and thumbnail (one stamp); another site fetches nothing; a failing
        oEmbed leaves a usable item with no error and at most one retry; a failing thumbnail draws the fallback box
   70c  pickers: the "Add <channel>?" chip; 👤 and # pickers by real taps (names from THIS pocket only, New…, Done)
   70d  phone (390): the Person and Issue filter rows combine; the 96 px 16:9 thumbnail; the choice is remembered
   70e  tablet and laptop (820, 1440): cards in a grid (>= 200 px), Group by People / Issues, counts, "No … yet"
        last, the choice remembered per pocket; "All pockets" shows compact rows and no filters at every size
   70f  the rest: → Note content, 📎 Attach, the deck card, Trash and restore, drag ⠿ on a link item
   70g  sync: people/issues set on device A arrive on device B (two devices, one fake cloud)
   70h  scale: 300 link items at 390, CPU x4: the panel paints in <= 300 ms
   70i  contrast of the new text on the five presets (phone and laptop shapes, panel and deck)

   `--only=70a,70c` runs just those. Each printed ok/FAIL line becomes one app-check check (block 70). */
import { playwright, serve, seedDB, touchDrag } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, quiet, check, results } from './s1-fake.mjs';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);

const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];
const T0 = '2026-10-01T00:00:00.000Z';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const YT1 = 'https://www.youtube.com/watch?v=AAAAAAAAAAA', YT2 = 'https://youtu.be/BBBBBBBBBBB';
const pw = await playwright();
const srv = await serve();
const browser = await pw.chromium.launch();

const mk = (id, text, order, extra = {}) => ({ id, pocketId: 'jp-link', text, done: false, folderIds: [], tags: [], kind: null, journal: false, order, createdAt: T0, updatedAt: T0, ...extra });
/* l1 Ann/Rent · l2 (no person, Rent+Tax, channel known) · l3 Bob (other site) · l4 nothing */
const linkItems = () => [
  mk('l1', YT1, 0, { url: YT1, ttl: 'Alpha video', ch: 'Chan One', th: 'https://i.ytimg.com/vi/AAAAAAAAAAA/mqdefault.jpg', people: ['Ann'], issues: ['Rent'] }),
  mk('l2', YT2, 1, { url: YT2, ttl: 'Beta video', ch: 'Chan Two', th: 'https://i.ytimg.com/vi/BBBBBBBBBBB/mqdefault.jpg', people: [], issues: ['Rent', 'Tax'] }),
  mk('l3', 'https://example.com/article read me', 2, { url: 'https://example.com/article', people: ['Bob'], issues: [] }),
  mk('l4', 'https://example.org/x', 3),
  { id: 'z1', pocketId: 'jp-task', text: 'A task', done: false, folderIds: [], tags: [], kind: null, journal: false, order: 0, createdAt: T0, updatedAt: T0, people: ['Zed'] },
];
const seed = (extra) => { const db = seedDB(T0); db.jeb = linkItems(); if (extra) extra(db); return db; };
const dev = async (cloud, name, vp, db, mode = {}) => {
  const d = await addDevice(browser, srv.base, cloud, name, { width: vp.w, height: vp.h }, vp.touch, db || seed());
  d.mode = { oembed: 'ok', thumb: 'ok', ...mode }; d.hits = { oembed: [], thumb: 0 };
  await d.ctx.route('**/www.youtube.com/oembed**', (r) => {
    const u = new URL(r.request().url()).searchParams.get('url'); d.hits.oembed.push(u);
    if (d.mode.oembed === 'fail') return r.abort();
    return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ title: 'Fixture title for ' + (u.split(/[=/]/).pop()), author_name: 'Fixture channel' }) });
  });
  await d.ctx.route('**/i.ytimg.com/**', (r) => { d.hits.thumb++; return d.mode.thumb === 'fail' ? r.abort() : r.fulfill({ status: 200, contentType: 'image/png', body: PNG }); });
  return d;
};
const act = (d, vp, sel) => (vp.touch ? d.page.locator(sel).first().tap() : d.page.locator(sel).first().click());
const until = async (fn, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await sleep(150); } return false; };
const rect = (d, sel) => d.page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; }, sel);
const item = (d, id) => on(d, (i) => JSON.parse(JSON.stringify(DB.jeb.find((x) => x.id === i) || null)), id);
const openPanel = async (d, vp, name = 'Links to read') => { await act(d, vp, `#jeb-bar .jeb-chip[title="${name}"]`); await d.page.waitForSelector('#jeb-panel.on', { timeout: 3000 }); await sleep(400); };
const rowIds = (d) => on(d, () => [...document.querySelectorAll('#jeb-panel .jeb-it')].map((e) => e.dataset.iid));
const menuOf = async (d, name) => { await d.page.locator(`#jeb-bar .jeb-chip[title="${name}"]`).first().click({ button: 'right' }); await d.page.waitForSelector('#jeb-menu'); await sleep(100); };
const noErr = (d, tag) => check(d.errors.length === 0, `${tag} no page errors`, d.errors.slice(0, 2).join(' · '));
const each = async (fn, vps = VPS, mode) => { for (const vp of vps) { const d = await dev(makeCloud(), 'D' + vp.name, vp, null, mode); try { await fn(d, vp); } finally { await d.ctx.close(); } } };

try {
  /* ══ 70a — the kind ══ */
  if (want('70a')) await each(async (d, vp) => {
    const t = `70a@${vp.name}`;
    const kinds = await on(d, () => jebPockets().map((p) => p.id + '=' + _jebType(p)));
    check(kinds.join('|') === 'jp-task=tasks|jp-idea=ideas|jp-link=links|jp-shop=shop', `${t} the seed pockets' kinds are derived from their ids`, kinds.join('|'));
    const np = await on(d, () => { const id = jebAddPocket('Mine', '✶', '#FFF1A8'); const p = jebPockets().find((x) => x.id === id); return [_jebType(p), 'ztype' in p, 'ztype' in DB.jebPockets.find((x) => x.id === 'jp-link')]; });
    check(np[0] === 'plain' && np[1] === false && np[2] === false, `${t} a new pocket is plain, and no ztype is written until the owner chooses one`, JSON.stringify(np));
    await menuOf(d, 'Links to read');
    const rows = await on(d, () => [...document.querySelectorAll('#jeb-menu .jm')].map((e) => e.textContent));
    check(rows.some((r) => r.includes('Pocket kind')), `${t} the pocket menu carries "🧩 Pocket kind ▸"`, rows.join(' / '));
    await act(d, vp, '#jeb-menu .jm:has-text("Pocket kind")'); await sleep(150);
    const sub = await on(d, () => [...document.querySelectorAll('#jeb-menu .jm')].map((e) => e.textContent));
    const ticked = sub.filter((r) => r.includes('✓'));
    check(['Plain', 'Links', 'Tasks', 'Ideas', 'Shopping'].every((k) => sub.some((r) => r.includes(k))) && ticked.length === 1 && ticked[0].includes('Links') && sub.filter((r) => /^[☑☐]/.test(r)).length === 5, `${t} five boxes, the current kind (Links) is the ticked one`, sub.join(' / '));
    await act(d, vp, '#jeb-menu .jm:has-text("Plain")'); await sleep(300);
    check((await item(d, 'l1')) && (await on(d, () => DB.jebPockets.find((p) => p.id === 'jp-link').ztype)) === 'plain', `${t} choosing Plain stores ztype on the pocket`);
    await openPanel(d, vp);
    const asPlain = await on(d, () => ({ link: document.querySelectorAll('#jeb-panel .jl-it').length, rows: document.querySelectorAll('#jeb-panel .jeb-it').length, filt: document.querySelectorAll('#jeb-panel .jl-filters,#jeb-panel .jl-bar').length, ph: document.getElementById('jeb-add-in').placeholder }));
    check(asPlain.link === 0 && asPlain.rows === 4 && asPlain.filt === 0 && asPlain.ph === 'Jot something…', `${t} as a Plain pocket the same 4 items show as ordinary rows`, JSON.stringify(asPlain));
    await menuOf(d, 'Links to read'); await act(d, vp, '#jeb-menu .jm:has-text("Pocket kind")'); await act(d, vp, '#jeb-menu .jm:has-text("Links")'); await sleep(400);
    const asLinks = await on(d, () => ({ link: document.querySelectorAll('#jeb-panel .jl-it').length, filt: document.querySelectorAll('#jeb-panel .jl-filters,#jeb-panel .jl-bar').length, ph: document.getElementById('jeb-add-in').placeholder, kind: _jebType(_jebPocket('jp-link')) }));
    check(asLinks.link === 4 && asLinks.filt === 1 && asLinks.kind === 'links' && asLinks.ph === 'Paste a link…', `${t} switching back to Links brings the link layout back`, JSON.stringify(asLinks));
    const tasks = await on(d, () => { jebEditPocket('jp-idea', { ztype: 'tasks' }); jebEditPocket('jp-shop', { ztype: 'nonsense' }); return [_jebType(_jebPocket('jp-idea')), _jebType(_jebPocket('jp-shop'))]; });
    check(tasks.join() === 'tasks,shop', `${t} jebEditPocket takes a valid ztype and ignores a bad one`, tasks.join());
    noErr(d, t);
  });

  /* ══ 70b — YouTube ══ */
  if (want('70b')) {
    await each(async (d, vp) => {
      const t = `70b@${vp.name}`;
      await openPanel(d, vp);
      const ta = '#jeb-add-in';
      await act(d, vp, ta); await d.page.keyboard.type('https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=5s watch this'); await d.page.keyboard.press('Enter');
      const filled = await until(async () => { const it = await on(d, () => DB.jeb.find((x) => /dQw4w9WgXcQ/.test(x.text))); return it && it.ttl; });
      const it = await on(d, () => DB.jeb.find((x) => /dQw4w9WgXcQ/.test(x.text)));
      check(filled && /^Fixture title for /.test(it.ttl), `${t} a pasted YouTube link gets its title from oEmbed`, JSON.stringify(it));
      check(it.ch === 'Fixture channel' && it.th === 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg' && it.url.startsWith('https://m.youtube.com/watch?v=dQw4w9WgXcQ'), `${t} channel, thumbnail (built from the id) and url are stored`, JSON.stringify(it));
      const shown = await on(d, () => { const r = [...document.querySelectorAll('#jeb-panel .jl-it')].find((e) => /dQw4w9WgXcQ/.test(DB.jeb.find((x) => x.id === e.dataset.iid).text)); const im = r && r.querySelector('.jl-th img'); return { title: r && r.querySelector('.jeb-tx').textContent, dom: r && r.querySelector('.jl-dom').textContent, src: im && im.src, w: im && im.naturalWidth }; });
      await sleep(300);
      check(/Fixture title/.test(shown.title) && /youtube\.com/.test(shown.dom) && /Fixture channel/.test(shown.dom) && /ytimg\.com\/vi\/dQw4w9WgXcQ\/mqdefault\.jpg$/.test(shown.src || ''), `${t} the row shows title, domain · channel and the thumbnail`, JSON.stringify(shown));
      const forms = await on(d, () => ['https://www.youtube.com/watch?v=aaaaaaaaaaa', 'https://youtu.be/bbbbbbbbbbb?si=x', 'https://www.youtube.com/shorts/ccccccccccc', 'https://m.youtube.com/watch?v=ddddddddddd', 'https://example.com/watch?v=eeeeeeeeeee', 'https://www.youtube.com/@someone'].map(_jebYtId));
      check(forms.join() === 'aaaaaaaaaaa,bbbbbbbbbbb,ccccccccccc,ddddddddddd,,', `${t} watch?v=, youtu.be/, shorts/, www. and m. all give the id; other sites and channel pages give none`, forms.join());
      const n0 = d.hits.oembed.length;
      await act(d, vp, ta); await d.page.keyboard.type('https://example.com/some/page'); await d.page.keyboard.press('Enter'); await sleep(900);
      const other = await on(d, () => { const x = DB.jeb.find((i) => i.text === 'https://example.com/some/page'); const r = document.querySelector(`#jeb-panel .jl-it[data-iid="${x.id}"]`); return { ttl: x.ttl, th: x.th, tx: r.querySelector('.jeb-tx').textContent, dom: r.querySelector('.jl-dom').textContent, img: r.querySelectorAll('img').length, fb: r.querySelector('.jl-fb').textContent }; });
      check(d.hits.oembed.length === n0 && !other.ttl && !other.th && other.tx === 'https://example.com/some/page' && other.dom === 'example.com' && other.img === 0 && /example\.com/.test(other.fb), `${t} another site: no fetch, the text is the title, the domain is under it, a ▶ box stands in for the picture`, JSON.stringify(other));
      noErr(d, t);
    });
    /* oEmbed failing (offline / blocked) */
    await each(async (d, vp) => {
      const t = `70b-fail@${vp.name}`;
      await openPanel(d, vp);
      const url = 'https://www.youtube.com/watch?v=FAILFAILFAI';
      await act(d, vp, '#jeb-add-in'); await d.page.keyboard.type(url); await d.page.keyboard.press('Enter'); await sleep(1200);
      const it = await on(d, () => DB.jeb.find((x) => /FAILFAILFAI/.test(x.text)));
      const row = await on(d, () => { const r = [...document.querySelectorAll('#jeb-panel .jl-it')].find((e) => /FAILFAILFAI/.test(e.querySelector('.jeb-tx').textContent)); return !!r; });
      check(it && !it.ttl && row && d.hits.oembed.length === 1, `${t} a failing oEmbed leaves a usable item: no title, the text shows, nothing blocked`, JSON.stringify({ it, row, hits: d.hits.oembed.length }));
      const toasts = await on(d, () => window.__toasts.filter((m) => /fail|error|offline|title/i.test(m)));
      check(toasts.length === 0 && !(await on(d, () => !!document.querySelector('.toast'))), `${t} no error is shown to the owner`, JSON.stringify(toasts));
      await act(d, vp, '#jeb-add-in'); await d.page.keyboard.type('second item'); await d.page.keyboard.press('Enter'); await sleep(900);
      const afterOne = d.hits.oembed.length;
      await act(d, vp, '#jeb-add-in'); await d.page.keyboard.type('third item'); await d.page.keyboard.press('Enter'); await sleep(900);
      await act(d, vp, '#jeb-add-in'); await d.page.keyboard.type('fourth item'); await d.page.keyboard.press('Enter'); await sleep(900);
      check(afterOne === 2 && d.hits.oembed.length === 2, `${t} one retry on the next showing, then no more (${afterOne} then ${d.hits.oembed.length} requests)`, JSON.stringify(d.hits.oembed));
      const typed = await on(d, () => DB.jeb.filter((x) => /item$/.test(x.text)).length);
      check(typed === 3, `${t} typing and saving were never blocked`, String(typed));
      noErr(d, t);
    }, VPS, { oembed: 'fail' });
    /* thumbnail failing */
    await each(async (d, vp) => {
      const t = `70b-thumb@${vp.name}`;
      await openPanel(d, vp);
      await sleep(900);
      const st = await on(d, () => { const ims = [...document.querySelectorAll('#jeb-panel .jl-th img')]; return { imgs: ims.length, broken: ims.filter((i) => i.complete && i.naturalWidth === 0).length, fb: [...document.querySelectorAll('#jeb-panel .jl-th .jl-fb')].map((e) => e.textContent) }; });
      check(st.imgs === 0 && st.broken === 0 && st.fb.length === 4 && st.fb.some((x) => /youtube\.com/.test(x)) && st.fb.every((x) => x.startsWith('▶')), `${t} a picture that fails to load becomes a ▶ box with the domain, never a broken image`, JSON.stringify(st));
      const col = await on(d, () => ({ bg: getComputedStyle(document.querySelector('#jeb-panel .jl-fb')).backgroundColor, pk: _jebPocket('jp-link').color }));
      check(!!col.bg && col.bg !== 'rgba(0, 0, 0, 0)', `${t} the box is painted in the pocket's colour`, JSON.stringify(col));
      noErr(d, t);
    }, VPS, { thumb: 'fail' });
  }

  /* ══ 70c — pickers ══ */
  if (want('70c')) await each(async (d, vp) => {
    const t = `70c@${vp.name}`;
    await openPanel(d, vp);
    const sug = () => on(d, () => [...document.querySelectorAll('#jeb-panel .jl-sug')].map((e) => e.textContent));
    const s0 = await sug();
    check(s0.join('|') === '👤 Add Chan Two?', `${t} only the item with a known channel and no person suggests it: "${s0.join('|')}"`);
    const n0 = (await item(d, 'l2')).people;
    check(n0.length === 0, `${t} nothing was assigned automatically`, JSON.stringify(n0));
    await act(d, vp, '#jeb-panel .jl-sug'); await sleep(400);
    check(JSON.stringify((await item(d, 'l2')).people) === '["Chan Two"]' && (await sug()).length === 0, `${t} tapping the suggestion adds the channel as the person, and it goes away`);
    /* 👤 on l3 (Bob) */
    await act(d, vp, '#jeb-panel .jl-it[data-iid="l3"] .jl-p-b');
    await d.page.waitForSelector('#ov.on .jl-pkrow'); await sleep(200);
    const names = await on(d, () => [...document.querySelectorAll('#ov .jl-pkrow')].map((e) => e.textContent + (e.querySelector('input').checked ? '✓' : '')));
    check(names.join('|') === 'Ann|Bob✓|Chan Two' && !names.some((n) => /Zed/.test(n)), `${t} the 👤 picker lists this pocket's names with Bob ticked, and not another pocket's (Zed)`, names.join('|'));
    await act(d, vp, '#ov .jl-pkrow:has-text("Ann")'); await sleep(300);
    check(JSON.stringify((await item(d, 'l3')).people.sort()) === '["Ann","Bob"]', `${t} ticking Ann adds a second person`);
    await act(d, vp, '#ov .jl-pkrow:has-text("Bob")'); await sleep(300);
    check(JSON.stringify((await item(d, 'l3')).people) === '["Ann"]', `${t} unticking Bob removes him`);
    await act(d, vp, '#jl-pk-in'); await d.page.keyboard.type('Cara'); await d.page.keyboard.press('Enter'); await sleep(300);
    const afterNew = await on(d, () => [...document.querySelectorAll('#ov .jl-pkrow')].map((e) => e.textContent + (e.querySelector('input').checked ? '✓' : '')));
    check(JSON.stringify((await item(d, 'l3')).people.sort()) === '["Ann","Cara"]' && afterNew.includes('Cara✓'), `${t} "New…" adds Cara, ticked`, afterNew.join('|'));
    await act(d, vp, '#jl-pk-done'); await sleep(300);
    check(!(await on(d, () => document.getElementById('ov').classList.contains('on'))), `${t} Done closes the picker`);
    const chips = await on(d, () => document.querySelector('#jeb-panel .jl-it[data-iid="l3"] .jeb-chips').textContent);
    check(/👤 Ann/.test(chips) && /👤 Cara/.test(chips), `${t} the item shows its people as chips`, chips);
    /* # on l4 */
    await act(d, vp, '#jeb-panel .jl-it[data-iid="l4"] .jl-i-b');
    await d.page.waitForSelector('#ov.on .jl-pkrow'); await sleep(200);
    const inames = await on(d, () => [...document.querySelectorAll('#ov .jl-pkrow')].map((e) => e.textContent));
    check(inames.join('|') === 'Rent|Tax', `${t} the # picker lists this pocket's issues`, inames.join('|'));
    await act(d, vp, '#ov .jl-pkrow:has-text("Rent")'); await act(d, vp, '#ov .jl-pkrow:has-text("Tax")'); await sleep(200);
    await act(d, vp, '#jl-pk-in'); await d.page.keyboard.type('Gas'); await act(d, vp, '#jl-pk-add'); await sleep(300);
    check(JSON.stringify((await item(d, 'l4')).issues.sort()) === '["Gas","Rent","Tax"]', `${t} a link can hold several issues`, JSON.stringify((await item(d, 'l4')).issues));
    await act(d, vp, '#jl-pk-done'); await sleep(200);
    /* the ⋯ menu reaches the same pickers */
    await act(d, vp, '#jeb-panel .jl-it[data-iid="l1"] .jeb-more'); await act(d, vp, '#jeb-menu .jm:has-text("Person")');
    check(await d.page.waitForSelector('#ov.on .jl-pkrow', { timeout: 2000 }).then(() => true, () => false), `${t} the item's ⋯ menu opens the same picker`);
    await act(d, vp, '#jl-pk-done');
    noErr(d, t);
  });

  /* ══ 70d — phone ══ */
  if (want('70d')) await each(async (d, vp) => {
    const t = '70d@390';
    await openPanel(d, vp);
    const lay = await on(d, () => { const q = (s) => [...document.querySelectorAll(s)]; const th = document.querySelector('#jeb-panel .jl-c .jl-th'); const r = th.getBoundingClientRect(); const rows = q('#jeb-panel .jl-frow').map((e) => e.getAttribute('aria-label') + ':' + q('#jeb-panel .jl-frow').indexOf(e) + ':' + [...e.querySelectorAll('.jl-fc')].map((b) => b.textContent).join(',')); return { rows, w: Math.round(r.width), h: Math.round(r.height), cards: q('#jeb-panel .jl-card').length, grid: q('#jeb-panel .jl-grid').length, bar: q('#jeb-panel .jl-bar').length, panelW: Math.round(document.getElementById('jeb-panel').getBoundingClientRect().width) }; });
    check(lay.rows.length === 2 && /^👤 Person:0:All,Ann,Bob$/.test(lay.rows[0]) && /^# Issue:1:All,Rent,Tax$/.test(lay.rows[1]), `${t} two filter rows, Person then Issue, each All + the pocket's names`, lay.rows.join(' / '));
    check(lay.w === 96 && Math.abs(lay.h - 54) <= 1 && lay.cards === 0 && lay.grid === 0 && lay.bar === 0, `${t} compact rows with a 96 px wide 16:9 thumbnail (${lay.w}x${lay.h}); no cards or grid`, JSON.stringify(lay));
    check((await rowIds(d)).join() === 'l1,l2,l3,l4', `${t} All / All shows every link`, (await rowIds(d)).join());
    const tapF = (k, v) => act(d, vp, `#jeb-panel .jl-fc[data-fk="${k}"][data-fv="${v}"]`).then(() => sleep(300));
    await tapF('p', 'Ann'); const a = (await rowIds(d)).join();
    await tapF('p', ''); await tapF('i', 'Rent'); const b = (await rowIds(d)).join();
    await tapF('p', 'Ann'); const c = (await rowIds(d)).join();
    await tapF('i', 'Tax'); const e = (await rowIds(d)).join(); const empty = await on(d, () => /No links match/.test(document.querySelector('#jeb-panel .jeb-list').textContent));
    await tapF('p', 'Bob'); await tapF('i', ''); const f = (await rowIds(d)).join();
    check(a === 'l1' && b === 'l1,l2' && c === 'l1' && e === '' && empty && f === 'l3', `${t} the filters combine: Ann → ${a}; Rent → ${b}; Ann+Rent → ${c}; Ann+Tax → none (${empty ? 'says so' : 'silent'}); Bob → ${f}`);
    const sel = await on(d, () => [...document.querySelectorAll('#jeb-panel .jl-fc.on')].map((x) => x.textContent).join('|'));
    check(sel === 'Bob|All', `${t} the chosen chips are marked`, sel);
    const saved = await on(d, () => JSON.stringify(DB.theme.zabLinkView));
    check(JSON.parse(saved)['jp-link'].p === 'Bob', `${t} the choice is stored per pocket in DB.theme.zabLinkView`, saved);
    await act(d, vp, '#jeb-panel .jeb-x'); await sleep(300); await openPanel(d, vp);
    check((await rowIds(d)).join() === 'l3', `${t} closing and reopening the panel keeps the filter`);
    await d.page.reload({ waitUntil: 'domcontentloaded' }); await d.page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('jeb-bar')); await sleep(500);
    await openPanel(d, vp);
    check((await rowIds(d)).join() === 'l3', `${t} ...and so does a reload`);
    await tapF('p', ''); await tapF('i', 'Tax'); await sleep(300);
    await act(d, vp, '#jeb-panel .jeb-x'); await sleep(200);
    await openPanel(d, vp, 'Ideas'); const other = await on(d, () => document.querySelectorAll('#jeb-panel .jl-filters').length);
    check(other === 0, `${t} another pocket (Ideas) is untouched by it`);
    noErr(d, t);
  }, [VPS[0]]);

  /* ══ 70e — tablet and laptop ══ */
  if (want('70e')) await each(async (d, vp) => {
    const t = `70e@${vp.name}`;
    await openPanel(d, vp);
    const geo = await on(d, () => { const q = (s) => [...document.querySelectorAll(s)]; const cs = q('#jeb-panel .jl-card'); const xs = new Set(cs.map((c) => Math.round(c.getBoundingClientRect().left))); return { cards: cs.length, minW: Math.round(Math.min(...cs.map((c) => c.getBoundingClientRect().width))), cols: xs.size, filt: q('#jeb-panel .jl-filters').length, bar: q('#jeb-panel .jl-bar').length, panelW: Math.round(document.getElementById('jeb-panel').getBoundingClientRect().width), vw: innerWidth, btn: q('#jeb-panel .jl-gb').map((b) => b.textContent + (b.classList.contains('on') ? '*' : '')) }; });
    check(geo.cards === 4 && geo.minW >= 200 && geo.cols >= 2 && geo.filt === 0 && geo.bar === 1 && geo.panelW > 380, `${t} cards in a grid (${geo.cols} columns, each ≥ 200 px: ${geo.minW}); no phone filter rows; a wider panel (${geo.panelW})`, JSON.stringify(geo));
    check(geo.btn.join('|') === '👤 People*|# Issues', `${t} "Group by: People | Issues", People first`, geo.btn.join('|'));
    const groups = () => on(d, () => [...document.querySelectorAll('#jeb-panel .jl-gh')].map((g, i) => g.querySelector('b').textContent.trim() + ' ' + g.querySelector('small').textContent + ':' + [...g.nextElementSibling.querySelectorAll('.jeb-it')].map((e) => e.dataset.iid).join('+')));
    const g1 = (await groups()).join(' | ');
    check(g1 === '👤 Ann 1:l1 | 👤 Bob 1:l3 | No person yet 2:l2+l4', `${t} grouped by People, with counts; items with no person last as "No person yet"`, g1);
    await act(d, vp, '#jeb-panel .jl-gb[data-g="issues"]'); await sleep(300);
    const g2 = (await groups()).join(' | ');
    check(g2 === '# Rent 2:l1+l2 | # Tax 1:l2 | No issue yet 2:l3+l4', `${t} grouped by Issues (an item with two issues sits in both), "No issue yet" last`, g2);
    const mark = await on(d, () => [...document.querySelectorAll('#jeb-panel .jl-gb.on')].map((b) => b.textContent).join());
    check(mark === '# Issues', `${t} the chosen grouping is marked`, mark);
    await act(d, vp, '#jeb-panel .jeb-x'); await sleep(300); await openPanel(d, vp);
    check((await groups())[0].startsWith('# Rent'), `${t} the grouping is remembered when the panel is reopened`);
    check(JSON.parse(await on(d, () => JSON.stringify(DB.theme.zabLinkView)))['jp-link'].g === 'issues', `${t} stored as DB.theme.zabLinkView['jp-link'].g`);
    await d.page.reload({ waitUntil: 'domcontentloaded' }); await d.page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('jeb-bar')); await sleep(500);
    await openPanel(d, vp); check((await groups())[0].startsWith('# Rent'), `${t} ...and after a reload`);
    /* All pockets: compact rows, no filters, even here */
    await act(d, vp, '#jeb-bar .jeb-chip.jeb-all .jeb-main, #jeb-bar .jeb-chip.jeb-all'); await sleep(500);
    const all = await on(d, () => { const g = document.querySelector('#jeb-panel .jeb-gl[data-pid="jp-link"]'); const th = g && g.querySelector('.jl-th'); return { rows: g ? g.querySelectorAll('.jl-c').length : 0, cards: document.querySelectorAll('#jeb-panel .jl-card').length, ctl: document.querySelectorAll('#jeb-panel .jl-filters,#jeb-panel .jl-bar,#jeb-panel .jl-gh').length, w: th && Math.round(th.getBoundingClientRect().width), add: getComputedStyle(document.querySelector('#jeb-panel .jeb-add')).display }; });
    check(all.rows === 4 && all.cards === 0 && all.ctl === 0 && all.w === 96 && all.add === 'none', `${t} "All pockets": the links group shows compact rows (96 px thumbnails), no filters, no grouping`, JSON.stringify(all));
    noErr(d, t);
  }, [VPS[1], VPS[2]]);

  /* ══ 70f — the rest ══ */
  if (want('70f')) await each(async (d, vp) => {
    const t = `70f@${vp.name}`;
    await openPanel(d, vp);
    /* → Note */
    await act(d, vp, '#jeb-panel .jl-it[data-iid="l1"] .jeb-note-b'); await sleep(700);
    const note = await on(d, () => { const n = DB.articles.find((a) => a.fromJeb); return n && { title: n.title, c: n.content, gone: !DB.jeb.some((x) => x.id === 'l1') }; });
    check(note && note.gone && note.title === 'Alpha video' && note.c.includes('<a href="' + YT1 + '">Alpha video</a>'), `${t} → Note: the title is a link to the URL, and the item is gone`, JSON.stringify(note));
    check(note && note.c.includes('<img src="https://i.ytimg.com/vi/AAAAAAAAAAA/mqdefault.jpg"') && note.c.includes('👤 Ann · # Rent'), `${t} → Note: the thumbnail and the line "👤 Ann · # Rent"`, note && note.c);
    await d.page.evaluate(() => { document.querySelectorAll('.toast-act').forEach((x) => x.remove()); });
    if (!(await d.page.evaluate(() => document.getElementById('jeb-panel').classList.contains('on')))) await openPanel(d, vp);
    /* 📎 Attach */
    await act(d, vp, '#jeb-panel .jl-it[data-iid="l3"] .jeb-att-b'); await d.page.waitForSelector('#jeb-att'); await sleep(200);
    await act(d, vp, '#jeb-att [data-tab="journal"]'); await act(d, vp, '#jeb-att .ja-row[data-journal]'); await sleep(300);
    check((await item(d, 'l3')).journal === true && (await item(d, 'l3')).people.join() === 'Bob', `${t} 📎 Attach (Journal) works on a link item and its people stay`);
    await act(d, vp, '#jeb-att .ja-x'); await sleep(200);
    const chip = await on(d, () => /Journal/.test(document.querySelector('#jeb-panel .jl-it[data-iid="l3"] .jeb-chips').textContent));
    check(chip, `${t} ...and the chip shows on the row`);
    /* Move to pocket + back keeps the fields */
    await act(d, vp, '#jeb-panel .jl-it[data-iid="l4"] .jeb-more'); await act(d, vp, '#jeb-menu .jm:has-text("Move to pocket")'); await act(d, vp, '#jeb-menu .jm:has-text("Ideas")'); await sleep(400);
    const mv = await on(d, () => { const x = DB.jeb.find((i) => i.id === 'l4'); return x.pocketId; });
    check(mv === 'jp-idea' && !(await rowIds(d)).includes('l4'), `${t} Move to pocket works on a link item`, mv);
    await on(d, () => { jebMoveItem('l4', 'jp-link', 0); }); await sleep(200);
    /* the deck */
    await act(d, vp, '#jeb-panel .jeb-px'); await d.page.waitForSelector('#jeb-deck.on .jl-dcard'); await sleep(700);
    const deck = await on(d, () => { const c = document.querySelector('#jeb-deck .jl-dcard[data-iid="l2"]'); const kids = [...c.children].map((e) => e.className.split(' ')[0]); return { kids, title: c.querySelector('.jeb-tx').textContent, img: !!c.querySelector('.jl-th img'), n: document.querySelectorAll('#jeb-deck .jl-dcard').length, ph: c.querySelector('.jl-th').getBoundingClientRect().bottom <= c.querySelector('.jeb-tx').getBoundingClientRect().top + 1 }; });
    check(deck.n === 3 && deck.kids.indexOf('jl-th') < deck.kids.indexOf('jeb-tx') && deck.title === 'Beta video' && deck.ph, `${t} the deck card: the thumbnail on top, then the title (${deck.title})`, JSON.stringify(deck));
    await act(d, vp, '#jeb-deck .jl-dcard[data-iid="l2"] .jeb-more'); await act(d, vp, '#jeb-menu .jm:has-text("Delete")'); await sleep(400);
    const inTrash = await on(d, () => { const e = DB.trash.find((x) => x.type === 'jebItem' && x.item.id === 'l2'); return e && { id: e.id, ppl: e.item.people, iss: e.item.issues, ttl: e.item.ttl }; });
    check(inTrash && inTrash.ttl === 'Beta video' && inTrash.iss.join() === 'Rent,Tax' && !(await item(d, 'l2')), `${t} Delete from the deck sends the link to Trash with all its fields`, JSON.stringify(inTrash));
    await on(d, (tid) => { restoreItem(tid); }, inTrash.id); await sleep(400);
    const back = await item(d, 'l2');
    check(back && back.ttl === 'Beta video' && back.ch === 'Chan Two' && back.th.endsWith('BBBBBBBBBBB/mqdefault.jpg') && back.issues.join() === 'Rent,Tax' && back.pocketId === 'jp-link', `${t} restoring from Trash brings every link field back`, JSON.stringify(back));
    noErr(d, t);
  });
  /* drag ⠿ on link items: touch drag in the compact list (390), mouse in the grid (820/1440 ... mouse) */
  if (want('70f')) await each(async (d, vp) => {
    const t = `70f-drag@${vp.name}`;
    await openPanel(d, vp);
    await d.page.locator('#jeb-panel .jl-it[data-iid="l4"] .jeb-grip').scrollIntoViewIfNeeded(); await sleep(200);
    const g = await d.page.locator('#jeb-panel .jl-it[data-iid="l4"] .jeb-grip').boundingBox();
    const target = await d.page.locator(vp.w < 640 ? '#jeb-panel .jl-it[data-iid="l3"]' : '#jeb-panel .jl-it[data-iid="l2"]').boundingBox();
    const from = { x: g.x + g.width / 2, y: g.y + g.height / 2 }, to = vp.w < 640 ? { x: from.x, y: target.y + 4 } : { x: target.x + 12, y: target.y + 12 };
    if (vp.touch) { const pts = Array.from({ length: 14 }, (_, i) => ({ x: from.x + (to.x - from.x) * ((i + 1) / 14), y: from.y + (to.y - from.y) * ((i + 1) / 14) })); await touchDrag(d.page, [from, ...pts]); }
    else { await d.page.mouse.move(from.x, from.y); await d.page.mouse.down(); for (let i = 1; i <= 14; i++) await d.page.mouse.move(from.x + (to.x - from.x) * (i / 14), from.y + (to.y - from.y) * (i / 14)); await d.page.mouse.up(); }
    await sleep(500);
    const order = await on(d, () => jebItems('jp-link').map((x) => x.id).join());
    const want_ = vp.w < 640 ? 'l1,l2,l4,l3' : 'l1,l4,l2,l3';
    check(order === want_, `${t} dragging ⠿ on a link item reorders it (${vp.touch ? 'touch' : 'mouse'}): ${order}`, order);
    noErr(d, t);
  });

  /* ══ 70g — sync ══ */
  if (want('70g')) {
    const cloud = makeCloud();
    const A = await dev(cloud, 'A', VPS[2]), B = await dev(cloud, 'B', VPS[2]);
    try {
      await sleep(1500);
      await on(A, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.content += '<p>x</p>'; a.updatedAt = new Date().toISOString(); persist(); flushPendingPush(); });
      await sleep(800); await quiet(cloud, A); await quiet(cloud, B);
      await openPanel(A, VPS[2]); await openPanel(B, VPS[2]);
      await act(A, VPS[2], '#jeb-panel .jl-it[data-iid="l4"] .jl-p-b'); await A.page.waitForSelector('#ov.on #jl-pk-in');
      await A.page.locator('#jl-pk-in').fill('Dana'); await A.page.keyboard.press('Enter'); await sleep(200); await A.page.locator('#jl-pk-done').click();
      await act(A, VPS[2], '#jeb-panel .jl-it[data-iid="l4"] .jl-i-b'); await A.page.waitForSelector('#ov.on #jl-pk-in');
      await A.page.locator('#jl-pk-in').fill('Move'); await A.page.keyboard.press('Enter'); await sleep(200); await A.page.locator('#jl-pk-done').click();
      await sleep(500); await quiet(cloud, A);
      let ok = false; for (let i = 0; i < 60 && !ok; i++) { const x = await item(B, 'l4'); ok = !!x && (x.people || []).join() === 'Dana' && (x.issues || []).join() === 'Move'; if (!ok) await sleep(500); }
      const x = await item(B, 'l4');
      check(ok, '70g people and issues set on A arrive on B', JSON.stringify(x));
      const shown = await on(B, () => document.querySelector('#jeb-panel .jl-it[data-iid="l4"]') ? [...document.querySelectorAll('#jeb-panel .jl-gh b')].map((e) => e.textContent.trim()).join('|') : 'row missing');
      check(/Dana/.test(shown), '70g B\'s OPEN panel regroups live without a reload', shown);
      /* B changes the same item's person; the other fields written by A survive */
      await on(B, () => { jebEditItem('l4', { people: ['Dana', 'Eli'] }); });
      await sleep(500); await quiet(cloud, B);
      let ok2 = false; for (let i = 0; i < 60 && !ok2; i++) { const y = await item(A, 'l4'); ok2 = !!y && (y.people || []).join() === 'Dana,Eli' && (y.issues || []).join() === 'Move'; if (!ok2) await sleep(500); }
      check(ok2, '70g ...and B\'s edit comes back to A', JSON.stringify(await item(A, 'l4')));
      const view = async (d) => on(d, () => JSON.stringify((DB.theme.zabLinkView || {})['jp-link'] || null));
      await on(A, () => { _jebLinkSetView('jp-link', { g: 'issues' }); flushPendingPush(); });
      let ok3 = false; for (let i = 0; i < 60 && !ok3; i++) { ok3 = /"g":"issues"/.test(await view(B)); if (!ok3) await sleep(500); }
      check(ok3, '70g the Group by choice syncs too (it rides DB.theme)', await view(B));
      check(A.errors.length + B.errors.length === 0, '70g no page errors', [...A.errors, ...B.errors].slice(0, 2).join(' · '));
    } finally { await A.ctx.close(); await B.ctx.close(); }
  }

  /* ══ 70h — scale ══ */
  if (want('70h')) {
    const vp = VPS[0];
    const big = seed((db) => {
      db.jeb = db.jeb.filter((x) => x.pocketId !== 'jp-link');
      for (let i = 0; i < 300; i++) { const id = 'v' + String(i).padStart(11, '0').slice(-11), u = 'https://www.youtube.com/watch?v=' + id; db.jeb.push(mk('b' + i, u, i, { url: u, ttl: 'Video number ' + i + ' with a fairly long title to wrap', ch: 'Channel ' + (i % 9), th: 'https://i.ytimg.com/vi/' + id + '/mqdefault.jpg', people: ['P' + (i % 12)], issues: ['I' + (i % 7)] })); }
    });
    const d = await dev(makeCloud(), 'S', vp, big);
    try {
      const cdp = await d.ctx.newCDPSession(d.page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const times = [];
      for (let k = 0; k < 4; k++) {
        const ms = await d.page.evaluate(() => new Promise((res) => {
          jebClosePanel(); const t0 = performance.now(); jebOpenPanel('jp-link');
          requestAnimationFrame(() => requestAnimationFrame(() => res(Math.round(performance.now() - t0))));
        }));
        times.push(ms); await sleep(300);
      }
      const rows = await on(d, () => document.querySelectorAll('#jeb-panel .jl-it').length);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      console.log('Z6A-SCALE ' + JSON.stringify({ items: 300, times }));
      check(rows === 300 && Math.max(...times) <= 300, `70h 300 link items at 390, CPU ×4: the panel paints in ≤ 300 ms (${times.join(' / ')} ms)`, JSON.stringify({ rows, times }));
      noErr(d, '70h');
    } finally { await d.ctx.close(); }
  }

  /* ══ 70i — contrast ══ */
  if (want('70i')) await each(async (d, vp) => {
    const wide = vp.w >= 640;
    await openPanel(d, vp);
    const measure = (sel) => d.page.evaluate((S) => {
      const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
      const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
      const bgOf = (el) => { const layers = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; } } let base = { r: 255, g: 255, b: 255 }; for (let i = layers.length - 1; i >= 0; i--) { const c = layers[i]; base = { r: c.r * c.a + base.r * (1 - c.a), g: c.g * c.a + base.g * (1 - c.a), b: c.b * c.a + base.b * (1 - c.a) }; } return base; };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      let worst = 99, who = '', n = 0;
      document.querySelectorAll(S).forEach((e) => {
        if (![...e.childNodes].some((x) => x.nodeType === 3 && x.textContent.trim())) return;
        const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return;
        const fg = parse(cs.color), bg = bgOf(e);
        const comp = fg.a < 1 ? { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) } : fg;
        n++; const r = ratio(comp, bg); if (r < worst) { worst = r; who = e.className + ':' + e.textContent.trim().slice(0, 14); }
      });
      return { worst: Math.round(worst * 100) / 100, who, n };
    }, sel);
    const newText = '#jeb-panel .jl-it *, #jeb-panel .jl-filters *, #jeb-panel .jl-bar *, #jeb-panel .jl-gh *, #jeb-panel .jl-sug';
    for (const p of ['forest', 'ocean', 'amber', 'indigo', 'rose']) {
      await on(d, (k) => { applyPreset(k); }, p); await sleep(200);
      const m = await measure(newText);
      check(m.n >= 20 && m.worst >= 4.5, `70i@${vp.name} the Links text (${m.n} pieces: ${wide ? 'cards, group bar, headers' : 'rows, filter chips'}, suggestion chip, fallback box) clears 4.5:1 on ${p} (worst ${m.worst}, ${m.who})`, JSON.stringify(m));
    }
    await on(d, () => { applyPreset('forest'); setCustomColor('accent', '#F4E27A'); }); await sleep(200);
    const pm = await measure(newText);
    check(pm.worst >= 4.5, `70i@${vp.name} ...and on a pale custom accent (worst ${pm.worst}, ${pm.who})`, JSON.stringify(pm));
    await on(d, () => { applyPreset('ocean'); jebOpenDeck({ ids: ['jp-link'], all: false }); }); await sleep(700);
    const dk = await measure('#jeb-deck .jl-dcard .jeb-tx, #jeb-deck .jl-dcard .jl-dom, #jeb-deck .jl-dcard .jeb-chips *, #jeb-deck .jl-dcard .jl-sug, #jeb-deck .jl-dcard .jl-fb');
    check(dk.n >= 8 && dk.worst >= 4.5, `70i@${vp.name} the deck's link cards clear 4.5:1 (worst ${dk.worst}, ${dk.who})`, JSON.stringify(dk));
  });
} catch (e) {
  console.log(' FAIL  zab-z6a threw: ' + (e && e.stack || e));
  results.push({ ok: false, label: 'threw' });
} finally {
  await browser.close();
  await srv.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
