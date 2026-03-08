"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const constitutional_evaluation_1 = require("../../governance/constitution/constitutional-evaluation");
const mesh_live_runtime_1 = require("../runtime/mesh-live-runtime");
const mesh_router_1 = require("../routing/mesh-router");
class SuccessRouter extends mesh_router_1.MeshRouter {
    async route() {
        return {
            accepted: true,
            disposition: "allow",
            trustClass: "trusted",
            riskScore: 0.2,
            firstResponseMs: 12,
            syncPlanId: "plan-constitutional",
            asyncJobIds: [],
            reasons: ["accepted_by_mesh_router"],
        };
    }
}
(0, node_test_1.test)("constitutional hook marks verified success as aligned deterministically", async () => {
    const hook = new constitutional_evaluation_1.ConstitutionalEvaluationHook();
    const input = {
        evaluatedEntityType: "runtime_execution",
        evaluatedEntityId: "exec-1",
        executionId: "exec-1",
        sessionId: "s1",
        resultStatus: "success",
        verificationDecision: "accepted",
        fallbackTriggered: false,
        cognitiveSignalTypes: ["execution_ok"],
        reinforcementAppliedCount: 1,
        hasExperienceRecord: true,
    };
    const first = await hook.evaluate(input);
    const second = await hook.evaluate(input);
    assert.equal(first.constitutionalStatus, "aligned");
    assert.equal(first.constitutionalScore, second.constitutionalScore);
    assert.deepEqual(first.constitutionalReasonCodes, second.constitutionalReasonCodes);
    assert.equal(first.alignedPrinciples.includes("governed_existence"), true);
});
(0, node_test_1.test)("constitutional hook marks degraded fallback as tension", async () => {
    const hook = new constitutional_evaluation_1.ConstitutionalEvaluationHook();
    const result = await hook.evaluate({
        evaluatedEntityType: "runtime_execution",
        evaluatedEntityId: "exec-2",
        resultStatus: "degraded_success",
        verificationDecision: "degraded_accepted",
        fallbackTriggered: true,
        cognitiveSignalTypes: ["degraded_execution"],
    });
    assert.equal(["tension_detected", "aligned_with_tension"].includes(result.constitutionalStatus), true);
    assert.equal(result.stressedPrinciples.includes("continuity_preservation"), true);
});
(0, node_test_1.test)("constitutional hook marks drift/integrity as potential violation", async () => {
    const hook = new constitutional_evaluation_1.ConstitutionalEvaluationHook();
    const result = await hook.evaluate({
        evaluatedEntityType: "runtime_execution",
        evaluatedEntityId: "exec-3",
        resultStatus: "failed",
        verificationDecision: "rejected",
        cognitiveSignalTypes: ["drift_detected", "integrity_warning"],
    });
    assert.equal(result.constitutionalStatus, "potential_violation");
    assert.equal(result.violatedPrinciples.includes("continuity_preservation"), true);
});
(0, node_test_1.test)("constitutional hook treats denied unsafe path as governance alignment", async () => {
    const hook = new constitutional_evaluation_1.ConstitutionalEvaluationHook();
    const result = await hook.evaluate({
        evaluatedEntityType: "runtime_execution",
        evaluatedEntityId: "exec-4",
        resultStatus: "denied",
        runtimeGuardOutcome: "deny",
        cognitiveSignalTypes: ["guard_block"],
    });
    assert.equal(result.alignedPrinciples.includes("governed_existence"), true);
});
(0, node_test_1.test)("constitutional hook returns insufficient_data deterministically", async () => {
    const hook = new constitutional_evaluation_1.ConstitutionalEvaluationHook();
    const result = await hook.evaluate({
        evaluatedEntityType: "runtime_execution",
        evaluatedEntityId: "exec-5",
    });
    assert.equal(result.constitutionalStatus, "insufficient_data");
    assert.equal(result.constitutionalScore, 0.5);
});
(0, node_test_1.test)("runtime exposes passive constitutional evaluation metadata", async () => {
    const runtime = new mesh_live_runtime_1.MeshLiveRuntime(undefined, new SuccessRouter());
    const sessionId = "constitutional-runtime-s1";
    await runtime.processWorkflowTrigger({
        sessionId,
        requestId: "req-constitutional-1",
        routeType: "/api/orchestrator/run/status",
        rawInput: { runId: 88, check: "constitutional hook" },
    });
    const snapshot = runtime.getSessionBrainSnapshot(sessionId);
    if (snapshot) {
        assert.equal(typeof snapshot.workingMemory["runtime.last_constitutional_status"]?.value, "string");
    }
    const experiences = runtime.getRecentExperiences(sessionId, 5);
    if (experiences.length > 0) {
        const experienceMeta = experiences[0]?.experienceMetadata;
        assert.equal(typeof experienceMeta?.constitutionalEvaluation?.constitutionalStatus, "string");
    }
    const ledger = runtime.getExecutionLedgerSnapshot();
    const latest = ledger[ledger.length - 1];
    assert.equal(typeof latest?.metadata?.constitutionalStatus, "string");
});
