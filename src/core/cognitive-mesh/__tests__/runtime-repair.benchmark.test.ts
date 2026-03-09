import { performance } from "node:perf_hooks";
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ExecutionLedger } from "../runtime/execution-ledger";
import { RuntimeRepairOrchestrator } from "../runtime/repair/runtime-repair-orchestrator";

test("benchmark: repeated stale-heartbeat repair dedupe remains bounded", async () => {
  const root = await mkdtemp(join(tmpdir(), "rgpt-runtime-repair-bench-"));
  const runtimeDir = join(root, ".rocketgpt", "runtime");
  await mkdir(runtimeDir, { recursive: true });

  const env: NodeJS.ProcessEnv = {
    RGPT_RUNTIME_REPAIR_ENABLED: "true",
    RGPT_RUNTIME_REPAIR_COOLDOWN_MS: "120000",
    RGPT_RUNTIME_REPAIR_MAX_ATTEMPTS_WITHIN_WINDOW: "2",
    RGPT_RUNTIME_REPAIR_ATTEMPT_WINDOW_MS: "600000",
    RGPT_RUNTIME_REPAIR_VALIDATION_WINDOW_MS: "60000",
    RGPT_RUNTIME_REPAIR_STATE_PATH: join(runtimeDir, "repair-state.json"),
    RGPT_RUNTIME_TRANSIENT_MEMORY_PATH: join(runtimeDir, "transient-memory-cache.json"),
    RGPT_CAPABILITY_RUNTIME_STATE_PATH: join(runtimeDir, "capability-runtime-state.json"),
    RGPT_RUNTIME_QUEUE_RECOVERY_STATE_PATH: join(runtimeDir, "queue-recovery-state.json"),
    RGPT_RUNTIME_RESTART_STATE_PATH: join(runtimeDir, "restart-state.json"),
    RGPT_RUNTIME_ID: "rgpt-repair-bench",
  };

  const ledger = new ExecutionLedger("", "");
  const orchestrator = new RuntimeRepairOrchestrator(ledger);

  const t0 = performance.now();
  for (let i = 0; i < 50; i += 1) {
    await orchestrator.run({
      env,
      anomalyType: "stale_heartbeat",
      targetId: "runtime-main",
      now: new Date(Date.parse("2026-03-09T13:00:00.000Z") + i * 1000),
    });
  }
  const elapsedMs = performance.now() - t0;

  const attempts = ledger.snapshot().filter((entry) => entry.eventType === "runtime_repair_attempted");
  const cooldowns = ledger.snapshot().filter((entry) => entry.eventType === "runtime_repair_cooldown_active");

  assert.equal(attempts.length, 1);
  assert.equal(cooldowns.length > 0, true);
  assert.ok(elapsedMs < 1500, `runtime repair dedupe elapsed ${elapsedMs.toFixed(2)}ms exceeds 1500ms`);
});
