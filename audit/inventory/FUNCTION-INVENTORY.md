# Siyagah — Function Inventory

*Generated mechanically by `node tools/inventory.mjs` from `index.html`.
Do not hand-edit: re-run it.*

| | |
|---|---|
| App version | v04.38 |
| Generated | 2026-09-19 |
| Application script | 19,745 lines |
| Application-defined functions | **1302** |
| …reachable (called in script or named in markup) | 1272 |
| …never referenced anywhere | 25 |
| …that mutate the data model | 380 |
| …that reach a persistence boundary | 273 |
| …classified destructive | 42 |
| …privacy-sensitive (export / identity) | 13 |
| …that touch the network | 17 |
| Inline `on*` handlers in markup | **1082** |
| Distinct functions those handlers call | 560 |
| Distinct DOM ids | 252 |

## Functions never referenced anywhere

- `_wordSnippet`
- `newJournalEntry`
- `cycleJrnSize`
- `_modalResizeTRStart`
- `_modalResizeTLStart`
- `_modalResizeBLStart`
- `_modalResizeBRStart`
- `_mrjDueCount`
- `_tocStartResize`
- `_pinPanelDragOver`
- `_pinPanelDragLeave`
- `_pinPanelDrop`
- `_pinStartResize`
- `_tocOpenMobile`
- `_tocMobileScrollTo`
- `_rangeAtPoint`
- `rmFolder`
- `rmArt`
- `mobBack`
- `tapCtx`
- `toggleTagPanel`
- `artKind`
- `setNoteKind`
- `order`
- `applyTag`

## By domain

- **other / helpers** — 567
- **tags / types / tabs** — 139
- **menus / dialogs** — 110
- **organisation** — 107
- **calendar / journal / contacts / database** — 85
- **editor / pop-out** — 70
- **find / smart views** — 51
- **render** — 46
- **cloud sync / auth** — 32
- **theme / appearance** — 27
- **destructive** — 24
- **export / import / backup** — 21
- **reminders / review** — 14
- **persistence** — 7
- **startup / load / migration** — 2

## Full inventory

Legend: **M** mutates model · **P** persists · **N** network · **D** destructive ·
**Pr** privacy-sensitive · **R** reachable

| Function | Line | Lines | Domain | M | P | N | D | Pr | R | Callers |
|---|---:|---:|---|:-:|:-:|:-:|:-:|:-:|:-:|---:|
| `_fnv1a` | 3005 | 5 | other / helpers |  |  |  |  |  | ● | 5 |
| `_salvageEntry` | 3010 | 8 | other / helpers |  |  |  |  |  | ● | 1 |
| `_salvageKey` | 3018 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `_salvagePrune` | 3022 | 12 | other / helpers |  |  |  |  |  | ● | 1 |
| `_mergeSalvage` | 3034 | 14 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `_safeURL` | 3105 | 12 | other / helpers |  |  |  |  |  | ● | 3 |
| `_safeImgSrc` | 3117 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `_sanitiseForeignHTML` | 3123 | 45 | other / helpers |  |  |  |  |  | ● | 2 |
| `_sanitiseDBContent` | 3168 | 10 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_hardenLinks` | 3181 | 10 | theme / appearance |  |  |  |  |  | ● | 1 |
| `_repairDB` | 3192 | 40 | other / helpers |  |  |  |  |  | ● | 6 |
| `loadDB` | 3233 | 154 | startup / load / migration | ● | ● |  | ● |  | ● | 1 |
| `_tiScheduleAutoSave` | 3422 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `_save` | 3442 | 45 | persistence |  | ● |  |  |  | ● | 13 |
| `persist` | 3487 | 1 | persistence |  | ● |  |  |  | ● | 251 |
| `_snapshotShell` | 3557 | 5 | export / import / backup |  |  |  |  | ● | ● | 1 |
| `_cleanExportRoot` | 3562 | 70 | export / import / backup |  |  |  |  | ● | ● | 1 |
| `getExportHTML` | 3635 | 29 | export / import / backup |  |  |  |  | ● | ● | 5 |
| `exportFile` | 3665 | 11 | export / import / backup |  | ● |  |  | ● | ● | 1 |
| `exportDeploy` | 3681 | 14 | export / import / backup |  | ● |  |  | ● | ● | 0 |
| `exportJSON` | 3695 | 1 | export / import / backup |  |  |  |  | ● | ● | 0 |
| `_runImport` | 3715 | 38 | export / import / backup |  |  |  |  |  | ● | 2 |
| `_recoveryOpen` | 3775 | 10 | other / helpers |  |  |  |  |  | ● | 3 |
| `_recoveryTx` | 3785 | 9 | other / helpers |  |  |  |  |  | ● | 6 |
| `_recoverySave` | 3796 | 39 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_recoveryList` | 3835 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `_RecoveryUndoError` | 3845 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `_recoveryRestore` | 3846 | 33 | destructive | ● | ● |  | ● |  | ● | 2 |
| `openRecoveryModal` | 3879 | 16 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `restoreRecovery` | 3895 | 22 | destructive |  |  |  |  |  | ● | 0 |
| `done` | 3897 | 3 | other / helpers |  |  |  |  |  | ● | 3 |
| `_choiceModal` | 3927 | 23 | menus / dialogs |  |  |  |  |  | ● | 4 |
| `finish` | 3930 | 4 | other / helpers |  |  |  |  |  | ● | 2 |
| `onKey` | 3934 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_choicePick` | 3950 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_takeRecoveryCopy` | 3954 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `importJSON` | 3961 | 34 | export / import / backup | ● | ● |  | ● |  | ● | 0 |
| `toast` | 3997 | 1 | menus / dialogs |  |  |  |  |  | ● | 259 |
| `mkDefaults` | 4000 | 17 | other / helpers |  |  |  |  |  | ● | 1 |
| `uid` | 4019 | 1 | other / helpers |  |  |  |  | ● | ● | 91 |
| `esc` | 4020 | 1 | other / helpers |  |  |  |  |  | ● | 455 |
| `strip` | 4021 | 1 | other / helpers |  |  |  |  |  | ● | 4 |
| `_wordSnippet` | 4022 | 5 | other / helpers |  |  |  |  |  |  | 0 |
| `fmtD` | 4027 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `fmtDs` | 4028 | 6 | other / helpers |  |  |  |  |  | ● | 7 |
| `isJournalNote` | 4038 | 5 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `jrnEntryDate` | 4043 | 3 | other / helpers |  |  |  |  |  | ● | 4 |
| `setJrnEntryDate` | 4046 | 7 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_dlFlipDate` | 4062 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `_dateLineHTML` | 4070 | 18 | other / helpers |  |  |  |  |  | ● | 2 |
| `_p3MetaRowHTML` | 4100 | 8 | other / helpers |  |  |  |  |  | ● | 2 |
| `_isPlaceholder` | 4111 | 7 | other / helpers |  |  |  |  |  | ● | 2 |
| `chOf` | 4118 | 1 | other / helpers | ● |  |  |  |  | ● | 31 |
| `descOf` | 4121 | 1 | other / helpers |  |  |  |  |  | ● | 8 |
| `pathOf` | 4126 | 1 | other / helpers | ● |  |  |  |  | ● | 10 |
| `cntOf` | 4132 | 1 | other / helpers | ● |  |  |  |  | ● | 6 |
| `artsIn` | 4133 | 1 | other / helpers | ● |  |  |  |  | ● | 3 |
| `_autoLeavePrimary` | 4143 | 10 | other / helpers | ● |  |  |  |  | ● | 8 |
| `render` | 4155 | 1 | render |  |  |  |  |  | ● | 39 |
| `_renderPreserveEdit` | 4159 | 23 | render |  |  |  |  |  | ● | 3 |
| `_searchWords` | 4183 | 1 | find / smart views |  |  |  |  |  | ● | 2 |
| `_matchesAllWords` | 4184 | 1 | other / helpers |  |  |  |  |  | ● | 9 |
| `renderTree` | 4185 | 42 | render | ● |  |  |  |  | ● | 97 |
| `trNode` | 4228 | 20 | other / helpers |  |  |  |  |  | ● | 4 |
| `ensureFolderGroups` | 4255 | 6 | organisation |  |  |  |  |  | ● | 6 |
| `folderGroups` | 4261 | 1 | organisation |  |  |  |  |  | ● | 3 |
| `folderGroupOf` | 4262 | 1 | organisation |  |  |  |  |  | ● | 2 |
| `trGroupedKids` | 4263 | 27 | organisation |  |  |  |  |  | ● | 1 |
| `togFolderGroup` | 4290 | 5 | organisation |  |  |  |  |  | ● | 0 |
| `showFolderGroupCtx` | 4295 | 15 | organisation |  |  |  |  |  | ● | 0 |
| `addFolderGroup` | 4310 | 8 | organisation |  | ● |  |  |  | ● | 0 |
| `addFolderGroupThenMove` | 4318 | 13 | organisation | ● | ● |  |  |  | ● | 0 |
| `renameFolderGroup` | 4331 | 5 | organisation |  | ● |  |  |  | ● | 0 |
| `deleteFolderGroup` | 4336 | 14 | organisation | ● | ● |  |  |  | ● | 0 |
| `moveFolderToGroup` | 4350 | 5 | organisation | ● | ● |  |  |  | ● | 0 |
| `renderP2H` | 4356 | 117 | render | ● |  |  |  |  | ● | 21 |
| `renderP2C` | 4474 | 160 | render | ● |  |  |  |  | ● | 105 |
| `_navBtnsHTML` | 4640 | 8 | other / helpers |  |  |  |  |  | ● | 1 |
| `renderP3H` | 4648 | 221 | render | ● |  |  |  |  | ● | 89 |
| `renderP3C` | 4870 | 101 | render | ● |  |  |  |  | ● | 91 |
| `collapseFolder` | 4975 | 4 | organisation |  |  |  |  |  | ● | 2 |
| `selFolder` | 4980 | 14 | organisation |  |  |  |  |  | ● | 7 |
| `selArt` | 4994 | 8 | other / helpers | ● | ● |  |  |  | ● | 7 |
| `back` | 5009 | 1 | other / helpers |  |  |  |  |  |  | 0 |
| `togExp` | 5010 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `toggleSB` | 5016 | 11 | other / helpers |  |  |  |  |  | ● | 0 |
| `updateSbToggle` | 5028 | 13 | other / helpers |  |  |  |  |  | ● | 6 |
| `_fwOwns` | 5058 | 1 | editor / pop-out |  |  |  |  |  | ● | 3 |
| `_fwRaise` | 5059 | 6 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `startEdit` | 5065 | 5 | editor / pop-out | ● |  |  |  |  | ● | 1 |
| `cancelEdit` | 5070 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `saveArt` | 5071 | 41 | persistence | ● | ● |  |  |  | ● | 8 |
| `_sameArr` | 5102 | 1 | other / helpers |  |  |  |  |  | ● | 2 |
| `doSearch` | 5122 | 1 | find / smart views |  |  |  |  |  | ● | 1 |
| `clearSearch` | 5123 | 9 | find / smart views |  |  |  |  |  | ● | 1 |
| `restoreLastSearch` | 5132 | 7 | find / smart views |  |  |  |  |  | ● | 0 |
| `focusSidebarSearch` | 5139 | 4 | find / smart views |  |  |  |  |  | ● | 0 |
| `_updateSearchAccessUI` | 5143 | 6 | find / smart views |  |  |  |  |  | ● | 3 |
| `_renderP2SearchBar` | 5149 | 9 | render |  |  |  |  |  | ● | 2 |
| `_renderP3SearchBar` | 5158 | 14 | render | ● |  |  |  |  | ● | 2 |
| `goHome` | 5178 | 16 | other / helpers |  |  |  |  |  | ● | 0 |
| `ec` | 5195 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_alignBtnsHTML` | 5196 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `_txszStep` | 5209 | 15 | other / helpers |  |  |  |  |  | ● | 2 |
| `_txStepIn` | 5227 | 49 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `inEd` | 5229 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `edFontStep` | 5276 | 10 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_txClearIn` | 5290 | 24 | other / helpers |  |  |  |  |  | ● | 2 |
| `inRange` | 5295 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `edClearFmt` | 5314 | 8 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_curHeadingTag` | 5328 | 12 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `shiftHeadingLevel` | 5340 | 14 | other / helpers |  |  |  |  |  | ● | 1 |
| `shiftAllHeadingsMenu` | 5354 | 8 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `shiftAllHeadings` | 5362 | 21 | other / helpers |  |  |  |  |  | ● | 0 |
| `fb` | 5383 | 15 | other / helpers |  |  |  |  |  | ● | 0 |
| `_edHost` | 5411 | 7 | editor / pop-out |  |  |  |  |  | ● | 7 |
| `_edActive` | 5418 | 9 | editor / pop-out |  |  |  |  |  | ● | 13 |
| `_edTouched` | 5429 | 6 | persistence |  |  |  |  |  | ● | 4 |
| `_isED` | 5435 | 1 | other / helpers |  |  |  |  |  | ● | 9 |
| `_edAidOf` | 5439 | 6 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `_edArtOf` | 5445 | 4 | editor / pop-out | ● |  |  |  |  | ● | 4 |
| `_restoreCaret` | 5454 | 7 | destructive |  |  |  |  |  | ● | 5 |
| `insertAtCaret` | 5461 | 25 | editor / pop-out |  |  |  |  |  | ● | 15 |
| `_vpW` | 5488 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `_vpH` | 5489 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `isURL` | 5490 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `extractURL` | 5493 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `_dom` | 5499 | 1 | other / helpers |  |  |  |  |  | ● | 5 |
| `compressImage` | 5502 | 20 | other / helpers |  |  |  |  |  | ● | 1 |
| `insertImageFile` | 5522 | 4 | other / helpers |  |  |  |  |  | ● | 1 |
| `bkCardHTML` | 5529 | 7 | menus / dialogs |  |  |  |  |  | ● | 3 |
| `videoCardHTML` | 5539 | 11 | menus / dialogs |  |  |  |  |  | ● | 4 |
| `vidMentionHTML` | 5552 | 5 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `fetchVideoTitle` | 5557 | 8 | other / helpers |  |  | ● |  |  | ● | 2 |
| `embedHTML` | 5565 | 10 | other / helpers |  |  |  |  |  | ● | 2 |
| `bkMove` | 5576 | 5 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeItemMenu` | 5583 | 5 | menus / dialogs |  |  |  |  |  | ● | 19 |
| `_imOut` | 5589 | 3 | other / helpers |  |  |  |  |  | ● | 0 |
| `_itemTitle` | 5592 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `bkItemMenu` | 5599 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_popMenu` | 5600 | 8 | menus / dialogs |  |  |  |  |  | ● | 3 |
| `convertLinkEl` | 5608 | 13 | theme / appearance |  |  |  |  |  | ● | 4 |
| `itemMenu` | 5621 | 95 | menus / dialogs | ● | ● |  |  |  | ● | 3 |
| `mk` | 5625 | 3 | other / helpers |  |  |  |  |  | ● | 18 |
| `go` | 5626 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `doSearch` | 5655 | 40 | find / smart views | ● | ● |  |  |  | ● | 2 |
| `go` | 5665 | 5 | other / helpers | ● | ● |  |  |  | ● | 3 |
| `go` | 5675 | 4 | other / helpers | ● | ● |  |  |  | ● | 3 |
| `go` | 5684 | 3 | other / helpers |  | ● |  |  |  | ● | 3 |
| `attachChooser` | 5716 | 44 | other / helpers | ● | ● |  |  |  | ● | 2 |
| `go` | 5739 | 15 | other / helpers | ● | ● |  |  |  | ● | 3 |
| `closeImgRszBar` | 5764 | 6 | other / helpers |  |  |  |  |  | ● | 3 |
| `_imgRszOut` | 5770 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `showImgRszBar` | 5776 | 42 | other / helpers |  |  |  |  |  | ● | 1 |
| `btn` | 5780 | 2 | other / helpers |  |  |  |  |  | ● | 4 |
| `go` | 5781 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `sep` | 5782 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `applyPx` | 5794 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `imgAttachTag` | 5820 | 49 | tags / types / tabs | ● | ● |  |  |  | ● | 1 |
| `renderTags` | 5832 | 26 | render |  | ● |  |  |  | ● | 2 |
| `go` | 5838 | 5 | other / helpers |  | ● |  |  |  | ● | 3 |
| `isMyWallSubfolder` | 5875 | 9 | organisation | ● |  |  |  |  | ● | 2 |
| `togMwSubGrp` | 5884 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `togMwSubCat` | 5891 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `renderMyWallSubfolder` | 5897 | 97 | render | ● |  |  |  |  | ● | 1 |
| `_subtreeArts` | 5909 | 5 | organisation |  |  |  |  |  | ● | 1 |
| `_kindLatest` | 5943 | 1 | tags / types / tabs |  |  |  |  |  | ● | 4 |
| `_sortKinds` | 5944 | 4 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `newJournalEntry` | 5999 | 19 | calendar / journal / contacts / database | ● | ● |  |  |  |  | 0 |
| `toggleArchive` | 6021 | 9 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `mkArtTitleOnly` | 6036 | 28 | other / helpers | ● | ● |  |  |  | ● | 1 |
| `qtKey` | 6064 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `qtSave` | 6068 | 8 | other / helpers |  |  |  |  |  | ● | 1 |
| `openLinkToNote` | 6081 | 41 | theme / appearance | ● |  |  |  |  | ● | 0 |
| `render` | 6085 | 24 | render | ● |  |  |  |  | ● | 39 |
| `ltnSearch` | 6122 | 25 | find / smart views | ● |  |  |  |  | ● | 1 |
| `toggleNoteLink` | 6147 | 17 | theme / appearance | ● | ● |  |  |  | ● | 0 |
| `_posAnnBubble` | 6175 | 12 | other / helpers |  |  |  |  |  | ● | 1 |
| `showAnnBubble` | 6187 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `hideAnnBubble` | 6194 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `annBubClick` | 6201 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `wireAnnEditor` | 6210 | 14 | other / helpers |  |  |  |  |  | ● | 1 |
| `onUp` | 6211 | 6 | other / helpers |  |  |  |  |  | ● | 2 |
| `openAnnModal` | 6226 | 19 | menus / dialogs | ● |  |  |  |  | ● | 1 |
| `_cancelAnn` | 6245 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_confirmAnn` | 6247 | 36 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `annPanelHTML` | 6285 | 45 | other / helpers |  |  |  |  |  | ● | 3 |
| `_refreshAnnPanel` | 6330 | 9 | other / helpers |  |  |  |  |  | ● | 5 |
| `scrollToAnnComment` | 6341 | 6 | other / helpers |  |  |  |  |  | ● | 2 |
| `scrollToAnnMark` | 6347 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `showAnnReplyBox` | 6357 | 11 | other / helpers |  |  |  |  |  | ● | 0 |
| `submitAnnReply` | 6368 | 12 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_edCleanHTML` | 6384 | 6 | editor / pop-out |  |  |  |  |  | ● | 5 |
| `confirmDeleteAnnotation` | 6391 | 14 | destructive | ● |  |  |  |  | ● | 0 |
| `deleteAnnotation` | 6405 | 23 | destructive | ● | ● |  |  |  | ● | 1 |
| `toggleAnnMode` | 6431 | 6 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `injectInlineAnns` | 6441 | 49 | other / helpers |  |  |  |  |  | ● | 2 |
| `showAnnEditBox` | 6492 | 19 | other / helpers | ● |  |  |  |  | ● | 0 |
| `cancelAnnEdit` | 6511 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `saveAnnEdit` | 6515 | 12 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `showAnnReplyEdit` | 6529 | 16 | other / helpers | ● |  |  |  |  | ● | 0 |
| `saveAnnReplyEdit` | 6545 | 11 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `quickNewNote` | 6561 | 30 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_tabsMap` | 6602 | 7 | tags / types / tabs | ● |  |  |  |  | ● | 11 |
| `_tabOwner` | 6613 | 16 | tags / types / tabs | ● |  |  |  |  | ● | 4 |
| `_tabHost` | 6630 | 5 | tags / types / tabs | ● |  |  |  |  | ● | 5 |
| `_tabGroup` | 6635 | 1 | organisation |  |  |  |  |  | ● | 2 |
| `_tabStamps` | 6645 | 4 | cloud sync / auth |  |  |  |  |  | ● | 6 |
| `_tabStampAdd` | 6649 | 5 | cloud sync / auth |  |  |  |  |  | ● | 3 |
| `_tabStampRm` | 6654 | 5 | cloud sync / auth |  |  |  |  |  | ● | 3 |
| `_tabStampPurge` | 6662 | 6 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `_tabNoHost` | 6668 | 1 | tags / types / tabs |  |  |  |  |  | ● | 3 |
| `renderTabBar` | 6670 | 86 | render | ● | ● |  | ● |  | ● | 19 |
| `chip` | 6723 | 15 | other / helpers |  |  |  |  |  | ● | 2 |
| `_tabSplitVizAdd` | 6759 | 10 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `_tabNavSync` | 6773 | 23 | tags / types / tabs |  |  |  |  |  | ● | 3 |
| `_tabNavQueue` | 6796 | 8 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_tabScroll` | 6804 | 5 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_tabScrollIntoView` | 6811 | 9 | tags / types / tabs |  |  |  |  |  | ● | 6 |
| `tabSelect` | 6820 | 15 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `toggleTab` | 6835 | 18 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `closeTab` | 6853 | 9 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `closeTabGroup` | 6862 | 9 | organisation |  | ● |  |  |  | ● | 0 |
| `tabBarDragOver` | 6876 | 6 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `tabBarDragLeave` | 6882 | 3 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `tabBarDrop` | 6885 | 20 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `fmtRemDt` | 6913 | 7 | reminders / review |  |  |  |  |  | ● | 2 |
| `reminderStripHTML` | 6921 | 17 | reminders / review |  |  |  |  |  | ● | 1 |
| `openReminderModal` | 6939 | 22 | reminders / review | ● |  |  |  |  | ● | 2 |
| `closeReminderModal` | 6961 | 6 | reminders / review |  |  |  |  |  | ● | 1 |
| `saveReminder` | 6968 | 14 | reminders / review | ● | ● |  |  |  | ● | 0 |
| `clearReminder` | 6982 | 8 | reminders / review | ● | ● |  | ● |  | ● | 0 |
| `deleteNote` | 6997 | 22 | destructive | ● | ● |  | ● |  | ● | 0 |
| `mwRelDate` | 7022 | 15 | other / helpers |  |  |  |  |  | ● | 1 |
| `renderSecSF` | 7047 | 25 | render |  |  |  |  |  | ● | 1 |
| `togSecSF` | 7074 | 6 | find / smart views |  |  |  |  |  | ● | 0 |
| `selSecSF` | 7082 | 10 | find / smart views |  |  |  |  |  | ● | 0 |
| `getSectionFolderIds` | 7094 | 6 | organisation | ● |  |  |  |  | ● | 2 |
| `walk` | 7096 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `getSecArts` | 7100 | 4 | other / helpers | ● |  |  |  |  | ● | 2 |
| `getSecSmartArts` | 7106 | 17 | find / smart views |  |  |  |  |  | ● | 4 |
| `getSecSmartGroups` | 7125 | 34 | organisation |  |  |  |  |  | ● | 3 |
| `ts` | 7128 | 1 | other / helpers |  |  |  |  |  | ● | 12 |
| `sod` | 7129 | 1 | other / helpers |  |  |  |  |  | ● | 2 |
| `openTabPicker` | 7166 | 47 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_outside` | 7200 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeTabPicker` | 7214 | 4 | tags / types / tabs |  |  |  |  |  | ● | 3 |
| `renderTabPickerList` | 7219 | 33 | render | ● |  |  |  |  | ● | 1 |
| `addToTabPicker` | 7253 | 18 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `_ntiChipTap` | 7281 | 4 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `openNtiPicker` | 7285 | 13 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_cl` | 7295 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeNtiPicker` | 7298 | 1 | tags / types / tabs |  |  |  |  |  | ● | 4 |
| `renderNtiPickerBody` | 7299 | 28 | render | ● |  |  |  |  | ● | 12 |
| `openJournalPicker` | 7332 | 15 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_cl` | 7344 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeJournalPicker` | 7347 | 1 | calendar / journal / contacts / database |  |  |  |  |  | ● | 3 |
| `renderJournalPickerBody` | 7348 | 15 | render | ● |  |  |  |  | ● | 3 |
| `_ensureJournalTag` | 7363 | 6 | tags / types / tabs |  |  |  |  |  | ● | 3 |
| `toggleNoteJournal` | 7369 | 11 | calendar / journal / contacts / database | ● | ● |  | ● |  | ● | 0 |
| `newJournalEventForNote` | 7380 | 14 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `openAttachMenu` | 7399 | 32 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `openMyDatabasePicker` | 7434 | 13 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_cl` | 7444 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeMyDatabasePicker` | 7447 | 1 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `renderMyDatabasePickerBody` | 7448 | 14 | render | ● |  |  |  |  | ● | 2 |
| `toggleNoteDbFolder` | 7462 | 11 | organisation | ● | ● |  | ● |  | ● | 0 |
| `togNtiCat` | 7473 | 1 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_ctxPos` | 7474 | 1 | menus / dialogs |  |  |  |  |  | ● | 12 |
| `addNtiCat` | 7475 | 1 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `openCatClrPicker` | 7476 | 9 | menus / dialogs |  | ● |  |  |  | ● | 0 |
| `catTextStyle` | 7485 | 8 | other / helpers |  |  |  |  |  | ● | 3 |
| `toggleNtiCatBold` | 7493 | 1 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `setNtiCatSize` | 7494 | 1 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `showNtiCatMenu` | 7495 | 6 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `showNtiSectionMenu` | 7501 | 13 | organisation |  |  |  |  |  | ● | 0 |
| `renNtiSectionLabel` | 7514 | 9 | organisation | ● | ● |  |  |  | ● | 0 |
| `openNtiSectionClrPicker` | 7523 | 8 | organisation | ● | ● |  |  |  | ● | 0 |
| `ntiSbToggleAllCats` | 7531 | 7 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `renNtiCat` | 7538 | 1 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `delNtiCat` | 7539 | 2 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `showNtiKindMenu` | 7541 | 1 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `addKindInCat` | 7542 | 2 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `renNtiKind` | 7544 | 1 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `delNtiKind` | 7545 | 2 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `moveKindToCat` | 7547 | 1 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `_migrateNotebook` | 7555 | 21 | startup / load / migration |  |  | ● |  |  | ● | 1 |
| `runMigration` | 7577 | 24 | other / helpers |  | ● | ● |  |  | ● | 0 |
| `generateBackupHTMLContent` | 7604 | 48 | export / import / backup | ● |  |  |  |  | ● | 3 |
| `chOf` | 7609 | 1 | other / helpers | ● |  |  |  |  | ● | 31 |
| `notesIn` | 7610 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `kindChips` | 7611 | 1 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `tagChips` | 7612 | 1 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `statusBadge` | 7613 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `fmtDate` | 7614 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `renderNote` | 7615 | 4 | render |  |  |  |  |  | ● | 2 |
| `renderFolder` | 7619 | 9 | render | ● |  |  |  |  | ● | 2 |
| `exportBackupHTML` | 7652 | 9 | export / import / backup |  |  |  |  | ● | ● | 0 |
| `exportBackupPDF` | 7661 | 7 | export / import / backup |  |  |  |  | ● | ● | 0 |
| `backupToGDrive` | 7670 | 27 | export / import / backup |  |  | ● |  |  | ● | 0 |
| `_getDriveFolder` | 7697 | 12 | organisation |  |  | ● |  |  | ● | 1 |
| `_uploadToDrive` | 7709 | 9 | other / helpers |  |  | ● |  |  | ● | 1 |
| `syncKnowledgeBase` | 7721 | 14 | other / helpers | ● | ● |  |  |  | ● | 1 |
| `importBackup` | 7740 | 43 | export / import / backup | ● |  |  |  |  | ● | 0 |
| `_mergeBackup` | 7784 | 11 | export / import / backup | ● | ● |  |  |  | ● | 1 |
| `_replaceWithBackup` | 7796 | 16 | export / import / backup | ● | ● |  |  |  | ● | 1 |
| `_weekOfMonth` | 7815 | 1 | other / helpers |  |  |  |  |  | ● | 2 |
| `toggleJournalMode` | 7816 | 5 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `quickJournalEntry` | 7821 | 11 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 2 |
| `openAddNoteToEvent` | 7833 | 13 | other / helpers | ● |  |  |  |  | ● | 0 |
| `_aneFilter` | 7846 | 5 | find / smart views |  |  |  |  |  | ● | 0 |
| `addExistingNoteToEvent` | 7851 | 12 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `moveJrnEvent` | 7865 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `togJrnGrp` | 7873 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `jrnGroupDate` | 7877 | 5 | organisation | ● |  |  |  |  | ● | 3 |
| `setJrnGroupBy` | 7882 | 7 | organisation | ● | ● |  |  |  | ● | 0 |
| `_jrnGroupByToggleHTML` | 7889 | 7 | organisation | ● |  |  |  |  | ● | 2 |
| `_buildJournalView` | 7896 | 42 | calendar / journal / contacts / database |  |  |  |  |  | ● | 3 |
| `_renderJournalFolder` | 7938 | 6 | render | ● |  |  |  |  | ● | 1 |
| `_renderJournalSmartView` | 7944 | 44 | render | ● |  |  |  |  | ● | 2 |
| `toggleAccordionSec` | 7992 | 6 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `updateAccordionBtn` | 7998 | 4 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_getFavCats` | 8013 | 4 | tags / types / tabs |  |  |  |  |  | ● | 8 |
| `selDbItem` | 8017 | 7 | calendar / journal / contacts / database |  |  |  |  |  | ● | 4 |
| `renderDatabaseSection` | 8024 | 36 | render | ● |  |  |  |  | ● | 1 |
| `_renderMyJournalDB` | 8060 | 1 | render |  |  |  |  |  | ● | 2 |
| `renameJrnEvent` | 8063 | 6 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_setJrnStyle` | 8069 | 9 | other / helpers | ● | ● |  | ● |  | ● | 2 |
| `pickJrnColor` | 8078 | 6 | theme / appearance | ● |  |  |  |  | ● | 0 |
| `cycleJrnSize` | 8084 | 7 | other / helpers | ● |  |  |  |  |  | 0 |
| `resetJrnStyle` | 8091 | 4 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `_jrnCardStyleTag` | 8095 | 9 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_jrnSizeLive` | 8104 | 10 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_jrnSizeCommit` | 8114 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `_jrnStyleMenu` | 8115 | 29 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `_renderMyFavourites` | 8144 | 40 | render | ● |  |  |  |  | ● | 2 |
| `addFavCat` | 8185 | 12 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `showFavCatCtx` | 8197 | 13 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `renameFavCat` | 8210 | 7 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `deleteFavCat` | 8217 | 7 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `setNoteFavCat` | 8224 | 8 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `newFavEntry` | 8232 | 23 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `_ctName` | 8259 | 5 | other / helpers |  |  |  |  |  | ● | 15 |
| `newContact` | 8265 | 22 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `toggleCTMode` | 8288 | 14 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `toggleCTNameMode` | 8303 | 14 | other / helpers | ● |  |  |  |  | ● | 0 |
| `addCTPhone` | 8318 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `_saveContactForm` | 8327 | 21 | persistence |  | ● |  |  |  | ● | 1 |
| `renderCTCard` | 8349 | 20 | render |  |  |  |  |  | ● | 1 |
| `renderCTForm` | 8370 | 38 | render |  |  |  |  |  | ● | 1 |
| `_renderMyContacts` | 8409 | 22 | render | ● |  |  |  |  | ● | 2 |
| `showDbItemCtx` | 8435 | 42 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_renderWhoBar` | 8483 | 11 | render |  |  |  |  |  | ● | 1 |
| `_whoSearch` | 8495 | 22 | find / smart views | ● |  |  |  |  | ● | 0 |
| `_whoClear` | 8518 | 4 | other / helpers |  |  |  |  |  | ● | 1 |
| `_whoSelect` | 8523 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `logInteraction` | 8529 | 17 | other / helpers | ● | ● |  |  |  | ● | 1 |
| `_elapsed` | 8548 | 11 | other / helpers |  |  |  |  |  | ● | 3 |
| `_renderInteractionLog` | 8561 | 25 | render |  |  |  |  |  | ● | 1 |
| `newStarredNote` | 8590 | 12 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `newPinnedNote` | 8603 | 12 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `newNoteWithReminder` | 8616 | 12 | reminders / review | ● | ● |  |  |  | ● | 0 |
| `quickJournalEntryFromDB` | 8629 | 16 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `_trackLastFolder` | 8647 | 6 | organisation | ● |  |  |  |  | ● | 2 |
| `newJournalFolder` | 8657 | 14 | organisation |  |  |  |  |  | ● | 0 |
| `_njfRow` | 8671 | 7 | other / helpers |  |  |  |  |  | ● | 2 |
| `njfFilter` | 8678 | 18 | find / smart views | ● |  |  |  |  | ● | 2 |
| `rows` | 8687 | 1 | other / helpers |  |  |  |  |  | ● | 4 |
| `njfSelect` | 8696 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `createNewJournalFolder` | 8700 | 26 | organisation | ● | ● |  |  |  | ● | 0 |
| `calJournalFolderIds` | 8729 | 10 | organisation | ● |  |  |  |  | ● | 2 |
| `calJournalEntries` | 8739 | 6 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 4 |
| `calJournalCount` | 8745 | 1 | calendar / journal / contacts / database |  |  |  |  |  | ● | 2 |
| `openJrnCalScope` | 8746 | 32 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 3 |
| `_jrnScopeSetMode` | 8778 | 3 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_jrnScopeSetOne` | 8781 | 3 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_jrnScopeToggle` | 8784 | 7 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `_calInit` | 8794 | 23 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 9 |
| `_calWeekStart` | 8817 | 1 | calendar / journal / contacts / database |  |  |  |  |  | ● | 2 |
| `_calOpen` | 8818 | 6 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `_calNav` | 8824 | 20 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `_calToday` | 8844 | 7 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_calRenderH` | 8851 | 58 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 2 |
| `_loadCalHols` | 8909 | 10 | calendar / journal / contacts / database |  | ● | ● |  |  | ● | 5 |
| `_calPublicHols` | 8919 | 10 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 3 |
| `_calSchoolHols` | 8929 | 15 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 3 |
| `_calHolsForDate` | 8944 | 6 | find / smart views |  |  |  |  |  | ● | 3 |
| `_calNoteCount` | 8950 | 3 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `_calSelectDate` | 8953 | 44 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `close` | 8993 | 1 | other / helpers |  |  |  |  |  | ● | 6 |
| `_calNewNote` | 8997 | 14 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `_calNewJournal` | 9011 | 15 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `_calViewNotes` | 9026 | 9 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `_calRenderMonth` | 9035 | 48 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `_calRenderWeek` | 9083 | 27 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `_calRenderYear` | 9110 | 27 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `openCalSettings` | 9137 | 14 | calendar / journal / contacts / database | ● | ● |  | ● |  | ● | 0 |
| `_showClrPicker` | 9157 | 51 | menus / dialogs |  |  |  |  |  | ● | 14 |
| `close` | 9205 | 1 | other / helpers |  |  |  |  |  | ● | 6 |
| `togClrFam` | 9208 | 9 | other / helpers |  |  |  |  |  | ● | 0 |
| `_clrHover` | 9217 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `_clrPick` | 9221 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `openFolClrPicker` | 9225 | 5 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `openSecClrPicker` | 9230 | 5 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `openKindClrPicker` | 9235 | 10 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `openSfClrPicker` | 9249 | 4 | find / smart views |  |  |  |  |  | ● | 0 |
| `openDbItemClrPicker` | 9253 | 10 | calendar / journal / contacts / database | ● | ● |  | ● |  | ● | 0 |
| `openThemeClrPicker` | 9263 | 16 | theme / appearance |  |  |  |  |  | ● | 0 |
| `showTagClrPicker` | 9281 | 14 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `openTabClrPicker` | 9295 | 7 | tags / types / tabs | ● | ● |  | ● |  | ● | 0 |
| `_popGeoAll` | 9314 | 13 | menus / dialogs | ● |  |  |  |  | ● | 9 |
| `_popGeoFlush` | 9327 | 6 | menus / dialogs |  | ● |  |  |  | ● | 6 |
| `openNoteAsModal` | 9340 | 30 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `openNoteModal` | 9370 | 75 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_p3SheetHdSync` | 9449 | 16 | menus / dialogs | ● |  |  |  |  | ● | 2 |
| `closeNoteModal` | 9465 | 40 | menus / dialogs |  |  |  |  |  | ● | 5 |
| `_ptrDown` | 9514 | 5 | other / helpers |  |  |  |  |  | ● | 12 |
| `_ptrUp` | 9519 | 5 | other / helpers |  |  |  |  |  | ● | 14 |
| `_modalDragStart` | 9524 | 8 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_modalDragMove` | 9532 | 7 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalDragEnd` | 9539 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalHandlesOff` | 9548 | 21 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_modalClampToViewport` | 9573 | 10 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_modalResizeRStart` | 9583 | 9 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeRMove` | 9592 | 6 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeREnd` | 9598 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBStart` | 9599 | 9 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBMove` | 9608 | 6 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBEnd` | 9614 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeLStart` | 9615 | 9 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeLMove` | 9624 | 7 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeLEnd` | 9631 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeTStart` | 9632 | 9 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_modalResizeTMove` | 9641 | 8 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeTEnd` | 9649 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_tabBarModalDown` | 9650 | 22 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `onMove` | 9657 | 10 | other / helpers |  |  |  |  |  | ● | 2 |
| `onUp` | 9667 | 1 | other / helpers |  |  |  |  |  | ● | 2 |
| `_tabBarCursor` | 9672 | 7 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_openFloatPop` | 9689 | 20 | menus / dialogs |  |  |  |  |  | ● | 8 |
| `_cl` | 9700 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `_flPopPlace` | 9725 | 26 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `closeFloatPop` | 9751 | 1 | menus / dialogs |  |  |  |  |  | ● | 8 |
| `_closeStickyPop` | 9754 | 6 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_p3HomeBtnHTML` | 9771 | 5 | other / helpers |  |  |  |  |  | ● | 3 |
| `_p3OneBar` | 9799 | 1 | other / helpers |  |  |  |  |  | ● | 11 |
| `_p3EditIconsHTML` | 9800 | 27 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ebOpenTabsHTML` | 9838 | 22 | tags / types / tabs | ● |  |  |  |  | ● | 1 |
| `row` | 9848 | 7 | other / helpers |  |  |  |  |  | ● | 8 |
| `togEBGroup` | 9860 | 12 | organisation |  |  |  |  |  | ● | 0 |
| `_ebListsHTML` | 9900 | 9 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ebInsertHTML` | 9909 | 8 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ebAttachHTML` | 9931 | 41 | other / helpers |  |  |  |  |  | ● | 3 |
| `row` | 9941 | 2 | other / helpers |  |  |  |  |  | ● | 8 |
| `_ebGoToHTML` | 9976 | 11 | other / helpers |  |  |  |  |  | ● | 3 |
| `_ebPopHTML` | 9995 | 14 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `row` | 9999 | 8 | other / helpers |  |  |  |  |  | ● | 8 |
| `_ebTagRowHTML` | 10013 | 5 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_ebNoteStateHTML` | 10021 | 18 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ebSectionToolsHTML` | 10039 | 11 | organisation | ● |  |  |  |  | ● | 2 |
| `_buildEBSub` | 10050 | 87 | other / helpers | ● |  |  |  |  | ● | 1 |
| `duplicateNote` | 10144 | 25 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `_fwFocus` | 10192 | 9 | editor / pop-out |  |  |  |  |  | ● | 3 |
| `_popTier` | 10234 | 1 | menus / dialogs |  |  |  |  |  | ● | 9 |
| `_popIcoHTML` | 10246 | 15 | menus / dialogs |  |  |  |  |  | ● | 7 |
| `_popBtnHTML` | 10264 | 9 | menus / dialogs |  |  |  |  |  | ● | 4 |
| `_popKindLbl` | 10275 | 4 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `_notePopMode` | 10279 | 4 | menus / dialogs | ● |  |  |  |  | ● | 1 |
| `_rememberNotePop` | 10286 | 8 | reminders / review | ● | ● |  |  |  | ● | 1 |
| `openNotePopup` | 10296 | 7 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `closeAllFloats` | 10306 | 6 | other / helpers |  | ● |  |  |  | ● | 3 |
| `closeAllPopouts` | 10312 | 5 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_fwSyncCloseAllChip` | 10320 | 41 | editor / pop-out | ● |  |  |  |  | ● | 4 |
| `_panelToFloat` | 10364 | 22 | other / helpers |  |  |  |  |  | ● | 1 |
| `popOutNote` | 10386 | 32 | editor / pop-out |  |  |  |  |  | ● | 6 |
| `_fwDefaultGeom` | 10428 | 11 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_fwCreate` | 10439 | 48 | editor / pop-out | ● |  |  |  |  | ● | 1 |
| `_syncCol` | 10468 | 4 | cloud sync / auth |  |  |  |  |  | ● | 0 |
| `_fwResizeStart` | 10492 | 25 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `move` | 10498 | 10 | other / helpers |  |  |  |  |  | ● | 1 |
| `up` | 10508 | 5 | other / helpers |  |  |  |  |  | ● | 1 |
| `_fwAddResizeHandles` | 10517 | 14 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_fwSavePos` | 10535 | 11 | editor / pop-out |  | ● |  |  |  | ● | 3 |
| `_fwMetaHTML` | 10551 | 25 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_findEls` | 10591 | 14 | destructive |  |  |  |  |  | ● | 6 |
| `_ntFindRanges` | 10605 | 19 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ntFindPaint` | 10624 | 8 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ntFindLabel` | 10632 | 4 | other / helpers |  |  |  |  |  | ● | 4 |
| `_ntFindRun` | 10636 | 9 | other / helpers |  |  |  |  |  | ● | 0 |
| `_ntFindStep` | 10645 | 13 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ntFindToggle` | 10658 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `_ntFindClose` | 10666 | 7 | other / helpers |  |  |  |  |  | ● | 7 |
| `_ntFindKey` | 10673 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `_noteSiblings` | 10695 | 9 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_p3Navigate` | 10706 | 10 | other / helpers |  |  |  |  |  | ● | 0 |
| `_fwNavigate` | 10716 | 23 | editor / pop-out |  | ● |  |  |  | ● | 0 |
| `_fwFlashSaved` | 10739 | 7 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_fwRenderBody` | 10746 | 47 | editor / pop-out | ● |  |  |  |  | ● | 1 |
| `_fwEc` | 10802 | 6 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_fwFb` | 10808 | 13 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_fwFontStep` | 10823 | 7 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_fwClearFmt` | 10830 | 7 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_fwBuildEBSub` | 10837 | 48 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_fwTogGroup` | 10886 | 8 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_fwWireDrag` | 10894 | 23 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `move` | 10897 | 4 | other / helpers |  |  |  |  |  | ● | 1 |
| `up` | 10901 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `_fwFlush` | 10921 | 13 | editor / pop-out | ● |  |  |  |  | ● | 5 |
| `_fwSave` | 10934 | 10 | editor / pop-out | ● | ● |  |  |  | ● | 0 |
| `_fwScheduleAutoSave` | 10949 | 18 | editor / pop-out | ● | ● |  | ● |  | ● | 7 |
| `closeFloatWin` | 10969 | 16 | other / helpers | ● | ● |  | ● |  | ● | 3 |
| `_modalResizeTRStart` | 10988 | 9 | menus / dialogs |  |  |  |  |  |  | 0 |
| `_modalResizeTRMove` | 10997 | 10 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeTREnd` | 11007 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeTLStart` | 11009 | 9 | menus / dialogs |  |  |  |  |  |  | 0 |
| `_modalResizeTLMove` | 11018 | 9 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeTLEnd` | 11027 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBLStart` | 11029 | 9 | menus / dialogs |  |  |  |  |  |  | 0 |
| `_modalResizeBLMove` | 11038 | 8 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBLEnd` | 11046 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBRStart` | 11051 | 9 | menus / dialogs |  |  |  |  |  |  | 0 |
| `_modalResizeBRMove` | 11060 | 7 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBREnd` | 11067 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_tabBarModalReset` | 11070 | 14 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `setMwFontSize` | 11086 | 9 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `todayStr` | 11098 | 4 | other / helpers |  |  |  |  |  | ● | 6 |
| `togCalLayer` | 11102 | 6 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `_calGetCat` | 11108 | 3 | calendar / journal / contacts / database |  |  |  |  |  | ● | 8 |
| `_calNewEvent` | 11111 | 6 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_calEditEvent` | 11117 | 5 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_calUpdateFormAllDay` | 11122 | 5 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_calSaveEvent` | 11127 | 31 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `_calDelEvent` | 11158 | 7 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `_calRenderEventForm` | 11165 | 29 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_calRenderDay` | 11194 | 60 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `_renderMyCalP2` | 11254 | 40 | render |  |  |  |  |  | ● | 2 |
| `_calJumpToDate` | 11294 | 9 | calendar / journal / contacts / database |  |  |  |  |  |  | 0 |
| `_upcomingEvents` | 11306 | 21 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_renderComingUp` | 11327 | 29 | render |  |  |  |  |  | ● | 1 |
| `_calManageCats` | 11356 | 6 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_calAddCat` | 11362 | 8 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `_calSaveCat` | 11370 | 9 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `_calDelCat` | 11379 | 5 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `_calRenderCatList` | 11384 | 16 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `openGlobalSearch` | 11404 | 25 | find / smart views |  |  |  |  |  | ● | 1 |
| `closeGlobalSearch` | 11429 | 3 | find / smart views |  |  |  |  |  | ● | 5 |
| `_gsSearch` | 11432 | 17 | find / smart views | ● |  |  |  |  | ● | 1 |
| `_gsHL` | 11449 | 6 | other / helpers |  |  |  |  |  | ● | 2 |
| `_gsRender` | 11455 | 25 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_gsSetActive` | 11480 | 5 | other / helpers |  |  |  |  |  | ● | 2 |
| `_gsNav` | 11485 | 5 | other / helpers |  |  |  |  |  | ● | 2 |
| `_gsConfirm` | 11490 | 4 | other / helpers |  |  |  |  |  | ● | 1 |
| `_gsOpen` | 11494 | 4 | other / helpers |  |  |  |  |  | ● | 1 |
| `_hjDate` | 11505 | 18 | other / helpers |  |  |  |  |  | ● | 9 |
| `_hjStr` | 11523 | 4 | other / helpers |  |  |  |  |  | ● | 1 |
| `toggleHijri` | 11527 | 7 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `installPWA` | 11539 | 10 | other / helpers |  |  |  |  |  | ● | 0 |
| `_mrjDueArts` | 11564 | 5 | other / helpers | ● |  |  |  |  | ● | 4 |
| `_mrjAllEnrolled` | 11569 | 4 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_mrjDueCount` | 11573 | 1 | other / helpers |  |  |  |  |  |  | 0 |
| `mrjToggle` | 11574 | 11 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `_mrjSchedule` | 11585 | 10 | other / helpers |  | ● |  |  |  | ● | 1 |
| `mrjStart` | 11595 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `mrjRate` | 11601 | 9 | other / helpers | ● |  |  |  |  | ● | 0 |
| `mrjNext` | 11610 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `mrjEnd` | 11617 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `_mrjRenderFooter` | 11623 | 9 | other / helpers |  |  |  |  |  | ● | 1 |
| `_mrjRenderP2C` | 11632 | 25 | other / helpers |  |  |  |  |  | ● | 1 |
| `practiceToggle` | 11662 | 6 | reminders / review | ● | ● |  | ● |  | ● | 0 |
| `_practiceRenderP2C` | 11668 | 24 | reminders / review | ● |  |  |  |  | ● | 1 |
| `openCiteModal` | 11697 | 11 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `closeCiteModal` | 11708 | 3 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `setCiteType` | 11711 | 5 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_buildCiteHTML` | 11716 | 30 | other / helpers |  |  |  |  |  | ● | 1 |
| `insertCite` | 11746 | 12 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_citeModalHTML` | 11758 | 40 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_tocHostEl` | 11805 | 5 | other / helpers |  |  |  |  |  | ● | 4 |
| `_tocScrollEl` | 11810 | 5 | other / helpers |  |  |  |  |  | ● | 3 |
| `_tocScan` | 11815 | 6 | other / helpers |  |  |  |  |  | ● | 3 |
| `_tocItemHTML` | 11822 | 6 | other / helpers |  |  |  |  |  | ● | 2 |
| `_tocInject` | 11829 | 91 | other / helpers | ● |  |  |  |  | ● | 4 |
| `togTocTitle` | 11920 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `_tocBindScroll` | 11925 | 14 | other / helpers |  |  |  |  |  | ● | 1 |
| `_tocUnbindScroll` | 11940 | 7 | other / helpers |  |  |  |  |  | ● | 6 |
| `_tocScrollTo` | 11948 | 18 | other / helpers |  |  |  |  |  | ● | 1 |
| `_tocSetActive` | 11967 | 14 | other / helpers |  |  |  |  |  | ● | 3 |
| `_tocToggleSide` | 11982 | 35 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_tocStartResize` | 12017 | 21 | other / helpers | ● | ● |  |  |  |  | 0 |
| `onMove` | 12024 | 5 | other / helpers |  |  |  |  |  | ● | 1 |
| `onUp` | 12029 | 6 | other / helpers | ● | ● |  |  |  | ● | 1 |
| `_tocDestroy` | 12038 | 11 | other / helpers |  |  |  |  |  | ● | 1 |
| `pinTabDStart` | 12058 | 4 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_pinPanelDragOver` | 12062 | 4 | tags / types / tabs |  |  |  |  |  |  | 0 |
| `_pinPanelDragLeave` | 12066 | 3 | tags / types / tabs |  |  |  |  |  |  | 0 |
| `_pinPanelDrop` | 12069 | 8 | tags / types / tabs |  |  |  |  |  |  | 0 |
| `pinTabToPanel` | 12077 | 10 | tags / types / tabs | ● | ● |  |  |  | ● | 1 |
| `unpinTab` | 12087 | 6 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `_pinPanelToggleSide` | 12093 | 6 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `_extractHeadingsFromHTML` | 12102 | 17 | find / smart views |  |  |  |  |  | ● | 1 |
| `togPinExpand` | 12119 | 5 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `togPinCardMode` | 12124 | 5 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `togPinHeadExpand` | 12129 | 6 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_pinHeadsTreeHTML` | 12135 | 12 | organisation |  |  |  |  |  | ● | 1 |
| `_pinCardHTML` | 12147 | 25 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `_pinHostEl` | 12172 | 5 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_pinPanelInject` | 12177 | 94 | tags / types / tabs | ● | ● |  |  |  | ● | 10 |
| `_fwSyncBodyPadding` | 12274 | 12 | editor / pop-out |  |  |  |  |  | ● | 9 |
| `_fwClearAllBodyPadding` | 12286 | 3 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `_pinStartResize` | 12289 | 22 | tags / types / tabs |  | ● |  |  |  |  | 0 |
| `onMove` | 12296 | 5 | other / helpers |  |  |  |  |  | ● | 1 |
| `onUp` | 12301 | 8 | other / helpers |  | ● |  |  |  | ● | 1 |
| `_pinPanelDestroy` | 12311 | 4 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_pinOpenNote` | 12319 | 4 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_syncP3CPadding` | 12326 | 11 | cloud sync / auth |  |  |  |  |  | ● | 8 |
| `_tocMobileCheck` | 12340 | 13 | other / helpers |  |  |  |  |  | ● | 2 |
| `_tocOpenMobile` | 12354 | 13 | other / helpers |  |  |  |  |  |  | 0 |
| `_tocCloseMobile` | 12368 | 10 | other / helpers |  |  |  |  |  | ● | 2 |
| `_tocMobileScrollTo` | 12379 | 4 | other / helpers |  |  |  |  |  |  | 0 |
| `_dfltHdStyles` | 12388 | 4 | other / helpers |  |  |  |  |  | ● | 6 |
| `_applyHeadingStyles` | 12392 | 11 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_initCollapsible` | 12403 | 38 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_colToggle` | 12441 | 15 | other / helpers | ● | ● |  | ● |  | ● | 1 |
| `_colAll` | 12456 | 12 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `_colToolbarBtnHTML` | 12476 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `toggleColPop` | 12482 | 10 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `_p3FitToolbar` | 12505 | 37 | other / helpers |  |  |  |  |  | ● | 6 |
| `fits` | 12517 | 1 | other / helpers |  |  |  |  |  | ● | 4 |
| `_p3FitEditBar` | 12559 | 16 | other / helpers |  |  |  |  |  | ● | 1 |
| `_p3PalBtn` | 12576 | 9 | other / helpers |  |  |  |  |  | ● | 13 |
| `_moreBtnHint` | 12589 | 3 | other / helpers |  |  |  |  |  | ● | 1 |
| `_p3ActPalette` | 12592 | 48 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `_p3NtiPalette` | 12640 | 20 | tags / types / tabs | ● |  |  |  |  | ● | 0 |
| `_colTogglePreview` | 12660 | 5 | reminders / review | ● | ● |  |  |  | ● | 0 |
| `openHeadingStylesModal` | 12665 | 29 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `closeHeadingStylesModal` | 12694 | 1 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `resetHeadingStyles` | 12695 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `saveHeadingStyles` | 12702 | 11 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_pasteHasStructure` | 12720 | 8 | other / helpers |  |  |  |  |  | ● | 1 |
| `_openSmartPastePop` | 12729 | 33 | find / smart views |  |  |  |  |  | ● | 1 |
| `go` | 12750 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `_closeSmartPastePop` | 12763 | 5 | find / smart views |  |  |  |  |  | ● | 1 |
| `_cleanPasteHTML` | 12769 | 10 | other / helpers |  |  |  |  |  | ● | 2 |
| `_smartPasteHTML` | 12780 | 32 | find / smart views |  |  |  |  |  | ● | 1 |
| `_doPaste` | 12813 | 31 | other / helpers | ● | ● |  |  |  | ● | 4 |
| `getOutLinks` | 12851 | 8 | theme / appearance | ● |  |  |  |  | ● | 1 |
| `getBacklinks` | 12859 | 5 | theme / appearance | ● |  |  |  |  | ● | 1 |
| `_blSnippet` | 12864 | 13 | other / helpers |  |  |  |  |  | ● | 1 |
| `backlinksHTML` | 12877 | 17 | theme / appearance |  |  |  |  |  | ● | 3 |
| `refreshBacklinks` | 12895 | 10 | render | ● |  |  |  |  | ● | 2 |
| `upgradeViewCards` | 12908 | 30 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `closePastePop` | 12941 | 5 | menus / dialogs |  |  |  |  |  | ● | 6 |
| `openPastePop` | 12946 | 25 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `mk` | 12949 | 3 | other / helpers |  |  |  |  |  | ● | 18 |
| `go` | 12950 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `_ppOut` | 12971 | 3 | other / helpers |  |  |  |  |  | ● | 0 |
| `_caretXY` | 12975 | 8 | other / helpers |  |  |  |  |  | ● | 2 |
| `closeMenDD` | 12985 | 1 | other / helpers |  |  |  |  |  | ● | 8 |
| `_menQuery` | 12986 | 8 | find / smart views |  |  |  |  |  | ● | 2 |
| `showMenDD` | 12994 | 21 | other / helpers | ● |  |  |  |  | ● | 2 |
| `go` | 13006 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `insertMention` | 13015 | 10 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `edImgPick` | 13027 | 3 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `edLink` | 13030 | 6 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `edBookmarkBtn` | 13036 | 4 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `edMentionBtn` | 13040 | 1 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `flashSaved` | 13048 | 8 | other / helpers |  |  |  |  |  | ● | 2 |
| `_edAutoSave` | 13061 | 12 | editor / pop-out | ● | ● |  |  |  | ● | 4 |
| `_edBlocksInSel` | 13074 | 10 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `edBoundary` | 13085 | 10 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `edMarkDone` | 13096 | 10 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `edColorBtn` | 13110 | 7 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_clrPopAway` | 13117 | 6 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_closeColorPop` | 13123 | 1 | theme / appearance |  |  |  |  |  | ● | 2 |
| `_openColorPop` | 13124 | 31 | theme / appearance |  |  |  |  |  | ● | 1 |
| `sw` | 13128 | 11 | other / helpers |  |  |  |  |  | ● | 2 |
| `_applyColor` | 13155 | 16 | theme / appearance |  |  |  |  |  | ● | 0 |
| `_edColHeads` | 13182 | 9 | editor / pop-out |  |  |  |  |  | ● | 4 |
| `_edColClean` | 13192 | 5 | editor / pop-out |  |  |  |  |  | ● | 7 |
| `_edColApply` | 13198 | 32 | editor / pop-out | ● |  |  |  |  | ● | 5 |
| `_edColInit` | 13231 | 26 | editor / pop-out |  |  |  |  |  | ● | 8 |
| `_edRetag` | 13265 | 8 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edBlockDragStart` | 13273 | 11 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edDragPaint` | 13284 | 23 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `_edBlockDragMove` | 13307 | 24 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_edBlockDragEnd` | 13331 | 31 | editor / pop-out | ● |  |  |  |  | ● | 0 |
| `_edColToggle` | 13362 | 12 | editor / pop-out |  | ● |  |  |  | ● | 1 |
| `_edColAll` | 13374 | 12 | editor / pop-out |  | ● |  |  |  | ● | 0 |
| `_edColPreview` | 13386 | 7 | editor / pop-out | ● | ● |  |  |  | ● | 0 |
| `_edColSyncPrevBtn` | 13397 | 4 | editor / pop-out | ● |  |  |  |  | ● | 2 |
| `_edColToolbarHTML` | 13401 | 5 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `toggleEdColPop` | 13409 | 7 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `_rangeAtPoint` | 13419 | 6 | other / helpers |  |  |  |  |  |  | 0 |
| `_edVisKids` | 13454 | 5 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edNeedsLeadIn` | 13462 | 7 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edIsBlankLine` | 13471 | 5 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `_edBlankLine` | 13476 | 1 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `_edPutCaret` | 13477 | 6 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edRevealTail` | 13487 | 8 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edHeadChromeEnd` | 13498 | 9 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edPrefixText` | 13511 | 8 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `_edFixHeadCaret` | 13522 | 10 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `initRichPaste` | 13562 | 217 | other / helpers |  |  |  |  |  | ● | 1 |
| `markCards` | 13565 | 7 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `_flowTo` | 13652 | 8 | other / helpers |  |  |  |  |  | ● | 3 |
| `_endTouchDrag` | 13680 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_promptOpenLink` | 13789 | 10 | theme / appearance |  |  |  |  |  | ● | 3 |
| `mk` | 13794 | 1 | other / helpers |  |  |  |  |  | ● | 18 |
| `autoFit` | 13890 | 18 | other / helpers | ● |  |  |  |  | ● | 2 |
| `dStart` | 13913 | 9 | other / helpers | ● |  |  |  |  | ● | 0 |
| `dEnd` | 13923 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `artDStart` | 13931 | 10 | other / helpers | ● |  |  |  |  | ● | 0 |
| `artDEnd` | 13942 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `dOver` | 13952 | 31 | other / helpers | ● |  |  |  |  | ● | 0 |
| `dLeave` | 13984 | 3 | other / helpers |  |  |  |  |  | ● | 0 |
| `dDrop` | 13988 | 30 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `clearDI` | 14019 | 4 | other / helpers |  |  |  |  |  | ● | 7 |
| `_moveWouldCycle` | 14036 | 9 | other / helpers | ● |  |  |  |  | ● | 2 |
| `doMoveFolder` | 14046 | 28 | organisation | ● | ● |  | ● |  | ● | 1 |
| `moveFolderToTop` | 14078 | 22 | organisation | ● | ● |  |  |  | ● | 0 |
| `offerRenumber` | 14102 | 31 | other / helpers |  |  |  |  |  | ● | 1 |
| `doRenumber` | 14134 | 20 | other / helpers |  | ● |  |  |  | ● | 0 |
| `toggleFolderStructured` | 14165 | 15 | organisation | ● | ● |  |  |  | ● | 0 |
| `openFieldBuilder` | 14180 | 6 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `_fieldBuilderHTML` | 14186 | 12 | calendar / journal / contacts / database |  |  |  |  |  | ● | 4 |
| `_fieldRowHTML` | 14198 | 10 | other / helpers |  |  |  |  |  | ● | 1 |
| `addFieldRow` | 14208 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `removeFieldRow` | 14216 | 8 | reminders / review | ● | ● |  |  |  | ● | 0 |
| `updField` | 14224 | 9 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_dbfFields` | 14308 | 1 | calendar / journal / contacts / database |  |  |  |  |  | ● | 7 |
| `_dbfFieldById` | 14309 | 1 | calendar / journal / contacts / database |  |  |  |  |  | ● | 6 |
| `_dbfCandidates` | 14311 | 5 | calendar / journal / contacts / database |  |  |  |  |  | ● | 4 |
| `_dbfReportUsable` | 14319 | 9 | calendar / journal / contacts / database |  |  |  |  |  | ● | 2 |
| `_dbfNum` | 14328 | 5 | calendar / journal / contacts / database |  |  |  |  |  | ● | 2 |
| `_dbfFmt` | 14333 | 5 | calendar / journal / contacts / database |  |  |  |  |  | ● | 3 |
| `_dbfVal` | 14339 | 6 | calendar / journal / contacts / database |  |  |  |  |  | ● | 3 |
| `_dbReportHTML` | 14350 | 15 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `wrap` | 14356 | 1 | other / helpers |  |  |  |  |  | ● | 6 |
| `_dbrTable` | 14365 | 23 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_dbrBreakdown` | 14388 | 15 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_dbrTotals` | 14403 | 13 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_dbrStatus` | 14416 | 25 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_dbrTimeline` | 14441 | 22 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_dbbShow` | 14474 | 5 | calendar / journal / contacts / database |  |  |  |  |  | ● | 3 |
| `openDbFolderBuilder` | 14479 | 6 | organisation | ● |  |  |  |  | ● | 0 |
| `newDbFolder` | 14485 | 14 | organisation | ● | ● |  |  |  | ● | 0 |
| `dbBuilderCancel` | 14502 | 13 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `dbBuilderDone` | 14515 | 11 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `_dbBuilderHTML` | 14526 | 60 | calendar / journal / contacts / database |  |  |  |  |  | ● | 3 |
| `_dbbFieldsHTML` | 14586 | 14 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_dbbFolder` | 14600 | 1 | organisation | ● |  |  |  |  | ● | 8 |
| `_dbbRefresh` | 14602 | 9 | calendar / journal / contacts / database |  |  |  |  |  | ● | 6 |
| `dbbSet` | 14611 | 7 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `dbbAddField` | 14618 | 6 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `dbbRemoveField` | 14624 | 9 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `dbbMoveField` | 14633 | 7 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `dbbUpdField` | 14640 | 11 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `dbbSetReport` | 14651 | 16 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `dbbApplyPreset` | 14670 | 26 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `showDbSecCtx` | 14701 | 20 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `newPlainDbFolder` | 14723 | 13 | organisation | ● | ● |  |  |  | ● | 0 |
| `autoNumberDbFolders` | 14738 | 11 | organisation | ● | ● |  |  |  | ● | 0 |
| `_structuredFolderOf` | 14750 | 3 | organisation | ● |  |  |  |  | ● | 1 |
| `fieldInputHTML` | 14753 | 24 | other / helpers |  |  |  |  |  | ● | 1 |
| `saveFieldValue` | 14777 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_fieldsPanelHTML` | 14785 | 12 | other / helpers |  |  |  |  |  | ● | 3 |
| `_fieldChipsHTML` | 14797 | 12 | other / helpers |  |  |  |  |  | ● | 1 |
| `_sha256Hex` | 14819 | 5 | other / helpers |  |  |  |  |  | ● | 2 |
| `setFolderPin` | 14824 | 15 | organisation | ● | ● |  |  |  | ● | 0 |
| `removeFolderPin` | 14839 | 9 | organisation | ● | ● |  | ● |  | ● | 0 |
| `_pinLockHTML` | 14848 | 10 | tags / types / tabs | ● |  |  |  |  | ● | 1 |
| `tryUnlockFolder` | 14858 | 15 | organisation | ● |  |  |  |  | ● | 0 |
| `_stripHistoryImages` | 14906 | 15 | other / helpers |  |  |  |  |  | ● | 2 |
| `_captureNoteHistory` | 14921 | 13 | other / helpers |  |  |  |  |  | ● | 8 |
| `_pruneNoteHistory` | 14934 | 15 | other / helpers |  |  |  |  |  | ● | 1 |
| `totalBytes` | 14939 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `_relTime` | 14949 | 13 | other / helpers |  |  |  |  |  | ● | 4 |
| `_nhReasonLabel` | 14962 | 3 | other / helpers |  |  |  |  |  | ● | 1 |
| `openNoteHistory` | 14965 | 14 | other / helpers |  |  |  |  |  | ● | 0 |
| `_cl` | 14976 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeNoteHistory` | 14979 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `previewNoteHistory` | 14980 | 1 | reminders / review |  |  |  |  |  | ● | 0 |
| `_nhBack` | 14981 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_nhSetMode` | 14982 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_diffTextify` | 14990 | 11 | other / helpers |  |  |  |  |  | ● | 1 |
| `_diffTokenize` | 15001 | 1 | other / helpers |  |  |  |  |  | ● | 2 |
| `_tokDiff` | 15002 | 21 | other / helpers |  |  |  |  |  | ● | 1 |
| `_renderDiffHTML` | 15023 | 8 | render |  |  |  |  |  | ● | 1 |
| `renderNoteHistoryBody` | 15031 | 39 | render | ● |  |  |  |  | ● | 4 |
| `restoreNoteHistory` | 15070 | 17 | destructive | ● | ● |  |  |  | ● | 0 |
| `_versionSiblings` | 15096 | 5 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_versionStripHTML` | 15101 | 16 | other / helpers |  |  |  |  |  | ● | 1 |
| `startVersioning` | 15117 | 11 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `addNewVersion` | 15128 | 24 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `showVersionCtx` | 15152 | 12 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `renameVersion` | 15164 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `setVersionIcon` | 15172 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `unlinkVersion` | 15180 | 7 | theme / appearance | ● | ● |  | ● |  | ● | 0 |
| `ensureQuickPhrases` | 15194 | 13 | other / helpers | ● |  |  |  |  | ● | 7 |
| `_qpTextToHTML` | 15207 | 3 | other / helpers |  |  |  |  |  | ● | 1 |
| `openQuickPhrasesMenu` | 15210 | 18 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `insertQuickPhrase` | 15228 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `openQuickPhrasesManager` | 15235 | 3 | other / helpers |  |  |  |  |  | ● | 0 |
| `_qpManagerHTML` | 15238 | 21 | other / helpers |  |  |  |  |  | ● | 4 |
| `addQuickPhrase` | 15259 | 11 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `updQuickPhrase` | 15270 | 5 | other / helpers |  | ● |  |  |  | ● | 0 |
| `deleteQuickPhrase` | 15275 | 6 | destructive | ● | ● |  |  |  | ● | 0 |
| `moveQuickPhrase` | 15281 | 9 | other / helpers |  | ● |  |  |  | ● | 0 |
| `_ktDefaultKhutbah` | 15308 | 37 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ktNormalize` | 15345 | 16 | other / helpers |  |  |  |  |  | ● | 2 |
| `ensureTemplates` | 15361 | 7 | other / helpers | ● |  |  |  |  | ● | 8 |
| `_ktGet` | 15368 | 1 | other / helpers |  |  |  |  |  | ● | 20 |
| `_ktFoldHTML` | 15371 | 9 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ktBarHTML` | 15383 | 9 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ktAyahHTML` | 15392 | 16 | other / helpers |  |  |  |  |  | ● | 2 |
| `ktBuildHTML` | 15408 | 36 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ktBtnHTML` | 15446 | 3 | other / helpers |  |  |  |  |  | ● | 2 |
| `openTemplatesMenu` | 15449 | 14 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `insertTemplate` | 15463 | 11 | other / helpers |  |  |  |  |  | ● | 0 |
| `_ktDirty` | 15476 | 4 | other / helpers |  |  |  |  |  | ● | 4 |
| `_ktToggleFold` | 15480 | 8 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ktFoldAll` | 15488 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ktRenumber` | 15495 | 9 | other / helpers |  |  |  |  |  | ● | 3 |
| `_ktTplFor` | 15506 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ktAddBlock` | 15513 | 12 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_ktDelBlock` | 15525 | 10 | destructive |  |  |  |  |  | ● | 1 |
| `_ktBlockText` | 15537 | 14 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ktCopyBlock` | 15551 | 38 | other / helpers |  |  |  |  |  | ● | 1 |
| `done` | 15563 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `fallback` | 15564 | 16 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ktRepair` | 15591 | 7 | other / helpers |  |  |  |  |  | ● | 3 |
| `_ktShow` | 15623 | 5 | other / helpers |  |  |  |  |  | ● | 7 |
| `openTemplatesManager` | 15628 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_ktMgrHTML` | 15629 | 25 | other / helpers |  |  |  |  |  | ● | 6 |
| `ktAddTemplate` | 15654 | 10 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktRestoreKhutbah` | 15664 | 9 | destructive | ● | ● |  |  |  | ● | 0 |
| `ktDuplicateTemplate` | 15673 | 10 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `ktDeleteTemplate` | 15683 | 6 | destructive | ● | ● |  |  |  | ● | 0 |
| `ktMoveTemplate` | 15689 | 7 | other / helpers |  | ● |  |  |  | ● | 0 |
| `openTemplateEditor` | 15698 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ktEdHTML` | 15699 | 94 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ktRedraw` | 15793 | 1 | other / helpers |  |  |  |  |  | ● | 12 |
| `ktSet` | 15794 | 2 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktSetAyah` | 15796 | 2 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktAddField` | 15798 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktSetField` | 15799 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktDelField` | 15800 | 1 | destructive |  | ● |  |  |  | ● | 0 |
| `ktMoveField` | 15801 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktAddLang` | 15802 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktSetLang` | 15803 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktDelLang` | 15804 | 1 | destructive |  | ● |  |  |  | ● | 0 |
| `ktMoveLang` | 15805 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktAddSec` | 15806 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktSetSec` | 15807 | 10 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktDelSec` | 15817 | 1 | destructive |  | ● |  |  |  | ● | 0 |
| `ktMoveSec` | 15818 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `_ktMoveIn` | 15819 | 5 | other / helpers |  |  |  |  |  | ● | 3 |
| `_injectHeadingStatusBadges` | 15842 | 28 | other / helpers | ● |  |  |  |  | ● | 1 |
| `showHeadingStatusMenu` | 15870 | 17 | menus / dialogs | ● |  |  |  |  |  | 0 |
| `setHeadingStatus` | 15887 | 8 | other / helpers | ● | ● |  |  |  | ● | 1 |
| `clearHeadingStatus` | 15895 | 7 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `promptCustomHeadingStatus` | 15902 | 11 | other / helpers | ● |  |  |  |  | ● | 0 |
| `logContactAction` | 15927 | 19 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `saveContactAction` | 15946 | 17 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `_renderActionLog` | 15963 | 22 | render |  |  |  |  |  | ● | 1 |
| `toggleActionDone` | 15985 | 13 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `deleteContactAction` | 15998 | 8 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `toggleP2HCardView` | 16006 | 4 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `toggleP2HTreeMode` | 16010 | 4 | organisation |  |  |  |  |  | ● | 0 |
| `togP2HTreeNode` | 16014 | 5 | organisation |  |  |  |  |  | ● | 0 |
| `p2hTreeExpandAll` | 16019 | 8 | organisation |  |  |  |  |  | ● | 0 |
| `p2hTreeCollapseAll` | 16027 | 4 | organisation |  |  |  |  |  | ● | 0 |
| `_folderTreeNodeHTML` | 16031 | 8 | organisation |  |  |  |  |  | ● | 2 |
| `_folderDescendantsHTML` | 16039 | 19 | organisation |  |  |  |  |  | ● | 1 |
| `_secNavHTML` | 16061 | 9 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_firstFolderOfSection` | 16072 | 3 | organisation | ● |  |  |  |  | ● | 3 |
| `gotoSection` | 16075 | 6 | organisation | ● |  |  |  |  | ● | 0 |
| `gotoAdjacentSection` | 16081 | 13 | organisation | ● |  |  |  |  | ● | 0 |
| `_folderFullTreeHTML` | 16094 | 16 | organisation | ● |  |  |  |  | ● | 1 |
| `_folderPathRowHTML` | 16110 | 21 | organisation | ● |  |  |  |  | ● | 1 |
| `_sfQtFolder` | 16171 | 10 | organisation | ● |  |  |  |  | ● | 2 |
| `_sfPathRowHTML` | 16182 | 22 | find / smart views |  |  |  |  |  | ● | 2 |
| `_sfGrpKeys` | 16205 | 6 | find / smart views |  |  |  |  |  | ● | 2 |
| `sfGrpExpandAll` | 16211 | 5 | find / smart views |  |  |  |  |  | ● | 0 |
| `sfGrpCollapseAll` | 16216 | 5 | find / smart views |  |  |  |  |  | ● | 0 |
| `_sfQtBarHTML` | 16243 | 16 | find / smart views |  |  |  |  |  | ● | 4 |
| `addStarterMyDatabaseFolders` | 16264 | 28 | organisation | ● | ● |  |  |  | ● | 0 |
| `mkFolder` | 16292 | 27 | organisation | ● | ● |  |  |  | ● | 2 |
| `rnFolder` | 16319 | 1 | organisation | ● | ● |  |  |  | ● | 1 |
| `rmFolder` | 16320 | 1 | organisation |  |  |  |  |  |  | 0 |
| `mkArt` | 16321 | 1 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `rmArt` | 16322 | 1 | other / helpers |  |  |  |  |  |  | 0 |
| `_buildFolderCtxMain` | 16325 | 35 | organisation | ● |  |  |  |  | ● | 2 |
| `showCtx` | 16360 | 12 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `_folderCtxBack` | 16372 | 3 | organisation |  |  |  |  |  | ● | 0 |
| `_folderCtxSub` | 16375 | 7 | organisation |  |  |  |  |  | ● | 0 |
| `hideCtx` | 16386 | 1 | menus / dialogs |  |  |  |  |  | ● | 54 |
| `moveToMyJournal` | 16387 | 7 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `offerRenumberManual` | 16394 | 4 | other / helpers | ● |  |  |  |  | ● | 0 |
| `stripNumPrefix` | 16402 | 6 | other / helpers |  |  |  |  |  | ● | 4 |
| `getHierNum` | 16414 | 13 | other / helpers | ● |  |  |  |  | ● | 3 |
| `autoNumberAll` | 16429 | 25 | other / helpers | ● | ● |  |  |  | ● | 2 |
| `offerAutoNumber` | 16456 | 23 | other / helpers | ● |  |  |  |  | ● | 2 |
| `showModal` | 16488 | 16 | menus / dialogs |  |  |  |  |  | ● | 41 |
| `closeModal` | 16508 | 3 | menus / dialogs |  |  |  |  |  | ● | 17 |
| `_mbSaveGeom` | 16527 | 10 | other / helpers |  | ● |  |  |  | ● | 2 |
| `_mbLoadGeom` | 16537 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `showResizableModal` | 16546 | 39 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `_mbDragStart` | 16587 | 16 | other / helpers |  |  |  |  |  | ● | 0 |
| `_mbDragMove` | 16603 | 9 | other / helpers |  |  |  |  |  | ● | 0 |
| `_mbDragStop` | 16612 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `_mbResizeStart` | 16620 | 15 | other / helpers |  |  |  |  |  | ● | 0 |
| `_mbResizeMove` | 16635 | 16 | other / helpers |  |  |  |  |  | ● | 0 |
| `_mbResizeStop` | 16651 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `openModal` | 16658 | 35 | menus / dialogs | ● |  |  |  |  | ● | 2 |
| `confirmDel` | 16693 | 8 | other / helpers | ● |  |  |  |  | ● | 0 |
| `_pkArtsOf` | 16726 | 1 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_pkFileRowHTML` | 16727 | 14 | other / helpers |  |  |  |  |  | ● | 1 |
| `_pkRowHTML` | 16741 | 32 | other / helpers |  |  |  |  |  | ● | 1 |
| `_pkTreeHTML` | 16773 | 6 | organisation |  |  |  |  |  | ● | 4 |
| `openPicker` | 16779 | 19 | menus / dialogs | ● |  |  |  |  | ● | 1 |
| `_pkSaveScope` | 16809 | 19 | other / helpers |  | ● |  |  |  | ● | 1 |
| `_pkLoadScope` | 16828 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `_pkResumeBrowse` | 16840 | 36 | other / helpers | ● |  |  |  |  | ● | 1 |
| `openFolderPopupFromToolbar` | 16876 | 21 | organisation | ● |  |  |  |  | ● | 0 |
| `openSectionPopout` | 16901 | 8 | organisation | ● |  |  |  |  | ● | 1 |
| `openFolderPopout` | 16910 | 8 | organisation | ● |  |  |  |  | ● | 0 |
| `_pkCurrentBrowseRoots` | 16918 | 5 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_pkCurrentSectionId` | 16926 | 8 | organisation |  |  |  |  |  | ● | 3 |
| `_pkFontClampSize` | 16944 | 4 | other / helpers |  |  |  |  |  | ● | 4 |
| `_pkFontLoad` | 16948 | 10 | other / helpers |  |  |  |  |  | ● | 3 |
| `_pkFontSave` | 16958 | 1 | other / helpers |  | ● |  |  |  | ● | 2 |
| `_pkApplyFont` | 16961 | 12 | other / helpers |  |  |  |  |  | ● | 5 |
| `_pkFontSet` | 16976 | 15 | other / helpers |  |  |  |  |  | ● | 4 |
| `pkFontSize` | 16991 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkFontStep` | 16992 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkFontBold` | 16993 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkFontColor` | 16994 | 1 | theme / appearance |  |  |  |  |  | ● | 1 |
| `pkFontPalette` | 16997 | 4 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `pkFontReset` | 17001 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkFontMenu` | 17012 | 49 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_pkSecNavHTML` | 17074 | 17 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_pkRenderScopeBody` | 17092 | 7 | other / helpers |  |  |  |  |  | ● | 3 |
| `_pkAllSectionsHTML` | 17102 | 18 | organisation | ● |  |  |  |  | ● | 1 |
| `_pkAllSmartHTML` | 17127 | 7 | find / smart views |  |  |  |  |  | ● | 1 |
| `pkToggleAllSec` | 17134 | 5 | other / helpers |  |  |  |  |  | ● | 0 |
| `_pkSetFolderControlsVisible` | 17141 | 4 | organisation |  |  |  |  |  | ● | 4 |
| `_pkSwitchToSection` | 17150 | 13 | organisation | ● |  |  |  |  | ● | 1 |
| `_pkSwitchToScopeKind` | 17165 | 14 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_pkRefreshSecNav` | 17179 | 4 | other / helpers |  |  |  |  |  | ● | 3 |
| `pkGotoSection` | 17183 | 10 | organisation |  |  |  |  |  | ● | 1 |
| `_pkNavStops` | 17195 | 4 | other / helpers | ● |  |  |  |  | ● | 1 |
| `pkGotoAdjacentSection` | 17199 | 9 | organisation |  |  |  |  |  | ● | 0 |
| `_pkSmartListHTML` | 17210 | 11 | find / smart views |  |  |  |  |  | ● | 2 |
| `_pkTagsListHTML` | 17221 | 9 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_pkKindsListHTML` | 17230 | 14 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `pkNavScope` | 17246 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `_pkOpenBrowse` | 17252 | 20 | other / helpers |  |  |  |  |  | ● | 3 |
| `pkNavigateFolder` | 17272 | 4 | organisation |  |  |  |  |  |  | 0 |
| `_pkRow` | 17276 | 1 | other / helpers |  |  |  |  |  | ● | 9 |
| `_pkRebuildList` | 17281 | 18 | other / helpers | ● |  |  |  |  | ● | 9 |
| `_pkApplyVis` | 17299 | 29 | other / helpers |  |  |  |  |  | ● | 5 |
| `togglePickExp` | 17328 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `_pkFilter` | 17336 | 22 | find / smart views |  |  |  |  |  | ● | 4 |
| `_pkGlobalSearchHTML` | 17365 | 60 | find / smart views | ● |  |  |  |  | ● | 1 |
| `grpHd` | 17378 | 1 | other / helpers |  |  |  |  |  | ● | 5 |
| `_pkPathWithSection` | 17430 | 6 | organisation | ● |  |  |  |  | ● | 2 |
| `_pkSwitchToFolder` | 17439 | 14 | organisation | ● |  |  |  |  | ● | 0 |
| `togglePick` | 17453 | 14 | other / helpers | ● |  |  |  |  |  | 0 |
| `_pkUpdateTargetLabel` | 17469 | 12 | other / helpers | ● |  |  |  |  | ● | 5 |
| `pkRowMenu` | 17487 | 9 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `pkNoteRowMenu` | 17496 | 8 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `pkSetTarget` | 17504 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkClearTarget` | 17511 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `pkRename` | 17518 | 7 | other / helpers | ● |  |  |  |  | ● | 0 |
| `pkRenameSave` | 17525 | 10 | other / helpers | ● |  |  |  |  | ● | 0 |
| `pkRenameCancel` | 17535 | 7 | other / helpers | ● |  |  |  |  | ● | 0 |
| `pkDelete` | 17542 | 14 | destructive | ● |  |  |  |  | ● | 0 |
| `pkDStart` | 17556 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkDEnd` | 17562 | 5 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkDOver` | 17567 | 19 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkDLeave` | 17586 | 3 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkDDrop` | 17589 | 17 | other / helpers |  |  |  |  |  | ● | 0 |
| `_pkClearDI` | 17606 | 5 | other / helpers |  |  |  |  |  | ● | 7 |
| `pkMoveFolder` | 17615 | 24 | organisation | ● | ● |  | ● |  | ● | 1 |
| `pkNoteOpen` | 17643 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkNoteDStart` | 17647 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkNoteDEnd` | 17653 | 5 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkMoveNote` | 17660 | 16 | other / helpers | ● | ● |  |  |  | ● | 1 |
| `pkNoteRename` | 17676 | 7 | other / helpers | ● |  |  |  |  | ● | 0 |
| `pkNoteRenameSave` | 17683 | 14 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `pkNoteRenameCancel` | 17697 | 7 | other / helpers | ● |  |  |  |  | ● | 0 |
| `pkNoteDelete` | 17704 | 6 | destructive | ● |  |  |  |  | ● | 0 |
| `mobBack` | 17712 | 1 | other / helpers |  |  |  |  |  |  | 0 |
| `tapCtx` | 17713 | 6 | menus / dialogs |  |  |  |  |  |  | 0 |
| `getAllTags` | 17723 | 8 | tags / types / tabs | ● |  |  |  |  | ● | 5 |
| `selTag` | 17732 | 7 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `toggleTagPanel` | 17740 | 4 | tags / types / tabs |  |  |  |  |  |  | 0 |
| `backToMyWallCat` | 17749 | 5 | other / helpers |  |  |  |  |  | ● | 0 |
| `selKind` | 17754 | 7 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `toggleNtiSection` | 17761 | 1 | organisation |  |  |  |  |  | ● | 0 |
| `togNtiCatSB` | 17762 | 1 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `renderNTISection` | 17763 | 51 | render | ● |  |  |  |  | ● | 1 |
| `renderTagPanel` | 17815 | 17 | render |  |  |  |  |  | ● | 1 |
| `renderTagEditor` | 17833 | 15 | render |  |  |  |  |  | ● | 4 |
| `_allTags` | 17852 | 5 | tags / types / tabs | ● |  |  |  |  | ● | 1 |
| `showTagSuggest` | 17857 | 10 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_tagSuggestPlace` | 17872 | 9 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `hideTagSuggest` | 17881 | 3 | tags / types / tabs |  |  |  |  |  | ● | 3 |
| `_pickTagSuggestion` | 17884 | 6 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `addTag` | 17891 | 11 | tags / types / tabs |  |  |  |  |  | ● | 3 |
| `rmTag` | 17903 | 5 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `tagKey` | 17909 | 7 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `tagInputChanged` | 17922 | 12 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `hexDarken` | 17952 | 5 | other / helpers |  |  |  |  |  | ● | 7 |
| `hexLighten` | 17957 | 5 | other / helpers |  |  |  |  |  | ● | 4 |
| `_sbLum` | 17973 | 14 | other / helpers |  |  |  |  |  | ● | 6 |
| `f` | 17984 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `applySidebarInk` | 17987 | 22 | theme / appearance |  |  |  |  |  | ● | 1 |
| `set` | 17993 | 1 | other / helpers |  |  |  |  |  | ● | 30 |
| `_paneSafePaper` | 18030 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `_paneInk` | 18037 | 6 | theme / appearance |  |  |  |  |  | ● | 4 |
| `_accentInk` | 18045 | 14 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `worst` | 18055 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `applyPaneInk` | 18059 | 40 | theme / appearance |  |  |  |  |  | ● | 1 |
| `set` | 18062 | 1 | other / helpers |  |  |  |  |  | ● | 30 |
| `applyTheme` | 18099 | 29 | theme / appearance |  |  |  |  |  | ● | 6 |
| `applyPreset` | 18129 | 7 | theme / appearance | ● |  |  |  |  | ● | 0 |
| `setCustomColor` | 18137 | 18 | theme / appearance | ● |  |  |  |  | ● | 2 |
| `setCustomColorHex` | 18156 | 6 | theme / appearance |  |  |  |  |  | ● | 0 |
| `resetTheme` | 18163 | 6 | theme / appearance | ● |  |  |  |  | ● | 0 |
| `openTheme` | 18170 | 5 | theme / appearance |  |  |  |  |  | ● | 0 |
| `closeTheme` | 18176 | 3 | theme / appearance |  |  |  |  |  | ● | 0 |
| `renderThemeModal` | 18180 | 107 | render | ● |  |  |  |  | ● | 8 |
| `ctxColorSwatches` | 18290 | 8 | theme / appearance | ● |  |  |  |  | ● | 1 |
| `setFolderColor` | 18299 | 9 | organisation | ● | ● |  | ● |  | ● | 1 |
| `setFolderBold` | 18308 | 7 | organisation | ● | ● |  | ● |  | ● | 0 |
| `renderSection` | 18320 | 23 | render | ● |  |  |  |  | ● | 1 |
| `toggleSection` | 18345 | 12 | organisation | ● |  |  |  |  | ● | 0 |
| `addFolderInSec` | 18359 | 4 | organisation |  |  |  |  |  | ● | 0 |
| `addRootFolder` | 18365 | 4 | organisation |  |  |  |  |  | ● | 0 |
| `ctxSecColorSwatches` | 18372 | 8 | theme / appearance | ● |  |  |  |  | ● | 1 |
| `setSectionColor` | 18380 | 7 | organisation | ● | ● |  | ● |  | ● | 1 |
| `setSectionBold` | 18387 | 7 | organisation | ● | ● |  | ● |  | ● | 0 |
| `_uiStamp` | 18402 | 1 | cloud sync / auth |  |  |  |  |  | ● | 5 |
| `ctxSfColorSwatches` | 18403 | 10 | find / smart views |  |  |  |  |  | ● | 1 |
| `setSmartViewColor` | 18413 | 9 | find / smart views |  | ● |  |  |  | ● | 0 |
| `showSmartViewCtx` | 18422 | 15 | find / smart views |  |  |  |  |  | ● | 1 |
| `toggleSmartViews` | 18437 | 6 | find / smart views |  |  |  |  |  | ● | 0 |
| `startRenSmartViews` | 18443 | 9 | find / smart views |  |  |  |  |  | ● | 0 |
| `finRenSmartViews` | 18452 | 7 | find / smart views |  | ● |  |  |  | ● | 0 |
| `_buildSecCtxMain` | 18460 | 15 | menus / dialogs | ● |  |  |  |  | ● | 2 |
| `showSecCtx` | 18475 | 11 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_secCtxBack` | 18486 | 3 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_secCtxSub` | 18489 | 7 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `startRenSec` | 18498 | 9 | other / helpers | ● |  |  |  |  | ● | 0 |
| `finRenSec` | 18508 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `mkSection` | 18518 | 8 | organisation | ● | ● |  |  |  | ● | 0 |
| `delSection` | 18528 | 8 | organisation | ● | ● |  |  |  | ● | 0 |
| `moveFolderToSec` | 18538 | 6 | organisation | ● | ● |  |  |  | ● | 0 |
| `rootSectionMoves` | 18546 | 7 | organisation | ● |  |  |  |  | ● | 1 |
| `_isSysFolder` | 18561 | 9 | organisation | ● |  |  |  |  | ● | 4 |
| `convertFolderToSection` | 18570 | 22 | organisation | ● |  |  |  |  | ● | 0 |
| `_moveNotesThenConvert` | 18592 | 17 | other / helpers | ● |  |  |  |  | ● | 0 |
| `_doFolderToSection` | 18609 | 18 | organisation | ● | ● |  |  |  | ● | 1 |
| `sectionToFolderRows` | 18627 | 6 | organisation | ● |  |  |  |  | ● | 1 |
| `confirmSectionToFolder` | 18633 | 10 | organisation | ● |  |  |  |  | ● | 0 |
| `_doSectionToFolder` | 18643 | 16 | organisation | ● | ● |  | ● |  | ● | 0 |
| `secDStart` | 18663 | 9 | other / helpers |  |  |  |  |  | ● | 0 |
| `secDEnd` | 18673 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `secDOver` | 18680 | 10 | other / helpers |  |  |  |  |  | ● | 0 |
| `secDLeave` | 18691 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `secDDrop` | 18698 | 17 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `snapshotState` | 18719 | 7 | persistence |  |  |  |  |  | ● | 2 |
| `undo` | 18727 | 9 | other / helpers | ● | ● |  | ● |  | ● | 1 |
| `redo` | 18737 | 9 | other / helpers | ● | ● |  | ● |  | ● | 1 |
| `updateUndoRedoBtns` | 18747 | 5 | other / helpers |  |  |  |  |  | ● | 3 |
| `_addTombstones` | 18761 | 10 | cloud sync / auth |  |  |  |  |  | ● | 6 |
| `_tombstoneTrashEntry` | 18774 | 10 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `trashFolder` | 18784 | 28 | organisation | ● | ● |  |  |  | ● | 3 |
| `trashArt` | 18813 | 11 | destructive | ● | ● |  |  |  | ● | 2 |
| `openTrash` | 18825 | 5 | destructive |  |  |  |  |  | ● | 0 |
| `closeTrash` | 18831 | 3 | destructive |  |  |  |  |  | ● | 0 |
| `renderTrashModal` | 18835 | 31 | render | ● |  |  |  |  | ● | 5 |
| `restoreItem` | 18867 | 52 | destructive | ● | ● |  |  |  | ● | 0 |
| `permDeleteItem` | 18920 | 6 | destructive | ● | ● |  |  |  | ● | 0 |
| `emptyTrash` | 18927 | 8 | destructive | ● | ● |  | ● |  | ● | 0 |
| `_popCleanupOrphans` | 18938 | 15 | menus / dialogs | ● |  |  | ● |  | ● | 1 |
| `updateTrashBtn` | 18954 | 6 | destructive | ● |  |  |  |  | ● | 4 |
| `_ctxIsCard` | 18980 | 1 | menus / dialogs |  |  |  |  |  | ● | 3 |
| `showArtCtx` | 18982 | 20 | menus / dialogs | ● |  |  |  |  | ● | 1 |
| `_ctxPlaceCard` | 19005 | 8 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `_ctxRepaint` | 19016 | 1 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `_artCtxGroups` | 19028 | 37 | organisation |  |  |  |  |  | ● | 1 |
| `sub` | 19031 | 1 | other / helpers |  |  |  |  |  | ● | 5 |
| `_buildArtCtxMain` | 19065 | 6 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `_ctxBack` | 19071 | 6 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `_ctxSub` | 19077 | 49 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `detachArt` | 19128 | 16 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `openAttachArt` | 19146 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `showArtFolderPicker` | 19148 | 35 | organisation | ● |  |  |  |  | ● | 3 |
| `rows` | 19153 | 12 | other / helpers |  |  |  |  |  | ● | 3 |
| `createFolderFromPicker` | 19186 | 34 | organisation | ● | ● |  |  |  | ● | 0 |
| `fpFilter` | 19223 | 32 | find / smart views | ● |  |  |  |  | ● | 0 |
| `rows2` | 19229 | 11 | other / helpers |  |  |  |  |  | ● | 1 |
| `toggleArtFolder` | 19257 | 17 | organisation | ● | ● |  |  |  | ● | 0 |
| `applyFontSizes` | 19281 | 10 | other / helpers |  |  |  |  |  | ● | 3 |
| `r` | 19285 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `applyLineSpacing` | 19294 | 6 | other / helpers |  |  |  |  |  | ● | 2 |
| `setLineSpacing` | 19300 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `setFontSize` | 19310 | 9 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `resetFontSizes` | 19321 | 7 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `enableAutoSave` | 19348 | 37 | other / helpers |  |  |  |  |  | ● | 0 |
| `_writeToFile` | 19387 | 18 | other / helpers |  |  |  |  | ● | ● | 3 |
| `scheduleAutoSave` | 19410 | 7 | other / helpers |  |  |  |  |  | ● | 2 |
| `updateSaveUI` | 19419 | 30 | other / helpers |  |  |  |  |  | ● | 8 |
| `_bkCfg` | 19495 | 7 | other / helpers |  |  |  |  |  | ● | 8 |
| `_bkSaveCfg` | 19502 | 3 | other / helpers |  | ● |  |  |  | ● | 5 |
| `_bkIdb` | 19507 | 8 | other / helpers |  |  |  |  |  | ● | 3 |
| `_bkPutHandle` | 19515 | 8 | other / helpers |  |  |  |  |  | ● | 1 |
| `_bkGetHandle` | 19523 | 10 | other / helpers |  |  |  |  |  | ● | 2 |
| `_bkClearHandle` | 19533 | 9 | other / helpers |  |  |  |  |  | ● | 1 |
| `_bkStamp` | 19544 | 4 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `p` | 19545 | 1 | other / helpers |  |  |  |  |  | ● | 8 |
| `_bkFileName` | 19550 | 5 | other / helpers |  |  |  |  |  | ● | 2 |
| `p` | 19551 | 1 | other / helpers |  |  |  |  |  | ● | 8 |
| `_bkDue` | 19555 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `_bkAgeDays` | 19562 | 4 | other / helpers |  |  |  |  |  | ● | 2 |
| `_bkPrune` | 19572 | 23 | other / helpers |  |  |  |  |  | ● | 1 |
| `runBackupNow` | 19600 | 33 | export / import / backup |  | ● |  |  | ● | ● | 2 |
| `chooseBackupFolder` | 19636 | 11 | export / import / backup |  |  |  |  |  | ● | 1 |
| `turnOffBackups` | 19648 | 6 | export / import / backup |  |  |  |  |  | ● | 0 |
| `setBackupEvery` | 19655 | 3 | export / import / backup |  |  |  |  |  | ● | 0 |
| `downloadDatedBackup` | 19662 | 14 | export / import / backup |  | ● |  |  | ● | ● | 1 |
| `_bkMaybeAuto` | 19680 | 21 | other / helpers |  |  |  |  |  | ● | 1 |
| `_bkStatusHTML` | 19703 | 22 | other / helpers |  |  |  |  |  | ● | 3 |
| `sel` | 19709 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `_bkRenderStatus` | 19725 | 4 | other / helpers |  |  |  |  |  | ● | 5 |
| `openBackupModal` | 19729 | 31 | export / import / backup |  |  |  |  |  | ● | 0 |
| `getTimestampedName` | 19763 | 6 | cloud sync / auth |  |  |  |  |  | ● | 2 |
| `_sbDDFit` | 19777 | 20 | other / helpers |  |  |  |  |  | ● | 3 |
| `toggleSBMenu` | 19798 | 6 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `closeSBMenu` | 19804 | 3 | menus / dialogs |  |  |  |  |  | ● | 5 |
| `toggleSBTools` | 19808 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeSBTools` | 19814 | 3 | other / helpers |  |  |  |  |  | ● | 3 |
| `toggleSBHome` | 19820 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeSBHome` | 19826 | 3 | other / helpers |  |  |  |  |  | ● | 4 |
| `openLegacyApp` | 19833 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `artSnippet` | 19845 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `artCard` | 19853 | 31 | menus / dialogs |  |  |  |  |  | ● | 18 |
| `toggleListView` | 19886 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `adjustP3Layout` | 19904 | 15 | other / helpers |  |  |  |  |  | ● | 10 |
| `openP2` | 19921 | 5 | other / helpers |  |  |  |  |  | ● | 2 |
| `closeP2` | 19926 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `_dedupePrimaryFolders` | 19949 | 37 | organisation | ● | ● |  |  |  | ● | 2 |
| `noteCount` | 19958 | 1 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_openNewNoteWindow` | 20004 | 15 | other / helpers |  |  |  |  |  | ● | 6 |
| `quickCapture` | 20019 | 26 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `quickCaptureWithKind` | 20050 | 22 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `backFromP3` | 20076 | 5 | other / helpers |  |  |  |  |  | ● | 1 |
| `showPane` | 20086 | 16 | other / helpers |  |  |  |  |  | ● | 23 |
| `_getOrCreateFirebaseApp` | 20141 | 7 | cloud sync / auth |  |  | ● |  |  | ● | 3 |
| `initAuth` | 20149 | 51 | cloud sync / auth |  |  | ● |  |  | ● | 2 |
| `doLogin` | 20201 | 12 | other / helpers |  |  | ● |  |  | ● | 0 |
| `refreshApp` | 20215 | 10 | render |  |  |  |  |  | ● | 0 |
| `doSignOut` | 20226 | 15 | cloud sync / auth |  |  |  |  |  | ● | 0 |
| `getSyncConfig` | 20242 | 1 | other / helpers |  |  |  |  |  | ● | 9 |
| `_saveSyncConfig` | 20243 | 1 | persistence |  | ● |  |  |  | ● | 1 |
| `clearSyncConfig` | 20244 | 1 | other / helpers |  | ● |  |  |  | ● | 2 |
| `setSyncStatus` | 20246 | 15 | other / helpers |  |  |  |  |  | ● | 22 |
| `_loadScript` | 20262 | 8 | other / helpers |  |  |  |  |  | ● | 6 |
| `_syncErrorToast` | 20290 | 21 | cloud sync / auth |  |  |  |  |  | ● | 5 |
| `initSync` | 20312 | 91 | other / helpers |  |  | ● |  |  | ● | 3 |
| `syncNow` | 20405 | 36 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `_mergeById` | 20442 | 16 | cloud sync / auth |  |  |  |  |  | ● | 3 |
| `_mergeTabStamps` | 20459 | 11 | cloud sync / auth |  |  |  |  |  | ● | 2 |
| `norm` | 20460 | 1 | other / helpers |  |  |  |  |  | ● | 18 |
| `_mergeTabMaps` | 20477 | 18 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `norm` | 20478 | 1 | other / helpers |  |  |  |  |  | ● | 18 |
| `_mergeStrs` | 20495 | 1 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `_mergeMapById` | 20511 | 13 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `norm` | 20512 | 1 | other / helpers |  |  |  |  |  | ● | 18 |
| `_mergeStampMap` | 20525 | 6 | cloud sync / auth |  |  |  |  |  | ● | 2 |
| `norm` | 20526 | 1 | other / helpers |  |  |  |  |  | ● | 18 |
| `_mergeValMap` | 20534 | 9 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `norm` | 20535 | 1 | other / helpers |  |  |  |  |  | ● | 18 |
| `mergeDB` | 20543 | 72 | cloud sync / auth |  |  |  |  |  | ● | 4 |
| `_tadd` | 20592 | 1 | other / helpers |  |  |  |  |  | ● | 4 |
| `_alive` | 20602 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_b64enc` | 20616 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `_b64dec` | 20617 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `_syncSleep` | 20619 | 1 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `_syncSig` | 20625 | 5 | cloud sync / auth |  |  |  |  |  | ● | 2 |
| `_flushAllEditors` | 20640 | 9 | other / helpers |  |  |  |  |  | ● | 5 |
| `_edCleanHTML` | 20652 | 6 | editor / pop-out |  |  |  |  |  | ● | 5 |
| `_edApplyRemote` | 20669 | 38 | editor / pop-out | ● |  |  |  |  | ● | 1 |
| `put` | 20672 | 18 | other / helpers |  |  |  |  |  | ● | 4 |
| `_readCloudDB` | 20716 | 34 | cloud sync / auth |  |  | ● |  |  | ● | 2 |
| `_writeCloudDB` | 20750 | 9 | cloud sync / auth |  |  | ● |  |  | ● | 2 |
| `_doPush` | 20779 | 44 | other / helpers |  | ● |  |  |  | ● | 1 |
| `pushToCloud` | 20824 | 9 | cloud sync / auth |  |  |  |  |  | ● | 6 |
| `flushPendingPush` | 20838 | 5 | other / helpers |  |  |  |  |  | ● | 3 |
| `_preferStreaming` | 20860 | 3 | other / helpers |  |  |  |  |  | ● | 1 |
| `_noteTransportFailure` | 20867 | 5 | other / helpers |  |  |  |  |  | ● | 1 |
| `_reconcileNow` | 20892 | 27 | other / helpers |  |  |  |  |  | ● | 2 |
| `_startReconcile` | 20919 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `_scheduleListenerRestart` | 20928 | 11 | other / helpers |  |  | ● |  |  | ● | 1 |
| `_pullRemote` | 20940 | 83 | reminders / review | ● | ● |  | ● |  | ● | 2 |
| `generateNotebookId` | 21025 | 3 | other / helpers |  |  |  |  | ● | ● | 2 |
| `_syncAgo` | 21035 | 9 | cloud sync / auth |  |  |  |  |  | ● | 2 |
| `_syncDiagnosticsHTML` | 21044 | 21 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `openSyncModal` | 21065 | 61 | menus / dialogs |  |  | ● |  |  | ● | 0 |
| `closeSyncModal` | 21127 | 1 | menus / dialogs |  |  |  |  |  | ● | 3 |
| `parseFirebaseConfig` | 21129 | 17 | cloud sync / auth |  |  | ● |  |  | ● | 1 |
| `connectSync` | 21147 | 18 | other / helpers |  |  | ● |  |  | ● | 0 |
| `loginResetSync` | 21166 | 10 | other / helpers |  |  |  |  |  | ● | 0 |
| `disconnectSync` | 21177 | 10 | other / helpers |  |  |  |  |  | ● | 0 |
| `_uiTier` | 21253 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `_normalizePaneState` | 21262 | 17 | other / helpers |  |  |  |  |  | ● | 1 |
| `_onViewportResize` | 21280 | 47 | other / helpers |  |  |  |  |  | ● | 0 |
| `_sbFitHeader` | 21341 | 9 | other / helpers |  |  |  |  |  | ● | 3 |
| `sfOrdered` | 21388 | 8 | find / smart views |  |  |  |  |  | ● | 7 |
| `moveSfItem` | 21396 | 12 | find / smart views |  | ● |  |  |  | ● | 0 |
| `ensureNoteKinds` | 21431 | 6 | tags / types / tabs |  |  |  |  |  | ● | 7 |
| `noteKinds` | 21437 | 1 | tags / types / tabs |  |  |  |  |  | ● | 19 |
| `ensureNoteKindCats` | 21438 | 6 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `noteKindCats` | 21444 | 1 | tags / types / tabs |  |  |  |  |  | ● | 17 |
| `kindsInCat` | 21445 | 1 | tags / types / tabs |  |  |  |  |  | ● | 4 |
| `kindById` | 21446 | 1 | tags / types / tabs |  |  |  |  |  | ● | 9 |
| `artKinds` | 21447 | 4 | tags / types / tabs |  |  |  |  |  | ● | 19 |
| `artKind` | 21451 | 1 | tags / types / tabs |  |  |  |  |  |  | 0 |
| `untouchedDays` | 21452 | 4 | other / helpers |  |  |  |  |  | ● | 3 |
| `isNagNote` | 21457 | 2 | other / helpers |  |  |  |  |  | ● | 1 |
| `isMyWallNote` | 21460 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_flushEd` | 21469 | 13 | other / helpers | ● |  |  |  |  | ● | 8 |
| `setNoteKind` | 21482 | 6 | tags / types / tabs | ● | ● |  |  |  |  | 0 |
| `toggleNoteKind` | 21488 | 12 | tags / types / tabs | ● | ● |  | ● |  | ● | 0 |
| `finishNote` | 21500 | 7 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `unfinishNote` | 21507 | 6 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `addNoteKindTab` | 21513 | 13 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `order` | 21520 | 1 | other / helpers |  |  |  |  |  |  | 0 |
| `renameNoteKind` | 21526 | 10 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `kindBarHTML` | 21538 | 50 | tags / types / tabs |  |  |  |  |  | ● | 4 |
| `_attachCount` | 21591 | 3 | other / helpers |  |  |  |  |  | ● | 4 |
| `mwCatIsOpen` | 21597 | 4 | other / helpers | ● |  |  |  |  | ● | 2 |
| `mwToggleAllCats` | 21601 | 10 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `mwToggleViewMode` | 21611 | 6 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `renderMyWall` | 21617 | 92 | render | ● |  |  |  |  | ● | 1 |
| `_kindLatest` | 21651 | 1 | tags / types / tabs |  |  |  |  |  | ● | 4 |
| `_sortKinds` | 21652 | 4 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `isJournal` | 21713 | 9 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `getSmartGroups` | 21724 | 61 | organisation | ● |  |  |  |  | ● | 4 |
| `ts` | 21726 | 1 | other / helpers |  |  |  |  |  | ● | 12 |
| `sod` | 21727 | 1 | other / helpers |  |  |  |  |  | ● | 2 |
| `togSfGrp` | 21785 | 6 | find / smart views |  |  |  |  |  | ● | 0 |
| `togMwCat` | 21791 | 5 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallCatDStart` | 21803 | 10 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallCatDEnd` | 21813 | 5 | other / helpers |  |  |  |  |  | ● | 1 |
| `wallCatDOver` | 21818 | 9 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallCatDLeave` | 21827 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallCatDDrop` | 21831 | 30 | other / helpers |  | ● |  |  |  | ● | 0 |
| `wallGrpDStart` | 21861 | 9 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallGrpDEnd` | 21870 | 5 | other / helpers |  |  |  |  |  | ● | 3 |
| `wallGrpDOver` | 21875 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallGrpDLeave` | 21883 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallGrpDDrop` | 21887 | 18 | other / helpers |  | ● |  |  |  | ● | 0 |
| `moveWallKind` | 21905 | 10 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `showWallKindCtx` | 21915 | 23 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_groupUnion` | 21938 | 6 | organisation |  |  |  |  |  | ● | 1 |
| `getSmartArts` | 21945 | 32 | find / smart views | ● |  |  |  |  | ● | 6 |
| `renderSmartSection` | 21978 | 31 | render |  |  |  |  |  | ● | 1 |
| `toggleFav` | 22010 | 9 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `togglePin` | 22020 | 9 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `promptAddArtTag` | 22031 | 56 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `applyTag` | 22033 | 14 | tags / types / tabs |  | ● |  |  |  |  | 0 |
| `tagPickerRender` | 22047 | 29 | tags / types / tabs | ● |  |  |  |  | ● | 4 |
| `tagPickerRender` | 22087 | 28 | tags / types / tabs | ● |  |  |  |  | ● | 4 |
| `tagPickerApply` | 22115 | 16 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `removeArtTag` | 22131 | 9 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `showSfItemCtx` | 22140 | 18 | find / smart views |  |  |  |  |  | ● | 1 |
| `renameSfItem` | 22158 | 11 | find / smart views |  |  |  |  |  | ● | 0 |
| `finRenameSfItem` | 22169 | 5 | find / smart views |  | ● |  |  |  | ● | 0 |
| `setSfItemColor` | 22174 | 7 | find / smart views |  | ● |  |  |  | ● | 1 |
| `ctxSfItemColorSwatches` | 22181 | 8 | find / smart views |  |  |  |  |  | ● | 1 |
| `setSmartViewBold` | 22189 | 5 | find / smart views |  | ● |  |  |  | ● | 0 |
| `setSfItemBold` | 22194 | 7 | find / smart views |  | ● |  |  |  | ● | 0 |
| `toggleTagSection` | 22201 | 6 | organisation |  |  |  |  |  | ● | 0 |
| `showTagSecCtx` | 22207 | 17 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `ctxTagSecColorSwatches` | 22224 | 7 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `setTagSecColor` | 22231 | 5 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `renameTagSection` | 22236 | 9 | organisation |  |  |  |  |  | ● | 0 |
| `finRenTagSec` | 22245 | 7 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `promptAddGlobalTag` | 22253 | 9 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `addGlobalTag` | 22262 | 7 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `showTagCtx` | 22269 | 13 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `renameTag` | 22282 | 10 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `finRenameTag` | 22292 | 11 | tags / types / tabs | ● | ● |  | ● |  | ● | 2 |
| `deleteTag` | 22303 | 7 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `finRenameArtTitle` | 22310 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `renderTagSection` | 22319 | 33 | render |  |  |  |  |  | ● | 1 |
| `startRenameArtTitle` | 22352 | 10 | other / helpers | ● |  |  |  |  | ● | 0 |
| `_flushEverythingOut` | 22434 | 8 | other / helpers |  | ● |  |  |  | ● | 2 |
| `_a11yWireClickables` | 22653 | 9 | other / helpers |  |  |  |  |  | ● | 3 |
