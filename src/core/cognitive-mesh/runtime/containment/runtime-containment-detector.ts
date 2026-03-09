import type {
  RuntimeContainmentDetectionResult,
  RuntimeContainmentDetectorInput,
} from "./runtime-containment.types";

function isWithinLookback(nowMs: number, timestamp: string, lookbackMs: number): boolean {
  const ts = Date.parse(timestamp);
  return Number.isFinite(ts) && nowMs - ts <= lookbackMs;
}

export class RuntimeContainmentDetector {
  detect(input: RuntimeContainmentDetectorInput): RuntimeContainmentDetectionResult {
    const nowMs = input.now.getTime();
    const filtered = input.evidenceEvents.filter((event) => {
      return (
        event.targetType === input.targetType &&
        event.targetId === input.targetId &&
        isWithinLookback(nowMs, event.timestamp, input.lookbackMs)
      );
    });

    const repeatedAnomalyCount = filtered.filter((event) => event.anomalyType === input.anomalyType).length;
    const repeatedRepairFailures = filtered.filter((event) => event.repairSuccess === false).length;
    const repeatedValidationFailures = filtered.filter((event) => event.validationSuccess === false).length;
    const sameActionFailureCount = filtered.filter(
      (event) => event.repairSuccess === false && event.repairAction !== "no_action"
    ).length;
    const escalationSignalCount = filtered.filter((event) =>
      event.recommendationClasses.includes("escalate_for_containment_consideration")
    ).length;

    const reasonCodes: string[] = [];
    let triggerCategory: RuntimeContainmentDetectionResult["triggerCategory"] = "none";
    let shouldContain = false;
    let riskLevel: RuntimeContainmentDetectionResult["riskLevel"] = "low";
    let recurrenceCount = 0;

    if (escalationSignalCount > 0 || input.recommendationClasses.includes("escalate_for_containment_consideration")) {
      triggerCategory = "learning_escalation";
      shouldContain = true;
      riskLevel = "high";
      recurrenceCount = Math.max(escalationSignalCount, 1);
      reasonCodes.push("LEARNING_ESCALATION_SIGNAL");
    } else if (repeatedRepairFailures >= input.recurrenceThreshold) {
      triggerCategory = "repeated_repair_failure";
      shouldContain = true;
      riskLevel = "high";
      recurrenceCount = repeatedRepairFailures;
      reasonCodes.push("REPEATED_REPAIR_FAILURE_THRESHOLD_REACHED");
    } else if (repeatedValidationFailures >= input.recurrenceThreshold) {
      triggerCategory = "repeated_validation_failure";
      shouldContain = true;
      riskLevel = "high";
      recurrenceCount = repeatedValidationFailures;
      reasonCodes.push("REPEATED_VALIDATION_FAILURE_THRESHOLD_REACHED");
    } else if (sameActionFailureCount >= input.recurrenceThreshold + 1) {
      triggerCategory = "local_cascade_risk";
      shouldContain = true;
      riskLevel = "high";
      recurrenceCount = sameActionFailureCount;
      reasonCodes.push("LOCAL_CASCADE_RISK_THRESHOLD_REACHED");
    } else if (repeatedAnomalyCount >= input.recurrenceThreshold) {
      triggerCategory = "repeated_anomaly";
      shouldContain = true;
      riskLevel = repeatedAnomalyCount >= input.recurrenceThreshold + 1 ? "high" : "medium";
      recurrenceCount = repeatedAnomalyCount;
      reasonCodes.push("REPEATED_ANOMALY_THRESHOLD_REACHED");
    }

    if (!shouldContain) {
      reasonCodes.push("NO_CONTAINMENT_TRIGGER");
    }

    return {
      triggerCategory,
      shouldContain,
      riskLevel,
      recurrenceCount,
      reasonCodes,
      metadata: {
        consideredEvents: filtered.length,
        repeatedAnomalyCount,
        repeatedRepairFailures,
        repeatedValidationFailures,
        sameActionFailureCount,
        escalationSignalCount,
      },
    };
  }
}
