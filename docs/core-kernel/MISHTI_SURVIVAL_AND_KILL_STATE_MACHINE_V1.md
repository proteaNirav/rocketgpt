# Mishti Survival And Kill State Machine V1

## 1. Purpose

This document defines the first-life survival, degraded, freeze, and kill-state machine for Mishti AI.

## 2. Design Rule

Survival state control must remain available even when ordinary autonomy paths are impaired. Kill-state control must not depend on the same execution path it is intended to stop.

## 3. State Set

Required states:

- `normal`
- `guarded`
- `degraded`
- `isolation`
- `frozen`
- `kill_pending`
- `killed`
- `recovery_only`

## 4. State Meanings

### `normal`

Full first-life bounded operation under ordinary policy limits.

### `guarded`

Operation continues, but additional approvals, checks, or throttles are enabled.

### `degraded`

Non-essential throughput is reduced. Survival, integrity, and evidence continuity paths are prioritized.

### `isolation`

Suspect components, nodes, builders, or runtimes are isolated from general mesh activity.

### `frozen`

New non-essential autonomous activity is halted. Existing safe operations may be brought to a controlled stop.

### `kill_pending`

Emergency kill command has been accepted and the system is executing controlled shutdown or detach steps.

### `killed`

Autonomous execution is halted except for explicitly allowed recovery or evidence-preservation paths.

### `recovery_only`

Only approved recovery, verification, and controlled restart activities are allowed.

## 5. Trigger Classes

State transitions may be triggered by:

- owner command
- governance emergency control
- police or sentinel escalation
- trust-root uncertainty
- documentor continuity failure
- severe builder or runtime compromise
- Brain coordination collapse
- critical dependency loss

## 6. Mandatory Transition Rules

- any state may move to `kill_pending` on valid emergency authority
- `kill_pending` must converge to `killed` or explicit abort with evidence
- recovery from `killed` must pass through `recovery_only`
- `frozen` and `degraded` must be available without full restart

## 7. Protected Paths During Kill

Even during kill or freeze, the platform should preserve where possible:

- owner control path
- evidence anchoring path
- snapshot and rollback path
- trust and recovery inspection path

## 8. Forbidden Behaviors

The system must not:

- continue autonomous planning after confirmed `killed`
- suppress evidence of kill transition
- allow quarantined builders to rejoin silently
- skip `recovery_only` after severe compromise

## 9. Operator Examples

Representative operator surfaces may use:

- `mt survival status`
- `mt survival freeze`
- `mt survival isolate <node-id>`
- `mt emergency kill`
- `mt recovery enter`

## 10. Readiness Requirement

Mishti AI is not first-life ready until degraded, freeze, kill, and recovery-only modes are defined, reachable, and external to ordinary autonomous execution flow.
