/* tools/perf-enx/r4-wipe.mjs — J08 R4 review (29 Oct 2026): does a SIGKILL during big IndexedDB writes make Chromium wipe the origin? node r4-wipe.mjs many|one|multi [kills]. Measured: 0 wipes in 24/24/29 kills (the app-check 52d wipes under load were NOT reproduced by a bare page). */
/* Does a SIGKILL during IndexedDB writes make Chromium wipe the origin's databases? mode many = 64 values of ~1.5 MB in separate
   transactions, over and over; mode one = one ~96 MB value per transaction, over and over. A sentinel DB written once tells a wipe. */
import { playwright } from '/home/user/siyagah.github.io/tools/harness.mjs';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const MODE = process.argv[2] || 'many', N = +(process.argv[3] || 25);
const srv = createServer((q, s) => { s.writeHeader ? 0 : 0; s.writeHead(200, { 'content-type': 'text/html' }); s.end('<!doctype html><title>w</title>'); });
await new Promise((r) => srv.listen(18799, '127.0.0.1', r));
const pw = await playwright();
const dir = mkdtempSync('/tmp/claude-0/wipe-');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const alive = () => { try { execFileSync('pgrep', ['-f', '--', 'user-data-dir=' + dir], { stdio: 'pipe' }); return true; } catch (e) { return false; } };
const kill = async () => { for (let i = 0; i < 300 && alive(); i++) { try { execFileSync('pkill', ['-9', '-f', '--', 'user-data-dir=' + dir]); } catch (e) {} await sleep(50); } };
let wipes = 0, ok = 0;
for (let t = 0; t < N; t++) {
  const ctx = await pw.chromium.launchPersistentContext(dir, {});
  const page = ctx.pages()[0] || await ctx.newPage();
  await page.goto('http://127.0.0.1:18799/');
  const st = await page.evaluate(async () => {
    const open = (n, mk) => new Promise((res) => { const q = indexedDB.open(n, 1); q.onupgradeneeded = () => { q.result.createObjectStore('kv'); window.__created = (window.__created || []).concat(n); }; q.onsuccess = () => res(q.result); });
    const s = await open('sentinel'); const v = await new Promise((res) => { const q = s.transaction('kv').objectStore('kv').get('x'); q.onsuccess = () => res(q.result); });
    if (!v) await new Promise((res) => { const tx = s.transaction('kv', 'readwrite'); tx.objectStore('kv').put({ at: Date.now() }, 'x'); tx.oncomplete = res; });
    return { had: !!v, created: window.__created || [] };
  });
  if (t > 0) { if (st.had) ok++; else wipes++; }
  /* start writing, kill at a random moment */
  page.evaluate(async (MODE) => {
    const db = await new Promise((res) => { const q = indexedDB.open('data', 1); q.onupgradeneeded = () => q.result.createObjectStore('kv'); q.onsuccess = () => res(q.result); });
    const rec = (i) => ({ id: 'n' + i, title: 'T' + i, content: '<p>' + ('w' + i).repeat(1000) + '</p>' });
    for (;;) {
      if (MODE === 'many') for (let p = 0; p < 64; p++) { const arr = []; for (let i = 0; i < 300; i++) arr.push(rec(p * 300 + i)); await new Promise((res) => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put({ ps: Date.now(), r: arr }, 'P:' + p); tx.oncomplete = res; tx.onerror = res; }); }
      else if (MODE === 'multi') { for (let g = 0; g < 8; g++) await new Promise((res) => { const tx = db.transaction('kv', 'readwrite'); const st = tx.objectStore('kv'); for (let p = 0; p < 8; p++) { const arr = []; for (let i = 0; i < 300; i++) arr.push(rec(p * 300 + i)); st.put({ ps: Date.now(), r: arr }, 'P:' + (g * 8 + p)); } tx.oncomplete = res; tx.onerror = res; });
        await new Promise((res) => { const tx = db.transaction('kv', 'readwrite'); const st = tx.objectStore('kv'); st.put({ s: Date.now(), j: 'x'.repeat(1000) }, 'r:a'); const c = st.openCursor(IDBKeyRange.lowerBound('a')); c.onsuccess = () => { const x = c.result; if (!x) return; if (x.key !== 'm') x.delete(); x.continue(); }; st.put({ seq: Date.now() }, 'Pm'); tx.oncomplete = res; tx.onerror = res; }); }
      else { const arr = []; for (let i = 0; i < 19200; i++) arr.push(rec(i)); await new Promise((res) => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put({ articles: arr }, 'notebook'); tx.oncomplete = res; tx.onerror = res; }); }
    }
  }, MODE).catch(() => {});
  await sleep(500 + Math.random() * 4000);
  await kill();
  process.stdout.write(st.had || t === 0 ? '.' : 'W');
}
console.log(`\n${MODE}: ${N - 1} reopens after a kill: sentinel kept ${ok}, WIPED ${wipes}`);
await kill(); rmSync(dir, { recursive: true, force: true }); srv.close();
