"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const memory_reinforcement_scoring_1 = require("../memory/memory-reinforcement-scoring");
const cognitive_memory_service_1 = require("../memory/cognitive-memory-service");
(0, node_test_1.test)("reinforcement scoring increases score for successful verified outcomes", () => {
    const scoring = new memory_reinforcement_scoring_1.MemoryReinforcementScoring();
    const outcome = scoring.evaluate({
        memoryId: "mem-rf-1",
        currentScore: 1,
        resultStatus: "success",
        verificationDecision: "accepted",
        verificationAdoptable: true,
        cognitiveSignalTypes: [],
        usedInRecall: true,
    });
    assert.equal(outcome.state.reinforcementTrend, "up");
    assert.equal(outcome.state.reinforcementScore > 1, true);
    assert.equal(outcome.state.reinforcementReasonCodes.includes("EXECUTION_SUCCESS_VERIFIED"), true);
});
(0, node_test_1.test)("reinforcement scoring decreases score for anomaly and rejection signals", () => {
    const scoring = new memory_reinforcement_scoring_1.MemoryReinforcementScoring();
    const outcome = scoring.evaluate({
        memoryId: "mem-rf-2",
        currentScore: 1.3,
        resultStatus: "failed",
        verificationDecision: "rejected",
        verificationAdoptable: false,
        cognitiveSignalTypes: ["drift_detected", "integrity_warning"],
        fallbackTriggered: true,
    });
    assert.equal(outcome.state.reinforcementTrend, "down");
    assert.equal(outcome.state.reinforcementScore < 1.3, true);
    assert.equal(outcome.state.reinforcementReasonCodes.includes("DRIFT_DETECTED"), true);
    assert.equal(outcome.state.reinforcementReasonCodes.includes("INTEGRITY_WARNING"), true);
});
(0, node_test_1.test)("reinforcement scoring keeps scores bounded deterministically", () => {
    const scoring = new memory_reinforcement_scoring_1.MemoryReinforcementScoring();
    const high = scoring.evaluate({
        memoryId: "mem-rf-3",
        currentScore: 2.49,
        resultStatus: "success",
        verificationDecision: "accepted",
        verificationAdoptable: true,
        cognitiveSignalTypes: [],
        usedInRecall: true,
    });
    const low = scoring.evaluate({
        memoryId: "mem-rf-4",
        currentScore: 0.01,
        resultStatus: "failed",
        verificationDecision: "rejected",
        verificationAdoptable: false,
        cognitiveSignalTypes: ["drift_detected", "integrity_warning"],
        fallbackTriggered: true,
        adoptedSuppressed: true,
    });
    assert.equal(high.state.reinforcementScore <= 2.5, true);
    assert.equal(low.state.reinforcementScore >= 0, true);
    assert.equal(high.state.reinforcementReasonCodes.includes("SCORE_BOUNDED_MAX") ||
        low.state.reinforcementReasonCodes.includes("SCORE_BOUNDED_MIN"), true);
});
(0, node_test_1.test)("cognitive memory service persists reinforcement metadata deterministically", () => {
    const service = new cognitive_memory_service_1.CognitiveMemoryService();
    const sessionId = "mem-rf-service";
    service.startSession({
        sessionId,
        sourceType: "chat",
        startedAt: new Date().toISOString(),
    });
    service.saveMemoryItem({
        memoryId: "mem-rf-service-1",
        sessionId,
        layer: "decision_linked",
        content: "service reinforcement memory",
        tags: [],
        links: [],
        provenance: { source: "test" },
        scores: {
            importance: 0.5,
            novelty: 0.4,
            confidence: 0.7,
            reuse: 0.5,
            relevance: 0.6,
            recency: 0.8,
            crossDomainUsefulness: 0.2,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
            quality: "trusted",
            adoptionDecision: "adopted",
            signalTypes: [],
            reasonCodes: [],
            warnings: [],
        },
    });
    const reinforced = service.reinforceMemory({
        memoryId: "mem-rf-service-1",
        resultStatus: "success",
        verificationDecision: "accepted",
        verificationAdoptable: true,
        cognitiveSignalTypes: [],
    });
    assert.ok(reinforced);
    const stored = service.listMemoryBySession(sessionId).find((item) => item.memoryId === "mem-rf-service-1");
    assert.ok(stored);
    assert.equal(typeof stored?.metadata?.reinforcementScore, "number");
    assert.equal(typeof stored?.metadata?.reinforcementEvents, "number");
});
