"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const mesh_live_runtime_1 = require("../runtime/mesh-live-runtime");
const mesh_router_1 = require("../routing/mesh-router");
const cognitive_memory_service_1 = require("../memory/cognitive-memory-service");
const constants_1 = require("../brain/constants");
class SuccessRouter extends mesh_router_1.MeshRouter {
    async route() {
        return {
            accepted: true,
            disposition: "allow",
            trustClass: "trusted",
            riskScore: 0.2,
            firstResponseMs: 10,
            syncPlanId: "plan-b10",
            asyncJobIds: [],
            reasons: ["accepted_by_mesh_router"],
        };
    }
}
(0, node_test_1.test)("runtime captures conversation memory and feedback synthesis without changing route semantics", async () => {
    const memoryService = new cognitive_memory_service_1.CognitiveMemoryService();
    const runtime = new mesh_live_runtime_1.MeshLiveRuntime(undefined, new SuccessRouter(), {
        cognitiveMemoryService: memoryService,
    });
    const result = await runtime.processWorkflowTrigger({
        sessionId: "b10-runtime-mem-1",
        requestId: "req-b10-runtime-mem-1",
        routeType: "/api/orchestrator/run/status",
        rawInput: { runId: 18, prompt: "capture memory" },
    });
    assert.equal(result.accepted, true);
    const snapshot = runtime.getCognitiveMemoryRepositorySnapshot();
    assert.ok(snapshot);
    assert.equal((snapshot?.sessionCount ?? 0) >= 1, true);
    assert.equal((snapshot?.messageCount ?? 0) >= 1, true);
    assert.equal((snapshot?.memoryItemCount ?? 0) >= 1, true);
});
(0, node_test_1.test)("runtime memory adoption persists normalized record metadata deterministically", async () => {
    const memoryService = new cognitive_memory_service_1.CognitiveMemoryService();
    const runtime = new mesh_live_runtime_1.MeshLiveRuntime(undefined, new SuccessRouter(), {
        cognitiveMemoryService: memoryService,
    });
    await runtime.processChatUserRequest({
        sessionId: "b12-runtime-adopt-1",
        requestId: "req-b12-runtime-adopt-1",
        routeType: "/api/demo/chat",
        rawInput: { prompt: "adopt this result" },
    });
    const snapshot = runtime.getSessionBrainSnapshot("b12-runtime-adopt-1");
    assert.ok(snapshot);
    if (!snapshot) {
        throw new Error("missing_session_snapshot");
    }
    assert.equal(["adopted", "adopted_with_warnings", "downgraded_adoption"].includes(String(snapshot.workingMemory[constants_1.WORKING_MEMORY_KEYS.LAST_MEMORY_ADOPTION_STATUS]?.value)), true);
    const adoptedRecordId = snapshot.workingMemory[constants_1.WORKING_MEMORY_KEYS.LAST_MEMORY_ADOPTED_RECORD_ID]?.value;
    const reinforcementCount = snapshot.workingMemory[constants_1.WORKING_MEMORY_KEYS.LAST_MEMORY_REINFORCEMENT_COUNT]?.value;
    assert.equal(typeof reinforcementCount, "number");
    assert.equal((reinforcementCount ?? 0) >= 1, true);
    if (adoptedRecordId) {
        const memories = memoryService.listMemoryBySession("b12-runtime-adopt-1");
        assert.equal(memories.some((item) => item.memoryId === adoptedRecordId), true);
        const adopted = memories.find((item) => item.memoryId === adoptedRecordId);
        assert.equal(typeof adopted?.metadata?.reinforcementScore, "number");
    }
});
