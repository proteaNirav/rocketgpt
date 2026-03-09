import { performance } from "node:perf_hooks";
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ExecutionLedger } from "../runtime/execution-ledger";
import { RuntimeRepairLearningOrchestrator } from "../runtime/repair-learning/runtime-repair-learning-orchestrator";

test("benchmark: same-target analysis remains bounded with max evidence window", async () => {
  const root = await mkdtemp(join(tmpdir(), "rgpt-runtime-repair-learning-bench-"));
  const runtimeDir = join(root, ".rocketgpt", "runtime");
  const meshDir = join(root, ".rocketgpt", "cognitive-mesh");
  await mkdir(runtimeDir, { recursive: true });
  await mkdir(meshDir, { recursive: true });

  const env: NodeJS.ProcessEnv = {
    RGPT_RUNTIME_ID: "rgpt-learning-bench",
    COGNITIVE_MESH_EXECUTION_LEDGER_JSONL_PATH: join(meshDir, "execution-ledger.jsonl"),
    RGPT_RUNTIME_REPAIR_STATE_PATH: join(runtimeDir, "repair-state.json"),
    RGPT_RUNTIME_TRANSIENT_MEMORY_PATH: join(runtimeDir, "transient-memory-cache.json"),
    RGPT_CAPABILITY_RUNTIME_STATE_PATH: join(runtimeDir, "capability-runtime-state.json"),
    RGPT_RUNTIME_QUEUE_RECOVERY_STATE_PATH: join(runtimeDir, "queue-recovery-state.json"),
    RGPT_RUNTIME_RESTART_STATE_PATH: join(runtimeDir, "restart-state.json"),
    RGPT_RUNTIME_REPAIR_ENABLED: "true",
    RGPT_RUNTIME_REPAIR_LEARNING_ENABLED: "true",
    RGPT_RUNTIME_REPAIR_LEARNING_STATE_PATH: join(runtimeDir, "repair-learning-state.json"),
    RGPT_RUNTIME_REPAIR_LEARNING_LOOKBACK_MS: "3600000",
    RGPT_RUNTIME_REPAIR_LEARNING_RECURRENCE_THRESHOLD: "2",
    RGPT_RUNTIME_REPAIR_LEARNING_COOLDOWN_MS: "1000",
    RGPT_RUNTIME_REPAIR_LEARNING_MAX_EVIDENCE_EVENTS: "40",
  };

  const ledger = new ExecutionLedger(env.COGNITIVE_MESH_EXECUTION_LEDGER_JSONL_PATH, "");
  for (let i = 0; i < 200; i += 1) {
    ledger.append({
      category: "runtime",
      eventType: i % 2 === 0 ? "runtime_repair_failed" : "runtime_recovery_validation_failed",
      action: "runtime_repair_bench",
      source: "bench",
      target: "runtime-main",
      status: i % 2 === 0 ? "failed" : "failed",
      ids: { requestId: `req-${i}` },
      metadata: {
        targetType: "runtime",
        targetId: "runtime-main",
        anomalyType: "stale_heartbeat",
        repairAction: "restart_runtime_worker",
      },
      timestamp: new Date(Date.parse("2026-03-09T13:00:00.000Z") + i * 1000).toISOString(),
    });
  }

  const orchestrator = new RuntimeRepairLearningOrchestrator(ledger);
  const t0 = performance.now();
  const result = await orchestrator.run({
    env,
    diagnosis: {
      diagnosisId: "diag-bench",
      detectedAt: "2026-03-09T13:10:00.000Z",
      source: "bench",
      anomalyType: "stale_heartbeat",
      severity: "high",
      repairable: true,
      likelyTargetType: "runtime",
      likelyTargetId: "runtime-main",
      recommendedRepairAction: "restart_runtime_worker",
      reasonCodes: ["bench"],
      metadata: {},
    },
    repairAttempt: {
      attemptId: "attempt-bench",
      startedAt: "2026-03-09T13:10:00.000Z",
      completedAt: "2026-03-09T13:10:00.000Z",
      targetType: "runtime",
      targetId: "runtime-main",
      anomalyType: "stale_heartbeat",
      repairAction: "restart_runtime_worker",
      success: false,
      reasonCodes: ["bench"],
      metadata: {},
    },
    validation: {
      validationId: "val-bench",
      startedAt: "2026-03-09T13:10:00.000Z",
      completedAt: "2026-03-09T13:10:00.000Z",
      targetType: "runtime",
      targetId: "runtime-main",
      repairAction: "restart_runtime_worker",
      success: false,
      checks: [],
      reasonCodes: ["bench"],
      metadata: {},
    },
    now: new Date("2026-03-09T13:10:00.000Z"),
  });
  const elapsedMs = performance.now() - t0;

  assert.equal(result.learningResult?.metadata.evidenceEventCount, 40);
  assert.ok(elapsedMs < 1200, `runtime repair learning elapsed ${elapsedMs.toFixed(2)}ms exceeds 1200ms`);
});
