"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const node_os_1 = require("node:os");
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const execution_ledger_1 = require("../runtime/execution-ledger");
const side_effect_drift_detector_1 = require("../runtime/side-effect-drift-detector");
function buildBaseLedger(executionId) {
    const ledger = new execution_ledger_1.ExecutionLedger("", "");
    const ids = {
        executionId,
        requestId: `${executionId}-req`,
        correlationId: `${executionId}-corr`,
        sessionId: `${executionId}-sess`,
    };
    ledger.append({
        category: "dispatch",
        eventType: "dispatch.guard.evaluated",
        action: "dispatch",
        source: "mesh_live_runtime",
        target: "/api/demo/chat",
        ids,
        mode: "normal",
        status: "evaluated",
    });
    ledger.append({
        category: "runtime",
        eventType: "runtime.guard.evaluated",
        action: "dispatch",
        source: "mesh_live_runtime",
        target: "/api/demo/chat",
        ids,
        mode: "normal",
        status: "evaluated",
    });
    ledger.append({
        category: "execution",
        eventType: "execution.started",
        action: "dispatch",
        source: "mesh_live_runtime",
        target: "/api/demo/chat",
        ids,
        mode: "normal",
        status: "started",
    });
    return ledger;
}
(0, node_test_1.test)("side-effect drift detector returns no_drift for matched intent/completion", () => {
    const ledger = buildBaseLedger("exec-drift-valid");
    const ids = {
        executionId: "exec-drift-valid",
        requestId: "exec-drift-valid-req",
        correlationId: "exec-drift-valid-corr",
    };
    ledger.append({
        category: "side_effect",
        eventType: "side_effect.intent",
        action: "write_audit",
        source: "capability_mesh_orchestrator",
        target: "audit_log",
        ids,
        mode: "normal",
        status: "intent",
        sideEffect: { intent: true, completed: false },
    });
    ledger.append({
        category: "side_effect",
        eventType: "side_effect.completed",
        action: "write_audit",
        source: "capability_mesh_orchestrator",
        target: "audit_log",
        ids,
        mode: "normal",
        status: "completed",
        sideEffect: { intent: false, completed: true },
    });
    ledger.append({
        category: "execution",
        eventType: "execution.completed",
        action: "dispatch",
        source: "mesh_live_runtime",
        target: "/api/demo/chat",
        ids,
        mode: "normal",
        status: "completed",
    });
    const result = (0, side_effect_drift_detector_1.detectSideEffectDrift)({
        timelineEvents: ledger.timelineSnapshot(),
        verifyIntegrityIfMissing: true,
    });
    assert.equal(result.summary.status, "no_drift");
    assert.equal(result.summary.driftFindingCount, 0);
});
(0, node_test_1.test)("side-effect drift detector catches intent without completion before execution_completed", () => {
    const ledger = buildBaseLedger("exec-drift-missing-completion");
    const ids = {
        executionId: "exec-drift-missing-completion",
        requestId: "exec-drift-missing-completion-req",
        correlationId: "exec-drift-missing-completion-corr",
    };
    ledger.append({
        category: "side_effect",
        eventType: "side_effect.intent",
        action: "persist_result",
        source: "capability_mesh_orchestrator",
        target: "result_store",
        ids,
        mode: "normal",
        status: "intent",
        sideEffect: { intent: true, completed: false },
    });
    ledger.append({
        category: "execution",
        eventType: "execution.completed",
        action: "dispatch",
        source: "mesh_live_runtime",
        target: "/api/demo/chat",
        ids,
        mode: "normal",
        status: "completed",
    });
    const result = (0, side_effect_drift_detector_1.detectSideEffectDrift)({
        timelineEvents: ledger.timelineSnapshot(),
        verifyIntegrityIfMissing: true,
    });
    assert.equal(result.summary.status, "drift_detected");
    assert.equal(result.findings.some((finding) => finding.code === "INTENT_WITHOUT_COMPLETION"), true);
    assert.equal(result.findings.some((finding) => finding.code === "REQUIRED_SIDE_EFFECT_MISSING_BEFORE_EXECUTION_COMPLETED"), true);
});
(0, node_test_1.test)("side-effect drift detector catches completion without intent", () => {
    const ledger = buildBaseLedger("exec-drift-completion-only");
    const ids = {
        executionId: "exec-drift-completion-only",
        requestId: "exec-drift-completion-only-req",
        correlationId: "exec-drift-completion-only-corr",
    };
    ledger.append({
        category: "side_effect",
        eventType: "side_effect.completed",
        action: "send_webhook",
        source: "courier_service",
        target: "external_webhook",
        ids,
        mode: "normal",
        status: "completed",
        sideEffect: { intent: false, completed: true },
    });
    const result = (0, side_effect_drift_detector_1.detectSideEffectDrift)({
        timelineEvents: ledger.timelineSnapshot(),
        verifyIntegrityIfMissing: true,
    });
    assert.equal(result.summary.status, "drift_detected");
    assert.equal(result.findings.some((finding) => finding.code === "COMPLETION_WITHOUT_INTENT"), true);
});
(0, node_test_1.test)("side-effect drift detector catches mismatch and constrained mode drift", () => {
    const ledger = buildBaseLedger("exec-drift-mismatch");
    const ids = {
        executionId: "exec-drift-mismatch",
        requestId: "exec-drift-mismatch-req",
        correlationId: "exec-drift-mismatch-corr",
    };
    ledger.append({
        category: "side_effect",
        eventType: "side_effect.intent",
        action: "publish_message",
        source: "cognitive_mesh_job_dispatcher",
        target: "route_A",
        ids,
        mode: "reroute",
        status: "intent",
        sideEffect: { intent: true, completed: false },
    });
    ledger.append({
        category: "side_effect",
        eventType: "side_effect.completed",
        action: "publish_message",
        source: "cognitive_mesh_job_dispatcher",
        target: "route_B",
        ids,
        mode: "degraded",
        status: "completed",
        sideEffect: { intent: false, completed: true },
    });
    ledger.append({
        category: "side_effect",
        eventType: "side_effect.completed",
        action: "publish_message",
        source: "cognitive_mesh_job_dispatcher",
        target: "route_A",
        ids,
        mode: "degraded",
        status: "completed",
        sideEffect: { intent: false, completed: true },
    });
    const result = (0, side_effect_drift_detector_1.detectSideEffectDrift)({
        timelineEvents: ledger.timelineSnapshot(),
        verifyIntegrityIfMissing: true,
    });
    assert.equal(result.summary.status, "drift_detected");
    assert.equal(result.findings.some((finding) => finding.code === "COMPLETION_MISMATCH_TARGET"), true);
    assert.equal(result.findings.some((finding) => finding.code === "COMPLETION_MISMATCH_MODE"), true);
});
(0, node_test_1.test)("side-effect drift detector catches duplicate side-effect completion", () => {
    const ledger = buildBaseLedger("exec-drift-duplicate");
    const ids = {
        executionId: "exec-drift-duplicate",
        requestId: "exec-drift-duplicate-req",
        correlationId: "exec-drift-duplicate-corr",
    };
    ledger.append({
        category: "side_effect",
        eventType: "side_effect.intent",
        action: "write_cache",
        source: "capability_mesh_orchestrator",
        target: "cache_key_a",
        ids,
        mode: "normal",
        status: "intent",
        sideEffect: { intent: true, completed: false },
    });
    ledger.append({
        category: "side_effect",
        eventType: "side_effect.completed",
        action: "write_cache",
        source: "capability_mesh_orchestrator",
        target: "cache_key_a",
        ids,
        mode: "normal",
        status: "completed",
        sideEffect: { intent: false, completed: true },
    });
    ledger.append({
        category: "side_effect",
        eventType: "side_effect.completed",
        action: "write_cache",
        source: "capability_mesh_orchestrator",
        target: "cache_key_a",
        ids,
        mode: "normal",
        status: "completed",
        sideEffect: { intent: false, completed: true },
    });
    const result = (0, side_effect_drift_detector_1.detectSideEffectDrift)({
        timelineEvents: ledger.timelineSnapshot(),
        verifyIntegrityIfMissing: true,
    });
    assert.equal(result.summary.status, "drift_detected");
    assert.equal(result.findings.some((finding) => finding.code === "DUPLICATE_COMPLETION"), true);
});
(0, node_test_1.test)("side-effect drift detector catches completion in denied/safe-mode flow", () => {
    const ledger = buildBaseLedger("exec-drift-denied");
    const ids = {
        executionId: "exec-drift-denied",
        requestId: "exec-drift-denied-req",
        correlationId: "exec-drift-denied-corr",
    };
    ledger.append({
        category: "execution",
        eventType: "execution.denied",
        action: "dispatch",
        source: "dispatch_guard",
        target: "/api/demo/chat",
        ids,
        mode: "safe_mode_redirect",
        status: "denied",
    });
    ledger.append({
        category: "side_effect",
        eventType: "side_effect.completed",
        action: "send_webhook",
        source: "courier_service",
        target: "external_webhook",
        ids,
        mode: "safe_mode_redirect",
        status: "completed",
        sideEffect: { intent: false, completed: true },
    });
    const result = (0, side_effect_drift_detector_1.detectSideEffectDrift)({
        timelineEvents: ledger.timelineSnapshot(),
        verifyIntegrityIfMissing: true,
    });
    assert.equal(result.summary.status, "drift_detected");
    assert.equal(result.findings.some((finding) => finding.code === "COMPLETION_AFTER_DENIED_FLOW" || finding.code === "COMPLETION_AFTER_SAFE_MODE_REDIRECT"), true);
});
(0, node_test_1.test)("side-effect drift detector supports deterministic summaries and JSONL helper", async () => {
    const tempDir = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "rgpt-drift-"));
    try {
        const filePath = (0, node_path_1.join)(tempDir, "timeline.jsonl");
        const ledger = buildBaseLedger("exec-drift-jsonl");
        const ids = {
            executionId: "exec-drift-jsonl",
            requestId: "exec-drift-jsonl-req",
            correlationId: "exec-drift-jsonl-corr",
        };
        ledger.append({
            category: "side_effect",
            eventType: "side_effect.intent",
            action: "write_audit",
            source: "capability_mesh_orchestrator",
            target: "audit_log",
            ids,
            mode: "normal",
            status: "intent",
            sideEffect: { intent: true, completed: false },
        });
        ledger.append({
            category: "side_effect",
            eventType: "side_effect.completed",
            action: "write_audit",
            source: "capability_mesh_orchestrator",
            target: "audit_log",
            ids,
            mode: "normal",
            status: "completed",
            sideEffect: { intent: false, completed: true },
        });
        const timeline = ledger.timelineSnapshot();
        await (0, promises_1.writeFile)(filePath, `${JSON.stringify(timeline[0])}\nnot_json\n${JSON.stringify(timeline[1])}\n`, "utf8");
        const result = await (0, side_effect_drift_detector_1.detectSideEffectDriftForTimelineJsonlFile)(filePath, { verifyIntegrity: true });
        assert.equal(result.findings.some((finding) => finding.code === "JSONL_PARSE_ERROR"), true);
        const summaryText = (0, side_effect_drift_detector_1.formatSideEffectDriftSummary)(result);
        assert.equal(summaryText.includes("records=2"), true);
        assert.equal(summaryText.includes("partial=true"), true);
    }
    finally {
        await (0, promises_1.rm)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("execution ledger exposes drift signals when drift is detected", () => {
    const ledger = buildBaseLedger("exec-drift-signal");
    const ids = {
        executionId: "exec-drift-signal",
        requestId: "exec-drift-signal-req",
        correlationId: "exec-drift-signal-corr",
    };
    ledger.append({
        category: "side_effect",
        eventType: "side_effect.intent",
        action: "persist_result",
        source: "capability_mesh_orchestrator",
        target: "result_store",
        ids,
        mode: "normal",
        status: "intent",
        sideEffect: { intent: true, completed: false },
    });
    ledger.append({
        category: "execution",
        eventType: "execution.completed",
        action: "dispatch",
        source: "mesh_live_runtime",
        target: "/api/demo/chat",
        ids,
        mode: "normal",
        status: "completed",
    });
    const withSignals = ledger.detectSideEffectDriftWithSignals();
    assert.equal(withSignals.drift.summary.status, "drift_detected");
    assert.equal(withSignals.signals.length, 1);
    assert.equal(withSignals.signals[0]?.signalType, "drift_detected");
});
