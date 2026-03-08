"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const cognitive_memory_service_1 = require("../memory/cognitive-memory-service");
(0, node_test_1.test)("implicit resurfacing is conservative and advisory", () => {
    const service = new cognitive_memory_service_1.CognitiveMemoryService();
    service.startSession({
        sessionId: "mem-implicit-1",
        sourceType: "workflow",
        startedAt: new Date().toISOString(),
    });
    service.captureConversationMessage({
        sessionId: "mem-implicit-1",
        role: "runtime",
        content: "route policy decision selected fallback due to verifier unavailable",
        source: "workflow.trigger",
        metadata: { routeType: "/api/orchestrator/run" },
    });
    service.captureConversationMessage({
        sessionId: "mem-implicit-1",
        role: "runtime",
        content: "unrelated short note",
        source: "workflow.trigger",
        metadata: { routeType: "/api/orchestrator/other" },
    });
    const result = service.implicitResurface({
        sessionId: "mem-implicit-1",
        sourceType: "workflow.trigger",
        routeType: "/api/orchestrator/run",
        intentHint: "fallback verifier",
        riskScore: 0.7,
        threshold: 0.7,
        limit: 2,
    });
    assert.equal(result.advisory, true);
    assert.equal(result.recallEvent.advisoryOnly, true);
    assert.equal(result.items.length <= 2, true);
    assert.equal(result.threshold >= 0.45, true);
});
