# Planner ↔ Orchestrator Handoff Contract

**Contract Version:** S2-B-05.v1 (plan schema) + S2-B-06.v1 (execution envelope)  
**Status:** Authoritative  

---

## 1. Purpose

This document defines the **deterministic handoff contract** between the Planner
and the Orchestrator in RocketGPT.

The goal is to ensure:
- zero execution without approval
- no scope drift
- auditable execution
- controlled delegation (including Claude Code)

---

## 2. Core Principles

1. Planner decides **what and why**
2. Orchestrator executes **how and when**
3. No execution without validation
4. Scope is immutable after approval
5. Evidence is mandatory
6. No silent retries

---

## 3. Plan Artifact Contract (Schema v1)

**Location**
docs/plans/PLAN_<plan_id>.json

### Required Fields
- contract_version
- plan_id
- goal_id
- created_at (UTC)
- planner
- status (must be APPROVED)
- risk
- scope
- tasks
- execution
- approval
- success_criteria

---

## 4. Validation Rules

Execution MUST fail if any rule fails.

### Structural
- status must be APPROVED
- at least one task
- scope.allowed must exist

### Risk
- risk.level > 3 → fail
- risk.level == 3 → explicit approval required

### Scope
- Orchestrator executes only approved scope
- Any deviation → fail fast

### Delegation
If Claude Code is enabled:
- file-level only
- no new tasks
- no plan mutation
- no bypass of validation

---

## 5. Execution Envelope (S2-B-06)

### State Machine

1. RECEIVED
2. VALIDATED
3. LOCKED
4. EXECUTING
5. EVIDENCED
6. COMPLETED / FAILED
7. REPORTED

Rules:
- No EXECUTING without LOCKED
- Any task failure → FAILED
- No auto-retry

---

## 6. Plan Hash Lock

- SHA256 hash computed at start
- Stored in EXECUTION_HEADER.json
- Hash mismatch → execution refused

---

## 7. Evidence Structure

Base folder:
docs/ops/executions/<plan_id>/

Required files:
- EXECUTION_HEADER.json
- TASK_<task_id>.json
- EXECUTION_SUMMARY.md (optional/manual)

---

## 8. Tooling

- rgpt-plan-validate.ps1
- rgpt-orch-start.ps1
- rgpt-orch-task.ps1

---

## 9. Non-Goals

This contract does NOT cover:
- re-planning
- self-heal
- self-improve
- autonomous retries
