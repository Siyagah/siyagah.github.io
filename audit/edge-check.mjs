/* Two deployment risks, measured rather than argued:
   E1 — the naive `nbId == request.auth.uid` rule against the owner's REAL
        notebook id shape ('nb-...'), i.e. does the obvious rule lock them out;
   E2 — a genuinely multi-chunk notebook through the proposed rules, since the
        owner's notebook is larger than one 900 KB chunk. */
import fs from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';

const OWNER = 'owner-uid-0001';
const NB_GEN = 'nb-m1x2y3z-a4b5c6';
let pass = 0, fail = 0;
const line = (ok, t, d) => { ok ? pass++ : fail++; console.log(`${ok ? 'ok ' : 'XX '} ${t}\n       ${d}`); };

async function envFor(rulesPath, sub) {
  let rules = fs.readFileSync(rulesPath, 'utf8');
  if (sub) rules = rules.replace(/OWNER_UID/g, sub);
  const e = await initializeTestEnvironment({
    projectId: 'siyagah-rules-test', firestore: { host: '127.0.0.1', port: 8080, rules } });
  /* The emulator occasionally cancels this call (gRPC 499) right after a
     previous test environment tears down; it is a harness flake, not a rules
     result, so it is retried rather than reported. */
  for (let i = 0; i < 5; i++) {
    try { await e.clearFirestore(); break; }
    catch (err) { if (i === 4) throw err; await new Promise(r => setTimeout(r, 400 * (i + 1))); }
  }
  return e;
}
const tried = async fn => { try { await fn(); return 'ALLOW'; } catch { return 'DENY'; } };

console.log('\n=== E1 — the naive doc-id rule, against the owner\'s real notebook id ===\n');
{
  const env = await envFor('./naive-rule-rejected.rules');
  const owner = env.authenticatedContext(OWNER).firestore();
  const atGen = await tried(() => setDoc(doc(owner, 'notebooks', NB_GEN), { n: 1, ver: 1, deviceUpdatedAt: 1, updatedAt: 1 }));
  const atUid = await tried(() => setDoc(doc(owner, 'notebooks', OWNER),  { n: 1, ver: 1, deviceUpdatedAt: 1, updatedAt: 1 }));
  line(atGen === 'DENY', `naive rule: owner writing notebooks/${NB_GEN}  -> ${atGen}`,
       'This is the id generateNotebookId() actually produces. DENY here = the owner is locked out of their own notebook.');
  line(atUid === 'ALLOW', `naive rule: owner writing notebooks/${OWNER}  -> ${atUid}`,
       'Only works if the owner happened to paste their raw UID into the Notebook ID box.');
  await env.cleanup();
}

console.log('\n=== E2 — a multi-chunk notebook through the PROPOSED rules ===\n');
{
  const env = await envFor('../firestore.rules', OWNER);
  const devA = env.authenticatedContext(OWNER).firestore();
  const devB = env.authenticatedContext(OWNER).firestore();
  const CHUNK = 900000;
  const b64 = 'A'.repeat(CHUNK * 2 + 12345);        /* 3 chunks, last one partial */
  const n = Math.ceil(b64.length / CHUNK);
  let wrote = 'DENY', readBack = null, tidied = 'DENY';
  try {
    const batch = writeBatch(devA);
    for (let i = 0; i < n; i++)
      batch.set(doc(devA, 'notebooks', NB_GEN, 'chunks', String(i)), { p: b64.slice(i * CHUNK, (i + 1) * CHUNK), ver: 7000 });
    batch.set(doc(devA, 'notebooks', NB_GEN), { n, ver: 7000, deviceUpdatedAt: 7000, updatedAt: 7000 });
    await batch.commit(); wrote = 'ALLOW';
    const b2 = writeBatch(devA);
    for (let i = n; i < n + 10; i++) b2.delete(doc(devA, 'notebooks', NB_GEN, 'chunks', String(i)));
    await b2.commit(); tidied = 'ALLOW';
  } catch (e) { wrote = 'THREW: ' + (e.message || e).split('\n')[0]; }
  try {
    const md = (await getDoc(doc(devB, 'notebooks', NB_GEN))).data();
    const snaps = await Promise.all(Array.from({ length: md.n }, (_, i) =>
      getDoc(doc(devB, 'notebooks', NB_GEN, 'chunks', String(i)))));
    readBack = snaps.map(s => s.data().p).join('');
  } catch (e) { readBack = 'THREW: ' + (e.message || e).split('\n')[0]; }
  line(wrote === 'ALLOW', `owner push of a ${(b64.length / 1e6).toFixed(2)} MB payload as ${n} chunks -> ${wrote}`,
       'The real _writeCloudDB batch: n chunk docs + the parent doc, one commit.');
  line(tidied === 'ALLOW', `owner tidy-up batch deleting chunks ${n}..${n + 9} -> ${tidied}`,
       'The second batch _writeCloudDB commits after every push.');
  line(readBack === b64, `device B reassembled ${n} chunks -> ${readBack === b64 ? 'byte-identical' : 'MISMATCH'}`,
       'I2: a change on one device reaches another, through the proposed rules.');
  await env.cleanup();
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
