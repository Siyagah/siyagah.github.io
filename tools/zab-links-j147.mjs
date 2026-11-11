#!/usr/bin/env node
/* tools/zab-links-j147.mjs — v05.91, J147 (block 149): links on every Zab item.
   node tools/zab-links-j147.mjs

   149a  3 links added to one item with real taps/clicks (panel) → 3 cards with title/host, a tap opens a NEW tab at the right address, a javascript: address is refused
   149b  the add control works in each Zab kind (plain, links, tasks, ideas, shop); the Links pocket's own url is untouched by `links`; a News Zab item has none
   149c  move to another Zab (and a nested one) → a NEW item there, gone here, ONE copy after a merge into a stale copy both ways
   149d  delete → Trash entry (shown as "Zab link: …"), Restore brings it back on its item; with the item deleted, Restore makes a new item
   149e  A: the folder chooser fills the window at 820/1440 (⛶ shrinks it), is a sheet at 390; a note is made in the picked folder with the card, nothing live in a.content
   149f  B: appended at the end of a picked note; a note open in the editor gets it through the editor and the typed text survives
   149g  → Note carries the cards; a deck card shows them; a repaint never happens under an open add box
   149h  390 / 820 / 1440: no horizontal overflow, phone targets >= 44 px, no page errors */
import { openApp, report, seedDB } from './harness.mjs';

const r = report('J147 — links on every Zab item');
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const U1 = 'https://zablink.test/alpha/page-one', U2 = 'https://www.zablink.test/beta', U3 = 'http://zablink.test/gamma?x=1';

for (const [w, h, touch] of [[390, 844, true], [820, 1180, true], [1440, 900, false]]) {
  const t = `@${w}`, phone = w < 640;
  const app = await openApp({ viewport: { width: w, height: h }, db: seedDB(), hasTouch: touch });
  const p = app.page;
  await p.context().route('**://zablink.test/**', (rt) => rt.fulfill({ status: 200, contentType: 'text/html', body: '<title>x</title>ok' }));
  await p.context().route('**://www.zablink.test/**', (rt) => rt.fulfill({ status: 200, contentType: 'text/html', body: '<title>x</title>ok' }));
  const act = async (loc) => (touch ? loc.tap() : loc.click());
  const panelItem = (iid) => p.locator(`#jeb-panel .jeb-it[data-iid="${iid}"]`).first();
  const mk = (pid, txt) => p.evaluate(([pid, txt]) => { const id = jebAddItem(pid, txt); jebOpenPanel(pid); _jebPanelSig = ''; jebRefresh(); return id; }, [pid, txt]);
  /* add one link by real taps: the control, type, Enter */
  const addByTap = async (iid, url) => {
    const open = p.locator(`#jeb-panel .jeb-it[data-iid="${iid}"] .jlk-open`).first();
    if (await open.count()) { await act(open); await sleep(150); }
    await p.keyboard.type(url); await p.keyboard.press('Enter'); await sleep(250);
  };
  const links = (iid) => p.evaluate((i) => (DB.jeb.find((x) => x.id === i) || {}).links || null, iid);
  try {
    const plain = await p.evaluate(() => jebAddPocket('Plain Z', '✎', '#E6DCF7'));
    const inner = await p.evaluate((pl) => jebAddPocket('Inner Z', '✎', '#D8F0D2', pl), plain);

    /* ── 149a ── */
    const a = await mk(plain, 'Item with links');
    await sleep(250);
    await addByTap(a, U1); await addByTap(a, U2);
    await addByTap(a, U3);
    const cards = await p.evaluate((i) => [...document.querySelectorAll(`#jeb-panel .jeb-it[data-iid="${i}"] .jlk`)].map((c) => ({ t: c.querySelector('.jlk-t').textContent, h: c.querySelector('.jlk-h').textContent, href: c.querySelector('a').getAttribute('href'), tg: c.querySelector('a').target, rel: c.querySelector('a').rel })), a);
    r.check(cards.length === 3 && cards[0].h === 'zablink.test' && cards[1].h === 'zablink.test' && /alpha/.test(cards[0].t) && cards.every((c) => c.tg === '_blank' && /noopener/.test(c.rel)), `149a${t} 3 cards with title and host, opening in a new tab`, JSON.stringify(cards));
    const lk = await links(a);
    r.check(lk && lk.length === 3 && lk[0].u === U1 + '' && lk.every((x) => x.id && x.at), `149a${t} stored as links:[{id,u,at}]`, JSON.stringify(lk));
    const [pop] = await Promise.all([p.context().waitForEvent('page', { timeout: 8000 }).catch(() => null), act(p.locator(`#jeb-panel .jeb-it[data-iid="${a}"] .jlk-a`).first())]);
    if (pop) await pop.waitForLoadState('domcontentloaded').catch(() => {});
    r.check(!!pop && pop.url().startsWith(U1), `149a${t} one tap opens a new tab at the right address`, pop ? pop.url() : 'no popup');
    if (pop) await pop.close().catch(() => {});
    const still = await p.evaluate(() => !document.querySelector('#jeb-panel .jeb-edit'));
    r.check(still, `149a${t} the tap on a card does not start editing the item`, '');
    await act(p.locator(`#jeb-panel .jeb-it[data-iid="${a}"] .jlk-open`).first()); await sleep(150);
    await p.keyboard.type('javascript:alert(1)'); await p.keyboard.press('Enter'); await sleep(200);
    const bad = await p.evaluate((i) => ({ n: (DB.jeb.find((x) => x.id === i).links || []).length, toast: (document.querySelector('.toast') || {}).textContent }), a);
    r.check(bad.n === 3 && /web address/i.test(bad.toast || ''), `149a${t} a javascript: address is refused with a plain message`, JSON.stringify(bad));
    const direct = await p.evaluate((i) => { jebEditItem(i, { links: [{ id: 'z', u: 'javascript:1', at: 'x' }, { id: 'y', u: 'data:text/html,hi', at: 'x' }] }); return DB.jeb.find((x) => x.id === i).links || null; }, a);
    r.check(direct === null, `149a${t} jebEditItem keeps only http(s) and deletes the key when empty (never [])`, JSON.stringify(direct));
    await p.evaluate(([i, u1, u2, u3]) => { jebEditItem(i, { links: [{ id: 'l1', u: u1, at: new Date().toISOString() }, { id: 'l2', u: u2, at: new Date().toISOString() }, { id: 'l3', u: u3, at: new Date().toISOString() }] }); _jebPanelSig = ''; jebRefresh(); }, [a, U1, U2, U3]);

    /* ── 149b ── */
    const kinds = { 'jp-task': 'tasks', 'jp-idea': 'ideas', 'jp-shop': 'shop', 'jp-link': 'links' };
    let okKinds = [];
    for (const pid of ['jp-task', 'jp-idea', 'jp-shop', 'jp-link']) {
      const iid = await mk(pid, pid === 'jp-link' ? 'https://zablink.test/own-url' : 'Kind item ' + pid);
      await sleep(250);
      const before = await p.evaluate((i) => (DB.jeb.find((x) => x.id === i) || {}).url || '', iid);
      await addByTap(iid, U2);
      const after = await p.evaluate((i) => { const x = DB.jeb.find((y) => y.id === i); return { n: (x.links || []).length, url: x.url || '', card: document.querySelectorAll(`#jeb-panel .jeb-it[data-iid="${i}"] .jlk`).length }; }, iid);
      if (after.n === 1 && after.card === 1 && after.url === before) okKinds.push(kinds[pid]);
      await p.evaluate(() => { _jlkOpen = null; });
    }
    r.check(okKinds.length === 4, `149b${t} the add control works in tasks, ideas, shop and links Zabs, the Links pocket's own url untouched`, JSON.stringify(okKinds));
    const news = await p.evaluate(() => { const id = jebAddPocket('News Z', '📰', '#CFE8FF'); jebEditPocket(id, { ztype: 'news' }); const it = jebAddItem(id, 'chan'); return { added: jebAddLink(it, 'https://zablink.test/x'), has: !!(DB.jeb.find((x) => x.id === it).links) }; });
    r.check(news.added === null && !news.has, `149b${t} a News Zab item takes no links`, JSON.stringify(news));

    /* ── 149c ── */
    await p.evaluate((pid) => { _jlkOpen = null; jebOpenPanel(pid); _jebPanelSig = ''; jebRefresh(); }, plain);
    await sleep(250);
    await act(p.locator(`#jeb-panel .jeb-it[data-iid="${a}"] .jlk[data-lid="l2"] .jlk-more`).first()); await sleep(250);
    const menu = await p.evaluate(() => [...document.querySelectorAll('#jeb-menu .ci, #jeb-menu button, #jeb-menu [role=menuitem]')].map((x) => x.textContent.trim()));
    r.check(['Rename', 'Move to another Zab', 'To a new note in a folder', 'Add to an existing note', 'Delete link'].every((k) => menu.some((m) => m.includes(k))), `149c${t} the card's ⋯ menu has Rename, Move, A, B and Delete`, JSON.stringify(menu));
    await act(p.locator('#jeb-menu :text("Move to another Zab")').first()); await sleep(300);
    const rows = await p.evaluate(() => [...document.querySelectorAll('#mb .jx-mv')].map((b) => ({ n: b.textContent.trim(), off: b.disabled })));
    r.check(rows.some((x) => /Inner Z/.test(x.n) && !x.off) && rows.some((x) => /Plain Z/.test(x.n) && x.off), `149c${t} the picker lists every Zab at any depth, the current one greyed`, JSON.stringify(rows.slice(0, 12)));
    const stale = await p.evaluate(() => JSON.parse(JSON.stringify(DB)));
    await sleep(30);
    await act(p.locator('#mb .jx-mv', { hasText: 'Inner Z' }).first()); await sleep(400);
    const mv = await p.evaluate(([i]) => { const it = DB.jeb.find((x) => x.id === i), nw = DB.jeb.filter((x) => (x.links || []).some((l) => l.id === 'l2')); return { here: (it.links || []).map((l) => l.id), nw: nw.map((x) => ({ p: x.pocketId, text: x.text, n: x.links.length })) }; }, [a]);
    r.check(mv.here.join() === 'l1,l3' && mv.nw.length === 1 && mv.nw[0].p === inner && mv.nw[0].n === 1 && /beta/.test(mv.nw[0].text), `149c${t} moved: a NEW item in the nested Zab holds the link, the old item lost it`, JSON.stringify(mv));
    const mg = await p.evaluate((st) => {
      const cp = (o) => JSON.parse(JSON.stringify(o)), A1 = cp(DB);
      const cnt = (d) => d.jeb.filter((x) => (x.links || []).some((l) => l.id === 'l2')).length;
      const MB = mergeDB(cp(st), cp(A1)), MA = mergeDB(cp(A1), cp(st));
      return { b: cnt(MB), a: cnt(MA) };
    }, stale);
    r.check(mg.a === 1 && mg.b === 1, `149c${t} a merge into a stale copy, both ways, keeps exactly one copy`, JSON.stringify(mg));

    /* ── 149d ── */
    await p.evaluate((pid) => { jebOpenPanel(pid); _jebPanelSig = ''; jebRefresh(); }, plain);
    await sleep(250);
    const d1 = await p.evaluate((i) => { const ok = jebDeleteLink(i, 'l1'); const e = DB.trash.filter((x) => x.type === 'jebLink'); return { ok, e: e.map((x) => ({ itemId: x.itemId, pocketId: x.pocketId, id: x.link.id })), left: (DB.jeb.find((x) => x.id === i).links || []).map((l) => l.id) }; }, a);
    r.check(d1.ok && d1.e.length === 1 && d1.e[0].itemId === a && d1.e[0].pocketId === plain && d1.left.join() === 'l3', `149d${t} delete → a jebLink Trash entry, gone from the item`, JSON.stringify(d1));
    const tr = await p.evaluate(() => { openModal && 0; if (typeof openTrash === 'function') openTrash(); else openModal('trash'); renderTrashModal(); return (document.getElementById('trash-body') || document.body).innerText; });
    r.check(/Zab link: /.test(tr), `149d${t} Trash shows "Zab link: …"`, tr.slice(0, 200));
    const eid = await p.evaluate(() => DB.trash.find((x) => x.type === 'jebLink').id);
    await p.evaluate((e) => restoreItem(e), eid); await sleep(200);
    const d2 = await p.evaluate((i) => ({ back: (DB.jeb.find((x) => x.id === i).links || []).map((l) => l.id), tr: DB.trash.filter((x) => x.type === 'jebLink').length }), a);
    r.check(d2.back.join() === 'l3,l1' && d2.tr === 0, `149d${t} Restore puts it back on its item`, JSON.stringify(d2));
    const d3 = await p.evaluate((i) => { const it = DB.jeb.find((x) => x.id === i), pid = it.pocketId; jebDeleteLink(i, 'l3'); jebDeleteItem(i); const eid = DB.trash.find((x) => x.type === 'jebLink').id; restoreItem(eid); const nw = DB.jeb.filter((x) => (x.links || []).some((l) => l.id === 'l3')); return { n: nw.length, pid: nw[0] && nw[0].pocketId, want: pid }; }, a);
    r.check(d3.n === 1 && d3.pid === d3.want, `149d${t} with the item deleted, Restore makes a new item in the same Zab`, JSON.stringify(d3));
    await p.evaluate(() => closeModal());

    /* ── 149e (A) ── */
    const e1 = await mk(plain, 'For A'); await sleep(200);
    await p.evaluate((i) => { jebAddLink(i, 'https://zablink.test/for-a'); _jebPanelSig = ''; jebRefresh(); }, e1);
    const eLid = await p.evaluate((i) => DB.jeb.find((x) => x.id === i).links[0].id, e1);
    await act(p.locator(`#jeb-panel .jeb-it[data-iid="${e1}"] .jlk-more`).first()); await sleep(250);
    await act(p.locator('#jeb-menu :text("To a new note in a folder")').first()); await sleep(500);
    const box = await p.evaluate(() => { const m = document.getElementById('mb').getBoundingClientRect(); return { l: m.left, t: m.top, w: m.width, h: m.height, W: innerWidth, H: innerHeight, fs: document.getElementById('mb').classList.contains('mb-fs-on'), title: (document.querySelector('#mb .mt') || {}).textContent }; });
    if (phone) r.check(box.w >= box.W - 40 && box.h >= box.H * 0.8 - 2 && /pick a folder/.test(box.title), `149e${t} a full-height sheet on a phone`, JSON.stringify(box));
    else r.check(box.fs && Math.abs(box.w - box.W) <= 2 && Math.abs(box.h - box.H) <= 2, `149e${t} the folder chooser fills the window`, JSON.stringify(box));
    if (!phone) {
      await act(p.locator('#mb-fs')); await sleep(300);
      const sm = await p.evaluate(() => { const m = document.getElementById('mb').getBoundingClientRect(); return { w: m.width, h: m.height, W: innerWidth, H: innerHeight }; });
      r.check(sm.w < sm.W - 40 && sm.h < sm.H - 40, `149e${t} ⛶ makes it a window`, JSON.stringify(sm));
      await act(p.locator('#mb-fs')); await sleep(300);
    }
    await p.fill('#jlk-fq', 'Second'); await sleep(200);
    const rowsF = await p.evaluate(() => [...document.querySelectorAll('#jlk-fl .pr')].map((x) => x.textContent.trim()));
    r.check(rowsF.some((x) => /Second Folder/.test(x)) && !rowsF.some((x) => /Seeded Folder/.test(x)), `149e${t} the folder list is searchable`, JSON.stringify(rowsF));
    await act(p.locator('#jlk-fl .pr', { hasText: 'Second Folder' }).first()); await sleep(400);
    const an = await p.evaluate(([i, l]) => { const n = DB.articles.find((x) => x.fromJeb && /zablink\.test/.test(x.title + x.content) && x.folderIds.includes('f2')); return { has: !!n, c: n && n.content, linkLeft: (DB.jeb.find((x) => x.id === i).links || []).some((y) => y.id === l), toast: !!document.querySelector('.toast-act') }; }, [e1, eLid]);
    r.check(an.has && /<a href="https:\/\/zablink\.test\/for-a">/.test(an.c) && !/data:|<script|jlk|contenteditable|onclick/i.test(an.c) && !an.linkLeft && an.toast, `149e${t} A: a note in the picked folder holds the plain link card, the item lost it, the toast offers Open note`, JSON.stringify(an).slice(0, 300));

    /* ── 149f (B) ── */
    const f1 = await mk(plain, 'For B'); await sleep(200);
    await p.evaluate((i) => { jebAddLink(i, 'https://zablink.test/for-b'); jebAddLink(i, 'https://zablink.test/for-b2'); _jebPanelSig = ''; jebRefresh(); }, f1);
    await act(p.locator(`#jeb-panel .jeb-it[data-iid="${f1}"] .jlk-more`).first()); await sleep(250);
    await act(p.locator('#jeb-menu :text("Add to an existing note")').first()); await sleep(500);
    await p.fill('#jlk-nq', 'Second'); await sleep(500);
    const nrows = await p.evaluate(() => [...document.querySelectorAll('#jlk-nl .pr')].map((x) => x.textContent.trim()));
    r.check(nrows.length >= 1 && nrows.every((x) => /Second/i.test(x)), `149f${t} the note chooser searches notes`, JSON.stringify(nrows));
    await act(p.locator('#jlk-nl .pr', { hasText: 'Seeded note two' }).first()); await sleep(400);
    const bn = await p.evaluate((i) => { const n = DB.articles.find((x) => x.id === 'a2'); return { end: /for-b"/.test(n.content) && n.content.indexOf('Second note') < n.content.indexOf('for-b'), left: (DB.jeb.find((x) => x.id === i).links || []).length, live: /jlk|contenteditable|data:/.test(n.content) }; }, f1);
    r.check(bn.end && bn.left === 1 && !bn.live, `149f${t} B: appended at the end of the picked note, the item lost that link`, JSON.stringify(bn));
    /* the note open in the editor: typed text survives, the link arrives through the editor */
    await p.evaluate(() => { selFolder('f1'); });
    await sleep(400);
    await p.evaluate(() => { selArt('a1'); startEdit && startEdit(); }); await sleep(600);
    const typed = await p.evaluate(() => { const ed = document.getElementById('ed'); if (!ed) return false; ed.focus(); const pp = document.createElement('p'); pp.textContent = 'TYPED-BEFORE-LINK'; ed.appendChild(pp); ed.dispatchEvent(new Event('input', { bubbles: true })); return true; });
    const rest = await p.evaluate((i) => { const l = DB.jeb.find((x) => x.id === i).links[0]; return jebLinkToExisting(i, l.id, 'a1'); }, f1);
    await sleep(900);
    const ed = await p.evaluate(() => ({ ed: (document.getElementById('ed') || {}).innerHTML || '', db: DB.articles.find((x) => x.id === 'a1').content }));
    r.check(typed && rest === 'a1' && /TYPED-BEFORE-LINK/.test(ed.ed) && /for-b2/.test(ed.ed) && ed.ed.indexOf('TYPED-BEFORE-LINK') < ed.ed.indexOf('for-b2') && /for-b2/.test(ed.db), `149f${t} a note open in the editor: the link is appended through the editor and the typing survives`, JSON.stringify({ typed, rest, ed: ed.ed.slice(-200) }));
    await p.evaluate(() => { try { cancelEdit && cancelEdit(); } catch (e) {} });

    /* ── 149g ── */
    const g1 = await mk('jp-task', 'Task with links'); await sleep(200);
    await p.evaluate((i) => { jebAddLink(i, 'https://zablink.test/g1'); jebAddLink(i, 'https://zablink.test/g2'); _jebPanelSig = ''; jebRefresh(); }, g1);
    const gn = await p.evaluate((i) => { const id = jebToNote(i); const n = DB.articles.find((x) => x.id === id); return { c: n && n.content, gone: !DB.jeb.some((x) => x.id === i) }; }, g1);
    r.check(gn.gone && /g1"/.test(gn.c || '') && /g2"/.test(gn.c || '') && (gn.c.match(/<a href/g) || []).length === 2, `149g${t} → Note carries the link cards`, (gn.c || '').slice(0, 200));
    const g2 = await mk(plain, 'Deck item'); await sleep(200);
    await p.evaluate((i) => { jebAddLink(i, 'https://zablink.test/deck1'); _jebPanelSig = ''; jebRefresh(); jebOpenDeck({ ids: [DB.jeb.find((x) => x.id === i).pocketId], all: false }); }, g2);
    await sleep(500);
    const dk = await p.evaluate((i) => ({ n: document.querySelectorAll(`#jeb-deck .jeb-card[data-iid="${i}"] .jlk`).length, open: !!document.querySelector(`#jeb-deck .jeb-card[data-iid="${i}"] .jlk-open`) }), g2);
    r.check(dk.n === 1 && dk.open, `149g${t} a deck card shows the link cards and the add control`, JSON.stringify(dk));
    await act(p.locator(`#jeb-deck .jeb-card[data-iid="${g2}"] .jlk-open`).first()); await sleep(200);
    await p.keyboard.type('https://zablink.test/typing-in-progr');
    const g3 = await p.evaluate(() => { const iid = DB.jeb.find((x) => x.text === 'Deck item').id; jebEditItem(iid, { done: true }); _jebDeckSig = ''; jebRefresh(); const inp = document.querySelector('#jeb-deck .jlk-in'); return { v: inp && inp.value, same: !!inp }; });
    r.check(g3.same && g3.v === 'https://zablink.test/typing-in-progr', `149g${t} a repaint never happens under an open add box`, JSON.stringify(g3));
    await p.keyboard.press('Enter'); await sleep(300);
    const g4 = await p.evaluate(() => (DB.jeb.find((x) => x.text === 'Deck item').links || []).length);
    r.check(g4 === 2, `149g${t} Enter in the deck's add box adds, the box stays for the next`, String(g4));
    await p.evaluate(() => { jebCloseDeck(); });

    /* ── 149h ── */
    await p.evaluate((pid) => { _jlkOpen = null; jebOpenPanel(pid); _jebPanelSig = ''; jebRefresh(); }, plain);
    await sleep(300);
    const hh = await p.evaluate(() => {
      const bad = [];
      document.querySelectorAll('#jeb-panel .jlk-open, #jeb-panel .jlk-a, #jeb-panel .jlk-more').forEach((e) => { const b = e.getBoundingClientRect(); if (b.width && (b.height < 43.5 || b.width < 43.5 && !e.classList.contains('jlk-a'))) bad.push(e.className + ' ' + Math.round(b.width) + 'x' + Math.round(b.height)); });
      return { sw: document.documentElement.scrollWidth <= innerWidth + 1 && document.body.scrollWidth <= innerWidth + 1, pw: (() => { const pn = document.getElementById('jeb-panel'); return pn.scrollWidth <= pn.clientWidth + 1; })(), bad: phone ? bad : [] };
    });
    r.check(hh.sw && hh.pw && hh.bad.length === 0, `149h${t} no horizontal overflow${phone ? ', every tap target >= 44 px' : ''}`, JSON.stringify(hh));
    r.check(app.errors.length === 0, `149h${t} no page errors`, app.errors.slice(0, 3).join(' | '));
  } catch (e) {
    r.check(false, `149${t} ran to the end`, String(e && e.stack || e).slice(0, 500));
  } finally { await app.close(); }
}
process.exit(r.finish() ? 1 : 0);
