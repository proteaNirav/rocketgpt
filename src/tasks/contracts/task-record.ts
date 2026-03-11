import type { EvidenceReference } from "../../self-learning/types/evidence-reference";
import type { TaskAssignment } from "./task-assignment";
import type { TaskPriority } from "../types/task-priority";
import type { TaskOwnerRole } from "../types/task-owner-role";
import type { TaskSourceLayer } from "../types/task-source-layer";
import type { TaskStatus } from "../types/task-status";
import type { TaskType } from "../types/task-type";

export interface TaskRecord {
  taskId: string;
  title: string;
  taskType: TaskType;
  sourceLayer: TaskSourceLayer;
  ownerRole: TaskOwnerRole;
  assignment?: TaskAssignment;
  priority: TaskPriority;
  status: TaskStatus;
  dependencies: string[];
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  evidenceReferences?: EvidenceReference[];
  outputs?: string[];
  reportSummary?: string;
}

export type TaskRecordCreateInput = Omit<TaskRecord, "createdAt" | "updatedAt"> &
  Partial<Pick<TaskRecord, "createdAt" | "updatedAt">>;
