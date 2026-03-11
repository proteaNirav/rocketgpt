import type { TaskAssignmentFromActionResult, TaskCreationFromActionResult, TaskEscalationFromActionResult, TaskLifecycleFromActionResult, TaskReportFromActionResult } from "../adapters/task-governance-adapter.types";
import type { TaskGovernanceAction } from "../adapters/task-governance-action";
import type { LearnerBuilderWorkUnit } from "./learner-builder-work-unit";

export type BuilderWorkUnitReportState = "in_progress" | "completed" | "blocked" | "needs_clarification";

export type BuilderWorkUnitEscalationKind =
  | "missing_dependency"
  | "unclear_acceptance_criteria"
  | "insufficient_context"
  | "policy_constraint";

export interface BuilderWorkUnitReportInput {
  workUnitId: string;
  builderWorkerId?: string;
  summary: string;
  state: BuilderWorkUnitReportState;
  blockers?: string[];
  risks?: string[];
  recommendations?: string[];
  evidenceReferences?: LearnerBuilderWorkUnit["evidenceReferences"];
  occurredAt?: string;
}

export interface BuilderWorkUnitEscalationInput {
  workUnitId: string;
  builderWorkerId?: string;
  kind: BuilderWorkUnitEscalationKind;
  reason: string;
  occurredAt?: string;
}

export interface LearnerBuilderWorkUnitCreateResult {
  workUnit: LearnerBuilderWorkUnit;
  action: TaskGovernanceAction;
  taskResult: TaskCreationFromActionResult;
}

export interface LearnerBuilderWorkUnitAssignmentResult {
  workUnitId: string;
  action: TaskGovernanceAction;
  taskResult: TaskAssignmentFromActionResult;
}

export interface LearnerBuilderWorkUnitReportResult {
  workUnitId: string;
  action: TaskGovernanceAction;
  taskResult: TaskReportFromActionResult;
  lifecycleResult: TaskLifecycleFromActionResult;
}

export interface LearnerBuilderWorkUnitEscalationResult {
  workUnitId: string;
  action: TaskGovernanceAction;
  taskResult: TaskEscalationFromActionResult;
}
