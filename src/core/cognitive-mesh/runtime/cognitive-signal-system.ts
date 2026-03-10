import { hashCanonicalJson } from "./timeline-canonicalizer";
import type { CapabilityResultStatus } from "../capabilities/types/capability-result.types";
import type { CapabilityVerificationOutcome } from "../capabilities/orchestration/capability-verification";
import type { LedgerIntegrityVerificationResult } from "./ledger-integrity-verifier";
import type { SideEffectDriftResult } from "./side-effect-drift-detector";
import type { NegativePathIssueCode } from "../governance/negative-path-taxonomy";

export type CognitiveRuntimeSignalType =
  | "execution_ok"
  | "degraded_execution"
  | "verification_warning"
  | "verification_rejected"
  | "guard_block"
  | "dispatch_reroute"
  | "safe_mode_redirect"
  | "integrity_warning"
  | "drift_detected"
  | "unavailable_capability"
  | "memory_candidate"
  | "experience_candidate"
  | "adoption_suppressed";

export type CognitiveRuntimeSignalCategory =
  | "execution"
  | "verification"
  | "guard"
  | "dispatch"
  | "integrity"
  | "drift"
  | "availability"
  | "adoption"
  | "memory"
  | "experience";

export type CognitiveRuntimeSignalSeverity = "info" | "low" | "medium" | "high" | "critical";

export interface CognitiveRuntimeSignalIds {
  requestId?: string;
  executionId?: string;
  correlationId?: string;
  sessionId?: string;
}

export interface CognitiveRuntimeSignal {
  schemaVersion: "rgpt.cognitive_signal.v1";
  signalId: string;
  stableIdentity: string;
  signalType: CognitiveRuntimeSignalType;
  category: CognitiveRuntimeSignalCategory;
  source: string;
  severity: CognitiveRuntimeSignalSeverity;
  priority: number;
  timestamp: string;
  ids: CognitiveRuntimeSignalIds;
  capabilityId?: string;
  routeType?: string;
  reasonCodes: string[];
  confidence?: number;
  weight?: number;
  metadata?: Record<string, unknown>;
}

export interface CreateRuntimeSignalInput {
  signalType: CognitiveRuntimeSignalType;
  category: CognitiveRuntimeSignalCategory;
  source: string;
  severity: CognitiveRuntimeSignalSeverity;
  priority?: number;
  timestamp?: string;
  ids?: CognitiveRuntimeSignalIds;
  capabilityId?: string;
  routeType?: string;
  reasonCodes?: string[];
  confidence?: number;
  weight?: number;
  metadata?: Record<string, unknown>;
}

export interface DeriveCapabilitySignalsInput {
  timestamp?: string;
  source: string;
  ids: CognitiveRuntimeSignalIds;
  capabilityId: string;
  routeType?: string;
  capabilityStatus: CapabilityResultStatus | "invocation_failed" | "none";
  capabilityVerification?: CapabilityVerificationOutcome;
  runtimeGuardOutcome?: string;
  dispatchGuardOutcome?: string;
  shouldCommit?: boolean;
  fallbackTriggered?: boolean;
  verificationRequired?: boolean;
  governanceIssues?: NegativePathIssueCode[];
  confidence?: number;
}

const SIGNAL_CATEGORY_BY_TYPE: Record<CognitiveRuntimeSignalType, CognitiveRuntimeSignalCategory> = {
  execution_ok: "execution",
  degraded_execution: "execution",
  verification_warning: "verification",
  verification_rejected: "verification",
  guard_block: "guard",
  dispatch_reroute: "dispatch",
  safe_mode_redirect: "guard",
  integrity_warning: "integrity",
  drift_detected: "drift",
  unavailable_capability: "availability",
  memory_candidate: "memory",
  experience_candidate: "experience",
  adoption_suppressed: "adoption",
};

const SIGNAL_SEVERITY_BY_TYPE: Record<CognitiveRuntimeSignalType, CognitiveRuntimeSignalSeverity> = {
  execution_ok: "info",
  degraded_execution: "medium",
  verification_warning: "medium",
  verification_rejected: "high",
  guard_block: "high",
  dispatch_reroute: "medium",
  safe_mode_redirect: "high",
  integrity_warning: "high",
  drift_detected: "high",
  unavailable_capability: "medium",
  memory_candidate: "low",
  experience_candidate: "low",
  adoption_suppressed: "high",
};

function normalizeReasonCodes(reasonCodes?: string[]): string[] {
  if (!reasonCodes || reasonCodes.length === 0) {
    return [];
  }
  return [...new Set(reasonCodes.filter((code) => typeof code === "string" && code.trim().length > 0))].sort();
}

function clampPriority(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return 50;
  }
  const normalized = Math.round(value as number);
  if (normalized < 1) {
    return 1;
  }
  if (normalized > 100) {
    return 100;
  }
  return normalized;
}

function defaultPriorityForSeverity(severity: CognitiveRuntimeSignalSeverity): number {
  switch (severity) {
    case "critical":
      return 95;
    case "high":
      return 85;
    case "medium":
      return 65;
    case "low":
      return 45;
    default:
      return 25;
  }
}

export function createRuntimeSignal(input: CreateRuntimeSignalInput): CognitiveRuntimeSignal {
  const timestamp = input.timestamp ?? new Date().toISOString();
  const reasonCodes = normalizeReasonCodes(input.reasonCodes);
  const severity = input.severity;
  const stableIdentity = hashCanonicalJson({
    signalType: input.signalType,
    category: input.category,
    source: input.source,
    ids: input.ids ?? {},
    capabilityId: input.capabilityId,
    routeType: input.routeType,
    reasonCodes,
    metadata: input.metadata ?? {},
  });
  const streamAnchor =
    input.ids?.executionId?.trim() ||
    input.ids?.requestId?.trim() ||
    input.ids?.correlationId?.trim() ||
    input.ids?.sessionId?.trim() ||
    "global";
  const signalId = `csg_${hashCanonicalJson(`${streamAnchor}:${input.signalType}:${stableIdentity}`).slice(0, 24)}`;
  return {
    schemaVersion: "rgpt.cognitive_signal.v1",
    signalId,
    stableIdentity,
    signalType: input.signalType,
    category: input.category,
    source: input.source,
    severity,
    priority: clampPriority(input.priority ?? defaultPriorityForSeverity(severity)),
    timestamp,
    ids: {
      requestId: input.ids?.requestId,
      executionId: input.ids?.executionId,
      correlationId: input.ids?.correlationId,
      sessionId: input.ids?.sessionId,
    },
    capabilityId: input.capabilityId,
    routeType: input.routeType,
    reasonCodes,
    confidence: input.confidence,
    weight: input.weight,
    metadata: input.metadata ? { ...input.metadata } : undefined,
  };
}

function createDefaultSignal(input: Omit<CreateRuntimeSignalInput, "category" | "severity">): CognitiveRuntimeSignal {
  return createRuntimeSignal({
    ...input,
    category: SIGNAL_CATEGORY_BY_TYPE[input.signalType],
    severity: SIGNAL_SEVERITY_BY_TYPE[input.signalType],
  });
}

export class RuntimeSignalCollector {
  private readonly byId = new Map<string, CognitiveRuntimeSignal>();
  private readonly order: string[] = [];

  add(signal: CognitiveRuntimeSignal): void {
    if (this.byId.has(signal.signalId)) {
      return;
    }
    this.byId.set(signal.signalId, signal);
    this.order.push(signal.signalId);
  }

  addMany(signals: ReadonlyArray<CognitiveRuntimeSignal>): void {
    for (const signal of signals) {
      this.add(signal);
    }
  }

  list(): CognitiveRuntimeSignal[] {
    return this.order.map((id) => {
      const signal = this.byId.get(id)!;
      return {
        ...signal,
        ids: { ...signal.ids },
        reasonCodes: [...signal.reasonCodes],
        metadata: signal.metadata ? { ...signal.metadata } : undefined,
      };
    });
  }
}

export function deriveCapabilitySignals(input: DeriveCapabilitySignalsInput): CognitiveRuntimeSignal[] {
  const out: CognitiveRuntimeSignal[] = [];
  const collector = new RuntimeSignalCollector();
  const add = (signalType: CognitiveRuntimeSignalType, extras?: Partial<CreateRuntimeSignalInput>) => {
    collector.add(
      createDefaultSignal({
        signalType,
        source: input.source,
        ids: input.ids,
        timestamp: input.timestamp,
        capabilityId: input.capabilityId,
        routeType: input.routeType,
        confidence: input.confidence,
        ...extras,
      })
    );
  };

  if (input.capabilityStatus === "success") {
    add("execution_ok");
  }
  if (input.capabilityStatus === "degraded_success" || input.runtimeGuardOutcome === "degraded_allow") {
    add("degraded_execution");
  }

  if (input.runtimeGuardOutcome === "deny") {
    add("guard_block", { reasonCodes: ["runtime_guard_deny"] });
  }
  if (input.runtimeGuardOutcome === "safe_mode_redirect") {
    add("safe_mode_redirect", { reasonCodes: ["runtime_guard_safe_mode_redirect"] });
    add("guard_block", { reasonCodes: ["runtime_guard_safe_mode_redirect"] });
  }
  if (input.dispatchGuardOutcome === "reroute") {
    add("dispatch_reroute", { reasonCodes: ["dispatch_guard_reroute"] });
  }
  if (input.dispatchGuardOutcome === "deny") {
    add("guard_block", { reasonCodes: ["dispatch_guard_deny"] });
  }
  if (input.dispatchGuardOutcome === "safe_mode_redirect") {
    add("safe_mode_redirect", { reasonCodes: ["dispatch_guard_safe_mode_redirect"] });
  }

  if (input.capabilityStatus === "not_found" || input.capabilityStatus === "unavailable") {
    add("unavailable_capability");
  }

  if (input.capabilityVerification) {
    const verification = input.capabilityVerification;
    if (verification.decision === "accepted_with_warnings") {
      add("verification_warning", {
        reasonCodes: verification.reasonCodes,
        metadata: { warnings: [...verification.warnings] },
      });
    }
    if (
      verification.decision === "rejected" ||
      verification.decision === "invalid_result" ||
      verification.decision === "inconsistent_result" ||
      verification.decision === "policy_rejected"
    ) {
      add("verification_rejected", {
        reasonCodes: verification.reasonCodes,
        metadata: { verificationDecision: verification.decision },
      });
    }
    if (!verification.adoptable && (input.capabilityStatus === "success" || input.capabilityStatus === "degraded_success")) {
      add("adoption_suppressed", {
        reasonCodes: verification.reasonCodes,
        metadata: { verificationDecision: verification.decision },
      });
    }
  }

  if (input.fallbackTriggered) {
    add("adoption_suppressed", {
      reasonCodes: ["fallback_triggered"],
      metadata: { fallbackTriggered: true },
    });
  }

  if (input.shouldCommit) {
    add("memory_candidate");
  }

  if (input.capabilityStatus !== "none") {
    add("experience_candidate", {
      reasonCodes: input.governanceIssues ? [...input.governanceIssues] : [],
      metadata: { verificationRequired: input.verificationRequired === true },
    });
  }

  out.push(...collector.list());
  return out;
}

export function deriveIntegritySignals(
  integrity: LedgerIntegrityVerificationResult,
  ids: CognitiveRuntimeSignalIds,
  source = "ledger_integrity_verifier"
): CognitiveRuntimeSignal[] {
  if (integrity.summary.status === "valid") {
    return [];
  }
  return [
    createDefaultSignal({
      signalType: "integrity_warning",
      source,
      ids,
      reasonCodes: integrity.findings.slice(0, 10).map((finding) => finding.code),
      metadata: {
        status: integrity.summary.status,
        errors: integrity.summary.errorCount,
        warnings: integrity.summary.warningCount,
        partial: integrity.summary.partial,
      },
    }),
  ];
}

export function deriveDriftSignals(
  drift: SideEffectDriftResult,
  ids: CognitiveRuntimeSignalIds,
  source = "side_effect_drift_detector"
): CognitiveRuntimeSignal[] {
  if (drift.summary.status === "no_drift") {
    return [];
  }
  return [
    createDefaultSignal({
      signalType: "drift_detected",
      source,
      ids,
      reasonCodes: drift.findings.slice(0, 10).map((finding) => finding.code),
      metadata: {
        status: drift.summary.status,
        driftFindingCount: drift.summary.driftFindingCount,
        warningCount: drift.summary.warningCount,
        integrityStatus: drift.summary.integrityStatus,
      },
    }),
  ];
}

export function summarizeSignalTypes(signals: ReadonlyArray<CognitiveRuntimeSignal>): CognitiveRuntimeSignalType[] {
  return [...new Set(signals.map((signal) => signal.signalType))];
}
