# Self-Improve System Status

## Overview

RocketGPT's self-improve subsystem enables AI-driven iterative enhancement through:

1. **Ledger-based tracking** - Records improvement opportunities, decisions, and outcomes
2. **CI integration** - Ingests CI failures and insights into improvement pipeline
3. **AI-powered analysis** - Analyzes patterns and generates improvement proposals
4. **Automated execution** - (Future) Creates PRs with improvements

**Last Updated**: 2025-12-23

---

## Component Status Matrix

| Component | Status | Safe for Production | Notes |
|-----------|--------|---------------------|-------|
| **Ledger Infrastructure** | ✅ Operational | ✅ Yes | Supabase RPC working |
| **Ingest Workflow** | ✅ Operational | ✅ Yes | Protected by enable+dry_run |
| **Self-Improve Engine** | 🚧 Stub | ❌ No | Placeholder only |
| **Self-Innovate** | 🟡 Basic | ⚠️ Limited | Idea pool only |
| **UI Components** | ✅ Operational | ✅ Yes | Pages + routes exist |
| **Scripts** | 🟡 Mixed | ⚠️ Review needed | Various scripts exist |

**Legend**:
- ✅ Operational: Fully working and tested
- 🟡 Basic/Mixed: Partially implemented or needs review
- 🚧 Stub: Placeholder, not functional
- ❌ Disabled: Intentionally not active

---

## 1. Ledger Infrastructure

### Status: ✅ Operational

**Components**:
- Supabase table: `rgpt_selfimprove_ledger`
- RPC function: `rgpt_selfimprove_ingest_event`
- PowerShell tool: `.github/tools/rgpt-ledger-ingest.ps1`

**Verification**:
- Proof: `docs/ops/SELFIMPROVE_INGEST_PROOF.md`
- Last verified: 2025-12-21
- Test run: [20407092650](https://github.com/proteaNirav/rocketgpt/actions/runs/20407092650)
- Ledger row ID: 21

**Schema** (RPC parameters):
```powershell
subsystem      # string: "ci-selfimprove", "chat", "orchestrator", etc.
severity       # enum: "low", "medium", "high", "critical"
title          # string: Human-readable title
description    # string: Detailed description
confidence     # float: 0.0-1.0 (how confident is the AI in this insight)
evidence_ref   # string: URL to workflow run, PR, issue, etc.
related_commit # string: Git SHA if applicable
related_pr     # string: PR number if applicable
origin_ref     # string: "gh:repo:workflow:run_id:job" for traceability
```

**Safety**:
- ✅ Validates input parameters
- ✅ Rejects forbidden body keys (source, p_source, client)
- ✅ Requires explicit origin_ref (no anonymous ingests)
- ✅ HTTP wrapper with error handling
- ✅ All writes logged with timestamps

**TODO**:
- None (operational and stable)

---

## 2. Ingest Workflow (_selfimprove_ingest_ci.yml)

### Status: ✅ Operational (Gated)

**Protection**:
- ✅ Requires `enable='true'` to run (default: false)
- ✅ Defaults to `dry_run='true'` (no Supabase writes)
- ✅ Read-only permissions on repo
- ✅ Audit trail via origin_ref

**Trigger Methods**:
1. **workflow_dispatch** (manual)
2. **workflow_call** (from other workflows)

**Inputs**:
```yaml
enable: false|true      # Must be 'true' to run
dry_run: true|false     # Defaults to 'true' (safe)
subsystem: string       # Default: "ci-selfimprove"
severity: low|medium|high|critical  # Default: "high"
title_prefix: string    # Default: "CI"
confidence: float       # Default: "0.80"
```

**Severity Mapping**:
Workflow uses `info|warning|error|critical`, but RPC expects `low|medium|high|critical`:
```powershell
info     → low
warning  → medium
error    → high
critical → critical
```

**Current Usage**:
- Manual testing only
- Not yet called by other workflows
- Ready for integration when needed

**Safety Notes**:
- Even when `enable='true'`, workflow defaults to `dry_run='true'`
- Must explicitly set BOTH flags to write to ledger
- No repository modifications (contents: read only)

**TODO**:
- ✅ Workflow is safe and ready
- [ ] Wire up to CI failure detection (future)
- [ ] Add to self-heal workflow chain (future)

---

## 3. Self-Improve Engine (self_improve.yml)

### Status: 🚧 Stub (Not Functional)

**Current Implementation**:
```bash
echo "TODO: Wire RocketGPT v4 self-improve engine."
echo "Read docs/roadmap and config/self_improve_backlog.json, open PRs."
```

**Intended Functionality** (when implemented):
1. Read improvement backlog from `config/self_improve_backlog.json`
2. Query ledger for high-confidence, high-severity items
3. Analyze patterns across multiple entries
4. Generate improvement proposals
5. Create PRs with fixes/enhancements
6. Requires human approval before merge

**Triggers**:
- `workflow_dispatch` (manual)
- `schedule: "0 18 * * *"` (daily at 11:30pm IST)
- `push` to `docs/roadmap/**` or `config/self_improve_backlog.json`

**Permissions**:
```yaml
contents: read
pull-requests: write  # For creating PRs
```

**Safety Concerns**:
- ⚠️ Currently a stub, so safe
- ❌ When implemented, must have:
  - Approval gates before PRs are created
  - Dry-run mode for testing
  - Human review required for all PRs
  - No auto-merge allowed
  - Limit scope (e.g., only docs or tests initially)

**Blocked By**:
- [ ] v4 Core AI engine completion
- [ ] Planner/Orchestrator handoff contract
- [ ] Safe execution sandbox
- [ ] Approval workflow integration

**TODO**:
- [ ] Design v4 self-improve architecture
- [ ] Implement dry-run mode
- [ ] Add approval gates
- [ ] Test with limited scope (docs-only initially)
- [ ] Add safety review before enabling

---

## 4. Self-Innovate (self_innovate.yml)

### Status: 🟡 Basic (Idea Pool Only)

**Current Functionality**:
- Creates `data/self_innovate/idea_pool.jsonl`
- Appends placeholder innovation ideas
- Commits ideas to repository

**Idea Schema**:
```json
{
  "id": "SI-<timestamp>",
  "timestamp_utc": "ISO8601",
  "source": "placeholder|ai|human",
  "area": "developer_experience|performance|security|...",
  "problem_observed": "Description of problem",
  "idea": "Proposed solution/enhancement",
  "impact_score": 0.0-1.0,
  "effort_score": 0.0-1.0,
  "risk_score": 0.0-1.0,
  "alignment_score": 0.0-1.0,
  "status": "candidate|approved|implemented|rejected"
}
```

**Triggers**:
- `workflow_dispatch` (manual only)

**Permissions**:
```yaml
contents: write  # For committing idea pool
```

**Safety**:
- ⚠️ Uses `contents: write` - can modify repo
- ⚠️ Currently only adds to idea pool (low risk)
- ⚠️ No auto-execution of ideas
- ✅ Ideas must be manually reviewed and approved

**Limitations**:
- Only creates placeholder ideas
- No AI generation yet
- No integration with ledger
- No prioritization logic
- No execution pathway

**TODO**:
- [ ] Wire up to ledger for insight extraction
- [ ] Add AI-powered idea generation
- [ ] Implement prioritization algorithm
- [ ] Link to self_improve workflow for execution
- [ ] Add approval workflow

---

## 5. UI Components

### Status: ✅ Operational

**Pages**:
- `/self-improve` - User-facing self-improve console
- `/super/self-improve` - Admin/super-user view
- `/sessions` - Links to self-improve functionality

**API Routes**:
- `/api/self-improve/status` - Get improvement status
- `/api/self-improve/run` - Trigger improvement run
- `/api/core-ai/ledger/ping` - Ledger health check

**Components**:
- Sidebar navigation includes self-improve links
- Console integration

**Features**:
- View improvement proposals
- Trigger improvement runs (gated)
- View ledger entries
- Filter by severity/subsystem

**Safety**:
- ✅ All UI operations respect Safe-Mode
- ✅ No auto-execution without approval
- ✅ Read-only by default
- ✅ Requires authentication

**TODO**:
- [ ] Add ledger query UI
- [ ] Add idea pool viewer
- [ ] Add approval workflow UI
- [ ] Add impact/risk visualization

---

## 6. Scripts

### Status: 🟡 Mixed (Review Needed)

**Located in**: `scripts/self-improve/`

**Files Found**:
- `execute.js` - Execute improvement proposals
- `patcher.js` - Apply patches
- `read_chat_intents.js` - Read chat intent logs
- `select_next.js` - Select next improvement to work on
- `write_status.js` - Write status updates
- `self_improve_current.ps1` - Get current status
- `self_improve_logs.ps1` - View logs
- `self_improve_runs.ps1` - View run history
- `self_improve_status.ps1` - Status checker

**Status**: ⚠️ **Not audited for safety**

**Risks**:
- Unknown if scripts have approval gates
- Unknown if scripts can modify code
- Unknown if scripts respect safe-mode
- Unknown if scripts have dry-run mode

**Recommendations**:
1. **Immediate**: Audit all scripts for safety
2. **Short-term**: Add dry-run mode to all scripts
3. **Medium-term**: Integrate with workflow gating
4. **Long-term**: Migrate to v4 orchestrator

**TODO**:
- [ ] **CRITICAL**: Audit `execute.js` and `patcher.js` for safety
- [ ] Add `--dry-run` flag to all scripts
- [ ] Document script usage and safety model
- [ ] Add approval gates to execution paths
- [ ] Consider deprecating if superseded by v4

---

## Integration Points

### Current State

```
┌─────────────────────┐
│   CI Failures       │
└──────────┬──────────┘
           │
           │ (manual trigger)
           ↓
┌─────────────────────────────────────┐
│ _selfimprove_ingest_ci.yml          │
│ (enable + dry_run gates)            │
└──────────┬──────────────────────────┘
           │
           │ (if enabled and not dry_run)
           ↓
┌─────────────────────────────────────┐
│ Supabase Ledger                     │
│ (rgpt_selfimprove_ledger)           │
└──────────┬──────────────────────────┘
           │
           │ (manual query)
           ↓
┌─────────────────────────────────────┐
│ UI: /super/self-improve             │
│ (human review)                      │
└─────────────────────────────────────┘
```

### Planned Integration (v4)

```
┌─────────────────────┐       ┌─────────────────────┐
│   CI Failures       │       │   QA Failures       │
└──────────┬──────────┘       └──────────┬──────────┘
           │                             │
           └──────────┬──────────────────┘
                      │ (auto-trigger)
                      ↓
           ┌──────────────────────┐
           │  Ledger Ingest       │
           └──────────┬───────────┘
                      │
                      ↓
           ┌──────────────────────────────┐
           │  Supabase Ledger             │
           └──────────┬───────────────────┘
                      │
                      │ (scheduled)
                      ↓
           ┌──────────────────────────────┐
           │  self_improve.yml            │
           │  (v4 engine)                 │
           └──────────┬───────────────────┘
                      │
                      │ (generates)
                      ↓
           ┌──────────────────────────────┐
           │  Improvement Proposals       │
           │  (in ledger)                 │
           └──────────┬───────────────────┘
                      │
                      │ (human review)
                      ↓
           ┌──────────────────────────────┐
           │  Approval UI                 │
           │  (/super/self-improve)       │
           └──────────┬───────────────────┘
                      │
                      │ (if approved)
                      ↓
           ┌──────────────────────────────┐
           │  Create PR                   │
           │  (requires human merge)      │
           └──────────────────────────────┘
```

---

## Flags & Inconsistencies

### 🚩 Flag 1: Script Safety Unknown

**Location**: `scripts/self-improve/execute.js`, `patcher.js`

**Issue**: These scripts may execute code changes without approval gates.

**Risk**: High (could modify codebase unsafely)

**Action**: Audit immediately before any use

### 🚩 Flag 2: self_innovate Uses contents:write

**Location**: `.github/workflows/self_innovate.yml:7`

**Issue**: Workflow has write permissions to commit ideas.

**Risk**: Medium (limited to idea pool, but still writes to repo)

**Action**: Consider downgrading to read-only + artifact upload instead

### 🚩 Flag 3: TODO Comments in Workflows

**Locations**:
- `self_improve.yml:28-30` - "TODO: Wire RocketGPT v4"
- `self_heal.yml:19-20` - "TODO: RocketGPT self-heal"

**Issue**: Stub workflows may give false impression of functionality.

**Risk**: Low (clearly marked as stubs)

**Action**: Add explicit "STATUS: STUB" to workflow descriptions

### 🚩 Flag 4: Ledger Schema Documentation Gap

**Location**: No single source of truth for ledger schema

**Issue**: Schema scattered across:
- `rgpt-ledger-ingest.ps1` (implementation)
- `_selfimprove_ingest_ci.yml` (usage)
- Various docs (fragments)

**Risk**: Low (schema is stable)

**Action**: Create `docs/ops/LEDGER_SCHEMA.md`

### 🚩 Flag 5: No Ledger Query/Cleanup Policy

**Issue**: No documented policy for:
- How long ledger entries are retained
- How to query for actionable items
- When to archive/delete entries

**Risk**: Medium (ledger may grow unbounded)

**Action**: Define retention and cleanup policy

---

## Recommendations

### Immediate (Before Re-enabling)

1. ✅ **Add safety comments to workflows** (DONE)
2. ✅ **Document enable/dry_run pattern** (DONE in WORKFLOW_SAFETY_MODEL.md)
3. 🔲 **Audit `scripts/self-improve/` for safety**
4. 🔲 **Add STATUS badges to stub workflows**
5. 🔲 **Create LEDGER_SCHEMA.md**

### Short-term (Next Sprint)

6. 🔲 **Wire CI failures → ingest (auto-trigger)**
7. 🔲 **Add ledger query UI**
8. 🔲 **Define ledger retention policy**
9. 🔲 **Add dry-run mode to all scripts**
10. 🔲 **Migrate self_innovate to artifact-based (no write)**

### Medium-term (v4 Integration)

11. 🔲 **Implement v4 self-improve engine**
12. 🔲 **Add approval workflow UI**
13. 🔲 **Integrate with planner/orchestrator**
14. 🔲 **Add pattern detection AI**
15. 🔲 **Test with docs-only scope first**

### Long-term (Production)

16. 🔲 **Enable scheduled self-improve runs**
17. 🔲 **Add impact/risk scoring**
18. 🔲 **Integrate with self-eval metrics**
19. 🔲 **Build feedback loop (executed → measured → improved)**
20. 🔲 **Publish self-improve effectiveness metrics**

---

## Safety Checklist for Re-enablement

Before enabling any self-improve workflow for production use:

- [ ] Explicit enable + dry_run flags implemented
- [ ] Dry-run mode tested and verified
- [ ] Approval gates in place (no auto-execution)
- [ ] Permissions minimized (read-only preferred)
- [ ] Audit trail logging (origin_ref, evidence_ref)
- [ ] Rollback plan documented
- [ ] Limited scope (e.g., docs-only initially)
- [ ] Human review required for all outputs
- [ ] Safe-mode integration verified
- [ ] 2+ team members reviewed and approved

---

## Metrics & KPIs (Future)

When self-improve is operational, track:

- **Ingested events**: Count by subsystem, severity
- **Generated proposals**: Count by type, confidence
- **Approved proposals**: Approval rate, time to approval
- **Implemented improvements**: Success rate, impact measured
- **False positives**: Rejected proposals, reasons
- **Time saved**: Estimate of manual effort avoided
- **Quality impact**: Bug reduction, performance gains

---

## Ownership & Maintenance

**Owners**: RocketGPT DevOps + Core AI Team

**Review Cadence**:
- **Weekly**: Review new ledger entries
- **Bi-weekly**: Review pending proposals
- **Monthly**: Review this status doc
- **Quarterly**: Audit safety model

**Contact**: See `CLAUDE.md` for current project leads

---

**Version**: 1.0
**Status**: Ledger operational, engine pending v4
**Next Review**: 2026-01-23
