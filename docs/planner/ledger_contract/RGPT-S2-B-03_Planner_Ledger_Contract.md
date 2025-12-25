# RGPT-S2-B-03 — Planner ↔ Decision Ledger Contract

## Objective
Define the append-only storage contract for Planner v1 ExecutionPlans in the Decision Ledger.

## Inputs
- ExecutionPlan.json (planner.v1)

## Outputs
- Ledger record structure (required fields)
- Insert / read / supersede rules
- Approval linkage model
- Integrity verification rules (hash)

## Non-Goals
- Planner runtime implementation
- Orchestrator execution logic

## Sections (to be filled)
1. Ledger storage model (table / document)
2. Required fields + types
3. Constraints (append-only, immutability, supersede)
4. Approval linkage (request + status transitions)
5. Retrieval queries (by plan_id, by correlation_id, latest)
6. Integrity checks (hash + canonicalization expectations)
7. Minimal operational scripts (PowerShell)

