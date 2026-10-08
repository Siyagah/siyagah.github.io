#!/usr/bin/env node
/* tools/s3a-tags.mjs — v04.96, S3a: every tag works whatever its characters, and the tag pickers
   stay fast at 3,000 tags (checks 57a–57e).

   Real clicks, real typing, in a booted app at 390x844, 820x1180 and 1440x900 (57a/57b), with page
   errors counted. The awkward set is  Qur'an  say "hi"  back\slash  <b>bold</b>  A & B  تفسير  emoji 🌙.

   57a  for each awkward tag: sidebar row, sidebar search result, right-click / long-press -> Rename and
        Delete, the chip x in Pane 3's editor and in a float window, the chip's colour picker, the Add tag
        modal row, the picker's tag scope, the suggestion dropdown, imgAttachTag; displayed text == the tag
   57b  typed paths keep their characters: the tag editor (Enter, trailing comma), Add tag -> Create,
        sidebar ⋯ -> New tag, Rename; commas split, a leading # goes, whitespace collapses
   57c  no stored tag is rewritten by boot + an unrelated edit + persist + reload
   57d  speed at 3,000 tags / 9,000 notes, phone (CPU x4) and laptop
   57e  every tag stays reachable: the cap, the "+N more" line, and typing finds a tag past the first 100

   `--only=57a,57c` runs just those. Each printed ok/FAIL line becomes one app-check check (block 57). */
import { openApp, seedDB } from './harness.mjs';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);

const AWK = ["Qur'an", 'say "hi"', 'back\\slash', '<b>bold</b>', 'A & B', 'تفسير', 'emoji 🌙'];
const VPS = [{ n: 390, w: 390, h: 844, touch: true }, { n: 820, w: 820, h: 1180, touch: true }, { n: 1440, w: 1440, h: 900, touch: false }];
const DETAILS_OPEN = "try{localStorage.setItem('siyagah-pop-details','1')}catch(e){}";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function check(ok, label, detail = '') {
  results.push({ ok, label });
  console.log((ok ? '  ok   ' : ' FAIL  ') + label + (detail ? '\n         ' + String(detail).slice(0, 600) : ''));
}
/* one check from a list of per-tag failures (an empty list passes) */
const verdict = (label, fails, errs) => check(!fails.length && !(errs && errs.length), label, [...fails, ...(errs || [])].join(' | '));

const dbAwk = () => { const d = seedDB(); d.articles[0].tags = [...AWK]; return d; };
const jsonEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const minus = (arr, t) => arr.filter((x) => x !== t);

/* ── helpers on a page ── */
async function sbOpen(page) {
  await page.evaluate(() => { try { closeModal(); } catch {} try { hideCtx(); } catch {} ST.search = ''; const i = document.getElementById('sq'); if (i) i.value = ''; ST.tag = null; ST.tagOpen = true; showPane('sb'); renderTree(); });
  await sleep(100);
}
const tagRowIdx = (page, t) => page.evaluate((t) => [...document.querySelectorAll('.tag-row')].findIndex((e) => e.dataset.tag === t), t);
async function longPress(page, loc) {
  await loc.scrollIntoViewIfNeeded();
  const b = await loc.boundingBox();
  const cdp = await page.context().newCDPSession(page);
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await sleep(800);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}
/* the real tag menu: right-click, or a long press on touch */
async function tagMenu(page, vp, t) {
  await sbOpen(page);
  const i = await tagRowIdx(page, t);
  if (i < 0) return false;
  const row = page.locator('.tag-row').nth(i);
  if (vp.touch) await longPress(page, row); else await row.click({ button: 'right' });
  await sleep(150);
  return await page.evaluate(() => { const m = document.getElementById('ctx'); return !!m && m.style.display !== 'none' && !!m.querySelector('.ci'); });
}
/* open a note's editor in Pane 3; on a phone also the `+` menu, which holds the tag editor */
async function editNote(page, vp, id) {
  await page.evaluate((id) => { try { if (ST.editing) cancelEdit(); } catch {} try { closeModal(); } catch {} ST.folder = DB.articles.find((a) => a.id === id).folderIds[0]; ST.article = id; ST.tag = null; render(); if (innerWidth < 1200) showPane('p3'); window.startEdit(); }, id);
  await page.waitForSelector('#ed');
  await sleep(350);
  if (vp.w < 640) { await page.click('.eb-grp-btn[data-g="insert"]'); await sleep(200); }
}
const etags = (page) => page.evaluate(() => [...(ST.etags || [])]);
const tagsOf = (page, id) => page.evaluate((id) => [...(DB.articles.find((a) => a.id === id).tags || [])], id);
const reset = (page, id, tags) => page.evaluate(({ id, tags }) => { const a = DB.articles.find((x) => x.id === id); a.tags = [...tags]; persist(); ST.tag = null; }, { id, tags });

/* ═══════════════ 57a / 57b — per layout ═══════════════ */
async function perLayout(vp) {
  const A = await openApp({ viewport: { width: vp.w, height: vp.h }, db: dbAwk(), hasTouch: vp.touch });
  const page = A.page;
  const nErr = () => A.errors.length;
  const errsFrom = (n) => A.errors.slice(n);
  const L = (s) => `${vp.n}: ${s}`;
  try {
    if (want('57a')) {
      let e0 = nErr();
      /* sidebar row */
      let fails = [], shownFails = [];
      for (const t of AWK) {
        await sbOpen(page);
        const i = await tagRowIdx(page, t);
        if (i < 0) { fails.push(`${t}: no sidebar row`); continue; }
        const shown = await page.evaluate((i) => { const e = document.querySelectorAll('.tag-row')[i].querySelector('.tr-name'); return { txt: e.textContent, kids: e.children.length }; }, i);
        if (shown.txt !== '#' + t || shown.kids !== 0) shownFails.push(`${t}: shows ${JSON.stringify(shown)}`);
        await page.locator('.tag-row').nth(i).click();
        await sleep(150);
        const sel = await page.evaluate(() => ST.tag);
        if (sel !== t) fails.push(`${t}: ST.tag=${JSON.stringify(sel)}`);
      }
      verdict(L('57a the sidebar row selects exactly that tag (7 awkward tags)'), fails, errsFrom(e0));
      verdict(L('57a the sidebar row shows the tag as typed (no &amp;amp;, no <b> rendered)'), shownFails);

      /* sidebar search */
      e0 = nErr(); fails = [];
      for (const t of AWK) {
        await sbOpen(page);
        await page.fill('#sq', t);
        await sleep(200);
        const i = await page.evaluate((t) => [...document.querySelectorAll('#tree .sr')].findIndex((e) => e.textContent.startsWith('#' + t + ' ')), t);
        if (i < 0) { fails.push(`${t}: no search result`); continue; }
        await page.locator('#tree .sr').nth(i).click();
        await sleep(150);
        const sel = await page.evaluate(() => ST.tag);
        if (sel !== t) fails.push(`${t}: ST.tag=${JSON.stringify(sel)}`);
      }
      verdict(L('57a the sidebar search result selects exactly that tag'), fails, errsFrom(e0));

      /* right-click / long press -> Rename */
      e0 = nErr(); fails = [];
      for (const t of AWK) {
        await reset(page, 'a1', AWK);
        if (!(await tagMenu(page, vp, t))) { fails.push(`${t}: menu did not open`); continue; }
        await page.click('#ctx .ci:has-text("Rename tag")');
        await sleep(150);
        const nn = 'New ' + t;
        if (!(await page.locator('.tag-row .sec-inp').count())) { fails.push(`${t}: no rename box`); continue; }
        await page.fill('.tag-row .sec-inp', nn);
        await page.keyboard.press('Enter');
        await sleep(200);
        const got = await tagsOf(page, 'a1');
        const wantT = AWK.map((x) => (x === t ? nn : x));
        if (!jsonEq(got, wantT)) fails.push(`${t}: tags=${JSON.stringify(got)}`);
      }
      verdict(L(`57a ${vp.touch ? 'long-press' : 'right-click'} -> Rename keeps the apostrophe, quotes, Arabic and emoji in the new name`), fails, errsFrom(e0));

      /* -> Delete */
      e0 = nErr(); fails = [];
      for (const t of AWK) {
        await reset(page, 'a1', AWK);
        if (!(await tagMenu(page, vp, t))) { fails.push(`${t}: menu did not open`); continue; }
        page.once('dialog', (d) => d.accept());
        await page.click('#ctx .ci:has-text("Delete tag")');
        await sleep(250);
        const got = await tagsOf(page, 'a1');
        if (!jsonEq(got, minus(AWK, t))) fails.push(`${t}: tags=${JSON.stringify(got)}`);
      }
      verdict(L('57a Delete tag removes exactly that tag'), fails, errsFrom(e0));
      await reset(page, 'a1', AWK);

      /* Pane 3: chip x, chip display, colour picker */
      e0 = nErr(); fails = []; shownFails = [];
      let cfails = [];
      await editNote(page, vp, 'a1');
      for (let k = 0; k < AWK.length; k++) {
        const t = AWK[k];
        await page.evaluate((all) => { ST.etags = [...all]; renderTagEditor(''); if (window.DB.tagColors) DB.tagColors = {}; }, AWK);
        const chip = page.locator('#tag-editor .tag-chip').nth(k);
        const shown = await chip.evaluate((e) => ({ txt: e.textContent, kids: [...e.children].map((c) => c.className) }));
        if (shown.txt !== '🏷 ' + t + '×' || shown.kids.join() !== 'tag-x') shownFails.push(`${t}: chip ${JSON.stringify(shown)}`);
        /* colour picker: right-click, then pick a colour and see it land on THIS tag */
        await chip.click({ button: 'right' });
        await sleep(150);
        const pk = await page.evaluate(() => !!document.getElementById('clr-pk'));
        if (!pk) cfails.push(`${t}: no colour picker`);
        else {
          await page.evaluate(() => _clrPick('#c0392b'));
          await sleep(150);
          const col = await page.evaluate((t) => ({ mine: (DB.tagColors || {})[t] || null, n: Object.keys(DB.tagColors || {}).length }), t);
          if (col.mine !== '#c0392b' || col.n !== 1) cfails.push(`${t}: colours ${JSON.stringify(col)}`);
        }
        await page.evaluate((all) => { document.getElementById('clr-pk')?.remove(); ST.etags = [...all]; renderTagEditor(''); }, AWK);
        await page.locator('#tag-editor .tag-chip').nth(k).locator('.tag-x').click();
        await sleep(150);
        const got = await etags(page);
        if (!jsonEq(got, minus(AWK, t))) fails.push(`${t}: etags=${JSON.stringify(got)}`);
      }
      verdict(L("57a the chip × in Pane 3's editor removes exactly that tag"), fails, errsFrom(e0));
      verdict(L('57a a chip shows the tag as typed'), shownFails);
      verdict(L("57a the chip's right-click opens the colour picker and the colour lands on that tag"), cfails);

      /* suggestion dropdown (on a2, which has none of them) */
      e0 = nErr(); fails = [];
      await page.evaluate((all) => { DB.articles.find((a) => a.id === 'a1').tags = [...all]; persist(); }, AWK);
      await editNote(page, vp, 'a2');
      for (const t of AWK) {
        await page.evaluate(() => { ST.etags = []; renderTagEditor(''); });
        await page.fill('#tag-editor .tag-inp', t);
        await sleep(150);
        const i = await page.evaluate((t) => [...document.querySelectorAll('#tag-editor .tag-sg-item')].findIndex((e) => e.textContent === t), t);
        if (i < 0) { fails.push(`${t}: not suggested`); continue; }
        await page.locator('#tag-editor .tag-sg-item').nth(i).click();
        await sleep(150);
        const got = await etags(page);
        if (!jsonEq(got, [t])) fails.push(`${t}: etags=${JSON.stringify(got)}`);
      }
      verdict(L('57a the suggestion dropdown picks exactly that tag'), fails, errsFrom(e0));
      await page.evaluate(() => { try { cancelEdit(); } catch {} });

      /* Add tag modal row */
      e0 = nErr(); fails = [];
      for (const t of AWK) {
        await reset(page, 'a2', []);
        await sbOpen(page);
        await page.evaluate(() => promptAddArtTag('a2'));
        await sleep(200);
        await page.fill('#tp-srch', t);
        await sleep(150);
        const i = await page.evaluate((t) => [...document.querySelectorAll('#tp-list .ltn-row')].findIndex((e) => e.textContent.includes('#' + t) && !e.textContent.includes('Create')), t);
        if (i < 0) { fails.push(`${t}: no modal row`); continue; }
        const txt = await page.locator('#tp-list .ltn-row').nth(i).evaluate((e) => e.querySelector('span').textContent);
        if (txt !== '#' + t) fails.push(`${t}: row shows ${JSON.stringify(txt)}`);
        await page.locator('#tp-list .ltn-row').nth(i).click();
        await sleep(200);
        const got = await tagsOf(page, 'a2');
        if (!jsonEq(got, [t])) fails.push(`${t}: tags=${JSON.stringify(got)}`);
        await page.evaluate(() => closeModal());
      }
      verdict(L('57a the Add tag modal row applies exactly that tag'), fails, errsFrom(e0));

      /* the picker's tag scope */
      e0 = nErr(); fails = [];
      await reset(page, 'a2', []);
      for (const t of AWK) {
        await sbOpen(page);
        await page.evaluate(() => { openSectionPopout('sec-1'); _pkSwitchToScopeKind('tags'); });
        await sleep(250);
        const i = await page.evaluate((t) => [...document.querySelectorAll('#pkList .pnav')].findIndex((e) => e.querySelector('.pnav-nm') && e.querySelector('.pnav-nm').textContent === '#' + t), t);
        if (i < 0) { fails.push(`${t}: no picker row`); continue; }
        await page.locator('#pkList .pnav').nth(i).click();
        await sleep(200);
        const sel = await page.evaluate(() => ST.tag);
        if (sel !== t) fails.push(`${t}: ST.tag=${JSON.stringify(sel)}`);
      }
      verdict(L("57a the picker's tag scope navigates to exactly that tag"), fails, errsFrom(e0));

      /* imgAttachTag */
      e0 = nErr(); fails = [];
      for (const t of AWK) {
        await reset(page, 'a2', []);
        await page.evaluate(() => { try { closeModal(); } catch {} ST.article = 'a2'; ST.tag = null; imgAttachTag(null, 60, 60); });
        await sleep(150);
        await page.fill('#item-menu .im-search', t);
        await sleep(150);
        const i = await page.evaluate((t) => [...document.querySelectorAll('#item-menu .im-it')].findIndex((e) => e.textContent.includes(t)), t);
        if (i < 0) { fails.push(`${t}: no row`); continue; }
        const txt = await page.locator('#item-menu .im-it').nth(i).textContent();
        if (txt !== '🏷 ' + t) fails.push(`${t}: row shows ${JSON.stringify(txt)}`);
        await page.locator('#item-menu .im-it').nth(i).click();
        await sleep(200);
        const got = await tagsOf(page, 'a2');
        if (!jsonEq(got, [t])) fails.push(`${t}: tags=${JSON.stringify(got)}`);
      }
      verdict(L('57a imgAttachTag applies exactly that tag'), fails, errsFrom(e0));
    }

    if (want('57b')) {
      let e0 = nErr(), fails = [];
      await reset(page, 'a1', []); await reset(page, 'a2', []);
      /* the tag editor: Enter */
      await editNote(page, vp, 'a2');
      const typed = [["  #Qur'an   x ", "Qur'an x"], ['تفسير', 'تفسير'], ['emoji 🌙', 'emoji 🌙'], ['##lead  sp   aced', 'lead sp aced']];
      await page.evaluate(() => { ST.etags = []; renderTagEditor(''); });
      for (const [raw, exp] of typed) {
        await page.fill('#tag-editor .tag-inp', raw);
        await page.keyboard.press('Enter');
        await sleep(120);
      }
      let got = await etags(page);
      if (!jsonEq(got, typed.map((x) => x[1]))) fails.push(`Enter: etags=${JSON.stringify(got)}`);
      verdict(L('57b the tag editor keeps Arabic, an apostrophe and an emoji on Enter; a leading # goes and spaces collapse'), fails, errsFrom(e0));

      /* trailing comma (the touch path) and commas that split */
      e0 = nErr(); fails = [];
      await page.evaluate(() => { ST.etags = []; renderTagEditor(''); });
      await page.fill('#tag-editor .tag-inp', "Ibn 'Abbas,");
      await sleep(120);
      await page.fill('#tag-editor .tag-inp', 'تفسير,');
      await sleep(120);
      got = await etags(page);
      if (!jsonEq(got, ["Ibn 'Abbas", 'تفسير'])) fails.push(`trailing comma: etags=${JSON.stringify(got)}`);
      await page.evaluate(() => { ST.etags = []; renderTagEditor(''); });
      await page.click('#tag-editor .tag-inp');
      await page.keyboard.type("c1,c2 🌙,");
      await sleep(150);
      got = await etags(page);
      if (!jsonEq(got, ['c1', 'c2 🌙'])) fails.push(`typed commas: etags=${JSON.stringify(got)}`);
      verdict(L('57b a trailing comma adds the tag, and typed commas still split'), fails, errsFrom(e0));
      await page.evaluate(() => { try { cancelEdit(); } catch {} });

      /* Add tag -> Create */
      e0 = nErr(); fails = [];
      await reset(page, 'a2', []);
      await sbOpen(page);
      await page.evaluate(() => promptAddArtTag('a2'));
      await sleep(200);
      await page.fill('#tp-srch', "  #Qur'an Ziyada ");
      await sleep(150);
      const ci = await page.evaluate(() => [...document.querySelectorAll('#tp-list .ltn-row')].findIndex((e) => e.textContent.includes('Create')));
      if (ci < 0) fails.push('no Create row');
      else {
        await page.locator('#tp-list .ltn-row').nth(ci).click();
        await sleep(200);
        got = await tagsOf(page, 'a2');
        if (!jsonEq(got, ["Qur'an Ziyada"])) fails.push(`Create: tags=${JSON.stringify(got)}`);
      }
      await page.evaluate(() => closeModal());
      /* Enter in the modal's box */
      await page.evaluate(() => promptAddArtTag('a2'));
      await sleep(200);
      await page.fill('#tp-srch', 'سنة 🌙');
      await page.keyboard.press('Enter');
      await sleep(200);
      got = await tagsOf(page, 'a2');
      if (!jsonEq(got, ["Qur'an Ziyada", 'سنة 🌙'])) fails.push(`modal Enter: tags=${JSON.stringify(got)}`);
      await page.evaluate(() => closeModal());
      verdict(L('57b Add tag -> Create (and Enter) keeps the characters and the case typed'), fails, errsFrom(e0));

      /* sidebar ⋯ -> New tag */
      e0 = nErr(); fails = [];
      await sbOpen(page);
      await page.click('.tag-sec .sec-hd .sec-act');
      await sleep(150);
      await page.click('#ctx .ci:has-text("New tag")');
      await sleep(150);
      await page.fill('#new-tag-inp', " #نص's 🌙 ");
      await page.click('.ma .bp');
      await sleep(200);
      const g = await page.evaluate(() => [...(DB.globalTags || [])]);
      if (!g.includes("نص's 🌙")) fails.push(`globalTags=${JSON.stringify(g)}`);
      verdict(L('57b sidebar ⋯ -> New tag keeps Arabic, an apostrophe and an emoji'), fails, errsFrom(e0));

      /* Rename */
      e0 = nErr(); fails = [];
      await reset(page, 'a1', ['old one']);
      if (!(await tagMenu(page, vp, 'old one'))) fails.push('menu did not open');
      else {
        await page.click('#ctx .ci:has-text("Rename tag")');
        await sleep(150);
        await page.fill('.tag-row .sec-inp', "  #نص's   🌙 ");
        await page.keyboard.press('Enter');
        await sleep(200);
        got = await tagsOf(page, 'a1');
        if (!jsonEq(got, ["نص's 🌙"])) fails.push(`Rename: tags=${JSON.stringify(got)}`);
      }
      verdict(L('57b Rename keeps the characters typed (leading # gone, spaces collapsed)'), fails, errsFrom(e0));
    }

    if (want('57a')) {
      /* float window: chip x on every awkward tag */
      await A.close();
      const B = await openApp({ viewport: { width: vp.w, height: vp.h }, db: dbAwk(), hasTouch: vp.touch, initScript: DETAILS_OPEN });
      const p = B.page; const e1 = B.errors.length; const fails = [];
      try {
        await p.evaluate(() => { ST.folder = 'f1'; ST.article = 'a1'; ST.editing = false; window.render(); openNotePopup('a1', 'float'); });
        await sleep(500);
        for (let k = 0; k < AWK.length; k++) {
          const t = AWK[k];
          await p.evaluate((all) => { DB.articles.find((a) => a.id === 'a1').tags = [...all]; renderTagEditor('a1'); }, AWK);
          const chips = p.locator('#fw-a1 .pop-meta-strip .tag-editor .tag-chip');
          if ((await chips.count()) !== AWK.length) { fails.push(`${t}: ${await chips.count()} chips`); continue; }
          await chips.nth(k).locator('.tag-x').click();
          await sleep(150);
          const got = await tagsOf(p, 'a1');
          if (!jsonEq(got, minus(AWK, t))) fails.push(`${t}: tags=${JSON.stringify(got)}`);
        }
        verdict(L("57a the chip × in a float window removes exactly that tag"), fails, B.errors.slice(e1));
      } finally { await B.close(); }
      return;
    }
  } finally {
    try { await A.close(); } catch {}
  }
}

/* ═══════════════ 57c — no stored tag is rewritten ═══════════════ */
async function stored() {
  const odd = [' lead', 'trail ', '#hash', 'a,b', 'x'.repeat(150), '  two   spaces ', 'ctl\u0007x', ...AWK];
  const d = seedDB();
  d.articles[0].tags = [...odd]; d.articles[1].tags = [...AWK].reverse(); d.globalTags = [...odd];
  const wantTags = d.articles.map((a) => a.tags), wantG = d.globalTags;
  const A = await openApp({ viewport: { width: 1440, height: 900 }, db: d });
  const p = A.page;
  try {
    const read = () => p.evaluate(() => ({ t: DB.articles.map((a) => a.tags), g: DB.globalTags }));
    const e0 = A.errors.length;
    const b = await read();
    check(jsonEq(b.t, wantTags) && jsonEq(b.g, wantG), '57c after boot every note\'s tags (and the standalone list) equal the seed, byte for byte', JSON.stringify(b).slice(0, 300));
    await p.evaluate(() => { DB.articles[2].title = 'Edited unrelated'; DB.articles[2].updatedAt = new Date().toISOString(); persist(); render(); });
    await sleep(800);
    const m = await read();
    check(jsonEq(m.t, wantTags) && jsonEq(m.g, wantG), '57c after an unrelated edit + persist nothing in tags changed', JSON.stringify(m).slice(0, 300));
    await p.evaluate(() => { try { _flushEverythingOut(); } catch {} });
    await sleep(500);
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.__appBooted === true);
    await sleep(300);
    const r2 = await read();
    check(jsonEq(r2.t, wantTags) && jsonEq(r2.g, wantG), '57c after a reload from storage every tag is still the same bytes', JSON.stringify(r2).slice(0, 300));
    check(A.errors.length === e0, '57c no page errors', A.errors.slice(e0).join(' | '));
  } finally { await A.close(); }
}

/* ═══════════════ 57d / 57e — 3,000 tags ═══════════════ */
function seed(page, NT, NN) {
  return page.evaluate(({ NT, NN }) => {
    let a = 12345 >>> 0; const R = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const words = ['fiqh', 'hadith', 'tafsir', 'seerah', 'aqeedah', 'history', 'recipe', 'travel', 'finance', 'tax', 'health', 'project', 'meeting', 'book', 'lecture', 'arabic', 'urdu', 'family', 'work', 'idea'];
    const tags = []; for (let i = 0; i < NT; i++) tags.push(words[i % words.length] + (i >= words.length ? ' ' + words[Math.floor(i / words.length) % words.length] + ' ' + i : ''));
    const now = new Date().toISOString(), t0 = Date.now() - 4e6;
    DB.folders = [{ id: 'f1', name: '(001) A', parentId: null, order: 1, sectionId: 'sec-1', updatedAt: now }];
    DB.articles = []; DB.trash = []; DB.tombstones = [];
    for (let i = 0; i < NN; i++) {
      const k = Math.floor(R() * 7), ts = new Set();
      for (let j = 0; j < k; j++) ts.add(tags[Math.floor(Math.pow(R(), 2) * NT)]);   /* skewed: a few tags are on many notes */
      const at = new Date(t0 + i * 400).toISOString();
      DB.articles.push({ id: 'n' + i, title: 'Note ' + i, content: '<p>Body ' + i + '</p>', folderIds: ['f1'], tags: [...ts], createdAt: at, updatedAt: at, kind: 'general' });
    }
    const used = new Set(DB.articles.flatMap((x) => x.tags));
    tags.forEach((t) => { if (!used.has(t)) { DB.globalTags = DB.globalTags || []; DB.globalTags.push(t); } });
    DB.globalTags = DB.globalTags || []; DB.globalTags.push('zz-last-tag');
    DB.tagColors = {}; DB.tagColorsAt = {};
    _seedThemeSnap(); _seedRecSnap(); persist(); _histReset();
    return { notes: DB.articles.length, tags: getAllTags().length };
  }, { NT, NN });
}
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
async function timeIt(page, src, n = 3, pre = '', post = '') {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(await page.evaluate(async ({ src, pre, post }) => {
      if (pre) (0, eval)(pre);
      const t = performance.now(); (0, eval)(src);
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
      const d = performance.now() - t;
      if (post) (0, eval)(post);
      return d;
    }, { src, pre, post }));
  }
  return Math.round(med(out));
}

async function speed() {
  const T = { open: 150, key: 60, attach: 150, treeClosed: 30 };
  for (const vp of [{ name: 'phone', w: 390, h: 844, throttle: 4, touch: true }, { name: 'laptop', w: 1440, h: 900, throttle: 1, touch: false }]) {
    const A = await openApp({ viewport: { width: vp.w, height: vp.h }, db: seedDB(), hasTouch: vp.touch });
    const p = A.page;
    try {
      const info = await seed(p, 3000, 9000);
      await sleep(500);
      if (vp.throttle > 1) { const cdp = await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: vp.throttle }); }
      const r = { info };
      r.getAllTags = await timeIt(p, 'getAllTags()');
      r.renderTree_tagsClosed = await timeIt(p, 'renderTree()', 5, 'ST.tagOpen=false');
      r.renderTree_tagsOpen = await timeIt(p, 'renderTree()', 3, 'ST.tagOpen=true');
      await p.evaluate(() => { ST.tagOpen = false; renderTree(); });
      r.sidebarSearch_keystroke = await timeIt(p, "ST.search='fiq';renderTree();ST.search=''", 3);
      await p.evaluate(() => { selArt('n1'); });
      await sleep(300);
      r.suggest_keystroke = await timeIt(p, "(()=>{const i=document.querySelector('.tag-inp');if(i)showTagSuggest('fi',null,i);})()", 3);
      r.addTagModal_open = await timeIt(p, "promptAddArtTag('n2')", 3, '', 'closeModal()');
      await p.evaluate(() => promptAddArtTag('n2'));
      r.addTagModal_rows = await p.evaluate(() => document.querySelectorAll('#tp-list .ltn-row').length);
      r.addTagModal_keystroke = await timeIt(p, "tagPickerRender('n2','h')", 5);
      await p.evaluate(() => closeModal());
      r.imgAttachTag_open = await timeIt(p, 'imgAttachTag(null,60,60)', 3, "ST.article='n2'", 'closeItemMenu()');
      r.errors = A.errors.slice(0, 5);
      console.log('P57d ' + vp.name + ' ' + JSON.stringify(r));
      const L = (s) => `57d ${vp.name} (${vp.throttle > 1 ? 'CPU x' + vp.throttle + ', ' : ''}3,000 tags / 9,000 notes): ${s}`;
      check(info.notes === 9000 && info.tags >= 3000, L('seed is 9,000 notes and ≥ 3,000 tags'), JSON.stringify(info));
      check(r.addTagModal_rows > 0 && r.addTagModal_rows <= 100, L(`the Add tag modal draws ≤ 100 rows (drew ${r.addTagModal_rows})`));
      check(r.addTagModal_open <= T.open, L(`Add tag modal opens in ≤ ${T.open} ms (${r.addTagModal_open} ms)`));
      check(r.addTagModal_keystroke <= T.key, L(`each keystroke in the modal ≤ ${T.key} ms (${r.addTagModal_keystroke} ms)`));
      check(r.imgAttachTag_open <= T.attach, L(`imgAttachTag opens in ≤ ${T.attach} ms (${r.imgAttachTag_open} ms)`));
      check(r.renderTree_tagsClosed <= T.treeClosed, L(`renderTree() with Tags closed ≤ ${T.treeClosed} ms (${r.renderTree_tagsClosed} ms)`));
      check(!r.errors.length, L('no page errors'), r.errors.join(' | '));
    } finally { await A.close(); }
  }
}

async function reachable() {
  const A = await openApp({ viewport: { width: 1440, height: 900 }, db: seedDB() });
  const p = A.page; const e0 = () => A.errors.length;
  try {
    await seed(p, 3000, 300);
    await sleep(300);
    const CAP = 100, SCAP = 50;
    const MORE = /^\+\d+ more — keep typing to narrow$/;
    /* Add tag modal */
    let n0 = e0();
    await p.evaluate(() => { ST.article = 'n1'; promptAddArtTag('n2'); });
    await sleep(200);
    let s = await p.evaluate(() => ({ rows: document.querySelectorAll('#tp-list .ltn-row').length, more: [...document.querySelectorAll('#tp-list .tp-more')].map((e) => e.textContent) }));
    check(s.rows >= 1 && s.rows <= CAP && s.more.length === 1 && MORE.test(s.more[0]), `57e Add tag modal: first render ≤ ${CAP} rows plus one "+N more" line (${s.rows} rows, ${JSON.stringify(s.more)})`);
    await p.fill('#tp-srch', 'zz-last');
    await sleep(200);
    s = await p.evaluate(() => [...document.querySelectorAll('#tp-list .ltn-row')].map((e) => e.textContent));
    check(s.some((x) => x.includes('#zz-last-tag')), '57e Add tag modal: typing finds a tag that sorts past the first 100', JSON.stringify(s));
    await p.fill('#tp-srch', '');
    await sleep(100);
    s = await p.evaluate(() => { document.querySelectorAll('#tp-list .ltn-row')[0]; return { first: [...document.querySelectorAll('#tp-list .ltn-row')].slice(0, 1).map((e) => e.textContent) }; });
    await p.evaluate(() => closeModal());
    /* tags already on the note come first */
    await p.evaluate(() => { const a = DB.articles.find((x) => x.id === 'n2'); a.tags = ['zz-last-tag']; persist(); promptAddArtTag('n2'); });
    await sleep(200);
    s = await p.evaluate(() => ({ first: (document.querySelector('#tp-list .ltn-row') || {}).textContent || null }));
    check(s.first !== null && s.first.includes('#zz-last-tag'), '57e Add tag modal: a tag already on the note is listed first', JSON.stringify(s));
    await p.evaluate(() => closeModal());
    verdict('57e Add tag modal: no page errors', [], A.errors.slice(n0));

    /* imgAttachTag */
    n0 = e0();
    await p.evaluate(() => { ST.article = 'n3'; imgAttachTag(null, 60, 60); });
    await sleep(200);
    s = await p.evaluate(() => ({ rows: document.querySelectorAll('#item-menu .im-it').length, more: [...document.querySelectorAll('#item-menu .tp-more')].map((e) => e.textContent) }));
    check(s.rows >= 1 && s.rows <= CAP && s.more.length === 1 && MORE.test(s.more[0]), `57e imgAttachTag: first render ≤ ${CAP} rows plus one "+N more" line (${s.rows} rows, ${JSON.stringify(s.more)})`);
    await p.fill('#item-menu .im-search', 'zz-last');
    await sleep(200);
    s = await p.evaluate(() => [...document.querySelectorAll('#item-menu .im-it')].map((e) => e.textContent));
    check(s.some((x) => x.includes('zz-last-tag')), '57e imgAttachTag: typing finds a tag that sorts past the first 100', JSON.stringify(s));
    await p.evaluate(() => closeItemMenu());

    /* the item-menu search (image menu) */
    await p.evaluate(() => { const im = document.createElement('img'); im.className = 'ed-img'; im.id = 'probe-img'; document.body.appendChild(im); ST.article = 'n3'; itemMenu(im, 60, 60); });
    await sleep(200);
    await p.fill('#item-menu .im-search', 'i');
    await sleep(250);
    s = await p.evaluate(() => ({ rows: [...document.querySelectorAll('#item-menu .im-it')].filter((e) => e.textContent.startsWith('🏷')).length, more: [...document.querySelectorAll('#item-menu .tp-more')].map((e) => e.textContent) }));
    check(s.rows >= 1 && s.rows <= CAP && s.more.length === 1 && MORE.test(s.more[0]), `57e item-menu search: tag results ≤ ${CAP} plus one "+N more" line (${s.rows} rows, ${JSON.stringify(s.more)})`);
    await p.fill('#item-menu .im-search', 'zz-last');
    await sleep(250);
    s = await p.evaluate(() => [...document.querySelectorAll('#item-menu .im-it')].map((e) => e.textContent));
    check(s.some((x) => x.includes('zz-last-tag')), '57e item-menu search: typing finds a tag that sorts past the first 100', JSON.stringify(s));
    await p.evaluate(() => { closeItemMenu(); document.getElementById('probe-img')?.remove(); });
    verdict('57e imgAttachTag and item-menu search: no page errors', [], A.errors.slice(n0));

    /* sidebar search */
    n0 = e0();
    await sbOpen(p);
    await p.fill('#sq', 'i');
    await sleep(300);
    s = await p.evaluate(() => {
      const hd = [...document.querySelectorAll('#tree .sr-grp-hd')].find((e) => e.textContent.includes('Tags'));
      const rows = []; let n = hd && hd.nextElementSibling; let more = [];
      while (n && !n.classList.contains('sr-grp-hd')) { if (n.classList.contains('tp-more')) more.push(n.textContent); else if (n.classList.contains('sr')) rows.push(n.textContent); n = n.nextElementSibling; }
      return { hd: !!hd, rows: rows.length, more };
    });
    check(s.hd && s.rows >= 1 && s.rows <= SCAP && s.more.length === 1 && MORE.test(s.more[0]), `57e sidebar search: tag hits ≤ ${SCAP} plus one "+N more" line (${s.rows} rows, ${JSON.stringify(s.more)})`);
    await p.fill('#sq', 'zz-last');
    await sleep(300);
    s = await p.evaluate(() => [...document.querySelectorAll('#tree .sr')].map((e) => e.textContent));
    check(s.some((x) => x.startsWith('#zz-last-tag')), '57e sidebar search: typing finds a tag that sorts past the first 50', JSON.stringify(s));
    verdict('57e sidebar search: no page errors', [], A.errors.slice(n0));
  } finally { await A.close(); }
}

/* ── run ── */
if (want('57a') || want('57b')) for (const vp of VPS) await perLayout(vp);
if (want('57c')) await stored();
if (want('57d')) await speed();
if (want('57e')) await reachable();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
