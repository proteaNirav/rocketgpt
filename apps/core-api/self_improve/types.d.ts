export type FindingType =
  | "ci_failure"
  | "policy_violation"
  | "replay_drift"
  | "perf_regression"
  | "ux_dead_end"
  | "security_risk"
  | "docs_gap";

export type FindingSeverity = "info" | "warn" | "error" | "critical";

export interface SelfImproveFinding {
  id: string;
  type: FindingType;
  severity: FindingSeverity;
  summary: string;
  evidence_refs: string[];
  impacted_paths?: string[];
  metadata?: Record<string, unknown>;
}

export interface ProposalScope {
  allowed_paths: string[];
  disallowed_paths: string[];
  max_files_changed: number;
}

export interface ProposalChange {
  kind: "code" | "test" | "docs" | "config";
  path: string;
  rationale: string;
}

export interface ProposalPlan {
  scope: ProposalScope;
  changes: ProposalChange[];
  risk: "low" | "medium" | "high";
  rollback: string;
}

export interface ProposalVerification {
  required_checks: string[];
  commands: string[];
}

export interface ProposalApprovals {
  requires_human: boolean;
  auto_merge_allowed: boolean;
}

export interface SelfImproveProposal {
  proposal_id: string;
  finding: {
    type: FindingType;
    severity: FindingSeverity;
    summary: string;
    evidence_refs: string[];
  };
  plan: ProposalPlan;
  verification: ProposalVerification;
  approvals: ProposalApprovals;
}
