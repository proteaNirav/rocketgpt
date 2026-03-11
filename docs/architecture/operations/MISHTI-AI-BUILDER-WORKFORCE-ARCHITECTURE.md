# Mishti AI - Builder Workforce Architecture

## 1. Purpose
This document defines the builder workforce model for Mishti AI.

Builders are a workforce, not a single monolithic agent. The platform must be able to allocate, guide, monitor, and improve multiple builders across categories, subcategories, pools, and instances.

## 2. Scope
This architecture governs:
- categories
- subcategories
- types
- instances
- pools
- orchestration
- skill profiles
- improvement and reassignment

It does not replace the existing builder classification, registration, or guardrail architecture. It builds on it.

## 3. Builder Mental Model
The builder system should be understood as a construction workforce.

Key principles:
- large work often requires multiple workers
- one builder should not receive vague mega-tasks
- builders should receive decomposed work units
- a builder may be reassigned when free and skill-compatible
- allocation should be pool-aware and dependency-aware

## 4. Builder Hierarchy
- category
- subcategory or type
- builder instance
- builder pool

## 5. Builder Categories
Illustrative categories include:
- architecture
- infrastructure
- runtime
- integration
- interface
- security
- governance
- optimization
- documentation
- testing
- repair

These categories are institutional workload groupings, not merely labels.

## 6. Builder Subcategories / Types
Specialization exists within categories.

Examples:
- infrastructure -> deployment, networking, storage
- runtime -> orchestration, containment, health, repair
- interface -> UI, operator console, admin workflow
- testing -> unit, integration, benchmark, verification

Subcategories support more precise allocation, review, and improvement decisions.

## 7. Builder Instances
Multiple instances may exist within one type.

Builder instances support:
- workload distribution
- parallel execution
- availability awareness
- fault isolation
- differential performance tracking

Instances should be treated as governed workers with their own assignment histories and outcome evidence.

## 8. Builder Pools
Pools provide flexible staffing of work units.

A pool may:
- contain multiple compatible builder instances
- expose availability and trust posture
- support reassignment when a builder is blocked or overloaded
- support parallel execution for sibling work units

## 9. Builder Skill Profile
A builder skill profile should capture:
- category fit
- subtype specialization
- trust tier
- execution modes
- performance signals
- failure patterns
- review quality
- governance posture

This profile informs assignment and promotion, but does not bypass registration or wrapper discipline.

## 10. Builder Work Units
Builders should receive decomposed work units, not vague large objectives.

A valid work unit should define:
- task identity
- expected output
- scope boundaries
- dependency context
- required permissions
- review expectations

## 11. Builder Orchestration
Builders are assigned by higher operational layers, not self-authorized.

Typical assignment path:
- PM or Senior Engineer coordinates work
- Learners help decompose and guide execution
- Builders receive leaf work units
- outputs and blockers flow upward

Dependency handling must remain task-driven rather than ad hoc.

## 12. Builder Improvement Model
Builders improve through:
- performance history
- output review
- trust scoring
- governed promotion
- reassignment evidence
- failure and recovery analysis

Improvement is governed and evidence-based. It is not unrestricted self-redefinition.

## 13. Failure and Recovery
Failure responses may include:
- retry
- reassignment
- refined decomposition
- narrower work reallocation
- escalate

Repeated failure should influence builder fitness and routing decisions.

## 14. Governance and Constitutional Embedding
Builders remain bounded by:
- registration requirements
- wrapper enforcement
- trust-tier controls
- constitutional constraints
- review and reporting obligations

This workforce model extends the existing builder classification architecture; it does not replace it.

## 15. Relationship to the Wider Operations Model
The workforce model fits inside the broader hierarchy:
- Consortium and Brain define institutional direction
- PMs and Senior Engineers coordinate builder demand
- Learners guide and review builder work
- Builders execute work units
- CATS and OS may receive downstream routed tasks

## 16. Related Documents
- `docs/architecture/builders/MISHTI-AI-BUILDER-CLASSIFICATION-ARCHITECTURE.md`
- `docs/architecture/operations/MISHTI-AI-HIERARCHICAL-ENGINEERING-OPERATIONS-ARCHITECTURE.md`
- `docs/architecture/operations/MISHTI-AI-UNIVERSAL-TASK-GOVERNANCE-ARCHITECTURE.md`
- `docs/architecture/operations/MISHTI-AI-TASK-GRAPH-ENGINE-ARCHITECTURE.md`

## 17. Conclusion
Mishti AI requires a builder workforce architecture so execution can scale through governed categories, pools, and instances instead of relying on a single undifferentiated builder layer. This architecture remains subordinate to constitutional governance, task governance, and the established builder control surfaces.
