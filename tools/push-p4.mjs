#!/usr/bin/env node
/* tools/push-p4.mjs — v05.26, P4: no pause when the new notes go to the cloud after an import (checks 86a–86e).

   `node tools/push-p4.mjs --profile [--plan=recs|both] [--notes=9000]`  prints the profile table (no checks)
   `node tools/push-p4.mjs [--only=86a,86c] [--notes=9000] [--unpatched]` runs the checks; each printed ok/FAIL line is one app-check check.
   `--unpatched` serves the build before this round (the P4 version-bump commit's parent), where the new checks must fail. */
import { playwright, serve, seedDB, hostLimit } from './harness.mjs';
import { makeCloud, addDevice, on, sleep, quiet, waitSeeded, check, results, liveDB } from './s1-fake.mjs';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const arg = (k, d) => { const a = argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const onlySet = arg('only') ? new Set(arg('only').split(',')) : null;
const want = (t) => !onlySet || onlySet.has(t);
const BIGN = +arg('notes', 9000), IMPN = +arg('import', 2000);
const PROFILE = argv.includes('--profile');

function makeBase() {
  const dir = mkdtempSync(join(tmpdir(), 'push-p4-base-'));
  const sha = execFileSync('git', ['log', '--format=%H', '-n', '1', '--grep=v05.26 P4: version bump'], { encoding: 'utf8' }).trim();
  for (const f of ['index.html', 'sw.js', 'manifest.json']) { try { writeFileSync(join(dir, f), execFileSync('git', ['show', `${sha}~1:${f}`], { encoding: 'buffer', maxBuffer: 1 << 28 })); } catch {} }
  return dir;
}
const pw = await playwright();
const srv = await serve(argv.includes('--unpatched') ? makeBase() : undefined);
const browser = await pw.chromium.launch({ args: ['--js-flags=--max-old-space-size=8192'] });
const TMP = mkdtempSync(join(tmpdir(), 'push-p4-'));

/* ── fixtures: an Evernote export of `n` notes ── */
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const HEAD = '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE en-export SYSTEM "http://xml.evernote.com/pub/evernote-export4.dtd">\n<en-export export-date="20261014T000000Z" application="Evernote" version="10.0">\n';
const H1 = '0123456789abcdef0123456789abcdef';
const ENML = (inner) => `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd"><en-note>${inner}</en-note>`;
const noteXML = (n) => `<note>\n<title>${esc(n.title)}</title>\n<created>${n.created}</created>\n<updated>${n.created}</updated>\n${(n.tags || []).map((t) => `<tag>${esc(t)}</tag>`).join('\n')}\n<content><![CDATA[${ENML(n.inner)}]]></content>\n</note>\n`;
function makeExport(name, n, prefix = 'Two thousand ') {
  const dir = join(TMP, name, 'Stack K'); mkdirSync(dir, { recursive: true });
  let s = HEAD;
  for (let i = 0; i < n; i++) {
    const tm = new Date(Date.UTC(2016, 0, 1) + i * 90000), c = tm.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    s += noteXML({ title: prefix + i, created: c, tags: ['k' + (i % 40), 'two'], inner: '<div>' + 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(20) + `</div><div><en-todo/>step ${i}</div><en-media hash="${H1}" type="image/png"/>` });
  }
  const f = join(dir, 'Two thousand.enex'); writeFileSync(f, s + '</en-export>\n');
  return [f];
}

/* ── the harness ── */
const T0 = '2026-10-01T00:00:00.000Z';
const seed = (extra) => { const db = seedDB(T0); for (let i = 0; i < extra; i++) db.articles.push({ id: 'bn' + i, title: 'Bulk note ' + i, content: '<p>Body ' + i + ' lorem ipsum dolor sit amet</p>', folderIds: [i % 2 ? 'f1' : 'f2'], tags: i % 9 === 0 ? ['bulk'] : [], createdAt: T0, updatedAt: T0, kind: 'general' }); return db; };
const VP = { w: 390, h: 844, touch: true }, VPD = { w: 1440, h: 900, touch: false };
const dev = (cloud, name, vp, opts, db) => addDevice(browser, srv.base, cloud, name, { width: vp.w, height: vp.h }, vp.touch, db, opts);
const act = (d, vp, sel) => (vp.touch ? d.page.locator(sel).first().tap() : d.page.locator(sel).first().click());
const actText = (d, vp, sel, text) => (vp.touch ? d.page.locator(sel, { hasText: text }).first().tap() : d.page.locator(sel, { hasText: text }).first().click());
const dlg = async (d, vp) => {
  await act(d, vp, '#sb-tools-btn'); await sleep(300);
  await actText(d, vp, '#sb-tools .sb-mi', 'Evernote import');
  await d.page.waitForSelector('#enx-modal.open #enx-box', { timeout: 5000 });
};
const pick = async (d, vp, files) => { await dlg(d, vp); await d.page.setInputFiles('#enx-files', files); await d.page.waitForSelector('#enx-totals', { timeout: 300000 }); };
const waitState = (d, states, ms = 600000) => d.page.waitForFunction((s) => !_enx.imp.run && s.includes(_enx.imp.state), states, { timeout: ms });

/* the page-side recorder: wraps named globals and records [name, start, dur] (inclusive), the long tasks, and the fake SDK's own time */
const INSTALL = () => {
  window.__prof = []; window.__lts = []; window.__fake = [];
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lts.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ entryTypes: ['longtask'] }); } catch (e) {}
  for (const n of ['_stampRecordTouches', '_s1TakeSnap', '_s1SnapDirty', '_s1Snap', '_s1Exec', '_s1Write', '_pushWrite', '_doPush', '_save', '_syncSig', '_b64enc', '_writeCloudDB', '_rcJson', '_rcEntry', '_enxPersist']) {
    const o = window[n]; if (typeof o !== 'function') continue;
    window[n] = function () {
      const t0 = performance.now(), r = o.apply(this, arguments);
      if (r && typeof r.then === 'function') { window.__prof.push([n + ' (sync part)', t0, performance.now() - t0]); return r; }
      window.__prof.push([n, t0, performance.now() - t0]); return r;
    };
  }
  /* the fake SDK's own work: time around every batch.set / doc.set / commit's synchronous clone */
  const fs = firebase.firestore(), ob = fs.batch.bind(fs);
  fs.batch = function () { const b = ob(), os = b.set, oc = b.commit; b.set = function () { const t0 = performance.now(); const r = os.apply(this, arguments); window.__fake.push([t0, performance.now() - t0]); return r; }; b.commit = function () { const t0 = performance.now(); const p = oc.apply(this, arguments); window.__fake.push([t0, performance.now() - t0]); return p; }; return b; };
};

async function importInto(d, vp, files, { plan, hook } = {}) {
  const cdp = d.cdp;
  await on(d, INSTALL);
  /* the fake cloud's first blob is an unmarked one, so "an older build is active" is true by default: say which plan this run is */
  await on(d, (p) => { window._s1OlderActive = () => p === 'both'; }, plan || 'recs');
  await pick(d, vp, files);
  await on(d, () => { window.__t0 = performance.now(); window.__pushRet = 0; const o = window._doPush; window._doPush = async function () { const r = await o.apply(this, arguments); window.__pushRet = performance.now(); (window.__pushRets = window.__pushRets || []).push(Math.round(performance.now())); return r; }; });
  if (hook) await hook(d);
  await act(d, vp, '#enx-bring');
  await waitState(d, ['done', 'capped']);
  await quiet(d.cloudObj, d, 120000);
  return cdp;
}

async function newDevice(name, vp, opts = {}, nbig = BIGN) {
  const cl = makeCloud(); const d = await dev(cl, name, vp, opts, seed(nbig)); d.cloudObj = cl; d.page.setDefaultTimeout(60000);
  await waitSeeded(cl, d, 600000);
  return d;
}

async function profile(plan) {
  const d = await newDevice('P-' + plan, VP, { throttle: 4 });
  try {
    const files = makeExport('prof-' + plan, IMPN);
    await importInto(d, VP, files, { plan });
    const r = await on(d, () => ({ prof: window.__prof, lts: window.__lts, fake: window.__fake, t0: window.__t0, rets: window.__pushRets }));
    const agg = new Map();
    for (const [n, t, dur] of r.prof) { if (t < r.t0) continue; const a = agg.get(n) || { c: 0, tot: 0, max: 0, at: 0 }; a.c++; a.tot += dur; if (dur > a.max) { a.max = dur; a.at = t; } agg.set(n, a); }
    console.log(`\n## profile — plan ${plan}, 390 × CPU 4, ${BIGN} + ${IMPN} notes (ms; inclusive, from the click)`);
    console.log('| step | calls | total | worst | worst at |\n|---|---|---|---|---|');
    for (const [n, a] of [...agg.entries()].sort((x, y) => y[1].max - x[1].max)) console.log(`| ${n} | ${a.c} | ${Math.round(a.tot)} | ${Math.round(a.max)} | ${Math.round(a.at)} |`);
    const lts = r.lts.filter(([s]) => s >= r.t0 - 5).sort((x, y) => y[1] - x[1]).slice(0, 8);
    console.log('long tasks (worst 8) [start, dur]: ' + JSON.stringify(lts) + ' push returned at ' + JSON.stringify(r.rets));
    const fk = r.fake.filter(([t]) => t >= r.t0); console.log(`fake SDK time in batch.set/commit: ${fk.length} calls, total ${Math.round(fk.reduce((s, x) => s + x[1], 0))} ms, worst ${Math.round(Math.max(0, ...fk.map((x) => x[1])))} ms`);
  } finally { await d.ctx.close(); }
}

if (PROFILE) {
  for (const plan of (arg('plan') ? [arg('plan')] : ['recs', 'both'])) await profile(plan);
  await browser.close(); srv.close && srv.close();
  process.exit(0);
}

/* the checks follow in block 86 */
export { importInto, newDevice, makeExport, VP, VPD, dev, act, actText, dlg, pick, waitState, want, check, results, liveDB, hostLimit, seed, BIGN, IMPN, srv, browser };
