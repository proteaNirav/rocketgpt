import type { EvidenceReference } from "../../self-learning/types/evidence-reference";
import type { TaskPriority } from "../types/task-priority";

export interface PmLearnerPlanningTask {
  planningTaskId: string;
  title: string;
  description: string;
  pmRole: "platform_pm" | "program_manager";
  targetLearnerRole: "learner" | "learner_lead";
  targetLearnerWorkerId?: string;
  priority: TaskPriority;
  objective: string;
  constraints?: string[];
  dependencyReferences?: string[];
  evidenceReferences?: EvidenceReference[];
  reportingExpectation?: string;
  dueDate?: string;
}
