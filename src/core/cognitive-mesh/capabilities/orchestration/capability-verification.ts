import type { CapabilityRequestEnvelope } from "../types/capability-request.types";
import type {
  CapabilityExecutionLifecycleStage,
} from "./capability-execution-hardener";
import type {
  CapabilityExecutionFailureClass,
  CapabilityResultEnvelope,
  CapabilityResultStatus,
} from "../types/capability-result.types";
import type { CapabilityDefinition } from "../types/capability.types";

export type CapabilityVerificationDecision =
  | "accepted"
  | "accepted_with_warnings"
  | "rejected"
  | "invalid_result"
  | "inconsistent_result"
  | "policy_rejected"
  | "degraded_accepted";

export type CapabilityVerificationReasonCode =
  | "RESULT_REQUEST_ID_MISMATCH"
  | "RESULT_SESSION_ID_MISMATCH"
  | "RESULT_CAPABILITY_ID_MISMATCH"
  | "RESULT_COMPLETED_AT_INVALID"
  | "RESULT_STATUS_UNKNOWN"
  | "RESULT_CLASSIFICATION_MISSING"
  | "RESULT_CLASSIFICATION_STATUS_MISMATCH"
  | "RESULT_CLASSIFICATION_DEGRADED_MISMATCH"
  | "RESULT_CLASSIFICATION_REASON_CODES_INVALID"
  | "RESULT_SUCCESS_PAYLOAD_MISSING"
  | "RESULT_NON_SUCCESS_MARKED_COMMITTABLE"
  | "RESULT_FAILURE_CLASS_INCONSISTENT"
  | "RESULT_DEGRADED_NOT_ALLOWED"
  | "RESULT_STATUS_POLICY_REJECTED"
  | "RESULT_DIAGNOSTICS_INVALID";

export interface CapabilityVerificationOutcome {
  decision: CapabilityVerificationDecision;
  adoptable: boolean;
  reasonCodes: CapabilityVerificationReasonCode[];
  warnings: string[];
  normalizedStatus: CapabilityResultStatus;
}

export interface CapabilityVerificationInput {
  request: CapabilityRequestEnvelope;
  capability: CapabilityDefinition;
  result: CapabilityResultEnvelope;
  runtimeGuardOutcome?: string;
  dispatchGuardOutcome?: string;
}

const NON_SUCCESS_STATUSES = new Set<CapabilityResultStatus>([
  "denied",
  "blocked",
  "not_found",
  "invalid",
  "unavailable",
  "failed",
]);

const POLICY_REJECTED_STATUSES = new Set<CapabilityResultStatus>(["denied", "blocked"]);

function normalizeReasonCodes(codes: CapabilityVerificationReasonCode[]): CapabilityVerificationReasonCode[] {
  return [...new Set(codes)].sort();
}

function mapFailureClassByStatus(status: CapabilityResultStatus): CapabilityExecutionFailureClass {
  switch (status) {
    case "success":
      return "none";
    case "degraded_success":
      return "degraded_execution";
    case "denied":
    case "blocked":
      return "guard_blocked";
    case "not_found":
      return "capability_not_found";
    case "invalid":
      return "invalid_request";
    case "unavailable":
      return "capability_unavailable";
    case "failed":
      return "execution_exception";
  }
}

function isValidLifecycleStage(value: unknown): value is CapabilityExecutionLifecycleStage {
  return (
    value === "capability_resolution" ||
    value === "capability_eligibility_checked" ||
    value === "input_normalized" ||
    value === "policy_gated" ||
    value === "execution_started" ||
    value === "result_normalized" ||
    value === "execution_completed" ||
    value === "execution_failed"
  );
}

export function verifyCapabilityResult(input: CapabilityVerificationInput): CapabilityVerificationOutcome {
  const reasonCodes: CapabilityVerificationReasonCode[] = [];
  const warnings: string[] = [];
  const status = input.result.status;

  if (input.result.requestId !== input.request.requestId) {
    reasonCodes.push("RESULT_REQUEST_ID_MISMATCH");
  }
  if (input.result.sessionId !== input.request.sessionId) {
    reasonCodes.push("RESULT_SESSION_ID_MISMATCH");
  }
  if (input.result.capabilityId !== input.request.capabilityId) {
    reasonCodes.push("RESULT_CAPABILITY_ID_MISMATCH");
  }
  if (!Number.isFinite(Date.parse(input.result.completedAt))) {
    reasonCodes.push("RESULT_COMPLETED_AT_INVALID");
  }

  if (!input.result.classification) {
    reasonCodes.push("RESULT_CLASSIFICATION_MISSING");
  } else {
    if (input.result.classification.status !== status) {
      reasonCodes.push("RESULT_CLASSIFICATION_STATUS_MISMATCH");
    }
    if (input.result.classification.degraded !== (status === "degraded_success")) {
      reasonCodes.push("RESULT_CLASSIFICATION_DEGRADED_MISMATCH");
    }
    if (!Array.isArray(input.result.classification.reasonCodes)) {
      reasonCodes.push("RESULT_CLASSIFICATION_REASON_CODES_INVALID");
    }
    if (!isValidLifecycleStage(input.result.classification.lifecycleStage)) {
      reasonCodes.push("RESULT_STATUS_UNKNOWN");
    }
  }

  if (input.result.diagnostics != null && typeof input.result.diagnostics !== "object") {
    reasonCodes.push("RESULT_DIAGNOSTICS_INVALID");
  }

  if ((status === "success" || status === "degraded_success") && input.result.payload === undefined) {
    reasonCodes.push("RESULT_SUCCESS_PAYLOAD_MISSING");
  }

  if (
    input.result.classification &&
    input.result.classification.failureClass !== mapFailureClassByStatus(status) &&
    !(status === "failed" && input.result.classification.failureClass === "adapter_dispatch_failure") &&
    !(status === "failed" && input.result.classification.failureClass === "execution_timeout")
  ) {
    reasonCodes.push("RESULT_FAILURE_CLASS_INCONSISTENT");
  }

  if (status === "degraded_success" && input.capability.status !== "active" && input.capability.status !== "restricted") {
    reasonCodes.push("RESULT_DEGRADED_NOT_ALLOWED");
  }

  if (
    (input.runtimeGuardOutcome === "deny" || input.runtimeGuardOutcome === "safe_mode_redirect") &&
    (status === "success" || status === "degraded_success")
  ) {
    reasonCodes.push("RESULT_STATUS_POLICY_REJECTED");
  }

  if (
    (input.dispatchGuardOutcome === "deny" || input.dispatchGuardOutcome === "safe_mode_redirect") &&
    (status === "success" || status === "degraded_success")
  ) {
    reasonCodes.push("RESULT_STATUS_POLICY_REJECTED");
  }

  if (status === "success" && input.result.warnings && input.result.warnings.length > 0) {
    warnings.push(...input.result.warnings);
  }

  const normalizedReasonCodes = normalizeReasonCodes(reasonCodes);
  if (normalizedReasonCodes.length > 0) {
    const hasPolicyRejection = normalizedReasonCodes.includes("RESULT_STATUS_POLICY_REJECTED");
    const hasInvalidity =
      normalizedReasonCodes.includes("RESULT_REQUEST_ID_MISMATCH") ||
      normalizedReasonCodes.includes("RESULT_SESSION_ID_MISMATCH") ||
      normalizedReasonCodes.includes("RESULT_CAPABILITY_ID_MISMATCH") ||
      normalizedReasonCodes.includes("RESULT_COMPLETED_AT_INVALID") ||
      normalizedReasonCodes.includes("RESULT_CLASSIFICATION_MISSING");
    if (hasPolicyRejection || POLICY_REJECTED_STATUSES.has(status)) {
      return {
        decision: "policy_rejected",
        adoptable: false,
        reasonCodes: normalizedReasonCodes,
        warnings,
        normalizedStatus: status,
      };
    }
    if (hasInvalidity) {
      return {
        decision: "invalid_result",
        adoptable: false,
        reasonCodes: normalizedReasonCodes,
        warnings,
        normalizedStatus: status,
      };
    }
    return {
      decision: "inconsistent_result",
      adoptable: false,
      reasonCodes: normalizedReasonCodes,
      warnings,
      normalizedStatus: status,
    };
  }

  if (NON_SUCCESS_STATUSES.has(status)) {
    return {
      decision: "rejected",
      adoptable: false,
      reasonCodes: [],
      warnings,
      normalizedStatus: status,
    };
  }
  if (status === "degraded_success") {
    return {
      decision: "degraded_accepted",
      adoptable: true,
      reasonCodes: [],
      warnings: [...warnings, ...(input.result.warnings ?? [])],
      normalizedStatus: status,
    };
  }
  if (warnings.length > 0) {
    return {
      decision: "accepted_with_warnings",
      adoptable: true,
      reasonCodes: [],
      warnings,
      normalizedStatus: status,
    };
  }
  return {
    decision: "accepted",
    adoptable: true,
    reasonCodes: [],
    warnings,
    normalizedStatus: status,
  };
}
