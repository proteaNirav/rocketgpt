# RGPT-D13 - Recall Foundation Strengthening

## Objective
Make adopted-memory recall deterministic, quality-aware, and safe so active runtime/session flows retrieve relevant trusted memory without suppressed/weak-memory pollution.

Primary implementation:
- `src/core/cognitive-mesh/memory/adopted-recall-foundation.ts`
- Integration in:
  - `src/core/cognitive-mesh/memory/explicit-recall-engine.ts`
  - `src/core/cognitive-mesh/memory/implicit-resurfacing-engine.ts`
  - `src/core/cognitive-mesh/memory/memory-packet-service.ts`
  - `src/core/cognitive-mesh/memory/cognitive-memory-service.ts`
  - `src/core/cognitive-mesh/memory/cat-memory-adoption-service.ts`

## Role boundaries
- Memory Adoption: decides storage eligibility/quality.
- Recall Foundation: decides recall eligibility/ranking among stored memory.
- Motivated Recall: decides when/how strongly recall should be attempted.

## Recall eligibility rules
- Exclude malformed memory items.
- Exclude adoption states: `suppressed`, `rejected`, `invalid_memory_candidate`.
- Exclude quality `suppressed`.
- Exclude anomaly-risk records by default when tagged with strong risk signals:
  - `integrity_warning`
  - `drift_detected`
  - `verification_rejected`
- Keep `adopted_with_warnings` and `downgraded_adoption` eligible but lower-ranked.

## Deterministic prioritization basis
- Base ranking from existing `MemoryRanking` (query/intent/route/risk aware).
- Deterministic adjustments for:
  - memory quality marker (`trusted` > `warning` > `degraded`)
  - warning count penalties
  - signal penalties (`adoption_suppressed`, `verification_warning`, `degraded_execution`)
  - capability match bonus
  - route match bonus
- Stable tie-breakers: score desc, updatedAt desc, memoryId asc.

## Normalized recall output
- Recalled items with:
  - score
  - quality
  - adoption decision
  - reason codes
  - ranking factors (base + adjustments)
- Exclusion list with structured reason codes.
- Diagnostics summary counts:
  - excluded/malformed/suppressed/risk-excluded/warning-included.

## Runtime integration outcomes
- Explicit recall, implicit resurfacing, and memory packet selection all consume the same recall foundation.
- Memory packet provenance now indicates quality-aware filtering.
- CAT memory selection trace now includes recall eligibility diagnostics (`eligible=<n>:excluded=<m>`).

## Non-goals (this phase)
- No vector/semantic retrieval engine.
- No reinforcement-learning ranking feedback loop.
- No policy-autonomous recall adaptation.

