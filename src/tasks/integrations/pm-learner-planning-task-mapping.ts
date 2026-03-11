import type { TaskEscalationSeverity } from "../contracts/task-escalation-record";
import type { TaskGovernanceAction } from "../adapters/task-governance-action";
import type {
  LearnerPlanningEscalationInput,
  LearnerPlanningReportInput,
  LearnerPlanningReportState,
} from "./pm-learner-planning-task.types";
import type { PmLearnerPlanningTask } from "./pm-learner-planning-task";

const REPORT_STATUS_BY_STATE: Record<LearnerPlanningReportState, "in_progress" | "completed" | "blocked"> = {
  in_study: "in_progress",
  planned: "in_progress",
  in_progress: "in_progress",
  blocked: "blocked",
  completed: "completed",
  recommendation_ready: "completed",
};

const ESCALATION_SEVERITY_BY_KIND: Record<LearnerPlanningEscalationInput["kind"], TaskEscalationSeverity> = {
  missing_context: "moderate",
  dependency_issue: "high",
  deadline_risk: "high",
  architectural_uncertainty: "moderate",
  governance_conflict: "high",
};

export function mapPlanningTaskToCreateAction(task: PmLearnerPlanningTask): TaskGovernanceAction {
  validatePlanningTask(task);
  return {
    actionId: `${task.planningTaskId}:create`,
    taskId: task.planningTaskId,
    title: task.title,
    description: task.description,
    actionType: "create_task",
    sourceLayer: "pm",
    ownerRole: task.pmRole,
    targetRole: task.targetLearnerRole,
    targetWorkerId: task.targetLearnerWorkerId,
    taskType: "research",
    taskPriority: task.priority,
    taskStatus: "queued",
    dependencies: task.dependencyReferences ? [...task.dependencyReferences] : [],
    dueDate: task.dueDate,
    evidenceReferences: task.evidenceReferences ? [...task.evidenceReferences] : undefined,
    outputs: mergeOutputs(task),
    reportSummary: task.objective,
  };
}

export function mapPlanningTaskToAssignmentAction(
  task: PmLearnerPlanningTask,
  occurredAt?: string
): TaskGovernanceAction {
  validatePlanningTask(task);
  return {
    actionId: `${task.planningTaskId}:assign`,
    taskId: task.planningTaskId,
    title: task.title,
    description: task.description,
    actionType: "assign_task",
    sourceLayer: "pm",
    ownerRole: task.pmRole,
    targetRole: task.targetLearnerRole,
    targetWorkerId: task.targetLearnerWorkerId,
    occurredAt,
  };
}

export function mapLearnerPlanningReportToActions(
  task: PmLearnerPlanningTask,
  input: LearnerPlanningReportInput
): { reportAction: TaskGovernanceAction; lifecycleAction: TaskGovernanceAction } {
  validatePlanningTask(task);
  validateReportInput(input);
  const learnerDescriptor = input.learnerWorkerId ?? task.targetLearnerWorkerId ?? task.targetLearnerRole;
  const reportSummary =
    input.state === "recommendation_ready"
      ? `${input.summary} Recommendation package is ready for PM review.`
      : input.summary;

  return {
    reportAction: {
      actionId: `${task.planningTaskId}:report:${input.state}`,
      taskId: task.planningTaskId,
      title: task.title,
      description: task.description,
      actionType: "report_task",
      sourceLayer: "learner",
      ownerRole: task.pmRole,
      actorRole: task.targetLearnerRole,
      targetRole: task.pmRole,
      targetWorkerId: learnerDescriptor,
      reportSummary,
      blockers: input.blockers ? [...input.blockers] : [],
      risks: input.risks ? [...input.risks] : [],
      recommendations: input.recommendations ? [...input.recommendations] : [],
      evidenceReferences: input.evidenceReferences ? [...input.evidenceReferences] : task.evidenceReferences,
      occurredAt: input.occurredAt,
    },
    lifecycleAction: {
      actionId: `${task.planningTaskId}:status:${input.state}`,
      taskId: task.planningTaskId,
      title: task.title,
      actionType: "update_task_status",
      sourceLayer: "learner",
      ownerRole: task.pmRole,
      actorRole: task.targetLearnerRole,
      taskStatus: REPORT_STATUS_BY_STATE[input.state],
      reportSummary,
      occurredAt: input.occurredAt,
    },
  };
}

export function mapLearnerPlanningEscalationToAction(
  task: PmLearnerPlanningTask,
  input: LearnerPlanningEscalationInput
): TaskGovernanceAction {
  validatePlanningTask(task);
  validateEscalationInput(input);
  return {
    actionId: `${task.planningTaskId}:escalate:${input.kind}`,
    taskId: task.planningTaskId,
    title: task.title,
    description: task.description,
    actionType: "escalate_task",
    sourceLayer: "learner",
    ownerRole: task.pmRole,
    actorRole: task.targetLearnerRole,
    targetRole: task.pmRole,
    targetWorkerId: input.learnerWorkerId ?? task.targetLearnerWorkerId,
    escalationReason: input.reason,
    escalationSeverity: ESCALATION_SEVERITY_BY_KIND[input.kind],
    occurredAt: input.occurredAt,
  };
}

function mergeOutputs(task: PmLearnerPlanningTask): string[] {
  const outputs = [`objective:${task.objective}`];
  for (const constraint of task.constraints ?? []) {
    outputs.push(`constraint:${constraint}`);
  }
  if (task.reportingExpectation) {
    outputs.push(`reporting_expectation:${task.reportingExpectation}`);
  }
  return outputs;
}

function validatePlanningTask(task: PmLearnerPlanningTask): void {
  if (!task.planningTaskId) {
    throw new Error("PM-learner planning task requires planningTaskId");
  }
  if (!task.title) {
    throw new Error(`PM-learner planning task ${task.planningTaskId} requires title`);
  }
  if (!task.description) {
    throw new Error(`PM-learner planning task ${task.planningTaskId} requires description`);
  }
  if (!task.objective) {
    throw new Error(`PM-learner planning task ${task.planningTaskId} requires objective`);
  }
}

function validateReportInput(input: LearnerPlanningReportInput): void {
  if (!input.planningTaskId) {
    throw new Error("Learner planning report requires planningTaskId");
  }
  if (!input.summary) {
    throw new Error(`Learner planning report ${input.planningTaskId} requires summary`);
  }
}

function validateEscalationInput(input: LearnerPlanningEscalationInput): void {
  if (!input.planningTaskId) {
    throw new Error("Learner planning escalation requires planningTaskId");
  }
  if (!input.reason) {
    throw new Error(`Learner planning escalation ${input.planningTaskId} requires reason`);
  }
}
