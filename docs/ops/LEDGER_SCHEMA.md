# Self-Improve Ledger Schema

## Overview

The RocketGPT Self-Improve Ledger is a Supabase-based tracking system that records improvement opportunities, CI failures, and AI-generated insights for systematic enhancement of the platform.

**Database**: Supabase (PostgreSQL)
**Table**: `rgpt_selfimprove_ledger`
**RPC Function**: `rgpt_selfimprove_ingest_event`
**Last Updated**: 2025-12-23

---

## Table Schema

### rgpt_selfimprove_ledger

```sql
CREATE TABLE public.rgpt_selfimprove_ledger (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Core identification
  subsystem TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  -- Content
  title TEXT NOT NULL,
  description TEXT,

  -- Metadata
  confidence DOUBLE PRECISION DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  evidence_ref TEXT,
  related_commit TEXT,
  related_pr TEXT,
  origin_ref TEXT NOT NULL,

  -- Status tracking
  status TEXT DEFAULT 'candidate' CHECK (status IN ('candidate', 'approved', 'in_progress', 'completed', 'rejected')),
  assigned_to TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,

  -- Indexes
  CONSTRAINT unique_origin_ref UNIQUE (origin_ref)
);

CREATE INDEX idx_selfimprove_subsystem ON rgpt_selfimprove_ledger(subsystem);
CREATE INDEX idx_selfimprove_severity ON rgpt_selfimprove_ledger(severity);
CREATE INDEX idx_selfimprove_status ON rgpt_selfimprove_ledger(status);
CREATE INDEX idx_selfimprove_created_at ON rgpt_selfimprove_ledger(created_at DESC);
```

---

## RPC Function: rgpt_selfimprove_ingest_event

### Purpose

Ingests self-improvement events into the ledger with validation and deduplication.

### Signature

```sql
CREATE OR REPLACE FUNCTION rgpt_selfimprove_ingest_event(
  subsystem TEXT,
  severity TEXT,
  title TEXT,
  description TEXT,
  confidence DOUBLE PRECISION,
  evidence_ref TEXT DEFAULT NULL,
  related_commit TEXT DEFAULT NULL,
  related_pr TEXT DEFAULT NULL,
  origin_ref TEXT DEFAULT 'unknown'
) RETURNS BIGINT
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `subsystem` | TEXT | Yes | - | Subsystem identifier (see Subsystems section) |
| `severity` | TEXT (enum) | Yes | - | Event severity: `low`, `medium`, `high`, `critical` |
| `title` | TEXT | Yes | - | Human-readable title (max 200 chars recommended) |
| `description` | TEXT | No | NULL | Detailed description (max 5000 chars recommended) |
| `confidence` | DOUBLE PRECISION | Yes | - | AI confidence score (0.0-1.0) |
| `evidence_ref` | TEXT | No | NULL | URL to evidence (workflow run, PR, issue, etc.) |
| `related_commit` | TEXT | No | NULL | Git SHA if applicable |
| `related_pr` | TEXT | No | NULL | PR number if applicable (e.g., "123" or "#123") |
| `origin_ref` | TEXT | Yes | - | Origin identifier (see Origin Ref Format) |

### Returns

- `BIGINT`: The `id` of the inserted ledger row
- Throws error if validation fails or duplicate `origin_ref`

---

## Field Definitions

### subsystem (TEXT)

Identifies the area of the platform affected.

**Valid Values**:
- `ci-selfimprove` - CI/CD pipeline insights
- `orchestrator` - Orchestrator subsystem
- `planner` - Planner subsystem
- `builder` - Builder subsystem
- `chat` - Chat/messaging system
- `ui` - User interface
- `api` - API endpoints
- `auth` - Authentication/authorization
- `database` - Database schema/queries
- `workflows` - GitHub Actions workflows
- `docs` - Documentation
- `tests` - Test infrastructure
- `performance` - Performance issues
- `security` - Security vulnerabilities
- `ux` - User experience
- `devops` - DevOps/infrastructure

**Convention**: Use lowercase, hyphen-separated names.

### severity (TEXT enum)

Indicates the priority/impact of the event.

**Valid Values**:
- `low` - Minor improvement, nice-to-have
- `medium` - Moderate impact, should address
- `high` - Significant impact, address soon
- `critical` - Blocking issue, immediate attention

**Mapping from Workflow Severities**:

Some workflows may use different naming (e.g., `info`, `warning`, `error`). These should be mapped:

```
info     → low
warning  → medium
error    → high
critical → critical
```

### title (TEXT)

Brief, human-readable summary of the improvement opportunity.

**Constraints**:
- Required
- Recommended max: 200 characters
- Should be descriptive but concise
- Examples:
  - "CI :: build-test job failed on type errors"
  - "Orchestrator timeout in planner handoff"
  - "Missing error handling in /api/chat endpoint"

### description (TEXT)

Detailed explanation of the issue or improvement opportunity.

**Constraints**:
- Optional
- Recommended max: 5000 characters
- May include:
  - Error messages
  - Stack traces
  - Reproduction steps
  - Suggested fixes
  - Context from logs

### confidence (DOUBLE PRECISION)

AI's confidence in the assessment (0.0 = no confidence, 1.0 = fully confident).

**Constraints**:
- Required
- Range: 0.0 to 1.0
- Default: 0.5 (if not specified)

**Guidelines**:
- `0.0 - 0.3`: Low confidence (requires human review)
- `0.4 - 0.6`: Medium confidence (likely valid)
- `0.7 - 0.9`: High confidence (very likely valid)
- `0.9 - 1.0`: Very high confidence (near certain)

**Note**: Confidence score is used for prioritization and filtering.

### evidence_ref (TEXT)

URL to supporting evidence.

**Examples**:
- GitHub Actions run: `https://github.com/org/repo/actions/runs/123456789`
- Pull request: `https://github.com/org/repo/pull/42`
- Issue: `https://github.com/org/repo/issues/123`
- Commit: `https://github.com/org/repo/commit/abc123...`
- CI log artifact: `https://github.com/org/repo/runs/123/artifacts/456`

**Constraints**:
- Optional
- Should be a fully-qualified URL
- Must be accessible to team members

### related_commit (TEXT)

Git SHA of the related commit (if applicable).

**Format**: Full or short SHA (e.g., `abc123def456` or `abc123d`)

**Examples**:
- `20658d4f` (short)
- `20658d4f1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p` (full)

### related_pr (TEXT)

Pull request number (if applicable).

**Format**: Number only (e.g., `42`) or with `#` prefix (e.g., `#42`)

**Examples**:
- `42`
- `#123`
- `PR-456` (non-standard, but accepted)

### origin_ref (TEXT)

Unique identifier for the event origin (required for deduplication).

**Format**: `<system>:<repository>:<workflow>:<run_id>:<job>`

**Examples**:
```
gh:proteaNirav/rocketgpt:ci:20407092650:build-test
gh:proteaNirav/rocketgpt:_selfimprove_ingest_ci:20453624455:ingest
manual:local:nirav:2025-12-23T10:30:00Z
ai:orchestrator:run-42:planner-timeout
```

**Components**:
- `<system>`: `gh` (GitHub), `manual`, `ai`, `ci`, `local`
- `<repository>`: GitHub repo slug (if applicable)
- `<workflow>`: Workflow name or script name
- `<run_id>`: Unique run identifier (timestamp, workflow run ID, etc.)
- `<job>`: Job or step name (optional but recommended)

**Purpose**:
- Prevents duplicate ingests (UNIQUE constraint)
- Enables traceability to source
- Required for audit trail

---

## Status Field

The `status` field tracks the lifecycle of a ledger entry.

**Valid Values**:
- `candidate` - New entry, needs review (default)
- `approved` - Reviewed and approved for action
- `in_progress` - Work in progress
- `completed` - Improvement implemented
- `rejected` - Reviewed and declined

**Workflow**:
```
candidate → approved → in_progress → completed
          ↘ rejected
```

---

## PowerShell Ingest Tool

### Location

`.github/tools/rgpt-ledger-ingest.ps1`

### Usage

```powershell
./.github/tools/rgpt-ledger-ingest.ps1 `
  -SUPABASE_URL $env:SUPABASE_URL `
  -SUPABASE_SERVICE_ROLE_KEY $env:SUPABASE_SERVICE_ROLE_KEY `
  -Subsystem "ci-selfimprove" `
  -Severity "high" `
  -Title "Build failed on type errors" `
  -Description "TypeScript found 3 errors in src/..." `
  -Confidence 0.85 `
  -EvidenceRef "https://github.com/org/repo/actions/runs/123" `
  -RelatedCommit "abc123d" `
  -RelatedPR "42" `
  -OriginRef "gh:org/repo:ci:123:build"
```

### Safety Features

The PowerShell script includes safety checks:

1. **Forbidden body keys**: Rejects payloads with `source`, `p_source`, or `client` keys
2. **Origin ref validation**: Ensures `origin_ref` is never empty
3. **HTTP error handling**: Properly handles and reports HTTP errors
4. **Logging**: Logs all requests and responses

---

## Query Examples

### Get All High-Severity Candidates

```sql
SELECT id, title, subsystem, confidence, created_at
FROM rgpt_selfimprove_ledger
WHERE severity = 'high'
  AND status = 'candidate'
ORDER BY confidence DESC, created_at DESC;
```

### Get Recent CI Failures

```sql
SELECT id, title, evidence_ref, created_at
FROM rgpt_selfimprove_ledger
WHERE subsystem = 'ci-selfimprove'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### Get Items for Specific Commit

```sql
SELECT id, title, severity, description
FROM rgpt_selfimprove_ledger
WHERE related_commit = 'abc123d';
```

### Count by Subsystem and Severity

```sql
SELECT subsystem, severity, COUNT(*) as count
FROM rgpt_selfimprove_ledger
WHERE status = 'candidate'
GROUP BY subsystem, severity
ORDER BY severity DESC, count DESC;
```

---

## Retention and Cleanup Policy

### Retention Periods

| Status | Retention | Rationale |
|--------|-----------|-----------|
| `candidate` | 90 days | Time to review and triage |
| `approved` | 180 days | Time to implement |
| `in_progress` | Indefinite | Active work |
| `completed` | 1 year | Historical record |
| `rejected` | 30 days | Short retention for rejected items |

### Archival Process

**Frequency**: Monthly (first day of month)

**Steps**:
1. Export entries past retention period to `data/ledger-archive/YYYY-MM.jsonl`
2. Verify export integrity
3. Delete archived entries from active table
4. Compress archive file

**Manual Archive**:
```sql
-- Export candidates older than 90 days
COPY (
  SELECT * FROM rgpt_selfimprove_ledger
  WHERE status = 'candidate'
    AND created_at < NOW() - INTERVAL '90 days'
) TO '/path/to/archive-YYYY-MM.jsonl' WITH (FORMAT json);

-- Delete after verification
DELETE FROM rgpt_selfimprove_ledger
WHERE status = 'candidate'
  AND created_at < NOW() - INTERVAL '90 days';
```

### Cleanup Policy

**Automatic Cleanup** (planned):

```sql
-- Scheduled cleanup (monthly cron job)
CREATE OR REPLACE FUNCTION rgpt_selfimprove_cleanup()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete rejected items older than 30 days
  DELETE FROM rgpt_selfimprove_ledger
  WHERE status = 'rejected'
    AND created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
```

### Growth Monitoring

**Monitor ledger size**:
```sql
SELECT
  COUNT(*) as total_entries,
  pg_size_pretty(pg_total_relation_size('rgpt_selfimprove_ledger')) as table_size,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as last_30_days
FROM rgpt_selfimprove_ledger;
```

**Alert thresholds**:
- Total entries > 10,000: Review cleanup policy
- Table size > 100 MB: Consider archival
- Growth rate > 100 entries/day: Investigate excessive ingestion

---

## Access Control

### Supabase RLS (Row Level Security)

**Read Access**:
- Service role: Full access
- Authenticated users: Can read all entries
- Anonymous users: No access

**Write Access**:
- Service role only (via RPC function)
- No direct INSERT/UPDATE allowed
- All writes must go through `rgpt_selfimprove_ingest_event` RPC

### API Keys

**Required**:
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (full access)

**Storage**:
- GitHub Secrets (for workflows)
- Local `.env` file (for development - never commit)
- Supabase Dashboard (for manual queries)

---

## Integration Points

### GitHub Actions Workflows

**Ingest Workflow**: `.github/workflows/_selfimprove_ingest_ci.yml`

**Trigger**:
```yaml
uses: ./.github/workflows/_selfimprove_ingest_ci.yml
with:
  enable: 'true'
  dry_run: 'false'
  subsystem: 'ci-selfimprove'
  severity: 'high'
  title_prefix: 'CI'
  confidence: '0.80'
```

### UI Integration

**API Routes**:
- `/api/self-improve/status` - Get ledger status
- `/api/core-ai/ledger/ping` - Health check
- (Future) `/api/core-ai/ledger/query` - Query ledger entries

**Pages**:
- `/super/self-improve` - Admin view of ledger
- `/self-improve` - User view of improvement proposals

---

## Troubleshooting

### Duplicate origin_ref Error

**Error**: `duplicate key value violates unique constraint "unique_origin_ref"`

**Cause**: Attempting to ingest the same event twice

**Solution**:
1. Check if entry already exists:
   ```sql
   SELECT * FROM rgpt_selfimprove_ledger WHERE origin_ref = 'gh:...';
   ```
2. If duplicate is intentional, modify `origin_ref` to be unique (add timestamp or nonce)

### Forbidden Body Keys Error

**Error**: `RGPT-S1-C2: Forbidden RPC body key detected: source`

**Cause**: Attempting to pass `source`, `p_source`, or `client` in payload

**Solution**: Remove forbidden keys from payload. Use proper RPC parameters instead.

### Invalid Severity Error

**Error**: `new row for relation "rgpt_selfimprove_ledger" violates check constraint`

**Cause**: Invalid severity value (not one of: `low`, `medium`, `high`, `critical`)

**Solution**: Map workflow severities to valid ledger severities (see severity field documentation)

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-23 | Initial schema documentation, added retention policy |

---

## Ownership

**Owners**: RocketGPT DevOps + Core AI Team

**Maintainers**: See `CLAUDE.md`

**Review Cadence**: Quarterly or when schema changes

---

**Version**: 1.0
**Last Updated**: 2025-12-23
