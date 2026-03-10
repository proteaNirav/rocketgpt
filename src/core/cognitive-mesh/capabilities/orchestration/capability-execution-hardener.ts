import type { CapabilityAdaptor } from "../adaptors/capability-adaptor";
import type { CapabilityRegistry } from "../registry/capability-registry";
import type { CapabilityRequestEnvelope } from "../types/capability-request.types";
import type {
  CapabilityExecutionClassification,
  CapabilityExecutionFailureClass,
  CapabilityResultStatus,
  CapabilityResultEnvelope,
} from "../types/capability-result.types";
import type { CapabilityDefinition } from "../types/capability.types";

export type CapabilityExecutionLifecycleStage =
  | "capability_resolution"
  | "capability_eligibility_checked"
  | "input_normalized"
  | "policy_gated"
  | "execution_started"
  | "result_normalized"
  | "execution_completed"
  | "execution_failed";

export type CapabilityExecutionStatus = CapabilityResultStatus;

export interface CapabilityExecutionNormalizationResult {
  request: CapabilityRequestEnvelope;
  valid: boolean;
  reasonCodes: string[];
}

export interface CapabilityEligibilityResult {
  eligible: boolean;
  status: CapabilityExecutionStatus;
  failureClass?: CapabilityExecutionFailureClass;
  reasonCodes: string[];
  capability?: CapabilityDefinition;
}

export interface NormalizedFailureResultInput {
  request: CapabilityRequestEnvelope;
  status: CapabilityExecutionStatus;
  failureClass: CapabilityExecutionFailureClass;
  reasonCodes: string[];
  stage: CapabilityExecutionLifecycleStage;
  diagnostics?: Record<string, unknown>;
}

export interface NormalizeSuccessResultInput {
  request: CapabilityRequestEnvelope;
  rawResult: CapabilityResultEnvelope;
  stage: CapabilityExecutionLifecycleStage;
  reasonCodes?: string[];
  diagnostics?: Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cloneTrace(trace: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  return trace ? { ...trace } : undefined;
}

function normalizeReasonCodes(reasonCodes: ReadonlyArray<string>): string[] {
  const normalized = reasonCodes
    .filter((code): code is string => typeof code === "string" && code.trim().length > 0)
    .map((code) => code.trim());
  return [...new Set(normalized)].sort();
}

function toFailureClassFromStatus(status: CapabilityExecutionStatus): CapabilityExecutionFailureClass {
  switch (status) {
    case "not_found":
      return "capability_not_found";
    case "invalid":
      return "invalid_request";
    case "unavailable":
      return "capability_unavailable";
    case "blocked":
    case "denied":
      return "guard_blocked";
    case "failed":
      return "execution_exception";
    case "degraded_success":
      return "degraded_execution";
    default:
      return "none";
  }
}

function normalizeStatus(status: CapabilityResultEnvelope["status"]): CapabilityExecutionStatus {
  if (
    status === "success" ||
    status === "degraded_success" ||
    status === "blocked" ||
    status === "denied" ||
    status === "not_found" ||
    status === "invalid" ||
    status === "unavailable" ||
    status === "failed"
  ) {
    return status;
  }
  return "failed";
}

export class CapabilityExecutionHardener {
  normalizeRequest(request: CapabilityRequestEnvelope): CapabilityExecutionNormalizationResult {
    const normalized: CapabilityRequestEnvelope = {
      requestId: asString(request.requestId),
      sessionId: asString(request.sessionId),
      capabilityId: asString(request.capabilityId),
      purpose: asString(request.purpose),
      input: request.input,
      expectedOutputType: asString(request.expectedOutputType) || undefined,
      verificationMode: request.verificationMode,
      priority: request.priority,
      sourceConstraints: request.sourceConstraints
        ? {
            allowedSourceDomains: request.sourceConstraints.allowedSourceDomains
              ? [...request.sourceConstraints.allowedSourceDomains]
              : undefined,
            allowedSourceTypes: request.sourceConstraints.allowedSourceTypes
              ? [...request.sourceConstraints.allowedSourceTypes]
              : undefined,
          }
        : undefined,
      trace: cloneTrace(request.trace),
      createdAt: asString(request.createdAt) || new Date().toISOString(),
    };
    const reasonCodes: string[] = [];
    if (!normalized.requestId) reasonCodes.push("request_id_missing");
    if (!normalized.sessionId) reasonCodes.push("session_id_missing");
    if (!normalized.capabilityId) reasonCodes.push("capability_id_missing");
    if (!normalized.purpose) reasonCodes.push("purpose_missing");
    if (!Number.isFinite(Date.parse(normalized.createdAt))) reasonCodes.push("created_at_invalid");
    return {
      request: normalized,
      valid: reasonCodes.length === 0,
      reasonCodes: normalizeReasonCodes(reasonCodes),
    };
  }

  evaluateEligibility(
    registry: CapabilityRegistry,
    adaptors: ReadonlyMap<string, CapabilityAdaptor>,
    request: CapabilityRequestEnvelope
  ): CapabilityEligibilityResult {
    const capability = registry.getById(request.capabilityId);
    if (!capability) {
      return {
        eligible: false,
        status: "not_found",
        failureClass: "capability_not_found",
        reasonCodes: ["capability_not_registered"],
      };
    }

    if (!registry.isInvokable(capability.capabilityId)) {
      return {
        eligible: false,
        status: "unavailable",
        capability,
        failureClass: "capability_disabled",
        reasonCodes: [`capability_status_not_invokable:${capability.status}`],
      };
    }

    const adaptor = adaptors.get(capability.capabilityId);
    if (!adaptor) {
      return {
        eligible: false,
        status: "unavailable",
        capability,
        failureClass: "capability_unavailable",
        reasonCodes: ["capability_adaptor_missing"],
      };
    }

    const requestedOperation = asString(request.trace?.requestedOperation);
    if (requestedOperation && !capability.allowedOperations.includes(requestedOperation)) {
      return {
        eligible: false,
        status: "invalid",
        capability,
        failureClass: "operation_not_supported",
        reasonCodes: [`requested_operation_not_supported:${requestedOperation}`],
      };
    }

    const sourceType = asString(request.trace?.sourceType);
    const allowedSourceTypes = request.sourceConstraints?.allowedSourceTypes ?? [];
    if (allowedSourceTypes.length > 0 && (!sourceType || !allowedSourceTypes.includes(sourceType))) {
      return {
        eligible: false,
        status: "invalid",
        capability,
        failureClass: "context_requirements_missing",
        reasonCodes: ["source_type_not_allowed"],
      };
    }

    return {
      eligible: true,
      status: "success",
      capability,
      reasonCodes: [],
    };
  }

  buildFailureResult(input: NormalizedFailureResultInput): CapabilityResultEnvelope {
    const classification: CapabilityExecutionClassification = {
      status: input.status,
      failureClass: input.failureClass,
      reasonCodes: normalizeReasonCodes(input.reasonCodes),
      lifecycleStage: input.stage,
      degraded: input.status === "degraded_success",
    };
    return {
      requestId: input.request.requestId,
      sessionId: input.request.sessionId,
      capabilityId: input.request.capabilityId,
      status: input.status,
      errors: classification.reasonCodes,
      verificationRequired: false,
      completedAt: new Date().toISOString(),
      classification,
      diagnostics: input.diagnostics ? { ...input.diagnostics } : undefined,
    };
  }

  normalizeResult(input: NormalizeSuccessResultInput): CapabilityResultEnvelope {
    const status = normalizeStatus(input.rawResult.status);
    const reasonCodes = normalizeReasonCodes([
      ...(input.rawResult.errors ?? []),
      ...(input.reasonCodes ?? []),
    ]);
    const failureClass =
      status === "success" ? "none" : input.rawResult.classification?.failureClass ?? toFailureClassFromStatus(status);
    const classification: CapabilityExecutionClassification = {
      status,
      failureClass,
      reasonCodes,
      lifecycleStage: input.stage,
      degraded: status === "degraded_success",
    };
    const confidence =
      typeof input.rawResult.confidence === "number" && Number.isFinite(input.rawResult.confidence)
        ? Math.max(0, Math.min(1, input.rawResult.confidence))
        : undefined;
    return {
      requestId: input.request.requestId,
      sessionId: input.request.sessionId,
      capabilityId: input.request.capabilityId,
      status,
      payload: input.rawResult.payload,
      confidence,
      freshness: input.rawResult.freshness,
      sourceMetadata: input.rawResult.sourceMetadata ? { ...input.rawResult.sourceMetadata } : undefined,
      warnings: input.rawResult.warnings ? [...input.rawResult.warnings] : undefined,
      errors: reasonCodes.length > 0 ? reasonCodes : undefined,
      verificationRequired: Boolean(input.rawResult.verificationRequired),
      trace: input.rawResult.trace ? { ...input.rawResult.trace } : undefined,
      completedAt: asString(input.rawResult.completedAt) || new Date().toISOString(),
      classification,
      diagnostics: input.diagnostics ? { ...input.diagnostics } : input.rawResult.diagnostics ? { ...input.rawResult.diagnostics } : undefined,
    };
  }

  classifyExecutionError(error: unknown): {
    status: CapabilityExecutionStatus;
    failureClass: CapabilityExecutionFailureClass;
    reasonCodes: string[];
  } {
    const message = error instanceof Error ? error.message : String(error);
    const detail = message.trim().length > 0 ? message.trim() : "unknown_error";
    if (/timeout/i.test(message)) {
      return {
        status: "failed",
        failureClass: "execution_timeout",
        reasonCodes: ["capability_execution_timeout", detail],
      };
    }
    if (/dispatch|adapter|transport/i.test(message)) {
      return {
        status: "failed",
        failureClass: "adapter_dispatch_failure",
        reasonCodes: ["capability_dispatch_failure", detail],
      };
    }
    return {
      status: "failed",
      failureClass: "execution_exception",
      reasonCodes: ["capability_execution_exception", detail],
    };
  }
}
