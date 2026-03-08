"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const mesh_live_hook_1 = require("../runtime/mesh-live-hook");
const mesh_live_runtime_1 = require("../runtime/mesh-live-runtime");
(0, node_test_1.test)("feature flag wiring: mesh hook is disabled by default", async () => {
    (0, mesh_live_runtime_1.resetMeshLiveRuntimeForTests)();
    delete process.env.COGNITIVE_MESH_V1_02_LIVE_ENABLED;
    assert.equal((0, mesh_live_hook_1.isMeshLiveEnabled)(), false);
    await (0, mesh_live_hook_1.runMeshLiveHookIfEnabled)({
        sessionId: "sess-flag-off",
        routeType: "/api/orchestrator/run/status",
        rawInput: { runId: 10, status: "planner_running" },
    });
    const runtime = (0, mesh_live_runtime_1.getMeshLiveRuntime)();
    const snapshot = runtime.getRepositorySnapshot();
    assert.equal(snapshot.events.length, 0);
});
(0, node_test_1.test)("feature flag wiring: mesh hook executes when enabled", async () => {
    (0, mesh_live_runtime_1.resetMeshLiveRuntimeForTests)();
    process.env.COGNITIVE_MESH_V1_02_LIVE_ENABLED = "true";
    await (0, mesh_live_hook_1.runMeshLiveHookIfEnabled)({
        sessionId: "sess-flag-on",
        requestId: "req-flag-on",
        routeType: "/api/orchestrator/run/status",
        rawInput: { runId: 11, status: "builder_running" },
        metadata: { project: "rocketgpt", domain: "orchestrator" },
    });
    const runtime = (0, mesh_live_runtime_1.getMeshLiveRuntime)();
    const snapshot = runtime.getRepositorySnapshot();
    assert.equal(snapshot.events.length, 1);
    assert.equal(snapshot.reasoningSessions.length, 1);
    delete process.env.COGNITIVE_MESH_V1_02_LIVE_ENABLED;
});
(0, node_test_1.test)("feature-flagged chat wiring: disabled path does not persist", async () => {
    (0, mesh_live_runtime_1.resetMeshLiveRuntimeForTests)();
    delete process.env.COGNITIVE_MESH_V1_03_CHAT_LIVE_ENABLED;
    assert.equal((0, mesh_live_hook_1.isMeshChatLiveEnabled)(), false);
    await (0, mesh_live_hook_1.runMeshChatHookIfEnabled)({
        sessionId: "chat-off",
        routeType: "/api/demo/chat",
        rawInput: { userText: "hello", incomingMessages: [] },
    });
    const runtime = (0, mesh_live_runtime_1.getMeshLiveRuntime)();
    const snapshot = runtime.getRepositorySnapshot();
    assert.equal(snapshot.events.length, 0);
});
(0, node_test_1.test)("feature-flagged chat wiring: enabled path persists and tracks metric", async () => {
    (0, mesh_live_runtime_1.resetMeshLiveRuntimeForTests)();
    process.env.COGNITIVE_MESH_V1_03_CHAT_LIVE_ENABLED = "true";
    await (0, mesh_live_hook_1.runMeshChatHookIfEnabled)({
        sessionId: "chat-on",
        requestId: "chat-req-1",
        routeType: "/api/demo/chat",
        rawInput: { userText: "need project status", incomingMessages: [] },
        metadata: { project: "rocketgpt", domain: "chat" },
    });
    const runtime = (0, mesh_live_runtime_1.getMeshLiveRuntime)();
    const snapshot = runtime.getRepositorySnapshot();
    const metrics = runtime.getMetricsSnapshot();
    assert.equal(snapshot.events.length, 1);
    assert.equal(snapshot.reasoningSessions.length, 1);
    assert.equal(metrics.counters.mesh_chat_hook_invoked, 1);
    delete process.env.COGNITIVE_MESH_V1_03_CHAT_LIVE_ENABLED;
});
