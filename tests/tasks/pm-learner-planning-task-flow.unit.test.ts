import * as assert from "node:assert/strict";
import { test } from "node:test";
import { InMemoryTaskRegistry } from "../../src/tasks/registry/in-memory-task-registry";
import { PmLearnerPlanningTaskFlow } from "../../src/tasks/integrations/pm-learner-planning-task-flow";

test("PM creates learner planning task through shared task adapter", () => {
  const flow = new PmLearnerPlanningTaskFlow({ registry: new InMemoryTaskRegistry() });

  const result = flow.createPlanningTask({
    planningTaskId: "plan-001",
    title: "Study task graph adoption path",
    description: "PM requests a bounded study on the first adoption increment.",
    pmRole: "platform_pm",
    targetLearnerRole: "learner",
    targetLearnerWorkerId: "learner-11",
    priority: "high",
    objective: "Produce a planning recommendation for shared task adoption.",
    constraints: ["No orchestration runtime", "No persistent storage"],
    dependencyReferences: ["ops-architecture-01"],
    evidenceReferences: [{ sourceSystem: "docs", sourceRef: "universal-task-governance" }],
    reportingExpectation: "Return blocker/risk/recommendation summary",
    dueDate: "2026-03-15T00:00:00.000Z",
  });

  assert.equal(result.taskResult.task.ownerRole, "platform_pm");
  assert.equal(result.taskResult.task.assignment?.assigneeRole, "learner");
  assert.equal(result.taskResult.task.assignment?.workerId, "learner-11");
  assert.equal(result.taskResult.task.outputs?.includes("objective:Produce a planning recommendation for shared task adoption."), true);
  assert.equal(result.taskResult.task.outputs?.includes("constraint:No orchestration runtime"), true);
  assert.equal(
    result.taskResult.task.outputs?.includes("reporting_expectation:Return blocker/risk/recommendation summary"),
    true
  );
});

test("PM can assign planning task and learner can report progress blocker and completion", () => {
  const flow = new PmLearnerPlanningTaskFlow({ registry: new InMemoryTaskRegistry() });

  flow.createPlanningTask({
    planningTaskId: "plan-002",
    title: "Prepare learner study note",
    description: "Create a bounded planning note for the next implementation slice.",
    pmRole: "program_manager",
    targetLearnerRole: "learner_lead",
    targetLearnerWorkerId: "learner-22",
    priority: "normal",
    objective: "Identify safe next integration step.",
  });

  const assignment = flow.assignPlanningTask("plan-002", "2026-03-11T14:00:00.000Z");
  const inStudy = flow.markPlanningTaskInStudy("plan-002", "Reviewing current scaffold and constraints", "2026-03-11T14:05:00.000Z");
  const blocked = flow.markPlanningTaskBlocked(
    "plan-002",
    "Blocked pending missing architecture context",
    ["missing architecture appendix"],
    "2026-03-11T14:10:00.000Z"
  );
  const completed = flow.markPlanningTaskCompleted(
    "plan-002",
    "Planning note completed with recommended next step",
    "2026-03-11T14:20:00.000Z"
  );

  assert.equal(assignment.taskResult.assignment.workerId, "learner-22");
  assert.equal(assignment.taskResult.lifecycleEvents[0]?.eventType, "task_assigned");
  assert.equal(inStudy.taskResult.report.reportingRole, "learner_lead");
  assert.equal(inStudy.lifecycleResult.task.status, "in_progress");
  assert.equal(blocked.taskResult.report.blockers[0], "missing architecture appendix");
  assert.equal(blocked.lifecycleResult.task.status, "blocked");
  assert.equal(completed.lifecycleResult.task.status, "completed");
});

test("learner can report risks recommendations and escalate issue back to PM", () => {
  const registry = new InMemoryTaskRegistry();
  const flow = new PmLearnerPlanningTaskFlow({ registry });

  flow.createPlanningTask({
    planningTaskId: "plan-003",
    title: "Assess architecture uncertainty",
    description: "Learner needs to study uncertainty before recommending implementation.",
    pmRole: "platform_pm",
    targetLearnerRole: "learner",
    targetLearnerWorkerId: "learner-31",
    priority: "high",
    objective: "Clarify uncertain architecture boundary.",
    evidenceReferences: [{ sourceSystem: "docs", sourceRef: "task-graph-engine-architecture" }],
  });

  const report = flow.reportPlanningTask({
    planningTaskId: "plan-003",
    learnerWorkerId: "learner-31",
    summary: "Recommendation draft is ready with one architecture risk.",
    state: "recommendation_ready",
    risks: ["Task graph boundary remains partially undefined"],
    recommendations: ["Confirm adapter boundary before next integration"],
    occurredAt: "2026-03-11T14:30:00.000Z",
  });

  const escalation = flow.escalatePlanningTask({
    planningTaskId: "plan-003",
    learnerWorkerId: "learner-31",
    kind: "architectural_uncertainty",
    reason: "Architecture document leaves one handoff boundary unspecified",
    occurredAt: "2026-03-11T14:35:00.000Z",
  });

  const task = flow.getTaskAdapter().getRegistry().getTaskById("plan-003");

  assert.equal(report.taskResult.report.risks[0], "Task graph boundary remains partially undefined");
  assert.equal(report.taskResult.report.recommendations[0], "Confirm adapter boundary before next integration");
  assert.match(report.taskResult.report.statusSummary, /Recommendation package is ready/);
  assert.equal(report.lifecycleResult.task.status, "completed");
  assert.equal(escalation.taskResult.escalation.fromRole, "learner");
  assert.equal(escalation.taskResult.escalation.toRole, "platform_pm");
  assert.equal(escalation.taskResult.lifecycleEvents[0]?.eventType, "task_escalated");
  assert.equal(task?.evidenceReferences?.[0]?.sourceRef, "task-graph-engine-architecture");
});

test("required planning-task fields fail explicitly and metadata survives mapping", () => {
  const flow = new PmLearnerPlanningTaskFlow({ registry: new InMemoryTaskRegistry() });

  assert.throws(
    () =>
      flow.createPlanningTask({
        planningTaskId: "plan-bad-001",
        title: "Missing objective",
        description: "This should fail",
        pmRole: "platform_pm",
        targetLearnerRole: "learner",
        priority: "normal",
        objective: "",
      }),
    /requires objective/
  );

  flow.createPlanningTask({
    planningTaskId: "plan-004",
    title: "Metadata preservation check",
    description: "Preserve PM objective and reporting expectation.",
    pmRole: "platform_pm",
    targetLearnerRole: "learner",
    priority: "high",
    objective: "Create a bounded planning recommendation.",
    constraints: ["No scheduling logic"],
    reportingExpectation: "Return explicit blockers and risks",
    evidenceReferences: [{ sourceSystem: "docs", sourceRef: "role-scopes-and-operating-boundaries" }],
  });

  const report = flow.reportPlanningTask({
    planningTaskId: "plan-004",
    summary: "Learner is blocked on missing policy reference.",
    state: "blocked",
    blockers: ["policy appendix missing"],
    risks: ["Recommendation quality may degrade without policy reference"],
    occurredAt: "2026-03-11T14:40:00.000Z",
  });

  const task = flow.getTaskAdapter().getRegistry().getTaskById("plan-004");

  assert.equal(task?.outputs?.includes("objective:Create a bounded planning recommendation."), true);
  assert.equal(task?.outputs?.includes("constraint:No scheduling logic"), true);
  assert.equal(task?.outputs?.includes("reporting_expectation:Return explicit blockers and risks"), true);
  assert.equal(task?.evidenceReferences?.[0]?.sourceRef, "role-scopes-and-operating-boundaries");
  assert.equal(report.lifecycleResult.task.status, "blocked");
});
