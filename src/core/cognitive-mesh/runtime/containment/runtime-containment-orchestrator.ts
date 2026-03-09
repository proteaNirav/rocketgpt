import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { hostname } from "node:os";
import { getExecutionLedger, type ExecutionLedger, type ExecutionLedgerEntry } from "../execution-ledger";
import type {
  RuntimeRepairAnomalyType,
  RuntimeRepairTargetType,
} from "../repair/runtime-repair.types";
import type { RuntimePreventionRecommendationClass } from "../repair-learning/runtime-repair-learning.types";
import { RuntimeContainmentDetector } from "./runtime-containment-detector";
import { emitRuntimeContainmentLedgerEvent } from "./runtime-containment-event-emitter";
import { RuntimeContainmentPolicyEngine } from "./runtime-containment-policy-engine";
import { RuntimeQuarantineController } from "./runtime-quarantine-controller";
import { RuntimeReintegrationController } from "./runtime-reintegration-controller";
import {
  RuntimeContainmentStateRepository,
  createInitialRuntimeContainmentState,
} from "./runtime-containment-state-repository";
import type {
  RuntimeContainmentConfig,
  RuntimeContainmentCycleResult,
  RuntimeContainmentDecision,
  RuntimeContainmentEvidenceEvent,
  RuntimeContainmentOrchestratorInput,
  RuntimeContainmentTargetType,
} from "./runtime-containment.types";

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

function resolveContainmentTargetType(
  targetType: RuntimeContainmentOrchestratorInput["targetType"],
  diagnosisTargetType: RuntimeRepairTargetType | undefined,
  anomalyType: RuntimeRepairAnomalyType
): RuntimeContainmentTargetType {
  if (targetType) {
    return targetType;
  }
  if (diagnosisTargetType === "queue") {
    return "queue";
  }
  if (diagnosisTargetType === "capability") {
    return "capability";
  }
  if (anomalyType === "queue_backlog") {
    return "queue";
  }
  if (anomalyType === "capability_timeout" || anomalyType === "capability_lock_stuck") {
    return "capability";
  }
  return "worker";
}

function resolveAnomalyType(input: RuntimeContainmentOrchestratorInput): RuntimeRepairAnomalyType {
  if (input.anomalyType) {
    return input.anomalyType;
  }
  if (input.diagnosis?.anomalyType) {
    return input.diagnosis.anomalyType;
  }
  if (input.repairAttempt?.anomalyType) {
    return input.repairAttempt.anomalyType;
  }
  if (input.learningResult?.anomalyType) {
    return input.learningResult.anomalyType;
  }
  return "unsupported";
}

function resolveConfig(env: NodeJS.ProcessEnv): RuntimeContainmentConfig {
  return {
    enabled: parseBoolean(env.RGPT_RUNTIME_CONTAINMENT_ENABLED, true),
    lookbackMs: parseNumber(env.RGPT_RUNTIME_CONTAINMENT_LOOKBACK_MS, 2 * 60 * 60 * 1000, 1000),
    recurrenceThreshold: parseNumber(env.RGPT_RUNTIME_CONTAINMENT_RECURRENCE_THRESHOLD, 2, 1),
    cooldownMs: parseNumber(env.RGPT_RUNTIME_CONTAINMENT_COOLDOWN_MS, 120_000, 1000),
    observationMs: parseNumber(env.RGPT_RUNTIME_CONTAINMENT_OBSERVATION_MS, 60_000, 1000),
    maxReintegrationFailures: parseNumber(env.RGPT_RUNTIME_CONTAINMENT_MAX_REINTEGRATION_FAILURES, 2, 1),
    maxEvidenceEvents: parseNumber(env.RGPT_RUNTIME_CONTAINMENT_MAX_EVIDENCE_EVENTS, 200, 20),
    statePath: env.RGPT_RUNTIME_CONTAINMENT_STATE_PATH ?? ".rocketgpt/runtime/containment-state.json",
    ledgerPath: env.COGNITIVE_MESH_EXECUTION_LEDGER_JSONL_PATH ?? ".rocketgpt/cognitive-mesh/execution-ledger.jsonl",
    repairStatePath: env.RGPT_RUNTIME_REPAIR_STATE_PATH ?? ".rocketgpt/runtime/repair-state.json",
    learningStatePath: env.RGPT_RUNTIME_REPAIR_LEARNING_STATE_PATH ?? ".rocketgpt/runtime/repair-learning-state.json",
  };
}

function parseTargetType(value: unknown, anomalyType: RuntimeRepairAnomalyType): RuntimeContainmentTargetType {
  if (value === "queue") {
    return "queue";
  }
  if (value === "capability") {
    return "capability";
  }
  if (value === "worker") {
    return "worker";
  }
  if (anomalyType === "queue_backlog") {
    return "queue";
  }
  if (anomalyType === "capability_timeout" || anomalyType === "capability_lock_stuck") {
    return "capability";
  }
  return "worker";
}

function toText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toAnomalyType(value: unknown): RuntimeRepairAnomalyType {
  if (
    value === "stale_heartbeat" ||
    value === "queue_backlog" ||
    value === "memory_pressure" ||
    value === "capability_timeout" ||
    value === "capability_lock_stuck" ||
    value === "unsupported"
  ) {
    return value;
  }
  return "unsupported";
}

function toRepairAction(value: unknown): RuntimeContainmentEvidenceEvent["repairAction"] {
  if (
    value === "restart_runtime_worker" ||
    value === "recover_queue" ||
    value === "cleanup_memory" ||
    value === "reset_capability_state" ||
    value === "no_action"
  ) {
    return value;
  }
  return "no_action";
}

function toRecommendationClasses(value: unknown): RuntimePreventionRecommendationClass[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is RuntimePreventionRecommendationClass => typeof item === "string");
}

function toEvidenceEvent(entry: ExecutionLedgerEntry): RuntimeContainmentEvidenceEvent | null {
  const metadata =
    entry.metadata && typeof entry.metadata === "object" && !Array.isArray(entry.metadata)
      ? (entry.metadata as Record<string, unknown>)
      : {};

  const anomalyType = toAnomalyType(metadata.anomalyType);
  const targetId = toText(metadata.targetId) ?? "unknown";
  const targetType = parseTargetType(metadata.targetType, anomalyType);

  if (entry.category !== "runtime") {
    return null;
  }
  if (
    entry.eventType !== "runtime_repair_diagnosed" &&
    entry.eventType !== "runtime_repair_failed" &&
    entry.eventType !== "runtime_recovery_validation_failed" &&
    entry.eventType !== "runtime_prevention_recommendation_generated" &&
    entry.eventType !== "runtime_learning_analysis_completed"
  ) {
    return null;
  }

  return {
    eventId: entry.entryId,
    timestamp: entry.timestamp,
    eventType: entry.eventType,
    targetType,
    targetId,
    anomalyType,
    repairAction: toRepairAction(metadata.repairAction),
    repairSuccess: entry.eventType === "runtime_repair_failed" ? false : null,
    validationSuccess: entry.eventType === "runtime_recovery_validation_failed" ? false : null,
    recommendationClasses: toRecommendationClasses(metadata.recommendationClasses),
    reasonCodes: Array.isArray(metadata.reasonCodes)
      ? metadata.reasonCodes.filter((item): item is string => typeof item === "string")
      : [],
  };
}

async function readEvidenceEvents(config: RuntimeContainmentConfig, now: Date): Promise<RuntimeContainmentEvidenceEvent[]> {
  try {
    const raw = await readFile(config.ledgerPath, "utf8");
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
    const lookbackStart = now.getTime() - config.lookbackMs;
    const events: RuntimeContainmentEvidenceEvent[] = [];

    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const line = lines[i]!;
      try {
        const parsed = JSON.parse(line) as ExecutionLedgerEntry;
        const ts = Date.parse(parsed.timestamp);
        if (!Number.isFinite(ts) || ts < lookbackStart) {
          continue;
        }
        const event = toEvidenceEvent(parsed);
        if (event) {
          events.push(event);
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

function buildCooldownKey(decision: RuntimeContainmentDecision): string {
  return `${decision.targetType}:${decision.targetId}:${decision.containmentAction}:${decision.triggerCategory}`;
}

function recurringAnomalyFromDetection(triggerCategory: string): boolean {
  return (
    triggerCategory === "repeated_anomaly" ||
    triggerCategory === "local_cascade_risk" ||
    triggerCategory === "repeated_validation_failure" ||
    triggerCategory === "repeated_repair_failure"
  );
}

export class RuntimeContainmentOrchestrator {
  private readonly detector = new RuntimeContainmentDetector();
  private readonly policyEngine = new RuntimeContainmentPolicyEngine();
  private readonly quarantineController = new RuntimeQuarantineController();
  private readonly reintegrationController = new RuntimeReintegrationController();

  constructor(private readonly ledger: ExecutionLedger = getExecutionLedger()) {}

  async run(input: RuntimeContainmentOrchestratorInput = {}): Promise<RuntimeContainmentCycleResult> {
    const now = input.now ?? new Date();
    const nowIso = now.toISOString();
    const env = input.env ?? process.env;
    const config = resolveConfig(env);
    const runtimeId = resolveRuntimeId(input.runtimeId, env);
    const source = input.source ?? "runtime_containment_orchestrator";

    const repository = new RuntimeContainmentStateRepository(config.statePath);
    const state = await repository.read(runtimeId, nowIso);
    state.runtimeId = runtimeId;
    state.lastUpdatedAt = nowIso;

    if (!config.enabled) {
      state.summaryCounters.totalContainmentsSkipped += 1;
      await repository.write(state);
      emitRuntimeContainmentLedgerEvent(this.ledger, {
        eventType: "runtime_quarantine_skipped",
        status: "evaluated",
        runtimeId,
        decision: null,
        activeContainment: null,
        reasonCodes: ["RUNTIME_CONTAINMENT_DISABLED"],
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
      return {
        decision: null,
        activeContainment: null,
        skipped: true,
        cooldownActive: false,
        reasonCodes: ["RUNTIME_CONTAINMENT_DISABLED"],
        state,
      };
    }

    const anomalyType = resolveAnomalyType(input);
    const targetType = resolveContainmentTargetType(input.targetType, input.diagnosis?.likelyTargetType, anomalyType);
    const targetId =
      input.targetId ??
      input.diagnosis?.likelyTargetId ??
      input.repairAttempt?.targetId ??
      input.validation?.targetId ??
      input.learningResult?.targetId ??
      `${targetType}-default`;

    const recommendationClasses = input.learningResult?.recommendationClasses ?? [];
    const evidenceEvents = input.evidenceEvents ?? (await readEvidenceEvents(config, now));

    evidenceEvents.push({
      eventId: hashId("cnt_evt", { nowIso, targetType, targetId, anomalyType }),
      timestamp: nowIso,
      eventType: "runtime_containment_input",
      targetType,
      targetId,
      anomalyType,
      repairAction: input.repairAttempt?.repairAction ?? input.diagnosis?.recommendedRepairAction ?? "no_action",
      repairSuccess: input.repairAttempt ? input.repairAttempt.success : null,
      validationSuccess: input.validation ? input.validation.success : null,
      recommendationClasses,
      reasonCodes: input.reasonCodes ?? [],
    });

    const detection = this.detector.detect({
      now,
      lookbackMs: config.lookbackMs,
      recurrenceThreshold: config.recurrenceThreshold,
      anomalyType,
      targetType,
      targetId,
      recommendationClasses,
      evidenceEvents,
    });

    const policy = this.policyEngine.evaluate({
      anomalyType,
      targetType,
      triggerCategory: detection.triggerCategory,
      riskLevel: detection.riskLevel,
      shouldContain: detection.shouldContain,
    });

    const decision: RuntimeContainmentDecision = {
      containmentDecisionId: hashId("contain", {
        nowIso,
        source,
        targetType,
        targetId,
        triggerCategory: detection.triggerCategory,
        action: policy.containmentAction,
      }),
      decidedAt: nowIso,
      source,
      targetType,
      targetId,
      triggerCategory: detection.triggerCategory,
      containmentAction: policy.containmentAction,
      shouldContain: policy.shouldContain,
      riskLevel: detection.riskLevel,
      reasonCodes: [...new Set([...(input.reasonCodes ?? []), ...detection.reasonCodes, ...policy.reasonCodes])],
      metadata: {
        ...detection.metadata,
        ...policy.metadata,
        ...(input.metadata ?? {}),
      },
    };

    state.latestDecision = decision;
    state.summaryCounters.totalDecisions += 1;

    emitRuntimeContainmentLedgerEvent(this.ledger, {
      eventType: "runtime_containment_triggered",
      status: decision.shouldContain ? "degraded" : "evaluated",
      runtimeId,
      decision,
      activeContainment: null,
      reasonCodes: decision.reasonCodes,
      requestId: input.requestId,
      sessionId: input.sessionId,
    });

    if (decision.triggerCategory === "local_cascade_risk") {
      emitRuntimeContainmentLedgerEvent(this.ledger, {
        eventType: "runtime_cascade_risk_detected",
        status: "degraded",
        runtimeId,
        decision,
        activeContainment: null,
        reasonCodes: ["LOCAL_CASCADE_RISK_DETECTED", ...decision.reasonCodes],
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
    }

    const existing = state.activeContainments.find(
      (item) => item.targetType === targetType && item.targetId === targetId
    );

    if (existing) {
      const reintegration = this.reintegrationController.progress(state, existing, {
        now,
        observationMs: config.observationMs,
        maxReintegrationFailures: config.maxReintegrationFailures,
        repairAttemptId: input.repairAttempt?.attemptId,
        repairSuccess: input.repairAttempt?.success,
        validationId: input.validation?.validationId,
        validationSuccess: input.validation?.success,
        recurringAnomalyDetected: recurringAnomalyFromDetection(detection.triggerCategory),
      });

      if (reintegration) {
        state.latestReintegration = reintegration.updatedEntry;
        for (const eventType of reintegration.events) {
          emitRuntimeContainmentLedgerEvent(this.ledger, {
            eventType,
            status:
              eventType === "runtime_reintegration_failed"
                ? "failed"
                : eventType === "runtime_target_retired_from_auto_reintegration"
                  ? "degraded"
                  : "completed",
            runtimeId,
            decision,
            activeContainment: reintegration.updatedEntry,
            reasonCodes: reintegration.reasonCodes,
            requestId: input.requestId,
            sessionId: input.sessionId,
          });
        }

        if (reintegration.events.includes("runtime_reintegration_started")) {
          state.summaryCounters.totalReintegrationStarted += 1;
        }
        if (reintegration.events.includes("runtime_reintegration_completed")) {
          state.summaryCounters.totalReintegrationsCompleted += 1;
        }
        if (reintegration.events.includes("runtime_reintegration_failed")) {
          state.summaryCounters.totalReintegrationsFailed += 1;
        }
        if (reintegration.events.includes("runtime_target_retired_from_auto_reintegration")) {
          state.summaryCounters.totalRetired += 1;
        }
      }
    }

    if (!decision.shouldContain || decision.containmentAction === "no_containment") {
      state.summaryCounters.totalContainmentsSkipped += 1;
      state.lastUpdatedAt = nowIso;
      await repository.write(state);
      emitRuntimeContainmentLedgerEvent(this.ledger, {
        eventType: "runtime_quarantine_skipped",
        status: "evaluated",
        runtimeId,
        decision,
        activeContainment: existing ?? null,
        reasonCodes: ["NO_CONTAINMENT_ACTION", ...decision.reasonCodes],
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
      return {
        decision,
        activeContainment: existing ?? null,
        skipped: true,
        cooldownActive: false,
        reasonCodes: ["NO_CONTAINMENT_ACTION", ...decision.reasonCodes],
        state,
      };
    }

    const cooldownKey = buildCooldownKey(decision);
    const cooldownUntil = state.decisionCooldowns[cooldownKey];
    const cooldownUntilMs = cooldownUntil ? Date.parse(cooldownUntil) : Number.NaN;
    const cooldownActive = Number.isFinite(cooldownUntilMs) && now.getTime() < cooldownUntilMs;

    if (cooldownActive) {
      state.summaryCounters.totalContainmentsSkipped += 1;
      state.summaryCounters.totalCooldownSkips += 1;
      state.lastUpdatedAt = nowIso;
      await repository.write(state);
      emitRuntimeContainmentLedgerEvent(this.ledger, {
        eventType: "runtime_quarantine_skipped",
        status: "degraded",
        runtimeId,
        decision,
        activeContainment: existing ?? null,
        reasonCodes: ["CONTAINMENT_COOLDOWN_ACTIVE", ...decision.reasonCodes],
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
      return {
        decision,
        activeContainment: existing ?? null,
        skipped: true,
        cooldownActive: true,
        reasonCodes: ["CONTAINMENT_COOLDOWN_ACTIVE", ...decision.reasonCodes],
        state,
      };
    }

    state.decisionCooldowns[cooldownKey] = new Date(now.getTime() + config.cooldownMs).toISOString();
    const apply = this.quarantineController.applyDecision(state, decision, nowIso);
    state.lastUpdatedAt = nowIso;

    if (apply.applied) {
      state.summaryCounters.totalContainmentsApplied += 1;
      emitRuntimeContainmentLedgerEvent(this.ledger, {
        eventType: apply.extended ? "runtime_quarantine_extended" : "runtime_quarantine_applied",
        status: "completed",
        runtimeId,
        decision,
        activeContainment: apply.entry,
        reasonCodes: apply.reasonCodes,
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
    } else {
      state.summaryCounters.totalContainmentsSkipped += 1;
      emitRuntimeContainmentLedgerEvent(this.ledger, {
        eventType: "runtime_quarantine_skipped",
        status: "evaluated",
        runtimeId,
        decision,
        activeContainment: existing ?? null,
        reasonCodes: apply.reasonCodes,
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
    }

    await repository.write(state);

    return {
      decision,
      activeContainment: apply.entry,
      skipped: !apply.applied,
      cooldownActive: false,
      reasonCodes: apply.reasonCodes,
      state,
    };
  }
}

export async function runRuntimeContainmentCycle(
  input: RuntimeContainmentOrchestratorInput = {},
  ledger: ExecutionLedger = getExecutionLedger()
): Promise<RuntimeContainmentCycleResult> {
  const orchestrator = new RuntimeContainmentOrchestrator(ledger);
  return orchestrator.run(input);
}

export function createRuntimeContainmentStateForTests(runtimeId: string, at = new Date().toISOString()) {
  return createInitialRuntimeContainmentState(runtimeId, at);
}
