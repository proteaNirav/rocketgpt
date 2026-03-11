import { TaskGovernanceAdapter } from "../adapters/task-governance-adapter";
import type { TaskGovernanceAdapterOptions } from "../adapters/task-governance-adapter.types";
import {
  mapOsRuntimeEscalationToAction,
  mapOsRuntimeReportToActions,
  mapRuntimeTaskToAssignmentAction,
  mapRuntimeTaskToCreateAction,
} from "./cats-os-runtime-task-mapping";
import type {
  CatsOsRuntimeTaskAssignmentResult,
  CatsOsRuntimeTaskCreateResult,
  CatsOsRuntimeTaskEscalationResult,
  CatsOsRuntimeTaskReportResult,
  OsRuntimeEscalationInput,
  OsRuntimeReportInput,
} from "./cats-os-runtime-task.types";
import type { CatsOsRuntimeTask } from "./cats-os-runtime-task";

export class CatsOsRuntimeTaskFlow {
  private readonly taskAdapter: TaskGovernanceAdapter;
  private readonly runtimeTasks = new Map<string, CatsOsRuntimeTask>();

  constructor(options?: TaskGovernanceAdapterOptions) {
    this.taskAdapter = new TaskGovernanceAdapter(options);
  }

  getTaskAdapter(): TaskGovernanceAdapter {
    return this.taskAdapter;
  }

  createRuntimeTask(task: CatsOsRuntimeTask): CatsOsRuntimeTaskCreateResult {
    const action = mapRuntimeTaskToCreateAction(task);
    const taskResult = this.taskAdapter.createTaskFromAction(action);
    this.runtimeTasks.set(task.runtimeTaskId, cloneRuntimeTask(task));
    return {
      runtimeTask: cloneRuntimeTask(task),
      action,
      taskResult,
    };
  }

  assignRuntimeTask(runtimeTaskId: string, occurredAt?: string): CatsOsRuntimeTaskAssignmentResult {
    const task = this.getRequiredRuntimeTask(runtimeTaskId);
    const action = mapRuntimeTaskToAssignmentAction(task, occurredAt);
    return {
      runtimeTaskId,
      action,
      taskResult: this.taskAdapter.assignTaskFromAction(action),
    };
  }

  reportRuntimeTask(input: OsRuntimeReportInput): CatsOsRuntimeTaskReportResult {
    const task = this.getRequiredRuntimeTask(input.runtimeTaskId);
    const actions = mapOsRuntimeReportToActions(task, input);
    return {
      runtimeTaskId: input.runtimeTaskId,
      action: actions.reportAction,
      taskResult: this.taskAdapter.reportTaskFromAction(actions.reportAction),
      lifecycleResult: this.taskAdapter.applyLifecycleFromAction(actions.lifecycleAction),
    };
  }

  escalateRuntimeTask(input: OsRuntimeEscalationInput): CatsOsRuntimeTaskEscalationResult {
    const task = this.getRequiredRuntimeTask(input.runtimeTaskId);
    const action = mapOsRuntimeEscalationToAction(task, input);
    return {
      runtimeTaskId: input.runtimeTaskId,
      action,
      taskResult: this.taskAdapter.escalateTaskFromAction(action),
    };
  }

  markRuntimeTaskInProgress(runtimeTaskId: string, summary: string, occurredAt?: string): CatsOsRuntimeTaskReportResult {
    return this.reportRuntimeTask({
      runtimeTaskId,
      summary,
      state: "in_execution",
      occurredAt,
    });
  }

  markRuntimeTaskResultReady(runtimeTaskId: string, summary: string, occurredAt?: string): CatsOsRuntimeTaskReportResult {
    return this.reportRuntimeTask({
      runtimeTaskId,
      summary,
      state: "result_ready",
      occurredAt,
    });
  }

  markRuntimeTaskCompleted(runtimeTaskId: string, summary: string, occurredAt?: string): CatsOsRuntimeTaskReportResult {
    return this.reportRuntimeTask({
      runtimeTaskId,
      summary,
      state: "completed",
      occurredAt,
    });
  }

  markRuntimeTaskBlocked(
    runtimeTaskId: string,
    summary: string,
    blockers: string[],
    occurredAt?: string
  ): CatsOsRuntimeTaskReportResult {
    return this.reportRuntimeTask({
      runtimeTaskId,
      summary,
      blockers,
      state: "blocked",
      occurredAt,
    });
  }

  private getRequiredRuntimeTask(runtimeTaskId: string): CatsOsRuntimeTask {
    const task = this.runtimeTasks.get(runtimeTaskId);
    if (!task) {
      throw new Error(`CATS-OS runtime task not found: ${runtimeTaskId}`);
    }
    return cloneRuntimeTask(task);
  }
}

function cloneRuntimeTask(task: CatsOsRuntimeTask): CatsOsRuntimeTask {
  return {
    ...task,
    preconditions: task.preconditions ? [...task.preconditions] : undefined,
    dependencyReferences: task.dependencyReferences ? [...task.dependencyReferences] : undefined,
    evidenceReferences: task.evidenceReferences ? [...task.evidenceReferences] : undefined,
    policyConstraintReferences: task.policyConstraintReferences ? [...task.policyConstraintReferences] : undefined,
  };
}
