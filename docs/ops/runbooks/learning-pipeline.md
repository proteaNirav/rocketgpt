# Learning Pipeline Runbook

## Purpose
Operate Autonomous Learning + Governed Libraries in RocketGPT with tenant-scoped review/publish controls.

## Prerequisites
- Supabase migrated with:
  - `rocketgpt_v3_full/webapp/next/supabase/migrations/20260306_learning_governed_libraries.sql`
- App running from `rocketgpt_v3_full/webapp/next`
- Admin headers for write operations:
  - `x-tenant-id`
  - `x-governance-role: admin`
  - `x-admin-token: <ADMIN_TOKEN>`

## Add Sources (RSS)
1. Open `/admin/learning/sources`.
2. Add `name`, `source URL`, and interval.
3. Keep source enabled.
4. Use `Run Now` to trigger immediate ingestion.

API equivalent:
- `POST /api/learning/sources`
- `POST /api/learning/sources/{sourceId}/run`

## Propose + Review Learning
1. Open `/admin/learning` to view proposed items.
2. Use quick `Approve`/`Reject` or open detail at `/admin/learning/{itemId}`.
3. Review sanitized text and topics.
4. Apply lifecycle decisions:
  - approve
  - reject
  - deprecate
  - revoke

API equivalent:
- `POST /api/learning/items/{itemId}/review`

## Publish to Library
1. Item must be `approved` (or already `published` for republish).
2. In detail page, set `libraryId` and publish.
3. System writes markdown to deterministic path:
   - `docs/libraries/<library_id>/<yyyy-mm>/<topic_key>-<slug>-<itemId>.md`
4. System updates:
   - `docs/libraries/<library>/index.json`
   - `docs/libraries.master_index.json`

API equivalent:
- `POST /api/learning/items/{itemId}/publish`

## Rollback / Revoke
1. For a published/approved item, use detail page decision:
  - `Revoke` or `Deprecate`
2. Item lifecycle is updated; governance ledger event is appended.
3. Existing markdown file remains as immutable evidence unless explicitly removed by a separate controlled process.

API equivalent:
- `POST /api/learning/items/{itemId}/revoke`

## Chat-derived Learning
- Chat proposals can be created by:
  - `POST /api/learning/items/propose-chat`
  - `POST /api/demo/chat` (best-effort auto-propose on heuristic match)
- Tenant opt-out and user-proposal toggles are enforced via `learning_settings`.

## Scheduler
- Use cron trigger route:
  - `POST /api/learning/jobs/rss-ingest`
- This can be called by scheduled GitHub Actions with admin headers.

## Governance + Audit
- Review/publish/revoke actions append governance events through:
  - `appendGovernanceLedgerEvent` -> `governance.ledger_events`
- Redaction metadata is stored in `learning_redaction_audit`.
