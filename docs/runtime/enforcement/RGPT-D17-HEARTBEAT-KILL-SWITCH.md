# RGPT-D17 - Heartbeat Kill Switch Contract

## Purpose
Define a safe-by-default heartbeat contract before any scheduler/loop is introduced.

Heartbeat remains disabled unless all control layers allow execution.

## Kill-switch layers
1. Environment gate (primary):
   - `RGPT_HEARTBEAT_ENABLED`
   - default when unset: disabled
2. Runtime/file gate:
   - `.rocketgpt/runtime/kill-switch.json`
   - expected keys: `heartbeat`, `runtimeSignals`, `capabilityDispatch`
   - missing file: fail-safe disabled
   - malformed file: fail-safe disabled
3. Guard-level safety gate:
- current implementation note: rate limiting is process-local/in-memory for the manual CLI path in this batch; cross-process persistence is deferred to a later batch
   - frequency guard rejects high-rate heartbeat attempts
   - conservative threshold for this batch: max 1 per 10 seconds per runtime id

## Decision flow
Heartbeat is allowed only when:
- env enabled
- file kill switch heartbeat enabled
- rate-limit guard allows

Otherwise it returns a structured blocked decision with reason codes (no hard exception path for normal blocks).

## Manual single-shot scope (this batch only)
- Added a single-shot helper:
  - `src/core/cognitive-mesh/runtime/manual-heartbeat-runner.ts`
- Added a CLI/manual command:
  - `src/core/cognitive-mesh/runtime/manual-heartbeat.cli.ts`
- No scheduler, cron, daemon, or recurring background loop is included.

## Signal contract
Heartbeat payload:
- `signal_type: "system_heartbeat"`
- `timestamp`
- `runtime_id`
- `runtime_status`
- `guard_status`
- `ledger_status`
- `reason_codes`
- optional `metadata`

Runtime signal integration:
- emitted as a typed cognitive runtime signal (`system_heartbeat`)

Ledger integration:
- one runtime ledger append entry for successful single-shot heartbeat
- no capability/workflow dispatch actions are triggered by this path

## Fail-safe defaults
- env unset -> blocked
- file missing -> blocked
- file invalid -> blocked
- rate limit exceeded -> blocked

## Future extension path
Later batches can add scheduled heartbeat orchestration around this contract, but must keep this contract as the mandatory gate stack.

