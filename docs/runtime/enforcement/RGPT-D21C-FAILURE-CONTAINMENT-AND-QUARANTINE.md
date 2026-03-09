# RGPT-D21C Failure Containment and Quarantine

## Purpose
D21-C adds a deterministic containment layer for unstable runtime targets so local faults do not spread while preserving existing governance guardrails.

## Architecture
D21-C is implemented under `src/core/cognitive-mesh/runtime/containment/` with:
- `RuntimeContainmentDetector`: bounded trigger evaluation from recent evidence.
- `RuntimeContainmentPolicyEngine`: rule-based action selection.
- `RuntimeQuarantineController`: applies/extends quarantine state.
- `RuntimeReintegrationController`: controlled return to service through repair/validation/observation.
- `RuntimeContainmentStateRepository`: runtime state surface persistence.
- `RuntimeContainmentEventEmitter`: immutable containment event emission.
- `RuntimeContainmentOrchestrator`: end-to-end execution.
- `runtime-containment-eligibility`: dispatch/capability eligibility hook.

## Supported Containment Scopes (v1)
- `capability`
- `worker`
- `queue`

## Detector Rules
The detector evaluates bounded evidence over a lookback window and supports:
- repeated same anomaly on same target (threshold-based)
- repeated repair failures on same target
- repeated validation failures on same target
- D21-B learning escalation (`escalate_for_containment_consideration`)
- local cascade-risk style clustered failures on same target/action

## Policy Engine Rules
Rule-based mapping:
- stale heartbeat worker/runtime patterns -> `quarantine_worker`
- queue backlog patterns -> `freeze_queue`
- capability timeout/lock patterns -> `quarantine_capability`
- repeated repair/validation failures -> target-type containment fallback
- unsupported/no-threshold -> `no_containment`

All decisions include explicit reason codes.

## Dispatch Eligibility Integration
Quarantined targets are blocked for new assignment through minimal integration points:
- capability dispatch path in `CapabilityMeshOrchestrator`
- mesh job dispatch path in `CognitiveMeshJobDispatcher`

Containment blocks new assignment only; existing queued work is not deleted.

## Reintegration and Observation Flow
Deterministic state progression:
- `contained` -> `under_repair` (repair success)
- `under_repair`/`contained` -> `recovery_validation` -> `observation` (validation success)
- `observation` -> `reintegrated` (window passes without recurring anomaly)
- `observation` -> `contained`/`retired` (recurrence)

Observation window is bounded via config.

## Retirement Rule
Targets transition to `retired` after repeated reintegration failures exceed threshold (`RGPT_RUNTIME_CONTAINMENT_MAX_REINTEGRATION_FAILURES`).
Retired targets are ineligible for automatic reintegration.

## Cooldown and Dedupe
Decision dedupe key:
`targetType + targetId + containmentAction + triggerCategory`

Repeated identical containment decisions inside cooldown are skipped and ledgered (`runtime_quarantine_skipped`) with cooldown reason codes.

## Runtime State Surface
D21-C writes `.rocketgpt/runtime/containment-state.json` with:
- `activeContainments[]`
- `latestDecision`
- `latestReintegration`
- `perTargetContainmentHistory`
- `observationWindows`
- `decisionCooldowns`
- `summaryCounters`

## Event Types
Immutable runtime events:
- `runtime_containment_triggered`
- `runtime_quarantine_applied`
- `runtime_quarantine_skipped`
- `runtime_quarantine_extended`
- `runtime_reintegration_started`
- `runtime_reintegration_observation_started`
- `runtime_reintegration_completed`
- `runtime_reintegration_failed`
- `runtime_cascade_risk_detected`
- `runtime_target_retired_from_auto_reintegration`

## Safety Boundaries
D21-C does not:
- bypass Runtime Guard or Dispatch Guard
- modify governance or policy files
- mutate ledger history
- delete queued tasks silently
- call external services/LLMs
- replace D21-A repair logic or D21-B learning logic

## Limitations / Deferred
Deferred beyond D21-C:
- domain-wide containment
- cross-node/distributed containment
- topology reshaping
- autonomous policy or config mutation
