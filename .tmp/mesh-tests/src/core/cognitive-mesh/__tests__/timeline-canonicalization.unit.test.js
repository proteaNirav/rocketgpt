"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const capability_registry_1 = require("../capabilities/registry/capability-registry");
const capability_mesh_orchestrator_1 = require("../capabilities/orchestration/capability-mesh-orchestrator");
const constants_1 = require("../capabilities/constants");
const language_capability_1 = require("../capabilities/adaptors/language-capability");
const mesh_live_runtime_1 = require("../runtime/mesh-live-runtime");
const mesh_router_1 = require("../routing/mesh-router");
const execution_ledger_1 = require("../runtime/execution-ledger");
const timeline_canonicalizer_1 = require("../runtime/timeline-canonicalizer");
(0, node_test_1.test)("canonicalizer maps equivalent runtime events to deterministic canonical semantics", () => {
    const timestamp = "2026-03-08T00:00:00.000Z";
    const meshEvent = (0, timeline_canonicalizer_1.canonicalizeExecutionLedgerEntry)({
        entryId: "exec_1",
        timestamp,
        category: "runtime",
        eventType: "runtime.guard.evaluated",
        action: "route_dispatch",
        source: "mesh_live_runtime",
        target: "/api/demo/chat",
        ids: {
            requestId: "req-1",
            executionId: "evt-1",
            correlationId: "req-1",
            sessionId: "sess-1",
        },
        mode: "normal",
        status: "evaluated",
        guard: {
            runtime: {
                outcome: "allow",
                reasons: [{ code: "default_allow", detail: "ok" }],
            },
        },
    }, { sequenceNo: 1, prevEventHash: null });
    const orchestratorEvent = (0, timeline_canonicalizer_1.canonicalizeExecutionLedgerEntry)({
        entryId: "exec_2",
        timestamp,
        category: "runtime",
        eventType: "runtime.guard.evaluated",
        action: "route_dispatch",
        source: "capability_mesh_orchestrator",
        target: "cap.language.v1",
        ids: {
            requestId: "req-2",
            executionId: "evt-2",
            correlationId: "req-2",
            sessionId: "sess-2",
        },
        mode: "normal",
        status: "evaluated",
        guard: {
            runtime: {
                outcome: "allow",
                reasons: [{ code: "default_allow", detail: "ok" }],
            },
        },
    }, { sequenceNo: 1, prevEventHash: null });
    assert.equal(meshEvent.eventType, "RUNTIME_GUARD_TRIGGERED");
    assert.equal(orchestratorEvent.eventType, "RUNTIME_GUARD_TRIGGERED");
    assert.equal(meshEvent.stage, "runtime_evaluated");
    assert.equal(orchestratorEvent.stage, "runtime_evaluated");
    assert.equal(meshEvent.layer, 5);
    assert.equal(orchestratorEvent.layer, 5);
    assert.equal(meshEvent.status, "ok");
    assert.equal(orchestratorEvent.status, "ok");
});
(0, node_test_1.test)("execution ledger emits canonical stage progression with deterministic sequence per execution", () => {
    const ledger = new execution_ledger_1.ExecutionLedger("");
    ledger.append({
        category: "dispatch",
        eventType: "dispatch.guard.evaluated",
        action: "dispatch",
        source: "test",
        target: "target",
        ids: { executionId: "execution-1", requestId: "request-1" },
        mode: "normal",
        status: "evaluated",
    });
    ledger.append({
        category: "runtime",
        eventType: "runtime.guard.evaluated",
        action: "dispatch",
        source: "test",
        target: "target",
        ids: { executionId: "execution-1", requestId: "request-1" },
        mode: "normal",
        status: "evaluated",
    });
    ledger.append({
        category: "execution",
        eventType: "execution.started",
        action: "dispatch",
        source: "test",
        target: "target",
        ids: { executionId: "execution-1", requestId: "request-1" },
        mode: "normal",
        status: "started",
    });
    ledger.append({
        category: "execution",
        eventType: "execution.completed",
        action: "dispatch",
        source: "test",
        target: "target",
        ids: { executionId: "execution-1", requestId: "request-1" },
        mode: "normal",
        status: "completed",
    });
    const timeline = ledger.timelineSnapshot().filter((event) => event.executionId === "execution-1");
    assert.deepEqual(timeline.map((event) => event.stage), ["dispatch_evaluated", "runtime_evaluated", "execution_started", "execution_completed"]);
    assert.deepEqual(timeline.map((event) => event.sequenceNo), [1, 2, 3, 4]);
});
(0, node_test_1.test)("deny/reroute/degraded/safe-mode/failure outcomes are canonicalized predictably", () => {
    const ledger = new execution_ledger_1.ExecutionLedger("");
    ledger.append({
        category: "dispatch",
        eventType: "dispatch.denied",
        action: "dispatch",
        source: "test",
        target: "target",
        ids: { executionId: "execution-2" },
        mode: "safe_mode_redirect",
        status: "denied",
    });
    ledger.append({
        category: "dispatch",
        eventType: "dispatch.guard.evaluated",
        action: "dispatch",
        source: "test",
        target: "target",
        ids: { executionId: "execution-2" },
        mode: "reroute",
        status: "evaluated",
        guard: {
            dispatch: {
                outcome: "reroute",
                reasons: [{ code: "policy_forced_reroute", detail: "reroute" }],
                reroute: { target: "fallback" },
            },
        },
    });
    ledger.append({
        category: "execution",
        eventType: "execution.degraded",
        action: "dispatch",
        source: "test",
        target: "target",
        ids: { executionId: "execution-2" },
        mode: "degraded",
        status: "degraded",
    });
    ledger.append({
        category: "execution",
        eventType: "execution.failed",
        action: "dispatch",
        source: "test",
        target: "target",
        ids: { executionId: "execution-2" },
        mode: "normal",
        status: "failed",
    });
    const timeline = ledger.timelineSnapshot().filter((event) => event.executionId === "execution-2");
    assert.equal(timeline.some((event) => event.stage === "dispatch_denied" && event.status === "blocked"), true);
    assert.equal(timeline.some((event) => event.mode === "reroute" && event.guards?.dispatchOutcome === "reroute"), true);
    assert.equal(timeline.some((event) => event.stage === "execution_degraded" && event.status === "partial"), true);
    assert.equal(timeline.some((event) => event.stage === "execution_failed" && event.status === "error"), true);
});
(0, node_test_1.test)("stable identity and event id strategy is deterministic for same canonical input", () => {
    const input = {
        entryId: "exec_9",
        timestamp: "2026-03-08T00:00:00.000Z",
        category: "execution",
        eventType: "execution.completed",
        action: "test_action",
        source: "test_source",
        target: "test_target",
        ids: { executionId: "e-9", requestId: "r-9" },
        mode: "normal",
        status: "completed",
        metadata: { a: 1, b: 2 },
    };
    const first = (0, timeline_canonicalizer_1.canonicalizeExecutionLedgerEntry)(input, { sequenceNo: 3, prevEventHash: "abc" });
    const second = (0, timeline_canonicalizer_1.canonicalizeExecutionLedgerEntry)(input, { sequenceNo: 3, prevEventHash: "abc" });
    assert.equal(first.stableIdentity, second.stableIdentity);
    assert.equal(first.eventId, second.eventId);
    assert.equal(first.integrity.eventHash, second.integrity.eventHash);
});
(0, node_test_1.test)("active runtime and orchestrator paths expose canonical timeline snapshots", async () => {
    const runtime = new mesh_live_runtime_1.MeshLiveRuntime(undefined, new mesh_router_1.MeshRouter());
    await runtime.processChatUserRequest({
        sessionId: "timeline-runtime-session",
        requestId: "timeline-runtime-request",
        routeType: "/api/demo/chat",
        rawInput: { prompt: "timeline please" },
    });
    const runtimeTimeline = runtime.getCanonicalTimelineSnapshot().filter((event) => event.correlation.requestId === "timeline-runtime-request");
    assert.equal(runtimeTimeline.length > 0, true);
    assert.equal(runtimeTimeline.every((event) => event.schemaVersion === "rgpt.timeline_event.canonical.v1"), true);
    const orchestrator = new capability_mesh_orchestrator_1.CapabilityMeshOrchestrator(new capability_registry_1.CapabilityRegistry(), [new language_capability_1.LanguageCapability()]);
    await orchestrator.invoke({
        requestId: "timeline-orchestrator-request",
        sessionId: "timeline-orchestrator-session",
        capabilityId: constants_1.CAPABILITY_IDS.LANGUAGE,
        purpose: "normalize",
        input: "hello",
        createdAt: new Date().toISOString(),
    });
    const orchestratorTimeline = orchestrator
        .getCanonicalTimelineSnapshot()
        .filter((event) => event.correlation.requestId === "timeline-orchestrator-request");
    assert.equal(orchestratorTimeline.length > 0, true);
    assert.equal(orchestratorTimeline.some((event) => event.stage === "dispatch_evaluated"), true);
    assert.equal(orchestratorTimeline.some((event) => event.stage === "execution_started"), true);
});
