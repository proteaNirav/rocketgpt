# RGPT-D9 - Capability Execution Hardening

## Objective
Provide deterministic, validated, failure-safe capability invocation for the active cognitive-mesh runtime path.

Primary implementation:
- `src/core/cognitive-mesh/capabilities/orchestration/capability-execution-hardener.ts`
- `src/core/cognitive-mesh/capabilities/orchestration/capability-mesh-orchestrator.ts`

## Central contract
Capability execution now uses one normalized result contract via `CapabilityResultEnvelope` with typed hardening metadata:
- `status` (`success | degraded_success | denied | blocked | not_found | invalid | unavailable | failed`)
- `classification`:
  - `failureClass`
  - `reasonCodes`
  - `lifecycleStage`
  - `degraded`
- optional `diagnostics` payload for audit-friendly context.

## Lifecycle stages
- `capability_resolution`
- `capability_eligibility_checked`
- `input_normalized`
- `policy_gated`
- `execution_started`
- `result_normalized`
- `execution_completed`
- `execution_failed`

## Eligibility/readiness checks
Hardening enforces deterministic checks before execution:
- capability registered
- capability invokable (status gate)
- adaptor available
- optional requested operation support (`trace.requestedOperation`)
- source/context constraints (`sourceConstraints.allowedSourceTypes`)
- request envelope validity (required ids/purpose/timestamp)

## Deterministic failure classification
Structured failure classes include:
- `capability_not_found`
- `capability_unavailable`
- `capability_disabled`
- `invalid_request`
- `operation_not_supported`
- `context_requirements_missing`
- `guard_blocked`
- `adapter_dispatch_failure`
- `execution_exception`
- `execution_timeout`
- `degraded_execution`

## Governance/runtime relationship
Hardening composes with existing governance layers and does not replace them:
- Runtime Guard and Dispatch Guard still gate execution paths.
- Execution Ledger and canonical timeline capture hardened outcomes.
- Integrity verification and side-effect drift detection consume these deterministic outcomes.

## Runtime integration points
Primary wired surfaces:
- `CapabilityMeshOrchestrator.invoke` (hardened path)
- `MeshLiveRuntime.invokeCapabilityMesh` (consumes normalized statuses without bypass)
- Capability registry/adaptor resolution path (single centralized eligibility behavior)

## Notes for future capabilities
- Return `CapabilityResultEnvelope`; hardener will normalize identity/status/classification.
- Set `trace.requestedOperation` when operation-level enforcement is needed.
- Keep adaptor failures explicit; hardener will classify and normalize.
- Avoid throwing opaque errors for expected business outcomes; use structured statuses.

## Non-guarantees
- This pass does not implement full capability trust attestation.
- It does not replace future capability verification intelligence; it prepares deterministic inputs for it.
