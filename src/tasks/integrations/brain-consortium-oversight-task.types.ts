import type {
  TaskAssignmentFromActionResult,
  TaskCreationFromActionResult,
  TaskEscalationFromActionResult,
  TaskLifecycleFromActionResult,
  TaskReportFromActionResult,
} from "../adapters/task-governance-adapter.types";
import type { TaskGovernanceAction } from "../adapters/task-governance-action";
import type { BrainConsortiumOversightTask } from "./brain-consortium-oversight-task";

export type BrainOversightReportState =
  | "in_analysis"
  | "findings_ready"
  | "blocked"
  | "risk_detected"
  | "recommendation_ready"
  | "completed";

export type BrainOversightEscalationKind =
  | "constitutional_concern"
  | "governance_conflict"
  | "severe_operational_risk"
  | "insufficient_evidence"
  | "unresolved_contradiction";

export interface BrainOversightReportInput {
  oversightTaskId: string;
  brainWorkerId?: string;
  summary: string;
  state: BrainOversightReportState;
  findings?: string[];
  blockers?: string[];
  risks?: string[];
  recommendations?: string[];
  evidenceReferences?: BrainConsortiumOversightTask["evidenceReferences"];
  occurredAt?: string;
}

export interface BrainOversightEscalationInput {
  oversightTaskId: string;
  brainWorkerId?: string;
  kind: BrainOversightEscalationKind;
  reason: string;
  occurredAt?: string;
}

export interface BrainConsortiumOversightTaskCreateResult {
  oversightTask: BrainConsortiumOversightTask;
  action: TaskGovernanceAction;
  taskResult: TaskCreationFromActionResult;
}

export interface BrainConsortiumOversightTaskAssignmentResult {
  oversightTaskId: string;
  action: TaskGovernanceAction;
  taskResult: TaskAssignmentFromActionResult;
}

export interface BrainConsortiumOversightTaskReportResult {
  oversightTaskId: string;
  action: TaskGovernanceAction;
  taskResult: TaskReportFromActionResult;
  lifecycleResult: TaskLifecycleFromActionResult;
}

export interface BrainConsortiumOversightTaskEscalationResult {
  oversightTaskId: string;
  action: TaskGovernanceAction;
  taskResult: TaskEscalationFromActionResult;
}
