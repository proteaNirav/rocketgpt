import { test } from "node:test";
import * as assert from "node:assert/strict";
import { assessLearnableValue } from "../experience/services/learnable-value-assessor";
import { ExperienceCapturePolicy } from "../experience/services/experience-capture-policy";
import type { ExperienceRecord } from "../experience/types/experience.types";

function makeRecord(classification: ExperienceRecord["outcome"]["classification"]): ExperienceRecord {
  return {
    experienceId: "exp-1",
    experienceType: "execution",
    experienceCategory: "execution_success",
    experienceOutcome: "positive",
    experienceScore: 0.7,
    experienceConfidence: 0.75,
    sessionId: "s1",
    timestamp: "2026-03-07T00:00:00.000Z",
    sourceCapability: undefined,
    relatedMemoryId: undefined,
    relatedExecutionId: "exec-1",
    relatedSignals: [],
    relatedReinforcementEvents: [],
    experienceTags: [],
    experienceMetadata: {},
    source: { component: "mesh-live-runtime", source: "chat:user_text" },
    situation: { mode: "chat", sourceType: "chat.user_text" },
    context: { cognitiveState: "completed", trustClass: "trusted", riskScore: 0.3, tags: [] },
    action: { capabilityStatus: "success", verificationInvoked: false, routeAccepted: true },
    verification: { required: false },
    outcome: {
      classification,
      status: classification === "successful" ? "positive" : "negative",
      reusable: classification !== "successful",
      stabilityImpact: classification === "successful" ? "positive" : "negative",
      summary: classification,
    },
    circumstances: {
      fallbackTriggered: classification === "successful-with-fallback",
      guardrailApplied: classification === "guarded",
      verificationRequired: classification === "successful-with-verification",
      verificationFailed: false,
      multipleCapabilitiesUsed: false,
      highComplexityRequest: false,
      stateFragility: classification === "failed",
      recoveryPathUsed: classification === "successful-with-fallback",
      lowConfidenceResult: false,
    },
    learnableValue: { level: "none", rationale: [], reusableValue: false },
    governanceIssues: [],
    tags: [],
    relevanceScore: 0,
    isMeaningful: false,
  };
}

test("assesses learnable value with deterministic escalation", () => {
  const high = assessLearnableValue(
    {
      classification: "failed",
      status: "negative",
      reusable: true,
      stabilityImpact: "critical",
      summary: "failed",
    },
    {
      fallbackTriggered: false,
      guardrailApplied: false,
      verificationRequired: true,
      verificationFailed: false,
      multipleCapabilitiesUsed: false,
      highComplexityRequest: true,
      stateFragility: true,
      recoveryPathUsed: false,
      lowConfidenceResult: false,
    }
  );
  assert.equal(high.level, "high");
  assert.equal(high.reusableValue, true);
});

test("capture policy excludes trivial success and captures guarded/fallback-rich outcomes", () => {
  const policy = new ExperienceCapturePolicy();

  const trivial = makeRecord("successful");
  trivial.learnableValue = { level: "none", rationale: ["minimal"], reusableValue: false };
  const trivialDecision = policy.shouldCaptureExperience(trivial);
  assert.equal(trivialDecision.shouldCapture, false);

  const guarded = makeRecord("guarded");
  guarded.learnableValue = { level: "high", rationale: ["guarded"], reusableValue: true };
  const guardedDecision = policy.shouldCaptureExperience(guarded);
  assert.equal(guardedDecision.shouldCapture, true);

  const fallback = makeRecord("successful-with-fallback");
  fallback.learnableValue = { level: "medium", rationale: ["fallback"], reusableValue: true };
  const fallbackDecision = policy.shouldCaptureExperience(fallback);
  assert.equal(fallbackDecision.shouldCapture, true);
});
