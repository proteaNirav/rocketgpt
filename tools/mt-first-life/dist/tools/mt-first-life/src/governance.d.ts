import type { GovernanceDecision, GovernanceEligibility } from "../../../shared/policy/types.js";
import type { PersistedTaskRecord, RuntimeState } from "./types.js";
export interface GovernanceCheckResult {
    decision: GovernanceDecision;
    eligibility: GovernanceEligibility;
}
export declare function evaluateGovernance(task: PersistedTaskRecord, runtime: RuntimeState): GovernanceCheckResult;
