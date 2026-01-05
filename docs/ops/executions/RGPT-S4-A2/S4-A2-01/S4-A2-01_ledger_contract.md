# RGPT-S4-A2-01 — Runtime Ledger Contract (Canonical)

## Purpose
A single canonical ledger for **executions** and **decisions** that is:
- Append-only (no mutation / no delete)
- Replay-safe (idempotent writes with deterministic keys)
- Audit-grade (who/what/when/why captured)
- Correlatable (parent/child relationships, request/run correlation)

This contract is the **source of truth** for:
- What ran, under which runtime-mode, with what inputs (redacted/hashed)
- What decisions were made (allow/deny/escalate/auto-fix), and why
- Whether Safe-Mode affected behavior (and the reason code)

---

## Entity 1: ExecutionRecord

### Identity
- **execution_id** (uuid, server-generated) — primary identity
- **idempotency_key** (string, required for write APIs) — prevents duplicates
  - Recommended: stable hash of (actor_id + action + target + request_id + step_id)

### Correlation
- **request_id** (string, required) — stable correlation for a user/API request
- **run_id** (string, optional) — external workflow run id / orchestrator run id
- **parent_execution_id** (uuid, nullable) — parent/child chain
- **root_execution_id** (uuid, required) — stable root of the chain

### Actor (who initiated)
- **actor_type** (enum: human | ci | agent | system)
- **actor_id** (string, required) — userId/service principal/agent id
- **actor_display** (string, optional) — friendly name (non-authoritative)

### Runtime governance
- **runtime_mode** (enum: normal | safe_mode | dry_run | read_only)
- **runtime_policy_version** (string, optional) — policy snapshot/version
- **safe_mode_reason_code** (string, nullable) — set when runtime_mode=safe_mode and action constrained
- **permissions_snapshot** (json, optional) — minimal granted permissions at time of execution

### What ran
- **component** (string, required) — e.g., orchestrator, builder, self_heal, api_route
- **operation** (string, required) — verb/action name (execute-all, apply-plan, etc.)
- **target_ref** (string, optional) — resource identifier (repo/path/job)
- **inputs_ref** (string, optional) — pointer to stored inputs (blob) OR hashed summary only
- **inputs_hash** (string, optional) — sha256 for integrity (preferred when inputs_ref exists)

### Timing & outcome
- **started_at** (timestamptz, required)
- **ended_at** (timestamptz, nullable)
- **status** (enum: started | succeeded | failed | aborted | blocked)
- **error_kind** (string, nullable) — normalized error type
- **error_message** (string, nullable, truncated) — safe, non-secret summary
- **metrics** (json, optional) — durations, token counts, etc.

### Integrity & traceability
- **created_at** (timestamptz, required)
- **created_by** (string, required) — server identity
- **ledger_version** (int, required) — schema/contract version

---

## Entity 2: DecisionRecord

### Identity & linkage
- **decision_id** (uuid, server-generated)
- **execution_id** (uuid, required) — FK to ExecutionRecord
- **decision_seq** (int, required) — ordering within execution (1..N)
- **idempotency_key** (string, required) — stable per decision

### Classification
- **decision_type** (enum: allow | deny | escalate | auto_fix | noop)
- **decision_scope** (enum: security | workflow | data | runtime | quality)
- **confidence** (float 0..1, optional)
- **severity** (enum: info | low | medium | high | critical)

### Rationale
- **reason_code** (string, required) — stable code (e.g., SAFE_MODE_BLOCK_WRITE)
- **reason_text** (string, required, truncated) — human-readable explanation
- **policy_refs** (json array, optional) — policy ids / rule names / links (no secrets)
- **evidence_refs** (json array, optional) — pointers to logs/artifacts (ids/paths)

### Proposed actions (never executed implicitly unless explicitly allowed)
- **recommended_action** (string, nullable) — textual instruction
- **patch_ref** (string, nullable) — link/id of patch artifact (if auto-fix proposed)
- **requires_approval** (bool, required)

### Timing
- **created_at** (timestamptz, required)
- **created_by** (string, required)
- **ledger_version** (int, required)

---

## Global Invariants (Non-Negotiable)
1. **Append-only:** no UPDATE/DELETE on ledger tables; only INSERT.
2. **Idempotency:** all writes require idempotency_key; duplicate keys must not create new rows.
3. **Deterministic ordering:** DecisionRecord uses decision_seq and unique(execution_id, decision_seq).
4. **No secrets in ledger:** never store tokens, raw credentials, raw env vars, full request bodies.
5. **Redaction-by-default:** inputs stored only as hashes or blob refs to secured storage.
6. **Safe-Mode transparency:** if runtime_mode=safe_mode affects behavior, safe_mode_reason_code must be set.
7. **Actor attribution:** actor_type + actor_id required for every execution.
8. **Correlation required:** request_id + root_execution_id required for every execution.

---

## Implementation Notes (Next Steps)
- Create/align DB schema to these entities (or map existing ones to this contract)
- Add server-side write helpers enforcing invariants
- Add read-only endpoints for auditing (optional in this execution)
