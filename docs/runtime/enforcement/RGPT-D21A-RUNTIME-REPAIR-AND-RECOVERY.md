# RGPT-D21A - Runtime Repair and Recovery System

## Purpose
D21-A introduces a deterministic runtime repair and recovery layer between anomaly detection (D20 hybrid heartbeat/runtime health) and later cognitive stability systems.

The layer performs bounded autonomous recovery without bypassing runtime governance controls.

## Architecture
D21-A modules:
- `src/core/cognitive-mesh/runtime/repair/runtime-diagnosis-engine.ts`
- `src/core/cognitive-mesh/runtime/repair/runtime-repair-orchestrator.ts`
- `src/core/cognitive-mesh/runtime/repair/repair-agents/*`
- `src/core/cognitive-mesh/runtime/repair/recovery-validator.ts`
- `src/core/cognitive-mesh/runtime/repair/runtime-repair-state-repository.ts`
- `src/core/cognitive-mesh/runtime/repair/runtime-repair-event-emitter.ts`

Runtime surface:
- `.rocketgpt/runtime/repair-state.json`

CLI:
- `npm run cognitive:runtime:repair`

## Diagnosis Flow
1. Input anomaly/runtime health signal arrives.
2. Diagnosis engine classifies into supported anomaly classes:
- `stale_heartbeat`
- `queue_backlog`
- `memory_pressure`
- `capability_timeout`
- `capability_lock_stuck`
3. Deterministic mapping selects target type, severity, and recommended repair action.
4. Unsupported anomaly maps to `no_action` and is ledgered as skipped.

Diagnosis output includes:
- diagnosisId
- detectedAt
- source
- anomalyType
- severity
- repairable
- likelyTargetType
- likelyTargetId
- recommendedRepairAction
- reasonCodes
- metadata

## Repair Orchestration
The orchestrator enforces strict control order:
1. Repair enabled check (`RGPT_RUNTIME_REPAIR_ENABLED`)
2. Runtime Guard evaluation (no bypass)
3. Dispatch Guard evaluation (no bypass)
4. Per-target cooldown / max-attempt dedupe gate
5. Repair agent dispatch
6. Recovery validation
7. State + ledger emission

## Repair Agents (Bounded)
### Restart Agent
- Action: `restart_runtime_worker`
- Writes bounded restart signal state artifact.
- No external process kill and no unrelated component mutation.

### Queue Recovery Agent
- Action: `recover_queue`
- Rebuilds queue recovery health markers only.
- Does not drop tasks.

### Memory Cleanup Agent
- Action: `cleanup_memory`
- Clears transient runtime memory cache surface only.
- Does not alter durable historical memory.

### Capability Reset Agent
- Action: `reset_capability_state`
- Resets bounded capability runtime lock/timeout state.
- Does not alter capability registry definitions or governance metadata.

## Recovery Validator
After repair, deterministic validator emits structured validation:
- validationId
- startedAt
- completedAt
- targetType/targetId
- repairAction
- success
- checks[]
- reasonCodes[]
- metadata

Validation examples:
- stale heartbeat: restart marker freshness + non-stale post-check when available
- queue backlog: queue recovery marker freshness
- memory pressure: transient cache empty
- capability stuck/timeout: capability lock cleared

## Cooldown / Anti-spam
Per-target cooldown key:
- `${repairAction}:${targetType}:${targetId|global}`

Enforced controls:
- cooldown window (`RGPT_RUNTIME_REPAIR_COOLDOWN_MS`)
- bounded attempts in window (`RGPT_RUNTIME_REPAIR_MAX_ATTEMPTS_WITHIN_WINDOW`)
- attempt window (`RGPT_RUNTIME_REPAIR_ATTEMPT_WINDOW_MS`)

Repeated repairs during cooldown are skipped and ledgered as cooldown-active + skipped.

## Runtime Events
D21-A emits deterministic runtime repair events:
- `runtime_repair_diagnosed`
- `runtime_repair_attempted`
- `runtime_repair_succeeded`
- `runtime_repair_failed`
- `runtime_recovery_validation_started`
- `runtime_recovery_validation_succeeded`
- `runtime_recovery_validation_failed`
- `runtime_repair_skipped`
- `runtime_repair_cooldown_active`

Metadata includes:
- targetType
- targetId
- anomalyType
- repairAction
- reasonCodes
- outcome/ids for replay/debugging

## Safety Boundaries
D21-A explicitly does not:
- modify policy-gate semantics
- mutate historical ledger/timeline entries
- perform external network calls
- perform non-deterministic AI reasoning
- self-modify code or governance artifacts

## Deferred (Out of Scope)
- D21-B: root-cause learning/adaptation
- D21-C: containment/quarantine system
