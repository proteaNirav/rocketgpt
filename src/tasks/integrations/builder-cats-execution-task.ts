import type { EvidenceReference } from "../../self-learning/types/evidence-reference";
import type { BuilderType } from "../../builders/shared/builder-type";
import type { TaskPriority } from "../types/task-priority";

export interface BuilderCatsExecutionTask {
  executionTaskId: string;
  title: string;
  description: string;
  builderRole: "builder" | "builder_lead";
  builderActorId?: string;
  builderActorLabel?: string;
  builderTypeHints?: BuilderType[];
  targetCatsRole: "cats";
  targetCatsWorkerId?: string;
  priority: TaskPriority;
  executionIntent: string;
  scope?: string[];
  requiredInputs?: string[];
  dependencyReferences?: string[];
  evidenceReferences?: EvidenceReference[];
  policyConstraintReferences?: string[];
  dueDate?: string;
}
