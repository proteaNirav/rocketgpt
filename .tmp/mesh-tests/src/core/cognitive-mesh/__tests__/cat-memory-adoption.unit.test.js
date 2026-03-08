"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const mesh_live_runtime_1 = require("../runtime/mesh-live-runtime");
const mesh_router_1 = require("../routing/mesh-router");
const cognitive_memory_service_1 = require("../memory/cognitive-memory-service");
const constants_1 = require("../brain/constants");
const motivated_recall_engine_1 = require("../memory/motivated-recall-engine");
class SuccessRouter extends mesh_router_1.MeshRouter {
    async route() {
        return {
            accepted: true,
            disposition: "allow",
            trustClass: "trusted",
            riskScore: 0.2,
            firstResponseMs: 9,
            syncPlanId: "plan-cat-memory",
            asyncJobIds: [],
            reasons: ["accepted_by_mesh_router"],
        };
    }
}
class FixedEnabledMotivatedRecallEngine extends motivated_recall_engine_1.MotivatedRecallEngine {
    decide(_input) {
        return {
            enableRecall: true,
            recallMode: "hybrid",
            score: 0.9,
            confidence: 0.85,
            reasons: ["forced_for_test"],
            signalsTriggered: ["goalRelevance"],
        };
    }
}
(0, node_test_1.test)("CAT runtime path injects bounded memory packet when relevant", async () => {
    const memory = new cognitive_memory_service_1.CognitiveMemoryService();
    memory.startSession({
        sessionId: "cat-memory-inject-1",
        sourceType: "chat",
        startedAt: new Date().toISOString(),
    });
    memory.captureConversationMessage({
        sessionId: "cat-memory-inject-1",
        role: "user",
        source: "chat.user_text",
        content: "verification fallback policy for retrieval capability",
        metadata: { routeType: "/api/demo/chat" },
    });
    const runtime = new mesh_live_runtime_1.MeshLiveRuntime(undefined, new SuccessRouter(), {
        cognitiveMemoryService: memory,
        motivatedRecallEngine: new FixedEnabledMotivatedRecallEngine(),
    });
    await runtime.processChatUserRequest({
        sessionId: "cat-memory-inject-1",
        routeType: "/api/demo/chat",
        rawInput: { prompt: "Need verification fallback policy details" },
    });
    const snapshot = runtime.getSessionBrainSnapshot("cat-memory-inject-1");
    assert.ok(snapshot);
    if (!snapshot) {
        throw new Error("missing_snapshot");
    }
    assert.equal(snapshot.workingMemory[constants_1.WORKING_MEMORY_KEYS.LAST_MEMORY_INJECTION_STATUS]?.value, "injected");
    const packetId = snapshot.workingMemory[constants_1.WORKING_MEMORY_KEYS.LAST_MEMORY_PACKET_ID]?.value;
    assert.equal(typeof packetId === "string" && packetId.length > 0, true);
    const memories = memory.listMemoryBySession("cat-memory-inject-1");
    assert.equal(memories.length > 0, true);
    const selectionReason = snapshot.workingMemory[constants_1.WORKING_MEMORY_KEYS.LAST_MEMORY_SELECTION_REASON]?.value;
    assert.equal(typeof selectionReason === "string" && selectionReason.includes("eligible="), true);
});
