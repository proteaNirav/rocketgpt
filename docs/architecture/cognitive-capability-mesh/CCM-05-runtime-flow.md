# CCM-05 Runtime Flow

## Batch-7 Runtime Integration
CCM integration in `mesh-live-runtime.ts` is minimal and additive:
- session brain initialization remains the entrypoint
- capability invocation is executed through `CapabilityMeshOrchestrator`
- output is recorded through standardized brain artifacts
- terminal state safety from Batch-6.1 is preserved

## Invocation Path
1. Request enters runtime.
2. Session brain is initialized/fetched and request context recorded.
3. Runtime creates capability request envelope.
4. Orchestrator resolves capability metadata and invokability.
5. Adaptor invocation runs.
6. Verification handoff runs when required.
7. Runtime records invocation/verdict in context + decision trail.
8. Commit behavior is constrained by direct-commit + verification rules.
9. Normal route execution continues and terminal state finalization occurs.

## Capability Selection
Current starter flow:
- chat path defaults to language capability
- workflow path defaults to retrieval capability

This is intentionally minimal and deterministic.

## Session Artifact Updates
During capability path:
- reasoning context:
  - capability invoked
  - verification result (when present)
- decision trail:
  - capability selection
  - capability outcome
  - verification verdict (when present)
- working memory:
  - capability payload commit only if guardrails allow

## Success / Failure Behavior
- Success: flow continues; route outcome finalization still drives terminal `completed`.
- Capability invocation failure:
  - `fallback` mode (default): record failure, continue normal route path.
  - `strict` mode: throw and allow runtime error path to finalize `failed`.

## Why This Is Sufficient For Batch-7
Batch-7 establishes the governed capability foundation and contracts while keeping runtime behavior stable and low-risk. Adaptive reasoning can build on these contracts later without rewriting core runtime flow.

