# RGPT-D20 - Hybrid Runtime Heartbeat System

## Purpose
Introduce a hybrid heartbeat model for operational runtime visibility without execution-ledger noise.

Phase-1 adds:
1. Internal heartbeat evaluation (self-pulse logic)
2. External monitor-safe heartbeat hook (CLI for cron/supervisor/watchdog calls)
3. Transition-aware ledger/timeline recording
4. Lightweight heartbeat state surface

No scheduler/daemon/loop is introduced in this batch.

## Hybrid Model
Heartbeat is split into two roles:
1. Internal layer
- Evaluates current runtime health locally
- Applies kill-switch contract before heartbeat is treated as allowed
- Runs deterministic subsystem checks
- Updates `.rocketgpt/runtime/heartbeat-state.json`

2. External layer
- `npm run cognitive:heartbeat:monitor`
- Safe for repeated scheduled invocations
- Returns structured JSON by default
- Reuses the same evaluator, but source is `monitor`

## Kill-Switch Compliance
D20 keeps D17 contract as mandatory gate stack:
- `RGPT_HEARTBEAT_ENABLED`
- runtime kill-switch file (`.rocketgpt/runtime/kill-switch.json`)
- existing heartbeat gate behavior (including rate-limit gate semantics)

When blocked by policy, heartbeat state is updated as `blocked`; no forced bypass occurs.

## Heartbeat States
D20 state model:
- `healthy`
- `degraded`
- `blocked`
- `stale`
- `failed`
- `unknown`

Phase-1 state derivation:
- `blocked`: kill-switch contract denies heartbeat
- `failed`: critical subsystem check failure
- `degraded`: non-critical subsystem check failure
- `stale`: prior observation gap exceeds stale threshold
- `healthy`: all checks pass and contract allows

## Subsystem Checks (Phase-1)
Current checks are deterministic and local:
- runtime guard available
- execution ledger path resolvable
- timeline path resolvable
- kill-switch state readable
- cognitive signal system available
- runtime status collector callable

## Heartbeat State Surface
Primary operational surface:
- `.rocketgpt/runtime/heartbeat-state.json`

Contains:
- runtime id
- last evaluated at
- last healthy at
- current/previous state
- transition detected
- heartbeat source (`internal | manual | monitor`)
- env/file enabled flags
- reason codes and notes
- subsystem check summary
- shouldAlert and ledgerEventWritten flags

## Transition-Aware Ledgering (No Spam)
D20 avoids writing a ledger row for every healthy pulse.

Ledger/timeline event is written only when:
- source is `manual`
- heartbeat state transitions (for example `blocked -> healthy`, `healthy -> degraded`)
- first observed anomaly (`blocked/degraded/stale/failed`) with no prior state

Repeated healthy monitor runs do not append repeated ledger rows.
Repeated blocked runs also avoid spam after first anomaly event.

## External Monitor Output Contract
Monitor CLI emits JSON summary:
- `runtimeId`
- `evaluatedAt`
- `heartbeatState`
- `previousState`
- `transitionDetected`
- `envEnabled`
- `fileEnabled`
- `ledgerEventWritten`
- `shouldAlert`
- `notes`

This structure is watchdog/scheduler friendly.

## Safety and Compatibility
- Preserves D17 manual heartbeat path (`manual-heartbeat-runner`) and ledger visibility
- No recurring background self-runner introduced
- Uses existing runtime ledger/timeline utilities
- Runtime artifacts remain local runtime surfaces (not Git-tracked)

## Future Path
Next phases can add:
- external watchdog-recovery orchestration
- persistent cross-process heartbeat rate gating
- automated recovery hooks with governance-gated action policies
- richer alert routing (Ops/webhook integrations)
