import { test } from "node:test";
import * as assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ExecutionLedger } from "../runtime/execution-ledger";
import { RuntimeStabilityScoringEngine } from "../runtime/stability/runtime-stability-scoring-engine";
import { RuntimeOscillationDetector } from "../runtime/stability/runtime-oscillation-detector";
import { RuntimeDegradationPolicyEngine } from "../runtime/stability/runtime-degradation-policy-engine";
import { RuntimeStabilityOrchestrator } from "../runtime/stability/runtime-stability-orchestrator";
import { RuntimeStabilityStateRepository } from "../runtime/stability/runtime-stability-state-repository";
import { RuntimeStabilitySignalAggregator } from "../runtime/stability/runtime-stability-signal-aggregator";
import type { RuntimeStabilitySignal } from "../runtime/stability/runtime-stability.types";
import { RuntimeRepairOrchestrator } from "../runtime/repair/runtime-repair-orchestrator";
import { RuntimeRepairLearningOrchestrator } from "../runtime/repair-learning/runtime-repair-learning-orchestrator";
import { RuntimeContainmentOrchestrator } from "../runtime/containment/runtime-containment-orchestrator";

interface Fixture {
  root: string;
  runtimeDir: string;
  meshDir: string;
  stabilityStatePath: string;
  ledgerPath: string;
  env: NodeJS.ProcessEnv;
}

async function createFixture(): Promise<Fixture> {
  const root = await mkdtemp(join(tmpdir(), "rgpt-runtime-stability-"));
  const runtimeDir = join(root, ".rocketgpt", "runtime");
  const meshDir = join(root, ".rocketgpt", "cognitive-mesh");
  await mkdir(runtimeDir, { recursive: true });
  await mkdir(meshDir, { recursive: true });

  const stabilityStatePath = join(runtimeDir, "stability-state.json");
  const ledgerPath = join(meshDir, "execution-ledger.jsonl");

  const env: NodeJS.ProcessEnv = {
    RGPT_RUNTIME_ID: "rgpt-stability-test",
    COGNITIVE_MESH_EXECUTION_LEDGER_JSONL_PATH: ledgerPath,
    RGPT_RUNTIME_STABILITY_ENABLED: "true",
    RGPT_RUNTIME_STABILITY_STATE_PATH: stabilityStatePath,
    RGPT_RUNTIME_STABILITY_LOOKBACK_MS: "3600000",
    RGPT_RUNTIME_STABILITY_OSCILLATION_THRESHOLD: "2",
    RGPT_RUNTIME_STABILITY_MULTI_TARGET_THRESHOLD: "2",
    RGPT_RUNTIME_STABILITY_EVALUATION_COOLDOWN_MS: "120000",
    RGPT_RUNTIME_STABILITY_MAX_EVIDENCE_EVENTS: "100",

    RGPT_RUNTIME_REPAIR_ENABLED: "true",
    RGPT_RUNTIME_REPAIR_STATE_PATH: join(runtimeDir, "repair-state.json"),
    RGPT_RUNTIME_TRANSIENT_MEMORY_PATH: join(runtimeDir, "transient-memory-cache.json"),
    RGPT_CAPABILITY_RUNTIME_STATE_PATH: join(runtimeDir, "capability-runtime-state.json"),
    RGPT_RUNTIME_QUEUE_RECOVERY_STATE_PATH: join(runtimeDir, "queue-recovery-state.json"),
    RGPT_RUNTIME_RESTART_STATE_PATH: join(runtimeDir, "restart-state.json"),

    RGPT_RUNTIME_REPAIR_LEARNING_ENABLED: "true",
    RGPT_RUNTIME_REPAIR_LEARNING_STATE_PATH: join(runtimeDir, "repair-learning-state.json"),
    RGPT_RUNTIME_REPAIR_LEARNING_LOOKBACK_MS: "3600000",
    RGPT_RUNTIME_REPAIR_LEARNING_RECURRENCE_THRESHOLD: "2",
    RGPT_RUNTIME_REPAIR_LEARNING_COOLDOWN_MS: "1000",
    RGPT_RUNTIME_REPAIR_LEARNING_MAX_EVIDENCE_EVENTS: "80",

    RGPT_RUNTIME_CONTAINMENT_ENABLED: "true",
    RGPT_RUNTIME_CONTAINMENT_STATE_PATH: join(runtimeDir, "containment-state.json"),
    RGPT_RUNTIME_CONTAINMENT_LOOKBACK_MS: "3600000",
    RGPT_RUNTIME_CONTAINMENT_RECURRENCE_THRESHOLD: "2",
    RGPT_RUNTIME_CONTAINMENT_COOLDOWN_MS: "120000",
    RGPT_RUNTIME_CONTAINMENT_OBSERVATION_MS: "1000",
    RGPT_RUNTIME_CONTAINMENT_MAX_REINTEGRATION_FAILURES: "2",
    RGPT_RUNTIME_CONTAINMENT_MAX_EVIDENCE_EVENTS: "80",
  };

  return { root, runtimeDir, meshDir, stabilityStatePath, ledgerPath, env };
}

function signal(overrides?: Partial<RuntimeStabilitySignal>): RuntimeStabilitySignal {
  return {
    eventId: overrides?.eventId ?? `evt-${Date.now()}`,
    timestamp: overrides?.timestamp ?? "2026-03-09T15:00:00.000Z",
    eventType: overrides?.eventType ?? "runtime_repair_attempted",
    targetType: overrides?.targetType ?? "worker",
    targetId: overrides?.targetId ?? "worker-1",
    reasonCodes: overrides?.reasonCodes ?? [],
    metadata: overrides?.metadata ?? {},
  };
}

test("target-level stability scoring is deterministic and bounded", () => {
  const engine = new RuntimeStabilityScoringEngine();
  const result = engine.score({
    signals: [
      signal({ eventType: "runtime_repair_failed" }),
      signal({ eventType: "runtime_recovery_validation_failed" }),
      signal({ eventType: "runtime_quarantine_applied" }),
    ],
    patterns: ["repeated_same_target_instability"],
    oscillatingTargets: new Set(["worker:worker-1"]),
    multiTargetThreshold: 2,
  });

  assert.equal(result.targetEvaluations.length, 1);
  assert.equal(result.targetEvaluations[0]!.stabilityScore < 80, true);
  assert.equal(result.targetEvaluations[0]!.band === "watch" || result.targetEvaluations[0]!.band === "degraded" || result.targetEvaluations[0]!.band === "constrained" || result.targetEvaluations[0]!.band === "critical", true);
});

test("system-level stability scoring reflects multi-target instability", () => {
  const engine = new RuntimeStabilityScoringEngine();
  const result = engine.score({
    signals: [
      signal({ targetType: "worker", targetId: "w1", eventType: "runtime_repair_failed" }),
      signal({ targetType: "queue", targetId: "q1", eventType: "runtime_repair_failed" }),
      signal({ targetType: "capability", targetId: "c1", eventType: "runtime_recovery_validation_failed" }),
    ],
    patterns: ["clustered_multi_target_instability"],
    oscillatingTargets: new Set(),
    multiTargetThreshold: 2,
  });

  assert.equal(result.systemStabilityScore < 80, true);
  assert.equal(result.systemStabilityBand !== "normal", true);
});

test("repair oscillation detection", () => {
  const detector = new RuntimeOscillationDetector();
  const result = detector.detect({
    signals: [
      signal({ eventType: "runtime_repair_attempted", targetId: "w1" }),
      signal({ eventType: "runtime_repair_failed", targetId: "w1" }),
      signal({ eventType: "runtime_repair_attempted", targetId: "w1" }),
      signal({ eventType: "runtime_repair_failed", targetId: "w1" }),
    ],
    oscillationThreshold: 2,
    lookbackMs: 3600000,
    now: new Date("2026-03-09T15:00:00.000Z"),
  });

  assert.equal(result.patterns.includes("repair_oscillation"), true);
});

test("contain/reintegrate oscillation detection", () => {
  const detector = new RuntimeOscillationDetector();
  const result = detector.detect({
    signals: [
      signal({ eventType: "runtime_quarantine_applied", targetId: "w2" }),
      signal({ eventType: "runtime_reintegration_failed", targetId: "w2" }),
      signal({ eventType: "runtime_quarantine_applied", targetId: "w2" }),
      signal({ eventType: "runtime_reintegration_failed", targetId: "w2" }),
    ],
    oscillationThreshold: 2,
    lookbackMs: 3600000,
    now: new Date("2026-03-09T15:00:00.000Z"),
  });

  assert.equal(result.patterns.includes("contain_reintegrate_oscillation"), true);
});

test("heartbeat flap detection", () => {
  const detector = new RuntimeOscillationDetector();
  const result = detector.detect({
    signals: [
      signal({ eventType: "runtime.heartbeat", targetId: "runtime-main" }),
      signal({ eventType: "runtime.heartbeat", targetId: "runtime-main" }),
      signal({ eventType: "runtime.heartbeat", targetId: "runtime-main" }),
    ],
    oscillationThreshold: 2,
    lookbackMs: 3600000,
    now: new Date("2026-03-09T15:00:00.000Z"),
  });

  assert.equal(result.patterns.includes("heartbeat_recovery_flap"), true);
});

test("stability aggregator ingests hybrid/manual heartbeat intent from runtime.guard.evaluated entries", async () => {
  const fixture = await createFixture();
  await writeFile(
    fixture.ledgerPath,
    `${JSON.stringify({
      entryId: "exec_hb_stability",
      timestamp: "2026-03-09T15:00:00.000Z",
      category: "runtime",
      eventType: "runtime.guard.evaluated",
      action: "runtime.heartbeat.hybrid.monitor",
      source: "hybrid_heartbeat",
      target: "system_heartbeat",
      ids: { requestId: "hb-stab-1" },
      mode: "normal",
      status: "evaluated",
      metadata: {
        heartbeatHybrid: {
          runtimeId: "rgpt-stability-test",
          state: "healthy",
        },
      },
    })}\n`,
    "utf8"
  );

  const signals = await new RuntimeStabilitySignalAggregator().collect(
    {
      enabled: true,
      lookbackMs: 3_600_000,
      oscillationThreshold: 2,
      multiTargetThreshold: 2,
      evaluationCooldownMs: 60_000,
      maxEvidenceEvents: 20,
      statePath: fixture.stabilityStatePath,
      ledgerPath: fixture.ledgerPath,
    },
    new Date("2026-03-09T15:00:30.000Z")
  );

  assert.equal(signals.length, 1);
  assert.equal(signals[0]!.eventType, "runtime.heartbeat");
});

test("clustered multi-target instability detection", () => {
  const detector = new RuntimeOscillationDetector();
  const result = detector.detect({
    signals: [
      signal({ targetId: "w1", eventType: "runtime_repair_failed" }),
      signal({ targetId: "w1", eventType: "runtime_recovery_validation_failed" }),
      signal({ targetType: "queue", targetId: "q1", eventType: "runtime_repair_failed" }),
      signal({ targetType: "queue", targetId: "q1", eventType: "runtime_quarantine_applied" }),
    ],
    oscillationThreshold: 2,
    lookbackMs: 3600000,
    now: new Date("2026-03-09T15:00:00.000Z"),
  });

  assert.equal(result.patterns.includes("clustered_multi_target_instability"), true);
});

test("degradation action selection for major bands/patterns", () => {
  const policy = new RuntimeDegradationPolicyEngine();

  const critical = policy.evaluate({
    systemBand: "critical",
    systemScore: 10,
    patterns: [],
    targetEvaluations: [],
  });
  assert.equal(critical.action, "recommend_safe_mode_review");

  const clustered = policy.evaluate({
    systemBand: "degraded",
    systemScore: 45,
    patterns: ["clustered_multi_target_instability"],
    targetEvaluations: [],
  });
  assert.equal(clustered.action, "reduce_new_work_intake");

  const repeated = policy.evaluate({
    systemBand: "watch",
    systemScore: 66,
    patterns: ["repeated_same_target_instability"],
    targetEvaluations: [],
  });
  assert.equal(repeated.action, "suppress_repeated_repair_on_unstable_targets");
});

test("evaluation cooldown prevents repeated stability event spam", async () => {
  const fixture = await createFixture();
  const orchestrator = new RuntimeStabilityOrchestrator(new ExecutionLedger("", ""));

  const first = await orchestrator.run({
    env: fixture.env,
    now: new Date("2026-03-09T15:10:00.000Z"),
    evidenceSignals: [signal({ eventType: "runtime_repair_failed" })],
  });
  const second = await orchestrator.run({
    env: fixture.env,
    now: new Date("2026-03-09T15:10:10.000Z"),
    evidenceSignals: [signal({ eventType: "runtime_repair_failed" })],
  });

  assert.equal(first.skipped, false);
  assert.equal(second.skipped, true);
  assert.equal(second.cooldownActive, true);
});

test("stability state file updates correctly", async () => {
  const fixture = await createFixture();
  const orchestrator = new RuntimeStabilityOrchestrator(new ExecutionLedger("", ""));

  const result = await orchestrator.run({
    env: fixture.env,
    now: new Date("2026-03-09T15:11:00.000Z"),
    evidenceSignals: [
      signal({ eventType: "runtime_repair_failed", targetId: "w-state" }),
      signal({ eventType: "runtime_recovery_validation_failed", targetId: "w-state" }),
    ],
  });

  const repo = new RuntimeStabilityStateRepository(fixture.stabilityStatePath);
  const state = await repo.read("rgpt-stability-test", "2026-03-09T15:12:00.000Z");

  assert.equal(result.evaluation !== null, true);
  assert.equal(state.schemaVersion, "rgpt.runtime_stability_state.v1");
  assert.equal(typeof state.latestEvaluation?.systemStabilityScore, "number");
});

test("immutable stability events are emitted", async () => {
  const fixture = await createFixture();
  const ledger = new ExecutionLedger("", "");
  const orchestrator = new RuntimeStabilityOrchestrator(ledger);

  await orchestrator.run({
    env: fixture.env,
    now: new Date("2026-03-09T15:13:00.000Z"),
    evidenceSignals: [
      signal({ eventType: "runtime_repair_failed", targetId: "w-events" }),
      signal({ eventType: "runtime_repair_failed", targetId: "w-events" }),
      signal({ eventType: "runtime_recovery_validation_failed", targetId: "w-events" }),
      signal({ eventType: "runtime_quarantine_applied", targetId: "w-events" }),
    ],
  });

  const eventTypes = ledger.snapshot().map((entry) => entry.eventType);
  assert.equal(eventTypes.includes("runtime_stability_evaluated"), true);
  assert.equal(eventTypes.includes("runtime_instability_pattern_detected"), true);
  assert.equal(eventTypes.includes("runtime_degradation_action_recommended"), true);
});

test("integration flow: D20/D21 evidence drives D22 stability evaluation", async () => {
  const fixture = await createFixture();
  const sharedLedger = new ExecutionLedger(fixture.ledgerPath, "");

  sharedLedger.append({
    category: "runtime",
    eventType: "runtime.heartbeat",
    action: "runtime.heartbeat.manual.single",
    source: "manual_heartbeat_runner",
    target: "system_heartbeat",
    status: "completed",
    ids: { requestId: "hb-1" },
    metadata: { targetType: "runtime", targetId: "runtime-main", reasonCodes: ["HEARTBEAT"] },
    timestamp: "2026-03-09T15:20:00.000Z",
  });

  const repair = await new RuntimeRepairOrchestrator(sharedLedger).run({
    env: fixture.env,
    anomalyType: "stale_heartbeat",
    targetId: "worker-int",
    now: new Date("2026-03-09T15:20:10.000Z"),
  });

  const learning = await new RuntimeRepairLearningOrchestrator(sharedLedger).run({
    env: fixture.env,
    diagnosis: repair.diagnosis,
    repairAttempt: repair.repairAttempt,
    validation: repair.validation,
    now: new Date("2026-03-09T15:20:20.000Z"),
  });

  await new RuntimeContainmentOrchestrator(sharedLedger).run({
    env: fixture.env,
    diagnosis: repair.diagnosis,
    repairAttempt: repair.repairAttempt,
    validation: repair.validation,
    learningResult: learning.learningResult,
    targetType: "worker",
    targetId: "worker-int",
    evidenceEvents: [
      {
        eventId: "c1",
        timestamp: "2026-03-09T15:20:21.000Z",
        eventType: "runtime_repair_failed",
        targetType: "worker",
        targetId: "worker-int",
        anomalyType: "stale_heartbeat",
        repairAction: "restart_runtime_worker",
        repairSuccess: false,
        validationSuccess: false,
        recommendationClasses: [],
        reasonCodes: ["X"],
      },
      {
        eventId: "c2",
        timestamp: "2026-03-09T15:20:22.000Z",
        eventType: "runtime_repair_failed",
        targetType: "worker",
        targetId: "worker-int",
        anomalyType: "stale_heartbeat",
        repairAction: "restart_runtime_worker",
        repairSuccess: false,
        validationSuccess: false,
        recommendationClasses: [],
        reasonCodes: ["X"],
      },
    ],
    now: new Date("2026-03-09T15:20:23.000Z"),
  });

  const stability = await new RuntimeStabilityOrchestrator(sharedLedger).run({
    env: fixture.env,
    now: new Date("2026-03-09T15:20:30.000Z"),
  });

  assert.equal(stability.evaluation !== null, true);
  assert.equal(typeof stability.evaluation?.systemStabilityScore, "number");
  assert.equal(Array.isArray(stability.evaluation?.targetEvaluations), true);
});

test("no-instability path yields normal/watch appropriately", async () => {
  const fixture = await createFixture();
  const result = await new RuntimeStabilityOrchestrator(new ExecutionLedger("", "")).run({
    env: fixture.env,
    now: new Date("2026-03-09T15:30:00.000Z"),
    evidenceSignals: [
      signal({ eventType: "runtime_repair_succeeded", targetId: "worker-ok" }),
      signal({ eventType: "runtime_recovery_validation_succeeded", targetId: "worker-ok" }),
    ],
  });

  assert.equal(result.evaluation !== null, true);
  assert.equal(result.evaluation?.systemStabilityBand === "normal" || result.evaluation?.systemStabilityBand === "watch", true);

  const stateRaw = JSON.parse(await readFile(fixture.stabilityStatePath, "utf8")) as Record<string, unknown>;
  assert.equal(stateRaw.schemaVersion, "rgpt.runtime_stability_state.v1");
});
