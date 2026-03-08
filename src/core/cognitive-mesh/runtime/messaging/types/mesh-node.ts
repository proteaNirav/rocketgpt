export type MeshNodeClass =
  | "cat"
  | "learner"
  | "librarian"
  | "router"
  | "planner"
  | "memory"
  | "research"
  | "analyst"
  | "governance"
  | "execution";

export interface MeshNode {
  nodeId: string;
  nodeClass: MeshNodeClass;
  defaultStopId?: string;
}
