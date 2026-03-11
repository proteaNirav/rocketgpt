# Mishti AI Governance Engine Repository Structure

## 1. Purpose

This document defines the recommended monorepo structure for implementing the Mishti AI Governance Engine as a modular monolith with explicit extraction boundaries. It is written to be concrete enough that a builder can scaffold the backend with minimal ambiguity.

The structure assumes the existing TypeScript-oriented monorepo layout with `apps/`, `packages/`, and `docs/`.

## 2. Top-Level Additions

Recommended additions:

- `apps/governance-engine`
- `packages/governance-contracts`
- `packages/governance-core`
- `packages/governance-validation`
- `packages/governance-policy-compiler`
- `packages/governance-ledger-sdk`
- `packages/governance-trace-sdk`
- `docs/governance-engine`

This package split keeps the deployable backend separate from reusable contracts, domain logic, validation, compilation, and lineage support.

## 3. Recommended Monorepo Layout

```text
apps/
  governance-engine/
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
  governance-contracts/
  governance-core/
  governance-validation/
  governance-policy-compiler/
  governance-ledger-sdk/
  governance-trace-sdk/
docs/
  governance-engine/
```

## 4. `apps/governance-engine`

### Purpose

Holds the deployable Governance Engine backend application. This is the composition root for API transport, application use cases, persistence adapters, background workers, and Governance Console read models.

### Folder Responsibilities

#### `src/api`

Responsibilities:

- route or transport adapters
- HTTP or RPC handlers
- auth context mapping
- command and query DTO mapping
- idempotency and request metadata wiring

Recommended initial file groups:

- `constitution/`
- `principles/`
- `policies/`
- `proposals/`
- `validation/`
- `activations/`
- `snapshots/`
- `audit/`
- `emergency-controls/`
- `distribution/`
- `shared/`

#### `src/app`

Responsibilities:

- application services and use cases
- transaction orchestration
- domain service coordination
- policy enforcement across aggregates
- event and outbox dispatch

Recommended initial file groups:

- `commands/`
- `queries/`
- `services/`
- `orchestration/`
- `ports/`
- `policies/`

Representative use-case files:

- `submit-proposal.ts`
- `review-proposal.ts`
- `approve-proposal.ts`
- `validate-proposal.ts`
- `activate-proposal.ts`
- `create-snapshot.ts`
- `rollback-activation.ts`
- `engage-emergency-control.ts`
- `publish-governance-package.ts`

#### `src/domain`

Responsibilities:

- aggregate roots
- entities
- value objects
- domain services
- domain events
- invariants and state machines

Recommended initial file groups:

- `constitution/`
- `principles/`
- `policies/`
- `proposals/`
- `activations/`
- `snapshots/`
- `audit/`
- `emergency/`
- `distribution/`
- `shared/`

Representative contents:

- aggregate classes
- status enums
- ID value objects
- invariant helpers
- diff/value comparison logic

#### `src/infra`

Responsibilities:

- repositories
- database adapters
- ledger adapters
- trace adapters
- cache adapters
- package artifact persistence
- outbox/event bus adapters

Recommended initial file groups:

- `db/`
- `repositories/`
- `ledger/`
- `trace/`
- `cache/`
- `artifacts/`
- `messaging/`
- `security/`

#### `src/queries`

Responsibilities:

- Governance Console read models
- diff and impact read paths
- audit timelines
- snapshot listings
- package publication history

Recommended initial file groups:

- `constitution-overview/`
- `principle-registry/`
- `policy-editor/`
- `proposal-workflow/`
- `diff-impact/`
- `audit-lineage/`
- `snapshots/`
- `emergency-controls/`
- `distribution-history/`

#### `src/contracts`

Responsibilities:

- local application-specific transport contracts
- endpoint DTOs not shared as package-level contracts
- versioned API command/query shapes

This folder should stay thin. Reusable domain and integration contracts belong in `packages/governance-contracts`.

#### `src/workers`

Responsibilities:

- longer-running validation
- impact analysis
- package compilation
- package publication retries
- read-model projection refresh

This folder matters because work expected to exceed fast-response thresholds should be moved off the synchronous request path.

Recommended initial file groups:

- `validation-worker.ts`
- `impact-worker.ts`
- `compiler-worker.ts`
- `distribution-worker.ts`
- `projection-worker.ts`

#### `src/bootstrap`

Responsibilities:

- application startup
- dependency injection wiring
- route registration
- repository and adapter construction
- worker bootstrapping

Recommended initial file groups:

- `create-app.ts`
- `register-routes.ts`
- `register-workers.ts`
- `build-container.ts`

#### `src/config`

Responsibilities:

- runtime configuration parsing
- feature flags
- storage and queue settings
- cache settings
- governance engine environment policy

Recommended initial file groups:

- `env.ts`
- `feature-flags.ts`
- `storage.ts`
- `queues.ts`
- `cache.ts`

### Test Layout

#### `tests/unit`

For aggregate invariants, value objects, domain policies, and pure validation rules.

#### `tests/integration`

For repository adapters, transaction boundaries, projection materialization, and worker integration.

#### `tests/contract`

For API contract stability, package manifest shape, and downstream integration contract compatibility.

#### `tests/workflow`

For end-to-end governance flows such as:

- proposal -> validation -> review -> approval -> activation
- activation -> snapshot -> rollback
- emergency freeze -> emergency rollback -> release
- activation -> package compilation -> publication history

## 5. `packages/governance-contracts`

### Purpose

Owns reusable TypeScript contracts shared by the Governance Engine app, the Governance Console, downstream consumers, and tests.

### Responsibilities

- command and query DTOs
- domain event envelope contracts
- ledger payload contracts
- package manifest contracts
- API response contracts
- validation report contracts

### Recommended Initial Structure

```text
packages/governance-contracts/
  src/
    api/
    commands/
    queries/
    events/
    ledger/
    packages/
    validation/
    shared/
  tests/
    unit/
    contract/
```

## 6. `packages/governance-core`

### Purpose

Owns reusable pure domain logic that should remain framework-neutral and usable by the app, tests, and future extracted services.

### Responsibilities

- aggregate logic
- state machines
- invariants
- value objects
- domain services
- diff helpers

### Recommended Initial Structure

```text
packages/governance-core/
  src/
    constitution/
    principles/
    policies/
    proposals/
    activations/
    snapshots/
    emergency/
    audit/
    distribution/
    shared/
  tests/
    unit/
    benchmark/
```

Include a small benchmark suite for hot paths such as proposal validation setup, diff generation primitives, and package manifest assembly.

## 7. `packages/governance-validation`

### Purpose

Owns validation and impact-analysis logic that can grow independently from the core write-side model.

### Responsibilities

- schema validation
- semantic validation
- principle conflict checks
- policy scope conflict checks
- downstream compatibility checks
- impact assessment
- simulation scaffolding

### Recommended Initial Structure

```text
packages/governance-validation/
  src/
    schema/
    semantic/
    impact/
    simulation/
    reports/
    shared/
  tests/
    unit/
    integration/
    benchmark/
```

Benchmark initial hot paths that may be triggered frequently by the Governance Console, especially diff-and-impact preview generation.

## 8. `packages/governance-policy-compiler`

### Purpose

Owns translation from active constitutional and policy state into downstream compiled governance packages.

### Responsibilities

- package target profiles
- bundle normalization
- target-specific compilation
- manifest generation
- package digest generation

### Recommended Initial Structure

```text
packages/governance-policy-compiler/
  src/
    compiler/
    targets/
      runtime/
      brain/
      learner/
      builder/
      cats/
      os/
    manifests/
    digests/
    shared/
  tests/
    unit/
    contract/
    benchmark/
```

## 9. `packages/governance-ledger-sdk`

### Purpose

Provides typed helpers and adapters for emitting, reading, and correlating Governance Engine audit events.

### Responsibilities

- ledger event envelope builders
- append-only write helpers
- query helpers
- reason code typing
- export helpers

### Recommended Initial Structure

```text
packages/governance-ledger-sdk/
  src/
    envelopes/
    writers/
    readers/
    reason-codes/
    exports/
    shared/
  tests/
    unit/
    integration/
```

## 10. `packages/governance-trace-sdk`

### Purpose

Provides typed trace and lineage helpers for proposal, activation, snapshot, package, task, and directional-edge correlation.

### Responsibilities

- trace ID helpers
- task and edge reference types
- correlation builders
- lineage graph helpers
- projection helpers for UI timelines

### Recommended Initial Structure

```text
packages/governance-trace-sdk/
  src/
    ids/
    task-refs/
    edge-refs/
    correlation/
    lineage/
    shared/
  tests/
    unit/
```

This package should explicitly align with the repository's existing task-governance adapter and cross-edge trace helper direction rather than inventing a parallel trace model.

## 11. `docs/governance-engine`

### Purpose

Holds implementation-oriented architecture and backend design documents for the Governance Engine.

### Initial Files

- `MISHTI-GOVERNANCE-ENGINE-ARCHITECTURE.md`
- `MISHTI-GOVERNANCE-ENGINE-DOMAIN-MODEL.md`
- `MISHTI-GOVERNANCE-ENGINE-REPOSITORY-STRUCTURE.md`

Additional future documents may include:

- API surface specification
- lifecycle transition reference
- ledger schema reference
- package manifest reference
- rollout and migration plan

## 12. Suggested Database Table Groupings

The implementation should stay ORM-neutral, but the first schema should group tables by bounded context.

Recommended table groupings:

### Constitution and Principles

- `governance_constitutions`
- `governance_principles`
- `governance_principle_versions`

### Policies

- `governance_policy_bundles`
- `governance_policy_rules`
- `governance_policy_bindings`

### Proposals and Reviews

- `governance_proposals`
- `governance_proposal_changes`
- `governance_proposal_reviews`
- `governance_validation_reports`

### Activations and Snapshots

- `governance_activations`
- `governance_activation_targets`
- `governance_snapshots`
- `governance_rollbacks`

### Emergency Controls

- `governance_emergency_controls`
- `governance_emergency_events`

### Distribution and Integration

- `governance_distribution_packages`
- `governance_distribution_publications`
- `governance_distribution_targets`

### Audit and Trace

- `governance_audit_ledger`
- `governance_trace_links`
- `governance_task_refs`
- `governance_edge_refs`

### Read Models

- `governance_rm_constitution_overview`
- `governance_rm_proposal_workflow`
- `governance_rm_diff_impact`
- `governance_rm_audit_timeline`
- `governance_rm_snapshot_history`
- `governance_rm_distribution_history`

## 13. Recommended Initial File Groups

Scaffold these first inside `apps/governance-engine`:

- domain IDs and enums
- aggregate roots for Proposal, Activation, Snapshot, and EmergencyControl
- repository interfaces
- application services for submit, review, approve, validate, activate, snapshot, rollback
- audit event writer port
- trace correlation port
- Governance Console read-model query handlers

Scaffold these first inside packages:

- contract types for proposals, activations, snapshots, audit events, and packages
- validation report contracts
- target package manifest contracts
- trace reference types for task and directional-edge lineage

## 14. Suggested Implementation Order

### Step 1. Contracts and Domain IDs

- establish shared IDs, status enums, DTOs, event envelopes, and package manifest contracts

### Step 2. Core Aggregates

- implement Proposal, Activation, Snapshot, EmergencyControl, PolicyBundle, and Principle domain logic

### Step 3. Write-Side Application Services

- implement submit, review, approve, validate, activate, snapshot, rollback, and emergency-control use cases

### Step 4. Persistence and Ledger

- implement repositories, transaction boundaries, immutable ledger append path, and trace correlation storage

### Step 5. Query Read Models

- project Governance Console views for constitution overview, workflow, diff impact, audit timeline, and snapshot history

### Step 6. Validation and Impact Workers

- move heavier validation, simulation, and diff-impact work to workers and cache repeatable outputs where appropriate

### Step 7. Package Compilation and Distribution

- compile runtime, learner, builder, CATS, and OS governance packages and record publication history

### Step 8. Hardening

- add contract tests, workflow tests, benchmarks, metrics, and operational safeguards

## 15. Testing Expectations

The Governance Engine touches control-plane hot paths and must ship with tests from the start.

Required coverage direction:

- unit tests for aggregate invariants and status transitions
- integration tests for repository and ledger behavior
- contract tests for Governance Console and downstream package interfaces
- workflow tests for proposal-driven governance lifecycles
- a small benchmark for diff-impact preview, validation pipeline setup, or package manifest compilation hot paths

## 16. Metrics and Operational Hooks

The repository's control-plane constraints require explicit metrics and fast response behavior. The Governance Engine implementation should include instrumentation for:

- `plan_latency_ms`
- `first_response_ms`
- `cache_hit`
- `deep_mode_rate`
- `timeout_rate`
- `fallback_rate`
- `improvise_rate`

Recommended mapping:

- proposal validation planning and impact staging -> `plan_latency_ms`
- initial API shell response -> `first_response_ms`
- cached validation, diff, or read-model hits -> `cache_hit`
- expensive validation or simulation mode usage -> `deep_mode_rate`
- worker or request timeout paths -> `timeout_rate`
- degraded validation or publication fallbacks -> `fallback_rate`
- session-local adaptive behavior if later added -> `improvise_rate`

## 17. Summary

This repository structure keeps the Governance Engine implementation cohesive, extraction-ready, and aligned with the existing Mishti AI monorepo. `apps/governance-engine` should own deployment and composition, while `packages/governance-*` own reusable contracts, domain logic, validation, compilation, ledger support, and trace support. The result is a concrete scaffold path for a modular monolith governance backend that cleanly powers the Governance Console and integrates with the existing task-system infrastructure.
