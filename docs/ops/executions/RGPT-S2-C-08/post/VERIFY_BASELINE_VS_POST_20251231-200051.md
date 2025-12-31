# RGPT-S2-C-08 — Verification: Baseline vs POST

- Verified at: 2025-12-31 20:00:54
- Baseline (normalized): docs/ops/executions/RGPT-S2-C-08/baseline/grants_snapshot_dashboard_20251231-194456_NORMALIZED.json
- POST (normalized): docs/ops/executions/RGPT-S2-C-08/post/grants_snapshot_post_20251231-195919_NORMALIZED.json
- Applied SQL: docs/ops/executions/RGPT-S2-C-08/enforce/apply_public_only_20251231-195025.sql

## Summary

- GRANTS_TABLES baseline count: **1185**
- GRANTS_TABLES post count    : **1179**
- Removed GRANTS_TABLES entries: **6**

## Removed entries (public only)

- public|orchestrator_runs|authenticated|INSERT
- public|orchestrator_runs|authenticated|UPDATE
- public|proposals|authenticated|INSERT
- public|proposals|authenticated|UPDATE
- public|self_apply_jobs|authenticated|INSERT
- public|self_apply_jobs|authenticated|UPDATE
