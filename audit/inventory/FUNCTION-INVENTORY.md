# Siyagah — Function Inventory

*Generated mechanically by `node tools/inventory.mjs` from `index.html`.
Do not hand-edit: re-run it.*

| | |
|---|---|
| App version | v04.36 |
| Generated | 2026-09-19 |
| Application script | 19,384 lines |
| Application-defined functions | **1282** |
| …reachable (called in script or named in markup) | 1252 |
| …never referenced anywhere | 25 |
| …that mutate the data model | 378 |
| …that reach a persistence boundary | 272 |
| …classified destructive | 41 |
| …privacy-sensitive (export / identity) | 13 |
| …that touch the network | 17 |
| Inline `on*` handlers in markup | **1078** |
| Distinct functions those handlers call | 557 |
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

- **other / helpers** — 552
- **tags / types / tabs** — 139
- **menus / dialogs** — 108
- **organisation** — 107
- **calendar / journal / contacts / database** — 85
- **editor / pop-out** — 70
- **find / smart views** — 51
- **render** — 46
- **cloud sync / auth** — 31
- **theme / appearance** — 27
- **destructive** — 22
- **export / import / backup** — 21
- **reminders / review** — 14
- **persistence** — 7
- **startup / load / migration** — 2

## Full inventory

Legend: **M** mutates model · **P** persists · **N** network · **D** destructive ·
**Pr** privacy-sensitive · **R** reachable

| Function | Line | Lines | Domain | M | P | N | D | Pr | R | Callers |
|---|---:|---:|---|:-:|:-:|:-:|:-:|:-:|:-:|---:|
| `_sanitiseForeignHTML` | 2999 | 22 | other / helpers |  |  |  |  |  | ● | 2 |
| `_sanitiseDBContent` | 3021 | 10 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_hardenLinks` | 3034 | 10 | theme / appearance |  |  |  |  |  | ● | 1 |
| `_repairDB` | 3045 | 38 | other / helpers |  |  |  |  |  | ● | 5 |
| `loadDB` | 3084 | 143 | startup / load / migration | ● | ● |  | ● |  | ● | 1 |
| `_tiScheduleAutoSave` | 3262 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `_save` | 3282 | 45 | persistence |  | ● |  |  |  | ● | 13 |
| `persist` | 3327 | 1 | persistence |  | ● |  |  |  | ● | 250 |
| `_snapshotShell` | 3397 | 5 | export / import / backup |  |  |  |  | ● | ● | 1 |
| `_cleanExportRoot` | 3402 | 70 | export / import / backup |  |  |  |  | ● | ● | 1 |
| `getExportHTML` | 3475 | 29 | export / import / backup |  |  |  |  | ● | ● | 5 |
| `exportFile` | 3505 | 11 | export / import / backup |  | ● |  |  | ● | ● | 1 |
| `exportDeploy` | 3521 | 14 | export / import / backup |  | ● |  |  | ● | ● | 0 |
| `exportJSON` | 3535 | 1 | export / import / backup |  |  |  |  | ● | ● | 0 |
| `_preImportRecoveryCopy` | 3555 | 4 | export / import / backup |  |  |  |  |  | ● | 1 |
| `_recoveryCopyOrAsk` | 3559 | 7 | other / helpers |  |  |  |  |  | ● | 2 |
| `importJSON` | 3567 | 61 | export / import / backup | ● | ● |  | ● |  | ● | 0 |
| `toast` | 3630 | 1 | menus / dialogs |  |  |  |  |  | ● | 256 |
| `mkDefaults` | 3633 | 17 | other / helpers |  |  |  |  |  | ● | 1 |
| `uid` | 3652 | 1 | other / helpers |  |  |  |  | ● | ● | 91 |
| `esc` | 3653 | 1 | other / helpers |  |  |  |  |  | ● | 445 |
| `strip` | 3654 | 1 | other / helpers |  |  |  |  |  | ● | 4 |
| `_wordSnippet` | 3655 | 5 | other / helpers |  |  |  |  |  |  | 0 |
| `fmtD` | 3660 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `fmtDs` | 3661 | 6 | other / helpers |  |  |  |  |  | ● | 7 |
| `isJournalNote` | 3671 | 5 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `jrnEntryDate` | 3676 | 3 | other / helpers |  |  |  |  |  | ● | 4 |
| `setJrnEntryDate` | 3679 | 7 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_dlFlipDate` | 3695 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `_dateLineHTML` | 3703 | 18 | other / helpers |  |  |  |  |  | ● | 2 |
| `_p3MetaRowHTML` | 3733 | 8 | other / helpers |  |  |  |  |  | ● | 2 |
| `_isPlaceholder` | 3744 | 7 | other / helpers |  |  |  |  |  | ● | 2 |
| `chOf` | 3751 | 1 | other / helpers | ● |  |  |  |  | ● | 31 |
| `descOf` | 3754 | 1 | other / helpers |  |  |  |  |  | ● | 8 |
| `pathOf` | 3759 | 1 | other / helpers | ● |  |  |  |  | ● | 10 |
| `cntOf` | 3765 | 1 | other / helpers | ● |  |  |  |  | ● | 6 |
| `artsIn` | 3766 | 1 | other / helpers | ● |  |  |  |  | ● | 3 |
| `_autoLeavePrimary` | 3776 | 10 | other / helpers | ● |  |  |  |  | ● | 8 |
| `render` | 3788 | 1 | render |  |  |  |  |  | ● | 38 |
| `_renderPreserveEdit` | 3792 | 23 | render |  |  |  |  |  | ● | 3 |
| `_searchWords` | 3816 | 1 | find / smart views |  |  |  |  |  | ● | 2 |
| `_matchesAllWords` | 3817 | 1 | other / helpers |  |  |  |  |  | ● | 9 |
| `renderTree` | 3818 | 42 | render | ● |  |  |  |  | ● | 97 |
| `trNode` | 3861 | 20 | other / helpers |  |  |  |  |  | ● | 4 |
| `ensureFolderGroups` | 3888 | 6 | organisation |  |  |  |  |  | ● | 6 |
| `folderGroups` | 3894 | 1 | organisation |  |  |  |  |  | ● | 3 |
| `folderGroupOf` | 3895 | 1 | organisation |  |  |  |  |  | ● | 2 |
| `trGroupedKids` | 3896 | 27 | organisation |  |  |  |  |  | ● | 1 |
| `togFolderGroup` | 3923 | 5 | organisation |  |  |  |  |  | ● | 0 |
| `showFolderGroupCtx` | 3928 | 15 | organisation |  |  |  |  |  | ● | 0 |
| `addFolderGroup` | 3943 | 8 | organisation |  | ● |  |  |  | ● | 0 |
| `addFolderGroupThenMove` | 3951 | 13 | organisation | ● | ● |  |  |  | ● | 0 |
| `renameFolderGroup` | 3964 | 5 | organisation |  | ● |  |  |  | ● | 0 |
| `deleteFolderGroup` | 3969 | 14 | organisation | ● | ● |  |  |  | ● | 0 |
| `moveFolderToGroup` | 3983 | 5 | organisation | ● | ● |  |  |  | ● | 0 |
| `renderP2H` | 3989 | 117 | render | ● |  |  |  |  | ● | 21 |
| `renderP2C` | 4107 | 160 | render | ● |  |  |  |  | ● | 105 |
| `_navBtnsHTML` | 4273 | 8 | other / helpers |  |  |  |  |  | ● | 1 |
| `renderP3H` | 4281 | 221 | render | ● |  |  |  |  | ● | 89 |
| `renderP3C` | 4503 | 101 | render | ● |  |  |  |  | ● | 91 |
| `collapseFolder` | 4608 | 4 | organisation |  |  |  |  |  | ● | 2 |
| `selFolder` | 4613 | 14 | organisation |  |  |  |  |  | ● | 7 |
| `selArt` | 4627 | 8 | other / helpers | ● | ● |  |  |  | ● | 7 |
| `back` | 4642 | 1 | other / helpers |  |  |  |  |  |  | 0 |
| `togExp` | 4643 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `toggleSB` | 4649 | 11 | other / helpers |  |  |  |  |  | ● | 0 |
| `updateSbToggle` | 4661 | 13 | other / helpers |  |  |  |  |  | ● | 6 |
| `_fwOwns` | 4691 | 1 | editor / pop-out |  |  |  |  |  | ● | 3 |
| `_fwRaise` | 4692 | 6 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `startEdit` | 4698 | 5 | editor / pop-out | ● |  |  |  |  | ● | 1 |
| `cancelEdit` | 4703 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `saveArt` | 4704 | 41 | persistence | ● | ● |  |  |  | ● | 8 |
| `_sameArr` | 4735 | 1 | other / helpers |  |  |  |  |  | ● | 2 |
| `doSearch` | 4755 | 1 | find / smart views |  |  |  |  |  | ● | 1 |
| `clearSearch` | 4756 | 9 | find / smart views |  |  |  |  |  | ● | 1 |
| `restoreLastSearch` | 4765 | 7 | find / smart views |  |  |  |  |  | ● | 0 |
| `focusSidebarSearch` | 4772 | 4 | find / smart views |  |  |  |  |  | ● | 0 |
| `_updateSearchAccessUI` | 4776 | 6 | find / smart views |  |  |  |  |  | ● | 3 |
| `_renderP2SearchBar` | 4782 | 9 | render |  |  |  |  |  | ● | 2 |
| `_renderP3SearchBar` | 4791 | 14 | render | ● |  |  |  |  | ● | 2 |
| `goHome` | 4811 | 16 | other / helpers |  |  |  |  |  | ● | 0 |
| `ec` | 4828 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_alignBtnsHTML` | 4829 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `_txszStep` | 4842 | 15 | other / helpers |  |  |  |  |  | ● | 2 |
| `_txStepIn` | 4860 | 49 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `inEd` | 4862 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `edFontStep` | 4909 | 10 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_txClearIn` | 4923 | 24 | other / helpers |  |  |  |  |  | ● | 2 |
| `inRange` | 4928 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `edClearFmt` | 4947 | 8 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_curHeadingTag` | 4961 | 12 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `shiftHeadingLevel` | 4973 | 14 | other / helpers |  |  |  |  |  | ● | 1 |
| `shiftAllHeadingsMenu` | 4987 | 8 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `shiftAllHeadings` | 4995 | 21 | other / helpers |  |  |  |  |  | ● | 0 |
| `fb` | 5016 | 15 | other / helpers |  |  |  |  |  | ● | 0 |
| `_edHost` | 5044 | 7 | editor / pop-out |  |  |  |  |  | ● | 7 |
| `_edActive` | 5051 | 9 | editor / pop-out |  |  |  |  |  | ● | 13 |
| `_edTouched` | 5062 | 6 | persistence |  |  |  |  |  | ● | 4 |
| `_isED` | 5068 | 1 | other / helpers |  |  |  |  |  | ● | 9 |
| `_edAidOf` | 5072 | 6 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `_edArtOf` | 5078 | 4 | editor / pop-out | ● |  |  |  |  | ● | 4 |
| `_restoreCaret` | 5087 | 7 | destructive |  |  |  |  |  | ● | 5 |
| `insertAtCaret` | 5094 | 25 | editor / pop-out |  |  |  |  |  | ● | 15 |
| `_vpW` | 5121 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `_vpH` | 5122 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `isURL` | 5123 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `extractURL` | 5126 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `_dom` | 5132 | 1 | other / helpers |  |  |  |  |  | ● | 5 |
| `compressImage` | 5135 | 20 | other / helpers |  |  |  |  |  | ● | 1 |
| `insertImageFile` | 5155 | 4 | other / helpers |  |  |  |  |  | ● | 1 |
| `bkCardHTML` | 5162 | 7 | menus / dialogs |  |  |  |  |  | ● | 3 |
| `videoCardHTML` | 5172 | 11 | menus / dialogs |  |  |  |  |  | ● | 4 |
| `vidMentionHTML` | 5185 | 5 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `fetchVideoTitle` | 5190 | 8 | other / helpers |  |  | ● |  |  | ● | 2 |
| `embedHTML` | 5198 | 10 | other / helpers |  |  |  |  |  | ● | 2 |
| `bkMove` | 5209 | 5 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeItemMenu` | 5216 | 5 | menus / dialogs |  |  |  |  |  | ● | 19 |
| `_imOut` | 5222 | 3 | other / helpers |  |  |  |  |  | ● | 0 |
| `_itemTitle` | 5225 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `bkItemMenu` | 5232 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_popMenu` | 5233 | 8 | menus / dialogs |  |  |  |  |  | ● | 3 |
| `convertLinkEl` | 5241 | 13 | theme / appearance |  |  |  |  |  | ● | 4 |
| `itemMenu` | 5254 | 95 | menus / dialogs | ● | ● |  |  |  | ● | 3 |
| `mk` | 5258 | 3 | other / helpers |  |  |  |  |  | ● | 18 |
| `go` | 5259 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `doSearch` | 5288 | 40 | find / smart views | ● | ● |  |  |  | ● | 2 |
| `go` | 5298 | 5 | other / helpers | ● | ● |  |  |  | ● | 3 |
| `go` | 5308 | 4 | other / helpers | ● | ● |  |  |  | ● | 3 |
| `go` | 5317 | 3 | other / helpers |  | ● |  |  |  | ● | 3 |
| `attachChooser` | 5349 | 44 | other / helpers | ● | ● |  |  |  | ● | 2 |
| `go` | 5372 | 15 | other / helpers | ● | ● |  |  |  | ● | 3 |
| `closeImgRszBar` | 5397 | 6 | other / helpers |  |  |  |  |  | ● | 3 |
| `_imgRszOut` | 5403 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `showImgRszBar` | 5409 | 42 | other / helpers |  |  |  |  |  | ● | 1 |
| `btn` | 5413 | 2 | other / helpers |  |  |  |  |  | ● | 4 |
| `go` | 5414 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `sep` | 5415 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `applyPx` | 5427 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `imgAttachTag` | 5453 | 49 | tags / types / tabs | ● | ● |  |  |  | ● | 1 |
| `renderTags` | 5465 | 26 | render |  | ● |  |  |  | ● | 2 |
| `go` | 5471 | 5 | other / helpers |  | ● |  |  |  | ● | 3 |
| `isMyWallSubfolder` | 5508 | 9 | organisation | ● |  |  |  |  | ● | 2 |
| `togMwSubGrp` | 5517 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `togMwSubCat` | 5524 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `renderMyWallSubfolder` | 5530 | 97 | render | ● |  |  |  |  | ● | 1 |
| `_subtreeArts` | 5542 | 5 | organisation |  |  |  |  |  | ● | 1 |
| `_kindLatest` | 5576 | 1 | tags / types / tabs |  |  |  |  |  | ● | 4 |
| `_sortKinds` | 5577 | 4 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `newJournalEntry` | 5632 | 19 | calendar / journal / contacts / database | ● | ● |  |  |  |  | 0 |
| `toggleArchive` | 5654 | 9 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `mkArtTitleOnly` | 5669 | 28 | other / helpers | ● | ● |  |  |  | ● | 1 |
| `qtKey` | 5697 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `qtSave` | 5701 | 8 | other / helpers |  |  |  |  |  | ● | 1 |
| `openLinkToNote` | 5714 | 41 | theme / appearance | ● |  |  |  |  | ● | 0 |
| `render` | 5718 | 24 | render | ● |  |  |  |  | ● | 38 |
| `ltnSearch` | 5755 | 25 | find / smart views | ● |  |  |  |  | ● | 1 |
| `toggleNoteLink` | 5780 | 17 | theme / appearance | ● | ● |  |  |  | ● | 0 |
| `_posAnnBubble` | 5808 | 12 | other / helpers |  |  |  |  |  | ● | 1 |
| `showAnnBubble` | 5820 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `hideAnnBubble` | 5827 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `annBubClick` | 5834 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `wireAnnEditor` | 5843 | 14 | other / helpers |  |  |  |  |  | ● | 1 |
| `onUp` | 5844 | 6 | other / helpers |  |  |  |  |  | ● | 2 |
| `openAnnModal` | 5859 | 19 | menus / dialogs | ● |  |  |  |  | ● | 1 |
| `_cancelAnn` | 5878 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_confirmAnn` | 5880 | 36 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `annPanelHTML` | 5918 | 45 | other / helpers |  |  |  |  |  | ● | 3 |
| `_refreshAnnPanel` | 5963 | 9 | other / helpers |  |  |  |  |  | ● | 5 |
| `scrollToAnnComment` | 5974 | 6 | other / helpers |  |  |  |  |  | ● | 2 |
| `scrollToAnnMark` | 5980 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `showAnnReplyBox` | 5990 | 11 | other / helpers |  |  |  |  |  | ● | 0 |
| `submitAnnReply` | 6001 | 12 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_edCleanHTML` | 6017 | 6 | editor / pop-out |  |  |  |  |  | ● | 5 |
| `confirmDeleteAnnotation` | 6024 | 14 | destructive | ● |  |  |  |  | ● | 0 |
| `deleteAnnotation` | 6038 | 23 | destructive | ● | ● |  |  |  | ● | 1 |
| `toggleAnnMode` | 6064 | 6 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `injectInlineAnns` | 6074 | 49 | other / helpers |  |  |  |  |  | ● | 2 |
| `showAnnEditBox` | 6125 | 19 | other / helpers | ● |  |  |  |  | ● | 0 |
| `cancelAnnEdit` | 6144 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `saveAnnEdit` | 6148 | 12 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `showAnnReplyEdit` | 6162 | 16 | other / helpers | ● |  |  |  |  | ● | 0 |
| `saveAnnReplyEdit` | 6178 | 11 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `quickNewNote` | 6194 | 30 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_tabsMap` | 6235 | 7 | tags / types / tabs | ● |  |  |  |  | ● | 11 |
| `_tabOwner` | 6246 | 16 | tags / types / tabs | ● |  |  |  |  | ● | 4 |
| `_tabHost` | 6263 | 5 | tags / types / tabs | ● |  |  |  |  | ● | 5 |
| `_tabGroup` | 6268 | 1 | organisation |  |  |  |  |  | ● | 2 |
| `_tabStamps` | 6278 | 4 | cloud sync / auth |  |  |  |  |  | ● | 6 |
| `_tabStampAdd` | 6282 | 5 | cloud sync / auth |  |  |  |  |  | ● | 3 |
| `_tabStampRm` | 6287 | 5 | cloud sync / auth |  |  |  |  |  | ● | 3 |
| `_tabStampPurge` | 6295 | 6 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `_tabNoHost` | 6301 | 1 | tags / types / tabs |  |  |  |  |  | ● | 3 |
| `renderTabBar` | 6303 | 86 | render | ● | ● |  | ● |  | ● | 19 |
| `chip` | 6356 | 15 | other / helpers |  |  |  |  |  | ● | 2 |
| `_tabSplitVizAdd` | 6392 | 10 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `_tabNavSync` | 6406 | 23 | tags / types / tabs |  |  |  |  |  | ● | 3 |
| `_tabNavQueue` | 6429 | 8 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_tabScroll` | 6437 | 5 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_tabScrollIntoView` | 6444 | 9 | tags / types / tabs |  |  |  |  |  | ● | 6 |
| `tabSelect` | 6453 | 15 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `toggleTab` | 6468 | 18 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `closeTab` | 6486 | 9 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `closeTabGroup` | 6495 | 9 | organisation |  | ● |  |  |  | ● | 0 |
| `tabBarDragOver` | 6509 | 6 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `tabBarDragLeave` | 6515 | 3 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `tabBarDrop` | 6518 | 20 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `fmtRemDt` | 6546 | 7 | reminders / review |  |  |  |  |  | ● | 2 |
| `reminderStripHTML` | 6554 | 17 | reminders / review |  |  |  |  |  | ● | 1 |
| `openReminderModal` | 6572 | 22 | reminders / review | ● |  |  |  |  | ● | 2 |
| `closeReminderModal` | 6594 | 6 | reminders / review |  |  |  |  |  | ● | 1 |
| `saveReminder` | 6601 | 14 | reminders / review | ● | ● |  |  |  | ● | 0 |
| `clearReminder` | 6615 | 8 | reminders / review | ● | ● |  | ● |  | ● | 0 |
| `deleteNote` | 6630 | 22 | destructive | ● | ● |  | ● |  | ● | 0 |
| `mwRelDate` | 6655 | 15 | other / helpers |  |  |  |  |  | ● | 1 |
| `renderSecSF` | 6680 | 25 | render |  |  |  |  |  | ● | 1 |
| `togSecSF` | 6707 | 6 | find / smart views |  |  |  |  |  | ● | 0 |
| `selSecSF` | 6715 | 10 | find / smart views |  |  |  |  |  | ● | 0 |
| `getSectionFolderIds` | 6727 | 6 | organisation | ● |  |  |  |  | ● | 2 |
| `walk` | 6729 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `getSecArts` | 6733 | 4 | other / helpers | ● |  |  |  |  | ● | 2 |
| `getSecSmartArts` | 6739 | 17 | find / smart views |  |  |  |  |  | ● | 4 |
| `getSecSmartGroups` | 6758 | 34 | organisation |  |  |  |  |  | ● | 3 |
| `ts` | 6761 | 1 | other / helpers |  |  |  |  |  | ● | 12 |
| `sod` | 6762 | 1 | other / helpers |  |  |  |  |  | ● | 2 |
| `openTabPicker` | 6799 | 47 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_outside` | 6833 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeTabPicker` | 6847 | 4 | tags / types / tabs |  |  |  |  |  | ● | 3 |
| `renderTabPickerList` | 6852 | 33 | render | ● |  |  |  |  | ● | 1 |
| `addToTabPicker` | 6886 | 18 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `_ntiChipTap` | 6914 | 4 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `openNtiPicker` | 6918 | 13 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_cl` | 6928 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeNtiPicker` | 6931 | 1 | tags / types / tabs |  |  |  |  |  | ● | 4 |
| `renderNtiPickerBody` | 6932 | 28 | render | ● |  |  |  |  | ● | 12 |
| `openJournalPicker` | 6965 | 15 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_cl` | 6977 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeJournalPicker` | 6980 | 1 | calendar / journal / contacts / database |  |  |  |  |  | ● | 3 |
| `renderJournalPickerBody` | 6981 | 15 | render | ● |  |  |  |  | ● | 3 |
| `_ensureJournalTag` | 6996 | 6 | tags / types / tabs |  |  |  |  |  | ● | 3 |
| `toggleNoteJournal` | 7002 | 11 | calendar / journal / contacts / database | ● | ● |  | ● |  | ● | 0 |
| `newJournalEventForNote` | 7013 | 14 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `openAttachMenu` | 7032 | 32 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `openMyDatabasePicker` | 7067 | 13 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_cl` | 7077 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeMyDatabasePicker` | 7080 | 1 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `renderMyDatabasePickerBody` | 7081 | 14 | render | ● |  |  |  |  | ● | 2 |
| `toggleNoteDbFolder` | 7095 | 11 | organisation | ● | ● |  | ● |  | ● | 0 |
| `togNtiCat` | 7106 | 1 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_ctxPos` | 7107 | 1 | menus / dialogs |  |  |  |  |  | ● | 12 |
| `addNtiCat` | 7108 | 1 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `openCatClrPicker` | 7109 | 9 | menus / dialogs |  | ● |  |  |  | ● | 0 |
| `catTextStyle` | 7118 | 8 | other / helpers |  |  |  |  |  | ● | 3 |
| `toggleNtiCatBold` | 7126 | 1 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `setNtiCatSize` | 7127 | 1 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `showNtiCatMenu` | 7128 | 6 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `showNtiSectionMenu` | 7134 | 13 | organisation |  |  |  |  |  | ● | 0 |
| `renNtiSectionLabel` | 7147 | 9 | organisation | ● | ● |  |  |  | ● | 0 |
| `openNtiSectionClrPicker` | 7156 | 8 | organisation | ● | ● |  |  |  | ● | 0 |
| `ntiSbToggleAllCats` | 7164 | 7 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `renNtiCat` | 7171 | 1 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `delNtiCat` | 7172 | 2 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `showNtiKindMenu` | 7174 | 1 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `addKindInCat` | 7175 | 2 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `renNtiKind` | 7177 | 1 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `delNtiKind` | 7178 | 2 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `moveKindToCat` | 7180 | 1 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `_migrateNotebook` | 7188 | 21 | startup / load / migration |  |  | ● |  |  | ● | 1 |
| `runMigration` | 7210 | 24 | other / helpers |  | ● | ● |  |  | ● | 0 |
| `generateBackupHTMLContent` | 7237 | 48 | export / import / backup | ● |  |  |  |  | ● | 3 |
| `chOf` | 7242 | 1 | other / helpers | ● |  |  |  |  | ● | 31 |
| `notesIn` | 7243 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `kindChips` | 7244 | 1 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `tagChips` | 7245 | 1 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `statusBadge` | 7246 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `fmtDate` | 7247 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `renderNote` | 7248 | 4 | render |  |  |  |  |  | ● | 2 |
| `renderFolder` | 7252 | 9 | render | ● |  |  |  |  | ● | 2 |
| `exportBackupHTML` | 7285 | 9 | export / import / backup |  |  |  |  | ● | ● | 0 |
| `exportBackupPDF` | 7294 | 7 | export / import / backup |  |  |  |  | ● | ● | 0 |
| `backupToGDrive` | 7303 | 27 | export / import / backup |  |  | ● |  |  | ● | 0 |
| `_getDriveFolder` | 7330 | 12 | organisation |  |  | ● |  |  | ● | 1 |
| `_uploadToDrive` | 7342 | 9 | other / helpers |  |  | ● |  |  | ● | 1 |
| `syncKnowledgeBase` | 7354 | 14 | other / helpers | ● | ● |  |  |  | ● | 1 |
| `importBackup` | 7373 | 57 | export / import / backup | ● |  |  |  |  | ● | 0 |
| `_mergeBackup` | 7431 | 11 | export / import / backup | ● | ● |  |  |  | ● | 1 |
| `_replaceWithBackup` | 7443 | 16 | export / import / backup | ● | ● |  |  |  | ● | 1 |
| `_weekOfMonth` | 7462 | 1 | other / helpers |  |  |  |  |  | ● | 2 |
| `toggleJournalMode` | 7463 | 5 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `quickJournalEntry` | 7468 | 11 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 2 |
| `openAddNoteToEvent` | 7480 | 13 | other / helpers | ● |  |  |  |  | ● | 0 |
| `_aneFilter` | 7493 | 5 | find / smart views |  |  |  |  |  | ● | 0 |
| `addExistingNoteToEvent` | 7498 | 12 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `moveJrnEvent` | 7512 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `togJrnGrp` | 7520 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `jrnGroupDate` | 7524 | 5 | organisation | ● |  |  |  |  | ● | 3 |
| `setJrnGroupBy` | 7529 | 7 | organisation | ● | ● |  |  |  | ● | 0 |
| `_jrnGroupByToggleHTML` | 7536 | 7 | organisation | ● |  |  |  |  | ● | 2 |
| `_buildJournalView` | 7543 | 42 | calendar / journal / contacts / database |  |  |  |  |  | ● | 3 |
| `_renderJournalFolder` | 7585 | 6 | render | ● |  |  |  |  | ● | 1 |
| `_renderJournalSmartView` | 7591 | 44 | render | ● |  |  |  |  | ● | 2 |
| `toggleAccordionSec` | 7639 | 6 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `updateAccordionBtn` | 7645 | 4 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_getFavCats` | 7660 | 4 | tags / types / tabs |  |  |  |  |  | ● | 8 |
| `selDbItem` | 7664 | 7 | calendar / journal / contacts / database |  |  |  |  |  | ● | 4 |
| `renderDatabaseSection` | 7671 | 36 | render | ● |  |  |  |  | ● | 1 |
| `_renderMyJournalDB` | 7707 | 1 | render |  |  |  |  |  | ● | 2 |
| `renameJrnEvent` | 7710 | 6 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_setJrnStyle` | 7716 | 9 | other / helpers | ● | ● |  | ● |  | ● | 2 |
| `pickJrnColor` | 7725 | 6 | theme / appearance | ● |  |  |  |  | ● | 0 |
| `cycleJrnSize` | 7731 | 7 | other / helpers | ● |  |  |  |  |  | 0 |
| `resetJrnStyle` | 7738 | 4 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `_jrnCardStyleTag` | 7742 | 9 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_jrnSizeLive` | 7751 | 10 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_jrnSizeCommit` | 7761 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `_jrnStyleMenu` | 7762 | 29 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `_renderMyFavourites` | 7791 | 40 | render | ● |  |  |  |  | ● | 2 |
| `addFavCat` | 7832 | 12 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `showFavCatCtx` | 7844 | 13 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `renameFavCat` | 7857 | 7 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `deleteFavCat` | 7864 | 7 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `setNoteFavCat` | 7871 | 8 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `newFavEntry` | 7879 | 23 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `_ctName` | 7906 | 5 | other / helpers |  |  |  |  |  | ● | 15 |
| `newContact` | 7912 | 22 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `toggleCTMode` | 7935 | 14 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `toggleCTNameMode` | 7950 | 14 | other / helpers | ● |  |  |  |  | ● | 0 |
| `addCTPhone` | 7965 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `_saveContactForm` | 7974 | 21 | persistence |  | ● |  |  |  | ● | 1 |
| `renderCTCard` | 7996 | 20 | render |  |  |  |  |  | ● | 1 |
| `renderCTForm` | 8017 | 38 | render |  |  |  |  |  | ● | 1 |
| `_renderMyContacts` | 8056 | 22 | render | ● |  |  |  |  | ● | 2 |
| `showDbItemCtx` | 8082 | 42 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_renderWhoBar` | 8130 | 11 | render |  |  |  |  |  | ● | 1 |
| `_whoSearch` | 8142 | 22 | find / smart views | ● |  |  |  |  | ● | 0 |
| `_whoClear` | 8165 | 4 | other / helpers |  |  |  |  |  | ● | 1 |
| `_whoSelect` | 8170 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `logInteraction` | 8176 | 17 | other / helpers | ● | ● |  |  |  | ● | 1 |
| `_elapsed` | 8195 | 11 | other / helpers |  |  |  |  |  | ● | 3 |
| `_renderInteractionLog` | 8208 | 25 | render |  |  |  |  |  | ● | 1 |
| `newStarredNote` | 8237 | 12 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `newPinnedNote` | 8250 | 12 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `newNoteWithReminder` | 8263 | 12 | reminders / review | ● | ● |  |  |  | ● | 0 |
| `quickJournalEntryFromDB` | 8276 | 16 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `_trackLastFolder` | 8294 | 6 | organisation | ● |  |  |  |  | ● | 2 |
| `newJournalFolder` | 8304 | 14 | organisation |  |  |  |  |  | ● | 0 |
| `_njfRow` | 8318 | 7 | other / helpers |  |  |  |  |  | ● | 2 |
| `njfFilter` | 8325 | 18 | find / smart views | ● |  |  |  |  | ● | 2 |
| `rows` | 8334 | 1 | other / helpers |  |  |  |  |  | ● | 4 |
| `njfSelect` | 8343 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `createNewJournalFolder` | 8347 | 26 | organisation | ● | ● |  |  |  | ● | 0 |
| `calJournalFolderIds` | 8376 | 10 | organisation | ● |  |  |  |  | ● | 2 |
| `calJournalEntries` | 8386 | 6 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 4 |
| `calJournalCount` | 8392 | 1 | calendar / journal / contacts / database |  |  |  |  |  | ● | 2 |
| `openJrnCalScope` | 8393 | 32 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 3 |
| `_jrnScopeSetMode` | 8425 | 3 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_jrnScopeSetOne` | 8428 | 3 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_jrnScopeToggle` | 8431 | 7 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `_calInit` | 8441 | 23 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 9 |
| `_calWeekStart` | 8464 | 1 | calendar / journal / contacts / database |  |  |  |  |  | ● | 2 |
| `_calOpen` | 8465 | 6 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `_calNav` | 8471 | 20 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `_calToday` | 8491 | 7 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_calRenderH` | 8498 | 58 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 2 |
| `_loadCalHols` | 8556 | 10 | calendar / journal / contacts / database |  | ● | ● |  |  | ● | 5 |
| `_calPublicHols` | 8566 | 10 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 3 |
| `_calSchoolHols` | 8576 | 15 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 3 |
| `_calHolsForDate` | 8591 | 6 | find / smart views |  |  |  |  |  | ● | 3 |
| `_calNoteCount` | 8597 | 3 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `_calSelectDate` | 8600 | 44 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `close` | 8640 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `_calNewNote` | 8644 | 14 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `_calNewJournal` | 8658 | 15 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `_calViewNotes` | 8673 | 9 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `_calRenderMonth` | 8682 | 48 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `_calRenderWeek` | 8730 | 27 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `_calRenderYear` | 8757 | 27 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `openCalSettings` | 8784 | 14 | calendar / journal / contacts / database | ● | ● |  | ● |  | ● | 0 |
| `_showClrPicker` | 8804 | 51 | menus / dialogs |  |  |  |  |  | ● | 14 |
| `close` | 8852 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `togClrFam` | 8855 | 9 | other / helpers |  |  |  |  |  | ● | 0 |
| `_clrHover` | 8864 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `_clrPick` | 8868 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `openFolClrPicker` | 8872 | 5 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `openSecClrPicker` | 8877 | 5 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `openKindClrPicker` | 8882 | 10 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `openSfClrPicker` | 8896 | 4 | find / smart views |  |  |  |  |  | ● | 0 |
| `openDbItemClrPicker` | 8900 | 10 | calendar / journal / contacts / database | ● | ● |  | ● |  | ● | 0 |
| `openThemeClrPicker` | 8910 | 16 | theme / appearance |  |  |  |  |  | ● | 0 |
| `showTagClrPicker` | 8928 | 14 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `openTabClrPicker` | 8942 | 7 | tags / types / tabs | ● | ● |  | ● |  | ● | 0 |
| `_popGeoAll` | 8961 | 13 | menus / dialogs | ● |  |  |  |  | ● | 9 |
| `_popGeoFlush` | 8974 | 6 | menus / dialogs |  | ● |  |  |  | ● | 6 |
| `openNoteAsModal` | 8987 | 30 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `openNoteModal` | 9017 | 75 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_p3SheetHdSync` | 9096 | 16 | menus / dialogs | ● |  |  |  |  | ● | 2 |
| `closeNoteModal` | 9112 | 40 | menus / dialogs |  |  |  |  |  | ● | 5 |
| `_ptrDown` | 9161 | 5 | other / helpers |  |  |  |  |  | ● | 12 |
| `_ptrUp` | 9166 | 5 | other / helpers |  |  |  |  |  | ● | 14 |
| `_modalDragStart` | 9171 | 8 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_modalDragMove` | 9179 | 7 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalDragEnd` | 9186 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalHandlesOff` | 9195 | 21 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_modalClampToViewport` | 9220 | 10 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_modalResizeRStart` | 9230 | 9 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeRMove` | 9239 | 6 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeREnd` | 9245 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBStart` | 9246 | 9 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBMove` | 9255 | 6 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBEnd` | 9261 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeLStart` | 9262 | 9 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeLMove` | 9271 | 7 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeLEnd` | 9278 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeTStart` | 9279 | 9 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_modalResizeTMove` | 9288 | 8 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeTEnd` | 9296 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_tabBarModalDown` | 9297 | 22 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `onMove` | 9304 | 10 | other / helpers |  |  |  |  |  | ● | 2 |
| `onUp` | 9314 | 1 | other / helpers |  |  |  |  |  | ● | 2 |
| `_tabBarCursor` | 9319 | 7 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_openFloatPop` | 9336 | 20 | menus / dialogs |  |  |  |  |  | ● | 8 |
| `_cl` | 9347 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `_flPopPlace` | 9372 | 26 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `closeFloatPop` | 9398 | 1 | menus / dialogs |  |  |  |  |  | ● | 8 |
| `_closeStickyPop` | 9401 | 6 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_p3HomeBtnHTML` | 9418 | 5 | other / helpers |  |  |  |  |  | ● | 3 |
| `_p3OneBar` | 9446 | 1 | other / helpers |  |  |  |  |  | ● | 11 |
| `_p3EditIconsHTML` | 9447 | 27 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ebOpenTabsHTML` | 9485 | 22 | tags / types / tabs | ● |  |  |  |  | ● | 1 |
| `row` | 9495 | 7 | other / helpers |  |  |  |  |  | ● | 8 |
| `togEBGroup` | 9507 | 12 | organisation |  |  |  |  |  | ● | 0 |
| `_ebListsHTML` | 9547 | 9 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ebInsertHTML` | 9556 | 8 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ebAttachHTML` | 9578 | 41 | other / helpers |  |  |  |  |  | ● | 3 |
| `row` | 9588 | 2 | other / helpers |  |  |  |  |  | ● | 8 |
| `_ebGoToHTML` | 9623 | 11 | other / helpers |  |  |  |  |  | ● | 3 |
| `_ebPopHTML` | 9642 | 14 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `row` | 9646 | 8 | other / helpers |  |  |  |  |  | ● | 8 |
| `_ebTagRowHTML` | 9660 | 5 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_ebNoteStateHTML` | 9668 | 18 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ebSectionToolsHTML` | 9686 | 11 | organisation | ● |  |  |  |  | ● | 2 |
| `_buildEBSub` | 9697 | 87 | other / helpers | ● |  |  |  |  | ● | 1 |
| `duplicateNote` | 9791 | 25 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `_fwFocus` | 9839 | 9 | editor / pop-out |  |  |  |  |  | ● | 3 |
| `_popTier` | 9881 | 1 | menus / dialogs |  |  |  |  |  | ● | 9 |
| `_popIcoHTML` | 9893 | 15 | menus / dialogs |  |  |  |  |  | ● | 7 |
| `_popBtnHTML` | 9911 | 9 | menus / dialogs |  |  |  |  |  | ● | 4 |
| `_popKindLbl` | 9922 | 4 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `_notePopMode` | 9926 | 4 | menus / dialogs | ● |  |  |  |  | ● | 1 |
| `_rememberNotePop` | 9933 | 8 | reminders / review | ● | ● |  |  |  | ● | 1 |
| `openNotePopup` | 9943 | 7 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `closeAllFloats` | 9953 | 6 | other / helpers |  | ● |  |  |  | ● | 3 |
| `closeAllPopouts` | 9959 | 5 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_fwSyncCloseAllChip` | 9967 | 41 | editor / pop-out | ● |  |  |  |  | ● | 4 |
| `_panelToFloat` | 10011 | 22 | other / helpers |  |  |  |  |  | ● | 1 |
| `popOutNote` | 10033 | 32 | editor / pop-out |  |  |  |  |  | ● | 6 |
| `_fwDefaultGeom` | 10075 | 11 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_fwCreate` | 10086 | 48 | editor / pop-out | ● |  |  |  |  | ● | 1 |
| `_syncCol` | 10115 | 4 | cloud sync / auth |  |  |  |  |  | ● | 0 |
| `_fwResizeStart` | 10139 | 25 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `move` | 10145 | 10 | other / helpers |  |  |  |  |  | ● | 1 |
| `up` | 10155 | 5 | other / helpers |  |  |  |  |  | ● | 1 |
| `_fwAddResizeHandles` | 10164 | 14 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_fwSavePos` | 10182 | 11 | editor / pop-out |  | ● |  |  |  | ● | 3 |
| `_fwMetaHTML` | 10198 | 25 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_findEls` | 10238 | 14 | destructive |  |  |  |  |  | ● | 6 |
| `_ntFindRanges` | 10252 | 19 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ntFindPaint` | 10271 | 8 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ntFindLabel` | 10279 | 4 | other / helpers |  |  |  |  |  | ● | 4 |
| `_ntFindRun` | 10283 | 9 | other / helpers |  |  |  |  |  | ● | 0 |
| `_ntFindStep` | 10292 | 13 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ntFindToggle` | 10305 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `_ntFindClose` | 10313 | 7 | other / helpers |  |  |  |  |  | ● | 7 |
| `_ntFindKey` | 10320 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `_noteSiblings` | 10342 | 9 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_p3Navigate` | 10353 | 10 | other / helpers |  |  |  |  |  | ● | 0 |
| `_fwNavigate` | 10363 | 23 | editor / pop-out |  | ● |  |  |  | ● | 0 |
| `_fwFlashSaved` | 10386 | 7 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_fwRenderBody` | 10393 | 47 | editor / pop-out | ● |  |  |  |  | ● | 1 |
| `_fwEc` | 10449 | 6 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_fwFb` | 10455 | 13 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_fwFontStep` | 10470 | 7 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_fwClearFmt` | 10477 | 7 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_fwBuildEBSub` | 10484 | 48 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_fwTogGroup` | 10533 | 8 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_fwWireDrag` | 10541 | 23 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `move` | 10544 | 4 | other / helpers |  |  |  |  |  | ● | 1 |
| `up` | 10548 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `_fwFlush` | 10568 | 13 | editor / pop-out | ● |  |  |  |  | ● | 5 |
| `_fwSave` | 10581 | 10 | editor / pop-out | ● | ● |  |  |  | ● | 0 |
| `_fwScheduleAutoSave` | 10596 | 18 | editor / pop-out | ● | ● |  | ● |  | ● | 7 |
| `closeFloatWin` | 10616 | 16 | other / helpers | ● | ● |  | ● |  | ● | 3 |
| `_modalResizeTRStart` | 10635 | 9 | menus / dialogs |  |  |  |  |  |  | 0 |
| `_modalResizeTRMove` | 10644 | 10 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeTREnd` | 10654 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeTLStart` | 10656 | 9 | menus / dialogs |  |  |  |  |  |  | 0 |
| `_modalResizeTLMove` | 10665 | 9 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeTLEnd` | 10674 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBLStart` | 10676 | 9 | menus / dialogs |  |  |  |  |  |  | 0 |
| `_modalResizeBLMove` | 10685 | 8 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBLEnd` | 10693 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBRStart` | 10698 | 9 | menus / dialogs |  |  |  |  |  |  | 0 |
| `_modalResizeBRMove` | 10707 | 7 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBREnd` | 10714 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_tabBarModalReset` | 10717 | 14 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `setMwFontSize` | 10733 | 9 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `todayStr` | 10745 | 4 | other / helpers |  |  |  |  |  | ● | 6 |
| `togCalLayer` | 10749 | 6 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `_calGetCat` | 10755 | 3 | calendar / journal / contacts / database |  |  |  |  |  | ● | 8 |
| `_calNewEvent` | 10758 | 6 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_calEditEvent` | 10764 | 5 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_calUpdateFormAllDay` | 10769 | 5 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_calSaveEvent` | 10774 | 31 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `_calDelEvent` | 10805 | 7 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `_calRenderEventForm` | 10812 | 29 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_calRenderDay` | 10841 | 60 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `_renderMyCalP2` | 10901 | 40 | render |  |  |  |  |  | ● | 2 |
| `_calJumpToDate` | 10941 | 9 | calendar / journal / contacts / database |  |  |  |  |  |  | 0 |
| `_upcomingEvents` | 10953 | 21 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_renderComingUp` | 10974 | 29 | render |  |  |  |  |  | ● | 1 |
| `_calManageCats` | 11003 | 6 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_calAddCat` | 11009 | 8 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `_calSaveCat` | 11017 | 9 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `_calDelCat` | 11026 | 5 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `_calRenderCatList` | 11031 | 16 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `openGlobalSearch` | 11051 | 25 | find / smart views |  |  |  |  |  | ● | 1 |
| `closeGlobalSearch` | 11076 | 3 | find / smart views |  |  |  |  |  | ● | 5 |
| `_gsSearch` | 11079 | 17 | find / smart views | ● |  |  |  |  | ● | 1 |
| `_gsHL` | 11096 | 6 | other / helpers |  |  |  |  |  | ● | 2 |
| `_gsRender` | 11102 | 25 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_gsSetActive` | 11127 | 5 | other / helpers |  |  |  |  |  | ● | 2 |
| `_gsNav` | 11132 | 5 | other / helpers |  |  |  |  |  | ● | 2 |
| `_gsConfirm` | 11137 | 4 | other / helpers |  |  |  |  |  | ● | 1 |
| `_gsOpen` | 11141 | 4 | other / helpers |  |  |  |  |  | ● | 1 |
| `_hjDate` | 11152 | 18 | other / helpers |  |  |  |  |  | ● | 9 |
| `_hjStr` | 11170 | 4 | other / helpers |  |  |  |  |  | ● | 1 |
| `toggleHijri` | 11174 | 7 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `installPWA` | 11186 | 10 | other / helpers |  |  |  |  |  | ● | 0 |
| `_mrjDueArts` | 11211 | 5 | other / helpers | ● |  |  |  |  | ● | 4 |
| `_mrjAllEnrolled` | 11216 | 4 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_mrjDueCount` | 11220 | 1 | other / helpers |  |  |  |  |  |  | 0 |
| `mrjToggle` | 11221 | 11 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `_mrjSchedule` | 11232 | 10 | other / helpers |  | ● |  |  |  | ● | 1 |
| `mrjStart` | 11242 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `mrjRate` | 11248 | 9 | other / helpers | ● |  |  |  |  | ● | 0 |
| `mrjNext` | 11257 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `mrjEnd` | 11264 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `_mrjRenderFooter` | 11270 | 9 | other / helpers |  |  |  |  |  | ● | 1 |
| `_mrjRenderP2C` | 11279 | 25 | other / helpers |  |  |  |  |  | ● | 1 |
| `practiceToggle` | 11309 | 6 | reminders / review | ● | ● |  | ● |  | ● | 0 |
| `_practiceRenderP2C` | 11315 | 24 | reminders / review | ● |  |  |  |  | ● | 1 |
| `openCiteModal` | 11344 | 11 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `closeCiteModal` | 11355 | 3 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `setCiteType` | 11358 | 5 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_buildCiteHTML` | 11363 | 30 | other / helpers |  |  |  |  |  | ● | 1 |
| `insertCite` | 11393 | 12 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_citeModalHTML` | 11405 | 40 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_tocHostEl` | 11452 | 5 | other / helpers |  |  |  |  |  | ● | 4 |
| `_tocScrollEl` | 11457 | 5 | other / helpers |  |  |  |  |  | ● | 3 |
| `_tocScan` | 11462 | 6 | other / helpers |  |  |  |  |  | ● | 3 |
| `_tocItemHTML` | 11469 | 6 | other / helpers |  |  |  |  |  | ● | 2 |
| `_tocInject` | 11476 | 91 | other / helpers | ● |  |  |  |  | ● | 4 |
| `togTocTitle` | 11567 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `_tocBindScroll` | 11572 | 14 | other / helpers |  |  |  |  |  | ● | 1 |
| `_tocUnbindScroll` | 11587 | 7 | other / helpers |  |  |  |  |  | ● | 6 |
| `_tocScrollTo` | 11595 | 18 | other / helpers |  |  |  |  |  | ● | 1 |
| `_tocSetActive` | 11614 | 14 | other / helpers |  |  |  |  |  | ● | 3 |
| `_tocToggleSide` | 11629 | 35 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_tocStartResize` | 11664 | 21 | other / helpers | ● | ● |  |  |  |  | 0 |
| `onMove` | 11671 | 5 | other / helpers |  |  |  |  |  | ● | 1 |
| `onUp` | 11676 | 6 | other / helpers | ● | ● |  |  |  | ● | 1 |
| `_tocDestroy` | 11685 | 11 | other / helpers |  |  |  |  |  | ● | 1 |
| `pinTabDStart` | 11705 | 4 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_pinPanelDragOver` | 11709 | 4 | tags / types / tabs |  |  |  |  |  |  | 0 |
| `_pinPanelDragLeave` | 11713 | 3 | tags / types / tabs |  |  |  |  |  |  | 0 |
| `_pinPanelDrop` | 11716 | 8 | tags / types / tabs |  |  |  |  |  |  | 0 |
| `pinTabToPanel` | 11724 | 10 | tags / types / tabs | ● | ● |  |  |  | ● | 1 |
| `unpinTab` | 11734 | 6 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `_pinPanelToggleSide` | 11740 | 6 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `_extractHeadingsFromHTML` | 11749 | 17 | find / smart views |  |  |  |  |  | ● | 1 |
| `togPinExpand` | 11766 | 5 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `togPinCardMode` | 11771 | 5 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `togPinHeadExpand` | 11776 | 6 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_pinHeadsTreeHTML` | 11782 | 12 | organisation |  |  |  |  |  | ● | 1 |
| `_pinCardHTML` | 11794 | 25 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `_pinHostEl` | 11819 | 5 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_pinPanelInject` | 11824 | 94 | tags / types / tabs | ● | ● |  |  |  | ● | 10 |
| `_fwSyncBodyPadding` | 11921 | 12 | editor / pop-out |  |  |  |  |  | ● | 9 |
| `_fwClearAllBodyPadding` | 11933 | 3 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `_pinStartResize` | 11936 | 22 | tags / types / tabs |  | ● |  |  |  |  | 0 |
| `onMove` | 11943 | 5 | other / helpers |  |  |  |  |  | ● | 1 |
| `onUp` | 11948 | 8 | other / helpers |  | ● |  |  |  | ● | 1 |
| `_pinPanelDestroy` | 11958 | 4 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_pinOpenNote` | 11966 | 4 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_syncP3CPadding` | 11973 | 11 | cloud sync / auth |  |  |  |  |  | ● | 8 |
| `_tocMobileCheck` | 11987 | 13 | other / helpers |  |  |  |  |  | ● | 2 |
| `_tocOpenMobile` | 12001 | 13 | other / helpers |  |  |  |  |  |  | 0 |
| `_tocCloseMobile` | 12015 | 10 | other / helpers |  |  |  |  |  | ● | 2 |
| `_tocMobileScrollTo` | 12026 | 4 | other / helpers |  |  |  |  |  |  | 0 |
| `_dfltHdStyles` | 12035 | 4 | other / helpers |  |  |  |  |  | ● | 6 |
| `_applyHeadingStyles` | 12039 | 11 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_initCollapsible` | 12050 | 38 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_colToggle` | 12088 | 15 | other / helpers | ● | ● |  | ● |  | ● | 1 |
| `_colAll` | 12103 | 12 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `_colToolbarBtnHTML` | 12123 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `toggleColPop` | 12129 | 10 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `_p3FitToolbar` | 12152 | 37 | other / helpers |  |  |  |  |  | ● | 6 |
| `fits` | 12164 | 1 | other / helpers |  |  |  |  |  | ● | 4 |
| `_p3FitEditBar` | 12206 | 16 | other / helpers |  |  |  |  |  | ● | 1 |
| `_p3PalBtn` | 12223 | 9 | other / helpers |  |  |  |  |  | ● | 13 |
| `_moreBtnHint` | 12236 | 3 | other / helpers |  |  |  |  |  | ● | 1 |
| `_p3ActPalette` | 12239 | 48 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `_p3NtiPalette` | 12287 | 20 | tags / types / tabs | ● |  |  |  |  | ● | 0 |
| `_colTogglePreview` | 12307 | 5 | reminders / review | ● | ● |  |  |  | ● | 0 |
| `openHeadingStylesModal` | 12312 | 29 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `closeHeadingStylesModal` | 12341 | 1 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `resetHeadingStyles` | 12342 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `saveHeadingStyles` | 12349 | 11 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_pasteHasStructure` | 12367 | 8 | other / helpers |  |  |  |  |  | ● | 1 |
| `_openSmartPastePop` | 12376 | 33 | find / smart views |  |  |  |  |  | ● | 1 |
| `go` | 12397 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `_closeSmartPastePop` | 12410 | 5 | find / smart views |  |  |  |  |  | ● | 1 |
| `_cleanPasteHTML` | 12416 | 10 | other / helpers |  |  |  |  |  | ● | 2 |
| `_smartPasteHTML` | 12427 | 32 | find / smart views |  |  |  |  |  | ● | 1 |
| `_doPaste` | 12460 | 31 | other / helpers | ● | ● |  |  |  | ● | 4 |
| `getOutLinks` | 12498 | 8 | theme / appearance | ● |  |  |  |  | ● | 1 |
| `getBacklinks` | 12506 | 5 | theme / appearance | ● |  |  |  |  | ● | 1 |
| `_blSnippet` | 12511 | 13 | other / helpers |  |  |  |  |  | ● | 1 |
| `backlinksHTML` | 12524 | 17 | theme / appearance |  |  |  |  |  | ● | 3 |
| `refreshBacklinks` | 12542 | 10 | render | ● |  |  |  |  | ● | 2 |
| `upgradeViewCards` | 12555 | 30 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `closePastePop` | 12588 | 5 | menus / dialogs |  |  |  |  |  | ● | 6 |
| `openPastePop` | 12593 | 25 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `mk` | 12596 | 3 | other / helpers |  |  |  |  |  | ● | 18 |
| `go` | 12597 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `_ppOut` | 12618 | 3 | other / helpers |  |  |  |  |  | ● | 0 |
| `_caretXY` | 12622 | 8 | other / helpers |  |  |  |  |  | ● | 2 |
| `closeMenDD` | 12632 | 1 | other / helpers |  |  |  |  |  | ● | 8 |
| `_menQuery` | 12633 | 8 | find / smart views |  |  |  |  |  | ● | 2 |
| `showMenDD` | 12641 | 21 | other / helpers | ● |  |  |  |  | ● | 2 |
| `go` | 12653 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `insertMention` | 12662 | 10 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `edImgPick` | 12674 | 3 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `edLink` | 12677 | 6 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `edBookmarkBtn` | 12683 | 4 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `edMentionBtn` | 12687 | 1 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `flashSaved` | 12695 | 8 | other / helpers |  |  |  |  |  | ● | 2 |
| `_edAutoSave` | 12708 | 12 | editor / pop-out | ● | ● |  |  |  | ● | 4 |
| `_edBlocksInSel` | 12721 | 10 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `edBoundary` | 12732 | 10 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `edMarkDone` | 12743 | 10 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `edColorBtn` | 12757 | 7 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_clrPopAway` | 12764 | 6 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_closeColorPop` | 12770 | 1 | theme / appearance |  |  |  |  |  | ● | 2 |
| `_openColorPop` | 12771 | 31 | theme / appearance |  |  |  |  |  | ● | 1 |
| `sw` | 12775 | 11 | other / helpers |  |  |  |  |  | ● | 2 |
| `_applyColor` | 12802 | 16 | theme / appearance |  |  |  |  |  | ● | 0 |
| `_edColHeads` | 12829 | 9 | editor / pop-out |  |  |  |  |  | ● | 4 |
| `_edColClean` | 12839 | 5 | editor / pop-out |  |  |  |  |  | ● | 7 |
| `_edColApply` | 12845 | 32 | editor / pop-out | ● |  |  |  |  | ● | 5 |
| `_edColInit` | 12878 | 26 | editor / pop-out |  |  |  |  |  | ● | 8 |
| `_edRetag` | 12912 | 8 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edBlockDragStart` | 12920 | 11 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edDragPaint` | 12931 | 23 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `_edBlockDragMove` | 12954 | 24 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_edBlockDragEnd` | 12978 | 31 | editor / pop-out | ● |  |  |  |  | ● | 0 |
| `_edColToggle` | 13009 | 12 | editor / pop-out |  | ● |  |  |  | ● | 1 |
| `_edColAll` | 13021 | 12 | editor / pop-out |  | ● |  |  |  | ● | 0 |
| `_edColPreview` | 13033 | 7 | editor / pop-out | ● | ● |  |  |  | ● | 0 |
| `_edColSyncPrevBtn` | 13044 | 4 | editor / pop-out | ● |  |  |  |  | ● | 2 |
| `_edColToolbarHTML` | 13048 | 5 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `toggleEdColPop` | 13056 | 7 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `_rangeAtPoint` | 13066 | 6 | other / helpers |  |  |  |  |  |  | 0 |
| `_edVisKids` | 13101 | 5 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edNeedsLeadIn` | 13109 | 7 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edIsBlankLine` | 13118 | 5 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `_edBlankLine` | 13123 | 1 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `_edPutCaret` | 13124 | 6 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edRevealTail` | 13134 | 8 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edHeadChromeEnd` | 13145 | 9 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edPrefixText` | 13158 | 8 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `_edFixHeadCaret` | 13169 | 10 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `initRichPaste` | 13209 | 217 | other / helpers |  |  |  |  |  | ● | 1 |
| `markCards` | 13212 | 7 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `_flowTo` | 13299 | 8 | other / helpers |  |  |  |  |  | ● | 3 |
| `_endTouchDrag` | 13327 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_promptOpenLink` | 13436 | 10 | theme / appearance |  |  |  |  |  | ● | 3 |
| `mk` | 13441 | 1 | other / helpers |  |  |  |  |  | ● | 18 |
| `autoFit` | 13537 | 18 | other / helpers | ● |  |  |  |  | ● | 2 |
| `dStart` | 13560 | 9 | other / helpers | ● |  |  |  |  | ● | 0 |
| `dEnd` | 13570 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `artDStart` | 13578 | 10 | other / helpers | ● |  |  |  |  | ● | 0 |
| `artDEnd` | 13589 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `dOver` | 13599 | 31 | other / helpers | ● |  |  |  |  | ● | 0 |
| `dLeave` | 13631 | 3 | other / helpers |  |  |  |  |  | ● | 0 |
| `dDrop` | 13635 | 30 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `clearDI` | 13666 | 4 | other / helpers |  |  |  |  |  | ● | 7 |
| `_moveWouldCycle` | 13683 | 9 | other / helpers | ● |  |  |  |  | ● | 2 |
| `doMoveFolder` | 13693 | 28 | organisation | ● | ● |  | ● |  | ● | 1 |
| `moveFolderToTop` | 13725 | 22 | organisation | ● | ● |  |  |  | ● | 0 |
| `offerRenumber` | 13749 | 31 | other / helpers |  |  |  |  |  | ● | 1 |
| `doRenumber` | 13781 | 20 | other / helpers |  | ● |  |  |  | ● | 0 |
| `toggleFolderStructured` | 13812 | 15 | organisation | ● | ● |  |  |  | ● | 0 |
| `openFieldBuilder` | 13827 | 6 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `_fieldBuilderHTML` | 13833 | 12 | calendar / journal / contacts / database |  |  |  |  |  | ● | 4 |
| `_fieldRowHTML` | 13845 | 10 | other / helpers |  |  |  |  |  | ● | 1 |
| `addFieldRow` | 13855 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `removeFieldRow` | 13863 | 8 | reminders / review | ● | ● |  |  |  | ● | 0 |
| `updField` | 13871 | 9 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_dbfFields` | 13955 | 1 | calendar / journal / contacts / database |  |  |  |  |  | ● | 7 |
| `_dbfFieldById` | 13956 | 1 | calendar / journal / contacts / database |  |  |  |  |  | ● | 6 |
| `_dbfCandidates` | 13958 | 5 | calendar / journal / contacts / database |  |  |  |  |  | ● | 4 |
| `_dbfReportUsable` | 13966 | 9 | calendar / journal / contacts / database |  |  |  |  |  | ● | 2 |
| `_dbfNum` | 13975 | 5 | calendar / journal / contacts / database |  |  |  |  |  | ● | 2 |
| `_dbfFmt` | 13980 | 5 | calendar / journal / contacts / database |  |  |  |  |  | ● | 3 |
| `_dbfVal` | 13986 | 6 | calendar / journal / contacts / database |  |  |  |  |  | ● | 3 |
| `_dbReportHTML` | 13997 | 15 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `wrap` | 14003 | 1 | other / helpers |  |  |  |  |  | ● | 6 |
| `_dbrTable` | 14012 | 23 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_dbrBreakdown` | 14035 | 15 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_dbrTotals` | 14050 | 13 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_dbrStatus` | 14063 | 25 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_dbrTimeline` | 14088 | 22 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_dbbShow` | 14121 | 5 | calendar / journal / contacts / database |  |  |  |  |  | ● | 3 |
| `openDbFolderBuilder` | 14126 | 6 | organisation | ● |  |  |  |  | ● | 0 |
| `newDbFolder` | 14132 | 14 | organisation | ● | ● |  |  |  | ● | 0 |
| `dbBuilderCancel` | 14149 | 13 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `dbBuilderDone` | 14162 | 11 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `_dbBuilderHTML` | 14173 | 60 | calendar / journal / contacts / database |  |  |  |  |  | ● | 3 |
| `_dbbFieldsHTML` | 14233 | 14 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_dbbFolder` | 14247 | 1 | organisation | ● |  |  |  |  | ● | 8 |
| `_dbbRefresh` | 14249 | 9 | calendar / journal / contacts / database |  |  |  |  |  | ● | 6 |
| `dbbSet` | 14258 | 7 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `dbbAddField` | 14265 | 6 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `dbbRemoveField` | 14271 | 9 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `dbbMoveField` | 14280 | 7 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `dbbUpdField` | 14287 | 11 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `dbbSetReport` | 14298 | 16 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `dbbApplyPreset` | 14317 | 26 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `showDbSecCtx` | 14348 | 20 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `newPlainDbFolder` | 14370 | 13 | organisation | ● | ● |  |  |  | ● | 0 |
| `autoNumberDbFolders` | 14385 | 11 | organisation | ● | ● |  |  |  | ● | 0 |
| `_structuredFolderOf` | 14397 | 3 | organisation | ● |  |  |  |  | ● | 1 |
| `fieldInputHTML` | 14400 | 24 | other / helpers |  |  |  |  |  | ● | 1 |
| `saveFieldValue` | 14424 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_fieldsPanelHTML` | 14432 | 12 | other / helpers |  |  |  |  |  | ● | 3 |
| `_fieldChipsHTML` | 14444 | 12 | other / helpers |  |  |  |  |  | ● | 1 |
| `_sha256Hex` | 14466 | 5 | other / helpers |  |  |  |  |  | ● | 2 |
| `setFolderPin` | 14471 | 15 | organisation | ● | ● |  |  |  | ● | 0 |
| `removeFolderPin` | 14486 | 9 | organisation | ● | ● |  | ● |  | ● | 0 |
| `_pinLockHTML` | 14495 | 10 | tags / types / tabs | ● |  |  |  |  | ● | 1 |
| `tryUnlockFolder` | 14505 | 15 | organisation | ● |  |  |  |  | ● | 0 |
| `_stripHistoryImages` | 14553 | 15 | other / helpers |  |  |  |  |  | ● | 2 |
| `_captureNoteHistory` | 14568 | 13 | other / helpers |  |  |  |  |  | ● | 8 |
| `_pruneNoteHistory` | 14581 | 15 | other / helpers |  |  |  |  |  | ● | 1 |
| `totalBytes` | 14586 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `_relTime` | 14596 | 13 | other / helpers |  |  |  |  |  | ● | 4 |
| `_nhReasonLabel` | 14609 | 3 | other / helpers |  |  |  |  |  | ● | 1 |
| `openNoteHistory` | 14612 | 14 | other / helpers |  |  |  |  |  | ● | 0 |
| `_cl` | 14623 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeNoteHistory` | 14626 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `previewNoteHistory` | 14627 | 1 | reminders / review |  |  |  |  |  | ● | 0 |
| `_nhBack` | 14628 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_nhSetMode` | 14629 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_diffTextify` | 14637 | 11 | other / helpers |  |  |  |  |  | ● | 1 |
| `_diffTokenize` | 14648 | 1 | other / helpers |  |  |  |  |  | ● | 2 |
| `_tokDiff` | 14649 | 21 | other / helpers |  |  |  |  |  | ● | 1 |
| `_renderDiffHTML` | 14670 | 8 | render |  |  |  |  |  | ● | 1 |
| `renderNoteHistoryBody` | 14678 | 39 | render | ● |  |  |  |  | ● | 4 |
| `restoreNoteHistory` | 14717 | 17 | destructive | ● | ● |  |  |  | ● | 0 |
| `_versionSiblings` | 14743 | 5 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_versionStripHTML` | 14748 | 16 | other / helpers |  |  |  |  |  | ● | 1 |
| `startVersioning` | 14764 | 11 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `addNewVersion` | 14775 | 24 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `showVersionCtx` | 14799 | 12 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `renameVersion` | 14811 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `setVersionIcon` | 14819 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `unlinkVersion` | 14827 | 7 | theme / appearance | ● | ● |  | ● |  | ● | 0 |
| `ensureQuickPhrases` | 14841 | 13 | other / helpers | ● |  |  |  |  | ● | 7 |
| `_qpTextToHTML` | 14854 | 3 | other / helpers |  |  |  |  |  | ● | 1 |
| `openQuickPhrasesMenu` | 14857 | 18 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `insertQuickPhrase` | 14875 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `openQuickPhrasesManager` | 14882 | 3 | other / helpers |  |  |  |  |  | ● | 0 |
| `_qpManagerHTML` | 14885 | 21 | other / helpers |  |  |  |  |  | ● | 4 |
| `addQuickPhrase` | 14906 | 11 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `updQuickPhrase` | 14917 | 5 | other / helpers |  | ● |  |  |  | ● | 0 |
| `deleteQuickPhrase` | 14922 | 6 | destructive | ● | ● |  |  |  | ● | 0 |
| `moveQuickPhrase` | 14928 | 9 | other / helpers |  | ● |  |  |  | ● | 0 |
| `_ktDefaultKhutbah` | 14955 | 37 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ktNormalize` | 14992 | 16 | other / helpers |  |  |  |  |  | ● | 2 |
| `ensureTemplates` | 15008 | 7 | other / helpers | ● |  |  |  |  | ● | 8 |
| `_ktGet` | 15015 | 1 | other / helpers |  |  |  |  |  | ● | 20 |
| `_ktFoldHTML` | 15018 | 9 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ktBarHTML` | 15030 | 9 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ktAyahHTML` | 15039 | 16 | other / helpers |  |  |  |  |  | ● | 2 |
| `ktBuildHTML` | 15055 | 36 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ktBtnHTML` | 15093 | 3 | other / helpers |  |  |  |  |  | ● | 2 |
| `openTemplatesMenu` | 15096 | 14 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `insertTemplate` | 15110 | 11 | other / helpers |  |  |  |  |  | ● | 0 |
| `_ktDirty` | 15123 | 4 | other / helpers |  |  |  |  |  | ● | 4 |
| `_ktToggleFold` | 15127 | 8 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ktFoldAll` | 15135 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ktRenumber` | 15142 | 9 | other / helpers |  |  |  |  |  | ● | 3 |
| `_ktTplFor` | 15153 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ktAddBlock` | 15160 | 12 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_ktDelBlock` | 15172 | 10 | destructive |  |  |  |  |  | ● | 1 |
| `_ktBlockText` | 15184 | 14 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ktCopyBlock` | 15198 | 38 | other / helpers |  |  |  |  |  | ● | 1 |
| `done` | 15210 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `fallback` | 15211 | 16 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ktRepair` | 15238 | 7 | other / helpers |  |  |  |  |  | ● | 3 |
| `_ktShow` | 15270 | 5 | other / helpers |  |  |  |  |  | ● | 7 |
| `openTemplatesManager` | 15275 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_ktMgrHTML` | 15276 | 25 | other / helpers |  |  |  |  |  | ● | 6 |
| `ktAddTemplate` | 15301 | 10 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktRestoreKhutbah` | 15311 | 9 | destructive | ● | ● |  |  |  | ● | 0 |
| `ktDuplicateTemplate` | 15320 | 10 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `ktDeleteTemplate` | 15330 | 6 | destructive | ● | ● |  |  |  | ● | 0 |
| `ktMoveTemplate` | 15336 | 7 | other / helpers |  | ● |  |  |  | ● | 0 |
| `openTemplateEditor` | 15345 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ktEdHTML` | 15346 | 94 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ktRedraw` | 15440 | 1 | other / helpers |  |  |  |  |  | ● | 12 |
| `ktSet` | 15441 | 2 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktSetAyah` | 15443 | 2 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktAddField` | 15445 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktSetField` | 15446 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktDelField` | 15447 | 1 | destructive |  | ● |  |  |  | ● | 0 |
| `ktMoveField` | 15448 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktAddLang` | 15449 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktSetLang` | 15450 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktDelLang` | 15451 | 1 | destructive |  | ● |  |  |  | ● | 0 |
| `ktMoveLang` | 15452 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktAddSec` | 15453 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktSetSec` | 15454 | 10 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktDelSec` | 15464 | 1 | destructive |  | ● |  |  |  | ● | 0 |
| `ktMoveSec` | 15465 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `_ktMoveIn` | 15466 | 5 | other / helpers |  |  |  |  |  | ● | 3 |
| `_injectHeadingStatusBadges` | 15489 | 28 | other / helpers | ● |  |  |  |  | ● | 1 |
| `showHeadingStatusMenu` | 15517 | 17 | menus / dialogs | ● |  |  |  |  |  | 0 |
| `setHeadingStatus` | 15534 | 8 | other / helpers | ● | ● |  |  |  | ● | 1 |
| `clearHeadingStatus` | 15542 | 7 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `promptCustomHeadingStatus` | 15549 | 11 | other / helpers | ● |  |  |  |  | ● | 0 |
| `logContactAction` | 15574 | 19 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `saveContactAction` | 15593 | 17 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `_renderActionLog` | 15610 | 22 | render |  |  |  |  |  | ● | 1 |
| `toggleActionDone` | 15632 | 13 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `deleteContactAction` | 15645 | 8 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `toggleP2HCardView` | 15653 | 4 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `toggleP2HTreeMode` | 15657 | 4 | organisation |  |  |  |  |  | ● | 0 |
| `togP2HTreeNode` | 15661 | 5 | organisation |  |  |  |  |  | ● | 0 |
| `p2hTreeExpandAll` | 15666 | 8 | organisation |  |  |  |  |  | ● | 0 |
| `p2hTreeCollapseAll` | 15674 | 4 | organisation |  |  |  |  |  | ● | 0 |
| `_folderTreeNodeHTML` | 15678 | 8 | organisation |  |  |  |  |  | ● | 2 |
| `_folderDescendantsHTML` | 15686 | 19 | organisation |  |  |  |  |  | ● | 1 |
| `_secNavHTML` | 15708 | 9 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_firstFolderOfSection` | 15719 | 3 | organisation | ● |  |  |  |  | ● | 3 |
| `gotoSection` | 15722 | 6 | organisation | ● |  |  |  |  | ● | 0 |
| `gotoAdjacentSection` | 15728 | 13 | organisation | ● |  |  |  |  | ● | 0 |
| `_folderFullTreeHTML` | 15741 | 16 | organisation | ● |  |  |  |  | ● | 1 |
| `_folderPathRowHTML` | 15757 | 21 | organisation | ● |  |  |  |  | ● | 1 |
| `_sfQtFolder` | 15818 | 10 | organisation | ● |  |  |  |  | ● | 2 |
| `_sfPathRowHTML` | 15829 | 22 | find / smart views |  |  |  |  |  | ● | 2 |
| `_sfGrpKeys` | 15852 | 6 | find / smart views |  |  |  |  |  | ● | 2 |
| `sfGrpExpandAll` | 15858 | 5 | find / smart views |  |  |  |  |  | ● | 0 |
| `sfGrpCollapseAll` | 15863 | 5 | find / smart views |  |  |  |  |  | ● | 0 |
| `_sfQtBarHTML` | 15890 | 16 | find / smart views |  |  |  |  |  | ● | 4 |
| `addStarterMyDatabaseFolders` | 15911 | 28 | organisation | ● | ● |  |  |  | ● | 0 |
| `mkFolder` | 15939 | 27 | organisation | ● | ● |  |  |  | ● | 2 |
| `rnFolder` | 15966 | 1 | organisation | ● | ● |  |  |  | ● | 1 |
| `rmFolder` | 15967 | 1 | organisation |  |  |  |  |  |  | 0 |
| `mkArt` | 15968 | 1 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `rmArt` | 15969 | 1 | other / helpers |  |  |  |  |  |  | 0 |
| `_buildFolderCtxMain` | 15972 | 35 | organisation | ● |  |  |  |  | ● | 2 |
| `showCtx` | 16007 | 12 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `_folderCtxBack` | 16019 | 3 | organisation |  |  |  |  |  | ● | 0 |
| `_folderCtxSub` | 16022 | 7 | organisation |  |  |  |  |  | ● | 0 |
| `hideCtx` | 16033 | 1 | menus / dialogs |  |  |  |  |  | ● | 54 |
| `moveToMyJournal` | 16034 | 7 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `offerRenumberManual` | 16041 | 4 | other / helpers | ● |  |  |  |  | ● | 0 |
| `stripNumPrefix` | 16049 | 6 | other / helpers |  |  |  |  |  | ● | 4 |
| `getHierNum` | 16061 | 13 | other / helpers | ● |  |  |  |  | ● | 3 |
| `autoNumberAll` | 16076 | 25 | other / helpers | ● | ● |  |  |  | ● | 2 |
| `offerAutoNumber` | 16103 | 23 | other / helpers | ● |  |  |  |  | ● | 2 |
| `showModal` | 16135 | 16 | menus / dialogs |  |  |  |  |  | ● | 39 |
| `closeModal` | 16155 | 3 | menus / dialogs |  |  |  |  |  | ● | 15 |
| `_mbSaveGeom` | 16174 | 10 | other / helpers |  | ● |  |  |  | ● | 2 |
| `_mbLoadGeom` | 16184 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `showResizableModal` | 16193 | 39 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `_mbDragStart` | 16234 | 16 | other / helpers |  |  |  |  |  | ● | 0 |
| `_mbDragMove` | 16250 | 9 | other / helpers |  |  |  |  |  | ● | 0 |
| `_mbDragStop` | 16259 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `_mbResizeStart` | 16267 | 15 | other / helpers |  |  |  |  |  | ● | 0 |
| `_mbResizeMove` | 16282 | 16 | other / helpers |  |  |  |  |  | ● | 0 |
| `_mbResizeStop` | 16298 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `openModal` | 16305 | 35 | menus / dialogs | ● |  |  |  |  | ● | 2 |
| `confirmDel` | 16340 | 8 | other / helpers | ● |  |  |  |  | ● | 0 |
| `_pkArtsOf` | 16373 | 1 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_pkFileRowHTML` | 16374 | 14 | other / helpers |  |  |  |  |  | ● | 1 |
| `_pkRowHTML` | 16388 | 32 | other / helpers |  |  |  |  |  | ● | 1 |
| `_pkTreeHTML` | 16420 | 6 | organisation |  |  |  |  |  | ● | 4 |
| `openPicker` | 16426 | 19 | menus / dialogs | ● |  |  |  |  | ● | 1 |
| `_pkSaveScope` | 16456 | 19 | other / helpers |  | ● |  |  |  | ● | 1 |
| `_pkLoadScope` | 16475 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `_pkResumeBrowse` | 16487 | 36 | other / helpers | ● |  |  |  |  | ● | 1 |
| `openFolderPopupFromToolbar` | 16523 | 21 | organisation | ● |  |  |  |  | ● | 0 |
| `openSectionPopout` | 16548 | 8 | organisation | ● |  |  |  |  | ● | 1 |
| `openFolderPopout` | 16557 | 8 | organisation | ● |  |  |  |  | ● | 0 |
| `_pkCurrentBrowseRoots` | 16565 | 5 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_pkCurrentSectionId` | 16573 | 8 | organisation |  |  |  |  |  | ● | 3 |
| `_pkFontClampSize` | 16591 | 4 | other / helpers |  |  |  |  |  | ● | 4 |
| `_pkFontLoad` | 16595 | 10 | other / helpers |  |  |  |  |  | ● | 3 |
| `_pkFontSave` | 16605 | 1 | other / helpers |  | ● |  |  |  | ● | 2 |
| `_pkApplyFont` | 16608 | 12 | other / helpers |  |  |  |  |  | ● | 5 |
| `_pkFontSet` | 16623 | 15 | other / helpers |  |  |  |  |  | ● | 4 |
| `pkFontSize` | 16638 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkFontStep` | 16639 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkFontBold` | 16640 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkFontColor` | 16641 | 1 | theme / appearance |  |  |  |  |  | ● | 1 |
| `pkFontPalette` | 16644 | 4 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `pkFontReset` | 16648 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkFontMenu` | 16659 | 49 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_pkSecNavHTML` | 16721 | 17 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_pkRenderScopeBody` | 16739 | 7 | other / helpers |  |  |  |  |  | ● | 3 |
| `_pkAllSectionsHTML` | 16749 | 18 | organisation | ● |  |  |  |  | ● | 1 |
| `_pkAllSmartHTML` | 16774 | 7 | find / smart views |  |  |  |  |  | ● | 1 |
| `pkToggleAllSec` | 16781 | 5 | other / helpers |  |  |  |  |  | ● | 0 |
| `_pkSetFolderControlsVisible` | 16788 | 4 | organisation |  |  |  |  |  | ● | 4 |
| `_pkSwitchToSection` | 16797 | 13 | organisation | ● |  |  |  |  | ● | 1 |
| `_pkSwitchToScopeKind` | 16812 | 14 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_pkRefreshSecNav` | 16826 | 4 | other / helpers |  |  |  |  |  | ● | 3 |
| `pkGotoSection` | 16830 | 10 | organisation |  |  |  |  |  | ● | 1 |
| `_pkNavStops` | 16842 | 4 | other / helpers | ● |  |  |  |  | ● | 1 |
| `pkGotoAdjacentSection` | 16846 | 9 | organisation |  |  |  |  |  | ● | 0 |
| `_pkSmartListHTML` | 16857 | 11 | find / smart views |  |  |  |  |  | ● | 2 |
| `_pkTagsListHTML` | 16868 | 9 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_pkKindsListHTML` | 16877 | 14 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `pkNavScope` | 16893 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `_pkOpenBrowse` | 16899 | 20 | other / helpers |  |  |  |  |  | ● | 3 |
| `pkNavigateFolder` | 16919 | 4 | organisation |  |  |  |  |  |  | 0 |
| `_pkRow` | 16923 | 1 | other / helpers |  |  |  |  |  | ● | 9 |
| `_pkRebuildList` | 16928 | 18 | other / helpers | ● |  |  |  |  | ● | 9 |
| `_pkApplyVis` | 16946 | 29 | other / helpers |  |  |  |  |  | ● | 5 |
| `togglePickExp` | 16975 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `_pkFilter` | 16983 | 22 | find / smart views |  |  |  |  |  | ● | 4 |
| `_pkGlobalSearchHTML` | 17012 | 60 | find / smart views | ● |  |  |  |  | ● | 1 |
| `grpHd` | 17025 | 1 | other / helpers |  |  |  |  |  | ● | 5 |
| `_pkPathWithSection` | 17077 | 6 | organisation | ● |  |  |  |  | ● | 2 |
| `_pkSwitchToFolder` | 17086 | 14 | organisation | ● |  |  |  |  | ● | 0 |
| `togglePick` | 17100 | 14 | other / helpers | ● |  |  |  |  |  | 0 |
| `_pkUpdateTargetLabel` | 17116 | 12 | other / helpers | ● |  |  |  |  | ● | 5 |
| `pkRowMenu` | 17134 | 9 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `pkNoteRowMenu` | 17143 | 8 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `pkSetTarget` | 17151 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkClearTarget` | 17158 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `pkRename` | 17165 | 7 | other / helpers | ● |  |  |  |  | ● | 0 |
| `pkRenameSave` | 17172 | 10 | other / helpers | ● |  |  |  |  | ● | 0 |
| `pkRenameCancel` | 17182 | 7 | other / helpers | ● |  |  |  |  | ● | 0 |
| `pkDelete` | 17189 | 14 | destructive | ● |  |  |  |  | ● | 0 |
| `pkDStart` | 17203 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkDEnd` | 17209 | 5 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkDOver` | 17214 | 19 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkDLeave` | 17233 | 3 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkDDrop` | 17236 | 17 | other / helpers |  |  |  |  |  | ● | 0 |
| `_pkClearDI` | 17253 | 5 | other / helpers |  |  |  |  |  | ● | 7 |
| `pkMoveFolder` | 17262 | 24 | organisation | ● | ● |  | ● |  | ● | 1 |
| `pkNoteOpen` | 17290 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkNoteDStart` | 17294 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkNoteDEnd` | 17300 | 5 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkMoveNote` | 17307 | 16 | other / helpers | ● | ● |  |  |  | ● | 1 |
| `pkNoteRename` | 17323 | 7 | other / helpers | ● |  |  |  |  | ● | 0 |
| `pkNoteRenameSave` | 17330 | 14 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `pkNoteRenameCancel` | 17344 | 7 | other / helpers | ● |  |  |  |  | ● | 0 |
| `pkNoteDelete` | 17351 | 6 | destructive | ● |  |  |  |  | ● | 0 |
| `mobBack` | 17359 | 1 | other / helpers |  |  |  |  |  |  | 0 |
| `tapCtx` | 17360 | 6 | menus / dialogs |  |  |  |  |  |  | 0 |
| `getAllTags` | 17370 | 8 | tags / types / tabs | ● |  |  |  |  | ● | 5 |
| `selTag` | 17379 | 7 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `toggleTagPanel` | 17387 | 4 | tags / types / tabs |  |  |  |  |  |  | 0 |
| `backToMyWallCat` | 17396 | 5 | other / helpers |  |  |  |  |  | ● | 0 |
| `selKind` | 17401 | 7 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `toggleNtiSection` | 17408 | 1 | organisation |  |  |  |  |  | ● | 0 |
| `togNtiCatSB` | 17409 | 1 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `renderNTISection` | 17410 | 51 | render | ● |  |  |  |  | ● | 1 |
| `renderTagPanel` | 17462 | 17 | render |  |  |  |  |  | ● | 1 |
| `renderTagEditor` | 17480 | 15 | render |  |  |  |  |  | ● | 4 |
| `_allTags` | 17499 | 5 | tags / types / tabs | ● |  |  |  |  | ● | 1 |
| `showTagSuggest` | 17504 | 10 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_tagSuggestPlace` | 17519 | 9 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `hideTagSuggest` | 17528 | 3 | tags / types / tabs |  |  |  |  |  | ● | 3 |
| `_pickTagSuggestion` | 17531 | 6 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `addTag` | 17538 | 11 | tags / types / tabs |  |  |  |  |  | ● | 3 |
| `rmTag` | 17550 | 5 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `tagKey` | 17556 | 7 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `tagInputChanged` | 17569 | 12 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `hexDarken` | 17599 | 5 | other / helpers |  |  |  |  |  | ● | 7 |
| `hexLighten` | 17604 | 5 | other / helpers |  |  |  |  |  | ● | 4 |
| `_sbLum` | 17620 | 14 | other / helpers |  |  |  |  |  | ● | 6 |
| `f` | 17631 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `applySidebarInk` | 17634 | 22 | theme / appearance |  |  |  |  |  | ● | 1 |
| `set` | 17640 | 1 | other / helpers |  |  |  |  |  | ● | 30 |
| `_paneSafePaper` | 17677 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `_paneInk` | 17684 | 6 | theme / appearance |  |  |  |  |  | ● | 4 |
| `_accentInk` | 17692 | 14 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `worst` | 17702 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `applyPaneInk` | 17706 | 40 | theme / appearance |  |  |  |  |  | ● | 1 |
| `set` | 17709 | 1 | other / helpers |  |  |  |  |  | ● | 30 |
| `applyTheme` | 17746 | 29 | theme / appearance |  |  |  |  |  | ● | 6 |
| `applyPreset` | 17776 | 7 | theme / appearance | ● |  |  |  |  | ● | 0 |
| `setCustomColor` | 17784 | 18 | theme / appearance | ● |  |  |  |  | ● | 2 |
| `setCustomColorHex` | 17803 | 6 | theme / appearance |  |  |  |  |  | ● | 0 |
| `resetTheme` | 17810 | 6 | theme / appearance | ● |  |  |  |  | ● | 0 |
| `openTheme` | 17817 | 5 | theme / appearance |  |  |  |  |  | ● | 0 |
| `closeTheme` | 17823 | 3 | theme / appearance |  |  |  |  |  | ● | 0 |
| `renderThemeModal` | 17827 | 107 | render | ● |  |  |  |  | ● | 8 |
| `ctxColorSwatches` | 17937 | 8 | theme / appearance | ● |  |  |  |  | ● | 1 |
| `setFolderColor` | 17946 | 9 | organisation | ● | ● |  | ● |  | ● | 1 |
| `setFolderBold` | 17955 | 7 | organisation | ● | ● |  | ● |  | ● | 0 |
| `renderSection` | 17967 | 23 | render | ● |  |  |  |  | ● | 1 |
| `toggleSection` | 17992 | 12 | organisation | ● |  |  |  |  | ● | 0 |
| `addFolderInSec` | 18006 | 4 | organisation |  |  |  |  |  | ● | 0 |
| `addRootFolder` | 18012 | 4 | organisation |  |  |  |  |  | ● | 0 |
| `ctxSecColorSwatches` | 18019 | 8 | theme / appearance | ● |  |  |  |  | ● | 1 |
| `setSectionColor` | 18027 | 7 | organisation | ● | ● |  | ● |  | ● | 1 |
| `setSectionBold` | 18034 | 7 | organisation | ● | ● |  | ● |  | ● | 0 |
| `_uiStamp` | 18049 | 1 | cloud sync / auth |  |  |  |  |  | ● | 5 |
| `ctxSfColorSwatches` | 18050 | 10 | find / smart views |  |  |  |  |  | ● | 1 |
| `setSmartViewColor` | 18060 | 9 | find / smart views |  | ● |  |  |  | ● | 0 |
| `showSmartViewCtx` | 18069 | 15 | find / smart views |  |  |  |  |  | ● | 1 |
| `toggleSmartViews` | 18084 | 6 | find / smart views |  |  |  |  |  | ● | 0 |
| `startRenSmartViews` | 18090 | 9 | find / smart views |  |  |  |  |  | ● | 0 |
| `finRenSmartViews` | 18099 | 7 | find / smart views |  | ● |  |  |  | ● | 0 |
| `_buildSecCtxMain` | 18107 | 15 | menus / dialogs | ● |  |  |  |  | ● | 2 |
| `showSecCtx` | 18122 | 11 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_secCtxBack` | 18133 | 3 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_secCtxSub` | 18136 | 7 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `startRenSec` | 18145 | 9 | other / helpers | ● |  |  |  |  | ● | 0 |
| `finRenSec` | 18155 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `mkSection` | 18165 | 8 | organisation | ● | ● |  |  |  | ● | 0 |
| `delSection` | 18175 | 8 | organisation | ● | ● |  |  |  | ● | 0 |
| `moveFolderToSec` | 18185 | 6 | organisation | ● | ● |  |  |  | ● | 0 |
| `rootSectionMoves` | 18193 | 7 | organisation | ● |  |  |  |  | ● | 1 |
| `_isSysFolder` | 18208 | 9 | organisation | ● |  |  |  |  | ● | 4 |
| `convertFolderToSection` | 18217 | 22 | organisation | ● |  |  |  |  | ● | 0 |
| `_moveNotesThenConvert` | 18239 | 17 | other / helpers | ● |  |  |  |  | ● | 0 |
| `_doFolderToSection` | 18256 | 18 | organisation | ● | ● |  |  |  | ● | 1 |
| `sectionToFolderRows` | 18274 | 6 | organisation | ● |  |  |  |  | ● | 1 |
| `confirmSectionToFolder` | 18280 | 10 | organisation | ● |  |  |  |  | ● | 0 |
| `_doSectionToFolder` | 18290 | 16 | organisation | ● | ● |  | ● |  | ● | 0 |
| `secDStart` | 18310 | 9 | other / helpers |  |  |  |  |  | ● | 0 |
| `secDEnd` | 18320 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `secDOver` | 18327 | 10 | other / helpers |  |  |  |  |  | ● | 0 |
| `secDLeave` | 18338 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `secDDrop` | 18345 | 17 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `snapshotState` | 18366 | 7 | persistence |  |  |  |  |  | ● | 2 |
| `undo` | 18374 | 9 | other / helpers | ● | ● |  | ● |  | ● | 1 |
| `redo` | 18384 | 9 | other / helpers | ● | ● |  | ● |  | ● | 1 |
| `updateUndoRedoBtns` | 18394 | 5 | other / helpers |  |  |  |  |  | ● | 3 |
| `_addTombstones` | 18408 | 10 | cloud sync / auth |  |  |  |  |  | ● | 6 |
| `_tombstoneTrashEntry` | 18421 | 10 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `trashFolder` | 18431 | 28 | organisation | ● | ● |  |  |  | ● | 3 |
| `trashArt` | 18460 | 11 | destructive | ● | ● |  |  |  | ● | 2 |
| `openTrash` | 18472 | 5 | destructive |  |  |  |  |  | ● | 0 |
| `closeTrash` | 18478 | 3 | destructive |  |  |  |  |  | ● | 0 |
| `renderTrashModal` | 18482 | 31 | render | ● |  |  |  |  | ● | 5 |
| `restoreItem` | 18514 | 52 | destructive | ● | ● |  |  |  | ● | 0 |
| `permDeleteItem` | 18567 | 6 | destructive | ● | ● |  |  |  | ● | 0 |
| `emptyTrash` | 18574 | 8 | destructive | ● | ● |  | ● |  | ● | 0 |
| `_popCleanupOrphans` | 18585 | 15 | menus / dialogs | ● |  |  | ● |  | ● | 1 |
| `updateTrashBtn` | 18601 | 6 | destructive | ● |  |  |  |  | ● | 4 |
| `_ctxIsCard` | 18627 | 1 | menus / dialogs |  |  |  |  |  | ● | 3 |
| `showArtCtx` | 18629 | 20 | menus / dialogs | ● |  |  |  |  | ● | 1 |
| `_ctxPlaceCard` | 18652 | 8 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `_ctxRepaint` | 18663 | 1 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `_artCtxGroups` | 18675 | 37 | organisation |  |  |  |  |  | ● | 1 |
| `sub` | 18678 | 1 | other / helpers |  |  |  |  |  | ● | 5 |
| `_buildArtCtxMain` | 18712 | 6 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `_ctxBack` | 18718 | 6 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `_ctxSub` | 18724 | 49 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `detachArt` | 18775 | 16 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `openAttachArt` | 18793 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `showArtFolderPicker` | 18795 | 35 | organisation | ● |  |  |  |  | ● | 3 |
| `rows` | 18800 | 12 | other / helpers |  |  |  |  |  | ● | 3 |
| `createFolderFromPicker` | 18833 | 34 | organisation | ● | ● |  |  |  | ● | 0 |
| `fpFilter` | 18870 | 32 | find / smart views | ● |  |  |  |  | ● | 0 |
| `rows2` | 18876 | 11 | other / helpers |  |  |  |  |  | ● | 1 |
| `toggleArtFolder` | 18904 | 17 | organisation | ● | ● |  |  |  | ● | 0 |
| `applyFontSizes` | 18928 | 10 | other / helpers |  |  |  |  |  | ● | 3 |
| `r` | 18932 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `applyLineSpacing` | 18941 | 6 | other / helpers |  |  |  |  |  | ● | 2 |
| `setLineSpacing` | 18947 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `setFontSize` | 18957 | 9 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `resetFontSizes` | 18968 | 7 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `enableAutoSave` | 18995 | 37 | other / helpers |  |  |  |  |  | ● | 0 |
| `_writeToFile` | 19034 | 18 | other / helpers |  |  |  |  | ● | ● | 3 |
| `scheduleAutoSave` | 19057 | 7 | other / helpers |  |  |  |  |  | ● | 2 |
| `updateSaveUI` | 19066 | 30 | other / helpers |  |  |  |  |  | ● | 8 |
| `_bkCfg` | 19142 | 7 | other / helpers |  |  |  |  |  | ● | 8 |
| `_bkSaveCfg` | 19149 | 3 | other / helpers |  | ● |  |  |  | ● | 5 |
| `_bkIdb` | 19154 | 8 | other / helpers |  |  |  |  |  | ● | 3 |
| `_bkPutHandle` | 19162 | 8 | other / helpers |  |  |  |  |  | ● | 1 |
| `_bkGetHandle` | 19170 | 10 | other / helpers |  |  |  |  |  | ● | 2 |
| `_bkClearHandle` | 19180 | 9 | other / helpers |  |  |  |  |  | ● | 1 |
| `_bkStamp` | 19191 | 4 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `p` | 19192 | 1 | other / helpers |  |  |  |  |  | ● | 8 |
| `_bkFileName` | 19197 | 5 | other / helpers |  |  |  |  |  | ● | 2 |
| `p` | 19198 | 1 | other / helpers |  |  |  |  |  | ● | 8 |
| `_bkDue` | 19202 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `_bkAgeDays` | 19209 | 4 | other / helpers |  |  |  |  |  | ● | 2 |
| `_bkPrune` | 19219 | 23 | other / helpers |  |  |  |  |  | ● | 1 |
| `runBackupNow` | 19247 | 33 | export / import / backup |  | ● |  |  | ● | ● | 2 |
| `chooseBackupFolder` | 19283 | 11 | export / import / backup |  |  |  |  |  | ● | 1 |
| `turnOffBackups` | 19295 | 6 | export / import / backup |  |  |  |  |  | ● | 0 |
| `setBackupEvery` | 19302 | 3 | export / import / backup |  |  |  |  |  | ● | 0 |
| `downloadDatedBackup` | 19309 | 14 | export / import / backup |  | ● |  |  | ● | ● | 1 |
| `_bkMaybeAuto` | 19327 | 21 | other / helpers |  |  |  |  |  | ● | 1 |
| `_bkStatusHTML` | 19350 | 22 | other / helpers |  |  |  |  |  | ● | 3 |
| `sel` | 19356 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `_bkRenderStatus` | 19372 | 4 | other / helpers |  |  |  |  |  | ● | 5 |
| `openBackupModal` | 19376 | 31 | export / import / backup |  |  |  |  |  | ● | 0 |
| `getTimestampedName` | 19410 | 6 | cloud sync / auth |  |  |  |  |  | ● | 2 |
| `_sbDDFit` | 19424 | 20 | other / helpers |  |  |  |  |  | ● | 3 |
| `toggleSBMenu` | 19445 | 6 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `closeSBMenu` | 19451 | 3 | menus / dialogs |  |  |  |  |  | ● | 5 |
| `toggleSBTools` | 19455 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeSBTools` | 19461 | 3 | other / helpers |  |  |  |  |  | ● | 3 |
| `toggleSBHome` | 19467 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeSBHome` | 19473 | 3 | other / helpers |  |  |  |  |  | ● | 4 |
| `openLegacyApp` | 19480 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `artSnippet` | 19492 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `artCard` | 19500 | 31 | menus / dialogs |  |  |  |  |  | ● | 18 |
| `toggleListView` | 19533 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `adjustP3Layout` | 19551 | 15 | other / helpers |  |  |  |  |  | ● | 10 |
| `openP2` | 19568 | 5 | other / helpers |  |  |  |  |  | ● | 2 |
| `closeP2` | 19573 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `_dedupePrimaryFolders` | 19596 | 37 | organisation | ● | ● |  |  |  | ● | 2 |
| `noteCount` | 19605 | 1 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_openNewNoteWindow` | 19651 | 15 | other / helpers |  |  |  |  |  | ● | 6 |
| `quickCapture` | 19666 | 26 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `quickCaptureWithKind` | 19697 | 22 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `backFromP3` | 19723 | 5 | other / helpers |  |  |  |  |  | ● | 1 |
| `showPane` | 19733 | 16 | other / helpers |  |  |  |  |  | ● | 23 |
| `_getOrCreateFirebaseApp` | 19788 | 7 | cloud sync / auth |  |  | ● |  |  | ● | 3 |
| `initAuth` | 19796 | 51 | cloud sync / auth |  |  | ● |  |  | ● | 2 |
| `doLogin` | 19848 | 12 | other / helpers |  |  | ● |  |  | ● | 0 |
| `refreshApp` | 19862 | 10 | render |  |  |  |  |  | ● | 0 |
| `doSignOut` | 19873 | 15 | cloud sync / auth |  |  |  |  |  | ● | 0 |
| `getSyncConfig` | 19889 | 1 | other / helpers |  |  |  |  |  | ● | 9 |
| `_saveSyncConfig` | 19890 | 1 | persistence |  | ● |  |  |  | ● | 1 |
| `clearSyncConfig` | 19891 | 1 | other / helpers |  | ● |  |  |  | ● | 2 |
| `setSyncStatus` | 19893 | 15 | other / helpers |  |  |  |  |  | ● | 22 |
| `_loadScript` | 19909 | 8 | other / helpers |  |  |  |  |  | ● | 6 |
| `_syncErrorToast` | 19937 | 21 | cloud sync / auth |  |  |  |  |  | ● | 5 |
| `initSync` | 19959 | 91 | other / helpers |  |  | ● |  |  | ● | 3 |
| `syncNow` | 20052 | 36 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `_mergeById` | 20089 | 16 | cloud sync / auth |  |  |  |  |  | ● | 3 |
| `_mergeTabStamps` | 20106 | 11 | cloud sync / auth |  |  |  |  |  | ● | 2 |
| `norm` | 20107 | 1 | other / helpers |  |  |  |  |  | ● | 18 |
| `_mergeTabMaps` | 20124 | 18 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `norm` | 20125 | 1 | other / helpers |  |  |  |  |  | ● | 18 |
| `_mergeStrs` | 20142 | 1 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `_mergeMapById` | 20158 | 13 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `norm` | 20159 | 1 | other / helpers |  |  |  |  |  | ● | 18 |
| `_mergeStampMap` | 20172 | 6 | cloud sync / auth |  |  |  |  |  | ● | 2 |
| `norm` | 20173 | 1 | other / helpers |  |  |  |  |  | ● | 18 |
| `_mergeValMap` | 20181 | 9 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `norm` | 20182 | 1 | other / helpers |  |  |  |  |  | ● | 18 |
| `mergeDB` | 20190 | 63 | cloud sync / auth |  |  |  |  |  | ● | 4 |
| `_tadd` | 20230 | 1 | other / helpers |  |  |  |  |  | ● | 4 |
| `_alive` | 20240 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_b64enc` | 20254 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `_b64dec` | 20255 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `_syncSleep` | 20257 | 1 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `_syncSig` | 20263 | 5 | cloud sync / auth |  |  |  |  |  | ● | 2 |
| `_flushAllEditors` | 20278 | 9 | other / helpers |  |  |  |  |  | ● | 5 |
| `_edCleanHTML` | 20290 | 6 | editor / pop-out |  |  |  |  |  | ● | 5 |
| `_edApplyRemote` | 20307 | 38 | editor / pop-out | ● |  |  |  |  | ● | 1 |
| `put` | 20310 | 18 | other / helpers |  |  |  |  |  | ● | 3 |
| `_readCloudDB` | 20354 | 34 | cloud sync / auth |  |  | ● |  |  | ● | 2 |
| `_writeCloudDB` | 20388 | 9 | cloud sync / auth |  |  | ● |  |  | ● | 2 |
| `_doPush` | 20417 | 44 | other / helpers |  | ● |  |  |  | ● | 1 |
| `pushToCloud` | 20462 | 9 | cloud sync / auth |  |  |  |  |  | ● | 6 |
| `flushPendingPush` | 20476 | 5 | other / helpers |  |  |  |  |  | ● | 3 |
| `_preferStreaming` | 20498 | 3 | other / helpers |  |  |  |  |  | ● | 1 |
| `_noteTransportFailure` | 20505 | 5 | other / helpers |  |  |  |  |  | ● | 1 |
| `_reconcileNow` | 20530 | 27 | other / helpers |  |  |  |  |  | ● | 2 |
| `_startReconcile` | 20557 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `_scheduleListenerRestart` | 20566 | 11 | other / helpers |  |  | ● |  |  | ● | 1 |
| `_pullRemote` | 20578 | 83 | reminders / review | ● | ● |  | ● |  | ● | 2 |
| `generateNotebookId` | 20663 | 3 | other / helpers |  |  |  |  | ● | ● | 2 |
| `_syncAgo` | 20673 | 9 | cloud sync / auth |  |  |  |  |  | ● | 2 |
| `_syncDiagnosticsHTML` | 20682 | 21 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `openSyncModal` | 20703 | 61 | menus / dialogs |  |  | ● |  |  | ● | 0 |
| `closeSyncModal` | 20765 | 1 | menus / dialogs |  |  |  |  |  | ● | 3 |
| `parseFirebaseConfig` | 20767 | 17 | cloud sync / auth |  |  | ● |  |  | ● | 1 |
| `connectSync` | 20785 | 18 | other / helpers |  |  | ● |  |  | ● | 0 |
| `loginResetSync` | 20804 | 10 | other / helpers |  |  |  |  |  | ● | 0 |
| `disconnectSync` | 20815 | 10 | other / helpers |  |  |  |  |  | ● | 0 |
| `_uiTier` | 20891 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `_normalizePaneState` | 20900 | 17 | other / helpers |  |  |  |  |  | ● | 1 |
| `_onViewportResize` | 20918 | 47 | other / helpers |  |  |  |  |  | ● | 0 |
| `_sbFitHeader` | 20979 | 9 | other / helpers |  |  |  |  |  | ● | 3 |
| `sfOrdered` | 21026 | 8 | find / smart views |  |  |  |  |  | ● | 7 |
| `moveSfItem` | 21034 | 12 | find / smart views |  | ● |  |  |  | ● | 0 |
| `ensureNoteKinds` | 21069 | 6 | tags / types / tabs |  |  |  |  |  | ● | 7 |
| `noteKinds` | 21075 | 1 | tags / types / tabs |  |  |  |  |  | ● | 19 |
| `ensureNoteKindCats` | 21076 | 6 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `noteKindCats` | 21082 | 1 | tags / types / tabs |  |  |  |  |  | ● | 17 |
| `kindsInCat` | 21083 | 1 | tags / types / tabs |  |  |  |  |  | ● | 4 |
| `kindById` | 21084 | 1 | tags / types / tabs |  |  |  |  |  | ● | 9 |
| `artKinds` | 21085 | 4 | tags / types / tabs |  |  |  |  |  | ● | 19 |
| `artKind` | 21089 | 1 | tags / types / tabs |  |  |  |  |  |  | 0 |
| `untouchedDays` | 21090 | 4 | other / helpers |  |  |  |  |  | ● | 3 |
| `isNagNote` | 21095 | 2 | other / helpers |  |  |  |  |  | ● | 1 |
| `isMyWallNote` | 21098 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_flushEd` | 21107 | 13 | other / helpers | ● |  |  |  |  | ● | 8 |
| `setNoteKind` | 21120 | 6 | tags / types / tabs | ● | ● |  |  |  |  | 0 |
| `toggleNoteKind` | 21126 | 12 | tags / types / tabs | ● | ● |  | ● |  | ● | 0 |
| `finishNote` | 21138 | 7 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `unfinishNote` | 21145 | 6 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `addNoteKindTab` | 21151 | 13 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `order` | 21158 | 1 | other / helpers |  |  |  |  |  |  | 0 |
| `renameNoteKind` | 21164 | 10 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `kindBarHTML` | 21176 | 50 | tags / types / tabs |  |  |  |  |  | ● | 4 |
| `_attachCount` | 21229 | 3 | other / helpers |  |  |  |  |  | ● | 4 |
| `mwCatIsOpen` | 21235 | 4 | other / helpers | ● |  |  |  |  | ● | 2 |
| `mwToggleAllCats` | 21239 | 10 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `mwToggleViewMode` | 21249 | 6 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `renderMyWall` | 21255 | 92 | render | ● |  |  |  |  | ● | 1 |
| `_kindLatest` | 21289 | 1 | tags / types / tabs |  |  |  |  |  | ● | 4 |
| `_sortKinds` | 21290 | 4 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `isJournal` | 21351 | 9 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `getSmartGroups` | 21362 | 61 | organisation | ● |  |  |  |  | ● | 4 |
| `ts` | 21364 | 1 | other / helpers |  |  |  |  |  | ● | 12 |
| `sod` | 21365 | 1 | other / helpers |  |  |  |  |  | ● | 2 |
| `togSfGrp` | 21423 | 6 | find / smart views |  |  |  |  |  | ● | 0 |
| `togMwCat` | 21429 | 5 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallCatDStart` | 21441 | 10 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallCatDEnd` | 21451 | 5 | other / helpers |  |  |  |  |  | ● | 1 |
| `wallCatDOver` | 21456 | 9 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallCatDLeave` | 21465 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallCatDDrop` | 21469 | 30 | other / helpers |  | ● |  |  |  | ● | 0 |
| `wallGrpDStart` | 21499 | 9 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallGrpDEnd` | 21508 | 5 | other / helpers |  |  |  |  |  | ● | 3 |
| `wallGrpDOver` | 21513 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallGrpDLeave` | 21521 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallGrpDDrop` | 21525 | 18 | other / helpers |  | ● |  |  |  | ● | 0 |
| `moveWallKind` | 21543 | 10 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `showWallKindCtx` | 21553 | 23 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_groupUnion` | 21576 | 6 | organisation |  |  |  |  |  | ● | 1 |
| `getSmartArts` | 21583 | 32 | find / smart views | ● |  |  |  |  | ● | 6 |
| `renderSmartSection` | 21616 | 31 | render |  |  |  |  |  | ● | 1 |
| `toggleFav` | 21648 | 9 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `togglePin` | 21658 | 9 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `promptAddArtTag` | 21669 | 56 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `applyTag` | 21671 | 14 | tags / types / tabs |  | ● |  |  |  |  | 0 |
| `tagPickerRender` | 21685 | 29 | tags / types / tabs | ● |  |  |  |  | ● | 4 |
| `tagPickerRender` | 21725 | 28 | tags / types / tabs | ● |  |  |  |  | ● | 4 |
| `tagPickerApply` | 21753 | 16 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `removeArtTag` | 21769 | 9 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `showSfItemCtx` | 21778 | 18 | find / smart views |  |  |  |  |  | ● | 1 |
| `renameSfItem` | 21796 | 11 | find / smart views |  |  |  |  |  | ● | 0 |
| `finRenameSfItem` | 21807 | 5 | find / smart views |  | ● |  |  |  | ● | 0 |
| `setSfItemColor` | 21812 | 7 | find / smart views |  | ● |  |  |  | ● | 1 |
| `ctxSfItemColorSwatches` | 21819 | 8 | find / smart views |  |  |  |  |  | ● | 1 |
| `setSmartViewBold` | 21827 | 5 | find / smart views |  | ● |  |  |  | ● | 0 |
| `setSfItemBold` | 21832 | 7 | find / smart views |  | ● |  |  |  | ● | 0 |
| `toggleTagSection` | 21839 | 6 | organisation |  |  |  |  |  | ● | 0 |
| `showTagSecCtx` | 21845 | 17 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `ctxTagSecColorSwatches` | 21862 | 7 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `setTagSecColor` | 21869 | 5 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `renameTagSection` | 21874 | 9 | organisation |  |  |  |  |  | ● | 0 |
| `finRenTagSec` | 21883 | 7 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `promptAddGlobalTag` | 21891 | 9 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `addGlobalTag` | 21900 | 7 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `showTagCtx` | 21907 | 13 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `renameTag` | 21920 | 10 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `finRenameTag` | 21930 | 11 | tags / types / tabs | ● | ● |  | ● |  | ● | 2 |
| `deleteTag` | 21941 | 7 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `finRenameArtTitle` | 21948 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `renderTagSection` | 21957 | 33 | render |  |  |  |  |  | ● | 1 |
| `startRenameArtTitle` | 21990 | 10 | other / helpers | ● |  |  |  |  | ● | 0 |
| `_flushEverythingOut` | 22072 | 8 | other / helpers |  | ● |  |  |  | ● | 2 |
| `_a11yWireClickables` | 22291 | 9 | other / helpers |  |  |  |  |  | ● | 3 |
