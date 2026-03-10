# RGPT-D7 - Ledger Integrity Verification

## Objective
Detect deterministic integrity failures across the active cognitive-mesh execution ledger and canonical runtime timeline.

Primary implementation:
- `src/core/cognitive-mesh/runtime/ledger-integrity-verifier.ts`
- `src/core/cognitive-mesh/runtime/execution-ledger.ts` (`verifyIntegrity`, `verifyTimelineIntegrity`)

## Verification scopes
- In-memory canonical timeline events
- In-memory execution ledger + canonical timeline sidecar consistency
- JSONL canonical timeline file verification (`verifyCanonicalTimelineJsonlFile`)
- Partial verification from execution ledger only (timeline derived in-memory)

## What is checked
- Required canonical fields and basic structural validity
- Sequence monotonicity and continuity per execution stream
- Duplicate sequence/event id/stable identity detection
- `prevEventHash` continuity across stream chain
- `eventHash` recomputation consistency
- `stableIdentity` and `eventId` recomputation consistency
- Timestamp validity and monotonicity anomalies
- Basic stage lifecycle anomalies (for example terminal before start)
- Execution ledger vs canonical timeline sidecar mismatch detection

## Result model
- Status: `valid | invalid | warning | partial`
- Findings include:
  - `code`
  - `severity`
  - `scope` (`record | stream | dataset`)
  - stream identifiers and deterministic details
- Summary includes record/stream counts and error/warning totals.

## Reason-code contract (core)
- `CHAIN_PREV_HASH_MISMATCH`
- `CHAIN_EVENT_HASH_MISMATCH`
- `STABLE_IDENTITY_MISMATCH`
- `EVENT_ID_MISMATCH`
- `SEQUENCE_OUT_OF_ORDER`
- `SEQUENCE_GAP`
- `SEQUENCE_DUPLICATE`
- `STRUCTURE_MISSING_REQUIRED_FIELD`
- `LEDGER_TIMELINE_MISSING_EVENT`
- `LEDGER_TIMELINE_EVENT_MISMATCH`
- `PARTIAL_VERIFICATION_TIMELINE_DERIVED`
- `JSONL_PARSE_ERROR`

## Deterministic failure philosophy
- Malformed/chain-broken data is never silently accepted.
- Hard invalidity uses `severity=error`.
- Risk indicators that do not prove tampering use `severity=warning`.
- Missing scope data (for example no sidecar timeline) returns `partial` with explicit reason codes.

## Non-guarantees
- Does not prove absolute real-world event authenticity.
- Does not verify external signatures/keys or off-ledger provenance.
- Detects deterministic inconsistencies in available ledger/timeline material.

## Developer usage
- Programmatic:
  - `verifyLedgerIntegrity({ ledgerEntries, timelineEvents })`
  - `verifyLedgerIntegrity({ timelineEvents })`
  - `verifyCanonicalTimelineJsonlFile(path)`
- Runtime helper:
  - `ExecutionLedger.verifyIntegrity()`
  - `ExecutionLedger.verifyTimelineIntegrity()`
- CLI/dev utility:
  - `npm run mesh:verify:timeline -- .rocketgpt/cognitive-mesh/runtime-timeline.jsonl`
