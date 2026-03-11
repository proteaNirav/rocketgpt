import type { TaskOwnerRole } from "../types/task-owner-role";
import type { TaskStatus } from "../types/task-status";

export type TaskLifecycleEventType =
  | "task_created"
  | "task_status_updated"
  | "task_assigned"
  | "task_report_added"
  | "task_escalated";

export interface TaskLifecycleEvent {
  eventId: string;
  taskId: string;
  eventType: TaskLifecycleEventType;
  actorRole?: TaskOwnerRole;
  occurredAt: string;
  detail?: string;
  nextStatus?: TaskStatus;
  reportId?: string;
  escalationId?: string;
}
