# CEL Runtime Integration and Governance Boundaries

## Runtime Integration Point
CEL is invoked in `MeshLiveRuntime` after capability + route outcome resolution:
- success path captures after route result is recorded
- failure path captures from exception path
- capture execution is isolated so CEL failures never break runtime routing

## Session Brain Artifacts
Runtime writes deterministic capture diagnostics after outcome resolution:
- working memory:
  - `runtime.last_experience_capture_status` (`captured` | `skipped` | `failed`)
  - `runtime.last_experience_capture_error` (nullable diagnostic marker)

When capture is meaningful, runtime also writes:
- working memory:
  - `runtime.last_experience_id`
  - `runtime.last_experience_outcome`
- reasoning context:
  - `runtime.experience_captured`
- decision trail:
  - `runtime.experience_capture`

## Storage and Retrieval
Initial storage:
- bounded in-memory repository (`InMemoryExperienceRepository`)

Retrieval hooks (read-only):
- recent experiences by session
- experiences by capability
- experiences by outcome
- experiences by circumstantial signals

These hooks are for observability and future extension only; they do not alter runtime decisions in Batch-8.

## Benchmark Scope Clarification
The Batch-8 capture benchmark is a bounded in-memory sanity guard only. It is not an end-to-end system SLA guarantee.

## Governance Boundaries
Batch-8 governance rules:
- capture only meaningful execution outcomes
- avoid heartbeat/no-op/trivial event capture
- keep behavior deterministic and explainable
- no autonomous adaptation from experience data

## Deferred to Future Batches
- long-term persistence of experiences
- adaptive capability selection using experience data
- pattern mining and learning loops
- ML/embedding/vector retrieval
