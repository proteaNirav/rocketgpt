import { test } from "node:test";
import * as assert from "node:assert/strict";
import {
  isMeshChatLiveEnabled,
  isMeshLiveEnabled,
  runMeshChatHookIfEnabled,
  runMeshLiveHookIfEnabled,
} from "../runtime/mesh-live-hook";
import { getMeshLiveRuntime, resetMeshLiveRuntimeForTests } from "../runtime/mesh-live-runtime";

test("feature flag wiring: mesh hook is disabled by default", async () => {
  resetMeshLiveRuntimeForTests();
  delete process.env.COGNITIVE_MESH_V1_02_LIVE_ENABLED;
  assert.equal(isMeshLiveEnabled(), false);

  await runMeshLiveHookIfEnabled({
    sessionId: "sess-flag-off",
    routeType: "/api/orchestrator/run/status",
    rawInput: { runId: 10, status: "planner_running" },
  });
  const runtime = getMeshLiveRuntime();
  const snapshot = runtime.getRepositorySnapshot();
  assert.equal(snapshot.events.length, 0);
});

test("feature flag wiring: mesh hook executes when enabled", async () => {
  resetMeshLiveRuntimeForTests();
  process.env.COGNITIVE_MESH_V1_02_LIVE_ENABLED = "true";

  await runMeshLiveHookIfEnabled({
    sessionId: "sess-flag-on",
    requestId: "req-flag-on",
    routeType: "/api/orchestrator/run/status",
    rawInput: { runId: 11, status: "builder_running" },
    metadata: { project: "rocketgpt", domain: "orchestrator" },
  });
  const runtime = getMeshLiveRuntime();
  const snapshot = runtime.getRepositorySnapshot();
  assert.equal(snapshot.events.length, 1);
  assert.equal(snapshot.reasoningSessions.length, 1);

  delete process.env.COGNITIVE_MESH_V1_02_LIVE_ENABLED;
});

test("feature-flagged chat wiring: disabled path does not persist", async () => {
  resetMeshLiveRuntimeForTests();
  delete process.env.COGNITIVE_MESH_V1_03_CHAT_LIVE_ENABLED;
  assert.equal(isMeshChatLiveEnabled(), false);

  await runMeshChatHookIfEnabled({
    sessionId: "chat-off",
    routeType: "/api/demo/chat",
    rawInput: { userText: "hello", incomingMessages: [] },
  });
  const runtime = getMeshLiveRuntime();
  const snapshot = runtime.getRepositorySnapshot();
  assert.equal(snapshot.events.length, 0);
});

test("feature-flagged chat wiring: enabled path persists and tracks metric", async () => {
  resetMeshLiveRuntimeForTests();
  process.env.COGNITIVE_MESH_V1_03_CHAT_LIVE_ENABLED = "true";

  await runMeshChatHookIfEnabled({
    sessionId: "chat-on",
    requestId: "chat-req-1",
    routeType: "/api/demo/chat",
    rawInput: { userText: "need project status", incomingMessages: [] },
    metadata: { project: "rocketgpt", domain: "chat" },
  });
  const runtime = getMeshLiveRuntime();
  const snapshot = runtime.getRepositorySnapshot();
  const metrics = runtime.getMetricsSnapshot();
  assert.equal(snapshot.events.length, 1);
  assert.equal(snapshot.reasoningSessions.length, 1);
  assert.equal(metrics.counters.mesh_chat_hook_invoked, 1);

  delete process.env.COGNITIVE_MESH_V1_03_CHAT_LIVE_ENABLED;
});
