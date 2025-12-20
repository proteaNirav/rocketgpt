# RocketGPT — Phase S1 — Step S1-B
## Self-Heal Playbook Registry (v1)

Status: LOCKED  
Scope: Recommendation only (no execution)

---

## Purpose
Defines **how RocketGPT responds** to known signals.
Each playbook results in **one Heal Decision** and **one Ledger entry**.

---

## Playbook Structure

| Field | Description |
|----|-----------|
| signal_code | Incoming signal |
| default_decision_mode | recommend / block / none |
| confidence_baseline | Starting confidence |
| requires_human_review | Always true in S1 |
| summary_template | Decision summary |
| reasoning_template | Reasoning logic |
| proposed_actions | Suggested next steps |

---

## Playbooks

### CI_TEST_FAIL
- signal_code: CI_TEST_FAIL
- default_decision_mode: recommend
- confidence_baseline: 80
- requires_human_review: true
- summary_template: Recommend re-run of failed test
- reasoning_template: Test failure detected in CI pipeline
- proposed_actions:
  - re-run test
  - inspect recent commits
  - check Safe-Mode gate

---

### CI_FLAKY_PATTERN
- signal_code: CI_FLAKY_PATTERN
- default_decision_mode: recommend
- confidence_baseline: 85
- requires_human_review: true
- summary_template: Suspected flaky test detected
- reasoning_template: Repeated intermittent failures observed
- proposed_actions:
  - isolate test
  - tag as flaky
  - review timing dependencies

---

### POLICY_SAFE_MODE
- signal_code: POLICY_SAFE_MODE
- default_decision_mode: block
- confidence_baseline: 95
- requires_human_review: true
- summary_template: Execution blocked by Safe-Mode
- reasoning_template: Safe-Mode policy is active
- proposed_actions:
  - review Safe-Mode toggle
  - obtain manual approval

---

### SYS_DEP_UNAVAILABLE
- signal_code: SYS_DEP_UNAVAILABLE
- default_decision_mode: recommend
- confidence_baseline: 90
- requires_human_review: true
- summary_template: Dependency unavailable
- reasoning_template: Health probe failed for dependency
- proposed_actions:
  - check service health
  - retry after cooldown
  - fail gracefully

---

## Rules (Hard)
- No playbook may execute actions in Phase S1
- Confidence may only increase via evidence
- Every playbook invocation must be ledgered

