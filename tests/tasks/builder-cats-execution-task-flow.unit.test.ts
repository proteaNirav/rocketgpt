import * as assert from "node:assert/strict";
import { test } from "node:test";
import { BuilderCatsExecutionTaskFlow } from "../../src/tasks/integrations/builder-cats-execution-task-flow";
import { InMemoryTaskRegistry } from "../../src/tasks/registry/in-memory-task-registry";

test("builder creates CATS execution task through shared task adapter", () => {
  const flow = new BuilderCatsExecutionTaskFlow({ registry: new InMemoryTaskRegistry() });

  const result = flow.createExecutionTask({
    executionTaskId: "cats-exec-001",
    title: "Prepare CAT operational bundle",
    description: "Builder issues a bounded CAT execution handoff.",
    builderRole: "builder",
    builderActorId: "builder-11",
    builderActorLabel: "Integration Builder",
    builderTypeHints: ["integration", "runtime"],
    targetCatsRole: "cats",
    targetCatsWorkerId: "cat-11",
    priority: "high",
    executionIntent: "Prepare a runtime-ready operational bundle for CAT execution.",
    scope: ["bundle packaging", "execution manifest"],
    requiredInputs: ["capability manifest", "execution template"],
    dependencyReferences: ["builder-runtime-dependency-01"],
    evidenceReferences: [{ sourceSystem: "docs", sourceRef: "builder-workforce-architecture" }],
    policyConstraintReferences: ["constitution:bounded-execution", "ops:no-runtime-selection"],
    dueDate: "2026-03-16T00:00:00.000Z",
  });

  assert.equal(result.taskResult.task.ownerRole, "builder");
  assert.equal(result.taskResult.task.assignment?.assigneeRole, "cats");
  assert.equal(result.taskResult.task.assignment?.workerId, "cat-11");
  assert.equal(result.taskResult.task.outputs?.includes("execution_intent:Prepare a runtime-ready operational bundle for CAT execution."), true);
  assert.equal(result.taskResult.task.outputs?.includes("required_input:capability manifest"), true);
  assert.equal(result.taskResult.task.outputs?.includes("policy_constraint_reference:constitution:bounded-execution"), true);
  assert.equal(result.taskResult.task.outputs?.includes("builder_type_hint:integration"), true);
});

test("builder assigns execution task and CAT can report progress result and completion", () => {
  const flow = new BuilderCatsExecutionTaskFlow({ registry: new InMemoryTaskRegistry() });

  flow.createExecutionTask({
    executionTaskId: "cats-exec-002",
    title: "Execute bounded CAT action",
    description: "Builder hands a bounded execution unit to a CAT.",
    builderRole: "builder_lead",
    targetCatsRole: "cats",
    targetCatsWorkerId: "cat-22",
    priority: "normal",
    executionIntent: "Execute one bounded CAT action and return a result package.",
  });

  const assignment = flow.assignExecutionTask("cats-exec-002", "2026-03-11T16:00:00.000Z");
  const inProgress = flow.markExecutionTaskInProgress(
    "cats-exec-002",
    "CAT execution has started with provided bounded inputs.",
    "2026-03-11T16:05:00.000Z"
  );
  const resultReady = flow.markExecutionTaskResultReady(
    "cats-exec-002",
    "Execution result package is assembled for builder review.",
    "2026-03-11T16:10:00.000Z"
  );
  const completed = flow.markExecutionTaskCompleted(
    "cats-exec-002",
    "Bounded execution handoff completed successfully.",
    "2026-03-11T16:15:00.000Z"
  );

  assert.equal(assignment.taskResult.assignment.workerId, "cat-22");
  assert.equal(assignment.taskResult.lifecycleEvents[0]?.eventType, "task_assigned");
  assert.equal(inProgress.taskResult.report.reportingRole, "cats");
  assert.equal(inProgress.lifecycleResult.task.status, "in_progress");
  assert.match(resultReady.taskResult.report.statusSummary, /Result package is ready for builder review/);
  assert.equal(resultReady.lifecycleResult.task.status, "in_progress");
  assert.equal(completed.lifecycleResult.task.status, "completed");
});

test("CAT can report blocker or clarification need back to builder", () => {
  const registry = new InMemoryTaskRegistry();
  const flow = new BuilderCatsExecutionTaskFlow({ registry });

  flow.createExecutionTask({
    executionTaskId: "cats-exec-003",
    title: "Hand off runtime-ready execution unit",
    description: "Builder provides a bounded runtime-ready unit to CATS.",
    builderRole: "builder",
    targetCatsRole: "cats",
    targetCatsWorkerId: "cat-31",
    priority: "high",
    executionIntent: "Execute a runtime-ready unit within explicit scope bounds.",
    evidenceReferences: [{ sourceSystem: "docs", sourceRef: "task-graph-engine-architecture" }],
  });

  const blocked = flow.markExecutionTaskBlocked(
    "cats-exec-003",
    "Blocked because one required input package is missing.",
    ["runtime bundle checksum missing"],
    "2026-03-11T16:20:00.000Z"
  );

  const clarification = flow.reportExecutionTask({
    executionTaskId: "cats-exec-003",
    catsWorkerId: "cat-31",
    summary: "Execution boundary is unclear for one requested operation.",
    state: "needs_builder_clarification",
    recommendations: ["Builder should narrow the execution payload boundary"],
    occurredAt: "2026-03-11T16:25:00.000Z",
  });

  const task = registry.getTaskById("cats-exec-003");

  assert.equal(blocked.taskResult.report.blockers[0], "runtime bundle checksum missing");
  assert.equal(blocked.lifecycleResult.task.status, "blocked");
  assert.match(clarification.taskResult.report.statusSummary, /Needs builder clarification/);
  assert.equal(clarification.lifecycleResult.task.status, "blocked");
  assert.equal(task?.evidenceReferences?.[0]?.sourceRef, "task-graph-engine-architecture");
});

test("CAT can escalate execution or policy issues back to builder", () => {
  const registry = new InMemoryTaskRegistry();
  const flow = new BuilderCatsExecutionTaskFlow({ registry });

  flow.createExecutionTask({
    executionTaskId: "cats-exec-004",
    title: "Run CAT deployment step",
    description: "Builder requests one bounded deployment-step execution.",
    builderRole: "builder_lead",
    targetCatsRole: "cats",
    targetCatsWorkerId: "cat-41",
    priority: "high",
    executionIntent: "Run one bounded deployment step with prevalidated inputs.",
  });

  const escalation = flow.escalateExecutionTask({
    executionTaskId: "cats-exec-004",
    catsWorkerId: "cat-41",
    kind: "policy_constraint",
    reason: "Requested execution step crosses an explicit policy boundary for this CAT unit",
    occurredAt: "2026-03-11T16:30:00.000Z",
  });

  const escalations = registry.listEscalations("cats-exec-004");

  assert.equal(escalation.taskResult.escalation.fromRole, "cats");
  assert.equal(escalation.taskResult.escalation.toRole, "builder_lead");
  assert.equal(escalation.taskResult.escalation.severity, "high");
  assert.equal(escalation.taskResult.lifecycleEvents[0]?.eventType, "task_escalated");
  assert.equal(escalations.length, 1);
});

test("required execution-task fields fail explicitly and metadata survives mapping", () => {
  const flow = new BuilderCatsExecutionTaskFlow({ registry: new InMemoryTaskRegistry() });

  assert.throws(
    () =>
      flow.createExecutionTask({
        executionTaskId: "cats-exec-bad-001",
        title: "Missing intent",
        description: "This should fail",
        builderRole: "builder",
        targetCatsRole: "cats",
        priority: "normal",
        executionIntent: "",
      }),
    /requires executionIntent/
  );

  flow.createExecutionTask({
    executionTaskId: "cats-exec-005",
    title: "Metadata preservation check",
    description: "Preserve execution handoff metadata through mapping.",
    builderRole: "builder",
    builderActorId: "builder-51",
    builderActorLabel: "Runtime Builder",
    builderTypeHints: ["runtime"],
    targetCatsRole: "cats",
    priority: "high",
    executionIntent: "Package CAT capability into a bounded execution unit.",
    scope: ["capability packaging"],
    requiredInputs: ["capability descriptor"],
    policyConstraintReferences: ["policy:bounded-capability-execution"],
    evidenceReferences: [{ sourceSystem: "docs", sourceRef: "builder-workforce-architecture" }],
  });

  const report = flow.reportExecutionTask({
    executionTaskId: "cats-exec-005",
    summary: "Result package is ready for builder verification.",
    state: "result_ready",
    risks: ["Final runtime precondition check remains pending"],
    recommendations: ["Builder should verify final precondition set before release"],
    occurredAt: "2026-03-11T16:35:00.000Z",
  });

  const task = flow.getTaskAdapter().getRegistry().getTaskById("cats-exec-005");

  assert.equal(task?.outputs?.includes("execution_intent:Package CAT capability into a bounded execution unit."), true);
  assert.equal(task?.outputs?.includes("scope:capability packaging"), true);
  assert.equal(task?.outputs?.includes("required_input:capability descriptor"), true);
  assert.equal(task?.outputs?.includes("policy_constraint_reference:policy:bounded-capability-execution"), true);
  assert.equal(task?.outputs?.includes("builder_actor_label:Runtime Builder"), true);
  assert.equal(task?.outputs?.includes("builder_type_hint:runtime"), true);
  assert.equal(task?.evidenceReferences?.[0]?.sourceRef, "builder-workforce-architecture");
  assert.equal(report.taskResult.report.risks[0], "Final runtime precondition check remains pending");
  assert.equal(report.lifecycleResult.task.status, "in_progress");
});
