import type { TaskChainReference } from "./task-chain-reference";

export interface TaskChainTraceResult {
  taskId: string;
  rootTaskId: string;
  taskIds: string[];
  references: TaskChainReference[];
}

export interface AttachDownstreamTaskInput {
  parentTaskId: string;
  downstreamTaskId: string;
  handoffFlowId: TaskChainReference["handoffFlowId"];
  edgeLabel?: string;
  createdAt?: string;
  metadata?: Record<string, string>;
}
