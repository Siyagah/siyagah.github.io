# Phase 0 — Secure baseline and reproduction of v04.35

**Session:** Claude-Siyagah continuation, 19 September 2026
**Master Plan:** `Siyagah — Master Audit and Continuous Build Plan`, 2026-09-19, §6 Phase 0

## Baseline identity — verified, not assumed

| | |
|---|---|
| Repository | `https://github.com/Siyagah/siyagah.github.io` |
| v04.34 baseline commit | `ba6c70f4ac4f6e799ad6d92d749172b4178320ad` (= `origin/main`) |
| v04.35 audit candidate | `b56e40341e6edd84e9b898d8eba968de036e7d62` on `origin/claude/awesome-hamilton-3rlj8c` |
| Candidate is | exactly **one commit** ahead of `origin/main`, 0 behind |
| Continuation branch | `claude/elegant-maxwell-8maykf`, created from `b56e403` |
| Working tree at start | clean |
| App version markers | `<meta name="app-version" content="04.35">`, `.sb-logo` `v04.35`, `sw.js VERSION = 'v04.35.01'` — all three agree |

## Gates reproduced on the candidate

| Gate | Reported by prior session | Measured here | Result |
|---|---|---|---|
| `tools/ship-check.mjs` | 11/11 | **11/11 passed**, exit 0 | reproduced |
| `tools/app-check.mjs` | 286/286 | **286/286 passed**, exit 0 | reproduced |
| `audit/repro/journeys.mjs` | 24/24 | **24/24 passed**, exit 0 | reproduced |
| `audit/repro/persistence-reload.mjs` | 6/6 | **6/6 passed**, exit 0 | reproduced |

No discrepancies. Zero `FAIL` lines in any run.

## Findings 1–3 reproduced — BEFORE *and* AFTER

The prior session's report was **not** taken on trust. A detached worktree was
created at the v04.34 baseline commit and the repro scripts were run against the
*unfixed* code, so that "fixed" is a measured difference and not an assertion.

### Finding 1 — pop-up note silently emptied (CRITICAL, I1)

| Viewport | v04.34 (`ba6c70f`) | v04.35 (`b56e403`) |
|---|---|---|
| phone 390×844 | note intact *(occlusion, not design)* | note intact |
| tablet 820×1180 | **\*\*\* NOTE SILENTLY EMPTIED \*\*\*** | note intact |
| desktop 1440×900 | **\*\*\* NOTE SILENTLY EMPTIED \*\*\*** | note intact |

Console silent on both sides. The defect is real, the fix is real.

### Finding 2 — private residue in the exports (HIGH, privacy)

Eight residue kinds probed (`gapiIframe`, `recallSection`, `privateTitle`,
`privateFolder`, `noteIdLeak`, `ntiPicker`, `jrnPicker`, `ebPop`):

| Export | v04.34 | v04.35 |
|---|---|---|
| Deploy Export ("empty shell") | **8 of 8 present** | **0 of 8** |
| Save File export | **8 of 8 present** | **0 of 8** |

### Finding 2b — legacy residue

`ship-check` confirms `legacy/**` is still byte-identical to `origin/main`.
The residue there is therefore **still live**. This is owner Decision 1 and is
recorded as `BLOCKED—OWNER`; it does not block any other workstream.

### Finding 3 — `importJSON()` destroyed the notebook

Verified by code inspection of the candidate: `importJSON()` now validates shape,
shows a before/after count, states plainly that it replaces and syncs, and writes
a `📦 Save File` recovery copy before mutating. Adversarial behavioural tests are
Phase 3 work, not Phase 0's.

## Phase 0 gate: **MET**

Baseline identity recorded; 11/11, 286/286, 24/24 and 6/6 reproduced with no
discrepancies; Findings 1 and 2 reproduced on both sides of the fix.
Nothing merged, nothing deployed.
