#!/usr/bin/env node
/* tools/install-j186.mjs — v06.01, J186 (block 161): "📱 Install Siyagah".
   161a Chromium's own installability test on the served app: no errors (manifest, icons, service worker)
   161b Android-like: a held install prompt → the card #pwa-offer shows after the start (top, inside the screen, never over the Zab bar),
        Install calls the browser's prompt, an accepted install hides the card and the ⚙ row; "Not now" sets the 30-day cookie and a reload shows no card
   161c iPhone (Safari user agent, no prompt): the card says "How" and opens the Share ▸ Add to Home Screen steps; the ⚙ row opens the same steps
   161d already installed (display-mode standalone) and a check browser without __pwaTest: no card, no ⚙ row when installed
   161e 390 / 820 / 1440: the card fits (no horizontal overflow, buttons ≥ 40 px tall, contrast ≥ 4.5:1), JSON.stringify(DB) unchanged, no page errors
   node tools/install-j186.mjs */
import { openApp, report } from './harness.mjs';

const r = report('J186 — Install Siyagah');
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const TEST = () => { window.__pwaTest = 1; };
const FAKE_PROMPT = `(() => { const e = new Event('beforeinstallprompt', { cancelable: true }); window.__prompted = 0; e.prompt = () => { window.__prompted++; return Promise.resolve(); }; e.userChoice = Promise.resolve({ outcome: 'accepted' }); window.dispatchEvent(e); return e.defaultPrevented; })()`;
const CARD = `(() => { const el = document.getElementById('pwa-offer'); if (!el) return null; const b = el.getBoundingClientRect(); const bar = document.getElementById('jeb-bar'); const bb = bar && bar.offsetParent ? bar.getBoundingClientRect() : null; const btns = [...el.querySelectorAll('button')].map((x) => ({ t: x.textContent.trim(), h: x.getBoundingClientRect().height })); return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, w: innerWidth, h: innerHeight, overBar: bb ? b.bottom > bb.top : false, btns, txt: el.textContent, sw: document.documentElement.scrollWidth }; })()`;
const MI = `(() => { const m = document.getElementById('pwa-install-mi'); return m ? { shown: m.style.display !== 'none', t: m.textContent.trim() } : null; })()`;
/* contrast of the card's words against the card */
const CONTRAST = `(() => { const lum = (c) => { const m = c.match(/[\\d.]+/g).map(Number); const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]); };
  const bgOf = (el) => { while (el) { const b = getComputedStyle(el).backgroundColor; if (b && !/rgba\\(0, 0, 0, 0\\)|transparent/.test(b)) return b; el = el.parentElement; } return 'rgb(255,255,255)'; };
  let worst = 99, at = ''; document.querySelectorAll('#pwa-offer b, #pwa-offer .pwa-sub, #pwa-offer button').forEach((el) => { const a = lum(getComputedStyle(el).color), b = lum(bgOf(el)); const c = (Math.max(a, b) + .05) / (Math.min(a, b) + .05); if (c < worst) { worst = c; at = el.textContent.trim(); } }); return { worst: Math.round(worst * 100) / 100, at }; })()`;

/* 161a */
{
  const app = await openApp({ viewport: { width: 1440, height: 900 } });
  try {
    const c = await app.ctx.newCDPSession(app.page);
    await app.page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller || navigator.serviceWorker.getRegistration().then((x) => x && x.active), null, { timeout: 15000 }).catch(() => {});
    const ie = await c.send('Page.getInstallabilityErrors');
    const m = await c.send('Page.getAppManifest');
    r.check(ie.installabilityErrors.length === 0, '161a Chromium finds the app installable (no installability errors)', JSON.stringify(ie));
    r.check(m.errors.length === 0, '161a the manifest has no errors', JSON.stringify(m.errors));
    r.check(await app.page.evaluate(() => !document.getElementById('pwa-offer')), '161a a check browser (no __pwaTest) never sees the card');
  } catch (e) { r.check(false, '161a threw: ' + String(e && e.message || e).split('\n')[0]); }
  await app.close();
}

/* 161b — Android-like, three sizes for 161e */
for (const vp of [{ width: 390, height: 844 }, { width: 820, height: 1180 }, { width: 1440, height: 900 }]) {
  const app = await openApp({ viewport: vp, initScript: TEST, hasTouch: vp.width < 1200 });
  const p = app.page;
  try {
    const before = await p.evaluate(() => JSON.stringify(DB));
    const prevented = await p.evaluate(FAKE_PROMPT);
    r.check(prevented, `161b ${vp.width}: the browser's prompt is held (preventDefault)`);
    await p.waitForSelector('#pwa-offer', { timeout: 9000 }).catch(() => {});
    const k = await p.evaluate(CARD);
    r.check(!!k, `161b ${vp.width}: the install card shows after the start`);
    if (k) {
      r.check(k.top >= 0 && k.left >= 0 && k.right <= k.w + 0.5 && k.bottom < k.h / 2 && !k.overBar && k.sw <= k.w, `161e ${vp.width}: the card is at the top, inside the screen, not over the Zab bar, no sideways scroll`, JSON.stringify(k));
      r.check(k.btns.length === 2 && k.btns.every((b) => b.h >= 40) && k.btns[0].t === 'Install' && k.btns[1].t === 'Not now', `161e ${vp.width}: Install and Not now, each ≥ 40 px tall`, JSON.stringify(k.btns));
      const ct = await p.evaluate(CONTRAST);
      r.check(ct.worst >= 4.5, `161e ${vp.width}: every word on the card ≥ 4.5:1 (worst ${ct.worst} on "${ct.at}")`);
    }
    const mi = await p.evaluate(MI);
    r.check(mi && mi.shown && mi.t === '📱 Install Siyagah', `161b ${vp.width}: the ⚙ menu row reads "📱 Install Siyagah"`, JSON.stringify(mi));
    await p.click('#pwa-offer .pwa-go');
    await sleep(300);
    r.check(await p.evaluate(() => window.__prompted === 1), `161b ${vp.width}: Install opens the browser's own prompt`);
    await p.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
    await sleep(200);
    const after = await p.evaluate(() => ({ card: !!document.getElementById('pwa-offer'), can: _pwaCan(), db: JSON.stringify(DB) }));
    r.check(!after.card && after.can === 'help', `161b ${vp.width}: after the install the card is gone and the prompt is let go`, JSON.stringify({ card: after.card, can: after.can }));
    r.check(after.db === before && app.errors.length === 0, `161e ${vp.width}: JSON.stringify(DB) unchanged; no page errors`, app.errors.join(' | '));
  } catch (e) { r.check(false, `161b ${vp.width} threw: ` + String(e && e.message || e).split('\n')[0]); }
  await app.close();
}
/* 161b — Not now */
{
  const app = await openApp({ viewport: { width: 390, height: 844 }, initScript: TEST, hasTouch: true });
  const p = app.page;
  try {
    await p.evaluate(FAKE_PROMPT);
    await p.waitForSelector('#pwa-offer', { timeout: 9000 });
    await p.click('#pwa-offer .pwa-x');
    await sleep(200);
    const ck = await p.evaluate(() => document.cookie);
    r.check(/siyagah_pwa_off=1/.test(ck) && !(await p.evaluate(() => !!document.getElementById('pwa-offer'))), '161b Not now closes the card and sets the 30-day cookie', ck);
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.__appBooted === true);
    await p.evaluate(FAKE_PROMPT);
    await sleep(5500);
    r.check(await p.evaluate(() => !document.getElementById('pwa-offer') && document.getElementById('pwa-install-mi').style.display !== 'none'), '161b after Not now a reload shows no card, and the ⚙ row is still there');
  } catch (e) { r.check(false, '161b Not now threw: ' + String(e && e.message || e).split('\n')[0]); }
  await app.close();
}

/* 161c — iPhone */
{
  const app = await openApp({ viewport: { width: 390, height: 844 }, hasTouch: true, initScript: `window.__pwaTest=1;Object.defineProperty(navigator,'userAgent',{get:()=>${JSON.stringify(IOS_UA)}});` });
  const p = app.page;
  try {
    r.check(await p.evaluate(() => _pwaCan()) === 'ios', '161c an iPhone is recognised (no prompt)');
    await p.waitForSelector('#pwa-offer', { timeout: 9000 }).catch(() => {});
    const k = await p.evaluate(CARD);
    r.check(k && k.btns[0].t === 'How', '161c the card shows with "How"', JSON.stringify(k && k.btns));
    await p.click('#pwa-offer .pwa-go');
    await sleep(300);
    const m = await p.evaluate(() => ({ on: document.getElementById('ov').classList.contains('on'), t: document.getElementById('mb').textContent }));
    r.check(m.on && /Share/.test(m.t) && /Add to Home Screen/.test(m.t) && /Safari/.test(m.t), '161c How opens the Share ▸ Add to Home Screen steps', m.t.slice(0, 200));
    await p.evaluate(() => closeModal());
    await p.evaluate(() => installPWA());
    await sleep(200);
    r.check(await p.evaluate(() => /Add to Home Screen/.test(document.getElementById('mb').textContent) && document.getElementById('ov').classList.contains('on')), '161c the ⚙ row\'s action opens the same steps');
    r.check(app.errors.length === 0, '161c no page errors', app.errors.join(' | '));
  } catch (e) { r.check(false, '161c threw: ' + String(e && e.message || e).split('\n')[0]); }
  await app.close();
}

/* 161d — already installed */
{
  const app = await openApp({ viewport: { width: 390, height: 844 }, hasTouch: true, initScript: `window.__pwaTest=1;const _mm=window.matchMedia.bind(window);window.matchMedia=(q)=>/display-mode: standalone/.test(q)?{matches:true,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}:_mm(q);` });
  const p = app.page;
  try {
    await p.evaluate(FAKE_PROMPT);
    await sleep(5500);
    const s = await p.evaluate(() => ({ can: _pwaCan(), card: !!document.getElementById('pwa-offer'), mi: document.getElementById('pwa-install-mi').style.display }));
    r.check(s.can === '' && !s.card && s.mi === 'none', '161d installed: no card and no ⚙ row', JSON.stringify(s));
  } catch (e) { r.check(false, '161d threw: ' + String(e && e.message || e).split('\n')[0]); }
  await app.close();
}
process.exit(r.finish() ? 1 : 0);
