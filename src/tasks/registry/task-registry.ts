import type { TaskAssignment } from "../contracts/task-assignment";
import type { TaskEscalationRecord } from "../contracts/task-escalation-record";
import type { TaskRecord, TaskRecordCreateInput } from "../contracts/task-record";
import type { TaskReport } from "../contracts/task-report";
import type { TaskReportingContract } from "../reporting/task-reporting-contract";
import type { TaskOwnerRole } from "../types/task-owner-role";
import type { TaskStatus } from "../types/task-status";

export interface TaskStatusUpdate {
  status: TaskStatus;
  updatedAt?: string;
  reportSummary?: string;
}

export interface TaskRegistry extends TaskReportingContract {
  createTask(task: TaskRecordCreateInput): TaskRecord;
  updateTaskStatus(taskId: string, update: TaskStatusUpdate): TaskRecord;
  assignTask(taskId: string, assignment: TaskAssignment): TaskRecord;
  getTaskById(taskId: string): TaskRecord | null;
  listTasks(): TaskRecord[];
  listTasksByRole(role: TaskOwnerRole): TaskRecord[];
  listTasksByStatus(status: TaskStatus): TaskRecord[];
  addReport(report: TaskReport): TaskReport;
  recordEscalation(escalation: TaskEscalationRecord): TaskEscalationRecord;
}
