import { createHash } from "node:crypto";

export type CanonicalTimelineLayer = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type CanonicalTimelineStage =
  | "dispatch_evaluated"
  | "dispatch_started"
  | "dispatch_completed"
  | "dispatch_denied"
  | "runtime_evaluated"
  | "execution_started"
  | "execution_completed"
  | "execution_failed"
  | "execution_denied"
  | "execution_redirected"
  | "execution_degraded"
  | "execution_audit_required"
  | "side_effect_intent"
  | "side_effect_completed";

export type CanonicalTimelineEventType =
  | "DISPATCH_GUARD_EVALUATED"
  | "DISPATCH_STARTED"
  | "DISPATCH_COMPLETED"
  | "DISPATCH_DENIED"
  | "RUNTIME_GUARD_TRIGGERED"
  | "EXECUTION_STARTED"
  | "EXECUTION_COMPLETED"
  | "EXECUTION_FAILED"
  | "EXECUTION_DENIED"
  | "EXECUTION_REDIRECTED"
  | "EXECUTION_DEGRADED"
  | "EXECUTION_AUDIT_REQUIRED"
  | "SIDE_EFFECT_INTENT"
  | "SIDE_EFFECT_COMPLETED";

export type CanonicalTimelineStatus = "ok" | "blocked" | "partial" | "error" | "timeout" | "aborted";

export type CanonicalTimelineActorType =
  | "system"
  | "planner"
  | "orchestrator"
  | "cat"
  | "guard"
  | "policy_gate"
  | "provider"
  | "user";

export interface CanonicalTimelineAuthority {
  authContextHash: string;
  policyProfile: string;
  roles?: string[];
  orgId?: string;
  userId?: string;
}

export interface CanonicalTimelineCorrelationIds {
  requestId?: string;
  executionId?: string;
  correlationId?: string;
  sessionId?: string;
}

export interface CanonicalTimelineGuardSummary {
  runtimeOutcome?: string;
  runtimeReasonCodes?: string[];
  dispatchOutcome?: string;
  dispatchReasonCodes?: string[];
  dispatchRerouteTarget?: string;
}

export interface CanonicalTimelineSideEffectSummary {
  intent: boolean;
  completed: boolean;
  hints?: string[];
}

export interface CanonicalTimelineEvent {
  schemaVersion: "rgpt.timeline_event.canonical.v1";
  executionId: string;
  eventId: string;
  stableIdentity: string;
  sequenceNo: number;
  timestamp: string;
  eventType: CanonicalTimelineEventType;
  category: "runtime" | "dispatch" | "execution" | "side_effect";
  layer: CanonicalTimelineLayer;
  stage: CanonicalTimelineStage;
  action: string;
  source: string;
  target: string;
  actorType: CanonicalTimelineActorType;
  mode: "normal" | "reroute" | "degraded" | "safe_mode_redirect" | "audit_required" | "unknown";
  status: CanonicalTimelineStatus;
  outcome: string;
  correlation: CanonicalTimelineCorrelationIds;
  authority: CanonicalTimelineAuthority;
  guards?: CanonicalTimelineGuardSummary;
  sideEffect?: CanonicalTimelineSideEffectSummary;
  metadata?: Record<string, unknown>;
  integrity: {
    eventHash: string;
    prevEventHash: string | null;
  };
}

export interface ExecutionLedgerLikeEntry {
  entryId: string;
  timestamp: string;
  category: "runtime" | "dispatch" | "execution" | "side_effect";
  eventType: string;
  action: string;
  source: string;
  target: string;
  ids: {
    requestId?: string;
    executionId?: string;
    correlationId?: string;
    sessionId?: string;
  };
  mode: "normal" | "reroute" | "degraded" | "safe_mode_redirect" | "audit_required" | "unknown";
  status: string;
  guard?: {
    runtime?: { outcome: string; reasons: Array<{ code: string; detail: string }> };
    dispatch?: {
      outcome: string;
      reasons: Array<{ code: string; detail: string }>;
      reroute?: { target?: string; mode?: string; route?: string };
    };
  };
  sideEffect?: {
    intent: boolean;
    completed: boolean;
    hints?: string[];
  };
  metadata?: Record<string, unknown>;
}

export interface CanonicalizeLedgerOptions {
  sequenceNo: number;
  prevEventHash: string | null;
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function stableSort(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stableSort(item));
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  const record = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort()) {
    out[key] = stableSort(record[key]);
  }
  return out;
}

function stableJson(value: unknown): string {
  return JSON.stringify(stableSort(value));
}

export function hashCanonicalJson(value: unknown): string {
  return sha256(stableJson(value));
}

export function buildCanonicalStableIdentityMaterial(entry: ExecutionLedgerLikeEntry): Record<string, unknown> {
  return {
    executionId: resolveCanonicalExecutionId(entry),
    eventType: mapEventType(entry.eventType),
    stage: mapStage(entry.eventType),
    category: entry.category,
    action: entry.action,
    source: entry.source,
    target: entry.target,
    mode: entry.mode,
    status: entry.status,
    correlation: entry.ids,
    guard: entry.guard
      ? {
          runtimeOutcome: entry.guard.runtime?.outcome,
          runtimeReasonCodes: entry.guard.runtime?.reasons.map((reason) => reason.code),
          dispatchOutcome: entry.guard.dispatch?.outcome,
          dispatchReasonCodes: entry.guard.dispatch?.reasons.map((reason) => reason.code),
          dispatchRerouteTarget: entry.guard.dispatch?.reroute?.target,
        }
      : undefined,
    sideEffect: entry.sideEffect,
  };
}

export function computeCanonicalStableIdentity(entry: ExecutionLedgerLikeEntry): string {
  return hashCanonicalJson(buildCanonicalStableIdentityMaterial(entry));
}

function mapEventType(eventType: string): CanonicalTimelineEventType {
  switch (eventType) {
    case "dispatch.guard.evaluated":
      return "DISPATCH_GUARD_EVALUATED";
    case "dispatch.started":
      return "DISPATCH_STARTED";
    case "dispatch.completed":
      return "DISPATCH_COMPLETED";
    case "dispatch.denied":
      return "DISPATCH_DENIED";
    case "runtime.guard.evaluated":
    case "runtime_repair_diagnosed":
    case "runtime_repair_attempted":
    case "runtime_repair_succeeded":
    case "runtime_repair_failed":
    case "runtime_recovery_validation_started":
    case "runtime_recovery_validation_succeeded":
    case "runtime_recovery_validation_failed":
    case "runtime_repair_skipped":
    case "runtime_repair_cooldown_active":
      return "RUNTIME_GUARD_TRIGGERED";
    case "execution.started":
      return "EXECUTION_STARTED";
    case "execution.completed":
      return "EXECUTION_COMPLETED";
    case "execution.failed":
      return "EXECUTION_FAILED";
    case "execution.denied":
      return "EXECUTION_DENIED";
    case "execution.redirected":
      return "EXECUTION_REDIRECTED";
    case "execution.degraded":
      return "EXECUTION_DEGRADED";
    case "execution.audit_required":
      return "EXECUTION_AUDIT_REQUIRED";
    case "side_effect.intent":
      return "SIDE_EFFECT_INTENT";
    default:
      return "SIDE_EFFECT_COMPLETED";
  }
}

function mapLayer(category: ExecutionLedgerLikeEntry["category"]): CanonicalTimelineLayer {
  if (category === "dispatch") {
    return 2;
  }
  if (category === "side_effect") {
    return 3;
  }
  if (category === "runtime") {
    return 5;
  }
  return 6;
}

function mapStage(eventType: string): CanonicalTimelineStage {
  switch (eventType) {
    case "dispatch.guard.evaluated":
      return "dispatch_evaluated";
    case "dispatch.started":
      return "dispatch_started";
    case "dispatch.completed":
      return "dispatch_completed";
    case "dispatch.denied":
      return "dispatch_denied";
    case "runtime.guard.evaluated":
    case "runtime_repair_diagnosed":
    case "runtime_repair_attempted":
    case "runtime_repair_succeeded":
    case "runtime_repair_failed":
    case "runtime_recovery_validation_started":
    case "runtime_recovery_validation_succeeded":
    case "runtime_recovery_validation_failed":
    case "runtime_repair_skipped":
    case "runtime_repair_cooldown_active":
      return "runtime_evaluated";
    case "execution.started":
      return "execution_started";
    case "execution.completed":
      return "execution_completed";
    case "execution.failed":
      return "execution_failed";
    case "execution.denied":
      return "execution_denied";
    case "execution.redirected":
      return "execution_redirected";
    case "execution.degraded":
      return "execution_degraded";
    case "execution.audit_required":
      return "execution_audit_required";
    case "side_effect.intent":
      return "side_effect_intent";
    default:
      return "side_effect_completed";
  }
}

function mapStatus(status: string): CanonicalTimelineStatus {
  switch (status) {
    case "denied":
      return "blocked";
    case "failed":
      return "error";
    case "redirected":
      return "aborted";
    case "degraded":
    case "audit_required":
    case "intent":
      return "partial";
    default:
      return "ok";
  }
}

function classifyActorType(entry: ExecutionLedgerLikeEntry): CanonicalTimelineActorType {
  if (entry.category === "runtime" || entry.eventType.includes("guard")) {
    return "guard";
  }
  if (entry.source.includes("orchestrator")) {
    return "orchestrator";
  }
  if (entry.source.includes("provider")) {
    return "provider";
  }
  if (entry.source.includes("cat")) {
    return "cat";
  }
  return "system";
}

export function resolveCanonicalExecutionId(entry: ExecutionLedgerLikeEntry): string {
  const executionId = entry.ids.executionId?.trim();
  if (executionId && executionId.length > 0) {
    return executionId;
  }
  const requestId = entry.ids.requestId?.trim();
  if (requestId && requestId.length > 0) {
    return `req_${requestId}`;
  }
  const sessionId = entry.ids.sessionId?.trim();
  if (sessionId && sessionId.length > 0) {
    return `sess_${sessionId}`;
  }
  return `entry_${entry.entryId}`;
}

export function canonicalizeExecutionLedgerEntry(
  entry: ExecutionLedgerLikeEntry,
  options: CanonicalizeLedgerOptions
): CanonicalTimelineEvent {
  const executionId = resolveCanonicalExecutionId(entry);
  const stage = mapStage(entry.eventType);
  const eventType = mapEventType(entry.eventType);
  const stableIdentity = computeCanonicalStableIdentity(entry);
  const eventId = `tle_${sha256(`${executionId}:${options.sequenceNo}:${stableIdentity}`).slice(0, 24)}`;
  const authorityHash = sha256(`${executionId}:${entry.source}:${entry.target}`).slice(0, 32);
  const baseEvent: Omit<CanonicalTimelineEvent, "integrity"> = {
    schemaVersion: "rgpt.timeline_event.canonical.v1",
    executionId,
    eventId,
    stableIdentity,
    sequenceNo: options.sequenceNo,
    timestamp: entry.timestamp,
    eventType,
    category: entry.category,
    layer: mapLayer(entry.category),
    stage,
    action: entry.action,
    source: entry.source,
    target: entry.target,
    actorType: classifyActorType(entry),
    mode: entry.mode,
    status: mapStatus(entry.status),
    outcome: entry.status,
    correlation: {
      requestId: entry.ids.requestId,
      executionId: entry.ids.executionId,
      correlationId: entry.ids.correlationId,
      sessionId: entry.ids.sessionId,
    },
    authority: {
      authContextHash: authorityHash,
      policyProfile: "cognitive_mesh_runtime",
    },
    guards: entry.guard
      ? {
          runtimeOutcome: entry.guard.runtime?.outcome,
          runtimeReasonCodes: entry.guard.runtime?.reasons.map((reason) => reason.code),
          dispatchOutcome: entry.guard.dispatch?.outcome,
          dispatchReasonCodes: entry.guard.dispatch?.reasons.map((reason) => reason.code),
          dispatchRerouteTarget: entry.guard.dispatch?.reroute?.target,
        }
      : undefined,
    sideEffect: entry.sideEffect
      ? {
          intent: entry.sideEffect.intent,
          completed: entry.sideEffect.completed,
          hints: entry.sideEffect.hints ? [...entry.sideEffect.hints] : undefined,
        }
      : undefined,
    metadata: entry.metadata ? { ...entry.metadata } : undefined,
  };
  const eventHash = sha256(stableJson({ ...baseEvent, prevEventHash: options.prevEventHash }));
  return {
    ...baseEvent,
    integrity: {
      eventHash,
      prevEventHash: options.prevEventHash,
    },
  };
}
