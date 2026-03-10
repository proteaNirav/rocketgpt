# Rating Evidence Events (REE)

**Document ID:** CM-13  
**Status:** Production Architecture Specification  
**Owner:** RocketGPT Architecture  
**Last Updated:** 2026-03-06

## 1. REE Schema

Rating Evidence Events (REE) are canonical evidence records used by the Learner Reputation Engine to justify score updates.

Required schema fields:

- `ree_version`
- `event_id`
- `event_type`
- `occurred_at`
- `tenant_id`
- `session_id`
- `learner_id`
- `suggestion_id` (if applicable)
- `packet_id`
- `trace_id`
- `source`
- `evidence_payload`
- `integrity.payload_hash`
- `integrity.signature`
- `governance.policy_tags`

Recommended fields:

- `confidence`
- `severity`
- `baseline_ref`
- `reason_code`
- `artifact_refs`
- `correlation_id`

## 2. Trusted Evidence Sources

REE accepts evidence only from approved, identity-verified source classes.

Primary evidence classes (direct Learner Rating inputs):

- chat outcomes;
- CATS execution outcomes;
- governance decision services;
- external validated runtime or business telemetry systems.

Derived Signals (advisory only, not direct Learner Rating inputs):

- messenger tunnel receipts and delivery telemetry;
- replay/repair reconciliation services;
- consortium decision packet emitters;
- routing and quarantine event streams.

Source requirements:

- cryptographic identity and active authorization;
- registered source capability and domain scope;
- non-repudiable signing key under approved trust chain.

## 3. Evidence Verification

Verification is mandatory before REE contributes to Learner Ratings.

Verification pipeline:

1. schema and required-field validation
2. source identity and certificate/token validation
3. signature and payload-hash verification
4. lineage validation (`packet_id`, `trace_id`, `learner_id`)
5. policy and scope validation (tenant/session/classification)
6. freshness and replay-window checks
7. confidence and completeness checks
8. acceptance, quarantine, or rejection decision

Rules:

- unverifiable evidence cannot affect Learner Ratings;
- Derived Signals may enrich analysis context but cannot directly change Learner Ratings;
- partially valid evidence may be stored but marked non-scoring;
- rejected evidence must include auditable reason codes.

## 4. Example Events

### Example A: Positive Execution Outcome

- `event_type`: `cats.execution.outcome`
- signal: suggestion reduced `plan_latency_ms` and improved success rate
- expected effect: positive score delta in outcome quality dimension

### Example B: Governance Denial

- `event_type`: `governance.decision.denied`
- signal: promotion denied due to policy mismatch
- expected effect: negative compliance-weighted score impact

### Example C: Replay Repair Failure

- `event_type`: `replay.repair.failed`
- signal: reprocessed suggestion still violates quality threshold
- expected effect: advisory reliability context; not a direct Learner Rating input

### Example D: Consortium Qualified Approval

- `event_type`: `consortium.decision.conditional_approve`
- signal: accepted with constraints and evidence caveats
- expected effect: advisory context for governance and promotion; not a direct Learner Rating input

## 5. Event Lifecycle

REE lifecycle:

1. **Emit:** trusted source publishes REE.
2. **Ingest:** registry accepts event to validation queue.
3. **Verify:** integrity, identity, scope, and lineage checks run.
4. **Classify:** scoring-eligible vs non-scoring evidence.
5. **Apply:** eligible REE updates Learner Rating factors/windows.
6. **Persist:** immutable event record stored with verification result.
7. **Audit/Replay:** event is available for forensic replay and recomputation.
8. **Expire/Archive:** retention policy governs lifecycle end state.

## Sample REE JSON

```json
{
  "ree_version": "1.0.0",
  "event_id": "ree_01JZ9W4M9Y2KQ7DT8R4N1M3H6P",
  "event_type": "cats.execution.outcome",
  "occurred_at": "2026-03-06T11:04:33.455Z",
  "tenant_id": "tenant_acme",
  "session_id": "sess_6f9f2f03c85d",
  "learner_id": "learner.plan.optimizer.v3",
  "suggestion_id": "sugg_74c0b2",
  "packet_id": "kp_01JZ9W4HF6D0A6RZJ2Q1QY4E9W",
  "trace_id": "trc_4fa9f58df5d24718ad67",
  "source": {
    "id": "cats.exec.telemetry",
    "type": "runtime_service",
    "instance_id": "cats-exec-21"
  },
  "evidence_payload": {
    "quality_delta": 0.11,
    "plan_latency_ms_before": 412,
    "plan_latency_ms_after": 336,
    "timeout_rate_before": 0.021,
    "timeout_rate_after": 0.016,
    "baseline_ref": "ikl://benchmarks/plan/run-4202"
  },
  "confidence": 0.84,
  "governance": {
    "policy_tags": ["tenant-scoped", "evidence-required"]
  },
  "integrity": {
    "alg": "ed25519",
    "payload_hash": "sha256:8ef47e3f948f9f0357f9692d078f2cb2a94a4f839df43de5f250b157f0a6b913",
    "signature": "base64:X2Fj...snip...",
    "key_id": "kid_cats_exec_2026q1"
  }
}
```

## Enforcement Statement

Only verified, lineage-complete, policy-compliant REE records may influence Learner Ratings, and every scoring decision must be traceable to accepted evidence events.

