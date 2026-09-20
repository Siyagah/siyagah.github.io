/* Persistence across a real reload.
   openApp() seeds localStorage through ctx.addInitScript, which re-runs on
   EVERY navigation — so a reload overwrites whatever the test just saved and
   reads as "the note vanished". Passing db:null skips the seed, so the page
   keeps what the app itself wrote, which is the thing being measured. */
import { openApp, seedDB, report } from '../../tools/harness.mjs';
const r = report('Persistence across a reload — real localStorage, no re-seed');

for (const vp of [{name:'phone',width:390,height:844},{name:'desktop',width:1440,height:900}]) {
  const s = await openApp({ viewport: { width: vp.width, height: vp.height }, db: null });
  const p = s.page;
  /* Note: "the app loads a notebook out of localStorage" is not asserted here
     — it is the precondition of all 286 app-checks, every one of which seeds
     localStorage and then measures what the app rendered from it. This file
     measures the half that seeding cannot: that what the APP itself writes
     survives a real reload. */
  await p.evaluate(() => { const f = DB.folders[0] || null; if (!f) { DB.folders.push(
      { id:'f1', name:'(001) Seeded Folder', parentId:null, order:1, updatedAt:new Date().toISOString() }); persist(); } });
  await p.evaluate(() => selFolder('f1'));
  await p.waitForTimeout(200);
  await p.evaluate(() => quickNewNote());
  await p.waitForTimeout(500);
  const id = await p.evaluate(() => ST.article);
  const ed = await p.$('#fw-ed-' + id);
  await ed.click();
  await p.keyboard.type('PERSISTENCE MARKER');
  await p.waitForTimeout(2800);

  const pre = await p.evaluate((i) => { persist();
    const a = DB.articles.find(x => x.id === i);
    const raw = JSON.parse(localStorage.getItem('my-notebook-v1') || '{}');
    const ra = (raw.articles || []).find(x => x.id === i);
    return { inDB: a ? a.content : null, inStorage: ra ? ra.content : null, count: DB.articles.length }; }, id);
  r.check(pre.inStorage && pre.inStorage.includes('PERSISTENCE MARKER'),
    `${vp.name}: a new note is written into browser storage`, pre.inStorage === null ? 'NOT IN STORAGE' : 'present in localStorage');

  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => typeof window.render === 'function' && !!document.getElementById('tree'));
  await p.waitForTimeout(400);
  const post = await p.evaluate((i) => { const a = DB.articles.find(x => x.id === i);
    return { found: !!a, content: a ? a.content : null, count: DB.articles.length }; }, id);
  r.check(post.found && post.content === pre.inDB && post.count === pre.count,
    `${vp.name}: the note is byte-identical after a real reload`,
    post.found ? (post.content === pre.inDB ? `${post.content.length} bytes unchanged, ${post.count} notes`
                  : `CHANGED: ${(pre.inDB||'').length} → ${(post.content||'').length}`) : 'NOTE MISSING after reload');
  r.check(s.errors.length === 0, `${vp.name}: reload is silent`, s.errors.slice(0,2).join(' | ') || 'silent');
  await s.close();
}
process.exit(r.finish() ? 1 : 0);
