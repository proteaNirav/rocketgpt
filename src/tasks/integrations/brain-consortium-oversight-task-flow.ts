import { TaskGovernanceAdapter } from "../adapters/task-governance-adapter";
import type { TaskGovernanceAdapterOptions } from "../adapters/task-governance-adapter.types";
import {
  mapBrainOversightEscalationToAction,
  mapBrainOversightReportToActions,
  mapOversightTaskToAssignmentAction,
  mapOversightTaskToCreateAction,
} from "./brain-consortium-oversight-task-mapping";
import type {
  BrainConsortiumOversightTaskAssignmentResult,
  BrainConsortiumOversightTaskCreateResult,
  BrainConsortiumOversightTaskEscalationResult,
  BrainConsortiumOversightTaskReportResult,
  BrainOversightEscalationInput,
  BrainOversightReportInput,
} from "./brain-consortium-oversight-task.types";
import type { BrainConsortiumOversightTask } from "./brain-consortium-oversight-task";

export class BrainConsortiumOversightTaskFlow {
  private readonly taskAdapter: TaskGovernanceAdapter;
  private readonly oversightTasks = new Map<string, BrainConsortiumOversightTask>();

  constructor(options?: TaskGovernanceAdapterOptions) {
    this.taskAdapter = new TaskGovernanceAdapter(options);
  }

  getTaskAdapter(): TaskGovernanceAdapter {
    return this.taskAdapter;
  }

  createOversightTask(task: BrainConsortiumOversightTask): BrainConsortiumOversightTaskCreateResult {
    const action = mapOversightTaskToCreateAction(task);
    const taskResult = this.taskAdapter.createTaskFromAction(action);
    this.oversightTasks.set(task.oversightTaskId, cloneOversightTask(task));
    return {
      oversightTask: cloneOversightTask(task),
      action,
      taskResult,
    };
  }

  assignOversightTask(oversightTaskId: string, occurredAt?: string): BrainConsortiumOversightTaskAssignmentResult {
    const task = this.getRequiredOversightTask(oversightTaskId);
    const action = mapOversightTaskToAssignmentAction(task, occurredAt);
    return {
      oversightTaskId,
      action,
      taskResult: this.taskAdapter.assignTaskFromAction(action),
    };
  }

  reportOversightTask(input: BrainOversightReportInput): BrainConsortiumOversightTaskReportResult {
    const task = this.getRequiredOversightTask(input.oversightTaskId);
    const actions = mapBrainOversightReportToActions(task, input);
    return {
      oversightTaskId: input.oversightTaskId,
      action: actions.reportAction,
      taskResult: this.taskAdapter.reportTaskFromAction(actions.reportAction),
      lifecycleResult: this.taskAdapter.applyLifecycleFromAction(actions.lifecycleAction),
    };
  }

  escalateOversightTask(input: BrainOversightEscalationInput): BrainConsortiumOversightTaskEscalationResult {
    const task = this.getRequiredOversightTask(input.oversightTaskId);
    const action = mapBrainOversightEscalationToAction(task, input);
    return {
      oversightTaskId: input.oversightTaskId,
      action,
      taskResult: this.taskAdapter.escalateTaskFromAction(action),
    };
  }

  markOversightTaskInAnalysis(
    oversightTaskId: string,
    summary: string,
    occurredAt?: string
  ): BrainConsortiumOversightTaskReportResult {
    return this.reportOversightTask({
      oversightTaskId,
      summary,
      state: "in_analysis",
      occurredAt,
    });
  }

  markOversightTaskFindingsReady(
    oversightTaskId: string,
    summary: string,
    findings?: string[],
    occurredAt?: string
  ): BrainConsortiumOversightTaskReportResult {
    return this.reportOversightTask({
      oversightTaskId,
      summary,
      findings,
      state: "findings_ready",
      occurredAt,
    });
  }

  markOversightTaskCompleted(
    oversightTaskId: string,
    summary: string,
    occurredAt?: string
  ): BrainConsortiumOversightTaskReportResult {
    return this.reportOversightTask({
      oversightTaskId,
      summary,
      state: "completed",
      occurredAt,
    });
  }

  markOversightTaskBlocked(
    oversightTaskId: string,
    summary: string,
    blockers: string[],
    occurredAt?: string
  ): BrainConsortiumOversightTaskReportResult {
    return this.reportOversightTask({
      oversightTaskId,
      summary,
      blockers,
      state: "blocked",
      occurredAt,
    });
  }

  private getRequiredOversightTask(oversightTaskId: string): BrainConsortiumOversightTask {
    const task = this.oversightTasks.get(oversightTaskId);
    if (!task) {
      throw new Error(`Brain-consortium oversight task not found: ${oversightTaskId}`);
    }
    return cloneOversightTask(task);
  }
}

function cloneOversightTask(task: BrainConsortiumOversightTask): BrainConsortiumOversightTask {
  return {
    ...task,
    scope: task.scope ? [...task.scope] : undefined,
    constraints: task.constraints ? [...task.constraints] : undefined,
    dependencyReferences: task.dependencyReferences ? [...task.dependencyReferences] : undefined,
    evidenceReferences: task.evidenceReferences ? [...task.evidenceReferences] : undefined,
  };
}
