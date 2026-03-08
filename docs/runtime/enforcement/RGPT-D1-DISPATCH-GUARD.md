# RGPT-D1 - Dispatch Guard (Centralized Dispatch Control)

## Purpose
Dispatch Guard controls dispatch-specific decisions before work is routed/sent/invoked downstream.

Dispatch Guard governs:
- whether dispatch to a target is permitted
- whether target trust/health allows dispatch
- whether route/mode/path is allowed
- whether reroute/degraded/safe dispatch must be enforced
- whether audit marking is required before dispatch

## Scope in code
Primary implementation:
- `src/core/cognitive-mesh/runtime/dispatch-guard.ts`

Wired active dispatch surfaces:
- `CognitiveMeshJobDispatcher` async job dispatch
- `CapabilityMeshOrchestrator` adaptor dispatch path
- `CourierService` parcel dispatch path

## Decision outcomes
- `allow`
- `deny`
- `reroute`
- `safe_mode_redirect`
- `degraded_allow`
- `require_audit`

## Enforcement semantics
- `deny`: fail closed, no dispatch
- `reroute`: dispatch to approved fallback target/path if configured
- `safe_mode_redirect`: avoid unsafe dispatch and return protected result
- `degraded_allow`: constrain dispatch mode/path
- `require_audit`: preserve audit-required marker before dispatch executes

## Dispatch vs Runtime Guard
- Dispatch Guard: controls routing/sending/invocation path decisions.
- Runtime Guard: broader runtime action governance (execution-phase protections).
- Current composition in wired paths: Dispatch Guard -> Runtime Guard -> execution.

## Ledger readiness
Dispatch decisions include typed reason codes and normalized identifiers for later ledger ingestion without changing execution interfaces.

Runtime persistence is implemented via Execution Ledger (`RGPT-D5`).
