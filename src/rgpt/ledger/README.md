# Decision Ledger (RGPT-S4)

This directory defines the **authoritative governance ledger** for RocketGPT.

## Rules
- Ledger is **append-only**
- No runtime execution without decision_id
- Decisions are immutable once written
- Runtime MUST verify:
  - Status = APPROVED
  - Policy hash match
  - Not expired or revoked

## Consumers
- CI pipelines
- Runtime Guard
- Orchestrator
- Self-Heal / Self-Improve

Any violation MUST block execution.
