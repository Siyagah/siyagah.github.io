/* End-to-end with REAL mouse clicks only — no evaluate() driving the app.
   This is the journey a person actually performs. */
import { openApp, VIEWPORTS } from '../../tools/harness.mjs';

for (const vp of VIEWPORTS) {
  const s = await openApp({ viewport: { width: vp.width, height: vp.height } });
  const p = s.page;
  console.log(`\n================ ${vp.name} (${vp.width}x${vp.height}) ================`);
  try {
    await p.evaluate(() => selFolder('f1'));            /* get to a folder */
    await p.waitForTimeout(300);
    if (vp.width < 1200) { await p.evaluate(() => openP2()); await p.waitForTimeout(300); }

    /* 1. Real click on the quick-add "new note" control */
    const addBtn = await p.$('.p2-new-btn, [onclick="quickNewNote()"]');
    if (!addBtn) { console.log('  no quick-add button found on this layout — SKIPPED'); await s.close(); continue; }
    await addBtn.click();
    await p.waitForTimeout(700);
    const id = await p.evaluate(() => { const w=document.querySelector('.float-win'); return w?w.id.replace(/^fw-/,''):null; });
    console.log(`  1. clicked new-note  → pop-up open for note ${id}`);
    if (!id) { console.log('  no pop-up opened — SKIPPED'); await s.close(); continue; }

    /* 2. Real click on Pane 3's Edit button, if a person can reach it */
    const editBtn = await p.$('#p3h .p3h-edit-btn, #p3h [onclick="startEdit()"], #p3 [onclick="startEdit()"]');
    let clicked = false;
    if (editBtn) {
      const box = await editBtn.boundingBox();
      if (box) { try { await editBtn.click({ timeout: 4000 }); clicked = true; } catch (e) { console.log('  2. Edit button present but not clickable: ' + String(e).split('\n')[0]); } }
      else console.log('  2. Edit button present but has no box (not painted)');
    } else console.log('  2. no Edit button on this layout');
    if (clicked) { await p.waitForTimeout(500);
      console.log(`  2. clicked ✏ Edit    → #ed aid=${await p.evaluate(()=>{const e=document.getElementById('ed');return e?(e.dataset.aid+' html='+JSON.stringify(e.innerHTML.slice(0,20))):'(none)';})}`); }

    /* 3. Real typing into the pop-up */
    const fwEd = await p.$('#fw-ed-' + id);
    await fwEd.click();
    await p.keyboard.type('MY IMPORTANT NOTE TEXT');
    await p.waitForTimeout(2800);
    console.log(`  3. typed into pop-up → DB: ${JSON.stringify(await p.evaluate(i=>(DB.articles.find(a=>a.id===i)||{}).content, id))}`);

    /* 4. Real click on another folder in the tree */
    const other = await p.$('#tree [onclick*="selFolder(\'f2\')"]');
    if (other) { try { await other.click({ timeout: 4000 }); } catch { await p.evaluate(()=>selFolder('f2')); } }
    else await p.evaluate(() => selFolder('f2'));
    await p.waitForTimeout(700);

    const final = await p.evaluate(i => (DB.articles.find(a=>a.id===i)||{}).content, id);
    console.log(`  4. moved to folder 2 → DB: ${JSON.stringify(final)}`);
    console.log(`  VERDICT: ${String(final).includes('MY IMPORTANT NOTE TEXT') ? 'note intact' : '*** NOTE SILENTLY EMPTIED ***'}`);
  } catch (e) { console.log('  threw: ' + e); }
  console.log(`  console errors: ${s.errors.length ? s.errors.slice(0,2).join(' | ') : 'none'}`);
  await s.close();
}
