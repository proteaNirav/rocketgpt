export type MotivatedRecallMode = "none" | "explicit" | "implicit" | "hybrid";

export interface MotivatedRecallSignalSet {
  goalRelevance: number;
  riskIndicator: number;
  repetitionIndicator: number;
  unresolvedContextRelevance: number;
  priorExperienceUsefulness: number;
  experienceLayerMatch: number;
  learnerOutputRelevance: number;
  analysisResultRelevance: number;
  catHelpSignal: number;
  repairRequirementSignal: number;
  creativeNeedSignal: number;
  dreamMemoryRelevance: number;
}

export interface MotivatedRecallInput {
  sessionId: string;
  capabilityId: string;
  routeType?: string;
  sourceType: string;
  signals: MotivatedRecallSignalSet;
  thresholds?: {
    low?: number;
    high?: number;
  };
}

export interface MotivatedRecallDecision {
  enableRecall: boolean;
  recallMode: MotivatedRecallMode;
  score: number;
  confidence: number;
  reasons: string[];
  signalsTriggered: string[];
}
