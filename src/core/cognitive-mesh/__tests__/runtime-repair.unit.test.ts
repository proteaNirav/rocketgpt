import { test } from "node:test";
import * as assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ExecutionLedger } from "../runtime/execution-ledger";
import { RuntimeDiagnosisEngine } from "../runtime/repair/runtime-diagnosis-engine";
import { RuntimeRepairStateRepository } from "../runtime/repair/runtime-repair-state-repository";
import { RecoveryValidator } from "../runtime/repair/recovery-validator";
import { RuntimeRepairOrchestrator } from "../runtime/repair/runtime-repair-orchestrator";
import { RestartRepairAgent } from "../runtime/repair/repair-agents/restart-repair-agent";
import { QueueRecoveryAgent } from "../runtime/repair/repair-agents/queue-recovery-agent";
import { MemoryCleanupAgent } from "../runtime/repair/repair-agents/memory-cleanup-agent";
import { CapabilityResetAgent } from "../runtime/repair/repair-agents/capability-reset-agent";
import type { RuntimeRepairConfig } from "../runtime/repair/runtime-repair.types";

interface Fixture {
  root: string;
  statePath: string;
  transientMemoryPath: string;
  capabilityRuntimeStatePath: string;
  queueRecoveryStatePath: string;
  restartStatePath: string;
  env: NodeJS.ProcessEnv;
  config: RuntimeRepairConfig;
}

async function createFixture(): Promise<Fixture> {
  const root = await mkdtemp(join(tmpdir(), "rgpt-runtime-repair-"));
  const runtimeDir = join(root, ".rocketgpt", "runtime");
  await mkdir(runtimeDir, { recursive: true });

  const statePath = join(runtimeDir, "repair-state.json");
  const transientMemoryPath = join(runtimeDir, "transient-memory-cache.json");
  const capabilityRuntimeStatePath = join(runtimeDir, "capability-runtime-state.json");
  const queueRecoveryStatePath = join(runtimeDir, "queue-recovery-state.json");
  const restartStatePath = join(runtimeDir, "restart-state.json");

  const env: NodeJS.ProcessEnv = {
    RGPT_RUNTIME_REPAIR_ENABLED: "true",
    RGPT_RUNTIME_REPAIR_COOLDOWN_MS: "60000",
    RGPT_RUNTIME_REPAIR_MAX_ATTEMPTS_WITHIN_WINDOW: "2",
    RGPT_RUNTIME_REPAIR_ATTEMPT_WINDOW_MS: "300000",
    RGPT_RUNTIME_REPAIR_VALIDATION_WINDOW_MS: "120000",
    RGPT_RUNTIME_REPAIR_STATE_PATH: statePath,
    RGPT_RUNTIME_TRANSIENT_MEMORY_PATH: transientMemoryPath,
    RGPT_CAPABILITY_RUNTIME_STATE_PATH: capabilityRuntimeStatePath,
    RGPT_RUNTIME_QUEUE_RECOVERY_STATE_PATH: queueRecoveryStatePath,
    RGPT_RUNTIME_RESTART_STATE_PATH: restartStatePath,
    RGPT_RUNTIME_ID: "rgpt-repair-test",
  };

  const config: RuntimeRepairConfig = {
    enabled: true,
    cooldownMs: 60000,
    maxAttemptsWithinWindow: 2,
    attemptWindowMs: 300000,
    validationWindowMs: 120000,
    statePath,
    transientMemoryPath,
    capabilityRuntimeStatePath,
    queueRecoveryStatePath,
    restartStatePath,
  };

  return {
    root,
    statePath,
    transientMemoryPath,
    capabilityRuntimeStatePath,
    queueRecoveryStatePath,
    restartStatePath,
    env,
    config,
  };
}

async function readJson(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
}

test("diagnosis classification maps all supported anomaly types to deterministic actions", () => {
  const engine = new RuntimeDiagnosisEngine();
  const scenarios = [
    { anomalyType: "stale_heartbeat", action: "restart_runtime_worker", targetType: "runtime" },
    { anomalyType: "queue_backlog", action: "recover_queue", targetType: "queue" },
    { anomalyType: "memory_pressure", action: "cleanup_memory", targetType: "memory" },
    { anomalyType: "capability_timeout", action: "reset_capability_state", targetType: "capability" },
    { anomalyType: "capability_lock_stuck", action: "reset_capability_state", targetType: "capability" },
  ] as const;

  for (const scenario of scenarios) {
    const diagnosis = engine.diagnose({
      source: "unit-test",
      anomalyType: scenario.anomalyType,
      detectedAt: "2026-03-09T10:00:00.000Z",
      likelyTargetId: "target-1",
    });
    assert.equal(diagnosis.recommendedRepairAction, scenario.action);
    assert.equal(diagnosis.likelyTargetType, scenario.targetType);
    assert.equal(diagnosis.repairable, true);
    assert.equal(diagnosis.reasonCodes.length > 0, true);
  }
});

test("orchestrator selects correct repair action for stale heartbeat", async () => {
  const fixture = await createFixture();
  const ledger = new ExecutionLedger("", "");
  const orchestrator = new RuntimeRepairOrchestrator(ledger);

  const result = await orchestrator.run({
    env: fixture.env,
    anomalyType: "stale_heartbeat",
    metadata: { heartbeatState: "healthy" },
    now: new Date("2026-03-09T10:00:00.000Z"),
  });

  assert.equal(result.diagnosis?.recommendedRepairAction, "restart_runtime_worker");
  assert.equal(result.repairAttempt?.repairAction, "restart_runtime_worker");
  assert.equal(result.skipped, false);
});

test("cooldown prevents repeated repair spam for same target/action", async () => {
  const fixture = await createFixture();
  const ledger = new ExecutionLedger("", "");
  const orchestrator = new RuntimeRepairOrchestrator(ledger);

  const first = await orchestrator.run({
    env: fixture.env,
    anomalyType: "stale_heartbeat",
    targetId: "runtime-main",
    now: new Date("2026-03-09T10:00:00.000Z"),
  });

  const second = await orchestrator.run({
    env: fixture.env,
    anomalyType: "stale_heartbeat",
    targetId: "runtime-main",
    now: new Date("2026-03-09T10:00:10.000Z"),
  });

  assert.equal(first.skipped, false);
  assert.equal(second.skipped, true);
  assert.equal(second.cooldownActive, true);
  assert.equal(second.status, "cooldown");
});

test("repair agents perform bounded deterministic behavior", async () => {
  const fixture = await createFixture();
  await writeFile(
    fixture.transientMemoryPath,
    JSON.stringify({ schemaVersion: "rgpt.transient_memory_cache.v1", entries: [{ id: "temp-1" }] }),
    "utf8"
  );

  const diagnosisEngine = new RuntimeDiagnosisEngine();
  const now = new Date("2026-03-09T10:00:00.000Z");

  const restartResult = await new RestartRepairAgent().execute({
    runtimeId: "rgpt-repair-test",
    now,
    config: fixture.config,
    diagnosis: diagnosisEngine.diagnose({ source: "unit", anomalyType: "stale_heartbeat" }),
  });
  assert.equal(restartResult.success, true);

  const queueResult = await new QueueRecoveryAgent().execute({
    runtimeId: "rgpt-repair-test",
    now,
    config: fixture.config,
    diagnosis: diagnosisEngine.diagnose({ source: "unit", anomalyType: "queue_backlog" }),
  });
  assert.equal(queueResult.success, true);

  const memoryResult = await new MemoryCleanupAgent().execute({
    runtimeId: "rgpt-repair-test",
    now,
    config: fixture.config,
    diagnosis: diagnosisEngine.diagnose({ source: "unit", anomalyType: "memory_pressure" }),
  });
  assert.equal(memoryResult.success, true);

  const capabilityResult = await new CapabilityResetAgent().execute({
    runtimeId: "rgpt-repair-test",
    now,
    config: fixture.config,
    diagnosis: diagnosisEngine.diagnose({ source: "unit", anomalyType: "capability_timeout", likelyTargetId: "cap.alpha" }),
  });
  assert.equal(capabilityResult.success, true);

  const transientCache = await readJson(fixture.transientMemoryPath);
  assert.deepEqual(transientCache.entries, []);

  const capabilityState = await readJson(fixture.capabilityRuntimeStatePath);
  const capItem = ((capabilityState.capabilities as Record<string, unknown>)["cap.alpha"] as Record<string, unknown>) ?? {};
  assert.equal(capItem.locked, false);
});

test("validator reports success and failure deterministically", async () => {
  const fixture = await createFixture();
  const validator = new RecoveryValidator();
  const diagnosisEngine = new RuntimeDiagnosisEngine();

  const diagnosis = diagnosisEngine.diagnose({
    source: "unit",
    anomalyType: "stale_heartbeat",
    likelyTargetId: "runtime-main",
  });

  const restartAgent = new RestartRepairAgent();
  const now = new Date("2026-03-09T10:00:00.000Z");
  const agent = await restartAgent.execute({ runtimeId: "rgpt-repair-test", now, diagnosis, config: fixture.config });

  const attempt = {
    attemptId: "attempt-1",
    startedAt: now.toISOString(),
    completedAt: agent.completedAt,
    targetType: diagnosis.likelyTargetType,
    targetId: diagnosis.likelyTargetId,
    anomalyType: diagnosis.anomalyType,
    repairAction: diagnosis.recommendedRepairAction,
    success: true,
    reasonCodes: ["TEST"],
    metadata: {},
  };

  const successValidation = await validator.validate({
    now,
    diagnosis,
    attempt,
    config: fixture.config,
    runtimeId: "rgpt-repair-test",
    heartbeatState: "healthy",
  });
  assert.equal(successValidation.success, true);

  const failedValidation = await validator.validate({
    now,
    diagnosis,
    attempt,
    config: fixture.config,
    runtimeId: "rgpt-repair-test",
    heartbeatState: "stale",
  });
  assert.equal(failedValidation.success, false);
});

test("repair state file updates correctly with latest diagnosis/attempt/validation and counters", async () => {
  const fixture = await createFixture();
  const ledger = new ExecutionLedger("", "");
  const orchestrator = new RuntimeRepairOrchestrator(ledger);

  const result = await orchestrator.run({
    env: fixture.env,
    anomalyType: "memory_pressure",
    now: new Date("2026-03-09T10:00:00.000Z"),
  });

  const state = await readJson(fixture.statePath);
  assert.equal(state.schemaVersion, "rgpt.runtime_repair_state.v1");
  assert.equal(typeof state.lastUpdatedAt, "string");
  assert.equal((state.latestDiagnosis as Record<string, unknown>).anomalyType, "memory_pressure");
  assert.equal((state.latestRepairAttempt as Record<string, unknown>).repairAction, "cleanup_memory");
  assert.equal(result.validation !== null, true);
  assert.equal(typeof state.summaryCounters, "object");
});

test("ledger emits runtime repair success/failure/skip events", async () => {
  const fixture = await createFixture();
  const ledger = new ExecutionLedger("", "");
  const orchestrator = new RuntimeRepairOrchestrator(ledger);

  await orchestrator.run({
    env: fixture.env,
    anomalyType: "queue_backlog",
    now: new Date("2026-03-09T10:00:00.000Z"),
  });

  await orchestrator.run({
    env: fixture.env,
    anomalyType: "stale_heartbeat",
    now: new Date("2026-03-09T10:00:02.000Z"),
    metadata: { heartbeatState: "stale" },
  });

  await orchestrator.run({
    env: {
      ...fixture.env,
      RGPT_RUNTIME_REPAIR_ENABLED: "false",
    },
    anomalyType: "queue_backlog",
    now: new Date("2026-03-09T10:00:05.000Z"),
  });

  const entries = ledger.snapshot();
  const eventTypes = entries.map((entry) => entry.eventType);
  assert.equal(eventTypes.includes("runtime_repair_succeeded"), true);
  assert.equal(eventTypes.includes("runtime_recovery_validation_failed"), true);
  assert.equal(eventTypes.includes("runtime_repair_skipped"), true);
});

test("unsupported anomaly follows deterministic no-action path", async () => {
  const fixture = await createFixture();
  const ledger = new ExecutionLedger("", "");
  const orchestrator = new RuntimeRepairOrchestrator(ledger);

  const result = await orchestrator.run({
    env: fixture.env,
    anomalyType: "unsupported",
    now: new Date("2026-03-09T10:10:00.000Z"),
  });

  assert.equal(result.skipped, true);
  assert.equal(result.repairAttempt, null);
  assert.equal(result.diagnosis?.recommendedRepairAction, "no_action");
  assert.equal(result.status, "idle");
});

test("agent execution failure is captured as runtime_repair_failed", async () => {
  const fixture = await createFixture();
  const ledger = new ExecutionLedger("", "");
  const orchestrator = new RuntimeRepairOrchestrator(ledger);

  const result = await orchestrator.run({
    env: {
      ...fixture.env,
      RGPT_RUNTIME_RESTART_STATE_PATH: "*invalid-path*",
    },
    anomalyType: "stale_heartbeat",
    now: new Date("2026-03-09T11:00:00.000Z"),
  });

  assert.equal(result.status, "repair_failed");
  const eventTypes = ledger.snapshot().map((entry) => entry.eventType);
  assert.equal(eventTypes.includes("runtime_repair_failed"), true);
});

test("repair state repository round-trip keeps schema and cooldown map", async () => {
  const fixture = await createFixture();
  const repo = new RuntimeRepairStateRepository(fixture.statePath);
  const state = await repo.read("rgpt-repair-test", "2026-03-09T12:00:00.000Z");
  state.perTargetCooldowns["k1"] = {
    key: "k1",
    targetType: "runtime",
    targetId: null,
    repairAction: "restart_runtime_worker",
    lastAttemptAt: "2026-03-09T12:00:00.000Z",
    cooldownUntil: "2026-03-09T12:01:00.000Z",
    attemptsInWindow: 1,
    windowStartedAt: "2026-03-09T12:00:00.000Z",
  };
  await repo.write(state);

  const after = await repo.read("rgpt-repair-test", "2026-03-09T12:00:01.000Z");
  assert.equal(after.schemaVersion, "rgpt.runtime_repair_state.v1");
  assert.equal(typeof after.perTargetCooldowns.k1, "object");
});
