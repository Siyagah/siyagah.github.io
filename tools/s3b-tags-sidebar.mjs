#!/usr/bin/env node
/* tools/s3b-tags-sidebar.mjs — v04.97, S3b: the sidebar Tags section opens to "Find a tag…", the 20
   most-used tags and "All tags (N)" (checks 58a–58h).

   Real clicks / taps and real typing in a booted app at 390x844, 820x1180 and 1440x900, with
   3,000 tags on 9,000 notes (the same seed as S3a's 57d), page errors counted.

   58a  open Tags: exactly the 20 most-used rows in count order, the box, "All tags (3000)"
   58b  type zz-l one key at a time: focus and caret stay in the box each time; the tag appears; click it
   58c  a selected tag outside the top 20 is still shown and marked, after renderTree()
   58d  "All tags" opens the picker in its Tags scope; picking a tag there selects it
   58e  right-click / long-press -> Rename and Delete, on a top-20 row and on a search-result row
        (Qur'an, تفسير)
   58f  small notebook (default seedDB): the full list, no box, no All-tags row
   58g  speed: renderTree open, render() open vs closed, keystroke, tag colour change
   58h  layout (no overflow, nothing clipped) and box text / placeholder contrast on the five presets

   `--only=58a,58c` runs just those. Each printed ok/FAIL line becomes one app-check check (block 58). */
import { openApp, seedDB } from './harness.mjs';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);

const VPS = [{ n: 390, w: 390, h: 844, touch: true }, { n: 820, w: 820, h: 1180, touch: true }, { n: 1440, w: 1440, h: 900, touch: false }];
const PRESETS = ['forest', 'ocean', 'amber', 'indigo', 'rose'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function check(ok, label, detail = '') {
  results.push({ ok, label });
  console.log((ok ? '  ok   ' : ' FAIL  ') + label + (detail ? '\n         ' + String(detail).slice(0, 700) : ''));
}
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

/* 3,000 tags on 9,000 notes (S3a's seed), plus: Qur'an on 2,000 notes (so it is in the top 20),
   تفسير on one note, zz-last-tag on one note (n5). */
function seed(page, NT = 3000, NN = 9000) {
  return page.evaluate(({ NT, NN }) => {
    let a = 12345 >>> 0; const R = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const words = ['fiqh', 'hadith', 'tafsir', 'seerah', 'aqeedah', 'history', 'recipe', 'travel', 'finance', 'tax', 'health', 'project', 'meeting', 'book', 'lecture', 'arabic', 'urdu', 'family', 'work', 'idea'];
    const tags = []; for (let i = 0; i < NT - 3; i++) tags.push(words[i % words.length] + (i >= words.length ? ' ' + words[Math.floor(i / words.length) % words.length] + ' ' + i : ''));
    const now = new Date().toISOString(), t0 = Date.now() - 4e6;
    DB.folders = [{ id: 'f1', name: '(001) A', parentId: null, order: 1, sectionId: 'sec-1', updatedAt: now }];
    DB.articles = []; DB.trash = []; DB.tombstones = []; DB.globalTags = [];
    for (let i = 0; i < NN; i++) {
      const k = Math.floor(R() * 7), ts = new Set();
      for (let j = 0; j < k; j++) ts.add(tags[Math.floor(Math.pow(R(), 2) * tags.length)]);
      if (i < 2000) ts.add("Qur'an");
      if (i === 3) ts.add('تفسير');
      if (i === 5) ts.add('zz-last-tag');
      const at = new Date(t0 + i * 400).toISOString();
      DB.articles.push({ id: 'n' + i, title: 'Note ' + i, content: '<p>Body ' + i + '</p>', folderIds: ['f1'], tags: [...ts], createdAt: at, updatedAt: at, kind: 'general' });
    }
    const used = new Set(DB.articles.flatMap((x) => x.tags));
    tags.forEach((t) => { if (!used.has(t)) DB.globalTags.push(t); });
    DB.tagColors = {}; DB.tagColorsAt = {};
    _seedThemeSnap(); _seedRecSnap(); persist(); _histReset();
    return { notes: DB.articles.length, tags: getAllTags().length };
  }, { NT, NN });
}
const sbOpen = async (page, q = '') => {
  await page.evaluate((q) => { try { closeModal(); } catch {} try { hideCtx(); } catch {} ST.search = ''; const i = document.getElementById('sq'); if (i) i.value = ''; ST.tag = null; ST.tagQ = q; ST.tagOpen = true; showPane('sb'); renderTree(); }, q);
  await sleep(100);
};
const rowsNow = (page) => page.evaluate(() => [...document.querySelectorAll('#tree .tag-row')].map((e) => ({ tag: e.dataset.tag, cnt: +e.querySelector('.tr-cnt').textContent, sel: e.classList.contains('sel') })));
/* the expected top 20, computed here from DB with plain code (count desc, then code-unit A–Z) */
const expectTop = (page) => page.evaluate(() => {
  const m = new Map(); DB.articles.forEach((a) => (a.tags || []).forEach((t) => m.set(t, (m.get(t) || 0) + 1)));
  return [...m].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0)).slice(0, 20);
});
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
async function openMenu(page, vp, t) {
  const row = page.locator('#tree .tag-row', { has: page.locator('.tr-name', { hasText: '#' + t }) }).first();
  if (vp.touch) await longPress(page, row); else { await row.scrollIntoViewIfNeeded(); await row.click({ button: 'right' }); }
  await sleep(150);
  return page.evaluate(() => { const m = document.getElementById('ctx'); return !!m && m.style.display !== 'none' && !!m.querySelector('.ci'); });
}

async function perLayout(vp) {
  const A = await openApp({ viewport: { width: vp.w, height: vp.h }, db: seedDB(), hasTouch: vp.touch });
  const page = A.page;
  const L = (s) => `${vp.n}: ${s}`;
  const errs = (n) => A.errors.slice(n);
  try {
    const info = await seed(page);
    await sleep(400);
    check(info.notes === 9000 && info.tags >= 3000, L('seed is 9,000 notes and 3,000 tags'), JSON.stringify(info));

    if (want('58a')) {
      const e0 = A.errors.length;
      await sbOpen(page);
      const rows = await rowsNow(page), top = await expectTop(page);
      const got = rows.map((r) => r.tag + ':' + r.cnt).join('|'), exp = top.map((r) => r.tag + ':' + r.count).join('|');
      check(rows.length === 20 && got === exp, L('58a the open section lists exactly the 20 most-used tags in count order'), `rows ${rows.length}\n got ${got.slice(0, 200)}\n exp ${exp.slice(0, 200)}`);
      const shape = await page.evaluate(() => {
        const body = document.querySelector('#tree .tag-sec .sec-body');
        return { kids: [...body.children].map((c) => c.id || c.className.split(' ').slice(0, 2).join('.')), box: !!document.getElementById('tag-find'), ph: document.getElementById('tag-find')?.placeholder, all: document.querySelector('#tree .tag-all-row .tr-name')?.textContent };
      });
      check(shape.box && shape.ph === 'Find a tag…' && shape.all === 'All tags (3000)' && shape.kids.length === 3 && shape.kids[0] === 'tag-find-wrap' && shape.kids[1] === 'tag-find-rows', L('58a the box, the rows and "All tags (3000)" — nothing else'), JSON.stringify(shape));
      check(A.errors.length === e0, L('58a no page errors'), errs(e0).join(' | '));
    }

    if (want('58b')) {
      const e0 = A.errors.length;
      await sbOpen(page);
      await page.click('#tag-find');
      const fails = [];
      const word = 'zz-l';
      for (let i = 0; i < word.length; i++) {
        await page.keyboard.type(word[i]);
        await sleep(60);
        const s = await page.evaluate(() => { const a = document.activeElement; return { id: a && a.id, v: a && a.value, c: a && a.selectionStart }; });
        if (s.id !== 'tag-find' || s.v !== word.slice(0, i + 1) || s.c !== i + 1) fails.push(`key ${i + 1}: ${JSON.stringify(s)}`);
      }
      /* a full redraw in the middle of typing must leave focus and caret where they were */
      await page.evaluate(() => renderTree());
      const s2 = await page.evaluate(() => { const a = document.activeElement; return { id: a && a.id, v: a && a.value, c: a && a.selectionStart }; });
      if (s2.id !== 'tag-find' || s2.v !== word || s2.c !== word.length) fails.push('after renderTree: ' + JSON.stringify(s2));
      check(!fails.length, L('58b focus and caret survive each keystroke and a renderTree()'), fails.join(' | '));
      const rows = await rowsNow(page);
      check(rows.length === 1 && rows[0].tag === 'zz-last-tag', L('58b typing "zz-l" shows the tag that sorts last'), JSON.stringify(rows));
      await page.locator('#tree .tag-row').first().click();
      await sleep(300);
      const st = await page.evaluate(() => ({ tag: ST.tag, p2: document.getElementById('p2c').textContent }));
      check(st.tag === 'zz-last-tag' && st.p2.includes('Note 5'), L('58b clicking it selects it and Pane 2 lists its note'), JSON.stringify({ tag: st.tag, p2: st.p2.slice(0, 80) }));
      /* Escape clears */
      await sbOpen(page, 'zz');
      await page.click('#tag-find'); await page.keyboard.press('Escape'); await sleep(80);
      const esc = await page.evaluate(() => ({ q: ST.tagQ, v: document.getElementById('tag-find').value, n: document.querySelectorAll('#tree .tag-row').length }));
      check(esc.q === '' && esc.v === '' && esc.n === 20, L('58b Escape clears the box and brings back the 20'), JSON.stringify(esc));
      /* +N more */
      await sbOpen(page, 'a');
      const more = await page.evaluate(() => ({ n: document.querySelectorAll('#tree .tag-row').length, m: document.querySelector('#tree .tag-more')?.textContent }));
      check(more.n === 50 && /^\+\d+ more — keep typing$/.test(more.m || ''), L('58b a wide query shows 50 rows and "+N more — keep typing"'), JSON.stringify(more));
      check(A.errors.length === e0, L('58b no page errors'), errs(e0).join(' | '));
    }

    if (want('58c')) {
      const e0 = A.errors.length;
      await sbOpen(page);
      await page.evaluate(() => { ST.tag = 'zz-last-tag'; renderTree(); });
      const rows = await rowsNow(page);
      const s = rows.find((r) => r.tag === 'zz-last-tag');
      check(rows.length === 21 && s && s.sel, L('58c a selected tag outside the top 20 is shown and marked'), JSON.stringify(rows.slice(-2)));
      await page.evaluate(() => { ST.tag = null; });
      check(A.errors.length === e0, L('58c no page errors'), errs(e0).join(' | '));
    }

    if (want('58d')) {
      const e0 = A.errors.length;
      await sbOpen(page);
      await page.locator('#tree .tag-all-row').click();
      await sleep(400);
      const st = await page.evaluate(() => ({ kind: _pkScopeKind, rows: document.querySelectorAll('#pkList .pnav').length, title: document.querySelector('#mb .pk-mt-title')?.textContent }));
      check(st.kind === 'tags' && st.rows >= 3000 && /Tags/.test(st.title || ''), L('58d "All tags" opens the picker in its Tags scope'), JSON.stringify(st));
      await page.locator('#pkList .pnav', { hasText: '#zz-last-tag' }).first().click();
      await sleep(300);
      const sel = await page.evaluate(() => ({ tag: ST.tag, modal: !!document.querySelector('#mb .pk-mt-title') }));
      check(sel.tag === 'zz-last-tag', L('58d picking a tag there selects it'), JSON.stringify(sel));
      check(A.errors.length === e0, L('58d no page errors'), errs(e0).join(' | '));
    }

    if (want('58e')) {
      const e0 = A.errors.length;
      /* a top-20 row: Qur'an -> Rename */
      await sbOpen(page);
      let ok = await openMenu(page, vp, "Qur'an");
      let fails = [];
      if (!ok) fails.push('no menu on Qur\'an');
      else {
        await page.click('#ctx .ci:has-text("Rename tag")'); await sleep(150);
        await page.fill('.tag-row .sec-inp', 'Quran "renamed"'); await page.keyboard.press('Enter'); await sleep(300);
        const n = await page.evaluate(() => ({ old: DB.articles.filter((a) => a.tags.includes("Qur'an")).length, nw: DB.articles.filter((a) => a.tags.includes('Quran "renamed"')).length }));
        if (n.old !== 0 || n.nw !== 2000) fails.push('rename ' + JSON.stringify(n));
      }
      check(!fails.length, L("58e Rename on a top-20 row (Qur'an)"), fails.join(' | '));
      /* a top-20 row: Delete (the renamed one) */
      await sbOpen(page);
      fails = [];
      ok = await openMenu(page, vp, 'Quran "renamed"');
      if (!ok) fails.push('no menu');
      else {
        page.once('dialog', (d) => d.accept());
        await page.click('#ctx .ci:has-text("Delete tag")'); await sleep(400);
        const n = await page.evaluate(() => DB.articles.filter((a) => a.tags.includes('Quran "renamed"')).length);
        if (n !== 0) fails.push('still on ' + n + ' notes');
      }
      check(!fails.length, L('58e Delete on a top-20 row'), fails.join(' | '));
      /* a search-result row: تفسير -> Rename, then Delete */
      await sbOpen(page, 'تفسير');
      fails = [];
      ok = await openMenu(page, vp, 'تفسير');
      if (!ok) fails.push('no menu on تفسير');
      else {
        await page.click('#ctx .ci:has-text("Rename tag")'); await sleep(150);
        await page.fill('.tag-row .sec-inp', "تفسير O'Neil"); await page.keyboard.press('Enter'); await sleep(300);
        const n = await page.evaluate(() => DB.articles.filter((a) => a.tags.includes("تفسير O'Neil")).length);
        if (n !== 1) fails.push('rename ' + n);
      }
      check(!fails.length, L('58e Rename on a search-result row (تفسير)'), fails.join(' | '));
      await sbOpen(page, 'تفسير');
      fails = [];
      ok = await openMenu(page, vp, "تفسير O'Neil");
      if (!ok) fails.push('no menu');
      else {
        page.once('dialog', (d) => d.accept());
        await page.click('#ctx .ci:has-text("Delete tag")'); await sleep(400);
        const n = await page.evaluate(() => DB.articles.filter((a) => a.tags.includes("تفسير O'Neil")).length);
        if (n !== 0) fails.push('still on ' + n);
      }
      check(!fails.length, L('58e Delete on a search-result row'), fails.join(' | '));
      check(A.errors.length === e0, L('58e no page errors'), errs(e0).join(' | '));
    }

    if (want('58h')) {
      const e0 = A.errors.length;
      await sbOpen(page, '');
      const g = await page.evaluate(() => {
        const sb = document.getElementById('sb') || document.getElementById('tree').parentElement;
        const sr = sb.getBoundingClientRect(), tr = document.getElementById('tree');
        const bad = [];
        document.querySelectorAll('#tree .tag-sec .sec-body > *, #tree .tag-sec .tag-row, #tree .tag-find').forEach((e) => {
          const b = e.getBoundingClientRect();
          if (b.left < sr.left - 0.5 || b.right > sr.right + 0.5) bad.push(`${e.className.slice(0, 20)} ${Math.round(b.left)}-${Math.round(b.right)} vs ${Math.round(sr.left)}-${Math.round(sr.right)}`);
        });
        const all = document.querySelector('#tree .tag-all-row .tr-name');
        return { bad: bad.slice(0, 4), hscroll: tr.scrollWidth > tr.clientWidth + 1, sbScroll: sb.scrollWidth > sb.clientWidth + 1, allClipped: all.scrollWidth > all.clientWidth + 1, boxW: Math.round(document.getElementById('tag-find').getBoundingClientRect().width) };
      });
      check(!g.bad.length && !g.hscroll && !g.sbScroll && !g.allClipped && g.boxW > 100, L('58h the box, the 20 rows and "All tags" fit the sidebar (no overflow, nothing clipped)'), JSON.stringify(g));
      check(A.errors.length === e0, L('58h no page errors'), errs(e0).join(' | '));
    }
  } finally { await A.close(); }
}

/* 58f — small notebook: as before */
async function small() {
  const A = await openApp({ viewport: { width: 1440, height: 900 }, db: seedDB() });
  const p = A.page;
  try {
    await sbOpen(p);
    const s = await p.evaluate(() => ({ box: !!document.getElementById('tag-find'), all: !!document.querySelector('#tree .tag-all-row'), rows: [...document.querySelectorAll('#tree .tag-row')].map((e) => e.dataset.tag), tags: getAllTags().map((t) => t.tag) }));
    check(!s.box && !s.all && s.rows.length >= 1 && JSON.stringify(s.rows) === JSON.stringify(s.tags), '58f one tag (default seedDB): the full list, no box, no All-tags row', JSON.stringify(s));
    /* the threshold: 24 tags = full A–Z list, 25 = the new shape */
    const t = await p.evaluate(() => {
      const out = {};
      for (const n of [24, 25]) {
        DB.globalTags = Array.from({ length: n }, (_, i) => 'g' + String(i).padStart(2, '0')); DB.articles.forEach((a) => { a.tags = []; });
        ST.tagOpen = true; renderTree();
        out[n] = { box: !!document.getElementById('tag-find'), rows: document.querySelectorAll('#tree .tag-row').length };
      }
      return out;
    });
    check(!t[24].box && t[24].rows === 24 && t[25].box && t[25].rows === 20, '58f 24 tags show the full list; 25 tags get the box and the top 20', JSON.stringify(t));
    check(A.errors.length === 0, '58f no page errors', A.errors.join(' | '));
  } finally { await A.close(); }
}

/* 58g — speed */
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
  const T = { treePhone: 60, treeLaptop: 30, keyPhone: 50, colour: 60 };
  for (const vp of [{ name: 'phone', w: 390, h: 844, th: 4, touch: true }, { name: 'tablet', w: 820, h: 1180, th: 1, touch: true }, { name: 'laptop', w: 1440, h: 900, th: 1, touch: false }]) {
    const A = await openApp({ viewport: { width: vp.w, height: vp.h }, db: seedDB(), hasTouch: vp.touch });
    const p = A.page;
    try {
      const info = await seed(p);
      await sleep(500);
      if (vp.th > 1) { const cdp = await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: vp.th }); }
      const r = {};
      r.renderTree_closed = await timeIt(p, 'renderTree()', 15, 'ST.tagOpen=false;ST.tagQ=""');
      r.renderTree_open = await timeIt(p, 'renderTree()', 15, 'ST.tagOpen=true;ST.tagQ=""');
      r.keystroke = await timeIt(p, 'tagFind("fiq")', 5, 'ST.tagOpen=true;renderTree()');
      r.keystroke_wide = await timeIt(p, 'tagFind("a")', 5);
      r.render_closed = await timeIt(p, 'render()', 3, 'ST.tagOpen=false;ST.tagQ=""');
      r.render_open = await timeIt(p, 'render()', 3, 'ST.tagOpen=true;ST.tagQ=""');
      /* the colour change: the same callback showTagClrPicker runs (persist + render) */
      const colour = (open) => timeIt(p, 'DB.tagColors["fiqh"]="#a05030";DB.tagColorsAt["fiqh"]=Date.now();persist();render()', 3, `ST.tagOpen=${open}`);
      r.colour_closed = await colour(false);
      r.colour_open = await colour(true);
      console.log('P58g ' + vp.name + ' ' + JSON.stringify(r));
      const L = (s) => `58g ${vp.name}${vp.th > 1 ? ' (CPU x' + vp.th + ')' : ''}: ${s}`;
      const tt = vp.name === 'phone' ? T.treePhone : T.treeLaptop;
      check(info.notes === 9000 && info.tags >= 3000, L('seed is 9,000 notes and 3,000 tags'), JSON.stringify(info));
      check(r.renderTree_open <= tt, L(`renderTree() with Tags open ≤ ${tt} ms (${r.renderTree_open} ms; closed ${r.renderTree_closed} ms)`));
      if (vp.name === 'phone') check(r.keystroke <= T.keyPhone && r.keystroke_wide <= T.keyPhone, L(`a keystroke in the box ≤ ${T.keyPhone} ms (${r.keystroke} ms; wide query ${r.keystroke_wide} ms)`));
      else check(true, L(`a keystroke in the box: ${r.keystroke} ms (wide query ${r.keystroke_wide} ms)`));
      if (vp.name !== 'tablet') check(r.render_open - r.render_closed <= T.colour, L(`render() open costs ≤ ${T.colour} ms more than closed (open ${r.render_open} ms, closed ${r.render_closed} ms)`));
      else check(true, L(`render() open ${r.render_open} ms, closed ${r.render_closed} ms`));
      if (vp.name !== 'tablet') check(r.colour_open - r.colour_closed <= T.colour, L(`a tag colour change with Tags open costs ≤ ${T.colour} ms more than closed (open ${r.colour_open} ms, closed ${r.colour_closed} ms)`));
      else check(true, L(`tag colour change: open ${r.colour_open} ms, closed ${r.colour_closed} ms`));
      check(!A.errors.length, L('no page errors'), A.errors.slice(0, 5).join(' | '));
    } finally { await A.close(); }
  }
}

/* 58h — the box's ink and placeholder on the five presets, at every size */
const px = (c) => { const m = String(c).match(/[\d.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 }; };
const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
const flatten = (stack) => { let bg = px('rgb(255,255,255)'); for (let i = stack.length - 1; i >= 0; i--) bg = over(px(stack[i]), bg); return bg; };
async function contrast() {
  for (const vp of VPS) {
    const fails = [], seen = [];
    for (const preset of PRESETS) {
      const db = seedDB(); db.theme = { preset, custom: {} };
      db.globalTags = Array.from({ length: 40 }, (_, i) => 'tag' + i);
      const A = await openApp({ viewport: { width: vp.w, height: vp.h }, db, hasTouch: vp.touch });
      try {
        await sbOpen(A.page);
        for (const focused of [false, true]) {
          if (focused) await A.page.click('#tag-find');
          const m = await A.page.evaluate(() => {
            const el = document.getElementById('tag-find');
            const stackOf = (e) => { const st = []; for (let n = e; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') st.push(c); if (/^rgb\(/.test(c)) break; } return st; };
            return { ink: getComputedStyle(el).color, ph: getComputedStyle(el, '::placeholder').color, stack: stackOf(el) };
          });
          const bg = flatten(m.stack);
          const ci = ratio(over(px(m.ink), bg), bg), cp = ratio(over(px(m.ph), bg), bg);
          seen.push(`${preset}${focused ? '+focus' : ''} ${ci.toFixed(1)}/${cp.toFixed(1)}`);
          if (ci < 4.5) fails.push(`${preset}${focused ? '+focus' : ''} text ${ci.toFixed(2)}:1`);
          if (cp < 4.5) fails.push(`${preset}${focused ? '+focus' : ''} placeholder ${cp.toFixed(2)}:1`);
        }
        if (A.errors.length) fails.push('page errors: ' + A.errors.slice(0, 2).join(' | '));
      } finally { await A.close(); }
    }
    check(!fails.length, `${vp.n}: 58h the box's text and placeholder clear 4.5:1 on all five presets`, fails.length ? fails.join(' · ') : seen.join(' · '));
  }
}

if (['58a', '58b', '58c', '58d', '58e', '58h'].some(want)) for (const vp of VPS) await perLayout(vp);
if (want('58f')) await small();
if (want('58g')) await speed();
if (want('58h')) await contrast();
const failed = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
