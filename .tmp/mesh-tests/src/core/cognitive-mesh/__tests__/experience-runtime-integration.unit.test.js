"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const mesh_live_runtime_1 = require("../runtime/mesh-live-runtime");
const mesh_router_1 = require("../routing/mesh-router");
const constants_1 = require("../brain/constants");
const negative_path_taxonomy_1 = require("../governance/negative-path-taxonomy");
const capability_registry_1 = require("../capabilities/registry/capability-registry");
const capability_mesh_orchestrator_1 = require("../capabilities/orchestration/capability-mesh-orchestrator");
const constants_2 = require("../capabilities/constants");
class SuccessRouter extends mesh_router_1.MeshRouter {
    async route() {
        return {
            accepted: true,
            disposition: "allow",
            trustClass: "trusted",
            riskScore: 0.2,
            firstResponseMs: 10,
            syncPlanId: "plan-1",
            asyncJobIds: [],
            reasons: ["accepted_by_mesh_router"],
        };
    }
}
class ThrowingLanguageCapability {
    getCapabilityDefinition() {
        return {
            capabilityId: constants_2.CAPABILITY_IDS.LANGUAGE,
            name: "throwing-language",
            family: "knowledge",
            version: "1.0.0",
            status: "active",
            description: "throws for test fallback",
            ownerAuthority: "test",
            allowedOperations: ["language.normalize"],
            verificationMode: "none",
            riskLevel: "low",
            directBrainCommitAllowed: true,
        };
    }
    async invoke(_request) {
        throw new Error("capability_failure");
    }
}
class SuspendedLanguageCapability {
    getCapabilityDefinition() {
        return {
            capabilityId: constants_2.CAPABILITY_IDS.LANGUAGE,
            name: "suspended-language",
            family: "knowledge",
            version: "1.0.0",
            status: "suspended",
            description: "blocked by guardrail",
            ownerAuthority: "test",
            allowedOperations: ["language.normalize"],
            verificationMode: "required",
            riskLevel: "high",
            directBrainCommitAllowed: false,
        };
    }
    async invoke(_request) {
        throw new Error("should_not_invoke_suspended_capability");
    }
}
(0, node_test_1.test)("runtime captures success with verification for workflow path", async () => {
    const runtime = new mesh_live_runtime_1.MeshLiveRuntime(undefined, new SuccessRouter());
    const sessionId = "cel-workflow-success-verify";
    await runtime.processWorkflowTrigger({
        sessionId,
        requestId: "req-cel-workflow-verify",
        routeType: "/api/orchestrator/run/status",
        rawInput: { runId: 5 },
    });
    const experiences = runtime.getExperiencesByOutcome("successful-with-verification", 10);
    assert.equal(experiences.some((item) => item.sessionId === sessionId), true);
});
(0, node_test_1.test)("runtime captures fallback path when capability fails in fallback mode", async () => {
    const orchestrator = new capability_mesh_orchestrator_1.CapabilityMeshOrchestrator(new capability_registry_1.CapabilityRegistry(), [new ThrowingLanguageCapability()]);
    const runtime = new mesh_live_runtime_1.MeshLiveRuntime(undefined, new SuccessRouter(), {
        capabilityOrchestrator: orchestrator,
        capabilityFailureMode: "fallback",
    });
    const sessionId = "cel-chat-fallback";
    await runtime.processChatUserRequest({
        sessionId,
        requestId: "req-cel-fallback",
        routeType: "/api/demo/chat",
        rawInput: { prompt: "hello" },
    });
    const experiences = runtime.getExperiencesByOutcome("successful-with-fallback", 10);
    assert.equal(experiences.some((item) => item.sessionId === sessionId), true);
});
(0, node_test_1.test)("runtime captures guarded outcome when capability is suspended", async () => {
    const orchestrator = new capability_mesh_orchestrator_1.CapabilityMeshOrchestrator(new capability_registry_1.CapabilityRegistry(), [new SuspendedLanguageCapability()]);
    const runtime = new mesh_live_runtime_1.MeshLiveRuntime(undefined, new SuccessRouter(), {
        capabilityOrchestrator: orchestrator,
        capabilityFailureMode: "fallback",
    });
    const sessionId = "cel-chat-guarded";
    await runtime.processChatUserRequest({
        sessionId,
        requestId: "req-cel-guarded",
        routeType: "/api/demo/chat",
        rawInput: { prompt: "guard this" },
    });
    const experiences = runtime.getExperiencesByOutcome("guarded", 10);
    assert.equal(experiences.some((item) => item.sessionId === sessionId), true);
    const guarded = experiences.find((item) => item.sessionId === sessionId);
    assert.ok(guarded);
    assert.equal(guarded?.governanceIssues.includes(negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.GUARDRAIL_BLOCKED), true);
});
(0, node_test_1.test)("runtime captures failed outcome when strict capability mode throws", async () => {
    const orchestrator = new capability_mesh_orchestrator_1.CapabilityMeshOrchestrator(new capability_registry_1.CapabilityRegistry(), [new ThrowingLanguageCapability()]);
    const runtime = new mesh_live_runtime_1.MeshLiveRuntime(undefined, new SuccessRouter(), {
        capabilityOrchestrator: orchestrator,
        capabilityFailureMode: "strict",
    });
    const sessionId = "cel-chat-failed";
    await assert.rejects(runtime.processChatUserRequest({
        sessionId,
        requestId: "req-cel-failed",
        routeType: "/api/demo/chat",
        rawInput: { prompt: "fail" },
    }), /capability_failure/);
    const experiences = runtime.getExperiencesByOutcome("failed", 10);
    assert.equal(experiences.some((item) => item.sessionId === sessionId), true);
    const failed = experiences.find((item) => item.sessionId === sessionId);
    assert.ok(failed);
    assert.equal(failed?.governanceIssues.includes(negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.FALLBACK_EXHAUSTED), true);
});
(0, node_test_1.test)("runtime does not capture trivial successful chat event", async () => {
    const runtime = new mesh_live_runtime_1.MeshLiveRuntime(undefined, new SuccessRouter());
    const sessionId = "cel-chat-trivial";
    await runtime.processChatUserRequest({
        sessionId,
        requestId: "req-cel-trivial",
        routeType: "/api/demo/chat",
        rawInput: { prompt: "simple ping" },
    });
    const recent = runtime.getRecentExperiences(sessionId, 10);
    assert.equal(recent.length, 0);
    const snapshot = runtime.getSessionBrainSnapshot(sessionId);
    assert.ok(snapshot);
    if (!snapshot) {
        throw new Error("missing_snapshot_for_trivial_case");
    }
    assert.equal(snapshot.workingMemory[constants_1.WORKING_MEMORY_KEYS.LAST_EXPERIENCE_CAPTURE_STATUS]?.value, "skipped");
    assert.equal(snapshot.workingMemory[constants_1.WORKING_MEMORY_KEYS.LAST_EXPERIENCE_ID]?.value, null);
    assert.equal(snapshot.workingMemory[constants_1.WORKING_MEMORY_KEYS.LAST_EXPERIENCE_OUTCOME]?.value, null);
    assert.equal(snapshot.decisionTrail.some((entry) => entry.category === constants_1.DECISION_CATEGORIES.EXPERIENCE_CAPTURE), true);
});
(0, node_test_1.test)("runtime preserves fallback provenance in experience tagging", async () => {
    const orchestrator = new capability_mesh_orchestrator_1.CapabilityMeshOrchestrator(new capability_registry_1.CapabilityRegistry(), [new ThrowingLanguageCapability()]);
    const runtime = new mesh_live_runtime_1.MeshLiveRuntime(undefined, new SuccessRouter(), {
        capabilityOrchestrator: orchestrator,
        capabilityFailureMode: "fallback",
    });
    const sessionId = "cel-fallback-provenance";
    await runtime.processChatUserRequest({
        sessionId,
        requestId: "req-cel-fallback-provenance",
        routeType: "/api/demo/chat",
        rawInput: { prompt: "fallback provenance" },
    });
    const records = runtime.getRecentExperiences(sessionId, 10);
    assert.equal(records.length >= 1, true);
    const latest = records[0];
    assert.equal(latest.outcome.classification, "successful-with-fallback");
    assert.equal(latest.tags.includes("issue:fallback_exhausted"), false);
    assert.equal(latest.tags.includes("cel.fallback"), true);
});
