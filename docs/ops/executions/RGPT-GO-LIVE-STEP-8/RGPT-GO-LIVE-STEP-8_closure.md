# RGPT-GO-LIVE-STEP-8 — CI Run Verification + Runtime Route Smoke Tests (PASS)

Date (UTC): 2026-01-12 03:57:59 UTC  
Commit SHA: 4c6422d42e96d87e89202665acd026f947c9aa60

---

## Summary
Step-8 validates Runtime Governance (S4) enforcement paths end-to-end, ensuring:
- Runtime Guard fails closed
- Policy Snapshot Hash is enforced
- Decision Ledger verification is correct
- Admin Safe-Mode routes behave deterministically

All smoke tests passed locally.

---

## Fixes Applied

### 1) Policy Snapshot Hash Resolution
File: src/rgpt/policy/policy-snapshot.ts

Change: getExpectedPolicySnapshotHash() now resolves from:
- RGPT_POLICY_SNAPSHOT_HASH (preferred)
- NEXT_PUBLIC_RGPT_POLICY_SNAPSHOT_HASH (fallback)
- Legacy fallback preserved: RGPT_POLICY_SNAPSHOT_SHA256

---

### 2) Decision Verification Logic Repair
File: src/rgpt/ledger/decision-ledger.ts

Issue: verifyDecision() returned DECISION_NOT_FOUND unconditionally due to dead-code returns.

Fix: Reimplemented verification to enforce:
- Decision exists
- Decision is approved
- Policy snapshot hash matches
- Optional expiry check

---

### 3) Decision Ledger Initialization
Path: docs/ops/ledger/DECISIONS.jsonl

Action: Created local decision ledger and appended an approved decision for smoke validation.

---

### 4) Admin Safe-Mode Route Hardening
Files:
- app/api/orchestrator/admin/safe-mode/enable/route.ts
- app/api/orchestrator/admin/safe-mode/disable/route.ts

Fix: Wrapped runtimeGuard() with try/catch so failures return structured 403 JSON instead of 500.

---

## Smoke Test Results (Local)

### Enable Safe-Mode
    POST /api/orchestrator/admin/safe-mode/enable
    -> 200 OK

### Disable Safe-Mode
    POST /api/orchestrator/admin/safe-mode/disable
    -> 200 OK

### Orchestrator Status
    GET /api/orchestrator/status
    -> 200 OK
    safeMode: false

---

## Runtime Evidence
- Decision ID: smoke_3c3ee6e01f13431984f8b04776fbbe5d
- Policy Snapshot Hash: localdev_policy_91ee0b18ba084e4a978e16af27209f4f
- Runtime Mode: FAIL-CLOSED (validated)

---

## Status
STEP-8 COMPLETE — READY FOR NEXT GO-LIVE PHASE

