export enum CognitiveSignalPriority {
  CRITICAL = "CRITICAL",
  HIGH = "HIGH",
  NORMAL = "NORMAL",
  LOW = "LOW",
  BACKGROUND = "BACKGROUND",
}

const PRIORITY_WEIGHT: Record<CognitiveSignalPriority, number> = {
  [CognitiveSignalPriority.CRITICAL]: 100,
  [CognitiveSignalPriority.HIGH]: 80,
  [CognitiveSignalPriority.NORMAL]: 60,
  [CognitiveSignalPriority.LOW]: 40,
  [CognitiveSignalPriority.BACKGROUND]: 20,
};

export function getSignalPriorityWeight(priority: CognitiveSignalPriority): number {
  return PRIORITY_WEIGHT[priority];
}

