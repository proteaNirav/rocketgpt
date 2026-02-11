# RGPT-PHASE-E3-C — Replay Engine via Codex (Guardrailed)

**Status:** Planned  
**Phase:** E3  
**Category:** Execution Governance / Deterministic AI  
**Audience:** Core Architects, Governance Owners, CI/CD & Audit Teams

## 1. Purpose & Scope
The Replay Engine enables RocketGPT to deterministically **reproduce, audit, compare, and debug** any historical AI execution by replaying its full execution trace under strict governance controls.

This phase introduces:
- Immutable execution trace replay
- Multi-mode replay (STRICT / SANDBOX / LIVE_ALLOWLIST)
- Guardrailed Codex-assisted remediation (diff-only)
- Deterministic divergence detection
- Evidence-grade replay reports

**Non-goal:** Introducing new autonomous behaviors. Replay governs existing executions only.

## 2. Design Principles
1. Ledger First (trace is source of truth)
2. Determinism Over Convenience (STRICT default)
3. Zero Trust Replay (policy re-validation per step)
4. Codex Advisory Only (no execution, diff-only suggestions)
5. Audit-Grade Evidence (hashes + report + artifacts)

## 3. Replay Modes
### STRICT (Default)
- No real tool execution
- Tool results come from ledger
- 100% deterministic, no side effects

### SANDBOX
- Tools execute only in isolated sandbox (no prod data / no external network)
- Used for controlled debugging

### LIVE_ALLOWLIST
- Only explicitly allowlisted tools/endpoints
- Requires elevated approval trail
- Used for controlled validation scenarios

## 4. Components
### 4.1 Trace Ledger (Immutable)
- run_header (run_id, org/user, provider/model, policy_pack_hash, timestamps)
- run_events (append-only events)
- run_artifacts (reports, diffs, evidence bundles)

### 4.2 Replay Orchestrator
- Rehydrates state from trace
- Steps through events sequentially
- Enforces replay mode rules
- Emits replay run as a new run with linkage to original run_id

### 4.3 Guardrail Layer (Mandatory)
- Policy Gate (RBAC + purpose binding)
- Tool allowlist + schema validation
- Secret redaction + exfiltration guard
- Destructive action guard
- Prompt integrity (prompt pack hash verification)
- Budget guards (tokens/calls/retries)

### 4.4 Codex Worker (Guarded)
- Root-cause analysis and diff-only fix suggestions
- No secret access; no direct execution

### 4.5 Comparison Engine
- Normalization (strip nondeterministic fields)
- Step hashes + run hashes
- Divergence detection and classification

## 5. Evidence Bundle (Output)
Target structure:
docs/ops/replays/RGPT-E3-C/<run_id>/
- replay_header.json
- replay_mode.json
- divergence_report.md
- step_diffs/
- policy_decisions.json
- codex_suggestions.diff
- integrity_hash.txt

## 6. Acceptance Criteria
E3-C is complete when:
1) Any historical run can be replayed in STRICT mode  
2) Divergences are detected deterministically and reported  
3) Guardrails block unsafe/non-compliant actions  
4) Evidence bundle is generated  
5) Codex suggestions are diff-only (advisory)  
6) STRICT replay produces zero side effects  

## 7. Explicit Non-Goals
- Auto-patching prod
- Live replay by default
- Bypassing governance for debugging
