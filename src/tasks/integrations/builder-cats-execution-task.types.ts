import type {
  TaskAssignmentFromActionResult,
  TaskCreationFromActionResult,
  TaskEscalationFromActionResult,
  TaskLifecycleFromActionResult,
  TaskReportFromActionResult,
} from "../adapters/task-governance-adapter.types";
import type { TaskGovernanceAction } from "../adapters/task-governance-action";
import type { BuilderCatsExecutionTask } from "./builder-cats-execution-task";

export type CatsExecutionReportState =
  | "in_execution"
  | "result_ready"
  | "blocked"
  | "needs_builder_clarification"
  | "completed";

export type CatsExecutionEscalationKind =
  | "missing_input"
  | "dependency_not_satisfied"
  | "policy_constraint"
  | "incompatible_execution_scope"
  | "runtime_precondition_missing";

export interface CatsExecutionReportInput {
  executionTaskId: string;
  catsWorkerId?: string;
  summary: string;
  state: CatsExecutionReportState;
  blockers?: string[];
  risks?: string[];
  recommendations?: string[];
  evidenceReferences?: BuilderCatsExecutionTask["evidenceReferences"];
  occurredAt?: string;
}

export interface CatsExecutionEscalationInput {
  executionTaskId: string;
  catsWorkerId?: string;
  kind: CatsExecutionEscalationKind;
  reason: string;
  occurredAt?: string;
}

export interface BuilderCatsExecutionTaskCreateResult {
  executionTask: BuilderCatsExecutionTask;
  action: TaskGovernanceAction;
  taskResult: TaskCreationFromActionResult;
}

export interface BuilderCatsExecutionTaskAssignmentResult {
  executionTaskId: string;
  action: TaskGovernanceAction;
  taskResult: TaskAssignmentFromActionResult;
}

export interface BuilderCatsExecutionTaskReportResult {
  executionTaskId: string;
  action: TaskGovernanceAction;
  taskResult: TaskReportFromActionResult;
  lifecycleResult: TaskLifecycleFromActionResult;
}

export interface BuilderCatsExecutionTaskEscalationResult {
  executionTaskId: string;
  action: TaskGovernanceAction;
  taskResult: TaskEscalationFromActionResult;
}
