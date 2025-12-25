# RGPT-S2-B-03 — Planner → Decision Ledger Insert Mapping

## Purpose
Define a deterministic, auditable mapping from `ExecutionPlan.json` (planner.v1)
to a single append-only row in `rgpt_planner_plan_ledger`.

This document is a **contract**. Runtime code must follow it exactly.

---

## Source Artifact
- ExecutionPlan.json (schema_version = planner.v1)

---

## Target Table
- public.rgpt_planner_plan_ledger

---

## Field Mapping (Authoritative)

| Ledger Column | Source JSON Path | Notes |
|---------------|------------------|-------|
| plan_id | $.plan_id | Must be identical |
| schema_version | $.schema_version | Must equal planner.v1 |
| phase | $.phase | Must equal S2 |
| status | $.status | One of allowed enum |
| plan_hash | $.hash | sha256:… canonical hash |
| intent_hash | $.input_fingerprint.intent_hash | |
| repo_state_hash | $.input_fingerprint.repo_state_hash | |
| policy_state_hash | $.input_fingerprint.policy_state_hash | |
| approval_required | $.approvals.required | boolean |
| approval_status | $.approvals.approval_status | pending / approved / rejected |
| approval_ref | (external) | Link to approval request artifact |
| supersedes_plan_id | (external / optional) | Used only when superseding |
| plan_json | $ (entire document) | Stored verbatim |

---

## Insert Rules (MUST)

1. INSERT ONLY  
   - No UPDATE  
   - No DELETE  

2. Hash Integrity  
   - `plan_hash` MUST equal canonical hash of `plan_json`

3. Approval Safety  
   - If approval_required = true AND approval_status != approved  
     → execution is BLOCKED (ledger allows insert, orchestrator blocks run)

4. Supersession  
   - A superseding plan INSERTS a new row  
   - Old row remains immutable  
   - supersedes_plan_id references prior plan_id

5. Idempotency  
   - (plan_id, plan_hash) is UNIQUE  
   - Re-insert of identical plan is rejected by constraint

---

## Explicit Non-Goals
- Execution permissions
- Auto-approval
- Plan mutation

---

## Consumers
- Planner (writer)
- Decision Ledger (store)
- Approval Gate (reader)
- Orchestrator (reader)

LOCK STATUS: DRAFT (to be locked in B-03 closure)
