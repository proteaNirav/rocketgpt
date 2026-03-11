# Mishti Documentor Mesh Repository Structure

## 1. Purpose

This document defines the recommended monorepo structure for implementing the Mishti Documentor Mesh as an additive evidence subsystem aligned with the repository's existing TypeScript and modular-backend direction.

The structure is intended to be explicit enough that builders can scaffold the subsystem with minimal ambiguity.

## 2. Recommended Top-Level Additions

Recommended additions:

- `apps/documentor-ledger`
- `packages/documentor-contracts`
- `packages/documentor-sdk`
- `packages/documentor-crypto`
- `packages/documentor-ledger-sdk`
- `docs/documentor`

This structure separates the deployable central evidence backend from shared contracts, actor-side emission SDKs, cryptographic helpers, and ledger access utilities.

## 3. Recommended Monorepo Layout

```text
apps/
  documentor-ledger/
    src/
      api/
      app/
      bootstrap/
      config/
      contracts/
      domain/
      infra/
      queries/
      workers/
    tests/
      unit/
      integration/
      contract/
      workflow/
packages/
  documentor-contracts/
  documentor-sdk/
  documentor-crypto/
  documentor-ledger-sdk/
docs/
  documentor/
```

## 4. `apps/documentor-ledger`

### Purpose

Hosts the central Librarian-intake and evidence-ledger backend for the Documentor Mesh. This app is responsible for packet intake, receipt issuance, central anchoring, artifact reference handling, query projections, and watcher surfaces.

### Folder Responsibilities

#### `src/api`

Responsibilities:

- packet intake endpoints
- receipt lookup endpoints
- anchor lookup endpoints
- query endpoints for actor, task, trace, and timeline retrieval
- watcher-facing endpoints for integrity and heartbeat inspection

Recommended initial groups:

- `intake/`
- `receipts/`
- `anchors/`
- `events/`
- `artifacts/`
- `queries/`
- `heartbeat/`
- `watchers/`
- `shared/`

#### `src/app`

Responsibilities:

- evidence submission orchestration
- receipt issuance use cases
- anchor writing coordination
- artifact registration orchestration
- integrity verification orchestration
- query service composition

Recommended initial groups:

- `commands/`
- `queries/`
- `services/`
- `ports/`
- `policies/`
- `orchestration/`

Representative use-case files:

- `submit-evidence-packet.ts`
- `verify-evidence-packet.ts`
- `issue-librarian-receipt.ts`
- `anchor-accepted-packet.ts`
- `register-artifact-reference.ts`
- `record-heartbeat-observation.ts`
- `query-trace-evidence.ts`

#### `src/domain`

Responsibilities:

- event, packet, receipt, anchor, artifact, checkpoint, and verification domain records
- invariants
- canonical hashing rules
- state transitions for submissions and receipts

Recommended initial groups:

- `events/`
- `packets/`
- `receipts/`
- `anchors/`
- `artifacts/`
- `actors/`
- `verification/`
- `heartbeat/`
- `shared/`

#### `src/infra`

Responsibilities:

- database adapters
- append-only ledger persistence
- artifact storage adapters
- queue and worker adapters
- hashing and encryption adapters
- projection persistence

Recommended initial groups:

- `db/`
- `repositories/`
- `ledger/`
- `artifacts/`
- `crypto/`
- `queues/`
- `projections/`
- `security/`

#### `src/queries`

Responsibilities:

- actor timeline projections
- trace and task reconstruction projections
- receipt and packet lookup projections
- anchor chain projections
- heartbeat recency views
- police and anomaly watcher views

Recommended initial groups:

- `actors/`
- `tasks/`
- `traces/`
- `receipts/`
- `anchors/`
- `heartbeat/`
- `watchers/`
- `artifacts/`

#### `src/contracts`

Responsibilities:

- local app-specific transport DTOs
- internal API versions
- intake and query request/response shapes not shared globally

Reusable contracts belong in `packages/documentor-contracts`.

#### `src/workers`

Responsibilities:

- asynchronous packet verification
- anchor persistence
- projection refresh
- heartbeat recency scans
- police or anomaly watcher jobs
- artifact integrity rechecks

Recommended initial groups:

- `verification-worker.ts`
- `anchor-worker.ts`
- `projection-worker.ts`
- `heartbeat-worker.ts`
- `watcher-worker.ts`
- `artifact-verification-worker.ts`

#### `src/bootstrap`

Responsibilities:

- app startup
- route registration
- worker registration
- dependency composition
- adapter construction

Recommended initial files:

- `create-app.ts`
- `register-routes.ts`
- `register-workers.ts`
- `build-container.ts`

#### `src/config`

Responsibilities:

- environment parsing
- feature flags
- storage settings
- queue settings
- crypto policy settings
- projection settings

Recommended initial files:

- `env.ts`
- `feature-flags.ts`
- `storage.ts`
- `queues.ts`
- `crypto.ts`
- `projections.ts`

### Test Structure

#### `tests/unit`

For canonical hashing, invariant checks, packet assembly rules, and checkpoint logic.

#### `tests/integration`

For repository adapters, packet intake flow, receipt generation, and projection refresh.

#### `tests/contract`

For event format compatibility, packet schema compatibility, receipt schema compatibility, and SDK/backend contract alignment.

#### `tests/workflow`

For end-to-end flows such as:

- actor event emission -> packet submission -> receipt -> anchor
- heartbeat emission -> recency projection -> watcher observation
- packet rejection -> retry -> acceptance
- artifact reference registration -> lookup -> integrity recheck

## 5. `packages/documentor-contracts`

### Purpose

Provides canonical schemas and type contracts for the Documentor Mesh.

### Responsibilities

- canonical event formats
- packet formats
- receipt formats
- anchor formats
- artifact reference contracts
- heartbeat contracts
- integrity verification result contracts

### Recommended Initial Structure

```text
packages/documentor-contracts/
  src/
    events/
    packets/
    receipts/
    anchors/
    artifacts/
    heartbeat/
    verification/
    shared/
  tests/
    unit/
    contract/
```

## 6. `packages/documentor-sdk`

### Purpose

Provides the actor-side SDK used by Brain, Builders, Librarian, Runtime, CATS, OS, PMs, Engineers, and other actors to emit events and build evidence packets.

### Responsibilities

- local actor event emission
- local sequence management helpers
- packet assembly helpers
- submission client abstractions
- checkpoint persistence interfaces
- actor-specific documentor wrappers

### Recommended Initial Structure

```text
packages/documentor-sdk/
  src/
    actor/
    emit/
    packets/
    checkpoints/
    submit/
    wrappers/
      brain/
      builder/
      librarian/
      police/
      consortium/
      learner/
      runtime/
      cats/
      os/
    shared/
  tests/
    unit/
    integration/
```

## 7. `packages/documentor-crypto`

### Purpose

Provides hashing, signing, encryption-envelope, and integrity utility functions for the Mesh.

### Responsibilities

- canonical hash builders
- previous-event hash linking
- packet hash generation
- receipt and anchor hash generation
- optional envelope encryption helpers
- integrity verification helpers

### Recommended Initial Structure

```text
packages/documentor-crypto/
  src/
    canonical/
    hashes/
    envelopes/
    verify/
    shared/
  tests/
    unit/
    benchmark/
```

Include a small benchmark suite for hash generation and verification hot paths.

## 8. `packages/documentor-ledger-sdk`

### Purpose

Provides typed helper utilities for anchoring evidence and querying ledger references.

### Responsibilities

- anchor write helpers
- receipt query helpers
- packet and anchor lookup helpers
- cross-reference helpers for task and trace reconstruction
- export helpers for evidence windows

### Recommended Initial Structure

```text
packages/documentor-ledger-sdk/
  src/
    anchors/
    receipts/
    packets/
    queries/
    exports/
    shared/
  tests/
    unit/
    integration/
```

## 9. `docs/documentor`

### Purpose

Holds implementation-oriented architecture documentation for the Documentor Mesh.

### Initial Files

- `MISHTI-DOCUMENTOR-MESH-ARCHITECTURE.md`
- `MISHTI-DOCUMENTOR-MESH-DOMAIN-MODEL.md`
- `MISHTI-DOCUMENTOR-MESH-REPOSITORY-STRUCTURE.md`

Possible future additions:

- event protocol reference
- hashing and canonicalization reference
- packet transport reference
- receipt and anchor query reference
- rollout and migration plan

## 10. Recommended Database Table Groupings

The implementation should remain storage-technology-neutral, but the first schema should group data by evidence responsibility.

### Actor Event State

- `documentor_actor_state`
- `documentor_event_chain_checkpoints`
- `documentor_local_submission_offsets`

### Packets and Submissions

- `documentor_evidence_packets`
- `documentor_packet_events`
- `documentor_evidence_submissions`

### Receipts and Anchors

- `documentor_librarian_receipts`
- `documentor_ledger_anchors`
- `documentor_anchor_chain_state`

### Artifacts

- `documentor_artifact_references`
- `documentor_artifact_integrity_checks`

### Verification and Watchers

- `documentor_integrity_results`
- `documentor_heartbeat_observations`
- `documentor_police_watch_events`

### Query Projections

- `documentor_rm_actor_timelines`
- `documentor_rm_trace_reconstruction`
- `documentor_rm_task_reconstruction`
- `documentor_rm_receipt_history`
- `documentor_rm_anchor_history`
- `documentor_rm_heartbeat_status`

## 11. Suggested Implementation Order

### Step 1. Contracts

- define canonical event, packet, receipt, anchor, artifact, and heartbeat contracts

### Step 2. Crypto Helpers

- implement canonical hashing and integrity verification utilities

### Step 3. Actor SDK

- implement local event emission, sequence management, and packet assembly

### Step 4. Central Ledger App

- implement intake, receipt issuance, and anchor persistence

### Step 5. Query Layer

- implement actor, task, trace, packet, and receipt projections

### Step 6. Heartbeat and Watchers

- add heartbeat monitor projections and police/anomaly watcher jobs

### Step 7. Platform Integration

- integrate with Governance Engine, task system, builder system, Brain, Librarian, Consortium, Runtime, CATS, and OS

## 12. Phased Extraction Guidance

The first implementation may be embedded near or beside Governance Engine infrastructure if that reduces startup cost, but the boundaries should remain extraction-ready.

Recommended extraction guidance:

- keep event contracts and crypto helpers in standalone packages from the start
- keep actor-side SDK separate from the central ledger app
- keep the central receipt and anchor backend independently deployable
- keep query projections and watcher workloads behind app-layer ports

This allows an initial shared deployment with Governance Engine while preserving a later path to an independent `documentor-ledger` service if scale or isolation requires it.

## 13. Testing Expectations

The Documentor Mesh is a hot-path evidence layer and must ship with tests from the start.

Required coverage direction:

- unit tests for canonical hashing and chain continuity
- integration tests for intake and receipt flows
- contract tests for SDK and backend schema alignment
- workflow tests for packet-to-anchor lifecycles
- a small benchmark for event and packet hashing paths

## 14. Summary

This repository structure gives the Documentor Mesh a clear implementation path that matches the repository's current monorepo direction. `apps/documentor-ledger` owns the central evidence backend, while `packages/documentor-*` own canonical contracts, actor-side emission helpers, cryptographic utilities, and ledger query helpers. The result is an extraction-ready structure for a platform-wide cryptographic evidence and observability layer rather than a narrow logging subsystem.
