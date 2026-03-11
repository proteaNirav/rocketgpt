import type { TaskAssignment } from "../contracts/task-assignment";
import type { TaskEscalationRecord } from "../contracts/task-escalation-record";
import type { TaskRecord, TaskRecordCreateInput } from "../contracts/task-record";
import type { TaskReport } from "../contracts/task-report";
import type { TaskLifecycleEvent, TaskLifecycleEventType } from "../reporting/task-lifecycle-event";
import type { TaskOwnerRole } from "../types/task-owner-role";
import type { TaskStatus } from "../types/task-status";
import type { TaskRegistry, TaskStatusUpdate } from "./task-registry";

interface RegistryRow {
  task: TaskRecord;
  reports: TaskReport[];
  escalations: TaskEscalationRecord[];
  events: TaskLifecycleEvent[];
}

export class InMemoryTaskRegistry implements TaskRegistry {
  private readonly rows = new Map<string, RegistryRow>();
  private nextEventOrdinal = 1;

  createTask(task: TaskRecordCreateInput): TaskRecord {
    if (this.rows.has(task.taskId)) {
      throw new Error(`Task already exists: ${task.taskId}`);
    }

    const timestamp = task.createdAt ?? new Date().toISOString();
    const record: TaskRecord = {
      ...task,
      createdAt: timestamp,
      updatedAt: task.updatedAt ?? timestamp,
      dependencies: [...task.dependencies],
      assignment: task.assignment ? { ...task.assignment } : undefined,
      evidenceReferences: task.evidenceReferences ? [...task.evidenceReferences] : undefined,
      outputs: task.outputs ? [...task.outputs] : undefined,
    };

    const row: RegistryRow = {
      task: record,
      reports: [],
      escalations: [],
      events: [this.createLifecycleEvent(record.taskId, "task_created", record.createdAt, record.ownerRole, record.status)],
    };

    this.rows.set(record.taskId, row);
    return this.cloneTask(record);
  }

  updateTaskStatus(taskId: string, update: TaskStatusUpdate): TaskRecord {
    const row = this.getRequiredRow(taskId);
    const nextUpdatedAt = update.updatedAt ?? new Date().toISOString();
    row.task = {
      ...row.task,
      status: update.status,
      updatedAt: nextUpdatedAt,
      reportSummary: update.reportSummary ?? row.task.reportSummary,
    };
    row.events.push(
      this.createLifecycleEvent(taskId, "task_status_updated", nextUpdatedAt, row.task.ownerRole, update.status, update.reportSummary)
    );
    return this.cloneTask(row.task);
  }

  assignTask(taskId: string, assignment: TaskAssignment): TaskRecord {
    const row = this.getRequiredRow(taskId);
    const nextStatus: TaskStatus =
      row.task.status === "draft" || row.task.status === "queued" ? "assigned" : row.task.status;
    row.task = {
      ...row.task,
      assignment: { ...assignment },
      status: nextStatus,
      updatedAt: assignment.assignedAt,
    };
    row.events.push(
      this.createLifecycleEvent(
        taskId,
        "task_assigned",
        assignment.assignedAt,
        assignment.assignedByRole ?? row.task.ownerRole,
        row.task.status,
        assignment.workerId ?? assignment.assigneeRole
      )
    );
    return this.cloneTask(row.task);
  }

  addReport(report: TaskReport): TaskReport {
    const row = this.getRequiredRow(report.taskId);
    const storedReport = this.cloneReport(report);
    row.reports.push(storedReport);
    row.task = {
      ...row.task,
      reportSummary: storedReport.statusSummary,
      updatedAt: storedReport.reportedAt,
    };
    row.events.push(
      this.createLifecycleEvent(
        report.taskId,
        "task_report_added",
        report.reportedAt,
        report.reportingRole,
        row.task.status,
        report.statusSummary,
        report.reportId
      )
    );
    return this.cloneReport(storedReport);
  }

  recordEscalation(escalation: TaskEscalationRecord): TaskEscalationRecord {
    const row = this.getRequiredRow(escalation.taskId);
    const storedEscalation = { ...escalation };
    row.escalations.push(storedEscalation);
    row.task = {
      ...row.task,
      updatedAt: escalation.createdAt,
    };
    row.events.push(
      this.createLifecycleEvent(
        escalation.taskId,
        "task_escalated",
        escalation.createdAt,
        escalation.fromRole,
        row.task.status,
        escalation.reason,
        undefined,
        escalation.escalationId
      )
    );
    return { ...storedEscalation };
  }

  getTaskById(taskId: string): TaskRecord | null {
    const row = this.rows.get(taskId);
    return row ? this.cloneTask(row.task) : null;
  }

  listTasks(): TaskRecord[] {
    return [...this.rows.values()].map((row) => this.cloneTask(row.task));
  }

  listTasksByRole(role: TaskOwnerRole): TaskRecord[] {
    return this.listTasks().filter(
      (task) => task.ownerRole === role || task.assignment?.assigneeRole === role
    );
  }

  listTasksByStatus(status: TaskStatus): TaskRecord[] {
    return this.listTasks().filter((task) => task.status === status);
  }

  listReports(taskId: string): TaskReport[] {
    return this.getRequiredRow(taskId).reports.map((report) => this.cloneReport(report));
  }

  listEscalations(taskId: string): TaskEscalationRecord[] {
    return this.getRequiredRow(taskId).escalations.map((escalation) => ({ ...escalation }));
  }

  listLifecycleEvents(taskId: string): TaskLifecycleEvent[] {
    return this.getRequiredRow(taskId).events.map((event) => ({ ...event }));
  }

  private getRequiredRow(taskId: string): RegistryRow {
    const row = this.rows.get(taskId);
    if (!row) {
      throw new Error(`Task not found: ${taskId}`);
    }
    return row;
  }

  private createLifecycleEvent(
    taskId: string,
    eventType: TaskLifecycleEventType,
    occurredAt: string,
    actorRole?: TaskOwnerRole,
    nextStatus?: TaskStatus,
    detail?: string,
    reportId?: string,
    escalationId?: string
  ): TaskLifecycleEvent {
    const ordinal = this.nextEventOrdinal;
    this.nextEventOrdinal += 1;
    return {
      eventId: `${taskId}:${eventType}:${ordinal}`,
      taskId,
      eventType,
      actorRole,
      occurredAt,
      detail,
      nextStatus,
      reportId,
      escalationId,
    };
  }

  private cloneTask(task: TaskRecord): TaskRecord {
    return {
      ...task,
      assignment: task.assignment ? { ...task.assignment } : undefined,
      dependencies: [...task.dependencies],
      evidenceReferences: task.evidenceReferences ? [...task.evidenceReferences] : undefined,
      outputs: task.outputs ? [...task.outputs] : undefined,
    };
  }

  private cloneReport(report: TaskReport): TaskReport {
    return {
      ...report,
      blockers: [...report.blockers],
      risks: [...report.risks],
      evidence: [...report.evidence],
      recommendations: [...report.recommendations],
    };
  }
}
