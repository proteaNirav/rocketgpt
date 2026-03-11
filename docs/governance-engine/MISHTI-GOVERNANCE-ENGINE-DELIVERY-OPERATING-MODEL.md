# Mishti AI Governance Engine Delivery Operating Model

## 1. Scope

This document defines:

- the exact task contract for a governed Rust internal builder agent
- the 25 builder categories required for Governance Engine backend delivery
- the 3 engineering roles and 2 PM roles required to coordinate work
- the Librarian role and responsibilities
- the Brain routing model for delegating work to builders
- the Consortium model for managing and monitoring task completion

This operating model is designed for the Mishti AI Governance Engine backend scaffold and first implementation wave.

## 2. Primary Delivery Goal

Deliver the Governance Engine backend as an additive, architecture-conformant subsystem aligned to the approved documents:

- `docs/governance-engine/MISHTI-GOVERNANCE-ENGINE-ARCHITECTURE.md`
- `docs/governance-engine/MISHTI-GOVERNANCE-ENGINE-DOMAIN-MODEL.md`
- `docs/governance-engine/MISHTI-GOVERNANCE-ENGINE-REPOSITORY-STRUCTURE.md`

The initial implementation wave must cover:

- repository scaffold
- package scaffold
- API skeleton
- application service skeleton
- domain aggregate skeleton
- infra and repository skeleton
- query and read-model skeleton
- bootstrap and config skeleton
- migration placeholders
- contract and event skeletons
- test scaffolds

No uncontrolled business logic invention is permitted in the first wave.

## 3. Rust Agent Task Contract

### Contract ID

`governance-engine.scaffold.internal-builder.v1`

### Contract Type

Internal governed builder task.

### Assigned Execution Class

Rust Internal Builder Agent.

### Primary Objective

Create the Governance Engine backend scaffold and starter files in the approved monorepo structure without modifying protected architecture direction.

### Inputs

Mandatory inputs:

- governance engine architecture document
- governance engine domain model document
- governance engine repository structure document
- existing task contracts
- governance adapter interfaces
- cross-edge trace helper interfaces
- existing monorepo package conventions
- existing docs indexes and README conventions

### Allowed Output Paths

- `apps/governance-engine/**`
- `packages/governance-contracts/**`
- `packages/governance-core/**`
- `packages/governance-validation/**`
- `packages/governance-policy-compiler/**`
- `packages/governance-ledger-sdk/**`
- `packages/governance-trace-sdk/**`
- approved docs index references only if required

### Disallowed Output Paths

- existing runtime core unless explicitly referenced for contract alignment only
- existing task-system behavior files
- existing builder governance semantics
- unrelated product apps
- deployment or secrets infrastructure
- auth provider replacement
- package manager root behavior changes unless explicitly required for workspace registration

### Output Requirements

The Rust agent must produce:

- directory scaffold
- starter file set
- exports and index files
- placeholder interfaces and types
- controller shells
- service shells
- aggregate shells
- repository interfaces and stub implementations where appropriate
- migration placeholders
- starter tests
- summary report
- file manifest
- unresolved assumptions list
- compile and test status report
- trace and ledger metadata payload

### Mandatory Constraints

- additive only
- architecture documents are source of truth
- do not rename approved concepts
- do not replace existing task-system direction
- do not invent hidden domain states
- do not implement destructive migrations
- do not delete existing files unless explicitly authorized
- do not bypass trace metadata
- do not suppress unresolved assumptions
- do not silently infer policy semantics beyond documented scope

### Verification Requirements

The Rust agent must attempt and report:

- workspace registration validation
- type-check status where possible
- import and export consistency
- path correctness
- file ownership compliance
- naming convention compliance
- starter test discoverability

### Required Metadata

- `taskId`
- `contractId`
- `traceId`
- `actorId`
- `actorType=internal_builder`
- `builderClass=rust`
- `scope=governance-engine-scaffold`
- `sourceDocs[]`
- `allowedPaths[]`
- `startedAt`
- `endedAt`
- `status`
- `manifestHash`

### Success Criteria

The task is successful when:

- all required scaffold folders exist
- all required starter file groups exist
- paths match approved architecture
- no protected paths are changed outside scope
- compile and type status is reported honestly
- assumptions are surfaced explicitly
- file manifest is complete

### Failure Conditions

The task fails if:

- protected paths are modified
- architecture terms are replaced without approval
- undocumented deep logic is added in the first wave
- task metadata is missing
- traceability artifacts are absent
- output is structurally incomplete

## 4. Builder Fleet: 25 Categories

These are builder categories, not necessarily 25 separate technologies. They define the specialization map required for Governance Engine delivery.

### Foundation and Repo Builders

1. **Workspace Scaffold Builder**
   Creates folder structure, package registration, and index shells.
2. **Monorepo Package Builder**
   Sets up `packages/governance-*` and shared exports.
3. **Bootstrap and Config Builder**
   Creates config, bootstrap, env, feature flag, and startup shells.
4. **Dependency Boundary Builder**
   Enforces allowed package imports and internal dependency layering.
5. **Docs Linkage Builder**
   Ensures architecture docs and code scaffold references remain aligned.

### API and Application Builders

6. **API Surface Builder**
   Creates controllers, routes, DTOs, schemas, and middleware shells.
7. **Application Workflow Builder**
   Creates command, handler, and service orchestrator structure.
8. **Query and Projection Builder**
   Creates read-model and query layer structure for console-facing views.
9. **Contract and Event Builder**
   Creates API contracts, integration events, and downstream package schemas.
10. **Validation Pipeline Builder**
   Creates structural, constitutional, semantic, operational, impact, and readiness validator scaffolds.

### Domain Builders

11. **Constitution Domain Builder**
   Creates constitution aggregate, versioning, and status rule shells.
12. **Principles Domain Builder**
   Creates principle aggregates, weights, and lineage skeletons.
13. **Policies Domain Builder**
   Creates policy bundle, rule, scope, and enforcement skeletons.
14. **Proposals Domain Builder**
   Creates proposal lifecycle, reviews, state flow, and risk model shells.
15. **Activation Domain Builder**
   Creates activation aggregate, activation plan, and transition shells.
16. **Snapshots Domain Builder**
   Creates snapshot aggregate, restore plan, and compatibility shells.
17. **Emergency Control Builder**
   Creates emergency control aggregates and freeze or safe-mode structures.
18. **Audit and Lineage Builder**
   Creates ledger entry, lineage link, actor metadata, and trace linkage structures.

### Infrastructure Builders

19. **Persistence and Repository Builder**
   Creates repository interfaces, DB models, and migration placeholders.
20. **Storage and Artifact Builder**
   Creates snapshot storage, compiled package storage, and signed export abstractions.
21. **Cache and Distribution Builder**
   Creates active-package cache, emergency status cache, and publication shells.
22. **Trace and Ledger Integration Builder**
   Wires trace SDK and ledger SDK usage surfaces.

### Downstream Governance Builders

23. **Builder Guardrail Package Builder**
   Creates machine-readable packages for builder constraints.
24. **Runtime and CATS Policy Package Builder**
   Creates runtime, CATS, and OS package schema and emitter shells.
25. **Learner and Brain Constraint Builder**
   Creates governance package schemas for Brain and Learner consumers.

## 5. Engineering Roles

### Engineer 1: Lead Platform Engineer

Owns:

- workspace scaffold
- package structure
- bootstrap and config
- workspace integration
- repository correctness

### Engineer 2: Lead Domain Engineer

Owns:

- domain aggregates
- lifecycle semantics
- proposal, activation, snapshot, and emergency model fidelity
- consistency with domain model documents

### Engineer 3: Lead Infrastructure Engineer

Owns:

- repositories
- migrations
- storage, cache, and ledger adapters
- distribution plumbing
- test scaffold coverage

## 6. PM Roles

### PM 1: Delivery PM

Owns:

- work breakdown
- builder sequencing
- milestone tracking
- completion criteria
- dependency management

### PM 2: Governance PM

Owns:

- architecture conformance
- policy term consistency
- approval gates
- exception handling
- readiness to move from scaffold to implementation wave 2

## 7. Librarian Role

### Role Name

Build Librarian.

### Responsibilities

- register every builder category
- maintain builder capabilities and trust class
- track versions, fingerprints, and approved scopes
- map tasks to builders based on specialization
- prevent duplicate work assignment
- maintain artifact index and generated-file manifest catalog
- store evidence references and handoff notes
- mark promotions and demotions between builder trust classes

### Core Librarian Records

Each builder should have:

- builder ID
- builder category
- trust class
- allowed scopes
- blocked scopes
- output quality score
- completion history
- error history
- review score
- promotion eligibility

## 8. Brain Task Routing Model

The Brain should not code directly. It should decompose, assign, reconcile, and verify.

### Brain Responsibilities

- ingest approved task contract
- decompose work into builder-ready subtasks
- assign subtasks through the Librarian capability map
- enforce dependencies
- merge outputs conceptually
- identify conflicts and gaps
- escalate blockers to PM and Consortium
- emit progress state and completion pack

### Brain Master Task

`brain.governance-engine.delivery.v1`

### Brain Input

- master objective
- architecture docs
- task contract
- builder roster
- PM roles
- consortium oversight rules

### Brain Output

- decomposition tree
- builder assignment map
- dependency graph
- risk register
- progress rollup
- final completion recommendation

## 9. Brain Decomposition for This Work

The Brain should split the work into the following work packages.

### Wave A: Foundation

- workspace scaffold
- package creation
- bootstrap and config shells
- docs linkage

### Wave B: Contracts and Core

- contracts package
- core domain primitives
- trace SDK
- ledger SDK

### Wave C: Domain Modules

- constitution
- principles
- policies
- proposals
- activation
- snapshots
- emergency
- audit

### Wave D: API and Application

- controllers
- routes
- DTOs
- schemas
- handlers
- orchestrator services

### Wave E: Infra and Queries

- repositories
- migrations
- storage and cache adapters
- query and read-model shells
- distribution shells

### Wave F: Test and Verification

- starter tests
- package export checks
- manifest generation
- compile and type review

## 10. Consortium Design

The Consortium is the governing oversight body that monitors and manages task completion.

### Consortium Purpose

- supervise Brain delegation
- monitor builder execution health
- review milestone completion
- detect task drift or architecture drift
- authorize escalation or reassignment
- protect timeline and governance fidelity

### Consortium Core Members

1. **Consortium Chair**
   Final oversight and tie-break authority.
2. **Architecture Commissioner**
   Validates architecture conformance.
3. **Delivery Commissioner**
   Validates milestone and sequencing discipline.
4. **Quality Commissioner**
   Validates completeness, test readiness, and output clarity.
5. **Governance Commissioner**
   Validates terminology, lifecycle, audit, and policy fidelity.
6. **Risk Commissioner**
   Tracks unresolved assumptions, blockers, and task drift.
7. **Librarian Liaison**
   Ensures builder routing and artifact indexing are consistent.

### Consortium Inputs

- Brain status reports
- PM reports
- builder manifests
- verification summaries
- risk register
- exceptions and conflict notes

### Consortium Outputs

- continue, hold, or reassign decisions
- milestone approval
- escalation directives
- exception approvals
- completion sign-off recommendation

## 11. Task Assignment Matrix

### Foundation

- Workspace Scaffold Builder
- Monorepo Package Builder
- Bootstrap and Config Builder
- Docs Linkage Builder

Owner: Lead Platform Engineer.

### Contracts and Core

- Contract and Event Builder
- Validation Pipeline Builder
- Trace and Ledger Integration Builder
- Learner and Brain Constraint Builder

Owner: Lead Domain Engineer and Lead Infrastructure Engineer.

### Domain Work

- Constitution Domain Builder
- Principles Domain Builder
- Policies Domain Builder
- Proposals Domain Builder
- Activation Domain Builder
- Snapshots Domain Builder
- Emergency Control Builder
- Audit and Lineage Builder

Owner: Lead Domain Engineer.

### API and App Work

- API Surface Builder
- Application Workflow Builder
- Query and Projection Builder

Owner: Lead Platform Engineer.

### Infrastructure Work

- Persistence and Repository Builder
- Storage and Artifact Builder
- Cache and Distribution Builder
- Builder Guardrail Package Builder
- Runtime and CATS Policy Package Builder

Owner: Lead Infrastructure Engineer.

### Cross-Cutting

- Dependency Boundary Builder
- Validation Pipeline Builder
- Trace and Ledger Integration Builder

Owner: all three engineers with Governance PM supervision.

## 12. Execution Order

1. Librarian registers all builders.
2. PMs create the milestone board.
3. Brain receives the master task.
4. Brain decomposes work packages.
5. Brain requests builder assignments from the Librarian.
6. Builders execute within allowed scopes.
7. Engineers review category outputs.
8. Brain consolidates status.
9. Consortium reviews wave completion.
10. Consortium either approves the next wave or orders correction.

## 13. Deliverable Definition for Wave 1

Wave 1 is complete when:

- Governance Engine scaffold exists
- all governance packages exist
- starter domain modules exist
- starter API, application, infra, and query layers exist
- starter tests exist
- contracts and event shells exist
- migration placeholders exist
- manifest and status packs exist
- no out-of-scope modifications occurred

## 14. Suggested Master Task Message to Brain

### Task to Brain

You are assigned `brain.governance-engine.delivery.v1`.

Your mission is to complete the first implementation wave of the Mishti AI Governance Engine backend using the approved architecture documents and the governed internal builder system.

You must:

- decompose the Governance Engine scaffold into builder-specific work packages
- obtain appropriate builders from the Librarian based on specialization and trust class
- assign work in dependency-aware order
- keep all builders within allowed scopes and approved paths
- ensure all outputs remain architecture-conformant and additive
- collect manifests, assumptions, and verification reports from every builder
- consolidate completion status by wave
- escalate conflicts, drift, or blockers to the PMs and Consortium

You must not:

- bypass the Librarian
- assign overlapping scopes without coordination
- approve undocumented domain invention
- allow protected-path modifications
- mark completion without manifest and verification evidence

Primary delivery target:

Create the Governance Engine scaffold and starter files for:

- `apps/governance-engine`
- `packages/governance-contracts`
- `packages/governance-core`
- `packages/governance-validation`
- `packages/governance-policy-compiler`
- `packages/governance-ledger-sdk`
- `packages/governance-trace-sdk`

Success condition:

All Wave 1 scaffold deliverables are produced, indexed, and verified for structural completeness.

## 15. Suggested Consortium Standing Order

The Consortium is hereby established to govern execution of `brain.governance-engine.delivery.v1`.

Standing order:

- monitor progress by wave
- prevent architecture drift
- ensure builder specialization is respected
- require explicit treatment of unresolved assumptions
- require evidence-backed progress updates
- hold any wave that lacks traceability, manifest integrity, or scope discipline
- approve transition from scaffold wave to implementation wave only after structural completeness is confirmed

## 16. Final Recommendation

For this delivery, use the Rust agent as one of the internal builders, not as the whole system. The Brain should orchestrate, the Librarian should route, the Consortium should supervise, PMs should sequence, engineers should review, and builders should execute in scoped slices.

This gives the program speed with governance rather than speed with chaos.
