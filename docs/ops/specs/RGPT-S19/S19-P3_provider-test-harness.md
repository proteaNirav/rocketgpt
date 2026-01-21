# RGPT-GO-LIVE-S19 — P3 Provider Test Harness

## Purpose
Define a provider-agnostic test harness that verifies:
- Prompt Formulator invariants and canonical object stability
- Adapter serialization correctness (OpenAI, Claude)
- Provider parity rules (allowed differences only)
- Enforcement of prompt-source guard usage (no bypass)

## Scope
- Works even when provider integrations are incomplete (can run in "dry-run" mode)
- Produces evidence artifacts (JSON fixtures) under executions (ignored) and specs (tracked summary)

## Core Concepts
### Canonical Prompt Fixture
A deterministic PF input that yields a canonical output object:
- governance: correlationId, runId, policyVersion
- systemIntent
- task
- constraints
- outputContract
- metadata: promptSource="prompt-formulator"

### Parity Rules (Testable)
- PF output must be identical across providers for the same input (provider-agnostic)
- Serialization may differ only in envelope mapping:
  - system/developer/user message mapping
  - token caps
  - provider request schema fields
- Must preserve intent/constraints/outputContract/governance rails

## Test Cases
1) PF deterministic output (same input -> same canonical object hash)
2) PF SLA: generate canonical prompt <= 100 ms (budget)
3) Guard enforcement present in outbound call sites (static scan already exists; harness asserts it is enabled in CI)
4) OpenAI adapter serialization:
   - system mapping
   - tool schema mapping (if enabled)
5) Claude adapter serialization:
   - system mapping
   - tool schema mapping (if enabled)
6) Negative test: bypass attempt must fail

## Output Artifacts
### Tracked
- This spec
- Summary table of providers + pass/fail + version tags (added later)

### Ignored (executions)
- canonical fixtures: docs/ops/executions/RGPT-S19/P3/fixtures/*.json
- run logs

## Implementation Notes
- Prefer Node/TS test runner already in repo (or minimal TS script invoked by workflow)
- CI should run: (a) prompt-bypass scan, (b) harness dry-run, (c) harness (when providers enabled)

## Next Actions
- Implement harness runner (src/rgpt/provider-tests/*)
- Add initial fixture generator using Prompt Formulator contract
- Wire harness into CI (extend existing workflow or add job)
