# Siyagah — Function Inventory

*Generated mechanically by `node tools/inventory.mjs` from `index.html`.
Do not hand-edit: re-run it.*

| | |
|---|---|
| App version | v04.35 |
| Generated | 2026-09-19 |
| Application script | 19,012 lines |
| Application-defined functions | **1052** |
| …reachable (called in script or named in markup) | 1040 |
| …never referenced anywhere | 12 |
| …that mutate the data model | 310 |
| …that reach a persistence boundary | 225 |
| …classified destructive | 37 |
| …privacy-sensitive (export / identity) | 11 |
| …that touch the network | 13 |
| Inline `on*` handlers in markup | **1077** |
| Distinct functions those handlers call | 557 |
| Distinct DOM ids | 251 |

## Functions never referenced anywhere

- `newJournalEntry`
- `cycleJrnSize`
- `_mrjDueCount`
- `_rangeAtPoint`
- `rmFolder`
- `rmArt`
- `mobBack`
- `tapCtx`
- `toggleTagPanel`
- `artKind`
- `setNoteKind`
- `applyTag`

## By domain

- **other / helpers** — 461
- **menus / dialogs** — 101
- **organisation** — 86
- **tags / types / tabs** — 82
- **calendar / journal / contacts / database** — 79
- **editor / pop-out** — 66
- **find / smart views** — 43
- **render** — 33
- **cloud sync / auth** — 26
- **theme / appearance** — 25
- **destructive** — 19
- **export / import / backup** — 16
- **persistence** — 7
- **reminders / review** — 7
- **startup / load / migration** — 1

## Full inventory

Legend: **M** mutates model · **P** persists · **N** network · **D** destructive ·
**Pr** privacy-sensitive · **R** reachable

| Function | Line | Lines | Domain | M | P | N | D | Pr | R | Callers |
|---|---:|---:|---|:-:|:-:|:-:|:-:|:-:|:-:|---:|
| `loadDB` | 2918 | 132 | startup / load / migration | ● | ● |  | ● |  | ● | 1 |
| `_tiScheduleAutoSave` | 3085 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `_save` | 3105 | 45 | persistence |  | ● |  |  |  | ● | 13 |
| `persist` | 3150 | 1 | persistence |  | ● |  |  |  | ● | 201 |
| `_snapshotShell` | 3186 | 4 | export / import / backup |  |  |  |  | ● | ● | 1 |
| `_cleanExportRoot` | 3190 | 70 | export / import / backup |  |  |  |  | ● | ● | 1 |
| `getExportHTML` | 3263 | 20 | export / import / backup |  |  |  |  | ● | ● | 5 |
| `exportFile` | 3284 | 11 | export / import / backup |  | ● |  |  | ● | ● | 1 |
| `exportDeploy` | 3300 | 14 | export / import / backup |  | ● |  |  | ● | ● | 0 |
| `exportJSON` | 3314 | 1 | export / import / backup |  |  |  |  | ● | ● | 0 |
| `importJSON` | 3329 | 42 | export / import / backup | ● | ● |  | ● |  | ● | 0 |
| `toast` | 3373 | 1 | menus / dialogs |  |  |  |  |  | ● | 193 |
| `mkDefaults` | 3376 | 17 | other / helpers |  |  |  |  |  | ● | 1 |
| `uid` | 3395 | 1 | other / helpers |  |  |  |  | ● | ● | 84 |
| `esc` | 3396 | 603 | other / helpers | ● | ● |  |  |  | ● | 379 |
| `_navBtnsHTML` | 4005 | 8 | other / helpers |  |  |  |  |  | ● | 1 |
| `renderP3H` | 4013 | 221 | render | ● |  |  |  |  | ● | 80 |
| `renderP3C` | 4235 | 100 | render | ● |  |  |  |  | ● | 78 |
| `collapseFolder` | 4339 | 4 | organisation |  |  |  |  |  | ● | 2 |
| `selFolder` | 4344 | 14 | organisation |  |  |  |  |  | ● | 9 |
| `selArt` | 4358 | 8 | other / helpers | ● | ● |  |  |  | ● | 8 |
| `back` | 4366 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `togExp` | 4367 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `toggleSB` | 4373 | 11 | other / helpers |  |  |  |  |  | ● | 0 |
| `updateSbToggle` | 4385 | 13 | other / helpers |  |  |  |  |  | ● | 6 |
| `_fwOwns` | 4415 | 1 | editor / pop-out |  |  |  |  |  | ● | 3 |
| `_fwRaise` | 4416 | 6 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `startEdit` | 4422 | 5 | editor / pop-out | ● |  |  |  |  | ● | 1 |
| `cancelEdit` | 4427 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `saveArt` | 4428 | 41 | persistence | ● | ● |  |  |  | ● | 6 |
| `_sameArr` | 4459 | 1 | other / helpers |  |  |  |  |  | ● | 2 |
| `doSearch` | 4479 | 1 | find / smart views |  |  |  |  |  | ● | 1 |
| `clearSearch` | 4480 | 9 | find / smart views |  |  |  |  |  | ● | 4 |
| `restoreLastSearch` | 4489 | 7 | find / smart views |  |  |  |  |  | ● | 0 |
| `focusSidebarSearch` | 4496 | 4 | find / smart views |  |  |  |  |  | ● | 0 |
| `_updateSearchAccessUI` | 4500 | 6 | find / smart views |  |  |  |  |  | ● | 3 |
| `_renderP2SearchBar` | 4506 | 9 | render |  |  |  |  |  | ● | 1 |
| `_renderP3SearchBar` | 4515 | 14 | render | ● |  |  |  |  | ● | 2 |
| `goHome` | 4535 | 16 | other / helpers |  |  |  |  |  | ● | 1 |
| `ec` | 4552 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_alignBtnsHTML` | 4553 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `_txszStep` | 4566 | 15 | other / helpers |  |  |  |  |  | ● | 2 |
| `_txStepIn` | 4584 | 49 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `inEd` | 4586 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `edFontStep` | 4633 | 10 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_txClearIn` | 4647 | 24 | other / helpers |  |  |  |  |  | ● | 2 |
| `inRange` | 4652 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `edClearFmt` | 4671 | 8 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_curHeadingTag` | 4685 | 12 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `shiftHeadingLevel` | 4697 | 14 | other / helpers |  |  |  |  |  | ● | 1 |
| `shiftAllHeadingsMenu` | 4711 | 8 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `shiftAllHeadings` | 4719 | 21 | other / helpers |  |  |  |  |  | ● | 0 |
| `fb` | 4740 | 15 | other / helpers |  |  |  |  |  | ● | 0 |
| `_edHost` | 4768 | 7 | editor / pop-out |  |  |  |  |  | ● | 7 |
| `_edActive` | 4775 | 9 | editor / pop-out |  |  |  |  |  | ● | 13 |
| `_edTouched` | 4786 | 6 | persistence |  |  |  |  |  | ● | 4 |
| `_isED` | 4792 | 1 | other / helpers |  |  |  |  |  | ● | 9 |
| `_edAidOf` | 4796 | 6 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `_edArtOf` | 4802 | 4 | editor / pop-out | ● |  |  |  |  | ● | 4 |
| `_restoreCaret` | 4811 | 7 | destructive |  |  |  |  |  | ● | 5 |
| `insertAtCaret` | 4818 | 25 | editor / pop-out |  |  |  |  |  | ● | 13 |
| `_vpW` | 4845 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `_vpH` | 4846 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `isURL` | 4847 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `extractURL` | 4850 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `_dom` | 4856 | 1 | other / helpers |  |  |  |  |  | ● | 5 |
| `compressImage` | 4859 | 20 | other / helpers |  |  |  |  |  | ● | 1 |
| `insertImageFile` | 4879 | 4 | other / helpers |  |  |  |  |  | ● | 1 |
| `bkCardHTML` | 4886 | 7 | menus / dialogs |  |  |  |  |  | ● | 3 |
| `videoCardHTML` | 4896 | 11 | menus / dialogs |  |  |  |  |  | ● | 4 |
| `vidMentionHTML` | 4909 | 5 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `fetchVideoTitle` | 4914 | 8 | other / helpers |  |  | ● |  |  | ● | 2 |
| `embedHTML` | 4922 | 10 | other / helpers |  |  |  |  |  | ● | 2 |
| `bkMove` | 4933 | 5 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeItemMenu` | 4940 | 5 | menus / dialogs |  |  |  |  |  | ● | 19 |
| `_imOut` | 4946 | 3 | other / helpers |  |  |  |  |  | ● | 0 |
| `_itemTitle` | 4949 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `bkItemMenu` | 4956 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_popMenu` | 4957 | 8 | menus / dialogs |  |  |  |  |  | ● | 3 |
| `convertLinkEl` | 4965 | 13 | theme / appearance |  |  |  |  |  | ● | 4 |
| `itemMenu` | 4978 | 95 | menus / dialogs | ● | ● |  |  |  | ● | 3 |
| `mk` | 4982 | 3 | other / helpers |  |  |  |  |  | ● | 18 |
| `go` | 4983 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `doSearch` | 5012 | 40 | find / smart views | ● | ● |  |  |  | ● | 2 |
| `go` | 5022 | 5 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `go` | 5032 | 4 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `go` | 5041 | 3 | other / helpers |  | ● |  |  |  | ● | 0 |
| `attachChooser` | 5073 | 44 | other / helpers | ● | ● |  |  |  | ● | 2 |
| `go` | 5096 | 15 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `closeImgRszBar` | 5121 | 6 | other / helpers |  |  |  |  |  | ● | 3 |
| `_imgRszOut` | 5127 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `showImgRszBar` | 5133 | 42 | other / helpers |  |  |  |  |  | ● | 1 |
| `btn` | 5137 | 2 | other / helpers |  |  |  |  |  | ● | 4 |
| `go` | 5138 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `sep` | 5139 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `applyPx` | 5151 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `imgAttachTag` | 5177 | 49 | tags / types / tabs | ● | ● |  |  |  | ● | 1 |
| `renderTags` | 5189 | 26 | render |  | ● |  |  |  | ● | 2 |
| `go` | 5195 | 5 | other / helpers |  | ● |  |  |  | ● | 0 |
| `isMyWallSubfolder` | 5232 | 9 | organisation | ● |  |  |  |  | ● | 0 |
| `togMwSubGrp` | 5241 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `togMwSubCat` | 5248 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `renderMyWallSubfolder` | 5254 | 97 | render | ● |  |  |  |  | ● | 0 |
| `_subtreeArts` | 5266 | 5 | organisation |  |  |  |  |  | ● | 1 |
| `_kindLatest` | 5300 | 1 | tags / types / tabs |  |  |  |  |  | ● | 4 |
| `_sortKinds` | 5301 | 4 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `newJournalEntry` | 5356 | 19 | calendar / journal / contacts / database | ● | ● |  |  |  |  | 0 |
| `toggleArchive` | 5378 | 9 | tags / types / tabs | ● | ● |  |  |  | ● | 1 |
| `mkArtTitleOnly` | 5393 | 28 | other / helpers | ● | ● |  |  |  | ● | 1 |
| `qtKey` | 5421 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `qtSave` | 5425 | 8 | other / helpers |  |  |  |  |  | ● | 1 |
| `openLinkToNote` | 5438 | 41 | theme / appearance | ● |  |  |  |  | ● | 0 |
| `render` | 5442 | 24 | render | ● |  |  |  |  | ● | 32 |
| `ltnSearch` | 5479 | 25 | find / smart views | ● |  |  |  |  | ● | 1 |
| `toggleNoteLink` | 5504 | 17 | theme / appearance | ● | ● |  |  |  | ● | 0 |
| `_posAnnBubble` | 5532 | 12 | other / helpers |  |  |  |  |  | ● | 1 |
| `showAnnBubble` | 5544 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `hideAnnBubble` | 5551 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `annBubClick` | 5558 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `wireAnnEditor` | 5567 | 14 | other / helpers |  |  |  |  |  | ● | 1 |
| `onUp` | 5568 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `openAnnModal` | 5583 | 1479 | menus / dialogs | ● | ● | ● | ● |  | ● | 1 |
| `_uploadToDrive` | 7062 | 9 | other / helpers |  |  | ● |  |  | ● | 0 |
| `syncKnowledgeBase` | 7074 | 14 | other / helpers | ● | ● |  |  |  | ● | 1 |
| `importBackup` | 7093 | 46 | export / import / backup |  |  |  |  |  | ● | 0 |
| `_mergeBackup` | 7140 | 11 | export / import / backup | ● | ● |  |  |  | ● | 1 |
| `_replaceWithBackup` | 7152 | 16 | export / import / backup | ● | ● |  |  |  | ● | 1 |
| `_weekOfMonth` | 7171 | 1 | other / helpers |  |  |  |  |  | ● | 2 |
| `toggleJournalMode` | 7172 | 5 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `quickJournalEntry` | 7177 | 11 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 2 |
| `openAddNoteToEvent` | 7189 | 13 | other / helpers | ● |  |  |  |  | ● | 0 |
| `_aneFilter` | 7202 | 5 | find / smart views |  |  |  |  |  | ● | 0 |
| `addExistingNoteToEvent` | 7207 | 12 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `moveJrnEvent` | 7221 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `togJrnGrp` | 7229 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `jrnGroupDate` | 7233 | 5 | organisation | ● |  |  |  |  | ● | 3 |
| `setJrnGroupBy` | 7238 | 7 | organisation | ● | ● |  |  |  | ● | 0 |
| `_jrnGroupByToggleHTML` | 7245 | 7 | organisation | ● |  |  |  |  | ● | 2 |
| `_buildJournalView` | 7252 | 42 | calendar / journal / contacts / database |  |  |  |  |  | ● | 3 |
| `_renderJournalFolder` | 7294 | 6 | render | ● |  |  |  |  | ● | 0 |
| `_renderJournalSmartView` | 7300 | 44 | render | ● |  |  |  |  | ● | 1 |
| `toggleAccordionSec` | 7348 | 6 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `updateAccordionBtn` | 7354 | 4 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_getFavCats` | 7369 | 4 | tags / types / tabs |  |  |  |  |  | ● | 8 |
| `selDbItem` | 7373 | 7 | calendar / journal / contacts / database |  |  |  |  |  | ● | 4 |
| `renderDatabaseSection` | 7380 | 36 | render | ● |  |  |  |  | ● | 0 |
| `_renderMyJournalDB` | 7416 | 1 | render |  |  |  |  |  | ● | 0 |
| `renameJrnEvent` | 7419 | 6 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_setJrnStyle` | 7425 | 9 | other / helpers | ● | ● |  | ● |  | ● | 2 |
| `pickJrnColor` | 7434 | 6 | theme / appearance | ● |  |  |  |  | ● | 0 |
| `cycleJrnSize` | 7440 | 7 | other / helpers | ● |  |  |  |  |  | 0 |
| `resetJrnStyle` | 7447 | 4 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `_jrnCardStyleTag` | 7451 | 9 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_jrnSizeLive` | 7460 | 10 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_jrnSizeCommit` | 7470 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `_jrnStyleMenu` | 7471 | 29 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `_renderMyFavourites` | 7500 | 40 | render | ● |  |  |  |  | ● | 0 |
| `addFavCat` | 7541 | 12 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `showFavCatCtx` | 7553 | 13 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `renameFavCat` | 7566 | 7 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `deleteFavCat` | 7573 | 7 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `setNoteFavCat` | 7580 | 8 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `newFavEntry` | 7588 | 23 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `_ctName` | 7615 | 5 | other / helpers |  |  |  |  |  | ● | 15 |
| `newContact` | 7621 | 22 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `toggleCTMode` | 7644 | 14 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `toggleCTNameMode` | 7659 | 14 | other / helpers | ● |  |  |  |  | ● | 0 |
| `addCTPhone` | 7674 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `_saveContactForm` | 7683 | 21 | persistence |  | ● |  |  |  | ● | 1 |
| `renderCTCard` | 7705 | 20 | render |  |  |  |  |  | ● | 1 |
| `renderCTForm` | 7726 | 38 | render |  |  |  |  |  | ● | 1 |
| `_renderMyContacts` | 7765 | 22 | render | ● |  |  |  |  | ● | 0 |
| `showDbItemCtx` | 7791 | 42 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_renderWhoBar` | 7839 | 11 | render |  |  |  |  |  | ● | 1 |
| `_whoSearch` | 7851 | 22 | find / smart views | ● |  |  |  |  | ● | 0 |
| `_whoClear` | 7874 | 4 | other / helpers |  |  |  |  |  | ● | 1 |
| `_whoSelect` | 7879 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `logInteraction` | 7885 | 17 | other / helpers | ● | ● |  |  |  | ● | 1 |
| `_elapsed` | 7904 | 11 | other / helpers |  |  |  |  |  | ● | 3 |
| `_renderInteractionLog` | 7917 | 25 | render |  |  |  |  |  | ● | 1 |
| `newStarredNote` | 7946 | 12 | other / helpers | ● | ● |  |  |  | ● | 1 |
| `newPinnedNote` | 7959 | 12 | tags / types / tabs | ● | ● |  |  |  | ● | 1 |
| `newNoteWithReminder` | 7972 | 12 | reminders / review | ● | ● |  |  |  | ● | 1 |
| `quickJournalEntryFromDB` | 7985 | 16 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `_trackLastFolder` | 8003 | 6 | organisation | ● |  |  |  |  | ● | 2 |
| `newJournalFolder` | 8013 | 14 | organisation |  |  |  |  |  | ● | 0 |
| `_njfRow` | 8027 | 7 | other / helpers |  |  |  |  |  | ● | 2 |
| `njfFilter` | 8034 | 18 | find / smart views | ● |  |  |  |  | ● | 2 |
| `rows` | 8043 | 1 | other / helpers |  |  |  |  |  | ● | 4 |
| `njfSelect` | 8052 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `createNewJournalFolder` | 8056 | 26 | organisation | ● | ● |  |  |  | ● | 0 |
| `calJournalFolderIds` | 8085 | 10 | organisation | ● |  |  |  |  | ● | 2 |
| `calJournalEntries` | 8095 | 6 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 4 |
| `calJournalCount` | 8101 | 1 | calendar / journal / contacts / database |  |  |  |  |  | ● | 2 |
| `openJrnCalScope` | 8102 | 32 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 3 |
| `_jrnScopeSetMode` | 8134 | 3 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_jrnScopeSetOne` | 8137 | 3 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_jrnScopeToggle` | 8140 | 7 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `_calInit` | 8150 | 23 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 9 |
| `_calWeekStart` | 8173 | 1 | calendar / journal / contacts / database |  |  |  |  |  | ● | 2 |
| `_calOpen` | 8174 | 6 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `_calNav` | 8180 | 20 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `_calToday` | 8200 | 7 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_calRenderH` | 8207 | 58 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 2 |
| `_loadCalHols` | 8265 | 10 | calendar / journal / contacts / database |  | ● | ● |  |  | ● | 5 |
| `_calPublicHols` | 8275 | 10 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 3 |
| `_calSchoolHols` | 8285 | 15 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 3 |
| `_calHolsForDate` | 8300 | 6 | find / smart views |  |  |  |  |  | ● | 3 |
| `_calNoteCount` | 8306 | 3 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `_calSelectDate` | 8309 | 44 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `close` | 8349 | 1 | other / helpers |  |  |  |  |  | ● | 2 |
| `_calNewNote` | 8353 | 14 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `_calNewJournal` | 8367 | 15 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `_calViewNotes` | 8382 | 9 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `_calRenderMonth` | 8391 | 48 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `_calRenderWeek` | 8439 | 27 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `_calRenderYear` | 8466 | 27 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `openCalSettings` | 8493 | 14 | calendar / journal / contacts / database | ● | ● |  | ● |  | ● | 0 |
| `_showClrPicker` | 8513 | 51 | menus / dialogs |  |  |  |  |  | ● | 12 |
| `close` | 8561 | 1 | other / helpers |  |  |  |  |  | ● | 2 |
| `togClrFam` | 8564 | 9 | other / helpers |  |  |  |  |  | ● | 0 |
| `_clrHover` | 8573 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `_clrPick` | 8577 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `openFolClrPicker` | 8581 | 5 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `openSecClrPicker` | 8586 | 5 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `openKindClrPicker` | 8591 | 10 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `openSfClrPicker` | 8605 | 4 | find / smart views |  |  |  |  |  | ● | 0 |
| `openDbItemClrPicker` | 8609 | 10 | calendar / journal / contacts / database | ● | ● |  | ● |  | ● | 0 |
| `openThemeClrPicker` | 8619 | 16 | theme / appearance |  |  |  |  |  | ● | 0 |
| `showTagClrPicker` | 8637 | 14 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `openTabClrPicker` | 8651 | 7 | tags / types / tabs | ● | ● |  | ● |  | ● | 0 |
| `_popGeoAll` | 8670 | 13 | menus / dialogs | ● |  |  |  |  | ● | 7 |
| `_popGeoFlush` | 8683 | 6 | menus / dialogs |  | ● |  |  |  | ● | 5 |
| `openNoteAsModal` | 8696 | 30 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `openNoteModal` | 8726 | 75 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_p3SheetHdSync` | 8805 | 16 | menus / dialogs | ● |  |  |  |  | ● | 2 |
| `closeNoteModal` | 8821 | 40 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `_ptrDown` | 8870 | 5 | other / helpers |  |  |  |  |  | ● | 11 |
| `_ptrUp` | 8875 | 5 | other / helpers |  |  |  |  |  | ● | 13 |
| `_modalDragStart` | 8880 | 8 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_modalDragMove` | 8888 | 7 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalDragEnd` | 8895 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalHandlesOff` | 8904 | 21 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_modalClampToViewport` | 8929 | 10 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_modalResizeRStart` | 8939 | 9 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeRMove` | 8948 | 6 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeREnd` | 8954 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBStart` | 8955 | 9 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBMove` | 8964 | 6 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBEnd` | 8970 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeLStart` | 8971 | 9 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeLMove` | 8980 | 7 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeLEnd` | 8987 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeTStart` | 8988 | 9 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_modalResizeTMove` | 8997 | 8 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeTEnd` | 9005 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_tabBarModalDown` | 9006 | 22 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `onMove` | 9013 | 10 | other / helpers |  |  |  |  |  | ● | 0 |
| `onUp` | 9023 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_tabBarCursor` | 9028 | 7 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_openFloatPop` | 9045 | 20 | menus / dialogs |  |  |  |  |  | ● | 3 |
| `_cl` | 9056 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `_flPopPlace` | 9081 | 26 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `closeFloatPop` | 9107 | 1 | menus / dialogs |  |  |  |  |  | ● | 7 |
| `_closeStickyPop` | 9110 | 6 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_p3HomeBtnHTML` | 9127 | 5 | other / helpers |  |  |  |  |  | ● | 3 |
| `_p3OneBar` | 9155 | 1 | other / helpers |  |  |  |  |  | ● | 8 |
| `_p3EditIconsHTML` | 9156 | 27 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ebOpenTabsHTML` | 9194 | 22 | tags / types / tabs | ● |  |  |  |  | ● | 1 |
| `row` | 9204 | 7 | other / helpers |  |  |  |  |  | ● | 6 |
| `togEBGroup` | 9216 | 12 | organisation |  |  |  |  |  | ● | 0 |
| `_ebListsHTML` | 9256 | 9 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ebInsertHTML` | 9265 | 8 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ebAttachHTML` | 9287 | 41 | other / helpers |  |  |  |  |  | ● | 1 |
| `row` | 9297 | 2 | other / helpers |  |  |  |  |  | ● | 6 |
| `_ebGoToHTML` | 9332 | 11 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ebNoteStateHTML` | 9377 | 18 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ebSectionToolsHTML` | 9395 | 11 | organisation | ● |  |  |  |  | ● | 2 |
| `_buildEBSub` | 9406 | 87 | other / helpers | ● |  |  |  |  | ● | 1 |
| `duplicateNote` | 9500 | 25 | other / helpers | ● | ● |  | ● |  | ● | 1 |
| `_fwFocus` | 9548 | 9 | editor / pop-out |  |  |  |  |  | ● | 3 |
| `_popTier` | 9590 | 1 | menus / dialogs |  |  |  |  |  | ● | 6 |
| `_popIcoHTML` | 9602 | 15 | menus / dialogs |  |  |  |  |  | ● | 4 |
| `_popBtnHTML` | 9620 | 9 | menus / dialogs |  |  |  |  |  | ● | 4 |
| `_popKindLbl` | 9631 | 4 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_notePopMode` | 9635 | 4 | menus / dialogs | ● |  |  |  |  | ● | 1 |
| `_rememberNotePop` | 9642 | 8 | reminders / review | ● | ● |  |  |  | ● | 1 |
| `openNotePopup` | 9652 | 7 | editor / pop-out |  |  |  |  |  | ● | 3 |
| `closeAllFloats` | 9662 | 6 | other / helpers |  | ● |  |  |  | ● | 3 |
| `closeAllPopouts` | 9668 | 5 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `popOutNote` | 9742 | 32 | editor / pop-out |  |  |  |  |  | ● | 4 |
| `_fwDefaultGeom` | 9784 | 11 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_fwCreate` | 9795 | 48 | editor / pop-out | ● |  |  |  |  | ● | 1 |
| `_syncCol` | 9824 | 4 | cloud sync / auth |  |  |  |  |  | ● | 0 |
| `_fwResizeStart` | 9848 | 25 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `move` | 9854 | 10 | other / helpers |  |  |  |  |  | ● | 1 |
| `up` | 9864 | 5 | other / helpers |  |  |  |  |  | ● | 1 |
| `_fwAddResizeHandles` | 9873 | 14 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_fwSavePos` | 9891 | 11 | editor / pop-out |  | ● |  |  |  | ● | 3 |
| `_fwMetaHTML` | 9907 | 25 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_findEls` | 9947 | 14 | destructive |  |  |  |  |  | ● | 6 |
| `_ntFindRanges` | 9961 | 19 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ntFindPaint` | 9980 | 8 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ntFindLabel` | 9988 | 4 | other / helpers |  |  |  |  |  | ● | 4 |
| `_ntFindRun` | 9992 | 9 | other / helpers |  |  |  |  |  | ● | 0 |
| `_ntFindStep` | 10001 | 13 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ntFindToggle` | 10014 | 8 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ntFindClose` | 10022 | 7 | other / helpers |  |  |  |  |  | ● | 6 |
| `_ntFindKey` | 10029 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `_noteSiblings` | 10051 | 9 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_p3Navigate` | 10062 | 10 | other / helpers |  |  |  |  |  | ● | 2 |
| `_fwNavigate` | 10072 | 23 | editor / pop-out |  | ● |  |  |  | ● | 0 |
| `_fwFlashSaved` | 10095 | 7 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_fwRenderBody` | 10102 | 47 | editor / pop-out | ● |  |  |  |  | ● | 1 |
| `_fwEc` | 10158 | 6 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_fwFb` | 10164 | 13 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_fwFontStep` | 10179 | 7 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_fwClearFmt` | 10186 | 7 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_fwBuildEBSub` | 10193 | 48 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_fwTogGroup` | 10242 | 8 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_fwWireDrag` | 10250 | 23 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `move` | 10253 | 4 | other / helpers |  |  |  |  |  | ● | 1 |
| `up` | 10257 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `_fwFlush` | 10277 | 13 | editor / pop-out | ● |  |  |  |  | ● | 5 |
| `_fwSave` | 10290 | 10 | editor / pop-out | ● | ● |  |  |  | ● | 0 |
| `_fwScheduleAutoSave` | 10305 | 18 | editor / pop-out | ● | ● |  | ● |  | ● | 7 |
| `closeFloatWin` | 10325 | 16 | other / helpers | ● | ● |  | ● |  | ● | 2 |
| `_modalResizeTRStart` | 10344 | 9 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeTRMove` | 10353 | 10 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeTREnd` | 10363 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeTLStart` | 10365 | 9 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeTLMove` | 10374 | 9 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeTLEnd` | 10383 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBLStart` | 10385 | 9 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBLMove` | 10394 | 8 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBLEnd` | 10402 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBRStart` | 10407 | 9 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBRMove` | 10416 | 7 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBREnd` | 10423 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_tabBarModalReset` | 10426 | 14 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `setMwFontSize` | 10442 | 9 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `todayStr` | 10454 | 4 | other / helpers |  |  |  |  |  | ● | 6 |
| `togCalLayer` | 10458 | 6 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `_calGetCat` | 10464 | 3 | calendar / journal / contacts / database |  |  |  |  |  | ● | 8 |
| `_calNewEvent` | 10467 | 6 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_calEditEvent` | 10473 | 5 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_calUpdateFormAllDay` | 10478 | 5 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_calSaveEvent` | 10483 | 31 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `_calDelEvent` | 10514 | 7 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `_calRenderEventForm` | 10521 | 29 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_calRenderDay` | 10550 | 60 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `_renderMyCalP2` | 10610 | 40 | render |  |  |  |  |  | ● | 0 |
| `_calJumpToDate` | 10650 | 9 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_upcomingEvents` | 10662 | 21 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_renderComingUp` | 10683 | 29 | render |  |  |  |  |  | ● | 1 |
| `_calManageCats` | 10712 | 6 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_calAddCat` | 10718 | 8 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `_calSaveCat` | 10726 | 9 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `_calDelCat` | 10735 | 5 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `_calRenderCatList` | 10740 | 16 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `openGlobalSearch` | 10760 | 25 | find / smart views |  |  |  |  |  | ● | 0 |
| `closeGlobalSearch` | 10785 | 3 | find / smart views |  |  |  |  |  | ● | 4 |
| `_gsSearch` | 10788 | 48 | find / smart views | ● |  |  |  |  | ● | 0 |
| `_gsSetActive` | 10836 | 5 | other / helpers |  |  |  |  |  | ● | 2 |
| `_gsNav` | 10841 | 5 | other / helpers |  |  |  |  |  | ● | 2 |
| `_gsConfirm` | 10846 | 4 | other / helpers |  |  |  |  |  | ● | 1 |
| `_gsOpen` | 10850 | 4 | other / helpers |  |  |  |  |  | ● | 1 |
| `_hjDate` | 10861 | 18 | other / helpers |  |  |  |  |  | ● | 9 |
| `_hjStr` | 10879 | 4 | other / helpers |  |  |  |  |  | ● | 1 |
| `toggleHijri` | 10883 | 7 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `installPWA` | 10895 | 10 | other / helpers |  |  |  |  |  | ● | 0 |
| `_mrjDueArts` | 10920 | 5 | other / helpers | ● |  |  |  |  | ● | 4 |
| `_mrjAllEnrolled` | 10925 | 4 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_mrjDueCount` | 10929 | 1 | other / helpers |  |  |  |  |  |  | 0 |
| `mrjToggle` | 10930 | 11 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `_mrjSchedule` | 10941 | 10 | other / helpers |  | ● |  |  |  | ● | 1 |
| `mrjStart` | 10951 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `mrjRate` | 10957 | 9 | other / helpers | ● |  |  |  |  | ● | 0 |
| `mrjNext` | 10966 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `mrjEnd` | 10973 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `_mrjRenderFooter` | 10979 | 9 | other / helpers |  |  |  |  |  | ● | 1 |
| `_mrjRenderP2C` | 10988 | 25 | other / helpers |  |  |  |  |  | ● | 0 |
| `practiceToggle` | 11018 | 6 | reminders / review | ● | ● |  | ● |  | ● | 0 |
| `_practiceRenderP2C` | 11024 | 24 | reminders / review | ● |  |  |  |  | ● | 0 |
| `openCiteModal` | 11053 | 11 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `closeCiteModal` | 11064 | 3 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `setCiteType` | 11067 | 5 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_buildCiteHTML` | 11072 | 30 | other / helpers |  |  |  |  |  | ● | 1 |
| `insertCite` | 11102 | 12 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_citeModalHTML` | 11114 | 40 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_tocHostEl` | 11161 | 5 | other / helpers |  |  |  |  |  | ● | 1 |
| `_tocScrollEl` | 11166 | 5 | other / helpers |  |  |  |  |  | ● | 1 |
| `_tocScan` | 11171 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `_tocItemHTML` | 11178 | 670 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `_p3FitToolbar` | 11861 | 37 | other / helpers |  |  |  |  |  | ● | 6 |
| `fits` | 11873 | 1 | other / helpers |  |  |  |  |  | ● | 4 |
| `_p3FitEditBar` | 11915 | 16 | other / helpers |  |  |  |  |  | ● | 1 |
| `_p3PalBtn` | 11932 | 9 | other / helpers |  |  |  |  |  | ● | 0 |
| `_moreBtnHint` | 11945 | 3 | other / helpers |  |  |  |  |  | ● | 1 |
| `_p3ActPalette` | 11948 | 267 | menus / dialogs | ● | ● |  |  |  | ● | 0 |
| `getBacklinks` | 12215 | 5 | theme / appearance | ● |  |  |  |  | ● | 1 |
| `_blSnippet` | 12220 | 13 | other / helpers |  |  |  |  |  | ● | 1 |
| `backlinksHTML` | 12233 | 17 | theme / appearance |  |  |  |  |  | ● | 3 |
| `refreshBacklinks` | 12251 | 10 | render | ● |  |  |  |  | ● | 2 |
| `upgradeViewCards` | 12264 | 30 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `closePastePop` | 12297 | 5 | menus / dialogs |  |  |  |  |  | ● | 6 |
| `openPastePop` | 12302 | 25 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `mk` | 12305 | 3 | other / helpers |  |  |  |  |  | ● | 18 |
| `go` | 12306 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_ppOut` | 12327 | 3 | other / helpers |  |  |  |  |  | ● | 0 |
| `_caretXY` | 12331 | 8 | other / helpers |  |  |  |  |  | ● | 2 |
| `closeMenDD` | 12341 | 1 | other / helpers |  |  |  |  |  | ● | 8 |
| `_menQuery` | 12342 | 8 | find / smart views |  |  |  |  |  | ● | 2 |
| `showMenDD` | 12350 | 21 | other / helpers | ● |  |  |  |  | ● | 2 |
| `go` | 12362 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `insertMention` | 12371 | 10 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `edImgPick` | 12383 | 3 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `edLink` | 12386 | 6 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `edBookmarkBtn` | 12392 | 4 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `edMentionBtn` | 12396 | 1 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `flashSaved` | 12404 | 8 | other / helpers |  |  |  |  |  | ● | 1 |
| `_edAutoSave` | 12417 | 12 | editor / pop-out | ● | ● |  |  |  | ● | 4 |
| `_edBlocksInSel` | 12430 | 10 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `edBoundary` | 12441 | 10 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `edMarkDone` | 12452 | 10 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `edColorBtn` | 12466 | 7 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_clrPopAway` | 12473 | 6 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_closeColorPop` | 12479 | 1 | theme / appearance |  |  |  |  |  | ● | 2 |
| `_openColorPop` | 12480 | 31 | theme / appearance |  |  |  |  |  | ● | 1 |
| `sw` | 12484 | 11 | other / helpers |  |  |  |  |  | ● | 2 |
| `_applyColor` | 12511 | 16 | theme / appearance |  |  |  |  |  | ● | 0 |
| `_edColHeads` | 12538 | 9 | editor / pop-out |  |  |  |  |  | ● | 4 |
| `_edColClean` | 12548 | 5 | editor / pop-out |  |  |  |  |  | ● | 5 |
| `_edColApply` | 12554 | 32 | editor / pop-out | ● |  |  |  |  | ● | 5 |
| `_edColInit` | 12587 | 26 | editor / pop-out |  |  |  |  |  | ● | 7 |
| `_edRetag` | 12621 | 8 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edBlockDragStart` | 12629 | 11 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edDragPaint` | 12640 | 23 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `_edBlockDragMove` | 12663 | 24 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_edBlockDragEnd` | 12687 | 31 | editor / pop-out | ● |  |  |  |  | ● | 0 |
| `_edColToggle` | 12718 | 12 | editor / pop-out |  | ● |  |  |  | ● | 1 |
| `_edColAll` | 12730 | 12 | editor / pop-out |  | ● |  |  |  | ● | 0 |
| `_edColPreview` | 12742 | 7 | editor / pop-out | ● | ● |  |  |  | ● | 0 |
| `_edColSyncPrevBtn` | 12753 | 4 | editor / pop-out | ● |  |  |  |  | ● | 2 |
| `_edColToolbarHTML` | 12757 | 5 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `toggleEdColPop` | 12765 | 7 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `_rangeAtPoint` | 12775 | 6 | other / helpers |  |  |  |  |  |  | 0 |
| `_edVisKids` | 12810 | 5 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edNeedsLeadIn` | 12818 | 7 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edIsBlankLine` | 12827 | 5 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `_edBlankLine` | 12832 | 1 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `_edPutCaret` | 12833 | 6 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edRevealTail` | 12843 | 8 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edHeadChromeEnd` | 12854 | 9 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edPrefixText` | 12867 | 8 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `_edFixHeadCaret` | 12878 | 10 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `initRichPaste` | 12918 | 206 | other / helpers |  |  |  |  |  | ● | 1 |
| `markCards` | 12921 | 7 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `_flowTo` | 12997 | 8 | other / helpers |  |  |  |  |  | ● | 3 |
| `_endTouchDrag` | 13025 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_promptOpenLink` | 13134 | 10 | theme / appearance |  |  |  |  |  | ● | 3 |
| `mk` | 13139 | 1 | other / helpers |  |  |  |  |  | ● | 18 |
| `autoFit` | 13235 | 18 | other / helpers | ● |  |  |  |  | ● | 2 |
| `dStart` | 13258 | 9 | other / helpers | ● |  |  |  |  | ● | 1 |
| `dEnd` | 13268 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `artDStart` | 13276 | 10 | other / helpers | ● |  |  |  |  | ● | 0 |
| `artDEnd` | 13287 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `dOver` | 13297 | 31 | other / helpers | ● |  |  |  |  | ● | 1 |
| `dLeave` | 13329 | 3 | other / helpers |  |  |  |  |  | ● | 1 |
| `dDrop` | 13333 | 30 | other / helpers | ● | ● |  |  |  | ● | 1 |
| `clearDI` | 13364 | 4 | other / helpers |  |  |  |  |  | ● | 7 |
| `doMoveFolder` | 13369 | 27 | organisation | ● | ● |  | ● |  | ● | 1 |
| `moveFolderToTop` | 13400 | 22 | organisation | ● | ● |  |  |  | ● | 0 |
| `offerRenumber` | 13424 | 31 | other / helpers |  |  |  |  |  | ● | 1 |
| `doRenumber` | 13456 | 20 | other / helpers |  | ● |  |  |  | ● | 0 |
| `toggleFolderStructured` | 13487 | 15 | organisation | ● | ● |  |  |  | ● | 0 |
| `openFieldBuilder` | 13502 | 6 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `_fieldBuilderHTML` | 13508 | 12 | calendar / journal / contacts / database |  |  |  |  |  | ● | 4 |
| `_fieldRowHTML` | 13520 | 10 | other / helpers |  |  |  |  |  | ● | 1 |
| `addFieldRow` | 13530 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `removeFieldRow` | 13538 | 8 | reminders / review | ● | ● |  |  |  | ● | 0 |
| `updField` | 13546 | 9 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_dbfFields` | 13630 | 1 | calendar / journal / contacts / database |  |  |  |  |  | ● | 7 |
| `_dbfFieldById` | 13631 | 1 | calendar / journal / contacts / database |  |  |  |  |  | ● | 6 |
| `_dbfCandidates` | 13633 | 5 | calendar / journal / contacts / database |  |  |  |  |  | ● | 4 |
| `_dbfReportUsable` | 13641 | 9 | calendar / journal / contacts / database |  |  |  |  |  | ● | 2 |
| `_dbfNum` | 13650 | 5 | calendar / journal / contacts / database |  |  |  |  |  | ● | 2 |
| `_dbfFmt` | 13655 | 5 | calendar / journal / contacts / database |  |  |  |  |  | ● | 3 |
| `_dbfVal` | 13661 | 6 | calendar / journal / contacts / database |  |  |  |  |  | ● | 3 |
| `_dbReportHTML` | 13672 | 15 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `wrap` | 13678 | 1 | other / helpers |  |  |  |  |  | ● | 6 |
| `_dbrTable` | 13687 | 23 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_dbrBreakdown` | 13710 | 15 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_dbrTotals` | 13725 | 13 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_dbrStatus` | 13738 | 25 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_dbrTimeline` | 13763 | 22 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_dbbShow` | 13796 | 5 | calendar / journal / contacts / database |  |  |  |  |  | ● | 3 |
| `openDbFolderBuilder` | 13801 | 6 | organisation | ● |  |  |  |  | ● | 0 |
| `newDbFolder` | 13807 | 14 | organisation | ● | ● |  |  |  | ● | 0 |
| `dbBuilderCancel` | 13824 | 13 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `dbBuilderDone` | 13837 | 11 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `_dbBuilderHTML` | 13848 | 60 | calendar / journal / contacts / database |  |  |  |  |  | ● | 3 |
| `_dbbFieldsHTML` | 13908 | 14 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_dbbFolder` | 13922 | 1 | organisation | ● |  |  |  |  | ● | 8 |
| `_dbbRefresh` | 13924 | 9 | calendar / journal / contacts / database |  |  |  |  |  | ● | 6 |
| `dbbSet` | 13933 | 7 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `dbbAddField` | 13940 | 6 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `dbbRemoveField` | 13946 | 9 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `dbbMoveField` | 13955 | 7 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `dbbUpdField` | 13962 | 11 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `dbbSetReport` | 13973 | 16 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `dbbApplyPreset` | 13992 | 26 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `showDbSecCtx` | 14023 | 20 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `newPlainDbFolder` | 14045 | 13 | organisation | ● | ● |  |  |  | ● | 0 |
| `autoNumberDbFolders` | 14060 | 11 | organisation | ● | ● |  |  |  | ● | 0 |
| `_structuredFolderOf` | 14072 | 3 | organisation | ● |  |  |  |  | ● | 1 |
| `fieldInputHTML` | 14075 | 24 | other / helpers |  |  |  |  |  | ● | 1 |
| `saveFieldValue` | 14099 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_fieldsPanelHTML` | 14107 | 12 | other / helpers |  |  |  |  |  | ● | 3 |
| `_fieldChipsHTML` | 14119 | 12 | other / helpers |  |  |  |  |  | ● | 1 |
| `_sha256Hex` | 14141 | 5 | other / helpers |  |  |  |  |  | ● | 2 |
| `setFolderPin` | 14146 | 15 | organisation | ● | ● |  |  |  | ● | 0 |
| `removeFolderPin` | 14161 | 9 | organisation | ● | ● |  | ● |  | ● | 0 |
| `_pinLockHTML` | 14170 | 10 | tags / types / tabs | ● |  |  |  |  | ● | 0 |
| `tryUnlockFolder` | 14180 | 15 | organisation | ● |  |  |  |  | ● | 0 |
| `_stripHistoryImages` | 14228 | 15 | other / helpers |  |  |  |  |  | ● | 2 |
| `_captureNoteHistory` | 14243 | 13 | other / helpers |  |  |  |  |  | ● | 8 |
| `_pruneNoteHistory` | 14256 | 15 | other / helpers |  |  |  |  |  | ● | 1 |
| `totalBytes` | 14261 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `_relTime` | 14271 | 13 | other / helpers |  |  |  |  |  | ● | 4 |
| `_nhReasonLabel` | 14284 | 3 | other / helpers |  |  |  |  |  | ● | 1 |
| `openNoteHistory` | 14287 | 14 | other / helpers |  |  |  |  |  | ● | 1 |
| `_cl` | 14298 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeNoteHistory` | 14301 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `previewNoteHistory` | 14302 | 1 | reminders / review |  |  |  |  |  | ● | 0 |
| `_nhBack` | 14303 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_nhSetMode` | 14304 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_diffTextify` | 14312 | 11 | other / helpers |  |  |  |  |  | ● | 1 |
| `_diffTokenize` | 14323 | 1 | other / helpers |  |  |  |  |  | ● | 2 |
| `_tokDiff` | 14324 | 21 | other / helpers |  |  |  |  |  | ● | 1 |
| `_renderDiffHTML` | 14345 | 8 | render |  |  |  |  |  | ● | 1 |
| `renderNoteHistoryBody` | 14353 | 39 | render | ● |  |  |  |  | ● | 4 |
| `restoreNoteHistory` | 14392 | 17 | destructive | ● | ● |  |  |  | ● | 0 |
| `_versionSiblings` | 14418 | 5 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_versionStripHTML` | 14423 | 16 | other / helpers |  |  |  |  |  | ● | 0 |
| `startVersioning` | 14439 | 11 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `addNewVersion` | 14450 | 24 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `showVersionCtx` | 14474 | 12 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `renameVersion` | 14486 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `setVersionIcon` | 14494 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `unlinkVersion` | 14502 | 7 | theme / appearance | ● | ● |  | ● |  | ● | 0 |
| `ensureQuickPhrases` | 14516 | 13 | other / helpers | ● |  |  |  |  | ● | 7 |
| `_qpTextToHTML` | 14529 | 3 | other / helpers |  |  |  |  |  | ● | 1 |
| `openQuickPhrasesMenu` | 14532 | 18 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `insertQuickPhrase` | 14550 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `openQuickPhrasesManager` | 14557 | 3 | other / helpers |  |  |  |  |  | ● | 0 |
| `_qpManagerHTML` | 14560 | 21 | other / helpers |  |  |  |  |  | ● | 4 |
| `addQuickPhrase` | 14581 | 11 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `updQuickPhrase` | 14592 | 5 | other / helpers |  | ● |  |  |  | ● | 0 |
| `deleteQuickPhrase` | 14597 | 6 | destructive | ● | ● |  |  |  | ● | 0 |
| `moveQuickPhrase` | 14603 | 9 | other / helpers |  | ● |  |  |  | ● | 0 |
| `_ktDefaultKhutbah` | 14630 | 37 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ktNormalize` | 14667 | 16 | other / helpers |  |  |  |  |  | ● | 2 |
| `ensureTemplates` | 14683 | 7 | other / helpers | ● |  |  |  |  | ● | 8 |
| `_ktGet` | 14690 | 1 | other / helpers |  |  |  |  |  | ● | 20 |
| `_ktFoldHTML` | 14693 | 9 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ktBarHTML` | 14705 | 9 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ktAyahHTML` | 14714 | 16 | other / helpers |  |  |  |  |  | ● | 2 |
| `ktBuildHTML` | 14730 | 36 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ktBtnHTML` | 14768 | 3 | other / helpers |  |  |  |  |  | ● | 2 |
| `openTemplatesMenu` | 14771 | 14 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `insertTemplate` | 14785 | 11 | other / helpers |  |  |  |  |  | ● | 0 |
| `_ktDirty` | 14798 | 4 | other / helpers |  |  |  |  |  | ● | 4 |
| `_ktToggleFold` | 14802 | 8 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ktFoldAll` | 14810 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ktRenumber` | 14817 | 9 | other / helpers |  |  |  |  |  | ● | 3 |
| `_ktTplFor` | 14828 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ktAddBlock` | 14835 | 12 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_ktDelBlock` | 14847 | 10 | destructive |  |  |  |  |  | ● | 1 |
| `_ktBlockText` | 14859 | 14 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ktCopyBlock` | 14873 | 38 | other / helpers |  |  |  |  |  | ● | 1 |
| `done` | 14885 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `fallback` | 14886 | 16 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ktRepair` | 14913 | 7 | other / helpers |  |  |  |  |  | ● | 3 |
| `_ktShow` | 14945 | 5 | other / helpers |  |  |  |  |  | ● | 7 |
| `openTemplatesManager` | 14950 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_ktMgrHTML` | 14951 | 25 | other / helpers |  |  |  |  |  | ● | 6 |
| `ktAddTemplate` | 14976 | 10 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktRestoreKhutbah` | 14986 | 9 | destructive | ● | ● |  |  |  | ● | 0 |
| `ktDuplicateTemplate` | 14995 | 10 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `ktDeleteTemplate` | 15005 | 6 | destructive | ● | ● |  |  |  | ● | 0 |
| `ktMoveTemplate` | 15011 | 7 | other / helpers |  | ● |  |  |  | ● | 0 |
| `openTemplateEditor` | 15020 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ktEdHTML` | 15021 | 94 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ktRedraw` | 15115 | 1 | other / helpers |  |  |  |  |  | ● | 12 |
| `ktSet` | 15116 | 2 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktSetAyah` | 15118 | 2 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktAddField` | 15120 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktSetField` | 15121 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktDelField` | 15122 | 1 | destructive |  | ● |  |  |  | ● | 0 |
| `ktMoveField` | 15123 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktAddLang` | 15124 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktSetLang` | 15125 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktDelLang` | 15126 | 1 | destructive |  | ● |  |  |  | ● | 0 |
| `ktMoveLang` | 15127 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktAddSec` | 15128 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktSetSec` | 15129 | 10 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktDelSec` | 15139 | 1 | destructive |  | ● |  |  |  | ● | 0 |
| `ktMoveSec` | 15140 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `_ktMoveIn` | 15141 | 5 | other / helpers |  |  |  |  |  | ● | 3 |
| `_injectHeadingStatusBadges` | 15164 | 28 | other / helpers | ● |  |  |  |  | ● | 1 |
| `showHeadingStatusMenu` | 15192 | 17 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `setHeadingStatus` | 15209 | 8 | other / helpers | ● | ● |  |  |  | ● | 1 |
| `clearHeadingStatus` | 15217 | 7 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `promptCustomHeadingStatus` | 15224 | 11 | other / helpers | ● |  |  |  |  | ● | 0 |
| `logContactAction` | 15249 | 19 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `saveContactAction` | 15268 | 17 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `_renderActionLog` | 15285 | 22 | render |  |  |  |  |  | ● | 1 |
| `toggleActionDone` | 15307 | 13 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `deleteContactAction` | 15320 | 8 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `toggleP2HCardView` | 15328 | 4 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `toggleP2HTreeMode` | 15332 | 4 | organisation |  |  |  |  |  | ● | 0 |
| `togP2HTreeNode` | 15336 | 5 | organisation |  |  |  |  |  | ● | 0 |
| `p2hTreeExpandAll` | 15341 | 8 | organisation |  |  |  |  |  | ● | 0 |
| `p2hTreeCollapseAll` | 15349 | 4 | organisation |  |  |  |  |  | ● | 0 |
| `_folderTreeNodeHTML` | 15353 | 8 | organisation |  |  |  |  |  | ● | 2 |
| `_folderDescendantsHTML` | 15361 | 19 | organisation |  |  |  |  |  | ● | 1 |
| `_secNavHTML` | 15383 | 9 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_firstFolderOfSection` | 15394 | 3 | organisation | ● |  |  |  |  | ● | 3 |
| `gotoSection` | 15397 | 6 | organisation | ● |  |  |  |  | ● | 0 |
| `gotoAdjacentSection` | 15403 | 13 | organisation | ● |  |  |  |  | ● | 0 |
| `_folderFullTreeHTML` | 15416 | 16 | organisation | ● |  |  |  |  | ● | 1 |
| `_folderPathRowHTML` | 15432 | 21 | organisation | ● |  |  |  |  | ● | 0 |
| `_sfQtFolder` | 15493 | 10 | organisation | ● |  |  |  |  | ● | 2 |
| `_sfPathRowHTML` | 15504 | 22 | find / smart views |  |  |  |  |  | ● | 0 |
| `_sfGrpKeys` | 15527 | 6 | find / smart views |  |  |  |  |  | ● | 2 |
| `sfGrpExpandAll` | 15533 | 5 | find / smart views |  |  |  |  |  | ● | 0 |
| `sfGrpCollapseAll` | 15538 | 5 | find / smart views |  |  |  |  |  | ● | 0 |
| `_sfQtBarHTML` | 15565 | 16 | find / smart views |  |  |  |  |  | ● | 0 |
| `addStarterMyDatabaseFolders` | 15586 | 28 | organisation | ● | ● |  |  |  | ● | 0 |
| `mkFolder` | 15614 | 27 | organisation | ● | ● |  |  |  | ● | 2 |
| `rnFolder` | 15641 | 1 | organisation | ● | ● |  |  |  | ● | 1 |
| `rmFolder` | 15642 | 1 | organisation |  |  |  |  |  |  | 0 |
| `mkArt` | 15643 | 1 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `rmArt` | 15644 | 1 | other / helpers |  |  |  |  |  |  | 0 |
| `_buildFolderCtxMain` | 15647 | 35 | organisation | ● |  |  |  |  | ● | 2 |
| `showCtx` | 15682 | 12 | menus / dialogs |  |  |  |  |  | ● | 3 |
| `_folderCtxBack` | 15694 | 3 | organisation |  |  |  |  |  | ● | 0 |
| `_folderCtxSub` | 15697 | 7 | organisation |  |  |  |  |  | ● | 0 |
| `hideCtx` | 15708 | 1 | menus / dialogs |  |  |  |  |  | ● | 41 |
| `moveToMyJournal` | 15709 | 7 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `offerRenumberManual` | 15716 | 4 | other / helpers | ● |  |  |  |  | ● | 0 |
| `stripNumPrefix` | 15724 | 6 | other / helpers |  |  |  |  |  | ● | 4 |
| `getHierNum` | 15736 | 13 | other / helpers | ● |  |  |  |  | ● | 3 |
| `autoNumberAll` | 15751 | 25 | other / helpers | ● | ● |  |  |  | ● | 2 |
| `offerAutoNumber` | 15778 | 23 | other / helpers | ● |  |  |  |  | ● | 2 |
| `showModal` | 15803 | 8 | menus / dialogs |  |  |  |  |  | ● | 38 |
| `closeModal` | 15815 | 1 | menus / dialogs |  |  |  |  |  | ● | 10 |
| `_mbSaveGeom` | 15832 | 10 | other / helpers |  | ● |  |  |  | ● | 2 |
| `_mbLoadGeom` | 15842 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `showResizableModal` | 15851 | 39 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `_mbDragStart` | 15892 | 16 | other / helpers |  |  |  |  |  | ● | 0 |
| `_mbDragMove` | 15908 | 9 | other / helpers |  |  |  |  |  | ● | 0 |
| `_mbDragStop` | 15917 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `_mbResizeStart` | 15925 | 15 | other / helpers |  |  |  |  |  | ● | 0 |
| `_mbResizeMove` | 15940 | 16 | other / helpers |  |  |  |  |  | ● | 0 |
| `_mbResizeStop` | 15956 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `openModal` | 15963 | 35 | menus / dialogs | ● |  |  |  |  | ● | 2 |
| `confirmDel` | 15998 | 8 | other / helpers | ● |  |  |  |  | ● | 0 |
| `_pkArtsOf` | 16031 | 1 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_pkFileRowHTML` | 16032 | 14 | other / helpers |  |  |  |  |  | ● | 1 |
| `_pkRowHTML` | 16046 | 32 | other / helpers |  |  |  |  |  | ● | 1 |
| `_pkTreeHTML` | 16078 | 6 | organisation |  |  |  |  |  | ● | 4 |
| `openPicker` | 16084 | 19 | menus / dialogs | ● |  |  |  |  | ● | 1 |
| `_pkSaveScope` | 16114 | 19 | other / helpers |  | ● |  |  |  | ● | 1 |
| `_pkLoadScope` | 16133 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `_pkResumeBrowse` | 16145 | 36 | other / helpers | ● |  |  |  |  | ● | 1 |
| `openFolderPopupFromToolbar` | 16181 | 21 | organisation | ● |  |  |  |  | ● | 1 |
| `openSectionPopout` | 16206 | 8 | organisation | ● |  |  |  |  | ● | 1 |
| `openFolderPopout` | 16215 | 8 | organisation | ● |  |  |  |  | ● | 0 |
| `_pkCurrentBrowseRoots` | 16223 | 5 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_pkCurrentSectionId` | 16231 | 8 | organisation |  |  |  |  |  | ● | 3 |
| `_pkFontClampSize` | 16249 | 4 | other / helpers |  |  |  |  |  | ● | 4 |
| `_pkFontLoad` | 16253 | 10 | other / helpers |  |  |  |  |  | ● | 3 |
| `_pkFontSave` | 16263 | 1 | other / helpers |  | ● |  |  |  | ● | 2 |
| `_pkApplyFont` | 16266 | 12 | other / helpers |  |  |  |  |  | ● | 5 |
| `_pkFontSet` | 16281 | 15 | other / helpers |  |  |  |  |  | ● | 4 |
| `pkFontSize` | 16296 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkFontStep` | 16297 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkFontBold` | 16298 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkFontColor` | 16299 | 1 | theme / appearance |  |  |  |  |  | ● | 1 |
| `pkFontPalette` | 16302 | 4 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `pkFontReset` | 16306 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkFontMenu` | 16317 | 49 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_pkSecNavHTML` | 16379 | 17 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_pkRenderScopeBody` | 16397 | 7 | other / helpers |  |  |  |  |  | ● | 3 |
| `_pkAllSectionsHTML` | 16407 | 18 | organisation | ● |  |  |  |  | ● | 1 |
| `_pkAllSmartHTML` | 16432 | 7 | find / smart views |  |  |  |  |  | ● | 1 |
| `pkToggleAllSec` | 16439 | 5 | other / helpers |  |  |  |  |  | ● | 0 |
| `_pkSetFolderControlsVisible` | 16446 | 4 | organisation |  |  |  |  |  | ● | 4 |
| `_pkSwitchToSection` | 16455 | 13 | organisation | ● |  |  |  |  | ● | 1 |
| `_pkSwitchToScopeKind` | 16470 | 14 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_pkRefreshSecNav` | 16484 | 4 | other / helpers |  |  |  |  |  | ● | 3 |
| `pkGotoSection` | 16488 | 10 | organisation |  |  |  |  |  | ● | 1 |
| `_pkNavStops` | 16500 | 4 | other / helpers | ● |  |  |  |  | ● | 1 |
| `pkGotoAdjacentSection` | 16504 | 9 | organisation |  |  |  |  |  | ● | 0 |
| `_pkSmartListHTML` | 16515 | 11 | find / smart views |  |  |  |  |  | ● | 2 |
| `_pkTagsListHTML` | 16526 | 9 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_pkKindsListHTML` | 16535 | 14 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `pkNavScope` | 16551 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `_pkOpenBrowse` | 16557 | 20 | other / helpers |  |  |  |  |  | ● | 3 |
| `pkNavigateFolder` | 16577 | 4 | organisation |  |  |  |  |  | ● | 0 |
| `_pkRow` | 16581 | 1 | other / helpers |  |  |  |  |  | ● | 9 |
| `_pkRebuildList` | 16586 | 18 | other / helpers | ● |  |  |  |  | ● | 9 |
| `_pkApplyVis` | 16604 | 29 | other / helpers |  |  |  |  |  | ● | 5 |
| `togglePickExp` | 16633 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `_pkFilter` | 16641 | 22 | find / smart views |  |  |  |  |  | ● | 4 |
| `_pkGlobalSearchHTML` | 16670 | 60 | find / smart views | ● |  |  |  |  | ● | 1 |
| `grpHd` | 16683 | 1 | other / helpers |  |  |  |  |  | ● | 5 |
| `_pkPathWithSection` | 16735 | 6 | organisation | ● |  |  |  |  | ● | 2 |
| `_pkSwitchToFolder` | 16744 | 14 | organisation | ● |  |  |  |  | ● | 0 |
| `togglePick` | 16758 | 14 | other / helpers | ● |  |  |  |  | ● | 0 |
| `_pkUpdateTargetLabel` | 16774 | 12 | other / helpers | ● |  |  |  |  | ● | 5 |
| `pkRowMenu` | 16792 | 9 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `pkNoteRowMenu` | 16801 | 8 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `pkSetTarget` | 16809 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkClearTarget` | 16816 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `pkRename` | 16823 | 7 | other / helpers | ● |  |  |  |  | ● | 0 |
| `pkRenameSave` | 16830 | 10 | other / helpers | ● |  |  |  |  | ● | 0 |
| `pkRenameCancel` | 16840 | 7 | other / helpers | ● |  |  |  |  | ● | 0 |
| `pkDelete` | 16847 | 14 | destructive | ● |  |  |  |  | ● | 0 |
| `pkDStart` | 16861 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkDEnd` | 16867 | 5 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkDOver` | 16872 | 19 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkDLeave` | 16891 | 3 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkDDrop` | 16894 | 17 | other / helpers |  |  |  |  |  | ● | 0 |
| `_pkClearDI` | 16911 | 5 | other / helpers |  |  |  |  |  | ● | 7 |
| `pkMoveFolder` | 16920 | 23 | organisation | ● | ● |  | ● |  | ● | 1 |
| `pkNoteOpen` | 16947 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkNoteDStart` | 16951 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkNoteDEnd` | 16957 | 5 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkMoveNote` | 16964 | 16 | other / helpers | ● | ● |  |  |  | ● | 1 |
| `pkNoteRename` | 16980 | 7 | other / helpers | ● |  |  |  |  | ● | 0 |
| `pkNoteRenameSave` | 16987 | 14 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `pkNoteRenameCancel` | 17001 | 7 | other / helpers | ● |  |  |  |  | ● | 0 |
| `pkNoteDelete` | 17008 | 6 | destructive | ● |  |  |  |  | ● | 0 |
| `mobBack` | 17016 | 1 | other / helpers |  |  |  |  |  |  | 0 |
| `tapCtx` | 17017 | 6 | menus / dialogs |  |  |  |  |  |  | 0 |
| `getAllTags` | 17027 | 8 | tags / types / tabs | ● |  |  |  |  | ● | 4 |
| `selTag` | 17036 | 7 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `toggleTagPanel` | 17044 | 4 | tags / types / tabs |  |  |  |  |  |  | 0 |
| `backToMyWallCat` | 17053 | 5 | other / helpers |  |  |  |  |  | ● | 1 |
| `selKind` | 17058 | 7 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `toggleNtiSection` | 17065 | 1 | organisation |  |  |  |  |  | ● | 0 |
| `togNtiCatSB` | 17066 | 1 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `renderNTISection` | 17067 | 51 | render | ● |  |  |  |  | ● | 0 |
| `renderTagPanel` | 17119 | 17 | render |  |  |  |  |  | ● | 1 |
| `renderTagEditor` | 17137 | 15 | render |  |  |  |  |  | ● | 4 |
| `_allTags` | 17156 | 5 | tags / types / tabs | ● |  |  |  |  | ● | 1 |
| `showTagSuggest` | 17161 | 10 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_tagSuggestPlace` | 17176 | 9 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `hideTagSuggest` | 17185 | 3 | tags / types / tabs |  |  |  |  |  | ● | 3 |
| `_pickTagSuggestion` | 17188 | 6 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `addTag` | 17195 | 11 | tags / types / tabs |  |  |  |  |  | ● | 3 |
| `rmTag` | 17207 | 5 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `tagKey` | 17213 | 7 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `tagInputChanged` | 17226 | 12 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `hexDarken` | 17256 | 5 | other / helpers |  |  |  |  |  | ● | 7 |
| `hexLighten` | 17261 | 5 | other / helpers |  |  |  |  |  | ● | 4 |
| `_sbLum` | 17277 | 14 | other / helpers |  |  |  |  |  | ● | 6 |
| `f` | 17288 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `applySidebarInk` | 17291 | 22 | theme / appearance |  |  |  |  |  | ● | 1 |
| `set` | 17297 | 1 | other / helpers |  |  |  |  |  | ● | 28 |
| `_paneSafePaper` | 17334 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `_paneInk` | 17341 | 6 | theme / appearance |  |  |  |  |  | ● | 4 |
| `_accentInk` | 17349 | 14 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `worst` | 17359 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `applyPaneInk` | 17363 | 40 | theme / appearance |  |  |  |  |  | ● | 1 |
| `set` | 17366 | 1 | other / helpers |  |  |  |  |  | ● | 28 |
| `applyTheme` | 17403 | 29 | theme / appearance |  |  |  |  |  | ● | 6 |
| `applyPreset` | 17433 | 7 | theme / appearance | ● |  |  |  |  | ● | 0 |
| `setCustomColor` | 17441 | 18 | theme / appearance | ● |  |  |  |  | ● | 2 |
| `setCustomColorHex` | 17460 | 6 | theme / appearance |  |  |  |  |  | ● | 0 |
| `resetTheme` | 17467 | 6 | theme / appearance | ● |  |  |  |  | ● | 0 |
| `openTheme` | 17474 | 5 | theme / appearance |  |  |  |  |  | ● | 0 |
| `closeTheme` | 17480 | 3 | theme / appearance |  |  |  |  |  | ● | 0 |
| `renderThemeModal` | 17484 | 107 | render | ● |  |  |  |  | ● | 8 |
| `ctxColorSwatches` | 17594 | 8 | theme / appearance | ● |  |  |  |  | ● | 1 |
| `setFolderColor` | 17603 | 9 | organisation | ● | ● |  | ● |  | ● | 1 |
| `setFolderBold` | 17612 | 7 | organisation | ● | ● |  | ● |  | ● | 0 |
| `renderSection` | 17624 | 23 | render | ● |  |  |  |  | ● | 0 |
| `toggleSection` | 17649 | 12 | organisation | ● |  |  |  |  | ● | 0 |
| `addFolderInSec` | 17663 | 4 | organisation |  |  |  |  |  | ● | 0 |
| `addRootFolder` | 17669 | 4 | organisation |  |  |  |  |  | ● | 0 |
| `ctxSecColorSwatches` | 17676 | 8 | theme / appearance | ● |  |  |  |  | ● | 1 |
| `setSectionColor` | 17684 | 7 | organisation | ● | ● |  | ● |  | ● | 1 |
| `setSectionBold` | 17691 | 7 | organisation | ● | ● |  | ● |  | ● | 0 |
| `_uiStamp` | 17706 | 1 | cloud sync / auth |  |  |  |  |  | ● | 5 |
| `ctxSfColorSwatches` | 17707 | 10 | find / smart views |  |  |  |  |  | ● | 1 |
| `setSmartViewColor` | 17717 | 9 | find / smart views |  | ● |  |  |  | ● | 0 |
| `showSmartViewCtx` | 17726 | 15 | find / smart views |  |  |  |  |  | ● | 1 |
| `toggleSmartViews` | 17741 | 6 | find / smart views |  |  |  |  |  | ● | 0 |
| `startRenSmartViews` | 17747 | 9 | find / smart views |  |  |  |  |  | ● | 0 |
| `finRenSmartViews` | 17756 | 7 | find / smart views |  | ● |  |  |  | ● | 0 |
| `_buildSecCtxMain` | 17764 | 15 | menus / dialogs | ● |  |  |  |  | ● | 2 |
| `showSecCtx` | 17779 | 11 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_secCtxBack` | 17790 | 3 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_secCtxSub` | 17793 | 7 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `startRenSec` | 17802 | 9 | other / helpers | ● |  |  |  |  | ● | 0 |
| `finRenSec` | 17812 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `mkSection` | 17822 | 8 | organisation | ● | ● |  |  |  | ● | 0 |
| `delSection` | 17832 | 8 | organisation | ● | ● |  |  |  | ● | 0 |
| `moveFolderToSec` | 17842 | 6 | organisation | ● | ● |  |  |  | ● | 0 |
| `rootSectionMoves` | 17850 | 7 | organisation | ● |  |  |  |  | ● | 1 |
| `_isSysFolder` | 17865 | 9 | organisation | ● |  |  |  |  | ● | 4 |
| `convertFolderToSection` | 17874 | 22 | organisation | ● |  |  |  |  | ● | 0 |
| `_moveNotesThenConvert` | 17896 | 17 | other / helpers | ● |  |  |  |  | ● | 0 |
| `_doFolderToSection` | 17913 | 18 | organisation | ● | ● |  |  |  | ● | 1 |
| `sectionToFolderRows` | 17931 | 6 | organisation | ● |  |  |  |  | ● | 1 |
| `confirmSectionToFolder` | 17937 | 10 | organisation | ● |  |  |  |  | ● | 0 |
| `_doSectionToFolder` | 17947 | 16 | organisation | ● | ● |  | ● |  | ● | 0 |
| `secDStart` | 17967 | 9 | other / helpers |  |  |  |  |  | ● | 0 |
| `secDEnd` | 17977 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `secDOver` | 17984 | 10 | other / helpers |  |  |  |  |  | ● | 0 |
| `secDLeave` | 17995 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `secDDrop` | 18002 | 17 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `snapshotState` | 18023 | 7 | persistence |  |  |  |  |  | ● | 2 |
| `undo` | 18031 | 9 | other / helpers | ● | ● |  | ● |  | ● | 1 |
| `redo` | 18041 | 9 | other / helpers | ● | ● |  | ● |  | ● | 1 |
| `updateUndoRedoBtns` | 18051 | 5 | other / helpers |  |  |  |  |  | ● | 3 |
| `_addTombstones` | 18065 | 10 | cloud sync / auth |  |  |  |  |  | ● | 5 |
| `_tombstoneTrashEntry` | 18078 | 10 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `trashFolder` | 18088 | 28 | organisation | ● | ● |  |  |  | ● | 3 |
| `trashArt` | 18117 | 11 | destructive | ● | ● |  |  |  | ● | 2 |
| `openTrash` | 18129 | 5 | destructive |  |  |  |  |  | ● | 0 |
| `closeTrash` | 18135 | 3 | destructive |  |  |  |  |  | ● | 0 |
| `renderTrashModal` | 18139 | 31 | render | ● |  |  |  |  | ● | 5 |
| `restoreItem` | 18171 | 52 | destructive | ● | ● |  |  |  | ● | 0 |
| `permDeleteItem` | 18224 | 6 | destructive | ● | ● |  |  |  | ● | 0 |
| `emptyTrash` | 18231 | 8 | destructive | ● | ● |  | ● |  | ● | 0 |
| `_popCleanupOrphans` | 18242 | 15 | menus / dialogs | ● |  |  | ● |  | ● | 1 |
| `updateTrashBtn` | 18258 | 6 | destructive | ● |  |  |  |  | ● | 1 |
| `_ctxIsCard` | 18284 | 1 | menus / dialogs |  |  |  |  |  | ● | 3 |
| `showArtCtx` | 18286 | 20 | menus / dialogs | ● |  |  |  |  | ● | 3 |
| `_ctxPlaceCard` | 18309 | 8 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `_ctxRepaint` | 18320 | 1 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `_artCtxGroups` | 18332 | 37 | organisation |  |  |  |  |  | ● | 1 |
| `sub` | 18335 | 1 | other / helpers |  |  |  |  |  | ● | 5 |
| `_buildArtCtxMain` | 18369 | 6 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `_ctxBack` | 18375 | 6 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `_ctxSub` | 18381 | 49 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `detachArt` | 18432 | 16 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `openAttachArt` | 18450 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `showArtFolderPicker` | 18452 | 35 | organisation | ● |  |  |  |  | ● | 3 |
| `rows` | 18457 | 12 | other / helpers |  |  |  |  |  | ● | 3 |
| `createFolderFromPicker` | 18490 | 34 | organisation | ● | ● |  |  |  | ● | 0 |
| `fpFilter` | 18527 | 32 | find / smart views | ● |  |  |  |  | ● | 0 |
| `rows2` | 18533 | 11 | other / helpers |  |  |  |  |  | ● | 1 |
| `toggleArtFolder` | 18561 | 17 | organisation | ● | ● |  |  |  | ● | 0 |
| `applyFontSizes` | 18585 | 10 | other / helpers |  |  |  |  |  | ● | 3 |
| `r` | 18589 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `applyLineSpacing` | 18598 | 6 | other / helpers |  |  |  |  |  | ● | 2 |
| `setLineSpacing` | 18604 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `setFontSize` | 18614 | 9 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `resetFontSizes` | 18625 | 7 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `enableAutoSave` | 18652 | 37 | other / helpers |  |  |  |  |  | ● | 0 |
| `_writeToFile` | 18691 | 18 | other / helpers |  |  |  |  | ● | ● | 3 |
| `scheduleAutoSave` | 18714 | 7 | other / helpers |  |  |  |  |  | ● | 2 |
| `updateSaveUI` | 18723 | 30 | other / helpers |  |  |  |  |  | ● | 8 |
| `_bkCfg` | 18799 | 7 | other / helpers |  |  |  |  |  | ● | 8 |
| `_bkSaveCfg` | 18806 | 3 | other / helpers |  | ● |  |  |  | ● | 5 |
| `_bkIdb` | 18811 | 8 | other / helpers |  |  |  |  |  | ● | 3 |
| `_bkPutHandle` | 18819 | 8 | other / helpers |  |  |  |  |  | ● | 1 |
| `_bkGetHandle` | 18827 | 10 | other / helpers |  |  |  |  |  | ● | 2 |
| `_bkClearHandle` | 18837 | 9 | other / helpers |  |  |  |  |  | ● | 1 |
| `_bkStamp` | 18848 | 4 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `p` | 18849 | 1 | other / helpers |  |  |  |  |  | ● | 8 |
| `_bkFileName` | 18854 | 5 | other / helpers |  |  |  |  |  | ● | 2 |
| `p` | 18855 | 1 | other / helpers |  |  |  |  |  | ● | 8 |
| `_bkDue` | 18859 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `_bkAgeDays` | 18866 | 4 | other / helpers |  |  |  |  |  | ● | 2 |
| `_bkPrune` | 18876 | 23 | other / helpers |  |  |  |  |  | ● | 1 |
| `runBackupNow` | 18904 | 33 | export / import / backup |  | ● |  |  | ● | ● | 2 |
| `chooseBackupFolder` | 18940 | 11 | export / import / backup |  |  |  |  |  | ● | 1 |
| `turnOffBackups` | 18952 | 6 | export / import / backup |  |  |  |  |  | ● | 0 |
| `setBackupEvery` | 18959 | 3 | export / import / backup |  |  |  |  |  | ● | 0 |
| `downloadDatedBackup` | 18966 | 14 | export / import / backup |  | ● |  |  | ● | ● | 1 |
| `_bkMaybeAuto` | 18984 | 21 | other / helpers |  |  |  |  |  | ● | 1 |
| `_bkStatusHTML` | 19007 | 22 | other / helpers |  |  |  |  |  | ● | 3 |
| `sel` | 19013 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `_bkRenderStatus` | 19029 | 4 | other / helpers |  |  |  |  |  | ● | 5 |
| `openBackupModal` | 19033 | 31 | export / import / backup |  |  |  |  |  | ● | 0 |
| `getTimestampedName` | 19067 | 6 | cloud sync / auth |  |  |  |  |  | ● | 2 |
| `_sbDDFit` | 19081 | 20 | other / helpers |  |  |  |  |  | ● | 3 |
| `toggleSBMenu` | 19102 | 6 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `closeSBMenu` | 19108 | 3 | menus / dialogs |  |  |  |  |  | ● | 4 |
| `toggleSBTools` | 19112 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeSBTools` | 19118 | 3 | other / helpers |  |  |  |  |  | ● | 2 |
| `toggleSBHome` | 19124 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeSBHome` | 19130 | 3 | other / helpers |  |  |  |  |  | ● | 3 |
| `openLegacyApp` | 19137 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `artSnippet` | 19149 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `artCard` | 19157 | 31 | menus / dialogs |  |  |  |  |  | ● | 12 |
| `toggleListView` | 19190 | 8 | other / helpers | ● | ● |  |  |  | ● | 1 |
| `adjustP3Layout` | 19208 | 15 | other / helpers |  |  |  |  |  | ● | 9 |
| `openP2` | 19225 | 5 | other / helpers |  |  |  |  |  | ● | 2 |
| `closeP2` | 19230 | 6 | other / helpers |  |  |  |  |  | ● | 3 |
| `_dedupePrimaryFolders` | 19253 | 37 | organisation | ● | ● |  |  |  | ● | 2 |
| `noteCount` | 19262 | 1 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_openNewNoteWindow` | 19308 | 15 | other / helpers |  |  |  |  |  | ● | 5 |
| `quickCapture` | 19323 | 26 | other / helpers | ● | ● |  |  |  | ● | 2 |
| `quickCaptureWithKind` | 19354 | 22 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `backFromP3` | 19380 | 5 | other / helpers |  |  |  |  |  | ● | 1 |
| `showPane` | 19390 | 16 | other / helpers |  |  |  |  |  | ● | 24 |
| `_getOrCreateFirebaseApp` | 19445 | 7 | cloud sync / auth |  |  | ● |  |  | ● | 2 |
| `initAuth` | 19453 | 51 | cloud sync / auth |  |  | ● |  |  | ● | 1 |
| `doLogin` | 19505 | 12 | other / helpers |  |  | ● |  |  | ● | 0 |
| `refreshApp` | 19519 | 10 | render |  |  |  |  |  | ● | 0 |
| `doSignOut` | 19530 | 15 | cloud sync / auth |  |  |  |  |  | ● | 0 |
| `getSyncConfig` | 19546 | 1 | other / helpers |  |  |  |  |  | ● | 8 |
| `_saveSyncConfig` | 19547 | 1 | persistence |  | ● |  |  |  | ● | 0 |
| `clearSyncConfig` | 19548 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `setSyncStatus` | 19550 | 15 | other / helpers |  |  |  |  |  | ● | 21 |
| `_loadScript` | 19566 | 8 | other / helpers |  |  |  |  |  | ● | 4 |
| `_syncErrorToast` | 19594 | 21 | cloud sync / auth |  |  |  |  |  | ● | 5 |
| `initSync` | 19616 | 91 | other / helpers |  |  | ● |  |  | ● | 2 |
| `syncNow` | 19709 | 36 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `_mergeById` | 19746 | 12 | cloud sync / auth |  |  |  |  |  | ● | 3 |
| `_mergeTabStamps` | 19759 | 11 | cloud sync / auth |  |  |  |  |  | ● | 2 |
| `norm` | 19760 | 1 | other / helpers |  |  |  |  |  | ● | 18 |
| `_mergeTabMaps` | 19777 | 18 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `norm` | 19778 | 1 | other / helpers |  |  |  |  |  | ● | 18 |
| `_mergeStrs` | 19795 | 1 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `_mergeMapById` | 19811 | 13 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `norm` | 19812 | 1 | other / helpers |  |  |  |  |  | ● | 18 |
| `_mergeStampMap` | 19825 | 6 | cloud sync / auth |  |  |  |  |  | ● | 2 |
| `norm` | 19826 | 1 | other / helpers |  |  |  |  |  | ● | 18 |
| `_mergeValMap` | 19834 | 9 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `norm` | 19835 | 1 | other / helpers |  |  |  |  |  | ● | 18 |
| `mergeDB` | 19843 | 63 | cloud sync / auth |  |  |  |  |  | ● | 3 |
| `_tadd` | 19883 | 1 | other / helpers |  |  |  |  |  | ● | 4 |
| `_alive` | 19893 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_b64enc` | 19907 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `_b64dec` | 19908 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `_syncSleep` | 19910 | 1 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `_syncSig` | 19916 | 5 | cloud sync / auth |  |  |  |  |  | ● | 2 |
| `_flushAllEditors` | 19931 | 9 | other / helpers |  |  |  |  |  | ● | 5 |
| `_edCleanHTML` | 19943 | 6 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `_edApplyRemote` | 19960 | 38 | editor / pop-out | ● |  |  |  |  | ● | 1 |
| `put` | 19963 | 18 | other / helpers |  |  |  |  |  | ● | 3 |
| `_readCloudDB` | 20007 | 34 | cloud sync / auth |  |  | ● |  |  | ● | 2 |
| `_writeCloudDB` | 20041 | 9 | cloud sync / auth |  |  | ● |  |  | ● | 2 |
| `_doPush` | 20070 | 44 | other / helpers |  | ● |  |  |  | ● | 1 |
| `pushToCloud` | 20115 | 9 | cloud sync / auth |  |  |  |  |  | ● | 5 |
| `flushPendingPush` | 20129 | 5 | other / helpers |  |  |  |  |  | ● | 3 |
| `_preferStreaming` | 20151 | 3 | other / helpers |  |  |  |  |  | ● | 1 |
| `_noteTransportFailure` | 20158 | 5 | other / helpers |  |  |  |  |  | ● | 1 |
| `_reconcileNow` | 20183 | 27 | other / helpers |  |  |  |  |  | ● | 2 |
| `_startReconcile` | 20210 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `_scheduleListenerRestart` | 20219 | 11 | other / helpers |  |  | ● |  |  | ● | 1 |
| `_pullRemote` | 20231 | 77 | reminders / review | ● | ● |  | ● |  | ● | 2 |
| `generateNotebookId` | 20310 | 3 | other / helpers |  |  |  |  | ● | ● | 1 |
| `_syncAgo` | 20320 | 9 | cloud sync / auth |  |  |  |  |  | ● | 2 |
| `_syncDiagnosticsHTML` | 20329 | 21 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `openSyncModal` | 20350 | 61 | menus / dialogs |  |  | ● |  |  | ● | 0 |
| `closeSyncModal` | 20412 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `parseFirebaseConfig` | 20414 | 986 | cloud sync / auth | ● | ● | ● | ● |  | ● | 0 |
| `_uiTier` | 20538 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `_normalizePaneState` | 20547 | 17 | other / helpers |  |  |  |  |  | ● | 1 |
| `_onViewportResize` | 20565 | 47 | other / helpers |  |  |  |  |  | ● | 0 |
| `_sbFitHeader` | 20626 | 9 | other / helpers |  |  |  |  |  | ● | 3 |
| `sfOrdered` | 20673 | 8 | find / smart views |  |  |  |  |  | ● | 6 |
| `moveSfItem` | 20681 | 12 | find / smart views |  | ● |  |  |  | ● | 0 |
| `ensureNoteKinds` | 20716 | 6 | tags / types / tabs |  |  |  |  |  | ● | 6 |
| `noteKinds` | 20722 | 1 | tags / types / tabs |  |  |  |  |  | ● | 13 |
| `ensureNoteKindCats` | 20723 | 6 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `noteKindCats` | 20729 | 1 | tags / types / tabs |  |  |  |  |  | ● | 8 |
| `kindsInCat` | 20730 | 1 | tags / types / tabs |  |  |  |  |  | ● | 3 |
| `kindById` | 20731 | 1 | tags / types / tabs |  |  |  |  |  | ● | 6 |
| `artKinds` | 20732 | 4 | tags / types / tabs |  |  |  |  |  | ● | 15 |
| `artKind` | 20736 | 1 | tags / types / tabs |  |  |  |  |  |  | 0 |
| `untouchedDays` | 20737 | 4 | other / helpers |  |  |  |  |  | ● | 3 |
| `isNagNote` | 20742 | 2 | other / helpers |  |  |  |  |  | ● | 1 |
| `isMyWallNote` | 20745 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_flushEd` | 20754 | 13 | other / helpers | ● |  |  |  |  | ● | 8 |
| `setNoteKind` | 20767 | 6 | tags / types / tabs | ● | ● |  |  |  |  | 0 |
| `toggleNoteKind` | 20773 | 12 | tags / types / tabs | ● | ● |  | ● |  | ● | 0 |
| `finishNote` | 20785 | 7 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `unfinishNote` | 20792 | 6 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `addNoteKindTab` | 20798 | 13 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `order` | 20805 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `renameNoteKind` | 20811 | 10 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `kindBarHTML` | 20823 | 50 | tags / types / tabs |  |  |  |  |  | ● | 3 |
| `_attachCount` | 20876 | 3 | other / helpers |  |  |  |  |  | ● | 3 |
| `mwCatIsOpen` | 20882 | 4 | other / helpers | ● |  |  |  |  | ● | 2 |
| `mwToggleAllCats` | 20886 | 10 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `mwToggleViewMode` | 20896 | 6 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `renderMyWall` | 20902 | 92 | render | ● |  |  |  |  | ● | 0 |
| `_kindLatest` | 20936 | 1 | tags / types / tabs |  |  |  |  |  | ● | 4 |
| `_sortKinds` | 20937 | 4 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `isJournal` | 20998 | 9 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `getSmartGroups` | 21009 | 61 | organisation | ● |  |  |  |  | ● | 3 |
| `ts` | 21011 | 1 | other / helpers |  |  |  |  |  | ● | 6 |
| `sod` | 21012 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `togSfGrp` | 21070 | 6 | find / smart views |  |  |  |  |  | ● | 0 |
| `togMwCat` | 21076 | 5 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallCatDStart` | 21088 | 10 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallCatDEnd` | 21098 | 5 | other / helpers |  |  |  |  |  | ● | 1 |
| `wallCatDOver` | 21103 | 9 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallCatDLeave` | 21112 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallCatDDrop` | 21116 | 30 | other / helpers |  | ● |  |  |  | ● | 0 |
| `wallGrpDStart` | 21146 | 9 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallGrpDEnd` | 21155 | 5 | other / helpers |  |  |  |  |  | ● | 3 |
| `wallGrpDOver` | 21160 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallGrpDLeave` | 21168 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallGrpDDrop` | 21172 | 18 | other / helpers |  | ● |  |  |  | ● | 0 |
| `moveWallKind` | 21190 | 10 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `showWallKindCtx` | 21200 | 23 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_groupUnion` | 21223 | 6 | organisation |  |  |  |  |  | ● | 1 |
| `getSmartArts` | 21230 | 32 | find / smart views | ● |  |  |  |  | ● | 4 |
| `renderSmartSection` | 21263 | 31 | render |  |  |  |  |  | ● | 0 |
| `toggleFav` | 21295 | 9 | tags / types / tabs | ● | ● |  |  |  | ● | 1 |
| `togglePin` | 21305 | 9 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `promptAddArtTag` | 21316 | 45 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `applyTag` | 21318 | 14 | tags / types / tabs |  | ● |  |  |  |  | 0 |
| `tagPickerRender` | 21332 | 26 | tags / types / tabs | ● |  |  |  |  | ● | 4 |
| `tagPickerRender` | 21372 | 25 | tags / types / tabs | ● |  |  |  |  | ● | 4 |
| `tagPickerApply` | 21400 | 16 | tags / types / tabs | ● | ● |  |  |  | ● | 2 |
| `removeArtTag` | 21416 | 9 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `showSfItemCtx` | 21425 | 18 | find / smart views |  |  |  |  |  | ● | 1 |
| `renameSfItem` | 21443 | 11 | find / smart views |  |  |  |  |  | ● | 0 |
| `finRenameSfItem` | 21454 | 5 | find / smart views |  | ● |  |  |  | ● | 0 |
| `setSfItemColor` | 21459 | 7 | find / smart views |  | ● |  |  |  | ● | 1 |
| `ctxSfItemColorSwatches` | 21466 | 8 | find / smart views |  |  |  |  |  | ● | 1 |
| `setSmartViewBold` | 21474 | 5 | find / smart views |  | ● |  |  |  | ● | 0 |
| `setSfItemBold` | 21479 | 7 | find / smart views |  | ● |  |  |  | ● | 0 |
| `toggleTagSection` | 21486 | 6 | organisation |  |  |  |  |  | ● | 0 |
| `showTagSecCtx` | 21492 | 17 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `ctxTagSecColorSwatches` | 21509 | 7 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `setTagSecColor` | 21516 | 5 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `renameTagSection` | 21521 | 9 | organisation |  |  |  |  |  | ● | 0 |
| `finRenTagSec` | 21530 | 7 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `promptAddGlobalTag` | 21538 | 9 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `addGlobalTag` | 21547 | 7 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `showTagCtx` | 21554 | 13 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `renameTag` | 21567 | 10 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `finRenameTag` | 21577 | 11 | tags / types / tabs | ● | ● |  | ● |  | ● | 2 |
| `deleteTag` | 21588 | 7 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `finRenameArtTitle` | 21595 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `renderTagSection` | 21604 | 33 | render |  |  |  |  |  | ● | 0 |
| `startRenameArtTitle` | 21637 | 10 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_flushEverythingOut` | 21719 | 8 | other / helpers |  | ● |  |  |  | ● | 2 |
