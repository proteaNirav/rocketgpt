export type PriorityQueueClass = "p0" | "p1" | "p2" | "p3";

export interface PriorityCandidate {
  id: string;
  source: string;
  attentionScore: number;
  urgency: number;
  importance: number;
  estimatedCost: number;
  blockingFactor: number;
  retryCount: number;
  createdAtTs: number;
  deadlineTs?: number;
  metadata?: Record<string, unknown>;
}

export interface PriorityDecision {
  id: string;
  priorityScore: number;
  queueClass: PriorityQueueClass;
  reasons: string[];
  computedAtTs: number;
}

export interface PriorityQueueSnapshot {
  p0: string[];
  p1: string[];
  p2: string[];
  p3: string[];
  size: number;
}

