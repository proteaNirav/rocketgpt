import { test } from "node:test";
import * as assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { InputIngestor } from "../sensory/input-ingestor";
import { MeshRouter } from "../routing/mesh-router";
import { runMeshChatHookIfEnabled } from "../runtime/mesh-live-hook";
import { resetMeshLiveRuntimeForTests } from "../runtime/mesh-live-runtime";
import { RuntimeGuard } from "../runtime/runtime-guard";
import { DispatchGuard } from "../runtime/dispatch-guard";

test("benchmark: mesh router request path remains lightweight", async () => {
  const ingestor = new InputIngestor();
  const router = new MeshRouter();
  const iterations = 200;

  const started = performance.now();
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

  const elapsedMs = performance.now() - started;
  const avgMs = elapsedMs / iterations;
  assert.ok(avgMs < 35, `Expected avg mesh route < 35ms, got ${avgMs.toFixed(3)}ms`);
});

test("benchmark: chat hook overhead remains bounded when feature-flag enabled", async () => {
  resetMeshLiveRuntimeForTests();
  const iterations = 180;

  delete process.env.COGNITIVE_MESH_V1_03_CHAT_LIVE_ENABLED;
  const baselineStarted = performance.now();
  for (let i = 0; i < iterations; i += 1) {
    void runMeshChatHookIfEnabled({
      sessionId: "bench-chat-baseline",
      requestId: `base-${i}`,
      routeType: "/api/demo/chat",
      rawInput: { userText: `hello ${i}`, incomingMessages: [] },
      metadata: { sourceType: "chat.user_text", trustClass: "trusted" },
    });
  }
  const baselineAvgMs = (performance.now() - baselineStarted) / iterations;

  process.env.COGNITIVE_MESH_V1_03_CHAT_LIVE_ENABLED = "true";
  const enabledStarted = performance.now();
  for (let i = 0; i < iterations; i += 1) {
    void runMeshChatHookIfEnabled({
      sessionId: "bench-chat-enabled",
      requestId: `on-${i}`,
      routeType: "/api/demo/chat",
      rawInput: { userText: `hello ${i}`, incomingMessages: [] },
      metadata: { sourceType: "chat.user_text", trustClass: "trusted" },
    });
  }
  const enabledAvgMs = (performance.now() - enabledStarted) / iterations;
  await new Promise((resolve) => setTimeout(resolve, 50));
  delete process.env.COGNITIVE_MESH_V1_03_CHAT_LIVE_ENABLED;

  const overheadMs = enabledAvgMs - baselineAvgMs;
  assert.ok(overheadMs < 5, `Expected fire-and-forget chat hook overhead < 5ms, got ${overheadMs.toFixed(3)}ms`);
});

test("benchmark: runtime guard evaluation remains lightweight on hot path", () => {
  const guard = new RuntimeGuard();
  const iterations = 6000;
  const started = performance.now();

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

  const elapsedMs = performance.now() - started;
  const avgMs = elapsedMs / iterations;
  assert.ok(avgMs < 0.35, `Expected avg guard eval < 0.35ms, got ${avgMs.toFixed(4)}ms`);
});

test("benchmark: dispatch guard evaluation remains lightweight on hot path", () => {
  const guard = new DispatchGuard();
  const iterations = 6000;
  const started = performance.now();

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

  const elapsedMs = performance.now() - started;
  const avgMs = elapsedMs / iterations;
  assert.ok(avgMs < 0.35, `Expected avg dispatch guard eval < 0.35ms, got ${avgMs.toFixed(4)}ms`);
});
