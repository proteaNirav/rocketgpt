# RocketGPT Memory Data Schemas

**Document ID:** CM-29  
**Status:** Production Architecture Specification  
**Owner:** RocketGPT Architecture  
**Last Updated:** 2026-03-06

## 1. Result Memory Schema

### Canonical Fields

- `result_id` (string, required)
- `action_id` (string, required)
- `metrics_before` (object, required)
- `metrics_after` (object, required)
- `governance_status` (string, required)
- `timestamp` (string, ISO-8601 UTC, required)

### JSON Example

```json
{
  "result_id": "res_01JZA1Q2S8X4M2F7A9D0P3T6N4",
  "action_id": "act_plan_execute_4821",
  "metrics_before": {
    "plan_latency_ms": 412,
    "timeout_rate": 0.021
  },
  "metrics_after": {
    "plan_latency_ms": 336,
    "timeout_rate": 0.016
  },
  "governance_status": "approved",
  "timestamp": "2026-03-06T12:10:45.117Z"
}
```

## 2. Creative Memory Schema

### Canonical Fields

- `creative_id` (string, required)
- `idea_summary` (string, required)
- `origin_context` (object, required)
- `status` (enum: `adopted`, `deferred`, `rejected`, required)
- `confidence` (number, 0.0-1.0, required)
- `timestamp` (string, ISO-8601 UTC, required)

### JSON Example

```json
{
  "creative_id": "crv_01JZA1R5N6V9B1C4E8K2Q7M0H3",
  "idea_summary": "Use staged retrieval before synthesis for low-latency planning.",
  "origin_context": {
    "session_id": "sess_6f9f2f03c85d",
    "task_type": "plan_generation"
  },
  "status": "deferred",
  "confidence": 0.74,
  "timestamp": "2026-03-06T12:14:02.590Z"
}
```

## 3. Consortium Decision Memory Schema

### Canonical Fields

- `decision_id` (string, required)
- `topic_id` (string, required)
- `participants` (array of objects, required)
- `arguments` (array of strings, required)
- `objections` (array of strings, required)
- `final_decision` (string, required)
- `rationale` (string, required)
- `conditions` (array of objects, required)
- `timestamp` (string, ISO-8601 UTC, required)

### JSON Example

```json
{
  "decision_id": "dec_01JZA1T0K2R8A7M4N9P1D5F3W6",
  "topic_id": "topic_routing_drift_992",
  "participants": [
    { "id": "expert.ops.1", "role": "Systems Expert" },
    { "id": "expert.risk.2", "role": "Risk Expert" }
  ],
  "arguments": [
    "Adaptive thresholding reduces fallback spikes.",
    "Evidence supports lower timeout rate under constrained load."
  ],
  "objections": [
    "Insufficient cross-tenant validation sample."
  ],
  "final_decision": "approve_with_conditions",
  "rationale": "Expected reliability gain with bounded rollout safeguards.",
  "conditions": [
    {
      "condition_id": "cond_102",
      "required_action": "Run staged rollout at 10 percent traffic for 24h."
    }
  ],
  "timestamp": "2026-03-06T12:20:18.901Z"
}
```

## 4. Cognitive Memory Schema

### Canonical Fields

- `pattern_id` (string, required)
- `pattern_type` (string, required)
- `success_rate` (number, 0.0-1.0, required)
- `contexts_used` (array of strings, required)
- `timestamp` (string, ISO-8601 UTC, required)

### JSON Example

```json
{
  "pattern_id": "pat_01JZA1V3Y8M2Q6H4T1R9C7N5L0",
  "pattern_type": "retrieval_first_planning",
  "success_rate": 0.86,
  "contexts_used": [
    "plan_generation",
    "incident_triage"
  ],
  "timestamp": "2026-03-06T12:24:33.224Z"
}
```

## 5. Dream Memory Schema

### Canonical Fields

- `dream_id` (string, required)
- `dream_type` (string, required)
- `confidence` (number, 0.0-1.0, required)
- `generated_from` (array of strings, required)
- `timestamp` (string, ISO-8601 UTC, required)

### JSON Example

```json
{
  "dream_id": "drm_01JZA1W8F9A3D2K7M4P6R0T5Q1",
  "dream_type": "cross-domain hypothesis",
  "confidence": 0.63,
  "generated_from": [
    "pat_01JZA1V3Y8M2Q6H4T1R9C7N5L0",
    "res_01JZA1Q2S8X4M2F7A9D0P3T6N4"
  ],
  "timestamp": "2026-03-06T12:27:11.037Z"
}
```

## 6. Relationship Memory Schema

### Canonical Fields

- `source_entity` (string, required)
- `target_entity` (string, required)
- `relationship_type` (string, required)
- `weight` (number, 0.0-1.0, required)
- `timestamp` (string, ISO-8601 UTC, required)

### JSON Example

```json
{
  "source_entity": "sugg_74c0b2",
  "target_entity": "res_01JZA1Q2S8X4M2F7A9D0P3T6N4",
  "relationship_type": "produced_result",
  "weight": 0.92,
  "timestamp": "2026-03-06T12:31:55.412Z"
}
```

## Schema Conformance Notes

- All schema instances must pass Zero-Trust and governance validation before persistence.
- `timestamp` values must be UTC ISO-8601.
- Unknown optional fields are permitted only under backward-compatible schema evolution policy.
