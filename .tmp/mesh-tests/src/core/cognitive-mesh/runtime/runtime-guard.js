"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeGuard = exports.RuntimeGuardDeniedError = void 0;
exports.normalizeRuntimeGuardContext = normalizeRuntimeGuardContext;
exports.executeWithRuntimeGuard = executeWithRuntimeGuard;
class RuntimeGuardDeniedError extends Error {
    constructor(decision, context) {
        super(`runtime_guard_denied:${decision.reasons.map((reason) => reason.code).join(",") || "unknown_reason"}`);
        this.decision = decision;
        this.context = context;
        this.name = "RuntimeGuardDeniedError";
    }
}
exports.RuntimeGuardDeniedError = RuntimeGuardDeniedError;
function asNonEmptyText(value) {
    if (typeof value !== "string") {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
function normalizeSafeModeState(input) {
    if (typeof input === "boolean") {
        return { enabled: input, source: "metadata" };
    }
    if (input && typeof input.enabled === "boolean") {
        return input;
    }
    const envValue = String(process.env.RGPT_SAFE_MODE ?? "").toLowerCase();
    const enabled = envValue === "1" || envValue === "true" || envValue === "yes" || envValue === "on";
    return {
        enabled,
        source: enabled ? "env" : "default",
    };
}
function normalizeRuntimeGuardContext(input) {
    const actionType = input.actionType ?? "unknown";
    const policyFlags = {
        explicitDeny: Boolean(input.policyFlags?.explicitDeny),
        allowInSafeMode: Boolean(input.policyFlags?.allowInSafeMode),
        allowDegradedInSafeMode: input.policyFlags?.allowDegradedInSafeMode !== false,
        forceDegraded: Boolean(input.policyFlags?.forceDegraded),
        requireAudit: Boolean(input.policyFlags?.requireAudit),
        requireAuditForHighRisk: input.policyFlags?.requireAuditForHighRisk === true,
    };
    return {
        actionType,
        actor: asNonEmptyText(input.actor) ?? "unknown_actor",
        source: asNonEmptyText(input.source) ?? "unknown_source",
        target: asNonEmptyText(input.target) ?? "unknown_target",
        requestedOperation: asNonEmptyText(input.requestedOperation) ?? "unspecified_operation",
        sensitivityHints: (input.sensitivityHints ?? []).map((hint) => String(hint)).filter((hint) => hint.length > 0),
        riskHint: input.riskHint ?? "unknown",
        safeMode: normalizeSafeModeState(input.safeMode),
        policyFlags,
        ids: {
            correlationId: asNonEmptyText(input.ids?.correlationId),
            executionId: asNonEmptyText(input.ids?.executionId),
            requestId: asNonEmptyText(input.ids?.requestId),
        },
        protectedAction: input.protectedAction ?? actionType !== "unknown",
    };
}
class RuntimeGuard {
    evaluate(input) {
        const context = normalizeRuntimeGuardContext(input);
        const reasons = [];
        if (context.policyFlags.explicitDeny) {
            reasons.push({
                code: "policy_explicit_deny",
                detail: "runtime policy explicitly denied the requested operation",
            });
            return this.makeDecision(context, "deny", reasons);
        }
        if (context.safeMode.enabled && context.protectedAction && !context.policyFlags.allowInSafeMode) {
            if (context.policyFlags.allowDegradedInSafeMode) {
                reasons.push({
                    code: "safe_mode_degraded_allow",
                    detail: "safe mode requires degraded execution path",
                });
                return this.makeDecision(context, "degraded_allow", reasons);
            }
            reasons.push({
                code: "safe_mode_protected_action",
                detail: "safe mode redirected protected operation",
            });
            return this.makeDecision(context, "safe_mode_redirect", reasons);
        }
        if (context.policyFlags.forceDegraded) {
            reasons.push({
                code: "policy_forced_degraded_allow",
                detail: "runtime policy forced degraded allow path",
            });
            return this.makeDecision(context, "degraded_allow", reasons);
        }
        const isHighRisk = context.riskHint === "high" || context.riskHint === "critical";
        const missingCorrelation = context.protectedAction && !context.ids.correlationId && !context.ids.executionId && !context.ids.requestId;
        if ((isHighRisk && context.policyFlags.requireAuditForHighRisk) || context.policyFlags.requireAudit || missingCorrelation) {
            reasons.push({
                code: isHighRisk ? "high_risk_requires_audit" : context.policyFlags.requireAudit ? "policy_requires_audit" : "missing_correlation_context",
                detail: isHighRisk
                    ? "high risk action requires runtime audit marker"
                    : context.policyFlags.requireAudit
                        ? "runtime policy requires audit marker"
                        : "protected action missing correlation context",
            });
            return this.makeDecision(context, "require_audit", reasons);
        }
        reasons.push({
            code: "default_allow",
            detail: "no guardrail rule blocked this runtime action",
        });
        return this.makeDecision(context, "allow", reasons);
    }
    makeDecision(context, outcome, reasons) {
        const allowed = outcome !== "deny" && outcome !== "safe_mode_redirect";
        return {
            outcome,
            allowed,
            requiresAudit: outcome === "require_audit",
            degraded: outcome === "degraded_allow",
            reasons,
            evaluatedAt: new Date().toISOString(),
            actionType: context.actionType,
            requestedOperation: context.requestedOperation,
            ids: { ...context.ids },
        };
    }
}
exports.RuntimeGuard = RuntimeGuard;
async function executeWithRuntimeGuard(guard, input, handlers) {
    const context = normalizeRuntimeGuardContext(input);
    const decision = guard.evaluate(context);
    if (decision.outcome === "deny") {
        throw new RuntimeGuardDeniedError(decision, context);
    }
    if (decision.outcome === "safe_mode_redirect") {
        if (!handlers.onSafeModeRedirect) {
            throw new RuntimeGuardDeniedError(decision, context);
        }
        return {
            decision,
            value: await handlers.onSafeModeRedirect(decision, context),
        };
    }
    if (decision.outcome === "require_audit") {
        await handlers.onRequireAudit?.(decision, context);
    }
    if (decision.outcome === "degraded_allow") {
        await handlers.onDegradedAllow?.(decision, context);
    }
    return {
        decision,
        value: await handlers.execute(),
    };
}
