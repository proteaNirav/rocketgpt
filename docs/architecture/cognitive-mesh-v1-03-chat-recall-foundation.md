# Cognitive Mesh V1-03 Chat Recall Foundation

## What Is Now Live In Chat Path
- Cognitive Mesh is now wired to the primary conversational endpoint:
  - `POST /api/demo/chat`
- Wiring is feature-flagged by `COGNITIVE_MESH_V1_03_CHAT_LIVE_ENABLED`.
- Hook model is non-breaking and fail-safe:
  - mesh runs as best-effort observation/processing
  - chat response contract remains unchanged
  - mesh failures do not fail chat responses

## Bounded Persistence Model
- Repository seam persists the following entities:
  - `cog_events`
  - `cog_logs`
  - `cog_indexes`
  - `cog_memory_items`
  - `cog_reasoning_sessions`
  - `cog_reasoning_steps`
- Sync path is bounded to low write count:
  - synchronous priority writes: event + structural index
  - additional writes are deferred through async fire-and-forget adapter calls
- Default live adapter uses durable JSONL append at:
  - `.rocketgpt/cognitive-mesh/live-pipeline.jsonl`
- This is a hybrid persistence model; DB-first adapters are deferred.

## Recall Rules
- Recall is deterministic and bounded.
- Recall sources:
  - working memory by session/request
  - recent related events by source/route/session
  - recent memory items by session
- Recall bounds:
  - item count cap
  - total recalled text cap
- No semantic retrieval or embedding search is used.

## Trust-Filtered Memory Behavior
- Intake disposition gates upstream admission (`allow/restrict/quarantine/block`).
- Memory guard behavior:
  - `blocked`/`quarantined`/`untrusted`/`evidence_only` are denied for active memory writes
  - recall disposition (`allow/restrict/exclude`) controls recall inclusion
- Restricted/quarantined/blocked items are excluded from active recallable memory.

## Sync vs Async Responsibilities
Sync:
- event normalization
- intake evaluation
- bounded persistence (priority sync writes)
- structural indexing
- guarded working-memory write/read
- deterministic recall composition
- deterministic plan enrichment
- async enqueue

Async:
- session-summary candidate
- recall-compaction candidate
- learning-evaluation candidate
- quarantine-review candidate
- deferred persistence writes

## Metrics Added/Extended
- `mesh_chat_hook_invoked`
- `mesh_recall_attempted`
- `mesh_recall_hit`
- `mesh_recall_filtered`
- `mesh_repository_write`
- `mesh_repository_write_deferred`
- `mesh_reasoning_plan_enriched`

## Current Limitations
- Primary persistence adapter is durable JSONL/hybrid, not DB-native transactional storage.
- Recall remains lexical/structural only.
- CATS runtime path is not yet live-wired.
- Async workers remain placeholder/no-op by default.

## Deferred Items For V1-04
- DB-backed repository adapters with explicit batching and retry controls.
- CATS path hook wiring with same fail-safe guarantees.
- Recall compaction worker and retention policy enforcement.
- Operational dashboards for mesh metrics and deferred-write error tracking.
