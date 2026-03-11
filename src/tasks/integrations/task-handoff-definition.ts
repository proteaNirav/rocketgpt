import type { TaskOwnerRole } from "../types/task-owner-role";
import type { TaskType } from "../types/task-type";
import type { TaskHandoffFlowId } from "./task-handoff-flow-id";

export interface TaskHandoffDefinition {
  flowId: TaskHandoffFlowId;
  sourceRole: TaskOwnerRole;
  targetRole: TaskOwnerRole;
  taskFamily: TaskType;
  description: string;
  integrationId: string;
  moduleReference: string;
  notes?: string[];
}
