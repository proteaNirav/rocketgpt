import type { TaskEscalationSeverity } from "../contracts/task-escalation-record";
import type { TaskGovernanceAction } from "../adapters/task-governance-action";
import type {
  BrainOversightEscalationInput,
  BrainOversightReportInput,
  BrainOversightReportState,
} from "./brain-consortium-oversight-task.types";
import type { BrainConsortiumOversightTask } from "./brain-consortium-oversight-task";

const REPORT_STATUS_BY_STATE: Record<BrainOversightReportState, "in_progress" | "completed" | "blocked"> = {
  in_analysis: "in_progress",
  findings_ready: "in_progress",
  blocked: "blocked",
  risk_detected: "in_progress",
  recommendation_ready: "in_progress",
  completed: "completed",
};

const ESCALATION_SEVERITY_BY_KIND: Record<BrainOversightEscalationInput["kind"], TaskEscalationSeverity> = {
  constitutional_concern: "critical",
  governance_conflict: "high",
  severe_operational_risk: "critical",
  insufficient_evidence: "moderate",
  unresolved_contradiction: "high",
};

export function mapOversightTaskToCreateAction(task: BrainConsortiumOversightTask): TaskGovernanceAction {
  validateOversightTask(task);
  return {
    actionId: `${task.oversightTaskId}:create`,
    taskId: task.oversightTaskId,
    title: task.title,
    description: task.description,
    actionType: "create_task",
    sourceLayer: "consortium",
    ownerRole: task.consortiumRole,
    targetRole: task.targetBrainRole,
    targetWorkerId: task.targetBrainWorkerId,
    taskType: "governance",
    taskPriority: task.priority,
    taskStatus: "queued",
    dependencies: task.dependencyReferences ? [...task.dependencyReferences] : [],
    dueDate: task.dueDate,
    evidenceReferences: task.evidenceReferences ? [...task.evidenceReferences] : undefined,
    outputs: mergeOutputs(task),
    reportSummary: task.oversightObjective,
  };
}

export function mapOversightTaskToAssignmentAction(
  task: BrainConsortiumOversightTask,
  occurredAt?: string
): TaskGovernanceAction {
  validateOversightTask(task);
  return {
    actionId: `${task.oversightTaskId}:assign`,
    taskId: task.oversightTaskId,
    title: task.title,
    description: task.description,
    actionType: "assign_task",
    sourceLayer: "consortium",
    ownerRole: task.consortiumRole,
    targetRole: task.targetBrainRole,
    targetWorkerId: task.targetBrainWorkerId,
    occurredAt,
  };
}

export function mapBrainOversightReportToActions(
  task: BrainConsortiumOversightTask,
  input: BrainOversightReportInput
): { reportAction: TaskGovernanceAction; lifecycleAction: TaskGovernanceAction } {
  validateOversightTask(task);
  validateReportInput(input);
  const brainDescriptor = input.brainWorkerId ?? task.targetBrainWorkerId ?? task.targetBrainRole;
  const reportSummary = buildReportSummary(input);

  return {
    reportAction: {
      actionId: `${task.oversightTaskId}:report:${input.state}`,
      taskId: task.oversightTaskId,
      title: task.title,
      description: task.description,
      actionType: "report_task",
      sourceLayer: "brain",
      ownerRole: task.consortiumRole,
      actorRole: task.targetBrainRole,
      targetRole: task.consortiumRole,
      targetWorkerId: brainDescriptor,
      reportSummary,
      blockers: input.blockers ? [...input.blockers] : [],
      risks: input.risks ? [...input.risks] : [],
      recommendations: input.recommendations ? [...input.recommendations] : [],
      evidenceReferences: input.evidenceReferences ? [...input.evidenceReferences] : task.evidenceReferences,
      occurredAt: input.occurredAt,
    },
    lifecycleAction: {
      actionId: `${task.oversightTaskId}:status:${input.state}`,
      taskId: task.oversightTaskId,
      title: task.title,
      actionType: "update_task_status",
      sourceLayer: "brain",
      ownerRole: task.consortiumRole,
      actorRole: task.targetBrainRole,
      taskStatus: REPORT_STATUS_BY_STATE[input.state],
      reportSummary,
      occurredAt: input.occurredAt,
    },
  };
}

export function mapBrainOversightEscalationToAction(
  task: BrainConsortiumOversightTask,
  input: BrainOversightEscalationInput
): TaskGovernanceAction {
  validateOversightTask(task);
  validateEscalationInput(input);
  return {
    actionId: `${task.oversightTaskId}:escalate:${input.kind}`,
    taskId: task.oversightTaskId,
    title: task.title,
    description: task.description,
    actionType: "escalate_task",
    sourceLayer: "brain",
    ownerRole: task.consortiumRole,
    actorRole: task.targetBrainRole,
    targetRole: task.consortiumRole,
    targetWorkerId: input.brainWorkerId ?? task.targetBrainWorkerId,
    escalationReason: input.reason,
    escalationSeverity: ESCALATION_SEVERITY_BY_KIND[input.kind],
    occurredAt: input.occurredAt,
  };
}

function buildReportSummary(input: BrainOversightReportInput): string {
  const parts = [input.summary.trim()];
  if (input.findings && input.findings.length > 0) {
    parts.push(`Findings: ${input.findings.join("; ")}`);
  }
  if (input.state === "findings_ready") {
    parts.push("Findings package is ready for consortium review.");
  }
  if (input.state === "recommendation_ready") {
    parts.push("Recommendation package is ready for consortium review.");
  }
  return parts.join(" ");
}

function mergeOutputs(task: BrainConsortiumOversightTask): string[] {
  const outputs = [`oversight_objective:${task.oversightObjective}`];
  for (const scopeItem of task.scope ?? []) {
    outputs.push(`scope:${scopeItem}`);
  }
  for (const constraint of task.constraints ?? []) {
    outputs.push(`constraint:${constraint}`);
  }
  if (task.reportingExpectation) {
    outputs.push(`reporting_expectation:${task.reportingExpectation}`);
  }
  if (task.consortiumActorId) {
    outputs.push(`consortium_actor_id:${task.consortiumActorId}`);
  }
  if (task.consortiumActorLabel) {
    outputs.push(`consortium_actor_label:${task.consortiumActorLabel}`);
  }
  if (task.consortiumActorFunction) {
    outputs.push(`consortium_actor_function:${task.consortiumActorFunction}`);
  }
  return outputs;
}

function validateOversightTask(task: BrainConsortiumOversightTask): void {
  if (!task.oversightTaskId) {
    throw new Error("Brain-consortium oversight task requires oversightTaskId");
  }
  if (!task.title) {
    throw new Error(`Brain-consortium oversight task ${task.oversightTaskId} requires title`);
  }
  if (!task.description) {
    throw new Error(`Brain-consortium oversight task ${task.oversightTaskId} requires description`);
  }
  if (!task.oversightObjective) {
    throw new Error(`Brain-consortium oversight task ${task.oversightTaskId} requires oversightObjective`);
  }
}

function validateReportInput(input: BrainOversightReportInput): void {
  if (!input.oversightTaskId) {
    throw new Error("Brain oversight report requires oversightTaskId");
  }
  if (!input.summary) {
    throw new Error(`Brain oversight report ${input.oversightTaskId} requires summary`);
  }
}

function validateEscalationInput(input: BrainOversightEscalationInput): void {
  if (!input.oversightTaskId) {
    throw new Error("Brain oversight escalation requires oversightTaskId");
  }
  if (!input.reason) {
    throw new Error(`Brain oversight escalation ${input.oversightTaskId} requires reason`);
  }
}
