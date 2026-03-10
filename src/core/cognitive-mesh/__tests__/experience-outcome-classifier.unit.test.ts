import { test } from "node:test";
import * as assert from "node:assert/strict";
import { classifyExperienceOutcome } from "../experience/services/outcome-classifier";
import type { ExperienceCaptureFacts } from "../experience/types/experience.types";

function baseFacts(): ExperienceCaptureFacts {
  return {
    sessionId: "s1",
    timestamp: "2026-03-07T00:00:00.000Z",
    source: {
      component: "mesh-live-runtime",
      source: "chat:user_text",
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
      capabilityId: "cap.language.v1",
      capabilityStatus: "success",
      verificationInvoked: false,
      routeDisposition: "allow",
      routeAccepted: true,
    },
    verification: {
      required: false,
    },
    circumstances: {},
    routeFallbackUsed: false,
  };
}

test("classifies successful-with-verification and fallback deterministically", () => {
  const verified = classifyExperienceOutcome({
    ...baseFacts(),
    verification: { required: true, verdict: "accept" },
  });
  assert.equal(verified.classification, "successful-with-verification");

  const fallback = classifyExperienceOutcome({
    ...baseFacts(),
    routeFallbackUsed: true,
  });
  assert.equal(fallback.classification, "successful-with-fallback");
});

test("classifies failed and guarded deterministically", () => {
  const failed = classifyExperienceOutcome({
    ...baseFacts(),
    routeError: "runtime_exception",
    action: {
      ...baseFacts().action,
      routeAccepted: undefined,
    },
  });
  assert.equal(failed.classification, "failed");

  const guarded = classifyExperienceOutcome({
    ...baseFacts(),
    action: {
      ...baseFacts().action,
      capabilityStatus: "blocked",
    },
    circumstances: {
      guardrailApplied: true,
    },
  });
  assert.equal(guarded.classification, "guarded");
});

