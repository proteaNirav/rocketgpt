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
