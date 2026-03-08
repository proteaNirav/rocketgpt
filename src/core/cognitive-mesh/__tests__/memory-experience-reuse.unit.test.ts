import { test } from "node:test";
import * as assert from "node:assert/strict";
import { CognitiveMemoryService } from "../memory/cognitive-memory-service";
import type { ExperienceRecord } from "../experience/types/experience.types";

function makeExperience(
  sessionId: string,
  id: string,
  status: "positive" | "negative",
  classification: "successful" | "failed"
): ExperienceRecord {
  return {
    experienceId: id,
    experienceType: "execution",
    experienceCategory: classification === "successful" ? "execution_success" : "execution_failure",
    experienceOutcome: classification === "successful" ? "positive" : "negative",
    experienceScore: classification === "successful" ? 0.85 : -0.45,
    experienceConfidence: classification === "successful" ? 0.8 : 0.75,
    sessionId,
    timestamp: new Date().toISOString(),
    sourceCapability: "retrieval",
    relatedMemoryId: undefined,
    relatedExecutionId: `exec-${id}`,
    relatedSignals: [],
    relatedReinforcementEvents: [],
    experienceTags: [],
    experienceMetadata: {},
    source: {
      component: "mesh-live-runtime",
      source: "test",
    },
    situation: {
      mode: "workflow",
      sourceType: "workflow.trigger",
    },
    context: {
      cognitiveState: "completed",
      trustClass: "trusted",
      riskScore: 0.4,
      tags: [],
    },
    action: {
      capabilityId: "retrieval",
      capabilityStatus: classification === "successful" ? "success" : "failed",
      verificationInvoked: true,
    },
    verification: {
      required: true,
      verdict: classification === "successful" ? "accept" : "reject",
      confidence: classification === "successful" ? 0.8 : 0.2,
    },
    outcome: {
      classification,
      status,
      reusable: status === "positive",
      stabilityImpact: status === "positive" ? "positive" : "negative",
      summary: id,
    },
    circumstances: {
      fallbackTriggered: false,
      guardrailApplied: false,
      verificationRequired: true,
      verificationFailed: classification === "failed",
      multipleCapabilitiesUsed: false,
      highComplexityRequest: false,
      stateFragility: classification === "failed",
      recoveryPathUsed: false,
      lowConfidenceResult: classification === "failed",
    },
    learnableValue: {
      level: status === "positive" ? "medium" : "low",
      rationale: [id],
      reusableValue: status === "positive",
    },
    governanceIssues: [],
    tags: ["capability:retrieval"],
    relevanceScore: status === "positive" ? 0.8 : 0.35,
    isMeaningful: true,
  };
}

test("experience-informed reuse scoring biases synthesized memory selection", () => {
  const sessionId = "reuse-mvp-1";
  const prior = [
    makeExperience(sessionId, "exp-good-1", "positive", "successful"),
    makeExperience(sessionId, "exp-good-2", "positive", "successful"),
    makeExperience(sessionId, "exp-bad-1", "negative", "failed"),
  ];
  const service = new CognitiveMemoryService(undefined, {
    experienceProvider: () => prior,
  });

  service.synthesizeExperienceFeedback(
    {
      feedbackId: "fb-reuse-1",
      sessionId,
      capabilityId: "retrieval",
      guardrailsApplied: [],
      memoryInjectedIds: [],
      actionSummary: "retrieval completed with partial caution",
      outcome: "successful",
      confidence: 0.72,
      createdAt: new Date().toISOString(),
    },
    makeExperience(sessionId, "exp-current", "positive", "successful")
  );

  const packet = service.buildMemoryPacket(
    {
      sessionId,
      capabilityId: "retrieval",
      purpose: "reuse_check",
      entitlement: { allowInjection: true },
    },
    {
      query: "retrieval completed",
      limit: 3,
      relevanceFloor: 0.3,
    }
  );

  assert.equal(packet.memoryItems.length >= 1, true);
  assert.equal(packet.memoryItems[0].scores.reuse > 0.4, true);
});
