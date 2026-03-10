# RocketGPT Creative Project Management Framework

**Document ID:** CM-35  
**Status:** Production Architecture Specification  
**Owner:** RocketGPT Architecture  
**Last Updated:** 2026-03-06

## 1. Purpose

Creative exploration must be structured and governed to convert speculative ideas into measurable, safe, and auditable outcomes. In a cognitive system, unmanaged creativity can produce uncontrolled execution risk, policy drift, and low-quality experimentation.

This framework ensures:

- creative work is aligned to explicit objectives and evaluation criteria;
- exploration remains bounded by governance and risk controls;
- outcomes and failures are captured for system learning and memory.

## 2. Idea Lifecycle

Canonical lifecycle:

`dream insight -> topic proposal -> exploration project -> consortium review -> execution -> learning`

Lifecycle rules:

- dream insights are non-authoritative until reviewed;
- project initiation requires scope, risk class, and success criteria;
- execution must be policy-authorized and trace-linked;
- all lifecycle transitions must emit auditable events.

## 3. Creative Project Types

### Exploratory

Investigates new hypotheses where uncertainty is high and evidence is limited.

### Experimental

Tests defined assumptions in controlled conditions with measurable outcomes.

### Optimization

Improves existing workflows, strategies, or performance baselines.

### Strategic

Targets long-horizon capability shifts, architectural direction, or major policy-aligned transformation.

## 4. Project Governance

Every creative exploration project must define:

- `objective`
- `risk_level`
- `expected_impact`
- `evaluation_metrics`

Governance requirements:

- risk-level-appropriate review path (including consortium when required);
- explicit execution permissions and policy scope;
- clear stop conditions for unsafe or non-performing projects.

Risk gate contract:

- no creative project may transition from exploration or proposal state into execution or rollout state without formal risk classification under CM-34 and required governance review where applicable.
- dream-derived ideas must follow Dream Engine review and proposal controls before project execution.
- creative projects that affect active entities must pass lifecycle and governance transition checks.

## 5. Project Tracking

Each project must track:

- progress
- outcomes
- failures
- lessons learned

Tracking requirements:

- milestones and status updates are timestamped and lineage-linked;
- outcome metrics are compared against declared evaluation metrics;
- failures and lessons feed Learning Output and Memory Fabric updates.

## 6. Project Completion

A project must end with one completion state:

- success
- failure
- partial success
- deferred outcome

Completion controls:

- final state requires rationale and evidence summary;
- deferred outcomes must define explicit re-entry criteria;
- completion artifacts are stored for replay, audit, and future project selection.

## Architecture Diagram

```mermaid
flowchart LR
    DI[Dream Insight] --> TP[Topic Proposal]
    TP --> EP[Exploration Project]
    EP --> CR[Consortium Review]
    CR --> EX[Execution]
    EX --> LR[Learning]
    LR --> MF[Memory Fabric]
```

## Enforcement Statement

Creative initiatives are valid only when governed as structured projects with explicit objectives, risk controls, measurable outcomes, and auditable completion states.

## Related Specifications

- [CM-27 Dream Engine Architecture](./CM-27-dream-engine-architecture.md)
- [CM-34 Risk Management and Mitigation Framework](./CM-34-risk-management-framework.md)
- [CM-40 Cognitive Life Cycle Management](./CM-40-cognitive-life-cycle-management.md)
