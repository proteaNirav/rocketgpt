import type {
  RuntimeInstabilityPattern,
  RuntimeStabilityBand,
  RuntimeStabilitySignal,
  RuntimeTargetStabilityEvaluation,
} from "./runtime-stability.types";

export interface RuntimeStabilityScoringInput {
  signals: RuntimeStabilitySignal[];
  patterns: RuntimeInstabilityPattern[];
  oscillatingTargets: Set<string>;
  multiTargetThreshold: number;
}

export interface RuntimeStabilityScoringResult {
  targetEvaluations: RuntimeTargetStabilityEvaluation[];
  systemStabilityScore: number;
  systemStabilityBand: RuntimeStabilityBand;
  reasonCodes: string[];
}

function clampScore(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 100) {
    return 100;
  }
  return Math.round(value);
}

export function toBand(score: number): RuntimeStabilityBand {
  if (score >= 80) {
    return "normal";
  }
  if (score >= 60) {
    return "watch";
  }
  if (score >= 40) {
    return "degraded";
  }
  if (score >= 20) {
    return "constrained";
  }
  return "critical";
}

function targetKey(targetType: string, targetId: string): string {
  return `${targetType}:${targetId}`;
}

export class RuntimeStabilityScoringEngine {
  score(input: RuntimeStabilityScoringInput): RuntimeStabilityScoringResult {
    const byTarget = new Map<string, RuntimeStabilitySignal[]>();
    for (const signal of input.signals) {
      const key = targetKey(signal.targetType, signal.targetId);
      const list = byTarget.get(key) ?? [];
      list.push(signal);
      byTarget.set(key, list);
    }

    const evaluations: RuntimeTargetStabilityEvaluation[] = [];
    const reasonCodes: string[] = [];

    for (const [key, signals] of byTarget.entries()) {
      const [targetType, targetId] = key.split(":", 2) as [RuntimeTargetStabilityEvaluation["targetType"], string];
      let score = 100;
      const targetReasonCodes: string[] = [];

      const repairFailures = signals.filter((signal) => signal.eventType === "runtime_repair_failed").length;
      const validationFailures = signals.filter((signal) => signal.eventType === "runtime_recovery_validation_failed").length;
      const containmentEvents = signals.filter((signal) => signal.eventType === "runtime_quarantine_applied").length;
      const reintegrationFailures = signals.filter((signal) => signal.eventType === "runtime_reintegration_failed").length;
      const recurrenceSignals = signals.filter((signal) => signal.eventType === "runtime_recurrence_threshold_reached").length;
      const heartbeatFlaps = signals.filter((signal) => signal.eventType === "runtime.heartbeat").length;

      score -= repairFailures * 16;
      score -= validationFailures * 18;
      score -= containmentEvents * 10;
      score -= reintegrationFailures * 16;
      score -= recurrenceSignals * 8;
      if (heartbeatFlaps >= 3) {
        score -= 12;
      }

      if (input.oscillatingTargets.has(key)) {
        score -= 15;
        targetReasonCodes.push("OSCILLATION_DETECTED");
      }
      if (repairFailures > 0) {
        targetReasonCodes.push("REPAIR_FAILURES_PRESENT");
      }
      if (validationFailures > 0) {
        targetReasonCodes.push("VALIDATION_FAILURES_PRESENT");
      }
      if (containmentEvents > 0) {
        targetReasonCodes.push("CONTAINMENT_EVENTS_PRESENT");
      }
      if (reintegrationFailures > 0) {
        targetReasonCodes.push("REINTEGRATION_FAILURES_PRESENT");
      }
      if (recurrenceSignals > 0) {
        targetReasonCodes.push("RECURRENCE_THRESHOLD_REACHED");
      }
      if (heartbeatFlaps >= 3) {
        targetReasonCodes.push("HEARTBEAT_FLAP_SIGNAL");
      }

      const boundedScore = clampScore(score);
      const band = toBand(boundedScore);
      evaluations.push({
        targetType,
        targetId,
        stabilityScore: boundedScore,
        band,
        instabilityCount: repairFailures + validationFailures + containmentEvents + reintegrationFailures,
        oscillationDetected: input.oscillatingTargets.has(key),
        recentSignals: signals.slice(-8).map((signal) => signal.eventType),
        reasonCodes: targetReasonCodes,
        metadata: {
          repairFailures,
          validationFailures,
          containmentEvents,
          reintegrationFailures,
          recurrenceSignals,
          heartbeatFlaps,
        },
      });
    }

    const average = evaluations.length > 0
      ? evaluations.reduce((acc, item) => acc + item.stabilityScore, 0) / evaluations.length
      : 100;
    const degradedCount = evaluations.filter((item) => item.band === "degraded" || item.band === "constrained" || item.band === "critical").length;
    let systemScore = average;

    if (degradedCount >= input.multiTargetThreshold) {
      systemScore -= 12;
      reasonCodes.push("MULTI_TARGET_DEGRADED_THRESHOLD_REACHED");
    }
    if (input.patterns.includes("clustered_multi_target_instability")) {
      systemScore -= 10;
      reasonCodes.push("CLUSTERED_MULTI_TARGET_INSTABILITY");
    }
    if (input.patterns.includes("repair_oscillation") || input.patterns.includes("contain_reintegrate_oscillation")) {
      systemScore -= 8;
      reasonCodes.push("OSCILLATION_PATTERN_PRESENT");
    }

    const boundedSystemScore = clampScore(systemScore);

    return {
      targetEvaluations: evaluations,
      systemStabilityScore: boundedSystemScore,
      systemStabilityBand: toBand(boundedSystemScore),
      reasonCodes,
    };
  }
}
