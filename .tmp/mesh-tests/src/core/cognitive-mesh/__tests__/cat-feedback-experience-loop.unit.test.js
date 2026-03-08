"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const mesh_live_runtime_1 = require("../runtime/mesh-live-runtime");
const mesh_router_1 = require("../routing/mesh-router");
const cognitive_memory_service_1 = require("../memory/cognitive-memory-service");
class SuccessRouter extends mesh_router_1.MeshRouter {
    async route() {
        return {
            accepted: true,
            disposition: "allow",
            trustClass: "trusted",
            riskScore: 0.2,
            firstResponseMs: 8,
            syncPlanId: "plan-feedback-loop",
            asyncJobIds: [],
            reasons: ["accepted_by_mesh_router"],
        };
    }
}
(0, node_test_1.test)("CAT feedback is synthesized after execution and stored as reusable decision-linked memory", async () => {
    const memory = new cognitive_memory_service_1.CognitiveMemoryService();
    const runtime = new mesh_live_runtime_1.MeshLiveRuntime(undefined, new SuccessRouter(), {
        cognitiveMemoryService: memory,
    });
    await runtime.processWorkflowTrigger({
        sessionId: "cat-feedback-loop-1",
        routeType: "/api/orchestrator/run/status",
        rawInput: { runId: 77, note: "verify memory feedback loop" },
    });
    const memories = memory.listMemoryBySession("cat-feedback-loop-1");
    const synthesized = memories.find((entry) => entry.tags.some((tag) => tag.key === "category" && tag.value === "cat_feedback"));
    assert.ok(synthesized);
    if (!synthesized) {
        throw new Error("missing_synthesized_feedback_memory");
    }
    assert.equal(synthesized.layer, "decision_linked");
    assert.equal(synthesized.metadata?.feedbackId != null, true);
    const experiences = runtime.getRecentExperiences("cat-feedback-loop-1", 10);
    assert.equal(experiences.length >= 1, true);
});
