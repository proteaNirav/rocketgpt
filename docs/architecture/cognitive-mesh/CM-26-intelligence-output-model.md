# RocketGPT Intelligence Output Model (IOM)

**Document ID:** CM-26  
**Status:** Production Architecture Specification  
**Owner:** RocketGPT Architecture  
**Last Updated:** 2026-03-06

## 1. Purpose of the Intelligence Output Model

The Intelligence Output Model (IOM) defines how Cognitive Mesh reasoning is transformed into standardized, executable, and auditable outputs. Structured outputs are required to ensure:

- deterministic handoff from reasoning to execution;
- governance and Zero-Trust policy enforcement at each transition;
- measurable outcomes for evaluation and Learner Rating evidence;
- reliable conversion of outcomes into learning and memory artifacts.

Without a standardized model, outputs become non-comparable, non-governable, and difficult to replay or learn from.

## 2. Intelligence Cycle

The Cognitive Mesh intelligence cycle:

1. Observation  
2. Context Building  
3. Reasoning  
4. Evaluation (Consortium when required)  
5. Decision  
6. Execution (CATS)  
7. Outcome  
8. Evidence Events  
9. Learning  
10. Memory

Cycle rules:

- each stage emits lineage-linked artifacts;
- high-risk stages require governance and/or consortium controls;
- cycle completion requires outcome and evidence emission, not only execution.

## 3. Core Intelligence Outputs

### 3.1 Decision Output

Decision artifact representing selected intent, rationale, and constraints.

```json
{
  "decision_id": "dec_01JZB4R9H3K7Q2D5M8T1C6P4N0",
  "topic_id": "topic_plan_optimization_221",
  "decision_type": "approve_with_conditions",
  "rationale": "Retrieval-first path improves expected latency under current load.",
  "constraints": ["latency_p95_lt_500ms", "governance_gate_required"],
  "timestamp": "2026-03-06T13:02:14.221Z"
}
```

### 3.2 Action Output

Execution-ready action artifact derived from a decision.

```json
{
  "action_id": "act_01JZB4T1K8P5A3C6R2M9D7F4Q1",
  "decision_id": "dec_01JZB4R9H3K7Q2D5M8T1C6P4N0",
  "workflow": "cats.plan.execute",
  "inputs": {
    "strategy": "retrieval_first",
    "scope": "tenant_acme"
  },
  "authorization_scope": "cats.execute.plan",
  "timestamp": "2026-03-06T13:03:06.440Z"
}
```

### 3.3 Result Output

Measured execution outcome artifact from CATS.

```json
{
  "result_id": "res_01JZB4V4N2Q8M1D7C5R9T3F6K0",
  "action_id": "act_01JZB4T1K8P5A3C6R2M9D7F4Q1",
  "status": "success",
  "metrics_before": { "plan_latency_ms": 410, "timeout_rate": 0.021 },
  "metrics_after": { "plan_latency_ms": 334, "timeout_rate": 0.016 },
  "governance_status": "approved",
  "timestamp": "2026-03-06T13:03:42.993Z"
}
```

### 3.4 Learning Output

Learning artifact generated from result + evidence analysis.

```json
{
  "learning_id": "lrn_01JZB4W9F6P2C8R1M5D7Q3T4A0",
  "source_result_id": "res_01JZB4V4N2Q8M1D7C5R9T3F6K0",
  "learning_type": "strategy_delta",
  "proposed_change": "increase retrieval-first priority for similar contexts",
  "confidence": 0.84,
  "promotion_candidate": true,
  "timestamp": "2026-03-06T13:04:17.118Z"
}
```

## 4. Intelligence Output Pipeline

Canonical pipeline:

`Decision Packet -> Action Packet -> Execution (CATS) -> Result Packet -> Evidence Events -> Learning Packet -> Memory Fabric`

Pipeline guarantees:

- every transition preserves lineage (`decision_id`, `action_id`, `result_id`, trace IDs);
- failures emit receipts and evidence events;
- learning outputs are governed before promotion to durable knowledge.

## 5. Output Packet Types

IOM packet classes:

- `DecisionPacket`
- `ActionPacket`
- `ExecutionPacket`
- `ResultPacket`
- `LearningPacket`

KPP integration:

- each IOM packet class is serialized and transported as a Knowledge Packet Protocol-compliant packet;
- packet family mapping is policy-defined (`knowledge.bundle`, `knowledge.delta`, `knowledge.directive`, `knowledge.receipt`);
- all required KPP envelope/integrity fields apply unchanged.

Reference: [CM-02 Knowledge Packet Protocol](./CM-02-knowledge-packet-protocol.md)

## 6. Governance and Zero-Trust

All intelligence outputs must pass:

- Zero-Trust validation;
- governance policy checks;
- execution authorization checks.

No DecisionPacket, ActionPacket, ExecutionPacket, ResultPacket, or LearningPacket may bypass these controls.

References:

- [CM-05 Zero-Trust Messaging Architecture](./CM-05-zero-trust-messaging.md)
- [CM-14 Consolidated Governance Rules](./CM-14-consolidated-governance-rules.md)

## 7. Output Observability

Required system metrics:

- `decision_throughput`
- `execution_success_rate`
- `learning_rate`
- `knowledge_promotion_rate`

Metric rules:

- metrics must be lineage-correlated to packet IDs and trace IDs;
- metrics must be segmented by tenant, topic, and workflow class.

## 8. Relationship with Memory Fabric

IOM outputs generate memory classes in the Memory Fabric:

- Result Output -> Result-Based Memory
- Learning Output -> Cognitive Memory
- Decision Output (consortium/governance) -> Consortium Decision Memory
- Creative and exploratory learning artifacts -> Creative Memory

These mappings convert operational intelligence into reusable governed memory substrate.

References:

- [CM-28 Memory Fabric Architecture](./CM-28-memory-fabric-architecture.md)
- [CM-29 Memory Data Schemas](./CM-29-memory-schemas.md)

## 9. Integration with CATS

ActionPackets are the execution trigger contract for CATS workflows.

Integration behavior:

- ActionPacket is authorized and routed to CATS execution endpoints;
- CATS executes declared workflow with scoped inputs;
- CATS emits ExecutionPacket/ResultPacket plus receipts and evidence events;
- resulting artifacts flow into learning and Memory Fabric stages.

## 10. Architecture Diagram

```mermaid
flowchart LR
    OBS[Observation + Context] --> RSN[Reasoning]
    RSN --> EVAL[Evaluation / Consortium]
    EVAL --> DP[DecisionPacket]
    DP --> AP[ActionPacket]
    AP --> CATS[CATS Execution]
    CATS --> EP[ExecutionPacket]
    EP --> RP[ResultPacket]
    RP --> EV[Evidence Events]
    EV --> LP[LearningPacket]
    LP --> MF[Memory Fabric]
```

## Enforcement Statement

The Intelligence Output Model is the mandatory contract for converting reasoning into governed execution, measurable outcomes, and reusable memory. Outputs that do not comply with IOM, KPP, Zero-Trust, and governance controls are non-conformant.
