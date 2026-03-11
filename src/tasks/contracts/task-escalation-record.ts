import type { TaskOwnerRole } from "../types/task-owner-role";

export type TaskEscalationSeverity = "low" | "moderate" | "high" | "critical";

export interface TaskEscalationRecord {
  escalationId: string;
  taskId: string;
  fromRole: TaskOwnerRole;
  toRole: TaskOwnerRole;
  reason: string;
  severity: TaskEscalationSeverity;
  createdAt: string;
}
