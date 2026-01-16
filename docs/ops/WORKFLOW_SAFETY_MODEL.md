# Workflow Safety Model

## Overview

RocketGPT implements a defense-in-depth safety model for GitHub Actions workflows to enable safe AI-assisted development while preventing unauthorized automation and protecting against accidental harm.

## Safety Principles

### 1. Least Privilege Permissions

**All workflows** have explicit `permissions` blocks that grant only the minimum required access:

- **Read-only by default**: Most workflows use `contents: read`
- **Write permissions**: Only granted when explicitly needed (e.g., creating PRs)
- **No implicit permissions**: GitHub's default `GITHUB_TOKEN` permissions are overridden

Example:
```yaml
permissions:
  contents: read
  pull-requests: read
```

### 2. Dual-Gate Protection (enable + dry_run)

AI-powered workflows that can modify state use a **two-flag safety system**:

#### Flag 1: `enable` (default: `false`)
- Workflow **will not run** unless manually set to `true`
- Prevents accidental or unauthorized execution
- Requires explicit human approval each time

#### Flag 2: `dry_run` (default: `true`)
- Even when enabled, workflows default to **no side effects**
- Must be explicitly set to `false` to allow writes
- Provides safe testing before actual execution

**Both flags must be set** for state-changing operations:
```yaml
if: ${{ inputs.enable == 'true' && inputs.dry_run == 'false' }}
```

Workflows using this pattern:
- `claude_readonly_review.yml`
- `_selfimprove_ingest_ci.yml`

### 3. Action Version Pinning

All external actions are **pinned to specific versions** using tags (not floating refs):

✅ **Safe**: `actions/checkout@v4`
❌ **Unsafe**: `actions/checkout@main`

This prevents:
- Supply chain attacks via compromised action updates
- Unexpected behavior changes
- Breaking changes in dependencies

### 4. Safe-Mode Enforcement

The `p3-safemode-gate` workflow is a **critical security gate** that:

- Tests that `SAFE_MODE=1` blocks dangerous operations
- Validates that `/api/orchestrator/builder/execute-all` is blocked
- Fails CI if unsafe automation can run
- Runs on every push/PR to main branch

**Purpose**: Prevents accidental deployment of automation that could execute without human oversight.

### 5. UTF-8 BOM Detection

The CI pipeline enforces **UTF-8 no-BOM encoding** for:
- Workflow files (`.github/workflows/`)
- Tool scripts (`.github/tools/`)
- Documentation (`docs/`)
- Application code (`rocketgpt_v3_full/`)

**Rationale**: BOM characters can cause:
- Workflow syntax errors
- Script execution failures
- Unpredictable parsing behavior

Detection via: `.github/tools/ci/detect-bom.ps1`

### 6. Read-Only by Default

Workflows are categorized by their safety profile:

#### Tier 1: Pure Read-Only
- Only checkout and read code
- No external API calls
- No artifact uploads with sensitive data
- Examples: `ci.yml`, `pr-checks.yml`, `text-guard.yml`

#### Tier 2: External Read-Only
- May call external services (Supabase, Claude API)
- No repository modifications
- Results stored as artifacts
- Examples: `claude_readonly_review.yml`, `nightly-self-eval.yml`

#### Tier 3: Gated Write
- Can modify state (Supabase, create PRs)
- Protected by enable + dry_run flags
- Requires explicit human approval
- Examples: `_selfimprove_ingest_ci.yml`

#### Tier 4: Stub/Disabled
- Placeholder workflows for future features
- Currently no-op or minimal
- Will require safety review before activation
- Examples: `self_heal.yml`, `self_improve.yml`, `v4_ship_placeholder.yml`

### 7. Audit Trail

All workflows that perform state-changing operations **must** log:

- `origin`: GitHub repository + workflow + run ID + job
- `evidence_ref`: URL to workflow run
- `related_commit`: Git SHA
- Timestamp and user context

Example from `_selfimprove_ingest_ci.yml`:
```powershell
$origin = "gh:${{ github.repository }}:${{ github.workflow }}:${{ github.run_id }}:${{ github.job }}"
$runUrl = "https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}"
```

### 8. Concurrency Control

Critical workflows use `concurrency` groups to prevent:
- Race conditions
- Duplicate executions
- Resource exhaustion

Example:
```yaml
concurrency:
  group: p3-safemode-gate-main
  cancel-in-progress: true
```

### 9. Contract-Based Execution

AI workflows reference **execution contracts** that define:
- Allowed operations
- Safety constraints
- Expected behavior

Example: `docs/contracts/CLAUDE_EXECUTION_CONTRACT_v1.md`

Workflows emit contract markers for auditability:
```powershell
Write-Host "contract_version=v1.0"
Write-Host "execution_mode=DIFF_ONLY"
```

## Workflow Safety Matrix

| Workflow | Tier | Permissions | enable | dry_run | Can Modify Repo | Can Call External |
|----------|------|-------------|--------|---------|-----------------|-------------------|
| ci.yml | 1 | read | N/A | N/A | ❌ | ❌ |
| claude_readonly_review.yml | 2 | read | ✅ | ✅ | ❌ | ✅ (Claude API) |
| notify.yml | 2 | read | N/A | N/A | ❌ | ✅ (Slack/Teams) |
| _selfimprove_ingest_ci.yml | 3 | read | ✅ | ✅ | ❌ | ✅ (Supabase) |
| nightly-self-eval.yml | 2 | read | N/A | N/A | ❌ | ✅ (Supabase) |
| safemode-gate.yml | 1 | read | N/A | N/A | ❌ | ❌ |
| pr-checks.yml | 1 | read | N/A | N/A | ❌ | ❌ |
| self_heal.yml | 4 | read | N/A | N/A | ❌ | ❌ (stub) |
| self_heal.yml | 1 | read | N/A | N/A | ❌ | ❌ |
| self_improve.yml | 4 | read+write | N/A | N/A | 🚧 (future) | 🚧 (future) |
| text-guard.yml | 1 | read | N/A | N/A | ❌ | ❌ |
| v4_ship_placeholder.yml | 4 | read | N/A | N/A | ❌ | ❌ (stub) |

## Safe Re-enablement Checklist

Before re-enabling a disabled or stub workflow:

- [ ] Explicit permissions block added
- [ ] enable + dry_run flags implemented (if state-changing)
- [ ] Safety comments explain purpose and constraints
- [ ] Audit logging implemented
- [ ] Contract referenced (for AI workflows)
- [ ] Tested in dry-run mode
- [ ] Code review by 2+ team members
- [ ] Documented in this safety model
- [ ] Rollback plan defined

## Emergency Procedures

### Disable Runaway Workflow

1. Navigate to GitHub Actions → Workflows
2. Select the problematic workflow
3. Click "..." → "Disable workflow"
4. Create incident report in `docs/ops/incidents/`

### Revoke Compromised Token

1. Rotate secret in GitHub Settings → Secrets
2. Update all dependent workflows
3. Audit workflow runs for unauthorized activity
4. Document in security log

### Rollback Unsafe Change

1. Identify last safe commit via `git log`
2. Revert: `git revert <commit-sha>`
3. Force-push if already merged (after approval)
4. Re-run CI to verify safety gates

## Maintenance

This safety model must be:

- **Reviewed**: Quarterly or after any major workflow change
- **Updated**: When new workflows are added or modified
- **Audited**: Monthly review of workflow run logs
- **Tested**: Safe-mode gate must pass on every CI run

---

**Last Updated**: 2025-12-23
**Owner**: RocketGPT DevOps Team
**Version**: 1.0

