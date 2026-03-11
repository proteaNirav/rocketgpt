import type { ConstraintClass, PainSeverity, TrustPosture } from "../../../shared/trust/types.js";
import type { GovernanceDecisionClass, GovernanceGateHook, RuntimeEligibilityHook, SurvivalState } from "../../../shared/policy/types.js";
export interface CatCapabilityDeclaration {
    capabilityId: string;
    capabilityName: string;
    boundedScopes: string[];
}
export interface CatTrustHealthPlaceholder {
    trustPosture: TrustPosture;
    healthState: "healthy" | "constrained" | "degraded" | "unavailable";
}
export interface CatsGovernanceRoutingMetadata {
    traceId?: string;
    taskId?: string;
    routeId?: string;
    governanceDecisionClass?: GovernanceDecisionClass;
    boundedScope: string;
    governanceHooks?: GovernanceGateHook[];
}
export interface EvidenceHookPlaceholder {
    hookId: string;
    required: boolean;
    eventType: "cat_invocation" | "cat_result" | "cat_rejection";
}
export interface CatInvocationRequest {
    invocationId: string;
    catId: string;
    capability: CatCapabilityDeclaration;
    requestedAction: string;
    metadata: CatsGovernanceRoutingMetadata;
    trustHealth: CatTrustHealthPlaceholder;
    evidenceHooks: EvidenceHookPlaceholder[];
    survivalState: SurvivalState;
    runtimeEligibilityHooks?: RuntimeEligibilityHook[];
}
export interface CatExecutionEnvelope {
    invocationId: string;
    accepted: boolean;
    policyRef?: string;
    validationRequired: boolean;
    conditionedTrust: Extract<TrustPosture, "locked" | "guarded" | "normal" | "degraded">;
}
export interface CatResultEnvelope {
    invocationId: string;
    status: "accepted" | "rejected" | "interrupted" | "completed";
    summary: string;
    trustPosture: Extract<TrustPosture, "locked" | "guarded" | "normal" | "degraded">;
    governanceDecisionClass?: GovernanceDecisionClass;
    constraintClasses: ConstraintClass[];
    painSeverity?: PainSeverity;
    evidenceRefs: string[];
}
export interface CatsGatewayBoundary {
    registerCapability(catId: string, capability: CatCapabilityDeclaration): void;
    prepareInvocation(request: CatInvocationRequest): CatExecutionEnvelope;
    completeInvocation(request: CatInvocationRequest): CatResultEnvelope;
}
