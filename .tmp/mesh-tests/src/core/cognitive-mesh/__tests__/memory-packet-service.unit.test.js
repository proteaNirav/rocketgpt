"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const cognitive_memory_service_1 = require("../memory/cognitive-memory-service");
(0, node_test_1.test)("memory packet generation enforces minimum sufficient filtered payload", () => {
    const service = new cognitive_memory_service_1.CognitiveMemoryService();
    service.startSession({
        sessionId: "mem-packet-1",
        sourceType: "chat",
        startedAt: new Date().toISOString(),
    });
    service.captureConversationMessage({
        sessionId: "mem-packet-1",
        role: "user",
        content: "Need capability verification outcome summary",
        source: "chat.user_text",
        metadata: { routeType: "/api/demo/chat" },
    });
    service.captureConversationMessage({
        sessionId: "mem-packet-1",
        role: "assistant",
        content: "Stored fallback_exhausted governance explanation",
        source: "chat.assistant_text",
        metadata: { routeType: "/api/demo/chat" },
    });
    const packet = service.buildMemoryPacket({
        sessionId: "mem-packet-1",
        capabilityId: "language",
        purpose: "capability_injection:language",
        entitlement: { allowInjection: true },
    }, {
        query: "verification",
        limit: 2,
        relevanceFloor: 0.4,
    });
    assert.equal(packet.memoryItems.length <= 2, true);
    assert.equal(packet.provenance.explicit, true);
    assert.equal(packet.relevanceFloor >= 0.4, true);
    assert.equal(packet.provenance.recallReason.includes("quality_filtered"), true);
    const blocked = service.buildMemoryPacket({
        sessionId: "mem-packet-1",
        capabilityId: "language",
        purpose: "capability_injection:language",
        entitlement: { allowInjection: false, reason: "policy_denied" },
    });
    assert.equal(blocked.memoryItems.length, 0);
    assert.equal(blocked.provenance.recallReason.includes("injection_blocked"), true);
});
(0, node_test_1.test)("memory packet excludes suppressed/rejected adopted memories from selection", () => {
    const service = new cognitive_memory_service_1.CognitiveMemoryService();
    const sessionId = "mem-packet-2";
    service.startSession({
        sessionId,
        sourceType: "chat",
        startedAt: new Date().toISOString(),
    });
    service.saveMemoryItem({
        memoryId: "mem-good",
        sessionId,
        layer: "decision_linked",
        content: "trusted verification fallback guidance",
        tags: [{ key: "capability_id", value: "language" }],
        links: [],
        provenance: { source: "test" },
        scores: {
            importance: 0.7,
            novelty: 0.5,
            confidence: 0.8,
            reuse: 0.7,
            relevance: 0.8,
            recency: 0.8,
            crossDomainUsefulness: 0.3,
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
    service.saveMemoryItem({
        memoryId: "mem-bad",
        sessionId,
        layer: "decision_linked",
        content: "suppressed risky guidance",
        tags: [{ key: "capability_id", value: "language" }],
        links: [],
        provenance: { source: "test" },
        scores: {
            importance: 0.9,
            novelty: 0.6,
            confidence: 0.9,
            reuse: 0.8,
            relevance: 0.9,
            recency: 0.9,
            crossDomainUsefulness: 0.3,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
            quality: "suppressed",
            adoptionDecision: "suppressed",
            signalTypes: ["drift_detected"],
            reasonCodes: ["DRIFT_RISK_SUPPRESSED"],
            warnings: [],
        },
    });
    const packet = service.buildMemoryPacket({
        sessionId,
        capabilityId: "language",
        purpose: "capability_injection:language",
        entitlement: { allowInjection: true },
    }, {
        query: "guidance",
        limit: 5,
        relevanceFloor: 0.1,
    });
    assert.equal(packet.memoryItems.some((item) => item.memoryId === "mem-good"), true);
    assert.equal(packet.memoryItems.some((item) => item.memoryId === "mem-bad"), false);
});
