import type { CognitiveEvent, ProcessingMode } from "./cognitive-event";

export interface ReasoningStep {
  stepId: string;
  kind: string;
  summary: string;
  createdAt: string;
}

export interface ReasoningTrace {
  traceId: string;
  sessionId: string;
  eventId: string;
  mode: ProcessingMode;
  steps: ReasoningStep[];
  createdAt: string;
  cognitive?: {
    attentionScore?: number;
    priorityScore?: number;
    priorityClass?: "p0" | "p1" | "p2" | "p3";
    emittedSignals?: string[];
  };
}

export interface ReasoningPlan {
  planId: string;
  sessionId: string;
  eventId: string;
  category: string;
  selectedProcessingMode: ProcessingMode;
  recommendedNextAction: string;
  confidence: number;
  recalledContextCount: number;
  recallSources: string[];
  recallDispositionSummary: string;
  syncActions: string[];
  asyncActions: string[];
  suggestedAsyncJobs: string[];
  trace: ReasoningTrace;
}

export interface ReasoningPlanner {
  plan(
    event: CognitiveEvent,
    contextText: string,
    recall?: {
      count: number;
      sources: string[];
      dispositionSummary: string;
    }
  ): Promise<ReasoningPlan>;
}
