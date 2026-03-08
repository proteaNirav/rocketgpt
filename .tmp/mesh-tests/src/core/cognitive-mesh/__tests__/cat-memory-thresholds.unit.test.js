"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const mesh_live_runtime_1 = require("../runtime/mesh-live-runtime");
const mesh_router_1 = require("../routing/mesh-router");
const cognitive_memory_service_1 = require("../memory/cognitive-memory-service");
const cat_memory_adoption_service_1 = require("../memory/cat-memory-adoption-service");
const constants_1 = require("../brain/constants");
class SuccessRouter extends mesh_router_1.MeshRouter {
    async route() {
        return {
            accepted: true,
            disposition: "allow",
            trustClass: "trusted",
            riskScore: 0.2,
            firstResponseMs: 10,
            syncPlanId: "plan-threshold",
            asyncJobIds: [],
            reasons: ["accepted_by_mesh_router"],
        };
    }
}
class ForcedThresholdSkipAdoptionService extends cat_memory_adoption_service_1.CatMemoryAdoptionService {
    prepare() {
        return {
            decision: {
                injected: false,
                status: "skipped_threshold",
                reason: "forced_test_threshold_skip",
                relevanceFloor: 0.95,
                packetItemCount: 0,
            },
            trace: {
                explicitRecallCount: 0,
                implicitRecallCount: 0,
                selectedMemoryIds: [],
                selectionReason: "forced_test_threshold_skip",
                experienceReuseDecision: {
                    influenced: true,
                    signalScore: 0.1,
                    hint: "do_not_prioritize",
                    basis: "forced_test",
                },
            },
        };
    }
    summarizeOutcome(_input) {
        return {
            usefulness: "uncertain",
            recommendation: "insufficient_evidence",
            note: "forced_test_threshold_skip",
        };
    }
}
(0, node_test_1.test)("CAT runtime path does not inject memory when threshold is not met", async () => {
    const memory = new cognitive_memory_service_1.CognitiveMemoryService();
    const forced = new ForcedThresholdSkipAdoptionService(memory, {
        experienceProvider: () => [],
    });
    const runtime = new mesh_live_runtime_1.MeshLiveRuntime(undefined, new SuccessRouter(), {
        cognitiveMemoryService: memory,
        catMemoryAdoptionService: forced,
    });
    await runtime.processChatUserRequest({
        sessionId: "cat-memory-threshold-skip-1",
        routeType: "/api/demo/chat",
        rawInput: { prompt: "basic hello" },
    });
    const snapshot = runtime.getSessionBrainSnapshot("cat-memory-threshold-skip-1");
    assert.ok(snapshot);
    if (!snapshot) {
        throw new Error("missing_snapshot");
    }
    assert.equal(snapshot.workingMemory[constants_1.WORKING_MEMORY_KEYS.LAST_MEMORY_INJECTION_STATUS]?.value, "skipped_threshold");
    assert.equal(snapshot.workingMemory[constants_1.WORKING_MEMORY_KEYS.LAST_MEMORY_PACKET_ID]?.value, null);
});
(0, node_test_1.test)("optional memory hook path works when memory service is absent", async () => {
    const runtime = new mesh_live_runtime_1.MeshLiveRuntime(undefined, new SuccessRouter());
    await runtime.processChatUserRequest({
        sessionId: "cat-memory-disabled-1",
        routeType: "/api/demo/chat",
        rawInput: { prompt: "no memory service configured" },
    });
    const snapshot = runtime.getSessionBrainSnapshot("cat-memory-disabled-1");
    assert.ok(snapshot);
    if (!snapshot) {
        throw new Error("missing_snapshot");
    }
    assert.equal(snapshot.workingMemory[constants_1.WORKING_MEMORY_KEYS.LAST_MEMORY_INJECTION_STATUS]?.value, "disabled");
});
