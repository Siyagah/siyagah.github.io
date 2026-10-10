# Zab — the owner's plan

*Kept by the Architect. Every new message from the owner about Zab is written
here in their own words first, then turned into decisions and rounds.
Nothing here is built until it says so.*

## The owner's words

**10 Oct 2026:**
> How about write Siyagah Zab, not Jeb? Did you finish it all?
> When you do, I need full code to build it in QuranRevival.
> Also want to discuss building a separate app which should include Zab, Note
> and Folder only. (Which alteady in Siyagah, but making it simple, where Zab is
> Siyagah's one small feature only in Siyagah but the new Zab will feature
> mainly Zab from there note and Folder would be It's feature, do you get it?)
> Let's discuss this n keep my plan in the file.

## Where things stand (10 Oct 2026)

- **Inside Siyagah, Jeb is finished:** the bar of pockets, the panel, cards,
  📎 Attach, → Note, the "From Jeb" Smart View (v04.98–v05.03, live).
- **The second icon** (v05.04, "Siyagah Jeb"): built and through review; its
  final checks are running, then it goes live.
- **Reminder emails** (v05.05) come next. The spec is written.

## The plan, in four parts

### 1. Rename: "Jeb" → "Zab"

**Understood as:** the name the owner sees changes to **Zab** everywhere: the
bar, the menus, "👝 from Zab", the Smart View "(12) From Zab", the second icon
"Siyagah Zab", and the settings line "Show Zab bar".

**What stays the same:** the data and the code's internal names. The pockets and
items keep exactly what they hold, and sync is untouched. Renaming the internal
names would risk the owner's data for no visible gain.

**Decided (10 Oct): everywhere.** Planned as a small round **right after v05.04 goes live and before the
owner installs the second icon**, so the icon is called "Siyagah Zab" from the
start.

### 2. Zab inside QuranRevival

**Found:** the QuranRevival repository attached so far
(`QuranRevival---ClaudeCode`) is **retired**, a frozen copy of v07.77. All
current work is in `Madrasatul-Muslimeen.github.io` (the app is in its `app/`
folder). Zab would be built **there**.

**Decided (10 Oct): for each signed-in user** of QuranRevival, each person with
their own pockets. So it is QuranRevival's own data, not shared with Siyagah.

**Approach the Architect recommends:** not a block of code handed over, which
the owner can't use themselves. Instead, the Architect builds it in
QuranRevival's own repository, in rounds, with the same checking as here, using
Siyagah's Zab as the model. A written "how Zab is built" guide, taken from
Siyagah's code, goes with it so that project's builder can follow it.

### 3. A separate app: Zab first, with Notes and Folders

**Understood as:** in Siyagah, Zab is one small feature of a big notebook. The
new app turns that around: **Zab is the main screen**, and Notes and Folders are
its supporting features. It covers only those three things and stays simple.

**The big decision: whose app is it?**
- **(A) Only the owner's.** Then it should be the same notebook as Siyagah.
  "Siyagah Zab" (the second icon, v05.04) grows into it: the Zab screen first,
  plus a simple Notes and Folders view. It needs no second copy of the sync, can
  never drift from Siyagah, and every item and note is in both. This is the
  cheapest and safest choice. **Recommended if it is for the owner alone.**
- **(B) For other people too.** Then it is a genuinely separate app: its own web
  address, its own sign-in, and each person's own notebook. It would be built
  from Siyagah's code, cut down to Zab + Notes + Folders. It is a bigger job,
  and "one user" (D1) would not apply to it.

**Decided (10 Oct): (B), for other people too.** So the separate app needs:
its own web address and repository (the owner creates the empty repository; the
Architect cannot), its own Firebase project, a sign-in for each person, security
rules so that each person sees only their own notebook, and a check on what the
free plan holds for several users.

**Still to decide:** its name ("Zab"?), its own icon, and whether its
notes open in Siyagah's full editor or a simpler one.

### 4. Order

1. v05.04 goes live (second icon, still called "Jeb").
2. The rename to Zab, if the owner confirms it.
3. v05.05: reminder emails (already promised).
4. Then the separate Zab app and QuranRevival's Zab. Before either one
   starts, the Architect brings the owner a short plan: the name, the web
   address, and which comes first.

## Decisions

| Date | Decision |
|---|---|
| 10 Oct 2026 | Second icon: "go with the recommended one, second icon" (built as v05.04). |
| 10 Oct 2026 | Reminder emails by a helper in the owner's own Google account ("Bismillah! go with option 2"). |
| 10 Oct 2026 | Rename to Zab: **everywhere** the owner sees it; data and internal code names unchanged. |
| 10 Oct 2026 | QuranRevival Zab: **for each signed-in user**, their own pockets. |
| 10 Oct 2026 | Separate Zab app: **(B) for other people too**: its own address, sign-in, notebook per person. |
