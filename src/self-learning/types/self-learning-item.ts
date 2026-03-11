import type { EvidenceReference } from "./evidence-reference";
import type { LearningReviewStage } from "./learning-review-stage";
import type { SelfLearningCategory } from "./self-learning-category";
import type { SelfLearningConfidence } from "./self-learning-confidence";
import type { SelfLearningPriority } from "./self-learning-priority";
import type { SelfLearningState } from "./self-learning-state";

export interface SelfLearningItem {
  learningId: string;
  title: string;
  category: SelfLearningCategory;
  state: SelfLearningState;
  confidence: SelfLearningConfidence;
  priority: SelfLearningPriority;
  evidenceReferences: EvidenceReference[];
  reviewStage: LearningReviewStage;
}
