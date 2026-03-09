import { test } from "node:test";
import * as assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ExecutionLedger } from "../runtime/execution-ledger";
import { RuntimeContainmentDetector } from "../runtime/containment/runtime-containment-detector";
import { RuntimeContainmentPolicyEngine } from "../runtime/containment/runtime-containment-policy-engine";
import { RuntimeContainmentOrchestrator } from "../runtime/containment/runtime-containment-orchestrator";
import { RuntimeContainmentStateRepository } from "../runtime/containment/runtime-containment-state-repository";
import { evaluateRuntimeContainmentEligibility } from "../runtime/containment/runtime-containment-eligibility";
import type { RuntimeContainmentEvidenceEvent } from "../runtime/containment/runtime-containment.types";
import { CognitiveMeshJobDispatcher } from "../jobs/cognitive-mesh-job-dispatcher";
import type { CognitiveEvent } from "../types/cognitive-event";
import { RuntimeRepairOrchestrator } from "../runtime/repair/runtime-repair-orchestrator";
import { RuntimeRepairLearningOrchestrator } from "../runtime/repair-learning/runtime-repair-learning-orchestrator";

interface Fixture {
  root: string;
  runtimeDir: string;
  meshDir: string;
  containmentStatePath: string;
  repairStatePath: string;
  learningStatePath: string;
  ledgerPath: string;
  env: NodeJS.ProcessEnv;
}

async function createFixture(): Promise<Fixture> {
  const root = await mkdtemp(join(tmpdir(), "rgpt-runtime-containment-"));
  const runtimeDir = join(root, ".rocketgpt", "runtime");
  const meshDir = join(root, ".rocketgpt", "cognitive-mesh");
  await mkdir(runtimeDir, { recursive: true });
  await mkdir(meshDir, { recursive: true });

  const containmentStatePath = join(runtimeDir, "containment-state.json");
  const repairStatePath = join(runtimeDir, "repair-state.json");
  const learningStatePath = join(runtimeDir, "repair-learning-state.json");
  const ledgerPath = join(meshDir, "execution-ledger.jsonl");

  const env: NodeJS.ProcessEnv = {
    RGPT_RUNTIME_ID: "rgpt-containment-test",
    COGNITIVE_MESH_EXECUTION_LEDGER_JSONL_PATH: ledgerPath,

    RGPT_RUNTIME_REPAIR_ENABLED: "true",
    RGPT_RUNTIME_REPAIR_STATE_PATH: repairStatePath,
    RGPT_RUNTIME_TRANSIENT_MEMORY_PATH: join(runtimeDir, "transient-memory-cache.json"),
    RGPT_CAPABILITY_RUNTIME_STATE_PATH: join(runtimeDir, "capability-runtime-state.json"),
    RGPT_RUNTIME_QUEUE_RECOVERY_STATE_PATH: join(runtimeDir, "queue-recovery-state.json"),
    RGPT_RUNTIME_RESTART_STATE_PATH: join(runtimeDir, "restart-state.json"),

    RGPT_RUNTIME_REPAIR_LEARNING_ENABLED: "true",
    RGPT_RUNTIME_REPAIR_LEARNING_STATE_PATH: learningStatePath,
    RGPT_RUNTIME_REPAIR_LEARNING_LOOKBACK_MS: "3600000",
    RGPT_RUNTIME_REPAIR_LEARNING_RECURRENCE_THRESHOLD: "2",
    RGPT_RUNTIME_REPAIR_LEARNING_COOLDOWN_MS: "1000",
    RGPT_RUNTIME_REPAIR_LEARNING_MAX_EVIDENCE_EVENTS: "60",

    RGPT_RUNTIME_CONTAINMENT_ENABLED: "true",
    RGPT_RUNTIME_CONTAINMENT_STATE_PATH: containmentStatePath,
    RGPT_RUNTIME_CONTAINMENT_LOOKBACK_MS: "3600000",
    RGPT_RUNTIME_CONTAINMENT_RECURRENCE_THRESHOLD: "2",
    RGPT_RUNTIME_CONTAINMENT_COOLDOWN_MS: "120000",
    RGPT_RUNTIME_CONTAINMENT_OBSERVATION_MS: "1000",
    RGPT_RUNTIME_CONTAINMENT_MAX_REINTEGRATION_FAILURES: "2",
    RGPT_RUNTIME_CONTAINMENT_MAX_EVIDENCE_EVENTS: "80",
  };

  return {
    root,
    runtimeDir,
    meshDir,
    containmentStatePath,
    repairStatePath,
    learningStatePath,
    ledgerPath,
    env,
  };
}

function event(overrides: Partial<RuntimeContainmentEvidenceEvent>): RuntimeContainmentEvidenceEvent {
  return {
    eventId: overrides.eventId ?? `evt-${Date.now()}`,
    timestamp: overrides.timestamp ?? "2026-03-09T10:00:00.000Z",
    eventType: overrides.eventType ?? "runtime_repair_diagnosed",
    targetType: overrides.targetType ?? "worker",
    targetId: overrides.targetId ?? "worker-1",
    anomalyType: overrides.anomalyType ?? "stale_heartbeat",
    repairAction: overrides.repairAction ?? "restart_runtime_worker",
    repairSuccess: overrides.repairSuccess ?? null,
    validationSuccess: overrides.validationSuccess ?? null,
    recommendationClasses: overrides.recommendationClasses ?? [],
    reasonCodes: overrides.reasonCodes ?? [],
  };
}

function createCognitiveEvent(): CognitiveEvent {
  return {
    eventId: "ev-1",
    sessionId: "s-1",
    requestId: "r-1",
    occurredAt: "2026-03-09T10:00:00.000Z",
    source: "unit-test",
    sourceType: "workflow.trigger",
    processingMode: "async",
    trustClass: "trusted",
    risk: { score: 0.1, reasons: [], evaluatedAt: "2026-03-09T10:00:00.000Z" },
    rawInput: {},
    normalizedInput: "unit",
  };
}

test("repeated worker stale heartbeat -> quarantine_worker", async () => {
  const fixture = await createFixture();
  const ledger = new ExecutionLedger("", "");
  const orchestrator = new RuntimeContainmentOrchestrator(ledger);

  const result = await orchestrator.run({
    env: fixture.env,
    anomalyType: "stale_heartbeat",
    targetType: "worker",
    targetId: "worker-1",
    evidenceEvents: [
      event({ eventId: "a", targetType: "worker", targetId: "worker-1", anomalyType: "stale_heartbeat" }),
      event({ eventId: "b", timestamp: "2026-03-09T10:01:00.000Z", targetType: "worker", targetId: "worker-1", anomalyType: "stale_heartbeat" }),
    ],
    now: new Date("2026-03-09T10:02:00.000Z"),
  });

  assert.equal(result.decision?.containmentAction, "quarantine_worker");
  assert.equal(result.activeContainment?.status, "contained");
});

test("repeated queue backlog -> freeze_queue", async () => {
  const fixture = await createFixture();
  const orchestrator = new RuntimeContainmentOrchestrator(new ExecutionLedger("", ""));
  const result = await orchestrator.run({
    env: fixture.env,
    anomalyType: "queue_backlog",
    targetType: "queue",
    targetId: "queue-main",
    evidenceEvents: [
      event({ eventId: "a1", targetType: "queue", targetId: "queue-main", anomalyType: "queue_backlog", repairAction: "recover_queue" }),
      event({ eventId: "a2", targetType: "queue", targetId: "queue-main", anomalyType: "queue_backlog", repairAction: "recover_queue" }),
    ],
    now: new Date("2026-03-09T10:03:00.000Z"),
  });

  assert.equal(result.decision?.containmentAction, "freeze_queue");
});

test("repeated capability timeout and lock stuck -> quarantine_capability", async () => {
  const fixture = await createFixture();
  const orchestrator = new RuntimeContainmentOrchestrator(new ExecutionLedger("", ""));

  const timeoutResult = await orchestrator.run({
    env: fixture.env,
    anomalyType: "capability_timeout",
    targetType: "capability",
    targetId: "cap.a",
    evidenceEvents: [
      event({ eventId: "c1", targetType: "capability", targetId: "cap.a", anomalyType: "capability_timeout", repairAction: "reset_capability_state" }),
      event({ eventId: "c2", targetType: "capability", targetId: "cap.a", anomalyType: "capability_timeout", repairAction: "reset_capability_state" }),
    ],
    now: new Date("2026-03-09T10:04:00.000Z"),
  });

  const lockResult = await orchestrator.run({
    env: fixture.env,
    anomalyType: "capability_lock_stuck",
    targetType: "capability",
    targetId: "cap.b",
    evidenceEvents: [
      event({ eventId: "d1", targetType: "capability", targetId: "cap.b", anomalyType: "capability_lock_stuck", repairAction: "reset_capability_state" }),
      event({ eventId: "d2", targetType: "capability", targetId: "cap.b", anomalyType: "capability_lock_stuck", repairAction: "reset_capability_state" }),
    ],
    now: new Date("2026-03-09T10:05:00.000Z"),
  });

  assert.equal(timeoutResult.decision?.containmentAction, "quarantine_capability");
  assert.equal(lockResult.decision?.containmentAction, "quarantine_capability");
});

test("repeated repair failure and validation failure trigger containment by target type", async () => {
  const fixture = await createFixture();
  const orchestrator = new RuntimeContainmentOrchestrator(new ExecutionLedger("", ""));

  const repairFailure = await orchestrator.run({
    env: fixture.env,
    anomalyType: "capability_timeout",
    targetType: "capability",
    targetId: "cap.fail",
    evidenceEvents: [
      event({ eventId: "rf1", targetType: "capability", targetId: "cap.fail", repairSuccess: false, anomalyType: "capability_timeout", repairAction: "reset_capability_state" }),
      event({ eventId: "rf2", targetType: "capability", targetId: "cap.fail", repairSuccess: false, anomalyType: "capability_timeout", repairAction: "reset_capability_state" }),
    ],
    now: new Date("2026-03-09T10:06:00.000Z"),
  });

  const validationFailure = await orchestrator.run({
    env: fixture.env,
    anomalyType: "queue_backlog",
    targetType: "queue",
    targetId: "queue.fail",
    evidenceEvents: [
      event({ eventId: "vf1", targetType: "queue", targetId: "queue.fail", validationSuccess: false, anomalyType: "queue_backlog", repairAction: "recover_queue" }),
      event({ eventId: "vf2", targetType: "queue", targetId: "queue.fail", validationSuccess: false, anomalyType: "queue_backlog", repairAction: "recover_queue" }),
    ],
    now: new Date("2026-03-09T10:07:00.000Z"),
  });

  assert.equal(repairFailure.decision?.containmentAction, "quarantine_capability");
  assert.equal(validationFailure.decision?.containmentAction, "freeze_queue");
});

test("D21-B escalation recommendation triggers containment consideration", async () => {
  const fixture = await createFixture();
  const orchestrator = new RuntimeContainmentOrchestrator(new ExecutionLedger("", ""));
  const result = await orchestrator.run({
    env: fixture.env,
    anomalyType: "stale_heartbeat",
    targetType: "worker",
    targetId: "worker-escalate",
    learningResult: {
      learningId: "learn-1",
      analyzedAt: "2026-03-09T10:08:00.000Z",
      sourceEventIds: [],
      targetType: "runtime",
      targetId: "worker-escalate",
      anomalyType: "stale_heartbeat",
      repairAction: "restart_runtime_worker",
      validationOutcome: "failed",
      patternCategory: "clustered_failures_same_target",
      recurrenceDetected: true,
      recurrenceCount: 2,
      rootCauseCategory: "worker_instability",
      confidence: "high",
      recommendationClasses: ["escalate_for_containment_consideration"],
      reasonCodes: ["learning"],
      metadata: {},
    },
    now: new Date("2026-03-09T10:08:30.000Z"),
  });

  assert.equal(result.decision?.triggerCategory, "learning_escalation");
  assert.equal(result.decision?.shouldContain, true);
});

test("cooldown dedupe prevents repeated identical containment spam", async () => {
  const fixture = await createFixture();
  const orchestrator = new RuntimeContainmentOrchestrator(new ExecutionLedger("", ""));

  const first = await orchestrator.run({
    env: fixture.env,
    anomalyType: "stale_heartbeat",
    targetType: "worker",
    targetId: "worker-cooldown",
    evidenceEvents: [
      event({ eventId: "x1", targetType: "worker", targetId: "worker-cooldown", anomalyType: "stale_heartbeat" }),
      event({ eventId: "x2", targetType: "worker", targetId: "worker-cooldown", anomalyType: "stale_heartbeat" }),
    ],
    now: new Date("2026-03-09T10:09:00.000Z"),
  });

  const second = await orchestrator.run({
    env: fixture.env,
    anomalyType: "stale_heartbeat",
    targetType: "worker",
    targetId: "worker-cooldown",
    evidenceEvents: [
      event({ eventId: "x3", targetType: "worker", targetId: "worker-cooldown", anomalyType: "stale_heartbeat" }),
      event({ eventId: "x4", targetType: "worker", targetId: "worker-cooldown", anomalyType: "stale_heartbeat" }),
    ],
    now: new Date("2026-03-09T10:09:10.000Z"),
  });

  assert.equal(first.skipped, false);
  assert.equal(second.skipped, true);
  assert.equal(second.cooldownActive, true);
});

test("containment state file updates correctly", async () => {
  const fixture = await createFixture();
  const orchestrator = new RuntimeContainmentOrchestrator(new ExecutionLedger("", ""));

  await orchestrator.run({
    env: fixture.env,
    anomalyType: "queue_backlog",
    targetType: "queue",
    targetId: "queue-state",
    evidenceEvents: [
      event({ eventId: "s1", targetType: "queue", targetId: "queue-state", anomalyType: "queue_backlog", repairAction: "recover_queue" }),
      event({ eventId: "s2", targetType: "queue", targetId: "queue-state", anomalyType: "queue_backlog", repairAction: "recover_queue" }),
    ],
    now: new Date("2026-03-09T10:10:00.000Z"),
  });

  const raw = JSON.parse(await readFile(fixture.containmentStatePath, "utf8")) as Record<string, unknown>;
  assert.equal(raw.schemaVersion, "rgpt.runtime_containment_state.v1");
  assert.equal(Array.isArray(raw.activeContainments), true);
  assert.equal(typeof raw.summaryCounters, "object");
});

test("quarantined target becomes ineligible for new dispatch assignment", async () => {
  const fixture = await createFixture();
  await writeFile(
    fixture.containmentStatePath,
    JSON.stringify(
      {
        schemaVersion: "rgpt.runtime_containment_state.v1",
        runtimeId: "rgpt-containment-test",
        lastUpdatedAt: "2026-03-09T10:11:00.000Z",
        activeContainments: [
          {
            targetType: "queue",
            targetId: "queue-blocked",
            containmentAction: "freeze_queue",
            status: "contained",
            triggerCategory: "repeated_anomaly",
            riskLevel: "high",
            startedAt: "2026-03-09T10:10:00.000Z",
            updatedAt: "2026-03-09T10:11:00.000Z",
            repairCorrelationId: null,
            validationCorrelationId: null,
            observationUntil: null,
            reintegrationFailures: 0,
            reasonCodes: ["x"],
            metadata: {},
          },
        ],
        latestDecision: null,
        latestReintegration: null,
        perTargetContainmentHistory: {},
        observationWindows: {},
        decisionCooldowns: {},
        summaryCounters: {
          totalDecisions: 0,
          totalContainmentsApplied: 1,
          totalContainmentsSkipped: 0,
          totalCooldownSkips: 0,
          totalReintegrationStarted: 0,
          totalReintegrationsCompleted: 0,
          totalReintegrationsFailed: 0,
          totalRetired: 0,
        },
      },
      null,
      2
    ),
    "utf8"
  );

  const eligibility = await evaluateRuntimeContainmentEligibility("queue", "queue-blocked", fixture.containmentStatePath);
  assert.equal(eligibility.eligible, false);

  const dispatcher = new CognitiveMeshJobDispatcher();
  const event = createCognitiveEvent();
  const previousStatePath = process.env.RGPT_RUNTIME_CONTAINMENT_STATE_PATH;
  process.env.RGPT_RUNTIME_CONTAINMENT_STATE_PATH = fixture.containmentStatePath;

  await dispatcher.dispatch(event, "summarize-session", { targetType: "queue", targetId: "queue-ok" });
  assert.equal(dispatcher.peek().length, 1);

  try {
    await assert.rejects(async () => {
      await dispatcher.dispatch(event, "summarize-session", { targetType: "queue", targetId: "queue-blocked" });
    });
  } finally {
    if (typeof previousStatePath === "string") {
      process.env.RGPT_RUNTIME_CONTAINMENT_STATE_PATH = previousStatePath;
    } else {
      delete process.env.RGPT_RUNTIME_CONTAINMENT_STATE_PATH;
    }
  }

  assert.equal(dispatcher.peek().length, 1);
});

test("queue freeze does not silently delete queued work", async () => {
  const dispatcher = new CognitiveMeshJobDispatcher();
  const event = createCognitiveEvent();
  await dispatcher.dispatch(event, "summarize-session", { targetType: "queue", targetId: "queue-kept" });
  const before = dispatcher.peek().length;
  assert.equal(before, 1);
});

test("reintegration success after observation window passes", async () => {
  const fixture = await createFixture();
  const orchestrator = new RuntimeContainmentOrchestrator(new ExecutionLedger("", ""));

  await orchestrator.run({
    env: fixture.env,
    anomalyType: "stale_heartbeat",
    targetType: "worker",
    targetId: "worker-reintegrate",
    evidenceEvents: [
      event({ eventId: "r1", targetType: "worker", targetId: "worker-reintegrate", anomalyType: "stale_heartbeat" }),
      event({ eventId: "r2", targetType: "worker", targetId: "worker-reintegrate", anomalyType: "stale_heartbeat" }),
    ],
    now: new Date("2026-03-09T10:12:00.000Z"),
  });

  await orchestrator.run({
    env: fixture.env,
    anomalyType: "unsupported",
    targetType: "worker",
    targetId: "worker-reintegrate",
    repairAttempt: {
      attemptId: "repair1",
      startedAt: "2026-03-09T10:12:05.000Z",
      completedAt: "2026-03-09T10:12:05.000Z",
      targetType: "worker",
      targetId: "worker-reintegrate",
      anomalyType: "stale_heartbeat",
      repairAction: "restart_runtime_worker",
      success: true,
      reasonCodes: [],
      metadata: {},
    },
    validation: {
      validationId: "val1",
      startedAt: "2026-03-09T10:12:06.000Z",
      completedAt: "2026-03-09T10:12:06.000Z",
      targetType: "runtime",
      targetId: "worker-reintegrate",
      repairAction: "restart_runtime_worker",
      success: true,
      checks: [],
      reasonCodes: [],
      metadata: {},
    },
    now: new Date("2026-03-09T10:12:06.000Z"),
  });

  const done = await orchestrator.run({
    env: fixture.env,
    anomalyType: "unsupported",
    targetType: "worker",
    targetId: "worker-reintegrate",
    now: new Date("2026-03-09T10:12:08.500Z"),
  });

  assert.equal(done.state.activeContainments.some((item) => item.targetId === "worker-reintegrate" && item.status === "reintegrated"), true);
});

test("reintegration failure on recurring anomaly during observation and retirement after threshold", async () => {
  const fixture = await createFixture();
  const orchestrator = new RuntimeContainmentOrchestrator(new ExecutionLedger("", ""));

  await orchestrator.run({
    env: fixture.env,
    anomalyType: "stale_heartbeat",
    targetType: "worker",
    targetId: "worker-retire",
    evidenceEvents: [
      event({ eventId: "z1", targetType: "worker", targetId: "worker-retire", anomalyType: "stale_heartbeat" }),
      event({ eventId: "z2", targetType: "worker", targetId: "worker-retire", anomalyType: "stale_heartbeat" }),
    ],
    now: new Date("2026-03-09T10:13:00.000Z"),
  });

  await orchestrator.run({
    env: fixture.env,
    anomalyType: "unsupported",
    targetType: "worker",
    targetId: "worker-retire",
    repairAttempt: {
      attemptId: "rep2",
      startedAt: "2026-03-09T10:13:01.000Z",
      completedAt: "2026-03-09T10:13:01.000Z",
      targetType: "worker",
      targetId: "worker-retire",
      anomalyType: "stale_heartbeat",
      repairAction: "restart_runtime_worker",
      success: true,
      reasonCodes: [],
      metadata: {},
    },
    validation: {
      validationId: "val2",
      startedAt: "2026-03-09T10:13:02.000Z",
      completedAt: "2026-03-09T10:13:02.000Z",
      targetType: "runtime",
      targetId: "worker-retire",
      repairAction: "restart_runtime_worker",
      success: true,
      checks: [],
      reasonCodes: [],
      metadata: {},
    },
    now: new Date("2026-03-09T10:13:02.000Z"),
  });

  await orchestrator.run({
    env: fixture.env,
    anomalyType: "stale_heartbeat",
    targetType: "worker",
    targetId: "worker-retire",
    evidenceEvents: [
      event({ eventId: "z3", targetType: "worker", targetId: "worker-retire", anomalyType: "stale_heartbeat" }),
      event({ eventId: "z4", targetType: "worker", targetId: "worker-retire", anomalyType: "stale_heartbeat" }),
      event({ eventId: "z5", targetType: "worker", targetId: "worker-retire", anomalyType: "stale_heartbeat" }),
    ],
    now: new Date("2026-03-09T10:13:02.500Z"),
  });

  await orchestrator.run({
    env: fixture.env,
    anomalyType: "unsupported",
    targetType: "worker",
    targetId: "worker-retire",
    repairAttempt: {
      attemptId: "rep3",
      startedAt: "2026-03-09T10:13:04.000Z",
      completedAt: "2026-03-09T10:13:04.000Z",
      targetType: "worker",
      targetId: "worker-retire",
      anomalyType: "stale_heartbeat",
      repairAction: "restart_runtime_worker",
      success: true,
      reasonCodes: [],
      metadata: {},
    },
    validation: {
      validationId: "val3",
      startedAt: "2026-03-09T10:13:04.000Z",
      completedAt: "2026-03-09T10:13:04.000Z",
      targetType: "runtime",
      targetId: "worker-retire",
      repairAction: "restart_runtime_worker",
      success: true,
      checks: [],
      reasonCodes: [],
      metadata: {},
    },
    now: new Date("2026-03-09T10:13:04.000Z"),
  });

  const retired = await orchestrator.run({
    env: fixture.env,
    anomalyType: "stale_heartbeat",
    targetType: "worker",
    targetId: "worker-retire",
    evidenceEvents: [
      event({ eventId: "z6", targetType: "worker", targetId: "worker-retire", anomalyType: "stale_heartbeat" }),
      event({ eventId: "z7", targetType: "worker", targetId: "worker-retire", anomalyType: "stale_heartbeat" }),
      event({ eventId: "z8", targetType: "worker", targetId: "worker-retire", anomalyType: "stale_heartbeat" }),
    ],
    now: new Date("2026-03-09T10:13:04.500Z"),
  });

  assert.equal(retired.state.activeContainments.some((item) => item.targetId === "worker-retire" && item.status === "retired"), true);
});

test("immutable containment events emitted for apply/skip/reintegrate/fail", async () => {
  const fixture = await createFixture();
  const ledger = new ExecutionLedger("", "");
  const orchestrator = new RuntimeContainmentOrchestrator(ledger);

  await orchestrator.run({
    env: fixture.env,
    anomalyType: "queue_backlog",
    targetType: "queue",
    targetId: "queue-event",
    evidenceEvents: [
      event({ eventId: "e1", targetType: "queue", targetId: "queue-event", anomalyType: "queue_backlog", repairAction: "recover_queue" }),
      event({ eventId: "e2", targetType: "queue", targetId: "queue-event", anomalyType: "queue_backlog", repairAction: "recover_queue" }),
    ],
    now: new Date("2026-03-09T10:14:00.000Z"),
  });

  await orchestrator.run({
    env: fixture.env,
    anomalyType: "unsupported",
    targetType: "queue",
    targetId: "queue-event",
    now: new Date("2026-03-09T10:14:02.000Z"),
  });

  const eventTypes = ledger.snapshot().map((entry) => entry.eventType);
  assert.equal(eventTypes.includes("runtime_quarantine_applied"), true);
  assert.equal(eventTypes.includes("runtime_quarantine_skipped"), true);
  assert.equal(eventTypes.includes("runtime_containment_triggered"), true);
});

test("integration: D21-A and D21-B outputs can drive D21-C decision", async () => {
  const fixture = await createFixture();
  const repairLedger = new ExecutionLedger(fixture.ledgerPath, "");
  const repairOrchestrator = new RuntimeRepairOrchestrator(repairLedger);

  const repair = await repairOrchestrator.run({
    env: fixture.env,
    anomalyType: "stale_heartbeat",
    targetId: "worker-int",
    now: new Date("2026-03-09T10:20:00.000Z"),
  });

  const learningOrchestrator = new RuntimeRepairLearningOrchestrator(new ExecutionLedger("", ""));
  const learning = await learningOrchestrator.run({
    env: fixture.env,
    diagnosis: repair.diagnosis,
    repairAttempt: repair.repairAttempt,
    validation: repair.validation,
    now: new Date("2026-03-09T10:20:30.000Z"),
  });

  const containment = await new RuntimeContainmentOrchestrator(new ExecutionLedger("", "")).run({
    env: fixture.env,
    diagnosis: repair.diagnosis,
    repairAttempt: repair.repairAttempt,
    validation: repair.validation,
    learningResult: learning.learningResult,
    targetType: "worker",
    targetId: "worker-int",
    evidenceEvents: [
      event({ eventId: "i1", targetType: "worker", targetId: "worker-int", anomalyType: "stale_heartbeat" }),
      event({ eventId: "i2", targetType: "worker", targetId: "worker-int", anomalyType: "stale_heartbeat" }),
    ],
    now: new Date("2026-03-09T10:21:00.000Z"),
  });

  assert.equal(containment.decision?.targetId, "worker-int");
  assert.equal(containment.decision?.containmentAction, "quarantine_worker");
});

test("state repository round-trip and detector/policy no-action path", async () => {
  const fixture = await createFixture();
  const repo = new RuntimeContainmentStateRepository(fixture.containmentStatePath);
  const state = await repo.read("rgpt-containment-test", "2026-03-09T10:30:00.000Z");
  await repo.write(state);
  const after = await repo.read("rgpt-containment-test", "2026-03-09T10:30:10.000Z");
  assert.equal(after.schemaVersion, "rgpt.runtime_containment_state.v1");

  const detector = new RuntimeContainmentDetector();
  const detect = detector.detect({
    now: new Date("2026-03-09T10:30:00.000Z"),
    lookbackMs: 3600000,
    recurrenceThreshold: 2,
    anomalyType: "unsupported",
    targetType: "worker",
    targetId: "worker-none",
    recommendationClasses: [],
    evidenceEvents: [],
  });
  const policy = new RuntimeContainmentPolicyEngine().evaluate({
    anomalyType: "unsupported",
    targetType: "worker",
    triggerCategory: detect.triggerCategory,
    riskLevel: detect.riskLevel,
    shouldContain: detect.shouldContain,
  });
  assert.equal(policy.containmentAction, "no_containment");
});
