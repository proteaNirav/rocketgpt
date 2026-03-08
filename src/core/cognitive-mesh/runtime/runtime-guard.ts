export type RuntimeGuardActionType =
  | "cognitive_mesh_execution"
  | "cat_execution"
  | "workflow_side_effect"
  | "provider_tool_invocation"
  | "data_sensitive_operation"
  | "unknown";

export type RuntimeGuardOutcome = "allow" | "deny" | "safe_mode_redirect" | "require_audit" | "degraded_allow";

export type RuntimeGuardRiskHint = "low" | "medium" | "high" | "critical" | "unknown";

export type RuntimeGuardReasonCode =
  | "policy_explicit_deny"
  | "safe_mode_protected_action"
  | "safe_mode_degraded_allow"
  | "policy_forced_degraded_allow"
  | "high_risk_requires_audit"
  | "policy_requires_audit"
  | "missing_correlation_context"
  | "default_allow";

export interface RuntimeGuardReason {
  code: RuntimeGuardReasonCode;
  detail: string;
}

export interface RuntimeGuardPolicyFlags {
  explicitDeny?: boolean;
  allowInSafeMode?: boolean;
  allowDegradedInSafeMode?: boolean;
  forceDegraded?: boolean;
  requireAudit?: boolean;
  requireAuditForHighRisk?: boolean;
}

export interface RuntimeGuardIds {
  correlationId?: string;
  executionId?: string;
  requestId?: string;
}

export interface RuntimeSafeModeState {
  enabled: boolean;
  source: "metadata" | "env" | "default";
}

export interface RuntimeGuardContextInput {
  actionType?: RuntimeGuardActionType;
  actor?: string;
  source?: string;
  target?: string;
  requestedOperation?: string;
  sensitivityHints?: string[];
  riskHint?: RuntimeGuardRiskHint;
  safeMode?: boolean | RuntimeSafeModeState;
  policyFlags?: RuntimeGuardPolicyFlags;
  ids?: RuntimeGuardIds;
  protectedAction?: boolean;
}

export interface RuntimeGuardContext {
  actionType: RuntimeGuardActionType;
  actor: string;
  source: string;
  target: string;
  requestedOperation: string;
  sensitivityHints: string[];
  riskHint: RuntimeGuardRiskHint;
  safeMode: RuntimeSafeModeState;
  policyFlags: Required<RuntimeGuardPolicyFlags>;
  ids: RuntimeGuardIds;
  protectedAction: boolean;
}

export interface RuntimeGuardDecision {
  outcome: RuntimeGuardOutcome;
  allowed: boolean;
  requiresAudit: boolean;
  degraded: boolean;
  reasons: RuntimeGuardReason[];
  evaluatedAt: string;
  actionType: RuntimeGuardActionType;
  requestedOperation: string;
  ids: RuntimeGuardIds;
}

export class RuntimeGuardDeniedError extends Error {
  constructor(
    readonly decision: RuntimeGuardDecision,
    readonly context: RuntimeGuardContext
  ) {
    super(`runtime_guard_denied:${decision.reasons.map((reason) => reason.code).join(",") || "unknown_reason"}`);
    this.name = "RuntimeGuardDeniedError";
  }
}

function asNonEmptyText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeSafeModeState(input: RuntimeGuardContextInput["safeMode"]): RuntimeSafeModeState {
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

export function normalizeRuntimeGuardContext(input: RuntimeGuardContextInput): RuntimeGuardContext {
  const actionType = input.actionType ?? "unknown";
  const policyFlags: Required<RuntimeGuardPolicyFlags> = {
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

export class RuntimeGuard {
  evaluate(input: RuntimeGuardContextInput): RuntimeGuardDecision {
    const context = normalizeRuntimeGuardContext(input);
    const reasons: RuntimeGuardReason[] = [];

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
    const missingCorrelation =
      context.protectedAction && !context.ids.correlationId && !context.ids.executionId && !context.ids.requestId;
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

  private makeDecision(
    context: RuntimeGuardContext,
    outcome: RuntimeGuardOutcome,
    reasons: RuntimeGuardReason[]
  ): RuntimeGuardDecision {
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

export interface RuntimeGuardExecutionHandlers<T> {
  execute: () => Promise<T> | T;
  onSafeModeRedirect?: (decision: RuntimeGuardDecision, context: RuntimeGuardContext) => Promise<T> | T;
  onRequireAudit?: (decision: RuntimeGuardDecision, context: RuntimeGuardContext) => Promise<void> | void;
  onDegradedAllow?: (decision: RuntimeGuardDecision, context: RuntimeGuardContext) => Promise<void> | void;
}

export async function executeWithRuntimeGuard<T>(
  guard: RuntimeGuard,
  input: RuntimeGuardContextInput,
  handlers: RuntimeGuardExecutionHandlers<T>
): Promise<{ decision: RuntimeGuardDecision; value: T }> {
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
