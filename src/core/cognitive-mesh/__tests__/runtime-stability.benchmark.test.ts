import { performance } from "node:perf_hooks";
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ExecutionLedger } from "../runtime/execution-ledger";
import { RuntimeStabilityOrchestrator } from "../runtime/stability/runtime-stability-orchestrator";

test("benchmark: bounded stability evaluation across repeated runtime cycles", async () => {
  const root = await mkdtemp(join(tmpdir(), "rgpt-runtime-stability-bench-"));
  const runtimeDir = join(root, ".rocketgpt", "runtime");
  const meshDir = join(root, ".rocketgpt", "cognitive-mesh");
  await mkdir(runtimeDir, { recursive: true });
  await mkdir(meshDir, { recursive: true });

  const env: NodeJS.ProcessEnv = {
    RGPT_RUNTIME_ID: "rgpt-stability-bench",
    COGNITIVE_MESH_EXECUTION_LEDGER_JSONL_PATH: join(meshDir, "execution-ledger.jsonl"),
    RGPT_RUNTIME_STABILITY_ENABLED: "true",
    RGPT_RUNTIME_STABILITY_STATE_PATH: join(runtimeDir, "stability-state.json"),
    RGPT_RUNTIME_STABILITY_LOOKBACK_MS: "3600000",
    RGPT_RUNTIME_STABILITY_OSCILLATION_THRESHOLD: "2",
    RGPT_RUNTIME_STABILITY_MULTI_TARGET_THRESHOLD: "3",
    RGPT_RUNTIME_STABILITY_EVALUATION_COOLDOWN_MS: "1000",
    RGPT_RUNTIME_STABILITY_MAX_EVIDENCE_EVENTS: "60",
  };

  const ledger = new ExecutionLedger(env.COGNITIVE_MESH_EXECUTION_LEDGER_JSONL_PATH, "");
  for (let i = 0; i < 260; i += 1) {
    ledger.append({
      category: "runtime",
      eventType: i % 3 === 0 ? "runtime_repair_failed" : i % 3 === 1 ? "runtime_recovery_validation_failed" : "runtime_quarantine_applied",
      action: "runtime_stability_bench",
      source: "bench",
      target: `target-${i % 5}`,
      status: i % 3 === 2 ? "completed" : "failed",
      ids: { requestId: `bench-${i}` },
      metadata: {
        targetType: i % 2 === 0 ? "worker" : "queue",
        targetId: `target-${i % 5}`,
        reasonCodes: ["BENCH"],
      },
      timestamp: new Date(Date.parse("2026-03-09T16:00:00.000Z") + i * 500).toISOString(),
    });
  }

  const orchestrator = new RuntimeStabilityOrchestrator(ledger);
  const t0 = performance.now();
  const result = await orchestrator.run({
    env,
    now: new Date("2026-03-09T16:05:00.000Z"),
  });
  const elapsed = performance.now() - t0;

  assert.equal(result.evaluation !== null, true);
  assert.ok((result.evaluation?.metadata.evidenceSignalCount as number) <= 60);
  assert.ok(elapsed < 1200, `runtime stability evaluation ${elapsed.toFixed(2)}ms exceeds 1200ms`);
});
