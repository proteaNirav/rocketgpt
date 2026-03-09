import type {
  RuntimeRootCauseResult,
  RuntimePatternDetectionResult,
  RuntimeRootCauseCategory,
} from "./runtime-repair-learning.types";
import type { RuntimeRepairAction, RuntimeRepairAnomalyType } from "../repair/runtime-repair.types";

export interface RuntimeRootCauseAnalysisInput {
  anomalyType: RuntimeRepairAnomalyType;
  repairAction: RuntimeRepairAction;
  validationOutcome: "succeeded" | "failed" | "unknown";
  recurrenceDetected: boolean;
  recurrenceCount: number;
  pattern: RuntimePatternDetectionResult;
}

function withConfidence(
  rootCauseCategory: RuntimeRootCauseCategory,
  reasonCodes: string[],
  recurrenceCount: number
): RuntimeRootCauseResult {
  const confidence = recurrenceCount >= 3 ? "high" : recurrenceCount >= 2 ? "medium" : "low";
  return {
    rootCauseCategory,
    confidence,
    reasonCodes,
    metadata: {
      recurrenceCount,
    },
  };
}

export class RuntimeRootCauseAnalysisEngine {
  analyze(input: RuntimeRootCauseAnalysisInput): RuntimeRootCauseResult {
    if (!input.recurrenceDetected || input.pattern.patternCategory === "none") {
      return {
        rootCauseCategory: "none",
        confidence: "low",
        reasonCodes: ["NO_RECURRENT_PATTERN"],
        metadata: {},
      };
    }

    if (
      input.pattern.patternCategory === "repeated_repair_failure" ||
      input.pattern.patternCategory === "repeated_validation_failure"
    ) {
      return withConfidence(
        "repeated_repair_ineffectiveness",
        ["REPAIR_OR_VALIDATION_FAILURE_RECURRING"],
        input.recurrenceCount
      );
    }

    if (input.anomalyType === "stale_heartbeat") {
      if (input.validationOutcome === "succeeded" && input.recurrenceCount >= 2) {
        return withConfidence("worker_instability", ["STALE_HEARTBEAT_RECURS_AFTER_REPAIR"], input.recurrenceCount);
      }
      return withConfidence("stale_runtime_state", ["STALE_HEARTBEAT_RECURRING"], input.recurrenceCount);
    }

    if (input.anomalyType === "queue_backlog") {
      if (input.validationOutcome === "failed") {
        return withConfidence("queue_congestion", ["QUEUE_RECOVERY_NOT_STABILIZING"], input.recurrenceCount);
      }
      return withConfidence("aggressive_retry_pressure", ["QUEUE_BACKLOG_RECURRING"], input.recurrenceCount);
    }

    if (input.anomalyType === "memory_pressure") {
      return withConfidence("transient_memory_buildup", ["MEMORY_PRESSURE_RECURRING"], input.recurrenceCount);
    }

    if (input.anomalyType === "capability_timeout" || input.anomalyType === "capability_lock_stuck") {
      return withConfidence("capability_state_locking", ["CAPABILITY_RUNTIME_STATE_RECURRING"], input.recurrenceCount);
    }

    return withConfidence("unknown_but_recurrent", ["RECURRENT_PATTERN_UNMAPPED"], input.recurrenceCount);
  }
}
