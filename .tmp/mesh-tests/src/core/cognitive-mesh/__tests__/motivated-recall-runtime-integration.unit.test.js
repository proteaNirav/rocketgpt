"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const mesh_live_runtime_1 = require("../runtime/mesh-live-runtime");
const mesh_router_1 = require("../routing/mesh-router");
const cognitive_memory_service_1 = require("../memory/cognitive-memory-service");
const motivated_recall_engine_1 = require("../memory/motivated-recall-engine");
const constants_1 = require("../brain/constants");
class SuccessRouter extends mesh_router_1.MeshRouter {
    async route() {
        return {
            accepted: true,
            disposition: "allow",
            trustClass: "trusted",
            riskScore: 0.2,
            firstResponseMs: 9,
            syncPlanId: "plan-motivated-runtime",
            asyncJobIds: [],
            reasons: ["accepted_by_mesh_router"],
        };
    }
}
class FixedMotivatedRecallEngine extends motivated_recall_engine_1.MotivatedRecallEngine {
    constructor(fixed) {
        super();
        this.fixed = fixed;
    }
    decide(_input) {
        return { ...this.fixed, reasons: [...this.fixed.reasons], signalsTriggered: [...this.fixed.signalsTriggered] };
    }
}
(0, node_test_1.test)("runtime skips memory services when motivated recall is disabled", async () => {
    const memoryService = new cognitive_memory_service_1.CognitiveMemoryService();
    const runtime = new mesh_live_runtime_1.MeshLiveRuntime(undefined, new SuccessRouter(), {
        cognitiveMemoryService: memoryService,
        motivatedRecallEngine: new FixedMotivatedRecallEngine({
            enableRecall: false,
            recallMode: "none",
            score: 0.1,
            confidence: 0.7,
            reasons: ["forced_none"],
            signalsTriggered: [],
        }),
    });
    const sessionId = "mr-runtime-none";
    await runtime.processChatUserRequest({
        sessionId,
        routeType: "/api/demo/chat",
        rawInput: { prompt: "hello" },
    });
    const snapshot = runtime.getSessionBrainSnapshot(sessionId);
    assert.ok(snapshot);
    if (!snapshot) {
        throw new Error("missing_snapshot");
    }
    assert.equal(snapshot.workingMemory[constants_1.WORKING_MEMORY_KEYS.LAST_MOTIVATED_RECALL_MODE]?.value, "none");
    assert.equal(snapshot.workingMemory[constants_1.WORKING_MEMORY_KEYS.LAST_MEMORY_INJECTION_STATUS]?.value, "disabled");
});
(0, node_test_1.test)("runtime invokes memory services when motivated recall is enabled", async () => {
    const memoryService = new cognitive_memory_service_1.CognitiveMemoryService();
    memoryService.startSession({
        sessionId: "mr-runtime-hybrid",
        sourceType: "chat",
        startedAt: new Date().toISOString(),
    });
    memoryService.captureConversationMessage({
        sessionId: "mr-runtime-hybrid",
        role: "user",
        source: "chat.user_text",
        content: "Need retrieval verification fallback summary",
        metadata: { routeType: "/api/orchestrator/run/status" },
    });
    const runtime = new mesh_live_runtime_1.MeshLiveRuntime(undefined, new SuccessRouter(), {
        cognitiveMemoryService: memoryService,
        motivatedRecallEngine: new FixedMotivatedRecallEngine({
            enableRecall: true,
            recallMode: "hybrid",
            score: 0.9,
            confidence: 0.88,
            reasons: ["forced_hybrid"],
            signalsTriggered: ["priorExperienceUsefulness"],
        }),
    });
    await runtime.processWorkflowTrigger({
        sessionId: "mr-runtime-hybrid",
        routeType: "/api/orchestrator/run/status",
        rawInput: { runId: 451, prompt: "verification context" },
    });
    const snapshot = runtime.getSessionBrainSnapshot("mr-runtime-hybrid");
    assert.ok(snapshot);
    if (!snapshot) {
        throw new Error("missing_snapshot");
    }
    assert.equal(snapshot.workingMemory[constants_1.WORKING_MEMORY_KEYS.LAST_MOTIVATED_RECALL_MODE]?.value, "hybrid");
    assert.equal(snapshot.workingMemory[constants_1.WORKING_MEMORY_KEYS.LAST_MEMORY_INJECTION_STATUS]?.value, "injected");
    assert.equal(snapshot.workingMemory[constants_1.WORKING_MEMORY_KEYS.LAST_MEMORY_PACKET_ID]?.value != null, true);
});
