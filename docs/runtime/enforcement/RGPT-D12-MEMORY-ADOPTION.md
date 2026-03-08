# RGPT-D12 - Memory Adoption

## Objective
Provide a centralized deterministic gate that decides whether capability/runtime outcomes should be written into memory, in what normalized shape, and with what quality/provenance markers.

Primary implementation:
- `src/core/cognitive-mesh/memory/memory-adoption-service.ts`
- Runtime wiring in `src/core/cognitive-mesh/runtime/mesh-live-runtime.ts`
- Memory persistence bridge in `src/core/cognitive-mesh/memory/cognitive-memory-service.ts`

## Role boundaries
- Capability Execution Hardening: normalizes execution/result envelopes.
- Capability Verification: decides downstream result adoptability.
- Cognitive Signals: summarize risk/degradation/anomaly conditions.
- Memory Adoption: consumes the above and makes deterministic memory-entry decisions.
- Recall/retrieval: unchanged; consumes memory outputs after adoption.

## Adoption decision model
- `adopted`
- `adopted_with_warnings`
- `downgraded_adoption`
- `suppressed`
- `rejected`
- `invalid_memory_candidate`

Output includes:
- `adoptable`
- `writeToWorkingMemory`
- structured `reasonCodes`
- `warnings`
- `quality` (`trusted` | `warning` | `degraded` | `suppressed`)
- normalized memory record when adoptable

## Normalized memory record model
Schema: `rgpt.memory_adoption_record.v1`

Key fields:
- deterministic identifiers (`memoryId`, `stableIdentity`)
- source/correlation IDs (`sessionId`, `requestId`, `executionId`, `correlationId`)
- capability and route linkage (`capabilityId`, `routeType`)
- normalized content and payload
- adoption decision/quality/reason codes/warnings
- signal type hints and verification provenance
- timestamps and metadata

## Deterministic rules (active path)
- Hard reject:
  - failed/denied/blocked/not_found/invalid/unavailable/invocation_failed/none statuses
  - verification-rejected outcomes
  - structurally invalid candidates (missing required candidate fields/payload for success states)
- Suppress:
  - integrity/drift/anomaly-risk signals (`integrity_warning`, `drift_detected`, `verification_rejected`)
- Downgrade:
  - degraded success
  - fallback-triggered success
  - degraded verification decisions
- Adopt with warnings:
  - warning-oriented verification or non-direct-commit-eligible success
- Trusted adopt:
  - verified direct-commit-eligible success

## Runtime integration behavior
- Runtime now calls centralized memory adoption for capability outcomes.
- Working memory payload commit only occurs when `writeToWorkingMemory=true` from adoption decision.
- Adoption metadata is persisted in session working memory:
  - `runtime.last_memory_adoption_status`
  - `runtime.last_memory_adoption_quality`
  - `runtime.last_memory_adoption_reason_codes`
  - `runtime.last_memory_adopted_record_id`
- Adoption metadata is also carried in runtime reasoning/decision traces and experience tags.

## Non-goals (this phase)
- No reinforcement scoring engine
- No long-term autonomous learning strategy
- No retrieval ranking redesign

