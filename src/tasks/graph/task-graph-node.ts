import type { TaskPriority } from "../types/task-priority";
import type { TaskStatus } from "../types/task-status";

export interface TaskGraphNode {
  nodeId: string;
  taskId: string;
  status: TaskStatus;
  priority: TaskPriority;
  metadata?: Record<string, string>;
}
