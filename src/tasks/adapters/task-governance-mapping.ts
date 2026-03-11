import type { TaskAssignment } from "../contracts/task-assignment";
import type { TaskEscalationRecord } from "../contracts/task-escalation-record";
import type { TaskRecordCreateInput } from "../contracts/task-record";
import type { TaskReport } from "../contracts/task-report";
import type { TaskLifecycleEvent } from "../reporting/task-lifecycle-event";
import type { TaskRegistry } from "../registry/task-registry";
import type { TaskGovernanceAction } from "./task-governance-action";

export function resolveActionTimestamp(action: TaskGovernanceAction): string {
  return action.occurredAt ?? new Date().toISOString();
}

export function resolveActionTaskId(action: TaskGovernanceAction): string {
  return action.taskId ?? `${action.actionId}:task`;
}

export function resolveActingRole(action: TaskGovernanceAction) {
  return action.actorRole ?? action.ownerRole;
}

export function mapTaskCreateInput(action: TaskGovernanceAction): TaskRecordCreateInput {
  const timestamp = resolveActionTimestamp(action);
  return {
    taskId: resolveActionTaskId(action),
    title: action.title,
    taskType: requireValue(action.taskType, action, "taskType"),
    sourceLayer: action.sourceLayer,
    ownerRole: action.ownerRole,
    priority: requireValue(action.taskPriority, action, "taskPriority"),
    status: action.taskStatus ?? "queued",
    dependencies: action.dependencies ? [...action.dependencies] : [],
    createdAt: timestamp,
    updatedAt: timestamp,
    dueDate: action.dueDate,
    evidenceReferences: action.evidenceReferences ? [...action.evidenceReferences] : undefined,
    outputs: action.outputs ? [...action.outputs] : undefined,
    reportSummary: action.reportSummary,
  };
}

export function mapTaskAssignment(action: TaskGovernanceAction): TaskAssignment {
  if (!action.targetRole && !action.targetWorkerId) {
    throw new Error(`Governance action ${action.actionId} requires targetRole or targetWorkerId for assignment`);
  }
  return {
    assigneeRole: action.targetRole,
    workerId: action.targetWorkerId,
    assignedByRole: resolveActingRole(action),
    assignedAt: resolveActionTimestamp(action),
    note: action.description,
  };
}

export function mapTaskReport(action: TaskGovernanceAction): TaskReport {
  return {
    reportId: `${action.actionId}:report`,
    taskId: requireTaskId(action),
    reportingRole: resolveActingRole(action),
    statusSummary: requireValue(action.reportSummary, action, "reportSummary"),
    blockers: action.blockers ? [...action.blockers] : [],
    risks: action.risks ? [...action.risks] : [],
    evidence: action.evidenceReferences ? [...action.evidenceReferences] : [],
    recommendations: action.recommendations ? [...action.recommendations] : [],
    reportedAt: resolveActionTimestamp(action),
  };
}

export function mapTaskEscalation(action: TaskGovernanceAction): TaskEscalationRecord {
  return {
    escalationId: `${action.actionId}:escalation`,
    taskId: requireTaskId(action),
    fromRole: resolveActingRole(action),
    toRole: requireValue(action.targetRole, action, "targetRole"),
    reason: requireValue(action.escalationReason, action, "escalationReason"),
    severity: requireValue(action.escalationSeverity, action, "escalationSeverity"),
    createdAt: resolveActionTimestamp(action),
  };
}

export function latestLifecycleEvent(registry: TaskRegistry, taskId: string): TaskLifecycleEvent {
  const events = registry.listLifecycleEvents(taskId);
  const event = events[events.length - 1];
  if (!event) {
    throw new Error(`No lifecycle event recorded for task ${taskId}`);
  }
  return event;
}

export function requireTaskId(action: TaskGovernanceAction): string {
  if (!action.taskId) {
    throw new Error(`Governance action ${action.actionId} requires taskId`);
  }
  return action.taskId;
}

export function assertActionType(
  action: TaskGovernanceAction,
  expectedType: TaskGovernanceAction["actionType"]
): void {
  if (action.actionType !== expectedType) {
    throw new Error(`Governance action ${action.actionId} must be ${expectedType}, received ${action.actionType}`);
  }
}

function requireValue<T>(value: T | undefined, action: TaskGovernanceAction, fieldName: string): T {
  if (value === undefined) {
    throw new Error(`Governance action ${action.actionId} requires ${fieldName}`);
  }
  return value;
}
