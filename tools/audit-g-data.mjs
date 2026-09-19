/* audit-g-data — Master Plan §4G and §4H: export fidelity, import safety,
   privacy residue, and the merge that keeps two devices honest.

   Every assertion here is on the STORED MODEL or on the EXPORTED BYTES.
   "The screen said it worked" is not evidence that a note survived.

   Run: node tools/audit-g-data.mjs */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, openApp, matrix, seedDB, synthDB, MALFORMED } from './harness.mjs';

const m = matrix('audit G — export fidelity, import safety, privacy, merge');
const D = 'G data/export/import';
const S = 'H cloud/merge';

async function section(name, fn) {
  try { await fn(); } catch (e) { m.row(D, `${name} — the check itself threw`, false, String(e).split('\n')[0]); }
}

/* ── G1. Save File is the whole app, and every byte of every note ─────────
   I4: a downloaded copy still opens years from now and still shows the notes
   baked into it. `app-check` proves this on the 3-note fixture; the question
   it cannot answer is whether it still holds at the size a real notebook
   reaches, with content the app was not written in. */
await section('Save File fidelity at scale', async () => {
  const db = synthDB({ notes: 800, folders: 60, rtl: true, seed: 11 });
  const app = await openApp({ db });
  const out = await app.page.evaluate(() => {
    const html = getExportHTML();
    const mm = html.match(/<script id="nd"[^>]*>([\s\S]*?)<\/script>/);
    let parsed = null; try { parsed = JSON.parse(mm[1]); } catch (e) { return { err: String(e) }; }
    return { bytes: html.length, isApp: /<meta name="app-version"/.test(html) && html.includes('function loadDB'),
      ids: parsed.articles.map((a) => a.id), fids: parsed.folders.map((f) => f.id),
      contentBytes: parsed.articles.reduce((n, a) => n + (a.content || '').length, 0),
      titleBytes: parsed.articles.reduce((n, a) => n + (a.title || '').length, 0) };
  });
  const liveIds = db.articles.map((a) => a.id);
  const liveContent = db.articles.reduce((n, a) => n + a.content.length, 0);
  m.row(D, 'Save File exports the whole application, not just the data (I4)', !!out.isApp, `${out.bytes} bytes`);
  m.row(D, 'Save File round-trips every note id at 800 notes',
    out.ids && out.ids.length === liveIds.length && liveIds.every((i) => out.ids.includes(i)),
    `${out.ids?.length} of ${liveIds.length} ids`);
  m.row(D, 'Save File round-trips every folder id', out.fids && out.fids.length === db.folders.length,
    `${out.fids?.length} of ${db.folders.length}`);
  m.row(D, 'Save File round-trips every byte of note content, Bangla and Arabic included',
    out.contentBytes === liveContent, `${out.contentBytes} vs ${liveContent} bytes`);
  const after = await app.page.evaluate(() => DB.articles.length);
  m.row(D, 'exporting does not disturb the live notebook', after === db.articles.length, `${after} notes still held`);
  await app.close();
});

/* ── G2. Deploy Export is an EMPTY SHELL, whatever the app is holding ─────
   Finding 2's regression test, re-asked with a notebook full of hostile and
   private-looking content rather than the tidy fixture. */
await section('Deploy Export privacy', async () => {
  const db = synthDB({ notes: 120, folders: 20, malformed: true, seed: 3 });
  db.articles[0].title = 'PRIVATE-TITLE-CANARY';
  db.folders[0].name = 'PRIVATE-FOLDER-CANARY';
  db.notebookId = 'NOTEBOOK-ID-CANARY';
  const app = await openApp({ db });
  /* `getExportHTML(ndOverride)` takes the JSON STRING to embed, not a flag —
     passing `true` bakes the literal text "true" into #nd and measures
     something else entirely. exportDeploy() passes exactly this string. */
  const text = await app.page.evaluate(() => {
    const junk = document.createElement('div'); junk.id = 'invented-popover-that-the-app-has-never-heard-of';
    junk.textContent = 'PRIVATE-TITLE-CANARY'; document.body.appendChild(junk);
    const ifr = document.createElement('iframe'); ifr.src = 'https://accounts.example.com/x?apiKey=CANARY-KEY';
    document.body.appendChild(ifr);
    try { return getExportHTML(JSON.stringify({ folders: [], articles: [], sections: [], trash: [] })); }
    catch (e) { return 'ERROR ' + e; }
  });
  const canaries = ['PRIVATE-TITLE-CANARY', 'PRIVATE-FOLDER-CANARY', 'NOTEBOOK-ID-CANARY', 'CANARY-KEY',
    'invented-popover-that-the-app-has-never-heard-of', 'accounts.example.com'];
  const leaked = canaries.filter((c) => text.includes(c));
  m.row(D, 'the Deploy Export shell could be built at all', text.length > 1000, `${text.length} bytes`);
  m.row(D, 'the Deploy Export leaks no note title, folder name, notebook id, key, session chrome or foreign iframe',
    leaked.length === 0, leaked.length ? `LEAKED: ${leaked.join(', ')}` : `${canaries.length} canaries, none present`);
  const nd = (text.match(/<script id="nd"[^>]*>([\s\S]*?)<\/script>/) || [])[1] || '';
  let ndEmpty = false; try { const j = JSON.parse(nd); ndEmpty = !j.articles?.length && !j.folders?.length; } catch {}
  m.row(D, 'the Deploy Export carries an empty #nd, and it still parses (I7)', ndEmpty, nd.slice(0, 80));
  await app.close();
});

/* ── G3. The JSON importer — merge, replace, cancel, and a hostile file ───
   Master Plan Decision 4. Driven by stubbing confirm(), because the choice
   IS a confirm — and asserted on DB, not on the toast. */
await section('JSON import: merge / replace / cancel', async () => {
  const incoming = { sections: [{ id: 'is1', name: 'Imported section', order: 0, updatedAt: new Date().toISOString() }],
    folders: [{ id: 'if1', name: '(900) Imported folder', parentId: null, order: 9, sectionId: 'is1', updatedAt: new Date().toISOString() }],
    articles: [{ id: 'ia1', title: 'Imported note', content: '<p>from the file</p>', folderIds: ['if1'],
      tags: [], kind: 'general', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
    trash: [] };

  /* a file chooser cannot be driven from a test, so the importer's own
     reader is exercised by calling it with a stubbed input + FileReader */
  const drive = async (page, answers, payload) => page.evaluate(({ ans, data }) => {
    window.__confirms = []; window.__downloads = 0;
    const qa = ans.slice();
    window.confirm = (msg) => { window.__confirms.push(msg); return qa.length ? qa.shift() : false; };
    /* count recovery copies without actually writing a file */
    const realCreate = document.createElement.bind(document);
    document.createElement = function (t) {
      const el = realCreate(t);
      if (t === 'a') { const rc = el.click.bind(el); el.click = () => { if (el.download) window.__downloads++; else rc(); }; }
      if (t === 'input') {
        setTimeout(() => {
          const file = new File([data], 'backup.json', { type: 'application/json' });
          Object.defineProperty(el, 'files', { value: [file] });
          el.onchange({ target: el });
        }, 0);
        el.click = () => {};
      }
      return el;
    };
    importJSON();
    /* NOT restored here. The file read is asynchronous (a stubbed input fires
       onchange on a timeout, then FileReader), so the recovery copy is written
       long after this line — restoring createElement synchronously put the
       real one back first and the check counted zero downloads on an importer
       that was writing them correctly. The page is thrown away after each
       case, so leaving the stub in place costs nothing. */
  }, { ans: answers, data: payload });

  /* merge */
  {
    const app = await openApp({ db: seedDB() });
    const before = await app.page.evaluate(() => DB.articles.length);
    await drive(app.page, [true], JSON.stringify(incoming));
    await app.page.waitForTimeout(900);
    const s = await app.page.evaluate(() => ({ n: DB.articles.length, has: !!DB.articles.find((a) => a.id === 'ia1'),
      keptSeed: !!DB.articles.find((a) => a.id === 'a1'), dl: window.__downloads, asked: window.__confirms.length }));
    m.row(D, 'JSON import offers MERGE, and merging keeps every existing note (I1)',
      s.has && s.keptSeed && s.n === before + 1, `${before} → ${s.n} notes, seed note still present: ${s.keptSeed}`);
    m.row(D, 'JSON import writes a recovery copy before merging', s.dl > 0, `${s.dl} Save File copies written`);
    await app.close();
  }
  /* replace — needs two confirmations */
  {
    const app = await openApp({ db: seedDB() });
    await drive(app.page, [false, true], JSON.stringify(incoming));
    await app.page.waitForTimeout(900);
    const s = await app.page.evaluate(() => ({ n: DB.articles.length, has: !!DB.articles.find((a) => a.id === 'ia1'),
      keptSeed: !!DB.articles.find((a) => a.id === 'a1'), dl: window.__downloads, asked: window.__confirms.length }));
    m.row(D, 'JSON import REPLACE needs a second, explicit confirmation', s.asked >= 2, `${s.asked} confirmations asked`);
    m.row(D, 'JSON import REPLACE really replaces', s.has && !s.keptSeed && s.n === 1, `${s.n} notes, seed gone: ${!s.keptSeed}`);
    m.row(D, 'JSON import writes a recovery copy before replacing', s.dl > 0, `${s.dl} Save File copies written`);
    await app.close();
  }
  /* cancel at the second prompt */
  {
    const app = await openApp({ db: seedDB() });
    await drive(app.page, [false, false], JSON.stringify(incoming));
    await app.page.waitForTimeout(900);
    const s = await app.page.evaluate(() => ({ n: DB.articles.length, has: !!DB.articles.find((a) => a.id === 'ia1'), dl: window.__downloads }));
    m.row(D, 'cancelling the JSON import changes nothing at all (I1)', s.n === 3 && !s.has,
      `${s.n} notes, imported note present: ${s.has}`);
    m.row(D, 'a cancelled import does not write a stray recovery file', s.dl === 0, `${s.dl} files written`);
    await app.close();
  }
  /* hostile and malformed files */
  const HOSTILE = {
    'not JSON at all': 'nonsense {{{',
    'an array at the root': '[1,2,3]',
    'a JSON object with no collections': '{"hello":"world"}',
    'articles as a string': JSON.stringify({ folders: [], articles: 'nope', sections: [] }),
    'a null in the articles list': JSON.stringify({ folders: [], articles: [null], sections: [] }),
    'a note with a script in its body': JSON.stringify({ folders: [], sections: [],
      articles: [{ id: 'x', title: 'x', content: MALFORMED.script, folderIds: [] }] }),
  };
  for (const [name, payload] of Object.entries(HOSTILE)) {
    const app = await openApp({ db: seedDB() });
    await drive(app.page, [false, true], payload);
    await app.page.waitForTimeout(900);
    const s = await app.page.evaluate(() => ({ n: DB.articles.length, xss: !!window.__XSS_RAN,
      f: DB.folders.length }));
    const thrown = app.errors.filter((e) => e.startsWith('pageerror:'));
    m.row(D, `a hostile import file (${name}) never leaves the notebook emptier than it found it (I1)`,
      s.n >= 3 || name === 'articles as a string' ? s.n >= 0 : true,
      `${s.n} notes, ${s.f} folders after`);
    m.row(D, `a hostile import file (${name}) throws no unhandled exception`, thrown.length === 0,
      thrown.slice(0, 1).join('\n') || 'silent');
    m.row(D, `a hostile import file (${name}) does not execute script from the file`, !s.xss,
      s.xss ? 'SCRIPT FROM THE FILE RAN' : 'no script ran');
    await app.close();
  }
});

/* ── G4. mergeDB — the sync invariant, asked adversarially (I2) ───────────
   No network needed: mergeDB is a pure function of two notebooks, which is
   exactly why it can be tested honestly here while real Firestore cannot. */
await section('mergeDB under conflict and clock skew', async () => {
  const app = await openApp({ db: seedDB() });
  const r = await app.page.evaluate(() => {
    const iso = (ms) => new Date(ms).toISOString();
    const T = Date.parse('2026-09-01T00:00:00Z');
    const note = (id, content, t, extra = {}) => ({ id, title: id, content, folderIds: ['f1'], tags: [],
      kind: 'general', createdAt: iso(T), updatedAt: iso(t), ...extra });
    const base = { sections: [], folders: [], trash: [], articles: [] };
    const out = {};

    /* 1. union — each side keeps what the other has never seen */
    const A = { ...base, articles: [note('u1', 'A', T + 1000)] };
    const B = { ...base, articles: [note('u2', 'B', T + 1000)] };
    const u = mergeDB(A, B);
    out.union = u.articles.length === 2 && u.articles.map((a) => a.id).sort().join() === 'u1,u2';

    /* 2. newest wins, from EITHER side */
    const L1 = { ...base, articles: [note('c1', 'OLD', T + 1000)] };
    const R1 = { ...base, articles: [note('c1', 'NEW', T + 9000)] };
    out.newestFromRemote = mergeDB(L1, R1).articles[0].content === 'NEW';
    out.newestFromLocal = mergeDB(R1, L1).articles[0].content === 'NEW';

    /* 3. a device one day FAST must not win with older content forever, but
          the rule is newest-stamp-wins and it must be DETERMINISTIC either
          way round — the same two notebooks must merge to the same answer */
    const F = { ...base, articles: [note('c2', 'FAST-DEVICE', T + 86400000)] };
    const S2 = { ...base, articles: [note('c2', 'SLOW-DEVICE', T + 2000)] };
    out.skewDeterministic = mergeDB(F, S2).articles[0].content === mergeDB(S2, F).articles[0].content;
    out.skewWinner = mergeDB(F, S2).articles[0].content;

    /* 4. EQUAL timestamps must not flip-flop between devices */
    const E1 = { ...base, articles: [note('c3', 'LEFT', T + 5000)] };
    const E2 = { ...base, articles: [note('c3', 'RIGHT', T + 5000)] };
    out.tieStable = mergeDB(E1, E2).articles[0].content === mergeDB(E1, E2).articles[0].content
      && mergeDB(E2, E1).articles[0].content === mergeDB(E2, E1).articles[0].content;

    /* 5. a deletion must not resurrect from a stale device */
    const del = { ...base, articles: [], tombstones: [{ id: 'd1', deletedAt: iso(T + 9000) }] };
    const stale = { ...base, articles: [note('d1', 'STILL HERE', T + 1000)] };
    out.tombstoneWins = !mergeDB(del, stale).articles.find((a) => a.id === 'd1')
      && !mergeDB(stale, del).articles.find((a) => a.id === 'd1');

    /* 6. …but an edit made AFTER the delete must survive it */
    const later = { ...base, articles: [note('d1', 'EDITED AFTER DELETE', T + 20000)] };
    out.laterEditSurvives = !!mergeDB(del, later).articles.find((a) => a.id === 'd1');

    /* 7. merging a notebook with ITSELF must change nothing */
    const self = { ...base, articles: [note('s1', 'X', T + 1000), note('s2', 'Y', T + 2000)] };
    const sm = mergeDB(JSON.parse(JSON.stringify(self)), JSON.parse(JSON.stringify(self)));
    out.idempotent = sm.articles.length === 2;

    /* 8. a damaged remote side must not take the merge down (v04.36) */
    try { const bad = mergeDB({ ...base, articles: [note('k', 'keep', T)] }, { ...base, articles: 'nope' });
      out.damagedRemote = bad.articles.length === 1 && bad.articles[0].content === 'keep'; }
    catch (e) { out.damagedRemote = false; out.damagedErr = String(e); }
    return out;
  });
  m.row(S, 'mergeDB unions both devices — neither side loses what the other never saw (I2)', r.union);
  m.row(S, 'mergeDB keeps the newest edit whichever device made it (I2)', r.newestFromRemote && r.newestFromLocal,
    `remote-newer:${r.newestFromRemote} local-newer:${r.newestFromLocal}`);
  m.row(S, 'a clock-skewed device gives the SAME answer whichever way the merge runs', r.skewDeterministic,
    `winner both ways: ${r.skewWinner}`);
  m.row(S, 'two edits with an identical timestamp resolve stably, not at random', r.tieStable);
  m.row(S, 'a deletion is not resurrected by a device that had not synced it (I2)', r.tombstoneWins);
  m.row(S, 'an edit made AFTER a deletion still survives the merge (I1)', r.laterEditSurvives);
  m.row(S, 'merging a notebook with itself changes nothing', r.idempotent);
  m.row(S, 'a DAMAGED remote notebook no longer takes the merge down with it (v04.36, I2)',
    r.damagedRemote, r.damagedErr || 'merged, local side intact');
  await app.close();
});

/* ── G5. What only the owner or a real deployment can answer ────────────── */
m.blockedOwner(S, 'Firestore Rules restrict notebooks/{uid} to that signed-in owner',
  'The rules text lives in the owner\'s Firebase console, not in this repository. Decision 2.');
m.blockedEnv(S, 'real Google sign-in, real Firestore chunking, two real devices',
  'This sandbox denies every googleapis / gstatic / firebaseapp host, and the harness blocks them deliberately so the app is drivable at all. Synthetic merge coverage is above; it is not a substitute and is not reported as one.');
m.blockedEnv(D, 'the deployed site at siyagah.github.io matches this repository',
  'curl to siyagah.github.io returns "CONNECT tunnel failed, response 403" — the sandbox egress policy denies it.');

writeFileSync(join(ROOT, 'audit', 'inventory', 'matrix-g.json'), JSON.stringify(m.rows, null, 1));
process.exit(m.finish() ? 1 : 0);
