# Learning + Governed Libraries Audit

Date: 2026-03-05  
Repo: `rocketgpt`

## Scope audited
- Code + routes in:
  - `rocketgpt_v3_full/webapp/next`
  - `apps/core-api`
  - `scripts`
  - `.github/workflows`
- Supabase migrations in:
  - `rocketgpt_v3_full/webapp/next/supabase/migrations`
- Other SQL migrations in:
  - `infra/db/migrations`

## Existing database artifacts (overlap assessment)

### Supabase-local migrations (active in this repo)
1. `governance.crps_executions`
- Source: `rocketgpt_v3_full/webapp/next/supabase/migrations/20260302_cats_governance_monitor.sql`
- Purpose: preflight risk signature records.
- Overlap with learning: partial on audit/provenance only.
- Decision: reuse governance logging path, do not repurpose table for learning content.

2. `governance.crps_weekly_patterns`
- Purpose: weekly aggregation of CRPS patterns.
- Overlap: none for content ingestion.
- Decision: keep as-is.

3. `governance.policy_rules`
- Purpose: containment policy rules.
- Overlap: policy controls conceptually related, but not a learning content store.
- Decision: keep as-is; optionally reference for reviewer/admin roles.

4. `governance.containment_events`
- Purpose: L2/L3 containment event history.
- Overlap: none for learning items.
- Decision: keep as-is.

5. `governance.foresight_tasks`
- Purpose: generated governance task backlog.
- Overlap: none for learning source/item lifecycle.
- Decision: keep as-is.

6. `governance.weekly_digest_snapshots`
- Purpose: governance digest snapshots.
- Overlap: none.
- Decision: keep as-is.

7. `governance.ledger_events` (append-only)
- Purpose: canonical governance ledger events persisted in Supabase.
- Overlap: strong on required audit trail.
- Decision: **reuse for learning approve/publish/revoke/reject events**.

8. `public.cats`, `public.cats_versions`, `public.cats_permissions`, `public.cats_fingerprints`, `public.cats_metrics_stub`
- Source: `20260305_cats_registry_lifecycle.sql`
- Purpose: CAT registry/lifecycle.
- Overlap: provides tenant/RLS helper pattern and lifecycle style, not learning content.
- Decision: reuse patterns only (RLS and lifecycle style), not table schema.

### Non-Supabase SQL in repo (for awareness)
1. `public.runtime_executions`, `public.runtime_timeline_events`
- Source: `infra/db/migrations/2026_02_10__runtime_timeline.sql`
- Purpose: runtime timeline/append-only execution events.
- Overlap: telemetry/audit style only.
- Decision: no direct reuse in Next/Supabase learning feature.

## Existing RLS + tenant scoping patterns
- `public.cats*` migration defines:
  - `public.rgpt_current_tenant_id()` (JWT `tenant_id`)
  - `public.rgpt_is_tenant_admin()` (JWT role metadata)
  - per-table tenant-scoped select/write policies.
- API layer tenant convention currently used by CATS:
  - headers `x-tenant-id`, `x-user-id`
  - admin write via governance auth (`x-governance-role=admin` + `x-admin-token`) in many governance routes.

Decision:
- Reuse JWT/RLS helper style for new learning tables.
- Reuse header-level conventions for route handlers.

## Existing folders/files relevant to libraries + indexing
1. `docs/libraries/` (new root currently present with `.gitkeep`)
2. `docs/libraries.master_index.json`
3. `scripts/quality/libs-index.mjs`
- Generates:
  - `docs/libraries/<library>/index.json`
  - `docs/libraries.master_index.json`
- Supports tags/topics from markdown frontmatter and sidecar `.meta.json`.

Related legacy/adjacent artifacts:
- `data/self_study/knowledge_index.json` via demo self-study route.
- `data/domains/*` bootstrap via `knowledge_library_bootstrap.yml`.

Decision:
- Use `docs/libraries` + existing `libs-index` generator as canonical library index mechanism.
- Keep `data/self_study` artifacts for demo status screens (not canonical library publishing).

## Existing APIs/routes relevant to learning/feeds/topics

### Governance + ledger hooks
- `lib/db/governanceRepo.ts` exposes `appendGovernanceLedgerEvent(...)`.
- `lib/cats/ledger.ts` already wraps governance ledger calls for CATS lifecycle writes.
- `lib/governance/governance-service.ts` performs preflight/post-run governance writes.

Decision:
- Reuse `appendGovernanceLedgerEvent` directly for learning lifecycle actions.

### Existing learning-adjacent routes
- `/api/demo/self-study` and `/api/demo/orchestrator/status`:
  - currently demo-only knowledge index behavior.
- `/api/self-improve/*`:
  - proposal/scan/execute interfaces; primarily CLI-driven and not RSS/chat-learning canonical store.
- `/api/approvals/*` + `lib/approvals-db.ts`:
  - currently in-memory approval model, not tenant-scoped persisted learning workflow.

Decision:
- Reuse auth + lightweight UI patterns.
- Do **not** treat self-improve or demo self-study as canonical learning registry.

### Existing CATS lifecycle/admin endpoints (useful pattern reference)
- `/api/cats`, `/api/cats/:catId`, `/api/cats/:catId/versions`, `/api/cats/:catId/transition`
- `/admin/cats*` UI pages and Playwright tests.

Decision:
- Reuse structure/patterns for learning inbox/review/sources UI and API.

## Existing background/schedule mechanisms
1. GitHub Actions scheduled workflows (`schedule`/cron) already used extensively.
2. `ecosystem-watcher.yml` fetches RSS feeds daily (creates issue digest).
3. Governance job endpoint: `/api/governance/jobs/weekly-digest` called from UI/admin.
4. `self_study.yml` scheduled placeholder knowledge index generation.

Decision:
- Reuse GitHub Actions cron + authenticated API endpoint pattern for RSS ingestion scheduling.
- Reuse job endpoint model for manual trigger from Admin UI.

## Reconcile / canonicalization decisions
1. Canonical governance ledger for this feature
- Use `governance.ledger_events` via `appendGovernanceLedgerEvent`.
- No new duplicate ledger implementation.

2. Canonical library indexing
- Use existing `scripts/quality/libs-index.mjs`.
- No parallel index format.

3. Canonical learning storage
- No existing Supabase learning tables found in current migrations.
- Introduce minimal tenant-scoped learning tables in Supabase migration.

4. Existing duplicate-ish concepts (not canonical for this feature)
- `self-improve` proposals and in-memory approvals are adjacent but not equivalent.
- Keep existing modules; do not remove.
- Avoid dual-write into unrelated proposal stores.

## Reuse vs replace vs remove
- Reuse:
  - governance ledger append path (`appendGovernanceLedgerEvent`)
  - admin auth pattern (`x-governance-role`, admin token)
  - CATS route/layout/test patterns
  - library index generator (`libs-index`)
  - existing cron/workflow scheduler pattern
- Replace:
  - none immediately.
- Remove:
  - none (per constraint: no destructive migration/deletion of production data tables).

