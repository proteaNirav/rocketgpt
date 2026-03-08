# RGPT-D8 - Side-Effect Drift Detection

## Objective
Detect deterministic divergence between intended side effects and actual side-effect completions in the active cognitive-mesh canonical timeline path.

Primary implementation:
- `src/core/cognitive-mesh/runtime/side-effect-drift-detector.ts`
- `src/core/cognitive-mesh/runtime/execution-ledger.ts` (`detectSideEffectDrift`, `detectRuntimeTimelineSideEffectDrift`)

## Detection scopes
- In-memory canonical timeline events (single execution stream or mixed stream set)
- In-memory execution ledger entries (canonicalized before detection)
- Canonical runtime timeline JSONL files (`detectSideEffectDriftForTimelineJsonlFile`)
- Runtime helper over active in-memory ledger (`ExecutionLedger.detectSideEffectDrift`)

## Drift meaning in RocketGPT
Drift is a measurable mismatch between canonical intent and canonical completion semantics, including:
- side-effect intent recorded without matching completion
- side-effect completion recorded without prior intent
- completion mismatching intended target/action/mode
- completion in invalid order relative to canonical lifecycle stages
- duplicate completions beyond intended count
- side effects after denied/safe-mode redirect/terminal execution states
- execution completed while required side effects remain incomplete

## Rule model
Expected side effects are inferred from canonical `side_effect_intent` events per `executionId`.
Completion matching uses canonical signature material:
- `action`
- `source`
- `target`

Additional checks use canonical lifecycle context:
- dispatch/execution start stages
- denied/redirected/safe-mode signals
- terminal execution stages (`execution_completed`, `execution_failed`, `execution_denied`, `execution_redirected`)

## Result model
- Status: `no_drift | drift_detected | warning | partial | inconclusive`
- Finding fields:
  - `code`
  - `severity` (`critical | high | medium | low`)
  - `scope` (`side_effect | stream | dataset`)
  - stream/event coordinates (`executionId`, `eventId`, `sequenceNo`, `index`)
  - deterministic details payload
- Summary includes:
  - stream/record counts
  - intent/completion/match/unmatched counts
  - drift finding totals
  - warning totals
  - partial flag
  - integrity status context

## Reason-code contract (core)
- `INTENT_WITHOUT_COMPLETION`
- `COMPLETION_WITHOUT_INTENT`
- `COMPLETION_BEFORE_INTENT`
- `COMPLETION_MISMATCH_ACTION`
- `COMPLETION_MISMATCH_TARGET`
- `COMPLETION_MISMATCH_MODE`
- `DUPLICATE_COMPLETION`
- `COMPLETION_IN_INVALID_STAGE_ORDER`
- `COMPLETION_AFTER_DENIED_FLOW`
- `COMPLETION_AFTER_SAFE_MODE_REDIRECT`
- `COMPLETION_AFTER_TERMINAL`
- `REQUIRED_SIDE_EFFECT_MISSING_BEFORE_EXECUTION_COMPLETED`
- `INTEGRITY_NOT_VALIDATED`
- `INTEGRITY_INVALID_INPUT`
- `JSONL_PARSE_ERROR`

## Relationship with ledger integrity verification
- Integrity verification and drift detection are distinct.
- Drift detection accepts an integrity result and surfaces integrity status in summary output.
- If integrity is invalid, drift status can become `inconclusive` for audit-safe consumption.

## Determinism and auditability
- Findings are sorted deterministically by:
  - `executionId`
  - `sequenceNo`
  - `index`
  - `code`
- Summary formatting is deterministic via `formatSideEffectDriftSummary`.

## Non-guarantees
- Does not prove external side-effect system truth without external attestations.
- Cannot infer requirements not represented in canonical intent/completion/lifecycle events.
- Does not replace full replay/judge validation; it provides deterministic drift signals for those layers.

## Developer usage
- Programmatic:
  - `detectSideEffectDrift({ timelineEvents, integrityResult })`
  - `detectSideEffectDrift({ ledgerEntries, verifyIntegrityIfMissing: true })`
  - `detectSideEffectDriftForTimelineJsonlFile(path, { verifyIntegrity: true })`
- Runtime helper:
  - `ExecutionLedger.detectSideEffectDrift()`
  - `detectRuntimeTimelineSideEffectDrift(path)`
- CLI/dev utility:
  - `npm run mesh:detect:drift -- .rocketgpt/cognitive-mesh/runtime-timeline.jsonl`
