#!/usr/bin/env node
/* tools/zab-edit-j121.mjs — v05.72, J121 (block 132). The owner (phone screenshot, a long Bangla item cut to two lines while editing):
   "Fix typing/ edit space, should expand/ wrap to fit the text as long as writing".
   At 390 / 820 / 1440, in a Tasks Zab (the screenshot's) and a plain Zab, with a REAL tap/click on the item's text:
   132a the edit box shows ALL of a long, one-paragraph item (no hidden scroll: scrollHeight <= clientHeight + 1);
   132b typing more text makes it grow again, still showing all of it;
   132c a very long item stops at 60% of the screen height and scrolls inside (never taller than the screen);
   132d the add box ("Jot something…") grows with a long line too, up to 40% of the screen;
   132e Enter still saves the edit (text kept exactly, the box gone);
   132f no page errors. */
import { openApp, report, seedDB } from './harness.mjs';

const r = report('J121 — Zab edit box grows with the text');
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const LONG = 'এখানে বেতন 100, বাইরায় শিক্ষকের বেতন 15000 bdt, বস্ত্র ১২০, and a long English tail that keeps going so it must wrap over several lines on every screen size ';

for (const [w, h, touch] of [[390, 844, true], [820, 1180, true], [1440, 900, false]]) {
  const t = `@${w}`;
  const app = await openApp({ viewport: { width: w, height: h }, db: seedDB(), hasTouch: touch });
  const p = app.page;
  const act = async (loc) => (touch ? loc.tap() : loc.click());
  try {
    for (const pid of ['jp-task', 'jp-idea']) {
      const tt = `${t}/${pid}`;
      const iid = await p.evaluate(([pid, txt]) => { jebAddItem(pid, txt); const it = DB.jeb.filter((i) => i.pocketId === pid).pop(); jebOpenPanel(pid); jebRefresh(); return it.id; }, [pid, LONG + LONG]);
      await sleep(300);
      await act(p.locator(`#jeb-panel .jeb-it[data-iid="${iid}"] .jeb-tx`).first());
      await sleep(200);
      const m = () => p.evaluate(() => { const e = document.querySelector('#jeb-panel .jeb-edit'); return e ? { sh: e.scrollHeight, ch: e.clientHeight, oh: e.offsetHeight, vh: innerHeight } : null; });
      let a = await m();
      r.check(!!a && a.sh <= a.ch + 1 && a.oh > 60, `132a${tt} the edit box shows the whole item`, JSON.stringify(a));
      await p.keyboard.type(' more words typed at the end of the item to make it longer still, and longer');
      await sleep(100);
      const b = await m();
      r.check(!!b && b.sh <= b.ch + 1 && b.oh > a.oh, `132b${tt} it grows while typing`, JSON.stringify({ a, b }));
      await p.evaluate((s) => { const e = document.querySelector('#jeb-panel .jeb-edit'); e.value = s; e.dispatchEvent(new Event('input')); }, LONG.repeat(30));
      await sleep(100);
      const c = await m();
      r.check(!!c && c.oh <= Math.ceil(c.vh * 0.6) + 1 && c.sh > c.ch, `132c${tt} a very long item stops at 60% of the screen and scrolls`, JSON.stringify(c));
      await p.evaluate((s) => { const e = document.querySelector('#jeb-panel .jeb-edit'); e.value = s; e.dispatchEvent(new Event('input')); }, LONG + ' kept');
      await p.keyboard.press('Enter');
      await sleep(200);
      const e = await p.evaluate((iid) => ({ text: DB.jeb.find((i) => i.id === iid).text, box: !!document.querySelector('#jeb-panel .jeb-edit') }), iid);
      r.check(e.text === LONG + ' kept' && !e.box, `132e${tt} Enter saves the text exactly`, JSON.stringify(e).slice(0, 200));
    }
    await act(p.locator('#jeb-add-in'));
    await p.keyboard.type(LONG);
    await sleep(100);
    const d = await p.evaluate(() => { const e = document.getElementById('jeb-add-in'); return { sh: e.scrollHeight, ch: e.clientHeight, oh: e.offsetHeight, vh: innerHeight }; });
    r.check(d.sh <= d.ch + 1 && d.oh > 50 && d.oh <= Math.ceil(d.vh * 0.4) + 1, `132d${t} the add box grows with a long line`, JSON.stringify(d));
    r.check(app.errors.length === 0, `132f${t} no page errors`, app.errors.slice(0, 3).join(' | '));
  } catch (e) {
    r.check(false, `132${t} ran to the end`, String(e && e.stack || e).slice(0, 400));
  } finally { await app.close(); }
}
process.exit(r.finish() ? 1 : 0);
