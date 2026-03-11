import * as assert from "node:assert/strict";
import { test } from "node:test";
import { CatsOsRuntimeTaskFlow } from "../../src/tasks/integrations/cats-os-runtime-task-flow";
import { InMemoryTaskRegistry } from "../../src/tasks/registry/in-memory-task-registry";

test("CAT creates OS runtime task through shared task adapter", () => {
  const flow = new CatsOsRuntimeTaskFlow({ registry: new InMemoryTaskRegistry() });

  const result = flow.createRuntimeTask({
    runtimeTaskId: "os-runtime-001",
    title: "Run health check",
    description: "CAT issues a bounded runtime health-check handoff.",
    catsRole: "cats",
    catsActorId: "cat-11",
    catsActorLabel: "Runtime Coordination CAT",
    targetOsRole: "os",
    targetOsWorkerId: "os-11",
    priority: "high",
    executionIntent: "Run one bounded runtime health check and return a result package.",
    runtimeTarget: "runtime-main",
    preconditions: ["health-check bundle available", "runtime guard approval present"],
    dependencyReferences: ["cats-runtime-dependency-01"],
    evidenceReferences: [{ sourceSystem: "docs", sourceRef: "task-graph-engine-architecture" }],
    policyConstraintReferences: ["policy:bounded-runtime-action", "ops:no-host-auto-selection"],
    dueDate: "2026-03-17T00:00:00.000Z",
  });

  assert.equal(result.taskResult.task.ownerRole, "cats");
  assert.equal(result.taskResult.task.assignment?.assigneeRole, "os");
  assert.equal(result.taskResult.task.assignment?.workerId, "os-11");
  assert.equal(result.taskResult.task.outputs?.includes("execution_intent:Run one bounded runtime health check and return a result package."), true);
  assert.equal(result.taskResult.task.outputs?.includes("runtime_target:runtime-main"), true);
  assert.equal(result.taskResult.task.outputs?.includes("precondition:health-check bundle available"), true);
  assert.equal(result.taskResult.task.outputs?.includes("policy_constraint_reference:policy:bounded-runtime-action"), true);
});

test("CAT assigns runtime task and OS can report progress result and completion", () => {
  const flow = new CatsOsRuntimeTaskFlow({ registry: new InMemoryTaskRegistry() });

  flow.createRuntimeTask({
    runtimeTaskId: "os-runtime-002",
    title: "Apply runtime configuration",
    description: "CAT hands a bounded configuration step to OS.",
    catsRole: "cats",
    targetOsRole: "os",
    targetOsWorkerId: "os-22",
    priority: "normal",
    executionIntent: "Apply one bounded runtime configuration change and return status.",
  });

  const assignment = flow.assignRuntimeTask("os-runtime-002", "2026-03-11T17:00:00.000Z");
  const inProgress = flow.markRuntimeTaskInProgress(
    "os-runtime-002",
    "Runtime configuration step has started with bounded inputs.",
    "2026-03-11T17:05:00.000Z"
  );
  const resultReady = flow.markRuntimeTaskResultReady(
    "os-runtime-002",
    "Runtime result package is assembled for CAT review.",
    "2026-03-11T17:10:00.000Z"
  );
  const completed = flow.markRuntimeTaskCompleted(
    "os-runtime-002",
    "Bounded runtime action completed successfully.",
    "2026-03-11T17:15:00.000Z"
  );

  assert.equal(assignment.taskResult.assignment.workerId, "os-22");
  assert.equal(assignment.taskResult.lifecycleEvents[0]?.eventType, "task_assigned");
  assert.equal(inProgress.taskResult.report.reportingRole, "os");
  assert.equal(inProgress.lifecycleResult.task.status, "in_progress");
  assert.match(resultReady.taskResult.report.statusSummary, /Result package is ready for CAT review/);
  assert.equal(resultReady.lifecycleResult.task.status, "in_progress");
  assert.equal(completed.lifecycleResult.task.status, "completed");
});

test("OS can report blocker or precondition failure back to CAT", () => {
  const registry = new InMemoryTaskRegistry();
  const flow = new CatsOsRuntimeTaskFlow({ registry });

  flow.createRuntimeTask({
    runtimeTaskId: "os-runtime-003",
    title: "Execute verification step",
    description: "CAT provides a bounded runtime verification step.",
    catsRole: "cats",
    targetOsRole: "os",
    targetOsWorkerId: "os-31",
    priority: "high",
    executionIntent: "Execute one bounded verification step against the runtime target.",
    evidenceReferences: [{ sourceSystem: "docs", sourceRef: "universal-task-governance" }],
  });

  const blocked = flow.markRuntimeTaskBlocked(
    "os-runtime-003",
    "Blocked because one runtime dependency is unavailable.",
    ["verification binary missing"],
    "2026-03-11T17:20:00.000Z"
  );

  const preconditionFailed = flow.reportRuntimeTask({
    runtimeTaskId: "os-runtime-003",
    osWorkerId: "os-31",
    summary: "Runtime target did not satisfy required execution preconditions.",
    state: "precondition_failed",
    blockers: ["runtime guard token missing"],
    recommendations: ["CAT should reissue the handoff with a valid guard token"],
    occurredAt: "2026-03-11T17:25:00.000Z",
  });

  const task = registry.getTaskById("os-runtime-003");

  assert.equal(blocked.taskResult.report.blockers[0], "verification binary missing");
  assert.equal(blocked.lifecycleResult.task.status, "blocked");
  assert.match(preconditionFailed.taskResult.report.statusSummary, /Runtime precondition failed/);
  assert.equal(preconditionFailed.lifecycleResult.task.status, "blocked");
  assert.equal(task?.evidenceReferences?.[0]?.sourceRef, "universal-task-governance");
});

test("OS can escalate runtime or policy issues back to CAT", () => {
  const registry = new InMemoryTaskRegistry();
  const flow = new CatsOsRuntimeTaskFlow({ registry });

  flow.createRuntimeTask({
    runtimeTaskId: "os-runtime-004",
    title: "Apply patch step",
    description: "CAT requests one bounded runtime patch step.",
    catsRole: "cats",
    targetOsRole: "os",
    targetOsWorkerId: "os-41",
    priority: "high",
    executionIntent: "Apply one bounded patch step within approved scope.",
  });

  const escalation = flow.escalateRuntimeTask({
    runtimeTaskId: "os-runtime-004",
    osWorkerId: "os-41",
    kind: "runtime_environment_unavailable",
    reason: "Target runtime environment is unavailable for the requested bounded step",
    occurredAt: "2026-03-11T17:30:00.000Z",
  });

  const escalations = registry.listEscalations("os-runtime-004");

  assert.equal(escalation.taskResult.escalation.fromRole, "os");
  assert.equal(escalation.taskResult.escalation.toRole, "cats");
  assert.equal(escalation.taskResult.escalation.severity, "critical");
  assert.equal(escalation.taskResult.lifecycleEvents[0]?.eventType, "task_escalated");
  assert.equal(escalations.length, 1);
});

test("required runtime-task fields fail explicitly and metadata survives mapping", () => {
  const flow = new CatsOsRuntimeTaskFlow({ registry: new InMemoryTaskRegistry() });

  assert.throws(
    () =>
      flow.createRuntimeTask({
        runtimeTaskId: "os-runtime-bad-001",
        title: "Missing intent",
        description: "This should fail",
        catsRole: "cats",
        targetOsRole: "os",
        priority: "normal",
        executionIntent: "",
      }),
    /requires executionIntent/
  );

  flow.createRuntimeTask({
    runtimeTaskId: "os-runtime-005",
    title: "Metadata preservation check",
    description: "Preserve runtime handoff metadata through mapping.",
    catsRole: "cats",
    catsActorId: "cat-51",
    catsActorLabel: "Verification CAT",
    targetOsRole: "os",
    priority: "high",
    executionIntent: "Start one bounded runtime unit for verification.",
    runtimeTarget: "runtime-canary",
    preconditions: ["verification artifacts staged"],
    policyConstraintReferences: ["policy:canary-only"],
    evidenceReferences: [{ sourceSystem: "docs", sourceRef: "builder-workforce-architecture" }],
  });

  const report = flow.reportRuntimeTask({
    runtimeTaskId: "os-runtime-005",
    summary: "Runtime result package is ready for CAT verification.",
    state: "result_ready",
    risks: ["One post-start validation remains pending"],
    recommendations: ["CAT should verify the final validation output before follow-up action"],
    occurredAt: "2026-03-11T17:35:00.000Z",
  });

  const task = flow.getTaskAdapter().getRegistry().getTaskById("os-runtime-005");

  assert.equal(task?.outputs?.includes("execution_intent:Start one bounded runtime unit for verification."), true);
  assert.equal(task?.outputs?.includes("runtime_target:runtime-canary"), true);
  assert.equal(task?.outputs?.includes("precondition:verification artifacts staged"), true);
  assert.equal(task?.outputs?.includes("policy_constraint_reference:policy:canary-only"), true);
  assert.equal(task?.outputs?.includes("cats_actor_label:Verification CAT"), true);
  assert.equal(task?.evidenceReferences?.[0]?.sourceRef, "builder-workforce-architecture");
  assert.equal(report.taskResult.report.risks[0], "One post-start validation remains pending");
  assert.equal(report.lifecycleResult.task.status, "in_progress");
});
