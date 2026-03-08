"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const cognitive_experience_capture_service_1 = require("../experience/services/cognitive-experience-capture-service");
const in_memory_experience_repository_1 = require("../experience/repository/in-memory-experience-repository");
(0, node_test_1.test)("benchmark: experience capture in-memory path sanity guard (not end-to-end SLA)", () => {
    const service = new cognitive_experience_capture_service_1.CognitiveExperienceCaptureService(new in_memory_experience_repository_1.InMemoryExperienceRepository(5000));
    const started = Date.now();
    let captured = 0;
    for (let i = 0; i < 500; i += 1) {
        const result = service.captureExecutionExperience({
            sessionId: `bench-${Math.floor(i / 25)}`,
            timestamp: new Date(1700000000000 + i * 1000).toISOString(),
            source: { component: "mesh-live-runtime", source: "workflow:trigger", requestId: `req-${i}`, eventId: `evt-${i}` },
            situation: { mode: "workflow", routeType: "/api/orchestrator/run/status", sourceType: "workflow.trigger" },
            context: { cognitiveState: "completed", trustClass: "trusted", riskScore: 0.6, tags: ["benchmark"] },
            action: {
                capabilityId: "cap.retrieval.v1",
                capabilityStatus: i % 10 === 0 ? "blocked" : "success",
                verificationInvoked: true,
                routeDisposition: "allow",
                routeAccepted: true,
            },
            verification: { required: true, verdict: i % 10 === 0 ? "review" : "accept", confidence: 0.7 },
            circumstances: {
                fallbackTriggered: i % 8 === 0,
                guardrailApplied: i % 10 === 0,
                verificationRequired: true,
                verificationVerdict: i % 10 === 0 ? "review" : "accept",
                capabilitiesUsed: ["cap.retrieval.v1"],
                requestComplexityScore: 0.7,
                stateFragility: false,
                recoveryPathUsed: i % 8 === 0,
                confidence: 0.7,
            },
            routeFallbackUsed: i % 8 === 0,
            tags: ["benchmark"],
        });
        if (result.captured) {
            captured += 1;
        }
    }
    const elapsed = Date.now() - started;
    assert.equal(captured > 0, true);
    // Non-blocking CI sanity guard for the in-memory path only (not system-wide SLA).
    assert.equal(elapsed < 900, true, `experience capture benchmark exceeded budget: ${elapsed}ms`);
});
