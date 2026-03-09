import { createHash } from "node:crypto";
import { hostname } from "node:os";
import { getExecutionLedger, type ExecutionLedger } from "../execution-ledger";
import { RuntimeHealingTelemetryAggregator, RuntimeEvolutionSignalsAggregator } from "./healing-telemetry-aggregator";
import { RuntimeImprovementCandidateDetector } from "./improvement-candidate-detector";
import { RuntimeLearningSignalExtractor } from "./learning-signal-extractor";
import { emitRuntimeEvolutionSignalsLedgerEvent } from "./runtime-evolution-signals-event-emitter";
import {
  RuntimeEvolutionSignalsStateRepository,
  createInitialRuntimeEvolutionSignalsState,
} from "./runtime-evolution-signals-state-repository";
import type {
  RuntimeEvolutionEvaluation,
  RuntimeEvolutionEvidenceSignal,
  RuntimeEvolutionSignalsConfig,
  RuntimeEvolutionSignalsCycleResult,
  RuntimeEvolutionSignalsOrchestratorInput,
  RuntimeEvolutionSignalsStateSurface,
  RuntimeHealingAssessment,
  RuntimeImprovementCandidate,
  RuntimeLearningSignal,
} from "./runtime-evolution-signals.types";

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") {
    return false;
  }
  return fallback;
}

function parseNumber(value: string | undefined, fallback: number, min: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.floor(parsed));
}

function hashId(prefix: string, material: unknown): string {
  const digest = createHash("sha256").update(JSON.stringify(material)).digest("hex").slice(0, 20);
  return `${prefix}_${digest}`;
}

function resolveRuntimeId(inputRuntimeId: string | undefined, env: NodeJS.ProcessEnv): string {
  if (inputRuntimeId && inputRuntimeId.trim().length > 0) {
    return inputRuntimeId.trim();
  }
  if (env.RGPT_RUNTIME_ID && env.RGPT_RUNTIME_ID.trim().length > 0) {
    return env.RGPT_RUNTIME_ID.trim();
  }
  return `rgpt-${hostname().toLowerCase()}`;
}

function resolveConfig(env: NodeJS.ProcessEnv): RuntimeEvolutionSignalsConfig {
  return {
    enabled: parseBoolean(env.RGPT_RUNTIME_EVOLUTION_SIGNALS_ENABLED, true),
    lookbackMs: parseNumber(env.RGPT_RUNTIME_EVOLUTION_LOOKBACK_MS, 60 * 60 * 1000, 1000),
    signalCooldownMs: parseNumber(env.RGPT_RUNTIME_EVOLUTION_SIGNAL_COOLDOWN_MS, 120_000, 1000),
    candidateCooldownMs: parseNumber(env.RGPT_RUNTIME_EVOLUTION_CANDIDATE_COOLDOWN_MS, 300_000, 1000),
    maxRecentSignals: parseNumber(env.RGPT_RUNTIME_EVOLUTION_MAX_RECENT_SIGNALS, 60, 5),
    maxActiveCandidates: parseNumber(env.RGPT_RUNTIME_EVOLUTION_MAX_ACTIVE_CANDIDATES, 40, 5),
    maxEvidenceEvents: parseNumber(env.RGPT_RUNTIME_EVOLUTION_MAX_EVIDENCE_EVENTS, 250, 20),
    statePath: env.RGPT_RUNTIME_EVOLUTION_SIGNALS_STATE_PATH ?? ".rocketgpt/runtime/evolution-signals.json",
    ledgerPath: env.COGNITIVE_MESH_EXECUTION_LEDGER_JSONL_PATH ?? ".rocketgpt/cognitive-mesh/execution-ledger.jsonl",
  };
}

function assessmentCounterKey(assessment: RuntimeHealingAssessment): keyof RuntimeEvolutionSignalsStateSurface["summaryCounters"] {
  if (assessment === "healthy") {
    return "totalHealingAssessmentsHealthy";
  }
  if (assessment === "watch") {
    return "totalHealingAssessmentsWatch";
  }
  if (assessment === "stressed") {
    return "totalHealingAssessmentsStressed";
  }
  return "totalHealingAssessmentsUnstable";
}

function signalDedupeKey(signal: RuntimeLearningSignal): string {
  return `${signal.targetType}:${signal.targetId}:${signal.decisionTaken}:${signal.outcome}:${signal.recurrenceContext}`;
}

function candidateDedupeKey(candidate: RuntimeImprovementCandidate): string {
  return `${candidate.targetType}:${candidate.targetId}:${candidate.category}:${candidate.severity}`;
}

function severityRank(severity: RuntimeImprovementCandidate["severity"]): number {
  if (severity === "high") {
    return 3;
  }
  if (severity === "medium") {
    return 2;
  }
  return 1;
}

function metricHash(telemetry: RuntimeEvolutionEvaluation["healingTelemetry"]): string {
  const rounded = Object.fromEntries(
    Object.entries(telemetry.metrics).map(([key, value]) => [key, Number(value.toFixed(3))])
  );
  return createHash("sha256").update(JSON.stringify(rounded)).digest("hex").slice(0, 24);
}

function dominantRiskAreas(candidates: RuntimeImprovementCandidate[]): string[] {
  const counts = new Map<string, number>();
  for (const candidate of candidates) {
    counts.set(candidate.category, (counts.get(candidate.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category]) => category);
}

function notableTargets(candidates: RuntimeImprovementCandidate[], learningSignals: RuntimeLearningSignal[]): string[] {
  const targetSet = new Set<string>();
  for (const candidate of candidates) {
    targetSet.add(`${candidate.targetType}:${candidate.targetId}`);
  }
  for (const signal of learningSignals.slice(0, 5)) {
    targetSet.add(`${signal.targetType}:${signal.targetId}`);
  }
  return [...targetSet].slice(0, 8);
}

export class RuntimeEvolutionSignalsOrchestrator {
  private readonly aggregator = new RuntimeEvolutionSignalsAggregator();
  private readonly healingTelemetryAggregator = new RuntimeHealingTelemetryAggregator();
  private readonly learningSignalExtractor = new RuntimeLearningSignalExtractor();
  private readonly candidateDetector = new RuntimeImprovementCandidateDetector();

  constructor(private readonly ledger: ExecutionLedger = getExecutionLedger()) {}

  async run(input: RuntimeEvolutionSignalsOrchestratorInput = {}): Promise<RuntimeEvolutionSignalsCycleResult> {
    const now = input.now ?? new Date();
    const nowIso = now.toISOString();
    const env = input.env ?? process.env;
    const config = resolveConfig(env);
    const runtimeId = resolveRuntimeId(input.runtimeId, env);

    const repository = new RuntimeEvolutionSignalsStateRepository(config.statePath);
    const state = await repository.read(runtimeId, nowIso);
    state.runtimeId = runtimeId;
    state.lastUpdatedAt = nowIso;

    if (!config.enabled) {
      await repository.write(state);
      return {
        skipped: true,
        reasonCodes: ["RUNTIME_EVOLUTION_SIGNALS_DISABLED"],
        evaluation: null,
        state,
      };
    }

    const evidenceSignals = input.evidenceSignals ?? (await this.aggregator.collect(config, now));
    const evidenceWindow = {
      startAt: new Date(now.getTime() - config.lookbackMs).toISOString(),
      endAt: nowIso,
      lookbackMs: config.lookbackMs,
    };

    const healingTelemetry = this.healingTelemetryAggregator.build({
      telemetryId: hashId("heal", { runtimeId, nowIso, count: evidenceSignals.length }),
      analyzedAt: nowIso,
      evidenceWindow,
      signals: evidenceSignals,
    });

    const extractedSignals = this.learningSignalExtractor.extract({ now, signals: evidenceSignals });
    const detectedCandidates = this.candidateDetector.detect({ now, signals: evidenceSignals });

    const capturedSignals: RuntimeLearningSignal[] = [];
    let skippedSignalCount = 0;
    for (const signal of extractedSignals) {
      const key = signalDedupeKey(signal);
      const cooldownUntil = state.dedupeState.signalCooldowns[key];
      const cooldownUntilMs = cooldownUntil ? Date.parse(cooldownUntil) : Number.NaN;
      if (Number.isFinite(cooldownUntilMs) && now.getTime() < cooldownUntilMs) {
        skippedSignalCount += 1;
        continue;
      }
      state.dedupeState.signalCooldowns[key] = new Date(now.getTime() + config.signalCooldownMs).toISOString();
      capturedSignals.push(signal);
    }

    const updatedCandidates: RuntimeImprovementCandidate[] = [...state.activeImprovementCandidates];
    const newDetectedCandidates: RuntimeImprovementCandidate[] = [];
    const escalatedCandidates: RuntimeImprovementCandidate[] = [];

    for (const candidate of detectedCandidates) {
      const key = candidateDedupeKey(candidate);
      const existingIndex = updatedCandidates.findIndex((item) =>
        item.targetType === candidate.targetType &&
        item.targetId === candidate.targetId &&
        item.category === candidate.category
      );
      const cooldownUntil = state.dedupeState.candidateCooldowns[key];
      const cooldownUntilMs = cooldownUntil ? Date.parse(cooldownUntil) : Number.NaN;

      if (existingIndex >= 0) {
        const existing = updatedCandidates[existingIndex]!;
        const escalated = severityRank(candidate.severity) > severityRank(existing.severity);
        const merged: RuntimeImprovementCandidate = {
          ...existing,
          detectedAt: candidate.detectedAt,
          recurrenceCount: Math.max(existing.recurrenceCount, candidate.recurrenceCount),
          severity: escalated ? candidate.severity : existing.severity,
          supportingSignals: [...new Set([...existing.supportingSignals, ...candidate.supportingSignals])].slice(-10),
          reasonCodes: [...new Set([...existing.reasonCodes, ...candidate.reasonCodes])],
          metadata: {
            ...existing.metadata,
            lastSeenAt: nowIso,
          },
        };
        updatedCandidates[existingIndex] = merged;
        if (escalated) {
          escalatedCandidates.push(merged);
        }
        state.dedupeState.candidateCooldowns[key] = new Date(now.getTime() + config.candidateCooldownMs).toISOString();
        continue;
      }

      if (Number.isFinite(cooldownUntilMs) && now.getTime() < cooldownUntilMs) {
        continue;
      }
      state.dedupeState.candidateCooldowns[key] = new Date(now.getTime() + config.candidateCooldownMs).toISOString();
      updatedCandidates.push(candidate);
      newDetectedCandidates.push(candidate);
    }

    state.activeImprovementCandidates = updatedCandidates.slice(Math.max(0, updatedCandidates.length - config.maxActiveCandidates));
    state.recentLearningSignals = [...state.recentLearningSignals, ...capturedSignals].slice(
      Math.max(0, state.recentLearningSignals.length + capturedSignals.length - config.maxRecentSignals)
    );

    const summary = {
      healingAssessment: healingTelemetry.healthAssessment,
      learningSignalCount: capturedSignals.length,
      improvementCandidateCount: newDetectedCandidates.length,
      dominantRiskAreas: dominantRiskAreas(state.activeImprovementCandidates),
      notableTargets: notableTargets(state.activeImprovementCandidates, state.recentLearningSignals),
    };

    const reasonCodes = [...new Set([
      ...healingTelemetry.reasonCodes,
      ...(capturedSignals.length > 0 ? ["LEARNING_SIGNALS_CAPTURED"] : []),
      ...(newDetectedCandidates.length > 0 ? ["IMPROVEMENT_CANDIDATES_DETECTED"] : []),
      ...(skippedSignalCount > 0 ? ["LEARNING_SIGNAL_DEDUPE_APPLIED"] : []),
    ])];

    const evaluation: RuntimeEvolutionEvaluation = {
      evolutionEvaluationId: hashId("evolution", {
        runtimeId,
        nowIso,
        healthAssessment: healingTelemetry.healthAssessment,
        learningSignals: capturedSignals.length,
        improvementCandidates: newDetectedCandidates.length,
      }),
      evaluatedAt: nowIso,
      evidenceWindow,
      healingTelemetry,
      learningSignals: capturedSignals,
      improvementCandidates: newDetectedCandidates,
      summary,
      reasonCodes,
      metadata: {
        evidenceSignalCount: evidenceSignals.length,
        skippedSignalCount,
        escalatedCandidateCount: escalatedCandidates.length,
        ...(input.metadata ?? {}),
      },
    };

    state.latestEvaluation = evaluation;
    state.latestHealingTelemetry = healingTelemetry;
    state.lastUpdatedAt = nowIso;
    state.summaryCounters.totalLearningSignalsCaptured += capturedSignals.length;
    state.summaryCounters.totalImprovementCandidatesDetected += newDetectedCandidates.length;
    state.summaryCounters.totalHighSeverityCandidates += newDetectedCandidates.filter((item) => item.severity === "high").length;
    state.summaryCounters[assessmentCounterKey(healingTelemetry.healthAssessment)] += 1;

    const currentMetricHash = metricHash(healingTelemetry);
    const healingAssessmentChanged = state.dedupeState.lastHealingAssessment !== healingTelemetry.healthAssessment;
    const healingMetricsChanged = state.dedupeState.lastHealingMetricHash !== currentMetricHash;

    state.dedupeState.lastHealingAssessment = healingTelemetry.healthAssessment;
    state.dedupeState.lastHealingMetricHash = currentMetricHash;

    await repository.write(state);

    emitRuntimeEvolutionSignalsLedgerEvent(this.ledger, {
      eventType: "runtime_evolution_signals_evaluated",
      status: "evaluated",
      runtimeId,
      evaluation,
      healingTelemetry,
      learningSignal: null,
      improvementCandidate: null,
      reasonCodes,
      requestId: input.requestId,
      sessionId: input.sessionId,
    });

    if (healingAssessmentChanged || healingMetricsChanged) {
      emitRuntimeEvolutionSignalsLedgerEvent(this.ledger, {
        eventType: "runtime_healing_telemetry_evaluated",
        status: "evaluated",
        runtimeId,
        evaluation,
        healingTelemetry,
        learningSignal: null,
        improvementCandidate: null,
        reasonCodes: healingTelemetry.reasonCodes,
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
      if (healingAssessmentChanged) {
        emitRuntimeEvolutionSignalsLedgerEvent(this.ledger, {
          eventType: "runtime_healing_assessment_changed",
          status: "degraded",
          runtimeId,
          evaluation,
          healingTelemetry,
          learningSignal: null,
          improvementCandidate: null,
          reasonCodes: ["HEALING_ASSESSMENT_CHANGED"],
          requestId: input.requestId,
          sessionId: input.sessionId,
        });
      }
    }

    for (const signal of capturedSignals) {
      emitRuntimeEvolutionSignalsLedgerEvent(this.ledger, {
        eventType: "runtime_learning_signal_captured",
        status: "completed",
        runtimeId,
        evaluation,
        healingTelemetry: null,
        learningSignal: signal,
        improvementCandidate: null,
        reasonCodes: signal.reasonCodes,
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
    }

    if (skippedSignalCount > 0) {
      emitRuntimeEvolutionSignalsLedgerEvent(this.ledger, {
        eventType: "runtime_learning_signal_skipped",
        status: "evaluated",
        runtimeId,
        evaluation,
        healingTelemetry: null,
        learningSignal: null,
        improvementCandidate: null,
        reasonCodes: ["LEARNING_SIGNAL_DEDUPE_APPLIED", `SKIPPED_${skippedSignalCount}`],
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
    }

    for (const candidate of newDetectedCandidates) {
      emitRuntimeEvolutionSignalsLedgerEvent(this.ledger, {
        eventType: "runtime_improvement_candidate_detected",
        status: candidate.severity === "high" ? "degraded" : "completed",
        runtimeId,
        evaluation,
        healingTelemetry: null,
        learningSignal: null,
        improvementCandidate: candidate,
        reasonCodes: candidate.reasonCodes,
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
    }

    for (const candidate of escalatedCandidates) {
      emitRuntimeEvolutionSignalsLedgerEvent(this.ledger, {
        eventType: "runtime_improvement_candidate_escalated",
        status: "degraded",
        runtimeId,
        evaluation,
        healingTelemetry: null,
        learningSignal: null,
        improvementCandidate: candidate,
        reasonCodes: ["IMPROVEMENT_CANDIDATE_ESCALATED", candidate.category],
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
    }

    return {
      skipped: false,
      reasonCodes,
      evaluation,
      state,
    };
  }
}

export async function runRuntimeEvolutionSignalsCycle(
  input: RuntimeEvolutionSignalsOrchestratorInput = {},
  ledger: ExecutionLedger = getExecutionLedger()
): Promise<RuntimeEvolutionSignalsCycleResult> {
  const orchestrator = new RuntimeEvolutionSignalsOrchestrator(ledger);
  return orchestrator.run(input);
}

export function createRuntimeEvolutionSignalsStateForTests(runtimeId: string, at = new Date().toISOString()) {
  return createInitialRuntimeEvolutionSignalsState(runtimeId, at);
}

export function createRuntimeEvolutionEvidenceSignalsForTests(
  signals: RuntimeEvolutionEvidenceSignal[]
): RuntimeEvolutionEvidenceSignal[] {
  return [...signals];
}
