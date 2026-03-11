# Mishti Documentor Mesh Architecture

## 1. Purpose

The Mishti Documentor Mesh (MDM) is the platform-wide cryptographic evidence and observability layer for Mishti AI. Its role is to ensure that meaningful platform activity is recorded in a tamper-evident, append-only, trace-linked form that can later be inspected, reconstructed, verified, and anchored.

The Documentor Mesh is not a generic logging service. It is the evidence substrate that supports platform accountability across governance, task execution, builder work, Brain orchestration, Librarian routing, police and enforcement observation, Consortium oversight, runtime execution, and OS-facing actions.

The Documentor Mesh exists to enforce the architectural principle that no meaningful action should occur without evidence.

## 2. Architectural Role in Mishti AI

The Documentor Mesh sits as a cross-cutting evidence layer across all major platform actors and subsystems. It is additive to:

- Governance Engine
- task system and directional handoff model
- builder operating model
- Librarian routing and indexing
- Brain decomposition and assignment
- Consortium supervision
- runtime enforcement and execution ledger direction

The Documentor Mesh does not replace these systems. Instead, it records their activity in a hash-linked form and provides a coherent query and reconstruction model across actors, tasks, traces, contracts, and timelines.

## 3. Why the Documentor Mesh Is Needed

Mishti AI already contains runtime ledger and governance-oriented evidence concepts, but those do not by themselves establish a platform-wide evidence mesh across all actors. A dedicated Documentor Mesh is needed because the platform requires:

- actor-level evidence recording rather than isolated subsystem logging
- consistent event chaining across human, agent, builder, and runtime actors
- periodic evidence submission and central anchoring via the Librarian
- trace reconstruction across directional task edges
- cryptographic integrity checks over event streams and evidence packets
- a shared model for heartbeat, liveness, approvals, handoffs, changes, and evidence submissions

Without a Documentor Mesh, evidence remains fragmented by subsystem and cannot be reliably reconstructed end to end.

## 4. Actor-Paired Documentor Model

Every major actor should have a paired Documentor capability that records local activity and periodically submits evidence bundles to the Librarian.

Representative actor and documentor pairings:

- Brain -> Brain Documentor
- Builder -> Builder Documentor
- Librarian -> Librarian Documentor
- Police -> Police Documentor
- Consortium -> Consortium Documentor
- PM -> PM Documentor
- Engineer -> Engineer Documentor
- Learner -> Learner Documentor
- Runtime -> Runtime Documentor
- CATS -> CAT Documentor
- OS -> OS Documentor

Each paired Documentor is responsible for:

- capturing meaningful local events
- maintaining a local sequence-aware event stream
- hash-linking events
- building evidence packets
- tracking submission checkpoints
- preserving local continuity during intermittent central connectivity

## 5. Relationship to the Governance Engine

The Governance Engine is the constitutional control-plane backend for governed state and approval lifecycles. The Documentor Mesh is the platform-wide evidence mesh that records what occurred around those governance actions.

The relationship should be:

- Governance Engine owns proposals, reviews, activations, snapshots, rollback, and audit-oriented domain truth
- Documentor Mesh records evidence of proposal handling, approval actions, activation commands, receipt of packages, operator interactions, and related trace context
- Governance Engine may reference Documentor artifacts and ledger anchors as evidence inputs
- Documentor Mesh must not become the source of normative governance state

In short, the Governance Engine governs; the Documentor Mesh evidences.

## 6. Relationship to Brain, Builder, Librarian, and Consortium

### 6.1 Brain

The Brain decomposes work, assigns tasks, reconciles outputs, and escalates blockers. The Brain Documentor records:

- decomposition events
- assignment decisions
- dependency resolutions
- conflict detection
- escalation actions
- completion recommendations

### 6.2 Builder System

Builders execute scoped delivery work. Builder Documentors record:

- task start and completion
- artifact creation
- patch or file-write summaries
- verification attempts
- assumptions raised
- handoff packages

### 6.3 Librarian

The Librarian is the intake and anchoring authority for periodic evidence submission. The Librarian receives packets, verifies integrity, records receipts, updates actor checkpoints, anchors packet hashes, and indexes references for later retrieval.

### 6.4 Consortium

The Consortium supervises delivery and governance fidelity. Consortium Documentors record:

- milestone reviews
- continue, hold, and reassign decisions
- exception approvals
- wave sign-off outcomes
- oversight rationale

## 7. Major Architectural Components

The Documentor Mesh should contain the following major components.

### 7.1 Actor Documentor Agents

Local recording agents embedded beside each actor. They produce append-only local event chains, heartbeat events, and evidence packets.

### 7.2 Documentor Event Protocol

The canonical event shape used across actor types. It standardizes event IDs, actor metadata, trace references, task references, hashes, timestamps, and payload integrity fields.

### 7.3 Evidence Packet Builder

Builds bounded bundles from local event streams. A packet groups one or more consecutive events, computes packet-level digests, carries actor and checkpoint metadata, and can include references to larger artifacts.

### 7.4 Librarian Evidence Intake

The intake service that receives evidence packets, verifies integrity, records receipts, rejects malformed packets, and updates indexing and checkpoint state.

### 7.5 Central Evidence Ledger

The append-only central record of accepted evidence packet anchors, intake results, checkpoint updates, and global chain references.

### 7.6 Artifact Storage Layer

Stores large payloads and referenced artifacts that should not be embedded directly into event or packet payloads. The ledger stores references and digests rather than large binary bodies.

### 7.7 Documentor Query Layer

Supports retrieval and reconstruction by actor, task, contract, trace, time range, event type, packet, receipt, or anchor lineage.

### 7.8 Heartbeat Monitor

Consumes heartbeat events as a specialized signal for liveness, continuity, and recency. Heartbeat is part of the mesh, but not the whole mesh.

### 7.9 Police Evidence Watcher

Consumes event and packet streams to detect suspicious continuity gaps, integrity failures, policy anomalies, missing evidence, and escalation-worthy activity.

## 8. Event Lifecycle

The typical event lifecycle should be:

1. an actor performs a meaningful action
2. the paired Actor Documentor emits a local `DocumentorEvent`
3. the event is assigned a sequence number and linked to the previous event hash
4. the event payload is hashed and optionally envelope-encrypted
5. the event is appended to the local actor event stream
6. a bounded set of consecutive events is grouped into an `EvidencePacket`
7. the packet is submitted to Librarian intake
8. Librarian verifies integrity, records a receipt, updates checkpoints, and writes a central anchor
9. query and oversight systems use receipts, anchors, and references for reconstruction

## 9. Evidence Flow

The Mesh should use a multi-layer evidence model.

### 9.1 Local Actor Event Streams

Each actor maintains a local append-only event chain with strict sequence continuity and previous-event hash linking.

### 9.2 Evidence Packets and Bundles

Local events are periodically packaged into bounded evidence packets for transport and submission. Packets carry:

- actor metadata
- event range metadata
- packet hash
- checkpoint references
- artifact references
- submission metadata

### 9.3 Librarian Receipts

For each accepted or rejected submission, the Librarian issues a receipt that records intake result, verification status, actor checkpoint updates, and receipt hash.

### 9.4 Central Ledger Anchors

Accepted packets are represented centrally by immutable ledger anchors that bind packet hashes, receipt hashes, actor checkpoints, and trace references into one append-only global evidence layer.

### 9.5 Artifact References

Large payloads, binary evidence, snapshots, build reports, or other heavy artifacts are stored separately and referenced by digest and storage location metadata.

## 10. Cryptographic Model

The cryptographic design should be explicit and simple enough to verify.

### 10.1 Event Hash Linking

Each event includes:

- `payloadHash`
- `previousEventHash`
- `eventHash`

The `eventHash` should be derived from canonical event fields, including the previous-event hash, so event order and content tampering become detectable.

### 10.2 Packet Hashing

Each packet includes:

- ordered event references
- first and last sequence values
- first and last event hashes
- `packetHash`

The `packetHash` should be derived from the canonical packet envelope plus the ordered event hashes.

### 10.3 Receipt and Anchor Hashing

Receipts and ledger anchors should each carry their own canonical hash values so intake and anchoring actions are themselves tamper-evident.

### 10.4 Optional Encryption Envelopes

Events or packet payload sections may be envelope-encrypted where local policy requires confidentiality. Integrity fields must still be verifiable even when payload bodies are encrypted.

### 10.5 Tamper Detection

Tamper detection should include:

- missing sequence detection
- previous-hash mismatch detection
- packet mismatch detection
- receipt mismatch detection
- checkpoint regression detection
- artifact digest mismatch detection

## 11. Heartbeat Model

Heartbeat is a specialized event type inside the Documentor Mesh rather than a separate system definition.

Heartbeat should capture:

- actor liveness
- session continuity
- current sequence watermark
- most recent accepted checkpoint
- health and recency metadata
- optional degraded-mode or isolation signals

Heartbeat is important because it enables continuity and freshness monitoring, but it must remain compatible with the broader event protocol rather than bypassing it.

## 12. Multi-Layer Evidence Storage Model

Recommended storage layers:

- local actor event store
- packet staging store
- Librarian receipt store
- central evidence ledger
- artifact reference store
- query projection store

Storage design principles:

- append-only semantics for event and ledger layers
- immutable receipts after issuance
- separate artifact persistence for large payloads
- projection lag is acceptable if anchor and receipt layers remain canonical

## 13. Query and Reconstruction Model

The Documentor Mesh must support querying by:

- actor
- task
- contract
- trace
- time range
- event type
- packet, receipt, and anchor chain

Reconstruction capabilities should include:

- actor activity timelines
- task and trace cross-actor reconstruction
- packet-to-receipt-to-anchor lineage
- heartbeat continuity analysis
- chain integrity verification over selected windows
- artifact lookup for referenced payloads

The query layer should optimize for inspection and replay without becoming the write-side source of truth.

## 14. Integration Points

The Documentor Mesh should integrate cleanly with the following systems.

### 14.1 Governance Engine

- governance proposal evidence references
- activation and rollback evidence
- audit enrichment through documentor receipts and anchors

### 14.2 Task System

- task IDs, contract IDs, and directional edge references embedded in events
- cross-edge trace reconstruction across Consortium -> Brain -> Learner -> Builder -> CATS -> OS

### 14.3 Builder Operating Model

- builder execution events
- Librarian builder routing evidence
- Brain work-package evidence
- Consortium wave review evidence

### 14.4 Runtime and Enforcement

- runtime heartbeat and execution continuity
- police or anomaly watcher evidence feeds
- linkage to existing runtime execution ledger where appropriate

### 14.5 Future Services

- anomaly detection
- integrity drift detection
- compliance review services
- evidence export and audit tools

## 15. Initial Bounded Contexts

The first implementation can start as a modular monolith or closely related package set with the following internal contexts:

- actor event recording
- packet assembly and submission
- Librarian intake and receipts
- central ledger anchoring
- artifact reference management
- query and reconstruction
- heartbeat monitoring
- police evidence watching

These contexts should remain extraction-ready for future service decomposition if evidence volume or isolation demands it.

## 16. Phased Implementation Strategy

### Phase 1. Contracts and SDK Foundation

- define canonical event, packet, receipt, anchor, and artifact contracts
- build actor-side SDK for local recording and packet assembly
- define canonical hashing rules

### Phase 2. Librarian Intake and Central Ledger

- implement intake validation
- implement receipt issuance
- implement central anchor writes
- implement actor checkpoint tracking

### Phase 3. Query and Reconstruction

- implement projections for actor, task, trace, and packet queries
- add integrity-verification views and continuity inspection

### Phase 4. Heartbeat and Watchers

- add heartbeat event support and liveness projections
- add Police Evidence Watcher and anomaly hooks

### Phase 5. Deep Platform Integration

- integrate with Governance Engine
- integrate with task system and builder operating model
- integrate with runtime and CATS evidence generation

## 17. Summary

The Mishti Documentor Mesh is the cryptographic evidence and observability layer for Mishti AI. It is a platform-wide, append-only, hash-linked recording mesh that pairs with each major actor, submits evidence through the Librarian, anchors accepted evidence centrally, and enables reconstruction by actor, task, trace, and timeline. It supports Governance Engine, Brain orchestration, Builder execution, Librarian indexing, Police monitoring, Consortium supervision, and future integrity or anomaly services without replacing the systems whose activity it records.
