import type { TaskOwnerRole } from "../types/task-owner-role";

export interface TaskAssignment {
  assigneeRole?: TaskOwnerRole;
  workerId?: string;
  assignedByRole?: TaskOwnerRole;
  assignedAt: string;
  note?: string;
}
