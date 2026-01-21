# RGPT-S4-A2-01 — Runtime Ledger Normalization (Plan)

## Goal
Normalize the runtime/execution ledger into a single canonical contract that is append-only, replay-safe, and audit-grade.

## Scope (this execution)
- Define canonical ledger contract (Execution + Decision)
- Enforce invariants (immutability, correlation IDs, actor identity)
- Align write paths to ledger (server-side only; no UI)
- Add minimal read-only API surface for verification (optional, if already present)

## Non-goals
- UI/Viewer
- Approval UX
- CAT marketplace
- Self-improve expansion

## Deliverables
- Contract doc: fields + semantics
- Schema changes (if needed)
- Write path implementation updates
- Evidence: passing required checks + verification notes
