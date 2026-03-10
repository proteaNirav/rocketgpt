import type { CognitiveSignalPriority } from "./signal-priority";

export enum CognitiveSignalType {
  TASK_STARTED = "TASK_STARTED",
  TASK_COMPLETED = "TASK_COMPLETED",
  TASK_FAILED = "TASK_FAILED",
  WORKFLOW_STEP_ENTERED = "WORKFLOW_STEP_ENTERED",
  WORKFLOW_STEP_EXITED = "WORKFLOW_STEP_EXITED",
  INSIGHT_DISCOVERED = "INSIGHT_DISCOVERED",
  PATTERN_DETECTED = "PATTERN_DETECTED",
  NEW_KNOWLEDGE_STORED = "NEW_KNOWLEDGE_STORED",
  CONFIDENCE_HIGH = "CONFIDENCE_HIGH",
  CONFIDENCE_LOW = "CONFIDENCE_LOW",
  UNCERTAINTY_RAISED = "UNCERTAINTY_RAISED",
  AMBIGUITY_DETECTED = "AMBIGUITY_DETECTED",
  ANOMALY_DETECTED = "ANOMALY_DETECTED",
  LOGIC_CONFLICT = "LOGIC_CONFLICT",
  MODEL_DRIFT = "MODEL_DRIFT",
  CATS_FAILURE_PATTERN = "CATS_FAILURE_PATTERN",
  REASONING_REQUIRED = "REASONING_REQUIRED",
  REPLAN_REQUIRED = "REPLAN_REQUIRED",
  MEMORY_LOOKUP_REQUIRED = "MEMORY_LOOKUP_REQUIRED",
  AGENT_COLLABORATION_REQUIRED = "AGENT_COLLABORATION_REQUIRED",
  ATTENTION_REQUESTED = "ATTENTION_REQUESTED",
  ATTENTION_ESCALATED = "ATTENTION_ESCALATED",
  PRIORITY_RECALCULATED = "PRIORITY_RECALCULATED",
}

export interface CognitiveSignalContext {
  taskId?: string;
  workflowId?: string;
  nodeId?: string;
  userId?: string;
  sessionId?: string;
  confidence?: number;
  anomalyScore?: number;
  attentionScore?: number;
  executionCost?: number;
  deadlineTs?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface CognitiveSignal {
  signalId: string;
  signalType: CognitiveSignalType;
  sourceNode: string;
  targetNodes?: string[];
  timestamp: string;
  priority: CognitiveSignalPriority;
  correlationId: string;
  context?: CognitiveSignalContext;
}

