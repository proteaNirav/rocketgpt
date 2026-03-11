import type { SelfLearningPriority } from "./self-learning-priority";

export interface LearningGap {
  gapId: string;
  title: string;
  priority: SelfLearningPriority;
  reason: string;
}
