# Mishti Documentor Mesh Domain Model

## 1. Purpose

This document defines the implementation-oriented domain model for the Mishti Documentor Mesh. It is intended to be used directly as a coding reference for event, packet, receipt, anchor, artifact, checkpoint, and integrity-related entities.

The model assumes the Documentor Mesh is the platform-wide cryptographic evidence layer and that actor-local recording remains append-only and sequence-aware.

## 2. Primary Domain Concepts

Primary concepts:

- DocumentorEvent
- EvidencePacket
- LibrarianReceipt
- LedgerAnchor
- ArtifactReference
- ActorDocumentorState
- EventChainCheckpoint
- EvidenceSubmission
- IntegrityVerificationResult

Supporting concepts:

- DocumentorEnvelope
- HeartbeatSnapshot
- ActorIdentityRef
- GovernanceContextRef
- TaskContextRef

## 3. DocumentorEvent

### Purpose

Represents the atomic unit of evidence emitted by an actor-paired Documentor capability.

### Key Fields

- `eventId`
- `actorId`
- `actorType`
- `documentorId`
- `subsystem`
- `actionType`
- `eventType`
- `targetObject`
- `targetPath`
- `targetRef`
- `timestamp`
- `sequence`
- `locationMetadata`
- `environmentMetadata`
- `governanceContext`
- `traceId`
- `taskId`
- `contractId`
- `sessionId`
- `payloadRef`
- `payloadHash`
- `previousEventHash`
- `eventHash`
- `encryptionEnvelopeRef`

### Lifecycle Notes

`DocumentorEvent` is created locally, hash-linked to the previous event in the actor chain, and then staged for packet submission.

### Invariants

- sequence values must be strictly increasing within one actor documentor chain
- `previousEventHash` must match the prior accepted local event unless this is a genesis event
- `eventHash` must be derived from canonical event fields
- event records are append-only and must never be mutated in place for semantic content

### Hash and Integrity Expectations

- `payloadHash` must reflect canonical payload content or canonical payload reference content
- `eventHash` must incorporate `previousEventHash`
- integrity verification must fail on broken sequence or hash continuity

### Relationships

- many `DocumentorEvent` records belong to one actor documentor chain
- many `DocumentorEvent` records may belong to one `EvidencePacket`
- one `DocumentorEvent` may reference zero or more `ArtifactReference` records

## 4. Event Type Families

Recommended event type families:

- `heartbeat`
- `action`
- `handoff`
- `approval`
- `change`
- `evidence_submission`
- `receipt_acknowledged`
- `integrity_alert`
- `policy_observation`
- `runtime_execution`
- `artifact_registered`

These families should be consistent across actor types while still allowing actor-specific `actionType` values.

## 5. Heartbeat Event Semantics

Heartbeat is a specialized `DocumentorEvent` family.

Heartbeat events should include:

- actor liveness timestamp
- session continuity metadata
- current local sequence
- most recent acknowledged packet or checkpoint
- health status
- degraded or isolated mode metadata if applicable

Heartbeat events should not bypass chain integrity rules. They are normal events with specialized semantics.

## 6. EvidencePacket

### Purpose

Represents a bounded submission bundle of consecutive local events emitted by one actor documentor chain.

### Key Fields

- `packetId`
- `actorId`
- `documentorId`
- `submissionId`
- `startSequence`
- `endSequence`
- `eventIds`
- `firstEventHash`
- `lastEventHash`
- `packetHash`
- `artifactRefs`
- `createdAt`
- `encryptionEnvelopeRef`
- `transportMetadata`

### Lifecycle Notes

A packet is assembled from locally staged events, verified before submission, submitted to the Librarian, then either acknowledged, rejected, or retried.

### Invariants

- a packet must contain events from exactly one actor documentor chain
- event sequences inside the packet must be consecutive
- packet event ordering must be canonical and stable
- packet contents must not be mutated after `packetHash` generation

### Hash and Integrity Expectations

- `packetHash` must be derived from canonical packet fields and ordered event hashes
- `firstEventHash` and `lastEventHash` must match the actual packet boundaries
- artifact references embedded in the packet must carry digests

### Relationships

- one `EvidencePacket` contains many `DocumentorEvent` records
- one `EvidencePacket` is submitted through one `EvidenceSubmission`
- one successful `EvidencePacket` typically yields one `LibrarianReceipt` and one or more `LedgerAnchor` records

## 7. LibrarianReceipt

### Purpose

Represents the Librarian’s authoritative intake response for an evidence submission.

### Key Fields

- `receiptId`
- `submissionId`
- `packetId`
- `actorId`
- `receivedAt`
- `status`
- `verificationResult`
- `acceptedSequenceCheckpoint`
- `acceptedEventHashCheckpoint`
- `receiptHash`
- `reasonCodes`
- `anchoredLedgerEntryId`

### Lifecycle Notes

Receipts are issued after Librarian validation and should be immutable after issuance.

Suggested statuses:

- `accepted`
- `rejected`
- `accepted_with_warnings`
- `quarantined`

### Invariants

- a receipt must refer to one concrete submission and packet
- accepted receipts must advance or confirm actor checkpoint state
- a rejected receipt must preserve rejection reasons

### Hash and Integrity Expectations

- `receiptHash` must be derived from canonical receipt content
- receipt content must remain stable once issued

### Relationships

- one `LibrarianReceipt` belongs to one `EvidenceSubmission`
- one accepted `LibrarianReceipt` may produce one `LedgerAnchor`

## 8. LedgerAnchor

### Purpose

Represents the append-only central evidence ledger record that anchors a receipt and accepted packet into global evidence history.

### Key Fields

- `ledgerAnchorId`
- `anchorType`
- `packetId`
- `receiptId`
- `actorId`
- `traceId`
- `taskId`
- `contractId`
- `anchorTimestamp`
- `previousAnchorHash`
- `anchorHash`
- `checkpointSequence`
- `checkpointEventHash`

### Lifecycle Notes

Anchors are created centrally after successful intake and written in append-only form.

### Invariants

- anchor ordering must be deterministic for the chosen anchor stream
- `previousAnchorHash` must reference the prior anchor in that stream
- accepted packet and receipt references must exist before anchoring

### Hash and Integrity Expectations

- anchor hashes must be chainable
- anchor chain verification must detect omission or insertion anomalies

### Relationships

- one `LedgerAnchor` references one `EvidencePacket` and one `LibrarianReceipt`
- anchor records may be used by query projections and external evidence exports

## 9. ArtifactReference

### Purpose

Represents a reference to a large or externalized artifact associated with events or packets.

### Key Fields

- `artifactRefId`
- `artifactType`
- `storageLocation`
- `contentDigest`
- `sizeBytes`
- `encryptionEnvelopeRef`
- `createdAt`
- `retentionClass`
- `sourceEventId`
- `sourcePacketId`

### Lifecycle Notes

Artifact references are created when evidence bodies are too large, binary, or otherwise inappropriate for direct embedding in core event payloads.

### Invariants

- artifact references must include a digest
- storage location metadata must be stable enough for later retrieval
- the artifact reference must remain usable after packet anchoring

### Hash and Integrity Expectations

- `contentDigest` must match the stored artifact body
- verification should fail on missing or mismatched artifacts

### Relationships

- many artifact references may be associated with one packet or event

## 10. ActorDocumentorState

### Purpose

Represents the persistent state of one actor-paired documentor capability.

### Key Fields

- `documentorId`
- `actorId`
- `actorType`
- `status`
- `currentSequence`
- `lastEventHash`
- `lastPacketId`
- `lastReceiptId`
- `lastAcceptedCheckpointId`
- `lastHeartbeatAt`
- `lastSubmissionAt`
- `encryptionPolicy`

### Lifecycle Notes

This state is updated locally as events are produced and remotely as submissions are acknowledged.

### Invariants

- `currentSequence` must not regress
- local chain state must remain consistent with generated event hashes
- accepted checkpoint state must not move backward

### Relationships

- one `ActorDocumentorState` has many `DocumentorEvent` records
- one `ActorDocumentorState` has many `EventChainCheckpoint` records over time

## 11. EventChainCheckpoint

### Purpose

Represents a known continuity point for an actor documentor chain.

### Key Fields

- `checkpointId`
- `actorId`
- `documentorId`
- `sequence`
- `eventHash`
- `packetId`
- `receiptId`
- `anchoredAt`
- `checkpointType`

### Lifecycle Notes

Checkpoints are emitted locally and/or centrally acknowledged after intake.

Suggested checkpoint types:

- `local`
- `submitted`
- `accepted`
- `anchored`

### Invariants

- checkpoint sequence and hash must refer to an existing event boundary
- accepted or anchored checkpoints must align with Librarian receipts and anchors

## 12. EvidenceSubmission

### Purpose

Represents the transport and intake attempt for an `EvidencePacket`.

### Key Fields

- `submissionId`
- `packetId`
- `actorId`
- `submittedAt`
- `transportStatus`
- `attemptCount`
- `destination`
- `responseMetadata`
- `receiptId`

### Lifecycle Notes

Submissions may be retried until one receipt is accepted or the packet is permanently rejected or quarantined.

Suggested transport statuses:

- `pending`
- `submitted`
- `acknowledged`
- `rejected`
- `retrying`
- `failed`

### Invariants

- submission attempts must not mutate packet contents
- retries must preserve packet identity and packet hash

## 13. IntegrityVerificationResult

### Purpose

Represents the result of chain, packet, artifact, or anchor verification.

### Key Fields

- `verificationId`
- `verificationScope`
- `targetRef`
- `verifiedAt`
- `status`
- `checksApplied`
- `failureReasons`
- `expectedHash`
- `observedHash`
- `sequenceGapDetected`

### Lifecycle Notes

Verification results may be produced locally before submission, during Librarian intake, or by later audit and police watchers.

Suggested statuses:

- `passed`
- `failed`
- `warning`
- `quarantined`

### Invariants

- failure results must preserve enough evidence for diagnosis
- verification output must be append-only for auditability

## 14. Actor Checkpoint Model

The actor checkpoint model should preserve both local continuity and centrally acknowledged continuity.

Recommended checkpoint concepts:

- local current tip
- last submitted tip
- last accepted receipt checkpoint
- last anchored central checkpoint
- last heartbeat watermark

This enables recovery from disconnection, packet rejection, and later replay or reconstruction.

## 15. Packet Submission Model

Packet submission should follow this flow:

1. build packet from consecutive local events
2. verify packet integrity locally
3. create `EvidenceSubmission`
4. submit to Librarian intake
5. receive `LibrarianReceipt`
6. update actor checkpoint state
7. anchor accepted packet centrally

Packet retries should preserve packet identity and hash.

## 16. Receipt Model

The receipt model exists to make Librarian intake itself auditable.

A receipt should communicate:

- whether the packet was accepted
- whether integrity checks passed
- what checkpoint was advanced
- what anchor or quarantine action occurred
- why warnings or rejection occurred

Receipts should be queryable by actor, packet, task, trace, and time range.

## 17. Ledger Anchoring Model

Ledger anchors are the bridge from local actor evidence into central platform evidence history.

Anchoring should:

- reference accepted packets and receipts
- preserve previous-anchor linking
- carry actor and task/trace context
- provide a stable point for later evidence export or external verification

Anchoring is append-only. Corrective actions must add new anchors or supplemental records rather than silently editing prior anchors.

## 18. Artifact Reference Model

Artifact references should be used for:

- build reports
- patch bundles
- binary outputs
- large evidence exports
- runtime traces too large for direct packet embedding

Artifact references must remain integrity-verifiable and tied back to their source event and packet.

## 19. Replay and Reconstruction Concepts

The Documentor Mesh should support replay and reconstruction without treating the query model as the write-side source of truth.

Reconstruction modes should include:

- actor-local chain replay
- packet lineage replay
- receipt and anchor replay
- task and trace cross-actor reconstruction
- heartbeat continuity analysis

Replay should operate from canonical event, packet, receipt, and anchor records plus artifact references where needed.

## 20. Implementation Guidance

Implementation guidance for the first version:

- keep `DocumentorEvent` canonical and actor-neutral
- keep actor documentor chain state explicit rather than inferred from projections
- separate local event recording from central anchoring responsibilities
- treat receipts and anchors as first-class domain records
- keep integrity verification outputs storable and queryable

The model should remain additive to Governance Engine, task infrastructure, runtime execution ledgers, and builder routing systems while giving Mishti AI one coherent evidence mesh across actors and timelines.
