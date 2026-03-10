# Dynamic Consortium Membership

**Document ID:** CM-10  
**Status:** Production Architecture Specification  
**Owner:** RocketGPT Architecture  
**Last Updated:** 2026-03-06

## 1. Dynamic Council Concept

The Expert Consortium uses a dynamic council model in which membership is continuously re-evaluated from observed merit, relevance, and governance compliance rather than fixed static appointments.

Goals:

- maximize decision quality for current topic domains;
- adapt membership to changing performance signals;
- reduce long-term concentration of influence;
- maintain resilience through rotating expertise coverage.

The council is assembled per review scope and risk class using policy-bound selection logic.

## 2. Learners as Candidates

Learners are eligible to serve as candidate consortium members when their outputs demonstrate sustained quality, evidence discipline, and policy compliance.

Candidate pathway:

1. learner emits high-quality, evidence-linked recommendations in production-adjacent flows;
2. reputation engine confirms minimum performance and reliability thresholds;
3. governance verifies behavioral and security compliance;
4. learner is enrolled into candidate pool with scoped role permissions.

Constraints:

- learner candidacy is topic/domain-scoped;
- candidates cannot self-approve their own promotion artifacts;
- candidate status is revocable on quality, integrity, or policy regressions.

## 3. Membership Rotation Rules

Membership rotates on schedule and event triggers to preserve freshness and reduce systemic bias.

Rotation rules:

- fixed maximum consecutive terms per member per role;
- cooldown interval before re-selection to the same panel class;
- mandatory partial turnover per cycle (for example minimum one-third change);
- immediate rotation triggers on risk, conflict, or sustained underperformance events;
- emergency continuity path allowed for critical incidents with explicit governance approval.

## 4. Eligibility Criteria

Eligibility is determined by measurable merit and compliance indicators.

Required criteria:

- minimum externally validated Learner Reputation score in relevant domain;
- evidence completeness and reproducibility quality above threshold;
- recent decision accuracy and calibration quality;
- low policy violation and security incident rates;
- active identity validity and authorization scope.

Additional eligibility law:

- consortium membership eligibility requires externally validated Learner Reputation scores produced by the Independent Rating Engine;
- internal endorsements or debate participation cannot influence eligibility.

Disqualifiers:

- unresolved integrity or tamper findings;
- repeated governance non-compliance;
- conflict-of-interest flags not mitigated by policy.

## 5. Bias Prevention Rules

The council selection process must actively prevent concentration and systemic bias.

Bias controls:

- diversity constraints across role type, model lineage, and evidence style;
- anti-dominance caps on repeated member selection;
- weighted randomization within qualified candidate bands;
- blind-first evidence scoring before identity reveal where feasible;
- drift and bias audits on voting outcomes over time;
- automatic escalation when bias indicators exceed thresholds.

Bias prevention is enforced as a first-class policy, not an optional preference.

## 6. Chair Limitations

The consortium chair coordinates process flow but does not hold unrestricted authority.

Chair limitations:

- cannot unilaterally override quorum/voting requirements;
- cannot suppress registered dissent records;
- cannot bypass governance gates or Zero-Trust controls;
- must disclose conflicts and recuse when required;
- subject to term limits and rotation rules;
- all chair interventions must be audit-logged with reason codes.

The chair is a procedural coordinator, not a final unilateral decision authority.

## Architecture Diagram

```mermaid
flowchart LR
    CP[Candidate Pool] --> SEL[Membership Selector]
    REP[Reputation Engine] --> SEL
    GOV[Governance Policies] --> SEL
    BIAS[Bias Guardrails] --> SEL
    SEL --> COUNCIL[Dynamic Council]
    COUNCIL --> CHAIR[Chair (Limited Authority)]
    CHAIR --> VOTE[Debate + Voting]
    VOTE --> AUDIT[Audit + Rotation Signals]
    AUDIT --> SEL
```

## Related Specifications

- [CM-11 Learner Reputation Engine](./CM-11-learner-reputation-engine.md)
- [CM-13 Rating Evidence Events](./CM-13-rating-evidence-events.md)

## Enforcement Statement

Consortium membership must remain merit-based, policy-governed, bias-controlled, and auditable, with no permanent authority concentration in members or chair roles.

