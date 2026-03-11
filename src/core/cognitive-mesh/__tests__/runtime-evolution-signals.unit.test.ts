import { test } from "node:test";
import * as assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ExecutionLedger } from "../runtime/execution-ledger";
import { RuntimeHealingTelemetryAggregator } from "../runtime/evolution-signals/healing-telemetry-aggregator";
import { RuntimeLearningSignalExtractor } from "../runtime/evolution-signals/learning-signal-extractor";
import { RuntimeImprovementCandidateDetector } from "../runtime/evolution-signals/improvement-candidate-detector";
import { RuntimeEvolutionSignalsOrchestrator } from "../runtime/evolution-signals/runtime-evolution-signals-orchestrator";
import { RuntimeEvolutionSignalsStateRepository } from "../runtime/evolution-signals/runtime-evolution-signals-state-repository";
import { RuntimeEvolutionSignalsAggregator } from "../runtime/evolution-signals/healing-telemetry-aggregator";
import type { RuntimeEvolutionEvidenceSignal } from "../runtime/evolution-signals/runtime-evolution-signals.types";
import { RuntimeRepairOrchestrator } from "../runtime/repair/runtime-repair-orchestrator";
import { RuntimeRepairLearningOrchestrator } from "../runtime/repair-learning/runtime-repair-learning-orchestrator";
import { RuntimeContainmentOrchestrator } from "../runtime/containment/runtime-containment-orchestrator";
import { RuntimeStabilityOrchestrator } from "../runtime/stability/runtime-stability-orchestrator";

interface Fixture {
  root: string;
  runtimeDir: string;
  meshDir: string;
  evolutionStatePath: string;
  ledgerPath: string;
  env: NodeJS.ProcessEnv;
}

async function createFixture(): Promise<Fixture> {
  const root = await mkdtemp(join(tmpdir(), "rgpt-runtime-evolution-"));
  const runtimeDir = join(root, ".rocketgpt", "runtime");
  const meshDir = join(root, ".rocketgpt", "cognitive-mesh");
  await mkdir(runtimeDir, { recursive: true });
  await mkdir(meshDir, { recursive: true });

  const evolutionStatePath = join(runtimeDir, "evolution-signals.json");
  const ledgerPath = join(meshDir, "execution-ledger.jsonl");

  const env: NodeJS.ProcessEnv = {
    RGPT_RUNTIME_ID: "rgpt-evolution-test",
    COGNITIVE_MESH_EXECUTION_LEDGER_JSONL_PATH: ledgerPath,

    RGPT_RUNTIME_EVOLUTION_SIGNALS_ENABLED: "true",
    RGPT_RUNTIME_EVOLUTION_SIGNALS_STATE_PATH: evolutionStatePath,
    RGPT_RUNTIME_EVOLUTION_LOOKBACK_MS: "3600000",
    RGPT_RUNTIME_EVOLUTION_SIGNAL_COOLDOWN_MS: "120000",
    RGPT_RUNTIME_EVOLUTION_CANDIDATE_COOLDOWN_MS: "180000",
    RGPT_RUNTIME_EVOLUTION_MAX_RECENT_SIGNALS: "30",
    RGPT_RUNTIME_EVOLUTION_MAX_ACTIVE_CANDIDATES: "20",
    RGPT_RUNTIME_EVOLUTION_MAX_EVIDENCE_EVENTS: "120",

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

    RGPT_RUNTIME_STABILITY_ENABLED: "true",
    RGPT_RUNTIME_STABILITY_STATE_PATH: join(runtimeDir, "stability-state.json"),
    RGPT_RUNTIME_STABILITY_LOOKBACK_MS: "3600000",
    RGPT_RUNTIME_STABILITY_OSCILLATION_THRESHOLD: "2",
    RGPT_RUNTIME_STABILITY_MULTI_TARGET_THRESHOLD: "2",
    RGPT_RUNTIME_STABILITY_EVALUATION_COOLDOWN_MS: "1000",
    RGPT_RUNTIME_STABILITY_MAX_EVIDENCE_EVENTS: "100",
  };

  return { root, runtimeDir, meshDir, evolutionStatePath, ledgerPath, env };
}

function sig(overrides?: Partial<RuntimeEvolutionEvidenceSignal>): RuntimeEvolutionEvidenceSignal {
  return {
    eventId: overrides?.eventId ?? `evt-${Date.now()}`,
    timestamp: overrides?.timestamp ?? "2026-03-09T17:00:00.000Z",
    eventType: overrides?.eventType ?? "runtime_repair_attempted",
    targetType: overrides?.targetType ?? "worker",
    targetId: overrides?.targetId ?? "worker-1",
    reasonCodes: overrides?.reasonCodes ?? [],
    metadata: overrides?.metadata ?? {},
  };
}

test("healing telemetry metric computation", () => {
  const aggregator = new RuntimeHealingTelemetryAggregator();
  const telemetry = aggregator.build({
    telemetryId: "t1",
    analyzedAt: "2026-03-09T17:00:00.000Z",
    evidenceWindow: {
      startAt: "2026-03-09T16:00:00.000Z",
      endAt: "2026-03-09T17:00:00.000Z",
      lookbackMs: 3600000,
    },
    signals: [
      sig({ eventType: "runtime_repair_succeeded" }),
      sig({ eventType: "runtime_repair_failed" }),
      sig({ eventType: "runtime_recovery_validation_succeeded" }),
      sig({ eventType: "runtime_recovery_validation_failed" }),
      sig({ eventType: "runtime_quarantine_applied" }),
      sig({ eventType: "runtime_reintegration_completed" }),
    ],
  });

  assert.equal(telemetry.metrics.repairSuccessRate, 0.5);
  assert.equal(telemetry.metrics.validationFailureRate, 0.5);
  assert.equal(telemetry.metrics.containmentRate > 0, true);
});

test("healing healthAssessment classification", () => {
  const aggregator = new RuntimeHealingTelemetryAggregator();
  const telemetry = aggregator.build({
    telemetryId: "t2",
    analyzedAt: "2026-03-09T17:01:00.000Z",
    evidenceWindow: {
      startAt: "2026-03-09T16:01:00.000Z",
      endAt: "2026-03-09T17:01:00.000Z",
      lookbackMs: 3600000,
    },
    signals: [
      sig({ eventType: "runtime_repair_failed" }),
      sig({ eventType: "runtime_repair_failed" }),
      sig({ eventType: "runtime_recovery_validation_failed" }),
      sig({ eventType: "runtime_reintegration_failed" }),
      sig({ eventType: "runtime_oscillation_detected" }),
      sig({ eventType: "runtime_target_retired_from_auto_reintegration" }),
    ],
  });

  assert.equal(telemetry.healthAssessment === "stressed" || telemetry.healthAssessment === "unstable", true);
});

test("learning signal extraction for significant transitions", () => {
  const extractor = new RuntimeLearningSignalExtractor();
  const signals = extractor.extract({
    now: new Date("2026-03-09T17:02:00.000Z"),
    signals: [
      sig({ eventType: "runtime_repair_attempted", metadata: { repairAction: "restart_runtime_worker" } }),
      sig({ eventType: "runtime_recovery_validation_failed" }),
      sig({ eventType: "runtime_quarantine_applied", metadata: { containmentAction: "quarantine_worker" } }),
      sig({ eventType: "runtime_reintegration_failed" }),
      sig({ eventType: "runtime_degradation_action_recommended", metadata: { degradationAction: "recommend_safe_mode_review" } }),
    ],
  });

  assert.equal(signals.length > 0, true);
  assert.equal(signals[0]!.signalSequence.includes("runtime_repair_attempted"), true);
});

test("learning signal suppression for routine healthy behavior", () => {
  const extractor = new RuntimeLearningSignalExtractor();
  const signals = extractor.extract({
    now: new Date("2026-03-09T17:03:00.000Z"),
    signals: [
      sig({ eventType: "runtime_repair_succeeded" }),
      sig({ eventType: "runtime_recovery_validation_succeeded" }),
      sig({ eventType: "runtime_stability_evaluated" }),
    ],
  });

  assert.equal(signals.length, 0);
});

test("improvement candidate detection for major supported categories", () => {
  const detector = new RuntimeImprovementCandidateDetector();
  const candidates = detector.detect({
    now: new Date("2026-03-09T17:04:00.000Z"),
    signals: [
      sig({ eventType: "runtime_repair_failed", metadata: { repairAction: "restart_runtime_worker" } }),
      sig({ eventType: "runtime_repair_failed", metadata: { repairAction: "restart_runtime_worker" } }),
      sig({ eventType: "runtime_recovery_validation_failed" }),
      sig({ eventType: "runtime_recovery_validation_failed" }),
      sig({ eventType: "runtime_quarantine_applied" }),
      sig({ eventType: "runtime_quarantine_applied" }),
      sig({ eventType: "runtime_reintegration_failed" }),
      sig({ eventType: "runtime_reintegration_failed" }),
      sig({ eventType: "runtime_oscillation_detected" }),
      sig({ eventType: "runtime_oscillation_detected" }),
    ],
  });

  assert.equal(candidates.some((item) => item.category === "repeated_ineffective_repair_strategy"), true);
  assert.equal(candidates.some((item) => item.category === "repeated_validation_failure_cluster"), true);
  assert.equal(candidates.some((item) => item.category === "persistent_oscillation_pattern"), true);
});

test("recurrence threshold behavior for candidate creation", () => {
  const detector = new RuntimeImprovementCandidateDetector();
  const oneOff = detector.detect({
    now: new Date("2026-03-09T17:05:00.000Z"),
    signals: [sig({ eventType: "runtime_repair_failed" })],
  });
  assert.equal(oneOff.length, 0);
});

test("dedupe/cooldown prevents repeated learning signal spam", async () => {
  const fixture = await createFixture();
  const orchestrator = new RuntimeEvolutionSignalsOrchestrator(new ExecutionLedger("", ""));

  const evidence = [
    sig({ eventType: "runtime_repair_attempted", metadata: { repairAction: "restart_runtime_worker" } }),
    sig({ eventType: "runtime_recovery_validation_failed" }),
  ];

  const first = await orchestrator.run({ env: fixture.env, now: new Date("2026-03-09T17:06:00.000Z"), evidenceSignals: evidence });
  const second = await orchestrator.run({ env: fixture.env, now: new Date("2026-03-09T17:06:10.000Z"), evidenceSignals: evidence });

  assert.equal(first.evaluation?.learningSignals.length === 1, true);
  assert.equal(second.evaluation?.learningSignals.length === 0, true);
});

test("dedupe/cooldown prevents repeated candidate spam", async () => {
  const fixture = await createFixture();
  const orchestrator = new RuntimeEvolutionSignalsOrchestrator(new ExecutionLedger("", ""));

  const evidence = [
    sig({ eventType: "runtime_repair_failed", metadata: { repairAction: "restart_runtime_worker" } }),
    sig({ eventType: "runtime_repair_failed", metadata: { repairAction: "restart_runtime_worker" } }),
  ];

  const first = await orchestrator.run({ env: fixture.env, now: new Date("2026-03-09T17:07:00.000Z"), evidenceSignals: evidence });
  const second = await orchestrator.run({ env: fixture.env, now: new Date("2026-03-09T17:07:10.000Z"), evidenceSignals: evidence });

  assert.equal((first.evaluation?.improvementCandidates.length ?? 0) > 0, true);
  assert.equal(second.state.activeImprovementCandidates.length >= first.state.activeImprovementCandidates.length, true);
});

test("state file update behavior", async () => {
  const fixture = await createFixture();
  const orchestrator = new RuntimeEvolutionSignalsOrchestrator(new ExecutionLedger("", ""));

  await orchestrator.run({
    env: fixture.env,
    now: new Date("2026-03-09T17:08:00.000Z"),
    evidenceSignals: [
      sig({ eventType: "runtime_repair_attempted", metadata: { repairAction: "restart_runtime_worker" } }),
      sig({ eventType: "runtime_recovery_validation_failed" }),
    ],
  });

  const repo = new RuntimeEvolutionSignalsStateRepository(fixture.evolutionStatePath);
  const state = await repo.read("rgpt-evolution-test", "2026-03-09T17:09:00.000Z");
  assert.equal(state.schemaVersion, "rgpt.runtime_evolution_signals_state.v1");
  assert.equal(typeof state.latestEvaluation?.summary.learningSignalCount, "number");
});

test("immutable evolution event emission", async () => {
  const fixture = await createFixture();
  const ledger = new ExecutionLedger("", "");
  const orchestrator = new RuntimeEvolutionSignalsOrchestrator(ledger);

  await orchestrator.run({
    env: fixture.env,
    now: new Date("2026-03-09T17:10:00.000Z"),
    evidenceSignals: [
      sig({ eventType: "runtime_repair_attempted", metadata: { repairAction: "restart_runtime_worker" } }),
      sig({ eventType: "runtime_recovery_validation_failed" }),
      sig({ eventType: "runtime_repair_failed", metadata: { repairAction: "restart_runtime_worker" } }),
      sig({ eventType: "runtime_repair_failed", metadata: { repairAction: "restart_runtime_worker" } }),
    ],
  });

  const eventTypes = ledger.snapshot().map((entry) => entry.eventType);
  assert.equal(eventTypes.includes("runtime_evolution_signals_evaluated"), true);
  assert.equal(eventTypes.includes("runtime_learning_signal_captured"), true);
  assert.equal(eventTypes.includes("runtime_improvement_candidate_detected"), true);
});

test("integration-oriented flow using D20/D21/D22 outputs as evidence", async () => {
  const fixture = await createFixture();
  const sharedLedger = new ExecutionLedger(fixture.ledgerPath, "");

  sharedLedger.append({
    category: "runtime",
    eventType: "runtime.heartbeat",
    action: "runtime.heartbeat.manual.single",
    source: "manual_heartbeat_runner",
    target: "system_heartbeat",
    status: "completed",
    ids: { requestId: "hb-evo" },
    metadata: { targetType: "runtime", targetId: "runtime-main", reasonCodes: ["HEARTBEAT"] },
    timestamp: "2026-03-09T17:20:00.000Z",
  });

  const repair = await new RuntimeRepairOrchestrator(sharedLedger).run({
    env: fixture.env,
    anomalyType: "stale_heartbeat",
    targetId: "worker-evo",
    now: new Date("2026-03-09T17:20:10.000Z"),
  });

  const learning = await new RuntimeRepairLearningOrchestrator(sharedLedger).run({
    env: fixture.env,
    diagnosis: repair.diagnosis,
    repairAttempt: repair.repairAttempt,
    validation: repair.validation,
    now: new Date("2026-03-09T17:20:20.000Z"),
  });

  await new RuntimeContainmentOrchestrator(sharedLedger).run({
    env: fixture.env,
    diagnosis: repair.diagnosis,
    repairAttempt: repair.repairAttempt,
    validation: repair.validation,
    learningResult: learning.learningResult,
    targetType: "worker",
    targetId: "worker-evo",
    evidenceEvents: [
      {
        eventId: "ce1",
        timestamp: "2026-03-09T17:20:21.000Z",
        eventType: "runtime_repair_failed",
        targetType: "worker",
        targetId: "worker-evo",
        anomalyType: "stale_heartbeat",
        repairAction: "restart_runtime_worker",
        repairSuccess: false,
        validationSuccess: false,
        recommendationClasses: [],
        reasonCodes: ["X"],
      },
      {
        eventId: "ce2",
        timestamp: "2026-03-09T17:20:22.000Z",
        eventType: "runtime_repair_failed",
        targetType: "worker",
        targetId: "worker-evo",
        anomalyType: "stale_heartbeat",
        repairAction: "restart_runtime_worker",
        repairSuccess: false,
        validationSuccess: false,
        recommendationClasses: [],
        reasonCodes: ["X"],
      },
    ],
    now: new Date("2026-03-09T17:20:23.000Z"),
  });

  await new RuntimeStabilityOrchestrator(sharedLedger).run({
    env: fixture.env,
    now: new Date("2026-03-09T17:20:30.000Z"),
  });

  const result = await new RuntimeEvolutionSignalsOrchestrator(sharedLedger).run({
    env: fixture.env,
    now: new Date("2026-03-09T17:20:40.000Z"),
  });

  assert.equal(result.evaluation !== null, true);
  assert.equal(typeof result.evaluation?.summary.improvementCandidateCount, "number");
  assert.equal(Array.isArray(result.evaluation?.learningSignals), true);
});

test("unchanged healing assessment suppression behavior", async () => {
  const fixture = await createFixture();
  const ledger = new ExecutionLedger("", "");
  const orchestrator = new RuntimeEvolutionSignalsOrchestrator(ledger);

  const evidence = [
    sig({ eventType: "runtime_repair_succeeded" }),
    sig({ eventType: "runtime_recovery_validation_succeeded" }),
  ];

  await orchestrator.run({ env: fixture.env, now: new Date("2026-03-09T17:30:00.000Z"), evidenceSignals: evidence });
  await orchestrator.run({ env: fixture.env, now: new Date("2026-03-09T17:31:00.000Z"), evidenceSignals: evidence });

  const healingEvents = ledger
    .snapshot()
    .filter((entry) => entry.eventType === "runtime_healing_telemetry_evaluated");
  assert.equal(healingEvents.length, 1);

  const stateRaw = JSON.parse(await readFile(fixture.evolutionStatePath, "utf8")) as Record<string, unknown>;
  assert.equal(stateRaw.schemaVersion, "rgpt.runtime_evolution_signals_state.v1");
});

test("evolution aggregator ingests hybrid/manual heartbeat intent from runtime.guard.evaluated entries", async () => {
  const fixture = await createFixture();
  await writeFile(
    fixture.ledgerPath,
    `${JSON.stringify({
      entryId: "exec_hb_evolution",
      timestamp: "2026-03-09T17:40:00.000Z",
      category: "runtime",
      eventType: "runtime.guard.evaluated",
      action: "runtime.heartbeat.manual.single",
      source: "manual_heartbeat_runner",
      target: "system_heartbeat",
      ids: { requestId: "hb-evo-compat" },
      mode: "normal",
      status: "completed",
      metadata: {
        heartbeat: {
          runtime_id: "rgpt-evolution-test",
        },
      },
    })}\n`,
    "utf8"
  );

  const signals = await new RuntimeEvolutionSignalsAggregator().collect(
    {
      enabled: true,
      lookbackMs: 3_600_000,
      signalCooldownMs: 60_000,
      candidateCooldownMs: 60_000,
      maxRecentSignals: 30,
      maxActiveCandidates: 20,
      maxEvidenceEvents: 20,
      statePath: fixture.evolutionStatePath,
      ledgerPath: fixture.ledgerPath,
    },
    new Date("2026-03-09T17:40:30.000Z")
  );

  assert.equal(signals.length, 1);
  assert.equal(signals[0]!.eventType, "runtime.heartbeat");
});
