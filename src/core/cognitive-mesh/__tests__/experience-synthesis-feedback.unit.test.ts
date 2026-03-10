import { test } from "node:test";
import * as assert from "node:assert/strict";
import { CognitiveMemoryService } from "../memory/cognitive-memory-service";
import type { ExperienceRecord } from "../experience/types/experience.types";

function buildExperience(sessionId: string, capabilityId: string, relevanceScore: number): ExperienceRecord {
  return {
    experienceId: `exp-${sessionId}-${capabilityId}`,
    experienceType: "execution",
    experienceCategory: "execution_success",
    experienceOutcome: "positive",
    experienceScore: 0.92,
    experienceConfidence: 0.88,
    sessionId,
    timestamp: new Date().toISOString(),
    sourceCapability: capabilityId,
    relatedMemoryId: undefined,
    relatedExecutionId: `exec-${sessionId}-${capabilityId}`,
    relatedSignals: [],
    relatedReinforcementEvents: [],
    experienceTags: [],
    experienceMetadata: {},
    source: {
      component: "mesh-live-runtime",
      source: "test",
    },
    situation: {
      mode: "chat",
      sourceType: "chat.user_text",
      routeType: "/api/demo/chat",
    },
    context: {
      cognitiveState: "completed",
      trustClass: "trusted",
      riskScore: 0.2,
      tags: [],
    },
    action: {
      capabilityId,
      capabilityStatus: "success",
      verificationInvoked: true,
    },
    verification: {
      required: true,
      verdict: "accept",
      confidence: 0.9,
    },
    outcome: {
      classification: "successful-with-verification",
      status: "positive",
      reusable: true,
      stabilityImpact: "positive",
      summary: "verified_success",
    },
    circumstances: {
      fallbackTriggered: false,
      guardrailApplied: false,
      verificationRequired: true,
      verificationFailed: false,
      multipleCapabilitiesUsed: false,
      highComplexityRequest: false,
      stateFragility: false,
      recoveryPathUsed: false,
      lowConfidenceResult: false,
    },
    learnableValue: {
      level: "high",
      rationale: ["verified_path"],
      reusableValue: true,
    },
    governanceIssues: [],
    tags: [`capability:${capabilityId}`],
    relevanceScore,
    isMeaningful: true,
  };
}

test("cat feedback synthesizes to reusable memory record", () => {
  const service = new CognitiveMemoryService();
  const sessionId = "cat-feedback-synth-1";
  const experience = buildExperience(sessionId, "retrieval", 0.88);

  service.synthesizeExperienceFeedback(
    {
      feedbackId: "fb-1",
      sessionId,
      capabilityId: "retrieval",
      guardrailsApplied: [],
      memoryInjectedIds: ["mem-a", "mem-b"],
      actionSummary: "retrieval returned 3 records",
      outcome: "successful",
      confidence: 0.84,
      createdAt: new Date().toISOString(),
    },
    experience
  );

  const recent = service.getRepository().listRecentMemory(5);
  assert.equal(recent.length >= 1, true);
  assert.equal(recent[0].content.includes("cat=retrieval"), true);
  assert.equal(recent[0].tags.some((tag) => tag.key === "category" && tag.value === "cat_feedback"), true);
});
