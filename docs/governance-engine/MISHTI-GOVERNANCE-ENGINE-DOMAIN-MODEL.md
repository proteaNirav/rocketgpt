# Mishti AI Governance Engine Domain Model

## 1. Purpose

This document defines the implementation-oriented domain model for the Mishti AI Governance Engine. It is intended to be directly usable as a coding reference for aggregate boundaries, entity semantics, state transitions, invariants, and lineage expectations.

The model assumes the Governance Engine is the authoritative write-side system for constitutional state and governed policy lifecycle.

## 2. Aggregate and Entity Overview

Primary write-side concepts:

- Constitution
- Principle
- PolicyBundle
- PolicyRule
- Proposal
- ProposalReview
- Activation
- Snapshot
- AuditLedgerEntry
- EmergencyControl

Supporting concepts:

- DistributionPackage
- ValidationReport
- ImpactAssessment
- DownstreamTargetBinding
- TraceReference
- TaskEdgeReference

## 3. Constitution

### Purpose

Represents the canonical constitutional state for the platform at a governed point in time. The Constitution aggregate anchors the active constitutional baseline against which principles, policies, proposals, activations, and snapshots are interpreted.

### Key Fields

- `constitutionId`
- `version`
- `title`
- `status`
- `baselineType`
- `activeActivationId`
- `trustedSnapshotId`
- `lockState`
- `summary`
- `sourceManifest`
- `createdAt`
- `createdBy`
- `supersededByConstitutionId`

### Lifecycle and State Notes

Suggested statuses:

- `draft`
- `approved`
- `active`
- `superseded`
- `retired`

Only one Constitution version should be active for a governance scope at a time.

### Important Invariants

- there must be exactly one active Constitution per shared governance scope
- an active Constitution must be tied to a successful Activation
- protected constitutional sections cannot be mutated outside authorized proposal paths
- superseded constitutions remain readable and auditable

### Lineage and Audit Expectations

- creation, approval, activation, supersession, and retirement must all produce ledger entries
- Constitution records should retain links to the proposal and activation that made them effective

## 4. Principle

### Purpose

Represents a core constitutional principle or protected normative rule that constrains policy design, activation eligibility, and downstream package compilation.

### Key Fields

- `principleId`
- `constitutionId`
- `code`
- `name`
- `statement`
- `rationale`
- `protectionLevel`
- `amendmentPolicy`
- `precedence`
- `status`
- `effectiveFromActivationId`
- `supersededByPrincipleId`

### Lifecycle and State Notes

Suggested statuses:

- `draft`
- `effective`
- `superseded`
- `retired`

Protection levels may distinguish between immutable, quorum-required, and legislatively constrained principles.

### Important Invariants

- principle codes must be unique within a Constitution lineage
- protected principles cannot be bypassed by ordinary policy activation
- policy rules may refine but must not contradict effective principles

### Lineage and Audit Expectations

- principle changes must retain precise before/after lineage
- validation outcomes that cite principle conflicts should reference principle IDs directly

## 5. PolicyBundle

### Purpose

Represents a governed package of policy rules activated together for one or more downstream scopes. A PolicyBundle is the principal legislative unit for runtime and builder-facing governance distribution.

### Key Fields

- `policyBundleId`
- `bundleKey`
- `name`
- `scope`
- `targetKinds`
- `status`
- `version`
- `ruleIds`
- `effectiveFromActivationId`
- `effectiveToActivationId`
- `supersedesBundleId`
- `compilationProfile`
- `createdAt`
- `createdBy`

### Lifecycle and State Notes

Suggested statuses:

- `draft`
- `validated`
- `approved`
- `active`
- `superseded`
- `retired`

Multiple active PolicyBundles may exist if their scopes do not conflict.

### Important Invariants

- bundle scope and target kinds must be explicit
- active bundles for the same scope must not conflict without an explicit precedence rule
- a bundle cannot become active without a successful Activation

### Lineage and Audit Expectations

- bundle lineage should preserve proposal, validation, activation, and publication history
- publication records should reference the exact bundle version used to compile downstream packages

## 6. PolicyRule

### Purpose

Represents an atomic policy statement, condition, constraint, or enforcement directive inside a PolicyBundle.

### Key Fields

- `policyRuleId`
- `policyBundleId`
- `ruleKey`
- `ruleType`
- `targetScope`
- `condition`
- `effect`
- `priority`
- `enabled`
- `justification`
- `originProposalId`
- `metadata`

### Lifecycle and State Notes

PolicyRule lifecycle is generally governed by its parent PolicyBundle, but rules may still carry local enable/disable or deprecation metadata.

### Important Invariants

- rule keys must be unique within a bundle version
- rule targets must be compatible with bundle scope
- effects that override baseline behavior must declare justification and precedence
- disabled rules must remain auditable rather than deleted

### Lineage and Audit Expectations

- diff views should be rule-aware
- impact analysis should identify downstream packages and task edges affected by a rule change

## 7. Proposal

### Purpose

Represents the formal change envelope for constitutional, principle, policy, activation, rollback, or emergency-related modifications.

### Key Fields

- `proposalId`
- `proposalType`
- `title`
- `summary`
- `status`
- `priority`
- `changeSet`
- `requestedEffectiveMode`
- `proposerId`
- `reviewPolicy`
- `validationStatus`
- `approvalState`
- `activationStrategy`
- `linkedTaskIds`
- `linkedTraceIds`
- `createdAt`
- `submittedAt`

### Lifecycle and State Notes

Proposal is the main workflow aggregate and should coordinate review, validation, approval, and activation readiness.

Suggested proposal types:

- `constitution_change`
- `principle_change`
- `policy_change`
- `activation_change`
- `rollback_request`
- `emergency_action`
- `distribution_change`

### Important Invariants

- all material governance changes must have a Proposal, except system-generated read models and passive projections
- only proposals in an approved state may proceed to normal activation
- proposal change sets must be immutable after entering approval unless moved back to revision
- emergency proposals must capture an explicit emergency rationale and actor authority

### Lineage and Audit Expectations

- the Proposal is the root lineage handle for most governance changes
- each downstream Activation, Snapshot, Review, ValidationReport, and DistributionPackage should point back to its source Proposal where applicable

## 8. ProposalReview

### Purpose

Represents a review decision or review work item associated with a Proposal.

### Key Fields

- `proposalReviewId`
- `proposalId`
- `reviewerId`
- `reviewRole`
- `decision`
- `checklistResult`
- `comments`
- `evidenceRefs`
- `reviewedAt`
- `returnedForRevision`

### Lifecycle and State Notes

Multiple reviews may exist for a proposal. The proposal’s review policy determines whether all, any, or quorum thresholds are required.

Suggested decisions:

- `approved`
- `rejected`
- `revision_requested`
- `abstained`
- `emergency_acknowledged`

### Important Invariants

- reviewer and proposer separation must be enforced where required by policy
- once recorded, a review decision should be append-only; corrections should be additive
- the proposal cannot advance unless review policy is satisfied

### Lineage and Audit Expectations

- reviews must remain attributable to specific actors and times
- evidence references should point to external artifacts, task items, simulations, or validation runs

## 9. Activation

### Purpose

Represents the controlled application of an approved governance change to active platform state.

### Key Fields

- `activationId`
- `proposalId`
- `activationType`
- `status`
- `targetScope`
- `preActivationSnapshotId`
- `resultingConstitutionId`
- `resultingPolicyBundleIds`
- `activatedBy`
- `activatedAt`
- `rollbackEligible`
- `distributionStatus`
- `activationManifest`

### Lifecycle and State Notes

Suggested statuses:

- `planned`
- `ready`
- `executing`
- `active`
- `failed`
- `rolled_back`
- `superseded`

### Important Invariants

- only approved proposals with successful validation may enter activation
- a pre-activation snapshot is required for normal activation unless policy explicitly allows otherwise
- activation must be idempotent with respect to client retries
- failed activations must never appear as active state

### Lineage and Audit Expectations

- activation records should link proposal, snapshot, package publications, and affected targets
- every activation transition should emit both a domain event and a ledger entry

## 10. Snapshot

### Purpose

Represents a trusted restore point for constitutional state, principle registry, active policy bundles, emergency control state, and package lineage at a specific moment.

### Key Fields

- `snapshotId`
- `snapshotType`
- `status`
- `capturedFromActivationId`
- `manifestRef`
- `contentDigest`
- `captureReason`
- `capturedBy`
- `capturedAt`
- `restoredByRollbackId`

### Lifecycle and State Notes

Suggested statuses:

- `captured`
- `verified`
- `restored`
- `deprecated`

Suggested snapshot types:

- `manual`
- `pre_activation`
- `scheduled`
- `emergency`

### Important Invariants

- snapshot manifests must be immutable after capture
- a restored snapshot must remain historically visible and not become a new object in disguise
- snapshots used for rollback must be integrity-verifiable

### Lineage and Audit Expectations

- snapshots should record the exact activation and proposal context that produced them
- restore operations must produce explicit restore lineage rather than silently rewinding state

## 11. AuditLedgerEntry

### Purpose

Represents an immutable audit event recording a governance-relevant action, decision, or state transition.

### Key Fields

- `ledgerEntryId`
- `eventType`
- `occurredAt`
- `actorId`
- `actorRole`
- `entityType`
- `entityId`
- `proposalId`
- `activationId`
- `snapshotId`
- `traceIds`
- `taskRefs`
- `edgeRefs`
- `payloadDigest`
- `payloadRef`
- `reasonCode`

### Lifecycle and State Notes

AuditLedgerEntry should be append-only. Corrections or redactions should be modeled as new entries with explicit linkage.

### Important Invariants

- ledger entries are never updated in place for semantic content
- all critical write-side transitions must emit ledger entries
- trace and task references must preserve correlation without becoming the source of truth for domain state

### Lineage and Audit Expectations

- this entity is the lineage backbone
- downstream read models should be projections of ledger and domain state, not substitutes for it

## 12. EmergencyControl

### Purpose

Represents the active or historical state of bounded emergency governance controls.

### Key Fields

- `emergencyControlId`
- `controlType`
- `status`
- `scope`
- `reason`
- `initiatedBy`
- `initiatedAt`
- `expiresAt`
- `resolvedAt`
- `linkedProposalId`
- `linkedActivationId`
- `overridePolicy`

### Lifecycle and State Notes

Suggested statuses:

- `engaged`
- `active`
- `expired`
- `released`
- `superseded`

### Important Invariants

- emergency control actions must be explicit and attributable
- control scope must be bounded to platform, target family, policy domain, or activation path
- indefinite emergency controls should require explicit governance policy and visible operator review

### Lineage and Audit Expectations

- engagement, renewal, release, expiry, and supersession must all be ledgered
- emergency controls should be visible in activation and distribution lineage when they influence effective state

## 13. Proposal Status Flow

Recommended proposal status flow:

- `draft`
- `submitted`
- `under_validation`
- `validation_failed`
- `under_review`
- `revision_requested`
- `approved`
- `rejected`
- `activation_ready`
- `activated`
- `rolled_back`
- `archived`

Flow notes:

- proposals may move from `revision_requested` back to `draft` or `submitted`
- `validation_failed` is not terminal if edits are allowed
- `approved` does not mean active; activation remains a separate state transition
- `rolled_back` means the proposal had an activation lineage that was later reversed

## 14. Activation Lifecycle

Recommended activation lifecycle:

- `planned`
- `snapshot_pending`
- `ready`
- `executing`
- `active`
- `distribution_pending`
- `distributed`
- `failed`
- `rolled_back`
- `superseded`

Lifecycle notes:

- `distribution_pending` may occur after state activation if package publication is asynchronous
- `distributed` indicates downstream packages have been produced and recorded, not necessarily fully enforced everywhere
- `superseded` indicates a later activation replaced its effective state

## 15. Rollback Concept

Rollback should be modeled as a governed operation, not a hidden undo.

Recommended rules:

- rollback is initiated by a Proposal or EmergencyControl path
- rollback references a prior successful Snapshot and/or Activation lineage
- rollback creates a new Activation record representing the restorative state transition
- rollback does not delete the original activation; it appends corrective history

Rollback variants:

- activation rollback
- package rollback
- emergency rollback
- partial scope rollback

## 16. Emergency Control Types

Recommended emergency control types:

- `amendment_freeze`
- `activation_freeze`
- `scope_freeze`
- `safe_mode`
- `emergency_rollback`
- `emergency_patch`
- `distribution_hold`

Notes:

- `emergency_patch` should still generate a normalizable follow-up proposal for ratification
- `distribution_hold` blocks package publication without necessarily altering active governance state

## 17. Major Domain Relationships

Key relationships:

- one Constitution has many Principles
- one Proposal may modify one or more Constitutions, Principles, PolicyBundles, or EmergencyControls through its change set
- one Proposal has many ProposalReviews
- one approved Proposal may produce zero or more Activations
- one Activation references one pre-activation Snapshot
- one Activation may produce many DistributionPackages
- many AuditLedgerEntries may reference the same Proposal, Activation, Snapshot, task, or edge
- EmergencyControl may be initiated by a Proposal and may constrain future Activations

## 18. Cross-System References

The Governance Engine should support non-owning references to surrounding systems:

- `taskRefs` for task IDs from the existing task contracts and registry
- `edgeRefs` for directional chain edges such as Consortium -> Brain or Builder -> CATS
- `contractRefs` for task or policy contract identifiers
- `traceIds` for cross-edge lineage helpers
- `packageRefs` for compiled downstream governance packages

These references improve auditability and impact visibility without moving ownership of those concepts into the Governance Engine.

## 19. Domain Event Families

Suggested domain event families:

- `constitution.registered`
- `constitution.activated`
- `principle.added`
- `principle.superseded`
- `policy_bundle.created`
- `policy_bundle.activated`
- `proposal.submitted`
- `proposal.validated`
- `proposal.reviewed`
- `proposal.approved`
- `proposal.rejected`
- `activation.started`
- `activation.completed`
- `activation.failed`
- `snapshot.captured`
- `snapshot.restored`
- `emergency_control.engaged`
- `emergency_control.released`
- `distribution_package.published`

## 20. Implementation Guidance

Coding guidance for the first implementation:

- keep Proposal, Activation, Snapshot, and EmergencyControl as true aggregate roots
- treat PolicyRule as a child entity of PolicyBundle unless independent authoring pressure emerges
- keep AuditLedgerEntry append-only and infrastructure-backed
- separate domain invariants from UI-oriented read models
- keep downstream package compilation out of the core write-side transaction if it may exceed fast response thresholds

This model should be implemented in a way that preserves proposal-driven governance, strong lineage, rollback safety, and future distribution to runtime and builder-facing systems.
