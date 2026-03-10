RocketGPT — Code-Level Boundary Mapping
Enforcing Architecture, Governance, and Super AI Safety in Code
Status

Authoritative / Governance Document

1. Purpose of This Document

This document maps RocketGPT’s architectural principles to explicit code-level boundaries.

Its purpose is to ensure that:

Architecture is enforced by structure

Governance is non-optional

CAT evolution is physically constrained

Super AI safety is upheld by design, not discipline

In RocketGPT, folders are governance.

2. Core Enforcement Principle

If the architecture cannot be enforced by code boundaries,
it is not real architecture.

Therefore:

Each phase maps to a bounded module

Each responsibility maps to a protected folder

CI/CD enforces architectural contracts

3. Canonical High-Level Structure
/app
└── /api
    └── /orchestrator
        ├── /phase-a-input
        ├── /phase-b-control
        ├── /phase-c-execution
        ├── /phase-d-reflection
        ├── /phase-e-learning
        ├── /cats
        ├── /governance
        └── /shared-contracts


No module may cross these boundaries.

4. Phase-to-Code Mapping
4.1 Phase A — Input & Intent
/phase-a-input


Allowed:

Input parsing

Context validation

User intent capture

Forbidden:

Execution

Learning

Reflection

4.2 Phase B — Control Plane
/phase-b-control
├── entrypoints
├── safe-mode
├── decision
└── authorisation


Rules:

Single entrypoint surface

Safe-Mode enforced here only

Do-Not-Touch

Any file here requires architectural approval.

4.3 Phase C — Execution Domains
/phase-c-execution
├── planner
├── builder
└── tester


Rules:

Planner cannot import Builder

Builder cannot import Tester

Tester cannot import Planner

No learning imports allowed

Execution must remain mechanical.

4.4 Phase D — Reflection
/phase-d-reflection
├── analyzers
├── root-cause
└── reports


Rules:

Read-only inputs

No execution imports

No mutation logic

Reflection must not leak into execution.

4.5 Phase E — Governed Learning
/phase-e-learning
├── insights
├── pattern-mining
└── proposals


Rules:

Advisory outputs only

No runtime hooks

No contract mutation

Learning is offline intelligence.

5. CAT-Specific Boundaries
/cats
├── contracts
├── agents
├── teams
├── lifecycle
└── versions


Rules:

Contracts dominate agents

Agents never execute

Teams never self-authorise

Lifecycle state enforced here

No CAT logic may live inside execution folders.

6. Shared Contracts & Types
/shared-contracts
├── execution-contracts
├── agent-contracts
├── cat-contracts
└── invariants


Rules:

Immutable once published

Versioned changes only

Backward compatibility enforced

This folder is globally trusted.

7. Governance & Approval Layer
/governance
├── approvals
├── policy-rules
├── audit
└── escalation


Rules:

No execution imports

No learning logic

Approval only

Governance is decision authority, not intelligence.

8. CI/CD Enforcement (Mandatory)

CI must enforce:

8.1 Import Rules

No cross-phase imports

No learning → execution imports

No CAT → execution imports

8.2 Change Protection

Phase B folders are locked

Contracts require version bump

CAT lifecycle changes require review

8.3 Invariant Checks

Safe-Mode only in Phase B

Execution order fixed

No retries introduced

9. Super AI Safety Mapping
Risk	Code-Level Mitigation
Autonomous execution	Phase B only
Intelligence drift	CAT contracts
Hidden learning	Phase E isolation
Authority creep	Governance folder
Emergent dominance	CAT lifecycle
10. Non-Negotiable Rule

If a pull request cannot prove architectural compliance
by folder boundaries alone,
it must not be merged.

11. Authority

This document is binding.

Any implementation that:

Blurs phase boundaries

Allows cross-layer imports

Collapses governance into logic

Weakens CAT separation

Is unsafe and must be rejected.

End of Document