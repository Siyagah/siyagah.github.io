/* Unit-tests the v04.49 collect-then-run / --only mechanism in
   harness.mjs directly — no browser, no app, because this tests the
   HARNESS, not Siyagah. `node tools/only-check.mjs`, a couple of seconds. */

import { report, blockIdMatches } from './harness.mjs';

const r = report('only-check — harness --only mechanism');

r.check(blockIdMatches('15a-x', '15'), 'a sub-block id matches its numeric prefix ("15a-x" vs "15")');
r.check(blockIdMatches('15', '15'), 'an id matches itself exactly');

/* the real disambiguation this exists for: v04.46's id-uniqueness fix
   already relies on "1" not accidentally also selecting "10-delete" or
   "11-theme-perkey". */
r.check(blockIdMatches('1-boot', '1'), '"1-boot" matches prefix "1"');
r.check(!blockIdMatches('10-delete', '1'), '"10-delete" does NOT match prefix "1"');
r.check(!blockIdMatches('11-theme-perkey', '1'), '"11-theme-perkey" does NOT match prefix "1"');
r.check(!blockIdMatches('150-x', '15'), '"150-x" does NOT match prefix "15" (no separator after it)');

/* A small fake suite of registered blocks, driven through the real
   report()/block()/run() mechanism (not a re-implementation of it), to
   prove run(prefixes) actually narrows what executes rather than just
   what's reported. */
async function fakeSuite() {
  const s = report('fake suite');
  const ran = [];
  for (const id of ['1-a', '2-a', '15a-x', '15b-y', '15c-z', '16-a']) {
    await s.block(id, async () => { ran.push(id); });
  }
  return { s, ran };
}

{
  const { s, ran } = await fakeSuite();
  const info = await s.run(['15']);
  r.check(ran.length === 3 && ran.every((id) => id.startsWith('15')),
    '--only 15 runs exactly the three registered 15* blocks and nothing else',
    JSON.stringify(ran));
  r.check(info.ranCount === 3 && info.totalCount === 6,
    'run() reports how many ran against the true total registered, not the filtered total',
    JSON.stringify(info));
}

{
  const { s, ran } = await fakeSuite();
  await s.run(['1', '15b-y']);
  r.check(ran.length === 2 && ran.includes('1-a') && ran.includes('15b-y'),
    'a comma-separated --only mixing a whole prefix and one exact id runs the union of both',
    JSON.stringify(ran));
}

{
  const { s } = await fakeSuite();
  let threw = null;
  try { await s.run(['nope-does-not-exist']); } catch (e) { threw = e; }
  r.check(threw !== null,
    'an --only value matching no registered block throws instead of silently running zero blocks',
    String(threw));
}

{
  const { s, ran } = await fakeSuite();
  const info = await s.run(null);
  r.check(ran.length === 6 && !info.only,
    'run() with no filter runs every registered block, in order, unfiltered',
    JSON.stringify(info));
}

process.exit(r.finish() ? 1 : 0);
