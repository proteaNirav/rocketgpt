import * as assert from "node:assert/strict";
import { test } from "node:test";
import { InMemoryTaskRegistry } from "../../src/tasks/registry/in-memory-task-registry";
import { BrainConsortiumOversightTaskFlow } from "../../src/tasks/integrations/brain-consortium-oversight-task-flow";

test("consortium creates brain oversight task through shared task adapter", () => {
  const flow = new BrainConsortiumOversightTaskFlow({ registry: new InMemoryTaskRegistry() });

  const result = flow.createOversightTask({
    oversightTaskId: "brain-oversight-001",
    title: "Review builder efficiency",
    description: "Consortium requests bounded analysis of builder efficiency signals.",
    consortiumRole: "consortium",
    consortiumActorId: "consortium-cell-7",
    consortiumActorLabel: "Operations Review Cell",
    consortiumActorFunction: "oversight",
    targetBrainRole: "brain",
    targetBrainWorkerId: "brain-11",
    priority: "high",
    oversightObjective: "Assess builder efficiency risks and likely causes.",
    scope: ["Builder queue latency", "handoff churn"],
    constraints: ["No orchestration changes", "No persistence"],
    dependencyReferences: ["ops-architecture-builder-workforce"],
    evidenceReferences: [{ sourceSystem: "docs", sourceRef: "builder-workforce-architecture" }],
    reportingExpectation: "Return findings, blockers, risks, and recommendations",
    dueDate: "2026-03-16T00:00:00.000Z",
  });

  assert.equal(result.taskResult.task.ownerRole, "consortium");
  assert.equal(result.taskResult.task.assignment?.assigneeRole, "brain");
  assert.equal(result.taskResult.task.assignment?.workerId, "brain-11");
  assert.equal(result.taskResult.task.outputs?.includes("oversight_objective:Assess builder efficiency risks and likely causes."), true);
  assert.equal(result.taskResult.task.outputs?.includes("scope:Builder queue latency"), true);
  assert.equal(result.taskResult.task.outputs?.includes("constraint:No orchestration changes"), true);
  assert.equal(result.taskResult.task.outputs?.includes("consortium_actor_id:consortium-cell-7"), true);
});

test("consortium assigns oversight task and brain can report findings and completion", () => {
  const flow = new BrainConsortiumOversightTaskFlow({ registry: new InMemoryTaskRegistry() });

  flow.createOversightTask({
    oversightTaskId: "brain-oversight-002",
    title: "Analyze learning gaps",
    description: "Brain analyzes a bounded set of learning gap signals.",
    consortiumRole: "consortium",
    targetBrainRole: "brain",
    targetBrainWorkerId: "brain-22",
    priority: "normal",
    oversightObjective: "Identify learning gaps affecting delivery quality.",
  });

  const assignment = flow.assignOversightTask("brain-oversight-002", "2026-03-11T15:00:00.000Z");
  const inAnalysis = flow.markOversightTaskInAnalysis(
    "brain-oversight-002",
    "Analyzing recent learner and builder handoff signals.",
    "2026-03-11T15:05:00.000Z"
  );
  const findingsReady = flow.markOversightTaskFindingsReady(
    "brain-oversight-002",
    "Initial findings are ready for consortium review.",
    ["Two recurring learning gaps in acceptance criteria interpretation"],
    "2026-03-11T15:10:00.000Z"
  );
  const completed = flow.markOversightTaskCompleted(
    "brain-oversight-002",
    "Oversight review completed with a bounded recommendation set.",
    "2026-03-11T15:20:00.000Z"
  );

  assert.equal(assignment.taskResult.assignment.workerId, "brain-22");
  assert.equal(assignment.taskResult.lifecycleEvents[0]?.eventType, "task_assigned");
  assert.equal(inAnalysis.taskResult.report.reportingRole, "brain");
  assert.equal(inAnalysis.lifecycleResult.task.status, "in_progress");
  assert.match(findingsReady.taskResult.report.statusSummary, /Findings:/);
  assert.match(findingsReady.taskResult.report.statusSummary, /ready for consortium review/);
  assert.equal(findingsReady.lifecycleResult.task.status, "in_progress");
  assert.equal(completed.lifecycleResult.task.status, "completed");
});

test("brain can report blocker and risk details back to consortium", () => {
  const registry = new InMemoryTaskRegistry();
  const flow = new BrainConsortiumOversightTaskFlow({ registry });

  flow.createOversightTask({
    oversightTaskId: "brain-oversight-003",
    title: "Assess constitutional alignment risk",
    description: "Brain reviews a bounded constitutional alignment concern.",
    consortiumRole: "consortium",
    targetBrainRole: "brain",
    targetBrainWorkerId: "brain-31",
    priority: "high",
    oversightObjective: "Assess whether delivery signals indicate constitutional alignment risk.",
    evidenceReferences: [{ sourceSystem: "docs", sourceRef: "constitutional-governance-architecture" }],
  });

  const blocked = flow.markOversightTaskBlocked(
    "brain-oversight-003",
    "Blocked on missing operational incident appendix.",
    ["operational incident appendix unavailable"],
    "2026-03-11T15:30:00.000Z"
  );

  const riskReport = flow.reportOversightTask({
    oversightTaskId: "brain-oversight-003",
    brainWorkerId: "brain-31",
    summary: "A constitutional alignment risk has been detected in current evidence.",
    state: "risk_detected",
    risks: ["Escalation path is inconsistently represented across recent artifacts"],
    recommendations: ["Request consortium review before expanding automation scope"],
    occurredAt: "2026-03-11T15:35:00.000Z",
  });

  const task = registry.getTaskById("brain-oversight-003");

  assert.equal(blocked.taskResult.report.blockers[0], "operational incident appendix unavailable");
  assert.equal(blocked.lifecycleResult.task.status, "blocked");
  assert.equal(riskReport.taskResult.report.risks[0], "Escalation path is inconsistently represented across recent artifacts");
  assert.equal(riskReport.taskResult.report.recommendations[0], "Request consortium review before expanding automation scope");
  assert.equal(riskReport.lifecycleResult.task.status, "in_progress");
  assert.equal(task?.evidenceReferences?.[0]?.sourceRef, "constitutional-governance-architecture");
});

test("brain can escalate constitutional or operational concerns upward to consortium", () => {
  const registry = new InMemoryTaskRegistry();
  const flow = new BrainConsortiumOversightTaskFlow({ registry });

  flow.createOversightTask({
    oversightTaskId: "brain-oversight-004",
    title: "Review operational blockers",
    description: "Brain reviews whether blockers should be escalated to consortium.",
    consortiumRole: "consortium",
    targetBrainRole: "brain",
    targetBrainWorkerId: "brain-41",
    priority: "high",
    oversightObjective: "Surface severe operational blocker patterns.",
  });

  const escalation = flow.escalateOversightTask({
    oversightTaskId: "brain-oversight-004",
    brainWorkerId: "brain-41",
    kind: "constitutional_concern",
    reason: "Observed contradiction between current oversight request and constitutional boundary artifact",
    occurredAt: "2026-03-11T15:40:00.000Z",
  });

  const escalations = registry.listEscalations("brain-oversight-004");

  assert.equal(escalation.taskResult.escalation.fromRole, "brain");
  assert.equal(escalation.taskResult.escalation.toRole, "consortium");
  assert.equal(escalation.taskResult.escalation.severity, "critical");
  assert.equal(escalation.taskResult.lifecycleEvents[0]?.eventType, "task_escalated");
  assert.equal(escalations.length, 1);
});

test("required oversight-task fields fail explicitly and metadata survives mapping", () => {
  const flow = new BrainConsortiumOversightTaskFlow({ registry: new InMemoryTaskRegistry() });

  assert.throws(
    () =>
      flow.createOversightTask({
        oversightTaskId: "brain-oversight-bad-001",
        title: "Missing objective",
        description: "This should fail",
        consortiumRole: "consortium",
        targetBrainRole: "brain",
        priority: "normal",
        oversightObjective: "",
      }),
    /requires oversightObjective/
  );

  flow.createOversightTask({
    oversightTaskId: "brain-oversight-005",
    title: "Metadata preservation check",
    description: "Preserve oversight metadata through task mapping.",
    consortiumRole: "consortium",
    consortiumActorId: "consortium-cell-9",
    consortiumActorLabel: "Constitution Review Desk",
    consortiumActorFunction: "review",
    targetBrainRole: "brain",
    priority: "high",
    oversightObjective: "Prepare a governance recommendation for consortium review.",
    scope: ["constitutional alignment risk"],
    constraints: ["No policy mutation"],
    reportingExpectation: "Return explicit blocker and recommendation summary",
    evidenceReferences: [{ sourceSystem: "docs", sourceRef: "central-self-learning-architecture" }],
  });

  const report = flow.reportOversightTask({
    oversightTaskId: "brain-oversight-005",
    summary: "Recommendation package is ready with one unresolved contradiction.",
    state: "recommendation_ready",
    findings: ["Two conflicting governance assumptions were found in adjacent docs"],
    recommendations: ["Submit contradiction set to consortium for explicit review"],
    occurredAt: "2026-03-11T15:45:00.000Z",
  });

  const task = flow.getTaskAdapter().getRegistry().getTaskById("brain-oversight-005");

  assert.equal(task?.outputs?.includes("oversight_objective:Prepare a governance recommendation for consortium review."), true);
  assert.equal(task?.outputs?.includes("scope:constitutional alignment risk"), true);
  assert.equal(task?.outputs?.includes("constraint:No policy mutation"), true);
  assert.equal(task?.outputs?.includes("reporting_expectation:Return explicit blocker and recommendation summary"), true);
  assert.equal(task?.outputs?.includes("consortium_actor_label:Constitution Review Desk"), true);
  assert.equal(task?.evidenceReferences?.[0]?.sourceRef, "central-self-learning-architecture");
  assert.match(report.taskResult.report.statusSummary, /Recommendation package is ready for consortium review/);
  assert.equal(report.lifecycleResult.task.status, "in_progress");
});
