export type SurvivalState = "normal" | "throttled" | "degraded" | "subsystem_paused" | "node_isolated" | "safe_mode" | "emergency_stop";
export type GovernanceDecisionClass = "allow" | "bounded_allow" | "deny" | "approval_required" | "emergency_stop";
export type TaskLifecycle = "created" | "queued" | "assigned" | "executing" | "completed" | "verified" | "failed" | "suspended" | "archived";
export interface GovernanceDecision {
    decisionClass: GovernanceDecisionClass;
    reasonCode: string;
    policyRefs: string[];
}
export type GovernanceHookTarget = "task_routing" | "builder_assignment" | "runtime_eligibility" | "evidence_review" | "survival_review";
export type GovernanceEligibility = "eligible" | "bounded" | "blocked";
export interface GovernanceGateHook {
    gateId: string;
    target: GovernanceHookTarget;
    decision: GovernanceDecision;
    eligibility: GovernanceEligibility;
    requiresApproval: boolean;
}
export interface TaskRoutingGovernanceHook {
    taskId: string;
    decisionClass: GovernanceDecisionClass;
    runtimeEligibility: GovernanceEligibility;
    boundedReason: string;
}
export interface RuntimeEligibilityHook {
    requestId: string;
    targetSurface: "sandbox_runner" | "cats_gateway" | "os_adapter";
    decisionClass: GovernanceDecisionClass;
    eligibility: GovernanceEligibility;
    policyRefs: string[];
}
