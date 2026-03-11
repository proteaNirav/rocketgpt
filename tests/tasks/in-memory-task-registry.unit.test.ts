import * as assert from "node:assert/strict";
import { test } from "node:test";
import { InMemoryTaskRegistry } from "../../src/tasks/registry/in-memory-task-registry";

test("registry creates assigns updates and queries tasks through shared contracts", () => {
  const registry = new InMemoryTaskRegistry();
  const task = registry.createTask({
    taskId: "task-001",
    title: "Implement shared task scaffold",
    taskType: "implementation",
    sourceLayer: "pm",
    ownerRole: "platform_pm",
    priority: "high",
    status: "queued",
    dependencies: ["task-000"],
    dueDate: "2026-03-20T00:00:00.000Z",
    evidenceReferences: [{ sourceSystem: "docs", sourceRef: "ops-architecture" }],
    outputs: ["src/tasks"],
  });

  assert.equal(task.createdAt.length > 0, true);
  assert.equal(task.updatedAt.length > 0, true);
  assert.equal(registry.listTasks().length, 1);

  const assigned = registry.assignTask("task-001", {
    assigneeRole: "builder",
    workerId: "builder-17",
    assignedByRole: "platform_pm",
    assignedAt: "2026-03-11T08:00:00.000Z",
  });

  assert.equal(assigned.status, "assigned");
  assert.equal(assigned.assignment?.workerId, "builder-17");
  assert.equal(registry.listTasksByRole("builder").length, 1);

  const updated = registry.updateTaskStatus("task-001", {
    status: "in_progress",
    updatedAt: "2026-03-11T08:05:00.000Z",
    reportSummary: "Implementation started",
  });

  assert.equal(updated.status, "in_progress");
  assert.equal(updated.reportSummary, "Implementation started");
  assert.equal(registry.listTasksByStatus("in_progress").length, 1);
});

test("registry stores upward reporting escalations and lifecycle evidence", () => {
  const registry = new InMemoryTaskRegistry();
  registry.createTask({
    taskId: "task-002",
    title: "Publish implementation report",
    taskType: "review",
    sourceLayer: "builder",
    ownerRole: "builder_lead",
    priority: "normal",
    status: "assigned",
    dependencies: [],
    createdAt: "2026-03-11T09:00:00.000Z",
  });

  registry.addReport({
    reportId: "report-002",
    taskId: "task-002",
    reportingRole: "builder",
    statusSummary: "Build complete with one governance question",
    blockers: ["Awaiting governance sign-off"],
    risks: ["Delayed closure if policy review slips"],
    evidence: [{ sourceSystem: "repo", sourceRef: "src/tasks" }],
    recommendations: ["Escalate to task governor for decision"],
    reportedAt: "2026-03-11T09:10:00.000Z",
  });

  registry.recordEscalation({
    escalationId: "esc-002",
    taskId: "task-002",
    fromRole: "builder_lead",
    toRole: "task_governor",
    reason: "Governance interpretation required",
    severity: "moderate",
    createdAt: "2026-03-11T09:12:00.000Z",
  });

  const task = registry.getTaskById("task-002");
  const reports = registry.listReports("task-002");
  const escalations = registry.listEscalations("task-002");
  const events = registry.listLifecycleEvents("task-002");

  assert.equal(task?.reportSummary, "Build complete with one governance question");
  assert.equal(reports.length, 1);
  assert.equal(escalations.length, 1);
  assert.deepEqual(
    events.map((event) => event.eventType),
    ["task_created", "task_report_added", "task_escalated"]
  );
});
