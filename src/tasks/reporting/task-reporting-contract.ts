import type { TaskEscalationRecord } from "../contracts/task-escalation-record";
import type { TaskReport } from "../contracts/task-report";
import type { TaskLifecycleEvent } from "./task-lifecycle-event";

export interface TaskReportingContract {
  addReport(report: TaskReport): TaskReport;
  listReports(taskId: string): TaskReport[];
  recordEscalation(escalation: TaskEscalationRecord): TaskEscalationRecord;
  listEscalations(taskId: string): TaskEscalationRecord[];
  listLifecycleEvents(taskId: string): TaskLifecycleEvent[];
}
