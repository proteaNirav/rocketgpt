import type { WorkflowNode, WorkflowStepResult } from "../workflow-types";

export type RiskDomain =
  | "env"
  | "legal"
  | "security"
  | "financial"
  | "workforce"
  | "privacy"
  | "safety";

export type ContainmentLevel = 1 | 2 | 3;

export type CrpsCat = {
  catId: string;
  version: string;
};

export type CrpsSignature = {
  crpsId: string;
  workflowId: string;
  catsInvolved: CrpsCat[];
  paramsFingerprint: string;
  riskDomains: RiskDomain[];
  impactScore: number;
  reversibilityScore: number;
  aggressivenessScore: number;
  overrideRate: number;
  confidence: number;
  recommendedLevel: ContainmentLevel;
  evidenceRefs: string[];
};

export type RiskScoringInput = {
  workflowId: string;
  nodes: WorkflowNode[];
  params?: Record<string, unknown>;
  overrideRate?: number;
  evidenceRefs?: string[];
};

export type GovernancePolicyCondition = {
  impactScoreGte?: number;
  reversibilityScoreLte?: number;
  aggressivenessScoreGte?: number;
  overrideRateGte?: number;
  confidenceGte?: number;
  domainsIncludeAny?: RiskDomain[];
  domainsIncludeAll?: RiskDomain[];
  repeatCountGte?: number;
  redLineMatch?: boolean;
  approvalsMissing?: boolean;
  simulationMissing?: boolean;
};

export type GovernancePolicyAction = {
  level: ContainmentLevel;
  explainTemplate: string;
  lockParameters?: string[];
  disableAutoExec?: boolean;
  requireApprovalCheckpoint?: boolean;
  requireSimulationReport?: boolean;
  blockExecution?: boolean;
  openIncident?: boolean;
  silent?: boolean;
};

export type GovernancePolicyRule = {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  conditions: GovernancePolicyCondition;
  action: GovernancePolicyAction;
};

export type PolicyContext = {
  repeatCount: number;
  redLineMatch: boolean;
  approvalsMissing: boolean;
  simulationMissing: boolean;
};

export type PolicyDecision = {
  matchedRuleId: string | null;
  matchedRuleName: string | null;
  containmentLevel: ContainmentLevel;
  explanation: string;
  action: GovernancePolicyAction;
};

export type ContainmentDecision = {
  level: ContainmentLevel;
  allowExecution: boolean;
  requireApprovalCheckpoint: boolean;
  disableAutoExec: boolean;
  lockParameters: string[];
  requireSimulationReport: boolean;
  blockExecution: boolean;
  openIncident: boolean;
  silent: boolean;
  explanation: string;
};

export type SimulationAlternative = {
  strategy: "aggressive" | "balanced" | "conservative";
  expectedBenefit: string;
  riskTradeoff: string;
};

export type SimulationReport = {
  horizons: {
    d30: string;
    d90: string;
    d365: string;
  };
  secondOrderChecklist: string[];
  alternatives: SimulationAlternative[];
};

export type ForesightTaskStatus = "open" | "in_review" | "resolved";

export type ForesightTask = {
  id: string;
  crpsId: string;
  summary: string;
  whyItMatters: string;
  scenarios: {
    best: string;
    likely: string;
    worst: string;
  };
  stopConditions: string[];
  mitigationIfLate: string;
  recommendedPolicyChanges: string[];
  recommendedCatPatches: string[];
  domainQueues: RiskDomain[];
  status: ForesightTaskStatus;
  createdAt: string;
};

export type WeeklyDigestSnapshot = {
  id: string;
  weekStart: string;
  weekEnd: string;
  topPatterns: Array<{
    crpsId: string;
    count: number;
    trend: "new" | "up" | "flat";
    riskDomains: RiskDomain[];
  }>;
  l2l3Events: Array<{
    containmentEventId: string;
    level: ContainmentLevel;
    workflowId: string;
    crpsId: string;
    occurredAt: string;
    explanation: string;
  }>;
  newPatterns: string[];
  policyAdjustmentProposals: string[];
  generatedAt: string;
};

export type GovernanceLedgerEventType =
  | "risk_eval"
  | "containment_applied"
  | "foresight_task_created"
  | "weekly_digest_published";

export type GovernanceLedgerEvent = {
  id: string;
  eventType: GovernanceLedgerEventType;
  runId: string | null;
  workflowId: string;
  crpsId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type GovernancePreflightInput = {
  runId: string;
  workflowId: string;
  nodes: WorkflowNode[];
  params?: Record<string, unknown>;
  actorId?: string | null;
  orgId?: string | null;
};

export type GovernancePreflightResult = {
  crps: CrpsSignature;
  policyDecision: PolicyDecision;
  containment: ContainmentDecision;
  simulationReport: SimulationReport | null;
};

export type GovernancePostRunInput = {
  runId: string;
  workflowId: string;
  crpsId: string;
  results: WorkflowStepResult[];
};

