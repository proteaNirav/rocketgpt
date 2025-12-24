# RGPT-S2-B-20 — CI Dispatch Hardening + Cleanup (Closure)

- ClosedAtUTC: 2025-12-24T11:29:58Z
- HEAD: 0a6670884adf77b2d7523e4119406eeaf7a10e81

## Completed
- Added workflow_dispatch to policy_gate.yml (manual run enabled)
- Added workflow_dispatch to watchdog.yml (manual run enabled)
- Added workflow_dispatch to ci.yml (manual run enabled)

## Notes
- unit-tests.yml / rgpt-ci-with-ledger.yml / _temp_bad.yml are not present in current HEAD; task was re-scoped to current workflows.

## Evidence
- docs/ops/executions/RGPT-S2-B-20/B-20_evidence.md
