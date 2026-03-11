# Mishti AI - Universal Task Governance Architecture

## 1. Purpose
This document defines the universal task governance model for Mishti AI.

Everything important must become trackable work so the platform can preserve accountability, coordination, auditing, and measurable progress across all layers.

## 2. Core Principle
If work matters, it must exist in the task system.

Invisible responsibilities, implicit obligations, and untracked strategic or operational work are governance risks.

## 3. Scope
This architecture governs tasks across:
- Consortium
- Brain
- Project Managers
- Senior Engineers
- Learners
- Builders
- CATS
- OS

It also governs task reporting, task state, and constitution-aware task handling.

## 4. Why a Universal Task System Is Needed
- prevent invisible responsibilities
- maintain accountability
- enable coordination
- support auditing and measurement
- make cross-layer work traceable
- align execution with governance

## 5. Task-Carrying Layers
Every major operational layer can carry tasks:
- Consortium
- Brain
- Project Manager
- Senior Engineer
- Learner
- Builder
- CATS
- OS

Different layers may carry different kinds of tasks, but all significant work should be represented within a common governance model.

## 6. Task Flow Model
### Downward Flow
Tasks, plans, and constrained work assignments move downward.

### Upward Flow
Reports, blockers, evidence, status, and outcomes move upward.

This preserves both accountability and institutional learning.

## 7. Task Lifecycle
Suggested core states:
- created
- assigned
- in_study
- planned
- in_progress
- in_review
- completed
- reported
- archived
- blocked
- escalated

Not every layer uses every state, but the lifecycle should remain consistent enough for aggregation and audit.

## 8. Task Metadata Model
Important task fields include:
- task_id
- task_type
- source_layer
- owner
- assignee
- priority
- dependencies
- deadline
- status
- evidence
- report_summary
- outputs

Optional extensions may later include trust requirements, constitutional flags, benchmark linkage, and route metadata.

## 9. Task Categories
- engineering
- research
- governance
- operational
- repair
- learning
- constitutional
- deployment
- audit

## 10. Brain and Consortium Task Loop
The Brain and Consortium maintain a bidirectional task and reporting relationship.

Examples:
- Consortium assigns oversight or strategic tasks to the Brain
- Brain reports outcomes, risks, recommendations, and further task requests to the Consortium

This loop must remain explicit rather than implicit.

## 11. Task Reporting Model
Each layer must report upward in terms appropriate to its scope:
- Consortium receives strategic and institutional reports
- Brain receives operational and analytical reports
- PMs receive delivery and blocker reports
- Senior Engineers receive technical progress and quality findings
- Learners receive execution evidence and review needs

Reports should remain attached to task identity wherever possible.

## 12. Governance and Constitution Integration
The universal task system must remain:
- constitution-aware
- audit-friendly
- lineage-preserving
- compatible with existing governance controls

Tasks involving protected actions, trust shifts, policy updates, or constitutional changes must surface higher governance requirements explicitly.

## 13. Foundational Operating Rule
No major strategic, technical, governance, repair, or operational work should proceed as an untracked side channel when it materially affects the platform.

## 14. Non-Goals
- not every task is fully automated initially
- do not assume optimal routing in early versions
- do not assume all reports are machine-generated
- do not replace existing ledgers or governance systems with a task system

## 15. Related Documents
- `docs/architecture/operations/MISHTI-AI-HIERARCHICAL-ENGINEERING-OPERATIONS-ARCHITECTURE.md`
- `docs/architecture/operations/MISHTI-AI-ROLE-SCOPES-AND-OPERATING-BOUNDARIES.md`
- `docs/architecture/operations/MISHTI-AI-TASK-GRAPH-ENGINE-ARCHITECTURE.md`
- `docs/architecture/constitution/MISHTI-AI-CONSTITUTIONAL-GOVERNANCE-ARCHITECTURE.md`

## 16. Conclusion
Universal task governance gives Mishti AI a common control surface for strategy, engineering, learning, repair, and downstream execution. The task system is not a replacement for governance or ledgers; it is the explicit work coordination layer that keeps responsibilities visible and auditable.
