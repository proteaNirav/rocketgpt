import type { EvidenceReference } from "../../self-learning/types/evidence-reference";
import type { TaskPriority } from "../types/task-priority";

export interface CatsOsRuntimeTask {
  runtimeTaskId: string;
  title: string;
  description: string;
  catsRole: "cats";
  catsActorId?: string;
  catsActorLabel?: string;
  targetOsRole: "os";
  targetOsWorkerId?: string;
  priority: TaskPriority;
  executionIntent: string;
  runtimeTarget?: string;
  preconditions?: string[];
  dependencyReferences?: string[];
  evidenceReferences?: EvidenceReference[];
  policyConstraintReferences?: string[];
  dueDate?: string;
}
