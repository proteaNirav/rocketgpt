# Mishti Zero Trust Policy V1

## 1. Purpose

This document defines the first-life zero-trust policy for Mishti AI. It establishes how identity, authority, trust, attestation, and revocation must work before the platform is considered live.

## 2. Policy Position

Mishti AI trusts no actor, node, builder, runtime, or subsystem by default. Trust must be:

- explicit
- scoped
- evidence-backed
- revocable
- time-bounded where appropriate

## 3. Trust Domains

The first-life platform must distinguish at least these trust domains:

- owner root authority
- constitutional and governance authority
- Brain authority
- builder execution authority
- Librarian registry authority
- runtime execution authority
- emergency override authority

Trust in one domain must not imply trust in another.

## 4. Root Authority and Keys

Root keys remain owner-held.

Root authority controls:

- trust-root issuance
- governance signing delegation
- emergency override delegation
- builder registration approval policy
- final recovery authorization

Root keys must not reside on ordinary operational nodes.

## 5. Signing Authorities

The platform should distinguish:

- constitutional signing keys
- governance policy signing keys
- builder registration and promotion signing keys
- runtime attestation keys
- documentor anchoring or receipt signing keys
- emergency override keys

Each key class must have separate issuance, rotation, and revocation policy.

## 6. Zero-Trust Requirements

### 6.1 Identity Verification

All actors must present verifiable identity and role claims before protected actions are allowed.

### 6.2 Scope Binding

All approvals and credentials must be bounded to explicit scopes such as task, capability, builder class, runtime domain, or governance action.

### 6.3 Least Privilege

Actors receive only the minimum authority required for their current task and trust class.

### 6.4 Continuous Re-Evaluation

Trust is not granted once forever. Health, evidence continuity, drift, and policy state must continuously influence trust decisions.

### 6.5 Revocation First

Any actor or node can be reduced, isolated, or revoked without requiring platform-wide restart.

## 7. Builder Authorization Policy

Builders must not be considered executable by default. Builder operation requires:

- registration in the Librarian trust registry
- approved capability declaration
- trust class assignment
- scope allowance
- evidence continuity
- health status

Promotion to higher trust classes requires explicit review and evidence history.

## 8. Brain Authorization Policy

Brain planning and routing authority must be bounded by:

- governance state
- active policy envelope
- task admission rules
- builder trust policy
- kill and degraded-state policy

The Brain may plan and route within scope. It may not mint authority.

## 9. Runtime Authorization Policy

Runtime execution authority must be separately checked from planning authority. Allowed execution requires:

- approved task lineage
- builder or system authority
- runtime policy allowance
- sandbox or host policy compliance
- evidence capture

## 10. Key Rotation and Revocation

First-life design must support:

- planned rotation
- emergency rotation
- scoped revocation
- compromised-node isolation
- re-issuance with preserved audit history

Key rotation must not require constitutional reset.

## 11. Compromise Handling

If a node, builder, or actor is suspected compromised:

1. reduce or revoke scope
2. quarantine affected execution paths
3. preserve evidence and documentor continuity where possible
4. rotate affected credentials
5. require explicit re-authorization before re-entry

## 12. Zero-Trust Decision Outcomes

The system should support these outcomes:

- `allow`
- `allow_limited`
- `deny`
- `degrade`
- `quarantine`
- `revoke`

## 13. First-Life Readiness Requirement

Mishti AI is not live until root authority, scoped signing, rotation policy, revocation paths, and builder or brain authorization boundaries are all defined and enforceable.
