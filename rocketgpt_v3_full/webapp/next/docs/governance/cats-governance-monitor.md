# CATS Governance Monitor

## Overview
The CATS Governance Monitor adds a centralized risk and containment layer on top of workflow execution.

Core capabilities:
- CRPS generation per execution (deterministic CAT Risk Pattern Signature)
- Policy-based containment (L1/L2/L3)
- Foresight task creation for L2/L3 events
- Weekly digest generation (Mode C) with manual/event trigger support (Mode B)
- Append-only governance ledger events

## Architecture
- `lib/governance/risk-scoring.ts`: deterministic CRPS computation
- `lib/governance/policy-engine.ts`: rule matching + default policies
- `lib/governance/containment-engine.ts`: containment decisions + simulation artifacts
- `lib/governance/foresight-engine.ts`: foresight task templates
- `lib/governance/digest-job.ts`: weekly aggregation + publication
- `lib/governance/governance-service.ts`: orchestration of preflight/post-run operations
- `lib/db/governanceRepo.ts`: persistence layer

## Preflight/Post-run Integration
- `lib/workflow-runner.ts` calls:
  - `POST /api/governance/preflight` before execution
  - `POST /api/governance/post-run` after execution

Behavior:
- L1: soft containment, execution allowed, simulation report required/logged
- L2: approval checkpoint required, auto-exec disabled
- L3: execution blocked, incident semantics enabled, foresight task created

## Schema/Migration
Migration file:
- `supabase/migrations/20260302_cats_governance_monitor.sql`

Created objects:
- `governance.crps_executions`
- `governance.crps_weekly_patterns`
- `governance.policy_rules`
- `governance.containment_events`
- `governance.foresight_tasks`
- `governance.weekly_digest_snapshots`
- `governance.ledger_events` (append-only via triggers)

## API Endpoints
- `GET /api/governance/crps?from&to`
- `GET /api/governance/containment-events?from&to`
- `GET /api/governance/foresight-tasks?status=open|in_review|resolved`
- `GET /api/governance/policies`
- `POST /api/governance/policies`
- `GET /api/governance/digests`
- `POST /api/governance/jobs/weekly-digest` (manual trigger)
- `POST /api/governance/preflight`
- `POST /api/governance/post-run`

## RBAC Model
Headers used:
- `x-governance-role`: `admin` | `auditor` | `operator`
- `x-admin-token`: required for admin write operations, validated against `ADMIN_TOKEN`

Read behavior:
- `admin/auditor`: full details
- `operator`: explanation-focused view with redacted details

## Local Validation
- Typecheck: `npm run typecheck`
- Build: `NEXT_PUBLIC_CORE_API_BASE=http://localhost:8000 npm run build`
- Governance unit tests: `npm run test:governance`

