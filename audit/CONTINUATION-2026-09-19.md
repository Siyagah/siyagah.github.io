# Siyagah — continuation file, 19 September 2026

For whoever picks this up next, human or otherwise.

## Where things are

| | |
|---|---|
| Branch | `claude/elegant-maxwell-8maykf` |
| Commit | see `git rev-parse HEAD` — the delivery commit is recorded in `audit/CORRECTION-AUDIT-2026-09-19-v0438.md` §8 |
| Version | **v04.38** (meta tag, `.sb-logo`, `sw.js` — all three) |
| Pull request | [#41](https://github.com/Siyagah/siyagah.github.io/pull/41) — a **merge candidate**, deliberately not merged |
| Base it was cut from | `b56e403` (v04.35), which was cut from `ba6c70f` (v04.34 = `origin/main` = what is live) |
| Gate | `node tools/audit-all.mjs` — see `audit/CORRECTION-AUDIT-2026-09-19-v0438.md` §6 for the v04.38 totals |
| CI | `.github/workflows/checks.yml`, a **candidate**: it reports, it does not block. Verified green on the v04.38 head `b5ed9d1`: [run 35429336608](https://github.com/Siyagah/siyagah.github.io/actions/runs/35429336608) (push) and [35429338062](https://github.com/Siyagah/siyagah.github.io/actions/runs/35429338062) (PR) — the log prints `654 checks across 15 suites · 323 matrix rows · All suites green` |

## The documents, in the order they were written

1. `audit/AUDIT-2026-09-18.md` — the first independent audit (Findings 1–6).
2. `audit/phase0/BASELINE.md` — that audit's claims re-measured, not believed.
3. `audit/RELEASE-AUDIT-2026-09-19.md` — the v04.36 programme report.
   **Its release recommendation is superseded**; three of its claims were too
   strong and are corrected in (4).
4. `audit/CORRECTION-AUDIT-2026-09-19-v0437.md` — the first correction round.
5. `audit/CORRECTION-AUDIT-2026-09-19-v0438.md` — **read this one first.**
   A second independent review of `817da3c` found two defects *inside*
   v04.37's own safety feature: Restore proceeded when the undo copy had
   failed, and the save gate compared a record's metadata against itself
   instead of hashing the bytes it read back. Both reproduced on `817da3c`
   before anything was changed, both fixed, `audit-j-recovery` 41 → 45.
6. `audit/FEATURE-MATRIX.md` — generated, never written by hand.
7. `audit/DEFECT-REGISTER.md` (C1–C3 are the v04.38 rows),
   `audit/DECISION-REGISTER.md`, `audit/inventory/FUNCTION-INVENTORY.md`.

## What is blocked, and on whom

**Only two things, and both are the owner's.** Neither is a code problem.

1. **Firestore Rules.** They live in the owner's Firebase console and decide
   whether the notebook is private at all. Nothing in this repository can
   compensate for permissive rules. *This is the most important open item.*
2. **`legacy/v03.99/` private residue.** Sealed by I6; four sign-in iframes
   with the API key, the notebook id and a real note title, at a public URL.
   Recommendation: strip **only** the residue, leave every line of application
   code, record a named exception in `legacy/README.md` and `CLAUDE.md`.

## What is NOT outstanding

The four blockers from the independent review of v04.36 are closed, with
regression tests asserting persisted/exported data and cancellation
invariants. The further verification it asked for — an adversarial sanitiser
audit and evidenced rollback — is done. CI runs the real suite.

There is no code work left that does not depend on one of the two decisions
above. **Adding more checks is not the honest next step; the decisions are.**

## If you are starting fresh

Read, in this order: `CLAUDE.md` (the standing brief, including the standing
lessons — they are all paid for), `tools/README.md` (the harness traps,
including the ones that cost this programme a wrong diagnosis), then (4) above.

Then: `git fetch origin main && node tools/audit-all.mjs`. If it is not green,
fix that before anything else.

## The one thing worth carrying forward

Every round of this programme found at least one defect **in its own checks**,
and several of those checks had been reporting a pass. A green gate is a
statement about what was asked, never about what is true — and the two worst
examples were a results table generated from a run that measured nothing, and
a comparison check that reported 11/11 while silently skipping the two
comparisons it exists to make. When a check cannot do its job, it must fail.
