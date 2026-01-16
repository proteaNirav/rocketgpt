# CI Guardrails

## Purpose

This document defines the **non-negotiable safety guardrails** enforced by RocketGPT's CI/CD pipeline to prevent:

- Accidental deployment of unsafe automation
- Unauthorized code execution
- Security vulnerabilities
- Data corruption or loss
- Compliance violations

## Mandatory Guardrails

### 1. UTF-8 BOM Detection

**Enforcement**: `ci.yml` → `bom_check` job

**Rule**: All text files in critical paths **must** be UTF-8 encoded **without** BOM.

**Checked Paths**:
- `.github/workflows/` (workflow files)
- `.github/tools/` (automation scripts)
- `docs/` (documentation)
- `rocketgpt_v3_full/` (application code)

**Rationale**:
- BOM causes YAML parsing errors in GitHub Actions
- PowerShell scripts fail with BOM in shebang line
- Inconsistent encoding leads to unpredictable behavior

**Failure Action**: CI fails immediately, blocking merge

**Fix**:
```powershell
# Use the BOM removal script
pwsh .github/tools/ci/detect-bom.ps1 -Paths @(".github/workflows") -Fix
```

**Reference**: `docs/ops/BOM_POLICY.md`

### 2. TypeScript Type Safety

**Enforcement**: `ci.yml` → `Typecheck (UI)` step

**Rule**: All TypeScript code must **compile without errors**.

**Command**: `npx tsc --noEmit`

**Rationale**:
- Prevents runtime type errors
- Catches null/undefined access
- Enforces interface contracts

**Failure Action**: CI fails, blocking merge

**Exemptions**: None (use `@ts-expect-error` with justification comment if absolutely necessary)

### 3. ESLint Rules (Zero Warnings)

**Enforcement**: `ci.yml` → `Lint (UI) - strict` step

**Rule**: Code must pass `eslint` with `--max-warnings=0`.

**Auto-fix**: CI attempts auto-fix for import order and trivial issues before strict check

**Rationale**:
- Enforces code quality standards
- Prevents security anti-patterns
- Ensures consistent formatting

**Failure Action**: CI fails, blocking merge

**Config**: `rocketgpt_v3_full/webapp/next/.eslintrc.json`

### 4. Build Success

**Enforcement**: `ci.yml` → `Build (UI)` step

**Rule**: Next.js build must **complete successfully**.

**Command**: `pnpm build`

**Rationale**:
- Catches build-time errors
- Validates environment variables
- Ensures production bundle is valid

**Failure Action**: CI fails, blocking merge

### 5. Safe-Mode Enforcement Gate

**Enforcement**: `safemode-gate.yml` → `Safe-Mode Gate` step

**Rule**: When `SAFE_MODE=1`, the `/api/orchestrator/builder/execute-all` endpoint **must** return 4xx (blocked).

**Test**:
1. Build app with `SAFE_MODE=1`
2. Start app on port 3000
3. POST to `/api/orchestrator/builder/execute-all`
4. **Expect**: 4xx response
5. **Fail if**: 200 (success) or 5xx (error)

**Rationale**:
- **Critical security gate**: Prevents accidental deployment of unrestricted automation
- Validates that safe-mode actually blocks dangerous operations
- Protects against bypass vulnerabilities

**Failure Action**: CI fails **immediately**, blocking merge

**Override**: Not allowed (this is a non-negotiable safety gate)

### 6. QA Scenario Tests

**Enforcement**: `ci.yml` → `Run QA scenarios` step

**Rule**: All QA scenario files in `qa/scenarios/*.json` must execute successfully against the live Core API.

**Command**: `node qa/runner.mjs qa/scenarios/*.json`

**Rationale**:
- Validates API contract compliance
- Catches integration issues
- Ensures backend compatibility

**Failure Action**: CI fails, blocking merge (non-blocking currently, will be enforced in future)

**Artifact**: `qa-report.json` uploaded for review

### 7. Workflow Permissions Enforcement

**Enforcement**: Manual code review (automated check planned)

**Rule**: Every `.github/workflows/*.yml` file **must** have an explicit `permissions` block.

**Allowed Permissions**:
- `contents: read` (default for most workflows)
- `contents: write` (only for PR creation workflows, requires justification)
- `pull-requests: read` (for PR-triggered workflows)
- `pull-requests: write` (only for workflows that comment on PRs)

**Forbidden**:
- `permissions: write-all` (never allowed)
- Implicit permissions (missing `permissions` block)

**Rationale**:
- Follows **least privilege principle**
- Prevents token abuse
- Limits blast radius of compromised workflows

**Failure Action**: Code review blocks merge

**Verification**:
```bash
# Check for missing permissions blocks
for f in .github/workflows/*.yml; do
  if ! grep -q "permissions:" "$f"; then
    echo "MISSING PERMISSIONS: $f"
  fi
done
```

### 8. Action Version Pinning

**Enforcement**: Manual code review (automated check planned)

**Rule**: All `uses:` directives in workflows **must** pin actions to a specific version tag.

**Examples**:
- ✅ `actions/checkout@v4`
- ✅ `actions/setup-node@v4`
- ❌ `actions/checkout@main`
- ❌ `actions/setup-node@latest`

**Rationale**:
- Prevents supply chain attacks
- Ensures reproducible builds
- Avoids breaking changes from action updates

**Failure Action**: Code review blocks merge

**Verification**:
```bash
# Check for unpinned actions
grep -r "uses:.*@[^v]" .github/workflows/
# Should return no matches
```

### 9. Forbidden File Modifications

**Enforcement**: Manual code review + policy gate (planned)

**Rule**: CI workflows **must not** modify:
- `.env` files or secret storage
- CI/CD workflow permissions without approval
- Security policy files without review
- Test coverage thresholds (downward)

**Rationale**:
- Prevents accidental secret leakage
- Maintains security posture
- Prevents "fixing tests by deleting them"

**Failure Action**: Code review blocks merge + automated revert

### 10. No Secrets in Logs

**Enforcement**: Manual review + GitHub secret scanning

**Rule**: Workflows **must not**:
- `echo` secret values
- Log API keys or tokens
- Print sensitive environment variables

**Allowed**:
```powershell
# Masked output
Write-Host "Token exists: $($null -ne $env:API_KEY)"
```

**Forbidden**:
```powershell
# Direct secret exposure
Write-Host "Token: $env:API_KEY"
```

**Rationale**:
- Secrets in logs are accessible to all repo collaborators
- GitHub doesn't retroactively redact secrets
- Leaked secrets can be scraped by bots

**Failure Action**: Immediate secret rotation + incident report

## Guardrail Bypass Procedure

Some guardrails may need temporary bypass for:
- Emergency hotfixes
- Experimental features
- Rollback operations

**Bypass Requirements**:

1. **Create bypass request** in `docs/ops/APPROVAL_REQUEST_<timestamp>.md`
2. **Justification** must include:
   - Why bypass is necessary
   - Alternative solutions considered
   - Rollback plan
   - Timeline for re-enablement
3. **Approval** from 2+ team members
4. **Time-limited**: Max 48 hours
5. **Audit trail**: Document in `docs/ops/EVIDENCE_RULES.md`

**Bypasses NOT Allowed**:
- Safe-mode gate (Guardrail #5)
- Secrets in logs (Guardrail #10)
- Workflow permissions write-all (Guardrail #7)

## Enforcement Levels

| Level | Description | Action on Violation |
|-------|-------------|---------------------|
| **L1: Blocking** | Hard stop, no merge allowed | CI fails, PR blocked |
| **L2: Warning** | Soft gate, requires justification | Code review required |
| **L3: Advisory** | Best practice, not enforced | Comment on PR |

**Current Enforcement**:

| Guardrail | Level | Automated | Manual Review |
|-----------|-------|-----------|---------------|
| 1. UTF-8 BOM | L1 | ✅ | ✅ |
| 2. TypeScript | L1 | ✅ | ✅ |
| 3. ESLint | L1 | ✅ | ✅ |
| 4. Build Success | L1 | ✅ | ✅ |
| 5. Safe-Mode Gate | L1 | ✅ | ✅ |
| 6. QA Scenarios | L2 | ✅ | ✅ |
| 7. Workflow Permissions | L1 | 🚧 Planned | ✅ |
| 8. Action Pinning | L2 | 🚧 Planned | ✅ |
| 9. Forbidden Mods | L1 | 🚧 Planned | ✅ |
| 10. No Secrets in Logs | L1 | ✅ (GitHub) | ✅ |

## CI Pipeline Stages

```
┌─────────────────────────────────────────────────────────────┐
│ Stage 1: Policy Gates (L1 Blocking)                         │
├─────────────────────────────────────────────────────────────┤
│ • UTF-8 BOM Detection                                        │
│ • Workflow Syntax Validation                                 │
│ • Secret Scanning                                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Stage 2: Code Quality (L1 Blocking)                         │
├─────────────────────────────────────────────────────────────┤
│ • TypeScript Typecheck                                       │
│ • ESLint (auto-fix → strict)                                 │
│ • Python Ruff (non-blocking currently)                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Stage 3: Build & Integration (L1 Blocking)                  │
├─────────────────────────────────────────────────────────────┤
│ • Next.js Build                                              │
│ • QA Scenario Tests (L2 currently)                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Stage 4: Safety Gates (L1 Blocking)                         │
├─────────────────────────────────────────────────────────────┤
│ • Safe-Mode Enforcement Test                                 │
│ • Deployment Prevention Checks                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    ✅ MERGE ALLOWED
```

## Future Guardrails (Roadmap)

- **Dependency vulnerability scanning** (Snyk/Dependabot)
- **Container image scanning** (Trivy)
- **SAST** (Static Application Security Testing)
- **API contract testing** (OpenAPI validation)
- **Performance regression detection** (Lighthouse CI)
- **Accessibility checks** (axe-core)
- **License compliance** (FOSSA)

## Maintenance

Guardrails must be:

- **Reviewed**: Monthly
- **Updated**: When new risks identified
- **Tested**: All automated checks validated in CI
- **Documented**: Changes logged in this file

---

**Last Updated**: 2025-12-23
**Owner**: RocketGPT DevOps Team
**Version**: 1.0

