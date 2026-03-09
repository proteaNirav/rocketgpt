# RGPT-D19 - Runtime Sanitation Service (Phase 1)

## Purpose
Establish a policy-driven runtime hygiene layer for local RocketGPT runtime artifacts.

Phase 1 introduces deterministic sanitation for contaminated/malformed runtime surfaces while preserving governance and forensic traceability.

Primary implementation:
- `src/core/cognitive-mesh/runtime/runtime-sanitation.types.ts`
- `src/core/cognitive-mesh/runtime/runtime-sanitation-policy.ts`
- `src/core/cognitive-mesh/runtime/runtime-sanitation-service.ts`
- `src/core/cognitive-mesh/runtime/runtime-sanitation.cli.ts`

## Sanitation scopes (Phase 1)
- `runtime-artifacts`
  - `.rocketgpt/cognitive-mesh/execution-ledger.jsonl`
  - `.rocketgpt/cognitive-mesh/runtime-timeline.jsonl`
  - `.rocketgpt/runtime/kill-switch.json` (informational detection/reporting)
- `temp-artifacts`
  - `.tmp/`
- `all`
  - both scopes above

## Service architecture
1. Runtime Waste Scanner
- scans configured paths
- classifies findings (`clean`, `malformed`, `contaminated`, `transient`, `stale`)
- detects contamination markers including:
  - JSONL parse errors
  - benchmark/test signatures (`bench`, `benchmark`, `mesh-tests`, `.test`)
  - duplicate canonical continuity hints in timeline (`executionId:sequenceNo`, duplicate event ids)

2. Hygiene Policy Engine
- maps findings to policy actions:
  - `retain`
  - `archive`
  - `quarantine`
  - `archive_and_refresh`
  - `skip_with_warning`
- honors mode flags:
  - `--archive-only`
  - `--quarantine-invalid`

3. Sanitation Executor
- executes actions safely via rename-based moves
- never hard-deletes by default
- supports dry-run without mutation
- refreshes active runtime artifacts only when policy allows (`archive_and_refresh` / quarantine with refresh)

4. Sanitation Report Model
- JSON report includes:
  - findings
  - selected actions
  - executed/planned/skipped records
  - affected paths
  - warnings and notes
  - summary counts

## Archive and quarantine roots
- Runtime archive: `.rocketgpt/archive/runtime/`
- Temp archive: `.rocketgpt/archive/temp/`
- Runtime quarantine: `.rocketgpt/quarantine/runtime/`
- Temp quarantine: `.rocketgpt/quarantine/temp/`

Timestamped moved names are generated as `YYYYMMDD-HHMMSS` in UTC.

## CLI
- `npm run cognitive:runtime:clean`
- Flags:
  - `--dry-run`
  - `--scope runtime-artifacts|temp-artifacts|all`
  - `--quarantine-invalid`
  - `--archive-only`

## Dry-run semantics
Dry-run is fully read-only:
- no rename
- no write
- no directory mutation
- report still includes planned actions

## Governance rationale
The cognitive runtime uses append-only artifact philosophy for accountability, but local test/benchmark contamination can distort health signals and governance checks. D19 provides policy-based sanitation that preserves historical evidence while restoring clean active surfaces.

## Future extension path
Potential next phases can add:
- scheduled sanitation orchestration
- sanitation metrics and trend observability
- expanded artifact classes and risk signatures
- operator approval workflows for stricter policies

Phase 1 intentionally stays conservative and local-first.
