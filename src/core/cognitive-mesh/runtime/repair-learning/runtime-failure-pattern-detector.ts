import type {
  RuntimeFailurePatternCategory,
  RuntimeLearningEvidenceEvent,
  RuntimePatternDetectionResult,
} from "./runtime-repair-learning.types";

export interface RuntimeFailurePatternDetectorInput {
  evidenceEvents: RuntimeLearningEvidenceEvent[];
  anomalyType: RuntimeLearningEvidenceEvent["anomalyType"];
  repairAction: RuntimeLearningEvidenceEvent["repairAction"];
  targetType: RuntimeLearningEvidenceEvent["targetType"];
  targetId: string | null;
  recurrenceThreshold: number;
  clusteredWindowMs: number;
}

function countMatches(events: RuntimeLearningEvidenceEvent[], predicate: (event: RuntimeLearningEvidenceEvent) => boolean): number {
  let count = 0;
  for (const event of events) {
    if (predicate(event)) {
      count += 1;
    }
  }
  return count;
}

function toEpoch(value: string): number {
  const epoch = Date.parse(value);
  return Number.isFinite(epoch) ? epoch : 0;
}

function mapPatternForAnomaly(anomalyType: RuntimeLearningEvidenceEvent["anomalyType"]): RuntimeFailurePatternCategory {
  if (anomalyType === "stale_heartbeat") {
    return "repeated_stale_heartbeat";
  }
  if (anomalyType === "queue_backlog") {
    return "repeated_queue_backlog";
  }
  if (anomalyType === "memory_pressure") {
    return "repeated_memory_pressure";
  }
  if (anomalyType === "capability_timeout") {
    return "repeated_capability_timeout";
  }
  if (anomalyType === "capability_lock_stuck") {
    return "repeated_capability_lock_stuck";
  }
  return "none";
}

export class RuntimeFailurePatternDetector {
  detect(input: RuntimeFailurePatternDetectorInput): RuntimePatternDetectionResult {
    const matchingTarget = input.evidenceEvents.filter(
      (event) => event.targetType === input.targetType && (event.targetId ?? null) === (input.targetId ?? null)
    );

    const sameAnomalyCount = countMatches(matchingTarget, (event) => event.anomalyType === input.anomalyType);
    const repeatedRepairFailureCount = countMatches(matchingTarget, (event) => event.repairSuccess === false);
    const repeatedValidationFailureCount = countMatches(matchingTarget, (event) => event.validationSuccess === false);
    const sameActionCount = countMatches(matchingTarget, (event) => event.repairAction === input.repairAction);

    const sortedByTs = [...matchingTarget].sort((a, b) => toEpoch(a.timestamp) - toEpoch(b.timestamp));
    let clusteredFailures = 0;
    for (let i = 1; i < sortedByTs.length; i += 1) {
      const prev = sortedByTs[i - 1]!;
      const curr = sortedByTs[i]!;
      const dt = toEpoch(curr.timestamp) - toEpoch(prev.timestamp);
      if (dt >= 0 && dt <= input.clusteredWindowMs) {
        const currFailure = curr.repairSuccess === false || curr.validationSuccess === false;
        const prevFailure = prev.repairSuccess === false || prev.validationSuccess === false;
        if (currFailure && prevFailure) {
          clusteredFailures += 1;
        }
      }
    }

    const anomalyPattern = mapPatternForAnomaly(input.anomalyType);
    const recurrenceDetected =
      sameAnomalyCount >= input.recurrenceThreshold ||
      repeatedRepairFailureCount >= input.recurrenceThreshold ||
      repeatedValidationFailureCount >= input.recurrenceThreshold ||
      clusteredFailures >= Math.max(1, input.recurrenceThreshold - 1);

    let patternCategory: RuntimeFailurePatternCategory = anomalyPattern;
    if (repeatedRepairFailureCount >= input.recurrenceThreshold) {
      patternCategory = "repeated_repair_failure";
    } else if (repeatedValidationFailureCount >= input.recurrenceThreshold) {
      patternCategory = "repeated_validation_failure";
    } else if (anomalyPattern === "none" && clusteredFailures >= Math.max(1, input.recurrenceThreshold - 1)) {
      patternCategory = "clustered_failures_same_target";
    } else if (
      anomalyPattern === "none" &&
      sameActionCount >= input.recurrenceThreshold &&
      sameAnomalyCount >= input.recurrenceThreshold
    ) {
      patternCategory = "clustered_failures_same_action";
    } else if (!recurrenceDetected) {
      patternCategory = "none";
    }

    const recurrenceCount = Math.max(sameAnomalyCount, repeatedRepairFailureCount, repeatedValidationFailureCount, sameActionCount);
    const reasonCodes = [
      `SAME_ANOMALY_COUNT_${sameAnomalyCount}`,
      `REPAIR_FAILURE_COUNT_${repeatedRepairFailureCount}`,
      `VALIDATION_FAILURE_COUNT_${repeatedValidationFailureCount}`,
      `CLUSTERED_FAILURE_PAIRS_${clusteredFailures}`,
      recurrenceDetected ? "RECURRENCE_DETECTED" : "RECURRENCE_NOT_DETECTED",
    ];

    return {
      patternCategory,
      recurrenceDetected,
      recurrenceCount,
      reasonCodes,
      metadata: {
        sameAnomalyCount,
        repeatedRepairFailureCount,
        repeatedValidationFailureCount,
        sameActionCount,
        clusteredFailures,
      },
    };
  }
}
