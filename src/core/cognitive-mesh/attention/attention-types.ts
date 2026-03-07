export type AttentionKind = "task" | "signal" | "memory" | "reasoning" | "workflow";
export type AttentionBand = "critical" | "high" | "normal" | "low";

export interface AttentionInput {
  id: string;
  source: string;
  kind: AttentionKind;
  urgency: number;
  uncertainty: number;
  risk: number;
  novelty: number;
  userImpact: number;
  strategicValue: number;
  deadlineTs?: number;
  createdAtTs: number;
  metadata?: Record<string, unknown>;
}

export interface AttentionResult {
  id: string;
  score: number;
  band: AttentionBand;
  reasons: string[];
  computedAtTs: number;
}

