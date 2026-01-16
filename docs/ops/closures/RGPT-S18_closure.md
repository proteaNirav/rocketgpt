# RGPT-S18 — Canonical Surface De-dup + Workflow Name Drift Lock (Closure)

- Timestamp: 2026-01-16 22:55:12 +05:30
- Repo: D:\Projects\RocketGPT\rocketgpt
- HEAD: 1f0e8497f6780de720c1570fad35f12639c0ad65

## Objective
Stabilize RocketGPT governance workflows by:
1) de-duplicating governance-adjacent workflow filenames that created naming drift, and
2) adding a drift-lock guard that enforces canonical workflow filenames + canonical workflow 
ame: values, and blocks reintroduction of historical drift names.

## Canonical workflow allowlist (locked)
- policy_gate.yml (name: policy_gate)
- self_heal.yml (name: self_heal)
- self_improve.yml (name: self_improve)
- watchdog.yml (name: watchdog)
- auto_fix_policy.yml (name: auto_fix_policy)

## Changes delivered

### S18-A — Inventory
- Findings report (ignored executions path, local evidence only):
  - docs/ops/executions/RGPT-S18/RGPT-S18-A_workflow_inventory.md

### S18-B — Governance-adjacent de-dup (rename / harden)
Renamed:
- auto_update_policy.yml -> auto_fix_policy_update.yml
- self_innovate.yml -> self_improve_innovate.yml
- selfimprove_ingest_ci.yml -> self_improve_ingest_ci.yml
- self_heal_hooks.yml -> self_heal_probe.yml
- self-redev.yml -> automation_refactor_pr.yml

Hardened:
- self_reasoning.yml
  - removed contents:write
  - removed commit/push step (no repo mutation)

Evidence:
- Commit: d5da0a5c (S18-B)

### S18-C — Drift lock (enforcement)
Added:
- .github/tools/workflow_guard/enforce_workflow_canonical_names.ps1
- .github/workflows/workflow_name_drift_lock.yml

Normalized canonical workflow 
ame: fields:
- auto_fix_policy.yml -> name: auto_fix_policy
- self_heal.yml -> name: self_heal
- self_improve.yml -> name: self_improve
- watchdog.yml -> name: watchdog

Evidence:
- Commit: 1f0e8497 (S18-C)

## Result
- Canonical governance surface is stable and regression-protected.
- Non-governance workflows remain allowed (ci.yml, labels.yml, triage.yml, deploy workflows, etc.).
