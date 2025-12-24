# RGPT Stocktake — S2 B-19 (Post-merge CI Verification)

- GeneratedAtUTC: 2025-12-24T11:12:27Z
- HEAD: b5770842548c8c987db3fce45e6674aa20912777

## CI Snapshot Summary
- Total workflows observed: 45
- Failures (last run): 7
- Success but not on HEAD: 13
- No runs recorded: 19

## Post-merge verification result (critical set)
- OK: Self-Heal Hooks = success on HEAD (see docs/ops/executions/RGPT-S2-B-19/ci_rerun_proof.md)
- OK: Self-Improve (v4 Core AI) = success on HEAD (see docs/ops/executions/RGPT-S2-B-19/ci_rerun_proof.md)
- WARN: _selfimprove_ingest_ci = skipped on HEAD (see docs/ops/executions/RGPT-S2-B-19/ci_dispatch_capability.md)

## Gaps / Backlog created by B-19

### 1) Workflows without workflow_dispatch (cannot be re-run on demand)
- .github/workflows/policy_gate.yml
- .github/workflows/watchdog.yml
- .github/workflows/unit-tests.yml
- .github/workflows/rgpt-ci-with-ledger.yml

Action: add workflow_dispatch to allow on-demand post-merge verification runs.

### 2) Known failing workflows (historical failures)
- .github/workflows/auto-merge.yml (failed 2025-10-31)
- .github/workflows/codegen.yml (AI Codegen) (failed 2025-11-05)
- .github/workflows/auto_fix_policy*.yml (failed 2025-11-14)
- .github/workflows/nightly-self-evaluator.yml (failed 2025-12-23)
- .github/workflows/pr-checks.yml (failed 2025-11-23)
- .github/workflows/review.yml (failed 2025-12-20)
- .github/workflows/ship-issue.yml (failed 2025-11-05)

Action: classify each as (A) deprecated -> disable/archive, or (B) required -> fix.

### 3) Suspicious / cleanup candidates
- .github/workflows/_temp_bad.yml exists and has no runs; likely remove/archive.

## Evidence Pack (B-19)
- docs/ops/executions/RGPT-S2-B-19/ci_snapshot_main.json
- docs/ops/executions/RGPT-S2-B-19/ci_snapshot_main.csv
- docs/ops/executions/RGPT-S2-B-19/ci_snapshot_summary.json
- docs/ops/executions/RGPT-S2-B-19/ci_rerun_proof.md
- docs/ops/executions/RGPT-S2-B-19/ci_rerun_log.txt
- docs/ops/executions/RGPT-S2-B-19/ci_dispatch_capability.md
