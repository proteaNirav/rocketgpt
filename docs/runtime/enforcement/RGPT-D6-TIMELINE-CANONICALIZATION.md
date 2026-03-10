# RGPT-D6 - Timeline Event Canonicalization

## Objective
Produce deterministic, normalized, replay-ready timeline events from active runtime execution flows without introducing a second event universe.

Primary implementation:
- `src/core/cognitive-mesh/runtime/timeline-canonicalizer.ts`
- `src/core/cognitive-mesh/runtime/execution-ledger.ts`

## Canonical event contract
Canonical schema version:
- `rgpt.timeline_event.canonical.v1`

Core fields:
- `executionId`, `eventId`, `stableIdentity`, `sequenceNo`, `timestamp`
- `eventType`, `category`, `stage`, `layer`
- `action`, `source`, `target`
- `correlation` (`requestId`, `executionId`, `correlationId`, `sessionId`)
- `mode`, `status`, `outcome`
- `guards` (runtime/dispatch outcomes and reason codes)
- `sideEffect` (intent/completed/hints)
- `authority` (policy profile + auth context hash)
- `integrity` (`eventHash`, `prevEventHash`)

## Stage vocabulary (canonical)
- `dispatch_evaluated`
- `dispatch_started`
- `dispatch_completed`
- `dispatch_denied`
- `runtime_evaluated`
- `execution_started`
- `execution_completed`
- `execution_failed`
- `execution_denied`
- `execution_redirected`
- `execution_degraded`
- `execution_audit_required`
- `side_effect_intent`
- `side_effect_completed`

## Canonicalization flow
1. Module appends normalized `ExecutionLedgerEntry`.
2. `ExecutionLedger.append(...)` derives canonical timeline event centrally.
3. Sequence and hash-chain are maintained per canonical `executionId`.
4. Ledger entry and canonical timeline event are both appended (memory + optional JSONL).

No module-specific canonical mapping should be added in runtime surfaces.

## Mapping relationship to E2 timeline schema
- Reuses E2 terminology (`event_type`, `layer`, status/outcome semantics).
- Extended with runtime-active dispatch/execution/side-effect event types and explicit `stage`.
- Runtime timeline schema updated:
  - `schemas/runtime/runtime_timeline_event.schema.json`

## Replay and drift-readiness
Canonical events are deterministic and include:
- per-execution monotonic ordering (`sequenceNo`)
- stable semantic identity (`stableIdentity`)
- hash chain (`eventHash` -> `prevEventHash`)

This keeps events ready for:
- replay input normalization
- side-effect drift checks
- governance audit and semantic diff comparisons

Integrity verification layer:
- `RGPT-D7` verifies canonical chain/sequence/hash consistency and ledger-sidecar alignment before replay/audit use.
