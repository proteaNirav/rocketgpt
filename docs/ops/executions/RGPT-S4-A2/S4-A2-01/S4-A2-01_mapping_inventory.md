# RGPT-S4-A2-01 — Mapping Inventory (Current → Canonical Ledger)

## Objective
List all existing ledger-like tables/files/endpoints and map them to the canonical contract:
- ExecutionRecord
- DecisionRecord

This prevents accidental duplication and ensures we refactor safely.

---

## A) Database objects (Supabase/Postgres)

### Existing tables (to be discovered)
| Object | Purpose today | Used by | Notes |
|---|---|---|---|
| TBD | TBD | TBD | TBD |

### Existing functions/triggers/RLS policies (to be discovered)
| Object | Purpose today | Touches tables | Notes |
|---|---|---|---|
| TBD | TBD | TBD | TBD |

---

## B) Server/API write paths (Next.js routes)

### Existing write routes (to be discovered)
| Route | Writes what | Guarded by | Safe-Mode behavior | Notes |
|---|---|---|---|---|
| TBD | TBD | TBD | TBD | TBD |

---

## C) Code-level ledger helpers / clients

| File/Module | Purpose today | Used by | Notes |
|---|---|---|---|
| TBD | TBD | TBD | TBD |

---

## D) Proposed changes (filled after discovery)

### Option 1 — Adapt existing ledger tables
- Pros:
- Cons:
- Required steps:

### Option 2 — Create new canonical tables + migrate
- Pros:
- Cons:
- Required steps:

---

## E) Decision
Chosen option: TBD
Reason: TBD

---

## A) Database objects (Initial authoritative mapping)

| Object | Purpose today | Used by | Notes |
|---|---|---|---|
| rgpt_runtime_executions | Execution tracking | Orchestrator / CI | ⚠️ To be aligned with ExecutionRecord |
| rgpt_runtime_decisions | Decision outcomes | Policy Gate | ⚠️ Partial, not canonical |
| rgpt_ci_write_ledger (fn) | CI ledger writes | CI workflows | ✅ Exists |
| rgpt_block_ledger_mutation | Guard unsafe writes | Runtime guard | ✅ Exists |

---

## B) Server/API write paths (confirmed)

| Route | Writes what | Guarded by | Safe-Mode behavior | Notes |
|---|---|---|---|---|
| /api/orchestrator/* | Execution flow | runtime-guard | 403 on block | ✅ |
| /api/builder/execute-all | Batch execution | RuntimePermissions | Blocked in safe-mode | ✅ |
| /api/rgpt/runtime-mode | Runtime state | runtime-guard | Read-only | ✅ |

---

## C) Code-level helpers (confirmed)

| File/Module | Purpose | Used by | Notes |
|---|---|---|---|
| runtime-guard.ts | Enforce runtime rules | API routes | ✅ |
| runtime-permissions.ts | Permission snapshot | Builder | ✅ |
| policy_gate.yml | Decision enforcement | CI | ✅ |

---

## D) Directional decision

Chosen option: **Option 2 — Create canonical ledger tables + migrate**
Reason:
- Existing objects are fragmented
- Canonical contract is now defined
- Migration cost is low at this stage

