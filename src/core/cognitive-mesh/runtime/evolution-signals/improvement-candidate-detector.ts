import { createHash } from "node:crypto";
import type {
  RuntimeEvolutionEvidenceSignal,
  RuntimeImprovementCandidate,
  RuntimeImprovementCandidateCategory,
  RuntimeImprovementCandidateSeverity,
  RuntimeImprovementReviewClass,
} from "./runtime-evolution-signals.types";

function hashId(prefix: string, material: unknown): string {
  const digest = createHash("sha256").update(JSON.stringify(material)).digest("hex").slice(0, 20);
  return `${prefix}_${digest}`;
}

function toSeverity(recurrenceCount: number): RuntimeImprovementCandidateSeverity {
  if (recurrenceCount >= 5) {
    return "high";
  }
  if (recurrenceCount >= 3) {
    return "medium";
  }
  return "low";
}

function toReviewClass(category: RuntimeImprovementCandidateCategory): RuntimeImprovementReviewClass {
  if (category === "repeated_ineffective_repair_strategy") {
    return "review_repair_strategy";
  }
  if (category === "repeated_validation_failure_cluster") {
    return "review_validation_logic";
  }
  if (category === "repeated_containment_same_target") {
    return "review_containment_policy";
  }
  if (category === "repeated_degradation_trigger_same_cause") {
    return "review_stability_thresholds";
  }
  if (category === "persistent_oscillation_pattern") {
    return "consortium_pattern_review";
  }
  if (category === "chronic_queue_pressure" || category === "chronic_worker_instability" || category === "chronic_capability_state_instability") {
    return "review_target_specific_runtime_design";
  }
  return "manual_architecture_review";
}

function groupByTarget(signals: RuntimeEvolutionEvidenceSignal[]): Map<string, RuntimeEvolutionEvidenceSignal[]> {
  const out = new Map<string, RuntimeEvolutionEvidenceSignal[]>();
  for (const signal of signals) {
    const key = `${signal.targetType}:${signal.targetId}`;
    const list = out.get(key) ?? [];
    list.push(signal);
    out.set(key, list);
  }
  return out;
}

function pushCandidate(
  out: RuntimeImprovementCandidate[],
  input: {
    nowIso: string;
    category: RuntimeImprovementCandidateCategory;
    targetType: RuntimeImprovementCandidate["targetType"];
    targetId: string;
    recurrenceCount: number;
    supportingSignals: string[];
    reasonCodes: string[];
  }
): void {
  if (input.recurrenceCount < 2) {
    return;
  }
  out.push({
    candidateId: hashId("improve", {
      at: input.nowIso,
      category: input.category,
      targetType: input.targetType,
      targetId: input.targetId,
      recurrenceCount: input.recurrenceCount,
    }),
    detectedAt: input.nowIso,
    category: input.category,
    targetType: input.targetType,
    targetId: input.targetId,
    severity: toSeverity(input.recurrenceCount),
    recurrenceCount: input.recurrenceCount,
    supportingSignals: input.supportingSignals,
    reasonCodes: input.reasonCodes,
    suggestedReviewClass: toReviewClass(input.category),
    metadata: {},
  });
}

export class RuntimeImprovementCandidateDetector {
  detect(input: { now: Date; signals: RuntimeEvolutionEvidenceSignal[] }): RuntimeImprovementCandidate[] {
    const nowIso = input.now.toISOString();
    const out: RuntimeImprovementCandidate[] = [];

    const byTarget = groupByTarget(input.signals);
    for (const [key, signals] of byTarget.entries()) {
      const [targetType, targetId] = key.split(":", 2) as [RuntimeImprovementCandidate["targetType"], string];
      const repairFailures = signals.filter((signal) => signal.eventType === "runtime_repair_failed");
      const validationFailures = signals.filter((signal) => signal.eventType === "runtime_recovery_validation_failed");
      const containmentEvents = signals.filter((signal) => signal.eventType === "runtime_quarantine_applied");
      const reintegrationFailures = signals.filter((signal) => signal.eventType === "runtime_reintegration_failed");
      const oscillationSignals = signals.filter((signal) => signal.eventType === "runtime_oscillation_detected");
      const degradationTriggers = signals.filter((signal) => signal.eventType === "runtime_degradation_action_recommended");
      const instabilitySignals = signals.filter((signal) =>
        signal.eventType === "runtime_repair_failed" ||
        signal.eventType === "runtime_recovery_validation_failed" ||
        signal.eventType === "runtime_quarantine_applied" ||
        signal.eventType === "runtime_reintegration_failed"
      );

      const repeatedRepairActionCounts = new Map<string, number>();
      for (const signal of repairFailures) {
        const action = typeof signal.metadata.repairAction === "string" ? signal.metadata.repairAction : "unknown";
        repeatedRepairActionCounts.set(action, (repeatedRepairActionCounts.get(action) ?? 0) + 1);
      }
      const maxRepairActionRepeat = Math.max(0, ...repeatedRepairActionCounts.values());

      pushCandidate(out, {
        nowIso,
        category: "repeated_ineffective_repair_strategy",
        targetType,
        targetId,
        recurrenceCount: maxRepairActionRepeat,
        supportingSignals: repairFailures.slice(-5).map((signal) => signal.eventId),
        reasonCodes: ["REPEATED_INEFFECTIVE_REPAIR_STRATEGY"],
      });

      pushCandidate(out, {
        nowIso,
        category: "repeated_validation_failure_cluster",
        targetType,
        targetId,
        recurrenceCount: validationFailures.length,
        supportingSignals: validationFailures.slice(-5).map((signal) => signal.eventId),
        reasonCodes: ["REPEATED_VALIDATION_FAILURE_CLUSTER"],
      });

      pushCandidate(out, {
        nowIso,
        category: "repeated_containment_same_target",
        targetType,
        targetId,
        recurrenceCount: containmentEvents.length,
        supportingSignals: containmentEvents.slice(-5).map((signal) => signal.eventId),
        reasonCodes: ["REPEATED_CONTAINMENT_SAME_TARGET"],
      });

      pushCandidate(out, {
        nowIso,
        category: "repeated_reintegration_failure",
        targetType,
        targetId,
        recurrenceCount: reintegrationFailures.length,
        supportingSignals: reintegrationFailures.slice(-5).map((signal) => signal.eventId),
        reasonCodes: ["REPEATED_REINTEGRATION_FAILURE"],
      });

      pushCandidate(out, {
        nowIso,
        category: "persistent_oscillation_pattern",
        targetType,
        targetId,
        recurrenceCount: oscillationSignals.length,
        supportingSignals: oscillationSignals.slice(-5).map((signal) => signal.eventId),
        reasonCodes: ["PERSISTENT_OSCILLATION_PATTERN"],
      });

      const degradationByAction = new Map<string, number>();
      for (const signal of degradationTriggers) {
        const action = typeof signal.metadata.degradationAction === "string" ? signal.metadata.degradationAction : "unknown";
        degradationByAction.set(action, (degradationByAction.get(action) ?? 0) + 1);
      }
      const maxDegradationRepeat = Math.max(0, ...degradationByAction.values());
      pushCandidate(out, {
        nowIso,
        category: "repeated_degradation_trigger_same_cause",
        targetType,
        targetId,
        recurrenceCount: maxDegradationRepeat,
        supportingSignals: degradationTriggers.slice(-5).map((signal) => signal.eventId),
        reasonCodes: ["REPEATED_DEGRADATION_TRIGGER_SAME_CAUSE"],
      });

      pushCandidate(out, {
        nowIso,
        category: "unstable_target_hotspot",
        targetType,
        targetId,
        recurrenceCount: instabilitySignals.length,
        supportingSignals: instabilitySignals.slice(-6).map((signal) => signal.eventId),
        reasonCodes: ["UNSTABLE_TARGET_HOTSPOT"],
      });

      if (targetType === "queue") {
        const queueSignals = signals.filter((signal) =>
          signal.eventType === "runtime_repair_failed" ||
          signal.eventType === "runtime_quarantine_applied" ||
          signal.eventType === "runtime_degradation_action_recommended"
        );
        pushCandidate(out, {
          nowIso,
          category: "chronic_queue_pressure",
          targetType,
          targetId,
          recurrenceCount: queueSignals.length,
          supportingSignals: queueSignals.slice(-6).map((signal) => signal.eventId),
          reasonCodes: ["CHRONIC_QUEUE_PRESSURE"],
        });
      }

      if (targetType === "worker") {
        const workerSignals = signals.filter((signal) =>
          signal.eventType === "runtime_repair_failed" ||
          signal.eventType === "runtime_oscillation_detected" ||
          signal.eventType === "runtime_reintegration_failed"
        );
        pushCandidate(out, {
          nowIso,
          category: "chronic_worker_instability",
          targetType,
          targetId,
          recurrenceCount: workerSignals.length,
          supportingSignals: workerSignals.slice(-6).map((signal) => signal.eventId),
          reasonCodes: ["CHRONIC_WORKER_INSTABILITY"],
        });
      }

      if (targetType === "capability") {
        const capabilitySignals = signals.filter((signal) =>
          signal.eventType === "runtime_repair_failed" ||
          signal.eventType === "runtime_recovery_validation_failed" ||
          signal.eventType === "runtime_quarantine_applied"
        );
        pushCandidate(out, {
          nowIso,
          category: "chronic_capability_state_instability",
          targetType,
          targetId,
          recurrenceCount: capabilitySignals.length,
          supportingSignals: capabilitySignals.slice(-6).map((signal) => signal.eventId),
          reasonCodes: ["CHRONIC_CAPABILITY_STATE_INSTABILITY"],
        });
      }
    }

    return out;
  }
}
