import type { ConstraintClass, PainSeverity, TrustPosture } from "../../../shared/trust/types.js";
import type { GovernanceDecisionClass, GovernanceGateHook, RuntimeEligibilityHook, SurvivalState } from "../../../shared/policy/types.js";
export type AllowedActionClass = "read_metadata" | "inspect_process_state" | "stage_artifact" | "bounded_file_write" | "bounded_config_write";
export type DeniedActionClass = "raw_shell" | "privilege_escalation" | "unbounded_filesystem_mutation" | "network_reconfiguration" | "identity_key_access";
export interface BoundedTargetReference {
    targetType: "file" | "directory" | "artifact" | "config" | "process";
    targetRef: string;
    boundedScope: string;
}
export interface PolicyCheckPlaceholder {
    policyRef: string;
    governanceDecisionClass?: GovernanceDecisionClass;
    validationRequired: boolean;
    governanceHooks?: GovernanceGateHook[];
}
export interface SafeModeInterruptionPlaceholder {
    interruptibleStates: Extract<SurvivalState, "safe_mode" | "emergency_stop" | "node_isolated">[];
    failClosed: boolean;
}
export interface OsActionRequest {
    actionId: string;
    actionClass: AllowedActionClass;
    target: BoundedTargetReference;
    policyCheck: PolicyCheckPlaceholder;
    deniedActions: DeniedActionClass[];
    survivalInterruption: SafeModeInterruptionPlaceholder;
    runtimeEligibilityHooks?: RuntimeEligibilityHook[];
    traceId?: string;
    taskId?: string;
}
export interface OsActionResultEnvelope {
    actionId: string;
    status: "accepted" | "rejected" | "interrupted" | "completed";
    summary: string;
    trustPosture: Extract<TrustPosture, "locked" | "guarded" | "normal" | "degraded">;
    constraintClasses: ConstraintClass[];
    painSeverity?: PainSeverity;
    evidenceRefs: string[];
}
export interface OsAdapterBoundary {
    validateAction(request: OsActionRequest): OsActionResultEnvelope;
    interruptAction(actionId: string, survivalState: Extract<SurvivalState, "safe_mode" | "emergency_stop" | "node_isolated">): OsActionResultEnvelope;
}
