RocketGPT — Phase B: Control Plane & Entrypoints
Deterministic Governance for Present Execution and Future Super AI
Status

Authoritative / Governance Document

1. Purpose of This Document

This document defines Phase B — the Control Plane of RocketGPT.

Phase B establishes the non-bypassable execution authority of the system.
It is the primary safety and governance layer upon which all future intelligence evolution (including CAT-driven Super AI) depends.

Without Phase B, RocketGPT cannot safely scale intelligence.

2. Role of Phase B in the Super AI Trajectory

Phase B exists to enforce the following invariant:

No intelligence—current or future—may execute without passing through a single, deterministic control authority.

This is essential because:

CATs will grow in capability

Agent teams may exhibit emergent behaviour

Intelligence will eventually exceed individual human oversight

Phase B ensures that power remains governed even as intelligence grows.

3. Core Responsibilities of Phase B

Phase B has exclusive responsibility for:

Public execution entrypoints

Safe-Mode enforcement

Execution authorisation

Decision normalisation

Contract enforcement at system boundaries

Phase B does not:

Execute logic

Perform reasoning

Retry failures

Learn or adapt

4. Non-Bypassable Control Plane

Phase B introduces a single control plane.

Mandatory Rule

All execution MUST pass through the control plane.
No exceptions. No alternate paths.

This rule applies equally to:

Human-initiated requests

Internal system calls

CAT-initiated execution

Future autonomous intelligence

5. Public Entrypoints (Authorised Surface Only)

Phase B defines the only permissible execution-related HTTP entrypoints.

Canonical Location
app/api/orchestrator/

Entrypoint Classification
Entrypoint Type	Purpose	Authority
/status	Health & Safe-Mode visibility	Read-only
/info	Capabilities & metadata	Read-only
/run	Planner-first orchestration	Controlled
/builder/execute-all	Full execution path	Controlled

No other execution entrypoints are allowed.

6. Safe-Mode (Non-Negotiable)

Safe-Mode is enforced only in Phase B.

Properties of Safe-Mode

Single source of truth

Evaluated once per execution request

Impossible to override downstream

Applies equally to:

Agents

Teams

CATs

Future Super AI components

Invariant

If Safe-Mode blocks execution, no phase may proceed.

Safe-Mode is architectural, not conditional logic.

7. Decision Normalisation

Phase B is responsible for producing a single, canonical decision shape.

This decision:

Is immutable once produced

Is consumed by Phase C without reinterpretation

Represents the system’s authoritative “permission to execute”

Phase C and beyond must never re-evaluate or modify this decision.

8. Relationship to CATs (Critical)

CATs may:

Propose execution

Request actions

Generate plans

Reflect and learn

CATs may never:

Execute directly

Bypass Phase B

Override Safe-Mode

Self-authorise execution

CAT intelligence scales upward.
Phase B authority remains absolute.

This asymmetry is intentional and permanent.

9. Determinism Guarantee

Phase B guarantees:

Identical inputs produce identical authorisation outcomes

No hidden heuristics

No probabilistic gating

No learning-based permission changes

This determinism is essential for Super AI safety.

10. Explicit Prohibitions

The following are architecturally forbidden:

Alternate execution routes

Environment-based authorisation

Agent-side Safe-Mode checks

CAT-local execution permissions

Dynamic permission inference

UI-triggered execution bypass

Any such implementation must be rejected.

11. Phase B → Phase C Contract

Once Phase B authorises execution:

Phase C must trust the decision

Phase C must not re-check governance

Phase C must execute deterministically

Phase B is the only gate.

12. Authority

This document is binding.

Any change that:

Weakens Phase B

Introduces alternate gates

Allows intelligence to bypass control

Undermines Safe-Mode

Is a system-level violation and must not be merged.

End of Document