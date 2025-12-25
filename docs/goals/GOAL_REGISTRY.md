# RocketGPT â€” Goal Registry (v1)

## Strategic Goals (SG)

SG-001
- Title: Safe, Trustworthy AI Orchestrator
- Owner: Human
- Success Criteria:
  - Autonomous execution with human override
  - Decision confidence tracked
- Exit Condition:
  - Stable S3 release
- Status: ACTIVE

---

## Phase Goals (PG)

PG-S2-001
- Parent SG: SG-001
- Title: Operational Intelligence & Controlled Autonomy
- Phase: S2
- Success Criteria:
  - Planner active
  - Human-in-the-loop approvals
- Exit Condition:
  - All S2 sub-phases closed
- Status: ACTIVE

---

## Execution Goals (EG)

EG-S2-A-001
- Parent PG: PG-S2-001
- Title: Implement Goal Registry
- Owner: RocketGPT
- Priority: HIGH
- Success Criteria:
  - Goals stored and readable
  - Explicit Done conditions
- Exit Condition:
  - Registry consumed by Planner
- Status: IN_PROGRESS

---

## Goal Scoring (v1)

Each goal can be scored to support prioritization.

Scales (0â€“5):
- Impact: business/value impact if completed
- Urgency: time sensitivity / deadlines
- Risk: blast radius if wrong (also drives approvals)
- Effort: relative implementation effort

PriorityScore (0â€“100) formula:
- Impact * 8
- + Urgency * 6
- + Risk * 5
- - Effort * 4

Bands:
- 70â€“100: Must-do (top focus)
- 50â€“69: Next-up
- 0â€“49: Backlog / parked

Approval guidance:
- Risk 0â€“2: can auto-execute if confidence is high
- Risk 3: requires checkpoint approval
- Risk 4â€“5: requires explicit approval



---

## Execution Goals (EG)

EG-S2-A-003
- Parent PG: PG-S2-001
- Title: Planner reads Goal Registry and selects next actionable goal
- Owner: RocketGPT
- Priority: HIGH
- Impact: 4
- Urgency: 5
- Risk: 3
- Effort: 2
- PriorityScore: 4*8 + 5*6 + 3*5 - 2*4 = 32 + 30 + 15 - 8 = 69
- Success Criteria:
  - A parser can extract goals into structured JSON
  - A deterministic "next goal" selector exists
  - Evidence recorded (doc + sample output)
- Exit Condition:
  - Goal selection output committed under docs/ops/
- Status: IN_PROGRESS

