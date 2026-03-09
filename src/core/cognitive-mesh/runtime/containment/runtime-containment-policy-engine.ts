import type {
  RuntimeContainmentPolicyInput,
  RuntimeContainmentPolicyResult,
} from "./runtime-containment.types";

export class RuntimeContainmentPolicyEngine {
  evaluate(input: RuntimeContainmentPolicyInput): RuntimeContainmentPolicyResult {
    const reasonCodes: string[] = [];

    if (!input.shouldContain || input.triggerCategory === "none") {
      return {
        containmentAction: "no_containment",
        shouldContain: false,
        reasonCodes: ["POLICY_NO_CONTAINMENT_TRIGGER"],
        metadata: {},
      };
    }

    if (input.anomalyType === "queue_backlog" || input.targetType === "queue") {
      reasonCodes.push("POLICY_QUEUE_CONTAINMENT");
      return {
        containmentAction: "freeze_queue",
        shouldContain: true,
        reasonCodes,
        metadata: { scope: "queue" },
      };
    }

    if (
      input.anomalyType === "capability_timeout" ||
      input.anomalyType === "capability_lock_stuck" ||
      input.targetType === "capability"
    ) {
      reasonCodes.push("POLICY_CAPABILITY_CONTAINMENT");
      return {
        containmentAction: "quarantine_capability",
        shouldContain: true,
        reasonCodes,
        metadata: { scope: "capability" },
      };
    }

    if (input.anomalyType === "stale_heartbeat" || input.targetType === "worker") {
      reasonCodes.push("POLICY_WORKER_CONTAINMENT");
      return {
        containmentAction: "quarantine_worker",
        shouldContain: true,
        reasonCodes,
        metadata: { scope: "worker" },
      };
    }

    if (input.triggerCategory === "repeated_repair_failure" || input.triggerCategory === "repeated_validation_failure") {
      reasonCodes.push("POLICY_FAILURE_CONTAINMENT_FALLBACK");
      return {
        containmentAction: "quarantine_worker",
        shouldContain: true,
        reasonCodes,
        metadata: { scope: "worker_fallback" },
      };
    }

    return {
      containmentAction: "no_containment",
      shouldContain: false,
      reasonCodes: ["POLICY_UNSUPPORTED_SCOPE"],
      metadata: {},
    };
  }
}
