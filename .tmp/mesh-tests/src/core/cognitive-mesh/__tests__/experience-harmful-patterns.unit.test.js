"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const cognitive_experience_capture_service_1 = require("../experience/services/cognitive-experience-capture-service");
const in_memory_experience_repository_1 = require("../experience/repository/in-memory-experience-repository");
const negative_path_taxonomy_1 = require("../governance/negative-path-taxonomy");
function baseFacts(sessionId) {
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
        governanceIssues: [negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.VERIFICATION_UNAVAILABLE],
        tags: ["test"],
    };
}
(0, node_test_1.test)("CEL adds harmful pattern tag for repeated verifier absence", () => {
    const service = new cognitive_experience_capture_service_1.CognitiveExperienceCaptureService(new in_memory_experience_repository_1.InMemoryExperienceRepository(100));
    const sessionId = "harmful-verifier-absence";
    const first = service.captureExecutionExperience(baseFacts(sessionId));
    const second = service.captureExecutionExperience(baseFacts(sessionId));
    const third = service.captureExecutionExperience(baseFacts(sessionId));
    assert.equal(first.record.tags.includes("harmful:repeated_verifier_absence"), false);
    assert.equal(second.record.tags.includes("harmful:repeated_verifier_absence"), false);
    assert.equal(third.captured, true);
    assert.equal(third.record.tags.includes("harmful:repeated_verifier_absence"), true);
    assert.equal(third.record.tags.includes(`issue:${negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.VERIFICATION_UNAVAILABLE}`), true);
    assert.equal(third.record.governanceIssues.includes(negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.VERIFICATION_UNAVAILABLE), true);
});
(0, node_test_1.test)("CEL adds harmful pattern tag for guarded outcome clusters", () => {
    const service = new cognitive_experience_capture_service_1.CognitiveExperienceCaptureService(new in_memory_experience_repository_1.InMemoryExperienceRepository(100));
    const sessionId = "harmful-guarded-cluster";
    const guardedFacts = {
        ...baseFacts(sessionId),
        action: {
            ...baseFacts(sessionId).action,
            capabilityStatus: "blocked",
        },
        circumstances: {
            ...baseFacts(sessionId).circumstances,
            guardrailApplied: true,
        },
        governanceIssues: [negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.GUARDRAIL_BLOCKED],
    };
    service.captureExecutionExperience(guardedFacts);
    service.captureExecutionExperience(guardedFacts);
    const third = service.captureExecutionExperience(guardedFacts);
    assert.equal(third.captured, true);
    assert.equal(third.record.outcome.classification, "guarded");
    assert.equal(third.record.tags.includes("harmful:guarded_outcome_cluster"), true);
});
