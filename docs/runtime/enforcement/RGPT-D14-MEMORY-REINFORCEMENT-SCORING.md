# RGPT-D14 - Memory Reinforcement Scoring

## Objective
Deterministically strengthen or weaken adopted memory influence over time using runtime outcomes, verification outcomes, and cognitive signals.

Primary implementation:
- `src/core/cognitive-mesh/memory/memory-reinforcement-scoring.ts`
- Persistence/wiring:
  - `src/core/cognitive-mesh/memory/cognitive-memory-service.ts`
  - `src/core/cognitive-mesh/runtime/mesh-live-runtime.ts`
- Recall integration:
  - `src/core/cognitive-mesh/memory/adopted-recall-foundation.ts`

## Role boundaries
- Memory Adoption: decides whether memory is stored.
- Recall Foundation: ranks eligible memory for retrieval.
- Reinforcement Scoring: updates memory influence weights over time.

## Reinforcement model
Per-memory state fields:
- `reinforcementScore`
- `reinforcementEvents`
- `reinforcementReasonCodes`
- `lastReinforcedTimestamp`
- `reinforcementConfidence`
- `reinforcementTrend`

Score bounds:
- min: `0.0`
- default: `1.0`
- max: `2.5`

## Deterministic signal rules
Positive examples:
- successful verified execution
- successful recall usage
- clean path with no strong anomaly signals

Negative examples:
- verification rejection
- drift detected
- integrity warning
- degraded execution
- fallback-triggered flow
- runtime failure
- suppressed adoption state

## Persistence behavior
- Reinforcement is persisted in memory item metadata.
- Existing memory content is unchanged.
- Related recall influence scores (`reuse`, `relevance`, `confidence`) are updated in bounded deterministic increments.

## Recall interaction
- Recall ranking includes bounded reinforcement adjustment as one factor.
- Reinforcement does not replace quality/recency/relevance logic.

## Runtime integration
- On finalized capability outcome, runtime applies reinforcement to:
  - newly adopted memory record (if any)
  - recalled memory IDs used in the memory packet selection path
- Runtime records reinforcement update count in working memory metadata.

## Non-goals (this phase)
- No ML training or probabilistic model updates
- No embedding/vector ranker
- No autonomous policy adaptation

