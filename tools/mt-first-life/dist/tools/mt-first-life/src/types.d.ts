import type { BuilderResultContract } from "../../../builders/builder-sdk/src/index.js";
import type { BuilderAssignmentEnvelope, ResultEvidenceAttachmentContract } from "../../../shared/event-model/types.js";
import type { GovernanceDecision, GovernanceDecisionClass, GovernanceEligibility, SurvivalState, TaskLifecycle } from "../../../shared/policy/types.js";
import type { BoundaryClassification, ConstraintClass, TrustPosture, TrustRiskLevel } from "../../../shared/trust/types.js";
export interface PersistedBuilderRecord {
    builderId: string;
    builderKind: string;
    capabilities: string[];
    boundedScopes: string[];
    trustPosture: TrustPosture;
    healthStatus: "healthy" | "constrained" | "degraded" | "unavailable";
    runtimeEligibility: Array<"sandbox_runner" | "cats_gateway" | "os_adapter">;
    updatedAt: string;
}
export interface PersistedTaskRecord {
    id: string;
    type: string;
    title: string;
    requestedCapability: string;
    lifecycle: TaskLifecycle;
    payload: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
    governance: {
        decisionClass: GovernanceDecisionClass;
        eligibility: GovernanceEligibility;
        reasonCode: string;
        policyRefs: string[];
    };
    trustRisk: {
        posture: TrustPosture;
        level: TrustRiskLevel;
        boundary: BoundaryClassification;
        constraintClasses: ConstraintClass[];
    };
    assignment?: BuilderAssignmentEnvelope;
    result?: BuilderResultContract;
    verification?: {
        verified: boolean;
        verifiedAt?: string;
        verifier: string;
        note: string;
    };
}
export interface PersistedEvidenceEntry {
    evidenceId: string;
    taskId: string;
    builderId: string;
    action: string;
    resultStatus: string;
    outputArtifactPath?: string;
    timestamp: string;
    lineage: {
        sourceTaskId?: string;
        sourceTraceId?: string;
        upstreamRef?: string;
    };
    governance: {
        decisionClass: GovernanceDecisionClass;
        policyRefs: string[];
    };
    runtime: {
        surface: string;
        conditionedTrust: TrustPosture;
    };
    attachment: ResultEvidenceAttachmentContract;
}
export interface BuildersState {
    builders: PersistedBuilderRecord[];
}
export interface TasksState {
    tasks: PersistedTaskRecord[];
    rejections: Array<{
        taskId: string;
        builderId: string;
        reasonCode: string;
        detail?: string;
        timestamp: string;
    }>;
}
export interface EvidenceState {
    entries: PersistedEvidenceEntry[];
}
export interface GovernanceState {
    mode: "normal" | "guarded" | "emergency" | "recovery_only";
    constitutionVersion: string;
    decisions: Array<GovernanceDecision & {
        taskId: string;
        checkedAt: string;
        eligibility: GovernanceEligibility;
    }>;
}
export interface AwarenessState {
    selfState: "stable" | "constrained" | "distressed";
    familyState: "cohesive" | "strained" | "fragmented";
    boundaryState: "clear" | "contested" | "breached";
    unsafeTrustSignals: Array<{
        actorId: string;
        posture: string;
        reason: string;
    }>;
}
export interface RuntimeState {
    survivalState: SurvivalState;
    runtimeEligibilityDefaults: Array<"sandbox_runner" | "cats_gateway" | "os_adapter">;
    lastRunAt?: string;
}
export interface FirstLifeTaskDraft {
    title: string;
    type: "generate-document";
    requestedCapability: "document_generation";
    payload: {
        content: string;
        outputPath: string;
    };
}
