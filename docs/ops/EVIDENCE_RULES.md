# Evidence Rules (RGPT-S2-B-07)

This document defines **mandatory execution evidence** for Claude-driven tasks.

Execution is **invalid** without required evidence.

---

## 1. Mandatory Evidence (REQUIRED)

Every execution must produce:

### 1.1 File Change List
- List of all files created or modified
- No wildcard or implicit references

### 1.2 Execution Summary
Document:
- What was done
- What was NOT done
- Any deviations from plan

### 1.3 Assumptions Log
Explicitly list:
- Assumptions made
- Why they were safe
- Impact if assumption is wrong

### 1.4 Verification Status
For each artifact:
- Verified manually / partially / not verified
- Reason if not verified

---

## 2. Optional Evidence (RECOMMENDED)

These strengthen confidence but are not mandatory:

- Screenshots
- Command outputs
- Diff snippets
- Test logs
- Validation notes

---

## 3. Evidence Location Rules

- All evidence MUST live under:
  docs/ops/
- Naming must include:
  - Phase (RGPT-S2-B-07)
  - Date or task identifier

Example:
EXECUTION_SUMMARY_RGPT-S2-B-07_2025-12-21.md

---

## 4. Completion Criteria

Execution is considered **DONE** only if:

- All mandatory evidence exists
- Review checklist is completed
- No contract violations detected
- Reviewer decision recorded

---

## 5. Invalid Execution Conditions

Execution is INVALID if:

- Evidence is missing
- Scope is exceeded
- Forbidden actions are taken
- Outputs cannot be reviewed quickly

Invalid executions must be redone.

---

## 6. Authority

Final determination of sufficiency rests with:
**You (Project Owner)**

---

End of Evidence Rules.
