import type { EvidenceReference } from "../../self-learning/types/evidence-reference";
import type { TaskOwnerRole } from "../types/task-owner-role";

export interface TaskReport {
  reportId: string;
  taskId: string;
  reportingRole: TaskOwnerRole;
  statusSummary: string;
  blockers: string[];
  risks: string[];
  evidence: EvidenceReference[];
  recommendations: string[];
  reportedAt: string;
}
