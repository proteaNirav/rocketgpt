import * as assert from "node:assert/strict";
import { test } from "node:test";
import { InMemoryTaskRegistry } from "../../src/tasks/registry/in-memory-task-registry";
import { LearnerBuilderWorkUnitFlow } from "../../src/tasks/integrations/learner-builder-work-unit-flow";

test("learner creates builder work-unit task through shared task adapter", () => {
  const flow = new LearnerBuilderWorkUnitFlow({ registry: new InMemoryTaskRegistry() });

  const result = flow.createWorkUnit({
    workUnitId: "wu-001",
    title: "Implement deterministic reporting hook",
    description: "Create the first builder work-unit using shared task artifacts.",
    learnerRole: "learner",
    targetBuilderRole: "builder",
    targetBuilderWorkerId: "builder-11",
    builderTypeHints: ["integration", "test"],
    priority: "high",
    acceptanceCriteria: ["report path is deterministic", "lifecycle events are registry-backed"],
    dependencyReferences: ["dep-01"],
    evidenceReferences: [{ sourceSystem: "docs", sourceRef: "builder-workforce-architecture" }],
    dueDate: "2026-03-14T00:00:00.000Z",
    expectedOutputs: ["src/tasks/integrations", "tests/tasks"],
  });

  assert.equal(result.taskResult.task.ownerRole, "learner");
  assert.equal(result.taskResult.task.assignment?.assigneeRole, "builder");
  assert.equal(result.taskResult.task.assignment?.workerId, "builder-11");
  assert.equal(result.taskResult.task.outputs?.includes("acceptance:report path is deterministic"), true);
  assert.equal(result.taskResult.task.outputs?.includes("builder_type_hint:integration"), true);
  assert.deepEqual(
    result.taskResult.lifecycleEvents.map((event) => event.eventType),
    ["task_created", "task_assigned"]
  );
});

test("learner can assign work-unit and builder can report completion or blocked status", () => {
  const registry = new InMemoryTaskRegistry();
  const flow = new LearnerBuilderWorkUnitFlow({ registry });

  flow.createWorkUnit({
    workUnitId: "wu-002",
    title: "Implement work-unit handoff",
    description: "Learner delegates a builder implementation unit.",
    learnerRole: "learner",
    targetBuilderRole: "builder",
    targetBuilderWorkerId: "builder-22",
    priority: "normal",
    acceptanceCriteria: ["builder can report completion", "builder can report blocked state"],
  });

  const assignment = flow.assignWorkUnit("wu-002", "2026-03-11T13:00:00.000Z");
  const completed = flow.markWorkUnitCompleted("wu-002", "Work unit completed and ready for learner review", "2026-03-11T13:10:00.000Z");
  const blocked = flow.markWorkUnitBlocked(
    "wu-002",
    "Execution blocked pending missing fixture",
    ["fixture package not available"],
    "2026-03-11T13:20:00.000Z"
  );

  assert.equal(assignment.taskResult.assignment.workerId, "builder-22");
  assert.equal(assignment.taskResult.lifecycleEvents[0]?.eventType, "task_assigned");
  assert.equal(completed.taskResult.report.reportingRole, "builder");
  assert.equal(completed.lifecycleResult.task.status, "completed");
  assert.equal(blocked.taskResult.report.blockers[0], "fixture package not available");
  assert.equal(blocked.lifecycleResult.task.status, "blocked");
});

test("builder can escalate blocker back to learner through shared task path", () => {
  const registry = new InMemoryTaskRegistry();
  const flow = new LearnerBuilderWorkUnitFlow({ registry });

  flow.createWorkUnit({
    workUnitId: "wu-003",
    title: "Resolve acceptance criteria gap",
    description: "Builder needs learner clarification before proceeding.",
    learnerRole: "learner_lead",
    targetBuilderRole: "builder",
    targetBuilderWorkerId: "builder-31",
    priority: "high",
    acceptanceCriteria: ["criteria are explicit"],
    evidenceReferences: [{ sourceSystem: "repo", sourceRef: "src/tasks/adapters" }],
  });

  const escalation = flow.escalateWorkUnit({
    workUnitId: "wu-003",
    builderWorkerId: "builder-31",
    kind: "unclear_acceptance_criteria",
    reason: "Acceptance criteria do not define verification threshold",
    occurredAt: "2026-03-11T13:30:00.000Z",
  });

  const task = flow.getTaskAdapter().getRegistry().getTaskById("wu-003");
  const escalations = flow.getTaskAdapter().getRegistry().listEscalations("wu-003");

  assert.equal(escalation.taskResult.escalation.fromRole, "builder");
  assert.equal(escalation.taskResult.escalation.toRole, "learner_lead");
  assert.equal(escalation.taskResult.escalation.severity, "moderate");
  assert.equal(escalation.taskResult.lifecycleEvents[0]?.eventType, "task_escalated");
  assert.equal(task?.ownerRole, "learner_lead");
  assert.equal(escalations.length, 1);
});

test("required work-unit fields fail explicitly and metadata survives mapping", () => {
  const flow = new LearnerBuilderWorkUnitFlow({ registry: new InMemoryTaskRegistry() });

  assert.throws(
    () =>
      flow.createWorkUnit({
        workUnitId: "wu-bad-001",
        title: "",
        description: "Missing title should fail",
        learnerRole: "learner",
        targetBuilderRole: "builder",
        priority: "normal",
      }),
    /requires title/
  );

  flow.createWorkUnit({
    workUnitId: "wu-004",
    title: "Metadata preservation check",
    description: "Preserve context and builder hints in mapped task fields.",
    learnerRole: "learner",
    targetBuilderRole: "builder",
    builderTypeHints: ["api"],
    priority: "high",
    acceptanceCriteria: ["API output is bounded"],
    evidenceReferences: [{ sourceSystem: "docs", sourceRef: "learner-capability-contract" }],
    expectedOutputs: ["api-contract"],
  });

  const report = flow.reportWorkUnit({
    workUnitId: "wu-004",
    state: "needs_clarification",
    summary: "Need clarification on payload constraints.",
    recommendations: ["Learner should refine API boundary"],
    occurredAt: "2026-03-11T13:40:00.000Z",
  });

  const task = flow.getTaskAdapter().getRegistry().getTaskById("wu-004");

  assert.equal(task?.evidenceReferences?.[0]?.sourceRef, "learner-capability-contract");
  assert.equal(task?.outputs?.includes("builder_type_hint:api"), true);
  assert.equal(task?.outputs?.includes("acceptance:API output is bounded"), true);
  assert.equal(report.lifecycleResult.task.status, "blocked");
  assert.match(report.taskResult.report.statusSummary, /Needs learner clarification/);
});
