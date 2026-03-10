RocketGPT — Do-Not-Touch Index
Immutable System Invariants for Safe Super AI Evolution
Status

Authoritative / Governance Lock Document

1. Purpose of This Document

This document defines the Do-Not-Touch Index for RocketGPT.

It identifies:

Files

Modules

Responsibilities

Architectural invariants

that must never be modified, bypassed, or reinterpreted without a full architectural review.

This index exists to ensure that:

Control remains stronger than intelligence

CAT evolution does not erode safety

Super AI emergence remains governed

2. Definition of “Do-Not-Touch”

A Do-Not-Touch element is one that:

Enforces non-bypassable control

Guarantees execution determinism

Anchors governance authority

Protects system-wide contracts

Modifying such an element without review constitutes a system integrity violation.

3. Absolute Invariants (Conceptual)

The following concepts are immutable:

Single control plane

Single Safe-Mode source of truth

Deterministic execution order

Immutable decision contracts

Upward-only failure propagation

No execution during learning

No intelligence without contracts

CATs governed by contracts, not autonomy

These invariants must hold indefinitely, including during Super AI evolution.

4. Protected Code Domains (Logical)

The following domains are permanently protected:

4.1 Control Plane Domain

Purpose:

Execution authorisation

Safe-Mode enforcement

Decision normalisation

This domain is non-bypassable and non-negotiable.

4.2 Decision & Contract Domain

Purpose:

Canonical execution decisions

Agent and CAT contracts

Execution context integrity

Contracts are binding, not advisory.

4.3 Safe-Mode Domain

Purpose:

Centralised execution blocking

Emergency governance override

Safe-Mode must:

Be evaluated once

Be authoritative

Be impossible to shadow or override

4.4 Execution Order Domain

Purpose:

Enforce Planner → Builder → Tester order

Prevent parallel or conditional execution

Execution order is fixed forever.

5. Representative Protected Paths (Indicative)

The exact filenames may evolve,
but the responsibilities below must never move or weaken.

app/api/orchestrator/control-plane/
app/api/orchestrator/safe-mode/
app/api/orchestrator/types/
app/api/orchestrator/contracts/


Any relocation or refactor that:

Dilutes authority

Introduces alternates

Breaks isolation

is prohibited.

6. CAT-Specific Do-Not-Touch Rules

As CATs evolve, the following remain immutable:

CATs may not self-authorise execution

CATs may not override system contracts

CATs may not mutate governance rules

CAT intelligence must remain contract-bound

CATs scale intelligence, not authority.

7. Forbidden Modification Patterns

The following changes are explicitly forbidden:

Adding alternate execution entrypoints

Rechecking Safe-Mode outside Phase B

Embedding learning logic in execution paths

Allowing agents to retry autonomously

Allowing CATs to approve their own actions

Introducing probabilistic execution gating

Any of these breaks Super AI safety guarantees.

8. Change Control Requirement

Any proposed change affecting a Do-Not-Touch area requires:

Explicit architectural review

Formal documentation update

Versioned approval

Full regression validation

Absent these, changes must be rejected.

9. Authority

This document is binding across all present and future phases, including:

Phase E (Learning)

Phase F (CAT Evolution)

Phase G+ (Super AI Emergence)

No future intelligence level may invalidate this index.

10. Final Invariant

If a change makes RocketGPT “more powerful”
by weakening this document,
that change is unsafe by definition.

End of Document