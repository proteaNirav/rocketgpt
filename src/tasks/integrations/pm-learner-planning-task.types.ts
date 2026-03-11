import type {
  TaskAssignmentFromActionResult,
  TaskCreationFromActionResult,
  TaskEscalationFromActionResult,
  TaskLifecycleFromActionResult,
  TaskReportFromActionResult,
} from "../adapters/task-governance-adapter.types";
import type { TaskGovernanceAction } from "../adapters/task-governance-action";
import type { PmLearnerPlanningTask } from "./pm-learner-planning-task";

export type LearnerPlanningReportState =
  | "in_study"
  | "planned"
  | "in_progress"
  | "blocked"
  | "completed"
  | "recommendation_ready";

export type LearnerPlanningEscalationKind =
  | "missing_context"
  | "dependency_issue"
  | "deadline_risk"
  | "architectural_uncertainty"
  | "governance_conflict";

export interface LearnerPlanningReportInput {
  planningTaskId: string;
  learnerWorkerId?: string;
  summary: string;
  state: LearnerPlanningReportState;
  blockers?: string[];
  risks?: string[];
  recommendations?: string[];
  evidenceReferences?: PmLearnerPlanningTask["evidenceReferences"];
  occurredAt?: string;
}

export interface LearnerPlanningEscalationInput {
  planningTaskId: string;
  learnerWorkerId?: string;
  kind: LearnerPlanningEscalationKind;
  reason: string;
  occurredAt?: string;
}

export interface PmLearnerPlanningTaskCreateResult {
  planningTask: PmLearnerPlanningTask;
  action: TaskGovernanceAction;
  taskResult: TaskCreationFromActionResult;
}

export interface PmLearnerPlanningTaskAssignmentResult {
  planningTaskId: string;
  action: TaskGovernanceAction;
  taskResult: TaskAssignmentFromActionResult;
}

export interface PmLearnerPlanningTaskReportResult {
  planningTaskId: string;
  action: TaskGovernanceAction;
  taskResult: TaskReportFromActionResult;
  lifecycleResult: TaskLifecycleFromActionResult;
}

export interface PmLearnerPlanningTaskEscalationResult {
  planningTaskId: string;
  action: TaskGovernanceAction;
  taskResult: TaskEscalationFromActionResult;
}
