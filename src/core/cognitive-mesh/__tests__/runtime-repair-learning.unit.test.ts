import { test } from "node:test";
import * as assert from "node:assert/strict";
import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ExecutionLedger } from "../runtime/execution-ledger";
import { RuntimeFailurePatternDetector } from "../runtime/repair-learning/runtime-failure-pattern-detector";
import { RuntimeRootCauseAnalysisEngine } from "../runtime/repair-learning/runtime-root-cause-analysis-engine";
import { RuntimePreventionRecommendationEngine } from "../runtime/repair-learning/runtime-prevention-recommendation-engine";
import { RuntimeRepairLearningStateRepository } from "../runtime/repair-learning/runtime-repair-learning-state-repository";
import { RuntimeRepairLearningOrchestrator } from "../runtime/repair-learning/runtime-repair-learning-orchestrator";
import type { RuntimeLearningEvidenceEvent } from "../runtime/repair-learning/runtime-repair-learning.types";
import { RuntimeRepairOrchestrator } from "../runtime/repair/runtime-repair-orchestrator";
import type { RuntimeRepairDiagnosis, RuntimeRepairAttempt, RuntimeRecoveryValidation } from "../runtime/repair/runtime-repair.types";

interface Fixture {
  root: string;
  repairStatePath: string;
  learningStatePath: string;
  ledgerPath: string;
  transientMemoryPath: string;
  capabilityRuntimeStatePath: string;
  queueRecoveryStatePath: string;
  restartStatePath: string;
  env: NodeJS.ProcessEnv;
}

async function createFixture(): Promise<Fixture> {
  const root = await mkdtemp(join(tmpdir(), "rgpt-runtime-repair-learning-"));
  const runtimeDir = join(root, ".rocketgpt", "runtime");
  const meshDir = join(root, ".rocketgpt", "cognitive-mesh");
  await mkdir(runtimeDir, { recursive: true });
  await mkdir(meshDir, { recursive: true });

  const repairStatePath = join(runtimeDir, "repair-state.json");
  const learningStatePath = join(runtimeDir, "repair-learning-state.json");
  const transientMemoryPath = join(runtimeDir, "transient-memory-cache.json");
  const capabilityRuntimeStatePath = join(runtimeDir, "capability-runtime-state.json");
  const queueRecoveryStatePath = join(runtimeDir, "queue-recovery-state.json");
  const restartStatePath = join(runtimeDir, "restart-state.json");
  const ledgerPath = join(meshDir, "execution-ledger.jsonl");

  const env: NodeJS.ProcessEnv = {
    RGPT_RUNTIME_ID: "rgpt-learning-test",
    COGNITIVE_MESH_EXECUTION_LEDGER_JSONL_PATH: ledgerPath,

    RGPT_RUNTIME_REPAIR_ENABLED: "true",
    RGPT_RUNTIME_REPAIR_STATE_PATH: repairStatePath,
    RGPT_RUNTIME_TRANSIENT_MEMORY_PATH: transientMemoryPath,
    RGPT_CAPABILITY_RUNTIME_STATE_PATH: capabilityRuntimeStatePath,
    RGPT_RUNTIME_QUEUE_RECOVERY_STATE_PATH: queueRecoveryStatePath,
    RGPT_RUNTIME_RESTART_STATE_PATH: restartStatePath,

    RGPT_RUNTIME_REPAIR_LEARNING_ENABLED: "true",
    RGPT_RUNTIME_REPAIR_LEARNING_STATE_PATH: learningStatePath,
    RGPT_RUNTIME_REPAIR_LEARNING_LOOKBACK_MS: "3600000",
    RGPT_RUNTIME_REPAIR_LEARNING_RECURRENCE_THRESHOLD: "2",
    RGPT_RUNTIME_REPAIR_LEARNING_COOLDOWN_MS: "60000",
    RGPT_RUNTIME_REPAIR_LEARNING_MAX_EVIDENCE_EVENTS: "100",
  };

  return {
    root,
    repairStatePath,
    learningStatePath,
    ledgerPath,
    transientMemoryPath,
    capabilityRuntimeStatePath,
    queueRecoveryStatePath,
    restartStatePath,
    env,
  };
}

function ev(input: Partial<RuntimeLearningEvidenceEvent> & Pick<RuntimeLearningEvidenceEvent, "eventId" | "timestamp">): RuntimeLearningEvidenceEvent {
  return {
    eventId: input.eventId,
    timestamp: input.timestamp,
    eventType: input.eventType ?? "runtime_repair_succeeded",
    targetType: input.targetType ?? "runtime",
    targetId: input.targetId ?? "runtime-main",
    anomalyType: input.anomalyType ?? "stale_heartbeat",
    repairAction: input.repairAction ?? "restart_runtime_worker",
    repairSuccess: input.repairSuccess ?? true,
    validationSuccess: input.validationSuccess ?? true,
    reasonCodes: input.reasonCodes ?? [],
  };
}

test("repeated stale heartbeat pattern detection", () => {
  const detector = new RuntimeFailurePatternDetector();
  const events = [
    ev({ eventId: "1", timestamp: "2026-03-09T10:00:00.000Z", anomalyType: "stale_heartbeat" }),
    ev({ eventId: "2", timestamp: "2026-03-09T10:01:00.000Z", anomalyType: "stale_heartbeat" }),
  ];
  const result = detector.detect({
    evidenceEvents: events,
    anomalyType: "stale_heartbeat",
    repairAction: "restart_runtime_worker",
    targetType: "runtime",
    targetId: "runtime-main",
    recurrenceThreshold: 2,
    clusteredWindowMs: 600000,
  });
  assert.equal(result.patternCategory, "repeated_stale_heartbeat");
  assert.equal(result.recurrenceDetected, true);
});

test("repeated queue backlog/memory pressure/capability patterns detection", () => {
  const detector = new RuntimeFailurePatternDetector();
  const scenarios = [
    { anomalyType: "queue_backlog" as const, expected: "repeated_queue_backlog" },
    { anomalyType: "memory_pressure" as const, expected: "repeated_memory_pressure" },
    { anomalyType: "capability_timeout" as const, expected: "repeated_capability_timeout" },
    { anomalyType: "capability_lock_stuck" as const, expected: "repeated_capability_lock_stuck" },
  ];

  for (const scenario of scenarios) {
    const events = [
      ev({ eventId: `${scenario.anomalyType}-1`, timestamp: "2026-03-09T10:00:00.000Z", anomalyType: scenario.anomalyType, targetType: scenario.anomalyType.includes("capability") ? "capability" : scenario.anomalyType === "queue_backlog" ? "queue" : "memory" }),
      ev({ eventId: `${scenario.anomalyType}-2`, timestamp: "2026-03-09T10:02:00.000Z", anomalyType: scenario.anomalyType, targetType: scenario.anomalyType.includes("capability") ? "capability" : scenario.anomalyType === "queue_backlog" ? "queue" : "memory" }),
    ];

    const result = detector.detect({
      evidenceEvents: events,
      anomalyType: scenario.anomalyType,
      repairAction: scenario.anomalyType.includes("capability") ? "reset_capability_state" : scenario.anomalyType === "queue_backlog" ? "recover_queue" : "cleanup_memory",
      targetType: scenario.anomalyType.includes("capability") ? "capability" : scenario.anomalyType === "queue_backlog" ? "queue" : "memory",
      targetId: "runtime-main",
      recurrenceThreshold: 2,
      clusteredWindowMs: 600000,
    });

    assert.equal(result.patternCategory, scenario.expected);
    assert.equal(result.recurrenceDetected, true);
  }
});

test("repeated repair failure and validation failure pattern detection", () => {
  const detector = new RuntimeFailurePatternDetector();

  const repairFailure = detector.detect({
    evidenceEvents: [
      ev({ eventId: "rf1", timestamp: "2026-03-09T10:00:00.000Z", repairSuccess: false }),
      ev({ eventId: "rf2", timestamp: "2026-03-09T10:05:00.000Z", repairSuccess: false }),
    ],
    anomalyType: "stale_heartbeat",
    repairAction: "restart_runtime_worker",
    targetType: "runtime",
    targetId: "runtime-main",
    recurrenceThreshold: 2,
    clusteredWindowMs: 600000,
  });
  assert.equal(repairFailure.patternCategory, "repeated_repair_failure");

  const validationFailure = detector.detect({
    evidenceEvents: [
      ev({ eventId: "vf1", timestamp: "2026-03-09T10:00:00.000Z", validationSuccess: false }),
      ev({ eventId: "vf2", timestamp: "2026-03-09T10:05:00.000Z", validationSuccess: false }),
    ],
    anomalyType: "stale_heartbeat",
    repairAction: "restart_runtime_worker",
    targetType: "runtime",
    targetId: "runtime-main",
    recurrenceThreshold: 2,
    clusteredWindowMs: 600000,
  });
  assert.equal(validationFailure.patternCategory, "repeated_validation_failure");
});

test("root cause mapping for supported categories", () => {
  const engine = new RuntimeRootCauseAnalysisEngine();

  const worker = engine.analyze({
    anomalyType: "stale_heartbeat",
    repairAction: "restart_runtime_worker",
    validationOutcome: "succeeded",
    recurrenceDetected: true,
    recurrenceCount: 3,
    pattern: { patternCategory: "repeated_stale_heartbeat", recurrenceDetected: true, recurrenceCount: 3, reasonCodes: [], metadata: {} },
  });
  assert.equal(worker.rootCauseCategory, "worker_instability");

  const queue = engine.analyze({
    anomalyType: "queue_backlog",
    repairAction: "recover_queue",
    validationOutcome: "failed",
    recurrenceDetected: true,
    recurrenceCount: 2,
    pattern: { patternCategory: "repeated_queue_backlog", recurrenceDetected: true, recurrenceCount: 2, reasonCodes: [], metadata: {} },
  });
  assert.equal(queue.rootCauseCategory, "queue_congestion");

  const memory = engine.analyze({
    anomalyType: "memory_pressure",
    repairAction: "cleanup_memory",
    validationOutcome: "succeeded",
    recurrenceDetected: true,
    recurrenceCount: 2,
    pattern: { patternCategory: "repeated_memory_pressure", recurrenceDetected: true, recurrenceCount: 2, reasonCodes: [], metadata: {} },
  });
  assert.equal(memory.rootCauseCategory, "transient_memory_buildup");

  const capability = engine.analyze({
    anomalyType: "capability_lock_stuck",
    repairAction: "reset_capability_state",
    validationOutcome: "failed",
    recurrenceDetected: true,
    recurrenceCount: 2,
    pattern: { patternCategory: "repeated_capability_lock_stuck", recurrenceDetected: true, recurrenceCount: 2, reasonCodes: [], metadata: {} },
  });
  assert.equal(capability.rootCauseCategory, "capability_state_locking");

  const ineff = engine.analyze({
    anomalyType: "stale_heartbeat",
    repairAction: "restart_runtime_worker",
    validationOutcome: "failed",
    recurrenceDetected: true,
    recurrenceCount: 2,
    pattern: { patternCategory: "repeated_validation_failure", recurrenceDetected: true, recurrenceCount: 2, reasonCodes: [], metadata: {} },
  });
  assert.equal(ineff.rootCauseCategory, "repeated_repair_ineffectiveness");
});

test("prevention recommendation generation for root causes", () => {
  const engine = new RuntimePreventionRecommendationEngine();

  assert.deepEqual(
    engine.generate({ rootCauseCategory: "queue_congestion", recurrenceDetected: true, recurrenceCount: 2 }).recommendationClasses,
    ["inspect_queue_pressure", "reduce_retry_pressure"]
  );
  assert.deepEqual(
    engine.generate({ rootCauseCategory: "worker_instability", recurrenceDetected: true, recurrenceCount: 2 }).recommendationClasses,
    ["increase_observation_on_target", "escalate_for_containment_consideration"]
  );
  assert.deepEqual(
    engine.generate({ rootCauseCategory: "transient_memory_buildup", recurrenceDetected: true, recurrenceCount: 2 }).recommendationClasses,
    ["inspect_memory_cleanup_frequency", "increase_observation_on_target"]
  );
  assert.deepEqual(
    engine.generate({ rootCauseCategory: "capability_state_locking", recurrenceDetected: true, recurrenceCount: 2 }).recommendationClasses,
    ["inspect_capability_locking_flow", "inspect_capability_timeout_threshold"]
  );
  assert.deepEqual(
    engine.generate({ rootCauseCategory: "repeated_repair_ineffectiveness", recurrenceDetected: true, recurrenceCount: 2 }).recommendationClasses,
    ["manual_review_required", "escalate_for_containment_consideration"]
  );
});

test("learning cooldown dedupe prevents repeated identical learning spam", async () => {
  const fixture = await createFixture();
  const ledger = new ExecutionLedger(fixture.ledgerPath, "");
  const orchestrator = new RuntimeRepairLearningOrchestrator(ledger);

  const diagnosis: RuntimeRepairDiagnosis = {
    diagnosisId: "d1",
    detectedAt: "2026-03-09T10:00:00.000Z",
    source: "test",
    anomalyType: "stale_heartbeat",
    severity: "high",
    repairable: true,
    likelyTargetType: "runtime",
    likelyTargetId: "runtime-main",
    recommendedRepairAction: "restart_runtime_worker",
    reasonCodes: ["r1"],
    metadata: {},
  };

  const attempt: RuntimeRepairAttempt = {
    attemptId: "a1",
    startedAt: "2026-03-09T10:00:00.000Z",
    completedAt: "2026-03-09T10:00:00.000Z",
    targetType: "runtime",
    targetId: "runtime-main",
    anomalyType: "stale_heartbeat",
    repairAction: "restart_runtime_worker",
    success: true,
    reasonCodes: ["ok"],
    metadata: {},
  };

  const validation: RuntimeRecoveryValidation = {
    validationId: "v1",
    startedAt: "2026-03-09T10:00:00.000Z",
    completedAt: "2026-03-09T10:00:00.000Z",
    targetType: "runtime",
    targetId: "runtime-main",
    repairAction: "restart_runtime_worker",
    success: true,
    checks: [],
    reasonCodes: ["pass"],
    metadata: {},
  };

  const first = await orchestrator.run({ env: fixture.env, diagnosis, repairAttempt: attempt, validation, now: new Date("2026-03-09T10:00:00.000Z") });
  const second = await orchestrator.run({ env: fixture.env, diagnosis, repairAttempt: attempt, validation, now: new Date("2026-03-09T10:00:10.000Z") });

  assert.equal(first.skipped, false);
  assert.equal(second.skipped, true);
  assert.equal(second.cooldownActive, true);
});

test("learning state file updates correctly", async () => {
  const fixture = await createFixture();
  const ledger = new ExecutionLedger(fixture.ledgerPath, "");
  const orchestrator = new RuntimeRepairLearningOrchestrator(ledger);

  const result = await orchestrator.run({
    env: fixture.env,
    diagnosis: {
      diagnosisId: "d2",
      detectedAt: "2026-03-09T10:30:00.000Z",
      source: "test",
      anomalyType: "memory_pressure",
      severity: "medium",
      repairable: true,
      likelyTargetType: "memory",
      likelyTargetId: "mem-1",
      recommendedRepairAction: "cleanup_memory",
      reasonCodes: ["r"],
      metadata: {},
    },
    repairAttempt: {
      attemptId: "a2",
      startedAt: "2026-03-09T10:30:00.000Z",
      completedAt: "2026-03-09T10:30:00.000Z",
      targetType: "memory",
      targetId: "mem-1",
      anomalyType: "memory_pressure",
      repairAction: "cleanup_memory",
      success: true,
      reasonCodes: ["ok"],
      metadata: {},
    },
    validation: {
      validationId: "v2",
      startedAt: "2026-03-09T10:30:00.000Z",
      completedAt: "2026-03-09T10:30:00.000Z",
      targetType: "memory",
      targetId: "mem-1",
      repairAction: "cleanup_memory",
      success: true,
      checks: [],
      reasonCodes: ["ok"],
      metadata: {},
    },
    now: new Date("2026-03-09T10:30:00.000Z"),
  });

  const repo = new RuntimeRepairLearningStateRepository(fixture.learningStatePath);
  const state = await repo.read("rgpt-learning-test", "2026-03-09T10:30:00.000Z");

  assert.equal(result.status, "analysis_completed");
  assert.equal(state.schemaVersion, "rgpt.runtime_repair_learning_state.v1");
  assert.equal(state.latestLearningResult?.anomalyType, "memory_pressure");
  assert.equal(state.summaryCounters.totalCompleted >= 1, true);
});

test("learning ledger events emitted for completed and skipped paths", async () => {
  const fixture = await createFixture();
  const ledger = new ExecutionLedger("", "");
  const orchestrator = new RuntimeRepairLearningOrchestrator(ledger);

  await orchestrator.run({
    env: fixture.env,
    diagnosis: {
      diagnosisId: "d3",
      detectedAt: "2026-03-09T11:00:00.000Z",
      source: "test",
      anomalyType: "queue_backlog",
      severity: "high",
      repairable: true,
      likelyTargetType: "queue",
      likelyTargetId: "q1",
      recommendedRepairAction: "recover_queue",
      reasonCodes: ["r"],
      metadata: {},
    },
    repairAttempt: {
      attemptId: "a3",
      startedAt: "2026-03-09T11:00:00.000Z",
      completedAt: "2026-03-09T11:00:00.000Z",
      targetType: "queue",
      targetId: "q1",
      anomalyType: "queue_backlog",
      repairAction: "recover_queue",
      success: true,
      reasonCodes: ["ok"],
      metadata: {},
    },
    validation: {
      validationId: "v3",
      startedAt: "2026-03-09T11:00:00.000Z",
      completedAt: "2026-03-09T11:00:00.000Z",
      targetType: "queue",
      targetId: "q1",
      repairAction: "recover_queue",
      success: true,
      checks: [],
      reasonCodes: ["ok"],
      metadata: {},
    },
    now: new Date("2026-03-09T11:00:00.000Z"),
  });

  await orchestrator.run({
    env: {
      ...fixture.env,
      RGPT_RUNTIME_REPAIR_LEARNING_ENABLED: "false",
    },
    now: new Date("2026-03-09T11:00:10.000Z"),
  });

  const events = ledger.snapshot().map((entry) => entry.eventType);
  assert.equal(events.includes("runtime_learning_analysis_completed"), true);
  assert.equal(events.includes("runtime_learning_analysis_skipped"), true);
});

test("no-recurrence path yields bounded no recommendation", async () => {
  const fixture = await createFixture();
  const ledger = new ExecutionLedger(fixture.ledgerPath, "");
  const orchestrator = new RuntimeRepairLearningOrchestrator(ledger);

  const result = await orchestrator.run({
    env: fixture.env,
    diagnosis: {
      diagnosisId: "d4",
      detectedAt: "2026-03-09T11:30:00.000Z",
      source: "test",
      anomalyType: "queue_backlog",
      severity: "medium",
      repairable: true,
      likelyTargetType: "queue",
      likelyTargetId: "q2",
      recommendedRepairAction: "recover_queue",
      reasonCodes: ["r"],
      metadata: {},
    },
    repairAttempt: {
      attemptId: "a4",
      startedAt: "2026-03-09T11:30:00.000Z",
      completedAt: "2026-03-09T11:30:00.000Z",
      targetType: "queue",
      targetId: "q2",
      anomalyType: "queue_backlog",
      repairAction: "recover_queue",
      success: true,
      reasonCodes: ["ok"],
      metadata: {},
    },
    validation: {
      validationId: "v4",
      startedAt: "2026-03-09T11:30:00.000Z",
      completedAt: "2026-03-09T11:30:00.000Z",
      targetType: "queue",
      targetId: "q2",
      repairAction: "recover_queue",
      success: true,
      checks: [],
      reasonCodes: ["ok"],
      metadata: {},
    },
    now: new Date("2026-03-09T11:30:00.000Z"),
  });

  assert.equal(result.learningResult?.patternCategory, "none");
  assert.equal(result.learningResult?.rootCauseCategory, "none");
  assert.equal(result.learningResult?.recommendationClasses.includes("no_recommendation"), true);
});

test("integration: D21-A outputs flow into D21-B learning result", async () => {
  const fixture = await createFixture();
  const repairLedger = new ExecutionLedger(fixture.ledgerPath, "");
  const repairOrchestrator = new RuntimeRepairOrchestrator(repairLedger);

  const repair = await repairOrchestrator.run({
    env: fixture.env,
    anomalyType: "capability_timeout",
    targetId: "cap.alpha",
    now: new Date("2026-03-09T12:00:00.000Z"),
  });

  const learningLedger = new ExecutionLedger("", "");
  const learningOrchestrator = new RuntimeRepairLearningOrchestrator(learningLedger);
  const learning = await learningOrchestrator.run({
    env: fixture.env,
    diagnosis: repair.diagnosis,
    repairAttempt: repair.repairAttempt,
    validation: repair.validation,
    now: new Date("2026-03-09T12:00:30.000Z"),
  });

  assert.equal(learning.status, "analysis_completed");
  assert.equal(learning.learningResult?.anomalyType, "capability_timeout");
  assert.equal(learning.learningResult?.repairAction, "reset_capability_state");
  assert.equal(Array.isArray(learning.learningResult?.sourceEventIds), true);
});
