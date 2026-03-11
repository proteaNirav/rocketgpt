import type { TaskAssignment } from "../contracts/task-assignment";
import type { TaskEscalationRecord } from "../contracts/task-escalation-record";
import type { TaskRecord } from "../contracts/task-record";
import type { TaskReport } from "../contracts/task-report";
import type { TaskLifecycleEvent } from "../reporting/task-lifecycle-event";
import type { TaskRegistry } from "../registry/task-registry";
import type { TaskGovernanceAction } from "./task-governance-action";

export interface TaskGovernanceAdapterOptions {
  registry?: TaskRegistry;
}

export interface TaskCreationFromActionResult {
  action: TaskGovernanceAction;
  task: TaskRecord;
  assignment?: TaskAssignment;
  lifecycleEvents: TaskLifecycleEvent[];
}

export interface TaskAssignmentFromActionResult {
  action: TaskGovernanceAction;
  task: TaskRecord;
  assignment: TaskAssignment;
  lifecycleEvents: TaskLifecycleEvent[];
}

export interface TaskReportFromActionResult {
  action: TaskGovernanceAction;
  task: TaskRecord;
  report: TaskReport;
  lifecycleEvents: TaskLifecycleEvent[];
}

export interface TaskEscalationFromActionResult {
  action: TaskGovernanceAction;
  task: TaskRecord;
  escalation: TaskEscalationRecord;
  lifecycleEvents: TaskLifecycleEvent[];
}

export interface TaskLifecycleFromActionResult {
  action: TaskGovernanceAction;
  task: TaskRecord;
  lifecycleEvents: TaskLifecycleEvent[];
}
