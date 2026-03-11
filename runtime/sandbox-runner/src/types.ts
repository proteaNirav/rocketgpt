import type { ConstraintClass, PainSeverity, TrustPosture } from "../../../shared/trust/types.js";
import type {
  GovernanceDecisionClass,
  GovernanceGateHook,
  RuntimeEligibilityHook,
  SurvivalState,
} from "../../../shared/policy/types.js";
import type {
  EventGapReport,
  LineageInconsistencyReport,
} from "../../../shared/event-model/types.js";

export interface SandboxPolicyReference {
  policyId: string;
  policyVersion: string;
  boundedScope: string;
}

export interface ResourceLimitPlaceholder {
  cpuUnits?: number;
  memoryMb?: number;
  wallClockMs?: number;
  ioOperations?: number;
}

export interface BoundedExecutionContext {
  taskId: string;
  traceId?: string;
  boundedScope: string;
  trustPosture: TrustPosture;
  survivalState: SurvivalState;
  governanceDecisionClass?: GovernanceDecisionClass;
  governanceHooks?: GovernanceGateHook[];
}

export interface ValidationHookPlaceholder {
  hookId: string;
  stage: "pre_execution" | "post_execution";
  description: string;
}

export interface EvidenceAttachmentHookPlaceholder {
  hookId: string;
  eventType: "execution_requested" | "execution_completed" | "execution_rejected";
  required: boolean;
}

export interface SurvivalInterruptionHookPlaceholder {
  hookId: string;
  triggerStates: Extract<SurvivalState, "safe_mode" | "emergency_stop" | "node_isolated">[];
  failClosed: boolean;
}

export interface BoundedExecutionRequest {
  requestId: string;
  executionType: "document" | "code" | "validation" | "ops";
  policyRef: SandboxPolicyReference;
  context: BoundedExecutionContext;
  resourceLimits: ResourceLimitPlaceholder;
  validationHooks: ValidationHookPlaceholder[];
  evidenceHooks: EvidenceAttachmentHookPlaceholder[];
  survivalHooks: SurvivalInterruptionHookPlaceholder[];
  runtimeEligibilityHooks?: RuntimeEligibilityHook[];
}

export interface ExecutionConditionedTrust {
  outputTrustPosture: Extract<TrustPosture, "locked" | "guarded" | "normal" | "degraded">;
  validationRequired: boolean;
}

export interface ExecutionResultEnvelope {
  requestId: string;
  status: "accepted" | "rejected" | "interrupted" | "completed";
  summary: string;
  conditionedTrust: ExecutionConditionedTrust;
  constraintClasses: ConstraintClass[];
  painSeverity?: PainSeverity;
  evidenceRefs: string[];
  validationRefs: string[];
  eventGapReports?: EventGapReport[];
  lineageInconsistencies?: LineageInconsistencyReport[];
}

export interface SandboxRunnerBoundary {
  describePolicy(policyRef: SandboxPolicyReference): SandboxPolicyReference;
  validateRequest(request: BoundedExecutionRequest): ExecutionResultEnvelope;
  interruptForSurvival(
    requestId: string,
    survivalState: Extract<SurvivalState, "safe_mode" | "emergency_stop" | "node_isolated">
  ): ExecutionResultEnvelope;
}
