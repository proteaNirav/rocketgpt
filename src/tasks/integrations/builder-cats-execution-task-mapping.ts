import type { TaskEscalationSeverity } from "../contracts/task-escalation-record";
import type { TaskGovernanceAction } from "../adapters/task-governance-action";
import type {
  CatsExecutionEscalationInput,
  CatsExecutionReportInput,
  CatsExecutionReportState,
} from "./builder-cats-execution-task.types";
import type { BuilderCatsExecutionTask } from "./builder-cats-execution-task";

const REPORT_STATUS_BY_STATE: Record<CatsExecutionReportState, "in_progress" | "completed" | "blocked"> = {
  in_execution: "in_progress",
  result_ready: "in_progress",
  blocked: "blocked",
  needs_builder_clarification: "blocked",
  completed: "completed",
};

const ESCALATION_SEVERITY_BY_KIND: Record<CatsExecutionEscalationInput["kind"], TaskEscalationSeverity> = {
  missing_input: "moderate",
  dependency_not_satisfied: "high",
  policy_constraint: "high",
  incompatible_execution_scope: "high",
  runtime_precondition_missing: "moderate",
};

export function mapExecutionTaskToCreateAction(task: BuilderCatsExecutionTask): TaskGovernanceAction {
  validateExecutionTask(task);
  return {
    actionId: `${task.executionTaskId}:create`,
    taskId: task.executionTaskId,
    title: task.title,
    description: task.description,
    actionType: "create_task",
    sourceLayer: "builder",
    ownerRole: task.builderRole,
    targetRole: task.targetCatsRole,
    targetWorkerId: task.targetCatsWorkerId,
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

export function mapExecutionTaskToAssignmentAction(
  task: BuilderCatsExecutionTask,
  occurredAt?: string
): TaskGovernanceAction {
  validateExecutionTask(task);
  return {
    actionId: `${task.executionTaskId}:assign`,
    taskId: task.executionTaskId,
    title: task.title,
    description: task.description,
    actionType: "assign_task",
    sourceLayer: "builder",
    ownerRole: task.builderRole,
    targetRole: task.targetCatsRole,
    targetWorkerId: task.targetCatsWorkerId,
    occurredAt,
  };
}

export function mapCatsExecutionReportToActions(
  task: BuilderCatsExecutionTask,
  input: CatsExecutionReportInput
): { reportAction: TaskGovernanceAction; lifecycleAction: TaskGovernanceAction } {
  validateExecutionTask(task);
  validateReportInput(input);
  const catsDescriptor = input.catsWorkerId ?? task.targetCatsWorkerId ?? task.targetCatsRole;
  const reportSummary =
    input.state === "needs_builder_clarification"
      ? `${input.summary} Needs builder clarification.`
      : input.state === "result_ready"
        ? `${input.summary} Result package is ready for builder review.`
        : input.summary;

  return {
    reportAction: {
      actionId: `${task.executionTaskId}:report:${input.state}`,
      taskId: task.executionTaskId,
      title: task.title,
      description: task.description,
      actionType: "report_task",
      sourceLayer: "cats",
      ownerRole: task.builderRole,
      actorRole: task.targetCatsRole,
      targetRole: task.builderRole,
      targetWorkerId: catsDescriptor,
      reportSummary,
      blockers: input.blockers ? [...input.blockers] : [],
      risks: input.risks ? [...input.risks] : [],
      recommendations: input.recommendations ? [...input.recommendations] : [],
      evidenceReferences: input.evidenceReferences ? [...input.evidenceReferences] : task.evidenceReferences,
      occurredAt: input.occurredAt,
    },
    lifecycleAction: {
      actionId: `${task.executionTaskId}:status:${input.state}`,
      taskId: task.executionTaskId,
      title: task.title,
      actionType: "update_task_status",
      sourceLayer: "cats",
      ownerRole: task.builderRole,
      actorRole: task.targetCatsRole,
      taskStatus: REPORT_STATUS_BY_STATE[input.state],
      reportSummary,
      occurredAt: input.occurredAt,
    },
  };
}

export function mapCatsExecutionEscalationToAction(
  task: BuilderCatsExecutionTask,
  input: CatsExecutionEscalationInput
): TaskGovernanceAction {
  validateExecutionTask(task);
  validateEscalationInput(input);
  return {
    actionId: `${task.executionTaskId}:escalate:${input.kind}`,
    taskId: task.executionTaskId,
    title: task.title,
    description: task.description,
    actionType: "escalate_task",
    sourceLayer: "cats",
    ownerRole: task.builderRole,
    actorRole: task.targetCatsRole,
    targetRole: task.builderRole,
    targetWorkerId: input.catsWorkerId ?? task.targetCatsWorkerId,
    escalationReason: input.reason,
    escalationSeverity: ESCALATION_SEVERITY_BY_KIND[input.kind],
    occurredAt: input.occurredAt,
  };
}

function mergeOutputs(task: BuilderCatsExecutionTask): string[] {
  const outputs = [`execution_intent:${task.executionIntent}`];
  for (const scopeItem of task.scope ?? []) {
    outputs.push(`scope:${scopeItem}`);
  }
  for (const requiredInput of task.requiredInputs ?? []) {
    outputs.push(`required_input:${requiredInput}`);
  }
  for (const reference of task.policyConstraintReferences ?? []) {
    outputs.push(`policy_constraint_reference:${reference}`);
  }
  for (const hint of task.builderTypeHints ?? []) {
    outputs.push(`builder_type_hint:${hint}`);
  }
  if (task.builderActorId) {
    outputs.push(`builder_actor_id:${task.builderActorId}`);
  }
  if (task.builderActorLabel) {
    outputs.push(`builder_actor_label:${task.builderActorLabel}`);
  }
  return outputs;
}

function validateExecutionTask(task: BuilderCatsExecutionTask): void {
  if (!task.executionTaskId) {
    throw new Error("Builder-CATS execution task requires executionTaskId");
  }
  if (!task.title) {
    throw new Error(`Builder-CATS execution task ${task.executionTaskId} requires title`);
  }
  if (!task.description) {
    throw new Error(`Builder-CATS execution task ${task.executionTaskId} requires description`);
  }
  if (!task.executionIntent) {
    throw new Error(`Builder-CATS execution task ${task.executionTaskId} requires executionIntent`);
  }
}

function validateReportInput(input: CatsExecutionReportInput): void {
  if (!input.executionTaskId) {
    throw new Error("CATS execution report requires executionTaskId");
  }
  if (!input.summary) {
    throw new Error(`CATS execution report ${input.executionTaskId} requires summary`);
  }
}

function validateEscalationInput(input: CatsExecutionEscalationInput): void {
  if (!input.executionTaskId) {
    throw new Error("CATS execution escalation requires executionTaskId");
  }
  if (!input.reason) {
    throw new Error(`CATS execution escalation ${input.executionTaskId} requires reason`);
  }
}
