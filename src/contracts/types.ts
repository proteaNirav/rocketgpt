export type ContractVersion = "1.0";

export interface ArtifactRef {
  id: string;
  uri?: string;
  media_type?: string;
  bytes?: number;
  checksum_sha256?: string;
}

export interface WorkflowPlanStep {
  id: string;
  title: string;
  owner?: string;
  depends_on?: string[];
  estimated_ms?: number;
  max_db_queries?: number;
  artifact_refs?: ArtifactRef[];
}

export interface WorkflowPlan {
  version: ContractVersion;
  plan_id: string;
  session_id: string;
  objective: string;
  steps: WorkflowPlanStep[];
  created_at: string;
}

export interface IQScoreDimension {
  key: "correctness" | "safety" | "latency" | "cost" | "governance" | "robustness";
  score: number;
  rationale?: string;
}

export interface IQScorecard {
  version: ContractVersion;
  scorecard_id: string;
  session_id: string;
  overall_score: number;
  dimensions: IQScoreDimension[];
  flags?: string[];
  evidence_refs?: ArtifactRef[];
  generated_at: string;
}

export interface EvidencePack {
  version: ContractVersion;
  pack_id: string;
  session_id: string;
  summary?: string;
  evidence_refs: ArtifactRef[];
  generated_at: string;
}

export interface AnalysisFinding {
  code: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  evidence_ref?: ArtifactRef;
}

export interface AnalysisReport {
  version: ContractVersion;
  report_id: string;
  session_id: string;
  status: "ok" | "needs_review" | "blocked";
  workflow_plan_ref: ArtifactRef;
  scorecard_ref: ArtifactRef;
  evidence_pack_ref: ArtifactRef;
  findings?: AnalysisFinding[];
  generated_at: string;
}
