# Cognitive Mesh Batch-10: Dual-Mode Memory + CAT Memory Injection Foundation

Last Updated: 2026-03-07

## Purpose

Batch-10 adds a governed memory-and-experience foundation above Batch-9 EPF.
It introduces reusable memory capture, explicit recall, conservative implicit resurfacing, filtered CAT memory packet injection, and CAT feedback synthesis into reusable memory.

This batch is foundational only and does not add adaptive reasoning, autonomous behavior, or ML.

## Scope

Implemented:
- dual-mode memory system:
  - explicit recall engine (request-time searchable recall)
  - implicit resurfacing engine (thresholded advisory resurfacing)
- conversation-aware memory capture
- layered memory model contracts
- bounded in-memory memory repository
- memory ranking and experience reuse ranking scaffolds
- filtered memory packet generation and injection hooks
- CAT feedback contract and synthesis into decision-linked memory
- optional runtime integration hooks in `mesh-live-runtime`

Deferred:
- persistent storage runtime path (SQL schema included as design artifact only)
- autonomous adaptation loops
- embeddings/vector retrieval
- cross-session self-improvement policies

## Layered Memory Model

Supported memory layers:
- `raw_conversation`
- `episodic`
- `conceptual`
- `decision_linked`
- `unresolved`
- `cross_domain_bridge`

Core contracts include:
- `ConversationSession`
- `ConversationMessage`
- `MemoryItem`
- `MemoryTag`
- `MemoryLink`
- `MemoryPacket`
- `RecallEvent`
- `CatFeedback`
- `UnresolvedItem`
- `CrossDomainBridge`

## Governance and Safety Controls

- Memory injection is bounded (`limit <= 5`) and filtered by ranking + relevance floor.
- Injection has entitlement hook (`allowInjection`), default deny path available.
- Implicit resurfacing is advisory only and threshold-based.
- Recall/resurface events are stored for auditability.
- Runtime hook failures remain non-disruptive to routing/capability semantics.

Batch-9 semantics are preserved:
- trusted-commit gating unchanged
- outcome preservation unchanged
- governance issue normalization unchanged
- harmful-pattern tagging unchanged

## Runtime Integration Points

`MeshLiveRuntime` supports optional `cognitiveMemoryService`:

1. Request entry:
- create/update conversation session
- capture runtime input as conversation-derived memory

2. Capability invocation:
- generate minimum-sufficient `MemoryPacket`
- add packet metadata (`memoryPacketId`, item count) to capability trace only

3. Post-outcome capture:
- synthesize CAT feedback from finalized outcome facts
- convert meaningful feedback to decision-linked memory

## Ranking and Reuse (MVP)

Memory ranking signals:
- importance
- novelty
- confidence
- reuse
- relevance
- recency
- cross-domain usefulness

Experience reuse scoring scaffold:
- computes reuse boost and caution penalty from prior experiences
- yields deterministic caution level (`none|low|medium|high`)
- feeds synthesized memory scoring for later packet selection reuse

## Persistence Design (Minimal)

A minimal schema sketch is provided:
- `src/core/cognitive-mesh/memory/cognitive-memory.schema.sql`

Current runtime implementation remains in-memory and bounded.

## TODO (Deferred Advanced Behavior)

- TODO(batch-12+): persistent repository implementation using schema sketch
- TODO(batch-12+): governed cross-session retrieval policies
- TODO(batch-12+): richer unresolved/bridge linking workflows
- TODO(batch-12+): controlled experience-to-memory promotion policies
