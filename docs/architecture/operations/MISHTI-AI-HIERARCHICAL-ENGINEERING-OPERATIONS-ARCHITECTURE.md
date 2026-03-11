# Mishti AI - Hierarchical Engineering Operations Architecture

## 1. Purpose
This document defines the governed hierarchical engineering and execution model for Mishti AI.

The platform requires an explicit operational hierarchy because unmanaged builders, learners, and downstream execution units do not scale safely. A governed hierarchy improves:
- coordination
- decomposition discipline
- maintenance
- reporting
- accountability
- cross-layer auditability

## 2. Scope
This architecture governs:
- the operational hierarchy across strategic, managerial, engineering, execution, and downstream runtime layers
- reporting and delegation relationships
- task flow expectations across layers
- accountability structure for major work

Out of scope for now:
- full autonomous organizational behavior
- complete runtime implementation of every role
- detailed scheduling or staffing algorithms

## 3. Core Principle
All important work must be managed through explicit tasks.

All operational layers must have reporting relationships. No major responsibility should exist outside the governed hierarchy.

## 4. Hierarchy Overview
The operating stack is:
- Consortium
- Brain
- Project Managers
- Senior Engineers
- Engineers and Learners
- Builders
- CATS
- OS

## 5. Layer-by-Layer Purpose
### Consortium
The Consortium is the top governance and strategic oversight layer. It assigns priorities, approves major directions, receives reports from the Brain, and preserves constitutional and institutional accountability.

### Brain
The Brain is the central reasoning, coordination, and synthesis layer. It receives strategic or oversight tasks from the Consortium, interprets platform-wide state, coordinates lower operational layers, and reports findings, risks, and recommendations upward.

### Project Managers
Project Managers coordinate task programs, delivery sequencing, cross-role handoffs, and reporting timelines. They convert strategic directives into managed work streams.

### Senior Engineers
Senior Engineers guide architecture, major technical direction, decomposition quality, technical risk handling, and engineering review expectations.

### Engineers and Learners
Engineers and Learners study domains, research solutions, decompose work, guide builders, review outputs, identify gaps, and report evidence upward.

### Builders
Builders are the execution workforce. They receive decomposed work units and produce implementation artifacts within governed boundaries.

### CATS
CATS act as downstream bounded capability execution units. They perform specialized operational work after higher layers have prepared or routed appropriate task units.

### OS
OS runtimes and workers perform local or edge execution and system operations within policy envelopes and downstream task assignments.

## 6. Downward Flow and Upward Flow
### Downward Flow
Tasks, plans, constraints, priorities, and approved work units flow downward through the hierarchy.

### Upward Flow
Reports, evidence, risks, blockers, quality findings, runtime observations, and outcomes flow upward.

This dual flow preserves control and learning continuity.

## 7. Brain-Consortium Relationship
The Consortium assigns strategic, oversight, review, and institutional tasks to the Brain.

The Brain reports back:
- status
- findings
- recommendations
- risks
- learned outcomes
- requests for approval or escalation

The Brain does not silently redefine strategic direction or constitutional boundaries.

## 8. PM / Senior Engineer / Learner / Builder Relationship
Project Managers coordinate delivery and staffing of work.

Senior Engineers:
- shape technical direction
- confirm decomposition quality
- review major technical decisions

Engineers and Learners:
- study
- research
- decompose
- review
- guide execution

Builders:
- execute bounded work units
- return outputs and status
- do not own broad architectural authority

## 9. Role Interaction Patterns
### Downward Delegation
A layer may delegate downward when:
- the work is within the lower layer's defined scope
- the task is sufficiently explicit
- the receiving layer has appropriate permissions and capability

### Upward Escalation
A layer must escalate upward when:
- constitutional or policy tension exists
- risk exceeds local authority
- decomposition is insufficient
- a blocker cannot be resolved within scope
- cross-layer conflicts arise

### Handoff Boundaries
Every handoff must preserve:
- task identity
- responsibility assignment
- expected outputs
- evidence lineage
- reporting destination

## 10. Accountability Model
Every layer must be auditable and reportable.

Required principles:
- no silent responsibility drift
- no hidden reassignment of critical work
- no untracked escalation
- no unaudited completion claims

## 11. Cross-Layer Constraints
All layers remain governed by:
- the constitution
- platform guardrails
- builder registration and wrapper discipline
- task governance
- audit and evidence lineage expectations

The hierarchy does not override constitutional governance. It operates within it.

## 12. Initial Operating Model
Early versions should function as follows:
- Consortium sets priorities and reviews Brain outputs
- Brain coordinates overall direction and major task routing
- Project Managers structure work programs
- Senior Engineers guide architecture and decomposition
- Engineers and Learners produce study, review, and guidance artifacts
- Builders execute leaf work
- CATS and OS handle downstream bounded execution

This model supports gradual intelligence growth without requiring full autonomy at every layer.

## 13. Non-Goals
- do not assume every layer is fully intelligent at first
- do not assume autonomous organizational self-design
- do not assume perfect dynamic staffing in early versions
- do not bypass explicit task discipline

## 14. Related Documents
- `docs/architecture/constitution/MISHTI-AI-CONSTITUTIONAL-GOVERNANCE-ARCHITECTURE.md`
- `docs/architecture/builders/MISHTI-AI-BUILDER-CLASSIFICATION-ARCHITECTURE.md`
- `docs/architecture/self-learning/MISHTI-AI-CENTRAL-SELF-LEARNING-ARCHITECTURE.md`
- `docs/architecture/operations/MISHTI-AI-ROLE-SCOPES-AND-OPERATING-BOUNDARIES.md`
- `docs/architecture/operations/MISHTI-AI-UNIVERSAL-TASK-GOVERNANCE-ARCHITECTURE.md`

## 15. Conclusion
Mishti AI requires a governed hierarchy so strategic oversight, technical direction, research, execution, and downstream operations remain coordinated and auditable. The hierarchy is an additive control structure on top of the existing platform backbone, not a replacement for existing governance, runtime, or ledger systems.
