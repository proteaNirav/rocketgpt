import type { LearningItemStatus } from "@/lib/db/learningRepo";

export const LEARNING_TRANSITIONS: Record<LearningItemStatus, LearningItemStatus[]> = {
  proposed: ["approved", "rejected"],
  approved: ["published", "revoked", "deprecated"],
  published: ["revoked", "deprecated"],
  rejected: [],
  revoked: [],
  deprecated: ["revoked"],
};

export function canTransitionLearningStatus(fromStatus: LearningItemStatus, toStatus: LearningItemStatus): boolean {
  return LEARNING_TRANSITIONS[fromStatus].includes(toStatus);
}
