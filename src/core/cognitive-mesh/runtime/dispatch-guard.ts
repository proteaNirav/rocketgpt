export type DispatchGuardOutcome = "allow" | "deny" | "reroute" | "safe_mode_redirect" | "degraded_allow" | "require_audit";

export type DispatchCategory =
  | "mesh_job_dispatch"
  | "capability_dispatch"
  | "courier_dispatch"
  | "workflow_step_dispatch"
  | "provider_dispatch"
  | "unknown";

export type DispatchMode =
  | "sync"
  | "async"
  | "public_route"
  | "private_dispatch"
  | "secure_dispatch"
  | "emergency_dispatch"
  | "unknown";

export type DispatchTargetKind = "local" | "internal" | "external" | "provider" | "unknown";

export type DispatchTargetTrustHint = "trusted" | "restricted" | "untrusted" | "quarantined" | "blocked" | "unknown";

export type DispatchTargetHealthHint = "healthy" | "degraded" | "unhealthy" | "unknown";

export type DispatchReasonCode =
  | "policy_explicit_deny"
  | "target_not_trusted"
  | "target_unhealthy"
  | "dispatch_mode_not_allowed"
  | "dispatch_route_not_allowed"
  | "safe_mode_dispatch_redirect"
  | "policy_forced_reroute"
  | "target_degraded_constrained_dispatch"
  | "policy_forced_degraded_allow"
  | "policy_requires_audit"
  | "default_allow";

export interface DispatchReason {
  code: DispatchReasonCode;
  detail: string;
}

export interface DispatchReroutePlan {
  target?: string;
  mode?: DispatchMode;
  route?: string;
}

export interface DispatchGuardPolicyFlags {
  explicitDeny?: boolean;
  allowBlockedTargets?: boolean;
  requireHealthyTarget?: boolean;
  allowedModes?: DispatchMode[];
  allowedRoutes?: string[];
  safeModeRedirect?: boolean;
  forceRerouteTo?: DispatchReroutePlan;
  forceDegraded?: boolean;
  requireAudit?: boolean;
}

export interface DispatchGuardIds {
  correlationId?: string;
  executionId?: string;
  requestId?: string;
}

export interface DispatchGuardContextInput {
  category?: DispatchCategory;
  source?: string;
  sourceType?: string;
  target?: string;
  targetKind?: DispatchTargetKind;
  route?: string;
  mode?: DispatchMode;
  targetTrustHint?: DispatchTargetTrustHint;
  targetHealthHint?: DispatchTargetHealthHint;
  sensitivityHints?: string[];
  safeMode?: boolean;
  policyFlags?: DispatchGuardPolicyFlags;
  ids?: DispatchGuardIds;
  protectedDispatch?: boolean;
}

export interface DispatchGuardContext {
  category: DispatchCategory;
  source: string;
  sourceType: string;
  target: string;
  targetKind: DispatchTargetKind;
  route: string;
  mode: DispatchMode;
  targetTrustHint: DispatchTargetTrustHint;
  targetHealthHint: DispatchTargetHealthHint;
  sensitivityHints: string[];
  safeMode: boolean;
  policyFlags: Required<Omit<DispatchGuardPolicyFlags, "allowedModes" | "allowedRoutes" | "forceRerouteTo">> &
    Pick<DispatchGuardPolicyFlags, "allowedModes" | "allowedRoutes" | "forceRerouteTo">;
  ids: DispatchGuardIds;
  protectedDispatch: boolean;
}

export interface DispatchGuardDecision {
  outcome: DispatchGuardOutcome;
  allowed: boolean;
  reroute?: DispatchReroutePlan;
  requiresAudit: boolean;
  degraded: boolean;
  reasons: DispatchReason[];
  evaluatedAt: string;
  category: DispatchCategory;
  route: string;
  mode: DispatchMode;
  ids: DispatchGuardIds;
}

export class DispatchGuardDeniedError extends Error {
  constructor(
    readonly decision: DispatchGuardDecision,
    readonly context: DispatchGuardContext
  ) {
    super(`dispatch_guard_denied:${decision.reasons.map((reason) => reason.code).join(",") || "unknown_reason"}`);
    this.name = "DispatchGuardDeniedError";
  }
}

function asNonEmptyText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const text = value.trim();
  return text.length > 0 ? text : undefined;
}

export function normalizeDispatchGuardContext(input: DispatchGuardContextInput): DispatchGuardContext {
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

export class DispatchGuard {
  evaluate(input: DispatchGuardContextInput): DispatchGuardDecision {
    const context = normalizeDispatchGuardContext(input);
    const reasons: DispatchReason[] = [];

    if (context.policyFlags.explicitDeny) {
      reasons.push({ code: "policy_explicit_deny", detail: "dispatch policy explicitly denied target dispatch" });
      return this.makeDecision(context, "deny", reasons);
    }

    if (context.safeMode && context.protectedDispatch && context.policyFlags.safeModeRedirect) {
      reasons.push({ code: "safe_mode_dispatch_redirect", detail: "safe mode redirected dispatch path" });
      return this.makeDecision(context, "safe_mode_redirect", reasons);
    }

    if (
      !context.policyFlags.allowBlockedTargets &&
      (context.targetTrustHint === "blocked" || context.targetTrustHint === "quarantined")
    ) {
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

  private makeDecision(
    context: DispatchGuardContext,
    outcome: DispatchGuardOutcome,
    reasons: DispatchReason[],
    reroute?: DispatchReroutePlan
  ): DispatchGuardDecision {
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

export interface DispatchGuardExecutionHandlers<T> {
  execute: () => Promise<T> | T;
  onReroute?: (decision: DispatchGuardDecision, context: DispatchGuardContext) => Promise<T> | T;
  onSafeModeRedirect?: (decision: DispatchGuardDecision, context: DispatchGuardContext) => Promise<T> | T;
  onRequireAudit?: (decision: DispatchGuardDecision, context: DispatchGuardContext) => Promise<void> | void;
  onDegradedAllow?: (decision: DispatchGuardDecision, context: DispatchGuardContext) => Promise<void> | void;
}

export async function executeWithDispatchGuard<T>(
  guard: DispatchGuard,
  input: DispatchGuardContextInput,
  handlers: DispatchGuardExecutionHandlers<T>
): Promise<{ decision: DispatchGuardDecision; value: T }> {
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

