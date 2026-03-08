"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const cognitive_memory_service_1 = require("../memory/cognitive-memory-service");
function buildMemory(params) {
    return {
        memoryId: params.memoryId,
        sessionId: params.sessionId,
        layer: "decision_linked",
        content: params.content,
        tags: [
            ...(params.routeType ? [{ key: "route_type", value: params.routeType }] : []),
            ...(params.capabilityId ? [{ key: "capability_id", value: params.capabilityId }] : []),
        ],
        links: [],
        provenance: { source: "test" },
        scores: {
            importance: 0.6,
            novelty: 0.5,
            confidence: 0.7,
            reuse: 0.6,
            relevance: 0.7,
            recency: 0.7,
            crossDomainUsefulness: 0.3,
        },
        createdAt: params.updatedAt,
        updatedAt: params.updatedAt,
        metadata: {
            quality: params.quality,
            adoptionDecision: params.adoptionDecision,
            signalTypes: params.signalTypes ?? [],
            reasonCodes: [],
            warnings: [],
        },
    };
}
(0, node_test_1.test)("recall foundation prefers high-quality adopted memory and excludes suppressed/rejected", () => {
    const service = new cognitive_memory_service_1.CognitiveMemoryService();
    const sessionId = "recall-strength-1";
    service.startSession({
        sessionId,
        sourceType: "chat",
        startedAt: new Date().toISOString(),
    });
    const now = Date.now();
    service.saveMemoryItem(buildMemory({
        memoryId: "mem-trusted",
        sessionId,
        content: "trusted capability result for verification flow",
        updatedAt: new Date(now).toISOString(),
        quality: "trusted",
        adoptionDecision: "adopted",
        routeType: "/api/demo/chat",
        capabilityId: "cap.language.v1",
    }));
    service.saveMemoryItem(buildMemory({
        memoryId: "mem-suppressed",
        sessionId,
        content: "suppressed due to drift",
        updatedAt: new Date(now - 1000).toISOString(),
        quality: "suppressed",
        adoptionDecision: "suppressed",
        signalTypes: ["drift_detected"],
    }));
    service.saveMemoryItem(buildMemory({
        memoryId: "mem-rejected",
        sessionId,
        content: "rejected result",
        updatedAt: new Date(now - 2000).toISOString(),
        quality: "warning",
        adoptionDecision: "rejected",
    }));
    const recalled = service.recallAdoptedMemory({
        sessionId,
        query: "verification",
        routeType: "/api/demo/chat",
        capabilityId: "cap.language.v1",
        maxItems: 5,
    });
    assert.equal(recalled.items.length >= 1, true);
    assert.equal(recalled.items.some((item) => item.memory.memoryId === "mem-trusted"), true);
    assert.equal(recalled.items.some((item) => item.memory.memoryId === "mem-suppressed"), false);
    assert.equal(recalled.items.some((item) => item.memory.memoryId === "mem-rejected"), false);
    assert.equal(recalled.exclusions.some((entry) => entry.memoryId === "mem-suppressed"), true);
    assert.equal(recalled.exclusions.some((entry) => entry.memoryId === "mem-rejected"), true);
});
(0, node_test_1.test)("recall foundation keeps downgraded/warning items but ranks trusted higher deterministically", () => {
    const service = new cognitive_memory_service_1.CognitiveMemoryService();
    const sessionId = "recall-strength-2";
    service.startSession({
        sessionId,
        sourceType: "workflow",
        startedAt: new Date().toISOString(),
    });
    const now = Date.now();
    service.saveMemoryItem(buildMemory({
        memoryId: "mem-warning",
        sessionId,
        content: "warning memory for fallback",
        updatedAt: new Date(now).toISOString(),
        quality: "warning",
        adoptionDecision: "adopted_with_warnings",
        capabilityId: "cap.retrieval.v1",
    }));
    service.saveMemoryItem(buildMemory({
        memoryId: "mem-trusted",
        sessionId,
        content: "trusted retrieval memory for fallback",
        updatedAt: new Date(now - 10000).toISOString(),
        quality: "trusted",
        adoptionDecision: "adopted",
        capabilityId: "cap.retrieval.v1",
    }));
    const recalled = service.recallAdoptedMemory({
        sessionId,
        query: "fallback",
        capabilityId: "cap.retrieval.v1",
        maxItems: 2,
    });
    assert.equal(recalled.items.length, 2);
    assert.equal(recalled.items[0]?.memory.memoryId, "mem-trusted");
    assert.equal(recalled.items[1]?.memory.memoryId, "mem-warning");
});
(0, node_test_1.test)("recall ranking uses reinforcement score as bounded factor", () => {
    const service = new cognitive_memory_service_1.CognitiveMemoryService();
    const sessionId = "recall-strength-4";
    service.startSession({
        sessionId,
        sourceType: "chat",
        startedAt: new Date().toISOString(),
    });
    const now = Date.now();
    service.saveMemoryItem(buildMemory({
        memoryId: "mem-reinforced-strong",
        sessionId,
        content: "trusted repeated success memory",
        updatedAt: new Date(now - 20000).toISOString(),
        quality: "trusted",
        adoptionDecision: "adopted",
        capabilityId: "cap.language.v1",
    }));
    service.saveMemoryItem(buildMemory({
        memoryId: "mem-reinforced-weak",
        sessionId,
        content: "trusted repeated success memory",
        updatedAt: new Date(now).toISOString(),
        quality: "trusted",
        adoptionDecision: "adopted",
        capabilityId: "cap.language.v1",
    }));
    service.reinforceMemory({
        memoryId: "mem-reinforced-strong",
        resultStatus: "success",
        verificationDecision: "accepted",
        verificationAdoptable: true,
        cognitiveSignalTypes: [],
    });
    service.reinforceMemory({
        memoryId: "mem-reinforced-strong",
        resultStatus: "success",
        verificationDecision: "accepted",
        verificationAdoptable: true,
        cognitiveSignalTypes: [],
    });
    service.reinforceMemory({
        memoryId: "mem-reinforced-weak",
        resultStatus: "failed",
        verificationDecision: "rejected",
        verificationAdoptable: false,
        cognitiveSignalTypes: ["drift_detected"],
    });
    const recalled = service.recallAdoptedMemory({
        sessionId,
        query: "trusted repeated success memory",
        capabilityId: "cap.language.v1",
        maxItems: 2,
    });
    assert.equal(recalled.items.length, 2);
    assert.equal(recalled.items[0]?.memory.memoryId, "mem-reinforced-strong");
});
(0, node_test_1.test)("recall foundation excludes malformed and anomaly-risk candidates safely", () => {
    const service = new cognitive_memory_service_1.CognitiveMemoryService();
    const sessionId = "recall-strength-3";
    service.startSession({
        sessionId,
        sourceType: "chat",
        startedAt: new Date().toISOString(),
    });
    const now = new Date().toISOString();
    service.saveMemoryItem(buildMemory({
        memoryId: "mem-risky",
        sessionId,
        content: "risky memory",
        updatedAt: now,
        quality: "trusted",
        adoptionDecision: "adopted",
        signalTypes: ["integrity_warning"],
    }));
    service.saveMemoryItem({
        ...buildMemory({
            memoryId: "mem-malformed",
            sessionId,
            content: "",
            updatedAt: now,
            quality: "trusted",
            adoptionDecision: "adopted",
        }),
        content: "",
    });
    const recalled = service.recallAdoptedMemory({
        sessionId,
        query: "memory",
        maxItems: 3,
    });
    assert.equal(recalled.items.some((item) => item.memory.memoryId === "mem-risky"), false);
    assert.equal(recalled.exclusions.some((entry) => entry.reasonCode === "ANOMALY_RISK_EXCLUDED"), true);
    assert.equal(recalled.exclusions.some((entry) => entry.reasonCode === "MALFORMED_MEMORY_ITEM"), true);
});
