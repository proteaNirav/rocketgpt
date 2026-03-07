import { test } from "node:test";
import * as assert from "node:assert/strict";
import { CognitiveExperienceCaptureService } from "../experience/services/cognitive-experience-capture-service";
import { InMemoryExperienceRepository } from "../experience/repository/in-memory-experience-repository";
import { NEGATIVE_PATH_ISSUES } from "../governance/negative-path-taxonomy";
import type { ExperienceCaptureFacts } from "../experience/types/experience.types";

function baseFacts(sessionId: string): ExperienceCaptureFacts {
  return {
    sessionId,
    timestamp: new Date().toISOString(),
    source: { component: "mesh-live-runtime", source: "chat:user_text" },
    situation: { mode: "chat", sourceType: "chat.user_text", routeType: "/api/demo/chat" },
    context: { cognitiveState: "completed", trustClass: "trusted", riskScore: 0.3, tags: [] },
    action: {
      capabilityId: "cap.language.v1",
      capabilityStatus: "success",
      verificationInvoked: true,
      routeDisposition: "allow",
      routeAccepted: true,
    },
    verification: { required: true, verdict: "review", confidence: 0.55 },
    circumstances: {
      verificationRequired: true,
      verificationVerdict: "review",
      confidence: 0.55,
    },
    routeFallbackUsed: false,
    governanceIssues: [NEGATIVE_PATH_ISSUES.VERIFICATION_UNAVAILABLE],
    tags: ["test"],
  };
}

test("CEL adds harmful pattern tag for repeated verifier absence", () => {
  const service = new CognitiveExperienceCaptureService(new InMemoryExperienceRepository(100));
  const sessionId = "harmful-verifier-absence";

  service.captureExecutionExperience(baseFacts(sessionId));
  service.captureExecutionExperience(baseFacts(sessionId));
  const third = service.captureExecutionExperience(baseFacts(sessionId));

  assert.equal(third.captured, true);
  assert.equal(third.record.tags.includes("harmful:repeated_verifier_absence"), true);
  assert.equal(
    third.record.tags.includes(`issue:${NEGATIVE_PATH_ISSUES.VERIFICATION_UNAVAILABLE}`),
    true
  );
});

test("CEL adds harmful pattern tag for guarded outcome clusters", () => {
  const service = new CognitiveExperienceCaptureService(new InMemoryExperienceRepository(100));
  const sessionId = "harmful-guarded-cluster";
  const guardedFacts: ExperienceCaptureFacts = {
    ...baseFacts(sessionId),
    action: {
      ...baseFacts(sessionId).action,
      capabilityStatus: "blocked",
    },
    circumstances: {
      ...baseFacts(sessionId).circumstances,
      guardrailApplied: true,
    },
    governanceIssues: [NEGATIVE_PATH_ISSUES.GUARDRAIL_BLOCKED],
  };

  service.captureExecutionExperience(guardedFacts);
  service.captureExecutionExperience(guardedFacts);
  const third = service.captureExecutionExperience(guardedFacts);

  assert.equal(third.captured, true);
  assert.equal(third.record.outcome.classification, "guarded");
  assert.equal(third.record.tags.includes("harmful:guarded_outcome_cluster"), true);
});

