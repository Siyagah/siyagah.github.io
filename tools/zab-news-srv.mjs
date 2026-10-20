#!/usr/bin/env node
/* tools/zab-news-srv.mjs — v05.37, Z13c: Siyagah's own news service (PCF J50). Checks 97a–97f. Nothing touches the real network: the service file is a FAKE
   answered by a Playwright route at https://news-srv.test/news.json (window.__zabNewsSrv), the owner's helper a FAKE at https://news-helper.test/exec, and
   news/fetch.mjs runs with a fake `curl` first on PATH. Service headlines carry the marker ZZSRV, helper headlines ZZHLP.

   97a  service   with NO helper address and the news on, the five channels' headlines come from the service; the helper is never called; the settings say
                  "Siyagah's news service" and keep the helper box inside a closed "Optional" fold — at 390, 820, 1440, with no sideways scroll
   97b  split     a channel the owner added that the service does not carry goes to the helper ALONE (its `c` lists only that channel); both kinds are shown
   97c  words     an added channel with no helper says "does not carry this channel yet"; the service unreachable says so in plain words (Firefox's
                  "NetworkError when attempting to fetch resource." too) and, with a helper, every channel falls back to the helper
   97d  band      the service's headlines scroll in the band and open in a new tab
   97e  server    news/fetch.mjs runs the app's own helper (from index.html) through curl: one answer per channel in news/channels.json, each with `q`, items with
                  t/u/d; a channel whose site fails is ok:false with words, the others are kept; news/channels.json is exactly the app's five default channels
   97f  wiring    the app's address names this repository, the branch `news` and news.json; news.yml runs on a schedule and by hand, publishes ONLY news.json,
                  force-pushed to `news`, and publishes nothing when every channel failed; no page errors; the headlines are not in DB

   `--only=97a,97e` runs just those; `--unpatched` serves the build before this round (97a–97d must FAIL there: no service, no news without a helper). */
import { playwright, serve, seedDB } from './harness.mjs';
import { sleep } from './s1-fake.mjs';
import { mkdtempSync, writeFileSync, readFileSync, chmodSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const onlyArg = argv.find((a) => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);
const results = [];
function check(ok, label, detail = '') { results.push({ ok, label }); console.log((ok ? '  ok   ' : ' FAIL  ') + label + (detail ? '\n         ' + String(detail).slice(0, 400) : '')); }
async function T(label, fn) { try { const r = await fn(); check(!!r[0], label, r[1] || ''); } catch (e) { check(false, label, 'threw: ' + String(e.message || e).split('\n')[0]); } }

const ROOT = new URL('..', import.meta.url).pathname;
const VPS = [{ name: '390', w: 390, h: 844, touch: true }, { name: '820', w: 820, h: 1180, touch: true }, { name: '1440', w: 1440, h: 900, touch: false }];
function makeBase() {   /* the app as it was just before this round; throws when the commit is not found (a shallow clone would compare the build with itself) */
  const dir = mkdtempSync(join(tmpdir(), 'z13c-base-'));
  const sha = execFileSync('git', ['log', '--format=%H', '-n', '1', '--grep=v05.37 Z13c: version bump'], { encoding: 'utf8' }).trim();
  if (!sha) throw new Error('makeBase: the commit "v05.37 Z13c: version bump" is not in this clone (shallow?) — refusing to compare the build with itself');
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', `${sha}~1:${f}`], { encoding: 'buffer', maxBuffer: 1 << 28 })); } catch {} }
  return dir;
}
const pw = await playwright();
const srv = await serve(argv.includes('--unpatched') ? makeBase() : undefined);
const browser = await pw.chromium.launch();

const HELPER = 'https://news-helper.test/exec', SRV = 'https://news-srv.test/news.json';
const DEF = [['aljazeera', 'https://www.aljazeera.com/xml/rss/all.xml'], ['mee', 'https://www.middleeasteye.net/rss'], ['trt', 'https://www.trtworld.com/feed/rss.xml'],
  ['arabnews', 'https://www.arabnews.com/rss.xml'], ['5pillars', 'https://5pillarsuk.com/feed']];
const ADDED = { id: 'cadded1', name: 'Added One', src: 'https://added.example/feed', color: '#00A6A6', on: true };
const fake = { srv: 'ok', helper: 'ok', calls: [], srvCalls: 0 };
const items = (mark, id, n) => Array.from({ length: n }, (_, k) => ({ t: `${mark} ${id} headline ${k}`, s: `short ${k}`, u: `https://news-story.test/${id}/${k}`, d: new Date(Date.now() - k * 60000).toISOString() }));
function srvBody() { return JSON.stringify({ at: new Date().toISOString(), chans: DEF.map(([id, q]) => ({ id, q, ok: true, name: id, src: q, items: items('ZZSRV', id, 20) })) }); }
function helperBody(u) {
  const c = JSON.parse(u.searchParams.get('c') || '[]');
  return JSON.stringify({ at: new Date().toISOString(), chans: c.map((x) => ({ id: x.id, ok: true, name: x.id, items: items('ZZHLP', x.id, 5) })) });
}
const H = { 'access-control-allow-origin': '*' };
const T0 = '2026-10-01T00:00:00.000Z';
function seed(news) {
  const db = seedDB(T0);
  db.theme = { preset: 'forest', custom: {}, zabTicker: { on: true }, ...(news ? { zabNews: news } : {}) };
  return db;
}
const allErr = [];
async function openDev(vp, o = {}) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, ...(vp.touch ? { hasTouch: true, isMobile: true } : {}) });
  for (const p of ['**googleapis.com/**', '**gstatic.com/**', '**firebaseapp.com/**', '**firebaseio.com/**', '**raw.githubusercontent.com/**']) await ctx.route(p, (r) => r.abort());
  await ctx.addInitScript(() => { window.__zabNewsSrv = 'https://news-srv.test/news.json'; });
  await ctx.route('https://news-srv.test/**', (r) => { fake.srvCalls++; return fake.srv === 'abort' ? r.abort() : r.fulfill({ status: 200, headers: H, contentType: 'application/json', body: srvBody() }); });
  await ctx.route('https://news-helper.test/**', (r) => { const u = new URL(r.request().url()); fake.calls.push(JSON.parse(u.searchParams.get('c') || '[]').map((x) => x.id).join(',')); return r.fulfill({ status: 200, headers: H, contentType: 'application/json', body: helperBody(u) }); });
  await ctx.route('https://news-story.test/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>story</title>' }));
  await ctx.addInitScript((d) => { try { if (!localStorage.getItem('my-notebook-v1')) localStorage.setItem('my-notebook-v1', JSON.stringify(d)); } catch {} }, o.db || seed({ on: true }));
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => { errors.push('pageerror: ' + e); allErr.push('pageerror: ' + e); });
  await page.goto(srv.base + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__appBooted === true && !!document.getElementById('tree'));
  await sleep(o.settle || 3200);   /* the first fetch runs 1.5 s after start */
  return { ctx, page, errors, vp };
}
const prev = (p) => p.evaluate(() => { if (typeof openTheme === 'function' && !document.getElementById('th-nw')) openTheme(); return new Promise((r) => setTimeout(() => r({
  st: (document.getElementById('nw-status') || {}).textContent || '',
  cn: [...document.querySelectorAll('#nw-prev .nw-t')].map((e) => e.textContent) }), 400)); });
const refetch = (p) => p.evaluate(async () => { _newsLast = -1; _newsTick(); for (let i = 0; i < 40 && _newsBusy; i++) await new Promise((r) => setTimeout(r, 100)); _newsPaint(); });

if (want('97a')) {
  for (const vp of VPS) {
    fake.calls = []; fake.srv = 'ok';
    const d = await openDev(vp), p = d.page;
    await T(`97a ${vp.name}: no helper address, news on: the five channels' headlines come from Siyagah's service, the helper is never called`, async () => {
      const r = await prev(p);
      const srvN = r.cn.filter((t) => /^ZZSRV /.test(t)).length, chans = new Set(r.cn.map((t) => t.split(' ')[1]));
      return [srvN >= 5 && chans.size === 5 && fake.calls.length === 0 && /^Last fetched/.test(r.st) && !/did not answer/.test(r.st), JSON.stringify({ srvN, chans: [...chans], calls: fake.calls, st: r.st.slice(0, 120) })];
    });
    await T(`97a ${vp.name}: the settings name Siyagah's news service; the helper box sits in a closed "Optional" fold; no sideways scroll`, async () => {
      const r = await p.evaluate(() => { const s = document.getElementById('th-nw'), f = document.getElementById('th-nw-own');
        return { txt: /Siyagah’s own news service/.test(s.innerText), fold: !!f && !f.open && !!f.querySelector('#th-nw-url') && !!f.querySelector('#th-nw-copy') && /Optional/.test(f.querySelector('summary').textContent),
          sumH: f ? f.querySelector('summary').getBoundingClientRect().height : 0, side: document.documentElement.scrollWidth > innerWidth + 1 }; });
      return [r.txt && r.fold && r.sumH >= 44 && !r.side, JSON.stringify(r)];
    });
    await d.ctx.close();
  }
}
if (want('97b')) {
  fake.calls = []; fake.srv = 'ok';
  const chans = DEF.map(([id, src], k) => ({ id, name: id, src, color: '#E8A200', on: true })).concat([ADDED]);
  const d = await openDev(VPS[2], { db: seed({ on: true, url: HELPER, chans }) }), p = d.page;
  await T('97b an added channel the service does not carry goes to the helper alone; the five come from the service; both are shown', async () => {
    const r = await prev(p);
    const hl = r.cn.filter((t) => /^ZZHLP cadded1 /.test(t)).length, sv = new Set(r.cn.filter((t) => /^ZZSRV /.test(t)).map((t) => t.split(' ')[1])).size;
    return [fake.calls.length >= 1 && fake.calls.every((c) => c === 'cadded1') && hl >= 1 && sv === 5, JSON.stringify({ calls: fake.calls, hl, sv, st: r.st.slice(0, 100) })];
  });
  await T('97b the service unreachable: with a helper every switched-on channel falls back to it, headlines still shown, no toast', async () => {
    fake.srv = 'abort'; fake.calls = []; const tb = await p.evaluate(() => document.querySelectorAll('.toast').length);
    await refetch(p); const r = await prev(p); fake.srv = 'ok';
    const ta = await p.evaluate(() => document.querySelectorAll('.toast').length);
    return [fake.calls.length === 1 && fake.calls[0].split(',').length === 6 && r.cn.some((t) => /^ZZHLP aljazeera /.test(t)) && ta === tb, JSON.stringify({ calls: fake.calls, st: r.st.slice(0, 100), n: r.cn.length })];
  });
  await d.ctx.close();
}
if (want('97c')) {
  fake.calls = []; fake.srv = 'ok';
  const chans = DEF.map(([id, src]) => ({ id, name: id, src, color: '#E8A200', on: true })).concat([ADDED]);
  const d = await openDev(VPS[0], { db: seed({ on: true, chans }) }), p = d.page;
  await T('97c an added channel with no helper: the status says the service does not carry it yet; the five are still shown', async () => {
    const r = await prev(p);
    return [/Added One \(Siyagah’s news service does not carry this channel yet\)/.test(r.st) && new Set(r.cn.map((t) => t.split(' ')[1])).size === 5 && fake.calls.length === 0, r.st.slice(0, 200)];
  });
  await T('97c the service unreachable and no helper: "Could not fetch the news: Siyagah’s news service: it could not be reached", old headlines kept', async () => {
    fake.srv = 'abort'; await refetch(p); const r = await prev(p); fake.srv = 'ok';
    return [/^Could not fetch the news: Siyagah’s news service: it could not be reached/.test(r.st) && r.cn.length > 0, r.st.slice(0, 200)];
  });
  await T('97c Firefox\'s "NetworkError when attempting to fetch resource." and Safari\'s "Load failed" are said in plain words', async () => {
    const r = await p.evaluate(() => [_newsNetErr(new TypeError('NetworkError when attempting to fetch resource.')), _newsNetErr(new TypeError('Load failed')), _newsNetErr(new TypeError('Failed to fetch')), _newsNetErr({ name: 'AbortError' })]);
    return [r[0] === 'it could not be reached' && r[1] === r[0] && r[2] === r[0] && /too long/.test(r[3]), JSON.stringify(r)];
  });
  await d.ctx.close();
}
if (want('97d')) {
  fake.calls = []; fake.srv = 'ok';
  const d = await openDev(VPS[2], { db: seed({ on: true, mix: 'news' }), settle: 4500 }), p = d.page;
  await T('97d the service\'s headlines scroll in the band (News only) and a click opens the story in a new tab', async () => {
    await p.waitForFunction(() => document.querySelectorAll('#zab-tk a.tk-nw').length > 0, null, { timeout: 15000 });
    const r = await p.evaluate(() => { const a = document.querySelector('#zab-tk a.tk-nw'); return { n: document.querySelectorAll('#zab-tk a.tk-nw').length, t: a.textContent, tg: a.target, u: a.href }; });
    return [r.n > 0 && /ZZSRV/.test(r.t) && r.tg === '_blank' && /^https:\/\/news-story\.test\//.test(r.u), JSON.stringify(r)];
  });
  await T('97d the headlines are not in DB, the notebook copy or localStorage', async () => {
    const r = await p.evaluate(() => JSON.stringify(DB).includes('ZZSRV') || Object.keys(localStorage).some((k) => (localStorage.getItem(k) || '').includes('ZZSRV')));
    return [!r, String(r)];
  });
  await d.ctx.close();
}
if (want('97e')) {
  const bin = mkdtempSync(join(tmpdir(), 'z13c-curl-'));
  /* a fake curl: prints a small RSS for every address except 5pillars (HTTP 503), then "\n<code>" as `-w '\n%{http_code}'` asks */
  writeFileSync(join(bin, 'curl'), `#!/usr/bin/env node
const u = process.argv[process.argv.length - 1];
if (/5pillars/.test(u)) { process.stdout.write('down\\n503'); process.exit(0); }
const id = u.replace(/^https?:\\/\\/(www\\.)?/, '').split('/')[0];
let x = '<?xml version="1.0"?><rss><channel><title>' + id + ' feed</title>';
for (let k = 0; k < 30; k++) x += '<item><title>ZZCURL ' + id + ' ' + k + '</title><link>https://' + id + '/s/' + k + '</link><pubDate>' + new Date(Date.now() - k * 6e4).toUTCString() + '</pubDate><description>about ' + k + '</description></item>';
process.stdout.write(x + '</channel></rss>\\n200');
`);
  chmodSync(join(bin, 'curl'), 0o755);
  const run = spawnSync(process.execPath, [join(ROOT, 'news/fetch.mjs')], { encoding: 'utf8', env: { ...process.env, PATH: bin + ':' + process.env.PATH, NEWS_PER: '20' }, timeout: 60000 });
  await T('97e news/fetch.mjs runs the app\'s helper through curl: an answer per channel with q, 20 headlines each with t/u/d; a failing site is ok:false with words, the others kept', async () => {
    const j = JSON.parse(run.stdout || '{}');
    const ch = j.chans || [], ok = ch.filter((c) => c.ok), bad = ch.find((c) => c.id === '5pillars');
    const good = ok.length === 4 && ok.every((c) => c.items.length === 20 && c.items.every((i) => /^ZZCURL /.test(i.t) && /^https:\/\//.test(i.u) && /^\d{4}-/.test(i.d)) && DEF.some(([id, q]) => id === c.id && q === c.q));
    return [run.status === 0 && good && bad && bad.ok === false && /503/.test(bad.err) && bad.q === DEF[4][1], JSON.stringify({ status: run.status, ok: ok.length, bad, err: (run.stderr || '').slice(0, 200) })];
  });
  await T('97e news/channels.json is exactly the app\'s five default channels (ids and addresses, in order)', async () => {
    const cj = JSON.parse(readFileSync(join(ROOT, 'news/channels.json'), 'utf8'));
    const html = readFileSync(join(ROOT, 'index.html'), 'utf8'), a = html.indexOf('const _NEWS_DEF=['), def = eval(html.slice(a + 16, html.indexOf('];', a) + 1));
    return [cj.length === def.length && cj.every((c, k) => c.id === def[k].id && c.src === def[k].src), JSON.stringify(cj.map((c) => c.id))];
  });
}
if (want('97f')) {
  await T('97f the app reads news.json from this repository\'s `news` branch; news.yml: schedule + by hand, publishes only news.json force-pushed to `news`, nothing when all failed', async () => {
    const html = readFileSync(join(ROOT, 'index.html'), 'utf8'), y = readFileSync(join(ROOT, '.github/workflows/news.yml'), 'utf8');
    const m = /const _NEWS_SRV='([^']+)'/.exec(html);
    const r = {
      url: !!m && m[1] === 'https://raw.githubusercontent.com/Siyagah/siyagah.github.io/news/news.json',
      sched: /schedule:\s*\n\s*- cron: '[^']+'/.test(y) && /workflow_dispatch:/.test(y),
      only: /git add news\.json\n/.test(y) && !/git add (-A|\.)/.test(y) && /--orphan news/.test(y) && /push -qf [^\n]+ news\n/.test(y),
      guard: /if\(!j\.chans\.some\(c=>c\.ok\)\)process\.exit\(1\)/.test(y),
      write: /contents: write/.test(y)
    };
    return [Object.values(r).every(Boolean), JSON.stringify(r)];
  });
  await T('97f no page errors across the whole run', async () => [allErr.length === 0, allErr.slice(0, 3).join(' · ')]);
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
await browser.close(); await srv.close?.();
process.exit(failed ? 1 : 0);
