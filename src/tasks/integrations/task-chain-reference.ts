import type { TaskHandoffFlowId } from "./task-handoff-flow-id";

export interface TaskChainReference {
  traceId: string;
  parentTaskId?: string;
  upstreamTaskId?: string;
  downstreamTaskId?: string;
  handoffFlowId: TaskHandoffFlowId;
  edgeLabel?: string;
  createdAt: string;
  metadata?: Record<string, string>;
}

export type TaskChainReferenceCreateInput = Omit<TaskChainReference, "traceId" | "createdAt"> &
  Partial<Pick<TaskChainReference, "traceId" | "createdAt">>;
