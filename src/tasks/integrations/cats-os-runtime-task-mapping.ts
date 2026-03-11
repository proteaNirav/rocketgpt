import type { TaskEscalationSeverity } from "../contracts/task-escalation-record";
import type { TaskGovernanceAction } from "../adapters/task-governance-action";
import type {
  OsRuntimeEscalationInput,
  OsRuntimeReportInput,
  OsRuntimeReportState,
} from "./cats-os-runtime-task.types";
import type { CatsOsRuntimeTask } from "./cats-os-runtime-task";

const REPORT_STATUS_BY_STATE: Record<OsRuntimeReportState, "in_progress" | "completed" | "blocked"> = {
  in_execution: "in_progress",
  result_ready: "in_progress",
  blocked: "blocked",
  precondition_failed: "blocked",
  completed: "completed",
};

const ESCALATION_SEVERITY_BY_KIND: Record<OsRuntimeEscalationInput["kind"], TaskEscalationSeverity> = {
  missing_runtime_target: "moderate",
  precondition_not_satisfied: "high",
  policy_constraint: "high",
  incompatible_execution_scope: "high",
  runtime_environment_unavailable: "critical",
};

export function mapRuntimeTaskToCreateAction(task: CatsOsRuntimeTask): TaskGovernanceAction {
  validateRuntimeTask(task);
  return {
    actionId: `${task.runtimeTaskId}:create`,
    taskId: task.runtimeTaskId,
    title: task.title,
    description: task.description,
    actionType: "create_task",
    sourceLayer: "cats",
    ownerRole: task.catsRole,
    targetRole: task.targetOsRole,
    targetWorkerId: task.targetOsWorkerId,
    taskType: "operations",
    taskPriority: task.priority,
    taskStatus: "queued",
    dependencies: task.dependencyReferences ? [...task.dependencyReferences] : [],
    dueDate: task.dueDate,
    evidenceReferences: task.evidenceReferences ? [...task.evidenceReferences] : undefined,
    outputs: mergeOutputs(task),
    reportSummary: task.executionIntent,
  };
}

export function mapRuntimeTaskToAssignmentAction(
  task: CatsOsRuntimeTask,
  occurredAt?: string
): TaskGovernanceAction {
  validateRuntimeTask(task);
  return {
    actionId: `${task.runtimeTaskId}:assign`,
    taskId: task.runtimeTaskId,
    title: task.title,
    description: task.description,
    actionType: "assign_task",
    sourceLayer: "cats",
    ownerRole: task.catsRole,
    targetRole: task.targetOsRole,
    targetWorkerId: task.targetOsWorkerId,
    occurredAt,
  };
}

export function mapOsRuntimeReportToActions(
  task: CatsOsRuntimeTask,
  input: OsRuntimeReportInput
): { reportAction: TaskGovernanceAction; lifecycleAction: TaskGovernanceAction } {
  validateRuntimeTask(task);
  validateReportInput(input);
  const osDescriptor = input.osWorkerId ?? task.targetOsWorkerId ?? task.targetOsRole;
  const reportSummary =
    input.state === "precondition_failed"
      ? `${input.summary} Runtime precondition failed.`
      : input.state === "result_ready"
        ? `${input.summary} Result package is ready for CAT review.`
        : input.summary;

  return {
    reportAction: {
      actionId: `${task.runtimeTaskId}:report:${input.state}`,
      taskId: task.runtimeTaskId,
      title: task.title,
      description: task.description,
      actionType: "report_task",
      sourceLayer: "os",
      ownerRole: task.catsRole,
      actorRole: task.targetOsRole,
      targetRole: task.catsRole,
      targetWorkerId: osDescriptor,
      reportSummary,
      blockers: input.blockers ? [...input.blockers] : [],
      risks: input.risks ? [...input.risks] : [],
      recommendations: input.recommendations ? [...input.recommendations] : [],
      evidenceReferences: input.evidenceReferences ? [...input.evidenceReferences] : task.evidenceReferences,
      occurredAt: input.occurredAt,
    },
    lifecycleAction: {
      actionId: `${task.runtimeTaskId}:status:${input.state}`,
      taskId: task.runtimeTaskId,
      title: task.title,
      actionType: "update_task_status",
      sourceLayer: "os",
      ownerRole: task.catsRole,
      actorRole: task.targetOsRole,
      taskStatus: REPORT_STATUS_BY_STATE[input.state],
      reportSummary,
      occurredAt: input.occurredAt,
    },
  };
}

export function mapOsRuntimeEscalationToAction(
  task: CatsOsRuntimeTask,
  input: OsRuntimeEscalationInput
): TaskGovernanceAction {
  validateRuntimeTask(task);
  validateEscalationInput(input);
  return {
    actionId: `${task.runtimeTaskId}:escalate:${input.kind}`,
    taskId: task.runtimeTaskId,
    title: task.title,
    description: task.description,
    actionType: "escalate_task",
    sourceLayer: "os",
    ownerRole: task.catsRole,
    actorRole: task.targetOsRole,
    targetRole: task.catsRole,
    targetWorkerId: input.osWorkerId ?? task.targetOsWorkerId,
    escalationReason: input.reason,
    escalationSeverity: ESCALATION_SEVERITY_BY_KIND[input.kind],
    occurredAt: input.occurredAt,
  };
}

function mergeOutputs(task: CatsOsRuntimeTask): string[] {
  const outputs = [`execution_intent:${task.executionIntent}`];
  if (task.runtimeTarget) {
    outputs.push(`runtime_target:${task.runtimeTarget}`);
  }
  for (const precondition of task.preconditions ?? []) {
    outputs.push(`precondition:${precondition}`);
  }
  for (const reference of task.policyConstraintReferences ?? []) {
    outputs.push(`policy_constraint_reference:${reference}`);
  }
  if (task.catsActorId) {
    outputs.push(`cats_actor_id:${task.catsActorId}`);
  }
  if (task.catsActorLabel) {
    outputs.push(`cats_actor_label:${task.catsActorLabel}`);
  }
  return outputs;
}

function validateRuntimeTask(task: CatsOsRuntimeTask): void {
  if (!task.runtimeTaskId) {
    throw new Error("CATS-OS runtime task requires runtimeTaskId");
  }
  if (!task.title) {
    throw new Error(`CATS-OS runtime task ${task.runtimeTaskId} requires title`);
  }
  if (!task.description) {
    throw new Error(`CATS-OS runtime task ${task.runtimeTaskId} requires description`);
  }
  if (!task.executionIntent) {
    throw new Error(`CATS-OS runtime task ${task.runtimeTaskId} requires executionIntent`);
  }
}

function validateReportInput(input: OsRuntimeReportInput): void {
  if (!input.runtimeTaskId) {
    throw new Error("OS runtime report requires runtimeTaskId");
  }
  if (!input.summary) {
    throw new Error(`OS runtime report ${input.runtimeTaskId} requires summary`);
  }
}

function validateEscalationInput(input: OsRuntimeEscalationInput): void {
  if (!input.runtimeTaskId) {
    throw new Error("OS runtime escalation requires runtimeTaskId");
  }
  if (!input.reason) {
    throw new Error(`OS runtime escalation ${input.runtimeTaskId} requires reason`);
  }
}
