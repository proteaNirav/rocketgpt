# RGPT-D3 — Execution-Guard (In-Flight Runtime Enforcement)

## Purpose
Execution-Guard monitors an execution **while it is running** and can:
- warn
- abort
- downgrade provider
- force reroute
- quarantine CAT (extreme)

## Inputs
- execution_id, request_id, cat_id, provider, org_id, user_id
- runtime signals: token usage, latency, retries, tool calls, error patterns

## Guardrails (Phase-D v1)
- token drift: actual > (estimate * factor)
- latency SLA breach
- retry storms / provider instability
- disallowed tool invocation attempts (if tool_intents change mid-flight)

## Outputs
- CONTINUE | WARN | ABORT | DEGRADE | REROUTE
All actions written to runtime ledger.

## Ledger
docs/ops/ledgers/runtime/EXECUTION_GUARD.jsonl
