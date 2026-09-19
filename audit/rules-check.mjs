/* Siyagah — Firestore rules test suite.
   Drives the real Firestore emulator through EVERY path and operation the
   app performs, as three principals: the owner, another signed-in Google
   account, and a signed-out visitor.

   Usage: node rules-check.mjs <path-to-rules-file> <label>
   Exits non-zero if any expectation fails. */

import fs from 'node:fs';
import {
  initializeTestEnvironment, assertSucceeds, assertFails,
} from '@firebase/rules-unit-testing';
import {
  doc, collection, getDoc, getDocs, setDoc, deleteDoc, writeBatch,
} from 'firebase/firestore';

const RULES_PATH = process.argv[2];
const LABEL      = process.argv[3] || RULES_PATH;

const OWNER    = 'owner-uid-0001';   /* stands in for the owner's Google UID */
const INTRUDER = 'intruder-uid-9999';/* any other Google account on earth    */

/* The owner's real notebook id is a generated 'nb-...' string, NOT their UID
   (index.html:20166 generateNotebookId / 20298 connectSync). Both shapes are
   exercised so the rules are proven independent of which one is in play. */
const NB_GEN = 'nb-m1x2y3z-a4b5c6';
const NB_UID = OWNER;

let pass = 0, fail = 0;
const rows = [];

async function check(principal, action, path, expect, fn) {
  let got, err = '';
  try {
    if (expect === 'ALLOW') { await assertSucceeds(fn()); got = 'ALLOW'; }
    else                    { await assertFails(fn());    got = 'DENY'; }
  } catch (e) {
    got = (expect === 'ALLOW') ? 'DENY' : 'ALLOW';
    err = (e && e.message ? e.message : String(e)).split('\n')[0].slice(0, 110);
  }
  const ok = got === expect;
  ok ? pass++ : fail++;
  rows.push({ ok, principal, action, path, expect, got, err });
}

/* Byte-for-byte the batch _writeCloudDB() commits (index.html:19899-19902). */
async function pushLikeApp(db, nbId, b64, ver) {
  const CHUNK = 900000;
  const n = Math.ceil(b64.length / CHUNK) || 1;
  const nb = doc(db, 'notebooks', nbId);
  const batch = writeBatch(db);
  for (let i = 0; i < n; i++) {
    batch.set(doc(db, 'notebooks', nbId, 'chunks', String(i)),
              { p: b64.slice(i * CHUNK, (i + 1) * CHUNK), ver });
  }
  /* serverTimestamp() omitted: the emulator accepts it, but a literal keeps
     the assertion about authorization rather than about field types. */
  batch.set(nb, { n, ver, deviceUpdatedAt: ver, updatedAt: ver });
  await batch.commit();
  /* The tidy-up batch that deletes indices n..n+9 (index.html:19904). */
  const b2 = writeBatch(db);
  for (let i = n; i < n + 10; i++) b2.delete(doc(db, 'notebooks', nbId, 'chunks', String(i)));
  await b2.commit();
  return n;
}

/* Byte-for-byte the per-chunk reads _readCloudDB() issues (index.html:19881). */
async function readLikeApp(db, nbId) {
  const nb = doc(db, 'notebooks', nbId);
  const md = (await getDoc(nb)).data();
  if (!md) return null;
  if (md.n == null && md.db) return md.db;
  const snaps = await Promise.all(
    Array.from({ length: md.n }, (_, i) => getDoc(doc(db, 'notebooks', nbId, 'chunks', String(i)))));
  return snaps.map(s => (s.data() || {}).p || '').join('');
}

const env = await initializeTestEnvironment({
  projectId: 'siyagah-rules-test',
  firestore: {
    host: '127.0.0.1', port: 8080,
    /* The proposed file ships a literal placeholder so it cannot be deployed
       half-configured; the suite substitutes a test UID for it. */
    rules: fs.readFileSync(RULES_PATH, 'utf8').replace(/OWNER_UID/g, OWNER),
  },
});
await env.clearFirestore();

const owner = env.authenticatedContext(OWNER).firestore();
const other = env.authenticatedContext(INTRUDER).firestore();
const anon  = env.unauthenticatedContext().firestore();

/* Seed the owner's notebook with rules disabled, so the intruder and
   signed-out reads below are aimed at a document that genuinely exists —
   a denial must come from the rules, not from an empty database. */
await env.withSecurityRulesDisabled(async ctx => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'notebooks', NB_GEN), { n: 1, ver: 1000, deviceUpdatedAt: 1000, updatedAt: 1000 });
  await setDoc(doc(db, 'notebooks', NB_GEN, 'chunks', '0'), { p: 'SEEDED-PAYLOAD', ver: 1000 });
  await setDoc(doc(db, 'notebooks', NB_UID), { n: 1, ver: 1000, deviceUpdatedAt: 1000, updatedAt: 1000 });
  await setDoc(doc(db, 'notebooks', NB_UID, 'chunks', '0'), { p: 'SEEDED-PAYLOAD', ver: 1000 });
});

/* ── A. The owner — everything the app does must keep working ───────────── */
await check('owner', 'get notebook doc', `notebooks/${NB_GEN}`, 'ALLOW',
  () => getDoc(doc(owner, 'notebooks', NB_GEN)));
await check('owner', 'update notebook doc (_writeCloudDB shape)', `notebooks/${NB_GEN}`, 'ALLOW',
  () => setDoc(doc(owner, 'notebooks', NB_GEN), { n: 1, ver: 2000, deviceUpdatedAt: 2000, updatedAt: 2000 }));
await check('owner', 'get chunk', `notebooks/${NB_GEN}/chunks/0`, 'ALLOW',
  () => getDoc(doc(owner, 'notebooks', NB_GEN, 'chunks', '0')));
await check('owner', 'set chunk', `notebooks/${NB_GEN}/chunks/0`, 'ALLOW',
  () => setDoc(doc(owner, 'notebooks', NB_GEN, 'chunks', '0'), { p: 'X', ver: 2000 }));
await check('owner', 'delete chunk (tidy-up)', `notebooks/${NB_GEN}/chunks/7`, 'ALLOW',
  () => deleteDoc(doc(owner, 'notebooks', NB_GEN, 'chunks', '7')));
await check('owner', 'create notebook at UID-named id', `notebooks/${NB_UID}`, 'ALLOW',
  () => setDoc(doc(owner, 'notebooks', NB_UID), { n: 1, ver: 2000, deviceUpdatedAt: 2000, updatedAt: 2000 }));
await check('owner', 'legacy single-blob write {db}', `notebooks/${NB_GEN}`, 'ALLOW',
  () => setDoc(doc(owner, 'notebooks', 'nb-legacy-blob'), { db: '{"articles":[]}', deviceUpdatedAt: 3000 }));
await check('owner', 'migration copy (_migrateNotebook set)', `notebooks/${NB_UID}`, 'ALLOW',
  () => setDoc(doc(owner, 'notebooks', NB_UID), { n: 1, ver: 1000, db: 'legacy', deviceUpdatedAt: 4000, updatedAt: 1000 }));
await check('owner', 'DELETE notebook doc (app never does this)', `notebooks/${NB_GEN}`, 'DENY',
  () => deleteDoc(doc(owner, 'notebooks', NB_GEN)));
await check('owner', 'write outside /notebooks', 'users/owner-uid-0001', 'DENY',
  () => setDoc(doc(owner, 'users', OWNER), { x: 1 }));
await check('owner', 'read outside /notebooks', 'secrets/any', 'DENY',
  () => getDoc(doc(owner, 'secrets', 'any')));

/* ── B. Another signed-in Google account ────────────────────────────────── */
await check('other user', 'get owner notebook doc', `notebooks/${NB_GEN}`, 'DENY',
  () => getDoc(doc(other, 'notebooks', NB_GEN)));
await check('other user', 'overwrite owner notebook doc', `notebooks/${NB_GEN}`, 'DENY',
  () => setDoc(doc(other, 'notebooks', NB_GEN), { n: 1, ver: 9e12, deviceUpdatedAt: 9e12, updatedAt: 9e12 }));
await check('other user', 'get owner chunk (the note text)', `notebooks/${NB_GEN}/chunks/0`, 'DENY',
  () => getDoc(doc(other, 'notebooks', NB_GEN, 'chunks', '0')));
await check('other user', 'overwrite owner chunk', `notebooks/${NB_GEN}/chunks/0`, 'DENY',
  () => setDoc(doc(other, 'notebooks', NB_GEN, 'chunks', '0'), { p: 'WIPED', ver: 9e12 }));
await check('other user', 'delete owner chunk', `notebooks/${NB_GEN}/chunks/0`, 'DENY',
  () => deleteDoc(doc(other, 'notebooks', NB_GEN, 'chunks', '0')));
await check('other user', 'delete owner notebook doc', `notebooks/${NB_UID}`, 'DENY',
  () => deleteDoc(doc(other, 'notebooks', NB_UID)));
await check('other user', 'list the notebooks collection', 'notebooks/', 'DENY',
  () => getDocs(collection(other, 'notebooks')));
await check('other user', 'create their own notebook', 'notebooks/intruder-uid-9999', 'DENY',
  () => setDoc(doc(other, 'notebooks', INTRUDER), { n: 1, ver: 1, deviceUpdatedAt: 1, updatedAt: 1 }));

/* ── C. Signed out ──────────────────────────────────────────────────────── */
await check('signed out', 'get owner notebook doc', `notebooks/${NB_GEN}`, 'DENY',
  () => getDoc(doc(anon, 'notebooks', NB_GEN)));
await check('signed out', 'get owner chunk', `notebooks/${NB_GEN}/chunks/0`, 'DENY',
  () => getDoc(doc(anon, 'notebooks', NB_GEN, 'chunks', '0')));
await check('signed out', 'overwrite owner notebook doc', `notebooks/${NB_GEN}`, 'DENY',
  () => setDoc(doc(anon, 'notebooks', NB_GEN), { n: 1, ver: 9e12, deviceUpdatedAt: 9e12, updatedAt: 9e12 }));
await check('signed out', 'overwrite owner chunk', `notebooks/${NB_GEN}/chunks/0`, 'DENY',
  () => setDoc(doc(anon, 'notebooks', NB_GEN, 'chunks', '0'), { p: 'WIPED', ver: 9e12 }));
await check('signed out', 'list the notebooks collection', 'notebooks/', 'DENY',
  () => getDocs(collection(anon, 'notebooks')));

/* ── D. Sync still works — the real push/pull cycle, end to end ─────────── */
/* I2: a change on one device must reach another device unprompted. Device A
   and device B are the same Google account in two separate sessions. */
let syncNote = '';
try {
  const devA = env.authenticatedContext(OWNER).firestore();
  const devB = env.authenticatedContext(OWNER).firestore();
  const payload = 'eyJhcnRpY2xlcyI6W3siaWQiOiJhMSIsInRpdGxlIjoiSGVsbG8ifV19'; /* b64 of a small notebook */
  const n = await pushLikeApp(devA, NB_GEN, payload, 5000);
  const readBack = await readLikeApp(devB, NB_GEN);
  const ok = readBack === payload;
  ok ? pass++ : fail++;
  rows.push({ ok, principal: 'owner (2 devices)', action: `push from A (${n} chunk(s)) then pull on B`,
              path: `notebooks/${NB_GEN}`, expect: 'payload round-trips', got: ok ? 'identical' : 'MISMATCH', err: '' });
  syncNote = ok ? 'round-trip identical' : 'MISMATCH';
} catch (e) {
  fail++;
  rows.push({ ok: false, principal: 'owner (2 devices)', action: 'push from A then pull on B',
              path: `notebooks/${NB_GEN}`, expect: 'payload round-trips', got: 'THREW',
              err: (e.message || String(e)).split('\n')[0].slice(0, 110) });
  syncNote = 'threw';
}
/* A multi-chunk notebook would be identical in shape; the chunk loop is
   exercised above with n=1 because a 900 KB literal adds nothing to an
   authorization test. */

/* ── Report ─────────────────────────────────────────────────────────────── */
const w = (s, n) => String(s).padEnd(n).slice(0, n);
console.log(`\n=== ${LABEL} ===`);
console.log(`${w('', 3)}${w('PRINCIPAL', 19)}${w('OPERATION', 44)}${w('PATH', 40)}${w('EXPECT', 18)}GOT`);
console.log('-'.repeat(136));
for (const r of rows) {
  console.log(`${w(r.ok ? 'ok ' : 'XX ', 3)}${w(r.principal, 19)}${w(r.action, 44)}${w(r.path, 40)}${w(r.expect, 18)}${r.got}${r.err ? '  << ' + r.err : ''}`);
}
console.log('-'.repeat(136));
console.log(`${pass} passed, ${fail} failed   (sync round-trip: ${syncNote})\n`);

await env.cleanup();
process.exit(fail ? 1 : 0);
