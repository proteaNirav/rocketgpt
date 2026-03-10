# Knowledge Packet Protocol (KPP)

**Document ID:** CM-02  
**Status:** Production Architecture Specification  
**Owner:** RocketGPT Architecture  
**Last Updated:** 2026-03-06

## 1. Concept of Knowledge Packets

Knowledge Packet Protocol (KPP) is the canonical message contract for exchanging intelligence within the RocketGPT Cognitive Mesh. A knowledge packet is a cryptographically attributable unit of cognition that carries claims, evidence, directives, or outcomes between trusted-but-verified participants.

KPP is designed for:

- uniform interoperability across mesh subsystems;
- policy-aware routing and processing;
- low-latency propagation with deterministic validation;
- end-to-end auditability under Zero-Trust assumptions.

## 2. Packet Envelope Structure

The envelope contains immutable transport and trust metadata used for authentication, authorization, routing, replay defense, and observability.

Envelope sections:

- `identity`: sender identity, tenant scope, session scope, actor class;
- `timing`: creation time, expiration time, TTL budget;
- `routing`: topic family, priority class, intended recipients, hop policy;
- `security`: signature, key reference, hash algorithm, nonce;
- `trace`: trace ID, span ID, parent packet ID, correlation ID;
- `governance`: policy tags, data classification, retention class.

## 3. Packet Payload Structure

The payload contains the semantic knowledge object being exchanged. Payload content is packet-family specific but follows a standard shape.

Payload sections:

- `summary`: short machine- and human-readable intent statement;
- `claims`: assertions, recommendations, or changes;
- `evidence`: references and confidence support;
- `context`: bounded execution/task/session context;
- `actions`: optional execution hints or directives;
- `outcomes`: optional observed result metrics;
- `attachments`: optional compact embedded artifacts.

## 4. Required Fields

The following fields are mandatory for every KPP packet:

- `kpp_version`
- `packet_id`
- `packet_family`
- `created_at`
- `expires_at`
- `tenant_id`
- `session_id` (use `"global"` only for explicitly allowed non-session packets)
- `sender.id`
- `sender.type`
- `trace.trace_id`
- `routing.topic`
- `governance.policy_tags` (at least one tag)
- `integrity.payload_hash`
- `integrity.signature`
- `integrity.key_id`
- `payload.summary`

Packets missing required fields are invalid and must be rejected before routing.

## 5. Packet Families

### 5.1 `knowledge.signal`

Low-cost, high-frequency signal describing event observations or weak hypotheses.

Use cases:

- runtime hints;
- anomaly or drift alerts;
- soft confidence updates.

### 5.2 `knowledge.bundle`

Aggregated and evidence-rich packet containing structured knowledge collections.

Use cases:

- expert recommendations;
- consolidated retrieval outputs;
- cross-source evidence sets.

### 5.3 `knowledge.delta`

Change-set packet proposing modifications to prompts, strategies, routing priors, or library entries.

Use cases:

- learner-generated improvements;
- reputation-weighted parameter adjustments;
- scoped optimization updates.

### 5.4 `knowledge.directive`

Governance- or control-plane directive requiring explicit handling behavior.

Use cases:

- promotion/rollback commands;
- quarantine or denylist actions;
- policy override instructions with authority proof.

### 5.5 `knowledge.receipt`

Acknowledgement packet confirming validation, acceptance, rejection, or processing outcome.

Use cases:

- delivery acknowledgements;
- governance decision responses;
- replay-safe processing receipts.

## 6. Packet Lifecycle

1. **Construct**: producer composes packet with required envelope/payload fields.  
2. **Sign**: producer computes payload hash and cryptographic signature.  
3. **Validate (ingress)**: receiver or edge gateway validates schema, signature, scope, TTL, and policy prerequisites.  
4. **Route**: mesh router dispatches packet according to topic/capability/policy.  
5. **Process**: destination subsystem executes family-specific handlers.  
6. **Emit receipt**: destination emits `knowledge.receipt` with status and evidence pointers.  
7. **Persist/Audit**: packet metadata and lineage events are recorded according to retention policy.  
8. **Expire/Archive**: packet becomes ineligible after TTL or retention cutoff.

## 7. Packet Versioning Rules

KPP uses semantic versioning in `kpp_version` (`MAJOR.MINOR.PATCH`).

- `PATCH`: non-breaking clarifications and optional metadata additions.
- `MINOR`: backward-compatible field additions and new optional families.
- `MAJOR`: breaking changes to required fields, semantics, or validation behavior.

Compatibility rules:

- receivers must reject unknown major versions;
- receivers must ignore unknown optional fields for supported major versions;
- senders must not remove required fields without major bump;
- schema registry must retain at least two previous minor versions for replay support.

## 8. Packet Size and Performance Constraints

Baseline constraints:

- target packet size: <= 16 KB for hot-path packets;
- hard packet size limit: 64 KB (larger payloads must use external artifact references);
- envelope validation budget: <= 2 ms p95;
- end-to-end route + first processing budget: <= 50 ms p95 for priority classes `P0`/`P1`.

Performance rules:

- compress payload only above configured threshold;
- avoid binary blobs in-line on latency-sensitive routes;
- use content-addressable attachment references for large evidence artifacts.

## 9. Packet Transport Rules

- all transport channels must be authenticated and encrypted (mTLS or equivalent);
- every hop must re-validate authorization against tenant/session scope;
- no implicit trust based on network boundary;
- at-least-once delivery is default; idempotency is required for handlers;
- out-of-order tolerance must be explicit per topic;
- dead-letter queues must preserve full envelope + integrity metadata.

## 10. Packet Integrity and Traceability

Integrity requirements:

- canonical JSON serialization prior to hashing/signing;
- `payload_hash` calculated over canonical payload bytes;
- detached or embedded signature accepted only with approved algorithms;
- key rotation supported via `key_id` and trust-chain validation.

Traceability requirements:

- each packet must have globally unique `packet_id`;
- lineage links: `parent_packet_id`, `caused_by`, and `correlation_id`;
- all validation, routing, and processing decisions must emit audit events;
- receipts must include disposition (`accepted`, `rejected`, `deferred`, `quarantined`) and reason code.

## 11. Sample Packet Schema (JSON)

```json
{
  "kpp_version": "1.0.0",
  "packet_id": "kp_01JZ9P3T8Q4C6M7N2B5D1R8F4A",
  "packet_family": "knowledge.bundle",
  "created_at": "2026-03-06T10:15:21.123Z",
  "expires_at": "2026-03-06T10:20:21.123Z",
  "tenant_id": "tenant_acme",
  "session_id": "sess_6f9f2f03c85d",
  "routing": {
    "topic": "cats.plan.enrichment",
    "priority": "P1",
    "recipients": ["mesh-router", "cats-exec"],
    "max_hops": 4
  },
  "sender": {
    "id": "expert.finance.v2",
    "type": "expert",
    "instance_id": "exp-fin-07"
  },
  "trace": {
    "trace_id": "trc_4fa9f58df5d24718ad67",
    "span_id": "spn_92b0f611",
    "parent_packet_id": "kp_01JZ9P3FQ3S8AA2ZD4K77N3DCD",
    "correlation_id": "corr_plan_8892"
  },
  "governance": {
    "policy_tags": ["tenant-scoped", "evidence-required", "no-global-promote"],
    "classification": "internal",
    "retention_class": "audit-30d",
    "promotion_eligible": false
  },
  "payload": {
    "summary": "Bundle of ranked plan alternatives with evidence links.",
    "claims": [
      {
        "id": "claim_1",
        "type": "recommendation",
        "statement": "Use retrieval-first strategy before synthesis.",
        "confidence": 0.87
      }
    ],
    "evidence": [
      {
        "evidence_id": "ev_101",
        "kind": "benchmark",
        "ref": "ikl://benchmarks/plan_latency/run-2031",
        "weight": 0.72
      }
    ],
    "context": {
      "task_type": "plan_generation",
      "constraints": ["latency-p95-<500ms", "governance-gates-required"]
    }
  },
  "integrity": {
    "alg": "ed25519",
    "payload_hash": "sha256:5f1f6e1694f8f7f6f2f2f9f0fcb1a1edb6ff95d40cb7d19cc5ea0f6f34ce3ad4",
    "signature": "base64:QkM4d2xW...snip...",
    "key_id": "kid_mesh_expert_finance_2026q1",
    "nonce": "n_8bcd8fd1fca9"
  }
}
```

## Related Specifications

- [CM-03 Messenger Tunnel Architecture](./CM-03-messenger-tunnel-architecture.md)
- [CM-05 Zero-Trust Messaging Architecture](./CM-05-zero-trust-messaging.md)
- [CM-15 Knowledge Packet Ledger](./CM-15-knowledge-packet-ledger.md)

## Zero-Trust Compatibility Statement

KPP is Zero-Trust compatible by design. Every packet is self-describing for identity, scope, integrity, and governance context, allowing each mesh hop to perform independent verification and policy enforcement before accepting or forwarding content.

