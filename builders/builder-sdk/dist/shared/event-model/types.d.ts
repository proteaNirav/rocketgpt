import type { ScopedIdentityRef } from "../identity/types.js";
import type { AwarenessDriftClass, ConstraintClass, PainSeverity, TrustPosture, TrustRiskDescriptor, UnsafeTrustPostureSignal } from "../trust/types.js";
import type { GovernanceDecisionClass, GovernanceEligibility, GovernanceGateHook, RuntimeEligibilityHook, SurvivalState, TaskLifecycle, TaskRoutingGovernanceHook } from "../policy/types.js";
export interface EventEnvelope {
    eventId: string;
    eventType: string;
    actor: ScopedIdentityRef;
    timestamp: string;
    traceId?: string;
    taskId?: string;
    contractId?: string;
}
export interface EvidenceChainRef {
    previousHash?: string;
    payloadHash: string;
    eventHash: string;
}
export interface TaskEventModel extends EventEnvelope {
    lifecycle: TaskLifecycle;
}
export interface RoutingDecisionModel extends EventEnvelope {
    decisionClass: GovernanceDecisionClass;
    trustPosture: TrustPosture;
    constraintClass: ConstraintClass[];
}
export interface SurvivalSignalModel extends EventEnvelope {
    survivalState: SurvivalState;
    painSeverity: PainSeverity;
}
export type ConstraintSource = "builder" | "task" | "governance" | "evidence" | "runtime" | "os" | "human" | "network";
export interface ConstraintImpact {
    affectedTaskIds?: string[];
    affectedActorIds?: string[];
    affectedSubsystems: string[];
    boundedScope: string;
    severity: PainSeverity;
}
export interface ConstraintMitigationSuggestion {
    recommendationType: "reroute_tasks" | "throttle_input" | "pause_non_critical_work" | "send_sister_support" | "escalate_to_governance" | "enter_safe_mode";
    rationale: string;
    governanceDecisionClass: GovernanceDecisionClass;
    requiresAuthorityApproval: boolean;
    requiresSurvivalReview: boolean;
}
export interface ConstraintRecord extends EventEnvelope {
    constraintClass: ConstraintClass;
    source: ConstraintSource;
    impact: ConstraintImpact;
    mitigationSuggestions: ConstraintMitigationSuggestion[];
    evidenceRef?: string;
}
export type PainSource = "builder" | "runtime_node" | "evidence_layer" | "governance_flow" | "task_system" | "router";
export interface PainCorrelationGroup {
    correlationGroupId: string;
    traceId?: string;
    taskIds?: string[];
    actorIds?: string[];
    constraintClasses?: ConstraintClass[];
}
export interface PainSignal extends EventEnvelope {
    painSource: PainSource;
    painSeverity: PainSeverity;
    correlationGroup?: PainCorrelationGroup;
    assertedConstraintClasses?: ConstraintClass[];
    trustPosture: TrustPosture;
    requiresVerification: boolean;
    notes?: string;
}
export interface PainPropagationSignal extends EventEnvelope {
    sourcePainEventId: string;
    correlationGroup: PainCorrelationGroup;
    targetActorIds: string[];
    propagationReason: string;
}
export interface RerouteTasks {
    recommendationType: "reroute_tasks";
    taskIds: string[];
    reason: string;
}
export interface ThrottleInput {
    recommendationType: "throttle_input";
    subsystem: string;
    reason: string;
}
export interface PauseNonCriticalWork {
    recommendationType: "pause_non_critical_work";
    reason: string;
}
export interface SendSisterSupport {
    recommendationType: "send_sister_support";
    targetActorIds: string[];
    reason: string;
}
export interface EscalateToGovernance {
    recommendationType: "escalate_to_governance";
    governanceContext: string;
    reason: string;
}
export interface EnterSafeMode {
    recommendationType: "enter_safe_mode";
    subsystem: string;
    reason: string;
}
export type AdaptiveResponseSuggestion = RerouteTasks | ThrottleInput | PauseNonCriticalWork | SendSisterSupport | EscalateToGovernance | EnterSafeMode;
export interface EventGapReport extends EventEnvelope {
    gapStartTimestamp: string;
    gapEndTimestamp: string;
    affectedActorId: string;
    chainRef?: EvidenceChainRef;
}
export interface LineageInconsistencyReport extends EventEnvelope {
    affectedEntityId: string;
    expectedReference: string;
    observedReference: string;
    chainRef?: EvidenceChainRef;
}
export interface RoutingRecommendationContext {
    recommendationOnly: true;
    constraintClasses: ConstraintClass[];
    suggestedResponses: AdaptiveResponseSuggestion[];
}
export interface TaskRoutingRequest {
    requestId: string;
    taskId: string;
    taskClass: string;
    trustRisk: TrustRiskDescriptor;
    governanceHook: TaskRoutingGovernanceHook;
    recommendationContext?: RoutingRecommendationContext;
}
export interface TaskRoutingResponse {
    requestId: string;
    routeId?: string;
    eligibility: GovernanceEligibility;
    governanceHooks: GovernanceGateHook[];
    recommendationContext?: RoutingRecommendationContext;
}
export interface BuilderAssignmentEnvelope {
    assignmentId: string;
    taskId: string;
    builderId?: string;
    requestedCapability: string;
    boundedScope: string;
    trustPosture: TrustPosture;
    builderHealthState: "healthy" | "constrained" | "degraded" | "unavailable";
    governanceHooks: GovernanceGateHook[];
    runtimeEligibilityHooks: RuntimeEligibilityHook[];
}
export interface EvidenceMetadataPlaceholder {
    evidenceRef?: string;
    payloadHash?: string;
    eventType: string;
}
export interface LineagePlaceholder {
    sourceTaskId?: string;
    sourceTraceId?: string;
    upstreamRef?: string;
}
export interface ValidationPlaceholder {
    validationState: "pending" | "required" | "satisfied" | "rejected";
    validatorRefs?: string[];
}
export interface ResultEvidenceAttachmentContract {
    attachmentId: string;
    taskId: string;
    actorId: string;
    resultSummary: string;
    evidence: EvidenceMetadataPlaceholder[];
    lineage: LineagePlaceholder;
    validation: ValidationPlaceholder;
}
export interface AdaptiveFlowIntakeContract {
    intakeId: string;
    sourceSubsystem: "task" | "router" | "builder" | "runtime" | "evidence";
    painSignal?: PainSignal;
    constraintRecord?: ConstraintRecord;
    recommendationOnly: true;
}
export interface EvidenceGovernanceAlert {
    alertId: string;
    source: "event_gap" | "lineage_inconsistency";
    governanceHooks: GovernanceGateHook[];
    summary: string;
}
export interface EvidenceSurvivalAlert {
    alertId: string;
    source: "event_gap" | "lineage_inconsistency";
    survivalRecommendation: "monitor" | "safe_mode_review";
    summary: string;
}
export interface AwarenessSurvivalSignalContract {
    signalId: string;
    driftClass: AwarenessDriftClass;
    unsafeTrust?: UnsafeTrustPostureSignal;
    recommendedSurvivalState: Extract<SurvivalState, "degraded" | "safe_mode">;
    recommendationOnly: true;
}
