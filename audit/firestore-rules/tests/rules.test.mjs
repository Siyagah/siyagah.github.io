/* ═══════════════════════════════════════════════════════════════════════════
   Siyagah — Firestore rules proof.

   Runs against the real Firestore emulator, under each of three rulesets:
     firestore.current.rules   what is live today (the vulnerability)
     firestore.rules           the proposal
     firestore.strict.rules    the over-validated variant, kept as evidence

   The sync tests are not mock-ups: _writeCloudDB / _readCloudDB below are
   transcribed from index.html (v04.38 candidate f891b52, lines 20716-20758)
   so that what the emulator sees is what the application sends, batch shape
   included.

   Run:  npm test          (from audit/firestore-rules/)
   ═══════════════════════════════════════════════════════════════════════════ */

import {
  initializeTestEnvironment, assertSucceeds, assertFails,
} from '@firebase/rules-unit-testing';
import {
  doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  writeBatch, onSnapshot, setLogLevel,
} from 'firebase/firestore';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

setLogLevel('silent');   /* the SDK logs every expected denial at error level */
let currentTest = '(none)';
process.on('unhandledRejection', (e) => {
  console.error('UNHANDLED REJECTION during/after test:', currentTest);
  console.error('  ', e && (e.stack || e.message || e));
  process.exit(9);
});

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

/* The fixture stands in for the value that replaces OWNER_UID before
   publishing. A real Firebase UID is 28 characters; so is this. */
const OWNER_UID   = 'ownerUid00000000000000000000';
const STRANGER    = 'strangerUid000000000000000000';
/* A SYNTHETIC notebook id, in the exact shape generateNotebookId() produces
   ('nb-' + base36 ms + '-' + 6 random base36 chars). The owner's real id is
   deliberately NOT reproduced here: under the rule that is live today it is
   the only thing between a signed-in stranger and the notebook, and this is a
   public repository. The shape is what the rules must accommodate; the value
   is not. It is deliberately NOT a UID — that is the whole reason for § 3. */
const NB          = 'nb-mtest000-fixt01';
const NB_AS_UID   = OWNER_UID;   /* the alternative doc id, if ever adopted */

/* ── reporting ──────────────────────────────────────────────────────────── */
const log = [];
let pass = 0, fail = 0, section = '', detail = null;
const S = (t) => { section = t; log.push(''); log.push(`── ${t} ${'─'.repeat(Math.max(0, 68 - t.length))}`); };
async function t(name, fn) {
  currentTest = `[${section}] ${name}`;
  detail = null;
  process.stderr.write(`>> ${currentTest}\n`);
  try { await fn(); pass++; log.push(`  PASS  ${name}`); }
  catch (e) { fail++; log.push(`  FAIL  ${name}`); log.push(`        ${String(e.message || e).split('\n')[0]}`); }
  if (detail) log.push(`        └ ${detail}`);
}

/* ── the application's own chunked read/write, transcribed ───────────────── */
const SYNC_CHUNK = 900000;
const b64enc = (s) => Buffer.from(s, 'utf8').toString('base64');
const b64dec = (s) => Buffer.from(s, 'base64').toString('utf8');

/* index.html:20750 — _writeCloudDB(). Two batches: the payload, then the
   unconditional delete of the tail chunks n … n+9. */
async function writeCloudDB(db, nbId, now, b64) {
  const nb = doc(db, 'notebooks', nbId);
  const n = Math.ceil(b64.length / SYNC_CHUNK);
  const batch = writeBatch(db);
  for (let i = 0; i < n; i++) {
    batch.set(doc(db, 'notebooks', nbId, 'chunks', String(i)),
      { p: b64.slice(i * SYNC_CHUNK, (i + 1) * SYNC_CHUNK), ver: now });
  }
  batch.set(nb, { n, ver: now, deviceUpdatedAt: now, updatedAt: new Date() });
  await batch.commit();

  const b2 = writeBatch(db);
  for (let i = n; i < n + 10; i++) b2.delete(doc(db, 'notebooks', nbId, 'chunks', String(i)));
  await b2.commit();          /* the app swallows this; the test does not */
  return n;
}

/* index.html:20716 — _readCloudDB(). */
async function readCloudDB(db, nbId, md) {
  if (!md) return null;
  if (md.n == null && md.db) { try { return JSON.parse(md.db); } catch { return null; } }   /* index.html:20718 */
  const n = md.n; if (!n) return null;
  const ver = md.ver;
  const snaps = await Promise.all(Array.from({ length: n }, (_, i) =>
    getDoc(doc(db, 'notebooks', nbId, 'chunks', String(i)))));
  const parts = [];
  for (const c of snaps) {
    if (!c.exists()) return null;
    const cd = c.data();
    if (!cd || (ver != null && cd.ver != null && cd.ver !== ver)) return null;
    parts.push(cd.p || '');
  }
  try { return JSON.parse(b64dec(parts.join(''))); } catch { return null; }
}

/* A notebook of roughly `kb` kilobytes, in the app's real DB shape. */
function makeDB(kb, marker) {
  const filler = 'x'.repeat(900);
  const articles = [];
  for (let i = 0; i < Math.ceil((kb * 1024) / 1000); i++) {
    articles.push({ id: 'a' + i, title: 'Note ' + i, content: filler, updatedAt: '2026-09-19T00:00:00.000Z' });
  }
  articles.push({ id: 'marker', title: marker, content: marker, updatedAt: '2026-09-19T12:00:00.000Z' });
  return { folders: [{ id: 'f1', name: 'Folder' }], articles, sections: [], trash: [] };
}

/* ── the run ────────────────────────────────────────────────────────────── */
/* The rules files ship with a single documented placeholder. Publishing
   replaces it with the owner's real Firebase UID; the tests replace it with
   the fixture, so what the emulator evaluates is the file as written — not a
   separate copy that could drift from it. If the placeholder is ever missing
   (someone pasted a real UID in, or renamed it), every suite must stop. */
async function rulesFor(rulesFile) {
  const src = await readFile(join(ROOT, rulesFile), 'utf8');
  if (rulesFile !== 'firestore.current.rules' && !src.includes("'OWNER_UID'"))
    throw new Error(`${rulesFile} no longer contains the 'OWNER_UID' placeholder — refusing to test a ruleset that is not the one on disk`);
  return src.split("'OWNER_UID'").join(`'${OWNER_UID}'`);
}

async function run(rulesFile) {
  const env = await initializeTestEnvironment({
    projectId: 'siyagah-rules-audit',
    firestore: { rules: await rulesFor(rulesFile), host: '127.0.0.1', port: 8080 },
  });
  await env.clearFirestore();
  const owner    = env.authenticatedContext(OWNER_UID,  { email: 'owner@example.com',    firebase: { sign_in_provider: 'google.com' } }).firestore();
  const stranger = env.authenticatedContext(STRANGER,   { email: 'stranger@example.com', firebase: { sign_in_provider: 'google.com' } }).firestore();
  const anon     = env.unauthenticatedContext().firestore();
  return { env, owner, stranger, anon };
}

/* Seed a realistic notebook bypassing the rules, so read tests have data. */
async function seed(env, nbId, chunks = 1, ver = 1700000000000) {
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    const b = writeBatch(db);
    for (let i = 0; i < chunks; i++) b.set(doc(db, 'notebooks', nbId, 'chunks', String(i)), { p: b64enc('{}').slice(0, 4), ver });
    b.set(doc(db, 'notebooks', nbId), { n: chunks, ver, deviceUpdatedAt: ver, updatedAt: new Date() });
    await b.commit();
  });
}

/* ═══ 1 ═══ what the LIVE rule permits ═══════════════════════════════════ */
async function suiteCurrent() {
  const { env, owner, stranger, anon } = await run('firestore.current.rules');
  S('1. The rule that is LIVE today — demonstrating the exposure');

  await seed(env, NB);

  await t('LIVE: a stranger (any signed-in Google account) READS the whole notebook',
    () => assertSucceeds(getDoc(doc(stranger, 'notebooks', NB))));
  await t('LIVE: a stranger READS the note payload chunks',
    () => assertSucceeds(getDoc(doc(stranger, 'notebooks', NB, 'chunks', '0'))));
  await t('LIVE: a stranger OVERWRITES the notebook',
    () => assertSucceeds(setDoc(doc(stranger, 'notebooks', NB), { n: 1, ver: 9, deviceUpdatedAt: 9 })));
  await t('LIVE: a stranger DELETES the notebook document',
    () => assertSucceeds(deleteDoc(doc(stranger, 'notebooks', NB))));
  await t('LIVE: a stranger ENUMERATES every notebook in the project',
    () => assertSucceeds(getDocs(collection(stranger, 'notebooks'))));
  await t('LIVE: a stranger writes anywhere else in the database',
    () => assertSucceeds(setDoc(doc(stranger, 'anything', 'at-all'), { x: 1 })));
  await t('LIVE: signed-out access is refused (the one thing it does do)',
    () => assertFails(getDoc(doc(anon, 'notebooks', NB))));
  await t('LIVE: the owner can reach their own notebook',
    () => assertSucceeds(getDoc(doc(owner, 'notebooks', NB))));

  await env.cleanup();
}

/* ═══ 2 ═══ the PROPOSAL ═════════════════════════════════════════════════ */
async function suiteProposed() {
  const { env, owner, stranger, anon } = await run('firestore.rules');

  /* ── 2a. the owner ──────────────────────────────────────────────────── */
  S('2a. THE OWNER — every operation the two builds actually perform');
  await seed(env, NB);

  await t('owner: get notebook  (initSync onSnapshot / syncNow / _reconcileNow)',
    () => assertSucceeds(getDoc(doc(owner, 'notebooks', NB))));
  await t('owner: get a payload chunk  (_readCloudDB)',
    () => assertSucceeds(getDoc(doc(owner, 'notebooks', NB, 'chunks', '0'))));
  await t('owner: update the notebook  (_writeCloudDB, every push)',
    () => assertSucceeds(setDoc(doc(owner, 'notebooks', NB), { n: 1, ver: 2, deviceUpdatedAt: 2, updatedAt: new Date() })));
  await t('owner: write a payload chunk',
    () => assertSucceeds(setDoc(doc(owner, 'notebooks', NB, 'chunks', '0'), { p: 'abc', ver: 2 })));
  await t('owner: delete an EXISTING tail chunk',
    () => assertSucceeds(deleteDoc(doc(owner, 'notebooks', NB, 'chunks', '0'))));
  await t('owner: delete a NON-EXISTENT tail chunk  (§ tail delete — batch 2)',
    () => assertSucceeds(deleteDoc(doc(owner, 'notebooks', NB, 'chunks', '7'))));
  await t('owner: create a notebook from scratch  (first push, fresh project)',
    () => assertSucceeds(setDoc(doc(owner, 'notebooks', 'nb-brand-new'), { n: 1, ver: 1, deviceUpdatedAt: 1, updatedAt: new Date() })));
  await t('owner: real-time listener attaches and delivers  (onSnapshot)',
    () => new Promise((res, rej) => {
      const un = onSnapshot(doc(owner, 'notebooks', NB),
        (s) => { un(); s.exists() ? res() : rej(new Error('snapshot empty')); },
        (e) => { un(); rej(e); });
      setTimeout(() => { un(); rej(new Error('listener timed out')); }, 8000);
    }));
  await t('owner: a notebook id that IS their uid also works  (future doc-id scheme)',
    () => assertSucceeds(setDoc(doc(owner, 'notebooks', NB_AS_UID), { n: 1, ver: 1, deviceUpdatedAt: 1, updatedAt: new Date() })));
  await t('owner: the legacy v03.99 single-blob shape can still be written',
    () => assertSucceeds(setDoc(doc(owner, 'notebooks', NB), { db: '{"articles":[]}', ver: 3, deviceUpdatedAt: 3 })));

  S('2b. THE OWNER — operations neither build performs, denied on purpose');
  await t('owner: CANNOT list /notebooks  (no enumeration surface at all)',
    () => assertFails(getDocs(collection(owner, 'notebooks'))));
  await t('owner: CANNOT list the chunks subcollection',
    () => assertFails(getDocs(collection(owner, 'notebooks', NB, 'chunks'))));
  await t('owner: CANNOT delete the notebook document  (I1 — one call cannot erase it)',
    () => assertFails(deleteDoc(doc(owner, 'notebooks', NB))));
  await t('owner: CANNOT write outside /notebooks  (no blanket match)',
    () => assertFails(setDoc(doc(owner, 'anything', 'at-all'), { x: 1 })));

  /* ── 2c. another signed-in user ─────────────────────────────────────── */
  S('2c. ANOTHER SIGNED-IN GOOGLE USER — the hole the live rule leaves open');
  await t('stranger: CANNOT read the notebook',
    () => assertFails(getDoc(doc(stranger, 'notebooks', NB))));
  await t('stranger: CANNOT read a payload chunk',
    () => assertFails(getDoc(doc(stranger, 'notebooks', NB, 'chunks', '0'))));
  await t('stranger: CANNOT overwrite the notebook',
    () => assertFails(setDoc(doc(stranger, 'notebooks', NB), { n: 1, ver: 99, deviceUpdatedAt: 99 })));
  await t('stranger: CANNOT update a single field of it',
    () => assertFails(updateDoc(doc(stranger, 'notebooks', NB), { ver: 99 })));
  await t('stranger: CANNOT write a payload chunk',
    () => assertFails(setDoc(doc(stranger, 'notebooks', NB, 'chunks', '0'), { p: 'evil', ver: 99 })));
  await t('stranger: CANNOT delete the notebook',
    () => assertFails(deleteDoc(doc(stranger, 'notebooks', NB))));
  await t('stranger: CANNOT delete a payload chunk',
    () => assertFails(deleteDoc(doc(stranger, 'notebooks', NB, 'chunks', '0'))));
  await t('stranger: CANNOT enumerate /notebooks',
    () => assertFails(getDocs(collection(stranger, 'notebooks'))));
  await t('stranger: CANNOT create a notebook of their own  (D1 — one tenant)',
    () => assertFails(setDoc(doc(stranger, 'notebooks', STRANGER), { n: 1, ver: 1, deviceUpdatedAt: 1 })));
  await t('stranger: CANNOT attach a real-time listener',
    () => new Promise((res, rej) => {
      const un = onSnapshot(doc(stranger, 'notebooks', NB),
        () => { un(); rej(new Error('listener DELIVERED data to a stranger')); },
        () => { un(); res(); });
      setTimeout(() => { un(); rej(new Error('listener neither failed nor delivered')); }, 8000);
    }));
  await t('stranger: CANNOT write anywhere else in the database',
    () => assertFails(setDoc(doc(stranger, 'somewhere', 'else'), { x: 1 })));

  /* ── 2d. signed out ─────────────────────────────────────────────────── */
  S('2d. SIGNED OUT — no token at all');
  await t('signed-out: CANNOT read the notebook',
    () => assertFails(getDoc(doc(anon, 'notebooks', NB))));
  await t('signed-out: CANNOT read a payload chunk',
    () => assertFails(getDoc(doc(anon, 'notebooks', NB, 'chunks', '0'))));
  await t('signed-out: CANNOT write the notebook',
    () => assertFails(setDoc(doc(anon, 'notebooks', NB), { n: 1, ver: 99, deviceUpdatedAt: 99 })));
  await t('signed-out: CANNOT write a payload chunk',
    () => assertFails(setDoc(doc(anon, 'notebooks', NB, 'chunks', '0'), { p: 'x', ver: 1 })));
  await t('signed-out: CANNOT delete anything',
    () => assertFails(deleteDoc(doc(anon, 'notebooks', NB))));
  await t('signed-out: CANNOT enumerate /notebooks',
    () => assertFails(getDocs(collection(anon, 'notebooks'))));

  /* ── 2e. sync still works, end to end ───────────────────────────────── */
  S('2e. SYNC STILL WORKS — the real _writeCloudDB / _readCloudDB, under the rules');
  await env.clearFirestore();

  await t('small notebook: push then read back, byte-identical  (1 chunk)', async () => {
    const db = makeDB(20, 'SMALL');
    const n = await writeCloudDB(owner, NB, 1001, b64enc(JSON.stringify(db)));
    if (n !== 1) throw new Error(`expected 1 chunk, got ${n}`);
    const md = (await getDoc(doc(owner, 'notebooks', NB))).data();
    const back = await readCloudDB(owner, NB, md);
    if (!back) throw new Error('payload did not assemble');
    if (JSON.stringify(back) !== JSON.stringify(db)) throw new Error('payload changed in transit');
    detail = `${db.articles.length} notes, 1 chunk, round-tripped byte-identical`;
  });

  await t('large notebook: push then read back, byte-identical  (multi-chunk, >900 KB)', async () => {
    const db = makeDB(1400, 'LARGE');
    const b64 = b64enc(JSON.stringify(db));
    if (b64.length <= SYNC_CHUNK) throw new Error('fixture did not exceed one chunk');
    const n = await writeCloudDB(owner, NB, 1002, b64);
    if (n < 2) throw new Error(`fixture did not split: got ${n} chunk(s)`);
    detail = `${(b64.length / 1024).toFixed(0)} KB of base64 split across ${n} chunks, all written and read back under the rules`;
    const md = (await getDoc(doc(owner, 'notebooks', NB))).data();
    const back = await readCloudDB(owner, NB, md);
    if (!back) throw new Error('payload did not assemble');
    if (JSON.stringify(back) !== JSON.stringify(db)) throw new Error('payload changed in transit');
  });

  await t('shrinking notebook: 2 chunks → 1, the tail delete commits  (§ tail delete)', async () => {
    const db = makeDB(20, 'SHRUNK');
    const n = await writeCloudDB(owner, NB, 1003, b64enc(JSON.stringify(db)));
    if (n !== 1) throw new Error(`expected 1 chunk, got ${n}`);
    const stale = await env.withSecurityRulesDisabled(async (c) =>
      (await getDoc(doc(c.firestore(), 'notebooks', NB, 'chunks', '1'))).exists());
    if (stale) throw new Error('chunk 1 survived — the tail delete was denied');
    detail = 'chunks 1…10 deleted by batch 2; no stale tail left behind';
    const md = (await getDoc(doc(owner, 'notebooks', NB))).data();
    const back = await readCloudDB(owner, NB, md);
    if (JSON.stringify(back) !== JSON.stringify(db)) throw new Error('payload changed in transit');
  });

  await t('two devices converge: phone pushes, laptop\'s listener receives it  (I2)', async () => {
    const laptop = env.authenticatedContext(OWNER_UID, { email: 'owner@example.com' }).firestore();
    const seen = new Promise((res, rej) => {
      let first = true;
      const un = onSnapshot(doc(laptop, 'notebooks', NB), (s) => {
        if (first) { first = false; return; }            /* the current state */
        if (s.data()?.ver === 2001) { un(); res(s.data()); }
      }, (e) => { un(); rej(e); });
      setTimeout(() => { un(); rej(new Error('laptop never received the phone\'s push')); }, 12000);
    });
    const db = makeDB(30, 'FROM-THE-PHONE');
    await writeCloudDB(owner, NB, 2001, b64enc(JSON.stringify(db)));
    const md = await seen;
    const back = await readCloudDB(laptop, NB, md);
    if (back?.articles?.find((a) => a.id === 'marker')?.title !== 'FROM-THE-PHONE')
      throw new Error('laptop assembled the wrong payload');
  });

  await t('legacy v03.99 single-blob notebook is still readable  (I1 / I4)', async () => {
    await env.withSecurityRulesDisabled(async (c) =>
      setDoc(doc(c.firestore(), 'notebooks', 'nb-legacy-blob'),
        { db: JSON.stringify({ folders: [], articles: [{ id: 'l1', title: 'Old note' }], sections: [], trash: [] }), ver: 5, deviceUpdatedAt: 5 }));
    const md = (await getDoc(doc(owner, 'notebooks', 'nb-legacy-blob'))).data();
    const back = await readCloudDB(owner, 'nb-legacy-blob', md);
    if (back?.articles?.[0]?.title !== 'Old note') throw new Error('legacy blob did not read back');
  });

  await t('the migration path still works: read notebooks/{old} → write notebooks/{uid}', async () => {
    await env.withSecurityRulesDisabled(async (c) =>
      setDoc(doc(c.firestore(), 'notebooks', 'nb-old-id'), { n: 1, ver: 7, deviceUpdatedAt: 7 }));
    const oldSnap = await getDoc(doc(owner, 'notebooks', 'nb-old-id'));      /* _migrateNotebook */
    if (!oldSnap.exists()) throw new Error('old notebook unreadable');
    await setDoc(doc(owner, 'notebooks', OWNER_UID), { ...oldSnap.data(), deviceUpdatedAt: Date.now() + 5000 });
  });

  await env.cleanup();
}

/* ═══ 3 ═══ the STRICT variant — kept because it FAILS ═══════════════════ */
async function suiteStrict() {
  const { env, owner } = await run('firestore.strict.rules');
  S('3. The STRICT variant — over-validation, proven to break sync');
  await env.clearFirestore();

  await t('STRICT: a plain push of a small notebook is REJECTED', async () => {
    let threw = null;
    try { await writeCloudDB(owner, NB, 3001, b64enc(JSON.stringify(makeDB(20, 'S')))); }
    catch (e) { threw = e; }
    if (!threw) throw new Error('expected the tail delete to be denied, but the push succeeded');
    detail = `denied as predicted: ${String(threw.message).replace(/\s+/g, ' ').trim().slice(0, 110)}`;
  });

  await t('STRICT: the tail delete of a NON-EXISTENT chunk is denied  (fault 1)',
    () => assertFails(deleteDoc(doc(owner, 'notebooks', NB, 'chunks', '9'))));

  await t('STRICT: the legacy single-blob shape can never be written again  (fault 2)',
    () => assertFails(setDoc(doc(owner, 'notebooks', NB), { db: '{"articles":[]}', ver: 4, deviceUpdatedAt: 4 })));

  await env.cleanup();
}

/* ── main ───────────────────────────────────────────────────────────────── */
const started = new Date();
await suiteCurrent();
await suiteProposed();
await suiteStrict();

const ver = async (pkg) => {
  try { return JSON.parse(await readFile(join(ROOT, 'node_modules', pkg, 'package.json'), 'utf8')).version; }
  catch { return 'unknown'; }
};
const head = [
  'Siyagah — Firestore rules test evidence',
  '='.repeat(72),
  `run at            ${started.toISOString()}`,
  `node              ${process.version}`,
  `emulator          Firestore emulator via firebase-tools ${await ver('firebase-tools')}, 127.0.0.1:8080`,
  `client sdk        firebase ${await ver('firebase')} / @firebase/rules-unit-testing ${await ver('@firebase/rules-unit-testing')}`,
  `app under test    index.html v04.38 (candidate f891b52) + legacy/v03.99 (identical paths)`,
  `rulesets          firestore.current.rules | firestore.rules | firestore.strict.rules`,
  `owner fixture     ${OWNER_UID}`,
  `notebook id       ${NB}   (synthetic, real shape, deliberately NOT a UID — see PATHS.md § 3)`,
];
const tail = ['', '='.repeat(72), `${pass} passed, ${fail} failed`, ''];
const out = [...head, ...log, ...tail].join('\n');
console.log(out);
await mkdir(join(ROOT, 'evidence'), { recursive: true });
await writeFile(join(ROOT, 'evidence', 'rules-test-output.txt'), out);
process.exit(fail ? 1 : 0);
