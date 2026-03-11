# Mishti Runtime and CATS Boundary V1

## Purpose

This document defines the first-life execution boundary between governed Mishti AI workers and runtime-facing execution surfaces. The boundary exists to ensure that builders, task handlers, and routing layers do not receive implicit execution authority. Runtime components remain non-sovereign and operate only as bounded adapters subject to governance, evidence, awareness, and survival controls.

## Boundary Components

### Sandbox Runner
- Accepts bounded execution requests only.
- Requires a sandbox policy reference and explicit resource-limit placeholders.
- Exposes validation, evidence, and survival hook placeholders.
- Treats every execution result as conditionally trusted until post-execution validation and evidence attachment complete.

### CATS Gateway
- Provides a typed invocation surface for CAT capabilities.
- Carries governance and routing metadata into the CAT boundary.
- Exposes trust and health placeholders so capability fit is not treated as sufficient authority.
- Returns result envelopes that remain conditionally trusted and evidentiary.

### OS Adapter
- Provides a narrow action-validation boundary for later OS-facing work.
- Accepts allowed action classes only.
- Carries explicit denied action classes to make non-permitted behavior machine-readable.
- Supports survival interruption placeholders for safe mode, node isolation, and emergency stop.

## Operating Constraints

- Runtime is not sovereign.
- Builders are not privileged runtime actors.
- No runtime component may bypass governance evaluation.
- No runtime component may bypass evidence attachment requirements.
- No runtime component may bypass survival interruption controls.
- No execution output is implicitly trusted.
- No unrestricted shell, filesystem, or network behavior is part of first-life scope.

## Invocation Flow

1. A builder or governed application service prepares a bounded request.
2. Governance and routing metadata define the permitted scope.
3. The sandbox runner or CATS gateway validates the request shape against local boundary constraints.
4. Evidence hooks are attached so request, acceptance, rejection, interruption, and completion can later be recorded.
5. Survival hooks remain able to interrupt the request before completion.
6. The runtime surface returns a result envelope with conditioned trust, not a final trusted artifact.
7. Downstream validation determines whether outputs may be promoted or consumed.

## Trust Model

Runtime outputs are classified as conditionally trusted only. The first-life boundary assumes:
- runtime adapters can fail,
- runtime adapters can degrade,
- runtime adapters can produce incomplete or misleading outputs,
- evidence gaps and lineage inconsistencies must be representable,
- survival may interrupt valid work to preserve system integrity.

## CATS Positioning

CATS is treated as a bounded runtime-adjacent execution layer, not a sovereign planner. The CATS gateway must:
- expose declared capabilities,
- accept only bounded invocation envelopes,
- propagate trace and task identifiers,
- surface trust and health placeholders,
- emit evidence hook references for later Documentor integration.

## OS Boundary Positioning

The OS adapter is the narrowest and most sensitive boundary in first-life scope. It must:
- declare allowed action classes explicitly,
- declare denied action classes explicitly,
- require policy-check placeholders for every request,
- remain interruptible by safe mode and emergency stop,
- avoid direct mutation implementation in this phase.

## First-Life Exclusions

This version does not implement:
- real shell execution,
- privileged OS mutation,
- network transports,
- artifact storage,
- scheduler loops,
- runtime trust promotion,
- bypass paths around governance or survival.
