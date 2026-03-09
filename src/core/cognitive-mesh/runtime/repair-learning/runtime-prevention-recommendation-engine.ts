import type {
  RuntimePreventionRecommendationResult,
  RuntimeRootCauseCategory,
  RuntimePreventionRecommendationClass,
} from "./runtime-repair-learning.types";

export interface RuntimePreventionRecommendationInput {
  rootCauseCategory: RuntimeRootCauseCategory;
  recurrenceDetected: boolean;
  recurrenceCount: number;
}

function uniqueRecommendations(items: RuntimePreventionRecommendationClass[]): RuntimePreventionRecommendationClass[] {
  return [...new Set(items)];
}

export class RuntimePreventionRecommendationEngine {
  generate(input: RuntimePreventionRecommendationInput): RuntimePreventionRecommendationResult {
    if (!input.recurrenceDetected || input.rootCauseCategory === "none") {
      return {
        recommendationClasses: ["no_recommendation"],
        reasonCodes: ["NO_RECURRENCE_OR_ROOT_CAUSE"],
        metadata: {},
      };
    }

    let recommendationClasses: RuntimePreventionRecommendationClass[] = [];

    if (input.rootCauseCategory === "queue_congestion") {
      recommendationClasses = ["inspect_queue_pressure", "reduce_retry_pressure"];
    } else if (input.rootCauseCategory === "worker_instability") {
      recommendationClasses = ["increase_observation_on_target", "escalate_for_containment_consideration"];
    } else if (input.rootCauseCategory === "transient_memory_buildup") {
      recommendationClasses = ["inspect_memory_cleanup_frequency", "increase_observation_on_target"];
    } else if (input.rootCauseCategory === "capability_state_locking") {
      recommendationClasses = ["inspect_capability_locking_flow", "inspect_capability_timeout_threshold"];
    } else if (input.rootCauseCategory === "aggressive_retry_pressure") {
      recommendationClasses = ["reduce_retry_pressure", "add_cooldown_or_extend_cooldown"];
    } else if (input.rootCauseCategory === "repeated_repair_ineffectiveness") {
      recommendationClasses = ["manual_review_required", "escalate_for_containment_consideration"];
    } else if (input.rootCauseCategory === "stale_runtime_state") {
      recommendationClasses = ["increase_observation_on_target", "add_cooldown_or_extend_cooldown"];
    } else {
      recommendationClasses = ["manual_review_required"];
    }

    const deduped = uniqueRecommendations(recommendationClasses);
    return {
      recommendationClasses: deduped,
      reasonCodes: [`ROOT_CAUSE_${input.rootCauseCategory.toUpperCase()}`, `RECURRENCE_COUNT_${input.recurrenceCount}`],
      metadata: {
        recurrenceCount: input.recurrenceCount,
      },
    };
  }
}
