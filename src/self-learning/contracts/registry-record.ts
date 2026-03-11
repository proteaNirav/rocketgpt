import type { SelfLearningItem } from "../types/self-learning-item";

export interface SelfLearningRegistryRecord {
  item: SelfLearningItem;
  firstSeen: string;
  lastSeen: string;
}
