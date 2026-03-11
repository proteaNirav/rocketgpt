import { TaskGovernanceAdapter } from "../adapters/task-governance-adapter";
import type { TaskGovernanceAdapterOptions } from "../adapters/task-governance-adapter.types";
import {
  mapLearnerPlanningEscalationToAction,
  mapLearnerPlanningReportToActions,
  mapPlanningTaskToAssignmentAction,
  mapPlanningTaskToCreateAction,
} from "./pm-learner-planning-task-mapping";
import type {
  LearnerPlanningEscalationInput,
  LearnerPlanningReportInput,
  PmLearnerPlanningTaskAssignmentResult,
  PmLearnerPlanningTaskCreateResult,
  PmLearnerPlanningTaskEscalationResult,
  PmLearnerPlanningTaskReportResult,
} from "./pm-learner-planning-task.types";
import type { PmLearnerPlanningTask } from "./pm-learner-planning-task";

export class PmLearnerPlanningTaskFlow {
  private readonly taskAdapter: TaskGovernanceAdapter;
  private readonly planningTasks = new Map<string, PmLearnerPlanningTask>();

  constructor(options?: TaskGovernanceAdapterOptions) {
    this.taskAdapter = new TaskGovernanceAdapter(options);
  }

  getTaskAdapter(): TaskGovernanceAdapter {
    return this.taskAdapter;
  }

  createPlanningTask(task: PmLearnerPlanningTask): PmLearnerPlanningTaskCreateResult {
    const action = mapPlanningTaskToCreateAction(task);
    const taskResult = this.taskAdapter.createTaskFromAction(action);
    this.planningTasks.set(task.planningTaskId, clonePlanningTask(task));
    return {
      planningTask: clonePlanningTask(task),
      action,
      taskResult,
    };
  }

  assignPlanningTask(planningTaskId: string, occurredAt?: string): PmLearnerPlanningTaskAssignmentResult {
    const task = this.getRequiredPlanningTask(planningTaskId);
    const action = mapPlanningTaskToAssignmentAction(task, occurredAt);
    return {
      planningTaskId,
      action,
      taskResult: this.taskAdapter.assignTaskFromAction(action),
    };
  }

  reportPlanningTask(input: LearnerPlanningReportInput): PmLearnerPlanningTaskReportResult {
    const task = this.getRequiredPlanningTask(input.planningTaskId);
    const actions = mapLearnerPlanningReportToActions(task, input);
    return {
      planningTaskId: input.planningTaskId,
      action: actions.reportAction,
      taskResult: this.taskAdapter.reportTaskFromAction(actions.reportAction),
      lifecycleResult: this.taskAdapter.applyLifecycleFromAction(actions.lifecycleAction),
    };
  }

  escalatePlanningTask(input: LearnerPlanningEscalationInput): PmLearnerPlanningTaskEscalationResult {
    const task = this.getRequiredPlanningTask(input.planningTaskId);
    const action = mapLearnerPlanningEscalationToAction(task, input);
    return {
      planningTaskId: input.planningTaskId,
      action,
      taskResult: this.taskAdapter.escalateTaskFromAction(action),
    };
  }

  markPlanningTaskInStudy(planningTaskId: string, summary: string, occurredAt?: string): PmLearnerPlanningTaskReportResult {
    return this.reportPlanningTask({
      planningTaskId,
      summary,
      state: "in_study",
      occurredAt,
    });
  }

  markPlanningTaskPlanned(planningTaskId: string, summary: string, occurredAt?: string): PmLearnerPlanningTaskReportResult {
    return this.reportPlanningTask({
      planningTaskId,
      summary,
      state: "planned",
      occurredAt,
    });
  }

  markPlanningTaskCompleted(planningTaskId: string, summary: string, occurredAt?: string): PmLearnerPlanningTaskReportResult {
    return this.reportPlanningTask({
      planningTaskId,
      summary,
      state: "completed",
      occurredAt,
    });
  }

  markPlanningTaskBlocked(
    planningTaskId: string,
    summary: string,
    blockers: string[],
    occurredAt?: string
  ): PmLearnerPlanningTaskReportResult {
    return this.reportPlanningTask({
      planningTaskId,
      summary,
      state: "blocked",
      blockers,
      occurredAt,
    });
  }

  private getRequiredPlanningTask(planningTaskId: string): PmLearnerPlanningTask {
    const task = this.planningTasks.get(planningTaskId);
    if (!task) {
      throw new Error(`PM-learner planning task not found: ${planningTaskId}`);
    }
    return clonePlanningTask(task);
  }
}

function clonePlanningTask(task: PmLearnerPlanningTask): PmLearnerPlanningTask {
  return {
    ...task,
    constraints: task.constraints ? [...task.constraints] : undefined,
    dependencyReferences: task.dependencyReferences ? [...task.dependencyReferences] : undefined,
    evidenceReferences: task.evidenceReferences ? [...task.evidenceReferences] : undefined,
  };
}
