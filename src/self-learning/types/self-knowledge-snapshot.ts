import type { SelfLearningItem } from "./self-learning-item";

export interface SelfKnowledgeSnapshot {
  snapshotVersion: string;
  createdAt: string;
  items: SelfLearningItem[];
}
