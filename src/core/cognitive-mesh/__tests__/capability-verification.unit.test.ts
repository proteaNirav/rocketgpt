import { test } from "node:test";
import * as assert from "node:assert/strict";
import { verifyCapabilityResult } from "../capabilities/orchestration/capability-verification";
import type { CapabilityRequestEnvelope } from "../capabilities/types/capability-request.types";
import type { CapabilityResultEnvelope } from "../capabilities/types/capability-result.types";
import type { CapabilityDefinition } from "../capabilities/types/capability.types";

function baseCapability(): CapabilityDefinition {
  return {
    capabilityId: "cap.test.verify.v1",
    name: "verify-test",
    family: "knowledge",
    version: "1.0.0",
    status: "active",
    description: "verification test capability",
    ownerAuthority: "test",
    allowedOperations: ["test.run"],
    verificationMode: "none",
    riskLevel: "low",
    directBrainCommitAllowed: false,
  };
}

function baseRequest(): CapabilityRequestEnvelope {
  return {
    requestId: "req-verify-1",
    sessionId: "session-verify-1",
    capabilityId: "cap.test.verify.v1",
    purpose: "test.run",
    input: { foo: "bar" },
    createdAt: new Date().toISOString(),
  };
}

function baseResult(): CapabilityResultEnvelope {
  return {
    requestId: "req-verify-1",
    sessionId: "session-verify-1",
    capabilityId: "cap.test.verify.v1",
    status: "success",
    payload: { ok: true },
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
}

test("capability verifier accepts valid success result", () => {
  const outcome = verifyCapabilityResult({
    request: baseRequest(),
    capability: baseCapability(),
    result: baseResult(),
  });
  assert.equal(outcome.decision, "accepted");
  assert.equal(outcome.adoptable, true);
});

test("capability verifier rejects malformed success payload", () => {
  const result = baseResult();
  result.payload = undefined;
  const outcome = verifyCapabilityResult({
    request: baseRequest(),
    capability: baseCapability(),
    result,
  });
  assert.equal(outcome.decision === "invalid_result" || outcome.decision === "inconsistent_result", true);
  assert.equal(outcome.adoptable, false);
});

test("capability verifier marks degraded_success as degraded_accepted", () => {
  const result = baseResult();
  result.status = "degraded_success";
  result.classification = {
    status: "degraded_success",
    failureClass: "degraded_execution",
    reasonCodes: ["degraded_path"],
    lifecycleStage: "result_normalized",
    degraded: true,
  };
  const outcome = verifyCapabilityResult({
    request: baseRequest(),
    capability: baseCapability(),
    result,
  });
  assert.equal(outcome.decision, "degraded_accepted");
  assert.equal(outcome.adoptable, true);
});

test("capability verifier does not accept denied/blocked/not_found/invalid/unavailable/failed", () => {
  const statuses: CapabilityResultEnvelope["status"][] = [
    "denied",
    "blocked",
    "not_found",
    "invalid",
    "unavailable",
    "failed",
  ];
  for (const status of statuses) {
    const result = baseResult();
    result.status = status;
    result.classification = {
      status,
      failureClass: status === "failed" ? "execution_exception" : status === "not_found" ? "capability_not_found" : status === "invalid" ? "invalid_request" : status === "unavailable" ? "capability_unavailable" : "guard_blocked",
      reasonCodes: [],
      lifecycleStage: "result_normalized",
      degraded: false,
    };
    const outcome = verifyCapabilityResult({
      request: baseRequest(),
      capability: baseCapability(),
      result,
    });
    assert.equal(outcome.adoptable, false);
  }
});

test("capability verifier detects inconsistent classification", () => {
  const result = baseResult();
  result.classification = {
    status: "failed",
    failureClass: "execution_exception",
    reasonCodes: [],
    lifecycleStage: "result_normalized",
    degraded: false,
  };
  const outcome = verifyCapabilityResult({
    request: baseRequest(),
    capability: baseCapability(),
    result,
  });
  assert.equal(outcome.decision, "inconsistent_result");
  assert.equal(outcome.adoptable, false);
});

test("capability verifier marks policy incompatible success as policy_rejected", () => {
  const outcome = verifyCapabilityResult({
    request: baseRequest(),
    capability: baseCapability(),
    result: baseResult(),
    runtimeGuardOutcome: "deny",
  });
  assert.equal(outcome.decision, "policy_rejected");
  assert.equal(outcome.adoptable, false);
});
