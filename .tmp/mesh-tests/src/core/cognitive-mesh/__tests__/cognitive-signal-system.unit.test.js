"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const cognitive_signal_system_1 = require("../runtime/cognitive-signal-system");
function verification(decision, adoptable) {
    return {
        decision,
        adoptable,
        reasonCodes: decision === "accepted" ? [] : ["RESULT_DIAGNOSTICS_INVALID"],
        warnings: decision === "accepted_with_warnings" ? ["warning"] : [],
        normalizedStatus: adoptable ? "success" : "failed",
    };
}
(0, node_test_1.test)("cognitive signal system generates deterministic ids for equivalent signals", () => {
    const first = (0, cognitive_signal_system_1.createRuntimeSignal)({
        signalType: "execution_ok",
        category: "execution",
        source: "unit",
        severity: "info",
        ids: { requestId: "req-1", sessionId: "sess-1" },
        capabilityId: "cap.language.v1",
        reasonCodes: ["ok"],
    });
    const second = (0, cognitive_signal_system_1.createRuntimeSignal)({
        signalType: "execution_ok",
        category: "execution",
        source: "unit",
        severity: "info",
        ids: { requestId: "req-1", sessionId: "sess-1" },
        capabilityId: "cap.language.v1",
        reasonCodes: ["ok"],
    });
    assert.equal(first.signalId, second.signalId);
    assert.equal(first.stableIdentity, second.stableIdentity);
});
(0, node_test_1.test)("capability signal derivation emits baseline success and adoption candidates", () => {
    const signals = (0, cognitive_signal_system_1.deriveCapabilitySignals)({
        source: "unit",
        ids: { requestId: "req-success", sessionId: "sess-success" },
        capabilityId: "cap.language.v1",
        capabilityStatus: "success",
        capabilityVerification: verification("accepted", true),
        shouldCommit: true,
        verificationRequired: false,
        governanceIssues: [],
    });
    const types = (0, cognitive_signal_system_1.summarizeSignalTypes)(signals);
    assert.equal(types.includes("execution_ok"), true);
    assert.equal(types.includes("memory_candidate"), true);
    assert.equal(types.includes("experience_candidate"), true);
});
(0, node_test_1.test)("capability signal derivation emits degraded and warning/rejection signals deterministically", () => {
    const degraded = (0, cognitive_signal_system_1.deriveCapabilitySignals)({
        source: "unit",
        ids: { requestId: "req-degraded", sessionId: "sess-degraded" },
        capabilityId: "cap.retrieval.v1",
        capabilityStatus: "degraded_success",
        capabilityVerification: verification("degraded_accepted", true),
        runtimeGuardOutcome: "degraded_allow",
        shouldCommit: false,
        verificationRequired: true,
        governanceIssues: [],
    });
    assert.equal((0, cognitive_signal_system_1.summarizeSignalTypes)(degraded).includes("degraded_execution"), true);
    const rejected = (0, cognitive_signal_system_1.deriveCapabilitySignals)({
        source: "unit",
        ids: { requestId: "req-reject", sessionId: "sess-reject" },
        capabilityId: "cap.language.v1",
        capabilityStatus: "success",
        capabilityVerification: verification("invalid_result", false),
        shouldCommit: false,
        verificationRequired: false,
        governanceIssues: [],
    });
    const rejectedTypes = (0, cognitive_signal_system_1.summarizeSignalTypes)(rejected);
    assert.equal(rejectedTypes.includes("verification_rejected"), true);
    assert.equal(rejectedTypes.includes("adoption_suppressed"), true);
});
(0, node_test_1.test)("guard and dispatch outcomes map to canonical signals", () => {
    const signals = (0, cognitive_signal_system_1.deriveCapabilitySignals)({
        source: "unit",
        ids: { requestId: "req-guard", sessionId: "sess-guard" },
        capabilityId: "cap.language.v1",
        capabilityStatus: "blocked",
        capabilityVerification: verification("policy_rejected", false),
        runtimeGuardOutcome: "safe_mode_redirect",
        dispatchGuardOutcome: "reroute",
        shouldCommit: false,
        verificationRequired: false,
        governanceIssues: [],
    });
    const types = (0, cognitive_signal_system_1.summarizeSignalTypes)(signals);
    assert.equal(types.includes("guard_block"), true);
    assert.equal(types.includes("safe_mode_redirect"), true);
    assert.equal(types.includes("dispatch_reroute"), true);
});
(0, node_test_1.test)("integrity and drift findings convert to canonical warning signals", () => {
    const integrity = {
        summary: {
            status: "invalid",
            streamCount: 1,
            recordCount: 2,
            validRecordCount: 1,
            invalidRecordCount: 1,
            warningCount: 1,
            errorCount: 1,
            partial: false,
        },
        findings: [
            {
                code: "CHAIN_EVENT_HASH_MISMATCH",
                severity: "error",
                scope: "record",
                message: "hash mismatch",
            },
        ],
        streamStats: [],
    };
    const drift = {
        summary: {
            status: "drift_detected",
            streamCount: 1,
            recordCount: 1,
            sideEffectIntentCount: 1,
            sideEffectCompletionCount: 0,
            matchedSideEffectCount: 0,
            unmatchedIntentCount: 1,
            unmatchedCompletionCount: 0,
            driftFindingCount: 1,
            warningCount: 0,
            partial: false,
            integrityStatus: "invalid",
        },
        findings: [
            {
                code: "INTENT_WITHOUT_COMPLETION",
                severity: "high",
                scope: "side_effect",
                message: "missing completion",
            },
        ],
        streamStats: [],
        integrity,
    };
    const integritySignals = (0, cognitive_signal_system_1.deriveIntegritySignals)(integrity, { executionId: "exec-1" }, "unit_integrity");
    const driftSignals = (0, cognitive_signal_system_1.deriveDriftSignals)(drift, { executionId: "exec-1" }, "unit_drift");
    assert.equal(integritySignals.length, 1);
    assert.equal(integritySignals[0]?.signalType, "integrity_warning");
    assert.equal(driftSignals.length, 1);
    assert.equal(driftSignals[0]?.signalType, "drift_detected");
});
