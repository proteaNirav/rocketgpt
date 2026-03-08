import { test } from "node:test";
import * as assert from "node:assert/strict";
import { CognitiveExperienceCaptureService } from "../experience/services/cognitive-experience-capture-service";
import { InMemoryExperienceRepository } from "../experience/repository/in-memory-experience-repository";
import type { ExperienceCaptureFacts } from "../experience/types/experience.types";

function baseFacts(overrides: Partial<ExperienceCaptureFacts> = {}): ExperienceCaptureFacts {
  return {
    sessionId: "experience-engine-s1",
    timestamp: "2026-03-08T10:00:00.000Z",
    source: { component: "mesh-live-runtime", source: "chat:user_text", eventId: "evt-1", requestId: "req-1" },
    situation: { mode: "chat", sourceType: "chat.user_text", routeType: "/api/demo/chat" },
    context: { cognitiveState: "completed", trustClass: "trusted", riskScore: 0.3, tags: ["engine-test"] },
    action: {
      capabilityId: "cap.language.v1",
      capabilityStatus: "success",
      verificationInvoked: true,
      routeDisposition: "allow",
      routeAccepted: true,
    },
    verification: { required: true, verdict: "accept", confidence: 0.82 },
    circumstances: {
      fallbackTriggered: false,
      guardrailApplied: false,
      verificationRequired: true,
      verificationVerdict: "accept",
      capabilitiesUsed: ["cap.language.v1"],
      requestComplexityScore: 0.6,
      stateFragility: false,
      recoveryPathUsed: false,
      confidence: 0.82,
    },
    routeFallbackUsed: false,
    governanceIssues: [],
    tags: ["experience_engine_test"],
    ...overrides,
  };
}

test("experience engine tags verified successful execution as execution_success", () => {
  const service = new CognitiveExperienceCaptureService(new InMemoryExperienceRepository(100));
  const result = service.captureExecutionExperience(baseFacts());
  assert.equal(result.captured, true);
  assert.equal(result.record.experienceCategory, "execution_success");
  assert.equal(result.record.experienceType, "execution");
});

test("experience engine maps fallback/degraded path to execution_degraded", () => {
  const service = new CognitiveExperienceCaptureService(new InMemoryExperienceRepository(100));
  const result = service.captureExecutionExperience(
    baseFacts({
      action: {
        capabilityId: "cap.language.v1",
        capabilityStatus: "degraded_success",
        verificationInvoked: true,
        routeDisposition: "allow",
        routeAccepted: true,
      },
      circumstances: {
        fallbackTriggered: true,
        guardrailApplied: false,
        verificationRequired: true,
        verificationVerdict: "accept",
        capabilitiesUsed: ["cap.language.v1"],
        requestComplexityScore: 0.6,
        stateFragility: false,
        recoveryPathUsed: true,
        confidence: 0.7,
      },
      routeFallbackUsed: true,
    })
  );
  assert.equal(result.captured, true);
  assert.equal(result.record.experienceCategory, "execution_degraded");
});

test("experience engine maps verification rejection to verification_rejection", () => {
  const service = new CognitiveExperienceCaptureService(new InMemoryExperienceRepository(100));
  const result = service.captureExecutionExperience(
    baseFacts({
      action: {
        capabilityId: "cap.language.v1",
        capabilityStatus: "blocked",
        verificationInvoked: true,
        routeDisposition: "block",
        routeAccepted: false,
      },
      verification: { required: true, verdict: "reject", confidence: 0.95 },
      relatedSignals: ["verification_rejected"],
    })
  );
  assert.equal(result.captured, true);
  assert.equal(result.record.experienceCategory, "verification_rejection");
  assert.equal(result.record.experienceOutcome, "rejected");
});

test("experience engine maps drift signal to drift_detected", () => {
  const service = new CognitiveExperienceCaptureService(new InMemoryExperienceRepository(100));
  const result = service.captureExecutionExperience(
    baseFacts({
      relatedSignals: ["drift_detected", "integrity_warning"],
    })
  );
  assert.equal(result.captured, true);
  assert.equal(result.record.experienceCategory, "drift_detected");
  assert.equal(result.record.experienceType, "anomaly");
});

test("experience engine maps strong reinforcement delta to reinforcement_positive", () => {
  const service = new CognitiveExperienceCaptureService(new InMemoryExperienceRepository(100));
  const result = service.captureExecutionExperience(
    baseFacts({
      relatedMemoryId: "mem-1",
      relatedReinforcementEvents: [
        {
          memoryId: "mem-1",
          delta: 0.28,
          trend: "up",
          reasonCodes: ["EXECUTION_SUCCESS_VERIFIED"],
          timestamp: "2026-03-08T10:00:01.000Z",
        },
      ],
    })
  );
  assert.equal(result.captured, true);
  assert.equal(result.record.experienceCategory, "reinforcement_positive");
  assert.equal(result.record.relatedReinforcementEvents.length, 1);
});
