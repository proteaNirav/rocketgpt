# RGPT-D5 - Execution Ledger (Normalized Runtime/Dispatch Trace)

## What it records
Execution Ledger records protected runtime and dispatch execution behavior across active cognitive-mesh paths, including:
- runtime guard evaluations
- dispatch guard evaluations
- execution start/completion/failure/denial
- reroute/safe-mode/degraded/audit markers
- side-effect intent/completion markers for dispatch-capable paths

Primary implementation:
- `src/core/cognitive-mesh/runtime/execution-ledger.ts`

## Record model
Each append-only entry is normalized and typed:
- `timestamp`
- `category` (`runtime|dispatch|execution|side_effect`)
- `eventType`
- `action`
- `source`
- `target`
- `ids` (`requestId|executionId|correlationId|sessionId`)
- `mode` (`normal|reroute|degraded|safe_mode_redirect|audit_required|unknown`)
- `status`
- `guard` (runtime/dispatch decision summaries with typed reasons)
- `sideEffect` summary (`intent/completed/hints`)
- optional metadata

## Integration flow
Current active wiring:
- `MeshLiveRuntime`: execution lifecycle and runtime guard outcomes
- `CapabilityMeshOrchestrator`: runtime + dispatch guard outcomes, execution + side-effect markers
- `CognitiveMeshJobDispatcher`: dispatch guard outcomes and queue dispatch lifecycle
- `CourierService`: dispatch/runtime guard outcomes and courier side-effect markers

## Relationship with guards
- Dispatch Guard and Runtime Guard remain enforcement layers.
- Execution Ledger persists their outcomes and execution markers in normalized form.
- Denied, redirected, degraded, and failed paths are intentionally ledger-visible.

## Relationship with canonical timeline
- Execution Ledger is the single append path for runtime/dispatch/execution/side-effect events.
- Canonical Timeline events are derived centrally in `ExecutionLedger.append(...)` using:
  - `src/core/cognitive-mesh/runtime/timeline-canonicalizer.ts`
- This avoids per-module mapping drift across:
  - `MeshLiveRuntime`
  - `CapabilityMeshOrchestrator`
  - `CognitiveMeshJobDispatcher`
  - `CourierService`

Canonical outputs are available via:
- `ExecutionLedger.timelineSnapshot()`
- `<surface>.getCanonicalTimelineSnapshot()` on active runtime surfaces
- `ExecutionLedger.verifyIntegrity()` for ledger+timeline integrity checks
- `ExecutionLedger.verifyTimelineIntegrity()` for timeline-only verification

Durable JSONL path:
- env: `COGNITIVE_MESH_RUNTIME_TIMELINE_JSONL_PATH`
- default: `.rocketgpt/cognitive-mesh/runtime-timeline.jsonl`

## Storage
- In-memory append (for deterministic runtime access and tests).
- Optional JSONL append for durable trace:
  - env: `COGNITIVE_MESH_EXECUTION_LEDGER_JSONL_PATH`
  - default: `.rocketgpt/cognitive-mesh/execution-ledger.jsonl`

## Future integration pattern
For any new dispatch/execution module:
1. Reuse `ExecutionLedger.append(...)` (do not ad-hoc write).
2. Emit guard evaluation entries before executing side effects.
3. Emit lifecycle entries (`started` + terminal state).
4. Emit side-effect intent/completion where applicable.
