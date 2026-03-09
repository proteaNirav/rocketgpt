import { performance } from "node:perf_hooks";
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ExecutionLedger } from "../runtime/execution-ledger";
import { RuntimeEvolutionSignalsOrchestrator } from "../runtime/evolution-signals/runtime-evolution-signals-orchestrator";

test("benchmark: bounded evolution evaluation over repeated runtime cycles", async () => {
  const root = await mkdtemp(join(tmpdir(), "rgpt-runtime-evolution-bench-"));
  const runtimeDir = join(root, ".rocketgpt", "runtime");
  const meshDir = join(root, ".rocketgpt", "cognitive-mesh");
  await mkdir(runtimeDir, { recursive: true });
  await mkdir(meshDir, { recursive: true });

  const env: NodeJS.ProcessEnv = {
    RGPT_RUNTIME_ID: "rgpt-evolution-bench",
    COGNITIVE_MESH_EXECUTION_LEDGER_JSONL_PATH: join(meshDir, "execution-ledger.jsonl"),
    RGPT_RUNTIME_EVOLUTION_SIGNALS_ENABLED: "true",
    RGPT_RUNTIME_EVOLUTION_SIGNALS_STATE_PATH: join(runtimeDir, "evolution-signals.json"),
    RGPT_RUNTIME_EVOLUTION_LOOKBACK_MS: "3600000",
    RGPT_RUNTIME_EVOLUTION_SIGNAL_COOLDOWN_MS: "1000",
    RGPT_RUNTIME_EVOLUTION_CANDIDATE_COOLDOWN_MS: "1000",
    RGPT_RUNTIME_EVOLUTION_MAX_RECENT_SIGNALS: "40",
    RGPT_RUNTIME_EVOLUTION_MAX_ACTIVE_CANDIDATES: "30",
    RGPT_RUNTIME_EVOLUTION_MAX_EVIDENCE_EVENTS: "80",
  };

  const ledger = new ExecutionLedger(env.COGNITIVE_MESH_EXECUTION_LEDGER_JSONL_PATH, "");
  for (let i = 0; i < 280; i += 1) {
    ledger.append({
      category: "runtime",
      eventType:
        i % 5 === 0
          ? "runtime_repair_attempted"
          : i % 5 === 1
            ? "runtime_repair_failed"
            : i % 5 === 2
              ? "runtime_recovery_validation_failed"
              : i % 5 === 3
                ? "runtime_quarantine_applied"
                : "runtime_degradation_action_recommended",
      action: "runtime_evolution_bench",
      source: "bench",
      target: `target-${i % 6}`,
      status: i % 5 === 0 ? "started" : "failed",
      ids: { requestId: `bench-${i}` },
      metadata: {
        targetType: i % 2 === 0 ? "worker" : "queue",
        targetId: `target-${i % 6}`,
        repairAction: i % 2 === 0 ? "restart_runtime_worker" : "recover_queue",
        degradationAction: "reduce_new_work_intake",
        reasonCodes: ["BENCH"],
      },
      timestamp: new Date(Date.parse("2026-03-09T18:00:00.000Z") + i * 300).toISOString(),
    });
  }

  const orchestrator = new RuntimeEvolutionSignalsOrchestrator(ledger);
  const t0 = performance.now();
  const result = await orchestrator.run({
    env,
    now: new Date("2026-03-09T18:05:00.000Z"),
  });
  const elapsed = performance.now() - t0;

  assert.equal(result.evaluation !== null, true);
  assert.ok((result.evaluation?.metadata.evidenceSignalCount as number) <= 80);
  assert.ok(elapsed < 1200, `runtime evolution evaluation ${elapsed.toFixed(2)}ms exceeds 1200ms`);
});
