/* audit-a-shell — Master Plan §4A: application shell, startup, corruption
   recovery, breakpoints and state restoration.

   The question this file exists to ask is the one no existing check asked:
   **what does the app do when the stored notebook is not the shape it
   expects?** `seedDB()` is always well-formed, so every check in the repo so
   far has measured a happy boot. A notebook that has been truncated by a full
   disk, half-written by a killed tab, or handed back wrong by a sync is the
   state where I1 ("no note is ever lost") is actually at risk.

   Run: node tools/audit-a-shell.mjs */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, openApp, matrix, VIEWPORTS, seedDB, synthDB, emptyDB, corruptDBs } from './harness.mjs';

const m = matrix('audit A — shell, startup, corruption recovery, breakpoints');
const D = 'A shell/navigation';

/* ── A1. An empty notebook ────────────────────────────────────────────────
   The state a brand-new device boots into, and the one most likely to divide
   by zero. */
{
  const app = await openApp({ db: emptyDB() });
  const s = await app.page.evaluate(() => ({
    folders: DB.folders.length, articles: DB.articles.length,
    sections: DB.sections.length,
    panes: ['tree', 'p2h', 'p2c', 'p3h', 'p3c'].map((id) => (document.getElementById(id)?.innerHTML || '').length),
    bodyText: (document.body.innerText || '').slice(0, 400),
  }));
  m.row(D, 'boots on an EMPTY notebook with no exception', app.errors.length === 0, app.errors.join('\n') || 'silent');
  m.row(D, 'an empty notebook is given a default section rather than none', s.sections >= 1, `${s.sections} sections`);
  m.row(D, 'every pane still paints something when there is nothing to show',
    s.panes.every((n) => n > 0), s.panes.join('/'));
  m.row(D, 'an empty notebook invents no notes or folders',
    s.folders === 0 && s.articles === 0, `${s.folders} folders, ${s.articles} notes`);
  await app.close();
}

/* ── A2. A CORRUPT notebook ───────────────────────────────────────────────
   Ten shapes of damage, each written into localStorage before boot. Two
   things are asserted for every one of them, and they are different
   questions: does the app still BOOT (an app that throws here is an app the
   owner cannot open at all), and does it still hold the data it could read
   (silently replacing a damaged notebook with an empty one is I1). */
const CORRUPT = corruptDBs();
for (const [name, payload] of Object.entries(CORRUPT)) {
  /* The damage is in the BYTES, so it is handed over as a raw string through
     the same addInitScript route the well-formed fixtures use. The first cut
     of this check wrote it with setItem and reloaded, and every case came back
     "0 folders / 0 notes" — the app's own unload flush had rewritten
     localStorage from the empty DB it was still holding. That read exactly
     like "the app wipes a damaged notebook" and was the test wiping it. */
  let app = null, booted = true;
  try { app = await openApp({ db: null, rawDB: payload }); }
  catch { booted = false; }
  const state = booted && app ? await app.page.evaluate(() => {
    try {
      return { ok: true, folders: DB?.folders?.length ?? -1, articles: DB?.articles?.length ?? -1,
        treeLen: (document.getElementById('tree')?.innerHTML || '').length,
        stored: (() => { try { const j = JSON.parse(localStorage.getItem('my-notebook-v1') || '{}');
          return { f: (j.folders || []).length, a: (j.articles || []).length }; } catch { return null; } })() };
    } catch (e) { return { ok: false, err: String(e) }; }
  }) : { ok: false, err: 'never finished booting' };
  const errs = app ? app.errors.filter((e) => !/Failed to load resource/.test(e)) : ['openApp threw'];

  /* What was READABLE in the damaged payload, judged independently of the app */
  /* A `null` sitting in the articles list is not a record — it carries no
     title, no body and no id, so counting it as one and then demanding the
     app still hold it asks for the damage to be preserved rather than the
     data. Count the entries that are actually records. */
  const recs = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object').length : 0);
  let readable = { f: 0, a: 0 };
  try { const j = JSON.parse(payload); readable = { f: recs(j.folders), a: recs(j.articles) }; } catch {}

  m.row(D, `corrupt notebook "${name}" — the app still boots and paints`,
    booted && state.ok && state.treeLen > 0,
    state.ok ? `${state.folders} folders / ${state.articles} notes in DB, tree ${state.treeLen}b` : state.err);
  m.row(D, `corrupt notebook "${name}" — boot throws no exception`,
    errs.length === 0, errs.slice(0, 2).join('\n') || 'silent');
  /* I1: whatever WAS readable must still be there. Silently replacing a
     damaged notebook with an empty one loses the half that was fine. */
  m.row(D, `corrupt notebook "${name}" — keeps every record that was readable (I1)`,
    state.ok && state.folders >= readable.f && state.articles >= readable.a,
    `payload had ${readable.f} folders / ${readable.a} notes; app holds ${state.folders} / ${state.articles}`);
  if (app) await app.close();
}

/* ── A3. A LARGE notebook ─────────────────────────────────────────────────
   Master Plan §4I asks for 500 / 2,000 / 10,000. Startup is measured here;
   the rest of the performance budget is audit-i. */
for (const notes of [500, 2000]) {
  const t0 = Date.now();
  const app = await openApp({ db: synthDB({ notes, folders: notes < 1000 ? 40 : 120 }) });
  const boot = Date.now() - t0;
  const s = await app.page.evaluate(() => ({ a: DB.articles.length, f: DB.folders.length,
    tree: (document.getElementById('tree')?.innerHTML || '').length }));
  m.row(D, `boots a ${notes}-note synthetic notebook`, s.a === notes && app.errors.length === 0,
    `${s.a} notes / ${s.f} folders, tree ${s.tree}b, ${boot}ms incl. browser launch`);
  await app.close();
}

/* ── A4. Breakpoint transitions ───────────────────────────────────────────
   The app has three genuinely different layouts (CLAUDE.md D5). Resizing
   ACROSS a breakpoint re-runs render paths that a fresh boot at that size
   never exercises — a class of defect a per-viewport check cannot see. */
{
  const app = await openApp({ viewport: { width: 1440, height: 900 } });
  const order = [[390, 844], [820, 1180], [1440, 900], [639, 900], [640, 900], [1199, 900], [1200, 900], [390, 844]];
  const seenErr = [];
  for (const [w, h] of order) {
    await app.page.setViewportSize({ width: w, height: h });
    await app.page.waitForTimeout(280);
    const bad = await app.page.evaluate(() => {
      const de = document.documentElement;
      /* "visible" is not `display !== none`. Below 1200px the panes are
         off-canvas slide-overs: `#sb.closed` is `width:0!important` at
         `left:-100%` and is display:flex the whole time. Judging those as
         "visible but 0px wide" is the check misreading a pane that is doing
         exactly what it should. A pane is SHOWING when it is displayed and
         its box actually intersects the viewport. */
      const panes = ['sb', 'p2', 'p3'].map((id) => { const e = document.getElementById(id); if (!e) return null;
        const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
        const onScreen = r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight;
        return { id, w: Math.round(r.width), showing: cs.display !== 'none' && cs.visibility !== 'hidden' && onScreen }; }).filter(Boolean);
      return { overflow: de.scrollWidth - de.clientWidth, panes, showing: panes.filter((p) => p.showing).map((p) => p.id) };
    });
    if (bad.overflow > 1) seenErr.push(`${w}px: ${bad.overflow}px sideways scroll`);
    const zero = bad.panes.filter((p) => p.showing && p.w < 2);
    if (zero.length) seenErr.push(`${w}px: ${zero.map((z) => z.id).join(',')} showing but 0px wide`);
    if (!bad.showing.length) seenErr.push(`${w}px: NOTHING on screen`);
  }
  m.row(D, 'crossing every breakpoint in both directions throws nothing',
    app.errors.length === 0, app.errors.slice(0, 4).join('\n') || 'silent');
  m.row(D, 'no sideways scroll and no zero-width visible pane at any breakpoint edge',
    seenErr.length === 0, seenErr.join('\n') || '8 widths incl. 639/640 and 1199/1200');
  await app.close();
}

/* ── A5. Reload reopens what the owner was looking at ────────────────────
   Not "does localStorage survive" (persistence-reload.mjs proves that) but
   "does the app come back where it was" — a different promise, and the one a
   person notices. `db:null`, because openApp's seed re-runs on EVERY
   navigation: seeding here would restore the fixture over whatever the app
   saved and the measurement would be of the harness, not the app. */
{
  const app = await openApp({ db: null });
  const p = app.page;
  await p.evaluate(() => { DB.sections = [{ id: 's1', name: 'S', order: 0, updatedAt: new Date().toISOString() }];
    DB.folders = [{ id: 'f1', name: '(001) F', parentId: null, order: 1, sectionId: 's1', updatedAt: new Date().toISOString() }];
    DB.articles = [{ id: 'aX', title: 'Reopen me', content: '<p>body</p>', folderIds: ['f1'], tags: [],
      kind: 'general', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
    persist(); render(); });
  await p.waitForTimeout(250);
  await p.evaluate(() => { selFolder('f1'); selArt('aX'); });
  await p.waitForTimeout(600);
  const before = await p.evaluate(() => ({ art: ST.article, last: DB.theme?.lastArticle }));
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => typeof window.render === 'function' && !!document.getElementById('tree'));
  await p.waitForTimeout(450);
  const after = await p.evaluate(() => ({ art: ST.article, notes: DB.articles.length,
    /* NOT sliced. The first cut took the first 60 characters and the note's
       body starts at about the 70th, under the title, the versioning bar, the
       created date and the folder crumb — so the check reported a blank note
       that was painted perfectly. */
    p3: (document.getElementById('p3c')?.innerText || '') }));
  m.row(D, 'opening a note records it as the last-viewed note', before.last === 'aX', `DB.theme.lastArticle = ${before.last}`);
  m.row(D, 'reload reopens the note that was open', after.art === 'aX', `ST.article = ${after.art}, ${after.notes} notes`);
  m.row(D, 'the reopened note actually paints its body', /body/.test(after.p3),
    after.p3.replace(/\n/g, ' / ').slice(0, 120));
  await app.close();
}

/* ── A6. The service worker and the offline promise (I3) ──────────────────
   `ship-check` proves every CORE path exists. What it cannot prove is that
   the cache NAME moved, which is the whole mechanism by which a new build
   reaches a device instead of the stale one. */
{
  const { readFileSync } = await import('node:fs');
  const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const v = (html.match(/name="app-version" content="([\d.]+)"/) || [])[1];
  const cache = (sw.match(/const VERSION\s*=\s*'([^']+)'/) || [])[1];
  m.row(D, 'the service-worker cache name carries the app version (I3)',
    !!v && !!cache && cache.startsWith('v' + v + '.'), `app v${v}, cache ${cache}`);
  m.row(D, 'the service worker is network-first, so a stale cache cannot win',
    /network|fetch\s*\(/.test(sw) && /caches\.open/.test(sw), 'fetch + caches.open present');
}

writeFileSync(join(ROOT, 'audit', 'inventory', 'matrix-a.json'), JSON.stringify(m.rows, null, 1));
process.exit(m.finish() ? 1 : 0);
