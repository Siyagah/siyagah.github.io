#!/usr/bin/env node
/* tools/calendar-j195.mjs — v06.10, J195 R1 (block 169): the Calendar like Google Calendar.
   168a the expander: daily / weekly / monthly (date and nth weekday) / yearly, until, count, exceptions, overrides, this-and-following, delete scopes; 5,000 events fast (also at 4× CPU)
   168b the layout at 390 / 820 / 1440 (docked panel or drawer, view dropdown, ＋ button above the Zab button, no sideways overflow), reached by a real click
   168c time grid by real mouse: click an empty slot, drag across slots (30-min snap), drag a block, resize it, Escape cancels; month drag; touch press-and-hold then drag
   168d the event dialog: repeat, reminders, place, colour, linked note; "this / this and following / all"; delete
   168e reminders: a card once, Snooze, Dismiss, the e-mail list carries events
   168f search (window + All time) and the keys (computer only)
   168g (keep1116) old events, categories and layers show exactly as before, after a reload
   node tools/calendar-j195.mjs [--shots=<dir>] */
import { openApp, report, seedDB } from './harness.mjs';

const r = report('J195 — Calendar like Google Calendar');
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const J = (o) => JSON.stringify(o);
const SHOTS = (process.argv.find((a) => a.startsWith('--shots=')) || '').slice(8);
const now = new Date().toISOString();
const P2 = (n) => String(n).padStart(2, '0');
const dsOff = (n) => { const t = new Date(); const x = new Date(t.getFullYear(), t.getMonth(), t.getDate() + n); return x.getFullYear() + '-' + P2(x.getMonth() + 1) + '-' + P2(x.getDate()); };
const TODAY = dsOff(0);
function seed(extra = []) {
  const d = seedDB(now);
  d.calEvents = [
    { id: 'old1', title: 'Dentist', date: TODAY, allDay: false, startTime: '10:00', endTime: '11:00', categoryId: 'cc-health', notes: 'Bring card', createdAt: now, updatedAt: now },
    { id: 'old2', title: 'Trip', date: dsOff(1), endDate: dsOff(3), allDay: true, categoryId: 'cc-family', createdAt: now, updatedAt: now },
    { id: 'old3', title: 'Birthday', date: dsOff(5), allDay: true, createdAt: now },
    ...extra];
  d.calCategories = [{ id: 'cc-health', name: 'Health', icon: '❤️', color: '#EC4899', order: 0 }, { id: 'cc-family', name: 'Family', icon: '👨‍👩‍👧', color: '#F59E0B', order: 1 }];
  return d;
}
const VPS = [{ w: 1440, h: 900, n: 'computer' }, { w: 820, h: 1180, n: 'tablet' }, { w: 390, h: 844, n: 'phone' }];
const open = (vp, db) => openApp({ viewport: { width: vp.w, height: vp.h }, db: db || seed(), hasTouch: vp.w < 1200 });
const calOpen = async (p) => { await p.evaluate(() => _calOpen()); await p.waitForSelector('#p3c .gc'); await sleep(300); };
const setView = async (p, v) => { await p.evaluate((v) => _calSetView(v), v); await sleep(250); };
const occ = (p, a, b, f) => p.evaluate(({ a, b, f }) => _calOccurrences(a, b).filter((o) => !f || o.evId === f).map((o) => o.date + (o.startTime ? 'T' + o.startTime : '')), { a, b, f });
const slot = (p, ds, min) => p.evaluate(({ ds, min }) => {
  const tg = document.querySelector('.gc-tg'), HR = +tg.dataset.hr, sc = tg.parentNode;
  sc.scrollTop = Math.max(0, min * HR / 60 - 200);
  const c = document.querySelector('.gc-tgc[data-ds="' + ds + '"]'), rc = c.getBoundingClientRect();
  return { x: rc.left + rc.width * 0.3, y: rc.top + min * HR / 60 + 2, w: rc.width, HR };
}, { ds, min });
const ev = (p, id) => p.evaluate((id) => JSON.parse(JSON.stringify((DB.calEvents || []).find((e) => e.id === id) || null)), id);
const evByTitle = (p, t) => p.evaluate((t) => JSON.parse(JSON.stringify((DB.calEvents || []).filter((e) => e.title === t))), t);
async function touchDrag(p, x0, y0, pts, hold = 650) {
  const c = await p.context().newCDPSession(p);
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
  await sleep(hold);
  for (const pt of pts) { await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: pt.x, y: pt.y }] }); await sleep(40); }
  const l = pts[pts.length - 1] || { x: x0, y: y0 };
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(250);
}

/* ══ 168a — the expander ══ */
{
  const app = await open(VPS[0]); const p = app.page;
  try {
    await p.evaluate(({ T }) => {
      const mk = (id, date, rep, o = {}) => DB.calEvents.push(Object.assign({ id, title: id, date, allDay: true, rep, createdAt: 'x', updatedAt: 'x' }, o));
      mk('d3', '2026-03-02', { f: 'd', n: 3, until: '2026-03-15' });
      mk('dc', '2026-03-02', { f: 'd', n: 1, cnt: 4 });
      mk('w', '2026-03-02', { f: 'w', n: 1, by: [1, 3] });
      mk('w2', '2026-03-02', { f: 'w', n: 2, by: [1] });
      mk('md', '2026-01-31', { f: 'm', n: 1 });
      mk('mn', '2026-03-12', { f: 'm', n: 1, nth: [2, 4] });
      mk('ml', '2026-03-26', { f: 'm', n: 1, nth: [-1, 4] });
      mk('y', '2024-02-29', { f: 'y', n: 1 });
      mk('ex', '2026-03-02', { f: 'd', n: 1, cnt: 5, ex: ['2026-03-03'], ov: { '2026-03-04': { title: 'Moved title' } } });
      mk('wd', '2026-03-02', { f: 'w', n: 1, by: [1, 2, 3, 4, 5] }, { allDay: false, startTime: '08:00', endTime: '09:00' });
      mk('multi', '2026-03-02', { f: 'w', n: 1, by: [1] }, { endDate: '2026-03-04' });
    }, {});
    const o = (a, b, f) => occ(p, a, b, f);
    r.check(J(await o('2026-03-01', '2026-03-31', 'd3')) === J(['2026-03-02', '2026-03-05', '2026-03-08', '2026-03-11', '2026-03-14']), '168a daily every 3 days until 15 March', J(await o('2026-03-01', '2026-03-31', 'd3')));
    r.check(J(await o('2026-03-01', '2026-04-30', 'dc')) === J(['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05']), '168a daily, 4 times (count), found from a range that starts later too', J(await o('2026-03-01', '2026-04-30', 'dc')));
    r.check(J(await o('2026-03-04', '2026-03-31', 'dc')) === J(['2026-03-04', '2026-03-05']), '168a a count is counted from the first day, not from the range', J(await o('2026-03-04', '2026-03-31', 'dc')));
    r.check(J(await o('2026-03-01', '2026-03-15', 'w')) === J(['2026-03-02', '2026-03-04', '2026-03-09', '2026-03-11']), '168a weekly on Monday + Wednesday', J(await o('2026-03-01', '2026-03-15', 'w')));
    r.check(J(await o('2026-03-01', '2026-04-05', 'w2')) === J(['2026-03-02', '2026-03-16', '2026-03-30']), '168a every 2 weeks on Monday', J(await o('2026-03-01', '2026-04-05', 'w2')));
    r.check(J(await o('2026-01-01', '2026-06-30', 'md')) === J(['2026-01-31', '2026-03-31', '2026-05-31']), '168a monthly on day 31 skips months without a 31st', J(await o('2026-01-01', '2026-06-30', 'md')));
    r.check(J(await o('2026-03-01', '2026-06-30', 'mn')) === J(['2026-03-12', '2026-04-09', '2026-05-14', '2026-06-11']), '168a monthly on the 2nd Thursday', J(await o('2026-03-01', '2026-06-30', 'mn')));
    r.check(J(await o('2026-03-01', '2026-05-31', 'ml')) === J(['2026-03-26', '2026-04-30', '2026-05-28']), '168a monthly on the LAST Thursday', J(await o('2026-03-01', '2026-05-31', 'ml')));
    r.check(J(await o('2024-01-01', '2029-12-31', 'y')) === J(['2024-02-29', '2028-02-29']), '168a yearly on 29 February happens in leap years only', J(await o('2024-01-01', '2029-12-31', 'y')));
    const ex = await p.evaluate(() => _calOccurrences('2026-03-01', '2026-03-31').filter((o) => o.evId === 'ex').map((o) => o.date + ':' + o.title));
    r.check(J(ex) === J(['2026-03-02:ex', '2026-03-04:Moved title', '2026-03-05:ex', '2026-03-06:ex']), '168a an exception day is skipped and an override changes one occurrence only (the count still counts the skipped day)', J(ex));
    r.check(J(await o('2026-03-02', '2026-03-08', 'wd')) === J(['2026-03-02T08:00', '2026-03-03T08:00', '2026-03-04T08:00', '2026-03-05T08:00', '2026-03-06T08:00']), '168a every weekday', J(await o('2026-03-02', '2026-03-08', 'wd')));
    r.check(J(await o('2026-03-10', '2026-03-10', 'multi')) === J(['2026-03-09']), '168a a repeating multi-day event shows on a later day of an occurrence', J(await o('2026-03-10', '2026-03-10', 'multi')));
    /* scopes */
    const sc = await p.evaluate(() => {
      const get = (id) => DB.calEvents.find((e) => e.id === id);
      const out = {};
      /* this event: only the title changes → ov, one record */
      let n0 = DB.calEvents.length;
      _calApplyEdit(get('w'), '2026-03-09', { title: 'Just this' }, 'this');
      out.thisOv = JSON.stringify(get('w').rep.ov) + '|' + (DB.calEvents.length === n0);
      /* this event moved to another day: ex + a new plain record */
      _calApplyEdit(get('w'), '2026-03-11', { date: '2026-03-12', startTime: '07:00' }, 'this');
      out.thisMoved = JSON.stringify(get('w').rep.ex) + '|' + (DB.calEvents.length === n0 + 1);
      /* this and following: the old series ends the day before, a new record starts */
      n0 = DB.calEvents.length;
      _calApplyEdit(get('w2'), '2026-03-16', { title: 'From 16th', rep: { f: 'w', n: 2, by: [1] } }, 'following');
      out.fol = get('w2').rep.until + '|' + (DB.calEvents.length === n0 + 1) + '|' + DB.calEvents[DB.calEvents.length - 1].title + '|' + DB.calEvents[DB.calEvents.length - 1].date;
      out.folOcc = _calOccurrences('2026-03-01', '2026-04-30').filter((o) => o.title === 'w2' || o.title === 'From 16th').map((o) => o.date + o.title.slice(0, 1)).join(',');
      /* count split */
      _calApplyEdit(get('dc'), '2026-03-04', { title: 'Tail', rep: { f: 'd', n: 1, cnt: 4 } }, 'following');
      out.cnt = get('dc').rep.cnt + '|' + DB.calEvents[DB.calEvents.length - 1].rep.cnt;
      /* all: the whole series moves by the day difference */
      _calApplyEdit(get('d3'), '2026-03-08', { date: '2026-03-09' }, 'all');
      out.all = get('d3').date;
      /* delete scopes */
      _calDelScope(get('ex'), '2026-03-05', 'following');
      out.delF = get('ex').rep.until;
      _calDelScope(get('wd'), '2026-03-03', 'this');
      out.delT = JSON.stringify(get('wd').rep.ex);
      _calDelScope(get('mn'), '2026-03-12', 'all');
      out.delA = !get('mn');
      return out;
    });
    r.check(sc.thisOv === '{"2026-03-09":{"title":"Just this"}}|true', '168a "this event" (same day) is an override on the one record', sc.thisOv);
    r.check(sc.thisMoved === '["2026-03-11"]|true', '168a "this event" moved to another day = a skipped day + one new plain event', sc.thisMoved);
    r.check(sc.fol === '2026-03-15|true|From 16th|2026-03-16' && sc.folOcc === '2026-03-02w,2026-03-16F,2026-03-30F,2026-04-13F,2026-04-27F', '"this and following" ends the old series the day before and starts a new record'.replace(/^/, '168a '), J(sc));
    r.check(sc.cnt === '2|2', '168a …and a count is shared out between the two records (2 + 2 = 4)', sc.cnt);
    r.check(sc.all === '2026-03-03', '168a "all events": the series start moves by the day difference', sc.all);
    r.check(sc.delF === '2026-03-04' && sc.delT === '["2026-03-03"]' && sc.delA, '168a delete: this and following / this / all', J(sc));
    /* 5,000 events */
    await p.evaluate(() => {
      DB.calEvents = [];
      for (let i = 0; i < 5000; i++) {
        const dd = new Date(2024, 0, 1 + (i % 1400)), ds = dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0');
        const e = { id: 'p' + i, title: 'E' + i, date: ds, allDay: i % 3 === 0, startTime: '09:00', endTime: '10:00' };
        if (i % 5 === 0) e.rep = [{ f: 'd', n: 2 }, { f: 'w', n: 1, by: [1, 3] }, { f: 'm', n: 1 }, { f: 'y', n: 1 }][i % 4 === 0 ? 0 : (i % 4)];
        DB.calEvents.push(e);
      }
    });
    const t1 = await p.evaluate(() => { const t = performance.now(); const a = _calByDay('2026-10-26', '2026-12-06'); const m = performance.now() - t; const t2 = performance.now(); _calOccurrences('2026-01-01', '2026-12-31'); return { month: m, year: performance.now() - t2, n: Object.keys(a).length }; });
    const cdp = await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const t4 = await p.evaluate(() => { const t = performance.now(); _calByDay('2026-10-26', '2026-12-06'); const m = performance.now() - t; const t2 = performance.now(); _calOccurrences('2026-01-01', '2026-12-31'); return { month: m, year: performance.now() - t2 }; });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    r.check(t1.month < 80 && t1.year < 200, `168a 5,000 events (1,000 repeating): a month view ${t1.month.toFixed(1)} ms, a year ${t1.year.toFixed(1)} ms`, J(t1));
    r.check(t4.month < 300 && t4.year < 800, `168a … at 4× slower CPU: month ${t4.month.toFixed(1)} ms, year ${t4.year.toFixed(1)} ms`, J(t4));
    const noRead = await p.evaluate(() => {
      const src = [_calRenderMonth, _calRenderTG, _calRenderYear, _calSchedList, _renderMyCalP2, _upcomingEvents, _calSelectDate, _calSearchFind].map((f) => f.toString()).join('\n');
      return /DB\.calEvents/.test(src.replace(/_REC_COLLS/g, ''));
    });
    r.check(!noRead, '168a no view, search, Pane 2 or Coming Up reads DB.calEvents directly any more (all go through _calOccurrences)');
  } catch (e) { r.check(false, '168a threw: ' + String(e && e.message || e).slice(0, 600)); }
  await app.close();
}

/* ══ 168b — the layout, at three sizes ══ */
for (const vp of VPS) {
  const app = await open(vp); const p = app.page;
  try {
    /* reached by a real click: the side pane's section → My Calendar */
    await p.evaluate(() => { ST.dbOpen = true; render(); });
    if (vp.w < 1200) await p.evaluate(() => { showPane('sb'); });
    await sleep(300);
    const row = p.locator('.tr-row', { hasText: 'My Calendar' }).first();
    const seen = await row.count();
    if (seen) { await row.click(); await sleep(600); } else await p.evaluate(() => selDbItem('db-mycal'));
    const open1 = await p.evaluate(() => !!document.querySelector('#p3c .gc'));
    if (!open1) await p.evaluate(() => { if (window.innerWidth < 1200) showPane('p3'); });
    r.check(await p.waitForSelector('#p3c .gc', { timeout: 5000 }).then(() => true).catch(() => false), `168b@${vp.n} the calendar opens from the side pane's My Calendar row (clicked: ${seen ? 'yes' : 'by function'})`);
    await p.evaluate(() => { if (window.innerWidth < 1200) showPane('p3'); }); await sleep(300);
    const m = await p.evaluate(() => {
      const R = (e) => { if (!e) return null; const c = e.getBoundingClientRect(); return { l: c.left, t: c.top, r: c.right, b: c.bottom, w: c.width, h: c.height }; };
      const g = document.querySelector('#p3c .gc'), tb = document.getElementById('gc-tb'), fab = document.getElementById('gc-fab'), zb = document.getElementById('zab-btn');
      const zbs = zb && getComputedStyle(zb).display !== 'none' ? R(zb) : null;
      return { mode: g.dataset.mode, dock: !!g.querySelector('.gc-side:not(.gc-drawer)'), hasCreate: !!g.querySelector('.gc-create'), mini: g.querySelectorAll('.gc-mini-d').length, lyr: g.querySelectorAll('.gc-lyr input').length, tb: R(tb), p3: R(document.getElementById('p3c')), sel: !!tb.querySelector('select.gc-vsel'), opts: [...tb.querySelectorAll('option')].map((o) => o.textContent).join(','), ham: !!tb.querySelector('.gc-ham'), today: !!tb.querySelector('.gc-today'), brand: !!tb.querySelector('.gc-brand'), search: !!tb.querySelector('[title^="Search"]'), fab: R(fab), zbs, ttl: tb.querySelector('.gc-ttl b').textContent, over: document.documentElement.scrollWidth > innerWidth + 1, tbOver: tb.scrollWidth > tb.clientWidth + 1 };
    });
    if (vp.w >= 1200) r.check(m.dock && m.hasCreate && m.mini === 42 && m.lyr === 5, `168b@${vp.n} the left panel is docked: ＋ Create, a mini month, five calendar checkboxes`, J(m));
    else r.check(!m.dock && m.ham, `168b@${vp.n} the left panel is a slide-in drawer behind ☰`, J(m));
    r.check(m.sel && m.opts === 'Day,Week,Month,Year,Schedule' && m.today && /\d{4}/.test(m.ttl), `168b@${vp.n} top bar: ☰, Today, the title, the view dropdown (Day · Week · Month · Year · Schedule)`, J(m));
    if (vp.w >= 700) r.check(m.search && (vp.w < 1200 || m.brand || m.mode !== 'wide'), `168b@${vp.n} 🔍 search is on the top bar`, J(m));
    r.check(!m.over && !m.tbOver, `168b@${vp.n} nothing runs off the screen sideways (page ${!m.over}, top bar ${!m.tbOver})`, J(m));
    if (vp.w < 560) {
      r.check(m.fab && (!m.zbs || m.fab.b <= m.zbs.t + 1 || m.fab.r <= m.zbs.l + 1), `168b@${vp.n} the round ＋ is above the Zab button`, J({ f: m.fab, z: m.zbs }));
      await p.evaluate(() => _calDrawer(true)); await sleep(250);
      const dr = await p.evaluate(() => ({ mini: document.querySelectorAll('.gc-drawer .gc-mini-d').length, lyr: document.querySelectorAll('.gc-drawer .gc-lyr input').length, w: document.querySelector('.gc-drawer').getBoundingClientRect().width }));
      r.check(dr.mini === 42 && dr.lyr === 5, `168b@${vp.n} the ☰ drawer holds the mini month and the layers`, J(dr));
      await p.mouse.click(dr.w + 20, 300); await sleep(250);
      r.check(await p.evaluate(() => !document.querySelector('.gc-drawer')), `168b@${vp.n} a tap outside closes the drawer`);
      await setView(p, 'week');
      const n3 = await p.evaluate(() => document.querySelectorAll('.gc-tgc').length);
      r.check(n3 === 3, `168b@${vp.n} Week shows 3 days on a phone`, String(n3));
    } else {
      const ph = await p.evaluate(() => !!document.getElementById('gc-fab'));
      r.check(!ph, `168b@${vp.n} no round ＋ outside the phone shape`);
      await setView(p, 'week');
      r.check(await p.evaluate(() => document.querySelectorAll('.gc-tgc').length) === 7, `168b@${vp.n} Week shows 7 days`);
    }
    /* the layers still toggle the data: unticking Journal / My events hides them */
    await setView(p, 'month');
    const before = await p.evaluate(() => document.querySelectorAll('.gc-mcell .gc-chip').length);
    await p.evaluate((phone) => { if (phone) _calDrawer(true); }, vp.w < 1200); await sleep(200);
    await p.locator('.gc-lyr input[data-lyr="personal"]').first().click(); await sleep(300);
    const after = await p.evaluate(() => document.querySelectorAll('.gc-mcell .gc-chip').length);
    r.check(before > 0 && after === 0 && await p.evaluate(() => DB.theme.calLayers.personal === false), `168b@${vp.n} the "My events" checkbox is the existing calendar layer (events ${before} → ${after})`);
    await p.evaluate(() => { togCalLayer('personal'); }); await sleep(200);
    if (SHOTS) for (const v of ['month', 'week', 'day', 'schedule', 'year']) { await setView(p, v); await p.screenshot({ path: `${SHOTS}/cal-${vp.w}-${v}.png` }); }
    r.check(app.errors.length === 0, `168b@${vp.n} no page errors`, app.errors.slice(0, 3).join(' | '));
  } catch (e) { r.check(false, `168b@${vp.n} threw: ` + String(e && e.message || e).slice(0, 600)); }
  await app.close();
}

/* ══ 168c/d — mouse: create, move, resize, month drag; the dialog ══ */
{
  const vp = VPS[0];
  const app = await open(vp); const p = app.page;
  try {
    await calOpen(p); await setView(p, 'week');
    /* click an empty slot → quick create */
    let s = await slot(p, TODAY, 14 * 60 + 5);
    await p.mouse.click(s.x, s.y); await p.waitForSelector('#gc-qc', { timeout: 3000 }).catch(() => {});
    const q = await p.evaluate(() => { const e = document.getElementById('gc-qc'); if (!e) return null; const c = e.getBoundingClientRect(); return { l: c.left, t: c.top, r: c.right, b: c.bottom, s: document.getElementById('gcq-s').value, e: document.getElementById('gcq-e').value, d: document.getElementById('gcq-date').value, ih: innerHeight, iw: innerWidth }; });
    r.check(q && q.s === '14:00' && q.e === '15:00' && q.d === TODAY && q.l >= 0 && q.r <= q.iw && q.t >= 0 && q.b <= q.ih, '168c a click on an empty slot opens the quick-create popover for that hour, inside the screen', J(q));
    await p.keyboard.type('Quick one'); await p.keyboard.press('Enter'); await sleep(400);
    const qe = (await evByTitle(p, 'Quick one'))[0];
    r.check(qe && qe.date === TODAY && qe.startTime === '14:00' && qe.endTime === '15:00' && qe.allDay === false, '168c Enter in the popover saves the event (14:00–15:00)', J(qe));
    r.check(await p.evaluate(() => !document.getElementById('gc-qc') && !!document.querySelector('.gc-blk[data-ev="' + DB.calEvents.find((e) => e.title === 'Quick one').id + '"]')), '168c … and its block is drawn in the grid');
    /* drag across slots → a range, 30-min snap */
    s = await slot(p, dsOff(2), 16 * 60);
    await p.mouse.move(s.x, s.y + 4); await p.mouse.down(); await p.mouse.move(s.x, s.y + 4 + s.HR * 1.2, { steps: 8 });
    const gh = await p.evaluate(() => { const g = document.querySelector('.gc-ghost'); return g ? g.querySelector('.gc-bm').textContent : null; });
    await p.mouse.up(); await sleep(300);
    const q2 = await p.evaluate(() => document.getElementById('gc-qc') ? { s: document.getElementById('gcq-s').value, e: document.getElementById('gcq-e').value, d: document.getElementById('gcq-date').value } : null);
    r.check(gh && gh === '16:00–17:30' && q2 && q2.s === '16:00' && q2.e === '17:30' && q2.d === dsOff(2), '168c dragging across slots makes a range on a 30-minute snap (16:00–17:30), with a ghost while dragging', J({ gh, q2 }));
    await p.keyboard.type('Ranged'); await p.keyboard.press('Enter'); await sleep(400);
    const re = (await evByTitle(p, 'Ranged'))[0];
    r.check(re && re.startTime === '16:00' && re.endTime === '17:30' && re.date === dsOff(2), '168c … saved with that time range', J(re));
    /* Escape cancels a create drag */
    s = await slot(p, dsOff(3), 9 * 60);
    await p.mouse.move(s.x, s.y); await p.mouse.down(); await p.mouse.move(s.x, s.y + 80, { steps: 5 }); await p.keyboard.press('Escape'); await p.mouse.up(); await sleep(300);
    r.check(await p.evaluate(() => !document.getElementById('gc-qc') && !document.querySelector('.gc-ghost')), '168c Escape cancels a create drag (no popover, no ghost)');
    /* move a block: drag Quick one from 14:00 to 11:00 two days later */
    const id = qe.id;
    const t2 = await slot(p, dsOff(2), 11 * 60);
    let b = await p.evaluate((id) => { const e = document.querySelector('.gc-blk[data-ev="' + id + '"]'); const c = e.getBoundingClientRect(); return { x: c.left + c.width / 2, y: c.top + 12, w: c.width }; }, id);
    await p.mouse.move(b.x, b.y); await p.mouse.down(); await p.mouse.move(t2.x, t2.y + 12, { steps: 10 }); await p.mouse.up(); await sleep(400);
    const mv = await ev(p, id);
    r.check(mv && mv.date === dsOff(2) && mv.startTime === '11:00' && mv.endTime === '12:00', '168c dragging a block moves it to the other day and time, same length (→ 11:00–12:00)', J(mv));
    r.check(!!(await p.evaluate(() => !document.getElementById('gce-ov'))), '168c … and a drag does not open the editor');
    /* Escape while moving puts it back */
    b = await p.evaluate((id) => { const e = document.querySelector('.gc-blk[data-ev="' + id + '"]'); const c = e.getBoundingClientRect(); return { x: c.left + c.width / 2, y: c.top + 12 }; }, id);
    await p.mouse.move(b.x, b.y); await p.mouse.down(); await p.mouse.move(b.x + 80, b.y + 100, { steps: 6 }); await p.keyboard.press('Escape'); await p.mouse.up(); await sleep(300);
    const mv2 = await ev(p, id);
    r.check(mv2.date === dsOff(2) && mv2.startTime === '11:00', '168c Escape during a move leaves the event where it was', J(mv2));
    /* resize: bottom edge */
    const rz = await p.evaluate((id) => { const e = document.querySelector('.gc-blk[data-ev="' + id + '"]'); const c = e.getBoundingClientRect(); return { x: c.left + c.width / 2, y: c.bottom - 3, HR: +document.querySelector('.gc-tg').dataset.hr }; }, id);
    await p.mouse.move(rz.x, rz.y); await p.mouse.down(); await p.mouse.move(rz.x, rz.y + rz.HR * 1.0, { steps: 6 }); await p.mouse.up(); await sleep(400);
    const rs = await ev(p, id);
    r.check(rs && rs.startTime === '11:00' && rs.endTime === '13:00', '168c dragging the bottom edge resizes it (→ 11:00–13:00)', J(rs));
    /* the dialog by a click on a block */
    await p.locator('.gc-blk[data-ev="' + id + '"]').click(); await p.waitForSelector('#gce-ov', { timeout: 3000 }).catch(() => {}); await sleep(200);
    const dg = await p.evaluate(() => { const o = document.getElementById('gce-ov'); if (!o) return null; return { title: document.getElementById('cef-title').value, date: document.getElementById('cef-date').value, full: false, sel: document.getElementById('gce-rep').value, ids: ['cef-place', 'gce-clr', 'gce-note', 'gce-rems', 'cef-notes', 'cef-cat'].every((i) => document.getElementById(i)) }; });
    r.check(dg && dg.title === 'Quick one' && dg.sel === 'none' && dg.ids, '168d a click on a block opens the event dialog (title, date, repeat, reminders, place, colour, note, description)', J(dg));
    await p.fill('#cef-place', 'Room 4'); await p.selectOption('#gce-rep', 'w'); await sleep(100);
    await p.click('#gce-clr [data-c="#10B981"]');
    await p.click('button:has-text("＋ 10 min")'); await p.click('button:has-text("＋ 1 day")');
    await p.fill('#cef-notes', 'Bring slides');
    await p.fill('#gce-nq', 'Seeded note one'); await sleep(200); await p.locator('.gce-nr').first().click();
    await p.click('input[name="gce-end"][value="cnt"]'); await p.fill('#gce-endn', '3');
    await p.click('#gce-save'); await sleep(500);
    const sv = await ev(p, id);
    r.check(sv && sv.place === 'Room 4' && sv.color === '#10B981' && J(sv.rem) === '[10,1440]' && sv.noteId === 'a1' && sv.notes === 'Bring slides' && J(sv.rep) === J({ f: 'w', n: 1, by: [new Date(dsOff(2) + 'T00:00').getDay()], cnt: 3 }), '168d Save writes place, colour, reminders, a linked note, the description and a weekly rule (3 times) on the same record', J(sv));
    r.check((await p.evaluate(() => DB.calEvents.filter((e) => e.title === 'Quick one').length)) === 1 && await p.evaluate(() => !document.getElementById('gce-ov')), '168d … still ONE record for the series, the dialog closed');
    /* edit one occurrence: "This event" scope */
    const next = dsOff(2 + 7);
    await p.evaluate((n) => _calGoDate(n, 'week'), next); await sleep(300);
    await p.locator('.gc-blk[data-ev="' + id + '"]').first().click(); await p.waitForSelector('#gce-ov');
    await p.fill('#cef-title', 'Quick one (changed)'); await p.click('#gce-save'); await p.waitForSelector('#gc-scope');
    r.check(await p.evaluate(() => [...document.querySelectorAll('#gc-scope [data-sc]')].map((b) => b.textContent).join('|')) === 'This event|This and following events|All events|Cancel', '168d editing one day of a series asks: This event · This and following events · All events');
    await p.click('#gc-scope [data-sc="this"]'); await sleep(400);
    const sc1 = await ev(p, id);
    r.check(J(sc1.rep.ov) === J({ [next]: { title: 'Quick one (changed)' } }) && (await evByTitle(p, 'Quick one (changed)')).length === 0, '168d "This event" changes that one day only (an override on the same record)', J(sc1.rep));
    /* delete: this and following */
    await p.locator('.gc-blk[data-ev="' + id + '"]').first().click(); await p.waitForSelector('#gce-ov');
    await p.click('button:has-text("Delete event")'); await p.waitForSelector('#gc-scope'); await p.click('#gc-scope [data-sc="following"]'); await sleep(400);
    const dl = await ev(p, id);
    r.check(dl && dl.rep.until === dsOff(2 + 6), '168d Delete → "This and following" ends the series the day before', J(dl && dl.rep));
    /* month drag */
    await setView(p, 'month'); await p.evaluate((d) => _calGoDate(d, 'month'), dsOff(5)); await sleep(300);
    const mm = await p.evaluate(() => { const c = [...document.querySelectorAll('.gc-mcell .gc-chip[data-ev="old3"]')][0]; const r1 = c.getBoundingClientRect(); const ds = c.closest('.gc-mcell').dataset.ds; const cells = [...document.querySelectorAll('.gc-mcell')]; const i = cells.findIndex((x) => x.dataset.ds === ds); const tgt = cells[Math.min(cells.length - 1, i + 1)]; const r2 = tgt.getBoundingClientRect(); return { x: r1.left + 20, y: r1.top + 8, tx: r2.left + 20, ty: r2.top + 30, to: tgt.dataset.ds }; });
    await p.mouse.move(mm.x, mm.y); await p.mouse.down(); await p.mouse.move(mm.tx, mm.ty, { steps: 8 }); await p.mouse.up(); await sleep(400);
    const bd = await ev(p, 'old3');
    r.check(bd && bd.date === mm.to, '168c Month: dragging an event chip to another day moves it', J({ bd, to: mm.to }));
    r.check(app.errors.length === 0, '168c/d no page errors', app.errors.slice(0, 3).join(' | '));
  } catch (e) { r.check(false, '168c/d threw: ' + String(e && e.message || e).slice(0, 800)); }
  await app.close();
}

/* ══ 168c — touch: press-and-hold then drag; a plain swipe still scrolls ══ */
{
  const vp = VPS[2];
  const app = await open(vp); const p = app.page;
  try {
    await calOpen(p); await setView(p, 'day');
    let s = await slot(p, TODAY, 12 * 60);
    /* a quick drag does NOT make an event (the page scrolls) */
    await touchDrag(p, s.x, s.y, [{ x: s.x, y: s.y - 40 }, { x: s.x, y: s.y - 80 }], 30);
    r.check(await p.evaluate(() => !document.getElementById('gc-qc') && !document.querySelector('.gc-ghost') && !document.getElementById('gce-ov')), '168c@phone a quick swipe on the grid makes nothing (it scrolls)');
    s = await slot(p, TODAY, 12 * 60);
    await touchDrag(p, s.x, s.y + 4, [{ x: s.x, y: s.y + 20 }, { x: s.x, y: s.y + 4 + s.HR * 1.1 }, { x: s.x, y: s.y + 4 + s.HR * 1.6 }], 650);
    const q = await p.evaluate(() => document.getElementById('gc-qc') ? { s: document.getElementById('gcq-s').value, e: document.getElementById('gcq-e').value } : null);
    r.check(q && q.s === '12:00' && /^13:[03]0$|^14:00$/.test(q.e), '168c@phone press-and-hold, then drag, makes a time range', J(q));
    await p.evaluate(() => _calQuickClose());
    /* hold a block then drag it */
    const id = 'old1';
    await p.evaluate(() => _calGoDate(todayStr(), 'day')); await sleep(250);
    const b = await p.evaluate((id) => { const e = document.querySelector('.gc-blk[data-ev="' + id + '"]'); e.parentNode.parentNode.parentNode.scrollTop = 0; const sc = document.querySelector('.gc-tg').parentNode; sc.scrollTop = 8 * 44; const c = e.getBoundingClientRect(); return { x: c.left + c.width / 2, y: c.top + 10, HR: 44 }; }, id);
    await sleep(150);
    const b2 = await p.evaluate((id) => { const c = document.querySelector('.gc-blk[data-ev="' + id + '"]').getBoundingClientRect(); return { x: c.left + c.width / 2, y: c.top + 10 }; }, id);
    await touchDrag(p, b2.x, b2.y, [{ x: b2.x, y: b2.y + 20 }, { x: b2.x, y: b2.y + 44 * 2 }], 650);
    const mv = await ev(p, id);
    r.check(mv && mv.startTime === '12:00' && mv.endTime === '13:00', '168c@phone press-and-hold on a block, then drag, moves it two hours (10:00 → 12:00)', J(mv));
    /* swipe left moves to the next day */
    const d0 = await p.evaluate(() => ST.calDayTs);
    const c = await p.context().newCDPSession(p);
    await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 320, y: 120 }] }); await sleep(30);
    for (const x of [280, 220, 160, 100]) { await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: 122 }] }); await sleep(20); }
    await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(400);
    const d1 = await p.evaluate(() => ST.calDayTs);
    r.check(d1 > d0 && (d1 - d0) <= 90000000, '168c@phone a swipe left moves to the next day', J({ d0, d1 }));
    r.check(app.errors.length === 0, '168c@phone no page errors', app.errors.slice(0, 3).join(' | '));
  } catch (e) { r.check(false, '168c@phone threw: ' + String(e && e.message || e).slice(0, 800)); }
  await app.close();
}

/* ══ 168e — reminders ══ */
{
  const vp = VPS[0];
  const app = await open(vp, seed([{ id: 'r1', title: 'Pay rent', date: TODAY, allDay: false, startTime: '12:00', endTime: '12:30', rem: [10, 60], createdAt: now, updatedAt: now },
    { id: 'r2', title: 'Allday thing', date: dsOff(3), allDay: true, rem: [1440], createdAt: now, updatedAt: now }])); const p = app.page;
  try {
    await calOpen(p);
    const at = (hh, mm) => p.evaluate(({ hh, mm }) => { const d = new Date(); d.setHours(hh, mm, 0, 0); return d.getTime(); }, { hh, mm });
    await p.evaluate((t) => { window.__calRemNow = t; }, await at(11, 5));
    await p.evaluate(() => _calRemTick()); await sleep(200);
    r.check(await p.locator('#gc-rems .gc-rem').count() === 1 && (await p.locator('#gc-rems .gc-rem-t').innerText()).includes('Pay rent'), '168e at 11:00 (1 hour before 12:00) a card shows in Siyagah', await p.evaluate(() => document.getElementById('gc-rems')?.innerText));
    await p.evaluate(() => _calRemTick()); await p.evaluate(() => _calRemTick());
    r.check(await p.locator('#gc-rems .gc-rem').count() === 1, '168e … only once however often the check runs');
    r.check(await p.evaluate(() => [...document.querySelectorAll('#gc-rems [data-ra]')].map((b) => b.dataset.ra).join()) === 'open,snooze,dismiss', '168e the card offers Open · Snooze 10 min · Dismiss');
    const inDb = await p.evaluate(() => JSON.stringify(DB).includes('calrem') || JSON.stringify(DB.theme || {}).includes('calrem'));
    r.check(!inDb && await p.evaluate(() => !!localStorage.getItem('siyagah-calrem-v1')), '168e what was shown is remembered on this device only (not in DB)');
    await p.locator('#gc-rems [data-ra="snooze"]').click(); await sleep(150);
    await p.evaluate(() => _calRemTick());
    r.check(await p.locator('#gc-rems .gc-rem').count() === 0, '168e Snooze hides the card');
    await p.evaluate((t) => { window.__calRemNow = t; }, (await at(11, 5)) + 11 * 60000);
    await p.evaluate(() => _calRemTick()); await sleep(150);
    r.check(await p.locator('#gc-rems .gc-rem').count() === 1, '168e … and it comes back 10 minutes later');
    await p.locator('#gc-rems [data-ra="dismiss"]').click(); await sleep(150);
    await p.evaluate(() => _calRemTick());
    r.check(await p.locator('#gc-rems .gc-rem').count() === 0, '168e Dismiss hides it for good');
    await p.evaluate((t) => { window.__calRemNow = t; }, await at(11, 52));
    await p.evaluate(() => _calRemTick()); await sleep(150);
    r.check(await p.locator('#gc-rems .gc-rem').count() === 1, '168e the second reminder (10 minutes before) shows too');
    await p.locator('#gc-rems [data-ra="open"]').click(); await sleep(500);
    r.check(await p.evaluate(() => document.getElementById('cef-title')?.value) === 'Pay rent', '168e Open takes you to the event');
    await p.evaluate(() => _calDlgClose());
    const mail = await p.evaluate(() => { const l = _remList(8, new Date().setHours(8, 0, 0, 0)); return l.filter((x) => x.id.startsWith('ev:')).map((x) => ({ id: x.id, t: x.title, at: x.at, dt: x.dt })); });
    r.check(mail.length >= 3 && mail.some((x) => x.id === 'ev:r1:' + TODAY + ':10') && mail.some((x) => x.id === 'ev:r1:' + TODAY + ':60') && mail.some((x) => x.id.startsWith('ev:r2:')), '168e the e-mail reminder list carries the events (own id keys, one line per reminder)', J(mail));
    const noRem = await p.evaluate(() => _remList(8, new Date().setHours(8, 0, 0, 0)).filter((x) => x.id === 'old1').length);
    r.check(noRem === 0, '168e an event with no reminder is not in the e-mail list');
    r.check(app.errors.length === 0, '168e no page errors', app.errors.slice(0, 3).join(' | '));
  } catch (e) { r.check(false, '168e threw: ' + String(e && e.message || e).slice(0, 800)); }
  await app.close();
}

/* ══ 168f — search and keys ══ */
{
  const vp = VPS[0];
  const far = new Date(); far.setFullYear(far.getFullYear() - 3);
  const farDs = far.getFullYear() + '-' + P2(far.getMonth() + 1) + '-' + P2(far.getDate());
  const app = await open(vp, seed([{ id: 's1', title: 'Board meeting', date: dsOff(9), allDay: false, startTime: '15:00', place: 'Level 9 Sydney', notes: 'budget review', createdAt: now },
    { id: 's2', title: 'Ancient lunch', date: farDs, allDay: true, createdAt: now },
    { id: 's3', title: 'Gym', date: dsOff(-2), allDay: false, startTime: '07:00', rep: { f: 'd', n: 1 }, place: 'Bondi', createdAt: now }])); const p = app.page;
  try {
    await calOpen(p);
    await p.locator('#gc-tb [title^="Search"]').click(); await sleep(250);
    await p.fill('#gcs-in', 'sydney'); await sleep(400);
    r.check(await p.locator('#gcs-res .gc-sev').count() === 1, '168f search finds an event by its place');
    await p.fill('#gcs-in', 'budget'); await sleep(400);
    r.check(await p.locator('#gcs-res .gc-sev').count() === 1, '168f … by its description');
    await p.fill('#gcs-in', 'bondi'); await sleep(400);
    const nb = await p.locator('#gcs-res .gc-sev').count();
    r.check(nb > 100 && nb <= 300, `168f a repeating event gives one result per day in the window (${nb}, at most 300)`);
    await p.fill('#gcs-in', 'ancient'); await sleep(400);
    r.check(await p.locator('#gcs-res .gc-sev').count() === 0, '168f an event 3 years ago is outside the ±1 year window …');
    await p.check('#gcs-all'); await sleep(400);
    r.check(await p.locator('#gcs-res .gc-sev').count() === 1, '168f … and found with "All time"');
    await p.locator('#gcs-res .gc-sev').first().click(); await sleep(500);
    r.check(await p.evaluate(() => document.getElementById('cef-title')?.value) === 'Ancient lunch' && await p.evaluate(() => ST.calQ === null), '168f a result opens the event (and closes the search)');
    await p.keyboard.press('Escape'); await sleep(200);
    r.check(await p.evaluate(() => !document.getElementById('gce-ov')), '168f Esc closes the dialog');
    /* keys */
    await p.evaluate(() => { document.activeElement && document.activeElement.blur(); _calSetView('month'); });
    const k = async (key) => { await p.keyboard.press(key); await sleep(250); };
    const v0 = await p.evaluate(() => ST.calMonth);
    await k('j'); const v1 = await p.evaluate(() => ST.calMonth);
    await k('k'); await k('k'); const v2 = await p.evaluate(() => ST.calMonth);
    r.check((v1 - v0 + 12) % 12 === 1 && (v0 - v2 + 12) % 12 === 1, '168f J = next, K = previous', J({ v0, v1, v2 }));
    await k('ArrowRight'); await k('t');
    r.check(await p.evaluate(() => ST.calMonth === new Date().getMonth()), '168f ← → also move; T = today');
    const views = []; for (const x of ['d', 'w', 'a', 'y', 'm']) { await k(x); views.push(await p.evaluate(() => ST.calView)); }
    r.check(J(views) === J(['day', 'week', 'schedule', 'year', 'month']), '168f D W A Y M change the view', J(views));
    await k('c'); r.check(await p.evaluate(() => !!document.getElementById('gce-ov')), '168f C opens a new event');
    await p.keyboard.type('d'); r.check(await p.evaluate(() => ST.calView === 'month' && document.getElementById('cef-title').value === 'd'), '168f keys do nothing while typing in a field');
    await p.keyboard.press('Escape');
    await k('/'); r.check(await p.evaluate(() => ST.calQ !== null && document.activeElement && document.activeElement.id === 'gcs-in'), '168f / opens the search');
    await p.keyboard.press('Escape'); await sleep(200);
    r.check(await p.evaluate(() => ST.calQ === null), '168f Esc closes the search');
    r.check(app.errors.length === 0, '168f no page errors', app.errors.slice(0, 3).join(' | '));
  } catch (e) { r.check(false, '168f threw: ' + String(e && e.message || e).slice(0, 800)); }
  await app.close();
}

/* ══ 168g — keep1116: what was there shows exactly as before ══ */
{
  const vp = VPS[0];
  const app = await open(vp); const p = app.page;
  try {
    const before = await p.evaluate(() => JSON.stringify([DB.calEvents, DB.calCategories, DB.theme.calLayers || null]));
    await calOpen(p); await setView(p, 'month'); await sleep(300);
    const shown = await p.evaluate(() => [...document.querySelectorAll('.gc-month .gc-chip')].map((c) => c.dataset.ev + ':' + c.closest('.gc-mcell').dataset.ds));
    r.check(shown.some((s) => s.startsWith('old1:' + TODAY)) && shown.some((s) => s.startsWith('old2:' + dsOff(1))) && shown.some((s) => s.startsWith('old2:' + dsOff(3))) && shown.some((s) => s.startsWith('old3:' + dsOff(5))), '168g old events (timed, multi-day, all-day, one without updatedAt) show on their days in Month', J(shown));
    const col = await p.evaluate(() => getComputedStyle(document.querySelector('.gc-chip[data-ev="old1"]')).getPropertyValue('--c').trim());
    r.check(col.toLowerCase() === '#ec4899', '168g … in their category colour', col);
    await setView(p, 'week');
    r.check(await p.evaluate(() => !!document.querySelector('.gc-blk[data-ev="old1"]') && !!document.querySelector('.gc-tg-ad .gc-chip[data-ev="old2"]')), '168g Week: the timed event is a block, the multi-day one is in the all-day strip');
    await p.evaluate(() => _calSelectDate(todayStr()));
    r.check(await p.evaluate(() => /Dentist/.test(document.querySelector('.cal-popup')?.innerText || '') && /New note for this date/.test(document.querySelector('.cal-popup')?.innerText || '')), '168g the day menu (new note / journal / notes from this date) is still there, and lists the events');
    await p.evaluate(() => document.querySelector('.cal-popup')?.remove());
    await p.reload(); await p.waitForFunction(() => window.__appBooted === true); await sleep(900);
    const after = await p.evaluate(() => JSON.stringify([DB.calEvents, DB.calCategories, DB.theme.calLayers || null]));
    r.check(before === after, '168g nothing about the old events, categories or layer choices changed after a save and a reload', before === after ? '' : 'differs');
    await p.evaluate(() => _calOpen()); await sleep(500);
    r.check(await p.evaluate(() => !!document.querySelector('.gc-month .gc-chip[data-ev="old1"]')), '168g … and they are drawn again after the reload');
    r.check(await p.evaluate(() => _renderMyCalP2().includes('Dentist') && _renderMyCalP2().includes('Trip')), '168g Pane 2 (the My Calendar list) still lists them');
    r.check(app.errors.length === 0, '168g no page errors', app.errors.slice(0, 3).join(' | '));
  } catch (e) { r.check(false, '168g threw: ' + String(e && e.message || e).slice(0, 800)); }
  await app.close();
}
process.exit(r.finish() ? 1 : 0);
