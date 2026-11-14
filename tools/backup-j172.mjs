#!/usr/bin/env node
/* tools/backup-j172.mjs — v05.95, J172 (block 154). The owner: a JSON backup on the phone/tablet was left as a 0-byte file (the picker creates the file empty;
   close() fills it; a hidden page never gets there). At 390 / 820 / 1440 (the checks that need no layout run once at 1440):
   154a picker stub, page hidden mid-way: status says Paused; on return it finishes; file ends }\n, size = bytes written
   154b the file reads back empty: no "Saved", remove() called, the message names the file
   154c Blob path whose slice().text() rejects: no download link clicked, a plain message; a normal run clicks exactly one
   154d an unfinished-job marker at start shows the one-time message and is gone after
   154e Notes only: no data: picture, every data-pic kept; Import -> Merge into a fresh profile gives the same notes
   154f the expected size line is on screen before writing, within 25 % of the final size
   154g Wake Lock requested and released (also when the write fails, and when it is refused)
   154h Diagnostics line (N + K = M); the choice shows (sheet < 640, in the window above); no page errors; JSON.stringify(DB) unchanged by the exports */
import { createHash } from 'node:crypto';
import { openApp, report, seedDB } from './harness.mjs';

const r = report('J172 — a JSON backup is never left as a 0-byte file');
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const OLD = '2026-01-01T00:00:00.000Z';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const SHA = createHash('sha256').update(PNG).digest('hex');
const SHA2 = createHash('sha256').update(Buffer.concat([PNG, Buffer.from([0])])).digest('hex');
const ref = (s) => `<img class="ed-img" data-pic="${s}" data-mime="image/png" alt="">`;

function db() {
  const d = seedDB(OLD);
  d.articles = [];
  for (let i = 1; i <= 3; i++) d.articles.push({ id: 'n' + i, title: 'Big note ' + i, content: '<p>' + 'word '.repeat(240000) + '</p>' + ref(SHA), folderIds: ['f1'], tags: [], createdAt: OLD, updatedAt: OLD, kind: 'general' });
  d.articles.push({ id: 'n4', title: 'Missing picture', content: '<p>Words</p>' + ref('e'.repeat(64)), folderIds: ['f1'], tags: [], createdAt: OLD, updatedAt: OLD, kind: 'general' });
  return d;
}
const seedPics = (p) => p.evaluate(async (b64) => {
  const u8 = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const s = await _picPut(new Blob([u8], { type: 'image/png' }), 'image/png');
  return s;
}, PNG.toString('base64'));
const FAKE = () => {
  const F = window.__fh = { calls: [], written: 0, file: null, emptyRead: false, readThrows: false, removed: false, name: '', hideOnWrite: false, status: [] };
  window.showSaveFilePicker = async (o) => {
    F.name = o.suggestedName; F.calls.push('pick');
    return { name: o.suggestedName,
      createWritable: async () => { F.calls.push('createWritable'); const parts = []; return {
        write: async (d) => { if (F.calls.indexOf('write') < 0) F.atFirst = (document.getElementById('bxp-status') || {}).textContent; F.calls.push('write'); const b = d instanceof Blob ? d : new Blob([d]); F.written += b.size; parts.push(b);
          if (F.hideOnWrite) { F.hideOnWrite = false; Object.defineProperty(document, 'hidden', { get: () => true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); } },
        close: async () => { F.calls.push('close'); F.file = new Blob(parts); },
        abort: async () => { F.calls.push('abort'); } }; },
      getFile: async () => { if (F.readThrows) throw new DOMException('the file is busy', 'NotReadableError'); return F.emptyRead ? new Blob([]) : (F.file || new Blob([])); },
      remove: async () => { F.calls.push('remove'); F.removed = true; } };
  };
  setInterval(() => { const t = (document.getElementById('bxp-status') || {}).textContent; if (t && F.status[F.status.length - 1] !== t) F.status.push(t); }, 20);
};
const WAKE = () => {
  const W = window.__wl = { req: 0, rel: 0, refuse: false };
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: async () => { W.req++; if (W.refuse) throw new DOMException('no', 'NotAllowedError'); return { release: async () => { W.rel++; } }; } } });
};
const status = (p) => p.evaluate(() => (document.getElementById('bxp-status') || {}).textContent || '');
const waitDone = (p, ms = 60000) => p.waitForFunction(() => /^(Saved|Backup failed|Backup cancelled)/.test((document.getElementById('bxp-status') || {}).textContent || ''), null, { timeout: ms }).catch(() => {});
const openBackup = async (p) => { await p.evaluate(() => openModal('settings')); await p.waitForSelector('#bxp-exp'); };

for (const [w, h, touch] of [[390, 844, true], [820, 1180, true], [1440, 900, false]]) {
  const t = `@${w}`;
  const app = await openApp({ viewport: { width: w, height: h }, db: db(), hasTouch: touch });
  const p = app.page;
  try {
    await sleep(600);
    await seedPics(p);
    const dbBefore = await p.evaluate(() => JSON.stringify(DB));
    await p.evaluate(WAKE); await p.evaluate(FAKE);
    await openBackup(p);

    /* 154h — the choice: opens from ⬇, a sheet below 640, inside the window above */
    await (touch ? p.locator('#bxp-exp').tap() : p.locator('#bxp-exp').click());
    await p.waitForFunction(() => /Everything/.test((document.getElementById('bxp-est') || {}).textContent || ''), null, { timeout: 30000 }).catch(() => {});
    const ch = await p.evaluate(() => { const c = document.getElementById('bxp-choice'), b = c.getBoundingClientRect(), m = document.querySelector('.mt'); return { vis: c.offsetParent !== null || getComputedStyle(c).position === 'fixed', pos: getComputedStyle(c).position, bottom: Math.round(b.bottom), ih: innerHeight, all: !!document.getElementById('bxp-all'), notes: !!document.getElementById('bxp-notes'), est: document.getElementById('bxp-est').textContent }; });
    r.check(ch.vis && ch.all && ch.notes && /Keep Siyagah open/.test(ch.est) && /Notes only/.test(ch.est), `154h${t} ⬇ Export opens the choice with both buttons, the sizes and the keep-open sentence`, JSON.stringify(ch));
    r.check(w < 640 ? (ch.pos === 'fixed' && Math.abs(ch.bottom - ch.ih) <= 2) : ch.pos !== 'fixed', `154h${t} ${w < 640 ? 'a bottom sheet' : 'inside the same 💽 window, not a second card'}`, JSON.stringify(ch));
    const touchTargets = await p.evaluate(() => ['bxp-all', 'bxp-notes'].map((i) => { const b = document.getElementById(i).getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; }));
    r.check(w >= 640 || touchTargets.every(([bw, bh]) => bw >= 44 && bh >= 44), `154h${t} the choice buttons are at least 44 x 44 on a phone`, JSON.stringify(touchTargets));

    /* 154f — the expected size is on screen BEFORE writing, within 25 % of the final size (Everything) */
    await p.evaluate(() => { window.__fh.file = null; window.__fh.written = 0; window.__fh.calls = []; window.__fh.status = []; window.__fh.atFirst = ''; });
    await (touch ? p.locator('#bxp-all').tap() : p.locator('#bxp-all').click());
    await waitDone(p);
    const st = await p.evaluate(() => ({ s: window.__fh.status.slice(), size: window.__fh.file ? window.__fh.file.size : -1, calls: window.__fh.calls.slice(), last: (document.getElementById('bxp-status') || {}).textContent }));
    const first = await p.evaluate(() => window.__fh.atFirst || '');
    r.check(/Expected size: about/.test(first) && /Keep Siyagah open on this screen until it says Saved\. Until then the file shows 0 bytes\./.test(first), `154f${t} the expected size + the keep-open sentence are on screen when the first byte is written`, first.slice(0, 300));
    const m = /Expected size: about ([\d.,]+) (MB|KB)/.exec(first);
    const est = m ? parseFloat(m[1].replace(/,/g, '')) * (m[2] === 'MB' ? 1048576 : 1024) : 0;
    r.check(est > 0 && Math.abs(est - st.size) / st.size <= 0.25, `154f${t} the estimate (${Math.round(est)}) is within 25 % of the final size (${st.size})`, '');
    r.check(/^Saved: /.test(st.last), `154f${t} an Everything backup says Saved`, st.last);
    r.check(st.size > 3 * 1200000 && st.calls.filter((c) => c === 'write').length >= 2, `154a${t} (setup) the file is large enough for more than one write`, JSON.stringify({ size: st.size, calls: st.calls.length }));

    /* 154a — hidden mid-way: Paused; on return it finishes; ends }\n; size = bytes written */
    await p.evaluate(() => { const F = window.__fh; F.file = null; F.written = 0; F.calls = []; F.status = []; F.hideOnWrite = true; });
    await p.evaluate(() => { window.__run = exportJSON(); });
    await p.waitForFunction(() => /^Paused/.test((document.getElementById('bxp-status') || {}).textContent || ''), null, { timeout: 30000 }).catch(() => {});
    const paused = await status(p);
    await sleep(500);
    const w1 = await p.evaluate(() => window.__fh.calls.filter((c) => c === 'write').length);
    await sleep(800);
    const w2 = await p.evaluate(() => window.__fh.calls.filter((c) => c === 'write').length);
    r.check(/Paused — come back to Siyagah to finish the backup/.test(paused), `154a${t} hidden: the status says Paused`, paused);
    r.check(w1 === w2, `154a${t} while hidden nothing more is written (${w1} = ${w2})`, '');
    await p.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
    await waitDone(p);
    const a = await p.evaluate(async () => { const F = window.__fh; const tail = F.file ? await F.file.slice(-2).text() : ''; return { saved: /^Saved: /.test(document.getElementById('bxp-status').textContent), tail, size: F.file ? F.file.size : -1, written: F.written, closed: F.calls.includes('close') }; });
    r.check(a.saved && a.closed && a.tail === '}\n' && a.size === a.written && a.size > 0, `154a${t} on return it finishes: Saved, ends }\\n, size ${a.size} = written ${a.written}`, JSON.stringify(a));

    /* 154b — the file reads back empty */
    await p.evaluate(() => { const F = window.__fh; F.file = null; F.written = 0; F.calls = []; F.removed = false; F.emptyRead = true; });
    await p.evaluate(() => exportJSON('notes')); await waitDone(p);
    const b = await p.evaluate(() => ({ s: document.getElementById('bxp-status').textContent, removed: window.__fh.removed, name: window.__fh.name }));
    r.check(!/^Saved/.test(b.s) && /^Backup failed/.test(b.s) && b.removed && b.s.includes(b.name), `154b${t} unreadable/empty: not "Saved", remove() called, the message names ${b.name}`, b.s.slice(0, 300));
    await p.evaluate(() => { window.__fh.emptyRead = false; });

    /* 154b2 (Architect review) — the size cannot be read after a failed write: the file is KEPT (it may be an older good backup the owner chose to replace) and named */
    await p.evaluate(() => { const F = window.__fh; F.file = null; F.written = 0; F.calls = []; F.removed = false; F.readThrows = true; });
    await p.evaluate(() => exportJSON('notes')); await waitDone(p);
    const b2 = await p.evaluate(() => ({ s: document.getElementById('bxp-status').textContent, removed: window.__fh.removed, name: window.__fh.name }));
    r.check(!/^Saved/.test(b2.s) && /^Backup failed/.test(b2.s) && !b2.removed && b2.s.includes(b2.name) && /may be empty or incomplete/.test(b2.s), `154b2${t} size unreadable: not "Saved", remove() NOT called, the message names ${b2.name}`, b2.s.slice(0, 300));
    await p.evaluate(() => { window.__fh.readThrows = false; });

    /* 154g — Wake Lock: requested and released, on success, on a failed write and when refused */
    const wl = await p.evaluate(() => ({ req: window.__wl.req, rel: window.__wl.rel }));
    r.check(wl.req >= 3 && wl.rel === wl.req, `154g${t} Wake Lock requested and released for every export so far (${wl.req}/${wl.rel})`, JSON.stringify(wl));
    await p.evaluate(() => { window.__wl.refuse = true; });
    await p.evaluate(() => exportJSON('notes')); await waitDone(p);
    r.check(/^Saved: /.test(await status(p)), `154g${t} a refused Wake Lock does not stop the backup`, await status(p));
    await p.evaluate(() => { window.__wl.refuse = false; const o = window.showSaveFilePicker; window.showSaveFilePicker = async (x) => { const h = await o(x); const cw = h.createWritable; h.createWritable = async () => { const w = await cw(); w.write = async () => { throw new DOMException('disk is full', 'QuotaExceededError'); }; return w; }; return h; }; });
    const q0 = await p.evaluate(() => ({ req: window.__wl.req, rel: window.__wl.rel }));
    await p.evaluate(() => exportJSON('notes')); await waitDone(p);
    const q1 = await p.evaluate(() => ({ req: window.__wl.req, rel: window.__wl.rel, s: document.getElementById('bxp-status').textContent }));
    r.check(/^Backup failed/.test(q1.s) && q1.req - q0.req === 1 && q1.rel - q0.rel === 1, `154g${t} on a failed write the Wake Lock is released too`, JSON.stringify(q1));
    await p.evaluate(() => { delete window.showSaveFilePicker; window.showSaveFilePicker = undefined; });

    /* 154c — Blob path, tail unreadable */
    if (w === 1440) {
      await p.evaluate(() => { window.__clicks = 0; const oc = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) window.__clicks++; return oc.apply(this, arguments); }; });
      await p.evaluate(() => exportJSON()); await waitDone(p);
      const okc = await p.evaluate(() => ({ c: window.__clicks, s: document.getElementById('bxp-status').textContent }));
      r.check(okc.c === 1 && /^Saved: /.test(okc.s), `154c${t} (control) a normal Blob export clicks one download link and says Saved`, JSON.stringify(okc));
      await p.evaluate(() => { window.__clicks = 0; const os = window.__os = Blob.prototype.slice; Blob.prototype.slice = function (a, b2, c) { if (a === -64) return { text: () => Promise.reject(new Error('cannot read')) }; return os.call(this, a, b2, c); }; });
      await p.evaluate(() => exportJSON()); await waitDone(p);
      const bad = await p.evaluate(() => ({ c: window.__clicks, s: document.getElementById('bxp-status').textContent }));
      r.check(bad.c === 0 && /^Backup failed/.test(bad.s) && /could not be read back/.test(bad.s) && !/Error:|at \w+/.test(bad.s), `154c${t} unreadable Blob: no download link clicked, a plain message`, JSON.stringify(bad));
      await p.evaluate(() => { Blob.prototype.slice = window.__os; });
    }

    /* 154d — an unfinished-job marker at start */
    if (w === 1440) {
      await p.evaluate(() => _enxJobOp('readwrite', (s) => s.put({ at: Date.now() - 120000, kind: 'json', name: 'x.json' }, 'job-backup')));
      const said = await p.evaluate(() => _bxpOrphan());
      const txt = await p.evaluate(() => document.getElementById('bxp-status').textContent + ' | ' + document.body.innerText);
      const left = await p.evaluate(() => _enxJobOp('readonly', (s) => s.get('job-backup')));
      const again = await p.evaluate(() => _bxpOrphan());
      r.check(/A backup started at .* did not finish\. The file it made is empty\. Delete it, and start ⬇ Export again\./.test(txt) && !left && !again, `154d${t} the one-time message is shown, then the marker is gone (and it is not said twice)`, JSON.stringify({ said, left, again }));
      const none = await p.evaluate(() => _enxJobOp('readonly', (s) => s.get('job-backup')));
      r.check(!none, `154d${t} a finished export leaves no marker`, '');
      /* Architect review: a download (no file was ever made) gets its own words */
      await p.evaluate(() => _enxJobOp('readwrite', (s) => s.put({ at: Date.now() - 60000, kind: 'json', name: 'y.json', via: 'download' }, 'job-backup')));
      await p.evaluate(() => _bxpOrphan());
      const dtxt = await p.evaluate(() => (document.getElementById('bxp-status') || {}).textContent + ' | ' + document.body.innerText);
      const dleft = await p.evaluate(() => _enxJobOp('readonly', (s) => s.get('job-backup')));
      r.check(/A backup started at .* did not finish, so no file was saved\. Start ⬇ Export again\./.test(dtxt) && !dleft, `154d${t} a download that did not finish: "no file was saved", then the marker is gone`, dtxt.slice(0, 200));
    }

    /* 154e — Notes only */
    const tx = await p.evaluate(async () => {
      const F = window.__fh; F.file = null;
      window.showSaveFilePicker = undefined; /* Blob path: capture the download */
      return null;
    });
    if (w === 1440) {
      await p.evaluate(() => { window.__fh.file = null; });
      const dl = p.waitForEvent('download');
      await p.evaluate(() => exportJSON('notes'));
      const path = await (await dl).path();
      const { readFile } = await import('node:fs/promises');
      const text = await readFile(path, 'utf8');
      const json = JSON.parse(text);
      const refs = (text.match(/data-pic=\\"[0-9a-f]{64}\\"/g) || []).length;
      r.check(!/data:image/.test(text) && refs === 4 && text.endsWith('}\n'), `154e${t} Notes only: no data: picture, all ${refs} data-pic references kept`, `refs ${refs}, data: ${/data:image/.test(text)}`);
      r.check(text.length < 3 * 1200000 * 1.2 + 200000, `154e${t} Notes only carries the notes, not the picture bytes (${text.length} chars)`, '');
      const s2 = await openApp({ viewport: { width: 1440, height: 900 }, db: seedDB(OLD) });
      try {
        await sleep(400);
        await seedPics(s2.page);   /* the device store holds the picture, as after a restore on the same phone */
        await s2.page.evaluate((j) => _showImportConsent(j, 'notes-only.json'), json);
        await s2.page.locator('button', { hasText: /^Merge$/ }).first().click();
        await sleep(2500);
        const norm = (arts) => JSON.stringify(arts.filter((a) => /^n\d$/.test(a.id)).map((a) => ({ id: a.id, title: a.title, content: a.content, folderIds: a.folderIds, tags: a.tags, kind: a.kind })).sort((x, y) => (x.id < y.id ? -1 : 1)));
        const got = await s2.page.evaluate(() => DB.articles);
        const want = await p.evaluate(() => DB.articles);
        r.check(norm(got) === norm(want) && got.filter((a) => /^n\d$/.test(a.id)).length === 4, `154e${t} ⬆ Import → Merge of a Notes-only file into a fresh profile gives the same notes`, `${got.length} notes`);
        await s2.page.evaluate(() => { selArt('n1'); });
        await sleep(800);
        const painted = await s2.page.evaluate(() => { const im = document.querySelector('#p3c img[data-pic], #ed img[data-pic]'); return !!(im && im.complete && im.naturalWidth > 0); });
        r.check(painted, `154e${t} the imported note's picture shows from the store`, '');
        r.check(s2.errors.length === 0, `154e${t} no page errors in the importing profile`, s2.errors.slice(0, 2).join(' | '));
      } finally { await s2.close(); }
    }

    /* 154h — Diagnostics line */
    await p.evaluate(() => { closeModal(); });
    const dg = await p.evaluate(async () => {
      await _picHoldCalc();
      const h = _picHold || {};
      return { m: h.m, n: h.n, k: h.k, txt: _picHoldText(), html: /Pictures on this device/.test(_syncDiagnosticsHTML()) };
    });
    r.check(dg.html && dg.m === 2 && dg.n + dg.k === dg.m && dg.n === 1 && /^1 of 2; not here: 1 \(reasons: /.test(dg.txt), `154h${t} Diagnostics says "Pictures on this device: N of M; not here: K (reasons…)" and N + K = M`, dg.txt);
    const dbAfter = await p.evaluate(() => JSON.stringify(DB));
    r.check(dbBefore === dbAfter, `154h${t} JSON.stringify(DB) is unchanged by all the exports`, '');
  } catch (e) { r.check(false, `154${t} threw`, String((e && e.stack) || e).slice(0, 700)); }
  const real = app.errors.filter((e) => !/backup failed/.test(e));   /* the failures this block causes on purpose are logged by the app (console.error) */
  r.check(real.length === 0, `154h${t} no page errors (the deliberate failures' own log lines aside)`, real.slice(0, 3).join(' | '));
  await app.close();
}
process.exit(r.finish() ? 1 : 0);
