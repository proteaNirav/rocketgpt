"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const outcome_classifier_1 = require("../experience/services/outcome-classifier");
function baseFacts() {
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
(0, node_test_1.test)("classifies successful-with-verification and fallback deterministically", () => {
    const verified = (0, outcome_classifier_1.classifyExperienceOutcome)({
        ...baseFacts(),
        verification: { required: true, verdict: "accept" },
    });
    assert.equal(verified.classification, "successful-with-verification");
    const fallback = (0, outcome_classifier_1.classifyExperienceOutcome)({
        ...baseFacts(),
        routeFallbackUsed: true,
    });
    assert.equal(fallback.classification, "successful-with-fallback");
});
(0, node_test_1.test)("classifies failed and guarded deterministically", () => {
    const failed = (0, outcome_classifier_1.classifyExperienceOutcome)({
        ...baseFacts(),
        routeError: "runtime_exception",
        action: {
            ...baseFacts().action,
            routeAccepted: undefined,
        },
    });
    assert.equal(failed.classification, "failed");
    const guarded = (0, outcome_classifier_1.classifyExperienceOutcome)({
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
