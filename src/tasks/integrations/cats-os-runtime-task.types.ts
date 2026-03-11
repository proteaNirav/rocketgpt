import type {
  TaskAssignmentFromActionResult,
  TaskCreationFromActionResult,
  TaskEscalationFromActionResult,
  TaskLifecycleFromActionResult,
  TaskReportFromActionResult,
} from "../adapters/task-governance-adapter.types";
import type { TaskGovernanceAction } from "../adapters/task-governance-action";
import type { CatsOsRuntimeTask } from "./cats-os-runtime-task";

export type OsRuntimeReportState =
  | "in_execution"
  | "result_ready"
  | "blocked"
  | "precondition_failed"
  | "completed";

export type OsRuntimeEscalationKind =
  | "missing_runtime_target"
  | "precondition_not_satisfied"
  | "policy_constraint"
  | "incompatible_execution_scope"
  | "runtime_environment_unavailable";

export interface OsRuntimeReportInput {
  runtimeTaskId: string;
  osWorkerId?: string;
  summary: string;
  state: OsRuntimeReportState;
  blockers?: string[];
  risks?: string[];
  recommendations?: string[];
  evidenceReferences?: CatsOsRuntimeTask["evidenceReferences"];
  occurredAt?: string;
}

export interface OsRuntimeEscalationInput {
  runtimeTaskId: string;
  osWorkerId?: string;
  kind: OsRuntimeEscalationKind;
  reason: string;
  occurredAt?: string;
}

export interface CatsOsRuntimeTaskCreateResult {
  runtimeTask: CatsOsRuntimeTask;
  action: TaskGovernanceAction;
  taskResult: TaskCreationFromActionResult;
}

export interface CatsOsRuntimeTaskAssignmentResult {
  runtimeTaskId: string;
  action: TaskGovernanceAction;
  taskResult: TaskAssignmentFromActionResult;
}

export interface CatsOsRuntimeTaskReportResult {
  runtimeTaskId: string;
  action: TaskGovernanceAction;
  taskResult: TaskReportFromActionResult;
  lifecycleResult: TaskLifecycleFromActionResult;
}

export interface CatsOsRuntimeTaskEscalationResult {
  runtimeTaskId: string;
  action: TaskGovernanceAction;
  taskResult: TaskEscalationFromActionResult;
}
