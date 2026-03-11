export type TaskGraphEdgeType = "dependency" | "sequence" | "blocks";

export interface TaskGraphEdge {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  edgeType: TaskGraphEdgeType;
  note?: string;
}
