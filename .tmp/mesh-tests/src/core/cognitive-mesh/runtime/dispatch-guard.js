"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DispatchGuard = exports.DispatchGuardDeniedError = void 0;
exports.normalizeDispatchGuardContext = normalizeDispatchGuardContext;
exports.executeWithDispatchGuard = executeWithDispatchGuard;
class DispatchGuardDeniedError extends Error {
    constructor(decision, context) {
        super(`dispatch_guard_denied:${decision.reasons.map((reason) => reason.code).join(",") || "unknown_reason"}`);
        this.decision = decision;
        this.context = context;
        this.name = "DispatchGuardDeniedError";
    }
}
exports.DispatchGuardDeniedError = DispatchGuardDeniedError;
function asNonEmptyText(value) {
    if (typeof value !== "string") {
        return undefined;
    }
    const text = value.trim();
    return text.length > 0 ? text : undefined;
}
function normalizeDispatchGuardContext(input) {
    const policyFlags = input.policyFlags ?? {};
    return {
        category: input.category ?? "unknown",
        source: asNonEmptyText(input.source) ?? "unknown_source",
        sourceType: asNonEmptyText(input.sourceType) ?? "unknown_source_type",
        target: asNonEmptyText(input.target) ?? "unknown_target",
        targetKind: input.targetKind ?? "unknown",
        route: asNonEmptyText(input.route) ?? "unknown_route",
        mode: input.mode ?? "unknown",
        targetTrustHint: input.targetTrustHint ?? "unknown",
        targetHealthHint: input.targetHealthHint ?? "unknown",
        sensitivityHints: (input.sensitivityHints ?? [])
            .map((value) => String(value))
            .filter((value) => value.length > 0),
        safeMode: input.safeMode === true,
        policyFlags: {
            explicitDeny: policyFlags.explicitDeny === true,
            allowBlockedTargets: policyFlags.allowBlockedTargets === true,
            requireHealthyTarget: policyFlags.requireHealthyTarget === true,
            allowedModes: policyFlags.allowedModes,
            allowedRoutes: policyFlags.allowedRoutes,
            safeModeRedirect: policyFlags.safeModeRedirect !== false,
            forceRerouteTo: policyFlags.forceRerouteTo,
            forceDegraded: policyFlags.forceDegraded === true,
            requireAudit: policyFlags.requireAudit === true,
        },
        ids: {
            correlationId: asNonEmptyText(input.ids?.correlationId),
            executionId: asNonEmptyText(input.ids?.executionId),
            requestId: asNonEmptyText(input.ids?.requestId),
        },
        protectedDispatch: input.protectedDispatch ?? input.category !== "unknown",
    };
}
class DispatchGuard {
    evaluate(input) {
        const context = normalizeDispatchGuardContext(input);
        const reasons = [];
        if (context.policyFlags.explicitDeny) {
            reasons.push({ code: "policy_explicit_deny", detail: "dispatch policy explicitly denied target dispatch" });
            return this.makeDecision(context, "deny", reasons);
        }
        if (context.safeMode && context.protectedDispatch && context.policyFlags.safeModeRedirect) {
            reasons.push({ code: "safe_mode_dispatch_redirect", detail: "safe mode redirected dispatch path" });
            return this.makeDecision(context, "safe_mode_redirect", reasons);
        }
        if (!context.policyFlags.allowBlockedTargets &&
            (context.targetTrustHint === "blocked" || context.targetTrustHint === "quarantined")) {
            reasons.push({ code: "target_not_trusted", detail: "dispatch target trust level is blocked or quarantined" });
            return this.makeDecision(context, "deny", reasons);
        }
        if (context.policyFlags.requireHealthyTarget && context.targetHealthHint === "unhealthy") {
            reasons.push({ code: "target_unhealthy", detail: "dispatch target health is unhealthy" });
            return this.makeDecision(context, "deny", reasons);
        }
        if (context.policyFlags.allowedModes && !context.policyFlags.allowedModes.includes(context.mode)) {
            reasons.push({ code: "dispatch_mode_not_allowed", detail: `dispatch mode ${context.mode} is not policy allowed` });
            return this.makeDecision(context, "deny", reasons);
        }
        if (context.policyFlags.allowedRoutes && !context.policyFlags.allowedRoutes.includes(context.route)) {
            reasons.push({ code: "dispatch_route_not_allowed", detail: `dispatch route ${context.route} is not policy allowed` });
            return this.makeDecision(context, "deny", reasons);
        }
        if (context.policyFlags.forceRerouteTo) {
            reasons.push({ code: "policy_forced_reroute", detail: "dispatch policy forced explicit reroute" });
            return this.makeDecision(context, "reroute", reasons, context.policyFlags.forceRerouteTo);
        }
        if (context.policyFlags.forceDegraded) {
            reasons.push({ code: "policy_forced_degraded_allow", detail: "dispatch policy forced constrained dispatch" });
            return this.makeDecision(context, "degraded_allow", reasons);
        }
        if (context.targetHealthHint === "degraded") {
            reasons.push({
                code: "target_degraded_constrained_dispatch",
                detail: "target health is degraded; constrained dispatch path required",
            });
            return this.makeDecision(context, "degraded_allow", reasons);
        }
        if (context.policyFlags.requireAudit) {
            reasons.push({ code: "policy_requires_audit", detail: "dispatch must carry audit marker before execution" });
            return this.makeDecision(context, "require_audit", reasons);
        }
        reasons.push({ code: "default_allow", detail: "dispatch target and path passed guard checks" });
        return this.makeDecision(context, "allow", reasons);
    }
    makeDecision(context, outcome, reasons, reroute) {
        return {
            outcome,
            allowed: outcome !== "deny" && outcome !== "safe_mode_redirect",
            reroute: outcome === "reroute" ? reroute : undefined,
            requiresAudit: outcome === "require_audit",
            degraded: outcome === "degraded_allow",
            reasons,
            evaluatedAt: new Date().toISOString(),
            category: context.category,
            route: context.route,
            mode: context.mode,
            ids: { ...context.ids },
        };
    }
}
exports.DispatchGuard = DispatchGuard;
async function executeWithDispatchGuard(guard, input, handlers) {
    const context = normalizeDispatchGuardContext(input);
    const decision = guard.evaluate(context);
    if (decision.outcome === "deny") {
        throw new DispatchGuardDeniedError(decision, context);
    }
    if (decision.outcome === "safe_mode_redirect") {
        if (!handlers.onSafeModeRedirect) {
            throw new DispatchGuardDeniedError(decision, context);
        }
        return { decision, value: await handlers.onSafeModeRedirect(decision, context) };
    }
    if (decision.outcome === "reroute") {
        if (!handlers.onReroute) {
            throw new DispatchGuardDeniedError(decision, context);
        }
        return { decision, value: await handlers.onReroute(decision, context) };
    }
    if (decision.outcome === "require_audit") {
        await handlers.onRequireAudit?.(decision, context);
    }
    if (decision.outcome === "degraded_allow") {
        await handlers.onDegradedAllow?.(decision, context);
    }
    return { decision, value: await handlers.execute() };
}
