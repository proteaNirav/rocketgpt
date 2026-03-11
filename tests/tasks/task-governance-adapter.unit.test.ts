import * as assert from "node:assert/strict";
import { test } from "node:test";
import { TaskGovernanceAdapter } from "../../src/tasks/adapters/task-governance-adapter";
import { InMemoryTaskRegistry } from "../../src/tasks/registry/in-memory-task-registry";

test("adapter creates architecture-aligned task and assignment from governance action", () => {
  const adapter = new TaskGovernanceAdapter({ registry: new InMemoryTaskRegistry() });

  const result = adapter.createTaskFromAction({
    actionId: "consortium-brain-001",
    title: "Review delivery risk posture",
    description: "Consortium requests a bounded analysis review",
    actionType: "create_task",
    sourceLayer: "consortium",
    ownerRole: "consortium",
    targetRole: "brain",
    taskType: "analysis",
    taskPriority: "high",
    dependencies: ["risk-ledger-01"],
    evidenceReferences: [{ sourceSystem: "docs", sourceRef: "operations-architecture" }],
    outputs: ["risk-summary"],
    occurredAt: "2026-03-11T11:00:00.000Z",
  });

  assert.equal(result.task.taskId, "consortium-brain-001:task");
  assert.equal(result.task.sourceLayer, "consortium");
  assert.equal(result.task.ownerRole, "consortium");
  assert.equal(result.task.assignment?.assigneeRole, "brain");
  assert.equal(result.task.status, "assigned");
  assert.deepEqual(
    result.lifecycleEvents.map((event) => event.eventType),
    ["task_created", "task_assigned"]
  );
});

test("adapter maps assignment report escalation and lifecycle updates without inventing routing logic", () => {
  const registry = new InMemoryTaskRegistry();
  const adapter = new TaskGovernanceAdapter({ registry });

  adapter.createTaskFromAction({
    actionId: "pm-learner-001",
    taskId: "task-pm-learner-001",
    title: "Prepare implementation study",
    actionType: "create_task",
    sourceLayer: "pm",
    ownerRole: "platform_pm",
    targetRole: "learner",
    taskType: "research",
    taskPriority: "normal",
    occurredAt: "2026-03-11T11:10:00.000Z",
  });

  const assignment = adapter.assignTaskFromAction({
    actionId: "learner-builder-assign-001",
    taskId: "task-pm-learner-001",
    title: "Assign implementation work unit",
    actionType: "assign_task",
    sourceLayer: "learner",
    ownerRole: "learner",
    targetRole: "builder",
    targetWorkerId: "builder-22",
    occurredAt: "2026-03-11T11:12:00.000Z",
  });

  const report = adapter.reportTaskFromAction({
    actionId: "builder-report-001",
    taskId: "task-pm-learner-001",
    title: "Builder completion report",
    actionType: "report_task",
    sourceLayer: "builder",
    ownerRole: "learner",
    actorRole: "builder",
    targetRole: "learner",
    reportSummary: "Implementation work unit completed",
    blockers: [],
    risks: ["Pending integration verification"],
    recommendations: ["Move task into review"],
    evidenceReferences: [{ sourceSystem: "repo", sourceRef: "src/tasks/adapters" }],
    occurredAt: "2026-03-11T11:20:00.000Z",
  });

  const escalation = adapter.escalateTaskFromAction({
    actionId: "builder-escalation-001",
    taskId: "task-pm-learner-001",
    title: "Dependency blocker escalation",
    actionType: "escalate_task",
    sourceLayer: "builder",
    ownerRole: "learner",
    actorRole: "builder",
    targetRole: "learner",
    escalationReason: "External dependency is blocked",
    escalationSeverity: "high",
    occurredAt: "2026-03-11T11:22:00.000Z",
  });

  const lifecycle = adapter.applyLifecycleFromAction({
    actionId: "builder-review-001",
    taskId: "task-pm-learner-001",
    title: "Mark task blocked",
    actionType: "update_task_status",
    sourceLayer: "builder",
    ownerRole: "learner",
    actorRole: "builder",
    taskStatus: "blocked",
    reportSummary: "Blocked pending external dependency",
    occurredAt: "2026-03-11T11:23:00.000Z",
  });

  assert.equal(assignment.assignment.workerId, "builder-22");
  assert.equal(assignment.lifecycleEvents[0]?.eventType, "task_assigned");
  assert.equal(report.report.reportingRole, "builder");
  assert.equal(report.lifecycleEvents[0]?.eventType, "task_report_added");
  assert.equal(escalation.escalation.severity, "high");
  assert.equal(escalation.lifecycleEvents[0]?.eventType, "task_escalated");
  assert.equal(lifecycle.task.status, "blocked");
  assert.equal(lifecycle.lifecycleEvents[0]?.eventType, "task_status_updated");
});

test("adapter fails explicitly when required action fields are missing", () => {
  const adapter = new TaskGovernanceAdapter({ registry: new InMemoryTaskRegistry() });

  assert.throws(
    () =>
      adapter.createTaskFromAction({
        actionId: "bad-create-001",
        title: "Incomplete action",
        actionType: "create_task",
        sourceLayer: "pm",
        ownerRole: "platform_pm",
      }),
    /requires taskType/
  );

  assert.throws(
    () =>
      adapter.reportTaskFromAction({
        actionId: "bad-report-001",
        taskId: "missing-task",
        title: "Missing summary",
        actionType: "report_task",
        sourceLayer: "brain",
        ownerRole: "consortium",
        actorRole: "brain",
      }),
    /requires reportSummary/
  );
});
