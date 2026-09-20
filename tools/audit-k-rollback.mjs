/* audit-k-rollback — can the owner actually go back?

   The v04.36 report said a rollback is "self-correcting" because older builds
   "ignore `_salvage`". An independent review was right that this is an
   assertion, not evidence: an older build meets a notebook that a newer build
   repaired, merged and re-shaped, and the question is whether it can READ it —
   and then whether what it writes back is still readable by the new one.

   So this runs the REAL older builds, out of git, against a REAL notebook that
   v04.37 has repaired and merged. Nothing here is reasoned about.

   Run: node tools/audit-k-rollback.mjs */
import { execSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, cpSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT, openApp, matrix, seedDB, serve, playwright, BLOCKED } from './harness.mjs';

const m = matrix('audit K — rollback: an older build meeting a newer notebook');
const D = 'K rollback';

/* 1 — build the notebook v04.37 would leave behind: repaired, merged,
       carrying salvage, a recovery marker and everything else this round adds. */
const app = await openApp({ db: seedDB() });
const produced = await app.page.evaluate(() => {
  const remote = { sections: [], folders: [], trash: [], articles: 'CORRUPT-REMOTE-BYTES' };
  DB = mergeDB(DB, _repairDB(JSON.parse(JSON.stringify(remote)), 'remote').db);
  const imported = { sections: [], trash: [], articles: 'CORRUPT-IMPORTED-BYTES',
    folders: [{ id: 'imf', name: '(900) from a file', parentId: null, order: 9, sectionId: 'sec-1', updatedAt: new Date().toISOString() }] };
  DB = mergeDB(DB, _repairDB(imported, 'imported').db);
  DB.articles.push({ id: 'newnote', title: 'Written on v04.37', content: '<p>after the rollback this must still be here</p>',
    folderIds: ['f1'], tags: ['roll'], kind: 'general', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  DB._repairedAt = new Date().toISOString();
  persist();
  return { json: localStorage.getItem('my-notebook-v1'),
    notes: DB.articles.length, folders: DB.folders.length,
    salvage: Object.keys(DB._salvage || {}).length };
});
await app.close();
m.row(D, 'a notebook that v04.37 has repaired, merged and written can be produced for the test',
  produced.notes === 4 && produced.salvage === 2,
  `${produced.notes} notes, ${produced.folders} folders, ${produced.salvage} salvage entries, ${produced.json.length} bytes`);

/* 2 — run the OLDER BUILDS against it, out of git. */
const OLD = [
  { ref: 'ba6c70f', name: 'v04.34 (what is live today)' },
  { ref: 'b56e403', name: 'v04.35 (the previous candidate)' },
];
const pw = await playwright();
for (const old of OLD) {
  const dir = mkdtempSync(join(tmpdir(), 'siyagah-rollback-'));
  try {
    /* the old app, exactly as it was, plus the assets it loads */
    writeFileSync(join(dir, 'index.html'), execSync(`git show ${old.ref}:index.html`, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 }));
    writeFileSync(join(dir, 'sw.js'), execSync(`git show ${old.ref}:sw.js`, { cwd: ROOT, maxBuffer: 8 * 1024 * 1024 }));
    writeFileSync(join(dir, 'manifest.json'), execSync(`git show ${old.ref}:manifest.json`, { cwd: ROOT, maxBuffer: 4 * 1024 * 1024 }));
    mkdirSync(join(dir, 'icons'), { recursive: true });
    try { cpSync(join(ROOT, 'icons'), join(dir, 'icons'), { recursive: true }); } catch {}

    const srv = await serve(dir);
    const browser = await pw.chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    for (const pat of BLOCKED) await ctx.route(pat, (rt) => rt.abort());
    await ctx.addInitScript((j) => { try { localStorage.setItem('my-notebook-v1', j); } catch {} }, produced.json);
    const errs = [];
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errs.push(`pageerror: ${e}`));
    page.on('console', (c) => { if (c.type() === 'error' && !/net::ERR_FAILED/.test(c.text())) errs.push(`console: ${c.text()}`); });
    await page.goto(srv.base + '/', { waitUntil: 'domcontentloaded' });
    let booted = true;
    try { await page.waitForFunction(() => typeof window.render === 'function' && !!document.getElementById('tree'), { timeout: 10000 }); }
    catch { booted = false; }
    await page.waitForTimeout(600);

    const read = booted ? await page.evaluate(() => ({
      version: document.querySelector('meta[name="app-version"]')?.content,
      notes: DB.articles.length, folders: DB.folders.length,
      newNote: !!DB.articles.find((a) => a.id === 'newnote'),
      fromFile: !!DB.folders.find((f) => f.id === 'imf'),
      seed: ['a1', 'a2', 'a3'].every((i) => !!DB.articles.find((a) => a.id === i)),
      tree: (document.getElementById('tree')?.innerHTML || '').length,
    })) : { notes: -1 };

    m.row(D, `${old.name}: boots on a notebook v04.37 repaired and merged`,
      booted && read.tree > 0, booted ? `v${read.version}, tree ${read.tree}b` : 'DID NOT BOOT');
    m.row(D, `${old.name}: reads every note, including the one written after the upgrade (I1)`,
      read.notes === produced.notes && read.newNote && read.seed,
      `${read.notes} of ${produced.notes} notes, the v04.37 note present: ${read.newNote}`);
    m.row(D, `${old.name}: reads the folder that came in from an imported file`,
      read.fromFile, `folders: ${read.folders}`);
    m.row(D, `${old.name}: boots silently on it`, errs.length === 0, errs.slice(0, 2).join('\n') || 'silent');

    /* 3 — and what the OLD build writes back must still be readable by the
           NEW one, with nothing of the owner's lost in the round trip. That
           is the half a "self-correcting" claim never even states. */
    const wroteBack = booted ? await page.evaluate(() => {
      const a = DB.articles.find((x) => x.id === 'newnote');
      if (a) { a.content = '<p>edited on the OLD build after a rollback</p>'; a.updatedAt = new Date().toISOString(); }
      DB.articles.push({ id: 'oldnote', title: 'Written on the old build', content: '<p>made after rolling back</p>',
        folderIds: ['f1'], tags: [], kind: 'general', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      persist();
      return localStorage.getItem('my-notebook-v1');
    }) : null;
    await browser.close(); await srv.close();

    if (wroteBack) {
      const back = await openApp({ db: null, rawDB: wroteBack });
      const s = await back.page.evaluate(() => ({
        notes: DB.articles.length,
        oldNote: !!DB.articles.find((a) => a.id === 'oldnote'),
        edited: (DB.articles.find((a) => a.id === 'newnote') || {}).content || '',
        salvage: Object.keys(DB._salvage || {}).length,
        salvageValues: Object.values(DB._salvage || {}).map((e) => (e && e.value) || null).filter(Boolean),
        seed: ['a1', 'a2', 'a3'].every((i) => !!DB.articles.find((a) => a.id === i)),
      }));
      const clean = back.errors.filter((e) => e.startsWith('pageerror:'));
      m.row(D, `${old.name} → v04.37: the note written on the OLD build comes back (I1)`,
        s.oldNote && s.notes === 5, `${s.notes} notes, the old build's note present: ${s.oldNote}`);
      m.row(D, `${old.name} → v04.37: an edit made on the OLD build survives the round trip (I1)`,
        /edited on the OLD build/.test(s.edited), JSON.stringify(s.edited.slice(0, 60)));
      m.row(D, `${old.name} → v04.37: the salvaged malformed bytes are still there after the round trip`,
        s.salvage === 2 && s.salvageValues.length === 2,
        `${s.salvage} entries: ${JSON.stringify(s.salvageValues)}`);
      m.row(D, `${old.name} → v04.37: the round trip is silent`, clean.length === 0, clean.slice(0, 2).join('\n') || 'silent');
      await back.close();
    }
  } finally { try { rmSync(dir, { recursive: true, force: true }); } catch {} }
}

/* 4 — the service worker's part of a rollback: the cache NAME must differ,
       or a device keeps serving the build being rolled back FROM. */
{
  const cur = execSync('grep -o "const VERSION = .[^\']*." sw.js', { cwd: ROOT, encoding: 'utf8' }).trim();
  const names = OLD.map((o) => ({ o, v: execSync(`git show ${o.ref}:sw.js | grep -o "const VERSION = .[^']*."`, { cwd: ROOT, encoding: 'utf8', shell: '/bin/bash' }).trim() }));
  const distinct = new Set([cur, ...names.map((n) => n.v)]).size === names.length + 1;
  m.row(D, 'every build in the rollback path has a DIFFERENT service-worker cache name (I3)',
    distinct, [cur, ...names.map((n) => `${n.o.name}: ${n.v}`)].join(' · '));
}

writeFileSync(join(ROOT, 'audit', 'inventory', 'matrix-k.json'), JSON.stringify(m.rows, null, 1));
process.exit(m.finish() ? 1 : 0);
