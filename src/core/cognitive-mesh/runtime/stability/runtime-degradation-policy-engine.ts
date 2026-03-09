import type {
  RuntimeDegradationAction,
  RuntimeInstabilityPattern,
  RuntimeStabilityBand,
  RuntimeTargetStabilityEvaluation,
} from "./runtime-stability.types";

export interface RuntimeDegradationPolicyInput {
  systemBand: RuntimeStabilityBand;
  systemScore: number;
  patterns: RuntimeInstabilityPattern[];
  targetEvaluations: RuntimeTargetStabilityEvaluation[];
}

export interface RuntimeDegradationPolicyResult {
  action: RuntimeDegradationAction;
  reasonCodes: string[];
  metadata: Record<string, unknown>;
}

export class RuntimeDegradationPolicyEngine {
  evaluate(input: RuntimeDegradationPolicyInput): RuntimeDegradationPolicyResult {
    const reasonCodes: string[] = [];

    if (input.systemBand === "critical" || input.systemScore < 20) {
      reasonCodes.push("CRITICAL_SYSTEM_STABILITY");
      return {
        action: "recommend_safe_mode_review",
        reasonCodes,
        metadata: { policyBand: input.systemBand },
      };
    }

    if (input.patterns.includes("clustered_multi_target_instability")) {
      reasonCodes.push("CLUSTERED_MULTI_TARGET_INSTABILITY");
      return {
        action: "reduce_new_work_intake",
        reasonCodes,
        metadata: { unstableTargets: input.targetEvaluations.filter((item) => item.band !== "normal" && item.band !== "watch").length },
      };
    }

    if (input.patterns.includes("repeated_same_target_instability") || input.patterns.includes("repair_oscillation")) {
      reasonCodes.push("REPEATED_SAME_TARGET_INSTABILITY");
      return {
        action: "suppress_repeated_repair_on_unstable_targets",
        reasonCodes,
        metadata: {},
      };
    }

    const degradedTargets = input.targetEvaluations.filter((item) =>
      item.band === "degraded" || item.band === "constrained" || item.band === "critical"
    ).length;
    if (degradedTargets >= 2 || input.systemBand === "constrained") {
      reasonCodes.push("PREFER_HEALTHY_TARGETS");
      return {
        action: "prefer_healthy_targets_only",
        reasonCodes,
        metadata: { degradedTargets },
      };
    }

    if (input.systemBand === "watch" || input.systemBand === "degraded") {
      reasonCodes.push("INCREASE_OBSERVATION");
      return {
        action: "increase_observation",
        reasonCodes,
        metadata: { systemBand: input.systemBand },
      };
    }

    return {
      action: "no_action",
      reasonCodes: ["STABILITY_NORMAL"],
      metadata: {},
    };
  }
}
