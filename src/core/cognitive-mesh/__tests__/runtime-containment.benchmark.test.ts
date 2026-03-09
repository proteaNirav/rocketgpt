import { performance } from "node:perf_hooks";
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ExecutionLedger } from "../runtime/execution-ledger";
import { RuntimeContainmentOrchestrator } from "../runtime/containment/runtime-containment-orchestrator";

test("benchmark: repeated same-target containment evaluation stays bounded", async () => {
  const root = await mkdtemp(join(tmpdir(), "rgpt-runtime-containment-bench-"));
  const runtimeDir = join(root, ".rocketgpt", "runtime");
  const meshDir = join(root, ".rocketgpt", "cognitive-mesh");
  await mkdir(runtimeDir, { recursive: true });
  await mkdir(meshDir, { recursive: true });

  const env: NodeJS.ProcessEnv = {
    RGPT_RUNTIME_ID: "rgpt-containment-bench",
    COGNITIVE_MESH_EXECUTION_LEDGER_JSONL_PATH: join(meshDir, "execution-ledger.jsonl"),
    RGPT_RUNTIME_CONTAINMENT_ENABLED: "true",
    RGPT_RUNTIME_CONTAINMENT_STATE_PATH: join(runtimeDir, "containment-state.json"),
    RGPT_RUNTIME_CONTAINMENT_LOOKBACK_MS: "3600000",
    RGPT_RUNTIME_CONTAINMENT_RECURRENCE_THRESHOLD: "2",
    RGPT_RUNTIME_CONTAINMENT_COOLDOWN_MS: "1000",
    RGPT_RUNTIME_CONTAINMENT_OBSERVATION_MS: "1000",
    RGPT_RUNTIME_CONTAINMENT_MAX_REINTEGRATION_FAILURES: "2",
    RGPT_RUNTIME_CONTAINMENT_MAX_EVIDENCE_EVENTS: "50",
    RGPT_RUNTIME_REPAIR_STATE_PATH: join(runtimeDir, "repair-state.json"),
    RGPT_RUNTIME_REPAIR_LEARNING_STATE_PATH: join(runtimeDir, "repair-learning-state.json"),
  };

  const ledger = new ExecutionLedger(env.COGNITIVE_MESH_EXECUTION_LEDGER_JSONL_PATH, "");
  for (let i = 0; i < 240; i += 1) {
    ledger.append({
      category: "runtime",
      eventType: i % 2 === 0 ? "runtime_repair_diagnosed" : "runtime_repair_failed",
      action: "runtime_containment_bench",
      source: "bench",
      target: "worker-bench",
      status: i % 2 === 0 ? "evaluated" : "failed",
      ids: { requestId: `bench-${i}` },
      metadata: {
        targetType: "worker",
        targetId: "worker-bench",
        anomalyType: "stale_heartbeat",
        repairAction: "restart_runtime_worker",
      },
      timestamp: new Date(Date.parse("2026-03-09T14:00:00.000Z") + i * 1000).toISOString(),
    });
  }

  const orchestrator = new RuntimeContainmentOrchestrator(ledger);
  const t0 = performance.now();
  const result = await orchestrator.run({
    env,
    anomalyType: "stale_heartbeat",
    targetType: "worker",
    targetId: "worker-bench",
    now: new Date("2026-03-09T14:05:00.000Z"),
  });
  const elapsedMs = performance.now() - t0;

  assert.equal(result.decision?.targetId, "worker-bench");
  assert.ok(elapsedMs < 1200, `runtime containment elapsed ${elapsedMs.toFixed(2)}ms exceeds 1200ms`);
});
