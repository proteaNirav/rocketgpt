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
            riskScore: 0.18,
            firstResponseMs: 11,
            syncPlanId: "plan-reuse-selection",
            asyncJobIds: [],
            reasons: ["accepted_by_mesh_router"],
        };
    }
}
(0, node_test_1.test)("prior useful experience influences later memory selection hint", async () => {
    const memory = new cognitive_memory_service_1.CognitiveMemoryService();
    const runtime = new mesh_live_runtime_1.MeshLiveRuntime(undefined, new SuccessRouter(), {
        cognitiveMemoryService: memory,
    });
    const sessionId = "cat-experience-reuse-1";
    await runtime.processWorkflowTrigger({
        sessionId,
        routeType: "/api/orchestrator/run/status",
        rawInput: { runId: 91, note: "first run" },
    });
    const first = runtime.getSessionBrainSnapshot(sessionId);
    assert.ok(first);
    if (!first) {
        throw new Error("missing_first_snapshot");
    }
    const firstHint = first.workingMemory[constants_1.WORKING_MEMORY_KEYS.LAST_MEMORY_REUSE_HINT]?.value;
    await runtime.processWorkflowTrigger({
        sessionId,
        routeType: "/api/orchestrator/run/status",
        rawInput: { runId: 92, note: "second run with prior experience" },
    });
    const second = runtime.getSessionBrainSnapshot(sessionId);
    assert.ok(second);
    if (!second) {
        throw new Error("missing_second_snapshot");
    }
    const secondHint = second.workingMemory[constants_1.WORKING_MEMORY_KEYS.LAST_MEMORY_REUSE_HINT]?.value;
    assert.equal(typeof secondHint, "string");
    assert.equal(secondHint === "prefer_next_time" || secondHint === "use_cautiously", true);
    assert.equal(firstHint !== undefined, true);
});
