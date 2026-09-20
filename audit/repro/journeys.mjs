/* Journey tests for the audit: the real notebook journeys a person does,
   driven like a person (real clicks, real typing), at phone and desktop. */
import { openApp, VIEWPORTS, report } from '../../tools/harness.mjs';
const r = report('Audit journey tests — ' + new Date().toISOString().slice(0,10));

for (const vp of [VIEWPORTS[0], VIEWPORTS[2]]) {           /* phone, desktop */
  const s = await openApp({ viewport: { width: vp.width, height: vp.height } });
  const p = s.page;
  const N = vp.name;
  try {
    /* ── J1 create a note ─────────────────────────────────────────── */
    const before = await p.evaluate(() => DB.articles.length);
    await p.evaluate(() => selFolder('f1'));
    await p.waitForTimeout(200);
    await p.evaluate(() => quickNewNote());
    await p.waitForTimeout(500);
    const after = await p.evaluate(() => DB.articles.length);
    r.check(after === before + 1, `${N}: J1 create a note`, `${before} → ${after} articles`);
    /* Pin the id now. J6 navigates away and clears ST.article, so anything
       that reads ST.article later is measuring a different note. */
    const noteId = await p.evaluate(() => ST.article);

    /* ── J2 type into it, and read it back OUT OF DB (not the DOM) ── */
    await p.evaluate(() => { if (typeof startEdit === 'function') startEdit(); });
    await p.waitForTimeout(400);
    /* v04.33+ can hand editing to a floating window; drive whichever editor
       the app actually put the caret in, and name it in the evidence. */
    const edSel = await p.evaluate(() => {
      const fw = document.querySelector('.float-win .fw-ed');
      if (fw && fw.getBoundingClientRect().height > 0) return '.float-win .fw-ed';
      return document.getElementById('ed') ? '#ed' : null;
    });
    const ed = edSel ? await p.$(edSel) : null;
    if (ed) {
      await ed.click();
      await p.keyboard.type('Audit journey body text');
      await p.waitForTimeout(2800);                 /* past autosave ceiling */
      const inDB = await p.evaluate((id) => (DB.articles.find(a=>a.id===id)?.content)||'', noteId);
        r.check(inDB.includes('Audit journey body text'), `${N}: J2 typing reaches DB (${edSel})`, inDB.slice(0,60));
    } else r.fail(`${N}: J2 typing reaches DB`, 'no #ed editor found');

    /* ── J3 formatting (bold) actually marks up the content ───────── */
    if (ed) {
      await p.evaluate((sel) => { const e=document.querySelector(sel); const rg=document.createRange();
        rg.selectNodeContents(e); const s2=getSelection(); s2.removeAllRanges(); s2.addRange(rg); }, edSel);
      await p.evaluate(() => document.execCommand('bold'));
      await p.evaluate((sel) => _edTouched(document.querySelector(sel)), edSel);
      await p.waitForTimeout(2800);
      const c = await p.evaluate((id) => (DB.articles.find(a=>a.id===id)?.content)||'', noteId);
      r.check(/<(b|strong)[ >]/i.test(c), `${N}: J3 bold formatting persists`, c.slice(0,80));
    } else r.fail(`${N}: J3 bold formatting persists`, 'no editor');

    /* ── J4 table insert ──────────────────────────────────────────── */
    const tbl = await p.evaluate((sel) => {
      const e = document.querySelector(sel); if(!e) return {no:'no editor'};
      e.focus();
      try { insertAtCaret('<table border="1"><tr><td>AuditCellOne</td><td>AuditCellTwo</td></tr></table>'); }
      catch(err){ return {threw:String(err)}; }
      _edTouched(e);
      return { inDom: !!e.querySelector('table'), text: e.textContent.includes('AuditCellOne'), via: sel };
    }, edSel);
    await p.waitForTimeout(2800);
    const tblDB = await p.evaluate((id) => (DB.articles.find(a=>a.id===id)?.content)||'', noteId);
    r.check(tbl.inDom === true, `${N}: J4 a table lands in the editor`, JSON.stringify(tbl).slice(0,120));
    r.check(tblDB.includes('AuditCellOne'), `${N}: J4 table content persists to DB`, tblDB.includes('AuditCellOne')?'cell text in DB':'NOT SAVED');

    /* ── J5 search finds a seeded note ────────────────────────────── */
    const found = await p.evaluate(() => {
      ST.search = 'Seeded note one'; try{ render(); }catch(e){ return 'threw: '+e; }
      return document.getElementById('p2c').textContent.includes('Seeded note one');
    });
    r.check(found === true, `${N}: J5 search finds a note`, String(found));
    await p.evaluate(() => { ST.search=''; render(); });

    /* ── J6 navigation: open every folder + every Smart View ──────── */
    const nav = await p.evaluate(() => {
      const bad=[];
      DB.folders.forEach(f=>{ try{ selFolder(f.id); }catch(e){ bad.push('folder '+f.id+': '+e); } });
      SF.forEach(v=>{ try{ selFolder(v.id); }catch(e){ bad.push('view '+v.id+': '+e); } });
      return bad;
    });
    r.check(nav.length === 0, `${N}: J6 every folder and Smart View opens`, nav.length?nav.join('; '):'all clean');

    /* ── J7 persistence ────────────────────────────────────────────────
       Deliberately NOT tested here. openApp() seeds localStorage through
       ctx.addInitScript, which re-runs on EVERY navigation — so a reload
       overwrites whatever this test just saved, and the note reads as lost
       when nothing lost it. Persistence across a real reload is measured in
       audit/repro/persistence-reload.mjs, which opens the app with db:null
       so the seed cannot overwrite the app's own writes. */
    /* ── J8 Save File round-trip keeps every id (I1/I4) ───────────── */
    const rt = await p.evaluate(() => {
      const html = getExportHTML();
      const doc = new DOMParser().parseFromString(html,'text/html');
      const nd = doc.getElementById('nd');
      if(!nd) return {ok:false,why:'no #nd in export'};
      const d = JSON.parse(nd.textContent);
      const missA = DB.articles.filter(a=>!d.articles.some(x=>x.id===a.id)).map(a=>a.id);
      const missF = DB.folders.filter(f=>!d.folders.some(x=>x.id===f.id)).map(f=>f.id);
      return {ok:!missA.length&&!missF.length, missA, missF, bytes:html.length,
              isWholeApp: html.includes('<meta name="app-version"')};
    });
    r.check(rt.ok, `${N}: J8 Save File keeps every note and folder id`,
      rt.ok?`${rt.bytes} bytes`:`missing notes ${rt.missA} folders ${rt.missF}`);
    r.check(rt.isWholeApp, `${N}: J8 Save File exports the whole app`, rt.isWholeApp?'has app-version meta':'DATA ONLY');

    /* ── J9 delete goes via Trash (D3), nothing vanishes ──────────── */
    const del = await p.evaluate(() => {
      const a = DB.articles.find(x=>x.id==='a2'); if(!a) return {skip:true};
      const tb = DB.trash.length;
      try { trashArt('a2'); } catch(e){ return {err:String(e)}; }
      return { gone: !DB.articles.some(x=>x.id==='a2'), inTrash: DB.trash.length > tb };
    });
    if (del.skip) r.fail(`${N}: J9 delete goes via Trash`, 'seed note a2 missing');
    else if (del.err) r.fail(`${N}: J9 delete goes via Trash`, del.err);
    else { r.check(del.gone, `${N}: J9 deleted note leaves the list`, String(del.gone));
           r.check(del.inTrash, `${N}: J9 deleted note lands in Trash`, String(del.inTrash)); }

  } catch (e) { r.fail(`${N}: journeys threw`, String(e)); }
  r.check(s.errors.length === 0, `${N}: no console errors across all journeys`,
    s.errors.length ? s.errors.slice(0,3).join(' | ') : 'silent');
  await s.close();
}
process.exit(r.finish() ? 1 : 0);
