# Cognitive Mesh V1-02 Live Pipeline

## What Is Now Live
- A minimal deterministic Cognitive Mesh pipeline is active behind `COGNITIVE_MESH_V1_02_LIVE_ENABLED`.
- Current runtime wiring is intentionally limited to one request entry point:
  - `GET /api/orchestrator/run/status`
- This hook is observational/non-breaking: existing response payload and governance behavior are unchanged.
- As of v1-03, chat path wiring is introduced behind a separate flag:
  - `COGNITIVE_MESH_V1_03_CHAT_LIVE_ENABLED` on `POST /api/demo/chat`

## Request Lifecycle
`request hook -> normalize CognitiveEvent -> principal intake -> log -> structural index -> working memory write/read -> reasoning plan -> async dispatch queue`

Detailed flow:
1. Runtime hook creates an event with source type `workflow.trigger`.
2. `InputIngestor` normalizes input and assigns baseline trust/risk.
3. `PrincipalIntakeGuard` assigns disposition (`allow|restrict|quarantine|block`) using deterministic rules.
4. `MeshRouter` logs event + intake result and starts routing.
5. Structural index is created with tags:
   - `source_type`
   - `project_or_domain` (if metadata is present)
   - `session_id`
   - `request_id`
   - `route_type`
   - `trust_class`
6. Allowed events write to bounded TTL working memory and perform session-scoped recall.
7. Deterministic reasoning plan is generated (cached).
8. Follow-up tasks are queued for async processing.

## Sync vs Async Work Split
Sync (request path):
- normalization
- intake evaluation
- minimal logging
- structural indexing
- guarded working-memory write/read
- deterministic plan shell creation
- async enqueue only

Async (queued follow-up):
- `deepen-index`
- `summarize-session`
- `evaluate-learning-candidate`
- `quarantine-review` (when relevant)

Workers are safe no-op by default in this phase; queue entries are still observable.

## Trust/Risk Disposition Rules
- `block`:
  - explicit blocked trust class
  - high-risk content patterns (for example `<script`, `drop table`, `rm -rf`)
- `quarantine`:
  - explicit quarantined trust class
  - oversized payloads
- `restrict`:
  - `untrusted` or `evidence_only`
- `allow`:
  - all remaining low-risk cases

Rule behavior:
- Only `allow` enters active indexing and working memory.
- `restrict/quarantine/block` are logged and rejected from active memory/index paths.

## Persistence and Adapters
- Added repository seam with in-process adapter:
  - `cog_events`
  - `cog_logs`
  - `cog_indexes`
  - `cog_memory_items`
  - `cog_reasoning_sessions`
  - `cog_reasoning_steps`
- Optional durable JSONL append mode via `COGNITIVE_MESH_DURABLE_JSONL_PATH`.
- DB integration is intentionally deferred in v1-02 to avoid hot-path query risk.

## Metrics
Recorded in live pipeline:
- `mesh_event_received`
- `mesh_intake_allowed`
- `mesh_intake_restricted`
- `mesh_intake_blocked`
- `mesh_working_memory_write`
- `mesh_reasoning_plan_created`
- `mesh_async_dispatch_queued`
- `mesh_cache_hit`

Foundation metrics also tracked:
- `plan_latency_ms`
- `first_response_ms`
- `cache_hit`
- `deep_mode_rate`
- `timeout_rate`
- `fallback_rate`
- `improvise_rate`

## Performance Notes
- Feature flag default is off, so default runtime overhead is zero.
- In live mode, sync work is in-process and deterministic; no external network calls are added.
- Hot-path DB queries added by this phase: `0`.
- Expected request-path overhead budget: low single-digit milliseconds in normal conditions (benchmark guard maintained).

## Current Limitations
- No CATS runtime hook yet (normalization extension points exist).
- No embeddings/vector DB/semantic retrieval.
- No autonomous memory promotion.
- Async workers are queue placeholders.
- CAT registry summary cache is not yet wired to CATS runtime in this phase.

## Next Planned Phase (V1-03)
- Wire chat/user-text path with same deterministic guard-first flow.
- Wire CATS/task execution path to source type `cats.task_execution`.
- Add production queue adapter and worker processing.
- Add repository adapter for actual DB writes with bounded batching.
- Add CAT registry summary cache integration in the CATS serving path.
