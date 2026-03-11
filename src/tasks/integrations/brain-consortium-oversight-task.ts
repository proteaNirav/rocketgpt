import type { EvidenceReference } from "../../self-learning/types/evidence-reference";
import type { TaskPriority } from "../types/task-priority";

export interface BrainConsortiumOversightTask {
  oversightTaskId: string;
  title: string;
  description: string;
  consortiumRole: "consortium";
  consortiumActorId?: string;
  consortiumActorLabel?: string;
  consortiumActorFunction?: string;
  targetBrainRole: "brain";
  targetBrainWorkerId?: string;
  priority: TaskPriority;
  oversightObjective: string;
  scope?: string[];
  constraints?: string[];
  dependencyReferences?: string[];
  evidenceReferences?: EvidenceReference[];
  reportingExpectation?: string;
  dueDate?: string;
}
