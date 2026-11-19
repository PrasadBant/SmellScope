# RSM Interface Redesign — Validation Report

Scope: the redesigned Remediation Safety Monitor interface and the backend enforcement behind it.
RSM's safety rules and default thresholds were **not changed**; backend enforcement was **strengthened**, never weakened.

## Results actually obtained

| Suite | Command | Result |
|---|---|---|
| Backend (pytest) | `python -m pytest tests -q` | **110 passed**, 0 failed (75 before this work + 35 new) |
| Frontend unit (Vitest) | `npm test` | **29 passed**, 0 failed (17 before + 12 new) |
| TypeScript | `npx tsc --noEmit` | pass |
| Production build | `npm run build` | pass |
| Browser journeys (Playwright) | `npx playwright test` | **7 passed** (5 existing + 2 new RSM journeys), see flakiness note |

### Flakiness note (disclosed)
Over 8 full Playwright runs, **Journey C** (Improvement Centre apply → comparison) failed in 2 early runs and passed in the
5 consecutive runs that followed (plus once alone). I could not reproduce or root-cause the intermittent failure; the first
failures coincided with a stale backend from before the change still holding port 8000 (Playwright reuses an existing server).
Treat Journey C as *passing but not proven stable*. Always stop any running SmellScope server before `npx playwright test`.

## Bugs found and fixed while implementing this

1. **RSM never read its configuration.** `config/default.yaml` used key names (`min_class_retention`, …) that `rsm.py` did not read, and
   the repair-plan path never passed the config in, so thresholds were hardcoded. `rsm.policy` now uses the keys RSM reads and
   `load_rsm_policy()` loads them (defaults are only a fallback). Verified by changing the config in a test.
2. **Cluster retention was never evaluated for Improvement Centre plans** (`by_cluster` was always empty). It is now computed from the
   PDD clusters before/after the plan.
3. **No stale-preview protection.** A preview could be applied after the dataset version had changed, and repeatedly. Previews are now bound
   to the dataset version and the exact plan (`plan_hash`), and are single-use.
4. **No separate test-set fingerprint check at apply.** Added fingerprint (ids + row content) verification independent of RSM.
5. **UI treated a missing RSM report as "SAFE"** (Apply enabled). A missing report now disables Apply.
6. **Remediation screen displayed `[object Object]`** for "Rows Retained" (it formatted an object). Replaced by real before/after counts.

## Acceptance checklist

Legend: PASS = verified by an automated test run above · NOT TESTED · PARTIAL

| Requirement | Status | Evidence |
|---|---|---|
| Beginner introduction + expandable "How does RSM work?" | PASS | `rsm_safety_check.test.tsx`, Playwright BLOCK journey |
| PASS visually clear, next action | PASS | Vitest (decision text, enabled Apply) |
| WARN explains exact risk (class, counts, retention, thresholds) | PASS | `test_rsm.py`, Vitest, Playwright WARN journey |
| BLOCK explains why, Apply disabled, guidance | PASS | Vitest, Playwright BLOCK journey |
| Thresholds from configuration, none hardcoded in UI | PASS | `test_policy_changes_in_config_take_effect`; Vitest with a non-default policy |
| Class retention WARN/BLOCK boundaries (49/50/20/19 %) | PASS | `test_class_retention_thresholds` (6 cases) |
| Cluster retention WARN/BLOCK, >5-row rule, small clusters disclosed | PASS (rules, unit level) | `test_cluster_retention_thresholds`, `test_small_clusters_are_listed_but_not_evaluated` |
| Cluster WARN/BLOCK produced by a real dataset end-to-end | PARTIAL | Real composite plans evaluate real clusters, but the real-data tests only exercised retention 100 %; WARN/BLOCK cluster outcomes are tested with crafted previews |
| Feature removal WARN above 10, never BLOCK | PASS | `test_feature_removal_*`, real 12-feature plan |
| BLOCK precedence over WARN; combined WARN+BLOCK | PASS | `test_block_takes_precedence…`, `test_combined_plan_…` |
| Acknowledgement required for WARN; never pre-ticked; cannot bypass BLOCK | PASS | pytest (manager + HTTP), Vitest, Playwright |
| Backend independently re-checks at apply; direct API rejection (BLOCK → 403, WARN unacknowledged → 400) | PASS | `test_rsm_api.py`, Playwright BLOCK journey |
| Stale preview / changed dataset version rejected (409) | PASS | `test_stale_preview…`, API wrong-hash test |
| Modified plan after preview rejected | PASS | `test_modified_plan_after_preview_is_rejected` |
| Conflicting selected transformations | NOT TESTED | No conflict-resolution logic exists; combined transformations are applied additively |
| Locked test set: modified row → fingerprint mismatch blocks apply even at RSM PASS | PASS | `test_locked_test_set_change_blocks_application…` |
| Locked test set: plan touching test rows rejected | PASS | `test_training_view_containing_test_rows_is_rejected` |
| Test-set protection shown separately in UI, FAILED blocks Apply | PASS | Vitest |
| Safety Record: PASS/WARN-acknowledged messages and IDs | PASS | pytest, Vitest, Playwright WARN journey |
| BLOCK recorded without application | PASS | `GET …/rsm-records` shows `APPLY_REJECTED`; no version/export created |
| NO_CHANGE creates no new version and says so | PASS (backend + component) | `test_no_change_when_features_already_excluded`, Vitest; not covered by a browser journey |
| Recorded retention equals the corrected dataset | PASS | `test_warn_requires_acknowledgement…` recomputes from the new training view |
| Responsive layout on small screens | NOT TESTED | Sections use stacked Tailwind grids; no mobile-viewport test was run |
| Accessibility (text labels, progressbar roles) | PARTIAL | Text + icons for every state and `role="progressbar"` bars; no automated a11y audit run |
| Results persist with the experiment | PARTIAL | Records live in server memory (same as repair previews/views); the corrected dataset CSV persists, the RSM event log does not survive a restart |

## Known limitations

* RSM events, previews and dataset views are in-memory per server process.
* The R2 quarantine action has no UI; the backend R2 path got the same stale/test-integrity protections but is only covered by existing tests.
* `min_total_train_rows_block` (fewer than 10 training rows) is an existing safety floor that is not in the requested threshold table; it is kept and disclosed in the UI.
* Cluster retention depends on the PDD clustering of the *training* rows at preview time.
