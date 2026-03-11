# Mishti AI Governance Engine Architecture

## 1. Purpose

The Mishti AI Governance Engine is the authoritative constitutional control-plane backend for shared governance state across the platform. It is not a thin admin API and it is not another step in the task chain. Its role is to hold normative truth for constitutional state, principle definitions, governed policy bundles, proposal-driven change control, activation history, rollback anchors, emergency controls, and immutable audit lineage.

The Governance Engine exists to power the Governance Console UI and to provide a single governed backend path through which constitutional and legislative changes are proposed, validated, approved, activated, audited, and distributed to downstream runtime and builder-facing enforcement layers.

## 2. Architectural Role in Mishti AI

The Governance Engine sits orthogonally to the platform task chain as a cross-cutting authority:

- Consortium -> Brain
- PM -> Learner
- Learner -> Builder
- Builder -> CATS
- CATS -> OS

Those directional task edges remain execution and delegation paths. The Governance Engine does not replace them. Instead, it governs the contracts, guardrails, and activation state under which those edges operate. It provides the control-plane decisions that other layers must consume.

In practical terms, the Governance Engine is responsible for:

- constitutional state
- principle registry
- policy registry
- proposal workflow
- review and approval lifecycle
- validation and simulation
- activation and rollback
- snapshot management
- emergency controls
- immutable audit and lineage
- downstream governance package distribution

## 3. Relationship with the Governance Console

The Governance Console is the primary operator-facing surface for the Governance Engine. The backend must map directly to the already completed UI surfaces:

- Constitution Overview -> constitution read models, current state, active baseline, lock status
- Core Principles -> principle registry, protected principles, supersession and lock metadata
- Legislative Policy Editor -> policy bundle authoring, draft changes, rule composition, scoped bindings
- Proposal Workflow -> proposal creation, review routing, approvals, rejection, return-for-revision
- Diff and Impact Viewer -> structural diff service, dependency impact analysis, downstream package preview
- Emergency Controls -> freeze, safe mode, emergency rollback, scoped enforcement escalation
- Audit and Lineage -> immutable ledger views, proposal-to-activation chain, trace correlation
- Snapshots and Rollback -> snapshot manifests, restore candidates, activation rollback lineage

The Governance Console should remain a consumer of backend contracts rather than embedding governance logic in the UI.

## 4. Relationship with Existing Task-System Infrastructure

The repository already contains task contracts, an in-memory task registry, a task-governance adapter, and cross-edge trace helpers. The Governance Engine should integrate with those assets without becoming dependent on task orchestration for its own correctness.

Integration expectations:

- proposals may reference task IDs, contract IDs, edge IDs, and review work artifacts
- validation and activation events may emit task-linked evidence references
- audit lineage should carry cross-edge trace IDs when a governance change affects a task edge
- downstream package publication records should reference affected directional edges when applicable
- governance actions that require human review can be represented as task artifacts through the existing adapter, but governance state remains authoritative inside the Governance Engine domain

The task system remains the work coordination model. The Governance Engine remains the normative decision model.

## 5. Bounded Contexts

The Governance Engine should be implemented as a modular monolith with explicit internal bounded contexts:

### 5.1 Constitution

Owns the canonical constitutional document, constitutional versions, activation status, lock boundaries, and baseline references.

### 5.2 Principles

Owns protected principles, principle metadata, amendability rules, precedence rules, and principle-to-policy compatibility constraints.

### 5.3 Policies

Owns policy bundles, policy rules, scope bindings, downstream target mappings, effective windows, and supersession rules.

### 5.4 Proposals

Owns proposal creation, staged changes, review assignment, review outcomes, approval decisions, and state progression.

### 5.5 Validation

Owns structural validation, semantic validation, compatibility checks, impact analysis, simulation hooks, and policy compilation prechecks.

### 5.6 Activation

Owns activation planning, activation execution, activation results, activation locks, and rollback eligibility.

### 5.7 Snapshots and Rollback

Owns trusted restore points, snapshot manifests, restoration plans, rollback commands, and state reconstruction.

### 5.8 Audit and Lineage

Owns the immutable ledger, event envelopes, proposal-to-activation lineage, actor attribution, and trace correlation.

### 5.9 Emergency Control

Owns bounded emergency powers such as amendment freeze, scoped freeze, safe mode, forced rollback, and emergency activation routing.

### 5.10 Distribution and Integration

Owns downstream governance package compilation, target publication records, version manifests, and integration contracts for Brain, Learner, Builder, CATS, OS, and runtime enforcement layers.

## 6. Layered Backend Architecture

The Governance Engine should follow a five-layer structure.

### 6.1 API Layer

Responsibilities:

- external transport endpoints
- request authentication and authorization handoff
- command and query mapping
- idempotency handling for mutating actions
- streaming or progressive response shells where needed

Representative endpoint groups:

- `/constitution`
- `/principles`
- `/policies`
- `/proposals`
- `/validation`
- `/activations`
- `/snapshots`
- `/audit`
- `/emergency-controls`
- `/distribution`

### 6.2 Application Layer

Responsibilities:

- use-case orchestration
- transaction boundaries
- policy enforcement across aggregates
- interaction with validation, compilation, snapshot, and distribution services
- audit event emission

Representative application services:

- `SubmitProposal`
- `ReviewProposal`
- `ApproveProposal`
- `ValidateProposal`
- `ActivateProposal`
- `CreateSnapshot`
- `RollbackActivation`
- `EngageEmergencyControl`
- `PublishGovernancePackage`

### 6.3 Domain Layer

Responsibilities:

- aggregates and entities
- domain invariants
- value objects
- domain policies
- lifecycle/state machines
- domain events

This layer must contain the authoritative rules for proposal status transitions, activation preconditions, rollback safety, and principle immutability boundaries.

### 6.4 Infrastructure Layer

Responsibilities:

- persistence adapters
- outbox/event publication
- ledger storage adapters
- blob or manifest storage
- trace correlation adapters
- cache adapters
- worker dispatch hooks

The initial implementation should stay infrastructure-neutral but keep clean interfaces for future extraction.

### 6.5 Query and Read-Model Layer

Responsibilities:

- Governance Console projections
- diff views
- impact read models
- timeline and ledger views
- dashboard summaries
- package publication history

This layer should optimize reads for the UI without weakening domain write rules.

## 7. Why Modular Monolith First

A modular monolith is the correct initial deployment style because governance state changes require strong consistency across multiple bounded contexts:

- proposal approval depends on validation output, review state, and policy/principle constraints
- activation depends on approved proposal state, snapshot creation, compilation, and audit recording
- emergency actions must atomically produce control-state changes and ledger records
- rollback depends on historical activation lineage and snapshot integrity

Starting as a modular monolith reduces premature distributed consistency problems while preserving future extraction boundaries. The natural future service seams are:

- validation and simulation
- policy compiler and package distribution
- audit ledger storage and export
- query/read-model projections

## 8. Core Concepts

### 8.1 Proposal-Driven Governance

Important governance changes must flow through:

- proposal
- validation
- review
- approval
- activation
- audit
- snapshot and rollback support

Emergency paths may bypass normal timing or quorum expectations, but they must still generate full ledger records, explicit rationale, actor attribution, and rollback eligibility where possible.

### 8.2 Validation

Validation is a first-class backend concern, not a UI helper. It should support:

- schema and shape validation
- principle conflict detection
- policy scope conflict detection
- contract and edge reference validation
- downstream target compatibility checks
- impact preview generation
- compilation readiness checks
- emergency-path constraint checks

Longer-running simulation or package preview work should be offloaded to workers, but the API must still return a response shell quickly and expose progress or cached results.

### 8.3 Activation

Activation is the controlled state transition that changes platform-governing truth. Activation should:

- only operate on approved proposals
- create or reference a trusted pre-activation snapshot
- record the effective constitution and policy set
- trigger downstream package compilation and publication workflows
- emit immutable activation ledger entries

### 8.4 Audit and Lineage

The Governance Engine must strongly preserve:

- immutable audit ledger
- trace correlation
- proposal-to-activation lineage
- snapshot and rollback lineage
- downstream package publication history
- task, contract, and directional edge references where relevant

Every important state change should produce a canonical domain event and a ledger entry. Ledger and query projections may diverge physically, but not semantically.

### 8.5 Emergency Control

Emergency controls are bounded containment mechanisms, not unrestricted override powers. Supported concepts should include:

- amendment freeze
- activation freeze
- scoped target freeze
- safe mode activation
- emergency rollback
- emergency policy patch activation with mandatory follow-up review

Emergency control state must be explicit, time-bounded where possible, and visible in read models and downstream packages.

## 9. Downstream Integration Model

The Governance Engine should distribute compiled governance packages rather than expecting each downstream system to reinterpret the raw domain model independently.

Target package families should include:

- runtime governance packages
- builder guardrail packages
- learner constraint packages
- CATS policy packages
- OS policy packages
- Brain and consortium oversight packages where needed

Distribution flow:

1. resolve active constitution, principles, and effective policies
2. compile target-specific package manifests
3. stamp package versions with source activation and snapshot lineage
4. publish package metadata and artifacts to downstream consumers
5. record publication history and delivery status in the ledger and query models

Downstream consumers should treat these packages as authoritative inputs tied to a known activation lineage.

## 10. Data and Consistency Model

Recommended consistency boundaries:

- strong consistency for write-side governance state transitions inside the monolith
- append-only or immutable semantics for audit ledger records
- projection lag permitted for read models if ledger and domain state remain canonical
- idempotent activation and publication commands

Recommended persistence groupings:

- canonical state store for aggregates
- immutable ledger store
- snapshot manifest store
- package artifact manifest store
- projection store for read models

## 11. Security and Operating Constraints

The Governance Engine should enforce:

- clear separation of proposer, reviewer, approver, and emergency-controller roles
- explicit authority checks for protected principle changes
- immutable or append-only ledger semantics for audit records
- no local-only constitutional truth outside the engine
- no hidden policy activation path outside proposal or emergency workflows

The engine should integrate through hooks into existing governance and task infrastructure rather than replacing current governance gates.

## 12. Recommended Implementation Phases

### Phase 1. Domain Foundation

- define write-side contracts and identifiers
- implement Constitution, Principle, PolicyBundle, Proposal, Activation, Snapshot, EmergencyControl, and AuditLedgerEntry aggregates/entities
- establish domain events and invariants

### Phase 2. Proposal and Validation Workflow

- implement proposal submission, review, approval, rejection, and revision flow
- add validation pipeline and impact preview contracts
- project Governance Console read models for proposal workflow and diffs

### Phase 3. Activation, Snapshot, and Rollback

- implement snapshot creation and trusted restore points
- implement activation transaction flow
- implement rollback planning and execution paths

### Phase 4. Audit, Trace, and Emergency Control

- add immutable ledger adapter
- correlate proposal, activation, snapshot, package, and task references
- implement emergency freeze and emergency rollback commands

### Phase 5. Distribution and Compilation

- compile downstream governance packages
- publish package manifests and delivery records
- integrate with Brain, Learner, Builder, CATS, OS, and runtime enforcement consumers

### Phase 6. Extraction Readiness

- separate heavy validation, compilation, and projection workloads behind internal interfaces
- prepare bounded contexts for future service decomposition if scale or autonomy requires it

## 13. Implementation Notes for This Monorepo

The repository already trends toward a TypeScript monorepo with `apps/`, `packages/`, and architecture-specific `docs/`. The Governance Engine should therefore be introduced as an additive backend subsystem, likely centered on:

- `apps/governance-engine` for the deployable control-plane backend
- `packages/governance-*` for contracts, core domain logic, validation, compilation, trace, and ledger support
- `docs/governance-engine` for implementation architecture and coding guidance

This approach preserves existing constitutional, governance, and task-system work while creating a concrete implementation path for the Governance Console backend.

## 14. Summary

The Mishti AI Governance Engine is the shared constitutional control-plane backend for the platform. It governs constitutional state, principles, policies, proposal workflows, validation, activation, rollback, emergency controls, immutable audit lineage, and downstream governance package distribution. It should start as a modular monolith with explicit bounded contexts and clean extraction seams, integrate orthogonally with the task chain, and provide the authoritative backend required by the completed Governance Console UI and future enforcement layers.
