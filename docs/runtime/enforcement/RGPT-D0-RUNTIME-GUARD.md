# RGPT-D0 - Runtime Guard (Centralized Pre-Execution Enforcement)

## What it protects
Runtime Guard is the single pre-execution protection layer for critical runtime actions:
- cognitive mesh execution (`cognitive_mesh_execution`)
- CAT execution / dispatch (`cat_execution`)
- workflow/runtime side effects (`workflow_side_effect`)
- provider/tool invocations (`provider_tool_invocation`)
- data-sensitive operations (`data_sensitive_operation`)

## Evaluation flow
1. Build `RuntimeGuardContextInput` at the runtime entry point.
2. Normalize through `normalizeRuntimeGuardContext(...)`.
3. Evaluate via `RuntimeGuard.evaluate(...)`.
4. Enforce via `executeWithRuntimeGuard(...)` before side effects run.
5. Propagate decision markers (`runtime_guard:*`) to runtime outcomes.

Primary implementation:
- `src/core/cognitive-mesh/runtime/runtime-guard.ts`

Wired enforcement points:
- `MeshLiveRuntime` route dispatch and capability entry
- `CapabilityMeshOrchestrator` adaptor invocation gate
- `CourierService` CAT/messaging dispatch gate

Dispatch-specific control is handled by Dispatch Guard (`RGPT-D1`) and composed ahead of Runtime Guard on dispatch-capable paths.

## Decision outcomes
- `allow`: execute normally
- `deny`: fail closed
- `safe_mode_redirect`: do not execute protected action; redirect/reject path
- `require_audit`: execute but mark as audit-required
- `degraded_allow`: execute constrained/degraded path

## Reason code model
Decisions include typed reason codes (for audit/ledger ingestion later), for example:
- `policy_explicit_deny`
- `safe_mode_protected_action`
- `safe_mode_degraded_allow`
- `policy_forced_degraded_allow`
- `high_risk_requires_audit`
- `policy_requires_audit`
- `missing_correlation_context`
- `default_allow`

## Integration guidance for future runtime features
When adding any new runtime side-effecting action:
1. Create normalized guard context with action type, actor/source/target, requested operation, risk/sensitivity hints, and ids.
2. Evaluate and enforce using `executeWithRuntimeGuard(...)` before execution.
3. Ensure `deny` and `safe_mode_redirect` are not ignored.
4. Attach guard decision markers to result metadata for ledger compatibility.
