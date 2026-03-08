"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const constants_1 = require("../capabilities/constants");
const language_capability_1 = require("../capabilities/adaptors/language-capability");
const verification_capability_1 = require("../capabilities/adaptors/verification-capability");
const capability_registry_1 = require("../capabilities/registry/capability-registry");
const capability_mesh_orchestrator_1 = require("../capabilities/orchestration/capability-mesh-orchestrator");
const retrieval_capability_1 = require("../capabilities/adaptors/retrieval-capability");
const negative_path_taxonomy_1 = require("../governance/negative-path-taxonomy");
const dispatch_guard_1 = require("../runtime/dispatch-guard");
(0, node_test_1.test)("orchestrator invokes approved capability and returns standardized outcome", async () => {
    const orchestrator = new capability_mesh_orchestrator_1.CapabilityMeshOrchestrator(new capability_registry_1.CapabilityRegistry(), [
        new language_capability_1.LanguageCapability(),
        new verification_capability_1.VerificationCapability(),
    ]);
    const outcome = await orchestrator.invoke({
        requestId: "req-orch-1",
        sessionId: "session-orch",
        capabilityId: constants_1.CAPABILITY_IDS.LANGUAGE,
        purpose: "normalize",
        input: "hello  mesh",
        createdAt: new Date().toISOString(),
    });
    assert.equal(outcome.invokable, true);
    assert.equal(outcome.result.status, "success");
    assert.equal(outcome.capabilityVerification.decision, "accepted");
    assert.equal(outcome.cognitiveSignals.some((signal) => signal.signalType === "execution_ok"), true);
    assert.equal(outcome.shouldCommit, true);
});
(0, node_test_1.test)("orchestrator blocks suspended capability", async () => {
    class SuspendedLanguageCapability extends language_capability_1.LanguageCapability {
        getCapabilityDefinition() {
            return {
                ...super.getCapabilityDefinition(),
                status: "suspended",
            };
        }
    }
    const orchestrator = new capability_mesh_orchestrator_1.CapabilityMeshOrchestrator(new capability_registry_1.CapabilityRegistry(), [
        new SuspendedLanguageCapability(),
        new verification_capability_1.VerificationCapability(),
    ]);
    const outcome = await orchestrator.invoke({
        requestId: "req-orch-2",
        sessionId: "session-orch",
        capabilityId: constants_1.CAPABILITY_IDS.LANGUAGE,
        purpose: "normalize",
        input: "hello",
        createdAt: new Date().toISOString(),
    });
    assert.equal(outcome.invokable, false);
    assert.equal(outcome.result.status, "unavailable");
    assert.equal(outcome.result.classification?.failureClass, "capability_disabled");
});
(0, node_test_1.test)("orchestrator applies verification for required capability", async () => {
    const orchestrator = new capability_mesh_orchestrator_1.CapabilityMeshOrchestrator(new capability_registry_1.CapabilityRegistry(), [
        new retrieval_capability_1.RetrievalCapability([{ id: "r1", text: "mesh contracts" }]),
        new verification_capability_1.VerificationCapability(),
    ]);
    const outcome = await orchestrator.invoke({
        requestId: "req-orch-3",
        sessionId: "session-orch",
        capabilityId: constants_1.CAPABILITY_IDS.RETRIEVAL,
        purpose: "lookup",
        input: { query: "mesh" },
        createdAt: new Date().toISOString(),
    });
    assert.equal(outcome.result.status, "success");
    assert.ok(outcome.verification);
    assert.equal(outcome.shouldCommit, false);
    assert.equal(outcome.verificationDisposition, "passed");
    assert.equal(outcome.governanceIssues.includes(negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.VERIFICATION_FAILED), false);
});
(0, node_test_1.test)("orchestrator does not commit when verification is required but verifier is missing", async () => {
    class RequiredCommitCapability {
        getCapabilityDefinition() {
            return {
                capabilityId: "cap.required.commit.v1",
                name: "required-commit-capability",
                family: "knowledge",
                version: "1.0.0",
                status: "active",
                description: "requires verification",
                ownerAuthority: "test",
                allowedOperations: ["test.required"],
                verificationMode: "required",
                riskLevel: "medium",
                directBrainCommitAllowed: true,
            };
        }
        async invoke(request) {
            return {
                requestId: request.requestId,
                sessionId: request.sessionId,
                capabilityId: request.capabilityId,
                status: "success",
                payload: { ok: true },
                verificationRequired: true,
                completedAt: new Date().toISOString(),
            };
        }
    }
    const orchestrator = new capability_mesh_orchestrator_1.CapabilityMeshOrchestrator(new capability_registry_1.CapabilityRegistry(), [new RequiredCommitCapability()]);
    const outcome = await orchestrator.invoke({
        requestId: "req-orch-missing-verifier",
        sessionId: "session-orch",
        capabilityId: "cap.required.commit.v1",
        purpose: "required-check",
        input: {},
        createdAt: new Date().toISOString(),
    });
    assert.equal(outcome.result.status, "success");
    assert.equal(outcome.verification, undefined);
    assert.equal(outcome.shouldCommit, false);
    assert.equal(outcome.verificationDisposition, "unavailable");
    assert.equal(outcome.governanceIssues.includes(negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.VERIFICATION_UNAVAILABLE), true);
});
(0, node_test_1.test)("orchestrator normalizes malformed capability result envelope", async () => {
    class MalformedCapability {
        getCapabilityDefinition() {
            return {
                capabilityId: "cap.malformed.v1",
                name: "malformed-capability",
                family: "knowledge",
                version: "1.0.0",
                status: "active",
                description: "returns malformed result",
                ownerAuthority: "test",
                allowedOperations: ["test.malformed"],
                verificationMode: "none",
                riskLevel: "low",
                directBrainCommitAllowed: true,
            };
        }
        async invoke(_request) {
            return {
                requestId: "wrong-request",
                sessionId: "wrong-session",
                capabilityId: "wrong-capability",
                status: "success-unknown",
                confidence: Number.NaN,
                verificationRequired: undefined,
                completedAt: "",
            };
        }
    }
    const orchestrator = new capability_mesh_orchestrator_1.CapabilityMeshOrchestrator(new capability_registry_1.CapabilityRegistry(), [new MalformedCapability()]);
    const outcome = await orchestrator.invoke({
        requestId: "req-orch-malformed",
        sessionId: "session-orch",
        capabilityId: "cap.malformed.v1",
        purpose: "malformed-check",
        input: {},
        createdAt: new Date().toISOString(),
    });
    assert.equal(outcome.result.requestId, "req-orch-malformed");
    assert.equal(outcome.result.sessionId, "session-orch");
    assert.equal(outcome.result.capabilityId, "cap.malformed.v1");
    assert.equal(outcome.result.status, "failed");
    assert.equal(outcome.capabilityVerification.adoptable, false);
    assert.equal(outcome.capabilityVerification.decision !== "accepted", true);
    assert.equal(outcome.result.verificationRequired, false);
    assert.equal(typeof outcome.result.completedAt, "string");
    assert.equal(outcome.shouldCommit, false);
    assert.equal(outcome.governanceIssues.includes(negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.CAPABILITY_MALFORMED_RESULT), true);
});
(0, node_test_1.test)("orchestrator preserves verification-failed trust disposition and blocks commit", async () => {
    class RejectingVerificationCapability extends verification_capability_1.VerificationCapability {
        verify(request) {
            return {
                ...super.verify(request),
                verdict: "reject",
                recommendedAction: "reject",
            };
        }
    }
    class CommitCandidateCapability {
        getCapabilityDefinition() {
            return {
                capabilityId: "cap.commit.candidate.v1",
                name: "commit-candidate",
                family: "knowledge",
                version: "1.0.0",
                status: "active",
                description: "candidate commit path",
                ownerAuthority: "test",
                allowedOperations: ["candidate.run"],
                verificationMode: "required",
                riskLevel: "medium",
                directBrainCommitAllowed: true,
            };
        }
        async invoke(request) {
            return {
                requestId: request.requestId,
                sessionId: request.sessionId,
                capabilityId: request.capabilityId,
                status: "success",
                payload: { ok: true },
                verificationRequired: true,
                completedAt: new Date().toISOString(),
            };
        }
    }
    const orchestrator = new capability_mesh_orchestrator_1.CapabilityMeshOrchestrator(new capability_registry_1.CapabilityRegistry(), [
        new CommitCandidateCapability(),
        new RejectingVerificationCapability(),
    ]);
    const outcome = await orchestrator.invoke({
        requestId: "req-orch-verify-reject",
        sessionId: "session-orch",
        capabilityId: "cap.commit.candidate.v1",
        purpose: "verify-and-commit",
        input: { value: 1 },
        createdAt: new Date().toISOString(),
    });
    assert.equal(outcome.verificationDisposition, "failed");
    assert.equal(outcome.governanceIssues.includes(negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.VERIFICATION_FAILED), true);
    assert.equal(outcome.shouldCommit, false);
});
(0, node_test_1.test)("orchestrator preserves downgraded non-trusted outcome without dropping result", async () => {
    class ReviewVerificationCapability extends verification_capability_1.VerificationCapability {
        verify(request) {
            return {
                ...super.verify(request),
                verdict: "review",
                recommendedAction: "review",
            };
        }
    }
    class DowngradedCandidateCapability {
        getCapabilityDefinition() {
            return {
                capabilityId: "cap.downgraded.candidate.v1",
                name: "downgraded-candidate",
                family: "knowledge",
                version: "1.0.0",
                status: "active",
                description: "returns success but needs verification",
                ownerAuthority: "test",
                allowedOperations: ["candidate.review"],
                verificationMode: "required",
                riskLevel: "medium",
                directBrainCommitAllowed: true,
            };
        }
        async invoke(request) {
            return {
                requestId: request.requestId,
                sessionId: request.sessionId,
                capabilityId: request.capabilityId,
                status: "success",
                payload: { ok: true, detail: "non_trusted_review" },
                verificationRequired: true,
                completedAt: new Date().toISOString(),
            };
        }
    }
    const orchestrator = new capability_mesh_orchestrator_1.CapabilityMeshOrchestrator(new capability_registry_1.CapabilityRegistry(), [
        new DowngradedCandidateCapability(),
        new ReviewVerificationCapability(),
    ]);
    const outcome = await orchestrator.invoke({
        requestId: "req-orch-verify-review",
        sessionId: "session-orch",
        capabilityId: "cap.downgraded.candidate.v1",
        purpose: "verify-review",
        input: { value: 1 },
        createdAt: new Date().toISOString(),
    });
    assert.equal(outcome.result.status, "success");
    assert.equal(outcome.verificationDisposition, "downgraded");
    assert.equal(outcome.shouldCommit, false);
    assert.ok(outcome.result.payload);
});
(0, node_test_1.test)("dispatch guard deny blocks adaptor dispatch before invocation", async () => {
    class CountingLanguageCapability extends language_capability_1.LanguageCapability {
        constructor() {
            super(...arguments);
            this.calls = 0;
        }
        async invoke(request) {
            this.calls += 1;
            return super.invoke(request);
        }
    }
    const counting = new CountingLanguageCapability();
    const orchestrator = new capability_mesh_orchestrator_1.CapabilityMeshOrchestrator(new capability_registry_1.CapabilityRegistry(), [counting], undefined, new dispatch_guard_1.DispatchGuard());
    const outcome = await orchestrator.invoke({
        requestId: "req-orch-dispatch-deny",
        sessionId: "session-orch",
        capabilityId: constants_1.CAPABILITY_IDS.LANGUAGE,
        purpose: "normalize",
        input: "hello",
        trace: { dispatchGuardDeny: true },
        createdAt: new Date().toISOString(),
    });
    assert.equal(outcome.result.status, "denied");
    assert.equal(outcome.result.classification?.failureClass, "guard_blocked");
    assert.equal(outcome.capabilityVerification.decision, "policy_rejected");
    assert.equal(outcome.cognitiveSignals.some((signal) => signal.signalType === "guard_block"), true);
    assert.equal(counting.calls, 0);
});
(0, node_test_1.test)("dispatch guard safe mode redirect blocks adaptor dispatch", async () => {
    class CountingLanguageCapability extends language_capability_1.LanguageCapability {
        constructor() {
            super(...arguments);
            this.calls = 0;
        }
        async invoke(request) {
            this.calls += 1;
            return super.invoke(request);
        }
    }
    const counting = new CountingLanguageCapability();
    const orchestrator = new capability_mesh_orchestrator_1.CapabilityMeshOrchestrator(new capability_registry_1.CapabilityRegistry(), [counting], undefined, new dispatch_guard_1.DispatchGuard());
    const outcome = await orchestrator.invoke({
        requestId: "req-orch-dispatch-safe",
        sessionId: "session-orch",
        capabilityId: constants_1.CAPABILITY_IDS.LANGUAGE,
        purpose: "normalize",
        input: "hello",
        trace: { safeMode: true },
        createdAt: new Date().toISOString(),
    });
    assert.equal(outcome.result.status, "denied");
    assert.equal(outcome.result.classification?.failureClass, "guard_blocked");
    assert.equal(counting.calls, 0);
});
(0, node_test_1.test)("orchestrator classifies not-found capability deterministically", async () => {
    const orchestrator = new capability_mesh_orchestrator_1.CapabilityMeshOrchestrator(new capability_registry_1.CapabilityRegistry(), [new language_capability_1.LanguageCapability()]);
    const outcome = await orchestrator.invoke({
        requestId: "req-orch-not-found",
        sessionId: "session-orch",
        capabilityId: "cap.does.not.exist.v1",
        purpose: "resolve",
        input: {},
        createdAt: new Date().toISOString(),
    });
    assert.equal(outcome.result.status, "not_found");
    assert.equal(outcome.result.classification?.failureClass, "capability_not_found");
    assert.deepEqual(outcome.result.classification?.reasonCodes, ["capability_not_registered"]);
});
(0, node_test_1.test)("orchestrator classifies invalid request envelope deterministically", async () => {
    const orchestrator = new capability_mesh_orchestrator_1.CapabilityMeshOrchestrator(new capability_registry_1.CapabilityRegistry(), [new language_capability_1.LanguageCapability()]);
    const outcome = await orchestrator.invoke({
        requestId: " ",
        sessionId: "",
        capabilityId: constants_1.CAPABILITY_IDS.LANGUAGE,
        purpose: "",
        input: "hello",
        createdAt: "bad_date",
    });
    assert.equal(outcome.result.status, "invalid");
    assert.equal(outcome.result.classification?.failureClass, "invalid_request");
    assert.equal(outcome.result.classification?.reasonCodes.includes("created_at_invalid"), true);
});
(0, node_test_1.test)("orchestrator classifies adaptor/provider execution failure", async () => {
    class ThrowingCapability {
        getCapabilityDefinition() {
            return {
                capabilityId: "cap.throwing.v1",
                name: "throwing-capability",
                family: "action",
                version: "1.0.0",
                status: "active",
                description: "throws on invoke",
                ownerAuthority: "test",
                allowedOperations: ["throw.run"],
                verificationMode: "none",
                riskLevel: "high",
                directBrainCommitAllowed: false,
            };
        }
        async invoke(_request) {
            throw new Error("adapter transport failure");
        }
    }
    const orchestrator = new capability_mesh_orchestrator_1.CapabilityMeshOrchestrator(new capability_registry_1.CapabilityRegistry(), [new ThrowingCapability()]);
    const outcome = await orchestrator.invoke({
        requestId: "req-orch-throw",
        sessionId: "session-orch",
        capabilityId: "cap.throwing.v1",
        purpose: "throw",
        input: {},
        createdAt: new Date().toISOString(),
    });
    assert.equal(outcome.result.status, "failed");
    assert.equal(outcome.result.classification?.failureClass, "adapter_dispatch_failure");
    assert.equal(outcome.shouldCommit, false);
});
(0, node_test_1.test)("orchestrator returns normalized classification on success results", async () => {
    const orchestrator = new capability_mesh_orchestrator_1.CapabilityMeshOrchestrator(new capability_registry_1.CapabilityRegistry(), [new language_capability_1.LanguageCapability()]);
    const outcome = await orchestrator.invoke({
        requestId: "req-orch-success-classified",
        sessionId: "session-orch",
        capabilityId: constants_1.CAPABILITY_IDS.LANGUAGE,
        purpose: "normalize",
        input: "hello",
        createdAt: new Date().toISOString(),
    });
    assert.equal(outcome.result.status, "success");
    assert.equal(outcome.result.classification?.status, "success");
    assert.equal(outcome.result.classification?.failureClass, "none");
    assert.equal(outcome.result.classification?.lifecycleStage, "result_normalized");
});
(0, node_test_1.test)("dispatch guard reroutes dispatch to fallback adaptor target", async () => {
    class CountingLanguageCapability extends language_capability_1.LanguageCapability {
        constructor() {
            super(...arguments);
            this.calls = 0;
        }
        async invoke(request) {
            this.calls += 1;
            return super.invoke(request);
        }
    }
    class CountingRetrievalCapability extends retrieval_capability_1.RetrievalCapability {
        constructor() {
            super(...arguments);
            this.calls = 0;
        }
        async invoke(request) {
            this.calls += 1;
            return super.invoke(request);
        }
    }
    const language = new CountingLanguageCapability();
    const retrieval = new CountingRetrievalCapability([{ id: "r1", text: "fallback" }]);
    const orchestrator = new capability_mesh_orchestrator_1.CapabilityMeshOrchestrator(new capability_registry_1.CapabilityRegistry(), [language, retrieval, new verification_capability_1.VerificationCapability()], undefined, new dispatch_guard_1.DispatchGuard());
    const outcome = await orchestrator.invoke({
        requestId: "req-orch-dispatch-reroute",
        sessionId: "session-orch",
        capabilityId: constants_1.CAPABILITY_IDS.LANGUAGE,
        purpose: "normalize",
        input: "hello",
        trace: { dispatchGuardRerouteCapabilityId: constants_1.CAPABILITY_IDS.RETRIEVAL },
        createdAt: new Date().toISOString(),
    });
    assert.equal(language.calls, 0);
    assert.equal(retrieval.calls, 1);
    assert.equal(outcome.result.warnings?.includes("dispatch_guard_reroute"), true);
});
(0, node_test_1.test)("dispatch guard degraded and audit outcomes mark deterministic warnings", async () => {
    const orchestrator = new capability_mesh_orchestrator_1.CapabilityMeshOrchestrator(new capability_registry_1.CapabilityRegistry(), [
        new language_capability_1.LanguageCapability(),
        new verification_capability_1.VerificationCapability(),
    ]);
    const outcome = await orchestrator.invoke({
        requestId: "req-orch-dispatch-degraded-audit",
        sessionId: "session-orch",
        capabilityId: constants_1.CAPABILITY_IDS.LANGUAGE,
        purpose: "normalize",
        input: "hello",
        trace: {
            dispatchGuardForceDegraded: true,
            dispatchGuardRequireAudit: true,
        },
        createdAt: new Date().toISOString(),
    });
    assert.equal(outcome.result.status, "success");
    assert.equal(outcome.result.warnings?.includes("dispatch_guard_degraded_allow"), true);
});
(0, node_test_1.test)("dispatch guard require audit marks warning and allows deterministic dispatch", async () => {
    const orchestrator = new capability_mesh_orchestrator_1.CapabilityMeshOrchestrator(new capability_registry_1.CapabilityRegistry(), [new language_capability_1.LanguageCapability()]);
    const outcome = await orchestrator.invoke({
        requestId: "req-orch-dispatch-audit",
        sessionId: "session-orch",
        capabilityId: constants_1.CAPABILITY_IDS.LANGUAGE,
        purpose: "normalize",
        input: "hello",
        trace: { dispatchGuardRequireAudit: true },
        createdAt: new Date().toISOString(),
    });
    assert.equal(outcome.result.status, "success");
    assert.equal(outcome.result.warnings?.includes("dispatch_guard_require_audit"), true);
});
(0, node_test_1.test)("execution ledger captures runtime and dispatch guard outcomes in capability flow", async () => {
    const orchestrator = new capability_mesh_orchestrator_1.CapabilityMeshOrchestrator(new capability_registry_1.CapabilityRegistry(), [
        new language_capability_1.LanguageCapability(),
        new verification_capability_1.VerificationCapability(),
    ]);
    await orchestrator.invoke({
        requestId: "req-orch-ledger",
        sessionId: "session-orch",
        capabilityId: constants_1.CAPABILITY_IDS.LANGUAGE,
        purpose: "normalize",
        input: "hello",
        trace: {
            dispatchGuardRequireAudit: true,
        },
        createdAt: new Date().toISOString(),
    });
    const entries = orchestrator
        .getExecutionLedgerSnapshot()
        .filter((entry) => entry.ids.requestId === "req-orch-ledger");
    assert.equal(entries.some((entry) => entry.eventType === "runtime.guard.evaluated"), true);
    assert.equal(entries.some((entry) => entry.eventType === "dispatch.guard.evaluated"), true);
    assert.equal(entries.some((entry) => entry.eventType === "execution.started"), true);
    assert.equal(entries.some((entry) => entry.eventType === "execution.completed"), true);
    assert.equal(entries.some((entry) => entry.eventType === "side_effect.intent"), true);
    assert.equal(entries.some((entry) => entry.eventType === "side_effect.completed"), true);
});
