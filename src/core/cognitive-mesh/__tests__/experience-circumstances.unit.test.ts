import { test } from "node:test";
import * as assert from "node:assert/strict";
import { deriveCircumstantialContext } from "../experience/services/circumstantial-context-deriver";

test("derives circumstantial signals deterministically", () => {
  const context = deriveCircumstantialContext({
    fallbackTriggered: true,
    guardrailApplied: true,
    verificationRequired: true,
    verificationVerdict: "reject",
    capabilitiesUsed: ["cap.language.v1", "cap.retrieval.v1"],
    requestComplexityScore: 0.8,
    stateFragility: true,
    recoveryPathUsed: true,
    confidence: 0.4,
  });

  assert.equal(context.fallbackTriggered, true);
  assert.equal(context.guardrailApplied, true);
  assert.equal(context.verificationRequired, true);
  assert.equal(context.verificationFailed, true);
  assert.equal(context.multipleCapabilitiesUsed, true);
  assert.equal(context.highComplexityRequest, true);
  assert.equal(context.stateFragility, true);
  assert.equal(context.recoveryPathUsed, true);
  assert.equal(context.lowConfidenceResult, true);
});

