# Siyagah — Function Inventory

*Generated mechanically by `node tools/inventory.mjs` from `index.html`.
Do not hand-edit: re-run it.*

| | |
|---|---|
| App version | v04.36 |
| Generated | 2026-09-19 |
| Application script | 19,100 lines |
| Application-defined functions | **1275** |
| …reachable (called in script or named in markup) | 1245 |
| …never referenced anywhere | 26 |
| …that mutate the data model | 376 |
| …that reach a persistence boundary | 272 |
| …classified destructive | 41 |
| …privacy-sensitive (export / identity) | 13 |
| …that touch the network | 17 |
| Inline `on*` handlers in markup | **1077** |
| Distinct functions those handlers call | 557 |
| Distinct DOM ids | 252 |

## Functions never referenced anywhere

- `_wordSnippet`
- `back`
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

- **other / helpers** — 548
- **tags / types / tabs** — 139
- **menus / dialogs** — 108
- **organisation** — 107
- **calendar / journal / contacts / database** — 84
- **editor / pop-out** — 70
- **find / smart views** — 51
- **render** — 46
- **cloud sync / auth** — 31
- **theme / appearance** — 26
- **destructive** — 22
- **export / import / backup** — 20
- **reminders / review** — 14
- **persistence** — 7
- **startup / load / migration** — 2

## Full inventory

Legend: **M** mutates model · **P** persists · **N** network · **D** destructive ·
**Pr** privacy-sensitive · **R** reachable

| Function | Line | Lines | Domain | M | P | N | D | Pr | R | Callers |
|---|---:|---:|---|:-:|:-:|:-:|:-:|:-:|:-:|---:|
| `_repairDB` | 2948 | 31 | other / helpers |  |  |  |  |  | ● | 3 |
| `loadDB` | 2980 | 143 | startup / load / migration | ● | ● |  | ● |  | ● | 1 |
| `_tiScheduleAutoSave` | 3158 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `_save` | 3178 | 45 | persistence |  | ● |  |  |  | ● | 13 |
| `persist` | 3223 | 1 | persistence |  | ● |  |  |  | ● | 249 |
| `_snapshotShell` | 3259 | 4 | export / import / backup |  |  |  |  | ● | ● | 1 |
| `_cleanExportRoot` | 3263 | 70 | export / import / backup |  |  |  |  | ● | ● | 1 |
| `getExportHTML` | 3336 | 20 | export / import / backup |  |  |  |  | ● | ● | 5 |
| `exportFile` | 3357 | 11 | export / import / backup |  | ● |  |  | ● | ● | 1 |
| `exportDeploy` | 3373 | 14 | export / import / backup |  | ● |  |  | ● | ● | 0 |
| `exportJSON` | 3387 | 1 | export / import / backup |  |  |  |  | ● | ● | 0 |
| `importJSON` | 3402 | 42 | export / import / backup | ● | ● |  | ● |  | ● | 0 |
| `toast` | 3446 | 1 | menus / dialogs |  |  |  |  |  | ● | 251 |
| `mkDefaults` | 3449 | 17 | other / helpers |  |  |  |  |  | ● | 1 |
| `uid` | 3468 | 1 | other / helpers |  |  |  |  | ● | ● | 91 |
| `esc` | 3469 | 1 | other / helpers |  |  |  |  |  | ● | 445 |
| `strip` | 3470 | 1 | other / helpers |  |  |  |  |  | ● | 4 |
| `_wordSnippet` | 3471 | 5 | other / helpers |  |  |  |  |  |  | 0 |
| `fmtD` | 3476 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `fmtDs` | 3477 | 6 | other / helpers |  |  |  |  |  | ● | 7 |
| `isJournalNote` | 3487 | 5 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `jrnEntryDate` | 3492 | 3 | other / helpers |  |  |  |  |  | ● | 4 |
| `setJrnEntryDate` | 3495 | 7 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_dlFlipDate` | 3511 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `_dateLineHTML` | 3519 | 18 | other / helpers |  |  |  |  |  | ● | 2 |
| `_p3MetaRowHTML` | 3549 | 8 | other / helpers |  |  |  |  |  | ● | 2 |
| `_isPlaceholder` | 3560 | 7 | other / helpers |  |  |  |  |  | ● | 2 |
| `chOf` | 3567 | 1 | other / helpers | ● |  |  |  |  | ● | 31 |
| `descOf` | 3568 | 1 | other / helpers |  |  |  |  |  | ● | 7 |
| `pathOf` | 3569 | 1 | other / helpers | ● |  |  |  |  | ● | 10 |
| `cntOf` | 3575 | 1 | other / helpers | ● |  |  |  |  | ● | 6 |
| `artsIn` | 3576 | 1 | other / helpers | ● |  |  |  |  | ● | 3 |
| `_autoLeavePrimary` | 3586 | 10 | other / helpers | ● |  |  |  |  | ● | 8 |
| `render` | 3598 | 1 | render |  |  |  |  |  | ● | 37 |
| `_renderPreserveEdit` | 3602 | 23 | render |  |  |  |  |  | ● | 3 |
| `_searchWords` | 3626 | 1 | find / smart views |  |  |  |  |  | ● | 2 |
| `_matchesAllWords` | 3627 | 1 | other / helpers |  |  |  |  |  | ● | 9 |
| `renderTree` | 3628 | 42 | render | ● |  |  |  |  | ● | 97 |
| `trNode` | 3671 | 20 | other / helpers |  |  |  |  |  | ● | 4 |
| `ensureFolderGroups` | 3698 | 6 | organisation |  |  |  |  |  | ● | 6 |
| `folderGroups` | 3704 | 1 | organisation |  |  |  |  |  | ● | 3 |
| `folderGroupOf` | 3705 | 1 | organisation |  |  |  |  |  | ● | 2 |
| `trGroupedKids` | 3706 | 27 | organisation |  |  |  |  |  | ● | 1 |
| `togFolderGroup` | 3733 | 5 | organisation |  |  |  |  |  | ● | 0 |
| `showFolderGroupCtx` | 3738 | 15 | organisation |  |  |  |  |  | ● | 0 |
| `addFolderGroup` | 3753 | 8 | organisation |  | ● |  |  |  | ● | 0 |
| `addFolderGroupThenMove` | 3761 | 13 | organisation | ● | ● |  |  |  | ● | 0 |
| `renameFolderGroup` | 3774 | 5 | organisation |  | ● |  |  |  | ● | 0 |
| `deleteFolderGroup` | 3779 | 14 | organisation | ● | ● |  |  |  | ● | 0 |
| `moveFolderToGroup` | 3793 | 5 | organisation | ● | ● |  |  |  | ● | 0 |
| `renderP2H` | 3799 | 117 | render | ● |  |  |  |  | ● | 21 |
| `renderP2C` | 3917 | 160 | render | ● |  |  |  |  | ● | 105 |
| `_navBtnsHTML` | 4083 | 8 | other / helpers |  |  |  |  |  | ● | 1 |
| `renderP3H` | 4091 | 221 | render | ● |  |  |  |  | ● | 89 |
| `renderP3C` | 4313 | 100 | render | ● |  |  |  |  | ● | 91 |
| `collapseFolder` | 4417 | 4 | organisation |  |  |  |  |  | ● | 2 |
| `selFolder` | 4422 | 14 | organisation |  |  |  |  |  | ● | 7 |
| `selArt` | 4436 | 8 | other / helpers | ● | ● |  |  |  | ● | 7 |
| `back` | 4444 | 1 | other / helpers |  |  |  |  |  |  | 0 |
| `togExp` | 4445 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `toggleSB` | 4451 | 11 | other / helpers |  |  |  |  |  | ● | 0 |
| `updateSbToggle` | 4463 | 13 | other / helpers |  |  |  |  |  | ● | 6 |
| `_fwOwns` | 4493 | 1 | editor / pop-out |  |  |  |  |  | ● | 3 |
| `_fwRaise` | 4494 | 6 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `startEdit` | 4500 | 5 | editor / pop-out | ● |  |  |  |  | ● | 1 |
| `cancelEdit` | 4505 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `saveArt` | 4506 | 41 | persistence | ● | ● |  |  |  | ● | 7 |
| `_sameArr` | 4537 | 1 | other / helpers |  |  |  |  |  | ● | 2 |
| `doSearch` | 4557 | 1 | find / smart views |  |  |  |  |  | ● | 1 |
| `clearSearch` | 4558 | 9 | find / smart views |  |  |  |  |  | ● | 1 |
| `restoreLastSearch` | 4567 | 7 | find / smart views |  |  |  |  |  | ● | 0 |
| `focusSidebarSearch` | 4574 | 4 | find / smart views |  |  |  |  |  | ● | 0 |
| `_updateSearchAccessUI` | 4578 | 6 | find / smart views |  |  |  |  |  | ● | 3 |
| `_renderP2SearchBar` | 4584 | 9 | render |  |  |  |  |  | ● | 2 |
| `_renderP3SearchBar` | 4593 | 14 | render | ● |  |  |  |  | ● | 2 |
| `goHome` | 4613 | 16 | other / helpers |  |  |  |  |  | ● | 0 |
| `ec` | 4630 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_alignBtnsHTML` | 4631 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `_txszStep` | 4644 | 15 | other / helpers |  |  |  |  |  | ● | 2 |
| `_txStepIn` | 4662 | 49 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `inEd` | 4664 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `edFontStep` | 4711 | 10 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_txClearIn` | 4725 | 24 | other / helpers |  |  |  |  |  | ● | 2 |
| `inRange` | 4730 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `edClearFmt` | 4749 | 8 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_curHeadingTag` | 4763 | 12 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `shiftHeadingLevel` | 4775 | 14 | other / helpers |  |  |  |  |  | ● | 1 |
| `shiftAllHeadingsMenu` | 4789 | 8 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `shiftAllHeadings` | 4797 | 21 | other / helpers |  |  |  |  |  | ● | 0 |
| `fb` | 4818 | 15 | other / helpers |  |  |  |  |  | ● | 0 |
| `_edHost` | 4846 | 7 | editor / pop-out |  |  |  |  |  | ● | 7 |
| `_edActive` | 4853 | 9 | editor / pop-out |  |  |  |  |  | ● | 13 |
| `_edTouched` | 4864 | 6 | persistence |  |  |  |  |  | ● | 4 |
| `_isED` | 4870 | 1 | other / helpers |  |  |  |  |  | ● | 9 |
| `_edAidOf` | 4874 | 6 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `_edArtOf` | 4880 | 4 | editor / pop-out | ● |  |  |  |  | ● | 4 |
| `_restoreCaret` | 4889 | 7 | destructive |  |  |  |  |  | ● | 5 |
| `insertAtCaret` | 4896 | 25 | editor / pop-out |  |  |  |  |  | ● | 14 |
| `_vpW` | 4923 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `_vpH` | 4924 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `isURL` | 4925 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `extractURL` | 4928 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `_dom` | 4934 | 1 | other / helpers |  |  |  |  |  | ● | 5 |
| `compressImage` | 4937 | 20 | other / helpers |  |  |  |  |  | ● | 1 |
| `insertImageFile` | 4957 | 4 | other / helpers |  |  |  |  |  | ● | 1 |
| `bkCardHTML` | 4964 | 7 | menus / dialogs |  |  |  |  |  | ● | 3 |
| `videoCardHTML` | 4974 | 11 | menus / dialogs |  |  |  |  |  | ● | 4 |
| `vidMentionHTML` | 4987 | 5 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `fetchVideoTitle` | 4992 | 8 | other / helpers |  |  | ● |  |  | ● | 2 |
| `embedHTML` | 5000 | 10 | other / helpers |  |  |  |  |  | ● | 2 |
| `bkMove` | 5011 | 5 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeItemMenu` | 5018 | 5 | menus / dialogs |  |  |  |  |  | ● | 19 |
| `_imOut` | 5024 | 3 | other / helpers |  |  |  |  |  | ● | 0 |
| `_itemTitle` | 5027 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `bkItemMenu` | 5034 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_popMenu` | 5035 | 8 | menus / dialogs |  |  |  |  |  | ● | 3 |
| `convertLinkEl` | 5043 | 13 | theme / appearance |  |  |  |  |  | ● | 4 |
| `itemMenu` | 5056 | 95 | menus / dialogs | ● | ● |  |  |  | ● | 3 |
| `mk` | 5060 | 3 | other / helpers |  |  |  |  |  | ● | 18 |
| `go` | 5061 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `doSearch` | 5090 | 40 | find / smart views | ● | ● |  |  |  | ● | 2 |
| `go` | 5100 | 5 | other / helpers | ● | ● |  |  |  | ● | 3 |
| `go` | 5110 | 4 | other / helpers | ● | ● |  |  |  | ● | 3 |
| `go` | 5119 | 3 | other / helpers |  | ● |  |  |  | ● | 3 |
| `attachChooser` | 5151 | 44 | other / helpers | ● | ● |  |  |  | ● | 2 |
| `go` | 5174 | 15 | other / helpers | ● | ● |  |  |  | ● | 3 |
| `closeImgRszBar` | 5199 | 6 | other / helpers |  |  |  |  |  | ● | 3 |
| `_imgRszOut` | 5205 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `showImgRszBar` | 5211 | 42 | other / helpers |  |  |  |  |  | ● | 1 |
| `btn` | 5215 | 2 | other / helpers |  |  |  |  |  | ● | 4 |
| `go` | 5216 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `sep` | 5217 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `applyPx` | 5229 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `imgAttachTag` | 5255 | 49 | tags / types / tabs | ● | ● |  |  |  | ● | 1 |
| `renderTags` | 5267 | 26 | render |  | ● |  |  |  | ● | 2 |
| `go` | 5273 | 5 | other / helpers |  | ● |  |  |  | ● | 3 |
| `isMyWallSubfolder` | 5310 | 9 | organisation | ● |  |  |  |  | ● | 2 |
| `togMwSubGrp` | 5319 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `togMwSubCat` | 5326 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `renderMyWallSubfolder` | 5332 | 97 | render | ● |  |  |  |  | ● | 1 |
| `_subtreeArts` | 5344 | 5 | organisation |  |  |  |  |  | ● | 1 |
| `_kindLatest` | 5378 | 1 | tags / types / tabs |  |  |  |  |  | ● | 4 |
| `_sortKinds` | 5379 | 4 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `newJournalEntry` | 5434 | 19 | calendar / journal / contacts / database | ● | ● |  |  |  |  | 0 |
| `toggleArchive` | 5456 | 9 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `mkArtTitleOnly` | 5471 | 28 | other / helpers | ● | ● |  |  |  | ● | 1 |
| `qtKey` | 5499 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `qtSave` | 5503 | 8 | other / helpers |  |  |  |  |  | ● | 1 |
| `openLinkToNote` | 5516 | 41 | theme / appearance | ● |  |  |  |  | ● | 0 |
| `render` | 5520 | 24 | render | ● |  |  |  |  | ● | 37 |
| `ltnSearch` | 5557 | 25 | find / smart views | ● |  |  |  |  | ● | 1 |
| `toggleNoteLink` | 5582 | 17 | theme / appearance | ● | ● |  |  |  | ● | 0 |
| `_posAnnBubble` | 5610 | 12 | other / helpers |  |  |  |  |  | ● | 1 |
| `showAnnBubble` | 5622 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `hideAnnBubble` | 5629 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `annBubClick` | 5636 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `wireAnnEditor` | 5645 | 14 | other / helpers |  |  |  |  |  | ● | 1 |
| `onUp` | 5646 | 6 | other / helpers |  |  |  |  |  | ● | 2 |
| `openAnnModal` | 5661 | 19 | menus / dialogs | ● |  |  |  |  | ● | 1 |
| `_cancelAnn` | 5680 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_confirmAnn` | 5682 | 36 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `annPanelHTML` | 5720 | 45 | other / helpers |  |  |  |  |  | ● | 3 |
| `_refreshAnnPanel` | 5765 | 9 | other / helpers |  |  |  |  |  | ● | 5 |
| `scrollToAnnComment` | 5776 | 6 | other / helpers |  |  |  |  |  | ● | 2 |
| `scrollToAnnMark` | 5782 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `showAnnReplyBox` | 5792 | 11 | other / helpers |  |  |  |  |  | ● | 0 |
| `submitAnnReply` | 5803 | 12 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_edCleanHTML` | 5819 | 6 | editor / pop-out |  |  |  |  |  | ● | 5 |
| `confirmDeleteAnnotation` | 5826 | 14 | destructive | ● |  |  |  |  | ● | 0 |
| `deleteAnnotation` | 5840 | 23 | destructive | ● | ● |  |  |  | ● | 1 |
| `toggleAnnMode` | 5866 | 6 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `injectInlineAnns` | 5876 | 49 | other / helpers |  |  |  |  |  | ● | 2 |
| `showAnnEditBox` | 5927 | 19 | other / helpers | ● |  |  |  |  | ● | 0 |
| `cancelAnnEdit` | 5946 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `saveAnnEdit` | 5950 | 12 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `showAnnReplyEdit` | 5964 | 16 | other / helpers | ● |  |  |  |  | ● | 0 |
| `saveAnnReplyEdit` | 5980 | 11 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `quickNewNote` | 5996 | 30 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_tabsMap` | 6037 | 7 | tags / types / tabs | ● |  |  |  |  | ● | 11 |
| `_tabOwner` | 6048 | 16 | tags / types / tabs | ● |  |  |  |  | ● | 4 |
| `_tabHost` | 6065 | 5 | tags / types / tabs | ● |  |  |  |  | ● | 5 |
| `_tabGroup` | 6070 | 1 | organisation |  |  |  |  |  | ● | 2 |
| `_tabStamps` | 6080 | 4 | cloud sync / auth |  |  |  |  |  | ● | 6 |
| `_tabStampAdd` | 6084 | 5 | cloud sync / auth |  |  |  |  |  | ● | 3 |
| `_tabStampRm` | 6089 | 5 | cloud sync / auth |  |  |  |  |  | ● | 3 |
| `_tabStampPurge` | 6097 | 6 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `_tabNoHost` | 6103 | 1 | tags / types / tabs |  |  |  |  |  | ● | 3 |
| `renderTabBar` | 6105 | 86 | render | ● | ● |  | ● |  | ● | 19 |
| `chip` | 6158 | 15 | other / helpers |  |  |  |  |  | ● | 2 |
| `_tabSplitVizAdd` | 6194 | 10 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `_tabNavSync` | 6208 | 23 | tags / types / tabs |  |  |  |  |  | ● | 3 |
| `_tabNavQueue` | 6231 | 8 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_tabScroll` | 6239 | 5 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_tabScrollIntoView` | 6246 | 9 | tags / types / tabs |  |  |  |  |  | ● | 6 |
| `tabSelect` | 6255 | 15 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `toggleTab` | 6270 | 18 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `closeTab` | 6288 | 9 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `closeTabGroup` | 6297 | 9 | organisation |  | ● |  |  |  | ● | 0 |
| `tabBarDragOver` | 6311 | 6 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `tabBarDragLeave` | 6317 | 3 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `tabBarDrop` | 6320 | 20 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `fmtRemDt` | 6348 | 7 | reminders / review |  |  |  |  |  | ● | 2 |
| `reminderStripHTML` | 6356 | 17 | reminders / review |  |  |  |  |  | ● | 1 |
| `openReminderModal` | 6374 | 21 | reminders / review | ● |  |  |  |  | ● | 2 |
| `closeReminderModal` | 6395 | 4 | reminders / review |  |  |  |  |  | ● | 1 |
| `saveReminder` | 6399 | 14 | reminders / review | ● | ● |  |  |  | ● | 0 |
| `clearReminder` | 6413 | 8 | reminders / review | ● | ● |  | ● |  | ● | 0 |
| `deleteNote` | 6428 | 22 | destructive | ● | ● |  | ● |  | ● | 0 |
| `mwRelDate` | 6453 | 15 | other / helpers |  |  |  |  |  | ● | 1 |
| `renderSecSF` | 6478 | 25 | render |  |  |  |  |  | ● | 1 |
| `togSecSF` | 6505 | 6 | find / smart views |  |  |  |  |  | ● | 0 |
| `selSecSF` | 6513 | 10 | find / smart views |  |  |  |  |  | ● | 0 |
| `getSectionFolderIds` | 6525 | 6 | organisation | ● |  |  |  |  | ● | 2 |
| `walk` | 6527 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `getSecArts` | 6531 | 4 | other / helpers | ● |  |  |  |  | ● | 2 |
| `getSecSmartArts` | 6537 | 17 | find / smart views |  |  |  |  |  | ● | 4 |
| `getSecSmartGroups` | 6556 | 34 | organisation |  |  |  |  |  | ● | 3 |
| `ts` | 6559 | 1 | other / helpers |  |  |  |  |  | ● | 12 |
| `sod` | 6560 | 1 | other / helpers |  |  |  |  |  | ● | 2 |
| `openTabPicker` | 6597 | 47 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_outside` | 6631 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeTabPicker` | 6645 | 4 | tags / types / tabs |  |  |  |  |  | ● | 3 |
| `renderTabPickerList` | 6650 | 33 | render | ● |  |  |  |  | ● | 1 |
| `addToTabPicker` | 6684 | 18 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `_ntiChipTap` | 6712 | 4 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `openNtiPicker` | 6716 | 13 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_cl` | 6726 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeNtiPicker` | 6729 | 1 | tags / types / tabs |  |  |  |  |  | ● | 4 |
| `renderNtiPickerBody` | 6730 | 28 | render | ● |  |  |  |  | ● | 12 |
| `openJournalPicker` | 6763 | 15 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_cl` | 6775 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeJournalPicker` | 6778 | 1 | calendar / journal / contacts / database |  |  |  |  |  | ● | 3 |
| `renderJournalPickerBody` | 6779 | 15 | render | ● |  |  |  |  | ● | 3 |
| `_ensureJournalTag` | 6794 | 6 | tags / types / tabs |  |  |  |  |  | ● | 3 |
| `toggleNoteJournal` | 6800 | 11 | calendar / journal / contacts / database | ● | ● |  | ● |  | ● | 0 |
| `newJournalEventForNote` | 6811 | 14 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `openAttachMenu` | 6830 | 32 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `openMyDatabasePicker` | 6865 | 13 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_cl` | 6875 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeMyDatabasePicker` | 6878 | 1 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `renderMyDatabasePickerBody` | 6879 | 14 | render | ● |  |  |  |  | ● | 2 |
| `toggleNoteDbFolder` | 6893 | 11 | organisation | ● | ● |  | ● |  | ● | 0 |
| `togNtiCat` | 6904 | 1 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_ctxPos` | 6905 | 1 | menus / dialogs |  |  |  |  |  | ● | 12 |
| `addNtiCat` | 6906 | 1 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `openCatClrPicker` | 6907 | 9 | menus / dialogs |  | ● |  |  |  | ● | 0 |
| `catTextStyle` | 6916 | 8 | other / helpers |  |  |  |  |  | ● | 3 |
| `toggleNtiCatBold` | 6924 | 1 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `setNtiCatSize` | 6925 | 1 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `showNtiCatMenu` | 6926 | 6 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `showNtiSectionMenu` | 6932 | 13 | organisation |  |  |  |  |  | ● | 0 |
| `renNtiSectionLabel` | 6945 | 9 | organisation | ● | ● |  |  |  | ● | 0 |
| `openNtiSectionClrPicker` | 6954 | 8 | organisation | ● | ● |  |  |  | ● | 0 |
| `ntiSbToggleAllCats` | 6962 | 7 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `renNtiCat` | 6969 | 1 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `delNtiCat` | 6970 | 2 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `showNtiKindMenu` | 6972 | 1 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `addKindInCat` | 6973 | 2 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `renNtiKind` | 6975 | 1 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `delNtiKind` | 6976 | 2 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `moveKindToCat` | 6978 | 1 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `_migrateNotebook` | 6986 | 21 | startup / load / migration |  |  | ● |  |  | ● | 1 |
| `runMigration` | 7008 | 24 | other / helpers |  | ● | ● |  |  | ● | 0 |
| `generateBackupHTMLContent` | 7035 | 48 | export / import / backup | ● |  |  |  |  | ● | 3 |
| `chOf` | 7040 | 1 | other / helpers | ● |  |  |  |  | ● | 31 |
| `notesIn` | 7041 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `kindChips` | 7042 | 1 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `tagChips` | 7043 | 1 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `statusBadge` | 7044 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `fmtDate` | 7045 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `renderNote` | 7046 | 4 | render |  |  |  |  |  | ● | 2 |
| `renderFolder` | 7050 | 9 | render | ● |  |  |  |  | ● | 2 |
| `exportBackupHTML` | 7083 | 9 | export / import / backup |  |  |  |  | ● | ● | 0 |
| `exportBackupPDF` | 7092 | 7 | export / import / backup |  |  |  |  | ● | ● | 0 |
| `backupToGDrive` | 7101 | 27 | export / import / backup |  |  | ● |  |  | ● | 0 |
| `_getDriveFolder` | 7128 | 12 | organisation |  |  | ● |  |  | ● | 1 |
| `_uploadToDrive` | 7140 | 9 | other / helpers |  |  | ● |  |  | ● | 1 |
| `syncKnowledgeBase` | 7152 | 14 | other / helpers | ● | ● |  |  |  | ● | 1 |
| `importBackup` | 7171 | 46 | export / import / backup |  |  |  |  |  | ● | 0 |
| `_mergeBackup` | 7218 | 11 | export / import / backup | ● | ● |  |  |  | ● | 1 |
| `_replaceWithBackup` | 7230 | 16 | export / import / backup | ● | ● |  |  |  | ● | 1 |
| `_weekOfMonth` | 7249 | 1 | other / helpers |  |  |  |  |  | ● | 2 |
| `toggleJournalMode` | 7250 | 5 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `quickJournalEntry` | 7255 | 11 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 2 |
| `openAddNoteToEvent` | 7267 | 13 | other / helpers | ● |  |  |  |  | ● | 0 |
| `_aneFilter` | 7280 | 5 | find / smart views |  |  |  |  |  | ● | 0 |
| `addExistingNoteToEvent` | 7285 | 12 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `moveJrnEvent` | 7299 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `togJrnGrp` | 7307 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `jrnGroupDate` | 7311 | 5 | organisation | ● |  |  |  |  | ● | 3 |
| `setJrnGroupBy` | 7316 | 7 | organisation | ● | ● |  |  |  | ● | 0 |
| `_jrnGroupByToggleHTML` | 7323 | 7 | organisation | ● |  |  |  |  | ● | 2 |
| `_buildJournalView` | 7330 | 42 | calendar / journal / contacts / database |  |  |  |  |  | ● | 3 |
| `_renderJournalFolder` | 7372 | 6 | render | ● |  |  |  |  | ● | 1 |
| `_renderJournalSmartView` | 7378 | 44 | render | ● |  |  |  |  | ● | 2 |
| `toggleAccordionSec` | 7426 | 6 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `updateAccordionBtn` | 7432 | 4 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_getFavCats` | 7447 | 4 | tags / types / tabs |  |  |  |  |  | ● | 8 |
| `selDbItem` | 7451 | 7 | calendar / journal / contacts / database |  |  |  |  |  | ● | 4 |
| `renderDatabaseSection` | 7458 | 36 | render | ● |  |  |  |  | ● | 1 |
| `_renderMyJournalDB` | 7494 | 1 | render |  |  |  |  |  | ● | 2 |
| `renameJrnEvent` | 7497 | 6 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_setJrnStyle` | 7503 | 9 | other / helpers | ● | ● |  | ● |  | ● | 2 |
| `pickJrnColor` | 7512 | 6 | theme / appearance | ● |  |  |  |  | ● | 0 |
| `cycleJrnSize` | 7518 | 7 | other / helpers | ● |  |  |  |  |  | 0 |
| `resetJrnStyle` | 7525 | 4 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `_jrnCardStyleTag` | 7529 | 9 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_jrnSizeLive` | 7538 | 10 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_jrnSizeCommit` | 7548 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `_jrnStyleMenu` | 7549 | 29 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `_renderMyFavourites` | 7578 | 40 | render | ● |  |  |  |  | ● | 2 |
| `addFavCat` | 7619 | 12 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `showFavCatCtx` | 7631 | 13 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `renameFavCat` | 7644 | 7 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `deleteFavCat` | 7651 | 7 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `setNoteFavCat` | 7658 | 8 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `newFavEntry` | 7666 | 23 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `_ctName` | 7693 | 5 | other / helpers |  |  |  |  |  | ● | 15 |
| `newContact` | 7699 | 22 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `toggleCTMode` | 7722 | 14 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `toggleCTNameMode` | 7737 | 14 | other / helpers | ● |  |  |  |  | ● | 0 |
| `addCTPhone` | 7752 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `_saveContactForm` | 7761 | 21 | persistence |  | ● |  |  |  | ● | 1 |
| `renderCTCard` | 7783 | 20 | render |  |  |  |  |  | ● | 1 |
| `renderCTForm` | 7804 | 38 | render |  |  |  |  |  | ● | 1 |
| `_renderMyContacts` | 7843 | 22 | render | ● |  |  |  |  | ● | 2 |
| `showDbItemCtx` | 7869 | 42 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_renderWhoBar` | 7917 | 11 | render |  |  |  |  |  | ● | 1 |
| `_whoSearch` | 7929 | 22 | find / smart views | ● |  |  |  |  | ● | 0 |
| `_whoClear` | 7952 | 4 | other / helpers |  |  |  |  |  | ● | 1 |
| `_whoSelect` | 7957 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `logInteraction` | 7963 | 17 | other / helpers | ● | ● |  |  |  | ● | 1 |
| `_elapsed` | 7982 | 11 | other / helpers |  |  |  |  |  | ● | 3 |
| `_renderInteractionLog` | 7995 | 25 | render |  |  |  |  |  | ● | 1 |
| `newStarredNote` | 8024 | 12 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `newPinnedNote` | 8037 | 12 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `newNoteWithReminder` | 8050 | 12 | reminders / review | ● | ● |  |  |  | ● | 0 |
| `quickJournalEntryFromDB` | 8063 | 16 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `_trackLastFolder` | 8081 | 6 | organisation | ● |  |  |  |  | ● | 2 |
| `newJournalFolder` | 8091 | 14 | organisation |  |  |  |  |  | ● | 0 |
| `_njfRow` | 8105 | 7 | other / helpers |  |  |  |  |  | ● | 2 |
| `njfFilter` | 8112 | 18 | find / smart views | ● |  |  |  |  | ● | 2 |
| `rows` | 8121 | 1 | other / helpers |  |  |  |  |  | ● | 4 |
| `njfSelect` | 8130 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `createNewJournalFolder` | 8134 | 26 | organisation | ● | ● |  |  |  | ● | 0 |
| `calJournalFolderIds` | 8163 | 10 | organisation | ● |  |  |  |  | ● | 2 |
| `calJournalEntries` | 8173 | 6 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 4 |
| `calJournalCount` | 8179 | 1 | calendar / journal / contacts / database |  |  |  |  |  | ● | 2 |
| `openJrnCalScope` | 8180 | 32 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 3 |
| `_jrnScopeSetMode` | 8212 | 3 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_jrnScopeSetOne` | 8215 | 3 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_jrnScopeToggle` | 8218 | 7 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `_calInit` | 8228 | 23 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 9 |
| `_calWeekStart` | 8251 | 1 | calendar / journal / contacts / database |  |  |  |  |  | ● | 2 |
| `_calOpen` | 8252 | 6 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `_calNav` | 8258 | 20 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `_calToday` | 8278 | 7 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_calRenderH` | 8285 | 58 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 2 |
| `_loadCalHols` | 8343 | 10 | calendar / journal / contacts / database |  | ● | ● |  |  | ● | 5 |
| `_calPublicHols` | 8353 | 10 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 3 |
| `_calSchoolHols` | 8363 | 15 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 3 |
| `_calHolsForDate` | 8378 | 6 | find / smart views |  |  |  |  |  | ● | 3 |
| `_calNoteCount` | 8384 | 3 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `_calSelectDate` | 8387 | 44 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `close` | 8427 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `_calNewNote` | 8431 | 14 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `_calNewJournal` | 8445 | 15 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `_calViewNotes` | 8460 | 9 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `_calRenderMonth` | 8469 | 48 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `_calRenderWeek` | 8517 | 27 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `_calRenderYear` | 8544 | 27 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `openCalSettings` | 8571 | 14 | calendar / journal / contacts / database | ● | ● |  | ● |  | ● | 0 |
| `_showClrPicker` | 8591 | 51 | menus / dialogs |  |  |  |  |  | ● | 14 |
| `close` | 8639 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `togClrFam` | 8642 | 9 | other / helpers |  |  |  |  |  | ● | 0 |
| `_clrHover` | 8651 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `_clrPick` | 8655 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `openFolClrPicker` | 8659 | 5 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `openSecClrPicker` | 8664 | 5 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `openKindClrPicker` | 8669 | 10 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `openSfClrPicker` | 8683 | 4 | find / smart views |  |  |  |  |  | ● | 0 |
| `openDbItemClrPicker` | 8687 | 10 | calendar / journal / contacts / database | ● | ● |  | ● |  | ● | 0 |
| `openThemeClrPicker` | 8697 | 16 | theme / appearance |  |  |  |  |  | ● | 0 |
| `showTagClrPicker` | 8715 | 14 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `openTabClrPicker` | 8729 | 7 | tags / types / tabs | ● | ● |  | ● |  | ● | 0 |
| `_popGeoAll` | 8748 | 13 | menus / dialogs | ● |  |  |  |  | ● | 9 |
| `_popGeoFlush` | 8761 | 6 | menus / dialogs |  | ● |  |  |  | ● | 6 |
| `openNoteAsModal` | 8774 | 30 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `openNoteModal` | 8804 | 75 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_p3SheetHdSync` | 8883 | 16 | menus / dialogs | ● |  |  |  |  | ● | 2 |
| `closeNoteModal` | 8899 | 40 | menus / dialogs |  |  |  |  |  | ● | 5 |
| `_ptrDown` | 8948 | 5 | other / helpers |  |  |  |  |  | ● | 12 |
| `_ptrUp` | 8953 | 5 | other / helpers |  |  |  |  |  | ● | 14 |
| `_modalDragStart` | 8958 | 8 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_modalDragMove` | 8966 | 7 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalDragEnd` | 8973 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalHandlesOff` | 8982 | 21 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_modalClampToViewport` | 9007 | 10 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_modalResizeRStart` | 9017 | 9 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeRMove` | 9026 | 6 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeREnd` | 9032 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBStart` | 9033 | 9 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBMove` | 9042 | 6 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBEnd` | 9048 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeLStart` | 9049 | 9 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeLMove` | 9058 | 7 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeLEnd` | 9065 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeTStart` | 9066 | 9 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_modalResizeTMove` | 9075 | 8 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeTEnd` | 9083 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_tabBarModalDown` | 9084 | 22 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `onMove` | 9091 | 10 | other / helpers |  |  |  |  |  | ● | 2 |
| `onUp` | 9101 | 1 | other / helpers |  |  |  |  |  | ● | 2 |
| `_tabBarCursor` | 9106 | 7 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_openFloatPop` | 9123 | 20 | menus / dialogs |  |  |  |  |  | ● | 8 |
| `_cl` | 9134 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `_flPopPlace` | 9159 | 26 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `closeFloatPop` | 9185 | 1 | menus / dialogs |  |  |  |  |  | ● | 8 |
| `_closeStickyPop` | 9188 | 6 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_p3HomeBtnHTML` | 9205 | 5 | other / helpers |  |  |  |  |  | ● | 3 |
| `_p3OneBar` | 9233 | 1 | other / helpers |  |  |  |  |  | ● | 11 |
| `_p3EditIconsHTML` | 9234 | 27 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ebOpenTabsHTML` | 9272 | 22 | tags / types / tabs | ● |  |  |  |  | ● | 1 |
| `row` | 9282 | 7 | other / helpers |  |  |  |  |  | ● | 8 |
| `togEBGroup` | 9294 | 12 | organisation |  |  |  |  |  | ● | 0 |
| `_ebListsHTML` | 9334 | 9 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ebInsertHTML` | 9343 | 8 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ebAttachHTML` | 9365 | 41 | other / helpers |  |  |  |  |  | ● | 3 |
| `row` | 9375 | 2 | other / helpers |  |  |  |  |  | ● | 8 |
| `_ebGoToHTML` | 9410 | 11 | other / helpers |  |  |  |  |  | ● | 3 |
| `_ebPopHTML` | 9429 | 14 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `row` | 9433 | 8 | other / helpers |  |  |  |  |  | ● | 8 |
| `_ebTagRowHTML` | 9447 | 5 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_ebNoteStateHTML` | 9455 | 18 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ebSectionToolsHTML` | 9473 | 11 | organisation | ● |  |  |  |  | ● | 2 |
| `_buildEBSub` | 9484 | 87 | other / helpers | ● |  |  |  |  | ● | 1 |
| `duplicateNote` | 9578 | 25 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `_fwFocus` | 9626 | 9 | editor / pop-out |  |  |  |  |  | ● | 3 |
| `_popTier` | 9668 | 1 | menus / dialogs |  |  |  |  |  | ● | 9 |
| `_popIcoHTML` | 9680 | 15 | menus / dialogs |  |  |  |  |  | ● | 7 |
| `_popBtnHTML` | 9698 | 9 | menus / dialogs |  |  |  |  |  | ● | 4 |
| `_popKindLbl` | 9709 | 4 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `_notePopMode` | 9713 | 4 | menus / dialogs | ● |  |  |  |  | ● | 1 |
| `_rememberNotePop` | 9720 | 8 | reminders / review | ● | ● |  |  |  | ● | 1 |
| `openNotePopup` | 9730 | 7 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `closeAllFloats` | 9740 | 6 | other / helpers |  | ● |  |  |  | ● | 3 |
| `closeAllPopouts` | 9746 | 5 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_fwSyncCloseAllChip` | 9754 | 41 | editor / pop-out | ● |  |  |  |  | ● | 4 |
| `_panelToFloat` | 9798 | 22 | other / helpers |  |  |  |  |  | ● | 1 |
| `popOutNote` | 9820 | 32 | editor / pop-out |  |  |  |  |  | ● | 6 |
| `_fwDefaultGeom` | 9862 | 11 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_fwCreate` | 9873 | 48 | editor / pop-out | ● |  |  |  |  | ● | 1 |
| `_syncCol` | 9902 | 4 | cloud sync / auth |  |  |  |  |  | ● | 0 |
| `_fwResizeStart` | 9926 | 25 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `move` | 9932 | 10 | other / helpers |  |  |  |  |  | ● | 1 |
| `up` | 9942 | 5 | other / helpers |  |  |  |  |  | ● | 1 |
| `_fwAddResizeHandles` | 9951 | 14 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_fwSavePos` | 9969 | 11 | editor / pop-out |  | ● |  |  |  | ● | 3 |
| `_fwMetaHTML` | 9985 | 25 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_findEls` | 10025 | 14 | destructive |  |  |  |  |  | ● | 6 |
| `_ntFindRanges` | 10039 | 19 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ntFindPaint` | 10058 | 8 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ntFindLabel` | 10066 | 4 | other / helpers |  |  |  |  |  | ● | 4 |
| `_ntFindRun` | 10070 | 9 | other / helpers |  |  |  |  |  | ● | 0 |
| `_ntFindStep` | 10079 | 13 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ntFindToggle` | 10092 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `_ntFindClose` | 10100 | 7 | other / helpers |  |  |  |  |  | ● | 7 |
| `_ntFindKey` | 10107 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `_noteSiblings` | 10129 | 9 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_p3Navigate` | 10140 | 10 | other / helpers |  |  |  |  |  | ● | 0 |
| `_fwNavigate` | 10150 | 23 | editor / pop-out |  | ● |  |  |  | ● | 0 |
| `_fwFlashSaved` | 10173 | 7 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_fwRenderBody` | 10180 | 47 | editor / pop-out | ● |  |  |  |  | ● | 1 |
| `_fwEc` | 10236 | 6 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_fwFb` | 10242 | 13 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_fwFontStep` | 10257 | 7 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_fwClearFmt` | 10264 | 7 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_fwBuildEBSub` | 10271 | 48 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_fwTogGroup` | 10320 | 8 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_fwWireDrag` | 10328 | 23 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `move` | 10331 | 4 | other / helpers |  |  |  |  |  | ● | 1 |
| `up` | 10335 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `_fwFlush` | 10355 | 13 | editor / pop-out | ● |  |  |  |  | ● | 5 |
| `_fwSave` | 10368 | 10 | editor / pop-out | ● | ● |  |  |  | ● | 0 |
| `_fwScheduleAutoSave` | 10383 | 18 | editor / pop-out | ● | ● |  | ● |  | ● | 7 |
| `closeFloatWin` | 10403 | 16 | other / helpers | ● | ● |  | ● |  | ● | 3 |
| `_modalResizeTRStart` | 10422 | 9 | menus / dialogs |  |  |  |  |  |  | 0 |
| `_modalResizeTRMove` | 10431 | 10 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeTREnd` | 10441 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeTLStart` | 10443 | 9 | menus / dialogs |  |  |  |  |  |  | 0 |
| `_modalResizeTLMove` | 10452 | 9 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeTLEnd` | 10461 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBLStart` | 10463 | 9 | menus / dialogs |  |  |  |  |  |  | 0 |
| `_modalResizeBLMove` | 10472 | 8 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBLEnd` | 10480 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBRStart` | 10485 | 9 | menus / dialogs |  |  |  |  |  |  | 0 |
| `_modalResizeBRMove` | 10494 | 7 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBREnd` | 10501 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_tabBarModalReset` | 10504 | 14 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `setMwFontSize` | 10520 | 9 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `todayStr` | 10532 | 4 | other / helpers |  |  |  |  |  | ● | 6 |
| `togCalLayer` | 10536 | 6 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `_calGetCat` | 10542 | 3 | calendar / journal / contacts / database |  |  |  |  |  | ● | 8 |
| `_calNewEvent` | 10545 | 6 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_calEditEvent` | 10551 | 5 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_calUpdateFormAllDay` | 10556 | 5 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_calSaveEvent` | 10561 | 31 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `_calDelEvent` | 10592 | 7 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `_calRenderEventForm` | 10599 | 29 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_calRenderDay` | 10628 | 60 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `_renderMyCalP2` | 10688 | 40 | render |  |  |  |  |  | ● | 2 |
| `_calJumpToDate` | 10728 | 9 | calendar / journal / contacts / database |  |  |  |  |  |  | 0 |
| `_upcomingEvents` | 10740 | 21 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_renderComingUp` | 10761 | 29 | render |  |  |  |  |  | ● | 1 |
| `_calManageCats` | 10790 | 6 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_calAddCat` | 10796 | 8 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `_calSaveCat` | 10804 | 9 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `_calDelCat` | 10813 | 5 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `_calRenderCatList` | 10818 | 16 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `openGlobalSearch` | 10838 | 25 | find / smart views |  |  |  |  |  | ● | 1 |
| `closeGlobalSearch` | 10863 | 3 | find / smart views |  |  |  |  |  | ● | 5 |
| `_gsSearch` | 10866 | 17 | find / smart views | ● |  |  |  |  | ● | 1 |
| `_gsHL` | 10883 | 6 | other / helpers |  |  |  |  |  | ● | 2 |
| `_gsRender` | 10889 | 25 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_gsSetActive` | 10914 | 5 | other / helpers |  |  |  |  |  | ● | 2 |
| `_gsNav` | 10919 | 5 | other / helpers |  |  |  |  |  | ● | 2 |
| `_gsConfirm` | 10924 | 4 | other / helpers |  |  |  |  |  | ● | 1 |
| `_gsOpen` | 10928 | 4 | other / helpers |  |  |  |  |  | ● | 1 |
| `_hjDate` | 10939 | 18 | other / helpers |  |  |  |  |  | ● | 9 |
| `_hjStr` | 10957 | 4 | other / helpers |  |  |  |  |  | ● | 1 |
| `toggleHijri` | 10961 | 7 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `installPWA` | 10973 | 10 | other / helpers |  |  |  |  |  | ● | 0 |
| `_mrjDueArts` | 10998 | 5 | other / helpers | ● |  |  |  |  | ● | 4 |
| `_mrjAllEnrolled` | 11003 | 4 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_mrjDueCount` | 11007 | 1 | other / helpers |  |  |  |  |  |  | 0 |
| `mrjToggle` | 11008 | 11 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `_mrjSchedule` | 11019 | 10 | other / helpers |  | ● |  |  |  | ● | 1 |
| `mrjStart` | 11029 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `mrjRate` | 11035 | 9 | other / helpers | ● |  |  |  |  | ● | 0 |
| `mrjNext` | 11044 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `mrjEnd` | 11051 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `_mrjRenderFooter` | 11057 | 9 | other / helpers |  |  |  |  |  | ● | 1 |
| `_mrjRenderP2C` | 11066 | 25 | other / helpers |  |  |  |  |  | ● | 1 |
| `practiceToggle` | 11096 | 6 | reminders / review | ● | ● |  | ● |  | ● | 0 |
| `_practiceRenderP2C` | 11102 | 24 | reminders / review | ● |  |  |  |  | ● | 1 |
| `openCiteModal` | 11131 | 11 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `closeCiteModal` | 11142 | 3 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `setCiteType` | 11145 | 5 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_buildCiteHTML` | 11150 | 30 | other / helpers |  |  |  |  |  | ● | 1 |
| `insertCite` | 11180 | 12 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_citeModalHTML` | 11192 | 40 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_tocHostEl` | 11239 | 5 | other / helpers |  |  |  |  |  | ● | 4 |
| `_tocScrollEl` | 11244 | 5 | other / helpers |  |  |  |  |  | ● | 3 |
| `_tocScan` | 11249 | 6 | other / helpers |  |  |  |  |  | ● | 3 |
| `_tocItemHTML` | 11256 | 6 | other / helpers |  |  |  |  |  | ● | 2 |
| `_tocInject` | 11263 | 91 | other / helpers | ● |  |  |  |  | ● | 4 |
| `togTocTitle` | 11354 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `_tocBindScroll` | 11359 | 14 | other / helpers |  |  |  |  |  | ● | 1 |
| `_tocUnbindScroll` | 11374 | 7 | other / helpers |  |  |  |  |  | ● | 6 |
| `_tocScrollTo` | 11382 | 18 | other / helpers |  |  |  |  |  | ● | 1 |
| `_tocSetActive` | 11401 | 14 | other / helpers |  |  |  |  |  | ● | 3 |
| `_tocToggleSide` | 11416 | 35 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_tocStartResize` | 11451 | 21 | other / helpers | ● | ● |  |  |  |  | 0 |
| `onMove` | 11458 | 5 | other / helpers |  |  |  |  |  | ● | 1 |
| `onUp` | 11463 | 6 | other / helpers | ● | ● |  |  |  | ● | 1 |
| `_tocDestroy` | 11472 | 11 | other / helpers |  |  |  |  |  | ● | 1 |
| `pinTabDStart` | 11492 | 4 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_pinPanelDragOver` | 11496 | 4 | tags / types / tabs |  |  |  |  |  |  | 0 |
| `_pinPanelDragLeave` | 11500 | 3 | tags / types / tabs |  |  |  |  |  |  | 0 |
| `_pinPanelDrop` | 11503 | 8 | tags / types / tabs |  |  |  |  |  |  | 0 |
| `pinTabToPanel` | 11511 | 10 | tags / types / tabs | ● | ● |  |  |  | ● | 1 |
| `unpinTab` | 11521 | 6 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `_pinPanelToggleSide` | 11527 | 6 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `_extractHeadingsFromHTML` | 11536 | 17 | find / smart views |  |  |  |  |  | ● | 1 |
| `togPinExpand` | 11553 | 5 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `togPinCardMode` | 11558 | 5 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `togPinHeadExpand` | 11563 | 6 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_pinHeadsTreeHTML` | 11569 | 12 | organisation |  |  |  |  |  | ● | 1 |
| `_pinCardHTML` | 11581 | 25 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `_pinHostEl` | 11606 | 5 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_pinPanelInject` | 11611 | 94 | tags / types / tabs | ● | ● |  |  |  | ● | 10 |
| `_fwSyncBodyPadding` | 11708 | 12 | editor / pop-out |  |  |  |  |  | ● | 9 |
| `_fwClearAllBodyPadding` | 11720 | 3 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `_pinStartResize` | 11723 | 22 | tags / types / tabs |  | ● |  |  |  |  | 0 |
| `onMove` | 11730 | 5 | other / helpers |  |  |  |  |  | ● | 1 |
| `onUp` | 11735 | 8 | other / helpers |  | ● |  |  |  | ● | 1 |
| `_pinPanelDestroy` | 11745 | 4 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_pinOpenNote` | 11753 | 4 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_syncP3CPadding` | 11760 | 11 | cloud sync / auth |  |  |  |  |  | ● | 8 |
| `_tocMobileCheck` | 11774 | 13 | other / helpers |  |  |  |  |  | ● | 2 |
| `_tocOpenMobile` | 11788 | 13 | other / helpers |  |  |  |  |  |  | 0 |
| `_tocCloseMobile` | 11802 | 10 | other / helpers |  |  |  |  |  | ● | 2 |
| `_tocMobileScrollTo` | 11813 | 4 | other / helpers |  |  |  |  |  |  | 0 |
| `_dfltHdStyles` | 11822 | 4 | other / helpers |  |  |  |  |  | ● | 6 |
| `_applyHeadingStyles` | 11826 | 11 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_initCollapsible` | 11837 | 38 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_colToggle` | 11875 | 15 | other / helpers | ● | ● |  | ● |  | ● | 1 |
| `_colAll` | 11890 | 12 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `_colToolbarBtnHTML` | 11910 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `toggleColPop` | 11916 | 10 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `_p3FitToolbar` | 11939 | 37 | other / helpers |  |  |  |  |  | ● | 6 |
| `fits` | 11951 | 1 | other / helpers |  |  |  |  |  | ● | 4 |
| `_p3FitEditBar` | 11993 | 16 | other / helpers |  |  |  |  |  | ● | 1 |
| `_p3PalBtn` | 12010 | 9 | other / helpers |  |  |  |  |  | ● | 13 |
| `_moreBtnHint` | 12023 | 3 | other / helpers |  |  |  |  |  | ● | 1 |
| `_p3ActPalette` | 12026 | 48 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `_p3NtiPalette` | 12074 | 20 | tags / types / tabs | ● |  |  |  |  | ● | 0 |
| `_colTogglePreview` | 12094 | 5 | reminders / review | ● | ● |  |  |  | ● | 0 |
| `openHeadingStylesModal` | 12099 | 29 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `closeHeadingStylesModal` | 12128 | 1 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `resetHeadingStyles` | 12129 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `saveHeadingStyles` | 12136 | 11 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_pasteHasStructure` | 12154 | 8 | other / helpers |  |  |  |  |  | ● | 1 |
| `_openSmartPastePop` | 12163 | 33 | find / smart views |  |  |  |  |  | ● | 1 |
| `go` | 12184 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `_closeSmartPastePop` | 12197 | 5 | find / smart views |  |  |  |  |  | ● | 1 |
| `_cleanPasteHTML` | 12203 | 10 | other / helpers |  |  |  |  |  | ● | 2 |
| `_smartPasteHTML` | 12214 | 32 | find / smart views |  |  |  |  |  | ● | 1 |
| `_doPaste` | 12247 | 31 | other / helpers | ● | ● |  |  |  | ● | 4 |
| `getOutLinks` | 12285 | 8 | theme / appearance | ● |  |  |  |  | ● | 1 |
| `getBacklinks` | 12293 | 5 | theme / appearance | ● |  |  |  |  | ● | 1 |
| `_blSnippet` | 12298 | 13 | other / helpers |  |  |  |  |  | ● | 1 |
| `backlinksHTML` | 12311 | 17 | theme / appearance |  |  |  |  |  | ● | 3 |
| `refreshBacklinks` | 12329 | 10 | render | ● |  |  |  |  | ● | 2 |
| `upgradeViewCards` | 12342 | 30 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `closePastePop` | 12375 | 5 | menus / dialogs |  |  |  |  |  | ● | 6 |
| `openPastePop` | 12380 | 25 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `mk` | 12383 | 3 | other / helpers |  |  |  |  |  | ● | 18 |
| `go` | 12384 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `_ppOut` | 12405 | 3 | other / helpers |  |  |  |  |  | ● | 0 |
| `_caretXY` | 12409 | 8 | other / helpers |  |  |  |  |  | ● | 2 |
| `closeMenDD` | 12419 | 1 | other / helpers |  |  |  |  |  | ● | 8 |
| `_menQuery` | 12420 | 8 | find / smart views |  |  |  |  |  | ● | 2 |
| `showMenDD` | 12428 | 21 | other / helpers | ● |  |  |  |  | ● | 2 |
| `go` | 12440 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `insertMention` | 12449 | 10 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `edImgPick` | 12461 | 3 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `edLink` | 12464 | 6 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `edBookmarkBtn` | 12470 | 4 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `edMentionBtn` | 12474 | 1 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `flashSaved` | 12482 | 8 | other / helpers |  |  |  |  |  | ● | 2 |
| `_edAutoSave` | 12495 | 12 | editor / pop-out | ● | ● |  |  |  | ● | 4 |
| `_edBlocksInSel` | 12508 | 10 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `edBoundary` | 12519 | 10 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `edMarkDone` | 12530 | 10 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `edColorBtn` | 12544 | 7 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_clrPopAway` | 12551 | 6 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_closeColorPop` | 12557 | 1 | theme / appearance |  |  |  |  |  | ● | 2 |
| `_openColorPop` | 12558 | 31 | theme / appearance |  |  |  |  |  | ● | 1 |
| `sw` | 12562 | 11 | other / helpers |  |  |  |  |  | ● | 2 |
| `_applyColor` | 12589 | 16 | theme / appearance |  |  |  |  |  | ● | 0 |
| `_edColHeads` | 12616 | 9 | editor / pop-out |  |  |  |  |  | ● | 4 |
| `_edColClean` | 12626 | 5 | editor / pop-out |  |  |  |  |  | ● | 7 |
| `_edColApply` | 12632 | 32 | editor / pop-out | ● |  |  |  |  | ● | 5 |
| `_edColInit` | 12665 | 26 | editor / pop-out |  |  |  |  |  | ● | 8 |
| `_edRetag` | 12699 | 8 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edBlockDragStart` | 12707 | 11 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edDragPaint` | 12718 | 23 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `_edBlockDragMove` | 12741 | 24 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_edBlockDragEnd` | 12765 | 31 | editor / pop-out | ● |  |  |  |  | ● | 0 |
| `_edColToggle` | 12796 | 12 | editor / pop-out |  | ● |  |  |  | ● | 1 |
| `_edColAll` | 12808 | 12 | editor / pop-out |  | ● |  |  |  | ● | 0 |
| `_edColPreview` | 12820 | 7 | editor / pop-out | ● | ● |  |  |  | ● | 0 |
| `_edColSyncPrevBtn` | 12831 | 4 | editor / pop-out | ● |  |  |  |  | ● | 2 |
| `_edColToolbarHTML` | 12835 | 5 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `toggleEdColPop` | 12843 | 7 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `_rangeAtPoint` | 12853 | 6 | other / helpers |  |  |  |  |  |  | 0 |
| `_edVisKids` | 12888 | 5 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edNeedsLeadIn` | 12896 | 7 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edIsBlankLine` | 12905 | 5 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `_edBlankLine` | 12910 | 1 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `_edPutCaret` | 12911 | 6 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edRevealTail` | 12921 | 8 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edHeadChromeEnd` | 12932 | 9 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edPrefixText` | 12945 | 8 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `_edFixHeadCaret` | 12956 | 10 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `initRichPaste` | 12996 | 206 | other / helpers |  |  |  |  |  | ● | 1 |
| `markCards` | 12999 | 7 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `_flowTo` | 13075 | 8 | other / helpers |  |  |  |  |  | ● | 3 |
| `_endTouchDrag` | 13103 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_promptOpenLink` | 13212 | 10 | theme / appearance |  |  |  |  |  | ● | 3 |
| `mk` | 13217 | 1 | other / helpers |  |  |  |  |  | ● | 18 |
| `autoFit` | 13313 | 18 | other / helpers | ● |  |  |  |  | ● | 2 |
| `dStart` | 13336 | 9 | other / helpers | ● |  |  |  |  | ● | 0 |
| `dEnd` | 13346 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `artDStart` | 13354 | 10 | other / helpers | ● |  |  |  |  | ● | 0 |
| `artDEnd` | 13365 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `dOver` | 13375 | 31 | other / helpers | ● |  |  |  |  | ● | 0 |
| `dLeave` | 13407 | 3 | other / helpers |  |  |  |  |  | ● | 0 |
| `dDrop` | 13411 | 30 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `clearDI` | 13442 | 4 | other / helpers |  |  |  |  |  | ● | 7 |
| `doMoveFolder` | 13447 | 27 | organisation | ● | ● |  | ● |  | ● | 1 |
| `moveFolderToTop` | 13478 | 22 | organisation | ● | ● |  |  |  | ● | 0 |
| `offerRenumber` | 13502 | 31 | other / helpers |  |  |  |  |  | ● | 1 |
| `doRenumber` | 13534 | 20 | other / helpers |  | ● |  |  |  | ● | 0 |
| `toggleFolderStructured` | 13565 | 15 | organisation | ● | ● |  |  |  | ● | 0 |
| `openFieldBuilder` | 13580 | 6 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `_fieldBuilderHTML` | 13586 | 12 | calendar / journal / contacts / database |  |  |  |  |  | ● | 4 |
| `_fieldRowHTML` | 13598 | 10 | other / helpers |  |  |  |  |  | ● | 1 |
| `addFieldRow` | 13608 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `removeFieldRow` | 13616 | 8 | reminders / review | ● | ● |  |  |  | ● | 0 |
| `updField` | 13624 | 9 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_dbfFields` | 13708 | 1 | calendar / journal / contacts / database |  |  |  |  |  | ● | 7 |
| `_dbfFieldById` | 13709 | 1 | calendar / journal / contacts / database |  |  |  |  |  | ● | 6 |
| `_dbfCandidates` | 13711 | 5 | calendar / journal / contacts / database |  |  |  |  |  | ● | 4 |
| `_dbfReportUsable` | 13719 | 9 | calendar / journal / contacts / database |  |  |  |  |  | ● | 2 |
| `_dbfNum` | 13728 | 5 | calendar / journal / contacts / database |  |  |  |  |  | ● | 2 |
| `_dbfFmt` | 13733 | 5 | calendar / journal / contacts / database |  |  |  |  |  | ● | 3 |
| `_dbfVal` | 13739 | 6 | calendar / journal / contacts / database |  |  |  |  |  | ● | 3 |
| `_dbReportHTML` | 13750 | 15 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `wrap` | 13756 | 1 | other / helpers |  |  |  |  |  | ● | 6 |
| `_dbrTable` | 13765 | 23 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_dbrBreakdown` | 13788 | 15 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_dbrTotals` | 13803 | 13 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_dbrStatus` | 13816 | 25 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_dbrTimeline` | 13841 | 22 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_dbbShow` | 13874 | 5 | calendar / journal / contacts / database |  |  |  |  |  | ● | 3 |
| `openDbFolderBuilder` | 13879 | 6 | organisation | ● |  |  |  |  | ● | 0 |
| `newDbFolder` | 13885 | 14 | organisation | ● | ● |  |  |  | ● | 0 |
| `dbBuilderCancel` | 13902 | 13 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `dbBuilderDone` | 13915 | 11 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `_dbBuilderHTML` | 13926 | 60 | calendar / journal / contacts / database |  |  |  |  |  | ● | 3 |
| `_dbbFieldsHTML` | 13986 | 14 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_dbbFolder` | 14000 | 1 | organisation | ● |  |  |  |  | ● | 8 |
| `_dbbRefresh` | 14002 | 9 | calendar / journal / contacts / database |  |  |  |  |  | ● | 6 |
| `dbbSet` | 14011 | 7 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `dbbAddField` | 14018 | 6 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `dbbRemoveField` | 14024 | 9 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `dbbMoveField` | 14033 | 7 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `dbbUpdField` | 14040 | 11 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `dbbSetReport` | 14051 | 16 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `dbbApplyPreset` | 14070 | 26 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `showDbSecCtx` | 14101 | 20 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `newPlainDbFolder` | 14123 | 13 | organisation | ● | ● |  |  |  | ● | 0 |
| `autoNumberDbFolders` | 14138 | 11 | organisation | ● | ● |  |  |  | ● | 0 |
| `_structuredFolderOf` | 14150 | 3 | organisation | ● |  |  |  |  | ● | 1 |
| `fieldInputHTML` | 14153 | 24 | other / helpers |  |  |  |  |  | ● | 1 |
| `saveFieldValue` | 14177 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_fieldsPanelHTML` | 14185 | 12 | other / helpers |  |  |  |  |  | ● | 3 |
| `_fieldChipsHTML` | 14197 | 12 | other / helpers |  |  |  |  |  | ● | 1 |
| `_sha256Hex` | 14219 | 5 | other / helpers |  |  |  |  |  | ● | 2 |
| `setFolderPin` | 14224 | 15 | organisation | ● | ● |  |  |  | ● | 0 |
| `removeFolderPin` | 14239 | 9 | organisation | ● | ● |  | ● |  | ● | 0 |
| `_pinLockHTML` | 14248 | 10 | tags / types / tabs | ● |  |  |  |  | ● | 1 |
| `tryUnlockFolder` | 14258 | 15 | organisation | ● |  |  |  |  | ● | 0 |
| `_stripHistoryImages` | 14306 | 15 | other / helpers |  |  |  |  |  | ● | 2 |
| `_captureNoteHistory` | 14321 | 13 | other / helpers |  |  |  |  |  | ● | 8 |
| `_pruneNoteHistory` | 14334 | 15 | other / helpers |  |  |  |  |  | ● | 1 |
| `totalBytes` | 14339 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `_relTime` | 14349 | 13 | other / helpers |  |  |  |  |  | ● | 4 |
| `_nhReasonLabel` | 14362 | 3 | other / helpers |  |  |  |  |  | ● | 1 |
| `openNoteHistory` | 14365 | 14 | other / helpers |  |  |  |  |  | ● | 0 |
| `_cl` | 14376 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeNoteHistory` | 14379 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `previewNoteHistory` | 14380 | 1 | reminders / review |  |  |  |  |  | ● | 0 |
| `_nhBack` | 14381 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_nhSetMode` | 14382 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_diffTextify` | 14390 | 11 | other / helpers |  |  |  |  |  | ● | 1 |
| `_diffTokenize` | 14401 | 1 | other / helpers |  |  |  |  |  | ● | 2 |
| `_tokDiff` | 14402 | 21 | other / helpers |  |  |  |  |  | ● | 1 |
| `_renderDiffHTML` | 14423 | 8 | render |  |  |  |  |  | ● | 1 |
| `renderNoteHistoryBody` | 14431 | 39 | render | ● |  |  |  |  | ● | 4 |
| `restoreNoteHistory` | 14470 | 17 | destructive | ● | ● |  |  |  | ● | 0 |
| `_versionSiblings` | 14496 | 5 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_versionStripHTML` | 14501 | 16 | other / helpers |  |  |  |  |  | ● | 1 |
| `startVersioning` | 14517 | 11 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `addNewVersion` | 14528 | 24 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `showVersionCtx` | 14552 | 12 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `renameVersion` | 14564 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `setVersionIcon` | 14572 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `unlinkVersion` | 14580 | 7 | theme / appearance | ● | ● |  | ● |  | ● | 0 |
| `ensureQuickPhrases` | 14594 | 13 | other / helpers | ● |  |  |  |  | ● | 7 |
| `_qpTextToHTML` | 14607 | 3 | other / helpers |  |  |  |  |  | ● | 1 |
| `openQuickPhrasesMenu` | 14610 | 18 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `insertQuickPhrase` | 14628 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `openQuickPhrasesManager` | 14635 | 3 | other / helpers |  |  |  |  |  | ● | 0 |
| `_qpManagerHTML` | 14638 | 21 | other / helpers |  |  |  |  |  | ● | 4 |
| `addQuickPhrase` | 14659 | 11 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `updQuickPhrase` | 14670 | 5 | other / helpers |  | ● |  |  |  | ● | 0 |
| `deleteQuickPhrase` | 14675 | 6 | destructive | ● | ● |  |  |  | ● | 0 |
| `moveQuickPhrase` | 14681 | 9 | other / helpers |  | ● |  |  |  | ● | 0 |
| `_ktDefaultKhutbah` | 14708 | 37 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ktNormalize` | 14745 | 16 | other / helpers |  |  |  |  |  | ● | 2 |
| `ensureTemplates` | 14761 | 7 | other / helpers | ● |  |  |  |  | ● | 8 |
| `_ktGet` | 14768 | 1 | other / helpers |  |  |  |  |  | ● | 20 |
| `_ktFoldHTML` | 14771 | 9 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ktBarHTML` | 14783 | 9 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ktAyahHTML` | 14792 | 16 | other / helpers |  |  |  |  |  | ● | 2 |
| `ktBuildHTML` | 14808 | 36 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ktBtnHTML` | 14846 | 3 | other / helpers |  |  |  |  |  | ● | 2 |
| `openTemplatesMenu` | 14849 | 14 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `insertTemplate` | 14863 | 11 | other / helpers |  |  |  |  |  | ● | 0 |
| `_ktDirty` | 14876 | 4 | other / helpers |  |  |  |  |  | ● | 4 |
| `_ktToggleFold` | 14880 | 8 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ktFoldAll` | 14888 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ktRenumber` | 14895 | 9 | other / helpers |  |  |  |  |  | ● | 3 |
| `_ktTplFor` | 14906 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ktAddBlock` | 14913 | 12 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_ktDelBlock` | 14925 | 10 | destructive |  |  |  |  |  | ● | 1 |
| `_ktBlockText` | 14937 | 14 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ktCopyBlock` | 14951 | 38 | other / helpers |  |  |  |  |  | ● | 1 |
| `done` | 14963 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `fallback` | 14964 | 16 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ktRepair` | 14991 | 7 | other / helpers |  |  |  |  |  | ● | 3 |
| `_ktShow` | 15023 | 5 | other / helpers |  |  |  |  |  | ● | 7 |
| `openTemplatesManager` | 15028 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_ktMgrHTML` | 15029 | 25 | other / helpers |  |  |  |  |  | ● | 6 |
| `ktAddTemplate` | 15054 | 10 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktRestoreKhutbah` | 15064 | 9 | destructive | ● | ● |  |  |  | ● | 0 |
| `ktDuplicateTemplate` | 15073 | 10 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `ktDeleteTemplate` | 15083 | 6 | destructive | ● | ● |  |  |  | ● | 0 |
| `ktMoveTemplate` | 15089 | 7 | other / helpers |  | ● |  |  |  | ● | 0 |
| `openTemplateEditor` | 15098 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ktEdHTML` | 15099 | 94 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ktRedraw` | 15193 | 1 | other / helpers |  |  |  |  |  | ● | 12 |
| `ktSet` | 15194 | 2 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktSetAyah` | 15196 | 2 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktAddField` | 15198 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktSetField` | 15199 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktDelField` | 15200 | 1 | destructive |  | ● |  |  |  | ● | 0 |
| `ktMoveField` | 15201 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktAddLang` | 15202 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktSetLang` | 15203 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktDelLang` | 15204 | 1 | destructive |  | ● |  |  |  | ● | 0 |
| `ktMoveLang` | 15205 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktAddSec` | 15206 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktSetSec` | 15207 | 10 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktDelSec` | 15217 | 1 | destructive |  | ● |  |  |  | ● | 0 |
| `ktMoveSec` | 15218 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `_ktMoveIn` | 15219 | 5 | other / helpers |  |  |  |  |  | ● | 3 |
| `_injectHeadingStatusBadges` | 15242 | 28 | other / helpers | ● |  |  |  |  | ● | 1 |
| `showHeadingStatusMenu` | 15270 | 17 | menus / dialogs | ● |  |  |  |  |  | 0 |
| `setHeadingStatus` | 15287 | 8 | other / helpers | ● | ● |  |  |  | ● | 1 |
| `clearHeadingStatus` | 15295 | 7 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `promptCustomHeadingStatus` | 15302 | 11 | other / helpers | ● |  |  |  |  | ● | 0 |
| `logContactAction` | 15327 | 19 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `saveContactAction` | 15346 | 17 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `_renderActionLog` | 15363 | 22 | render |  |  |  |  |  | ● | 1 |
| `toggleActionDone` | 15385 | 13 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `deleteContactAction` | 15398 | 8 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `toggleP2HCardView` | 15406 | 4 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `toggleP2HTreeMode` | 15410 | 4 | organisation |  |  |  |  |  | ● | 0 |
| `togP2HTreeNode` | 15414 | 5 | organisation |  |  |  |  |  | ● | 0 |
| `p2hTreeExpandAll` | 15419 | 8 | organisation |  |  |  |  |  | ● | 0 |
| `p2hTreeCollapseAll` | 15427 | 4 | organisation |  |  |  |  |  | ● | 0 |
| `_folderTreeNodeHTML` | 15431 | 8 | organisation |  |  |  |  |  | ● | 2 |
| `_folderDescendantsHTML` | 15439 | 19 | organisation |  |  |  |  |  | ● | 1 |
| `_secNavHTML` | 15461 | 9 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_firstFolderOfSection` | 15472 | 3 | organisation | ● |  |  |  |  | ● | 3 |
| `gotoSection` | 15475 | 6 | organisation | ● |  |  |  |  | ● | 0 |
| `gotoAdjacentSection` | 15481 | 13 | organisation | ● |  |  |  |  | ● | 0 |
| `_folderFullTreeHTML` | 15494 | 16 | organisation | ● |  |  |  |  | ● | 1 |
| `_folderPathRowHTML` | 15510 | 21 | organisation | ● |  |  |  |  | ● | 1 |
| `_sfQtFolder` | 15571 | 10 | organisation | ● |  |  |  |  | ● | 2 |
| `_sfPathRowHTML` | 15582 | 22 | find / smart views |  |  |  |  |  | ● | 2 |
| `_sfGrpKeys` | 15605 | 6 | find / smart views |  |  |  |  |  | ● | 2 |
| `sfGrpExpandAll` | 15611 | 5 | find / smart views |  |  |  |  |  | ● | 0 |
| `sfGrpCollapseAll` | 15616 | 5 | find / smart views |  |  |  |  |  | ● | 0 |
| `_sfQtBarHTML` | 15643 | 16 | find / smart views |  |  |  |  |  | ● | 4 |
| `addStarterMyDatabaseFolders` | 15664 | 28 | organisation | ● | ● |  |  |  | ● | 0 |
| `mkFolder` | 15692 | 27 | organisation | ● | ● |  |  |  | ● | 2 |
| `rnFolder` | 15719 | 1 | organisation | ● | ● |  |  |  | ● | 1 |
| `rmFolder` | 15720 | 1 | organisation |  |  |  |  |  |  | 0 |
| `mkArt` | 15721 | 1 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `rmArt` | 15722 | 1 | other / helpers |  |  |  |  |  |  | 0 |
| `_buildFolderCtxMain` | 15725 | 35 | organisation | ● |  |  |  |  | ● | 2 |
| `showCtx` | 15760 | 12 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `_folderCtxBack` | 15772 | 3 | organisation |  |  |  |  |  | ● | 0 |
| `_folderCtxSub` | 15775 | 7 | organisation |  |  |  |  |  | ● | 0 |
| `hideCtx` | 15786 | 1 | menus / dialogs |  |  |  |  |  | ● | 54 |
| `moveToMyJournal` | 15787 | 7 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `offerRenumberManual` | 15794 | 4 | other / helpers | ● |  |  |  |  | ● | 0 |
| `stripNumPrefix` | 15802 | 6 | other / helpers |  |  |  |  |  | ● | 4 |
| `getHierNum` | 15814 | 13 | other / helpers | ● |  |  |  |  | ● | 3 |
| `autoNumberAll` | 15829 | 25 | other / helpers | ● | ● |  |  |  | ● | 2 |
| `offerAutoNumber` | 15856 | 23 | other / helpers | ● |  |  |  |  | ● | 2 |
| `showModal` | 15881 | 8 | menus / dialogs |  |  |  |  |  | ● | 39 |
| `closeModal` | 15893 | 1 | menus / dialogs |  |  |  |  |  | ● | 15 |
| `_mbSaveGeom` | 15910 | 10 | other / helpers |  | ● |  |  |  | ● | 2 |
| `_mbLoadGeom` | 15920 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `showResizableModal` | 15929 | 39 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `_mbDragStart` | 15970 | 16 | other / helpers |  |  |  |  |  | ● | 0 |
| `_mbDragMove` | 15986 | 9 | other / helpers |  |  |  |  |  | ● | 0 |
| `_mbDragStop` | 15995 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `_mbResizeStart` | 16003 | 15 | other / helpers |  |  |  |  |  | ● | 0 |
| `_mbResizeMove` | 16018 | 16 | other / helpers |  |  |  |  |  | ● | 0 |
| `_mbResizeStop` | 16034 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `openModal` | 16041 | 35 | menus / dialogs | ● |  |  |  |  | ● | 2 |
| `confirmDel` | 16076 | 8 | other / helpers | ● |  |  |  |  | ● | 0 |
| `_pkArtsOf` | 16109 | 1 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_pkFileRowHTML` | 16110 | 14 | other / helpers |  |  |  |  |  | ● | 1 |
| `_pkRowHTML` | 16124 | 32 | other / helpers |  |  |  |  |  | ● | 1 |
| `_pkTreeHTML` | 16156 | 6 | organisation |  |  |  |  |  | ● | 4 |
| `openPicker` | 16162 | 19 | menus / dialogs | ● |  |  |  |  | ● | 1 |
| `_pkSaveScope` | 16192 | 19 | other / helpers |  | ● |  |  |  | ● | 1 |
| `_pkLoadScope` | 16211 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `_pkResumeBrowse` | 16223 | 36 | other / helpers | ● |  |  |  |  | ● | 1 |
| `openFolderPopupFromToolbar` | 16259 | 21 | organisation | ● |  |  |  |  | ● | 0 |
| `openSectionPopout` | 16284 | 8 | organisation | ● |  |  |  |  | ● | 1 |
| `openFolderPopout` | 16293 | 8 | organisation | ● |  |  |  |  | ● | 0 |
| `_pkCurrentBrowseRoots` | 16301 | 5 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_pkCurrentSectionId` | 16309 | 8 | organisation |  |  |  |  |  | ● | 3 |
| `_pkFontClampSize` | 16327 | 4 | other / helpers |  |  |  |  |  | ● | 4 |
| `_pkFontLoad` | 16331 | 10 | other / helpers |  |  |  |  |  | ● | 3 |
| `_pkFontSave` | 16341 | 1 | other / helpers |  | ● |  |  |  | ● | 2 |
| `_pkApplyFont` | 16344 | 12 | other / helpers |  |  |  |  |  | ● | 5 |
| `_pkFontSet` | 16359 | 15 | other / helpers |  |  |  |  |  | ● | 4 |
| `pkFontSize` | 16374 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkFontStep` | 16375 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkFontBold` | 16376 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkFontColor` | 16377 | 1 | theme / appearance |  |  |  |  |  | ● | 1 |
| `pkFontPalette` | 16380 | 4 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `pkFontReset` | 16384 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkFontMenu` | 16395 | 49 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_pkSecNavHTML` | 16457 | 17 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_pkRenderScopeBody` | 16475 | 7 | other / helpers |  |  |  |  |  | ● | 3 |
| `_pkAllSectionsHTML` | 16485 | 18 | organisation | ● |  |  |  |  | ● | 1 |
| `_pkAllSmartHTML` | 16510 | 7 | find / smart views |  |  |  |  |  | ● | 1 |
| `pkToggleAllSec` | 16517 | 5 | other / helpers |  |  |  |  |  | ● | 0 |
| `_pkSetFolderControlsVisible` | 16524 | 4 | organisation |  |  |  |  |  | ● | 4 |
| `_pkSwitchToSection` | 16533 | 13 | organisation | ● |  |  |  |  | ● | 1 |
| `_pkSwitchToScopeKind` | 16548 | 14 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_pkRefreshSecNav` | 16562 | 4 | other / helpers |  |  |  |  |  | ● | 3 |
| `pkGotoSection` | 16566 | 10 | organisation |  |  |  |  |  | ● | 1 |
| `_pkNavStops` | 16578 | 4 | other / helpers | ● |  |  |  |  | ● | 1 |
| `pkGotoAdjacentSection` | 16582 | 9 | organisation |  |  |  |  |  | ● | 0 |
| `_pkSmartListHTML` | 16593 | 11 | find / smart views |  |  |  |  |  | ● | 2 |
| `_pkTagsListHTML` | 16604 | 9 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_pkKindsListHTML` | 16613 | 14 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `pkNavScope` | 16629 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `_pkOpenBrowse` | 16635 | 20 | other / helpers |  |  |  |  |  | ● | 3 |
| `pkNavigateFolder` | 16655 | 4 | organisation |  |  |  |  |  |  | 0 |
| `_pkRow` | 16659 | 1 | other / helpers |  |  |  |  |  | ● | 9 |
| `_pkRebuildList` | 16664 | 18 | other / helpers | ● |  |  |  |  | ● | 9 |
| `_pkApplyVis` | 16682 | 29 | other / helpers |  |  |  |  |  | ● | 5 |
| `togglePickExp` | 16711 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `_pkFilter` | 16719 | 22 | find / smart views |  |  |  |  |  | ● | 4 |
| `_pkGlobalSearchHTML` | 16748 | 60 | find / smart views | ● |  |  |  |  | ● | 1 |
| `grpHd` | 16761 | 1 | other / helpers |  |  |  |  |  | ● | 5 |
| `_pkPathWithSection` | 16813 | 6 | organisation | ● |  |  |  |  | ● | 2 |
| `_pkSwitchToFolder` | 16822 | 14 | organisation | ● |  |  |  |  | ● | 0 |
| `togglePick` | 16836 | 14 | other / helpers | ● |  |  |  |  |  | 0 |
| `_pkUpdateTargetLabel` | 16852 | 12 | other / helpers | ● |  |  |  |  | ● | 5 |
| `pkRowMenu` | 16870 | 9 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `pkNoteRowMenu` | 16879 | 8 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `pkSetTarget` | 16887 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkClearTarget` | 16894 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `pkRename` | 16901 | 7 | other / helpers | ● |  |  |  |  | ● | 0 |
| `pkRenameSave` | 16908 | 10 | other / helpers | ● |  |  |  |  | ● | 0 |
| `pkRenameCancel` | 16918 | 7 | other / helpers | ● |  |  |  |  | ● | 0 |
| `pkDelete` | 16925 | 14 | destructive | ● |  |  |  |  | ● | 0 |
| `pkDStart` | 16939 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkDEnd` | 16945 | 5 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkDOver` | 16950 | 19 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkDLeave` | 16969 | 3 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkDDrop` | 16972 | 17 | other / helpers |  |  |  |  |  | ● | 0 |
| `_pkClearDI` | 16989 | 5 | other / helpers |  |  |  |  |  | ● | 7 |
| `pkMoveFolder` | 16998 | 23 | organisation | ● | ● |  | ● |  | ● | 1 |
| `pkNoteOpen` | 17025 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkNoteDStart` | 17029 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkNoteDEnd` | 17035 | 5 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkMoveNote` | 17042 | 16 | other / helpers | ● | ● |  |  |  | ● | 1 |
| `pkNoteRename` | 17058 | 7 | other / helpers | ● |  |  |  |  | ● | 0 |
| `pkNoteRenameSave` | 17065 | 14 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `pkNoteRenameCancel` | 17079 | 7 | other / helpers | ● |  |  |  |  | ● | 0 |
| `pkNoteDelete` | 17086 | 6 | destructive | ● |  |  |  |  | ● | 0 |
| `mobBack` | 17094 | 1 | other / helpers |  |  |  |  |  |  | 0 |
| `tapCtx` | 17095 | 6 | menus / dialogs |  |  |  |  |  |  | 0 |
| `getAllTags` | 17105 | 8 | tags / types / tabs | ● |  |  |  |  | ● | 5 |
| `selTag` | 17114 | 7 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `toggleTagPanel` | 17122 | 4 | tags / types / tabs |  |  |  |  |  |  | 0 |
| `backToMyWallCat` | 17131 | 5 | other / helpers |  |  |  |  |  | ● | 0 |
| `selKind` | 17136 | 7 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `toggleNtiSection` | 17143 | 1 | organisation |  |  |  |  |  | ● | 0 |
| `togNtiCatSB` | 17144 | 1 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `renderNTISection` | 17145 | 51 | render | ● |  |  |  |  | ● | 1 |
| `renderTagPanel` | 17197 | 17 | render |  |  |  |  |  | ● | 1 |
| `renderTagEditor` | 17215 | 15 | render |  |  |  |  |  | ● | 4 |
| `_allTags` | 17234 | 5 | tags / types / tabs | ● |  |  |  |  | ● | 1 |
| `showTagSuggest` | 17239 | 10 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_tagSuggestPlace` | 17254 | 9 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `hideTagSuggest` | 17263 | 3 | tags / types / tabs |  |  |  |  |  | ● | 3 |
| `_pickTagSuggestion` | 17266 | 6 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `addTag` | 17273 | 11 | tags / types / tabs |  |  |  |  |  | ● | 3 |
| `rmTag` | 17285 | 5 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `tagKey` | 17291 | 7 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `tagInputChanged` | 17304 | 12 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `hexDarken` | 17334 | 5 | other / helpers |  |  |  |  |  | ● | 7 |
| `hexLighten` | 17339 | 5 | other / helpers |  |  |  |  |  | ● | 4 |
| `_sbLum` | 17355 | 14 | other / helpers |  |  |  |  |  | ● | 6 |
| `f` | 17366 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `applySidebarInk` | 17369 | 22 | theme / appearance |  |  |  |  |  | ● | 1 |
| `set` | 17375 | 1 | other / helpers |  |  |  |  |  | ● | 30 |
| `_paneSafePaper` | 17412 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `_paneInk` | 17419 | 6 | theme / appearance |  |  |  |  |  | ● | 4 |
| `_accentInk` | 17427 | 14 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `worst` | 17437 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `applyPaneInk` | 17441 | 40 | theme / appearance |  |  |  |  |  | ● | 1 |
| `set` | 17444 | 1 | other / helpers |  |  |  |  |  | ● | 30 |
| `applyTheme` | 17481 | 29 | theme / appearance |  |  |  |  |  | ● | 6 |
| `applyPreset` | 17511 | 7 | theme / appearance | ● |  |  |  |  | ● | 0 |
| `setCustomColor` | 17519 | 18 | theme / appearance | ● |  |  |  |  | ● | 2 |
| `setCustomColorHex` | 17538 | 6 | theme / appearance |  |  |  |  |  | ● | 0 |
| `resetTheme` | 17545 | 6 | theme / appearance | ● |  |  |  |  | ● | 0 |
| `openTheme` | 17552 | 5 | theme / appearance |  |  |  |  |  | ● | 0 |
| `closeTheme` | 17558 | 3 | theme / appearance |  |  |  |  |  | ● | 0 |
| `renderThemeModal` | 17562 | 107 | render | ● |  |  |  |  | ● | 8 |
| `ctxColorSwatches` | 17672 | 8 | theme / appearance | ● |  |  |  |  | ● | 1 |
| `setFolderColor` | 17681 | 9 | organisation | ● | ● |  | ● |  | ● | 1 |
| `setFolderBold` | 17690 | 7 | organisation | ● | ● |  | ● |  | ● | 0 |
| `renderSection` | 17702 | 23 | render | ● |  |  |  |  | ● | 1 |
| `toggleSection` | 17727 | 12 | organisation | ● |  |  |  |  | ● | 0 |
| `addFolderInSec` | 17741 | 4 | organisation |  |  |  |  |  | ● | 0 |
| `addRootFolder` | 17747 | 4 | organisation |  |  |  |  |  | ● | 0 |
| `ctxSecColorSwatches` | 17754 | 8 | theme / appearance | ● |  |  |  |  | ● | 1 |
| `setSectionColor` | 17762 | 7 | organisation | ● | ● |  | ● |  | ● | 1 |
| `setSectionBold` | 17769 | 7 | organisation | ● | ● |  | ● |  | ● | 0 |
| `_uiStamp` | 17784 | 1 | cloud sync / auth |  |  |  |  |  | ● | 5 |
| `ctxSfColorSwatches` | 17785 | 10 | find / smart views |  |  |  |  |  | ● | 1 |
| `setSmartViewColor` | 17795 | 9 | find / smart views |  | ● |  |  |  | ● | 0 |
| `showSmartViewCtx` | 17804 | 15 | find / smart views |  |  |  |  |  | ● | 1 |
| `toggleSmartViews` | 17819 | 6 | find / smart views |  |  |  |  |  | ● | 0 |
| `startRenSmartViews` | 17825 | 9 | find / smart views |  |  |  |  |  | ● | 0 |
| `finRenSmartViews` | 17834 | 7 | find / smart views |  | ● |  |  |  | ● | 0 |
| `_buildSecCtxMain` | 17842 | 15 | menus / dialogs | ● |  |  |  |  | ● | 2 |
| `showSecCtx` | 17857 | 11 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_secCtxBack` | 17868 | 3 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_secCtxSub` | 17871 | 7 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `startRenSec` | 17880 | 9 | other / helpers | ● |  |  |  |  | ● | 0 |
| `finRenSec` | 17890 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `mkSection` | 17900 | 8 | organisation | ● | ● |  |  |  | ● | 0 |
| `delSection` | 17910 | 8 | organisation | ● | ● |  |  |  | ● | 0 |
| `moveFolderToSec` | 17920 | 6 | organisation | ● | ● |  |  |  | ● | 0 |
| `rootSectionMoves` | 17928 | 7 | organisation | ● |  |  |  |  | ● | 1 |
| `_isSysFolder` | 17943 | 9 | organisation | ● |  |  |  |  | ● | 4 |
| `convertFolderToSection` | 17952 | 22 | organisation | ● |  |  |  |  | ● | 0 |
| `_moveNotesThenConvert` | 17974 | 17 | other / helpers | ● |  |  |  |  | ● | 0 |
| `_doFolderToSection` | 17991 | 18 | organisation | ● | ● |  |  |  | ● | 1 |
| `sectionToFolderRows` | 18009 | 6 | organisation | ● |  |  |  |  | ● | 1 |
| `confirmSectionToFolder` | 18015 | 10 | organisation | ● |  |  |  |  | ● | 0 |
| `_doSectionToFolder` | 18025 | 16 | organisation | ● | ● |  | ● |  | ● | 0 |
| `secDStart` | 18045 | 9 | other / helpers |  |  |  |  |  | ● | 0 |
| `secDEnd` | 18055 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `secDOver` | 18062 | 10 | other / helpers |  |  |  |  |  | ● | 0 |
| `secDLeave` | 18073 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `secDDrop` | 18080 | 17 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `snapshotState` | 18101 | 7 | persistence |  |  |  |  |  | ● | 2 |
| `undo` | 18109 | 9 | other / helpers | ● | ● |  | ● |  | ● | 1 |
| `redo` | 18119 | 9 | other / helpers | ● | ● |  | ● |  | ● | 1 |
| `updateUndoRedoBtns` | 18129 | 5 | other / helpers |  |  |  |  |  | ● | 3 |
| `_addTombstones` | 18143 | 10 | cloud sync / auth |  |  |  |  |  | ● | 6 |
| `_tombstoneTrashEntry` | 18156 | 10 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `trashFolder` | 18166 | 28 | organisation | ● | ● |  |  |  | ● | 3 |
| `trashArt` | 18195 | 11 | destructive | ● | ● |  |  |  | ● | 2 |
| `openTrash` | 18207 | 5 | destructive |  |  |  |  |  | ● | 0 |
| `closeTrash` | 18213 | 3 | destructive |  |  |  |  |  | ● | 0 |
| `renderTrashModal` | 18217 | 31 | render | ● |  |  |  |  | ● | 5 |
| `restoreItem` | 18249 | 52 | destructive | ● | ● |  |  |  | ● | 0 |
| `permDeleteItem` | 18302 | 6 | destructive | ● | ● |  |  |  | ● | 0 |
| `emptyTrash` | 18309 | 8 | destructive | ● | ● |  | ● |  | ● | 0 |
| `_popCleanupOrphans` | 18320 | 15 | menus / dialogs | ● |  |  | ● |  | ● | 1 |
| `updateTrashBtn` | 18336 | 6 | destructive | ● |  |  |  |  | ● | 4 |
| `_ctxIsCard` | 18362 | 1 | menus / dialogs |  |  |  |  |  | ● | 3 |
| `showArtCtx` | 18364 | 20 | menus / dialogs | ● |  |  |  |  | ● | 1 |
| `_ctxPlaceCard` | 18387 | 8 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `_ctxRepaint` | 18398 | 1 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `_artCtxGroups` | 18410 | 37 | organisation |  |  |  |  |  | ● | 1 |
| `sub` | 18413 | 1 | other / helpers |  |  |  |  |  | ● | 5 |
| `_buildArtCtxMain` | 18447 | 6 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `_ctxBack` | 18453 | 6 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `_ctxSub` | 18459 | 49 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `detachArt` | 18510 | 16 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `openAttachArt` | 18528 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `showArtFolderPicker` | 18530 | 35 | organisation | ● |  |  |  |  | ● | 3 |
| `rows` | 18535 | 12 | other / helpers |  |  |  |  |  | ● | 3 |
| `createFolderFromPicker` | 18568 | 34 | organisation | ● | ● |  |  |  | ● | 0 |
| `fpFilter` | 18605 | 32 | find / smart views | ● |  |  |  |  | ● | 0 |
| `rows2` | 18611 | 11 | other / helpers |  |  |  |  |  | ● | 1 |
| `toggleArtFolder` | 18639 | 17 | organisation | ● | ● |  |  |  | ● | 0 |
| `applyFontSizes` | 18663 | 10 | other / helpers |  |  |  |  |  | ● | 3 |
| `r` | 18667 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `applyLineSpacing` | 18676 | 6 | other / helpers |  |  |  |  |  | ● | 2 |
| `setLineSpacing` | 18682 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `setFontSize` | 18692 | 9 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `resetFontSizes` | 18703 | 7 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `enableAutoSave` | 18730 | 37 | other / helpers |  |  |  |  |  | ● | 0 |
| `_writeToFile` | 18769 | 18 | other / helpers |  |  |  |  | ● | ● | 3 |
| `scheduleAutoSave` | 18792 | 7 | other / helpers |  |  |  |  |  | ● | 2 |
| `updateSaveUI` | 18801 | 30 | other / helpers |  |  |  |  |  | ● | 8 |
| `_bkCfg` | 18877 | 7 | other / helpers |  |  |  |  |  | ● | 8 |
| `_bkSaveCfg` | 18884 | 3 | other / helpers |  | ● |  |  |  | ● | 5 |
| `_bkIdb` | 18889 | 8 | other / helpers |  |  |  |  |  | ● | 3 |
| `_bkPutHandle` | 18897 | 8 | other / helpers |  |  |  |  |  | ● | 1 |
| `_bkGetHandle` | 18905 | 10 | other / helpers |  |  |  |  |  | ● | 2 |
| `_bkClearHandle` | 18915 | 9 | other / helpers |  |  |  |  |  | ● | 1 |
| `_bkStamp` | 18926 | 4 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `p` | 18927 | 1 | other / helpers |  |  |  |  |  | ● | 8 |
| `_bkFileName` | 18932 | 5 | other / helpers |  |  |  |  |  | ● | 2 |
| `p` | 18933 | 1 | other / helpers |  |  |  |  |  | ● | 8 |
| `_bkDue` | 18937 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `_bkAgeDays` | 18944 | 4 | other / helpers |  |  |  |  |  | ● | 2 |
| `_bkPrune` | 18954 | 23 | other / helpers |  |  |  |  |  | ● | 1 |
| `runBackupNow` | 18982 | 33 | export / import / backup |  | ● |  |  | ● | ● | 2 |
| `chooseBackupFolder` | 19018 | 11 | export / import / backup |  |  |  |  |  | ● | 1 |
| `turnOffBackups` | 19030 | 6 | export / import / backup |  |  |  |  |  | ● | 0 |
| `setBackupEvery` | 19037 | 3 | export / import / backup |  |  |  |  |  | ● | 0 |
| `downloadDatedBackup` | 19044 | 14 | export / import / backup |  | ● |  |  | ● | ● | 1 |
| `_bkMaybeAuto` | 19062 | 21 | other / helpers |  |  |  |  |  | ● | 1 |
| `_bkStatusHTML` | 19085 | 22 | other / helpers |  |  |  |  |  | ● | 3 |
| `sel` | 19091 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `_bkRenderStatus` | 19107 | 4 | other / helpers |  |  |  |  |  | ● | 5 |
| `openBackupModal` | 19111 | 31 | export / import / backup |  |  |  |  |  | ● | 0 |
| `getTimestampedName` | 19145 | 6 | cloud sync / auth |  |  |  |  |  | ● | 2 |
| `_sbDDFit` | 19159 | 20 | other / helpers |  |  |  |  |  | ● | 3 |
| `toggleSBMenu` | 19180 | 6 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `closeSBMenu` | 19186 | 3 | menus / dialogs |  |  |  |  |  | ● | 5 |
| `toggleSBTools` | 19190 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeSBTools` | 19196 | 3 | other / helpers |  |  |  |  |  | ● | 3 |
| `toggleSBHome` | 19202 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeSBHome` | 19208 | 3 | other / helpers |  |  |  |  |  | ● | 4 |
| `openLegacyApp` | 19215 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `artSnippet` | 19227 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `artCard` | 19235 | 31 | menus / dialogs |  |  |  |  |  | ● | 18 |
| `toggleListView` | 19268 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `adjustP3Layout` | 19286 | 15 | other / helpers |  |  |  |  |  | ● | 10 |
| `openP2` | 19303 | 5 | other / helpers |  |  |  |  |  | ● | 2 |
| `closeP2` | 19308 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `_dedupePrimaryFolders` | 19331 | 37 | organisation | ● | ● |  |  |  | ● | 2 |
| `noteCount` | 19340 | 1 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_openNewNoteWindow` | 19386 | 15 | other / helpers |  |  |  |  |  | ● | 6 |
| `quickCapture` | 19401 | 26 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `quickCaptureWithKind` | 19432 | 22 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `backFromP3` | 19458 | 5 | other / helpers |  |  |  |  |  | ● | 1 |
| `showPane` | 19468 | 16 | other / helpers |  |  |  |  |  | ● | 23 |
| `_getOrCreateFirebaseApp` | 19523 | 7 | cloud sync / auth |  |  | ● |  |  | ● | 3 |
| `initAuth` | 19531 | 51 | cloud sync / auth |  |  | ● |  |  | ● | 2 |
| `doLogin` | 19583 | 12 | other / helpers |  |  | ● |  |  | ● | 0 |
| `refreshApp` | 19597 | 10 | render |  |  |  |  |  | ● | 0 |
| `doSignOut` | 19608 | 15 | cloud sync / auth |  |  |  |  |  | ● | 0 |
| `getSyncConfig` | 19624 | 1 | other / helpers |  |  |  |  |  | ● | 9 |
| `_saveSyncConfig` | 19625 | 1 | persistence |  | ● |  |  |  | ● | 1 |
| `clearSyncConfig` | 19626 | 1 | other / helpers |  | ● |  |  |  | ● | 2 |
| `setSyncStatus` | 19628 | 15 | other / helpers |  |  |  |  |  | ● | 22 |
| `_loadScript` | 19644 | 8 | other / helpers |  |  |  |  |  | ● | 6 |
| `_syncErrorToast` | 19672 | 21 | cloud sync / auth |  |  |  |  |  | ● | 5 |
| `initSync` | 19694 | 91 | other / helpers |  |  | ● |  |  | ● | 3 |
| `syncNow` | 19787 | 36 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `_mergeById` | 19824 | 16 | cloud sync / auth |  |  |  |  |  | ● | 3 |
| `_mergeTabStamps` | 19841 | 11 | cloud sync / auth |  |  |  |  |  | ● | 2 |
| `norm` | 19842 | 1 | other / helpers |  |  |  |  |  | ● | 18 |
| `_mergeTabMaps` | 19859 | 18 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `norm` | 19860 | 1 | other / helpers |  |  |  |  |  | ● | 18 |
| `_mergeStrs` | 19877 | 1 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `_mergeMapById` | 19893 | 13 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `norm` | 19894 | 1 | other / helpers |  |  |  |  |  | ● | 18 |
| `_mergeStampMap` | 19907 | 6 | cloud sync / auth |  |  |  |  |  | ● | 2 |
| `norm` | 19908 | 1 | other / helpers |  |  |  |  |  | ● | 18 |
| `_mergeValMap` | 19916 | 9 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `norm` | 19917 | 1 | other / helpers |  |  |  |  |  | ● | 18 |
| `mergeDB` | 19925 | 63 | cloud sync / auth |  |  |  |  |  | ● | 3 |
| `_tadd` | 19965 | 1 | other / helpers |  |  |  |  |  | ● | 4 |
| `_alive` | 19975 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_b64enc` | 19989 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `_b64dec` | 19990 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `_syncSleep` | 19992 | 1 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `_syncSig` | 19998 | 5 | cloud sync / auth |  |  |  |  |  | ● | 2 |
| `_flushAllEditors` | 20013 | 9 | other / helpers |  |  |  |  |  | ● | 5 |
| `_edCleanHTML` | 20025 | 6 | editor / pop-out |  |  |  |  |  | ● | 5 |
| `_edApplyRemote` | 20042 | 38 | editor / pop-out | ● |  |  |  |  | ● | 1 |
| `put` | 20045 | 18 | other / helpers |  |  |  |  |  | ● | 3 |
| `_readCloudDB` | 20089 | 34 | cloud sync / auth |  |  | ● |  |  | ● | 2 |
| `_writeCloudDB` | 20123 | 9 | cloud sync / auth |  |  | ● |  |  | ● | 2 |
| `_doPush` | 20152 | 44 | other / helpers |  | ● |  |  |  | ● | 1 |
| `pushToCloud` | 20197 | 9 | cloud sync / auth |  |  |  |  |  | ● | 6 |
| `flushPendingPush` | 20211 | 5 | other / helpers |  |  |  |  |  | ● | 3 |
| `_preferStreaming` | 20233 | 3 | other / helpers |  |  |  |  |  | ● | 1 |
| `_noteTransportFailure` | 20240 | 5 | other / helpers |  |  |  |  |  | ● | 1 |
| `_reconcileNow` | 20265 | 27 | other / helpers |  |  |  |  |  | ● | 2 |
| `_startReconcile` | 20292 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `_scheduleListenerRestart` | 20301 | 11 | other / helpers |  |  | ● |  |  | ● | 1 |
| `_pullRemote` | 20313 | 83 | reminders / review | ● | ● |  | ● |  | ● | 2 |
| `generateNotebookId` | 20398 | 3 | other / helpers |  |  |  |  | ● | ● | 2 |
| `_syncAgo` | 20408 | 9 | cloud sync / auth |  |  |  |  |  | ● | 2 |
| `_syncDiagnosticsHTML` | 20417 | 21 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `openSyncModal` | 20438 | 61 | menus / dialogs |  |  | ● |  |  | ● | 0 |
| `closeSyncModal` | 20500 | 1 | menus / dialogs |  |  |  |  |  | ● | 3 |
| `parseFirebaseConfig` | 20502 | 17 | cloud sync / auth |  |  | ● |  |  | ● | 1 |
| `connectSync` | 20520 | 18 | other / helpers |  |  | ● |  |  | ● | 0 |
| `loginResetSync` | 20539 | 10 | other / helpers |  |  |  |  |  | ● | 0 |
| `disconnectSync` | 20550 | 10 | other / helpers |  |  |  |  |  | ● | 0 |
| `_uiTier` | 20626 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `_normalizePaneState` | 20635 | 17 | other / helpers |  |  |  |  |  | ● | 1 |
| `_onViewportResize` | 20653 | 47 | other / helpers |  |  |  |  |  | ● | 0 |
| `_sbFitHeader` | 20714 | 9 | other / helpers |  |  |  |  |  | ● | 3 |
| `sfOrdered` | 20761 | 8 | find / smart views |  |  |  |  |  | ● | 7 |
| `moveSfItem` | 20769 | 12 | find / smart views |  | ● |  |  |  | ● | 0 |
| `ensureNoteKinds` | 20804 | 6 | tags / types / tabs |  |  |  |  |  | ● | 7 |
| `noteKinds` | 20810 | 1 | tags / types / tabs |  |  |  |  |  | ● | 19 |
| `ensureNoteKindCats` | 20811 | 6 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `noteKindCats` | 20817 | 1 | tags / types / tabs |  |  |  |  |  | ● | 17 |
| `kindsInCat` | 20818 | 1 | tags / types / tabs |  |  |  |  |  | ● | 4 |
| `kindById` | 20819 | 1 | tags / types / tabs |  |  |  |  |  | ● | 9 |
| `artKinds` | 20820 | 4 | tags / types / tabs |  |  |  |  |  | ● | 19 |
| `artKind` | 20824 | 1 | tags / types / tabs |  |  |  |  |  |  | 0 |
| `untouchedDays` | 20825 | 4 | other / helpers |  |  |  |  |  | ● | 3 |
| `isNagNote` | 20830 | 2 | other / helpers |  |  |  |  |  | ● | 1 |
| `isMyWallNote` | 20833 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_flushEd` | 20842 | 13 | other / helpers | ● |  |  |  |  | ● | 8 |
| `setNoteKind` | 20855 | 6 | tags / types / tabs | ● | ● |  |  |  |  | 0 |
| `toggleNoteKind` | 20861 | 12 | tags / types / tabs | ● | ● |  | ● |  | ● | 0 |
| `finishNote` | 20873 | 7 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `unfinishNote` | 20880 | 6 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `addNoteKindTab` | 20886 | 13 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `order` | 20893 | 1 | other / helpers |  |  |  |  |  |  | 0 |
| `renameNoteKind` | 20899 | 10 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `kindBarHTML` | 20911 | 50 | tags / types / tabs |  |  |  |  |  | ● | 4 |
| `_attachCount` | 20964 | 3 | other / helpers |  |  |  |  |  | ● | 4 |
| `mwCatIsOpen` | 20970 | 4 | other / helpers | ● |  |  |  |  | ● | 2 |
| `mwToggleAllCats` | 20974 | 10 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `mwToggleViewMode` | 20984 | 6 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `renderMyWall` | 20990 | 92 | render | ● |  |  |  |  | ● | 1 |
| `_kindLatest` | 21024 | 1 | tags / types / tabs |  |  |  |  |  | ● | 4 |
| `_sortKinds` | 21025 | 4 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `isJournal` | 21086 | 9 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `getSmartGroups` | 21097 | 61 | organisation | ● |  |  |  |  | ● | 4 |
| `ts` | 21099 | 1 | other / helpers |  |  |  |  |  | ● | 12 |
| `sod` | 21100 | 1 | other / helpers |  |  |  |  |  | ● | 2 |
| `togSfGrp` | 21158 | 6 | find / smart views |  |  |  |  |  | ● | 0 |
| `togMwCat` | 21164 | 5 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallCatDStart` | 21176 | 10 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallCatDEnd` | 21186 | 5 | other / helpers |  |  |  |  |  | ● | 1 |
| `wallCatDOver` | 21191 | 9 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallCatDLeave` | 21200 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallCatDDrop` | 21204 | 30 | other / helpers |  | ● |  |  |  | ● | 0 |
| `wallGrpDStart` | 21234 | 9 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallGrpDEnd` | 21243 | 5 | other / helpers |  |  |  |  |  | ● | 3 |
| `wallGrpDOver` | 21248 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallGrpDLeave` | 21256 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallGrpDDrop` | 21260 | 18 | other / helpers |  | ● |  |  |  | ● | 0 |
| `moveWallKind` | 21278 | 10 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `showWallKindCtx` | 21288 | 23 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_groupUnion` | 21311 | 6 | organisation |  |  |  |  |  | ● | 1 |
| `getSmartArts` | 21318 | 32 | find / smart views | ● |  |  |  |  | ● | 6 |
| `renderSmartSection` | 21351 | 31 | render |  |  |  |  |  | ● | 1 |
| `toggleFav` | 21383 | 9 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `togglePin` | 21393 | 9 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `promptAddArtTag` | 21404 | 56 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `applyTag` | 21406 | 14 | tags / types / tabs |  | ● |  |  |  |  | 0 |
| `tagPickerRender` | 21420 | 29 | tags / types / tabs | ● |  |  |  |  | ● | 4 |
| `tagPickerRender` | 21460 | 28 | tags / types / tabs | ● |  |  |  |  | ● | 4 |
| `tagPickerApply` | 21488 | 16 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `removeArtTag` | 21504 | 9 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `showSfItemCtx` | 21513 | 18 | find / smart views |  |  |  |  |  | ● | 1 |
| `renameSfItem` | 21531 | 11 | find / smart views |  |  |  |  |  | ● | 0 |
| `finRenameSfItem` | 21542 | 5 | find / smart views |  | ● |  |  |  | ● | 0 |
| `setSfItemColor` | 21547 | 7 | find / smart views |  | ● |  |  |  | ● | 1 |
| `ctxSfItemColorSwatches` | 21554 | 8 | find / smart views |  |  |  |  |  | ● | 1 |
| `setSmartViewBold` | 21562 | 5 | find / smart views |  | ● |  |  |  | ● | 0 |
| `setSfItemBold` | 21567 | 7 | find / smart views |  | ● |  |  |  | ● | 0 |
| `toggleTagSection` | 21574 | 6 | organisation |  |  |  |  |  | ● | 0 |
| `showTagSecCtx` | 21580 | 17 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `ctxTagSecColorSwatches` | 21597 | 7 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `setTagSecColor` | 21604 | 5 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `renameTagSection` | 21609 | 9 | organisation |  |  |  |  |  | ● | 0 |
| `finRenTagSec` | 21618 | 7 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `promptAddGlobalTag` | 21626 | 9 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `addGlobalTag` | 21635 | 7 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `showTagCtx` | 21642 | 13 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `renameTag` | 21655 | 10 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `finRenameTag` | 21665 | 11 | tags / types / tabs | ● | ● |  | ● |  | ● | 2 |
| `deleteTag` | 21676 | 7 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `finRenameArtTitle` | 21683 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `renderTagSection` | 21692 | 33 | render |  |  |  |  |  | ● | 1 |
| `startRenameArtTitle` | 21725 | 10 | other / helpers | ● |  |  |  |  | ● | 0 |
| `_flushEverythingOut` | 21807 | 8 | other / helpers |  | ● |  |  |  | ● | 2 |
