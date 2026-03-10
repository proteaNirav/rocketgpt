# RGPT-D11 - Cognitive Signal System

## Objective
Provide a deterministic, typed, reusable signal substrate for active cognitive-mesh runtime/capability/governance paths without replacing guard, verification, ledger, or timeline responsibilities.

Primary implementation:
- `src/core/cognitive-mesh/runtime/cognitive-signal-system.ts`
- Orchestrator wiring in `src/core/cognitive-mesh/capabilities/orchestration/capability-mesh-orchestrator.ts`
- Runtime propagation in `src/core/cognitive-mesh/runtime/mesh-live-runtime.ts`
- Integrity/drift signal conversion in `src/core/cognitive-mesh/runtime/execution-ledger.ts`

## Canonical signal model
- Schema: `rgpt.cognitive_signal.v1`
- Deterministic identity fields:
  - `signalId`
  - `stableIdentity`
- Core fields:
  - `signalType`
  - `category`
  - `source`
  - `severity`
  - `priority`
  - `timestamp`
  - `ids` (`requestId`, `executionId`, `correlationId`, `sessionId`)
  - `capabilityId`
  - `routeType`
  - `reasonCodes`
  - optional `confidence`, `weight`, `metadata`

## Canonical vocabulary (active path)
- `execution_ok`
- `degraded_execution`
- `verification_warning`
- `verification_rejected`
- `guard_block`
- `dispatch_reroute`
- `safe_mode_redirect`
- `integrity_warning`
- `drift_detected`
- `unavailable_capability`
- `memory_candidate`
- `experience_candidate`
- `adoption_suppressed`

## Deterministic generation rules
- Capability/runtime execution:
  - success -> `execution_ok`
  - degraded paths -> `degraded_execution`
  - non-adoptable verification decisions -> `verification_rejected` and `adoption_suppressed`
  - guard deny/safe-mode -> `guard_block` / `safe_mode_redirect`
  - dispatch reroute -> `dispatch_reroute`
  - not_found/unavailable -> `unavailable_capability`
  - commit-eligible results -> `memory_candidate`
  - runtime capability outcomes -> `experience_candidate`
- Integrity/drift analyzers:
  - non-valid integrity summary -> `integrity_warning`
  - non-zero drift summary -> `drift_detected`

## Propagation and collection flow
- Signals are generated centrally via `deriveCapabilitySignals`, `deriveIntegritySignals`, and `deriveDriftSignals`.
- Orchestrator emits capability-level signals in `CapabilityInvocationOutcome.cognitiveSignals`.
- Runtime merges/collects signals per session and exposes them via:
  - `getSessionCognitiveSignals(sessionId, limit?)`
  - reasoning context / decision trail metadata (`cognitiveSignalTypes`)
  - execution ledger metadata (`cognitiveSignalTypes`) on runtime terminal events
- Experience capture receives passive signal hints as tags (`signal:<signalType>`).

## Role boundaries
- Guards enforce policy.
- Execution ledger/timeline records canonical execution facts.
- Capability verification validates adoption eligibility.
- Cognitive signals summarize conditions for downstream cognition/memory/replay analysis.

## Downstream consumers (future)
- Memory reinforcement candidate selection
- Experience scoring and outcome weighting
- Adaptive routing/reroute policy tuning
- Constitutional advisory checks (non-enforcing in current phase)

## Non-goals (this phase)
- No autonomous adaptive control loop
- No reputation/trust graph engine
- No replacement of existing governance enforcement paths

