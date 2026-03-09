# RGPT-D22B - Evolution Signals Framework

## Purpose
D22-B provides a deterministic evidence-only telemetry layer for runtime evolution analysis.

It captures bounded signals about:
- self-healing effectiveness
- structured learning sequences
- recurring improvement candidates

It does not mutate runtime behavior, governance rules, repair logic, containment policy, or stability thresholds.

## Architecture
Modules:
- `src/core/cognitive-mesh/runtime/evolution-signals/healing-telemetry-aggregator.ts`
- `src/core/cognitive-mesh/runtime/evolution-signals/learning-signal-extractor.ts`
- `src/core/cognitive-mesh/runtime/evolution-signals/improvement-candidate-detector.ts`
- `src/core/cognitive-mesh/runtime/evolution-signals/runtime-evolution-signals-state-repository.ts`
- `src/core/cognitive-mesh/runtime/evolution-signals/runtime-evolution-signals-event-emitter.ts`
- `src/core/cognitive-mesh/runtime/evolution-signals/runtime-evolution-signals-orchestrator.ts`

Runtime state surface:
- `.rocketgpt/runtime/evolution-signals.json`

CLI:
- `npm run cognitive:runtime:evolution-signals`

## Healing Telemetry Model
D22-B computes bounded recent metrics:
- `repairSuccessRate`
- `repairFailureRate`
- `validationSuccessRate`
- `validationFailureRate`
- `containmentRate`
- `reintegrationSuccessRate`
- `reintegrationFailureRate`
- `repairLoopFrequency`
- `oscillationRate`
- `retirementRate`
- `degradedBandFrequency`
- `constrainedOrCriticalFrequency`

Assessment classes:
- `healthy`
- `watch`
- `stressed`
- `unstable`

## Learning Signal Model
Learning signals are compact structured transition records only for significant events.
No verbose free-text introspection is stored.

Signal fields include:
- target + signal sequence
- decision taken
- outcome
- stability impact
- recurrence context
- reason codes

Routine healthy-only operation does not produce learning signals.

## Improvement Candidate Model
D22-B detects deterministic recurring weak-point categories, including:
- ineffective repair strategy recurrence
- validation failure clusters
- repeated containment/reintegration failures
- persistent oscillation
- repeated degradation triggers
- unstable hotspots and target-specific chronic instability

Each candidate includes severity, recurrence support, review class, and reason codes.

## Noise Control / Dedupe Rules
Bounded dedupe and cooldown controls:
- identical learning signal key (`target + decision + outcome + recurrence`) within cooldown => skipped
- candidate key (`target + category + severity`) within cooldown => update/compress instead of spamming
- unchanged healing assessment with materially same metrics => suppress repeated healing telemetry emission

## State Surface
`.rocketgpt/runtime/evolution-signals.json` contains:
- `lastUpdatedAt`
- `latestEvaluation`
- `latestHealingTelemetry`
- `recentLearningSignals[]`
- `activeImprovementCandidates[]`
- `summaryCounters`
- `dedupeState`

## Event Types
Immutable runtime events:
- `runtime_healing_telemetry_evaluated`
- `runtime_learning_signal_captured`
- `runtime_improvement_candidate_detected`
- `runtime_evolution_signals_evaluated`
- `runtime_learning_signal_skipped`
- `runtime_improvement_candidate_escalated`
- `runtime_healing_assessment_changed`

## Safety Boundaries
D22-B does not:
- auto-change runtime behavior
- auto-modify repair/learning/containment/stability policies
- modify governance files or definitions
- mutate ledger history
- call external services/LLMs

## D23 / D24 Preparation
D22-B creates compact, replay-safe, deterministic evidence for:
- D23 self-learning strategy selection inputs
- D24 self-improvement candidate review streams
- human or consortium architecture review queues

## Deferred Items
Deferred beyond v1:
- automatic candidate approval/application
- dynamic policy adaptation
- distributed evolution-signal federation
- predictive optimization loops
