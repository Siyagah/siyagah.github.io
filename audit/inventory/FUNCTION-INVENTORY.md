# Siyagah — Function Inventory

*Generated mechanically by `node tools/inventory.mjs` from `index.html`.
Do not hand-edit: re-run it.*

| | |
|---|---|
| App version | v04.37 |
| Generated | 2026-09-19 |
| Application script | 19,680 lines |
| Application-defined functions | **1300** |
| …reachable (called in script or named in markup) | 1270 |
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

- **other / helpers** — 565
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
| `_fnv1a` | 2999 | 5 | other / helpers |  |  |  |  |  | ● | 4 |
| `_salvageEntry` | 3004 | 8 | other / helpers |  |  |  |  |  | ● | 1 |
| `_salvageKey` | 3012 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `_salvagePrune` | 3016 | 12 | other / helpers |  |  |  |  |  | ● | 1 |
| `_mergeSalvage` | 3028 | 14 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `_safeURL` | 3099 | 12 | other / helpers |  |  |  |  |  | ● | 3 |
| `_safeImgSrc` | 3111 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `_sanitiseForeignHTML` | 3117 | 45 | other / helpers |  |  |  |  |  | ● | 2 |
| `_sanitiseDBContent` | 3162 | 10 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_hardenLinks` | 3175 | 10 | theme / appearance |  |  |  |  |  | ● | 1 |
| `_repairDB` | 3186 | 40 | other / helpers |  |  |  |  |  | ● | 6 |
| `loadDB` | 3227 | 154 | startup / load / migration | ● | ● |  | ● |  | ● | 1 |
| `_tiScheduleAutoSave` | 3416 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `_save` | 3436 | 45 | persistence |  | ● |  |  |  | ● | 13 |
| `persist` | 3481 | 1 | persistence |  | ● |  |  |  | ● | 251 |
| `_snapshotShell` | 3551 | 5 | export / import / backup |  |  |  |  | ● | ● | 1 |
| `_cleanExportRoot` | 3556 | 70 | export / import / backup |  |  |  |  | ● | ● | 1 |
| `getExportHTML` | 3629 | 29 | export / import / backup |  |  |  |  | ● | ● | 5 |
| `exportFile` | 3659 | 11 | export / import / backup |  | ● |  |  | ● | ● | 1 |
| `exportDeploy` | 3675 | 14 | export / import / backup |  | ● |  |  | ● | ● | 0 |
| `exportJSON` | 3689 | 1 | export / import / backup |  |  |  |  | ● | ● | 0 |
| `_runImport` | 3709 | 38 | export / import / backup |  |  |  |  |  | ● | 2 |
| `_recoveryOpen` | 3769 | 10 | other / helpers |  |  |  |  |  | ● | 3 |
| `_recoveryTx` | 3779 | 9 | other / helpers |  |  |  |  |  | ● | 6 |
| `_recoverySave` | 3790 | 24 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_recoveryList` | 3814 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `_recoveryRestore` | 3821 | 13 | destructive | ● | ● |  | ● |  | ● | 1 |
| `openRecoveryModal` | 3834 | 12 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `restoreRecovery` | 3846 | 6 | destructive |  |  |  |  |  | ● | 0 |
| `_choiceModal` | 3862 | 23 | menus / dialogs |  |  |  |  |  | ● | 3 |
| `finish` | 3865 | 4 | other / helpers |  |  |  |  |  | ● | 2 |
| `onKey` | 3869 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_choicePick` | 3885 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_takeRecoveryCopy` | 3889 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `importJSON` | 3896 | 34 | export / import / backup | ● | ● |  | ● |  | ● | 0 |
| `toast` | 3932 | 1 | menus / dialogs |  |  |  |  |  | ● | 257 |
| `mkDefaults` | 3935 | 17 | other / helpers |  |  |  |  |  | ● | 1 |
| `uid` | 3954 | 1 | other / helpers |  |  |  |  | ● | ● | 91 |
| `esc` | 3955 | 1 | other / helpers |  |  |  |  |  | ● | 454 |
| `strip` | 3956 | 1 | other / helpers |  |  |  |  |  | ● | 4 |
| `_wordSnippet` | 3957 | 5 | other / helpers |  |  |  |  |  |  | 0 |
| `fmtD` | 3962 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `fmtDs` | 3963 | 6 | other / helpers |  |  |  |  |  | ● | 7 |
| `isJournalNote` | 3973 | 5 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `jrnEntryDate` | 3978 | 3 | other / helpers |  |  |  |  |  | ● | 4 |
| `setJrnEntryDate` | 3981 | 7 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_dlFlipDate` | 3997 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `_dateLineHTML` | 4005 | 18 | other / helpers |  |  |  |  |  | ● | 2 |
| `_p3MetaRowHTML` | 4035 | 8 | other / helpers |  |  |  |  |  | ● | 2 |
| `_isPlaceholder` | 4046 | 7 | other / helpers |  |  |  |  |  | ● | 2 |
| `chOf` | 4053 | 1 | other / helpers | ● |  |  |  |  | ● | 31 |
| `descOf` | 4056 | 1 | other / helpers |  |  |  |  |  | ● | 8 |
| `pathOf` | 4061 | 1 | other / helpers | ● |  |  |  |  | ● | 10 |
| `cntOf` | 4067 | 1 | other / helpers | ● |  |  |  |  | ● | 6 |
| `artsIn` | 4068 | 1 | other / helpers | ● |  |  |  |  | ● | 3 |
| `_autoLeavePrimary` | 4078 | 10 | other / helpers | ● |  |  |  |  | ● | 8 |
| `render` | 4090 | 1 | render |  |  |  |  |  | ● | 39 |
| `_renderPreserveEdit` | 4094 | 23 | render |  |  |  |  |  | ● | 3 |
| `_searchWords` | 4118 | 1 | find / smart views |  |  |  |  |  | ● | 2 |
| `_matchesAllWords` | 4119 | 1 | other / helpers |  |  |  |  |  | ● | 9 |
| `renderTree` | 4120 | 42 | render | ● |  |  |  |  | ● | 97 |
| `trNode` | 4163 | 20 | other / helpers |  |  |  |  |  | ● | 4 |
| `ensureFolderGroups` | 4190 | 6 | organisation |  |  |  |  |  | ● | 6 |
| `folderGroups` | 4196 | 1 | organisation |  |  |  |  |  | ● | 3 |
| `folderGroupOf` | 4197 | 1 | organisation |  |  |  |  |  | ● | 2 |
| `trGroupedKids` | 4198 | 27 | organisation |  |  |  |  |  | ● | 1 |
| `togFolderGroup` | 4225 | 5 | organisation |  |  |  |  |  | ● | 0 |
| `showFolderGroupCtx` | 4230 | 15 | organisation |  |  |  |  |  | ● | 0 |
| `addFolderGroup` | 4245 | 8 | organisation |  | ● |  |  |  | ● | 0 |
| `addFolderGroupThenMove` | 4253 | 13 | organisation | ● | ● |  |  |  | ● | 0 |
| `renameFolderGroup` | 4266 | 5 | organisation |  | ● |  |  |  | ● | 0 |
| `deleteFolderGroup` | 4271 | 14 | organisation | ● | ● |  |  |  | ● | 0 |
| `moveFolderToGroup` | 4285 | 5 | organisation | ● | ● |  |  |  | ● | 0 |
| `renderP2H` | 4291 | 117 | render | ● |  |  |  |  | ● | 21 |
| `renderP2C` | 4409 | 160 | render | ● |  |  |  |  | ● | 105 |
| `_navBtnsHTML` | 4575 | 8 | other / helpers |  |  |  |  |  | ● | 1 |
| `renderP3H` | 4583 | 221 | render | ● |  |  |  |  | ● | 89 |
| `renderP3C` | 4805 | 101 | render | ● |  |  |  |  | ● | 91 |
| `collapseFolder` | 4910 | 4 | organisation |  |  |  |  |  | ● | 2 |
| `selFolder` | 4915 | 14 | organisation |  |  |  |  |  | ● | 7 |
| `selArt` | 4929 | 8 | other / helpers | ● | ● |  |  |  | ● | 7 |
| `back` | 4944 | 1 | other / helpers |  |  |  |  |  |  | 0 |
| `togExp` | 4945 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `toggleSB` | 4951 | 11 | other / helpers |  |  |  |  |  | ● | 0 |
| `updateSbToggle` | 4963 | 13 | other / helpers |  |  |  |  |  | ● | 6 |
| `_fwOwns` | 4993 | 1 | editor / pop-out |  |  |  |  |  | ● | 3 |
| `_fwRaise` | 4994 | 6 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `startEdit` | 5000 | 5 | editor / pop-out | ● |  |  |  |  | ● | 1 |
| `cancelEdit` | 5005 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `saveArt` | 5006 | 41 | persistence | ● | ● |  |  |  | ● | 8 |
| `_sameArr` | 5037 | 1 | other / helpers |  |  |  |  |  | ● | 2 |
| `doSearch` | 5057 | 1 | find / smart views |  |  |  |  |  | ● | 1 |
| `clearSearch` | 5058 | 9 | find / smart views |  |  |  |  |  | ● | 1 |
| `restoreLastSearch` | 5067 | 7 | find / smart views |  |  |  |  |  | ● | 0 |
| `focusSidebarSearch` | 5074 | 4 | find / smart views |  |  |  |  |  | ● | 0 |
| `_updateSearchAccessUI` | 5078 | 6 | find / smart views |  |  |  |  |  | ● | 3 |
| `_renderP2SearchBar` | 5084 | 9 | render |  |  |  |  |  | ● | 2 |
| `_renderP3SearchBar` | 5093 | 14 | render | ● |  |  |  |  | ● | 2 |
| `goHome` | 5113 | 16 | other / helpers |  |  |  |  |  | ● | 0 |
| `ec` | 5130 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_alignBtnsHTML` | 5131 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `_txszStep` | 5144 | 15 | other / helpers |  |  |  |  |  | ● | 2 |
| `_txStepIn` | 5162 | 49 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `inEd` | 5164 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `edFontStep` | 5211 | 10 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_txClearIn` | 5225 | 24 | other / helpers |  |  |  |  |  | ● | 2 |
| `inRange` | 5230 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `edClearFmt` | 5249 | 8 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_curHeadingTag` | 5263 | 12 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `shiftHeadingLevel` | 5275 | 14 | other / helpers |  |  |  |  |  | ● | 1 |
| `shiftAllHeadingsMenu` | 5289 | 8 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `shiftAllHeadings` | 5297 | 21 | other / helpers |  |  |  |  |  | ● | 0 |
| `fb` | 5318 | 15 | other / helpers |  |  |  |  |  | ● | 0 |
| `_edHost` | 5346 | 7 | editor / pop-out |  |  |  |  |  | ● | 7 |
| `_edActive` | 5353 | 9 | editor / pop-out |  |  |  |  |  | ● | 13 |
| `_edTouched` | 5364 | 6 | persistence |  |  |  |  |  | ● | 4 |
| `_isED` | 5370 | 1 | other / helpers |  |  |  |  |  | ● | 9 |
| `_edAidOf` | 5374 | 6 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `_edArtOf` | 5380 | 4 | editor / pop-out | ● |  |  |  |  | ● | 4 |
| `_restoreCaret` | 5389 | 7 | destructive |  |  |  |  |  | ● | 5 |
| `insertAtCaret` | 5396 | 25 | editor / pop-out |  |  |  |  |  | ● | 15 |
| `_vpW` | 5423 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `_vpH` | 5424 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `isURL` | 5425 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `extractURL` | 5428 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `_dom` | 5434 | 1 | other / helpers |  |  |  |  |  | ● | 5 |
| `compressImage` | 5437 | 20 | other / helpers |  |  |  |  |  | ● | 1 |
| `insertImageFile` | 5457 | 4 | other / helpers |  |  |  |  |  | ● | 1 |
| `bkCardHTML` | 5464 | 7 | menus / dialogs |  |  |  |  |  | ● | 3 |
| `videoCardHTML` | 5474 | 11 | menus / dialogs |  |  |  |  |  | ● | 4 |
| `vidMentionHTML` | 5487 | 5 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `fetchVideoTitle` | 5492 | 8 | other / helpers |  |  | ● |  |  | ● | 2 |
| `embedHTML` | 5500 | 10 | other / helpers |  |  |  |  |  | ● | 2 |
| `bkMove` | 5511 | 5 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeItemMenu` | 5518 | 5 | menus / dialogs |  |  |  |  |  | ● | 19 |
| `_imOut` | 5524 | 3 | other / helpers |  |  |  |  |  | ● | 0 |
| `_itemTitle` | 5527 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `bkItemMenu` | 5534 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_popMenu` | 5535 | 8 | menus / dialogs |  |  |  |  |  | ● | 3 |
| `convertLinkEl` | 5543 | 13 | theme / appearance |  |  |  |  |  | ● | 4 |
| `itemMenu` | 5556 | 95 | menus / dialogs | ● | ● |  |  |  | ● | 3 |
| `mk` | 5560 | 3 | other / helpers |  |  |  |  |  | ● | 18 |
| `go` | 5561 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `doSearch` | 5590 | 40 | find / smart views | ● | ● |  |  |  | ● | 2 |
| `go` | 5600 | 5 | other / helpers | ● | ● |  |  |  | ● | 3 |
| `go` | 5610 | 4 | other / helpers | ● | ● |  |  |  | ● | 3 |
| `go` | 5619 | 3 | other / helpers |  | ● |  |  |  | ● | 3 |
| `attachChooser` | 5651 | 44 | other / helpers | ● | ● |  |  |  | ● | 2 |
| `go` | 5674 | 15 | other / helpers | ● | ● |  |  |  | ● | 3 |
| `closeImgRszBar` | 5699 | 6 | other / helpers |  |  |  |  |  | ● | 3 |
| `_imgRszOut` | 5705 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `showImgRszBar` | 5711 | 42 | other / helpers |  |  |  |  |  | ● | 1 |
| `btn` | 5715 | 2 | other / helpers |  |  |  |  |  | ● | 4 |
| `go` | 5716 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `sep` | 5717 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `applyPx` | 5729 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `imgAttachTag` | 5755 | 49 | tags / types / tabs | ● | ● |  |  |  | ● | 1 |
| `renderTags` | 5767 | 26 | render |  | ● |  |  |  | ● | 2 |
| `go` | 5773 | 5 | other / helpers |  | ● |  |  |  | ● | 3 |
| `isMyWallSubfolder` | 5810 | 9 | organisation | ● |  |  |  |  | ● | 2 |
| `togMwSubGrp` | 5819 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `togMwSubCat` | 5826 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `renderMyWallSubfolder` | 5832 | 97 | render | ● |  |  |  |  | ● | 1 |
| `_subtreeArts` | 5844 | 5 | organisation |  |  |  |  |  | ● | 1 |
| `_kindLatest` | 5878 | 1 | tags / types / tabs |  |  |  |  |  | ● | 4 |
| `_sortKinds` | 5879 | 4 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `newJournalEntry` | 5934 | 19 | calendar / journal / contacts / database | ● | ● |  |  |  |  | 0 |
| `toggleArchive` | 5956 | 9 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `mkArtTitleOnly` | 5971 | 28 | other / helpers | ● | ● |  |  |  | ● | 1 |
| `qtKey` | 5999 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `qtSave` | 6003 | 8 | other / helpers |  |  |  |  |  | ● | 1 |
| `openLinkToNote` | 6016 | 41 | theme / appearance | ● |  |  |  |  | ● | 0 |
| `render` | 6020 | 24 | render | ● |  |  |  |  | ● | 39 |
| `ltnSearch` | 6057 | 25 | find / smart views | ● |  |  |  |  | ● | 1 |
| `toggleNoteLink` | 6082 | 17 | theme / appearance | ● | ● |  |  |  | ● | 0 |
| `_posAnnBubble` | 6110 | 12 | other / helpers |  |  |  |  |  | ● | 1 |
| `showAnnBubble` | 6122 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `hideAnnBubble` | 6129 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `annBubClick` | 6136 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `wireAnnEditor` | 6145 | 14 | other / helpers |  |  |  |  |  | ● | 1 |
| `onUp` | 6146 | 6 | other / helpers |  |  |  |  |  | ● | 2 |
| `openAnnModal` | 6161 | 19 | menus / dialogs | ● |  |  |  |  | ● | 1 |
| `_cancelAnn` | 6180 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_confirmAnn` | 6182 | 36 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `annPanelHTML` | 6220 | 45 | other / helpers |  |  |  |  |  | ● | 3 |
| `_refreshAnnPanel` | 6265 | 9 | other / helpers |  |  |  |  |  | ● | 5 |
| `scrollToAnnComment` | 6276 | 6 | other / helpers |  |  |  |  |  | ● | 2 |
| `scrollToAnnMark` | 6282 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `showAnnReplyBox` | 6292 | 11 | other / helpers |  |  |  |  |  | ● | 0 |
| `submitAnnReply` | 6303 | 12 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_edCleanHTML` | 6319 | 6 | editor / pop-out |  |  |  |  |  | ● | 5 |
| `confirmDeleteAnnotation` | 6326 | 14 | destructive | ● |  |  |  |  | ● | 0 |
| `deleteAnnotation` | 6340 | 23 | destructive | ● | ● |  |  |  | ● | 1 |
| `toggleAnnMode` | 6366 | 6 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `injectInlineAnns` | 6376 | 49 | other / helpers |  |  |  |  |  | ● | 2 |
| `showAnnEditBox` | 6427 | 19 | other / helpers | ● |  |  |  |  | ● | 0 |
| `cancelAnnEdit` | 6446 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `saveAnnEdit` | 6450 | 12 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `showAnnReplyEdit` | 6464 | 16 | other / helpers | ● |  |  |  |  | ● | 0 |
| `saveAnnReplyEdit` | 6480 | 11 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `quickNewNote` | 6496 | 30 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_tabsMap` | 6537 | 7 | tags / types / tabs | ● |  |  |  |  | ● | 11 |
| `_tabOwner` | 6548 | 16 | tags / types / tabs | ● |  |  |  |  | ● | 4 |
| `_tabHost` | 6565 | 5 | tags / types / tabs | ● |  |  |  |  | ● | 5 |
| `_tabGroup` | 6570 | 1 | organisation |  |  |  |  |  | ● | 2 |
| `_tabStamps` | 6580 | 4 | cloud sync / auth |  |  |  |  |  | ● | 6 |
| `_tabStampAdd` | 6584 | 5 | cloud sync / auth |  |  |  |  |  | ● | 3 |
| `_tabStampRm` | 6589 | 5 | cloud sync / auth |  |  |  |  |  | ● | 3 |
| `_tabStampPurge` | 6597 | 6 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `_tabNoHost` | 6603 | 1 | tags / types / tabs |  |  |  |  |  | ● | 3 |
| `renderTabBar` | 6605 | 86 | render | ● | ● |  | ● |  | ● | 19 |
| `chip` | 6658 | 15 | other / helpers |  |  |  |  |  | ● | 2 |
| `_tabSplitVizAdd` | 6694 | 10 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `_tabNavSync` | 6708 | 23 | tags / types / tabs |  |  |  |  |  | ● | 3 |
| `_tabNavQueue` | 6731 | 8 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_tabScroll` | 6739 | 5 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_tabScrollIntoView` | 6746 | 9 | tags / types / tabs |  |  |  |  |  | ● | 6 |
| `tabSelect` | 6755 | 15 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `toggleTab` | 6770 | 18 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `closeTab` | 6788 | 9 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `closeTabGroup` | 6797 | 9 | organisation |  | ● |  |  |  | ● | 0 |
| `tabBarDragOver` | 6811 | 6 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `tabBarDragLeave` | 6817 | 3 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `tabBarDrop` | 6820 | 20 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `fmtRemDt` | 6848 | 7 | reminders / review |  |  |  |  |  | ● | 2 |
| `reminderStripHTML` | 6856 | 17 | reminders / review |  |  |  |  |  | ● | 1 |
| `openReminderModal` | 6874 | 22 | reminders / review | ● |  |  |  |  | ● | 2 |
| `closeReminderModal` | 6896 | 6 | reminders / review |  |  |  |  |  | ● | 1 |
| `saveReminder` | 6903 | 14 | reminders / review | ● | ● |  |  |  | ● | 0 |
| `clearReminder` | 6917 | 8 | reminders / review | ● | ● |  | ● |  | ● | 0 |
| `deleteNote` | 6932 | 22 | destructive | ● | ● |  | ● |  | ● | 0 |
| `mwRelDate` | 6957 | 15 | other / helpers |  |  |  |  |  | ● | 1 |
| `renderSecSF` | 6982 | 25 | render |  |  |  |  |  | ● | 1 |
| `togSecSF` | 7009 | 6 | find / smart views |  |  |  |  |  | ● | 0 |
| `selSecSF` | 7017 | 10 | find / smart views |  |  |  |  |  | ● | 0 |
| `getSectionFolderIds` | 7029 | 6 | organisation | ● |  |  |  |  | ● | 2 |
| `walk` | 7031 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `getSecArts` | 7035 | 4 | other / helpers | ● |  |  |  |  | ● | 2 |
| `getSecSmartArts` | 7041 | 17 | find / smart views |  |  |  |  |  | ● | 4 |
| `getSecSmartGroups` | 7060 | 34 | organisation |  |  |  |  |  | ● | 3 |
| `ts` | 7063 | 1 | other / helpers |  |  |  |  |  | ● | 12 |
| `sod` | 7064 | 1 | other / helpers |  |  |  |  |  | ● | 2 |
| `openTabPicker` | 7101 | 47 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_outside` | 7135 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeTabPicker` | 7149 | 4 | tags / types / tabs |  |  |  |  |  | ● | 3 |
| `renderTabPickerList` | 7154 | 33 | render | ● |  |  |  |  | ● | 1 |
| `addToTabPicker` | 7188 | 18 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `_ntiChipTap` | 7216 | 4 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `openNtiPicker` | 7220 | 13 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_cl` | 7230 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeNtiPicker` | 7233 | 1 | tags / types / tabs |  |  |  |  |  | ● | 4 |
| `renderNtiPickerBody` | 7234 | 28 | render | ● |  |  |  |  | ● | 12 |
| `openJournalPicker` | 7267 | 15 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_cl` | 7279 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeJournalPicker` | 7282 | 1 | calendar / journal / contacts / database |  |  |  |  |  | ● | 3 |
| `renderJournalPickerBody` | 7283 | 15 | render | ● |  |  |  |  | ● | 3 |
| `_ensureJournalTag` | 7298 | 6 | tags / types / tabs |  |  |  |  |  | ● | 3 |
| `toggleNoteJournal` | 7304 | 11 | calendar / journal / contacts / database | ● | ● |  | ● |  | ● | 0 |
| `newJournalEventForNote` | 7315 | 14 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `openAttachMenu` | 7334 | 32 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `openMyDatabasePicker` | 7369 | 13 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_cl` | 7379 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeMyDatabasePicker` | 7382 | 1 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `renderMyDatabasePickerBody` | 7383 | 14 | render | ● |  |  |  |  | ● | 2 |
| `toggleNoteDbFolder` | 7397 | 11 | organisation | ● | ● |  | ● |  | ● | 0 |
| `togNtiCat` | 7408 | 1 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_ctxPos` | 7409 | 1 | menus / dialogs |  |  |  |  |  | ● | 12 |
| `addNtiCat` | 7410 | 1 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `openCatClrPicker` | 7411 | 9 | menus / dialogs |  | ● |  |  |  | ● | 0 |
| `catTextStyle` | 7420 | 8 | other / helpers |  |  |  |  |  | ● | 3 |
| `toggleNtiCatBold` | 7428 | 1 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `setNtiCatSize` | 7429 | 1 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `showNtiCatMenu` | 7430 | 6 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `showNtiSectionMenu` | 7436 | 13 | organisation |  |  |  |  |  | ● | 0 |
| `renNtiSectionLabel` | 7449 | 9 | organisation | ● | ● |  |  |  | ● | 0 |
| `openNtiSectionClrPicker` | 7458 | 8 | organisation | ● | ● |  |  |  | ● | 0 |
| `ntiSbToggleAllCats` | 7466 | 7 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `renNtiCat` | 7473 | 1 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `delNtiCat` | 7474 | 2 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `showNtiKindMenu` | 7476 | 1 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `addKindInCat` | 7477 | 2 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `renNtiKind` | 7479 | 1 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `delNtiKind` | 7480 | 2 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `moveKindToCat` | 7482 | 1 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `_migrateNotebook` | 7490 | 21 | startup / load / migration |  |  | ● |  |  | ● | 1 |
| `runMigration` | 7512 | 24 | other / helpers |  | ● | ● |  |  | ● | 0 |
| `generateBackupHTMLContent` | 7539 | 48 | export / import / backup | ● |  |  |  |  | ● | 3 |
| `chOf` | 7544 | 1 | other / helpers | ● |  |  |  |  | ● | 31 |
| `notesIn` | 7545 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `kindChips` | 7546 | 1 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `tagChips` | 7547 | 1 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `statusBadge` | 7548 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `fmtDate` | 7549 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `renderNote` | 7550 | 4 | render |  |  |  |  |  | ● | 2 |
| `renderFolder` | 7554 | 9 | render | ● |  |  |  |  | ● | 2 |
| `exportBackupHTML` | 7587 | 9 | export / import / backup |  |  |  |  | ● | ● | 0 |
| `exportBackupPDF` | 7596 | 7 | export / import / backup |  |  |  |  | ● | ● | 0 |
| `backupToGDrive` | 7605 | 27 | export / import / backup |  |  | ● |  |  | ● | 0 |
| `_getDriveFolder` | 7632 | 12 | organisation |  |  | ● |  |  | ● | 1 |
| `_uploadToDrive` | 7644 | 9 | other / helpers |  |  | ● |  |  | ● | 1 |
| `syncKnowledgeBase` | 7656 | 14 | other / helpers | ● | ● |  |  |  | ● | 1 |
| `importBackup` | 7675 | 43 | export / import / backup | ● |  |  |  |  | ● | 0 |
| `_mergeBackup` | 7719 | 11 | export / import / backup | ● | ● |  |  |  | ● | 1 |
| `_replaceWithBackup` | 7731 | 16 | export / import / backup | ● | ● |  |  |  | ● | 1 |
| `_weekOfMonth` | 7750 | 1 | other / helpers |  |  |  |  |  | ● | 2 |
| `toggleJournalMode` | 7751 | 5 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `quickJournalEntry` | 7756 | 11 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 2 |
| `openAddNoteToEvent` | 7768 | 13 | other / helpers | ● |  |  |  |  | ● | 0 |
| `_aneFilter` | 7781 | 5 | find / smart views |  |  |  |  |  | ● | 0 |
| `addExistingNoteToEvent` | 7786 | 12 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `moveJrnEvent` | 7800 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `togJrnGrp` | 7808 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `jrnGroupDate` | 7812 | 5 | organisation | ● |  |  |  |  | ● | 3 |
| `setJrnGroupBy` | 7817 | 7 | organisation | ● | ● |  |  |  | ● | 0 |
| `_jrnGroupByToggleHTML` | 7824 | 7 | organisation | ● |  |  |  |  | ● | 2 |
| `_buildJournalView` | 7831 | 42 | calendar / journal / contacts / database |  |  |  |  |  | ● | 3 |
| `_renderJournalFolder` | 7873 | 6 | render | ● |  |  |  |  | ● | 1 |
| `_renderJournalSmartView` | 7879 | 44 | render | ● |  |  |  |  | ● | 2 |
| `toggleAccordionSec` | 7927 | 6 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `updateAccordionBtn` | 7933 | 4 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_getFavCats` | 7948 | 4 | tags / types / tabs |  |  |  |  |  | ● | 8 |
| `selDbItem` | 7952 | 7 | calendar / journal / contacts / database |  |  |  |  |  | ● | 4 |
| `renderDatabaseSection` | 7959 | 36 | render | ● |  |  |  |  | ● | 1 |
| `_renderMyJournalDB` | 7995 | 1 | render |  |  |  |  |  | ● | 2 |
| `renameJrnEvent` | 7998 | 6 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_setJrnStyle` | 8004 | 9 | other / helpers | ● | ● |  | ● |  | ● | 2 |
| `pickJrnColor` | 8013 | 6 | theme / appearance | ● |  |  |  |  | ● | 0 |
| `cycleJrnSize` | 8019 | 7 | other / helpers | ● |  |  |  |  |  | 0 |
| `resetJrnStyle` | 8026 | 4 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `_jrnCardStyleTag` | 8030 | 9 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_jrnSizeLive` | 8039 | 10 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_jrnSizeCommit` | 8049 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `_jrnStyleMenu` | 8050 | 29 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `_renderMyFavourites` | 8079 | 40 | render | ● |  |  |  |  | ● | 2 |
| `addFavCat` | 8120 | 12 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `showFavCatCtx` | 8132 | 13 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `renameFavCat` | 8145 | 7 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `deleteFavCat` | 8152 | 7 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `setNoteFavCat` | 8159 | 8 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `newFavEntry` | 8167 | 23 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `_ctName` | 8194 | 5 | other / helpers |  |  |  |  |  | ● | 15 |
| `newContact` | 8200 | 22 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `toggleCTMode` | 8223 | 14 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `toggleCTNameMode` | 8238 | 14 | other / helpers | ● |  |  |  |  | ● | 0 |
| `addCTPhone` | 8253 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `_saveContactForm` | 8262 | 21 | persistence |  | ● |  |  |  | ● | 1 |
| `renderCTCard` | 8284 | 20 | render |  |  |  |  |  | ● | 1 |
| `renderCTForm` | 8305 | 38 | render |  |  |  |  |  | ● | 1 |
| `_renderMyContacts` | 8344 | 22 | render | ● |  |  |  |  | ● | 2 |
| `showDbItemCtx` | 8370 | 42 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_renderWhoBar` | 8418 | 11 | render |  |  |  |  |  | ● | 1 |
| `_whoSearch` | 8430 | 22 | find / smart views | ● |  |  |  |  | ● | 0 |
| `_whoClear` | 8453 | 4 | other / helpers |  |  |  |  |  | ● | 1 |
| `_whoSelect` | 8458 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `logInteraction` | 8464 | 17 | other / helpers | ● | ● |  |  |  | ● | 1 |
| `_elapsed` | 8483 | 11 | other / helpers |  |  |  |  |  | ● | 3 |
| `_renderInteractionLog` | 8496 | 25 | render |  |  |  |  |  | ● | 1 |
| `newStarredNote` | 8525 | 12 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `newPinnedNote` | 8538 | 12 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `newNoteWithReminder` | 8551 | 12 | reminders / review | ● | ● |  |  |  | ● | 0 |
| `quickJournalEntryFromDB` | 8564 | 16 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `_trackLastFolder` | 8582 | 6 | organisation | ● |  |  |  |  | ● | 2 |
| `newJournalFolder` | 8592 | 14 | organisation |  |  |  |  |  | ● | 0 |
| `_njfRow` | 8606 | 7 | other / helpers |  |  |  |  |  | ● | 2 |
| `njfFilter` | 8613 | 18 | find / smart views | ● |  |  |  |  | ● | 2 |
| `rows` | 8622 | 1 | other / helpers |  |  |  |  |  | ● | 4 |
| `njfSelect` | 8631 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `createNewJournalFolder` | 8635 | 26 | organisation | ● | ● |  |  |  | ● | 0 |
| `calJournalFolderIds` | 8664 | 10 | organisation | ● |  |  |  |  | ● | 2 |
| `calJournalEntries` | 8674 | 6 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 4 |
| `calJournalCount` | 8680 | 1 | calendar / journal / contacts / database |  |  |  |  |  | ● | 2 |
| `openJrnCalScope` | 8681 | 32 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 3 |
| `_jrnScopeSetMode` | 8713 | 3 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_jrnScopeSetOne` | 8716 | 3 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_jrnScopeToggle` | 8719 | 7 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `_calInit` | 8729 | 23 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 9 |
| `_calWeekStart` | 8752 | 1 | calendar / journal / contacts / database |  |  |  |  |  | ● | 2 |
| `_calOpen` | 8753 | 6 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `_calNav` | 8759 | 20 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `_calToday` | 8779 | 7 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_calRenderH` | 8786 | 58 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 2 |
| `_loadCalHols` | 8844 | 10 | calendar / journal / contacts / database |  | ● | ● |  |  | ● | 5 |
| `_calPublicHols` | 8854 | 10 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 3 |
| `_calSchoolHols` | 8864 | 15 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 3 |
| `_calHolsForDate` | 8879 | 6 | find / smart views |  |  |  |  |  | ● | 3 |
| `_calNoteCount` | 8885 | 3 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `_calSelectDate` | 8888 | 44 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `close` | 8928 | 1 | other / helpers |  |  |  |  |  | ● | 6 |
| `_calNewNote` | 8932 | 14 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `_calNewJournal` | 8946 | 15 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `_calViewNotes` | 8961 | 9 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `_calRenderMonth` | 8970 | 48 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `_calRenderWeek` | 9018 | 27 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `_calRenderYear` | 9045 | 27 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `openCalSettings` | 9072 | 14 | calendar / journal / contacts / database | ● | ● |  | ● |  | ● | 0 |
| `_showClrPicker` | 9092 | 51 | menus / dialogs |  |  |  |  |  | ● | 14 |
| `close` | 9140 | 1 | other / helpers |  |  |  |  |  | ● | 6 |
| `togClrFam` | 9143 | 9 | other / helpers |  |  |  |  |  | ● | 0 |
| `_clrHover` | 9152 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `_clrPick` | 9156 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `openFolClrPicker` | 9160 | 5 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `openSecClrPicker` | 9165 | 5 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `openKindClrPicker` | 9170 | 10 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `openSfClrPicker` | 9184 | 4 | find / smart views |  |  |  |  |  | ● | 0 |
| `openDbItemClrPicker` | 9188 | 10 | calendar / journal / contacts / database | ● | ● |  | ● |  | ● | 0 |
| `openThemeClrPicker` | 9198 | 16 | theme / appearance |  |  |  |  |  | ● | 0 |
| `showTagClrPicker` | 9216 | 14 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `openTabClrPicker` | 9230 | 7 | tags / types / tabs | ● | ● |  | ● |  | ● | 0 |
| `_popGeoAll` | 9249 | 13 | menus / dialogs | ● |  |  |  |  | ● | 9 |
| `_popGeoFlush` | 9262 | 6 | menus / dialogs |  | ● |  |  |  | ● | 6 |
| `openNoteAsModal` | 9275 | 30 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `openNoteModal` | 9305 | 75 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_p3SheetHdSync` | 9384 | 16 | menus / dialogs | ● |  |  |  |  | ● | 2 |
| `closeNoteModal` | 9400 | 40 | menus / dialogs |  |  |  |  |  | ● | 5 |
| `_ptrDown` | 9449 | 5 | other / helpers |  |  |  |  |  | ● | 12 |
| `_ptrUp` | 9454 | 5 | other / helpers |  |  |  |  |  | ● | 14 |
| `_modalDragStart` | 9459 | 8 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_modalDragMove` | 9467 | 7 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalDragEnd` | 9474 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalHandlesOff` | 9483 | 21 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_modalClampToViewport` | 9508 | 10 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_modalResizeRStart` | 9518 | 9 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeRMove` | 9527 | 6 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeREnd` | 9533 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBStart` | 9534 | 9 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBMove` | 9543 | 6 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBEnd` | 9549 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeLStart` | 9550 | 9 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeLMove` | 9559 | 7 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeLEnd` | 9566 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeTStart` | 9567 | 9 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_modalResizeTMove` | 9576 | 8 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeTEnd` | 9584 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_tabBarModalDown` | 9585 | 22 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `onMove` | 9592 | 10 | other / helpers |  |  |  |  |  | ● | 2 |
| `onUp` | 9602 | 1 | other / helpers |  |  |  |  |  | ● | 2 |
| `_tabBarCursor` | 9607 | 7 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_openFloatPop` | 9624 | 20 | menus / dialogs |  |  |  |  |  | ● | 8 |
| `_cl` | 9635 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `_flPopPlace` | 9660 | 26 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `closeFloatPop` | 9686 | 1 | menus / dialogs |  |  |  |  |  | ● | 8 |
| `_closeStickyPop` | 9689 | 6 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_p3HomeBtnHTML` | 9706 | 5 | other / helpers |  |  |  |  |  | ● | 3 |
| `_p3OneBar` | 9734 | 1 | other / helpers |  |  |  |  |  | ● | 11 |
| `_p3EditIconsHTML` | 9735 | 27 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ebOpenTabsHTML` | 9773 | 22 | tags / types / tabs | ● |  |  |  |  | ● | 1 |
| `row` | 9783 | 7 | other / helpers |  |  |  |  |  | ● | 8 |
| `togEBGroup` | 9795 | 12 | organisation |  |  |  |  |  | ● | 0 |
| `_ebListsHTML` | 9835 | 9 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ebInsertHTML` | 9844 | 8 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ebAttachHTML` | 9866 | 41 | other / helpers |  |  |  |  |  | ● | 3 |
| `row` | 9876 | 2 | other / helpers |  |  |  |  |  | ● | 8 |
| `_ebGoToHTML` | 9911 | 11 | other / helpers |  |  |  |  |  | ● | 3 |
| `_ebPopHTML` | 9930 | 14 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `row` | 9934 | 8 | other / helpers |  |  |  |  |  | ● | 8 |
| `_ebTagRowHTML` | 9948 | 5 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_ebNoteStateHTML` | 9956 | 18 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ebSectionToolsHTML` | 9974 | 11 | organisation | ● |  |  |  |  | ● | 2 |
| `_buildEBSub` | 9985 | 87 | other / helpers | ● |  |  |  |  | ● | 1 |
| `duplicateNote` | 10079 | 25 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `_fwFocus` | 10127 | 9 | editor / pop-out |  |  |  |  |  | ● | 3 |
| `_popTier` | 10169 | 1 | menus / dialogs |  |  |  |  |  | ● | 9 |
| `_popIcoHTML` | 10181 | 15 | menus / dialogs |  |  |  |  |  | ● | 7 |
| `_popBtnHTML` | 10199 | 9 | menus / dialogs |  |  |  |  |  | ● | 4 |
| `_popKindLbl` | 10210 | 4 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `_notePopMode` | 10214 | 4 | menus / dialogs | ● |  |  |  |  | ● | 1 |
| `_rememberNotePop` | 10221 | 8 | reminders / review | ● | ● |  |  |  | ● | 1 |
| `openNotePopup` | 10231 | 7 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `closeAllFloats` | 10241 | 6 | other / helpers |  | ● |  |  |  | ● | 3 |
| `closeAllPopouts` | 10247 | 5 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_fwSyncCloseAllChip` | 10255 | 41 | editor / pop-out | ● |  |  |  |  | ● | 4 |
| `_panelToFloat` | 10299 | 22 | other / helpers |  |  |  |  |  | ● | 1 |
| `popOutNote` | 10321 | 32 | editor / pop-out |  |  |  |  |  | ● | 6 |
| `_fwDefaultGeom` | 10363 | 11 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_fwCreate` | 10374 | 48 | editor / pop-out | ● |  |  |  |  | ● | 1 |
| `_syncCol` | 10403 | 4 | cloud sync / auth |  |  |  |  |  | ● | 0 |
| `_fwResizeStart` | 10427 | 25 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `move` | 10433 | 10 | other / helpers |  |  |  |  |  | ● | 1 |
| `up` | 10443 | 5 | other / helpers |  |  |  |  |  | ● | 1 |
| `_fwAddResizeHandles` | 10452 | 14 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_fwSavePos` | 10470 | 11 | editor / pop-out |  | ● |  |  |  | ● | 3 |
| `_fwMetaHTML` | 10486 | 25 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_findEls` | 10526 | 14 | destructive |  |  |  |  |  | ● | 6 |
| `_ntFindRanges` | 10540 | 19 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ntFindPaint` | 10559 | 8 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ntFindLabel` | 10567 | 4 | other / helpers |  |  |  |  |  | ● | 4 |
| `_ntFindRun` | 10571 | 9 | other / helpers |  |  |  |  |  | ● | 0 |
| `_ntFindStep` | 10580 | 13 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ntFindToggle` | 10593 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `_ntFindClose` | 10601 | 7 | other / helpers |  |  |  |  |  | ● | 7 |
| `_ntFindKey` | 10608 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `_noteSiblings` | 10630 | 9 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_p3Navigate` | 10641 | 10 | other / helpers |  |  |  |  |  | ● | 0 |
| `_fwNavigate` | 10651 | 23 | editor / pop-out |  | ● |  |  |  | ● | 0 |
| `_fwFlashSaved` | 10674 | 7 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_fwRenderBody` | 10681 | 47 | editor / pop-out | ● |  |  |  |  | ● | 1 |
| `_fwEc` | 10737 | 6 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_fwFb` | 10743 | 13 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_fwFontStep` | 10758 | 7 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_fwClearFmt` | 10765 | 7 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_fwBuildEBSub` | 10772 | 48 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_fwTogGroup` | 10821 | 8 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_fwWireDrag` | 10829 | 23 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `move` | 10832 | 4 | other / helpers |  |  |  |  |  | ● | 1 |
| `up` | 10836 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `_fwFlush` | 10856 | 13 | editor / pop-out | ● |  |  |  |  | ● | 5 |
| `_fwSave` | 10869 | 10 | editor / pop-out | ● | ● |  |  |  | ● | 0 |
| `_fwScheduleAutoSave` | 10884 | 18 | editor / pop-out | ● | ● |  | ● |  | ● | 7 |
| `closeFloatWin` | 10904 | 16 | other / helpers | ● | ● |  | ● |  | ● | 3 |
| `_modalResizeTRStart` | 10923 | 9 | menus / dialogs |  |  |  |  |  |  | 0 |
| `_modalResizeTRMove` | 10932 | 10 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeTREnd` | 10942 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeTLStart` | 10944 | 9 | menus / dialogs |  |  |  |  |  |  | 0 |
| `_modalResizeTLMove` | 10953 | 9 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeTLEnd` | 10962 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBLStart` | 10964 | 9 | menus / dialogs |  |  |  |  |  |  | 0 |
| `_modalResizeBLMove` | 10973 | 8 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBLEnd` | 10981 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBRStart` | 10986 | 9 | menus / dialogs |  |  |  |  |  |  | 0 |
| `_modalResizeBRMove` | 10995 | 7 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_modalResizeBREnd` | 11002 | 1 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_tabBarModalReset` | 11005 | 14 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `setMwFontSize` | 11021 | 9 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `todayStr` | 11033 | 4 | other / helpers |  |  |  |  |  | ● | 6 |
| `togCalLayer` | 11037 | 6 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `_calGetCat` | 11043 | 3 | calendar / journal / contacts / database |  |  |  |  |  | ● | 8 |
| `_calNewEvent` | 11046 | 6 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_calEditEvent` | 11052 | 5 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_calUpdateFormAllDay` | 11057 | 5 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_calSaveEvent` | 11062 | 31 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `_calDelEvent` | 11093 | 7 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `_calRenderEventForm` | 11100 | 29 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_calRenderDay` | 11129 | 60 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `_renderMyCalP2` | 11189 | 40 | render |  |  |  |  |  | ● | 2 |
| `_calJumpToDate` | 11229 | 9 | calendar / journal / contacts / database |  |  |  |  |  |  | 0 |
| `_upcomingEvents` | 11241 | 21 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_renderComingUp` | 11262 | 29 | render |  |  |  |  |  | ● | 1 |
| `_calManageCats` | 11291 | 6 | calendar / journal / contacts / database |  |  |  |  |  | ● | 0 |
| `_calAddCat` | 11297 | 8 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `_calSaveCat` | 11305 | 9 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `_calDelCat` | 11314 | 5 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `_calRenderCatList` | 11319 | 16 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `openGlobalSearch` | 11339 | 25 | find / smart views |  |  |  |  |  | ● | 1 |
| `closeGlobalSearch` | 11364 | 3 | find / smart views |  |  |  |  |  | ● | 5 |
| `_gsSearch` | 11367 | 17 | find / smart views | ● |  |  |  |  | ● | 1 |
| `_gsHL` | 11384 | 6 | other / helpers |  |  |  |  |  | ● | 2 |
| `_gsRender` | 11390 | 25 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_gsSetActive` | 11415 | 5 | other / helpers |  |  |  |  |  | ● | 2 |
| `_gsNav` | 11420 | 5 | other / helpers |  |  |  |  |  | ● | 2 |
| `_gsConfirm` | 11425 | 4 | other / helpers |  |  |  |  |  | ● | 1 |
| `_gsOpen` | 11429 | 4 | other / helpers |  |  |  |  |  | ● | 1 |
| `_hjDate` | 11440 | 18 | other / helpers |  |  |  |  |  | ● | 9 |
| `_hjStr` | 11458 | 4 | other / helpers |  |  |  |  |  | ● | 1 |
| `toggleHijri` | 11462 | 7 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `installPWA` | 11474 | 10 | other / helpers |  |  |  |  |  | ● | 0 |
| `_mrjDueArts` | 11499 | 5 | other / helpers | ● |  |  |  |  | ● | 4 |
| `_mrjAllEnrolled` | 11504 | 4 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_mrjDueCount` | 11508 | 1 | other / helpers |  |  |  |  |  |  | 0 |
| `mrjToggle` | 11509 | 11 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `_mrjSchedule` | 11520 | 10 | other / helpers |  | ● |  |  |  | ● | 1 |
| `mrjStart` | 11530 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `mrjRate` | 11536 | 9 | other / helpers | ● |  |  |  |  | ● | 0 |
| `mrjNext` | 11545 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `mrjEnd` | 11552 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `_mrjRenderFooter` | 11558 | 9 | other / helpers |  |  |  |  |  | ● | 1 |
| `_mrjRenderP2C` | 11567 | 25 | other / helpers |  |  |  |  |  | ● | 1 |
| `practiceToggle` | 11597 | 6 | reminders / review | ● | ● |  | ● |  | ● | 0 |
| `_practiceRenderP2C` | 11603 | 24 | reminders / review | ● |  |  |  |  | ● | 1 |
| `openCiteModal` | 11632 | 11 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `closeCiteModal` | 11643 | 3 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `setCiteType` | 11646 | 5 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_buildCiteHTML` | 11651 | 30 | other / helpers |  |  |  |  |  | ● | 1 |
| `insertCite` | 11681 | 12 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_citeModalHTML` | 11693 | 40 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_tocHostEl` | 11740 | 5 | other / helpers |  |  |  |  |  | ● | 4 |
| `_tocScrollEl` | 11745 | 5 | other / helpers |  |  |  |  |  | ● | 3 |
| `_tocScan` | 11750 | 6 | other / helpers |  |  |  |  |  | ● | 3 |
| `_tocItemHTML` | 11757 | 6 | other / helpers |  |  |  |  |  | ● | 2 |
| `_tocInject` | 11764 | 91 | other / helpers | ● |  |  |  |  | ● | 4 |
| `togTocTitle` | 11855 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `_tocBindScroll` | 11860 | 14 | other / helpers |  |  |  |  |  | ● | 1 |
| `_tocUnbindScroll` | 11875 | 7 | other / helpers |  |  |  |  |  | ● | 6 |
| `_tocScrollTo` | 11883 | 18 | other / helpers |  |  |  |  |  | ● | 1 |
| `_tocSetActive` | 11902 | 14 | other / helpers |  |  |  |  |  | ● | 3 |
| `_tocToggleSide` | 11917 | 35 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_tocStartResize` | 11952 | 21 | other / helpers | ● | ● |  |  |  |  | 0 |
| `onMove` | 11959 | 5 | other / helpers |  |  |  |  |  | ● | 1 |
| `onUp` | 11964 | 6 | other / helpers | ● | ● |  |  |  | ● | 1 |
| `_tocDestroy` | 11973 | 11 | other / helpers |  |  |  |  |  | ● | 1 |
| `pinTabDStart` | 11993 | 4 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_pinPanelDragOver` | 11997 | 4 | tags / types / tabs |  |  |  |  |  |  | 0 |
| `_pinPanelDragLeave` | 12001 | 3 | tags / types / tabs |  |  |  |  |  |  | 0 |
| `_pinPanelDrop` | 12004 | 8 | tags / types / tabs |  |  |  |  |  |  | 0 |
| `pinTabToPanel` | 12012 | 10 | tags / types / tabs | ● | ● |  |  |  | ● | 1 |
| `unpinTab` | 12022 | 6 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `_pinPanelToggleSide` | 12028 | 6 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `_extractHeadingsFromHTML` | 12037 | 17 | find / smart views |  |  |  |  |  | ● | 1 |
| `togPinExpand` | 12054 | 5 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `togPinCardMode` | 12059 | 5 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `togPinHeadExpand` | 12064 | 6 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_pinHeadsTreeHTML` | 12070 | 12 | organisation |  |  |  |  |  | ● | 1 |
| `_pinCardHTML` | 12082 | 25 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `_pinHostEl` | 12107 | 5 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_pinPanelInject` | 12112 | 94 | tags / types / tabs | ● | ● |  |  |  | ● | 10 |
| `_fwSyncBodyPadding` | 12209 | 12 | editor / pop-out |  |  |  |  |  | ● | 9 |
| `_fwClearAllBodyPadding` | 12221 | 3 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `_pinStartResize` | 12224 | 22 | tags / types / tabs |  | ● |  |  |  |  | 0 |
| `onMove` | 12231 | 5 | other / helpers |  |  |  |  |  | ● | 1 |
| `onUp` | 12236 | 8 | other / helpers |  | ● |  |  |  | ● | 1 |
| `_pinPanelDestroy` | 12246 | 4 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_pinOpenNote` | 12254 | 4 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_syncP3CPadding` | 12261 | 11 | cloud sync / auth |  |  |  |  |  | ● | 8 |
| `_tocMobileCheck` | 12275 | 13 | other / helpers |  |  |  |  |  | ● | 2 |
| `_tocOpenMobile` | 12289 | 13 | other / helpers |  |  |  |  |  |  | 0 |
| `_tocCloseMobile` | 12303 | 10 | other / helpers |  |  |  |  |  | ● | 2 |
| `_tocMobileScrollTo` | 12314 | 4 | other / helpers |  |  |  |  |  |  | 0 |
| `_dfltHdStyles` | 12323 | 4 | other / helpers |  |  |  |  |  | ● | 6 |
| `_applyHeadingStyles` | 12327 | 11 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_initCollapsible` | 12338 | 38 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_colToggle` | 12376 | 15 | other / helpers | ● | ● |  | ● |  | ● | 1 |
| `_colAll` | 12391 | 12 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `_colToolbarBtnHTML` | 12411 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `toggleColPop` | 12417 | 10 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `_p3FitToolbar` | 12440 | 37 | other / helpers |  |  |  |  |  | ● | 6 |
| `fits` | 12452 | 1 | other / helpers |  |  |  |  |  | ● | 4 |
| `_p3FitEditBar` | 12494 | 16 | other / helpers |  |  |  |  |  | ● | 1 |
| `_p3PalBtn` | 12511 | 9 | other / helpers |  |  |  |  |  | ● | 13 |
| `_moreBtnHint` | 12524 | 3 | other / helpers |  |  |  |  |  | ● | 1 |
| `_p3ActPalette` | 12527 | 48 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `_p3NtiPalette` | 12575 | 20 | tags / types / tabs | ● |  |  |  |  | ● | 0 |
| `_colTogglePreview` | 12595 | 5 | reminders / review | ● | ● |  |  |  | ● | 0 |
| `openHeadingStylesModal` | 12600 | 29 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `closeHeadingStylesModal` | 12629 | 1 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `resetHeadingStyles` | 12630 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `saveHeadingStyles` | 12637 | 11 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_pasteHasStructure` | 12655 | 8 | other / helpers |  |  |  |  |  | ● | 1 |
| `_openSmartPastePop` | 12664 | 33 | find / smart views |  |  |  |  |  | ● | 1 |
| `go` | 12685 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `_closeSmartPastePop` | 12698 | 5 | find / smart views |  |  |  |  |  | ● | 1 |
| `_cleanPasteHTML` | 12704 | 10 | other / helpers |  |  |  |  |  | ● | 2 |
| `_smartPasteHTML` | 12715 | 32 | find / smart views |  |  |  |  |  | ● | 1 |
| `_doPaste` | 12748 | 31 | other / helpers | ● | ● |  |  |  | ● | 4 |
| `getOutLinks` | 12786 | 8 | theme / appearance | ● |  |  |  |  | ● | 1 |
| `getBacklinks` | 12794 | 5 | theme / appearance | ● |  |  |  |  | ● | 1 |
| `_blSnippet` | 12799 | 13 | other / helpers |  |  |  |  |  | ● | 1 |
| `backlinksHTML` | 12812 | 17 | theme / appearance |  |  |  |  |  | ● | 3 |
| `refreshBacklinks` | 12830 | 10 | render | ● |  |  |  |  | ● | 2 |
| `upgradeViewCards` | 12843 | 30 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `closePastePop` | 12876 | 5 | menus / dialogs |  |  |  |  |  | ● | 6 |
| `openPastePop` | 12881 | 25 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `mk` | 12884 | 3 | other / helpers |  |  |  |  |  | ● | 18 |
| `go` | 12885 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `_ppOut` | 12906 | 3 | other / helpers |  |  |  |  |  | ● | 0 |
| `_caretXY` | 12910 | 8 | other / helpers |  |  |  |  |  | ● | 2 |
| `closeMenDD` | 12920 | 1 | other / helpers |  |  |  |  |  | ● | 8 |
| `_menQuery` | 12921 | 8 | find / smart views |  |  |  |  |  | ● | 2 |
| `showMenDD` | 12929 | 21 | other / helpers | ● |  |  |  |  | ● | 2 |
| `go` | 12941 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `insertMention` | 12950 | 10 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `edImgPick` | 12962 | 3 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `edLink` | 12965 | 6 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `edBookmarkBtn` | 12971 | 4 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `edMentionBtn` | 12975 | 1 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `flashSaved` | 12983 | 8 | other / helpers |  |  |  |  |  | ● | 2 |
| `_edAutoSave` | 12996 | 12 | editor / pop-out | ● | ● |  |  |  | ● | 4 |
| `_edBlocksInSel` | 13009 | 10 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `edBoundary` | 13020 | 10 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `edMarkDone` | 13031 | 10 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `edColorBtn` | 13045 | 7 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_clrPopAway` | 13052 | 6 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_closeColorPop` | 13058 | 1 | theme / appearance |  |  |  |  |  | ● | 2 |
| `_openColorPop` | 13059 | 31 | theme / appearance |  |  |  |  |  | ● | 1 |
| `sw` | 13063 | 11 | other / helpers |  |  |  |  |  | ● | 2 |
| `_applyColor` | 13090 | 16 | theme / appearance |  |  |  |  |  | ● | 0 |
| `_edColHeads` | 13117 | 9 | editor / pop-out |  |  |  |  |  | ● | 4 |
| `_edColClean` | 13127 | 5 | editor / pop-out |  |  |  |  |  | ● | 7 |
| `_edColApply` | 13133 | 32 | editor / pop-out | ● |  |  |  |  | ● | 5 |
| `_edColInit` | 13166 | 26 | editor / pop-out |  |  |  |  |  | ● | 8 |
| `_edRetag` | 13200 | 8 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edBlockDragStart` | 13208 | 11 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edDragPaint` | 13219 | 23 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `_edBlockDragMove` | 13242 | 24 | editor / pop-out |  |  |  |  |  | ● | 0 |
| `_edBlockDragEnd` | 13266 | 31 | editor / pop-out | ● |  |  |  |  | ● | 0 |
| `_edColToggle` | 13297 | 12 | editor / pop-out |  | ● |  |  |  | ● | 1 |
| `_edColAll` | 13309 | 12 | editor / pop-out |  | ● |  |  |  | ● | 0 |
| `_edColPreview` | 13321 | 7 | editor / pop-out | ● | ● |  |  |  | ● | 0 |
| `_edColSyncPrevBtn` | 13332 | 4 | editor / pop-out | ● |  |  |  |  | ● | 2 |
| `_edColToolbarHTML` | 13336 | 5 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `toggleEdColPop` | 13344 | 7 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `_rangeAtPoint` | 13354 | 6 | other / helpers |  |  |  |  |  |  | 0 |
| `_edVisKids` | 13389 | 5 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edNeedsLeadIn` | 13397 | 7 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edIsBlankLine` | 13406 | 5 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `_edBlankLine` | 13411 | 1 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `_edPutCaret` | 13412 | 6 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edRevealTail` | 13422 | 8 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edHeadChromeEnd` | 13433 | 9 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `_edPrefixText` | 13446 | 8 | editor / pop-out |  |  |  |  |  | ● | 2 |
| `_edFixHeadCaret` | 13457 | 10 | editor / pop-out |  |  |  |  |  | ● | 1 |
| `initRichPaste` | 13497 | 217 | other / helpers |  |  |  |  |  | ● | 1 |
| `markCards` | 13500 | 7 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `_flowTo` | 13587 | 8 | other / helpers |  |  |  |  |  | ● | 3 |
| `_endTouchDrag` | 13615 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_promptOpenLink` | 13724 | 10 | theme / appearance |  |  |  |  |  | ● | 3 |
| `mk` | 13729 | 1 | other / helpers |  |  |  |  |  | ● | 18 |
| `autoFit` | 13825 | 18 | other / helpers | ● |  |  |  |  | ● | 2 |
| `dStart` | 13848 | 9 | other / helpers | ● |  |  |  |  | ● | 0 |
| `dEnd` | 13858 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `artDStart` | 13866 | 10 | other / helpers | ● |  |  |  |  | ● | 0 |
| `artDEnd` | 13877 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `dOver` | 13887 | 31 | other / helpers | ● |  |  |  |  | ● | 0 |
| `dLeave` | 13919 | 3 | other / helpers |  |  |  |  |  | ● | 0 |
| `dDrop` | 13923 | 30 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `clearDI` | 13954 | 4 | other / helpers |  |  |  |  |  | ● | 7 |
| `_moveWouldCycle` | 13971 | 9 | other / helpers | ● |  |  |  |  | ● | 2 |
| `doMoveFolder` | 13981 | 28 | organisation | ● | ● |  | ● |  | ● | 1 |
| `moveFolderToTop` | 14013 | 22 | organisation | ● | ● |  |  |  | ● | 0 |
| `offerRenumber` | 14037 | 31 | other / helpers |  |  |  |  |  | ● | 1 |
| `doRenumber` | 14069 | 20 | other / helpers |  | ● |  |  |  | ● | 0 |
| `toggleFolderStructured` | 14100 | 15 | organisation | ● | ● |  |  |  | ● | 0 |
| `openFieldBuilder` | 14115 | 6 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 1 |
| `_fieldBuilderHTML` | 14121 | 12 | calendar / journal / contacts / database |  |  |  |  |  | ● | 4 |
| `_fieldRowHTML` | 14133 | 10 | other / helpers |  |  |  |  |  | ● | 1 |
| `addFieldRow` | 14143 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `removeFieldRow` | 14151 | 8 | reminders / review | ● | ● |  |  |  | ● | 0 |
| `updField` | 14159 | 9 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_dbfFields` | 14243 | 1 | calendar / journal / contacts / database |  |  |  |  |  | ● | 7 |
| `_dbfFieldById` | 14244 | 1 | calendar / journal / contacts / database |  |  |  |  |  | ● | 6 |
| `_dbfCandidates` | 14246 | 5 | calendar / journal / contacts / database |  |  |  |  |  | ● | 4 |
| `_dbfReportUsable` | 14254 | 9 | calendar / journal / contacts / database |  |  |  |  |  | ● | 2 |
| `_dbfNum` | 14263 | 5 | calendar / journal / contacts / database |  |  |  |  |  | ● | 2 |
| `_dbfFmt` | 14268 | 5 | calendar / journal / contacts / database |  |  |  |  |  | ● | 3 |
| `_dbfVal` | 14274 | 6 | calendar / journal / contacts / database |  |  |  |  |  | ● | 3 |
| `_dbReportHTML` | 14285 | 15 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `wrap` | 14291 | 1 | other / helpers |  |  |  |  |  | ● | 6 |
| `_dbrTable` | 14300 | 23 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_dbrBreakdown` | 14323 | 15 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_dbrTotals` | 14338 | 13 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_dbrStatus` | 14351 | 25 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_dbrTimeline` | 14376 | 22 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_dbbShow` | 14409 | 5 | calendar / journal / contacts / database |  |  |  |  |  | ● | 3 |
| `openDbFolderBuilder` | 14414 | 6 | organisation | ● |  |  |  |  | ● | 0 |
| `newDbFolder` | 14420 | 14 | organisation | ● | ● |  |  |  | ● | 0 |
| `dbBuilderCancel` | 14437 | 13 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `dbBuilderDone` | 14450 | 11 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `_dbBuilderHTML` | 14461 | 60 | calendar / journal / contacts / database |  |  |  |  |  | ● | 3 |
| `_dbbFieldsHTML` | 14521 | 14 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_dbbFolder` | 14535 | 1 | organisation | ● |  |  |  |  | ● | 8 |
| `_dbbRefresh` | 14537 | 9 | calendar / journal / contacts / database |  |  |  |  |  | ● | 6 |
| `dbbSet` | 14546 | 7 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `dbbAddField` | 14553 | 6 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `dbbRemoveField` | 14559 | 9 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `dbbMoveField` | 14568 | 7 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `dbbUpdField` | 14575 | 11 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `dbbSetReport` | 14586 | 16 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `dbbApplyPreset` | 14605 | 26 | calendar / journal / contacts / database |  | ● |  |  |  | ● | 0 |
| `showDbSecCtx` | 14636 | 20 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `newPlainDbFolder` | 14658 | 13 | organisation | ● | ● |  |  |  | ● | 0 |
| `autoNumberDbFolders` | 14673 | 11 | organisation | ● | ● |  |  |  | ● | 0 |
| `_structuredFolderOf` | 14685 | 3 | organisation | ● |  |  |  |  | ● | 1 |
| `fieldInputHTML` | 14688 | 24 | other / helpers |  |  |  |  |  | ● | 1 |
| `saveFieldValue` | 14712 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `_fieldsPanelHTML` | 14720 | 12 | other / helpers |  |  |  |  |  | ● | 3 |
| `_fieldChipsHTML` | 14732 | 12 | other / helpers |  |  |  |  |  | ● | 1 |
| `_sha256Hex` | 14754 | 5 | other / helpers |  |  |  |  |  | ● | 2 |
| `setFolderPin` | 14759 | 15 | organisation | ● | ● |  |  |  | ● | 0 |
| `removeFolderPin` | 14774 | 9 | organisation | ● | ● |  | ● |  | ● | 0 |
| `_pinLockHTML` | 14783 | 10 | tags / types / tabs | ● |  |  |  |  | ● | 1 |
| `tryUnlockFolder` | 14793 | 15 | organisation | ● |  |  |  |  | ● | 0 |
| `_stripHistoryImages` | 14841 | 15 | other / helpers |  |  |  |  |  | ● | 2 |
| `_captureNoteHistory` | 14856 | 13 | other / helpers |  |  |  |  |  | ● | 8 |
| `_pruneNoteHistory` | 14869 | 15 | other / helpers |  |  |  |  |  | ● | 1 |
| `totalBytes` | 14874 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `_relTime` | 14884 | 13 | other / helpers |  |  |  |  |  | ● | 4 |
| `_nhReasonLabel` | 14897 | 3 | other / helpers |  |  |  |  |  | ● | 1 |
| `openNoteHistory` | 14900 | 14 | other / helpers |  |  |  |  |  | ● | 0 |
| `_cl` | 14911 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeNoteHistory` | 14914 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `previewNoteHistory` | 14915 | 1 | reminders / review |  |  |  |  |  | ● | 0 |
| `_nhBack` | 14916 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_nhSetMode` | 14917 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_diffTextify` | 14925 | 11 | other / helpers |  |  |  |  |  | ● | 1 |
| `_diffTokenize` | 14936 | 1 | other / helpers |  |  |  |  |  | ● | 2 |
| `_tokDiff` | 14937 | 21 | other / helpers |  |  |  |  |  | ● | 1 |
| `_renderDiffHTML` | 14958 | 8 | render |  |  |  |  |  | ● | 1 |
| `renderNoteHistoryBody` | 14966 | 39 | render | ● |  |  |  |  | ● | 4 |
| `restoreNoteHistory` | 15005 | 17 | destructive | ● | ● |  |  |  | ● | 0 |
| `_versionSiblings` | 15031 | 5 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_versionStripHTML` | 15036 | 16 | other / helpers |  |  |  |  |  | ● | 1 |
| `startVersioning` | 15052 | 11 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `addNewVersion` | 15063 | 24 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `showVersionCtx` | 15087 | 12 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `renameVersion` | 15099 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `setVersionIcon` | 15107 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `unlinkVersion` | 15115 | 7 | theme / appearance | ● | ● |  | ● |  | ● | 0 |
| `ensureQuickPhrases` | 15129 | 13 | other / helpers | ● |  |  |  |  | ● | 7 |
| `_qpTextToHTML` | 15142 | 3 | other / helpers |  |  |  |  |  | ● | 1 |
| `openQuickPhrasesMenu` | 15145 | 18 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `insertQuickPhrase` | 15163 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `openQuickPhrasesManager` | 15170 | 3 | other / helpers |  |  |  |  |  | ● | 0 |
| `_qpManagerHTML` | 15173 | 21 | other / helpers |  |  |  |  |  | ● | 4 |
| `addQuickPhrase` | 15194 | 11 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `updQuickPhrase` | 15205 | 5 | other / helpers |  | ● |  |  |  | ● | 0 |
| `deleteQuickPhrase` | 15210 | 6 | destructive | ● | ● |  |  |  | ● | 0 |
| `moveQuickPhrase` | 15216 | 9 | other / helpers |  | ● |  |  |  | ● | 0 |
| `_ktDefaultKhutbah` | 15243 | 37 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ktNormalize` | 15280 | 16 | other / helpers |  |  |  |  |  | ● | 2 |
| `ensureTemplates` | 15296 | 7 | other / helpers | ● |  |  |  |  | ● | 8 |
| `_ktGet` | 15303 | 1 | other / helpers |  |  |  |  |  | ● | 20 |
| `_ktFoldHTML` | 15306 | 9 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ktBarHTML` | 15318 | 9 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ktAyahHTML` | 15327 | 16 | other / helpers |  |  |  |  |  | ● | 2 |
| `ktBuildHTML` | 15343 | 36 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ktBtnHTML` | 15381 | 3 | other / helpers |  |  |  |  |  | ● | 2 |
| `openTemplatesMenu` | 15384 | 14 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `insertTemplate` | 15398 | 11 | other / helpers |  |  |  |  |  | ● | 0 |
| `_ktDirty` | 15411 | 4 | other / helpers |  |  |  |  |  | ● | 4 |
| `_ktToggleFold` | 15415 | 8 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ktFoldAll` | 15423 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ktRenumber` | 15430 | 9 | other / helpers |  |  |  |  |  | ● | 3 |
| `_ktTplFor` | 15441 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ktAddBlock` | 15448 | 12 | calendar / journal / contacts / database |  |  |  |  |  | ● | 1 |
| `_ktDelBlock` | 15460 | 10 | destructive |  |  |  |  |  | ● | 1 |
| `_ktBlockText` | 15472 | 14 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ktCopyBlock` | 15486 | 38 | other / helpers |  |  |  |  |  | ● | 1 |
| `done` | 15498 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `fallback` | 15499 | 16 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ktRepair` | 15526 | 7 | other / helpers |  |  |  |  |  | ● | 3 |
| `_ktShow` | 15558 | 5 | other / helpers |  |  |  |  |  | ● | 7 |
| `openTemplatesManager` | 15563 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_ktMgrHTML` | 15564 | 25 | other / helpers |  |  |  |  |  | ● | 6 |
| `ktAddTemplate` | 15589 | 10 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktRestoreKhutbah` | 15599 | 9 | destructive | ● | ● |  |  |  | ● | 0 |
| `ktDuplicateTemplate` | 15608 | 10 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `ktDeleteTemplate` | 15618 | 6 | destructive | ● | ● |  |  |  | ● | 0 |
| `ktMoveTemplate` | 15624 | 7 | other / helpers |  | ● |  |  |  | ● | 0 |
| `openTemplateEditor` | 15633 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `_ktEdHTML` | 15634 | 94 | other / helpers |  |  |  |  |  | ● | 2 |
| `_ktRedraw` | 15728 | 1 | other / helpers |  |  |  |  |  | ● | 12 |
| `ktSet` | 15729 | 2 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktSetAyah` | 15731 | 2 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktAddField` | 15733 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktSetField` | 15734 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktDelField` | 15735 | 1 | destructive |  | ● |  |  |  | ● | 0 |
| `ktMoveField` | 15736 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktAddLang` | 15737 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktSetLang` | 15738 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktDelLang` | 15739 | 1 | destructive |  | ● |  |  |  | ● | 0 |
| `ktMoveLang` | 15740 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktAddSec` | 15741 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktSetSec` | 15742 | 10 | other / helpers |  | ● |  |  |  | ● | 0 |
| `ktDelSec` | 15752 | 1 | destructive |  | ● |  |  |  | ● | 0 |
| `ktMoveSec` | 15753 | 1 | other / helpers |  | ● |  |  |  | ● | 0 |
| `_ktMoveIn` | 15754 | 5 | other / helpers |  |  |  |  |  | ● | 3 |
| `_injectHeadingStatusBadges` | 15777 | 28 | other / helpers | ● |  |  |  |  | ● | 1 |
| `showHeadingStatusMenu` | 15805 | 17 | menus / dialogs | ● |  |  |  |  |  | 0 |
| `setHeadingStatus` | 15822 | 8 | other / helpers | ● | ● |  |  |  | ● | 1 |
| `clearHeadingStatus` | 15830 | 7 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `promptCustomHeadingStatus` | 15837 | 11 | other / helpers | ● |  |  |  |  | ● | 0 |
| `logContactAction` | 15862 | 19 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `saveContactAction` | 15881 | 17 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `_renderActionLog` | 15898 | 22 | render |  |  |  |  |  | ● | 1 |
| `toggleActionDone` | 15920 | 13 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `deleteContactAction` | 15933 | 8 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `toggleP2HCardView` | 15941 | 4 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `toggleP2HTreeMode` | 15945 | 4 | organisation |  |  |  |  |  | ● | 0 |
| `togP2HTreeNode` | 15949 | 5 | organisation |  |  |  |  |  | ● | 0 |
| `p2hTreeExpandAll` | 15954 | 8 | organisation |  |  |  |  |  | ● | 0 |
| `p2hTreeCollapseAll` | 15962 | 4 | organisation |  |  |  |  |  | ● | 0 |
| `_folderTreeNodeHTML` | 15966 | 8 | organisation |  |  |  |  |  | ● | 2 |
| `_folderDescendantsHTML` | 15974 | 19 | organisation |  |  |  |  |  | ● | 1 |
| `_secNavHTML` | 15996 | 9 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_firstFolderOfSection` | 16007 | 3 | organisation | ● |  |  |  |  | ● | 3 |
| `gotoSection` | 16010 | 6 | organisation | ● |  |  |  |  | ● | 0 |
| `gotoAdjacentSection` | 16016 | 13 | organisation | ● |  |  |  |  | ● | 0 |
| `_folderFullTreeHTML` | 16029 | 16 | organisation | ● |  |  |  |  | ● | 1 |
| `_folderPathRowHTML` | 16045 | 21 | organisation | ● |  |  |  |  | ● | 1 |
| `_sfQtFolder` | 16106 | 10 | organisation | ● |  |  |  |  | ● | 2 |
| `_sfPathRowHTML` | 16117 | 22 | find / smart views |  |  |  |  |  | ● | 2 |
| `_sfGrpKeys` | 16140 | 6 | find / smart views |  |  |  |  |  | ● | 2 |
| `sfGrpExpandAll` | 16146 | 5 | find / smart views |  |  |  |  |  | ● | 0 |
| `sfGrpCollapseAll` | 16151 | 5 | find / smart views |  |  |  |  |  | ● | 0 |
| `_sfQtBarHTML` | 16178 | 16 | find / smart views |  |  |  |  |  | ● | 4 |
| `addStarterMyDatabaseFolders` | 16199 | 28 | organisation | ● | ● |  |  |  | ● | 0 |
| `mkFolder` | 16227 | 27 | organisation | ● | ● |  |  |  | ● | 2 |
| `rnFolder` | 16254 | 1 | organisation | ● | ● |  |  |  | ● | 1 |
| `rmFolder` | 16255 | 1 | organisation |  |  |  |  |  |  | 0 |
| `mkArt` | 16256 | 1 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `rmArt` | 16257 | 1 | other / helpers |  |  |  |  |  |  | 0 |
| `_buildFolderCtxMain` | 16260 | 35 | organisation | ● |  |  |  |  | ● | 2 |
| `showCtx` | 16295 | 12 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `_folderCtxBack` | 16307 | 3 | organisation |  |  |  |  |  | ● | 0 |
| `_folderCtxSub` | 16310 | 7 | organisation |  |  |  |  |  | ● | 0 |
| `hideCtx` | 16321 | 1 | menus / dialogs |  |  |  |  |  | ● | 54 |
| `moveToMyJournal` | 16322 | 7 | calendar / journal / contacts / database | ● | ● |  |  |  | ● | 0 |
| `offerRenumberManual` | 16329 | 4 | other / helpers | ● |  |  |  |  | ● | 0 |
| `stripNumPrefix` | 16337 | 6 | other / helpers |  |  |  |  |  | ● | 4 |
| `getHierNum` | 16349 | 13 | other / helpers | ● |  |  |  |  | ● | 3 |
| `autoNumberAll` | 16364 | 25 | other / helpers | ● | ● |  |  |  | ● | 2 |
| `offerAutoNumber` | 16391 | 23 | other / helpers | ● |  |  |  |  | ● | 2 |
| `showModal` | 16423 | 16 | menus / dialogs |  |  |  |  |  | ● | 41 |
| `closeModal` | 16443 | 3 | menus / dialogs |  |  |  |  |  | ● | 17 |
| `_mbSaveGeom` | 16462 | 10 | other / helpers |  | ● |  |  |  | ● | 2 |
| `_mbLoadGeom` | 16472 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `showResizableModal` | 16481 | 39 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `_mbDragStart` | 16522 | 16 | other / helpers |  |  |  |  |  | ● | 0 |
| `_mbDragMove` | 16538 | 9 | other / helpers |  |  |  |  |  | ● | 0 |
| `_mbDragStop` | 16547 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `_mbResizeStart` | 16555 | 15 | other / helpers |  |  |  |  |  | ● | 0 |
| `_mbResizeMove` | 16570 | 16 | other / helpers |  |  |  |  |  | ● | 0 |
| `_mbResizeStop` | 16586 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `openModal` | 16593 | 35 | menus / dialogs | ● |  |  |  |  | ● | 2 |
| `confirmDel` | 16628 | 8 | other / helpers | ● |  |  |  |  | ● | 0 |
| `_pkArtsOf` | 16661 | 1 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_pkFileRowHTML` | 16662 | 14 | other / helpers |  |  |  |  |  | ● | 1 |
| `_pkRowHTML` | 16676 | 32 | other / helpers |  |  |  |  |  | ● | 1 |
| `_pkTreeHTML` | 16708 | 6 | organisation |  |  |  |  |  | ● | 4 |
| `openPicker` | 16714 | 19 | menus / dialogs | ● |  |  |  |  | ● | 1 |
| `_pkSaveScope` | 16744 | 19 | other / helpers |  | ● |  |  |  | ● | 1 |
| `_pkLoadScope` | 16763 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `_pkResumeBrowse` | 16775 | 36 | other / helpers | ● |  |  |  |  | ● | 1 |
| `openFolderPopupFromToolbar` | 16811 | 21 | organisation | ● |  |  |  |  | ● | 0 |
| `openSectionPopout` | 16836 | 8 | organisation | ● |  |  |  |  | ● | 1 |
| `openFolderPopout` | 16845 | 8 | organisation | ● |  |  |  |  | ● | 0 |
| `_pkCurrentBrowseRoots` | 16853 | 5 | other / helpers | ● |  |  |  |  | ● | 1 |
| `_pkCurrentSectionId` | 16861 | 8 | organisation |  |  |  |  |  | ● | 3 |
| `_pkFontClampSize` | 16879 | 4 | other / helpers |  |  |  |  |  | ● | 4 |
| `_pkFontLoad` | 16883 | 10 | other / helpers |  |  |  |  |  | ● | 3 |
| `_pkFontSave` | 16893 | 1 | other / helpers |  | ● |  |  |  | ● | 2 |
| `_pkApplyFont` | 16896 | 12 | other / helpers |  |  |  |  |  | ● | 5 |
| `_pkFontSet` | 16911 | 15 | other / helpers |  |  |  |  |  | ● | 4 |
| `pkFontSize` | 16926 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkFontStep` | 16927 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkFontBold` | 16928 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkFontColor` | 16929 | 1 | theme / appearance |  |  |  |  |  | ● | 1 |
| `pkFontPalette` | 16932 | 4 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `pkFontReset` | 16936 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkFontMenu` | 16947 | 49 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_pkSecNavHTML` | 17009 | 17 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_pkRenderScopeBody` | 17027 | 7 | other / helpers |  |  |  |  |  | ● | 3 |
| `_pkAllSectionsHTML` | 17037 | 18 | organisation | ● |  |  |  |  | ● | 1 |
| `_pkAllSmartHTML` | 17062 | 7 | find / smart views |  |  |  |  |  | ● | 1 |
| `pkToggleAllSec` | 17069 | 5 | other / helpers |  |  |  |  |  | ● | 0 |
| `_pkSetFolderControlsVisible` | 17076 | 4 | organisation |  |  |  |  |  | ● | 4 |
| `_pkSwitchToSection` | 17085 | 13 | organisation | ● |  |  |  |  | ● | 1 |
| `_pkSwitchToScopeKind` | 17100 | 14 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_pkRefreshSecNav` | 17114 | 4 | other / helpers |  |  |  |  |  | ● | 3 |
| `pkGotoSection` | 17118 | 10 | organisation |  |  |  |  |  | ● | 1 |
| `_pkNavStops` | 17130 | 4 | other / helpers | ● |  |  |  |  | ● | 1 |
| `pkGotoAdjacentSection` | 17134 | 9 | organisation |  |  |  |  |  | ● | 0 |
| `_pkSmartListHTML` | 17145 | 11 | find / smart views |  |  |  |  |  | ● | 2 |
| `_pkTagsListHTML` | 17156 | 9 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_pkKindsListHTML` | 17165 | 14 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `pkNavScope` | 17181 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `_pkOpenBrowse` | 17187 | 20 | other / helpers |  |  |  |  |  | ● | 3 |
| `pkNavigateFolder` | 17207 | 4 | organisation |  |  |  |  |  |  | 0 |
| `_pkRow` | 17211 | 1 | other / helpers |  |  |  |  |  | ● | 9 |
| `_pkRebuildList` | 17216 | 18 | other / helpers | ● |  |  |  |  | ● | 9 |
| `_pkApplyVis` | 17234 | 29 | other / helpers |  |  |  |  |  | ● | 5 |
| `togglePickExp` | 17263 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `_pkFilter` | 17271 | 22 | find / smart views |  |  |  |  |  | ● | 4 |
| `_pkGlobalSearchHTML` | 17300 | 60 | find / smart views | ● |  |  |  |  | ● | 1 |
| `grpHd` | 17313 | 1 | other / helpers |  |  |  |  |  | ● | 5 |
| `_pkPathWithSection` | 17365 | 6 | organisation | ● |  |  |  |  | ● | 2 |
| `_pkSwitchToFolder` | 17374 | 14 | organisation | ● |  |  |  |  | ● | 0 |
| `togglePick` | 17388 | 14 | other / helpers | ● |  |  |  |  |  | 0 |
| `_pkUpdateTargetLabel` | 17404 | 12 | other / helpers | ● |  |  |  |  | ● | 5 |
| `pkRowMenu` | 17422 | 9 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `pkNoteRowMenu` | 17431 | 8 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `pkSetTarget` | 17439 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkClearTarget` | 17446 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `pkRename` | 17453 | 7 | other / helpers | ● |  |  |  |  | ● | 0 |
| `pkRenameSave` | 17460 | 10 | other / helpers | ● |  |  |  |  | ● | 0 |
| `pkRenameCancel` | 17470 | 7 | other / helpers | ● |  |  |  |  | ● | 0 |
| `pkDelete` | 17477 | 14 | destructive | ● |  |  |  |  | ● | 0 |
| `pkDStart` | 17491 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkDEnd` | 17497 | 5 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkDOver` | 17502 | 19 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkDLeave` | 17521 | 3 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkDDrop` | 17524 | 17 | other / helpers |  |  |  |  |  | ● | 0 |
| `_pkClearDI` | 17541 | 5 | other / helpers |  |  |  |  |  | ● | 7 |
| `pkMoveFolder` | 17550 | 24 | organisation | ● | ● |  | ● |  | ● | 1 |
| `pkNoteOpen` | 17578 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkNoteDStart` | 17582 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkNoteDEnd` | 17588 | 5 | other / helpers |  |  |  |  |  | ● | 0 |
| `pkMoveNote` | 17595 | 16 | other / helpers | ● | ● |  |  |  | ● | 1 |
| `pkNoteRename` | 17611 | 7 | other / helpers | ● |  |  |  |  | ● | 0 |
| `pkNoteRenameSave` | 17618 | 14 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `pkNoteRenameCancel` | 17632 | 7 | other / helpers | ● |  |  |  |  | ● | 0 |
| `pkNoteDelete` | 17639 | 6 | destructive | ● |  |  |  |  | ● | 0 |
| `mobBack` | 17647 | 1 | other / helpers |  |  |  |  |  |  | 0 |
| `tapCtx` | 17648 | 6 | menus / dialogs |  |  |  |  |  |  | 0 |
| `getAllTags` | 17658 | 8 | tags / types / tabs | ● |  |  |  |  | ● | 5 |
| `selTag` | 17667 | 7 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `toggleTagPanel` | 17675 | 4 | tags / types / tabs |  |  |  |  |  |  | 0 |
| `backToMyWallCat` | 17684 | 5 | other / helpers |  |  |  |  |  | ● | 0 |
| `selKind` | 17689 | 7 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `toggleNtiSection` | 17696 | 1 | organisation |  |  |  |  |  | ● | 0 |
| `togNtiCatSB` | 17697 | 1 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `renderNTISection` | 17698 | 51 | render | ● |  |  |  |  | ● | 1 |
| `renderTagPanel` | 17750 | 17 | render |  |  |  |  |  | ● | 1 |
| `renderTagEditor` | 17768 | 15 | render |  |  |  |  |  | ● | 4 |
| `_allTags` | 17787 | 5 | tags / types / tabs | ● |  |  |  |  | ● | 1 |
| `showTagSuggest` | 17792 | 10 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `_tagSuggestPlace` | 17807 | 9 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `hideTagSuggest` | 17816 | 3 | tags / types / tabs |  |  |  |  |  | ● | 3 |
| `_pickTagSuggestion` | 17819 | 6 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `addTag` | 17826 | 11 | tags / types / tabs |  |  |  |  |  | ● | 3 |
| `rmTag` | 17838 | 5 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `tagKey` | 17844 | 7 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `tagInputChanged` | 17857 | 12 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `hexDarken` | 17887 | 5 | other / helpers |  |  |  |  |  | ● | 7 |
| `hexLighten` | 17892 | 5 | other / helpers |  |  |  |  |  | ● | 4 |
| `_sbLum` | 17908 | 14 | other / helpers |  |  |  |  |  | ● | 6 |
| `f` | 17919 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `applySidebarInk` | 17922 | 22 | theme / appearance |  |  |  |  |  | ● | 1 |
| `set` | 17928 | 1 | other / helpers |  |  |  |  |  | ● | 30 |
| `_paneSafePaper` | 17965 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `_paneInk` | 17972 | 6 | theme / appearance |  |  |  |  |  | ● | 4 |
| `_accentInk` | 17980 | 14 | tags / types / tabs |  |  |  |  |  | ● | 2 |
| `worst` | 17990 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `applyPaneInk` | 17994 | 40 | theme / appearance |  |  |  |  |  | ● | 1 |
| `set` | 17997 | 1 | other / helpers |  |  |  |  |  | ● | 30 |
| `applyTheme` | 18034 | 29 | theme / appearance |  |  |  |  |  | ● | 6 |
| `applyPreset` | 18064 | 7 | theme / appearance | ● |  |  |  |  | ● | 0 |
| `setCustomColor` | 18072 | 18 | theme / appearance | ● |  |  |  |  | ● | 2 |
| `setCustomColorHex` | 18091 | 6 | theme / appearance |  |  |  |  |  | ● | 0 |
| `resetTheme` | 18098 | 6 | theme / appearance | ● |  |  |  |  | ● | 0 |
| `openTheme` | 18105 | 5 | theme / appearance |  |  |  |  |  | ● | 0 |
| `closeTheme` | 18111 | 3 | theme / appearance |  |  |  |  |  | ● | 0 |
| `renderThemeModal` | 18115 | 107 | render | ● |  |  |  |  | ● | 8 |
| `ctxColorSwatches` | 18225 | 8 | theme / appearance | ● |  |  |  |  | ● | 1 |
| `setFolderColor` | 18234 | 9 | organisation | ● | ● |  | ● |  | ● | 1 |
| `setFolderBold` | 18243 | 7 | organisation | ● | ● |  | ● |  | ● | 0 |
| `renderSection` | 18255 | 23 | render | ● |  |  |  |  | ● | 1 |
| `toggleSection` | 18280 | 12 | organisation | ● |  |  |  |  | ● | 0 |
| `addFolderInSec` | 18294 | 4 | organisation |  |  |  |  |  | ● | 0 |
| `addRootFolder` | 18300 | 4 | organisation |  |  |  |  |  | ● | 0 |
| `ctxSecColorSwatches` | 18307 | 8 | theme / appearance | ● |  |  |  |  | ● | 1 |
| `setSectionColor` | 18315 | 7 | organisation | ● | ● |  | ● |  | ● | 1 |
| `setSectionBold` | 18322 | 7 | organisation | ● | ● |  | ● |  | ● | 0 |
| `_uiStamp` | 18337 | 1 | cloud sync / auth |  |  |  |  |  | ● | 5 |
| `ctxSfColorSwatches` | 18338 | 10 | find / smart views |  |  |  |  |  | ● | 1 |
| `setSmartViewColor` | 18348 | 9 | find / smart views |  | ● |  |  |  | ● | 0 |
| `showSmartViewCtx` | 18357 | 15 | find / smart views |  |  |  |  |  | ● | 1 |
| `toggleSmartViews` | 18372 | 6 | find / smart views |  |  |  |  |  | ● | 0 |
| `startRenSmartViews` | 18378 | 9 | find / smart views |  |  |  |  |  | ● | 0 |
| `finRenSmartViews` | 18387 | 7 | find / smart views |  | ● |  |  |  | ● | 0 |
| `_buildSecCtxMain` | 18395 | 15 | menus / dialogs | ● |  |  |  |  | ● | 2 |
| `showSecCtx` | 18410 | 11 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `_secCtxBack` | 18421 | 3 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `_secCtxSub` | 18424 | 7 | menus / dialogs |  |  |  |  |  | ● | 0 |
| `startRenSec` | 18433 | 9 | other / helpers | ● |  |  |  |  | ● | 0 |
| `finRenSec` | 18443 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `mkSection` | 18453 | 8 | organisation | ● | ● |  |  |  | ● | 0 |
| `delSection` | 18463 | 8 | organisation | ● | ● |  |  |  | ● | 0 |
| `moveFolderToSec` | 18473 | 6 | organisation | ● | ● |  |  |  | ● | 0 |
| `rootSectionMoves` | 18481 | 7 | organisation | ● |  |  |  |  | ● | 1 |
| `_isSysFolder` | 18496 | 9 | organisation | ● |  |  |  |  | ● | 4 |
| `convertFolderToSection` | 18505 | 22 | organisation | ● |  |  |  |  | ● | 0 |
| `_moveNotesThenConvert` | 18527 | 17 | other / helpers | ● |  |  |  |  | ● | 0 |
| `_doFolderToSection` | 18544 | 18 | organisation | ● | ● |  |  |  | ● | 1 |
| `sectionToFolderRows` | 18562 | 6 | organisation | ● |  |  |  |  | ● | 1 |
| `confirmSectionToFolder` | 18568 | 10 | organisation | ● |  |  |  |  | ● | 0 |
| `_doSectionToFolder` | 18578 | 16 | organisation | ● | ● |  | ● |  | ● | 0 |
| `secDStart` | 18598 | 9 | other / helpers |  |  |  |  |  | ● | 0 |
| `secDEnd` | 18608 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `secDOver` | 18615 | 10 | other / helpers |  |  |  |  |  | ● | 0 |
| `secDLeave` | 18626 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `secDDrop` | 18633 | 17 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `snapshotState` | 18654 | 7 | persistence |  |  |  |  |  | ● | 2 |
| `undo` | 18662 | 9 | other / helpers | ● | ● |  | ● |  | ● | 1 |
| `redo` | 18672 | 9 | other / helpers | ● | ● |  | ● |  | ● | 1 |
| `updateUndoRedoBtns` | 18682 | 5 | other / helpers |  |  |  |  |  | ● | 3 |
| `_addTombstones` | 18696 | 10 | cloud sync / auth |  |  |  |  |  | ● | 6 |
| `_tombstoneTrashEntry` | 18709 | 10 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `trashFolder` | 18719 | 28 | organisation | ● | ● |  |  |  | ● | 3 |
| `trashArt` | 18748 | 11 | destructive | ● | ● |  |  |  | ● | 2 |
| `openTrash` | 18760 | 5 | destructive |  |  |  |  |  | ● | 0 |
| `closeTrash` | 18766 | 3 | destructive |  |  |  |  |  | ● | 0 |
| `renderTrashModal` | 18770 | 31 | render | ● |  |  |  |  | ● | 5 |
| `restoreItem` | 18802 | 52 | destructive | ● | ● |  |  |  | ● | 0 |
| `permDeleteItem` | 18855 | 6 | destructive | ● | ● |  |  |  | ● | 0 |
| `emptyTrash` | 18862 | 8 | destructive | ● | ● |  | ● |  | ● | 0 |
| `_popCleanupOrphans` | 18873 | 15 | menus / dialogs | ● |  |  | ● |  | ● | 1 |
| `updateTrashBtn` | 18889 | 6 | destructive | ● |  |  |  |  | ● | 4 |
| `_ctxIsCard` | 18915 | 1 | menus / dialogs |  |  |  |  |  | ● | 3 |
| `showArtCtx` | 18917 | 20 | menus / dialogs | ● |  |  |  |  | ● | 1 |
| `_ctxPlaceCard` | 18940 | 8 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `_ctxRepaint` | 18951 | 1 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `_artCtxGroups` | 18963 | 37 | organisation |  |  |  |  |  | ● | 1 |
| `sub` | 18966 | 1 | other / helpers |  |  |  |  |  | ● | 5 |
| `_buildArtCtxMain` | 19000 | 6 | menus / dialogs |  |  |  |  |  | ● | 2 |
| `_ctxBack` | 19006 | 6 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `_ctxSub` | 19012 | 49 | menus / dialogs | ● |  |  |  |  | ● | 0 |
| `detachArt` | 19063 | 16 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `openAttachArt` | 19081 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `showArtFolderPicker` | 19083 | 35 | organisation | ● |  |  |  |  | ● | 3 |
| `rows` | 19088 | 12 | other / helpers |  |  |  |  |  | ● | 3 |
| `createFolderFromPicker` | 19121 | 34 | organisation | ● | ● |  |  |  | ● | 0 |
| `fpFilter` | 19158 | 32 | find / smart views | ● |  |  |  |  | ● | 0 |
| `rows2` | 19164 | 11 | other / helpers |  |  |  |  |  | ● | 1 |
| `toggleArtFolder` | 19192 | 17 | organisation | ● | ● |  |  |  | ● | 0 |
| `applyFontSizes` | 19216 | 10 | other / helpers |  |  |  |  |  | ● | 3 |
| `r` | 19220 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `applyLineSpacing` | 19229 | 6 | other / helpers |  |  |  |  |  | ● | 2 |
| `setLineSpacing` | 19235 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `setFontSize` | 19245 | 9 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `resetFontSizes` | 19256 | 7 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `enableAutoSave` | 19283 | 37 | other / helpers |  |  |  |  |  | ● | 0 |
| `_writeToFile` | 19322 | 18 | other / helpers |  |  |  |  | ● | ● | 3 |
| `scheduleAutoSave` | 19345 | 7 | other / helpers |  |  |  |  |  | ● | 2 |
| `updateSaveUI` | 19354 | 30 | other / helpers |  |  |  |  |  | ● | 8 |
| `_bkCfg` | 19430 | 7 | other / helpers |  |  |  |  |  | ● | 8 |
| `_bkSaveCfg` | 19437 | 3 | other / helpers |  | ● |  |  |  | ● | 5 |
| `_bkIdb` | 19442 | 8 | other / helpers |  |  |  |  |  | ● | 3 |
| `_bkPutHandle` | 19450 | 8 | other / helpers |  |  |  |  |  | ● | 1 |
| `_bkGetHandle` | 19458 | 10 | other / helpers |  |  |  |  |  | ● | 2 |
| `_bkClearHandle` | 19468 | 9 | other / helpers |  |  |  |  |  | ● | 1 |
| `_bkStamp` | 19479 | 4 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `p` | 19480 | 1 | other / helpers |  |  |  |  |  | ● | 8 |
| `_bkFileName` | 19485 | 5 | other / helpers |  |  |  |  |  | ● | 2 |
| `p` | 19486 | 1 | other / helpers |  |  |  |  |  | ● | 8 |
| `_bkDue` | 19490 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `_bkAgeDays` | 19497 | 4 | other / helpers |  |  |  |  |  | ● | 2 |
| `_bkPrune` | 19507 | 23 | other / helpers |  |  |  |  |  | ● | 1 |
| `runBackupNow` | 19535 | 33 | export / import / backup |  | ● |  |  | ● | ● | 2 |
| `chooseBackupFolder` | 19571 | 11 | export / import / backup |  |  |  |  |  | ● | 1 |
| `turnOffBackups` | 19583 | 6 | export / import / backup |  |  |  |  |  | ● | 0 |
| `setBackupEvery` | 19590 | 3 | export / import / backup |  |  |  |  |  | ● | 0 |
| `downloadDatedBackup` | 19597 | 14 | export / import / backup |  | ● |  |  | ● | ● | 1 |
| `_bkMaybeAuto` | 19615 | 21 | other / helpers |  |  |  |  |  | ● | 1 |
| `_bkStatusHTML` | 19638 | 22 | other / helpers |  |  |  |  |  | ● | 3 |
| `sel` | 19644 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `_bkRenderStatus` | 19660 | 4 | other / helpers |  |  |  |  |  | ● | 5 |
| `openBackupModal` | 19664 | 31 | export / import / backup |  |  |  |  |  | ● | 0 |
| `getTimestampedName` | 19698 | 6 | cloud sync / auth |  |  |  |  |  | ● | 2 |
| `_sbDDFit` | 19712 | 20 | other / helpers |  |  |  |  |  | ● | 3 |
| `toggleSBMenu` | 19733 | 6 | menus / dialogs |  |  |  |  |  | ● | 1 |
| `closeSBMenu` | 19739 | 3 | menus / dialogs |  |  |  |  |  | ● | 5 |
| `toggleSBTools` | 19743 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeSBTools` | 19749 | 3 | other / helpers |  |  |  |  |  | ● | 3 |
| `toggleSBHome` | 19755 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `closeSBHome` | 19761 | 3 | other / helpers |  |  |  |  |  | ● | 4 |
| `openLegacyApp` | 19768 | 7 | other / helpers |  |  |  |  |  | ● | 0 |
| `artSnippet` | 19780 | 6 | other / helpers |  |  |  |  |  | ● | 1 |
| `artCard` | 19788 | 31 | menus / dialogs |  |  |  |  |  | ● | 18 |
| `toggleListView` | 19821 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `adjustP3Layout` | 19839 | 15 | other / helpers |  |  |  |  |  | ● | 10 |
| `openP2` | 19856 | 5 | other / helpers |  |  |  |  |  | ● | 2 |
| `closeP2` | 19861 | 6 | other / helpers |  |  |  |  |  | ● | 0 |
| `_dedupePrimaryFolders` | 19884 | 37 | organisation | ● | ● |  |  |  | ● | 2 |
| `noteCount` | 19893 | 1 | other / helpers | ● |  |  |  |  | ● | 2 |
| `_openNewNoteWindow` | 19939 | 15 | other / helpers |  |  |  |  |  | ● | 6 |
| `quickCapture` | 19954 | 26 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `quickCaptureWithKind` | 19985 | 22 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `backFromP3` | 20011 | 5 | other / helpers |  |  |  |  |  | ● | 1 |
| `showPane` | 20021 | 16 | other / helpers |  |  |  |  |  | ● | 23 |
| `_getOrCreateFirebaseApp` | 20076 | 7 | cloud sync / auth |  |  | ● |  |  | ● | 3 |
| `initAuth` | 20084 | 51 | cloud sync / auth |  |  | ● |  |  | ● | 2 |
| `doLogin` | 20136 | 12 | other / helpers |  |  | ● |  |  | ● | 0 |
| `refreshApp` | 20150 | 10 | render |  |  |  |  |  | ● | 0 |
| `doSignOut` | 20161 | 15 | cloud sync / auth |  |  |  |  |  | ● | 0 |
| `getSyncConfig` | 20177 | 1 | other / helpers |  |  |  |  |  | ● | 9 |
| `_saveSyncConfig` | 20178 | 1 | persistence |  | ● |  |  |  | ● | 1 |
| `clearSyncConfig` | 20179 | 1 | other / helpers |  | ● |  |  |  | ● | 2 |
| `setSyncStatus` | 20181 | 15 | other / helpers |  |  |  |  |  | ● | 22 |
| `_loadScript` | 20197 | 8 | other / helpers |  |  |  |  |  | ● | 6 |
| `_syncErrorToast` | 20225 | 21 | cloud sync / auth |  |  |  |  |  | ● | 5 |
| `initSync` | 20247 | 91 | other / helpers |  |  | ● |  |  | ● | 3 |
| `syncNow` | 20340 | 36 | other / helpers | ● | ● |  | ● |  | ● | 0 |
| `_mergeById` | 20377 | 16 | cloud sync / auth |  |  |  |  |  | ● | 3 |
| `_mergeTabStamps` | 20394 | 11 | cloud sync / auth |  |  |  |  |  | ● | 2 |
| `norm` | 20395 | 1 | other / helpers |  |  |  |  |  | ● | 18 |
| `_mergeTabMaps` | 20412 | 18 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `norm` | 20413 | 1 | other / helpers |  |  |  |  |  | ● | 18 |
| `_mergeStrs` | 20430 | 1 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `_mergeMapById` | 20446 | 13 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `norm` | 20447 | 1 | other / helpers |  |  |  |  |  | ● | 18 |
| `_mergeStampMap` | 20460 | 6 | cloud sync / auth |  |  |  |  |  | ● | 2 |
| `norm` | 20461 | 1 | other / helpers |  |  |  |  |  | ● | 18 |
| `_mergeValMap` | 20469 | 9 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `norm` | 20470 | 1 | other / helpers |  |  |  |  |  | ● | 18 |
| `mergeDB` | 20478 | 72 | cloud sync / auth |  |  |  |  |  | ● | 4 |
| `_tadd` | 20527 | 1 | other / helpers |  |  |  |  |  | ● | 4 |
| `_alive` | 20537 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_b64enc` | 20551 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `_b64dec` | 20552 | 1 | other / helpers |  |  |  |  |  | ● | 1 |
| `_syncSleep` | 20554 | 1 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `_syncSig` | 20560 | 5 | cloud sync / auth |  |  |  |  |  | ● | 2 |
| `_flushAllEditors` | 20575 | 9 | other / helpers |  |  |  |  |  | ● | 5 |
| `_edCleanHTML` | 20587 | 6 | editor / pop-out |  |  |  |  |  | ● | 5 |
| `_edApplyRemote` | 20604 | 38 | editor / pop-out | ● |  |  |  |  | ● | 1 |
| `put` | 20607 | 18 | other / helpers |  |  |  |  |  | ● | 4 |
| `_readCloudDB` | 20651 | 34 | cloud sync / auth |  |  | ● |  |  | ● | 2 |
| `_writeCloudDB` | 20685 | 9 | cloud sync / auth |  |  | ● |  |  | ● | 2 |
| `_doPush` | 20714 | 44 | other / helpers |  | ● |  |  |  | ● | 1 |
| `pushToCloud` | 20759 | 9 | cloud sync / auth |  |  |  |  |  | ● | 6 |
| `flushPendingPush` | 20773 | 5 | other / helpers |  |  |  |  |  | ● | 3 |
| `_preferStreaming` | 20795 | 3 | other / helpers |  |  |  |  |  | ● | 1 |
| `_noteTransportFailure` | 20802 | 5 | other / helpers |  |  |  |  |  | ● | 1 |
| `_reconcileNow` | 20827 | 27 | other / helpers |  |  |  |  |  | ● | 2 |
| `_startReconcile` | 20854 | 7 | other / helpers |  |  |  |  |  | ● | 1 |
| `_scheduleListenerRestart` | 20863 | 11 | other / helpers |  |  | ● |  |  | ● | 1 |
| `_pullRemote` | 20875 | 83 | reminders / review | ● | ● |  | ● |  | ● | 2 |
| `generateNotebookId` | 20960 | 3 | other / helpers |  |  |  |  | ● | ● | 2 |
| `_syncAgo` | 20970 | 9 | cloud sync / auth |  |  |  |  |  | ● | 2 |
| `_syncDiagnosticsHTML` | 20979 | 21 | cloud sync / auth |  |  |  |  |  | ● | 1 |
| `openSyncModal` | 21000 | 61 | menus / dialogs |  |  | ● |  |  | ● | 0 |
| `closeSyncModal` | 21062 | 1 | menus / dialogs |  |  |  |  |  | ● | 3 |
| `parseFirebaseConfig` | 21064 | 17 | cloud sync / auth |  |  | ● |  |  | ● | 1 |
| `connectSync` | 21082 | 18 | other / helpers |  |  | ● |  |  | ● | 0 |
| `loginResetSync` | 21101 | 10 | other / helpers |  |  |  |  |  | ● | 0 |
| `disconnectSync` | 21112 | 10 | other / helpers |  |  |  |  |  | ● | 0 |
| `_uiTier` | 21188 | 1 | other / helpers |  |  |  |  |  | ● | 3 |
| `_normalizePaneState` | 21197 | 17 | other / helpers |  |  |  |  |  | ● | 1 |
| `_onViewportResize` | 21215 | 47 | other / helpers |  |  |  |  |  | ● | 0 |
| `_sbFitHeader` | 21276 | 9 | other / helpers |  |  |  |  |  | ● | 3 |
| `sfOrdered` | 21323 | 8 | find / smart views |  |  |  |  |  | ● | 7 |
| `moveSfItem` | 21331 | 12 | find / smart views |  | ● |  |  |  | ● | 0 |
| `ensureNoteKinds` | 21366 | 6 | tags / types / tabs |  |  |  |  |  | ● | 7 |
| `noteKinds` | 21372 | 1 | tags / types / tabs |  |  |  |  |  | ● | 19 |
| `ensureNoteKindCats` | 21373 | 6 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `noteKindCats` | 21379 | 1 | tags / types / tabs |  |  |  |  |  | ● | 17 |
| `kindsInCat` | 21380 | 1 | tags / types / tabs |  |  |  |  |  | ● | 4 |
| `kindById` | 21381 | 1 | tags / types / tabs |  |  |  |  |  | ● | 9 |
| `artKinds` | 21382 | 4 | tags / types / tabs |  |  |  |  |  | ● | 19 |
| `artKind` | 21386 | 1 | tags / types / tabs |  |  |  |  |  |  | 0 |
| `untouchedDays` | 21387 | 4 | other / helpers |  |  |  |  |  | ● | 3 |
| `isNagNote` | 21392 | 2 | other / helpers |  |  |  |  |  | ● | 1 |
| `isMyWallNote` | 21395 | 1 | other / helpers |  |  |  |  |  | ● | 0 |
| `_flushEd` | 21404 | 13 | other / helpers | ● |  |  |  |  | ● | 8 |
| `setNoteKind` | 21417 | 6 | tags / types / tabs | ● | ● |  |  |  |  | 0 |
| `toggleNoteKind` | 21423 | 12 | tags / types / tabs | ● | ● |  | ● |  | ● | 0 |
| `finishNote` | 21435 | 7 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `unfinishNote` | 21442 | 6 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `addNoteKindTab` | 21448 | 13 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `order` | 21455 | 1 | other / helpers |  |  |  |  |  |  | 0 |
| `renameNoteKind` | 21461 | 10 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `kindBarHTML` | 21473 | 50 | tags / types / tabs |  |  |  |  |  | ● | 4 |
| `_attachCount` | 21526 | 3 | other / helpers |  |  |  |  |  | ● | 4 |
| `mwCatIsOpen` | 21532 | 4 | other / helpers | ● |  |  |  |  | ● | 2 |
| `mwToggleAllCats` | 21536 | 10 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `mwToggleViewMode` | 21546 | 6 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `renderMyWall` | 21552 | 92 | render | ● |  |  |  |  | ● | 1 |
| `_kindLatest` | 21586 | 1 | tags / types / tabs |  |  |  |  |  | ● | 4 |
| `_sortKinds` | 21587 | 4 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `isJournal` | 21648 | 9 | calendar / journal / contacts / database | ● |  |  |  |  | ● | 0 |
| `getSmartGroups` | 21659 | 61 | organisation | ● |  |  |  |  | ● | 4 |
| `ts` | 21661 | 1 | other / helpers |  |  |  |  |  | ● | 12 |
| `sod` | 21662 | 1 | other / helpers |  |  |  |  |  | ● | 2 |
| `togSfGrp` | 21720 | 6 | find / smart views |  |  |  |  |  | ● | 0 |
| `togMwCat` | 21726 | 5 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallCatDStart` | 21738 | 10 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallCatDEnd` | 21748 | 5 | other / helpers |  |  |  |  |  | ● | 1 |
| `wallCatDOver` | 21753 | 9 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallCatDLeave` | 21762 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallCatDDrop` | 21766 | 30 | other / helpers |  | ● |  |  |  | ● | 0 |
| `wallGrpDStart` | 21796 | 9 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallGrpDEnd` | 21805 | 5 | other / helpers |  |  |  |  |  | ● | 3 |
| `wallGrpDOver` | 21810 | 8 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallGrpDLeave` | 21818 | 4 | other / helpers |  |  |  |  |  | ● | 0 |
| `wallGrpDDrop` | 21822 | 18 | other / helpers |  | ● |  |  |  | ● | 0 |
| `moveWallKind` | 21840 | 10 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `showWallKindCtx` | 21850 | 23 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `_groupUnion` | 21873 | 6 | organisation |  |  |  |  |  | ● | 1 |
| `getSmartArts` | 21880 | 32 | find / smart views | ● |  |  |  |  | ● | 6 |
| `renderSmartSection` | 21913 | 31 | render |  |  |  |  |  | ● | 1 |
| `toggleFav` | 21945 | 9 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `togglePin` | 21955 | 9 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `promptAddArtTag` | 21966 | 56 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `applyTag` | 21968 | 14 | tags / types / tabs |  | ● |  |  |  |  | 0 |
| `tagPickerRender` | 21982 | 29 | tags / types / tabs | ● |  |  |  |  | ● | 4 |
| `tagPickerRender` | 22022 | 28 | tags / types / tabs | ● |  |  |  |  | ● | 4 |
| `tagPickerApply` | 22050 | 16 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `removeArtTag` | 22066 | 9 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `showSfItemCtx` | 22075 | 18 | find / smart views |  |  |  |  |  | ● | 1 |
| `renameSfItem` | 22093 | 11 | find / smart views |  |  |  |  |  | ● | 0 |
| `finRenameSfItem` | 22104 | 5 | find / smart views |  | ● |  |  |  | ● | 0 |
| `setSfItemColor` | 22109 | 7 | find / smart views |  | ● |  |  |  | ● | 1 |
| `ctxSfItemColorSwatches` | 22116 | 8 | find / smart views |  |  |  |  |  | ● | 1 |
| `setSmartViewBold` | 22124 | 5 | find / smart views |  | ● |  |  |  | ● | 0 |
| `setSfItemBold` | 22129 | 7 | find / smart views |  | ● |  |  |  | ● | 0 |
| `toggleTagSection` | 22136 | 6 | organisation |  |  |  |  |  | ● | 0 |
| `showTagSecCtx` | 22142 | 17 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `ctxTagSecColorSwatches` | 22159 | 7 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `setTagSecColor` | 22166 | 5 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `renameTagSection` | 22171 | 9 | organisation |  |  |  |  |  | ● | 0 |
| `finRenTagSec` | 22180 | 7 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `promptAddGlobalTag` | 22188 | 9 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `addGlobalTag` | 22197 | 7 | tags / types / tabs |  | ● |  |  |  | ● | 0 |
| `showTagCtx` | 22204 | 13 | tags / types / tabs |  |  |  |  |  | ● | 1 |
| `renameTag` | 22217 | 10 | tags / types / tabs |  |  |  |  |  | ● | 0 |
| `finRenameTag` | 22227 | 11 | tags / types / tabs | ● | ● |  | ● |  | ● | 2 |
| `deleteTag` | 22238 | 7 | tags / types / tabs | ● | ● |  |  |  | ● | 0 |
| `finRenameArtTitle` | 22245 | 8 | other / helpers | ● | ● |  |  |  | ● | 0 |
| `renderTagSection` | 22254 | 33 | render |  |  |  |  |  | ● | 1 |
| `startRenameArtTitle` | 22287 | 10 | other / helpers | ● |  |  |  |  | ● | 0 |
| `_flushEverythingOut` | 22369 | 8 | other / helpers |  | ● |  |  |  | ● | 2 |
| `_a11yWireClickables` | 22588 | 9 | other / helpers |  |  |  |  |  | ● | 3 |
