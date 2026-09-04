/* probe — not a test. Dumps what the app REALLY renders, so a claim about a
   pane can be checked against the pane instead of against the source.
   Every defect the checks in app-check.mjs cover was findable this way first.

     node tools/probe.mjs                    # the default view
     node tools/probe.mjs sf-mywall          # a Smart View or a folder id
     node tools/probe.mjs f1 a1              # a folder, with a note open
     node tools/probe.mjs --views            # one line per Smart View
*/

import { openApp, seedDB } from './harness.mjs';

const args = process.argv.slice(2);
const listViews = args.includes('--views');
const [folder, article] = args.filter((a) => !a.startsWith('--'));

const app = await openApp({ db: seedDB() });
const { page } = app;

if (listViews) {
  const rows = await page.evaluate(() => SF.map((sf) => {
    ST.folder = sf.id; ST.article = null; renderP2H(); renderP2C();
    const p2 = document.getElementById('p2c');
    return { id: sf.id, name: sf.name, rows: p2.querySelectorAll('.ac,.art-card,[data-aid]').length,
      text: (p2.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 90) };
  }));
  for (const r of rows) console.log(`${r.id.padEnd(12)} ${String(r.rows).padStart(3)} rows  ${r.name.padEnd(24)} ${r.text}`);
} else {
  const dump = await page.evaluate(([f, a]) => {
    if (f) ST.folder = f;
    if (a) ST.article = a;
    window.render();
    const txt = (id) => (document.getElementById(id)?.innerText || '').replace(/\n{3,}/g, '\n\n').trim();
    return {
      version: document.getElementById('app-version-tag')?.textContent?.trim(),
      folder: ST.folder, article: ST.article,
      sidebar: txt('tree'), listHead: txt('p2h'), list: txt('p2c'),
      noteHead: txt('p3h'), note: txt('p3c'),
      buttons: [...document.querySelectorAll('button,[onclick]')]
        .filter((el) => el.offsetParent !== null)
        .map((el) => (el.title || el.innerText || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean).slice(0, 60),
    };
  }, [folder, article]);
  for (const [k, v] of Object.entries(dump)) {
    console.log(`\n──── ${k} ${'─'.repeat(Math.max(0, 60 - k.length))}`);
    console.log(Array.isArray(v) ? v.join(' | ') : v);
  }
}
console.log(app.errors.length ? `\n!! ${app.errors.length} errors:\n${app.errors.join('\n')}` : '\nno errors');
await app.close();
