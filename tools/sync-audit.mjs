/* Cross-device sync audit for Siyagah (v04.68).
 *
 * Built during the owner's 25 Sep "check the sync issue in all directions"
 * job: 114 operations, each made on device A and merged into device B's
 * stale copy in BOTH directions. v04.67 as shipped: 53 FAIL. Run by
 * app-check block 32, and on its own:
 *
 * Usage:  node tools/sync-audit.mjs [--root <dir holding index.html + tools/harness.mjs>] [--only name,prefix] [--json out.json] [--vp 390,844]
 *
 * Method: in ONE booted page, simulate two devices that start from the same
 * synced notebook (A0 == B0). Device A performs an operation X through the
 * REAL app function the UI calls; device B keeps its stale copy (or makes its
 * own unrelated/concurrent change). Then:
 *   dir1  "B receives A"  = mergeDB(B1, A1)
 *   dir2  "A receives B"  = mergeDB(A1, B1)
 * With no B-side change, BOTH results must equal A1 exactly (after a
 * normalisation that ignores array order of id'd records and empty keys).
 * Then both results are merged into each other again: they must agree and be
 * unchanged (stable / idempotent). A test whose op changed nothing is NOTRUN.
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const ROOT = resolve(arg('--root', new URL('..', import.meta.url).pathname));
const ONLY = (arg('--only', '') || '').split(',').filter(Boolean);
const JSON_OUT = arg('--json', '');
const [VW, VH] = (arg('--vp', '1440,900')).split(',').map(Number);
const { openApp, seedDB } = await import(pathToFileURL(resolve(ROOT, 'tools/harness.mjs')).href);

const OLD = '2026-01-01T00:00:00.000Z';
function baseDB() {
  const d = seedDB(OLD);
  d.sections.push({ id: 'sec-2', name: 'Second Section', order: 1, updatedAt: OLD });
  d.folders.push({ id: 'f3', name: '(003) Third Folder', parentId: null, order: 1, sectionId: 'sec-2', updatedAt: OLD });
  d.articles.push({ id: 'a4', title: 'Note four', content: '<p>Four.</p>', folderIds: ['f3'], tags: ['other'],
    createdAt: OLD, updatedAt: OLD, kind: 'general' });
  d.globalTags = ['other', 'seed', 'lonely'];
  d.calEvents = [{ id: 'ev1', title: 'Dentist', date: '2026-10-01', allDay: true, createdAt: OLD, updatedAt: OLD }];
  d.calCategories = [{ id: 'cc1', name: 'Health', icon: '🏥', color: '#10B981', order: 0, updatedAt: OLD }];
  d.myFavCats = [{ id: 'fav1', name: 'Music', icon: '🎵', order: 0, updatedAt: OLD }];
  d.folderGroups = [{ id: 'fg-general', name: 'General', icon: '📁', order: 0, updatedAt: OLD },
                    { id: 'fg-2', name: 'Work', icon: '📁', order: 1, updatedAt: OLD }];
  d.noteKindCats = [{ id: 'cat-general', name: 'Undecided', icon: '❓', order: 0, updatedAt: OLD },
                    { id: 'cat-x', name: 'Extra', icon: '📦', order: 1, updatedAt: OLD }];
  d.noteKinds = [{ id: 'general', name: 'General', color: '#888888', nag: false, order: 1, catId: 'cat-general', updatedAt: OLD },
                 { id: 'k_idea', name: 'Idea', color: '#aa0000', nag: true, order: 2, catId: 'cat-general', updatedAt: OLD },
                 { id: 'k_ref', name: 'Reference', color: '#0000aa', nag: false, order: 3, catId: 'cat-x', updatedAt: OLD }];
  /* v04.98 (J1) — Jeb: the four default pockets (the real seed's fixed ids and 1970 stamp), and items spread
     over them. jp-shop is empty so an empty pocket can be deleted; ji4 is done so Clear done has work. */
  const J0 = '1970-01-01T00:00:00.000Z';
  d.jebPockets = [{ id: 'jp-task', name: 'Quick tasks', icon: '✓', color: '#FFF1A8', order: 0, createdAt: J0, updatedAt: J0 },
                  { id: 'jp-idea', name: 'Ideas', icon: '✶', color: '#FFD9B8', order: 1, createdAt: J0, updatedAt: J0 },
                  { id: 'jp-link', name: 'Links to read', icon: '↗', color: '#CFE8FF', order: 2, createdAt: J0, updatedAt: J0 },
                  { id: 'jp-shop', name: 'Shopping', icon: '◫', color: '#F6D2E4', order: 3, createdAt: J0, updatedAt: J0 }];
  d.jeb = [{ id: 'ji1', pocketId: 'jp-task', text: 'Call plumber', done: false, folderIds: [], tags: [], kind: null, journal: false, order: 0, createdAt: OLD, updatedAt: OLD },
           { id: 'ji2', pocketId: 'jp-task', text: 'Buy stamps', done: false, folderIds: [], tags: [], kind: null, journal: false, order: 1, createdAt: OLD, updatedAt: OLD },
           { id: 'ji4', pocketId: 'jp-task', text: 'Already done', done: true, folderIds: [], tags: [], kind: null, journal: false, order: 2, createdAt: OLD, updatedAt: OLD },
           { id: 'ji3', pocketId: 'jp-idea', text: 'Idea one\nsecond line <b>&', done: false, folderIds: ['f1'], tags: ['seed'], kind: 'k_idea', journal: false, order: 0, createdAt: OLD, updatedAt: OLD }];
  d.sfItems = { recent: { order: 0, updatedAt: OLD } };
  d.theme = { preset: 'forest', custom: {}, fonts: { global: 100, sidebar: 100, list: 100, content: 100 } };
  d.themeAt = {};
  return d;
}

/* ─── Tests. Every function body runs INSIDE the page (global scope of the app). ── */
const T = [];
const t = (name, area, o) => T.push({ name, area, ...o });
const src = (f) => (f ? f.toString() : null);

/* Notes */
t('N01 create note (mkArt)', 'Notes', { op: () => mkArt('f1', 'Brand new note') });
t('N02 create title-only note (mkArtTitleOnly)', 'Notes', { op: () => mkArtTitleOnly('f2', 'Title only note') });
t('N03 edit content (edit mode → saveArt)', 'Notes', { op: () => __A.editContent('a1', '<p>A added this.</p>') });
t('N04 edit title (edit mode → saveArt)', 'Notes', { op: () => __A.editTitle('a1', 'Retitled in editor') });
t('N05 rename title inline in pane 2 (finRenameArtTitle)', 'Notes', { op: () => finRenameArtTitle('a2', 'Renamed inline') });
t('N06 rename title in folder browser (pkNoteRenameSave)', 'Notes', { op: () => { const i = document.createElement('input'); i.id = 'pfrn-a2'; i.value = 'Renamed in browser'; document.body.appendChild(i); pkNoteRenameSave('a2'); } });
t('N07 add tag (tag picker: tagPickerApply)', 'Notes', { op: () => tagPickerApply('a2', 'fresh') });
t('N08 remove tag (removeArtTag)', 'Notes', { op: () => removeArtTag('a1', 'seed') });
t('N09 tag added in edit mode tag box (addTag → saveArt)', 'Notes', { op: () => { selArt('a2'); startEdit(); addTag('edtag', null, null); saveArt(); } });
t('N10 Attach → Folder picker toggle (toggleArtFolder)', 'Notes', { op: () => toggleArtFolder('a2', 'f2') });
t('N11 move note between folders in browser (pkMoveNote)', 'Notes', { op: () => pkMoveNote('a2', 'f1a', 'f2') });
t('N12 drop note on sidebar folder (dDrop)', 'Notes', { op: () => { _artDragId = 'a2'; _dragId = null; dDrop({ preventDefault() {} }, 'f2'); } });
t('N13 set Note Type (setNoteKind)', 'Notes', { op: () => setNoteKind('a2', 'k_idea') });
t('N14 toggle extra Note Type (toggleNoteKind)', 'Notes', { op: () => toggleNoteKind('a2', 'k_ref') });
t('N15 favourite (toggleFav)', 'Notes', { op: () => toggleFav('a2') });
t('N16 pin (togglePin)', 'Notes', { op: () => togglePin('a2') });
t('N17 archive (toggleArchive)', 'Notes', { op: () => toggleArchive('a2') });
t('N18 mark finished (finishNote)', 'Notes', { op: () => finishNote('a2') });
t('N19 un-finish (unfinishNote)', 'Notes', { setup: () => { const a = DB.articles.find(x => x.id === 'a2'); a.finalised = true; persist(); }, op: () => unfinishNote('a2') });
t('N20 add to My Favourites category (setNoteFavCat)', 'Notes', { op: () => setNoteFavCat('a2', 'fav1') });
t('N21 remove from My Favourites category (setNoteFavCat same cat)', 'Notes', { setup: () => { setNoteFavCat('a2', 'fav1'); }, op: () => setNoteFavCat('a2', 'fav1') });
t('N22 tab colour (openTabClrPicker)', 'Notes', { op: () => { __A.pickColour('#123456'); openTabClrPicker({}, 'a2'); } });
t('N23 delete note (trashArt)', 'Notes', { op: () => trashArt('a2') });
t('N24 restore note from Trash (restoreItem)', 'Notes', { setup: () => trashArt('a2'), op: () => restoreItem(DB.trash[DB.trash.length - 1].id) });
t('N25 permanently delete from Trash (permDeleteItem)', 'Notes', { setup: () => trashArt('a2'), op: () => permDeleteItem(DB.trash[DB.trash.length - 1].id) });
/* v04.77 — updated in place: a folder holding notes can no longer be deleted
   (owner's rule), so every folder-delete test first moves the folder's notes
   to f3 in its setup — which both devices share — and then deletes the now
   EMPTY folder. What each test proves about sync is unchanged. */
t('N26 empty Trash (emptyTrash)', 'Notes', { setup: () => { trashArt('a2'); DB.articles.forEach(a => { a.folderIds = a.folderIds.filter(f => f !== 'f2'); if (!a.folderIds.length) a.folderIds = ['f3']; }); persist(); trashFolder('f2'); }, op: () => emptyTrash() });
t('N27 restore a note-history version (restoreNoteHistory)', 'Notes', {
  setup: () => { const a = DB.articles.find(x => x.id === 'a2'); _captureNoteHistory(a, 'save', true); a.content = '<p>Later text.</p>'; a.updatedAt = new Date().toISOString(); persist(); },
  op: () => { const a = DB.articles.find(x => x.id === 'a2'); restoreNoteHistory('a2', a.noteHistory[0].id); } });
t('N28 spreadsheet edit inside a note (sheet insRow → _flushEd)', 'Notes', {
  setup: () => { const a = DB.articles.find(x => x.id === 'a2'); const d = _sgNew(); a.content = '<div class="sgx" contenteditable="false" data-sg=\'' + JSON.stringify(d) + '\'>' + _sgStaticHTML(d) + '</div><p><br></p>'; a.updatedAt = new Date().toISOString(); persist(); },
  op: async () => { selArt('a2'); startEdit(); await __A.sleep(50); const r = document.querySelector('#ed .sgx'); if (!r || !r._sg) throw new Error('sheet not mounted'); r._sg.act('insRowA'); _flushEd(); persist(); } });

/* v04.85 — a tab's short name lives in DB.theme.tabNames (never on the note).
   N30 proves a CLEARED name ("") reaches the other device instead of the old
   name coming back from it. */
t('N29 tab short name (_setTabName)', 'Notes', { op: () => _setTabName('a2', 'Short') });
t('N30 tab short name cleared (_setTabName "")', 'Notes', { setup: () => _setTabName('a2', 'Short'), op: () => _setTabName('a2', '') });

/* Folders */
t('F01 create folder (mkFolder)', 'Folders', { op: () => mkFolder(null, 'Brand new folder') });
t('F02 create subfolder (mkFolder with parent)', 'Folders', { op: () => mkFolder('f2', 'New child') });
t('F03 rename folder (rnFolder — sidebar/dialog)', 'Folders', { op: () => rnFolder('f2', 'Renamed folder') });
t('F04 rename folder inline in browser (pkRenameSave)', 'Folders', { op: () => { const i = document.createElement('input'); i.id = 'pkrn-f2'; i.value = 'Renamed in browser'; document.body.appendChild(i); pkRenameSave('f2'); } });
t('F05 move folder into another (sidebar drag: doMoveFolder inside)', 'Folders', { op: () => doMoveFolder('f2', 'f1', 'inside') });
t('F06 move folder into another (browser drag: pkMoveFolder inside)', 'Folders', { op: () => pkMoveFolder('f2', 'f1', 'inside') });
t('F07 reorder siblings (doMoveFolder before)', 'Folders', { op: () => doMoveFolder('f2', 'f1', 'before') });
t('F08 reorder siblings in browser (pkMoveFolder before)', 'Folders', { op: () => pkMoveFolder('f2', 'f1', 'before') });
t('F09 move subfolder to top level (moveFolderToTop)', 'Folders', { op: () => moveFolderToTop('f1a') });
t('F10 auto-number all folders (autoNumberAll)', 'Folders', { op: () => autoNumberAll(true) });
t('F11 renumber children (doRenumber)', 'Folders', { op: () => doRenumber('f1', 3, false, 0) });
t('F12 folder colour (setFolderColor)', 'Folders', { op: () => setFolderColor('f2', '#ff0000') });
t('F13 folder bold (setFolderBold)', 'Folders', { op: () => setFolderBold('f2') });
t('F14 delete empty folder (trashFolder)', 'Folders', { setup: () => { DB.articles.forEach(a => { a.folderIds = a.folderIds.filter(f => f !== 'f2'); if (!a.folderIds.length) a.folderIds = ['f3']; }); persist(); }, op: () => trashFolder('f2') });
t('F15 delete empty folder with subfolder (trashFolder f1)', 'Folders', { setup: () => { DB.articles.forEach(a => { a.folderIds = a.folderIds.filter(f => f !== 'f1' && f !== 'f1a'); if (!a.folderIds.length) a.folderIds = ['f3']; }); persist(); }, op: () => trashFolder('f1') });
t('F16 restore folder (restoreItem)', 'Folders', { setup: () => { DB.articles.forEach(a => { a.folderIds = a.folderIds.filter(f => f !== 'f2'); if (!a.folderIds.length) a.folderIds = ['f3']; }); persist(); trashFolder('f2'); }, op: () => restoreItem(DB.trash[DB.trash.length - 1].id) });
t('F19 delete a folder that still holds notes is REFUSED (v04.77)', 'Folders', { op: () => trashFolder('f1'), expectNoChange: true });
t('F20 convert empty folder to section (_doFolderToSection) — the folder must not come back', 'Folders', { setup: () => { DB.articles.forEach(a => { a.folderIds = a.folderIds.filter(f => f !== 'f2'); if (!a.folderIds.length) a.folderIds = ['f3']; }); persist(); }, op: () => _doFolderToSection('f2') });
t('F17 move root folder to another section (moveFolderToSec)', 'Folders', { op: () => moveFolderToSec('f2', 'sec-2') });
t('F18 move folder to MyWall group (moveFolderToGroup)', 'Folders', { op: () => moveFolderToGroup('f2', 'fg-2') });

/* Sections */
t('S01 create section (mkSection)', 'Sections', { op: () => mkSection('Brand new section') });
t('S02 rename section inline (finRenSec)', 'Sections', { op: () => { const i = document.createElement('input'); i.id = 'sri-sec-2'; i.value = 'Renamed section'; document.body.appendChild(i); finRenSec('sec-2'); } });
t('S03 reorder sections (secDDrop)', 'Sections', { op: () => { _secDragId = 'sec-2'; secDDrop({ preventDefault() {}, stopPropagation() {} }, 'sec-1'); } });
t('S04 section colour (setSectionColor)', 'Sections', { op: () => setSectionColor('sec-2', '#00aa00') });
t('S05 section bold (setSectionBold)', 'Sections', { op: () => setSectionBold('sec-2') });
t('S06 delete section (delSection)', 'Sections', { op: () => delSection('sec-2') });
t('S07 collapse/expand section (toggleSection) — expected NOT synced', 'Sections', {
  op: () => toggleSection({ target: document.body, stopPropagation() {} }, 'sec-2'), expectNoChange: true });

/* Tags */
t('T01 create standalone tag (addGlobalTag)', 'Tags', { op: () => addGlobalTag('standalone') });
t('T02 rename tag (finRenameTag)', 'Tags', { op: () => finRenameTag('seed', 'seedling') });
t('T03 delete tag used by a note (deleteTag)', 'Tags', { op: () => deleteTag('other') });
t('T04 delete standalone tag (deleteTag)', 'Tags', { op: () => deleteTag('lonely') });
t('T05 tag colour (showTagClrPicker)', 'Tags', { op: () => { __A.pickColour('#abcdef'); showTagClrPicker({}, 'seed'); } });

/* Note Types */
t('K01 create Note Type (addKindInCat)', 'NoteTypes', { op: () => { __A.prompts('Checklist'); addKindInCat(null, 'cat-x'); } });
t('K02 create Note Type tab (addNoteKindTab)', 'NoteTypes', { op: () => { __A.prompts('Journal-ish'); addNoteKindTab(); } });
t('K03 rename Note Type (renNtiKind)', 'NoteTypes', { op: () => { __A.prompts('Big Idea'); renNtiKind('k_idea', null); } });
t('K04 recolour Note Type (openKindClrPicker)', 'NoteTypes', { op: () => { __A.pickColour('#00ff00'); openKindClrPicker({}, 'k_idea', null); } });
t('K05 delete Note Type (delNtiKind)', 'NoteTypes', { setup: () => setNoteKind('a2', 'k_idea'), op: () => delNtiKind('k_idea', null) });
t('K06 move Note Type to group (moveKindToCat)', 'NoteTypes', { op: () => moveKindToCat('k_idea', 'cat-x', null) });
t('K07 move Note Type to group by drag (wallCatDDrop)', 'NoteTypes', { op: () => { _wallDragKid = 'k_idea'; _wallDragCatId = null; wallCatDDrop({ preventDefault() {}, stopPropagation() {} }, 'cat-x'); } });
t('K08 reorder Note Types (moveWallKind)', 'NoteTypes', { op: () => moveWallKind('k_ref', -1) });
t('K09 create Note Type group (addNtiCat)', 'NoteTypes', { op: () => { __A.prompts('New group', '🧪'); addNtiCat(); } });
t('K10 rename Note Type group (renNtiCat)', 'NoteTypes', { op: () => { __A.prompts('Renamed group'); renNtiCat('cat-x', null); } });
t('K11 recolour Note Type group (openCatClrPicker)', 'NoteTypes', { op: () => { __A.pickColour('#ff00ff'); openCatClrPicker({}, 'cat-x'); } });
t('K12 bold Note Type group (toggleNtiCatBold)', 'NoteTypes', { op: () => toggleNtiCatBold('cat-x') });
t('K13 delete Note Type group (delNtiCat)', 'NoteTypes', { op: () => delNtiCat('cat-x', null) });
t('K14 reorder Note Type groups by drag (wallCatDDrop)', 'NoteTypes', { op: () => { _wallDragCatId = 'cat-x'; _wallDragKid = null; wallCatDDrop({ preventDefault() {}, stopPropagation() {} }, 'cat-general'); } });

/* Smart Views / MyWall / favourites / calendar */
t('V01 reorder Smart View (moveSfItem)', 'SmartView', { op: () => moveSfItem(sfOrdered()[1].id, -1) });
t('V02 rename Smart View (finRenameSfItem)', 'SmartView', { op: () => finRenameSfItem(sfOrdered()[0].id, 'My recent') });
t('V03 Smart View colour (setSfItemColor)', 'SmartView', { op: () => setSfItemColor(sfOrdered()[0].id, '#ff8800') });
t('V04 Smart Views header bold (setSmartViewBold)', 'SmartView', { op: () => setSmartViewBold() });
t('W01 add MyWall folder group (addFolderGroup)', 'MyWall', { op: () => { __A.prompts('Hobbies'); addFolderGroup(); } });
t('W02 rename folder group (renameFolderGroup)', 'MyWall', { op: () => { __A.prompts('Office'); renameFolderGroup('fg-2'); } });
t('W03 delete folder group (deleteFolderGroup)', 'MyWall', { setup: () => moveFolderToGroup('f2', 'fg-2'), op: () => deleteFolderGroup('fg-2') });
t('W04 add favourites category (addFavCat)', 'MyWall', { op: () => { __A.prompts('📚 Books'); addFavCat(); } });
t('W05 rename favourites category (renameFavCat)', 'MyWall', { op: () => { __A.prompts('Songs'); renameFavCat('fav1'); } });
t('W06 delete favourites category (deleteFavCat)', 'MyWall', { op: () => deleteFavCat('fav1') });
t('C01 add calendar event (_calSaveEvent new)', 'Calendar', { op: () => { __A.calForm({ title: 'Lunch', date: '2026-10-02' }); ST.calEditEvt = 'new'; _calSaveEvent(); } });
t('C02 edit calendar event (_calSaveEvent)', 'Calendar', { op: () => { __A.calForm({ title: 'Dentist (moved)', date: '2026-10-03' }); ST.calEditEvt = 'ev1'; _calSaveEvent(); } });
t('C03 edit event created on this build (no updatedAt yet)', 'Calendar', {
  setup: () => { __A.calForm({ title: 'Gym', date: '2026-10-05' }); ST.calEditEvt = 'new'; _calSaveEvent(); window.__evId = DB.calEvents[DB.calEvents.length - 1].id; },
  op: () => { __A.calForm({ title: 'Gym (evening)', date: '2026-10-05' }); ST.calEditEvt = window.__evId; _calSaveEvent(); } });
t('C04 delete calendar event (_calDelEvent)', 'Calendar', { op: () => _calDelEvent('ev1') });
t('C05 add calendar category (_calAddCat)', 'Calendar', { op: () => _calAddCat() });
t('C06 edit calendar category (_calSaveCat)', 'Calendar', { op: () => _calSaveCat('cc1', '💊', 'Medical', '#EF4444') });
t('C07 delete calendar category (_calDelCat)', 'Calendar', { op: () => _calDelCat('cc1') });

/* Tabs / pins / theme */
t('P01 add note to a tab group (toggleTab)', 'Tabs', { op: () => { ST.article = 'a1'; ST.tabOwner = null; toggleTab('a2'); } });
t('P02 close a tab (closeTab)', 'Tabs', { setup: () => { ST.article = 'a1'; ST.tabOwner = null; toggleTab('a2'); }, op: () => { ST.tabOwner = 'a1'; closeTab('a2'); } });
t('P03 pin to sidepane (pinTabToPanel)', 'Tabs', { op: () => pinTabToPanel('a2') });
t('P04 unpin from sidepane (unpinTab)', 'Tabs', { setup: () => pinTabToPanel('a2'), op: () => unpinTab('a2') });
t('P05 theme scalar (DB.theme.preset + persist)', 'Theme', { op: () => { DB.theme.preset = 'ocean'; persist(); } });
t('P06 theme sub-key (DB.theme.fonts.sidebar + persist)', 'Theme', { op: () => { DB.theme.fonts.sidebar = 120; persist(); } });

/* Jeb (v04.98, J1) — pockets and items. Every operation goes through the real jeb*() function J2 will call. */
t('J01 add a Jeb item (jebAddItem)', 'Jeb', { op: () => jebAddItem('jp-task', 'New item from A') });
t('J02 edit a Jeb item text (jebEditItem)', 'Jeb', { op: () => jebEditItem('ji1', { text: 'Call plumber tomorrow' }) });
t('J03 tick a Jeb item (jebToggleDone)', 'Jeb', { op: () => jebToggleDone('ji1') });
t('J04 untick a done Jeb item (jebToggleDone)', 'Jeb', { op: () => jebToggleDone('ji4') });
t('J05 attach folders, tags, Note Type, Journal to an item (jebEditItem)', 'Jeb', { op: () => jebEditItem('ji2', { folderIds: ['f2'], tags: ['x'], kind: 'k_idea', journal: true }) });
t('J06 move an item within its pocket (jebMoveItem)', 'Jeb', { op: () => jebMoveItem('ji2', 'jp-task', 0) });
t('J07 move an item to another pocket (jebMoveItem)', 'Jeb', { op: () => jebMoveItem('ji1', 'jp-idea', 1) });
t('J08 add a pocket (jebAddPocket)', 'Jeb', { op: () => jebAddPocket('Calls', '☎', '#cccccc') });
t('J09 edit a pocket (jebEditPocket)', 'Jeb', { op: () => jebEditPocket('jp-idea', { name: 'Ideas!', color: '#112233' }) });
t('J10 reorder pockets (jebMovePocket)', 'Jeb', { op: () => jebMovePocket('jp-shop', 0) });
t('J11 delete a Jeb item (jebDeleteItem)', 'Jeb', { op: () => jebDeleteItem('ji1') });
t('J12 delete an empty pocket (jebDeletePocket)', 'Jeb', { op: () => jebDeletePocket('jp-shop') });
t('J13 delete a pocket that still holds items is REFUSED', 'Jeb', { op: () => jebDeletePocket('jp-task'), expectNoChange: true });
t('J14 clear done items (jebClearDone)', 'Jeb', { op: () => jebClearDone('jp-task') });
t('J15 to Note (jebToNote): the note appears, the item is gone', 'Jeb', { op: () => jebToNote('ji3') });
t('J16 restore a Jeb item from Trash (restoreItem)', 'Jeb', { setup: () => jebDeleteItem('ji1'), op: () => restoreItem(DB.trash[DB.trash.length - 1].id) });
t('J17 restore a Jeb pocket from Trash (restoreItem)', 'Jeb', { setup: () => jebDeletePocket('jp-shop'), op: () => restoreItem(DB.trash[DB.trash.length - 1].id) });
t('J18 permanently delete a trashed Jeb item (permDeleteItem)', 'Jeb', { setup: () => jebDeleteItem('ji1'), op: () => permDeleteItem(DB.trash[DB.trash.length - 1].id) });
t('J19 A deletes item ji1, B edits it LATER (the edit must survive)', 'Jeb', {
  op: () => jebDeleteItem('ji1'), bop: () => jebEditItem('ji1', { text: 'B kept working' }),
  check: ({ MB, MA }) => { const p = []; for (const [n, M] of [['dir1', MB], ['dir2', MA]]) {
    const i = (M.jeb || []).find(x => x.id === 'ji1');
    if (!i || i.text !== 'B kept working') p.push(n + ': later edit lost to earlier delete');
    if ((M.trash || []).some(t => t.item && t.item.id === 'ji1')) p.push(n + ': stale Trash entry for a live item'); } return p; } });
t('J20 B edits item ji1 EARLIER, A deletes it later (the delete must win)', 'Jeb', {
  bFirst: true, op: () => jebDeleteItem('ji1'), bop: () => jebEditItem('ji1', { text: 'B edited first' }),
  check: ({ MB, MA }) => { const p = []; for (const [n, M] of [['dir1', MB], ['dir2', MA]]) {
    if ((M.jeb || []).find(x => x.id === 'ji1')) p.push(n + ': deleted item came back'); } return p; } });
t('J21 A adds an item and B adds another to the SAME pocket (both survive)', 'Jeb', {
  op: () => jebAddItem('jp-idea', 'from A'), bop: () => jebAddItem('jp-idea', 'from B'),
  check: ({ MB, MA }) => { const p = []; for (const [n, M] of [['dir1', MB], ['dir2', MA]]) {
    for (const w of ['from A', 'from B']) if (!(M.jeb || []).some(x => x.text === w && x.pocketId === 'jp-idea')) p.push(n + ': "' + w + '" lost'); } return p; } });
t('J22 A turns item ji3 into a note, B edits ji3 EARLIER (the item stays gone, the note stays)', 'Jeb', {
  bFirst: true, op: () => jebToNote('ji3'), bop: () => jebEditItem('ji3', { text: 'Idea one (B edit)' }),
  check: ({ MB, MA }) => { const p = []; for (const [n, M] of [['dir1', MB], ['dir2', MA]]) {
    if ((M.jeb || []).find(x => x.id === 'ji3')) p.push(n + ': item that became a note came back');
    if (!(M.articles || []).some(a => a.fromJeb)) p.push(n + ': the note is missing'); } return p; } });

/* Undo */
t('U01 undo a change (undo after toggleArchive)', 'Undo', { known: 'undo stays local to the device (v04.68): HISTORY holds whole-notebook snapshots, so syncing an undo would also roll back merged-in edits from other devices', setup: () => toggleArchive('a2'), op: () => undo() });

/* Concurrency — B makes its own change too. `check` gets (MB, MA, A1, B1). */
t('X01 A edits note a1, B edits note a2', 'Concurrency', {
  op: () => __A.editContent('a1', '<p>from A</p>'), bop: () => __A.editContent('a2', '<p>from B</p>'),
  check: ({ MB, MA }) => { const p = []; for (const [n, M] of [['dir1', MB], ['dir2', MA]]) {
    const a1 = M.articles.find(x => x.id === 'a1'), a2 = M.articles.find(x => x.id === 'a2');
    if (!a1 || !a1.content.includes('from A')) p.push(n + ': A\'s edit to a1 lost');
    if (!a2 || !a2.content.includes('from B')) p.push(n + ': B\'s edit to a2 lost'); } return p; } });
t('X02 both edit the SAME note: A title, then B content (newest wins)', 'Concurrency', {
  op: () => __A.editTitle('a1', 'A title'), bop: () => __A.editContent('a1', '<p>B content</p>'),
  check: ({ MB, MA }) => { const p = []; for (const [n, M] of [['dir1', MB], ['dir2', MA]]) {
    const a = M.articles.find(x => x.id === 'a1');
    if (!a || !a.content.includes('B content')) p.push(n + ': newest (B) content missing');
    if (a && a.title !== 'A title') p.push(n + ': A\'s older title change discarded (record-level newest-wins, by design)'); } return p; },
  byDesign: 'record-level newest-wins' });
t('X03 A deletes note, B edits it LATER (edit must survive)', 'Concurrency', {
  op: () => trashArt('a2'), bop: () => __A.editContent('a2', '<p>B kept working</p>'),
  check: ({ MB, MA }) => { const p = []; for (const [n, M] of [['dir1', MB], ['dir2', MA]]) {
    const a = M.articles.find(x => x.id === 'a2');
    if (!a || !a.content.includes('B kept working')) p.push(n + ': later edit lost to earlier delete');
    if ((M.trash || []).some(t => t.item && t.item.id === 'a2')) p.push(n + ': stale Trash entry for a live note'); } return p; } });
t('X04 B edits note EARLIER, A deletes it later (delete must win)', 'Concurrency', {
  bFirst: true, op: () => trashArt('a2'), bop: () => __A.editContent('a2', '<p>B edited first</p>'),
  check: ({ MB, MA }) => { const p = []; for (const [n, M] of [['dir1', MB], ['dir2', MA]]) {
    if (M.articles.find(x => x.id === 'a2')) p.push(n + ': deleted note came back'); } return p; } });
t('X05 A deletes (empty) folder f2, B adds a new note into f2 later', 'Concurrency', {
  setup: () => { DB.articles.forEach(a => { a.folderIds = a.folderIds.filter(f => f !== 'f2'); if (!a.folderIds.length) a.folderIds = ['f3']; }); persist(); }, op: () => trashFolder('f2'), bop: () => { mkArt('f2', 'B new note in f2'); window.__bNew = DB.articles[DB.articles.length - 1].id; },
  check: ({ MB, MA }) => { const p = []; for (const [n, M] of [['dir1', MB], ['dir2', MA]]) {
    const a = M.articles.find(x => x.title === 'B new note in f2');
    if (!a) p.push(n + ': B\'s new note lost');
    else if ((a.folderIds || []).some(fid => !M.folders.find(f => f.id === fid))) p.push(n + ': B\'s note points at a folder that no longer exists (' + a.folderIds.join(',') + ')');
    if (M.folders.find(f => f.id === 'f2')) p.push(n + ': deleted folder f2 came back');
    const a3 = M.articles.find(x => x.id === 'a3');
    if (!a3) p.push(n + ': a3 (was in f2) lost');
    else if ((a3.folderIds || []).includes('f2')) p.push(n + ': a3 still filed in deleted f2'); } return p; } });
t('X06 A moves folder f2 into f1, B renames f2 later', 'Concurrency', {
  op: () => doMoveFolder('f2', 'f1', 'inside'), bop: () => rnFolder('f2', 'B renamed'),
  check: ({ MB, MA }) => { const p = []; for (const [n, M] of [['dir1', MB], ['dir2', MA]]) {
    const f = M.folders.find(x => x.id === 'f2');
    if (!f) { p.push(n + ': f2 lost'); continue; }
    if (f.name !== 'B renamed') p.push(n + ': B\'s later rename lost');
    if (f.parentId !== 'f1') p.push(n + ': A\'s earlier move lost (record-level newest-wins, by design)'); } return p; },
  byDesign: 'record-level newest-wins' });
t('X07 A renames f2, B toggles favourite on a note (unrelated)', 'Concurrency', {
  op: () => rnFolder('f2', 'A renamed'), bop: () => toggleFav('a2'),
  check: ({ MB, MA }) => { const p = []; for (const [n, M] of [['dir1', MB], ['dir2', MA]]) {
    if ((M.folders.find(x => x.id === 'f2') || {}).name !== 'A renamed') p.push(n + ': A\'s rename lost');
    if (!(M.articles.find(x => x.id === 'a2') || {}).favourite) p.push(n + ': B\'s favourite lost'); } return p; } });
t('X08 A deletes Note Type k_idea, B renames a DIFFERENT type', 'Concurrency', {
  op: () => delNtiKind('k_idea', null), bop: () => { __A.prompts('Ref2'); renNtiKind('k_ref', null); },
  check: ({ MB, MA }) => { const p = []; for (const [n, M] of [['dir1', MB], ['dir2', MA]]) {
    if ((M.noteKinds || []).find(k => k.id === 'k_idea')) p.push(n + ': deleted type came back');
    if (((M.noteKinds || []).find(k => k.id === 'k_ref') || {}).name !== 'Ref2') p.push(n + ': B\'s rename lost'); } return p; } });

t('Z01 browsing only (open notes, enter+leave edit unchanged, open Trash, render) — must stamp NOTHING', 'Phantom', {
  expectNoChange: true,
  op: async () => { selArt('a1'); selArt('a2'); startEdit(); cancelEdit(); selArt('a4'); startEdit(); saveArt(); selArt('a1');
    ST.folder = 'f2'; render(); openTrash(); closeTrash(); toggleSection({ target: document.body, stopPropagation() {} }, 'sec-1');
    await __A.sleep(30); persist(); } });
t('Z02 B edits a3 EARLIER, A deletes its folder f2 later (B edit must survive, a3 unfiled)', 'Concurrency', {
  setup: () => { DB.articles.forEach(a => { a.folderIds = a.folderIds.filter(f => f !== 'f2'); if (!a.folderIds.length) a.folderIds = ['f3']; }); persist(); }, bFirst: true, op: () => trashFolder('f2'), bop: () => __A.editContent('a3', '<p>B edit before folder delete</p>'),
  check: ({ MB, MA }) => { const p = []; for (const [n, M] of [['dir1', MB], ['dir2', MA]]) {
    const a = M.articles.find(x => x.id === 'a3');
    if (!a) { p.push(n + ': a3 lost'); continue; }
    if (!a.content.includes('B edit before folder delete')) p.push(n + ': B\'s edit to a3 lost');
    if ((a.folderIds || []).includes('f2')) p.push(n + ': a3 still filed in deleted f2'); } return p; } });
t('Z03 undo of a note creation (undo after mkArt) — known gap', 'Undo', { known: 'undo stays local to the device (v04.68), see U01',
  setup: () => { mkArt('f1', 'Created then undone'); ST.editing = false; }, op: () => undo(),
  check: ({ MB, MA }) => { const p = []; for (const [n, M] of [['dir1', MB], ['dir2', MA]]) {
    if (M.articles.find(x => x.title === 'Created then undone')) p.push(n + ': undone note came back'); } return p; } });

t('T06 re-add a tag that was deleted earlier (addGlobalTag after deleteTag)', 'Tags', { setup: () => deleteTag('lonely'), op: () => addGlobalTag('lonely') });
t('X09 A deletes standalone tag, B tags a note with it LATER (note keeps it)', 'Concurrency', {
  op: () => deleteTag('lonely'), bop: () => tagPickerApply('a2', 'lonely'),
  check: ({ MB, MA }) => { const p = []; for (const [n, M] of [['dir1', MB], ['dir2', MA]]) {
    if (!((M.articles.find(x => x.id === 'a2') || {}).tags || []).includes('lonely')) p.push(n + ': B\'s later tagging lost'); } return p; } });
t('X10 B adds tag x EARLIER, A deletes tag lonely later (both must hold)', 'Concurrency', {
  bFirst: true, op: () => deleteTag('lonely'), bop: () => addGlobalTag('xtag'),
  check: ({ MB, MA }) => { const p = []; for (const [n, M] of [['dir1', MB], ['dir2', MA]]) {
    if (!(M.globalTags || []).includes('xtag')) p.push(n + ': B\'s new tag lost');
    if ((M.globalTags || []).includes('lonely')) p.push(n + ': deleted tag came back'); } return p; } });
t('X11 real merge path: A merges B\'s edit, saves — B\'s stamp kept, nothing re-stamped', 'Concurrency', {
  bFirst: true, bop: () => __A.editContent('a4', '<p>B edit</p>'),
  op: async () => { __A.editContent('a1', '<p>A edit</p>'); await __A.sleep(10); DB = mergeDB(DB, __A.clone(window.__B1)); _seedThemeSnap(); if (typeof _seedRecSnap === 'function') _seedRecSnap(); _save(); await __A.sleep(10); persist(); },
  check: ({ MB, MA, A1, B1 }) => { const p = []; const b = B1.articles.find(x => x.id === 'a4');
    for (const [n, M] of [['dir1', MB], ['dir2', MA], ['dir2', A1]]) { const a = M.articles.find(x => x.id === 'a4');
      if (!a || a.updatedAt !== b.updatedAt) p.push(n + ': merged-in record re-stamped or lost (' + (a && a.updatedAt) + ' vs ' + b.updatedAt + ')');
      if (!(M.articles.find(x => x.id === 'a1') || {}).content.includes('A edit')) p.push(n + ': A\'s own edit lost'); } return p; } });
t('X12 undo after a merge must not erase the other device\'s merged edit', 'Undo', {
  bFirst: true, bop: () => __A.editContent('a4', '<p>B edit to keep</p>'),
  setup: () => toggleFav('a1'),
  op: async () => { DB = mergeDB(DB, __A.clone(window.__B1)); _seedThemeSnap(); if (typeof _seedRecSnap === 'function') _seedRecSnap(); _save(); await __A.sleep(10); toggleArchive('a2'); await __A.sleep(10); undo(); },
  check: ({ MB, MA }) => { const p = []; for (const [n, M] of [['dir1', MB], ['dir2', MA]]) {
    if (!(M.articles.find(x => x.id === 'a4') || {}).content.includes('B edit to keep')) p.push(n + ': B\'s edit erased by A\'s undo'); } return p; } });

t('G01 any future field on a note (direct mutation + persist) — generality of the fix', 'Generic', { op: () => { DB.articles.find(a => a.id === 'a2').someFutureFlag = true; persist(); } });
t('G02 any future field on a folder (direct mutation + _save only)', 'Generic', { op: () => { DB.folders.find(f => f.id === 'f3').someFutureFlag = 'x'; _save(); } });

/* ─── runner ─── */
const PAGE_LIB = () => {
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const isEmpty = (v) => v == null || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);
  const norm = (v) => {
    if (Array.isArray(v)) {
      const m = v.map(norm);
      if (m.length && m.every(x => x && typeof x === 'object' && !Array.isArray(x) && x.id != null)) m.sort((a, b) => String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0);
      else if (m.every(x => typeof x === 'string')) m.sort();
      return m;
    }
    if (v && typeof v === 'object') { const o = {}; Object.keys(v).sort().forEach(k => { const n = norm(v[k]); if (!isEmpty(n)) o[k] = n; }); return o; }
    return v;
  };
  /* Bookkeeping that is not user-visible data and legitimately differs
     between two converged devices: tombstones (a stale older tombstone for a
     record that is alive again), the per-tab add/close stamp maps, and
     noteHistory (a side-log deliberately never stamped, v03.97). The effect
     of each is still checked through the data it governs. */
  const view = (db) => { const o = clone(db); delete o.tombstones; delete o.tabsAt; delete o.tabsX;
    (o.articles || []).forEach(a => { if (a) delete a.noteHistory; }); return norm(o); };
  const diff = (a, b, p = '', out = []) => {
    if (out.length > 12) return out;
    if (Array.isArray(a) && Array.isArray(b) && a.every(x => x && x.id != null) && b.every(x => x && x.id != null) && (a.length || b.length)) {
      const ia = {}, ib = {}; a.forEach(x => ia[x.id] = x); b.forEach(x => ib[x.id] = x);
      new Set([...Object.keys(ia), ...Object.keys(ib)]).forEach(id => {
        if (!(id in ia)) out.push(`${p}[${id}]: missing (expected present)`);
        else if (!(id in ib)) out.push(`${p}[${id}]: present (expected absent)`);
        else diff(ia[id], ib[id], `${p}[${id}]`, out);
      });
      return out;
    }
    if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
      new Set([...Object.keys(a), ...Object.keys(b)]).forEach(k => diff(a[k], b[k], p ? `${p}.${k}` : k, out));
      return out;
    }
    const sa = JSON.stringify(a), sb = JSON.stringify(b);
    if (sa !== sb) out.push(`${p}: got ${String(sa).slice(0, 70)} want ${String(sb).slice(0, 70)}`);
    return out;
  };
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  let promptQ = [];
  window.prompt = () => (promptQ.length ? promptQ.shift() : null);
  window.confirm = () => true;
  window.alert = () => {};
  const reseed = () => { try { _seedThemeSnap(); } catch (e) {} try { if (typeof _seedRecSnap === 'function') _seedRecSnap(); } catch (e) {} };
  window.__A = {
    clone, norm, view, diff, sleep, reseed,
    prompts: (...v) => { promptQ = v; },
    pickColour: (hex) => { window._showClrPicker = (ev, cur, cb) => cb(hex); },
    calForm: (v) => {
      document.querySelectorAll('[id^="cef-"]').forEach(e => e.remove());
      const add = (id, val, type) => { const e = document.createElement('input'); e.id = id; if (type) e.type = type; if (type === 'checkbox') e.checked = val; else e.value = val; e.style.display = 'none'; document.body.appendChild(e); };
      add('cef-title', v.title); add('cef-date', v.date); add('cef-allday', true, 'checkbox');
    },
    editContent: (aid, html) => { selArt(aid); startEdit(); const ed = document.getElementById('ed'); ed.insertAdjacentHTML('beforeend', html); saveArt(); },
    editTitle: (aid, title) => { selArt(aid); startEdit(); ST.etitle = title; saveArt(); },
    reset: () => {
      try { hideCtx(); } catch (e) {} try { closeModal(); } catch (e) {}
      document.querySelectorAll('.float-win').forEach(w => w.remove());
      ST.editing = false; ST.article = null; ST.tabOwner = null;
      DB = clone(window.__BASE);
      try { if (typeof _histReset === 'function') _histReset(); else { HISTORY.length = 0; HISTORY.push(JSON.stringify(DB)); HIST_POS = 0; } } catch (e) {}   /* v04.91: the history is frames, not whole-notebook strings */
      window._showClrPicker = window.__origClr;
      reseed(); render();
    },
  };
  window.__origClr = window._showClrPicker;
  window.__BASE = clone(DB);
};

async function runOne(page, test) {
  return page.evaluate(async ({ setup, op, bop, bFirst, check, expectNoChange }) => {
    const A = window.__A, ev = (s) => (s ? (0, eval)('(' + s + ')') : null);
    const res = { changed: [], d1: [], d2: [], stable: [], eq: [], ord: [], error: null };
    try {
      A.reset();
      if (setup) { await ev(setup)(); await A.sleep(15); }
      A.reseed();
      const A0 = A.clone(DB);
      let B1 = A0;
      const runB = async () => { const H = HISTORY.slice(), P = HIST_POS; DB = A.clone(A0); A.reseed(); await A.sleep(15); await ev(bop)(); await A.sleep(5); B1 = A.clone(DB); window.__B1 = A.clone(B1); DB = A.clone(A0); A.reseed(); HISTORY.length = 0; H.forEach(x => HISTORY.push(x)); HIST_POS = P; if (typeof _histRebase === 'function') _histRebase(); ST.editing = false; ST.article = null; };
      if (bop && bFirst) await runB();
      await A.sleep(15);
      await ev(op)();
      try { _stampThemeTouches(); } catch (e) {}
      const A1 = A.clone(DB);
      if (bop && !bFirst) await runB();
      res.changed = A.diff(A.view(A1), A.view(A0));
      const MB = mergeDB(A.clone(B1), A.clone(A1)); // B receives A
      const MA = mergeDB(A.clone(A1), A.clone(B1)); // A receives B
      if (check) {
        const probs = ev(check)({ MB, MA, A1, B1, A0 });
        res.d1 = probs.filter(x => x.startsWith('dir1')); res.d2 = probs.filter(x => x.startsWith('dir2'));
      } else if (expectNoChange) {
        const R = (d) => { const o = {}; ['articles','folders','sections','calEvents','calCategories','noteKinds','noteKindCats','myFavCats','folderGroups','jebPockets','jeb','sfItems','globalTags','tombstones','trash'].forEach(k => o[k] = A.clone(d[k] ?? null)); (o.articles || []).forEach(a => { if (a) delete a.noteHistory; }); return A.norm(o); };
        const ch = A.diff(R(A1), R(A0));
        res.d1 = ch.length ? ['op changed synced records: ' + ch.join('; ')] : [];
      } else {
        res.d1 = A.diff(A.view(MB), A.view(A1));
        res.d2 = A.diff(A.view(MA), A.view(A1));
      }
      /* 51i (v04.89) — merging the assembled per-record copy must equal merging
         the blob: mergeDB(local, assemble(recsOf(remote))) vs mergeDB(local,
         remote), both directions. Contents + id-sets must be identical (a
         failure); array ORDER is compared separately and listed, never hidden. */
      res.eq = []; res.ord = [];
      for (const [dir, loc, rem, want] of [['dir1', B1, A1, MB], ['dir2', A1, B1, MA]]) {
        const got = mergeDB(A.clone(loc), _s1RecsAsDB(A.clone(rem)));
        const nw = JSON.stringify(A.norm(want)), ng = JSON.stringify(A.norm(got));
        if (nw !== ng) res.eq.push(dir + ': ' + A.diff(A.norm(got), A.norm(want)).slice(0, 3).join('; '));
        for (const c of ['articles', 'folders', 'sections', 'calEvents', 'calCategories', 'noteKinds', 'noteKindCats', 'myFavCats', 'folderGroups', 'jebPockets', 'jeb', 'trash', 'tombstones']) {
          const ids = (x) => (x[c] || []).map((r) => (r && r.id != null ? r.id : '(no id)'));
          const a = ids(want), b = ids(got);
          if (a.slice().sort().join('|') !== b.slice().sort().join('|')) res.eq.push(dir + ': ' + c + ' id-set differs');
          else if (a.join('|') !== b.join('|')) res.ord.push(dir + ': ' + c + ' order blob=[' + a.join(',') + '] recs=[' + b.join(',') + ']');
        }
      }
      const MB2 = mergeDB(A.clone(MB), A.clone(MA)), MA2 = mergeDB(A.clone(MA), A.clone(MB));
      res.stable = A.diff(A.view(MB2), A.view(MA2)).map(x => 'devices disagree: ' + x)
        .concat(A.diff(A.view(MB2), A.view(MB)).map(x => 'not idempotent: ' + x));
    } catch (e) { res.error = String(e && e.stack || e).split('\n').slice(0, 3).join(' | '); }
    return res;
  }, { setup: src(test.setup), op: src(test.op), bop: src(test.bop), bFirst: !!test.bFirst, check: src(test.check), expectNoChange: !!test.expectNoChange });
}

const { page, errors, close } = await openApp({ viewport: { width: VW, height: VH }, db: baseDB() });
await page.evaluate(PAGE_LIB);
const results = [];
for (const test of T) {
  if (ONLY.length && !ONLY.some(o => test.name.startsWith(o))) continue;
  const r = await runOne(page, test);
  let status;
  if (r.error) status = 'ERROR';
  else if (!test.check && !test.expectNoChange && !r.changed.length) status = 'NOTRUN';
  else if (test.expectNoChange) status = r.d1.length ? 'FAIL' : 'PASS';
  else {
    const f1 = r.d1.length > 0, f2 = r.d2.length > 0;
    status = (f1 || f2 || r.stable.length || r.eq.length) ? 'FAIL' : 'PASS';
    if (status === 'FAIL' && test.byDesign && [...r.d1, ...r.d2].every(x => x.includes('by design')) && !r.stable.length) status = 'BY-DESIGN';
    if (status === 'FAIL' && test.known) status = 'KNOWN';
  }
  if (!r.error && r.eq.length) status = 'FAIL';   /* 51i is never excused by known / by-design */
  const row = { name: test.name, area: test.area, status,
    dir1: r.error ? '-' : (r.d1.length ? 'FAIL' : 'ok'), dir2: r.error ? '-' : (r.d2.length ? 'FAIL' : 'ok'),
    stable: r.error ? '-' : (r.stable.length ? 'FAIL' : 'ok'), detail: r };
  results.push(row);
  console.log(`${status.padEnd(9)} d1:${row.dir1.padEnd(4)} d2:${row.dir2.padEnd(4)} st:${row.stable.padEnd(4)} ${test.name}`);
  r.eq.slice(0, 4).forEach(x => console.log('          51i (recs ≠ blob): ' + x));
  r.ord.slice(0, 2).forEach(x => console.log('          51i order (listed): ' + x.slice(0, 400)));
  if (status !== 'PASS') {
    if (r.error) console.log('          error: ' + r.error);
    r.d1.slice(0, 4).forEach(x => console.log('          dir1 (B receives A): ' + x));
    r.d2.slice(0, 4).forEach(x => console.log('          dir2 (A receives B): ' + x));
    r.stable.slice(0, 3).forEach(x => console.log('          stable: ' + x));
    if (status === 'NOTRUN') console.log('          op changed nothing in DB');
  }
}
const n = (s) => results.filter(r => r.status === s).length;
console.log(`\nTOTAL ${results.length}: PASS ${n('PASS')}, FAIL ${n('FAIL')}, BY-DESIGN ${n('BY-DESIGN')}, KNOWN ${n('KNOWN')}, NOTRUN ${n('NOTRUN')}, ERROR ${n('ERROR')}`);
{
  const ran = results.filter(r => !r.detail.error), eqBad = ran.filter(r => r.detail.eq.length), ordBad = ran.filter(r => r.detail.ord.length);
  console.log(`51i recs-vs-blob equivalence: ${ran.length - eqBad.length}/${ran.length} operations identical in both directions; order differs in ${ordBad.length}${ordBad.length ? ' (' + ordBad.map(r => r.name.split(' ')[0]).join(', ') + ')' : ''}`);
}
if (errors.length) console.log('page errors:\n  ' + errors.slice(0, 10).join('\n  '));
if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify(results, null, 1));
await close();
process.exit(n('FAIL') + n('ERROR') + n('NOTRUN') ? 1 : 0);
