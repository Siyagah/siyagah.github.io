#!/usr/bin/env node
/* tools/jeb-j3.mjs — v05.02, J3: 📎 Attach, → Note and the "From Jeb" Smart View (checks 63a–63g).

   Every check runs at 390x844, 820x1180 and 1440x900 against a booted app, with real clicks / taps / typing
   (a touch viewport TAPS, the 1440 one CLICKS), and counts page errors. Data a check needs is seeded before boot.

   63a  📎 Attach opens from the row button and from ⋯; each tab attaches (2 folders found by search, a tag, a new
        tag "Qur'an" via Create, a Note Type then a different one then cleared, Journal); the row shows the chips;
        a reload keeps them; Escape closes the sheet but not the panel
   63b  Attach syncs: device A attaches, device B shows the chips without a reload
   63c  → Note: title, body, folders, tags, Note Type, journal tag, fromJeb; the item leaves the pocket on BOTH
        devices; the toast names the right place (folder / Journal / From Jeb); "Open note" opens that note
   63d  an empty item is refused with a toast and nothing changes
   63e  "From Jeb" is reached by a real sidebar click, lists the notes newest first with the right count, and shows
        its empty state when there are none
   63f  "👝 from <pocket>" on the Pane 2 card and in the read view clears 4.5:1 on all five presets
   63g  layout: the sheet/popover is fully on screen; row buttons >= 40px; item text >= 160px; no horizontal
        overflow in the panel with 6 tags attached

   `--only=63a,63c` runs just those. Each printed ok/FAIL line becomes one app-check check (block 63). */
import { playwright, serve, seedDB } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, quiet, check, results, reopen } from './s1-fake.mjs';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);

const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];
const T0 = '2026-10-01T00:00:00.000Z';
const pw = await playwright();
const srv = await serve();
const browser = await pw.chromium.launch();

const mkItem = (id, pocketId, text, order, extra = {}) => ({ id, pocketId, text, done: false, folderIds: [], tags: [], kind: null, journal: false, order, createdAt: T0, updatedAt: T0, ...extra });
const seed = (extra) => { const db = seedDB(T0); db.jeb = [mkItem('t1', 'jp-task', 'Alpha item\nsecond line of alpha', 0), mkItem('t2', 'jp-task', 'Bravo', 1), mkItem('t3', 'jp-task', 'Charlie', 2)]; if (extra) extra(db); return db; };
const dev = (cloud, name, vp, db) => addDevice(browser, srv.base, cloud, name, { width: vp.w, height: vp.h }, vp.touch, db || seed());
const act = (d, vp, sel) => (vp.touch ? d.page.locator(sel).first().tap() : d.page.locator(sel).first().click());
const rect = (d, sel) => d.page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; }, sel);
const item = (d, id) => on(d, (i) => JSON.parse(JSON.stringify((DB.jeb || []).find((x) => x.id === i) || null)), id);
const openPanel = async (d, vp, name) => { await act(d, vp, `#jeb-bar .jeb-chip[title="${name}"]`); await d.page.waitForSelector('#jeb-panel.on', { timeout: 3000 }); await sleep(300); };
const noErr = (d, tag) => check(d.errors.length === 0, `${tag} no page errors`, d.errors.slice(0, 2).join(' · '));
const each = async (fn) => { for (const vp of VPS) { const d = await dev(makeCloud(), 'D' + vp.name, vp); try { await fn(d, vp); } finally { await d.ctx.close(); } } };
const row = (id) => `#jeb-panel .jeb-it[data-iid="${id}"]`;
const typeIn = async (d, text) => { const i = d.page.locator('#ja-q-in'); await i.click(); await d.page.keyboard.press('Control+A'); await d.page.keyboard.press('Delete'); if (text) await i.pressSequentially(text); await sleep(150); };
const chipsText = (d, id) => on(d, (i) => { const e = document.querySelector(`#jeb-panel .jeb-it[data-iid="${i}"] .jeb-chips`); return e ? e.innerText.replace(/\s+/g, ' ').trim() : ''; }, id);
const toastText = (d) => on(d, () => { const e = document.querySelector('.toast-act'); return e ? e.innerText.replace(/\s+/g, ' ').trim() : ''; });
const kindIds = (d) => on(d, () => noteKinds().map((k) => k.id));
const FN = '(002) Second Folder', FS = '(001) Seeded Folder';

try {
  /* ══ 63a — the Attach sheet ══ */
  if (want('63a')) await each(async (d, vp) => {
    const t = `63a@${vp.name}`;
    await openPanel(d, vp, 'Quick tasks');
    /* from the row button */
    await act(d, vp, `${row('t1')} .jeb-att-b`); await d.page.waitForSelector('#jeb-att', { timeout: 3000 });
    const tabs = await on(d, () => [...document.querySelectorAll('#jeb-att [data-tab]')].map((b) => b.textContent.trim()));
    check(tabs.length === 4 && /Folder/.test(tabs[0]) && /Tag/.test(tabs[1]) && /Note Type/.test(tabs[2]) && /Journal/.test(tabs[3]), `${t} 📎 Attach opens from the row button with 4 tabs`, tabs.join(' | '));
    /* Escape closes the sheet, not the panel */
    await d.page.keyboard.press('Escape'); await sleep(250);
    check(!(await on(d, () => !!document.getElementById('jeb-att'))) && (await on(d, () => document.getElementById('jeb-panel').classList.contains('on'))), `${t} Escape closes the sheet and leaves the panel open`);
    /* from ⋯ */
    await act(d, vp, `${row('t1')} .jeb-more`);
    const menu = await on(d, () => [...document.querySelectorAll('#jeb-menu .jm')].map((e) => e.textContent));
    check(menu.some((m) => /Attach/.test(m)) && menu.some((m) => /→ Note/.test(m)), `${t} ⋯ has 📎 Attach and → Note, each with a word`, menu.join(' / '));
    await act(d, vp, '#jeb-menu .jm:has-text("Attach")'); await d.page.waitForSelector('#jeb-att', { timeout: 3000 }); await sleep(200);
    check(true, `${t} 📎 Attach opens from ⋯ too`);
    /* Folder: two found by search */
    await typeIn(d, 'Second');
    const firstRow = await on(d, () => { const r = document.querySelector('#jeb-att .ja-row'); return r ? { fid: r.dataset.fid, txt: r.innerText.replace(/\s+/g, ' ') } : null; });
    check(!!firstRow && firstRow.fid === 'f2' && /My Notebooks › \(002\) Second Folder/.test(firstRow.txt), `${t} Folder: the search finds it and shows its path`, JSON.stringify(firstRow));
    await act(d, vp, '#jeb-att .ja-row[data-fid="f2"]'); await sleep(200);
    await typeIn(d, 'Seeded'); await act(d, vp, '#jeb-att .ja-row[data-fid="f1"]'); await sleep(200);
    let it = await item(d, 't1');
    check(it.folderIds.length === 2 && it.folderIds.includes('f1') && it.folderIds.includes('f2'), `${t} Folder: two folders attached, sheet still open`, JSON.stringify(it.folderIds));
    await typeIn(d, '');
    const order = await on(d, () => [...document.querySelectorAll('#jeb-att .ja-row')].slice(0, 2).map((r) => r.classList.contains('on')));
    check(order[0] === true && order[1] === true, `${t} Folder: ticked folders are listed first`, JSON.stringify(order));
    /* Tag */
    await act(d, vp, '#jeb-att [data-tab="tag"]'); await sleep(200);
    await typeIn(d, 'seed'); await act(d, vp, '#jeb-att .ja-row[data-tag="seed"]'); await sleep(200);
    await typeIn(d, "Qur'an");
    const create = await on(d, () => { const r = document.querySelector('#jeb-att .ja-create'); return r ? r.textContent.trim() : null; });
    check(create === "＋ Create #Qur'an", `${t} Tag: a "Create #Qur'an" row appears for a new tag`, String(create));
    await act(d, vp, '#jeb-att .ja-create'); await sleep(250);
    it = await item(d, 't1');
    check(it.tags.length === 2 && it.tags.includes('seed') && it.tags.includes("Qur'an"), `${t} Tag: an existing tag and a new one are attached`, JSON.stringify(it.tags));
    const afterCreate = await on(d, () => ({ q: document.getElementById('ja-q-in').value, on: !!document.querySelector('#jeb-att .ja-row[data-tag="Qur\'an"].on') }));
    check(afterCreate.q === '' && afterCreate.on, `${t} Tag: the box clears and the new tag shows ticked`, JSON.stringify(afterCreate));
    /* Note Type: single */
    const kids = await kindIds(d);
    await act(d, vp, '#jeb-att [data-tab="kind"]'); await sleep(200);
    const cats = await on(d, () => ({ cats: document.querySelectorAll('#jeb-att .ja-cat').length, dots: document.querySelectorAll('#jeb-att .ja-row[data-kind] .jc-dot').length, kinds: document.querySelectorAll('#jeb-att .ja-row[data-kind]').length }));
    check(cats.cats >= 1 && cats.dots === cats.kinds && cats.kinds >= 2, `${t} Note Type: grouped by category, each type with its colour dot`, JSON.stringify(cats));
    await act(d, vp, `#jeb-att .ja-row[data-kind="${kids[0]}"]`); await sleep(200);
    await act(d, vp, `#jeb-att .ja-row[data-kind="${kids[1]}"]`); await sleep(200);
    it = await item(d, 't1');
    check(it.kind === kids[1], `${t} Note Type: a second type REPLACES the first (single select)`, String(it.kind));
    const chips1 = await chipsText(d, 't1');
    await act(d, vp, `#jeb-att .ja-row[data-kind="${kids[1]}"]`); await sleep(200);
    it = await item(d, 't1');
    check(it.kind === null, `${t} Note Type: tapping the ticked one clears it`, String(it.kind));
    /* Journal */
    await act(d, vp, '#jeb-att [data-tab="journal"]'); await sleep(200);
    await act(d, vp, '#jeb-att .ja-row[data-journal]'); await sleep(200);
    it = await item(d, 't1');
    check(it.journal === true, `${t} Journal: the switch turns it on`);
    await act(d, vp, '#jeb-att .ja-x'); await sleep(250);
    const chips2 = await chipsText(d, 't1');
    check(/📁 \(001\) Seeded Folder/.test(chips2) && chips2.includes('📁 ' + FN) && /#seed/.test(chips2) && chips2.includes("#Qur'an") && /📔 Journal/.test(chips2), `${t} the row shows 📁 folders, #tags and 📔 Journal as chips`, chips2);
    const kname = await on(d, (k) => { const x = noteKinds().find((y) => y.id === k); return x ? x.name : null; }, kids[1]);
    check(kname !== null && chips1.includes(kname) && (await on(d, () => true)), `${t} the Note Type chip (name "${kname}") was on the row while it was set`, chips1);
    /* a reload keeps them */
    await reopen(d); await sleep(500);
    await openPanel(d, vp, 'Quick tasks');
    const chips3 = await chipsText(d, 't1');
    it = await item(d, 't1');
    check(chips3 === chips2 && it.folderIds.length === 2 && it.tags.length === 2 && it.journal === true, `${t} a reload keeps them`, chips3);
    noErr(d, t);
  });

  /* ══ 63b / 63c — two devices: Attach syncs, → Note leaves the pocket on both ══ */
  if (want('63b') || want('63c')) for (const vp of VPS) {
    const cloud = makeCloud();
    const A = await dev(cloud, 'A', vp), B = await dev(cloud, 'B', vp);
    const tag = `@${vp.name}`;
    try {
      await sleep(1500);
      await on(A, () => { const a = DB.articles.find((x) => x.id === 'a1'); a.content += '<p>x</p>'; a.updatedAt = new Date().toISOString(); persist(); flushPendingPush(); });
      await sleep(800); await quiet(cloud, A); await quiet(cloud, B);
      await openPanel(B, vp, 'Quick tasks'); await openPanel(A, vp, 'Quick tasks');
      const kids = await kindIds(A);
      await act(A, vp, `${row('t1')} .jeb-att-b`); await A.page.waitForSelector('#jeb-att');
      await typeIn(A, 'Second'); await act(A, vp, '#jeb-att .ja-row[data-fid="f2"]'); await sleep(200);
      await act(A, vp, '#jeb-att [data-tab="tag"]'); await typeIn(A, 'seed'); await act(A, vp, '#jeb-att .ja-row[data-tag="seed"]'); await sleep(200);
      await act(A, vp, '#jeb-att [data-tab="kind"]'); await act(A, vp, `#jeb-att .ja-row[data-kind="${kids[1]}"]`); await sleep(200);
      await act(A, vp, '#jeb-att [data-tab="journal"]'); await act(A, vp, '#jeb-att .ja-row[data-journal]'); await sleep(200);
      await act(A, vp, '#jeb-att .ja-x'); await sleep(200);
      let seen = ''; for (let i = 0; i < 60; i++) { seen = await chipsText(B, 't1'); if (/Journal/.test(seen)) break; await sleep(500); }
      if (want('63b')) check(/📁 \(002\) Second Folder/.test(seen) && /#seed/.test(seen) && /📔 Journal/.test(seen) && (await item(B, 't1')).kind === kids[1], `63b${tag} B shows A's attachments as chips, without a reload`, seen);
      if (want('63c')) {
        /* → Note on A, with a folder attached: the toast names the folder */
        await on(A, () => { window.__toasts.length = 0; });
        await act(A, vp, `${row('t1')} .jeb-note-b`); await sleep(500);
        const made = await on(A, () => { const n = DB.articles.find((x) => x.fromJeb); return n ? JSON.parse(JSON.stringify(n)) : null; });
        const kname = await on(A, (k) => noteKinds().find((x) => x.id === k).name, kids[1]);
        check(!!made && made.title === 'Alpha item' && /second line of alpha/.test(made.content) && made.folderIds.join() === 'f2' && made.tags.includes('seed') && made.tags.includes('journal') && made.kind === kids[1] && (made.kinds || []).join() === kids[1] && made.fromJeb && made.fromJeb.pocket === 'Quick tasks' && !!made.fromJeb.at, `63c${tag} the note has the item's title, body, folder, tags, Note Type, the journal tag and fromJeb`, JSON.stringify(made && { title: made.title, c: made.content, f: made.folderIds, t: made.tags, k: made.kind, j: made.fromJeb }) + ' ' + kname);
        check(!(await item(A, 't1')) && (await on(A, () => [...document.querySelectorAll('#jeb-bar .jeb-chip[data-pid]')][0].querySelector('.jeb-ct').textContent)) === '2' && !(await on(A, () => !!document.querySelector('#jeb-panel .jeb-it[data-iid="t1"]'))), `63c${tag} the item leaves the pocket at once and the count drops (3 -> 2)`);
        const tt = await toastText(A);
        check(/Turned into a note in 📁 \(002\) Second Folder/.test(tt) && /Open note/.test(tt), `63c${tag} the toast names the folder and offers Open note`, tt);
        let gone = false; for (let i = 0; i < 60 && !gone; i++) { gone = !(await item(B, 't1')) && (await on(B, () => DB.articles.some((x) => x.fromJeb && x.title === 'Alpha item'))); if (!gone) await sleep(500); }
        check(gone && !(await on(B, () => !!document.querySelector('#jeb-panel .jeb-it[data-iid="t1"]'))), `63c${tag} on device B the item is gone from the pocket and the note arrived`);
        /* Open note */
        await act(A, vp, '.toast-act'); await sleep(700);
        const opened = await on(A, () => { const n = DB.articles.find((x) => x.fromJeb); const p3 = document.getElementById('p3c'), r = p3.getBoundingClientRect(); const hit = document.elementFromPoint(Math.min(innerWidth - 2, Math.max(2, r.left + r.width / 2)), Math.min(innerHeight - 2, Math.max(2, r.top + 80))); return { art: ST.article === n.id, panel: document.getElementById('jeb-panel').classList.contains('on'), inP3: !!(hit && hit.closest('#p3')), txt: p3.innerText.includes('Alpha item') }; });
        check(opened.art && !opened.panel && opened.inP3 && opened.txt, `63c${tag} "Open note" opens that note in Pane 3 (panel closed)`, JSON.stringify(opened));
        /* no folder, journal; and nothing attached */
        await on(A, () => { jebAddItem('jp-task', 'Journal only'); const j = DB.jeb[DB.jeb.length - 1]; jebEditItem(j.id, { journal: true }); jebAddItem('jp-task', 'Plain one'); window.__ids = DB.jeb.slice(-2).map((x) => x.id); jebRefresh(); });
        await openPanel(A, vp, 'Quick tasks');
        const ids = await on(A, () => window.__ids);
        await act(A, vp, `${row(ids[0])} .jeb-note-b`); await sleep(400);
        const tj = await toastText(A);
        await on(A, () => { document.querySelectorAll('.toast-act').forEach((x) => x.remove()); });
        check(await on(A, () => document.getElementById('jeb-panel').classList.contains('on')), `63c${tag} the panel stays open after → Note (the next item can be done at once)`);
        await act(A, vp, `${row(ids[1])} .jeb-note-b`); await sleep(400);
        const tp = await toastText(A);
        check(/in 📔 Journal/.test(tj) && /in 👝 From Zab/.test(tp), `63c${tag} with a Journal flag the toast says 📔 Journal; with nothing attached, 👝 From Jeb`, tj + ' || ' + tp); /* v05.05: renamed to Zab */
      }
      check(A.errors.length + B.errors.length === 0, `63b/63c${tag} no page errors`, [...A.errors, ...B.errors].slice(0, 2).join(' · '));
    } finally { await A.ctx.close(); await B.ctx.close(); }
  }

  /* ══ 63d — an empty item is refused ══ */
  if (want('63d')) for (const vp of VPS) {
    const d = await dev(makeCloud(), 'E' + vp.name, vp, seed((db) => { db.jeb.push(mkItem('e1', 'jp-task', '   ', 3)); }));
    const t = `63d@${vp.name}`;
    try {
      await openPanel(d, vp, 'Quick tasks');
      const before = await on(d, () => JSON.stringify({ j: DB.jeb, a: DB.articles.length, t: (DB.trash || []).length }));
      await on(d, () => { window.__toasts.length = 0; });
      await act(d, vp, `${row('e1')} .jeb-note-b`); await sleep(400);
      const after = await on(d, () => JSON.stringify({ j: DB.jeb, a: DB.articles.length, t: (DB.trash || []).length }));
      const ts = await on(d, () => window.__toasts.join(' / '));
      check(/empty/i.test(ts) && before === after && !(await on(d, () => !!document.querySelector('.toast-act'))), `${t} an empty item is refused with a toast, and nothing changes`, ts);
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }

  /* ══ 63e — the From Jeb Smart View ══ */
  if (want('63e')) for (const vp of VPS) {
    const mk = (id, title, at) => ({ id, title, content: '<p>x</p>', folderIds: ['f1'], tags: [], createdAt: T0, updatedAt: T0, kind: 'general', fromJeb: { pocket: 'Quick tasks', at } });
    const d = await dev(makeCloud(), 'S' + vp.name, vp, seed((db) => { db.articles.push(mk('j1', 'Jeb oldest', '2026-10-02T00:00:00.000Z'), mk('j2', 'Jeb newest', '2026-10-05T00:00:00.000Z'), mk('j3', 'Jeb middle', '2026-10-03T00:00:00.000Z')); }));
    const t = `63e@${vp.name}`;
    try {
      const sfRow = '.sf-row[data-sfid="sf-jeb"]';
      if (!(await on(d, () => !!document.querySelector('.sf-row[data-sfid="sf-jeb"]')))) { await act(d, vp, '.sf-hd-sec'); await sleep(300); }
      const cnt = await on(d, () => { const r = document.querySelector('.sf-row[data-sfid="sf-jeb"]'); return r ? { name: r.querySelector('.tr-name').textContent, cnt: r.querySelector('.tr-cnt').textContent } : null; });
      check(!!cnt && cnt.name === '(12) From Zab' && cnt.cnt === '3', `${t} the sidebar row "(12) From Jeb" is there with count 3`, JSON.stringify(cnt)); /* v05.05: renamed to Zab */
      await act(d, vp, sfRow); await sleep(500);
      const titles = await on(d, () => [...document.querySelectorAll('#p2c .ar .ar-t')].map((e) => e.textContent.trim()));
      check(titles.join('|') === 'Jeb newest|Jeb middle|Jeb oldest', `${t} a real click lists them newest first`, titles.join('|'));
      /* empty state: a fresh device with no Jeb notes */
      const e = await dev(makeCloud(), 'Z' + vp.name, vp);
      try {
        if (!(await on(e, () => !!document.querySelector('.sf-row[data-sfid="sf-jeb"]')))) { await act(e, vp, '.sf-hd-sec'); await sleep(300); }
        const c0 = await on(e, () => document.querySelector('.sf-row[data-sfid="sf-jeb"] .tr-cnt').textContent);
        await act(e, vp, sfRow); await sleep(500);
        const txt = await on(e, () => document.getElementById('p2c').innerText);
        check(c0 === '0' && /Notes you make from Zab appear here\./.test(txt), `${t} with none made: count 0 and the empty-state line`, c0 + ' ' + txt.slice(0, 80)); /* v05.05: renamed to Zab */
        noErr(e, t + ' (empty)');
      } finally { await e.ctx.close(); }
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }

  /* ══ 63f — the "👝 from" label ══ */
  if (want('63f')) for (const vp of VPS) {
    const d = await dev(makeCloud(), 'L' + vp.name, vp, seed((db) => { db.articles.push({ id: 'j1', title: 'Jeb made', content: '<p>x</p>', folderIds: ['f1'], tags: [], createdAt: T0, updatedAt: T0, kind: 'general', fromJeb: { pocket: 'Quick tasks', at: '2026-10-05T00:00:00.000Z' } }); }));
    const t = `63f@${vp.name}`;
    try {
      await on(d, () => { selFolder('f1'); });
      await sleep(400);
      const card = await on(d, () => { const e = document.querySelector('#p2c .ar[data-aid="j1"] .ar-jeb'); return e ? e.textContent : null; });
      check(card === '👝 from Quick tasks', `${t} the Pane 2 card shows "👝 from Quick tasks"`, String(card));
      await on(d, () => { selArt('j1'); }); await sleep(500);
      const view = await on(d, () => { const e = document.querySelector('#p3c .av-jeb'); return e ? e.textContent : null; });
      check(view === '👝 from Quick tasks', `${t} the read-view header shows it too`, String(view));
      const plain = await on(d, () => { selFolder('f1'); selArt('a1'); return !document.querySelector('#p3c .av-jeb') && !document.querySelector('#p2c .ar[data-aid="a1"] .ar-jeb'); });
      check(plain, `${t} an ordinary note shows no label`);
      await on(d, () => { selArt('j1'); }); await sleep(300);
      for (const p of ['forest', 'ocean', 'amber', 'indigo', 'rose']) {
        await on(d, (k) => { applyPreset(k); renderP2C(); renderP3C(); }, p); await sleep(250);
        const m = await d.page.evaluate(() => {
          const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
          const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
          const bgOf = (el) => { const layers = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; } } let base = { r: 255, g: 255, b: 255 }; for (let i = layers.length - 1; i >= 0; i--) { const c = layers[i]; base = { r: c.r * c.a + base.r * (1 - c.a), g: c.g * c.a + base.g * (1 - c.a), b: c.b * c.a + base.b * (1 - c.a) }; } return base; };
          const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
          const one = (sel) => { const e = document.querySelector(sel); if (!e) return null; const fg = parse(getComputedStyle(e).color), bg = bgOf(e); const comp = fg.a < 1 ? { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) } : fg; return Math.round(ratio(comp, bg) * 100) / 100; };
          return { card: one('#p2c .ar[data-aid="j1"] .ar-jeb'), view: one('#p3c .av-jeb') };
        });
        check(m.card != null && m.view != null && m.card >= 4.5 && m.view >= 4.5, `${t} the label clears 4.5:1 on ${p} (card ${m.card}, read view ${m.view})`, JSON.stringify(m));
      }
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }

  /* ══ 63g — layout ══ */
  if (want('63g')) for (const vp of VPS) {
    const d = await dev(makeCloud(), 'G' + vp.name, vp, seed((db) => { db.jeb[0] = mkItem('t1', 'jp-task', 'Alpha item with a fairly long line of words that has to wrap inside the panel', 0, { folderIds: ['f1', 'f2'], tags: ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot-with-a-rather-long-name'], journal: true }); }));
    const t = `63g@${vp.name}`;
    try {
      const kids = await kindIds(d);
      await on(d, (k) => { jebEditItem('t1', { kind: k }); jebRefresh(); }, kids[1]);
      await openPanel(d, vp, 'Quick tasks');
      const m = await on(d, () => {
        const p = document.getElementById('jeb-panel'), l = p.querySelector('.jeb-list'), pr = p.getBoundingClientRect();
        const b = (s) => { const e = p.querySelector('.jeb-it[data-iid="t1"] ' + s); return e ? e.getBoundingClientRect() : null; };
        const chips = [...p.querySelectorAll('.jeb-it[data-iid="t1"] .jeb-chips > span')].map((e) => e.getBoundingClientRect());
        return { att: b('.jeb-att-b') && b('.jeb-att-b').height, note: b('.jeb-note-b') && b('.jeb-note-b').height, tx: b('.jeb-tx') && b('.jeb-tx').width, chips: chips.length, chipOut: chips.some((c) => c.right > pr.right + 0.5 || c.left < pr.left - 0.5), pw: [p.scrollWidth, p.clientWidth], lw: [l.scrollWidth, l.clientWidth], doc: [document.documentElement.scrollWidth, document.documentElement.clientWidth] };
      });
      check(m.att >= 40 && m.note >= 40, `${t} 📎 Attach and → Note are at least 40px tall`, `${m.att} / ${m.note}`);
      check(m.tx >= 160, `${t} the item's text keeps >= 160px of width`, String(m.tx));
      check(m.chips === 10 && !m.chipOut && m.pw[0] <= m.pw[1] && m.lw[0] <= m.lw[1] && m.doc[0] <= m.doc[1], `${t} no horizontal overflow with 2 folders, 6 tags, a type and Journal attached (10 chips)`, JSON.stringify(m));
      await act(d, vp, `${row('t1')} .jeb-att-b`); await d.page.waitForSelector('#jeb-att'); await sleep(250);
      for (const tab of ['folder', 'tag', 'kind', 'journal']) {
        await act(d, vp, `#jeb-att [data-tab="${tab}"]`); await sleep(200);
        const r = await rect(d, '#jeb-att');
        const inside = r.l >= -0.5 && r.t >= -0.5 && r.r <= vp.w + 0.5 && r.b <= vp.h + 0.5;
        if (vp.w < 640) check(inside && Math.abs(r.b - vp.h) <= 1 && Math.abs(r.h - vp.h * 0.8) <= 8 && r.w >= vp.w - 1, `${t} ${tab}: a bottom sheet ~80% high, full width, fully on screen`, JSON.stringify(r));
        else {
          const pr = await rect(d, '#jeb-panel');
          check(inside && r.r <= pr.l + 1 && r.w >= 300, `${t} ${tab}: a popover beside the panel, fully on screen`, JSON.stringify({ r, panelLeft: pr.l }));
        }
      }
      const small = await on(d, () => [...document.querySelectorAll('#jeb-att [data-tab], #jeb-att .ja-x, #jeb-att .ja-row')].filter((e) => e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().height < 40).length);
      check(small === 0, `${t} every tab, ✕ and row in the sheet is at least 40px tall`, String(small));
      noErr(d, t);
    } finally { await d.ctx.close(); }
  }
} catch (e) {
  console.log(' FAIL  jeb-j3 threw: ' + (e && e.stack || e));
  results.push({ ok: false, label: 'threw' });
} finally {
  await browser.close();
  await srv.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
