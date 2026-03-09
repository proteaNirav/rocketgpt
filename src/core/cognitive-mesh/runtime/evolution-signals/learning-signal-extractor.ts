import { createHash } from "node:crypto";
import type {
  RuntimeEvolutionDecisionTaken,
  RuntimeEvolutionEvidenceSignal,
  RuntimeEvolutionOutcome,
  RuntimeEvolutionRecurrenceContext,
  RuntimeEvolutionStabilityImpact,
  RuntimeLearningSignal,
} from "./runtime-evolution-signals.types";

function hashId(prefix: string, material: unknown): string {
  const digest = createHash("sha256").update(JSON.stringify(material)).digest("hex").slice(0, 20);
  return `${prefix}_${digest}`;
}

function mapDecision(signals: RuntimeEvolutionEvidenceSignal[]): RuntimeEvolutionDecisionTaken {
  for (const signal of [...signals].reverse()) {
    const repairAction = signal.metadata.repairAction;
    if (
      repairAction === "restart_runtime_worker" ||
      repairAction === "recover_queue" ||
      repairAction === "cleanup_memory" ||
      repairAction === "reset_capability_state" ||
      repairAction === "no_action"
    ) {
      return repairAction;
    }
    const containmentAction = signal.metadata.containmentAction;
    if (containmentAction === "quarantine_capability") {
      return "quarantine_capability";
    }
    if (containmentAction === "quarantine_worker") {
      return "quarantine_worker";
    }
    if (containmentAction === "freeze_queue") {
      return "freeze_queue";
    }
    const degradationAction = signal.metadata.degradationAction;
    if (degradationAction === "recommend_safe_mode_review") {
      return "recommend_safe_mode_review";
    }
  }
  return "no_action";
}

function mapOutcome(signals: RuntimeEvolutionEvidenceSignal[]): RuntimeEvolutionOutcome {
  const hasRetired = signals.some((signal) => signal.eventType === "runtime_target_retired_from_auto_reintegration");
  if (hasRetired) {
    return "retired_from_auto_reintegration";
  }
  const hasReintegrationFailed = signals.some((signal) => signal.eventType === "runtime_reintegration_failed");
  const hasContainment = signals.some((signal) => signal.eventType === "runtime_quarantine_applied");
  const hasValidationFailed = signals.some((signal) => signal.eventType === "runtime_recovery_validation_failed");
  const hasRepairSucceeded = signals.some((signal) => signal.eventType === "runtime_repair_succeeded");
  const hasValidationSucceeded = signals.some((signal) => signal.eventType === "runtime_recovery_validation_succeeded");

  if (hasContainment && hasReintegrationFailed) {
    return "contained_but_unstable";
  }
  if (hasValidationFailed || hasReintegrationFailed) {
    return "failed_to_stabilize";
  }
  if (hasRepairSucceeded && hasValidationSucceeded) {
    const hasLaterFailure = signals.some((signal) =>
      signal.eventType === "runtime_repair_failed" || signal.eventType === "runtime_reintegration_failed"
    );
    return hasLaterFailure ? "temporarily_stabilized" : "stabilized";
  }
  return "temporarily_stabilized";
}

function mapStabilityImpact(signals: RuntimeEvolutionEvidenceSignal[], outcome: RuntimeEvolutionOutcome): RuntimeEvolutionStabilityImpact {
  const hasCritical = signals.some((signal) => signal.eventType === "runtime_stability_critical_triggered");
  const hasWatch = signals.some((signal) => signal.eventType === "runtime_stability_watch_triggered");
  if (outcome === "stabilized" && !hasCritical) {
    return "positive";
  }
  if (outcome === "failed_to_stabilize" || outcome === "retired_from_auto_reintegration" || hasCritical) {
    return "negative";
  }
  if (hasWatch) {
    return "mixed";
  }
  return "neutral";
}

function mapRecurrenceContext(signals: RuntimeEvolutionEvidenceSignal[]): RuntimeEvolutionRecurrenceContext {
  if (signals.some((signal) => signal.eventType === "runtime_oscillation_detected")) {
    return "oscillatory";
  }
  if (signals.some((signal) => signal.eventType === "runtime_instability_pattern_detected" && Array.isArray(signal.metadata.instabilityPatterns) && signal.metadata.instabilityPatterns.includes("clustered_multi_target_instability"))) {
    return "clustered_multi_target";
  }
  if (signals.some((signal) => signal.eventType === "runtime_recurrence_threshold_reached")) {
    return "recurring_same_target";
  }
  const repeatedActions = signals
    .map((signal) => signal.metadata.repairAction)
    .filter((value) => typeof value === "string");
  if (new Set(repeatedActions).size === 1 && repeatedActions.length >= 2) {
    return "recurring_same_action";
  }
  return "isolated";
}

function isSignificant(signal: RuntimeEvolutionEvidenceSignal): boolean {
  return (
    signal.eventType === "runtime_repair_attempted" ||
    signal.eventType === "runtime_recovery_validation_failed" ||
    signal.eventType === "runtime_quarantine_applied" ||
    signal.eventType === "runtime_reintegration_failed" ||
    signal.eventType === "runtime_degradation_action_recommended" ||
    signal.eventType === "runtime_target_retired_from_auto_reintegration" ||
    signal.eventType === "runtime_oscillation_detected" ||
    signal.eventType === "runtime_stability_watch_triggered" ||
    signal.eventType === "runtime_stability_critical_triggered"
  );
}

export class RuntimeLearningSignalExtractor {
  extract(input: { now: Date; signals: RuntimeEvolutionEvidenceSignal[] }): RuntimeLearningSignal[] {
    const byTarget = new Map<string, RuntimeEvolutionEvidenceSignal[]>();
    for (const signal of input.signals) {
      const key = `${signal.targetType}:${signal.targetId}`;
      const list = byTarget.get(key) ?? [];
      list.push(signal);
      byTarget.set(key, list);
    }

    const out: RuntimeLearningSignal[] = [];
    const nowIso = input.now.toISOString();

    for (const [key, signals] of byTarget.entries()) {
      const scoped = [...signals].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
      const significant = scoped.filter((signal) => isSignificant(signal));
      if (significant.length === 0) {
        continue;
      }
      const [targetType, targetId] = key.split(":", 2) as [RuntimeLearningSignal["targetType"], string];
      const signalSequence = significant.map((signal) => signal.eventType);
      const decisionTaken = mapDecision(scoped);
      const outcome = mapOutcome(scoped);
      const recurrenceContext = mapRecurrenceContext(scoped);
      const stabilityImpact = mapStabilityImpact(scoped, outcome);
      const reasonCodes = [...new Set(significant.flatMap((signal) => signal.reasonCodes))];

      out.push({
        learningSignalId: hashId("learn_sig", {
          nowIso,
          targetType,
          targetId,
          decisionTaken,
          outcome,
          recurrenceContext,
        }),
        capturedAt: nowIso,
        targetType,
        targetId,
        signalSequence,
        decisionTaken,
        outcome,
        stabilityImpact,
        recurrenceContext,
        reasonCodes: reasonCodes.length > 0 ? reasonCodes : ["SIGNIFICANT_TRANSITION_CAPTURED"],
        metadata: {
          signalCount: scoped.length,
          significantSignalCount: significant.length,
        },
      });
    }

    return out;
  }
}
