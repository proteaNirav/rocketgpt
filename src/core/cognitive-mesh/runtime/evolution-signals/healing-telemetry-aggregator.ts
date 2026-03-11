import { readFile } from "node:fs/promises";
import type { ExecutionLedgerEntry } from "../execution-ledger";
import type {
  RuntimeEvolutionEvidenceSignal,
  RuntimeHealingAssessment,
  RuntimeHealingTelemetry,
  RuntimeHealingTelemetryMetrics,
  RuntimeEvolutionSignalsConfig,
} from "./runtime-evolution-signals.types";

const EVOLUTION_RELEVANT_EVENTS = new Set<string>([
  "runtime.heartbeat",
  "runtime_repair_attempted",
  "runtime_repair_failed",
  "runtime_repair_succeeded",
  "runtime_recovery_validation_failed",
  "runtime_recovery_validation_succeeded",
  "runtime_pattern_detected",
  "runtime_recurrence_threshold_reached",
  "runtime_repair_ineffectiveness_detected",
  "runtime_quarantine_applied",
  "runtime_reintegration_started",
  "runtime_reintegration_completed",
  "runtime_reintegration_failed",
  "runtime_target_retired_from_auto_reintegration",
  "runtime_stability_evaluated",
  "runtime_instability_pattern_detected",
  "runtime_oscillation_detected",
  "runtime_degradation_action_recommended",
  "runtime_stability_watch_triggered",
  "runtime_stability_critical_triggered",
]);

function toText(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeTargetType(value: unknown): RuntimeEvolutionEvidenceSignal["targetType"] {
  if (value === "runtime" || value === "worker" || value === "queue" || value === "capability") {
    return value;
  }
  return "runtime";
}

function isHeartbeatIntent(entry: ExecutionLedgerEntry, metadata: Record<string, unknown>): boolean {
  if (entry.eventType === "runtime.heartbeat") {
    return true;
  }
  const action = toText(entry.action, "");
  if (action.startsWith("runtime.heartbeat")) {
    return true;
  }
  return (
    Object.prototype.hasOwnProperty.call(metadata, "heartbeat") ||
    Object.prototype.hasOwnProperty.call(metadata, "heartbeatHybrid") ||
    Object.prototype.hasOwnProperty.call(metadata, "heartbeatManual")
  );
}

function toSignal(entry: ExecutionLedgerEntry): RuntimeEvolutionEvidenceSignal | null {
  const metadata =
    entry.metadata && typeof entry.metadata === "object" && !Array.isArray(entry.metadata)
      ? (entry.metadata as Record<string, unknown>)
      : {};
  const heartbeatIntent = isHeartbeatIntent(entry, metadata);
  if (!EVOLUTION_RELEVANT_EVENTS.has(entry.eventType) && !heartbeatIntent) {
    return null;
  }

  const targetType = normalizeTargetType(metadata.targetType);
  const targetId = toText(metadata.targetId, entry.target);
  const reasonCodes = Array.isArray(metadata.reasonCodes)
    ? metadata.reasonCodes.filter((item): item is string => typeof item === "string")
    : [];

  return {
    eventId: entry.entryId,
    timestamp: entry.timestamp,
    eventType: heartbeatIntent ? "runtime.heartbeat" : entry.eventType,
    targetType,
    targetId,
    reasonCodes,
    metadata,
  };
}

export class RuntimeEvolutionSignalsAggregator {
  async collect(config: RuntimeEvolutionSignalsConfig, now: Date): Promise<RuntimeEvolutionEvidenceSignal[]> {
    try {
      const raw = await readFile(config.ledgerPath, "utf8");
      const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
      const lookbackStart = now.getTime() - config.lookbackMs;
      const out: RuntimeEvolutionEvidenceSignal[] = [];

      for (let i = lines.length - 1; i >= 0; i -= 1) {
        const line = lines[i]!;
        try {
          const parsed = JSON.parse(line) as ExecutionLedgerEntry;
          const ts = Date.parse(parsed.timestamp);
          if (!Number.isFinite(ts) || ts < lookbackStart) {
            continue;
          }
          const signal = toSignal(parsed);
          if (signal) {
            out.push(signal);
            if (out.length >= config.maxEvidenceEvents) {
              break;
            }
          }
        } catch {
          continue;
        }
      }

      return out.reverse();
    } catch {
      return [];
    }
  }
}

function safeRate(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }
  return Number((numerator / denominator).toFixed(4));
}

function classifyAssessment(metrics: RuntimeHealingTelemetryMetrics): {
  assessment: RuntimeHealingAssessment;
  reasonCodes: string[];
} {
  const reasons: string[] = [];
  if (
    metrics.reintegrationFailureRate >= 0.5 ||
    metrics.oscillationRate >= 0.4 ||
    metrics.retirementRate >= 0.2 ||
    metrics.constrainedOrCriticalFrequency >= 0.3
  ) {
    reasons.push("HEALING_UNSTABLE");
    return { assessment: "unstable", reasonCodes: reasons };
  }
  if (
    metrics.repairFailureRate >= 0.4 ||
    metrics.validationFailureRate >= 0.4 ||
    metrics.containmentRate >= 0.3 ||
    metrics.degradedBandFrequency >= 0.4
  ) {
    reasons.push("HEALING_STRESSED");
    return { assessment: "stressed", reasonCodes: reasons };
  }
  if (
    metrics.repairFailureRate >= 0.2 ||
    metrics.validationFailureRate >= 0.2 ||
    metrics.repairLoopFrequency >= 0.2 ||
    metrics.degradedBandFrequency >= 0.2
  ) {
    reasons.push("HEALING_WATCH");
    return { assessment: "watch", reasonCodes: reasons };
  }
  reasons.push("HEALING_HEALTHY");
  return { assessment: "healthy", reasonCodes: reasons };
}

export class RuntimeHealingTelemetryAggregator {
  build(input: {
    telemetryId: string;
    analyzedAt: string;
    evidenceWindow: RuntimeHealingTelemetry["evidenceWindow"];
    signals: RuntimeEvolutionEvidenceSignal[];
    targetType?: RuntimeHealingTelemetry["targetType"];
    targetId?: RuntimeHealingTelemetry["targetId"];
  }): RuntimeHealingTelemetry {
    const scoped = input.targetType && input.targetId
      ? input.signals.filter((signal) => signal.targetType === input.targetType && signal.targetId === input.targetId)
      : input.signals;

    const repairSucceeded = scoped.filter((signal) => signal.eventType === "runtime_repair_succeeded").length;
    const repairFailed = scoped.filter((signal) => signal.eventType === "runtime_repair_failed").length;
    const validationSucceeded = scoped.filter((signal) => signal.eventType === "runtime_recovery_validation_succeeded").length;
    const validationFailed = scoped.filter((signal) => signal.eventType === "runtime_recovery_validation_failed").length;
    const containments = scoped.filter((signal) => signal.eventType === "runtime_quarantine_applied").length;
    const reintegrationSucceeded = scoped.filter((signal) => signal.eventType === "runtime_reintegration_completed").length;
    const reintegrationFailed = scoped.filter((signal) => signal.eventType === "runtime_reintegration_failed").length;
    const oscillationSignals = scoped.filter((signal) => signal.eventType === "runtime_oscillation_detected").length;
    const retirements = scoped.filter((signal) => signal.eventType === "runtime_target_retired_from_auto_reintegration").length;

    const stabilityEvaluations = scoped.filter((signal) => signal.eventType === "runtime_stability_evaluated");
    const degradedBandSignals = stabilityEvaluations.filter((signal) => {
      const band = signal.metadata.systemStabilityBand;
      return band === "degraded" || band === "constrained" || band === "critical";
    }).length;
    const constrainedOrCriticalSignals = stabilityEvaluations.filter((signal) => {
      const band = signal.metadata.systemStabilityBand;
      return band === "constrained" || band === "critical";
    }).length;

    const totalRepair = repairSucceeded + repairFailed;
    const totalValidation = validationSucceeded + validationFailed;
    const totalReintegration = reintegrationSucceeded + reintegrationFailed;
    const totalSignals = Math.max(1, scoped.length);

    const metrics: RuntimeHealingTelemetryMetrics = {
      repairSuccessRate: safeRate(repairSucceeded, totalRepair),
      repairFailureRate: safeRate(repairFailed, totalRepair),
      validationSuccessRate: safeRate(validationSucceeded, totalValidation),
      validationFailureRate: safeRate(validationFailed, totalValidation),
      containmentRate: safeRate(containments, totalSignals),
      reintegrationSuccessRate: safeRate(reintegrationSucceeded, totalReintegration),
      reintegrationFailureRate: safeRate(reintegrationFailed, totalReintegration),
      repairLoopFrequency: safeRate(totalRepair, totalSignals),
      oscillationRate: safeRate(oscillationSignals, totalSignals),
      retirementRate: safeRate(retirements, totalSignals),
      degradedBandFrequency: safeRate(degradedBandSignals, Math.max(1, stabilityEvaluations.length)),
      constrainedOrCriticalFrequency: safeRate(constrainedOrCriticalSignals, Math.max(1, stabilityEvaluations.length)),
    };

    const classified = classifyAssessment(metrics);

    return {
      telemetryId: input.telemetryId,
      analyzedAt: input.analyzedAt,
      evidenceWindow: input.evidenceWindow,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      metrics,
      healthAssessment: classified.assessment,
      reasonCodes: classified.reasonCodes,
      metadata: {
        scopedSignalCount: scoped.length,
        repairSucceeded,
        repairFailed,
        validationSucceeded,
        validationFailed,
        containments,
        reintegrationSucceeded,
        reintegrationFailed,
        oscillationSignals,
        retirements,
      },
    };
  }
}
