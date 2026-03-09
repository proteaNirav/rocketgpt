# RGPT-D18 - Runtime Status Command

## Purpose
Provide a local, read-only runtime observability command for cognitive-mesh artifacts before introducing a full observatory/dashboard layer.

Primary implementation:
- `src/core/cognitive-mesh/runtime/runtime-status.ts`
- `src/core/cognitive-mesh/runtime/runtime-status.cli.ts`
- npm script: `cognitive:runtime:status`

## Command
- Default JSON output:
  - `npm run cognitive:runtime:status`
- Optional deep verification:
  - `npm run cognitive:runtime:status -- --deep`
- Optional human-readable summary:
  - `npm run cognitive:runtime:status -- --human`
- Optional full deep payload details:
  - `npm run cognitive:runtime:status -- --deep --verbose`

## What is checked
- Runtime identity:
  - runtime id (env/derived), hostname, current timestamp
- Heartbeat status:
  - env gate (`RGPT_HEARTBEAT_ENABLED`)
  - runtime kill-switch file state (`loaded | missing | invalid`)
  - file heartbeat enable flag
  - last heartbeat timestamp and age
  - heartbeat status (`never_seen | disabled | stale | healthy | unknown`)
- Execution ledger summary:
  - file path/existence
  - line count, parsed entry count, parse errors
  - last entry timestamp/action
  - heartbeat entry count
  - failed execution count
- Runtime timeline summary:
  - file path/existence
  - line count, parsed event count, parse errors
  - last event timestamp/action/type
- Failure summary (recent window, default 24h):
  - failed execution count
  - capability verification rejection markers
  - denied/degraded event count
- Final summary block:
  - `runtimeStatus`
  - heartbeat/ledger/timeline/integrity/drift sub-statuses
  - short notes array

## What is not checked by default
- Deep integrity and side-effect drift verification are skipped by default to keep the status command lightweight.
- Use `--deep` to run:
  - canonical timeline integrity verification
  - side-effect drift detection (with integrity context)
- In deep mode, output remains concise by default (summary + top findings sample).
- Use `--verbose` for full verifier payloads.

## Safety and behavior
- Read-only command.
- No scheduler or recurring loop.
- No heartbeat emission.
- No capability/workflow dispatch.
- Missing files return meaningful status values instead of throwing on normal status path.

## Status interpretation
- `healthy`: artifacts present and no critical warnings/degradation signals.
- `warning`: missing artifacts, stale/disabled heartbeat, or deep checks not run.
- `degraded`: invalid artifact parse state, integrity invalid, or drift detected.
- `unknown`: no heartbeat and no runtime artifacts present.

## Future extension path
This command is the base for a Runtime Observatory Layer that can later add:
- richer temporal slices and trend snapshots
- structured metrics export
- dashboard/API presentation
- policy-driven escalation routing
without changing the current read-only status contract.
