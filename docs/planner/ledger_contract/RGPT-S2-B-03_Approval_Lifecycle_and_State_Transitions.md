# RGPT-S2-B-03 — Approval Lifecycle & State Transitions

## Objective
Define the authoritative lifecycle of approvals for Planner v1 ExecutionPlans,
including allowed states, transitions, and enforcement rules.

This document is a **contract** between:
Planner → Decision Ledger → Approval Gate → Orchestrator

---

## Key Entities
- ExecutionPlan (planner.v1)
- Approval Request (external artifact or ledger entity)
- Decision Ledger (append-only store)

---

## Approval Fields (from ExecutionPlan.json)

| Field | Meaning |
|------|---------|
| approvals.required | Whether approval is mandatory |
| approvals.approval_status | Current approval state |
| approvals.required_level | Authority required (e.g., architect) |
| approval_ref (ledger) | Reference to approval request |

---

## Allowed Approval States

| State | Meaning |
|------|---------|
| pending | Awaiting human decision |
| approved | Explicitly approved |
| rejected | Explicitly rejected |

---

## State Transition Rules (STRICT)

### Valid Transitions
- pending → approved
- pending → rejected

### Invalid Transitions (BLOCKED)
- approved → pending
- approved → rejected
- rejected → approved
- any → null

Once approved or rejected, the state is **terminal**.

---

## Ledger Interaction Rules

1. Planner INSERTS plan with:
   - approval_required = true/false
   - approval_status = pending (if required)

2. Approval decision:
   - DOES NOT mutate existing ledger row
   - INSERTS a new ledger row if plan must change
   - OR updates approval status in a dedicated approval ledger (preferred)

3. Ledger rows representing plans remain immutable.

---

## Execution Enforcement (Critical)

- If approval_required = true AND approval_status != approved  
  → Orchestrator MUST refuse execution

- Ledger MAY store unapproved plans  
  → Execution is still blocked

---

## Supersession Scenario

If a plan is modified after rejection or approval:
- New plan_id (or versioned plan_id)
- supersedes_plan_id references old plan
- New approval lifecycle starts

---

## Audit Guarantees

- Every approval decision is traceable
- No silent approvals
- No implicit transitions

---

## Explicit Non-Goals
- Approval UI
- Notification mechanisms
- Role management

LOCK STATUS: DRAFT (to be locked in B-03 closure)
