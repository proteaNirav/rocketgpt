import { test } from "node:test";
import * as assert from "node:assert/strict";
import type { CapabilityRequestEnvelope } from "../capabilities/types/capability-request.types";
import type { CapabilityResultEnvelope } from "../capabilities/types/capability-result.types";
import type {
  VerificationRequestEnvelope,
  VerificationResultEnvelope,
} from "../capabilities/types/verification.types";

test("capability request/result envelopes preserve expected contract shape", () => {
  const request: CapabilityRequestEnvelope = {
    requestId: "req-contract-1",
    sessionId: "session-contract",
    capabilityId: "cap.language.v1",
    purpose: "normalize",
    input: "hello",
    createdAt: new Date().toISOString(),
  };
  const result: CapabilityResultEnvelope = {
    requestId: request.requestId,
    sessionId: request.sessionId,
    capabilityId: request.capabilityId,
    status: "success",
    payload: { normalizedText: "hello" },
    confidence: 0.9,
    verificationRequired: false,
    completedAt: new Date().toISOString(),
    classification: {
      status: "success",
      failureClass: "none",
      reasonCodes: [],
      lifecycleStage: "result_normalized",
      degraded: false,
    },
  };

  assert.equal(result.requestId, request.requestId);
  assert.equal(result.sessionId, request.sessionId);
  assert.equal(result.capabilityId, request.capabilityId);
  assert.equal(result.status, "success");
  assert.equal(result.classification?.failureClass, "none");
});

test("verification handoff envelopes preserve expected contract shape", () => {
  const verificationRequest: VerificationRequestEnvelope = {
    verificationRequestId: "verify-contract-1",
    sessionId: "session-contract",
    capabilityId: "cap.retrieval.v1",
    capabilityResult: {
      requestId: "req-contract-2",
      sessionId: "session-contract",
      capabilityId: "cap.retrieval.v1",
      status: "success",
      payload: { records: [] },
      confidence: 0.7,
      verificationRequired: true,
      completedAt: new Date().toISOString(),
    },
    requestedAt: new Date().toISOString(),
  };

  const verificationResult: VerificationResultEnvelope = {
    verificationRequestId: verificationRequest.verificationRequestId,
    sessionId: verificationRequest.sessionId,
    capabilityId: verificationRequest.capabilityId,
    verdict: "review",
    confidence: 0.7,
    notes: ["manual_review_recommended"],
    recommendedAction: "review",
    completedAt: new Date().toISOString(),
  };

  assert.equal(verificationResult.verdict, "review");
  assert.equal(verificationResult.recommendedAction, "review");
});
