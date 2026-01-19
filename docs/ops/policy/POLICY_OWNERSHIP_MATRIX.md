# POLICY OWNERSHIP MATRIX
**Status:** Authoritative  
**Enforced By:** policy_gate  
**Scope:** RocketGPT Core  
**Last Updated:** 2026-01-02 10:07:37

---

## Ownership Levels

| Level | Name | Description |
|------|------|-------------|
| L0 | System | Immutable. Any modification causes CI failure |
| L1 | Platform Owner | Changeable only via controlled workflow |
| L2 | AI-Assisted | Proposal-only. Never auto-applied |
| L3 | CI Runtime | Read-only enforcement |

---

## Policy Ownership Table

| Policy Area | Path / Artifact | Owner Level | Notes |
|------------|-----------------|-------------|-------|
| Policy Gate workflow | .github/workflows/policy_gate.yml | L0 | Cannot be modified |
| Workflow allowlist | .github/auto-ops.yml | L1 | Controlled updates only |
| Safety labels | safe:workflow-edit, safe:auto-merge | L0 | Mandatory for workflow edits |
| Auto-merge rules | policy_gate.yml | L1 | Requires policy gate pass |
| Self-heal workflows | .github/workflows/self_heal.yml | L1 | Logged & auditable |
| Decision ledger schema | docs/ops/ledger/* | L0 | Structural immutability |
| Execution evidence | docs/ops/executions/* | L3 | Append-only |

---

## Enforcement Rules (Normative)

- Any change to **L0** artifacts ⇒ **CI FAIL**
- L1 artifacts may change **only** via approved workflows
- L2 inputs can never directly mutate repository state
- L3 artifacts are runtime outputs and read-only

---

## Declaration

This matrix is the **single source of truth** for ownership enforcement in RocketGPT.
Any behavior violating this matrix is a defect.

