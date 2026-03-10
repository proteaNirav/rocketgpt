# CCM-02 Registry And Contracts

## Capability Taxonomy
Capability families:
- `perception`
- `knowledge`
- `action`
- `assurance`

Every capability definition declares one family.

## Capability Metadata Model
Core metadata fields:
- `capabilityId`
- `name`
- `family`
- `version`
- `status`
- `description`
- `ownerAuthority`
- `allowedOperations`
- `verificationMode`
- `riskLevel`
- `directBrainCommitAllowed`
- optional monitoring and metadata

This model is implemented in `capability.types.ts`.

## Lifecycle And Status Model
Supported statuses:
- `proposed`
- `approved`
- `active`
- `restricted`
- `suspended`
- `deprecated`
- `retired`

Current invokable statuses:
- `active`
- `restricted`

Non-invokable statuses are blocked by orchestrator/registry checks.

## Request Envelope Contract
`CapabilityRequestEnvelope` standardizes brain-to-capability invocation:
- identity: `requestId`, `sessionId`, `capabilityId`
- purpose and payload: `purpose`, `input`
- optional expectations: `expectedOutputType`, `verificationMode`, `priority`
- constraints and trace: `sourceConstraints`, `trace`
- timing: `createdAt`

## Result Envelope Contract
`CapabilityResultEnvelope` standardizes adaptor responses:
- identity: `requestId`, `sessionId`, `capabilityId`
- execution status: `success | failed | blocked | unavailable`
- output and quality: `payload`, `confidence`, `freshness`
- source and diagnostics: `sourceMetadata`, `warnings`, `errors`
- governance flag: `verificationRequired`
- timing/trace: `completedAt`, `trace`

## Verification Handoff Contract
`VerificationRequestEnvelope` and `VerificationResultEnvelope` define learner handoff:
- input: original capability result and trace context
- output: `verdict`, `confidence`, `notes`, `recommendedAction`

Verdict space:
- `accept`
- `reject`
- `escalate`
- `review`

