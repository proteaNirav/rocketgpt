import { createHash } from "node:crypto";
import { hostname } from "node:os";
import { readFile } from "node:fs/promises";
import { getExecutionLedger, type ExecutionLedger, type ExecutionLedgerEntry } from "../execution-ledger";
import type {
  RuntimeRepairAction,
  RuntimeRepairAnomalyType,
  RuntimeRepairAttempt,
  RuntimeRepairDiagnosis,
  RuntimeRecoveryValidation,
  RuntimeRepairTargetType,
} from "../repair/runtime-repair.types";
import { RuntimeFailurePatternDetector } from "./runtime-failure-pattern-detector";
import { RuntimeRootCauseAnalysisEngine } from "./runtime-root-cause-analysis-engine";
import { RuntimePreventionRecommendationEngine } from "./runtime-prevention-recommendation-engine";
import { emitRuntimeLearningLedgerEvent } from "./runtime-repair-learning-event-emitter";
import { RuntimeRepairLearningStateRepository } from "./runtime-repair-learning-state-repository";
import type {
  RuntimeLearningConfig,
  RuntimeLearningCycleResult,
  RuntimeLearningEvidenceEvent,
  RuntimeLearningInput,
  RuntimeLearningResult,
} from "./runtime-repair-learning.types";

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

function resolveRuntimeId(inputRuntimeId: string | undefined, env: NodeJS.ProcessEnv): string {
  if (inputRuntimeId && inputRuntimeId.trim().length > 0) {
    return inputRuntimeId.trim();
  }
  if (env.RGPT_RUNTIME_ID && env.RGPT_RUNTIME_ID.trim().length > 0) {
    return env.RGPT_RUNTIME_ID.trim();
  }
  return `rgpt-${hostname().toLowerCase()}`;
}

function hashId(prefix: string, material: unknown): string {
  const digest = createHash("sha256").update(JSON.stringify(material)).digest("hex").slice(0, 20);
  return `${prefix}_${digest}`;
}

function normalizeIso(value: string | undefined, fallback: string): string {
  if (!value) {
    return fallback;
  }
  const epoch = Date.parse(value);
  if (!Number.isFinite(epoch)) {
    return fallback;
  }
  return new Date(epoch).toISOString();
}

function resolveConfig(env: NodeJS.ProcessEnv): RuntimeLearningConfig {
  return {
    enabled: parseBoolean(env.RGPT_RUNTIME_REPAIR_LEARNING_ENABLED, true),
    lookbackMs: parseNumber(env.RGPT_RUNTIME_REPAIR_LEARNING_LOOKBACK_MS, 6 * 60 * 60 * 1000, 1000),
    recurrenceThreshold: parseNumber(env.RGPT_RUNTIME_REPAIR_LEARNING_RECURRENCE_THRESHOLD, 2, 1),
    cooldownMs: parseNumber(env.RGPT_RUNTIME_REPAIR_LEARNING_COOLDOWN_MS, 120_000, 1000),
    maxEvidenceEvents: parseNumber(env.RGPT_RUNTIME_REPAIR_LEARNING_MAX_EVIDENCE_EVENTS, 200, 10),
    statePath: env.RGPT_RUNTIME_REPAIR_LEARNING_STATE_PATH ?? ".rocketgpt/runtime/repair-learning-state.json",
    repairStatePath: env.RGPT_RUNTIME_REPAIR_STATE_PATH ?? ".rocketgpt/runtime/repair-state.json",
    ledgerPath: env.COGNITIVE_MESH_EXECUTION_LEDGER_JSONL_PATH ?? ".rocketgpt/cognitive-mesh/execution-ledger.jsonl",
  };
}

function parseRepairState(value: unknown): {
  diagnosis: RuntimeRepairDiagnosis | null;
  attempt: RuntimeRepairAttempt | null;
  validation: RuntimeRecoveryValidation | null;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { diagnosis: null, attempt: null, validation: null };
  }
  const record = value as Record<string, unknown>;
  return {
    diagnosis:
      record.latestDiagnosis && typeof record.latestDiagnosis === "object" && !Array.isArray(record.latestDiagnosis)
        ? (record.latestDiagnosis as RuntimeRepairDiagnosis)
        : null,
    attempt:
      record.latestRepairAttempt && typeof record.latestRepairAttempt === "object" && !Array.isArray(record.latestRepairAttempt)
        ? (record.latestRepairAttempt as RuntimeRepairAttempt)
        : null,
    validation:
      record.latestValidation && typeof record.latestValidation === "object" && !Array.isArray(record.latestValidation)
        ? (record.latestValidation as RuntimeRecoveryValidation)
        : null,
  };
}

async function readRepairState(path: string): Promise<{
  diagnosis: RuntimeRepairDiagnosis | null;
  attempt: RuntimeRepairAttempt | null;
  validation: RuntimeRecoveryValidation | null;
}> {
  try {
    const raw = await readFile(path, "utf8");
    return parseRepairState(JSON.parse(raw));
  } catch {
    return { diagnosis: null, attempt: null, validation: null };
  }
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }
  return null;
}

function toText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toAnomalyType(value: unknown): RuntimeRepairAnomalyType {
  const text = toText(value);
  if (
    text === "stale_heartbeat" ||
    text === "queue_backlog" ||
    text === "memory_pressure" ||
    text === "capability_timeout" ||
    text === "capability_lock_stuck"
  ) {
    return text;
  }
  return "unsupported";
}

function toRepairAction(value: unknown): RuntimeRepairAction {
  const text = toText(value);
  if (
    text === "restart_runtime_worker" ||
    text === "recover_queue" ||
    text === "cleanup_memory" ||
    text === "reset_capability_state" ||
    text === "no_action"
  ) {
    return text;
  }
  return "no_action";
}

function toTargetType(value: unknown): RuntimeRepairTargetType {
  const text = toText(value);
  if (text === "runtime" || text === "worker" || text === "queue" || text === "capability" || text === "memory") {
    return text;
  }
  return "runtime";
}

function isRepairEventType(eventType: string): boolean {
  return (
    eventType === "runtime_repair_diagnosed" ||
    eventType === "runtime_repair_attempted" ||
    eventType === "runtime_repair_succeeded" ||
    eventType === "runtime_repair_failed" ||
    eventType === "runtime_recovery_validation_started" ||
    eventType === "runtime_recovery_validation_succeeded" ||
    eventType === "runtime_recovery_validation_failed"
  );
}

function toEvidenceEvent(entry: ExecutionLedgerEntry): RuntimeLearningEvidenceEvent | null {
  if (!isRepairEventType(entry.eventType)) {
    return null;
  }
  const metadata = entry.metadata && typeof entry.metadata === "object" && !Array.isArray(entry.metadata)
    ? (entry.metadata as Record<string, unknown>)
    : {};
  const repairSuccess =
    entry.eventType === "runtime_repair_succeeded"
      ? true
      : entry.eventType === "runtime_repair_failed"
        ? false
        : toBoolean(metadata.repairSuccess);
  const validationSuccess =
    entry.eventType === "runtime_recovery_validation_succeeded"
      ? true
      : entry.eventType === "runtime_recovery_validation_failed"
        ? false
        : toBoolean(metadata.validationSuccess);

  return {
    eventId: entry.entryId,
    timestamp: entry.timestamp,
    eventType: entry.eventType,
    targetType: toTargetType(metadata.targetType),
    targetId: toText(metadata.targetId),
    anomalyType: toAnomalyType(metadata.anomalyType),
    repairAction: toRepairAction(metadata.repairAction),
    repairSuccess,
    validationSuccess,
    reasonCodes: Array.isArray(metadata.reasonCodes)
      ? metadata.reasonCodes.filter((item): item is string => typeof item === "string")
      : [],
  };
}

async function readEvidenceEvents(config: RuntimeLearningConfig, now: Date): Promise<RuntimeLearningEvidenceEvent[]> {
  try {
    const raw = await readFile(config.ledgerPath, "utf8");
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
    const lookbackStart = now.getTime() - config.lookbackMs;
    const events: RuntimeLearningEvidenceEvent[] = [];

    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const line = lines[i]!;
      try {
        const parsed = JSON.parse(line) as ExecutionLedgerEntry;
        const ts = Date.parse(parsed.timestamp);
        if (!Number.isFinite(ts) || ts < lookbackStart) {
          continue;
        }
        const evidence = toEvidenceEvent(parsed);
        if (evidence) {
          events.push(evidence);
          if (events.length >= config.maxEvidenceEvents) {
            break;
          }
        }
      } catch {
        continue;
      }
    }

    return events.reverse();
  } catch {
    return [];
  }
}

function normalizeValidationOutcome(validation: RuntimeRecoveryValidation | null): "succeeded" | "failed" | "unknown" {
  if (!validation) {
    return "unknown";
  }
  return validation.success ? "succeeded" : "failed";
}

function incrementCounter(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

function createLearningCooldownKey(result: RuntimeLearningResult): string {
  return `${result.targetType}:${result.targetId ?? "global"}:${result.rootCauseCategory}:${result.recommendationClasses.join(",")}`;
}

function appendLimited<T>(items: T[], value: T, max: number): T[] {
  const next = [...items, value];
  if (next.length <= max) {
    return next;
  }
  return next.slice(next.length - max);
}

export class RuntimeRepairLearningOrchestrator {
  private readonly patternDetector = new RuntimeFailurePatternDetector();
  private readonly rootCauseAnalyzer = new RuntimeRootCauseAnalysisEngine();
  private readonly recommendationEngine = new RuntimePreventionRecommendationEngine();

  constructor(private readonly ledger: ExecutionLedger = getExecutionLedger()) {}

  async run(input: RuntimeLearningInput = {}): Promise<RuntimeLearningCycleResult> {
    const now = input.now ?? new Date();
    const nowIso = now.toISOString();
    const env = input.env ?? process.env;
    const config = resolveConfig(env);
    const runtimeId = resolveRuntimeId(input.runtimeId, env);

    const stateRepository = new RuntimeRepairLearningStateRepository(config.statePath);
    const state = await stateRepository.read(runtimeId, nowIso);
    state.runtimeId = runtimeId;
    state.status = "analysis_pending";
    state.lastUpdatedAt = nowIso;

    if (!config.enabled) {
      state.status = "analysis_skipped";
      state.summaryCounters.totalSkipped += 1;
      await stateRepository.write(state);
      emitRuntimeLearningLedgerEvent(this.ledger, {
        eventType: "runtime_learning_analysis_skipped",
        status: "evaluated",
        runtimeId,
        learningResult: null,
        reasonCodes: ["RUNTIME_REPAIR_LEARNING_DISABLED"],
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
      return {
        status: "analysis_skipped",
        skipped: true,
        cooldownActive: false,
        learningResult: null,
        reasonCodes: ["RUNTIME_REPAIR_LEARNING_DISABLED"],
        state,
      };
    }

    const repairState = await readRepairState(config.repairStatePath);
    const diagnosis = input.diagnosis ?? repairState.diagnosis;
    const attempt = input.repairAttempt ?? repairState.attempt;
    const validation = input.validation ?? repairState.validation;

    if (!diagnosis || !attempt) {
      state.status = "analysis_skipped";
      state.summaryCounters.totalSkipped += 1;
      await stateRepository.write(state);
      emitRuntimeLearningLedgerEvent(this.ledger, {
        eventType: "runtime_learning_analysis_skipped",
        status: "evaluated",
        runtimeId,
        learningResult: null,
        reasonCodes: ["INSUFFICIENT_REPAIR_EVIDENCE"],
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
      return {
        status: "analysis_skipped",
        skipped: true,
        cooldownActive: false,
        learningResult: null,
        reasonCodes: ["INSUFFICIENT_REPAIR_EVIDENCE"],
        state,
      };
    }

    state.status = "analyzing";
    state.summaryCounters.totalAnalyses += 1;

    const evidenceEvents = await readEvidenceEvents(config, now);

    const pattern = this.patternDetector.detect({
      evidenceEvents,
      anomalyType: diagnosis.anomalyType,
      repairAction: diagnosis.recommendedRepairAction,
      targetType: diagnosis.likelyTargetType,
      targetId: diagnosis.likelyTargetId,
      recurrenceThreshold: config.recurrenceThreshold,
      clusteredWindowMs: Math.max(30_000, Math.floor(config.lookbackMs / 4)),
    });

    if (pattern.patternCategory !== "none") {
      state.status = "pattern_detected";
      emitRuntimeLearningLedgerEvent(this.ledger, {
        eventType: "runtime_pattern_detected",
        status: "evaluated",
        runtimeId,
        learningResult: null,
        reasonCodes: pattern.reasonCodes,
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
    }

    const rootCause = this.rootCauseAnalyzer.analyze({
      anomalyType: diagnosis.anomalyType,
      repairAction: diagnosis.recommendedRepairAction,
      validationOutcome: normalizeValidationOutcome(validation),
      recurrenceDetected: pattern.recurrenceDetected,
      recurrenceCount: pattern.recurrenceCount,
      pattern,
    });

    if (rootCause.rootCauseCategory !== "none") {
      state.status = "root_cause_identified";
      emitRuntimeLearningLedgerEvent(this.ledger, {
        eventType: "runtime_root_cause_identified",
        status: "evaluated",
        runtimeId,
        learningResult: null,
        reasonCodes: rootCause.reasonCodes,
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
    }

    const recommendations = this.recommendationEngine.generate({
      rootCauseCategory: rootCause.rootCauseCategory,
      recurrenceDetected: pattern.recurrenceDetected,
      recurrenceCount: pattern.recurrenceCount,
    });

    const analyzedAt = nowIso;
    const sourceEventIds = [diagnosis.diagnosisId, attempt.attemptId, validation?.validationId]
      .filter((id): id is string => typeof id === "string" && id.length > 0)
      .concat(evidenceEvents.slice(-5).map((event) => event.eventId));

    const learningResult: RuntimeLearningResult = {
      learningId: hashId("learn", {
        analyzedAt,
        targetType: diagnosis.likelyTargetType,
        targetId: diagnosis.likelyTargetId,
        anomalyType: diagnosis.anomalyType,
        rootCauseCategory: rootCause.rootCauseCategory,
        recommendations: recommendations.recommendationClasses,
      }),
      analyzedAt,
      sourceEventIds,
      targetType: diagnosis.likelyTargetType,
      targetId: diagnosis.likelyTargetId,
      anomalyType: diagnosis.anomalyType,
      repairAction: diagnosis.recommendedRepairAction,
      validationOutcome: normalizeValidationOutcome(validation),
      patternCategory: pattern.patternCategory,
      recurrenceDetected: pattern.recurrenceDetected,
      recurrenceCount: pattern.recurrenceCount,
      rootCauseCategory: rootCause.rootCauseCategory,
      confidence: rootCause.confidence,
      recommendationClasses: recommendations.recommendationClasses,
      reasonCodes: [...new Set([...pattern.reasonCodes, ...rootCause.reasonCodes, ...recommendations.reasonCodes])],
      metadata: {
        evidenceEventCount: evidenceEvents.length,
        pattern: pattern.metadata,
        rootCause: rootCause.metadata,
        recommendations: recommendations.metadata,
        ...(input.metadata ?? {}),
      },
    };

    const cooldownKey = createLearningCooldownKey(learningResult);
    const cooldownUntil = state.learningCooldowns[cooldownKey];
    const cooldownUntilMs = cooldownUntil ? Date.parse(cooldownUntil) : Number.NaN;
    const cooldownActive = Number.isFinite(cooldownUntilMs) && now.getTime() < cooldownUntilMs;

    if (cooldownActive) {
      state.status = "analysis_skipped";
      state.summaryCounters.totalSkipped += 1;
      state.lastUpdatedAt = nowIso;
      await stateRepository.write(state);
      emitRuntimeLearningLedgerEvent(this.ledger, {
        eventType: "runtime_learning_analysis_skipped",
        status: "degraded",
        runtimeId,
        learningResult,
        reasonCodes: ["LEARNING_COOLDOWN_ACTIVE"],
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
      return {
        status: "analysis_skipped",
        skipped: true,
        cooldownActive: true,
        learningResult,
        reasonCodes: ["LEARNING_COOLDOWN_ACTIVE"],
        state,
      };
    }

    state.learningCooldowns[cooldownKey] = new Date(now.getTime() + config.cooldownMs).toISOString();
    state.latestLearningResult = learningResult;
    state.recentPatterns = appendLimited(state.recentPatterns, pattern, 30);
    state.recentRecommendations = appendLimited(
      state.recentRecommendations,
      recommendations.recommendationClasses[0] ?? "no_recommendation",
      30
    );
    incrementCounter(state.recurrenceCounters, `${learningResult.patternCategory}`);

    if (pattern.recurrenceDetected) {
      state.summaryCounters.totalRecurrencesDetected += 1;
    }
    if (rootCause.rootCauseCategory !== "none") {
      state.summaryCounters.totalRootCausesIdentified += 1;
    }
    if (!learningResult.recommendationClasses.includes("no_recommendation")) {
      state.summaryCounters.totalRecommendationsGenerated += 1;
    }

    state.status = "recommendations_generated";
    emitRuntimeLearningLedgerEvent(this.ledger, {
      eventType: "runtime_prevention_recommendation_generated",
      status: "evaluated",
      runtimeId,
      learningResult,
      reasonCodes: recommendations.reasonCodes,
      requestId: input.requestId,
      sessionId: input.sessionId,
    });

    if (learningResult.recurrenceDetected && learningResult.recurrenceCount >= config.recurrenceThreshold) {
      emitRuntimeLearningLedgerEvent(this.ledger, {
        eventType: "runtime_recurrence_threshold_reached",
        status: "degraded",
        runtimeId,
        learningResult,
        reasonCodes: ["RECURRENCE_THRESHOLD_REACHED"],
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
    }

    if (learningResult.rootCauseCategory === "repeated_repair_ineffectiveness") {
      emitRuntimeLearningLedgerEvent(this.ledger, {
        eventType: "runtime_repair_ineffectiveness_detected",
        status: "degraded",
        runtimeId,
        learningResult,
        reasonCodes: ["REPAIR_INEFFECTIVENESS_DETECTED"],
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
    }

    state.status = "analysis_completed";
    state.summaryCounters.totalCompleted += 1;
    state.lastUpdatedAt = nowIso;
    await stateRepository.write(state);

    emitRuntimeLearningLedgerEvent(this.ledger, {
      eventType: "runtime_learning_analysis_completed",
      status: "completed",
      runtimeId,
      learningResult,
      reasonCodes: learningResult.reasonCodes,
      requestId: input.requestId,
      sessionId: input.sessionId,
    });

    return {
      status: "analysis_completed",
      skipped: false,
      cooldownActive: false,
      learningResult,
      reasonCodes: learningResult.reasonCodes,
      state,
    };
  }
}

export async function runRuntimeRepairLearningCycle(
  input: RuntimeLearningInput = {},
  ledger: ExecutionLedger = getExecutionLedger()
): Promise<RuntimeLearningCycleResult> {
  const orchestrator = new RuntimeRepairLearningOrchestrator(ledger);
  return orchestrator.run(input);
}
