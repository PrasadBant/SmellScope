# RSM User Guide — the Dataset Safety Check

RSM (**Remediation Safety Monitor**) checks whether a proposed dataset repair is safe *before* it is applied.
It protects your **training data** from excessive cleaning. It never changes the scientific rules of the audit.

## What you see

When you click **Generate Repair Plan** in the Improvement Centre (or **Continue to Safety Check** in the
Remediation workflow) SmellScope computes the real effect of your selection and shows the **Dataset Safety Check**:

1. **Introduction** – what RSM does and why it matters. Open **How does RSM work?** for the exact limits.
2. **The decision** – one of three outcomes (always shown with text, not only colour).
3. **Why** – one card per warning/block with the real class, record counts, retention and the thresholds.
4. **Safety summary** – *Attack Class Protection*, *Cluster Protection*, *Feature Protection*.
5. **Locked Test Set Protection** – shown separately from RSM.
6. **Acknowledgement** (WARN only) and the **Apply** button.

### The three outcomes

| Outcome | Meaning | What you can do |
|---|---|---|
| **PASS — Safe to proceed** | Every class, cluster and feature limit is met. | Click **Continue to Apply Improvements**. You still confirm. |
| **WARN — Review before applying** | Your plan may remove a significant amount of training data. | Read the affected class/cluster cards, then tick *"I have reviewed the safety warnings and understand the possible impact on my training dataset."* The checkbox is never pre-ticked. Only then can you **Apply Despite Warnings**. |
| **BLOCK — Repair cannot be applied** | A critical limit is violated. | Apply is disabled and the backend refuses the request. Remove the risky operation, select fewer improvements, generate a new preview. There is no override. |

## The rules (loaded from configuration)

Values come from `config/default.yaml` under `rsm.policy`; the UI shows whatever the backend loaded.

| Check | WARN | BLOCK |
|---|---|---|
| Class training-row retention | below 50% | below 20% |
| Cluster retention (clusters with **more than 5** rows) | below 25% | below 10% |
| Features removed in one plan | more than 10 | *none* (never blocks) |
| Remaining training rows (existing safety floor) | – | fewer than 10 |

* `Class retention = remaining training rows ÷ original training rows`. Cluster retention is calculated the same way
  per PDD cluster of each attack class.
* A BLOCK always takes precedence over a WARN for the same condition.
* Clusters with 5 or fewer original rows are **listed but not evaluated**, and the screen says so.
* To change a limit, edit `rsm.policy` (keys `min_class_retention_warn/_block`, `min_cluster_retention_warn/_block`,
  `max_ablation_features_warn`, `min_total_train_rows_block`). No limit is hardcoded in the frontend.

## Locked test set protection (separate from RSM)

RSM judges training data only. Independently of the RSM decision the backend:

* fingerprints the locked test partition (row ids **and** row contents) when the run starts;
* re-verifies the fingerprint at preview and again at apply;
* rejects any plan whose operations touch a test row (`assert_test_untouched`).

If this check fails (`E_TEST_INTEGRITY` / `E_TEST_LEAK`) the repair cannot be applied **even when RSM says PASS**.

## From preview to a new dataset version

1. You select improvements → **Generate Repair Plan**.
2. The backend resolves your selection against its own recommendations (it does not trust client-supplied parameters),
   calculates the expected changes and evaluates RSM on the *combined* plan.
3. The preview is bound to the dataset version it was made for (`base_view_hash`) and to the exact plan (`plan_hash`).
4. You review and (for WARN) acknowledge. The UI sends the `plan_hash` back with the apply request.
5. The backend repeats the checks: preview still current, plan unchanged, test set intact, RSM decision, acknowledgement.
6. It verifies the training data still matches the previewed state, applies the transformation and creates a new version.
7. A preview authorises **one** application. A preview made for an older version, a tampered plan or a wrong hash is rejected
   with `409 E_STALE_PREVIEW` — generate a new preview.

## RSM Safety Record

After applying, the **RSM Safety Record** shows what was authorised and what actually happened:

* decision at preview and the independent backend decision at apply;
* whether acknowledgement was required and given;
* class retention (expected, and **measured** in the corrected dataset), cluster results, features removed;
* locked-test-set verification, preview ID, transformation ID, new dataset version, timestamp.

Messages: *applied after passing the required RSM checks* · *applied after reviewing and acknowledging the safety warning* ·
*not applied because it violated the safety policy* (blocked/refused attempts appear in the event log, not as a version) ·
*RSM approved the plan, but it produced no dataset changes; no new version was created* (`NO_CHANGE`).

The authoritative decision is the **pre-application** evaluation, repeated by the backend. No post-repair RSM run is
presented as if it had authorised an already-completed change.

The full event history (previews, applications, rejections) for a run is available at
`GET /api/v1/audits/{run_id}/rsm-records`.

## For developers

* `smellscope/remediation/rsm.py` – `check_rsm`, `load_rsm_policy`. The report keeps the original keys
  (`status`, `warnings`, `blocks`, `impact`, `policy`) and adds `checks`, `requires_acknowledgement`, `summary` and
  per-issue `title`/`explanation`/`evidence`.
* `smellscope/remediation/manager.py` – `compute_test_fingerprint`, `verify_test_integrity`, `compute_plan_hash`,
  `assert_preview_current`, `build_rsm_record`, composite cluster retention.
* `frontend/src/components/rsm/RsmSafetyCheck.tsx` – `RsmSafetyCheck`, `RsmSafetyRecord`, `canApplyPlan`
  (presentation only; the backend is authoritative).
* Error codes: `E_RSM_BLOCK` (403), `E_RSM_WARN_UNACKED` (400), `E_STALE_PREVIEW` (409), `E_TEST_INTEGRITY` (403).
