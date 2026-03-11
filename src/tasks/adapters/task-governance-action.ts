import type { EvidenceReference } from "../../self-learning/types/evidence-reference";
import type { TaskEscalationSeverity } from "../contracts/task-escalation-record";
import type { TaskOwnerRole } from "../types/task-owner-role";
import type { TaskPriority } from "../types/task-priority";
import type { TaskSourceLayer } from "../types/task-source-layer";
import type { TaskStatus } from "../types/task-status";
import type { TaskType } from "../types/task-type";

export type TaskGovernanceActionType =
  | "create_task"
  | "assign_task"
  | "report_task"
  | "escalate_task"
  | "update_task_status";

export interface TaskGovernanceAction {
  actionId: string;
  taskId?: string;
  title: string;
  description?: string;
  actionType: TaskGovernanceActionType;
  sourceLayer: TaskSourceLayer;
  ownerRole: TaskOwnerRole;
  actorRole?: TaskOwnerRole;
  targetRole?: TaskOwnerRole;
  targetWorkerId?: string;
  taskType?: TaskType;
  taskPriority?: TaskPriority;
  taskStatus?: TaskStatus;
  dependencies?: string[];
  dueDate?: string;
  evidenceReferences?: EvidenceReference[];
  outputs?: string[];
  reportSummary?: string;
  blockers?: string[];
  risks?: string[];
  recommendations?: string[];
  escalationReason?: string;
  escalationSeverity?: TaskEscalationSeverity;
  metadata?: Record<string, string>;
  occurredAt?: string;
}
