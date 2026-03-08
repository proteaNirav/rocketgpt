"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const mesh_live_runtime_1 = require("../runtime/mesh-live-runtime");
const mesh_router_1 = require("../routing/mesh-router");
const cognitive_memory_service_1 = require("../memory/cognitive-memory-service");
const capability_mesh_orchestrator_1 = require("../capabilities/orchestration/capability-mesh-orchestrator");
const capability_registry_1 = require("../capabilities/registry/capability-registry");
const retrieval_capability_1 = require("../capabilities/adaptors/retrieval-capability");
const constants_1 = require("../brain/constants");
class SuccessRouter extends mesh_router_1.MeshRouter {
    async route() {
        return {
            accepted: true,
            disposition: "allow",
            trustClass: "trusted",
            riskScore: 0.22,
            firstResponseMs: 10,
            syncPlanId: "plan-governance-compat",
            asyncJobIds: [],
            reasons: ["accepted_by_mesh_router"],
        };
    }
}
(0, node_test_1.test)("memory-aware CAT flow preserves Batch-9 verification/trust semantics", async () => {
    const orchestrator = new capability_mesh_orchestrator_1.CapabilityMeshOrchestrator(new capability_registry_1.CapabilityRegistry(), [new retrieval_capability_1.RetrievalCapability([])]);
    const memory = new cognitive_memory_service_1.CognitiveMemoryService();
    const runtime = new mesh_live_runtime_1.MeshLiveRuntime(undefined, new SuccessRouter(), {
        cognitiveMemoryService: memory,
        capabilityOrchestrator: orchestrator,
    });
    await runtime.processWorkflowTrigger({
        sessionId: "cat-memory-governance-compat-1",
        routeType: "/api/orchestrator/run/status",
        rawInput: { runId: 333, note: "verification service intentionally missing" },
    });
    const snapshot = runtime.getSessionBrainSnapshot("cat-memory-governance-compat-1");
    assert.ok(snapshot);
    if (!snapshot) {
        throw new Error("missing_snapshot");
    }
    const committedPayload = snapshot.workingMemory["runtime.capability.retrieval.payload"]?.value;
    assert.equal(committedPayload, undefined);
    assert.equal(snapshot.workingMemory[constants_1.WORKING_MEMORY_KEYS.LAST_MEMORY_INJECTION_STATUS]?.value !== undefined, true);
});
