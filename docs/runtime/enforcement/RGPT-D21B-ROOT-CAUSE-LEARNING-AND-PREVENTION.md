# RGPT-D21B - Root Cause Learning and Prevention System

## Purpose
D21-B adds deterministic post-recovery learning after D21-A repair cycles.

It analyzes recent repair/runtime evidence, detects recurring failure patterns, infers likely root causes with rule-based logic, and emits prevention recommendations without auto-applying runtime/governance changes.

## Architecture
Modules:
- `src/core/cognitive-mesh/runtime/repair-learning/runtime-failure-pattern-detector.ts`
- `src/core/cognitive-mesh/runtime/repair-learning/runtime-root-cause-analysis-engine.ts`
- `src/core/cognitive-mesh/runtime/repair-learning/runtime-prevention-recommendation-engine.ts`
- `src/core/cognitive-mesh/runtime/repair-learning/runtime-repair-learning-state-repository.ts`
- `src/core/cognitive-mesh/runtime/repair-learning/runtime-repair-learning-event-emitter.ts`
- `src/core/cognitive-mesh/runtime/repair-learning/runtime-repair-learning-orchestrator.ts`

Runtime state surface:
- `.rocketgpt/runtime/repair-learning-state.json`

CLI:
- `npm run cognitive:runtime:repair-learning`

## Evidence Sources
D21-B consumes deterministic evidence from:
- D21-A diagnosis/repair/validation outputs (explicit input or latest repair-state surface)
- recent runtime repair ledger events within lookback window
- target metadata (`targetType`, `targetId`, `anomalyType`, `repairAction`)

No external calls or probabilistic reasoning are used.

## Pattern Detector Rules
Window-based deterministic detection covers:
- repeated anomaly by anomalyType+target
- repeated repair failures by target
- repeated validation failures by target
- clustered failures in bounded time window on same target
- repeated same action on same target context

Supported pattern categories:
- `repeated_stale_heartbeat`
- `repeated_queue_backlog`
- `repeated_memory_pressure`
- `repeated_capability_timeout`
- `repeated_capability_lock_stuck`
- `repeated_repair_failure`
- `repeated_validation_failure`
- `clustered_failures_same_target`
- `clustered_failures_same_action`

## Root Cause Analysis Rules
Rule-based root cause mapping from pattern + anomaly + validation outcome:
- stale heartbeat recurrence after temporary recovery -> `worker_instability`
- stale heartbeat recurrence generally -> `stale_runtime_state`
- queue backlog + failed validation recurrence -> `queue_congestion`
- queue backlog recurrence with pressure profile -> `aggressive_retry_pressure`
- memory pressure recurrence -> `transient_memory_buildup`
- capability timeout/lock recurrence -> `capability_state_locking`
- repeated repair/validation failure patterns -> `repeated_repair_ineffectiveness`
- unclassified recurrence -> `unknown_but_recurrent`

## Prevention Recommendation Engine
Recommendations are advisory and non-executing.

Examples:
- queue congestion -> `inspect_queue_pressure`, `reduce_retry_pressure`
- worker instability -> `increase_observation_on_target`, `escalate_for_containment_consideration`
- transient memory buildup -> `inspect_memory_cleanup_frequency`
- capability locking -> `inspect_capability_locking_flow`, `inspect_capability_timeout_threshold`
- repeated repair ineffectiveness -> `manual_review_required`, `escalate_for_containment_consideration`
- no recurrence -> `no_recommendation`

## Dedupe / Cooldown Logic
To avoid learning-event spam, D21-B applies cooldown on identical conclusions:
- key = `targetType + targetId + rootCauseCategory + recommendationSet`
- if identical key appears within cooldown window, analysis is skipped/compressed
- skip is ledgered deterministically as `runtime_learning_analysis_skipped`

## Event Types
D21-B emits immutable runtime events:
- `runtime_pattern_detected`
- `runtime_root_cause_identified`
- `runtime_prevention_recommendation_generated`
- `runtime_learning_analysis_completed`
- `runtime_learning_analysis_skipped`
- `runtime_recurrence_threshold_reached`
- `runtime_repair_ineffectiveness_detected`

Metadata includes:
- targetType/targetId
- anomalyType
- repairAction
- patternCategory
- rootCauseCategory
- recommendationClasses
- recurrenceCount
- confidence
- reasonCodes
- sourceEventIds

## Safety Boundaries
D21-B does NOT:
- auto-apply governance/runtime policy changes
- mutate policy files
- mutate historical ledger entries
- call external services/LLMs
- auto-change repair thresholds/cooldowns in production
- auto-quarantine targets (deferred to D21-C)

## Limitations / Deferred
- D21-C containment/quarantine flows are not implemented in this batch.
- Automatic prevention application remains intentionally deferred.
- Learning confidence is deterministic rule-based (`low|medium|high`) and not probabilistic.
