import type { EvidenceReference } from "../../self-learning/types/evidence-reference";
import type { BuilderType } from "../../builders/shared/builder-type";
import type { TaskPriority } from "../types/task-priority";

export interface LearnerBuilderWorkUnit {
  workUnitId: string;
  title: string;
  description: string;
  learnerRole: "learner" | "learner_lead";
  targetBuilderRole: "builder" | "builder_lead";
  targetBuilderWorkerId?: string;
  builderTypeHints?: BuilderType[];
  priority: TaskPriority;
  acceptanceCriteria?: string[];
  dependencyReferences?: string[];
  evidenceReferences?: EvidenceReference[];
  dueDate?: string;
  expectedOutputs?: string[];
}
