# Mishti MAK Kernel Spec V1

## 1. Purpose

This document defines the Mishti Autonomous Kernel (MAK) for first operational life. The MAK is the minimum governed kernel required to make Mishti AI live while preserving owner authority, bounded autonomy, and zero-trust execution.

## 2. Kernel Role

The MAK is not the full platform. It is the smallest set of control functions that must remain available for Mishti AI to operate safely:

- constitutional enforcement
- identity and authority enforcement
- task admission and bounded brain flow
- builder trust and routing control
- evidence continuity
- emergency kill and degraded-state control
- survival coordination

## 3. Kernel Boundaries

The MAK must govern, but not absorb, the following subsystems:

- Governance Engine
- Brain
- Builders
- Librarian
- Documentor Mesh
- Police and Sentinel layer
- Runtime and execution layers

The kernel defines control boundaries between these systems and prevents ungoverned coupling.

## 4. Required Kernel Services

### 4.1 Constitutional Gate

Evaluates whether actions are constitutionally allowed before execution or promotion.

### 4.2 Authority Gate

Validates actor identity, signing authority, scope, trust class, and revocation state.

### 4.3 Task Admission Gate

Determines whether a goal, task, or plan may enter the active execution path.

### 4.4 Builder Routing Gate

Restricts builder assignment based on trust, capability, health, and current governance state.

### 4.5 Evidence Gate

Requires evidence continuity and documentor visibility for meaningful state transitions.

### 4.6 Kill and Survival Controller

Controls hard stop, freeze, degrade, isolate, and recovery-only states.

## 5. Minimal First-Life Kernel Topology

For first life, the kernel should run as a minimal distributed control plane with no single non-replaceable runtime dependency.

Minimum operating topology:

- one governance authority path
- one identity and trust-root path
- one Librarian registry path
- one evidence anchoring path
- one Brain control path
- at least one builder execution path
- kill-state control reachable outside the main autonomy path

## 6. Kernel Inputs

The MAK consumes:

- constitutional rules
- governance policies
- owner-approved keys
- actor identity claims
- builder trust records
- task and plan metadata
- runtime health and survival signals
- documentor evidence continuity status

## 7. Kernel Outputs

The MAK produces:

- allow, deny, degrade, freeze, isolate, or kill decisions
- task admission outcomes
- builder routing approvals
- trust and authority decisions
- survival mode transitions
- evidence gating decisions

## 8. Non-Negotiable Invariants

- no kernel bypass is permitted for protected operations
- no self-modification of kernel rules without governed owner approval
- no unrecorded protected action
- no implicit trust
- no irreversible destructive path without explicit authorization or kill-state rule

## 9. First-Life Exclusions

The MAK first-life scope does not require:

- full-scale distributed consensus across all nodes
- unrestricted autonomous research behavior
- self-issued constitutional changes
- unbounded self-replication
- provider-specific lock-in

## 10. Operator Examples

Representative first-life operator surfaces may use the `mt` prefix:

- `mt governance status`
- `mt kernel mode`
- `mt brain pause`
- `mt builder quarantine <builder-id>`
- `mt survival enter-degraded`
- `mt emergency kill`

These are examples of control surfaces, not implementation commitments.

## 11. Failure Behavior

If the MAK loses certainty about authority, constitutional state, evidence continuity, or kill-path reachability, it must prefer:

1. deny
2. degrade
3. isolate
4. freeze

before allowing continued autonomous behavior.

## 12. Conclusion

The MAK is the minimum governed kernel required for first operational life. It exists to keep Mishti AI live, bounded, and recoverable under owner authority rather than to maximize autonomy or throughput.
