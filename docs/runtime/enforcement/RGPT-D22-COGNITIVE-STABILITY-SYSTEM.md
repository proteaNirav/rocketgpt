# RGPT-D22 - Cognitive Stability System (Phase 1)

## Purpose
D22 Phase 1 introduces deterministic mesh-level stability evaluation above D20 heartbeat and D21 repair/learning/containment.

It computes bounded target/system stability scores, detects oscillation/thrashing patterns, and emits conservative graceful degradation recommendations without changing governance rules.

## Architecture
Modules:
- `src/core/cognitive-mesh/runtime/stability/runtime-stability-signal-aggregator.ts`
- `src/core/cognitive-mesh/runtime/stability/runtime-stability-scoring-engine.ts`
- `src/core/cognitive-mesh/runtime/stability/runtime-oscillation-detector.ts`
- `src/core/cognitive-mesh/runtime/stability/runtime-degradation-policy-engine.ts`
- `src/core/cognitive-mesh/runtime/stability/runtime-stability-state-repository.ts`
- `src/core/cognitive-mesh/runtime/stability/runtime-stability-event-emitter.ts`
- `src/core/cognitive-mesh/runtime/stability/runtime-stability-orchestrator.ts`

Runtime state surface:
- `.rocketgpt/runtime/stability-state.json`

CLI:
- `npm run cognitive:runtime:stability`

## Evidence Sources (Phase 1)
Bounded evidence set from recent runtime events:
- heartbeat signals (`runtime.heartbeat`)
- D21-A repair and validation events
- D21-B recurrence/learning outputs
- D21-C containment/reintegration/retirement events
- same-target and multi-target instability counts within lookback window

No external calls or non-deterministic inference are used.

## Scoring Model
Deterministic bounded score range: `0..100`

Bands:
- `80..100` -> `normal`
- `60..79` -> `watch`
- `40..59` -> `degraded`
- `20..39` -> `constrained`
- `0..19` -> `critical`

Target-level score deductions include:
- repair failures
- validation failures
- containment frequency
- reintegration failures
- recurrence threshold signals
- heartbeat flap indicators
- oscillation penalties

System-level score derives from target aggregate plus penalties for:
- clustered multi-target instability
- broad degraded target spread
- oscillation pattern presence

All deductions produce explicit reason codes.

## Oscillation / Thrash Rules
Deterministic rules detect:
- `repair_oscillation`
- `contain_reintegrate_oscillation`
- `repeated_validation_failure`
- `repeated_repair_failure`
- `repeated_same_target_instability`
- `clustered_multi_target_instability`
- `heartbeat_recovery_flap`
- `instability_after_reintegration`

## Degradation Bands and Actions
Bands:
- `normal`
- `watch`
- `degraded`
- `constrained`
- `critical`

Actions:
- `no_action`
- `increase_observation`
- `reduce_new_work_intake`
- `prefer_healthy_targets_only`
- `suppress_repeated_repair_on_unstable_targets`
- `recommend_safe_mode_review`

Policy is conservative and recommendation-first.

## Stability State Surface
`.rocketgpt/runtime/stability-state.json` includes:
- `lastUpdatedAt`
- `latestEvaluation`
- `targetStabilityIndex`
- `recentInstabilityPatterns`
- `degradationState`
- `summaryCounters`
- `evaluationCooldowns`

## Event Types
Immutable runtime events:
- `runtime_stability_evaluated`
- `runtime_instability_pattern_detected`
- `runtime_oscillation_detected`
- `runtime_degradation_state_changed`
- `runtime_degradation_action_recommended`
- `runtime_stability_watch_triggered`
- `runtime_stability_critical_triggered`

Metadata carries:
- target summaries
- system score and band
- instability patterns
- degradation action
- reason codes
- stability evaluation id

## Safety Boundaries
D22 does not:
- mutate governance definitions or policy files
- mutate historical ledger/timeline entries
- call external services/LLMs
- replace D20/D21 execution logic
- destroy queued work
- bypass safe-mode/kill-switch controls

## Limitations / Deferred
Deferred beyond D22 Phase 1:
- autonomous global equilibrium control loops
- distributed multi-node stability arbitration
- adaptive policy mutation
- broad topology-level stabilization
