export type { ConstraintClass, PainSeverity, TrustPosture, TrustRiskDescriptor } from "../../../shared/trust/types.js";
export type { AdaptiveFlowIntakeContract, BuilderAssignmentEnvelope, ResultEvidenceAttachmentContract, } from "../../../shared/event-model/types.js";
import type { AdaptiveFlowIntakeContract, BuilderAssignmentEnvelope, ResultEvidenceAttachmentContract } from "../../../shared/event-model/types.js";
import type { ConstraintClass, PainSeverity, TrustPosture, TrustRiskDescriptor } from "../../../shared/trust/types.js";
import type { GovernanceDecisionClass, GovernanceGateHook, SurvivalState, TaskLifecycle } from "../../../shared/policy/types.js";
export type BuilderKind = "doc_builder" | "code_builder" | "ops_builder" | "validation_builder";
export interface GovernanceRoutingMetadata {
    traceId?: string;
    contractId?: string;
    routeId?: string;
    decisionClass?: GovernanceDecisionClass;
    constraintClass?: ConstraintClass[];
    governanceHooks?: GovernanceGateHook[];
}
export interface BoundedTaskExecutionContext {
    taskId: string;
    goalId?: string;
    boundedScope: string;
    trustPosture: TrustPosture;
    trustRisk?: TrustRiskDescriptor;
    boundary: "self" | "family" | "trusted_external" | "untrusted_external" | "unknown";
    survivalState: SurvivalState;
    governance: GovernanceRoutingMetadata;
}
export interface BuilderTaskIntakeContract {
    taskId: string;
    title: string;
    lifecycle: Extract<TaskLifecycle, "assigned" | "executing">;
    taskType: string;
    requestedCapability: string;
    payload?: Record<string, unknown>;
    context: BoundedTaskExecutionContext;
    assignment?: BuilderAssignmentEnvelope;
}
export interface BuilderTaskAcceptanceContract {
    taskId: string;
    builderId: string;
    accepted: true;
    acceptedCapability: string;
    assignmentId?: string;
}
export interface BuilderTaskRejectionContract {
    taskId: string;
    builderId: string;
    accepted: false;
    reasonCode: "unsafe_scope" | "unclear_task" | "out_of_scope" | "trust_mismatch" | "capacity_constrained" | "governance_blocked";
    detail?: string;
    assignmentId?: string;
}
export interface EvidenceEmissionContract {
    taskId: string;
    eventType: "builder_status" | "builder_result" | "builder_pain_signal";
    payloadRef?: string;
    payloadHash?: string;
}
export interface BuilderResultContract {
    taskId: string;
    builderId: string;
    status: Extract<TaskLifecycle, "completed" | "verified" | "failed" | "suspended">;
    summary: string;
    evidence: EvidenceEmissionContract[];
    governanceHooks?: GovernanceGateHook[];
}
export interface PainSignalContract {
    builderId: string;
    taskId?: string;
    severity: PainSeverity;
    constraintClass: ConstraintClass;
    summary: string;
}
export interface BuilderCapabilityDeclaration {
    builderId: string;
    builderKind: BuilderKind;
    capabilities: string[];
    boundedScopes: string[];
}
export interface BuilderHealthDeclaration {
    builderId: string;
    status: "healthy" | "constrained" | "degraded" | "unavailable";
    trustPosture: TrustPosture;
}
export interface BuilderEvidenceAttachmentRequest {
    result: BuilderResultContract;
    attachment: ResultEvidenceAttachmentContract;
}
export interface BuilderAdaptiveFlowEmission {
    assignmentId?: string;
    adaptiveFlow: AdaptiveFlowIntakeContract;
}
export interface MishtiBuilderWorker {
    readonly capability: BuilderCapabilityDeclaration;
    declareHealth(): BuilderHealthDeclaration;
    acceptTask(task: BuilderTaskIntakeContract): BuilderTaskAcceptanceContract | BuilderTaskRejectionContract;
    rejectTask(task: BuilderTaskIntakeContract, reason: BuilderTaskRejectionContract["reasonCode"], detail?: string): BuilderTaskRejectionContract;
    executeTask(task: BuilderTaskIntakeContract): Promise<BuilderResultContract> | BuilderResultContract;
    emitResult(task: BuilderTaskIntakeContract): BuilderResultContract;
    attachEvidence(request: BuilderEvidenceAttachmentRequest): ResultEvidenceAttachmentContract;
    emitPainSignal(task: BuilderTaskIntakeContract | undefined, severity: PainSeverity, constraintClass: ConstraintClass, summary: string): PainSignalContract;
    emitAdaptiveFlow(request: BuilderAdaptiveFlowEmission): AdaptiveFlowIntakeContract;
}
