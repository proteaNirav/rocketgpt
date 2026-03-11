import type { PersistedTaskRecord, FirstLifeTaskDraft } from "./types.js";
export declare function systemInit(): Promise<void>;
export declare function listBuilders(): Promise<import("./types.js").PersistedBuilderRecord[]>;
export declare function listTasks(): Promise<PersistedTaskRecord[]>;
export declare function showTask(taskId: string): Promise<PersistedTaskRecord | null>;
export declare function createTaskFromDraft(draft: FirstLifeTaskDraft): Promise<PersistedTaskRecord>;
export declare function runTask(taskId: string): Promise<PersistedTaskRecord>;
export declare function setSurvivalState(state: "normal" | "throttled" | "degraded" | "subsystem_paused" | "node_isolated" | "safe_mode" | "emergency_stop"): Promise<import("./types.js").RuntimeState>;
export declare function getSurvivalState(): Promise<import("./types.js").RuntimeState>;
export declare function listEvidence(): Promise<import("./types.js").PersistedEvidenceEntry[]>;
export declare function showEvidence(taskId: string): Promise<import("./types.js").PersistedEvidenceEntry[]>;
export declare function governanceCheck(taskId: string): Promise<{
    decisionClass: import("../../../shared/policy/types.js").GovernanceDecisionClass;
    eligibility: import("../../../shared/policy/types.js").GovernanceEligibility;
    reasonCode: string;
    policyRefs: string[];
}>;
