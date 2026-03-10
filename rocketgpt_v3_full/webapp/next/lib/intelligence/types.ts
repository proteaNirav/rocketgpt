export type IntelligenceWorkflowNode = {
  nodeId: string;
  catId: string;
  catName: string;
  category: string;
  reason: string;
  score: number;
};

export type IntelligenceWorkflowEdge = {
  fromNodeId: string;
  toNodeId: string;
  reason: string;
};

export type WorkflowPlanV1 = {
  planId: string;
  nodes: IntelligenceWorkflowNode[];
  edges: IntelligenceWorkflowEdge[];
  requiresResearch: boolean;
  confidence: number;
  rationaleSummary: string;
};

export type IQScorecardV1 = {
  questionIQ: number;
  catIQ: number;
  workflowIQ: number;
  platformIQ: number;
  signals: string[];
};

export type IntelligenceTelemetry = {
  plan_latency_ms: number;
  cache_hit: boolean;
  cats_selected_count: number;
  confidence: number;
  requiresResearch: boolean;
  cats_index_version?: string;
  improvise_rate: number;
  override_hit: boolean;
  fallback_applied: boolean;
};

export type IntelligenceResult = {
  workflowPlan: WorkflowPlanV1;
  iqScorecard: IQScorecardV1;
  confidence: number;
  requiresResearch: boolean;
  telemetry: IntelligenceTelemetry;
  cacheHit: boolean;
  overrideHit?: boolean;
  fallbackApplied?: boolean;
};
