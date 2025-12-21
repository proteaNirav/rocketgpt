# Planner v1 Output Schema (LOCKED)

This folder defines the canonical output contract for RocketGPT Planner v1.

## Artifacts
- ExecutionPlan.template.json (primary machine contract)
- ExecutionPlan.template.md   (human mirror; MUST match JSON)
- README.md                   (lock + rules)

## Lock Rules (MUST)
1. Determinism: identical inputs MUST produce identical plans (after canonicalization).
2. No-execution: Planner output MUST NOT contain runnable commands or tool invocations.
3. Approval gating: if approvals.required = true, execution is BLOCKED until approval_status = approved.
4. Ledger compatibility: plans are append-only; revisions require a new plan_id (or a version bump) and a new hash.
5. Hash integrity: hash MUST be computed from canonical JSON excluding the hash field itself.

## Canonical JSON Rules (for hashing)
- UTF-8
- Stable key ordering (sorted keys)
- No trailing spaces
- Exclude the field: "hash"

## Status Values
- draft
- proposed
- approved
- rejected
- superseded

## Dependency Types
- hard
- soft
- external

## Notes
This schema is treated as a public contract between:
Planner → DecisionLedger → ApprovalGate → Orchestrator/Builder
