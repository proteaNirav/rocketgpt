"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const node_perf_hooks_1 = require("node:perf_hooks");
const input_ingestor_1 = require("../sensory/input-ingestor");
const mesh_router_1 = require("../routing/mesh-router");
const mesh_live_hook_1 = require("../runtime/mesh-live-hook");
const mesh_live_runtime_1 = require("../runtime/mesh-live-runtime");
const runtime_guard_1 = require("../runtime/runtime-guard");
const dispatch_guard_1 = require("../runtime/dispatch-guard");
(0, node_test_1.test)("benchmark: mesh router request path remains lightweight", async () => {
    const ingestor = new input_ingestor_1.InputIngestor();
    const router = new mesh_router_1.MeshRouter();
    const iterations = 200;
    const started = node_perf_hooks_1.performance.now();
    for (let i = 0; i < iterations; i += 1) {
        const event = ingestor.ingest({
            sessionId: "bench-session",
            source: "internal:api",
            rawInput: `sample-input-${i}`,
            processingMode: "sync",
        });
        const result = await router.route(event);
        assert.equal(result.accepted, true);
    }
    const elapsedMs = node_perf_hooks_1.performance.now() - started;
    const avgMs = elapsedMs / iterations;
    assert.ok(avgMs < 35, `Expected avg mesh route < 35ms, got ${avgMs.toFixed(3)}ms`);
});
(0, node_test_1.test)("benchmark: chat hook overhead remains bounded when feature-flag enabled", async () => {
    (0, mesh_live_runtime_1.resetMeshLiveRuntimeForTests)();
    const iterations = 180;
    delete process.env.COGNITIVE_MESH_V1_03_CHAT_LIVE_ENABLED;
    const baselineStarted = node_perf_hooks_1.performance.now();
    for (let i = 0; i < iterations; i += 1) {
        void (0, mesh_live_hook_1.runMeshChatHookIfEnabled)({
            sessionId: "bench-chat-baseline",
            requestId: `base-${i}`,
            routeType: "/api/demo/chat",
            rawInput: { userText: `hello ${i}`, incomingMessages: [] },
            metadata: { sourceType: "chat.user_text", trustClass: "trusted" },
        });
    }
    const baselineAvgMs = (node_perf_hooks_1.performance.now() - baselineStarted) / iterations;
    process.env.COGNITIVE_MESH_V1_03_CHAT_LIVE_ENABLED = "true";
    const enabledStarted = node_perf_hooks_1.performance.now();
    for (let i = 0; i < iterations; i += 1) {
        void (0, mesh_live_hook_1.runMeshChatHookIfEnabled)({
            sessionId: "bench-chat-enabled",
            requestId: `on-${i}`,
            routeType: "/api/demo/chat",
            rawInput: { userText: `hello ${i}`, incomingMessages: [] },
            metadata: { sourceType: "chat.user_text", trustClass: "trusted" },
        });
    }
    const enabledAvgMs = (node_perf_hooks_1.performance.now() - enabledStarted) / iterations;
    await new Promise((resolve) => setTimeout(resolve, 50));
    delete process.env.COGNITIVE_MESH_V1_03_CHAT_LIVE_ENABLED;
    const overheadMs = enabledAvgMs - baselineAvgMs;
    assert.ok(overheadMs < 5, `Expected fire-and-forget chat hook overhead < 5ms, got ${overheadMs.toFixed(3)}ms`);
});
(0, node_test_1.test)("benchmark: runtime guard evaluation remains lightweight on hot path", () => {
    const guard = new runtime_guard_1.RuntimeGuard();
    const iterations = 6000;
    const started = node_perf_hooks_1.performance.now();
    for (let i = 0; i < iterations; i += 1) {
        const decision = guard.evaluate({
            actionType: "workflow_side_effect",
            actor: "benchmark",
            source: "mesh",
            target: "route",
            requestedOperation: "dispatch",
            riskHint: i % 13 === 0 ? "high" : "medium",
            ids: { requestId: `req-${i}` },
            protectedAction: true,
        });
        assert.notEqual(decision.outcome, "deny");
    }
    const elapsedMs = node_perf_hooks_1.performance.now() - started;
    const avgMs = elapsedMs / iterations;
    assert.ok(avgMs < 0.35, `Expected avg guard eval < 0.35ms, got ${avgMs.toFixed(4)}ms`);
});
(0, node_test_1.test)("benchmark: dispatch guard evaluation remains lightweight on hot path", () => {
    const guard = new dispatch_guard_1.DispatchGuard();
    const iterations = 6000;
    const started = node_perf_hooks_1.performance.now();
    for (let i = 0; i < iterations; i += 1) {
        const decision = guard.evaluate({
            category: "courier_dispatch",
            source: "cat-hub",
            sourceType: "cat",
            target: "librarian-hub",
            targetKind: "internal",
            route: "cat->librarian",
            mode: "public_route",
            targetTrustHint: "trusted",
            targetHealthHint: i % 17 === 0 ? "degraded" : "healthy",
            policyFlags: { requireAudit: i % 23 === 0 },
            ids: { requestId: `req-dispatch-${i}` },
            protectedDispatch: true,
        });
        assert.notEqual(decision.outcome, "deny");
    }
    const elapsedMs = node_perf_hooks_1.performance.now() - started;
    const avgMs = elapsedMs / iterations;
    assert.ok(avgMs < 0.35, `Expected avg dispatch guard eval < 0.35ms, got ${avgMs.toFixed(4)}ms`);
});
