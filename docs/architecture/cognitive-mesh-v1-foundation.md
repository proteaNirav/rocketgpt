# Cognitive Mesh V1 Foundation

## Purpose of Cognitive Mesh
The Cognitive Mesh is RocketGPT's governed intelligence fabric. It provides a controlled lifecycle for sensing input, applying principal guardrails, logging/indexing memory-safe artifacts, planning bounded reasoning, and routing deferred learning/unlearning work to background jobs.

This V1 foundation focuses on stable contracts and service boundaries so future iterations can add deeper intelligence without breaking existing flows.

## Lifecycle
The target lifecycle is:

`sense -> log -> index -> remember -> think -> decide -> execute -> learn -> unlearn`

Current scaffold mapping:

- `sense`: `sensory/input-ingestor.ts`, `sensory/signal-normalizer.ts`
- `log`: `logging/cognitive-log-service.ts`
- `index`: `indexing/index-orchestrator.ts`, `indexing/structural-indexer.ts`
- `remember`: `memory/*`
- `think`: `thinking/*`
- `decide`: `routing/mesh-router.ts` + principal guard decisions
- `execute`: represented by sync action shell in reasoning plan
- `learn`: `learning/learning-engine.ts`
- `unlearn`: `unlearning/archive-manager.ts`

## Principal Guardrails
Principal guardrails are required before memory/index/learning effects:

- `principal-intake-guard`: first gate for admission or quarantine
- `principal-memory-guard`: controls memory writes/recall exposure
- `principal-learning-guard`: controls promotion/retention/archive/reject
- `risk-scorer` + `trust-classifier`: baseline trust/risk shaping
- `quarantine-manager`: safe containment seam

These guardrails are intentionally deterministic and low-cost in V1.

## Sync vs Async Split
Request-path (`sync`) responsibilities:

- normalize and map input to `CognitiveEvent`
- intake guard evaluation
- lightweight logging and structural indexing
- guarded working-memory write
- minimal reasoning plan shell generation
- first response shell return with async job references

Background (`async`) responsibilities:

- deep indexing enrichment
- learning evaluation/promotion workflows
- archive/unlearning workflows
- quarantine review processing

This split protects first-response latency and keeps heavy work out of request path.

## Included in V1 Foundation
- Type-safe contracts for event, memory, index, and reasoning trace.
- Trust class, risk model, memory tier, processing mode, learning and recall dispositions.
- Interfaces for intake guard, memory guard, learning guard, log writer, index writer, memory store, memory retriever, reasoning planner, and archive manager.
- No-op/default implementations for all core services.
- Session-local memory defaults (no global intelligence writes).
- Router and job dispatcher seams to separate sync and async responsibilities.
- Unit + benchmark tests for request-path scaffolding.
- Initial SQL migration draft for Cognitive Mesh tables.

## V1-02 Live Activation Update (2026-03-06)
- `MeshRouter` now executes a deterministic minimal live pipeline (`normalize -> intake -> logging -> structural index -> working memory -> plan -> async dispatch`) when a request path explicitly opts in.
- Runtime wiring is guarded by `COGNITIVE_MESH_V1_02_LIVE_ENABLED` and currently attached only to `/api/orchestrator/run/status`.
- Live mode remains non-breaking: route responses are unchanged; mesh failures are isolated and non-blocking.
- Intake now emits explicit dispositions: `allow`, `restrict`, `quarantine`, `block`. Only `allow` proceeds to index/memory writes.
- Working memory is session-local, bounded, and TTL-based.
- Plan generation uses deterministic rules plus a lightweight in-process cache; no embeddings/vector retrieval are introduced.
- Async dispatch now queues concrete task kinds: `deepen-index`, `summarize-session`, `evaluate-learning-candidate`, `quarantine-review`.

## Intentionally Deferred
- Embeddings/vector database integration.
- Semantic memory extraction and retrieval ranking.
- Autonomous or provider-specific learning logic.
- External queue or storage provider integrations.
- Any change to existing governance gate behavior outside hook-based integration points.
