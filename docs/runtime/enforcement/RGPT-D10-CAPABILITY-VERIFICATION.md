# RGPT-D10 - Capability Verification

## Objective
Determine whether a normalized capability execution result is acceptable for downstream adoption before runtime/memory workflows trust and use it.

Primary implementation:
- `src/core/cognitive-mesh/capabilities/orchestration/capability-verification.ts`
- Orchestrator wiring in `src/core/cognitive-mesh/capabilities/orchestration/capability-mesh-orchestrator.ts`
- Adoption wiring in `src/core/cognitive-mesh/runtime/mesh-live-runtime.ts`

## Role Separation
- Capability Execution Hardening:
  - normalizes request/execution/result shape and failure classes.
- Capability Verification:
  - evaluates post-hardening result acceptability for adoption.

## Verification result model
- Decisions:
  - `accepted`
  - `accepted_with_warnings`
  - `rejected`
  - `invalid_result`
  - `inconsistent_result`
  - `policy_rejected`
  - `degraded_accepted`
- Structured output:
  - `adoptable` boolean
  - deterministic `reasonCodes`
  - `warnings`
  - `normalizedStatus`

## Deterministic checks
- Result identity consistency (`requestId`, `sessionId`, `capabilityId`)
- `completedAt` validity
- Classification presence and consistency with status/degraded flag
- Success/degraded payload presence
- Failure-class/status consistency
- Guard/policy compatibility (deny/safe-mode cannot be represented as successful adoption)
- Diagnostics structure sanity

## Adoption rules
- `accepted` / `accepted_with_warnings` / `degraded_accepted`: adoptable
- `rejected` / `invalid_result` / `inconsistent_result` / `policy_rejected`: non-adoptable
- Non-adoptable results are not silently committed to runtime capability payload memory.

## Governance/audit behavior
- Verification decision and adoptable status are persisted in execution ledger metadata.
- Invalid/inconsistent verification decisions map to governance issue signaling via existing taxonomy.

## Non-goals (this phase)
- No reputation scoring engine
- No probabilistic trust graph
- No autonomous policy expansion
