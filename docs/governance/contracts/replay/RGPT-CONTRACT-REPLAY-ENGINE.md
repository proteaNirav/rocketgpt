# RGPT-CONTRACT — Replay Engine (Guardrailed)

## 1. Contract Purpose
Defines the binding contract for replaying AI runs under RocketGPT governance.

## 2. Inputs
- run_id (original)
- replay_mode: STRICT | SANDBOX | LIVE_ALLOWLIST
- policy_pack_hash (resolved at replay time)
- replay_operator_identity (user/service principal)

## 3. Required Behaviors
### 3.1 Immutability
- Original run ledger is read-only.
- Replay creates a new run_id linked to original run_id.

### 3.2 Step Processing
For each step:
1) Load event
2) Pre-guard checks (policy/tool/schema/budgets)
3) Execute:
   - STRICT: use recorded tool result, never call tools
   - SANDBOX: call tools only in sandbox
   - LIVE_ALLOWLIST: call only allowlisted tools/endpoints
4) Post-guard checks (redaction/exfiltration/output constraints)
5) Emit replay event + step hash

### 3.3 Codex Constraints
- Codex can only produce:
  - findings summary
  - patch diffs
  - test suggestions
- Codex cannot:
  - run tools
  - access secrets
  - auto-merge changes

## 4. Outputs
- divergence_report.md
- integrity_hash.txt (run-level)
- policy_decisions.json
- codex_suggestions.diff (optional)

## 5. Failure Rules
Replay must halt when:
- Guardrail violation occurs
- Tool execution attempted in STRICT mode
- Output fails redaction or policy checks
- Budget limits exceeded

## 6. Audit Requirements
- Every replay must be logged as a new run
- Evidence bundle must be created (unless replay fails before any step)
- Approval trail mandatory for LIVE_ALLOWLIST
