import { TaskGovernanceAdapter } from "../adapters/task-governance-adapter";
import type { TaskGovernanceAdapterOptions } from "../adapters/task-governance-adapter.types";
import {
  mapCatsExecutionEscalationToAction,
  mapCatsExecutionReportToActions,
  mapExecutionTaskToAssignmentAction,
  mapExecutionTaskToCreateAction,
} from "./builder-cats-execution-task-mapping";
import type {
  BuilderCatsExecutionTaskAssignmentResult,
  BuilderCatsExecutionTaskCreateResult,
  BuilderCatsExecutionTaskEscalationResult,
  BuilderCatsExecutionTaskReportResult,
  CatsExecutionEscalationInput,
  CatsExecutionReportInput,
} from "./builder-cats-execution-task.types";
import type { BuilderCatsExecutionTask } from "./builder-cats-execution-task";

export class BuilderCatsExecutionTaskFlow {
  private readonly taskAdapter: TaskGovernanceAdapter;
  private readonly executionTasks = new Map<string, BuilderCatsExecutionTask>();

  constructor(options?: TaskGovernanceAdapterOptions) {
    this.taskAdapter = new TaskGovernanceAdapter(options);
  }

  getTaskAdapter(): TaskGovernanceAdapter {
    return this.taskAdapter;
  }

  createExecutionTask(task: BuilderCatsExecutionTask): BuilderCatsExecutionTaskCreateResult {
    const action = mapExecutionTaskToCreateAction(task);
    const taskResult = this.taskAdapter.createTaskFromAction(action);
    this.executionTasks.set(task.executionTaskId, cloneExecutionTask(task));
    return {
      executionTask: cloneExecutionTask(task),
      action,
      taskResult,
    };
  }

  assignExecutionTask(executionTaskId: string, occurredAt?: string): BuilderCatsExecutionTaskAssignmentResult {
    const task = this.getRequiredExecutionTask(executionTaskId);
    const action = mapExecutionTaskToAssignmentAction(task, occurredAt);
    return {
      executionTaskId,
      action,
      taskResult: this.taskAdapter.assignTaskFromAction(action),
    };
  }

  reportExecutionTask(input: CatsExecutionReportInput): BuilderCatsExecutionTaskReportResult {
    const task = this.getRequiredExecutionTask(input.executionTaskId);
    const actions = mapCatsExecutionReportToActions(task, input);
    return {
      executionTaskId: input.executionTaskId,
      action: actions.reportAction,
      taskResult: this.taskAdapter.reportTaskFromAction(actions.reportAction),
      lifecycleResult: this.taskAdapter.applyLifecycleFromAction(actions.lifecycleAction),
    };
  }

  escalateExecutionTask(input: CatsExecutionEscalationInput): BuilderCatsExecutionTaskEscalationResult {
    const task = this.getRequiredExecutionTask(input.executionTaskId);
    const action = mapCatsExecutionEscalationToAction(task, input);
    return {
      executionTaskId: input.executionTaskId,
      action,
      taskResult: this.taskAdapter.escalateTaskFromAction(action),
    };
  }

  markExecutionTaskInProgress(
    executionTaskId: string,
    summary: string,
    occurredAt?: string
  ): BuilderCatsExecutionTaskReportResult {
    return this.reportExecutionTask({
      executionTaskId,
      summary,
      state: "in_execution",
      occurredAt,
    });
  }

  markExecutionTaskResultReady(
    executionTaskId: string,
    summary: string,
    occurredAt?: string
  ): BuilderCatsExecutionTaskReportResult {
    return this.reportExecutionTask({
      executionTaskId,
      summary,
      state: "result_ready",
      occurredAt,
    });
  }

  markExecutionTaskCompleted(
    executionTaskId: string,
    summary: string,
    occurredAt?: string
  ): BuilderCatsExecutionTaskReportResult {
    return this.reportExecutionTask({
      executionTaskId,
      summary,
      state: "completed",
      occurredAt,
    });
  }

  markExecutionTaskBlocked(
    executionTaskId: string,
    summary: string,
    blockers: string[],
    occurredAt?: string
  ): BuilderCatsExecutionTaskReportResult {
    return this.reportExecutionTask({
      executionTaskId,
      summary,
      blockers,
      state: "blocked",
      occurredAt,
    });
  }

  private getRequiredExecutionTask(executionTaskId: string): BuilderCatsExecutionTask {
    const task = this.executionTasks.get(executionTaskId);
    if (!task) {
      throw new Error(`Builder-CATS execution task not found: ${executionTaskId}`);
    }
    return cloneExecutionTask(task);
  }
}

function cloneExecutionTask(task: BuilderCatsExecutionTask): BuilderCatsExecutionTask {
  return {
    ...task,
    builderTypeHints: task.builderTypeHints ? [...task.builderTypeHints] : undefined,
    scope: task.scope ? [...task.scope] : undefined,
    requiredInputs: task.requiredInputs ? [...task.requiredInputs] : undefined,
    dependencyReferences: task.dependencyReferences ? [...task.dependencyReferences] : undefined,
    evidenceReferences: task.evidenceReferences ? [...task.evidenceReferences] : undefined,
    policyConstraintReferences: task.policyConstraintReferences ? [...task.policyConstraintReferences] : undefined,
  };
}
