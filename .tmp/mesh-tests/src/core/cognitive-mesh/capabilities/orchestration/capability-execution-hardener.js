"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapabilityExecutionHardener = void 0;
function asString(value) {
    return typeof value === "string" ? value.trim() : "";
}
function cloneTrace(trace) {
    return trace ? { ...trace } : undefined;
}
function normalizeReasonCodes(reasonCodes) {
    const normalized = reasonCodes
        .filter((code) => typeof code === "string" && code.trim().length > 0)
        .map((code) => code.trim());
    return [...new Set(normalized)].sort();
}
function toFailureClassFromStatus(status) {
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
function normalizeStatus(status) {
    if (status === "success" ||
        status === "degraded_success" ||
        status === "blocked" ||
        status === "denied" ||
        status === "not_found" ||
        status === "invalid" ||
        status === "unavailable" ||
        status === "failed") {
        return status;
    }
    return "failed";
}
class CapabilityExecutionHardener {
    normalizeRequest(request) {
        const normalized = {
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
        const reasonCodes = [];
        if (!normalized.requestId)
            reasonCodes.push("request_id_missing");
        if (!normalized.sessionId)
            reasonCodes.push("session_id_missing");
        if (!normalized.capabilityId)
            reasonCodes.push("capability_id_missing");
        if (!normalized.purpose)
            reasonCodes.push("purpose_missing");
        if (!Number.isFinite(Date.parse(normalized.createdAt)))
            reasonCodes.push("created_at_invalid");
        return {
            request: normalized,
            valid: reasonCodes.length === 0,
            reasonCodes: normalizeReasonCodes(reasonCodes),
        };
    }
    evaluateEligibility(registry, adaptors, request) {
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
    buildFailureResult(input) {
        const classification = {
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
    normalizeResult(input) {
        const status = normalizeStatus(input.rawResult.status);
        const reasonCodes = normalizeReasonCodes([
            ...(input.rawResult.errors ?? []),
            ...(input.reasonCodes ?? []),
        ]);
        const failureClass = status === "success" ? "none" : input.rawResult.classification?.failureClass ?? toFailureClassFromStatus(status);
        const classification = {
            status,
            failureClass,
            reasonCodes,
            lifecycleStage: input.stage,
            degraded: status === "degraded_success",
        };
        const confidence = typeof input.rawResult.confidence === "number" && Number.isFinite(input.rawResult.confidence)
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
    classifyExecutionError(error) {
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
exports.CapabilityExecutionHardener = CapabilityExecutionHardener;
