# RGPT-D15 - Experience Engine

## Objective
Create a centralized deterministic Experience Engine that converts finalized runtime/capability/verification/signal/reinforcement outcomes into structured, auditable experience records.

Primary implementation:
- `src/core/cognitive-mesh/experience/services/experience-engine.ts`
- `src/core/cognitive-mesh/experience/services/cognitive-experience-capture-service.ts`
- `src/core/cognitive-mesh/runtime/mesh-live-runtime.ts`

## Experience model
Canonical experience fields include:
- `experienceId`
- `experienceType`
- `experienceCategory`
- `experienceOutcome`
- `experienceScore`
- `experienceConfidence`
- `timestamp`
- `sourceCapability`
- `relatedMemoryId`
- `relatedExecutionId`
- `relatedSignals`
- `relatedReinforcementEvents`
- `experienceTags`
- `experienceMetadata`

The previous CEL record structure remains present for compatibility and retrieval.

## Canonical categories
- `execution_success`
- `execution_degraded`
- `execution_failure`
- `verification_rejection`
- `anomaly_detected`
- `drift_detected`
- `reinforcement_positive`
- `reinforcement_negative`
- `recall_success`
- `recall_misfire`

## Deterministic scoring
Experience score and confidence are deterministic, bounded, and derived from:
- execution classification
- verification rejection state
- reinforcement deltas
- drift/integrity/verification signal severity

Score is clamped in `[-1, 1]`.
Confidence is clamped in `[0, 1]`.

## Generation triggers (wired)
- successful / degraded / failed execution finalization
- verification rejection outcomes
- drift/integrity signal presence
- reinforcement deltas captured during memory reinforcement updates

## Persistence and auditability
- Experience records continue to be persisted through the existing cognitive experience repository path.
- Runtime now passes `relatedSignals`, `relatedExecutionId`, `relatedMemoryId`, and reinforcement events into capture.
- No probabilistic learning was introduced.

## Non-goals (this phase)
- No ML or stochastic scoring.
- No autonomous policy adaptation.
- No replacement of memory adoption or recall logic.

