# RocketGPT — Phase S1 — Step S1-B
## Heal Decision Output Contract (v1)

Status: LOCKED
Applies to: Self-Heal Engine v1

---

## Purpose
Defines the canonical output of the Self-Heal Engine.
Every heal decision must conform to this contract before being ledgered.

---

## Decision Modes

| Mode | Meaning |
|------|--------|
| recommend | Suggest action, no execution |
| block | Explicitly block execution |
| none | No action required |

(Auto-execute is forbidden in Phase S1)

---

## Contract Fields

| Field | Type | Required |
|------|------|----------|
| signal_code | string | Yes |
| signal_source | string | Yes |
| decision_mode | enum | Yes |
| decision_summary | string | Yes |
| reasoning | string | Yes |
| confidence_score | number (0–100) | Yes |
| requires_human_review | boolean | Yes |
| proposed_actions | array[string] | No |
| rollback_required | boolean | No |

---

## Example (JSON)

    {
      "signal_code": "CI_TEST_FAIL",
      "signal_source": "Playwright",
      "decision_mode": "recommend",
      "decision_summary": "Recommend re-run with Safe-Mode disabled",
      "reasoning": "Failure matches known flaky test pattern under Safe-Mode",
      "confidence_score": 82.5,
      "requires_human_review": true,
      "proposed_actions": [
        "re-run test",
        "inspect Safe-Mode gate"
      ],
      "rollback_required": false
    }

---

## Ledger Mapping
- decision_summary -> decision
- reasoning -> reasoning
- confidence_score -> confidence_score
- decision_mode -> action_mode