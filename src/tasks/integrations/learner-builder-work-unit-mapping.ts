import type { TaskEscalationSeverity } from "../contracts/task-escalation-record";
import type { TaskGovernanceAction } from "../adapters/task-governance-action";
import type { BuilderWorkUnitEscalationInput, BuilderWorkUnitReportInput, BuilderWorkUnitReportState } from "./learner-builder-work-unit.types";
import type { LearnerBuilderWorkUnit } from "./learner-builder-work-unit";

const REPORT_STATUS_BY_STATE: Record<BuilderWorkUnitReportState, "in_progress" | "completed" | "blocked"> = {
  in_progress: "in_progress",
  completed: "completed",
  blocked: "blocked",
  needs_clarification: "blocked",
};

const ESCALATION_SEVERITY_BY_KIND: Record<BuilderWorkUnitEscalationInput["kind"], TaskEscalationSeverity> = {
  missing_dependency: "high",
  unclear_acceptance_criteria: "moderate",
  insufficient_context: "moderate",
  policy_constraint: "high",
};

export function mapWorkUnitToCreateAction(workUnit: LearnerBuilderWorkUnit): TaskGovernanceAction {
  validateWorkUnit(workUnit);
  return {
    actionId: `${workUnit.workUnitId}:create`,
    taskId: workUnit.workUnitId,
    title: workUnit.title,
    description: workUnit.description,
    actionType: "create_task",
    sourceLayer: "learner",
    ownerRole: workUnit.learnerRole,
    targetRole: workUnit.targetBuilderRole,
    targetWorkerId: workUnit.targetBuilderWorkerId,
    taskType: "implementation",
    taskPriority: workUnit.priority,
    taskStatus: "queued",
    dependencies: workUnit.dependencyReferences ? [...workUnit.dependencyReferences] : [],
    dueDate: workUnit.dueDate,
    evidenceReferences: workUnit.evidenceReferences ? [...workUnit.evidenceReferences] : undefined,
    outputs: mergeOutputs(workUnit),
  };
}

export function mapWorkUnitToAssignmentAction(
  workUnit: LearnerBuilderWorkUnit,
  occurredAt?: string
): TaskGovernanceAction {
  validateWorkUnit(workUnit);
  return {
    actionId: `${workUnit.workUnitId}:assign`,
    taskId: workUnit.workUnitId,
    title: workUnit.title,
    description: workUnit.description,
    actionType: "assign_task",
    sourceLayer: "learner",
    ownerRole: workUnit.learnerRole,
    targetRole: workUnit.targetBuilderRole,
    targetWorkerId: workUnit.targetBuilderWorkerId,
    occurredAt,
  };
}

export function mapBuilderReportToActions(
  workUnit: LearnerBuilderWorkUnit,
  input: BuilderWorkUnitReportInput
): { reportAction: TaskGovernanceAction; lifecycleAction: TaskGovernanceAction } {
  validateWorkUnit(workUnit);
  validateReportInput(input);
  const builderDescriptor = input.builderWorkerId ?? workUnit.targetBuilderWorkerId ?? workUnit.targetBuilderRole;
  const reportSummary =
    input.state === "needs_clarification"
      ? `${input.summary} Needs learner clarification.`
      : input.summary;

  return {
    reportAction: {
      actionId: `${workUnit.workUnitId}:report:${input.state}`,
      taskId: workUnit.workUnitId,
      title: workUnit.title,
      description: workUnit.description,
      actionType: "report_task",
      sourceLayer: "builder",
      ownerRole: workUnit.learnerRole,
      actorRole: workUnit.targetBuilderRole,
      targetRole: workUnit.learnerRole,
      targetWorkerId: builderDescriptor,
      reportSummary,
      blockers: input.blockers ? [...input.blockers] : [],
      risks: input.risks ? [...input.risks] : [],
      recommendations: input.recommendations ? [...input.recommendations] : [],
      evidenceReferences: input.evidenceReferences ? [...input.evidenceReferences] : workUnit.evidenceReferences,
      occurredAt: input.occurredAt,
    },
    lifecycleAction: {
      actionId: `${workUnit.workUnitId}:status:${input.state}`,
      taskId: workUnit.workUnitId,
      title: workUnit.title,
      actionType: "update_task_status",
      sourceLayer: "builder",
      ownerRole: workUnit.learnerRole,
      actorRole: workUnit.targetBuilderRole,
      taskStatus: REPORT_STATUS_BY_STATE[input.state],
      reportSummary,
      occurredAt: input.occurredAt,
    },
  };
}

export function mapBuilderEscalationToAction(
  workUnit: LearnerBuilderWorkUnit,
  input: BuilderWorkUnitEscalationInput
): TaskGovernanceAction {
  validateWorkUnit(workUnit);
  validateEscalationInput(input);
  return {
    actionId: `${workUnit.workUnitId}:escalate:${input.kind}`,
    taskId: workUnit.workUnitId,
    title: workUnit.title,
    description: workUnit.description,
    actionType: "escalate_task",
    sourceLayer: "builder",
    ownerRole: workUnit.learnerRole,
    actorRole: workUnit.targetBuilderRole,
    targetRole: workUnit.learnerRole,
    targetWorkerId: input.builderWorkerId ?? workUnit.targetBuilderWorkerId,
    escalationReason: input.reason,
    escalationSeverity: ESCALATION_SEVERITY_BY_KIND[input.kind],
    occurredAt: input.occurredAt,
  };
}

function mergeOutputs(workUnit: LearnerBuilderWorkUnit): string[] | undefined {
  const outputs = workUnit.expectedOutputs ? [...workUnit.expectedOutputs] : [];
  for (const criterion of workUnit.acceptanceCriteria ?? []) {
    outputs.push(`acceptance:${criterion}`);
  }
  for (const hint of workUnit.builderTypeHints ?? []) {
    outputs.push(`builder_type_hint:${hint}`);
  }
  return outputs.length > 0 ? outputs : undefined;
}

function validateWorkUnit(workUnit: LearnerBuilderWorkUnit): void {
  if (!workUnit.workUnitId) {
    throw new Error("Learner-builder work unit requires workUnitId");
  }
  if (!workUnit.title) {
    throw new Error(`Learner-builder work unit ${workUnit.workUnitId} requires title`);
  }
  if (!workUnit.description) {
    throw new Error(`Learner-builder work unit ${workUnit.workUnitId} requires description`);
  }
}

function validateReportInput(input: BuilderWorkUnitReportInput): void {
  if (!input.workUnitId) {
    throw new Error("Builder work-unit report requires workUnitId");
  }
  if (!input.summary) {
    throw new Error(`Builder work-unit report ${input.workUnitId} requires summary`);
  }
}

function validateEscalationInput(input: BuilderWorkUnitEscalationInput): void {
  if (!input.workUnitId) {
    throw new Error("Builder work-unit escalation requires workUnitId");
  }
  if (!input.reason) {
    throw new Error(`Builder work-unit escalation ${input.workUnitId} requires reason`);
  }
}
