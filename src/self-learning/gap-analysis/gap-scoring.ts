import type { LearningGap } from "../types/learning-gap";

export function scoreLearningGap(gap: LearningGap): number {
  // TODO: replace with governed scoring logic.
  return gap.priority === "critical" ? 100 : 50;
}
