import { InMemoryTaskRegistry } from "../registry/in-memory-task-registry";
import type { TaskRegistry } from "../registry/task-registry";
import type {
  TaskAssignmentFromActionResult,
  TaskCreationFromActionResult,
  TaskEscalationFromActionResult,
  TaskGovernanceAdapterOptions,
  TaskLifecycleFromActionResult,
  TaskReportFromActionResult,
} from "./task-governance-adapter.types";
import type { TaskGovernanceAction } from "./task-governance-action";
import {
  assertActionType,
  latestLifecycleEvent,
  mapTaskAssignment,
  mapTaskCreateInput,
  mapTaskEscalation,
  mapTaskReport,
  requireTaskId,
  resolveActionTaskId,
  resolveActionTimestamp,
} from "./task-governance-mapping";

export class TaskGovernanceAdapter {
  private readonly registry: TaskRegistry;

  constructor(options?: TaskGovernanceAdapterOptions) {
    this.registry = options?.registry ?? new InMemoryTaskRegistry();
  }

  getRegistry(): TaskRegistry {
    return this.registry;
  }

  createTaskFromAction(action: TaskGovernanceAction): TaskCreationFromActionResult {
    assertActionType(action, "create_task");
    const lifecycleEvents = [];

    this.registry.createTask(mapTaskCreateInput(action));
    lifecycleEvents.push(latestLifecycleEvent(this.registry, resolveActionTaskId(action)));

    let assignment;
    let task = this.registry.getTaskById(resolveActionTaskId(action));
    if (!task) {
      throw new Error(`Task ${resolveActionTaskId(action)} was not created`);
    }

    if (action.targetRole || action.targetWorkerId) {
      assignment = mapTaskAssignment(action);
      task = this.registry.assignTask(task.taskId, assignment);
      lifecycleEvents.push(latestLifecycleEvent(this.registry, task.taskId));
    }

    return {
      action,
      task,
      assignment,
      lifecycleEvents,
    };
  }

  assignTaskFromAction(action: TaskGovernanceAction): TaskAssignmentFromActionResult {
    assertActionType(action, "assign_task");
    const taskId = requireTaskId(action);
    const assignment = mapTaskAssignment(action);
    const task = this.registry.assignTask(taskId, assignment);
    return {
      action,
      task,
      assignment,
      lifecycleEvents: [latestLifecycleEvent(this.registry, taskId)],
    };
  }

  reportTaskFromAction(action: TaskGovernanceAction): TaskReportFromActionResult {
    assertActionType(action, "report_task");
    const taskId = requireTaskId(action);
    const report = this.registry.addReport(mapTaskReport(action));
    const task = this.registry.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} was not found after report application`);
    }
    return {
      action,
      task,
      report,
      lifecycleEvents: [latestLifecycleEvent(this.registry, taskId)],
    };
  }

  escalateTaskFromAction(action: TaskGovernanceAction): TaskEscalationFromActionResult {
    assertActionType(action, "escalate_task");
    const taskId = requireTaskId(action);
    const escalation = this.registry.recordEscalation(mapTaskEscalation(action));
    const task = this.registry.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} was not found after escalation application`);
    }
    return {
      action,
      task,
      escalation,
      lifecycleEvents: [latestLifecycleEvent(this.registry, taskId)],
    };
  }

  applyLifecycleFromAction(action: TaskGovernanceAction): TaskLifecycleFromActionResult {
    assertActionType(action, "update_task_status");
    const taskId = requireTaskId(action);
    if (!action.taskStatus) {
      throw new Error(`Governance action ${action.actionId} requires taskStatus`);
    }

    const task = this.registry.updateTaskStatus(taskId, {
      status: action.taskStatus,
      updatedAt: resolveActionTimestamp(action),
      reportSummary: action.reportSummary,
    });
    return {
      action,
      task,
      lifecycleEvents: [latestLifecycleEvent(this.registry, taskId)],
    };
  }
}
