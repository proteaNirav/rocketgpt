# Mishti Runtime Sandbox Policy V1

## Purpose

This document defines the first-life policy posture for Mishti AI runtime execution. The sandbox policy exists to constrain execution before real runtime behavior is implemented.

## Policy Objectives

- preserve owner-rooted sovereignty,
- preserve governance-first operation,
- preserve zero-trust posture,
- preserve evidence readiness,
- preserve survival interruptibility,
- prevent builders from obtaining implicit OS authority.

## Default Policy Stance

The sandbox runner and adjacent runtime boundaries operate fail-closed by default.

Default assumptions:
- execution requests are untrusted until validated,
- execution outputs are conditionally trusted only,
- builders may request work but may not self-authorize expanded scope,
- safe mode and emergency stop must interrupt pending work,
- evidence hooks are required for meaningful execution paths,
- policy references must be explicit rather than inferred.

## Required Request Elements

A first-life bounded execution request must include:
- request identifier,
- bounded execution context,
- sandbox policy reference,
- explicit resource limit placeholders,
- validation hook placeholders,
- evidence hook placeholders,
- survival interruption hook placeholders.

Requests missing any required control element should be rejected by boundary validation.

## Allowed First-Life Patterns

- document-oriented generation within bounded scope,
- code-oriented generation within bounded scope,
- validation-oriented execution planning,
- ops-oriented staging requests without privileged mutation,
- CAT invocation preparation with explicit capability declaration,
- OS action validation for narrow allowed action classes.

## Denied First-Life Patterns

- unrestricted shell execution,
- privilege escalation,
- direct key or identity material access,
- uncontrolled filesystem mutation,
- network reconfiguration,
- self-issued policy overrides,
- survival bypass,
- governance bypass.

## Survival Policy

Runtime boundaries must be interruptible when survival state enters:
- `safe_mode`
- `node_isolated`
- `emergency_stop`

Interruptions should return explicit result envelopes and must not be treated as silent failures.

## Evidence Policy

Every meaningful execution path should carry placeholder evidence references for:
- request receipt,
- validation result,
- rejection or acceptance,
- interruption,
- completion.

Evidence attachment is not implemented in this phase, but the contract surface must reserve it.

## Validation Policy

Validation remains mandatory for conditioned trust. Even if a runtime boundary accepts a request, the result must still be treated as bounded and provisional until downstream validation and governance checks complete.

## First-Life Implementation Guidance

- Keep runtime packages contract-only.
- Do not embed privileged execution code.
- Keep configuration bounded and explicit.
- Require future implementers to thread governance, evidence, and survival checks through every runtime path.
